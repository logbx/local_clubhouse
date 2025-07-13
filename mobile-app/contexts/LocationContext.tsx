import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { LocationCoordinates } from '@/hooks/useLocation';
import { PermissionManager, PermissionState } from '@/lib/utils/permissions';
import { locationService, GeocodeResult } from '@/lib/services/location.service';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationState {
  currentLocation: LocationCoordinates | null;
  permissionStatus: PermissionState | null;
  addressInfo: GeocodeResult | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  isWatching: boolean;
  savedLocations: SavedLocation[];
}

interface SavedLocation {
  id: string;
  name: string;
  coordinates: LocationCoordinates;
  address: string;
  type: 'home' | 'work' | 'custom';
  createdAt: number;
}

type LocationAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_LOCATION'; payload: LocationCoordinates | null }
  | { type: 'SET_PERMISSION_STATUS'; payload: PermissionState }
  | { type: 'SET_ADDRESS_INFO'; payload: GeocodeResult | null }
  | { type: 'SET_WATCHING'; payload: boolean }
  | { type: 'SET_SAVED_LOCATIONS'; payload: SavedLocation[] }
  | { type: 'ADD_SAVED_LOCATION'; payload: SavedLocation }
  | { type: 'REMOVE_SAVED_LOCATION'; payload: string }
  | { type: 'UPDATE_TIMESTAMP' };

interface LocationContextType extends LocationState {
  requestLocation: () => Promise<LocationCoordinates | null>;
  requestPermissions: () => Promise<boolean>;
  startLocationWatching: () => Promise<void>;
  stopLocationWatching: () => void;
  saveLocation: (name: string, type: SavedLocation['type'], coordinates?: LocationCoordinates) => Promise<void>;
  removeSavedLocation: (id: string) => Promise<void>;
  setCurrentLocationAsAddress: (coordinates: LocationCoordinates) => Promise<void>;
  clearError: () => void;
  getDistanceToLocation: (coordinates: LocationCoordinates) => number | null;
  isNearLocation: (coordinates: LocationCoordinates, radiusKm?: number) => boolean;
}

const initialState: LocationState = {
  currentLocation: null,
  permissionStatus: null,
  addressInfo: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
  isWatching: false,
  savedLocations: [],
};

const STORAGE_KEYS = {
  SAVED_LOCATIONS: '@location_saved_locations',
  LAST_LOCATION: '@location_last_known',
};

