import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TournamentType, Tournament, TournamentPlayer, TournamentMatch, TournamentRound } from '../services/tournament.service';
import { tournamentService } from '../services/tournament.service';
import { webSocketService } from '../services/websocket.service';
import { TrophyIcon, UserPlusIcon, PlayIcon, TrashIcon, EyeIcon, CogIcon, FireIcon, ExclamationTriangleIcon, UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import TournamentCreationForm from '../components/TournamentCreationForm';
import { EventFeatures } from '../types/event';
import { log, LogCategory } from '../utils/logger';

interface RegisteredUser {
  userId: string;
  username: string;
  registeredAt: number;
}

const SingleEliminationTournament: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const eventId = searchParams.get('eventId') || '';
  const eventTitle = searchParams.get('eventTitle') || '';
  const eventCreatorId = searchParams.get('creatorId') || '';

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [addingPlayer, setAddingPlayer] = useState(false);
  const [showRegistrationModal, setShowRegistrationModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [tournamentExists, setTournamentExists] = useState(true);

  // Check if current user is the event creator
  const isEventCreator = user && eventCreatorId && user.id === eventCreatorId;

  // Check if current user is registered for the tournament
  const isUserRegistered = tournament && user && tournament.players.some(p => p.userId === user.id);

  // Function to find and consolidate all tournament data for this event
  const findAndConsolidateTournamentData = (eventId: string): Tournament | null => {
    log.debug(LogCategory.TOURNAMENT, 'Searching for tournament data', { eventId });
    
    // Check all localStorage keys for tournament data
    const allKeys = Object.keys(localStorage);
    const tournamentKeys = allKeys.filter(key => key.startsWith('tournament_'));
    
    let tournaments: Tournament[] = [];
    
    // Load from tournament_${eventId}
    const directKey = `tournament_${eventId}`;
    const directData = localStorage.getItem(directKey);
    if (directData) {
      try {
        const tournament = JSON.parse(directData);
        if (tournament.eventId === eventId || !tournament.eventId) {
          tournaments.push(tournament);
          log.debug(LogCategory.TOURNAMENT, 'Found tournament in direct key', { key: directKey });
        }
      } catch (error) {
        log.error(LogCategory.TOURNAMENT, 'Failed to parse tournament from direct key', error);
      }
    }
    
    // Load from frontend_tournaments
    const frontendData = localStorage.getItem('frontend_tournaments');
    if (frontendData) {
      try {
        const frontendTournaments = JSON.parse(frontendData);
        if (frontendTournaments[eventId]) {
          tournaments.push(frontendTournaments[eventId]);
          log.debug(LogCategory.TOURNAMENT, 'Found tournament in frontend_tournaments');
        }
      } catch (error) {
        log.error(LogCategory.TOURNAMENT, 'Failed to parse frontend_tournaments', error);
      }
    }
    
    // Check all other tournament keys for this eventId
    for (const key of tournamentKeys) {
      if (key !== directKey) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const tournament = JSON.parse(data);
            if (tournament.eventId === eventId) {
              tournaments.push(tournament);
              log.debug(LogCategory.TOURNAMENT, 'Found tournament in other key', { key });
            }
          }
        } catch (error) {
          log.error(LogCategory.TOURNAMENT, `Failed to parse tournament from key ${key}`, error);
        }
      }
    }
    
    if (tournaments.length === 0) {
      log.debug(LogCategory.TOURNAMENT, 'No tournaments found for event', { eventId });
      return null;
    }
    
    // Consolidate tournaments - merge registrations and take the most recent data
    let consolidatedTournament = tournaments[0];
    
    if (tournaments.length > 1) {
      log.info(LogCategory.TOURNAMENT, 'Consolidating multiple tournaments', { count: tournaments.length });
      
      // Find the tournament with the most registrations
      const tournamentWithMostRegistrations = tournaments.reduce((prev, current) => {
        const prevCount = prev.players?.length || 0;
        const currentCount = current.players?.length || 0;
        return currentCount > prevCount ? current : prev;
      });
      
      // Merge all registrations
      const allPlayers: TournamentPlayer[] = [];
      tournaments.forEach(tournament => {
        if (tournament.players) {
          allPlayers.push(...tournament.players);
        }
      });
      
      // Remove duplicates
      const uniquePlayers = allPlayers.filter((player, index, array) => 
        array.findIndex(p => p.id === player.id) === index
      );
      
      consolidatedTournament = {
        ...tournamentWithMostRegistrations,
        players: uniquePlayers.map(p => ({
          ...p,
          isGuest: p.isGuest || false
        })),
        eventId: eventId,
        organizerId: tournamentWithMostRegistrations.organizerId || eventCreatorId,
        type: TournamentType.SINGLE_ELIMINATION,
        numRounds: Math.ceil(Math.log2(uniquePlayers.length)),
        currentRound: 0,
        rounds: [] as TournamentRound[],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      log.debug(LogCategory.TOURNAMENT, 'Tournament consolidation complete', {
        originalCount: tournaments.length,
        totalPlayers: allPlayers.length,
        uniquePlayers: uniquePlayers.length
      });
    }
    
    return consolidatedTournament;
  };

  // Load tournament from backend API on mount
  useEffect(() => {
    log.info(LogCategory.TOURNAMENT, 'Tournament loading useEffect triggered', {
      eventId,
      eventTitle,
      eventCreatorId,
      isEventCreator,
      user: user ? { id: user.id, username: user.username } : null
    });

    const loadTournamentFromBackend = async () => {
      try {
        log.info(LogCategory.TOURNAMENT, 'Loading tournaments from backend', { eventId });
        const backendTournaments = await tournamentService.getTournamentsByEvent(eventId);
        
        console.log('🔍 Backend tournaments loaded:', backendTournaments);
        console.log('🔍 Number of tournaments:', backendTournaments.length);
        
        if (backendTournaments.length > 0) {
          const backendTournament = backendTournaments[0];
          console.log('🔍 Tournament data:', {
            name: backendTournament.name,
            isStarted: backendTournament.isStarted,
            playersCount: backendTournament.players?.length || 0,
            roundsCount: backendTournament.rounds?.length || 0,
            rounds: backendTournament.rounds
          });
          console.log('🔍 First tournament data:', backendTournament);
          console.log('🔍 Tournament players:', backendTournament.players);
          console.log('🔍 Number of players:', backendTournament.players?.length || 0);
          console.log('🔍 Tournament rounds:', backendTournament.rounds);
          console.log('🔍 Number of rounds:', backendTournament.rounds?.length || 0);
          console.log('🔍 Tournament isStarted:', backendTournament.isStarted);
          
          if (backendTournament.rounds && backendTournament.rounds.length > 0) {
            console.log('🔍 First round matches:', backendTournament.rounds[0].matches);
          }
          
          // Convert backend tournament to frontend format
          const frontendTournament: Tournament = {
            id: backendTournament._id || backendTournament.id,
            name: backendTournament.name,
            eventId: backendTournament.eventId,
            createdBy: backendTournament.organizerId,
            players: backendTournament.players.map(p => ({
              id: p.id,
              name: p.name,
              fullName: p.fullName,
              username: p.username,
              userId: p.userId,
              isGuest: p.isGuest,
              registeredAt: p.registeredAt
            })),
            registeredUsers: backendTournament.players
              .filter(p => !p.isGuest && p.userId)
              .map(p => ({
                userId: p.userId!,
                username: p.name,
                registeredAt: new Date(backendTournament.createdAt).getTime()
              })),
            matches: [], // Will be populated from rounds if needed
            rounds: backendTournament.rounds.length,
            status: 'registration_open',
            winner: null, // Will be determined from tournament state
            createdAt: new Date(backendTournament.createdAt).getTime(),
            maxPlayers: backendTournament.maxPlayers,
            isStarted: backendTournament.isStarted,
            isFinished: backendTournament.isFinished,
            registrationOpen: backendTournament.registrationOpen
          };
          
          console.log('🔍 Converted frontend tournament:', frontendTournament);
          console.log('🔍 Frontend tournament players:', frontendTournament.players);
          
          setTournament(frontendTournament);
          setTournamentExists(true);
        } else {
          console.log('🔍 No tournaments found for event:', eventId);
          setTournamentExists(false);
        }
      } catch (error) {
        log.error(LogCategory.TOURNAMENT, 'Failed to load tournament from backend', error);
        console.error('❌ Error loading tournaments:', error);
        setTournamentExists(false);
      }
    };

    loadTournamentFromBackend();
  }, [eventId]);

  // Listen for WebSocket updates (replacing localStorage sync)
  useEffect(() => {
    if (!eventId) return;

    // Join the event room to receive tournament updates
    webSocketService.joinEventChat(eventId);

    const handleTournamentUpdate = (data: any) => {
      console.log('🔔 WebSocket tournament update received:', data);
      
      if (data.type === 'guest-player-added' || data.type === 'player-removed' || data.type === 'player-registered' ||
          data.type === 'registration-opened' || data.type === 'registration-closed' || data.type === 'tournament-started') {
        console.log('🔄 Refreshing tournament data due to tournament update:', data.type);
        // Reload tournament data when players are added/removed or registration status changes
        const loadTournamentFromBackend = async () => {
          try {
            const tournaments = await tournamentService.getTournamentsByEvent(eventId);
            if (tournaments.length > 0) {
              const backendTournament = tournaments[0];
              
              // Determine status based on tournament state
              let status: Tournament['status'] = 'registration_open';
              if (backendTournament.isStarted) {
                status = 'active';
              } else if (backendTournament.isFinished) {
                status = 'completed';
              } else if (backendTournament.registrationOpen === false) {
                status = 'registration_closed';
              } else {
                status = 'registration_open';
              }
              
              const frontendTournament: Tournament = {
                id: backendTournament._id || backendTournament.id,
                name: backendTournament.name,
                eventId: backendTournament.eventId,
                createdBy: backendTournament.organizerId,
                players: backendTournament.players.map(p => ({
                  id: p.id,
                  name: p.name,
                  fullName: p.fullName,
                  username: p.username,
                  userId: p.userId,
                  isGuest: p.isGuest,
                  registeredAt: p.registeredAt
                })),
                registeredUsers: backendTournament.players
                  .filter(p => !p.isGuest && p.userId)
                  .map(p => ({
                    userId: p.userId!,
                    username: p.name,
                    registeredAt: new Date(backendTournament.createdAt).getTime()
                  })),
                matches: [],
                rounds: backendTournament.rounds.length,
                status: status,
                winner: null,
                createdAt: new Date(backendTournament.createdAt).getTime(),
                maxPlayers: backendTournament.maxPlayers,
                isStarted: backendTournament.isStarted,
                isFinished: backendTournament.isFinished,
                registrationOpen: backendTournament.registrationOpen
              };
              setTournament(frontendTournament);
            }
          } catch (error) {
            console.error('❌ Error refreshing tournament data:', error);
          }
        };
        loadTournamentFromBackend();
      }
    };

    // Subscribe to WebSocket tournament updates
    webSocketService.onTournamentUpdate(handleTournamentUpdate);

    return () => {
      webSocketService.removeTournamentListeners();
    };
  }, [eventId]);

  // Create tournament using backend API
  const handleCreateTournament = async () => {
    if (!eventId || !eventTitle) return;

    log.info(LogCategory.TOURNAMENT, 'Creating new tournament via backend API', {
      eventId,
      eventTitle,
      eventCreatorId,
      userId: user?.id,
      username: user?.username
    });

    try {
      // First, validate that the event exists
      log.info(LogCategory.TOURNAMENT, 'Validating event exists before creating tournament', { eventId });
      
      try {
        const eventResponse = await fetch(`http://localhost:3001/api/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
        
        if (!eventResponse.ok) {
          if (eventResponse.status === 404) {
            throw new Error(`Event with ID ${eventId} does not exist. Please check the event ID and try again.`);
          }
          throw new Error(`Failed to validate event: ${eventResponse.status} ${eventResponse.statusText}`);
        }
        
        log.info(LogCategory.TOURNAMENT, 'Event validation successful', { eventId });
      } catch (validationError) {
        log.error(LogCategory.TOURNAMENT, 'Event validation failed', validationError);
        const errorMessage = validationError instanceof Error ? validationError.message : 'Unknown validation error';
        alert(`Cannot create tournament: ${errorMessage}`);
        return;
      }

      const type = TournamentType.SINGLE_ELIMINATION; // Always enforce single elimination type in this component

      // Create tournament via backend API
      const backendTournament = await tournamentService.createTournament(
        eventId,
        `${eventTitle} Tournament`,
        32, // Default max players
        type
      );
      
      log.info(LogCategory.TOURNAMENT, 'Tournament created successfully via backend', { backendTournament });
      
      // Navigate to the appropriate tournament management page
      const tournamentId = backendTournament.id;
      if (!tournamentId) {
        throw new Error('Tournament ID not found in response');
      }
      
      navigate(`/tournament/single-elimination/${tournamentId}/manage?eventId=${eventId}&eventTitle=${encodeURIComponent(eventTitle)}&creatorId=${eventCreatorId}`);
      
      log.info(LogCategory.TOURNAMENT, 'Tournament created and state updated');
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to create tournament', error);
      alert('Failed to create tournament. Please try again.');
    }
  };

  // Open registration
  const openRegistration = async () => {
    if (!tournament || !isEventCreator) return;
    
    try {
      log.info(LogCategory.TOURNAMENT, 'Opening registration for tournament', { tournamentId: tournament.id });
      const updatedTournament = await tournamentService.openRegistration(tournament.id);
      log.info(LogCategory.TOURNAMENT, 'Registration opened successfully via backend');
      
      // Immediately update local state for instant UI feedback
      const updatedFrontendTournament: Tournament = {
        ...tournament,
        registrationOpen: true,
        status: 'registration_open'
      };
      setTournament(updatedFrontendTournament);
      
      // Update localStorage for consistency
      localStorage.setItem(`tournament_${eventId}`, JSON.stringify(updatedFrontendTournament));
      
      // Update frontend_tournaments for dashboard
      const allTournaments = JSON.parse(localStorage.getItem('frontend_tournaments') || '{}');
      if (eventId) {
        allTournaments[eventId] = {
          ...allTournaments[eventId],
          status: 'registration_open',
          registrationOpen: true
        };
        localStorage.setItem('frontend_tournaments', JSON.stringify(allTournaments));
      }
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to open registration', error);
      alert('Failed to open registration. Please try again.');
    }
  };

  // Close registration
  const closeRegistration = async () => {
    if (!tournament || !isEventCreator) return;
    
    try {
      log.info(LogCategory.TOURNAMENT, 'Closing registration for tournament', { tournamentId: tournament.id });
      const updatedTournament = await tournamentService.closeRegistration(tournament.id);
      log.info(LogCategory.TOURNAMENT, 'Registration closed successfully via backend');
      
      // Immediately update local state for instant UI feedback
      const updatedFrontendTournament: Tournament = {
        ...tournament,
        registrationOpen: false,
        status: 'registration_closed'
      };
      setTournament(updatedFrontendTournament);
      
      // Update localStorage for consistency
      localStorage.setItem(`tournament_${eventId}`, JSON.stringify(updatedFrontendTournament));
      
      // Update frontend_tournaments for dashboard
      const allTournaments = JSON.parse(localStorage.getItem('frontend_tournaments') || '{}');
      if (eventId) {
        allTournaments[eventId] = {
          ...allTournaments[eventId],
          status: 'registration_closed',
          registrationOpen: false
        };
        localStorage.setItem('frontend_tournaments', JSON.stringify(allTournaments));
      }
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to close registration', error);
      alert('Failed to close registration. Please try again.');
    }
  };

  // User registration for tournament using backend API
  const registerForTournament = async () => {
    log.info(LogCategory.TOURNAMENT, 'Starting tournament registration process via backend API', {
      tournament: tournament ? {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        eventId: tournament.eventId,
        registeredUsers: tournament.registeredUsers,
        registeredUserCount: tournament.registeredUsers.length
      } : null,
      user: user ? {
        id: user.id,
        username: user.username
      } : null,
      eventId
    });

    if (!tournament) {
      log.error(LogCategory.TOURNAMENT, 'Registration failed: Tournament not found');
      alert('Tournament not found. Please refresh the page and try again.');
      return;
    }

    if (!user) {
      log.error(LogCategory.TOURNAMENT, 'Registration failed: User not found');
      alert('User not authenticated. Please log in and try again.');
      return;
    }

    try {
      // Check if user is already registered
      const isAlreadyRegistered = tournament.registeredUsers.some(ru => ru.userId === user.id);
      log.info(LogCategory.TOURNAMENT, 'Checking if user is already registered', {
        userId: user.id,
        existingRegistrations: tournament.registeredUsers,
        isAlreadyRegistered
      });

      if (isAlreadyRegistered) {
        log.info(LogCategory.TOURNAMENT, 'User already registered, skipping registration');
        alert('You are already registered for this tournament.');
        return;
      }

      log.info(LogCategory.TOURNAMENT, 'Registering user via backend API', {
        tournamentId: tournament.id,
        userId: user.id,
        username: user.username
      });

      // Register via backend API
      const updatedBackendTournament = await tournamentService.registerForTournament(tournament.id);
      log.info(LogCategory.TOURNAMENT, 'Registration successful via backend', { updatedBackendTournament });

      // Convert backend tournament to frontend format
      const updatedFrontendTournament: Tournament = {
        id: updatedBackendTournament._id || updatedBackendTournament.id,
        name: updatedBackendTournament.name,
        eventId: updatedBackendTournament.eventId,
        createdBy: updatedBackendTournament.organizerId,
        players: updatedBackendTournament.players.map(p => ({
          id: p.id,
          name: p.name,
          fullName: p.fullName,
          username: p.username,
          userId: p.userId,
          isGuest: p.isGuest,
          registeredAt: p.registeredAt
        })),
        registeredUsers: updatedBackendTournament.players
          .filter(p => !p.isGuest && p.userId)
          .map(p => ({
            userId: p.userId!,
            username: p.name,
            registeredAt: new Date(updatedBackendTournament.createdAt).getTime()
          })),
        matches: [],
        rounds: updatedBackendTournament.rounds.length,
        status: (() => {
          if (updatedBackendTournament.isStarted) return 'active';
          if (updatedBackendTournament.isFinished) return 'completed';
          if (updatedBackendTournament.registrationOpen === false) return 'registration_closed';
          return 'registration_open';
        })(),
        winner: null,
        createdAt: new Date(updatedBackendTournament.createdAt).getTime(),
        maxPlayers: updatedBackendTournament.maxPlayers,
        isStarted: updatedBackendTournament.isStarted,
        isFinished: updatedBackendTournament.isFinished,
        registrationOpen: updatedBackendTournament.registrationOpen
      };

      log.info(LogCategory.TOURNAMENT, 'Updated tournament after registration', {
        originalRegisteredUsers: tournament.registeredUsers,
        newRegisteredUsers: updatedFrontendTournament.registeredUsers,
        registeredUserCount: updatedFrontendTournament.registeredUsers.length
      });

      // Update state
      setTournament(updatedFrontendTournament);

      log.info(LogCategory.TOURNAMENT, 'Registration completed and state updated');
      alert('Successfully registered for the tournament!');

    } catch (error: any) {
      log.error(LogCategory.TOURNAMENT, 'Registration failed', error);
      
      // Show user-friendly error message
      if (error.response?.data?.message) {
        alert(`Registration failed: ${error.response.data.message}`);
      } else {
        alert('Registration failed. Please try again.');
      }
    }
  };

  // Remove user registration
  const unregisterFromTournament = (userId: string) => {
    if (!tournament || !isEventCreator) return;

    const updatedTournament = {
      ...tournament,
      registeredUsers: tournament.registeredUsers.filter(ru => ru.userId !== userId),
      players: tournament.players.filter(p => p.userId !== userId)
    };

    // Save to localStorage
    localStorage.setItem(`tournament_${eventId}`, JSON.stringify(updatedTournament));

    // Update frontend_tournaments for dashboard
    const allTournaments = JSON.parse(localStorage.getItem('frontend_tournaments') || '{}');
    if (eventId) {
      allTournaments[eventId] = {
        ...allTournaments[eventId],
        registeredUsers: updatedTournament.registeredUsers,
        registeredUserCount: updatedTournament.registeredUsers.length,
        players: updatedTournament.players
      };
      localStorage.setItem('frontend_tournaments', JSON.stringify(allTournaments));
    }

    setTournament(updatedTournament);
  };

  // Convert registered users to players when starting tournament
  const convertRegistrationsToPlayers = () => {
    if (!tournament) return;
    
    const players: TournamentPlayer[] = tournament.registeredUsers.map(user => ({
      id: `player_${user.userId}`,
      name: user.username,
      userId: user.userId
    }));

    // Add any manually added players
    const manualPlayers = tournament.players.filter(p => !p.userId);
    
    setTournament({
      ...tournament,
      players: [...players, ...manualPlayers]
    });
  };

  // Add player (for event creator manual addition)
  const addPlayer = async () => {
    if (!tournament || !playerName.trim() || !isEventCreator) return;
    
    try {
      log.info(LogCategory.TOURNAMENT, 'Adding guest player via backend API', {
        tournamentId: tournament.id,
        playerName: playerName.trim()
      });

      // Add guest player via backend API
      const updatedTournament = await tournamentService.addGuestPlayer(
        tournament.id,
        playerName.trim()
      );

      log.info(LogCategory.TOURNAMENT, 'Guest player added successfully', { updatedTournament });

      // Convert backend tournament to frontend format
      const frontendTournament: Tournament = {
        id: updatedTournament._id || updatedTournament.id,
        name: updatedTournament.name,
        eventId: updatedTournament.eventId,
        createdBy: updatedTournament.organizerId,
        players: updatedTournament.players.map(p => ({
          id: p.id,
          name: p.name,
          fullName: p.fullName,
          username: p.username,
          userId: p.userId,
          isGuest: p.isGuest,
          registeredAt: p.registeredAt
        })),
        registeredUsers: updatedTournament.players
          .filter(p => !p.isGuest && p.userId)
          .map(p => ({
            userId: p.userId!,
            username: p.name,
            registeredAt: new Date(updatedTournament.createdAt).getTime()
          })),
        matches: [], // Will be populated from rounds if needed
        rounds: updatedTournament.rounds.length,
        status: updatedTournament.isStarted ? 'active' : 'registration_open',
        winner: null, // Will be determined from tournament state
        createdAt: new Date(updatedTournament.createdAt).getTime(),
        maxPlayers: updatedTournament.maxPlayers,
        isStarted: updatedTournament.isStarted,
        isFinished: updatedTournament.isFinished,
        registrationOpen: updatedTournament.registrationOpen
      };

      setTournament(frontendTournament);
    setPlayerName('');
    setAddingPlayer(false);
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to add guest player', error);
      alert('Failed to add guest player. Please try again.');
    }
  };

  // Remove player
  const removePlayer = async (playerId: string) => {
    if (!tournament || !isEventCreator) return;
    
    try {
      log.info(LogCategory.TOURNAMENT, 'Removing player via backend API', {
        tournamentId: tournament.id,
        playerId
      });

      // Remove player via backend API
      const updatedTournament = await tournamentService.removePlayer(
        tournament.id,
        playerId
      );

      log.info(LogCategory.TOURNAMENT, 'Player removed successfully', { updatedTournament });

      // Convert backend tournament to frontend format
      const frontendTournament: Tournament = {
        id: updatedTournament._id || updatedTournament.id,
        name: updatedTournament.name,
        eventId: updatedTournament.eventId,
        createdBy: updatedTournament.organizerId,
        players: updatedTournament.players.map(p => ({
          id: p.id,
          name: p.name,
          fullName: p.fullName,
          username: p.username,
          userId: p.userId,
          isGuest: p.isGuest,
          registeredAt: p.registeredAt
        })),
        registeredUsers: updatedTournament.players
          .filter(p => !p.isGuest && p.userId)
          .map(p => ({
            userId: p.userId!,
            username: p.name,
            registeredAt: new Date(updatedTournament.createdAt).getTime()
          })),
        matches: [], // Will be populated from rounds if needed
        rounds: updatedTournament.rounds.length,
        status: updatedTournament.isStarted ? 'active' : 'registration_open',
        winner: null, // Will be determined from tournament state
        createdAt: new Date(updatedTournament.createdAt).getTime(),
        maxPlayers: updatedTournament.maxPlayers,
        isStarted: updatedTournament.isStarted,
        isFinished: updatedTournament.isFinished,
        registrationOpen: updatedTournament.registrationOpen
      };

      setTournament(frontendTournament);
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to remove player', error);
      alert('Failed to remove player. Please try again.');
    }
  };

  // Generate bracket
  const generateBracket = async () => {
    if (!tournament || !isEventCreator) return;
    
    try {
      log.info(LogCategory.TOURNAMENT, 'Starting tournament via backend API', { tournamentId: tournament.id });
      
      // Call backend API to start tournament
      const updatedTournament = await tournamentService.startTournament(tournament.id);
      
      log.info(LogCategory.TOURNAMENT, 'Tournament started successfully', { updatedTournament });
      
      // Convert backend tournament to frontend format
      const frontendTournament: Tournament = {
        id: updatedTournament._id || updatedTournament.id,
        name: updatedTournament.name,
        eventId: updatedTournament.eventId,
        createdBy: updatedTournament.organizerId,
        players: updatedTournament.players.map(p => ({
          id: p.id,
          name: p.name,
          fullName: p.fullName,
          username: p.username,
          userId: p.userId,
          isGuest: p.isGuest,
          registeredAt: p.registeredAt
        })),
        registeredUsers: updatedTournament.players
          .filter(p => !p.isGuest && p.userId)
          .map(p => ({
            userId: p.userId!,
            username: p.name,
            registeredAt: new Date(updatedTournament.createdAt).getTime()
          })),
        matches: [], // Will be populated from rounds if needed
        rounds: updatedTournament.rounds.length,
        status: 'active',
        winner: null,
        createdAt: new Date(updatedTournament.createdAt).getTime(),
        maxPlayers: updatedTournament.maxPlayers,
        isStarted: updatedTournament.isStarted,
        isFinished: updatedTournament.isFinished,
        startedAt: Date.now()
      };
      
      setTournament(frontendTournament);
      
      // Update localStorage
      localStorage.setItem(`tournament_${eventId}`, JSON.stringify(frontendTournament));
      
      // Update frontend_tournaments for dashboard
      const allTournaments = JSON.parse(localStorage.getItem('frontend_tournaments') || '{}');
      allTournaments[eventId] = {
        id: frontendTournament.id,
        name: frontendTournament.name,
        status: frontendTournament.status,
        playerCount: frontendTournament.players.length,
        registeredUserCount: frontendTournament.registeredUsers.length,
        registeredUsers: frontendTournament.registeredUsers,
        players: frontendTournament.players,
        winner: frontendTournament.winner,
        createdAt: frontendTournament.createdAt,
        startedAt: frontendTournament.startedAt,
        createdBy: frontendTournament.createdBy
      };
      localStorage.setItem('frontend_tournaments', JSON.stringify(allTournaments));
      
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to start tournament', error);
      console.error('Error starting tournament:', error);
      
      // Fallback to local bracket generation if backend fails
      log.info(LogCategory.TOURNAMENT, 'Falling back to local bracket generation');
    
    // Convert registrations to players first
    convertRegistrationsToPlayers();
    
    const allPlayers = [
      ...tournament.registeredUsers.map(user => ({
        id: `player_${user.userId}`,
        name: user.username,
        userId: user.userId
      })),
      ...tournament.players.filter(p => !p.userId)
    ];

    if (allPlayers.length < 2) return;

    const rounds = Math.ceil(Math.log2(allPlayers.length));
    const matches: any[] = [];
    let matchId = 1;

    // First round
    for (let i = 0; i < allPlayers.length; i += 2) {
      const player1 = allPlayers[i];
      const player2 = allPlayers[i + 1] || null;
      
      matches.push({
        id: `match_${matchId}`,
        round: 1,
        player1,
        player2,
        winner: player2 ? null : player1,
        status: player2 ? 'pending' : 'completed'
      });
      matchId++;
    }

    // Subsequent rounds
    for (let round = 2; round <= rounds; round++) {
      const prevRoundMatches = matches.filter(m => m.round === round - 1);
      const matchesInThisRound = Math.ceil(prevRoundMatches.length / 2);
      
      for (let i = 0; i < matchesInThisRound; i++) {
        matches.push({
          id: `match_${matchId}`,
          round,
          player1: null,
          player2: null,
          winner: null,
          status: 'pending'
        });
        matchId++;
      }
    }

      const updatedTournament = {
      ...tournament,
      players: allPlayers,
      matches,
      rounds,
        status: 'active' as const,
      startedAt: Date.now()
      };
      
      setTournament(updatedTournament);
      
      // Update localStorage
      localStorage.setItem(`tournament_${eventId}`, JSON.stringify(updatedTournament));
    }
  };

  // Set match winner
  const setMatchWinner = (matchId: string, winner: TournamentPlayer) => {
    if (!tournament) return;

    const updatedMatches = tournament.matches.map(match => {
      if (match.id === matchId) {
        return { ...match, winner, status: 'completed' as const };
      }
      return match;
    });

    // Advance winner to next round
    const currentMatch = tournament.matches.find(m => m.id === matchId);
    if (currentMatch) {
      const nextRound = currentMatch.round + 1;
      const nextRoundMatches = updatedMatches.filter(m => m.round === nextRound);
      
      if (nextRoundMatches.length > 0) {
        const currentMatchIndex = tournament.matches.filter(m => m.round === currentMatch.round).indexOf(currentMatch);
        const nextMatchIndex = Math.floor(currentMatchIndex / 2);
        const nextMatch = nextRoundMatches[nextMatchIndex];
        
        if (nextMatch) {
          const updatedNextMatch = {
            ...nextMatch,
            [nextMatch.player1 ? 'player2' : 'player1']: winner
          };
          
          const finalMatches = updatedMatches.map(m => 
            m.id === nextMatch.id ? updatedNextMatch : m
          );
          
          setTournament({
            ...tournament,
            matches: finalMatches,
            status: nextRound === tournament.rounds && updatedNextMatch.player1 && updatedNextMatch.player2 ? 'completed' : 'active',
            winner: nextRound === tournament.rounds ? winner : null
          });
          return;
        }
      } else {
        setTournament({
          ...tournament,
          matches: updatedMatches,
          status: 'completed',
          winner
        });
        return;
      }
    }

    setTournament({
      ...tournament,
      matches: updatedMatches
    });
  };

  const getMatchesForRound = (round: number) => {
    // Handle new backend structure with rounds array
    if (tournament?.rounds && Array.isArray(tournament.rounds)) {
      const roundData = tournament.rounds.find(r => r.roundNumber === round);
      return roundData?.matches || [];
    }
    
    // Fallback to old structure for backward compatibility
    return tournament?.matches?.filter(m => m.round === round) || [];
  };

  const refreshTournamentData = async () => {
    if (!eventId) return;
    
    try {
      log.info(LogCategory.TOURNAMENT, 'Refreshing tournament data from backend', { eventId });
      const backendTournaments = await tournamentService.getTournamentsByEvent(eventId);
      
      if (backendTournaments.length > 0) {
        const backendTournament = backendTournaments[0];
        
        // Convert backend tournament to frontend format
        const frontendTournament: Tournament = {
          id: backendTournament._id || backendTournament.id,
          name: backendTournament.name,
          eventId: backendTournament.eventId,
          createdBy: backendTournament.organizerId,
          players: backendTournament.players.map(p => ({
            id: p.id,
            name: p.name,
            fullName: p.fullName,
            username: p.username,
            userId: p.userId,
            isGuest: p.isGuest,
            registeredAt: p.registeredAt
          })),
          registeredUsers: backendTournament.players
            .filter(p => !p.isGuest && p.userId)
            .map(p => ({
              userId: p.userId!,
              username: p.name,
              registeredAt: new Date(backendTournament.createdAt).getTime()
            })),
          matches: [], // Will be populated from rounds if needed
          rounds: backendTournament.rounds.length,
          status: backendTournament.isStarted ? 'active' : 'registration_open',
          winner: null, // Will be determined from tournament state
          createdAt: new Date(backendTournament.createdAt).getTime(),
          maxPlayers: backendTournament.maxPlayers,
          isStarted: backendTournament.isStarted,
          isFinished: backendTournament.isFinished,
          registrationOpen: backendTournament.registrationOpen
        };
        
        setTournament(frontendTournament);
        setTournamentExists(true);
        
        log.info(LogCategory.TOURNAMENT, 'Tournament data refreshed successfully', { frontendTournament });
      } else {
        setTournamentExists(false);
      }
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to refresh tournament data', error);
      console.error('❌ Error refreshing tournament data:', error);
    }
  };

  const handleManualMigration = async () => {
    if (!eventId) return;
    
    log.info(LogCategory.TOURNAMENT, 'Manual migration triggered');
    const success = await migrateLocalStorageTournamentToBackend(eventId);
    
    if (success) {
      alert('Migration successful! Reloading page...');
      window.location.reload();
    } else {
      alert('Migration failed or not needed. Check console for details.');
    }
  };

  // Function to clear all localStorage tournament data
  const clearAllTournamentData = () => {
    // Clear localStorage data
    localStorage.removeItem(`tournament_${eventId}`);
    
    // Clear from frontend_tournaments
    const frontendTournaments = JSON.parse(localStorage.getItem('frontend_tournaments') || '{}');
    delete frontendTournaments[eventId];
    localStorage.setItem('frontend_tournaments', JSON.stringify(frontendTournaments));
    
    // Reset state
    setTournament({
      id: '',
      name: '',
      eventId: eventId,
      createdBy: user?.id || '',
      players: [],
      registeredUsers: [],
      matches: [],
      rounds: 0,
      status: 'not_created',
      winner: null,
      createdAt: Date.now(),
      maxPlayers: 32
    });
    
    console.log('🧹 All tournament data cleared');
  };

  const deleteTournament = async () => {
    if (!tournament || !isEventCreator) return;
    
    try {
      log.info(LogCategory.TOURNAMENT, 'Deleting tournament', { tournamentId: tournament.id });
      
      await tournamentService.deleteTournament(tournament.id);
      
      log.info(LogCategory.TOURNAMENT, 'Tournament deleted successfully');
      
      // Clear local state and navigate away
      setTournament(null);
      localStorage.removeItem(`tournament_${eventId}`);
      
      // Navigate back to the event page or dashboard
      navigate('/dashboard');
      
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Failed to delete tournament', error);
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament. Please try again.');
    }
  };



  // Migration function to transfer localStorage tournament to backend
  const migrateLocalStorageTournamentToBackend = async (eventId: string): Promise<boolean> => {
    log.info(LogCategory.TOURNAMENT, 'Attempting to migrate localStorage tournament to backend for event', { eventId });
    
    try {
      // Check if there's tournament data in localStorage
      const localTournamentData = findAndConsolidateTournamentData(eventId);
      
      if (!localTournamentData) {
        log.info(LogCategory.TOURNAMENT, 'No localStorage tournament data found for migration');
        return false;
      }
      
      log.info(LogCategory.TOURNAMENT, 'Found localStorage tournament data for migration', { localTournamentData });
      
      // Check if tournament already exists in backend
      try {
        const existingBackendTournaments = await tournamentService.getTournamentsByEvent(eventId);
        if (existingBackendTournaments && existingBackendTournaments.length > 0) {
          log.info(LogCategory.TOURNAMENT, 'Tournament already exists in backend, skipping migration');
          return false;
        }
      } catch (error) {
        log.info(LogCategory.TOURNAMENT, 'No existing backend tournament found, proceeding with migration');
      }
      
      // Create tournament in backend
      log.info(LogCategory.TOURNAMENT, 'Creating tournament in backend via migration');
      const backendTournament = await tournamentService.createTournament(
        eventId,
        localTournamentData.name,
        localTournamentData.maxPlayers || 32,
        TournamentType.SINGLE_ELIMINATION
      );
      
      log.info(LogCategory.TOURNAMENT, 'Tournament created in backend', { backendTournament });
      
      // Register users from localStorage data
      if (localTournamentData.registeredUsers && localTournamentData.registeredUsers.length > 0) {
        log.info(LogCategory.TOURNAMENT, 'Migrating registered users', { registeredUsers: localTournamentData.registeredUsers });
        
        for (const registeredUser of localTournamentData.registeredUsers) {
          try {
            // Only migrate if the user is the current user (for security)
            if (registeredUser.userId === user?.id) {
              log.info(LogCategory.TOURNAMENT, 'Migrating current user registration', { registeredUser });
              await tournamentService.registerForTournament(backendTournament.id);
              log.info(LogCategory.TOURNAMENT, 'Successfully migrated user registration');
            } else {
              log.info(LogCategory.TOURNAMENT, 'Skipping migration of other user registration for security', { username: registeredUser.username });
            }
          } catch (error) {
            log.error(LogCategory.TOURNAMENT, 'Failed to migrate user registration', { registeredUser, error });
          }
        }
      }
      
      log.info(LogCategory.TOURNAMENT, 'Migration completed successfully');
      return true;
      
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, 'Migration failed', error);
      return false;
    }
  };

  // Show tournament creation page only for event creators, or coming soon for others
  if (!tournament) {
    log.info(LogCategory.TOURNAMENT, 'No tournament found, showing creation/coming soon view', {
      isEventCreator,
      eventId,
      eventTitle,
      user
    });
    
    if (isEventCreator) {
      // Event creator sees the tournament creation interface
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="max-w-4xl mx-auto text-center">
            <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {searchParams.get('feature') === EventFeatures.SWISS_TOURNAMENT ? 'Swiss Tournament' : 'Single Elimination Tournament'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Create a tournament for "{eventTitle}"
            </p>
            <TournamentCreationForm
              eventId={eventId}
              eventFeature={searchParams.get('feature') as EventFeatures || EventFeatures.SINGLE_ELIMINATION_TOURNAMENT}
              onTournamentCreated={handleCreateTournament}
              defaultName={`${eventTitle} Tournament`}
            />
          </div>
        </div>
      );
    } else {
      // Non-creators see a "coming soon" page
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <button
                onClick={() => navigate(-1)}
                className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
              <TrophyIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Tournament Coming Soon
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Tournament for "{eventTitle}"
              </p>
            </div>

            {/* Coming Soon Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <svg className="w-8 h-8 text-gray-500 dark:text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Tournament Setup in Progress
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  The event organizer is currently setting up the tournament. 
                  Registration will open soon!
                </p>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      Single Elimination
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Tournament Format</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">
                      TBD
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">Max Players</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">What to Expect</h3>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 text-left">
                    <li>• Single elimination format - one loss and you're out</li>
                    <li>• Registration will open when the organizer is ready</li>
                    <li>• You'll receive notification when registration opens</li>
                    <li>• Tournament bracket will be generated automatically</li>
                  </ul>
                </div>

                <div className="inline-flex items-center px-6 py-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                  Registration Not Open Yet
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check back later or return to the event dashboard for updates.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Show registration page only when registration is open and user is not registered
  if (!isEventCreator && tournament.status === 'registration_open' && !isUserRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Tournament for "{eventTitle}"
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Registration is now open!
            </p>
          </div>

          {/* Registration Card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
                <UserPlusIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Join the Tournament
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Register now to participate in this single elimination tournament!
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    Single Elimination
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Tournament Format</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {tournament.players.length}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Players Registered</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Tournament Details</h3>
                <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 text-left">
                  <li>• Single elimination format - one loss and you're out</li>
                  <li>• Tournament starts when registration closes</li>
                  <li>• Bracket will be randomly generated</li>
                  <li>• You can unregister before the tournament starts</li>
                </ul>
              </div>

              {isUserRegistered ? (
                <div className="inline-flex items-center px-6 py-3 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  You're registered and ready to compete!
                </div>
              ) : (
                <button
                  onClick={registerForTournament}
                  className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center justify-center"
                >
                  <UserPlusIcon className="h-5 w-5 mr-2" />
                  Register Now
                </button>
              )}

              <p className="text-sm text-gray-500 dark:text-gray-400">
                By registering, you agree to participate in the tournament when it begins.
              </p>
            </div>
          </div>

          {/* Registered Players List */}
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Players ({tournament.players.length})
              </h2>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Updated {new Date().toLocaleTimeString()}
              </div>
            </div>

            {/* Registered Players Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Registered Players ({tournament.players.filter(p => !p.isGuest).length})
              </h3>
              {tournament.players.filter(p => !p.isGuest).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tournament.players
                    .filter((player, index, array) => 
                    // Remove duplicates by userId
                      array.findIndex(p => p.userId ? p.userId === player.userId : p.id === player.id) === index
                  )
                    .filter(player => !player.isGuest) // Only show registered users
                    .map((player, index) => (
                    <div key={`${player.userId || player.id}-${index}`} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                        {index + 1}
                      </span>
                    </div>
                    <div className="flex-grow">
                      <div className="font-medium text-gray-900 dark:text-white">
                          {player.fullName || player.name}
                      </div>
                        {player.username && (
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            @{player.username}
                          </div>
                        )}
                        {player.registeredAt && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                            Registered: {new Date(player.registeredAt).toLocaleString()}
                      </div>
                        )}
                    </div>
                      {user && user.id === player.userId && (
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                          You
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">No registered players yet</p>
                </div>
              )}
            </div>

            {/* Guest Players Section */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Guests ({tournament.players.filter(p => p.isGuest).length})
              </h3>
              {tournament.players.filter(p => p.isGuest).length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tournament.players
                    .filter(player => player.isGuest)
                    .map((player, index) => (
                    <div key={`guest-${player.id}-${index}`} className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                          G{index + 1}
                        </span>
                      </div>
                      <div className="flex-grow">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {player.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Guest
                        </div>
                        {player.registeredAt && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Added: {new Date(player.registeredAt).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400">No guest players yet</p>
                </div>
              )}
            </div>

            {tournament.players.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No players registered yet</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  Be the first to join this tournament!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Show tournament view for registered players, event creators, or when tournament is active/completed
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <TrophyIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {tournament.name}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Status: {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
          </p>
        </div>

        {/* Tournament Management for Event Creators */}
        {isEventCreator && (tournament.status === 'registration_open' || tournament.status === 'registration_closed') && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Registered Users */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Players ({tournament.players.length})
              </h2>

              {/* Registered Players Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Registered Players ({tournament.players.filter(p => !p.isGuest).length})
                </h3>
                <div className="space-y-3">
                  {tournament.players
                    .filter((player, index, array) => 
                      // Remove duplicates by userId
                      array.findIndex(p => p.userId ? p.userId === player.userId : p.id === player.id) === index
                    )
                    .filter(player => !player.isGuest) // Only show registered users
                    .map((player, index) => (
                    <div key={`${player.userId || player.id}-${index}`} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {player.fullName || player.name}
                        </div>
                        {player.username && (
                          <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            @{player.username}
                          </div>
                        )}
                        {player.registeredAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Registered: {new Date(player.registeredAt).toLocaleString()}
                          </p>
                        )}
                      </div>
                    <button
                        onClick={() => unregisterFromTournament(player.userId || player.id)}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Remove
                    </button>
                  </div>
                  ))}
                  {tournament.players.filter(p => !p.isGuest).length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 dark:text-gray-400">No registered players yet</p>
                </div>
                  )}
                </div>
              </div>

              {/* Guests Section */}
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                  Guests ({tournament.players.filter(p => p.isGuest).length})
                </h3>
                <div className="space-y-3">
                  {tournament.players
                    .filter(player => player.isGuest) // Only show guest players
                    .map((player, index) => (
                    <div key={`${player.id}-${index}`} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {player.fullName || player.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Guest
                        </div>
                    </div>
                    <button
                        onClick={() => removePlayer(player.id)}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                  {tournament.players.filter(p => p.isGuest).length === 0 && (
                    <div className="text-center py-4">
                      <p className="text-gray-500 dark:text-gray-400">No guest players yet</p>
                  </div>
                )}
                </div>
              </div>

              {/* Manual Player Addition */}
              <div className="space-y-3">
                {addingPlayer ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Add guest player"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      onKeyPress={(e) => e.key === 'Enter' && addPlayer()}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={addPlayer}
                        disabled={!playerName.trim()}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Add Guest
                      </button>
                      <button
                        onClick={() => {
                          setAddingPlayer(false);
                          setPlayerName('');
                        }}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingPlayer(true)}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
                  >
                    <UserPlusIcon className="h-5 w-5 mr-2" />
                    Add Guest Player
                  </button>
                )}
              </div>
            </div>

            {/* Tournament Controls */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tournament Management</h2>
              
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Single Elimination</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    Players are eliminated after one loss. Tournament continues until one player remains.
                  </p>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Current Setup:</strong><br />
                    Registered: {tournament.players.filter(p => !p.isGuest).length}<br />
                    Manual Players: {tournament.players.filter(p => p.isGuest).length}<br />
                    Total Players: {tournament.players.length}<br />
                    Rounds needed: {tournament.players.length > 1 ? Math.ceil(Math.log2(tournament.players.length)) : 0}
                  </p>
                </div>

                {/* Registration Controls */}
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900 dark:text-white">Registration</h3>
                  {tournament.status === 'registration_closed' ? (
                    <div className="space-y-3">
                      <button
                        onClick={openRegistration}
                        className="w-full px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center justify-center"
                      >
                        Open Registration
                      </button>
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Allow users to register for the tournament
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-center px-4 py-2 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded-lg">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Registration Open
                      </div>
                      <button
                        onClick={closeRegistration}
                        className="w-full px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700"
                      >
                        Close Registration
                      </button>
                    </div>
                  )}
                </div>

                {/* Start Tournament */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="font-medium text-gray-900 dark:text-white">Start Tournament</h3>
                  <button
                    onClick={generateBracket}
                    disabled={tournament.players.length < 2}
                    className="w-full px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <PlayIcon className="h-5 w-5 mr-2" />
                    Start Tournament
                  </button>
                  {tournament.players.length < 2 && (
                    <p className="text-xs text-red-500 dark:text-red-400 text-center">
                      Need at least 2 players to start tournament
                    </p>
                  )}
                </div>

                {/* Delete Tournament */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                  <h3 className="font-medium text-gray-900 dark:text-white">Danger Zone</h3>
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
                        deleteTournament();
                      }
                    }}
                    className="w-full px-6 py-3 bg-red-700 text-white font-medium rounded-lg hover:bg-red-800 flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Tournament
                  </button>
                  <p className="text-xs text-red-500 dark:text-red-400 text-center">
                    This will permanently delete the tournament and all its data
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Creator Controls for Active/Completed Tournaments */}
        {isEventCreator && (tournament.status === 'active' || tournament.status === 'completed') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tournament Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Tournament Status */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Status</h3>
                <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  tournament.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                }`}>
                  {tournament.status === 'active' ? 'Tournament Active' : 'Tournament Completed'}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {tournament.players.length} players competing
                </p>
              </div>

              {/* Match Results Management */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Match Results</h3>
                <button
                  onClick={() => {
                    console.log('🔍 Navigating to match results with tournament ID:', tournament.id);
                    if (!tournament.id) {
                      console.error('❌ Tournament ID is undefined!', tournament);
                      alert('Error: Tournament ID is missing. Please refresh the page and try again.');
                      return;
                    }
                    navigate(`/tournament/single-elimination/${tournament.id}/results`);
                  }}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  Manage Results
                </button>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-2">
                  Submit, confirm, and resolve disputes
                </p>
              </div>


            </div>
          </div>
        )}

        {/* Tournament View for Non-Creators or Active/Completed Tournaments */}
        {(!isEventCreator || tournament.status === 'active' || tournament.status === 'completed') && tournament.status !== 'registration_open' && tournament.status !== 'registration_closed' && (
          <div className="mb-8">
            {/* Tournament participants info for viewers */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Tournament Participants</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tournament.players.map((player) => (
                  <div key={player.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="text-center">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {player.fullName || player.name}
                      </div>
                      {player.username && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          @{player.username}
                        </div>
                      )}
                      {user && user.id === player.userId && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                            You
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Match Results Access for Registered Players */}
            {!isEventCreator && isUserRegistered && (tournament.status === 'active' || tournament.status === 'completed') && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Your Tournament Actions</h2>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Match Results</h3>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mb-4">
                      Submit your match results, confirm opponent results, and track your tournament progress.
                    </p>
                    <button
                      onClick={() => navigate(`/tournament/single-elimination/${tournament.id}/results`)}
                      className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex items-center justify-center"
                    >
                      <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Submit & Manage Match Results
                    </button>
                  </div>
                  
                  <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">Tournament Status</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {tournament.status === 'active' ? 'Tournament is currently active' : 'Tournament has been completed'}
                        </p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        tournament.status === 'active' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
                      }`}>
                        {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tournament Bracket for Active/Completed Tournaments */}
        {(tournament.status === 'active' || tournament.status === 'completed') && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Tournament Bracket</h2>
            
            <div className="space-y-8">
              {/* Handle new backend structure with rounds array */}
              {tournament.rounds && Array.isArray(tournament.rounds) ? (
                tournament.rounds.map(roundData => (
                  <div key={roundData.roundNumber}>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Round {roundData.roundNumber} {roundData.roundNumber === (Array.isArray(tournament.rounds) ? tournament.rounds.length : tournament.rounds) ? '(Final)' : ''}
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {roundData.matches.map((match: any) => (
                        <div key={match.matchId} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                Match {match.matchId.split('-')[0]}
                              </span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                match.status === 'completed' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                              }`}>
                                {match.status}
                              </span>
                            </div>
                            
                            <div className="space-y-2">
                              <div className={`p-2 rounded border ${
                                match.winnerId === match.player1?.id 
                                  ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {match.player1 ? (match.player1.fullName || match.player1.name) : 'TBD'}
                                  </span>
                                  {isEventCreator && match.status === 'pending' && match.player1 && match.player2 && (
                                    <button
                                      onClick={() => setMatchWinner(match.matchId, match.player1)}
                                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Winner
                                    </button>
                                  )}
                                </div>
                              </div>
                              
                              <div className="text-center text-xs text-gray-400">vs</div>
                              
                              <div className={`p-2 rounded border ${
                                match.winnerId === match.player2?.id 
                                  ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                                  : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {match.player2 ? (match.player2.fullName || match.player2.name) : 'TBD'}
                                  </span>
                                  {isEventCreator && match.status === 'pending' && match.player1 && match.player2 && (
                                    <button
                                      onClick={() => setMatchWinner(match.matchId, match.player2)}
                                      className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                      Winner
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                /* Fallback for old structure with rounds as number */
                Array.from({ length: tournament.rounds || 0 }, (_, i) => i + 1).map(round => (
                <div key={round}>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Round {round} {round === tournament.rounds ? '(Final)' : ''}
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {getMatchesForRound(round).map((match: any) => (
                      <div key={match.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                              Match {match.id.split('_')[1]}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              match.status === 'completed' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            }`}>
                              {match.status}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <div className={`p-2 rounded border ${
                              match.winner?.id === match.player1?.id 
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {match.player1 ? (match.player1.fullName || match.player1.name) : 'TBD'}
                                </span>
                                {isEventCreator && match.status === 'pending' && match.player1 && match.player2 && (
                                  <button
                                    onClick={() => setMatchWinner(match.id, match.player1!)}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Winner
                                  </button>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-center text-xs text-gray-400">vs</div>
                            
                            <div className={`p-2 rounded border ${
                              match.winner?.id === match.player2?.id 
                                ? 'bg-green-50 border-green-300 dark:bg-green-900/20 dark:border-green-600' 
                                : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    {match.player2 ? (match.player2.fullName || match.player2.name) : 'TBD'}
                                </span>
                                {isEventCreator && match.status === 'pending' && match.player1 && match.player2 && (
                                  <button
                                    onClick={() => setMatchWinner(match.id, match.player2!)}
                                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                                  >
                                    Winner
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Registration Modal for Users */}
        {showRegistrationModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
              <div className="text-center">
                <TrophyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Join Tournament
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Are you sure you want to register for this tournament?
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowRegistrationModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={registerForTournament}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Join Tournament
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Delete Tournament Section for Event Creators */}
        {isEventCreator && tournament && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8 border border-red-200 dark:border-red-800">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Danger Zone
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Permanently delete this tournament and all its data. This action cannot be undone.
              </p>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-6 py-3 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 flex items-center justify-center mx-auto"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Tournament
              </button>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border border-red-200 dark:border-red-800">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Tournament
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-2">
                  Are you sure you want to delete this tournament?
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                  This action cannot be undone. All tournament data, matches, and results will be permanently lost.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      deleteTournament();
                    }}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Delete Tournament
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default SingleEliminationTournament;   