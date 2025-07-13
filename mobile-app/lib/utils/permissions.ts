import { Platform, Alert, Linking } from 'react-native';
import * as Location from 'expo-location';
import * as Device from 'expo-device';

export interface PermissionState {
  granted: boolean;
  canAskAgain: boolean;
  status: Location.PermissionStatus;
}

export interface PermissionRequestOptions {
  showRationaleDialog?: boolean;
  rationaleTitle?: string;
  rationaleMessage?: string;
  settingsTitle?: string;
  settingsMessage?: string;
  onDenied?: () => void;
  onSettings?: () => void;
}

export class PermissionManager {
  /**
   * Check location permission status
   */
  static async checkLocationPermission(): Promise<PermissionState> {
    try {
      const { status, canAskAgain } = await Location.getForegroundPermissionsAsync();
      
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Error checking location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.UNDETERMINED,
      };
    }
  }

  /**
   * Request location permission with smart handling
   */
  static async requestLocationPermission(
    options: PermissionRequestOptions = {}
  ): Promise<PermissionState> {
    const {
      showRationaleDialog = true,
      rationaleTitle = 'Location Access',
      rationaleMessage = 'This app needs access to your location to show nearby events and provide location-based features.',
      settingsTitle = 'Permission Required',
      settingsMessage = 'Location permission is required for this feature. Please enable it in Settings.',
      onDenied,
      onSettings,
    } = options;

    try {
      // First check current status
      const currentPermission = await this.checkLocationPermission();
      
      if (currentPermission.granted) {
        return currentPermission;
      }

      // Check if location services are enabled
      const isLocationEnabled = await Location.hasServicesEnabledAsync();
      if (!isLocationEnabled) {
        this.showLocationServicesDialog();
        return {
          granted: false,
          canAskAgain: false,
          status: Location.PermissionStatus.DENIED,
        };
      }

      // Show rationale if permission was denied before and we can ask again
      if (currentPermission.status === Location.PermissionStatus.DENIED && 
          currentPermission.canAskAgain && 
          showRationaleDialog) {
        const shouldRequest = await this.showRationaleDialog(rationaleTitle, rationaleMessage);
        if (!shouldRequest) {
          onDenied?.();
          return currentPermission;
        }
      }

      // Request permission
      const { status, canAskAgain } = await Location.requestForegroundPermissionsAsync();
      
      const newPermission: PermissionState = {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };

      // Handle different outcomes
      if (status === Location.PermissionStatus.GRANTED) {
        return newPermission;
      } else if (status === Location.PermissionStatus.DENIED && !canAskAgain) {
        // Permission permanently denied - show settings dialog
        const shouldOpenSettings = await this.showSettingsDialog(settingsTitle, settingsMessage);
        if (shouldOpenSettings) {
          onSettings?.();
          await this.openAppSettings();
        } else {
          onDenied?.();
        }
      } else {
        // Permission denied but can ask again
        onDenied?.();
      }

      return newPermission;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Request background location permission (for location tracking)
   */
  static async requestBackgroundLocationPermission(): Promise<PermissionState> {
    try {
      // First ensure we have foreground permission
      const foregroundPermission = await this.requestLocationPermission();
      if (!foregroundPermission.granted) {
        return foregroundPermission;
      }

      // Request background permission
      const { status, canAskAgain } = await Location.requestBackgroundPermissionsAsync();
      
      return {
        granted: status === Location.PermissionStatus.GRANTED,
        canAskAgain,
        status,
      };
    } catch (error) {
      console.error('Error requesting background location permission:', error);
      return {
        granted: false,
        canAskAgain: false,
        status: Location.PermissionStatus.DENIED,
      };
    }
  }

  /**
   * Check if we should show permission rationale
   */
  static async shouldShowLocationRationale(): Promise<boolean> {
    const permission = await this.checkLocationPermission();
    return permission.status === Location.PermissionStatus.DENIED && permission.canAskAgain;
  }

  /**
   * Open app settings
   */
  static async openAppSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch (error) {
      console.error('Error opening app settings:', error);
    }
  }

  /**
   * Get permission status text for UI
   */
  static getPermissionStatusText(status: Location.PermissionStatus): string {
    switch (status) {
      case Location.PermissionStatus.GRANTED:
        return 'Granted';
      case Location.PermissionStatus.DENIED:
        return 'Denied';
      case Location.PermissionStatus.UNDETERMINED:
        return 'Not requested';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get device-specific permission requirements
   */
  static getDevicePermissionInfo(): {
    requiresExactLocation: boolean;
    supportsBackgroundLocation: boolean;
    platform: string;
  } {
    return {
      requiresExactLocation: Platform.OS === 'android',
      supportsBackgroundLocation: Device.isDevice,
      platform: Platform.OS,
    };
  }

  // Private helper methods

  private static showRationaleDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Not Now',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Grant Permission',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  private static showSettingsDialog(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      Alert.alert(
        title,
        message,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Open Settings',
            onPress: () => resolve(true),
          },
        ]
      );
    });
  }

  private static showLocationServicesDialog(): void {
    Alert.alert(
      'Location Services Disabled',
      'Please enable location services in your device settings to use location features.',
      [
        {
          text: 'OK',
          style: 'default',
        },
      ]
    );
  }
}

// Export utility functions for common permission scenarios
export const LocationPermissions = {
  /**
   * Quick check if location is available and granted
   */
  async isLocationAvailable(): Promise<boolean> {
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!servicesEnabled) return false;

      const permission = await PermissionManager.checkLocationPermission();
      return permission.granted;
    } catch {
      return false;
    }
  },

  /**
   * Request location with simple boolean return
   */
  async requestWithConfirmation(): Promise<boolean> {
    const permission = await PermissionManager.requestLocationPermission();
    return permission.granted;
  },

  /**
   * Request location for a specific feature with custom messaging
   */
  async requestForFeature(featureName: string): Promise<boolean> {
    const permission = await PermissionManager.requestLocationPermission({
      rationaleTitle: `${featureName} Location Access`,
      rationaleMessage: `${featureName} needs access to your location to provide the best experience.`,
      settingsTitle: `${featureName} Permission Required`,
      settingsMessage: `Please enable location permission for ${featureName} in Settings.`,
    });
    return permission.granted;
  },

  /**
   * Get detailed permission info for debugging
   */
  async getDetailedStatus(): Promise<{
    permission: PermissionState;
    servicesEnabled: boolean;
    deviceInfo: any;
  }> {
    const [permission, servicesEnabled] = await Promise.all([
      PermissionManager.checkLocationPermission(),
      Location.hasServicesEnabledAsync(),
    ]);

    return {
      permission,
      servicesEnabled,
      deviceInfo: PermissionManager.getDevicePermissionInfo(),
    };
  },
};