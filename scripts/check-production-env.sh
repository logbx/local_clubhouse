#!/bin/bash

# Script to check production environment setup
echo "🔍 Checking Production Environment Setup..."

# Check NODE_ENV
echo "📋 NODE_ENV: ${NODE_ENV:-'NOT SET'}"

# Check if .env.production files exist
echo ""
echo "📁 Environment Files:"
echo "Backend .env.production: $([ -f ~/saas-app/backend/.env.production ] && echo '✅ EXISTS' || echo '❌ MISSING')"
echo "Frontend .env.production: $([ -f ~/saas-app/frontend/.env.production ] && echo '✅ EXISTS' || echo '❌ MISSING')"

# Check running processes
echo ""
echo "🔄 Running Processes:"
echo "Development processes (should be NONE):"
ps aux | grep -E "(npm run dev|ts-node-dev|vite --host)" | grep -v grep || echo "✅ No development processes found"

echo ""
echo "Production processes:"
ps aux | grep -E "(node.*dist/main.js|pm2)" | grep -v grep || echo "❌ No production processes found"

# Check PM2 status if installed
echo ""
echo "📊 PM2 Status:"
if command -v pm2 &> /dev/null; then
    pm2 list
else
    echo "❌ PM2 not installed"
fi

# Check environment variables in running processes
echo ""
echo "🌐 Environment Check for Running Node Processes:"
for pid in $(pgrep -f "node.*dist/main.js"); do
    echo "Process $pid environment:"
    cat /proc/$pid/environ | tr '\0' '\n' | grep -E "(NODE_ENV|DATABASE_URL|JWT_SECRET)" || echo "No relevant env vars found"
done 