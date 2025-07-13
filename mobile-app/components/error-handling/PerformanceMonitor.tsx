import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, ScrollView } from 'react-native';
import { Platform } from 'react-native';

interface PerformanceMetrics {
  memoryUsage: number;
  renderTime: number;
  bundleLoadTime: number;
  networkLatency: number;
  errorCount: number;
  lastUpdated: string;
}

interface ConnectionStatus {
  isOnline: boolean;
  connectionType: string;
  effectiveType: string;
  rtt: number;
}

export function PerformanceMonitor({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    memoryUsage: 0,
    renderTime: 0,
    bundleLoadTime: 0,
    networkLatency: 0,
    errorCount: 0,
    lastUpdated: new Date().toISOString()
  });

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    isOnline: true,
    connectionType: 'unknown',
    effectiveType: 'unknown',
    rtt: 0
  });

  const [systemInfo, setSystemInfo] = useState({
    platform: Platform.OS,
    version: Platform.Version,
    isHermes: !!(global as any).HermesInternal,
    jsEngine: (global as any).HermesInternal ? 'Hermes' : 'JSC',
    debugMode: __DEV__
  });

  useEffect(() => {
    if (visible) {
      collectMetrics();
      const interval = setInterval(collectMetrics, 5000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  const collectMetrics = () => {
    // Memory usage (if available)
    let memoryUsage = 0;
    if (Platform.OS === 'web' && (performance as any).memory) {
      memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    // Performance timing
    let bundleLoadTime = 0;
    if (Platform.OS === 'web' && performance.timing) {
      bundleLoadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
    }

    // Network status
    if (Platform.OS === 'web' && (navigator as any).connection) {
      const connection = (navigator as any).connection;
      setConnectionStatus({
        isOnline: navigator.onLine,
        connectionType: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        rtt: connection.rtt || 0
      });
    }

    setMetrics(prev => ({
      ...prev,
      memoryUsage,
      bundleLoadTime,
      lastUpdated: new Date().toISOString()
    }));
  };

  const testNetworkLatency = async () => {
    const start = Date.now();
    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001/api';
      await fetch(`${apiUrl}/health`, { 
        method: 'HEAD',
        cache: 'no-cache'
      });
      const latency = Date.now() - start;
      setMetrics(prev => ({ ...prev, networkLatency: latency }));
    } catch (error) {
      console.warn('Network test failed:', error);
      setMetrics(prev => ({ ...prev, networkLatency: -1 }));
    }
  };

  const getStatusColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return '#10b981'; // green
    if (value <= thresholds.warning) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>📊 Performance Monitor</Text>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </Pressable>
        </View>

        <ScrollView style={styles.content}>
          {/* System Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🖥️ System Information</Text>
            <View style={styles.metricRow}>
              <Text style={styles.label}>Platform:</Text>
              <Text style={styles.value}>{systemInfo.platform} {systemInfo.version}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.label}>JS Engine:</Text>
              <Text style={styles.value}>{systemInfo.jsEngine}</Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.label}>Debug Mode:</Text>
              <Text style={[styles.value, { color: systemInfo.debugMode ? '#10b981' : '#6b7280' }]}>
                {systemInfo.debugMode ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>

          {/* Performance Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚡ Performance Metrics</Text>
            
            {Platform.OS === 'web' && metrics.memoryUsage > 0 && (
              <View style={styles.metricRow}>
                <Text style={styles.label}>Memory Usage:</Text>
                <Text style={[
                  styles.value,
                  { color: getStatusColor(metrics.memoryUsage, { good: 50, warning: 100 }) }
                ]}>
                  {metrics.memoryUsage.toFixed(1)} MB
                </Text>
              </View>
            )}

            {Platform.OS === 'web' && metrics.bundleLoadTime > 0 && (
              <View style={styles.metricRow}>
                <Text style={styles.label}>Bundle Load Time:</Text>
                <Text style={[
                  styles.value,
                  { color: getStatusColor(metrics.bundleLoadTime, { good: 2000, warning: 5000 }) }
                ]}>
                  {metrics.bundleLoadTime} ms
                </Text>
              </View>
            )}

            <View style={styles.metricRow}>
              <Text style={styles.label}>Network Latency:</Text>
              <Text style={[
                styles.value,
                { 
                  color: metrics.networkLatency === -1 
                    ? '#ef4444' 
                    : getStatusColor(metrics.networkLatency, { good: 100, warning: 500 })
                }
              ]}>
                {metrics.networkLatency === -1 ? 'Failed' : `${metrics.networkLatency} ms`}
              </Text>
            </View>
          </View>

          {/* Network Status */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌐 Network Status</Text>
            <View style={styles.metricRow}>
              <Text style={styles.label}>Online Status:</Text>
              <Text style={[
                styles.value,
                { color: connectionStatus.isOnline ? '#10b981' : '#ef4444' }
              ]}>
                {connectionStatus.isOnline ? 'Connected' : 'Offline'}
              </Text>
            </View>

            {Platform.OS === 'web' && (
              <>
                <View style={styles.metricRow}>
                  <Text style={styles.label}>Connection Type:</Text>
                  <Text style={styles.value}>{connectionStatus.connectionType}</Text>
                </View>
                <View style={styles.metricRow}>
                  <Text style={styles.label}>Effective Type:</Text>
                  <Text style={styles.value}>{connectionStatus.effectiveType}</Text>
                </View>
                {connectionStatus.rtt > 0 && (
                  <View style={styles.metricRow}>
                    <Text style={styles.label}>RTT:</Text>
                    <Text style={styles.value}>{connectionStatus.rtt} ms</Text>
                  </View>
                )}
              </>
            )}
          </View>

          {/* Environment Configuration */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>⚙️ Environment</Text>
            <View style={styles.metricRow}>
              <Text style={styles.label}>API URL:</Text>
              <Text style={styles.valueSmall}>
                {process.env.EXPO_PUBLIC_API_URL || 'Not configured'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.label}>WebSocket URL:</Text>
              <Text style={styles.valueSmall}>
                {process.env.EXPO_PUBLIC_WS_URL || 'Not configured'}
              </Text>
            </View>
            <View style={styles.metricRow}>
              <Text style={styles.label}>Environment:</Text>
              <Text style={styles.value}>
                {process.env.EXPO_PUBLIC_ENVIRONMENT || 'development'}
              </Text>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔧 Actions</Text>
            
            <Pressable style={styles.actionButton} onPress={testNetworkLatency}>
              <Text style={styles.actionButtonText}>🌐 Test Network Latency</Text>
            </Pressable>

            <Pressable 
              style={styles.actionButton} 
              onPress={() => {
                // Force garbage collection if available
                if ((global as any).gc) {
                  (global as any).gc();
                }
                collectMetrics();
              }}
            >
              <Text style={styles.actionButtonText}>🧹 Refresh Metrics</Text>
            </Pressable>

            {__DEV__ && (
              <Pressable 
                style={[styles.actionButton, styles.warningButton]} 
                onPress={() => {
                  console.log('Performance metrics:', metrics);
                  console.log('Connection status:', connectionStatus);
                  console.log('System info:', systemInfo);
                }}
              >
                <Text style={styles.actionButtonText}>📋 Log to Console</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Last updated: {new Date(metrics.lastUpdated).toLocaleTimeString()}
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6b7280',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'right',
  },
  valueSmall: {
    fontSize: 12,
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'right',
    flex: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  warningButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    alignItems: 'center',
    padding: 16,
  },
  footerText: {
    fontSize: 12,
    color: '#9ca3af',
  },
});