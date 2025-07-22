import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tournament, TournamentMatch, tournamentService, TournamentType } from '../services/tournament.service';
import SwissTournamentPairings from '../components/SwissTournamentPairings';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { MatchResultModal } from '../components/MatchResultModal';
import { webSocketService } from '../services/websocket.service';

export const SwissMatchResultsPage: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(null);
  const [showResultModal, setShowResultModal] = useState(false);

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId]);

  // WebSocket effect for real-time match updates
  useEffect(() => {
    if (tournamentId && tournament) {
      // Join both tournament room and event room for real-time updates
      console.log('🔗 Joining WebSocket rooms:', {
        tournamentId,
        eventId: tournament.eventId?.toString(),
        userId: user?.id
      });
      webSocketService.joinTournament(tournamentId);
      if (tournament.eventId) {
        webSocketService.joinEventChat(tournament.eventId.toString());
      }
      
      // Listen for tournament updates (includes match result updates)
      webSocketService.onTournamentUpdate((update) => {
        console.log('🔄 Match Results Page - Tournament update received:', update);
        console.log('🔄 Update type:', update.type);
        console.log('🔄 Current user ID:', user?.id);
        console.log('🔄 Tournament ID match:', update.tournamentId === tournamentId);
        
        // Reload tournament data for match-related updates
        if (update.type === 'match-result-submitted' || 
            update.type === 'match-result-confirmed' ||
            update.type === 'match-result-disputed' ||
            update.type === 'match-dispute-resolved' ||
            update.type === 'round-started' ||
            update.type === 'tournament-completed') {
          
          loadTournament();
          
          // Show notification for match result updates involving current user
          if (update.type === 'match-result-submitted') {
            // Check if current user is the opponent who needs to confirm
            const currentMatch = update.match;
            if (currentMatch && user?.id) {
              const isPlayer1 = currentMatch.player1?.id === user.id;
              const isPlayer2 = currentMatch.player2?.id === user.id;
              const isInMatch = isPlayer1 || isPlayer2;
              
              // Check if current user didn't submit the result (i.e., they're the opponent)
              const resultReportedBy = currentMatch.resultReportedBy || [];
              const didNotSubmit = !resultReportedBy.includes(user.id);
              
              if (isInMatch && didNotSubmit) {
                toast.success('🏆 Opponent submitted a match result. Please confirm or dispute it!', {
                  duration: 6000,
                  style: {
                    background: '#10B981',
                    color: 'white',
                  },
                });
              }
            }
          } else if (update.type === 'match-result-confirmed') {
            toast.success('✅ Match result confirmed!');
          } else if (update.type === 'match-result-disputed') {
            toast.info('⚠️ Match result disputed - tournament organizer will resolve.');
          }
        }
      });
      
      // Listen for match-specific updates
      webSocketService.onMatchUpdate((matchUpdate) => {
        console.log('🔄 Match update received:', matchUpdate);
        loadTournament();
      });
      
      // Cleanup on unmount
      return () => {
        webSocketService.leaveTournament(tournamentId);
        if (tournament.eventId) {
          webSocketService.leaveEventChat(tournament.eventId.toString());
        }
        webSocketService.removeTournamentListeners();
      };
    }
  }, [tournamentId, tournament?.eventId, user?.id]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const tournamentData = await tournamentService.getTournament(tournamentId!);
      
      // Verify this is a Swiss tournament
      if (tournamentData.type !== TournamentType.SWISS) {
        setError('This page is only for Swiss tournaments');
        return;
      }
      
      // Debug match statuses
      if (tournamentData.rounds && tournamentData.rounds.length > 0) {
        tournamentData.rounds.forEach((round, roundIndex) => {
          console.log(`🔍 Round ${roundIndex + 1} matches:`, round.matches.map(match => ({
            matchId: match.matchId,
            status: match.status,
            player1: match.player1?.name,
            player2: match.player2?.name,
            resultReportedBy: match.resultReportedBy,
            isUserInMatch: user?.id && (
              match.player1?.id === user.id ||
              match.player2?.id === user.id
            )
          })));
        });
      }
      
      // Debug logging
      console.log('🏆 SwissMatchResultsPage - Tournament loaded:', {
        tournamentId,
        tournamentName: tournamentData.name,
        organizerId: tournamentData.organizerId,
        currentUserId: user?.id,
        isCreator: tournamentData.organizerId === user?.id,
        rounds: tournamentData.rounds?.length || 0,
        totalMatches: tournamentData.rounds?.flatMap(r => r.matches).length || 0,
      });
      
      setTournament(tournamentData);
    } catch (error) {
      console.error('Error loading tournament:', error);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResult = async (match: TournamentMatch, result: 'win' | 'loss' | 'draw') => {
    if (!tournament || !user) return;

    try {
      let winnerId: string | null = null;
      let loserId: string | null = null;
      let isDraw = false;

      if (result === 'draw') {
        isDraw = true;
      } else {
        // Determine winner based on who submitted the result
        const isPlayer1 = match.player1.id === user.id;
        winnerId = result === 'win' ? user.id : (isPlayer1 ? match.player2.id : match.player1.id);
        loserId = result === 'win' ? (isPlayer1 ? match.player2.id : match.player1.id) : user.id;
      }

      await tournamentService.submitMatchResult(tournament.id, match.matchId, winnerId, loserId, isDraw);
      toast.success('Match result submitted successfully!');
      loadTournament(); // Refresh tournament data
    } catch (error) {
      console.error('Error submitting match result:', error);
      toast.error('Failed to submit match result');
    }
  };

  const openMatchResultModal = (match: TournamentMatch) => {
    setSelectedMatch(match);
    setShowResultModal(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">
            {error || 'Tournament not found'}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const allMatches = tournament.rounds?.flatMap(round => round.matches) || [];
  const userMatches = allMatches.filter(match => 
    match.player1.id === user?.id || match.player2.id === user?.id
  );

  // Check if user is actually registered in the tournament
  const isUserRegistered = tournament.players.some(player => player.id === user?.id);
  
  if (!isUserRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">
            Access Denied
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You are not registered for this tournament and cannot submit match results.
          </p>
          <button
            onClick={() => navigate(`/tournament/swiss/${tournamentId}`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            View Tournament
          </button>
        </div>
      </div>
    );
  }

  // Check if user has byes in any round
  const userByes = tournament.rounds?.flatMap(round => 
    (round.byePlayers || []).filter(player => player.id === user?.id)
  ) || [];
  
  // Get user's tournament standing
  const userPlayer = tournament.players.find(p => p.id === user?.id);
  const pendingMatches = userMatches.filter(match => match.status === 'pending');
  const submittedMatches = userMatches.filter(match => match.status === 'submitted');
  const disputedMatches = userMatches.filter(match => match.status === 'disputed');
  const completedMatches = userMatches.filter(match => match.status === 'completed' || match.status === 'forfeit');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Your Match Results
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {tournament.name} • Swiss Tournament
            </p>
          </div>
        </div>

        {/* Tournament Matches */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                <div>Submit your match results or confirm your opponent's submissions</div>
                <div>You can declare draws (0.5 points each)</div>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-8">
                {tournament.rounds
                  .filter(round => round.roundNumber === tournament.currentRound)
                  .map((round, index) => {
                  // Check if user has a match in this round
                  const userMatchInRound = round.matches.find(match => 
                    match.player1.id === user?.id || match.player2.id === user?.id
                  );
                  
                  // Check if user has a bye in this round
                  const userByeInRound = (round.byePlayers || []).find(player => 
                    player.id === user?.id
                  );

                  return (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Round {round.roundNumber || index + 1} of {tournament.numRounds || 3}
                        <span className="ml-2 text-sm font-normal text-blue-600">Current Round</span>
                      </h3>
                      
                      {userMatchInRound ? (
                        // User has a match in this round
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {userMatchInRound.player1.id === user?.id ? userMatchInRound.player1.name : userMatchInRound.player2.name}
                              </span>
                              <span className="text-gray-500">VS</span>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {userMatchInRound.player1.id === user?.id ? userMatchInRound.player2.name : userMatchInRound.player1.name}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                userMatchInRound.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                userMatchInRound.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {userMatchInRound.status === 'pending' ? 'Pending' :
                                 userMatchInRound.status === 'completed' ? 'Completed' :
                                 userMatchInRound.status}
                              </span>
                            </div>
                            {userMatchInRound.status === 'pending' && (
                              <button
                                onClick={() => openMatchResultModal(userMatchInRound)}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                              >
                                Report Result
                              </button>
                            )}
                          </div>
                        </div>
                      ) : userByeInRound ? (
                        // User has a bye in this round
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-sm font-bold">★</span>
                              </div>
                              <div>
                                <p className="font-medium text-blue-900 dark:text-blue-100">
                                  You received a bye this round!
                                </p>
                                <p className="text-sm text-blue-700 dark:text-blue-300">
                                  You automatically receive 1 point and advance to the next round.
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-blue-600">+1 Point</div>
                              <div className="text-xs text-blue-500">Bye Award</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        // User not in this round (shouldn't happen in Swiss)
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                          <p className="text-gray-600 dark:text-gray-400 text-center">
                            You are not scheduled to play in this round.
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        {/* Current Standings Table */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Current Tournament Standings
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Swiss tournament standings after {tournament.rounds.filter(r => r.isComplete).length} completed rounds
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Player
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Points
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Wins
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Buchholz
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                  {tournament.players
                    .map(player => {
                      // Calculate actual points from completed matches
                      let actualPoints = 0;
                      let actualWins = 0;
                      
                      tournament.rounds.forEach(round => {
                        if (round.isComplete) {
                          // Check if player had a match
                          const playerMatch = round.matches.find(match => 
                            match.player1.id === player.id || match.player2.id === player.id
                          );
                          
                          if (playerMatch && playerMatch.status === 'completed') {
                            if (playerMatch.isDraw || playerMatch.result === 'draw') {
                              actualPoints += 0.5;
                            } else if (playerMatch.winnerId === player.id) {
                              actualPoints += 1;
                              actualWins += 1;
                            }
                          }
                          
                          // Check if player had a bye
                          const hadBye = round.byePlayers?.some(byePlayer => byePlayer.id === player.id);
                          if (hadBye) {
                            actualPoints += 1;
                          }
                        }
                      });
                      
                      return {
                        ...player,
                        actualPoints,
                        actualWins
                      };
                    })
                    .sort((a, b) => {
                      // Sort by actual points (highest first)
                      const pointsDiff = (b.actualPoints || 0) - (a.actualPoints || 0);
                      if (pointsDiff !== 0) return pointsDiff;
                      
                      // Then by Buchholz score
                      const buchholzDiff = (b.buchholzScore || 0) - (a.buchholzScore || 0);
                      if (buchholzDiff !== 0) return buchholzDiff;
                      
                      // Then by actual wins
                      const winsDiff = (b.actualWins || 0) - (a.actualWins || 0);
                      if (winsDiff !== 0) return winsDiff;
                      
                      // Finally by name
                      return (a.name || '').localeCompare(b.name || '');
                    })
                    .map((player, index) => {
                      const isCurrentUser = player.id === user?.id;
                      return (
                        <tr 
                          key={player.id} 
                          className={`${
                            isCurrentUser 
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-400 dark:border-blue-600 rounded-lg' 
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {isCurrentUser && (
                              <div className="flex items-center">
                                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-2">
                                  {index + 1}
                                </span>
                                <span className="text-blue-600 font-semibold">YOU</span>
                              </div>
                            )}
                            {!isCurrentUser && (
                              <span className="text-gray-600 dark:text-gray-300">#{index + 1}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div>
                                <div className={`text-sm font-medium ${
                                  isCurrentUser 
                                    ? 'text-blue-900 dark:text-blue-100' 
                                    : 'text-gray-900 dark:text-white'
                                }`}>
                                  {player.name}
                                  {isCurrentUser && (
                                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                                      You
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {player.isGuest ? 'Guest Player' : 'Registered User'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <span className={`font-semibold ${
                              isCurrentUser ? 'text-blue-600' : ''
                            }`}>
                              {player.actualPoints || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <span className={`${
                              isCurrentUser ? 'text-blue-600 font-semibold' : ''
                            }`}>
                              {player.actualWins || 0}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            <span className={`${
                              isCurrentUser ? 'text-blue-600 font-semibold' : ''
                            }`}>
                              {player.buchholzScore || 0}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Current Round Pairings */}
        {tournament.rounds.find(r => r.roundNumber === tournament.currentRound) && (
          <div className="mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Round {tournament.currentRound} Pairings
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Current round matches and bye assignments
                </p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tournament.rounds
                    .find(r => r.roundNumber === tournament.currentRound)
                    ?.matches.map((match, index) => {
                      const getMatchStatusColor = () => {
                        switch (match.status) {
                          case 'completed': 
                            return 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-700';
                          case 'submitted': 
                            return 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
                          case 'disputed': 
                            return 'bg-red-50/80 dark:bg-red-900/20 border-red-300 dark:border-red-700';
                          case 'pending': 
                            return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
                          case 'forfeit': 
                            return 'bg-orange-50/80 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700';
                          default: 
                            return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
                        }
                      };

                      const isDraw = match.isDraw || match.result?.isDraw;
                      const isUserMatch = match.player1.id === user?.id || match.player2.id === user?.id;

                      return (
                        <div 
                          key={match.matchId} 
                          className={`border-2 rounded-lg p-4 m-2 backdrop-blur-sm ${getMatchStatusColor()} transition-colors duration-200 ${
                            isUserMatch ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''
                          }`}
                        >
                          <div className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                            {match.status === 'completed' && (
                              <span className="text-gray-600 dark:text-gray-400">Match {index + 1} Complete</span>
                            )}
                            {match.status !== 'completed' && (
                              <span className="text-gray-600 dark:text-gray-400">Match {index + 1}</span>
                            )}
                          </div>
                          
                          {/* Players */}
                          <div className="space-y-2">
                            <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                              match.winnerId === match.player1.id 
                                ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
                                : isDraw 
                                ? 'bg-blue-100 dark:bg-blue-800/50 border border-blue-300 dark:border-blue-600'
                                : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
                            }`}>
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900 dark:text-white">{match.player1.name}</span>
                                {match.winnerId === match.player1.id && (
                                  <span className="ml-2 text-green-600 dark:text-green-400 text-sm">✓</span>
                                )}
                                {isDraw && match.status === 'completed' && (
                                  <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">0.5</span>
                                )}
                              </div>
                              {match.player1.isGuest && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                  Guest
                                </span>
                              )}
                            </div>
                            
                            <div className="text-center text-gray-500 dark:text-gray-400 font-medium">vs</div>
                            
                            <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                              match.winnerId === match.player2.id 
                                ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
                                : isDraw 
                                ? 'bg-blue-100 dark:bg-blue-800/50 border border-blue-300 dark:border-blue-600'
                                : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
                            }`}>
                              <div className="flex items-center">
                                <span className="font-medium text-gray-900 dark:text-white">{match.player2.name}</span>
                                {match.winnerId === match.player2.id && (
                                  <span className="ml-2 text-green-600 dark:text-green-400 text-sm">✓</span>
                                )}
                                {isDraw && match.status === 'completed' && (
                                  <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">0.5</span>
                                )}
                              </div>
                              {match.player2.isGuest && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                  Guest
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Match Status */}
                          <div className="mt-4">
                            {match.status === 'completed' && (
                              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                <div className="flex items-center justify-center text-green-700 dark:text-green-300">
                                  <span className="text-sm font-medium">
                                    {isDraw ? 'Draw' : match.winnerId === match.player1.id ? `${match.player1.name} Won` : `${match.player2.name} Won`}
                                  </span>
                                </div>
                              </div>
                            )}

                            {match.status === 'pending' && (
                              <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
                                  Not Started
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  
                  {/* Show bye players */}
                  {tournament.rounds
                    .find(r => r.roundNumber === tournament.currentRound)
                    ?.byePlayers?.map((player) => (
                      <div 
                        key={player.id} 
                        className={`border-2 border-dashed border-yellow-400 dark:border-yellow-500 rounded-lg p-4 m-2 backdrop-blur-sm bg-yellow-50/60 dark:bg-yellow-900/20 transition-colors duration-200 ${
                          player.id === user?.id ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''
                        }`}
                      >
                        <div className="text-sm font-semibold mb-3 text-yellow-700 dark:text-yellow-400">
                          Bye - Auto Advance
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-100/80 dark:bg-yellow-800/40 border border-yellow-300 dark:border-yellow-600">
                            <div className="flex items-center">
                              <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                              <span className="ml-2 text-yellow-600 dark:text-yellow-400 text-sm">✓ Gets 1 Point</span>
                            </div>
                            {player.isGuest && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                Guest
                              </span>
                            )}
                          </div>
                          
                          <div className="text-center text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                            No opponent - automatic 1 point
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* All Rounds History */}
        <div className="mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-600">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                All Tournament Rounds
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Complete history of all rounds and pairings
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {tournament.rounds
                  .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0))
                  .map((round, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          Round {round.roundNumber || index + 1} of {tournament.numRounds || 3}
                        </h3>
                        <div className="flex items-center space-x-2">
                          {round.roundNumber === tournament.currentRound && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-200">
                              Current Round
                            </span>
                          )}
                          {round.isComplete && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
                              Completed
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {round.matches.map((match, matchIndex) => {
                          const getMatchStatusColor = () => {
                            switch (match.status) {
                              case 'completed': 
                                return 'bg-green-50/80 dark:bg-green-900/20 border-green-300 dark:border-green-700';
                              case 'pending': 
                                return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
                              default: 
                                return 'bg-gray-50/80 dark:bg-gray-900/20 border-gray-300 dark:border-gray-700';
                            }
                          };

                          const isDraw = match.isDraw || match.result === 'draw';
                          const isUserMatch = match.player1.id === user?.id || match.player2.id === user?.id;

                          return (
                            <div 
                              key={match.matchId} 
                              className={`border-2 rounded-lg p-4 backdrop-blur-sm ${getMatchStatusColor()} transition-colors duration-200 ${
                                isUserMatch ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''
                              }`}
                            >
                              <div className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                                {match.status === 'completed' && (
                                  <span className="text-gray-600 dark:text-gray-400">Match {matchIndex + 1} Complete</span>
                                )}
                                {match.status !== 'completed' && (
                                  <span className="text-gray-600 dark:text-gray-400">Match {matchIndex + 1}</span>
                                )}
                              </div>
                              
                              {/* Players */}
                              <div className="space-y-2">
                                <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                                  match.winnerId === match.player1.id 
                                    ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
                                    : isDraw 
                                    ? 'bg-blue-100 dark:bg-blue-800/50 border border-blue-300 dark:border-blue-600'
                                    : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
                                }`}>
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900 dark:text-white">{match.player1.name}</span>
                                    {match.winnerId === match.player1.id && (
                                      <span className="ml-2 text-green-600 dark:text-green-400 text-sm">✓</span>
                                    )}
                                    {isDraw && match.status === 'completed' && (
                                      <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">0.5</span>
                                    )}
                                  </div>
                                  {match.player1.isGuest && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                      Guest
                                    </span>
                                  )}
                                </div>
                                
                                <div className="text-center text-gray-500 dark:text-gray-400 font-medium">vs</div>
                                
                                <div className={`flex justify-between items-center p-3 rounded-lg transition-colors ${
                                  match.winnerId === match.player2.id 
                                    ? 'bg-green-100 dark:bg-green-800/50 border border-green-300 dark:border-green-600' 
                                    : isDraw 
                                    ? 'bg-blue-100 dark:bg-blue-800/50 border border-blue-300 dark:border-blue-600'
                                    : 'bg-white/60 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-600'
                                }`}>
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-900 dark:text-white">{match.player2.name}</span>
                                    {match.winnerId === match.player2.id && (
                                      <span className="ml-2 text-green-600 dark:text-green-400 text-sm">✓</span>
                                    )}
                                    {isDraw && match.status === 'completed' && (
                                      <span className="ml-2 text-blue-600 dark:text-blue-400 text-sm">0.5</span>
                                    )}
                                  </div>
                                  {match.player2.isGuest && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                      Guest
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Match Status */}
                              <div className="mt-4">
                                {match.status === 'completed' && (
                                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                                    <div className="flex items-center justify-center text-green-700 dark:text-green-300">
                                      <span className="text-sm font-medium">
                                        {isDraw ? 'Draw' : match.winnerId === match.player1.id ? `${match.player1.name} Won` : `${match.player2.name} Won`}
                                      </span>
                                    </div>
                                  </div>
                                )}

                                {match.status === 'pending' && (
                                  <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                                    <div className="text-center text-gray-600 dark:text-gray-400 text-sm">
                                      Not Started
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Show bye players for this round */}
                        {round.byePlayers?.map((player) => (
                          <div 
                            key={player.id} 
                            className={`border-2 border-dashed border-yellow-400 dark:border-yellow-500 rounded-lg p-4 backdrop-blur-sm bg-yellow-50/60 dark:bg-yellow-900/20 transition-colors duration-200 ${
                              player.id === user?.id ? 'ring-2 ring-blue-400 dark:ring-blue-600' : ''
                            }`}
                          >
                            <div className="text-sm font-semibold mb-3 text-yellow-700 dark:text-yellow-400">
                              Bye - Auto Advance
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-100/80 dark:bg-yellow-800/40 border border-yellow-300 dark:border-yellow-600">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-900 dark:text-white">{player.name}</span>
                                  <span className="ml-2 text-yellow-600 dark:text-yellow-400 text-sm">✓ Gets 1 Point</span>
                                </div>
                                {player.isGuest && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                                    Guest
                                  </span>
                                )}
                              </div>
                              
                              <div className="text-center text-yellow-600 dark:text-yellow-400 font-medium text-sm">
                                No opponent - automatic 1 point
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedMatch && (
        <MatchResultModal
          isOpen={showResultModal}
          onClose={() => {
            setShowResultModal(false);
            setSelectedMatch(null);
          }}
          match={selectedMatch}
          currentUserId={user?.id || ''}
          isCreator={tournament?.organizerId === user?.id}
          onSubmitResult={async (winnerId, loserId, isDraw, notes) => {
            if (!tournament) return;
            console.log('Submitting match result:', { winnerId, loserId, isDraw, notes });
            await tournamentService.submitMatchResult(tournament.id, selectedMatch.matchId, winnerId, loserId, isDraw, notes);
            toast.success('Match result submitted successfully!');
            loadTournament();
            setShowResultModal(false);
          }}
          onConfirmResult={async () => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.confirmMatchResult(tournament.id, selectedMatch.matchId);
            toast.success('Match result confirmed!');
            loadTournament();
            setShowResultModal(false);
          }}
          onDisputeResult={async (reason) => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.disputeMatchResult(tournament.id, selectedMatch.matchId, reason);
            toast.success('Match result disputed');
            loadTournament();
            setShowResultModal(false);
          }}
          onResolveDispute={async (winnerId, loserId, isDraw, notes) => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.resolveMatchDispute(tournament.id, selectedMatch.matchId, winnerId, loserId, isDraw, notes);
            toast.success('Dispute resolved');
            loadTournament();
            setShowResultModal(false);
          }}
          onForfeit={async (forfeitingPlayerId) => {
            if (!tournament || !selectedMatch) return;
            await tournamentService.forfeitMatch(tournament.id, selectedMatch.matchId, forfeitingPlayerId);
            toast.success('Match forfeited');
            loadTournament();
            setShowResultModal(false);
          }}
          isSingleElimination={false}
        />
      )}
    </div>
  );
};

export default SwissMatchResultsPage; 