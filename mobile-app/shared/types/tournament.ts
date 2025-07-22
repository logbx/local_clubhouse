export enum TournamentType {
  SINGLE_ELIMINATION = 'single_elimination',
  SWISS = 'swiss'
}

export enum TournamentStatus {
  REGISTRATION_OPEN = 'registration_open',
  REGISTRATION_CLOSED = 'registration_closed', 
  ACTIVE = 'active',
  COMPLETED = 'completed'
}

export enum MatchStatus {
  PENDING = 'pending',
  SUBMITTED = 'submitted', 
  CONFIRMED = 'confirmed',
  DISPUTED = 'disputed',
  COMPLETED = 'completed',
  FORFEIT = 'forfeit'
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
  // Swiss tournament specific
  points?: number;
  wins?: number;
  buchholzScore?: number;
  pastOpponents?: string[];
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
  status: MatchStatus;
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
  numRounds?: number;
  currentRound?: number;
  byePlayers?: TournamentPlayer[];
  standings?: TournamentPlayer[];
  status?: TournamentStatus;
}

export interface TournamentRound {
  roundNumber: number;
  roundName: string;
  matches: TournamentMatch[];
  byePlayers?: TournamentPlayer[];
  isComplete: boolean;
  startedAt?: string;
  completedAt?: string;
}

// API Response types
export interface CreateTournamentRequest {
  eventId: string;
  name: string;
  maxPlayers: number;
  type: TournamentType;
  numRounds?: number;
}

export interface TournamentResponse {
  data: Tournament;
  message?: string;
}

export interface TournamentListResponse {
  data: Tournament[];
  total: number;
  page: number;
  limit: number;
}