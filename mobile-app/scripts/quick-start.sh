#!/bin/bash

# 🚀 Quick Start Script for Local Clubhouse Mobile App
set -e

echo "🚀 Setting up Local Clubhouse Mobile App..."

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Clean install
echo "🧹 Cleaning previous installation..."
rm -rf node_modules package-lock.json

# Install dependencies with minimal packages first
echo "📦 Installing essential dependencies..."

# Install Expo CLI globally if not present
if ! npx expo --version >/dev/null 2>&1; then
    print_warning "Installing Expo CLI..."
    npm install -g @expo/cli
fi

# Install core dependencies first
npm install expo@~50.0.0 expo-router@~3.4.0 react@18.2.0 react-native@0.73.4

# Install Expo modules
npm install expo-status-bar@~1.11.1 expo-constants@~15.4.5 expo-linking@~6.2.2 expo-splash-screen@~0.26.4

# Install React Native modules  
npm install react-native-safe-area-context@4.8.2 react-native-screens@~3.29.0 react-native-gesture-handler@~2.14.1

# Install additional core modules
npm install @react-native-async-storage/async-storage@~1.21.0 @tanstack/react-query@^5.17.0

# Install styling
npm install nativewind@^4.0.1 tailwindcss@^3.4.0 clsx@^2.1.0

# Install TypeScript dependencies
npm install --save-dev typescript@^5.3.3 @types/react@~18.2.48 @babel/core@^7.23.9

print_success "Core dependencies installed!"

# Check if backend is running
echo "🔍 Checking backend connection..."
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    print_success "Backend is running!"
else
    print_warning "Backend not running. Start it with: cd ../backend && npm run start:dev"
fi

print_success "🎉 Setup complete!"
echo ""
echo "📱 To start development:"
echo "   npm run dev          # Start with QR code"
echo "   npm run dev:web      # Start web version"
echo "   npm run dev:ios      # Start iOS simulator"
echo ""
echo "📱 Download Expo Go app on your phone and scan the QR code!"