import { Controller, Get, Param, Query } from '@nestjs/common';
import { InstagramService } from './instagram.service';

@Controller('instagram')
export class InstagramController {
  constructor(private readonly instagramService: InstagramService) {}

  @Get('scrape/:handle')
  async scrapeInstagramHandle(@Param('handle') handle: string) {
    return this.instagramService.scrapeInstagramHandle(handle);
  }

  @Get('test-oembed')
  async testOEmbed(@Query('url') postUrl: string) {
    if (!postUrl) {
      return {
        error: 'Please provide a post URL as query parameter: ?url=https://www.instagram.com/p/POST_ID/',
        example: 'GET /api/instagram/test-oembed?url=https://www.instagram.com/p/C_abcd123/'
      };
    }

    try {
      // Test the oEmbed functionality directly
      const result = await this.instagramService.testOEmbedPost(postUrl);
      return {
        success: true,
        url: postUrl,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        url: postUrl,
        error: error.message
      };
    }
  }

  @Get('discover/:handle')
  async discoverPosts(@Param('handle') handle: string) {
    try {
      const posts = await this.instagramService.discoverPostIds(handle);
      return {
        success: true,
        handle,
        discoveredPosts: posts.length,
        posts
      };
    } catch (error) {
      return {
        success: false,
        handle,
        error: error.message
      };
    }
  }
} 