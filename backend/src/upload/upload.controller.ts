import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('profile-pic')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePic(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileUrl = this.uploadService.getFileUrl(file.filename);
    return { url: fileUrl };
  }

  @Post('event-cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadEventCover(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileUrl = this.uploadService.getFileUrl(file.filename);
    return { url: fileUrl };
  }
} 