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

    // Validate that number of rounds is appropriate for odd number of players
    // With odd players, there will be one bye per round
    // No player should receive more than one bye
    if (options.maxPlayers % 2 === 1) {
      const maxRoundsWithByes = options.maxPlayers;
      if (options.numRounds > maxRoundsWithByes) {
        throw new BadRequestException(
          `With ${options.maxPlayers} players (odd number), maximum ${maxRoundsWithByes} rounds allowed to ensure no player receives multiple byes. ` +
          `You requested ${options.numRounds} rounds.`
        );
      }
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

    // Validate number of rounds vs actual players for odd numbers
    if (options.players.length % 2 === 1) {
      const tournament = options.tournament;
      const maxRoundsWithByes = options.players.length;
      if (tournament.numRounds && tournament.numRounds > maxRoundsWithByes) {
        throw new BadRequestException(
          `With ${options.players.length} players (odd number), maximum ${maxRoundsWithByes} rounds allowed to ensure no player receives multiple byes. ` +
          `Tournament is configured for ${tournament.numRounds} rounds. Please reduce the number of rounds or add more players.`
        );
      }
    }
  }

  generateInitialStructure(players: ITournamentPlayer[], tournament: ITournament): ITournamentRound[] {
    console.log('🏆 SwissTournamentStrategy.generateInitialStructure called with', players.length, 'players');
    
    // CRITICAL FIX: Ensure ALL players (registered + guests) are included
    // Filter out any null/undefined players and ensure proper structure
    const validPlayers = players.filter(player => player && player.id);
    
    if (validPlayers.length !== players.length) {
      console.warn('⚠️ Some players were filtered out as invalid:', {
        original: players.length,
        valid: validPlayers.length,
        filtered: players.filter(p => !p || !p.id)
      });
    }
    
    // Initialize all players with Swiss-specific fields
    const initializedPlayers = validPlayers.map(player => ({
      ...(player as any).toObject ? (player as any).toObject() : player, // Handle Mongoose documents
      points: 0,
      wins: 0,
      buchholzScore: 0,
      pastOpponents: []
    }));

    console.log('👥 Players initialized for Swiss tournament:', initializedPlayers.map(p => ({ 
      id: p.id, 
      name: p.name, 
      isGuest: p.isGuest, 
      userId: p.userId 
    })));
    console.log('🐛 Raw players from function parameter:', players.map(p => ({ 
      id: p.id, 
      name: p.name, 
      fullName: p.fullName, 
      isGuest: p.isGuest,
      userId: p.userId 
    })));

    // Verify we have the expected number of players
    if (initializedPlayers.length < players.length) {
      console.error('❌ PLAYER LOSS DETECTED: Some players were lost during initialization!', {
        originalCount: players.length,
        initializedCount: initializedPlayers.length,
        missingPlayers: players.filter(p => !initializedPlayers.find(ip => ip.id === p.id))
      });
    }

    // Update the tournament's players array
    tournament.players = initializedPlayers;

    // Generate first round pairings using enhanced algorithm
    console.log('🔄 Generating Swiss pairings for round 1...');
    try {
      const firstRound = EnhancedSwissPairingService.generateSwissPairings(initializedPlayers, 1, {
        allowRepeatPairings: false, // First round never needs repeat pairings
        maxPointSpread: 3 // Allow more flexibility in point spread
      });
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
      
      // Bye points will be awarded by the base tournament service
      if (firstRound.byePlayers && firstRound.byePlayers.length > 0) {
        console.log('ℹ️ Round 1 bye players identified:', firstRound.byePlayers.map(p => p.name));
        console.log('ℹ️ Bye points will be awarded by base tournament service');
      }
      
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
    match.isDraw = isDraw || result === 'draw';
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
      
      console.log('✅ Final player scores after update:', {
        player1: { id: player1.id, name: player1.name, points: player1.points, wins: player1.wins },
        player2: { id: player2.id, name: player2.name, points: player2.points, wins: player2.wins }
      });
    } else {
      console.error('❌ Could not find players in tournament.players array:', {
        match: { player1Id: match.player1.id, player2Id: match.player2.id },
        tournamentPlayers: tournament.players.map(p => ({ id: p.id, name: p.name }))
      });
    }

    console.log('🔍 Checking if round is complete...');
    // Mark round as complete if all matches are done (completed, forfeit, resolved, etc.)
    // Include ALL possible final statuses that indicate a match is finished
    // IMPORTANT: For guest matches, 'submitted' status from organizer should also be considered complete
    const finalStatuses = ['completed', 'forfeit', 'resolved', 'resolvedByCreator', 'submitted'];
    const allMatchesComplete = matchRound.matches.every(m => finalStatuses.includes(m.status));
    console.log('📊 Round completion status:', {
      roundNumber: matchRound.roundNumber,
      totalMatches: matchRound.matches.length,
      completedMatches: matchRound.matches.filter(m => finalStatuses.includes(m.status)).length,
      matchStatuses: matchRound.matches.map(m => ({ id: m.matchId, status: m.status })),
      allMatchesComplete,
      finalStatusesConsidered: finalStatuses
    });

    if (allMatchesComplete) {
      matchRound.isComplete = true;
      console.log('✅ Round marked as complete!');
      
      // Update Buchholz scores after round completion
      console.log('🔄 Updating Buchholz scores after round completion...');
      EnhancedSwissPairingService.updateBuchholzScores(tournament.players);
      console.log('✅ Buchholz scores updated:', tournament.players.map(p => ({ 
        name: p.name, 
        points: p.points || 0, 
        buchholz: p.buchholzScore || 0 
      })));
    }

    console.log('🔍 Final tournament state before return:', {
      playersWithScores: tournament.players.map(p => ({
        id: p.id,
        name: p.name,
        points: p.points || 0,
        wins: p.wins || 0,
        buchholz: p.buchholzScore || 0,
        opponents: (p.pastOpponents || []).length
      }))
    });
    
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
    console.log('🔍 Checking tournament completion:', {
      completedRoundNumber,
      numRounds: tournament.numRounds,
      totalRounds: tournament.rounds.length,
      comparison: `${completedRoundNumber} >= ${tournament.numRounds}`
    });
    
    if (completedRoundNumber >= (tournament.numRounds || 0)) {
      console.log('🏁 Tournament complete, calculating final standings');
      // Calculate Buchholz scores for final standings
      EnhancedSwissPairingService.updateBuchholzScores(tournament.players);
      
      const winner = this.getWinner(tournament);
      console.log('🏆 Winner determined:', { winnerId: winner?.id, winnerName: winner?.name });
      return {
        shouldAdvance: false,
        isComplete: true,
        winnerId: winner?.id
      };
    }

    console.log('🔄 Generating next round for Swiss tournament...');
    console.log('🏆 CRITICAL: In Swiss tournaments, ALL players continue to next round');
    console.log('📊 Tournament players:', {
      totalPlayers: tournament.players.length,
      playersWithPoints: tournament.players.filter(p => (p.points || 0) > 0).length,
      playersWithZeroPoints: tournament.players.filter(p => (p.points || 0) === 0).length,
      playerDetails: tournament.players.map(p => `${p.name}(${p.points || 0}pts)`)
    });
    
    // CRITICAL FIX: Ensure ALL players participate in Swiss tournament rounds
    // This is the key difference from Single Elimination tournaments
    
    // STEP 1: Calculate Buchholz scores after round completion
    console.log('🔄 STEP 1: Calculating Buchholz scores after Round', completedRoundNumber, 'completion...');
    EnhancedSwissPairingService.updateBuchholzScores(tournament.players);
    
    // STEP 2: Display current standings after all results processed
    console.log('📊 STEP 2: Current standings after Round', completedRoundNumber, 'completion:');
    const currentStandings = EnhancedSwissPairingService.calculateStandings(tournament.players);
    currentStandings.forEach((player, index) => {
      const byes = (player.pastOpponents || []).filter(o => o === 'BYE').length;
      console.log(`  ${index + 1}. ${player.name}: ${player.points || 0} pts, ${player.wins || 0} wins, ${player.buchholzScore || 0} bh, ${byes} byes, opponents: [${(player.pastOpponents || []).join(', ')}]`);
    });
    
    // STEP 3: Determine bye player BEFORE generating next round
    let byePlayer: ITournamentPlayer | null = null;
    if (tournament.players.length % 2 === 1) {
      console.log('🔄 STEP 3: Determining bye player for Round', completedRoundNumber + 1, 'based on completed results...');
      const selectedByePlayer = EnhancedSwissPairingService.selectByePlayer(currentStandings, completedRoundNumber + 1);
      
      if (selectedByePlayer) {
        // Find the actual player object from tournament.players array to ensure proper object reference
        byePlayer = tournament.players.find(p => p.id === selectedByePlayer.id) || null;
        
        if (byePlayer) {
          console.log('✅ Bye player determined and found in tournament players:', {
            name: byePlayer.name,
            id: byePlayer.id,
            points: byePlayer.points || 0,
            wins: byePlayer.wins || 0,
            buchholz: byePlayer.buchholzScore || 0,
            pastByes: (byePlayer.pastOpponents || []).filter(o => o === 'BYE').length,
            roundNumber: completedRoundNumber + 1
          });
        } else {
          console.error('❌ Selected bye player not found in tournament.players array!', {
            selectedPlayerId: selectedByePlayer.id,
            selectedPlayerName: selectedByePlayer.name,
            tournamentPlayerIds: tournament.players.map(p => ({ id: p.id, name: p.name }))
          });
        }
      } else {
        console.error('❌ Failed to determine bye player for odd number of players!');
      }
    }
    
    try {
      // STEP 4: Generate next round with pre-determined bye player
      console.log('🔄 STEP 4: Generating Round', completedRoundNumber + 1, 'with bye player already determined...');
      const nextRound = EnhancedSwissPairingService.generateSwissPairings(
        tournament.players, // Pass ALL tournament players
        completedRoundNumber + 1, 
        {
          allowRepeatPairings: false, // NEVER allow repeat pairings in Swiss tournaments
          maxPointSpread: 3, // Allow more flexibility in point spread for fair tournament
          predeterminedByePlayer: byePlayer // Pass the pre-determined bye player
        }
      );
      
      // Validate that we have the correct number of matches for ALL players
      const expectedMatches = Math.floor(tournament.players.length / 2);
      const totalPlayersInRound = (nextRound.matches.length * 2) + (nextRound.byePlayers?.length || 0);
      
      console.log('✅ Swiss round validation:', {
        roundNumber: nextRound.roundNumber,
        totalPlayers: tournament.players.length,
        matchCount: nextRound.matches.length,
        expectedMatches,
        byePlayers: nextRound.byePlayers?.length || 0,
        totalPlayersInRound,
        allPlayersAccountedFor: totalPlayersInRound === tournament.players.length
      });
      
      if (totalPlayersInRound !== tournament.players.length) {
        console.error('❌ SWISS TOURNAMENT WARNING: Not all players were paired!');
        console.error('Missing players:', tournament.players.length - totalPlayersInRound);
        console.error('This may happen in edge cases where no valid pairings exist.');
        // Don't throw error - let the pairing algorithm handle edge cases
      }
      
      if (nextRound.matches.length !== expectedMatches) {
        console.warn('⚠️ Swiss tournament match count mismatch:', {
          actual: nextRound.matches.length,
          expected: expectedMatches,
          reason: tournament.players.length % 2 === 1 ? 'Odd number of players (bye assigned)' : 'Unknown'
        });
      }
      
      console.log('🎯 Swiss round generated successfully:', {
        roundNumber: nextRound.roundNumber,
        matchCount: nextRound.matches.length,
        byePlayers: nextRound.byePlayers?.length || 0,
        playerCount: tournament.players.length,
        matches: nextRound.matches.map(m => `${m.player1.name} vs ${m.player2.name}`)
      });
      
      // NOTE: Bye points are awarded when the round is created, not during advancement
      // This prevents double-awarding of bye points
      if (nextRound.byePlayers && nextRound.byePlayers.length > 0) {
        console.log('ℹ️ Round', nextRound.roundNumber, 'bye players identified:', nextRound.byePlayers.map(p => p.name));
        console.log('ℹ️ Bye points will be awarded when the round is processed by tournament service');
      }
      
      return {
        shouldAdvance: true,
        nextRound: nextRound
      };
    } catch (error) {
      console.error('❌ Error generating Swiss tournament round:', error);
      console.error('Tournament state:', {
        players: tournament.players.length,
        completedRound: completedRoundNumber,
        targetRound: completedRoundNumber + 1
      });
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

    console.log('🔍 Checking if Swiss tournament is complete:', {
      isStarted: tournament.isStarted,
      roundsCount: tournament.rounds.length,
      numRounds: tournament.numRounds,
      lastRoundComplete: tournament.rounds.length > 0 ? tournament.rounds[tournament.rounds.length - 1].isComplete : false,
      condition1: tournament.rounds.length >= (tournament.numRounds || 0),
      condition2: tournament.rounds.length > 0 && tournament.rounds[tournament.rounds.length - 1].isComplete === true
    });

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
    console.log('🔍 ValidateMatchResult called with:', {
      result: options.result,
      isDraw: options.isDraw,
      winnerId: options.winnerId,
      loserId: options.loserId
    });

    // Check if it's a draw first (highest priority check)
    if (options.result === 'draw' || options.isDraw === true) {
      console.log('✅ Draw match validation passed - no winner/loser required');
      return;
    }

    // For non-draw matches, validate we have proper result data
    if (!options.result && !options.winnerId) {
      throw new BadRequestException('Swiss tournament matches must have a result (win, loss, or draw) or winner/loser specified');
    }

    // If we have winner/loser, validate they're different
    if (options.winnerId && options.loserId) {
      if (options.winnerId === options.loserId) {
        throw new BadRequestException('Winner and loser cannot be the same player');
      }
    }

    // If it's a non-draw result but we don't have winner/loser, that's also valid
    // (the processing logic will determine winner/loser from the result)
    console.log('✅ Match result validation passed');
  }
}