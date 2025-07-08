import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Club, ClubDocument } from './schemas/club.schema';
import { ClubGroupChat, ClubGroupChatDocument } from './schemas/club-group-chat.schema';
import { CreateClubDto, UpdateClubDto, AddClubCommentDto, ChatMessageDto, UpdateMemberRoleDto, UpdateClubProfileDto, CreateClubGroupChatDto, UpdateClubGroupChatDto, AddGroupChatMemberDto, GroupChatMessageDto } from './dto/club.dto';
import { IEvent } from '../models/event.model';

@Injectable()
export class ClubsService {
  constructor(
    @InjectModel(Club.name) private clubModel: Model<ClubDocument>,
    @InjectModel(ClubGroupChat.name) private clubGroupChatModel: Model<ClubGroupChatDocument>,
    @InjectModel('Event') private eventModel: Model<IEvent>,
  ) {}

  async create(createClubDto: CreateClubDto, userId: Types.ObjectId): Promise<Club> {
    // Check if username already exists
    const existingClub = await this.clubModel.findOne({ username: createClubDto.username });
    if (existingClub) {
      throw new ConflictException('Username already exists');
    }

    const club = new this.clubModel({
      ...createClubDto,
      createdBy: userId,
      club_founder: userId, // Set the club founder explicitly
      members: [{ userId, role: 'admin', joinedAt: new Date() }], // Creator automatically becomes first admin
    });

    const savedClub = await club.save();
    
    // Return the club with populated data
    const populatedClub = await this.clubModel
      .findById(savedClub._id)
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    if (!populatedClub) {
      throw new NotFoundException('Failed to retrieve created club');
    }

    return populatedClub;
  }

