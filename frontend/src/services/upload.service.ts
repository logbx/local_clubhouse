import axiosInstance from './api';

export interface UploadResponse {
  signedUrl: string;
  publicUrl: string;
  key: string;
}

export const uploadService = {
  getSignedUrl: async (fileName: string, fileType: string, folder?: string): Promise<UploadResponse> => {
    try {
      // Construct the key with the folder if provided
      const key = folder ? `${folder}/${fileName}` : fileName;
      
      console.log('[uploadService] Requesting signed URL:', {
        fileName,
        fileType,
        folder,
        key
      });

      const response = await axiosInstance.post<UploadResponse>('/upload/signed-url', {
        fileName: key,
        fileType,
      });

      console.log('[uploadService] Got signed URL response:', response.data);
      return response.data;
    } catch (error) {
      console.error('[uploadService] Error getting signed URL:', error);
      throw new Error('Failed to get upload URL');
    }
  },

  uploadToS3: async (file: File, signedUrl: string): Promise<void> => {
    try {
      console.log('[uploadService] Starting S3 upload:', {
        fileName: file.name,
        fileType: file.type,
        signedUrl: signedUrl.substring(0, 100) + '...'
      });

      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
          'x-amz-acl': 'public-read'
        },
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed with status: ${response.status}`);
      }
      
      console.log('[uploadService] File uploaded successfully to S3');
    } catch (error) {
      console.error('[uploadService] Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  },
}; 