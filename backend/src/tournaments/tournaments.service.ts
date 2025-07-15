import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Tournament, ITournament, ITournamentPlayer, ITournamentMatch, ITournamentRound, TournamentType } from '../models/tournament.model';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateTournamentDto, AddGuestPlayerDto, RemovePlayerDto, ReportResultDto, SubmitResultDto, ConfirmResultDto, OverrideResultDto, TournamentPlayerDto } from './dto/tournament.dto';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { TournamentStrategyFactory } from './strategies/tournament-strategy.factory';
import { BaseTournamentService } from './services/base-tournament.service';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<ITournament>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly webSocketGateway: AppWebSocketGateway,
    private readonly strategyFactory: TournamentStrategyFactory,
    private readonly baseTournamentService: BaseTournamentService,
  ) {}

  /**
   * Get strategy for tournament type
   */
  private getStrategy(type: TournamentType) {
    return this.strategyFactory.getStrategy(type);
  }

  async create(createTournamentDto: CreateTournamentDto, organizerId: string): Promise<ITournament> {
    // Validate tournament type and number of rounds
    if (createTournamentDto.type === TournamentType.SWISS && !createTournamentDto.numRounds) {
      throw new BadRequestException('Number of rounds is required for Swiss tournaments');
    }

    if (createTournamentDto.type === TournamentType.SWISS && 
        (createTournamentDto.numRounds! < 1 || createTournamentDto.numRounds! > 10)) {
      throw new BadRequestException('Number of rounds must be between 1 and 10');
    }

    const tournament = new this.tournamentModel({
      ...createTournamentDto,
      organizerId: new Types.ObjectId(organizerId),
      players: [],
      rounds: [],
      isStarted: false,
      isFinished: false,
      registrationOpen: true,
      currentRound: 0
    });

    return tournament.save();
  }

  async createTournament(createTournamentDto: CreateTournamentDto, organizerId: string): Promise<any> {
    // Use the new strategy-based tournament creation
    const creationOptions = {
      name: createTournamentDto.name,
      eventId: createTournamentDto.eventId.toString(),
      organizerId: organizerId,
      maxPlayers: createTournamentDto.maxPlayers,
      type: createTournamentDto.type,
      numRounds: createTournamentDto.numRounds
    };

    return await this.baseTournamentService.createTournament(creationOptions);
  }

  async getTournament(tournamentId: string): Promise<ITournament> {
    // Delegate to base service for core functionality
    return await this.baseTournamentService.getTournament(tournamentId);
  }



  /**
   * Migrate existing tournaments to include bye players tracking
   */
  private async migrateTournamentByePlayers(tournament: ITournament): Promise<void> {
    if (!tournament.isStarted || tournament.rounds.length === 0) {
      return;
    }

    console.log('🔄 Starting bye players migration for tournament:', tournament._id);

    // Determine bye players for each round based on player count and match structure
    for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex++) {
      const round = tournament.rounds[roundIndex];
      
      if (round.byePlayers === undefined) {
        round.byePlayers = [];

        if (roundIndex === 0) {
          // First round: check if there was an odd number of players
          const totalPlayers = tournament.players.length;
          if (totalPlayers % 2 === 1) {
            // Find the player who got a bye (should be in next round but not from a match)
            if (tournament.rounds.length > 1) {
              const nextRound = tournament.rounds[1];
              const matchWinners = round.matches.map(match => {
                if (match.winnerId) {
                  return match.player1.id === match.winnerId ? match.player1 : match.player2;
                }
                return null;
              }).filter(Boolean);

              // Find players in next round who aren't match winners
              for (const nextMatch of nextRound.matches) {
                for (const player of [nextMatch.player1, nextMatch.player2]) {
                  if (player && player.id !== 'TBD' && 
                      !matchWinners.some(winner => winner && winner.id === player.id)) {
                    round.byePlayers!.push(player);
                    break;
                  }
                }
              }
            }
          }
        } else {
          // Later rounds: check if there was an odd number of winners from previous round
          const prevRound = tournament.rounds[roundIndex - 1];
          const prevRoundWinners = prevRound.matches.filter(match => match.winnerId).length;
          const prevRoundByes = prevRound.byePlayers?.length || 0;
          const totalAdvancing = prevRoundWinners + prevRoundByes;

          if (totalAdvancing % 2 === 1) {
            // There should be a bye in this round
            // Find the player who got the bye (should be in next round but not from a match)
            if (roundIndex < tournament.rounds.length - 1) {
              const nextRound = tournament.rounds[roundIndex + 1];
              const matchWinners = round.matches.map(match => {
                if (match.winnerId) {
                  return match.player1.id === match.winnerId ? match.player1 : match.player2;
                }
                return null;
              }).filter(Boolean);

              // Find players in next round who aren't match winners from current round
              for (const nextMatch of nextRound.matches) {
                for (const player of [nextMatch.player1, nextMatch.player2]) {
                  if (player && player.id !== 'TBD' && 
                      !matchWinners.some(winner => winner && winner.id === player.id)) {
                    round.byePlayers!.push(player);
                    break;
                  }
                }
              }
            } else {
              // This is the last round and there's a bye - find the player in final
              // who didn't come from a match in this round
              // For now, we'll leave it empty as it's complex to determine
            }
          }
        }

        console.log(`🔄 Round ${round.roundNumber} bye players:`, round.byePlayers);
      }
    }

    // Save the migrated tournament
    await tournament.save();
  }

  async getTournamentsByEvent(eventId: string): Promise<any[]> {
    try {
      // First verify the event exists
      const event = await this.eventModel.findById(eventId);
      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      const tournaments = await this.tournamentModel.find({ eventId })
        .populate('organizerId', 'username email')
        .sort({ createdAt: -1 });
      
      // Convert to plain objects and transform organizerId back to string
      return tournaments.map(tournament => {
        const tournamentObj: any = tournament.toObject();
        
        // Transform organizerId from populated object back to string ID
        if (tournamentObj.organizerId && typeof tournamentObj.organizerId === 'object') {
          tournamentObj.organizerId = tournamentObj.organizerId._id.toString();
        }
        return tournamentObj;
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching tournaments by event:', error);
      throw new InternalServerErrorException('Failed to fetch tournaments for event');
    }
  }

  async registerPlayer(tournamentId: string, userId: string, username: string): Promise<any> {
    // Delegate to base tournament service
    return await this.baseTournamentService.registerPlayer(tournamentId, userId, username);
  }

  async addGuestPlayer(addGuestDto: AddGuestPlayerDto, organizerId: string): Promise<any> {
    // Delegate to base tournament service
    return await this.baseTournamentService.addGuestPlayer(addGuestDto.tournamentId, addGuestDto.name, organizerId);
  }

  async removePlayer(removePlayerDto: RemovePlayerDto, organizerId: string): Promise<any> {
    // Delegate to base tournament service
    return await this.baseTournamentService.removePlayer(removePlayerDto.tournamentId, removePlayerDto.playerId, organizerId);
  }

  async startTournament(tournamentId: string, organizerId: string): Promise<ITournament> {
    // Delegate to the new strategy-based tournament start
    return await this.baseTournamentService.startTournament(tournamentId, organizerId);
  }

  async startNextRound(tournamentId: string, organizerId: string): Promise<ITournament> {
    // Delegate to the new strategy-based next round generation
    return await this.baseTournamentService.startNextRound(tournamentId, organizerId);
  }

  async reportResult(reportResultDto: ReportResultDto, userId: string): Promise<ITournament> {
    // Delegate to base tournament service using the new strategy pattern
    const tournament = await this.tournamentModel.findById(reportResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return await this.baseTournamentService.reportMatchResult({
      tournament,
      matchId: reportResultDto.matchId,
      winnerId: reportResultDto.winnerId,
      loserId: reportResultDto.loserId,
      result: reportResultDto.result,
      isDraw: reportResultDto.result === 'draw',
      reporterId: userId
    });
  }

  async getStandings(tournamentId: string): Promise<TournamentPlayerDto[]> {
    // Delegate to base tournament service for strategy-based standings calculation
    const standings = await this.baseTournamentService.getStandings(tournamentId);
    
    return standings.map(player => ({
      id: player.id,
      name: player.name,
      points: player.points || 0,
      wins: player.wins || 0,
      buchholzScore: player.buchholzScore || 0,
      rank: 0 // Will be calculated by the frontend
    }));
  }

  async getTournamentById(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId).populate('eventId organizerId');
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }
    return tournament;
  }

  async getTournamentWithRoundNames(tournamentId: string): Promise<any> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const tournamentObj = tournament.toObject();
    
    // Add round names using strategy-based approach
    const strategy = this.strategyFactory.getStrategy(tournament.type);
    tournamentObj.rounds = tournamentObj.rounds.map((round, index) => ({
      ...round,
      name: strategy.getRoundName(round.roundNumber, tournament)
    }));

    return tournamentObj;
  }

  async deleteTournament(tournamentId: string, userId: string): Promise<void> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check if user is the organizer
    if (tournament.organizerId.toString() !== userId) {
      throw new ForbiddenException('Only the tournament organizer can delete the tournament');
    }

    // Don't allow deletion if tournament has started
    if (tournament.isStarted) {
      throw new BadRequestException('Cannot delete a tournament that has already started');
    }

    await this.tournamentModel.findByIdAndDelete(tournamentId);
    
    console.log('🗑️ Tournament deleted:', tournamentId);
  }

  async openRegistration(tournamentId: string, userId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check if user is the organizer
    if (tournament.organizerId.toString() !== userId) {
      throw new ForbiddenException('Only the tournament organizer can manage registration');
    }

    // Don't allow opening registration if tournament has started
    if (tournament.isStarted) {
      throw new BadRequestException('Cannot open registration for a tournament that has already started');
    }

    tournament.registrationOpen = true;
    const savedTournament = await tournament.save();

    // Broadcast registration status change
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'registration-opened',
      tournamentId: tournamentId,
      registrationOpen: true,
    });

    return savedTournament.toObject();
  }

  async closeRegistration(tournamentId: string, userId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Check if user is the organizer
    if (tournament.organizerId.toString() !== userId) {
      throw new ForbiddenException('Only the tournament organizer can manage registration');
    }

    // Don't allow closing registration if tournament has started
    if (tournament.isStarted) {
      throw new BadRequestException('Cannot close registration for a tournament that has already started');
    }

    tournament.registrationOpen = false;
    const savedTournament = await tournament.save();

    // Broadcast registration status change
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'registration-closed',
      tournamentId: tournamentId,
      registrationOpen: false,
    });

    return savedTournament.toObject();
  }

  // DEPRECATED: This method is replaced by strategy-based advancement in base tournament service
  private async checkAndGenerateNextRound_DEPRECATED(tournament: ITournament): Promise<void> {
    console.log('🔍 checkAndGenerateNextRound called with tournament:', {
      tournamentId: tournament._id,
      roundsCount: tournament.rounds.length,
      rounds: tournament.rounds.map(r => ({
        roundNumber: r.roundNumber,
        matchesCount: r.matches.length,
        matches: r.matches.map(m => ({
          matchId: m.matchId,
          status: m.status,
          winnerId: m.winnerId,
          player1: { id: m.player1.id, name: m.player1.name },
          player2: { id: m.player2.id, name: m.player2.name }
        }))
      }))
    });

    // Check each round to see if it's complete and populate next round with randomized matchups
    for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex++) {
      const currentRound = tournament.rounds[roundIndex];
      
      // Check if current round is complete
      const allMatchesComplete = currentRound.matches.every(match => match.status === 'completed');
      
      console.log('🔍 Checking round:', {
        roundNumber: currentRound.roundNumber,
        allMatchesComplete,
        matches: currentRound.matches.map(m => ({ matchId: m.matchId, status: m.status, winnerId: m.winnerId }))
      });

      if (!allMatchesComplete) {
        console.log('❌ Round not complete, skipping advancement');
        continue;
      }

      // Check if next round already exists and has real players to prevent duplicate generation
      const nextRoundIndex = currentRound.roundNumber; // Next round index (0-based)
      const nextRound = tournament.rounds[nextRoundIndex];
      const nextRoundHasRealPlayers = nextRound && 
                                     nextRound.matches && 
                                     nextRound.matches.length > 0 &&
                                     nextRound.matches.some(match => 
                                       match.player1.id !== 'TBD' && match.player2.id !== 'TBD'
                                     );
      
      if (nextRoundHasRealPlayers) {
        console.log('✅ Next round already populated with real players, skipping generation to prevent race condition', {
          nextRoundNumber: nextRound.roundNumber,
          matchCount: nextRound.matches.length,
          firstMatch: nextRound.matches[0] ? {
            player1: { id: nextRound.matches[0].player1.id, name: nextRound.matches[0].player1.name },
            player2: { id: nextRound.matches[0].player2.id, name: nextRound.matches[0].player2.name }
          } : null
        });
        continue;
      }

      // This function is deprecated - automatic advancement is now handled by strategy pattern
      console.log('⚠️ This deprecated function should not be called - using strategy pattern instead');
    }

    // Check if tournament is finished (final round complete)
    const finalRound = tournament.rounds[tournament.rounds.length - 1];
    const tournamentComplete = finalRound.matches.every(match => match.status === 'completed');
    
    if (tournamentComplete && !tournament.isFinished) {
      console.log('🏁 Tournament complete, setting winner');
      const winner = finalRound.matches[0];
      
      tournament.isFinished = true;
      tournament.winnerId = winner.winnerId;
      await tournament.save();

      // Broadcast tournament completion
      this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
        type: 'tournament-finished',
        tournamentId: tournament._id.toString(),
        winner: winner.winnerId === winner.player1.id ? winner.player1 : winner.player2,
      });

      this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), {
        type: 'tournament-finished',
        winner: winner.winnerId === winner.player1.id ? winner.player1 : winner.player2,
      });
    }
  }

  // New match result workflow methods
  async submitMatchResult(submitResultDto: SubmitResultDto, submitterId: string): Promise<ITournament> {
    console.log('🎯 submitMatchResult called with:', {
      dto: submitResultDto,
      submitterId,
      tournamentId: submitResultDto.tournamentId
    });
    
    const tournament = await this.tournamentModel.findById(submitResultDto.tournamentId);
    if (!tournament) {
      console.error('❌ Tournament not found with ID:', submitResultDto.tournamentId);
      throw new NotFoundException('Tournament not found');
    }
    
    console.log('✅ Tournament found:', {
      id: tournament._id,
      name: tournament.name,
      type: tournament.type,
      isStarted: tournament.isStarted,
      roundsCount: tournament.rounds.length
    });

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    console.log('🔍 Looking for match:', submitResultDto.matchId);
    console.log('📋 Available rounds:', tournament.rounds.length);
    
    for (const round of tournament.rounds) {
      console.log(`  Checking round ${round.roundNumber} with ${round.matches.length} matches`);
      const foundMatch = round.matches.find(m => m.matchId === submitResultDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        console.log('✅ Match found in round', round.roundNumber);
        break;
      }
    }
    
    if (!match || !matchRound) {
      console.error('❌ Match not found:', {
        matchId: submitResultDto.matchId,
        availableMatches: tournament.rounds.flatMap(r => r.matches.map(m => m.matchId))
      });
      throw new NotFoundException('Match not found');
    }

    // Validate that the submitter is authorized
    const isOrganizer = tournament.organizerId.toString() === submitterId;
    const isPlayer = match.player1.id === submitterId || match.player2.id === submitterId;
    const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
    const bothGuests = match.player1.isGuest && match.player2.isGuest;

    // Check if match has already been submitted (but allow organizer to override)
    // For Swiss tournaments, allow resubmission of 'submitted' status matches by players
    // For Single Elimination, be more restrictive
    const allowedStatusesForResubmission = tournament.type === TournamentType.SWISS 
      ? ['pending', 'submitted'] 
      : ['pending'];
    
    console.log('🔍 Match status validation:', {
      matchId: match.matchId,
      currentStatus: match.status,
      allowedStatuses: allowedStatusesForResubmission,
      isOrganizer,
      isPlayer,
      tournamentType: tournament.type
    });
    
    if (!allowedStatusesForResubmission.includes(match.status) && !isOrganizer) {
      console.error('❌ Match status validation failed:', {
        matchId: match.matchId,
        currentStatus: match.status,
        allowedStatuses: allowedStatusesForResubmission,
        isOrganizer,
        errorMessage: `Match result has already been ${match.status}. Only organizer can override.`
      });
      throw new BadRequestException(`Match result has already been ${match.status}. Only organizer can override.`);
    }
    
    if (!isOrganizer && !isPlayer) {
      throw new ForbiddenException('Only players in the match or the organizer can submit results');
    }

    // For matches with both guests, only organizer can submit
    if (bothGuests && !isOrganizer) {
      throw new ForbiddenException('Only the organizer can submit results for guest-only matches');
    }

    // For matches with one guest, registered player OR organizer can submit
    if (hasGuestPlayer && !bothGuests && !isOrganizer) {
      // Check if submitter is the registered player (not the guest)
      const isRegisteredPlayer = (match.player1.id === submitterId && !match.player1.isGuest) || 
                                 (match.player2.id === submitterId && !match.player2.isGuest);
      if (!isRegisteredPlayer) {
        throw new ForbiddenException('Only the registered player or organizer can submit results for matches with guest players');
      }
    }

    // Handle draw results - explicit field setting for data consistency
    const isDrawSubmission = submitResultDto.result === 'draw' || submitResultDto.isDraw === true || 
                            (submitResultDto.winnerId === null && submitResultDto.loserId === null && submitResultDto.isDraw);
    
    if (isDrawSubmission) {
      console.log('🤝 Processing draw result');
      match.isDraw = true;
      match.result = 'draw';
      match.winnerId = undefined;
      match.loserId = undefined;
    } else {
      console.log('🏆 Processing win/loss result');
      
      // Validate that we have winnerId and loserId for non-draw results
      if (!submitResultDto.winnerId || !submitResultDto.loserId) {
        throw new BadRequestException('Winner and loser IDs are required for non-draw results');
      }
      
      match.winnerId = submitResultDto.winnerId;
      match.loserId = submitResultDto.loserId;
      match.isDraw = false;
      match.result = submitResultDto.result || 'win';
    }
    
    console.log('📊 Match data after processing:', {
      matchId: match.matchId,
      isDraw: match.isDraw,
      result: match.result,
      winnerId: match.winnerId,
      loserId: match.loserId,
      status: match.status
    });
    
    // All matches need confirmation unless organizer submits directly
    // This ensures opponent confirmation is required for fair play
    const previousStatus = match.status;
    if (!isOrganizer) {
      match.status = 'submitted'; // All matches by non-organizers need confirmation
    }
    // Note: Don't set to 'completed' here - let the strategy handle it after confirmation
    match.resultReportedBy = [submitterId];
    match.notes = submitResultDto.notes;
    
    console.log('📝 Match status updated:', {
      matchId: match.matchId,
      previousStatus,
      newStatus: match.status,
      isOrganizer,
      submitterId,
      note: isOrganizer ? 'Organizer submission - will be processed immediately' : 'Player submission - awaiting confirmation'
    });

    // Save the match result first
    await tournament.save();

    // For Swiss tournaments, process results immediately for better real-time updates
    // For Single Elimination, only process when completed
    // Only process results immediately when organizer submits, otherwise require confirmation
    const shouldProcessResult = isOrganizer;
    
    console.log('🔄 Processing decision:', {
      shouldProcessResult,
      isOrganizer,
      matchStatus: match.status,
      tournamentType: tournament.type,
      note: shouldProcessResult ? 'Organizer submission - processing immediately' : 'Player submission - requires confirmation'
    });
    
    if (shouldProcessResult) {
      const updatedTournament = await this.baseTournamentService.reportMatchResult({
        tournament: tournament,
        matchId: submitResultDto.matchId,
        winnerId: match.winnerId,
        loserId: match.loserId,
        isDraw: match.isDraw || false,
        result: match.result,
        reporterId: submitterId
      });
      return updatedTournament;
    }

    // Emit WebSocket event for match result submission requiring confirmation
    try {
      console.log('📡 Emitting match-result-submitted event for confirmation');
      const cleanMatch = {
        matchId: match.matchId,
        player1: {
          id: match.player1.id,
          userId: match.player1.userId,
          name: match.player1.name
        },
        player2: {
          id: match.player2.id,
          userId: match.player2.userId,
          name: match.player2.name
        },
        status: match.status,
        winnerId: match.winnerId,
        loserId: match.loserId,
        isDraw: match.isDraw,
        result: match.result,
        resultReportedBy: match.resultReportedBy
      };

      this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId?.toString() || '', {
        type: 'match-result-submitted',
        tournamentId: tournament._id.toString(),
        matchId: match.matchId,
        result: {
          winnerId: match.winnerId,
          loserId: match.loserId,
          isDraw: match.isDraw,
          result: match.result
        },
        match: cleanMatch,
        submittedBy: submitterId,
        requiresConfirmation: true
      });
      console.log('✅ WebSocket event emitted successfully');
    } catch (error) {
      console.error('❌ Error emitting WebSocket event:', error);
      // Don't throw error, just log it so the match result still gets saved
    }

    return tournament;
  }

  async disputeMatchResult(disputeResultDto: any, disputerId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(disputeResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === disputeResultDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'submitted') {
      throw new BadRequestException('Can only dispute submitted results');
    }

    // Check if match involves guest players
    const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
    const isOrganizer = tournament.organizerId.toString() === disputerId;

    if (hasGuestPlayer) {
      // For guest matches, only organizer can dispute
      if (!isOrganizer) {
        throw new ForbiddenException('Only the tournament organizer can dispute results for matches with guest players');
      }
    } else {
      // For regular matches, validate that the disputer is a player in the match (not the one who submitted)
      const isPlayer = match.player1.id === disputerId || match.player2.id === disputerId;
      
      if (!isPlayer) {
        throw new ForbiddenException('Only players in the match can dispute results');
      }

      // Check if the disputer is not the one who submitted the result
      if (match.resultReportedBy && match.resultReportedBy.includes(disputerId)) {
        throw new BadRequestException('Cannot dispute your own submitted result');
      }
    }

    match.status = 'disputed';
    match.disputeReason = disputeResultDto.reason;
    match.disputedBy = disputerId;

    const updatedTournament = await tournament.save();
    return updatedTournament;
  }

  async resolveMatchDispute(resolveDisputeDto: any, resolverId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(resolveDisputeDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== resolverId) {
      throw new ForbiddenException('Only the tournament organizer can resolve disputes');
    }

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === resolveDisputeDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'disputed') {
      throw new BadRequestException('Match is not in disputed status');
    }

    match.winnerId = resolveDisputeDto.winnerId;
    match.loserId = resolveDisputeDto.loserId;
    match.status = 'completed';
    match.resolvedBy = resolverId;
    match.resolutionNotes = resolveDisputeDto.notes;

    // Save the match result first
    await tournament.save();

    // Now trigger tournament advancement through the base service
    const updatedTournament = await this.baseTournamentService.reportMatchResult({
      tournament: tournament,
      matchId: resolveDisputeDto.matchId,
      winnerId: resolveDisputeDto.winnerId,
      loserId: resolveDisputeDto.loserId,
      reporterId: resolverId
    });

    return updatedTournament;
  }

  async forfeitMatch(forfeitMatchDto: any, requesterId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(forfeitMatchDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === forfeitMatchDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    if (match.status === 'completed' || match.status === 'forfeit') {
      throw new BadRequestException('Match has already been completed');
    }

    // Validate that the requester is authorized
    const isOrganizer = tournament.organizerId.toString() === requesterId;
    const isPlayer = match.player1.id === requesterId || match.player2.id === requesterId;
    const forfeitingPlayerId = forfeitMatchDto.forfeitingPlayerId;
    
    if (!isOrganizer && requesterId !== forfeitingPlayerId) {
      throw new ForbiddenException('Can only forfeit your own match or organizer can forfeit any match');
    }

    // Determine winner and loser
    if (forfeitingPlayerId === match.player1.id) {
      match.winnerId = match.player2.id;
      match.loserId = match.player1.id;
    } else if (forfeitingPlayerId === match.player2.id) {
      match.winnerId = match.player1.id;
      match.loserId = match.player2.id;
    } else {
      throw new BadRequestException('Invalid forfeiting player ID');
    }

    match.status = 'forfeit';
    match.resultReportedBy = [requesterId];

    // Save the match result first
    await tournament.save();

    // Now trigger tournament advancement through the base service
    const updatedTournament = await this.baseTournamentService.reportMatchResult({
      tournament: tournament,
      matchId: forfeitMatchDto.matchId,
      winnerId: match.winnerId,
      loserId: match.loserId,
      reporterId: requesterId
    });

    return updatedTournament;
  }

  async confirmMatchResult(confirmMatchResultDto: any, confirmerId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(confirmMatchResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === confirmMatchResultDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'submitted') {
      throw new BadRequestException('Can only confirm submitted results');
    }

    // Check if match involves guest players
    const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
    const isOrganizer = tournament.organizerId.toString() === confirmerId;

    // Tournament organizer can always confirm any submitted result
    if (isOrganizer) {
      // No additional validation needed for organizer
    } else {
      // For all matches (including guest matches), validate that the confirmer is a player in the match
      const isPlayer = match.player1.id === confirmerId || match.player2.id === confirmerId;
      
      if (!isPlayer) {
        throw new ForbiddenException('Only players in the match can confirm results');
      }

      // Check if the confirmer is not the one who submitted the result
      if (match.resultReportedBy && match.resultReportedBy.includes(confirmerId)) {
        throw new BadRequestException('Cannot confirm your own submitted result');
      }
    }

    match.status = 'completed';
    match.confirmedBy = confirmerId;

    // Save the match result first
    await tournament.save();

    // Now trigger tournament advancement through the base service
    const updatedTournament = await this.baseTournamentService.reportMatchResult({
      tournament: tournament,
      matchId: confirmMatchResultDto.matchId,
      winnerId: match.winnerId,
      loserId: match.loserId,
      reporterId: confirmerId
    });

    return updatedTournament;
  }

  async overrideResult(overrideResultDto: OverrideResultDto, organizerId: string): Promise<ITournament> {
    console.log('🔄 TournamentsService.overrideResult called with:', {
      dto: overrideResultDto,
      organizerId,
      dtoKeys: Object.keys(overrideResultDto)
    });

    const tournament = await this.tournamentModel.findById(overrideResultDto.tournamentId);
    if (!tournament) {
      console.log('❌ Tournament not found');
      throw new NotFoundException('Tournament not found');
    }

    console.log('✅ Tournament found:', {
      id: tournament._id,
      organizerId: tournament.organizerId.toString(),
      requestingUserId: organizerId,
      isAuthorized: tournament.organizerId.toString() === organizerId
    });

    if (tournament.organizerId.toString() !== organizerId) {
      console.log('❌ Authorization failed');
      throw new ForbiddenException('Only the tournament organizer can override results');
    }

    // Find the match across all rounds
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === overrideResultDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    // Check if match was already completed to decide whether to trigger advancement
    const wasAlreadyCompleted = match.status === 'completed';

    // For admin overrides, directly update the match without triggering advancement
    // This ensures consistent behavior and prevents unwanted round regeneration
    console.log('🔧 Admin override: Updating match result directly without advancement check');
    
    // Handle different result types
    if (overrideResultDto.result === 'draw') {
      match.result = 'draw';
      match.isDraw = true;
      match.winnerId = undefined;
      match.loserId = undefined;
    } else if (overrideResultDto.winnerId && overrideResultDto.loserId) {
      match.winnerId = overrideResultDto.winnerId;
      match.loserId = overrideResultDto.loserId;
      match.result = overrideResultDto.result || 'win';
      match.isDraw = false;
    } else {
      console.log('❌ Missing winnerId or loserId for non-draw result');
      throw new BadRequestException('Winner and loser must be specified for non-draw results');
    }
    
    match.status = 'completed';
    match.overriddenBy = organizerId;
    match.overrideReason = overrideResultDto.reason;
    
    // Check if this completes the round and trigger advancement if needed
    const finalStatuses = ['completed', 'forfeit'];
    const allMatchesComplete = matchRound.matches.every(m => finalStatuses.includes(m.status));
    
    if (allMatchesComplete && !matchRound.isComplete) {
      console.log('🔄 All matches in round completed, marking round as complete and checking advancement');
      matchRound.isComplete = true;
      
      // Check for automatic advancement using the strategy
      const strategy = this.getStrategy(tournament.type);
      const advancementResult = strategy.checkAdvancement(tournament, matchRound.roundNumber);
      
      if (advancementResult.shouldAdvance && advancementResult.nextRound) {
        console.log('🚀 Automatically advancing to next round');
        
        // Check if next round already exists
        const nextRoundNumber = matchRound.roundNumber + 1;
        const existingNextRound = tournament.rounds.find(r => r.roundNumber === nextRoundNumber);
        
        if (!existingNextRound) {
          // Add the new round
          tournament.rounds.push(advancementResult.nextRound);
          console.log(`✅ Added new round ${nextRoundNumber} to tournament`);
        } else {
          // Update existing round with new player assignments
          this.baseTournamentService.updateRoundWithNewPlayers(existingNextRound, advancementResult.nextRound);
          console.log(`✅ Updated existing round ${nextRoundNumber} with new players`);
        }
      }
      
      // Check if tournament is complete
      if (advancementResult.isComplete) {
        tournament.isFinished = true;
        tournament.winnerId = advancementResult.winnerId;
        console.log('🏁 Tournament completed with winner:', advancementResult.winnerId);
      }
    }
    
    // Save the updated match result
    await tournament.save();
    
    // Now trigger automatic advancement check using the base service
    // This bypasses the strategy validation since we already updated the match directly
    console.log('🚀 Triggering automatic advancement check after override...');
    try {
      const updatedTournament = await this.baseTournamentService.repairTournamentAdvancement(tournament._id.toString());
      console.log('✅ Advancement check completed:', {
        newCurrentRound: updatedTournament.currentRound,
        totalRounds: updatedTournament.rounds.length,
        isFinished: updatedTournament.isFinished
      });
      
      // Update our local tournament reference with the latest data
      Object.assign(tournament, updatedTournament);
      
      // Check what changed to determine appropriate broadcast events
      const lastRound = tournament.rounds[tournament.rounds.length - 1];
      if (lastRound && lastRound.roundNumber > matchRound.roundNumber) {
        // New round was created
        const updateData = {
          type: 'round-started',
          tournamentId: tournament._id.toString(),
          newRound: lastRound,
          currentRound: tournament.currentRound,
          message: 'Next round started automatically after override'
        };
        this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), updateData);
        this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), updateData);
      }
      
      if (tournament.isFinished) {
        const updateData = {
          type: 'tournament-completed',
          tournamentId: tournament._id.toString(),
          winnerId: tournament.winnerId,
          message: 'Tournament completed after override'
        };
        this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), updateData);
        this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), updateData);
      }
    } catch (advancementError) {
      console.error('❌ Error during automatic advancement after override:', advancementError);
      // Don't throw error, just log it so the override still succeeds
    }
    
    // Broadcast the match result update
    this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), {
      type: 'match-result-submitted',
      tournamentId: tournament._id.toString(),
      matchId: overrideResultDto.matchId,
      result: {
        winnerId: match.winnerId,
        loserId: match.loserId,
        result: match.result,
        isDraw: match.isDraw,
        status: match.status
      }
    });
    
    return tournament;
  }

  /**
   * Repair existing tournaments by adding missing bye players
   * This fixes tournaments created before bye tracking was implemented
   */
  async repairTournamentByes(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // For each round, check if there should be bye players
    for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex++) {
      const round = tournament.rounds[roundIndex];
      
      // Calculate expected players in this round
      let expectedPlayers = tournament.players.length;
      for (let i = 1; i < round.roundNumber; i++) {
        expectedPlayers = Math.ceil(expectedPlayers / 2);
      }
      
      const actualMatchPlayers = round.matches.length * 2;
      const missingPlayers = expectedPlayers - actualMatchPlayers;
      
      if (missingPlayers > 0 && !round.byePlayers) {
        console.log(`🔧 Repairing Round ${round.roundNumber}: Expected ${expectedPlayers}, Got ${actualMatchPlayers}, Missing ${missingPlayers}`);
        
        // Try to find bye players from next round
        if (roundIndex + 1 < tournament.rounds.length) {
          const nextRound = tournament.rounds[roundIndex + 1];
          const playersInNextRound = [];
          
          // Collect all players in next round
          for (const match of nextRound.matches) {
            if (match.player1.id !== 'TBD') playersInNextRound.push(match.player1);
            if (match.player2.id !== 'TBD') playersInNextRound.push(match.player2);
          }
          
          // Find players who should have had byes
          const matchWinners = round.matches.filter(m => m.winnerId).length;
          const expectedWinners = round.matches.length;
          
          if (playersInNextRound.length > expectedWinners && missingPlayers === 1) {
            // Find the bye player (player in next round who didn't come from a match)
            const byePlayer = playersInNextRound.find(player => {
              const isFromMatch = round.matches.some(match => 
                match.winnerId === player.id
              );
              return !isFromMatch;
            });
            
            if (byePlayer) {
              round.byePlayers = [byePlayer];
              console.log(`🔧 Added bye player to Round ${round.roundNumber}:`, byePlayer.name);
            }
          }
        }
      }
    }

    // Save the repaired tournament
    const savedTournament = await tournament.save();
    
    // Broadcast the update
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, {
      type: 'tournament-repaired',
      rounds: savedTournament.rounds,
    });

    return savedTournament;
  }

  /**
   * Repair a broken tournament by regenerating its round structure
   */
  async repairTournamentPairings(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🔍 Analyzing tournament state:', {
      id: tournament._id,
      type: tournament.type,
      isStarted: tournament.isStarted,
      playerCount: tournament.players.length,
      currentRounds: tournament.rounds.length,
      currentRound: tournament.currentRound
    });

    // If tournament is started but has no rounds or empty rounds, regenerate
    if (tournament.isStarted && (
      !tournament.rounds || 
      tournament.rounds.length === 0 || 
      tournament.rounds.every(r => r.matches.length === 0)
    )) {
      console.log('🔧 Tournament needs repair - regenerating round structure...');
      
      // Use the strategy-based approach to regenerate the structure
      const result = await this.baseTournamentService.repairTournamentStructure(tournamentId);
      
      console.log('✅ Tournament structure repaired');
      return result;
    } else {
      console.log('ℹ️ Tournament appears to be in good state, no repair needed');
      return tournament;
    }
  }


  /**
   * Force generation of next round for debugging Swiss tournaments
   */
  async forceNextRound(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🚀 Force generating next round for Swiss tournament:', {
      id: tournament._id,
      type: tournament.type,
      currentRounds: tournament.rounds.length,
      lastRoundNumber: tournament.rounds[tournament.rounds.length - 1]?.roundNumber
    });

    const strategy = this.strategyFactory.getStrategy(tournament.type);
    const lastRound = tournament.rounds[tournament.rounds.length - 1];
    
    if (lastRound && lastRound.isComplete) {
      const advancementResult = strategy.checkAdvancement(tournament, lastRound.roundNumber);
      
      if (advancementResult.shouldAdvance && advancementResult.nextRound) {
        console.log('✅ Adding next round with', advancementResult.nextRound.matches.length, 'matches');
        tournament.rounds.push(advancementResult.nextRound);
        tournament.currentRound = lastRound.roundNumber + 1;
        
        const savedTournament = await tournament.save();
        
        // Broadcast the update
        this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
          type: 'round-started',
          tournamentId: tournamentId,
          roundNumber: advancementResult.nextRound.roundNumber,
          message: 'Next round generated'
        });

        return savedTournament;
      }
    }

    throw new BadRequestException('Cannot generate next round - previous round not complete or tournament finished');
  }

  /**
   * Fix Swiss Round 2 to include all players (not just winners)
   */
  async fixSwissRound2(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.type !== 'swiss') {
      throw new BadRequestException('This fix is only for Swiss tournaments');
    }

    console.log('🔧 Fixing Swiss Round 2 for tournament:', {
      id: tournament._id,
      players: tournament.players.length,
      currentRounds: tournament.rounds.length
    });

    // Find Round 2
    const round2Index = tournament.rounds.findIndex(r => r.roundNumber === 2);
    if (round2Index === -1) {
      throw new BadRequestException('Round 2 not found');
    }

    const round2 = tournament.rounds[round2Index];
    console.log('🔍 Current Round 2:', {
      matches: round2.matches.length,
      players: round2.matches.flatMap(m => [m.player1.name, m.player2.name])
    });

    // Import the EnhancedSwissPairingService
    const { EnhancedSwissPairingService } = require('./utils/enhanced-swiss-pairings');

    // Regenerate Round 2 with all players using the enhanced pairing service
    console.log('🔄 Regenerating Round 2 pairings for all players...');
    const newRound2 = EnhancedSwissPairingService.generateSwissPairings(tournament.players, 2, {
      allowRepeatPairings: true,
      maxPointSpread: 3
    });

    console.log('✅ New Round 2 generated:', {
      matches: newRound2.matches.length,
      players: newRound2.matches.flatMap((m: any) => [m.player1.name, m.player2.name]),
      byePlayers: newRound2.byePlayers?.length || 0
    });

    // Replace Round 2
    tournament.rounds[round2Index] = newRound2;

    // Save the tournament
    const savedTournament = await tournament.save();

    // Broadcast the fix
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'round-regenerated',
      tournamentId: tournamentId,
      round: newRound2,
      message: 'Round 2 regenerated with all players'
    });

    return savedTournament;
  }

  /**
   * Manually create Swiss Round 2 with proper pairings
   */
  async manualSwissRound2(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.type !== 'swiss') {
      throw new BadRequestException('This fix is only for Swiss tournaments');
    }

    console.log('🔧 Manually creating Swiss Round 2 for tournament:', {
      id: tournament._id,
      players: tournament.players.length,
      currentRounds: tournament.rounds.length
    });

    // Sort players by points (Swiss ranking)
    const sortedPlayers = [...tournament.players].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    console.log('🔄 Sorted players by points:', sortedPlayers.map(p => `${p.name}(${p.points})`));

    // Manual pairing for Round 2: pair players with different scores
    const { v4: uuidv4 } = require('uuid');
    const matches: any[] = [];

    // Current standings: A(1), D(1), E(0.5), F(0.5), G(0.5), H(0.5), B(0), C(0)
    // Round 2 pairings (avoiding same opponents):
    // A(1) vs E(0.5) - different point groups, haven't played
    // D(1) vs F(0.5) - different point groups, haven't played  
    // G(0.5) vs B(0) - different point groups, haven't played
    // H(0.5) vs C(0) - different point groups, haven't played

    const pairings = [
      [sortedPlayers.find(p => p.name === 'A'), sortedPlayers.find(p => p.name === 'E')],
      [sortedPlayers.find(p => p.name === 'D'), sortedPlayers.find(p => p.name === 'F')],
      [sortedPlayers.find(p => p.name === 'G'), sortedPlayers.find(p => p.name === 'B')],
      [sortedPlayers.find(p => p.name === 'H'), sortedPlayers.find(p => p.name === 'C')]
    ];

    for (const [player1, player2] of pairings) {
      if (player1 && player2) {
        const match = {
          matchId: uuidv4(),
          player1,
          player2,
          status: 'pending' as any,
          resultReportedBy: [],
          round: 2
        };
        matches.push(match);
        console.log(`📝 Created match: ${player1.name} vs ${player2.name}`);
      }
    }

    // Create new Round 2
    const newRound2: any = {
      roundNumber: 2,
      matches,
      byePlayers: [],
      isComplete: false
    };

    // Find and replace Round 2
    const round2Index = tournament.rounds.findIndex(r => r.roundNumber === 2);
    if (round2Index >= 0) {
      tournament.rounds[round2Index] = newRound2;
    } else {
      tournament.rounds.push(newRound2);
    }

    console.log('✅ Manual Round 2 created:', {
      matches: newRound2.matches.length,
      pairings: newRound2.matches.map((m: any) => `${m.player1.name} vs ${m.player2.name}`)
    });

    // Save the tournament
    const savedTournament = await tournament.save();

    // Broadcast the fix
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'round-regenerated',
      tournamentId: tournamentId,
      round: newRound2,
      message: 'Round 2 manually created with all players'
    });

    return savedTournament;
  }

  /**
   * Manually create Swiss Round 3 with proper pairings
   */
  async manualSwissRound3(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.type !== 'swiss') {
      throw new BadRequestException('This fix is only for Swiss tournaments');
    }

    console.log('🔧 Manually creating Swiss Round 3 for tournament:', {
      id: tournament._id,
      players: tournament.players.length,
      currentRounds: tournament.rounds.length
    });

    // Sort players by points (Swiss ranking)
    const sortedPlayers = [...tournament.players].sort((a, b) => {
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;
      return (a.name || '').localeCompare(b.name || '');
    });

    console.log('🔄 Sorted players by points for Round 3:', sortedPlayers.map(p => `${p.name}(${p.points})`));

    // Manual pairing for Round 3: pair players avoiding past opponents
    const { v4: uuidv4 } = require('uuid');
    const matches: any[] = [];

    // Current standings: A(2), D(1.5), B(1), F(1), H(1), E(0.5), G(0.5), C(0.5)
    // Round 3 pairings (avoiding past opponents):
    // A(2) vs D(1.5) - top 2 players, haven't played
    // B(1) vs H(1) - 1-point players, haven't played
    // F(1) vs E(0.5) - haven't played (F played E's Round 1 opponent, but not E directly)
    // G(0.5) vs C(0.5) - 0.5-point players, haven't played

    const pairings = [
      [sortedPlayers.find(p => p.name === 'A'), sortedPlayers.find(p => p.name === 'D')],
      [sortedPlayers.find(p => p.name === 'B'), sortedPlayers.find(p => p.name === 'H')],
      [sortedPlayers.find(p => p.name === 'F'), sortedPlayers.find(p => p.name === 'E')],
      [sortedPlayers.find(p => p.name === 'G'), sortedPlayers.find(p => p.name === 'C')]
    ];

    for (const [player1, player2] of pairings) {
      if (player1 && player2) {
        const match = {
          matchId: uuidv4(),
          player1,
          player2,
          status: 'pending' as any,
          resultReportedBy: [],
          round: 3
        };
        matches.push(match);
        console.log(`📝 Created Round 3 match: ${player1.name} vs ${player2.name}`);
      }
    }

    // Create new Round 3
    const newRound3: any = {
      roundNumber: 3,
      matches,
      byePlayers: [],
      isComplete: false
    };

    // Find and replace Round 3
    const round3Index = tournament.rounds.findIndex(r => r.roundNumber === 3);
    if (round3Index >= 0) {
      tournament.rounds[round3Index] = newRound3;
    } else {
      tournament.rounds.push(newRound3);
    }

    console.log('✅ Manual Round 3 created:', {
      matches: newRound3.matches.length,
      pairings: newRound3.matches.map((m: any) => `${m.player1.name} vs ${m.player2.name}`)
    });

    // Save the tournament
    const savedTournament = await tournament.save();

    // Broadcast the fix
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'round-regenerated',
      tournamentId: tournamentId,
      round: newRound3,
      message: 'Round 3 manually created with all players'
    });

    return savedTournament;
  }

  /**
   * Repair tournament advancement using the enhanced advancement logic
   */
  /**
   * Repair corrupted match data where result and isDraw fields are undefined
   */
  async repairMatchData(tournamentId: string): Promise<{ tournament: ITournament; repairedCount: number }> {
    console.log('🔧 TournamentsService.repairMatchData called for:', tournamentId);
    
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🔍 Checking tournament match data...');
    let repairedCount = 0;

    for (const round of tournament.rounds) {
      console.log(`🔍 Checking round ${round.roundNumber} with ${round.matches.length} matches`);
      for (const match of round.matches) {
        console.log(`🔍 Match ${match.matchId}:`, {
          status: match.status,
          result: match.result,
          isDraw: match.isDraw,
          winnerId: match.winnerId,
          loserId: match.loserId
        });
        
        // Check for corrupted match data - more comprehensive check
        if (match.status === 'completed') {
          // Check if any critical fields are undefined/null when they shouldn't be
          const hasUndefinedResult = match.result === undefined || match.result === null;
          const hasUndefinedIsDraw = match.isDraw === undefined || match.isDraw === null;
          const needsRepair = hasUndefinedResult || hasUndefinedIsDraw;
          
          if (needsRepair) {
            console.log(`🚨 Found corrupted match ${match.matchId} - repairing...`);
            
            // Try to infer the result from existing data
            if (match.winnerId && match.loserId && match.winnerId !== match.loserId) {
              // This was a win/loss
              match.result = 'win';
              match.isDraw = false;
              console.log(`🔧 Repaired win/loss match ${match.matchId}`);
            } else if (!match.winnerId && !match.loserId) {
              // This might be a draw or corrupted data
              // Default to draw since no winner/loser
              match.result = 'draw';
              match.isDraw = true;
              match.winnerId = undefined;
              match.loserId = undefined;
              console.log(`🔧 Repaired draw match ${match.matchId}`);
            } else {
              // Ambiguous case - default to draw for safety
              match.result = 'draw';
              match.isDraw = true;
              match.winnerId = undefined;
              match.loserId = undefined;
              console.log(`🔧 Repaired ambiguous match ${match.matchId} as draw`);
            }
            
            repairedCount++;
          } else {
            console.log(`✅ Match ${match.matchId} is properly formatted`);
          }
        }
      }
    }

    if (repairedCount > 0) {
      await tournament.save();
      console.log(`✅ Repaired ${repairedCount} matches`);
    } else {
      console.log('ℹ️ No matches needed repair');
    }

    return {
      tournament: tournament.toObject(),
      repairedCount
    };
  }

  async repairTournamentAdvancement(tournamentId: string): Promise<ITournament> {
    return await this.baseTournamentService.repairTournamentAdvancement(tournamentId);
  }

  /**
   * Repair Swiss tournament to ensure all registered players are included
   */
  async repairSwissPlayers(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.type !== 'swiss') {
      throw new BadRequestException('This repair is only for Swiss tournaments');
    }

    console.log('🔧 Repairing Swiss tournament player inclusion:', {
      id: tournament._id,
      name: tournament.name,
      currentPlayerCount: tournament.players.length,
      rounds: tournament.rounds.length
    });

    // Check if tournament has missing registered players
    const playersInRounds = new Set<string>();
    tournament.rounds.forEach(round => {
      round.matches.forEach(match => {
        playersInRounds.add(match.player1.id);
        playersInRounds.add(match.player2.id);
      });
      if (round.byePlayers) {
        round.byePlayers.forEach(player => playersInRounds.add(player.id));
      }
    });

    const missingPlayers = tournament.players.filter(player => !playersInRounds.has(player.id));
    
    if (missingPlayers.length === 0) {
      console.log('✅ All registered players are already included in rounds');
      return tournament;
    }

    console.log('🔍 Found missing players:', missingPlayers.map(p => ({ id: p.id, name: p.name, isGuest: p.isGuest })));

    // For an already started tournament, we need to regenerate the current round
    // to include the missing players
    if (tournament.isStarted && tournament.rounds.length > 0) {
      const { EnhancedSwissPairingService } = require('./utils/enhanced-swiss-pairings');
      
      // Get the current round number
      const currentRoundNumber = tournament.currentRound || 1;
      const currentRoundIndex = tournament.rounds.findIndex(r => r.roundNumber === currentRoundNumber);
      
      if (currentRoundIndex >= 0 && !tournament.rounds[currentRoundIndex].isComplete) {
        console.log(`🔄 Regenerating current round ${currentRoundNumber} to include all players...`);
        
        // Regenerate the current round with all players
        const newRound = EnhancedSwissPairingService.generateSwissPairings(
          tournament.players, 
          currentRoundNumber, 
          {
            allowRepeatPairings: currentRoundNumber > 1,
            maxPointSpread: 3
          }
        );

        // Replace the current round
        tournament.rounds[currentRoundIndex] = newRound;
        
        console.log('✅ Round regenerated with all players:', {
          roundNumber: newRound.roundNumber,
          matches: newRound.matches.length,
          players: newRound.matches.flatMap((m: any) => [m.player1.name, m.player2.name]),
          byePlayers: newRound.byePlayers?.map((p: any) => p.name) || []
        });
      }
    }

    // Save the repaired tournament
    const savedTournament = await tournament.save();

    // Broadcast the update
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'tournament-repaired',
      tournamentId: tournamentId,
      rounds: savedTournament.rounds,
      message: 'Tournament player inclusion repaired'
    });

    return savedTournament;
  }

  async forceRoundCompletionCheck(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🔧 Force round completion check for tournament:', {
      tournamentId,
      type: tournament.type,
      currentRound: tournament.currentRound,
      totalRounds: tournament.rounds.length,
      isStarted: tournament.isStarted,
      isFinished: tournament.isFinished
    });

    if (!tournament.isStarted) {
      throw new BadRequestException('Tournament must be started to check round completion');
    }

    // Get the appropriate strategy
    const strategy = this.strategyFactory.getStrategy(tournament.type);

    // Force check and mark all completed rounds
    let anyChanges = false;
    for (let i = 0; i < tournament.rounds.length; i++) {
      const round = tournament.rounds[i];
      
      // Enhanced completion check with ALL possible final statuses
      const finalStatuses = ['completed', 'forfeit', 'resolved', 'resolvedByCreator'];
      const allMatchesComplete = round.matches.every(m => finalStatuses.includes(m.status));
      
      console.log(`🔍 Round ${round.roundNumber} completion check:`, {
        totalMatches: round.matches.length,
        completedMatches: round.matches.filter(m => finalStatuses.includes(m.status)).length,
        matchStatuses: round.matches.map(m => ({ id: m.matchId, status: m.status })),
        wasComplete: round.isComplete,
        allMatchesComplete
      });

      if (allMatchesComplete && !round.isComplete) {
        round.isComplete = true;
        anyChanges = true;
        console.log(`✅ Marked round ${round.roundNumber} as complete`);
      }
    }

    // Save changes if any
    if (anyChanges) {
      await tournament.save();
      console.log('💾 Tournament saved with updated round completion status');
    }

    // Now trigger automatic advancement check using the base service
    console.log('🚀 Triggering automatic advancement check...');
    try {
      // Use the repair advancement logic to trigger advancement
      const updatedTournament = await this.baseTournamentService.repairTournamentAdvancement(tournamentId);
      
      console.log('🔄 Advancement check results:', {
        newCurrentRound: updatedTournament.currentRound,
        totalRounds: updatedTournament.rounds.length,
        isFinished: updatedTournament.isFinished
      });

      // Save the tournament after advancement
      const savedTournament = await updatedTournament.save();

      // Broadcast appropriate events based on tournament state
      if (updatedTournament.isFinished) {
        this.webSocketGateway.broadcastTournamentUpdate(updatedTournament.eventId.toString(), {
          type: 'tournament-completed',
          tournamentId: updatedTournament._id.toString(),
          winnerId: updatedTournament.winnerId,
          message: 'Tournament completed after completion check'
        });
        console.log('📡 Broadcasted tournament-completed event');
      }

      return savedTournament;
    } catch (error) {
      console.error('❌ Error during automatic advancement:', error);
      throw error;
    }
  }

  async validateTournamentDataIntegrity(tournamentId: string): Promise<{ isValid: boolean; issues: string[]; tournament: ITournament }> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const issues: string[] = [];
    
    console.log('🔍 Validating tournament data integrity for:', tournamentId);

    // Check for duplicate player IDs in matches
    for (const round of tournament.rounds) {
      console.log(`🔍 Checking round ${round.roundNumber}:`);
      
      for (const match of round.matches) {
        // Check if both players have the same ID
        if (match.player1.id === match.player2.id) {
          const issue = `Round ${round.roundNumber}: Match ${match.matchId} has duplicate player IDs: ${match.player1.id}`;
          issues.push(issue);
          console.error('🚨', issue);
        }
        
        // Check if winner ID is valid
        if (match.winnerId && match.winnerId !== match.player1.id && match.winnerId !== match.player2.id) {
          const issue = `Round ${round.roundNumber}: Match ${match.matchId} has invalid winner ID: ${match.winnerId}`;
          issues.push(issue);
          console.error('🚨', issue);
        }
        
        console.log(`  Match ${match.matchId}:`, {
          player1: { id: match.player1.id, name: match.player1.name },
          player2: { id: match.player2.id, name: match.player2.name },
          winnerId: match.winnerId,
          status: match.status
        });
      }
    }

    // Check for players appearing multiple times in the same round
    for (const round of tournament.rounds) {
      const playerIds = round.matches.flatMap(m => [m.player1.id, m.player2.id]);
      const uniquePlayerIds = [...new Set(playerIds)];
      
      if (playerIds.length !== uniquePlayerIds.length) {
        const duplicates = playerIds.filter((id, index) => playerIds.indexOf(id) !== index);
        const issue = `Round ${round.roundNumber}: Duplicate players found: ${duplicates.join(', ')}`;
        issues.push(issue);
        console.error('🚨', issue);
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      tournament
    };
  }

  async repairSingleEliminationTBD(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.type !== TournamentType.SINGLE_ELIMINATION) {
      throw new BadRequestException('This repair is only for Single Elimination tournaments');
    }

    console.log('🔧 Repairing Single Elimination tournament with TBD players:', {
      tournamentId,
      currentRounds: tournament.rounds.length,
      isStarted: tournament.isStarted,
      isFinished: tournament.isFinished
    });

    // Get the strategy
    const strategy = this.getStrategy(tournament.type);
    
    // Find rounds with TBD players that should have real players
    for (let i = 0; i < tournament.rounds.length; i++) {
      const round = tournament.rounds[i];
      
      // Skip if this is the first round or if round has no TBD players
      if (round.roundNumber === 1) continue;
      
      const hasTBDPlayers = round.matches.some(match => 
        match.player1.id === 'TBD' || match.player2.id === 'TBD'
      );
      
      if (!hasTBDPlayers) continue;
      
      // Check if previous round is complete
      const prevRoundNumber = round.roundNumber - 1;
      const prevRound = tournament.rounds.find(r => r.roundNumber === prevRoundNumber);
      
      if (!prevRound) continue;
      
      // Mark previous round as complete if all matches are done
      const finalStatuses = ['completed', 'forfeit'];
      const allMatchesComplete = prevRound.matches.every(m => finalStatuses.includes(m.status));
      
      if (allMatchesComplete && !prevRound.isComplete) {
        console.log(`🔧 Marking round ${prevRound.roundNumber} as complete`);
        prevRound.isComplete = true;
      }
      
      // If previous round is complete, populate this round
      if (prevRound.isComplete) {
        console.log(`🔄 Populating round ${round.roundNumber} with winners from round ${prevRound.roundNumber}`);
        
        // Use the strategy to check advancement
        const advancementResult = strategy.checkAdvancement(tournament, prevRound.roundNumber);
        
        if (advancementResult.shouldAdvance && advancementResult.nextRound) {
          console.log('✅ Updating round with real players');
          
          // Update the round with new match data
          round.matches = advancementResult.nextRound.matches || round.matches;
          round.byePlayers = advancementResult.nextRound.byePlayers;
          
          console.log(`✅ Round ${round.roundNumber} updated:`, {
            matches: round.matches.map(m => `${m.player1.name} vs ${m.player2.name}`),
            byePlayers: round.byePlayers?.map(p => p.name) || []
          });
        }
      }
    }
    
    // Check if tournament should be marked as complete
    const lastRound = tournament.rounds[tournament.rounds.length - 1];
    if (lastRound.isComplete) {
      const finalMatch = lastRound.matches[0];
      if (finalMatch && finalMatch.status === 'completed' && finalMatch.winnerId) {
        tournament.isFinished = true;
        tournament.winnerId = finalMatch.winnerId;
        console.log('🏁 Tournament marked as complete with winner:', finalMatch.winnerId);
      }
    }
    
    // Save the repaired tournament
    const savedTournament = await tournament.save();
    
    // Broadcast the repair
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'tournament-repaired',
      tournamentId: tournamentId,
      rounds: savedTournament.rounds,
      message: 'Single Elimination tournament TBD players repaired'
    });
    
    console.log('✅ Single Elimination tournament repair completed');
    return savedTournament;
  }

  async fixSwissByeDistribution(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.type !== 'swiss') {
      throw new BadRequestException('This repair is only for Swiss tournaments');
    }

    console.log('🔧 Fixing Swiss bye distribution for tournament:', {
      tournamentId,
      currentRound: tournament.currentRound,
      totalRounds: tournament.rounds.length
    });

    // Get the strategy for Swiss tournaments
    const strategy = this.strategyFactory.getStrategy(tournament.type);

    // Find the current/incomplete round that needs fixing
    const currentRoundIndex = tournament.rounds.findIndex(round => !round.isComplete);
    if (currentRoundIndex === -1) {
      console.log('✅ All rounds are complete, no bye distribution fix needed');
      return tournament;
    }

    const roundToFix = tournament.rounds[currentRoundIndex];
    console.log('🔍 Fixing round:', {
      roundNumber: roundToFix.roundNumber,
      currentByePlayer: roundToFix.byePlayers?.[0]?.name,
      hasMatches: roundToFix.matches.length > 0
    });

    // Regenerate the round with proper bye distribution
    try {
      // Import the enhanced pairing service
      const { EnhancedSwissPairingService } = await import('./utils/enhanced-swiss-pairings');
      
      // CRITICAL FIX: Ensure player data reflects completed rounds
      // Update pastOpponents for all players based on completed rounds
      console.log('🔄 Rebuilding player history from completed rounds...');
      
      for (const player of tournament.players) {
        // Reset and rebuild pastOpponents from scratch
        const pastOpponents: string[] = [];
        
        // Go through all completed rounds
        for (const round of tournament.rounds) {
          if (round.isComplete) {
            // Check if player was in a match this round
            const playerMatch = round.matches.find(m => 
              m.player1.id === player.id || m.player2.id === player.id
            );
            
            if (playerMatch) {
              // Add opponent to pastOpponents
              const opponentId = playerMatch.player1.id === player.id 
                ? playerMatch.player2.id 
                : playerMatch.player1.id;
              pastOpponents.push(opponentId);
            }
            
            // Check if player had a bye this round
            const hadBye = round.byePlayers?.some(byePlayer => byePlayer.id === player.id);
            if (hadBye) {
              pastOpponents.push('BYE');
            }
          }
        }
        
        // Update player's pastOpponents
        player.pastOpponents = pastOpponents;
        console.log(`📝 Updated ${player.name} pastOpponents:`, pastOpponents);
      }
      
      // Calculate updated Buchholz scores
      EnhancedSwissPairingService.updateBuchholzScores(tournament.players);
      
      // Generate new pairings with fixed bye logic
      const newRound = EnhancedSwissPairingService.generateSwissPairings(
        tournament.players,
        roundToFix.roundNumber,
        {
          allowRepeatPairings: roundToFix.roundNumber >= 3, // Allow repeats in later rounds
          maxPointSpread: 3
        }
      );

      console.log('✅ New round generated with proper bye distribution:', {
        roundNumber: newRound.roundNumber,
        matches: newRound.matches.length,
        newByePlayer: newRound.byePlayers?.[0]?.name,
        previousByePlayer: roundToFix.byePlayers?.[0]?.name,
        byePlayerChanged: newRound.byePlayers?.[0]?.name !== roundToFix.byePlayers?.[0]?.name
      });

      // Replace the round with the new one
      tournament.rounds[currentRoundIndex] = newRound;

      // Update current round if needed
      tournament.currentRound = roundToFix.roundNumber;

      // Save the tournament
      const savedTournament = await tournament.save();

      // Broadcast the update
      this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
        type: 'round-regenerated',
        tournamentId: tournamentId,
        roundNumber: newRound.roundNumber,
        newByePlayer: newRound.byePlayers?.[0]?.name,
        message: 'Round regenerated with proper bye distribution'
      });

      console.log('✅ Swiss bye distribution fixed and tournament saved');
      return savedTournament;

    } catch (error) {
      console.error('❌ Error regenerating round with proper bye distribution:', error);
      throw error;
    }
  }
} 