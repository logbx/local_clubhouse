import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList } from 'react-native';
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

export default function NewMessageScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  // Search for users
  const { data: searchResults } = useQuery({
    queryKey: ['user-search', searchQuery],
    queryFn: async () => {
      if (!searchQuery.trim()) return [];
      try {
        const response = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
        return response.data || [];
      } catch (error) {
        console.error('Error searching users:', error);
        return [];
      }
    },
    enabled: !!searchQuery.trim(),
  });

  const handleUserSelect = (user: User) => {
    router.push(`/(social)/chat/${user._id || user.id}`);
  };

  const renderUserItem = ({ item: user }: { item: User }) => (
    <TouchableOpacity
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
      }}
      onPress={() => handleUserSelect(user)}
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
          {(user.name || user.username)[0].toUpperCase()}
        </Text>
      </View>
      
      <View style={{ flex: 1 }}>
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: '#111827',
          marginBottom: 4,
        }}>
          {user.name || user.username}
        </Text>
        <Text style={{
          fontSize: 14,
          color: '#6b7280',
        }}>
          @{user.username}
        </Text>
      </View>
    </TouchableOpacity>
  );

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
              marginRight: 16,
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
            New Message
          </Text>
        </View>

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
            placeholder="Search for users..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
          />
        </View>
      </View>

      {/* Search Results */}
      <FlatList
        data={searchResults}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id || item.id}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            paddingHorizontal: 24,
          }}>
            <Ionicons name="person-add-outline" size={48} color="#9ca3af" />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
              marginTop: 16,
              marginBottom: 8,
            }}>
              {searchQuery ? 'No users found' : 'Search for users'}
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              textAlign: 'center',
            }}>
              {searchQuery 
                ? `No users match "${searchQuery}". Try a different search term.`
                : 'Start typing to search for users to message.'
              }
            </Text>
          </View>
        )}
      />
    </View>
  );
}