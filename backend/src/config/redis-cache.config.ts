import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';

export const redisCacheConfig = CacheModule.registerAsync({
  useFactory: async () => ({
    store: redisStore,
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    ttl: 300, // 5 minutes default
  }),
});

// Add caching decorators
export const CacheTournamentStandings = () => 
  CacheKey('tournament-standings') && CacheTTL(60); // 1 minute

export const CacheUserProfile = () => 
  CacheKey('user-profile') && CacheTTL(300); // 5 minutes