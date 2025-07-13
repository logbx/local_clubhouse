#!/bin/bash
# Set file limit
ulimit -n 65536

echo "🚀 Starting Expo with optimizations..."

# Clear caches
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true

# Start with optimizations - NO CI MODE for QR code
export EXPO_NO_TELEMETRY=1
export METRO_MAX_WORKERS=2

npx expo start --clear