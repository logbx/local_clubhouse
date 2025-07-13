import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { imageUploadService, type ImageUploadOptions, type ImageUploadResult } from './image-upload';
import type { UploadProgress } from '../db/types';

interface UploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  result: ImageUploadResult | null;
}

interface MultipleUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  results: ImageUploadResult[];
  completedCount: number;
  totalCount: number;
}

// Single image upload hook
export function useImageUpload(options: Partial<ImageUploadOptions> = {}) {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    result: null,
  });

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      result: null,
    });
  }, []);

  const uploadImage = useCallback(async (uri: string, uploadOptions?: Partial<ImageUploadOptions>) => {
    setState(prev => ({ ...prev, isUploading: true, error: null, progress: 0 }));

    try {
      const result = await imageUploadService.uploadImage(uri, {
        ...options,
        ...uploadOptions,
        onProgress: (progress: UploadProgress) => {
          setState(prev => ({ ...prev, progress: progress.percentage }));
          uploadOptions?.onProgress?.(progress);
        },
        onError: (error: Error) => {
          setState(prev => ({ ...prev, error: error.message, isUploading: false }));
          uploadOptions?.onError?.(error);
        },
        onComplete: (result: any) => {
          setState(prev => ({ ...prev, result, isUploading: false, progress: 100 }));
          uploadOptions?.onComplete?.(result);
        },
      });

      return result;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Upload failed', 
        isUploading: false 
      }));
      throw error;
    }
  }, [options]);

  const pickAndUpload = useCallback(async (uploadOptions?: Partial<ImageUploadOptions>) => {
    try {
      const result = await imageUploadService.pickImage({ ...options, ...uploadOptions });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return uploadImage(result.assets[0].uri, uploadOptions);
      }
      
      return null;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to pick image', 
        isUploading: false 
      }));
      throw error;
    }
  }, [uploadImage, options]);

  const takePhotoAndUpload = useCallback(async (uploadOptions?: Partial<ImageUploadOptions>) => {
    try {
      const result = await imageUploadService.takePhoto({ ...options, ...uploadOptions });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        return uploadImage(result.assets[0].uri, uploadOptions);
      }
      
      return null;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to take photo', 
        isUploading: false 
      }));
      throw error;
    }
  }, [uploadImage, options]);

  return {
    ...state,
    uploadImage,
    pickAndUpload,
    takePhotoAndUpload,
    reset,
  };
}

// Multiple images upload hook
export function useMultipleImageUpload(options: Partial<ImageUploadOptions> = {}) {
  const [state, setState] = useState<MultipleUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    results: [],
    completedCount: 0,
    totalCount: 0,
  });

  const reset = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      results: [],
      completedCount: 0,
      totalCount: 0,
    });
  }, []);

  const uploadMultiple = useCallback(async (uris: string[], uploadOptions?: Partial<ImageUploadOptions>) => {
    setState(prev => ({ 
      ...prev, 
      isUploading: true, 
      error: null, 
      progress: 0,
      results: [],
      completedCount: 0,
      totalCount: uris.length 
    }));

    try {
      const results = await imageUploadService.uploadMultipleImages(uris, {
        ...options,
        ...uploadOptions,
        onProgress: (progress: UploadProgress) => {
          setState(prev => ({ ...prev, progress: progress.percentage }));
          uploadOptions?.onProgress?.(progress);
        },
        onError: (error: Error) => {
          setState(prev => ({ ...prev, error: error.message, isUploading: false }));
          uploadOptions?.onError?.(error);
        },
        onComplete: (result: any) => {
          setState(prev => ({ 
            ...prev, 
            results: [...prev.results, result],
            completedCount: prev.completedCount + 1,
            isUploading: prev.completedCount + 1 < prev.totalCount,
          }));
          uploadOptions?.onComplete?.(result);
        },
      });

      setState(prev => ({ ...prev, results, isUploading: false, progress: 100 }));
      return results;
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Upload failed', 
        isUploading: false 
      }));
      throw error;
    }
  }, [options]);

  const pickMultipleAndUpload = useCallback(async (uploadOptions?: Partial<ImageUploadOptions>) => {
    try {
      const result = await imageUploadService.pickImage({ 
        ...options, 
        ...uploadOptions,
        allowsMultipleSelection: true 
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uris = result.assets.map(asset => asset.uri);
        return uploadMultiple(uris, uploadOptions);
      }
      
      return [];
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        error: error.message || 'Failed to pick images', 
        isUploading: false 
      }));
      throw error;
    }
  }, [uploadMultiple, options]);

  return {
    ...state,
    uploadMultiple,
    pickMultipleAndUpload,
    reset,
  };
}

