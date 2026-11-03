import apiClient from '@/services/apiClient';

export const adminApi = {
  getStats() {
    return apiClient.get('/admin/stats');
  },

  getReports(params) {
    return apiClient.get('/admin/reports', { params });
  },

  resolveReport(id, payload) {
    return apiClient.patch(`/admin/reports/${id}`, payload);
  },

  getUsers(params) {
    return apiClient.get('/admin/users', { params });
  },

  updateUserRole(userId, role) {
    return apiClient.patch(`/admin/users/${userId}/role`, { role });
  },

  updateUserBan(userId, isBanned) {
    return apiClient.patch(`/admin/users/${userId}/ban`, { isBanned });
  },

  submitReport(payload) {
    return apiClient.post('/reports', payload);
  },
};

export default adminApi;
