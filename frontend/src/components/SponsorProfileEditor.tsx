import React, { useState } from 'react';
import { Sponsor, UpdateSponsorDto, SocialLink } from '../types/sponsor';
import { PlusIcon, TrashIcon, PhotoIcon, MapPinIcon, PhoneIcon, EnvelopeIcon, XMarkIcon, LinkIcon } from '@heroicons/react/24/outline';
import { ImageUpload } from './ImageUpload';
import { toast } from 'react-toastify';
import { sponsorApi } from '../services/sponsor.service';

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
  { name: 'Kansas City', state: 'MO', fullName: 'Kansas City, MO' },
  { name: 'Mesa', state: 'AZ', fullName: 'Mesa, AZ' },
  { name: 'Atlanta', state: 'GA', fullName: 'Atlanta, GA' },
  { name: 'Omaha', state: 'NE', fullName: 'Omaha, NE' },
  { name: 'Colorado Springs', state: 'CO', fullName: 'Colorado Springs, CO' },
  { name: 'Raleigh', state: 'NC', fullName: 'Raleigh, NC' },
  { name: 'Virginia Beach', state: 'VA', fullName: 'Virginia Beach, VA' },
  { name: 'Minneapolis', state: 'MN', fullName: 'Minneapolis, MN' },
  { name: 'Tulsa', state: 'OK', fullName: 'Tulsa, OK' },
  { name: 'Wichita', state: 'KS', fullName: 'Wichita, KS' },
  { name: 'New Orleans', state: 'LA', fullName: 'New Orleans, LA' },
];

interface SponsorProfileEditorProps {
  sponsor: Sponsor;
  onUpdate: (updatedSponsor: Sponsor) => void;
}

