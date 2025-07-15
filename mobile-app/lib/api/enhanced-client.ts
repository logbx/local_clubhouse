import { interceptorManager, RequestConfig } from './interceptors';
import { errorHandler, ApiError, ErrorType } from './error-handler';
import { offlineQueue, QueuePriority, QueueOptions } from './offline-queue';
import { storage } from '../storage';
import { logger } from '../monitoring/logger';
import NetInfo from '@react-native-community/netinfo';

export interface ApiClientConfig {
  baseURL: string;
  timeout: number;
  retryConfig: {
    maxAttempts: number;
    baseDelay: number;
  };
  security: {
    enableRequestSigning: boolean;
    enableResponseValidation: boolean;
  };
  offline: {
    enableQueue: boolean;
    defaultPriority: QueuePriority;
  };
}

export interface RequestOptions {
  timeout?: number;
  priority?: QueuePriority;
  cacheable?: boolean;
  offline?: boolean;
  retryConfig?: {
    maxAttempts?: number;
    baseDelay?: number;
  };
  queueOptions?: QueueOptions;
}

class EnhancedApiClient {
  private config: ApiClientConfig;
  private isOnline = true;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number | null = null;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(config?: Partial<ApiClientConfig>) {
    this.config = {
      baseURL: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api',
      timeout: 30000,
      retryConfig: {
        maxAttempts: 3,
        baseDelay: 1000,
      },
      security: {
        enableRequestSigning: true,
        enableResponseValidation: true,
      },
      offline: {
        enableQueue: true,
        defaultPriority: QueuePriority.MEDIUM,
      },
      ...config,
    };

    this.initializeClient();
  }

  private async initializeClient() {
    await this.loadTokens();
    this.setupNetworkListener();
    
    logger.info('Enhanced API client initialized', {
      baseURL: this.config.baseURL,
      offlineEnabled: this.config.offline.enableQueue,
    });
  }

  private async loadTokens() {
    try {
      this.accessToken = await storage.getAccessToken();
      this.refreshToken = await storage.getRefreshToken();
      
      // Load expiration time
      const tokenData = await storage.get('token_expires_at');
      if (tokenData) {
        this.tokenExpiresAt = tokenData as number;
      }
    } catch (error) {
      logger.error('Failed to load tokens', error);
    }
  }

  private setupNetworkListener() {
    NetInfo.addEventListener((state) => {
      this.isOnline = state.isConnected ?? false;
      logger.debug(`Network status changed: ${this.isOnline ? 'online' : 'offline'}`);
    });
  }

