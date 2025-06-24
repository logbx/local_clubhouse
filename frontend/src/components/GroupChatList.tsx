import React, { useState, useEffect } from 'react';
import { 
  UsersIcon, 
  PlusIcon, 
  ChatBubbleLeftIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { clubApi } from '../services/club.service';
import { ClubGroupChat } from '../types/club';
import { useAuth } from '../context/AuthContext';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { toast } from 'react-toastify';
import CreateGroupChatModal from './CreateGroupChatModal';

interface GroupChatListProps {
  clubUsername: string;
  isAdmin: boolean;
  onGroupChatSelect: (groupChat: ClubGroupChat) => void;
  selectedGroupChatId?: string;
}

const GroupChatList: React.FC<GroupChatListProps> = ({
  clubUsername,
  isAdmin,
  onGroupChatSelect,
  selectedGroupChatId,
}) => {
  const { user } = useAuth();
  const [groupChats, setGroupChats] = useState<ClubGroupChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDropdown, setShowDropdown] = useState<string | null>(null);

  useEffect(() => {
    fetchGroupChats();
  }, [clubUsername]);

  const fetchGroupChats = async () => {
    try {
      setLoading(true);
      const chats = await clubApi.getClubGroupChats(clubUsername);
      setGroupChats(chats);
    } catch (error) {
      console.error('Failed to fetch group chats:', error);
      toast.error('Failed to load group chats');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroupChat = async (groupChatId: string) => {
    if (!window.confirm('Are you sure you want to delete this group chat? This action cannot be undone.')) {
      return;
    }

    try {
      await clubApi.deleteGroupChat(clubUsername, groupChatId);
      toast.success('Group chat deleted successfully');
      setGroupChats(prev => prev.filter(chat => chat._id !== groupChatId));
      setShowDropdown(null);
    } catch (error: any) {
      console.error('Failed to delete group chat:', error);
      toast.error(error.response?.data?.message || 'Failed to delete group chat');
    }
  };

  const canManageGroupChat = (groupChat: ClubGroupChat) => {
    return isAdmin || groupChat.createdBy._id === user?.id;
  };

  const getLastMessagePreview = (groupChat: ClubGroupChat) => {
    if (groupChat.messages.length === 0) {
      return 'No messages yet';
    }
    
    const lastMessage = groupChat.messages[groupChat.messages.length - 1];
    const preview = lastMessage.content.length > 50 
      ? `${lastMessage.content.substring(0, 50)}...` 
      : lastMessage.content;
    
    return `${lastMessage.senderName}: ${preview}`;
  };

  const getLastMessageTime = (groupChat: ClubGroupChat) => {
    if (groupChat.messages.length === 0) {
      return formatMessageTimestamp(groupChat.createdAt);
    }
    
    const lastMessage = groupChat.messages[groupChat.messages.length - 1];
    return formatMessageTimestamp(lastMessage.createdAt);
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-primary-50 dark:bg-primary-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
              <UsersIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Group Chats
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {groupChats.length} group{groupChats.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          {isAdmin && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <PlusIcon className="h-4 w-4" />
              <span>New Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Group Chat List */}
      <div className="divide-y divide-gray-200 dark:divide-gray-700">
        {groupChats.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-gray-400 mb-4">
              <ChatBubbleLeftIcon className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Group Chats Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {isAdmin 
                ? 'Create focused discussion groups for different topics or activities.'
                : 'Club admins can create group chats for focused discussions.'
              }
            </p>
            {isAdmin && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                <span>Create First Group Chat</span>
              </button>
            )}
          </div>
        ) : (
          groupChats.map((groupChat) => (
            <div
              key={groupChat._id}
              className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors relative ${
                selectedGroupChatId === groupChat._id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
              }`}
              onClick={() => onGroupChatSelect(groupChat)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {groupChat.name}
                    </h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                      {groupChat.members.length} member{groupChat.members.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {groupChat.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 truncate">
                      {groupChat.description}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {getLastMessagePreview(groupChat)}
                  </p>
                  
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {getLastMessageTime(groupChat)}
                  </p>
                </div>

                {canManageGroupChat(groupChat) && (
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDropdown(showDropdown === groupChat._id ? null : groupChat._id);
                      }}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                    >
                      <EllipsisVerticalIcon className="h-4 w-4 text-gray-500" />
                    </button>

                    {showDropdown === groupChat._id && (
                      <div className="absolute right-0 top-8 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10 min-w-[120px]">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement edit functionality
                            setShowDropdown(null);
                            toast.info('Edit functionality coming soon');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2"
                        >
                          <PencilIcon className="h-4 w-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement add members functionality
                            setShowDropdown(null);
                            toast.info('Add members functionality coming soon');
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center space-x-2"
                        >
                          <UserPlusIcon className="h-4 w-4" />
                          <span>Add Members</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroupChat(groupChat._id);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                        >
                          <TrashIcon className="h-4 w-4" />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Group Chat Modal */}
      <CreateGroupChatModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        clubUsername={clubUsername}
        onGroupChatCreated={fetchGroupChats}
      />
    </div>
  );
};

export default GroupChatList; 