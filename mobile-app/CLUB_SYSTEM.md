# Universal Club System with Real-time Features

A comprehensive club management system built with Expo Router and real-time capabilities that works seamlessly across web, iOS, and Android platforms.

## 🏗️ Architecture Overview

### Backend (API Routes)
- **MongoDB Models**: Club, ClubMember, ChatMessage with full relationships
- **RESTful API**: Complete CRUD operations with role-based permissions
- **Real-time WebSocket**: Live chat, typing indicators, member updates
- **File Upload**: Image handling for logos, banners, and attachments
- **Rate Limiting**: Protection against spam and abuse

### Frontend (Universal Components)
- **Infinite Scroll**: Optimized performance with FlashList on mobile
- **Real-time Updates**: Live chat with offline message queuing
- **Platform-specific UI**: Tailored experiences for web and mobile
- **Search & Filters**: Debounced search with category filtering
- **Responsive Design**: Adapts to different screen sizes

## 📊 Database Schema

### Club Model
```typescript
interface IClub {
  name: string;
  username: string;         // Unique identifier
  description: string;
  category: 'gaming' | 'sports' | 'technology' | ...;
  logoUrl?: string;
  bannerUrl?: string;
  isPrivate: boolean;
  memberLimit?: number;
  tags: string[];
  location?: {
    city: string;
    country: string;
    coordinates?: [number, number];
  };
  socialLinks: {
    website?: string;
    twitter?: string;
    discord?: string;
    instagram?: string;
  };
  settings: {
    allowMemberInvites: boolean;
    requireApproval: boolean;
    allowChat: boolean;
    allowEvents: boolean;
  };
  stats: {
    memberCount: number;
    eventCount: number;
    messageCount: number;
    lastActivity: Date;
  };
  owner: ObjectId;
}
```

### Club Member Model
```typescript
interface IClubMember {
  club: ObjectId;
  user: ObjectId;
  role: 'owner' | 'admin' | 'moderator' | 'member';
  status: 'active' | 'pending' | 'banned';
  permissions: {
    canInvite: boolean;
    canManageEvents: boolean;
    canModerateChat: boolean;
    canManageMembers: boolean;
  };
  joinedAt: Date;
  notificationSettings: {
    newMessages: boolean;
    newEvents: boolean;
    newMembers: boolean;
    mentions: boolean;
  };
}
```

### Chat Message Model
```typescript
interface IChatMessage {
  club: ObjectId;
  sender: ObjectId;
  content: string;
  type: 'text' | 'image' | 'file' | 'system';
  replyTo?: ObjectId;
  mentions: ObjectId[];
  attachments: Array<{
    type: 'image' | 'file';
    url: string;
    name: string;
    size: number;
    mimeType: string;
  }>;
  reactions: Array<{
    emoji: string;
    users: ObjectId[];
    count: number;
  }>;
  readBy: Array<{
    user: ObjectId;
    readAt: Date;
  }>;
  edited: {
    at?: Date;
    by?: ObjectId;
    history: Array<{
      content: string;
      editedAt: Date;
    }>;
  };
  isDeleted: boolean;
}
```

## 🔗 API Endpoints

### Club Management
- `GET /api/clubs` - List clubs with pagination and filters
- `POST /api/clubs` - Create new club
- `GET /api/clubs/[username]` - Get club details
- `PUT /api/clubs/[username]` - Update club (admin only)
- `DELETE /api/clubs/[username]` - Delete club (owner only)

### Member Management
- `GET /api/clubs/[username]/members` - List members
- `POST /api/clubs/[username]/members` - Add member (admin only)
- `PUT /api/clubs/[username]/members` - Update member role
- `DELETE /api/clubs/[username]/members` - Remove member
- `POST /api/clubs/[username]/join` - Join/leave club toggle

### Chat System
- `GET /api/clubs/[username]/chat` - Get messages (paginated)
- `POST /api/clubs/[username]/chat` - Send message
- `PUT /api/clubs/[username]/chat` - Edit message
- `DELETE /api/clubs/[username]/chat` - Delete message

## 🔄 Real-time Features

### WebSocket Events
```typescript
// Incoming events
'new_message'           // New chat message
'message_edited'        // Message was edited
'message_deleted'       // Message was deleted
'user_typing'           // User typing indicator
'message_read'          // Read receipt
'member_joined'         // New member joined
'member_left'           // Member left club
'club_updated'          // Club info updated

// Outgoing events
'join_club'            // Join club room
'leave_club'           // Leave club room
'send_message'         // Send chat message
'typing'               // Send typing indicator
'mark_read'            // Mark message as read
```

### Offline Support
- **Message Queuing**: Messages are queued when offline
- **Automatic Retry**: Failed messages retry with exponential backoff
- **Local Storage**: Queue persisted across app restarts
- **Conflict Resolution**: Handles concurrent edits gracefully

## 📱 Frontend Components

### Club List Screen (`/clubs`)
```typescript
// Features:
- Infinite scroll with FlatList
- Debounced search (500ms delay)
- Category filtering with chips
- Sort options (newest, popular, active, name)
- Pull-to-refresh (mobile) / refresh button (web)
- FAB create button (mobile) / header button (web)
- Empty state with create prompt
- Error handling with retry

// Platform-specific optimizations:
- FlashList on mobile for performance
- Virtualized rendering for large lists
- Platform-aware navigation patterns
```

