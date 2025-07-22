import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Event as EventModel } from '@/lib/models/event';
import { EventRSVP } from '@/lib/models/event-rsvp';
import { User } from '@/lib/models/user.model';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';
import { createRateLimiter } from '@/lib/middleware/rate-limit';

const attendeeQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  status: z.enum(['going', 'interested', 'waitlist', 'all']).optional(),
  search: z.string().optional(),
  checkedIn: z.enum(['true', 'false', 'all']).optional(),
  export: z.enum(['csv', 'json']).optional(),
});

const checkInSchema = z.object({
  userId: z.string(),
  qrCode: z.string().optional(),
  location: z.object({
    coordinates: z.array(z.number()).length(2),
    accuracy: z.number().optional(),
  }).optional(),
  notes: z.string().max(500).optional(),
});

const bulkCheckInSchema = z.object({
  attendees: z.array(z.object({
    userId: z.string(),
    qrCode: z.string().optional(),
    notes: z.string().max(500).optional(),
  })),
  location: z.object({
    coordinates: z.array(z.number()).length(2),
    accuracy: z.number().optional(),
  }).optional(),
});

// Rate limiter for check-in operations
const checkInRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many check-in attempts, please slow down',
});

async function checkEventPermissions(eventId: string, userId: string) {
  const event = await (EventModel as any).findById(eventId);
  if (!event) {
    throw new Error('Event not found');
  }

  // Check if user is organizer, co-organizer, or club admin
  const isOrganizer = event.organizer.toString() === userId;
  const isCoOrganizer = event.coOrganizers.some(id => id.toString() === userId);
  
  let isClubAdmin = false;
  if (event.club) {
    const ClubMember = (await import('@/lib/models/club-member')).ClubMember;
    const membership = await ClubMember.findOne({
      club: event.club,
      user: userId,
      status: 'active',
      role: { $in: ['owner', 'admin'] },
    });
    isClubAdmin = !!membership;
  }

  if (!isOrganizer && !isCoOrganizer && !isClubAdmin) {
    throw new Error('Insufficient permissions');
  }

  return event;
}

