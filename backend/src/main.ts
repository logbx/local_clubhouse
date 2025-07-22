import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Trust proxy for rate limiting
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Set global prefix for all routes
  app.setGlobalPrefix('api');

  // Configure CORS with proper environment-based origins
  const corsOrigin = configService.get('CORS_ORIGIN') || 
                     configService.get('CLIENT_URL') || 
                     (process.env.NODE_ENV === 'production' ? 'https://localclubhouse.com' : 'http://localhost:5173');
  
  // In development, allow multiple origins including Expo
  const allowedOrigins = process.env.NODE_ENV === 'development' 
    ? [
        corsOrigin,
        'http://localhost:19006', // Expo web
        'http://localhost:8081',   // Metro bundler
        'http://10.0.2.2:3001',    // Android emulator
        'http://localhost:3001',   // Direct API access
        /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:\d+$/, // Local network IPs
        /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:\d+$/, // Local network IPs
      ]
    : corsOrigin;
  
  console.log('🌐 CORS Configuration:', {
    nodeEnv: process.env.NODE_ENV,
    corsOrigin,
    allowedOrigins: process.env.NODE_ENV === 'development' ? 'Multiple origins allowed' : corsOrigin,
    clientUrl: configService.get('CLIENT_URL'),
    corsFromEnv: configService.get('CORS_ORIGIN')
  });

  app.enableCors({
    origin: (origin: string, callback: (error: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps)
      if (!origin) return callback(null, true);
      
      if (process.env.NODE_ENV === 'development') {
        // In development, check against allowed origins
        const isAllowed = (allowedOrigins as any[]).some((allowed: any) => {
          if (allowed instanceof RegExp) {
            return allowed.test(origin);
          }
          return allowed === origin;
        });
        callback(null, isAllowed);
      } else {
        // In production, use strict origin checking
        callback(null, origin === corsOrigin);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'Pragma', 'Expires'],
  });

  // Add cache control headers to prevent browser caching issues
  app.use((req: any, res: any, next: any) => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Set cache control headers for API routes
    if (req.url.startsWith('/api/')) {
      if (isDevelopment) {
        // In development, prevent ALL caching
        res.set({
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Surrogate-Control': 'no-store'
        });
      } else {
        // In production, allow caching for GET requests but not POST/PUT/DELETE
        if (req.method === 'GET') {
          res.set('Cache-Control', 'public, max-age=60'); // Cache GET requests for 1 minute
        } else {
          res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
      }
      
      // Always prevent caching of error responses
      const originalSend = res.send;
      res.send = function(data: any) {
        if (res.statusCode >= 400) {
          res.set({
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          });
        }
        return originalSend.call(this, data);
      };
    }
    
    next();
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      validationError: {
        target: false,
        value: false,
      },
      exceptionFactory: (errors) => {
        console.log('[ValidationPipe] Validation errors:', JSON.stringify(errors, null, 2));
        return new BadRequestException({
          message: errors.map(error => 
            Object.values(error.constraints || {}).join(', ')
          ),
          error: 'Bad Request',
          statusCode: 400,
        });
      },
    }),
  );

  // Add request logging middleware
  app.use((req: any, res: any, next: any) => {
    if (req.url.includes('/api/tournaments/submit-result')) {
      console.log('🚨 SUBMIT-RESULT REQUEST RECEIVED!', {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        authorization: req.headers.authorization ? 'Present' : 'Missing'
      });
    }
    
    if (req.url.includes('/api/tournaments/report-result')) {
      console.log('🚨 REPORT-RESULT REQUEST RECEIVED!', {
        method: req.method,
        url: req.url,
        timestamp: new Date().toISOString(),
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        authorization: req.headers.authorization ? 'Present' : 'Missing'
      });
    }
    
    // Log ALL POST requests to tournaments
    if (req.method === 'POST' && req.url.includes('/api/tournaments')) {
      console.log('🚨 TOURNAMENT POST REQUEST!', {
        method: req.method,
        url: req.url,
        fullUrl: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  });

  const port = configService.get('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  console.log(`Application is running on: http://0.0.0.0:${port}`);
}
bootstrap();
