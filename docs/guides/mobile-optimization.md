# Backend Mobile Optimization Recommendations for Local Clubhouse

## Priority 1: API Endpoint Optimizations

### 1. Pagination Implementation
All list endpoints should support pagination with consistent parameters:

```typescript
// Add to all controllers
@Get()
async findAll(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
  @Query('search') search?: string,
  @Query('sortBy') sortBy: string = 'createdAt',
  @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'desc'
) {
  // Implementation with proper pagination
}
```

### 2. Mobile-Specific Endpoints

#### Minimal Data Endpoints
Create lightweight versions of existing endpoints:

```typescript
// clubs.controller.ts
@Get('minimal')
async getClubsMinimal(@Query() query: PaginationQuery) {
  // Return only: id, name, username, category, memberCount, location.city, profileImage
}

// events.controller.ts  
@Get('upcoming')
async getUpcomingEvents(@Query('limit') limit: number = 10) {
  // Return next 10 events with minimal data
}
```

#### Location-Based Endpoints
```typescript
// Add to clubs.controller.ts
@Get('nearby')
async getNearbyClubs(
  @Query('lat') latitude: number,
  @Query('lng') longitude: number,
  @Query('radius') radius: number = 25,
  @Query('limit') limit: number = 20
) {
  return this.clubsService.findNearby(latitude, longitude, radius, limit);
}

// Add to events.controller.ts
@Get('nearby')
async getNearbyEvents(
  @Query('lat') latitude: number,
  @Query('lng') longitude: number,
  @Query('radius') radius: number = 25,
  @Query('limit') limit: number = 20
) {
  return this.eventsService.findNearby(latitude, longitude, radius, limit);
}
```

### 3. Caching Headers
Add proper caching headers to reduce mobile data usage:

```typescript
// Add to all controllers
@Header('Cache-Control', 'public, max-age=300') // 5 minutes for dynamic content
@Header('Cache-Control', 'public, max-age=3600') // 1 hour for relatively static content
```

### 4. Response Compression
Ensure gzip compression is enabled in main.ts:

```typescript
import * as compression from 'compression';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(compression());
}
```

## Priority 2: Database Optimizations

### 1. Add Indexes for Mobile Queries
```javascript
// MongoDB indexes to add
db.clubs.createIndex({ "location.coordinates": "2dsphere" });
db.clubs.createIndex({ category: 1, memberCount: -1 });
db.clubs.createIndex({ tags: 1 });
db.clubs.createIndex({ "location.city": 1, "location.state": 1 });

db.events.createIndex({ "location.coordinates": "2dsphere" });
db.events.createIndex({ startDate: 1, status: 1 });
db.events.createIndex({ category: 1, startDate: 1 });
db.events.createIndex({ clubId: 1, startDate: 1 });

db.tournaments.createIndex({ status: 1, startDate: 1 });
db.tournaments.createIndex({ game: 1, format: 1 });
```

### 2. Aggregation Pipelines for Complex Queries
```typescript
// clubs.service.ts - Add method for nearby clubs with enhanced data
async findNearbyWithStats(lat: number, lng: number, radius: number, limit: number) {
  return this.clubModel.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distance",
        maxDistance: radius * 1609.34, // Convert miles to meters
        spherical: true
      }
    },
    {
      $lookup: {
        from: "events",
        localField: "_id",
        foreignField: "clubId",
        pipeline: [
          { $match: { startDate: { $gte: new Date() } } },
          { $count: "upcomingEvents" }
        ],
        as: "eventStats"
      }
    },
    {
      $addFields: {
        upcomingEvents: { $arrayElemAt: ["$eventStats.upcomingEvents", 0] }
      }
    },
    {
      $project: {
        username: 1,
        name: 1,
        category: 1,
        memberCount: 1,
        profileImage: 1,
        location: { city: 1, state: 1 },
        distance: 1,
        upcomingEvents: { $ifNull: ["$upcomingEvents", 0] }
      }
    },
    { $limit: limit }
  ]);
}
```

## Priority 3: New Mobile-Optimized Endpoints

### 1. Dashboard Data Endpoint
Create a single endpoint that returns all dashboard data:

```typescript
// Add to app.controller.ts or create dashboard.controller.ts
@Get('mobile/dashboard')
@UseGuards(JwtAuthGuard)
async getMobileDashboard(@Request() req: any) {
  const userId = req.user.sub || req.user.id;
  
  const [userClubs, nearbyEvents, recommendations] = await Promise.all([
    this.clubsService.getUserClubs(userId, { limit: 5 }),
    this.eventsService.getUpcomingEvents({ limit: 10 }),
    this.recommendationService.getPersonalizedRecommendations(userId)
  ]);

  return {
    userClubs,
    nearbyEvents,
    recommendations: {
      clubs: recommendations.clubs.slice(0, 3),
      events: recommendations.events.slice(0, 5)
    },
    quickStats: {
      totalClubs: userClubs.length,
      upcomingEvents: nearbyEvents.length
    }
  };
}
```

