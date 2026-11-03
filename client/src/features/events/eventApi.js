import apiClient from '@/services/apiClient';

export const eventApi = {
  list(params) {
    return apiClient.get('/events', { params });
  },

  get(id) {
    return apiClient.get(`/events/${id}`);
  },

  create(payload) {
    return apiClient.post('/events', payload);
  },

  toggleRsvp(id) {
    return apiClient.post(`/events/${id}/rsvp`);
  },

  delete(id) {
    return apiClient.delete(`/events/${id}`);
  },
};

export default eventApi;
