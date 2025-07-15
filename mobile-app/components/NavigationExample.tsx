// Navigation Example Component - Demonstrates navigation functionality
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  ScrollView, 
  Alert,
  TextInput,
  Switch,
} from 'react-native';
import { 
  useNavigation, 
  useNavigationState, 
  useNavigationAnalytics,
  useNavigationPermissions,
  shareDeepLink,
  buildDeepLink,
  ROUTES,
} from '@/lib/navigation';

export function NavigationExample() {
  const { navigate, replace, back, canGoBack, currentRoute } = useNavigation();
  const { navigationHistory, analytics } = useNavigationState();
  const { getMostVisitedScreens, getCommonNavigationPaths } = useNavigationAnalytics();
  const { isProtectedRoute, getRequiredPermissions } = useNavigationPermissions();
  
  const [routeInput, setRouteInput] = useState('');
  const [paramsInput, setParamsInput] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  const handleNavigate = () => {
    if (!routeInput.trim()) {
      Alert.alert('Error', 'Please enter a route');
      return;
    }

    try {
      const params = paramsInput.trim() ? JSON.parse(paramsInput) : {};
      navigate(routeInput, params);
    } catch (error) {
      Alert.alert('Error', 'Invalid params JSON');
    }
  };

  const handleReplace = () => {
    if (!routeInput.trim()) {
      Alert.alert('Error', 'Please enter a route');
      return;
    }

    try {
      const params = paramsInput.trim() ? JSON.parse(paramsInput) : {};
      replace(routeInput, params);
    } catch (error) {
      Alert.alert('Error', 'Invalid params JSON');
    }
  };

  const handleQuickNavigate = (route: string, params?: any) => {
    navigate(route, params);
  };

  const handleShare = async () => {
    if (!routeInput.trim()) {
      Alert.alert('Error', 'Please enter a route');
      return;
    }

    try {
      const params = paramsInput.trim() ? JSON.parse(paramsInput) : {};
      await shareDeepLink(routeInput, params);
    } catch (error) {
      Alert.alert('Error', 'Failed to share deep link');
    }
  };

  const handleCreateDeepLink = () => {
    if (!routeInput.trim()) {
      Alert.alert('Error', 'Please enter a route');
      return;
    }

    try {
      const params = paramsInput.trim() ? JSON.parse(paramsInput) : {};
      const deepLink = buildDeepLink(routeInput, params);
      Alert.alert('Deep Link Created', deepLink);
    } catch (error) {
      Alert.alert('Error', 'Failed to create deep link');
    }
  };

  const mostVisited = getMostVisitedScreens();
  const commonPaths = getCommonNavigationPaths();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🧭 Navigation Testing</Text>
        
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Route:</Text>
          <TextInput
            style={styles.input}
            value={routeInput}
            onChangeText={setRouteInput}
            placeholder="Enter route (e.g., /(tabs)/clubs)"
            multiline={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Params (JSON):</Text>
          <TextInput
            style={styles.input}
            value={paramsInput}
            onChangeText={setParamsInput}
            placeholder='{"id": "123"}'
            multiline={true}
            numberOfLines={3}
          />
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={handleNavigate}>
            <Text style={styles.buttonText}>Navigate</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleReplace}>
            <Text style={styles.buttonText}>Replace</Text>
          </Pressable>
          <Pressable 
            style={[styles.button, !canGoBack() && styles.buttonDisabled]} 
            onPress={back}
            disabled={!canGoBack()}
          >
            <Text style={styles.buttonText}>Back</Text>
          </Pressable>
        </View>

        <View style={styles.buttonRow}>
          <Pressable style={styles.button} onPress={handleShare}>
            <Text style={styles.buttonText}>Share</Text>
          </Pressable>
          <Pressable style={styles.button} onPress={handleCreateDeepLink}>
            <Text style={styles.buttonText}>Deep Link</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>⚡ Quick Navigation</Text>
        
        <View style={styles.quickButtonGrid}>
          <Pressable 
            style={styles.quickButton} 
            onPress={() => handleQuickNavigate(ROUTES.TABS.HOME)}
          >
            <Text style={styles.quickButtonText}>Home</Text>
          </Pressable>
          
          <Pressable 
            style={styles.quickButton} 
            onPress={() => handleQuickNavigate(ROUTES.TABS.CLUBS)}
          >
            <Text style={styles.quickButtonText}>Clubs</Text>
          </Pressable>
          
          <Pressable 
            style={styles.quickButton} 
            onPress={() => handleQuickNavigate(ROUTES.TABS.EVENTS)}
          >
            <Text style={styles.quickButtonText}>Events</Text>
          </Pressable>
          
          <Pressable 
            style={styles.quickButton} 
            onPress={() => handleQuickNavigate(ROUTES.TABS.TOURNAMENTS)}
          >
            <Text style={styles.quickButtonText}>Tournaments</Text>
          </Pressable>
          
          <Pressable 
            style={styles.quickButton} 
            onPress={() => handleQuickNavigate(ROUTES.TABS.PROFILE)}
          >
            <Text style={styles.quickButtonText}>Profile</Text>
          </Pressable>
          
          <Pressable 
            style={styles.quickButton} 
            onPress={() => handleQuickNavigate(ROUTES.CLUB.CREATE)}
          >
            <Text style={styles.quickButtonText}>Create Club</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ Current State</Text>
        
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Current Route:</Text>
          <Text style={styles.infoValue}>{currentRoute || 'Unknown'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Can Go Back:</Text>
          <Text style={styles.infoValue}>{canGoBack() ? 'Yes' : 'No'}</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Protected Route:</Text>
          <Text style={styles.infoValue}>
            {currentRoute ? (isProtectedRoute(currentRoute) ? 'Yes' : 'No') : 'Unknown'}
          </Text>
        </View>

        {currentRoute && (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Required Permissions:</Text>
            <Text style={styles.infoValue}>
              {getRequiredPermissions(currentRoute).join(', ') || 'None'}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>History Length:</Text>
          <Text style={styles.infoValue}>{navigationHistory.length}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>📊 Analytics</Text>
          <Switch
            value={showAnalytics}
            onValueChange={setShowAnalytics}
          />
        </View>

        {showAnalytics && (
          <>
            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>Most Visited Screens</Text>
              {mostVisited.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.analyticsRow}>
                  <Text style={styles.analyticsLabel}>{item.screen}</Text>
                  <Text style={styles.analyticsValue}>{item.views}</Text>
                </View>
              ))}
            </View>

            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>Common Navigation Paths</Text>
              {commonPaths.slice(0, 5).map((item, index) => (
                <View key={index} style={styles.analyticsRow}>
                  <Text style={styles.analyticsLabel}>
                    {item.from} → {item.to}
                  </Text>
                  <Text style={styles.analyticsValue}>{item.count}</Text>
                </View>
              ))}
            </View>

            <View style={styles.analyticsCard}>
              <Text style={styles.analyticsTitle}>Total Screen Views</Text>
              <Text style={styles.analyticsValue}>
                {Object.values(analytics.screenViews).reduce((a, b) => a + b, 0)}
              </Text>
            </View>
          </>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔗 Deep Link Examples</Text>
        
        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>Club Detail</Text>
          <Text style={styles.exampleCode}>
            {buildDeepLink(ROUTES.CLUB.DETAIL, { id: '123' })}
          </Text>
        </View>

        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>Event Create</Text>
          <Text style={styles.exampleCode}>
            {buildDeepLink(ROUTES.EVENT.CREATE, { clubId: '456' })}
          </Text>
        </View>

        <View style={styles.exampleCard}>
          <Text style={styles.exampleTitle}>Tournament Bracket</Text>
          <Text style={styles.exampleCode}>
            {buildDeepLink(ROUTES.TOURNAMENT.BRACKET, { id: '789' })}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f9fafb',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#ffffff',
    fontSize: 14,
    color: '#1f2937',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  quickButtonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  quickButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    margin: 4,
  },
  quickButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '400',
  },
  analyticsCard: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  analyticsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  analyticsLabel: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  analyticsValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
  },
  exampleCard: {
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  exampleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  exampleCode: {
    fontSize: 12,
    color: '#6b7280',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
  },
});