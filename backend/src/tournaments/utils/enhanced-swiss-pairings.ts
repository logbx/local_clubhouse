import { v4 as uuidv4 } from 'uuid';
import { ITournamentPlayer, ITournamentMatch, ITournamentRound } from '../../models/tournament.model';

/**
 * Enhanced Swiss pairing algorithm with better opponent history tracking and pairing logic
 */

export interface PairingOptions {
  allowRepeatPairings?: boolean; // Allow repeat pairings if necessary
  preferColorBalance?: boolean; // For games with colors (chess, etc.)
  maxPointSpread?: number; // Maximum point difference allowed in pairing
  predeterminedByePlayer?: ITournamentPlayer | null; // Pre-determined bye player
}

export class EnhancedSwissPairingService {
  /**
   * Validate opponent history consistency
   */
  private static validateOpponentHistory(players: ITournamentPlayer[]): void {
    console.log('🔍 Validating opponent history for', players.length, 'players');
    
    for (const player of players) {
      console.log(`Player ${player.name}:`, {
        id: player.id,
        pastOpponents: player.pastOpponents || [],
        points: player.points || 0
      });
    }
    
    // Check for symmetry - if A played B, then B should have played A
    const errors: string[] = [];
    for (const player of players) {
      const playerOpponents = player.pastOpponents || [];
      for (const opponentId of playerOpponents) {
        if (opponentId === 'BYE') continue;
        
        const opponent = players.find(p => p.id === opponentId);
        if (opponent) {
          const opponentPastOpponents = opponent.pastOpponents || [];
          if (!opponentPastOpponents.includes(player.id)) {
            errors.push(`Asymmetry: ${player.name} played ${opponent.name}, but ${opponent.name} doesn't have ${player.name} in history`);
          }
        }
      }
    }
    
    if (errors.length > 0) {
      console.error('❌ Opponent history validation errors:', errors);
    } else {
      console.log('✅ Opponent history validation passed');
    }
  }

