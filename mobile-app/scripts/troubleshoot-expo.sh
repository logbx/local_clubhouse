#!/bin/bash

# 🔧 Comprehensive Expo Troubleshooting Script
# Analyzes and fixes common React Native/Expo development issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Status functions
print_header() {
    echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║                    EXPO TROUBLESHOOTER                       ║${NC}"
    echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_section() {
    echo -e "${BLUE}📋 $1${NC}"
    echo "─────────────────────────────────────────────────────"
}

print_check() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_fix() {
    echo -e "${BLUE}🔧 $1${NC}"
}

# System Analysis Functions
check_system_resources() {
    print_section "System Resource Analysis"
    
    # File descriptor limits
    local fd_limit=$(ulimit -n)
    local open_files=$(lsof | wc -l | tr -d ' ')
    
    echo "File Descriptor Limit: $fd_limit"
    echo "Currently Open Files: $open_files"
    
    if [ "$open_files" -gt $((fd_limit * 80 / 100)) ]; then
        print_warning "High file descriptor usage: $open_files/$fd_limit"
    else
        print_check "File descriptor usage normal: $open_files/$fd_limit"
    fi
    
    # Memory usage
    local memory_pressure=$(memory_pressure | grep "System-wide memory free percentage" | awk '{print $NF}' | sed 's/%//' || echo "N/A")
    if [ "$memory_pressure" != "N/A" ] && [ "$memory_pressure" -lt 20 ]; then
        print_warning "Low memory: $memory_pressure% free"
    else
        print_check "Memory usage acceptable"
    fi
    
    echo ""
}

check_network_connectivity() {
    print_section "Network Connectivity Analysis"
    
    # Get local IP addresses
    local ip_addresses=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}')
    
    echo "Available IP addresses:"
    for ip in $ip_addresses; do
        echo "  - $ip"
    done
    
    # Check if any process is using port 8081
    local port_8081=$(lsof -i :8081 | grep LISTEN || echo "")
    
    if [ -n "$port_8081" ]; then
        print_check "Port 8081 is in use:"
        echo "$port_8081"
    else
        print_warning "Port 8081 is not in use (Metro not running)"
    fi
    
    # Test local connectivity
    if nc -z localhost 8081 2>/dev/null; then
        print_check "Local connectivity to port 8081 working"
    else
        print_warning "Cannot connect to localhost:8081"
    fi
    
    echo ""
}

check_expo_environment() {
    print_section "Expo Environment Analysis"
    
    # Check Expo CLI
    if command -v expo &> /dev/null; then
        local expo_version=$(expo --version)
        print_check "Expo CLI installed: $expo_version"
    else
        print_error "Expo CLI not found"
        return 1
    fi
    
    # Check Node.js version
    local node_version=$(node --version)
    print_check "Node.js: $node_version"
    
    # Check npm version
    local npm_version=$(npm --version)
    print_check "npm: $npm_version"
    
    # Check package.json dependencies
    if [ -f "package.json" ]; then
        local expo_version=$(grep '"expo"' package.json | sed 's/.*"expo": *"\([^"]*\)".*/\1/')
        local rn_version=$(grep '"react-native"' package.json | sed 's/.*"react-native": *"\([^"]*\)".*/\1/')
        
        echo "Package versions:"
        echo "  - Expo: $expo_version"
        echo "  - React Native: $rn_version"
        
        # Check for version compatibility
        if [[ "$rn_version" == "0.73.4" ]]; then
            print_warning "React Native 0.73.4 detected (expected 0.73.6 for Expo ~50.0.0)"
        fi
    else
        print_error "package.json not found"
    fi
    
    echo ""
}

check_file_watchers() {
    print_section "File Watcher Analysis"
    
    # Check if fsevents is consuming too many resources
    local fsevents_count=$(ps aux | grep fsevents | grep -v grep | wc -l | tr -d ' ')
    echo "Active fsevents processes: $fsevents_count"
    
    # Check for Metro processes
    local metro_processes=$(ps aux | grep metro | grep -v grep | wc -l | tr -d ' ')
    echo "Metro processes: $metro_processes"
    
    # Check for Node processes
    local node_processes=$(ps aux | grep node | grep -v grep | wc -l | tr -d ' ')
    echo "Node processes: $node_processes"
    
    if [ "$node_processes" -gt 10 ]; then
        print_warning "High number of Node processes detected: $node_processes"
    fi
    
    echo ""
}