### 2. Search Optimization
Enhance the search endpoint for mobile:

```typescript
// search.controller.ts
@Get()
async search(
  @Query('q') query: string,
  @Query('type') type?: 'clubs' | 'events' | 'tournaments',
  @Query('lat') lat?: number,
  @Query('lng') lng?: number,
  @Query('radius') radius: number = 25,
  @Query('limit') limit: number = 20
) {
  const searchParams = {
    query,
    type,
    location: lat && lng ? { lat, lng, radius } : undefined,
    limit
  };

  return this.searchService.searchOptimized(searchParams);
}
```

### 3. Bulk Data Sync Endpoint
For offline-first mobile app:

```typescript
@Get('mobile/sync')
@UseGuards(JwtAuthGuard)
async getMobileSyncData(
  @Query('since') since?: string,
  @Request() req: any
) {
  const userId = req.user.sub || req.user.id;
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [clubs, events, tournaments, messages] = await Promise.all([
    this.clubsService.getUpdatedClubs(userId, sinceDate),
    this.eventsService.getUpdatedEvents(userId, sinceDate),
    this.tournamentsService.getUpdatedTournaments(userId, sinceDate),
    this.chatService.getUpdatedMessages(userId, sinceDate)
  ]);

  return {
    timestamp: new Date().toISOString(),
    data: { clubs, events, tournaments, messages }
  };
}
```

## Priority 4: Real-time Optimizations

### 1. WebSocket Message Optimization
Minimize WebSocket message size:

```typescript
// Instead of sending full objects, send minimal updates
{
  type: 'club_member_joined',
  clubId: 'xxx',
  memberId: 'yyy',
  memberUsername: 'john_doe',
  memberCount: 145
}

// Instead of:
{
  type: 'club_updated',
  club: { /* full club object */ }
}
```

### 2. Selective Subscriptions
Allow mobile clients to subscribe only to relevant events:

```typescript
// websocket.gateway.ts
@SubscribeMessage('subscribe_to_club')
handleClubSubscription(client: Socket, clubId: string) {
  client.join(`club_${clubId}`);
}

@SubscribeMessage('subscribe_to_location')
handleLocationSubscription(client: Socket, { lat, lng, radius }: LocationData) {
  // Store location preference for this client
  client.data.location = { lat, lng, radius };
}
```

## Priority 5: Performance Monitoring

### 1. Add Response Time Middleware
```typescript
// performance.middleware.ts
export function performanceMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 1000) { // Log slow requests
      console.warn(`Slow request: ${req.method} ${req.path} - ${duration}ms`);
    }
  });
  
  next();
}
```

### 2. Database Query Monitoring
```typescript
// Add to services
private async executeQuery<T>(operation: () => Promise<T>, queryName: string): Promise<T> {
  const startTime = Date.now();
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    if (duration > 500) {
      console.warn(`Slow query: ${queryName} - ${duration}ms`);
    }
    
    return result;
  } catch (error) {
    console.error(`Query failed: ${queryName}`, error);
    throw error;
  }
}
```

## Implementation Priority Order

1. **Week 1**: Add pagination and caching headers to existing endpoints
2. **Week 2**: Create mobile dashboard and search optimization endpoints  
3. **Week 3**: Implement location-based queries and database indexes
4. **Week 4**: Add bulk sync endpoint and WebSocket optimizations
5. **Week 5**: Performance monitoring and mobile analytics

## Mobile-Specific Environment Variables

Add to backend .env:

```env
# Mobile optimizations
MOBILE_API_RATE_LIMIT=100
MOBILE_RESPONSE_CACHE_TTL=300
MOBILE_MAX_PAGE_SIZE=50
ENABLE_RESPONSE_COMPRESSION=true
WEBSOCKET_HEARTBEAT_INTERVAL=30000
```

## Testing Mobile Optimizations

1. **Response Size Testing**: Ensure API responses are under 10KB for list endpoints
2. **Latency Testing**: API responses should be under 500ms for simple queries
3. **Pagination Testing**: Verify all list endpoints support consistent pagination
4. **Location Testing**: Test nearby queries with various radius values
5. **Offline Testing**: Verify bulk sync endpoint returns appropriate data sizes

## Monitoring Metrics to Track

- Average response time by endpoint
- Response payload sizes  
- Database query execution times
- WebSocket connection counts and message frequencies
- Mobile app crash rates correlated with API calls
- Geographic distribution of API requests