  /**
   * Generate optimized pairings for a Swiss tournament round
   */
  static generateSwissPairings(
    players: ITournamentPlayer[], 
    roundNumber: number, 
    options: PairingOptions = {}
  ): ITournamentRound {
    console.log('🎯 EnhancedSwissPairingService.generateSwissPairings called:', {
      playerCount: players.length,
      roundNumber,
      options: { ...options, predeterminedByePlayer: options.predeterminedByePlayer?.name || null }
    });

    // Validate opponent history before generating pairings
    this.validateOpponentHistory(players);

    const {
      allowRepeatPairings = false,
      maxPointSpread = 2,
      predeterminedByePlayer = null
    } = options;

    // Ensure all players have initialized Swiss fields
    console.log('🔍 Input players structure:', players.map(p => ({
      id: p.id,
      name: p.name,
      points: p.points,
      hasToObject: typeof (p as any)?.toObject === 'function'
    })));

    const initializedPlayers = players.map((player, index) => {
      // Handle Mongoose documents that have toObject method
      const basePlayer = (player as any).toObject ? (player as any).toObject() : player;
      
      const initialized = {
        ...basePlayer,
        id: basePlayer.id || basePlayer._id,
        name: basePlayer.name,
        points: basePlayer.points || 0,
        wins: basePlayer.wins || 0,
        buchholzScore: basePlayer.buchholzScore || 0,
        pastOpponents: basePlayer.pastOpponents || []
      };
      
      // Log opponent history for debugging
      if (initialized.pastOpponents.length > 0) {
        console.log(`  ${initialized.name} has played: [${initialized.pastOpponents.join(', ')}]`);
      }

      // CRITICAL VALIDATION: Ensure each player has required fields
      if (!initialized.id || !initialized.name) {
        console.error(`❌ INVALID PLAYER at index ${index}:`, {
          original: player,
          basePlayer,
          initialized,
          hasId: !!initialized.id,
          hasName: !!initialized.name
        });
        throw new Error(`Player at index ${index} is missing required fields (id: ${!!initialized.id}, name: ${!!initialized.name})`);
      }

      return initialized;
    });

    console.log('✅ Players initialized in pairing service:', initializedPlayers.map(p => ({
      id: p.id,
      name: p.name,
      points: p.points
    })));

    // Sort players by Swiss ranking
    console.log('🔄 Sorting players by Swiss ranking...');
    const sortedPlayers = this.sortPlayersBySwissRanking(initializedPlayers);
    console.log('✅ Players sorted');
    
    const matches: ITournamentMatch[] = [];
    const paired = new Set<string>();
    let byePlayers: ITournamentPlayer[] | undefined;

    // Handle bye player first (odd number of players)
    if (sortedPlayers.length % 2 === 1) {
      if (predeterminedByePlayer) {
        // Use predetermined bye player (calculated after previous round completion)
        console.log('✅ Using predetermined bye player:', {
          name: predeterminedByePlayer.name,
          points: predeterminedByePlayer.points || 0,
          wins: predeterminedByePlayer.wins || 0,
          buchholz: predeterminedByePlayer.buchholzScore || 0,
          roundNumber
        });
        
        // Find the actual player object in the initialized players array
        console.log('🔍 Searching for bye player:', { 
          predeterminedId: predeterminedByePlayer.id,
          predeterminedName: predeterminedByePlayer.name,
          availablePlayerIds: initializedPlayers.map(p => ({ id: p.id, name: p.name }))
        });
        
        const originalByePlayer = initializedPlayers.find(p => p.id === predeterminedByePlayer.id);
        if (originalByePlayer) {
          byePlayers = [originalByePlayer];
          paired.add(originalByePlayer.id);
          
          console.log('✅ Bye player identified for round generation:', {
            name: originalByePlayer.name,
            currentPoints: originalByePlayer.points,
            currentByes: (originalByePlayer.pastOpponents || []).filter((o: string) => o === 'BYE').length,
            roundNumber,
            note: 'Bye points will be awarded after round creation'
          });
        } else {
          console.error('❌ Could not find predetermined bye player in initialized players array');
          console.error('🔍 Debug info:', {
            predeterminedByePlayer: {
              id: predeterminedByePlayer.id,
              name: predeterminedByePlayer.name,
              type: typeof predeterminedByePlayer.id
            },
            initializedPlayerIds: initializedPlayers.map(p => ({
              id: p.id,
              name: p.name,
              type: typeof p.id,
              matches: p.id === predeterminedByePlayer.id
            }))
          });
          
          // Try to find by name as fallback
          const fallbackByePlayer = initializedPlayers.find(p => p.name === predeterminedByePlayer.name);
          if (fallbackByePlayer) {
            console.log('🔧 Using fallback bye player match by name:', fallbackByePlayer.name);
            byePlayers = [fallbackByePlayer];
            paired.add(fallbackByePlayer.id);
            
            console.log('✅ Fallback bye player identified for round generation:', {
              name: fallbackByePlayer.name,
              currentPoints: fallbackByePlayer.points,
              currentByes: (fallbackByePlayer.pastOpponents || []).filter((o: string) => o === 'BYE').length,
              roundNumber,
              note: 'Bye points will be awarded after round creation'
            });
          }
        }
      } else {
        // Fallback: Calculate bye player inline (for first round or emergency cases)
        console.log('⚠️ No predetermined bye player - calculating inline (should only happen for Round 1)');
        
        // Recalculate Buchholz scores first to ensure accurate standings
        this.updateBuchholzScores(sortedPlayers);
        
        // Re-sort players based on current standings (after Buchholz update)
        const currentStandings = this.sortPlayersBySwissRanking(sortedPlayers);
        
        console.log('🔄 Current standings for bye selection:', currentStandings.map((p, index) => ({
          rank: index + 1,
          name: p.name,
          points: p.points || 0,
          wins: p.wins || 0,
          buchholz: p.buchholzScore || 0,
          byes: (p.pastOpponents || []).filter(o => o === 'BYE').length
        })));
        
        const byePlayer = this.selectByePlayer(currentStandings, roundNumber);
        if (byePlayer) {
          // Find the actual player object in the original players array
          const originalByePlayer = initializedPlayers.find(p => p.id === byePlayer.id);
          if (originalByePlayer) {
            byePlayers = [originalByePlayer];
            paired.add(originalByePlayer.id);
            
            console.log('✅ Bye player identified (inline):', {
              name: originalByePlayer.name,
              currentPoints: originalByePlayer.points,
              currentByes: (originalByePlayer.pastOpponents || []).filter((o: string) => o === 'BYE').length,
              reason: 'Dynamic selection based on current standings',
              note: 'Bye points will be awarded after round creation'
            });
          }
        }
      }
    }

    // CRITICAL: Get players available for pairing (excluding bye player)
    const playersForPairing = sortedPlayers.filter(p => !paired.has(p.id));
    console.log('🎯 Players available for pairing:', {
      total: playersForPairing.length,
      players: playersForPairing.map(p => `${p.name}(${p.points || 0}pts)`)
    });

    // Generate pairings using Swiss algorithm
    const pairings = this.generateOptimalPairings(
      playersForPairing,
      allowRepeatPairings,
      maxPointSpread
    );

    console.log('🔍 Generated pairings:', {
      pairingCount: pairings.length,
      expectedPairings: Math.floor(playersForPairing.length / 2),
      pairings: pairings.map(([p1, p2]) => `${p1.name} vs ${p2.name}`)
    });

    // VALIDATION: Ensure we have the expected number of pairings
    const expectedPairings = Math.floor(playersForPairing.length / 2);
    if (pairings.length !== expectedPairings) {
      console.error('❌ PAIRING MISMATCH:', {
        expected: expectedPairings,
        actual: pairings.length,
        availablePlayers: playersForPairing.length,
        playersNotPaired: playersForPairing.length - (pairings.length * 2)
      });
    }

    // Validate we have enough pairings
    const totalPairedPlayers = pairings.length * 2;
    const totalByePlayers = byePlayers?.length || 0;
    const totalAccountedPlayers = totalPairedPlayers + totalByePlayers;
    
    if (totalAccountedPlayers < players.length) {
      const unpairedCount = players.length - totalAccountedPlayers;
      console.error(`❌ PAIRING ERROR: ${unpairedCount} players could not be paired!`);
      console.error('Total players:', players.length);
      console.error('Paired players:', totalPairedPlayers);
      console.error('Bye players:', totalByePlayers);
      console.error('Pairings generated:', pairings.map(([p1, p2]) => `${p1.name} vs ${p2.name}`));
      
      // Try to identify unpaired players
      const pairedPlayerIds = new Set<string>();
      pairings.forEach(([p1, p2]) => {
        pairedPlayerIds.add(p1.id);
        pairedPlayerIds.add(p2.id);
      });
      byePlayers?.forEach(p => pairedPlayerIds.add(p.id));
      
      const unpairedPlayers = players.filter(p => !pairedPlayerIds.has(p.id));
      console.error('Unpaired players:', unpairedPlayers.map(p => ({
        name: p.name,
        points: p.points || 0,
        pastOpponents: p.pastOpponents || []
      })));
      
      throw new Error(`Swiss pairing failed: ${unpairedCount} players could not be paired. This may be due to all possible opponents having already played each other.`);
    }

    // Create match objects
    for (const [player1, player2] of pairings) {
      const match: ITournamentMatch = {
        matchId: uuidv4(),
        player1,
        player2,
        status: 'pending',
        resultReportedBy: [],
        round: roundNumber
      };

      matches.push(match);
      
      // NOTE: Past opponents are updated when match results are processed, not during pairing generation
      // This ensures opponent history is only updated for matches that are actually played
    }

    return {
      roundNumber,
      matches,
      byePlayers,
      isComplete: false
    };
  }

