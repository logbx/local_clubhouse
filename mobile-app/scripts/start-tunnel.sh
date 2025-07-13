#!/bin/bash
# Set file limit but don't use CI mode
ulimit -n 65536

echo "🚀 Starting Expo with tunnel (most reliable for connection issues)..."

# Clear everything first
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true

# Start with tunnel connection for better reliability - NO CI MODE for QR code
export EXPO_NO_TELEMETRY=1
export METRO_MAX_WORKERS=2
npx expo start --tunnel --clear