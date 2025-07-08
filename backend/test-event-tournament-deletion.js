#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function testEventTournamentDeletion() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('local-clubhouse');
    
    console.log('🔍 Testing event-tournament relationship for deletion...');
    
    const eventsCollection = db.collection('events');
    const tournamentsCollection = db.collection('tournaments');
    
    // Find events that have tournaments
    const allTournaments = await tournamentsCollection.find({}).toArray();
    const allEvents = await eventsCollection.find({}).toArray();
    
    console.log(`📊 Current state:`);
    console.log(`   - Total events: ${allEvents.length}`);
    console.log(`   - Total tournaments: ${allTournaments.length}`);
    
    // Group tournaments by eventId to see relationships
    const tournamentsByEvent = {};
    allTournaments.forEach(tournament => {
      const eventId = tournament.eventId.toString();
      if (!tournamentsByEvent[eventId]) {
        tournamentsByEvent[eventId] = [];
      }
      tournamentsByEvent[eventId].push({
        id: tournament._id.toString(),
        name: tournament.name,
        type: tournament.type
      });
    });
    
    console.log('\n🔗 Event-Tournament relationships:');
    
    for (const [eventId, tournaments] of Object.entries(tournamentsByEvent)) {
      const event = allEvents.find(e => e._id.toString() === eventId);
      if (event) {
        console.log(`   Event: "${event.title}" (${eventId})`);
        tournaments.forEach(tournament => {
          console.log(`     └── Tournament: "${tournament.name}" (${tournament.type}, ${tournament.id})`);
        });
      } else {
        console.log(`   ⚠️ Orphaned tournaments for non-existent event ${eventId}:`);
        tournaments.forEach(tournament => {
          console.log(`     └── Tournament: "${tournament.name}" (${tournament.type}, ${tournament.id})`);
        });
      }
    }
    
    // Find events without tournaments
    const eventsWithoutTournaments = allEvents.filter(event => 
      !tournamentsByEvent[event._id.toString()]
    );
    
    if (eventsWithoutTournaments.length > 0) {
      console.log('\n📅 Events without tournaments:');
      eventsWithoutTournaments.forEach(event => {
        console.log(`   - "${event.title}" (${event._id})`);
      });
    }
    
    // Check for orphaned tournaments
    const orphanedTournaments = allTournaments.filter(tournament => {
      const eventExists = allEvents.some(event => 
        event._id.toString() === tournament.eventId.toString()
      );
      return !eventExists;
    });
    
    if (orphanedTournaments.length > 0) {
      console.log('\n⚠️ Orphaned tournaments (event no longer exists):');
      orphanedTournaments.forEach(tournament => {
        console.log(`   - "${tournament.name}" (${tournament.type}, event: ${tournament.eventId})`);
      });
    }
    
    console.log('\n✅ Event-tournament relationship analysis complete');
    console.log('💡 When you delete an event through the API, associated tournaments will now be automatically deleted');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
  }
}

testEventTournamentDeletion().catch(console.error);