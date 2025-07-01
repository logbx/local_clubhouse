import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { sponsorApi } from '../services/sponsor.service';
import { CreateSponsorDto, SocialLink } from '../types/sponsor';
import { PlusIcon, TrashIcon, PhotoIcon, LinkIcon, BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const CreateSponsorPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateSponsorDto>({
    name: '',
    username: '',
    logoUrl: '',
    category: '',
    locations: [],
    bio: '',
    mission: '',
    website: '',
    socialLinks: [],
    galleryImages: [],
  });

  // Common categories for sponsors
  const categories = [
    'Fitness', 'Technology', 'Fashion', 'Food & Beverage', 'Sports', 
    'Entertainment', 'Automotive', 'Healthcare', 'Education', 'Travel',
    'Finance', 'Real Estate', 'Non-profit', 'Government', 'Other'
  ];

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  // Upload logo file (placeholder for now)
  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return null;

    try {
      // TODO: Implement actual S3 upload using presigned URLs
      // For MVP, we'll use the preview URL as placeholder
      return logoPreview;
    } catch (error) {
      console.error('Failed to upload logo:', error);
      toast.error('Failed to upload logo');
      return null;
    }
  };

  // Handle social link changes
  const handleSocialLinkChange = (index: number, field: keyof SocialLink, value: string) => {
    const updatedLinks = [...(formData.socialLinks || [])];
    updatedLinks[index] = { ...updatedLinks[index], [field]: value };
    setFormData(prev => ({ ...prev, socialLinks: updatedLinks }));
  };

  // Add new social link
  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [...(prev.socialLinks || []), { platform: '', url: '' }],
    }));
  };

  // Remove social link
  const removeSocialLink = (index: number) => {
    const updatedLinks = formData.socialLinks?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, socialLinks: updatedLinks }));
  };

  // Handle locations change
  const handleLocationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const locations = value.split(',').map(loc => loc.trim()).filter(loc => loc);
    setFormData(prev => ({ ...prev, locations }));
  };

  // Handle gallery images change
  const handleGalleryImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const images = value.split(',').map(img => img.trim()).filter(img => img);
    setFormData(prev => ({ ...prev, galleryImages: images }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Upload logo if provided
      let logoUrl = formData.logoUrl;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Prepare sponsor data
      const sponsorData: CreateSponsorDto = {
        ...formData,
        logoUrl,
        socialLinks: formData.socialLinks?.filter(link => link.platform && link.url) || [],
        galleryImages: formData.galleryImages?.filter(url => url.trim()) || [],
        locations: formData.locations?.filter(loc => loc.trim()) || [],
      };

      // Create sponsor
      const newSponsor = await sponsorApi.createSponsor(sponsorData);
      toast.success('Sponsor profile created successfully!');
      navigate(`/sponsors/${newSponsor.username}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create sponsor profile');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Please log in to create a sponsor profile.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <BuildingOfficeIcon className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create Sponsor Profile</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Sponsor Name */}
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
              placeholder="Enter your company or organization name"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username *
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="input"
              required
              placeholder="Choose a unique username"
              pattern="[a-z0-9_\-]+"
              title="Username can only contain lowercase letters, numbers, hyphens, and underscores"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              This will be used in your sponsor profile URL: /sponsors/{formData.username || 'username'}
            </p>
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Category
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleInputChange}
              className="input"
            >
              <option value="">Select a category</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          {/* Locations */}
          <div>
            <label htmlFor="locations" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Locations
            </label>
            <input
              type="text"
              id="locations"
              name="locations"
              value={formData.locations?.join(', ') || ''}
              onChange={handleLocationsChange}
              className="input"
              placeholder="Enter locations separated by commas (e.g., New York, Los Angeles, Chicago)"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate multiple locations with commas
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Company Logo
            </label>
            <div className="flex items-center space-x-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <PhotoIcon className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                    file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0
                    file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700
                    hover:file:bg-primary-100 dark:file:bg-primary-900 dark:file:text-primary-300"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Upload a square logo (recommended: 200x200px)
                </p>
              </div>
            </div>
          </div>

          {/* Bio */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              About Your Organization
            </label>
            <textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              rows={4}
              className="input resize-none"
              placeholder="Tell people about your organization..."
            />
          </div>

          {/* Mission */}
          <div>
            <label htmlFor="mission" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mission Statement
            </label>
            <textarea
              id="mission"
              name="mission"
              value={formData.mission}
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
              value={formData.website}
              onChange={handleInputChange}
              className="input"
              placeholder="https://your-website.com"
            />
          </div>

          {/* Social Links */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Social Links
              </label>
              <button
                type="button"
                onClick={addSocialLink}
                className="btn btn-secondary btn-sm flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                Add Link
              </button>
            </div>
            
            {formData.socialLinks?.map((link, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Platform (e.g., Instagram)"
                  value={link.platform}
                  onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                  className="input flex-1"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={link.url}
                  onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                  className="input flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeSocialLink(index)}
                  className="btn btn-secondary btn-sm"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Gallery Images */}
          <div>
            <label htmlFor="galleryImages" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Gallery Images (URLs)
            </label>
            <input
              type="text"
              id="galleryImages"
              name="galleryImages"
              value={formData.galleryImages?.join(', ') || ''}
              onChange={handleGalleryImagesChange}
              className="input"
              placeholder="Enter image URLs separated by commas"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Separate multiple image URLs with commas
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !formData.name || !formData.username}
              className="btn btn-primary"
            >
              {loading ? 'Creating Sponsor Profile...' : 'Create Sponsor Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSponsorPage; 