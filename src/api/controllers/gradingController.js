/**
 * src/api/controllers/gradingController.js
 */
'use strict';

const gradingService                  = require('../services/gradingService');
const { validate, gradingSchema }     = require('../../utils/validate');

const grade = async (req, res, next) => {
  try {
    const { success, data, errors } = validate(gradingSchema, req.body);
    if (!success) return res.status(400).json({ errors });

    const result = await gradingService.applyManualGrade(
      data.submissionId,
      data.score,
      data.feedback,
      req.user.id
    );
    res.json({ data: result });
  } catch (err) { next(err); }
};

module.exports = { grade };
