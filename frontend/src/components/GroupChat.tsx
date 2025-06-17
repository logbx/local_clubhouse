import React, { useEffect, useState, useRef } from 'react';
import { messageService } from '../services/message.service';
import { formatMessageTimestamp } from '../utils/formatTimestamp';
import { notificationService } from '../services/notification.service';

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

const GroupChat: React.FC = () => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    messageService.getGroupMessages()
      .then(setMessages)
      .catch((err) => {
        console.error('Failed to load group messages:', err);
        setError('Failed to load messages');
        setMessages([]);
      })
      .finally(() => setLoading(false));

    // Subscribe to notifications to track unread group messages
    const unsubscribe = notificationService.subscribeToCount((count) => {
      setUnreadCount(count.group);
    });

    // Initial count
    setUnreadCount(notificationService.getUnreadCount().group);

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await messageService.sendGroupMessage(newMsg);
      setMessages(prev => [...prev, res]);
      setNewMsg('');
    } catch (err) {
      console.error('Failed to send message:', err);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
      <div className="p-4 border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Public Group Chat</h3>
            {unreadCount > 0 && (
              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
            )}
          </div>
          {unreadCount > 0 && (
            <span className="bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
      
      <div className="h-64 overflow-y-auto space-y-3 p-4">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center text-red-500 dark:text-red-400">{error}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg._id || idx} className="flex items-start space-x-3">
              {msg.sender?.profileImage ? (
                <img src={msg.sender.profileImage} alt={msg.sender.username || 'User'} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                  {msg.sender?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-sm text-gray-900 dark:text-white">{msg.sender?.username || 'Unknown User'}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatMessageTimestamp(msg.timestamp)}
                  </span>
                </div>
                <p className="text-gray-800 dark:text-gray-200 text-sm mt-1">{msg.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50">
        {error && (
          <div className="mb-2 text-sm text-red-500 dark:text-red-400">{error}</div>
        )}
        <div className="flex gap-2">
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          placeholder="Say something..."
          disabled={sending}
        />
          <button 
            onClick={sendMessage} 
            className="px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" 
            disabled={sending || !newMsg.trim()}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GroupChat; 