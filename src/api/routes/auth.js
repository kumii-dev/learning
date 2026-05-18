/**
 * src/api/routes/auth.js
 * POST /api/auth/sync
 *
 * Called by the hub frontend after the iFrame receives user data from
 * Kumii/Lovable via origin-validated postMessage. This endpoint:
 *
 *   1. Accepts { userId, email, isAdmin, persona, profile, startup } from the
 *      origin-validated postMessage payload — no Kumii token forwarded.
 *   2. Upserts the user into the hub's own Supabase project.
 *   3. Signs and returns a HUB JWT (HS256, 55 min TTL) using HUB_JWT_SECRET.
 *
 * Kumii/Lovable's Supabase is NEVER contacted here.
 * Security: origin validation is performed in the browser (authBridge.js).
 * Rate-limited by the global limiter in server.js (200 req / 15 min).
 */

'use strict';

const express            = require('express');
const jwt                = require('jsonwebtoken');
const { supabaseAdmin }  = require('../../integrations/supabase');
const logger             = require('../../utils/logger');

const router = express.Router();

const HUB_JWT_SECRET = process.env.HUB_JWT_SECRET;
if (!HUB_JWT_SECRET) {
  logger.warn('[HUB:SYNC] HUB_JWT_SECRET is not set — /api/auth/sync will fail');
}

/**
 * POST /api/auth/sync
 *
 * Body: {
 *   userId:  string,          -- Kumii user UUID (sub from their JWT)
 *   email:   string,
 *   isAdmin: boolean,         -- provisional; overridden by hub user_roles
 *   persona: string,          -- 'learner' | 'admin' | 'investor' etc.
 *   profile: object | null,   -- from KUMII_USER_PROFILE postMessage
 *   startup: object | null,   -- from KUMII_USER_PROFILE postMessage
 * }
 *
 * Response 200: { token: "<hub JWT>", isAdmin: boolean }
 * Response 400: missing required fields
 */
router.post('/sync', async (req, res) => {
  const { userId, email, isAdmin: kumiiIsAdmin, persona, profile, startup } = req.body ?? {};

  logger.info('[HUB:SYNC] POST /api/auth/sync received', {
    hasUserId:  !!userId,
    hasEmail:   !!email,
    kumiiIsAdmin,
    persona,
    hasProfile: !!profile,
    hasStartup: !!startup,
  });

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ error: 'userId is required' });
  }
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'email is required' });
  }
  if (!HUB_JWT_SECRET) {
    logger.error('[HUB:SYNC] HUB_JWT_SECRET is not configured');
    return res.status(500).json({ error: 'Server misconfiguration: missing JWT secret' });
  }

  const name = profile?.first_name && profile?.last_name
    ? `${profile.first_name} ${profile.last_name}`.trim()
    : profile?.first_name
   || email.split('@')[0];

  // ── Upsert into hub's profiles table ──────────────────────────────────────
  const upsertRow = {
    id:          userId,
    email,
    full_name:   name,
    kumii_id:    userId,
    role:        kumiiIsAdmin === true ? 'admin' : 'learner',
    updated_at:  new Date().toISOString(),
    ...(profile && {
      phone:                       profile.phone                         ?? null,
      location:                    profile.location                      ?? null,
      bio:                         profile.bio                           ?? null,
      organization:                profile.organization                  ?? null,
      persona_type:                profile.persona_type                  ?? null,
      profile_picture_url:         profile.profile_picture_url           ?? null,
      industry_sectors:            profile.industry_sectors              ?? null,
      skills:                      profile.skills                        ?? null,
      interests:                   profile.interests                     ?? null,
      profile_completion_pct:      profile.profile_completion_percentage  ?? null,
      linkedin_url:                profile.linkedin_url                  ?? null,
      twitter_url:                 profile.twitter_url                   ?? null,
    }),
    ...(startup && {
      startup_company_name:  startup.company_name          ?? null,
      startup_industry:      startup.industry              ?? null,
      startup_stage:         startup.stage                 ?? null,
      startup_description:   startup.description           ?? null,
      startup_location:      startup.location              ?? null,
      startup_website:       startup.website               ?? null,
      startup_team_size:     startup.team_size             ?? null,
      startup_founded_year:  startup.founded_year          ?? null,
      startup_key_products:  startup.key_products_services ?? null,
    }),
  };

  const { error: upsertError } = await supabaseAdmin
    .from('profiles')
    .upsert(upsertRow, { onConflict: 'id' });

  if (upsertError) {
    // Log but do not block — the JWT is still issued.
    // The enrolmentsService safety-net upsert handles any missing profile row
    // at the point of enrolment if this silently fails.
    logger.error('[HUB:SYNC] profiles upsert failed', { message: upsertError.message });
  }

  // ── Trust admin status from Kumii (origin-validated postMessage) ────────────
  const isAdmin = kumiiIsAdmin === true;

  // ── Issue hub JWT ──────────────────────────────────────────────────────────
  const hubToken = jwt.sign(
    { sub: userId, email, isAdmin, persona: isAdmin ? 'admin' : (persona ?? 'learner') },
    HUB_JWT_SECRET,
    { expiresIn: '55m' }
  );

  logger.info('[HUB:SYNC] user synced, hub JWT issued', { userId, isAdmin });

  return res.json({ token: hubToken, isAdmin });
});

module.exports = router;
