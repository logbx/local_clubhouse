import { Request, Response, NextFunction } from 'express';
import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedRequest, AuthenticatedUser } from '../types/express';
import jwt from 'jsonwebtoken';
import { User } from '../models/user.model';

// Express Request interface with user for the user controller
export interface AuthRequest extends Request {
  user?: any;
}

// Express middleware function for JWT authentication
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(401).json({ error: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token is not valid' });
  }
};

export const optionalAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response> => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret') as any;
    const user = await User.findById(decoded.id);
    
    if (user) {
      req.user = user;
    }
    
    next();
  } catch (error) {
    // If token is invalid, continue without user
    next();
  }
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void | Response => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  if (!req.user.roles.includes('admin')) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  
  next();
};

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
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