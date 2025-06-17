import { ITournamentPlayer, ITournamentRound, ITournamentMatch } from '../../models/tournament.model';
import { v4 as uuidv4 } from 'uuid';

export function generateSingleEliminationBracket(players: ITournamentPlayer[]): ITournamentRound[] {
  const rounds: ITournamentRound[] = [];
  let currentPlayers = [...players];
  let roundNumber = 1;

  // Generate only the first round with actual players
  // Subsequent rounds will be generated as matches are completed
  const firstRoundMatches: ITournamentMatch[] = [];
  const firstRoundByes: ITournamentPlayer[] = [];

  // Handle first round: pair players for matches, give byes to remaining odd player
  for (let i = 0; i < currentPlayers.length; i += 2) {
    const player1 = currentPlayers[i];
    const player2 = currentPlayers[i + 1];

    if (player2) {
      // Regular match between two players
      firstRoundMatches.push({
        matchId: uuidv4(),
        player1,
        player2,
        resultReportedBy: [],
        status: 'pending',
      });
    } else {
      // Bye: player1 automatically advances to next round
      firstRoundByes.push(player1);
    }
  }

  // Add first round with bye players tracked separately
  rounds.push({
    roundNumber: 1,
    matches: firstRoundMatches,
    byePlayers: firstRoundByes.length > 0 ? firstRoundByes : undefined,
  });

  // Calculate total rounds needed based on player count
  const totalRounds = calculateTotalRounds(players.length);
  
  // Pre-generate all subsequent rounds with placeholder matches
  for (let round = 2; round <= totalRounds; round++) {
    // Calculate how many players will advance to this round
    const playersAdvancingToThisRound = getPreviousRoundWinnerCount(round, players.length);
    
    // Number of matches in this round is floor(advancing players / 2)
    // If odd number of players, one gets a bye
    const matchesInThisRound = Math.floor(playersAdvancingToThisRound / 2);
    const matches: ITournamentMatch[] = [];

    for (let i = 0; i < matchesInThisRound; i++) {
      matches.push({
        matchId: uuidv4(),
        player1: { id: 'TBD', name: 'TBD', isGuest: false },
        player2: { id: 'TBD', name: 'TBD', isGuest: false },
        resultReportedBy: [],
        status: 'pending',
      });
    }

    rounds.push({
      roundNumber: round,
      matches,
      byePlayers: undefined, // Will be populated when round is populated
    });
  }

  // If there are first round byes, immediately place them in the second round
  if (firstRoundByes.length > 0 && rounds.length > 1) {
    const secondRound = rounds[1];
    let matchIndex = 0;
    
    for (const byePlayer of firstRoundByes) {
      while (matchIndex < secondRound.matches.length) {
        const match = secondRound.matches[matchIndex];
        if (match.player1.id === 'TBD') {
          match.player1 = byePlayer;
          break;
        } else if (match.player2.id === 'TBD') {
          match.player2 = byePlayer;
          matchIndex++;
          break;
        }
        matchIndex++;
      }
    }
  }

  return rounds;
}

/**
 * Calculate how many winners/players will advance from a given round
 */
function getPreviousRoundWinnerCount(currentRound: number, totalPlayers: number): number {
  if (currentRound === 1) {
    return totalPlayers;
  }
  
  // For each round, calculate how many players advance
  let playersInRound = totalPlayers;
  for (let round = 1; round < currentRound; round++) {
    // Each round, half the players are eliminated (rounded up to handle byes)
    playersInRound = Math.ceil(playersInRound / 2);
  }
  
  return playersInRound;
}

/**
 * Get all players who have already received a bye in any previous round
 * This ensures no player gets more than one bye throughout the tournament
 */
function getPlayersWithPreviousByes(tournament: any): string[] {
  const playersWithByes: string[] = [];
  
  for (const round of tournament.rounds) {
    if (round.byePlayers && round.byePlayers.length > 0) {
      for (const byePlayer of round.byePlayers) {
        if (!playersWithByes.includes(byePlayer.id)) {
          playersWithByes.push(byePlayer.id);
          console.log(`📝 Found player with previous bye: ${byePlayer.name} (${byePlayer.id}) in Round ${round.roundNumber}`);
        }
      }
    }
  }
  
  console.log(`🔍 Total players with previous byes: ${playersWithByes.length}`, playersWithByes);
  return playersWithByes;
}

/**
 * When a round completes, populate the next round with winners
 * This function handles byes by properly combining previous round bye players with current winners
 * IMPORTANT: Ensures no player gets more than one bye throughout the entire tournament
 * 
 * Example with 7 players:
 * Round 1: 3 matches + 1 bye (7 players total)
 *   - 3 matches produce 3 winners
 *   - 1 bye player advances automatically
 *   - Total advancing: 4 players (3 winners + 1 bye)
 * 
 * Round 2: 2 matches (4 players total, no bye needed)
 *   - All 4 advancing players (3 winners + 1 previous bye) are paired into 2 matches
 *   - No new bye needed since 4 is even
 * 
 * Semi-Final: 1 match (2 winners from Round 2)
 */
