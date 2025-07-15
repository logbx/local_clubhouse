import { storage } from '../storage';
import { performance } from '../monitoring/performance';
import { logger } from '../monitoring/logger';
import * as Crypto from 'expo-crypto';

export interface RequestInterceptor {
  name: string;
  priority: number;
  onRequest: (config: RequestConfig) => Promise<RequestConfig>;
  onError?: (error: Error) => Promise<Error>;
}

export interface ResponseInterceptor {
  name: string;
  priority: number;
  onResponse: (response: Response, config: RequestConfig) => Promise<Response>;
  onError?: (error: Error, config: RequestConfig) => Promise<Error>;
}

export interface RequestConfig {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
  metadata: {
    startTime: number;
    requestId: string;
    retryCount: number;
    priority: 'high' | 'medium' | 'low';
    timeout: number;
    cacheable: boolean;
    offline: boolean;
  };
}

class InterceptorManager {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: ResponseInterceptor[] = [];

  constructor() {
    this.registerDefaultInterceptors();
  }

  private registerDefaultInterceptors() {
    // Authentication interceptor
    this.addRequestInterceptor({
      name: 'auth',
      priority: 100,
      onRequest: async (config) => {
        const accessToken = await storage.getAccessToken();
        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
    });

    // Request ID interceptor
    this.addRequestInterceptor({
      name: 'requestId',
      priority: 90,
      onRequest: async (config) => {
        config.metadata.requestId = await Crypto.randomUUID();
        config.headers['X-Request-ID'] = config.metadata.requestId;
        return config;
      },
    });

    // Security headers interceptor
    this.addRequestInterceptor({
      name: 'security',
      priority: 95,
      onRequest: async (config) => {
        const timestamp = Date.now().toString();
        const nonce = await Crypto.randomUUID();
        
        config.headers['X-Timestamp'] = timestamp;
        config.headers['X-Nonce'] = nonce;
        config.headers['X-Client-Version'] = process.env.EXPO_PUBLIC_APP_VERSION || '1.0.0';
        
        // Add request signature for sensitive operations
        if (config.method !== 'GET') {
          const signature = await this.generateRequestSignature(config, timestamp, nonce);
          config.headers['X-Signature'] = signature;
        }
        
        return config;
      },
    });

    // Performance monitoring interceptor
    this.addRequestInterceptor({
      name: 'performance',
      priority: 10,
      onRequest: async (config) => {
        config.metadata.startTime = Date.now();
        performance.startTimer(`api_${config.method}_${config.url}`);
        return config;
      },
    });

    // Response performance interceptor
    this.addResponseInterceptor({
      name: 'performance',
      priority: 10,
      onResponse: async (response, config) => {
        const duration = Date.now() - config.metadata.startTime;
        performance.endTimer(`api_${config.method}_${config.url}`);
        
        logger.info('API Request', {
          method: config.method,
          url: config.url,
          status: response.status,
          duration,
          requestId: config.metadata.requestId,
        });
        
        return response;
      },
      onError: async (error, config) => {
        const duration = Date.now() - config.metadata.startTime;
        performance.endTimer(`api_${config.method}_${config.url}`);
        
        logger.error('API Request Failed', {
          method: config.method,
          url: config.url,
          error: error.message,
          duration,
          requestId: config.metadata.requestId,
        });
        
        return error;
      },
    });

    // Response validation interceptor
    this.addResponseInterceptor({
      name: 'validation',
      priority: 80,
      onResponse: async (response, config) => {
        // Validate response structure
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          try {
            const data = await response.clone().json();
            if (!this.isValidResponse(data)) {
              throw new Error('Invalid response structure');
            }
          } catch (error) {
            logger.warn('Response validation failed', {
              url: config.url,
              error: error.message,
            });
          }
        }
        return response;
      },
    });
  }

  private async generateRequestSignature(config: RequestConfig, timestamp: string, nonce: string): Promise<string> {
    const secretKey = await storage.get('api_secret_key') || 'default_secret';
    const payload = `${config.method}${config.url}${timestamp}${nonce}${config.body || ''}`;
    
    return await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      payload + secretKey
    );
  }

  private isValidResponse(data: any): boolean {
    // Basic response structure validation
    if (typeof data !== 'object' || data === null) {
      return false;
    }

    // Check for required fields in API responses
    if (data.hasOwnProperty('success') && typeof data.success !== 'boolean') {
      return false;
    }

    return true;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
    this.requestInterceptors.sort((a, b) => b.priority - a.priority);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
    this.responseInterceptors.sort((a, b) => b.priority - a.priority);
  }

  removeRequestInterceptor(name: string) {
    this.requestInterceptors = this.requestInterceptors.filter(i => i.name !== name);
  }

  removeResponseInterceptor(name: string) {
    this.responseInterceptors = this.responseInterceptors.filter(i => i.name !== name);
  }

  async processRequest(config: RequestConfig): Promise<RequestConfig> {
    let processedConfig = config;

    for (const interceptor of this.requestInterceptors) {
      try {
        processedConfig = await interceptor.onRequest(processedConfig);
      } catch (error) {
        logger.error(`Request interceptor ${interceptor.name} failed`, error);
        if (interceptor.onError) {
          await interceptor.onError(error);
        }
        throw error;
      }
    }

    return processedConfig;
  }

  async processResponse(response: Response, config: RequestConfig): Promise<Response> {
    let processedResponse = response;

    for (const interceptor of this.responseInterceptors) {
      try {
        processedResponse = await interceptor.onResponse(processedResponse, config);
      } catch (error) {
        logger.error(`Response interceptor ${interceptor.name} failed`, error);
        if (interceptor.onError) {
          await interceptor.onError(error, config);
        }
        throw error;
      }
    }

    return processedResponse;
  }

  async processError(error: Error, config: RequestConfig): Promise<Error> {
    let processedError = error;

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onError) {
        try {
          processedError = await interceptor.onError(processedError, config);
        } catch (interceptorError) {
          logger.error(`Error interceptor ${interceptor.name} failed`, interceptorError);
        }
      }
    }

    return processedError;
  }
}

export const interceptorManager = new InterceptorManager();