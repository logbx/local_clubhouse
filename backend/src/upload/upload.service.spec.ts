import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  let service: UploadService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'APP_URL') return 'http://localhost:5000';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(UploadService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getFileUrl', () => {
    it('should return the correct file URL', () => {
      const filename = 'test-image.jpg';
      const expectedUrl = 'http://localhost:5000/uploads/test-image.jpg';
      expect(service.getFileUrl(filename)).toBe(expectedUrl);
    });

    it('should use default URL if APP_URL is not set', () => {
      jest.spyOn(configService, 'get').mockReturnValue(undefined);
      const filename = 'test-image.jpg';
      const expectedUrl = 'http://localhost:5000/uploads/test-image.jpg';
      expect(service.getFileUrl(filename)).toBe(expectedUrl);
    });
  });
}); 