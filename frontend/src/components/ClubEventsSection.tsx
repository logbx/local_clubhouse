import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Event, EventStatus, EventVisibility, EventFeatures } from '../types/event';
import { eventApi } from '../services/api';
import { tournamentService, Tournament } from '../services/tournament.service';
import { format } from 'date-fns';
import { PlusIcon, CalendarIcon, MapPinIcon, TagIcon, UserGroupIcon, TrashIcon, UserIcon, TrophyIcon, CurrencyDollarIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import CreateEventModal from './CreateEventModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { log, LogCategory } from '../utils/logger';
import { webSocketService } from '../services/websocket.service';

interface ClubEventsSectionProps {
  clubId: string;
  clubUsername: string;
  isAdmin: boolean;
  isMember: boolean;
  initialTab?: EventStatus;
  showDrafts?: boolean;
  isSponsorship?: boolean;
}

const ClubEventsSection: React.FC<ClubEventsSectionProps> = ({ 
  clubId, 
  clubUsername, 
  isAdmin, 
  isMember,
  initialTab = EventStatus.LIVE,
  showDrafts = isAdmin,
  isSponsorship = false
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<EventStatus>(initialTab);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [rsvpLoading, setRsvpLoading] = useState<{ [key: string]: boolean }>({});
  const [eventTournaments, setEventTournaments] = useState<Record<string, Tournament[]>>({});
  const [frontendTournaments, setFrontendTournaments] = useState<Record<string, any>>({});

  // Fetch events for this club
  const { 
    data: allEvents, 
    isLoading, 
    refetch: refetchEvents 
  } = useQuery({
    queryKey: ['club-events', clubId],
    queryFn: async () => {
      // Get all events and filter for club events
      const events = await eventApi.getEvents();
      const filteredForClub = events.filter((event: Event) => {
        if (isSponsorship) {
          // For sponsors, show events they're directly associated with as sponsors,
          // tagged in, mentioned in, or created
          const isDirectSponsor = event.sponsors?.some((sponsor: any) => {
            if (typeof sponsor === 'object') {
              // New structure with approval status
              const sponsorData = sponsor.sponsorId;
              return (typeof sponsorData === 'string' ? sponsorData : sponsorData._id) === clubId ||
                     (typeof sponsorData === 'object' && sponsorData.username === clubUsername);
            } else {
              // Legacy structure (simple ID)
              return sponsor === clubId;
            }
          });
          
          const isTagged = event.tags?.some(tag => 
            tag.toLowerCase() === clubUsername.toLowerCase()
          );
          
          const isMentioned = event.description?.toLowerCase().includes(clubUsername.toLowerCase());
          
          const isCreator = event.creator?.id === user?.id;
          
          return isDirectSponsor || isTagged || isMentioned || isCreator;
        } else {
          // For clubs, show events they created or are visible to them
          return event.clubId === clubId || 
            event.clubUsername === clubUsername ||
            (event.visibility === EventVisibility.CLUB && event.creator.id === user?.id);
        }
      });
      
      // Debug logging for sponsors
      if (isSponsorship) {
        console.log('🔍 Sponsor Events Debug:', {
          clubId,
          clubUsername,
          userId: user?.id,
          totalEvents: events.length,
          filteredEvents: filteredForClub.length,
          draftEvents: filteredForClub.filter((e: Event) => e.status === EventStatus.DRAFT).length,
          liveEvents: filteredForClub.filter((e: Event) => e.status === EventStatus.LIVE).length,
          showDrafts,
          isAdmin
        });
        
        // Log draft events specifically
        const drafts = filteredForClub.filter((e: Event) => e.status === EventStatus.DRAFT);
        if (drafts.length > 0) {
          console.log('📝 Draft Events Found:', drafts.map((e: Event) => ({
            id: e.id,
            title: e.title,
            creator: e.creator,
            status: e.status,
            sponsors: e.sponsors
          })));
        }
        
        // Log all events with sponsor information
        console.log('🎯 All Sponsor Events:', filteredForClub.map((e: Event) => ({
          id: e.id,
          title: e.title,
          status: e.status,
          sponsors: e.sponsors,
          hasSponsors: e.sponsors && e.sponsors.length > 0,
          sponsorDetails: e.sponsors?.map((s: any) => ({
            sponsorId: typeof s === 'object' ? s.sponsorId : s,
            status: typeof s === 'object' ? s.status : 'unknown',
            isCurrentSponsor: typeof s === 'object' && s.sponsorId && 
              ((typeof s.sponsorId === 'string' && s.sponsorId === clubId) ||
               (typeof s.sponsorId === 'object' && s.sponsorId._id === clubId))
          }))
        })));
      }
      
      return filteredForClub;
    },
    enabled: !!clubId && !!user,
  });

  // Filter events by status and visibility
  const filteredEvents = allEvents?.filter((event: Event) => {
    // Status filter
    if (event.status !== activeTab) return false;
    
    // Handle DRAFT events visibility
    if (event.status === EventStatus.DRAFT) {
      if (isSponsorship) {
        // For sponsors, show drafts if showDrafts is true (sponsor owner/admin)
        if (!showDrafts) return false;
      } else {
        // For clubs, show drafts only to admins if showDrafts is true
        if (!isAdmin || !showDrafts) return false;
      }
    }
    
    // For sponsors, show all events that match the filter criteria
    if (isSponsorship) {
      return true;
    }
    
    // For clubs, apply visibility filter
    if (event.visibility === EventVisibility.CLUB) {
      return isMember; // Only show club events to members
    } else if (event.visibility === EventVisibility.PRIVATE) {
      return event.creator.id === user?.id || event.invitedUsers?.includes(user?.id || '');
    }
    
    return true; // Public events are visible to all
  }) || [];

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

    loadFrontendTournaments();

    const handleFocus = () => {
      log.debug(LogCategory.TOURNAMENT, 'Window focus - reloading tournaments');
      loadFrontendTournaments();
    };

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

  // WebSocket integration for real-time tournament updates
  useEffect(() => {
    if (!allEvents || allEvents.length === 0) return;

    const eventIds = allEvents.map((event: Event) => event.id);
    eventIds.forEach((eventId: string) => {
      webSocketService.joinEventChat(eventId);
    });

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 ClubEventsSection WebSocket tournament update received:', data);
      
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
        console.log('🔄 ClubEventsSection refreshing tournament data for event:', relevantEventId);
        
        const refreshEventTournaments = async () => {
          try {
            const tournaments = await tournamentService.getTournamentsByEvent(relevantEventId);
            setEventTournaments(prev => ({
              ...prev,
              [relevantEventId]: tournaments
            }));
            
            const allTournaments = JSON.parse(localStorage.getItem('frontend_tournaments') || '{}');
            if (tournaments.length > 0) {
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
          } catch (error) {
            console.error('❌ Error refreshing tournament data:', error);
          }
        };
        
        refreshEventTournaments();
      }
    };

    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    return () => {
      eventIds.forEach((eventId: string) => {
        webSocketService.leaveEventChat(eventId);
      });
      webSocketService.removeTournamentListeners();
    };
  }, [allEvents, eventTournaments]);

  // Load tournament data for each event
  useEffect(() => {
    const loadTournamentData = async () => {
      if (!allEvents || allEvents.length === 0) return;
      
      const tournamentPromises = allEvents.map(async (event: any) => {
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
  }, [allEvents]);

  const getFrontendTournament = (eventId: string) => {
    const tournaments = eventTournaments[eventId];
    if (!tournaments || tournaments.length === 0) return null;
    
    const tournament = tournaments[0];
    
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

  const handleCreateTournament = async (eventId: string) => {
    log.info(LogCategory.TOURNAMENT, 'Creating tournament for event', { eventId });
    
    try {
      const event = allEvents?.find((e: Event) => e.id === eventId);
      log.debug(LogCategory.TOURNAMENT, 'Found event for tournament', { eventTitle: event?.title });
      
      const eventTitle = event?.title || 'Event';
      const creatorId = event?.creator?.id || event?.creatorId || '';
      const feature = event?.features?.includes(EventFeatures.SWISS_TOURNAMENT) 
        ? EventFeatures.SWISS_TOURNAMENT 
        : EventFeatures.SINGLE_ELIMINATION_TOURNAMENT;
      
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

  // Ensure non-admin users can't access DRAFT tab
  useEffect(() => {
    if (!isAdmin && activeTab === EventStatus.DRAFT) {
      setActiveTab(EventStatus.LIVE);
    }
  }, [isAdmin, activeTab]);

  // Update activeTab when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      try {
        await eventApi.deleteEvent(eventId);
        return eventId;
      } catch (error) {
        log.error(LogCategory.EVENT, 'Failed to delete event', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club-events', clubId] });
      setShowDeleteConfirm(false);
      setEventToDelete(null);
    },
    onError: (err) => {
      log.error(LogCategory.EVENT, 'Failed to delete event', err);
      alert('Failed to delete event. Please try again.');
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

  const canEditEvent = (event: Event) => {
    return user && (event.creator.id === user.id || event.creatorId === user.id) && isAdmin;
  };

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

  const getVisibilityBadge = (visibility: EventVisibility) => {
    switch (visibility) {
      case EventVisibility.CLUB:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">Club Only</span>;
      case EventVisibility.PRIVATE:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300">Private</span>;
      case EventVisibility.PUBLIC:
        return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">Public</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isSponsorship ? 'Sponsored Events' : 'Club Events'}
        </h2>
        {isAdmin && (
          <button
            type="button"
            className="btn btn-primary flex items-center"
            onClick={() => {
              setSelectedEvent(null);
              setIsCreateModalOpen(true);
            }}
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Create Event
          </button>
        )}
      </div>

      {/* Quick Stats */}
      <div className={`grid grid-cols-1 ${showDrafts ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
        {[
          // Only show Draft Events if showDrafts is true
          ...(showDrafts ? [{
            id: 'draft',
            title: 'Draft Events',
            count: allEvents?.filter((e: Event) => e.status === EventStatus.DRAFT).length || 0,
            color: 'text-yellow-600 dark:text-yellow-400'
          }] : []),
          {
            id: 'live',
            title: 'Live Events',
            count: allEvents?.filter((e: Event) => e.status === EventStatus.LIVE).length || 0,
            color: 'text-green-600 dark:text-green-400'
          },
          {
            id: 'past',
            title: 'Past Events',
            count: allEvents?.filter((e: Event) => e.status === EventStatus.PAST).length || 0,
            color: 'text-gray-600 dark:text-gray-400'
          }
        ].map(stat => (
          <div key={stat.id} className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg shadow border border-gray-200/50 dark:border-gray-700/50 p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">{stat.title}</h3>
            <p className={`text-2xl font-bold ${stat.color} mt-1`}>
              {stat.count}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200/50 dark:border-gray-700/50">
        <nav className="-mb-px flex space-x-8">
          {[
            // Only show Draft tab if showDrafts is true
            ...(showDrafts ? [EventStatus.DRAFT] : []),
            EventStatus.LIVE,
            EventStatus.PAST
          ].map((status) => (
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

      {/* Events Grid */}
      <div>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-12">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No events found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {isAdmin ? 'Get started by creating a new event for your club.' : 'No events are currently available.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event: Event) => (
              <div
                key={event.id}
                className="bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm overflow-hidden shadow-lg dark:shadow-gray-900/20 border border-gray-200/50 dark:border-gray-700/50 rounded-lg hover:shadow-xl dark:hover:shadow-gray-900/30 hover:bg-white/60 dark:hover:bg-gray-800/60 transition-all duration-200"
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
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEventStatusColor(event.status)}`}>
                        {event.status}
                      </span>
                      {getVisibilityBadge(event.visibility)}
                    </div>
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
                    {/* Time & Date */}
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
                    
                    {/* Location */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <MapPinIcon className="h-4 w-4 mr-2" />
                      {event.location}
                    </div>
                    
                    {/* Tags */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <TagIcon className="h-4 w-4 mr-2" />
                      {event.tags.join(', ')}
                    </div>
                    
                    {/* Tournament */}
                    {(event.features && (event.features.includes(EventFeatures.SINGLE_ELIMINATION_TOURNAMENT) || event.features.includes(EventFeatures.SWISS_TOURNAMENT))) && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <TrophyIcon className="h-4 w-4 mr-2" />
                        Tournament: {event.features.includes(EventFeatures.SWISS_TOURNAMENT) ? 'Swiss' : 'Single Elimination'}
                      </div>
                    )}
                    
                    {/* RSVPs */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      {event.rsvps.length} RSVPs
                    </div>
                    
                    {/* Cost */}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                      {event.isFree ? 'Free' : `$${event.cost}`}
                    </div>
                    
                    {/* Creator */}
                    {event.creator && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <UserIcon className="h-4 w-4 mr-2" />
                        {event.creator.username}
                      </div>
                    )}
                    
                    {/* Club Space (only show if different from current club) */}
                    {event.clubName && event.clubUsername && event.clubUsername !== clubUsername && (
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
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
                      </div>
                    )}

                    {/* Event Sponsors */}
                    {event.sponsors && event.sponsors.length > 0 && (
                      <div className="space-y-2">
                        {/* Approved Sponsors (visible to everyone) */}
                        {(() => {
                          const approvedSponsors = event.sponsors.filter((s: any) => 
                            typeof s === 'object' ? s.status === 'approved' : true
                          );
                          
                          if (approvedSponsors.length > 0) {
                            return (
                              <div className="flex items-start text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex items-center mr-2 mt-0.5">
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z" clipRule="evenodd" />
                                    <path d="M6 8h8v2H6V8z" />
                                  </svg>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="text-xs text-gray-500 dark:text-gray-400 mr-1">Sponsored by:</span>
                                  {approvedSponsors.slice(0, 3).map((sponsor: any, index: number) => {
                                    const sponsorData = typeof sponsor === 'object' ? sponsor.sponsorId : sponsor;
                                    return (
                                      <button
                                        key={typeof sponsorData === 'string' ? sponsorData : sponsorData._id}
                                        onClick={() => navigate(`/sponsors/${typeof sponsorData === 'object' ? sponsorData.username : sponsorData}`)}
                                        className="flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                                      >
                                        {typeof sponsorData === 'object' && sponsorData.logoUrl ? (
                                          <img
                                            src={sponsorData.logoUrl}
                                            alt={sponsorData.name}
                                            className="h-3 w-3 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="h-3 w-3 rounded-full bg-blue-200 dark:bg-blue-700 flex items-center justify-center">
                                            <span className="text-xs font-bold text-blue-800 dark:text-blue-200">
                                              {typeof sponsorData === 'object' ? sponsorData.name.charAt(0).toUpperCase() : 'S'}
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-xs font-medium text-blue-800 dark:text-blue-200">
                                          {typeof sponsorData === 'object' ? sponsorData.name : sponsorData}
                                        </span>
                                      </button>
                                    );
                                  })}
                                  {approvedSponsors.length > 3 && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      +{approvedSponsors.length - 3} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}

                        {/* Pending Sponsors (only visible to event creator) */}
                        {canEditEvent(event) && (() => {
                          const pendingSponsors = event.sponsors.filter((s: any) => 
                            typeof s === 'object' && s.status === 'pending'
                          );
                          
                          if (pendingSponsors.length > 0) {
                            return (
                              <div className="flex items-start text-sm text-yellow-600 dark:text-yellow-400">
                                <div className="flex items-center mr-2 mt-0.5">
                                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                                  </svg>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <span className="text-xs text-yellow-600 dark:text-yellow-400 mr-1">Pending sponsor approval:</span>
                                  {pendingSponsors.map((sponsor: any) => {
                                    const sponsorData = sponsor.sponsorId;
                                    return (
                                      <div
                                        key={typeof sponsorData === 'string' ? sponsorData : sponsorData._id}
                                        className="flex items-center gap-1 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md"
                                      >
                                        {typeof sponsorData === 'object' && sponsorData.logoUrl ? (
                                          <img
                                            src={sponsorData.logoUrl}
                                            alt={sponsorData.name}
                                            className="h-3 w-3 rounded-full object-cover"
                                          />
                                        ) : (
                                          <div className="h-3 w-3 rounded-full bg-yellow-200 dark:bg-yellow-700 flex items-center justify-center">
                                            <span className="text-xs font-bold text-yellow-800 dark:text-yellow-200">
                                              {typeof sponsorData === 'object' ? sponsorData.name.charAt(0).toUpperCase() : 'S'}
                                            </span>
                                          </div>
                                        )}
                                        <span className="text-xs font-medium text-yellow-800 dark:text-yellow-200">
                                          {typeof sponsorData === 'object' ? sponsorData.name : sponsorData}
                                        </span>
                                        <span className="text-xs text-yellow-600 dark:text-yellow-400">⏳</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex space-x-3">
                      {canEditEvent(event) ? (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary flex-1"
                            onClick={() => {
                              setSelectedEvent({ ...event, id: event.id });
                              setIsCreateModalOpen(true);
                            }}
                          >
                            {event.status === EventStatus.DRAFT ? 'Make Live' : 'Edit'}
                          </button>
                          <button 
                            type="button"
                            className="btn btn-primary flex-1"
                            onClick={() => navigate(`/event/${event.id}`)}
                          >
                            View Details
                          </button>
                          <button
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
                          type="button"
                          className="btn btn-primary flex-1"
                          onClick={() => navigate(`/event/${event.id}`)}
                        >
                          View Details
                        </button>
                      )}
                    </div>

                    {/* Sponsorship Action Buttons for Sponsor Owners */}
                    {isSponsorship && event.sponsors && (() => {
                      console.log('🔍 Checking sponsor approval buttons:', {
                        eventId: event.id,
                        eventTitle: event.title,
                        sponsors: event.sponsors,
                        clubId,
                        userId: user?.id
                      });
                      
                      const userPendingSponsors = event.sponsors.filter((s: any) => {
                        if (typeof s !== 'object' || s.status !== 'pending') return false;
                        
                        const sponsorId = s.sponsorId;
                        console.log('🔍 Checking sponsor:', { sponsorId, clubId, type: typeof sponsorId });
                        
                        // Check if this sponsor matches the current sponsor profile
                        if (typeof sponsorId === 'string') {
                          return sponsorId === clubId;
                        } else if (typeof sponsorId === 'object' && sponsorId) {
                          return sponsorId._id === clubId || sponsorId.id === clubId;
                        }
                        return false;
                      });

                      console.log('✅ Found pending sponsors for this user:', userPendingSponsors);

                      if (userPendingSponsors.length > 0) {
                        return (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                              🎯 Sponsorship Request for Your Company
                            </p>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                              This event has requested your sponsorship
                            </p>
                            <div className="flex gap-2">
                              <button
                                onClick={() => navigate(`/event/${event.id}`)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium transition-colors"
                              >
                                View & Approve
                              </button>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Tournament Actions */}
                    {(event.features && (event.features.includes(EventFeatures.SINGLE_ELIMINATION_TOURNAMENT) || event.features.includes(EventFeatures.SWISS_TOURNAMENT))) && (
                      function() {
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
                                if (url.includes('/tournament/')) {
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
                      }()
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
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
        clubId={clubId}
        clubUsername={clubUsername}
      />
    </div>
  );
};

export default ClubEventsSection; 