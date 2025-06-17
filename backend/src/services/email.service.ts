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
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">Password Reset Request</h2>
              <p>We received a request to reset your password for your Local Clubhouse account.</p>
              <p>Click the button below to reset your password:</p>
              <a href="${resetUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
              <p>If you can't click the button, copy and paste this link into your browser:</p>
              <p><a href="${resetUrl}">${resetUrl}</a></p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request this password reset, please ignore this email.</p>
              <hr style="margin: 20px 0;">
              <small style="color: #666;">
                This is an automated email from Local Clubhouse. Please do not reply to this email.
              </small>
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