// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localclubhouse.com';

export const endpoints = {
  auth: {
    register: '/api/auth/register',
    login: '/api/auth/login',
    logout: '/api/auth/logout',
    refreshToken: '/api/auth/refresh-token',
  },
  user: {
    me: '/api/users/me',
    updateProfile: '/api/users/me',
    avatar: '/api/users/me/avatar',
    activities: '/api/users/me/activities',
    publicProfile: (userId: string) => `/api/users/public/${userId}`,
  },
  events: {
    list: '/api/events',
    detail: (id: string) => `/api/events/${id}`,
    create: '/api/events',
    update: (id: string) => `/api/events/${id}`,
    delete: (id: string) => `/api/events/${id}`,
    publish: (id: string) => `/api/events/${id}/publish`,
    rsvp: (id: string) => `/api/events/${id}/rsvp`,
  },
  friends: {
    status: (userId: string) => `/api/friends/status/${userId}`,
    list: '/api/friends/list',
    requests: '/api/friends/requests',
    request: '/api/friends/request',
    accept: '/api/friends/accept',
    decline: '/api/friends/decline',
  },
}; 