import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { friendApi } from '../services/api';
import { toast } from 'react-toastify';

interface FriendButtonProps {
  userId: string;
}

const FriendButton: React.FC<FriendButtonProps> = ({ userId }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch the current friendship status
  const { data: friendStatus, isLoading, error } = useQuery({
    queryKey: ['friendStatus', userId],
    queryFn: async () => {
      const response = await friendApi.getFriendStatus(userId);
      return response.status;
    },
    enabled: !!userId && !!user?.id,
    retry: 1
  });

  const sendRequest = useMutation({
    mutationFn: async () => {
      const response = await friendApi.sendFriendRequest(userId);
      return response;
    },
    onSuccess: () => {
      toast.success('Friend request sent!');
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendStatus', userId] });
    },
    onError: (error: any) => {
      // Detailed error logging
      console.error('Failed to send friend request:', error);
      if (error.response) {
        console.error('Backend response:', error.response.data);
      }
      const message = error.response?.data?.message || 'Failed to send friend request';
      toast.error(message);
      // If users are already friends, update the local status
      if (message.includes('already friends')) {
        queryClient.invalidateQueries({ queryKey: ['friendStatus', userId] });
      }
    }
  });

  const acceptRequest = useMutation({
    mutationFn: async () => {
      const response = await friendApi.acceptFriendRequest(userId);
      return response;
    },
    onSuccess: () => {
      toast.success('Friend request accepted!');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendStatus', userId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.message || 'Failed to accept friend request';
      toast.error(message);
      if (message.includes('already friends')) {
        queryClient.invalidateQueries({ queryKey: ['friendStatus', userId] });
      }
    }
  });

  const declineRequest = useMutation({
    mutationFn: async () => {
      const response = await friendApi.declineFriendRequest(userId);
      return response;
    },
    onSuccess: () => {
      toast.success('Friend request declined');
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendStatus', userId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to decline friend request');
    }
  });

  if (user?.id === userId || isLoading) {
    return null; // Don't show button on own profile or while loading
  }

  if (error) {
    console.error('Error fetching friend status:', error);
    return null;
  }

  const renderButton = () => {
    switch (friendStatus) {
      case 'friends':
        return (
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            disabled
          >
            <span>Friends 👥</span>
          </button>
        );

      case 'pending_sent':
        return (
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            disabled
          >
            <span>Request Sent ⏳</span>
          </button>
        );

      case 'pending_received':
        return (
          <div className="flex space-x-2">
            <button
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => acceptRequest.mutate()}
              disabled={acceptRequest.isPending}
            >
              Accept ✅
            </button>
            <button
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => declineRequest.mutate()}
              disabled={declineRequest.isPending}
            >
              Decline ❌
            </button>
          </div>
        );

      default: // 'none'
        return (
          <button
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => sendRequest.mutate()}
            disabled={sendRequest.isPending}
          >
            <span>Connect 🔗</span>
          </button>
        );
    }
  };

  return renderButton();
};

export default FriendButton; 