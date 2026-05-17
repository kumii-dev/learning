/**
 * src/api/routes/liveSessions.js
 * Live sessions are readable by any authenticated user.
 */
'use strict';

const { Router }      = require('express');
const { authenticate } = require('../../middleware/auth');
const ctrl             = require('../controllers/liveSessionsController');

const router = Router();

router.get('/', authenticate, ctrl.listLiveSessions);

module.exports = router;
