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

@Injectable()
export class SingleEliminationStrategy extends TournamentStrategy {
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
    // Calculate number of rounds based on max players
    tournament.numRounds = Math.ceil(Math.log2(options.maxPlayers));
    return tournament;
  }

  validateStart(options: TournamentStartOptions): void {
    if (options.players.length < 2) {
      throw new BadRequestException('Single elimination tournament needs at least 2 players to start');
    }
  }

  generateInitialStructure(players: ITournamentPlayer[], tournament: ITournament): ITournamentRound[] {
    const rounds: ITournamentRound[] = [];
    const shuffledPlayers = this.shufflePlayers([...players]);
    
    // Generate first round with actual players
    const firstRoundMatches: ITournamentMatch[] = [];
    const firstRoundByes: ITournamentPlayer[] = [];

    // Handle first round: pair players for matches, give byes to remaining odd player
    for (let i = 0; i < shuffledPlayers.length; i += 2) {
      const player1 = shuffledPlayers[i];
      const player2 = shuffledPlayers[i + 1];

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

    // Add first round
    rounds.push({
      roundNumber: 1,
      matches: firstRoundMatches,
      byePlayers: firstRoundByes.length > 0 ? firstRoundByes : undefined,
      isComplete: false
    });

    // Calculate total rounds needed
    const totalRounds = this.calculateTotalRounds(players.length);
    
    // Pre-generate all subsequent rounds with placeholder matches
    for (let round = 2; round <= totalRounds; round++) {
      const playersAdvancingToThisRound = this.getPreviousRoundWinnerCount(round, players.length);
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
        byePlayers: undefined,
        isComplete: false
      });
    }

    // If there are first round byes, immediately place them in the second round
    if (firstRoundByes.length > 0 && rounds.length > 1) {
      this.placeByes(rounds[1], firstRoundByes);
    }

    return rounds;
  }

  processMatchResult(options: MatchResultOptions): ITournament {
    console.log('🔄 SingleEliminationStrategy.processMatchResult called with:', {
      matchId: options.matchId,
      winnerId: options.winnerId,
      loserId: options.loserId,
      tournamentId: options.tournament._id || options.tournament.id
    });

    const { tournament, matchId, winnerId, loserId } = options;
    
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
    match.winnerId = winnerId;
    match.loserId = loserId;

    console.log('🔍 Checking if round is complete...');
    // Mark round as complete if all matches are done (completed, forfeit, etc.)
    const finalStatuses = ['completed', 'forfeit'];
    const allMatchesComplete = matchRound.matches.every(m => finalStatuses.includes(m.status));
    console.log('📊 Round completion status:', {
      roundNumber: matchRound.roundNumber,
      totalMatches: matchRound.matches.length,
      completedMatches: matchRound.matches.filter(m => finalStatuses.includes(m.status)).length,
      matchStatuses: matchRound.matches.map(m => ({ id: m.matchId, status: m.status })),
      allMatchesComplete
    });

    if (allMatchesComplete) {
      matchRound.isComplete = true;
      console.log('✅ Round marked as complete!');
    }

    console.log('✅ SingleEliminationStrategy.processMatchResult completed successfully');
    return tournament;
  }

  checkAdvancement(tournament: ITournament, completedRoundNumber: number): TournamentAdvancementResult {
    console.log('🔄 SingleEliminationStrategy.checkAdvancement called:', {
      completedRoundNumber,
      totalRounds: tournament.rounds.length
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

    // Check if this is the final round
    if (completedRoundNumber === tournament.rounds.length) {
      console.log('🏁 This is the final round, tournament complete');
      const winner = this.getWinner(tournament);
      return {
        shouldAdvance: false,
        isComplete: true,
        winnerId: winner?.id
      };
    }

    // Advance winners to next round
    const nextRound = tournament.rounds[completedRoundNumber]; // Next round (0-indexed)
    console.log('🔍 Next round check:', {
      nextRoundIndex: completedRoundNumber,
      nextRoundExists: !!nextRound,
      nextRoundNumber: nextRound?.roundNumber
    });

    if (nextRound) {
      console.log('🔄 Populating next round...');
      const advancementResult = this.populateNextRound(tournament, completedRoundNumber);
      console.log('📊 Advancement result:', {
        shouldAdvanceToNextRound: advancementResult.shouldAdvanceToNextRound,
        matchCount: advancementResult.nextRoundMatches?.length
      });

      if (advancementResult.shouldAdvanceToNextRound) {
        console.log('✅ Advancing to next round');
        // Return the updated round with new player assignments
        return {
          shouldAdvance: true,
          nextRound: {
            ...nextRound,
            matches: advancementResult.nextRoundMatches || nextRound.matches,
            byePlayers: advancementResult.byePlayers
          }
        };
      }
    }

    console.log('❌ No advancement');
    return { shouldAdvance: false };
  }

  calculateStandings(tournament: ITournament): ITournamentPlayer[] {
    // For single elimination, standings are based on elimination round
    const standings: ITournamentPlayer[] = [];
    const winner = this.getWinner(tournament);
    
    if (winner) {
      standings.push(winner);
    }

    // Add other players based on when they were eliminated
    // This is a simplified version - could be enhanced with more detailed tracking
    const remainingPlayers = tournament.players.filter(p => p.id !== winner?.id);
    standings.push(...remainingPlayers);

    return standings;
  }

  isComplete(tournament: ITournament): boolean {
    if (!tournament.isStarted || tournament.rounds.length === 0) {
      return false;
    }

    const finalRound = tournament.rounds[tournament.rounds.length - 1];
    return finalRound.isComplete === true;
  }

  getWinner(tournament: ITournament): ITournamentPlayer | null {
    if (!this.isComplete(tournament)) {
      return null;
    }

    const finalRound = tournament.rounds[tournament.rounds.length - 1];
    if (finalRound.matches.length === 1) {
      const finalMatch = finalRound.matches[0];
      if (finalMatch.winnerId) {
        return finalMatch.player1.id === finalMatch.winnerId 
          ? finalMatch.player1 
          : finalMatch.player2;
      }
    }

    return null;
  }

  getRoundName(roundNumber: number, tournament: ITournament): string {
    const totalRounds = tournament.rounds.length;
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

  validateMatchResult(options: MatchResultOptions): void {
    if (!options.winnerId || !options.loserId) {
      throw new BadRequestException('Single elimination matches must have a winner and loser');
    }

    if (options.winnerId === options.loserId) {
      throw new BadRequestException('Winner and loser cannot be the same player');
    }

    if (options.result === 'draw') {
      throw new BadRequestException('Single elimination matches cannot end in a draw');
    }
  }

  // Private helper methods
  private shufflePlayers(players: ITournamentPlayer[]): ITournamentPlayer[] {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  private calculateTotalRounds(playerCount: number): number {
    return Math.ceil(Math.log2(playerCount));
  }

  private getPreviousRoundWinnerCount(currentRound: number, totalPlayers: number): number {
    if (currentRound === 1) {
      return totalPlayers;
    }
    
    let playersInRound = totalPlayers;
    for (let round = 1; round < currentRound; round++) {
      playersInRound = Math.ceil(playersInRound / 2);
    }
    
    return playersInRound;
  }

  private placeByes(round: ITournamentRound, byePlayers: ITournamentPlayer[]): void {
    let matchIndex = 0;
    
    for (const byePlayer of byePlayers) {
      while (matchIndex < round.matches.length) {
        const match = round.matches[matchIndex];
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

  private populateNextRound(tournament: ITournament, completedRoundNumber: number): { shouldAdvanceToNextRound: boolean; nextRoundMatches?: ITournamentMatch[]; byePlayers?: ITournamentPlayer[] } {
    const completedRound = tournament.rounds.find(r => r.roundNumber === completedRoundNumber);
    if (!completedRound) {
      return { shouldAdvanceToNextRound: false };
    }

    console.log('🔍 DEBUGGING: Completed round matches:', completedRound.matches.map(m => ({
      matchId: m.matchId,
      player1: { id: m.player1.id, name: m.player1.name },
      player2: { id: m.player2.id, name: m.player2.name },
      winnerId: m.winnerId,
      loserId: m.loserId,
      status: m.status
    })));

    // Get winners from completed round
    const winners: ITournamentPlayer[] = completedRound.matches
      .map(match => {
        if (match.winnerId) {
          const winner = match.player1.id === match.winnerId ? match.player1 : match.player2;
          console.log('🔍 DEBUGGING: Match winner:', {
            matchId: match.matchId,
            winnerId: match.winnerId,
            player1: { id: match.player1.id, name: match.player1.name },
            player2: { id: match.player2.id, name: match.player2.name },
            selectedWinner: { id: winner.id, name: winner.name }
          });
          return winner;
        }
        return null;
      })
      .filter(Boolean) as ITournamentPlayer[];

    // Get bye players from the completed round
    const byePlayersFromCompletedRound: ITournamentPlayer[] = completedRound.byePlayers || [];
    
    // Combine winners and bye players
    const allAdvancingPlayers = [...winners, ...byePlayersFromCompletedRound];

    // CRITICAL: Check for duplicate players
    const playerIds = allAdvancingPlayers.map(p => p.id);
    const uniquePlayerIds = [...new Set(playerIds)];
    
    if (playerIds.length !== uniquePlayerIds.length) {
      console.error('🚨 CRITICAL ERROR: Duplicate players found advancing to next round!', {
        allPlayerIds: playerIds,
        duplicates: playerIds.filter((id, index) => playerIds.indexOf(id) !== index),
        playersAdvancing: allAdvancingPlayers.map(p => ({ id: p.id, name: p.name }))
      });
      
      // Remove duplicates, keeping the first occurrence
      const uniquePlayers = allAdvancingPlayers.filter((player, index) => 
        playerIds.indexOf(player.id) === index
      );
      console.log('🔧 Corrected advancing players:', uniquePlayers.map(p => ({ id: p.id, name: p.name })));
      
      // Use the deduplicated list
      allAdvancingPlayers.length = 0;
      allAdvancingPlayers.push(...uniquePlayers);
    }

    const nextRoundNumber = completedRoundNumber + 1;
    const nextRound = tournament.rounds.find(r => r.roundNumber === nextRoundNumber);
    
    if (!nextRound) {
      return { shouldAdvanceToNextRound: false };
    }

    console.log('🔄 Advancing players to next round:', {
      completedRoundNumber,
      nextRoundNumber,
      winners: winners.map(w => w.name),
      byes: byePlayersFromCompletedRound.map(b => b.name),
      totalAdvancing: allAdvancingPlayers.length
    });

    // Shuffle advancing players for randomized matchups
    const shuffledAdvancingPlayers = this.shufflePlayers(allAdvancingPlayers);
    const nextRoundMatches: ITournamentMatch[] = [];
    
    // Handle odd number of advancing players
    let byePlayer: ITournamentPlayer | null = null;
    let playersForMatches = [...shuffledAdvancingPlayers];
    
    if (shuffledAdvancingPlayers.length % 2 === 1) {
      const byeIndex = Math.floor(Math.random() * shuffledAdvancingPlayers.length);
      byePlayer = shuffledAdvancingPlayers[byeIndex];
      playersForMatches = shuffledAdvancingPlayers.filter(player => player.id !== byePlayer!.id);
      console.log('👋 Bye player selected for next round:', byePlayer.name);
    }

    // Create matches for paired players
    for (let i = 0; i < playersForMatches.length; i += 2) {
      const player1 = playersForMatches[i];
      const player2 = playersForMatches[i + 1];
      
      if (player1 && player2) {
        const match = {
          matchId: uuidv4(),
          player1,
          player2,
          resultReportedBy: [],
          status: 'pending' as const,
        };
        nextRoundMatches.push(match);
        console.log('🥊 Created next round match:', `${player1.name} vs ${player2.name}`);
      }
    }

    console.log('✅ Next round populated:', {
      roundNumber: nextRoundNumber,
      matches: nextRoundMatches.length,
      byePlayer: byePlayer?.name
    });

    // Don't modify the tournament directly - return the data for the base service to handle
    return { 
      shouldAdvanceToNextRound: true, 
      nextRoundMatches,
      byePlayers: byePlayer ? [byePlayer] : undefined
    };
  }
}