/**
 * client/src/lib/authBridge.js
 * iFrame ↔ Kumii host auth handshake (browser-only).
 *
 * Flow:
 *  1. Try own Supabase session (dev / standalone mode)
 *  2. If not found → send REQUEST_AUTH_TOKEN to parent (retry every 500 ms)
 *  3. Listen for KUMII_AUTH_TOKEN from a trusted parent origin → store in memory
 *  4. Kumii then fetches the user profile and posts KUMII_USER_PROFILE (separate
 *     persistent listener — arrives shortly after the token).
 *  5. Call POST /api/auth/sync with the JWT + profile → hub upserts user into
 *     its own Supabase DB; server returns { id, email, isAdmin }.
 *  6. Refresh the token every 50 min (re-request with reason:"refresh").
 *
 * SECURITY:
 *  - Token/profile stored in module-level memory only (never localStorage/sessionStorage)
 *  - Incoming messages validated against a strict origin allow-list
 *  - REQUEST_AUTH_TOKEN sent with "*" (parent origin unknown from inside iframe)
 *  - Outgoing events sent to captured parentOrigin — never "*"
 *  - isAdmin is authoritative from the SERVER (hub's own user_roles), not from Kumii
 *  - JWT, user_id and email are never logged
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ────────────────────────────────────────────────────────────────────
const OWN_SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL;
const OWN_SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Kumii's Supabase project — the JWT we receive IS a session on this project
const KUMII_SUPABASE_URL      = 'https://qypazgkngxhazgkuevwq.supabase.co';
const KUMII_SUPABASE_ANON_KEY = import.meta.env.VITE_KUMII_SUPABASE_ANON_KEY ?? '';

const TIMEOUT_MS      = 15_000;
const RETRY_MS        = 500;
const REFRESH_EVERY   = 50 * 60 * 1_000; // 50 minutes

/** Origins Kumii is allowed to send tokens from. */
function isTrustedParent(origin) {
  if (
    origin === 'https://kumii.africa'     ||
    origin === 'https://www.kumii.africa' ||
    origin === 'http://localhost:3000'
  ) return true;
  // Allow any Lovable preview / published subdomain
  if (/^https:\/\/[a-z0-9-]+\.lovable\.app$/.test(origin)) return true;
  if (/^https:\/\/[a-z0-9-]+\.lovableproject\.com$/.test(origin)) return true;
  return false;
}

// ── In-memory auth store ──────────────────────────────────────────────────────
let _token        = null;
let _persona      = 'learner';
let _isAdmin      = false;
let _email        = null;
let _parentOrigin = null; // captured from first trusted KUMII_AUTH_TOKEN message

/** Full profile from KUMII_USER_PROFILE message (null until received). */
let _profile      = null;
/** Startup profile from KUMII_USER_PROFILE message (null if user has no startup). */
let _startup      = null;

export const getToken        = () => _token;
export const getPersona      = () => _persona;
export const getIsAdmin      = () => _isAdmin;
export const getEmail        = () => _email;
export const getParentOrigin = () => _parentOrigin;
/** Returns the full Kumii profile object, or null if not yet received. */
export const getProfile      = () => _profile;
/** Returns the Kumii startup object, or null if user has no startup or not yet received. */
export const getStartup      = () => _startup;

// ── Supabase clients ──────────────────────────────────────────────────────────

