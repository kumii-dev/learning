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

const express          = require('express');
const { createClient } = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../../integrations/supabase');
const logger           = require('../../utils/logger');

const router = express.Router();

// Kumii's Supabase — anon key is the PUBLIC key (no secret needed).
// We call auth.getUser(token) to let Kumii's auth server validate the HS256 JWT.
const KUMII_SUPABASE_URL      = process.env.KUMII_SUPABASE_URL
  || 'https://qypazgkngxhazgkuevwq.supabase.co';
const KUMII_SUPABASE_ANON_KEY = process.env.KUMII_SUPABASE_ANON_KEY;

const kumiiAuthClient = createClient(
  KUMII_SUPABASE_URL,
  KUMII_SUPABASE_ANON_KEY || 'missing',
  { auth: { persistSession: false, autoRefreshToken: false } }
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
  const { token, profile, startup } = req.body ?? {};

  logger.info('[HUB:SYNC] POST /api/auth/sync received', {
    hasToken:    !!token,
    tokenLength: token?.length ?? 0,
    looksLikeJWT: token?.startsWith('eyJ') ?? false,
    hasProfile:  !!profile,
    hasStartup:  !!startup,
  });

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'token is required' });
  }

  let kumiiUser;
  try {
    const { data, error } = await kumiiAuthClient.auth.getUser(token);
    if (error || !data?.user) {
      logger.warn('[HUB:SYNC] getUser failed', {
        errorMessage: error?.message,
        errorStatus:  error?.status,
        hasAnonKey:   !!KUMII_SUPABASE_ANON_KEY,
        kumiiUrl:     KUMII_SUPABASE_URL,
        tokenPreview: token ? `${token.slice(0, 40)}…` : '(empty)',
      });
      return res.status(401).json({
        error:  'Invalid or expired token',
        detail: error?.message || 'getUser returned no user',
      });
    }
    kumiiUser = data.user;
    logger.info('[HUB:SYNC] getUser OK', { id: kumiiUser.id });
  } catch (err) {
    logger.warn('[HUB:SYNC] getUser threw', { message: err.message });
    return res.status(401).json({ error: 'Invalid or expired token', detail: err.message });
  }

  const kumiiUserId = kumiiUser.id;
  const email       = profile?.email   ?? kumiiUser.email ?? '';
  const name        = profile?.first_name && profile?.last_name
                    ? `${profile.first_name} ${profile.last_name}`.trim()
                    : profile?.first_name
                   || kumiiUser.user_metadata?.full_name
                   || kumiiUser.user_metadata?.name
                   || email.split('@')[0];

  // ── Upsert into hub's profiles table ──────────────────────────────────────
  // Schema expected:
  //   public.profiles (
  //     id                          uuid primary key,   -- Kumii's user UUID
  //     email                       text,
  //     full_name                   text,
  //     kumii_id                    uuid,
  //     phone                       text,
  //     location                    text,
  //     bio                         text,
  //     organization                text,
  //     persona_type                text,
  //     profile_picture_url         text,
  //     industry_sectors            jsonb,
  //     skills                      jsonb,
  //     interests                   jsonb,
  //     profile_completion_pct      int,
  //     linkedin_url                text,
  //     twitter_url                 text,
  //     startup_company_name        text,
  //     startup_industry            text,
  //     startup_stage               text,
  //     startup_description         text,
  //     startup_location            text,
  //     startup_website             text,
  //     startup_team_size           int,
  //     startup_founded_year        int,
  //     startup_key_products        text,
  //     updated_at                  timestamptz
  //   )
  const upsertRow = {
    id:                      kumiiUserId,
    email,
    full_name:               name,
    kumii_id:                kumiiUserId,
    updated_at:              new Date().toISOString(),
    // Enrich from profile if provided (all fields are optional)
    ...(profile && {
      phone:                       profile.phone                        ?? null,
      location:                    profile.location                     ?? null,
      bio:                         profile.bio                          ?? null,
      organization:                profile.organization                 ?? null,
      persona_type:                profile.persona_type                 ?? null,
      profile_picture_url:         profile.profile_picture_url          ?? null,
      industry_sectors:            profile.industry_sectors             ?? null,
      skills:                      profile.skills                       ?? null,
      interests:                   profile.interests                    ?? null,
      profile_completion_pct:      profile.profile_completion_percentage ?? null,
      linkedin_url:                profile.linkedin_url                 ?? null,
      twitter_url:                 profile.twitter_url                  ?? null,
    }),
    // Flatten startup into profile row (avoids a separate table join on every read)
    ...(startup && {
      startup_company_name:   startup.company_name        ?? null,
      startup_industry:       startup.industry            ?? null,
      startup_stage:          startup.stage               ?? null,
      startup_description:    startup.description         ?? null,
      startup_location:       startup.location            ?? null,
      startup_website:        startup.website             ?? null,
      startup_team_size:      startup.team_size           ?? null,
      startup_founded_year:   startup.founded_year        ?? null,
      startup_key_products:   startup.key_products_services ?? null,
    }),
  };

  const { error: upsertError } = await supabaseAdmin
    .from('profiles')
    .upsert(upsertRow, { onConflict: 'id' });

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
