import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // For linking to user/event pages
import { useQuery } from '@tanstack/react-query';
import { eventApi, publicApi } from '../services/api';
import axiosInstance from '../services/api';
import { User } from '../types/user'; // Adjust path if necessary
import { Event } from '../types/event'; // Adjust path if necessary
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash/debounce';

interface SearchResults {
  users: Array<Partial<User> & { id: string; tags?: string[]; interests?: string[] }>;
  events: Array<Partial<Event> & { id: string }>;
}

const SearchBar: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const debouncedSearch = useCallback(
    debounce(async (term: string) => {
      if (!term.trim()) {
        setResults(null);
        return;
      }

      try {
        const response = await publicApi.search(term);
        setResults(response); // Backend returns results directly, not wrapped in data
      } catch (error) {
        console.error('Search error:', error);
        setResults(null);
      }
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  const renderHighlight = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.split(regex).map((part, i) => (
      regex.test(part) ? (
        <span key={i} className="bg-yellow-100 dark:bg-yellow-800 text-yellow-900 dark:text-yellow-100 px-0.5 rounded font-medium">{part}</span>
      ) : part
    ));
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-wrapper')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="search-wrapper relative" style={{ zIndex: 50 }}>
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search events, users, or tags..."
          className="pl-10 pr-10 py-3 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-primary-500 dark:focus:border-primary-400 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => {
              setSearchTerm('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {isOpen && results && (Object.values(results).some(arr => arr.length > 0)) && (
        <div 
          className="search-results-dropdown absolute left-0 right-0 mt-2 bg-gray-900 border border-gray-600 rounded-lg shadow-lg overflow-hidden"
          style={{ 
            zIndex: 99999,
            maxHeight: '400px',
            overflowY: 'auto'
          }}
        >
          {/* Header */}
          <div className="p-3 border-b border-gray-600 bg-gray-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Search Results</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 bg-gray-900">
              {results.users && results.users.length > 0 && (
              <div className="mb-4">
                <h4 className="px-2 py-1 text-xs font-semibold text-gray-300 uppercase tracking-wider bg-gray-800 rounded mb-2">
                  Users ({results.users.length})
                </h4>
                <div className="space-y-1">
                    {results.users.map((user) => (
                        <Link
                      key={`user-${user.id}`}
                          to={`/user/${user.id}`}
                      className="block px-3 py-2 hover:bg-gray-700 transition-colors duration-150 focus:outline-none focus:bg-gray-700 rounded"
                      onClick={() => setIsOpen(false)}
                        >
                      <div className="font-semibold text-sm text-white">
                            {renderHighlight(user.username || 'Unknown User', searchTerm)}
                          </div>
                          {user.interests && user.interests.length > 0 && (
                        <div className="text-xs text-gray-300 mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-600 text-gray-200 mr-1">
                            {user.interests[0]}
                          </span>
                          {user.interests.length > 1 && (
                            <span className="text-gray-400">
                              +{user.interests.length - 1} more
                            </span>
                          )}
                            </div>
                          )}
                        </Link>
                    ))}
                </div>
                </div>
              )}

              {results.events && results.events.length > 0 && (
              <div>
                <h4 className="px-2 py-1 text-xs font-semibold text-gray-300 uppercase tracking-wider bg-gray-800 rounded mb-2">
                  Events ({results.events.length})
                </h4>
                <div className="space-y-1">
                    {results.events.map((event) => (
                        <Link
                      key={`event-${event.id}`}
                          to={`/event/${event.id}`}
                      className="block px-3 py-2 hover:bg-gray-700 transition-colors duration-150 focus:outline-none focus:bg-gray-700 rounded"
                      onClick={() => setIsOpen(false)}
                        >
                      <div className="font-semibold text-sm text-white">
                            {renderHighlight(event.title || 'Untitled Event', searchTerm)}
                          </div>
                          {event.tags && event.tags.length > 0 && (
                        <div className="text-xs text-gray-300 mt-1">
                          <span className="text-gray-300 font-medium">Tags: </span>
                          {event.tags.map((tag, index) => (
                            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-800 text-blue-200 mr-1">
                              {renderHighlight(tag, searchTerm)}
                            </span>
                          ))}
                            </div>
                          )}
                          {event.description && (
                        <div className="text-xs text-gray-300 mt-1 line-clamp-2">
                          {renderHighlight(event.description, searchTerm)}
                            </div>
                          )}
                        </Link>
                    ))}
                </div>
                </div>
              )}
            
            {(!results.users || results.users.length === 0) && (!results.events || results.events.length === 0) && searchTerm && (
              <div className="p-4 text-center text-gray-300">
                <div className="text-sm font-medium">No results found</div>
                <div className="text-xs text-gray-400 mt-1">Try searching for different keywords</div>
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar; 