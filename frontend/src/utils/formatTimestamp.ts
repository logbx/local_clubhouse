/**
 * Smart timestamp formatting function for messages
 * Formats timestamps based on how recent they are:
 * - Today: Just time (14:30)
 * - Yesterday: "Yesterday 14:30"
 * - 2-7 days ago: Weekday + time (Sun 14:30)
 * - More than 7 days ago: Full date + time (3 Jun 2025, 14:30)
 */
export function formatMessageTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d ago`;
  } else {
    // For older messages, show the date
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  }
}

/**
 * Simple timestamp formatter for backwards compatibility
 * Returns just the time in HH:MM format
 */
export function formatSimpleTime(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    return 'Invalid time';
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format timestamp for conversation lists (shows relative time)
 */
export function formatConversationTimestamp(dateString: string): string {
  const messageDate = new Date(dateString);
  const now = new Date();

  if (isNaN(messageDate.getTime())) {
    return '';
  }

  const diffInMinutes = Math.floor((+now - +messageDate) / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  if (diffInMinutes < 1) {
    return 'now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  } else if (diffInHours < 24) {
    return `${diffInHours}h`;
  } else if (diffInDays < 7) {
    return `${diffInDays}d`;
  } else {
    return messageDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
} 