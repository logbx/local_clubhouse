import { Request } from 'express';
import { User, UserRole } from '../users/schemas/user.schema';

export interface AuthenticatedUser {
  sub: string;
  email: string;
  roles: UserRole[];
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    roles: UserRole[];
  };
} 