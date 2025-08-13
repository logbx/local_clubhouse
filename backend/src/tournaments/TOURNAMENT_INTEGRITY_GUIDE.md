# Tournament Integrity & numRounds Corruption Fix

This document outlines the comprehensive solution implemented to address and prevent Swiss tournament `numRounds` field corruption.

## Problem Summary

Swiss tournaments were experiencing `numRounds` field corruption, where the value was set to 1 instead of the configured 4+ rounds. This caused tournaments to incorrectly terminate after the first round instead of continuing through all configured rounds.

## Solution Overview

We implemented a **4-layer defense strategy**:

### 🔧 Layer 1: Database Repair Script
### 🛡️ Layer 2: Stronger Validation
### 🔍 Layer 3: Diagnostic Logging
### 📊 Layer 4: Comprehensive Monitoring

---

## Layer 1: Database Repair Script

**File**: `/tournaments/scripts/repair-numrounds-corruption.ts`

### Usage

```bash
# Run the repair script directly
cd backend
npx ts-node src/tournaments/scripts/repair-numrounds-corruption.ts

# Or use via the health endpoint
curl -X POST http://localhost:3000/api/tournaments/health/repair/numrounds \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### What it does

- Scans all Swiss tournaments for corrupted `numRounds` fields
- Calculates appropriate `numRounds` based on player count: `Math.max(4, Math.ceil(Math.log2(playerCount)))`
- Repairs corrupted tournaments automatically
- Provides detailed logging and summary reports
- Validates all tournaments post-repair

### Sample Output

```
🔧 Starting Swiss tournament numRounds corruption repair...
📊 Found 15 Swiss tournaments to analyze
❌ CORRUPTED: Test Tournament (64f5a1b2c3d4e5f6a7b8c9d0)
   Original numRounds: 1
   Players: 8
   Calculated numRounds: 4
   ✅ REPAIRED: numRounds set to 4

