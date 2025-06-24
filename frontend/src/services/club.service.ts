import { api } from './api';
import { 
  Club, 
  CreateClubDto, 
  UpdateClubDto, 
  AddClubCommentDto, 
  ClubChatMessage, 
  ChatMessageDto, 
  ClubMember, 
  UpdateMemberRoleDto, 
  MembershipStatus, 
  UpdateClubProfileDto,
  ClubStats,
  ClubGroupChat,
  ClubGroupChatMessage,
  CreateClubGroupChatDto,
  UpdateClubGroupChatDto,
  AddGroupChatMemberDto,
  GroupChatMessageDto
} from '../types/club';

export const clubApi = {
  // Get all clubs with optional search
  getClubs: async (search?: string, limit: number = 20, skip: number = 0): Promise<Club[]> => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    
    const response = await api.get(`/api/clubs?${params.toString()}`);
    return response.data;
  },

  // Get a specific club by username
  getClubByUsername: async (username: string): Promise<Club> => {
    const response = await api.get(`/api/clubs/${username}`);
    return response.data;
  },

  // Get user's clubs
  getUserClubs: async (): Promise<Club[]> => {
    const response = await api.get('/api/clubs/my-clubs');
    return response.data;
  },

  // Create a new club
  createClub: async (clubData: CreateClubDto): Promise<Club> => {
    const response = await api.post('/api/clubs', clubData);
    return response.data;
  },

  // Update a club
  updateClub: async (id: string, clubData: UpdateClubDto): Promise<Club> => {
    const response = await api.put(`/api/clubs/${id}`, clubData);
    return response.data;
  },

  // Delete a club
  deleteClub: async (id: string): Promise<void> => {
    await api.delete(`/api/clubs/${id}`);
  },

  // Join a club
  joinClub: async (id: string): Promise<Club> => {
    const response = await api.post(`/api/clubs/${id}/join`);
    return response.data;
  },

  // Leave a club
  leaveClub: async (id: string): Promise<Club> => {
    const response = await api.post(`/api/clubs/${id}/leave`);
    return response.data;
  },

  // Add a comment to a club
  addComment: async (username: string, commentData: AddClubCommentDto): Promise<Club> => {
    const response = await api.post(`/api/clubs/${username}/comments`, commentData);
    return response.data;
  },

  // Chat functionality
  getChatMessages: async (username: string): Promise<ClubChatMessage[]> => {
    const response = await api.get(`/api/clubs/${username}/chat`);
    return response.data;
  },

  sendChatMessage: async (username: string, messageData: ChatMessageDto): Promise<Club> => {
    const response = await api.post(`/api/clubs/${username}/chat`, messageData);
    return response.data;
  },

  // Member management
  getClubMembers: async (username: string): Promise<ClubMember[]> => {
    const response = await api.get(`/api/clubs/${username}/members`);
    return response.data;
  },

  updateMemberRole: async (username: string, roleData: UpdateMemberRoleDto): Promise<Club> => {
    const response = await api.put(`/api/clubs/${username}/members/role`, roleData);
    return response.data;
  },

  removeMember: async (username: string, memberId: string): Promise<void> => {
    await api.delete(`/api/clubs/${username}/members/${memberId}`);
  },

  // Helper methods
  getMembershipStatus: async (username: string): Promise<MembershipStatus> => {
    const response = await api.get(`/api/clubs/${username}/membership-status`);
    return response.data;
  },

  // Admin-only methods
  getClubForAdmin: async (username: string): Promise<Club> => {
    const response = await api.get(`/api/clubs/${username}/admin`);
    return response.data;
  },

  getClubStats: async (username: string): Promise<ClubStats> => {
    const response = await api.get(`/api/clubs/${username}/admin/stats`);
    return response.data;
  },

  updateClubProfile: async (username: string, profileData: UpdateClubProfileDto): Promise<Club> => {
    const response = await api.patch(`/api/clubs/${username}/admin/profile`, profileData);
    return response.data;
  },

  deleteComment: async (username: string, commentId: string): Promise<void> => {
    await api.delete(`/api/clubs/${username}/admin/comments/${commentId}`);
  },

  // Get club events count (live + past events)
  getClubEventsCount: async (username: string): Promise<number> => {
    try {
      const response = await api.get(`/api/clubs/${username}/events-count`);
      return response.data.count || 0;
    } catch (error) {
      console.error('Failed to fetch club events count:', error);
      return 0;
    }
  },

  // Group chat functionality
  getClubGroupChats: async (username: string): Promise<ClubGroupChat[]> => {
    const response = await api.get(`/api/clubs/${username}/group-chats`);
    return response.data;
  },

  createGroupChat: async (username: string, groupChatData: CreateClubGroupChatDto): Promise<ClubGroupChat> => {
    const response = await api.post(`/api/clubs/${username}/group-chats`, groupChatData);
    return response.data;
  },

  updateGroupChat: async (username: string, groupChatId: string, groupChatData: UpdateClubGroupChatDto): Promise<ClubGroupChat> => {
    const response = await api.put(`/api/clubs/${username}/group-chats/${groupChatId}`, groupChatData);
    return response.data;
  },

  deleteGroupChat: async (username: string, groupChatId: string): Promise<void> => {
    await api.delete(`/api/clubs/${username}/group-chats/${groupChatId}`);
  },

  addGroupChatMember: async (username: string, groupChatId: string, memberData: AddGroupChatMemberDto): Promise<ClubGroupChat> => {
    const response = await api.post(`/api/clubs/${username}/group-chats/${groupChatId}/members`, memberData);
    return response.data;
  },

  removeGroupChatMember: async (username: string, groupChatId: string, memberId: string): Promise<void> => {
    await api.delete(`/api/clubs/${username}/group-chats/${groupChatId}/members/${memberId}`);
  },

  getGroupChatMessages: async (username: string, groupChatId: string): Promise<ClubGroupChatMessage[]> => {
    const response = await api.get(`/api/clubs/${username}/group-chats/${groupChatId}/messages`);
    return response.data;
  },

  sendGroupChatMessage: async (username: string, groupChatId: string, messageData: GroupChatMessageDto): Promise<ClubGroupChat> => {
    const response = await api.post(`/api/clubs/${username}/group-chats/${groupChatId}/messages`, messageData);
    return response.data;
  },
};