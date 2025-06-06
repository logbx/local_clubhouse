import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { uploadService } from '../services/upload.service';
import { PhotoIcon, ClipboardIcon } from '@heroicons/react/24/outline';

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
  const [isDragOver, setIsDragOver] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle paste events
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      // Only handle paste if the dropzone is in focus or if no specific element is focused
      if (dropZoneRef.current && (document.activeElement === dropZoneRef.current || 
          document.activeElement === document.body)) {
        e.preventDefault();
        
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              await handleFileUpload(file);
              break;
            }
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, []);

  const handleFileUpload = async (file: File) => {
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
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const imageFile = files.find(file => file.type.startsWith('image/'));
    
    if (imageFile) {
      await handleFileUpload(imageFile);
    } else {
      toast.error('Please drop an image file');
      onUploadError(new Error('Invalid file type'));
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <div className="w-full">
      <div 
        ref={dropZoneRef}
        tabIndex={0}
        role="button"
        aria-label="Upload image by clicking, dragging, or pasting"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${isDragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${isUploading ? 'pointer-events-none opacity-75' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          disabled={isUploading}
          className="hidden"
        />
        
        {isUploading ? (
          <div className="flex flex-col items-center space-y-2">
            <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-sm text-gray-600">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3">
            <div className="flex items-center space-x-2">
              <PhotoIcon className="h-8 w-8 text-gray-400" />
              <ClipboardIcon className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                {buttonText}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Click to browse, drag & drop, or paste an image
              </p>
            </div>
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <span>JPG, PNG, GIF</span>
              <span>•</span>
              <span>Max {maxSize / (1024 * 1024)}MB</span>
            </div>
          </div>
        )}
        
        {isDragOver && (
          <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg flex items-center justify-center">
            <p className="text-blue-700 font-medium">Drop image here</p>
          </div>
        )}
      </div>
      
      <div className="mt-2 text-xs text-gray-600">
        💡 <strong>Tip:</strong> You can paste images directly from your clipboard by clicking in the upload area and pressing Ctrl+V (or Cmd+V on Mac)
      </div>
    </div>
  );
}; 