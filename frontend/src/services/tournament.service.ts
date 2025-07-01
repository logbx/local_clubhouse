import { api } from './api';

export enum TournamentType {
  SINGLE_ELIMINATION = 'single_elimination',
  SWISS = 'swiss'
}

export interface TournamentPlayer {
  id: string;
  name: string;
  fullName?: string;
  username?: string;
  userId?: string;
  isGuest: boolean;
  hasConfirmedWin?: boolean;
  hasReported?: boolean;
  registeredAt?: string;
  // Swiss tournament specific fields
  points?: number;
  wins?: number;
  buchholzScore?: number;
  pastOpponents?: string[];
}

export interface MatchResult {
  submittedBy: string;
  submittedAt: string;
  winnerId: string;
  loserId: string;
  status: 'submitted' | 'confirmed' | 'disputed' | 'resolvedByCreator';
  disputeReason?: string;
  disputedBy?: string;
  disputedAt?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  notes?: string;
}

export interface TournamentMatch {
  matchId: string;
  roundNumber: number;
  player1: {
    id: string;
    userId: string;
    name: string;
    fullName?: string;
    isGuest?: boolean;
  };
  player2: {
    id: string;
    userId: string;
    name: string;
    fullName?: string;
    isGuest?: boolean;
  };
  status: 'pending' | 'submitted' | 'disputed' | 'completed' | 'forfeit';
  winnerId?: string | null;
  loserId?: string | null;
  isDraw?: boolean;
  result?: {
    winnerId?: string | null;
    loserId?: string | null;
    isDraw?: boolean;
    submittedAt: string;
    notes?: string;
    status?: string;
    disputeReason?: string;
    disputedAt?: string;
    resolvedAt?: string;
  };
  resultReportedBy?: string[];
}

export interface TournamentRound {
  roundNumber: number;
  roundName: string;
  matches: TournamentMatch[];
  byePlayers?: TournamentPlayer[]; // Players who get a bye in this round
  isComplete: boolean;
  startedAt?: string;
  completedAt?: string;
}

export interface Tournament {
  id: string;
  _id?: string;
  name: string;
  eventId: string;
  organizerId: string;
  maxPlayers: number;
  players: TournamentPlayer[];
  rounds: TournamentRound[];
  isStarted: boolean;
  isFinished: boolean;
  registrationOpen: boolean;
  winnerId?: string;
  createdAt: Date;
  updatedAt: Date;
  type: TournamentType;
  numRounds?: number; // Optional for single elimination
  currentRound?: number; // Optional for single elimination
  byePlayers?: TournamentPlayer[];
  standings?: TournamentPlayer[];
  // Frontend-specific fields
  status?: 'registration_open' | 'registration_closed' | 'active' | 'completed';
  registeredUsers?: Array<{
    userId: string;
    username: string;
    registeredAt: number;
  }>;
}

export class TournamentService {
  async createTournament(
    eventId: string,
    name: string,
    maxPlayers: number,
    type: TournamentType,
    numRounds?: number
  ): Promise<Tournament> {
    try {
      const response = await api.post('/api/tournaments/create', {
        eventId,
        name,
        maxPlayers,
        type,
        numRounds: type === TournamentType.SWISS ? numRounds : undefined
      });
      return response.data.data;
    } catch (error) {
      console.error('Error creating tournament:', error);
      throw error;
    }
  }

