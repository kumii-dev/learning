/**
 * src/api/services/liveSessionsService.js
 * Live sessions data access — read, create, update, delete, RSVP.
 */

'use strict';

const { v4: uuid }         = require('uuid');
const { supabaseAdmin }    = require('../../integrations/supabase');
const { createJitsiRoom }  = require('../../integrations/videoProvider');

const SESSION_FIELDS =
  'id, title, topic, description, instructor, scheduled_at, end_time, ' +
  'join_url, meeting_url, jitsi_room, room_password, platform, duration_min, ' +
  'course_id, max_attendees, status, is_public, host_id';

/**
 * Fetch all live sessions, enriched with RSVP count + optional user RSVP flag.
 * @param {string|null} userId
 */
async function getLiveSessions(userId = null) {
  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .select(SESSION_FIELDS)
    .order('scheduled_at', { ascending: true });

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
    throw error;
  }

  const sessions = data ?? [];

  // Fetch RSVP counts for all sessions
  const ids = sessions.map((s) => s.id);
  if (ids.length === 0) return sessions;

  const { data: rsvps } = await supabaseAdmin
    .from('session_rsvps')
    .select('session_id, user_id')
    .in('session_id', ids);

  const countMap  = {};
  const userRsvps = new Set();
  for (const r of rsvps ?? []) {
    countMap[r.session_id] = (countMap[r.session_id] ?? 0) + 1;
    if (userId && r.user_id === userId) userRsvps.add(r.session_id);
  }

  return sessions.map((s) => ({
    ...s,
    rsvp_count:    countMap[s.id]  ?? 0,
    user_has_rsvp: userRsvps.has(s.id),
  }));
}

/**
 * Create a new live session.
 * Generates a Jitsi room deterministically from the new session UUID.
 */
async function createSession(payload) {
  const id = uuid();
  const { roomName, joinUrl } = createJitsiRoom(id);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .insert({
      id,
      title:        payload.title,
      topic:        payload.topic        ?? null,
      description:  payload.description  ?? null,
      instructor:   payload.instructor   ?? null,
      scheduled_at: payload.scheduledAt,
      end_time:     payload.endTime      ?? null,
      duration_min: payload.durationMin  ?? 60,
      course_id:    payload.courseId     ?? null,
      max_attendees: payload.maxAttendees ?? null,
      status:       'scheduled',
      platform:     'jitsi',
      jitsi_room:   roomName,
      join_url:     joinUrl,
      meeting_url:  joinUrl,
      room_password: payload.roomPassword ?? null,
      is_public:    payload.isPublic     ?? true,
      created_at:   now,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update an existing live session.
 */
async function updateSession(id, payload) {
  const updates = {};
  const fields = [
    ['title',        'title'],
    ['topic',        'topic'],
    ['description',  'description'],
    ['instructor',   'instructor'],
    ['scheduledAt',  'scheduled_at'],
    ['endTime',      'end_time'],
    ['durationMin',  'duration_min'],
    ['courseId',     'course_id'],
    ['maxAttendees', 'max_attendees'],
    ['status',       'status'],
    ['roomPassword', 'room_password'],
    ['isPublic',     'is_public'],
    ['recordingUrl', 'recording_url'],
  ];
  for (const [src, dest] of fields) {
    if (payload[src] !== undefined) updates[dest] = payload[src];
  }
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Delete a live session.
 */
async function deleteSession(id) {
  const { error } = await supabaseAdmin.from('live_sessions').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Toggle RSVP for a user on a session.
 * Returns { rsvped: true|false }.
 */
async function toggleRsvp(sessionId, userId) {
  // Check existing
  const { data: existing } = await supabaseAdmin
    .from('session_rsvps')
    .select('id')
    .eq('session_id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin.from('session_rsvps').delete().eq('id', existing.id);
    return { rsvped: false };
  }

  await supabaseAdmin.from('session_rsvps').insert({
    session_id: sessionId,
    user_id:    userId,
    rsvped_at:  new Date().toISOString(),
  });
  return { rsvped: true };
}

module.exports = { getLiveSessions, createSession, updateSession, deleteSession, toggleRsvp };
