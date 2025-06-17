import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendApi } from '../services/api';
import { UserPlusIcon, UserMinusIcon } from '@heroicons/react/24/outline';
import ChatModal from '../components/ChatModal';
import FriendGroupList from '../components/FriendGroupList';
import FriendsSearchBar from '../components/FriendsSearchBar';
import { toast } from 'react-hot-toast';

interface Friend {
  _id: string;
  username: string;
  profileImage?: string;
}

interface FriendRequest {
  _id: string;
  username: string;
  email: string;
  profileImage?: string;
  bio?: string;
  interests?: string[];
}

const FriendsDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'groups'>('friends');
  const [chatOpen, setChatOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  // Fetch friends and friend requests
  const { data: friendsData, isLoading: isLoadingFriends } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      console.log('Fetching friends...');
      const response = await friendApi.getFriends();
      console.log('Friends response:', response);
      return response.friends || [];
    }
  });

  const { data: friendRequestsData, isLoading: isLoadingRequests } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      console.log('Fetching friend requests...');
      const response = await friendApi.getFriendRequests();
      console.log('Friend requests response:', response);
      return response;
    }
  });

  // Ensure data is in array/object format
  const friends = Array.isArray(friendsData) ? friendsData : [];
  const receivedRequests = friendRequestsData?.received || [];

  // Debug logs
  console.log('friendRequestsData:', friendRequestsData);
  console.log('receivedRequests:', receivedRequests);

  // Mutation for accepting/rejecting friend requests
  const acceptRequestMutation = useMutation({
    mutationFn: async (requesterId: string) => {
      console.log('[DEBUG] Attempting to accept friend request for:', requesterId);
      try {
        const response = await friendApi.acceptFriendRequest(requesterId);
        console.log('[DEBUG] Success response from acceptFriendRequest:', response);
        return response;
      } catch (error) {
        console.error('[DEBUG] Error in acceptFriendRequest:', error);
        throw error;
      }
    },
    onSuccess: (_, requesterId) => {
      console.log('[DEBUG] Friend request accepted for:', requesterId);
      toast.success('Friend request accepted!');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['friendStatus', requesterId] });
    },
    onError: (error: any) => {
      console.error('[DEBUG] acceptRequest onError:', error);
      toast.error(error.response?.data?.message || 'Failed to accept friend request');
    }
  });

  const declineRequestMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log('Declining friend request for user:', userId);
      try {
        const response = await friendApi.declineFriendRequest(userId);
        return response;
      } catch (error: any) {
        console.error('Error declining friend request:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status
        });
        throw error;
      }
    },
    onSuccess: () => {
      console.log('Friend request declined successfully');
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    }
  });

  const handleGroupSelect = (groupId: string) => {
    setSelectedGroupId(groupId);
    setActiveTab('groups');
  };

  if (isLoadingFriends || isLoadingRequests) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 dark:border-primary-400"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Search Bar */}
      <FriendsSearchBar onGroupSelect={handleGroupSelect} />

      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab('friends')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'friends'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Friends {friends.length > 0 && `(${friends.length})`}
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'requests'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Friend Requests {receivedRequests.length > 0 && `(${receivedRequests.length})`}
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === 'groups'
              ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          Groups
        </button>
      </div>

      {activeTab === 'friends' && (
        <div className="space-y-4">
          {friends.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No friends yet. Use the search bar above to find and connect with people!</p>
          ) : (
            friends.map((friend: Friend) => (
              <div
                key={friend._id}
                className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  {friend.profileImage ? (
                    <img
                      src={friend.profileImage}
                      alt={friend.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400">
                        {friend.username?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{friend.username}</span>
                </div>
                <button
                  className="ml-4 px-3 py-1 bg-primary-500 dark:bg-primary-600 text-white rounded-lg hover:bg-primary-600 dark:hover:bg-primary-700 transition-colors"
                  onClick={() => {
                    setSelectedFriend(friend);
                    setChatOpen(true);
                  }}
                >
                  Message
                </button>
              </div>
            ))
          )}
          {selectedFriend && (
            <ChatModal
              open={chatOpen}
              onClose={() => setChatOpen(false)}
              friend={{
                id: selectedFriend._id,
                username: selectedFriend.username,
                profileImage: selectedFriend.profileImage,
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="space-y-4">
          {receivedRequests.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No friend requests</p>
          ) : (
            receivedRequests.map((request: FriendRequest) => (
              <div
                key={request._id}
                className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  {request.profileImage ? (
                    <img
                      src={request.profileImage}
                      alt={request.username}
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500 dark:text-gray-400">
                        {request.username?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white">{request.username}</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      console.log('Accept clicked', request._id);
                      acceptRequestMutation.mutate(request._id);
                    }}
                    className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-full disabled:opacity-50 transition-colors"
                    disabled={acceptRequestMutation.isPending}
                  >
                    <UserPlusIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => {
                      console.log('Decline clicked', request._id);
                      declineRequestMutation.mutate(request._id);
                    }}
                    className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full disabled:opacity-50 transition-colors"
                    disabled={declineRequestMutation.isPending}
                  >
                    <UserMinusIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'groups' && (
        <FriendGroupList friends={friends} selectedGroupId={selectedGroupId} />
      )}
    </div>
  );
};

export default FriendsDashboard; 