/** Hub's own Supabase (dev standalone mode only) */
let _ownSupabase = null;
function getOwnSupabase() {
  if (!_ownSupabase && OWN_SUPABASE_URL && OWN_SUPABASE_ANON_KEY) {
    _ownSupabase = createClient(OWN_SUPABASE_URL, OWN_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return _ownSupabase;
}

/** Kumii's Supabase — hydrated with the JWT received from the parent */
let _kumiiSupabase = null;
export function getKumiiSupabase() {
  if (!_kumiiSupabase && KUMII_SUPABASE_ANON_KEY) {
    _kumiiSupabase = createClient(KUMII_SUPABASE_URL, KUMII_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _kumiiSupabase;
}

async function hydrateKumiiSession(token) {
  const client = getKumiiSupabase();
  if (!client) return;
  await client.auth.setSession({ access_token: token, refresh_token: '' });
}

// ── isEmbedded ────────────────────────────────────────────────────────────────
export function isEmbedded() {
  try { return window.self !== window.top; } catch { return true; }
}

// ── Send to parent ────────────────────────────────────────────────────────────
/**
 * Send a typed postMessage to the Kumii parent.
 * Uses captured parentOrigin after handshake; falls back to "*" only for
 * the initial REQUEST_AUTH_TOKEN (parent origin is unknown from inside iframe).
 */
export function sendToParent(message) {
  if (!isEmbedded()) return;
  const target = _parentOrigin ?? '*';
  window.parent.postMessage(message, target);
}

// ── Hub sync ──────────────────────────────────────────────────────────────────
/**
 * Send the Kumii JWT (and optional profile snapshot) to the hub's own backend.
 * The server verifies the JWT, upserts the user into hub's Supabase, and returns
 * { id, email, isAdmin } sourced from the hub's own user_roles table.
 *
 * @param {string} token  - Kumii JWT
 * @param {object|null} profile  - KUMII_USER_PROFILE.profile (optional)
 * @param {object|null} startup  - KUMII_USER_PROFILE.startup (optional)
 */
async function syncWithHub(token, profile = null, startup = null) {
  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
    : '';
  const res = await fetch(`${apiBase}/api/auth/sync`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ token, profile, startup }),
  });
  if (!res.ok) {
    console.warn('[authBridge] /api/auth/sync failed', res.status);
    return;
  }
  const { id, email, isAdmin } = await res.json();
  // Update in-memory store with server-authoritative values
  if (id)    _email   = email   ?? _email;
  if (typeof isAdmin === 'boolean') {
    _isAdmin = isAdmin;
    _persona = isAdmin ? 'admin' : 'learner';
  }
}

// ── KUMII_USER_PROFILE listener ───────────────────────────────────────────────
/**
 * Persistent listener for the profile message that Kumii sends AFTER the JWT.
 * Installed once at module load time. Safe to fire multiple times (refresh).
 *
 * On receipt:
 *  - Stores profile + startup in memory (accessible via getProfile / getStartup)
 *  - Re-syncs the hub backend so the profiles table is enriched with real names,
 *    avatar, organisation, etc. Uses the already-cached token.
 *  - Dispatches a DOM CustomEvent ("kumii:profile") so React components can
 *    react without polling.
 */
(function installProfileListener() {
  if (typeof window === 'undefined') return;
  window.addEventListener('message', (event) => {
    if (!isTrustedParent(event.origin)) return;
    const { type, profile, startup, isAdmin, persona } = event.data ?? {};
    if (type !== 'KUMII_USER_PROFILE') return;

    // Store profile data
    if (profile) _profile = profile;
    if (startup !== undefined) _startup = startup ?? null; // null = no startup

    // isAdmin from Kumii is provisional; server is the source of truth.
    // Update immediately for fast UX, then the syncWithHub call below corrects it.
    if (typeof isAdmin  === 'boolean') { _isAdmin = isAdmin; }
    if (typeof persona  === 'string')  { _persona = persona; }

    // Re-sync hub backend with enriched profile data (token already cached)
    if (_token) {
      syncWithHub(_token, profile ?? null, startup ?? null).catch(() => {});
    }

    // Notify React components
    window.dispatchEvent(
      new CustomEvent('kumii:profile', { detail: { profile: _profile, startup: _startup } })
    );
  });
})();

// ── Handshake ─────────────────────────────────────────────────────────────────
let _refreshTimer = null;

function scheduleRefresh() {
  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(() => {
    // Re-request token with reason:"refresh" so Kumii bypasses its respondedRef dedupe
    if (isEmbedded()) {
      window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN', reason: 'refresh' }, '*');
    }
    // Re-run full handshake to update in-memory store
    doHandshake('refresh').catch(() => {});
  }, REFRESH_EVERY);
}

/**
 * Run the postMessage handshake and return a Promise<string> of the JWT.
 * @param {'initial'|'refresh'} reason
 */
function doHandshake(reason = 'initial') {
  return new Promise((resolve, reject) => {
    let settled = false;

    const timeoutId = setTimeout(() => {
      if (settled) return;
      clearInterval(intervalId);
      window.removeEventListener('message', handler);
      reject(new Error('[authBridge] Timed out waiting for KUMII_AUTH_TOKEN'));
    }, TIMEOUT_MS);

    function handler(event) {
      if (!isTrustedParent(event.origin)) return;

      const { type, token, persona, isAdmin, email } = event.data ?? {};

      // Ignore empty-token replies — Kumii stays silent on null sessions;
      // keep retrying until a real token arrives.
      if (type !== 'KUMII_AUTH_TOKEN' || !token) return;

      settled = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('message', handler);

      // Capture parentOrigin from the first trusted reply
      _parentOrigin = event.origin;
      _token        = token;
      _persona      = persona ?? 'learner';
      _isAdmin      = isAdmin === true; // provisional — server will confirm
      _email        = email ?? null;

      // Sync user into hub's Supabase DB; let server confirm real admin status
      syncWithHub(token).catch(() => {});
      hydrateKumiiSession(token).catch(() => {});
      scheduleRefresh();
      resolve(token);
    }

    window.addEventListener('message', handler);

    // Send immediately, then retry every 500 ms
    window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN', reason }, '*');
    const intervalId = setInterval(() => {
      if (settled) { clearInterval(intervalId); return; }
      window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN', reason }, '*');
    }, RETRY_MS);
  });
}

// ── initAuthBridge ────────────────────────────────────────────────────────────
/**
 * Initialise the auth bridge. Resolves with the JWT.
 * Safe to call multiple times — returns cached token if already obtained.
 * @returns {Promise<string>}
 */
export async function initAuthBridge() {
  // Return cached token
  if (_token) return _token;

  // Dev / standalone: try own Supabase session first
  const ownClient = getOwnSupabase();
  if (ownClient) {
    const { data } = await ownClient.auth.getSession();
    if (data?.session?.access_token) {
      _token = data.session.access_token;
      _email = data.session.user?.email ?? null;
      return _token;
    }
  }

  return doHandshake('initial');
}

// ── Outgoing event helpers ────────────────────────────────────────────────────
export const notify = {
  courseCompleted:   (courseId) => sendToParent({ type: 'COURSE_COMPLETED',   courseId }),
  certificateIssued: (certId)   => sendToParent({ type: 'CERTIFICATE_ISSUED', certId }),
  navigateToProfile: ()         => sendToParent({ type: 'NAVIGATE_TO_PROFILE' }),
  navigateToCourses: ()         => sendToParent({ type: 'NAVIGATE_TO_COURSES' }),
  openDocument:      (docId)    => sendToParent({ type: 'OPEN_DOCUMENT',      documentId: docId }),
};
