const { MongoClient, ObjectId } = require('mongodb');

async function testTournamentStatus() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    const tournaments = db.collection('tournaments');
    
    // Get the tournament
    const tournament = await tournaments.findOne({ _id: new ObjectId('686e86464db16ff93bb56240') });
    
    if (!tournament) {
      console.log('Tournament not found');
      return;
    }
    
    console.log('Tournament status:');
    console.log('- Name:', tournament.name);
    console.log('- Type:', tournament.type);
    console.log('- Is Started:', tournament.isStarted);
    console.log('- Is Finished:', tournament.isFinished);
    console.log('- Total Rounds:', tournament.rounds.length);
    
    tournament.rounds.forEach((round, index) => {
      console.log(`\nRound ${round.roundNumber}:`);
      console.log('  - Is Complete:', round.isComplete);
      console.log('  - Match Count:', round.matches.length);
      console.log('  - Completed Matches:', round.matches.filter(m => m.status === 'completed').length);
      console.log('  - Match Statuses:', round.matches.map(m => m.status));
      
      if (round.byePlayers && round.byePlayers.length > 0) {
        console.log('  - Bye Players:', round.byePlayers.map(p => p.name));
      }
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testTournamentStatus().catch(console.error);