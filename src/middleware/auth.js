/**
 * src/middleware/auth.js
 * JWT authentication middleware for every protected Express route.
 *
 * Extracts:   Authorization: Bearer <token>
 * Validates:  JWT signature against Supabase JWKS (never trusts client claims)
 * Admin role: verified via has_role(_user_id, _role) RPC — matches public.user_roles
 * Attaches:   req.user = { id, email, persona, isAdmin }
 */

'use strict';

const { createRemoteJWKSet, jwtVerify } = require('jose');
const { supabaseAdmin }                 = require('../integrations/supabase');
const logger                            = require('../utils/logger');

const SUPABASE_URL = process.env.SUPABASE_URL;

// JWKS endpoint is stable for the lifetime of the Supabase project
const JWKS = createRemoteJWKSet(
  new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`)
);

/**
 * Verify the bearer JWT cryptographically via JWKS.
 * Returns the decoded payload on success, throws on failure.
 */
async function verifyJWT(token) {
  const { payload } = await jwtVerify(token, JWKS, {
    issuer: `${SUPABASE_URL}/auth/v1`,
  });
  return payload; // { sub, email, ... }
}

/**
 * Call the has_role(_user_id, _role) Postgres RPC.
 * Uses supabaseAdmin (service role) so RLS on user_roles does not block it.
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

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token   = authHeader.split(' ')[1];
    const payload = await verifyJWT(token);

    const userId  = payload.sub;
    const email   = payload.email ?? '';
    const isAdmin = await checkHasRole(userId, 'admin');

    // Attach a normalised user object — persona derived from DB, never from JWT claims
    req.user = {
      id:      userId,
      email,
      persona: isAdmin ? 'admin' : 'learner',
      isAdmin,
    };

    next();
  } catch (err) {
    logger.warn('Auth middleware rejected request', { message: err.message });
    return res.status(401).json({ error: 'Unauthorised' });
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


module.exports = { authenticate, requireRole };
