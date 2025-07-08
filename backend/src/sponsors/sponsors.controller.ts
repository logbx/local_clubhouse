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
import { SponsorsService } from './sponsors.service';
import { 
  CreateSponsorDto, 
  UpdateSponsorDto, 
  CreateSponsorshipTierDto, 
  UpdateSponsorshipTierDto,
  CreateCollaborationRequestDto,
  UpdateCollaborationRequestDto,
  CollaborationMessageDto,
  AddSponsorTestimonialDto,
  CreateSponsorshipPreferencesDto,
  UpdateSponsorshipPreferencesDto,
  CreateSponsorshipPackageDto,
  UpdateSponsorshipPackageDto
} from './dto/sponsor.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { Types } from 'mongoose';

@Controller('sponsors')
export class SponsorsController {
  constructor(private readonly sponsorsService: SponsorsService) {}

  // Helper method to get user ID from JWT token
  private getUserId(user: any): Types.ObjectId {
    const userId = user.sub || user.id;
    return new Types.ObjectId(userId);
  }

  // Sponsor CRUD endpoints
  @Post()
  @UseGuards(JwtAuthGuard)
  async createSponsor(@Body() createSponsorDto: CreateSponsorDto, @Request() req: any) {
    return this.sponsorsService.createSponsor(createSponsorDto, this.getUserId(req.user));
  }

  @Get()
  @Public()
  async getAllSponsors(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('location') location?: string,
    @Query('sortBy') sortBy?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 20;
    const skipNum = skip ? parseInt(skip) : 0;
    return this.sponsorsService.findAllSponsors(search, category, location, sortBy, limitNum, skipNum);
  }

  @Get('my-sponsors')
  @UseGuards(JwtAuthGuard)
  async getUserSponsors(@Request() req: any) {
    return this.sponsorsService.getUserSponsors(this.getUserId(req.user));
  }