  /**
   * Sort players by Swiss tournament ranking criteria
   */
  private static sortPlayersBySwissRanking(players: ITournamentPlayer[]): ITournamentPlayer[] {
    return [...players].sort((a, b) => {
      // 1. Sort by points (highest first)
      const pointsDiff = (b.points || 0) - (a.points || 0);
      if (pointsDiff !== 0) return pointsDiff;

      // 2. Sort by Buchholz score (sum of opponents' scores)
      const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
      if (buchholzDiff !== 0) return buchholzDiff;

      // 3. Sort by number of wins
      const winsDiff = (b.wins || 0) - (a.wins || 0);
      if (winsDiff !== 0) return winsDiff;

      // 4. Sort alphabetically by name as final tiebreaker
      return (a.name || '').localeCompare(b.name || '');
    });
  }

  /**
   * Select the best candidate for a bye following exact Swiss tournament rules:
   * 
   * CRITICAL: This should only be called AFTER round results are fully processed
   * 
   * Priority order (strictly enforced):
   * 1. EXCLUDE players who received a bye in previous rounds
   * 2. Among remaining players: Lowest points
   * 3. If tied on points: Lowest Buchholz
   * 4. If tied on points + Buchholz: Lowest wins
   * 5. If tied on points + Buchholz + wins: Random selection
   */
  static selectByePlayer(sortedPlayers: ITournamentPlayer[], roundNumber: number): ITournamentPlayer | null {
    if (sortedPlayers.length === 0) return null;

    // For first round, use completely random selection
    if (roundNumber === 1) {
      const randomIndex = Math.floor(Math.random() * sortedPlayers.length);
      const randomPlayer = sortedPlayers[randomIndex];
      console.log('🎲 Round 1 - Random bye selection:', {
        name: randomPlayer.name,
        randomIndex,
        totalPlayers: sortedPlayers.length,
        reason: 'First round random selection (no previous results to evaluate)'
      });
      return randomPlayer;
    }

    console.log('🔄 Evaluating bye selection after Round', roundNumber - 1, 'results...');

    // Step 1: Calculate bye history for each player
    const playersWithByeHistory = sortedPlayers.map(player => {
      const byeCount = (player.pastOpponents || []).filter(opponent => opponent === 'BYE').length;
      return {
        player,
        byeCount,
        hasHadBye: byeCount > 0
      };
    });

    console.log('📊 Complete player analysis for Round', roundNumber, 'bye selection:', 
      playersWithByeHistory.map(p => ({ 
        name: p.player.name, 
        points: p.player.points || 0, 
        wins: p.player.wins || 0,
        buchholz: p.player.buchholzScore || 0,
        byeCount: p.byeCount,
        hasHadBye: p.hasHadBye,
        pastOpponents: p.player.pastOpponents || []
      })));

    // Step 2: EXCLUDE players who have already received a bye
    const playersWithoutByes = playersWithByeHistory.filter(p => !p.hasHadBye);
    
    console.log('🚫 After excluding players with previous byes:', {
      totalPlayers: playersWithByeHistory.length,
      playersWithByes: playersWithByeHistory.length - playersWithoutByes.length,
      remainingCandidates: playersWithoutByes.length,
      excludedPlayers: playersWithByeHistory
        .filter(p => p.hasHadBye)
        .map(p => ({ name: p.player.name, byeCount: p.byeCount })),
      candidatePlayers: playersWithoutByes.map(p => p.player.name)
    });

    // CRITICAL: If all players have had byes, this is a tournament configuration error
    if (playersWithoutByes.length === 0) {
      console.error('❌ TOURNAMENT CONFIGURATION ERROR: All players have already received byes!');
      console.error('This should not happen in a properly configured Swiss tournament.');
      console.error('Players with byes:', playersWithByeHistory.map(p => ({ 
        name: p.player.name, 
        byeCount: p.byeCount 
      })));
      throw new Error('Tournament configuration error: All players have already received byes. Swiss tournaments should not have more rounds than can accommodate unique bye assignments.');
    }
    
    // Use only players who have NOT had any byes
    const byeCandidates = playersWithoutByes;

    // Step 3: Sort by Swiss bye priority among candidates without previous byes
    // Priority: Lowest points → Lowest Buchholz → Lowest wins → Random
    const sortedCandidates = byeCandidates.sort((a, b) => {
      // 1. Lowest points first (weakest current performance)
      const pointsDiff = (a.player.points || 0) - (b.player.points || 0);
      if (pointsDiff !== 0) {
        console.log(`Points comparison: ${a.player.name}(${a.player.points || 0}) vs ${b.player.name}(${b.player.points || 0}) = ${pointsDiff}`);
        return pointsDiff;
      }
      
      // 2. Lowest Buchholz score (faced weakest opponents)
      const buchholzDiff = (a.player.buchholzScore || 0) - (b.player.buchholzScore || 0);
      if (buchholzDiff !== 0) {
        console.log(`Buchholz comparison: ${a.player.name}(${a.player.buchholzScore || 0}) vs ${b.player.name}(${b.player.buchholzScore || 0}) = ${buchholzDiff}`);
        return buchholzDiff;
      }
      
      // 3. Lowest wins
      const winsDiff = (a.player.wins || 0) - (b.player.wins || 0);
      if (winsDiff !== 0) {
        console.log(`Wins comparison: ${a.player.name}(${a.player.wins || 0}) vs ${b.player.name}(${b.player.wins || 0}) = ${winsDiff}`);
        return winsDiff;
      }
      
      // 4. Random selection among tied players
      console.log(`All tiebreakers equal for ${a.player.name} vs ${b.player.name} - using random`);
      return Math.random() - 0.5;
    });
    
    const selectedCandidate = sortedCandidates[0];
    
    if (selectedCandidate) {
      const reason = this.getByeSelectionReason(selectedCandidate, sortedCandidates);
      
      console.log('✅ Round', roundNumber, 'bye player selected:', {
        name: selectedCandidate.player.name,
        points: selectedCandidate.player.points || 0,
        wins: selectedCandidate.player.wins || 0,
        buchholz: selectedCandidate.player.buchholzScore || 0,
        byeCount: selectedCandidate.byeCount,
        reason: reason,
        selectionProcess: 'Excluded previous bye recipients → Lowest points → Lowest Buchholz → Lowest wins → Random',
        totalCandidates: sortedCandidates.length,
        allCandidates: sortedCandidates.slice(0, 5).map(c => ({
          name: c.player.name,
          points: c.player.points || 0,
          buchholz: c.player.buchholzScore || 0,
          wins: c.player.wins || 0
        }))
      });
      return selectedCandidate.player;
    }

    console.error('❌ No bye candidate found!');
    return null;
  }

