import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Event as EventModel } from '@/lib/models/event';
import { EventRSVP } from '@/lib/models/event-rsvp';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';
import { createRateLimiter } from '@/lib/middleware/rate-limit';

const rsvpSchema = z.object({
  status: z.enum(['going', 'interested', 'not_going']),
  guestCount: z.number().min(0).max(10).optional(),
  dietaryRestrictions: z.string().max(500).optional(),
  accessibility: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  notifications: z.object({
    rsvpConfirmation: z.boolean().optional(),
    reminder24h: z.boolean().optional(),
    reminder1h: z.boolean().optional(),
    eventUpdates: z.boolean().optional(),
    cancellation: z.boolean().optional(),
  }).optional(),
});

// Rate limiter for RSVP changes
const rsvpRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many RSVP changes, please slow down',
});

// POST /api/events/[id]/rsvp - Toggle RSVP status
export async function POST(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    rsvpRateLimiter(request, new ExpoResponse(), () => {
      verifyToken(request, new ExpoResponse(), async () => {
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
          const eventId = pathParts[pathParts.length - 2];

          if (!eventId) {
            resolve(Response.json(
              { error: 'Event ID is required' },
              { status: 400 }
            ));
            return;
          }

          const body = await request.json();
          const validatedData = rsvpSchema.parse(body);

          await connectDB();

          // Get event details
          const event = await (EventModel as any).findById(eventId);
          if (!event) {
            resolve(Response.json(
              { error: 'Event not found' },
              { status: 404 }
            ));
            return;
          }

          // Check if event is in the future
          if (event.startDate <= new Date()) {
            resolve(Response.json(
              { error: 'Cannot RSVP to past events' },
              { status: 400 }
            ));
            return;
          }

          // Check if event is cancelled
          if (event.status === 'cancelled') {
            resolve(Response.json(
              { error: 'Cannot RSVP to cancelled events' },
              { status: 400 }
            ));
            return;
          }

          // Find existing RSVP
          let existingRSVP = await (EventRSVP as any).findOne({
            event: eventId,
            user: request.user.id,
          });

          let action: 'created' | 'updated' | 'removed' = 'created';
          let newStatus = validatedData.status;

          if (existingRSVP) {
            if (validatedData.status === 'not_going') {
              // Remove RSVP
              await (EventRSVP as any).findByIdAndDelete(existingRSVP._id);
              action = 'removed';
            } else {
              // Update existing RSVP
              existingRSVP.status = validatedData.status;
              existingRSVP.response = {
                willAttend: validatedData.status === 'going',
                guestCount: validatedData.guestCount || 0,
                dietaryRestrictions: validatedData.dietaryRestrictions,
                accessibility: validatedData.accessibility,
                notes: validatedData.notes,
              };

              if (validatedData.notifications) {
                existingRSVP.notifications = {
                  ...existingRSVP.notifications,
                  ...validatedData.notifications,
                };
              }

              await existingRSVP.save();
              action = 'updated';
            }
          } else {
            if (validatedData.status === 'not_going') {
              resolve(Response.json(
                { message: 'No RSVP to remove' },
                { status: 200 }
              ));
              return;
            }

            // Check capacity for 'going' status
            if (validatedData.status === 'going' && event.capacity) {
              const currentAttendees = await (EventRSVP as any).countDocuments({
                event: eventId,
                status: 'going',
              });

              if (currentAttendees >= event.capacity) {
                // Add to waitlist if allowed
                if (event.settings.allowWaitlist) {
                  newStatus = 'waitlist';
                } else {
                  resolve(Response.json(
                    { error: 'Event is at capacity and waitlist is not allowed' },
                    { status: 400 }
                  ));
                  return;
                }
              }
            }

            // Create new RSVP
            const newRSVP = new EventRSVP({
              event: eventId,
              user: request.user.id,
              status: newStatus,
              response: {
                willAttend: newStatus === 'going',
                guestCount: validatedData.guestCount || 0,
                dietaryRestrictions: validatedData.dietaryRestrictions,
                accessibility: validatedData.accessibility,
                notes: validatedData.notes,
              },
              notifications: {
                rsvpConfirmation: true,
                reminder24h: true,
                reminder1h: true,
                eventUpdates: true,
                cancellation: true,
                ...validatedData.notifications,
              },
            });

            await newRSVP.save();
            existingRSVP = newRSVP;
          }

          // Update event statistics
          const attendeeCounts = await (EventRSVP as any).aggregate([
            { $match: { event: eventId } },
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ]);

          const goingCount = attendeeCounts.find(item => item._id === 'going')?.count || 0;
          const interestedCount = attendeeCounts.find(item => item._id === 'interested')?.count || 0;

          await (EventModel as any).findByIdAndUpdate(eventId, {
            'stats.attendeeCount': goingCount,
            'stats.interestedCount': interestedCount,
          });

          // TODO: Send confirmation email/push notification based on platform
          // TODO: Send notification to event organizer about new RSVP

          const responseData: any = {
            action,
            status: newStatus,
            message: getActionMessage(action, newStatus),
            attendeeCounts: {
              going: goingCount,
              interested: interestedCount,
              total: goingCount + interestedCount,
            },
          };

          if (action !== 'removed' && existingRSVP) {
            responseData.rsvp = existingRSVP.toJSON();
          }

          resolve(Response.json(responseData));
        } catch (error) {
          if (error instanceof z.ZodError) {
            resolve(Response.json(
              { error: 'Validation failed', details: error.issues },
              { status: 400 }
            ));
            return;
          }

          console.error('RSVP error:', error);
          resolve(Response.json(
            { error: 'Failed to update RSVP' },
            { status: 500 }
          ));
        }
      });
    });
  });
}

