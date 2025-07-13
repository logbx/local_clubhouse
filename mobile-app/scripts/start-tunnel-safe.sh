#!/bin/bash
# Set file limits
ulimit -n 65536

echo "🚀 Starting Expo with tunnel (anonymous mode if not logged in)..."

# Clear caches
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true

# Check if logged in
if npx expo whoami >/dev/null 2>&1; then
    echo "✅ Logged in to Expo"
else
    echo "⚠️ Not logged in - will work in anonymous mode"
fi

# Start with tunnel - handles auth automatically
export EXPO_NO_TELEMETRY=1
export METRO_MAX_WORKERS=2

npx expo start --tunnel --clear
