#!/bin/bash

# Production startup script for SaaS App
# This script should be run on the VPS to start the application in production mode

set -e

echo "🚀 Starting SaaS App in Production Mode..."

# Set production environment
export NODE_ENV=production

# Navigate to project directory
cd ~/saas-app

echo "📁 Current directory: $(pwd)"

# Kill any existing development processes
echo "🛑 Stopping development processes..."
pkill -f "npm run dev" || true
pkill -f "ts-node-dev" || true
pkill -f "vite --host" || true
pkill -f "@esbuild" || true

# Kill existing production processes (to restart fresh)
echo "🔄 Stopping existing production processes..."
pkill -f "node.*dist/main.js" || true
pm2 stop all || true
pm2 delete all || true

echo "🏗️  Building applications..."

# Build Backend
echo "Building backend..."
cd backend
npm ci --only=production
npm run build

# Build Frontend  
echo "Building frontend..."
cd ../frontend
npm ci --only=production
NODE_ENV=production npm run build

# Return to project root
cd ..

echo "🚀 Starting production servers..."

# Start backend with PM2 (production process manager)
cd backend
pm2 start dist/main.js --name "saas-backend" --env production

# Start frontend (if using PM2 to serve static files, or use nginx)
cd ../frontend
# Serve built frontend files (you might want to use nginx instead)
pm2 serve dist 3000 --name "saas-frontend" --spa

# Show PM2 status
pm2 list
pm2 logs --lines 10

echo "✅ Production deployment complete!"
echo "🌐 Backend should be running on your configured port"
echo "🌐 Frontend should be running on port 3000"
echo ""
echo "To monitor logs: pm2 logs"
echo "To stop: pm2 stop all"
echo "To restart: pm2 restart all" 