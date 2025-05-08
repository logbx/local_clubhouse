import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {}

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    
    console.log(`Sending verification email to ${email}`);
    console.log(`Verification URL: ${verificationUrl}`);
    
    // In a production environment, we would send an actual email
    // using a service like SendGrid, Mailgun, or AWS SES
    return;
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    console.log(`Sending password reset email to ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    
    // In a production environment, we would send an actual email
    return;
  }
} 