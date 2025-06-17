import { api } from './api';

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
  player1: TournamentPlayer;
  player2: TournamentPlayer;
  winnerId?: string;
  loserId?: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'disputed' | 'completed' | 'forfeit';
  result?: MatchResult;
  resultHistory?: MatchResult[];
  resultReportedBy?: string[];
  disputeReason?: string;
  disputedBy?: string;
  disputedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  canSubmitResult: boolean;
  requiresCreatorDecision: boolean;
  createdAt: string;
  completedAt?: string;
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
}

class TournamentService {
  async createTournament(name: string, eventId: string, maxPlayers: number): Promise<Tournament> {
    // Creating tournament: ${name} for event ${eventId}
    
    try {
      // Check if we have authentication token
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }

      const response = await api.post('/api/tournaments/create', {
        name,
        eventId,
        maxPlayers,
      });
      
      console.log('✅ Tournament creation successful:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error creating tournament:', error);
      
      // Enhanced error logging
      const errorDetails = {
        message: error?.message,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        data: error?.response?.data,
        url: error?.config?.url,
        method: error?.config?.method,
        headers: error?.config?.headers,
        isAuthError: error?.response?.status === 401,
        isNetworkError: !error?.response,
        fullRequestConfig: error?.config
      };
      
      console.error('📊 Detailed error info:', errorDetails);
      
      // Log the exact request that was made
      if (error?.config) {
        console.error('🔍 Exact request that failed:', {
          method: error.config.method?.toUpperCase(),
          url: error.config.url,
          baseURL: error.config.baseURL,
          fullURL: `${error.config.baseURL}${error.config.url}`,
          headers: error.config.headers,
          data: error.config.data
        });
      }
      
      // Handle specific error cases
      if (error?.response?.status === 401) {
        console.warn('🔑 Authentication failed - redirecting to login');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Session expired. Please log in again.');
      }
      
      if (error?.response?.status === 404) {
        console.warn('🔍 Tournament API endpoint not found');
        console.error('🚨 This should not happen if backend is running correctly!');
        
        // Let's test connectivity right now
        try {
          const healthCheck = await fetch(`${api.defaults.baseURL}/api/health`);
          console.log('🏥 Health check status:', healthCheck.status);
          if (healthCheck.ok) {
            console.error('🤔 Backend is healthy but tournament endpoint returned 404');
            console.error('💡 This suggests a routing or middleware issue');
          }
        } catch (healthError) {
          console.error('🚫 Backend health check failed:', healthError);
        }
        
        throw new Error('Tournament service unavailable. Please try again later.');
      }
      
      if (!error?.response) {
        console.warn('🌐 Network error detected');
        throw new Error('Network error. Please check your connection and try again.');
      }
      
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
      const response = await api.post('/api/tournaments/add-guest', {
        tournamentId,
        name,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error adding guest player:', error);
      throw error;
    }
  }

  async removePlayer(tournamentId: string, playerId: string): Promise<Tournament> {
    try {
      const response = await api.delete('/api/tournaments/remove-player', {
        data: {
          tournamentId,
          playerId,
        },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error removing player:', error);
      throw error;
    }
  }

  async startTournament(tournamentId: string): Promise<Tournament> {
    try {
      const response = await api.post(`/api/tournaments/${tournamentId}/start`);
      return response.data.data;
    } catch (error) {
      console.error('Error starting tournament:', error);
      throw error;
    }
  }

  async reportMatchResult(
    tournamentId: string, 
    matchId: string, 
    winnerId: string, 
    loserId: string
  ): Promise<Tournament> {
    try {
      console.log('🏓 Reporting match result:', { tournamentId, matchId, winnerId, loserId });
      // Use the correct report-result endpoint (cache issues now prevented)
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

  // Match Result Operations
  async submitMatchResult(
    tournamentId: string, 
    matchId: string, 
    winnerId: string, 
    loserId: string,
    notes?: string
  ): Promise<Tournament> {
    try {
      console.log('🎯 Frontend submitMatchResult called with:', {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        notes,
        timestamp: new Date().toISOString()
      });
      
      const requestData = {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        notes,
      };
      
      console.log('📤 Making POST request to /api/tournaments/submit-result with data:', requestData);
      console.log('🌐 API base URL:', api.defaults.baseURL);
      console.log('🔑 Auth token exists:', !!localStorage.getItem('accessToken'));
      
      const response = await api.post('/api/tournaments/submit-result', requestData);
      
      console.log('✅ Submit result response received:', response.data);
      return response.data.data;
    } catch (error) {
      console.error('❌ Error submitting match result:', error);
      
      // Add more detailed error logging
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as any;
        console.error('📋 Detailed error info:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          url: axiosError.config?.url,
          method: axiosError.config?.method,
          baseURL: axiosError.config?.baseURL
        });
      }
      
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
    winnerId: string, 
    loserId: string,
    notes?: string
  ): Promise<Tournament> {
    try {
      const response = await api.post('/api/tournaments/resolve-dispute', {
        tournamentId,
        matchId,
        winnerId,
        loserId,
        notes,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error resolving match dispute:', error);
      throw error;
    }
  }

  async forfeitMatch(
    tournamentId: string, 
    matchId: string, 
    forfeitingPlayerId: string
  ): Promise<Tournament> {
    try {
      const response = await api.post('/api/tournaments/forfeit-match', {
        tournamentId,
        matchId,
        forfeitingPlayerId
      });
      return response.data.data;
    } catch (error) {
      console.error('Error forfeiting match:', error);
      throw error;
    }
  }
}

export const tournamentService = new TournamentService(); 