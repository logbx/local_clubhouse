import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Tournament, TournamentPlayer, TournamentRound, TournamentMatch } from '@/lib/models/tournament';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';

const createRoundSchema = z.object({
  roundNumber: z.number().min(1).optional(),
  name: z.string().min(1).max(100).optional(),
  pairings: z.array(z.object({
    player1: z.string(),
    player2: z.string().optional(),
    tableNumber: z.number().optional(),
  })).optional(),
  autoGenerate: z.boolean().optional(),
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

// Swiss tournament pairing algorithm
function generateSwissPairings(players: any[], round: number) {
  // Sort players by total points, then by tiebreakers
  const sortedPlayers = [...players].sort((a, b) => {
    if (b.stats.points !== a.stats.points) {
      return b.stats.points - a.stats.points;
    }
    // Tiebreaker: wins, then games difference
    if (b.stats.wins !== a.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }
    return (b.stats.gamesWon - b.stats.gamesLost) - (a.stats.gamesWon - a.stats.gamesLost);
  });

  const pairings = [];
  const paired = new Set();

  for (let i = 0; i < sortedPlayers.length; i++) {
    if (paired.has(sortedPlayers[i]._id.toString())) continue;

    const player1 = sortedPlayers[i];
    let bestOpponent = null;
    let bestIndex = -1;

    // Find best available opponent
    for (let j = i + 1; j < sortedPlayers.length; j++) {
      if (paired.has(sortedPlayers[j]._id.toString())) continue;

      const player2 = sortedPlayers[j];
      
      // Check if players have already played each other
      // TODO: Implement previous match checking logic
      
      bestOpponent = player2;
      bestIndex = j;
      break;
    }

    if (bestOpponent) {
      pairings.push({
        player1: player1.player._id || player1.player,
        player2: bestOpponent.player._id || bestOpponent.player,
        tableNumber: Math.floor(pairings.length / 2) + 1,
      });
      
      paired.add(player1._id.toString());
      paired.add(bestOpponent._id.toString());
    } else {
      // Bye round for odd number of players
      pairings.push({
        player1: player1.player._id || player1.player,
        player2: null,
        tableNumber: null,
      });
      paired.add(player1._id.toString());
    }
  }

  return pairings;
}

// Single elimination pairing algorithm
function generateEliminationPairings(players: any[], round: number) {
  // Sort by seed for first round, by bracket position for subsequent rounds
  const sortedPlayers = [...players].sort((a, b) => a.seed - b.seed);
  const pairings = [];

  for (let i = 0; i < sortedPlayers.length; i += 2) {
    const player1 = sortedPlayers[i];
    const player2 = sortedPlayers[i + 1] || null;

    pairings.push({
      player1: player1.player._id || player1.player,
      player2: player2 ? (player2.player._id || player2.player) : null,
      tableNumber: Math.floor(i / 2) + 1,
    });
  }

  return pairings;
}

// Round robin pairing algorithm
function generateRoundRobinPairings(players: any[], round: number) {
  const n = players.length;
  if (n < 2) return [];

  // Use round-robin algorithm
  const pairings = [];
  
  // For odd number of players, add a "bye" player
  const playersWithBye = n % 2 === 1 ? [...players, { _id: 'bye', player: null }] : players;
  const totalPlayers = playersWithBye.length;

  // Generate pairings for this round using round-robin rotation
  for (let i = 0; i < totalPlayers / 2; i++) {
    const player1Index = i;
    const player2Index = totalPlayers - 1 - i;
    
    // Apply rotation based on round number
    const rotatedPlayer1Index = (player1Index + round - 1) % totalPlayers;
    const rotatedPlayer2Index = (player2Index + round - 1) % totalPlayers;
    
    const player1 = playersWithBye[rotatedPlayer1Index];
    const player2 = playersWithBye[rotatedPlayer2Index];

    // Skip bye matches
    if (player1._id === 'bye' || player2._id === 'bye') continue;

    pairings.push({
      player1: player1.player._id || player1.player,
      player2: player2.player._id || player2.player,
      tableNumber: i + 1,
    });
  }

  return pairings;
}

// GET /api/tournaments/[id]/rounds - Get all rounds
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

        // Get all rounds with matches
        const rounds = await TournamentRound.find({ tournament: tournamentId })
          .populate({
            path: 'matches',
            populate: [
              { path: 'player1', select: 'name avatar' },
              { path: 'player2', select: 'name avatar' },
            ],
          })
          .sort({ roundNumber: 1 })
          .lean();

        // Get tournament info
        const tournament = await Tournament.findById(tournamentId).select('type status currentRound totalRounds');

        resolve(Response.json({
          rounds,
          tournament: {
            _id: tournament?._id,
            type: tournament?.type,
            status: tournament?.status,
            currentRound: tournament?.currentRound,
            totalRounds: tournament?.totalRounds,
          },
        }));
      } catch (error) {
        console.error('Get tournament rounds error:', error);
        if (error.message === 'Tournament not found') {
          resolve(Response.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(Response.json(
            { error: 'You do not have permission to view rounds for this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to fetch tournament rounds' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// POST /api/tournaments/[id]/rounds - Generate next round
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
        const validatedData = createRoundSchema.parse(body);

        await connectDB();

        // Check permissions
        const { tournament } = await checkTournamentPermissions(
          tournamentId,
          request.user.id,
          ['organizer', 'club-admin']
        );

        // Check tournament status
        if (tournament.status !== 'active') {
          resolve(Response.json(
            { error: 'Tournament must be active to generate rounds' },
            { status: 400 }
          ));
          return;
        }

        // Determine next round number
        const nextRoundNumber = validatedData.roundNumber || tournament.currentRound + 1;

        if (nextRoundNumber > tournament.totalRounds) {
          resolve(Response.json(
            { error: 'All rounds have been completed' },
            { status: 400 }
          ));
          return;
        }

        // Check if round already exists
        const existingRound = await TournamentRound.findOne({
          tournament: tournamentId,
          roundNumber: nextRoundNumber,
        });

        if (existingRound) {
          resolve(Response.json(
            { error: 'Round already exists' },
            { status: 400 }
          ));
          return;
        }

        // For rounds after first, check if previous round is complete
        if (nextRoundNumber > 1) {
          const previousRound = await TournamentRound.findOne({
            tournament: tournamentId,
            roundNumber: nextRoundNumber - 1,
          });

          if (!previousRound || previousRound.status !== 'completed') {
            resolve(Response.json(
              { error: 'Previous round must be completed before generating next round' },
              { status: 400 }
            ));
            return;
          }
        }

        // Get active players
        const activePlayers = await TournamentPlayer.find({
          tournament: tournamentId,
          status: { $in: ['registered', 'checked_in', 'playing'] },
        }).populate('player', 'name avatar').lean();

        if (activePlayers.length < 2) {
          resolve(Response.json(
            { error: 'Need at least 2 active players to generate round' },
            { status: 400 }
          ));
          return;
        }

        // Generate pairings based on tournament type
        let pairings = [];
        
        if (validatedData.pairings) {
          pairings = validatedData.pairings;
        } else if (validatedData.autoGenerate !== false) {
          switch (tournament.type) {
            case 'swiss':
              pairings = generateSwissPairings(activePlayers, nextRoundNumber);
              break;
            case 'single_elimination':
            case 'double_elimination':
              pairings = generateEliminationPairings(activePlayers, nextRoundNumber);
              break;
            case 'round_robin':
              pairings = generateRoundRobinPairings(activePlayers, nextRoundNumber);
              break;
            default:
              resolve(Response.json(
                { error: 'Unsupported tournament type for auto-generation' },
                { status: 400 }
              ));
              return;
          }
        }

        // Create round name
        const roundName = validatedData.name || (
          tournament.type === 'single_elimination' && nextRoundNumber === tournament.totalRounds 
            ? 'Final'
            : tournament.type === 'single_elimination' && nextRoundNumber === tournament.totalRounds - 1
            ? 'Semi-Final'
            : `Round ${nextRoundNumber}`
        );

        // Create round
        const round = new TournamentRound({
          tournament: tournamentId,
          roundNumber: nextRoundNumber,
          name: roundName,
          status: 'pending',
          isElimination: ['single_elimination', 'double_elimination'].includes(tournament.type),
          pairings,
          matches: [],
        });

        await round.save();

        // Create matches for each pairing
        const matches = [];
        for (let i = 0; i < pairings.length; i++) {
          const pairing = pairings[i];
          
          const match = new TournamentMatch({
            tournament: tournamentId,
            round: round._id,
            player1: pairing.player1,
            player2: pairing.player2,
            status: 'scheduled',
            tableNumber: pairing.tableNumber,
            isLive: false,
            spectators: [],
          });

          await match.save();
          matches.push(match._id);
        }

        // Update round with match IDs
        round.matches = matches;
        await round.save();

        // Update tournament current round
        await Tournament.findByIdAndUpdate(tournamentId, {
          currentRound: nextRoundNumber,
        });

        // Populate for response
        await round.populate({
          path: 'matches',
          populate: [
            { path: 'player1', select: 'name avatar' },
            { path: 'player2', select: 'name avatar' },
          ],
        });

        // TODO: Send WebSocket notifications to all participants
        // TODO: Send push notifications for round start

        resolve(Response.json({
          round: round.toJSON(),
          message: `Round ${nextRoundNumber} generated successfully with ${matches.length} matches`,
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(Response.json(
            { error: 'Validation failed', details: error.issues },
            { status: 400 }
          ));
          return;
        }

        console.error('Generate tournament round error:', error);
        if (error.message === 'Tournament not found') {
          resolve(Response.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(Response.json(
            { error: 'You do not have permission to generate rounds for this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(Response.json(
            { error: 'Failed to generate tournament round' },
            { status: 500 }
          ));
        }
      }
    });
  });
}