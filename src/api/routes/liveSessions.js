/**
 * src/api/routes/liveSessions.js
 */
'use strict';

const { Router }                    = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const ctrl                          = require('../controllers/liveSessionsController');

const router = Router();
const adminOnly = [authenticate, requireRole('admin')];

router.get('/',                authenticate,   ctrl.listLiveSessions);
router.post('/',               ...adminOnly,    ctrl.createLiveSession);
router.patch('/:id',           ...adminOnly,    ctrl.updateLiveSession);
router.delete('/:id',          ...adminOnly,    ctrl.deleteLiveSession);
router.post('/:id/rsvp',       authenticate,   ctrl.rsvpLiveSession);
router.get('/:id/recordings',  ...adminOnly,    ctrl.getSessionRecordings);

module.exports = router;
