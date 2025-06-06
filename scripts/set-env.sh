#!/bin/bash

# Environment switching script for Local Clubhouse
# Usage: ./scripts/set-env.sh [development|production]

if [ $# -eq 0 ]; then
    echo "Usage: $0 [development|production]"
    echo "Current NODE_ENV: ${NODE_ENV:-'not set'}"
    exit 1
fi

ENV=$1

if [ "$ENV" != "development" ] && [ "$ENV" != "production" ]; then
    echo "Error: Environment must be 'development' or 'production'"
    exit 1
fi

echo "Setting environment to: $ENV"

# Export NODE_ENV for current session
export NODE_ENV=$ENV

# Check if environment files exist
BACKEND_ENV_FILE="backend/.env.$ENV"
FRONTEND_ENV_FILE="frontend/.env.$ENV"

if [ ! -f "$BACKEND_ENV_FILE" ]; then
    echo "Warning: $BACKEND_ENV_FILE not found"
fi

if [ ! -f "$FRONTEND_ENV_FILE" ]; then
    echo "Warning: $FRONTEND_ENV_FILE not found"
fi

echo "Environment set to: $ENV"
echo "Backend will load: $BACKEND_ENV_FILE"
echo "Frontend will load: $FRONTEND_ENV_FILE"
echo ""
echo "To run the applications:"
echo "Backend: cd backend && npm run start:dev (for development) or npm run start:prod (for production)"
echo "Frontend: cd frontend && npm run dev (for development) or npm run build:prod (for production)"