### Club Card Component
```typescript
// Features:
- Club logo with member indicator
- Category icons
- Member count formatting (1K, 1M)
- Tag display (max 3 + overflow)
- Owner information
- Private club indicators
- Responsive layout

// Visual design:
- NativeWind styling
- Dark mode support
- Consistent spacing
- Hover effects (web)
- Touch feedback (mobile)
```

### Club Details Screen (`/clubs/[username]`)
```typescript
// Tab Navigation:
- Overview: Description, stats, recent activity
- Members: Paginated member list with roles
- Events: Club events and activities
- Chat: Real-time messaging interface

// Platform-specific features:
- Parallax header (mobile)
- Sticky tabs (mobile)
- Side navigation (web)
- Native share API (mobile) / Web Share API (web)
- Context menus (mobile) / dropdown menus (web)
```

### Chat Interface
```typescript
// Real-time features:
- Live message updates via WebSocket
- Typing indicators with timeout
- Read receipts for messages
- Message reactions
- Reply to messages
- Mention other users
- File and image attachments

// Offline capabilities:
- Message queuing when offline
- Retry failed messages
- Show pending/failed states
- Sync when reconnected

// Message features:
- Edit messages (with history)
- Delete messages (soft delete)
- Search message history
- Message pagination
- Link previews
- Emoji reactions
```

## 🎨 Platform-Specific UI

### Mobile (iOS/Android)
```typescript
// Navigation:
- Tab bar navigation
- Stack navigation for details
- Modal presentations
- Swipe gestures

// UI Components:
- Pull-to-refresh
- Floating Action Button
- Native alerts and action sheets
- Haptic feedback
- Safe area handling

// Features:
- Camera integration for images
- Native sharing
- Push notifications
- Background app refresh
```

### Web
```typescript
// Navigation:
- Breadcrumb navigation
- Sidebar navigation (desktop)
- Responsive layouts
- Keyboard shortcuts

// UI Components:
- Hover states
- Tooltips
- Context menus
- Infinite scroll indicators

// Features:
- File drag & drop
- Clipboard integration
- Browser notifications
- URL deep linking
```

## 🔐 Security & Permissions

### Role-Based Access Control
```typescript
// Owner permissions:
- Full club management
- Delete club
- Manage all members
- Change settings

// Admin permissions:
- Manage members
- Moderate chat
- Manage events
- Edit club info

// Moderator permissions:
- Moderate chat
- Invite members
- Basic moderation

// Member permissions:
- Send messages
- View content
- Basic participation
```

### Rate Limiting
- **Club creation**: 3 per hour per user
- **Messages**: 30 per minute per user
- **API requests**: IP-based limiting
- **File uploads**: Size and type restrictions

## 📈 Performance Optimizations

### Database
- **Indexes**: Optimized queries for search and filtering
- **Aggregation**: Efficient member and message counting
- **Pagination**: Cursor-based pagination for large datasets
- **Caching**: Redis caching for frequent queries

### Frontend
- **Infinite scroll**: Load data as needed
- **Image optimization**: Lazy loading and caching
- **Bundle splitting**: Code splitting for better loading
- **Memoization**: Prevent unnecessary re-renders

### Real-time
- **Connection pooling**: Efficient WebSocket management
- **Message batching**: Reduce server load
- **Selective updates**: Only send relevant data
- **Compression**: WebSocket message compression

## 🧪 Testing Strategy

### API Testing
```bash
# Test club CRUD operations
POST /api/clubs
GET /api/clubs
PUT /api/clubs/testclub
DELETE /api/clubs/testclub

# Test member management
POST /api/clubs/testclub/join
GET /api/clubs/testclub/members
POST /api/clubs/testclub/members

# Test chat functionality
POST /api/clubs/testclub/chat
GET /api/clubs/testclub/chat
PUT /api/clubs/testclub/chat?messageId=...
```

### Component Testing
```typescript
// Club list functionality
- Search filtering
- Category filtering
- Infinite scroll
- Pull-to-refresh

// Club details
- Tab navigation
- Member actions
- Chat interface
- Real-time updates

// Platform-specific
- Mobile gestures
- Web keyboard shortcuts
- Responsive layouts
- Dark mode switching
```

### Real-time Testing
```typescript
// WebSocket functionality
- Connection establishment
- Message delivery
- Typing indicators
- Offline queuing
- Reconnection handling

// Multi-user scenarios
- Concurrent messaging
- Role changes
- Member joins/leaves
- Club updates
```

## 🚀 Deployment

### Environment Variables
```env
# Database
MONGODB_URI=mongodb://localhost:27017/clubs
REDIS_URL=redis://localhost:6379

# File uploads
AWS_S3_BUCKET=club-assets
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...

# WebSocket
WEBSOCKET_PORT=3001
WEBSOCKET_CORS_ORIGIN=http://localhost:8081

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Production Considerations
- **CDN**: Static asset delivery
- **Load balancing**: Multiple server instances
- **WebSocket scaling**: Redis adapter for Socket.io
- **Monitoring**: Error tracking and performance metrics
- **Backup**: Database backup strategy

This club system provides a solid foundation for community building with real-time features, comprehensive permission management, and platform-specific optimizations while maintaining a consistent user experience across all platforms.