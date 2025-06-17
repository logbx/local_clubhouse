import axiosInstance from './api';

export const messageService = {
  getConversation: async (userId: string) => {
    const response = await axiosInstance.get(`/api/messages/${userId}`);
    return response.data;
  },
  sendMessage: async (receiver: string, content: string) => {
    const response = await axiosInstance.post('/api/messages', { receiver, content });
    return response.data;
  },
  getConversations: async () => {
    const response = await axiosInstance.get('/api/messages');
    return response.data;
  },
  getEventMessages: async (eventId: string) => {
    const response = await axiosInstance.get(`/api/event-messages/${eventId}`);
    return response.data;
  },
  sendEventMessage: async (eventId: string, content: string) => {
    const response = await axiosInstance.post(`/api/event-messages/${eventId}`, { content });
    return response.data;
  },
  getGroupMessages: async () => {
    try {
    const response = await axiosInstance.get('/api/group-messages');
    return response.data;
    } catch (error: any) {
      console.error('Error fetching group messages:', error);
      if (error.response?.status === 404) {
        throw new Error('Group messages feature is not available');
      }
      if (error.response?.status === 401) {
        throw new Error('Please log in to view messages');
      }
      throw new Error('Failed to load messages');
    }
  },
  sendGroupMessage: async (content: string) => {
    try {
    const response = await axiosInstance.post('/api/group-messages', { content });
    return response.data;
    } catch (error: any) {
      console.error('Error sending group message:', error);
      if (error.response?.status === 404) {
        throw new Error('Group messages feature is not available');
      }
      if (error.response?.status === 401) {
        throw new Error('Please log in to send messages');
      }
      throw new Error('Failed to send message');
    }
  },
  // Event Sub-Group APIs
  getSubGroups: async (eventId: string) => {
    const response = await axiosInstance.get(`/api/event-subgroups/event/${eventId}`);
    return response.data;
  },
  createSubGroup: async (eventId: string, name: string, members: string[]) => {
    const response = await axiosInstance.post('/api/event-subgroups', { eventId, name, members });
    return response.data;
  },
  addSubGroupMember: async (subGroupId: string, userId: string) => {
    const response = await axiosInstance.post(`/api/event-subgroups/${subGroupId}/add-member`, { userId });
    return response.data;
  },
  removeSubGroupMember: async (subGroupId: string, userId: string) => {
    const response = await axiosInstance.post(`/api/event-subgroups/${subGroupId}/remove-member`, { userId });
    return response.data;
  },
  getSubGroupMessages: async (subGroupId: string) => {
    const response = await axiosInstance.get(`/api/event-subgroups/${subGroupId}/messages`);
    return response.data;
  },
  sendSubGroupMessage: async (subGroupId: string, content: string) => {
    const response = await axiosInstance.post(`/api/event-subgroups/${subGroupId}/messages`, { content });
    return response.data;
  },
  // Get all sub-groups the user is a member of (for messages page)
  getUserSubGroups: async () => {
    const response = await axiosInstance.get('/api/event-subgroups/user-subgroups');
    return response.data;
  },
}; 