function locationReducer(state: LocationState, action: LocationAction): LocationState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_CURRENT_LOCATION':
      return { 
        ...state, 
        currentLocation: action.payload,
        lastUpdated: action.payload ? Date.now() : state.lastUpdated,
        error: null,
        isLoading: false,
      };
    
    case 'SET_PERMISSION_STATUS':
      return { ...state, permissionStatus: action.payload };
    
    case 'SET_ADDRESS_INFO':
      return { ...state, addressInfo: action.payload };
    
    case 'SET_WATCHING':
      return { ...state, isWatching: action.payload };
    
    case 'SET_SAVED_LOCATIONS':
      return { ...state, savedLocations: action.payload };
    
    case 'ADD_SAVED_LOCATION':
      return { 
        ...state, 
        savedLocations: [...state.savedLocations, action.payload],
      };
    
    case 'REMOVE_SAVED_LOCATION':
      return { 
        ...state, 
        savedLocations: state.savedLocations.filter(loc => loc.id !== action.payload),
      };
    
    case 'UPDATE_TIMESTAMP':
      return { ...state, lastUpdated: Date.now() };
    
    default:
      return state;
  }
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(locationReducer, initialState);

  // Load saved data on mount
  useEffect(() => {
    loadSavedData();
    checkInitialPermissions();
  }, []);

  // Save location to storage when it changes
  useEffect(() => {
    if (state.currentLocation) {
      saveLocationToStorage(state.currentLocation);
    }
  }, [state.currentLocation]);

  // Save saved locations when they change
  useEffect(() => {
    saveSavedLocations();
  }, [state.savedLocations]);

  const loadSavedData = async () => {
    try {
      const [savedLocations, lastLocation] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.SAVED_LOCATIONS),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_LOCATION),
      ]);

      if (savedLocations) {
        dispatch({ 
          type: 'SET_SAVED_LOCATIONS', 
          payload: JSON.parse(savedLocations) 
        });
      }

      if (lastLocation) {
        const locationData = JSON.parse(lastLocation);
        // Only use cached location if it's less than 30 minutes old
        if (Date.now() - locationData.timestamp < 30 * 60 * 1000) {
          dispatch({ 
            type: 'SET_CURRENT_LOCATION', 
            payload: locationData.coordinates 
          });
        }
      }
    } catch (error) {
      console.error('Error loading saved location data:', error);
    }
  };

  const saveLocationToStorage = async (coordinates: LocationCoordinates) => {
    try {
      const locationData = {
        coordinates,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(
        STORAGE_KEYS.LAST_LOCATION, 
        JSON.stringify(locationData)
      );
    } catch (error) {
      console.error('Error saving location to storage:', error);
    }
  };

  const saveSavedLocations = async () => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.SAVED_LOCATIONS,
        JSON.stringify(state.savedLocations)
      );
    } catch (error) {
      console.error('Error saving locations:', error);
    }
  };

  const checkInitialPermissions = async () => {
    try {
      const permission = await PermissionManager.checkLocationPermission();
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission });
    } catch (error) {
      console.error('Error checking initial permissions:', error);
    }
  };

  const requestLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // Request permissions first
      const permission = await PermissionManager.requestLocationPermission();
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission });

      if (!permission.granted) {
        dispatch({ type: 'SET_ERROR', payload: 'Location permission denied' });
        return null;
      }

      // Get current location
      const coordinates = await locationService.getCurrentLocation({
        enableHighAccuracy: true,
        timeout: 15000,
      });

      if (coordinates) {
        dispatch({ type: 'SET_CURRENT_LOCATION', payload: coordinates });
        
        // Get address info in background
        setCurrentLocationAsAddress(coordinates);
        
        return coordinates;
      } else {
        dispatch({ type: 'SET_ERROR', payload: 'Failed to get location' });
        return null;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown location error';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      return null;
    }
  }, []);

  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const permission = await PermissionManager.requestLocationPermission();
      dispatch({ type: 'SET_PERMISSION_STATUS', payload: permission });
      return permission.granted;
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }, []);

  const startLocationWatching = useCallback(async (): Promise<void> => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        throw new Error('Location permission required for watching');
      }

      dispatch({ type: 'SET_WATCHING', payload: true });
      
      // This would integrate with useLocation hook for actual watching
      // For now, we'll just request location periodically
      console.log('Location watching started (placeholder implementation)');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start watching';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [requestPermissions]);

  const stopLocationWatching = useCallback((): void => {
    dispatch({ type: 'SET_WATCHING', payload: false });
    console.log('Location watching stopped');
  }, []);

  const setCurrentLocationAsAddress = useCallback(async (coordinates: LocationCoordinates): Promise<void> => {
    try {
      const addressInfo = await locationService.reverseGeocode(coordinates);
      dispatch({ type: 'SET_ADDRESS_INFO', payload: addressInfo });
    } catch (error) {
      console.error('Error getting address info:', error);
    }
  }, []);

  const saveLocation = useCallback(async (
    name: string, 
    type: SavedLocation['type'], 
    coordinates?: LocationCoordinates
  ): Promise<void> => {
    try {
      const locationCoords = coordinates || state.currentLocation;
      
      if (!locationCoords) {
        throw new Error('No coordinates available to save');
      }

      // Get address for the location
      const addressInfo = await locationService.reverseGeocode(locationCoords);
      
      const savedLocation: SavedLocation = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        coordinates: locationCoords,
        address: addressInfo?.address || 'Unknown address',
        type,
        createdAt: Date.now(),
      };

      dispatch({ type: 'ADD_SAVED_LOCATION', payload: savedLocation });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save location';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, [state.currentLocation]);

  const removeSavedLocation = useCallback(async (id: string): Promise<void> => {
    dispatch({ type: 'REMOVE_SAVED_LOCATION', payload: id });
  }, []);

  const clearError = useCallback((): void => {
    dispatch({ type: 'SET_ERROR', payload: null });
  }, []);

  const getDistanceToLocation = useCallback((coordinates: LocationCoordinates): number | null => {
    if (!state.currentLocation) return null;
    return locationService.calculateDistance(state.currentLocation, coordinates);
  }, [state.currentLocation]);

  const isNearLocation = useCallback((coordinates: LocationCoordinates, radiusKm: number = 1): boolean => {
    if (!state.currentLocation) return false;
    const distance = getDistanceToLocation(coordinates);
    return distance !== null && distance <= radiusKm;
  }, [state.currentLocation, getDistanceToLocation]);

  const contextValue: LocationContextType = {
    ...state,
    requestLocation,
    requestPermissions,
    startLocationWatching,
    stopLocationWatching,
    saveLocation,
    removeSavedLocation,
    setCurrentLocationAsAddress,
    clearError,
    getDistanceToLocation,
    isNearLocation,
  };

  return (
    <LocationContext.Provider value={contextValue}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocationContext(): LocationContextType {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error('useLocationContext must be used within a LocationProvider');
  }
  return context;
}

// Utility hook for quick location access
export function useCurrentLocation() {
  const { currentLocation, requestLocation, isLoading, error } = useLocationContext();
  
  return {
    location: currentLocation,
    requestLocation,
    isLoading,
    error,
    hasLocation: currentLocation !== null,
  };
}

// Utility hook for permission management
export function useLocationPermissions() {
  const { permissionStatus, requestPermissions } = useLocationContext();
  
  return {
    status: permissionStatus,
    isGranted: permissionStatus?.granted || false,
    canRequest: permissionStatus?.canAskAgain !== false,
    request: requestPermissions,
  };
}