import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tournament, ITournament, TournamentType } from '../../models/tournament.model';
import { Cron, CronExpression } from '@nestjs/schedule';

interface IntegrityViolation {
  tournamentId: string;
  tournamentName: string;
  violationType: 'missing_numrounds' | 'invalid_numrounds' | 'currentround_mismatch' | 'data_inconsistency';
  details: any;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface TournamentIntegrityReport {
  timestamp: Date;
  totalTournaments: number;
  swissTournaments: number;
  violations: IntegrityViolation[];
  healthScore: number; // 0-100, percentage of healthy tournaments
}

@Injectable()
export class TournamentIntegrityMonitor {
  private readonly logger = new Logger(TournamentIntegrityMonitor.name);
  private lastReport: TournamentIntegrityReport | null = null;

  constructor(
    @InjectModel(Tournament.name) private tournamentModel: Model<ITournament>
  ) {}

  /**
   * Comprehensive integrity check for all tournaments
   */
  async performIntegrityCheck(): Promise<TournamentIntegrityReport> {
    this.logger.log('🔍 Starting tournament integrity check...');
    
    const violations: IntegrityViolation[] = [];
    const timestamp = new Date();

    try {
      // Get all tournaments
      const allTournaments = await this.tournamentModel.find({}).exec();
      const swissTournaments = allTournaments.filter(t => t.type === TournamentType.SWISS);

      this.logger.log(`📊 Checking ${allTournaments.length} tournaments (${swissTournaments.length} Swiss)`);

      // Check Swiss tournament numRounds integrity
      for (const tournament of swissTournaments) {
        await this.checkSwissNumRoundsIntegrity(tournament, violations);
        await this.checkCurrentRoundIntegrity(tournament, violations);
        await this.checkDataConsistency(tournament, violations);
      }

      // Check Single Elimination tournaments for unexpected numRounds
      const seTournaments = allTournaments.filter(t => t.type === TournamentType.SINGLE_ELIMINATION);
      for (const tournament of seTournaments) {
        await this.checkSingleEliminationIntegrity(tournament, violations);
      }

      // Calculate health score
      const healthScore = Math.round(((allTournaments.length - violations.length) / allTournaments.length) * 100);

      const report: TournamentIntegrityReport = {
        timestamp,
        totalTournaments: allTournaments.length,
        swissTournaments: swissTournaments.length,
        violations,
        healthScore
      };

      // Log summary
      this.logIntegrityReport(report);

      // Store for comparison
      this.lastReport = report;

      return report;

    } catch (error) {
      this.logger.error('💥 Error during integrity check:', error);
      throw error;
    }
  }

  private async checkSwissNumRoundsIntegrity(tournament: ITournament, violations: IntegrityViolation[]): Promise<void> {
    // Check for missing numRounds
    if (!tournament.numRounds) {
      violations.push({
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        violationType: 'missing_numrounds',
        details: {
          type: tournament.type,
          numRounds: tournament.numRounds,
          playersCount: tournament.players.length,
          maxPlayers: tournament.maxPlayers
        },
        timestamp: new Date(),
        severity: 'critical'
      });
      return;
    }

    // Check for invalid numRounds values
    if (tournament.numRounds < 2 || tournament.numRounds > 10) {
      violations.push({
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        violationType: 'invalid_numrounds',
        details: {
          numRounds: tournament.numRounds,
          playersCount: tournament.players.length,
          expectedMinRounds: 2,
          expectedMaxRounds: 10
        },
        timestamp: new Date(),
        severity: 'high'
      });
    }

    // Check if numRounds makes sense for player count
    const playerCount = tournament.players.length || tournament.maxPlayers;
    const suggestedNumRounds = Math.max(4, Math.ceil(Math.log2(playerCount)));
    
    if (tournament.numRounds < suggestedNumRounds - 2 || tournament.numRounds > suggestedNumRounds + 3) {
      violations.push({
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        violationType: 'data_inconsistency',
        details: {
          actualNumRounds: tournament.numRounds,
          suggestedNumRounds,
          playerCount,
          deviation: Math.abs(tournament.numRounds - suggestedNumRounds),
          reason: 'numRounds significantly different from player-count-based calculation'
        },
        timestamp: new Date(),
        severity: 'medium'
      });
    }
  }

  private async checkCurrentRoundIntegrity(tournament: ITournament, violations: IntegrityViolation[]): Promise<void> {
    if (!tournament.numRounds) return; // Skip if numRounds is already flagged

    // Check if currentRound is within valid range
    if (tournament.currentRound > tournament.numRounds) {
      violations.push({
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        violationType: 'currentround_mismatch',
        details: {
          currentRound: tournament.currentRound,
          numRounds: tournament.numRounds,
          actualRoundsLength: tournament.rounds.length,
          reason: 'currentRound exceeds numRounds'
        },
        timestamp: new Date(),
        severity: 'high'
      });
    }

    // Check if rounds array length matches numRounds progression
    if (tournament.isStarted && tournament.rounds.length > tournament.numRounds) {
      violations.push({
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        violationType: 'data_inconsistency',
        details: {
          actualRoundsLength: tournament.rounds.length,
          numRounds: tournament.numRounds,
          reason: 'More rounds exist than numRounds allows'
        },
        timestamp: new Date(),
        severity: 'high'
      });
    }
  }

  private async checkSingleEliminationIntegrity(tournament: ITournament, violations: IntegrityViolation[]): Promise<void> {
    // Single Elimination tournaments shouldn't have numRounds set explicitly
    // (it's calculated automatically)
    if (tournament.numRounds && tournament.numRounds !== Math.ceil(Math.log2(tournament.maxPlayers))) {
      const expectedRounds = Math.ceil(Math.log2(tournament.maxPlayers));
      violations.push({
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        violationType: 'data_inconsistency',
        details: {
          type: 'single_elimination',
          actualNumRounds: tournament.numRounds,
          expectedNumRounds: expectedRounds,
          maxPlayers: tournament.maxPlayers,
          reason: 'Single Elimination numRounds should be calculated from maxPlayers'
        },
        timestamp: new Date(),
        severity: 'low'
      });
    }
  }

