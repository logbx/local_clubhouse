import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GroupMessagesService } from './group-messages.service';

interface AuthenticatedRequest {
  user: {
    sub: string;
    email: string;
    _id?: string;
    id?: string;
  };
}

@Controller('group-messages')
@UseGuards(JwtAuthGuard)
export class GroupMessagesController {
  constructor(private readonly groupMessagesService: GroupMessagesService) {}

  @Get()
  async getGroupMessages(@Request() req: AuthenticatedRequest) {
    return await this.groupMessagesService.getGroupMessages();
  }

  @Post()
  async sendGroupMessage(
    @Request() req: AuthenticatedRequest,
    @Body() body: { content: string }
  ) {
    const userId = req.user.sub || req.user._id || req.user.id;
    const { content } = body;
    return await this.groupMessagesService.sendGroupMessage(userId, content);
  }
} 