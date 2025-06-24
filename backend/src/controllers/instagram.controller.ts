import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import { InstagramService } from '../services/instagram.service';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('scrape/:handle')
  async scrapeInstagramPosts(@Param('handle') handle: string) {
    try {
      const posts = await this.instagramService.scrapeInstagramPosts(handle);
      return { posts };
    } catch (error) {
      throw new HttpException(
        `Failed to scrape Instagram posts: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
} 