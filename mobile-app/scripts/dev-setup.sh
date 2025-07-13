#!/bin/bash

# 🚀 Local Clubhouse Mobile Development Setup Script
# This script sets up the development environment for testing the mobile app

set -e  # Exit on any error

echo "🏗️ Setting up Local Clubhouse Mobile Development Environment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the mobile-app directory
if [ ! -f "app.json" ]; then
    print_error "Please run this script from the mobile-app directory"
    exit 1
fi

# Check for required tools
print_status "Checking for required tools..."

# Check Node.js
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version)
print_success "Node.js found: $NODE_VERSION"

# Check npm
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed"
    exit 1
fi

NPM_VERSION=$(npm --version)
print_success "npm found: $NPM_VERSION"

# Check for Expo CLI
if ! command -v npx &> /dev/null; then
    print_error "npx is not available"
    exit 1
fi

print_success "npx found"

# Install dependencies
print_status "Installing project dependencies..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Set up environment variables
print_status "Setting up environment variables..."

ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        print_success "Created .env file from .env.example"
    else
        # Create default .env file
        cat > "$ENV_FILE" << EOF
# Local Clubhouse Mobile App Environment Configuration

# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001

# App Configuration
EXPO_PUBLIC_APP_NAME=Local Clubhouse
EXPO_PUBLIC_APP_VERSION=1.0.0
EXPO_PUBLIC_ENVIRONMENT=development

# Feature Flags
EXPO_PUBLIC_ENABLE_DEV_TOOLS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=false
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=false

# Debug Settings
EXPO_PUBLIC_DEBUG_NETWORK=true
EXPO_PUBLIC_DEBUG_NAVIGATION=true
EXPO_PUBLIC_DEBUG_PERFORMANCE=true

# Storage Configuration
EXPO_PUBLIC_CACHE_TTL=300000
EXPO_PUBLIC_MAX_CACHE_SIZE=50

# Image Upload Configuration
EXPO_PUBLIC_MAX_IMAGE_SIZE=5242880
EXPO_PUBLIC_ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/webp

# Notification Configuration (leave empty for development)
EXPO_PUBLIC_FIREBASE_CONFIG=
EXPO_PUBLIC_PUSH_NOTIFICATION_KEY=

# Maps and Location (leave empty for development)
EXPO_PUBLIC_GOOGLE_MAPS_API_KEY=
EXPO_PUBLIC_APPLE_MAPS_API_KEY=

# Third-party Integrations (leave empty for development)
EXPO_PUBLIC_SENTRY_DSN=
EXPO_PUBLIC_ANALYTICS_ID=

# Development Tools
EXPO_PUBLIC_FLIPPER_ENABLED=true
EXPO_PUBLIC_REACTOTRON_ENABLED=true
EOF
        print_success "Created default .env file"
    fi
    
    print_warning "Please review and update the .env file with your configuration"
    print_warning "Especially update EXPO_PUBLIC_API_URL if your backend runs on a different port"
else
    print_success ".env file already exists"
fi

# Set up development tools
print_status "Setting up development tools..."

# Create metro.config.js if it doesn't exist
if [ ! -f "metro.config.js" ]; then
    cat > "metro.config.js" << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable CSS support
config.transformer.minifierPath = 'metro-minify-terser';
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
};

// Add support for source maps in development
if (process.env.NODE_ENV === 'development') {
  config.transformer.minifierConfig.sourceMap = true;
}

module.exports = config;
EOF
    print_success "Created metro.config.js"
fi

# Create performance monitoring setup
PERF_DIR="lib/performance"
mkdir -p "$PERF_DIR"

if [ ! -f "$PERF_DIR/dev-tools.ts" ]; then
    cat > "$PERF_DIR/dev-tools.ts" << 'EOF'
import { Platform } from 'react-native';

interface PerformanceMetrics {
  appStartup: number;
  jsBundle: number;
  firstRender: number;
  navigation: Record<string, number>;
  apiCalls: Record<string, number>;
  memoryUsage: number[];
}

class DevPerformanceMonitor {
  private metrics: PerformanceMetrics = {
    appStartup: 0,
    jsBundle: 0,
    firstRender: 0,
    navigation: {},
    apiCalls: {},
    memoryUsage: []
  };

  private startTime = Date.now();

  constructor() {
    if (__DEV__) {
      this.initializeMonitoring();
    }
  }

  private initializeMonitoring() {
    // Monitor memory usage every 5 seconds
    setInterval(() => {
      if (Platform.OS !== 'web' && (global as any).performance?.memory) {
        const memory = (global as any).performance.memory;
        this.metrics.memoryUsage.push(memory.usedJSHeapSize / 1024 / 1024); // MB
        
        // Keep only last 20 measurements
        if (this.metrics.memoryUsage.length > 20) {
          this.metrics.memoryUsage.shift();
        }
      }
    }, 5000);

    // Log performance data every 30 seconds
    setInterval(() => {
      this.logPerformanceData();
    }, 30000);
  }

  markAppStartup() {
    this.metrics.appStartup = Date.now() - this.startTime;
    console.log(`📱 App startup time: ${this.metrics.appStartup}ms`);
  }

