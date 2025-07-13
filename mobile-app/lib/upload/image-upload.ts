import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiClient } from '../api-client-new';
import type { UploadProgress, UploadOptions } from '../db/types';

export interface ImageUploadOptions extends UploadOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  compress?: boolean;
  allowsEditing?: boolean;
  allowsMultipleSelection?: boolean;
  type?: 'avatar' | 'club' | 'event' | 'tournament' | 'message';
}

export interface ImageUploadResult {
  id: string;
  url: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  size: number;
}

class ImageUploadService {
  private defaultOptions: Partial<ImageUploadOptions> = {
    quality: 0.8,
    maxWidth: 1920,
    maxHeight: 1920,
    compress: true,
    allowsEditing: true,
    allowsMultipleSelection: false,
  };

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Camera roll permissions are required');
      }
      
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      if (cameraStatus.status !== 'granted') {
        console.warn('Camera permissions not granted');
        return status === 'granted';
      }
      
      return true;
    }
    return true;
  }

  async pickImage(options: ImageUploadOptions = {}): Promise<ImagePicker.ImagePickerResult> {
    await this.requestPermissions();
    
    const config = { ...this.defaultOptions, ...options };

    return ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: config.allowsEditing,
      allowsMultipleSelection: config.allowsMultipleSelection,
      quality: config.quality,
      aspect: config.type === 'avatar' ? [1, 1] : undefined,
    });
  }

  async takePhoto(options: ImageUploadOptions = {}): Promise<ImagePicker.ImagePickerResult> {
    await this.requestPermissions();
    
    const config = { ...this.defaultOptions, ...options };

    return ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: config.allowsEditing,
      quality: config.quality,
      aspect: config.type === 'avatar' ? [1, 1] : undefined,
    });
  }

  async processImage(
    uri: string, 
    options: ImageUploadOptions = {}
  ): Promise<{ uri: string; width: number; height: number }> {
    const config = { ...this.defaultOptions, ...options };
    
    if (Platform.OS === 'web') {
      // For web, return as-is since we can't process images the same way
      return { uri, width: 0, height: 0 };
    }

    const manipulateOptions: ImageManipulator.ImageManipulateOptions[] = [];

    // Resize if needed
    if (config.maxWidth || config.maxHeight) {
      manipulateOptions.push({
        resize: {
          width: config.maxWidth,
          height: config.maxHeight,
        },
      });
    }

    // Add compression if enabled
    const saveOptions: ImageManipulator.SaveOptions = {
      compress: config.quality || 0.8,
      format: ImageManipulator.SaveFormat.JPEG,
    };

    if (manipulateOptions.length > 0 || config.compress) {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        manipulateOptions,
        saveOptions
      );
      
      return result;
    }

    return { uri, width: 0, height: 0 };
  }

  async uploadImage(
    uri: string,
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult> {
    const config = { ...this.defaultOptions, ...options };
    
    // Process image before upload
    const processedImage = await this.processImage(uri, config);
    
    // Create FormData
    const formData = new FormData();
    
    if (Platform.OS === 'web') {
      // For web, convert URI to blob
      const response = await fetch(processedImage.uri);
      const blob = await response.blob();
      formData.append('image', blob, 'image.jpg');
    } else {
      // For mobile, use file URI
      formData.append('image', {
        uri: processedImage.uri,
        type: 'image/jpeg',
        name: 'image.jpg',
      } as any);
    }

    // Add metadata
    formData.append('type', config.type || 'general');
    if (processedImage.width) {
      formData.append('width', processedImage.width.toString());
    }
    if (processedImage.height) {
      formData.append('height', processedImage.height.toString());
    }

    // Upload with progress tracking
    return apiClient.upload('/upload/image', formData, {
      onProgress: config.onProgress,
      onComplete: config.onComplete,
      onError: config.onError,
    });
  }

  async uploadMultipleImages(
    uris: string[],
    options: ImageUploadOptions = {}
  ): Promise<ImageUploadResult[]> {
    const results: ImageUploadResult[] = [];
    const total = uris.length;
    
    for (let i = 0; i < uris.length; i++) {
      const uri = uris[i];
      
      try {
        const result = await this.uploadImage(uri, {
          ...options,
          onProgress: (progress) => {
            // Calculate overall progress
            const overallProgress: UploadProgress = {
              loaded: i * progress.total + progress.loaded,
              total: total * progress.total,
              percentage: Math.round(((i * progress.total + progress.loaded) / (total * progress.total)) * 100),
            };
            options.onProgress?.(overallProgress);
          },
        });
        
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload image ${i + 1}:`, error);
        options.onError?.(error as Error);
        throw error;
      }
    }

    return results;
  }

  // Preset configurations for common use cases
  async uploadAvatar(uri: string, options: Partial<ImageUploadOptions> = {}): Promise<ImageUploadResult> {
    return this.uploadImage(uri, {
      type: 'avatar',
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.9,
      allowsEditing: true,
      ...options,
    });
  }

  async uploadClubLogo(uri: string, options: Partial<ImageUploadOptions> = {}): Promise<ImageUploadResult> {
    return this.uploadImage(uri, {
      type: 'club',
      maxWidth: 512,
      maxHeight: 512,
      quality: 0.9,
      allowsEditing: true,
      ...options,
    });
  }

  async uploadEventImage(uri: string, options: Partial<ImageUploadOptions> = {}): Promise<ImageUploadResult> {
    return this.uploadImage(uri, {
      type: 'event',
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 0.8,
      allowsEditing: true,
      ...options,
    });
  }

  async uploadMessageImage(uri: string, options: Partial<ImageUploadOptions> = {}): Promise<ImageUploadResult> {
    return this.uploadImage(uri, {
      type: 'message',
      maxWidth: 1920,
      maxHeight: 1920,
      quality: 0.8,
      compress: true,
      ...options,
    });
  }

  // Helper methods for common workflows
  async pickAndUploadAvatar(options: Partial<ImageUploadOptions> = {}): Promise<ImageUploadResult | null> {
    try {
      const result = await this.pickImage({
        type: 'avatar',
        allowsEditing: true,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return this.uploadAvatar(result.assets[0].uri, options);
      }

      return null;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }

  async takeAndUploadPhoto(options: Partial<ImageUploadOptions> = {}): Promise<ImageUploadResult | null> {
    try {
      const result = await this.takePhoto(options);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return this.uploadImage(result.assets[0].uri, options);
      }

      return null;
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }

  async pickAndUploadMultiple(options: Partial<ImageUploadOptions> = {}): Promise<ImageUploadResult[]> {
    try {
      const result = await this.pickImage({
        allowsMultipleSelection: true,
        ...options,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(asset => asset.uri);
        return this.uploadMultipleImages(uris, options);
      }

      return [];
    } catch (error) {
      options.onError?.(error as Error);
      throw error;
    }
  }

  // Utility functions
  getImageDimensions(uri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      if (Platform.OS === 'web') {
        const img = new Image();
        img.onload = () => {
          resolve({ width: img.width, height: img.height });
        };
        img.onerror = reject;
        img.src = uri;
      } else {
        // For mobile, we'd need to use a different approach
        // For now, return default values
        resolve({ width: 0, height: 0 });
      }
    });
  }

  calculateOptimalDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    const aspectRatio = originalWidth / originalHeight;
    
    let newWidth = originalWidth;
    let newHeight = originalHeight;

    if (newWidth > maxWidth) {
      newWidth = maxWidth;
      newHeight = newWidth / aspectRatio;
    }

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    };
  }

  // File size estimation
  estimateFileSize(width: number, height: number, quality: number = 0.8): number {
    // Rough estimation: JPEG compression typically achieves 10:1 compression
    // This is a very rough estimate and actual results will vary
    const uncompressedSize = width * height * 3; // 3 bytes per pixel (RGB)
    const compressionRatio = 10 * (1 - quality + 0.1); // Adjust based on quality
    return Math.round(uncompressedSize / compressionRatio);
  }

  // Validation helpers
  validateImageType(uri: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerUri = uri.toLowerCase();
    return validExtensions.some(ext => lowerUri.endsWith(ext));
  }

  validateImageSize(size: number, maxSizeBytes: number = 10 * 1024 * 1024): boolean {
    return size <= maxSizeBytes; // Default 10MB limit
  }
}

export const imageUploadService = new ImageUploadService();
export default imageUploadService;