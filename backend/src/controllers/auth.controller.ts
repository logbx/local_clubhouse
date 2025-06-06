import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

export class AuthController {
  static async register(req: Request, res: Response) {
    try {
      const { username, email, password } = req.body;

      // Validate required fields
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }

      const { user, token } = await AuthService.register({
        username,
        email,
        password,
      });

      res.status(201).json({
        message: 'Registration successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles || [],
          profileCompleted: false
        },
        token,
      });
    } catch (error: any) {
      console.error('Registration error:', error);
      res.status(400).json({ error: error.message });
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const { user, token } = await AuthService.login(email, password);

      // Check if profile is completed based on required fields
      const isProfileCompleted = 
        user.username && 
        user.roles && 
        user.roles.length > 0;

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          roles: user.roles || [],
          phoneNumber: user.phoneNumber || '',
          bio: user.bio || '',
          interests: user.interests || [],
          profileImage: user.profileImage || null,
          profileCompleted: isProfileCompleted
        },
        token,
      });
    } catch (error: any) {
      res.status(401).json({ error: error.message });
    }
  }
} 