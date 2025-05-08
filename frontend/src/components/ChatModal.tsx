import React, { useEffect, useRef, useState } from 'react';
import { messageService } from '../services/message.service';

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  friend: { id: string; fullName: string; profileImage?: string };
}

interface Message {
  _id: string;
  sender: string;
  receiver: string;
  content: string;
  timestamp: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ open, onClose, friend }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && friend.id) {
      setLoading(true);
      messageService.getConversation(friend.id)
        .then(setMessages)
        .finally(() => setLoading(false));
    }
  }, [open, friend.id]);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setSending(true);
    try {
      const sent = await messageService.sendMessage(friend.id, newMessage.trim());
      setMessages((prev) => [...prev, sent]);
      setNewMessage('');
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            {friend.profileImage ? (
              <img src={friend.profileImage} alt={friend.fullName} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                {friend.fullName.charAt(0)}
              </div>
            )}
            <span className="font-semibold">{friend.fullName}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400">No messages yet.</div>
          ) : (
            messages.map((msg) => (
              <div key={msg._id} className={`flex ${msg.sender === friend.id ? 'justify-start' : 'justify-end'}`}>
                <div className={`px-3 py-2 rounded-lg text-sm ${msg.sender === friend.id ? 'bg-gray-200 text-gray-800' : 'bg-blue-500 text-white'}`}>
                  {msg.content}
                  <div className="text-xs text-gray-400 mt-1 text-right">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
        <form onSubmit={handleSend} className="flex items-center p-4 border-t space-x-2">
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
    </div>
  );
};

export default ChatModal; 