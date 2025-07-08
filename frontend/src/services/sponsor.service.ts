import { api } from './api';
import { 
  Sponsor, 
  CreateSponsorDto, 
  UpdateSponsorDto,
  SponsorshipTier,
  CreateSponsorshipTierDto,
  UpdateSponsorshipTierDto,
  CollaborationRequest,
  CreateCollaborationRequestDto,
  UpdateCollaborationRequestDto,
  CollaborationMessageDto,
  AddSponsorTestimonialDto,
  AddTeamMemberDto,
  UpdateTeamMemberDto,
  TeamMember,
  SponsorSearchFilters,
  SponsorStats,
  SponsorshipPreferences,
  CreateSponsorshipPreferencesDto,
  UpdateSponsorshipPreferencesDto,
  SponsorshipPackage,
  CreateSponsorshipPackageDto,
  UpdateSponsorshipPackageDto
} from '../types/sponsor';

export const sponsorApi = {
  // Get all sponsors with optional filters
  getSponsors: async (filters?: SponsorSearchFilters, limit: number = 20, skip: number = 0): Promise<Sponsor[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.location) params.append('location', filters.location);
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    params.append('limit', limit.toString());
    params.append('skip', skip.toString());
    
    const response = await api.get(`/api/sponsors?${params.toString()}`);
    return response.data;
  },

  // Get a specific sponsor by username
  getSponsorByUsername: async (username: string): Promise<Sponsor> => {
    const response = await api.get(`/api/sponsors/${username}`);
    return response.data;
  },

  // Get user's sponsors
  getUserSponsors: async (): Promise<Sponsor[]> => {
    const response = await api.get('/api/sponsors/my-sponsors');
    return response.data;
  },

  // Create a new sponsor
  createSponsor: async (sponsorData: CreateSponsorDto): Promise<Sponsor> => {
    const response = await api.post('/api/sponsors', sponsorData);
    return response.data;
  },

  // Update a sponsor
  updateSponsor: async (id: string, sponsorData: UpdateSponsorDto): Promise<Sponsor> => {
    const response = await api.put(`/api/sponsors/${id}`, sponsorData);
    return response.data;
  },

  // Delete a sponsor
  deleteSponsor: async (id: string): Promise<void> => {
    await api.delete(`/api/sponsors/${id}`);
  },

  // Follow a sponsor
  followSponsor: async (id: string): Promise<Sponsor> => {
    const response = await api.post(`/api/sponsors/${id}/follow`);
    return response.data;
  },

  // Unfollow a sponsor
  unfollowSponsor: async (id: string): Promise<Sponsor> => {
    const response = await api.post(`/api/sponsors/${id}/unfollow`);
    return response.data;
  },

  // Get sponsor stats (owner only)
  getSponsorStats: async (username: string): Promise<SponsorStats> => {
    const response = await api.get(`/api/sponsors/${username}/stats`);
    return response.data;
  },

  // Get ownership status
  getOwnershipStatus: async (username: string): Promise<{ isOwner: boolean }> => {
    const response = await api.get(`/api/sponsors/${username}/owner-status`);
    return response.data;
  },

  // Sponsorship Tier operations
  createSponsorshipTier: async (username: string, tierData: CreateSponsorshipTierDto): Promise<SponsorshipTier> => {
    const response = await api.post(`/api/sponsors/${username}/tiers`, tierData);
    return response.data;
  },

  getSponsorshipTiers: async (username: string): Promise<SponsorshipTier[]> => {
    const response = await api.get(`/api/sponsors/${username}/tiers`);
    return response.data;
  },

  updateSponsorshipTier: async (tierId: string, tierData: UpdateSponsorshipTierDto): Promise<SponsorshipTier> => {
    const response = await api.put(`/api/sponsors/tiers/${tierId}`, tierData);
    return response.data;
  },

  deleteSponsorshipTier: async (tierId: string): Promise<void> => {
    await api.delete(`/api/sponsors/tiers/${tierId}`);
  },

  // Collaboration Request operations
  createCollaborationRequest: async (username: string, requestData: CreateCollaborationRequestDto): Promise<CollaborationRequest> => {
    const response = await api.post(`/api/sponsors/${username}/collaboration-requests`, requestData);
    return response.data;
  },

  getCollaborationRequests: async (username?: string, clubId?: string): Promise<CollaborationRequest[]> => {
    let url = '/api/sponsors';
    const params = new URLSearchParams();
    
    if (username) {
      url += `/${username}/collaboration-requests`;
    } else if (clubId) {
      url += `/collaboration-requests/club/${clubId}`;
    } else {
      throw new Error('Either username or clubId must be provided');
    }

    if (clubId && username) {
      params.append('clubId', clubId);
      url += `?${params.toString()}`;
    }

    const response = await api.get(url);
    return response.data;
  },

  updateCollaborationRequest: async (requestId: string, updateData: UpdateCollaborationRequestDto): Promise<CollaborationRequest> => {
    const response = await api.put(`/api/sponsors/collaboration-requests/${requestId}`, updateData);
    return response.data;
  },

  addCollaborationMessage: async (requestId: string, messageData: CollaborationMessageDto, senderType: 'club' | 'sponsor'): Promise<CollaborationRequest> => {
    const response = await api.post(`/api/sponsors/collaboration-requests/${requestId}/messages?senderType=${senderType}`, messageData);
    return response.data;
  },

  // Testimonial operations
  addTestimonial: async (username: string, testimonialData: AddSponsorTestimonialDto, clubId: string): Promise<Sponsor> => {
    const response = await api.post(`/api/sponsors/${username}/testimonials?clubId=${clubId}`, testimonialData);
    return response.data;
  },

  // Team Management operations
  addTeamMember: async (sponsorId: string, memberData: AddTeamMemberDto): Promise<Sponsor> => {
    const response = await api.post(`/api/sponsors/${sponsorId}/team`, memberData);
    return response.data;
  },

  getTeamMembers: async (sponsorId: string): Promise<TeamMember[]> => {
    const response = await api.get(`/api/sponsors/${sponsorId}/team`);
    return response.data;
  },

  updateTeamMember: async (sponsorId: string, memberId: string, updateData: UpdateTeamMemberDto): Promise<Sponsor> => {
    const response = await api.put(`/api/sponsors/${sponsorId}/team/${memberId}`, updateData);
    return response.data;
  },

  removeTeamMember: async (sponsorId: string, memberId: string): Promise<Sponsor> => {
    const response = await api.delete(`/api/sponsors/${sponsorId}/team/${memberId}`);
    return response.data;
  },

  // Transfer leadership to another team member
  transferLeadership: async (sponsorId: string, newLeaderId: string): Promise<Sponsor> => {
    const response = await api.post(`/api/sponsors/${sponsorId}/team/${newLeaderId}/transfer-leadership`);
    return response.data;
  },

  // Sponsorship Preferences operations
  createSponsorshipPreferences: async (username: string, preferencesData: CreateSponsorshipPreferencesDto): Promise<SponsorshipPreferences> => {
    const response = await api.post(`/api/sponsors/${username}/preferences`, preferencesData);
    return response.data;
  },

  getSponsorshipPreferences: async (username: string): Promise<SponsorshipPreferences | null> => {
    try {
      const response = await api.get(`/api/sponsors/${username}/preferences`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  updateSponsorshipPreferences: async (username: string, preferencesData: UpdateSponsorshipPreferencesDto): Promise<SponsorshipPreferences> => {
    const response = await api.put(`/api/sponsors/${username}/preferences`, preferencesData);
    return response.data;
  },

  deleteSponsorshipPreferences: async (username: string): Promise<void> => {
    await api.delete(`/api/sponsors/${username}/preferences`);
  },

  // Search sponsors by preferences
  searchSponsorsByPreferences: async (
    sponsorshipTypes?: string[],
    collaborationPreference?: string,
    location?: string,
    limit?: number,
    skip?: number
  ): Promise<SponsorshipPreferences[]> => {
    const params = new URLSearchParams();
    if (sponsorshipTypes) params.append('sponsorshipTypes', sponsorshipTypes.join(','));
    if (collaborationPreference) params.append('collaborationPreference', collaborationPreference);
    if (location) params.append('location', location);
    if (limit) params.append('limit', limit.toString());
    if (skip) params.append('skip', skip.toString());
    
    const response = await api.get(`/api/sponsors/search/by-preferences?${params}`);
    return response.data;
  },

  // Sponsorship Package methods
  createSponsorshipPackage: async (sponsorUsername: string, packageData: CreateSponsorshipPackageDto): Promise<SponsorshipPackage> => {
    const response = await api.post(`/api/sponsors/${sponsorUsername}/packages`, packageData);
    return response.data;
  },

  getSponsorshipPackages: async (sponsorUsername: string): Promise<SponsorshipPackage[]> => {
    const response = await api.get(`/api/sponsors/${sponsorUsername}/packages`);
    return response.data;
  },

  getSponsorshipPackageById: async (packageId: string): Promise<SponsorshipPackage> => {
    const response = await api.get(`/api/sponsors/packages/${packageId}`);
    return response.data;
  },

  updateSponsorshipPackage: async (packageId: string, packageData: UpdateSponsorshipPackageDto): Promise<SponsorshipPackage> => {
    const response = await api.put(`/api/sponsors/packages/${packageId}`, packageData);
    return response.data;
  },

  deleteSponsorshipPackage: async (packageId: string): Promise<void> => {
    await api.delete(`/api/sponsors/packages/${packageId}`);
  },

  searchSponsorshipPackages: async (
    sponsorshipTypes?: string[],
    location?: string,
    limit?: number,
    skip?: number
  ): Promise<SponsorshipPackage[]> => {
    const params = new URLSearchParams();
    if (sponsorshipTypes) params.append('sponsorshipTypes', sponsorshipTypes.join(','));
    if (location) params.append('location', location);
    if (limit) params.append('limit', limit.toString());
    if (skip) params.append('skip', skip.toString());
    
    const response = await api.get(`/api/sponsors/search/packages?${params}`);
    return response.data;
  },

  duplicateSponsorshipPackage: async (packageId: string, newPackageName: string): Promise<SponsorshipPackage> => {
    const response = await api.post(`/api/sponsors/packages/${packageId}/duplicate`, { newPackageName });
    return response.data;
  },
}; 