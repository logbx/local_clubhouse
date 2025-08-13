import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tournament, ITournament, TournamentType } from '../../models/tournament.model';

export class NumRoundsRepairService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<ITournament>
  ) {}

  async repairCorruptedNumRounds(): Promise<void> {
    console.log('🔧 Starting Swiss tournament numRounds corruption repair...');
    console.log('=' .repeat(60));

    try {
      // Find all Swiss tournaments
      const swissTournaments = await this.tournamentModel.find({
        type: TournamentType.SWISS
      }).exec();

      console.log(`📊 Found ${swissTournaments.length} Swiss tournaments to analyze`);

      let corruptedCount = 0;
      let repairedCount = 0;
      const repairLog: Array<{
        id: string;
        name: string;
        originalNumRounds: number | undefined;
        calculatedNumRounds: number;
        playersCount: number;
        status: 'corrupted' | 'valid' | 'repaired' | 'error';
      }> = [];

      for (const tournament of swissTournaments) {
        const logEntry = {
          id: tournament._id.toString(),
          name: tournament.name,
          originalNumRounds: tournament.numRounds,
          calculatedNumRounds: 0,
          playersCount: tournament.players.length,
          status: 'valid' as 'corrupted' | 'valid' | 'repaired' | 'error'
        };

        try {
          // Calculate appropriate numRounds based on player count
          const playerCount = tournament.players.length || tournament.maxPlayers || 8;
          const calculatedNumRounds = Math.max(4, Math.ceil(Math.log2(playerCount)));
          logEntry.calculatedNumRounds = calculatedNumRounds;

          // Check if numRounds is corrupted
          const isCorrupted = !tournament.numRounds || tournament.numRounds < 2;
          
          if (isCorrupted) {
            corruptedCount++;
            logEntry.status = 'corrupted';
            
            console.log(`❌ CORRUPTED: ${tournament.name} (${tournament._id})`);
            console.log(`   Original numRounds: ${tournament.numRounds}`);
            console.log(`   Players: ${playerCount}`);
            console.log(`   Calculated numRounds: ${calculatedNumRounds}`);

            // Repair the tournament
            const updateResult = await this.tournamentModel.updateOne(
              { _id: tournament._id },
              { 
                $set: { 
                  numRounds: calculatedNumRounds,
                  // Also ensure currentRound is valid
                  currentRound: Math.max(0, tournament.currentRound || 0)
                }
              }
            );

            if (updateResult.modifiedCount > 0) {
              repairedCount++;
              logEntry.status = 'repaired';
              console.log(`   ✅ REPAIRED: numRounds set to ${calculatedNumRounds}`);
            } else {
              logEntry.status = 'error';
              console.log(`   ❌ REPAIR FAILED: Could not update tournament`);
            }
          } else {
            // Tournament is valid, but let's verify the numRounds makes sense
            if (tournament.numRounds < calculatedNumRounds - 2 || tournament.numRounds > calculatedNumRounds + 3) {
              console.log(`⚠️  SUSPICIOUS: ${tournament.name} has numRounds=${tournament.numRounds} but calculated=${calculatedNumRounds}`);
              console.log(`   This might be intentional, leaving unchanged`);
            }
            logEntry.status = 'valid';
          }

          repairLog.push(logEntry);

        } catch (error) {
          console.error(`❌ Error processing tournament ${tournament._id}:`, error);
          logEntry.status = 'error';
          repairLog.push(logEntry);
        }
      }

      // Summary Report
      console.log('\n🏆 REPAIR SUMMARY');
      console.log('=' .repeat(60));
      console.log(`Total Swiss Tournaments: ${swissTournaments.length}`);
      console.log(`Corrupted Tournaments: ${corruptedCount}`);
      console.log(`Successfully Repaired: ${repairedCount}`);
      console.log(`Valid Tournaments: ${repairLog.filter(t => t.status === 'valid').length}`);
      console.log(`Errors: ${repairLog.filter(t => t.status === 'error').length}`);

      // Detailed Log
      console.log('\n📋 DETAILED REPAIR LOG');
      console.log('-'.repeat(60));
      repairLog.forEach(entry => {
        const statusIcon = {
          'corrupted': '❌',
          'valid': '✅',
          'repaired': '🔧',
          'error': '💥'
        }[entry.status];

        console.log(`${statusIcon} ${entry.name}`);
        console.log(`   ID: ${entry.id}`);
        console.log(`   Original numRounds: ${entry.originalNumRounds || 'undefined'}`);
        console.log(`   Calculated numRounds: ${entry.calculatedNumRounds}`);
        console.log(`   Players: ${entry.playersCount}`);
        console.log(`   Status: ${entry.status.toUpperCase()}`);
        console.log('');
      });

      if (repairedCount > 0) {
        console.log(`✅ Successfully repaired ${repairedCount} corrupted Swiss tournaments!`);
      } else {
        console.log(`✅ No corrupted tournaments found - all Swiss tournaments are valid!`);
      }

    } catch (error) {
      console.error('💥 Critical error during repair process:', error);
      throw error;
    }
  }

  async validateAllSwissTournaments(): Promise<boolean> {
    console.log('\n🔍 VALIDATING ALL SWISS TOURNAMENTS');
    console.log('-'.repeat(60));

    const swissTournaments = await this.tournamentModel.find({
      type: TournamentType.SWISS
    }).exec();

    let allValid = true;
    
    for (const tournament of swissTournaments) {
      if (!tournament.numRounds || tournament.numRounds < 1) {
        console.log(`❌ INVALID: ${tournament.name} has numRounds=${tournament.numRounds}`);
        allValid = false;
      }
    }

    if (allValid) {
      console.log('✅ All Swiss tournaments have valid numRounds!');
    }

    return allValid;
  }
}

// Standalone script runner
async function runRepair() {
  console.log('🚀 Starting Swiss Tournament numRounds Repair Script');
  console.log('Timestamp:', new Date().toISOString());
  console.log('');

  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const repairService = app.get(NumRoundsRepairService);

    // Run the repair
    await repairService.repairCorruptedNumRounds();

    // Validate all tournaments are fixed
    console.log('\n🔍 Post-repair validation...');
    const allValid = await repairService.validateAllSwissTournaments();

    if (allValid) {
      console.log('\n🎉 SUCCESS: All Swiss tournaments now have valid numRounds!');
    } else {
      console.log('\n⚠️  WARNING: Some tournaments still have issues');
    }

    await app.close();
    process.exit(0);

  } catch (error) {
    console.error('💥 FATAL ERROR:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runRepair();
}

export { runRepair };