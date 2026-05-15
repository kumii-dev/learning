/**
 * src/integrations/supabase.js
 * Supabase client singleton for the hub's own project (njcancswtqnxihxavshl).
 *
 * Auth architecture note:
 *   Kumii/Lovable is the identity provider — it authenticates users and sends
 *   them to the hub via iFrame postMessage. The hub accepts those users and
 *   upserts them into its OWN Supabase project (see POST /api/auth/sync).
 *   JWT verification uses Kumii's PUBLIC JWKS URL — no Kumii credentials needed.
 *   All role checks (admin / learner) run against the hub's own user_roles table.
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

/**
 * Hub's server-side admin client — bypasses RLS on the hub's own DB.
 * Use ONLY inside services/routes, never expose to the client.
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

module.exports = { supabaseAdmin };
