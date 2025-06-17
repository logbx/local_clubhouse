# Tournament Feature Implementation

This document describes the complete single elimination tournament feature implementation for the event management system.

## Overview

The tournament feature allows event organizers to create single elimination tournaments within their events, supporting both authenticated users and guest players with real-time updates via WebSocket.

## Architecture

### Backend Components

#### 1. Tournament Model (`src/models/tournament.model.ts`)
- **Tournament**: Main tournament entity with event association
- **TournamentPlayer**: Player representation (user or guest)
- **TournamentMatch**: Individual match with result tracking
- **TournamentRound**: Collection of matches for each round

#### 2. Tournament Service (`src/tournaments/tournaments.service.ts`)
Key methods:
- `createTournament()`: Create new tournament for an event
- `registerPlayer()`: Register authenticated user
- `addGuestPlayer()`: Add guest player (organizer only)
- `startTournament()`: Generate first round bracket
- `reportResult()`: Report match results
- `confirmResult()`: Confirm reported results
- `overrideResult()`: Organizer override (organizer only)

#### 3. Tournament Controller (`src/tournaments/tournaments.controller.ts`)
API endpoints following REST conventions:
```
POST   /api/tournaments/create
GET    /api/tournaments/:id
GET    /api/tournaments/event/:eventId
POST   /api/tournaments/:id/register
POST   /api/tournaments/add-guest
DELETE /api/tournaments/remove-player
POST   /api/tournaments/:id/start
POST   /api/tournaments/report-result
POST   /api/tournaments/confirm-result
POST   /api/tournaments/override-result
```

#### 4. WebSocket Integration (`src/websocket/websocket.gateway.ts`)
Real-time events:
- `tournament-created`: New tournament announcement
- `player-registered`: Player joins tournament
- `tournament-started`: Tournament begins with brackets
- `match-result-reported`: Match result submitted
- `new-round-generated`: Next round created
- `tournament-finished`: Tournament completed

### Frontend Components

#### 1. Tournament Service (`src/services/tournament.service.ts`)
Client-side API wrapper with TypeScript interfaces for all tournament operations.

#### 2. WebSocket Service Extensions (`src/services/websocket.service.ts`)
Tournament-specific WebSocket methods:
- `joinTournament()`: Join tournament room for updates
- `onTournamentUpdate()`: Listen for tournament events
- `onMatchUpdate()`: Listen for match events

#### 3. UI Components (Example implementations)
- **TournamentSetup**: Player registration and tournament management
- **TournamentBracket**: Visual bracket display with match cards

## User Flow

### 1. Tournament Creation
1. Event organizer creates tournament with name and max players
2. Tournament broadcast to all event participants
3. Registration opens automatically

### 2. Player Registration
1. **Authenticated Users**: One-click registration
2. **Guest Players**: Organizer manually adds by name
3. Real-time player count updates
4. Organizer can remove players before start

### 3. Tournament Start
1. Organizer starts tournament (minimum 2 players)
2. System generates random bracket pairs
3. Odd players receive automatic bye to next round
4. First round matches broadcast to all participants

### 4. Match Results
1. **Reporting**: Either player or organizer can report
2. **Confirmation**: Opposing player or organizer confirms
3. **Auto-confirmation**: Both players report same result
4. **Override**: Organizer can override any result

### 5. Tournament Progression
1. Completed matches trigger next round generation
2. Winners advance automatically
3. Real-time bracket updates
4. Tournament ends when one player remains

## Permissions & Roles

| Action | Authenticated User | Guest Player | Organizer |
|--------|-------------------|--------------|-----------|
| Register | ✅ | ❌ | ✅ |
| Report Results | ✅ (if in match) | ❌ | ✅ |
| Confirm Results | ✅ (if in match) | ❌ | ✅ |
| Override Results | ❌ | ❌ | ✅ |
| Add/Remove Players | ❌ | ❌ | ✅ |
| Start Tournament | ❌ | ❌ | ✅ |

## Database Schema

### Tournament Collection
```javascript
{
  _id: ObjectId,
  name: String,
  eventId: ObjectId, // Reference to Event
  organizerId: ObjectId, // Reference to User
  maxPlayers: Number,
  players: [TournamentPlayer],
  rounds: [TournamentRound],
  isStarted: Boolean,
  isFinished: Boolean,
  winnerId: String,
  createdAt: Date,
  updatedAt: Date
}
```

### TournamentPlayer Schema
```javascript
{
  id: String, // userId or UUID for guests
  name: String,
  userId: ObjectId, // null for guests
  isGuest: Boolean,
  hasConfirmedWin: Boolean,
  hasReported: Boolean
}
```

### TournamentMatch Schema
```javascript
{
  matchId: String,
  player1: TournamentPlayer,
  player2: TournamentPlayer,
  winnerId: String,
  loserId: String,
  status: 'pending' | 'completed' | 'forfeit',
  resultReportedBy: [String],
  confirmedBy: String
}
```

## Real-Time Features

### WebSocket Rooms
- `event:{eventId}`: All event participants receive tournament updates
- `tournament:{tournamentId}`: Tournament-specific updates for participants

### Event Types
- **tournament-created**: New tournament announcement
- **player-registered**: Player count updates
- **tournament-started**: Bracket generation complete
- **match-result-reported**: Result submitted for confirmation
- **new-round-generated**: Next round created
- **tournament-finished**: Winner announcement

## Installation & Setup

### Backend Setup
1. Install dependencies: `npm install uuid @types/uuid`
2. Add `TournamentsModule` to `app.module.ts`
3. Ensure WebSocket and MongoDB connections are configured

### Frontend Setup
1. Import tournament service and components
2. Add tournament routes to application routing
3. Integrate with existing authentication system

## API Usage Examples

### Create Tournament
```javascript
POST /api/tournaments/create
{
  "name": "Friday Night Tournament",
  "eventId": "60a8f2b8c8f3e2001f5b9c7d",
  "maxPlayers": 16
}
```

### Register Player
```javascript
POST /api/tournaments/:tournamentId/register
// JWT token required in Authorization header
```

### Report Match Result
```javascript
POST /api/tournaments/report-result
{
  "tournamentId": "60a8f2b8c8f3e2001f5b9c7e",
  "matchId": "match-uuid-123",
  "winnerId": "player-id-1",
  "loserId": "player-id-2"
}
```

## Error Handling

The system includes comprehensive error handling for:
- Invalid permissions
- Tournament state conflicts
- Player registration limits
- Match result validation
- Network connectivity issues

## Future Enhancements

Potential additions to consider:
- **Loser Brackets**: Double elimination support
- **Tournament Templates**: Predefined tournament formats
- **Statistics**: Player performance tracking
- **Scheduling**: Time-based match scheduling
- **Notifications**: Email/push notifications for matches
- **Spectator Mode**: Read-only tournament viewing
- **Custom Rules**: Configurable tournament formats

## Security Considerations

- All tournament operations require authentication
- Event creators have full tournament control
- Player permissions are strictly enforced
- WebSocket rooms are secured by authentication
- Input validation on all user data
- Rate limiting on API endpoints

## Testing

Recommended test scenarios:
- Tournament creation with various player counts
- Player registration and removal
- Match result reporting edge cases
- WebSocket connectivity and updates
- Permission boundary testing
- Tournament progression with byes
- Concurrent match reporting 