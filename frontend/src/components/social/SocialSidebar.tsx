import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatSession } from '../../pages/SocialHub';
import { MagnifyingGlassIcon, UserGroupIcon, ChatBubbleLeftIcon, CalendarIcon, BuildingOfficeIcon, UserIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatMessageTimestamp } from '../../utils/formatTimestamp';
import { LoadingSpinner } from '../LoadingSpinner';
import { friendGroupApi, eventApi } from '../../services/api';
import { messageService } from '../../services/message.service';
import { clubApi } from '../../services/club.service';

interface SocialSidebarProps {
  selectedChat: ChatSession | null;
  onChatSelect: (chat: ChatSession) => void;
  onlineUsers: Set<string>;
}

interface Friend {
  id: string;
  name: string;
  avatarUrl?: string;
  online?: boolean;
}

interface FriendGroup {
  _id: string;
  name: string;
  members: any[];
  createdBy: string;
}

interface EventChat {
  id: string;
  title: string;
  status: string;
  clubUsername?: string;
  subGroups?: EventSubGroup[];
  imageUrl?: string;
}

interface ClubChat {
  id: string;
  name: string;
  username: string;
  memberCount: number;
  logoUrl?: string;
  subGroups?: any[]; // Add subGroups for future club sub-group functionality
}

interface EventSubGroup {
  _id: string;
  name: string;
  eventId: string;
  eventTitle?: string;
  members: string[];
}

interface IndividualConversation {
  userId: string;
  username: string;
  profileImage?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
  };
  unreadCount?: number;
}

