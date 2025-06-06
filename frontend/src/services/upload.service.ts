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

      const response = await axiosInstance.post<UploadResponse>('/api/upload/signed-url', {
        fileName,
        fileType,
        folder,
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

      // Extract the signed headers from the URL
      const url = new URL(signedUrl);
      const signedHeaders = new Set(url.searchParams.get('X-Amz-SignedHeaders')?.split(';') || []);

      // Prepare headers in the exact order they were signed
      const headers: Record<string, string> = {};
      if (signedHeaders.has('host')) {
        headers['host'] = url.host;
      }
      if (signedHeaders.has('x-amz-acl')) {
        headers['x-amz-acl'] = 'public-read';
      }
      if (signedHeaders.has('x-amz-meta-content-type')) {
        headers['x-amz-meta-content-type'] = file.type;
      }
      if (signedHeaders.has('content-type')) {
        headers['content-type'] = file.type;
      }
      if (signedHeaders.has('x-amz-checksum-algorithm')) {
        headers['x-amz-checksum-algorithm'] = 'CRC32';
      }

      console.log('[uploadService] Uploading with headers:', headers);

      const response = await fetch(signedUrl, {
        method: 'PUT',
        body: file,
        headers,
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[uploadService] S3 upload failed:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          headers: Object.fromEntries(response.headers.entries()),
          requestHeaders: headers
        });
        throw new Error(`Upload failed with status: ${response.status}`);
      }

      console.log('[uploadService] S3 upload successful');
    } catch (error) {
      console.error('[uploadService] Error uploading file to S3:', error);
      throw new Error('Failed to upload file to S3');
    }
  },
}; 