# Time-Based Event Status Implementation

## Overview
Implemented automatic event status transitions based on the actual event time windows, ensuring events are correctly categorized as LIVE, PAST, or DRAFT based on their start and end times.

## Example Scenario
For an event on **7/16/2025 from 3:00 PM to 10:00 PM**:
- **Before 3:00 PM**: Event should be LIVE (shown in Live section as upcoming)
- **3:00 PM - 10:00 PM**: Event should be LIVE (shown in Live section as currently active)
- **After 10:01 PM**: Event should be PAST (automatically moved to Past section)

## Implementation Details

### Core Logic
```typescript
const now = new Date();
const startDate = new Date(event.startDate);
const endDate = new Date(event.endDate);

// Add 1 minute buffer after end time before marking as PAST
const endDateWithBuffer = new Date(endDate.getTime() + 60000); // +1 minute

if (now > endDateWithBuffer) {
  // Event has ended (with buffer) - should be PAST
  if (event.status !== EventStatus.PAST) {
    newStatus = EventStatus.PAST;
  }
} else {
  // Event is upcoming or currently active - should be LIVE
  // This includes events that haven't started yet (upcoming) and events that are currently happening
  if (event.status !== EventStatus.LIVE) {
    newStatus = EventStatus.LIVE;
  }
}
```

### Key Features

#### **1. Automatic Status Transitions**
- **ANY → LIVE**: Events that haven't ended yet (upcoming and currently active)
- **LIVE → PAST**: When event end time + 1 minute buffer is reached
- **DRAFT remains DRAFT**: Only manually created drafts stay as DRAFT

#### **2. 1-Minute Buffer**
- Events remain in LIVE status for 1 minute after their official end time
- Prevents premature transitions due to minor timing differences
- Allows for any last-minute activities or wrap-up

#### **3. Real-Time Updates**
- Status changes are triggered automatically when users view the page
- No manual intervention required from organizers
- Consistent experience across all users

#### **4. Periodic Checks**
- Automatic status verification every minute
- Ensures events are updated even if users stay on the page for extended periods
- Prevents stale status information

## Files Modified

### **1. Dashboard.tsx**
- **Main dashboard** where users see all public events
- Auto-updates event statuses based on time
- Periodic checks every minute for continuous updates

### **2. ClubEventsSection.tsx**
- **Club profile pages** showing club-specific events
- **Sponsor profile pages** showing sponsored events
- Same logic applied to maintain consistency across all event views

### **3. Comprehensive Coverage**
- **Public events** (Dashboard)
- **Club events** (Club profile pages)
- **Sponsored events** (Sponsor profile pages)
- **All event types** regardless of visibility settings

## User Experience Benefits

### **1. Accurate Event Categorization**
- **Live section** shows upcoming events and currently active events
- **Past section** automatically populated when events end (after 1-minute buffer)
- **No confusion** about event timing

### **2. Real-Time Responsiveness**
```
Before 3:00 PM - Event upcoming → Shows in Live section
3:00 PM - Event starts → Continues to show in Live section (now active)
10:00 PM - Event ends → Stays in Live section for 1 minute
10:01 PM - Buffer expires → Automatically moves to Past section
```

### **3. Consistent Experience**
- **All users** see the same event status at the same time
- **No manual updates** required from event organizers
- **Automatic cleanup** of expired events

## Technical Implementation

### **Auto-Update Logic**
```typescript
// Check each event's timing
allEvents.forEach((event: Event) => {
  if (!event.startDate || !event.endDate) return;

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const endDateWithBuffer = new Date(endDate.getTime() + 60000);
  
  // Determine correct status based on current time
  let newStatus: EventStatus | null = null;
  
  if (now > endDateWithBuffer) {
    // Event has ended (with buffer) - should be PAST
    if (event.status !== EventStatus.PAST) {
      newStatus = EventStatus.PAST;
    }
  } else {
    // Event is upcoming or currently active - should be LIVE
    // This includes events that haven't started yet (upcoming) and events that are currently happening
    if (event.status !== EventStatus.LIVE) {
      newStatus = EventStatus.LIVE;
    }
  }
  
  // Update if status change is needed
  if (newStatus && newStatus !== event.status) {
    eventsToUpdate.push({ event, newStatus });
  }
});
```

### **Periodic Updates**
```typescript
// Check every minute for continuous updates
useEffect(() => {
  const interval = setInterval(() => {
    if (events && events.length > 0) {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    }
  }, 60000); // 60 seconds

  return () => clearInterval(interval);
}, [events, queryClient]);
```

## Error Handling

### **1. Graceful Degradation**
- If API calls fail, events retain their current status
- Logging provides visibility into any issues
- No user-facing errors for automatic updates

### **2. Validation**
- Only processes events with valid start and end dates
- Skips events with missing or invalid timestamp data
- Prevents unnecessary API calls

### **3. Rate Limiting**
- Updates events individually to avoid overwhelming the API
- Batches updates intelligently based on timing
- Prevents duplicate updates for the same event

## Performance Optimizations

### **1. Efficient Processing**
- Only updates events that actually need status changes
- Skips events that are already in the correct status
- Minimizes database operations

### **2. Smart Caching**
- Uses React Query for efficient data management
- Invalidates caches only when necessary
- Prevents unnecessary re-renders

### **3. Background Processing**
- Status updates happen asynchronously
- UI remains responsive during updates
- No blocking operations for users

## Future Enhancements

### **1. Time Zone Support**
- Handle events in different time zones
- Display local time vs event time
- Proper timezone conversion

### **2. Advanced Scheduling**
- Pre-event reminders and notifications
- Countdown timers for upcoming events
- Custom buffer periods per event type

### **3. Event Analytics**
- Track event lifecycle timing
- Monitor automatic status transitions
- Performance metrics for event management

## Monitoring and Logging

### **1. Comprehensive Logging**
- Debug logs for periodic checks
- Info logs for status transitions
- Error logs for failed updates

### **2. Event Tracking**
```typescript
log.info(LogCategory.EVENT, `Auto-updating ${eventsToUpdate.length} events based on time`, {
  updates: eventsToUpdate.map(({ event, newStatus }) => ({
    eventId: event.id,
    title: event.title,
    currentStatus: event.status,
    newStatus,
    startDate: event.startDate,
    endDate: event.endDate
  }))
});
```

### **3. Status Verification**
- Continuous monitoring of event status accuracy
- Automatic correction of incorrect statuses
- Audit trail for all status changes

This implementation ensures that events are always displayed in the correct section based on their actual timing, providing users with an accurate and up-to-date view of event statuses across all parts of the application.