  /**
   * Generate reason string for bye selection decision
   */
  private static getByeSelectionReason(selected: any, allCandidates: any[]): string {
    if (selected.byeCount > 0) {
      return `Had ${selected.byeCount} previous byes but was best available candidate`;
    }

    const samePointsCandidates = allCandidates.filter(c => 
      (c.player.points || 0) === (selected.player.points || 0)
    );

    if (samePointsCandidates.length === 1) {
      return `Unique lowest points (${selected.player.points || 0}) among non-bye players`;
    }

    const sameBuchholzCandidates = samePointsCandidates.filter(c => 
      (c.player.buchholzScore || 0) === (selected.player.buchholzScore || 0)
    );

    if (sameBuchholzCandidates.length === 1) {
      return `Tied points (${selected.player.points || 0}), unique lowest Buchholz (${selected.player.buchholzScore || 0})`;
    }

    const sameWinsCandidates = sameBuchholzCandidates.filter(c => 
      (c.player.wins || 0) === (selected.player.wins || 0)
    );

    if (sameWinsCandidates.length === 1) {
      return `Tied points/Buchholz, unique lowest wins (${selected.player.wins || 0})`;
    }

    return `Tied on all criteria (Points: ${selected.player.points || 0}, Buchholz: ${selected.player.buchholzScore || 0}, Wins: ${selected.player.wins || 0}) - random selection among ${sameWinsCandidates.length} players`;
  }

