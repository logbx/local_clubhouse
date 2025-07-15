import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api';
import { queryKeys } from '../lib/react-query/query-keys';
import { logger } from '../lib/monitoring/logger';

export interface Club {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  coverImage?: string;
  memberCount: number;
  location?: string;
  category: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  membershipStatus?: 'member' | 'pending' | 'none';
  role?: 'admin' | 'moderator' | 'member';
}

export interface ClubsResponse {
  clubs: Club[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Get clubs with pagination and search
export function useClubs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
}) {
  return useQuery({
    queryKey: queryKeys.clubs.list(params),
    queryFn: () => apiClient.getClubs(params),
    staleTime: 2 * 60 * 1000, // 2 minutes
    select: (data: ClubsResponse) => data,
  });
}

// Get single club details
export function useClub(clubId: string) {
  return useQuery({
    queryKey: queryKeys.clubs.detail(clubId),
    queryFn: () => apiClient.getClub(clubId),
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    select: (data: { club: Club }) => data.club,
  });
}

// Get user's clubs
export function useMyClubs() {
  return useQuery({
    queryKey: queryKeys.clubs.myClubs(),
    queryFn: () => apiClient.request('/clubs/my-clubs'),
    staleTime: 5 * 60 * 1000,
    select: (data: { clubs: Club[] }) => data.clubs,
    enabled: apiClient.isAuthenticated(),
  });
}

// Join club mutation with optimistic updates
export function useJoinClub() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (clubId: string) => apiClient.joinClub(clubId),
    onMutate: async (clubId: string) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.clubs.detail(clubId) });
      
      // Snapshot the previous value
      const previousClub = queryClient.getQueryData(queryKeys.clubs.detail(clubId));
      
      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.clubs.detail(clubId), (old: any) => {
        if (old) {
          return {
            ...old,
            memberCount: old.memberCount + 1,
            membershipStatus: 'member',
          };
        }
        return old;
      });
      
      // Return a context object with the snapshotted value
      return { previousClub, clubId };
    },
    onError: (error, clubId, context) => {
      logger.error('Failed to join club', { clubId, error: error.message });
      
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousClub) {
        queryClient.setQueryData(queryKeys.clubs.detail(context.clubId), context.previousClub);
      }
    },
    onSuccess: (data, clubId) => {
      logger.info('Successfully joined club', { clubId });
    },
    onSettled: (data, error, clubId) => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.detail(clubId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.myClubs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.clubs.lists() });
    },
  });
}

// Leave club mutation
export function useLeaveClub() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (clubId: string) => apiClient.leaveClub(clubId),
    onSuccess: (data, clubId) => {
      // Update the club in cache
      queryClient.setQueryData(['clubs', clubId], (oldData: any) => {
        if (oldData) {
          return {
            ...oldData,
            memberCount: oldData.memberCount - 1,
            membershipStatus: 'none',
          };
        }
        return oldData;
      });

      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my-clubs'] });
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
    },
  });
}

// Create club mutation
export function useCreateClub() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (clubData: Partial<Club>) => 
      apiClient.request('/clubs', {
        method: 'POST',
        body: JSON.stringify(clubData),
      }),
    onSuccess: () => {
      // Invalidate clubs queries to refetch
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my-clubs'] });
    },
  });
}

// Update club mutation
export function useUpdateClub() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ clubId, data }: { clubId: string; data: Partial<Club> }) =>
      apiClient.request(`/clubs/${clubId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (data, variables) => {
      // Update the club in cache
      queryClient.setQueryData(['clubs', variables.clubId], data);
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['clubs'] });
      queryClient.invalidateQueries({ queryKey: ['clubs', 'my-clubs'] });
    },
  });
}

// Get club members
export function useClubMembers(clubId: string) {
  return useQuery({
    queryKey: ['clubs', clubId, 'members'],
    queryFn: () => apiClient.request(`/clubs/${clubId}/members`),
    enabled: !!clubId,
    staleTime: 5 * 60 * 1000,
  });
}

// Search clubs
export function useSearchClubs(searchTerm: string) {
  return useQuery({
    queryKey: ['clubs', 'search', searchTerm],
    queryFn: () => apiClient.getClubs({ search: searchTerm }),
    enabled: !!searchTerm && searchTerm.length > 2,
    staleTime: 30 * 1000, // 30 seconds for search results
    select: (data: ClubsResponse) => data.clubs,
  });
}

// Get club categories
export function useClubCategories() {
  return useQuery({
    queryKey: ['clubs', 'categories'],
    queryFn: () => apiClient.request('/clubs/categories'),
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Get popular clubs
export function usePopularClubs() {
  return useQuery({
    queryKey: ['clubs', 'popular'],
    queryFn: () => apiClient.request('/clubs/popular'),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

// Get nearby clubs (requires location)
export function useNearbyClubs(location?: { latitude: number; longitude: number }) {
  return useQuery({
    queryKey: ['clubs', 'nearby', location],
    queryFn: () => apiClient.request('/clubs/nearby', {
      method: 'POST',
      body: JSON.stringify(location),
    }),
    enabled: !!location,
    staleTime: 5 * 60 * 1000,
  });
}