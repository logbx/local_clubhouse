import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TournamentType, TournamentPlayer, TournamentMatch, TournamentRound } from '../services/tournament.service';
import type { Tournament } from '../services/tournament.service';
import { tournamentService } from '../services/tournament.service';
import { TrophyIcon, UserPlusIcon, PlayIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { log, LogCategory } from '../utils/logger';

const SwissTournamentAdmin: React.FC = () => {
  const { tournamentId } = useParams<{ tournamentId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tournamentId) {
      loadTournament();
    }
  }, [tournamentId]);

  const loadTournament = async () => {
    try {
      setLoading(true);
      const tournamentData = await tournamentService.getTournament(tournamentId!);
      setTournament(tournamentData);
      setError(null);
    } catch (err) {
      console.error('Error loading tournament:', err);
      setError('Failed to load tournament');
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async () => {
    if (!tournament || !playerName.trim()) return;

    try {
      await tournamentService.addGuestPlayer(tournament.id, playerName.trim());
      setPlayerName('');
      loadTournament();
    } catch (err) {
      setError('Failed to add player');
      console.error(err);
    }
  };

  const removePlayer = async (playerId: string) => {
    if (!tournament) return;

    try {
      await tournamentService.removePlayer(tournament.id, playerId);
      loadTournament();
    } catch (err) {
      setError('Failed to remove player');
      console.error(err);
    }
  };

  const startTournament = async () => {
    if (!tournament) return;

    try {
      await tournamentService.startTournament(tournament.id);
      loadTournament();
    } catch (err) {
      setError('Failed to start tournament');
      console.error(err);
    }
  };

  const startNextRound = async () => {
    if (!tournament) return;

    try {
      await tournamentService.startNextRound(tournament.id);
      loadTournament();
    } catch (err) {
      setError('Failed to start next round');
      console.error(err);
    }
  };

  const submitMatchResult = async (matchId: string, winnerId: string | null, isDraw: boolean = false) => {
    if (!tournament) return;

    try {
      if (isDraw) {
        await tournamentService.submitMatchResult(tournament.id, matchId, null, true);
      } else if (winnerId) {
        await tournamentService.submitMatchResult(tournament.id, matchId, winnerId, false);
      }
      loadTournament();
    } catch (err) {
      setError('Failed to submit match result');
      console.error(err);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">Loading...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">Tournament not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {tournament.name} - Admin Panel
          </h1>
          <div className="flex items-center space-x-4">
            {!tournament.isStarted && (
              <button
                onClick={startTournament}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
              >
                <PlayIcon className="h-5 w-5 mr-2" />
                Start Tournament
              </button>
            )}
          </div>
        </div>

        {/* Player Management Section */}
        {!tournament.isStarted && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Player Management
            </h2>
            <div className="flex items-center space-x-4 mb-6">
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter player name"
                className="flex-1 rounded-lg border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
              <button
                onClick={addPlayer}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Add Player
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tournament.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <span className="text-gray-900 dark:text-white">{player.name}</span>
                  <button
                    onClick={() => removePlayer(player.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tournament Progress Section */}
        {tournament.isStarted && !tournament.isFinished && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Round {tournament.currentRound || 1} of {tournament.numRounds || 3}
              </h2>
              <button
                onClick={startNextRound}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Start Next Round
              </button>
            </div>
            <div className="space-y-6">
              {tournament.rounds
                .filter((round) => round.roundNumber === (tournament.currentRound || 1))
                .map((round) => (
                  round.matches.map((match) => (
                    <div
                      key={match.matchId}
                      className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-center">
                          {match.player1?.name || 'TBD'}
                        </div>
                        <div className="mx-4 text-gray-500 dark:text-gray-400">vs</div>
                        <div className="flex-1 text-center">
                          {match.player2?.name || 'TBD'}
                        </div>
                      </div>
                      {match.status === 'pending' && match.player1 && match.player2 && (
                        <div className="mt-4 flex justify-center space-x-4">
                          <button
                            onClick={() => submitMatchResult(match.matchId, match.player1.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            {match.player1.name} Wins
                          </button>
                          <button
                            onClick={() => submitMatchResult(match.matchId, null, true)}
                            className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Draw
                          </button>
                          <button
                            onClick={() => submitMatchResult(match.matchId, match.player2.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            {match.player2.name} Wins
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                ))}
            </div>
          </div>
        )}

        {/* Standings Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Tournament Standings
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b dark:border-gray-700">
                  <th className="pb-2">Player</th>
                  <th className="pb-2">Score</th>
                  <th className="pb-2">Matches Played</th>
                </tr>
              </thead>
              <tbody>
                {tournament.players
                  .sort((a, b) => (b.points || 0) - (a.points || 0))
                  .map((player) => (
                    <tr key={player.id} className="border-b dark:border-gray-700">
                      <td className="py-2">{player.name}</td>
                      <td className="py-2">{player.points || 0}</td>
                      <td className="py-2">{player.pastOpponents?.length || 0}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwissTournamentAdmin; 