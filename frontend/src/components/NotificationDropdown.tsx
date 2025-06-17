import React, { useState, useEffect, useRef } from 'react';
import { BellIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { notificationService, NotificationMessage, UnreadCount } from '../services/notification.service';
import { formatMessageTimestamp } from '../utils/formatTimestamp';

const NotificationDropdown: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState<UnreadCount>({
    direct: 0,
    group: 0,
    event: 0,
    subgroup: 0,
    friendGroup: 0,
    total: 0
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Subscribe to notifications
    const unsubscribeNotifications = notificationService.subscribe(setNotifications);
    const unsubscribeCount = notificationService.subscribeToCount(setUnreadCount);

    // Load initial data
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    return () => {
      unsubscribeNotifications();
      unsubscribeCount();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: NotificationMessage) => {
    notificationService.navigateToChat(notification);
    setIsOpen(false);
  };

  const handleMarkAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const handleClearAll = () => {
    notificationService.clearAllNotifications();
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'direct':
        return 'bg-blue-100 text-blue-800';
      case 'group':
        return 'bg-green-100 text-green-800';
      case 'event':
        return 'bg-purple-100 text-purple-800';
      case 'subgroup':
        return 'bg-orange-100 text-orange-800';
      case 'friend-group':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'direct':
        return 'Direct';
      case 'group':
        return 'Group';
      case 'event':
        return 'Event';
      case 'subgroup':
        return 'Sub-Group';
      case 'friend-group':
        return 'Friend Group';
      default:
        return 'Message';
    }
  };

  const truncateContent = (content: string, maxLength: number = 50) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 rounded-lg"
        aria-label="Notifications"
      >
        {unreadCount.total > 0 ? (
          <BellSolidIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}
        
        {/* Notification Badge */}
        {unreadCount.total > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount.total > 99 ? '99+' : unreadCount.total}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Notifications
            </h3>
            <div className="flex items-center space-x-2">
              {unreadCount.total > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={handleClearAll}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                Clear all
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                <BellIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm">You'll see new messages here</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${
                      !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      {notification.senderImage ? (
                        <img
                          src={notification.senderImage}
                          alt={notification.senderName}
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                            {notification.senderName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {notification.senderName}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(notification.type)}`}>
                              {getTypeLabel(notification.type)}
                            </span>
                            {!notification.read && (
                              <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 truncate mt-1">
                          {truncateContent(notification.content)}
                        </p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {notification.chatName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatMessageTimestamp(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <button
                onClick={() => {
                  window.location.href = '/messages';
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
              >
                View all messages
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown; 