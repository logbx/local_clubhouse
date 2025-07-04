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

    // Check for automatic round advancement - Enhanced logic
    const { nextRoundStarted, tournamentCompleted } = await this.checkAndAdvanceRounds(updatedTournament, strategy);

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
    // A round is complete when all matches have finished (completed, forfeit, or other final statuses)
    const finalStatuses = ['completed', 'forfeit'];
    const isComplete = round.matches.every((match: any) => finalStatuses.includes(match.status));
    console.log('🔍 Checking if round is complete:', {
      roundNumber: round.roundNumber,
      totalMatches: round.matches.length,
      completedMatches: round.matches.filter((m: any) => finalStatuses.includes(m.status)).length,
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

  /**
   * Enhanced round advancement checking and processing
   * This method checks ALL rounds for completion and advances as needed
   */
  private async checkAndAdvanceRounds(tournament: ITournament, strategy: any): Promise<{ nextRoundStarted: boolean; tournamentCompleted: boolean }> {
    console.log('🔄 Enhanced round advancement check starting...');
    
    let nextRoundStarted = false;
    let tournamentCompleted = false;
    
    // Check all rounds for completion, not just the current one
    for (let roundIndex = 0; roundIndex < tournament.rounds.length; roundIndex++) {
      const round = tournament.rounds[roundIndex];
      
      console.log(`🔍 Checking round ${round.roundNumber} for completion:`, {
        roundNumber: round.roundNumber,
        totalMatches: round.matches.length,
        matchStatuses: round.matches.map(m => ({ id: m.matchId, status: m.status })),
        currentlyMarkedComplete: round.isComplete
      });
      
      // Check if this round is complete but not marked as such
      if (!round.isComplete && this.isRoundComplete(round)) {
        console.log(`🔧 Marking round ${round.roundNumber} as complete`);
        round.isComplete = true;
      }
      
      // If round is complete, check for advancement
      if (round.isComplete) {
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
          }
          break; // Tournament is finished, no more advancement needed
        }
        
        // Check if we should advance to next round
        if (advancementResult.shouldAdvance && advancementResult.nextRound) {
          const nextRoundNumber = round.roundNumber + 1;
          
          // Check if next round already exists and is properly populated
          const existingNextRound = tournament.rounds.find(r => r.roundNumber === nextRoundNumber);
          
          if (!existingNextRound) {
            // Add the new round
            console.log(`✅ Adding new round ${nextRoundNumber} to tournament`);
            tournament.rounds.push(advancementResult.nextRound);
            
            if (tournament.type === TournamentType.SWISS) {
              tournament.currentRound = nextRoundNumber;
            }
            
            nextRoundStarted = true;
          } else if (this.needsRoundUpdate(existingNextRound, advancementResult.nextRound)) {
            // Update existing round if it needs updating (e.g., TBD players)
            console.log(`🔧 Updating existing round ${nextRoundNumber} with new player assignments`);
            this.updateRoundWithNewPlayers(existingNextRound, advancementResult.nextRound);
            nextRoundStarted = true;
          } else {
            console.log(`ℹ️ Round ${nextRoundNumber} already exists and is properly populated`);
          }
        }
      }
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
  private updateRoundWithNewPlayers(existingRound: any, newRound: any): void {
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

  /**
   * Fix existing stuck tournaments by applying the enhanced advancement logic
   */
  async repairTournamentAdvancement(tournamentId: string): Promise<ITournament> {
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

    const strategy = this.getStrategy(tournament.type);
    
    // Apply the enhanced advancement logic to check and fix all rounds
    const { nextRoundStarted, tournamentCompleted } = await this.checkAndAdvanceRounds(tournament, strategy);
    
    // Save the repaired tournament
    const savedTournament = await tournament.save();
    
    // Broadcast the repair
    this.webSocketGateway.broadcastTournamentUpdate(tournament.eventId.toString(), {
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

    return savedTournament;
  }
}