/**
 * src/middleware/auth.js
 * JWT authentication middleware for every protected Express route.
 *
 * Extracts:   Authorization: Bearer <token>
 * Validates:  via Supabase verifyToken()
 * Attaches:   req.user = { id, email, persona }
 */

'use strict';

const { verifyToken } = require('../integrations/supabase');
const logger          = require('../utils/logger');

/**
 * @type {import('express').RequestHandler}
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const supabaseUser = await verifyToken(token);

    // Attach a normalised user object to the request
    req.user = {
      id:      supabaseUser.id,
      email:   supabaseUser.email,
      persona: supabaseUser.user_metadata?.persona ?? 'learner',
    };

    next();
  } catch (err) {
    logger.warn('Auth middleware rejected request', { message: err.message });
    return res.status(err.status || 401).json({ error: err.message || 'Unauthorised' });
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
