import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Event, EventFormData, EventStatus, EventVisibility, RecurrenceType } from '../types/event';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventApi } from '../services/api';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import TagInput from './TagInput';
import { commonEventTags } from '../data/suggestions';
import { FileUpload } from './FileUpload';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
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
  status: EventStatus.DRAFT,
};

// Popular tags for suggestions
const popularTags = [
  'Chess', 'Tech', 'Startup', 'Fitness', 'Sports',
  'Music', 'Art', 'Food', 'Business', 'Education',
  'Gaming', 'Social', 'Networking', 'Workshop', 'Conference'
];

const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose, event }) => {
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
        status: event.status || EventStatus.DRAFT,
      });
      if (event.imageUrl) {
        setImagePreview(event.imageUrl);
      }
    } else {
      setFormData(initialFormData);
      setImagePreview('');
      setShowPastDateWarning(false);
    }
  }, [event]);

  const createMutation = useMutation({
    mutationFn: (data: FormData) => eventApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) => eventApi.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
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

    const formDataToSend = new FormData();

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
      isFree: String(formData.isFree),
      tags: JSON.stringify(formData.tags || [])
    };

    // Append all form data
    Object.entries(dataToSend).forEach(([key, value]) => {
      formDataToSend.append(key, value.toString());
    });

    // Append image if exists
    if (imagePreview) {
      formDataToSend.append('image', imagePreview);
    }

    try {
      if (event) {
        // Validate event ID
        if (!event._id && !event.id) {
          throw new Error('Event ID is missing - cannot update event');
        }
        // Type assertion here is safe because we've checked both IDs exist
        const eventId = (event._id || event.id) as string;
        await updateMutation.mutateAsync({ id: eventId, data: formDataToSend });
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
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-lg flex flex-col max-h-[90vh]">
          <div className="flex justify-between items-center p-6 border-b shrink-0">
            <Dialog.Title className="text-xl font-semibold">
              {event ? 'Edit Event' : 'Create New Event'}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {showPastDateWarning && (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.485 3.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 3.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Image
                </label>
                    <FileUpload
                      maxSize={10 * 1024 * 1024}
                      onUploadComplete={url => {
                        setFormData(prev => ({ ...prev, imageUrl: url }));
                        setImagePreview(url);
                      }}
                      onUploadError={err => alert('Image upload failed: ' + err.message)}
                    />
                    {imagePreview && (
                      <div className="relative w-full h-48 mt-2">
                        <img src={imagePreview} alt="Event preview" className="w-full h-full object-cover rounded-md" />
                      <button
                        type="button"
                        onClick={() => {
                            setFormData(prev => ({ ...prev, imageUrl: '' }));
                          setImagePreview('');
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                    )}
              </div>

              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="startDate"
                    value={formData.startDate}
                    onChange={e => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    id="endDate"
                    value={formData.endDate}
                    onChange={e => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                  Location
                </label>
                <input
                  type="text"
                  id="location"
                  value={formData.location}
                  onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cost" className="block text-sm font-medium text-gray-700">
                    Cost
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">$</span>
                    </div>
                    <input
                      type="number"
                      id="cost"
                      value={formData.cost}
                      onChange={e => setFormData(prev => ({ ...prev, cost: Number(e.target.value) }))}
                          className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
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
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="isFree" className="ml-2 block text-sm text-gray-700">
                    This is a free event
                  </label>
                </div>
              </div>

              <div>
                <label htmlFor="visibility" className="block text-sm font-medium text-gray-700">
                  Visibility
                </label>
                <select
                  id="visibility"
                  value={formData.visibility}
                  onChange={e => setFormData(prev => ({ ...prev, visibility: e.target.value as EventVisibility }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
                >
                  <option value={EventVisibility.PUBLIC}>Public</option>
                  <option value={EventVisibility.PRIVATE}>Private</option>
                </select>
              </div>

              <div>
                <label htmlFor="recurrence" className="block text-sm font-medium text-gray-700">
                  Recurrence
                </label>
                <select
                  id="recurrence"
                  value={formData.recurrence}
                  onChange={e => setFormData(prev => ({ ...prev, recurrence: e.target.value as RecurrenceType }))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 bg-white text-gray-900"
                >
                  <option value="NONE">None</option>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700">
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

            <div className="flex justify-end space-x-4 p-6 border-t shrink-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 border border-transparent rounded-md shadow-sm hover:bg-primary-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                onClick={(e) => handleSubmit(e, false)}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
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