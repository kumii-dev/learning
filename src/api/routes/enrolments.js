/**
 * src/api/routes/enrolments.js
 */
'use strict';

const { Router }       = require('express');
const { authenticate } = require('../../middleware/auth');
const ctrl             = require('../controllers/enrolmentsController');

const router = Router();

router.post('/',        authenticate, ctrl.enrol);
router.get('/',         authenticate, ctrl.listMine);
router.patch('/:id',    authenticate, ctrl.updateProgress);

module.exports = router;