# Fix Functions
fix_file_descriptor_limits() {
    print_section "Optimizing File Descriptor Limits"
    
    # Increase file descriptor limits
    print_fix "Setting higher file descriptor limits..."
    
    cat > ~/.expo-dev-limits << 'EOF'
# Expo Development File Limits
ulimit -n 65536

# Environment variables for Metro
export METRO_MAX_WORKERS=4
export CI=true
export EXPO_NO_TELEMETRY=1
EOF
    
    # Source the limits
    source ~/.expo-dev-limits
    
    print_check "File descriptor limits optimized"
    echo "Current limit: $(ulimit -n)"
    echo ""
}

fix_metro_configuration() {
    print_section "Optimizing Metro Configuration"
    
    print_fix "Creating optimized metro.config.js..."
    
    cat > metro.config.js << 'EOF'
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Optimize for development
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

// Reduce file watching load
config.watchFolders = [__dirname];
config.watcher = {
  additionalExts: ['cjs', 'mjs'],
  // Reduce file watching overhead
  healthCheckTimeout: 30000,
  // Ignore heavy directories
  ignored: [
    /node_modules\/.*\/node_modules\/.*/,
    /.*\/__tests__\/.*/,
    /.*\/\.(git|hg|svn)\/.*/,
    /.*\.log$/,
    /.*\.tmp$/,
  ],
};

// Optimize transformer
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    mangle: {
      keep_fnames: true,
    },
    keep_fnames: true,
  },
  // Reduce memory usage
  workerCount: Math.max(1, Math.floor(require('os').cpus().length / 2)),
};

// Reduce memory usage
config.maxWorkers = Math.max(1, Math.floor(require('os').cpus().length / 2));

module.exports = withNativeWind(config, { input: './global.css' });
EOF
    
    print_check "Metro configuration optimized"
    echo ""
}

fix_package_versions() {
    print_section "Fixing Package Version Compatibility"
    
    print_fix "Updating React Native to compatible version..."
    
    # Update React Native to the expected version
    npm install react-native@0.73.6 --save-exact
    
    print_fix "Installing missing peer dependencies..."
    
    # Install commonly missing dependencies
    npm install react-native-screens react-native-safe-area-context --save
    
    print_check "Package versions updated"
    echo ""
}

create_restart_script() {
    print_section "Creating Development Restart Script"
    
    print_fix "Creating clean restart script..."
    
    cat > scripts/clean-restart.sh << 'EOF'
#!/bin/bash

echo "🧹 Cleaning up development environment..."

# Kill all Node and Metro processes
pkill -f "node.*metro" || true
pkill -f "expo start" || true
pkill -f "react-native start" || true

# Clear Metro cache
rm -rf /tmp/metro-* || true
rm -rf /tmp/react-* || true

# Clear npm cache
npm cache clean --force

# Clear Expo cache
expo r -c || npx expo r -c || true

# Clear watchman cache if available
if command -v watchman &> /dev/null; then
    watchman watch-del-all
fi

echo "✅ Environment cleaned"

# Source limits and restart
source ~/.expo-dev-limits 2>/dev/null || true

echo "🚀 Starting Expo with optimized settings..."
export EXPO_NO_TELEMETRY=1
export CI=true
expo start --clear
EOF
    
    chmod +x scripts/clean-restart.sh
    
    print_check "Clean restart script created at scripts/clean-restart.sh"
    echo ""
}

create_connection_diagnostics() {
    print_section "Creating Connection Diagnostic Tools"
    
    print_fix "Creating connection diagnostic script..."
    
    cat > scripts/diagnose-connection.sh << 'EOF'
#!/bin/bash

echo "🔍 Diagnosing Expo connection issues..."

# Get local IP addresses
echo "📍 Available IP addresses:"
ifconfig | grep "inet " | grep -v 127.0.0.1 | while read line; do
    ip=$(echo $line | awk '{print $2}')
    echo "  - $ip"
    
    # Test if port 8081 is accessible
    if nc -z $ip 8081 2>/dev/null; then
        echo "    ✅ Port 8081 accessible"
    else
        echo "    ❌ Port 8081 not accessible"
    fi
done

# Check firewall settings
echo ""
echo "🔥 Firewall status:"
sudo pfctl -s state | grep 8081 | head -5 || echo "No active connections on port 8081"

# Test Metro bundler endpoint
echo ""
echo "🌐 Testing Metro endpoints:"
for endpoint in "http://localhost:8081" "http://127.0.0.1:8081"; do
    if curl -s "$endpoint" >/dev/null 2>&1; then
        echo "  ✅ $endpoint - accessible"
    else
        echo "  ❌ $endpoint - not accessible"
    fi
done

# Check for conflicting processes
echo ""
echo "⚡ Processes using port 8081:"
lsof -i :8081 || echo "No processes using port 8081"

echo ""
echo "📱 QR Code URL format should be: exp://[IP_ADDRESS]:8081"
EOF
    
    chmod +x scripts/diagnose-connection.sh
    
    print_check "Connection diagnostic script created"
    echo ""
}

