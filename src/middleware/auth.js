/**
 * src/middleware/auth.js
 * JWT authentication middleware for every protected Express route.
 *
 * Auth flow:
 *  1.  Kumii/Lovable sends the logged-in user via postMessage (origin-validated).
 *  2.  The hub frontend calls POST /api/auth/sync with the user identity fields.
 *  3.  /api/auth/sync upserts the user into hub's own Supabase and returns a
 *      HUB JWT signed with HUB_JWT_SECRET.
 *  4.  Every subsequent API request carries that hub JWT as the Bearer token.
 *  5.  This middleware verifies the hub JWT locally — no external call needed.
 *  6.  Admin status is checked in the hub's OWN user_roles table.
 *
 * Kumii/Lovable's Supabase is NEVER contacted here.
 *
 * Attaches: req.user = { id, email, persona, isAdmin }
 */

'use strict';

const jwt               = require('jsonwebtoken');
const { supabaseAdmin } = require('../integrations/supabase');
const logger            = require('../utils/logger');

const HUB_JWT_SECRET = process.env.HUB_JWT_SECRET;
if (!HUB_JWT_SECRET) {
  logger.warn('[HUB:AUTH] HUB_JWT_SECRET is not set — all authenticated requests will fail');
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

    const token = authHeader.slice(7);

    if (!HUB_JWT_SECRET) {
      logger.error('[HUB:AUTH] HUB_JWT_SECRET is not configured');
      return res.status(500).json({ error: 'Server misconfiguration: missing JWT secret' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, HUB_JWT_SECRET);
    } catch (err) {
      logger.warn('[HUB:AUTH] hub JWT invalid', {
        name: err.name, message: err.message, path: req.path,
      });
      return res.status(401).json({ error: 'Unauthorised', detail: err.name });
    }

    const userId  = decoded.sub;
    const email   = decoded.email ?? '';
    const isAdmin = decoded.isAdmin === true;

    logger.info('[HUB:AUTH] authenticate OK', { isAdmin });

    req.user = {
      id:      userId,
      email,
      persona: isAdmin ? 'admin' : 'learner',
      isAdmin,
    };

    next();
  } catch (err) {
    logger.error('[HUB:AUTH] unexpected error', { message: err.message });
    return res.status(500).json({ error: 'Internal server error' });
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
