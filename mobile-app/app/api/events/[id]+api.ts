import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Event } from '@/lib/models/event';
import { EventRSVP } from '@/lib/models/event-rsvp';
import { ClubMember } from '@/lib/models/club-member';
import { AuthRequest, verifyToken, optionalAuth } from '@/lib/middleware/auth';
import { uploadImage } from '@/lib/upload';

const updateEventSchema = z.object({
  title: z.string().min(3).max(200).trim().optional(),
  description: z.string().min(10).max(10000).optional(),
  shortDescription: z.string().min(10).max(300).optional(),
  type: z.enum(['tournament', 'meetup', 'workshop', 'conference', 'social', 'online', 'other']).optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  endDate: z.string().transform((str) => new Date(str)).optional(),
  timezone: z.string().optional(),
  isAllDay: z.boolean().optional(),
  location: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    coordinates: z.array(z.number()).length(2),
    city: z.string().min(1),
    country: z.string().min(1),
    postalCode: z.string().optional(),
    placeId: z.string().optional(),
  }).optional(),
  isOnline: z.boolean().optional(),
  onlineDetails: z.object({
    platform: z.string(),
    meetingLink: z.string().url(),
    meetingId: z.string().optional(),
    password: z.string().optional(),
  }).optional(),
  visibility: z.enum(['public', 'private', 'club_only']).optional(),
  capacity: z.number().min(1).optional(),
  cost: z.object({
    isFree: z.boolean(),
    amount: z.number().min(0).optional(),
    currency: z.string().optional(),
    paymentRequired: z.boolean().optional(),
  }).optional(),
  requirements: z.object({
    ageLimit: z.number().min(0).max(120).optional(),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced', 'all']).optional(),
    equipment: z.array(z.string()).optional(),
    prerequisites: z.array(z.string()).optional(),
  }).optional(),
  tags: z.array(z.string().max(30)).max(20).optional(),
  coOrganizers: z.array(z.string()).optional(),
  settings: z.object({
    allowWaitlist: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    allowGuests: z.boolean().optional(),
    sendReminders: z.boolean().optional(),
    enableCheckIn: z.boolean().optional(),
    allowCancellation: z.boolean().optional(),
    cancellationDeadline: z.string().transform((str) => new Date(str)).optional(),
  }).optional(),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
  cancellationReason: z.string().optional(),
});

async function getEventById(eventId: string, userId?: string) {
  const pipeline: any[] = [
    { $match: { _id: eventId } },
  ];

  // Add user RSVP status if authenticated
  if (userId) {
    pipeline.push({
      $lookup: {
        from: 'eventrsvps',
        let: { eventId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$event', '$$eventId'] },
                  { $eq: ['$user', userId] },
                ],
              },
            },
          },
        ],
        as: 'userRSVP',
      },
    });
  }

  // Populate references
  pipeline.push(
    {
      $lookup: {
        from: 'users',
        localField: 'organizer',
        foreignField: '_id',
        as: 'organizer',
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: 'coOrganizers',
        foreignField: '_id',
        as: 'coOrganizers',
      },
    },
    {
      $lookup: {
        from: 'clubs',
        localField: 'club',
        foreignField: '_id',
        as: 'club',
      },
    },
    {
      $addFields: {
        organizer: { $arrayElemAt: ['$organizer', 0] },
        club: { $arrayElemAt: ['$club', 0] },
        userRSVP: { $arrayElemAt: ['$userRSVP', 0] },
      },
    }
  );

  const events = await Event.aggregate(pipeline);
  return events[0] || null;
}

async function checkEventPermissions(eventId: string, userId: string, requiredPermissions: string[] = ['organizer']) {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Check if user is the organizer
  if (requiredPermissions.includes('organizer') && event.organizer.toString() === userId) {
    return { event, role: 'organizer' };
  }

  // Check if user is a co-organizer
  if (requiredPermissions.includes('co-organizer') && event.coOrganizers.some(id => id.toString() === userId)) {
    return { event, role: 'co-organizer' };
  }

  // Check club permissions if event belongs to a club
  if (event.club && requiredPermissions.includes('club-admin')) {
    const membership = await ClubMember.findOne({
      club: event.club,
      user: userId,
      status: 'active',
      role: { $in: ['owner', 'admin'] },
    });

    if (membership) {
      return { event, role: 'club-admin' };
    }
  }

  throw new Error('Insufficient permissions');
}

