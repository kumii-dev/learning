/**
 * src/middleware/auth.js
 * JWT authentication middleware for every protected Express route.
 *
 * Auth flow:
 *  1.  Kumii/Lovable sends the logged-in user via postMessage.
 *  2.  The hub frontend calls POST /api/auth/sync which upserts the user
 *      into the hub's own Supabase (njcancswtqnxihxavshl).
 *  3.  Every subsequent API request carries the Kumii JWT as Bearer token.
 *  4.  This middleware verifies the JWT signature against Kumii's PUBLIC
 *      JWKS endpoint (read-only URL — no Kumii credentials required), then
 *      checks the hub's OWN user_roles table for admin status.
 *
 * Attaches:  req.user = { id, email, persona, isAdmin }
 */

'use strict';

const { createRemoteJWKSet, jwtVerify } = require('jose');
const { supabaseAdmin }                 = require('../integrations/supabase');
const logger                            = require('../utils/logger');

// Kumii's Supabase project ref — used ONLY to hit the public JWKS URL.
// No secret key is read from or written to Kumii's project.
const KUMII_SUPABASE_URL = process.env.KUMII_SUPABASE_URL
  || 'https://qypazgkngxhazgkuevwq.supabase.co';

// JWKS is a public, unauthenticated endpoint — safe to call with no credentials
const KUMII_JWKS = createRemoteJWKSet(
  new URL(`${KUMII_SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

/**
 * Verify the bearer JWT against Kumii's public JWKS.
 * Returns the decoded payload on success, throws on failure.
 */
async function verifyJWT(token) {
  // Log the first 40 chars of the token so we can confirm it arrives and is
  // a JWT (starts with "eyJ") without ever logging the full secret.
  const preview = token ? `${token.slice(0, 40)}…` : '(empty)';
  logger.info('[HUB:AUTH] verifyJWT called', {
    tokenPreview: preview,
    tokenLength:  token?.length ?? 0,
    looksLikeJWT: token?.startsWith('eyJ') ?? false,
  });

  try {
    const { payload } = await jwtVerify(token, KUMII_JWKS, {
      issuer: `${KUMII_SUPABASE_URL}/auth/v1`,
    });
    logger.info('[HUB:AUTH] JWT verified OK', {
      sub:    payload.sub,
      iss:    payload.iss,
      role:   payload.role,
      exp:    payload.exp,
      nowUtc: Math.floor(Date.now() / 1000),
    });
    return payload;
  } catch (err) {
    // Log the full error class and message — this is the key diagnostic
    logger.warn('[HUB:AUTH] jwtVerify FAILED', {
      errorName:    err.name,       // JWTExpired | JWTInvalid | JWTClaimValidationFailed | …
      errorMessage: err.message,
      errorCode:    err.code,       // ERR_JWT_EXPIRED | ERR_JWK_… etc.
      tokenPreview: preview,
      expectedIssuer: `${KUMII_SUPABASE_URL}/auth/v1`,
      jwksUrl: `${KUMII_SUPABASE_URL}/auth/v1/.well-known/jwks.json`,
    });
    throw err;
  }
}

/**
 * Check the hub's OWN user_roles table for admin status.
 * The user must have been synced via POST /api/auth/sync first.
 * Returns true | false.
 */
async function checkHasRole(userId, role) {
  const { data, error } = await supabaseAdmin.rpc('has_role', {
    _user_id: userId,
    _role:    role,
  });
  if (error) {
    logger.warn('has_role RPC error', { userId, role, message: error.message });
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
      method:    req.method,
      path:      req.path,
      hasHeader: !!authHeader,
      headerPrefix: authHeader ? authHeader.slice(0, 14) : '(none)',
    });

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('[HUB:AUTH] Missing or malformed Authorization header');
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token   = authHeader.split(' ')[1];
    const payload = await verifyJWT(token);

    const userId  = payload.sub;
    const email   = payload.email ?? '';
    const isAdmin = await checkHasRole(userId, 'admin');

    logger.info('[HUB:AUTH] authenticate OK', { isAdmin });

    // Attach a normalised user object — persona derived from DB, never from JWT claims
    req.user = {
      id:      userId,
      email,
      persona: isAdmin ? 'admin' : 'learner',
      isAdmin,
    };

    next();
  } catch (err) {
    logger.warn('[HUB:AUTH] authenticate rejected', {
      name:    err.name,
      message: err.message,
      code:    err.code,
    });
    return res.status(401).json({ error: 'Unauthorised', detail: err.name });
  }
}

/**
 * Role guard factory.
 * Usage:  router.post('/cms/courses', authenticate, requireRole('admin'), ...)
 *
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
