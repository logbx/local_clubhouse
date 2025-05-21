import { Controller, Post, Body } from '@nestjs/common';
import { S3Service } from '../services/s3.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('file')
  async uploadFile(@Body() body: { file: string; fileName: string; fileType: string }) {
    try {
      // Convert base64 to buffer if needed
      const buffer = Buffer.from(body.file.split(',')[1], 'base64');
      //const key = `${uuidv4()}-${body.fileName}`;
      const key = `${body.fileName}`;
      // Upload to S3
      await this.s3Service.uploadFile(buffer, key, body.fileType);
      
      // Get the public URL
      const publicUrl = this.s3Service.getFileUrl(key);
      
      return {
        signedUrl: publicUrl,
        publicUrl,
        key
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  }

  @Post('signed-url')
  async getSignedUrl(@Body() body: { fileName: string; fileType: string; folder?: string }) {
    try {
      console.log('[UploadController] Generating signed URL:', body);

      if (!body.fileName || !body.fileType) {
        throw new Error('fileName and fileType are required');
      }

      // Generate a unique filename with UUID
      const uniqueFileName = `${uuidv4()}-${body.fileName}`;
      
      // Construct the key with folder if provided
      const key = body.folder ? `${body.folder}/${uniqueFileName}` : uniqueFileName;
      
      console.log('[UploadController] Generated key:', key);

      const { signedUrl, publicUrl } = await this.s3Service.generateUploadUrl(key, body.fileType);
      
      console.log('[UploadController] Generated URLs:', {
        signedUrl: signedUrl.substring(0, 100) + '...',
        publicUrl,
        key
      });

      return {
        signedUrl,
        publicUrl,
        key
      };
    } catch (error) {
      console.error('[UploadController] Error generating signed URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }
} 