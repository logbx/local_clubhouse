import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private sgMail: any;

  constructor(private configService: ConfigService) {
    // Only initialize SendGrid if API key is provided
    const sendGridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
    if (sendGridApiKey) {
      try {
        this.sgMail = require('@sendgrid/mail');
        this.sgMail.setApiKey(sendGridApiKey);
        console.log('SendGrid initialized successfully');
      } catch (error) {
        console.warn('SendGrid not available, falling back to console logging');
        this.sgMail = null;
      }
    } else {
      console.log('SENDGRID_API_KEY not found, using console logging for emails');
      this.sgMail = null;
    }
  }

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;
    
    if (this.sgMail) {
      try {
        await this.sgMail.send({
          to: email,
          from: this.configService.get<string>('FROM_EMAIL', 'noreply@localclubhouse.com'),
          subject: 'Verify Your Email - Local Clubhouse',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Welcome to Local Clubhouse!</h2>
              <p>Please verify your email address by clicking the link below:</p>
              <a href="${verificationUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
              <p>If you can't click the button, copy and paste this link into your browser:</p>
              <p><a href="${verificationUrl}">${verificationUrl}</a></p>
              <p>This link will expire in 24 hours.</p>
            </div>
          `,
        });
        console.log(`Verification email sent to ${email}`);
      } catch (error) {
        console.error('Failed to send verification email:', error);
        throw new Error('Failed to send verification email');
      }
    } else {
      console.log(`[DEV] Verification email for ${email}`);
      console.log(`[DEV] Verification URL: ${verificationUrl}`);
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;
    
    if (this.sgMail) {
      try {
        await this.sgMail.send({
          to: email,
          from: this.configService.get<string>('FROM_EMAIL', 'noreply@localclubhouse.com'),
          subject: 'Reset Your Password - Local Clubhouse',
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8fafc;">
              <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
                <h2 style="color: #2563eb; font-size: 24px; margin-bottom: 16px; text-align: center;">Password Reset Request</h2>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  We received a request to reset your password for your Local Clubhouse account.
                </p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                  Click the button below to reset your password:
                </p>
                
                <!-- Mobile-optimized button -->
                <div style="text-align: center; margin: 32px 0;">
                  <a href="${resetUrl}" 
                     style="
                       background: #dc2626; 
                       color: white; 
                       padding: 16px 32px; 
                       text-decoration: none; 
                       border-radius: 8px; 
                       display: inline-block; 
                       font-weight: 600; 
                       font-size: 16px;
                       min-width: 200px;
                       text-align: center;
                       box-shadow: 0 2px 4px rgba(220, 38, 38, 0.3);
                       transition: all 0.2s ease;
                     "
                     target="_blank">
                    Reset Password
                  </a>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 16px;">
                  If the button doesn't work, copy and paste this link into your mobile browser:
                </p>
                <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin-bottom: 24px; word-break: break-all;">
                  <a href="${resetUrl}" style="color: #2563eb; font-size: 14px; text-decoration: none;" target="_blank">${resetUrl}</a>
                </div>
                
                <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-bottom: 24px;">
                  <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 600;">
                    ⚠️ This link will expire in 1 hour for security reasons.
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px; line-height: 1.5; margin-bottom: 0;">
                  If you didn't request this password reset, please ignore this email or contact our support team if you have concerns.
                </p>
              </div>
              
              <div style="text-align: center; margin-top: 20px;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                  This is an automated email from Local Clubhouse. Please do not reply to this email.
                </p>
              </div>
            </div>
          `,
        });
        console.log(`Password reset email sent to ${email}`);
      } catch (error) {
        console.error('Failed to send password reset email:', error);
        throw new Error('Failed to send password reset email');
      }
    } else {
      console.log(`[DEV] Password reset email for ${email}`);
      console.log(`[DEV] Reset URL: ${resetUrl}`);
    }
  }

  async sendPasswordChangeConfirmation(email: string): Promise<void> {
    if (this.sgMail) {
      try {
        await this.sgMail.send({
          to: email,
          from: this.configService.get<string>('FROM_EMAIL', 'noreply@localclubhouse.com'),
          subject: 'Password Changed Successfully - Local Clubhouse',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">Password Changed Successfully</h2>
              <p>Your password has been successfully changed for your Local Clubhouse account.</p>
              <p>If you didn't make this change, please contact our support team immediately.</p>
              <hr style="margin: 20px 0;">
              <small style="color: #666;">
                This is an automated email from Local Clubhouse. Please do not reply to this email.
              </small>
            </div>
          `,
        });
        console.log(`Password change confirmation sent to ${email}`);
      } catch (error) {
        console.error('Failed to send password change confirmation:', error);
        // Don't throw here as this is not critical
      }
    } else {
      console.log(`[DEV] Password change confirmation for ${email}`);
    }
  }
} 