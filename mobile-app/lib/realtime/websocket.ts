import { Platform } from 'react-native';
import { useAuthStore } from '../stores/auth.store';
import { useClubStore } from '../stores/club.store';
import { useEventStore } from '../stores/event.store';
import { useTournamentStore } from '../stores/tournament.store';
import type { WebSocketMessage, RealtimeUpdate } from '../db/types';

type EventHandler = (data: any) => void;
type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error';

interface RealtimeConfig {
  url: string;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

class RealtimeSync {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, Set<EventHandler>> = new Map();
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private config: RealtimeConfig;
  private messageQueue: WebSocketMessage[] = [];

  constructor(config?: Partial<RealtimeConfig>) {
    this.config = {
      url: process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:3001',
      reconnectInterval: 3000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      ...config,
    };

    // Setup default handlers for store updates
    this.setupStoreHandlers();
  }

  private setupStoreHandlers() {
    // Club updates
    this.on('club:update', (data) => {
      useClubStore.getState().updateClubLocally(data.club.id, data.club);
    });

    this.on('club:member:added', (data) => {
      const clubStore = useClubStore.getState();
      clubStore.updateClubLocally(data.clubId, {
        memberCount: (clubStore.currentClub?.memberCount || 0) + 1
      });
    });

    this.on('club:member:removed', (data) => {
      const clubStore = useClubStore.getState();
      clubStore.updateClubLocally(data.clubId, {
        memberCount: Math.max(0, (clubStore.currentClub?.memberCount || 0) - 1)
      });
    });

    // Event updates
    this.on('event:update', (data) => {
      useEventStore.getState().updateEventLocally(data.event.id, data.event);
    });

    this.on('event:rsvp', (data) => {
      const eventStore = useEventStore.getState();
      eventStore.updateEventLocally(data.eventId, {
        currentAttendees: data.newCount
      });
    });

    this.on('event:checkin', (data) => {
      const eventStore = useEventStore.getState();
      if (data.userId === useAuthStore.getState().user?.id) {
        eventStore.updateEventLocally(data.eventId, {
          userCheckedIn: true
        });
      }
    });

    // Tournament updates
    this.on('tournament:update', (data) => {
      useTournamentStore.getState().updateTournamentLocally(data.tournament.id, data.tournament);
    });

    this.on('tournament:match:update', (data) => {
      useTournamentStore.getState().updateMatchLocally(data.match._id, data.match);
    });

    this.on('tournament:round:generated', (data) => {
      const tournamentStore = useTournamentStore.getState();
      tournamentStore.updateTournamentLocally(data.tournamentId, {
        currentRound: data.roundNumber
      });
      
      // Refresh matches for current tournament
      if (tournamentStore.currentTournament?.id === data.tournamentId) {
        tournamentStore.fetchTournamentMatches(data.tournamentId);
      }
    });

    this.on('tournament:player:added', (data) => {
      const tournamentStore = useTournamentStore.getState();
      tournamentStore.updateTournamentLocally(data.tournamentId, {
        currentPlayers: data.newPlayerCount
      });
    });

    // Live match updates
    this.on('match:live:start', (data) => {
      useTournamentStore.getState().updateMatchLocally(data.matchId, {
        status: 'in_progress',
        isLive: true
      });
    });

    this.on('match:live:score', (data) => {
      useTournamentStore.getState().updateMatchLocally(data.matchId, {
        liveScore: data.score
      });
    });

    this.on('match:live:end', (data) => {
      useTournamentStore.getState().updateMatchLocally(data.matchId, {
        status: 'completed',
        isLive: false,
        result: data.result
      });
    });
  }

  connect(token?: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectionState === 'connected') {
        resolve();
        return;
      }

      this.setConnectionState('connecting');

      try {
        const authToken = token || useAuthStore.getState().token;
        const wsUrl = `${this.config.url}?token=${encodeURIComponent(authToken || '')}`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔌 WebSocket connected');
          this.setConnectionState('connected');
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.processMessageQueue();
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('❌ Failed to parse WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('🔌 WebSocket disconnected:', event.code, event.reason);
          this.setConnectionState('disconnected');
          this.stopHeartbeat();
          
          if (event.code !== 1000 && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          this.setConnectionState('error');
          reject(error);
        };

      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        this.setConnectionState('error');
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.clearReconnectTimer();
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
      this.ws = null;
    }
    
    this.setConnectionState('disconnected');
  }

