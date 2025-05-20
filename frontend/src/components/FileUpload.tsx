import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { uploadService } from '../services/upload.service';

interface FileUploadProps {
  onUploadSuccess: (fileUrl: string) => void;
  onUploadError: (error: Error) => void;
  maxSize?: number; // in bytes
  accept?: string;
  buttonText?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError,
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = 'image/*',
  buttonText = 'Upload Image'
}) => {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      onUploadError(new Error('Invalid file type'));
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / (1024 * 1024);
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      onUploadError(new Error(`File size exceeds ${maxSizeMB}MB limit`));
      return;
    }

    try {
      setIsUploading(true);
      toast.info('Getting upload URL...');

      // Get signed URL
      const { signedUrl, publicUrl } = await uploadService.getSignedUrl(file.name, file.type);

      toast.info('Uploading image...');

      // Upload to S3 using signed URL
      await uploadService.uploadToS3(file, signedUrl);

      toast.success('Image uploaded successfully');
      onUploadSuccess(publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
      toast.error(errorMessage);
      onUploadError(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
          id="file-upload"
        />
        <label
          htmlFor="file-upload"
          className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white 
            ${isUploading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Uploading...
            </>
          ) : (
            buttonText
          )}
        </label>
      </div>
      <p className="text-sm text-gray-500">
        Accepted formats: JPG, PNG, GIF. Max size: {maxSize / (1024 * 1024)}MB
      </p>
    </div>
  );
}; 