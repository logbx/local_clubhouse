import { ExpoRequest, ExpoResponse } from 'expo-router/server';
import jwt from 'jsonwebtoken';
import { User } from '@/lib/models/user.model';
import { connectDB } from '@/lib/db';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
  json(): Promise<any>;
  formData(): Promise<FormData>;
  url: string;
}

export async function verifyToken(
  request: AuthRequest,
  response: Response,
  next: () => void
) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return Response.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      sub: string;
      email: string;
    };

    await connectDB();
    const user = await (User as any).findById(decoded.sub);

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 401 }
      );
    }

    request.user = {
      id: user._id.toString(),
      email: user.email,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return Response.json(
        { error: 'Token expired' },
        { status: 401 }
      );
    }
    
    return ExpoResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}

export function optionalAuth(
  request: AuthRequest,
  response: Response,
  next: () => void
) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as {
      sub: string;
      email: string;
    };

    request.user = {
      id: decoded.sub,
      email: decoded.email,
    };
  } catch (error) {
    // Token is invalid but we continue anyway for optional auth
  }

  next();
}