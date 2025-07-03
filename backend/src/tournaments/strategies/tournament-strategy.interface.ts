import { ITournament, ITournamentPlayer, ITournamentRound, TournamentType } from '../../models/tournament.model';

export interface TournamentCreationOptions {
  name: string;
  eventId: string;
  organizerId: string;
  maxPlayers: number;
  type?: TournamentType;
  numRounds?: number;
}

export interface TournamentStartOptions {
  tournament: ITournament;
  players: ITournamentPlayer[];
}

export interface MatchResultOptions {
  tournament: ITournament;
  matchId: string;
  winnerId?: string;
  loserId?: string;
  result?: 'win' | 'loss' | 'draw';
  isDraw?: boolean;
}

export interface TournamentAdvancementResult {
  shouldAdvance: boolean;
  nextRound?: ITournamentRound;
  isComplete?: boolean;
  winnerId?: string;
}

export abstract class TournamentStrategy {
  abstract readonly type: TournamentType;
  
  /**
   * Validate tournament creation parameters for this tournament type
   */
  abstract validateCreation(options: TournamentCreationOptions): void;
  
  /**
   * Initialize tournament-specific settings during creation
   */
  abstract initializeTournament(tournament: ITournament, options: TournamentCreationOptions): ITournament;
  
  /**
   * Validate that tournament can be started
   */
  abstract validateStart(options: TournamentStartOptions): void;
  
  /**
   * Generate initial tournament structure (rounds, brackets, etc.)
   */
  abstract generateInitialStructure(players: ITournamentPlayer[], tournament: ITournament): ITournamentRound[];
  
  /**
   * Process match result and update player statistics
   */
  abstract processMatchResult(options: MatchResultOptions): ITournament;
  
  /**
   * Check if tournament should advance to next round and generate it if needed
   */
  abstract checkAdvancement(tournament: ITournament, completedRoundNumber: number): TournamentAdvancementResult;
  
  /**
   * Calculate final standings for this tournament type
   */
  abstract calculateStandings(tournament: ITournament): ITournamentPlayer[];
  
  /**
   * Determine if tournament is complete
   */
  abstract isComplete(tournament: ITournament): boolean;
  
  /**
   * Get the winner of the tournament
   */
  abstract getWinner(tournament: ITournament): ITournamentPlayer | null;
  
  /**
   * Get human-readable round name (e.g., "Finals", "Semi-Finals", "Round 1")
   */
  abstract getRoundName(roundNumber: number, tournament: ITournament): string;
  
  /**
   * Validate match result for this tournament type
   */
  abstract validateMatchResult(options: MatchResultOptions): void;
}