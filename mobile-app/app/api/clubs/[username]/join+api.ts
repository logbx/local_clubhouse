import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { connectDB } from '@/lib/db';
import { Club } from '@/lib/models/club.model';
import { ClubMember } from '@/lib/models/club-member.model';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';

async function getClubByUsername(username: string) {
  const club = await Club.findOne({ username }).lean();
  if (!club) {
    throw new Error('Club not found');
  }
  return club;
}

// POST /api/clubs/[username]/join - Join/leave club toggle
export async function POST(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    verifyToken(request, new Response(), async () => {
      try {
        if (!request.user) {
          resolve(Response.json(
            { error: 'Authentication required' },
            { status: 401 }
          ));
          return;
        }

        const url = new URL(request.url!);
        const pathParts = url.pathname.split('/');
        const username = pathParts[pathParts.length - 2];

        await connectDB();

        const club = await getClubByUsername(username);

        // Check if user is already a member
        const existingMembership = await ClubMember.findOne({
          club: club._id,
          user: request.user.id
        });

        let action: 'joined' | 'left' | 'requested' = 'joined';
        let message = '';

        if (existingMembership) {
          if (existingMembership.status === 'active') {
            // User is leaving the club
            if (existingMembership.role === 'owner') {
              resolve(Response.json(
                { error: 'Club owner cannot leave the club' },
                { status: 400 }
              ));
              return;
            }

            await ClubMember.findByIdAndDelete(existingMembership._id);
            action = 'left';
            message = 'Left club successfully';
          } else if (existingMembership.status === 'pending') {
            // Cancel pending request
            await ClubMember.findByIdAndDelete(existingMembership._id);
            action = 'left';
            message = 'Join request cancelled';
          } else if (existingMembership.status === 'banned') {
            resolve(Response.json(
              { error: 'You are banned from this club' },
              { status: 403 }
            ));
            return;
          }
        } else {
          // User is joining the club
          
          // Check member limit
          if (club.memberLimit) {
            const currentMemberCount = await ClubMember.countDocuments({
              club: club._id,
              status: 'active'
            });

            if (currentMemberCount >= club.memberLimit) {
              resolve(Response.json(
                { error: 'Club has reached its member limit' },
                { status: 400 }
              ));
              return;
            }
          }

          // Determine status based on club settings
          const status = club.settings.requireApproval ? 'pending' : 'active';

          // Create membership
          const membership = new ClubMember({
            club: club._id,
            user: request.user.id,
            role: 'member',
            status,
          });

          await membership.save();

          if (status === 'pending') {
            action = 'requested';
            message = 'Join request sent for approval';
          } else {
            action = 'joined';
            message = 'Joined club successfully';
          }
        }

        // Update member count
        const activeMemberCount = await ClubMember.countDocuments({
          club: club._id,
          status: 'active'
        });

        await Club.findByIdAndUpdate(club._id, {
          'stats.memberCount': activeMemberCount,
          'stats.lastActivity': new Date(),
        });

        // If someone joined, notify club admins
        if (action === 'joined' || action === 'requested') {
          // Get club admins for notifications
          const admins = await ClubMember.find({
            club: club._id,
            role: { $in: ['owner', 'admin'] },
            status: 'active'
          }).populate('user', 'name email');

          // TODO: Send notifications to admins
          // This would integrate with your notification system
        }

        resolve(Response.json({
          action,
          message,
          memberCount: activeMemberCount,
        }));
      } catch (error) {
        console.error('Join/leave club error:', error);
        if (error.message === 'Club not found') {
          resolve(Response.json(
            { error: 'Club not found' },
            { status: 404 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to join/leave club' },
            { status: 500 }
          ));
        }
      }
    });
  });
}