// GET /api/events/[id] - Get event details
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    optionalAuth(request, new ExpoResponse(), async () => {
      try {
        const url = new URL(request.url!);
        const eventId = url.pathname.split('/').pop();

        if (!eventId) {
          resolve(ExpoResponse.json(
            { error: 'Event ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        const event = await getEventById(eventId, request.user?.id);

        if (!event) {
          resolve(ExpoResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          ));
          return;
        }

        // Check visibility permissions
        if (event.visibility === 'private') {
          if (!request.user) {
            resolve(ExpoResponse.json(
              { error: 'This event is private' },
              { status: 403 }
            ));
            return;
          }

          // Check if user has access to private event
          const hasAccess = event.organizer._id.toString() === request.user.id ||
                           event.coOrganizers.some((co: any) => co._id.toString() === request.user.id) ||
                           event.userRSVP;

          if (!hasAccess) {
            resolve(ExpoResponse.json(
              { error: 'You do not have access to this private event' },
              { status: 403 }
            ));
            return;
          }
        }

        // Get related events (same organizer or club, upcoming)
        const relatedEvents = await Event.find({
          _id: { $ne: eventId },
          $or: [
            { organizer: event.organizer._id },
            ...(event.club ? [{ club: event.club._id }] : []),
          ],
          status: 'published',
          startDate: { $gte: new Date() },
        })
          .populate('organizer', 'name avatar')
          .populate('club', 'name username logoUrl')
          .sort({ startDate: 1 })
          .limit(5)
          .lean();

        // Increment view count
        await Event.findByIdAndUpdate(eventId, {
          $inc: { 'stats.viewCount': 1 },
        });

        // Get attendee counts by status
        const attendeeCounts = await EventRSVP.aggregate([
          { $match: { event: eventId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]);

        const statusCounts = attendeeCounts.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {});

        // Check if user can edit
        let canEdit = false;
        let canDelete = false;
        
        if (request.user) {
          try {
            const permissions = await checkEventPermissions(eventId, request.user.id, ['organizer', 'co-organizer', 'club-admin']);
            canEdit = true;
            canDelete = permissions.role === 'organizer';
          } catch {
            // User doesn't have edit permissions
          }
        }

        resolve(ExpoResponse.json({
          event: {
            ...event,
            attendeeCounts: {
              going: statusCounts.going || 0,
              interested: statusCounts.interested || 0,
              waitlist: statusCounts.waitlist || 0,
              total: Object.values(statusCounts).reduce((a: any, b: any) => a + b, 0),
            },
          },
          relatedEvents,
          permissions: {
            canEdit,
            canDelete,
            canRSVP: request.user ? true : false,
          },
        }));
      } catch (error) {
        console.error('Get event error:', error);
        resolve(ExpoResponse.json(
          { error: 'Failed to fetch event' },
          { status: 500 }
        ));
      }
    });
  });
}

// PUT /api/events/[id] - Update event
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
        const eventId = url.pathname.split('/').pop();

        if (!eventId) {
          resolve(ExpoResponse.json(
            { error: 'Event ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Check permissions
        await checkEventPermissions(eventId, request.user.id, ['organizer', 'co-organizer', 'club-admin']);

        const contentType = request.headers.get('content-type');
        let updateData: any;

        if (contentType?.includes('multipart/form-data')) {
          // Handle form data with file upload
          const formData = await request.formData();
          
          updateData = {};
          const fields = ['location', 'onlineDetails', 'cost', 'requirements', 'tags', 'coOrganizers', 'settings'];
          
          for (const [key, value] of formData.entries()) {
            if (fields.includes(key)) {
              updateData[key] = JSON.parse(value as string);
            } else if (key !== 'image' && key !== 'images') {
              updateData[key] = value;
            }
          }

          // Handle image upload
          const imageFile = formData.get('image') as File;
          if (imageFile) {
            updateData.imageUrl = await uploadImage(imageFile, 'event-images', request.user.id);
          }

          // Handle multiple images
          const imageFiles = formData.getAll('images') as File[];
          if (imageFiles.length > 0) {
            updateData.images = await Promise.all(
              imageFiles.map(file => uploadImage(file, 'event-images', request.user.id))
            );
          }
        } else {
          updateData = await request.json();
        }

        const validatedData = updateEventSchema.parse(updateData);

        // Update event
        const updatedEvent = await Event.findByIdAndUpdate(
          eventId,
          { ...validatedData, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).populate([
          { path: 'organizer', select: 'name avatar email' },
          { path: 'club', select: 'name username logoUrl' },
          { path: 'coOrganizers', select: 'name avatar' },
        ]);

        if (!updatedEvent) {
          resolve(ExpoResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          ));
          return;
        }

        // TODO: Send notifications to attendees about event updates

        resolve(ExpoResponse.json({
          event: updatedEvent.toJSON(),
          message: 'Event updated successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Update event error:', error);
        if (error.message === 'Event not found') {
          resolve(ExpoResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to edit this event' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to update event' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// DELETE /api/events/[id] - Cancel/Delete event
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
        const eventId = url.pathname.split('/').pop();

        if (!eventId) {
          resolve(ExpoResponse.json(
            { error: 'Event ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Check permissions (only organizer can delete)
        await checkEventPermissions(eventId, request.user.id, ['organizer']);

        const body = await request.json().catch(() => ({}));
        const { permanent = false, reason } = body;

        if (permanent) {
          // Permanent deletion - remove event and all related data
          await Promise.all([
            Event.findByIdAndDelete(eventId),
            EventRSVP.deleteMany({ event: eventId }),
          ]);

          resolve(ExpoResponse.json({
            message: 'Event deleted permanently',
          }));
        } else {
          // Soft delete - mark as cancelled
          const updatedEvent = await Event.findByIdAndUpdate(
            eventId,
            {
              status: 'cancelled',
              cancelledAt: new Date(),
              cancellationReason: reason,
            },
            { new: true }
          );

          // TODO: Send cancellation notifications to all attendees

          resolve(ExpoResponse.json({
            event: updatedEvent,
            message: 'Event cancelled successfully',
          }));
        }
      } catch (error) {
        console.error('Delete event error:', error);
        if (error.message === 'Event not found') {
          resolve(ExpoResponse.json(
            { error: 'Event not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'Only the event organizer can delete this event' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to delete event' },
            { status: 500 }
          ));
        }
      }
    });
  });
}