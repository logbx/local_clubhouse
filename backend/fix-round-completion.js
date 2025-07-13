const { MongoClient, ObjectId } = require('mongodb');

async function fixRoundCompletion() {
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
    
    console.log('Fixing round completion status...');
    
    // Fix each round's completion status
    tournament.rounds.forEach(round => {
      const finalStatuses = ['completed', 'forfeit'];
      const allMatchesComplete = round.matches.every(m => finalStatuses.includes(m.status));
      
      console.log(`Round ${round.roundNumber}: ${round.matches.length} matches, ${round.matches.filter(m => m.status === 'completed').length} completed, should be complete: ${allMatchesComplete}`);
      
      if (allMatchesComplete && !round.isComplete) {
        console.log(`  -> Marking Round ${round.roundNumber} as complete`);
        round.isComplete = true;
      }
    });
    
    // Update the tournament
    await tournaments.replaceOne({ _id: new ObjectId('686e86464db16ff93bb56240') }, tournament);
    
    console.log('Tournament updated successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

fixRoundCompletion().catch(console.error);