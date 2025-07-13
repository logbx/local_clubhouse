#!/bin/bash

# 🚀 Immediate Expo Fix Script
# Implements all fixes automatically to resolve EMFILE and connection issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 IMPLEMENTING EXPO FIXES NOW${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Kill all existing processes immediately
echo -e "${BLUE}🧹 Cleaning up existing processes...${NC}"
pkill -f "expo start" || true
pkill -f "metro" || true
pkill -f "react-native start" || true
sleep 2

# 2. Install watchman if not present (better file watching)
echo -e "${BLUE}📦 Setting up watchman for better file watching...${NC}"
if ! command -v watchman &> /dev/null; then
    if command -v brew &> /dev/null; then
        echo "Installing watchman via Homebrew..."
        brew install watchman
    else
        echo -e "${YELLOW}⚠️ Watchman not installed. Please install with: brew install watchman${NC}"
    fi
else
    echo -e "${GREEN}✅ Watchman already installed${NC}"
    # Clear watchman cache
    watchman watch-del-all
fi

# 3. Set aggressive system limits
echo -e "${BLUE}⚙️ Setting system limits...${NC}"
# Set file descriptor limits
ulimit -n 65536

# Create persistent limits file
cat > ~/.expo-limits << 'EOF'
# Expo Development Limits - Applied automatically
ulimit -n 65536
export EXPO_NO_TELEMETRY=1
export CI=true
export METRO_MAX_WORKERS=2
export WATCHMAN_MAX_FILE_WATCHES=1000000
EOF

source ~/.expo-limits

# Add to shell profiles for persistence
for profile in ~/.bashrc ~/.bash_profile ~/.zshrc; do
    if [ -f "$profile" ]; then
        if ! grep -q "expo-limits" "$profile"; then
            echo "source ~/.expo-limits" >> "$profile"
        fi
    fi
done

echo -e "${GREEN}✅ System limits configured${NC}"

# 4. Update React Native to exact version
echo -e "${BLUE}📱 Updating React Native to exact version...${NC}"
npm install react-native@0.73.6 --save-exact

# 5. Create optimized Metro config with watchman
echo -e "${BLUE}⚡ Creating optimized Metro configuration...${NC}"
cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Aggressive optimization for file watching
config.watchFolders = [__dirname];
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Use watchman for better file watching if available
config.watcher = {
  additionalExts: ['cjs', 'mjs'],
  healthCheckTimeout: 60000,
  ignored: [
    // Aggressively ignore heavy directories
    /node_modules\/.*\/node_modules\/.*/,
    /.*\/__tests__\/.*/,
    /.*\/\.(git|hg|svn)\/.*/,
    /.*\.log$/,
    /.*\.tmp$/,
    /.*\/\.expo\/.*/,
    /.*\/build\/.*/,
    /.*\/dist\/.*/,
    /.*\/coverage\/.*/,
  ],
};

// Reduce worker load
config.maxWorkers = 2;
config.transformer = {
  ...config.transformer,
  workerCount: 2,
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
    keep_fnames: true,
  },
};

module.exports = withNativeWind(config, { input: './global.css' });
EOF

# 6. Create environment configuration
echo -e "${BLUE}🌐 Setting up environment configuration...${NC}"
cat > .env.local << 'EOF'
# Local Development Environment
EXPO_PUBLIC_API_URL=http://localhost:3001/api
EXPO_PUBLIC_WS_URL=ws://localhost:3001
EXPO_PUBLIC_ENVIRONMENT=development

# Performance optimizations
EXPO_NO_TELEMETRY=1
CI=true
EOF

# 7. Create startup script with fallback options
echo -e "${BLUE}🚀 Creating optimized startup script...${NC}"
cat > scripts/start-expo-fixed.sh << 'EOF'
#!/bin/bash

# Load optimizations
source ~/.expo-limits 2>/dev/null || true

echo "🚀 Starting Expo with optimizations..."

# Clear all caches first
echo "🧹 Clearing caches..."
rm -rf /tmp/metro-* /tmp/react-* /tmp/haste-map-* 2>/dev/null || true
npm cache clean --force
expo r -c

# Try watchman cleanup if available
if command -v watchman &> /dev/null; then
    echo "🔄 Resetting watchman..."
    watchman watch-del-all
    watchman shutdown-server
fi

# Set network interface explicitly
export EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0

echo "🌟 Starting with tunnel connection for better stability..."

# Start with tunnel (more reliable for connection issues)
expo start --tunnel --clear

# If tunnel fails, fall back to regular start
if [ $? -ne 0 ]; then
    echo "🔄 Tunnel failed, trying regular connection..."
    expo start --clear
fi
EOF

chmod +x scripts/start-expo-fixed.sh

# 8. Configure firewall rules for macOS
echo -e "${BLUE}🔒 Configuring firewall for development...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Allow Expo/Node through macOS firewall
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node 2>/dev/null || true
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node 2>/dev/null || true
    
    # Allow Expo CLI
    EXPO_PATH=$(which expo)
    if [ -n "$EXPO_PATH" ]; then
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$EXPO_PATH" 2>/dev/null || true
        sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock "$EXPO_PATH" 2>/dev/null || true
    fi
fi

# 9. Create package.json script shortcuts
echo -e "${BLUE}📜 Adding package.json scripts...${NC}"
# Update package.json to add our optimized scripts
npm pkg set scripts.dev:fixed="./scripts/start-expo-fixed.sh"
npm pkg set scripts.dev:tunnel="expo start --tunnel --clear"
npm pkg set scripts.dev:clean="source ~/.expo-limits && expo r -c && expo start --clear"

# 10. Final cache cleanup and verification
echo -e "${BLUE}✨ Final cleanup and verification...${NC}"
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true

# Verify current settings
echo ""
echo -e "${GREEN}✅ FIXES IMPLEMENTED SUCCESSFULLY${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${YELLOW}Current configuration:${NC}"
echo "  File descriptor limit: $(ulimit -n)"
echo "  React Native version: $(npm list react-native --depth=0 2>/dev/null | grep react-native || echo 'Not found')"
echo "  Watchman: $(command -v watchman >/dev/null && echo 'Available' || echo 'Not installed')"
echo ""
echo -e "${BLUE}🚀 READY TO START:${NC}"
echo "  Run: ${GREEN}npm run dev:fixed${NC}     (Recommended - uses tunnel)"
echo "  Or:  ${GREEN}npm run dev:clean${NC}     (Alternative - regular connection)"
echo ""
echo -e "${YELLOW}📱 After starting:${NC}"
echo "  1. Scan the QR code with Expo Go app"
echo "  2. If connection fails, the script will auto-retry with different methods"
echo "  3. Monitor the terminal for any remaining errors"
echo ""
echo -e "${GREEN}🎯 Issues should now be resolved!${NC}"
EOF

chmod +x /Applications/Projects/saas-app/mobile-app/scripts/fix-expo-now.sh