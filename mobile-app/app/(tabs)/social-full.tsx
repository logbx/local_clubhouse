import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, TextInput, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client-mobile';
import { StatusBar } from 'expo-status-bar';
import { websocket } from '@/lib/websocket';

interface ChatSession {
  id: string;
  type: 'individual' | 'friend-group' | 'club-chat' | 'event-chat' | 'conversation';
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastMessage?: string;
  updatedAt?: string;
  unreadCount?: number;
  clubUsername?: string;
  eventId?: string;
}

interface User {
  _id: string;
  id: string;
  username: string;
  name: string;
  profileImage?: string;
  isOnline?: boolean;
}

type SocialTab = 'messages' | 'friends' | 'groups';

export default function SocialScreen() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<SocialTab>('messages');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  // Load conversations
  const { 
    data: conversations, 
    isLoading: conversationsLoading, 
    refetch: refetchConversations 
  } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      try {
        const response = await api.get('/messages/conversations');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching conversations:', error);
        return [];
      }
    },
  });

  // Load friends
  const { 
    data: friends, 
    isLoading: friendsLoading, 
    refetch: refetchFriends 
  } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      try {
        const response = await api.get('/friends');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching friends:', error);
        return [];
      }
    },
  });

  // Load friend groups
  const { 
    data: friendGroups, 
    isLoading: groupsLoading, 
    refetch: refetchGroups 
  } = useQuery({
    queryKey: ['friend-groups'],
    queryFn: async () => {
      try {
        const response = await api.get('/friends/groups');
        return response.data || [];
      } catch (error) {
        console.error('Error fetching friend groups:', error);
        return [];
      }
    },
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!user) return;

    const connectWebSocket = async () => {
      try {
        await websocket.connect();
        
        // Join social rooms for real-time updates
        websocket.emit('join_social_rooms');
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    // Set up listeners for real-time updates
    const unsubscribeMessageReceived = websocket.on('message_received', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    const unsubscribeFriendStatusUpdate = websocket.on('friend_status_update', (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    });

    return () => {
      unsubscribeMessageReceived();
      unsubscribeFriendStatusUpdate();
    };
  }, [user, queryClient]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchConversations(),
      refetchFriends(),
      refetchGroups()
    ]);
    setRefreshing(false);
  };

  const handleConversationPress = (conversation: ChatSession) => {
    if (conversation.type === 'individual') {
      router.push(`/(social)/chat/${conversation.id}`);
    } else if (conversation.type === 'friend-group') {
      router.push(`/(social)/group/${conversation.id}`);
    } else if (conversation.type === 'event-chat') {
      router.push(`/(social)/event-chat/${conversation.eventId}`);
    }
  };

  const handleNewMessage = () => {
    router.push('/(social)/new-message');
  };

  const handleNewGroup = () => {
    router.push('/(social)/new-group');
  };

  const filteredConversations = conversations?.filter((conv: ChatSession) => {
    if (!searchQuery) return true;
    return conv.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const filteredFriends = friends?.filter((friend: User) => {
    if (!searchQuery) return true;
    return friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           friend.username?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const filteredGroups = friendGroups?.filter((group: any) => {
    if (!searchQuery) return true;
    return group.name.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const renderConversationItem = ({ item: conversation }: { item: ChatSession }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
      onPress={() => handleConversationPress(conversation)}
    >
      {/* Avatar */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        {conversation.avatarUrl ? (
          <View style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: '#e5e7eb',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Ionicons name="person" size={24} color="#6b7280" />
          </View>
        ) : (
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: 'white',
          }}>
            {conversation.name[0].toUpperCase()}
          </Text>
        )}
        {/* Online indicator */}
        {conversation.isOnline && (
          <View style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: '#10b981',
            borderWidth: 2,
            borderColor: 'white',
          }} />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: '#111827',
          }}>
            {conversation.name}
          </Text>
          {conversation.updatedAt && (
            <Text style={{
              fontSize: 12,
              color: '#6b7280',
            }}>
              {new Date(conversation.updatedAt).toLocaleDateString()}
            </Text>
          )}
        </View>
        
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: 14,
            color: '#6b7280',
            flex: 1,
          }}
          numberOfLines={1}
          >
            {conversation.lastMessage || 'No messages yet'}
          </Text>
          {conversation.unreadCount && conversation.unreadCount > 0 && (
            <View style={{
              backgroundColor: '#ef4444',
              borderRadius: 10,
              paddingHorizontal: 6,
              paddingVertical: 2,
              marginLeft: 8,
              minWidth: 20,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: '600',
                color: 'white',
              }}>
                {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderFriendItem = ({ item: friend }: { item: User }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
      onPress={() => router.push(`/(social)/chat/${friend._id || friend.id}`)}
    >
      {/* Avatar */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#3b82f6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          color: 'white',
        }}>
          {(friend.name || friend.username)[0].toUpperCase()}
        </Text>
        {/* Online indicator */}
        {friend.isOnline && (
          <View style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: 12,
            height: 12,
            borderRadius: 6,
            backgroundColor: '#10b981',
            borderWidth: 2,
            borderColor: 'white',
          }} />
        )}
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#111827',
          marginBottom: 4,
        }}>
          {friend.name || friend.username}
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#6b7280',
        }}>
          {friend.isOnline ? 'Online' : 'Offline'}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  const renderGroupItem = ({ item: group }: { item: any }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
      onPress={() => router.push(`/(social)/group/${group.id}`)}
    >
      {/* Group Avatar */}
      <View style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#059669',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
      }}>
        <Ionicons name="people" size={24} color="white" />
      </View>

      {/* Content */}
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#111827',
          marginBottom: 4,
        }}>
          {group.name}
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#6b7280',
        }}>
          {group.memberCount || 0} members
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={20} color="#6b7280" />
    </TouchableOpacity>
  );

  const getCurrentData = () => {
    switch (activeTab) {
      case 'messages':
        return filteredConversations;
      case 'friends':
        return filteredFriends;
      case 'groups':
        return filteredGroups;
      default:
        return [];
    }
  };

  const getCurrentRenderItem = () => {
    switch (activeTab) {
      case 'messages':
        return renderConversationItem;
      case 'friends':
        return renderFriendItem;
      case 'groups':
        return renderGroupItem;
      default:
        return renderConversationItem;
    }
  };

  const isLoading = conversationsLoading || friendsLoading || groupsLoading;
  const currentData = getCurrentData();

  return (
    <View style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={{
        backgroundColor: 'white',
        paddingTop: 60,
        paddingBottom: 16,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }}>
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}>
          <Text style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: '#111827',
          }}>
            Social
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                backgroundColor: showSearch ? '#6b7280' : '#f3f4f6',
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchQuery('');
              }}
            >
              <Ionicons name="search" size={20} color={showSearch ? 'white' : '#374151'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                width: 44,
                height: 44,
                backgroundColor: '#3b82f6',
                borderRadius: 22,
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onPress={activeTab === 'groups' ? handleNewGroup : handleNewMessage}
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input */}
        {showSearch && (
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 20,
          }}>
            <Ionicons name="search" size={20} color="#6b7280" />
            <TextInput
              style={{
                flex: 1,
                marginLeft: 12,
                fontSize: 16,
                color: '#111827',
              }}
              placeholder={`Search ${activeTab}...`}
              placeholderTextColor="#6b7280"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={{ padding: 4 }}
                onPress={() => setSearchQuery('')}
              >
                <Ionicons name="close-circle" size={20} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Tabs */}
        <View style={{
          flexDirection: 'row',
          borderBottomWidth: 1,
          borderBottomColor: '#e5e7eb',
        }}>
          {([
            { key: 'messages', label: 'Messages', icon: 'chatbubble-outline' },
            { key: 'friends', label: 'Friends', icon: 'person-outline' },
            { key: 'groups', label: 'Groups', icon: 'people-outline' }
          ] as const).map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderBottomWidth: 2,
                borderBottomColor: activeTab === tab.key ? '#3b82f6' : 'transparent',
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
              }}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons 
                name={tab.icon} 
                size={16} 
                color={activeTab === tab.key ? '#3b82f6' : '#6b7280'} 
              />
              <Text style={{
                fontSize: 16,
                fontWeight: activeTab === tab.key ? '600' : '500',
                color: activeTab === tab.key ? '#3b82f6' : '#6b7280',
                marginLeft: 8,
              }}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      <FlatList
        data={currentData}
        renderItem={getCurrentRenderItem()}
        keyExtractor={(item, index) => item.id || item._id || index.toString()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            paddingHorizontal: 24,
          }}>
            <Ionicons 
              name={
                activeTab === 'messages' ? 'chatbubbles-outline' :
                activeTab === 'friends' ? 'people-outline' : 'people-circle-outline'
              } 
              size={48} 
              color="#9ca3af" 
            />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
              marginTop: 16,
              marginBottom: 8,
            }}>
              {searchQuery 
                ? `No ${activeTab} found` 
                : `No ${activeTab} yet`
              }
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              textAlign: 'center',
            }}>
              {searchQuery 
                ? `No ${activeTab} match "${searchQuery}". Try different keywords.`
                : activeTab === 'messages' 
                  ? 'Start a conversation by tapping the + button'
                  : activeTab === 'friends'
                  ? 'Add friends to start chatting'
                  : 'Create a group to chat with multiple friends'
              }
            </Text>
          </View>
        )}
      />
    </View>
  );
}