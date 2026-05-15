/**
 * src/middleware/auth.js
 * JWT authentication middleware for every protected Express route.
 *
 * Auth flow:
 *  1.  Kumii/Lovable sends the logged-in user via postMessage.
 *  2.  The hub frontend calls POST /api/auth/sync which upserts the user
 *      into the hub's own Supabase (njcancswtqnxihxavshl).
 *  3.  Every subsequent API request carries the Kumii JWT as Bearer token.
 *  4.  This middleware validates the token by calling auth.getUser() on
 *      Kumii's Supabase using their public ANON key — Kumii's own auth
 *      server verifies the HS256 signature. No Kumii secret is required.
 *  5.  Admin status is checked in the hub's OWN user_roles table.
 *
 * Why not JWKS?  Supabase issues HS256 (symmetric HMAC) tokens by default.
 * createRemoteJWKSet only supports asymmetric algorithms (RS256/ES256).
 * Using auth.getUser() delegates verification to Kumii's auth server, which
 * is the correct approach for symmetric JWTs from a third-party project.
 *
 * Attaches:  req.user = { id, email, persona, isAdmin }
 */

'use strict';

const { createClient }  = require('@supabase/supabase-js');
const { supabaseAdmin } = require('../integrations/supabase');
const logger            = require('../utils/logger');

// ── Kumii's Supabase — used only for auth.getUser() token validation ──────────
// The anon key is the PUBLIC key (same one every browser user already has).
// No service-role key or secret is needed.
const KUMII_SUPABASE_URL      = process.env.KUMII_SUPABASE_URL
  || 'https://qypazgkngxhazgkuevwq.supabase.co';
const KUMII_SUPABASE_ANON_KEY = process.env.KUMII_SUPABASE_ANON_KEY;

if (!KUMII_SUPABASE_ANON_KEY) {
  logger.warn('[HUB:AUTH] KUMII_SUPABASE_ANON_KEY is not set — token validation will fail');
}

// Single shared client (no session persistence — stateless per request)
const kumiiAuthClient = createClient(KUMII_SUPABASE_URL, KUMII_SUPABASE_ANON_KEY || 'missing', {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Validate the bearer token by asking Kumii's auth server.
 * Returns { id, email } on success, throws on failure.
 */
async function verifyToken(token) {
  const preview = token ? `${token.slice(0, 40)}…` : '(empty)';
  logger.info('[HUB:AUTH] verifyToken called', {
    tokenLength:  token?.length ?? 0,
    looksLikeJWT: token?.startsWith('eyJ') ?? false,
    tokenPreview: preview,
  });

  const { data, error } = await kumiiAuthClient.auth.getUser(token);

  if (error || !data?.user) {
    logger.warn('[HUB:AUTH] getUser FAILED', {
      errorMessage: error?.message,
      errorStatus:  error?.status,
      tokenPreview: preview,
      kumiiUrl:     KUMII_SUPABASE_URL,
      hasAnonKey:   !!KUMII_SUPABASE_ANON_KEY,
    });
    throw Object.assign(new Error(error?.message || 'Token invalid'), {
      name: 'TokenValidationFailed',
    });
  }

  logger.info('[HUB:AUTH] getUser OK', { id: data.user.id });
  return { id: data.user.id, email: data.user.email ?? '' };
}

/**
 * Check the hub's OWN user_roles table for admin status.
 * Returns true | false.
 */
async function checkHasRole(userId, role) {
  const { data, error } = await supabaseAdmin.rpc('has_role', {
    _user_id: userId,
    _role:    role,
  });
  if (error) {
    logger.warn('[HUB:AUTH] has_role RPC error', { userId, role, message: error.message });
    return false;
  }
  return data === true;
}

/**
 * @type {import('express').RequestHandler}
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    logger.info('[HUB:AUTH] authenticate called', {
      method:       req.method,
      path:         req.path,
      hasHeader:    !!authHeader,
      headerPrefix: authHeader ? authHeader.slice(0, 14) : '(none)',
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[HUB:AUTH] Missing or malformed Authorization header');
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token           = authHeader.split(' ')[1];
    const { id, email }   = await verifyToken(token);
    const isAdmin         = await checkHasRole(id, 'admin');

    logger.info('[HUB:AUTH] authenticate OK', { isAdmin });

    req.user = {
      id,
      email,
      persona: isAdmin ? 'admin' : 'learner',
      isAdmin,
    };

    next();
  } catch (err) {
    logger.warn('[HUB:AUTH] authenticate rejected', {
      name:    err.name,
      message: err.message,
    });
    return res.status(401).json({ error: 'Unauthorised', detail: err.name });
  }
}

/**
 * Role guard factory.
 * @param {...string} roles
 * @returns {import('express').RequestHandler}
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorised' });
    }
    if (!roles.includes(req.user.persona)) {
      return res.status(403).json({ error: `Forbidden: requires role ${roles.join(' or ')}` });
    }
    next();
  };
}

module.exports = { authenticate, requireRole };
