export interface PublicUserProfile {
  id: string;
  fullName: string;
  email: string;
  avatar?: string;
  bio?: string;
  interests?: string[];
}

export interface PublicEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  image?: string;
  tags: string[];
  organizer: {
    id: string;
    fullName: string;
    avatar?: string;
  };
} 