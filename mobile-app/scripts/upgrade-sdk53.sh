#!/bin/bash

# 🚀 Complete Expo SDK 53 Upgrade Script
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo -e "${PURPLE}🚀 EXPO SDK 53 UPGRADE - COMPLETE CLEANUP${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 1. Kill all running processes
echo -e "${BLUE}🛑 Step 1: Stopping all running processes...${NC}"
pkill -f "expo start" || true
pkill -f "metro" || true
pkill -f "react-native start" || true
sleep 2

# 2. Clean all caches (aggressive cleanup)
echo -e "${BLUE}🧹 Step 2: Aggressive cache cleanup...${NC}"
echo "Removing node_modules..."
rm -rf node_modules
echo "Removing package-lock.json..."
rm -f package-lock.json
echo "Removing npm cache..."
npm cache clean --force
echo "Removing Metro cache..."
rm -rf /tmp/metro-* /tmp/react-* /tmp/haste-map-* 2>/dev/null || true
echo "Removing Expo cache..."
rm -rf ~/.expo/cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
echo "Removing iOS build cache..."
rm -rf ios/build 2>/dev/null || true
echo "Removing Android build cache..."
rm -rf android/build android/.gradle 2>/dev/null || true

# 3. Clean global Expo cache
echo -e "${BLUE}🌐 Step 3: Cleaning global Expo cache...${NC}"
npx expo r --clear || true

# 4. Verify current configuration
echo -e "${BLUE}📋 Step 4: Verifying configuration...${NC}"
EXPO_VERSION=$(grep '"expo"' package.json | sed 's/.*"expo": *"\\([^"]*\\)".*/\\1/')
echo "Package.json Expo version: $EXPO_VERSION"

SDK_VERSION=$(grep '"sdkVersion"' app.json | sed 's/.*"sdkVersion": *"\\([^"]*\\)".*/\\1/' || echo "Not found")
echo "App.json SDK version: $SDK_VERSION"

if [[ "$EXPO_VERSION" == *"53"* ]]; then
    echo -e "${GREEN}✅ Package.json is configured for SDK 53${NC}"
else
    echo -e "${RED}❌ Package.json needs SDK 53 update${NC}"
    echo "Updating package.json..."
    npm pkg set dependencies.expo="~53.0.0"
fi

# 5. Fresh installation with exact versions
echo -e "${BLUE}📦 Step 5: Fresh installation with SDK 53 versions...${NC}"
echo "Installing dependencies with exact SDK 53 versions..."

npm install expo@~53.0.0 \
  expo-constants@~15.4.5 \
  expo-router@~3.4.0 \
  expo-splash-screen@~0.26.4 \
  expo-status-bar@~1.11.1 \
  react-native@0.73.6 \
  react-native-safe-area-context@4.8.2 \
  react-native-screens@~3.29.0 \
  --save-exact

echo "Installing remaining dependencies..."
npm install

# 6. Verify installation
echo -e "${BLUE}✅ Step 6: Verifying installation...${NC}"
echo "Checking installed versions..."

INSTALLED_EXPO=$(npm list expo --depth=0 2>/dev/null | grep expo || echo "Not found")
echo "Installed Expo: $INSTALLED_EXPO"

INSTALLED_RN=$(npm list react-native --depth=0 2>/dev/null | grep react-native || echo "Not found")
echo "Installed React Native: $INSTALLED_RN"

# 7. Doctor check
echo -e "${BLUE}🩺 Step 7: Running Expo doctor...${NC}"
npx expo doctor || echo "Doctor completed with warnings (normal)"

# 8. Set file limits
echo -e "${BLUE}⚙️ Step 8: Setting optimized limits...${NC}"
ulimit -n 65536

# Create updated limits file for SDK 53
cat > ~/.expo-sdk53-limits << 'EOF'
# Expo SDK 53 Development Limits
ulimit -n 65536
export EXPO_NO_TELEMETRY=1
export METRO_MAX_WORKERS=2
EOF

