import axiosInstance from './api';

export interface UploadResponse {
  signedUrl: string;
  publicUrl: string;
  key: string;
}

export const uploadService = {
  getSignedUrl: async (fileName: string, fileType: string): Promise<UploadResponse> => {
    try {
      const response = await axiosInstance.post<UploadResponse>('/upload/signed-url', {
        fileName,
        fileType,
      });
      console.log('Got signed URL response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error getting signed URL:', error);
      throw new Error('Failed to get upload URL');
    }
  },

  uploadToS3: async (file: File, signedUrl: string): Promise<void> => {
    try {
      console.log('Uploading to S3 with signed URL:', signedUrl);
      // Upload directly to S3 using the signed URL
      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      console.log('File uploaded successfully to S3');
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  },
}; 