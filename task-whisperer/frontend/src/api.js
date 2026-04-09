/**
 * API service layer for communicating with the Task Whisperer backend.
 */
import axios from 'axios';

// Use relative URLs so requests go through the nginx proxy on the same origin.
// The nginx config proxies /api/* to the backend automatically.
const API_URL = process.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ─── Task APIs ──────────────────────────────────────────────────

export const getTasks = async () => {
  const response = await api.get('/tasks/');
  return response.data;
};

export const createTask = async (taskData) => {
  const response = await api.post('/tasks/', taskData);
  return response.data;
};

export const updateTask = async (taskId, taskData) => {
  const response = await api.put(`/tasks/${taskId}`, taskData);
  return response.data;
};

export const deleteTask = async (taskId) => {
  await api.delete(`/tasks/${taskId}`);
};

export const completeTask = async (taskId, actualDurationMinutes) => {
  const response = await api.post(`/tasks/${taskId}/complete`, {
    actual_duration_minutes: actualDurationMinutes,
  });
  return response.data;
};

export const updateTaskCategory = async (taskId, categoryOverride) => {
  const response = await api.patch(`/tasks/${taskId}/category`, {
    category_override: categoryOverride,
  });
  return response.data;
};

export const detectOverdueTasks = async () => {
  const response = await api.post('/tasks/overdue/detect');
  return response.data;
};

export const getOverdueCount = async () => {
  const response = await api.get('/tasks/overdue/count');
  return response.data;
};

// ─── Recommendation APIs ────────────────────────────────────────

export const getRecommendation = async () => {
  const response = await api.post('/recommend/');
  return response.data;
};

// ─── Profile APIs ───────────────────────────────────────────────

export const getProfile = async () => {
  const response = await api.get('/profile/');
  return response.data;
};

export const updateProfile = async (profileData) => {
  const response = await api.post('/profile/update', profileData);
  return response.data;
};

export const recomputeProfile = async () => {
  const response = await api.post('/profile/recompute');
  return response.data;
};

export default api;
