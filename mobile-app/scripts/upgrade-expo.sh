#!/bin/bash
set -e

echo "🚀 Upgrading Expo SDK to 53.0.0..."

# Kill any running processes
echo "📱 Cleaning up existing processes..."
pkill -f "expo start" || true
pkill -f "metro" || true
pkill -f "react-native start" || true

# Clean up caches and node_modules
echo "🧹 Cleaning up old files..."
rm -rf node_modules
rm -rf /tmp/metro-* /tmp/react-* /tmp/haste-map-* 2>/dev/null || true
rm -f package-lock.json

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Clear Expo cache
echo "🧹 Clearing Expo cache..."
npx expo start --clear --no-dev --no-minify

echo "✅ Upgrade complete! You can now run 'npm start' to launch the app" 