import apiClient from '@/services/apiClient';

export const searchApi = {
  search(params) {
    return apiClient.get('/search', { params });
  },
};

export default searchApi;
