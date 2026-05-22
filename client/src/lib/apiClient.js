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

// ── User-friendly error messages keyed by HTTP status ────────────────────────
const STATUS_MESSAGES = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Your session has expired. Please refresh the page to sign in again.',
  403: 'You don\'t have permission to do that.',
  404: 'The requested resource could not be found.',
  408: 'The request timed out. Your network may be slow — please try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The server encountered an error. Please try again in a few moments.',
  502: 'The server is temporarily unreachable. Please try again shortly.',
  503: 'The service is temporarily unavailable. Please try again later.',
  504: 'The server took too long to respond. Your network may be slow.',
};

/**
 * Classify a raw axios error into a structured object:
 *   { message, detail, status, isNetwork, isSlow }
 *
 * Attach to thrown Error so callers can inspect `err.meta`.
 */
export function classifyError(err) {
  // Network / timeout — no response received at all
  if (!err.response) {
    const isSlow = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
    return {
      message:   isSlow
        ? 'Your network is slow — the request timed out. Please check your connection and try again.'
        : 'Unable to reach the server. Please check your internet connection.',
      detail:    err.message ?? '',
      status:    null,
      isNetwork: true,
      isSlow,
    };
  }

  const status   = err.response.status;
  const data     = err.response.data;
  const rawError = data?.error;

  // Prefer the server's own message if it's descriptive, else use our friendly copy
  const serverMsg =
    (typeof rawError === 'string' ? rawError : rawError?.message) ||
    data?.message ||
    data?.errors?.[0] ||
    null;

  // Use friendly copy for well-known statuses; fall back to server msg or generic
  const friendlyMsg = STATUS_MESSAGES[status] ?? null;
  const message     = friendlyMsg ?? serverMsg ?? `An unexpected error occurred (${status}).`;

  // Keep the raw server message as collapsible detail when it differs
  const detail = (serverMsg && serverMsg !== message) ? serverMsg : (data?.detail ?? '');

  return { message, detail, status, isNetwork: false, isSlow: false };
}

// Normalise error shape
apiClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const meta = classifyError(err);
    console.error('[HUB:API] response error', meta.status ?? 'network', err.config?.url, '—', meta);
    const error  = new Error(meta.message);
    error.meta   = meta; // pages can read .meta.status, .meta.isSlow, .meta.detail
    return Promise.reject(error);
  }
);

export default apiClient;
