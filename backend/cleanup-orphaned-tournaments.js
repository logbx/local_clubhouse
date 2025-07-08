#!/usr/bin/env node
const { MongoClient } = require('mongodb');

async function cleanupOrphanedTournaments() {
  const client = new MongoClient('mongodb+srv://logan:t61PWkJEcdYDoquy@cluster0.xl3zc.mongodb.net/local-clubhouse?retryWrites=true&w=majority');
  
  try {
    await client.connect();
    const db = client.db('local-clubhouse');
    
    console.log('🧹 Starting cleanup of orphaned tournaments...');
    
    const eventsCollection = db.collection('events');
    const tournamentsCollection = db.collection('tournaments');
    
    // Get all tournaments and events
    const allTournaments = await tournamentsCollection.find({}).toArray();
    const allEvents = await eventsCollection.find({}).toArray();
    
    // Create a set of existing event IDs for fast lookup
    const existingEventIds = new Set(allEvents.map(e => e._id.toString()));
    
    // Find orphaned tournaments
    const orphanedTournaments = allTournaments.filter(tournament => {
      return !existingEventIds.has(tournament.eventId.toString());
    });
    
    console.log(`📊 Analysis:`);
    console.log(`   - Total tournaments: ${allTournaments.length}`);
    console.log(`   - Orphaned tournaments: ${orphanedTournaments.length}`);
    console.log(`   - Valid tournaments: ${allTournaments.length - orphanedTournaments.length}`);
    
    if (orphanedTournaments.length === 0) {
      console.log('✅ No orphaned tournaments to clean up');
      return;
    }
    
    console.log('\n🗑️ Orphaned tournaments to be deleted:');
    orphanedTournaments.forEach((tournament, index) => {
      console.log(`   ${index + 1}. "${tournament.name}" (${tournament.type || 'unknown'}, ID: ${tournament._id})`);
      console.log(`      Missing event ID: ${tournament.eventId}`);
    });
    
    // Delete orphaned tournaments
    const orphanedIds = orphanedTournaments.map(t => t._id);
    const deleteResult = await tournamentsCollection.deleteMany({ 
      _id: { $in: orphanedIds } 
    });
    
    console.log(`\n✅ Cleanup completed:`);
    console.log(`   - Deleted ${deleteResult.deletedCount} orphaned tournaments`);
    console.log(`   - Remaining tournaments: ${allTournaments.length - deleteResult.deletedCount}`);
    
    // Verify the cleanup
    const remainingTournaments = await tournamentsCollection.find({}).toArray();
    const stillOrphaned = remainingTournaments.filter(tournament => {
      return !existingEventIds.has(tournament.eventId.toString());
    });
    
    if (stillOrphaned.length === 0) {
      console.log('🎉 All orphaned tournaments successfully removed!');
    } else {
      console.log(`⚠️ Warning: ${stillOrphaned.length} orphaned tournaments still remain`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  } finally {
    await client.close();
  }
}

cleanupOrphanedTournaments().catch(console.error);