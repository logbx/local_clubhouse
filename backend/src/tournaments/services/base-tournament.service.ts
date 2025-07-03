import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Tournament, ITournament, ITournamentPlayer, TournamentType } from '../../models/tournament.model';
import { Event, EventDocument } from '../../events/schemas/event.schema';
import { User, UserDocument } from '../../users/schemas/user.schema';
import { TournamentStrategy, TournamentCreationOptions, MatchResultOptions } from '../strategies/tournament-strategy.interface';
import { TournamentStrategyFactory } from '../strategies/tournament-strategy.factory';
import { AppWebSocketGateway } from '../../websocket/websocket.gateway';

@Injectable()
export class BaseTournamentService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<ITournament>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private readonly webSocketGateway: AppWebSocketGateway,
    private readonly strategyFactory: TournamentStrategyFactory,
  ) {}

  /**
   * Get strategy for tournament type
   */
  private getStrategy(type: TournamentType): TournamentStrategy {
    return this.strategyFactory.getStrategy(type);
  }

  /**
   * Create a new tournament using the appropriate strategy
   */
  async createTournament(options: TournamentCreationOptions): Promise<ITournament> {
    // Validate the event exists and user has permission
    const event = await this.eventModel.findById(options.eventId);
    
    if (!event) {
      throw new NotFoundException(`Event not found. Event ID ${options.eventId} does not exist in the database.`);
    }

    if (event.creator.toString() !== options.organizerId) {
      throw new ForbiddenException('Only the event creator can create tournaments');
    }

    if ((event as any).status === 'DRAFT') {
      throw new BadRequestException('Cannot create tournament for a draft event. Please publish the event first.');
    }

    // Check if tournament already exists for this event
    const existingTournament = await this.tournamentModel.findOne({ eventId: options.eventId });
    if (existingTournament) {
      throw new BadRequestException('Tournament already exists for this event');
    }

    // Determine tournament type from options or default to single elimination
    const tournamentType = this.determineTournamentType(options);
    const strategy = this.getStrategy(tournamentType);

    // Validate creation with strategy
    strategy.validateCreation(options);

    // Create base tournament
    const tournament = new this.tournamentModel({
      name: options.name,
      eventId: new Types.ObjectId(options.eventId),
      organizerId: new Types.ObjectId(options.organizerId),
      maxPlayers: options.maxPlayers,
      type: tournamentType,
      numRounds: tournamentType === TournamentType.SWISS ? options.numRounds : undefined,
      players: [],
      rounds: [],
      registrationOpen: true,
      isStarted: false,
      isFinished: false,
      currentRound: 0
    });

    // Initialize tournament with strategy-specific settings
    const initializedTournament = strategy.initializeTournament(tournament, options);
    const savedTournament = await initializedTournament.save();

    // Broadcast tournament creation
    this.webSocketGateway.broadcastTournamentUpdate(options.eventId, {
      type: 'tournament-created',
      tournamentId: savedTournament._id.toString(),
      tournament: savedTournament,
    });

    return savedTournament.toObject();
  }

  /**
   * Get tournament by ID with strategy-specific processing
   */
  async getTournament(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId)
      .populate('players.userId', 'username email')
      .exec();
    
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    return tournament;
  }

  /**
   * Register a player for the tournament
   */
  async registerPlayer(tournamentId: string, userId: string, username: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    this.validatePlayerRegistration(tournament);

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
      points: 0,
      wins: 0,
      buchholzScore: 0,
      pastOpponents: []
    };

    tournament.players.push(player);
    const savedTournament = await tournament.save();

    // Broadcast player registration
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'player-registered',
      tournamentId: tournamentId,
      player: player,
      playerCount: savedTournament.players.length,
    });

    return savedTournament.toObject();
  }

  /**
   * Add a guest player (organizer only)
   */
  async addGuestPlayer(tournamentId: string, playerName: string, organizerId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('Only the tournament organizer can add guest players');
    }

    this.validatePlayerRegistration(tournament);

    const { v4: uuidv4 } = require('uuid');
    const guestId = uuidv4();
    const player: ITournamentPlayer = {
      id: guestId,
      name: playerName,
      isGuest: true,
      hasConfirmedWin: false,
      hasReported: false,
      registeredAt: new Date(),
      points: 0,
      wins: 0,
      buchholzScore: 0,
      pastOpponents: []
    };

    tournament.players.push(player);
    const savedTournament = await tournament.save();

    // Broadcast guest player addition
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'guest-player-added',
      tournamentId: tournamentId,
      player: player,
      playerCount: savedTournament.players.length,
    });

    return savedTournament.toObject();
  }

  /**
   * Remove a player (organizer only)
   */
  async removePlayer(tournamentId: string, playerId: string, organizerId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('Only the tournament organizer can remove players');
    }

    if (tournament.isStarted) {
      throw new BadRequestException('Cannot remove players from a tournament that has already started');
    }

    tournament.players = tournament.players.filter(player => player.id !== playerId);
    const savedTournament = await tournament.save();

    // Broadcast player removal
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'player-removed',
      tournamentId: tournamentId,
      playerId: playerId,
      playerCount: savedTournament.players.length,
    });

    return savedTournament.toObject();
  }

  /**
   * Start tournament using strategy-specific logic
   */
  async startTournament(tournamentId: string, organizerId: string): Promise<ITournament> {
    console.log('🔄 BaseTournamentService.startTournament called:', { tournamentId, organizerId });
    
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('📋 Tournament found:', { 
      id: tournament._id, 
      type: tournament.type, 
      playerCount: tournament.players.length,
      isStarted: tournament.isStarted 
    });

    if (tournament.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('Only the tournament organizer can start the tournament');
    }

    if (tournament.isStarted) {
      throw new BadRequestException('Tournament has already started');
    }

    if (tournament.players.length < 2) {
      throw new BadRequestException('Tournament needs at least 2 players to start');
    }

    console.log('🎯 Getting strategy for type:', tournament.type);
    const strategy = this.getStrategy(tournament.type);
    console.log('✅ Strategy obtained:', strategy.constructor.name);
    
    // Validate start conditions with strategy
    console.log('🔍 Validating start conditions...');
    strategy.validateStart({ tournament, players: tournament.players });
    console.log('✅ Start validation passed');

    // Generate initial structure using strategy
    console.log('🏗️ Generating initial structure...');
    const initialRounds = strategy.generateInitialStructure(tournament.players, tournament);
    console.log('✅ Initial structure generated:', { roundCount: initialRounds.length });
    
    tournament.rounds = initialRounds;
    tournament.isStarted = true;
    
    // Set current round for Swiss tournaments
    if (tournament.type === TournamentType.SWISS) {
      tournament.currentRound = 1;
    }

    console.log('💾 Saving tournament...');
    const savedTournament = await tournament.save();

    // Broadcast tournament start
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'tournament-started',
      tournamentId: tournamentId,
      rounds: savedTournament.rounds,
      totalRounds: tournament.type === TournamentType.SINGLE_ELIMINATION 
        ? Math.ceil(Math.log2(tournament.players.length))
        : tournament.numRounds
    });

    return savedTournament;
  }

  /**
   * Start next round using strategy-specific logic
   */
  async startNextRound(tournamentId: string, organizerId: string): Promise<ITournament> {
    console.log('🔄 BaseTournamentService.startNextRound called:', { tournamentId, organizerId });
    
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.organizerId.toString() !== organizerId) {
      throw new ForbiddenException('Only the tournament organizer can start the next round');
    }

    if (!tournament.isStarted) {
      throw new BadRequestException('Tournament must be started first');
    }

    if (tournament.isFinished) {
      throw new BadRequestException('Tournament is already finished');
    }

    console.log('🎯 Getting strategy for type:', tournament.type);
    const strategy = this.getStrategy(tournament.type);
    
    // Check if current round is complete
    const currentRound = this.getCurrentRound(tournament);
    if (!currentRound || !this.isRoundComplete(currentRound)) {
      throw new BadRequestException('Current round must be completed before starting next round');
    }

    // Check if next round can be started
    const advancementResult = strategy.checkAdvancement(tournament, currentRound.roundNumber);
    
    if (!advancementResult.shouldAdvance) {
      throw new BadRequestException('Cannot advance to next round');
    }

    if (advancementResult.isComplete) {
      tournament.isFinished = true;
      tournament.winnerId = advancementResult.winnerId;
      console.log('🏁 Tournament completed with winner:', advancementResult.winnerId);
    } else if (advancementResult.nextRound) {
      tournament.rounds.push(advancementResult.nextRound);
      if (tournament.type === TournamentType.SWISS) {
        tournament.currentRound = (tournament.currentRound || 1) + 1;
      }
      console.log('✅ Next round generated:', { 
        roundNumber: advancementResult.nextRound.roundNumber,
        matchCount: advancementResult.nextRound.matches.length 
      });
    }

    console.log('💾 Saving tournament...');
    const savedTournament = await tournament.save();

    // Broadcast next round start
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'round-started',
      tournamentId: tournamentId,
      round: advancementResult.nextRound,
      currentRound: tournament.currentRound
    });

    return savedTournament;
  }

  /**
   * Report match result using strategy-specific logic
   */
  async reportMatchResult(options: MatchResultOptions & { reporterId: string }): Promise<ITournament> {
    console.log('🔄 BaseTournamentService.reportMatchResult called with:', {
      tournamentId: options.tournament._id || options.tournament.id,
      matchId: options.matchId,
      winnerId: options.winnerId,
      loserId: options.loserId,
      reporterId: options.reporterId
    });

    const tournament = await this.tournamentModel.findById(options.tournament._id || options.tournament.id);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🏆 Tournament found:', {
      id: tournament._id,
      type: tournament.type,
      isStarted: tournament.isStarted,
      roundCount: tournament.rounds.length,
      currentRound: tournament.currentRound
    });

    const strategy = this.getStrategy(tournament.type);
    console.log('🎯 Using strategy:', strategy.constructor.name);
    
    // Validate match result with strategy
    console.log('🔍 Validating match result...');
    strategy.validateMatchResult(options);
    console.log('✅ Match result validation passed');

    // Process result with strategy
    console.log('🔄 Processing match result with strategy...');
    const updatedTournament = strategy.processMatchResult({ ...options, tournament });
    console.log('✅ Match result processed by strategy');

    // Check for automatic round advancement
    const currentRound = this.getCurrentRound(updatedTournament);
    let nextRoundStarted = false;
    let tournamentCompleted = false;
    
    console.log('🔍 Checking current round status:', {
      hasCurrentRound: !!currentRound,
      currentRoundNumber: currentRound?.roundNumber,
      isRoundComplete: currentRound ? this.isRoundComplete(currentRound) : null,
      matchStatuses: currentRound?.matches.map(m => ({ id: m.matchId, status: m.status }))
    });
    
    if (currentRound && this.isRoundComplete(currentRound)) {
      console.log('🔄 Round completed, checking for automatic advancement...', {
        roundNumber: currentRound.roundNumber,
        allMatchesComplete: currentRound.matches.every(m => m.status === 'completed')
      });
      
      const advancementResult = strategy.checkAdvancement(updatedTournament, currentRound.roundNumber);
      console.log('🔄 Advancement check result:', {
        shouldAdvance: advancementResult.shouldAdvance,
        hasNextRound: !!advancementResult.nextRound,
        isComplete: advancementResult.isComplete,
        winnerId: advancementResult.winnerId
      });
      
      if (advancementResult.shouldAdvance && advancementResult.nextRound) {
        updatedTournament.rounds.push(advancementResult.nextRound);
        if (updatedTournament.type === TournamentType.SWISS) {
          updatedTournament.currentRound = (updatedTournament.currentRound || 1) + 1;
        }
        nextRoundStarted = true;
        console.log('✅ Next round automatically started:', {
          newRoundNumber: advancementResult.nextRound.roundNumber,
          matchCount: advancementResult.nextRound.matches.length,
          currentRound: updatedTournament.currentRound
        });
      }
      
      if (advancementResult.isComplete) {
        updatedTournament.isFinished = true;
        updatedTournament.winnerId = advancementResult.winnerId;
        tournamentCompleted = true;
        console.log('🏁 Tournament automatically completed with winner:', advancementResult.winnerId);
      }
    } else {
      console.log('❌ Round advancement not triggered:', {
        hasCurrentRound: !!currentRound,
        isRoundComplete: currentRound ? this.isRoundComplete(currentRound) : null
      });
    }

    console.log('💾 Saving updated tournament...');
    const savedTournament = await updatedTournament.save();
    console.log('✅ Tournament saved successfully');

    // Broadcast match result
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'match-result-submitted',
      tournamentId: tournament._id.toString(),
      matchId: options.matchId,
      result: {
        winnerId: options.winnerId,
        loserId: options.loserId,
        status: 'completed'
      }
    });

    // Broadcast automatic round advancement if it occurred
    if (nextRoundStarted) {
      this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
        type: 'round-started',
        tournamentId: tournament._id.toString(),
        newRound: savedTournament.rounds[savedTournament.rounds.length - 1],
        currentRound: savedTournament.currentRound,
        message: 'Next round started automatically'
      });
    }

    // Broadcast tournament completion if it occurred
    if (tournamentCompleted) {
      this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
        type: 'tournament-completed',
        tournamentId: tournament._id.toString(),
        winnerId: savedTournament.winnerId,
        message: 'Tournament completed automatically'
      });
    }

    return savedTournament;
  }

  /**
   * Get tournament standings using strategy-specific calculation
   */
  async getStandings(tournamentId: string): Promise<ITournamentPlayer[]> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    const strategy = this.getStrategy(tournament.type);
    return strategy.calculateStandings(tournament);
  }

  /**
   * Private helper methods
   */
  private validatePlayerRegistration(tournament: ITournament): void {
    if (tournament.isStarted) {
      throw new BadRequestException('Cannot register for a tournament that has already started');
    }

    if (!tournament.registrationOpen) {
      throw new BadRequestException('Registration is closed for this tournament');
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      throw new BadRequestException('Tournament is full');
    }
  }

  private determineTournamentType(options: TournamentCreationOptions): TournamentType {
    // Use explicit type if provided, otherwise fallback to legacy logic
    if (options.type) {
      return options.type;
    }
    
    // Legacy logic: determine type based on numRounds
    return options.numRounds ? TournamentType.SWISS : TournamentType.SINGLE_ELIMINATION;
  }

  private getCurrentRound(tournament: ITournament) {
    console.log('🔍 Finding current round from:', {
      totalRounds: tournament.rounds.length,
      rounds: tournament.rounds.map(r => ({
        roundNumber: r.roundNumber,
        isComplete: r.isComplete,
        matchCount: r.matches.length,
        completedMatches: r.matches.filter(m => m.status === 'completed').length
      }))
    });
    
    const currentRound = tournament.rounds.find(round => !round.isComplete);
    console.log('🎯 Current round found:', currentRound ? {
      roundNumber: currentRound.roundNumber,
      isComplete: currentRound.isComplete,
      matchCount: currentRound.matches.length
    } : null);
    
    return currentRound;
  }

  private isRoundComplete(round: any): boolean {
    const isComplete = round.matches.every((match: any) => match.status === 'completed');
    console.log('🔍 Checking if round is complete:', {
      roundNumber: round.roundNumber,
      totalMatches: round.matches.length,
      completedMatches: round.matches.filter((m: any) => m.status === 'completed').length,
      matchStatuses: round.matches.map((m: any) => ({ id: m.matchId, status: m.status })),
      isComplete
    });
    return isComplete;
  }

  /**
   * Repair a tournament's structure by regenerating rounds using the strategy pattern
   */
  async repairTournamentStructure(tournamentId: string): Promise<ITournament> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🔧 BaseTournamentService.repairTournamentStructure called for:', {
      tournamentId,
      type: tournament.type,
      playerCount: tournament.players.length
    });

    console.log('🐛 Debug players data:', {
      firstPlayer: tournament.players[0],
      playersStructure: tournament.players.map(p => ({ id: p.id, name: p.name, isGuest: p.isGuest }))
    });

    // Get the appropriate strategy
    const strategy = this.getStrategy(tournament.type);
    
    // Regenerate the initial structure
    console.log('🏗️ Regenerating initial structure using strategy...');
    const initialRounds = strategy.generateInitialStructure(tournament.players, tournament);
    console.log('✅ Initial structure regenerated:', { roundCount: initialRounds.length });

    // Update tournament with new structure
    tournament.rounds = initialRounds;
    
    // Set current round for Swiss tournaments
    if (tournament.type === TournamentType.SWISS) {
      tournament.currentRound = 1;
    }

    // Save the repaired tournament
    const savedTournament = await tournament.save();

    // Broadcast the repair
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
      type: 'tournament-repaired',
      tournamentId: tournamentId,
      rounds: savedTournament.rounds,
      currentRound: savedTournament.currentRound
    });

    return savedTournament;
  }
}