  markJSBundleLoaded() {
    this.metrics.jsBundle = Date.now() - this.startTime;
    console.log(`📦 JS Bundle loaded: ${this.metrics.jsBundle}ms`);
  }

  markFirstRender() {
    this.metrics.firstRender = Date.now() - this.startTime;
    console.log(`🎨 First render: ${this.metrics.firstRender}ms`);
  }

  markNavigation(screenName: string) {
    const time = Date.now();
    this.metrics.navigation[screenName] = time;
    console.log(`🧭 Navigation to ${screenName}: ${time - this.startTime}ms`);
  }

  markAPICall(endpoint: string, duration: number) {
    this.metrics.apiCalls[endpoint] = duration;
    if (duration > 2000) {
      console.warn(`🐌 Slow API call to ${endpoint}: ${duration}ms`);
    }
  }

  getPerformanceReport() {
    const currentMemory = this.metrics.memoryUsage.length > 0 
      ? this.metrics.memoryUsage[this.metrics.memoryUsage.length - 1]
      : 0;

    const avgMemory = this.metrics.memoryUsage.length > 0
      ? this.metrics.memoryUsage.reduce((a, b) => a + b) / this.metrics.memoryUsage.length
      : 0;

    return {
      ...this.metrics,
      currentMemoryMB: currentMemory,
      averageMemoryMB: avgMemory,
      timestamp: new Date().toISOString()
    };
  }

  private logPerformanceData() {
    if (!__DEV__) return;
    
    const report = this.getPerformanceReport();
    console.group('📊 Performance Report');
    console.log('App Startup:', report.appStartup + 'ms');
    console.log('JS Bundle:', report.jsBundle + 'ms');
    console.log('First Render:', report.firstRender + 'ms');
    console.log('Current Memory:', report.currentMemoryMB.toFixed(2) + 'MB');
    console.log('Average Memory:', report.averageMemoryMB.toFixed(2) + 'MB');
    console.log('Recent Navigation:', Object.keys(report.navigation).slice(-3));
    console.log('Slow API Calls:', 
      Object.entries(report.apiCalls)
        .filter(([_, duration]) => duration > 2000)
        .map(([endpoint, duration]) => `${endpoint}: ${duration}ms`)
    );
    console.groupEnd();
  }

  // Expose for debugging
  enableDebugMode() {
    if (__DEV__) {
      (global as any).__PERFORMANCE_MONITOR__ = this;
      console.log('🔧 Performance monitor available at global.__PERFORMANCE_MONITOR__');
    }
  }
}

export const devPerformanceMonitor = new DevPerformanceMonitor();

// Auto-enable in development
if (__DEV__) {
  devPerformanceMonitor.enableDebugMode();
}
EOF
    print_success "Created development performance monitoring tools"
fi

# Create debug menu for development
DEBUG_DIR="components/debug"
mkdir -p "$DEBUG_DIR"

if [ ! -f "$DEBUG_DIR/DebugMenu.tsx" ]; then
    cat > "$DEBUG_DIR/DebugMenu.tsx" << 'EOF'
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Alert } from 'react-native';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { devPerformanceMonitor } from '@/lib/performance/dev-tools';

interface DebugMenuProps {
  visible: boolean;
  onClose: () => void;
}

