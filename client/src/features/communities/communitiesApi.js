import apiClient from '@/services/apiClient';

export const communitiesApi = {
  list: (params) => apiClient.get('/communities', { params }),
  create: (payload) => apiClient.post('/communities', payload),
  getBySlug: (slug) => apiClient.get(`/communities/${slug}`),
  update: (slug, payload) => apiClient.put(`/communities/${slug}`, payload),
  remove: (slug) => apiClient.delete(`/communities/${slug}`),
  join: (slug) => apiClient.post(`/communities/${slug}/join`),
  leave: (slug) => apiClient.post(`/communities/${slug}/leave`),
  listMembers: (slug, params) => apiClient.get(`/communities/${slug}/members`, { params }),
  removeMember: (slug, userId) => apiClient.delete(`/communities/${slug}/members/${userId}`),
  promoteModerator: (slug, userId) => apiClient.post(`/communities/${slug}/moderators/${userId}`),
  demoteModerator: (slug, userId) => apiClient.delete(`/communities/${slug}/moderators/${userId}`),
  transferOwnership: (slug, userId) =>
    apiClient.post(`/communities/${slug}/transfer-ownership`, { userId }),
  listJoinRequests: (slug, params) =>
    apiClient.get(`/communities/${slug}/join-requests`, { params }),
  approveJoinRequest: (slug, requestId) =>
    apiClient.post(`/communities/${slug}/join-requests/${requestId}/approve`),
  rejectJoinRequest: (slug, requestId) =>
    apiClient.post(`/communities/${slug}/join-requests/${requestId}/reject`),
  cancelJoinRequest: (slug, requestId) =>
    apiClient.post(`/communities/${slug}/join-requests/${requestId}/cancel`),
  invite: (slug, userId) => apiClient.post(`/communities/${slug}/invitations`, { userId }),
  listMyInvitations: (params) => apiClient.get('/communities/invitations', { params }),
  acceptInvitation: (id) => apiClient.post(`/communities/invitations/${id}/accept`),
  rejectInvitation: (id) => apiClient.post(`/communities/invitations/${id}/reject`),
};

export default communitiesApi;
