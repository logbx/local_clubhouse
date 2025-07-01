import React, { useState, useEffect, useRef } from 'react';
import {
  InformationCircleIcon,
  CalendarIcon,
  PhotoIcon,
  ChatBubbleLeftIcon,
  ChatBubbleOvalLeftIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface ClubBottomNavbarProps {
  activeTab: 'about' | 'events' | 'comments' | 'chat' | 'members';
  onTabChange: (tab: 'about' | 'events' | 'comments' | 'chat' | 'members') => void;
  showChat: boolean;
  showMembers: boolean;
  footerElementId?: string; // ID of the footer element where navbar should stop
}

const ClubBottomNavbar: React.FC<ClubBottomNavbarProps> = ({
  activeTab,
  onTabChange,
  showChat,
  showMembers,
  footerElementId = 'global-footer'
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isSticky, setIsSticky] = useState(true);
  const navbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (footerElementId) {
      const handleScroll = () => {
        const footerElement = document.getElementById(footerElementId);
        const navbarElement = navbarRef.current;
        
        if (footerElement && navbarElement) {
          const footerRect = footerElement.getBoundingClientRect();
          const navbarHeight = navbarElement.offsetHeight;
          const spacingBuffer = 24; // 24px spacing buffer between navbar and footer
          
          // Check if footer is approaching the bottom of the viewport
          const shouldStick = footerRect.top > window.innerHeight - navbarHeight - spacingBuffer;
          setIsSticky(shouldStick);
        }
      };

      // Use requestAnimationFrame for smoother performance
      let rafId: number;
      const smoothHandleScroll = () => {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(handleScroll);
      };

      window.addEventListener('scroll', smoothHandleScroll, { passive: true });
      window.addEventListener('resize', smoothHandleScroll, { passive: true });
      handleScroll(); // Check initial position

      return () => {
        window.removeEventListener('scroll', smoothHandleScroll);
        window.removeEventListener('resize', smoothHandleScroll);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
  }, [footerElementId]);

  const handleTabClick = (tabId: 'about' | 'events' | 'comments' | 'chat' | 'members') => {
    onTabChange(tabId);
    
    // Smooth scroll to top after tab change
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  const tabs = [
    {
      id: 'about' as const,
      name: 'About',
      icon: InformationCircleIcon,
      show: true,
    },
    {
      id: 'events' as const,
      name: 'Events',
      icon: CalendarIcon,
      show: true,
    },
    {
      id: 'comments' as const,
      name: 'Comments',
      icon: ChatBubbleLeftIcon,
      show: true,
    },
    {
      id: 'chat' as const,
      name: 'Chat',
      icon: ChatBubbleOvalLeftIcon,
      show: showChat,
    },
    {
      id: 'members' as const,
      name: 'Members',
      icon: UsersIcon,
      show: showMembers,
    },
  ].filter(tab => tab.show);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={navbarRef}
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg transition-transform duration-300 ${
        isSticky ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      <div className="max-w-6xl mx-auto px-4">
        <nav className="flex justify-around items-center py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id)}
                className={`flex flex-col items-center justify-center px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-1 max-w-20 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="h-6 w-6 mb-1" />
                <span className="text-xs font-medium truncate">
                  {tab.name}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default ClubBottomNavbar; 