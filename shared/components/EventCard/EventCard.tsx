import React from 'react';
import { EventCardProps } from './types';
import { formatDate, formatTime } from '../../utils/dateUtils';

export const EventCard: React.FC<EventCardProps> = ({
  event,
  onPress,
  onRSVP,
  onTournamentPress,
  isRSVPed,
  canEdit,
  user,
  variant = 'default',
  showActions = true,
  className,
  style,
  renderCustomActions,
}) => {
  const getStatusColor = () => {
    switch (event.status) {
      case 'DRAFT':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'LIVE':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'PAST':
        return { backgroundColor: '#f3f4f6', color: '#374151' };
      default:
        return { backgroundColor: '#f3f4f6', color: '#374151' };
    }
  };

  const hasTournament = event.features && (
    event.features.includes('SINGLE_ELIMINATION_TOURNAMENT') || 
    event.features.includes('SWISS_TOURNAMENT')
  );

  const statusStyle = getStatusColor();

  // This is a platform-agnostic component that accepts render props
  // for platform-specific styling and interactions
  const eventCardData = {
    event,
    statusStyle,
    hasTournament,
    formattedDate: formatDate(event.startDate),
    formattedTime: formatTime(event.startDate, event.endDate),
    canEdit,
    isRSVPed,
    showActions,
  };

  // Return the data for platform-specific rendering
  return renderCustomActions ? 
    renderCustomActions(eventCardData) : 
    null;
};

export default EventCard;