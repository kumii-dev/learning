/**
 * src/api/controllers/coursesController.js
 */
'use strict';

const coursesService = require('../services/coursesService');

const list = async (req, res, next) => {
  try {
    const courses = await coursesService.getAllCourses();
    res.json({ data: courses });
  } catch (err) { next(err); }
};

const getOne = async (req, res, next) => {
  try {
    const course = await coursesService.getCourseById(req.params.id);
    res.json({ data: course });
  } catch (err) { next(err); }
};

const recommendations = async (req, res, next) => {
  try {
    const recs = await coursesService.getRecommendationsForUser(req.user.id);
    res.json({ data: recs });
  } catch (err) { next(err); }
};

module.exports = { list, getOne, recommendations };
