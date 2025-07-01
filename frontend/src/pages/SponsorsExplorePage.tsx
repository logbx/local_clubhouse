import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorApi } from '../services/sponsor.service';
import { Sponsor, SponsorSearchFilters } from '../types/sponsor';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { 
  MagnifyingGlassIcon, 
  BuildingOfficeIcon, 
  MapPinIcon,
  PlusIcon,
  FunnelIcon,
  StarIcon,
  CheckBadgeIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import { formatMessageTimestamp } from '../utils/formatTimestamp';

const SponsorsExplorePage: React.FC = () => {
  const { user } = useAuth();
  const [mySponsors, setMySponsors] = useState<Sponsor[]>([]);
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySponsorsLoading, setMySponsorsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);
  const [filters, setFilters] = useState<SponsorSearchFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Common categories for filtering
  const categories = [
    'Fitness', 'Technology', 'Fashion', 'Food & Beverage', 'Sports', 
    'Entertainment', 'Automotive', 'Healthcare', 'Education', 'Travel'
  ];

  // Sort options
  const sortOptions = [
    { value: 'recently_added', label: 'Recently Added' },
    { value: 'most_active', label: 'Most Active' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'featured', label: 'Featured' }
  ];

  // Filter out user's sponsors from explore sponsors to avoid duplication
  const exploreSponsors = useMemo(() => {
    if (!user || mySponsors.length === 0) return allSponsors;
    
    const mySponsorIds = new Set(mySponsors.map(sponsor => sponsor._id));
    return allSponsors.filter(sponsor => !mySponsorIds.has(sponsor._id));
  }, [allSponsors, mySponsors, user]);

  const fetchMySponsors = async () => {
    if (!user) return;
    try {
      setMySponsorsLoading(true);
      const mySponsorsData = await sponsorApi.getUserSponsors();
      setMySponsors(mySponsorsData);
    } catch (error) {
      console.error('Failed to fetch my sponsors:', error);
    } finally {
      setMySponsorsLoading(false);
    }
  };

  const fetchAllSponsors = async (searchFilters?: SponsorSearchFilters) => {
    try {
      setLoading(true);
      const sponsorsData = await sponsorApi.getSponsors(searchFilters);
      setAllSponsors(sponsorsData);
    } catch (error) {
      console.error('Failed to fetch sponsors:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMySponsors();
    fetchAllSponsors(filters);
  }, [user]);

  // Debounced search for explore sponsors
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    const timeout = setTimeout(() => {
      const searchFilters = { ...filters, search: searchTerm };
      fetchAllSponsors(searchFilters);
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchTerm, filters]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleFilterChange = (key: keyof SponsorSearchFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchTerm('');
  };

  const renderSponsorCard = (sponsor: Sponsor) => (
    <div key={sponsor._id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
      <Link to={`/sponsors/${sponsor.username}`} className="block">
        {/* Sponsor Header */}
        <div className="p-6">
          <div className="flex items-start gap-4">
            {/* Sponsor Logo */}
            <div className="flex-shrink-0">
              {sponsor.logoUrl ? (
                <img 
                  src={sponsor.logoUrl} 
                  alt={sponsor.name}
                  className="w-12 h-12 rounded-lg object-cover border-2 border-primary-100 dark:border-primary-800"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary-100 dark:bg-primary-800 flex items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 text-primary-600 dark:text-primary-300" />
                </div>
              )}
            </div>

            {/* Sponsor Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {sponsor.name}
                </h3>
                {sponsor.isVerified && (
                  <SparklesIcon className="h-4 w-4 text-blue-500" title="Verified Sponsor" />
                )}
                {sponsor.isFeatured && (
                  <StarIcon className="h-4 w-4 text-yellow-500" title="Featured Sponsor" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                @{sponsor.username}
              </p>
              
              {/* Category and Location */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
                {sponsor.category && (
                  <span className="px-2 py-1 bg-primary-100 dark:bg-primary-800 text-primary-700 dark:text-primary-300 rounded-full">
                    {sponsor.category}
                  </span>
                )}
                {sponsor.locations.length > 0 && (
                  <div className="flex items-center gap-1">
                    <MapPinIcon className="h-3 w-3" />
                    <span>{sponsor.locations[0]}</span>
                    {sponsor.locations.length > 1 && (
                      <span>+{sponsor.locations.length - 1}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <CheckBadgeIcon className="h-3 w-3" />
                  <span>{sponsor.stats.totalEventsSponsored} events</span>
                </div>
                <div className="flex items-center gap-1">
                  <BuildingOfficeIcon className="h-3 w-3" />
                  <span>{sponsor.stats.totalClubsPartnered} clubs</span>
                </div>
                <div className="flex items-center gap-1">
                  <StarIcon className="h-3 w-3" />
                  <span>{sponsor.followers.length} followers</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bio */}
          {sponsor.bio && (
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-4 line-clamp-3">
              {sponsor.bio}
            </p>
          )}
        </div>

        {/* Gallery Preview */}
        {sponsor.galleryImages.length > 0 && (
          <div className="px-6 pb-4">
            <div className="grid grid-cols-3 gap-2">
              {sponsor.galleryImages.slice(0, 3).map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${sponsor.name} gallery ${index + 1}`}
                  className="w-full h-16 object-cover rounded"
                />
              ))}
            </div>
          </div>
        )}

        {/* Footer with Testimonials */}
        {sponsor.testimonials.length > 0 && (
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {sponsor.testimonials.length} testimonial{sponsor.testimonials.length !== 1 ? 's' : ''}
              </p>
              {sponsor.testimonials.some(t => t.rating) && (
                <div className="flex items-center gap-1">
                  <StarIcon className="h-3 w-3 text-yellow-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {(sponsor.testimonials.reduce((sum, t) => sum + (t.rating || 0), 0) / sponsor.testimonials.length).toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Creator Info */}
        <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-100 dark:border-gray-600">
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Created {formatMessageTimestamp(sponsor.createdAt)}
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sponsors</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Discover sponsors and explore collaboration opportunities
          </p>
        </div>
        {user && (
          <Link to="/create-sponsor" className="btn btn-primary flex items-center gap-2">
            <PlusIcon className="h-4 w-4" />
            Create Sponsor Profile
          </Link>
        )}
      </div>

      {/* Search and Filters */}
      <div className="space-y-4 mb-8">
        {/* Search Bar */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search sponsors by name, bio, or category..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="input pl-10 w-full"
          />
        </div>

        {/* Filter Toggle */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <FunnelIcon className="h-4 w-4" />
            Filters
          </button>
          
          {(filters.category || filters.location || filters.sortBy) && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-800 dark:hover:text-primary-200 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category
                </label>
                <select
                  value={filters.category || ''}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="input w-full"
                >
                  <option value="">All Categories</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  placeholder="Enter location..."
                  value={filters.location || ''}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className="input w-full"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy || 'recently_added'}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="input w-full"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* My Sponsors Section */}
      {user && (
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Sponsors</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {mySponsors.length} {mySponsors.length === 1 ? 'sponsor' : 'sponsors'}
            </span>
          </div>

          {mySponsorsLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : mySponsors.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No sponsors yet
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You haven't created any sponsor profiles yet. Start by creating your first one!
              </p>
              <Link to="/create-sponsor" className="btn btn-primary">
                Create Your First Sponsor Profile
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mySponsors.map(renderSponsorCard)}
            </div>
          )}
        </div>
      )}

      {/* Explore Sponsors Section */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user ? 'Discover Sponsors' : 'All Sponsors'}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {exploreSponsors.length} {exploreSponsors.length === 1 ? 'sponsor' : 'sponsors'}
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : exploreSponsors.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No sponsors found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Try adjusting your search criteria or filters to find sponsors.
            </p>
            <button
              onClick={clearFilters}
              className="btn btn-secondary"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exploreSponsors.map(renderSponsorCard)}
          </div>
        )}
      </div>
    </div>
  );
};

export default SponsorsExplorePage; 