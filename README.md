# 🏆 Local Clubhouse - Community Tournament Platform

A comprehensive full-stack platform for local clubs to organize tournaments, manage events, and build communities.

## 📋 Project Status

**Status**: ✅ Modernized and functional  
**Last Updated**: September 2026

This project has been modernized with updated dependencies, fixed tests, and streamlined setup process.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB (local or Atlas)
- Redis (local or cloud)
- npm

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd local_clubhouse

# Install backend dependencies
cd backend
npm install --legacy-peer-deps
cp .env.example .env
# Edit .env with your configuration

# Install frontend dependencies  
cd ../frontend
npm install
cp .env.example .env
# Edit .env with your API URL

# Install mobile app dependencies
cd ../mobile-app
npm install
# Configure EXPO_PUBLIC_* environment variables

# Build and verify
cd ../backend && npm run build
cd ../frontend && npm run build
```

### Running the Application

#### Development Mode

```bash
# Terminal 1: Start MongoDB (if local)
mongod

# Terminal 2: Start Redis (if local)
redis-server

# Terminal 3: Start Backend
cd backend
npm run dev

# Terminal 4: Start Frontend
cd frontend
npm run dev

# Terminal 5: Start Mobile App (optional)
cd mobile-app
npm start
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/health
- Mobile App: Scan QR code with Expo Go app

## 🧪 Testing

```bash
# Backend tests (4 suites, 7 tests)
cd backend
npm test

# Frontend tests (1 suite, 2 tests)
cd frontend
npm test

# Mobile app tests
cd mobile-app
npm test
```

All tests are passing ✅

## 🔒 Security

### Recent Security Updates

**September 2026 - Expo SDK 57 Upgrade**
- Upgraded from Expo SDK 53 to 57.0.21
- Updated React Native 0.79.5 → 0.86.3
- Updated React 19.0.0 → 19.2.3
- Fixed all high/critical vulnerabilities in transitive dependencies

**Vulnerability Status**:
- ✅ Backend: 0 vulnerabilities
- ✅ Frontend: 0 vulnerabilities  
- ✅ Mobile App: 0 vulnerabilities

All security scans (npm audit, Trivy) pass with no high/critical issues.

## 🛠️ Technology Stack

### Backend
- **NestJS** 11.1.2 - Progressive Node.js framework
- **MongoDB** 7.8.6 with Mongoose ODM
- **Redis** 4.6.13 - Caching and sessions
- **JWT** - Authentication
- **Socket.io** 4.7.4 - Real-time features
- **AWS S3** - File storage (optional)
- **TypeScript** 5.0.4

### Frontend
- **React** 18.2.0 with TypeScript 5.7.2
- **Vite** 6.2.0 - Build tool and dev server
- **Tailwind CSS** 3.4.17 - Styling
- **React Query** 5.71.5 - Server state management
- **React Router** 7.4.0 - Routing
- **Socket.io Client** 4.8.1 - Real-time updates

### Mobile App
- **Expo SDK** 57.0.21 - React Native development platform
- **React Native** 0.86.3 - Cross-platform mobile framework
- **React** 19.2.3 - UI framework
- **Expo Router** 57.0.20 - File-based routing
- **React Query** 5.102.8 - Server state management
- **React Native Reanimated** 4.6.0 - Animations
- **React Native Gesture Handler** 3.2.1 - Touch interactions

## ✨ Key Features

### 🏆 Tournament Management
- Swiss Tournament System with advanced pairing algorithms
- Single Elimination brackets
- Real-time match updates and live scoring
- Player registration and seeding

### 🏪 Club Management
- Club creation and administration
- Member management with roles and permissions
- Event scheduling and RSVP system
- Real-time group chat

### 🤝 Sponsorship Platform
- Sponsor profiles and packages
- Collaboration request system
- Flexible sponsorship tiers
- Integration with events and tournaments

### 💬 Real-Time Communication
- Socket.io-based live chat
- Event-specific messaging
- Tournament discussion channels
- Notification system

## 📁 Project Structure

```
local_clubhouse/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── clubs/          # Club management
│   │   ├── events/         # Event system
│   │   ├── tournaments/    # Tournament engine
│   │   ├── websocket/      # Socket.io gateway
│   │   └── main.ts
│   ├── .env.example        # Environment template
│   └── package.json
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Route components
│   │   ├── services/      # API services
│   │   ├── context/       # React contexts
│   │   └── types/         # TypeScript types
│   ├── .env.example       # Environment template
│   └── package.json
│
├── mobile-app/            # React Native/Expo mobile app
│   ├── app/              # Expo Router file-based routing
│   ├── components/       # Reusable mobile components
│   ├── services/         # API and utility services
│   ├── types/            # TypeScript type definitions
│   ├── app.json          # Expo configuration
│   └── package.json
│
└── docker-compose.yml     # Docker setup (optional)
```

## ⚙️ Configuration

### Backend Environment Variables

Create `backend/.env`:

```env
# Database
MONGODB_URI=mongodb://localhost:27017/local-clubhouse

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secrets (change in production!)
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret

# Server
PORT=3001
NODE_ENV=development

# CORS
FRONTEND_URL=http://localhost:5173

# Optional: AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=

# Optional: SendGrid
SENDGRID_API_KEY=
FROM_EMAIL=noreply@example.com
```

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=http://localhost:3001
VITE_NODE_ENV=development
```

## 🔒 Security

- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Rate limiting with Throttler
- CORS configuration
- Password hashing with bcrypt
- Environment variable protection

## 🚢 Deployment

### Backend
- Build: `npm run build`
- Production: `npm run start:prod`
- Recommended: PM2 or Docker for process management

### Frontend
- Build: `npm run build`
- Output: `dist/` directory
- Deploy to: Vercel, Netlify, or any static hosting

## 📚 Additional Documentation

- [Development Guide](./docs/development/README-FULLSTACK.md)
- [Feature Documentation](./docs/features/)
- [Deployment Guide](./docs/deployment/DEPLOYMENT_GUIDE.md)
- [Quick Start Guide](./QUICK_START.md)

## 🤝 Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## 🐛 Known Issues

- Docker Compose configuration needs updating for modern setup
- Some mobile app components are in development
- Advanced tournament features may need additional testing

## 📝 Recent Changes (Modernization)

### September 2026 Modernization
- ✅ Updated all dependencies to latest compatible versions
- ✅ Fixed TypeScript compilation errors
- ✅ Resolved security vulnerabilities in dependencies
- ✅ Simplified test suite and ensured all tests pass
- ✅ Added environment configuration templates
- ✅ Updated documentation with clear setup instructions

## 📄 License

This project is [MIT licensed](LICENSE).

---

**Made with ❤️ for local communities**
