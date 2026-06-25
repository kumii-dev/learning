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

const getSessionRecordings = async (req, res, next) => {
  try {
    const recordings = await svc.getSessionRecordings(req.params.id);
    res.json({ data: recordings });
  } catch (err) { next(err); }
};

const emailRecordingParticipants = async (req, res, next) => {
  try {
    const result = await svc.emailRecordingToParticipants(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
};

const generateTranscript = async (req, res, next) => {
  try {
    const result = await svc.generateTranscriptAndSummary(req.params.id);
    res.json(result);
  } catch (err) { next(err); }
};

const getTranscriptStatus = async (req, res, next) => {
  try {
    const { supabaseAdmin } = require('../../integrations/supabase');
    const { data, error } = await supabaseAdmin
      .from('live_sessions')
      .select('transcript_status, summary_status, transcript_text, summary_text')
      .eq('id', req.params.id)
      .maybeSingle();
    if (error || !data) return res.status(404).json({ error: 'Session not found' });
    res.json(data);
  } catch (err) { next(err); }
};

module.exports = {
  listLiveSessions,
  createLiveSession,
  updateLiveSession,
  deleteLiveSession,
  rsvpLiveSession,
  getSessionRecordings,
  emailRecordingParticipants,
  generateTranscript,
  getTranscriptStatus,
};
