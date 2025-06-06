import React, { useEffect, useState, useRef } from 'react';
import { messageService } from '../services/message.service';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    messageService.getGroupMessages()
      .then(setMessages)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const res = await messageService.sendGroupMessage(newMsg);
      setMessages(prev => [...prev, res]);
      setNewMsg('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-t mt-4">
      <h3 className="font-semibold p-2">General Group Chat</h3>
      <div className="h-64 overflow-y-auto space-y-2 p-2 bg-white rounded shadow">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={msg._id || idx} className="flex items-start space-x-2">
              {msg.sender?.profileImage ? (
                <img src={msg.sender.profileImage} alt={msg.sender.username || 'User'} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                  {msg.sender?.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="font-semibold text-sm">{msg.sender?.username || 'Unknown User'}</div>
                <div className="text-gray-800 text-sm">{msg.content}</div>
                <div className="text-xs text-gray-400 mt-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex gap-2 p-2 border-t bg-white rounded-b shadow">
        <input
          value={newMsg}
          onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          className="flex-1 border p-2 rounded"
          placeholder="Say something..."
          disabled={sending}
        />
        <button onClick={sendMessage} className="bg-blue-600 text-white px-4 rounded" disabled={sending || !newMsg.trim()}>Send</button>
      </div>
    </div>
  );
};

export default GroupChat; 