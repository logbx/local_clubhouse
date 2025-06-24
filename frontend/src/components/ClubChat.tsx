import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { clubApi } from '../services/club.service';
import { ClubChatMessage, ChatMessageDto, ClubGroupChat } from '../types/club';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { PaperAirplaneIcon, UserCircleIcon, ChatBubbleLeftIcon, UsersIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';
import GroupChatList from './GroupChatList';
import GroupChatWindow from './GroupChatWindow';

interface ClubChatProps {
  clubUsername: string;
  isMember: boolean;
  isAdmin: boolean;
}

const ClubChat: React.FC<ClubChatProps> = ({ clubUsername, isMember, isAdmin }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ClubChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'main' | 'groups'>('main');
  const [selectedGroupChat, setSelectedGroupChat] = useState<ClubGroupChat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    if (!isMember) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const chatMessages = await clubApi.getChatMessages(clubUsername);
      setMessages(chatMessages);
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch chat messages:', err);
      setError(err.response?.data?.message || 'Failed to load chat messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'main') {
      fetchMessages();
    }
  }, [clubUsername, isMember, activeTab]);

  useEffect(() => {
    if (activeTab === 'main') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);
      const messageData: ChatMessageDto = { content: newMessage.trim() };
      await clubApi.sendChatMessage(clubUsername, messageData);
      setNewMessage('');
      
      // Refresh messages to get the latest
      await fetchMessages();
      toast.success('Message sent!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleGroupChatSelect = (groupChat: ClubGroupChat) => {
    setSelectedGroupChat(groupChat);
  };

  const handleBackToGroupList = () => {
    setSelectedGroupChat(null);
  };

  if (!isMember) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="text-gray-400 mb-4">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Members Only Chat
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Join this club to access the private member chat and group discussions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => {
                setActiveTab('main');
                setSelectedGroupChat(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'main'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <ChatBubbleLeftIcon className="h-4 w-4" />
                <span>Main Chat</span>
              </div>
            </button>
            <button
              onClick={() => {
                setActiveTab('groups');
                setSelectedGroupChat(null);
              }}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'groups'
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <UsersIcon className="h-4 w-4" />
                <span>Group Chats</span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'main' ? (
        // Main Club Chat
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Chat Header */}
          <div className="bg-primary-50 dark:bg-primary-900 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Member Chat
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              General discussion for all club members
            </p>
          </div>

          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Error Loading Chat
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
              <button
                onClick={fetchMessages}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Messages Container */}
              <div className="h-80 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400">
                      No messages yet. Start the conversation!
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
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
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
            </>
          )}
        </div>
      ) : (
        // Group Chats Section
        <div className="h-96">
          {selectedGroupChat ? (
            <GroupChatWindow
              clubUsername={clubUsername}
              groupChat={selectedGroupChat}
              onBack={handleBackToGroupList}
            />
          ) : (
            <GroupChatList
              clubUsername={clubUsername}
              isAdmin={isAdmin}
              onGroupChatSelect={handleGroupChatSelect}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default ClubChat; 