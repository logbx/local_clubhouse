import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';
import { BadRequestException } from '@nestjs/common';

describe('UploadService', () => {
  let service: UploadService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        AWS_REGION: 'us-east-1',
        AWS_ACCESS_KEY_ID: 'test-access-key',
        AWS_SECRET_ACCESS_KEY: 'test-secret-key',
        AWS_S3_BUCKET: 'test-bucket',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get(UploadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw BadRequestException if AWS config is missing', async () => {
    const invalidConfigService = {
      get: jest.fn(() => undefined),
    };

    await expect(async () => {
      await Test.createTestingModule({
        providers: [
          UploadService,
          {
            provide: ConfigService,
            useValue: invalidConfigService,
          },
        ],
      }).compile();
    }).rejects.toThrow(BadRequestException);
  });

  describe('getSignedUrl', () => {
    it('should return a signed URL with key and public URL', async () => {
      const result = await service.getSignedUrl('test-file.jpg', 'image/jpeg');
      
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('publicUrl');
      expect(result.key).toContain('test-file.jpg');
      expect(result.publicUrl).toContain('test-bucket.s3.amazonaws.com');
    });
  });
}); 