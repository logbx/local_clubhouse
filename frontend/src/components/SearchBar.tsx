import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom'; // For linking to user/event pages
import { useQuery } from '@tanstack/react-query';
import api from '../services/api'; // Changed from named import to default import
import { User } from '../types/user'; // Adjust path if necessary
import { Event } from '../types/event'; // Adjust path if necessary
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import debounce from 'lodash/debounce';

interface SearchResults {
  users: Array<Partial<User> & { _id: string; tags?: string[] }>;
  events: Array<Partial<Event> & { _id: string }>;
}

const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Debounced function to update the search term
  const debouncedSetSearchTerm = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSetSearchTerm(query);
    return () => {
      debouncedSetSearchTerm.cancel();
    };
  }, [query, debouncedSetSearchTerm]);

  const { data: results, isLoading, isError } = useQuery<SearchResults>({
    queryKey: ['search', searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return { users: [], events: [] };
      const response = await api.get(`/search?q=${searchTerm}`);
      return response.data;
    },
    enabled: searchTerm.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const handleFocus = () => setIsFocused(true);
  const handleBlur = () => {
    setTimeout(() => setIsFocused(false), 150);
  };

  const renderHighlight = (text: string, highlight: string) => {
    if (!highlight.trim()) {
      return <span>{text}</span>;
    }
    const regex = new RegExp(`(${highlight})`, 'gi');
    const parts = text.split(regex);
    return (
      <span>
        {parts.map((part, i) =>
          regex.test(part) ? (
            <strong key={i} className="font-bold text-primary-600 bg-primary-100">
              {part}
            </strong>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  const hasResults = (results?.users?.length ?? 0) > 0 || (results?.events?.length ?? 0) > 0;

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Search users, events, tags..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
      </div>

      {isFocused && query.length > 0 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {isLoading && (
            <div className="p-4 text-center text-gray-500">Loading...</div>
          )}
          {isError && (
            <div className="p-4 text-center text-red-500">Error loading results</div>
          )}
          {!isLoading && !isError && !hasResults && searchTerm.length > 0 && (
            <div className="p-4 text-center text-gray-500">No results found for "{searchTerm}"</div>
          )}
          {!isLoading && !isError && hasResults && (
            <div>
              {results?.users && results.users.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Users
                  </h3>
                  <ul>
                    {results.users.map((user) => (
                      <li key={`user-${user._id}`} className="hover:bg-gray-100 rounded-md">
                        <Link
                          to={`/user/${user._id}`}
                          className="block px-2 py-2"
                        >
                          <div className="font-medium text-sm text-gray-900">
                            {renderHighlight(user.fullName || 'Unnamed User', searchTerm)}
                          </div>
                          {user.interests && user.interests.length > 0 && (
                            <div className="text-xs text-gray-500">
                              Interests: {renderHighlight(user.interests.join(', '), searchTerm)}
                            </div>
                          )}
                          {user.bio && (
                            <div className="text-xs text-gray-500 mt-1 truncate">
                              Bio: {renderHighlight(user.bio, searchTerm)}
                            </div>
                          )}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {results?.events && results.events.length > 0 && (
                <div className="p-2">
                  <h3 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider border-t border-gray-200 pt-2 mt-1">
                    Events
                  </h3>
                  <ul>
                    {results.events.map((event) => (
                      <li key={`event-${event._id}`} className="hover:bg-gray-100 rounded-md">
                        <Link
                          to={`/event/${event._id}`}
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