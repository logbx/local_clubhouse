import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client-mobile';
import { StatusBar } from 'expo-status-bar';

interface User {
  _id: string;
  id: string;
  username: string;
  name: string;
  profileImage?: string;
}

export default function NewGroupScreen() {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Load friends list
  const { data: friends } = useQuery({
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

  const filteredFriends = friends?.filter((friend: User) => {
    if (!searchQuery) return true;
    return friend.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           friend.username?.toLowerCase().includes(searchQuery.toLowerCase());
  }) || [];

  const handleUserToggle = (user: User) => {
    const isSelected = selectedUsers.some(u => (u._id || u.id) === (user._id || user.id));
    if (isSelected) {
      setSelectedUsers(selectedUsers.filter(u => (u._id || u.id) !== (user._id || user.id)));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    if (selectedUsers.length === 0) {
      Alert.alert('Error', 'Please select at least one friend');
      return;
    }

    setIsCreating(true);
    try {
      const response = await api.post('/friends/groups', {
        name: groupName.trim(),
        members: selectedUsers.map(user => user._id || user.id)
      });

      Alert.alert('Success', 'Group created successfully!', [
        {
          text: 'OK',
          onPress: () => {
            router.push(`/(social)/group/${response.data.id}`);
          }
        }
      ]);
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const renderFriendItem = ({ item: friend }: { item: User }) => {
    const isSelected = selectedUsers.some(u => (u._id || u.id) === (friend._id || friend.id));
    
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          backgroundColor: 'white',
          borderBottomWidth: 1,
          borderBottomColor: '#f3f4f6',
        }}
        onPress={() => handleUserToggle(friend)}
      >
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
        </View>
        
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
            @{friend.username}
          </Text>
        </View>

        <View style={{
          width: 24,
          height: 24,
          borderRadius: 12,
          borderWidth: 2,
          borderColor: isSelected ? '#3b82f6' : '#d1d5db',
          backgroundColor: isSelected ? '#3b82f6' : 'white',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {isSelected && (
            <Ionicons name="checkmark" size={14} color="white" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}>
          <TouchableOpacity
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#f3f4f6',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onPress={() => router.back()}
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <Text style={{
            fontSize: 18,
            fontWeight: '600',
            color: '#111827',
          }}>
            New Group
          </Text>

          <TouchableOpacity
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              backgroundColor: groupName.trim() && selectedUsers.length > 0 ? '#3b82f6' : '#d1d5db',
              borderRadius: 8,
            }}
            onPress={handleCreateGroup}
            disabled={!groupName.trim() || selectedUsers.length === 0 || isCreating}
          >
            <Text style={{
              fontSize: 14,
              fontWeight: '600',
              color: 'white',
            }}>
              {isCreating ? 'Creating...' : 'Create'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Name Input */}
        <TextInput
          style={{
            backgroundColor: '#f3f4f6',
            borderRadius: 12,
            paddingHorizontal: 16,
            paddingVertical: 12,
            fontSize: 16,
            color: '#111827',
            marginBottom: 16,
          }}
          placeholder="Group name"
          placeholderTextColor="#6b7280"
          value={groupName}
          onChangeText={setGroupName}
        />

        {/* Selected Users Count */}
        {selectedUsers.length > 0 && (
          <Text style={{
            fontSize: 14,
            color: '#3b82f6',
            marginBottom: 16,
          }}>
            {selectedUsers.length} friend{selectedUsers.length === 1 ? '' : 's'} selected
          </Text>
        )}

        {/* Search Input */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}>
          <Ionicons name="search" size={20} color="#6b7280" />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 12,
              fontSize: 16,
              color: '#111827',
            }}
            placeholder="Search friends..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Friends List */}
      <FlatList
        data={filteredFriends}
        renderItem={renderFriendItem}
        keyExtractor={(item) => item._id || item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            paddingHorizontal: 24,
          }}>
            <Ionicons name="people-outline" size={48} color="#9ca3af" />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
              marginTop: 16,
              marginBottom: 8,
            }}>
              {searchQuery ? 'No friends found' : 'No friends yet'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              textAlign: 'center',
            }}>
              {searchQuery 
                ? `No friends match "${searchQuery}". Try a different search term.`
                : 'Add friends to create groups and chat together.'
              }
            </Text>
          </View>
        )}
      />
    </View>
  );
}