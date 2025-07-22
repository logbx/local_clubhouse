import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import * as bcryptjs from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../services/email.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {}

  async generateTokens(user: UserDocument) {
    const payload = {
      sub: user._id,
      email: user.email,
      roles: user.roles,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION', '1h'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        roles: user.roles || [],
        phoneNumber: user.phoneNumber || '',
        bio: user.bio || '',
        interests: user.interests || [],
        profileImage: user.profileImage || null,
        profileCompleted: user.profileCompleted || false
      }
    };
  }

  async validateUser(identifier: string, password: string): Promise<UserDocument | null> {
    console.log('Validating user with identifier:', identifier);
    // Try to find user by email first, then by username
    const user = await this.userModel.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    }).select('+password');  // Explicitly include the password field
    
    console.log('Found user:', user ? 'Yes' : 'No');
    console.log('User has password:', user?.password ? 'Yes' : 'No');
    
    if (user && user.password) {
      const isPasswordValid = await bcryptjs.compare(password, user.password);
      console.log('Password valid:', isPasswordValid);
      if (isPasswordValid) {
        return user;
      }
    }
    return null;
  }

  async login(identifier: string, password: string) {
    console.log('Login attempt starting with identifier:', identifier);
    
    // Find user and explicitly include password field
    const user = await this.userModel.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    }).select('+password');  // Explicitly include the password field

    console.log('Login attempt details:', {
      identifier,
      userFound: !!user,
      hasPassword: user?.password ? 'Yes' : 'No',
      userEmail: user?.email,
      userId: user?._id,
      allFields: user ? Object.keys(user.toObject()) : []
    });

    if (!user) {
      throw new UnauthorizedException('No account found with this email or username. Please check your credentials or sign up for a new account.');
    }

    if (!user.password) {
      console.log('Password field is missing from user document');
      
      // Check if this is a Firebase user trying to login on web
      if (user.firebaseUID && user.authMethod) {
        const authMethodText = {
          'phone': 'phone number',
          'email': 'email (mobile app)',
          'google': 'Google',
          'apple': 'Apple'
        }[user.authMethod] || user.authMethod;
        
        throw new BadRequestException(
          `This account was created using ${authMethodText} authentication. ` +
          `Please use the mobile app or sign in with your ${authMethodText} method. ` +
          `If you want to use this account on web, you can set a password in the mobile app settings.`
        );
      }
      
      throw new UnauthorizedException('Account configuration error. Please contact support.');
    }

    // Use the schema's comparePassword method
    try {
      const isPasswordValid = await user.comparePassword(password);
      console.log('Password comparison details:', {
        inputPassword: password,
        isValid: isPasswordValid
      });

      if (!isPasswordValid) {
        throw new UnauthorizedException('Incorrect password. Please try again or use the "Forgot Password" link if you need to reset it.');
      }
    } catch (error) {
      console.error('Error comparing passwords:', error);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication error. Please try again.');
    }

    return this.generateTokens(user);
  }

  async register(userData: Partial<User>) {
    // Check email uniqueness
    const existingUser = await this.userModel.findOne({ email: userData.email });
    if (existingUser) {
      throw new BadRequestException('An account with this email address already exists. Please try logging in instead.');
    }

    // Check username requirement and uniqueness
    if (!userData.username || userData.username.trim().length === 0) {
      throw new BadRequestException('Username is required.');
    }

    // Validate username format (only lowercase letters, numbers, underscores)
    if (!/^[a-z0-9_]+$/.test(userData.username.trim())) {
      throw new BadRequestException('Username can only contain lowercase letters, numbers, and underscores.');
    }

    // Validate username length
    if (userData.username.trim().length < 3) {
      throw new BadRequestException('Username must be at least 3 characters long.');
    }

    const existingUsername = await this.userModel.findOne({ username: userData.username.trim() });
    if (existingUsername) {
      throw new BadRequestException('This username is already taken. Please choose a different username.');
    }

    if (!userData.password) {
      throw new BadRequestException('Password is required.');
    }

    if (userData.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long.');
    }

    if (!userData.email) {
      throw new BadRequestException('Email address is required.');
    }

    if (!userData.fullName || userData.fullName.trim().length === 0) {
      throw new BadRequestException('Full name is required.');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      throw new BadRequestException('Please enter a valid email address.');
    }

    try {
      // Create user - let the schema's pre-save hook handle password hashing
      const user = await this.userModel.create({
        ...userData,
        username: userData.username.trim().toLowerCase(), // Ensure username is lowercase and trimmed
        email: userData.email.toLowerCase(), // Ensure email is lowercase
        roles: userData.roles || [UserRole.Member],
        profileCompleted: true, // Mark profile as completed since username is now provided during registration
      });

      return this.generateTokens(user);
    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 11000) {
        // MongoDB duplicate key error
        const field = Object.keys(error.keyPattern)[0];
        if (field === 'email') {
          throw new BadRequestException('An account with this email address already exists.');
        } else if (field === 'username') {
          throw new BadRequestException('This username is already taken.');
        }
      }
      throw new BadRequestException('Registration failed. Please try again.');
    }
  }

  async generatePasswordResetToken(email: string): Promise<void> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Don't reveal if user exists or not
      return;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash token before storing (for security)
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    
    // Set reset token and expiration (1 hour from now)
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send email with reset link
    await this.emailService.sendPasswordResetEmail(user.email, resetToken);
  }

  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    // Hash the token to compare with stored version
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Find user with valid reset token
    const user = await this.userModel.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() }
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Update password - let the pre-save hook handle hashing
    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Send confirmation email
    await this.emailService.sendPasswordChangeConfirmation(user.email);
  }

  async resetPassword(email: string, newPassword: string) {
    console.log('resetPassword called with email:', email);
    try {
      const user = await this.userModel.findOne({ email: email.toLowerCase() });
      console.log('User found:', !!user);
      
      if (!user) {
        console.log('User not found for email:', email);
        throw new UnauthorizedException('User not found');
      }

      console.log('Updating password for user:', user.email);
      console.log('Current user roles:', user.roles);
      
      // Fix any invalid roles
      if (user.roles && user.roles.some(role => !Object.values(UserRole).includes(role as UserRole))) {
        console.log('Fixing invalid roles');
        user.roles = [UserRole.Member]; // Set to default valid role
      }
      
      // Update the user's password - let the pre-save hook handle hashing
      user.password = newPassword;
      await user.save();
      console.log('Password updated successfully');

      return this.generateTokens(user);
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  }

  async checkUsernameAvailability(username: string): Promise<boolean> {
    const existingUser = await this.userModel.findOne({ 
      username: username.toLowerCase() 
    });
    return !existingUser;
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const user = await this.userModel.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  // Firebase Authentication Methods
  async findUserByFirebaseUID(firebaseUID: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ firebaseUID });
  }

  async createFirebaseUser(userData: {
    firebaseUID: string;
    email: string | null;
    fullName: string;
    username?: string;
    phoneNumber?: string | null;
    authMethod: string;
    emailVerified: boolean;
    roles: UserRole[];
    profileImage?: string | null;
  }): Promise<UserDocument> {
    try {
      // Generate username if not provided
      if (!userData.username && userData.fullName) {
        userData.username = await this.generateUsernameFromName(userData.fullName);
      }

      const user = new this.userModel({
        firebaseUID: userData.firebaseUID,
        email: userData.email,
        fullName: userData.fullName,
        username: userData.username,
        phoneNumber: userData.phoneNumber,
        authMethod: userData.authMethod,
        isEmailVerified: userData.emailVerified,
        roles: userData.roles,
        profileImage: userData.profileImage,
        profileCompleted: false,
        // No password required for Firebase users
      });

      await user.save();
      return user;
    } catch (error: any) {
      if (error.code === 11000) {
        // Handle duplicate key errors
        if (error.keyPattern?.email) {
          throw new BadRequestException('Email already exists');
        }
        if (error.keyPattern?.username) {
          throw new BadRequestException('Username already exists');
        }
      }
      throw new BadRequestException('Failed to create user account');
    }
  }

  private async generateUsernameFromName(fullName: string): Promise<string> {
    // Clean the name: lowercase, remove special chars and extra spaces
    const cleanName = fullName.toLowerCase().replace(/[^a-z\s]/g, '').trim();
    const words = cleanName.split(' ').filter(word => word.length > 0);
    
    if (words.length === 0) {
      return 'user' + Math.floor(Math.random() * 1000);
    }
    
    let baseUsername: string;
    if (words.length === 1) {
      baseUsername = words[0];
    } else {
      baseUsername = words.join('');
    }
    
    // Check if username is available, if not add numbers
    let username = baseUsername;
    let counter = 0;
    
    while (await this.userModel.findOne({ username })) {
      username = baseUsername + counter;
      counter++;
    }
    
    return username;
  }

  async setWebPasswordForFirebaseUser(email: string, newPassword: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ 
      email: email.toLowerCase(),
      firebaseUID: { $exists: true }
    });
    
    if (!user) {
      throw new BadRequestException('Firebase user not found with this email');
    }
    
    if (user.password) {
      throw new BadRequestException('This account already has a web password set');
    }
    
    // Set password - the pre-save hook will hash it
    user.password = newPassword;
    await user.save();
    
    return user;
  }

  // Confirmation flow methods for passwordless web login
  async findUserByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() });
  }

  async sendWebLoginConfirmation(email: string): Promise<{ method: 'email' | 'sms'; phoneNumber?: string }> {
    const user = await this.userModel.findOne({ 
      email: email.toLowerCase(),
      firebaseUID: { $exists: true }
    });
    
    if (!user) {
      throw new BadRequestException('No Firebase account found with this email');
    }

    // Generate 6-digit confirmation code
    const confirmationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store confirmation code temporarily (in production, use Redis)
    user.passwordResetToken = confirmationCode;
    user.passwordResetExpires = expiresAt;
    await user.save();

    // Determine confirmation method based on auth type
    if (user.authMethod === 'phone' && user.phoneNumber) {
      // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
      console.log(`SMS confirmation code for ${user.phoneNumber}: ${confirmationCode}`);
      
      return {
        method: 'sms',
        phoneNumber: `****${user.phoneNumber.slice(-4)}`
      };
    } else {
      // Send email confirmation
      try {
        await this.emailService.sendWebLoginConfirmation(user.email, confirmationCode);
      } catch (error) {
        console.warn('Email service not available, code:', confirmationCode);
      }
      
      return { method: 'email' };
    }
  }

  async confirmWebLogin(email: string, confirmationCode: string, rememberMe?: boolean): Promise<{
    user: UserDocument;
    accessToken: string;
    refreshToken: string;
  }> {
    const user = await this.userModel.findOne({ 
      email: email.toLowerCase(),
      firebaseUID: { $exists: true },
      passwordResetToken: confirmationCode,
      passwordResetExpires: { $gt: new Date() }
    });
    
    if (!user) {
      throw new UnauthorizedException('Invalid or expired confirmation code');
    }

    // Clear confirmation code
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // Generate tokens with extended expiration if "remember me" is checked
    const tokenOptions = rememberMe ? {
      accessTokenExpiration: '24h',
      refreshTokenExpiration: '30d'
    } : undefined;

    const payload = {
      sub: user._id,
      email: user.email,
      roles: user.roles,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: tokenOptions?.accessTokenExpiration || this.configService.get<string>('JWT_ACCESS_EXPIRATION', '1h'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: tokenOptions?.refreshTokenExpiration || this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      }),
    ]);

    return {
      user,
      accessToken,
      refreshToken
    };
  }
} 