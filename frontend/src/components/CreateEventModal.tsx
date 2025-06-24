import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Event, EventFormData, EventStatus, EventVisibility, RecurrenceType, EventFeatures } from '../types/event';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventApi } from '../services/api';
import { XMarkIcon, PhotoIcon, CalendarIcon, MapPinIcon, ClockIcon } from '@heroicons/react/24/outline';
import TagInput from './TagInput';
import { commonEventTags } from '../data/suggestions';
import { FileUpload } from './FileUpload';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
  clubId?: string; // Optional club context
  clubUsername?: string; // Optional club username
}

const initialFormData: EventFormData = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  location: '',
  cost: 0,
  isFree: true,
  visibility: EventVisibility.PUBLIC,
  recurrence: RecurrenceType.NONE,
  tags: [],
  features: [],
  status: EventStatus.DRAFT,
  invitedUsers: [],
};

// Popular tags for suggestions
const popularTags = [
  'Chess', 'Tech', 'Startup', 'Fitness', 'Sports',
  'Music', 'Art', 'Food', 'Business', 'Education',
  'Gaming', 'Social', 'Networking', 'Workshop', 'Conference'
];

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, event, clubId, clubUsername }) => {
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [currentTag, setCurrentTag] = useState<string>('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showPastDateWarning, setShowPastDateWarning] = useState<boolean>(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (event) {
      const endDate = new Date(event.endDate);
      const now = new Date();
      setShowPastDateWarning(endDate < now && event.status !== EventStatus.DRAFT);

      setFormData({
        title: event.title || '',
        description: event.description || '',
        startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
        endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
        location: event.location || '',
        cost: event.cost || 0,
        isFree: event.isFree || false,
        visibility: event.visibility || EventVisibility.PUBLIC,
        recurrence: event.recurrence || RecurrenceType.NONE,
        tags: event.tags || [],
        features: event.features || [],
        status: event.status || EventStatus.DRAFT,
        clubId: event.clubId,
        clubUsername: event.clubUsername,
        invitedUsers: event.invitedUsers || [],
      });
      if (event.imageUrl) {
        setImagePreview(event.imageUrl);
      }
    } else {
      setFormData({
        ...initialFormData,
        clubId: clubId, // Set club context if provided
        clubUsername: clubUsername,
        visibility: clubId ? EventVisibility.CLUB : EventVisibility.PUBLIC, // Default to CLUB if in club context
      });
      setImagePreview('');
      setShowPastDateWarning(false);
    }
  }, [event, clubId, clubUsername]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => eventApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      // Also invalidate club events if this is a club event
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: ['club-events', clubId] });
      }
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => eventApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      // Also invalidate club events if this is a club event
      if (clubId) {
        queryClient.invalidateQueries({ queryKey: ['club-events', clubId] });
      }
      onClose();
    },
  });

  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault();

    // Validate all required fields with detailed error messages
    const validationErrors: string[] = [];

    if (!formData.title.trim()) {
      validationErrors.push('Title is required');
    }
    if (!formData.description.trim()) {
      validationErrors.push('Description is required');
    }
    if (!formData.location.trim()) {
      validationErrors.push('Location is required');
    }
    if (!formData.startDate) {
      validationErrors.push('Start date is required');
    }
    if (!formData.endDate) {
      validationErrors.push('End date is required');
    }

    // Validate date order
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);
    const now = new Date();
    
    if (endDate < startDate) {
      validationErrors.push('End date must be after start date');
    }

    // Check if there are any validation errors
    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    // Determine event status
    let status = saveAsDraft ? EventStatus.DRAFT : EventStatus.LIVE;
    if (!saveAsDraft && endDate < now) {
      status = EventStatus.PAST;
    }

    const dataToSend = {
      ...formData,
      status,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      cost: Number(formData.cost),
      isFree: Boolean(formData.isFree),
      tags: formData.tags || [],
      features: formData.features || [],
      invitedUsers: formData.invitedUsers || []
    };

    // Always use FormData for consistency
    const formDataToSend = new FormData();
    Object.entries(dataToSend).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'tags' || key === 'features' || key === 'invitedUsers') {
          // Handle arrays by JSON stringifying them
          formDataToSend.append(key, JSON.stringify(value));
        } else if (key === 'isFree') {
          formDataToSend.append(key, String(value));
        } else {
          formDataToSend.append(key, value.toString());
        }
      }
    });

    // Append image if exists
    if (imagePreview) {
      formDataToSend.append('image', imagePreview);
    }

    try {
      if (event) {
        // Use id consistently
        if (!event.id) {
          throw new Error('Event ID is missing - cannot update event');
        }
        await updateMutation.mutateAsync({ id: event.id, data: formDataToSend });
      } else {
        await createMutation.mutateAsync(formDataToSend);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
      const errorMessage = error instanceof Error 
        ? `Failed to save event: ${error.message}`
        : 'Failed to save event. Please try again.';
      alert(errorMessage);
    }
  };

  const handleTagInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value || '';
    setCurrentTag(value);
    
    if (value.trim()) {
      const suggestions = popularTags.filter(tag => 
        tag.toLowerCase().includes(value.toLowerCase()) &&
        !formData.tags.includes(tag)
      );
      setTagSuggestions(suggestions);
    } else {
      setTagSuggestions([]);
    }
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && currentTag.trim()) {
      e.preventDefault();
      const trimmedTag = currentTag.trim();
      
      // Validate tag length
      if (trimmedTag.length < 2) {
        alert('Tags must be at least 2 characters long');
        return;
      }
      
      // Check for maximum tag length
      if (trimmedTag.length > 20) {
        alert('Tags cannot be longer than 20 characters');
        return;
      }

      // Check for maximum number of tags
      if (formData.tags.length >= 10) {
        alert('Maximum of 10 tags allowed');
        return;
      }

      // Case-insensitive duplicate check
      if (formData.tags.some(tag => tag.toLowerCase() === trimmedTag.toLowerCase())) {
        alert('This tag has already been added');
        return;
      }

        setFormData(prev => ({
          ...prev,
        tags: [...prev.tags, trimmedTag]
        }));
      setCurrentTag('');
      setTagSuggestions([]);
    }
  };

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    
    // Reuse the same validation logic
    if (trimmedTag.length < 2) {
      alert('Tags must be at least 2 characters long');
      return;
    }
    
    if (trimmedTag.length > 20) {
      alert('Tags cannot be longer than 20 characters');
      return;
    }

    if (formData.tags.length >= 10) {
      alert('Maximum of 10 tags allowed');
      return;
    }

    if (formData.tags.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
      alert('This tag has already been added');
      return;
    }

      setFormData(prev => ({
        ...prev,
      tags: [...prev.tags, trimmedTag]
      }));
    setCurrentTag('');
    setTagSuggestions([]);
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/40 dark:bg-black/60" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg dark:shadow-gray-900/30 flex flex-col max-h-[90vh] border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200">
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <Dialog.Title className="text-xl font-semibold text-gray-900 dark:text-white">
              {event ? 'Edit Event' : 'Create New Event'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {showPastDateWarning && (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-500">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400 dark:text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    This event's end date has already passed. Consider updating the dates or marking it as a past event.
                  </p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={e => handleSubmit(e, false)} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 space-y-6">
            <div className="space-y-4">
              <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700/50">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Event Image
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(Recommended for better visibility)</span>
                </label>
                
                {!imagePreview ? (
                  <FileUpload
                    maxSize={10 * 1024 * 1024}
                    onUploadSuccess={url => {
                      setFormData(prev => ({ ...prev, imageUrl: url }));
                      setImagePreview(url);
                    }}
                    onUploadError={err => alert('Image upload failed: ' + err.message)}
                    buttonText="Add Event Image"
                  />
                ) : (
                  <div className="space-y-3">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-600">
                      <img 
                        src={imagePreview} 
                        alt="Event preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-all duration-200 flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, imageUrl: '' }));
                            setImagePreview('');
                          }}
                          className="absolute top-2 right-2 bg-red-500 dark:bg-red-600 text-white p-2 rounded-full hover:bg-red-600 dark:hover:bg-red-700 transition-colors duration-200 shadow-lg"
                          title="Remove image"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600 dark:text-gray-400">✓ Image uploaded successfully</p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, imageUrl: '' }));
                          setImagePreview('');
                        }}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
                      >
                        Change Image
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={formData.startDate}
                    onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={formData.endDate}
                    onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Cost
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="cost"
                      value={formData.cost}
                      onChange={e => setFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                          className="pl-7 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                      disabled={formData.isFree}
                    />
                  </div>
                </div>

                <div className="flex items-center mt-6">
                  <input
                    type="checkbox"
                    id="isFree"
                    checked={formData.isFree}
                    onChange={e => setFormData(prev => ({ ...prev, isFree: e.target.checked }))}
                    className="h-4 w-4 text-primary-600 dark:text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400 border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                  />
                  <label htmlFor="isFree" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    This is a free event
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Event Visibility
                </label>
                {clubId && (
                  <div className="mt-1 mb-2 p-3 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-md">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
                      💡 Club Event Options:
                    </p>
                    <ul className="mt-1 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                      <li>• <strong>Public:</strong> Appears on everyone's dashboard + your club page</li>
                      <li>• <strong>Club Only:</strong> Only visible to club members</li>
                      <li>• <strong>Private:</strong> Only visible to specific invited users</li>
                    </ul>
                  </div>
                )}
                <select
                  id="visibility"
                  value={formData.visibility}
                  onChange={e => setFormData(prev => ({ ...prev, visibility: e.target.value as EventVisibility }))}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  <option value={EventVisibility.PUBLIC}>
                    {clubId ? '🌍 Public - Show on all dashboards + club page' : 'Public - Visible to everyone'}
                  </option>
                  <option value={EventVisibility.PRIVATE}>Private - Only visible to invited users</option>
                  {clubId && <option value={EventVisibility.CLUB}>🏛️ Club Only - Only visible to club members</option>}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {formData.visibility === EventVisibility.PUBLIC && clubId && 'Event will appear on the main dashboard for all users AND on your club page.'}
                  {formData.visibility === EventVisibility.PUBLIC && !clubId && 'Event will appear on the public dashboard and be discoverable by all users.'}
                  {formData.visibility === EventVisibility.PRIVATE && 'Event will only be visible to you and users you specifically invite.'}
                  {formData.visibility === EventVisibility.CLUB && 'Event will only be visible to members of this club and won\'t appear on public dashboards.'}
                </p>
              </div>

              <div>
                <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recurrence
                </label>
                <select
                  id="recurrence"
                  value={formData.recurrence}
                  onChange={e => setFormData(prev => ({ ...prev, recurrence: e.target.value as RecurrenceType }))}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  <option value="NONE">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label htmlFor="features" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Features
                </label>
                <select
                  id="features"
                  value={formData.features && formData.features.length > 0 ? formData.features[0] : EventFeatures.NONE}
                  onChange={e => {
                    const value = e.target.value as EventFeatures;
                    setFormData(prev => ({ 
                      ...prev, 
                      features: value === EventFeatures.NONE ? [] : [value]
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  <option value={EventFeatures.NONE}>None</option>
                  <option value={EventFeatures.SINGLE_ELIMINATION_TOURNAMENT}>Single Elimination Tournament</option>
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tags
                </label>
                    <TagInput
                      value={formData.tags}
                      onChange={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
                      suggestions={commonEventTags}
                      placeholder="Add tags to help people find your event"
                      maxTags={10}
                    />
                </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-4 p-6 border-t border-gray-200 dark:border-gray-700 shrink-0 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 text-sm font-medium text-primary-700 dark:text-primary-300 bg-primary-100 dark:bg-primary-900/30 border border-transparent rounded-md shadow-sm hover:bg-primary-200 dark:hover:bg-primary-900/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                onClick={(e) => handleSubmit(e, false)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 dark:bg-primary-500 border border-transparent rounded-md shadow-sm hover:bg-primary-700 dark:hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 dark:focus:ring-primary-400 transition-colors"
              >
                {event ? 'Update Event' : 'Create Event'}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateEventModal; 