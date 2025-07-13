import { Platform } from 'react-native';
import * as Location from 'expo-location';
import { LocationCoordinates } from '@/hooks/useLocation';

export interface PlaceResult {
  placeId: string;
  name: string;
  address: string;
  coordinates: [number, number]; // [longitude, latitude]
  city: string;
  country: string;
  postalCode?: string;
  types: string[];
  distance?: number;
}

export interface GeocodeResult {
  coordinates: [number, number];
  address: string;
  city: string;
  country: string;
  postalCode?: string;
  district?: string;
  region?: string;
}

export interface LocationSearchOptions {
  query: string;
  location?: LocationCoordinates;
  radius?: number; // in meters
  types?: string[];
  limit?: number;
  language?: string;
  region?: string;
}

export class LocationService {
  private static instance: LocationService;
  private googleApiKey?: string;

  constructor(apiKey?: string) {
    this.googleApiKey = apiKey;
  }

  static getInstance(apiKey?: string): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService(apiKey);
    }
    return LocationService.instance;
  }

  /**
   * Convert address to coordinates using Expo's geocoding
   */
  async geocodeAddress(address: string): Promise<GeocodeResult | null> {
    try {
      const geocoded = await Location.geocodeAsync(address);
      
      if (geocoded.length === 0) {
        return null;
      }

      const result = geocoded[0];
      
      // Reverse geocode to get detailed address information
      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: result.latitude,
        longitude: result.longitude,
      });

      const addressInfo = reverseGeocode[0];

      return {
        coordinates: [result.longitude, result.latitude],
        address: this.formatAddress(addressInfo),
        city: addressInfo?.city || '',
        country: addressInfo?.country || '',
        postalCode: addressInfo?.postalCode,
        district: addressInfo?.district,
        region: addressInfo?.region,
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  /**
   * Convert coordinates to address using Expo's reverse geocoding
   */
  async reverseGeocode(coordinates: LocationCoordinates): Promise<GeocodeResult | null> {
    try {
      const geocoded = await Location.reverseGeocodeAsync({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      });

      if (geocoded.length === 0) {
        return null;
      }

      const result = geocoded[0];

      return {
        coordinates: [coordinates.longitude, coordinates.latitude],
        address: this.formatAddress(result),
        city: result.city || '',
        country: result.country || '',
        postalCode: result.postalCode,
        district: result.district,
        region: result.region,
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Search for places using Google Places API (if available) or fallback to geocoding
   */
  async searchPlaces(options: LocationSearchOptions): Promise<PlaceResult[]> {
    const { query, location, radius = 50000, limit = 10 } = options;

    // Try Google Places API first (if API key is available)
    if (this.googleApiKey) {
      try {
        return await this.searchWithGooglePlaces(options);
      } catch (error) {
        console.warn('Google Places API failed, falling back to geocoding:', error);
      }
    }

    // Fallback to basic geocoding
    return await this.searchWithGeocoding(query, location, limit);
  }

  /**
   * Get nearby places of specific types
   */
  async getNearbyPlaces(
    coordinates: LocationCoordinates,
    types: string[] = ['restaurant', 'gas_station', 'hospital'],
    radius: number = 5000,
    limit: number = 20
  ): Promise<PlaceResult[]> {
    if (this.googleApiKey) {
      try {
        return await this.getNearbyWithGooglePlaces(coordinates, types, radius, limit);
      } catch (error) {
        console.warn('Google Places nearby search failed:', error);
      }
    }

    // Return empty array if no API key or if Google Places fails
    return [];
  }

  /**
   * Calculate distance between two coordinates
   */
  calculateDistance(coord1: LocationCoordinates, coord2: LocationCoordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
    const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
  }

  /**
   * Format distance for display
   */
  formatDistance(distanceKm: number, unit: 'metric' | 'imperial' = 'metric'): string {
    if (unit === 'imperial') {
      const miles = distanceKm * 0.621371;
      if (miles < 0.1) {
        return `${Math.round(miles * 5280)} ft`;
      }
      return `${miles.toFixed(1)} mi`;
    }

    if (distanceKm < 1) {
      return `${Math.round(distanceKm * 1000)} m`;
    }
    return `${distanceKm.toFixed(1)} km`;
  }

  /**
   * Check if coordinates are within a specific radius
   */
  isWithinRadius(
    center: LocationCoordinates,
    point: LocationCoordinates,
    radiusKm: number
  ): boolean {
    const distance = this.calculateDistance(center, point);
    return distance <= radiusKm;
  }

  /**
   * Get current location with error handling
   */
  async getCurrentLocation(options: {
    timeout?: number;
    maximumAge?: number;
    enableHighAccuracy?: boolean;
  } = {}): Promise<LocationCoordinates | null> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== Location.PermissionStatus.GRANTED) {
        throw new Error('Location permission not granted');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: options.enableHighAccuracy 
          ? Location.Accuracy.BestForNavigation 
          : Location.Accuracy.Balanced,
        timeout: options.timeout || 15000,
        maximumAge: options.maximumAge || 60000,
      });

      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy || undefined,
      };
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(coordinates: LocationCoordinates): boolean {
    const { latitude, longitude } = coordinates;
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180
    );
  }

  // Private helper methods

  private formatAddress(addressInfo: Location.LocationGeocodedAddress): string {
    const parts = [
      addressInfo.streetNumber,
      addressInfo.street,
      addressInfo.city,
      addressInfo.region,
    ].filter(Boolean);

    return parts.join(', ');
  }

  private async searchWithGeocoding(
    query: string,
    location?: LocationCoordinates,
    limit: number = 10
  ): Promise<PlaceResult[]> {
    try {
      const geocoded = await Location.geocodeAsync(query);
      const results: PlaceResult[] = [];

      for (let i = 0; i < Math.min(geocoded.length, limit); i++) {
        const result = geocoded[i];
        
        // Get detailed address information
        const addressInfo = await Location.reverseGeocodeAsync({
          latitude: result.latitude,
          longitude: result.longitude,
        });

        const address = addressInfo[0];
        
        // Calculate distance if user location is provided
        let distance: number | undefined;
        if (location) {
          distance = this.calculateDistance(location, {
            latitude: result.latitude,
            longitude: result.longitude,
          });
        }

        results.push({
          placeId: `geocoded_${i}_${result.latitude}_${result.longitude}`,
          name: address?.name || query,
          address: this.formatAddress(address),
          coordinates: [result.longitude, result.latitude],
          city: address?.city || '',
          country: address?.country || '',
          postalCode: address?.postalCode,
          types: ['geocoded'],
          distance,
        });
      }

      return results;
    } catch (error) {
      console.error('Geocoding search error:', error);
      return [];
    }
  }

  private async searchWithGooglePlaces(options: LocationSearchOptions): Promise<PlaceResult[]> {
    // This would implement Google Places API search
    // For now, we'll return empty array as this requires API setup
    console.warn('Google Places API not implemented - requires API key setup');
    return [];
  }

  private async getNearbyWithGooglePlaces(
    coordinates: LocationCoordinates,
    types: string[],
    radius: number,
    limit: number
  ): Promise<PlaceResult[]> {
    // This would implement Google Places Nearby Search
    // For now, we'll return empty array as this requires API setup
    console.warn('Google Places Nearby API not implemented - requires API key setup');
    return [];
  }
}

