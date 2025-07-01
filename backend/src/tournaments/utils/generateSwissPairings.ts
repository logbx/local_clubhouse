import { v4 as uuidv4 } from 'uuid';
import { ITournamentPlayer, ITournamentMatch, ITournamentRound } from '../../models/tournament.model';

/**
 * Generate pairings for a Swiss tournament round
 * @param players Array of players with their current points and past opponents
 * @param roundNumber Current round number
 * @returns Array of matches for the round
 */
export function generateSwissPairings(players: ITournamentPlayer[], roundNumber: number): ITournamentRound {
  // Sort players by points (highest to lowest)
  const sortedPlayers = [...players].sort((a, b) => {
    // Primary sort by points
    if ((b.points || 0) !== (a.points || 0)) {
      return (b.points || 0) - (a.points || 0);
    }
    // Secondary sort by Buchholz score
    if ((b.buchholzScore || 0) !== (a.buchholzScore || 0)) {
      return (b.buchholzScore || 0) - (a.buchholzScore || 0);
    }
    // Tertiary sort by wins
    return (b.wins || 0) - (a.wins || 0);
  });

  const matches: ITournamentMatch[] = [];
  const paired = new Set<string>();
  let byePlayers: ITournamentPlayer[] | undefined;

  // Handle odd number of players
  if (sortedPlayers.length % 2 === 1) {
    // Find the lowest-ranked player who hasn't had a bye yet
    for (let i = sortedPlayers.length - 1; i >= 0; i--) {
      const player = sortedPlayers[i];
      if (!player.pastOpponents?.includes('BYE')) {
        byePlayers = [player];
        paired.add(player.id);
        // Award bye points
        player.points = (player.points || 0) + 1;
        player.pastOpponents = [...(player.pastOpponents || []), 'BYE'];
        break;
      }
    }
  }

  // Group players by points
  const playersByPoints = new Map<number, ITournamentPlayer[]>();
  for (const player of sortedPlayers) {
    if (paired.has(player.id)) continue;
    const points = player.points || 0;
    if (!playersByPoints.has(points)) {
      playersByPoints.set(points, []);
    }
    playersByPoints.get(points)!.push(player);
  }

  // Create pairings within each point group
  for (const [points, playersInGroup] of playersByPoints) {
    let remainingPlayers = playersInGroup.filter(p => !paired.has(p.id));

    while (remainingPlayers.length > 0) {
      const player1 = remainingPlayers[0];
      paired.add(player1.id);
      remainingPlayers = remainingPlayers.filter(p => !paired.has(p.id));

      // Find the first unpaired player that player1 hasn't faced yet
      let player2: ITournamentPlayer | undefined;
      for (const potentialOpponent of remainingPlayers) {
        if (!player1.pastOpponents?.includes(potentialOpponent.id)) {
          player2 = potentialOpponent;
          break;
        }
      }

      // If no valid opponent found in the same point group, look in adjacent groups
      if (!player2) {
        const adjacentPoints = [points + 1, points - 1];
        for (const adjPoints of adjacentPoints) {
          const adjGroup = playersByPoints.get(adjPoints) || [];
          for (const potentialOpponent of adjGroup) {
            if (!paired.has(potentialOpponent.id) && !player1.pastOpponents?.includes(potentialOpponent.id)) {
              player2 = potentialOpponent;
              break;
            }
          }
          if (player2) break;
        }
      }

      // If still no valid opponent, take the first unpaired player
      if (!player2 && remainingPlayers.length > 0) {
        player2 = remainingPlayers[0];
      }

      if (player2) {
        paired.add(player2.id);
        remainingPlayers = remainingPlayers.filter(p => !paired.has(p.id));

        // Create the match
        const match: ITournamentMatch = {
          matchId: uuidv4(),
          player1,
          player2,
          status: 'pending',
          resultReportedBy: [],
          round: roundNumber
        };

        // Update past opponents
        player1.pastOpponents = [...(player1.pastOpponents || []), player2.id];
        player2.pastOpponents = [...(player2.pastOpponents || []), player1.id];

        matches.push(match);
      }
    }
  }

  return {
    roundNumber,
    matches,
    byePlayers,
    isComplete: false
  };
}

/**
 * Calculate standings for Swiss tournament
 * @param players Array of all players
 * @returns Sorted array of players with updated standings
 */
export function calculateStandings(players: ITournamentPlayer[]): ITournamentPlayer[] {
  return [...players].sort((a, b) => {
    // Primary sort by points
    if ((b.points || 0) !== (a.points || 0)) {
      return (b.points || 0) - (a.points || 0);
    }
    // Secondary sort by Buchholz score
    if ((b.buchholzScore || 0) !== (a.buchholzScore || 0)) {
      return (b.buchholzScore || 0) - (a.buchholzScore || 0);
    }
    // Tertiary sort by wins
    if ((b.wins || 0) !== (a.wins || 0)) {
      return (b.wins || 0) - (a.wins || 0);
    }
    // Finally sort by name
    return (a.name || '').localeCompare(b.name || '');
  });
}

/**
 * Update Buchholz scores for all players
 * @param players Array of all players
 * @returns Updated array of players with new Buchholz scores
 */
export function updateBuchholzScores(players: ITournamentPlayer[]): ITournamentPlayer[] {
  const playerMap = new Map(players.map(p => [p.id, p]));

  return players.map(player => {
    if (!player.pastOpponents) return player;

    // Calculate sum of opponents' scores
    const buchholzScore = player.pastOpponents.reduce((sum, opponentId) => {
      if (opponentId === 'BYE') return sum;
      const opponent = playerMap.get(opponentId);
      return sum + (opponent?.points || 0);
    }, 0);

    return {
      ...player,
      buchholzScore
    };
  });
}

/**
 * Process the result of a Swiss tournament match
 * @param match The completed match
 * @param players Array of all players
 * @returns Updated array of players with new scores
 */
export function processMatchResult(match: ITournamentMatch, players: ITournamentPlayer[]): ITournamentPlayer[] {
  const updatedPlayers = [...players];
  const player1Index = updatedPlayers.findIndex(p => p.id === match.player1.id);
  const player2Index = updatedPlayers.findIndex(p => p.id === match.player2.id);

  if (match.result === 'draw') {
    // Both players get 0.5 points
    if (player1Index >= 0) {
      updatedPlayers[player1Index].points = (updatedPlayers[player1Index].points || 0) + 0.5;
    }
    if (player2Index >= 0) {
      updatedPlayers[player2Index].points = (updatedPlayers[player2Index].points || 0) + 0.5;
    }
  } else {
    // Winner gets 1 point and a win
    const winnerId = match.result === 'win' ? match.player1.id : match.player2.id;
    const winnerIndex = winnerId === match.player1.id ? player1Index : player2Index;
    
    if (winnerIndex >= 0) {
      updatedPlayers[winnerIndex].points = (updatedPlayers[winnerIndex].points || 0) + 1;
      updatedPlayers[winnerIndex].wins = (updatedPlayers[winnerIndex].wins || 0) + 1;
    }
  }

  // Update Buchholz scores
  return updateBuchholzScores(updatedPlayers);
} 