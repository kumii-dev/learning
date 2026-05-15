/**
 * client/src/lib/authBridge.js
 * iFrame ↔ Kumii host auth handshake (browser-only).
 *
 * Flow:
 *  1. Try Supabase session (dev / standalone mode)
 *  2. If not found → send REQUEST_AUTH_TOKEN to parent
 *  3. Listen for KUMII_AUTH_TOKEN from parent → store in memory
 *
 * SECURITY:
 *  - Token stored in module-level memory only (never localStorage)
 *  - All incoming messages validated against TRUSTED_ORIGINS
 *  - postMessage target is KUMII_HOST_ORIGIN — never "*"
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL       = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;
const KUMII_HOST_ORIGIN  = import.meta.env.VITE_KUMII_HOST_ORIGIN  || 'http://localhost:3000';
const TRUSTED_ORIGINS    = (import.meta.env.VITE_KUMII_TRUSTED_ORIGINS || KUMII_HOST_ORIGIN)
  .split(',')
  .map((o) => o.trim());

// ── In-memory token store ─────────────────────────────────────────────────────
let _token   = null;
let _persona = null;
let _isAdmin = false;
let _email   = null;

export const getToken   = () => _token;
export const getPersona = () => _persona;
export const getIsAdmin = () => _isAdmin;
export const getEmail   = () => _email;

// ── Supabase client (browser) ─────────────────────────────────────────────────
let _supabase = null;
function getSupabase() {
  if (!_supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
    _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    });
  }
  return _supabase;
}

/**
 * Detect whether we are running inside an iframe.
 */
export function isEmbedded() {
  try {
    return window.self !== window.top;
  } catch {
    return true; // cross-origin parent — assume embedded
  }
}

/**
 * Send a typed postMessage to the parent Kumii platform.
 * @param {{ type: string, [key: string]: unknown }} message
 */
export function sendToParent(message) {
  if (!isEmbedded()) return;
  window.parent.postMessage(message, KUMII_HOST_ORIGIN);
  if (import.meta.env.DEV) {
    console.debug('[authBridge] → parent', message);
  }
}

/**
 * Initialise the auth bridge.
 * Returns a Promise that resolves with the JWT once obtained.
 * @returns {Promise<string>}
 */
export async function initAuthBridge() {
  // Step 1: Try Supabase dev session
  const supabase = getSupabase();
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      _token = data.session.access_token;
      console.info('[authBridge] Using Supabase dev session');
      return _token;
    }
  }

  // Step 2: Request token from Kumii host via postMessage
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('[authBridge] Timed out waiting for KUMII_AUTH_TOKEN'));
    }, 10_000);

    function handler(event) {
      if (!TRUSTED_ORIGINS.includes(event.origin)) {
        console.warn('[authBridge] Rejected message from untrusted origin:', event.origin);
        return;
      }

      const { type, token, persona, isAdmin, email } = event.data ?? {};

      if (import.meta.env.DEV) {
        console.debug('[authBridge] ← parent', { type });
      }

      if (type === 'KUMII_AUTH_TOKEN' && token) {
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        _token   = token;
        _persona = persona ?? 'learner';
        // isAdmin is a UX hint only — server enforces via JWT + has_role RPC
        _isAdmin = isAdmin === true;
        _email   = email ?? null;
        resolve(_token);
        return;
      }

      if (type === 'SET_PERSONA' && persona) {
        _persona = persona;
      }
    }

    window.addEventListener('message', handler);

    // Step 3: Send REQUEST_AUTH_TOKEN to parent
    sendToParent({ type: 'REQUEST_AUTH_TOKEN' });
  });
}

// ── Outgoing message helpers ──────────────────────────────────────────────────
export const notify = {
  openDocument:      (documentId) => sendToParent({ type: 'OPEN_DOCUMENT', documentId }),
  navigateToProfile: ()           => sendToParent({ type: 'NAVIGATE_TO_PROFILE' }),
  navigateToCourses: ()           => sendToParent({ type: 'NAVIGATE_TO_COURSES' }),
  courseCompleted:   (courseId)   => sendToParent({ type: 'COURSE_COMPLETED', courseId }),
  certificateIssued: (certId)     => sendToParent({ type: 'CERTIFICATE_ISSUED', certId }),
};
