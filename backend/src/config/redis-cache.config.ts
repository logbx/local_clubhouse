// Cache-manager module is not installed, disabling cache configuration
// TODO: Install @nestjs/cache-manager and cache-manager-redis-yet if caching is needed

// import { CacheModule } from '@nestjs/cache-manager';
// import { redisStore } from 'cache-manager-redis-yet';

// export const redisCacheConfig = CacheModule.registerAsync({
//   useFactory: async () => ({
//     store: redisStore,
//     host: process.env.REDIS_HOST || 'localhost',
//     port: parseInt(process.env.REDIS_PORT || '6379'),
//     ttl: 300, // 5 minutes default
//   }),
// });

// Add caching decorators - temporarily disabled until cache-manager is properly configured
// export const CacheTournamentStandings = () => 
//   CacheKey('tournament-standings') && CacheTTL(60); // 1 minute

// export const CacheUserProfile = () => 
//   CacheKey('user-profile') && CacheTTL(300); // 5 minutes