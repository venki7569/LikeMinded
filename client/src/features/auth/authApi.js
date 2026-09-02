import apiClient from '@/services/apiClient';

/** Thin transport layer: one function per endpoint, no state handling. */
export const authApi = {
  register: (payload) => apiClient.post('/auth/register', payload),
  login: (payload) => apiClient.post('/auth/login', payload),
  refresh: () => apiClient.post('/auth/refresh'),
  logout: () => apiClient.post('/auth/logout'),
  logoutAll: () => apiClient.post('/auth/logout-all'),
  me: () => apiClient.get('/auth/me'),
  verifyEmail: (token) => apiClient.post('/auth/verify-email', { token }),
  resendVerification: (email) => apiClient.post('/auth/resend-verification', { email }),
  forgotPassword: (email) => apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (payload) => apiClient.post('/auth/reset-password', payload),
  changePassword: (payload) => apiClient.patch('/auth/change-password', payload),
};

export default authApi;
