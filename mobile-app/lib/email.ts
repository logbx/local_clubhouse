import nodemailer from 'nodemailer';
import { Platform } from 'react-native';

// Only initialize on web platform
const transporter = Platform.OS === 'web' ? nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
}) : null;

export async function sendWelcomeEmail(email: string, name: string) {
  if (!transporter || Platform.OS !== 'web') {
    console.log('Email sending skipped on mobile platform');
    return;
  }

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Universal App'}" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
    to: email,
    subject: 'Welcome to Universal App! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0ea5e9; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background-color: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Universal App!</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              <p>Thanks for joining Universal App! We're excited to have you on board.</p>
              <p>With your new account, you can:</p>
              <ul>
                <li>Create and join clubs</li>
                <li>Organize and attend events</li>
                <li>Participate in tournaments</li>
                <li>Connect with other members</li>
              </ul>
              <p>Get started by exploring the app and joining your first club!</p>
              <a href="${process.env.APP_URL || 'http://localhost:8081'}" class="button">Open App</a>
              <p style="margin-top: 30px;">If you have any questions, feel free to reach out to our support team.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Universal App. All rights reserved.</p>
              <p>You received this email because you signed up for Universal App.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Welcome email sent to:', email);
  } catch (error) {
    console.error('Failed to send welcome email:', error);
    throw error;
  }
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  if (!transporter || Platform.OS !== 'web') {
    return;
  }

  const resetUrl = `${process.env.APP_URL || 'http://localhost:8081'}/reset-password?token=${resetToken}`;

  const mailOptions = {
    from: `"${process.env.APP_NAME || 'Universal App'}" <${process.env.SMTP_FROM || 'noreply@example.com'}>`,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #ef4444; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background-color: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>You requested to reset your password. Click the button below to create a new password:</p>
              <a href="${resetUrl}" class="button">Reset Password</a>
              <p style="margin-top: 30px;">This link will expire in 1 hour for security reasons.</p>
              <p>If you didn't request this, please ignore this email. Your password won't be changed.</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} Universal App. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Password reset email sent to:', email);
  } catch (error) {
    console.error('Failed to send password reset email:', error);
    throw error;
  }
}