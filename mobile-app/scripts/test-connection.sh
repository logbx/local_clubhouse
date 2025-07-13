#!/bin/bash

echo "🔍 Testing Expo Connection..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test Metro bundler
echo "📡 Testing Metro bundler..."
if curl -s http://localhost:8081 >/dev/null 2>&1; then
    echo "✅ Metro bundler is running"
else
    echo "❌ Metro bundler not accessible"
fi

# Test network interfaces
echo ""
echo "🌐 Available network interfaces:"
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print "  - " $2}'

# Test Expo status
echo ""
echo "👤 Expo account status:"
if npx expo whoami >/dev/null 2>&1; then
    echo "✅ Logged in as: $(npx expo whoami)"
else
    echo "⚠️ Not logged in (anonymous mode)"
fi

# Check assets
echo ""
echo "📦 Asset status:"
for asset in icon.png splash.png adaptive-icon.png favicon.png; do
    if [ -f "assets/$asset" ]; then
        echo "✅ assets/$asset exists"
    else
        echo "❌ assets/$asset missing"
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
