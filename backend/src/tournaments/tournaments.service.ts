import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject, forwardRef, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Tournament, ITournament, ITournamentPlayer, ITournamentMatch, ITournamentRound, TournamentType } from '../models/tournament.model';
import { Event, EventDocument } from '../events/schemas/event.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateTournamentDto, AddGuestPlayerDto, RemovePlayerDto, ReportResultDto, ConfirmResultDto, OverrideResultDto, TournamentPlayerDto } from './dto/tournament.dto';
import { AppWebSocketGateway } from '../websocket/websocket.gateway';
import { generateSingleEliminationBracket, shufflePlayers, calculateTotalRounds, getRoundName, populateNextRound } from './utils/generateSingleEliminationBracket';
import { generateSwissPairings, calculateStandings, processMatchResult } from './utils/generateSwissPairings';

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<ITournament>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly webSocketGateway: AppWebSocketGateway,
  ) {}

  async create(createTournamentDto: CreateTournamentDto, organizerId: string): Promise<ITournament> {
    // Validate tournament type and number of rounds
    if (createTournamentDto.type === TournamentType.SWISS && !createTournamentDto.numRounds) {
      throw new BadRequestException('Number of rounds is required for Swiss tournaments');
    }

    if (createTournamentDto.type === TournamentType.SWISS && 
        (createTournamentDto.numRounds < 1 || createTournamentDto.numRounds > 10)) {
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
    // Verify the event exists and user has permission
    const event = await this.eventModel.findById(createTournamentDto.eventId);
    
    if (!event) {
      throw new NotFoundException(`Event not found. Event ID ${createTournamentDto.eventId} does not exist in the database.`);
    }

    if (event.creator.toString() !== organizerId) {
      throw new ForbiddenException('Only the event creator can create tournaments');
    }

    // Check if event is in DRAFT status
    if (event.status === 'DRAFT') {
      throw new BadRequestException('Cannot create tournament for a draft event. Please publish the event first.');
    }

    // Validate tournament type and number of rounds
    if (createTournamentDto.type === TournamentType.SWISS && !createTournamentDto.numRounds) {
      throw new BadRequestException('Number of rounds is required for Swiss tournaments');
    }

    if (createTournamentDto.type === TournamentType.SWISS && 
        (createTournamentDto.numRounds < 1 || createTournamentDto.numRounds > 10)) {
      throw new BadRequestException('Number of rounds must be between 1 and 10');
    }

    // For single elimination, calculate the number of rounds based on maxPlayers
    if (createTournamentDto.type === TournamentType.SINGLE_ELIMINATION) {
      createTournamentDto.numRounds = Math.ceil(Math.log2(createTournamentDto.maxPlayers));
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
      registrationOpen: true,
      isStarted: false,
      isFinished: false
    });

    const savedTournament = await tournament.save();

    // Broadcast tournament creation to event participants
    this.webSocketGateway.broadcastTournamentUpdate(createTournamentDto.eventId.toString(), {
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

    // Initialize tournament based on type
    if (tournament.type === TournamentType.SINGLE_ELIMINATION) {
      // Existing single elimination logic
      const shuffledPlayers = shufflePlayers(tournament.players);
      const allRounds = generateSingleEliminationBracket(shuffledPlayers);
      tournament.rounds = allRounds;
    } else {
      // Swiss tournament initialization
      const shuffledPlayers = shufflePlayers(tournament.players);
      // Initialize player scores
      shuffledPlayers.forEach(player => {
        player.points = 0;
        player.wins = 0;
        player.buchholzScore = 0;
        player.pastOpponents = [];
      });
      // Generate first round pairings
      const firstRound = generateSwissPairings(shuffledPlayers, 1);
      tournament.rounds = [firstRound];
      tournament.currentRound = 1;
    }

    tournament.isStarted = true;
    const savedTournament = await tournament.save();

    // Broadcast tournament start
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'tournament-started',
      tournamentId: tournamentId,
      rounds: savedTournament.rounds,
      totalRounds: tournament.type === TournamentType.SINGLE_ELIMINATION 
        ? calculateTotalRounds(tournament.players.length)
        : tournament.numRounds
    });

    return savedTournament;
  }

  async reportResult(reportResultDto: ReportResultDto, userId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(reportResultDto.tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const currentRound = tournament.rounds.find(r => !r.isComplete);
    if (!currentRound) {
      throw new BadRequestException('No active round found');
    }

    const match = currentRound.matches.find(m => m.matchId === reportResultDto.matchId);
    if (!match) {
      throw new NotFoundException('Match not found');
    }

    // Validate that the user can report this result
    if (tournament.organizerId.toString() !== userId && 
        match.player1.id !== userId && 
        match.player2.id !== userId) {
      throw new ForbiddenException('You cannot report this match result');
    }

    // Update match result
    match.status = 'completed';
    match.result = reportResultDto.result;
    match.winnerId = reportResultDto.winnerId;
    match.loserId = reportResultDto.loserId;

    // Update player points for Swiss tournaments
    if (tournament.type === TournamentType.SWISS) {
      const winner = tournament.players.find(p => p.id === reportResultDto.winnerId);
      const loser = tournament.players.find(p => p.id === reportResultDto.loserId);

      if (reportResultDto.result === 'draw') {
        winner.points = (winner.points || 0) + 0.5;
        loser.points = (loser.points || 0) + 0.5;
      } else {
        winner.points = (winner.points || 0) + 1;
        winner.wins = (winner.wins || 0) + 1;
      }

      // Update past opponents
      winner.pastOpponents = [...(winner.pastOpponents || []), loser.id];
      loser.pastOpponents = [...(loser.pastOpponents || []), winner.id];
    }

    // Check if current round is complete
    const isRoundComplete = currentRound.matches.every(m => m.status === 'completed');
    if (isRoundComplete) {
      currentRound.isComplete = true;

      // For Swiss tournaments, generate next round if not finished
      if (tournament.type === TournamentType.SWISS && 
          tournament.currentRound < tournament.numRounds) {
        // Calculate Buchholz scores
        tournament.players.forEach(player => {
          player.buchholzScore = (player.pastOpponents || [])
            .map(opponentId => {
              const opponent = tournament.players.find(p => p.id === opponentId);
              return opponent ? opponent.points || 0 : 0;
            })
            .reduce((sum, score) => sum + score, 0);
        });

        // Generate next round pairings
        const nextRound = generateSwissPairings(tournament.players, tournament.currentRound + 1);
        tournament.rounds.push(nextRound);
        tournament.currentRound++;
      } else if (tournament.type === TournamentType.SWISS && 
                 tournament.currentRound === tournament.numRounds) {
        tournament.isFinished = true;
        // Set winner based on points and tiebreakers
        const winner = [...tournament.players].sort((a, b) => {
          if ((b.points || 0) !== (a.points || 0)) {
            return (b.points || 0) - (a.points || 0);
          }
          if ((b.buchholzScore || 0) !== (a.buchholzScore || 0)) {
            return (b.buchholzScore || 0) - (a.buchholzScore || 0);
          }
          return (b.wins || 0) - (a.wins || 0);
        })[0];
        tournament.winnerId = winner.id;
      }
    }

    const savedTournament = await tournament.save();

    // Broadcast result
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'match-result-reported',
      tournamentId: tournament.id,
      matchId: match.matchId,
      result: {
        winnerId: match.winnerId,
        loserId: match.loserId,
        status: match.status
      }
    });

    return savedTournament;
  }

  async getStandings(tournamentId: string): Promise<TournamentPlayerDto[]> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.type === TournamentType.SWISS) {
      return calculateStandings(tournament.players).map(player => ({
        id: player.id,
        name: player.name,
        points: player.points || 0,
        wins: player.wins || 0,
        buchholzScore: player.buchholzScore || 0,
        rank: 0 // Will be calculated by the frontend
      }));
    }

    // For single elimination, return players sorted by round elimination
    return tournament.players.map(player => ({
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