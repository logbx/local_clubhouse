import { 
  Controller, 
  Get, 
  Post, 
  Put,
  Patch,
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { ClubsService } from './clubs.service';
import { CreateClubDto, UpdateClubDto, AddClubCommentDto, ChatMessageDto, UpdateMemberRoleDto, UpdateClubProfileDto, CreateClubGroupChatDto, UpdateClubGroupChatDto, AddGroupChatMemberDto, GroupChatMessageDto } from './dto/club.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { ClubAdminGuard } from './guards/club-admin.guard';
import { Types } from 'mongoose';

@Controller('clubs')
export class ClubsController {
  constructor(private readonly clubsService: ClubsService) {}

  // Helper method to get user ID from JWT token
  private getUserId(user: any): Types.ObjectId {
    const userId = user.sub || user.id;
    return new Types.ObjectId(userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createClub(@Body() createClubDto: CreateClubDto, @Request() req: any) {
    return this.clubsService.create(createClubDto, this.getUserId(req.user));
  }

  @Get()
  @Public()
  async getAllClubs(@Query('search') search?: string) {
    return this.clubsService.findAll(search);
  }

  @Get('my-clubs')
  @UseGuards(JwtAuthGuard)
  async getUserClubs(@Request() req: any) {
    return this.clubsService.getUserClubs(this.getUserId(req.user));
  }

  @Get(':username')
  @Public()
  async getClubByUsername(@Param('username') username: string) {
    return this.clubsService.findByUsername(username);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateClub(
    @Param('id') id: string,
    @Body() updateClubDto: UpdateClubDto,
    @Request() req: any
  ) {
    return this.clubsService.update(id, updateClubDto, this.getUserId(req.user));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteClub(@Param('id') id: string, @Request() req: any) {
    return this.clubsService.delete(id, this.getUserId(req.user));
  }

  @Post(':id/join')
  @UseGuards(JwtAuthGuard)
  async joinClub(@Param('id') id: string, @Request() req: any) {
    return this.clubsService.joinClub(id, this.getUserId(req.user));
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  async leaveClub(@Param('id') id: string, @Request() req: any) {
    return this.clubsService.leaveClub(id, this.getUserId(req.user));
  }

  @Post(':username/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(
    @Param('username') username: string,
    @Body() addCommentDto: AddClubCommentDto,
    @Request() req: any
  ) {
    return this.clubsService.addComment(username, addCommentDto);
  }

  // Chat endpoints
  @Get(':username/chat')
  @UseGuards(JwtAuthGuard)
  async getChatMessages(
    @Param('username') username: string,
    @Request() req: any
  ) {
    return this.clubsService.getChatMessages(username, this.getUserId(req.user));
  }

  @Post(':username/chat')
  @UseGuards(JwtAuthGuard)
  async sendChatMessage(
    @Param('username') username: string,
    @Body() chatMessageDto: ChatMessageDto,
    @Request() req: any
  ) {
    return this.clubsService.sendChatMessage(
      username, 
      this.getUserId(req.user), 
      chatMessageDto,
      req.user.fullName || req.user.username,
      req.user.profileImage
    );
  }

  // Member management endpoints
  @Get(':username/members')
  @Public()
  async getClubMembers(
    @Param('username') username: string,
    @Request() req: any
  ) {
    // For public access, userId is optional
    const userId = req.user ? this.getUserId(req.user) : undefined;
    return this.clubsService.getClubMembers(username, userId);
  }

  @Put(':username/members/role')
  @UseGuards(JwtAuthGuard)
  async updateMemberRole(
    @Param('username') username: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Request() req: any
  ) {
    return this.clubsService.updateMemberRole(username, this.getUserId(req.user), updateRoleDto);
  }

  @Delete(':username/members/:memberId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeMember(
    @Param('username') username: string,
    @Param('memberId') memberId: string,
    @Request() req: any
  ) {
    return this.clubsService.removeMember(username, this.getUserId(req.user), memberId);
  }

  // Helper endpoints
  @Get(':username/membership-status')
  @UseGuards(JwtAuthGuard)
  async getMembershipStatus(
    @Param('username') username: string,
    @Request() req: any
  ) {
    const [isMember, isAdmin] = await Promise.all([
      this.clubsService.isUserMember(username, this.getUserId(req.user)),
      this.clubsService.isUserAdmin(username, this.getUserId(req.user))
    ]);

    return { isMember, isAdmin };
  }

  @Get(':username/events-count')
  @UseGuards(JwtAuthGuard)
  async getClubEventsCount(
    @Param('username') username: string,
    @Request() req: any
  ) {
    const count = await this.clubsService.getClubEventsCount(username);
    return { count };
  }

  // Admin-only endpoints
  @Get(':username/admin')
  @UseGuards(JwtAuthGuard, ClubAdminGuard)
  async getClubForAdmin(
    @Param('username') username: string,
    @Request() req: any
  ) {
    return this.clubsService.getClubForAdmin(username, this.getUserId(req.user));
  }

  @Get(':username/admin/stats')
  @UseGuards(JwtAuthGuard, ClubAdminGuard)
  async getClubStats(
    @Param('username') username: string,
    @Request() req: any
  ) {
    return this.clubsService.getClubStats(username, this.getUserId(req.user));
  }

  @Patch(':username/admin/profile')
  @UseGuards(JwtAuthGuard, ClubAdminGuard)
  async updateClubProfile(
    @Param('username') username: string,
    @Body() updateProfileDto: UpdateClubProfileDto,
    @Request() req: any
  ) {
    console.log('[ClubsController] Received update profile request:', {
      username,
      bodyKeys: Object.keys(req.body),
      updateProfileDto: JSON.stringify(updateProfileDto, null, 2),
      socialLinksCount: updateProfileDto.socialLinks?.length || 0,
      socialLinks: updateProfileDto.socialLinks
    });
    
    return this.clubsService.updateClubProfile(
      username, 
      this.getUserId(req.user), 
      updateProfileDto
    );
  }

  @Delete(':username/admin/comments/:commentId')
  @UseGuards(JwtAuthGuard, ClubAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteComment(
    @Param('username') username: string,
    @Param('commentId') commentId: string,
    @Request() req: any
  ) {
    await this.clubsService.deleteComment(
      username, 
      this.getUserId(req.user), 
      commentId
    );
  }

  // Group chat endpoints
  @Post(':username/group-chats')
  @UseGuards(JwtAuthGuard)
  async createGroupChat(
    @Param('username') username: string,
    @Body() createGroupChatDto: CreateClubGroupChatDto,
    @Request() req: any
  ) {
    return this.clubsService.createGroupChat(username, this.getUserId(req.user), createGroupChatDto);
  }

  @Get(':username/group-chats')
  @UseGuards(JwtAuthGuard)
  async getClubGroupChats(
    @Param('username') username: string,
    @Request() req: any
  ) {
    return this.clubsService.getClubGroupChats(username, this.getUserId(req.user));
  }

  @Put(':username/group-chats/:groupChatId')
  @UseGuards(JwtAuthGuard)
  async updateGroupChat(
    @Param('username') username: string,
    @Param('groupChatId') groupChatId: string,
    @Body() updateGroupChatDto: UpdateClubGroupChatDto,
    @Request() req: any
  ) {
    return this.clubsService.updateGroupChat(username, groupChatId, this.getUserId(req.user), updateGroupChatDto);
  }

  @Delete(':username/group-chats/:groupChatId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteGroupChat(
    @Param('username') username: string,
    @Param('groupChatId') groupChatId: string,
    @Request() req: any
  ) {
    return this.clubsService.deleteGroupChat(username, groupChatId, this.getUserId(req.user));
  }

  @Post(':username/group-chats/:groupChatId/members')
  @UseGuards(JwtAuthGuard)
  async addGroupChatMember(
    @Param('username') username: string,
    @Param('groupChatId') groupChatId: string,
    @Body() addGroupChatMemberDto: AddGroupChatMemberDto,
    @Request() req: any
  ) {
    return this.clubsService.addGroupChatMember(username, groupChatId, this.getUserId(req.user), addGroupChatMemberDto);
  }

  @Delete(':username/group-chats/:groupChatId/members/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeGroupChatMember(
    @Param('username') username: string,
    @Param('groupChatId') groupChatId: string,
    @Param('userId') userId: string,
    @Request() req: any
  ) {
    return this.clubsService.removeGroupChatMember(username, groupChatId, this.getUserId(req.user), userId);
  }

  @Get(':username/group-chats/:groupChatId/messages')
  @UseGuards(JwtAuthGuard)
  async getGroupChatMessages(
    @Param('username') username: string,
    @Param('groupChatId') groupChatId: string,
    @Request() req: any
  ) {
    return this.clubsService.getGroupChatMessages(username, groupChatId, this.getUserId(req.user));
  }

  @Post(':username/group-chats/:groupChatId/messages')
  @UseGuards(JwtAuthGuard)
  async sendGroupChatMessage(
    @Param('username') username: string,
    @Param('groupChatId') groupChatId: string,
    @Body() groupChatMessageDto: GroupChatMessageDto,
    @Request() req: any
  ) {
    return this.clubsService.sendGroupChatMessage(
      username, 
      groupChatId,
      this.getUserId(req.user), 
      groupChatMessageDto,
      req.user.fullName || req.user.username,
      req.user.profileImage
    );
  }
} 