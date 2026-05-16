/**
 * src/cms/controllers/cmsController.js
 */
'use strict';

const cmsService = require('../services/cmsService');
const {
  validate,
  cmsCourseSchema,
  cmsModuleSchema,
  cmsAssessmentSchema,
} = require('../../utils/validate');

/* ── Courses ──────────────────────────────────────────────────────────────── */

const listCourses = async (req, res, next) => {
  try {
    const courses = await cmsService.listCoursesAdmin();
    res.json({ data: courses });
  } catch (err) { next(err); }
};

const addCourse = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(cmsCourseSchema, req.body);
    if (!success) return res.status(400).json({ errors });
    const course = await cmsService.createCourse(data);
    res.status(201).json({ data: course });
  } catch (err) { next(err); }
};

const updateCourse = async (req, res, next) => {
  try {
    const course = await cmsService.updateCourse(req.params.id, req.body);
    res.json({ data: course });
  } catch (err) { next(err); }
};

const deleteCourse = async (req, res, next) => {
  try {
    await cmsService.deleteCourse(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const publishCourse = async (req, res, next) => {
  try {
    const course = await cmsService.publishCourse(req.params.id);
    res.json({ data: course });
  } catch (err) { next(err); }
};

const unpublishCourse = async (req, res, next) => {
  try {
    const course = await cmsService.unpublishCourse(req.params.id);
    res.json({ data: course });
  } catch (err) { next(err); }
};

/* ── Modules ──────────────────────────────────────────────────────────────── */

const addModule = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(cmsModuleSchema, req.body);
    if (!success) return res.status(400).json({ errors });
    const module = await cmsService.createModule(data);
    res.status(201).json({ data: module });
  } catch (err) { next(err); }
};

const upsertModules = async (req, res, next) => {
  try {
    const { courseId, modules } = req.body;
    if (!courseId) return res.status(400).json({ errors: ['courseId is required'] });
    const result = await cmsService.upsertModules(courseId, modules ?? []);
    res.json({ data: result });
  } catch (err) { next(err); }
};

/* ── Assessments ──────────────────────────────────────────────────────────── */

const addAssessment = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(cmsAssessmentSchema, req.body);
    if (!success) return res.status(400).json({ errors });
    const assessment = await cmsService.createAssessment(data);
    res.status(201).json({ data: assessment });
  } catch (err) { next(err); }
};

const upsertAssessment = async (req, res, next) => {
  try {
    const { courseId, ...rest } = req.body;
    if (!courseId) return res.status(400).json({ errors: ['courseId is required'] });
    const assessment = await cmsService.upsertAssessment(courseId, rest);
    res.json({ data: assessment });
  } catch (err) { next(err); }
};

/* ── Legacy publish (body-based) ──────────────────────────────────────────── */
const publish = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ errors: ['courseId is required'] });
    const course = await cmsService.publishCourse(courseId);
    res.json({ data: course });
  } catch (err) { next(err); }
};

/* ── Analytics ────────────────────────────────────────────────────────────── */

const analyticsOverview = async (req, res, next) => {
  try {
    const stats = await cmsService.analyticsOverview();
    res.json({ data: stats });
  } catch (err) { next(err); }
};

const analyticsCourse = async (req, res, next) => {
  try {
    const stats = await cmsService.analyticsCourse(req.params.id);
    res.json({ data: stats });
  } catch (err) { next(err); }
};

/* ── Learners ─────────────────────────────────────────────────────────────── */

const listLearners = async (req, res, next) => {
  try {
    const learners = await cmsService.listLearners();
    res.json({ data: learners });
  } catch (err) { next(err); }
};

module.exports = {
  listCourses, addCourse, updateCourse, deleteCourse, publishCourse, unpublishCourse,
  addModule, upsertModules,
  addAssessment, upsertAssessment,
  publish,
  analyticsOverview, analyticsCourse,
  listLearners,
