/**
 * src/cms/controllers/cmsController.js
 */
'use strict';

const path        = require('path');
const { v4: uuid } = require('uuid');
const multer      = require('multer');
const cmsService  = require('../services/cmsService');
const { supabaseAdmin } = require('../../integrations/supabase');
const {
  validate,
  cmsCourseSchema,
  cmsModuleSchema,
  cmsAssessmentSchema,
} = require('../../utils/validate');

/* ── File upload (multer memory storage) ─────────────────────────────────── */
const ALLOWED_MIME = new Set([
  'video/mp4', 'video/webm', 'video/ogg',
  'application/pdf',
  // certificate logos & general images
  'image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml',
]);
const IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']);
const MAX_SIZE = 500 * 1024 * 1024; // 500 MB

const _upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Unsupported file type: ${file.mimetype}`));
  },
}).single('file');

const uploadFile = (req, res, next) => {
  _upload(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file provided' });

    try {
      const ext      = path.extname(req.file.originalname) || '';
      // Images (logos) go into logos/ folder; everything else into modules/
      const folder   = IMAGE_MIME.has(req.file.mimetype) ? 'logos' : 'modules';
      const filePath = `${folder}/${uuid()}${ext}`;
      const { error: upErr } = await supabaseAdmin.storage
        .from('course-content')
        .upload(filePath, req.file.buffer, {
          contentType: req.file.mimetype,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('course-content')
        .getPublicUrl(filePath);

      res.json({ url: publicUrl, path: filePath });
    } catch (e) {
      next(e);
    }
  });
};

/* ── Courses ──────────────────────────────────────────────────────────────── */

const listCourses = async (req, res, next) => {
  try {
    const courses = await cmsService.listCoursesAdmin();
    res.json({ data: courses });
  } catch (err) { next(err); }
};

const getCourse = async (req, res, next) => {
  try {
    const course = await cmsService.getCourseById(req.params.id);
    res.json({ data: course });
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

/* ── Assessment Results ───────────────────────────────────────────────────── */

const listAssessmentResults = async (req, res, next) => {
  try {
    const { courseId, status, limit } = req.query;
    const results = await cmsService.listAssessmentResults({
      courseId: courseId || undefined,
      status:   status   || undefined,
      limit:    limit ? parseInt(limit, 10) : 200,
    });
    res.json({ data: results });
  } catch (err) { next(err); }
};

/* ── Live Sessions ────────────────────────────────────────────────────────── */

const listAdminSessions = async (req, res, next) => {
  try {
    const sessions = await cmsService.listAdminSessions();
    res.json({ data: sessions });
  } catch (err) { next(err); }
};

const createAdminSession = async (req, res, next) => {
  try {
    if (!req.body.title || !req.body.scheduledAt) {
      return res.status(400).json({ error: 'title and scheduledAt are required' });
    }
    const session = await cmsService.createAdminSession(req.body);
    res.status(201).json({ data: session });
  } catch (err) { next(err); }
};

const updateAdminSession = async (req, res, next) => {
  try {
    const session = await cmsService.updateAdminSession(req.params.id, req.body);
    res.json({ data: session });
  } catch (err) { next(err); }
};

const deleteAdminSession = async (req, res, next) => {
  try {
    await cmsService.deleteAdminSession(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

module.exports = {
  listCourses, getCourse, addCourse, updateCourse, deleteCourse, publishCourse, unpublishCourse,
  addModule, upsertModules,
  addAssessment, upsertAssessment,
  publish,
  analyticsOverview, analyticsCourse,
  listLearners,
  listAssessmentResults,
  uploadFile,
  listAdminSessions, createAdminSession, updateAdminSession, deleteAdminSession,
};
