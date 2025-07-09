#!/bin/bash

# Development Start Script for Local Clubhouse
# This script starts the application in development mode

echo "🚀 Starting Local Clubhouse in Development Mode..."

# Navigate to project root
cd "$(dirname "$0")/.."

echo "🔧 Development servers will start:"
echo "   - Backend: http://localhost:3001 (API)"
echo "   - Frontend: http://localhost:5173"
echo ""
echo "📝 To start manually:"
echo "   Backend: cd backend && npm run start:dev"
echo "   Frontend: cd frontend && npm run dev"
echo ""
echo "💡 Press Ctrl+C to stop servers"

# Start backend in background
echo "🖥️ Starting backend development server..."
cd backend
npm run start:dev &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🌐 Starting frontend development server..."
cd ../frontend
npm run dev &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping development servers..."
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for processes
wait 