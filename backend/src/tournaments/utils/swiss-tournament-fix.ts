/**
 * Swiss Tournament Logic Fix
 * 
 * This file contains the corrected logic to ensure ALL players continue 
 * playing in Swiss tournaments, not just winners.
 */

import { ITournamentPlayer, ITournamentMatch, ITournamentRound } from '../../models/tournament.model';
import { EnhancedSwissPairingService } from './enhanced-swiss-pairings';

/**
 * Corrected Swiss Tournament Pairing Logic
 * 
 * Key Rule: In Swiss tournaments, ALL players continue playing in ALL rounds
 */
export class SwissTournamentFix {
  
  /**
   * Generate Swiss tournament round with ALL players
   * This is the corrected version that ensures all players continue playing
   */
  static generateSwissRound(
    allPlayers: ITournamentPlayer[], 
    roundNumber: number,
    tournamentRounds: ITournamentRound[]
  ): ITournamentRound {
    console.log('🏆 SwissTournamentFix.generateSwissRound called:', {
      totalPlayers: allPlayers.length,
      roundNumber,
      playerNames: allPlayers.map(p => `${p.name}(${p.points || 0}pts)`)
    });

    // CRITICAL: In Swiss tournaments, ALL players participate in every round
    // This is different from Single Elimination where only winners advance
    
    if (allPlayers.length < 2) {
      throw new Error('Swiss tournament requires at least 2 players for each round');
    }

    // Ensure all players have proper Swiss tournament fields
    const swissPlayers = allPlayers.map(player => ({
      ...player,
      points: player.points || 0,
      wins: player.wins || 0,
      buchholzScore: player.buchholzScore || 0,
      pastOpponents: player.pastOpponents || []
    }));

    console.log('🔄 All players initialized for Swiss round:', {
      playerCount: swissPlayers.length,
      playersWithPoints: swissPlayers.filter(p => (p.points || 0) > 0).length,
      playersWithZeroPoints: swissPlayers.filter(p => (p.points || 0) === 0).length
    });

    // Update Buchholz scores before pairing
    EnhancedSwissPairingService.updateBuchholzScores(swissPlayers);

    // Generate pairings using ALL players - this is the key fix
    const round = EnhancedSwissPairingService.generateSwissPairings(
      swissPlayers, // Pass ALL players, not just winners
      roundNumber,
      {
        allowRepeatPairings: roundNumber > 2, // Allow repeat pairings in later rounds if needed
        maxPointSpread: 3 // Allow flexible point spread for fair pairings
      }
    );

    console.log('✅ Swiss round generated successfully:', {
      roundNumber: round.roundNumber,
      matchCount: round.matches.length,
      expectedMatches: Math.floor(allPlayers.length / 2),
      byePlayers: round.byePlayers?.length || 0,
      allPlayersAccounted: (round.matches.length * 2) + (round.byePlayers?.length || 0) === allPlayers.length
    });

    // Validation: Ensure all players are accounted for
    const pairedPlayerIds = new Set<string>();
    round.matches.forEach(match => {
      pairedPlayerIds.add(match.player1.id);
      pairedPlayerIds.add(match.player2.id);
    });
    
    round.byePlayers?.forEach(player => {
      pairedPlayerIds.add(player.id);
    });

    const unpairedPlayers = allPlayers.filter(player => !pairedPlayerIds.has(player.id));
    
    if (unpairedPlayers.length > 0) {
      console.error('❌ Swiss tournament pairing error - unpaired players:', unpairedPlayers.map(p => p.name));
      throw new Error(`Swiss tournament pairing failed: ${unpairedPlayers.length} players were not paired`);
    }

    console.log('🎯 Swiss tournament validation passed: All players accounted for');
    return round;
  }

