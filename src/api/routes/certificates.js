/**
 * src/api/routes/certificates.js
 */
'use strict';

const { Router }       = require('express');
const { authenticate } = require('../../middleware/auth');
const ctrl             = require('../controllers/certificatesController');

const router = Router();

router.get('/',         authenticate, ctrl.listMine);
router.get('/:id',      ctrl.verify);   // Public — no auth — for external verification links

module.exports = router;
