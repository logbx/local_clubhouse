import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FriendGroupsService } from './friend-groups.service';

@Controller('friend-groups')
@UseGuards(JwtAuthGuard)
export class FriendGroupsController {
  constructor(private readonly friendGroupsService: FriendGroupsService) {}

  @Get()
  async getUserGroups(@Request() req: any) {
    const userId = req.user.sub;
    return await this.friendGroupsService.getUserGroups(userId);
  }

  @Post()
  async createGroup(@Request() req: any, @Body() body: { name: string; members: string[] }) {
    const userId = req.user.sub;
    const { name, members } = body;
    return await this.friendGroupsService.createGroup(name, members, userId);
  }

  @Post(':groupId/add-member')
  async addMember(
    @Request() req: any,
    @Param('groupId') groupId: string,
    @Body() body: { userId: string }
  ) {
    const requesterId = req.user.sub;
    const { userId } = body;
    return await this.friendGroupsService.addMemberToGroup(groupId, userId, requesterId);
  }

  @Post(':groupId/remove-member')
  async removeMember(
    @Request() req: any,
    @Param('groupId') groupId: string,
    @Body() body: { userId: string }
  ) {
    const requesterId = req.user.sub;
    const { userId } = body;
    return await this.friendGroupsService.removeMemberFromGroup(groupId, userId, requesterId);
  }

  @Get(':groupId/messages')
  async getGroupMessages(@Request() req: any, @Param('groupId') groupId: string) {
    const userId = req.user.sub;
    return await this.friendGroupsService.getGroupMessages(groupId, userId);
  }

  @Post(':groupId/messages')
  async postMessage(
    @Request() req: any,
    @Param('groupId') groupId: string,
    @Body() body: { content: string }
  ) {
    const senderId = req.user.sub;
    const { content } = body;
    return await this.friendGroupsService.postMessage(groupId, content, senderId);
  }
} 