  async request<T>(
    endpoint: string,
    options: RequestOptions & {
      method?: string;
      body?: any;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const {
      method = 'GET',
      body,
      headers = {},
      timeout = this.config.timeout,
      priority = this.config.offline.defaultPriority,
      cacheable = false,
      offline = true,
      retryConfig,
      queueOptions,
    } = options;

    // Check if we should queue the request for offline processing
    if (!this.isOnline && offline && this.config.offline.enableQueue) {
      const requestId = await offlineQueue.enqueue(
        endpoint,
        method,
        body,
        headers,
        {
          priority,
          ...queueOptions,
        }
      );

      logger.info(`Request queued for offline processing: ${requestId}`);
      
      // Return a promise that resolves when the request is eventually processed
      return new Promise((resolve, reject) => {
        // For now, we'll throw an error indicating offline mode
        // In a full implementation, you might want to track queued promises
        reject(errorHandler.createError('Request queued for offline processing', ErrorType.OFFLINE));
      });
    }

    const requestConfig: RequestConfig = {
      url: `${this.config.baseURL}${endpoint}`,
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body,
      metadata: {
        startTime: Date.now(),
        requestId: '',
        retryCount: 0,
        priority,
        timeout,
        cacheable,
        offline,
      },
    };

    return errorHandler.executeWithRetry(
      async () => {
        // Check token expiration
        if (this.shouldRefreshToken()) {
          await this.refreshAccessToken();
        }

        // Process request through interceptors
        const processedConfig = await interceptorManager.processRequest(requestConfig);

        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
          const response = await fetch(processedConfig.url, {
            method: processedConfig.method,
            headers: processedConfig.headers,
            body: processedConfig.body ? JSON.stringify(processedConfig.body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Handle token refresh on 401
          if (response.status === 401 && this.refreshToken) {
            await this.refreshAccessToken();
            
            // Update authorization header and retry
            processedConfig.headers.Authorization = `Bearer ${this.accessToken}`;
            
            const retryResponse = await fetch(processedConfig.url, {
              method: processedConfig.method,
              headers: processedConfig.headers,
              body: processedConfig.body ? JSON.stringify(processedConfig.body) : undefined,
            });

            return this.processResponse(retryResponse, processedConfig);
          }

          return this.processResponse(response, processedConfig);
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            throw errorHandler.createError('Request timeout', ErrorType.TIMEOUT);
          }
          
          throw errorHandler.parseNetworkError(fetchError as Error);
        }
      },
      retryConfig ? { ...this.config.retryConfig, ...retryConfig } : this.config.retryConfig
    );
  }

  private async processResponse<T>(response: Response, config: RequestConfig): Promise<T> {
    // Process response through interceptors
    const processedResponse = await interceptorManager.processResponse(response, config);

    if (!processedResponse.ok) {
      const apiError = errorHandler.parseResponseError(processedResponse, config.metadata.requestId);
      errorHandler.logError(apiError, { url: config.url, method: config.method });
      throw apiError;
    }

    try {
      const data = await processedResponse.json();
      logger.debug('API request successful', {
        url: config.url,
        method: config.method,
        status: processedResponse.status,
        requestId: config.metadata.requestId,
      });
      
      return data;
    } catch (parseError) {
      throw errorHandler.createError('Failed to parse response JSON', ErrorType.UNKNOWN);
    }
  }

  private shouldRefreshToken(): boolean {
    return !!(
      this.accessToken &&
      this.tokenExpiresAt &&
      Date.now() > this.tokenExpiresAt - 300000 // Refresh 5 minutes before expiry
    );
  }

  private async refreshAccessToken(): Promise<void> {
    if (this.isRefreshing) {
      return this.refreshPromise || Promise.resolve();
    }

    if (!this.refreshToken) {
      throw errorHandler.createError('No refresh token available', ErrorType.AUTHENTICATION);
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        logger.info('Refreshing access token');

        const response = await fetch(`${this.config.baseURL}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            refreshToken: this.refreshToken,
          }),
        });

        if (!response.ok) {
          throw errorHandler.createError('Failed to refresh token', ErrorType.AUTHENTICATION);
        }

        const tokenData = await response.json();
        await this.setTokens(tokenData);

        logger.info('Access token refreshed successfully');
      } catch (error) {
        logger.error('Token refresh failed', error);
        await this.clearTokens();
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async setTokens(tokenData: { accessToken: string; refreshToken: string; expiresIn: number }) {
    this.accessToken = tokenData.accessToken;
    this.refreshToken = tokenData.refreshToken;
    this.tokenExpiresAt = Date.now() + (tokenData.expiresIn * 1000);

    await Promise.all([
      storage.setTokens(tokenData.accessToken, tokenData.refreshToken),
      storage.set('token_expires_at', this.tokenExpiresAt),
    ]);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = null;

    await Promise.all([
      storage.clearTokens(),
      storage.remove('token_expires_at'),
    ]);
  }

  // Convenience methods for common HTTP operations
  async get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  async delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Utility methods
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  isOnlineMode(): boolean {
    return this.isOnline;
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  getConfig(): ApiClientConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<ApiClientConfig>) {
    this.config = { ...this.config, ...config };
    logger.info('API client configuration updated', config);
  }

  // Queue management
  getQueueStats() {
    return offlineQueue.getStats();
  }

  async clearOfflineQueue() {
    return offlineQueue.clearQueue();
  }

  async processOfflineQueue() {
    return offlineQueue.processQueue();
  }

  onQueueStatsChange(listener: (stats: any) => void) {
    return offlineQueue.onStatsChange(listener);
  }

  // Error metrics
  async getErrorMetrics(days?: number) {
    return errorHandler.getErrorMetrics(days);
  }
}

// Create and export singleton instance
export const enhancedApiClient = new EnhancedApiClient();
export default enhancedApiClient;