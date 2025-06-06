import React, { useEffect, useState, useRef } from 'react';
import { messageService } from '../services/message.service';
import { webSocketService } from '../services/websocket.service';

interface EventChatProps {
  eventId: string;
}

interface EventMessage {
  id: string;
  sender: {
    id: string;
    username: string;
    profileImage?: string;
  };
  content: string;
  timestamp: string;
}

const EventChat: React.FC<EventChatProps> = ({ eventId }) => {
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!eventId || eventId === 'undefined') {
      console.warn('EventChat: Invalid eventId provided:', eventId);
      return;
    }
    
    setLoading(true);
    messageService.getEventMessages(eventId)
      .then(setMessages)
      .catch(error => {
        console.error('Failed to load event messages:', error);
        setMessages([]);
      })
      .finally(() => setLoading(false));
    
    // Join event chat room for real-time updates
    webSocketService.joinEventChat(eventId);
    
    // Listen for new event messages
    const handleNewEventMessage = (message: EventMessage) => {
      setMessages(prev => {
        // Check if message already exists to prevent duplicates
        const exists = prev.some(existingMsg => existingMsg.id === message.id);
        if (exists) {
          return prev;
        }
        return [...prev, message];
      });
    };
    
    webSocketService.onNewEventMessage(handleNewEventMessage);
    
    // Cleanup on unmount or eventId change
    return () => {
      webSocketService.removeAllListeners();
    };
  }, [eventId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!eventId || eventId === 'undefined') {
      console.error('Cannot send message: Invalid eventId');
      return;
    }
    
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const res = await messageService.sendEventMessage(eventId, newMsg);
      setMessages(prev => [...prev, res]);
      setNewMsg('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSending(false);
    }
  };

  // Don't render anything if eventId is invalid
  if (!eventId || eventId === 'undefined') {
    return (
      <div className="border-t mt-4">
        <h3 className="font-semibold p-2">Event Chat</h3>
        <div className="h-64 overflow-y-auto space-y-2 p-2 bg-white rounded shadow">
          <div className="text-center text-gray-400">Chat unavailable - invalid event ID</div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t mt-4">
      <h3 className="font-semibold p-2">Event Chat</h3>
      <div className="h-64 overflow-y-auto space-y-2 p-2 bg-white rounded shadow">
        {loading ? (
          <div className="text-center text-gray-500">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-gray-400">No messages yet.</div>
        ) : (
          messages.map((msg, idx) => (
            <div key={`${msg.id}-${idx}`} className="flex items-start space-x-2">
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

export default EventChat; 