🏆 REPAIR SUMMARY
Total Swiss Tournaments: 15
Corrupted Tournaments: 3
Successfully Repaired: 3
Valid Tournaments: 12
✅ Successfully repaired 3 corrupted Swiss tournaments!
```

---

## Layer 2: Stronger Validation

### Database Schema Validation

**File**: `/models/tournament.model.ts`

Enhanced the Mongoose schema with:

```typescript
numRounds: { 
  type: Number, 
  min: 1, 
  max: 10,
  validate: {
    validator: function(this: ITournament, value: number) {
      if (this.type === TournamentType.SWISS) {
        return value && value >= 2 && value <= 10;
      }
      return true;
    },
    message: 'Swiss tournaments must have numRounds between 2 and 10'
  }
}
```

### Pre-save Middleware

Prevents saving tournaments with invalid `numRounds`:

```typescript
TournamentSchema.pre('save', function(next) {
  if (tournament.type === TournamentType.SWISS) {
    if (!tournament.numRounds || tournament.numRounds < 2) {
      return next(new Error(`Swiss tournament must have numRounds >= 2`));
    }
  }
  next();
});
```

### DTO Validation

**File**: `/tournaments/dto/tournament.dto.ts`

```typescript
@ValidateIf(o => o.type === TournamentType.SWISS)
@IsNumber()
@Min(2, { message: 'Swiss tournaments must have at least 2 rounds' })
@Max(10, { message: 'Swiss tournaments cannot have more than 10 rounds' })
numRounds?: number;
```

---

## Layer 3: Diagnostic Logging

### Tournament Access Logging

Every tournament access is now logged:

```typescript
async getTournament(tournamentId: string): Promise<ITournament> {
  console.log('🔍 DIAGNOSTIC - Tournament access:', {
    tournamentId,
    timestamp: new Date().toISOString(),
    operation: 'getTournament'
  });
  
  // Immediate corruption detection
  if (tournament.type === 'swiss' && (!tournament.numRounds || tournament.numRounds < 2)) {
    console.error('🚨 CORRUPTION DETECTED on tournament load:', {
      tournamentId,
      numRounds: tournament.numRounds,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Strategic Logging

**File**: `/tournaments/strategies/swiss-tournament.strategy.ts`

Enhanced checkAdvancement with detailed logging:

```typescript
console.log('🔍 DIAGNOSTIC - Tournament state on advancement check:', {
  tournamentId: tournament._id,
  numRounds: tournament.numRounds,
  currentRound: tournament.currentRound,
  timestamp: new Date().toISOString(),
  stackTrace: new Error('Stack trace for debugging').stack
});
```

---

## Layer 4: Comprehensive Monitoring

### Tournament Integrity Monitor

**File**: `/tournaments/monitoring/tournament-integrity-monitor.ts`

#### Features

- **Automated Integrity Checks**: Runs hourly via `@Cron`
- **Violation Detection**: Identifies multiple types of corruption
- **Health Scoring**: 0-100% health score for tournament system
- **Trend Analysis**: Compares reports to detect new issues

#### Violation Types

1. **`missing_numrounds`** (Critical): Swiss tournaments without `numRounds`
2. **`invalid_numrounds`** (High): `numRounds < 2` or `> 10`
3. **`currentround_mismatch`** (High): `currentRound > numRounds`
4. **`data_inconsistency`** (Medium): Various data inconsistencies

#### Usage

```typescript
// Inject the monitor
constructor(private integrityMonitor: TournamentIntegrityMonitor) {}

// Run integrity check
const report = await this.integrityMonitor.performIntegrityCheck();
```

### Health Endpoints

**File**: `/tournaments/monitoring/tournament-health-endpoint.ts`

#### Available Endpoints

```bash
# Get current health status
GET /api/tournaments/health/status

# Run comprehensive integrity check
POST /api/tournaments/health/check

# Get violations with filtering
GET /api/tournaments/health/violations?severity=critical&type=missing_numrounds

# Repair corrupted numRounds
POST /api/tournaments/health/repair/numrounds

# Get specific tournament health
GET /api/tournaments/health/tournament/:tournamentId

# Get monitoring statistics
GET /api/tournaments/health/stats

# Quick health check (minimal logging)
GET /api/tournaments/health/quick-check
```

#### Sample Health Response

```json
{
  "success": true,
  "data": {
    "overview": {
      "totalTournaments": 45,
      "swissTournaments": 23,
      "healthScore": 97,
      "totalViolations": 1
    },
    "violationsByType": {
      "data_inconsistency": 1
    },
    "violationsBySeverity": {
      "critical": 0,
      "high": 0,
      "medium": 1,
      "low": 0
    }
  }
}
```

---

## Integration & Setup

### 1. Add to Main Module

**File**: `/app.module.ts`

```typescript
import { TournamentMonitoringModule } from './tournaments/monitoring/tournament-monitoring.module';

@Module({
  imports: [
    // ... other imports
    TournamentMonitoringModule
  ]
})
export class AppModule {}
```

### 2. Install Dependencies

```bash
npm install @nestjs/schedule
```

### 3. Environment Setup

No additional environment variables needed. The monitoring system uses existing database connections.

---

## Operational Guide

### Daily Operations

1. **Check Health Status**
   ```bash
   curl GET /api/tournaments/health/status
   ```

2. **Review Violations**
   ```bash
   curl GET /api/tournaments/health/violations?severity=critical
   ```

### Emergency Procedures

1. **Immediate Corruption Fix**
   ```bash
   curl -X POST /api/tournaments/health/repair/numrounds
   ```

2. **Quick System Check**
   ```bash
   curl GET /api/tournaments/health/quick-check
   ```

### Monitoring Setup

The system automatically:
- ✅ Runs integrity checks every hour
- ✅ Logs new violations immediately
- ✅ Prevents saving corrupted tournaments
- ✅ Provides diagnostic information for debugging

### Alerts & Notifications

The system logs warnings when:
- Health score drops below 95%
- New critical violations are detected
- Corruption is detected during tournament access
- Invalid data is prevented from being saved

---

## Testing the Solution

### 1. Create Test Tournament

```bash
curl -X POST /api/tournaments/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Test Swiss Tournament",
    "eventId": "YOUR_EVENT_ID",
    "maxPlayers": 16,
    "type": "swiss",
    "numRounds": 5
  }'
```

### 2. Verify Integrity

```bash
curl GET /api/tournaments/health/tournament/TOURNAMENT_ID
```

### 3. Test Corruption Prevention

Try creating invalid tournament (should fail):

```bash
curl -X POST /api/tournaments/create \
  -d '{"numRounds": 1, "type": "swiss", ...}' # Should fail validation
```

---

## Benefits of This Solution

### ✅ **Immediate Benefits**

- **Corruption Fixed**: Existing corrupted tournaments are repaired
- **Prevention**: New corruption is prevented by validation layers
- **Visibility**: Clear visibility into tournament health status
- **Automation**: Automated monitoring and alerting

### ✅ **Long-term Benefits**

- **Proactive Monitoring**: Issues detected before they affect users
- **Data Integrity**: Multiple validation layers ensure data consistency
- **Debugging Support**: Comprehensive logging aids in troubleshooting
- **Scalability**: Monitoring system scales with tournament growth

### ✅ **Developer Benefits**

- **Clear APIs**: Easy-to-use endpoints for health monitoring
- **Diagnostic Tools**: Rich logging and tracing capabilities
- **Automated Repair**: One-click repair functionality
- **Documentation**: Comprehensive documentation and examples

---

## Maintenance

### Log Management

The diagnostic logging is extensive. Consider:

1. **Log Rotation**: Implement log rotation for diagnostic logs
2. **Log Levels**: Adjust log levels in production (reduce DEBUG logs)
3. **Monitoring Integration**: Integrate with monitoring systems (DataDog, New Relic, etc.)

### Performance Considerations

- Integrity checks run hourly (configurable via cron expression)
- Quick health checks are optimized for performance
- Diagnostic logging can be disabled in production if needed

### Future Enhancements

1. **Historical Reporting**: Store integrity reports for trend analysis
2. **Alerting Integration**: Add Slack/email notifications for critical issues
3. **Dashboard**: Create admin dashboard for tournament health
4. **Automated Repair**: Automatic repair of certain violation types

---

## Conclusion

This comprehensive solution addresses the Swiss tournament `numRounds` corruption from multiple angles:

1. **Fixes existing problems** with the repair script
2. **Prevents future problems** with stronger validation
3. **Detects problems early** with diagnostic logging
4. **Monitors system health** with automated integrity checks

The tournament system is now robust, monitored, and self-healing, ensuring Swiss tournaments will advance through all configured rounds as intended.

---

**Need Help?**

- Check the health endpoints for current system status
- Review logs for diagnostic information
- Run the repair script if corruption is detected
- Contact the development team for additional support