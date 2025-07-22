export type EventStatus = 'LIVE' | 'PAST' | 'DRAFT';

export interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  startDate: string;
  endDate: string;
  location: string;
  status: EventStatus;
  tags: string[];
  features?: string[];
  imageUrl?: string;
  cost?: number;
  isFree: boolean;
  rsvps: Array<{ id: string; username: string }>;
  creator: {
    id: string;
    username: string;
  };
  clubName?: string;
  clubUsername?: string;
  clubLogoUrl?: string;
  creatorId: string;
  visibility: string;
  capacity?: number;
  attendeeCounts?: {
    going: number;
    interested: number;
    waitlist: number;
    total: number;
  };
}

export interface EventCardData {
  event: Event;
  statusStyle: {
    backgroundColor: string;
    color: string;
  };
  hasTournament: boolean;
  formattedDate: string;
  formattedTime: string;
  canEdit: boolean;
  isRSVPed: boolean;
  showActions: boolean;
}

export interface EventCardProps {
  event: Event;
  onPress: () => void;
  onRSVP?: () => void;
  onTournamentPress?: () => void;
  isRSVPed?: boolean;
  canEdit?: boolean;
  user?: any;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
  className?: string;
  style?: any;
  renderCustomActions?: (data: EventCardData) => React.ReactNode;
}

export interface EventListProps {
  events: Event[];
  onEventPress: (event: Event) => void;
  onEventRSVP?: (eventId: string) => void;
  onTournamentPress?: (eventId: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  user?: any;
  variant?: 'default' | 'compact' | 'detailed';
}