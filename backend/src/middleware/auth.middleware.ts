import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: any;
  file?: Express.Multer.File;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = AuthService.extractTokenFromHeader(req);
    const user = await AuthService.verifyToken(token);
    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
}; 