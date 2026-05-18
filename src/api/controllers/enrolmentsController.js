/**
 * src/api/controllers/enrolmentsController.js
 */
'use strict';

const enrolmentsService               = require('../services/enrolmentsService');
const { validate, enrolmentSchema }   = require('../../utils/validate');

const enrol = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(enrolmentSchema, req.body);
    if (!success) return res.status(400).json({ errors });

    const enrolment = await enrolmentsService.enrolUser(req.user.id, data.courseId, req.user.email);
    res.status(201).json({ data: enrolment });
  } catch (err) { next(err); }
};

const listMine = async (req, res, next) => {
  try {
    const enrolments = await enrolmentsService.getUserEnrolments(req.user.id);
    res.json({ data: enrolments });
  } catch (err) { next(err); }
};

module.exports = { enrol, listMine };
