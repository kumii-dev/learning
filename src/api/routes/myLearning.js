/**
 * src/api/routes/myLearning.js
 */
'use strict';

const { Router }       = require('express');
const { authenticate } = require('../../middleware/auth');
const ctrl             = require('../controllers/myLearningController');

const router = Router();

router.get('/', authenticate, ctrl.getDashboard);

module.exports = router;
