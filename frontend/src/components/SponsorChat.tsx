import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Sponsor } from '../types/sponsor';
import { SponsorSidebar } from './sponsor/SponsorSidebar';
import { ChatWindow } from './social/ChatWindow';
import { webSocketService } from '../services/websocket.service';

export interface SponsorChatSession {
  id: string;
  type: 'sponsor-event' | 'sponsor-club' | 'sponsor-team' | 'sponsor-other';
  name: string;
  avatarUrl?: string;
  isOnline?: boolean;
  lastMessage?: string;
  updatedAt?: string;
  unreadCount?: number;
  clubUsername?: string;
  eventId?: string;
  eventStatus?: string;
}

interface SponsorChatProps {
  sponsor: Sponsor;
  isOwner: boolean;
}

const SponsorChat: React.FC<SponsorChatProps> = ({ sponsor, isOwner }) => {
  const { user } = useAuth();
  const [selectedChat, setSelectedChat] = useState<SponsorChatSession | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      // WebSocket connection is already handled by AuthContext
      // Just set up the listeners for online/offline status
      webSocketService.onUserOnline(({ userId }) => {
        setOnlineUsers(prev => new Set(prev).add(userId));
      });
      
      webSocketService.onUserOffline(({ userId }) => {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
      });

      return () => {
        // Don't remove all listeners as other components might be using them
      };
    }
  }, [user]);

  const handleChatSelect = (chat: SponsorChatSession) => {
    setSelectedChat(chat);
  };

  return (
    <div className="h-96 bg-gray-50 dark:bg-gray-900 flex border border-gray-200 dark:border-gray-700 rounded-lg">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <SponsorSidebar
          sponsor={sponsor}
          isOwner={isOwner}
          selectedChat={selectedChat}
          onChatSelect={handleChatSelect}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <ChatWindow
            chat={selectedChat as any}
            onlineUsers={onlineUsers}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {sponsor.name} Communication Hub
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                {isOwner 
                  ? 'Manage your communications with events, clubs, and team members'
                  : 'Connect with the sponsor for collaboration opportunities'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SponsorChat; 