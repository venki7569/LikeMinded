import apiClient from '@/services/apiClient';

export const profileApi = {
  getMe: () => apiClient.get('/users/me/profile'),
  getByUsername: (username) => apiClient.get(`/users/${username}`),
  updateMe: (payload) => apiClient.put('/users/me/profile', payload),
  patchSkills: (skills) => apiClient.patch('/users/me/skills', { skills }),
  patchInterests: (interests) => apiClient.patch('/users/me/interests', { interests }),
  checkUsername: (username) => apiClient.get(`/users/check-username/${username}`),
  getCompleteness: () => apiClient.get('/users/me/profile-completeness'),
};

export default profileApi;
