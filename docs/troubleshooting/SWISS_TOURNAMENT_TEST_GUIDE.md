# Swiss Tournament Testing Guide

This guide provides step-by-step instructions for testing the Swiss tournament system with 13 players, including auto-bye functionality and various match results.

## Test Objectives

1. **Create a Swiss tournament with 13 players** - Tests odd number handling
2. **Verify automatic bye assignment** - One player should get a bye each round
3. **Test various match results** - Wins, losses, and draws
4. **Verify automatic round generation** - Rounds should auto-generate after all matches complete
5. **Check standings calculation** - Points, wins, and Buchholz scores

## Step-by-Step Testing Instructions

### 1. Setup and Login

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open browser to `http://localhost:5173`

4. Login with test credentials:
   - Email: `test@localclubhouse.com`
   - Password: `Test123!`

### 2. Create Event and Tournament

1. Navigate to **Create Event** page
2. Fill in event details:
   - Name: "Swiss Tournament Test Event"
   - Date: Tomorrow's date
   - Time: Any time
   - Location: "Test Location"
   - Category: Sports
   - Max Attendees: 50

3. After creating the event, click on it to view details
4. Click **"Create Tournament"** button
5. Fill in tournament details:
   - Name: "Swiss 13 Players Test"
   - Type: **Swiss**
   - Max Players: 16
   - Number of Rounds: **4**

### 3. Add 13 Players

1. As the organizer, you're automatically added
2. Add 12 guest players:
   - Click **"Add Guest Player"**
   - Add players named: A, B, C, D, E, F, G, H, I, J, K, L
   - Total: 13 players (you + 12 guests)

### 4. Start Tournament and Verify Round 1

1. Click **"Start Tournament"**
2. Verify Round 1 pairings:
   - Should show 6 matches
   - One player should have a **BYE** (automatic 1 point)
   - Note which player has the bye

### 5. Submit Round 1 Results

Submit the following results to test various scenarios:

| Match | Result | Notes |
|-------|--------|-------|
| Match 1 | Player 1 wins | Regular win |
| Match 2 | Draw | Tests draw functionality |
| Match 3 | Player 2 wins | Regular win |
| Match 4 | Player 1 wins | Regular win |
| Match 5 | Draw | Another draw |
| Match 6 | Player 2 wins | Regular win |

**To submit results:**
1. Click on each match
2. Select the result (Win/Loss/Draw)
3. Click Submit

### 6. Verify Round 2 Auto-Generation

After submitting all Round 1 results:

1. **Check if Round 2 is automatically generated**
2. Verify pairings follow Swiss system rules:
   - Players with similar scores are paired
   - No repeat pairings
   - One player gets a bye
3. Check standings after Round 1:
   - Bye player: 1 point
   - Winners: 1 point
   - Draw players: 0.5 points
   - Losers: 0 points

### 7. Complete Remaining Rounds

**Round 2 Results:**
- Mix up winners and losers
- Include at least one draw
- Submit all results

**Round 3 Results:**
- Continue varying results
- Check that pairings avoid repeats
- Verify bye rotation

**Round 4 Results:**
- Final round
- Submit all results
- Tournament should auto-complete

### 8. Verify Final Results

After all rounds:

1. **Check Tournament Status:**
   - Should show "Completed"
   - Winner should be displayed

2. **Verify Standings:**
   - Points calculated correctly:
     - Win = 1 point
     - Draw = 0.5 points
     - Loss = 0 points
     - Bye = 1 point
   - Buchholz scores (sum of opponents' points)
   - Proper ranking

3. **Check Bye Distribution:**
   - Each player should receive at most 1 bye
   - With 13 players and 4 rounds, 4 different players get byes

## Expected Behaviors

### Auto-Bye Assignment
- With 13 players, one gets a bye each round
- Bye selection prioritizes:
  1. Players who haven't had a bye
  2. Lower-ranked players if all have had byes
- Bye = automatic 1 point

### Round Generation
- Rounds auto-generate when all matches complete
- Swiss pairing rules:
  - Similar scores paired together
  - No repeat pairings
  - Bye assignment for odd numbers

### Standing Calculation
- Points: Win=1, Draw=0.5, Loss=0, Bye=1
- Tiebreakers:
  1. Total points
  2. Buchholz score (opponents' total points)
  3. Number of wins

## Console Monitoring

While testing, monitor the browser console for:
- Match submission confirmations
- Round generation messages
- Any error messages

Backend logs will show:
- Tournament creation
- Match result processing
- Round generation logic
- Bye assignment decisions

## Troubleshooting

If rounds don't auto-generate:
1. Ensure all matches are marked complete
2. Check console for errors
3. Refresh the page to update state

If standings seem incorrect:
1. Verify all match results were saved
2. Check if backend calculated points
3. Frontend may fallback to client-side calculation

## Summary

This test verifies:
- ✅ 13-player Swiss tournament creation
- ✅ Automatic bye assignment
- ✅ Various match results (wins/losses/draws)
- ✅ Automatic round generation
- ✅ Proper standings calculation
- ✅ Tournament completion

The Swiss tournament system should handle all these scenarios smoothly, providing a complete tournament experience with proper pairing, bye handling, and automatic progression.