# 🔧 React Native/Expo Troubleshooting Guide

## 🚨 Common Issues & Solutions

### Issue 1: "Could not connect to the server" (iOS/Android)

**Symptoms:**
- Error: "Unknown error: Could not connect to the server"
- Connection endpoint shows: `exp://192.168.1.132:8081`
- QR code appears but app won't load

**Root Causes:**
1. **Network connectivity issues** between device and development machine
2. **Firewall blocking** port 8081
3. **Metro bundler not running** or crashed
4. **Different WiFi networks** between device and computer

**Solutions:**

#### Immediate Fixes:
```bash
# 1. Restart Metro bundler with clean cache
npm run reset

# 2. Check network connectivity
./scripts/diagnose-connection.sh

# 3. Ensure both devices on same WiFi
# Check computer IP: ifconfig | grep "inet "
# Check phone WiFi settings
```

#### Network Configuration:
```bash
# Allow Expo through macOS firewall
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add /usr/local/bin/node
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblock /usr/local/bin/node

# Test port accessibility
nc -z 192.168.1.132 8081
```

---

### Issue 2: "EMFILE: too many open files, watch"

**Symptoms:**
- Metro bundler starts but crashes with file watcher errors
- Development server becomes unresponsive
- Hot reloading stops working

**Root Causes:**
1. **File system watchers** consuming too many file descriptors
2. **Large node_modules** directory with excessive file watching
3. **Multiple Metro instances** running simultaneously

**Solutions:**

#### System Configuration:
```bash
# Increase file descriptor limits
echo 'ulimit -n 65536' >> ~/.bash_profile
echo 'ulimit -n 65536' >> ~/.zshrc

# Apply immediately
ulimit -n 65536
```

#### Metro Optimization:
```bash
# Use optimized Metro config (created by troubleshoot script)
./scripts/troubleshoot-expo.sh

# Clean restart with optimizations
./scripts/clean-restart.sh
```

---

### Issue 3: React Native Version Mismatch

**Symptoms:**
- Warning: "react-native@0.73.4 - expected version: 0.73.6"
- Compilation errors or runtime issues
- Incompatible native modules

**Solutions:**

#### Update to Compatible Version:
```bash
# Update React Native to expected version
npm install react-native@0.73.6 --save-exact

# Clear caches after update
npm run reset
./scripts/clean-restart.sh
```

#### Version Lock Strategy:
```json
// package.json - Use exact versions
{
  "dependencies": {
    "expo": "~50.0.0",
    "react-native": "0.73.6",
    "react": "18.2.0"
  }
}
```

---

## 🔍 Diagnostic Tools

### Quick Health Check
```bash
# Run comprehensive system analysis
./scripts/troubleshoot-expo.sh

# Network connectivity test
./scripts/diagnose-connection.sh

# Check system resources
top -l 1 | head -20
```

### Performance Monitoring
```bash
# Monitor file descriptor usage
watch 'lsof | wc -l'

# Monitor Metro memory usage
ps aux | grep metro

# Check network connections
netstat -an | grep 8081
```

---

## 🚀 Performance Optimizations

### Development Environment Setup

#### 1. System Limits Optimization
```bash
# ~/.expo-dev-limits (created by troubleshoot script)
ulimit -n 65536
export METRO_MAX_WORKERS=4
export CI=true
export EXPO_NO_TELEMETRY=1
```

#### 2. Metro Configuration
```javascript
// metro.config.js (optimized version)
const config = getDefaultConfig(__dirname);

config.watcher = {
  healthCheckTimeout: 30000,
  ignored: [
    /node_modules\/.*\/node_modules\/.*/,
    /.*\/__tests__\/.*/,
    /.*\.(git|hg|svn)\/.*/,
  ],
};

config.maxWorkers = Math.max(1, Math.floor(require('os').cpus().length / 2));
```

#### 3. Project Structure
```
mobile-app/
├── scripts/
│   ├── troubleshoot-expo.sh    # Comprehensive troubleshooting
│   ├── diagnose-connection.sh  # Network diagnostics
│   └── clean-restart.sh        # Clean development restart
├── components/
│   └── error-handling/
│       └── ConnectionErrorBoundary.tsx  # Error handling
└── docs/
    └── TROUBLESHOOTING.md      # This guide
```

---

## 🎯 Best Practices

### 1. Development Workflow
```bash
# Start development session
source ~/.expo-dev-limits
./scripts/clean-restart.sh

# Monitor during development
watch 'ps aux | grep expo | grep -v grep'
```

### 2. Error Handling in Code
```typescript
// app/_layout.tsx
import { ConnectionErrorBoundary } from '@/components/error-handling/ConnectionErrorBoundary';

export default function RootLayout() {
  return (
    <ConnectionErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* Your app content */}
      </QueryClientProvider>
    </ConnectionErrorBoundary>
  );
}
```

### 3. Network Configuration
```bash
# Ensure consistent network setup
# 1. Connect both computer and phone to same WiFi
# 2. Disable VPN if active
# 3. Check firewall settings
# 4. Use stable IP (avoid DHCP conflicts)
```

---

## 🆘 Emergency Recovery

### Complete Environment Reset
```bash
# Nuclear option - complete reset
rm -rf node_modules package-lock.json
npm cache clean --force
expo r -c
npm install
./scripts/troubleshoot-expo.sh
```

### Alternative Connection Methods
```bash
# Use tunnel connection (slower but more reliable)
expo start --tunnel

# Use localhost for web testing
npm run dev:web
open http://localhost:8081
```

---

## 📊 Monitoring & Maintenance

### Daily Checks
- Monitor file descriptor usage
- Check Metro memory consumption
- Verify network connectivity
- Review error logs

### Weekly Maintenance
- Clear development caches
- Update dependencies
- Run full system diagnostics
- Review performance metrics

### Performance Targets
- **App startup**: <2s
- **Hot reload**: <500ms
- **Bundle size**: <10MB
- **Memory usage**: <150MB

---

## 🔗 Additional Resources

- [Expo Troubleshooting Docs](https://docs.expo.dev/troubleshooting/)
- [Metro Configuration](https://facebook.github.io/metro/docs/configuration)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [macOS Development Setup](https://docs.expo.dev/workflow/macos/)

---

**Created by**: Expo Troubleshooting Script v1.0  
**Last Updated**: $(date '+%Y-%m-%d %H:%M:%S')  
**Environment**: React Native 0.73.6 + Expo SDK 50