import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import { webSocketService } from '../services/websocket.service';
import { useAuth } from '../context/AuthContext';

const NotificationToast: React.FC = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    // Listen for friend request notifications
    const handleFriendRequest = (request: any) => {
      toast.info(`${request.senderName || 'Someone'} sent you a friend request!`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    };

    // Listen for friend request updates
    const handleFriendRequestUpdate = (update: any) => {
      toast.success(update.message, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
    };

    // Listen for new messages (only show if not on the conversation page)
    const handleNewMessage = (message: any) => {
      // Only show notification if we're not currently viewing this conversation
      const currentPath = window.location.pathname;
      const isOnConversationPage = currentPath.includes('/messages/');
      
      if (!isOnConversationPage) {
        toast.info(`New message from ${message.sender?.username || 'Someone'}`, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
      }
    };

    // Listen for user online/offline status
    const handleUserOnline = (data: { userId: string }) => {
      // You can implement online status notifications here if needed
      console.log(`User ${data.userId} came online`);
    };

    const handleUserOffline = (data: { userId: string }) => {
      // You can implement offline status notifications here if needed
      console.log(`User ${data.userId} went offline`);
    };

    // Set up listeners
    webSocketService.onNewFriendRequest(handleFriendRequest);
    webSocketService.onFriendRequestUpdate(handleFriendRequestUpdate);
    webSocketService.onNewMessage(handleNewMessage);
    webSocketService.onUserOnline(handleUserOnline);
    webSocketService.onUserOffline(handleUserOffline);

    // Cleanup function
    return () => {
      // Note: We don't remove all listeners here as other components might be using them
      // The WebSocket service manages listeners appropriately
    };
  }, [user]);

  // This component doesn't render anything visible
  return null;
};

export default NotificationToast; 