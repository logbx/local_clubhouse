import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api-client-mobile';
import { StatusBar } from 'expo-status-bar';
import { websocket } from '@/lib/websocket';

interface ChatMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    name?: string;
    profileImage?: string;
  };
  content: string;
  timestamp: string;
}

export default function ChatScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Load conversation messages
  const { 
    data: messages, 
    isLoading, 
    refetch: refetchMessages 
  } = useQuery({
    queryKey: ['chat-messages', userId],
    queryFn: async () => {
      try {
        const response = await api.get(`/messages/conversation/${userId}`);
        return response.data || [];
      } catch (error) {
        console.error('Error fetching messages:', error);
        return [];
      }
    },
  });

  // Load user info for header
  const { data: otherUser } = useQuery({
    queryKey: ['user', userId],
    queryFn: async () => {
      try {
        const response = await api.get(`/users/${userId}`);
        return response.data;
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
  });

  // WebSocket connection for real-time messaging
  useEffect(() => {
    if (!user || !userId) return;

    const connectWebSocket = async () => {
      try {
        await websocket.connect();
        
        // Join the conversation room
        websocket.emit('join_conversation', { userId: userId });
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    };

    connectWebSocket();

    // Set up listeners for real-time updates
    const unsubscribeNewMessage = websocket.on('new_message', (newMessage: ChatMessage) => {
      // Only add message if it's for this conversation
      if (newMessage.sender._id === userId || newMessage.sender._id === user.id) {
        queryClient.setQueryData(['chat-messages', userId], (oldData: ChatMessage[] | undefined) => {
          if (!oldData) return [newMessage];
          return [...oldData, newMessage];
        });
        
        // Scroll to bottom when new message arrives
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    });

    const unsubscribeTyping = websocket.on('user_typing', (data: { userId: string; isTyping: boolean }) => {
      if (data.userId === userId) {
        setIsTyping(data.isTyping);
      }
    });

    return () => {
      unsubscribeNewMessage();
      unsubscribeTyping();
      websocket.emit('leave_conversation', { userId: userId });
    };
  }, [user, userId, queryClient]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!message.trim() || !userId) return;

    const messageText = message.trim();
    setMessage('');

    try {
      await api.post(`/messages/send`, {
        receiver: userId,
        content: messageText
      });

      // Refetch messages to get the latest
      refetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
      setMessage(messageText); // Restore message on error
    }
  };

  const handleTyping = (text: string) => {
    setMessage(text);
    
    // Emit typing indicator
    if (text.length > 0 && !isTyping) {
      websocket.emit('typing', { recipientId: userId, isTyping: true });
    } else if (text.length === 0 && isTyping) {
      websocket.emit('typing', { recipientId: userId, isTyping: false });
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });
  };

  const renderMessage = ({ item: msg }: { item: ChatMessage }) => {
    const isMyMessage = msg.sender._id === user?.id;
    
    return (
      <View style={{
        flexDirection: 'row',
        justifyContent: isMyMessage ? 'flex-end' : 'flex-start',
        marginVertical: 4,
        marginHorizontal: 16,
      }}>
        {!isMyMessage && (
          <View style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 8,
          }}>
            <Text style={{
              fontSize: 12,
              fontWeight: 'bold',
              color: 'white',
            }}>
              {(msg.sender.name || msg.sender.username)[0].toUpperCase()}
            </Text>
          </View>
        )}
        
        <View style={{
          maxWidth: '70%',
          backgroundColor: isMyMessage ? '#3b82f6' : '#f3f4f6',
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 8,
        }}>
          <Text style={{
            fontSize: 16,
            color: isMyMessage ? 'white' : '#111827',
          }}>
            {msg.content}
          </Text>
          <Text style={{
            fontSize: 12,
            color: isMyMessage ? 'rgba(255,255,255,0.7)' : '#6b7280',
            marginTop: 4,
            alignSelf: 'flex-end',
          }}>
            {formatMessageTime(msg.timestamp)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: '#f9fafb' }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
          alignItems: 'center',
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
          
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: 'white',
            }}>
              {(otherUser?.name || otherUser?.username || 'U')[0].toUpperCase()}
            </Text>
          </View>
          
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
            }}>
              {otherUser?.name || otherUser?.username || 'Loading...'}
            </Text>
            {isTyping && (
              <Text style={{
                fontSize: 14,
                color: '#6b7280',
                fontStyle: 'italic',
              }}>
                typing...
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item._id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={() => (
          <View style={{
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 60,
            paddingHorizontal: 24,
          }}>
            <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
            <Text style={{
              fontSize: 18,
              fontWeight: '600',
              color: '#111827',
              marginTop: 16,
              marginBottom: 8,
            }}>
              No messages yet
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#6b7280',
              textAlign: 'center',
            }}>
              Start the conversation by sending a message below.
            </Text>
          </View>
        )}
      />

      {/* Message Input */}
      <View style={{
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingHorizontal: 16,
        paddingVertical: 12,
      }}>
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f3f4f6',
          borderRadius: 24,
          paddingHorizontal: 16,
          paddingVertical: 8,
        }}>
          <TextInput
            style={{
              flex: 1,
              fontSize: 16,
              color: '#111827',
              maxHeight: 100,
            }}
            placeholder="Type a message..."
            placeholderTextColor="#6b7280"
            value={message}
            onChangeText={handleTyping}
            multiline
            returnKeyType="send"
            onSubmitEditing={handleSendMessage}
          />
          <TouchableOpacity
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: message.trim() ? '#3b82f6' : '#d1d5db',
              alignItems: 'center',
              justifyContent: 'center',
              marginLeft: 8,
            }}
            onPress={handleSendMessage}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={16} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}