import React, { useEffect, useState, useRef } from 'react';
import { messageService } from '../services/message.service';
import { useAuth } from '../context/AuthContext';
import { Message } from '../types';

interface Friend {
  id: string;
  username: string;
  profileImage?: string;
}

interface ChatModalProps {
  open: boolean;
  onClose: () => void;
  friend: Friend;
}

const ChatModal: React.FC<ChatModalProps> = ({ open, onClose, friend }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

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

  // Handle click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [open, onClose]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [open, onClose]);

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
      <div ref={modalRef} className="bg-white rounded-lg shadow-lg w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between space-x-3 p-4 border-b">
          <div className="flex items-center space-x-3">
            {friend.profileImage ? (
              <img src={friend.profileImage} alt={friend.username} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-500">
                  {friend.username.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <span className="font-medium">{friend.username}</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center text-gray-500">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-gray-400">No messages yet.</div>
          ) : (
            messages.map((msg) => {
              // Check if the message is from the current user
              const currentUserId = user?.id || user?._id;
              const senderId = typeof msg.sender === 'string' ? msg.sender : String(msg.sender);
              const isCurrentUser = senderId === currentUserId;
              
              return (
                <div key={msg._id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`px-3 py-2 rounded-lg text-sm max-w-xs ${
                    isCurrentUser 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 text-gray-800'
                  }`}>
                    {msg.content}
                    <div className={`text-xs mt-1 text-right ${
                      isCurrentUser ? 'text-blue-100' : 'text-gray-400'
                    }`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              );
            })
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