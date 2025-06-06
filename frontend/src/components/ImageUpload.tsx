import React, { useState } from 'react';
import { uploadService } from '../services/upload.service';
import { toast } from 'react-hot-toast';

interface ImageUploadProps {
  endpoint: string; // e.g., 'profile-image' or 'event-cover'
  onUploadSuccess: (url: string) => void;
  className?: string;
  currentImage?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  endpoint,
  onUploadSuccess,
  className = '',
  currentImage
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    console.log('[ImageUpload] File selected:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified
    });

    setError(null);
    const toastId = 'image-upload';

    try {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('[ImageUpload] Invalid file type:', file.type);
        setError('Please select an image file');
        toast.error('Please select an image file', { id: toastId });
        return;
      }

      // Validate file size (5MB limit)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (file.size > maxSize) {
        console.error('[ImageUpload] File too large:', {
          size: file.size,
          maxSize,
          sizeInMB: file.size / (1024 * 1024)
        });
        setError('Image size should be less than 5MB');
        toast.error('Image size should be less than 5MB', { id: toastId });
        return;
      }

      setIsUploading(true);
      toast.loading('Preparing upload...', { id: toastId });

      console.log('[ImageUpload] Getting signed URL for:', file.name);
      const { signedUrl, publicUrl } = await uploadService.getSignedUrl(
        file.name,
        file.type,
        endpoint
      );
      console.log('[ImageUpload] Got signed URL:', {
        signedUrl: signedUrl.substring(0, 50) + '...',
        publicUrl
      });

      toast.loading('Uploading image...', { id: toastId });
      
      // Upload to S3
      await uploadService.uploadToS3(file, signedUrl);

      console.log('[ImageUpload] Upload successful');
      
      // Notify parent component
      onUploadSuccess(publicUrl);
      
      toast.success('Image uploaded successfully', { id: toastId });
    } catch (err) {
      console.error('[ImageUpload] Upload failed:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload image';
      setError(errorMessage);
      toast.error(errorMessage, { id: toastId });
    } finally {
      setIsUploading(false);
      e.target.value = ''; // Reset input
    }
  };

  return (
    <div className={className}>
      <div className="flex flex-col items-center space-y-4">
        <div className="relative w-full">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100
              disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {isUploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-5 w-5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="text-sm text-gray-600">Uploading...</span>
              </div>
            </div>
          )}
        </div>
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
        <p className="text-xs text-gray-500">
          Accepted formats: JPG, PNG, GIF. Max size: 5MB
        </p>
      </div>
    </div>
  );
};
