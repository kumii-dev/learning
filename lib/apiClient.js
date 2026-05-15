/**
 * lib/apiClient.js
 * Axios instance that automatically injects the in-memory JWT.
 * Uses the auth bridge token — no token is ever read from localStorage.
 */

'use client';

import axios from 'axios';
import { getToken } from './authBridge';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach Bearer token from memory on every request
apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

// Normalise error responses
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
