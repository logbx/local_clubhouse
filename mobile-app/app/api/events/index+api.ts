import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Event as EventModel } from '@/lib/models/event';
import { EventRSVP } from '@/lib/models/event-rsvp';
import { Club } from '@/lib/models/club.model';
import { AuthRequest, verifyToken, optionalAuth } from '@/lib/middleware/auth';
import { createRateLimiter } from '@/lib/middleware/rate-limit';
import { uploadImage } from '@/lib/upload';

const eventQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  search: z.string().optional(),
  type: z.enum(['tournament', 'meetup', 'workshop', 'conference', 'social', 'online', 'other']).optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  club: z.string().optional(),
  lat: z.string().transform(Number).optional(),
  lng: z.string().transform(Number).optional(),
  radius: z.string().transform(Number).optional(), // in kilometers
  sortBy: z.enum(['date', 'distance', 'popularity', 'created']).optional(),
  status: z.enum(['upcoming', 'ongoing', 'past']).optional(),
});

const createEventSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(10).max(10000),
  shortDescription: z.string().min(10).max(300),
  type: z.enum(['tournament', 'meetup', 'workshop', 'conference', 'social', 'online', 'other']),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().transform((str) => new Date(str)),
  timezone: z.string().default('UTC'),
  isAllDay: z.boolean().optional(),
  location: z.object({
    name: z.string().min(1),
    address: z.string().min(1),
    coordinates: z.array(z.number()).length(2),
    city: z.string().min(1),
    country: z.string().min(1),
    postalCode: z.string().optional(),
    placeId: z.string().optional(),
  }),
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
  club: z.string().optional(),
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
});

// Rate limiter for event creation
const createEventLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many events created, please try again later',
});

// GET /api/events - List events with filters and geolocation
export async function GET(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    optionalAuth(request, new Response(), async () => {
      try {
        const url = new URL(request.url!);
        const query = eventQuerySchema.parse(Object.fromEntries(url.searchParams));

        await connectDB();

        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 100);
        const skip = (page - 1) * limit;

        // Build filter query
        const filter: any = {
          status: 'published',
          visibility: 'public',
        };

        // Date filtering
        if (query.status) {
          const now = new Date();
          switch (query.status) {
            case 'upcoming':
              filter.startDate = { $gte: now };
              break;
            case 'ongoing':
              filter.startDate = { $lte: now };
              filter.endDate = { $gte: now };
              break;
            case 'past':
              filter.endDate = { $lt: now };
              break;
          }
        } else {
          // Default to upcoming events
          filter.startDate = { $gte: new Date() };
        }

        if (query.startDate) {
          filter.startDate = { $gte: new Date(query.startDate) };
        }

        if (query.endDate) {
          filter.endDate = { $lte: new Date(query.endDate) };
        }

        if (query.type) {
          filter.type = query.type;
        }

        if (query.club) {
          filter.club = query.club;
        }

        if (query.location) {
          filter.$or = [
            { 'location.city': new RegExp(query.location, 'i') },
            { 'location.country': new RegExp(query.location, 'i') },
            { 'location.name': new RegExp(query.location, 'i') },
          ];
        }

        if (query.search) {
          filter.$text = { $search: query.search };
        }

        // Build aggregation pipeline
        const pipeline: any[] = [
          { $match: filter },
        ];

        // Add geolocation-based distance calculation
        if (query.lat && query.lng) {
          pipeline.unshift({
            $geoNear: {
              near: {
                type: 'Point',
                coordinates: [query.lng, query.lat],
              },
              distanceField: 'distance',
              maxDistance: (query.radius || 50) * 1000, // Convert km to meters
              spherical: true,
            },
          });
        }

        // Add user RSVP status if authenticated
        if (request.user) {
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
                        { $eq: ['$user', request.user.id] },
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
              userRSVPStatus: { $arrayElemAt: ['$userRSVP.status', 0] },
            },
          }
        );

        // Add sorting
        let sortStage: any = {};
        switch (query.sortBy) {
          case 'distance':
            if (query.lat && query.lng) {
              sortStage = { distance: 1 };
            } else {
              sortStage = { startDate: 1 };
            }
            break;
          case 'popularity':
            sortStage = { 'stats.attendeeCount': -1, startDate: 1 };
            break;
          case 'created':
            sortStage = { createdAt: -1 };
            break;
          default:
            sortStage = { startDate: 1 };
        }

        pipeline.push(
          { $sort: sortStage },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              title: 1,
              shortDescription: 1,
              type: 1,
              startDate: 1,
              endDate: 1,
              timezone: 1,
              isAllDay: 1,
              location: 1,
              isOnline: 1,
              imageUrl: 1,
              capacity: 1,
              cost: 1,
              tags: 1,
              stats: 1,
              organizer: {
                _id: 1,
                name: 1,
                avatar: 1,
              },
              club: {
                _id: 1,
                name: 1,
                username: 1,
                logoUrl: 1,
              },
              distance: 1,
              userRSVPStatus: 1,
              createdAt: 1,
            },
          }
        );

        const [events, totalResult] = await Promise.all([
          (EventModel as any).aggregate(pipeline),
          (EventModel as any).countDocuments(filter),
        ]);

        resolve(Response.json({
          events,
          pagination: {
            page,
            limit,
            total: totalResult,
            pages: Math.ceil(totalResult / limit),
            hasNext: page < Math.ceil(totalResult / limit),
            hasPrev: page > 1,
          },
          userLocation: query.lat && query.lng ? {
            lat: query.lat,
            lng: query.lng,
            radius: query.radius || 50,
          } : null,
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(Response.json(
            { error: 'Invalid query parameters', details: error.issues },
            { status: 400 }
          ));
          return;
        }

        console.error('Events list error:', error);
        resolve(Response.json(
          { error: 'Failed to fetch events' },
          { status: 500 }
        ));
      }
    });
  });
}

