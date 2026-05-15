/**
 * src/integrations/supabase.js
 * Supabase client singletons — one for public (anon) operations,
 * one for privileged server-side operations (service role).
 */

'use strict';

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
}

/**
 * Server-side admin client — bypasses RLS.
 * Use ONLY inside services, never exposed to the client.
 */
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

/**
 * Validate a JWT issued by Supabase and return the decoded user.
 * Used by the auth middleware.
 *
 * @param {string} token
 * @returns {Promise<{ id: string, email: string, [key: string]: unknown }>}
 */
async function verifyToken(token) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) {
    const err = new Error('Invalid or expired token');
    err.status = 401;
    throw err;
  }
  return data.user;
}

module.exports = { supabaseAdmin, verifyToken };
