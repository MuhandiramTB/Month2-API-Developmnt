import axios from 'axios';

const API_BASE = 'http://localhost:3000/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Auth ──
export const register = (data) => api.post('/auth/register', data);
export const login = (data) => api.post('/auth/login', data);

// ── Users ──
export const getProfile = () => api.get('/users/profile');
export const updateProfile = (data) => api.put('/users/profile', data);
export const getAllUsers = () => api.get('/users');
export const getUserById = (id) => api.get(`/users/${id}`);

// ── Posts ──
export const getPosts = (params = {}) => api.get('/posts', { params });
export const getPostById = (id) => api.get(`/posts/${id}`);
export const getPostBySlug = (slug) => api.get(`/posts/slug/${slug}`);
export const getPostsByUser = (userId, params = {}) => api.get(`/posts/user/${userId}`, { params });
export const createPost = (data) => api.post('/posts', data);
export const updatePost = (id, data) => api.put(`/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/posts/${id}`);

// ── Comments ──
export const getCommentsByPost = (postId, params = {}) => api.get(`/posts/${postId}/comments`, { params });
export const createComment = (postId, data) => api.post(`/posts/${postId}/comments`, data);
export const deleteComment = (id) => api.delete(`/comments/${id}`);

export default api;
