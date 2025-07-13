#!/bin/bash
# Set file limits
ulimit -n 65536

echo "🚀 Starting Expo in local mode..."

# Clear caches
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true

# Check login status
if ! npx expo whoami >/dev/null 2>&1; then
    echo "⚠️ Not logged in - some features may be limited"
fi

# Start local server
export EXPO_NO_TELEMETRY=1
export METRO_MAX_WORKERS=2
export REACT_NATIVE_PACKAGER_HOSTNAME=$(ipconfig getifaddr en0 || echo "localhost")

echo "📱 Using IP: $REACT_NATIVE_PACKAGER_HOSTNAME"

npx expo start --lan --clear
