/**
 * client/src/lib/personaGuard.js
 * Client-side UX helpers — hide/show UI elements based on isAdmin flag
 * from the authBridge payload.
 *
 * SECURITY NOTE: These checks are UX only.
 * Real admin enforcement happens server-side via JWT + has_role RPC.
 */

import { getIsAdmin, getPersona } from './authBridge';

/**
 * Returns true if the current user is an admin (UX hint only).
 */
export function isAdmin() {
  return getIsAdmin() === true;
}

/**
 * Returns true if persona matches any of the provided roles.
 * @param {...string} roles - e.g. 'admin', 'instructor', 'learner'
 */
export function hasPersona(...roles) {
  return roles.includes(getPersona());
}

/**
 * React helper — renders children only when isAdmin is true.
 * Usage:
 *   <AdminOnly><CMSNavLink /></AdminOnly>
 */
export function AdminOnly({ children, fallback = null }) {
  return isAdmin() ? children : fallback;
}
