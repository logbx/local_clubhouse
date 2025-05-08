import React, { useEffect, useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { friendGroupApi } from '../services/api';

interface FriendGroupChatProps {
  groupId: string;
  groupName: string;
}

interface GroupMessage {
  _id: string;
  sender: {
    _id: string;
    fullName: string;
    profileImage?: string;
  };
  content: string;
  timestamp: string;
}

const FriendGroupChat: React.FC<FriendGroupChatProps> = ({ groupId, groupName }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['friendGroupMessages', groupId],
    queryFn: () => friendGroupApi.getFriendGroupMessages(groupId)
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content: string) => friendGroupApi.sendFriendGroupMessage(groupId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friendGroupMessages', groupId] });
      setNewMessage('');
    }
  });

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    sendMessageMutation.mutate(newMessage.trim());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{groupName}</h3>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message: GroupMessage) => (
          <div key={message._id} className="flex items-start space-x-3">
            {message.sender.profileImage ? (
              <img
                src={message.sender.profileImage}
                alt={message.sender.fullName}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm text-gray-500">
                  {message.sender.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{message.sender.fullName}</span>
                <span className="text-xs text-gray-500">
                  {new Date(message.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-gray-800">{message.content}</p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sendMessageMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default FriendGroupChat; 