function generateCSV(attendees: any[], eventTitle: string): string {
  const headers = [
    'Name',
    'Email',
    'Status',
    'Guest Count',
    'Checked In',
    'Check-in Time',
    'Registered At',
    'Dietary Restrictions',
    'Accessibility Needs',
    'Notes',
    'QR Code'
  ];

  const rows = attendees.map(attendee => [
    attendee.user.name || '',
    attendee.user.email || '',
    attendee.status || '',
    attendee.response.guestCount || 0,
    attendee.checkedIn ? 'Yes' : 'No',
    attendee.checkInTime ? new Date(attendee.checkInTime).toISOString() : '',
    attendee.registeredAt ? new Date(attendee.registeredAt).toISOString() : '',
    attendee.response.dietaryRestrictions || '',
    attendee.response.accessibility || '',
    attendee.response.notes || '',
    attendee.qrCode || ''
  ]);

  const csvContent = [
    `# Event Attendees - ${eventTitle}`,
    `# Generated on ${new Date().toISOString()}`,
    '',
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  return csvContent;
}

// GET /api/events/[id]/attendees - List event attendees
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

        const query = attendeeQuerySchema.parse(Object.fromEntries(url.searchParams));

        await connectDB();

        // Check permissions
        const event = await checkEventPermissions(eventId, request.user.id);

        const page = query.page || 1;
        const limit = Math.min(query.limit || 50, 500);
        const skip = (page - 1) * limit;

        // Build filter
        const filter: any = { event: eventId };

        if (query.status && query.status !== 'all') {
          filter.status = query.status;
        }

        if (query.checkedIn && query.checkedIn !== 'all') {
          filter.checkedIn = query.checkedIn === 'true';
        }

        // Build aggregation pipeline
        const pipeline: any[] = [
          { $match: filter },
          {
            $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'user',
            },
          },
          {
            $addFields: {
              user: { $arrayElemAt: ['$user', 0] },
            },
          },
        ];

        // Add search filter
        if (query.search) {
          pipeline.push({
            $match: {
              $or: [
                { 'user.name': new RegExp(query.search, 'i') },
                { 'user.email': new RegExp(query.search, 'i') },
              ],
            },
          });
        }

        // Handle export requests
        if (query.export) {
          const allAttendees = await EventRSVP.aggregate([
            ...pipeline,
            {
              $project: {
                status: 1,
                response: 1,
                checkedIn: 1,
                checkInTime: 1,
                registeredAt: 1,
                qrCode: 1,
                user: {
                  name: 1,
                  email: 1,
                },
              },
            },
            { $sort: { registeredAt: 1 } },
          ]);

          if (query.export === 'csv') {
            const csv = generateCSV(allAttendees, event.title);
            resolve(new ExpoResponse(csv, {
              status: 200,
              headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="event-${eventId}-attendees.csv"`,
              },
            }));
            return;
          } else if (query.export === 'json') {
            resolve(Response.json({
              event: {
                _id: event._id,
                title: event.title,
                startDate: event.startDate,
                endDate: event.endDate,
              },
              attendees: allAttendees,
              exportedAt: new Date().toISOString(),
            }, {
              headers: {
                'Content-Disposition': `attachment; filename="event-${eventId}-attendees.json"`,
              },
            }));
            return;
          }
        }

        // Regular paginated response
        pipeline.push(
          { $sort: { registeredAt: 1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              status: 1,
              response: 1,
              checkedIn: 1,
              checkInTime: 1,
              checkInLocation: 1,
              registeredAt: 1,
              qrCode: 1,
              paymentStatus: 1,
              user: {
                _id: 1,
                name: 1,
                email: 1,
                avatar: 1,
              },
            },
          }
        );

        const [attendees, totalResult] = await Promise.all([
          EventRSVP.aggregate(pipeline),
          EventRSVP.countDocuments(filter),
        ]);

        // Get statistics
        const stats = await EventRSVP.aggregate([
          { $match: { event: eventId } },
          {
            $group: {
              _id: null,
              totalRSVPs: { $sum: 1 },
              goingCount: {
                $sum: { $cond: [{ $eq: ['$status', 'going'] }, 1, 0] },
              },
              interestedCount: {
                $sum: { $cond: [{ $eq: ['$status', 'interested'] }, 1, 0] },
              },
              waitlistCount: {
                $sum: { $cond: [{ $eq: ['$status', 'waitlist'] }, 1, 0] },
              },
              checkedInCount: {
                $sum: { $cond: ['$checkedIn', 1, 0] },
              },
              totalGuests: { $sum: '$response.guestCount' },
            },
          },
        ]);

        const eventStats = stats[0] || {
          totalRSVPs: 0,
          goingCount: 0,
          interestedCount: 0,
          waitlistCount: 0,
          checkedInCount: 0,
          totalGuests: 0,
        };

        resolve(Response.json({
          attendees,
          pagination: {
            page,
            limit,
            total: totalResult,
            pages: Math.ceil(totalResult / limit),
            hasNext: page < Math.ceil(totalResult / limit),
            hasPrev: page > 1,
          },
          stats: eventStats,
          event: {
            _id: event._id,
            title: event.title,
            capacity: event.capacity,
            startDate: event.startDate,
            endDate: event.endDate,
            settings: event.settings,
          },
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(Response.json(
            { error: 'Invalid query parameters', details: error.issues },
            { status: 400 }
          ));
          return;
        }

        console.error('Get attendees error:', error);
        if (error.message === 'Event not found') {
          resolve(Response.json(
            { error: 'Event not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(Response.json(
            { error: 'You do not have permission to view attendees for this event' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to fetch attendees' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// POST /api/events/[id]/attendees - Check-in attendee
export async function POST(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    checkInRateLimiter(request, new ExpoResponse(), () => {
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
          const validatedData = checkInSchema.parse(body);

          await connectDB();

          // Check permissions
          const event = await checkEventPermissions(eventId, request.user.id);

          // Check if check-in is enabled
          if (!event.settings.enableCheckIn) {
            resolve(Response.json(
              { error: 'Check-in is not enabled for this event' },
              { status: 400 }
            ));
            return;
          }

          // Find the attendee
          const attendee = await EventRSVP.findOne({
            event: eventId,
            user: validatedData.userId,
            status: 'going',
          }).populate('user', 'name email avatar');

          if (!attendee) {
            resolve(Response.json(
              { error: 'Attendee not found or not registered as going' },
              { status: 404 }
            ));
            return;
          }

          // Verify QR code if provided
          if (validatedData.qrCode && attendee.qrCode !== validatedData.qrCode) {
            resolve(Response.json(
              { error: 'Invalid QR code' },
              { status: 400 }
            ));
            return;
          }

          // Check if already checked in
          if (attendee.checkedIn) {
            resolve(Response.json(
              { 
                error: 'Attendee already checked in',
                checkInTime: attendee.checkInTime,
              },
              { status: 400 }
            ));
            return;
          }

          // Perform check-in
          attendee.checkedIn = true;
          attendee.checkInTime = new Date();
          
          if (validatedData.location) {
            attendee.checkInLocation = {
              coordinates: validatedData.location.coordinates as [number, number],
              accuracy: validatedData.location.accuracy || 0,
            };
          }

          await attendee.save();

          // Update event check-in count
          await (EventModel as any).findByIdAndUpdate(eventId, {
            $inc: { 'stats.checkInCount': 1 },
          });

          resolve(Response.json({
            message: 'Attendee checked in successfully',
            attendee: {
              _id: attendee._id,
              user: attendee.user,
              checkedIn: attendee.checkedIn,
              checkInTime: attendee.checkInTime,
              checkInLocation: attendee.checkInLocation,
            },
          }));
        } catch (error) {
          if (error instanceof z.ZodError) {
            resolve(Response.json(
              { error: 'Validation failed', details: error.issues },
              { status: 400 }
            ));
            return;
          }

          console.error('Check-in error:', error);
          if (error.message === 'Event not found') {
            resolve(Response.json(
              { error: 'Event not found' },
              { status: 404 }
            ));
          } else if (error.message === 'Insufficient permissions') {
            resolve(Response.json(
              { error: 'You do not have permission to check in attendees for this event' },
              { status: 403 }
            ));
          } else {
            resolve(Response.json(
              { error: 'Failed to check in attendee' },
              { status: 500 }
            ));
          }
        }
      });
    });
  });
}

// PUT /api/events/[id]/attendees - Bulk check-in
export async function PUT(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    checkInRateLimiter(request, new ExpoResponse(), () => {
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
          const validatedData = bulkCheckInSchema.parse(body);

          await connectDB();

          // Check permissions
          const event = await checkEventPermissions(eventId, request.user.id);

          // Check if check-in is enabled
          if (!event.settings.enableCheckIn) {
            resolve(Response.json(
              { error: 'Check-in is not enabled for this event' },
              { status: 400 }
            ));
            return;
          }

          const results = {
            successful: [] as any[],
            failed: [] as any[],
            alreadyCheckedIn: [] as any[],
          };

          // Process each attendee
          for (const attendeeData of validatedData.attendees) {
            try {
              const attendee = await EventRSVP.findOne({
                event: eventId,
                user: attendeeData.userId,
                status: 'going',
              }).populate('user', 'name email');

              if (!attendee) {
                results.failed.push({
                  userId: attendeeData.userId,
                  error: 'Attendee not found or not registered as going',
                });
                continue;
              }

              // Verify QR code if provided
              if (attendeeData.qrCode && attendee.qrCode !== attendeeData.qrCode) {
                results.failed.push({
                  userId: attendeeData.userId,
                  error: 'Invalid QR code',
                  user: attendee.user,
                });
                continue;
              }

              // Check if already checked in
              if (attendee.checkedIn) {
                results.alreadyCheckedIn.push({
                  userId: attendeeData.userId,
                  user: attendee.user,
                  checkInTime: attendee.checkInTime,
                });
                continue;
              }

              // Perform check-in
              attendee.checkedIn = true;
              attendee.checkInTime = new Date();
              
              if (validatedData.location) {
                attendee.checkInLocation = {
                  coordinates: validatedData.location.coordinates as [number, number],
                  accuracy: validatedData.location.accuracy || 0,
                };
              }

              await attendee.save();

              results.successful.push({
                userId: attendeeData.userId,
                user: attendee.user,
                checkInTime: attendee.checkInTime,
              });
            } catch (error) {
              results.failed.push({
                userId: attendeeData.userId,
                error: 'Check-in failed: ' + (error as Error).message,
              });
            }
          }

          // Update event check-in count
          if (results.successful.length > 0) {
            await (EventModel as any).findByIdAndUpdate(eventId, {
              $inc: { 'stats.checkInCount': results.successful.length },
            });
          }

          resolve(Response.json({
            message: `Bulk check-in completed: ${results.successful.length} successful, ${results.failed.length} failed, ${results.alreadyCheckedIn.length} already checked in`,
            results,
          }));
        } catch (error) {
          if (error instanceof z.ZodError) {
            resolve(Response.json(
              { error: 'Validation failed', details: error.issues },
              { status: 400 }
            ));
            return;
          }

          console.error('Bulk check-in error:', error);
          if (error.message === 'Event not found') {
            resolve(Response.json(
              { error: 'Event not found' },
              { status: 404 }
            ));
          } else if (error.message === 'Insufficient permissions') {
            resolve(Response.json(
              { error: 'You do not have permission to check in attendees for this event' },
              { status: 403 }
            ));
          } else {
            resolve(Response.json(
              { error: 'Failed to perform bulk check-in' },
              { status: 500 }
            ));
          }
        }
      });
    });
  });
}