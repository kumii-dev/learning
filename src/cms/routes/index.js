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

/* ── Courses ─────────────────────────────────────────────────────────────── */
router.get('/courses',                   ...adminOnly, ctrl.listCourses);
router.get('/courses/:id',               ...adminOnly, ctrl.getCourse);
router.post('/courses',                  ...adminOnly, ctrl.addCourse);
router.put('/courses/:id',               ...adminOnly, ctrl.updateCourse);
router.delete('/courses/:id',            ...adminOnly, ctrl.deleteCourse);
router.post('/courses/:id/publish',      ...adminOnly, ctrl.publishCourse);
router.post('/courses/:id/unpublish',    ...adminOnly, ctrl.unpublishCourse);

/* ── File upload ─────────────────────────────────────────────────────────── */
router.post('/upload',                   ...adminOnly, ctrl.uploadFile);

/* ── Modules ─────────────────────────────────────────────────────────────── */
router.post('/modules',                  ...adminOnly, ctrl.addModule);
router.put('/modules',                   ...adminOnly, ctrl.upsertModules);

/* ── Assessments ─────────────────────────────────────────────────────────── */
router.post('/assessments',              ...adminOnly, ctrl.addAssessment);
router.put('/assessments',               ...adminOnly, ctrl.upsertAssessment);

/* ── Legacy publish (body-based) ─────────────────────────────────────────── */
router.post('/publish',                  ...adminOnly, ctrl.publish);

/* ── Analytics ───────────────────────────────────────────────────────────── */
router.get('/analytics/overview',        ...adminOnly, ctrl.analyticsOverview);
router.get('/analytics/courses/:id',     ...adminOnly, ctrl.analyticsCourse);

/* ── Learners ─────────────────────────────────────────────────────────────── */
router.get('/learners',                  ...adminOnly, ctrl.listLearners);

module.exports = router;
