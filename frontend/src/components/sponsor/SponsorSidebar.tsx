import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Sponsor } from '../../types/sponsor';
import { SponsorChatSession } from '../SponsorChat';
import { 
  MagnifyingGlassIcon, 
  UserGroupIcon, 
  ChatBubbleLeftIcon, 
  CalendarIcon, 
  BuildingOfficeIcon, 
  UserIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { formatMessageTimestamp } from '../../utils/formatTimestamp';
import { LoadingSpinner } from '../LoadingSpinner';

interface SponsorSidebarProps {
  sponsor: Sponsor;
  isOwner: boolean;
  selectedChat: SponsorChatSession | null;
  onChatSelect: (chat: SponsorChatSession) => void;
  onlineUsers: Set<string>;
}

interface SponsorEvent {
  id: string;
  title: string;
  status: string;
  clubUsername?: string;
  imageUrl?: string;
}

interface SponsorClub {
  id: string;
  name: string;
  username: string;
  logoUrl?: string;
}

interface SponsorTeamMember {
  id: string;
  username: string;
  fullName: string;
  role: string;
  profileImage?: string;
  isOnline?: boolean;
}

export const SponsorSidebar: React.FC<SponsorSidebarProps> = ({
  sponsor,
  isOwner,
  selectedChat,
  onChatSelect,
  onlineUsers
}) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [sponsorEvents, setSponsorEvents] = useState<SponsorEvent[]>([]);
  const [sponsorClubs, setSponsorClubs] = useState<SponsorClub[]>([]);
  const [teamMembers, setTeamMembers] = useState<SponsorTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSponsorData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // TODO: Implement API calls to fetch sponsor-specific data
        // For now, using mock data
        
        // Mock sponsored events
        setSponsorEvents([
          {
            id: 'event-1',
            title: 'Tech Conference 2024',
            status: 'LIVE',
            clubUsername: 'tech-club',
            imageUrl: undefined
          },
          {
            id: 'event-2',
            title: 'Startup Pitch Night',
            status: 'UPCOMING',
            clubUsername: 'entrepreneur-club',
            imageUrl: undefined
          }
        ]);

        // Mock partner clubs
        setSponsorClubs([
          {
            id: 'club-1',
            name: 'Tech Innovators Club',
            username: 'tech-club',
            logoUrl: undefined
          },
          {
            id: 'club-2',
            name: 'Entrepreneur Network',
            username: 'entrepreneur-club',
            logoUrl: undefined
          }
        ]);

        // Mock team members (only for owners)
        if (isOwner) {
          setTeamMembers([
            {
              id: 'team-1',
              username: 'john_doe',
              fullName: 'John Doe',
              role: 'Marketing Manager',
              profileImage: undefined,
              isOnline: onlineUsers.has('team-1')
            },
            {
              id: 'team-2',
              username: 'jane_smith',
              fullName: 'Jane Smith',
              role: 'Event Coordinator',
              profileImage: undefined,
              isOnline: onlineUsers.has('team-2')
            }
          ]);
        }

      } catch (error) {
        console.error('Error fetching sponsor data:', error);
        setError('An error occurred while fetching sponsor data.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchSponsorData();
    }
  }, [user, isOwner, onlineUsers]);

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

  // Combine all items into categories
  const categories = [
    {
      id: 'events',
      name: 'Events',
      icon: CalendarIcon,
      items: sponsorEvents.map(event => ({
        id: event.id,
        name: event.title,
        type: 'sponsor-event' as const,
        avatarUrl: event.imageUrl,
        status: event.status,
        clubUsername: event.clubUsername,
        unreadCount: unreadCounts[`sponsor-event-${event.id}`] || 0
      }))
    },
    {
      id: 'clubs',
      name: 'Partner Clubs',
      icon: BuildingOfficeIcon,
      items: sponsorClubs.map(club => ({
        id: club.id,
        name: club.name,
        type: 'sponsor-club' as const,
        avatarUrl: club.logoUrl,
        clubUsername: club.username,
        unreadCount: unreadCounts[`sponsor-club-${club.id}`] || 0
      }))
    },
    ...(isOwner ? [{
      id: 'team',
      name: 'Team',
      icon: UserGroupIcon,
      items: teamMembers.map(member => ({
        id: member.id,
        name: member.fullName,
        type: 'sponsor-team' as const,
        avatarUrl: member.profileImage,
        username: member.username,
        role: member.role,
        isOnline: member.isOnline,
        unreadCount: unreadCounts[`sponsor-team-${member.id}`] || 0
      }))
    }] : []),
    ...(isOwner ? [{
      id: 'other',
      name: 'Announcements',
      icon: ChatBubbleLeftIcon,
      items: [
        {
          id: 'announcements',
          name: 'General Announcements',
          type: 'sponsor-other' as const,
          avatarUrl: undefined,
          unreadCount: unreadCounts['sponsor-announcements'] || 0
        }
      ]
    }] : [])
  ];

  const filteredCategories = categories.map(category => ({
    ...category,
    items: category.items.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(category => category.items.length > 0);

  const handleItemClick = (item: any, categoryId: string) => {
    const chatSession: SponsorChatSession = {
      id: item.id,
      type: item.type,
      name: item.name,
      avatarUrl: item.avatarUrl,
      isOnline: item.isOnline,
      lastMessage: undefined,
      updatedAt: undefined,
      unreadCount: item.unreadCount,
      clubUsername: item.clubUsername,
      eventId: item.type === 'sponsor-event' ? item.id : undefined,
      eventStatus: item.status
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
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {sponsor.name} Communications
        </h2>
        
        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4 text-red-500 text-sm">{error}</div>
        ) : (
          <div className="space-y-1">
            {filteredCategories.map((category) => {
              const CategoryIcon = category.icon;
              
              return (
                <div key={category.id}>
                  {/* Category Header */}
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">
                        {category.name} ({category.items.length})
                      </span>
                      {isOwner && (category.id === 'team' || category.id === 'other') && (
                        <button className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                          <PlusIcon className="h-3 w-3 text-gray-500" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Items */}
                  <div className="space-y-1 px-2 pb-2">
                    {category.items.map((item) => (
                      <div
                        key={`${category.id}-${item.id}`}
                        onClick={() => handleItemClick(item, category.id)}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedChat?.id === item.id && selectedChat?.type === item.type
                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
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
                                {item.type === 'sponsor-team' ? (
                                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                    {item.name.charAt(0).toUpperCase()}
                                  </span>
                                ) : item.type === 'sponsor-event' ? (
                                  <CalendarIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                ) : item.type === 'sponsor-club' ? (
                                  <BuildingOfficeIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                                ) : (
                                  <ChatBubbleLeftIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
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
                            </div>
                            
                            {(item as any).status && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(item as any).status === 'LIVE' ? '🟢 Live' : '⚫ Upcoming'} Event
                              </p>
                            )}
                            
                            {(item as any).role && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {(item as any).role}
                              </p>
                            )}
                            
                            {(item as any).clubUsername && (
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                @{(item as any).clubUsername}
                              </p>
                            )}
                          </div>

                          {/* Unread Indicators */}
                          <div className="flex items-center space-x-1">
                            {item.unreadCount && item.unreadCount > 0 && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            )}
                            
                            {item.unreadCount && item.unreadCount > 1 && (
                              <div className="min-w-[20px] h-5 bg-red-500 rounded-full flex items-center justify-center px-1.5">
                                <span className="text-xs text-white font-bold">
                                  {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}; 