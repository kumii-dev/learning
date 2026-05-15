/**
 * src/api/controllers/assessmentsController.js
 */
'use strict';

const assessmentsService                        = require('../services/assessmentsService');
const { validate, assessmentSubmitSchema }      = require('../../utils/validate');

const getOne = async (req, res, next) => {
  try {
    const assessment = await assessmentsService.getAssessmentById(req.params.id);
    res.json({ data: assessment });
  } catch (err) { next(err); }
};

const submit = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(assessmentSubmitSchema, req.body);
    if (!success) return res.status(400).json({ errors });

    const result = await assessmentsService.submitAssessment(
      req.params.id,
      req.user.id,
      data.answers
    );
    res.status(201).json({ data: result });
  } catch (err) { next(err); }
};

module.exports = { getOne, submit };
