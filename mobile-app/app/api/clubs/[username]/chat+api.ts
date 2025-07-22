import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Club } from '@/lib/models/club.model';
import { ClubMember } from '@/lib/models/club-member.model';
import { ChatMessage } from '@/lib/models/chat-message.model';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';
import { createRateLimiter } from '@/lib/middleware/rate-limit';

const chatQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  before: z.string().optional(), // Message ID for pagination
  search: z.string().optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(4000).trim(),
  replyTo: z.string().optional(),
  mentions: z.array(z.string()).optional(),
});

// Rate limiter for sending messages
const sendMessageLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many messages sent, please slow down',
});

async function getClubByUsername(username: string) {
  const club = await Club.findOne({ username }).lean();
  if (!club) {
    throw new Error('Club not found');
  }
  return club;
}

async function checkClubMembership(clubId: string, userId: string) {
  const membership = await ClubMember.findOne({
    club: clubId,
    user: userId,
    status: 'active'
  });

  if (!membership) {
    throw new Error('Not a member of this club');
  }

  return membership;
}

// GET /api/clubs/[username]/chat - Get chat messages
export async function GET(request: AuthRequest): Promise<Response> {
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

        const query = chatQuerySchema.parse(Object.fromEntries(url.searchParams));

        await connectDB();

        const club = await getClubByUsername(username);

        // Check if chat is enabled
        if (!club.settings.allowChat) {
          resolve(Response.json(
            { error: 'Chat is disabled for this club' },
            { status: 403 }
          ));
          return;
        }

        // Check membership
        await checkClubMembership(club._id.toString(), request.user.id);

        const limit = Math.min(query.limit || 50, 100);
        
        // Build filter
        const filter: any = {
          club: club._id,
          isDeleted: false
        };

        if (query.before) {
          // Pagination using message ID
          const beforeMessage = await ChatMessage.findById(query.before);
          if (beforeMessage) {
            filter.createdAt = { $lt: beforeMessage.createdAt };
          }
        }

        if (query.search) {
          filter.content = { $regex: query.search, $options: 'i' };
        }

        // Get messages
        const messages = await ChatMessage.find(filter)
          .populate('sender', 'name avatar')
          .populate('replyTo', 'content sender')
          .populate('mentions', 'name avatar')
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean();

        // Reverse to show oldest first
        messages.reverse();

        // Mark messages as read by current user
        const messageIds = messages.map(m => m._id);
        if (messageIds.length > 0) {
          await ChatMessage.updateMany(
            {
              _id: { $in: messageIds },
              'readBy.user': { $ne: request.user.id }
            },
            {
              $push: {
                readBy: {
                  user: request.user.id,
                  readAt: new Date()
                }
              }
            }
          );
        }

        resolve(Response.json({
          messages,
          hasMore: messages.length === limit,
          clubSettings: {
            allowChat: club.settings.allowChat,
          }
        }));
      } catch (error) {
        console.error('Get chat messages error:', error);
        if (error.message === 'Club not found') {
          resolve(Response.json(
            { error: 'Club not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Not a member of this club') {
          resolve(Response.json(
            { error: 'You must be a member to view chat messages' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// POST /api/clubs/[username]/chat - Send message
export async function POST(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    sendMessageLimiter(request, new Response(), () => {
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

          const body = await request.json();
          const { content, replyTo, mentions = [] } = sendMessageSchema.parse(body);

          await connectDB();

          const club = await getClubByUsername(username);

          // Check if chat is enabled
          if (!club.settings.allowChat) {
            resolve(Response.json(
              { error: 'Chat is disabled for this club' },
              { status: 403 }
            ));
            return;
          }

          // Check membership
          const membership = await checkClubMembership(club._id.toString(), request.user.id);

          // Validate replyTo message if provided
          let replyToMessage = null;
          if (replyTo) {
            replyToMessage = await ChatMessage.findOne({
              _id: replyTo,
              club: club._id,
              isDeleted: false
            });

            if (!replyToMessage) {
              resolve(Response.json(
                { error: 'Reply message not found' },
                { status: 400 }
              ));
              return;
            }
          }

          // Create message
          const message = new ChatMessage({
            club: club._id,
            sender: request.user.id,
            content,
            replyTo: replyTo || undefined,
            mentions,
            readBy: [{
              user: request.user.id,
              readAt: new Date()
            }]
          });

          await message.save();

          // Populate message for response
          await message.populate([
            { path: 'sender', select: 'name avatar' },
            { path: 'replyTo', select: 'content sender' },
            { path: 'mentions', select: 'name avatar' }
          ]);

          // Update club stats
          await Club.findByIdAndUpdate(club._id, {
            $inc: { 'stats.messageCount': 1 },
            'stats.lastActivity': new Date()
          });

          // TODO: Emit WebSocket event for real-time updates
          // This would integrate with your WebSocket service
          // websocket.emit(`club:${club._id}:message`, message);

          // TODO: Send notifications for mentions
          // This would integrate with your notification system

          resolve(Response.json({
            message: message.toObject(),
            success: true
          }));
        } catch (error) {
          if (error instanceof z.ZodError) {
            resolve(Response.json(
              { error: 'Validation failed', details: error.issues },
              { status: 400 }
            ));
            return;
          }

          console.error('Send message error:', error);
          if (error.message === 'Club not found') {
            resolve(Response.json(
              { error: 'Club not found' },
              { status: 404 }
            ));
          } else if (error.message === 'Not a member of this club') {
            resolve(Response.json(
              { error: 'You must be a member to send messages' },
              { status: 403 }
            ));
          } else {
            resolve(Response.json(
              { error: 'Failed to send message' },
              { status: 500 }
            ));
          }
        }
      });
    });
  });
}

// PUT /api/clubs/[username]/chat - Edit message
export async function PUT(request: AuthRequest): Promise<Response> {
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
        const messageId = url.searchParams.get('messageId');

        if (!messageId) {
          resolve(Response.json(
            { error: 'Message ID is required' },
            { status: 400 }
          ));
          return;
        }

        const body = await request.json();
        const { content } = z.object({
          content: z.string().min(1).max(4000).trim()
        }).parse(body);

        await connectDB();

        // Find message
        const message = await ChatMessage.findOne({
          _id: messageId,
          isDeleted: false
        }).populate('club');

        if (!message) {
          resolve(Response.json(
            { error: 'Message not found' },
            { status: 404 }
          ));
          return;
        }

        // Check if user can edit (sender or moderator)
        const membership = await ClubMember.findOne({
          club: message.club._id,
          user: request.user.id,
          status: 'active'
        });

        const canEdit = message.sender.toString() === request.user.id || 
                       (membership && membership.permissions.canModerateChat);

        if (!canEdit) {
          resolve(Response.json(
            { error: 'You cannot edit this message' },
            { status: 403 }
          ));
          return;
        }

        // Store edit history
        message.edited.history.push({
          content: message.content,
          editedAt: new Date()
        });

        // Update message
        message.content = content;
        message.edited.at = new Date();
        message.edited.by = request.user.id;

        await message.save();

        resolve(Response.json({
          message: 'Message updated successfully',
          editedMessage: message
        }));
      } catch (error) {
        console.error('Edit message error:', error);
        resolve(Response.json(
          { error: 'Failed to edit message' },
          { status: 500 }
        ));
      }
    });
  });
}

