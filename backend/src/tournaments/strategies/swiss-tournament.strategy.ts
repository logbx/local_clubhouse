import { Injectable, BadRequestException } from '@nestjs/common';
import { EnhancedSwissPairingService } from '../utils/enhanced-swiss-pairings';
import { 
  TournamentStrategy, 
  TournamentCreationOptions, 
  TournamentStartOptions, 
  MatchResultOptions, 
  TournamentAdvancementResult 
} from './tournament-strategy.interface';
import { 
  ITournament, 
  ITournamentPlayer, 
  ITournamentRound, 
  ITournamentMatch, 
  TournamentType 
} from '../../models/tournament.model';

@Injectable()
export class SwissTournamentStrategy extends TournamentStrategy {
  readonly type = TournamentType.SWISS;

  validateCreation(options: TournamentCreationOptions): void {
    if (!options.numRounds) {
      throw new BadRequestException('Number of rounds is required for Swiss tournaments');
    }
    
    if (options.numRounds < 1 || options.numRounds > 10) {
      throw new BadRequestException('Number of rounds must be between 1 and 10');
    }

    if (options.maxPlayers < 4) {
      throw new BadRequestException('Swiss tournament requires at least 4 players');
    }
  }

  initializeTournament(tournament: ITournament, options: TournamentCreationOptions): ITournament {
    tournament.numRounds = options.numRounds;
    tournament.currentRound = 0;
    return tournament;
  }

  validateStart(options: TournamentStartOptions): void {
    if (options.players.length < 4) {
      throw new BadRequestException('Swiss tournament needs at least 4 players to start');
    }
  }

  generateInitialStructure(players: ITournamentPlayer[], tournament: ITournament): ITournamentRound[] {
    console.log('🏆 SwissTournamentStrategy.generateInitialStructure called with', players.length, 'players');
    
    // Initialize all players with Swiss-specific fields
    const initializedPlayers = players.map(player => ({
      ...player.toObject ? player.toObject() : player, // Handle Mongoose documents
      points: 0,
      wins: 0,
      buchholzScore: 0,
      pastOpponents: []
    }));

    console.log('👥 Players initialized for Swiss tournament:', initializedPlayers.map(p => ({ id: p.id, name: p.name })));
    console.log('🐛 Raw players from function parameter:', players.map(p => ({ id: p.id, name: p.name, fullName: p.fullName, isGuest: p.isGuest })));

    // Update the tournament's players array
    tournament.players = initializedPlayers;

    // Generate first round pairings using enhanced algorithm
    console.log('🔄 Generating Swiss pairings for round 1...');
    try {
      const firstRound = EnhancedSwissPairingService.generateSwissPairings(initializedPlayers, 1);
      console.log('✅ Swiss pairings generated:', { 
        matches: firstRound.matches.length, 
        byePlayers: firstRound.byePlayers?.length || 0,
        roundStructure: {
          roundNumber: firstRound.roundNumber,
          isComplete: firstRound.isComplete,
          matchDetails: firstRound.matches.map(match => ({
            matchId: match.matchId,
            player1: match.player1?.name,
            player2: match.player2?.name,
            status: match.status
          }))
        }
      });
      return [firstRound];
    } catch (error) {
      console.error('❌ Error generating Swiss pairings:', error);
      throw error;
    }
  }

  processMatchResult(options: MatchResultOptions): ITournament {
    console.log('🔄 SwissTournamentStrategy.processMatchResult called with:', {
      matchId: options.matchId,
      winnerId: options.winnerId,
      loserId: options.loserId,
      result: options.result,
      isDraw: options.isDraw,
      tournamentId: options.tournament._id || options.tournament.id
    });

    const { tournament, matchId, winnerId, loserId, result, isDraw } = options;
    
    console.log('🔍 Tournament has rounds:', tournament.rounds.length);
    
    // Find the match across all rounds
    let match: ITournamentMatch | undefined;
    let matchRound: ITournamentRound | undefined;
    
    for (const round of tournament.rounds) {
      console.log(`🔍 Checking round ${round.roundNumber} with ${round.matches.length} matches`);
      const foundMatch = round.matches.find(m => m.matchId === matchId);
      if (foundMatch) {
        match = foundMatch;
        matchRound = round;
        console.log('✅ Found match in round:', round.roundNumber);
        break;
      }
    }
    
    if (!match || !matchRound) {
      console.log('❌ Match not found!');
      throw new BadRequestException('Match not found');
    }

    if (match.status === 'completed') {
      console.log('❌ Match already completed!');
      throw new BadRequestException('Match has already been completed');
    }

    console.log('🔄 Updating match result...');
    // Update match result
    match.status = 'completed';
    match.result = result;
    match.winnerId = winnerId;
    match.loserId = loserId;

    console.log('🔄 Updating player points...');
    // Update player points and statistics
    const player1 = tournament.players.find(p => p.id === match.player1.id);
    const player2 = tournament.players.find(p => p.id === match.player2.id);

    if (player1 && player2) {
      console.log('👥 Updating player scores:', {
        player1: { id: player1.id, name: player1.name, currentPoints: player1.points },
        player2: { id: player2.id, name: player2.name, currentPoints: player2.points },
        isDraw: isDraw || result === 'draw'
      });

      if (isDraw || result === 'draw') {
        // Both players get 0.5 points for a draw
        player1.points = (player1.points || 0) + 0.5;
        player2.points = (player2.points || 0) + 0.5;
        console.log('🤝 Draw result - both players get 0.5 points');
      } else {
        // Winner gets 1 point, loser gets 0
        const winner = winnerId === player1.id ? player1 : player2;
        
        winner.points = (winner.points || 0) + 1;
        winner.wins = (winner.wins || 0) + 1;
        console.log('🏆 Winner gets 1 point:', { winnerId, winnerName: winner.name, newPoints: winner.points });
      }

      // Update past opponents
      player1.pastOpponents = [...(player1.pastOpponents || []), player2.id];
      player2.pastOpponents = [...(player2.pastOpponents || []), player1.id];
    }

    console.log('🔍 Checking if round is complete...');
    // Mark round as complete if all matches are done
    const allMatchesComplete = matchRound.matches.every(m => m.status === 'completed');
    console.log('📊 Round completion status:', {
      roundNumber: matchRound.roundNumber,
      totalMatches: matchRound.matches.length,
      completedMatches: matchRound.matches.filter(m => m.status === 'completed').length,
      allMatchesComplete
    });

    if (allMatchesComplete) {
      matchRound.isComplete = true;
      console.log('✅ Round marked as complete!');
    }

    console.log('✅ SwissTournamentStrategy.processMatchResult completed successfully');
    return tournament;
  }

