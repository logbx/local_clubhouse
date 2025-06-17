import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { friendGroupApi, friendApi, publicApi } from '../services/api';
import { User } from '../types/user';
import { MagnifyingGlassIcon, XMarkIcon, UserPlusIcon, UserIcon, CheckIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash/debounce';

interface FriendGroup {
  _id: string;
  name: string;
  members: string[];
  createdBy: string;
}

interface SearchResults {
  users: Array<Partial<User> & { id: string; connectionStatus?: 'friend' | 'sent' | 'received' | 'none' }>;
  groups: Array<FriendGroup>;
}

interface FriendsSearchBarProps {
  onGroupSelect?: (groupId: string) => void;
}

const FriendsSearchBar: React.FC<FriendsSearchBarProps> = ({ onGroupSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResults>({ users: [], groups: [] });
  const [isSearching, setIsSearching] = useState(false);

  // Get current user's groups
  const { data: userGroups = [] } = useQuery({
    queryKey: ['friendGroups'],
    queryFn: friendGroupApi.getFriendGroups
  });

  // Get friend requests to determine connection status
  const { data: friendRequestsData } = useQuery({
    queryKey: ['friendRequests'],
    queryFn: async () => {
      const response = await friendApi.getFriendRequests();
      return response;
    }
  });

  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const response = await friendApi.getFriends();
      return response.friends || [];
    }
  });

  const friends = Array.isArray(friendsData) ? friendsData : [];
  const receivedRequests = friendRequestsData?.received || [];
  const sentRequests = friendRequestsData?.sent || [];

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setSearchResults({ users: [], groups: [] });
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        // Search groups that user is part of
        const filteredGroups = userGroups.filter((group: FriendGroup) =>
          group.name.toLowerCase().includes(term.toLowerCase())
        );

        // Search all users
        const userSearchResponse = await publicApi.search(term);
        const users = userSearchResponse.users || [];

        // Add connection status to each user
        const usersWithStatus = users.map((user: any) => {
          let connectionStatus: 'friend' | 'sent' | 'received' | 'none' = 'none';
          
          if (friends.some((friend: any) => friend._id === user.id)) {
            connectionStatus = 'friend';
          } else if (sentRequests.some((req: any) => req._id === user.id)) {
            connectionStatus = 'sent';
          } else if (receivedRequests.some((req: any) => req._id === user.id)) {
            connectionStatus = 'received';
          }

          return {
            ...user,
            connectionStatus
          };
        });

        setSearchResults({
          users: usersWithStatus,
          groups: filteredGroups
        });
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults({ users: [], groups: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [userGroups, friends, sentRequests, receivedRequests]
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const getConnectionIcon = (status: string) => {
    switch (status) {
      case 'friend':
        return <CheckIcon className="h-4 w-4 text-green-500" title="Friend" />;
      case 'sent':
        return <UserPlusIcon className="h-4 w-4 text-yellow-500" title="Request Sent" />;
      case 'received':
        return <UserIcon className="h-4 w-4 text-blue-500" title="Request Received" />;
      default:
        return <UserPlusIcon className="h-4 w-4 text-gray-400" title="Connect" />;
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setIsOpen(false);
    setSearchResults({ users: [], groups: [] });
  };

  const handleGroupSelect = (groupId: string) => {
    if (onGroupSelect) {
      onGroupSelect(groupId);
    }
    clearSearch();
  };

  return (
    <div className="relative mb-6" style={{ zIndex: 10 }}>
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search groups and users..."
          className="pl-10 pr-10 py-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && searchTerm && (
        <div 
          className="absolute left-0 right-0 mt-2 bg-gray-900 dark:bg-gray-900 border border-gray-600 dark:border-gray-600 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          style={{ zIndex: 20 }}
        >
          {isSearching ? (
            <div className="p-3 text-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400 mx-auto"></div>
            </div>
          ) : (
            <>
              {/* Groups Section */}
              {searchResults.groups.length > 0 && (
                <div className="border-b border-gray-700 dark:border-gray-600">
                  <div className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wide bg-gray-800 dark:bg-gray-800">
                    Your Groups
                  </div>
                  <div className="space-y-1 p-2">
                    {searchResults.groups.map((group) => (
                      <button
                        key={group._id}
                        onClick={() => handleGroupSelect(group._id)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition duration-150 ease-in-out text-sm"
                      >
                        <div className="font-medium text-white dark:text-white">{group.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-400">
                          {group.members.length} member{group.members.length !== 1 ? 's' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Users Section */}
              {searchResults.users.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-xs font-medium text-gray-400 dark:text-gray-400 uppercase tracking-wide bg-gray-800 dark:bg-gray-800">
                    Users
                  </div>
                  <div className="space-y-1 p-2">
                    {searchResults.users.map((user) => (
                      <Link
                        key={user.id}
                        to={`/user/${user.id}`}
                        onClick={() => setIsOpen(false)}
                        className="block px-3 py-2 hover:bg-gray-800 dark:hover:bg-gray-700 rounded-md transition duration-150 ease-in-out text-sm"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            {user.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.username}
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-gray-600 dark:bg-gray-600 flex items-center justify-center">
                                <span className="text-gray-300 dark:text-gray-300 text-sm">
                                  {user.username?.charAt(0)?.toUpperCase() || '?'}
                                </span>
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-white dark:text-white">{user.username}</div>
                              {user.bio && (
                                <div className="text-xs text-gray-400 dark:text-gray-400 truncate max-w-xs">
                                  {user.bio}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getConnectionIcon(user.connectionStatus || 'none')}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results */}
              {!isSearching && searchResults.users.length === 0 && searchResults.groups.length === 0 && (
                <div className="p-3 text-center text-gray-400 dark:text-gray-400 text-sm">
                  No results found for "{searchTerm}"
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default FriendsSearchBar; 