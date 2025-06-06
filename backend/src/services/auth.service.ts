import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/user.model';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { UserRole } from '../types/user';

const JWT_SECRET = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = '24h';

export class AuthService {
  static generateToken(user: IUser): string {
    return jwt.sign(
      { 
        id: user._id,
        email: user.email,
        roles: user.roles 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  static async register(userData: { username: string; email: string; password: string }): Promise<{ user: IUser; token: string }> {
    const { username, email, password } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      roles: [UserRole.Member],
    });

    await newUser.save();

    // Generate JWT token
    const token = AuthService.generateToken(newUser);

    return { user: newUser, token };
  }

  static async login(email: string, password: string): Promise<{ user: IUser; token: string }> {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = AuthService.generateToken(user);

      return { user, token };
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Invalid credentials');
    }
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