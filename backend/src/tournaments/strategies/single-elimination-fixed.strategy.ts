import { Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
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

/**
 * Fixed Single Elimination Tournament Strategy
 * CRITICAL FIX: Prevents players from appearing as both competitors and bye players in same round
 */
@Injectable()
export class SingleEliminationFixedStrategy extends TournamentStrategy {
  readonly type = TournamentType.SINGLE_ELIMINATION;

  validateCreation(options: TournamentCreationOptions): void {
    if (options.maxPlayers < 2) {
      throw new BadRequestException('Single elimination tournament requires at least 2 players');
    }
    if (options.maxPlayers > 128) {
      throw new BadRequestException('Single elimination tournament supports maximum 128 players');
    }
  }

  initializeTournament(tournament: ITournament, options: TournamentCreationOptions): ITournament {
    tournament.numRounds = Math.ceil(Math.log2(options.maxPlayers));
    return tournament;
  }

  validateStart(options: TournamentStartOptions): void {
    if (options.players.length < 2) {
      throw new BadRequestException('Single elimination tournament needs at least 2 players to start');
    }
  }

  generateInitialStructure(players: ITournamentPlayer[], tournament: ITournament): ITournamentRound[] {
    console.log('🏗️ Generating initial Single Elimination structure for', players.length, 'players');
    
    const shuffledPlayers = this.shufflePlayers([...players]);
    const rounds = this.createAllRounds(shuffledPlayers);
    
    console.log('✅ Initial structure created:', {
      totalRounds: rounds.length,
      firstRoundMatches: rounds[0].matches.length,
      firstRoundByes: rounds[0].byePlayers?.length || 0
    });
    
    return rounds;
  }

  processMatchResult(options: MatchResultOptions): ITournament {
    const { tournament, matchId, winnerId, loserId } = options;
    
    const { match, matchRound } = this.findMatch(tournament, matchId);
    
    if (match.status === 'completed') {
      console.log(`⚠️ Match ${matchId} already completed, skipping processing but continuing with tournament advancement check`);
      // Don't throw error - just log and continue with advancement check
      // This prevents race conditions from blocking tournament progression
      return tournament;
    }

    // Update match result
    match.status = 'completed';
    match.winnerId = winnerId;
    match.loserId = loserId;
    console.log(`✅ Match ${matchId} result processed: ${winnerId} defeats ${loserId}`);

    // Check round completion
    const allMatchesComplete = matchRound.matches.every(m => m.status === 'completed');
    
    if (allMatchesComplete && !matchRound.isComplete) {
      matchRound.isComplete = true;
      console.log(`✅ Round ${matchRound.roundNumber} marked as complete - all ${matchRound.matches.length} matches finished`);
    }

    return tournament;
  }

  checkAdvancement(tournament: ITournament, completedRoundNumber: number): TournamentAdvancementResult {
    console.log(`🔄 Checking advancement for round ${completedRoundNumber}`, {
      totalRoundsCreated: tournament.rounds.length,
      playerCount: tournament.players.length,
      expectedRounds: Math.ceil(Math.log2(tournament.players.length))
    });

    // VALIDATION: Check for bye violations before processing advancement
    this.validateTournamentByeState(tournament, `during advancement check for round ${completedRoundNumber}`);

    const completedRound = tournament.rounds.find(r => r.roundNumber === completedRoundNumber);
    
    if (!completedRound?.isComplete) {
      console.log(`❌ Round ${completedRoundNumber} not found or not complete`);
      return { shouldAdvance: false };
    }

    // ENHANCED: Check if this is truly the final round based on remaining players
    const winnersFromCompletedRound = this.getWinners(completedRound);
    const byesFromCompletedRound = completedRound.byePlayers || [];
    const playersAdvancing = winnersFromCompletedRound.length + byesFromCompletedRound.length;
    
    console.log(`📊 Round ${completedRoundNumber} advancement analysis:`, {
      winners: winnersFromCompletedRound.length,
      byes: byesFromCompletedRound.length,
      totalAdvancing: playersAdvancing,
      isActualFinalRound: playersAdvancing <= 1
    });

    // Check if this is the actual final round (1 or fewer players advancing)
    if (playersAdvancing <= 1) {
      console.log(`🏁 Tournament complete - only ${playersAdvancing} player(s) remaining`);
      const winner = this.getWinner(tournament);
      return {
        shouldAdvance: false,
        isComplete: true,
        winnerId: winner?.id
      };
    }

    // Get next round (should already exist from initial structure)
    const nextRound = tournament.rounds.find(r => r.roundNumber === completedRoundNumber + 1);
    if (!nextRound) {
      console.error(`❌ Next round ${completedRoundNumber + 1} not found in tournament structure`, {
        availableRounds: tournament.rounds.map(r => r.roundNumber),
        totalRoundsCreated: tournament.rounds.length,
        expectedTotalRounds: Math.ceil(Math.log2(tournament.players.length))
      });
      return { shouldAdvance: false };
    }

    console.log(`🔄 Populating round ${nextRound.roundNumber} with ${playersAdvancing} advancing players`);
    const success = this.populateNextRound(tournament, completedRoundNumber, nextRound);
    
    return {
      shouldAdvance: success,
      nextRound: success ? nextRound : undefined
    };
  }

  calculateStandings(tournament: ITournament): ITournamentPlayer[] {
    const winner = this.getWinner(tournament);
    return winner ? [winner] : [];
  }

  isComplete(tournament: ITournament): boolean {
    return tournament.isFinished || this.getWinner(tournament) !== null;
  }

  getWinner(tournament: ITournament): ITournamentPlayer | null {
    const finalRound = tournament.rounds[tournament.rounds.length - 1];
    if (!finalRound || finalRound.matches.length !== 1) return null;
    
    const finalMatch = finalRound.matches[0];
    if (finalMatch.status !== 'completed' || !finalMatch.winnerId) return null;
    
    return finalMatch.winnerId === finalMatch.player1.id 
      ? finalMatch.player1 
      : finalMatch.player2;
  }

  getRoundName(roundNumber: number, tournament: ITournament): string {
    const totalRounds = tournament.rounds.length;
    const roundsFromEnd = totalRounds - roundNumber + 1;
    
    const names = ['Final', 'Semi-Final', 'Quarter-Final'];
    return roundsFromEnd <= names.length 
      ? names[roundsFromEnd - 1] 
      : `Round ${roundNumber}`;
  }

  validateMatchResult(options: MatchResultOptions): void {
    if (!options.winnerId || !options.loserId) {
      throw new BadRequestException('Both winner and loser must be specified for single elimination');
    }
    if (options.winnerId === options.loserId) {
      throw new BadRequestException('Winner and loser cannot be the same player');
    }
  }

  // Private helper methods
  private createAllRounds(players: ITournamentPlayer[]): ITournamentRound[] {
    const rounds: ITournamentRound[] = [];
    const totalRounds = this.calculateTotalRounds(players.length);
    
    // Create a temporary tournament object to use getRoundName
    const tempTournament: Pick<ITournament, 'rounds'> = { rounds: [] };
    // Pre-populate rounds array with correct length for naming calculation
    for (let i = 0; i < totalRounds; i++) {
      tempTournament.rounds.push({ roundNumber: i + 1, matches: [], isComplete: false });
    }
    
    // First round with actual players
    const firstRound = this.createFirstRound(players);
    firstRound.name = this.getRoundName(1, tempTournament as ITournament);
    rounds.push(firstRound);
    
    // Generate placeholder rounds with proper names
    for (let round = 2; round <= totalRounds; round++) {
      const playersInRound = this.getPlayersInRound(round, players.length);
      const matches = this.createPlaceholderMatches(Math.floor(playersInRound / 2));
      
      rounds.push({
        roundNumber: round,
        name: this.getRoundName(round, tempTournament as ITournament),
        matches,
        byePlayers: undefined,
        isComplete: false
      });
    }

    console.log('🏷️ Created rounds with proper names:', rounds.map(r => ({ 
      roundNumber: r.roundNumber, 
      name: r.name,
      matchCount: r.matches.length 
    })));

    // CRITICAL FIX: Place first round byes directly in second round matches, not as byes
    if (firstRound.byePlayers?.length && rounds.length > 1) {
      this.placeByes(rounds[1], firstRound.byePlayers);
    }

    return rounds;
  }

  private createFirstRound(players: ITournamentPlayer[]): ITournamentRound {
    const matches: ITournamentMatch[] = [];
    const byes: ITournamentPlayer[] = [];

    for (let i = 0; i < players.length; i += 2) {
      const player1 = players[i];
      const player2 = players[i + 1];

      if (player2) {
        matches.push({
          matchId: uuidv4(),
          player1,
          player2,
          resultReportedBy: [],
          status: 'pending',
        });
      } else {
        byes.push(player1);
      }
    }

    return {
      roundNumber: 1,
      matches,
      byePlayers: byes.length > 0 ? byes : undefined,
      isComplete: false
    };
  }

  private createPlaceholderMatches(count: number): ITournamentMatch[] {
    const matches: ITournamentMatch[] = [];
    for (let i = 0; i < count; i++) {
      matches.push({
        matchId: uuidv4(),
        player1: { id: 'TBD', name: 'TBD', isGuest: false },
        player2: { id: 'TBD', name: 'TBD', isGuest: false },
        resultReportedBy: [],
        status: 'pending',
      });
    }
    return matches;
  }

  private findMatch(tournament: ITournament, matchId: string) {
    for (const round of tournament.rounds) {
      const match = round.matches.find(m => m.matchId === matchId);
      if (match) {
        return { match, matchRound: round };
      }
    }
    throw new BadRequestException('Match not found');
  }

  /**
   * CRITICAL FIX: Bracket-preserving advancement - maintains tournament bracket structure
   */
  private populateNextRound(tournament: ITournament, completedRoundNumber: number, nextRound: ITournamentRound): boolean {
    console.log(`🔄 BRACKET-PRESERVING: Populating round ${nextRound.roundNumber} after round ${completedRoundNumber}`);
    
    // VALIDATION: Check tournament state before making changes
    this.validateTournamentByeState(tournament, `before populating round ${nextRound.roundNumber}`);
    
    const completedRound = tournament.rounds.find(r => r.roundNumber === completedRoundNumber);
    if (!completedRound) {
      console.error('❌ Completed round not found:', completedRoundNumber);
      return false;
    }

    // Get match winners in BRACKET ORDER (preserve match sequence)
    const winners = this.getWinnersInBracketOrder(completedRound);
    const previousByes = completedRound.byePlayers || [];
    
    console.log('🏆 BRACKET-PRESERVING: Players advancing to next round:', {
      winnersInOrder: winners.map((w, i) => ({ matchIndex: i, player: w.name })),
      previousByes: previousByes.map(b => b.name),
      totalAdvancing: winners.length + previousByes.length,
      targetRound: nextRound.roundNumber
    });

    if (winners.length === 0 && previousByes.length === 0) {
      console.error('❌ No players advancing to next round');
      return false;
    }

    // BRACKET-PRESERVING LOGIC: Place winners in predetermined bracket positions
    const result = this.advancePlayersToBracketPositions(winners, previousByes, nextRound, tournament);
    
    // VALIDATION: Check tournament state after making changes
    this.validateTournamentByeState(tournament, `after populating round ${nextRound.roundNumber}`);
    
    return result;
  }

  /**
   * BRACKET-PRESERVING: Place players in their predetermined bracket positions
   */
  private advancePlayersToBracketPositions(winners: ITournamentPlayer[], previousByes: ITournamentPlayer[], nextRound: ITournamentRound, tournament: ITournament): boolean {
    console.log('🏗️ BRACKET-PRESERVING: Placing players in predetermined bracket positions');
    
    // CRITICAL FIX: Analyze player bye history before placement
    const playerByeHistory = new Map<string, number[]>();
    for (let i = 0; i < tournament.rounds.length; i++) {
      const round = tournament.rounds[i];
      if (round.byePlayers?.length) {
        for (const byePlayer of round.byePlayers) {
          if (!playerByeHistory.has(byePlayer.id)) {
            playerByeHistory.set(byePlayer.id, []);
          }
          playerByeHistory.get(byePlayer.id)!.push(round.roundNumber);
        }
      }
    }
    
    // Sort players by bye count (ascending) to prioritize players with fewer byes
    const allAdvancing = [...winners, ...previousByes].sort((a, b) => {
      const aByeCount = playerByeHistory.get(a.id)?.length || 0;
      const bByeCount = playerByeHistory.get(b.id)?.length || 0;
      return aByeCount - bByeCount;
    });
    
    console.log('📊 Player bye history before placement:', 
      Object.fromEntries([...playerByeHistory.entries()].map(([id, rounds]) => {
        const player = allAdvancing.find(p => p.id === id);
        return [player?.name || id, rounds];
      }))
    );
    
    let playerIndex = 0;
    let byePlayer: ITournamentPlayer | undefined;
    
    // Handle bye player FIRST if odd number of advancing players - CRITICAL FIX
    if (allAdvancing.length % 2 === 1) {
      // Get players who have already received byes in previous rounds
      const playersWithPreviousByes = this.getPlayersWithPreviousByes(tournament);
      
      // Filter out players who have already had a bye
      const eligibleForBye = allAdvancing.filter(player => 
        !playersWithPreviousByes.includes(player.id)
      );
      
      console.log('🎯 Bye selection info (EARLY):', {
        totalAdvancing: allAdvancing.length,
        playersWithPreviousByes: playersWithPreviousByes,
        eligibleForBye: eligibleForBye.map(p => ({ id: p.id, name: p.name })),
        roundNumber: nextRound.roundNumber
      });
      
      if (eligibleForBye.length > 0) {
        // Select randomly from eligible players (those who haven't had a bye)
        const byeIndex = Math.floor(Math.random() * eligibleForBye.length);
        byePlayer = eligibleForBye[byeIndex];
        console.log('✅ Selected unique bye player (EARLY):', { id: byePlayer.id, name: byePlayer.name });
        
        // Remove bye player from advancing players list
        const byePlayerIndex = allAdvancing.findIndex(p => p.id === byePlayer!.id);
        if (byePlayerIndex >= 0) {
          allAdvancing.splice(byePlayerIndex, 1);
          console.log('✅ Bye player removed from match pool');
        }
      } else {
        // CRITICAL FIX: Proper bye selection logic for SET when all have had byes
        console.log('⚠️ No eligible players without byes found, applying SET bye rules...');
        
        // For subsequent rounds: Select from winners with fewest byes
        const winnerByeCounts = new Map<string, number>();
        winners.forEach(player => {
          let byeCount = 0;
          for (const round of tournament.rounds) {
            if (round.byePlayers?.some(bp => bp.id === player.id)) {
              byeCount++;
            }
          }
          winnerByeCounts.set(player.id, byeCount);
        });
        
        // Find minimum bye count among winners
        const minByeCount = Math.min(...[...winnerByeCounts.values()]);
        
        // Get all winners with minimum bye count
        const eligibleWinners = winners.filter(player => 
          winnerByeCounts.get(player.id) === minByeCount
        );
        
        console.log('🔍 Eligible winners for bye (EARLY):', {
          roundNumber: nextRound.roundNumber,
          totalWinners: winners.length,
          minByeCount,
          eligiblePlayers: eligibleWinners.map(p => ({
            name: p.name,
            byeCount: winnerByeCounts.get(p.id)
          }))
        });
        
        if (eligibleWinners.length > 0) {
          // Randomly select from winners with fewest byes
          const randomIndex = Math.floor(Math.random() * eligibleWinners.length);
          byePlayer = eligibleWinners[randomIndex];
          console.log('✅ Selected bye from eligible winners (EARLY):', {
            selectedPlayer: byePlayer.name,
            byeCount: winnerByeCounts.get(byePlayer.id),
            roundNumber: nextRound.roundNumber
          });
          
          // Remove bye player from advancing players list
          const byePlayerIndex = allAdvancing.findIndex(p => p.id === byePlayer!.id);
          if (byePlayerIndex >= 0) {
            allAdvancing.splice(byePlayerIndex, 1);
            console.log('✅ Bye player removed from match pool');
          }
        } else {
          console.error('❌ CRITICAL ERROR: No winners available for bye selection!', {
            roundNumber: nextRound.roundNumber,
            winners: winners.map(w => w.name),
            byeCounts: Object.fromEntries([...winnerByeCounts.entries()])
          });
          throw new Error(`No winners available for bye in round ${nextRound.roundNumber}. This is a critical error.`);
        }
      }
      
      // Set bye player immediately
      nextRound.byePlayers = [byePlayer];
      console.log('⭐ BRACKET: Bye player assigned (EARLY):', byePlayer.name, '→ Advances to Round', nextRound.roundNumber + 1);
    }
    
    // Now fill matches with remaining players (after bye player is removed)
    for (let matchIndex = 0; matchIndex < nextRound.matches.length; matchIndex++) {
      const match = nextRound.matches[matchIndex];
      
      // Skip matches that already have valid assignments (not TBD)
      if (match.player1.id !== 'TBD' && match.player2.id !== 'TBD') {
        console.log(`✅ Match ${matchIndex + 1} already populated:`, {
          player1: match.player1.name,
          player2: match.player2.name
        });
        continue;
      }
      
      // Fill empty positions - players with fewer byes will be placed first due to sorting
      if (playerIndex < allAdvancing.length && match.player1.id === 'TBD') {
        match.player1 = allAdvancing[playerIndex++];
        console.log(`📍 BRACKET: Match ${matchIndex + 1} Position 1 → ${match.player1.name} (${playerByeHistory.get(match.player1.id)?.length || 0} byes)`);
      }
      
      if (playerIndex < allAdvancing.length && match.player2.id === 'TBD') {
        match.player2 = allAdvancing[playerIndex++];
        console.log(`📍 BRACKET: Match ${matchIndex + 1} Position 2 → ${match.player2.name} (${playerByeHistory.get(match.player2.id)?.length || 0} byes)`);
      }
    }
    
    // This section should now be empty since bye is handled above
    if (playerIndex < allAdvancing.length) {
      console.warn('⚠️ UNEXPECTED: Players remaining after match assignment:', {
        remaining: allAdvancing.slice(playerIndex).map(p => p.name),
        count: allAdvancing.length - playerIndex
      });
    }
    
    // AUDIT LOG: Record bye assignment for debugging (if there was one)
    if (byePlayer) {
      console.log('📋 BYE AUDIT:', {
        tournamentId: tournament._id || 'unknown',
        roundNumber: nextRound.roundNumber,
        byePlayerId: byePlayer.id,
        byePlayerName: byePlayer.name,
        totalPlayersInRound: winners.length + previousByes.length,
        timestamp: new Date().toISOString()
      });
    }

    // Validation
    const assignedPlayers = nextRound.matches.filter(m => m.player1.id !== 'TBD' || m.player2.id !== 'TBD').length * 2;
    const byeCount = nextRound.byePlayers?.length || 0;
    const totalAssigned = assignedPlayers + byeCount;
    
    console.log('✅ BRACKET-PRESERVING: Assignment validation:', {
      roundNumber: nextRound.roundNumber,
      playersToAdvance: allAdvancing.length,
      assignedToMatches: assignedPlayers,
      assignedToByes: byeCount,
      totalAssigned,
      success: totalAssigned >= allAdvancing.length
    });

    return totalAssigned >= allAdvancing.length;
  }

  /**
   * Get winners in bracket order (preserve match sequence for bracket structure)
   */
  private getWinnersInBracketOrder(round: ITournamentRound): ITournamentPlayer[] {
    return round.matches
      .filter(m => m.status === 'completed' && m.winnerId)
      .map(m => {
        const winner = m.winnerId === m.player1.id ? m.player1 : m.player2;
        if (!winner || winner.id === 'TBD') {
          console.error('❌ Invalid winner in bracket order:', { matchId: m.matchId, winnerId: m.winnerId });
          return null;
        }
        return winner;
      })
      .filter(Boolean) as ITournamentPlayer[];
  }

  private getWinners(round: ITournamentRound): ITournamentPlayer[] {
    const winners = round.matches
      .filter(m => m.status === 'completed' && m.winnerId)
      .map(m => {
        const winner = m.winnerId === m.player1.id ? m.player1 : m.player2;
        
        if (!winner || winner.id === 'TBD') {
          console.error('❌ Invalid winner data:', {
            matchId: m.matchId,
            winnerId: m.winnerId,
            player1: m.player1,
            player2: m.player2
          });
          return null;
        }
        
        return winner;
      })
      .filter(Boolean) as ITournamentPlayer[];
    
    console.log(`🏆 Extracted winners from round ${round.roundNumber}:`, 
      winners.map(w => w.name)
    );
    
    return winners;
  }

  /**
   * Validate tournament state to detect bye violations
   * This should be called before and after any tournament progression
   */
  private validateTournamentByeState(tournament: ITournament, contextMessage?: string): boolean {
    const context = contextMessage || 'unknown context';
    console.log(`🔍 VALIDATING tournament bye state [${context}]`);
    
    const allByeAssignments: { [playerId: string]: number[] } = {};
    let violations = 0;
    
    // Collect all bye assignments across all rounds
    for (const round of tournament.rounds) {
      if (round.byePlayers && round.byePlayers.length > 0) {
        for (const byePlayer of round.byePlayers) {
          if (!allByeAssignments[byePlayer.id]) {
            allByeAssignments[byePlayer.id] = [];
          }
          allByeAssignments[byePlayer.id].push(round.roundNumber);
        }
      }
    }
    
    // Check for violations (players with multiple byes)
    for (const [playerId, rounds] of Object.entries(allByeAssignments)) {
      if (rounds.length > 1) {
        const player = tournament.players.find(p => p.id === playerId);
        console.error(`🚨 BYE VIOLATION DETECTED [${context}]:`, {
          playerId,
          playerName: player?.name || 'unknown',
          byeRounds: rounds,
          violationCount: rounds.length - 1
        });
        violations++;
      }
    }
    
    if (violations > 0) {
      console.error(`🚨 TOTAL BYE VIOLATIONS: ${violations} players have multiple byes`);
      console.error('📊 Full bye assignment map:', allByeAssignments);
      return false;
    } else {
      console.log(`✅ Bye state validation passed [${context}]: No violations detected`);
      return true;
    }
  }

  /**
   * Get all players who have already received a bye in any previous round
   * This ensures no player gets more than one bye throughout the tournament
   */
  private getPlayersWithPreviousByes(tournament: ITournament): string[] {
    const playersWithByes: string[] = [];
    
    console.log(`🔍 DEBUGGING: Checking bye history across ${tournament.rounds.length} rounds`);
    
    for (const round of tournament.rounds) {
      console.log(`🔍 Round ${round.roundNumber}: ${round.byePlayers?.length || 0} bye players`);
      if (round.byePlayers && round.byePlayers.length > 0) {
        for (const byePlayer of round.byePlayers) {
          if (!playersWithByes.includes(byePlayer.id)) {
            playersWithByes.push(byePlayer.id);
            console.log(`📝 Found player with previous bye: ${byePlayer.name} (${byePlayer.id}) in Round ${round.roundNumber}`);
          } else {
            console.log(`⚠️  DUPLICATE BYE DETECTION: Player ${byePlayer.name} (${byePlayer.id}) already found with bye in earlier round!`);
          }
        }
      }
    }
    
    console.log(`🔍 FINAL: Total unique players with previous byes: ${playersWithByes.length}`, playersWithByes);
    return playersWithByes;
  }

  private placeByes(round: ITournamentRound, byes: ITournamentPlayer[]): void {
    console.log(`🔄 FIXED: Placing ${byes.length} bye players directly in round ${round.roundNumber} matches`);
    
    let placedByes = 0;
    let matchIndex = 0;
    
    for (const bye of byes) {
      // Find a TBD slot in the matches
      while (matchIndex < round.matches.length) {
        const match = round.matches[matchIndex];
        
        if (match.player1.id === 'TBD') {
          match.player1 = bye;
          placedByes++;
          console.log(`✅ FIXED: Bye player ${bye.name} placed in match ${matchIndex + 1} slot 1`);
          break;
        } else if (match.player2.id === 'TBD') {
          match.player2 = bye;
          placedByes++;
          console.log(`✅ FIXED: Bye player ${bye.name} placed in match ${matchIndex + 1} slot 2`);
          matchIndex++; // Move to next match only after filling both slots
          break;
        } else {
          matchIndex++; // Both slots filled, try next match
        }
      }
    }
    
    console.log(`✅ FIXED: Placed ${placedByes}/${byes.length} bye players in round ${round.roundNumber}`);
  }

  private calculateTotalRounds(playerCount: number): number {
    return Math.ceil(Math.log2(playerCount));
  }

  private getPlayersInRound(roundNumber: number, totalPlayers: number): number {
    return Math.ceil(totalPlayers / Math.pow(2, roundNumber - 1));
  }

  private shufflePlayers(players: ITournamentPlayer[]): ITournamentPlayer[] {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}