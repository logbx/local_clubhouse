import React, { useEffect, useState, useRef } from 'react';
import { messageService } from '../services/message.service';
import { webSocketService } from '../services/websocket.service';
import { formatMessageTimestamp } from '../utils/formatTimestamp';

interface SubGroupChatProps {
  subGroupId: string;
  subGroupName: string;
}

interface SubGroupMessage {
  _id: string;
  sender: {
    _id: string;
    username: string;
    profileImage?: string;
  };
  content: string;
  timestamp: string;
}

const SubGroupChat: React.FC<SubGroupChatProps> = ({ subGroupId, subGroupName }) => {
  const [messages, setMessages] = useState<SubGroupMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    messageService.getSubGroupMessages(subGroupId)
      .then(setMessages)
      .finally(() => setLoading(false));
    
    // Join sub-group chat room for real-time updates
    webSocketService.joinSubgroupChat(subGroupId);
    
    // Listen for new sub-group messages
    const handleNewSubgroupMessage = (message: SubGroupMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(existingMsg => existingMsg._id === message._id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
    };
    
    webSocketService.onNewSubgroupMessage(handleNewSubgroupMessage);
    
    // Cleanup on unmount or subGroupId change
    return () => {
      webSocketService.removeAllListeners();
    };
  }, [subGroupId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const res = await messageService.sendSubGroupMessage(subGroupId, newMsg);
      setMessages(prev => [...prev, res]);
      setNewMsg('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 mt-4">
      <h3 className="font-semibold p-2 text-gray-900 dark:text-white">Sub-Group: {subGroupName}</h3>
      <div className="h-64 overflow-y-auto space-y-2 p-2 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={`${msg._id}-${idx}`} className="flex items-start space-x-2">
              {msg.sender?.profileImage ? (
                <img src={msg.sender.profileImage} alt={msg.sender.username || 'User'} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 font-bold">
                  {msg.sender?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="font-semibold text-sm text-gray-900 dark:text-white">{msg.sender?.username || 'Unknown User'}</div>
                <div className="text-gray-800 dark:text-gray-200 text-sm">{msg.content}</div>
                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{formatMessageTimestamp(msg.timestamp)}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 p-2 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-b shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border border-gray-300 dark:border-gray-600 p-2 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
          placeholder="Say something..."
          disabled={sending}
        />
        <button 
          onClick={sendMessage} 
          className="bg-blue-600 dark:bg-blue-500 text-white px-4 rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 transition-colors" 
          disabled={sending || !newMsg.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default SubGroupChat; 