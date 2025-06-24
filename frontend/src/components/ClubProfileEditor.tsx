import React, { useState } from 'react';
import { Club, UpdateClubProfileDto, SocialLink } from '../types/club';
import { toast } from 'react-toastify';
import { 
  PhotoIcon, 
  PlusIcon, 
  XMarkIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { ImageUpload } from './ImageUpload';
import ClubPhotoGallery from './ClubPhotoGallery';

// US Cities with state abbreviations for auto-completion
const US_CITIES = [
  // Texas
  { name: 'Austin', state: 'TX', fullName: 'Austin, TX' },
  { name: 'Dallas', state: 'TX', fullName: 'Dallas, TX' },
  { name: 'Houston', state: 'TX', fullName: 'Houston, TX' },
  { name: 'San Antonio', state: 'TX', fullName: 'San Antonio, TX' },
  { name: 'Fort Worth', state: 'TX', fullName: 'Fort Worth, TX' },
  { name: 'El Paso', state: 'TX', fullName: 'El Paso, TX' },
  { name: 'Arlington', state: 'TX', fullName: 'Arlington, TX' },
  { name: 'Corpus Christi', state: 'TX', fullName: 'Corpus Christi, TX' },
  { name: 'Plano', state: 'TX', fullName: 'Plano, TX' },
  { name: 'Lubbock', state: 'TX', fullName: 'Lubbock, TX' },
  { name: 'Laredo', state: 'TX', fullName: 'Laredo, TX' },
  { name: 'Irving', state: 'TX', fullName: 'Irving, TX' },
  { name: 'Garland', state: 'TX', fullName: 'Garland, TX' },
  { name: 'Frisco', state: 'TX', fullName: 'Frisco, TX' },
  { name: 'McKinney', state: 'TX', fullName: 'McKinney, TX' },
  { name: 'Amarillo', state: 'TX', fullName: 'Amarillo, TX' },
  { name: 'Grand Prairie', state: 'TX', fullName: 'Grand Prairie, TX' },
  { name: 'Brownsville', state: 'TX', fullName: 'Brownsville, TX' },
  { name: 'Pasadena', state: 'TX', fullName: 'Pasadena, TX' },
  { name: 'Mesquite', state: 'TX', fullName: 'Mesquite, TX' },
  
  // California
  { name: 'Los Angeles', state: 'CA', fullName: 'Los Angeles, CA' },
  { name: 'San Diego', state: 'CA', fullName: 'San Diego, CA' },
  { name: 'San Jose', state: 'CA', fullName: 'San Jose, CA' },
  { name: 'San Francisco', state: 'CA', fullName: 'San Francisco, CA' },
  { name: 'Fresno', state: 'CA', fullName: 'Fresno, CA' },
  { name: 'Sacramento', state: 'CA', fullName: 'Sacramento, CA' },
  { name: 'Long Beach', state: 'CA', fullName: 'Long Beach, CA' },
  { name: 'Oakland', state: 'CA', fullName: 'Oakland, CA' },
  { name: 'Bakersfield', state: 'CA', fullName: 'Bakersfield, CA' },
  { name: 'Anaheim', state: 'CA', fullName: 'Anaheim, CA' },
  
  // New York
  { name: 'New York', state: 'NY', fullName: 'New York, NY' },
  { name: 'Buffalo', state: 'NY', fullName: 'Buffalo, NY' },
  { name: 'Rochester', state: 'NY', fullName: 'Rochester, NY' },
  { name: 'Yonkers', state: 'NY', fullName: 'Yonkers, NY' },
  { name: 'Syracuse', state: 'NY', fullName: 'Syracuse, NY' },
  { name: 'Albany', state: 'NY', fullName: 'Albany, NY' },
  
  // Florida
  { name: 'Jacksonville', state: 'FL', fullName: 'Jacksonville, FL' },
  { name: 'Miami', state: 'FL', fullName: 'Miami, FL' },
  { name: 'Tampa', state: 'FL', fullName: 'Tampa, FL' },
  { name: 'Orlando', state: 'FL', fullName: 'Orlando, FL' },
  { name: 'St. Petersburg', state: 'FL', fullName: 'St. Petersburg, FL' },
  { name: 'Hialeah', state: 'FL', fullName: 'Hialeah, FL' },
  { name: 'Tallahassee', state: 'FL', fullName: 'Tallahassee, FL' },
  { name: 'Fort Lauderdale', state: 'FL', fullName: 'Fort Lauderdale, FL' },
  { name: 'Port St. Lucie', state: 'FL', fullName: 'Port St. Lucie, FL' },
  { name: 'Cape Coral', state: 'FL', fullName: 'Cape Coral, FL' },
  
  // Illinois
  { name: 'Chicago', state: 'IL', fullName: 'Chicago, IL' },
  { name: 'Aurora', state: 'IL', fullName: 'Aurora, IL' },
  { name: 'Rockford', state: 'IL', fullName: 'Rockford, IL' },
  { name: 'Joliet', state: 'IL', fullName: 'Joliet, IL' },
  { name: 'Naperville', state: 'IL', fullName: 'Naperville, IL' },
  { name: 'Springfield', state: 'IL', fullName: 'Springfield, IL' },
  { name: 'Peoria', state: 'IL', fullName: 'Peoria, IL' },
  
  // Other major cities
  { name: 'Phoenix', state: 'AZ', fullName: 'Phoenix, AZ' },
  { name: 'Philadelphia', state: 'PA', fullName: 'Philadelphia, PA' },
  { name: 'San Antonio', state: 'TX', fullName: 'San Antonio, TX' },
  { name: 'San Diego', state: 'CA', fullName: 'San Diego, CA' },
  { name: 'Dallas', state: 'TX', fullName: 'Dallas, TX' },
  { name: 'San Jose', state: 'CA', fullName: 'San Jose, CA' },
  { name: 'Austin', state: 'TX', fullName: 'Austin, TX' },
  { name: 'Jacksonville', state: 'FL', fullName: 'Jacksonville, FL' },
  { name: 'Fort Worth', state: 'TX', fullName: 'Fort Worth, TX' },
  { name: 'Columbus', state: 'OH', fullName: 'Columbus, OH' },
  { name: 'Charlotte', state: 'NC', fullName: 'Charlotte, NC' },
  { name: 'Indianapolis', state: 'IN', fullName: 'Indianapolis, IN' },
  { name: 'Seattle', state: 'WA', fullName: 'Seattle, WA' },
  { name: 'Denver', state: 'CO', fullName: 'Denver, CO' },
  { name: 'Washington', state: 'DC', fullName: 'Washington, DC' },
  { name: 'Boston', state: 'MA', fullName: 'Boston, MA' },
  { name: 'Nashville', state: 'TN', fullName: 'Nashville, TN' },
  { name: 'Baltimore', state: 'MD', fullName: 'Baltimore, MD' },
  { name: 'Oklahoma City', state: 'OK', fullName: 'Oklahoma City, OK' },
  { name: 'Louisville', state: 'KY', fullName: 'Louisville, KY' },
  { name: 'Portland', state: 'OR', fullName: 'Portland, OR' },
  { name: 'Las Vegas', state: 'NV', fullName: 'Las Vegas, NV' },
  { name: 'Milwaukee', state: 'WI', fullName: 'Milwaukee, WI' },
  { name: 'Albuquerque', state: 'NM', fullName: 'Albuquerque, NM' },
  { name: 'Tucson', state: 'AZ', fullName: 'Tucson, AZ' },
  { name: 'Fresno', state: 'CA', fullName: 'Fresno, CA' },
  { name: 'Sacramento', state: 'CA', fullName: 'Sacramento, CA' },
  { name: 'Kansas City', state: 'MO', fullName: 'Kansas City, MO' },
  { name: 'Mesa', state: 'AZ', fullName: 'Mesa, AZ' },
  { name: 'Atlanta', state: 'GA', fullName: 'Atlanta, GA' },
  { name: 'Omaha', state: 'NE', fullName: 'Omaha, NE' },
  { name: 'Colorado Springs', state: 'CO', fullName: 'Colorado Springs, CO' },
  { name: 'Raleigh', state: 'NC', fullName: 'Raleigh, NC' },
  { name: 'Virginia Beach', state: 'VA', fullName: 'Virginia Beach, VA' },
  { name: 'Long Beach', state: 'CA', fullName: 'Long Beach, CA' },
  { name: 'Miami', state: 'FL', fullName: 'Miami, FL' },
  { name: 'Oakland', state: 'CA', fullName: 'Oakland, CA' },
  { name: 'Minneapolis', state: 'MN', fullName: 'Minneapolis, MN' },
  { name: 'Tulsa', state: 'OK', fullName: 'Tulsa, OK' },
  { name: 'Wichita', state: 'KS', fullName: 'Wichita, KS' },
  { name: 'New Orleans', state: 'LA', fullName: 'New Orleans, LA' },
];

interface ClubProfileEditorProps {
  club: Club;
  onUpdate: (updateData: UpdateClubProfileDto) => Promise<void>;
}

const ClubProfileEditor: React.FC<ClubProfileEditorProps> = ({ club, onUpdate }) => {
  const [formData, setFormData] = useState<UpdateClubProfileDto>({
    name: club.name,
    description: club.description || '',
    mission: club.mission || '',
    story: club.story || '',
    logoUrl: club.logoUrl || '',
    socialLinks: [...club.socialLinks],
    photoGallery: [...club.photoGallery],
    sponsors: [...(club.sponsors || [])],
    pinnedMessage: club.pinnedMessage || '',
    instagramHandle: club.instagramHandle || '',
    activeCities: [...(club.activeCities || [])],
  });
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(club.logoUrl || '');
  const [cityInput, setCityInput] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<typeof US_CITIES>([]);

  const handleInputChange = (field: keyof UpdateClubProfileDto, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (url: string) => {
    setLogoPreview(url);
    setFormData(prev => ({ ...prev, logoUrl: url }));
    toast.success('Club logo uploaded successfully');
  };

  const handleSocialLinkChange = (index: number, field: 'platform' | 'url', value: string) => {
    const newSocialLinks = [...(formData.socialLinks || [])];
    newSocialLinks[index] = { ...newSocialLinks[index], [field]: value };
    setFormData(prev => ({ ...prev, socialLinks: newSocialLinks }));
  };

  const addSocialLink = () => {
    const newSocialLinks = [...(formData.socialLinks || []), { platform: '', url: '' }];
    setFormData(prev => ({ ...prev, socialLinks: newSocialLinks }));
  };

  const removeSocialLink = (index: number) => {
    const newSocialLinks = (formData.socialLinks || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, socialLinks: newSocialLinks }));
  };

  const handleCityInputChange = (value: string) => {
    setCityInput(value);
    if (value.trim().length > 0) {
      const filtered = US_CITIES.filter(city => 
        city.name.toLowerCase().includes(value.toLowerCase()) ||
        city.fullName.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10); // Limit to 10 suggestions
      setFilteredCities(filtered);
      setShowCitySuggestions(true);
    } else {
      setShowCitySuggestions(false);
      setFilteredCities([]);
    }
  };

  const addCityFromSuggestion = (city: typeof US_CITIES[0]) => {
    if (!formData.activeCities?.includes(city.fullName)) {
      const newActiveCities = [...(formData.activeCities || []), city.fullName];
      setFormData(prev => ({ ...prev, activeCities: newActiveCities }));
    }
    setCityInput('');
    setShowCitySuggestions(false);
    setFilteredCities([]);
  };

  const addCityManually = () => {
    if (cityInput.trim()) {
      // Check if it's a known city first
      const knownCity = US_CITIES.find(city => 
        city.name.toLowerCase() === cityInput.toLowerCase() ||
        city.fullName.toLowerCase() === cityInput.toLowerCase()
      );
      
      const cityToAdd = knownCity ? knownCity.fullName : cityInput.trim();
      
      if (!formData.activeCities?.includes(cityToAdd)) {
        const newActiveCities = [...(formData.activeCities || []), cityToAdd];
        setFormData(prev => ({ ...prev, activeCities: newActiveCities }));
      }
      setCityInput('');
      setShowCitySuggestions(false);
      setFilteredCities([]);
    }
  };

  const removeCity = (index: number) => {
    const newActiveCities = (formData.activeCities || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, activeCities: newActiveCities }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Club name is required');
      return;
    }

    try {
      setLoading(true);
      
      // Validate and clean social links
      const cleanedSocialLinks = (formData.socialLinks || []).filter(
        link => link.platform.trim() && link.url.trim()
      ).map(link => ({
        platform: link.platform,
        url: link.url
        // Remove _id field to avoid validation issues
      }));

      // Validate and clean sponsors
      const cleanedSponsors = (formData.sponsors || []).filter(
        sponsor => sponsor.name.trim()
      ).map(sponsor => ({
        name: sponsor.name.trim(),
        isFeatured: sponsor.isFeatured || false
      }));

      console.log('Original social links:', formData.socialLinks);
      console.log('Cleaned social links:', cleanedSocialLinks);
      console.log('Cleaned sponsors:', cleanedSponsors);

      // Validate URLs
      for (const link of cleanedSocialLinks) {
        console.log('Validating link:', link);
        if (!link.url.startsWith('http://') && !link.url.startsWith('https://')) {
          toast.error(`URL for ${link.platform} must start with http:// or https://`);
          return;
        }
        if (link.platform.length > 50) {
          toast.error(`Platform name "${link.platform}" is too long (max 50 characters)`);
          return;
        }
        if (link.url.length > 500) {
          toast.error(`URL for ${link.platform} is too long (max 500 characters)`);
          return;
        }
      }

      const updateData: UpdateClubProfileDto = {
        ...formData,
        socialLinks: cleanedSocialLinks,
        sponsors: cleanedSponsors,
      };

      console.log('Sending update data:', updateData);

      await onUpdate(updateData);
    } catch (err: any) {
      console.error('Update error:', err);
      console.error('Error response:', err.response);
      console.error('Error response data:', err.response?.data);
      if (err.response?.data?.message) {
        if (Array.isArray(err.response.data.message)) {
          // Handle validation errors array
          err.response.data.message.forEach((msg: string) => toast.error(msg));
        } else {
          toast.error(err.response.data.message);
        }
      } else {
        toast.error('Failed to update club profile');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Basic Information
        </h4>
        
        {/* Club Logo Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Club Logo
          </label>
          <div className="flex items-center space-x-6">
            {/* Logo preview */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Club logo preview"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">
                      {formData.name ? formData.name.charAt(0).toUpperCase() : 'C'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Upload component */}
            <div className="flex-grow">
              <ImageUpload
                endpoint="club-logos"
                onUploadSuccess={handleLogoUpload}
                className="w-full"
                currentImage={logoPreview}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Upload a square image for best results. PNG, JPG up to 5MB.
              </p>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Club Name *
            </label>
            <input
              type="text"
              id="name"
              value={formData.name || ''}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="input"
              required
            />
          </div>
        </div>

        <div className="mt-4">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            value={formData.description || ''}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="input"
            placeholder="Tell people about your club..."
          />
        </div>

        <div className="mt-4">
          <label htmlFor="mission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Our Mission
          </label>
          <textarea
            id="mission"
            rows={4}
            value={formData.mission || ''}
            onChange={(e) => handleInputChange('mission', e.target.value)}
            className="input"
            placeholder="What is your club's mission and purpose? (Leave empty to hide this section)"
            maxLength={2000}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {(formData.mission || '').length}/2000 characters • Will appear as "Our Mission" section on club page
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="story" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Our Story
          </label>
          <textarea
            id="story"
            rows={4}
            value={formData.story || ''}
            onChange={(e) => handleInputChange('story', e.target.value)}
            className="input"
            placeholder="Tell the story of how your club started and evolved... (Leave empty to hide this section)"
            maxLength={2000}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {(formData.story || '').length}/2000 characters • Will appear as "Our Story" section on club page
          </p>
        </div>

        <div className="mt-4">
          <label htmlFor="instagramHandle" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Instagram Handle
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 dark:text-gray-400 text-sm">@</span>
            </div>
            <input
              type="text"
              id="instagramHandle"
              value={formData.instagramHandle || ''}
              onChange={(e) => handleInputChange('instagramHandle', e.target.value)}
              className="input pl-8"
              placeholder="your_instagram_handle"
              maxLength={30}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your Instagram posts will be displayed on the club page when members visit
          </p>
        </div>
      </div>

      {/* Pinned Message */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <MapPinIcon className="h-5 w-5" />
          Pinned Welcome Message
        </h4>
        
        <div>
          <label htmlFor="pinnedMessage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Welcome Message (displayed at top of club page)
          </label>
          <textarea
            id="pinnedMessage"
            rows={3}
            value={formData.pinnedMessage || ''}
            onChange={(e) => handleInputChange('pinnedMessage', e.target.value)}
            className="input"
            placeholder="Welcome to our club! Here's what you should know..."
            maxLength={300}
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {(formData.pinnedMessage || '').length}/300 characters
          </p>
        </div>
      </div>

      {/* Active Cities */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPinIcon className="h-5 w-5" />
            Active Cities
          </h4>
        </div>
        
        {/* City Input with Auto-complete */}
        <div className="mb-4 relative">
          <div className="flex gap-2">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => handleCityInputChange(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCityManually();
                }
              }}
              className="input flex-1"
              placeholder="Type city name (e.g., Austin, Dallas, Houston...)"
            />
            <button
              type="button"
              onClick={addCityManually}
              className="btn btn-secondary px-4 py-2 flex items-center gap-1"
            >
              <PlusIcon className="h-4 w-4" />
              Add
            </button>
          </div>
          
          {/* Auto-complete suggestions */}
          {showCitySuggestions && filteredCities.length > 0 && (
            <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
              {filteredCities.map((city, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => addCityFromSuggestion(city)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                >
                  <MapPinIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-900 dark:text-white">{city.fullName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {formData.activeCities && formData.activeCities.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.activeCities.map((city, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full px-3 py-1"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{city}</span>
                <button
                  type="button"
                  onClick={() => removeCity(index)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            No cities added yet. Start typing to add cities where your club is active.
          </p>
        )}
        
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Add cities where your club is active to help members find local events and meetups. Cities will automatically include state abbreviations (e.g., "Austin" becomes "Austin, TX").
        </p>
      </div>

      {/* Our Links */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🔗 Our Links
          </h4>
          <button
            type="button"
            onClick={addSocialLink}
            className="btn btn-secondary btn-sm flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            Add Link
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add your club's social media accounts, website, and other important links. These will be displayed prominently on your club page.
        </p>

        {/* Platform Quick Add Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
          {[
            { name: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/yourclub' },
            { name: 'Twitter/X', icon: '𝕏', placeholder: 'https://x.com/yourclub' },
            { name: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/@yourclub' },
            { name: 'Discord', icon: '💬', placeholder: 'https://discord.gg/yourserver' },
            { name: 'Website', icon: '🌐', placeholder: 'https://yourclub.com' },
            { name: 'Chess.com', icon: '♟️', placeholder: 'https://chess.com/club/yourclub' },
            { name: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/yourclub' },
            { name: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@yourclub' },
          ].map((platform) => (
            <button
              key={platform.name}
              type="button"
              onClick={() => {
                const existingIndex = formData.socialLinks?.findIndex(link => 
                  link.platform.toLowerCase().includes(platform.name.toLowerCase().split('/')[0])
                );
                if (existingIndex === -1 || existingIndex === undefined) {
                  const newSocialLinks = [...(formData.socialLinks || []), { 
                    platform: platform.name, 
                    url: '' 
                  }];
                  setFormData(prev => ({ ...prev, socialLinks: newSocialLinks }));
                }
              }}
              className="flex items-center gap-2 p-2 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors text-sm"
            >
              <span className="text-lg">{platform.icon}</span>
              <span className="text-gray-700 dark:text-gray-200 font-medium">{platform.name}</span>
            </button>
          ))}
        </div>

        {formData.socialLinks && formData.socialLinks.length > 0 ? (
          <div className="space-y-4">
            {formData.socialLinks.map((link, index) => {
              // Get platform-specific placeholder
              const getPlatformPlaceholder = (platform: string) => {
                const lowerPlatform = platform.toLowerCase();
                if (lowerPlatform.includes('instagram')) return 'https://instagram.com/yourclub';
                if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x')) return 'https://x.com/yourclub';
                if (lowerPlatform.includes('youtube')) return 'https://youtube.com/@yourclub';
                if (lowerPlatform.includes('discord')) return 'https://discord.gg/yourserver';
                if (lowerPlatform.includes('chess')) return 'https://chess.com/club/yourclub';
                if (lowerPlatform.includes('facebook')) return 'https://facebook.com/yourclub';
                if (lowerPlatform.includes('tiktok')) return 'https://tiktok.com/@yourclub';
                if (lowerPlatform.includes('website') || lowerPlatform.includes('web')) return 'https://yourclub.com';
                return 'https://...';
              };

              const getPlatformIcon = (platform: string) => {
                const lowerPlatform = platform.toLowerCase();
                if (lowerPlatform.includes('instagram')) return '📸';
                if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x')) return '𝕏';
                if (lowerPlatform.includes('youtube')) return '▶️';
                if (lowerPlatform.includes('discord')) return '💬';
                if (lowerPlatform.includes('chess')) return '♟️';
                if (lowerPlatform.includes('facebook')) return '📘';
                if (lowerPlatform.includes('tiktok')) return '🎵';
                if (lowerPlatform.includes('website') || lowerPlatform.includes('web')) return '🌐';
                if (lowerPlatform.includes('linkedin')) return '💼';
                return '🔗';
              };

              return (
                <div key={index} className="bg-white dark:bg-gray-600 rounded-lg p-4 border border-gray-200 dark:border-gray-500">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg">
                      {getPlatformIcon(link.platform)}
                    </div>
                    <div className="flex-1 space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Platform Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., Instagram, Twitter, Website"
                          value={link.platform}
                          onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                          className="input w-full"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          URL
                        </label>
                        <input
                          type="url"
                          placeholder={getPlatformPlaceholder(link.platform)}
                          value={link.url}
                          onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                          className="input w-full"
                        />
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => removeSocialLink(index)}
                        className="p-2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-white dark:bg-gray-600 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-500">
            <div className="text-4xl mb-2">🔗</div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
              No links added yet
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Click "Add Link" or use the quick buttons above to get started
            </p>
          </div>
        )}
        
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-start gap-2">
            <div className="text-blue-500 mt-0.5">💡</div>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Pro Tips:</strong>
              <ul className="mt-1 space-y-1 text-xs">
                <li>• Instagram links will show with @ handles automatically</li>
                <li>• Chess.com links will display usernames cleanly</li>
                <li>• Website links will show with a globe icon</li>
                <li>• Make sure URLs start with https:// for security</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Photo Gallery */}
      <ClubPhotoGallery
        photos={formData.photoGallery || []}
        onPhotosChange={(photos) => handleInputChange('photoGallery', photos)}
        isEditable={true}
      />

      {/* Sponsors Management */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            🏆 Club Sponsors
          </h4>
          <button
            type="button"
            onClick={() => {
              const newSponsors = [...(formData.sponsors || []), { name: '', isFeatured: false }];
              handleInputChange('sponsors', newSponsors);
            }}
            className="btn btn-secondary btn-sm flex items-center gap-1"
          >
            <PlusIcon className="h-4 w-4" />
            Add Sponsor
          </button>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add sponsors that support your club. Featured sponsors will be highlighted with a crown icon and displayed prominently on your club page.
        </p>

        {formData.sponsors && formData.sponsors.length > 0 ? (
          <div className="space-y-4">
            {formData.sponsors.map((sponsor, index) => (
              <div key={index} className="bg-white dark:bg-gray-600 rounded-lg p-4 border border-gray-200 dark:border-gray-500">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-lg">
                    {sponsor.isFeatured ? '👑' : '🏢'}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Sponsor Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Mozart's Coffee Roasters, Nike NYC"
                        value={sponsor.name}
                        onChange={(e) => {
                          const newSponsors = [...(formData.sponsors || [])];
                          newSponsors[index] = { ...sponsor, name: e.target.value };
                          handleInputChange('sponsors', newSponsors);
                        }}
                        className="input w-full"
                        maxLength={100}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sponsor.isFeatured}
                          onChange={(e) => {
                            const newSponsors = [...(formData.sponsors || [])];
                            newSponsors[index] = { ...sponsor, isFeatured: e.target.checked };
                            handleInputChange('sponsors', newSponsors);
                          }}
                          className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 dark:focus:ring-yellow-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                          <span className="text-lg">👑</span>
                          Featured Sponsor
                        </span>
                      </label>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const newSponsors = formData.sponsors?.filter((_, i) => i !== index) || [];
                          handleInputChange('sponsors', newSponsors);
                        }}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {sponsor.isFeatured && (
                  <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg">
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 flex items-center gap-1">
                      <span className="text-sm">👑</span>
                      This sponsor will be featured prominently on your club page with a crown icon
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h5 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No sponsors added yet
            </h5>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
              Add sponsors that support your club. You can feature important sponsors with a crown icon.
            </p>
            <button
              type="button"
              onClick={() => {
                handleInputChange('sponsors', [{ name: '', isFeatured: false }]);
              }}
              className="btn btn-primary btn-sm"
            >
              Add Your First Sponsor
            </button>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <h6 className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-2">💡 Pro Tips:</h6>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Featured sponsors get crown icons and are displayed first</li>
            <li>• Sponsors will be shown on your club page and in the sponsors modal</li>
            <li>• Future feature: Sponsors will be able to create their own pages</li>
          </ul>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={loading}
          className="btn btn-primary flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Updating...
            </>
          ) : (
            'Update Club Profile'
          )}
        </button>
      </div>
    </form>
  );
};

export default ClubProfileEditor; 