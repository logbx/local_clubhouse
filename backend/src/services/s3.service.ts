import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class S3Service implements OnModuleInit {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    const AWS_REGION = this.configService.get<string>('AWS_REGION', 'us-east-2');
    const AWS_ACCESS_KEY_ID = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const AWS_SECRET_ACCESS_KEY = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');
    const AWS_S3_BUCKET_NAME = this.configService.get<string>('AWS_S3_BUCKET_NAME');

    // Log all environment variables for debugging
    console.log('Environment variables:', {
      AWS_REGION,
      AWS_ACCESS_KEY_ID: AWS_ACCESS_KEY_ID ? '***' : undefined,
      AWS_SECRET_ACCESS_KEY: AWS_SECRET_ACCESS_KEY ? '***' : undefined,
      AWS_S3_BUCKET_NAME
    });

    // Validate required environment variables
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY || !AWS_S3_BUCKET_NAME) {
      console.error('Missing required AWS environment variables:', {
        AWS_ACCESS_KEY_ID: !!AWS_ACCESS_KEY_ID,
        AWS_SECRET_ACCESS_KEY: !!AWS_SECRET_ACCESS_KEY,
        AWS_S3_BUCKET_NAME: !!AWS_S3_BUCKET_NAME
      });
      throw new Error('Missing required AWS environment variables');
    }

    this.region = AWS_REGION;
    this.bucket = AWS_S3_BUCKET_NAME;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY
      }
    });

    // Log S3 configuration
    console.log('S3 Configuration:', {
      region: this.region,
      bucket: this.bucket,
      endpoint: `https://${this.bucket}.s3.${this.region}.amazonaws.com`
    });
  }

  async generateUploadUrl(key: string, contentType: string): Promise<{ signedUrl: string; publicUrl: string }> {
    try {
      console.log('[S3Service] Generating upload URL:', { key, contentType, bucket: this.bucket });
      
      if (!key || !contentType) {
        throw new Error('Key and contentType are required');
      }

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000',
        Metadata: {
          'x-amz-meta-content-type': contentType
        }
      });

      console.log('[S3Service] Generating signed URL with command:', {
        bucket: command.input.Bucket,
        key: command.input.Key,
        contentType: command.input.ContentType,
        acl: command.input.ACL
      });

      const signedUrl = await getSignedUrl(this.s3Client, command, { 
        expiresIn: 3600,
        signableHeaders: new Set(['host', 'x-amz-acl', 'x-amz-meta-content-type', 'content-type'])
      });
      
      console.log('[S3Service] Signed URL generated successfully');

      const publicUrl = this.getFileUrl(key);
      
      console.log('[S3Service] Generated URLs:', { 
        signedUrl: signedUrl.substring(0, 100) + '...',
        publicUrl 
      });
      
      return { signedUrl, publicUrl };
    } catch (error: any) {
      console.error('[S3Service] Error generating signed URL:', error);
      throw new Error(`Failed to generate upload URL: ${error.message}`);
    }
  }

  async uploadFile(fileBuffer: Buffer, key: string, contentType: string): Promise<void> {
    try {
      if (!fileBuffer || !key || !contentType) {
        throw new Error('FileBuffer, key, and contentType are required');
      }

      console.log('[S3Service] Attempting to upload file:', {
        key,
        contentType,
        bufferSize: fileBuffer.length,
        bucket: this.bucket
      });

      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: fileBuffer,
        ContentType: contentType,
        ACL: 'public-read',
        CacheControl: 'max-age=31536000'
      });

      console.log('[S3Service] Sending PutObjectCommand to S3...');
      await this.s3Client.send(command);
      console.log('[S3Service] File uploaded successfully');
    } catch (error: any) {
      console.error('[S3Service] Detailed S3 upload error:', error);
      throw new Error(`Failed to upload file to S3: ${error.message}`);
    }
  }

  getFileUrl(key: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      console.log('Attempting to delete file from S3:', { key, bucket: this.bucket });

      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log('File deleted successfully from S3');
    } catch (error: any) {
      console.error('Error deleting file from S3:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }
} 