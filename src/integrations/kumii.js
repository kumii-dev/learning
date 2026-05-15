/**
 * src/integrations/kumii.js
 * Utilities for communicating with the Kumii Platform (host system).
 * Server-side helpers only — postMessage lives in the frontend authBridge.
 */

'use strict';

const KUMII_HOST_ORIGIN = process.env.KUMII_HOST_ORIGIN || 'http://localhost:3000';

/**
 * List of origins that are trusted to send postMessages to the Learning Hub.
 * Sourced from env so it can be expanded without code changes.
 */
const TRUSTED_ORIGINS = (process.env.KUMII_TRUSTED_ORIGINS || KUMII_HOST_ORIGIN)
  .split(',')
  .map((o) => o.trim());

/**
 * Verify that a postMessage event.origin is in the trusted list.
 * Exported so the Next.js frontend authBridge can import this list via an API
 * endpoint if needed, keeping the origins server-authoritative.
 */
function isTrustedOrigin(origin) {
  return TRUSTED_ORIGINS.includes(origin);
}

module.exports = { isTrustedOrigin, TRUSTED_ORIGINS, KUMII_HOST_ORIGIN };
