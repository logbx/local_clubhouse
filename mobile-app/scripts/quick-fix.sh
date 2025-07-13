#!/bin/bash

# 🚀 Quick Expo Fix - No external dependencies required
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 QUICK EXPO FIX - NO WAITING${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Kill existing processes
echo -e "${BLUE}🧹 Killing existing processes...${NC}"
pkill -f "expo start" || true
pkill -f "metro" || true
pkill -f "react-native start" || true
sleep 1

# 2. Set aggressive file limits immediately
echo -e "${BLUE}⚡ Setting file descriptor limits...${NC}"
ulimit -n 65536
echo "Current limit: $(ulimit -n)"

# 3. Create environment limits file
cat > ~/.expo-dev-limits << 'EOF'
ulimit -n 65536
export EXPO_NO_TELEMETRY=1
export CI=true
export METRO_MAX_WORKERS=2
EOF

source ~/.expo-dev-limits

# 4. Update React Native version
echo -e "${BLUE}📱 Updating React Native...${NC}"
npm install react-native@0.73.6 --save-exact --no-audit --no-fund

# 5. Create ultra-optimized Metro config
echo -e "${BLUE}⚡ Creating optimized Metro config...${NC}"
cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Minimal file watching to prevent EMFILE
config.watcher = {
  healthCheckTimeout: 60000,
  ignored: [
    /node_modules\/.*\/node_modules\/.*/,
    /.*\/__tests__\/.*/,
    /.*\/\.(git|hg|svn)\/.*/,
    /.*\.log$/,
    /.*\.tmp$/,
    /.*\/\.expo\/.*/,
    /.*\/build\/.*/,
    /.*\/dist\/.*/,
  ],
};

// Reduce workers to minimum
config.maxWorkers = 1;
config.transformer = {
  ...config.transformer,
  workerCount: 1,
};

module.exports = withNativeWind(config, { input: './global.css' });
EOF

# 6. Clean all caches
echo -e "${BLUE}🧹 Cleaning caches...${NC}"
rm -rf /tmp/metro-* /tmp/react-* /tmp/haste-map-* 2>/dev/null || true
rm -rf node_modules/.cache .expo 2>/dev/null || true
npm cache clean --force
expo r -c

# 7. Create tunnel startup script
echo -e "${BLUE}🌐 Creating tunnel startup script...${NC}"
cat > scripts/start-tunnel.sh << 'EOF'
#!/bin/bash
source ~/.expo-dev-limits 2>/dev/null || ulimit -n 65536

echo "🚀 Starting Expo with tunnel (most reliable for connection issues)..."

# Clear everything first
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true
expo r -c

# Start with tunnel connection for better reliability
EXPO_NO_TELEMETRY=1 CI=true expo start --tunnel --clear
EOF

chmod +x scripts/start-tunnel.sh

# 8. Create regular startup script with optimizations
cat > scripts/start-optimized.sh << 'EOF'
#!/bin/bash
source ~/.expo-dev-limits 2>/dev/null || ulimit -n 65536

echo "🚀 Starting Expo with optimizations..."

# Clear caches
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true
expo r -c

# Start with optimizations
export EXPO_NO_TELEMETRY=1
export CI=true
export METRO_MAX_WORKERS=2

expo start --clear
EOF

chmod +x scripts/start-optimized.sh

# 9. Update package.json scripts
npm pkg set scripts.dev:tunnel="./scripts/start-tunnel.sh"
npm pkg set scripts.dev:optimized="./scripts/start-optimized.sh"

# 10. Configure firewall (macOS only)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo -e "${BLUE}🔒 Configuring firewall...${NC}"
    NODE_PATH=$(which node)
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$NODE_PATH" 2>/dev/null || true
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock "$NODE_PATH" 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✅ QUICK FIX COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Configuration:${NC}"
echo "  File descriptor limit: $(ulimit -n)"
echo "  React Native: $(npm list react-native --depth=0 2>/dev/null | grep react-native | awk '{print $2}' || echo 'Updated to 0.73.6')"
echo ""
echo -e "${BLUE}🚀 START OPTIONS:${NC}"
echo "  ${GREEN}npm run dev:tunnel${NC}     ← RECOMMENDED (Most reliable)"
echo "  ${GREEN}npm run dev:optimized${NC}  ← Alternative (Faster startup)"
echo ""
echo -e "${YELLOW}📱 The tunnel connection should solve your connection issues!${NC}"