// POST /api/events - Create new event
export async function POST(request: AuthRequest): Promise<Response> {
  return new Promise((resolve) => {
    createEventLimiter(request, new Response(), () => {
      verifyToken(request, new Response(), async () => {
        try {
          if (!request.user) {
            resolve(Response.json(
              { error: 'Authentication required' },
              { status: 401 }
            ));
            return;
          }

          const contentType = request.headers.get('content-type');
          let data: any;

          if (contentType?.includes('multipart/form-data')) {
            // Handle form data with file upload
            const formData = await request.formData();
            
            // Parse JSON fields
            const fields = ['location', 'onlineDetails', 'cost', 'requirements', 'tags', 'coOrganizers', 'settings'];
            data = {};
            
            for (const [key, value] of formData.entries()) {
              if (fields.includes(key)) {
                data[key] = JSON.parse(value as string);
              } else if (key !== 'image' && key !== 'images') {
                data[key] = value;
              }
            }

            // Handle image upload
            const imageFile = formData.get('image') as File;
            if (imageFile) {
              data.imageUrl = await uploadImage(imageFile, 'event-images', request.user.id);
            }

            // Handle multiple images
            const imageFiles = formData.getAll('images') as File[];
            if (imageFiles.length > 0) {
              data.images = await Promise.all(
                imageFiles.map(file => uploadImage(file, 'event-images', request.user.id))
              );
            }
          } else {
            data = await request.json();
          }

          const validatedData = createEventSchema.parse(data);

          await connectDB();

          // Validate club membership if event is for a club
          if (validatedData.club) {
            const clubMembership = await (ClubMember as any).findOne({
              club: validatedData.club,
              user: request.user.id,
              status: 'active',
              role: { $in: ['owner', 'admin'] },
            });

            if (!clubMembership) {
              resolve(Response.json(
                { error: 'You must be a club admin to create events for this club' },
                { status: 403 }
              ));
              return;
            }
          }

          // Create event
          const event = new (EventModel as any)({
            ...validatedData,
            organizer: request.user.id,
            imageUrl: data.imageUrl,
            images: data.images || [],
            status: 'published', // Auto-publish for now
          });

          await event.save();

          // Populate for response
          await event.populate([
            { path: 'organizer', select: 'name avatar email' },
            { path: 'club', select: 'name username logoUrl' },
            { path: 'coOrganizers', select: 'name avatar' },
          ]);

          resolve(Response.json({
            event: event.toJSON(),
            message: 'Event created successfully',
          }));
        } catch (error) {
          if (error instanceof z.ZodError) {
            resolve(Response.json(
              { error: 'Validation failed', details: error.issues },
              { status: 400 }
            ));
            return;
          }

          console.error('Create event error:', error);
          resolve(Response.json(
            { error: 'Failed to create event' },
            { status: 500 }
          ));
        }
      });
    });
  });
}