import apiClient from '@/services/apiClient';

export const postApi = {
  createPost(payload) {
    return apiClient.post('/posts', payload);
  },

  getHomeFeed(params) {
    return apiClient.get('/posts/feed', { params });
  },

  getProfileFeed(username, params) {
    return apiClient.get(`/users/${username}/posts`, { params });
  },

  getCommunityFeed(slug, params) {
    return apiClient.get(`/communities/${slug}/posts`, { params });
  },

  getPost(postId) {
    return apiClient.get(`/posts/${postId}`);
  },

  updatePost(postId, payload) {
    return apiClient.patch(`/posts/${postId}`, payload);
  },

  deletePost(postId) {
    return apiClient.delete(`/posts/${postId}`);
  },

  likePost(postId) {
    return apiClient.post(`/posts/${postId}/like`);
  },

  unlikePost(postId) {
    return apiClient.delete(`/posts/${postId}/like`);
  },

  listComments(postId, params) {
    return apiClient.get(`/posts/${postId}/comments`, { params });
  },

  createComment(postId, payload) {
    return apiClient.post(`/posts/${postId}/comments`, payload);
  },

  deleteComment(postId, commentId) {
    return apiClient.delete(`/posts/${postId}/comments/${commentId}`);
  },
};

export default postApi;