  /**
   * Generate optimal pairings using Swiss system principles
   */
  private static generateOptimalPairings(
    players: ITournamentPlayer[],
    allowRepeatPairings: boolean,
    maxPointSpread: number
  ): [ITournamentPlayer, ITournamentPlayer][] {
    console.log('🎯 generateOptimalPairings called with:', {
      playerCount: players.length,
      allowRepeatPairings,
      maxPointSpread,
      players: players.map(p => ({ id: p.id, name: p.name, points: p.points }))
    });

    // CRITICAL VALIDATION: Ensure all players have valid structure
    const validPlayers = players.filter(player => 
      player && player.id && player.name && typeof player.id === 'string'
    );
    
    if (validPlayers.length !== players.length) {
      console.error('❌ INVALID PLAYERS DETECTED:', {
        original: players.length,
        valid: validPlayers.length,
        invalid: players.filter(p => !p || !p.id || !p.name || typeof p.id !== 'string')
      });
      throw new Error(`Invalid players detected: ${players.length - validPlayers.length} players have missing id or name`);
    }

    const pairings: [ITournamentPlayer, ITournamentPlayer][] = [];
    const available = new Set(validPlayers.map(p => p.id));

    // Group players by point totals
    const pointGroups = this.groupPlayersByPoints(validPlayers);
    
    // Pair within point groups first, then across groups if necessary
    console.log('🔍 Point groups:', Array.from(pointGroups.entries()).map(([points, groupPlayers]) => ({ 
      points, 
      playerCount: groupPlayers.length,
      players: groupPlayers.map(p => `${p.name}(${p.id})`)
    })));
    
    for (const [points, playersInGroup] of pointGroups) {
      console.log(`🔄 Processing point group ${points} with ${playersInGroup.length} players`);
      this.pairWithinGroup(playersInGroup, available, pairings, allowRepeatPairings);
      console.log(`✅ After processing group ${points}: ${pairings.length} pairings, ${available.size} players remaining`);
    }

    // Handle any remaining unpaired players by pairing across point groups
    const remainingPlayers = validPlayers.filter(p => available.has(p.id));
    console.log(`🔄 Cross-group pairing for ${remainingPlayers.length} remaining players:`, 
      remainingPlayers.map(p => `${p.name}(${p.points || 0}pts,id:${p.id})`));
    this.pairAcrossGroups(remainingPlayers, available, pairings, allowRepeatPairings, maxPointSpread);
    console.log(`✅ Final result: ${pairings.length} pairings total`);

    // VALIDATION: Verify all pairings have valid players
    for (let i = 0; i < pairings.length; i++) {
      const [p1, p2] = pairings[i];
      if (!p1 || !p2 || !p1.id || !p2.id || !p1.name || !p2.name) {
        console.error(`❌ INVALID PAIRING DETECTED at index ${i}:`, { p1, p2 });
        throw new Error(`Invalid pairing generated: players missing id or name`);
      }
    }

    // VALIDATION: Check for repeat pairings
    let repeatPairingsFound = false;
    const repeatPairings: string[] = [];
    
    for (const [p1, p2] of pairings) {
      if (p1.pastOpponents?.includes(p2.id)) {
        repeatPairingsFound = true;
        repeatPairings.push(`${p1.name} vs ${p2.name}`);
        console.warn(`⚠️ REPEAT PAIRING DETECTED: ${p1.name} vs ${p2.name}`);
        console.warn(`  ${p1.name}'s past opponents:`, p1.pastOpponents);
        console.warn(`  ${p2.name}'s past opponents:`, p2.pastOpponents);
      }
    }
    
    if (!allowRepeatPairings && repeatPairingsFound) {
      console.error('❌ CRITICAL: Repeat pairings detected in Swiss tournament!');
      console.error('Repeat pairings:', repeatPairings);
      
      // Log full opponent history for debugging
      for (const [p1, p2] of pairings) {
        if (p1.pastOpponents?.includes(p2.id)) {
          console.error(`\nRepeat pairing details:`);
          console.error(`  ${p1.name} (${p1.id}):`);
          console.error(`    Past opponents: [${(p1.pastOpponents || []).join(', ')}]`);
          console.error(`    Points: ${p1.points || 0}`);
          console.error(`  ${p2.name} (${p2.id}):`);
          console.error(`    Past opponents: [${(p2.pastOpponents || []).join(', ')}]`);
          console.error(`    Points: ${p2.points || 0}`);
        }
      }
      
      // In some edge cases with odd numbers and limited rounds, repeat pairings might be unavoidable
      // Log the issue but allow the tournament to continue
      console.error('⚠️ WARNING: Swiss tournament has repeat pairings - this should be avoided but may be unavoidable in some edge cases');
      console.error('Consider adding more players or reducing the number of rounds to prevent this.');
    } else if (!repeatPairingsFound) {
      console.log('✅ No repeat pairings detected - all pairings are unique');
    }

    return pairings;
  }