export function populateNextRound(
  tournament: any, 
  completedRoundNumber: number
): { shouldAdvanceToNextRound: boolean; nextRoundMatches?: ITournamentMatch[]; byePlayers?: ITournamentPlayer[] } {
  const completedRound = tournament.rounds.find((r: any) => r.roundNumber === completedRoundNumber);
  if (!completedRound) {
    return { shouldAdvanceToNextRound: false };
  }

  // Check if all matches in the completed round are finished
  const allMatchesComplete = completedRound.matches.every((match: any) => match.status === 'completed');
  if (!allMatchesComplete) {
    return { shouldAdvanceToNextRound: false };
  }

  // Get winners from completed round
  const winners: ITournamentPlayer[] = completedRound.matches
    .map((match: any) => {
      if (match.winnerId) {
        return match.player1.id === match.winnerId ? match.player1 : match.player2;
      }
      return null;
    })
    .filter(Boolean);

  // Get bye players from the completed round (they automatically advance)
  const byePlayersFromCompletedRound: ITournamentPlayer[] = completedRound.byePlayers || [];
  
  // Combine winners and bye players for total advancing players
  const allAdvancingPlayers = [...winners, ...byePlayersFromCompletedRound];

  const nextRoundNumber = completedRoundNumber + 1;
  const nextRound = tournament.rounds.find((r: any) => r.roundNumber === nextRoundNumber);
  
  if (!nextRound) {
    // Tournament is complete
    return { shouldAdvanceToNextRound: false };
  }

  // Shuffle all advancing players to randomize next round matchups
  const shuffledAdvancingPlayers = shufflePlayers(allAdvancingPlayers);
  const nextRoundMatches: ITournamentMatch[] = [];
  
  // Handle odd number of advancing players - select bye player ensuring uniqueness
  let byePlayer: ITournamentPlayer | null = null;
  let playersForMatches = [...shuffledAdvancingPlayers];
  
  if (shuffledAdvancingPlayers.length % 2 === 1) {
    // Get players who have already received byes in previous rounds
    const playersWithPreviousByes = getPlayersWithPreviousByes(tournament);
    
    // Filter out players who have already had a bye
    const eligibleForBye = shuffledAdvancingPlayers.filter(player => 
      !playersWithPreviousByes.includes(player.id)
    );
    
    console.log('🎯 Bye selection info:', {
      totalAdvancing: shuffledAdvancingPlayers.length,
      playersWithPreviousByes: playersWithPreviousByes,
      eligibleForBye: eligibleForBye.map(p => ({ id: p.id, name: p.name })),
      completedRoundNumber,
      nextRoundNumber
    });
    
    if (eligibleForBye.length > 0) {
      // Select randomly from eligible players (those who haven't had a bye)
      const byeIndex = Math.floor(Math.random() * eligibleForBye.length);
      byePlayer = eligibleForBye[byeIndex];
      console.log('✅ Selected unique bye player:', { id: byePlayer.id, name: byePlayer.name });
    } else {
      // Fallback: if all players have had byes, select from all advancing players
      // This should rarely happen in well-designed tournaments
      const byeIndex = Math.floor(Math.random() * shuffledAdvancingPlayers.length);
      byePlayer = shuffledAdvancingPlayers[byeIndex];
      console.log('⚠️ Fallback bye selection (all players have had byes):', { id: byePlayer.id, name: byePlayer.name });
    }
    
    // Remove bye player from match players
    playersForMatches = shuffledAdvancingPlayers.filter(player => player.id !== byePlayer!.id);
  }

  // Create matches for paired players
  for (let i = 0; i < playersForMatches.length; i += 2) {
    const player1 = playersForMatches[i];
    const player2 = playersForMatches[i + 1];
    
    nextRoundMatches.push({
      matchId: uuidv4(),
      player1,
      player2,
      resultReportedBy: [],
      status: 'pending',
    });
  }

  // Update next round with actual players and bye players
  nextRound.matches = nextRoundMatches;
  nextRound.byePlayers = byePlayer ? [byePlayer] : undefined;
  
  // If there's a bye player, they advance to the round after next (only if it's not the finals)
  if (byePlayer && nextRoundNumber < tournament.rounds.length) {
    const roundAfterNext = tournament.rounds.find((r: any) => r.roundNumber === nextRoundNumber + 1);
    if (roundAfterNext && roundAfterNext.matches.length > 0) {
      // Find first TBD match and assign bye player
      const firstTBDMatch = roundAfterNext.matches.find((match: any) => 
        match.player1.id === 'TBD' || match.player2.id === 'TBD'
      );
      if (firstTBDMatch) {
        if (firstTBDMatch.player1.id === 'TBD') {
          firstTBDMatch.player1 = byePlayer;
        } else {
          firstTBDMatch.player2 = byePlayer;
        }
      }
    }
  }

  return { 
    shouldAdvanceToNextRound: true, 
    nextRoundMatches,
    byePlayers: byePlayer ? [byePlayer] : undefined
  };
}

export function calculateTotalRounds(playerCount: number): number {
  return Math.ceil(Math.log2(playerCount));
}

export function getRoundName(roundNumber: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - roundNumber + 1;
  
  switch (roundsFromEnd) {
    case 1:
      return 'Finals';
    case 2:
      return 'Semi-Finals';
    case 3:
      return 'Quarter-Finals';
    default:
      return `Round ${roundNumber}`;
  }
}

export function shufflePlayers(players: ITournamentPlayer[]): ITournamentPlayer[] {
  const shuffled = [...players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}