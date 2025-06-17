import React, { useEffect, useState } from 'react';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';
import GroupChat from '../components/GroupChat';
import { Message, Conversation } from '../types';
import { webSocketService } from '../services/websocket.service';
import { publicApi } from '../services/api';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatConversationTimestamp } from '../utils/formatTimestamp';
import { notificationService } from '../services/notification.service';

interface SearchUser {
  id: string;
  username: string;
  email: string;
  profileImage?: string;
  interests?: string[];
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await messageService.getConversations();
        
        // Enhance conversations with unread counts from notifications
        const notifications = notificationService.getNotifications();
        const enhancedConversations = data.map((conv: Conversation) => {
          const unreadCount = notifications.filter(
            (notification) => 
              notification.type === 'direct' && 
              notification.chatId === conv.userId && 
              !notification.read
          ).length;
          
          return {
            ...conv,
            unreadCount
          };
        });
        
        setConversations(enhancedConversations);
      } catch (err: any) {
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();

    // Listen for new messages to update conversation list
    const handleNewMessage = (message: Message) => {
      // Refresh conversations when a new message arrives
      fetchConversations();
    };

    webSocketService.onNewMessage(handleNewMessage);

    // Update unread counts when notifications change
    const unsubscribe = notificationService.subscribe((notifications) => {
      setConversations(prev => 
        prev.map(conv => ({
          ...conv,
          unreadCount: notifications.filter(
            (notification) => 
              notification.type === 'direct' && 
              notification.chatId === conv.userId && 
              !notification.read
          ).length
        }))
      );
    });

    return () => {
      unsubscribe();
      // Note: We don't remove all listeners here as other components might be using them
    };
  }, []);

  // Search for users
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchTerm.trim()) {
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await publicApi.search(searchTerm);
        setSearchResults(response.users || []);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
        setShowSearchResults(false);
      } finally {
        setSearchLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimeout);
  }, [searchTerm]);

  const handleStartConversation = (userId: string) => {
    setSearchTerm('');
    setShowSearchResults(false);
    window.location.href = `/messages/${userId}`;
  };

  const renderHighlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.split(regex).map((part, i) => (
      regex.test(part) ? (
        <span key={i} className="bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-0.5 rounded font-medium">{part}</span>
      ) : part
    ));
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Welcome Back Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user?.username || 'User'}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Start conversations with friends or join the public group chat
        </p>
      </div>

      {/* User Search Bar */}
      <div className="mb-8 relative z-[100000]">
        <div className="relative">
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => searchTerm && setShowSearchResults(true)}
              placeholder="Search users to start a conversation..."
              className="pl-10 pr-10 py-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowSearchResults(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div 
              className="absolute w-full mt-1 bg-white dark:bg-gray-900 backdrop-blur-xl rounded-lg shadow-2xl dark:shadow-black/50 border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto ring-1 ring-gray-300/20 dark:ring-gray-600/30"
              style={{ 
                zIndex: 999999,
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0
              }}
            >
              {searchLoading ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-300">
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 dark:border-blue-400 border-t-transparent"></div>
                    <span>Searching...</span>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-4 text-center text-gray-500 dark:text-gray-300">No users found</div>
              ) : (
                <div className="p-1">
                  <h3 className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-600">
                    Users ({searchResults.length})
                  </h3>
                  <ul className="py-1">
                    {searchResults.map((searchUser) => (
                      <li key={searchUser.id}>
                        <button
                          onClick={() => handleStartConversation(searchUser.id)}
                          className="w-full text-left px-3 py-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 focus:outline-none focus:bg-gray-50 dark:focus:bg-gray-800 rounded-md mx-1"
                        >
                          {searchUser.profileImage ? (
                            <img 
                              src={searchUser.profileImage} 
                              alt={searchUser.username} 
                              className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-200 dark:ring-gray-600" 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 flex items-center justify-center text-white font-bold text-sm ring-2 ring-gray-200 dark:ring-gray-600">
                              {searchUser.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900 dark:text-white truncate">
                              {renderHighlight(searchUser.username, searchTerm)}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              @{searchUser.username}
                            </div>
                            {searchUser.interests && searchUser.interests.length > 0 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 mr-1">
                                  {searchUser.interests[0]}
                                </span>
                                {searchUser.interests.length > 1 && (
                                  <span className="text-gray-400 dark:text-gray-500">
                                    +{searchUser.interests.length - 1} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <svg className="h-4 w-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Group Chat */}
      <GroupChat />
      
      {/* Messages Section */}
      <h2 className="text-2xl font-bold mb-6 mt-8 text-gray-900 dark:text-white">Recent Conversations</h2>
      {loading && <div className="text-gray-600 dark:text-gray-300">Loading...</div>}
      {error && <div className="text-red-500 dark:text-red-400">{error}</div>}
      {conversations.length === 0 && !loading && (
        <div className="text-gray-500 dark:text-gray-400">No conversations yet.</div>
      )}
      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {conversations.map((conv) => (
          <li key={conv.userId} className="py-4 flex items-center">
            <div className="relative mr-4">
              {conv.profileImage ? (
                <img src={conv.profileImage} alt={conv.username} className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                  {conv.username.charAt(0)}
                </div>
              )}
              {/* Unread indicator */}
              {conv.unreadCount && conv.unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <div className="font-semibold text-gray-900 dark:text-white">{conv.username}</div>
                {conv.unreadCount && conv.unreadCount > 0 && (
                  <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                )}
              </div>
              <div className={`text-sm truncate ${
                conv.unreadCount && conv.unreadCount > 0 
                  ? 'text-gray-900 dark:text-white font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {conv.lastMessage ? conv.lastMessage.content : 'No messages yet.'}
              </div>
            </div>
            {conv.lastMessage && (
              <div className="text-xs text-gray-400 dark:text-gray-500 mr-4">
                {formatConversationTimestamp(conv.lastMessage.timestamp)}
              </div>
            )}
            <button
              className="ml-4 px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
              onClick={() => window.location.href = `/messages/${conv.userId}`}
            >
              Open
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MessagesPage; 