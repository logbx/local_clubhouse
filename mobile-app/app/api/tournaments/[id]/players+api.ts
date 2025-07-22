import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Tournament, TournamentPlayer } from '@/lib/models/tournament';
import { User } from '@/lib/models/user.model';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';

const addPlayerSchema = z.object({
  playerId: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  seed: z.number().min(1).optional(),
  rating: z.number().optional(),
}).refine(
  (data) => data.playerId || data.email || data.name,
  { message: "Either playerId, email, or name must be provided" }
);

const updatePlayerSchema = z.object({
  seed: z.number().min(1).optional(),
  rating: z.number().optional(),
  status: z.enum(['registered', 'checked_in', 'playing', 'eliminated', 'withdrawn']).optional(),
});

async function checkTournamentPermissions(tournamentId: string, userId: string, requiredRoles: string[] = ['organizer']) {
  const tournament = await Tournament.findById(tournamentId);
  if (!tournament) {
    throw new Error('Tournament not found');
  }

  // Check if user is the organizer
  if (requiredRoles.includes('organizer') && tournament.organizer.toString() === userId) {
    return { tournament, role: 'organizer' };
  }

  // Check if user is a club admin (for club tournaments)
  if (tournament.club && requiredRoles.includes('club-admin')) {
    const ClubMember = (await import('@/lib/models/club-member')).ClubMember;
    const membership = await ClubMember.findOne({
      club: tournament.club,
      user: userId,
      status: 'active',
      role: { $in: ['owner', 'admin'] },
    });

    if (membership) {
      return { tournament, role: 'club-admin' };
    }
  }

  // Check if user is a participant
  if (requiredRoles.includes('participant')) {
    const participation = await TournamentPlayer.findOne({
      tournament: tournamentId,
      player: userId,
    });

    if (participation) {
      return { tournament, role: 'participant' };
    }
  }

  if (!requiredRoles.includes('any')) {
    throw new Error('Insufficient permissions');
  }

  return { tournament, role: 'viewer' };
}

