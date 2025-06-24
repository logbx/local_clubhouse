import React, { useState, useEffect, useRef } from 'react';
import { 
  PaperAirplaneIcon, 
  UsersIcon, 
  InformationCircleIcon,
  UserCircleIcon 
} from '@heroicons/react/24/outline';
import { clubApi } from '../services/club.service';
import { ClubGroupChat, ClubGroupChatMessage, GroupChatMessageDto } from '../types/club';
import { useAuth } from '../context/AuthContext';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { toast } from 'react-toastify';

interface GroupChatWindowProps {
  clubUsername: string;
  groupChat: ClubGroupChat;
  onBack: () => void;
}

const GroupChatWindow: React.FC<GroupChatWindowProps> = ({
  clubUsername,
  groupChat,
  onBack,
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ClubGroupChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [showInfo, setShowInfo] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const chatMessages = await clubApi.getGroupChatMessages(clubUsername, groupChat._id);
      setMessages(chatMessages);
    } catch (error) {
      console.error('Failed to fetch group chat messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [clubUsername, groupChat._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const messageData: GroupChatMessageDto = { content: newMessage.trim() };
      await clubApi.sendGroupChatMessage(clubUsername, groupChat._id, messageData);
      setNewMessage('');
      
      // Refresh messages to get the latest
      await fetchMessages();
      toast.success('Message sent!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="bg-primary-50 dark:bg-primary-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-1 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg transition-colors"
            >
              <svg className="h-5 w-5 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="p-2 bg-primary-100 dark:bg-primary-800 rounded-lg">
              <UsersIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {groupChat.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {groupChat.members.length} member{groupChat.members.length !== 1 ? 's' : ''}
                {groupChat.description && ` • ${groupChat.description}`}
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800 rounded-lg transition-colors"
          >
            <InformationCircleIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </button>
        </div>
      </div>

      {/* Group Info Panel */}
      {showInfo && (
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600 flex-shrink-0">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Members ({groupChat.members.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {groupChat.members.map((member) => (
                  <div
                    key={member._id}
                    className="flex items-center space-x-2 bg-white dark:bg-gray-600 px-2 py-1 rounded-lg"
                  >
                    {member.profileImage ? (
                      <img
                        src={member.profileImage}
                        alt={member.fullName}
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-5 w-5 bg-gray-200 dark:bg-gray-500 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {member.fullName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <span className="text-xs text-gray-700 dark:text-gray-300">
                      {member.fullName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Created by {groupChat.createdBy.fullName} on {formatMessageTimestamp(groupChat.createdAt)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <UsersIcon className="mx-auto h-12 w-12" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Start the Conversation
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Be the first to send a message in this group chat!
            </p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={message._id || index}
              className={`flex ${
                message.senderId === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.senderId !== user?.id && (
                <div className="flex-shrink-0 mr-3">
                  {message.senderProfileImage ? (
                    <img
                      src={message.senderProfileImage}
                      alt={message.senderName}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                                                         <div className="h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                       <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                         {message.senderName ? message.senderName.charAt(0).toUpperCase() : '?'}
                                       </span>
                                     </div>
                  )}
                </div>
              )}
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === user?.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}
              >
                {message.senderId !== user?.id && (
                  <div className="text-xs font-medium mb-1 text-gray-600 dark:text-gray-300">
                    {message.senderName || 'Unknown User'}
                  </div>
                )}
                <div className="text-sm">{message.content}</div>
                <div
                  className={`text-xs mt-1 ${
                    message.senderId === user?.id
                      ? 'text-primary-100'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {formatMessageTimestamp(message.createdAt)}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex-shrink-0">
        <form onSubmit={handleSendMessage} className="flex space-x-3">
          <div className="flex-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${groupChat.name}...`}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              disabled={sending}
              maxLength={500}
            />
          </div>
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            {sending ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <PaperAirplaneIcon className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};

export default GroupChatWindow; 