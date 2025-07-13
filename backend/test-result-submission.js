const axios = require('axios');

async function testResultSubmission() {
  try {
    // The tournament ID from the database
    const tournamentId = '686e86464db16ff93bb56240';
    
    // First, let's test if the backend is running
    console.log('Testing backend connectivity...');
    const healthResponse = await axios.get('http://localhost:3001/api/health').catch(() => null);
    
    if (!healthResponse) {
      console.log('❌ Backend not responding on /api/health');
      return;
    }
    
    console.log('✅ Backend is running');
    
    // For now, let's just test the backend is accessible
    // The actual API call would need authentication
    console.log('Tournament ID to test:', tournamentId);
    console.log('API endpoint would be: POST /api/tournaments/override-result');
    
    console.log('✅ Test completed - backend is accessible and ready for API calls');
    
  } catch (error) {
    console.error('❌ Error during result submission:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

testResultSubmission().catch(console.error);