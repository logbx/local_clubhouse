import React, { useEffect, useState } from 'react';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';
import GroupChat from '../components/GroupChat';
import { Message, Conversation } from '../types';
import { webSocketService } from '../services/websocket.service';

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchConversations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await messageService.getConversations();
        setConversations(data);
      } catch (err: any) {
        setError('Failed to load conversations');
      } finally {
        setLoading(false);
      }
    };
    fetchConversations();

    // Listen for new messages to update conversation list
    const handleNewMessage = (message: Message) => {
      // Refresh conversations when a new message arrives
      fetchConversations();
    };

    webSocketService.onNewMessage(handleNewMessage);

    return () => {
      // Note: We don't remove all listeners here as other components might be using them
    };
  }, []);

  return (
    <div className="max-w-2xl mx-auto py-8">
      <GroupChat />
      <h1 className="text-2xl font-bold mb-6 mt-8">Messages</h1>
      {loading && <div>Loading...</div>}
      {error && <div className="text-red-500">{error}</div>}
      {conversations.length === 0 && !loading && (
        <div className="text-gray-500">No conversations yet.</div>
      )}
      <ul className="divide-y divide-gray-200">
        {conversations.map((conv) => (
          <li key={conv.userId} className="py-4 flex items-center">
            {conv.profileImage ? (
              <img src={conv.profileImage} alt={conv.username} className="h-10 w-10 rounded-full object-cover mr-4" />
            ) : (
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold mr-4">
                {conv.username.charAt(0)}
              </div>
            )}
            <div className="flex-1">
              <div className="font-semibold">{conv.username}</div>
              <div className="text-gray-500 text-sm truncate">
                {conv.lastMessage ? conv.lastMessage.content : 'No messages yet.'}
              </div>
            </div>
            <button
              className="ml-4 btn btn-primary"
              onClick={() => window.location.href = `/messages/${conv.userId}`}
            >
              Open
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MessagesPage; 