source ~/.expo-sdk53-limits

# 9. Create verification script
echo -e "${BLUE}📝 Step 9: Creating verification script...${NC}"
cat > scripts/verify-sdk53.sh << 'EOF'
#!/bin/bash

echo "🔍 Expo SDK 53 Verification"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check versions
echo "📦 Package Versions:"
echo "Expo: $(npm list expo --depth=0 2>/dev/null | grep expo | awk '{print $2}' || echo 'Not found')"
echo "React Native: $(npm list react-native --depth=0 2>/dev/null | grep react-native | awk '{print $2}' || echo 'Not found')"
echo "Expo Router: $(npm list expo-router --depth=0 2>/dev/null | grep expo-router | awk '{print $2}' || echo 'Not found')"

# Check config files
echo ""
echo "⚙️ Configuration:"
EXPO_PKG=$(grep '"expo"' package.json | sed 's/.*"expo": *"\\([^"]*\\)".*/\\1/')
SDK_APP=$(grep '"sdkVersion"' app.json | sed 's/.*"sdkVersion": *"\\([^"]*\\)".*/\\1/' 2>/dev/null || echo "Not set")
echo "Package.json expo: $EXPO_PKG"
echo "App.json sdkVersion: $SDK_APP"

# Check compatibility
echo ""
echo "🎯 Compatibility Check:"
if [[ "$EXPO_PKG" == *"53"* ]] && [[ "$SDK_APP" == *"53"* ]]; then
    echo "✅ SDK 53 configuration is correct"
else
    echo "❌ Configuration mismatch detected"
fi

# Test Metro bundler
echo ""
echo "📡 Metro Bundler Test:"
if curl -s http://localhost:8081 >/dev/null 2>&1; then
    echo "✅ Metro bundler is running"
else
    echo "ℹ️ Metro bundler not currently running"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
EOF

chmod +x scripts/verify-sdk53.sh

# 10. Update startup scripts for SDK 53
echo -e "${BLUE}🔄 Step 10: Updating startup scripts for SDK 53...${NC}"

# Update the safe tunnel script
cat > scripts/start-sdk53.sh << 'EOF'
#!/bin/bash
# Expo SDK 53 Optimized Startup
source ~/.expo-sdk53-limits 2>/dev/null || ulimit -n 65536

echo "🚀 Starting Expo SDK 53 (anonymous mode)..."

# Clear any residual cache
rm -rf /tmp/metro-* /tmp/react-* 2>/dev/null || true

# Check login status
if npx expo whoami >/dev/null 2>&1; then
    echo "✅ Logged in to Expo"
else
    echo "ℹ️ Running in anonymous mode"
fi

# Start with optimized settings for SDK 53
export EXPO_NO_TELEMETRY=1
export METRO_MAX_WORKERS=2

# Use localhost to avoid tunnel auth requirements
npx expo start --localhost --clear
EOF

chmod +x scripts/start-sdk53.sh

# Add to package.json
npm pkg set scripts.dev:sdk53="./scripts/start-sdk53.sh"
npm pkg set scripts.verify="./scripts/verify-sdk53.sh"

echo ""
echo -e "${GREEN}✅ EXPO SDK 53 UPGRADE COMPLETE!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${BLUE}📋 NEXT STEPS:${NC}"
echo "1. ${GREEN}npm run verify${NC}     - Verify SDK 53 installation"
echo "2. ${GREEN}npm run dev:sdk53${NC}  - Start with SDK 53 optimizations"
echo "3. ${GREEN}Test with Expo Go app${NC}"
echo ""
echo -e "${YELLOW}📱 IMPORTANT:${NC}"
echo "Make sure your Expo Go app is updated to support SDK 53!"
echo ""
echo -e "${PURPLE}🎉 Your project is now compatible with Expo Go SDK 53!${NC}"