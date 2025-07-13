import React, { useState, useEffect } from 'react';
import { notificationService, NotificationMessage } from '../services/notification.service';
import NotificationPopup from './NotificationPopup';

interface PopupNotification extends NotificationMessage {
  popupId: string;
  showTime: number;
}

const NotificationPopupManager: React.FC = () => {
  const [popups, setPopups] = useState<PopupNotification[]>([]);

  useEffect(() => {
    // Listen for new notifications
    const unsubscribe = notificationService.subscribe((notifications) => {
      // Only show popup for the newest notification if it's unread
      const latestNotification = notifications[0];
      if (latestNotification && !latestNotification.read) {
        // Check if this notification is already showing as a popup
        const isAlreadyShowing = popups.some(popup => popup.id === latestNotification.id);
        if (!isAlreadyShowing) {
          const popupNotification: PopupNotification = {
            ...latestNotification,
            popupId: `popup-${Date.now()}`,
            showTime: Date.now()
          };
          
          setPopups(prev => [...prev, popupNotification]);
          
          // Auto-remove after 5 seconds
          setTimeout(() => {
            setPopups(prev => prev.filter(p => p.popupId !== popupNotification.popupId));
          }, 5000);
        }
      }
    });

    return unsubscribe;
  }, [popups]);

  const handlePopupClose = (popupId: string) => {
    setPopups(prev => prev.filter(p => p.popupId !== popupId));
  };

  const handlePopupClick = (notification: NotificationMessage) => {
    // Navigate to the chat and mark as read
    notificationService.navigateToChat(notification);
    
    // Remove this popup
    setPopups(prev => prev.filter(p => p.id !== notification.id));
  };

  return (
    <>
      {popups.map((popup, index) => (
        <div
          key={popup.popupId}
          style={{
            top: `${16 + index * 120}px`, // Stack popups vertically
            right: '16px'
          }}
          className="absolute"
        >
          <NotificationPopup
            notification={popup}
            onClose={() => handlePopupClose(popup.popupId)}
            onClick={() => handlePopupClick(popup)}
          />
        </div>
      ))}
    </>
  );
};

export default NotificationPopupManager;