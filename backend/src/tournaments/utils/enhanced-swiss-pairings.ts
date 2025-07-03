import { v4 as uuidv4 } from 'uuid';
import { ITournamentPlayer, ITournamentMatch, ITournamentRound } from '../../models/tournament.model';

/**
 * Enhanced Swiss pairing algorithm with better opponent history tracking and pairing logic
 */

export interface PairingOptions {
  allowRepeatPairings?: boolean; // Allow repeat pairings if necessary
  preferColorBalance?: boolean; // For games with colors (chess, etc.)
  maxPointSpread?: number; // Maximum point difference allowed in pairing
}

export class EnhancedSwissPairingService {
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
      options
    });

    const {
      allowRepeatPairings = false,
      maxPointSpread = 2,
    } = options;

    // Ensure all players have initialized Swiss fields
    const initializedPlayers = players.map(player => ({
      ...player,
      points: player.points || 0,
      wins: player.wins || 0,
      buchholzScore: player.buchholzScore || 0,
      pastOpponents: player.pastOpponents || []
    }));

    console.log('✅ Players initialized in pairing service');

    // Sort players by Swiss ranking
    console.log('🔄 Sorting players by Swiss ranking...');
    const sortedPlayers = this.sortPlayersBySwissRanking(initializedPlayers);
    console.log('✅ Players sorted');
    
    const matches: ITournamentMatch[] = [];
    const paired = new Set<string>();
    let byePlayers: ITournamentPlayer[] | undefined;

    // Handle bye player first (odd number of players)
    if (sortedPlayers.length % 2 === 1) {
      const byePlayer = this.selectByePlayer(sortedPlayers);
      if (byePlayer) {
        byePlayers = [byePlayer];
        paired.add(byePlayer.id);
        // Award bye points (1 full point for Swiss)
        byePlayer.points = (byePlayer.points || 0) + 1;
        byePlayer.pastOpponents = [...(byePlayer.pastOpponents || []), 'BYE'];
      }
    }

    // Generate pairings using Swiss algorithm
    const pairings = this.generateOptimalPairings(
      sortedPlayers.filter(p => !paired.has(p.id)),
      allowRepeatPairings,
      maxPointSpread
    );

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
      
      // Update past opponents (they will face each other)
      player1.pastOpponents = [...(player1.pastOpponents || []), player2.id];
      player2.pastOpponents = [...(player2.pastOpponents || []), player1.id];
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
   * Select the best candidate for a bye (lowest-ranked player who hasn't had a bye)
   */
  private static selectByePlayer(sortedPlayers: ITournamentPlayer[]): ITournamentPlayer | null {
    // Find lowest-ranked player who hasn't had a bye yet
    for (let i = sortedPlayers.length - 1; i >= 0; i--) {
      const player = sortedPlayers[i];
      if (!player.pastOpponents?.includes('BYE')) {
        return player;
      }
    }

    // If all players have had byes, give it to the lowest-ranked player
    return sortedPlayers.length > 0 ? sortedPlayers[sortedPlayers.length - 1] : null;
  }

  /**
   * Generate optimal pairings using Swiss system principles
   */
  private static generateOptimalPairings(
    players: ITournamentPlayer[],
    allowRepeatPairings: boolean,
    maxPointSpread: number
  ): [ITournamentPlayer, ITournamentPlayer][] {
    const pairings: [ITournamentPlayer, ITournamentPlayer][] = [];
    const available = new Set(players.map(p => p.id));

    // Group players by point totals
    const pointGroups = this.groupPlayersByPoints(players);
    
    // Pair within point groups first, then across groups if necessary
    for (const [, playersInGroup] of pointGroups) {
      this.pairWithinGroup(playersInGroup, available, pairings, allowRepeatPairings);
    }

    // Handle any remaining unpaired players by pairing across point groups
    const remainingPlayers = players.filter(p => available.has(p.id));
    this.pairAcrossGroups(remainingPlayers, available, pairings, allowRepeatPairings, maxPointSpread);

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
    
    while (groupPlayers.length >= 2) {
      const player1 = groupPlayers.shift()!;
      if (!available.has(player1.id)) continue;

      // Find best opponent for player1
      const opponent = this.findBestOpponent(player1, groupPlayers, allowRepeatPairings);
      
      if (opponent) {
        pairings.push([player1, opponent]);
        available.delete(player1.id);
        available.delete(opponent.id);
        
        // Remove opponent from the group list
        const opponentIndex = groupPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          groupPlayers.splice(opponentIndex, 1);
        }
      } else {
        // No valid opponent found, leave player1 for cross-group pairing
        break;
      }
    }
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

      // Find best opponent within point spread limit
      const validOpponents = remainingPlayers.filter(p => 
        available.has(p.id) && 
        Math.abs((p.points || 0) - (player1.points || 0)) <= maxPointSpread
      );

      const opponent = this.findBestOpponent(player1, validOpponents, allowRepeatPairings);
      
      if (opponent) {
        pairings.push([player1, opponent]);
        available.delete(player1.id);
        available.delete(opponent.id);
        
        // Remove opponent from the remaining list
        const opponentIndex = remainingPlayers.indexOf(opponent);
        if (opponentIndex > -1) {
          remainingPlayers.splice(opponentIndex, 1);
        }
      } else if (allowRepeatPairings && remainingPlayers.length > 0) {
        // Last resort: pair with anyone available
        const fallbackOpponent = remainingPlayers.shift()!;
        pairings.push([player1, fallbackOpponent]);
        available.delete(player1.id);
        available.delete(fallbackOpponent.id);
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
    if (candidates.length === 0) return null;

    // First, try to find an opponent they haven't played before
    if (!allowRepeatPairings) {
      const newOpponents = candidates.filter(candidate => 
        !player.pastOpponents?.includes(candidate.id)
      );
      
      if (newOpponents.length > 0) {
        // Return the first (highest-ranked) new opponent
        return newOpponents[0];
      }
    }

    // If no new opponents or repeat pairings are allowed, return the best available
    return candidates[0];
  }

  /**
   * Calculate updated Buchholz scores for all players
   */
  static updateBuchholzScores(players: ITournamentPlayer[]): void {
    const playerMap = new Map(players.map(p => [p.id, p]));

    for (const player of players) {
      if (!player.pastOpponents) continue;

      // Sum of opponents' scores (excluding byes)
      const buchholzScore = player.pastOpponents.reduce((sum, opponentId) => {
        if (opponentId === 'BYE') return sum;
        const opponent = playerMap.get(opponentId);
        return sum + (opponent?.points || 0);
      }, 0);

      player.buchholzScore = buchholzScore;
    }
  }

  /**
   * Calculate final standings with all tiebreakers
   */
  static calculateStandings(players: ITournamentPlayer[]): ITournamentPlayer[] {
    // Update Buchholz scores first
    this.updateBuchholzScores(players);
    
    // Sort by Swiss ranking criteria
    return this.sortPlayersBySwissRanking(players);
  }
}