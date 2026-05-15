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
    console.debug('[HUB:API] request', config.method?.toUpperCase(), config.url, '— token present ✓');
  } else {
    // Token is null — the request will 401. Log the full URL so we know which
    // call fired before the auth handshake completed.
    console.warn('[HUB:API] request', config.method?.toUpperCase(), config.url,
      '— NO TOKEN (auth handshake not complete yet)');
  }
  return config;
});

// Normalise error shape
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err.response?.status;
    const detail  = err.response?.data?.detail  ?? '';
    const message =
      err.response?.data?.error ||
      err.response?.data?.errors?.[0] ||
      err.message ||
      'An unexpected error occurred';
    console.error('[HUB:API] response error', status, err.config?.url, '—', message, detail);
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
