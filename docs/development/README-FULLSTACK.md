# 🚀 Full-Stack Web Development Environment

## Overview
This is the main development environment for the SaaS Local Clubhouse application, containing both the React frontend and NestJS backend.

## 🛠️ Technology Stack

### Frontend (React + Vite)
- **React** 18.2.0 with TypeScript 5.7.2
- **Vite** 6.2.0 for blazing fast development
- **Tailwind CSS** 3.4.17 with HeadlessUI components
- **React Query** (TanStack Query) 5.71.5 for server state
- **React Router DOM** 7.4.0 for routing
- **Socket.io Client** 4.8.1 for real-time features
- **React Hook Form** 7.56.0 for form handling

### Backend (NestJS)
- **NestJS** 11.1.2 with TypeScript 5.0.4
- **MongoDB** 7.8.6 with Mongoose ODM
- **Redis** 4.6.13 for caching and sessions
- **JWT** authentication with Passport
- **Socket.io** 4.7.4 for WebSocket connections
- **AWS S3** for file storage
- **SendGrid** for email services

## 🚀 Quick Start

### Prerequisites
```bash
# Required services
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- AWS S3 bucket (for file uploads)
```

### Initial Setup
```bash
# 1. Install dependencies for both frontend and backend
cd backend && npm install
cd ../frontend && npm install

# 2. Set up environment variables
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit the .env files with your configuration
```

### Environment Variables

#### Backend (.env)
```env
# Server
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/localclubhouse
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=your-bucket-name

# SendGrid
SENDGRID_API_KEY=your-sendgrid-key
SENDGRID_FROM_EMAIL=noreply@localclubhouse.com

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

#### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
VITE_APP_ENV=development
```

## 🏃‍♂️ Development Workflow

### Start All Services
```bash
# Terminal 1: Start MongoDB
mongod

# Terminal 2: Start Redis
redis-server

# Terminal 3: Start Backend
cd backend
npm run dev

# Terminal 4: Start Frontend
cd frontend
npm run dev
```

### Using Development Scripts
```bash
# Root directory convenience scripts
npm run dev:full-stack    # Starts both frontend and backend
npm run dev:frontend      # Frontend only
npm run dev:backend       # Backend only
```

## 📁 Project Structure

```
saas-app/
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/          # Route components
│   │   ├── services/       # API services
│   │   ├── hooks/          # Custom React hooks
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   ├── public/             # Static assets
│   └── vite.config.ts      # Vite configuration
│
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # Users module
│   │   ├── clubs/          # Clubs module
│   │   ├── events/         # Events module
│   │   ├── tournaments/    # Tournaments module
│   │   ├── sponsors/       # Sponsors module
│   │   ├── websocket/      # Socket.io gateway
│   │   └── main.ts         # Application entry
│   └── uploads/            # File upload directory
│
└── shared/                  # Shared types/utilities
    └── types/
```

## 🔧 Development Features

### API Development
- **Swagger Documentation**: http://localhost:3001/api-docs
- **API Endpoints**: http://localhost:3001/api/*
- **WebSocket Testing**: Use Socket.io client or Postman

### Database Management
```bash
# MongoDB commands
mongosh                      # Open MongoDB shell
use localclubhouse          # Switch to database

# Common queries
db.users.find()             # List all users
db.clubs.find()             # List all clubs
db.events.find()            # List all events
db.tournaments.find()       # List all tournaments
```

### Redis Cache Management
```bash
# Redis commands
redis-cli                    # Open Redis CLI
KEYS *                      # List all keys
FLUSHALL                    # Clear all cache (dev only!)
```

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm run test                # Run unit tests
npm run test:watch          # Watch mode
npm run test:cov            # Coverage report
npm run test:e2e            # E2E tests
```

### Frontend Testing
```bash
cd frontend
npm run test                # Run unit tests
npm run test:watch          # Watch mode
npm run test:coverage       # Coverage report
```

## 🔍 Debugging

### Backend Debugging
1. VS Code launch configuration is included
2. Set breakpoints in NestJS code
3. Press F5 to start debugging

### Frontend Debugging
1. Use React DevTools browser extension
2. Use React Query DevTools (included)
3. Browser DevTools for network inspection

## 🚀 Building for Production

### Frontend Build
```bash
cd frontend
npm run build               # Production build
npm run preview             # Preview production build
```

### Backend Build
```bash
cd backend
npm run build               # Compile TypeScript
npm run start:prod          # Run production build
```

## 📝 Common Development Tasks

### Adding a New API Endpoint
1. Create DTO in `backend/src/[module]/dto/`
2. Add method to service in `backend/src/[module]/[module].service.ts`
3. Add controller endpoint in `backend/src/[module]/[module].controller.ts`
4. Update frontend API service in `frontend/src/services/`
5. Add TypeScript types in `frontend/src/types/`

### Adding a New React Component
1. Create component in `frontend/src/components/`
2. Add TypeScript props interface
3. Use Tailwind CSS for styling
4. Add to page or parent component
5. Create tests in `__tests__` directory

### Database Schema Changes
1. Update Mongoose schema in `backend/src/[module]/schemas/`
2. Run any necessary migrations
3. Update TypeScript types in both frontend and backend
4. Test API endpoints

### Real-time Features (Socket.io)
1. Add event handler in `backend/src/websocket/websocket.gateway.ts`
2. Emit events from services
3. Listen for events in React components
4. Handle connection/disconnection gracefully

## 🐛 Troubleshooting

### Common Issues
1. **CORS errors**: Check FRONTEND_URL in backend .env
2. **MongoDB connection**: Ensure MongoDB is running
3. **Redis connection**: Ensure Redis is running
4. **Port conflicts**: Check if ports 3001/5173 are in use
5. **WebSocket issues**: Check firewall and proxy settings

### Useful Commands
```bash
# Kill processes on ports
lsof -ti:3001 | xargs kill -9  # Backend port
lsof -ti:5173 | xargs kill -9  # Frontend port

# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

## 🔗 Important Links
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- API Docs: http://localhost:3001/api-docs
- MongoDB: mongodb://localhost:27017/localclubhouse
- Redis: redis://localhost:6379

## 📚 Additional Resources
- [NestJS Documentation](https://docs.nestjs.com/)
- [React Documentation](https://react.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Socket.io Documentation](https://socket.io/docs/)