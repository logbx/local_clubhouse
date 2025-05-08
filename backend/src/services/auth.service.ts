import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import { Request } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  static generateToken(user: IUser): string {
    return jwt.sign(
      { 
        id: user._id,
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  static async register(userData: {
    fullName: string;
    email: string;
    password: string;
  }): Promise<{ user: IUser; token: string }> {
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    const user = await User.create(userData);
    const token = this.generateToken(user);

    return { user, token };
  }

  static async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const token = this.generateToken(user);
    return { user, token };
  }

  static async verifyToken(token: string): Promise<IUser> {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
      const user = await User.findById(decoded.id);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static extractTokenFromHeader(req: Request): string {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('No token provided');
    }
    return authHeader.split(' ')[1];
  }
} 