import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupMessagesService } from './group-messages.service';
import { AuthenticatedRequest } from '../types/express';

@Controller('group-messages')
@UseGuards(JwtAuthGuard)
export class GroupMessagesController {
  constructor(private readonly groupMessagesService: GroupMessagesService) {}

  @Get()
  async getGroupMessages() {
    return await this.groupMessagesService.getGroupMessages();
  }

  @Post()
  async sendGroupMessage(
    @Request() req: AuthenticatedRequest,
    @Body() body: { content: string }
  ) {
    const userId = req.user.sub;
    const { content } = body;
    return await this.groupMessagesService.sendGroupMessage(userId, content);
  }
} 