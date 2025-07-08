import { createClient } from 'redis';

class RedisService {
  private client: any;
  private subscriber;
  private publisher;

  constructor() {
    this.client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    this.subscriber = this.client.duplicate();
    this.publisher = this.client.duplicate();

    // Connect to Redis
    this.client.connect().then(() => {
      console.log('Redis Client Connected');
    }).catch((err: any) => {
      console.error('Redis Connection Error:', err);
    });

    // Handle Redis errors
    this.client.on('error', (err: any) => {
      console.error('Redis Client Error:', err);
    });
  }

  async initialize() {
    try {
      await this.connect();
      console.log('Redis service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Redis service:', error);
      throw error;
    }
  }

  private async connect() {
    try {
      await this.client.connect();
      await this.subscriber.connect();
      await this.publisher.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  // Get Redis client for direct access
  getRedisClient() {
    return this.client;
  }

  // Refresh Token Methods
  async setRefreshToken(userId: string, token: string, expiry: string): Promise<void> {
    await this.client.set(`refresh_token:${userId}`, token, {
      EX: this.parseExpiry(expiry)
    });
  }

  async getRefreshToken(userId: string): Promise<string | null> {
    return await this.client.get(`refresh_token:${userId}`);
  }

  async deleteRefreshToken(userId: string): Promise<void> {
    await this.client.del(`refresh_token:${userId}`);
  }

  // User Session Cache Methods
  async setUserSession(userId: string, sessionData: any, expiry: number = 3600): Promise<void> {
    await this.client.set(`session:${userId}`, JSON.stringify(sessionData), {
      EX: expiry
    });
  }

  async getUserSession(userId: string): Promise<any | null> {
    const data = await this.client.get(`session:${userId}`);
    return data ? JSON.parse(data) : null;
  }

  async deleteUserSession(userId: string): Promise<void> {
    await this.client.del(`session:${userId}`);
  }

  // User Last Seen Methods
  async setUserLastSeen(userId: string, timestamp: string): Promise<void> {
    await this.client.set(`last_seen:${userId}`, timestamp);
  }

  async getUserLastSeen(userId: string): Promise<string | null> {
    return await this.client.get(`last_seen:${userId}`);
  }

  // Message Cache Methods
  async cacheMessage(channelId: string, message: any, expiry: number = 86400): Promise<void> {
    const key = `messages:${channelId}`;
    await this.client.lPush(key, JSON.stringify(message));
    await this.client.expire(key, expiry);
  }

  async getCachedMessages(channelId: string, limit: number = 50): Promise<any[]> {
    const messages = await this.client.lRange(`messages:${channelId}`, 0, limit - 1);
    return messages.map((msg: string) => JSON.parse(msg));
  }

  // WebSocket Pub/Sub Methods
  async publish(channel: string, message: any): Promise<void> {
    await this.publisher.publish(channel, JSON.stringify(message));
  }

  async subscribe(channel: string, callback: (message: any) => void): Promise<void> {
    await this.subscriber.subscribe(channel, (message: string) => {
      callback(JSON.parse(message));
    });
  }

  async unsubscribe(channel: string): Promise<void> {
    await this.subscriber.unsubscribe(channel);
  }

  // Rate Limiting Methods
  async incrementRateLimit(key: string, expiry: number = 60): Promise<number> {
    const count = await this.client.incr(`ratelimit:${key}`);
    if (count === 1) {
      await this.client.expire(`ratelimit:${key}`, expiry);
    }
    return count;
  }

  async getRateLimit(key: string): Promise<number> {
    const count = await this.client.get(`ratelimit:${key}`);
    return count ? parseInt(count) : 0;
  }

  private parseExpiry(expiry: string): number {
    const value = parseInt(expiry.slice(0, -1));
    const unit = expiry.slice(-1).toLowerCase();
    
    switch (unit) {
      case 's': return value;
      case 'm': return value * 60;
      case 'h': return value * 60 * 60;
      case 'd': return value * 24 * 60 * 60;
      default: return 60 * 60; // Default to 1 hour
    }
  }
}

export const redisService = new RedisService(); 