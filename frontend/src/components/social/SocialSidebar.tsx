import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatSession } from '../../pages/SocialHub';
import { MagnifyingGlassIcon, UserGroupIcon, ChatBubbleLeftIcon, CalendarIcon, BuildingOfficeIcon, UserIcon, ChevronDownIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { formatMessageTimestamp } from '../../utils/formatTimestamp';
import { LoadingSpinner } from '../LoadingSpinner';
import { friendGroupApi, eventApi } from '../../services/api';
import { messageService } from '../../services/message.service';
import { clubApi } from '../../services/club.service';
import { notificationService } from '../../services/notification.service';


interface SocialSidebarProps {
  selectedChat: ChatSession | null;
  onChatSelect: (chat: ChatSession) => void;
  onlineUsers: Set<string>;
  autoSelectChat?: {
    chatType: string;
    chatId: string;
    chatName: string;
  } | null;
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
  onlineUsers,
  autoSelectChat
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [individualConversations, setIndividualConversations] = useState<IndividualConversation[]>([]);
  const [friendGroups, setFriendGroups] = useState<FriendGroup[]>([]);
  const [eventChats, setEventChats] = useState<EventChat[]>([]);
  const [clubChats, setClubChats] = useState<ClubChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  // Subscribe to notification updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribe(() => {
      setUnreadCounts(notificationService.getUnreadCountsByChat());
    });

    // Set initial unread counts
    setUnreadCounts(notificationService.getUnreadCountsByChat());

    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);
        
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
          console.log('📱 Social Hub - Individual Conversations:', conversations.length, 'found');
          setIndividualConversations(conversations.map((conv: any) => ({
            userId: conv.userId,
            username: conv.username,
            profileImage: conv.profileImage,
            lastMessage: conv.lastMessage,
            updatedAt: conv.lastMessage?.timestamp,
            unreadCount: conv.unreadCount || 0
          })));
        } else {
          console.warn('📱 Social Hub - Failed to fetch individual conversations:', conversationsData.reason);
        }

        // Process friend groups
        if (friendGroupsData.status === 'fulfilled') {
          const friendGroups = friendGroupsData.value || [];
          console.log('👥 Social Hub - Friend Groups:', friendGroups.length, 'found');
          setFriendGroups(friendGroups);
        } else {
          console.warn('👥 Social Hub - Failed to fetch friend groups:', friendGroupsData.reason);
        }

        // Process user clubs (for club chats)
        if (userClubsData.status === 'fulfilled') {
          const clubs = userClubsData.value || [];
          console.log('🏢 Social Hub - Club Chats:', clubs.length, 'found');
          setClubChats(clubs.map((club: any) => ({
            id: club._id || club.id,
            name: club.name,
            username: club.username,
            memberCount: club.members?.length || 0,
            logoUrl: club.logoUrl,
            subGroups: [] as any[] // Add empty subGroups array for clubs (for future implementation)
          })));
        } else {
          console.warn('🏢 Social Hub - Failed to fetch club chats:', userClubsData.reason);
        }

        // Process event sub-groups and events together
        let subGroups: EventSubGroup[] = [];
        if (userSubGroupsData.status === 'fulfilled') {
          subGroups = userSubGroupsData.value || [];
          console.log('🔧 Social Hub - Sub-groups:', subGroups.length, 'found');
        } else {
          console.warn('🔧 Social Hub - Failed to fetch sub-groups:', userSubGroupsData.reason);
        }

        // Process user events (for event chats) - filter to only user's events and group with sub-groups
        if (userEventsData.status === 'fulfilled') {
          const events = userEventsData.value || [];
          console.log('📅 Social Hub - Raw events:', events.length, 'found');
          
          const userEvents = events.filter((event: any) => 
            event.creator?.id === user?.id || 
            event.creatorId === user?.id ||
            event.attendees?.some((attendee: any) => attendee.userId === user?.id || attendee.id === user?.id)
          );
          
          console.log('📅 Social Hub - User events:', userEvents.length, 'filtered');
          
          const eventsWithSubGroups = userEvents
            .filter((event: any) => event.status === 'LIVE' || event.status === 'PAST')
            .map((event: any) => {
              // Find sub-groups for this event
              const eventId = event._id || event.id;
              
              const eventSubGroups = subGroups.filter(sg => {
                const subGroupEventId = typeof sg.eventId === 'object' && sg.eventId ? (sg.eventId as any)._id : sg.eventId;
                return subGroupEventId === eventId;
              });
              
              return {
                id: eventId,
                title: event.title,
                status: event.status,
                clubUsername: event.clubUsername,
                subGroups: eventSubGroups,
                imageUrl: event.imageUrl
              };
            });
          
          console.log('📅 Social Hub - Final event chats:', eventsWithSubGroups.length, 'processed');
          setEventChats(eventsWithSubGroups);
        } else {
          console.warn('📅 Social Hub - Failed to fetch events:', userEventsData.reason);
        }

      } catch (error) {
        console.error('❌ Social Hub - Error fetching social data:', error);
        setError('An error occurred while fetching social data.');
      } finally {
        setLoading(false);
        console.log('✅ Social Hub - Data loading completed');
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
    ...individualConversations.map(conv => {
      const unreadKey = `direct-${conv.userId}`;
      const notificationUnreadCount = unreadCounts[unreadKey] || 0;
      const finalUnreadCount = notificationUnreadCount > 0 ? notificationUnreadCount : (conv.unreadCount || 0);
      const item = {
        id: conv.userId,
        name: conv.username,
        type: 'individual' as const,
        category: 'Individuals',
        icon: UserIcon, // Changed from UserGroupIcon to UserIcon for individuals
        avatarUrl: conv.profileImage,
        isOnline: onlineUsers.has(conv.userId),
        lastMessage: conv.lastMessage?.content,
        updatedAt: conv.lastMessage?.timestamp,
        unreadCount: finalUnreadCount > 0 ? finalUnreadCount : undefined
      };
      console.log('🔍 Combined Individual Item:', item);
      console.log('🔍 Unread Count Debug:', {
        unreadKey,
        notificationUnreadCount,
        convUnreadCount: conv.unreadCount,
        finalUnreadCount,
        allUnreadCounts: unreadCounts
      });
      return item;
    }),
    
    // Friend groups
    ...friendGroups.map(group => {
      const unreadKey = `friend-group-${group._id}`;
      const notificationUnreadCount = unreadCounts[unreadKey] || 0;
      return {
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
        unreadCount: notificationUnreadCount > 0 ? notificationUnreadCount : undefined
      };
    }),
    
    // Club chats
    ...clubChats.map(club => {
      const unreadKey = `group-${club.id}`; // Using 'group' type for club chats
      const notificationUnreadCount = unreadCounts[unreadKey] || 0;
      return {
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
        unreadCount: notificationUnreadCount > 0 ? notificationUnreadCount : undefined
      };
    }),
    
    // Event chats (with sub-groups)
    ...eventChats.map(event => {
      const unreadKey = `event-${event.id}`;
      const notificationUnreadCount = unreadCounts[unreadKey] || 0;
      return {
        id: event.id,
        name: event.title,
        type: 'event-chat' as const,
        category: 'Events',
        icon: CalendarIcon, // Changed from BuildingOfficeIcon to CalendarIcon for events
        avatarUrl: event.imageUrl,
        eventStatus: event.status,
        clubUsername: event.clubUsername,
        subGroups: event.subGroups,
        isOnline: false,
        lastMessage: undefined,
        updatedAt: undefined,
        unreadCount: notificationUnreadCount > 0 ? notificationUnreadCount : undefined
      };
    })
  ];

  // Debug: Log the combined items structure
  console.log('🔄 Social Hub - Combined Items Summary:', {
    individuals: combinedItems.filter(item => item.category === 'Individuals').length,
    groups: combinedItems.filter(item => item.category === 'Groups').length,
    clubs: combinedItems.filter(item => item.category === 'Clubs').length,
    events: combinedItems.filter(item => item.category === 'Events').length,
    total: combinedItems.length
  });

  // Handle auto-selection from URL parameters
  useEffect(() => {
    if (autoSelectChat && !selectedChat && combinedItems.length > 0) {
      console.log('🎯 Auto-selecting chat from URL parameters:', autoSelectChat);
      
      // Map notification types to chat types
      const typeMapping: Record<string, string[]> = {
        'individual': ['individual'],
        'club-chat': ['club-chat'],
        'event-chat': ['event-chat'],
        'friend-group': ['friend-group'],
        'event-subgroup': ['event-subgroup']
      };
      
      const allowedTypes = typeMapping[autoSelectChat.chatType] || [];
      
      // Find the matching chat item
      const matchingItem = combinedItems.find(item => 
        allowedTypes.includes(item.type) && item.id === autoSelectChat.chatId
      );
      
      if (matchingItem) {
        console.log('🎯 Found matching chat item:', matchingItem);
        
        // Create chat session and select it
        const chatSession: ChatSession = {
          id: matchingItem.id,
          type: matchingItem.type,
          name: matchingItem.name,
          avatarUrl: matchingItem.avatarUrl,
          isOnline: matchingItem.isOnline,
          lastMessage: matchingItem.lastMessage,
          updatedAt: matchingItem.updatedAt,
          unreadCount: matchingItem.unreadCount,
          clubUsername: 'clubUsername' in matchingItem ? matchingItem.clubUsername : undefined,
          eventId: 'eventId' in matchingItem ? matchingItem.eventId : undefined,
          eventStatus: 'eventStatus' in matchingItem ? matchingItem.eventStatus : undefined
        };
        
        onChatSelect(chatSession);
      } else {
        console.warn('🎯 Could not find matching chat item for auto-selection:', autoSelectChat);
      }
    }
  }, [autoSelectChat, selectedChat, combinedItems, onChatSelect]);

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
      // Mark notifications as read for this chat
      let notificationType = item.type;
      if (item.type === 'individual') notificationType = 'direct';
      if (item.type === 'club-chat') notificationType = 'group';
      if (item.type === 'event-chat') notificationType = 'event';
      if (item.type === 'friend-group') notificationType = 'friend-group';
      
      notificationService.markChatAsRead(notificationType, item.id);
      
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
    // Mark notifications as read for this chat
    let notificationType = item.type;
    if (item.type === 'event-chat') notificationType = 'event';
    if (item.type === 'club-chat') notificationType = 'group';
    
    notificationService.markChatAsRead(notificationType, item.id);
    
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
    // Mark notifications as read for this sub-group
    notificationService.markChatAsRead('subgroup', subGroup._id);
    
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
          <ChatBubbleLeftIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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

                                        {/* Unread Indicators */}
            <div className="flex items-center space-x-1">
              {/* Only show indicators if there are actually unread messages */}
              {(item.unreadCount && item.unreadCount > 0) && (
                <>
                  {/* Blue dot for unread messages */}
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  
                  {/* Red numeric badge for multiple messages */}
                  {item.unreadCount > 1 && (
                    <div className="min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1.5">
                      <span className="text-xs text-white font-bold">
                        {item.unreadCount > 99 ? '99+' : item.unreadCount}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
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
                                
                                                {/* Unread indicators for general chat */}
                <div className="flex items-center space-x-1">
                  {/* Only show indicators if there are actually unread messages */}
                  {(item.unreadCount && item.unreadCount > 0) && (
                    <>
                      {/* Blue dot for unread messages */}
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      
                      {/* Red numeric badge for multiple messages */}
                      {item.unreadCount > 1 && (
                        <div className="min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1">
                          <span className="text-xs text-white font-bold">
                            {item.unreadCount > 99 ? '99+' : item.unreadCount}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                              </div>
                            </div>

                            {/* Sub-groups */}
                            {isEvent && 'subGroups' in item && item.subGroups && item.subGroups.map((subGroup: EventSubGroup) => {
                              const subGroupUnreadKey = `subgroup-${subGroup._id}`;
                              const subGroupUnreadCount = unreadCounts[subGroupUnreadKey] || 0;
                              
                              return (
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
                                    
                                                        {/* Unread indicators for sub-groups */}
                    <div className="flex items-center space-x-1">
                      {/* Only show indicators if there are actually unread messages */}
                      {subGroupUnreadCount > 0 && (
                        <>
                          {/* Blue dot for unread messages */}
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          
                          {/* Red numeric badge for multiple messages */}
                          {subGroupUnreadCount > 1 && (
                            <div className="min-w-[16px] h-4 bg-red-500 rounded-full flex items-center justify-center px-1">
                              <span className="text-xs text-white font-bold">
                                {subGroupUnreadCount > 99 ? '99+' : subGroupUnreadCount}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                                  </div>
                                </div>
                              );
                            })}

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