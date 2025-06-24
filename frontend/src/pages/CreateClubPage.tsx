import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clubApi } from '../services/club.service';
import { CreateClubDto, SocialLink } from '../types/club';
import { PlusIcon, TrashIcon, PhotoIcon, LinkIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-toastify';

const CreateClubPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateClubDto>({
    name: '',
    username: '',
    description: '',
    logoUrl: '',
    socialLinks: [],
    photoGallery: [],
    instagramHandle: '',
  });

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  // Handle photo gallery URL addition
  const addPhotoUrl = () => {
    const url = prompt('Enter photo URL:');
    if (url && url.trim()) {
      setFormData(prev => ({
        ...prev,
        photoGallery: [...(prev.photoGallery || []), url.trim()],
      }));
    }
  };

  // Remove photo from gallery
  const removePhoto = (index: number) => {
    const updatedGallery = formData.photoGallery?.filter((_, i) => i !== index) || [];
    setFormData(prev => ({ ...prev, photoGallery: updatedGallery }));
  };

  // Generate username from name
  const generateUsername = () => {
    const username = formData.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    
    setFormData(prev => ({ ...prev, username }));
  };

  // Upload logo to S3 (placeholder for now)
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

      // Prepare club data
      const clubData: CreateClubDto = {
        ...formData,
        logoUrl,
        socialLinks: formData.socialLinks?.filter(link => link.platform && link.url) || [],
        photoGallery: formData.photoGallery?.filter(url => url.trim()) || [],
      };

      // Create club
      const newClub = await clubApi.createClub(clubData);
      toast.success('Club created successfully!');
      navigate(`/clubs/${newClub.username}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create club');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Please log in to create a club.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create a New Club</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Club Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Club Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input"
              required
              placeholder="Enter your club name"
            />
          </div>

          {/* Username */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Username *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleInputChange}
                className="input flex-1"
                required
                placeholder="your-club-username"
                pattern="^[a-z0-9_\-]+$"
                title="Username can only contain lowercase letters, numbers, hyphens, and underscores"
              />
              <button
                type="button"
                onClick={generateUsername}
                className="btn btn-secondary whitespace-nowrap"
                disabled={!formData.name}
              >
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your club will be available at: localclubhouse.com/{formData.username || 'your-username'}
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              className="input"
              placeholder="Tell people what your club is about..."
            />
          </div>

          {/* Instagram Handle */}
          <div>
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
                name="instagramHandle"
                value={formData.instagramHandle}
                onChange={handleInputChange}
                className="input pl-8"
                placeholder="your_instagram_handle"
                maxLength={30}
                pattern="^[a-zA-Z0-9._]*$"
                title="Instagram handle can only contain letters, numbers, dots, and underscores"
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Your latest Instagram posts will be displayed on the club page
            </p>
          </div>

          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Club Logo
            </label>
            <div className="flex items-center gap-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <PhotoIcon className="h-6 w-6 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-500 dark:text-gray-400
                           file:mr-4 file:py-2 file:px-4
                           file:rounded-full file:border-0
                           file:text-sm file:font-semibold
                           file:bg-primary-50 file:text-primary-700
                           hover:file:bg-primary-100
                           dark:file:bg-primary-900 dark:file:text-primary-300"
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Social Links
            </label>
            <div className="space-y-3">
              {formData.socialLinks?.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Platform (e.g., Instagram, Twitter)"
                    value={link.platform}
                    onChange={(e) => handleSocialLinkChange(index, 'platform', e.target.value)}
                    className="input flex-1"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={link.url}
                    onChange={(e) => handleSocialLinkChange(index, 'url', e.target.value)}
                    className="input flex-1"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    className="btn btn-secondary p-2"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addSocialLink}
                className="btn btn-secondary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Social Link
              </button>
            </div>
          </div>

          {/* Photo Gallery */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Photo Gallery
            </label>
            <div className="space-y-3">
              {formData.photoGallery && formData.photoGallery.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {formData.photoGallery.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={photo}
                        alt={`Photo ${index + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <TrashIcon className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={addPhotoUrl}
                className="btn btn-secondary flex items-center gap-2"
              >
                <PlusIcon className="h-4 w-4" />
                Add Photo URL
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-6">
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
              {loading ? 'Creating Club...' : 'Create Club'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateClubPage; 