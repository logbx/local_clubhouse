import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import * as path from 'path';
import * as fs from 'fs';

describe('UploadController (e2e)', () => {
  let app: INestApplication;
  const testImagePath = path.join(__dirname, 'test-image.jpg');

  beforeAll(async () => {
    // Create a test image file
    const imageBuffer = Buffer.from('fake image data');
    fs.writeFileSync(testImagePath, imageBuffer);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    // Clean up test image
    if (fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
    await app.close();
  });

  it('/api/upload/profile-pic (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/upload/profile-pic')
      .attach('file', testImagePath)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('url');
        expect(res.body.url).toMatch(/^http:\/\/localhost:5000\/uploads\/.+\.jpg$/);
      });
  });

  it('/api/upload/event-cover (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/upload/event-cover')
      .attach('file', testImagePath)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveProperty('url');
        expect(res.body.url).toMatch(/^http:\/\/localhost:5000\/uploads\/.+\.jpg$/);
      });
  });

  it('should reject non-image files', () => {
    const textFilePath = path.join(__dirname, 'test.txt');
    fs.writeFileSync(textFilePath, 'test content');

    return request(app.getHttpServer())
      .post('/api/upload/profile-pic')
      .attach('file', textFilePath)
      .expect(400)
      .then(() => {
        fs.unlinkSync(textFilePath);
      });
  });

  it('should reject files larger than 5MB', () => {
    const largePath = path.join(__dirname, 'large.jpg');
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
    fs.writeFileSync(largePath, largeBuffer);

    return request(app.getHttpServer())
      .post('/api/upload/profile-pic')
      .attach('file', largePath)
      .expect(413)
      .then(() => {
        fs.unlinkSync(largePath);
      });
  });
}); 