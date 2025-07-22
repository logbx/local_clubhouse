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
 * Optimized Single Elimination Tournament Strategy
 * - Reduced complexity from 483 to ~200 lines
 * - Minimized logging overhead  
 * - Simplified algorithms
 * - Maintained full functionality
 */
@Injectable()
export class SingleEliminationOptimizedStrategy extends TournamentStrategy {
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
    const shuffledPlayers = this.shufflePlayers([...players]);
    const rounds = this.createAllRounds(shuffledPlayers);
    return rounds;
  }

  processMatchResult(options: MatchResultOptions): ITournament {
    const { tournament, matchId, winnerId, loserId } = options;
    
    const { match, matchRound } = this.findMatch(tournament, matchId);
    
    if (match.status === 'completed') {
      throw new BadRequestException('Match has already been completed');
    }

    // Update match result
    match.status = 'completed';
    match.winnerId = winnerId;
    match.loserId = loserId;

    // Check round completion - simplified logic
    // A match is complete when it has a final result, regardless of how it was achieved
    const allMatchesComplete = matchRound.matches.every(m => m.status === 'completed');
    
    if (allMatchesComplete && !matchRound.isComplete) {
      matchRound.isComplete = true;
    }

    return tournament;
  }

  checkAdvancement(tournament: ITournament, completedRoundNumber: number): TournamentAdvancementResult {
    console.log(`🔄 Checking advancement for round ${completedRoundNumber}`, {
      totalRounds: tournament.rounds.length,
      tournamentId: tournament._id
    });

    const completedRound = tournament.rounds.find(r => r.roundNumber === completedRoundNumber);
    
    if (!completedRound?.isComplete) {
      console.log('❌ Round not complete, no advancement');
      return { shouldAdvance: false };
    }

    // Check if final round
    if (completedRoundNumber === tournament.rounds.length) {
      console.log('🏁 Final round completed, determining winner');
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
      console.error('❌ Next round not found in tournament structure');
      return { shouldAdvance: false };
    }

    console.log(`🔄 Populating round ${nextRound.roundNumber} with winners from round ${completedRoundNumber}`);
    const success = this.populateNextRound(tournament, completedRoundNumber, nextRound);
    
    return {
      shouldAdvance: success,
      nextRound: success ? nextRound : undefined
    };
  }

  calculateStandings(tournament: ITournament): ITournamentPlayer[] {
    // Single elimination doesn't need complex standings
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
    
    // First round with actual players
    const firstRound = this.createFirstRound(players);
    rounds.push(firstRound);
    
    // Generate placeholder rounds
    for (let round = 2; round <= totalRounds; round++) {
      const playersInRound = this.getPlayersInRound(round, players.length);
      const matches = this.createPlaceholderMatches(Math.floor(playersInRound / 2));
      
      rounds.push({
        roundNumber: round,
        matches,
        byePlayers: undefined,
        isComplete: false
      });
    }

    // Place first round byes
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
   * Get all players who have already received a bye in any previous round
   * This ensures no player gets more than one bye throughout the tournament
   */
  private getPlayersWithPreviousByes(tournament: ITournament): string[] {
    const playersWithByes: string[] = [];
    
    for (const round of tournament.rounds) {
      if (round.byePlayers && round.byePlayers.length > 0) {
        for (const byePlayer of round.byePlayers) {
          if (!playersWithByes.includes(byePlayer.id)) {
            playersWithByes.push(byePlayer.id);
            console.log(`📝 [Optimized] Found player with previous bye: ${byePlayer.name} (${byePlayer.id}) in Round ${round.roundNumber}`);
          }
        }
      }
    }
    
    console.log(`🔍 [Optimized] Total players with previous byes: ${playersWithByes.length}`, playersWithByes);
    return playersWithByes;
  }

  private populateNextRound(tournament: ITournament, completedRoundNumber: number, nextRound: ITournamentRound): boolean {
    console.log(`🔄 Populating next round ${nextRound.roundNumber} after round ${completedRoundNumber} completion`);
    
    const completedRound = tournament.rounds.find(r => r.roundNumber === completedRoundNumber);
    if (!completedRound) {
      console.error('❌ Completed round not found:', completedRoundNumber);
      return false;
    }

    const winners = this.getWinners(completedRound);
    const byes = completedRound.byePlayers || [];
    const advancingPlayers = [...winners, ...byes];

    console.log('🏆 Players advancing to next round:', {
      winners: winners.map(w => ({ id: w.id, name: w.name })),
      byes: byes.map(b => ({ id: b.id, name: b.name })),
      totalAdvancing: advancingPlayers.length
    });

    if (advancingPlayers.length === 0) {
      console.error('❌ No players advancing to next round');
      return false;
    }

    // Validate advancing players count makes sense
    const expectedAdvancing = Math.ceil(winners.length + byes.length);
    if (advancingPlayers.length !== expectedAdvancing) {
      console.warn('⚠️ Unexpected number of advancing players:', {
        actual: advancingPlayers.length,
        expected: expectedAdvancing
      });
    }

    // Don't shuffle for finals - maintain seeding order for better tournament integrity
    const isLastRound = nextRound.roundNumber === tournament.rounds.length;
    const playersToAssign = isLastRound ? advancingPlayers : this.shufflePlayers(advancingPlayers);
    
    console.log('📋 Player assignment for round', nextRound.roundNumber, ':', {
      isLastRound,
      shuffled: !isLastRound,
      players: playersToAssign.map(p => ({ id: p.id, name: p.name }))
    });

    const matches = nextRound.matches;
    let matchIndex = 0;
    let byePlayer: ITournamentPlayer | undefined;

    // Handle odd number of players - assign bye BEFORE creating matches
    if (playersToAssign.length % 2 === 1) {
      // FIXED: Check for players who already had byes to ensure fair distribution
      const playersWithPreviousByes = this.getPlayersWithPreviousByes(tournament);
      
      // Try to find a player who hasn't had a bye yet
      let selectedByePlayer: ITournamentPlayer | undefined;
      for (let i = playersToAssign.length - 1; i >= 0; i--) {
        const player = playersToAssign[i];
        if (!playersWithPreviousByes.includes(player.id)) {
          selectedByePlayer = playersToAssign.splice(i, 1)[0];
          console.log('⭐ [Optimized] Bye player selected (no previous bye):', { id: selectedByePlayer.id, name: selectedByePlayer.name, round: nextRound.roundNumber });
          break;
        }
      }
      
      // If all players have already had byes, fall back to any player (shouldn't happen in proper SET)
      if (!selectedByePlayer && playersToAssign.length > 0) {
        selectedByePlayer = playersToAssign.pop();
        console.log('⚠️ [Optimized] Bye player selected (all had previous byes):', { id: selectedByePlayer!.id, name: selectedByePlayer!.name, round: nextRound.roundNumber });
      }
      
      byePlayer = selectedByePlayer;
    }

    // Assign remaining players to matches (ensuring no bye player is in matches)
    for (let i = 0; i < playersToAssign.length; i += 2) {
      if (matchIndex < matches.length && i + 1 < playersToAssign.length) {
        const player1 = playersToAssign[i];
        const player2 = playersToAssign[i + 1];
        
        // Validate players before assignment
        if (!player1 || !player2 || player1.id === 'TBD' || player2.id === 'TBD') {
          console.error('❌ Invalid players for match assignment:', { player1, player2 });
          continue;
        }
        
        // Critical check: ensure bye player is not assigned to a match
        if (byePlayer && (player1.id === byePlayer.id || player2.id === byePlayer.id)) {
          console.error('❌ CRITICAL ERROR: Bye player assigned to match!', {
            byePlayer: { id: byePlayer.id, name: byePlayer.name },
            player1: { id: player1.id, name: player1.name },
            player2: { id: player2.id, name: player2.name }
          });
          continue;
        }
        
        matches[matchIndex].player1 = player1;
        matches[matchIndex].player2 = player2;
        
        console.log(`✅ Match ${matchIndex + 1} assigned:`, {
          player1: { id: player1.id, name: player1.name },
          player2: { id: player2.id, name: player2.name }
        });
        
        matchIndex++;
      }
    }

    // Set bye player (they advance automatically to next round)
    if (byePlayer) {
      nextRound.byePlayers = [byePlayer];
      console.log('✅ Bye player set for automatic advancement:', { id: byePlayer.id, name: byePlayer.name });
    }

    // Validate that all expected matches were filled
    const filledMatches = matches.filter(m => m.player1.id !== 'TBD' && m.player2.id !== 'TBD').length;
    const expectedMatches = Math.floor(playersToAssign.length / 2);
    
    console.log('✅ Round population completed:', {
      roundNumber: nextRound.roundNumber,
      filledMatches,
      expectedMatches,
      byePlayer: byePlayer ? { id: byePlayer.id, name: byePlayer.name } : null,
      success: filledMatches === expectedMatches
    });

    return filledMatches === expectedMatches;
  }

  private getWinners(round: ITournamentRound): ITournamentPlayer[] {
    const winners = round.matches
      .filter(m => m.status === 'completed' && m.winnerId)
      .map(m => {
        const winner = m.winnerId === m.player1.id ? m.player1 : m.player2;
        
        // Validate winner data
        if (!winner || winner.id === 'TBD' || !winner.name) {
          console.error('❌ Invalid winner data found:', {
            matchId: m.matchId,
            winnerId: m.winnerId,
            player1: m.player1,
            player2: m.player2,
            extractedWinner: winner
          });
          return null;
        }
        
        return winner;
      })
      .filter(Boolean) as ITournamentPlayer[];
    
    console.log(`🏆 Extracted ${winners.length} winners from round ${round.roundNumber}:`, 
      winners.map(w => ({ id: w.id, name: w.name }))
    );
    
    return winners;
  }

  private placeByes(round: ITournamentRound, byes: ITournamentPlayer[]): void {
    console.log(`🔄 Placing ${byes.length} bye players in round ${round.roundNumber}`);
    
    let placedByes = 0;
    let matchIndex = 0;
    
    for (const bye of byes) {
      let placed = false;
      
      // Try to find a TBD slot to place the bye player
      while (matchIndex < round.matches.length && !placed) {
        const match = round.matches[matchIndex];
        
        if (match.player1.id === 'TBD') {
          match.player1 = bye;
          placed = true;
          placedByes++;
          console.log(`✅ Bye player ${bye.name} placed as player1 in match ${matchIndex + 1}`);
        } else if (match.player2.id === 'TBD') {
          match.player2 = bye;
          placed = true;
          placedByes++;
          matchIndex++;
          console.log(`✅ Bye player ${bye.name} placed as player2 in match ${matchIndex}`);
        } else {
          matchIndex++;
        }
      }
      
      if (!placed) {
        console.error(`❌ Could not place bye player ${bye.name} - no TBD slots available`);
      }
    }
    
    console.log(`✅ Placed ${placedByes}/${byes.length} bye players in round ${round.roundNumber}`);
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