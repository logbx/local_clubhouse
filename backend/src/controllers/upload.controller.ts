import { Controller, Post, UseInterceptors, UploadedFile, Body } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { S3Service } from '../services/s3.service';
import { v4 as uuidv4 } from 'uuid';

@Controller('upload')
export class UploadController {
  constructor(private readonly s3Service: S3Service) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    try {
      const fileExtension = file.originalname.split('.').pop();
      const key = `${uuidv4()}-${file.originalname}`;
      
      // Upload to S3
      await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
      
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