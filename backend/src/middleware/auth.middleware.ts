import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest, AuthenticatedUser } from '../types/express';
import jwt from 'jsonwebtoken';

// Express Request interface with user for the user controller
export interface AuthRequest extends Request {
  user?: {
    _id: string;
    id?: string;
    email: string;
    roles: string[];
    [key: string]: any;
  };
}

// Express middleware function for JWT authentication
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      return res.status(401).json({ error: 'Invalid authorization header' });
    }

    const secret = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ error: 'JWT secret not configured' });
    }

    const payload = jwt.verify(token, secret) as any;
    req.user = {
      _id: payload.id || payload.sub,
      id: payload.id || payload.sub,
      email: payload.email,
      roles: payload.roles || []
    };
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new UnauthorizedException('No authorization header');
      }

      const [type, token] = authHeader.split(' ');
      if (type !== 'Bearer' || !token) {
        throw new UnauthorizedException('Invalid authorization header');
  }

      const secret = this.configService.get<string>('JWT_ACCESS_SECRET');
      if (!secret) {
        throw new Error('JWT_ACCESS_SECRET is not defined');
    }

      const payload = await this.jwtService.verifyAsync<AuthenticatedUser>(token, { secret });
      req.user = payload;
      next();
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }
} 