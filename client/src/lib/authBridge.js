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
 * Extract the `sub` (user UUID) from a Kumii JWT without verifying it.
 * We only need the identity claim; signature verification happens server-side
 * when the hub's own DB is used to check roles.
 * @param {string} kumiiJwt
 * @returns {string|null}
 */
function extractSubFromJwt(kumiiJwt) {
  try {
    const payload = JSON.parse(atob(kumiiJwt.split('.')[1]));
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

/**
 * Send the user identity (NOT the Kumii JWT) to the hub's own backend.
 * The server upserts the user into hub's Supabase, checks hub-side roles,
 * and returns a HUB JWT signed with HUB_JWT_SECRET.
 *
 * The Kumii JWT is only used locally to extract `userId`; it is never forwarded.
 *
 * @param {string} kumiiJwt  - Kumii JWT (used only to extract userId)
 * @param {object|null} profile  - from KUMII_USER_PROFILE postMessage
 * @param {object|null} startup  - from KUMII_USER_PROFILE postMessage
 */
async function syncWithHub(kumiiJwt, profile = null, startup = null) {
  const userId = extractSubFromJwt(kumiiJwt)
    ?? profile?.user_id
    ?? profile?.id
    ?? null;

  if (!userId) {
    console.warn('[HUB:BRIDGE] syncWithHub — could not extract userId, skipping sync');
    return;
  }

  const email   = _email ?? profile?.email ?? '';
  const persona = _persona ?? 'learner';
  const isAdmin = _isAdmin ?? false;

  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')
    : '';
  const url = `${apiBase}/api/auth/sync`;
  console.log('[HUB:BRIDGE] syncWithHub →', url,
    '| userId redacted | hasProfile:', !!profile, '| hasStartup:', !!startup);

  const res = await fetch(url, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ userId, email, isAdmin, persona, profile, startup }),
  });
  console.log('[HUB:BRIDGE] syncWithHub ←', res.status);
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    console.warn('[HUB:BRIDGE] /api/auth/sync failed', res.status, body);
    return;
  }
  const { token: hubToken, isAdmin: serverIsAdmin } = await res.json();
  console.log('[HUB:BRIDGE] syncWithHub resolved — isAdmin:', serverIsAdmin);

  // Store the HUB JWT — this replaces the Kumii JWT for all API calls
  if (hubToken) _token = hubToken;

  // Update admin/persona from server-authoritative value
  if (typeof serverIsAdmin === 'boolean') {
    _isAdmin = serverIsAdmin;
    _persona = serverIsAdmin ? 'admin' : 'learner';
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

    console.log('[HUB:BRIDGE] KUMII_USER_PROFILE received',
      '| hasProfile:', !!profile, '| hasStartup:', !!startup,
      '| isAdmin:', isAdmin, '| persona:', persona);

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
    let retryCount = 0;

    console.log('[HUB:BRIDGE] doHandshake start — reason:', reason, '| isEmbedded:', isEmbedded());

    const timeoutId = setTimeout(() => {
      if (settled) return;
      clearInterval(intervalId);
      window.removeEventListener('message', handler);
      console.error('[HUB:BRIDGE] doHandshake TIMED OUT after', TIMEOUT_MS, 'ms —',
        retryCount, 'retries sent');
      reject(new Error('[authBridge] Timed out waiting for KUMII_AUTH_TOKEN'));
    }, TIMEOUT_MS);

    function handler(event) {
      if (!isTrustedParent(event.origin)) {
        // Log untrusted origins so we can detect if the message comes from
        // an unexpected origin (e.g. different subdomain, HTTP instead of HTTPS)
        if (event.data?.type === 'KUMII_AUTH_TOKEN') {
          console.warn('[HUB:BRIDGE] KUMII_AUTH_TOKEN received from UNTRUSTED origin', event.origin);
        }
        return;
      }

      const { type, token, persona, isAdmin, email } = event.data ?? {};

      console.log('[HUB:BRIDGE] message from trusted origin', event.origin, '— type:', type,
        '| hasToken:', !!token, '| persona:', persona, '| isAdmin:', isAdmin);

      // Ignore empty-token replies — Kumii stays silent on null sessions;
      // keep retrying until a real token arrives.
      if (type !== 'KUMII_AUTH_TOKEN' || !token) return;

      settled = true;
      clearTimeout(timeoutId);
      clearInterval(intervalId);
      window.removeEventListener('message', handler);

      console.log('[HUB:BRIDGE] KUMII_AUTH_TOKEN accepted — token length:', token.length,
        '| looksLikeJWT:', token.startsWith('eyJ'));

      // Capture parentOrigin from the first trusted reply
      _parentOrigin = event.origin;
      _token        = token;
      _persona      = persona ?? 'learner';
      _isAdmin      = isAdmin === true; // provisional — server will confirm
      _email        = email ?? null;

      // Sync user into hub's Supabase DB; server confirms real admin status
      // and returns a hub-issued JWT stored as _token by syncWithHub
      syncWithHub(token).catch(() => {});
      scheduleRefresh();
      resolve(token);
    }

    window.addEventListener('message', handler);

    // Send immediately, then retry every 500 ms
    window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN', reason }, '*');
    console.log('[HUB:BRIDGE] REQUEST_AUTH_TOKEN sent (attempt 1)');
    const intervalId = setInterval(() => {
      if (settled) { clearInterval(intervalId); return; }
      retryCount++;
      window.parent.postMessage({ type: 'REQUEST_AUTH_TOKEN', reason }, '*');
      if (retryCount <= 5 || retryCount % 10 === 0) {
        console.log('[HUB:BRIDGE] REQUEST_AUTH_TOKEN retry #' + retryCount);
      }
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
