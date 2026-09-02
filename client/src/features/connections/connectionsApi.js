import apiClient from '@/services/apiClient';

export const connectionsApi = {
  sendRequest: (userId) => apiClient.post('/connections/requests', { userId }),
  acceptRequest: (id) => apiClient.post(`/connections/requests/${id}/accept`),
  rejectRequest: (id) => apiClient.post(`/connections/requests/${id}/reject`),
  cancelRequest: (id) => apiClient.post(`/connections/requests/${id}/cancel`),
  listIncoming: (params) => apiClient.get('/connections/requests/incoming', { params }),
  listOutgoing: (params) => apiClient.get('/connections/requests/outgoing', { params }),
  listConnections: (params) => apiClient.get('/connections', { params }),
  removeConnection: (userId) => apiClient.delete(`/connections/${userId}`),
  getStatus: (userId) => apiClient.get(`/connections/status/${userId}`),
  blockUser: (userId) => apiClient.post('/connections/blocks', { userId }),
  unblockUser: (userId) => apiClient.delete(`/connections/blocks/${userId}`),
  listBlocked: (params) => apiClient.get('/connections/blocks', { params }),
  discoverPeople: (params) => apiClient.get('/people', { params }),
};

export default connectionsApi;
