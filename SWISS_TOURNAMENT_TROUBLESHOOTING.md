# Swiss Tournament Troubleshooting Guide

## Common Issues and Solutions

### 1. 400 Bad Request Errors When Submitting Match Results

**Symptoms:**
- Error message: `POST http://localhost:3001/api/tournaments/submit-result 400 (Bad Request)`
- Match results don't save
- Tournament doesn't progress to next round

**Common Causes and Solutions:**

#### A. Tournament Not Found
- **Issue**: Using an old tournament ID that no longer exists
- **Solution**: Create a new tournament for testing
- **Check**: Look in browser console for `Tournament not found` message

#### B. Match Already Completed
- **Issue**: Trying to submit results for a match that's already been completed
- **Solution**: 
  - Only submit results for pending matches
  - Organizers can override completed matches using the override function
- **Check**: Match status should be "pending" before submission

#### C. Invalid Match ID
- **Issue**: The match ID doesn't exist in the tournament
- **Solution**: Ensure you're submitting results for matches in the current round
- **Check**: Browser console will show "Match not found" with available match IDs

#### D. Authorization Issues
- **Issue**: User is not authorized to submit results
- **Solution**:
  - Tournament organizer can submit any match result
  - Players can only submit their own match results
  - For guest-only matches, only organizer can submit

### 2. Debugging Steps

1. **Enable Enhanced Logging** (Already added):
   - Frontend logs the request payload
   - Backend logs validation steps
   - Check browser console and backend terminal

2. **Check Browser Console**:
   ```
   📤 Submitting match result: {
     tournamentId: "...",
     matchId: "...",
     winnerId: "...",
     loserId: null,
     result: "win",
     isDraw: false
   }
   ```

3. **Check Backend Terminal**:
   ```
   🎯 submitMatchResult called with: { ... }
   ✅ Tournament found: { ... }
   🔍 Looking for match: ...
   ✅ Match found in round X
   ```

### 3. Proper Testing Procedure

To avoid these errors, follow this sequence:

1. **Create Fresh Tournament**:
   - Don't reuse old tournament IDs
   - Create new event → new tournament → add players

2. **Verify Tournament State**:
   - Ensure tournament is started
   - Check current round number
   - Verify matches are in "pending" status

3. **Submit Results Correctly**:
   - For wins: Specify winnerId and loserId
   - For draws: Set isDraw=true, winnerId=null, loserId=null
   - Submit all matches in current round before expecting next round

4. **Monitor Round Progression**:
   - After all matches complete, next round should auto-generate
   - Check if tournament.isFinished after final round

### 4. Quick Fixes

**If you get repeated 400 errors:**

1. **Refresh the page** to get latest tournament state
2. **Create a new tournament** instead of reusing old one
3. **Clear browser cache** if state seems stuck
4. **Restart backend** if changes aren't reflected

### 5. Backend Validation Rules

The backend validates:
- Tournament exists and is started
- Match exists in the tournament
- Match is in allowed status (pending/submitted for Swiss)
- User is authorized (organizer or player in match)
- For guest matches, special rules apply

### 6. Testing Checklist

- [ ] Created new tournament (not reusing old ID)
- [ ] Tournament is started
- [ ] Matches show as "pending"
- [ ] Submitting as organizer or player in match
- [ ] Correct data format (winnerId/loserId for wins, isDraw for draws)
- [ ] All matches in round completed before expecting next round

## Enhanced Error Messages

With the updated code, you'll see more detailed error messages:
- "Tournament not found" - Create new tournament
- "Match not found" - Check match ID is correct
- "Match result has already been completed" - Can't resubmit
- "Only players in the match or the organizer can submit results" - Authorization issue

These messages will appear in the browser console error response.