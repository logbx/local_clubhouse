import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Club } from '@/lib/models/club';
import { ClubMember } from '@/lib/models/club-member';
import { AuthRequest, verifyToken, optionalAuth } from '@/lib/middleware/auth';
import { createRateLimiter } from '@/lib/middleware/rate-limit';
import { uploadImage } from '@/lib/upload';

const createClubSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  username: z.string().min(3).max(30).toLowerCase().regex(/^[a-z0-9_-]+$/, 'Invalid username format'),
  description: z.string().min(10).max(2000),
  category: z.enum(['gaming', 'sports', 'technology', 'music', 'art', 'education', 'business', 'social', 'other']),
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
});

const clubListSchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  search: z.string().optional(),
  category: z.string().optional(),
  sortBy: z.enum(['newest', 'popular', 'active', 'name']).optional(),
  location: z.string().optional(),
});

// Rate limiter for club creation
const createClubLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Too many clubs created, please try again later',
});

// GET /api/clubs - List clubs with pagination and filters
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    optionalAuth(request, new ExpoResponse(), async () => {
      try {
        const url = new URL(request.url!);
        const query = clubListSchema.parse(Object.fromEntries(url.searchParams));

        await connectDB();

        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 50);
        const skip = (page - 1) * limit;

        // Build filter query
        const filter: any = {};

        if (query.search) {
          filter.$text = { $search: query.search };
        }

        if (query.category && query.category !== 'all') {
          filter.category = query.category;
        }

        if (query.location) {
          filter['location.country'] = new RegExp(query.location, 'i');
        }

        // Build sort query
        let sort: any = {};
        switch (query.sortBy) {
          case 'popular':
            sort = { 'stats.memberCount': -1 };
            break;
          case 'active':
            sort = { 'stats.lastActivity': -1 };
            break;
          case 'name':
            sort = { name: 1 };
            break;
          default:
            sort = { createdAt: -1 };
        }

        // Execute query
        const [clubs, total] = await Promise.all([
          Club.find(filter)
            .populate('owner', 'name avatar')
            .select('-description -socialLinks -settings')
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .lean(),
          Club.countDocuments(filter)
        ]);

        // Get user's club memberships if authenticated
        let userClubs = new Set();
        if (request.user) {
          const memberships = await ClubMember.find({
            user: request.user.id,
            status: 'active'
          }).select('club');
          userClubs = new Set(memberships.map(m => m.club.toString()));
        }

        // Add membership info
        const clubsWithMembership = clubs.map(club => ({
          ...club,
          isMember: userClubs.has(club._id.toString()),
        }));

        resolve(ExpoResponse.json({
          clubs: clubsWithMembership,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
          },
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Invalid query parameters', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Club list error:', error);
        resolve(ExpoResponse.json(
          { error: 'Failed to fetch clubs' },
          { status: 500 }
        ));
      }
    });
  });
}

// POST /api/clubs - Create new club
export async function POST(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    createClubLimiter(request, new ExpoResponse(), () => {
      verifyToken(request, new ExpoResponse(), async () => {
        try {
          if (!request.user) {
            resolve(ExpoResponse.json(
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
            
            data = {
              name: formData.get('name'),
              username: formData.get('username'),
              description: formData.get('description'),
              category: formData.get('category'),
              isPrivate: formData.get('isPrivate') === 'true',
              memberLimit: formData.get('memberLimit') ? Number(formData.get('memberLimit')) : undefined,
              tags: formData.get('tags') ? JSON.parse(formData.get('tags') as string) : [],
              location: formData.get('location') ? JSON.parse(formData.get('location') as string) : undefined,
              socialLinks: formData.get('socialLinks') ? JSON.parse(formData.get('socialLinks') as string) : undefined,
            };

            // Handle logo upload
            const logoFile = formData.get('logo') as File;
            if (logoFile) {
              data.logoUrl = await uploadImage(logoFile, 'club-logos', request.user.id);
            }

            // Handle banner upload
            const bannerFile = formData.get('banner') as File;
            if (bannerFile) {
              data.bannerUrl = await uploadImage(bannerFile, 'club-banners', request.user.id);
            }
          } else {
            // Handle JSON data
            data = await request.json();
          }

          const validatedData = createClubSchema.parse(data);

          await connectDB();

          // Check if username is already taken
          const existingClub = await Club.findOne({ username: validatedData.username });
          if (existingClub) {
            resolve(ExpoResponse.json(
              { error: 'Username is already taken' },
              { status: 400 }
            ));
            return;
          }

          // Create club
          const club = new Club({
            ...validatedData,
            owner: request.user.id,
            logoUrl: data.logoUrl,
            bannerUrl: data.bannerUrl,
          });

          await club.save();

          // Add creator as owner member
          const membership = new ClubMember({
            club: club._id,
            user: request.user.id,
            role: 'owner',
            status: 'active',
          });

          await membership.save();

          // Populate owner info
          await club.populate('owner', 'name avatar email');

          resolve(ExpoResponse.json({
            club: club.toJSON(),
            message: 'Club created successfully',
          }));
        } catch (error) {
          if (error instanceof z.ZodError) {
            resolve(ExpoResponse.json(
              { error: 'Validation failed', details: error.errors },
              { status: 400 }
            ));
            return;
          }

          console.error('Create club error:', error);
          resolve(ExpoResponse.json(
            { error: 'Failed to create club' },
            { status: 500 }
          ));
        }
      });
    });
  });
}