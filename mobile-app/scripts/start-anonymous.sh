#!/bin/bash
# Set file limits
ulimit -n 65536

echo "🚀 Starting Expo in anonymous local mode..."

# Clear caches
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true

# Start without tunnel to avoid login requirement
export EXPO_NO_TELEMETRY=1
export METRO_MAX_WORKERS=2

# Use localhost connection (no tunnel, no login required)
npx expo start --localhost --clear