  async getTournament(tournamentId: string): Promise<Tournament> {
    try {
      const response = await api.get(`/api/tournaments/${tournamentId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching tournament:', error);
      throw error;
    }
  }

  async getTournamentsByEvent(eventId: string): Promise<Tournament[]> {
    try {
      const response = await api.get(`/api/tournaments/event/${eventId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching tournaments by event:', error);
      throw error;
    }
  }

  async registerForTournament(tournamentId: string): Promise<Tournament> {
    try {
      const response = await api.post(`/api/tournaments/${tournamentId}/register`);
      return response.data.data;
    } catch (error) {
      console.error('Error registering for tournament:', error);
      throw error;
    }
  }

  async addGuestPlayer(tournamentId: string, name: string): Promise<Tournament> {
    try {
      const response = await api.post(`/api/tournaments/add-guest`, { 
        tournamentId,
        name 
      });
      return response.data.data;
    } catch (error) {
      console.error('Error adding guest player:', error);
      throw error;
    }
  }

  async removePlayer(tournamentId: string, playerId: string): Promise<Tournament> {
    try {
      const response = await api.delete(`/api/tournaments/remove-player`, {
        data: {
          tournamentId,
          playerId
        }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }

  async startTournament(tournamentId: string): Promise<void> {
    await api.post(`/api/tournaments/${tournamentId}/start`);
  }

  async reportMatchResult(
    tournamentId: string, 
    matchId: string, 
    winnerId: string, 
    loserId: string
  ): Promise<Tournament> {
    try {
      console.log('🏓 Reporting match result:', { tournamentId, matchId, winnerId, loserId });
      const response = await api.post(`/api/tournaments/report-result`, {
        tournamentId,
        matchId,
        winnerId,
        loserId,
      });
      console.log('✅ Match result reported successfully:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ Error reporting match result:', error);
      throw error;
    }
  }

  async confirmMatchResult(tournamentId: string, matchId: string): Promise<Tournament> {
    try {
      const response = await api.post('/api/tournaments/confirm-result', {
        tournamentId,
        matchId,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error confirming match result:', error);
      throw error;
    }
  }

  async overrideMatchResult(
    tournamentId: string, 
    matchId: string, 
    winnerId: string, 
    loserId: string,
    status?: 'completed' | 'forfeit'
  ): Promise<Tournament> {
    try {
      const response = await api.post('/api/tournaments/override-result', {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        status,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error overriding match result:', error);
      throw error;
    }
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    try {
      await api.delete(`/api/tournaments/${tournamentId}`);
    } catch (error) {
      console.error('Error deleting tournament:', error);
      throw error;
    }
  }

  async openRegistration(tournamentId: string): Promise<Tournament> {
    try {
      const response = await api.post(`/api/tournaments/${tournamentId}/open-registration`);
      return response.data.data;
    } catch (error) {
      console.error('Error opening registration:', error);
      throw error;
    }
  }

  async closeRegistration(tournamentId: string): Promise<Tournament> {
    try {
      const response = await api.post(`/api/tournaments/${tournamentId}/close-registration`);
      return response.data.data;
    } catch (error) {
      console.error('Error closing registration:', error);
      throw error;
    }
  }

  async disputeMatchResult(
    tournamentId: string, 
    matchId: string, 
    reason: string
  ): Promise<Tournament> {
    try {
      const response = await api.post('/api/tournaments/dispute-result', {
        tournamentId,
        matchId,
        reason,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error disputing match result:', error);
      throw error;
    }
  }

  async resolveMatchDispute(
    tournamentId: string,
    matchId: string,
    winnerId: string | null,
    loserId: string | null,
    isDraw: boolean = false,
    notes?: string
  ): Promise<void> {
    await api.post(`/api/tournaments/${tournamentId}/matches/${matchId}/resolve-dispute`, {
      winnerId,
      loserId,
      isDraw,
      notes
    });
  }

  async submitMatchResult(
    tournamentId: string, 
    matchId: string, 
    winnerId: string | null, 
    loserId: string | null, 
    isDraw: boolean = false,
    notes?: string
  ): Promise<void> {
    await api.post(`/api/tournaments/${tournamentId}/matches/${matchId}/result`, {
      winnerId,
      loserId,
      isDraw,
      notes
    });
  }

  async forfeitMatch(
    tournamentId: string,
    matchId: string,
    forfeitingPlayerId: string
  ): Promise<void> {
    await api.post(`/api/tournaments/${tournamentId}/matches/${matchId}/forfeit`, {
      forfeitingPlayerId
    });
  }

  async startNextRound(tournamentId: string): Promise<void> {
    await api.post(`/api/tournaments/${tournamentId}/next-round`);
  }
}

export const tournamentService = new TournamentService(); 