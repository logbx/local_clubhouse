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
      throw new BadRequestException(`Tournament already exists for this event. Existing tournament: "${existingTournament.name}" (${existingTournament.type}). Only one tournament per event is allowed.`);
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
    const updateData = {
      type: 'tournament-created',
      tournamentId: savedTournament._id.toString(),
      eventId: options.eventId,
      tournament: savedTournament,
      message: `${savedTournament.name} tournament is now open for registration!`
    };
    
    console.log('📡 Broadcasting tournament creation to all dashboard users:', {
      tournamentName: savedTournament.name,
      eventId: options.eventId,
      tournamentType: savedTournament.type,
      maxPlayers: savedTournament.maxPlayers
    });
    
    // Broadcast to event room for immediate dashboard updates
    this.webSocketGateway.broadcastTournamentUpdate(options.eventId, updateData);
    
    // Also broadcast to tournament-specific room for future participants
    this.webSocketGateway.broadcastTournamentToParticipants(savedTournament._id.toString(), updateData);

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
    console.log('🎯 registerPlayer called:', { tournamentId, userId, username });
    
    // First validate user exists
    const user = await this.userModel.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      throw new NotFoundException('User not found');
    }

    console.log('👤 User found:', { id: user._id, username: user.username, fullName: user.fullName });

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

    // Use atomic update to prevent race conditions
    const savedTournament = await this.tournamentModel.findOneAndUpdate(
      {
        _id: tournamentId,
        'players.userId': { $ne: new Types.ObjectId(userId) }, // User not already registered
        $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] }, // Tournament not full
        isStarted: false, // Tournament not started
        registrationOpen: true // Registration is open
      },
      { 
        $push: { players: player }
      },
      { 
        new: true,
        runValidators: true
      }
    );

    if (!savedTournament) {
      // Get current tournament state to provide specific error message
      const currentTournament = await this.tournamentModel.findById(tournamentId);
      if (!currentTournament) {
        console.error('❌ Tournament not found:', tournamentId);
        throw new NotFoundException('Tournament not found');
      }

      // Check specific failure reasons
      if (currentTournament.players.some(p => !p.isGuest && p.userId?.toString() === userId)) {
        console.error('❌ User already registered:', { userId, tournamentId });
        throw new BadRequestException('User is already registered for this tournament');
      }
      
      if (currentTournament.players.length >= currentTournament.maxPlayers) {
        console.error('❌ Tournament is full:', { current: currentTournament.players.length, max: currentTournament.maxPlayers });
        throw new BadRequestException('Tournament is full');
      }
      
      if (currentTournament.isStarted) {
        console.error('❌ Tournament already started');
        throw new BadRequestException('Tournament has already started');
      }
      
      if (!currentTournament.registrationOpen) {
        console.error('❌ Registration is closed');
        throw new BadRequestException('Tournament registration is closed');
      }
      
      // Generic fallback error
      console.error('❌ Failed to register player - unknown reason');
      throw new BadRequestException('Failed to register for tournament');
    }

    console.log('✅ Player registered successfully:', {
      tournamentId,
      userId,
      playerCount: savedTournament.players.length,
      maxPlayers: savedTournament.maxPlayers
    });

    // Broadcast player registration with dual broadcasting
    const updateData = {
      type: 'player-registered',
      tournamentId: tournamentId,
      player: player,
      playerCount: savedTournament.players.length,
    };
    
    // Broadcast to tournament-specific room only (prevents duplicates)
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, updateData);

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

    // Broadcast guest player addition with dual broadcasting
    const updateData = {
      type: 'guest-player-added',
      tournamentId: tournamentId,
      player: player,
      playerCount: savedTournament.players.length,
    };
    
    // Broadcast to tournament-specific room only (prevents duplicates)
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, updateData);

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

    // Broadcast player removal with dual broadcasting
    const updateData = {
      type: 'player-removed',
      tournamentId: tournamentId,
      playerId: playerId,
      playerCount: savedTournament.players.length,
    };
    
    // Broadcast to tournament-specific room only (prevents duplicates)
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, updateData);

    return savedTournament.toObject();
  }

  /**
   * Allow a player to unregister themselves from a tournament
   */
  async unregisterPlayer(tournamentId: string, userId: string): Promise<ITournament> {
    console.log('🚪 unregisterPlayer called:', { tournamentId, userId });
    
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    if (tournament.isStarted) {
      throw new BadRequestException('Cannot unregister from a tournament that has already started');
    }

    // Check if player is registered
    const playerExists = tournament.players.some(player => 
      !player.isGuest && player.userId?.toString() === userId
    );
    
    if (!playerExists) {
      throw new BadRequestException('You are not registered for this tournament');
    }

    // Remove the player
    tournament.players = tournament.players.filter(player => 
      player.isGuest || player.userId?.toString() !== userId
    );
    
    const savedTournament = await tournament.save();

    console.log('✅ Player unregistered successfully:', {
      tournamentId,
      userId,
      remainingPlayers: savedTournament.players.length
    });

    // Broadcast player unregistration
    const updateData = {
      type: 'player-unregistered',
      tournamentId: tournamentId,
      userId: userId,
      playerCount: savedTournament.players.length,
    };
    
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, updateData);

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

    // Award bye points for initial rounds
    for (const round of initialRounds) {
      if (round.byePlayers && round.byePlayers.length > 0) {
        for (const byePlayer of round.byePlayers) {
          const tournamentPlayer = tournament.players.find(p => p.id === byePlayer.id);
          if (tournamentPlayer) {
            // Award bye points (1 full point for Swiss) and track the bye
            tournamentPlayer.points = (tournamentPlayer.points || 0) + 1;
            tournamentPlayer.pastOpponents = [...(tournamentPlayer.pastOpponents || []), 'BYE'];
            
            console.log('✅ Initial round bye points awarded to tournament player:', {
              name: tournamentPlayer.name,
              newPoints: tournamentPlayer.points,
              totalByes: (tournamentPlayer.pastOpponents || []).filter((o: string) => o === 'BYE').length,
              roundNumber: round.roundNumber
            });
          } else {
            console.error('❌ Could not find initial round bye player in tournament.players to award points:', byePlayer.name);
          }
        }
      }
    }

    console.log('💾 Saving tournament...');
    const savedTournament = await tournament.save();

    // Broadcast tournament start
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, {
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
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, {
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
      isDraw: options.isDraw,
      result: options.result,
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

    // Check for automatic round advancement - Enhanced logic
    console.log('🔄 Checking for automatic round advancement after match result...');
    const { nextRoundStarted, tournamentCompleted } = await this.checkAndAdvanceRounds(updatedTournament, strategy);
    console.log('✅ Advancement check completed:', { nextRoundStarted, tournamentCompleted });

    console.log('💾 Saving updated tournament...');
    const savedTournament = await updatedTournament.save();
    console.log('✅ Tournament saved successfully');

    // Broadcast match result
    this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), {
      type: 'match-result-submitted',
      tournamentId: tournament._id.toString(),
      matchId: options.matchId,
      result: {
        winnerId: options.winnerId,
        loserId: options.loserId,
        status: 'completed'
      }
    });

    // Broadcast automatic round advancement ONLY if a new round actually started
    if (nextRoundStarted) {
      // For Single Elimination, find the round that was just populated (not a new round, but newly populated)
      const newlyPopulatedRound = savedTournament.rounds.find(r => 
        !r.isComplete && r.matches.some(m => m.player1.id !== 'TBD' && m.player2.id !== 'TBD')
      );
      
      if (newlyPopulatedRound) {
        const updateData = {
          type: 'round-started',
          tournamentId: tournament._id.toString(),
          newRound: newlyPopulatedRound,
          currentRound: savedTournament.currentRound,
          message: `${newlyPopulatedRound.name || 'Round ' + newlyPopulatedRound.roundNumber} is now ready to play`
        };
        console.log('📡 Broadcasting round advancement:', updateData);
        this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), updateData);
      }
    }

    // Broadcast tournament completion if it occurred
    if (tournamentCompleted) {
      const updateData = {
        type: 'tournament-completed',
        tournamentId: tournament._id.toString(),
        winnerId: savedTournament.winnerId,
        message: 'Tournament completed automatically'
      };
      this.webSocketGateway.broadcastTournamentToParticipants(tournament._id.toString(), updateData);
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
    console.log('🔍 Validating player registration:', {
      isStarted: tournament.isStarted,
      registrationOpen: tournament.registrationOpen,
      playerCount: tournament.players.length,
      maxPlayers: tournament.maxPlayers
    });

    if (tournament.isStarted) {
      console.error('❌ Tournament already started');
      throw new BadRequestException('Cannot register for a tournament that has already started');
    }

    if (!tournament.registrationOpen) {
      console.error('❌ Registration is closed');
      throw new BadRequestException('Registration is closed for this tournament');
    }

    if (tournament.players.length >= tournament.maxPlayers) {
      console.error('❌ Tournament is full');
      throw new BadRequestException('Tournament is full');
    }

    console.log('✅ All registration validations passed');
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
    // Simplified logic: a round is complete when all matches have final results
    // A match is complete when it has status 'completed', regardless of how it was achieved
    const isComplete = round.matches.every((match: any) => match.status === 'completed');
    console.log('🔍 Checking if round is complete:', {
      roundNumber: round.roundNumber,
      totalMatches: round.matches.length,
      completedMatches: round.matches.filter((m: any) => m.status === 'completed').length,
      matchStatuses: round.matches.map((m: any) => ({ id: m.matchId, status: m.status })),
      isComplete,
      note: "Only matches with 'completed' status count as finished"
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
    this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, {
      type: 'tournament-repaired',
      tournamentId: tournamentId,
      rounds: savedTournament.rounds,
      currentRound: savedTournament.currentRound
    });

    return savedTournament;
  }

  /**
   * Enhanced round advancement checking and processing
   * This method checks ALL rounds for completion and advances as needed
   */
  // Track advancement operations to prevent concurrent execution per tournament
  private advancementOperations = new Map<string, Promise<{ nextRoundStarted: boolean; tournamentCompleted: boolean }>>();

  private async checkAndAdvanceRounds(tournament: ITournament, strategy: any): Promise<{ nextRoundStarted: boolean; tournamentCompleted: boolean }> {
    const tournamentId = tournament._id.toString();
    
    // Enhanced race condition prevention with timestamp tracking
    const existingOperation = this.advancementOperations.get(tournamentId);
    if (existingOperation) {
      console.log('🔒 RACE CONDITION PREVENTED: Tournament advancement already in progress, waiting for completion:', tournamentId);
      return existingOperation;
    }

    // Additional check: Verify tournament is in a valid state for advancement
    if (tournament.isFinished) {
      console.log('🏁 Tournament already finished, no advancement needed:', tournamentId);
      return { nextRoundStarted: false, tournamentCompleted: false };
    }

    console.log('🚀 STARTING advancement operation for tournament:', tournamentId);
    
    // Create and track advancement operation with enhanced tracking
    const advancementPromise = this.performRoundAdvancement(tournament, strategy);
    this.advancementOperations.set(tournamentId, advancementPromise);

    try {
      const result = await advancementPromise;
      console.log('✅ COMPLETED advancement operation for tournament:', tournamentId, result);
      return result;
    } catch (error) {
      console.error('❌ FAILED advancement operation for tournament:', tournamentId, error);
      throw error;
    } finally {
      // Clean up operation tracking
      this.advancementOperations.delete(tournamentId);
      console.log('🧹 CLEANED UP advancement operation for tournament:', tournamentId);
    }
  }

  private async performRoundAdvancement(tournament: ITournament, strategy: any): Promise<{ nextRoundStarted: boolean; tournamentCompleted: boolean }> {
    console.log('🔄 Enhanced round advancement check starting for tournament:', tournament._id);
    
    let nextRoundStarted = false;
    let tournamentCompleted = false;
    
    // Validate tournament state before processing
    if (tournament.isFinished) {
      console.log('ℹ️ Tournament already finished, skipping advancement');
      return { nextRoundStarted: false, tournamentCompleted: false };
    }
    
    // FIXED LOGIC: Handle Swiss vs SET tournaments differently
    let roundToProcess = null;
    
    if (tournament.type === TournamentType.SWISS) {
      // For Swiss tournaments: Find the LAST completed round (most recent)
      // Swiss tournaments generate rounds dynamically as previous rounds complete
      const completedRounds = tournament.rounds.filter(round => round.isComplete);
      if (completedRounds.length > 0) {
        roundToProcess = completedRounds.sort((a, b) => b.roundNumber - a.roundNumber)[0];
        console.log('🔄 Swiss tournament: Processing advancement from completed round:', roundToProcess.roundNumber);
      }
    } else {
      // For SET tournaments: Find the FIRST incomplete round that just became complete
      // This prevents multiple simultaneous advancements and ensures proper sequential progression
      const firstIncompleteRound = tournament.rounds.find(round => !round.isComplete);
      if (firstIncompleteRound && this.isRoundComplete(firstIncompleteRound)) {
        roundToProcess = firstIncompleteRound;
        console.log('🔄 SET tournament: Processing newly completed round:', roundToProcess.roundNumber);
      }
    }
    
    if (roundToProcess) {
      // For SET tournaments, mark the round as complete here
      if (tournament.type !== TournamentType.SWISS && !roundToProcess.isComplete) {
        // Mark this round as complete
        console.log(`🔧 Marking round ${roundToProcess.roundNumber} as complete`);
        roundToProcess.isComplete = true;
      }
      
      const round = roundToProcess;
      console.log(`🔍 Processing advancement for completed round:`, {
        roundNumber: round.roundNumber,
        totalMatches: round.matches.length,
        matchStatuses: round.matches.map(m => ({ id: m.matchId, status: m.status }))
      });
      
      // Process advancement for this single round only
      {
        console.log(`🔄 Round ${round.roundNumber} is complete, checking advancement...`);
        
        const advancementResult = strategy.checkAdvancement(tournament, round.roundNumber);
        console.log('🔄 Advancement check result:', {
          roundNumber: round.roundNumber,
          shouldAdvance: advancementResult.shouldAdvance,
          hasNextRound: !!advancementResult.nextRound,
          isComplete: advancementResult.isComplete,
          winnerId: advancementResult.winnerId
        });
        
        // Check if tournament should be completed
        if (advancementResult.isComplete) {
          if (!tournament.isFinished) {
            tournament.isFinished = true;
            tournament.winnerId = advancementResult.winnerId;
            tournamentCompleted = true;
            console.log('🏁 Tournament marked as completed with winner:', advancementResult.winnerId);
            
            // Validate winner exists in tournament players
            const winnerPlayer = tournament.players.find(p => p.id === advancementResult.winnerId);
            if (!winnerPlayer) {
              console.error('❌ Winner not found in tournament players:', {
                winnerId: advancementResult.winnerId,
                players: tournament.players.map(p => ({ id: p.id, name: p.name }))
              });
            } else {
              console.log('✅ Winner validated:', { id: winnerPlayer.id, name: winnerPlayer.name });
            }
          }
          // Tournament is finished, return immediately
          return { nextRoundStarted: false, tournamentCompleted: true };
        }
        
        // Check if we should advance to next round
        if (advancementResult.shouldAdvance && advancementResult.nextRound) {
          const nextRoundNumber = round.roundNumber + 1;
          
          // Check if next round already exists and is properly populated
          const existingNextRound = tournament.rounds.find(r => r.roundNumber === nextRoundNumber);
          
          if (!existingNextRound) {
            // This case should only happen for Swiss tournaments
            console.log('⚠️ Creating new round on-the-fly (expected only for Swiss tournaments)');
            if (tournament.type !== TournamentType.SWISS) {
              console.error('❌ Single Elimination tournaments should have all rounds pre-created');
            }
            // Validate next round before adding
            const nextRound = advancementResult.nextRound;
            const validMatches = nextRound.matches.filter((m: any) => 
              m.player1.id !== 'TBD' && m.player2.id !== 'TBD'
            );
            
            console.log('✅ Adding new round to tournament:', {
              roundNumber: nextRoundNumber,
              totalMatches: nextRound.matches.length,
              validMatches: validMatches.length,
              byePlayers: nextRound.byePlayers?.length || 0
            });
            
            tournament.rounds.push(nextRound);
            
            if (tournament.type === TournamentType.SWISS) {
              tournament.currentRound = nextRoundNumber;
            }
            
            // Award bye points immediately when round is added to tournament
            if (nextRound.byePlayers && nextRound.byePlayers.length > 0) {
              for (const byePlayer of nextRound.byePlayers) {
                const tournamentPlayer = tournament.players.find(p => p.id === byePlayer.id);
                if (tournamentPlayer) {
                  // Award bye points (1 full point for Swiss) and track the bye
                  tournamentPlayer.points = (tournamentPlayer.points || 0) + 1;
                  tournamentPlayer.pastOpponents = [...(tournamentPlayer.pastOpponents || []), 'BYE'];
                  
                  console.log('✅ Bye points awarded to tournament player:', {
                    name: tournamentPlayer.name,
                    newPoints: tournamentPlayer.points,
                    totalByes: (tournamentPlayer.pastOpponents || []).filter((o: string) => o === 'BYE').length,
                    roundNumber: nextRoundNumber
                  });
                } else {
                  console.error('❌ Could not find bye player in tournament.players to award points:', byePlayer.name);
                }
              }
            }
            
            nextRoundStarted = true;
          } else if (this.needsRoundUpdate(existingNextRound, advancementResult.nextRound)) {
            // Update existing round if it needs updating (e.g., TBD players)
            console.log(`🔧 ADVANCING: Updating existing round ${nextRoundNumber} with new player assignments`);
            this.updateRoundWithNewPlayers(existingNextRound, advancementResult.nextRound);
            nextRoundStarted = true;
            console.log(`✅ ADVANCED: Round ${nextRoundNumber} (${existingNextRound.name}) is now ready for play`);
          } else {
            console.log(`ℹ️ NO ADVANCEMENT: Round ${nextRoundNumber} already exists and is properly populated`);
          }
        }
      }
    } else {
      console.log('ℹ️ No incomplete rounds found that need advancement');
    }
    
    console.log('✅ Enhanced round advancement check completed:', {
      nextRoundStarted,
      tournamentCompleted,
      totalRounds: tournament.rounds.length,
      isFinished: tournament.isFinished
    });
    
    return { nextRoundStarted, tournamentCompleted };
  }

  /**
   * Check if an existing round needs to be updated with new player assignments
   */
  private needsRoundUpdate(existingRound: any, newRound: any): boolean {
    // Check if existing round has TBD players that should be replaced
    const hasTBDPlayers = existingRound.matches.some((match: any) => 
      match.player1.id === 'TBD' || match.player2.id === 'TBD'
    );
    
    // For Swiss tournaments, if the match count is different, we need to update
    const differentMatchCount = existingRound.matches.length !== newRound.matches.length;
    
    return hasTBDPlayers || differentMatchCount;
  }

  /**
   * Update an existing round with new player assignments
   */
  public updateRoundWithNewPlayers(existingRound: any, newRound: any): void {
    console.log(`🔧 Updating round ${existingRound.roundNumber} with new players`);
    
    // For single elimination, update TBD placeholders with real players
    if (existingRound.matches.length === newRound.matches.length) {
      for (let i = 0; i < existingRound.matches.length; i++) {
        const existingMatch = existingRound.matches[i];
        const newMatch = newRound.matches[i];
        
        if (existingMatch.player1.id === 'TBD' && newMatch.player1.id !== 'TBD') {
          existingMatch.player1 = newMatch.player1;
        }
        if (existingMatch.player2.id === 'TBD' && newMatch.player2.id !== 'TBD') {
          existingMatch.player2 = newMatch.player2;
        }
      }
    } else {
      // For Swiss tournaments, replace all matches
      existingRound.matches = newRound.matches;
    }
    
    // Update bye players if needed
    if (newRound.byePlayers) {
      existingRound.byePlayers = newRound.byePlayers;
    }
    
    console.log(`✅ Round ${existingRound.roundNumber} updated successfully`);
  }

  // Track tournament repair operations to prevent concurrent execution
  private repairOperations = new Map<string, Promise<ITournament>>();

  /**
   * Fix existing stuck tournaments by applying the enhanced advancement logic
   * Prevents concurrent repair operations that cause race conditions
   */
  async repairTournamentAdvancement(tournamentId: string): Promise<ITournament> {
    // Check if repair operation is already in progress for this tournament
    const existingOperation = this.repairOperations.get(tournamentId);
    if (existingOperation) {
      console.log('🔒 Tournament repair already in progress, waiting for completion:', tournamentId);
      return existingOperation;
    }

    // Create and store repair operation promise
    const repairPromise = this.performTournamentRepair(tournamentId);
    this.repairOperations.set(tournamentId, repairPromise);

    try {
      const result = await repairPromise;
      return result;
    } finally {
      // Clean up operation tracking
      this.repairOperations.delete(tournamentId);
    }
  }

  private async performTournamentRepair(tournamentId: string): Promise<ITournament> {
    console.log('🔧 Repairing tournament advancement for:', tournamentId);
    
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new NotFoundException('Tournament not found');
    }

    console.log('🔍 Tournament state before repair:', {
      id: tournament._id,
      type: tournament.type,
      isStarted: tournament.isStarted,
      isFinished: tournament.isFinished,
      roundCount: tournament.rounds.length,
      currentRound: tournament.currentRound
    });

    if (!tournament.isStarted) {
      console.log('ℹ️ Tournament not started, no repair needed');
      return tournament;
    }

    if (tournament.isFinished) {
      console.log('ℹ️ Tournament already finished, no repair needed');
      return tournament;
    }

    const strategy = this.getStrategy(tournament.type);
    
    // Apply the enhanced advancement logic to check and fix all rounds
    const { nextRoundStarted, tournamentCompleted } = await this.checkAndAdvanceRounds(tournament, strategy);
    
    // Only save if there were actual changes
    let savedTournament = tournament;
    if (nextRoundStarted || tournamentCompleted) {
      savedTournament = await tournament.save();
      
      // Broadcast the repair only if there were actual changes
      this.webSocketGateway.broadcastTournamentToParticipants(tournamentId, {
        type: 'tournament-repaired',
        tournamentId: tournamentId,
        rounds: savedTournament.rounds,
        currentRound: savedTournament.currentRound,
        isFinished: savedTournament.isFinished,
        winnerId: savedTournament.winnerId,
        message: 'Tournament advancement repaired'
      });

      console.log('✅ Tournament advancement repair completed:', {
        nextRoundStarted,
        tournamentCompleted,
        finalRoundCount: savedTournament.rounds.length,
        isFinished: savedTournament.isFinished
      });
    } else {
      console.log('ℹ️ No changes needed during tournament repair');
    }

    return savedTournament;
  }
}