  private async checkDataConsistency(tournament: ITournament, violations: IntegrityViolation[]): Promise<void> {
    // Check for general data consistency issues
    const issues: string[] = [];

    // Check if tournament is marked as started but has no rounds
    if (tournament.isStarted && tournament.rounds.length === 0) {
      issues.push('Tournament marked as started but has no rounds');
    }

    // Check if tournament is marked as finished but not all rounds are complete
    if (tournament.isFinished && tournament.rounds.length > 0) {
      const lastRound = tournament.rounds[tournament.rounds.length - 1];
      if (!lastRound.isComplete) {
        issues.push('Tournament marked as finished but last round is not complete');
      }
    }

    // Check if winner is set but tournament is not finished
    if (tournament.winnerId && !tournament.isFinished) {
      issues.push('Winner set but tournament not marked as finished');
    }

    if (issues.length > 0) {
      violations.push({
        tournamentId: tournament._id.toString(),
        tournamentName: tournament.name,
        violationType: 'data_inconsistency',
        details: {
          issues,
          isStarted: tournament.isStarted,
          isFinished: tournament.isFinished,
          roundsCount: tournament.rounds.length,
          winnerId: tournament.winnerId
        },
        timestamp: new Date(),
        severity: 'medium'
      });
    }
  }

  private logIntegrityReport(report: TournamentIntegrityReport): void {
    const criticalViolations = report.violations.filter(v => v.severity === 'critical');
    const highViolations = report.violations.filter(v => v.severity === 'high');
    const mediumViolations = report.violations.filter(v => v.severity === 'medium');
    const lowViolations = report.violations.filter(v => v.severity === 'low');

    this.logger.log(`📊 TOURNAMENT INTEGRITY REPORT - ${report.timestamp.toISOString()}`);
    this.logger.log(`🏆 Total Tournaments: ${report.totalTournaments}`);
    this.logger.log(`🇨🇭 Swiss Tournaments: ${report.swissTournaments}`);
    this.logger.log(`💚 Health Score: ${report.healthScore}%`);
    this.logger.log(`⚠️  Total Violations: ${report.violations.length}`);

    if (criticalViolations.length > 0) {
      this.logger.error(`🚨 CRITICAL Violations: ${criticalViolations.length}`);
      criticalViolations.forEach(v => {
        this.logger.error(`   💥 ${v.tournamentName}: ${v.violationType}`, v.details);
      });
    }

    if (highViolations.length > 0) {
      this.logger.warn(`🔥 HIGH Violations: ${highViolations.length}`);
      highViolations.forEach(v => {
        this.logger.warn(`   ⚠️  ${v.tournamentName}: ${v.violationType}`, v.details);
      });
    }

    if (mediumViolations.length > 0) {
      this.logger.warn(`📢 MEDIUM Violations: ${mediumViolations.length}`);
    }

    if (lowViolations.length > 0) {
      this.logger.log(`ℹ️  LOW Violations: ${lowViolations.length}`);
    }

    // Alert if health score drops below threshold
    if (report.healthScore < 95) {
      this.logger.error(`🚨 HEALTH ALERT: Tournament health score (${report.healthScore}%) is below 95%!`);
    }
  }

  /**
   * Scheduled integrity check - runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async scheduledIntegrityCheck(): Promise<void> {
    try {
      this.logger.log('⏰ Running scheduled tournament integrity check...');
      const report = await this.performIntegrityCheck();
      
      // Compare with last report to detect new issues
      if (this.lastReport) {
        const newViolations = report.violations.filter(v => 
          !this.lastReport!.violations.some(lv => 
            lv.tournamentId === v.tournamentId && lv.violationType === v.violationType
          )
        );
        
        if (newViolations.length > 0) {
          this.logger.error(`🚨 NEW INTEGRITY VIOLATIONS DETECTED: ${newViolations.length}`);
          newViolations.forEach(v => {
            this.logger.error(`   🆕 ${v.tournamentName}: ${v.violationType}`, v.details);
          });
        }
      }
      
    } catch (error) {
      this.logger.error('💥 Scheduled integrity check failed:', error);
    }
  }

  /**
   * Log tournament access for debugging corruption
   */
  logTournamentAccess(tournamentId: string, operation: string, details: any = {}): void {
    this.logger.debug(`🔍 TOURNAMENT ACCESS: ${tournamentId}`, {
      operation,
      timestamp: new Date().toISOString(),
      ...details
    });
  }

  /**
   * Log potential corruption event
   */
  logPotentialCorruption(tournamentId: string, field: string, oldValue: any, newValue: any, stackTrace?: string): void {
    this.logger.error(`🚨 POTENTIAL CORRUPTION DETECTED: ${tournamentId}`, {
      field,
      oldValue,
      newValue,
      timestamp: new Date().toISOString(),
      stackTrace: stackTrace || new Error().stack
    });
  }

  /**
   * Get current health status
   */
  getHealthStatus(): { isHealthy: boolean; lastCheck: Date | null; healthScore: number | null } {
    return {
      isHealthy: this.lastReport ? this.lastReport.healthScore >= 95 : true,
      lastCheck: this.lastReport ? this.lastReport.timestamp : null,
      healthScore: this.lastReport ? this.lastReport.healthScore : null
    };
  }
}

export { IntegrityViolation, TournamentIntegrityReport };