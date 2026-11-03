import apiClient from '@/services/apiClient';

export const chatApi = {
  listConversations() {
    return apiClient.get('/conversations');
  },

  startConversation(recipientId) {
    return apiClient.post('/conversations', { recipientId });
  },

  getMessages(conversationId, params) {
    return apiClient.get(`/conversations/${conversationId}/messages`, { params });
  },

  sendMessage(conversationId, payload) {
    return apiClient.post(`/conversations/${conversationId}/messages`, payload);
  },

  markRead(conversationId) {
    return apiClient.patch(`/conversations/${conversationId}/read`);
  },
};

export default chatApi;