  /**
   * Group players by their point totals
   */
  private static groupPlayersByPoints(players: ITournamentPlayer[]): Map<number, ITournamentPlayer[]> {
    const groups = new Map<number, ITournamentPlayer[]>();
    
    for (const player of players) {
      const points = player.points || 0;
      if (!groups.has(points)) {
        groups.set(points, []);
      }
      groups.get(points)!.push(player);
    }

    return groups;
  }

  /**
   * Pair players within the same point group
   */
  private static pairWithinGroup(
    players: ITournamentPlayer[],
    available: Set<string>,
    pairings: [ITournamentPlayer, ITournamentPlayer][],
    allowRepeatPairings: boolean
  ): void {
    const groupPlayers = players.filter(p => available.has(p.id));
    console.log(`🔄 pairWithinGroup: processing ${groupPlayers.length} players`);
    
    while (groupPlayers.length >= 2) {
      const player1 = groupPlayers.shift()!;
      if (!available.has(player1.id)) {
        console.log(`⚠️ Player ${player1.name} no longer available, skipping`);
        continue;
      }

      console.log(`🔍 Finding opponent for ${player1.name} from ${groupPlayers.length} candidates`);

      // Find best opponent for player1
      const opponent = this.findBestOpponent(player1, groupPlayers, allowRepeatPairings);
      
      if (opponent) {
        console.log(`✅ Pairing ${player1.name} vs ${opponent.name}`);
        pairings.push([player1, opponent]);
        available.delete(player1.id);
        available.delete(opponent.id);
        
        // Remove opponent from the group list
        const opponentIndex = groupPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          groupPlayers.splice(opponentIndex, 1);
        } else {
          console.warn(`⚠️ Opponent ${opponent.name} not found in group list for removal`);
        }
      } else {
        console.log(`❌ No valid opponent found for ${player1.name} in same score group`);
        console.log(`  ${player1.name} has already played:`, player1.pastOpponents || []);
        console.log(`  Remaining candidates in group:`, groupPlayers.map(p => p.name));
        // Player1 remains available for cross-group pairing
        // Continue trying to pair remaining players in this group
      }
    }
    
