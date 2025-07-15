// Enhanced API Service Layer
// Comprehensive offline-first architecture with security focus

export { enhancedApiClient as apiClient } from './enhanced-client';
export { interceptorManager } from './interceptors';
export { errorHandler } from './error-handler';
export { offlineQueue } from './offline-queue';
export { requestValidator } from './validation';
export { apiCache } from './cache';

// Types and interfaces
export type {
  RequestConfig,
  RequestInterceptor,
  ResponseInterceptor,
} from './interceptors';

export type {
  ApiError,
  ErrorType,
  RetryConfig,
  ErrorHandlingStrategy,
} from './error-handler';

export type {
  QueuedRequest,
  QueuePriority,
  QueueStats,
  QueueOptions,
} from './offline-queue';

export type {
  ValidationRule,
  ValidationSchema,
  ValidationResult,
} from './validation';

export type {
  CacheEntry,
  CacheOptions,
} from './cache';

export type {
  ApiClientConfig,
  RequestOptions,
} from './enhanced-client';

// Re-export storage for convenience
export { storage } from '../storage';
export { logger } from '../monitoring/logger';