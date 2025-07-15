import { api } from './api';
import { AxiosError } from 'axios';

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
  status: 'pending' | 'submitted' | 'confirmed' | 'disputed' | 'completed' | 'forfeit';
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
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching tournaments by event:', error);
      return [];
    }
  }

  async registerForTournament(tournamentId: string): Promise<Tournament> {
    try {
      // Use longer timeout for tournament registration due to potential delays
      const response = await api.post(`/api/tournaments/${tournamentId}/register`, {}, {
        timeout: 45000 // 45 seconds timeout
      });
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
      const response = await api.post(`/api/tournaments/${tournamentId}/report-result`, {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        result: 'win' // Required by ReportResultDto
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
      const requestData = {
        tournamentId,
        matchId,
      };
      console.log('🔍 Confirming match result with data:', requestData);
      const response = await api.post('/api/tournaments/confirm-result', requestData);
      return response.data.data;
    } catch (error) {
      console.error('Error confirming match result:', error);
      if (error instanceof AxiosError) {
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
      }
      throw error;
    }
  }

  async overrideMatchResult(
    tournamentId: string, 
    matchId: string, 
    winnerId: string | null, 
    loserId: string | null,
    status?: 'completed' | 'forfeit',
    result?: 'win' | 'loss' | 'draw',
    reason?: string
  ): Promise<Tournament> {
    try {
      const payload: any = {
        tournamentId,
        matchId,
        status,
      };

      // Only include winnerId and loserId if they are not null and not undefined
      if (winnerId !== null && winnerId !== undefined) {
        payload.winnerId = winnerId;
      }
      if (loserId !== null && loserId !== undefined) {
        payload.loserId = loserId;
      }

      // Include result if specified
      if (result !== undefined) {
        payload.result = result;
      }

      // Include reason if specified
      if (reason !== undefined) {
        payload.reason = reason;
      }

      console.log('🏓 Override result payload:', payload);
      const response = await api.post('/api/tournaments/override-result', payload);
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
  ): Promise<Tournament> {
    const response = await api.post(`/api/tournaments/${tournamentId}/matches/${matchId}/resolve-dispute`, {
      winnerId,
      loserId,
      isDraw,
      notes
    });
    return response.data.data;
  }

  async submitMatchResult(
    tournamentId: string, 
    matchId: string, 
    winnerId: string | null, 
    loserId: string | null, 
    isDraw: boolean = false,
    notes?: string
  ): Promise<Tournament> {
    try {
      console.log('📤 Submitting match result:', {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        result: isDraw ? 'draw' : 'win',
        isDraw,
        notes
      });
      
      const response = await api.post('/api/tournaments/submit-result', {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        result: isDraw ? 'draw' : 'win',
        isDraw,
        notes
      });
      return response.data.data;
    } catch (error) {
      console.error('Error submitting match result:', error);
      if (error instanceof AxiosError) {
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
      }
      throw error;
    }
  }

  async overrideResult(
    tournamentId: string,
    matchId: string,
    winnerId: string | null,
    loserId: string | null,
    result: 'win' | 'loss' | 'draw',
    reason?: string
  ): Promise<Tournament> {
    try {
      const response = await api.post('/api/tournaments/override-result', {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        result,
        reason,
        status: 'completed'
      });
      return response.data.data;
    } catch (error) {
      console.error('Error overriding match result:', error);
      throw error;
    }
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

  async forceRoundCompletion(tournamentId: string): Promise<Tournament> {
    const response = await api.post(`/api/tournaments/${tournamentId}/force-round-completion`);
    return response.data.data;
  }
}

export const tournamentService = new TournamentService(); 