// GET /api/events/[id]/rsvp - Get user's RSVP status
export async function GET(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
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
        const eventId = pathParts[pathParts.length - 2];

        if (!eventId) {
          resolve(Response.json(
            { error: 'Event ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        const rsvp = await (EventRSVP as any).findOne({
          event: eventId,
          user: request.user.id,
        }).populate('event', 'title startDate endDate capacity');

        if (!rsvp) {
          resolve(Response.json({
            hasRSVP: false,
            status: null,
          }));
          return;
        }

        resolve(Response.json({
          hasRSVP: true,
          rsvp: rsvp.toJSON(),
        }));
      } catch (error) {
        console.error('Get RSVP error:', error);
        resolve(Response.json(
          { error: 'Failed to fetch RSVP status' },
          { status: 500 }
        ));
      }
    });
  });
}

// DELETE /api/events/[id]/rsvp - Remove RSVP
export async function DELETE(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    verifyToken(request, new ExpoResponse(), async () => {
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
        const eventId = pathParts[pathParts.length - 2];

        if (!eventId) {
          resolve(Response.json(
            { error: 'Event ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        const deletedRSVP = await (EventRSVP as any).findOneAndDelete({
          event: eventId,
          user: request.user.id,
        });

        if (!deletedRSVP) {
          resolve(Response.json(
            { error: 'No RSVP found to remove' },
            { status: 404 }
          ));
          return;
        }

        // Update event statistics
        const attendeeCounts = await (EventRSVP as any).aggregate([
          { $match: { event: eventId } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]);

        const goingCount = attendeeCounts.find(item => item._id === 'going')?.count || 0;
        const interestedCount = attendeeCounts.find(item => item._id === 'interested')?.count || 0;

        await (EventModel as any).findByIdAndUpdate(eventId, {
          'stats.attendeeCount': goingCount,
          'stats.interestedCount': interestedCount,
        });

        // If someone was removed from going status, promote from waitlist
        if (deletedRSVP.status === 'going') {
          const waitlistRSVP = await (EventRSVP as any).findOne({
            event: eventId,
            status: 'waitlist',
          }).sort({ registeredAt: 1 });

          if (waitlistRSVP) {
            waitlistRSVP.status = 'going';
            await waitlistRSVP.save();

            // TODO: Send notification to user that they've been moved from waitlist
          }
        }

        resolve(Response.json({
          message: 'RSVP removed successfully',
          attendeeCounts: {
            going: goingCount,
            interested: interestedCount,
            total: goingCount + interestedCount,
          },
        }));
      } catch (error) {
        console.error('Delete RSVP error:', error);
        resolve(Response.json(
          { error: 'Failed to remove RSVP' },
          { status: 500 }
        ));
      }
    });
  });
}

function getActionMessage(action: string, status: string): string {
  switch (action) {
    case 'created':
      return status === 'going' ? 'Successfully registered for event!' :
             status === 'interested' ? 'Marked as interested in event!' :
             status === 'waitlist' ? 'Added to waitlist - you\'ll be notified if a spot opens!' :
             'RSVP updated!';
    case 'updated':
      return status === 'going' ? 'Updated RSVP - you\'re going!' :
             status === 'interested' ? 'Updated RSVP - marked as interested!' :
             'RSVP updated!';
    case 'removed':
      return 'RSVP removed successfully';
    default:
      return 'RSVP updated!';
  }
}