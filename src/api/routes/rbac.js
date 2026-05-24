/**
 * src/api/routes/rbac.js
 * Admin RBAC privilege matrix routes — all require admin role.
 */
'use strict';

const { Router }                    = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const ctrl                          = require('../controllers/rbacController');

const router   = Router();
const adminOnly = [authenticate, requireRole('admin')];

// Get all admins with their privilege maps (for the matrix UI)
router.get('/',                   ...adminOnly, ctrl.listAdminPrivileges);

// Get the calling admin's own privilege map (used by AdminLayout to filter nav)
router.get('/my-privileges',      ...adminOnly, ctrl.myPrivileges);

// Update a specific admin's privileges
router.patch('/:userId',          ...adminOnly, ctrl.updateAdminPrivileges);

module.exports = router;