  checkAdvancement(tournament: ITournament, completedRoundNumber: number): TournamentAdvancementResult {
    console.log('🔄 SwissTournamentStrategy.checkAdvancement called:', {
      completedRoundNumber,
      totalRounds: tournament.rounds.length,
      numRounds: tournament.numRounds
    });

    const completedRound = tournament.rounds.find(r => r.roundNumber === completedRoundNumber);
    console.log('🔍 Completed round found:', {
      found: !!completedRound,
      isComplete: completedRound?.isComplete
    });

    if (!completedRound || !completedRound.isComplete) {
      console.log('❌ Round not complete, no advancement');
      return { shouldAdvance: false };
    }

    // Check if tournament is complete
    if (completedRoundNumber >= (tournament.numRounds || 0)) {
      console.log('🏁 Tournament complete, calculating final standings');
      // Calculate Buchholz scores for final standings
      EnhancedSwissPairingService.updateBuchholzScores(tournament.players);
      
      const winner = this.getWinner(tournament);
      return {
        shouldAdvance: false,
        isComplete: true,
        winnerId: winner?.id
      };
    }

    console.log('🔄 Generating next round...');
    // Generate next round
    // Calculate Buchholz scores before generating next round
    EnhancedSwissPairingService.updateBuchholzScores(tournament.players);
    
    try {
      const nextRound = EnhancedSwissPairingService.generateSwissPairings(tournament.players, completedRoundNumber + 1);
      console.log('✅ Next round generated:', {
        roundNumber: nextRound.roundNumber,
        matchCount: nextRound.matches.length,
        byePlayers: nextRound.byePlayers?.length || 0
      });
      
      return {
        shouldAdvance: true,
        nextRound: nextRound
      };
    } catch (error) {
      console.error('❌ Error generating next round:', error);
      throw error;
    }
  }

  calculateStandings(tournament: ITournament): ITournamentPlayer[] {
    // Use enhanced standings calculation
    return EnhancedSwissPairingService.calculateStandings(tournament.players);
  }

  isComplete(tournament: ITournament): boolean {
    if (!tournament.isStarted || tournament.rounds.length === 0) {
      return false;
    }

    return tournament.rounds.length >= (tournament.numRounds || 0) &&
           tournament.rounds[tournament.rounds.length - 1].isComplete === true;
  }

  getWinner(tournament: ITournament): ITournamentPlayer | null {
    if (!this.isComplete(tournament)) {
      return null;
    }

    const standings = this.calculateStandings(tournament);
    return standings.length > 0 ? standings[0] : null;
  }

  getRoundName(roundNumber: number, tournament: ITournament): string {
    if (roundNumber === tournament.numRounds) {
      return `Final Round (${roundNumber})`;
    }
    return `Round ${roundNumber}`;
  }

  validateMatchResult(options: MatchResultOptions): void {
    // Swiss tournaments can have draws, wins, or losses
    if (!options.result && !options.isDraw && !options.winnerId) {
      throw new BadRequestException('Swiss tournament matches must have a result (win, loss, or draw)');
    }

    if (options.result === 'draw' || options.isDraw) {
      // For draws, winnerId and loserId should not be set
      return;
    }

    if (!options.winnerId || !options.loserId) {
      throw new BadRequestException('Swiss tournament matches with win/loss must have both winner and loser');
    }

    if (options.winnerId === options.loserId) {
      throw new BadRequestException('Winner and loser cannot be the same player');
    }
  }
}