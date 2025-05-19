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
      const key = `${uuidv4()}-${body.fileName}`;
      
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
  async getSignedUrl(@Body() body: { fileName: string; fileType: string }) {
    try {
      const key = `${uuidv4()}-${body.fileName}`;
      const { signedUrl, publicUrl } = await this.s3Service.generateUploadUrl(key, body.fileType);
      
      return {
        signedUrl,
        publicUrl,
        key
      };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }
} 