// GET /api/tournaments/[id]/players - List participants
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
        const tournamentId = pathParts[pathParts.length - 2];

        if (!tournamentId) {
          resolve(Response.json(
            { error: 'Tournament ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Check permissions
        await checkTournamentPermissions(tournamentId, request.user.id, ['organizer', 'club-admin', 'participant', 'any']);

        // Get tournament players with detailed information
        const players = await TournamentPlayer.find({ tournament: tournamentId })
          .populate({
            path: 'player',
            select: 'name email avatar rating',
          })
          .sort({ seed: 1 })
          .lean();

        // Get standings for Swiss/Round Robin tournaments
        const tournament = await Tournament.findById(tournamentId).select('type status currentRound');
        let standings = null;

        if (tournament && ['swiss', 'round_robin'].includes(tournament.type) && tournament.status === 'active') {
          // Calculate current standings
          standings = players
            .map(player => ({
              ...player,
              totalPoints: player.stats.points,
              matchPoints: player.stats.wins * 3 + player.stats.draws * 1,
              gamePoints: player.stats.gamesWon - player.stats.gamesLost,
            }))
            .sort((a, b) => {
              // Sort by points, then by tiebreakers
              if (b.totalPoints !== a.totalPoints) {
                return b.totalPoints - a.totalPoints;
              }
              if (b.matchPoints !== a.matchPoints) {
                return b.matchPoints - a.matchPoints;
              }
              return b.gamePoints - a.gamePoints;
            })
            .map((player, index) => ({
              ...player,
              position: index + 1,
            }));
        }

        resolve(Response.json({
          players,
          standings,
          tournament: {
            _id: tournament?._id,
            type: tournament?.type,
            status: tournament?.status,
            currentRound: tournament?.currentRound,
          },
        }));
      } catch (error) {
        console.error('Get tournament players error:', error);
        if (error.message === 'Tournament not found') {
          resolve(Response.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(Response.json(
            { error: 'You do not have permission to view players for this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to fetch tournament players' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// POST /api/tournaments/[id]/players - Add player
export async function POST(request: AuthRequest): Promise<Response> {
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
        const tournamentId = pathParts[pathParts.length - 2];

        if (!tournamentId) {
          resolve(Response.json(
            { error: 'Tournament ID is required' },
            { status: 400 }
          ));
          return;
        }

        const body = await request.json();
        const validatedData = addPlayerSchema.parse(body);

        await connectDB();

        // Check permissions
        const { tournament, role } = await checkTournamentPermissions(
          tournamentId, 
          request.user.id, 
          ['organizer', 'club-admin', 'any']
        );

        // Check tournament status
        if (tournament.status === 'completed' || tournament.status === 'cancelled') {
          resolve(Response.json(
            { error: 'Cannot add players to completed or cancelled tournaments' },
            { status: 400 }
          ));
          return;
        }

        // Check if tournament is full
        if (tournament.currentPlayers >= tournament.maxPlayers) {
          resolve(Response.json(
            { error: 'Tournament is full' },
            { status: 400 }
          ));
          return;
        }

        // Check registration deadline (unless organizer/admin)
        if (!['organizer', 'club-admin'].includes(role) && new Date() > tournament.registrationDeadline) {
          if (!tournament.settings.allowLateRegistration) {
            resolve(Response.json(
              { error: 'Registration deadline has passed' },
              { status: 400 }
            ));
            return;
          }
        }

        // Find or create user
        let playerId = validatedData.playerId;
        
        if (!playerId) {
          let user = null;
          
          if (validatedData.email) {
            user = await User.findOne({ email: validatedData.email });
          }
          
          if (!user && validatedData.name) {
            // For organizers, allow creating placeholder users
            if (['organizer', 'club-admin'].includes(role)) {
              user = new User({
                name: validatedData.name,
                email: validatedData.email || `${validatedData.name.replace(/\s+/g, '').toLowerCase()}@placeholder.local`,
                isPlaceholder: true,
              });
              await user.save();
            } else {
              resolve(Response.json(
                { error: 'User not found. Please provide a valid user ID or email.' },
                { status: 404 }
              ));
              return;
            }
          }
          
          playerId = user?._id.toString();
        }

        if (!playerId) {
          resolve(Response.json(
            { error: 'Could not determine player to add' },
            { status: 400 }
          ));
          return;
        }

        // Check if player is already registered
        const existingPlayer = await TournamentPlayer.findOne({
          tournament: tournamentId,
          player: playerId,
        });

        if (existingPlayer) {
          resolve(Response.json(
            { error: 'Player is already registered for this tournament' },
            { status: 400 }
          ));
          return;
        }

        // Determine seed
        let seed = validatedData.seed;
        if (!seed) {
          const highestSeed = await TournamentPlayer.findOne({ tournament: tournamentId })
            .sort({ seed: -1 })
            .select('seed');
          seed = (highestSeed?.seed || 0) + 1;
        } else {
          // Check if seed is already taken
          const existingSeed = await TournamentPlayer.findOne({
            tournament: tournamentId,
            seed: seed,
          });
          
          if (existingSeed) {
            resolve(Response.json(
              { error: 'Seed number is already taken' },
              { status: 400 }
            ));
            return;
          }
        }

        // Create tournament player
        const tournamentPlayer = new TournamentPlayer({
          tournament: tournamentId,
          player: playerId,
          seed,
          rating: validatedData.rating,
          status: 'registered',
          stats: {
            wins: 0,
            losses: 0,
            draws: 0,
            points: 0,
            gamesWon: 0,
            gamesLost: 0,
          },
        });

        await tournamentPlayer.save();

        // Update tournament player count
        await Tournament.findByIdAndUpdate(tournamentId, {
          $inc: { currentPlayers: 1 },
        });

        // Populate for response
        await tournamentPlayer.populate({
          path: 'player',
          select: 'name email avatar rating',
        });

        // TODO: Send notification to player
        // TODO: Send WebSocket update to tournament watchers

        resolve(Response.json({
          player: tournamentPlayer.toJSON(),
          message: 'Player added successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(Response.json(
            { error: 'Validation failed', details: error.issues },
            { status: 400 }
          ));
          return;
        }

        console.error('Add tournament player error:', error);
        if (error.message === 'Tournament not found') {
          resolve(Response.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(Response.json(
            { error: 'You do not have permission to add players to this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to add player' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// PUT /api/tournaments/[id]/players - Update player seed/ranking
export async function PUT(request: AuthRequest): Promise<Response> {
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
        const tournamentId = pathParts[pathParts.length - 2];
        const playerId = url.searchParams.get('playerId');

        if (!tournamentId || !playerId) {
          resolve(Response.json(
            { error: 'Tournament ID and Player ID are required' },
            { status: 400 }
          ));
          return;
        }

        const body = await request.json();
        const validatedData = updatePlayerSchema.parse(body);

        await connectDB();

        // Check permissions
        await checkTournamentPermissions(tournamentId, request.user.id, ['organizer', 'club-admin']);

        // Find tournament player
        const tournamentPlayer = await TournamentPlayer.findOne({
          tournament: tournamentId,
          player: playerId,
        });

        if (!tournamentPlayer) {
          resolve(Response.json(
            { error: 'Player not found in this tournament' },
            { status: 404 }
          ));
          return;
        }

        // Check if seed change is allowed
        if (validatedData.seed && validatedData.seed !== tournamentPlayer.seed) {
          const tournament = await Tournament.findById(tournamentId);
          
          if (tournament?.status === 'active') {
            resolve(Response.json(
              { error: 'Cannot change seeds after tournament has started' },
              { status: 400 }
            ));
            return;
          }

          // Check if new seed is available
          const existingSeed = await TournamentPlayer.findOne({
            tournament: tournamentId,
            seed: validatedData.seed,
            _id: { $ne: tournamentPlayer._id },
          });

          if (existingSeed) {
            resolve(Response.json(
              { error: 'Seed number is already taken' },
              { status: 400 }
            ));
            return;
          }
        }

        // Update tournament player
        const updatedPlayer = await TournamentPlayer.findByIdAndUpdate(
          tournamentPlayer._id,
          validatedData,
          { new: true, runValidators: true }
        ).populate({
          path: 'player',
          select: 'name email avatar rating',
        });

        // TODO: Send WebSocket update to tournament watchers

        resolve(Response.json({
          player: updatedPlayer?.toJSON(),
          message: 'Player updated successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(Response.json(
            { error: 'Validation failed', details: error.issues },
            { status: 400 }
          ));
          return;
        }

        console.error('Update tournament player error:', error);
        if (error.message === 'Tournament not found') {
          resolve(Response.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(Response.json(
            { error: 'You do not have permission to update players in this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to update player' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// DELETE /api/tournaments/[id]/players - Remove player
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
        const tournamentId = pathParts[pathParts.length - 2];
        const playerId = url.searchParams.get('playerId');

        if (!tournamentId || !playerId) {
          resolve(Response.json(
            { error: 'Tournament ID and Player ID are required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Check permissions (players can remove themselves, organizers can remove anyone)
        const { role } = await checkTournamentPermissions(
          tournamentId, 
          request.user.id, 
          ['organizer', 'club-admin', 'participant']
        );

        if (role === 'participant' && playerId !== request.user.id) {
          throw new Error('Insufficient permissions');
        }

        // Check tournament status
        const tournament = await Tournament.findById(tournamentId);
        if (tournament?.status === 'active') {
          // Allow withdrawal but mark as withdrawn instead of removing
          const updatedPlayer = await TournamentPlayer.findOneAndUpdate(
            { tournament: tournamentId, player: playerId },
            { 
              status: 'withdrawn',
              withdrawnAt: new Date(),
            },
            { new: true }
          );

          if (!updatedPlayer) {
            resolve(Response.json(
              { error: 'Player not found in this tournament' },
              { status: 404 }
            ));
            return;
          }

          resolve(Response.json({
            message: 'Player withdrawn from tournament',
          }));
          return;
        }

        // Remove player from tournament
        const deletedPlayer = await TournamentPlayer.findOneAndDelete({
          tournament: tournamentId,
          player: playerId,
        });

        if (!deletedPlayer) {
          resolve(Response.json(
            { error: 'Player not found in this tournament' },
            { status: 404 }
          ));
          return;
        }

        // Update tournament player count
        await Tournament.findByIdAndUpdate(tournamentId, {
          $inc: { currentPlayers: -1 },
        });

        // TODO: Send WebSocket update to tournament watchers

        resolve(Response.json({
          message: 'Player removed successfully',
        }));
      } catch (error) {
        console.error('Remove tournament player error:', error);
        if (error.message === 'Tournament not found') {
          resolve(Response.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(Response.json(
            { error: 'You do not have permission to remove this player' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to remove player' },
            { status: 500 }
          ));
        }
      }
    });
  });
}