  async findAll(search?: string, limit: number = 20, skip: number = 0): Promise<Club[]> {
    const query = this.clubModel.find({ isActive: true });

    if (search) {
      query.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ],
      });
    }

    return query
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .exec();
  }

  async findByUsername(username: string): Promise<Club> {
    const club = await this.clubModel
      .findOne({ username, isActive: true })
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return club;
  }

  async findById(id: string): Promise<Club> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Invalid club ID');
    }

    const club = await this.clubModel
      .findById(id)
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    if (!club) {
      throw new NotFoundException('Club not found');
    }

    return club;
  }

  async update(id: string, updateClubDto: UpdateClubDto, userId: Types.ObjectId): Promise<Club> {
    const club = await this.findById(id);

    // Check if user is the creator or club founder
    if (!club.createdBy._id.equals(userId) && !club.club_founder?._id?.equals(userId)) {
      throw new ForbiddenException('Only club creators can update club details');
    }

    const updatedClub = await this.clubModel
      .findByIdAndUpdate(id, updateClubDto, { new: true })
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    return updatedClub!;
  }

  async delete(id: string, userId: Types.ObjectId): Promise<void> {
    const club = await this.findById(id);

    // Check if user is the creator or club founder
    if (!club.createdBy._id.equals(userId) && !club.club_founder?._id?.equals(userId)) {
      throw new ForbiddenException('Only club creators can delete clubs');
    }

    await this.clubModel.findByIdAndUpdate(id, { isActive: false });
  }

  async joinClub(clubId: string, userId: Types.ObjectId): Promise<Club> {
    const club = await this.findById(clubId);

    // Check if user is already a member
    const isMember = club.members.some(member => 
      member.userId && member.userId.equals(userId)
    );

    if (isMember) {
      throw new ConflictException('User is already a member of this club');
    }

    const updatedClub = await this.clubModel
      .findByIdAndUpdate(
        clubId,
        { $push: { members: { userId, role: 'member', joinedAt: new Date() } } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    return updatedClub!;
  }

  async leaveClub(clubId: string, userId: Types.ObjectId): Promise<Club> {
    const club = await this.findById(clubId);

    // Check if user is the creator or club founder
    if (club.createdBy._id.equals(userId) || club.club_founder?._id?.equals(userId)) {
      throw new ForbiddenException('Club creators cannot leave their own club');
    }

    const updatedClub = await this.clubModel
      .findByIdAndUpdate(
        clubId,
        { $pull: { members: { userId } } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    return updatedClub!;
  }

  async addComment(clubUsername: string, commentDto: AddClubCommentDto): Promise<Club> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const comment = {
      _id: new Types.ObjectId(),
      ...commentDto,
      createdAt: new Date(),
    };

    const updatedClub = await this.clubModel
      .findByIdAndUpdate(
        club._id,
        { $push: { comments: comment } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    return updatedClub!;
  }

  async getUserClubs(userId: Types.ObjectId): Promise<Club[]> {
    return this.clubModel
      .find({ 
        'members.userId': userId,
        isActive: true 
      })
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .exec();
  }

  // Chat functionality
  async getChatMessages(clubUsername: string, userId: Types.ObjectId): Promise<Club['chatMessages']> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true })
      .populate('chatMessages.senderId', 'username fullName profileImage')
      .exec();
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user is a member
    const isMember = club.members.some(member => member.userId && member.userId.equals(userId));
    if (!isMember) {
      throw new ForbiddenException('Only club members can access chat');
    }

    // Transform messages to ensure senderName and senderProfileImage are populated
    const populatedMessages = club.chatMessages.map(message => {
      const sender = message.senderId as any; // This will be populated by mongoose
      return {
        _id: message._id,
        senderId: message.senderId,
        senderName: message.senderName || sender?.fullName || sender?.username || 'Unknown User',
        senderProfileImage: message.senderProfileImage || sender?.profileImage || null,
        content: message.content,
        createdAt: message.createdAt
      };
    });

    return populatedMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  async sendChatMessage(clubUsername: string, userId: Types.ObjectId, chatMessageDto: ChatMessageDto, senderName: string, senderProfileImage?: string): Promise<Club> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user is a member
    const isMember = club.members.some(member => member.userId && member.userId.equals(userId));
    if (!isMember) {
      throw new ForbiddenException('Only club members can send messages');
    }

    const chatMessage = {
      _id: new Types.ObjectId(),
      senderId: userId,
      senderName,
      senderProfileImage,
      content: chatMessageDto.content,
      createdAt: new Date(),
    };

    const updatedClub = await this.clubModel
      .findByIdAndUpdate(
        club._id,
        { $push: { chatMessages: chatMessage } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    return updatedClub!;
  }

  // Member management
  async getClubMembers(clubUsername: string, userId?: Types.ObjectId): Promise<Club['members']> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true })
      .populate('members.userId', 'username fullName profileImage')
      .exec();
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Club members are now publicly viewable - no admin restriction
    // userId parameter kept for potential future authorization use
    return club.members;
  }

  async updateMemberRole(clubUsername: string, adminUserId: Types.ObjectId, updateRoleDto: UpdateMemberRoleDto): Promise<Club> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if requesting user is creator, founder, or admin
    const adminMember = club.members.find(member => member.userId && member.userId.equals(adminUserId));
    const isCreator = club.createdBy.equals(adminUserId);
    const isFounder = club.club_founder?.equals(adminUserId);
    
    if (!isCreator && !isFounder && (!adminMember || adminMember.role !== 'admin')) {
      throw new ForbiddenException('Only club admins can update member roles');
    }

    // Update member role
    const updatedClub = await this.clubModel
      .findOneAndUpdate(
        { 
          username: clubUsername, 
          'members.userId': new Types.ObjectId(updateRoleDto.userId) 
        },
        { 
          $set: { 'members.$.role': updateRoleDto.role } 
        },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    if (!updatedClub) {
      throw new NotFoundException('Member not found in club');
    }

    return updatedClub;
  }

  async removeMember(clubUsername: string, adminUserId: Types.ObjectId, memberUserId: string): Promise<Club> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if requesting user is creator, founder, or admin
    const adminMember = club.members.find(member => member.userId && member.userId.equals(adminUserId));
    const isCreator = club.createdBy.equals(adminUserId);
    const isFounder = club.club_founder?.equals(adminUserId);
    
    if (!isCreator && !isFounder && (!adminMember || adminMember.role !== 'admin')) {
      throw new ForbiddenException('Only club admins can remove members');
    }

    // Cannot remove creator or founder
    if (club.createdBy.equals(new Types.ObjectId(memberUserId)) || 
        club.club_founder?.equals(new Types.ObjectId(memberUserId))) {
      throw new ForbiddenException('Cannot remove club creator or founder');
    }

    const updatedClub = await this.clubModel
      .findByIdAndUpdate(
        club._id,
        { $pull: { members: { userId: new Types.ObjectId(memberUserId) } } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    return updatedClub!;
  }

  // Helper method to check if user is member
  async isUserMember(clubUsername: string, userId: Types.ObjectId): Promise<boolean> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    if (!club) return false;
    
    // Check if user is creator, founder, OR in members array
    const isCreator = club.createdBy.equals(userId);
    const isFounder = club.club_founder?.equals(userId);
    const isMember = club.members.some(member => member.userId && member.userId.equals(userId));
    
    return isCreator || isFounder || isMember;
  }

  // Helper method to check if user is admin
  async isUserAdmin(clubUsername: string, userId: Types.ObjectId): Promise<boolean> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    if (!club) return false;
    
    const isCreator = club.createdBy.equals(userId);
    const isFounder = club.club_founder?.equals(userId);
    const userMember = club.members.find(member => member.userId && member.userId.equals(userId));
    
    return isCreator || isFounder || (userMember?.role === 'admin');
  }

  // Admin-only functions
  async updateClubProfile(clubUsername: string, adminUserId: Types.ObjectId, updateData: UpdateClubProfileDto): Promise<Club> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Verify admin access
    const isAdmin = await this.isUserAdmin(clubUsername, adminUserId);
    if (!isAdmin) {
      throw new ForbiddenException('Only club admins can update the profile');
    }

    // Update club with provided data
    const updatedClub = await this.clubModel
      .findByIdAndUpdate(
        club._id,
        { $set: updateData },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    return updatedClub!;
  }

  async deleteComment(clubUsername: string, adminUserId: Types.ObjectId, commentId: string): Promise<Club> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Verify admin access
    const isAdmin = await this.isUserAdmin(clubUsername, adminUserId);
    if (!isAdmin) {
      throw new ForbiddenException('Only club admins can delete comments');
    }

    // Remove the comment
    const updatedClub = await this.clubModel
      .findByIdAndUpdate(
        club._id,
        { $pull: { comments: { _id: new Types.ObjectId(commentId) } } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();

    if (!updatedClub) {
      throw new NotFoundException('Comment not found');
    }

    return updatedClub;
  }

  async getClubForAdmin(clubUsername: string, adminUserId: Types.ObjectId): Promise<Club> {
    const club = await this.clubModel
      .findOne({ username: clubUsername, isActive: true })
      .populate('createdBy', 'username fullName profileImage')
      .populate('club_founder', 'username fullName profileImage')
      .populate('members.userId', 'username fullName profileImage')
      .exec();
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Verify admin access
    const isAdmin = await this.isUserAdmin(clubUsername, adminUserId);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    return club;
  }

  async getClubStats(clubUsername: string, adminUserId: Types.ObjectId) {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Verify admin access
    const isAdmin = await this.isUserAdmin(clubUsername, adminUserId);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    const totalMembers = club.members.length;
    const totalAdmins = club.members.filter(member => member.role === 'admin').length + 1; // +1 for creator
    const totalComments = club.comments.length;
    const totalChatMessages = club.chatMessages.length;

    return {
      totalMembers,
      totalAdmins,
      totalComments,
      totalChatMessages,
      createdAt: club.createdAt,
    };
  }

  async generateClubLogoUploadUrl(clubUsername: string, adminUserId: Types.ObjectId, fileType: string) {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Verify admin access
    const isAdmin = await this.isUserAdmin(clubUsername, adminUserId);
    if (!isAdmin) {
      throw new ForbiddenException('Admin access required');
    }

    const fileExtension = fileType.split('/')[1];
    const key = `club-logos/${club._id}/${Date.now()}.${fileExtension}`;
    
    // Note: This assumes you have S3 service similar to user service
    // You'll need to import and inject the S3 service or create a similar method
    // For now, returning a structure that matches the expected format
    return {
      key,
      clubId: club._id,
    };
  }

  async getClubEventsCount(clubUsername: string): Promise<number> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const count = await this.eventModel.countDocuments({ 
      clubId: club._id,
      status: { $in: ['live', 'past'] }
    });

    return count;
  }

  // Group Chat Methods
  async createGroupChat(clubUsername: string, userId: Types.ObjectId, createGroupChatDto: CreateClubGroupChatDto): Promise<ClubGroupChat> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user is admin or creator
    const isAdmin = await this.isUserAdmin(clubUsername, userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only club admins can create group chats');
    }

    // Create the group chat
    const groupChat = new this.clubGroupChatModel({
      name: createGroupChatDto.name,
      description: createGroupChatDto.description,
      clubId: club._id,
      createdBy: userId,
      members: createGroupChatDto.members ? 
        createGroupChatDto.members.map(id => new Types.ObjectId(id)) : 
        [userId], // Creator is automatically added
    });

    const savedGroupChat = await groupChat.save();
    
    // Return populated group chat
    return this.clubGroupChatModel
      .findById(savedGroupChat._id)
      .populate('createdBy', 'username fullName profileImage')
      .populate('members', 'username fullName profileImage')
      .exec() as Promise<ClubGroupChat>;
  }

  async getClubGroupChats(clubUsername: string, userId: Types.ObjectId): Promise<ClubGroupChat[]> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    // Check if user is a member
    const isMember = await this.isUserMember(clubUsername, userId);
    if (!isMember) {
      throw new ForbiddenException('Only club members can view group chats');
    }

    // Return group chats where user is a member
    return this.clubGroupChatModel
      .find({ 
        clubId: club._id, 
        isActive: true,
        members: userId 
      })
      .populate('createdBy', 'username fullName profileImage')
      .populate('members', 'username fullName profileImage')
      .sort({ createdAt: -1 })
      .exec();
  }

  async updateGroupChat(clubUsername: string, groupChatId: string, userId: Types.ObjectId, updateGroupChatDto: UpdateClubGroupChatDto): Promise<ClubGroupChat> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const groupChat = await this.clubGroupChatModel.findOne({ 
      _id: groupChatId, 
      clubId: club._id, 
      isActive: true 
    });

    if (!groupChat) {
      throw new NotFoundException('Group chat not found');
    }

    // Check if user is admin or creator of the group chat
    const isAdmin = await this.isUserAdmin(clubUsername, userId);
    const isCreator = groupChat.createdBy.equals(userId);
    
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Only admins or group chat creators can update group chats');
    }

    const updatedGroupChat = await this.clubGroupChatModel
      .findByIdAndUpdate(groupChatId, updateGroupChatDto, { new: true })
      .populate('createdBy', 'username fullName profileImage')
      .populate('members', 'username fullName profileImage')
      .exec();

    return updatedGroupChat!;
  }

  async deleteGroupChat(clubUsername: string, groupChatId: string, userId: Types.ObjectId): Promise<void> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const groupChat = await this.clubGroupChatModel.findOne({ 
      _id: groupChatId, 
      clubId: club._id, 
      isActive: true 
    });

    if (!groupChat) {
      throw new NotFoundException('Group chat not found');
    }

    // Check if user is admin or creator of the group chat
    const isAdmin = await this.isUserAdmin(clubUsername, userId);
    const isCreator = groupChat.createdBy.equals(userId);
    
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Only admins or group chat creators can delete group chats');
    }

    await this.clubGroupChatModel.findByIdAndUpdate(groupChatId, { isActive: false });
  }

  async addGroupChatMember(clubUsername: string, groupChatId: string, userId: Types.ObjectId, addGroupChatMemberDto: AddGroupChatMemberDto): Promise<ClubGroupChat> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const groupChat = await this.clubGroupChatModel.findOne({ 
      _id: groupChatId, 
      clubId: club._id, 
      isActive: true 
    });

    if (!groupChat) {
      throw new NotFoundException('Group chat not found');
    }

    // Check if user is admin or creator of the group chat
    const isAdmin = await this.isUserAdmin(clubUsername, userId);
    const isCreator = groupChat.createdBy.equals(userId);
    
    if (!isAdmin && !isCreator) {
      throw new ForbiddenException('Only admins or group chat creators can add members');
    }

    const newMemberId = new Types.ObjectId(addGroupChatMemberDto.userId);

    // Check if the new member is already in the group chat
    if (groupChat.members.some(memberId => memberId.equals(newMemberId))) {
      throw new ConflictException('User is already a member of this group chat');
    }

    // Check if the new member is a club member
    const isClubMember = await this.isUserMember(clubUsername, newMemberId);
    if (!isClubMember) {
      throw new ForbiddenException('User must be a club member to join group chats');
    }

    const updatedGroupChat = await this.clubGroupChatModel
      .findByIdAndUpdate(
        groupChatId,
        { $push: { members: newMemberId } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('members', 'username fullName profileImage')
      .exec();

    return updatedGroupChat!;
  }

  async removeGroupChatMember(clubUsername: string, groupChatId: string, userId: Types.ObjectId, memberUserId: string): Promise<ClubGroupChat> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const groupChat = await this.clubGroupChatModel.findOne({ 
      _id: groupChatId, 
      clubId: club._id, 
      isActive: true 
    });

    if (!groupChat) {
      throw new NotFoundException('Group chat not found');
    }

    // Check if user is admin or creator of the group chat
    const isAdmin = await this.isUserAdmin(clubUsername, userId);
    const isCreator = groupChat.createdBy.equals(userId);
    const memberToRemoveId = new Types.ObjectId(memberUserId);
    const isSelfRemoval = userId.equals(memberToRemoveId);
    
    if (!isAdmin && !isCreator && !isSelfRemoval) {
      throw new ForbiddenException('Only admins, group chat creators, or the member themselves can remove members');
    }

    // Prevent removal of group chat creator
    if (groupChat.createdBy.equals(memberToRemoveId)) {
      throw new ForbiddenException('Cannot remove the group chat creator');
    }

    const updatedGroupChat = await this.clubGroupChatModel
      .findByIdAndUpdate(
        groupChatId,
        { $pull: { members: memberToRemoveId } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('members', 'username fullName profileImage')
      .exec();

    return updatedGroupChat!;
  }

  async getGroupChatMessages(clubUsername: string, groupChatId: string, userId: Types.ObjectId): Promise<ClubGroupChat['messages']> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const groupChat = await this.clubGroupChatModel.findOne({ 
      _id: groupChatId, 
      clubId: club._id, 
      isActive: true 
    })
    .populate('messages.senderId', 'username fullName profileImage')
    .exec();

    if (!groupChat) {
      throw new NotFoundException('Group chat not found');
    }

    // Check if user is a member of the group chat
    if (!groupChat.members.some(memberId => memberId.equals(userId))) {
      throw new ForbiddenException('Only group chat members can view messages');
    }

    // Transform messages to ensure senderName and senderProfileImage are populated
    const populatedMessages = groupChat.messages.map(message => {
      const sender = message.senderId as any; // This will be populated by mongoose
      return {
        _id: message._id,
        senderId: message.senderId,
        senderName: message.senderName || sender?.fullName || sender?.username || 'Unknown User',
        senderProfileImage: message.senderProfileImage || sender?.profileImage || null,
        content: message.content,
        createdAt: message.createdAt
      };
    });

    return populatedMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async sendGroupChatMessage(clubUsername: string, groupChatId: string, userId: Types.ObjectId, groupChatMessageDto: GroupChatMessageDto, senderName: string, senderProfileImage?: string): Promise<ClubGroupChat> {
    const club = await this.clubModel.findOne({ username: clubUsername, isActive: true });
    
    if (!club) {
      throw new NotFoundException('Club not found');
    }

    const groupChat = await this.clubGroupChatModel.findOne({ 
      _id: groupChatId, 
      clubId: club._id, 
      isActive: true 
    });

    if (!groupChat) {
      throw new NotFoundException('Group chat not found');
    }

    // Check if user is a member of the group chat
    if (!groupChat.members.some(memberId => memberId.equals(userId))) {
      throw new ForbiddenException('Only group chat members can send messages');
    }

    const message = {
      _id: new Types.ObjectId(),
      senderId: userId,
      senderName,
      senderProfileImage,
      content: groupChatMessageDto.content,
      createdAt: new Date(),
    };

    const updatedGroupChat = await this.clubGroupChatModel
      .findByIdAndUpdate(
        groupChatId,
        { $push: { messages: message } },
        { new: true }
      )
      .populate('createdBy', 'username fullName profileImage')
      .populate('members', 'username fullName profileImage')
      .exec();

    return updatedGroupChat!;
  }
} 