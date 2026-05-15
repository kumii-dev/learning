/**
 * src/cms/routes/index.js
 * All CMS routes require admin persona.
 */
'use strict';

const { Router }                    = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const ctrl                          = require('../controllers/cmsController');

const router = Router();

const adminOnly = [authenticate, requireRole('admin')];

router.post('/courses',     ...adminOnly, ctrl.addCourse);
router.post('/modules',     ...adminOnly, ctrl.addModule);
router.post('/assessments', ...adminOnly, ctrl.addAssessment);
router.post('/publish',     ...adminOnly, ctrl.publish);

module.exports = router;
