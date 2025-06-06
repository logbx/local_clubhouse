import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../context/AuthContext';
import PublicEventPage from '../../pages/PublicEventPage';
import { publicApi } from '../../services/api';
import { EventVisibility } from '../../types/event';

// Mock the API calls
jest.mock('../../services/api', () => ({
  publicApi: {
    getPublicEvent: jest.fn(),
    getUserProfile: jest.fn()
  }
}));

const mockEvent = {
  _id: '683f9fc035c02a57c1d430c0',
  title: 'Test Event',
  description: 'Test Description',
  startDate: '2025-06-05T17:00:00.000Z',
  endDate: '2025-06-05T19:00:00.000Z',
  location: 'Test Location',
  cost: 0,
  isFree: true,
  visibility: EventVisibility.PUBLIC,
  tags: ['test'],
  creatorId: '683f88420fb5406f07041b5d',
  creator: {
    id: '683f88420fb5406f07041b5d',
    username: 'testuser'
  },
  rsvps: []
};

const mockCreator = {
  _id: '683f88420fb5406f07041b5d',
  username: 'testuser'
};

describe('PublicEventPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  const renderComponent = (eventId: string, currentUser?: any) => {
    return render(
      <MemoryRouter initialEntries={[`/event/${eventId}`]}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider initialUser={currentUser}>
            <Routes>
              <Route path="/event/:eventId" element={<PublicEventPage />} />
            </Routes>
          </AuthProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  };

  it('should show edit button for event creator', async () => {
    // Mock API responses
    (publicApi.getPublicEvent as jest.Mock).mockResolvedValue({ data: mockEvent });
    (publicApi.getUserProfile as jest.Mock).mockResolvedValue({ data: mockCreator });

    // Render with creator as current user
    renderComponent(mockEvent._id, {
      id: mockEvent.creatorId,
      username: 'testuser'
    });

    // Wait for the edit button to appear
    await waitFor(() => {
      expect(screen.getByText('Edit Event')).toBeInTheDocument();
    });
  });

  it('should not show edit button for non-creator', async () => {
    // Mock API responses
    (publicApi.getPublicEvent as jest.Mock).mockResolvedValue({ data: mockEvent });
    (publicApi.getUserProfile as jest.Mock).mockResolvedValue({ data: mockCreator });

    // Render with different user
    renderComponent(mockEvent._id, {
      id: 'different-user-id',
      username: 'otheruser'
    });

    // Wait for component to load and verify edit button is not present
    await waitFor(() => {
      expect(screen.queryByText('Edit Event')).not.toBeInTheDocument();
    });
  });

  it('should handle missing creator data gracefully', async () => {
    // Mock event without creator object
    const eventWithoutCreator = {
      ...mockEvent,
      creator: undefined
    };

    // Mock API responses
    (publicApi.getPublicEvent as jest.Mock).mockResolvedValue({ data: eventWithoutCreator });
    (publicApi.getUserProfile as jest.Mock).mockResolvedValue({ data: mockCreator });

    // Render component
    renderComponent(mockEvent._id);

    // Wait for component to load and check error handling
    await waitFor(() => {
      expect(screen.queryByText('Error:')).not.toBeInTheDocument();
    });
  });

  it('should handle event loading error', async () => {
    // Mock API error
    (publicApi.getPublicEvent as jest.Mock).mockRejectedValue(new Error('Failed to load event'));

    // Render component
    renderComponent(mockEvent._id);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText('Failed to load event')).toBeInTheDocument();
    });
  });
}); 