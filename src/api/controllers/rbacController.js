/**
 * src/api/controllers/rbacController.js
 * RBAC privilege matrix — admin-only.
 *
 * Tabs managed: dashboard | courses | analytics | learners |
 *               assessments | live_sessions | rbac
 *
 * Absence of a row in admin_privileges = full access (granted: true).
 */
'use strict';

const { supabaseAdmin } = require('../../integrations/supabase');
const logger            = require('../../utils/logger');

const ALL_TABS = [
  'dashboard', 'courses', 'analytics',
  'learners', 'assessments', 'live_sessions', 'rbac',
];

/* ── helpers ────────────────────────────────────────────────────────────── */

/** Build a full privilege map for a user, defaulting absent rows to granted. */
function buildPrivilegeMap(rows, userId) {
  const map = {};
  ALL_TABS.forEach((t) => { map[t] = true; }); // default all granted
  rows
    .filter((r) => r.user_id === userId)
    .forEach((r) => { map[r.tab] = r.granted; });
  return map;
}

/* ── GET /api/rbac ──────────────────────────────────────────────────────── */
/**
 * Returns all admin users with their privilege map.
 * Response: { data: [ { id, email, full_name, privileges: { tab: bool } } ] }
 */
async function listAdminPrivileges(req, res) {
  try {
    // 1. Fetch all profiles where role = 'platform_admin' (set by auth/sync from Lovable)
    const { data: profiles, error: profErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('role', 'platform_admin')
      .order('full_name', { ascending: true });

    if (profErr) throw profErr;
    if (!profiles || profiles.length === 0) return res.json({ data: [] });

    const adminIds = profiles.map((p) => p.id);

    // 2. Fetch all privilege rows for these admins
    const { data: privRows, error: privErr } = await supabaseAdmin
      .from('admin_privileges')
      .select('user_id, tab, granted')
      .in('user_id', adminIds);

    if (privErr) throw privErr;

    // 4. Merge into response shape
    const data = profiles.map((p) => ({
      id:         p.id,
      email:      p.email,
      full_name:  p.full_name ?? p.email,
      privileges: buildPrivilegeMap(privRows, p.id),
    }));

    return res.json({ data });
  } catch (err) {
    logger.error('[RBAC] listAdminPrivileges', err);
    return res.status(500).json({ error: 'Failed to load RBAC data' });
  }
}

/* ── GET /api/rbac/my-privileges ────────────────────────────────────────── */
/**
 * Returns the calling admin's own privilege map.
 * Response: { data: { tab: bool } }
 */
async function myPrivileges(req, res) {
  try {
    const { data: rows, error } = await supabaseAdmin
      .from('admin_privileges')
      .select('tab, granted')
      .eq('user_id', req.user.id);

    if (error) throw error;

    const privileges = {};
    ALL_TABS.forEach((t) => { privileges[t] = true; }); // default all granted
    rows.forEach((r) => { privileges[r.tab] = r.granted; });

    return res.json({ data: privileges });
  } catch (err) {
    logger.error('[RBAC] myPrivileges', err);
    return res.status(500).json({ error: 'Failed to load privileges' });
  }
}

/* ── PATCH /api/rbac/:userId ────────────────────────────────────────────── */
/**
 * Upserts privilege rows for a specific admin user.
 * Body: { privileges: { tab: bool, … } }
 * Cannot revoke rbac access from yourself (prevent lockout).
 */
async function updateAdminPrivileges(req, res) {
  const { userId } = req.params;
  const { privileges } = req.body;

  if (!privileges || typeof privileges !== 'object') {
    return res.status(400).json({ error: 'privileges object required' });
  }

  // Self-lockout guard: cannot remove your own rbac privilege
  if (userId === req.user.id && privileges.rbac === false) {
    return res.status(400).json({
      error: 'You cannot revoke your own RBAC access. Another admin must do this.',
    });
  }

  try {
    const upserts = Object.entries(privileges)
      .filter(([tab]) => ALL_TABS.includes(tab))
      .map(([tab, granted]) => ({
        user_id:    userId,
        tab,
        granted:    Boolean(granted),
        updated_by: req.user.id,
      }));

    if (upserts.length === 0) {
      return res.status(400).json({ error: 'No valid tabs provided' });
    }

    const { error } = await supabaseAdmin
      .from('admin_privileges')
      .upsert(upserts, { onConflict: 'user_id,tab' });

    if (error) throw error;

    logger.info(`[RBAC] ${req.user.id} updated privileges for ${userId}`);
    return res.json({ success: true });
  } catch (err) {
    logger.error('[RBAC] updateAdminPrivileges', err);
    return res.status(500).json({ error: 'Failed to update privileges' });
  }
}

module.exports = { listAdminPrivileges, myPrivileges, updateAdminPrivileges };
