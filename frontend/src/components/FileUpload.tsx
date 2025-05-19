import { useState, useRef } from 'react';
import { uploadService } from '../services/upload.service';
import { toast } from 'react-toastify';

interface FileUploadProps {
  onUploadComplete: (fileUrl: string) => void;
  onUploadError?: (error: Error) => void;
  accept?: string;
  maxSize?: number; // in bytes
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  onUploadError,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024, // 5MB default
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      onUploadError?.(new Error('Invalid file type. Please select an image.'));
      return;
    }

    // Validate file size
    if (file.size > maxSize) {
      const maxSizeMB = maxSize / 1024 / 1024;
      toast.error(`File size must be less than ${maxSizeMB}MB`);
      onUploadError?.(new Error(`File size must be less than ${maxSizeMB}MB`));
      return;
    }

    try {
      setIsUploading(true);
      toast.info('Getting upload URL...');
      console.log('Starting file upload process for:', file.name);
      
      // Get signed URL from backend
      const response = await uploadService.getSignedUrl(file.name, file.type);
      console.log('Got signed URL response:', response);
      
      toast.info('Uploading image...');
      // Upload to S3 using the signed URL
      const uploadResponse = await fetch(response.signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-amz-acl': 'public-read'
        },
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }
      
      console.log('File uploaded successfully to S3');
      toast.success('Image uploaded successfully');
      onUploadComplete(response.publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMessage);
      onUploadError?.(error instanceof Error ? error : new Error('Upload failed'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept={accept}
        className="hidden"
        disabled={isUploading}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className={`px-4 py-2 rounded-md transition-colors duration-200 ${
          isUploading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isUploading ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Uploading...
          </span>
        ) : (
          'Upload Image'
        )}
      </button>
      <p className="mt-1 text-xs text-gray-500">
        {accept === 'image/*' ? 'PNG, JPG up to 5MB' : 'File upload'}
      </p>
    </div>
  );
}; 