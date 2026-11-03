import apiClient from '@/services/apiClient';

export const notificationApi = {
  list(params) {
    return apiClient.get('/notifications', { params });
  },

  getUnreadCount() {
    return apiClient.get('/notifications/unread-count');
  },

  markRead(id) {
    return apiClient.patch(`/notifications/${id}/read`);
  },

  markAllRead() {
    return apiClient.patch('/notifications/read-all');
  },
};

export default notificationApi;
