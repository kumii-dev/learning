/**
 * src/api/controllers/myLearningController.js
 */
'use strict';

const myLearningService = require('../services/myLearningService');

const getDashboard = async (req, res, next) => {
  try {
    const payload = await myLearningService.getMyLearning(req.user.id);
    res.json({ data: payload });
  } catch (err) { next(err); }
};

module.exports = { getDashboard };
