# Forgot Password Feature Setup Guide

This guide explains how to set up and use the forgot password feature with email verification for your Local Clubhouse application.

## 🔐 Features Implemented

- **Secure Token Generation**: Cryptographically secure password reset tokens
- **Email Integration**: SendGrid integration with fallback to console logging
- **Token Expiration**: 1-hour expiry for security
- **Frontend Components**: Beautiful UI for forgot password and reset password flows
- **Security Best Practices**: Hashed tokens, rate limiting, and user enumeration protection

## 📧 Email Service Setup

### Option 1: SendGrid (Recommended for Production)

1. **Create a SendGrid Account**
   - Sign up at [sendgrid.com](https://sendgrid.com)
   - Verify your email address
   - Complete the setup process

2. **Get Your API Key**
   - Go to Settings → API Keys
   - Create a new API key with "Full Access" permissions
   - Copy the API key (you'll only see it once)

3. **Configure Environment Variables**
   ```bash
   # In your .env file
   SENDGRID_API_KEY=your-sendgrid-api-key-here
   FROM_EMAIL=noreply@yourdomain.com
   FRONTEND_URL=http://localhost:5173  # or your production URL
   ```

4. **Verify Sender Identity**
   - Go to Settings → Sender Authentication
   - Verify a single sender email address OR
   - Set up domain authentication (recommended for production)

### Option 2: Development Mode (Console Logging)

If you don't set up SendGrid, the system will automatically fall back to console logging for development:

```bash
# Just set the frontend URL
FRONTEND_URL=http://localhost:5173
```

## 🚀 Backend Setup

### 1. Install Dependencies

The required dependencies are already installed:
- `@sendgrid/mail` - SendGrid email service
- `crypto` - For secure token generation (built-in Node.js module)

### 2. Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration
SENDGRID_API_KEY=your-sendgrid-api-key-here
FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:5173

# JWT secrets (if not already set)
JWT_ACCESS_SECRET=your-super-secret-jwt-access-key
JWT_REFRESH_SECRET=your-super-secret-jwt-refresh-key
```

### 3. Database Schema

The user schema already includes the required fields:
- `passwordResetToken?: string` - Hashed reset token
- `passwordResetExpires?: Date` - Token expiration time

## 🎨 Frontend Implementation

### Routes Added

The following routes are already configured:

```typescript
// In App.tsx
<Route path="/forgot-password" element={<ForgotPasswordPage />} />
<Route path="/reset-password" element={<ResetPasswordPage />} />
```

### Components Created

1. **ForgotPasswordPage** (`/forgot-password`)
   - Email input form
   - Success/error message handling
   - Dark mode support
   - Loading states

2. **ResetPasswordPage** (`/reset-password?token=...`)
   - Password reset form with confirmation
   - Token validation
   - Success confirmation with auto-redirect
   - Error handling for expired/invalid tokens

### Login Page Integration

The login page already includes a "Forgot your password?" link that directs to `/forgot-password`.

## 🔄 User Flow

### 1. Request Password Reset

1. User clicks "Forgot your password?" on login page
2. User enters their email address
3. System generates secure reset token
4. Email sent with reset link (or logged to console in dev mode)
5. User receives confirmation message

### 2. Reset Password

1. User clicks link in email (format: `/reset-password?token=...`)
2. User enters new password and confirmation
3. System validates token and updates password
4. Confirmation email sent
5. User redirected to login page

## 🔧 API Endpoints

### POST `/auth/forgot-password`

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

### POST `/auth/reset-password`

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "newSecurePassword123"
}
```

**Response:**
```json
{
  "message": "Password has been reset successfully. You can now login with your new password."
}
```

## 🛡️ Security Features

### 1. Token Security
- Tokens are hashed before storage (SHA-256)
- 1-hour expiration time
- Cryptographically secure random generation

### 2. User Enumeration Protection
- Same response whether email exists or not
- Prevents attackers from discovering valid email addresses

### 3. Rate Limiting
- Built-in throttling on auth endpoints
- Prevents brute force attacks

### 4. Email Validation
- Server-side email format validation
- Client-side validation for better UX

## 🧪 Testing

### 1. Development Testing

Without SendGrid configured, you'll see email content logged to the console:

```bash
[DEV] Password reset email for user@example.com
[DEV] Reset URL: http://localhost:5173/reset-password?token=...
```

### 2. Production Testing

1. Set up SendGrid with a verified sender
2. Test with a real email address
3. Check spam folder if email doesn't arrive
4. Verify all links work correctly

## 📧 Email Templates

The system sends three types of emails:

### 1. Password Reset Request
- Subject: "Reset Your Password - Local Clubhouse"
- Contains reset link with 1-hour expiry notice
- Professional HTML template with inline CSS

### 2. Password Change Confirmation
- Subject: "Password Changed Successfully - Local Clubhouse"
- Confirms password was changed
- Security notice if change was unauthorized

### 3. Email Verification (if enabled)
- Subject: "Verify Your Email - Local Clubhouse"
- Welcome message with verification link

## 🚨 Troubleshooting

### Common Issues

1. **Emails not sending**
   - Check SendGrid API key is correct
   - Verify sender email is authenticated
   - Check console for error messages

2. **Invalid token errors**
   - Tokens expire after 1 hour
   - Tokens are single-use only
   - Check URL parameters are correct

3. **Frontend routing issues**
   - Ensure routes are properly configured
   - Check for typos in route paths
   - Verify components are imported correctly

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed console logs for email operations.

## 🔄 Customization

### 1. Email Templates

Edit `src/services/email.service.ts` to customize:
- Email subject lines
- HTML templates
- Styling and branding
- Additional email types

### 2. Token Expiration

Modify token expiry in `src/auth/auth.service.ts`:
```typescript
// Change from 1 hour to 30 minutes
user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
```

### 3. UI Styling

Frontend components use Tailwind CSS classes. Customize in:
- `src/pages/ForgotPasswordPage.tsx`
- `src/pages/ResetPasswordPage.tsx`

## 📱 Mobile Considerations

The UI is responsive and works well on mobile devices:
- Touch-friendly button sizes
- Responsive breakpoints
- Mobile-optimized typography
- Accessible form elements

## 🔐 Production Checklist

Before deploying to production:

- [ ] Set up SendGrid account and verify domain
- [ ] Configure all environment variables
- [ ] Set strong JWT secrets
- [ ] Enable HTTPS for all email links
- [ ] Test email delivery thoroughly
- [ ] Set up monitoring for failed emails
- [ ] Configure proper error logging
- [ ] Test on multiple email providers
- [ ] Verify mobile responsiveness
- [ ] Set up email analytics (optional)

## 📞 Support

If you encounter issues:

1. Check the console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test with a different email address
4. Check SendGrid dashboard for delivery status
5. Review the troubleshooting section above

This implementation provides a secure, user-friendly password reset system that follows modern security best practices while maintaining a great user experience. 