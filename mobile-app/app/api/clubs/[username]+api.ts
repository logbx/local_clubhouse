import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Club } from '@/lib/models/club';
import { ClubMember } from '@/lib/models/club-member';
import { ChatMessage } from '@/lib/models/chat-message';
import { AuthRequest, verifyToken, optionalAuth } from '@/lib/middleware/auth';
import { uploadImage } from '@/lib/upload';

const updateClubSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  description: z.string().min(10).max(2000).optional(),
  category: z.enum(['gaming', 'sports', 'technology', 'music', 'art', 'education', 'business', 'social', 'other']).optional(),
  isPrivate: z.boolean().optional(),
  memberLimit: z.number().min(1).max(10000).optional(),
  tags: z.array(z.string().max(30)).max(10).optional(),
  location: z.object({
    city: z.string().optional(),
    country: z.string().optional(),
    coordinates: z.array(z.number()).length(2).optional(),
  }).optional(),
  socialLinks: z.object({
    website: z.string().url().optional(),
    twitter: z.string().optional(),
    discord: z.string().optional(),
    instagram: z.string().optional(),
  }).optional(),
  settings: z.object({
    allowMemberInvites: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    allowChat: z.boolean().optional(),
    allowEvents: z.boolean().optional(),
  }).optional(),
});

async function getClubByUsername(username: string) {
  const club = await Club.findOne({ username })
    .populate('owner', 'name avatar email')
    .lean();

  if (!club) {
    throw new Error('Club not found');
  }

  return club;
}

async function checkClubPermissions(clubId: string, userId: string, requiredRole: string[] = ['admin', 'owner']) {
  const membership = await ClubMember.findOne({
    club: clubId,
    user: userId,
    status: 'active'
  });

  if (!membership || !requiredRole.includes(membership.role)) {
    throw new Error('Insufficient permissions');
  }

  return membership;
}

// GET /api/clubs/[username] - Get club details
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    optionalAuth(request, new ExpoResponse(), async () => {
      try {
        const url = new URL(request.url!);
        const username = url.pathname.split('/').pop();

        if (!username) {
          resolve(ExpoResponse.json(
            { error: 'Username is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        const club = await getClubByUsername(username);

        // Get recent activity
        const recentMessages = await ChatMessage.find({
          club: club._id,
          isDeleted: false
        })
          .populate('sender', 'name avatar')
          .sort({ createdAt: -1 })
          .limit(3)
          .lean();

        // Get user's membership if authenticated
        let userMembership = null;
        if (request.user) {
          userMembership = await ClubMember.findOne({
            club: club._id,
            user: request.user.id
          }).lean();
        }

        // Get member count and recent members
        const [memberCount, recentMembers] = await Promise.all([
          ClubMember.countDocuments({ club: club._id, status: 'active' }),
          ClubMember.find({ club: club._id, status: 'active' })
            .populate('user', 'name avatar')
            .sort({ joinedAt: -1 })
            .limit(10)
            .lean()
        ]);

        // Update stats
        await Club.findByIdAndUpdate(club._id, {
          'stats.memberCount': memberCount,
          'stats.lastActivity': new Date(),
        });

        const response = {
          club: {
            ...club,
            stats: {
              ...club.stats,
              memberCount,
            }
          },
          userMembership,
          recentActivity: recentMessages,
          recentMembers,
          canEdit: userMembership?.role === 'owner' || userMembership?.role === 'admin',
          canDelete: userMembership?.role === 'owner',
        };

        resolve(ExpoResponse.json(response));
      } catch (error) {
        console.error('Get club error:', error);
        if (error.message === 'Club not found') {
          resolve(ExpoResponse.json(
            { error: 'Club not found' },
            { status: 404 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to fetch club' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// PUT /api/clubs/[username] - Update club (admin only)
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
        const username = url.pathname.split('/').pop();

        if (!username) {
          resolve(ExpoResponse.json(
            { error: 'Username is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        const club = await getClubByUsername(username);
        
        // Check permissions
        await checkClubPermissions(club._id.toString(), request.user.id);

        const contentType = request.headers.get('content-type');
        let updateData: any;

        if (contentType?.includes('multipart/form-data')) {
          // Handle form data with file upload
          const formData = await request.formData();
          
          updateData = {};
          
          // Parse regular fields
          const fields = ['name', 'description', 'category', 'isPrivate', 'memberLimit', 'tags', 'location', 'socialLinks', 'settings'];
          for (const field of fields) {
            const value = formData.get(field);
            if (value !== null) {
              if (field === 'isPrivate') {
                updateData[field] = value === 'true';
              } else if (field === 'memberLimit') {
                updateData[field] = value ? Number(value) : undefined;
              } else if (['tags', 'location', 'socialLinks', 'settings'].includes(field)) {
                updateData[field] = value ? JSON.parse(value as string) : undefined;
              } else {
                updateData[field] = value;
              }
            }
          }

          // Handle file uploads
          const logoFile = formData.get('logo') as File;
          if (logoFile) {
            updateData.logoUrl = await uploadImage(logoFile, 'club-logos', request.user.id);
          }

          const bannerFile = formData.get('banner') as File;
          if (bannerFile) {
            updateData.bannerUrl = await uploadImage(bannerFile, 'club-banners', request.user.id);
          }
        } else {
          updateData = await request.json();
        }

        const validatedData = updateClubSchema.parse(updateData);

        // Update club
        const updatedClub = await Club.findByIdAndUpdate(
          club._id,
          { ...validatedData, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).populate('owner', 'name avatar email');

        resolve(ExpoResponse.json({
          club: updatedClub,
          message: 'Club updated successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Update club error:', error);
        if (error.message === 'Club not found') {
          resolve(ExpoResponse.json(
            { error: 'Club not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to edit this club' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to update club' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// DELETE /api/clubs/[username] - Delete club (owner only)
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
        const username = url.pathname.split('/').pop();

        if (!username) {
          resolve(ExpoResponse.json(
            { error: 'Username is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        const club = await getClubByUsername(username);
        
        // Check if user is owner
        await checkClubPermissions(club._id.toString(), request.user.id, ['owner']);

        // Delete related data
        await Promise.all([
          ClubMember.deleteMany({ club: club._id }),
          ChatMessage.deleteMany({ club: club._id }),
          Club.findByIdAndDelete(club._id),
        ]);

        resolve(ExpoResponse.json({
          message: 'Club deleted successfully',
        }));
      } catch (error) {
        console.error('Delete club error:', error);
        if (error.message === 'Club not found') {
          resolve(ExpoResponse.json(
            { error: 'Club not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'Only the club owner can delete the club' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to delete club' },
            { status: 500 }
          ));
        }
      }
    });
  });
}