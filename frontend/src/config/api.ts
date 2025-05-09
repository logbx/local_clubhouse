// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const endpoints = {
  auth: {
    register: '/auth/register',
    login: '/auth/login',
    logout: '/auth/logout',
    refreshToken: '/auth/refresh-token',
  },
  user: {
    me: '/users/me',
    updateProfile: '/users/me',
    avatar: '/users/me/avatar',
    activities: '/users/me/activities',
    publicProfile: (userId: string) => `/users/${userId}`,
  },
  events: {
    list: '/events',
    detail: (id: string) => `/events/${id}`,
    create: '/events',
    update: (id: string) => `/events/${id}`,
    delete: (id: string) => `/events/${id}`,
    publish: (id: string) => `/events/${id}/publish`,
    rsvp: (id: string) => `/events/${id}/rsvp`,
  },
  friends: {
    status: (userId: string) => `/friends/status/${userId}`,
    list: '/friends/list',
    requests: '/friends/requests',
    request: '/friends/request',
    accept: '/friends/accept',
    decline: '/friends/decline',
  },
}; 