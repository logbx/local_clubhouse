import axiosInstance from './api';

export const messageService = {
  getConversation: async (userId: string) => {
    const response = await axiosInstance.get(`/messages/${userId}`);
    return response.data;
  },
  sendMessage: async (receiver: string, content: string) => {
    const response = await axiosInstance.post('/messages', { receiver, content });
    return response.data;
  },
  getConversations: async () => {
    const response = await axiosInstance.get('/messages');
    return response.data;
  },
  getEventMessages: async (eventId: string) => {
    const response = await axiosInstance.get(`/event-messages/${eventId}`);
    return response.data;
  },
  sendEventMessage: async (eventId: string, content: string) => {
    const response = await axiosInstance.post('/event-messages', { eventId, content });
    return response.data;
  },
  getGroupMessages: async () => {
    const response = await axiosInstance.get('/group-messages');
    return response.data;
  },
  sendGroupMessage: async (content: string) => {
    const response = await axiosInstance.post('/group-messages', { content });
    return response.data;
  },
  // Event Sub-Group APIs
  getSubGroups: async (eventId: string) => {
    const response = await axiosInstance.get(`/event-sub-groups/event/${eventId}`);
    return response.data;
  },
  createSubGroup: async (eventId: string, name: string, members: string[]) => {
    const response = await axiosInstance.post('/event-sub-groups', { eventId, name, members });
    return response.data;
  },
  addSubGroupMember: async (subGroupId: string, userId: string) => {
    const response = await axiosInstance.post(`/event-sub-groups/${subGroupId}/add-member`, { userId });
    return response.data;
  },
  removeSubGroupMember: async (subGroupId: string, userId: string) => {
    const response = await axiosInstance.post(`/event-sub-groups/${subGroupId}/remove-member`, { userId });
    return response.data;
  },
  getSubGroupMessages: async (subGroupId: string) => {
    const response = await axiosInstance.get(`/event-sub-groups/${subGroupId}/messages`);
    return response.data;
  },
  sendSubGroupMessage: async (subGroupId: string, content: string) => {
    const response = await axiosInstance.post(`/event-sub-groups/${subGroupId}/messages`, { content });
    return response.data;
  },
}; 