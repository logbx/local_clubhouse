import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Tournament, ITournament, ITournamentPlayer, ITournamentMatch, ITournamentRound, TournamentType } from '../models/tournament.model';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateTournamentDto, AddGuestPlayerDto, RemovePlayerDto, ReportResultDto, ConfirmResultDto, OverrideResultDto, TournamentPlayerDto } from './dto/tournament.dto';
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
  async submitMatchResult(submitResultDto: any, submitterId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(submitResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === submitResultDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    if (match.status !== 'pending') {
      throw new BadRequestException('Match result has already been submitted');
    }

    // Validate that the submitter is authorized
    const isOrganizer = tournament.organizerId.toString() === submitterId;
    const isPlayer = match.player1.id === submitterId || match.player2.id === submitterId;
    const hasGuestPlayer = match.player1.isGuest || match.player2.isGuest;
    const bothGuests = match.player1.isGuest && match.player2.isGuest;
    
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

    match.winnerId = submitResultDto.winnerId;
    match.loserId = submitResultDto.loserId;
    // Guest matches need organizer confirmation, so they stay 'submitted' unless organizer submits directly
    match.status = (hasGuestPlayer && !isOrganizer) ? 'submitted' : (hasGuestPlayer ? 'completed' : 'submitted');
    match.resultReportedBy = [submitterId];
    match.notes = submitResultDto.notes;

    // Save the match result first
    await tournament.save();

    // If match is completed (organizer submitted or auto-completed), trigger advancement
    if (match.status === 'completed') {
      const updatedTournament = await this.baseTournamentService.reportMatchResult({
        tournamentId: submitResultDto.tournamentId,
        matchId: submitResultDto.matchId,
        winnerId: submitResultDto.winnerId,
        loserId: submitResultDto.loserId,
        reporterId: submitterId,
        tournament: tournament
      });
      return updatedTournament;
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
      tournamentId: resolveDisputeDto.tournamentId,
      matchId: resolveDisputeDto.matchId,
      winnerId: resolveDisputeDto.winnerId,
      loserId: resolveDisputeDto.loserId,
      reporterId: resolverId,
      tournament: tournament
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

    const updatedTournament = await tournament.save();

    // The base tournament service handles advancement automatically

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
    } else if (hasGuestPlayer) {
      // For guest matches, only organizer can confirm (handled above)
      throw new ForbiddenException('Only the tournament organizer can confirm results for matches with guest players');
    } else {
      // For regular matches, validate that the confirmer is a player in the match (not the one who submitted)
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
      tournamentId: confirmMatchResultDto.tournamentId,
      matchId: confirmMatchResultDto.matchId,
      winnerId: match.winnerId,
      loserId: match.loserId,
      reporterId: confirmerId,
      tournament: tournament
    });

    return updatedTournament;
  }

  async overrideResult(overrideResultDto: OverrideResultDto, organizerId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(overrideResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== organizerId) {
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

    // Handle different result types
    if (overrideResultDto.result === 'draw') {
      match.result = 'draw';
      match.winnerId = undefined;
      match.loserId = undefined;
    } else {
      match.winnerId = overrideResultDto.winnerId;
      match.loserId = overrideResultDto.loserId;
      match.result = overrideResultDto.result;
    }
    
    match.status = 'completed';
    match.overriddenBy = organizerId;
    match.overrideReason = overrideResultDto.reason;

    // Save the match result first
    await tournament.save();

    // Now trigger tournament advancement through the base service
    const reportOptions: any = {
      tournamentId: overrideResultDto.tournamentId,
      matchId: overrideResultDto.matchId,
      reporterId: organizerId,
      tournament: tournament
    };

    // Only add winnerId/loserId if it's not a draw
    if (overrideResultDto.result === 'draw') {
      reportOptions.result = 'draw';
      reportOptions.isDraw = true;
    } else {
      reportOptions.winnerId = overrideResultDto.winnerId;
      reportOptions.loserId = overrideResultDto.loserId;
      reportOptions.result = overrideResultDto.result;
    }

    const updatedTournament = await this.baseTournamentService.reportMatchResult(reportOptions);

    return updatedTournament;
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
   * Repair tournament advancement by fixing completed rounds and triggering advancement
   */
  async repairTournamentAdvancement(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🔧 Repairing tournament advancement:', {
      id: tournament._id,
      type: tournament.type,
      isStarted: tournament.isStarted,
      roundCount: tournament.rounds.length,
      currentRound: tournament.currentRound
    });

    const strategy = this.strategyFactory.getStrategy(tournament.type);
    let repairMade = false;

    // Check each round for completion issues
    for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex++) {
      const round = tournament.rounds[roundIndex];
      
      console.log(`🔍 Checking round ${round.roundNumber}:`, {
        totalMatches: round.matches.length,
        completedMatches: round.matches.filter(m => m.status === 'completed').length,
        roundIsComplete: round.isComplete
      });

      // Check if all matches are completed but round is not marked complete
      const allMatchesComplete = round.matches.every(m => m.status === 'completed');
      
      if (allMatchesComplete && !round.isComplete) {
        console.log(`🔧 Fixing round ${round.roundNumber} - marking as complete`);
        round.isComplete = true;
        repairMade = true;

        // For Swiss tournaments, recalculate player scores from completed matches
        if (tournament.type === 'swiss') {
          console.log('🔧 Recalculating Swiss tournament player scores...');
          
          // Reset all player scores first
          tournament.players.forEach(player => {
            player.points = 0;
            player.wins = 0;
            player.pastOpponents = [];
          });

          // Recalculate scores from all completed matches
          for (const r of tournament.rounds) {
            for (const match of r.matches) {
              if (match.status === 'completed') {
                const player1 = tournament.players.find(p => p.id === match.player1.id);
                const player2 = tournament.players.find(p => p.id === match.player2.id);

                if (player1 && player2) {
                  // Handle different match results
                  if (match.result === 'draw' || (!match.winnerId && !match.loserId && match.result !== 'forfeit')) {
                    // Draw: both players get 0.5 points
                    player1.points = (player1.points || 0) + 0.5;
                    player2.points = (player2.points || 0) + 0.5;
                    console.log(`🤝 Draw processed: ${player1.name} vs ${player2.name} (0.5 points each)`);
                  } else if (match.winnerId && match.loserId) {
                    // Win/Loss: winner gets 1 point
                    const winner = match.winnerId === player1.id ? player1 : player2;
                    const loser = match.loserId === player1.id ? player1 : player2;
                    winner.points = (winner.points || 0) + 1;
                    winner.wins = (winner.wins || 0) + 1;
                    console.log(`🏆 Win processed: ${winner.name} beat ${loser.name} (1 point)`);
                  }

                  // Update past opponents for all completed matches
                  if (!player1.pastOpponents?.includes(player2.id)) {
                    player1.pastOpponents = [...(player1.pastOpponents || []), player2.id];
                  }
                  if (!player2.pastOpponents?.includes(player1.id)) {
                    player2.pastOpponents = [...(player2.pastOpponents || []), player1.id];
                  }
                }
              }
            }
          }
          console.log('✅ Player scores recalculated');
        }
      }

      // Check advancement for all completed rounds (whether just fixed or already complete)
      if (allMatchesComplete && round.isComplete) {
        console.log('🔄 Checking advancement for completed round...');
        const advancementResult = strategy.checkAdvancement(tournament, round.roundNumber);
        
        if (advancementResult.shouldAdvance && advancementResult.nextRound) {
          // For single elimination tournaments, we need to populate the next round
          if (tournament.type === 'single_elimination') {
            const nextRound = tournament.rounds.find(r => r.roundNumber === round.roundNumber + 1);
            if (nextRound) {
              // Check if the next round still has TBD placeholders
              const hasTBDPlayers = nextRound.matches.some(match => 
                match.player1.id === 'TBD' || match.player2.id === 'TBD'
              );
              
              if (hasTBDPlayers) {
                // Update existing matches with real players instead of creating new ones
                console.log('🔧 Updating next round with winners from completed round');
                const newMatches = advancementResult.nextRound.matches;
                
                // Preserve existing match IDs and update player data
                for (let i = 0; i < Math.min(nextRound.matches.length, newMatches.length); i++) {
                  const existingMatch = nextRound.matches[i];
                  const newMatch = newMatches[i];
                  
                  // Keep the original match ID but update player information
                  existingMatch.player1 = newMatch.player1;
                  existingMatch.player2 = newMatch.player2;
                  existingMatch.status = newMatch.status;
                  
                  console.log(`🔧 Updated match ${existingMatch.matchId}: ${newMatch.player1.name} vs ${newMatch.player2.name}`);
                }
                
                nextRound.byePlayers = advancementResult.nextRound.byePlayers;
                repairMade = true;
              }
            }
          } else if (roundIndex === tournament.rounds.length - 1) {
            // For Swiss tournaments, only add new rounds if this is the last round
            console.log('🚀 Adding next round automatically');
            tournament.rounds.push(advancementResult.nextRound);
            tournament.currentRound = (tournament.currentRound || 1) + 1;
            repairMade = true;
          }
        } else if (advancementResult.isComplete) {
          console.log('🏁 Tournament is complete');
          tournament.isFinished = true;
          tournament.winnerId = advancementResult.winnerId;
          repairMade = true;
        }
      }
    }

    if (repairMade) {
      console.log('💾 Saving repaired tournament...');
      const savedTournament = await tournament.save();
      
      // Broadcast the repair
      this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
        type: 'tournament-repaired',
        tournamentId: tournamentId,
        rounds: savedTournament.rounds,
        currentRound: savedTournament.currentRound,
        message: 'Tournament advancement repaired'
      });

      console.log('✅ Tournament advancement repaired successfully');
      return savedTournament;
    } else {
      console.log('ℹ️ No advancement issues found');
      return tournament;
    }
  }
} 