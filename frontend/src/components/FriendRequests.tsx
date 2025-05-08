import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { friendApi } from '../services/api';
import { toast } from 'react-toastify';
import { UserCircleIcon } from '@heroicons/react/24/outline';

interface FriendRequest {
  _id: string;
  fullName: string;
  email: string;
  profileImage?: string;
  bio?: string;
}

const FriendRequests: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      const response = await friendApi.getFriendRequests();
      return response;
    }
  });

  const acceptRequest = useMutation({
    mutationFn: async (requesterId: string) => {
      const response = await friendApi.acceptRequest(requesterId);
      return response;
    },
    onSuccess: (_, requesterId) => {
      toast.success('Friend request accepted!');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendStatus', requesterId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to accept friend request');
    }
  });

  const declineRequest = useMutation({
    mutationFn: async (requesterId: string) => {
      const response = await friendApi.declineRequest(requesterId);
      return response;
    },
    onSuccess: (_, requesterId) => {
      toast.success('Friend request declined');
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendStatus', requesterId] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to decline friend request');
    }
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!requests?.received?.length) {
    return (
      <div className="text-center p-4 text-gray-500">
        No pending friend requests
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {requests.received.map((request: FriendRequest) => (
        <div
          key={request._id}
          className="bg-white rounded-lg shadow p-4 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            {request.profileImage ? (
              <img
                src={request.profileImage}
                alt={request.fullName}
                className="h-12 w-12 rounded-full object-cover"
              />
            ) : (
              <UserCircleIcon className="h-12 w-12 text-gray-400" />
            )}
            <div>
              <Link
                to={`/user/${request._id}`}
                className="font-medium text-gray-900 hover:text-primary-600"
              >
                {request.fullName}
              </Link>
              {request.bio && (
                <p className="text-sm text-gray-500 truncate max-w-xs">{request.bio}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => acceptRequest.mutate(request._id)}
              disabled={acceptRequest.isPending}
              className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Accept ✅
            </button>
            <button
              onClick={() => declineRequest.mutate(request._id)}
              disabled={declineRequest.isPending}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Decline ❌
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FriendRequests; 