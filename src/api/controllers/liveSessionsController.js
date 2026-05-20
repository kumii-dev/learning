/**
 * src/api/controllers/liveSessionsController.js
 */
'use strict';

const svc = require('../services/liveSessionsService');

const listLiveSessions = async (req, res, next) => {
  try {
    const userId   = req.user?.id ?? null;
    const sessions = await svc.getLiveSessions(userId);
    res.json({ data: sessions });
  } catch (err) { next(err); }
};

const createLiveSession = async (req, res, next) => {
  try {
    const session = await svc.createSession(req.body);
    res.status(201).json({ data: session });
  } catch (err) { next(err); }
};

const updateLiveSession = async (req, res, next) => {
  try {
    const session = await svc.updateSession(req.params.id, req.body);
    res.json({ data: session });
  } catch (err) { next(err); }
};

const deleteLiveSession = async (req, res, next) => {
  try {
    await svc.deleteSession(req.params.id);
    res.json({ success: true });
  } catch (err) { next(err); }
};

const rsvpLiveSession = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Not authenticated' });
    const result = await svc.toggleRsvp(req.params.id, userId);
    res.json(result);
  } catch (err) { next(err); }
};

module.exports = {
  listLiveSessions,
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
  rsvpLiveSession,
};
