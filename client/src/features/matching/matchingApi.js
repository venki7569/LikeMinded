import apiClient from '@/services/apiClient';

export const matchingApi = {
  getRecommendations(params) {
    return apiClient.get('/matching/recommendations', { params });
  },

  explainMatch(userId) {
    return apiClient.get(`/matching/explain/${userId}`);
  },
};

export default matchingApi;