// DELETE /api/clubs/[username]/chat - Delete message
export async function DELETE(request: AuthRequest): Promise<Response> {
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
        const messageId = url.searchParams.get('messageId');

        if (!messageId) {
          resolve(Response.json(
            { error: 'Message ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Find message
        const message = await ChatMessage.findOne({
          _id: messageId,
          isDeleted: false
        }).populate('club');

        if (!message) {
          resolve(Response.json(
            { error: 'Message not found' },
            { status: 404 }
          ));
          return;
        }

        // Check if user can delete (sender or moderator)
        const membership = await ClubMember.findOne({
          club: message.club._id,
          user: request.user.id,
          status: 'active'
        });

        const canDelete = message.sender.toString() === request.user.id || 
                         (membership && membership.permissions.canModerateChat);

        if (!canDelete) {
          resolve(Response.json(
            { error: 'You cannot delete this message' },
            { status: 403 }
          ));
          return;
        }

        // Soft delete
        message.isDeleted = true;
        message.deletedAt = new Date();
        message.deletedBy = request.user.id;

        await message.save();

        resolve(Response.json({
          message: 'Message deleted successfully'
        }));
      } catch (error) {
        console.error('Delete message error:', error);
        resolve(Response.json(
          { error: 'Failed to delete message' },
          { status: 500 }
        ));
      }
    });
  });
}