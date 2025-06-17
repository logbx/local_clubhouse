import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';
import { webSocketService } from '../services/websocket.service';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { notificationService } from '../services/notification.service';

const MessageThreadPage: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userId) {
      setLoading(true);
      messageService.getConversation(userId)
        .then(setMessages)
        .finally(() => setLoading(false));
      
      // Mark messages as read when viewing this conversation
      notificationService.markChatAsRead('direct', userId);
      
      // Join conversation room for real-time updates
      const conversationId = [user?.id, userId].sort().join('_');
      webSocketService.joinConversation(conversationId);
      
      // Listen for new messages
      const handleNewMessage = (message: Message) => {
        setMessages(prev => {
          // Check if message already exists to prevent duplicates
          const exists = prev.some(existingMsg => existingMsg._id === message._id);
          if (exists) {
            return prev;
          }
          return [...prev, message];
        });
      };
      
      webSocketService.onNewMessage(handleNewMessage);
      
      // Cleanup on unmount
      return () => {
        webSocketService.leaveConversation(conversationId);
        webSocketService.removeAllListeners();
      };
    }
  }, [userId, user?.id]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !userId) return;
    setSending(true);
    try {
      const sent = await messageService.sendMessage(userId, newMessage.trim());
      setMessages((prev) => [...prev, sent]);
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 flex flex-col h-[80vh]">
      <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Conversation</h1>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500">No messages yet.</div>
        ) : (
          messages.map((msg) => {
            // Check if the message is from the current user
            const currentUserId = user?.id;
            const senderId = typeof msg.sender === 'string' ? msg.sender : String(msg.sender);
            const isCurrentUser = senderId === currentUserId;
            
            return (
              <div key={msg._id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                <div className={`px-3 py-2 rounded-lg text-sm max-w-xs lg:max-w-md ${
                  isCurrentUser 
                    ? 'bg-blue-500 dark:bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}>
                  {msg.content}
                  <div className={`text-xs mt-1 text-right ${
                    isCurrentUser ? 'text-blue-100 dark:text-blue-200' : 'text-gray-400 dark:text-gray-500'
                  }`}>
                    {formatMessageTimestamp(msg.timestamp)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center p-4 border-t border-gray-200 dark:border-gray-700 space-x-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-b shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          placeholder="Type a message..."
          disabled={sending}
          autoFocus
        />
        <button
          type="submit"
          className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 transition-colors"
          disabled={sending || !newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default MessageThreadPage; 