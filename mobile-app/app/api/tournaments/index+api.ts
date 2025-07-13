import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Tournament, TournamentPlayer } from '@/lib/models/tournament';
import { AuthRequest, verifyToken, optionalAuth } from '@/lib/middleware/auth';
import { createRateLimiter } from '@/lib/middleware/rate-limit';

const tournamentQuerySchema = z.object({
  page: z.string().transform(Number).optional(),
  limit: z.string().transform(Number).optional(),
  status: z.enum(['draft', 'registration', 'active', 'completed', 'cancelled']).optional(),
  type: z.enum(['single_elimination', 'double_elimination', 'swiss', 'round_robin']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  organizer: z.string().optional(),
  club: z.string().optional(),
  sortBy: z.enum(['startDate', 'created', 'name', 'players']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

const createTournamentSchema = z.object({
  name: z.string().min(3).max(200).trim(),
  description: z.string().max(2000).optional(),
  type: z.enum(['single_elimination', 'double_elimination', 'swiss', 'round_robin']),
  format: z.string().min(1).max(100),
  maxPlayers: z.number().min(2).max(1024),
  startDate: z.string().transform((str) => new Date(str)),
  registrationDeadline: z.string().transform((str) => new Date(str)),
  entryFee: z.object({
    amount: z.number().min(0).optional(),
    currency: z.string().optional(),
    required: z.boolean().optional(),
  }).optional(),
  prizes: z.array(z.object({
    position: z.number().min(1),
    description: z.string().min(1),
    value: z.number().optional(),
    currency: z.string().optional(),
  })).optional(),
  settings: z.object({
    allowLateRegistration: z.boolean().optional(),
    requireApproval: z.boolean().optional(),
    showLiveBracket: z.boolean().optional(),
    allowSpectators: z.boolean().optional(),
    randomizeSeeds: z.boolean().optional(),
    pointsForWin: z.number().optional(),
    pointsForDraw: z.number().optional(),
    pointsForLoss: z.number().optional(),
    tiebreakers: z.array(z.enum(['head_to_head', 'buchholz', 'points_diff', 'games_won'])).optional(),
  }).optional(),
  club: z.string().optional(),
  venue: z.object({
    name: z.string(),
    address: z.string(),
    coordinates: z.array(z.number()).length(2),
  }).optional(),
  rules: z.string().max(5000).optional(),
});

// Rate limiter for tournament creation
const createTournamentLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many tournaments created, please try again later',
});

// GET /api/tournaments - List tournaments
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    optionalAuth(request, new ExpoResponse(), async () => {
      try {
        const url = new URL(request.url!);
        const query = tournamentQuerySchema.parse(Object.fromEntries(url.searchParams));

        await connectDB();

        const page = query.page || 1;
        const limit = Math.min(query.limit || 20, 100);
        const skip = (page - 1) * limit;

        // Build filter query
        const filter: any = {};

        if (query.status) {
          filter.status = query.status;
        }

        if (query.type) {
          filter.type = query.type;
        }

        if (query.organizer) {
          filter.organizer = query.organizer;
        }

        if (query.club) {
          filter.club = query.club;
        }

        if (query.startDate) {
          filter.startDate = { $gte: new Date(query.startDate) };
        }

        if (query.endDate) {
          filter.startDate = {
            ...filter.startDate,
            $lte: new Date(query.endDate),
          };
        }

        if (query.search) {
          filter.$text = { $search: query.search };
        }

        // Build sort query
        const sortBy = query.sortBy || 'startDate';
        const sortOrder = query.sortOrder === 'desc' ? -1 : 1;
        const sort: any = { [sortBy]: sortOrder };

        // Add secondary sort for consistency
        if (sortBy !== 'createdAt') {
          sort.createdAt = -1;
        }

        // Execute query with aggregation for player counts
        const pipeline = [
          { $match: filter },
          {
            $lookup: {
              from: 'tournamentplayers',
              localField: '_id',
              foreignField: 'tournament',
              as: 'players',
            },
          },
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
              currentPlayers: { $size: '$players' },
              organizer: { $arrayElemAt: ['$organizer', 0] },
              club: { $arrayElemAt: ['$club', 0] },
            },
          },
          {
            $project: {
              name: 1,
              description: 1,
              type: 1,
              format: 1,
              status: 1,
              maxPlayers: 1,
              currentPlayers: 1,
              startDate: 1,
              registrationDeadline: 1,
              entryFee: 1,
              prizes: 1,
              settings: 1,
              venue: 1,
              currentRound: 1,
              totalRounds: 1,
              isLive: 1,
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
              createdAt: 1,
            },
          },
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
        ];

        const [tournaments, totalResult] = await Promise.all([
          Tournament.aggregate(pipeline),
          Tournament.countDocuments(filter),
        ]);

        // Add user registration status if authenticated
        if (request.user) {
          const tournamentIds = tournaments.map(t => t._id);
          const userRegistrations = await TournamentPlayer.find({
            tournament: { $in: tournamentIds },
            player: request.user.id,
          }).select('tournament status');

          const registrationMap = new Map(
            userRegistrations.map(reg => [reg.tournament.toString(), reg.status])
          );

          tournaments.forEach(tournament => {
            tournament.userRegistrationStatus = registrationMap.get(tournament._id.toString()) || null;
          });
        }

        resolve(ExpoResponse.json({
          tournaments,
          pagination: {
            page,
            limit,
            total: totalResult,
            pages: Math.ceil(totalResult / limit),
            hasNext: page < Math.ceil(totalResult / limit),
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

        console.error('Get tournaments error:', error);
        resolve(ExpoResponse.json(
          { error: 'Failed to fetch tournaments' },
          { status: 500 }
        ));
      }
    });
  });
}

// POST /api/tournaments - Create tournament
export async function POST(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    createTournamentLimiter(request, new ExpoResponse(), () => {
      verifyToken(request, new ExpoResponse(), async () => {
        try {
          if (!request.user) {
            resolve(ExpoResponse.json(
              { error: 'Authentication required' },
              { status: 401 }
            ));
            return;
          }

          const body = await request.json();
          const validatedData = createTournamentSchema.parse(body);

          await connectDB();

          // Validate club ownership if creating for a club
          if (validatedData.club) {
            const ClubMember = (await import('@/lib/models/club-member')).ClubMember;
            const clubMembership = await ClubMember.findOne({
              club: validatedData.club,
              user: request.user.id,
              status: 'active',
              role: { $in: ['owner', 'admin'] },
            });

            if (!clubMembership) {
              resolve(ExpoResponse.json(
                { error: 'You must be a club admin to create tournaments for this club' },
                { status: 403 }
              ));
              return;
            }
          }

          // Validate dates
          if (validatedData.registrationDeadline >= validatedData.startDate) {
            resolve(ExpoResponse.json(
              { error: 'Registration deadline must be before tournament start date' },
              { status: 400 }
            ));
            return;
          }

          // Calculate total rounds based on tournament type
          let totalRounds = 0;
          if (validatedData.type === 'single_elimination') {
            totalRounds = Math.ceil(Math.log2(validatedData.maxPlayers));
          } else if (validatedData.type === 'double_elimination') {
            totalRounds = (Math.ceil(Math.log2(validatedData.maxPlayers)) * 2) - 1;
          } else if (validatedData.type === 'swiss') {
            totalRounds = Math.ceil(Math.log2(validatedData.maxPlayers));
          } else if (validatedData.type === 'round_robin') {
            totalRounds = validatedData.maxPlayers - 1;
          }

          // Create tournament
          const tournament = new Tournament({
            ...validatedData,
            organizer: request.user.id,
            totalRounds,
            currentPlayers: 0,
            currentRound: 0,
            isLive: false,
            stats: {
              totalMatches: 0,
              completedMatches: 0,
              averageMatchDuration: 0,
              spectatorCount: 0,
            },
          });

          await tournament.save();

          // Populate for response
          await tournament.populate([
            { path: 'organizer', select: 'name avatar email' },
            { path: 'club', select: 'name username logoUrl' },
          ]);

          resolve(ExpoResponse.json({
            tournament: tournament.toJSON(),
            message: 'Tournament created successfully',
          }));
        } catch (error) {
          if (error instanceof z.ZodError) {
            resolve(ExpoResponse.json(
              { error: 'Validation failed', details: error.errors },
              { status: 400 }
            ));
            return;
          }

          console.error('Create tournament error:', error);
          resolve(ExpoResponse.json(
            { error: 'Failed to create tournament' },
            { status: 500 }
          ));
        }
      });
    });
  });
}