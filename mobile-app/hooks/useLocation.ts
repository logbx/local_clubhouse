import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  altitudeAccuracy?: number;
  heading?: number;
  speed?: number;
}

export interface LocationState {
  coordinates: LocationCoordinates | null;
  error: string | null;
  loading: boolean;
  permissionStatus: Location.PermissionStatus | null;
  timestamp: number | null;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  distanceInterval?: number;
  timeInterval?: number;
  requestPermissions?: boolean;
  saveToStorage?: boolean;
  watchPosition?: boolean;
}

export interface UseLocationReturn extends LocationState {
  requestLocation: () => Promise<LocationCoordinates | null>;
  requestPermissions: () => Promise<boolean>;
  startWatching: () => Promise<void>;
  stopWatching: () => void;
  getDistance: (coord1: LocationCoordinates, coord2: LocationCoordinates) => number;
  isLocationEnabled: () => Promise<boolean>;
  openLocationSettings: () => Promise<void>;
  clearStoredLocation: () => Promise<void>;
}

const LOCATION_STORAGE_KEY = '@location_cache';
const LOCATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function useLocation(options: LocationOptions = {}): UseLocationReturn {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 60000,
    distanceInterval = 10,
    timeInterval = 5000,
    requestPermissions = true,
    saveToStorage = true,
    watchPosition = false,
  } = options;

  const [state, setState] = useState<LocationState>({
    coordinates: null,
    error: null,
    loading: false,
    permissionStatus: null,
    timestamp: null,
  });

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // Load cached location on mount
    loadCachedLocation();
    
    // Check permissions on mount
    checkPermissions();

    // Start watching if requested
    if (watchPosition && requestPermissions) {
      startWatching();
    }

    return () => {
      isMounted.current = false;
      stopWatching();
    };
  }, [watchPosition, requestPermissions]);

  const updateState = useCallback((updates: Partial<LocationState>) => {
    if (isMounted.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  const loadCachedLocation = useCallback(async () => {
    if (!saveToStorage) return;

    try {
      const cached = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
      if (cached) {
        const { coordinates, timestamp } = JSON.parse(cached);
        
        // Check if cache is still valid
        if (Date.now() - timestamp < LOCATION_CACHE_DURATION) {
          updateState({ coordinates, timestamp });
        } else {
          // Clear expired cache
          await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.warn('Failed to load cached location:', error);
    }
  }, [saveToStorage, updateState]);

  const saveCachedLocation = useCallback(async (coordinates: LocationCoordinates) => {
    if (!saveToStorage) return;

    try {
      const locationData = {
        coordinates,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
    } catch (error) {
      console.warn('Failed to save location to cache:', error);
    }
  }, [saveToStorage]);

  const checkPermissions = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      updateState({ permissionStatus: status });
      return status === Location.PermissionStatus.GRANTED;
    } catch (error) {
      console.error('Error checking location permissions:', error);
      updateState({ 
        error: 'Failed to check location permissions',
        permissionStatus: Location.PermissionStatus.UNDETERMINED 
      });
      return false;
    }
  }, [updateState]);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      updateState({ loading: true, error: null });

      // Check if location services are enabled
      const isEnabled = await Location.hasServicesEnabledAsync();
      if (!isEnabled) {
        updateState({ 
          error: 'Location services are disabled. Please enable them in settings.',
          loading: false,
          permissionStatus: Location.PermissionStatus.DENIED
        });
        return false;
      }

      // Request foreground permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      updateState({ 
        permissionStatus: status,
        loading: false
      });

      if (status !== Location.PermissionStatus.GRANTED) {
        updateState({ 
          error: 'Location permission denied. Please grant permission to use location features.',
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      updateState({ 
        error: 'Failed to request location permissions',
        loading: false,
        permissionStatus: Location.PermissionStatus.DENIED
      });
      return false;
    }
  }, [updateState]);

  const getCurrentPosition = useCallback(async (): Promise<LocationCoordinates | null> => {
    try {
      const locationOptions: Location.LocationOptions = {
        accuracy: enableHighAccuracy 
          ? Location.Accuracy.BestForNavigation 
          : Location.Accuracy.Balanced,
        timeout,
        maximumAge,
      };

      const location = await Location.getCurrentPositionAsync(locationOptions);
      
      const coordinates: LocationCoordinates = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
        altitude: location.coords.altitude || undefined,
        altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
        heading: location.coords.heading || undefined,
        speed: location.coords.speed || undefined,
      };

      return coordinates;
    } catch (error) {
      console.error('Error getting current position:', error);
      throw error;
    }
  }, [enableHighAccuracy, timeout, maximumAge]);

  const requestLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    try {
      updateState({ loading: true, error: null });

      // Check permissions first
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) {
          updateState({ loading: false });
          return null;
        }
      }

      // Get current position
      const coordinates = await getCurrentPosition();
      const timestamp = Date.now();

      updateState({ 
        coordinates, 
        timestamp, 
        loading: false,
        error: null 
      });

      // Save to cache
      if (coordinates) {
        await saveCachedLocation(coordinates);
      }

      return coordinates;
    } catch (error) {
      console.error('Error requesting location:', error);
      
      let errorMessage = 'Failed to get location';
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorMessage = 'Location request timed out. Please try again.';
        } else if (error.message.includes('permission')) {
          errorMessage = 'Location permission denied';
        } else if (error.message.includes('unavailable')) {
          errorMessage = 'Location services unavailable';
        }
      }

      updateState({ 
        error: errorMessage,
        loading: false 
      });
      return null;
    }
  }, [checkPermissions, requestPermissions, getCurrentPosition, saveCachedLocation, updateState]);

  const startWatching = useCallback(async (): Promise<void> => {
    try {
      // Stop any existing watch
      stopWatching();

      // Check permissions
      const hasPermission = await checkPermissions();
      if (!hasPermission) {
        const granted = await requestPermissions();
        if (!granted) return;
      }

      const watchOptions: Location.LocationOptions = {
        accuracy: enableHighAccuracy 
          ? Location.Accuracy.BestForNavigation 
          : Location.Accuracy.Balanced,
        timeInterval,
        distanceInterval,
      };

      watchSubscription.current = await Location.watchPositionAsync(
        watchOptions,
        (location) => {
          const coordinates: LocationCoordinates = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            accuracy: location.coords.accuracy || undefined,
            altitude: location.coords.altitude || undefined,
            altitudeAccuracy: location.coords.altitudeAccuracy || undefined,
            heading: location.coords.heading || undefined,
            speed: location.coords.speed || undefined,
          };

          const timestamp = Date.now();

          updateState({ 
            coordinates, 
            timestamp,
            error: null 
          });

          // Save to cache
          if (saveToStorage) {
            saveCachedLocation(coordinates);
          }
        }
      );
    } catch (error) {
      console.error('Error starting location watch:', error);
      updateState({ 
        error: 'Failed to start location tracking' 
      });
    }
  }, [
    checkPermissions, 
    requestPermissions, 
    enableHighAccuracy, 
    timeInterval, 
    distanceInterval, 
    saveToStorage,
    saveCachedLocation,
    updateState
  ]);

  const stopWatching = useCallback(() => {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }
  }, []);

  const getDistance = useCallback((coord1: LocationCoordinates, coord2: LocationCoordinates): number => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }, []);

  const isLocationEnabled = useCallback(async (): Promise<boolean> => {
    try {
      return await Location.hasServicesEnabledAsync();
    } catch (error) {
      console.error('Error checking if location is enabled:', error);
      return false;
    }
  }, []);

  const openLocationSettings = useCallback(async (): Promise<void> => {
    try {
      if (Platform.OS === 'ios') {
        // On iOS, we can't directly open location settings
        // We can only open the main Settings app
        await Location.enableNetworkProviderAsync();
      } else {
        // On Android, this might open location settings
        await Location.enableNetworkProviderAsync();
      }
    } catch (error) {
      console.error('Error opening location settings:', error);
    }
  }, []);

  const clearStoredLocation = useCallback(async (): Promise<void> => {
    try {
      await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
      updateState({ 
        coordinates: null, 
        timestamp: null 
      });
    } catch (error) {
      console.error('Error clearing stored location:', error);
    }
  }, [updateState]);

  return {
    ...state,
    requestLocation,
    requestPermissions,
    startWatching,
    stopWatching,
    getDistance,
    isLocationEnabled,
    openLocationSettings,
    clearStoredLocation,
  };
}