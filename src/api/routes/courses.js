/**
 * src/api/routes/courses.js
 */
'use strict';

const { Router }            = require('express');
const { authenticate }      = require('../../middleware/auth');
const ctrl                  = require('../controllers/coursesController');

const router = Router();

router.get('/',                  authenticate, ctrl.list);
router.get('/recommendations',   authenticate, ctrl.recommendations);
router.get('/:id',               authenticate, ctrl.getOne);

module.exports = router;