  @Get(':username')
  @Public()
  async getSponsorByUsername(@Param('username') username: string) {
    return this.sponsorsService.findSponsorByUsername(username);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateSponsor(
    @Param('id') id: string,
    @Body() updateSponsorDto: UpdateSponsorDto,
    @Request() req: any
  ) {
    return this.sponsorsService.updateSponsor(id, updateSponsorDto, this.getUserId(req.user));
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSponsor(@Param('id') id: string, @Request() req: any) {
    return this.sponsorsService.deleteSponsor(id, this.getUserId(req.user));
  }

  @Post(':id/follow')
  @UseGuards(JwtAuthGuard)
  async followSponsor(@Param('id') id: string, @Request() req: any) {
    return this.sponsorsService.followSponsor(id, this.getUserId(req.user));
  }

  @Post(':id/unfollow')
  @UseGuards(JwtAuthGuard)
  async unfollowSponsor(@Param('id') id: string, @Request() req: any) {
    return this.sponsorsService.unfollowSponsor(id, this.getUserId(req.user));
  }

  @Get(':username/stats')
  @UseGuards(JwtAuthGuard)
  async getSponsorStats(
    @Param('username') username: string,
    @Request() req: any
  ) {
    return this.sponsorsService.getSponsorStats(username, this.getUserId(req.user));
  }

  // Sponsorship Tier endpoints
  @Post(':username/tiers')
  @UseGuards(JwtAuthGuard)
  async createSponsorshipTier(
    @Param('username') username: string,
    @Body() createTierDto: CreateSponsorshipTierDto,
    @Request() req: any
  ) {
    return this.sponsorsService.createSponsorshipTier(username, createTierDto, this.getUserId(req.user));
  }

  @Get(':username/tiers')
  @Public()
  async getSponsorshipTiers(@Param('username') username: string) {
    return this.sponsorsService.getSponsorshipTiers(username);
  }

  @Put('tiers/:tierId')
  @UseGuards(JwtAuthGuard)
  async updateSponsorshipTier(
    @Param('tierId') tierId: string,
    @Body() updateTierDto: UpdateSponsorshipTierDto,
    @Request() req: any
  ) {
    return this.sponsorsService.updateSponsorshipTier(tierId, updateTierDto, this.getUserId(req.user));
  }

  @Delete('tiers/:tierId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSponsorshipTier(@Param('tierId') tierId: string, @Request() req: any) {
    return this.sponsorsService.deleteSponsorshipTier(tierId, this.getUserId(req.user));
  }

  // Collaboration Request endpoints
  @Post(':username/collaboration-requests')
  @UseGuards(JwtAuthGuard)
  async createCollaborationRequest(
    @Param('username') username: string,
    @Body() createRequestDto: CreateCollaborationRequestDto,
    @Request() req: any
  ) {
    // Note: This assumes the club ID is passed in the request body
    // In a real implementation, you might get the club ID from the user's current context
    const clubId = req.body.clubId || req.query.clubId;
    if (!clubId) {
      throw new Error('Club ID is required for collaboration requests');
    }
    return this.sponsorsService.createCollaborationRequest(createRequestDto, this.getUserId(req.user), clubId);
  }

  @Get(':username/collaboration-requests')
  @UseGuards(JwtAuthGuard)
  async getCollaborationRequests(
    @Param('username') username: string,
    @Query('clubId') clubId?: string,
    @Request() req?: any
  ) {
    return this.sponsorsService.getCollaborationRequests(username, clubId, req?.user ? this.getUserId(req.user) : undefined);
  }

  @Get('collaboration-requests/club/:clubId')
  @UseGuards(JwtAuthGuard)
  async getClubCollaborationRequests(
    @Param('clubId') clubId: string,
    @Request() req: any
  ) {
    return this.sponsorsService.getCollaborationRequests(undefined, clubId, this.getUserId(req.user));
  }

  @Put('collaboration-requests/:requestId')
  @UseGuards(JwtAuthGuard)
  async updateCollaborationRequest(
    @Param('requestId') requestId: string,
    @Body() updateRequestDto: UpdateCollaborationRequestDto,
    @Request() req: any
  ) {
    return this.sponsorsService.updateCollaborationRequest(requestId, updateRequestDto, this.getUserId(req.user));
  }

  @Post('collaboration-requests/:requestId/messages')
  @UseGuards(JwtAuthGuard)
  async addCollaborationMessage(
    @Param('requestId') requestId: string,
    @Body() messageDto: CollaborationMessageDto,
    @Query('senderType') senderType: 'club' | 'sponsor',
    @Request() req: any
  ) {
    return this.sponsorsService.addCollaborationMessage(
      requestId, 
      messageDto, 
      this.getUserId(req.user), 
      senderType || 'club'
    );
  }

  // Testimonial endpoints
  @Post(':username/testimonials')
  @UseGuards(JwtAuthGuard)
  async addTestimonial(
    @Param('username') username: string,
    @Body() testimonialDto: AddSponsorTestimonialDto,
    @Query('clubId') clubId: string,
    @Request() req: any
  ) {
    if (!clubId) {
      throw new Error('Club ID is required for testimonials');
    }
    return this.sponsorsService.addTestimonial(username, testimonialDto, clubId);
  }

  // Helper endpoints
  @Get(':username/owner-status')
  @UseGuards(JwtAuthGuard)
  async getOwnershipStatus(
    @Param('username') username: string,
    @Request() req: any
  ) {
    const isOwner = await this.sponsorsService.isSponsorOwner(username, this.getUserId(req.user));
    return { isOwner };
  }

  // Team Management endpoints
  @Post(':id/team')
  @UseGuards(JwtAuthGuard)
  async addTeamMember(
    @Param('id') sponsorId: string,
    @Body() memberData: { email: string; role: string; permissions?: string[] },
    @Request() req: any
  ) {
    return this.sponsorsService.addTeamMember(sponsorId, req.user.sub, memberData);
  }

  @Get(':id/team')
  @UseGuards(JwtAuthGuard)
  async getTeamMembers(
    @Param('id') sponsorId: string,
    @Request() req: any
  ) {
    return this.sponsorsService.getTeamMembers(sponsorId, req.user.sub);
  }

  @Put(':id/team/:memberId')
  @UseGuards(JwtAuthGuard)
  async updateTeamMember(
    @Param('id') sponsorId: string,
    @Param('memberId') memberId: string,
    @Body() updateData: { role?: string; permissions?: string[]; isActive?: boolean },
    @Request() req: any
  ) {
    return this.sponsorsService.updateTeamMember(sponsorId, req.user.sub, memberId, updateData);
  }

  @Delete(':id/team/:memberId')
  @UseGuards(JwtAuthGuard)
  async removeTeamMember(
    @Param('id') sponsorId: string,
    @Param('memberId') memberId: string,
    @Request() req: any
  ) {
    return this.sponsorsService.removeTeamMember(sponsorId, req.user.sub, memberId);
  }

  @Post(':id/team/:memberId/transfer-leadership')
  @UseGuards(JwtAuthGuard)
  async transferLeadership(
    @Param('id') sponsorId: string,
    @Param('memberId') memberId: string,
    @Request() req: any
  ) {
    return this.sponsorsService.transferLeadership(sponsorId, req.user.sub, memberId);
  }

  // Sponsorship Preferences endpoints
  @Post(':username/preferences')
  @UseGuards(JwtAuthGuard)
  async createSponsorshipPreferences(
    @Param('username') username: string,
    @Body() preferencesDto: CreateSponsorshipPreferencesDto,
    @Request() req: any
  ) {
    return this.sponsorsService.createSponsorshipPreferences(username, preferencesDto, this.getUserId(req.user));
  }

  @Get(':username/preferences')
  @Public()
  async getSponsorshipPreferences(@Param('username') username: string) {
    return this.sponsorsService.getSponsorshipPreferences(username);
  }

  @Put(':username/preferences')
  @UseGuards(JwtAuthGuard)
  async updateSponsorshipPreferences(
    @Param('username') username: string,
    @Body() preferencesDto: UpdateSponsorshipPreferencesDto,
    @Request() req: any
  ) {
    return this.sponsorsService.updateSponsorshipPreferences(username, preferencesDto, this.getUserId(req.user));
  }

  @Delete(':username/preferences')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSponsorshipPreferences(@Param('username') username: string, @Request() req: any) {
    return this.sponsorsService.deleteSponsorshipPreferences(username, this.getUserId(req.user));
  }

  @Get('search/by-preferences')
  @Public()
  async searchSponsorsByPreferences(
    @Query('sponsorshipTypes') sponsorshipTypes?: string,
    @Query('collaborationPreference') collaborationPreference?: string,
    @Query('location') location?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 20;
    const skipNum = skip ? parseInt(skip) : 0;
    const typesArray = sponsorshipTypes ? sponsorshipTypes.split(',') : undefined;
    
    return this.sponsorsService.searchSponsorsByPreferences(
      typesArray, 
      collaborationPreference, 
      location, 
      limitNum, 
      skipNum
    );
  }

  // Sponsorship Package endpoints
  @Post(':username/packages')
  @UseGuards(JwtAuthGuard)
  async createSponsorshipPackage(
    @Param('username') username: string,
    @Body() packageDto: CreateSponsorshipPackageDto,
    @Request() req: any
  ) {
    return this.sponsorsService.createSponsorshipPackage(username, packageDto, this.getUserId(req.user));
  }

  @Get(':username/packages')
  @Public()
  async getSponsorshipPackages(@Param('username') username: string) {
    return this.sponsorsService.getSponsorshipPackages(username);
  }

  @Get('packages/:packageId')
  @Public()
  async getSponsorshipPackageById(@Param('packageId') packageId: string) {
    return this.sponsorsService.getSponsorshipPackageById(packageId);
  }

  @Put('packages/:packageId')
  @UseGuards(JwtAuthGuard)
  async updateSponsorshipPackage(
    @Param('packageId') packageId: string,
    @Body() packageDto: UpdateSponsorshipPackageDto,
    @Request() req: any
  ) {
    return this.sponsorsService.updateSponsorshipPackage(packageId, packageDto, this.getUserId(req.user));
  }

  @Delete('packages/:packageId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSponsorshipPackage(@Param('packageId') packageId: string, @Request() req: any) {
    return this.sponsorsService.deleteSponsorshipPackage(packageId, this.getUserId(req.user));
  }

  @Get('search/packages')
  @Public()
  async searchSponsorshipPackages(
    @Query('sponsorshipTypes') sponsorshipTypes?: string,
    @Query('location') location?: string,
    @Query('limit') limit?: string,
    @Query('skip') skip?: string
  ) {
    const limitNum = limit ? parseInt(limit) : 20;
    const skipNum = skip ? parseInt(skip) : 0;
    const typesArray = sponsorshipTypes ? sponsorshipTypes.split(',') : undefined;
    
    return this.sponsorsService.searchSponsorshipPackages(
      typesArray, 
      location, 
      limitNum, 
      skipNum
    );
  }

  @Post('packages/:packageId/duplicate')
  @UseGuards(JwtAuthGuard)
  async duplicateSponsorshipPackage(
    @Param('packageId') packageId: string,
    @Body() body: { newPackageName: string },
    @Request() req: any
  ) {
    return this.sponsorsService.duplicateSponsorshipPackage(
      packageId, 
      body.newPackageName, 
      this.getUserId(req.user)
    );
  }
} 