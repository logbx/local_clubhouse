import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatSession } from '../../pages/SocialHub';
import { formatMessageTimestamp } from '../../utils/formatTimestamp';
import { PaperAirplaneIcon, UserGroupIcon, UserIcon, BuildingOfficeIcon, CalendarIcon, InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

interface ChatWindowProps {
  chat: ChatSession;
  onlineUsers: Set<string>;
}

interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profileImage?: string;
  };
  content: string;
  timestamp: string;
}

interface GroupMember {
  _id: string;
  username: string;
  profileImage?: string;
  isOnline?: boolean;
}

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  chat: ChatSession;
  members: GroupMember[];
  onMemberClick: (memberId: string) => void;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({ isOpen, onClose, chat, members, onMemberClick }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 max-h-96 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {chat.name} - Members ({members.length})
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member._id}
                onClick={() => onMemberClick(member._id)}
                className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              >
                <div className="relative">
                  {member.profileImage ? (
                    <img
                      src={member.profileImage}
                      alt={member.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {member.isOnline && (
                    <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 border border-white dark:border-gray-800 rounded-full"></div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {member.username}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {member.isOnline ? 'Online' : 'Offline'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const ChatWindow: React.FC<ChatWindowProps> = ({ chat, onlineUsers }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        let fetchedMessages: any[] = [];
        
        // Mark notifications as read for this chat when it's opened
        const { notificationService } = await import('../../services/notification.service');
        let notificationType: string = chat.type;
        if (chat.type === 'individual') notificationType = 'direct';
        if (chat.type === 'club-chat') notificationType = 'group';
        if (chat.type === 'event-chat') notificationType = 'event';
        if (chat.type === 'event-subgroup') notificationType = 'subgroup';
        if (chat.type === 'friend-group') notificationType = 'friend-group';
        
        notificationService.markChatAsRead(notificationType, chat.id);
        
        // Fetch messages based on chat type
        switch (chat.type) {
          case 'individual':
            const { messageService: individualService } = await import('../../services/message.service');
            fetchedMessages = await individualService.getConversation(chat.id);
            break;
          case 'friend-group':
            const { friendGroupApi } = await import('../../services/api');
            fetchedMessages = await friendGroupApi.getFriendGroupMessages(chat.id);
            break;
          case 'club-chat':
            const { clubApi } = await import('../../services/club.service');
            fetchedMessages = await clubApi.getChatMessages(chat.clubUsername || chat.id);
            break;
          case 'event-chat':
            const { messageService } = await import('../../services/message.service');
            fetchedMessages = await messageService.getEventMessages(chat.id);
            break;
          case 'event-subgroup':
            const messageServiceSub = await import('../../services/message.service');
            fetchedMessages = await messageServiceSub.messageService.getSubGroupMessages(chat.id);
            break;
          case 'conversation':
            const messageServiceConv = await import('../../services/message.service');
            fetchedMessages = await messageServiceConv.messageService.getConversation(chat.id);
            break;
          default:
            console.warn('Unknown chat type:', chat.type);
        }

        // Transform messages to consistent format
        const transformedMessages = fetchedMessages.map((msg: any) => {
          console.log('[DEBUG] Raw message data:', msg);
          
          // Handle different sender data structures
          let senderInfo = {
            _id: 'unknown',
            username: 'Unknown User',
            profileImage: undefined
          };
          
          if (msg.sender) {
            if (typeof msg.sender === 'object') {
              // Sender is populated object
              senderInfo = {
                _id: msg.sender._id || msg.sender.id || 'unknown',
                username: msg.sender.username || msg.sender.fullName || msg.sender.senderName || 'Unknown User',
                profileImage: msg.sender.profileImage
              };
            } else if (typeof msg.sender === 'string') {
              // Sender is just an ID string - try to find user info from other fields
              senderInfo = {
                _id: msg.sender,
                username: msg.senderName || `User ${msg.sender.slice(-4)}`, // Show last 4 chars of ID as fallback
                profileImage: undefined
              };
            }
          } else if (msg.senderId) {
            // Handle senderId field (used by club messages)
            senderInfo = {
              _id: msg.senderId,
              username: msg.senderName || `User ${msg.senderId.slice(-4)}`,
              profileImage: undefined
            };
          } else if (msg.userId) {
            // Handle userId field (used by event messages)
            if (typeof msg.userId === 'object') {
              senderInfo = {
                _id: msg.userId._id || msg.userId.id || 'unknown',
                username: msg.userId.username || msg.userId.fullName || 'Unknown User',
                profileImage: msg.userId.profileImage
              };
            } else {
              senderInfo = {
                _id: msg.userId,
                username: `User ${msg.userId.slice(-4)}`,
                profileImage: undefined
              };
            }
          }
          
          console.log('[DEBUG] Processed sender info:', senderInfo);
          
          return {
            _id: msg._id,
            sender: senderInfo,
            content: msg.content,
            timestamp: msg.timestamp || msg.createdAt
          };
        });

        console.log('[DEBUG] Transformed messages:', transformedMessages);
        setMessages(transformedMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    if (chat) {
      fetchMessages();
    }
  }, [chat]);

  const fetchGroupMembers = async () => {
    try {
      let members: GroupMember[] = [];
      
      switch (chat.type) {
        case 'friend-group':
          try {
            // Get all friend groups and find the specific one
            const { friendGroupApi } = await import('../../services/api');
            const allGroups = await friendGroupApi.getFriendGroups();
            console.log('[DEBUG] All friend groups:', allGroups);
            
            const currentGroup = allGroups.find((group: any) => group._id === chat.id);
            console.log('[DEBUG] Current friend group:', currentGroup);
            
            if (currentGroup && currentGroup.members) {
              console.log('[DEBUG] Friend group members:', currentGroup.members);
              members = currentGroup.members.map((member: any) => {
                // Handle both populated (object) and non-populated (string) member data
                const memberId = typeof member === 'object' ? (member._id || member.id) : member;
                const memberUsername = typeof member === 'object' ? (member.username || member.fullName || 'Unknown User') : `User ${memberId.slice(-4)}`;
                const memberProfileImage = typeof member === 'object' ? member.profileImage : undefined;
                
                return {
                  _id: memberId,
                  username: memberUsername,
                  profileImage: memberProfileImage,
                  isOnline: onlineUsers.has(memberId)
                };
              });
              console.log('[DEBUG] Processed friend group members:', members);
            }
          } catch (error) {
            console.error('Error fetching friend group members:', error);
          }
          break;
          
        case 'club-chat':
          try {
            // Get club members from club API
            const { clubApi } = await import('../../services/club.service');
            const clubMembers = await clubApi.getClubMembers(chat.clubUsername || chat.id);
            console.log('[DEBUG] Club members:', clubMembers);
            
            if (clubMembers && Array.isArray(clubMembers)) {
              members = clubMembers.map((member: any) => ({
                _id: member.userId._id || member.userId.id,
                username: member.userId.username || member.userId.fullName || 'Unknown User',
                profileImage: member.userId.profileImage,
                isOnline: onlineUsers.has(member.userId._id || member.userId.id)
              }));
              console.log('[DEBUG] Processed club members:', members);
            }
          } catch (error) {
            console.error('Error fetching club members:', error);
          }
          break;
          
        case 'event-subgroup':
          try {
            console.log('[DEBUG] Fetching members for event subgroup:', chat.id);
            console.log('[DEBUG] Chat object:', chat);
            console.log('[DEBUG] EventId from chat:', chat.eventId);
            
            // Get event subgroups and find the specific one
            const { eventSubGroupApi } = await import('../../services/api');
            // We need the eventId to get subgroups, which should be available from chat.eventId
            if (chat.eventId) {
              // Handle both string and object eventId formats
              const eventId = typeof chat.eventId === 'object' && chat.eventId ? (chat.eventId as any)._id : chat.eventId;
              console.log('[DEBUG] Using eventId for API call:', eventId);
              
              const subGroups = await eventSubGroupApi.getSubGroups(eventId);
              console.log('[DEBUG] Event subgroups:', subGroups);
              
              const currentSubGroup = subGroups.find((group: any) => group._id === chat.id);
              console.log('[DEBUG] Current event subgroup:', currentSubGroup);
              
              if (currentSubGroup && currentSubGroup.members) {
                console.log('[DEBUG] Event subgroup members:', currentSubGroup.members);
                members = currentSubGroup.members.map((member: any) => {
                  // Handle both populated (object) and non-populated (string) member data
                  const memberId = typeof member === 'object' ? (member._id || member.id) : member;
                  const memberUsername = typeof member === 'object' ? (member.username || member.fullName || 'Unknown User') : `User ${memberId.slice(-4)}`;
                  const memberProfileImage = typeof member === 'object' ? member.profileImage : undefined;
                  
                  return {
                    _id: memberId,
                    username: memberUsername,
                    profileImage: memberProfileImage,
                    isOnline: onlineUsers.has(memberId)
                  };
                });
                console.log('[DEBUG] Processed event subgroup members:', members);
              } else {
                console.warn('[DEBUG] No members found in current subgroup or subgroup not found');
              }
            } else {
              console.warn('No eventId available for event subgroup:', chat.id);
            }
          } catch (error) {
            console.error('Error fetching event subgroup members:', error);
          }
          break;
          
        default:
          console.warn('Cannot fetch members for chat type:', chat.type);
      }
      
      setGroupMembers(members);
    } catch (error) {
      console.error('Error fetching group members:', error);
      setGroupMembers([]);
    }
  };

  const handleHeaderClick = async () => {
    switch (chat.type) {
      case 'individual':
        // Navigate to user's public profile
        navigate(`/user/${chat.id}`);
        break;
      case 'club-chat':
        // Navigate to club page
        navigate(`/clubs/${chat.clubUsername || chat.id}`);
        break;
      case 'event-chat':
        // Navigate to event page
        navigate(`/event/${chat.id}`);
        break;
      case 'friend-group':
      case 'event-subgroup':
        // Show group members modal
        await fetchGroupMembers();
        setShowGroupInfo(true);
        break;
      default:
        console.warn('No action defined for chat type:', chat.type);
    }
  };

  const handleMemberClick = (memberId: string) => {
    navigate(`/user/${memberId}`);
    setShowGroupInfo(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      setSending(true);
      let sentMessage;

      // Send message based on chat type
      switch (chat.type) {
        case 'individual':
          const { messageService: individualService } = await import('../../services/message.service');
          sentMessage = await individualService.sendMessage(chat.id, newMessage);
          break;
        case 'friend-group':
          const { friendGroupApi } = await import('../../services/api');
          sentMessage = await friendGroupApi.sendFriendGroupMessage(chat.id, newMessage);
          break;
        case 'club-chat':
          const { clubApi } = await import('../../services/club.service');
          sentMessage = await clubApi.sendChatMessage(chat.clubUsername || chat.id, { content: newMessage });
          break;
        case 'event-chat':
          const { messageService } = await import('../../services/message.service');
          sentMessage = await messageService.sendEventMessage(chat.id, newMessage);
          break;
        case 'event-subgroup':
          const messageServiceSub = await import('../../services/message.service');
          sentMessage = await messageServiceSub.messageService.sendSubGroupMessage(chat.id, newMessage);
          break;
        case 'conversation':
          const messageServiceConv = await import('../../services/message.service');
          sentMessage = await messageServiceConv.messageService.sendMessage(chat.id, newMessage);
          break;
        default:
          console.error('Unknown chat type:', chat.type);
          return;
      }

      // Add message optimistically to UI
      if (sentMessage) {
        const optimisticMessage: ChatMessage = {
          _id: sentMessage._id || Date.now().toString(),
          sender: {
            _id: user.id,
            username: user.username || user.fullName || 'You',
            profileImage: user.profileImage
          },
          content: newMessage,
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, optimisticMessage]);
      }

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const getHeaderIcon = () => {
    switch (chat.type) {
      case 'individual':
        return UserIcon;
      case 'friend-group':
      case 'event-subgroup':
        return UserGroupIcon;
      case 'club-chat':
        return BuildingOfficeIcon;
      case 'event-chat':
        return CalendarIcon;
      default:
        return UserIcon;
    }
  };

  const getHeaderSubtitle = () => {
    switch (chat.type) {
      case 'individual':
        return chat.isOnline ? 'Online' : 'Offline';
      case 'friend-group':
        return 'Friend Group';
      case 'club-chat':
        return 'Club Chat';
      case 'event-chat':
        return `${chat.eventStatus === 'LIVE' ? '🟢 Live' : '⚫ Past'} Event`;
      case 'event-subgroup':
        return 'Event Sub-Group';
      default:
        return '';
    }
  };

  const HeaderIcon = getHeaderIcon();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div 
        className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        onClick={handleHeaderClick}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            {chat.avatarUrl ? (
              <img
                src={chat.avatarUrl}
                alt={chat.name}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                {chat.type === 'individual' ? (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {chat.name.charAt(0).toUpperCase()}
                  </span>
                ) : (
                  <HeaderIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                )}
              </div>
            )}
            {chat.type === 'individual' && chat.isOnline && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
            )}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {chat.name}
              </h2>
              <InformationCircleIcon className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {getHeaderSubtitle()}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((message) => {
            const isOwnMessage = message.sender._id === user?.id;
            return (
              <div
                key={message._id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  isOwnMessage
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                }`}>
                  {!isOwnMessage && (
                    <p className="text-xs font-medium mb-1 opacity-75">
                      {message.sender.username}
                    </p>
                  )}
                  <p className="text-sm">{message.content}</p>
                  <p className={`text-xs mt-1 ${
                    isOwnMessage ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
                  }`}>
                    {formatMessageTimestamp(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !sending && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Group Info Modal */}
      <GroupInfoModal
        isOpen={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        chat={chat}
        members={groupMembers}
        onMemberClick={handleMemberClick}
      />
    </div>
  );
}; 