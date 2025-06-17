import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Tournament, ITournament, ITournamentPlayer, ITournamentMatch, ITournamentRound } from '../models/tournament.model';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateTournamentDto, AddGuestPlayerDto, RemovePlayerDto, ReportResultDto, ConfirmResultDto, OverrideResultDto } from './dto/tournament.dto';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { generateSingleEliminationBracket, shufflePlayers, calculateTotalRounds, getRoundName, populateNextRound } from './utils/generateSingleEliminationBracket';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<ITournament>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @Inject(forwardRef(() => AppWebSocketGateway))
    private readonly webSocketGateway: AppWebSocketGateway,
  ) {}

  async createTournament(createTournamentDto: CreateTournamentDto, organizerId: string): Promise<any> {
    // Verify the event exists and user has permission
    const event = await this.eventModel.findById(createTournamentDto.eventId);
    
    if (!event) {
      throw new NotFoundException(`Event not found. Event ID ${createTournamentDto.eventId} does not exist in the database.`);
    }

    if (event.creator.toString() !== organizerId) {
      throw new ForbiddenException('Only the event creator can create tournaments');
    }

    // Check if tournament already exists for this event
    const existingTournament = await this.tournamentModel.findOne({ eventId: createTournamentDto.eventId });
    if (existingTournament) {
      throw new BadRequestException('Tournament already exists for this event');
    }

    const tournament = new this.tournamentModel({
      ...createTournamentDto,
      organizerId: new Types.ObjectId(organizerId),
      players: [],
      rounds: [],
    });

    const savedTournament = await tournament.save();

    // Broadcast tournament creation to event participants
    this.webSocketGateway.broadcastTournamentUpdate(createTournamentDto.eventId, {
      type: 'tournament-created',
      tournamentId: savedTournament._id.toString(),
      tournament: savedTournament,
    });

    return savedTournament.toObject();
  }

  async getTournament(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId)
      .populate('players.userId', 'username email')
      .exec();
    
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Migrate existing tournaments to include bye players tracking
    let needsMigration = false;
    if (tournament.isStarted && tournament.rounds.length > 0) {
      for (const round of tournament.rounds) {
        if (round.byePlayers === undefined) {
          needsMigration = true;
          break;
        }
      }
    }

    if (needsMigration) {
      console.log('🔄 Migrating tournament to include bye players tracking:', tournament._id);
      await this.migrateTournamentByePlayers(tournament);
    }

    return tournament;
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
  }

  async registerPlayer(tournamentId: string, userId: string, username: string): Promise<any> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.isStarted) {
      throw new BadRequestException('Cannot register for a tournament that has already started');
    }

    if (!tournament.registrationOpen) {
      throw new BadRequestException('Registration is closed for this tournament');
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }

    // Check if user is already registered
    const isAlreadyRegistered = tournament.players.some(player => 
      !player.isGuest && player.userId?.toString() === userId
    );

    if (isAlreadyRegistered) {
      throw new BadRequestException('User is already registered for this tournament');
    }

    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    console.log('🔍 User data fetched for registration:', {
      userId,
      fullName: user.fullName,
      username: user.username,
      email: user.email
    });

    const player: ITournamentPlayer = {
      id: userId,
      name: user.fullName,
      fullName: user.fullName,
      username: user.username,
      userId: new Types.ObjectId(userId),
      isGuest: false,
      hasConfirmedWin: false,
      hasReported: false,
      registeredAt: new Date(),
    };

    console.log('🎯 Player object created:', player);

    tournament.players.push(player);
    const savedTournament = await tournament.save();

    // Broadcast player registration to event participants and tournament participants
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'player-registered',
      tournamentId: tournamentId,
      player: player,
      playerCount: savedTournament.players.length,
    });

    return savedTournament.toObject();
  }

  async addGuestPlayer(addGuestDto: AddGuestPlayerDto, organizerId: string): Promise<any> {
    const tournament = await this.tournamentModel.findById(addGuestDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('Only the tournament organizer can add guest players');
    }

    if (tournament.isStarted) {
      throw new BadRequestException('Cannot add players to a tournament that has already started');
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }

    const guestId = uuidv4();
    const player: ITournamentPlayer = {
      id: guestId,
      name: addGuestDto.name,
      isGuest: true,
      hasConfirmedWin: false,
      hasReported: false,
      registeredAt: new Date(),
    };

    console.log('🎯 Adding guest player:', player);

    tournament.players.push(player);
    const savedTournament = await tournament.save();

    // Broadcast guest player addition to event participants
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'guest-player-added',
      tournamentId: addGuestDto.tournamentId,
      player: player,
      playerCount: savedTournament.players.length,
    });

    console.log('✅ Guest player added successfully, returning tournament object');
    return savedTournament.toObject();
  }

  async removePlayer(removePlayerDto: RemovePlayerDto, organizerId: string): Promise<any> {
    const tournament = await this.tournamentModel.findById(removePlayerDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('Only the tournament organizer can remove players');
    }

    if (tournament.isStarted) {
      throw new BadRequestException('Cannot remove players from a tournament that has already started');
    }

    console.log('🗑️ Removing player:', removePlayerDto.playerId);

    tournament.players = tournament.players.filter(player => player.id !== removePlayerDto.playerId);
    const savedTournament = await tournament.save();

    // Broadcast player removal to event participants
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'player-removed',
      tournamentId: removePlayerDto.tournamentId,
      playerId: removePlayerDto.playerId,
      playerCount: savedTournament.players.length,
    });

    console.log('✅ Player removed successfully, returning tournament object');
    return savedTournament.toObject();
  }

  async startTournament(tournamentId: string, organizerId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('Only the tournament organizer can start the tournament');
    }

    if (tournament.isStarted) {
      throw new BadRequestException('Tournament has already started');
    }

    if (tournament.players.length < 2) {
      throw new BadRequestException('Tournament needs at least 2 players to start');
    }

    // Shuffle players and generate complete bracket
    const shuffledPlayers = shufflePlayers(tournament.players);
    const allRounds = generateSingleEliminationBracket(shuffledPlayers);
    
    tournament.rounds = allRounds;
    tournament.isStarted = true;

    const savedTournament = await tournament.save();

    // Broadcast tournament start to event participants and tournament participants
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'tournament-started',
      tournamentId: tournamentId,
      rounds: savedTournament.rounds,
      totalRounds: calculateTotalRounds(shuffledPlayers.length),
    });

    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, {
      type: 'tournament-started',
      rounds: savedTournament.rounds,
      totalRounds: calculateTotalRounds(shuffledPlayers.length),
    });

    return savedTournament;
  }

  async reportResult(reportResultDto: ReportResultDto, reporterId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(reportResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (!tournament.isStarted) {
      throw new BadRequestException('Tournament has not started yet');
    }

    if (tournament.isFinished) {
      throw new BadRequestException('Tournament has already finished');
    }

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === reportResultDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    // Enhanced duplicate submission protection
    if (match.status === 'completed') {
      console.log('⚠️ Duplicate submission blocked: Match already completed', {
        matchId: match.matchId,
        currentStatus: match.status,
        existingWinnerId: match.winnerId,
        newWinnerId: reportResultDto.winnerId,
        reporterId
      });
      throw new BadRequestException('Match has already been completed');
    }

    // Check if this exact result has already been submitted by this user
    if (match.winnerId === reportResultDto.winnerId && 
        match.loserId === reportResultDto.loserId && 
        match.resultReportedBy?.includes(reporterId)) {
      console.log('⚠️ Duplicate submission blocked: Same result already reported by this user', {
        matchId: match.matchId,
        winnerId: reportResultDto.winnerId,
        reporterId
      });
      throw new BadRequestException('You have already reported this result');
    }

    // Validate that the reporter is one of the players (unless they're the organizer)
    const isOrganizer = tournament.organizerId.toString() === reporterId;
    const isPlayer = match.player1.id === reporterId || match.player2.id === reporterId;
    
    if (!isOrganizer && !isPlayer) {
      throw new ForbiddenException('Only players in the match or the organizer can report results');
    }

    // Update match result
    match.winnerId = reportResultDto.winnerId;
    match.loserId = reportResultDto.loserId;
    match.resultReportedBy = match.resultReportedBy || [];
    
    if (!match.resultReportedBy.includes(reporterId)) {
      match.resultReportedBy.push(reporterId);
    }

    // Auto-confirm if organizer reports or if both players have reported the same result
    if (isOrganizer) {
      match.status = 'completed';
      match.confirmedBy = reporterId;
      console.log('✅ Match completed by organizer', {
        matchId: match.matchId,
        winnerId: match.winnerId,
        reporterId
      });
    } else if (match.resultReportedBy.length >= 2) {
      match.status = 'completed';
      match.confirmedBy = reporterId;
      console.log('✅ Match completed by both players', {
        matchId: match.matchId,
        winnerId: match.winnerId,
        reportedBy: match.resultReportedBy
      });
    } else {
      match.status = 'submitted';
      console.log('📝 Match result submitted, awaiting confirmation', {
        matchId: match.matchId,
        winnerId: match.winnerId,
        reporterId
      });
    }

    const updatedTournament = await tournament.save();

    // Only check for round advancement if match was completed
    if (match.status === 'completed') {
      await this.checkAndGenerateNextRound(updatedTournament);
    }

    // Broadcast match result update
    this.webSocketGateway.broadcastMatchUpdate(reportResultDto.tournamentId, {
      type: 'match-result-reported',
      matchId: reportResultDto.matchId,
      match: match,
      reportedBy: reporterId,
    }, reporterId);

    return updatedTournament;
  }

  async confirmResult(confirmResultDto: ConfirmResultDto, confirmerId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(confirmResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    // Find the match across all rounds, not just the current round
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      const foundMatch = round.matches.find(m => m.matchId === confirmResultDto.matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        break;
      }
    }
    
    if (!match || !matchRound) {
      throw new NotFoundException('Match not found');
    }

    if (match.status === 'completed') {
      throw new BadRequestException('Match has already been completed');
    }

    if (!match.winnerId || !match.loserId) {
      throw new BadRequestException('Match result has not been reported yet');
    }

    // Validate that the confirmer is one of the players or the organizer
    const isOrganizer = tournament.organizerId.toString() === confirmerId;
    const isPlayer = match.player1.id === confirmerId || match.player2.id === confirmerId;
    
    if (!isOrganizer && !isPlayer) {
      throw new ForbiddenException('Only players in the match or the organizer can confirm results');
    }

    match.status = 'completed';
    match.confirmedBy = confirmerId;

    const updatedTournament = await tournament.save();

    // Check if round is complete and generate next round
    await this.checkAndGenerateNextRound(updatedTournament);

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

    // Find the match across all rounds, not just the current round
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

    match.winnerId = overrideResultDto.winnerId;
    match.loserId = overrideResultDto.loserId;
    match.status = overrideResultDto.status || 'completed';
    match.confirmedBy = organizerId;
    match.resultReportedBy = [organizerId];

    const updatedTournament = await tournament.save();

    // Check if round is complete and generate next round
    await this.checkAndGenerateNextRound(updatedTournament);

    return updatedTournament;
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
    
    // Add round names
    tournamentObj.rounds = tournamentObj.rounds.map((round, index) => ({
      ...round,
      name: getRoundName(index + 1, tournamentObj.rounds.length)
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

  private async checkAndGenerateNextRound(tournament: ITournament): Promise<void> {
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

      // Use the new populateNextRound function that handles randomization and byes
      const result = populateNextRound(tournament, currentRound.roundNumber);
      
      if (result.shouldAdvanceToNextRound && result.nextRoundMatches) {
        console.log('🚀 Advanced winners to next round with randomized matchups');
        
        // Save the tournament after advancing this round
        await tournament.save();

        // Broadcast next round advancement
        this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
          type: 'round-completed',
          tournamentId: tournament._id.toString(),
          completedRound: currentRound,
          nextRound: tournament.rounds[currentRound.roundNumber], // Next round after current
        });

        this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), {
          type: 'round-completed',
          completedRound: currentRound,
          nextRound: tournament.rounds[currentRound.roundNumber], // Next round after current
        });
      }
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

    const updatedTournament = await tournament.save();

    // If match was completed directly (organizer submitted guest match), check for advancement
    if (match.status === 'completed') {
      await this.checkAndGenerateNextRound(updatedTournament);
    }

    return updatedTournament;
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

    const updatedTournament = await tournament.save();

    // Check if round is complete and generate next round
    await this.checkAndGenerateNextRound(updatedTournament);

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

    // Check if round is complete and generate next round
    await this.checkAndGenerateNextRound(updatedTournament);

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

    const updatedTournament = await tournament.save();

    // Check if round is complete and generate next round
    await this.checkAndGenerateNextRound(updatedTournament);

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
} 