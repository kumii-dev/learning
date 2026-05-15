/**
 * client/src/lib/apiClient.js
 * Axios instance — auto-injects Bearer token from in-memory auth bridge.
 */

import axios from 'axios';
import { getToken } from './authBridge';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token on every request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Normalise error shape
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.errors?.[0] ||
      err.message ||
      'An unexpected error occurred';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
