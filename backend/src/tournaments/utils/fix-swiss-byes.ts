import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tournament, ITournament } from '../../models/tournament.model';
import { EnhancedSwissPairingService } from './enhanced-swiss-pairings';

/**
 * Utility to fix Swiss tournaments with incorrect bye assignments and Buchholz scores
 */
@Injectable()
export class SwissTournamentFixService {
  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<ITournament>
  ) {}

  /**
   * Fix a specific Swiss tournament by recalculating byes and Buchholz scores
   */
  async fixSwissTournament(tournamentId: string): Promise<void> {
    console.log('🔧 Fixing Swiss tournament:', tournamentId);
    
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    if (tournament.type !== 'swiss') {
      throw new Error(`Tournament ${tournamentId} is not a Swiss tournament`);
    }

    console.log('📊 Tournament before fix:', {
      name: tournament.name,
      players: tournament.players.length,
      rounds: tournament.rounds.length,
      playerStats: tournament.players.map(p => ({
        name: p.name,
        points: p.points || 0,
        wins: p.wins || 0,
        buchholz: p.buchholzScore || 0,
        byes: (p.pastOpponents || []).filter(o => o === 'BYE').length
      }))
    });

    // Recalculate Buchholz scores
    EnhancedSwissPairingService.updateBuchholzScores(tournament.players);

    // Save the updated tournament
    await tournament.save();

    console.log('✅ Tournament fixed:', {
      name: tournament.name,
      playerStats: tournament.players.map(p => ({
        name: p.name,
        points: p.points || 0,
        wins: p.wins || 0,
        buchholz: p.buchholzScore || 0,
        byes: (p.pastOpponents || []).filter(o => o === 'BYE').length
      }))
    });
  }

  /**
   * Analyze a tournament to identify bye assignment issues
   */
  async analyzeTournament(tournamentId: string): Promise<any> {
    const tournament = await this.tournamentModel.findById(tournamentId);
    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    const playerAnalysis = tournament.players.map(player => {
      const byes = (player.pastOpponents || []).filter(o => o === 'BYE').length;
      const actualOpponents = (player.pastOpponents || []).filter(o => o !== 'BYE').length;
      
      return {
        name: player.name,
        points: player.points || 0,
        wins: player.wins || 0,
        buchholz: player.buchholzScore || 0,
        byes,
        actualOpponents,
        totalGames: byes + actualOpponents,
        issues: {
          multipleByes: byes > 1,
          buchholzZero: (player.buchholzScore || 0) === 0 && actualOpponents > 0
        }
      };
    });

    return {
      tournament: {
        name: tournament.name,
        type: tournament.type,
        rounds: tournament.rounds.length,
        players: tournament.players.length,
        isFinished: tournament.isFinished
      },
      playerAnalysis,
      issues: {
        playersWithMultipleByes: playerAnalysis.filter(p => p.issues.multipleByes),
        playersWithZeroBuchholz: playerAnalysis.filter(p => p.issues.buchholzZero)
      }
    };
  }
}