import React, { useState } from 'react';
import { tournamentService, TournamentType } from '../services/tournament.service';
import { EventFeatures } from '../types/event';
import { log, LogCategory } from '../utils/logger';

interface TournamentCreationFormProps {
  eventId: string;
  eventFeature: EventFeatures;
  onTournamentCreated: (tournament: any) => void;
  defaultName?: string;
}

const TournamentCreationForm: React.FC<TournamentCreationFormProps> = ({ eventId, eventFeature, onTournamentCreated, defaultName = '' }) => {
  const [name, setName] = useState(defaultName);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [numRounds, setNumRounds] = useState(3);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Tournament name is required');
      return;
    }

    const type = eventFeature === EventFeatures.SWISS_TOURNAMENT 
      ? TournamentType.SWISS 
      : TournamentType.SINGLE_ELIMINATION;

    if (type === TournamentType.SWISS && (numRounds < 1 || numRounds > 10)) {
      setError('Number of rounds must be between 1 and 10');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);
      
      log.info(LogCategory.TOURNAMENT, 'Creating tournament', {
        eventId,
        name: name.trim(),
        maxPlayers,
        type,
        numRounds: type === TournamentType.SWISS ? numRounds : undefined
      });

      const tournament = await tournamentService.createTournament(
        eventId,
        name.trim(),
        maxPlayers,
        type,
        type === TournamentType.SWISS ? numRounds : undefined // Only send numRounds for Swiss tournaments
      );

      log.info(LogCategory.TOURNAMENT, 'Tournament created successfully');
      onTournamentCreated(tournament);
    } catch (err: any) {
      log.error(LogCategory.TOURNAMENT, 'Failed to create tournament', err);
      // Check for specific error about draft event
      if (err?.response?.data?.message?.includes('draft event')) {
        setError('Cannot create tournament for a draft event. Please publish the event first.');
      } else {
        setError('Failed to create tournament. Please try again.');
      }
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Tournament Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
          placeholder="Enter tournament name"
        />
      </div>

      <div>
        <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Maximum Players
        </label>
        <select
          id="maxPlayers"
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
        >
          {[4, 8, 16, 32, 64].map((num) => (
            <option key={num} value={num}>
              {num} Players
            </option>
          ))}
        </select>
      </div>

      {eventFeature === EventFeatures.SWISS_TOURNAMENT && (
        <div>
          <label htmlFor="numRounds" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Number of Rounds
          </label>
          <select
            id="numRounds"
            value={numRounds}
            onChange={(e) => setNumRounds(Number(e.target.value))}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white sm:text-sm"
          >
            {[...Array(10)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                {i + 1} Round{i === 0 ? '' : 's'}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        type="submit"
        disabled={isCreating}
        className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
          isCreating
            ? 'bg-blue-400 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        }`}
      >
        {isCreating ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Tournament...
          </>
        ) : (
          'Create Tournament'
        )}
      </button>
    </form>
  );
};

export default TournamentCreationForm; 