/**
 * src/api/controllers/liveSessionsController.js
 */
'use strict';

const liveSessionsService = require('../services/liveSessionsService');

const listLiveSessions = async (req, res, next) => {
  try {
    const sessions = await liveSessionsService.getLiveSessions();
    res.json({ data: sessions });
  } catch (err) {
    next(err);
  }
};

module.exports = { listLiveSessions };
