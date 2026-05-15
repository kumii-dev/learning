/**
 * src/api/routes/assessments.js
 */
'use strict';

const { Router }       = require('express');
const { authenticate } = require('../../middleware/auth');
const ctrl             = require('../controllers/assessmentsController');

const router = Router();

router.get('/:id',        authenticate, ctrl.getOne);
router.post('/:id/submit', authenticate, ctrl.submit);

module.exports = router;