export function DebugMenu({ visible, onClose }: DebugMenuProps) {
  const [performanceData, setPerformanceData] = useState<any>(null);

  const handleClearCache = async () => {
    try {
      await AsyncStorage.clear();
      Alert.alert('Cache Cleared', 'All cached data has been removed');
    } catch (error) {
      Alert.alert('Error', 'Failed to clear cache');
    }
  };

  const handleShowPerformance = () => {
    const data = devPerformanceMonitor.getPerformanceReport();
    setPerformanceData(data);
  };

  const handleForceError = () => {
    throw new Error('Test error for debugging');
  };

  if (!__DEV__) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View className="flex-1 bg-white p-4">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-xl font-bold">Debug Menu</Text>
          <Pressable
            onPress={onClose}
            className="bg-gray-200 px-4 py-2 rounded"
          >
            <Text>Close</Text>
          </Pressable>
        </View>

        <ScrollView className="flex-1">
          <View className="space-y-4">
            {/* App Info */}
            <View className="bg-gray-100 p-4 rounded">
              <Text className="font-semibold mb-2">App Info</Text>
              <Text>Platform: {Platform.OS}</Text>
              <Text>Version: {Platform.Version}</Text>
              <Text>Environment: {__DEV__ ? 'Development' : 'Production'}</Text>
            </View>

            {/* Performance */}
            <View className="bg-gray-100 p-4 rounded">
              <Text className="font-semibold mb-2">Performance</Text>
              <Pressable
                onPress={handleShowPerformance}
                className="bg-blue-500 px-4 py-2 rounded mb-2"
              >
                <Text className="text-white text-center">Show Performance Data</Text>
              </Pressable>
              
              {performanceData && (
                <View className="mt-2 p-2 bg-white rounded">
                  <Text className="text-xs">
                    {JSON.stringify(performanceData, null, 2)}
                  </Text>
                </View>
              )}
            </View>

            {/* Cache Management */}
            <View className="bg-gray-100 p-4 rounded">
              <Text className="font-semibold mb-2">Cache Management</Text>
              <Pressable
                onPress={handleClearCache}
                className="bg-red-500 px-4 py-2 rounded"
              >
                <Text className="text-white text-center">Clear All Cache</Text>
              </Pressable>
            </View>

            {/* Error Testing */}
            <View className="bg-gray-100 p-4 rounded">
              <Text className="font-semibold mb-2">Error Testing</Text>
              <Pressable
                onPress={handleForceError}
                className="bg-orange-500 px-4 py-2 rounded"
              >
                <Text className="text-white text-center">Force Test Error</Text>
              </Pressable>
            </View>

            {/* Network Info */}
            <View className="bg-gray-100 p-4 rounded">
              <Text className="font-semibold mb-2">Network</Text>
              <Text>API URL: {process.env.EXPO_PUBLIC_API_URL}</Text>
              <Text>WebSocket URL: {process.env.EXPO_PUBLIC_WS_URL}</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Debug trigger component - shows floating debug button
export function DebugTrigger() {
  const [showMenu, setShowMenu] = useState(false);

  if (!__DEV__) return null;

  return (
    <>
      <Pressable
        onPress={() => setShowMenu(true)}
        className="absolute bottom-20 right-4 bg-purple-600 w-12 h-12 rounded-full items-center justify-center z-50"
        style={{ elevation: 5, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 }}
      >
        <Text className="text-white font-bold">🐛</Text>
      </Pressable>
      
      <DebugMenu visible={showMenu} onClose={() => setShowMenu(false)} />
    </>
  );
}
EOF
    print_success "Created debug menu component"
fi

# Create startup script
cat > "scripts/start-dev.sh" << 'EOF'
#!/bin/bash

# Start development server with enhanced debugging

echo "🚀 Starting Local Clubhouse Mobile Development..."

# Set development environment
export NODE_ENV=development
export EXPO_DEBUG=true

# Clear metro cache for fresh start
echo "🧹 Clearing Metro cache..."
npx expo start --clear

echo "✨ Development server starting..."
echo "📱 Use the Expo Go app to scan the QR code"
echo "🌐 Or press 'w' to open in web browser"
echo "📳 Press 'i' to open iOS simulator"
echo "🤖 Press 'a' to open Android emulator"
EOF

chmod +x "scripts/start-dev.sh"

# Create package.json scripts if they don't exist
print_status "Setting up npm scripts..."

# Check if package.json has the required scripts
if ! grep -q '"dev":' package.json; then
    print_status "Adding development scripts to package.json..."
    
    # Create a temporary file with the updated package.json
    node -e "
const pkg = require('./package.json');
pkg.scripts = pkg.scripts || {};
pkg.scripts.dev = 'bash scripts/start-dev.sh';
pkg.scripts['dev:web'] = 'npx expo start --web';
pkg.scripts['dev:ios'] = 'npx expo start --ios';
pkg.scripts['dev:android'] = 'npx expo start --android';
pkg.scripts['dev:tunnel'] = 'npx expo start --tunnel';
pkg.scripts['build:dev'] = 'npx expo export --dev';
pkg.scripts['test:perf'] = 'node scripts/performance-test.js';
pkg.scripts.reset = 'npx expo start --clear';
console.log(JSON.stringify(pkg, null, 2));
" > package.json.tmp && mv package.json.tmp package.json

    print_success "Added development scripts"
fi

# Check backend connection
print_status "Checking backend connection..."

BACKEND_URL=$(grep EXPO_PUBLIC_API_URL .env | cut -d '=' -f2)
if [ -n "$BACKEND_URL" ]; then
    if curl -s "$BACKEND_URL/health" >/dev/null 2>&1; then
        print_success "Backend is running at $BACKEND_URL"
    else
        print_warning "Backend not responding at $BACKEND_URL"
        print_warning "Make sure to start your backend server first:"
        print_warning "  cd ../backend && npm run start:dev"
    fi
else
    print_warning "Backend URL not configured in .env"
fi

# Final setup completion
print_success "🎉 Mobile development environment setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Review and update .env file if needed"
echo "2. Start backend server: cd ../backend && npm run start:dev"
echo "3. Start mobile development server: npm run dev"
echo "4. Install Expo Go app on your mobile device"
echo "5. Scan QR code or use simulator"
echo ""
echo "🔧 Available commands:"
echo "  npm run dev         - Start development server"
echo "  npm run dev:web     - Start web development"
echo "  npm run dev:ios     - Start iOS simulator"
echo "  npm run dev:android - Start Android emulator"
echo "  npm run reset       - Clear cache and restart"
echo ""
echo "🐛 Debug features:"
echo "  - Floating debug button in development mode"
echo "  - Performance monitoring console logs"
echo "  - Network request logging"
echo "  - Memory usage tracking"
echo ""
print_success "Happy coding! 🚀"
EOF