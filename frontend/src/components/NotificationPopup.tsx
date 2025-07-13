import React, { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { NotificationMessage } from '../services/notification.service';
import { formatMessageTimestamp } from '../utils/formatTimestamp';

interface NotificationPopupProps {
  notification: NotificationMessage;
  onClose: () => void;
  onClick: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({
  notification,
  onClose,
  onClick
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Show animation after component mounts
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation to complete
  };

  const handleClick = () => {
    setIsVisible(false);
    setTimeout(onClick, 300); // Wait for animation to complete
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'direct':
        return '💬';
      case 'group':
        return '👥';
      case 'event':
        return '📅';
      case 'subgroup':
        return '📋';
      case 'friend-group':
        return '👫';
      default:
        return '📨';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'direct':
        return 'bg-blue-500';
      case 'group':
        return 'bg-green-500';
      case 'event':
        return 'bg-purple-500';
      case 'subgroup':
        return 'bg-orange-500';
      case 'friend-group':
        return 'bg-pink-500';
      default:
        return 'bg-gray-500';
    }
  };

  const truncateContent = (content: string, maxLength: number = 60) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <div 
      className={`fixed top-4 right-4 z-50 transition-all duration-300 ease-in-out transform ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div
        onClick={handleClick}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-w-sm cursor-pointer hover:shadow-3xl transition-shadow duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getTypeColor(notification.type)}`}></div>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
              {notification.type === 'direct' ? 'Direct Message' : 
               notification.type === 'group' ? 'Group Chat' :
               notification.type === 'event' ? 'Event Chat' :
               notification.type === 'subgroup' ? 'Sub-group' :
               notification.type === 'friend-group' ? 'Friend Group' : 'Message'}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex items-start space-x-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {notification.senderImage ? (
              <img
                src={notification.senderImage}
                alt={notification.senderName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                <span className="text-lg">{getTypeIcon(notification.type)}</span>
              </div>
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {notification.senderName}
              </p>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                {formatMessageTimestamp(notification.timestamp)}
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
              {truncateContent(notification.content)}
            </p>
          </div>
        </div>

        {/* Click hint */}
        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
          Click to open chat
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;