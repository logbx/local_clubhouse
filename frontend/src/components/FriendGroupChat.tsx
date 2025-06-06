import React, { useEffect, useState, useRef } from 'react';
import { friendGroupApi } from '../services/api';

interface FriendGroupChatProps {
  groupId: string;
  groupName: string;
}

interface GroupMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profileImage?: string;
  };
  content: string;
  timestamp: string;
}

const FriendGroupChat: React.FC<FriendGroupChatProps> = ({ groupId, groupName }) => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const data = await friendGroupApi.getFriendGroupMessages(groupId);
        setMessages(data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, [groupId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const message = await friendGroupApi.sendFriendGroupMessage(groupId, newMessage);
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="text-center p-4">Loading messages...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h3 className="text-lg font-semibold">{groupName}</h3>
      </div>

      <div className="h-96 overflow-y-auto p-4 space-y-4">
        {messages.map((message: GroupMessage) => (
          <div key={message._id} className="flex items-start space-x-3">
            {message.sender?.profileImage ? (
              <img
                src={message.sender.profileImage}
                alt={message.sender.username || 'User'}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-sm text-gray-500">
                  {message.sender?.username?.charAt(0)?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm">{message.sender?.username || 'Unknown User'}</span>
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

      <form onSubmit={handleSendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || sending}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default FriendGroupChat; 