export interface PublicUserProfile {
  id: string;
  username: string;
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
    username: string;
    avatar?: string;
  };
}

// Message-related interfaces
export interface Message {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
  read?: boolean;
}

export interface MessageSender {
  _id: string;
  username: string;
  profileImage?: string;
}

export interface GroupMessage {
  _id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
}

export interface EventMessage {
  _id: string;
  sender: MessageSender;
  content: string;
  timestamp: string;
}

export interface Conversation {
  userId: string;
  username: string;
  profileImage?: string;
  lastMessage?: Message;
} 