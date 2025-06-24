import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clubApi } from '../services/club.service';
import { Club } from '../types/club';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  MagnifyingGlassIcon, 
  UserGroupIcon, 
  CalendarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { formatMessageTimestamp } from '../utils/formatTimestamp';

const ClubsExplorePage: React.FC = () => {
  const { user } = useAuth();
  const [myClubs, setMyClubs] = useState<Club[]>([]);
  const [allClubs, setAllClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [myClubsLoading, setMyClubsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Filter out user's clubs from explore clubs to avoid duplication
  const exploreClubs = useMemo(() => {
    if (!user || myClubs.length === 0) return allClubs;
    
    const myClubIds = new Set(myClubs.map(club => club._id));
    return allClubs.filter(club => !myClubIds.has(club._id));
  }, [allClubs, myClubs, user]);

  const fetchMyClubs = async () => {
    if (!user) return;
    try {
      setMyClubsLoading(true);
      const myClubsData = await clubApi.getUserClubs();
      setMyClubs(myClubsData);
    } catch (error) {
      console.error('Failed to fetch my clubs:', error);
    } finally {
      setMyClubsLoading(false);
    }
  };

  const fetchAllClubs = async (search?: string) => {
    try {
      setLoading(true);
      const clubsData = await clubApi.getClubs(search);
      setAllClubs(clubsData);
    } catch (error) {
      console.error('Failed to fetch clubs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClubs();
    fetchAllClubs();
  }, [user]);

  // Debounced search for explore clubs
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      fetchAllClubs(searchTerm);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const renderClubCard = (club: Club) => (
    <div key={club._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <Link to={`/clubs/${club.username}`} className="block">
        {/* Club Header */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Club Logo */}
            <div className="flex-shrink-0">
              {club.logoUrl ? (
                <img 
                  src={club.logoUrl} 
                  alt={club.name}
                  className="w-12 h-12 rounded-full object-cover border-2 border-primary-100 dark:border-primary-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                  <span className="text-lg font-bold text-primary-600 dark:text-primary-300">
                    {club.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Club Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {club.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                @{club.username}
              </p>
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <UserGroupIcon className="h-3 w-3" />
                  <span>{club.members.length} members</span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  <span>{formatMessageTimestamp(club.createdAt)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          {club.description && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-4 line-clamp-3">
              {club.description}
            </p>
          )}
        </div>

        {/* Photo Preview */}
        {club.photoGallery.length > 0 && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {club.photoGallery.slice(0, 3).map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`${club.name} photo ${index + 1}`}
                  className="w-full h-16 object-cover rounded"
                />
              ))}
            </div>
          </div>
        )}

        {/* Creator Info */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Created by{' '}
            <span className="font-medium text-gray-900 dark:text-white">
              {club.createdBy?.fullName || 'Unknown'}
            </span>
          </p>
        </div>
      </Link>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Clubs</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your clubs and discover new ones in your community
          </p>
        </div>
        {user && (
          <Link to="/create-club" className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Create Club
          </Link>
        )}
      </div>

      {/* Search Bar */}
      <div className="relative mb-8">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search clubs by name or description..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="input pl-10 w-full"
        />
      </div>

      {/* My Clubs Section */}
      {user && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Clubs</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {myClubs.length} {myClubs.length === 1 ? 'club' : 'clubs'}
            </span>
          </div>

          {myClubsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : myClubs.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No clubs yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You haven't joined or created any clubs yet. Start by creating your first club!
              </p>
              <Link to="/create-club" className="btn btn-primary">
                Create Your First Club
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myClubs.map(renderClubCard)}
            </div>
          )}
        </div>
      )}

      {/* Explore Clubs Section */}
      <div>
                 <div className="flex items-center justify-between mb-6">
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
             {searchTerm ? 'Search Results' : 'Explore Clubs'}
           </h2>
           <span className="text-sm text-gray-500 dark:text-gray-400">
             {exploreClubs.length} {exploreClubs.length === 1 ? 'club' : 'clubs'} found
           </span>
         </div>

         {loading ? (
           <div className="flex justify-center py-8">
             <LoadingSpinner />
           </div>
         ) : exploreClubs.length === 0 ? (
                     <div className="text-center py-16">
             <div className="max-w-md mx-auto">
               <UserGroupIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
               <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                 {searchTerm 
                   ? 'No clubs found' 
                   : myClubs.length > 0 
                     ? 'No more clubs to explore' 
                     : 'No clubs yet'
                 }
               </h3>
               <p className="text-gray-600 dark:text-gray-400 mb-6">
                 {searchTerm 
                   ? 'Try adjusting your search terms or browse all clubs.'
                   : myClubs.length > 0
                     ? 'You\'ve discovered all the clubs! Check back later for new ones.'
                     : 'Be the first to create a club in your community!'
                 }
               </p>
               {user && !searchTerm && myClubs.length === 0 && (
                 <Link to="/create-club" className="btn btn-primary">
                   Create the First Club
                 </Link>
               )}
             </div>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreClubs.map(renderClubCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClubsExplorePage; 