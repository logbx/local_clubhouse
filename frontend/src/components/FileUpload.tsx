import { useState, useRef } from 'react';
import { uploadService } from '../services/upload.service';

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

    if (file.size > maxSize) {
      onUploadError?.(new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`));
      return;
    }

    try {
      setIsUploading(true);
      
      // Get signed URL from backend
      const response = await uploadService.getSignedUrl(file.name, file.type);
      console.log('Got signed URL response:', response);
      
      // Upload to S3 using the signed URL
      await uploadService.uploadToS3(file, response.signedUrl);
      
      // Use the public URL from the response
      onUploadComplete(response.publicUrl);
    } catch (error) {
      console.error('Upload error:', error);
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
        className={`px-4 py-2 rounded-md ${
          isUploading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
      >
        {isUploading ? 'Uploading...' : 'Upload Image'}
      </button>
    </div>
  );
}; 