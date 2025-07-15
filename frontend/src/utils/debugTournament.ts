// Tournament Creation Debug Utility
import { tournamentService, TournamentType } from '../services/tournament.service';
import { EventFeatures } from '../types/event';

export class TournamentDebugger {
  
  static async testBackendConnection(): Promise<{ success: boolean; message: string; status?: number }> {
    try {
      const response = await fetch('http://localhost:3001/api/health/status');
      const data = await response.json();
      
      if (response.ok) {
        return {
          success: true,
          message: `✅ Backend is running - ${data.status}`,
          status: response.status
        };
      } else {
        return {
          success: false,
          message: `❌ Backend returned error: ${response.status}`,
          status: response.status
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Cannot connect to backend: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async testAuthentication(): Promise<{ success: boolean; message: string; token?: string }> {
    try {
      const token = localStorage.getItem('accessToken');
      
      if (!token) {
        return {
          success: false,
          message: '❌ No access token found in localStorage'
        };
      }

      const response = await fetch('http://localhost:3001/api/auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return {
          success: true,
          message: '✅ Authentication successful',
          token: token.substring(0, 10) + '...'
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          message: `❌ Authentication failed: ${errorData.message || response.statusText}`,
          token: token.substring(0, 10) + '...'
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `❌ Authentication test error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  static async testTournamentCreation(eventId: string, name?: string): Promise<{ success: boolean; message: string; tournament?: any; error?: any }> {
    try {
      const tournamentName = name || `Test Tournament ${Date.now()}`;
      
      console.log('🧪 Testing tournament creation with:', {
        eventId,
        name: tournamentName,
        maxPlayers: 8,
        type: TournamentType.SINGLE_ELIMINATION
      });

      const tournament = await tournamentService.createTournament(
        eventId,
        tournamentName,
        8,
        TournamentType.SINGLE_ELIMINATION
      );

      return {
        success: true,
        message: `✅ Tournament created successfully: ${tournament.name}`,
        tournament
      };
    } catch (error) {
      return {
        success: false,
        message: `❌ Tournament creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error
      };
    }
  }

  static async fullTournamentFlowTest(eventId: string): Promise<{ 
    backendTest: any; 
    authTest: any; 
    tournamentTest: any; 
    summary: string; 
  }> {
    console.log('🔍 Starting full tournament flow test...');
    
    const backendTest = await this.testBackendConnection();
    console.log('Backend Test:', backendTest);
    
    const authTest = await this.testAuthentication();
    console.log('Auth Test:', authTest);
    
    let tournamentTest = { success: false, message: 'Skipped due to previous failures' };
    if (backendTest.success && authTest.success) {
      tournamentTest = await this.testTournamentCreation(eventId);
      console.log('Tournament Test:', tournamentTest);
    }

    const summary = this.generateSummary(backendTest, authTest, tournamentTest);
    
    return {
      backendTest,
      authTest,
      tournamentTest,
      summary
    };
  }

  private static generateSummary(backendTest: any, authTest: any, tournamentTest: any): string {
    const results = [];
    
    if (!backendTest.success) {
      results.push('🚨 BACKEND ISSUE: The backend server is not responding properly');
    }
    
    if (!authTest.success) {
      results.push('🔐 AUTH ISSUE: User is not properly authenticated');
    }
    
    if (!tournamentTest.success && backendTest.success && authTest.success) {
      results.push('🎯 TOURNAMENT API ISSUE: Tournament creation API is failing');
    }
    
    if (backendTest.success && authTest.success && tournamentTest.success) {
      results.push('✅ ALL TESTS PASSED: Tournament creation flow is working correctly');
    }
    
    return results.join('\n');
  }

  static async debugStuckCreation(eventId: string): Promise<{ backendTest: any; authTest: any; tournamentTest: any; summary: string }> {
    console.log('🔧 Debugging stuck tournament creation...');
    
    // Step 1: Check if user is on the right page
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 EventId:', eventId);
    
    // Step 2: Check form state in DOM
    const form = document.querySelector('form');
    const submitButton = document.querySelector('button[type="submit"]');
    const isCreatingElement = document.querySelector('[data-testid="creating-tournament"]') || 
                            document.querySelector('button:disabled:contains("Creating Tournament")');
    
    console.log('🎯 Form elements:', {
      hasForm: !!form,
      hasSubmitButton: !!submitButton,
      submitButtonDisabled: submitButton?.hasAttribute('disabled'),
      isCreatingIndicator: !!isCreatingElement
    });
    
    // Step 3: Run comprehensive test
    const result = await this.fullTournamentFlowTest(eventId);
    console.log('🎯 Test Results:', result);
    
    // Step 4: Check React state (if possible)
    console.log('💡 To check React component state, open React DevTools and inspect the TournamentCreationForm component');
    
    return result;
  }
}

// Global functions for easy console access
(window as any).debugTournament = TournamentDebugger;
(window as any).testTournamentFlow = (eventId: string) => TournamentDebugger.fullTournamentFlowTest(eventId);
(window as any).debugStuckCreation = (eventId: string) => TournamentDebugger.debugStuckCreation(eventId);
(window as any).testBackend = () => TournamentDebugger.testBackendConnection();
(window as any).testAuth = () => TournamentDebugger.testAuthentication();

console.log('🧪 Tournament Debug Utils Loaded!');
console.log('Available commands:');
console.log('  - testTournamentFlow(eventId) - Run full flow test');
console.log('  - debugStuckCreation(eventId) - Debug stuck creation');
console.log('  - testBackend() - Test backend connection');
console.log('  - testAuth() - Test authentication'); 