    console.log(`✅ pairWithinGroup completed: ${groupPlayers.length} players remain unpaired`);
  }

  /**
   * Pair remaining players across different point groups
   */
  private static pairAcrossGroups(
    players: ITournamentPlayer[],
    available: Set<string>,
    pairings: [ITournamentPlayer, ITournamentPlayer][],
    allowRepeatPairings: boolean,
    maxPointSpread: number
  ): void {
    const remainingPlayers = players.filter(p => available.has(p.id));
    
    while (remainingPlayers.length >= 2) {
      const player1 = remainingPlayers.shift()!;
      if (!available.has(player1.id)) continue;

      // Try to find opponent with increasing flexibility
      let opponent = null;
      
      // FIRST: Try within point spread limit
      const withinSpreadOpponents = remainingPlayers.filter(p => 
        available.has(p.id) && 
        Math.abs((p.points || 0) - (player1.points || 0)) <= maxPointSpread
      );
      opponent = this.findBestOpponent(player1, withinSpreadOpponents, allowRepeatPairings);
      
      // SECOND: If no opponent within spread, try ANY point difference
      if (!opponent) {
        const anyPointsOpponents = remainingPlayers.filter(p => available.has(p.id));
        opponent = this.findBestOpponent(player1, anyPointsOpponents, allowRepeatPairings);
      }
      
      // THIRD: If still no opponent and we absolutely need to pair, allow repeat pairing as last resort
      if (!opponent && !allowRepeatPairings) {
        console.warn(`⚠️ WARNING: No valid new opponent for ${player1.name}, considering repeat pairings as last resort`);
        const desperateOpponents = remainingPlayers.filter(p => available.has(p.id));
        opponent = this.findBestOpponent(player1, desperateOpponents, true); // Force allow repeat
      }
      
      if (opponent) {
        pairings.push([player1, opponent]);
        available.delete(player1.id);
        available.delete(opponent.id);
        
        // Remove opponent from the remaining list
        const opponentIndex = remainingPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          remainingPlayers.splice(opponentIndex, 1);
        }
        
        console.log(`✅ Paired ${player1.name} vs ${opponent.name} (points: ${player1.points || 0} vs ${opponent.points || 0})`);
      } else {
        console.error(`❌ Failed to find opponent for ${player1.name} with ${remainingPlayers.length} remaining players`);
        break; // Avoid infinite loop if something goes wrong
      }
    }
  }

  /**
   * Find the best opponent for a player based on Swiss pairing principles
   */
  private static findBestOpponent(
    player: ITournamentPlayer,
    candidates: ITournamentPlayer[],
    allowRepeatPairings: boolean
  ): ITournamentPlayer | null {
    console.log(`🔍 Finding opponent for ${player.name} from ${candidates.length} candidates`);
    
    if (candidates.length === 0) {
      console.log(`❌ No candidates available for ${player.name}`);
      return null;
    }

    // Validate that all candidates have proper structure
    const validCandidates = candidates.filter(candidate => 
      candidate && candidate.id && candidate.name
    );
    
    if (validCandidates.length < candidates.length) {
      console.warn(`⚠️ ${candidates.length - validCandidates.length} invalid candidates filtered out`);
    }
    
    if (validCandidates.length === 0) {
      console.error(`❌ No valid candidates for ${player.name}`);
      return null;
    }

    // First, try to find an opponent they haven't played before
    const pastOpponentIds = player.pastOpponents || [];
    const newOpponents = validCandidates.filter(candidate => {
      const hasPlayed = pastOpponentIds.includes(candidate.id);
      if (hasPlayed) {
        console.log(`  ❌ ${player.name} has already played ${candidate.name}`);
      }
      return !hasPlayed;
    });
    
    console.log(`🔍 Opponent search for ${player.name}:`);
    console.log(`  Total candidates: ${validCandidates.length}`);
    console.log(`  Past opponents: [${pastOpponentIds.join(', ')}]`);
    console.log(`  New opponents available: ${newOpponents.length}`);
    
    if (newOpponents.length > 0) {
      console.log(`✅ Selected new opponent: ${newOpponents[0].name} for ${player.name}`);
      return newOpponents[0];
    }

    // If no new opponents are found and repeat pairings are not allowed, return null
    if (!allowRepeatPairings) {
      console.log(`❌ No new opponents available for ${player.name} and repeat pairings not allowed`);
      return null;
    }

    // Only use fallback if repeat pairings are explicitly allowed
    const fallbackOpponent = validCandidates[0];
    console.log(`⚠️ Using fallback opponent: ${fallbackOpponent.name} for ${player.name} (repeat pairing - allowed)`);
    return fallbackOpponent;
  }

  /**
   * Calculate updated Buchholz scores for all players
   * Buchholz = sum of all opponents' total points (excluding byes)
   */
  static updateBuchholzScores(players: ITournamentPlayer[]): void {
    console.log('🔄 Updating Buchholz scores for', players.length, 'players');
    const playerMap = new Map(players.map(p => [p.id, p]));

    for (const player of players) {
      if (!player.pastOpponents || player.pastOpponents.length === 0) {
        player.buchholzScore = 0;
        continue;
      }

      // Sum of opponents' scores (excluding byes)
      const buchholzScore = player.pastOpponents.reduce((sum, opponentId) => {
        if (opponentId === 'BYE') {
          // For byes, some tournaments add the player's own score or average opponent score
          // For now, we'll use 0 for byes to keep it simple
          return sum;
        }
        const opponent = playerMap.get(opponentId);
        const opponentPoints = opponent?.points || 0;
        console.log(`  ${player.name} vs ${opponent?.name || 'Unknown'}: +${opponentPoints} points`);
        return sum + opponentPoints;
      }, 0);

      player.buchholzScore = buchholzScore;
      console.log(`✅ ${player.name}: Buchholz = ${buchholzScore} (from ${player.pastOpponents.length} opponents)`);
    }
    
    console.log('✅ Buchholz scores updated:', players.map(p => ({ 
      name: p.name, 
      points: p.points || 0, 
      buchholz: p.buchholzScore || 0,
      opponents: (p.pastOpponents || []).length
    })));
  }

  /**
   * Calculate final standings with all tiebreakers
   */
  static calculateStandings(players: ITournamentPlayer[]): ITournamentPlayer[] {
    console.log('🏆 Calculating Swiss standings for', players.length, 'players');
    
    // Ensure all players have valid Swiss fields
    const validatedPlayers = players.map(player => ({
      ...player,
      points: player.points || 0,
      wins: player.wins || 0,
      buchholzScore: player.buchholzScore || 0,
      pastOpponents: player.pastOpponents || []
    }));
    
    // Update Buchholz scores first
    this.updateBuchholzScores(validatedPlayers);
    
    // Sort by Swiss ranking criteria
    const standings = this.sortPlayersBySwissRanking(validatedPlayers);
    
    console.log('✅ Swiss standings calculated:', standings.map((p, index) => ({
      rank: index + 1,
      name: p.name,
      points: p.points,
      wins: p.wins,
      buchholz: p.buchholzScore
    })));
    
    return standings;
  }
}