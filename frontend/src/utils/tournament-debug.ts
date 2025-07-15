import { tournamentService, TournamentType } from '../services/tournament.service';
import { log, LogCategory } from './logger';

interface TournamentTestConfig {
  eventId: string;
  eventTitle: string;
  maxPlayers?: number;
}

/**
 * Debug utility for testing tournament creation
 * This helps diagnose 404 and other API issues
 */
export class TournamentDebugger {
  static async testTournamentCreation(config: TournamentTestConfig) {
    const { eventId, eventTitle, maxPlayers = 8 } = config;
    
    log.info(LogCategory.TOURNAMENT, '🧪 Starting tournament creation test', {
      eventId,
      eventTitle,
      maxPlayers,
      timestamp: new Date().toISOString()
    });

    // Step 1: Check authentication
    const token = localStorage.getItem('accessToken');
    if (!token) {
      log.error(LogCategory.TOURNAMENT, '❌ No auth token found');
      throw new Error('Authentication required');
    }
    log.info(LogCategory.TOURNAMENT, '✅ Auth token found');

    // Step 2: Check API base URL
    const apiBase = import.meta.env.VITE_API_URL || 'https://localclubhouse.com';
    log.info(LogCategory.TOURNAMENT, '🌐 API Configuration', { apiBase });

    // Step 3: Test network connectivity
    try {
      const healthResponse = await fetch(`${apiBase}/api/health`);
      if (healthResponse.ok) {
        log.info(LogCategory.TOURNAMENT, '✅ Backend health check passed');
      } else {
        log.warn(LogCategory.TOURNAMENT, '⚠️ Backend health check failed', { 
          status: healthResponse.status 
        });
      }
    } catch (error) {
      log.error(LogCategory.TOURNAMENT, '❌ Backend unreachable', error);
      throw new Error('Backend server is not accessible');
    }

    // Step 4: Attempt tournament creation
    try {
      const tournamentName = `${eventTitle} Tournament`;
      const result = await tournamentService.createTournament(eventId, tournamentName, maxPlayers, TournamentType.SINGLE_ELIMINATION);
      
      log.info(LogCategory.TOURNAMENT, '🎉 Tournament creation successful!', result);
      return result;
    } catch (error: any) {
      log.error(LogCategory.TOURNAMENT, '💥 Tournament creation failed', {
        error: error.message,
        status: error?.response?.status,
        data: error?.response?.data
      });
      throw error;
    }
  }

  /**
   * Run basic connectivity tests
   */
  static async runConnectivityTests() {
    const apiBase = import.meta.env.VITE_API_URL || 'https://localclubhouse.com';
    
    const tests = [
      { name: 'Health Check', url: `${apiBase}/api/health` },
      { name: 'Tournament Routes', url: `${apiBase}/api/tournaments/test` }, // This will 404, but that's expected
    ];

    for (const test of tests) {
      try {
        const response = await fetch(test.url);
        log.info(LogCategory.TOURNAMENT, `📡 ${test.name}`, {
          url: test.url,
          status: response.status,
          ok: response.ok
        });
      } catch (error) {
        log.error(LogCategory.TOURNAMENT, `📡 ${test.name} Failed`, {
          url: test.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}

// Console helpers for manual testing
if (typeof window !== 'undefined') {
  (window as any).tournamentDebug = TournamentDebugger;
  log.info(LogCategory.TOURNAMENT, '🔧 Tournament debugger loaded. Use window.tournamentDebug in console.');
} 