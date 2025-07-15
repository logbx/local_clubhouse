import { storage } from '../storage';
import { logger } from '../monitoring/logger';
import NetInfo from '@react-native-community/netinfo';

export enum QueuePriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export interface QueuedRequest {
  id: string;
  endpoint: string;
  method: string;
  body?: any;
  headers: Record<string, string>;
  priority: QueuePriority;
  maxRetries: number;
  retryCount: number;
  createdAt: number;
  lastAttempt: number;
  expiresAt?: number;
  metadata?: any;
}

export interface QueueStats {
  total: number;
  pending: number;
  failed: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
}

export interface QueueOptions {
  maxRetries?: number;
  priority?: QueuePriority;
  expiresIn?: number; // milliseconds
  deduplicate?: boolean;
  metadata?: any;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private isOnline = true;
  private listeners: Array<(stats: QueueStats) => void> = [];
  private readonly STORAGE_KEY = 'offline_queue';
  private readonly MAX_QUEUE_SIZE = 1000;
  private readonly BATCH_SIZE = 5;

  constructor() {
    this.initializeQueue();
    this.setupNetworkListener();
  }

  private async initializeQueue() {
    try {
      const storedQueue = await storage.get<QueuedRequest[]>(this.STORAGE_KEY);
      if (storedQueue) {
        // Remove expired requests
        const now = Date.now();
        this.queue = storedQueue.filter(req => !req.expiresAt || req.expiresAt > now);
        await this.persistQueue();
        
        logger.info(`Loaded ${this.queue.length} requests from offline queue`);
      }
    } catch (error) {
      logger.error('Failed to load offline queue', error);
    }
  }

