// Re-export all shared types
export type { Event as SharedEvent, EventStatus, EventCardProps, EventCardData, EventListProps } from '../components/EventCard/types';

export interface User {
  id: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  bio?: string;
  role?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Club {
  id: string;
  name: string;
  username: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  memberCount: number;
  isPrivate: boolean;
  owner: User;
  createdAt: string;
  updatedAt: string;
}

export interface ClubMember {
  id: string;
  user: User;
  club: Club;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  image?: string;
  club: Club;
  maxAttendees?: number;
  attendeeCount: number;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export interface EventRSVP {
  id: string;
  user: User;
  event: Event;
  status: 'going' | 'maybe' | 'not_going';
  createdAt: string;
  updatedAt: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  type: 'single_elimination' | 'swiss';
  status: 'upcoming' | 'in_progress' | 'completed';
  startDate: string;
  endDate?: string;
  maxParticipants: number;
  participantCount: number;
  club: Club;
  createdBy: User;
  settings: TournamentSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentSettings {
  bestOf?: number;
  swissRounds?: number;
  timeControl?: string;
  tiebreakers?: string[];
}

export interface TournamentParticipant {
  id: string;
  user: User;
  tournament: Tournament;
  seed?: number;
  status: 'active' | 'eliminated' | 'withdrawn';
  score: number;
  wins: number;
  losses: number;
  draws: number;
}

export interface Match {
  id: string;
  tournament: Tournament;
  round: number;
  matchNumber: number;
  player1?: TournamentParticipant;
  player2?: TournamentParticipant;
  winner?: TournamentParticipant;
  score1?: number;
  score2?: number;
  status: 'pending' | 'in_progress' | 'completed';
  scheduledAt?: string;
  completedAt?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  user: User;
  club: Club;
  replyTo?: ChatMessage;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: 'event_reminder' | 'tournament_start' | 'match_ready' | 'club_invite' | 'message';
  title: string;
  body: string;
  data?: any;
  read: boolean;
  user: User;
  createdAt: string;
}