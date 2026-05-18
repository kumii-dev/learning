/**
 * src/api/routes/courses.js
 */
'use strict';

const { Router }            = require('express');
const { authenticate }      = require('../../middleware/auth');
const ctrl                  = require('../controllers/coursesController');

const router = Router();

// Course browsing is public — no JWT needed to read course listings
router.get('/',                  ctrl.list);
router.get('/:id',               ctrl.getOne);

// Personalised recommendations still require a logged-in user
router.get('/recommendations',   authenticate, ctrl.recommendations);

module.exports = router;
