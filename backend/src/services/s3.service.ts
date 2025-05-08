import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const AWS_REGION = process.env.AWS_REGION || 'us-east-2';
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

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

export class S3Service {
  private s3Client: S3Client;
  private bucket: string;
  private region: string;

  constructor() {
    this.region = AWS_REGION;
    this.bucket = AWS_S3_BUCKET_NAME!;

    // Initialize S3 client
    this.s3Client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID!,
        secretAccessKey: AWS_SECRET_ACCESS_KEY!
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
      console.log('Generating upload URL:', { key, contentType, bucket: this.bucket });
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
      });

      console.log('Generating signed URL...');
      const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 3600 });
      console.log('Signed URL generated successfully');

      const publicUrl = `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
      
      console.log('Generated URLs:', { signedUrl, publicUrl });
      return { signedUrl, publicUrl };
    } catch (error) {
      console.error('Error generating signed URL:', error);
      throw error;
    }
  }

  async uploadFile(fileBuffer: Buffer, key: string, contentType: string): Promise<void> {
    try {
      console.log('Attempting to upload file:', {
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
      });

      console.log('Sending PutObjectCommand to S3...');
      await this.s3Client.send(command);
      console.log('File uploaded successfully');
    } catch (error) {
      console.error('Detailed S3 upload error:', error);
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
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw new Error(`Failed to delete file from S3: ${error.message}`);
    }
  }
} 