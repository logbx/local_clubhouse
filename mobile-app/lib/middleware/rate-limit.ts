import { ExpoRequest, ExpoResponse } from 'expo-router/server';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export function createRateLimiter(options: {
  windowMs: number;
  max: number;
  message?: string;
}) {
  return (request: ExpoRequest, response: ExpoResponse, next: () => void) => {
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    
    const key = `${ip}:${request.url}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      return next();
    }

    store[key].count++;

    if (store[key].count > options.max) {
      return ExpoResponse.json(
        { 
          error: options.message || 'Too many requests, please try again later.',
          retryAfter: Math.ceil((store[key].resetTime - now) / 1000),
        },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((store[key].resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': options.max.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(store[key].resetTime).toISOString(),
          },
        }
      );
    }

    response.headers.set('X-RateLimit-Limit', options.max.toString());
    response.headers.set('X-RateLimit-Remaining', (options.max - store[key].count).toString());
    response.headers.set('X-RateLimit-Reset', new Date(store[key].resetTime).toISOString());

    next();
  };
}

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 60000); // Clean up every minute