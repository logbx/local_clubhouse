import { storage } from '../storage';
import { logger } from '../monitoring/logger';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  expiresAt: number;
  key: string;
  tags?: string[];
  metadata?: any;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  tags?: string[];
  metadata?: any;
  serializer?: {
    serialize: (data: any) => string;
    deserialize: (data: string) => any;
  };
}

class ApiCache {
  private memoryCache: Map<string, CacheEntry> = new Map();
  private readonly MAX_MEMORY_ENTRIES = 1000;
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly STORAGE_PREFIX = 'api_cache_';
  private readonly METADATA_KEY = 'cache_metadata';

  constructor() {
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      // Load cache metadata
      const metadata = await storage.get(this.METADATA_KEY);
      if (metadata) {
        logger.debug('Cache metadata loaded', metadata);
      }

      // Clean expired entries on startup
      await this.cleanExpiredEntries();
    } catch (error) {
      logger.error('Failed to initialize cache', error);
    }
  }

  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const {
      ttl = this.DEFAULT_TTL,
      tags = [],
      metadata,
      serializer,
    } = options;

    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + ttl,
      key,
      tags,
      metadata,
    };

    try {
      // Store in memory cache
      this.memoryCache.set(key, entry);

      // Limit memory cache size
      if (this.memoryCache.size > this.MAX_MEMORY_ENTRIES) {
        this.evictOldestEntry();
      }

      // Store in persistent storage
      const storageKey = this.STORAGE_PREFIX + key;
      const serializedData = serializer ? 
        serializer.serialize(entry) : 
        JSON.stringify(entry);

      await storage.set(storageKey, serializedData);

      logger.debug(`Cache entry set: ${key}`, {
        ttl,
        expiresAt: entry.expiresAt,
        tags,
      });
    } catch (error) {
      logger.error(`Failed to set cache entry: ${key}`, error);
    }
  }

  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const { serializer } = options;

    try {
      // Check memory cache first
      let entry = this.memoryCache.get(key);

      // If not in memory, check persistent storage
      if (!entry) {
        const storageKey = this.STORAGE_PREFIX + key;
        const serializedData = await storage.get(storageKey);
        
        if (serializedData) {
          entry = serializer ? 
            serializer.deserialize(serializedData as string) : 
            JSON.parse(serializedData as string);
          
          // Add back to memory cache if not expired
          if (entry && entry.expiresAt > Date.now()) {
            this.memoryCache.set(key, entry);
          }
        }
      }

      if (!entry) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      // Check if expired
      if (entry.expiresAt <= Date.now()) {
        logger.debug(`Cache entry expired: ${key}`);
        await this.delete(key);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return entry.data;
    } catch (error) {
      logger.error(`Failed to get cache entry: ${key}`, error);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      // Remove from memory cache
      this.memoryCache.delete(key);

      // Remove from persistent storage
      const storageKey = this.STORAGE_PREFIX + key;
      await storage.remove(storageKey);

      logger.debug(`Cache entry deleted: ${key}`);
    } catch (error) {
      logger.error(`Failed to delete cache entry: ${key}`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear persistent storage (this is a simplified approach)
      // In a production app, you might want to track all cache keys
      const metadata = await storage.get(this.METADATA_KEY) || {};
      const keys = Object.keys(metadata);
      
      for (const key of keys) {
        await storage.remove(this.STORAGE_PREFIX + key);
      }

      await storage.remove(this.METADATA_KEY);

      logger.info('Cache cleared');
    } catch (error) {
      logger.error('Failed to clear cache', error);
    }
  }

  async invalidateByTag(tag: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Check memory cache
      for (const [key, entry] of this.memoryCache) {
        if (entry.tags && entry.tags.includes(tag)) {
          keysToDelete.push(key);
        }
      }

      // Delete found entries
      for (const key of keysToDelete) {
        await this.delete(key);
      }

      logger.info(`Invalidated ${keysToDelete.length} cache entries with tag: ${tag}`);
    } catch (error) {
      logger.error(`Failed to invalidate cache by tag: ${tag}`, error);
    }
  }

  async getStats(): Promise<{
    memoryEntries: number;
    totalSize: number;
    oldestEntry?: number;
    newestEntry?: number;
  }> {
    const entries = Array.from(this.memoryCache.values());
    
    return {
      memoryEntries: entries.length,
      totalSize: this.estimateSize(entries),
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : undefined,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : undefined,
    };
  }

  private estimateSize(entries: CacheEntry[]): number {
    // Rough estimation of memory usage
    return entries.reduce((total, entry) => {
      const entrySize = JSON.stringify(entry).length * 2; // Rough UTF-16 size
      return total + entrySize;
    }, 0);
  }

  private evictOldestEntry(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.memoryCache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      logger.debug(`Evicted oldest cache entry: ${oldestKey}`);
    }
  }

  private async cleanExpiredEntries(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // Clean memory cache
    for (const [key, entry] of this.memoryCache) {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    // Remove expired entries
    for (const key of expiredKeys) {
      await this.delete(key);
    }

    if (expiredKeys.length > 0) {
      logger.info(`Cleaned ${expiredKeys.length} expired cache entries`);
    }
  }

  // Utility methods for API caching
  generateCacheKey(endpoint: string, params?: any): string {
    const baseKey = endpoint.replace(/[^a-zA-Z0-9]/g, '_');
    
    if (params) {
      const paramString = JSON.stringify(params);
      const paramHash = this.simpleHash(paramString);
      return `${baseKey}_${paramHash}`;
    }
    
    return baseKey;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  async cacheResponse<T>(
    cacheKey: string, 
    fetchFn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    // Try to get from cache first
    const cached = await this.get<T>(cacheKey, options);
    if (cached !== null) {
      return cached;
    }

    // Fetch and cache the result
    try {
      const result = await fetchFn();
      await this.set(cacheKey, result, options);
      return result;
    } catch (error) {
      logger.error(`Failed to fetch and cache: ${cacheKey}`, error);
      throw error;
    }
  }
}

export const apiCache = new ApiCache();