import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Sponsor, SponsorDocument } from './schemas/sponsor.schema';
import { SponsorshipTier, SponsorshipTierDocument } from './schemas/sponsorship-tier.schema';
import { CollaborationRequest, CollaborationRequestDocument, CollaborationStatus } from './schemas/collaboration-request.schema';
import { SponsorshipPreferences, SponsorshipPreferencesDocument } from './schemas/sponsorship-preferences.schema';
import { SponsorshipPackage, SponsorshipPackageDocument } from './schemas/sponsorship-package.schema';
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
import { Club } from '../clubs/schemas/club.schema';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class SponsorsService {
  constructor(
    @InjectModel(Sponsor.name) private sponsorModel: Model<SponsorDocument>,
    @InjectModel(SponsorshipTier.name) private sponsorshipTierModel: Model<SponsorshipTierDocument>,
    @InjectModel(CollaborationRequest.name) private collaborationRequestModel: Model<CollaborationRequestDocument>,
    @InjectModel(SponsorshipPreferences.name) private sponsorshipPreferencesModel: Model<SponsorshipPreferencesDocument>,
    @InjectModel(SponsorshipPackage.name) private sponsorshipPackageModel: Model<SponsorshipPackageDocument>,
    @InjectModel('Club') private clubModel: Model<Club>,
    @InjectModel('User') private userModel: Model<User>,
  ) {}

  // Sponsor CRUD operations
  async createSponsor(createSponsorDto: CreateSponsorDto, userId: Types.ObjectId): Promise<Sponsor> {
    // Check if username already exists
    const existingSponsor = await this.sponsorModel.findOne({ username: createSponsorDto.username });
    if (existingSponsor) {
      throw new ConflictException('Username already exists');
    }

    const sponsor = new this.sponsorModel({
      ...createSponsorDto,
      createdBy: userId,
    });

    const savedSponsor = await sponsor.save();
    
    // Return the sponsor with populated data
    const populatedSponsor = await this.sponsorModel
      .findById(savedSponsor._id)
      .populate('createdBy', 'username fullName profileImage')
      .exec();

    if (!populatedSponsor) {
      throw new NotFoundException('Failed to retrieve created sponsor');
    }

    return populatedSponsor;
  }

  async findAllSponsors(search?: string, category?: string, location?: string, sortBy?: string, limit: number = 20, skip: number = 0): Promise<Sponsor[]> {
    const query = this.sponsorModel.find({ isActive: true });

    // Search filters
    if (search) {
      query.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { bio: { $regex: search, $options: 'i' } },
          { category: { $regex: search, $options: 'i' } },
        ],
      });
    }

    if (category) {
      query.find({ category: { $regex: category, $options: 'i' } });
    }

    if (location) {
      query.find({ locations: { $regex: location, $options: 'i' } });
    }

    // Sorting
    let sortOptions: any = { createdAt: -1 };
    switch (sortBy) {
      case 'most_active':
        sortOptions = { 'stats.totalEventsSponsored': -1, 'stats.activeCollaborations': -1 };
        break;
      case 'recently_added':
        sortOptions = { createdAt: -1 };
        break;
      case 'popularity':
        sortOptions = { 'followers.length': -1 };
        break;
      case 'featured':
        sortOptions = { isFeatured: -1, createdAt: -1 };
        break;
    }

    return query
      .populate('createdBy', 'username fullName profileImage')
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async findSponsorByUsername(username: string): Promise<Sponsor> {
    const sponsor = await this.sponsorModel
      .findOne({ username, isActive: true })
      .populate('createdBy', 'username fullName profileImage')
      .exec();

    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return sponsor;
  }

  async findSponsorById(id: string): Promise<Sponsor> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid sponsor ID');
    }

    const sponsor = await this.sponsorModel
      .findById(id)
      .populate('createdBy', 'username fullName profileImage')
      .exec();

    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return sponsor;
  }

  async updateSponsor(id: string, updateSponsorDto: UpdateSponsorDto, userId: Types.ObjectId): Promise<Sponsor> {
    const sponsor = await this.findSponsorById(id);

    // Check if user is the creator
    if (!sponsor.createdBy._id.equals(userId)) {
      throw new ForbiddenException('Only sponsor creators can update sponsor details');
    }

    const updatedSponsor = await this.sponsorModel
      .findByIdAndUpdate(id, updateSponsorDto, { new: true })
      .populate('createdBy', 'username fullName profileImage')
      .exec();

    return updatedSponsor!;
  }

  async deleteSponsor(id: string, userId: Types.ObjectId): Promise<void> {
    const sponsor = await this.findSponsorById(id);

    // Check if user is the creator
    if (!sponsor.createdBy._id.equals(userId)) {
      throw new ForbiddenException('Only sponsor creators can delete sponsors');
    }

    await this.sponsorModel.findByIdAndUpdate(id, { isActive: false });
  }

  async followSponsor(sponsorId: string, userId: Types.ObjectId): Promise<Sponsor> {
    const sponsor = await this.findSponsorById(sponsorId);

    // Check if user is already following
    const isFollowing = sponsor.followers.some(followerId => followerId.equals(userId));

    if (isFollowing) {
      throw new ConflictException('User is already following this sponsor');
    }

    const updatedSponsor = await this.sponsorModel
      .findByIdAndUpdate(
        sponsorId,
        { $push: { followers: userId } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .exec();

    return updatedSponsor!;
  }

  async unfollowSponsor(sponsorId: string, userId: Types.ObjectId): Promise<Sponsor> {
    const updatedSponsor = await this.sponsorModel
      .findByIdAndUpdate(
        sponsorId,
        { $pull: { followers: userId } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .exec();

    if (!updatedSponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return updatedSponsor;
  }

  async getUserSponsors(userId: Types.ObjectId): Promise<Sponsor[]> {
    return this.sponsorModel
      .find({ createdBy: userId, isActive: true })
      .populate('createdBy', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .exec();
  }

  async isSponsorOwner(sponsorUsername: string, userId: Types.ObjectId): Promise<boolean> {
    const sponsor = await this.sponsorModel
      .findOne({ username: sponsorUsername, isActive: true })
      .select('createdBy teamMembers')
      .exec();
    
    if (!sponsor) {
      return false;
    }

    // Check if user is the sponsor creator/leader
    if (sponsor.createdBy.equals(userId)) {
      return true;
    }

    // Check if user is an admin team member
    const adminMember = sponsor.teamMembers.find(member => 
      member.userId.equals(userId) && 
      member.role === 'Admin' && 
      member.isActive
    );

    return !!adminMember;
  }

  async getSponsorStats(sponsorUsername: string, ownerId: Types.ObjectId) {
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Verify owner access
    const isOwner = await this.isSponsorOwner(sponsorUsername, ownerId);
    if (!isOwner) {
      throw new ForbiddenException('Owner access required');
    }

    const totalFollowers = sponsor.followers.length;
    const totalTestimonials = sponsor.testimonials.length;
    const averageRating = sponsor.testimonials.length > 0 
      ? sponsor.testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / sponsor.testimonials.length 
      : 0;

    return {
      totalFollowers,
      totalTestimonials,
      averageRating: Math.round(averageRating * 10) / 10,
      ...sponsor.stats,
      createdAt: sponsor.createdAt,
    };
  }

  // Sponsorship Tier CRUD operations
  async createSponsorshipTier(sponsorUsername: string, createTierDto: CreateSponsorshipTierDto, userId: Types.ObjectId): Promise<SponsorshipTier> {
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Verify sponsor ownership
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can create tiers');
    }

    const tier = new this.sponsorshipTierModel({
      ...createTierDto,
      sponsorId: sponsor._id,
    });

    return tier.save();
  }

  async getSponsorshipTiers(sponsorUsername: string): Promise<SponsorshipTier[]> {
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return this.sponsorshipTierModel
      .find({ sponsorId: sponsor._id, isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .exec();
  }

  async updateSponsorshipTier(tierId: string, updateTierDto: UpdateSponsorshipTierDto, userId: Types.ObjectId): Promise<SponsorshipTier> {
    const tier = await this.sponsorshipTierModel.findById(tierId);
    
    if (!tier) {
      throw new NotFoundException('Sponsorship tier not found');
    }

    const sponsor = await this.sponsorModel.findById(tier.sponsorId);
    
    if (!sponsor || !sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can update tiers');
    }

    const updatedTier = await this.sponsorshipTierModel
      .findByIdAndUpdate(tierId, updateTierDto, { new: true })
      .exec();

    return updatedTier!;
  }

  async deleteSponsorshipTier(tierId: string, userId: Types.ObjectId): Promise<void> {
    const tier = await this.sponsorshipTierModel.findById(tierId);
    
    if (!tier) {
      throw new NotFoundException('Sponsorship tier not found');
    }

    const sponsor = await this.sponsorModel.findById(tier.sponsorId);
    
    if (!sponsor || !sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can delete tiers');
    }

    await this.sponsorshipTierModel.findByIdAndUpdate(tierId, { isActive: false });
  }

  // Collaboration Request operations
  async createCollaborationRequest(createRequestDto: CreateCollaborationRequestDto, userId: Types.ObjectId, clubId: string): Promise<CollaborationRequest> {
    const sponsor = await this.findSponsorById(createRequestDto.sponsorId);
    const club = await this.clubModel.findById(clubId);
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user is a member or admin of the club
    const isMember = club.members.some(member => member.userId.equals(userId));
    const isCreator = club.createdBy.equals(userId);
    
    if (!isMember && !isCreator) {
      throw new ForbiddenException('Only club members can create collaboration requests');
    }

    const request = new this.collaborationRequestModel({
      ...createRequestDto,
      clubId,
      requestedBy: userId,
    });

    const savedRequest = await request.save();
    
    // Update sponsor stats
    await this.sponsorModel.findByIdAndUpdate(
      createRequestDto.sponsorId,
      { $inc: { 'stats.activeCollaborations': 1 } }
    );

    const populatedRequest = await this.collaborationRequestModel
      .findById(savedRequest._id)
      .populate('sponsorId', 'name username logoUrl')
      .populate('clubId', 'name username logoUrl')
      .populate('requestedBy', 'username fullName profileImage')
      .populate('tierSelected')
      .exec();

    if (!populatedRequest) {
      throw new NotFoundException('Failed to retrieve created collaboration request');
    }

    return populatedRequest;
  }

  async getCollaborationRequests(sponsorUsername?: string, clubId?: string, userId?: Types.ObjectId): Promise<CollaborationRequest[]> {
    const query: any = { isActive: true };

    if (sponsorUsername) {
      const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
      if (!sponsor) {
        throw new NotFoundException('Sponsor not found');
      }
      query.sponsorId = sponsor._id;
    }

    if (clubId) {
      query.clubId = clubId;
    }

    return this.collaborationRequestModel
      .find(query)
      .populate('sponsorId', 'name username logoUrl')
      .populate('clubId', 'name username logoUrl')
      .populate('requestedBy', 'username fullName profileImage')
      .populate('tierSelected')
      .populate('reviewedBy', 'username fullName')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateCollaborationRequest(requestId: string, updateRequestDto: UpdateCollaborationRequestDto, userId: Types.ObjectId): Promise<CollaborationRequest> {
    const request = await this.collaborationRequestModel
      .findById(requestId)
      .populate('sponsorId')
      .exec();
    
    if (!request) {
      throw new NotFoundException('Collaboration request not found');
    }

    const sponsor = request.sponsorId as any;
    
    // Check if user is the sponsor owner
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can update collaboration requests');
    }

    const updateData = {
      ...updateRequestDto,
      reviewedBy: userId,
      reviewedAt: new Date(),
    };

    const updatedRequest = await this.collaborationRequestModel
      .findByIdAndUpdate(requestId, updateData, { new: true })
      .populate('sponsorId', 'name username logoUrl')
      .populate('clubId', 'name username logoUrl')
      .populate('requestedBy', 'username fullName profileImage')
      .populate('tierSelected')
      .populate('reviewedBy', 'username fullName')
      .exec();

    return updatedRequest!;
  }

  async addCollaborationMessage(requestId: string, messageDto: CollaborationMessageDto, userId: Types.ObjectId, senderType: 'club' | 'sponsor'): Promise<CollaborationRequest> {
    const request = await this.collaborationRequestModel.findById(requestId);
    
    if (!request) {
      throw new NotFoundException('Collaboration request not found');
    }

    const user = await this.userModel.findById(userId).select('username fullName');
    
    const message = {
      _id: new Types.ObjectId(),
      senderId: userId,
      senderName: user?.fullName || user?.username || 'Unknown',
      senderType,
      content: messageDto.content,
      createdAt: new Date(),
    };

    const updatedRequest = await this.collaborationRequestModel
      .findByIdAndUpdate(
        requestId,
        { $push: { messages: message } },
        { new: true }
      )
      .populate('sponsorId', 'name username logoUrl')
      .populate('clubId', 'name username logoUrl')
      .populate('requestedBy', 'username fullName profileImage')
      .populate('tierSelected')
      .populate('reviewedBy', 'username fullName')
      .exec();

    return updatedRequest!;
  }

  // Testimonial operations
  async addTestimonial(sponsorUsername: string, testimonialDto: AddSponsorTestimonialDto, clubId: string): Promise<Sponsor> {
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    const club = await this.clubModel.findById(clubId);
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const testimonial = {
      _id: new Types.ObjectId(),
      clubId: new Types.ObjectId(clubId),
      clubName: club.name,
      clubLogo: club.logoUrl,
      content: testimonialDto.content,
      rating: testimonialDto.rating,
      createdAt: new Date(),
    };

    const updatedSponsor = await this.sponsorModel
      .findByIdAndUpdate(
        sponsor._id,
        { $push: { testimonials: testimonial } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .exec();

    return updatedSponsor!;
  }

  // Team Management operations
  async addTeamMember(sponsorId: string, userId: Types.ObjectId, memberData: { email: string; role: string; permissions?: string[] }): Promise<SponsorDocument> {
    const sponsor = await this.sponsorModel.findById(sponsorId).exec();
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    const user = await this.userModel.findOne({ email: memberData.email });
    
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    // Check if user is sponsor owner
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can add team members');
    }

    // Check if user is already a team member
    const existingMember = sponsor.teamMembers.find(member => member.userId.equals(user._id));
    if (existingMember) {
      throw new BadRequestException('User is already a team member');
    }

    // Add team member
    sponsor.teamMembers.push({
      userId: user._id,
      role: memberData.role,
      permissions: memberData.permissions || [],
      joinedAt: new Date(),
      isActive: true,
      invitedBy: userId
    });

    await sponsor.save();
    
    const populatedSponsor = await this.sponsorModel
      .findById(sponsorId)
      .populate('createdBy', 'username fullName profileImage')
      .populate('teamMembers.userId', 'username fullName profileImage email')
      .populate('teamMembers.invitedBy', 'username fullName profileImage')
      .exec();

    if (!populatedSponsor) {
      throw new NotFoundException('Failed to retrieve updated sponsor');
    }

    return populatedSponsor;
  }

  async removeTeamMember(sponsorId: string, userId: Types.ObjectId, memberUserId: string): Promise<SponsorDocument> {
    const sponsor = await this.sponsorModel.findById(sponsorId).exec();
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }
    
    // Check if user is sponsor owner
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can remove team members');
    }

    // Remove team member
    sponsor.teamMembers = sponsor.teamMembers.filter(member => !member.userId.equals(memberUserId));
    
    await sponsor.save();
    
    const populatedSponsor = await this.sponsorModel
      .findById(sponsorId)
      .populate('createdBy', 'username fullName profileImage')
      .populate('teamMembers.userId', 'username fullName profileImage email')
      .populate('teamMembers.invitedBy', 'username fullName profileImage')
      .exec();

    if (!populatedSponsor) {
      throw new NotFoundException('Failed to retrieve updated sponsor');
    }

    return populatedSponsor;
  }

  async updateTeamMember(sponsorId: string, userId: Types.ObjectId, memberUserId: string, updateData: { role?: string; permissions?: string[]; isActive?: boolean }): Promise<SponsorDocument> {
    const sponsor = await this.sponsorModel.findById(sponsorId).exec();
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }
    
    // Check if user is sponsor owner
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can update team members');
    }

    // Find and update team member
    const memberIndex = sponsor.teamMembers.findIndex(member => member.userId.equals(memberUserId));
    if (memberIndex === -1) {
      throw new NotFoundException('Team member not found');
    }

    if (updateData.role) sponsor.teamMembers[memberIndex].role = updateData.role;
    if (updateData.permissions) sponsor.teamMembers[memberIndex].permissions = updateData.permissions;
    if (updateData.isActive !== undefined) sponsor.teamMembers[memberIndex].isActive = updateData.isActive;
    
    await sponsor.save();
    
    const populatedSponsor = await this.sponsorModel
      .findById(sponsorId)
      .populate('createdBy', 'username fullName profileImage')
      .populate('teamMembers.userId', 'username fullName profileImage email')
      .populate('teamMembers.invitedBy', 'username fullName profileImage')
      .exec();

    if (!populatedSponsor) {
      throw new NotFoundException('Failed to retrieve updated sponsor');
    }

    return populatedSponsor;
  }

  async getTeamMembers(sponsorId: string, userId: Types.ObjectId): Promise<any[]> {
    const sponsor = await this.sponsorModel
      .findById(sponsorId)
      .populate('teamMembers.userId', 'username fullName profileImage email')
      .populate('teamMembers.invitedBy', 'username fullName profileImage')
      .exec();
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Check if user is sponsor owner or team member
    const isOwner = sponsor.createdBy.equals(userId);
    const isTeamMember = sponsor.teamMembers.some(member => member.userId.equals(userId));
    
    if (!isOwner && !isTeamMember) {
      throw new ForbiddenException('Access denied');
    }

    return sponsor.teamMembers.filter(member => member.isActive);
  }

  async transferLeadership(sponsorId: string, currentOwnerId: Types.ObjectId, newOwnerId: string): Promise<SponsorDocument> {
    const sponsor = await this.sponsorModel.findById(sponsorId).exec();
    
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Check if current user is the sponsor owner
    if (!sponsor.createdBy.equals(currentOwnerId)) {
      throw new ForbiddenException('Only the current sponsor leader can transfer leadership');
    }

    // Check if the new owner is a team member
    const newOwnerMember = sponsor.teamMembers.find(member => member.userId.equals(newOwnerId));
    if (!newOwnerMember) {
      throw new BadRequestException('New leader must be an existing team member');
    }

    // Transfer leadership
    const oldOwnerId = sponsor.createdBy;
    sponsor.createdBy = new Types.ObjectId(newOwnerId);

    // Remove the new owner from team members (since they're now the leader)
    sponsor.teamMembers = sponsor.teamMembers.filter(member => !member.userId.equals(newOwnerId));

    // Add the old owner as a team member with admin role
    sponsor.teamMembers.push({
      userId: oldOwnerId,
      role: 'Admin',
      permissions: ['manage_team', 'manage_collaborations', 'manage_packages'],
      joinedAt: new Date(),
      isActive: true,
      invitedBy: new Types.ObjectId(newOwnerId)
    });

    await sponsor.save();
    
    const populatedSponsor = await this.sponsorModel
      .findById(sponsorId)
      .populate('createdBy', 'username fullName profileImage')
      .populate('teamMembers.userId', 'username fullName profileImage email')
      .populate('teamMembers.invitedBy', 'username fullName profileImage')
      .exec();

    if (!populatedSponsor) {
      throw new NotFoundException('Failed to retrieve updated sponsor');
    }

    return populatedSponsor;
  }

  // Sponsorship Preferences operations
  async createSponsorshipPreferences(sponsorUsername: string, preferencesDto: CreateSponsorshipPreferencesDto, userId: Types.ObjectId): Promise<SponsorshipPreferences> {
    // Check if user owns the sponsor
    const isOwner = await this.isSponsorOwner(sponsorUsername, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only sponsor owners can set sponsorship preferences');
    }

    // Get sponsor ID
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Check if preferences already exist
    const existingPreferences = await this.sponsorshipPreferencesModel.findOne({ sponsorId: sponsor._id });
    if (existingPreferences) {
      throw new ConflictException('Sponsorship preferences already exist. Use update instead.');
    }

    const preferences = new this.sponsorshipPreferencesModel({
      sponsorId: sponsor._id,
      ...preferencesDto,
    });

    return preferences.save();
  }

  async getSponsorshipPreferences(sponsorUsername: string): Promise<SponsorshipPreferences | null> {
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return this.sponsorshipPreferencesModel
      .findOne({ sponsorId: sponsor._id, isActive: true })
      .populate('sponsorId', 'name username logoUrl')
      .exec();
  }

  async updateSponsorshipPreferences(sponsorUsername: string, preferencesDto: UpdateSponsorshipPreferencesDto, userId: Types.ObjectId): Promise<SponsorshipPreferences> {
    // Check if user owns the sponsor
    const isOwner = await this.isSponsorOwner(sponsorUsername, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only sponsor owners can update sponsorship preferences');
    }

    // Get sponsor ID
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    const updatedPreferences = await this.sponsorshipPreferencesModel
      .findOneAndUpdate(
        { sponsorId: sponsor._id },
        preferencesDto,
        { new: true, upsert: true }
      )
      .populate('sponsorId', 'name username logoUrl')
      .exec();

    if (!updatedPreferences) {
      throw new NotFoundException('Failed to update sponsorship preferences');
    }

    return updatedPreferences;
  }

  async deleteSponsorshipPreferences(sponsorUsername: string, userId: Types.ObjectId): Promise<void> {
    // Check if user owns the sponsor
    const isOwner = await this.isSponsorOwner(sponsorUsername, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only sponsor owners can delete sponsorship preferences');
    }

    // Get sponsor ID
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    await this.sponsorshipPreferencesModel.findOneAndUpdate(
      { sponsorId: sponsor._id },
      { isActive: false }
    );
  }

  async searchSponsorsByPreferences(
    sponsorshipTypes?: string[],
    collaborationPreference?: string,
    location?: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<SponsorshipPreferences[]> {
    const query: any = { isActive: true };

    // Filter by sponsorship types
    if (sponsorshipTypes && sponsorshipTypes.length > 0) {
      query['sponsorshipTypes.type'] = { $in: sponsorshipTypes };
    }

    // Filter by collaboration preference
    if (collaborationPreference) {
      query.collaborationPreference = collaborationPreference;
    }

    let preferences = await this.sponsorshipPreferencesModel
      .find(query)
      .populate({
        path: 'sponsorId',
        match: { isActive: true },
        select: 'name username logoUrl category locations bio isVerified isFeatured stats followers'
      })
      .limit(limit)
      .skip(skip)
      .exec();

    // Filter out preferences where sponsor is null (inactive sponsors)
    preferences = preferences.filter(pref => pref.sponsorId);

    // Additional location filtering on populated sponsor data
    if (location) {
      preferences = preferences.filter(pref => {
        const sponsor = pref.sponsorId as any;
        return sponsor.locations.some((loc: string) => 
          loc.toLowerCase().includes(location.toLowerCase())
        );
      });
    }

    return preferences;
  }

  // Sponsorship Package operations
  async createSponsorshipPackage(sponsorUsername: string, packageDto: CreateSponsorshipPackageDto, userId: Types.ObjectId): Promise<SponsorshipPackage> {
    // Check if user owns the sponsor
    const isOwner = await this.isSponsorOwner(sponsorUsername, userId);
    if (!isOwner) {
      throw new ForbiddenException('Only sponsor owners can create sponsorship packages');
    }

    // Get sponsor ID
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Validate that at least one sponsorship type is selected
    const selectedTypes = packageDto.sponsorshipTypes.filter(item => item.isSelected);
    if (selectedTypes.length === 0) {
      throw new BadRequestException('At least one sponsorship type must be selected');
    }

    const sponsorshipPackage = new this.sponsorshipPackageModel({
      sponsorId: sponsor._id,
      ...packageDto,
    });

    return sponsorshipPackage.save();
  }

  async getSponsorshipPackages(sponsorUsername: string): Promise<SponsorshipPackage[]> {
    const sponsor = await this.sponsorModel.findOne({ username: sponsorUsername, isActive: true });
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    return this.sponsorshipPackageModel
      .find({ sponsorId: sponsor._id, isActive: true })
      .populate('sponsorId', 'name username logoUrl')
      .sort({ sortOrder: 1, createdAt: -1 })
      .exec();
  }

  async getSponsorshipPackageById(packageId: string): Promise<SponsorshipPackage> {
    if (!Types.ObjectId.isValid(packageId)) {
      throw new NotFoundException('Invalid package ID');
    }

    const sponsorshipPackage = await this.sponsorshipPackageModel
      .findById(packageId)
      .populate('sponsorId', 'name username logoUrl')
      .exec();

    if (!sponsorshipPackage) {
      throw new NotFoundException('Sponsorship package not found');
    }

    return sponsorshipPackage;
  }

  async updateSponsorshipPackage(packageId: string, packageDto: UpdateSponsorshipPackageDto, userId: Types.ObjectId): Promise<SponsorshipPackage> {
    const sponsorshipPackage = await this.getSponsorshipPackageById(packageId);

    // Get sponsor to check ownership
    const sponsor = await this.sponsorModel.findById(sponsorshipPackage.sponsorId);
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Check if user owns the sponsor
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can update sponsorship packages');
    }

    // If updating sponsorship types, validate that at least one is selected
    if (packageDto.sponsorshipTypes) {
      const selectedTypes = packageDto.sponsorshipTypes.filter(item => item.isSelected);
      if (selectedTypes.length === 0) {
        throw new BadRequestException('At least one sponsorship type must be selected');
      }
    }

    const updatedPackage = await this.sponsorshipPackageModel
      .findByIdAndUpdate(packageId, packageDto, { new: true })
      .populate('sponsorId', 'name username logoUrl')
      .exec();

    if (!updatedPackage) {
      throw new NotFoundException('Failed to update sponsorship package');
    }

    return updatedPackage;
  }

  async deleteSponsorshipPackage(packageId: string, userId: Types.ObjectId): Promise<void> {
    const sponsorshipPackage = await this.getSponsorshipPackageById(packageId);

    // Get sponsor to check ownership
    const sponsor = await this.sponsorModel.findById(sponsorshipPackage.sponsorId);
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Check if user owns the sponsor
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can delete sponsorship packages');
    }

    await this.sponsorshipPackageModel.findByIdAndUpdate(packageId, { isActive: false });
  }

  async searchSponsorshipPackages(
    sponsorshipTypes?: string[],
    location?: string,
    limit: number = 20,
    skip: number = 0
  ): Promise<SponsorshipPackage[]> {
    const query: any = { isActive: true };

    // Filter by sponsorship types
    if (sponsorshipTypes && sponsorshipTypes.length > 0) {
      query['sponsorshipTypes.type'] = { $in: sponsorshipTypes };
      query['sponsorshipTypes.isSelected'] = true;
    }

    let packages = await this.sponsorshipPackageModel
      .find(query)
      .populate({
        path: 'sponsorId',
        match: { isActive: true },
        select: 'name username logoUrl category locations bio isVerified isFeatured stats'
      })
      .sort({ isFeatured: -1, sortOrder: 1, createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();

    // Filter out packages where sponsor is null (inactive sponsors)
    packages = packages.filter(pkg => pkg.sponsorId);

    // Additional location filtering on populated sponsor data
    if (location) {
      packages = packages.filter(pkg => {
        const sponsor = pkg.sponsorId as any;
        return sponsor.locations.some((loc: string) => 
          loc.toLowerCase().includes(location.toLowerCase())
        );
      });
    }

    return packages;
  }

  async duplicateSponsorshipPackage(packageId: string, newPackageName: string, userId: Types.ObjectId): Promise<SponsorshipPackage> {
    const originalPackage = await this.getSponsorshipPackageById(packageId);

    // Get sponsor to check ownership
    const sponsor = await this.sponsorModel.findById(originalPackage.sponsorId);
    if (!sponsor) {
      throw new NotFoundException('Sponsor not found');
    }

    // Check if user owns the sponsor
    if (!sponsor.createdBy.equals(userId)) {
      throw new ForbiddenException('Only sponsor owners can duplicate sponsorship packages');
    }

    // Create new package with same types but different name
    const duplicatePackage = new this.sponsorshipPackageModel({
      sponsorId: originalPackage.sponsorId,
      packageName: newPackageName,
      sponsorshipTypes: originalPackage.sponsorshipTypes,
      packageDescription: originalPackage.packageDescription,
      isFeatured: false, // Reset featured status
      sortOrder: 0 // Reset sort order
    });

    return duplicatePackage.save();
  }
} 