// Export a default instance
export const locationService = LocationService.getInstance();

// Export utility functions
export const LocationUtils = {
  /**
   * Convert meters to kilometers
   */
  metersToKm: (meters: number): number => meters / 1000,

  /**
   * Convert kilometers to meters
   */
  kmToMeters: (km: number): number => km * 1000,

  /**
   * Convert degrees to radians
   */
  degToRad: (degrees: number): number => degrees * (Math.PI / 180),

  /**
   * Convert radians to degrees
   */
  radToDeg: (radians: number): number => radians * (180 / Math.PI),

  /**
   * Get bounding box for a center point and radius
   */
  getBoundingBox: (
    center: LocationCoordinates,
    radiusKm: number
  ): {
    northeast: LocationCoordinates;
    southwest: LocationCoordinates;
  } => {
    const latRadian = LocationUtils.degToRad(center.latitude);
    const degLatKm = 110.574235;
    const degLngKm = 110.572833 * Math.cos(latRadian);
    const deltaLat = radiusKm / degLatKm;
    const deltaLng = radiusKm / degLngKm;

    return {
      northeast: {
        latitude: center.latitude + deltaLat,
        longitude: center.longitude + deltaLng,
      },
      southwest: {
        latitude: center.latitude - deltaLat,
        longitude: center.longitude - deltaLng,
      },
    };
  },

  /**
   * Parse coordinates from various string formats
   */
  parseCoordinates: (coordString: string): LocationCoordinates | null => {
    try {
      // Try common formats: "lat,lng", "lat, lng", "(lat, lng)", etc.
      const cleaned = coordString.replace(/[()]/g, '').trim();
      const parts = cleaned.split(/[,\s]+/).map(part => parseFloat(part.trim()));
      
      if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
        return {
          latitude: parts[0],
          longitude: parts[1],
        };
      }
      return null;
    } catch {
      return null;
    }
  },
};