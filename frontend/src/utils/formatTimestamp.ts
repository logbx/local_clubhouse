/**
 * Smart timestamp formatting function for messages
 * Formats timestamps based on how recent they are:
 * - Today: Just time (14:30)
 * - Yesterday: "Yesterday 14:30"
 * - 2-7 days ago: Weekday + time (Sun 14:30)
 * - More than 7 days ago: Full date + time (3 Jun 2025, 14:30)
 */
export function formatMessageTimestamp(dateString: string): string {
  const messageDate = new Date(dateString);
  const now = new Date();

  // Validate the date
  if (isNaN(messageDate.getTime())) {
    return 'Invalid date';
  }

  const isSameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isYesterday = (date: Date): boolean => {
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    return isSameDay(date, yesterday);
  };

  const daysAgo = Math.floor((+now - +messageDate) / (1000 * 60 * 60 * 24));

  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const dayOfWeekOptions: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    ...timeOptions,
  };

  const fullDateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...timeOptions,
  };

  if (isSameDay(messageDate, now)) {
    return messageDate.toLocaleTimeString(undefined, timeOptions); // "14:30"
  } else if (isYesterday(messageDate)) {
    return `Yesterday ${messageDate.toLocaleTimeString(undefined, timeOptions)}`; // "Yesterday 14:30"
  } else if (daysAgo < 7) {
    return messageDate.toLocaleString(undefined, dayOfWeekOptions); // "Sun 14:30"
  } else {
    return messageDate.toLocaleString(undefined, fullDateOptions); // "3 Jun 2025, 14:30"
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