// Avatar upload hook with preset options
export function useAvatarUpload() {
  const upload = useImageUpload({
    type: 'avatar',
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    allowsEditing: true,
  });

  const showImagePicker = useCallback(() => {
    Alert.alert(
      'Select Avatar',
      'Choose how you want to select your avatar',
      [
        {
          text: 'Camera',
          onPress: () => upload.takePhotoAndUpload(),
        },
        {
          text: 'Photo Library',
          onPress: () => upload.pickAndUpload(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [upload]);

  return {
    ...upload,
    showImagePicker,
  };
}

// Club logo upload hook with preset options
export function useClubLogoUpload() {
  const upload = useImageUpload({
    type: 'club',
    maxWidth: 512,
    maxHeight: 512,
    quality: 0.9,
    allowsEditing: true,
  });

  const showImagePicker = useCallback(() => {
    Alert.alert(
      'Select Club Logo',
      'Choose how you want to select your club logo',
      [
        {
          text: 'Camera',
          onPress: () => upload.takePhotoAndUpload(),
        },
        {
          text: 'Photo Library',
          onPress: () => upload.pickAndUpload(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [upload]);

  return {
    ...upload,
    showImagePicker,
  };
}

// Event image upload hook with preset options
export function useEventImageUpload() {
  const upload = useImageUpload({
    type: 'event',
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.8,
    allowsEditing: true,
  });

  const showImagePicker = useCallback(() => {
    Alert.alert(
      'Select Event Image',
      'Choose how you want to select your event image',
      [
        {
          text: 'Camera',
          onPress: () => upload.takePhotoAndUpload(),
        },
        {
          text: 'Photo Library',
          onPress: () => upload.pickAndUpload(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [upload]);

  return {
    ...upload,
    showImagePicker,
  };
}

// Message images upload hook (supports multiple)
export function useMessageImageUpload() {
  const singleUpload = useImageUpload({
    type: 'message',
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
  });

  const multipleUpload = useMultipleImageUpload({
    type: 'message',
    maxWidth: 1920,
    maxHeight: 1920,
    quality: 0.8,
  });

  const showImagePicker = useCallback((allowMultiple: boolean = false) => {
    Alert.alert(
      'Select Images',
      'Choose how you want to select images',
      [
        {
          text: 'Camera',
          onPress: () => singleUpload.takePhotoAndUpload(),
        },
        {
          text: allowMultiple ? 'Photo Library (Multiple)' : 'Photo Library',
          onPress: () => allowMultiple 
            ? multipleUpload.pickMultipleAndUpload()
            : singleUpload.pickAndUpload(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  }, [singleUpload, multipleUpload]);

  return {
    single: singleUpload,
    multiple: multipleUpload,
    showImagePicker,
  };
}

// Progress visualization hook
export function useUploadProgress() {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());

  const addUpload = useCallback((id: string) => {
    setUploads(prev => new Map(prev.set(id, { loaded: 0, total: 0, percentage: 0 })));
  }, []);

  const updateProgress = useCallback((id: string, progress: UploadProgress) => {
    setUploads(prev => new Map(prev.set(id, progress)));
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const getOverallProgress = useCallback(() => {
    const progresses = Array.from(uploads.values());
    if (progresses.length === 0) return { loaded: 0, total: 0, percentage: 0 };

    const totalLoaded = progresses.reduce((sum, p) => sum + p.loaded, 0);
    const totalSize = progresses.reduce((sum, p) => sum + p.total, 0);
    const percentage = totalSize > 0 ? Math.round((totalLoaded / totalSize) * 100) : 0;

    return {
      loaded: totalLoaded,
      total: totalSize,
      percentage,
    };
  }, [uploads]);

  return {
    uploads: Array.from(uploads.entries()),
    addUpload,
    updateProgress,
    removeUpload,
    getOverallProgress,
    activeUploads: uploads.size,
  };
}