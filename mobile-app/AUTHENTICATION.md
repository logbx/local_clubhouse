# Universal Authentication System

This document describes the complete authentication system implemented for the Universal App using Expo Router's API routes.

## 🔧 Architecture Overview

### Backend (API Routes)
- **JWT-based authentication** with access/refresh token pattern
- **Rate limiting** to prevent abuse
- **Token rotation** for enhanced security
- **Platform-aware features** (cookies for web, secure storage for mobile)
- **Email notifications** for web users

### Frontend (Universal Components)
- **Platform-specific storage** (SecureStore on mobile, cookies on web)
- **Biometric authentication** support on mobile
- **Multi-step registration** with validation
- **Real-time password strength** indicators
- **Remember me** functionality

## 🛡️ Security Features

### Token Management
- **Access tokens**: 15-minute expiry for security
- **Refresh tokens**: 7-30 days based on "remember me" setting
- **Token rotation**: 10% chance to rotate refresh tokens
- **Secure storage**: Platform-specific secure storage
- **Automatic cleanup**: Old tokens are removed

### Rate Limiting
- **Login attempts**: 5 per 15 minutes
- **Registration**: 3 per hour
- **Per-IP basis** with automatic cleanup

### Password Security
- **Strong requirements**: 8+ chars, uppercase, lowercase, numbers
- **Bcrypt hashing** with salt rounds
- **Real-time strength** feedback during registration

## 📱 Platform-Specific Features

### Web Platform
- **HttpOnly cookies** for refresh tokens
- **CORS support** for cross-origin requests
- **Welcome emails** sent automatically
- **Browser-based** password managers support

### Mobile Platform (iOS/Android)
- **Expo SecureStore** for token storage
- **Biometric authentication** (Touch ID, Face ID, Fingerprint)
- **Device fingerprinting** for security
- **Background app** state handling

## 🔗 API Endpoints

### Authentication Routes

#### `POST /api/auth/login`
```typescript
// Request
{
  email: string;
  password: string;
  rememberMe?: boolean;
  deviceInfo?: string;
}

// Response
{
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### `POST /api/auth/register`
```typescript
// Request
{
  name: string;
  email: string;
  password: string;
  acceptTerms: boolean;
  newsletter?: boolean;
  deviceInfo?: string;
}

// Response
{
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  message: string;
}
```

#### `POST /api/auth/refresh`
```typescript
// Request
{
  refreshToken?: string; // Optional if using cookies
}

// Response
{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### `GET /api/auth/profile`
```typescript
// Headers: Authorization: Bearer <accessToken>

// Response
{
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    bio?: string;
    emailVerified: boolean;
    preferences: UserPreferences;
    createdAt: string;
    updatedAt: string;
    lastLoginAt?: string;
  }
}
```

#### `PUT /api/auth/profile`
```typescript
// Headers: Authorization: Bearer <accessToken>

// Request
{
  name?: string;
  bio?: string;
  avatar?: string;
  preferences?: Partial<UserPreferences>;
}

// Response
{
  user: User;
  message: string;
}
```

#### `DELETE /api/auth/refresh`
```typescript
// Request
{
  refreshToken: string;
}

// Response
{
  message: string;
}
```

## 🎨 UI Components

### Login Screen Features
- **Email/password inputs** with validation
- **Show/hide password** toggle
- **Remember me** switch
- **Biometric login** button (mobile only)
- **Forgot password** link
- **Loading states** and error handling

### Registration Screen Features
- **3-step process**: Basic info → Password → Terms
- **Progress indicator** showing current step
- **Real-time validation** per step
- **Password strength meter**
- **Terms acceptance** with links
- **Newsletter opt-in**
- **Back/Next navigation**

## 🔧 Configuration

### Environment Variables
```env
# JWT Configuration
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Database
MONGODB_URI=mongodb://localhost:27017/universal-app

# Email (Web only)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourapp.com

# App Configuration
APP_NAME=Universal App
APP_URL=http://localhost:8081
```

### Dependencies
```json
{
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "mongoose": "^8.0.4",
  "expo-local-authentication": "~13.8.0",
  "expo-secure-store": "~12.8.1",
  "expo-crypto": "~12.8.1",
  "nodemailer": "^6.9.8",
  "@react-native-async-storage/async-storage": "~1.21.0"
}
```

## 🚀 Usage Examples

### Basic Login
```typescript
const { login } = useAuth();

await login('user@example.com', 'password123', true);
```

### Registration
```typescript
const { register } = useAuth();

await register(
  'John Doe',
  'john@example.com', 
  'SecurePass123',
  true, // acceptTerms
  false // newsletter
);
```

### Profile Update
```typescript
const { updateProfile } = useAuth();

await updateProfile({
  name: 'Jane Doe',
  bio: 'Software developer',
  preferences: {
    theme: 'dark',
    notifications: true
  }
});
```

### Biometric Login (Mobile)
```typescript
// Automatically available when:
// 1. User has previously logged in with "remember me"
// 2. Device supports biometrics
// 3. User has enrolled biometrics

// Button appears automatically in login screen
```

## 🔍 Error Handling

### Common Error Responses
- **400**: Validation failed
- **401**: Invalid credentials or expired token
- **429**: Rate limit exceeded
- **500**: Internal server error

### Client-Side Handling
```typescript
try {
  await login(email, password);
} catch (error) {
  if (error.response?.status === 401) {
    // Show invalid credentials message
  } else if (error.response?.status === 429) {
    // Show rate limit message
  } else {
    // Show generic error message
  }
}
```

## 🧪 Testing

### Manual Testing
1. **Registration**: Create account with various input combinations
2. **Login**: Test with valid/invalid credentials
3. **Biometrics**: Test biometric login on physical devices
4. **Token refresh**: Wait for token expiry and test auto-refresh
5. **Rate limiting**: Exceed limits and verify blocking
6. **Cross-platform**: Test same account on web and mobile

### Automated Testing
```bash
# Run authentication tests
npm run test -- --testPathPattern=auth

# Test API endpoints
npm run test:api -- auth

# Test components
npm run test:components -- auth
```

## 🔄 Token Refresh Flow

1. **Automatic refresh** when access token expires
2. **Retry failed requests** with new token
3. **Logout on refresh failure**
4. **Background refresh** for active sessions
5. **Token rotation** for enhanced security

## 📊 Security Monitoring

### Recommended Monitoring
- **Failed login attempts** per IP/user
- **Token refresh frequency**
- **Unusual device patterns**
- **Registration spikes**
- **Email delivery rates**

### Database Indexes
```javascript
// User collection
{ email: 1 }                    // Unique login lookup
{ 'refreshTokens.token': 1 }    // Token validation
{ createdAt: 1 }               // Registration analytics
{ lastLoginAt: 1 }             // Activity tracking
```

## 🚨 Production Deployment

### Pre-deployment Checklist
- [ ] Environment variables configured
- [ ] HTTPS enabled for production
- [ ] Email service configured and tested
- [ ] Database indexes created
- [ ] Rate limiting configured
- [ ] Error monitoring setup
- [ ] Backup strategy implemented

### Scaling Considerations
- **Redis** for rate limiting in multi-instance deployments
- **Database connection pooling**
- **CDN** for static assets
- **Load balancer** session affinity
- **Email queue** for high-volume registration

This authentication system provides a secure, scalable foundation for universal apps with platform-specific optimizations while maintaining a consistent user experience across web and mobile platforms.