create_error_handler_component() {
    print_section "Creating Error Handling Components"
    
    print_fix "Creating connection error handler..."
    
    mkdir -p components/error-handling
    
    cat > components/error-handling/ConnectionErrorBoundary.tsx << 'EOF'
import React, { Component, ReactNode } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: string;
}

export class ConnectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: error.message
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Connection Error Boundary caught an error:', error, errorInfo);
    
    // Log error details for debugging
    console.log('Error stack:', error.stack);
    console.log('Component stack:', errorInfo.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    // Optionally reload the app
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  handleShowDetails = () => {
    const { error } = this.state;
    Alert.alert(
      'Error Details',
      `${error?.name}: ${error?.message}\n\nStack: ${error?.stack?.slice(0, 300)}...`,
      [{ text: 'OK' }]
    );
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.emoji}>📱</Text>
            <Text style={styles.title}>Connection Error</Text>
            <Text style={styles.message}>
              Could not connect to the development server.
            </Text>
            
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Troubleshooting Steps:</Text>
              <Text style={styles.step}>1. Make sure Metro bundler is running</Text>
              <Text style={styles.step}>2. Check your network connection</Text>
              <Text style={styles.step}>3. Verify you're on the same WiFi network</Text>
              <Text style={styles.step}>4. Try restarting the Expo development server</Text>
            </View>

            <View style={styles.buttonContainer}>
              <Pressable style={styles.retryButton} onPress={this.handleRetry}>
                <Text style={styles.retryButtonText}>🔄 Retry Connection</Text>
              </Pressable>
              
              <Pressable style={styles.detailsButton} onPress={this.handleShowDetails}>
                <Text style={styles.detailsButtonText}>🔍 Show Details</Text>
              </Pressable>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#4a5568',
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#f7fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: 8,
  },
  step: {
    fontSize: 12,
    color: '#4a5568',
    marginBottom: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#3182ce',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  detailsButton: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  detailsButtonText: {
    color: '#4a5568',
    fontSize: 14,
    fontWeight: '500',
  },
});
EOF
    
    print_check "Error boundary component created"
    echo ""
}

# Performance Analysis
analyze_performance() {
    print_section "Performance Analysis"
    
    echo "📊 System Performance Metrics:"
    
    # CPU usage
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    echo "  CPU Usage: $cpu_usage%"
    
    # Memory usage
    local memory_info=$(top -l 1 | grep "PhysMem")
    echo "  Memory: $memory_info"
    
    # Disk space
    local disk_usage=$(df -h . | tail -1 | awk '{print $5}')
    echo "  Disk Usage: $disk_usage"
    
    # Network connections
    local network_connections=$(netstat -an | grep ESTABLISHED | wc -l | tr -d ' ')
    echo "  Active Network Connections: $network_connections"
    
    echo ""
}

# Main execution
main() {
    print_header
    
    echo "Starting comprehensive Expo troubleshooting analysis..."
    echo ""
    
    # Analysis phase
    check_system_resources
    check_network_connectivity
    check_expo_environment
    check_file_watchers
    analyze_performance
    
    # Fixes phase
    print_section "Applying Fixes and Optimizations"
    
    fix_file_descriptor_limits
    fix_metro_configuration
    fix_package_versions
    create_restart_script
    create_connection_diagnostics
    create_error_handler_component
    
    print_section "Next Steps"
    echo "1. Run the clean restart script: ./scripts/clean-restart.sh"
    echo "2. If issues persist, run diagnostics: ./scripts/diagnose-connection.sh"
    echo "3. Use the error boundary component in your app for better error handling"
    echo "4. Monitor system resources during development"
    echo ""
    
    print_check "Troubleshooting complete! Your Expo environment should now be more stable."
}

# Run main function
main "$@"
EOF