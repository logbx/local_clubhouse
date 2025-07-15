import { logger } from '../monitoring/logger';
import { storage } from '../storage';

export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  SERVER = 'SERVER',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  OFFLINE = 'OFFLINE',
  UNKNOWN = 'UNKNOWN',
}

export interface ApiError extends Error {
  type: ErrorType;
  status?: number;
  code?: string;
  details?: any;
  retryable: boolean;
  timestamp: number;
  requestId?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryableErrors: ErrorType[];
}

export interface ErrorHandlingStrategy {
  shouldRetry: (error: ApiError, attempt: number) => boolean;
  getDelay: (attempt: number, baseDelay: number) => number;
  onRetry?: (error: ApiError, attempt: number) => void;
  onFailure?: (error: ApiError, totalAttempts: number) => void;
}

class ApiErrorHandler {
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    jitter: true,
    retryableErrors: [ErrorType.NETWORK, ErrorType.TIMEOUT, ErrorType.SERVER],
  };

  private errorCounts: Map<string, number> = new Map();
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }> = new Map();

  createError(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    status?: number,
    code?: string,
    details?: any
  ): ApiError {
    const error = new Error(message) as ApiError;
    error.type = type;
    error.status = status;
    error.code = code;
    error.details = details;
    error.retryable = this.isRetryableError(type, status);
    error.timestamp = Date.now();

    return error;
  }

  parseResponseError(response: Response, requestId?: string): ApiError {
    let type = ErrorType.UNKNOWN;
    let retryable = false;

    switch (response.status) {
      case 400:
        type = ErrorType.VALIDATION;
        break;
      case 401:
        type = ErrorType.AUTHENTICATION;
        break;
      case 403:
        type = ErrorType.AUTHORIZATION;
        break;
      case 408:
        type = ErrorType.TIMEOUT;
        retryable = true;
        break;
      case 429:
        type = ErrorType.RATE_LIMIT;
        retryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        type = ErrorType.SERVER;
        retryable = true;
        break;
    }

    const error = this.createError(
      `HTTP ${response.status}: ${response.statusText}`,
      type,
      response.status
    );

    error.requestId = requestId;
    error.retryable = retryable;

    return error;
  }

  parseNetworkError(originalError: Error): ApiError {
    let type = ErrorType.NETWORK;
    
    if (originalError.message.includes('timeout')) {
      type = ErrorType.TIMEOUT;
    } else if (originalError.message.includes('offline')) {
      type = ErrorType.OFFLINE;
    }

    const error = this.createError(
      originalError.message,
      type
    );

    error.retryable = type !== ErrorType.OFFLINE;
    return error;
  }

  private isRetryableError(type: ErrorType, status?: number): boolean {
    const retryableTypes = [
      ErrorType.NETWORK,
      ErrorType.TIMEOUT,
      ErrorType.SERVER,
      ErrorType.RATE_LIMIT,
    ];

    if (retryableTypes.includes(type)) {
      return true;
    }

    // Some specific status codes are retryable even if type isn't
    if (status && [429, 500, 502, 503, 504].includes(status)) {
      return true;
    }

    return false;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    strategy?: ErrorHandlingStrategy
  ): Promise<T> {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    const finalStrategy = strategy || this.createDefaultStrategy(finalConfig);

    let lastError: ApiError;
    let attempt = 0;

    while (attempt < finalConfig.maxAttempts) {
      try {
        // Check circuit breaker
        if (this.isCircuitOpen(operation.name)) {
          throw this.createError('Circuit breaker is open', ErrorType.SERVER);
        }

        const result = await operation();
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(operation.name);
        
        return result;
      } catch (error) {
        attempt++;
        lastError = error instanceof Error ? this.parseNetworkError(error) : error;

        // Record failure for circuit breaker
        this.recordFailure(operation.name);

        logger.warn(`Operation failed (attempt ${attempt}/${finalConfig.maxAttempts})`, {
          error: lastError.message,
          type: lastError.type,
          retryable: lastError.retryable,
        });

        if (attempt >= finalConfig.maxAttempts || !finalStrategy.shouldRetry(lastError, attempt)) {
          break;
        }

        const delay = finalStrategy.getDelay(attempt, finalConfig.baseDelay);
        
        if (finalStrategy.onRetry) {
          finalStrategy.onRetry(lastError, attempt);
        }

        await this.delay(delay);
      }
    }

    if (finalStrategy.onFailure) {
      finalStrategy.onFailure(lastError!, attempt);
    }

    logger.error(`Operation failed after ${attempt} attempts`, {
      error: lastError!.message,
      type: lastError!.type,
    });

    throw lastError!;
  }

  private createDefaultStrategy(config: RetryConfig): ErrorHandlingStrategy {
    return {
      shouldRetry: (error: ApiError, attempt: number) => {
        return error.retryable && config.retryableErrors.includes(error.type);
      },
      getDelay: (attempt: number, baseDelay: number) => {
        const exponentialDelay = baseDelay * Math.pow(config.backoffFactor, attempt - 1);
        const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
        
        if (config.jitter) {
          return cappedDelay + (Math.random() * cappedDelay * 0.1);
        }
        
        return cappedDelay;
      },
    };
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private isCircuitOpen(operationName: string): boolean {
    const breaker = this.circuitBreakers.get(operationName);
    if (!breaker) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastFailure = now - breaker.lastFailure;

    // Reset if enough time has passed
    if (timeSinceLastFailure > 60000) { // 1 minute
      breaker.state = 'half-open';
      breaker.failures = 0;
    }

    return breaker.state === 'open';
  }

  private recordFailure(operationName: string) {
    const breaker = this.circuitBreakers.get(operationName) || {
      failures: 0,
      lastFailure: 0,
      state: 'closed' as const,
    };

    breaker.failures++;
    breaker.lastFailure = Date.now();

    // Open circuit if too many failures
    if (breaker.failures >= 5) {
      breaker.state = 'open';
    }

    this.circuitBreakers.set(operationName, breaker);
  }

  private resetCircuitBreaker(operationName: string) {
    this.circuitBreakers.delete(operationName);
  }

  logError(error: ApiError, context?: any) {
    logger.error('API Error', {
      message: error.message,
      type: error.type,
      status: error.status,
      code: error.code,
      retryable: error.retryable,
      timestamp: error.timestamp,
      requestId: error.requestId,
      context,
    });

    // Store error for analytics
    this.storeErrorMetrics(error);
  }

  private async storeErrorMetrics(error: ApiError) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const key = `error_metrics_${today}`;
      
      const metrics = await storage.get<Record<string, number>>(key) || {};
      const errorKey = `${error.type}_${error.status || 'unknown'}`;
      
      metrics[errorKey] = (metrics[errorKey] || 0) + 1;
      
      await storage.set(key, metrics);
    } catch (err) {
      logger.debug('Failed to store error metrics', err);
    }
  }

  async getErrorMetrics(days: number = 7): Promise<Record<string, Record<string, number>>> {
    const metrics: Record<string, Record<string, number>> = {};
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const key = `error_metrics_${date.toISOString().split('T')[0]}`;
      
      try {
        const dayMetrics = await storage.get<Record<string, number>>(key);
        if (dayMetrics) {
          metrics[date.toISOString().split('T')[0]] = dayMetrics;
        }
      } catch (error) {
        logger.debug(`Failed to get metrics for ${key}`, error);
      }
    }
    
    return metrics;
  }
}

export const errorHandler = new ApiErrorHandler();