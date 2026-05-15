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

const addCourse = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(cmsCourseSchema, req.body);
    if (!success) return res.status(400).json({ errors });
    const course = await cmsService.createCourse(data);
    res.status(201).json({ data: course });
  } catch (err) { next(err); }
};

const addModule = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(cmsModuleSchema, req.body);
    if (!success) return res.status(400).json({ errors });
    const module = await cmsService.createModule(data);
    res.status(201).json({ data: module });
  } catch (err) { next(err); }
};

const addAssessment = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(cmsAssessmentSchema, req.body);
    if (!success) return res.status(400).json({ errors });
    const assessment = await cmsService.createAssessment(data);
    res.status(201).json({ data: assessment });
  } catch (err) { next(err); }
};

const publish = async (req, res, next) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ errors: ['courseId is required'] });
    const course = await cmsService.publishCourse(courseId);
    res.json({ data: course });
  } catch (err) { next(err); }
};

module.exports = { addCourse, addModule, addAssessment, publish };
