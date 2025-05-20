import React, { useState } from 'react';
import axios from 'axios';

interface ImageUploadProps {
  endpoint: string; // e.g., 'profile-image' or 'event-cover'
  onUploadSuccess: (url: string) => void;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  endpoint,
  onUploadSuccess,
  className = ''
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    try {
      setIsUploading(true);

      // Step 1: Request presigned URL from your backend
      const { data } = await axios.post('/api/s3/presign', {
        filename: file.name,
        filetype: file.type,
        endpoint,
      });

      const { presignedUrl, key } = data;

      // Step 2: Upload to S3 directly
      await fetch(presignedUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file
      });

      // Step 3: Return public URL
      const bucket = import.meta.env.VITE_S3_BUCKET;
      const region = import.meta.env.VITE_S3_REGION;
      const publicUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
      onUploadSuccess(publicUrl);
    } catch (err) {
      console.error('Image upload error:', err);
      setError('Failed to upload image.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className={className}>
      <input
        type="file"
        accept="image/*"
        disabled={isUploading}
        onChange={handleFileChange}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
      />
      {isUploading && <p className="text-sm text-gray-500 mt-2">Uploading...</p>}
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
};
