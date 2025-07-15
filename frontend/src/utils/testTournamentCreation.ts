// Test utility to verify tournament creation flow
import { tournamentService, TournamentType } from '../services/tournament.service';
import { EventFeatures } from '../types/event';

export const testTournamentCreationFlow = async () => {
  console.log('🧪 Testing Tournament Creation Flow...');
  
  // Test data
  const testEventId = 'test-event-' + Date.now();
  const testTournamentName = 'Test Tournament ' + Date.now();
  const testMaxPlayers = 8;
  const testType = TournamentType.SINGLE_ELIMINATION;
  
  try {
    console.log('📝 Creating tournament with:');
    console.log('  - Event ID:', testEventId);
    console.log('  - Name:', testTournamentName);
    console.log('  - Max Players:', testMaxPlayers);
    console.log('  - Type:', testType);
    
    // Test the tournament service directly
    const tournament = await tournamentService.createTournament(
      testEventId,
      testTournamentName,
      testMaxPlayers,
      testType
    );
    
    console.log('✅ Tournament created successfully:', tournament);
    return tournament;
    
  } catch (error: any) {
    console.error('❌ Tournament creation failed:', error);
    console.error('Error details:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw error;
  }
};

export const simulateCreateTournamentButtonClick = (
  eventId: string,
  eventTitle: string,
  eventFeature: EventFeatures,
  navigate: (path: string) => void
) => {
  console.log('🎯 Simulating "Create Tournament" button click...');
  console.log('Event details:', { eventId, eventTitle, eventFeature });
  
  // This simulates the logic from Dashboard.tsx and ClubEventsSection.tsx
  const tournamentType = eventFeature === EventFeatures.SWISS_TOURNAMENT ? 'swiss' : 'single-elimination';
  const creatorId = 'current-user-id'; // In real app, this comes from user context
  
  const navigationUrl = `/tournament/${tournamentType}?eventId=${eventId}&eventTitle=${encodeURIComponent(eventTitle)}&creatorId=${creatorId}&feature=${eventFeature}`;
  
  console.log('🧭 Navigation URL:', navigationUrl);
  console.log('🔗 This should show the TournamentCreationForm for event creators');
  
  // Simulate navigation
  navigate(navigationUrl);
  
  return navigationUrl;
};

// Test function to verify the complete flow
export const verifyTournamentCreationFlow = () => {
  console.log('🔍 Verifying Tournament Creation Flow Connection...');
  
  const steps = [
    '1. User clicks "Create Tournament" button on event card',
    '2. handleCreateTournament() is called with eventId',
    '3. Navigation occurs to /tournament/{type}?eventId=...&eventTitle=...&creatorId=...',
    '4. Tournament page loads and checks if user is event creator',
    '5. If creator: TournamentCreationForm is displayed',
    '6. User fills form (name, maxPlayers, numRounds for Swiss)',
    '7. Form submission calls tournamentService.createTournament()',
    '8. API POST to /api/tournaments/create',
    '9. On success: onTournamentCreated callback is called',
    '10. Navigation to tournament management page'
  ];
  
  console.log('📋 Tournament Creation Flow Steps:');
  steps.forEach(step => console.log(`   ${step}`));
  
  console.log('\n🎯 To test manually:');
  console.log('1. Go to Dashboard or Club Events');
  console.log('2. Find an event you created');
  console.log('3. Click "Create Tournament" button');
  console.log('4. You should see TournamentCreationForm with green success indicator');
  
  return steps;
};

// Make functions available in browser console for testing
if (typeof window !== 'undefined') {
  (window as any).testTournamentCreation = testTournamentCreationFlow;
  (window as any).verifyTournamentFlow = verifyTournamentCreationFlow;
  (window as any).simulateCreateTournament = simulateCreateTournamentButtonClick;
} 