#!/bin/bash

# Production Start Script for Local Clubhouse
# This script builds and starts the application in production mode

echo "🚀 Starting Local Clubhouse in Production Mode..."

# Navigate to project root
cd "$(dirname "$0")/.."

# Stop any existing PM2 processes
echo "📋 Stopping existing PM2 processes..."
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true

# Build Backend
echo "🔨 Building backend..."
cd backend
NODE_ENV=production npm run build:prod
if [ $? -ne 0 ]; then
  echo "❌ Backend build failed!"
  exit 1
fi

# Build Frontend  
echo "🔨 Building frontend..."
cd ../frontend
NODE_ENV=production npm run build:prod
if [ $? -ne 0 ]; then
  echo "❌ Frontend build failed!"
  exit 1
fi

# Start Backend with PM2
echo "🖥️ Starting backend..."
cd ../backend
pm2 start dist/main.js --name "saas-backend" --env production

# Frontend is served by backend via ServeStaticModule
echo "✅ Production deployment complete!"
echo ""
echo "🌐 Application running at:"
echo "   - Backend API: http://localhost:3000/api"
echo "   - Frontend: http://localhost:3000"
echo "   - Health Check: http://localhost:3000/api/health"
echo ""
echo "📊 Monitor with: pm2 status"
echo "📝 View logs with: pm2 logs" 