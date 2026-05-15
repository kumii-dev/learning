/**
 * src/api/routes/grading.js
 */
'use strict';

const { Router }                  = require('express');
const { authenticate, requireRole } = require('../../middleware/auth');
const ctrl                        = require('../controllers/gradingController');

const router = Router();

// Only admin or instructor personas can apply manual grades
router.post('/', authenticate, requireRole('admin', 'instructor'), ctrl.grade);

module.exports = router;
