import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Club } from '@/lib/models/club';
import { ClubMember } from '@/lib/models/club-member';
import { User } from '@/lib/models/user';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';

const memberQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  role: z.enum(['owner', 'admin', 'moderator', 'member']).optional(),
  search: z.string().optional(),
});

const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'moderator', 'member']).optional(),
});

const updateMemberSchema = z.object({
  role: z.enum(['admin', 'moderator', 'member']),
});

async function getClubByUsername(username: string) {
  const club = await Club.findOne({ username }).lean();
  if (!club) {
    throw new Error('Club not found');
  }
  return club;
}

async function checkMemberPermissions(clubId: string, userId: string, requiredRoles: string[] = ['admin', 'owner']) {
  const membership = await ClubMember.findOne({
    club: clubId,
    user: userId,
    status: 'active'
  });

  if (!membership || !requiredRoles.includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  return membership;
}

// GET /api/clubs/[username]/members - List club members
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
      try {
        if (!request.user) {
          resolve(ExpoResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          ));
          return;
        }

        const url = new URL(request.url!);
        const pathParts = url.pathname.split('/');
        const username = pathParts[pathParts.length - 2]; // Get username from path

        const query = memberQuerySchema.parse(Object.fromEntries(url.searchParams));

        await connectDB();

        const club = await getClubByUsername(username);

        // Check if user is a member of the club
        const userMembership = await ClubMember.findOne({
          club: club._id,
          user: request.user.id,
          status: 'active'
        });

        if (!userMembership) {
          resolve(ExpoResponse.json(
            { error: 'You must be a member to view club members' },
            { status: 403 }
          ));
          return;
        }

        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 50);
        const skip = (page - 1) * limit;

        // Build filter
        const filter: any = {
          club: club._id,
          status: 'active'
        };

        if (query.role) {
          filter.role = query.role;
        }

        // Build aggregation pipeline for search
        const pipeline: any[] = [
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user'
            }
          },
          { $unwind: '$user' },
        ];

        if (query.search) {
          pipeline.push({
            $match: {
              $or: [
                { 'user.name': { $regex: query.search, $options: 'i' } },
                { 'user.email': { $regex: query.search, $options: 'i' } }
              ]
            }
          });
        }

        pipeline.push(
          { $sort: { role: 1, joinedAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              role: 1,
              status: 1,
              joinedAt: 1,
              lastActive: 1,
              permissions: 1,
              'user._id': 1,
              'user.name': 1,
              'user.email': 1,
              'user.avatar': 1,
            }
          }
        );

        const [members, total] = await Promise.all([
          ClubMember.aggregate(pipeline),
          ClubMember.countDocuments(filter)
        ]);

        resolve(ExpoResponse.json({
          members,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
          userRole: userMembership.role,
        }));
      } catch (error) {
        console.error('Get members error:', error);
        if (error.message === 'Club not found') {
          resolve(ExpoResponse.json(
            { error: 'Club not found' },
            { status: 404 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to fetch members' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// POST /api/clubs/[username]/members - Add member (admin only)
export async function POST(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
      try {
        if (!request.user) {
          resolve(ExpoResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          ));
          return;
        }

        const url = new URL(request.url!);
        const pathParts = url.pathname.split('/');
        const username = pathParts[pathParts.length - 2];

        const body = await request.json();
        const { email, role = 'member' } = addMemberSchema.parse(body);

        await connectDB();

        const club = await getClubByUsername(username);

        // Check permissions
        await checkMemberPermissions(club._id.toString(), request.user.id);

        // Find user by email
        const targetUser = await User.findOne({ email });
        if (!targetUser) {
          resolve(ExpoResponse.json(
            { error: 'User not found' },
            { status: 404 }
          ));
          return;
        }

        // Check if user is already a member
        const existingMembership = await ClubMember.findOne({
          club: club._id,
          user: targetUser._id
        });

        if (existingMembership) {
          if (existingMembership.status === 'active') {
            resolve(ExpoResponse.json(
              { error: 'User is already a member' },
              { status: 400 }
            ));
            return;
          } else if (existingMembership.status === 'banned') {
            resolve(ExpoResponse.json(
              { error: 'User is banned from this club' },
              { status: 400 }
            ));
            return;
          } else {
            // Reactivate pending membership
            existingMembership.status = 'active';
            existingMembership.role = role;
            existingMembership.joinedAt = new Date();
            await existingMembership.save();
          }
        } else {
          // Create new membership
          const membership = new ClubMember({
            club: club._id,
            user: targetUser._id,
            role,
            status: 'active',
            invitedBy: request.user.id,
          });
          await membership.save();
        }

        // Update member count
        const memberCount = await ClubMember.countDocuments({
          club: club._id,
          status: 'active'
        });

        await Club.findByIdAndUpdate(club._id, {
          'stats.memberCount': memberCount
        });

        resolve(ExpoResponse.json({
          message: 'Member added successfully',
          member: {
            user: {
              _id: targetUser._id,
              name: targetUser.name,
              email: targetUser.email,
              avatar: targetUser.avatar,
            },
            role,
            joinedAt: new Date(),
          }
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Add member error:', error);
        if (error.message === 'Club not found') {
          resolve(ExpoResponse.json(
            { error: 'Club not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to add members' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to add member' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// PUT /api/clubs/[username]/members - Update member role
export async function PUT(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
      try {
        if (!request.user) {
          resolve(ExpoResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          ));
          return;
        }

        const url = new URL(request.url!);
        const pathParts = url.pathname.split('/');
        const username = pathParts[pathParts.length - 2];
        const memberId = url.searchParams.get('memberId');

        if (!memberId) {
          resolve(ExpoResponse.json(
            { error: 'Member ID is required' },
            { status: 400 }
          ));
          return;
        }

        const body = await request.json();
        const { role } = updateMemberSchema.parse(body);

        await connectDB();

        const club = await getClubByUsername(username);

        // Check permissions
        await checkMemberPermissions(club._id.toString(), request.user.id);

        // Update member role
        const updatedMember = await ClubMember.findOneAndUpdate(
          {
            _id: memberId,
            club: club._id,
            status: 'active'
          },
          { role },
          { new: true }
        ).populate('user', 'name email avatar');

        if (!updatedMember) {
          resolve(ExpoResponse.json(
            { error: 'Member not found' },
            { status: 404 }
          ));
          return;
        }

        resolve(ExpoResponse.json({
          message: 'Member role updated successfully',
          member: updatedMember,
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Update member error:', error);
        resolve(ExpoResponse.json(
          { error: 'Failed to update member' },
          { status: 500 }
        ));
      }
    });
  });
}

// DELETE /api/clubs/[username]/members - Remove member
export async function DELETE(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
      try {
        if (!request.user) {
          resolve(ExpoResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          ));
          return;
        }

        const url = new URL(request.url!);
        const pathParts = url.pathname.split('/');
        const username = pathParts[pathParts.length - 2];
        const memberId = url.searchParams.get('memberId');

        if (!memberId) {
          resolve(ExpoResponse.json(
            { error: 'Member ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        const club = await getClubByUsername(username);

        // Check permissions
        await checkMemberPermissions(club._id.toString(), request.user.id);

        // Find the member to remove
        const memberToRemove = await ClubMember.findOne({
          _id: memberId,
          club: club._id,
          status: 'active'
        });

        if (!memberToRemove) {
          resolve(ExpoResponse.json(
            { error: 'Member not found' },
            { status: 404 }
          ));
          return;
        }

        // Prevent removing the owner
        if (memberToRemove.role === 'owner') {
          resolve(ExpoResponse.json(
            { error: 'Cannot remove the club owner' },
            { status: 400 }
          ));
          return;
        }

        // Remove the member
        await ClubMember.findByIdAndDelete(memberId);

        // Update member count
        const memberCount = await ClubMember.countDocuments({
          club: club._id,
          status: 'active'
        });

        await Club.findByIdAndUpdate(club._id, {
          'stats.memberCount': memberCount
        });

        resolve(ExpoResponse.json({
          message: 'Member removed successfully',
        }));
      } catch (error) {
        console.error('Remove member error:', error);
        if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to remove members' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to remove member' },
            { status: 500 }
          ));
        }
      }
    });
  });
}