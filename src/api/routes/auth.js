/**
 * src/api/routes/auth.js
 * POST /api/auth/sync
 *
 * Called by the hub frontend immediately after the iFrame receives the user
 * data from Kumii/Lovable via postMessage. This endpoint:
 *
 *   1. Verifies the Kumii JWT against Kumii's PUBLIC JWKS URL (no credentials).
 *   2. Upserts the user into the hub's own Supabase project so the hub's DB
 *      can track enrolments, progress, roles, etc.
 *   3. Returns { id, email, isAdmin } so the frontend knows what persona to show.
 *
 * Security notes:
 *   - JWT signature is always verified cryptographically — the postMessage data
 *     is NOT trusted blindly; the token proves identity.
 *   - Admin status is read from the hub's own user_roles table, not from Kumii.
 *     Grant admin by inserting a row there; Kumii's project is never touched.
 *   - Rate-limited by the global limiter in server.js (200 req / 15 min).
 */

'use strict';

const express                           = require('express');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const { supabaseAdmin }                 = require('../../integrations/supabase');
const logger                            = require('../../utils/logger');

const router = express.Router();

// Kumii's public JWKS — no credentials needed, just a URL
const KUMII_SUPABASE_URL = process.env.KUMII_SUPABASE_URL
  || 'https://qypazgkngxhazgkuevwq.supabase.co';

const KUMII_JWKS = createRemoteJWKSet(
  new URL(`${KUMII_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

/**
 * POST /api/auth/sync
 * Body: { token: "<Kumii JWT>" }
 *
 * Response 200: { id, email, isAdmin }
 * Response 400: missing token
 * Response 401: invalid token
 */
router.post('/sync', async (req, res) => {
  const { token } = req.body ?? {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }

  let payload;
  try {
    ({ payload } = await jwtVerify(token, KUMII_JWKS, {
      issuer: `${KUMII_SUPABASE_URL}/auth/v1`,
    }));
  } catch (err) {
    logger.warn('auth/sync: JWT verification failed', { message: err.message });
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const kumiiUserId = payload.sub;            // Kumii's UUID for this user
  const email       = payload.email ?? '';
  const name        = payload.user_metadata?.full_name
                   || payload.user_metadata?.name
                   || email.split('@')[0];

  // ── Upsert into hub's profiles table ──────────────────────────────────────
  // The profiles table mirrors the user just enough for the hub to function.
  // Schema expected:
  //   public.profiles (
  //     id          uuid primary key,   -- Kumii's user UUID
  //     email       text,
  //     full_name   text,
  //     kumii_id    uuid,               -- same as id; kept for clarity
  //     updated_at  timestamptz
  //   )
  const { error: upsertError } = await supabaseAdmin
    .from('profiles')
    .upsert(
      {
        id:         kumiiUserId,
        email,
        full_name:  name,
        kumii_id:   kumiiUserId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

  if (upsertError) {
    // Non-fatal: log and continue — the user can still browse, just without
    // a persisted profile row. Role check below will simply return false.
    logger.error('auth/sync: profiles upsert failed', { message: upsertError.message });
  }

  // ── Check admin status in hub's own user_roles table ──────────────────────
  const { data: isAdmin } = await supabaseAdmin.rpc('has_role', {
    _user_id: kumiiUserId,
    _role:    'admin',
  });

  logger.info('auth/sync: user synced', { userId: kumiiUserId, email, isAdmin: !!isAdmin });

  return res.json({
    id:      kumiiUserId,
    email,
    isAdmin: isAdmin === true,
  });
});

module.exports = router;