const SponsorProfileEditor: React.FC<SponsorProfileEditorProps> = ({ 
  sponsor, 
  onUpdate 
}) => {
  const [loading, setLoading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(sponsor.logoUrl || '');
  const [cityInput, setCityInput] = useState('');
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [filteredCities, setFilteredCities] = useState<typeof US_CITIES>([]);
  const [formData, setFormData] = useState<UpdateSponsorDto>({
    name: sponsor.name,
    logoUrl: sponsor.logoUrl,
    category: sponsor.category,
    locations: sponsor.locations,
    exactLocation: sponsor.exactLocation,
    bio: sponsor.bio,
    pinnedAnnouncement: sponsor.pinnedAnnouncement,
    mission: sponsor.mission,
    website: sponsor.website,
    phoneNumber: sponsor.phoneNumber,
    publicEmail: sponsor.publicEmail,
    socialLinks: sponsor.socialLinks,
    galleryImages: sponsor.galleryImages,
  });

  const categories = [
    'Fitness', 'Technology', 'Fashion', 'Food & Beverage', 'Sports', 
    'Entertainment', 'Automotive', 'Healthcare', 'Education', 'Travel',
    'Finance', 'Real Estate', 'Non-profit', 'Government', 'Other'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleLogoUpload = (url: string) => {
    setLogoPreview(url);
    setFormData(prev => ({ ...prev, logoUrl: url }));
    toast.success('Sponsor logo uploaded successfully');
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
    if (!formData.locations?.includes(city.fullName)) {
      const newLocations = [...(formData.locations || []), city.fullName];
      setFormData(prev => ({ ...prev, locations: newLocations }));
    }
    setCityInput('');
    setShowCitySuggestions(false);
    setFilteredCities([]);
  };

  const addCityManually = () => {
    if (cityInput.trim()) {
      // Check if it's a known city first
      const foundCity = US_CITIES.find(city => 
        city.fullName.toLowerCase() === cityInput.trim().toLowerCase() ||
        city.name.toLowerCase() === cityInput.trim().toLowerCase()
      );
      
      const cityToAdd = foundCity ? foundCity.fullName : cityInput.trim();
      
      if (!formData.locations?.includes(cityToAdd)) {
        const newLocations = [...(formData.locations || []), cityToAdd];
        setFormData(prev => ({ ...prev, locations: newLocations }));
      }
      setCityInput('');
      setShowCitySuggestions(false);
      setFilteredCities([]);
    }
  };

  const removeCity = (index: number) => {
    const newLocations = (formData.locations || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, locations: newLocations }));
  };

  const handleSocialLinkChange = (index: number, field: keyof SocialLink, value: string) => {
    const updatedLinks = [...(formData.socialLinks || [])];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };
    setFormData(prev => ({ ...prev, socialLinks: updatedLinks }));
  };

  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), { platform: '', url: '' }],
    }));
  };

  const removeSocialLink = (index: number) => {
    const updatedLinks = formData.socialLinks?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, socialLinks: updatedLinks }));
  };

  const handleGalleryImageAdd = (url: string) => {
    const newGalleryImages = [...(formData.galleryImages || []), url];
    setFormData(prev => ({ ...prev, galleryImages: newGalleryImages }));
    toast.success('Gallery image added successfully');
  };

  const handleGalleryImageRemove = (index: number) => {
    const newGalleryImages = (formData.galleryImages || []).filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, galleryImages: newGalleryImages }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Filter out empty social links and gallery images
      const cleanedFormData = {
        ...formData,
        socialLinks: formData.socialLinks?.filter(link => link.platform && link.url) || [],
        galleryImages: formData.galleryImages?.filter(url => url.trim()) || [],
        locations: formData.locations?.filter(loc => loc.trim()) || [],
      };

      // Call the API to update the sponsor
      const updatedSponsor = await sponsorApi.updateSponsor(sponsor._id, cleanedFormData);
      
      // Update the parent component with the new data
      onUpdate(updatedSponsor);
      
      toast.success('Sponsor profile updated successfully!');
    } catch (err: any) {
      console.error('Failed to update sponsor:', err);
      toast.error(err.response?.data?.message || 'Failed to update sponsor profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Edit Profile
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Company Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Company/Organization Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="input"
            required
          />
        </div>

        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Company Logo
          </label>
          <div className="flex items-start gap-6">
            {/* Current Logo Preview */}
            <div className="flex-shrink-0">
              {logoPreview ? (
                <div className="relative">
                  <img
                    src={logoPreview}
                    alt="Logo preview"
                    className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview('');
                      setFormData(prev => ({ ...prev, logoUrl: '' }));
                    }}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            
            {/* Upload Component */}
            <div className="flex-1">
              <ImageUpload
                endpoint="sponsor-logo"
                onUploadSuccess={handleLogoUpload}
                currentImage={logoPreview}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Category
          </label>
          <select
            id="category"
            name="category"
            value={formData.category || ''}
            onChange={handleInputChange}
            className="input"
          >
            <option value="">Select a category</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>

        {/* Service Areas */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Service Areas
          </label>
          
          {/* City Input with Autocomplete */}
          <div className="relative mb-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={cityInput}
                onChange={(e) => handleCityInputChange(e.target.value)}
                placeholder="Add a city (e.g., Austin, TX)"
                className="input flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCityManually())}
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
            
            {/* City Suggestions Dropdown */}
            {showCitySuggestions && filteredCities.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {filteredCities.map((city, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => addCityFromSuggestion(city)}
                    className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 transition-colors"
                  >
                    <MapPinIcon className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">{city.name}</span>
                    <span className="text-gray-500 dark:text-gray-400">{city.state}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected Cities */}
          {formData.locations && formData.locations.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Selected Cities:</p>
              <div className="flex flex-wrap gap-2">
                {formData.locations.map((location, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100 rounded-full text-sm"
                  >
                    <MapPinIcon className="h-3 w-3" />
                    {location}
                    <button
                      type="button"
                      onClick={() => removeCity(index)}
                      className="hover:text-blue-600 dark:hover:text-blue-200 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Cities or regions where you provide services or sponsor events
          </p>
        </div>

        {/* Exact Location */}
        <div>
          <label htmlFor="exactLocation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Primary Location
          </label>
          <input
            type="text"
            id="exactLocation"
            name="exactLocation"
            value={formData.exactLocation || ''}
            onChange={handleInputChange}
            className="input"
            placeholder="e.g., 123 Main St, New York, NY 10001"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Your main office or headquarters address
          </p>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            About Your Organization
          </label>
          <textarea
            id="bio"
            name="bio"
            value={formData.bio || ''}
            onChange={handleInputChange}
            rows={4}
            className="input resize-none"
            placeholder="Tell people about your organization..."
          />
        </div>

        {/* Pinned Announcement */}
        <div>
          <label htmlFor="pinnedAnnouncement" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Pinned Announcement
          </label>
          <textarea
            id="pinnedAnnouncement"
            name="pinnedAnnouncement"
            value={formData.pinnedAnnouncement || ''}
            onChange={handleInputChange}
            rows={3}
            className="input resize-none"
            maxLength={500}
            placeholder="Important announcement or news you'd like to highlight on your profile..."
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            This will be prominently displayed at the top of your profile (max 500 characters)
          </p>
        </div>

        {/* Mission */}
        <div>
          <label htmlFor="mission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Mission Statement
          </label>
          <textarea
            id="mission"
            name="mission"
            value={formData.mission || ''}
            onChange={handleInputChange}
            rows={3}
            className="input resize-none"
            placeholder="What is your organization's mission?"
          />
        </div>

        {/* Website */}
        <div>
          <label htmlFor="website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Website
          </label>
          <input
            type="url"
            id="website"
            name="website"
            value={formData.website || ''}
            onChange={handleInputChange}
            className="input"
            placeholder="https://your-website.com"
          />
        </div>

        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number
          </label>
          <div className="relative">
            <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="tel"
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber || ''}
              onChange={handleInputChange}
              className="input pl-10"
              placeholder="(555) 123-4567"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Public contact number for sponsorship inquiries
          </p>
        </div>

        {/* Public Email */}
        <div>
          <label htmlFor="publicEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contact Email
          </label>
          <div className="relative">
            <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              id="publicEmail"
              name="publicEmail"
              value={formData.publicEmail || ''}
              onChange={handleInputChange}
              className="input pl-10"
              placeholder="partnerships@yourcompany.com"
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Public email for sponsorship and partnership opportunities
          </p>
        </div>

        {/* Social Links - Enhanced Version */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-purple-500" />
              Social Links
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
            Add your organization's social media accounts and other important links.
          </p>

          {/* Platform Quick Add Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
            {[
              { name: 'Instagram', icon: '📸', placeholder: 'https://instagram.com/yourcompany' },
              { name: 'Twitter/X', icon: '𝕏', placeholder: 'https://x.com/yourcompany' },
              { name: 'LinkedIn', icon: '💼', placeholder: 'https://linkedin.com/company/yourcompany' },
              { name: 'Facebook', icon: '📘', placeholder: 'https://facebook.com/yourcompany' },
              { name: 'YouTube', icon: '▶️', placeholder: 'https://youtube.com/@yourcompany' },
              { name: 'TikTok', icon: '🎵', placeholder: 'https://tiktok.com/@yourcompany' },
              { name: 'Website', icon: '🌐', placeholder: 'https://yourcompany.com' },
              { name: 'Discord', icon: '💬', placeholder: 'https://discord.gg/yourserver' },
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
                // Get platform-specific placeholder and icon
                const getPlatformPlaceholder = (platform: string) => {
                  const lowerPlatform = platform.toLowerCase();
                  if (lowerPlatform.includes('instagram')) return 'https://instagram.com/yourcompany';
                  if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x')) return 'https://x.com/yourcompany';
                  if (lowerPlatform.includes('linkedin')) return 'https://linkedin.com/company/yourcompany';
                  if (lowerPlatform.includes('facebook')) return 'https://facebook.com/yourcompany';
                  if (lowerPlatform.includes('youtube')) return 'https://youtube.com/@yourcompany';
                  if (lowerPlatform.includes('tiktok')) return 'https://tiktok.com/@yourcompany';
                  if (lowerPlatform.includes('discord')) return 'https://discord.gg/yourserver';
                  if (lowerPlatform.includes('website') || lowerPlatform.includes('web')) return 'https://yourcompany.com';
                  return 'https://...';
                };

                const getPlatformIcon = (platform: string) => {
                  const lowerPlatform = platform.toLowerCase();
                  if (lowerPlatform.includes('instagram')) return '📸';
                  if (lowerPlatform.includes('twitter') || lowerPlatform.includes('x')) return '𝕏';
                  if (lowerPlatform.includes('linkedin')) return '💼';
                  if (lowerPlatform.includes('facebook')) return '📘';
                  if (lowerPlatform.includes('youtube')) return '▶️';
                  if (lowerPlatform.includes('tiktok')) return '🎵';
                  if (lowerPlatform.includes('discord')) return '💬';
                  if (lowerPlatform.includes('website') || lowerPlatform.includes('web')) return '🌐';
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
                            placeholder="e.g., Instagram, LinkedIn, Website"
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
        </div>

        {/* Gallery */}
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <PhotoIcon className="h-5 w-5 text-green-500" />
              Photo Gallery
            </h4>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Showcase your organization with photos from events, offices, products, or team activities.
          </p>

          {/* Gallery Upload */}
          <div className="mb-6">
            <ImageUpload
              endpoint="sponsor-gallery"
              onUploadSuccess={handleGalleryImageAdd}
              currentImage=""
              className="w-full"
            />
          </div>

          {/* Gallery Grid */}
          {formData.galleryImages && formData.galleryImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.galleryImages.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Gallery image ${index + 1}`}
                    className="w-full h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={() => handleGalleryImageRemove(index)}
                    className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all duration-200"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white dark:bg-gray-600 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-500">
              <div className="text-4xl mb-2">📸</div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
                No gallery images yet
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Upload images to showcase your organization
              </p>
            </div>
          )}
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SponsorProfileEditor; 