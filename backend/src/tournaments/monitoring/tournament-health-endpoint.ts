import { Controller, Get, Post, UseGuards, Query, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TournamentIntegrityMonitor, TournamentIntegrityReport } from './tournament-integrity-monitor';
import { NumRoundsRepairService } from '../scripts/repair-numrounds-corruption';

@Controller('tournaments/health')
@UseGuards(JwtAuthGuard)
export class TournamentHealthController {
  constructor(
    private readonly integrityMonitor: TournamentIntegrityMonitor,
    private readonly repairService: NumRoundsRepairService
  ) {}

  /**
   * Get current tournament health status
   */
  @Get('status')
  async getHealthStatus() {
    const status = this.integrityMonitor.getHealthStatus();
    return {
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Run a comprehensive integrity check
   */
  @Post('check')
  async runIntegrityCheck(): Promise<{ success: boolean; data: TournamentIntegrityReport }> {
    const report = await this.integrityMonitor.performIntegrityCheck();
    return {
      success: true,
      data: report
    };
  }

  /**
   * Get integrity violations with filtering
   */
  @Get('violations')
  async getViolations(
    @Query('severity') severity?: 'low' | 'medium' | 'high' | 'critical',
    @Query('type') type?: string
  ) {
    const report = await this.integrityMonitor.performIntegrityCheck();
    
    let violations = report.violations;
    
    if (severity) {
      violations = violations.filter(v => v.severity === severity);
    }
    
    if (type) {
      violations = violations.filter(v => v.violationType === type);
    }
    
    return {
      success: true,
      data: {
        totalViolations: report.violations.length,
        filteredViolations: violations.length,
        violations: violations,
        healthScore: report.healthScore
      }
    };
  }

  /**
   * Repair corrupted numRounds fields
   */
  @Post('repair/numrounds')
  async repairNumRounds() {
    try {
      await this.repairService.repairCorruptedNumRounds();
      
      // Run integrity check after repair
      const postRepairReport = await this.integrityMonitor.performIntegrityCheck();
      
      return {
        success: true,
        message: 'NumRounds repair completed',
        data: {
          postRepairHealthScore: postRepairReport.healthScore,
          remainingViolations: postRepairReport.violations.length
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Repair failed',
        error: error.message
      };
    }
  }

  /**
   * Get detailed tournament health information
   */
  @Get('tournament/:tournamentId')
  async getTournamentHealth(@Param('tournamentId') tournamentId: string) {
    // This would require extending the integrity monitor to check specific tournaments
    // For now, we'll run a full check and filter
    const report = await this.integrityMonitor.performIntegrityCheck();
    const tournamentViolations = report.violations.filter(v => v.tournamentId === tournamentId);
    
    return {
      success: true,
      data: {
        tournamentId,
        violations: tournamentViolations,
        isHealthy: tournamentViolations.length === 0,
        checkTimestamp: report.timestamp
      }
    };
  }

  /**
   * Get monitoring statistics
   */
  @Get('stats')
  async getMonitoringStats() {
    const report = await this.integrityMonitor.performIntegrityCheck();
    
    const stats = {
      overview: {
        totalTournaments: report.totalTournaments,
        swissTournaments: report.swissTournaments,
        healthScore: report.healthScore,
        totalViolations: report.violations.length
      },
      violationsByType: {} as Record<string, number>,
      violationsBySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      trends: {
        // This would be enhanced with historical data
        lastCheckTime: report.timestamp,
        isImproving: null // Would compare with previous reports
      }
    };
    
    // Count violations by type
    report.violations.forEach(violation => {
      stats.violationsByType[violation.violationType] = 
        (stats.violationsByType[violation.violationType] || 0) + 1;
      stats.violationsBySeverity[violation.severity]++;
    });
    
    return {
      success: true,
      data: stats
    };
  }

  /**
   * Emergency health check - minimal logging for performance
   */
  @Get('quick-check')
  async quickHealthCheck() {
    try {
      // Just check critical issues quickly
      const swissTournamentsWithoutNumRounds = await this.repairService['tournamentModel']
        .countDocuments({
          type: 'swiss',
          $or: [
            { numRounds: { $exists: false } },
            { numRounds: { $lt: 2 } }
          ]
        });

      const isHealthy = swissTournamentsWithoutNumRounds === 0;
      
      return {
        success: true,
        data: {
          isHealthy,
          criticalIssues: swissTournamentsWithoutNumRounds,
          message: isHealthy 
            ? 'All Swiss tournaments have valid numRounds' 
            : `${swissTournamentsWithoutNumRounds} Swiss tournaments have corrupted numRounds`,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Quick health check failed',
        error: error.message
      };
    }
  }
}