  send(message: Omit<WebSocketMessage, 'timestamp' | 'id'>): void {
    const fullMessage: WebSocketMessage = {
      ...message,
      timestamp: Date.now(),
      id: this.generateMessageId(),
    };

    if (this.connectionState === 'connected' && this.ws) {
      try {
        this.ws.send(JSON.stringify(fullMessage));
      } catch (error) {
        console.error('❌ Failed to send WebSocket message:', error);
        this.queueMessage(fullMessage);
      }
    } else {
      this.queueMessage(fullMessage);
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    
    // Limit queue size
    if (this.messageQueue.length > 100) {
      this.messageQueue.shift();
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.connectionState === 'connected') {
      const message = this.messageQueue.shift();
      if (message && this.ws) {
        try {
          this.ws.send(JSON.stringify(message));
        } catch (error) {
          console.error('❌ Failed to send queued message:', error);
          break;
        }
      }
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message.payload);
        } catch (error) {
          console.error(`❌ Error in ${message.type} handler:`, error);
        }
      });
    }

    // Emit to general handlers
    const generalHandlers = this.eventHandlers.get('*');
    if (generalHandlers) {
      generalHandlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('❌ Error in general handler:', error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;

    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.config.maxReconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(error => {
        console.error('❌ Reconnection failed:', error);
      });
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.connectionState === 'connected') {
        this.send({
          type: 'ping',
          payload: { timestamp: Date.now() },
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private setConnectionState(state: ConnectionState): void {
    this.connectionState = state;
    this.emit('connection:state', { state });
  }

  private generateMessageId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Event handler management
  on(event: string, handler: EventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    
    this.eventHandlers.get(event)!.add(handler);
    
    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`❌ Error in ${event} handler:`, error);
        }
      });
    }
  }

  // Subscription helpers for common patterns
  subscribeToClub(clubId: string): () => void {
    this.send({
      type: 'subscribe',
      payload: { channel: `club:${clubId}` },
    });

    return () => {
      this.send({
        type: 'unsubscribe',
        payload: { channel: `club:${clubId}` },
      });
    };
  }

  subscribeToEvent(eventId: string): () => void {
    this.send({
      type: 'subscribe',
      payload: { channel: `event:${eventId}` },
    });

    return () => {
      this.send({
        type: 'unsubscribe',
        payload: { channel: `event:${eventId}` },
      });
    };
  }

  subscribeToTournament(tournamentId: string): () => void {
    this.send({
      type: 'subscribe',
      payload: { channel: `tournament:${tournamentId}` },
    });

    return () => {
      this.send({
        type: 'unsubscribe',
        payload: { channel: `tournament:${tournamentId}` },
      });
    };
  }

  subscribeToMatch(matchId: string): () => void {
    this.send({
      type: 'subscribe',
      payload: { channel: `match:${matchId}` },
    });

    return () => {
      this.send({
        type: 'unsubscribe',
        payload: { channel: `match:${matchId}` },
      });
    };
  }

  // Live match updates
  sendLiveScore(matchId: string, score: any): void {
    this.send({
      type: 'match:live:score',
      payload: { matchId, score },
    });
  }

  startLiveMatch(matchId: string): void {
    this.send({
      type: 'match:live:start',
      payload: { matchId },
    });
  }

  endLiveMatch(matchId: string, result: any): void {
    this.send({
      type: 'match:live:end',
      payload: { matchId, result },
    });
  }

  // Status getters
  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  getQueueSize(): number {
    return this.messageQueue.length;
  }

  // Platform-specific optimizations
  handleAppStateChange(state: 'active' | 'background' | 'inactive'): void {
    if (Platform.OS !== 'web') {
      switch (state) {
        case 'active':
          if (this.connectionState === 'disconnected') {
            const token = useAuthStore.getState().token;
            if (token) {
              this.connect(token).catch(console.error);
            }
          }
          break;
        case 'background':
          // Keep connection alive but reduce heartbeat frequency
          if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = setInterval(() => {
              if (this.connectionState === 'connected') {
                this.send({
                  type: 'ping',
                  payload: { timestamp: Date.now() },
                });
              }
            }, 60000); // 1 minute in background
          }
          break;
        case 'inactive':
          // Don't disconnect, just pause heartbeat
          this.stopHeartbeat();
          break;
      }
    }
  }
}

// Export singleton instance
export const realtimeSync = new RealtimeSync();
export default realtimeSync;