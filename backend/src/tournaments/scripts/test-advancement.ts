/**
 * Test script for tournament advancement logic
 * This script helps test and validate the enhanced tournament advancement logic
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { TournamentsService } from '../tournaments.service';
import { BaseTournamentService } from '../services/base-tournament.service';

async function testTournamentAdvancement() {
  console.log('🚀 Starting tournament advancement test...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const tournamentsService = app.get(TournamentsService);
  const baseTournamentService = app.get(BaseTournamentService);

  try {
    // Get all tournaments that might be stuck
    const mongoose = require('mongoose');
    const Tournament = mongoose.model('Tournament');
    
    console.log('🔍 Finding tournaments to test...');
    const tournaments = await Tournament.find({ 
      isStarted: true,
      isFinished: false
    }).limit(10);

    console.log(`📋 Found ${tournaments.length} active tournaments to check`);

    for (const tournament of tournaments) {
      console.log(`\n🔄 Testing tournament: ${tournament.name} (${tournament.type})`);
      console.log(`   - ID: ${tournament._id}`);
      console.log(`   - Rounds: ${tournament.rounds.length}`);
      console.log(`   - Current Round: ${tournament.currentRound}`);
      
      // Show round status
      for (const round of tournament.rounds) {
        const completedMatches = round.matches.filter(m => ['completed', 'forfeit'].includes(m.status)).length;
        console.log(`   - Round ${round.roundNumber}: ${completedMatches}/${round.matches.length} matches complete, isComplete: ${round.isComplete}`);
      }

      // Try to repair this tournament
      console.log(`🔧 Attempting to repair tournament advancement...`);
      try {
        const repairedTournament = await baseTournamentService.repairTournamentAdvancement(tournament._id.toString());
        console.log(`✅ Repair completed for tournament ${tournament.name}`);
        console.log(`   - Final rounds: ${repairedTournament.rounds.length}`);
        console.log(`   - Is finished: ${repairedTournament.isFinished}`);
        console.log(`   - Winner ID: ${repairedTournament.winnerId}`);
      } catch (error) {
        console.error(`❌ Error repairing tournament ${tournament.name}:`, error.message);
      }
    }

  } catch (error) {
    console.error('❌ Error during tournament advancement test:', error);
  }

  await app.close();
  console.log('✅ Tournament advancement test completed');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testTournamentAdvancement().catch(console.error);
}

export { testTournamentAdvancement };