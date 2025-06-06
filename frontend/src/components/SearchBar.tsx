import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // For linking to user/event pages
import { useQuery } from '@tanstack/react-query';
import { eventApi, publicApi } from '../services/api';
import axiosInstance from '../services/api';
import { User } from '../types/user'; // Adjust path if necessary
import { Event } from '../types/event'; // Adjust path if necessary
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
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
        <span key={i} className="bg-yellow-200">{part}</span>
      ) : part
    ));
  };

  return (
    <div className="relative">
      <div className="relative">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Search events, users, or tags..."
          className="pl-10 pr-4 py-2 w-full rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {isOpen && (
        <div className="relative">
          {results && (Object.values(results).some(arr => arr.length > 0)) && (
            <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
              {results.users && results.users.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Users
                  </h3>
                  <ul>
                    {results.users.map((user) => (
                      <li key={`user-${user.id}`} className="hover:bg-gray-100 rounded-md">
                        <Link
                          to={`/user/${user.id}`}
                          className="block px-2 py-2"
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {renderHighlight(user.username || 'Unknown User', searchTerm)}
                          </div>
                          {user.interests && user.interests.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Interests: {renderHighlight(user.interests.join(', '), searchTerm)}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.events && results.events.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t border-gray-200 pt-2 mt-1">
                    Events
                  </h3>
                  <ul>
                    {results.events.map((event) => (
                      <li key={`event-${event.id}`} className="hover:bg-gray-100 rounded-md">
                        <Link
                          to={`/event/${event.id}`}
                          className="block px-2 py-2"
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {renderHighlight(event.title || 'Untitled Event', searchTerm)}
                          </div>
                          {event.tags && event.tags.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Tags: {renderHighlight(event.tags.join(', '), searchTerm)}
                            </div>
                          )}
                          {event.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Desc: {renderHighlight(event.description, searchTerm)}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar; 