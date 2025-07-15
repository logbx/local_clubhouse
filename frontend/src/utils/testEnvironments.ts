// Environment Testing Utility for Tournament Creation
import { log, LogCategory } from './logger';

export class EnvironmentTester {
  
  static async testCurrentEnvironment(): Promise<void> {
    const isDev = import.meta.env.DEV;
    const apiUrl = import.meta.env.VITE_API_URL;
    const wsUrl = import.meta.env.VITE_WS_URL;
    const mode = import.meta.env.MODE;
    
    console.log('🧪 Environment Test Results:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔧 Environment: ${isDev ? 'Development' : 'Production'}`);
    console.log(`⚙️  Mode: ${mode}`);
    console.log(`🌐 API URL: ${apiUrl || 'Not set (using default)'}`);
    console.log(`🔌 WebSocket URL: ${wsUrl || 'Not set (using default)'}`);
    console.log(`📍 Current Location: ${window.location.href}`);
    
    // Test API connectivity
    try {
      const apiBaseUrl = apiUrl || 'https://localclubhouse.com';
      console.log(`\n🏥 Testing API connectivity to: ${apiBaseUrl}`);
      
      const response = await fetch(`${apiBaseUrl}/api/health/status`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API Health Check: PASSED');
        console.log(`📊 Backend Status: ${data.status}`);
        console.log(`⏰ Backend Uptime: ${Math.round(data.uptime)}s`);
      } else {
        console.log(`❌ API Health Check: FAILED (${response.status})`);
      }
    } catch (error) {
      console.log(`❌ API Health Check: FAILED (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
    
    // Test authentication endpoint
    try {
      const token = localStorage.getItem('accessToken');
      if (token) {
        const apiBaseUrl = apiUrl || 'https://localclubhouse.com';
        const authResponse = await fetch(`${apiBaseUrl}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (authResponse.ok) {
          console.log('✅ Authentication: VALID');
        } else {
          console.log(`❌ Authentication: INVALID (${authResponse.status})`);
        }
      } else {
        console.log('⚠️  Authentication: NO TOKEN FOUND');
      }
    } catch (error) {
      console.log(`❌ Authentication Test: FAILED (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
  
  static async testTournamentCreationFlow(eventId: string): Promise<void> {
    console.log('🏆 Testing Tournament Creation Flow:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Step 1: Environment check
    await this.testCurrentEnvironment();
    
    // Step 2: Check if we're on the right page
    const currentUrl = window.location.href;
    const isTournamentPage = currentUrl.includes('/tournament/');
    
    console.log(`\n📍 Page Check:`);
    console.log(`Current URL: ${currentUrl}`);
    console.log(`On Tournament Page: ${isTournamentPage ? '✅ YES' : '❌ NO'}`);
    
    // Step 3: Check for form elements
    const formExists = document.querySelector('form') !== null;
    const nameInput = document.querySelector('input[name="name"]') as HTMLInputElement;
    const maxPlayersSelect = document.querySelector('select') as HTMLSelectElement;
    const submitButton = document.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    console.log(`\n🎯 Form Elements Check:`);
    console.log(`Form exists: ${formExists ? '✅' : '❌'}`);
    console.log(`Tournament name field: ${nameInput ? '✅' : '❌'}`);
    console.log(`Max players field: ${maxPlayersSelect ? '✅' : '❌'}`);
    console.log(`Submit button: ${submitButton ? '✅' : '❌'}`);
    
    if (nameInput) {
      console.log(`Name field value: "${nameInput.value}"`);
    }
    if (maxPlayersSelect) {
      console.log(`Max players value: ${maxPlayersSelect.value}`);
    }
    if (submitButton) {
      console.log(`Submit button disabled: ${submitButton.disabled ? '❌ YES' : '✅ NO'}`);
      console.log(`Submit button text: "${submitButton.textContent}"`);
    }
    
    // Step 4: Check event ID
    console.log(`\n🎫 Event Information:`);
    console.log(`Event ID: ${eventId}`);
    console.log(`Event ID valid: ${eventId && eventId !== 'undefined' ? '✅' : '❌'}`);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// Make functions available globally for console testing
declare global {
  interface Window {
    testEnvironment: () => Promise<void>;
    testTournamentFlow: (eventId: string) => Promise<void>;
  }
}

window.testEnvironment = EnvironmentTester.testCurrentEnvironment;
window.testTournamentFlow = EnvironmentTester.testTournamentCreationFlow;

console.log('🧪 Environment Testing Utils Loaded!');
console.log('Available commands:');
console.log('  - testEnvironment() - Test current environment setup');
console.log('  - testTournamentFlow(eventId) - Test tournament creation for specific event'); 