  private async persistQueue() {
    try {
      await storage.set(this.STORAGE_KEY, this.queue);
    } catch (error) {
      logger.error('Failed to persist offline queue', error);
    }
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      if (wasOffline && this.isOnline) {
        logger.info('Network reconnected, processing offline queue');
        this.processQueue();
      }
    });
  }

  async enqueue(
    endpoint: string,
    method: string,
    body?: any,
    headers: Record<string, string> = {},
    options: QueueOptions = {}
  ): Promise<string> {
    const requestId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const queuedRequest: QueuedRequest = {
      id: requestId,
      endpoint,
      method: method.toUpperCase(),
      body,
      headers,
      priority: options.priority || QueuePriority.MEDIUM,
      maxRetries: options.maxRetries || 3,
      retryCount: 0,
      createdAt: Date.now(),
      lastAttempt: 0,
      expiresAt: options.expiresIn ? Date.now() + options.expiresIn : undefined,
      metadata: options.metadata,
    };

    // Check for duplicates if requested
    if (options.deduplicate) {
      const duplicate = this.findDuplicate(queuedRequest);
      if (duplicate) {
        logger.debug(`Duplicate request found, returning existing ID: ${duplicate.id}`);
        return duplicate.id;
      }
    }

    // Check queue size limit
    if (this.queue.length >= this.MAX_QUEUE_SIZE) {
      // Remove oldest low priority requests
      this.queue = this.queue
        .filter(req => req.priority !== QueuePriority.LOW)
        .slice(-(this.MAX_QUEUE_SIZE - 1));
    }

    this.queue.push(queuedRequest);
    this.sortQueue();
    await this.persistQueue();

    logger.debug(`Request queued: ${method} ${endpoint}`, { requestId, priority: queuedRequest.priority });
    
    this.notifyListeners();

    // Process immediately if online
    if (this.isOnline && !this.processing) {
      setTimeout(() => this.processQueue(), 100);
    }

    return requestId;
  }

  private findDuplicate(request: QueuedRequest): QueuedRequest | undefined {
    return this.queue.find(existing => 
      existing.endpoint === request.endpoint &&
      existing.method === request.method &&
      JSON.stringify(existing.body) === JSON.stringify(request.body)
    );
  }

  private sortQueue() {
    const priorityOrder = {
      [QueuePriority.HIGH]: 3,
      [QueuePriority.MEDIUM]: 2,
      [QueuePriority.LOW]: 1,
    };

    this.queue.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      
      // Then by creation time
      return a.createdAt - b.createdAt;
    });
  }

  async processQueue(): Promise<void> {
    if (this.processing || !this.isOnline || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    logger.info(`Processing offline queue: ${this.queue.length} requests`);

    try {
      // Process in batches to avoid overwhelming the server
      const batch = this.queue.slice(0, this.BATCH_SIZE);
      const promises = batch.map(request => this.processRequest(request));
      
      await Promise.allSettled(promises);
      
      // Remove completed requests and persist
      await this.persistQueue();
      this.notifyListeners();

      // Continue processing if there are more requests
      if (this.queue.length > 0 && this.isOnline) {
        setTimeout(() => this.processQueue(), 1000);
      }
    } finally {
      this.processing = false;
    }
  }

  private async processRequest(request: QueuedRequest): Promise<void> {
    try {
      const response = await this.executeRequest(request);
      
      if (response.ok) {
        logger.debug(`Request completed: ${request.method} ${request.endpoint}`, { 
          requestId: request.id,
          status: response.status 
        });
        
        // Remove successful request from queue
        this.removeRequest(request.id);
      } else {
        await this.handleRequestFailure(request, new Error(`HTTP ${response.status}`));
      }
    } catch (error) {
      await this.handleRequestFailure(request, error as Error);
    }
  }

  private async executeRequest(request: QueuedRequest): Promise<Response> {
    const url = `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api'}${request.endpoint}`;
    
    return fetch(url, {
      method: request.method,
      headers: request.headers,
      body: request.body ? JSON.stringify(request.body) : undefined,
    });
  }

  private async handleRequestFailure(request: QueuedRequest, error: Error) {
    request.retryCount++;
    request.lastAttempt = Date.now();

    logger.warn(`Request failed (attempt ${request.retryCount}/${request.maxRetries})`, {
      requestId: request.id,
      error: error.message,
      endpoint: request.endpoint,
    });

    if (request.retryCount >= request.maxRetries) {
      logger.error(`Request permanently failed after ${request.retryCount} attempts`, {
        requestId: request.id,
        endpoint: request.endpoint,
      });
      
      this.removeRequest(request.id);
    }
  }

  private removeRequest(requestId: string) {
    this.queue = this.queue.filter(req => req.id !== requestId);
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.persistQueue();
    this.notifyListeners();
    logger.info('Offline queue cleared');
  }

  async removeRequest(requestId: string): Promise<boolean> {
    const initialLength = this.queue.length;
    this.removeRequest(requestId);
    
    if (this.queue.length < initialLength) {
      await this.persistQueue();
      this.notifyListeners();
      return true;
    }
    
    return false;
  }

  async retryRequest(requestId: string): Promise<void> {
    const request = this.queue.find(req => req.id === requestId);
    if (request) {
      request.retryCount = 0;
      request.lastAttempt = 0;
      await this.persistQueue();
      
      if (this.isOnline) {
        await this.processRequest(request);
      }
    }
  }

  getStats(): QueueStats {
    const stats: QueueStats = {
      total: this.queue.length,
      pending: this.queue.filter(req => req.retryCount < req.maxRetries).length,
      failed: this.queue.filter(req => req.retryCount >= req.maxRetries).length,
      highPriority: this.queue.filter(req => req.priority === QueuePriority.HIGH).length,
      mediumPriority: this.queue.filter(req => req.priority === QueuePriority.MEDIUM).length,
      lowPriority: this.queue.filter(req => req.priority === QueuePriority.LOW).length,
    };

    return stats;
  }

  getRequests(priority?: QueuePriority): QueuedRequest[] {
    if (priority) {
      return this.queue.filter(req => req.priority === priority);
    }
    return [...this.queue];
  }

  onStatsChange(listener: (stats: QueueStats) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    const stats = this.getStats();
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        logger.error('Queue stats listener error', error);
      }
    });
  }

  isProcessing(): boolean {
    return this.processing;
  }

  isOnlineMode(): boolean {
    return this.isOnline;
  }

  async forcePurgeExpired(): Promise<number> {
    const now = Date.now();
    const initialLength = this.queue.length;
    
    this.queue = this.queue.filter(req => !req.expiresAt || req.expiresAt > now);
    
    const purgedCount = initialLength - this.queue.length;
    
    if (purgedCount > 0) {
      await this.persistQueue();
      this.notifyListeners();
      logger.info(`Purged ${purgedCount} expired requests from queue`);
    }
    
    return purgedCount;
  }
}

export const offlineQueue = new OfflineQueue();