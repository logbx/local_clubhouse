import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
}

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
    }
  }, [userId]);

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
      <h1 className="text-2xl font-bold mb-6">Conversation</h1>
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white rounded shadow">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400">No messages yet.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className={`flex ${msg.sender === userId ? 'justify-start' : 'justify-end'}`}>
              <div className={`px-3 py-2 rounded-lg text-sm ${msg.sender === userId ? 'bg-gray-200 text-gray-800' : 'bg-blue-500 text-white'}`}>
                {msg.content}
                <div className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="flex items-center p-4 border-t space-x-2 bg-white rounded-b shadow">
        <input
          type="text"
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring"
          placeholder="Type a message..."
          disabled={sending}
          autoFocus
        />
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          disabled={sending || !newMessage.trim()}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default MessageThreadPage; 