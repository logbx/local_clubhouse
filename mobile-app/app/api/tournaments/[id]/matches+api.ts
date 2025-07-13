import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Tournament, TournamentPlayer, TournamentRound, TournamentMatch } from '@/lib/models/tournament';
import { AuthRequest, verifyToken } from '@/lib/middleware/auth';

const submitResultSchema = z.object({
  matchId: z.string(),
  result: z.object({
    winner: z.string().optional(),
    isDraw: z.boolean().optional(),
    score: z.object({
      player1Score: z.number().min(0),
      player2Score: z.number().min(0),
      games: z.array(z.object({
        player1: z.number().min(0),
        player2: z.number().min(0),
      })).optional(),
    }),
    duration: z.number().min(0).optional(),
    notes: z.string().max(1000).optional(),
  }),
});

const updateMatchSchema = z.object({
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled', 'no_show']).optional(),
  tableNumber: z.number().min(1).optional(),
  startTime: z.string().transform((str) => new Date(str)).optional(),
  endTime: z.string().transform((str) => new Date(str)).optional(),
  isLive: z.boolean().optional(),
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

async function updatePlayerStats(tournamentId: string, playerId: string, result: any, isWinner: boolean, isDraw: boolean) {
  const player = await TournamentPlayer.findOne({
    tournament: tournamentId,
    player: playerId,
  });

  if (!player) return;

  const tournament = await Tournament.findById(tournamentId);
  const pointsForWin = tournament?.settings?.pointsForWin || 3;
  const pointsForDraw = tournament?.settings?.pointsForDraw || 1;
  const pointsForLoss = tournament?.settings?.pointsForLoss || 0;

  let pointsToAdd = 0;
  let winsToAdd = 0;
  let lossesToAdd = 0;
  let drawsToAdd = 0;

  if (isDraw) {
    pointsToAdd = pointsForDraw;
    drawsToAdd = 1;
  } else if (isWinner) {
    pointsToAdd = pointsForWin;
    winsToAdd = 1;
  } else {
    pointsToAdd = pointsForLoss;
    lossesToAdd = 1;
  }

  // Determine which score belongs to this player
  const isPlayer1 = player.player.toString() === playerId;
  const playerScore = isPlayer1 ? result.score.player1Score : result.score.player2Score;
  const opponentScore = isPlayer1 ? result.score.player2Score : result.score.player1Score;

  await TournamentPlayer.findByIdAndUpdate(player._id, {
    $inc: {
      'stats.wins': winsToAdd,
      'stats.losses': lossesToAdd,
      'stats.draws': drawsToAdd,
      'stats.points': pointsToAdd,
      'stats.gamesWon': playerScore,
      'stats.gamesLost': opponentScore,
    },
  });
}

async function checkRoundCompletion(tournamentId: string, roundId: string) {
  const round = await TournamentRound.findById(roundId);
  if (!round) return;

  const allMatches = await TournamentMatch.find({
    tournament: tournamentId,
    round: roundId,
  });

  const completedMatches = allMatches.filter(match => match.status === 'completed');
  
  if (completedMatches.length === allMatches.length) {
    // Mark round as completed
    await TournamentRound.findByIdAndUpdate(roundId, {
      status: 'completed',
      endTime: new Date(),
    });

    // Check if tournament is completed
    const tournament = await Tournament.findById(tournamentId);
    if (tournament && round.roundNumber === tournament.totalRounds) {
      await Tournament.findByIdAndUpdate(tournamentId, {
        status: 'completed',
        isLive: false,
        endDate: new Date(),
      });
    }

    return true;
  }

  return false;
}

// GET /api/tournaments/[id]/matches - Get tournament matches
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
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
        const pathParts = url.pathname.split('/');
        const tournamentId = pathParts[pathParts.length - 2];
        
        const roundNumber = url.searchParams.get('round');
        const status = url.searchParams.get('status');
        const isLive = url.searchParams.get('live');

        if (!tournamentId) {
          resolve(ExpoResponse.json(
            { error: 'Tournament ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Check permissions
        await checkTournamentPermissions(tournamentId, request.user.id, ['organizer', 'club-admin', 'participant', 'any']);

        // Build filter
        const filter: any = { tournament: tournamentId };
        
        if (roundNumber) {
          const round = await TournamentRound.findOne({
            tournament: tournamentId,
            roundNumber: parseInt(roundNumber),
          });
          if (round) {
            filter.round = round._id;
          }
        }

        if (status) {
          filter.status = status;
        }

        if (isLive === 'true') {
          filter.isLive = true;
        }

        // Get matches with player and round information
        const matches = await TournamentMatch.find(filter)
          .populate([
            { path: 'player1', select: 'name avatar rating' },
            { path: 'player2', select: 'name avatar rating' },
            { path: 'round', select: 'roundNumber name status' },
            { path: 'reportedBy', select: 'name' },
            { path: 'verifiedBy', select: 'name' },
          ])
          .sort({ 'round.roundNumber': 1, tableNumber: 1 })
          .lean();

        // Add match positions for bracket display
        const matchesWithPositions = matches.map((match, index) => ({
          ...match,
          position: index + 1,
        }));

        resolve(ExpoResponse.json({
          matches: matchesWithPositions,
          total: matches.length,
        }));
      } catch (error) {
        console.error('Get tournament matches error:', error);
        if (error.message === 'Tournament not found') {
          resolve(ExpoResponse.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to view matches for this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to fetch tournament matches' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// POST /api/tournaments/[id]/matches - Submit match result
export async function POST(request: AuthRequest): Promise<ExpoResponse> {
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
        const pathParts = url.pathname.split('/');
        const tournamentId = pathParts[pathParts.length - 2];

        if (!tournamentId) {
          resolve(ExpoResponse.json(
            { error: 'Tournament ID is required' },
            { status: 400 }
          ));
          return;
        }

        const body = await request.json();
        const validatedData = submitResultSchema.parse(body);

        await connectDB();

        // Check tournament permissions
        const { tournament, role } = await checkTournamentPermissions(
          tournamentId,
          request.user.id,
          ['organizer', 'club-admin', 'participant']
        );

        // Get match
        const match = await TournamentMatch.findOne({
          _id: validatedData.matchId,
          tournament: tournamentId,
        }).populate(['player1', 'player2']);

        if (!match) {
          resolve(ExpoResponse.json(
            { error: 'Match not found' },
            { status: 404 }
          ));
          return;
        }

        // Check if user can submit results for this match
        const isPlayer = match.player1?._id.toString() === request.user.id || 
                        match.player2?._id.toString() === request.user.id;
        const canSubmit = ['organizer', 'club-admin'].includes(role) || isPlayer;

        if (!canSubmit) {
          resolve(ExpoResponse.json(
            { error: 'You can only submit results for your own matches' },
            { status: 403 }
          ));
          return;
        }

        // Check match status
        if (match.status === 'completed') {
          resolve(ExpoResponse.json(
            { error: 'Match result has already been submitted' },
            { status: 400 }
          ));
          return;
        }

        // Validate result data
        const { result } = validatedData;
        const isDraw = result.isDraw || false;
        
        if (!isDraw && !result.winner) {
          resolve(ExpoResponse.json(
            { error: 'Winner must be specified for non-draw results' },
            { status: 400 }
          ));
          return;
        }

        if (result.winner && ![match.player1?._id.toString(), match.player2?._id.toString()].includes(result.winner)) {
          resolve(ExpoResponse.json(
            { error: 'Winner must be one of the match participants' },
            { status: 400 }
          ));
          return;
        }

        // Determine winner and loser
        let winner = null;
        let loser = null;
        
        if (!isDraw && result.winner) {
          winner = result.winner;
          loser = winner === match.player1?._id.toString() ? match.player2?._id : match.player1?._id;
        }

        // Update match with result
        const updatedMatch = await TournamentMatch.findByIdAndUpdate(
          match._id,
          {
            status: 'completed',
            result: {
              winner,
              loser,
              isDraw,
              score: result.score,
              duration: result.duration,
              notes: result.notes,
            },
            endTime: new Date(),
            reportedBy: request.user.id,
            // Verification by organizer/admin if submitted by player
            ...(isPlayer && !['organizer', 'club-admin'].includes(role) ? {} : { verifiedBy: request.user.id }),
          },
          { new: true }
        ).populate(['player1', 'player2', 'round']);

        // Update player statistics
        if (match.player1) {
          const isPlayer1Winner = winner === match.player1._id.toString();
          await updatePlayerStats(tournamentId, match.player1._id.toString(), result, isPlayer1Winner, isDraw);
        }

        if (match.player2) {
          const isPlayer2Winner = winner === match.player2._id.toString();
          await updatePlayerStats(tournamentId, match.player2._id.toString(), result, isPlayer2Winner, isDraw);
        }

        // Update tournament statistics
        await Tournament.findByIdAndUpdate(tournamentId, {
          $inc: { 
            'stats.completedMatches': 1,
            'stats.averageMatchDuration': result.duration || 0,
          },
        });

        // Check if round is completed
        const roundCompleted = await checkRoundCompletion(tournamentId, match.round._id.toString());

        // TODO: Send WebSocket updates to connected clients
        // TODO: Send push notifications to participants

        resolve(ExpoResponse.json({
          match: updatedMatch,
          roundCompleted,
          message: 'Match result submitted successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Submit match result error:', error);
        if (error.message === 'Tournament not found') {
          resolve(ExpoResponse.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to submit results for this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to submit match result' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// PUT /api/tournaments/[id]/matches - Update match details
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
        const pathParts = url.pathname.split('/');
        const tournamentId = pathParts[pathParts.length - 2];
        const matchId = url.searchParams.get('matchId');

        if (!tournamentId || !matchId) {
          resolve(ExpoResponse.json(
            { error: 'Tournament ID and Match ID are required' },
            { status: 400 }
          ));
          return;
        }

        const body = await request.json();
        const validatedData = updateMatchSchema.parse(body);

        await connectDB();

        // Check permissions (only organizers and club admins can update match details)
        await checkTournamentPermissions(tournamentId, request.user.id, ['organizer', 'club-admin']);

        // Get match
        const match = await TournamentMatch.findOne({
          _id: matchId,
          tournament: tournamentId,
        });

        if (!match) {
          resolve(ExpoResponse.json(
            { error: 'Match not found' },
            { status: 404 }
          ));
          return;
        }

        // Prevent changes to completed matches (except status changes to cancelled)
        if (match.status === 'completed' && validatedData.status !== 'cancelled') {
          resolve(ExpoResponse.json(
            { error: 'Cannot modify completed match details' },
            { status: 400 }
          ));
          return;
        }

        // Update match
        const updatedMatch = await TournamentMatch.findByIdAndUpdate(
          matchId,
          validatedData,
          { new: true, runValidators: true }
        ).populate(['player1', 'player2', 'round']);

        // TODO: Send WebSocket updates to connected clients
        // TODO: Send notifications if match time changed

        resolve(ExpoResponse.json({
          match: updatedMatch,
          message: 'Match updated successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Update match error:', error);
        if (error.message === 'Tournament not found') {
          resolve(ExpoResponse.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to update matches in this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to update match' },
            { status: 500 }
          ));
        }
      }
    });
  });
}