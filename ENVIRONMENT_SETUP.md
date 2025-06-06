# Environment Configuration Guide

This application supports both development and production environments with separate configuration files.

## Environment Files

### Backend
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables

### Frontend
- `.env.development` - Development environment variables (Vite)
- `.env.production` - Production environment variables (Vite)

## How It Works

### Backend (NestJS)
The backend automatically loads the correct environment file based on the `NODE_ENV` variable:
- `NODE_ENV=development` → loads `.env.development`
- `NODE_ENV=production` → loads `.env.production`
- Falls back to `.env` if specific environment file doesn't exist

### Frontend (Vite)
The frontend loads environment files based on the `--mode` flag:
- `--mode development` → loads `.env.development`
- `--mode production` → loads `.env.production`

## Running the Applications

### Development Mode
```bash
# Backend
cd backend
npm run start:dev  # Sets NODE_ENV=development

# Frontend
cd frontend
npm run dev        # Sets mode=development
```

### Production Mode
```bash
# Backend
cd backend
npm run build:prod  # Build with NODE_ENV=production
npm run start:prod  # Run with NODE_ENV=production

# Frontend
cd frontend
npm run build:prod  # Build with mode=production
npm run preview:prod # Preview with mode=production
```

## Environment Variables

### Backend (.env.development / .env.production)
```bash
# Server Configuration
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:5173

# MongoDB
MONGODB_URI=mongodb://...

# JWT Configuration
JWT_ACCESS_SECRET=...
JWT_REFRESH_SECRET=...

# Redis
REDIS_URL=redis://localhost:6379/0

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
AWS_S3_BUCKET_NAME=...

# CORS
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env.development / .env.production)
```bash
VITE_API_URL=http://localhost:3001/api
VITE_WS_URL=ws://localhost:3001
VITE_APP_NAME=Local Clubhouse (Dev)
VITE_MODE=development
VITE_AWS_REGION=us-east-2
VITE_AWS_S3_BUCKET=localclubhouse-images
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_DEBUG_MODE=true
```

## Environment Switching Script

Use the provided script to easily switch environments:

```bash
# Set development environment
./scripts/set-env.sh development

# Set production environment
./scripts/set-env.sh production
```

## Key Differences Between Environments

### Development
- Uses localhost URLs
- Debug mode enabled
- Analytics disabled
- Detailed logging
- Redis database 0

### Production
- Uses production domain URLs
- Debug mode disabled
- Analytics enabled
- Minimal logging
- Redis database 1
- Optimized builds

## Troubleshooting

1. **Environment file not found**: Ensure `.env.development` and `.env.production` files exist in both `backend/` and `frontend/` directories.

2. **Wrong environment loaded**: Check that `NODE_ENV` is set correctly for backend and `--mode` flag is used for frontend.

3. **Environment variables not working**: 
   - Backend: Ensure variables don't have `VITE_` prefix
   - Frontend: Ensure variables have `VITE_` prefix

4. **WebSocket connection issues**: Verify `VITE_WS_URL` matches the backend server URL and protocol (ws:// for development, wss:// for production).

5. **API 404 errors (double /api/ in URL)**: 
   - Issue: URLs like `POST /api/api/auth/login` instead of `POST /api/auth/login`
   - Cause: `VITE_API_URL` includes `/api` suffix but endpoints also have `/api/` prefix
   - Solution: Set `VITE_API_URL=http://localhost:3001` (without `/api` suffix)
   - The endpoints in `src/config/api.ts` already include the `/api/` prefix

6. **Port already in use errors**: 
   - Backend: `pkill -f "ts-node-dev" && pkill -f "node.*3001"`
   - Frontend: `pkill -f "vite"` 