import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import { z } from 'zod';
import { connectDB } from '@/lib/db';
import { Tournament, TournamentPlayer, TournamentRound, TournamentMatch } from '@/lib/models/tournament';
import { AuthRequest, verifyToken, optionalAuth } from '@/lib/middleware/auth';

const updateTournamentSchema = z.object({
  name: z.string().min(3).max(200).trim().optional(),
  description: z.string().max(2000).optional(),
  maxPlayers: z.number().min(2).max(1024).optional(),
  startDate: z.string().transform((str) => new Date(str)).optional(),
  registrationDeadline: z.string().transform((str) => new Date(str)).optional(),
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
  venue: z.object({
    name: z.string(),
    address: z.string(),
    coordinates: z.array(z.number()).length(2),
  }).optional(),
  rules: z.string().max(5000).optional(),
  status: z.enum(['draft', 'registration', 'active', 'completed', 'cancelled']).optional(),
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

  if (!requiredRoles.includes('any')) {
    throw new Error('Insufficient permissions');
  }

  return { tournament, role: 'participant' };
}

// GET /api/tournaments/[id] - Get tournament details
export async function GET(request: AuthRequest): Promise<ExpoResponse> {
  return new Promise((resolve) => {
    optionalAuth(request, new ExpoResponse(), async () => {
      try {
        const url = new URL(request.url!);
        const tournamentId = url.pathname.split('/').pop();

        if (!tournamentId) {
          resolve(ExpoResponse.json(
            { error: 'Tournament ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Get tournament with detailed information
        const tournamentPipeline = [
          { $match: { _id: tournamentId } },
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
            $lookup: {
              from: 'tournamentplayers',
              localField: '_id',
              foreignField: 'tournament',
              as: 'players',
            },
          },
          {
            $lookup: {
              from: 'tournamentrounds',
              localField: '_id',
              foreignField: 'tournament',
              as: 'rounds',
            },
          },
          {
            $addFields: {
              organizer: { $arrayElemAt: ['$organizer', 0] },
              club: { $arrayElemAt: ['$club', 0] },
              currentPlayers: { $size: '$players' },
              playersData: '$players',
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
              endDate: 1,
              registrationDeadline: 1,
              entryFee: 1,
              prizes: 1,
              settings: 1,
              venue: 1,
              rules: 1,
              currentRound: 1,
              totalRounds: 1,
              isLive: 1,
              stats: 1,
              organizer: {
                _id: 1,
                name: 1,
                avatar: 1,
                email: 1,
              },
              club: {
                _id: 1,
                name: 1,
                username: 1,
                logoUrl: 1,
              },
              playersData: {
                _id: 1,
                player: 1,
                seed: 1,
                rating: 1,
                status: 1,
                stats: 1,
                registeredAt: 1,
              },
              rounds: {
                _id: 1,
                roundNumber: 1,
                name: 1,
                status: 1,
                startTime: 1,
                endTime: 1,
                isElimination: 1,
              },
              bracket: 1,
              createdAt: 1,
              updatedAt: 1,
            },
          },
        ];

        const tournaments = await Tournament.aggregate(tournamentPipeline);
        const tournament = tournaments[0];

        if (!tournament) {
          resolve(ExpoResponse.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
          return;
        }

        // Check if user can view this tournament
        if (tournament.status === 'draft' && request.user) {
          try {
            await checkTournamentPermissions(tournamentId, request.user.id, ['organizer', 'club-admin']);
          } catch {
            resolve(ExpoResponse.json(
              { error: 'Tournament not found' },
              { status: 404 }
            ));
            return;
          }
        }

        // Populate player details
        if (tournament.playersData?.length > 0) {
          await Tournament.populate(tournament, {
            path: 'playersData.player',
            select: 'name avatar rating',
          });
        }

        // Get user's registration status if authenticated
        let userRegistration = null;
        let permissions = {
          canEdit: false,
          canDelete: false,
          canRegister: false,
          canManagePlayers: false,
          canStartTournament: false,
        };

        if (request.user) {
          userRegistration = await TournamentPlayer.findOne({
            tournament: tournamentId,
            player: request.user.id,
          });

          // Check permissions
          try {
            const { role } = await checkTournamentPermissions(
              tournamentId, 
              request.user.id, 
              ['organizer', 'club-admin', 'any']
            );

            if (role === 'organizer') {
              permissions = {
                canEdit: true,
                canDelete: true,
                canRegister: false,
                canManagePlayers: true,
                canStartTournament: true,
              };
            } else if (role === 'club-admin') {
              permissions = {
                canEdit: tournament.status === 'draft',
                canDelete: false,
                canRegister: false,
                canManagePlayers: true,
                canStartTournament: false,
              };
            } else {
              permissions.canRegister = 
                tournament.status === 'registration' && 
                tournament.currentPlayers < tournament.maxPlayers &&
                new Date() < tournament.registrationDeadline &&
                !userRegistration;
            }
          } catch {
            // User has no special permissions
            permissions.canRegister = 
              tournament.status === 'registration' && 
              tournament.currentPlayers < tournament.maxPlayers &&
              new Date() < tournament.registrationDeadline &&
              !userRegistration;
          }
        }

        // Get recent matches for live tournaments
        let recentMatches = [];
        if (tournament.isLive) {
          recentMatches = await TournamentMatch.find({
            tournament: tournamentId,
            status: { $in: ['in_progress', 'completed'] },
          })
          .populate('player1 player2', 'name avatar')
          .sort({ updatedAt: -1 })
          .limit(10)
          .lean();
        }

        resolve(ExpoResponse.json({
          tournament,
          userRegistration,
          permissions,
          recentMatches,
        }));
      } catch (error) {
        console.error('Get tournament error:', error);
        resolve(ExpoResponse.json(
          { error: 'Failed to fetch tournament' },
          { status: 500 }
        ));
      }
    });
  });
}

// PUT /api/tournaments/[id] - Update tournament
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
        const tournamentId = url.pathname.split('/').pop();

        if (!tournamentId) {
          resolve(ExpoResponse.json(
            { error: 'Tournament ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Check permissions
        const { tournament } = await checkTournamentPermissions(
          tournamentId, 
          request.user.id, 
          ['organizer', 'club-admin']
        );

        // Prevent editing active tournaments (except status changes)
        const body = await request.json();
        const validatedData = updateTournamentSchema.parse(body);

        if (tournament.status === 'active' && Object.keys(validatedData).some(key => 
          key !== 'status' && key !== 'settings'
        )) {
          resolve(ExpoResponse.json(
            { error: 'Cannot modify active tournament details' },
            { status: 400 }
          ));
          return;
        }

        // Validate status transitions
        if (validatedData.status) {
          const validTransitions: Record<string, string[]> = {
            'draft': ['registration', 'cancelled'],
            'registration': ['active', 'cancelled'],
            'active': ['completed', 'cancelled'],
            'completed': [],
            'cancelled': [],
          };

          if (!validTransitions[tournament.status]?.includes(validatedData.status)) {
            resolve(ExpoResponse.json(
              { error: `Cannot change status from ${tournament.status} to ${validatedData.status}` },
              { status: 400 }
            ));
            return;
          }

          // Special validation for starting tournament
          if (validatedData.status === 'active') {
            const playerCount = await TournamentPlayer.countDocuments({
              tournament: tournamentId,
              status: { $in: ['registered', 'checked_in'] },
            });

            if (playerCount < 2) {
              resolve(ExpoResponse.json(
                { error: 'Need at least 2 players to start tournament' },
                { status: 400 }
              ));
              return;
            }

            // Auto-generate first round when starting
            validatedData.isLive = true;
            validatedData.currentRound = 1;
          }
        }

        // Update tournament
        const updatedTournament = await Tournament.findByIdAndUpdate(
          tournamentId,
          { ...validatedData, updatedAt: new Date() },
          { new: true, runValidators: true }
        ).populate([
          { path: 'organizer', select: 'name avatar email' },
          { path: 'club', select: 'name username logoUrl' },
        ]);

        if (!updatedTournament) {
          resolve(ExpoResponse.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
          return;
        }

        // TODO: Send WebSocket updates to connected clients
        // TODO: Generate first round if tournament was started

        resolve(ExpoResponse.json({
          tournament: updatedTournament.toJSON(),
          message: 'Tournament updated successfully',
        }));
      } catch (error) {
        if (error instanceof z.ZodError) {
          resolve(ExpoResponse.json(
            { error: 'Validation failed', details: error.errors },
            { status: 400 }
          ));
          return;
        }

        console.error('Update tournament error:', error);
        if (error.message === 'Tournament not found') {
          resolve(ExpoResponse.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'You do not have permission to edit this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to update tournament' },
            { status: 500 }
          ));
        }
      }
    });
  });
}

// DELETE /api/tournaments/[id] - Cancel/Delete tournament
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
        const tournamentId = url.pathname.split('/').pop();

        if (!tournamentId) {
          resolve(ExpoResponse.json(
            { error: 'Tournament ID is required' },
            { status: 400 }
          ));
          return;
        }

        await connectDB();

        // Check permissions (only organizer can delete)
        const { tournament } = await checkTournamentPermissions(
          tournamentId,
          request.user.id,
          ['organizer']
        );

        const body = await request.json().catch(() => ({}));
        const { permanent = false, reason } = body;

        if (permanent && tournament.status === 'draft') {
          // Permanent deletion for draft tournaments
          await Promise.all([
            Tournament.findByIdAndDelete(tournamentId),
            TournamentPlayer.deleteMany({ tournament: tournamentId }),
            TournamentRound.deleteMany({ tournament: tournamentId }),
            TournamentMatch.deleteMany({ tournament: tournamentId }),
          ]);

          resolve(ExpoResponse.json({
            message: 'Tournament deleted permanently',
          }));
        } else {
          // Soft delete - mark as cancelled
          const updatedTournament = await Tournament.findByIdAndUpdate(
            tournamentId,
            {
              status: 'cancelled',
              isLive: false,
              cancellationReason: reason,
            },
            { new: true }
          );

          // TODO: Send cancellation notifications to all participants
          // TODO: Send WebSocket updates

          resolve(ExpoResponse.json({
            tournament: updatedTournament,
            message: 'Tournament cancelled successfully',
          }));
        }
      } catch (error) {
        console.error('Delete tournament error:', error);
        if (error.message === 'Tournament not found') {
          resolve(ExpoResponse.json(
            { error: 'Tournament not found' },
            { status: 404 }
          ));
        } else if (error.message === 'Insufficient permissions') {
          resolve(ExpoResponse.json(
            { error: 'Only the tournament organizer can delete this tournament' },
            { status: 403 }
          ));
        } else {
          resolve(ExpoResponse.json(
            { error: 'Failed to delete tournament' },
            { status: 500 }
          ));
        }
      }
    });
  });
}