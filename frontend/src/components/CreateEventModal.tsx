import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { Event, EventFormData, EventStatus, EventVisibility, RecurrenceType, EventFeatures } from '../types/event';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { eventApi } from '../services/api';
import { clubApi } from '../services/club.service';
import { sponsorApi } from '../services/sponsor.service';
import { XMarkIcon, PhotoIcon, CalendarIcon, MapPinIcon, ClockIcon, UserPlusIcon, XCircleIcon } from '@heroicons/react/24/outline';
import TagInput from './TagInput';
import { commonEventTags } from '../data/suggestions';
import { FileUpload } from './FileUpload';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
  clubId?: string;
  clubUsername?: string;
  isSponsorship?: boolean;
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
  sponsors: [], // Array of sponsor requests with approval status
};

// Popular tags for suggestions
const popularTags = [
  'Chess', 'Tech', 'Startup', 'Fitness', 'Sports',
  'Music', 'Art', 'Food', 'Business', 'Education',
  'Gaming', 'Social', 'Networking', 'Workshop', 'Conference'
];

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  isOpen,
  onClose,
  event,
  clubId,
  clubUsername,
  isSponsorship = false
}) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState<EventFormData>(initialFormData);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [currentTag, setCurrentTag] = useState<string>('');
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [showPastDateWarning, setShowPastDateWarning] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const [selectedClub, setSelectedClub] = useState<string>('');
  const [availableClubs, setAvailableClubs] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isDraft, setIsDraft] = useState<boolean>(true);

  // Sponsor selection state
  const [sponsorSearchTerm, setSponsorSearchTerm] = useState<string>('');
  const [availableSponsors, setAvailableSponsors] = useState<any[]>([]);
  const [selectedSponsors, setSelectedSponsors] = useState<any[]>([]);
  const [showSponsorSearch, setShowSponsorSearch] = useState<boolean>(false);

  // Generate time options in 10-minute increments
  const generateTimeOptions = () => {
    const hours = [];
    for (let hour = 1; hour <= 12; hour++) {
      hours.push({ value: hour.toString(), label: hour.toString() });
    }

    const minutes = [];
    for (let minute = 0; minute < 60; minute += 10) {
      const minuteStr = minute.toString().padStart(2, '0');
      minutes.push({ value: minuteStr, label: minuteStr });
    }

    const periods = [
      { value: 'AM', label: 'AM' },
      { value: 'PM', label: 'PM' }
    ];

    return { hours, minutes, periods };
  };

  const { hours: hourOptions, minutes: minuteOptions, periods: periodOptions } = generateTimeOptions();

  // Helper functions to extract hour, minute, and period from time string
  const extractHour = (timeString: string) => {
    if (!timeString) return '';
    const [hour] = timeString.split(':');
    const hourNum = parseInt(hour);
    if (hourNum === 0) return '12';
    if (hourNum > 12) return (hourNum - 12).toString();
    return hourNum.toString();
  };

  const extractMinute = (timeString: string) => {
    if (!timeString) return '';
    const [, minute] = timeString.split(':');
    return minute || '00';
  };

  const extractPeriod = (timeString: string) => {
    if (!timeString) return '';
    const [hour] = timeString.split(':');
    const hourNum = parseInt(hour);
    return hourNum < 12 ? 'AM' : 'PM';
  };

  // Helper function to combine hour, minute, and period into 24-hour format
  const combineTime = (hour: string, minute: string, period: string) => {
    if (!hour || !minute || !period) return '';
    
    let hour24 = parseInt(hour);
    if (period === 'AM' && hour24 === 12) {
      hour24 = 0;
    } else if (period === 'PM' && hour24 !== 12) {
      hour24 += 12;
    }
    
    return `${hour24.toString().padStart(2, '0')}:${minute}`;
  };

  // Helper functions to extract date and time from datetime string
  const extractDate = (datetimeString: string) => {
    if (!datetimeString) return '';
    return datetimeString.split('T')[0];
  };

  const extractTime = (datetimeString: string) => {
    if (!datetimeString) return '';
    const timePart = datetimeString.split('T')[1];
    if (!timePart) return '';
    return timePart.substring(0, 5); // HH:MM format
  };

  // Helper function to combine date and time
  const combineDateAndTime = (date: string, time: string) => {
    if (!date || !time) return '';
    return `${date}T${time}`;
  };

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
        sponsors: event.sponsors || [],
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

  // Fetch available clubs for collaboration
  useEffect(() => {
    if (isSponsorship) {
      const fetchClubs = async () => {
        try {
          const clubs = await clubApi.getClubs();
          setAvailableClubs(clubs);
        } catch (error) {
          console.error('Failed to fetch clubs:', error);
        }
      };
      fetchClubs();
    }
  }, [isSponsorship]);

  // Fetch available sponsors for selection
  useEffect(() => {
    if (!isSponsorship) { // Only for regular club events, not sponsor events
      const fetchSponsors = async () => {
        try {
          const sponsors = await sponsorApi.getSponsors();
          setAvailableSponsors(sponsors);
        } catch (error) {
          console.error('Failed to fetch sponsors:', error);
        }
      };
      fetchSponsors();
    }
  }, [isSponsorship]);

  // Sync selectedSponsors with form data
  useEffect(() => {
    if (event?.sponsors && availableSponsors.length > 0) {
      console.log('🔄 Syncing sponsors for event edit:', {
        eventSponsors: event.sponsors,
        availableSponsors: availableSponsors.length
      });
      
      const eventSponsors = availableSponsors.filter(sponsor => 
        event.sponsors?.some(s => {
          // Handle both object format {sponsorId: "id", status: "pending"} and string format
          const sponsorId = typeof s === 'object' ? s.sponsorId : s;
          const matchesId = typeof sponsorId === 'string' ? 
            sponsorId === sponsor._id : 
            (sponsorId && typeof sponsorId === 'object' && '_id' in sponsorId) ? (sponsorId as any)._id === sponsor._id : false;
          
          console.log('🔍 Checking sponsor match:', {
            eventSponsor: s,
            sponsorId,
            availableSponsor: sponsor._id,
            matches: matchesId
          });
          
          return matchesId;
        })
      );
      
      console.log('✅ Found matching sponsors:', eventSponsors);
      setSelectedSponsors(eventSponsors);
      
      // Also update formData to ensure consistency
      setFormData(prev => ({
        ...prev,
        sponsors: event.sponsors || []
      }));
    } else if (!event) {
      // Clear sponsors when no event is selected
      setSelectedSponsors([]);
    }
  }, [event?.sponsors, availableSponsors]);

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

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formDataToSubmit = new FormData();
      
      // Set status to DRAFT
      const eventData = {
        ...formData,
        status: EventStatus.DRAFT
      };
      
      console.log('💾 Saving draft with data:', {
        eventData,
        sponsors: eventData.sponsors,
        selectedSponsors
      });
      
      // Append all form data
      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            if (key === 'sponsors') {
              console.log('📤 Sending sponsors to backend:', value);
            }
            formDataToSubmit.append(key, JSON.stringify(value));
          } else {
            formDataToSubmit.append(key, value.toString());
          }
        }
      });

      // Log what's actually in FormData
      console.log('📋 FormData contents:');
      for (let [key, value] of formDataToSubmit.entries()) {
        if (key === 'sponsors') {
          console.log(`  ${key}:`, value);
        }
      }

      if (event?.id) {
        // Update existing event
        console.log('🔄 Updating existing event:', event.id);
        await eventApi.updateEvent(event.id, formDataToSubmit);
        toast.success('Draft saved successfully!');
      } else {
        // Create new event
        console.log('🆕 Creating new event');
        await createMutation.mutateAsync(formDataToSubmit);
        toast.success('Draft created successfully!');
      }
      onClose();
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formDataToSubmit = new FormData();
      
      // Set status to LIVE for publish
      const eventData = {
        ...formData,
        status: EventStatus.LIVE
      };
      
      console.log('🚀 Publishing event with data:', {
        eventData,
        sponsors: eventData.sponsors,
        selectedSponsors
      });
      
      // Append all form data
      Object.entries(eventData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            if (key === 'sponsors') {
              console.log('📤 Sending sponsors to backend:', value);
            }
            formDataToSubmit.append(key, JSON.stringify(value));
          } else {
            formDataToSubmit.append(key, value.toString());
          }
        }
      });

      // Log what's actually in FormData
      console.log('📋 FormData contents:');
      for (let [key, value] of formDataToSubmit.entries()) {
        if (key === 'sponsors') {
          console.log(`  ${key}:`, value);
        }
      }

      if (event?.id) {
        console.log('🔄 Updating existing event:', event.id);
        await eventApi.updateEvent(event.id, formDataToSubmit);
        toast.success('Event updated successfully!');
      } else {
        console.log('🆕 Creating new event');
        await createMutation.mutateAsync(formDataToSubmit);
        toast.success('Event created successfully!');
      }
      onClose();
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('Failed to save event. Please try again.');
    } finally {
      setSubmitting(false);
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

  // Sponsor management functions
  const handleAddSponsor = (sponsor: any) => {
    if (!selectedSponsors.find(s => s._id === sponsor._id)) {
      const newSelectedSponsors = [...selectedSponsors, sponsor];
      setSelectedSponsors(newSelectedSponsors);
      
      // Create sponsor request objects with pending status
      const sponsorRequests = newSelectedSponsors.map(s => ({
        sponsorId: s._id,
        status: 'pending' as const,
        requestedAt: new Date().toISOString()
      }));
      
      console.log('🎯 Adding sponsor:', {
        sponsor,
        newSelectedSponsors,
        sponsorRequests
      });
      
      setFormData(prev => ({
        ...prev,
        sponsors: sponsorRequests
      }));
      
      setSponsorSearchTerm('');
      setShowSponsorSearch(false);
    }
  };

  const handleRemoveSponsor = (sponsorId: string) => {
    const updatedSponsors = selectedSponsors.filter(s => s._id !== sponsorId);
    setSelectedSponsors(updatedSponsors);
    setFormData(prev => ({ 
      ...prev, 
      sponsors: updatedSponsors.map(s => ({
        sponsorId: s._id,
        status: 'pending' as const,
        requestedAt: new Date().toISOString()
      }))
    }));
  };

  const filteredSponsors = availableSponsors.filter(sponsor =>
    sponsor.name.toLowerCase().includes(sponsorSearchTerm.toLowerCase()) ||
    sponsor.username.toLowerCase().includes(sponsorSearchTerm.toLowerCase())
  ).filter(sponsor => !selectedSponsors.find(s => s._id === sponsor._id));

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        if (!submitting) onClose();
      }}
      className="relative z-50"
    >
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

          <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
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
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Start Date & Time
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={extractDate(formData.startDate)}
                      onChange={e => {
                        const currentTime = extractTime(formData.startDate);
                        const newDateTime = combineDateAndTime(e.target.value, currentTime || '09:00');
                        setFormData(prev => ({ ...prev, startDate: newDateTime }));
                      }}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      required
                    />
                    <div className="grid grid-cols-3 gap-1">
                      <select
                        value={extractHour(extractTime(formData.startDate))}
                        onChange={e => {
                          const currentTime = extractTime(formData.startDate);
                          const newTime = combineTime(e.target.value, extractMinute(currentTime), extractPeriod(currentTime));
                          const newDateTime = combineDateAndTime(extractDate(formData.startDate), newTime);
                          setFormData(prev => ({ ...prev, startDate: newDateTime }));
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors text-sm"
                        required
                      >
                        {hourOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={extractMinute(extractTime(formData.startDate))}
                        onChange={e => {
                          const currentTime = extractTime(formData.startDate);
                          const newTime = combineTime(extractHour(currentTime) || '9', e.target.value, extractPeriod(currentTime));
                          const newDateTime = combineDateAndTime(extractDate(formData.startDate), newTime);
                          setFormData(prev => ({ ...prev, startDate: newDateTime }));
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors text-sm"
                        required
                      >
                        {minuteOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={extractPeriod(extractTime(formData.startDate))}
                        onChange={e => {
                          const currentTime = extractTime(formData.startDate);
                          const newTime = combineTime(extractHour(currentTime) || '9', extractMinute(currentTime) || '00', e.target.value);
                          const newDateTime = combineDateAndTime(extractDate(formData.startDate), newTime);
                          setFormData(prev => ({ ...prev, startDate: newDateTime }));
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors text-sm"
                        required
                      >
                        {periodOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    End Date & Time
                  </label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={extractDate(formData.endDate)}
                      onChange={e => {
                        const currentTime = extractTime(formData.endDate);
                        const newDateTime = combineDateAndTime(e.target.value, currentTime || '10:00');
                        setFormData(prev => ({ ...prev, endDate: newDateTime }));
                      }}
                      className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                      required
                    />
                    <div className="grid grid-cols-3 gap-1">
                      <select
                        value={extractHour(extractTime(formData.endDate))}
                        onChange={e => {
                          const currentTime = extractTime(formData.endDate);
                          const newTime = combineTime(e.target.value, extractMinute(currentTime), extractPeriod(currentTime));
                          const newDateTime = combineDateAndTime(extractDate(formData.endDate), newTime);
                          setFormData(prev => ({ ...prev, endDate: newDateTime }));
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors text-sm"
                        required
                      >
                        {hourOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={extractMinute(extractTime(formData.endDate))}
                        onChange={e => {
                          const currentTime = extractTime(formData.endDate);
                          const newTime = combineTime(extractHour(currentTime) || '10', e.target.value, extractPeriod(currentTime));
                          const newDateTime = combineDateAndTime(extractDate(formData.endDate), newTime);
                          setFormData(prev => ({ ...prev, endDate: newDateTime }));
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors text-sm"
                        required
                      >
                        {minuteOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={extractPeriod(extractTime(formData.endDate))}
                        onChange={e => {
                          const currentTime = extractTime(formData.endDate);
                          const newTime = combineTime(extractHour(currentTime) || '10', extractMinute(currentTime) || '00', e.target.value);
                          const newDateTime = combineDateAndTime(extractDate(formData.endDate), newTime);
                          setFormData(prev => ({ ...prev, endDate: newDateTime }));
                        }}
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors text-sm"
                        required
                      >
                        {periodOptions.map(option => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                  value={formData.features && formData.features.length > 0 ? formData.features[0] : ''}
                  onChange={e => {
                    const value = e.target.value;
                    setFormData(prev => ({ 
                      ...prev, 
                      features: value === '' ? [] : [value as EventFeatures]
                    }));
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                >
                  <option value="">None</option>
                  <option value={EventFeatures.SINGLE_ELIMINATION_TOURNAMENT}>Single Elimination Tournament</option>
                  <option value={EventFeatures.SWISS_TOURNAMENT}>Swiss Tournament</option>
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

                {/* Event Sponsors Section */}
                {!isSponsorship && clubId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Event Sponsors
                    </label>
                    <div className="space-y-3">
                      {/* Selected Sponsors */}
                      {selectedSponsors.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedSponsors.map((sponsor) => (
                            <div
                              key={sponsor._id}
                              className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2"
                            >
                              {sponsor.logoUrl ? (
                                <img
                                  src={sponsor.logoUrl}
                                  alt={sponsor.name}
                                  className="w-6 h-6 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center">
                                  <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                    {sponsor.name.charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                                  {sponsor.name}
                                </span>
                                <span className="text-xs text-yellow-600 dark:text-yellow-400">
                                  ⏳ Pending approval
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSponsor(sponsor._id)}
                                className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-400 dark:hover:text-yellow-200"
                              >
                                <XCircleIcon className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add Sponsor Button and Search */}
                      <div className="relative">
                        {!showSponsorSearch ? (
                          <button
                            type="button"
                            onClick={() => setShowSponsorSearch(true)}
                            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <UserPlusIcon className="h-4 w-4" />
                            Add Event Sponsor
                          </button>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={sponsorSearchTerm}
                                onChange={(e) => setSponsorSearchTerm(e.target.value)}
                                placeholder="Search sponsors by name or username..."
                                className="flex-1 rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setShowSponsorSearch(false);
                                  setSponsorSearchTerm('');
                                }}
                                className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                              >
                                <XMarkIcon className="h-5 w-5" />
                              </button>
                            </div>

                            {/* Sponsor Search Results */}
                            {sponsorSearchTerm && filteredSponsors.length > 0 && (
                              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
                                {filteredSponsors.map((sponsor) => (
                                  <button
                                    key={sponsor._id}
                                    type="button"
                                    onClick={() => handleAddSponsor(sponsor)}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                                  >
                                    {sponsor.logoUrl ? (
                                      <img
                                        src={sponsor.logoUrl}
                                        alt={sponsor.name}
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                          {sponsor.name.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}
                                    <div className="text-left">
                                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                                        {sponsor.name}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">
                                        @{sponsor.username}
                                      </p>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}

                            {sponsorSearchTerm && filteredSponsors.length === 0 && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
                                No sponsors found matching "{sponsorSearchTerm}"
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        💡 Add sponsors to your event to give them visibility and show partnership
                      </p>
                    </div>
                  </div>
                )}
                </div>
              </div>
            </div>

            {/* Add club collaboration field for sponsor events */}
            {isSponsorship && (
              <div className="mb-4">
                <label htmlFor="clubCollaboration" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Club Collaboration
                </label>
                <div className="mt-1 mb-2 p-3 bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 rounded-md">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    💡 To create a live event, you need to collaborate with a club. Draft events can be created without club collaboration.
                  </p>
                </div>
                <select
                  id="clubCollaboration"
                  value={selectedClub}
                  onChange={(e) => setSelectedClub(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                  disabled={formData.status !== EventStatus.LIVE}
                >
                  <option value="">Select a club to collaborate with</option>
                  {availableClubs.map((club) => (
                    <option key={club._id} value={club._id}>
                      {club.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-6 flex justify-between gap-3">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => !submitting && onClose()}
                disabled={submitting}
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={handleSaveDraft}
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Publishing...' : 
                    event ? 
                      event.status === EventStatus.DRAFT ? 'Make Live' : 'Update Event'
                    : 'Publish Event'}
                </button>
              </div>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default CreateEventModal; 