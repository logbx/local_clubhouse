// Chat message model for mobile app
export interface ChatMessage {
  _id: string;
  id: string;
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderFullName: string;
  senderProfilePicture?: string;
  content: string;
  type: MessageType;
  timestamp: Date;
  editedAt?: Date;
  isEdited: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
  reactions: MessageReaction[];
  attachments: MessageAttachment[];
  mentions: MessageMention[];
  replyTo?: string; // ID of message being replied to
  isSystemMessage: boolean;
  metadata?: Record<string, any>;
}

export type MessageType = 
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'file'
  | 'location'
  | 'event'
  | 'tournament'
  | 'announcement'
  | 'system';

export interface MessageReaction {
  id: string;
  emoji: string;
  userId: string;
  username: string;
  timestamp: Date;
}

export interface MessageAttachment {
  id: string;
  type: 'image' | 'video' | 'audio' | 'file';
  url: string;
  thumbnailUrl?: string;
  filename: string;
  size: number;
  mimeType: string;
  dimensions?: {
    width: number;
    height: number;
  };
  duration?: number; // for video/audio in seconds
}

export interface MessageMention {
  id: string;
  userId: string;
  username: string;
  fullName: string;
  startIndex: number;
  endIndex: number;
}

export interface Conversation {
  _id: string;
  id: string;
  type: 'direct' | 'group' | 'club' | 'event';
  name?: string;
  description?: string;
  avatar?: string;
  participants: ConversationParticipant[];
  lastMessage?: ChatMessage;
  lastActivity: Date;
  isActive: boolean;
  settings: ConversationSettings;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationParticipant {
  userId: string;
  username: string;
  fullName: string;
  profilePicture?: string;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  joinedAt: Date;
  lastRead?: Date;
  lastSeen?: Date;
  isActive: boolean;
  isMuted: boolean;
  mutedUntil?: Date;
  permissions: ConversationPermission[];
}

export type ConversationPermission = 
  | 'send_messages'
  | 'send_media'
  | 'mention_all'
  | 'pin_messages'
  | 'delete_messages'
  | 'manage_participants'
  | 'change_settings';

export interface ConversationSettings {
  allowMedia: boolean;
  allowMentions: boolean;
  allowReactions: boolean;
  messageRetention: number; // days, 0 = forever
  requireApproval: boolean;
  onlyAdminsCanPost: boolean;
  maxMessageLength: number;
  allowedFileTypes: string[];
  maxFileSize: number; // bytes
}

export interface TypingIndicator {
  userId: string;
  username: string;
  conversationId: string;
  timestamp: Date;
  isTyping: boolean;
}

export interface MessageDeliveryStatus {
  messageId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'read';
  timestamp: Date;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  type?: MessageType;
  attachments?: {
    type: 'image' | 'video' | 'audio' | 'file';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  }[];
  mentions?: {
    userId: string;
    startIndex: number;
    endIndex: number;
  }[];
  replyTo?: string;
  metadata?: Record<string, any>;
}

export interface EditMessageRequest {
  messageId: string;
  content: string;
  mentions?: {
    userId: string;
    startIndex: number;
    endIndex: number;
  }[];
}

export interface DeleteMessageRequest {
  messageId: string;
  deleteForEveryone?: boolean;
}

export interface AddReactionRequest {
  messageId: string;
  emoji: string;
}

export interface RemoveReactionRequest {
  messageId: string;
  emoji: string;
}

export interface CreateConversationRequest {
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar?: string;
  participants: string[]; // user IDs
  settings?: Partial<ConversationSettings>;
}

export interface UpdateConversationRequest {
  conversationId: string;
  name?: string;
  description?: string;
  avatar?: string;
  settings?: Partial<ConversationSettings>;
}

export interface AddParticipantsRequest {
  conversationId: string;
  participants: string[]; // user IDs
}

export interface RemoveParticipantRequest {
  conversationId: string;
  userId: string;
}

export interface UpdateParticipantRequest {
  conversationId: string;
  userId: string;
  role?: 'admin' | 'moderator' | 'member';
  permissions?: ConversationPermission[];
}

export interface MuteConversationRequest {
  conversationId: string;
  duration: number; // in minutes, 0 = unmute
}

export interface PinMessageRequest {
  messageId: string;
  pin: boolean;
}

export interface MessageSearchRequest {
  conversationId?: string;
  query: string;
  type?: MessageType;
  senderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface MessageSearchResult {
  message: ChatMessage;
  conversation: {
    id: string;
    name: string;
    type: string;
  };
  highlights: {
    content: string;
    startIndex: number;
    endIndex: number;
  }[];
}

// Default values
export const createEmptyMessage = (): Partial<ChatMessage> => ({
  content: '',
  type: 'text',
  isEdited: false,
  isDeleted: false,
  reactions: [],
  attachments: [],
  mentions: [],
  isSystemMessage: false,
});

export const createEmptyConversation = (): Partial<Conversation> => ({
  type: 'direct',
  name: '',
  description: '',
  participants: [],
  isActive: true,
  settings: {
    allowMedia: true,
    allowMentions: true,
    allowReactions: true,
    messageRetention: 0,
    requireApproval: false,
    onlyAdminsCanPost: false,
    maxMessageLength: 4000,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg'],
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
});

// Type guards
export const isChatMessage = (obj: any): obj is ChatMessage => {
  return obj && typeof obj._id === 'string' && typeof obj.content === 'string';
};

export const isConversation = (obj: any): obj is Conversation => {
  return obj && typeof obj._id === 'string' && Array.isArray(obj.participants);
};

export const isSystemMessage = (message: ChatMessage): boolean => {
  return message.isSystemMessage || message.type === 'system';
};

export const isMediaMessage = (message: ChatMessage): boolean => {
  return ['image', 'video', 'audio', 'file'].includes(message.type);
};

export const canDeleteMessage = (message: ChatMessage, userId: string, userRole: string): boolean => {
  return message.senderId === userId || ['owner', 'admin', 'moderator'].includes(userRole);
};

export const canEditMessage = (message: ChatMessage, userId: string): boolean => {
  return message.senderId === userId && !message.isDeleted && message.type === 'text';
};

export const canReactToMessage = (message: ChatMessage): boolean => {
  return !message.isDeleted && !message.isSystemMessage;
};

// Utility functions
export const formatMessageTime = (timestamp: Date): string => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  
  if (diff < 60000) { // less than 1 minute
    return 'just now';
  } else if (diff < 3600000) { // less than 1 hour
    return `${Math.floor(diff / 60000)}m ago`;
  } else if (diff < 86400000) { // less than 1 day
    return `${Math.floor(diff / 3600000)}h ago`;
  } else if (diff < 604800000) { // less than 1 week
    return `${Math.floor(diff / 86400000)}d ago`;
  } else {
    return timestamp.toLocaleDateString();
  }
};

export const getMessagePreview = (message: ChatMessage, maxLength: number = 100): string => {
  if (message.isDeleted) return 'Message deleted';
  if (message.isSystemMessage) return message.content;
  
  switch (message.type) {
    case 'text':
      return message.content.length > maxLength 
        ? `${message.content.substring(0, maxLength)}...`
        : message.content;
    case 'image':
      return '📷 Image';
    case 'video':
      return '🎥 Video';
    case 'audio':
      return '🎵 Audio';
    case 'file':
      return '📎 File';
    case 'location':
      return '📍 Location';
    case 'event':
      return '📅 Event';
    case 'tournament':
      return '🏆 Tournament';
    default:
      return message.content;
  }
};