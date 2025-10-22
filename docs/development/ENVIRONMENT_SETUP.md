# Environment Setup Guide

This guide explains how to run Local Clubhouse in different environments with proper environment variable configurations.

## 📁 Environment Files

### Backend Environment Files:
- `backend/.env.development` - Development configuration (localhost:3001)
- `backend/.env.production` - Production configuration (port 3000)

### Frontend Environment Files:
- `frontend/.env.development` - Development configuration (API: localhost:3001)
- `frontend/.env.production` - Production configuration (API: https://localclubhouse.com)

## 🏠 Development Mode (Localhost)

### Manual Commands:
```bash
# Start Backend (runs on localhost:3001)
cd saas-app/backend && npm run start:dev

# Start Frontend (runs on localhost:5173)  
cd saas-app/frontend && npm run dev
```

### Using Startup Script:
```bash
# Automated development startup
cd saas-app && ./scripts/start-development.sh
```

### Development URLs:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

### Environment Loading:
- Backend automatically loads `backend/.env.development`
- Frontend automatically loads `frontend/.env.development`
- Uses `VITE_API_URL=http://localhost:3001` for API calls

---

## 🌐 Production Mode (VPS/Server)

### Manual Commands:
```bash
# Build and Start Backend
cd saas-app/backend && npm run build:prod && npm run serve:prod

# Build Frontend (served by backend)
cd saas-app/frontend && npm run build:prod
```

### Using PM2 (Recommended for VPS):
```bash
# Build backend
cd saas-app/backend && npm run build:prod

# Build frontend  
cd saas-app/frontend && npm run build:prod

# Start with PM2
cd saas-app/backend && pm2 start dist/main.js --name saas-backend --env production
```

### Using Startup Script:
```bash
# Automated production startup
cd saas-app && ./scripts/start-production.sh
```

### Production URLs:
- **Frontend & API**: https://localclubhouse.com (port 3000)
- **Health Check**: https://localclubhouse.com/api/health

### Environment Loading:
- Backend automatically loads `backend/.env.production`
- Frontend uses build-time variables from `frontend/.env.production`
- Uses `VITE_API_URL=https://localclubhouse.com` for API calls

---

## 🚀 VPS Deployment Workflow

### Initial Setup:
```bash
# SSH into VPS
ssh root@62.72.26.151

# Navigate to project
cd ~/saas-app

# Pull latest changes
git pull origin main
```

### Deploy Latest Changes:
```bash
# SSH into VPS
ssh root@62.72.26.151

# Update code
cd ~/saas-app && git pull origin main

# Run production startup script
./scripts/start-production.sh
```

### Manual VPS Commands:
```bash
# Build and start manually
cd ~/saas-app/backend && npm run build:prod
cd ~/saas-app/frontend && npm run build:prod

# Start with PM2
cd ~/saas-app/backend && pm2 start dist/main.js --name saas-backend --env production

# Monitor
pm2 status
pm2 logs saas-backend
```

---

## 📊 Available npm Scripts

### Backend Scripts:
- `npm run start:dev` - Start development server (uses .env.development)
- `npm run start:prod` - Start production server (uses .env.production)
- `npm run build:dev` - Build for development
- `npm run build:prod` - Build for production
- `npm run serve:prod` - Start built production server

### Frontend Scripts:
- `npm run dev` - Start development server (uses .env.development)
- `npm run build:dev` - Build for development
- `npm run build:prod` - Build for production  
- `npm run serve:prod` - Serve built production files

---

## 🔧 Environment Variables

### Development (.env.development):
```bash
# Backend
PORT=3001
CLIENT_URL=http://localhost:5173

# Frontend  
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

### Production (.env.production):
```bash
# Backend
PORT=3000
CLIENT_URL=https://localclubhouse.com

# Frontend
VITE_API_URL=https://localclubhouse.com  
VITE_WS_URL=wss://localclubhouse.com
```

---

## 🐛 Troubleshooting

### Port Conflicts:
- Development: Backend (3001), Frontend (5173)
- Production: Everything on port 3000 (backend serves frontend)

### Environment Issues:
- Check `NODE_ENV` is set correctly
- Verify `.env.development` vs `.env.production` files exist
- Frontend env vars must start with `VITE_`

### VPS Issues:
- Ensure PM2 is running: `pm2 status`
- Check logs: `pm2 logs saas-backend`
- Restart if needed: `pm2 restart saas-backend` 