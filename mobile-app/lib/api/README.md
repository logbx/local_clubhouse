# Enhanced API Service Layer

## Overview

This enhanced API service layer provides a comprehensive, production-ready solution with offline-first architecture, advanced security features, and robust error handling.

## Architecture Components

### 1. Enhanced API Client (`enhanced-client.ts`)
The main API client with integrated features:
- **Token Management**: Automatic token refresh and secure storage
- **Request/Response Interceptors**: Pluggable middleware system
- **Offline Queue**: Automatic request queuing when offline
- **Error Handling**: Comprehensive error handling with retry logic
- **Security**: Request signing and validation
- **Performance Monitoring**: Built-in performance tracking

### 2. Interceptor System (`interceptors.ts`)
Pluggable middleware for request/response processing:
- **Authentication Interceptor**: Automatic token injection
- **Security Interceptor**: Request signing and headers
- **Performance Interceptor**: Request timing and monitoring
- **Validation Interceptor**: Response structure validation

### 3. Error Handling (`error-handler.ts`)
Advanced error handling with:
- **Typed Errors**: Structured error types with context
- **Retry Logic**: Exponential backoff with jitter
- **Circuit Breaker**: Automatic failure detection
- **Error Metrics**: Comprehensive error tracking

### 4. Offline Queue (`offline-queue.ts`)
Robust offline support with:
- **Priority-based Queue**: High/Medium/Low priority requests
- **Automatic Processing**: Queue processing when online
- **Request Deduplication**: Prevents duplicate requests
- **Expiration Support**: Time-based request expiration

### 5. Request Validation (`validation.ts`)
Input/output validation with:
- **Schema-based Validation**: Predefined validation schemas
- **Type Safety**: Runtime type checking
- **Sanitization**: Input sanitization and field filtering
- **Custom Rules**: Extensible validation rules

### 6. Response Caching (`cache.ts`)
Intelligent caching system with:
- **Memory + Persistent Cache**: Two-tier caching strategy
- **TTL Support**: Time-based cache expiration
- **Tag-based Invalidation**: Bulk cache invalidation
- **Size Management**: Automatic cache size limits

## Security Features

### Request Signing
- SHA256-based request signatures
- Timestamp and nonce protection
- Replay attack prevention

### Token Management
- Secure token storage (Expo SecureStore)
- Automatic token refresh
- Token expiration handling

### Input Validation
- Schema-based request validation
- XSS protection through sanitization
- Field whitelisting

## Usage Examples

### Basic API Calls

```typescript
import { apiClient } from '@/lib/api';

// GET request with caching
const users = await apiClient.get('/users', {
  cacheable: true,
  priority: QueuePriority.HIGH
});

// POST request with validation
const newUser = await apiClient.post('/users', userData, {
  priority: QueuePriority.MEDIUM,
  offline: true // Will queue if offline
});
```

### Custom Interceptors

```typescript
import { interceptorManager } from '@/lib/api';

// Add custom request interceptor
interceptorManager.addRequestInterceptor({
  name: 'custom-auth',
  priority: 50,
  onRequest: async (config) => {
    config.headers['X-Custom-Header'] = 'value';
    return config;
  }
});
```

### Error Handling

```typescript
import { errorHandler, ErrorType } from '@/lib/api';

try {
  const result = await apiClient.get('/protected-endpoint');
} catch (error) {
  if (error.type === ErrorType.AUTHENTICATION) {
    // Handle auth error
    router.push('/login');
  } else if (error.retryable) {
    // Show retry option
    showRetryDialog();
  }
}
```

### Offline Queue Management

```typescript
import { offlineQueue } from '@/lib/api';

// Monitor queue status
const unsubscribe = offlineQueue.onStatsChange((stats) => {
  console.log(`Queue: ${stats.pending} pending, ${stats.failed} failed`);
});

// Clear queue
await offlineQueue.clearQueue();

// Force process queue
await offlineQueue.processQueue();
```

### Cache Operations

```typescript
import { apiCache } from '@/lib/api';

// Cache with tags for bulk invalidation
await apiCache.set('user-profile', userData, {
  ttl: 10 * 60 * 1000, // 10 minutes
  tags: ['user', 'profile']
});

// Invalidate all user-related cache
await apiCache.invalidateByTag('user');
```

### Request Validation

```typescript
import { requestValidator } from '@/lib/api';

// Register custom schema
requestValidator.registerSchema({
  name: 'customData',
  rules: [
    { field: 'email', type: 'email', required: true },
    { field: 'age', type: 'number', min: 18, max: 120 }
  ]
});

// Validate request data
const result = requestValidator.validateRequest('customData', formData);
if (!result.valid) {
  console.log('Validation errors:', result.errors);
}
```

## Configuration

### API Client Configuration

```typescript
import { enhancedApiClient } from '@/lib/api';

enhancedApiClient.updateConfig({
  timeout: 60000,
  retryConfig: {
    maxAttempts: 5,
    baseDelay: 2000
  },
  security: {
    enableRequestSigning: true,
    enableResponseValidation: true
  },
  offline: {
    enableQueue: true,
    defaultPriority: QueuePriority.MEDIUM
  }
});
```

## Monitoring and Analytics

### Performance Metrics
- Request duration tracking
- Success/failure rates
- Queue statistics
- Cache hit/miss ratios

### Error Analytics
- Error type distribution
- Retry attempt statistics
- Circuit breaker status
- Failed request patterns

### Usage Monitoring

```typescript
import { apiClient } from '@/lib/api';

// Get error metrics
const errorMetrics = await apiClient.getErrorMetrics(7); // Last 7 days

// Get queue statistics
const queueStats = apiClient.getQueueStats();

// Get cache statistics
const cacheStats = await apiCache.getStats();
```

## Integration with React Query

The enhanced API client seamlessly integrates with TanStack React Query:

```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => apiClient.get('/users'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
```

## Best Practices

1. **Use Priority Levels**: Set appropriate priority for requests
2. **Enable Caching**: Use caching for read-heavy operations
3. **Handle Offline**: Design for offline-first experience
4. **Monitor Errors**: Track error patterns and metrics
5. **Validate Input**: Always validate user input
6. **Security First**: Enable all security features in production

## Production Considerations

- Configure appropriate timeouts
- Set up error monitoring and alerting
- Implement proper logging
- Use HTTPS in production
- Monitor cache size and performance
- Set up circuit breaker thresholds
- Configure rate limiting

This enhanced API service layer provides enterprise-grade reliability, security, and performance for mobile applications.