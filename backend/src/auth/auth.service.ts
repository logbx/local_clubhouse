import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';
import * as bcryptjs from 'bcryptjs';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { RegisterDto } from './dto/auth.dto';
import { UserService } from '../services/user.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async generateTokens(user: UserDocument) {
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
    
    // Find user
    const user = await this.userModel.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    console.log('Login attempt details:', {
      identifier,
      userFound: !!user,
      hasPassword: user?.password ? 'Yes' : 'No',
      userEmail: user?.email,
      userId: user?._id,
      allFields: user ? Object.keys(user.toObject()) : []
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.password) {
      console.log('Password field is missing from user document');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Use the schema's comparePassword method
    try {
      const isPasswordValid = await user.comparePassword(password);
      console.log('Password comparison details:', {
        inputPassword: password,
        isValid: isPasswordValid
      });

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid credentials');
      }
    } catch (error) {
      console.error('Error comparing passwords:', error);
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.generateTokens(user);
  }

  async register(userData: Partial<User>) {
    // Check email uniqueness
    const existingUser = await this.userModel.findOne({ email: userData.email });
    if (existingUser) {
      throw new UnauthorizedException('Email already registered');
    }

    // Check username uniqueness only if username is provided
    if (userData.username) {
      const existingUsername = await this.userModel.findOne({ username: userData.username });
      if (existingUsername) {
        throw new UnauthorizedException('Username already taken');
      }

      // Validate username format (only lowercase letters, numbers, underscores)
      if (!/^[a-z0-9_]+$/.test(userData.username)) {
        throw new UnauthorizedException('Username can only contain lowercase letters, numbers, and underscores');
      }
    }

    if (!userData.password) {
      throw new UnauthorizedException('Password is required');
    }

    // Create user - let the schema's pre-save hook handle password hashing
    const user = await this.userModel.create({
      ...userData,
      roles: userData.roles || [UserRole.Member],
    });

    return this.generateTokens(user);
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
    await this.sendPasswordResetEmail(user.email, resetToken);
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
  }

  private async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // For now, we'll log the reset link instead of sending an actual email
    // In production, you would use a service like SendGrid, Mailgun, or AWS SES
    
    const clientUrl = this.configService.get<string>('CLIENT_URL', 'http://localhost:5173');
    const resetLink = `${clientUrl}/reset-password?token=${token}`;
    
    console.log('='.repeat(80));
    console.log('📧 PASSWORD RESET EMAIL');
    console.log('='.repeat(80));
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your Password - Local Clubhouse`);
    console.log('');
    console.log('Hello,');
    console.log('');
    console.log('You have requested to reset your password. Please click the link below to reset your password:');
    console.log('');
    console.log(`${resetLink}`);
    console.log('');
    console.log('This link will expire in 1 hour.');
    console.log('');
    console.log('If you did not request this password reset, please ignore this email.');
    console.log('');
    console.log('Best regards,');
    console.log('Local Clubhouse Team');
    console.log('='.repeat(80));
    
    // TODO: Replace with actual email sending implementation
    // Example with SendGrid:
    /*
    // First, install: npm install @sendgrid/mail
    // Then import: import * as sgMail from '@sendgrid/mail';
    // 
    // Set API key in your .env file:
    // SENDGRID_API_KEY=your_sendgrid_api_key_here
    // 
    // In constructor, initialize:
    // sgMail.setApiKey(this.configService.get<string>('SENDGRID_API_KEY'));
    // 
    // Replace the console.log above with:
    const msg = {
      to: email,
      from: 'noreply@localclubhouse.com',
      subject: 'Reset Your Password - Local Clubhouse',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4F46E5;">Reset Your Password</h2>
          <p>You have requested to reset your password. Please click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link in your browser:</p>
          <p style="word-break: break-all; color: #6B7280;">${resetLink}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you did not request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
          <p style="color: #6B7280; font-size: 12px;">
            Best regards,<br>
            Local Clubhouse Team
          </p>
        </div>
      `,
    };
    await sgMail.send(msg);
    */
    
    // Example with Nodemailer (SMTP):
    /*
    // First, install: npm install nodemailer @types/nodemailer
    // Then import: import * as nodemailer from 'nodemailer';
    // 
    // Create transporter in constructor:
    // const transporter = nodemailer.createTransporter({
    //   host: 'smtp.gmail.com', // or your SMTP host
    //   port: 587,
    //   secure: false,
    //   auth: {
    //     user: this.configService.get<string>('EMAIL_USER'),
    //     pass: this.configService.get<string>('EMAIL_PASS'),
    //   },
    // });
    // 
    // Send email:
    // await transporter.sendMail({
    //   from: '"Local Clubhouse" <noreply@localclubhouse.com>',
    //   to: email,
    //   subject: 'Reset Your Password - Local Clubhouse',
    //   html: `... same HTML as SendGrid example above ...`,
    // });
    */
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
} 