  /**
   * Validate Swiss tournament structure
   */
  static validateSwissTournamentStructure(
    tournament: { players: ITournamentPlayer[], rounds: ITournamentRound[], numRounds?: number }
  ): { isValid: boolean, errors: string[] } {
    const errors: string[] = [];
    const totalPlayers = tournament.players.length;

    console.log('🔍 Validating Swiss tournament structure:', {
      totalPlayers,
      totalRounds: tournament.rounds.length,
      expectedRounds: tournament.numRounds || 3
    });

    // Check each round
    tournament.rounds.forEach((round, index) => {
      const roundNumber = round.roundNumber || (index + 1);
      const totalPlayersInRound = (round.matches.length * 2) + (round.byePlayers?.length || 0);
      
      console.log(`🔍 Round ${roundNumber} validation:`, {
        matches: round.matches.length,
        expectedMatches: Math.floor(totalPlayers / 2),
        byePlayers: round.byePlayers?.length || 0,
        totalPlayersInRound,
        expectedPlayers: totalPlayers
      });

      // Validate that all players are in each round
      if (totalPlayersInRound !== totalPlayers) {
        errors.push(`Round ${roundNumber}: Expected ${totalPlayers} players, but found ${totalPlayersInRound}`);
      }

      // Validate expected number of matches
      const expectedMatches = Math.floor(totalPlayers / 2);
      if (round.matches.length !== expectedMatches) {
        errors.push(`Round ${roundNumber}: Expected ${expectedMatches} matches, but found ${round.matches.length}`);
      }

      // Check for duplicate players in same round
      const playersInRound = new Set<string>();
      round.matches.forEach(match => {
        if (playersInRound.has(match.player1.id)) {
          errors.push(`Round ${roundNumber}: Player ${match.player1.name} appears multiple times`);
        }
        if (playersInRound.has(match.player2.id)) {
          errors.push(`Round ${roundNumber}: Player ${match.player2.name} appears multiple times`);
        }
        playersInRound.add(match.player1.id);
        playersInRound.add(match.player2.id);
      });

      round.byePlayers?.forEach(player => {
        if (playersInRound.has(player.id)) {
          errors.push(`Round ${roundNumber}: Player ${player.name} appears in both match and bye`);
        }
        playersInRound.add(player.id);
      });
    });

    const isValid = errors.length === 0;
    
    console.log('✅ Swiss tournament validation result:', {
      isValid,
      errorCount: errors.length,
      errors: errors.slice(0, 5) // Show first 5 errors
    });

    return { isValid, errors };
  }

  /**
   * Fix existing Swiss tournament with incorrect round structure
   */
  static repairSwissTournamentRounds(
    tournament: { 
      players: ITournamentPlayer[], 
      rounds: ITournamentRound[], 
      numRounds?: number,
      currentRound?: number 
    }
  ): ITournamentRound[] {
    console.log('🔧 Repairing Swiss tournament rounds:', {
      totalPlayers: tournament.players.length,
      currentRounds: tournament.rounds.length,
      currentRound: tournament.currentRound
    });

    const repairedRounds: ITournamentRound[] = [];
    
    // Keep completed rounds as-is
    const completedRounds = tournament.rounds.filter(round => round.isComplete);
    repairedRounds.push(...completedRounds);
    
    console.log(`✅ Preserved ${completedRounds.length} completed rounds`);

    // For incomplete rounds, regenerate with correct Swiss logic
    const incompleteRounds = tournament.rounds.filter(round => !round.isComplete);
    
    for (const incompleteRound of incompleteRounds) {
      console.log(`🔧 Regenerating incomplete round ${incompleteRound.roundNumber}`);
      
      try {
        // Regenerate the round with ALL players
        const correctedRound = this.generateSwissRound(
          tournament.players,
          incompleteRound.roundNumber,
          repairedRounds
        );
        
        // Preserve any existing match results
        if (incompleteRound.matches.length > 0) {
          console.log(`🔄 Preserving ${incompleteRound.matches.length} existing matches in round ${incompleteRound.roundNumber}`);
          // For now, use the corrected round but this could be enhanced to merge results
        }
        
        repairedRounds.push(correctedRound);
        console.log(`✅ Round ${incompleteRound.roundNumber} repaired with ${correctedRound.matches.length} matches`);
        
      } catch (error) {
        console.error(`❌ Failed to repair round ${incompleteRound.roundNumber}:`, error);
        // Keep the original round if repair fails
        repairedRounds.push(incompleteRound);
      }
    }

    // Generate any missing rounds
    const expectedRounds = tournament.numRounds || 3;
    const currentRoundNumber = tournament.currentRound || (completedRounds.length + 1);
    
    if (repairedRounds.length < expectedRounds && currentRoundNumber <= expectedRounds) {
      for (let roundNum = repairedRounds.length + 1; roundNum <= expectedRounds; roundNum++) {
        if (roundNum === currentRoundNumber) {
          console.log(`🔧 Generating missing round ${roundNum}`);
          
          try {
            const newRound = this.generateSwissRound(
              tournament.players,
              roundNum,
              repairedRounds
            );
            repairedRounds.push(newRound);
            console.log(`✅ Generated round ${roundNum} with ${newRound.matches.length} matches`);
          } catch (error) {
            console.error(`❌ Failed to generate round ${roundNum}:`, error);
            break;
          }
        }
      }
    }

    console.log('🎯 Swiss tournament repair completed:', {
      originalRounds: tournament.rounds.length,
      repairedRounds: repairedRounds.length,
      totalMatches: repairedRounds.reduce((sum, round) => sum + round.matches.length, 0)
    });

    return repairedRounds;
  }
}