import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, EventStatus, EventFeatures, EventVisibility } from '../types/event';
import { eventApi } from '../services/api';
import { tournamentService, Tournament } from '../services/tournament.service';
import { format } from 'date-fns';
import { PlusIcon, CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, TrashIcon, UserIcon, TrophyIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import CreateEventModal from '../components/CreateEventModal';
import { useAuth } from '../context/AuthContext';
import SearchBar from '../components/SearchBar';
import { useNavigate } from 'react-router-dom';
import { log, LogCategory } from '../utils/logger';
import { webSocketService } from '../services/websocket.service';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EventStatus>(EventStatus.LIVE);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [eventTournaments, setEventTournaments] = useState<Record<string, Tournament[]>>({});
  const [frontendTournaments, setFrontendTournaments] = useState<Record<string, any>>({});
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState<{ [key: string]: boolean }>({});

  // Load frontend tournaments from localStorage
  useEffect(() => {
    const loadFrontendTournaments = () => {
      const savedTournaments = localStorage.getItem('frontend_tournaments');
      if (savedTournaments) {
        try {
          const tournaments = JSON.parse(savedTournaments);
          log.debug(LogCategory.TOURNAMENT, 'Loading tournaments from localStorage', { count: Object.keys(tournaments).length });
          setFrontendTournaments(tournaments);
        } catch (error) {
          log.error(LogCategory.TOURNAMENT, 'Failed to load frontend tournaments', error);
        }
      }
    };

    // Initial load
    loadFrontendTournaments();

    // Refresh when window comes into focus (e.g., when navigating back from tournament page)
    const handleFocus = () => {
      log.debug(LogCategory.TOURNAMENT, 'Window focus - reloading tournaments');
      loadFrontendTournaments();
    };

    // Listen for storage events (when localStorage changes)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'frontend_tournaments') {
        log.debug(LogCategory.TOURNAMENT, 'Storage event - reloading tournaments');
        loadFrontendTournaments();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Load events and tournaments
  const { 
    data: events, 
    isLoading, 
    refetch: refetchEvents 
  } = useQuery({
    queryKey: ['events'],
    queryFn: eventApi.getEvents,
  });

  // WebSocket integration for real-time updates
  useEffect(() => {
    if (!events || events.length === 0) return;

    // Join event rooms for all events to receive tournament updates
    const eventIds = events.map((event: Event) => event.id);
    eventIds.forEach((eventId: string) => {
      webSocketService.joinEventChat(eventId);
    });

    // Also join public events room for dashboard updates
    webSocketService.joinPublicEvents();

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 Dashboard WebSocket tournament update received:', data);
      
      // Check if this update is for any of our events
      const relevantEventId = eventIds.find((eventId: string) => 
        data.eventId === eventId || 
        (eventTournaments[eventId] && eventTournaments[eventId].some(t => t.id === data.tournamentId))
      );

      if (relevantEventId && (
        data.type === 'registration-opened' || 
        data.type === 'registration-closed' || 
        data.type === 'player-registered' || 
        data.type === 'guest-player-added' ||
        data.type === 'player-removed' ||
        data.type === 'tournament-started' ||
        data.type === 'tournament-created' ||
        data.type === 'tournament-finished'
      )) {
        console.log('🔄 Dashboard refreshing tournament data for event:', relevantEventId);
        
        // Refresh tournament data for the specific event
        const refreshEventTournaments = async () => {
          try {
            const tournaments = await tournamentService.getTournamentsByEvent(relevantEventId);
            setEventTournaments(prev => ({
              ...prev,
              [relevantEventId]: tournaments
            }));
            
            // Also update localStorage for consistency
            const allTournaments = JSON.parse(localStorage.getItem('frontend_tournaments') || '{}');
            if (tournaments.length > 0) {
              // Convert backend tournament to frontend format for localStorage
              const tournament = tournaments[0];
              const frontendTournament = {
                id: tournament.id,
                name: tournament.name,
                status: tournament.isFinished 
                  ? 'completed' 
                  : tournament.isStarted 
                    ? 'active' 
                    : tournament.registrationOpen === false
                      ? 'registration_closed'
                      : 'registration_open',
                players: tournament.players,
                playerCount: tournament.players.length,
                registeredUserCount: tournament.players.filter(p => !p.isGuest).length,
                registeredUsers: tournament.players.filter(p => !p.isGuest),
                winner: tournament.winnerId ? tournament.players.find(p => p.id === tournament.winnerId) : null,
                createdAt: new Date(tournament.createdAt).getTime(),
                startedAt: tournament.isStarted ? new Date(tournament.createdAt).getTime() : undefined,
                createdBy: tournament.organizerId,
                registrationOpen: tournament.registrationOpen
              };
              allTournaments[relevantEventId] = frontendTournament;
            } else {
              delete allTournaments[relevantEventId];
            }
            localStorage.setItem('frontend_tournaments', JSON.stringify(allTournaments));
            setFrontendTournaments(allTournaments);
            
            log.info(LogCategory.TOURNAMENT, 'Dashboard tournament data refreshed', { 
              eventId: relevantEventId, 
              updateType: data.type,
              tournamentsCount: tournaments.length
            });
          } catch (error) {
            console.error('❌ Error refreshing tournament data in dashboard:', error);
          }
        };
        
        refreshEventTournaments();
      }
    };

    const handleEventCreated = (newEvent: any) => {
      console.log('🔔 Dashboard WebSocket event created:', newEvent);
      
      // Add new event to the list
      queryClient.setQueryData<Event[]>(['events'], (oldEvents = []) => {
        // Check if event already exists to avoid duplicates
        const eventExists = oldEvents.some(event => event.id === newEvent.id);
        if (!eventExists) {
          return [...oldEvents, newEvent];
        }
        return oldEvents;
      });
      
      // Refresh events from server to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['events'] });
    };

    const handleEventUpdated = (updatedEvent: any) => {
      console.log('🔔 Dashboard WebSocket event updated:', updatedEvent);
      
      // Update event in the list
      queryClient.setQueryData<Event[]>(['events'], (oldEvents = []) => {
        return oldEvents.map(event => 
          event.id === updatedEvent.id ? updatedEvent : event
        );
      });
      
      // Refresh events from server to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['events'] });
    };

    const handleEventDeleted = (data: { eventId: string }) => {
      console.log('🔔 Dashboard WebSocket event deleted:', data);
      
      // Remove event from the list
      queryClient.setQueryData<Event[]>(['events'], (oldEvents = []) => {
        return oldEvents.filter(event => event.id !== data.eventId);
      });
      
      // Refresh events from server to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['events'] });
    };

    // Subscribe to WebSocket updates
    webSocketService.onTournamentUpdate(handleTournamentUpdate);
    webSocketService.onEventCreated(handleEventCreated);
    webSocketService.onEventUpdated(handleEventUpdated);
    webSocketService.onEventDeleted(handleEventDeleted);

    return () => {
      // Leave all event rooms and remove listeners
      eventIds.forEach((eventId: string) => {
        webSocketService.leaveEventChat(eventId);
      });
      webSocketService.leavePublicEvents();
      webSocketService.removeTournamentListeners();
      webSocketService.removeEventListeners();
    };
  }, [events, eventTournaments, queryClient]);

  // Check if an event has a frontend tournament
  const hasFrontendTournament = (eventId: string) => {
    const tournaments = eventTournaments[eventId];
    return tournaments && tournaments.length > 0;
  };

  // Get tournament info from backend data
  const getFrontendTournament = (eventId: string) => {
    const tournaments = eventTournaments[eventId];
    if (!tournaments || tournaments.length === 0) return null;
    
    // Get the first tournament for this event
    const tournament = tournaments[0];
    
    // Convert backend tournament to frontend format for compatibility
    return {
      id: tournament.id,
      name: tournament.name,
      status: tournament.isFinished 
        ? 'completed' 
        : tournament.isStarted 
          ? 'active' 
          : tournament.registrationOpen === false
            ? 'registration_closed'
            : 'registration_open',
      players: tournament.players,
      playerCount: tournament.players.length,
      registeredUserCount: tournament.players.filter(p => !p.isGuest).length,
      registeredUsers: tournament.players.filter(p => !p.isGuest),
      winner: tournament.winnerId ? tournament.players.find(p => p.id === tournament.winnerId) : null,
      createdAt: new Date(tournament.createdAt).getTime(),
      startedAt: tournament.isStarted ? new Date(tournament.createdAt).getTime() : undefined,
      createdBy: tournament.organizerId,
      registrationOpen: tournament.registrationOpen
    };
  };

  // Load tournament data for each event
  useEffect(() => {
    const loadTournamentData = async () => {
      if (!events || events.length === 0) return;
      
      const tournamentPromises = events.map(async (event: any) => {
        try {
          const tournaments = await tournamentService.getTournamentsByEvent(event.id);
          return { eventId: event.id, tournaments };
        } catch {
          return { eventId: event.id, tournaments: [] };
        }
      });

      const results = await Promise.all(tournamentPromises);
      const tournamentMap: Record<string, Tournament[]> = {};
      results.forEach(result => {
        tournamentMap[result.eventId] = result.tournaments;
      });
      
      setEventTournaments(tournamentMap);
    };

    loadTournamentData();
  }, [events]);

  // Auto-update past events
  useEffect(() => {
    if (events) {
      const now = new Date();
      
      const eventsToUpdate = events.filter((event: Event) => {
        if (event.status === EventStatus.PAST) return false;
        
        // Use endDate for checking if event is past
        if (!event.endDate) return false;
        
        const endDate = new Date(event.endDate);
        const isPast = endDate < now;
        
        return isPast;
      });
      
      if (eventsToUpdate.length > 0) {
        log.info(LogCategory.EVENT, `Auto-updating ${eventsToUpdate.length} events to PAST status`);
        
        eventsToUpdate.forEach((event: Event) => {
          eventApi.updateEvent(event.id, { status: EventStatus.PAST })
            .then(() => {
              log.debug(LogCategory.EVENT, `Updated event ${event.title} to PAST status`);
              // Invalidate queries to refresh the data
              queryClient.invalidateQueries({ queryKey: ['events'] });
            })
            .catch((error: any) => {
              log.error(LogCategory.EVENT, `Failed to update event ${event.title} status to PAST`, error);
            });
        });
      }
    }
  }, [events, queryClient]);

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      try {
        const response = await eventApi.deleteEvent(eventId);
        return eventId;
      } catch (error) {
        log.error(LogCategory.EVENT, 'Failed to delete event', error);
        throw error;
      }
    },
    onMutate: async (eventId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['events'] });

      // Snapshot the previous value
      const previousEvents = queryClient.getQueryData<Event[]>(['events']);

      // Optimistically update to the new value
      queryClient.setQueryData<Event[]>(['events'], old => 
        old ? old.filter(event => event.id !== eventId) : []
      );

      // Return a context object with the snapshotted value
      return { previousEvents };
    },
    onError: (err, _, context) => {
      log.error(LogCategory.EVENT, 'Failed to delete event', err);
      // Rollback to the previous value
      if (context?.previousEvents) {
        queryClient.setQueryData(['events'], context.previousEvents);
      }
      alert('Failed to delete event. Please try again.');
    },
    onSuccess: (eventId) => {
      // Update the cache to remove the deleted event
      queryClient.setQueryData<Event[]>(['events'], old => 
        old ? old.filter(event => event.id !== eventId) : []
      );
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });

  const handleDeleteClick = (event: Event) => {
    setEventToDelete(event);
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (eventToDelete?.id) {
      deleteMutation.mutate(eventToDelete.id);
    }
  };

  const handleCreateTournament = async (eventId: string) => {
    log.info(LogCategory.TOURNAMENT, 'Creating tournament for event', { eventId });
    
    try {
      const event = events?.find((e: Event) => e.id === eventId);
      log.debug(LogCategory.TOURNAMENT, 'Found event for tournament', { eventTitle: event?.title });
      
      const eventTitle = event?.title || 'Event';
      const creatorId = event?.creator?.id || event?.creatorId || '';
      const feature = event?.features?.includes(EventFeatures.SWISS_TOURNAMENT) 
        ? EventFeatures.SWISS_TOURNAMENT 
        : EventFeatures.SINGLE_ELIMINATION_TOURNAMENT;
      
      // Navigate to the appropriate tournament page based on the event feature
      if (feature === EventFeatures.SWISS_TOURNAMENT) {
        navigate(`/tournament/swiss?eventId=${eventId}&eventTitle=${encodeURIComponent(eventTitle)}&creatorId=${creatorId}&feature=${feature}`);
      } else {
        navigate(`/tournament/single-elimination?eventId=${eventId}&eventTitle=${encodeURIComponent(eventTitle)}&creatorId=${creatorId}&feature=${feature}`);
      }
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to navigate to tournament creation', error);
      alert('Failed to navigate to tournament creation. Please try again.');
    }
  };

  // Get tournament button text and action based on state and user permissions
  const getTournamentButtonInfo = (event: Event) => {
    const tournament = getFrontendTournament(event.id);
    const isCreator = canEditEvent(event);
    const tournamentType = event.features?.includes(EventFeatures.SWISS_TOURNAMENT) ? 'swiss' : 'single-elimination';
    
    if (!tournament) {
      return isCreator 
        ? { text: 'Create Tournament', action: () => navigate(`/tournament/${tournamentType}?eventId=${event.id}&eventTitle=${encodeURIComponent(event.title)}&creatorId=${event.creator?.id || event.creatorId}&feature=${event.features?.includes(EventFeatures.SWISS_TOURNAMENT) ? EventFeatures.SWISS_TOURNAMENT : EventFeatures.SINGLE_ELIMINATION_TOURNAMENT}`), disabled: false }
        : { text: 'No Tournament', action: () => {}, disabled: true };
    }

    const tournamentId = tournament.id;
    if (!tournamentId) {
      return { text: 'Invalid Tournament', action: () => {}, disabled: true };
    }

    switch (tournament.status) {
      case 'not_created':
        return isCreator 
          ? { text: 'Create Tournament', action: () => navigate(`/tournament/${tournamentType}?eventId=${event.id}&eventTitle=${encodeURIComponent(event.title)}&creatorId=${event.creator?.id || event.creatorId}&feature=${event.features?.includes(EventFeatures.SWISS_TOURNAMENT) ? EventFeatures.SWISS_TOURNAMENT : EventFeatures.SINGLE_ELIMINATION_TOURNAMENT}`), disabled: false }
          : { text: 'No Tournament', action: () => {}, disabled: true };
      
      case 'registration_open':
        if (isCreator) {
          return { text: 'Manage Tournament', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}/manage`), disabled: false };
        } else {
          const isParticipant = user && tournament.players?.some((p: any) => p.userId === user.id);
          return isParticipant
            ? { text: 'Tournament Ready', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}`), disabled: false }
            : { text: 'Join Tournament', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}`), disabled: false };
        }
      
      case 'registration_closed':
        if (isCreator) {
          return { text: 'Start Tournament', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}/manage`), disabled: false };
        } else {
          const isParticipant = user && tournament.players?.some((p: any) => p.userId === user.id);
          return isParticipant
            ? { text: 'Tournament Ready', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}`), disabled: false }
            : { text: 'Registration Closed', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}`), disabled: false };
        }
      
      case 'active':
        if (isCreator) {
          return { text: 'Manage Tournament', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}/manage`), disabled: false };
        } else {
          const isParticipant = user && tournament.players?.some((p: any) => p.userId === user.id);
          return isParticipant
            ? { text: 'Tournament Live', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}/results`), disabled: false }
            : { text: 'View Tournament', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}/results`), disabled: false };
        }
      
      case 'completed':
        if (isCreator) {
          return { text: 'Manage Tournament', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}/manage`), disabled: false };
        } else {
          return { text: 'View Results', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}/results`), disabled: false };
        }
      
      default:
        return { text: 'View Tournament', action: () => navigate(`/tournament/${tournamentType}/${tournamentId}`), disabled: false };
    }
  };

  const filteredEvents = events?.filter((event: Event) => event.status === activeTab && event.visibility !== EventVisibility.CLUB) || [];

  const getEventStatusColor = (status: EventStatus) => {
    switch (status) {
      case EventStatus.DRAFT:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case EventStatus.LIVE:
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case EventStatus.PAST:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300';
    }
  };

  const canEditEvent = (event: Event) => {
    // Check if the current user is the creator of the event
    if (!user || !event) return false;
    
    // Only log permission checks in debug mode to reduce spam
    log.debug(LogCategory.AUTH, 'Checking edit permissions', {
      userId: user.id,
      userName: user.username,
      eventId: event.id,
      eventTitle: event.title,
      creatorId: event.creator?.id || event.creatorId
    });
    
    // Check multiple possible creator field combinations
    const userIsCreator = 
      (event.creator && user.id === event.creator.id) ||
      (event.creatorId && user.id === event.creatorId) ||
      (typeof event.creator === 'string' && user.id === event.creator);
    
    return userIsCreator;
  };

  const checkFrontendTournament = (eventId: string) => {
    // Implementation for checking frontend tournament data
    return false;
  };

  const deleteEvent = async (eventId: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) {
      return;
    }

    setDeletingEventId(eventId);
    try {
      await eventApi.deleteEvent(eventId);
      await refetchEvents();
      log.info(LogCategory.EVENT, 'Event deleted successfully');
    } catch (error) {
      log.error(LogCategory.EVENT, 'Failed to delete event', error);
      alert('Failed to delete event. Please try again.');
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleCreateEvent = async (eventData: any) => {
    try {
      const result = await eventApi.createEvent(eventData);
      console.log('Event created successfully:', result);
      setIsCreateModalOpen(false);
      setSelectedEvent(null);
      // Refetch events to update the list
      await refetchEvents();
    } catch (e: any) {
      console.error('Failed to create event:', e);
      alert('Failed to create event. Please try again.');
    }
  };

  const handleRsvp = async (eventId: string) => {
    if (!user) return;
    
    try {
      setRsvpLoading(prev => ({ ...prev, [eventId]: true }));
      await eventApi.toggleRsvp(eventId);
      
      // Refresh events to get updated RSVP status
      refetchEvents();
    } catch (error) {
      console.error('Error updating RSVP:', error);
    } finally {
      setRsvpLoading(prev => ({ ...prev, [eventId]: false }));
    }
  };

  const isUserRsvped = (event: Event) => {
    return event.rsvps.some(rsvp => rsvp.id === user?.id);
  };

  return (
    <div className="space-y-8">
      {/* Search Bar Section */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 p-6 transition-colors duration-200 relative" style={{ zIndex: 10 }}>
        <SearchBar />
      </div>

      {/* Event Management Section */}
      <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 transition-colors duration-200 relative" style={{ zIndex: 1 }}>
        <div className="p-6 border-b border-gray-200/50 dark:border-gray-700/50">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Events</h2>
          </div>

          {/* Tabs */}
          <div className="mt-4 border-b border-gray-200/50 dark:border-gray-700/50">
            <nav className="-mb-px flex space-x-8">
              {[EventStatus.LIVE, EventStatus.PAST].map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setActiveTab(status)}
                  className={`${
                    activeTab === status
                      ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                      : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors`}
                >
                  {status}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Event Grid */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">No events found</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating a new event.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.map((event: Event) => (
                <div
                  key={event.id}
                  className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 rounded-lg hover:shadow-xl dark:hover:shadow-gray-900/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200 relative"
                  style={{ zIndex: 1 }}
                >
                  {event.imageUrl && (
                    <div className="h-48 w-full overflow-hidden">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusColor(
                          event.status
                        )}`}
                      >
                        {event.status}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {event.startDate && !isNaN(new Date(event.startDate).getTime()) 
                          ? format(new Date(event.startDate), 'MMM d, yyyy')
                          : 'Invalid date'
                        }
                      </span>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {event.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                      {event.description}
                    </p>
                    <div className="space-y-2">
                      {/* 1. Time & Date */}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        {event.startDate && event.endDate && 
                        !isNaN(new Date(event.startDate).getTime()) && 
                        !isNaN(new Date(event.endDate).getTime()) ? (
                          <>
                            {format(new Date(event.startDate), 'h:mm a')} -{' '}
                            {format(new Date(event.endDate), 'h:mm a')}
                          </>
                        ) : (
                          'Invalid time'
                        )}
                      </div>
                      
                      {/* 2. Location */}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <MapPinIcon className="h-4 w-4 mr-2" />
                        {event.location}
                      </div>
                      
                      {/* 3. Tags (only actual event tags) */}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <TagIcon className="h-4 w-4 mr-2" />
                        {event.tags.join(', ')}
                      </div>
                      
                      {/* 4. Tournament Type (show both Single Elimination and Swiss) */}
                      {(event.features && (event.features.includes(EventFeatures.SINGLE_ELIMINATION_TOURNAMENT) || event.features.includes(EventFeatures.SWISS_TOURNAMENT))) && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <TrophyIcon className="h-4 w-4 mr-2" />
                          Tournament: {event.features.includes(EventFeatures.SWISS_TOURNAMENT) ? 'Swiss' : 'Single Elimination'}
                        </div>
                      )}
                      
                      {/* 5. RSVPs */}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <UserGroupIcon className="h-4 w-4 mr-2" />
                        {event.rsvps.length} RSVPs
                      </div>
                      
                      {/* 6. Cost */}
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                        {event.isFree ? 'Free' : `$${event.cost}`}
                      </div>
                      
                      {/* 7. Club and Creator Row */}
                      <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                        {/* Club (left side) */}
                        {event.clubName && event.clubUsername && (
                          <button onClick={() => navigate(`/clubs/${event.clubUsername}`)} className="flex items-center hover:text-purple-700 dark:hover:text-purple-300 transition-colors">
                            {event.clubLogoUrl ? (
                              <img src={event.clubLogoUrl} alt={`${event.clubName} logo`} className="h-4 w-4 rounded-full object-cover mr-1 border border-gray-200 dark:border-gray-600" />
                            ) : (
                              <div className="h-4 w-4 rounded-full bg-purple-600 dark:bg-purple-500 mr-1 flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{event.clubName.charAt(0).toUpperCase()}</span>
                              </div>
                            )}
                            <span className="text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 hover:underline font-medium">
                              {event.clubName}
                        </span>
                          </button>
                        )}
                        {/* Creator (right side) */}
                        {event.creator && (
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 mr-1" />
                            <span>{event.creator.username}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-3">
                      <div className="flex space-x-3">
                      {canEditEvent(event) ? (
                        <>
                          <button
                            key={`edit-${event.id}`}
                            type="button"
                            className="btn btn-secondary flex-1"
                            onClick={() => {
                              setSelectedEvent({ ...event, id: event.id });
                              setIsCreateModalOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            key={`view-${event.id}`}
                            type="button"
                            className="btn btn-primary flex-1"
                            onClick={() => navigate(`/event/${event.id}`)}
                          >
                            View Details
                          </button>
                          <button
                            key={`delete-${event.id}`}
                            type="button"
                            className="btn btn-danger p-2"
                            onClick={() => handleDeleteClick(event)}
                            title="Delete Event"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </>
                      ) : (
                        <button 
                          key={`view-${event.id}`}
                          type="button"
                          className="btn btn-primary flex-1"
                          onClick={() => navigate(`/event/${event.id}`)}
                        >
                          View Details
                          </button>
                        )}
                      </div>
                      
                      {/* Tournament Actions */}
                      {(event.features && (event.features.includes(EventFeatures.SINGLE_ELIMINATION_TOURNAMENT) || event.features.includes(EventFeatures.SWISS_TOURNAMENT))) && (
                        (() => {
                          const buttonInfo = getTournamentButtonInfo(event);
                          const tournamentType = event.features.includes(EventFeatures.SWISS_TOURNAMENT) ? 'swiss' : 'single-elimination';
                          const frontendTournament = getFrontendTournament(event.id);
                          return (
                            <button
                              type="button"
                              className={`w-full px-4 py-2 font-medium rounded-md transition-all duration-200 flex items-center justify-center ${
                                buttonInfo.disabled 
                                  ? 'bg-gray-400 text-gray-700 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                                  : 'bg-blue-800 text-white hover:bg-blue-900 dark:bg-blue-700 dark:hover:bg-blue-800'
                              }`}
                              onClick={() => {
                                if (buttonInfo.action && frontendTournament) {
                                  const url = buttonInfo.action.toString();
                                  // If it's a direct tournament URL, append the tournament type
                                  if (url.includes('/tournament/')) {
                                    // Check if it's a results URL
                                    if (url.includes('/results')) {
                                      navigate(`/tournament/${tournamentType}/${frontendTournament.id}/results`);
                                    } else if (url.includes('/manage')) {
                                      navigate(`/tournament/${tournamentType}/${frontendTournament.id}/manage`);
                                    } else {
                                      navigate(`/tournament/${tournamentType}?eventId=${event.id}&eventTitle=${encodeURIComponent(event.title)}&creatorId=${event.creator?.id || event.creatorId}&feature=${event.features?.includes(EventFeatures.SWISS_TOURNAMENT) ? EventFeatures.SWISS_TOURNAMENT : EventFeatures.SINGLE_ELIMINATION_TOURNAMENT}`);
                                    }
                                  } else {
                                    handleCreateTournament(event.id);
                                  }
                                } else {
                                  handleCreateTournament(event.id);
                                }
                              }}
                              disabled={buttonInfo.disabled}
                            >
                              <TrophyIcon className="h-4 w-4 mr-2" />
                              {buttonInfo.text}
                            </button>
                          );
                        })()
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 shadow-xl dark:shadow-gray-900/50 border border-gray-200/50 dark:border-gray-700/50">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Event</h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Are you sure you want to delete "{eventToDelete?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                className="btn btn-secondary px-4 py-2"
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setEventToDelete(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger px-4 py-2"
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </span>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <CreateEventModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setSelectedEvent(null);
        }}
        event={selectedEvent}
      />
    </div>
  );
};

export default Dashboard; 