export const SocialSidebar: React.FC<SocialSidebarProps> = ({
  selectedChat,
  onChatSelect,
  onlineUsers
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [individualConversations, setIndividualConversations] = useState<IndividualConversation[]>([]);
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([]);
  const [eventChats, setEventChats] = useState<EventChat[]>([]);
  const [clubChats, setClubChats] = useState<ClubChat[]>([]);
  const [eventSubGroups, setEventSubGroups] = useState<EventSubGroup[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Fetch all data in parallel
        const [
          conversationsData,
          friendGroupsData,
          userClubsData,
          userEventsData,
          userSubGroupsData
        ] = await Promise.allSettled([
          messageService.getConversations().catch(() => []),
          friendGroupApi.getFriendGroups().catch(() => []),
          clubApi.getUserClubs().catch(() => []),
          eventApi.getEvents().catch(() => []),
          messageService.getUserSubGroups().catch(() => [])
        ]);

        // Process individual conversations
        if (conversationsData.status === 'fulfilled') {
          const conversations = conversationsData.value || [];
          console.log('Raw conversations data:', conversations);
          
          setIndividualConversations(conversations.map((conv: any) => ({
            userId: conv.userId,
            username: conv.username || 'Unknown User',
            profileImage: conv.profileImage,
            lastMessage: conv.lastMessage ? {
              content: conv.lastMessage.content,
              timestamp: conv.lastMessage.timestamp
            } : undefined,
            unreadCount: conv.unreadCount || 0
          })));
        }

        // Process friend groups
        if (friendGroupsData.status === 'fulfilled') {
          setFriendGroups(friendGroupsData.value || []);
        }

        // Process user clubs (for club chats)
        if (userClubsData.status === 'fulfilled') {
          const clubs = userClubsData.value || [];
          setClubChats(clubs.map((club: any) => ({
            id: club._id || club.id,
            name: club.name,
            username: club.username,
            memberCount: club.members?.length || 0,
            logoUrl: club.logoUrl,
            subGroups: [] as any[] // Add empty subGroups array for clubs (for future implementation)
          })));
        }

        // Process event sub-groups first
        let subGroups: EventSubGroup[] = [];
        if (userSubGroupsData.status === 'fulfilled') {
          subGroups = userSubGroupsData.value || [];
          console.log('[DEBUG] Raw sub-groups data:', subGroups);
          
          setEventSubGroups(subGroups.map((subGroup: any) => ({
            _id: subGroup._id,
            name: subGroup.name,
            eventId: subGroup.eventId,
            eventTitle: subGroup.eventTitle,
            members: subGroup.members || []
          })));
        }

        // Process user events (for event chats) - filter to only user's events and group with sub-groups
        if (userEventsData.status === 'fulfilled') {
          const events = userEventsData.value || [];
          console.log('[DEBUG] Raw events data:', events);
          
          const userEvents = events.filter((event: any) => 
            event.creator?.id === user?.id || 
            event.creatorId === user?.id ||
            event.attendees?.some((attendee: any) => attendee.userId === user?.id || attendee.id === user?.id)
          );
          
          console.log('[DEBUG] Filtered user events:', userEvents);
          
          const eventsWithSubGroups = userEvents
            .filter((event: any) => event.status === 'LIVE' || event.status === 'PAST')
            .map((event: any) => {
              // Find sub-groups for this event
              const eventId = event._id || event.id;
              console.log('[DEBUG] Looking for sub-groups for eventId:', eventId);
              
              const eventSubGroups = subGroups.filter(sg => {
                const subGroupEventId = typeof sg.eventId === 'object' && sg.eventId ? (sg.eventId as any)._id : sg.eventId;
                console.log('[DEBUG] Comparing subGroup eventId:', subGroupEventId, 'with event eventId:', eventId);
                return subGroupEventId === eventId;
              });
              
              console.log('[DEBUG] Found sub-groups for event', event.title, ':', eventSubGroups);
              
              return {
                id: eventId,
                title: event.title,
                status: event.status,
                clubUsername: event.clubUsername,
                subGroups: eventSubGroups,
                imageUrl: event.imageUrl
              };
            });
          
          console.log('[DEBUG] Final events with sub-groups:', eventsWithSubGroups);
          setEventChats(eventsWithSubGroups);
        }

      } catch (error) {
        console.error('Error fetching social data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchAllData();
    }
  }, [user]);

  const toggleItemExpansion = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Combine all items into a unified list
  const combinedItems = [
    // Individual conversations
    ...individualConversations.map(conv => ({
      id: conv.userId,
      name: conv.username,
      type: 'individual' as const,
      category: 'Individuals',
      icon: UserIcon,
      avatarUrl: conv.profileImage,
      isOnline: onlineUsers.has(conv.userId),
      lastMessage: conv.lastMessage?.content,
      updatedAt: conv.lastMessage?.timestamp,
      unreadCount: conv.unreadCount && conv.unreadCount > 0 ? conv.unreadCount : undefined
    })),
    
    // Friend groups
    ...friendGroups.map(group => ({
      id: group._id,
      name: group.name,
      type: 'friend-group' as const,
      category: 'Groups',
      icon: UserGroupIcon,
      avatarUrl: undefined,
      memberCount: group.members?.length || 0,
      isOnline: false,
      lastMessage: undefined,
      updatedAt: undefined,
      unreadCount: undefined
    })),
    
    // Club chats
    ...clubChats.map(club => ({
      id: club.id,
      name: club.name,
      type: 'club-chat' as const,
      category: 'Clubs',
      icon: BuildingOfficeIcon,
      avatarUrl: club.logoUrl,
      clubUsername: club.username,
      memberCount: club.memberCount,
      subGroups: [] as any[], // Add empty subGroups array for clubs (for future implementation)
      isOnline: false,
      lastMessage: undefined,
      updatedAt: undefined,
      unreadCount: undefined
    })),
    
    // Event chats (with sub-groups)
    ...eventChats.map(event => ({
      id: event.id,
      name: event.title,
      type: 'event-chat' as const,
      category: 'Events',
      icon: CalendarIcon,
      avatarUrl: event.imageUrl,
      eventStatus: event.status,
      clubUsername: event.clubUsername,
      subGroups: event.subGroups,
      isOnline: false,
      lastMessage: undefined,
      updatedAt: undefined,
      unreadCount: undefined
    }))
  ];

  const filteredItems = combinedItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group items by category with custom order
  const categoryOrder = ['Individuals', 'Groups', 'Clubs', 'Events'];
  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, typeof filteredItems>);

  // Sort categories by the defined order
  const sortedCategories = categoryOrder.filter(category => groupedItems[category]?.length > 0);

  const handleItemClick = (item: any) => {
    // For events and clubs with sub-groups, toggle expansion instead of opening chat directly
    const isEvent = item.type === 'event-chat';
    const isClub = item.type === 'club-chat';
    const hasSubGroups = (isEvent && item.subGroups && item.subGroups.length > 0) || 
                        (isClub && item.subGroups && item.subGroups.length > 0); // Club sub-groups when implemented
    
    if (hasSubGroups) {
      toggleItemExpansion(item.id);
    } else {
      // For items without sub-groups, open the chat directly
      const chatSession: ChatSession = {
        id: item.id,
        type: item.type,
        name: item.name,
        avatarUrl: item.avatarUrl,
        isOnline: item.isOnline,
        lastMessage: item.lastMessage,
        updatedAt: item.updatedAt,
        unreadCount: item.unreadCount,
        clubUsername: item.clubUsername,
        eventId: item.eventId,
        eventStatus: item.eventStatus
      };
      onChatSelect(chatSession);
    }
  };

  const handleGeneralChatClick = (item: any) => {
    const chatSession: ChatSession = {
      id: item.id,
      type: item.type,
      name: item.name,
      avatarUrl: item.avatarUrl,
      isOnline: item.isOnline,
      lastMessage: item.lastMessage,
      updatedAt: item.updatedAt,
      unreadCount: item.unreadCount,
      clubUsername: item.clubUsername,
      eventId: item.eventId,
      eventStatus: item.eventStatus
    };
    onChatSelect(chatSession);
  };

  const handleSubGroupClick = (subGroup: EventSubGroup, eventTitle: string) => {
    const chatSession: ChatSession = {
      id: subGroup._id,
      type: 'event-subgroup',
      name: `${subGroup.name} (${eventTitle})`,
      avatarUrl: undefined,
      isOnline: false,
      lastMessage: undefined,
      updatedAt: undefined,
      unreadCount: undefined,
      eventId: subGroup.eventId
    };
    onChatSelect(chatSession);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Social Hub
        </h1>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        {sortedCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8">
            <ChatBubbleLeftIcon className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {searchTerm ? 'No results found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {sortedCategories.map((category) => (
              <div key={category}>
                {/* Category Header */}
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700/50">
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {category}
                  </h3>
                </div>
                
                {/* Category Items */}
                <div className="space-y-1 px-2 pb-2">
                  {groupedItems[category].map((item) => {
                    const IconComponent = item.icon;
                    const isEvent = item.type === 'event-chat';
                    const isClub = item.type === 'club-chat';
                    const hasSubGroups = (isEvent && item.subGroups && item.subGroups.length > 0) || 
                                        (isClub && item.subGroups && item.subGroups.length > 0); // Club sub-groups when implemented
                    const isExpanded = expandedItems.has(item.id);

                    return (
                      <div key={`${item.type}-${item.id}`}>
                        {/* Main Item */}
                        <div
                          onClick={() => handleItemClick(item)}
                          className={`p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedChat?.id === item.id && selectedChat?.type === item.type && !hasSubGroups
                              ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            {/* Expansion Button for Events/Clubs with Sub-groups */}
                            {hasSubGroups && (
                              <div className="p-1">
                                {isExpanded ? (
                                  <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                                )}
                              </div>
                            )}

                            {/* Icon/Avatar */}
                            <div className="relative">
                              {item.avatarUrl ? (
                                <img
                                  src={item.avatarUrl}
                                  alt={item.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                                  {item.type === 'individual' ? (
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                      {item.name.charAt(0).toUpperCase()}
                                    </span>
                                  ) : (
                                    <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                  )}
                                </div>
                              )}
                              {item.isOnline && (
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white dark:border-gray-800 rounded-full"></div>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {item.name}
                                </p>
                                {item.updatedAt && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatMessageTimestamp(item.updatedAt)}
                                  </span>
                                )}
                              </div>
                              
                              {item.lastMessage && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                  {item.lastMessage}
                                </p>
                              )}
                              
                              {('memberCount' in item && item.memberCount !== undefined) && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {item.memberCount} members
                                </p>
                              )}
                              
                              {('eventStatus' in item && item.eventStatus) && (
                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                  {item.eventStatus === 'LIVE' ? '🟢 Live' : '⚫ Past'} Event
                                  {hasSubGroups && 'subGroups' in item && item.subGroups && ` • ${item.subGroups.length} sub-groups`}
                                </p>
                              )}
                            </div>

                            {/* Unread Badge */}
                            {item.unreadCount && item.unreadCount > 0 && (
                              <div className="min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1.5">
                                <span className="text-xs text-white font-bold">
                                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Expanded Content: General Chat + Sub-groups */}
                        {hasSubGroups && isExpanded && (
                          <div className="ml-8 mt-1 space-y-1">
                            {/* General Chat Option */}
                            <div
                              onClick={() => handleGeneralChatClick(item)}
                              className={`p-2 rounded-lg cursor-pointer transition-colors ${
                                selectedChat?.id === item.id && selectedChat?.type === item.type
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                  : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              <div className="flex items-center space-x-2">
                                <ChatBubbleLeftIcon className="h-4 w-4 text-gray-500" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {isEvent ? 'General Event Chat' : 'General Club Chat'}
                                  </p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Main discussion
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Sub-groups */}
                            {isEvent && 'subGroups' in item && item.subGroups && item.subGroups.map((subGroup: EventSubGroup) => (
                              <div
                                key={subGroup._id}
                                onClick={() => handleSubGroupClick(subGroup, item.name)}
                                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                                  selectedChat?.id === subGroup._id && selectedChat?.type === 'event-subgroup'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <UserGroupIcon className="h-4 w-4 text-gray-500" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {subGroup.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {subGroup.members?.length || 0} members
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* Club Sub-groups (when implemented) */}
                            {isClub && 'subGroups' in item && item.subGroups && item.subGroups.map((subGroup: any) => (
                              <div
                                key={subGroup._id}
                                onClick={() => handleSubGroupClick(subGroup, item.name)}
                                className={`p-2 rounded-lg cursor-pointer transition-colors ${
                                  selectedChat?.id === subGroup._id && selectedChat?.type === 'club-subgroup'
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                              >
                                <div className="flex items-center space-x-2">
                                  <UserGroupIcon className="h-4 w-4 text-gray-500" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                      {subGroup.name}
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {subGroup.members?.length || 0} members
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 