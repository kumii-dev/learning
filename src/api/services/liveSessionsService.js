/**
 * src/api/services/liveSessionsService.js
 * Live sessions data access — read, create, update, delete, RSVP.
 */

'use strict';

const { v4: uuid }          = require('uuid');
const { supabaseAdmin }     = require('../../integrations/supabase');
const { createDailyRoom, deleteDailyRoom, getRoomRecordings } = require('../../integrations/videoProvider');
const { sendRecordingEmail } = require('../../utils/emailService');

const SESSION_FIELDS =
  'id, title, topic, description, instructor, scheduled_at, end_time, ' +
  'join_url, meeting_url, room_name, room_password, platform, duration_min, ' +
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
    // Table doesn't exist yet
    if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
    // Column doesn't exist — DB schema is behind; return empty rather than 500
    // Run migration 020 to fix: supabase/migrations/020_live_sessions_missing_columns.sql
    if (error.code === '42703') {
      console.error('[live-sessions] Column missing — run migration 020:', error.message);
      return [];
    }
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
 * Creates a Daily.co room via the REST API and stores the join URL.
 */
async function createSession(payload) {
  const id = uuid();
  const { roomName, joinUrl } = await createDailyRoom(id, payload.scheduledAt, payload.maxAttendees ?? null);
  const now = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .insert({
      id,
      title:         payload.title,
      topic:         payload.topic         ?? null,
      description:   payload.description   ?? null,
      instructor:    payload.instructor    ?? null,
      scheduled_at:  payload.scheduledAt,
      end_time:      payload.endTime       ?? null,
      duration_min:  payload.durationMin   ?? 60,
      course_id:     payload.courseId      ?? null,
      max_attendees: payload.maxAttendees  ?? null,
      status:        'scheduled',
      platform:      'daily',
      room_name:     roomName,
      join_url:      joinUrl,
      meeting_url:   joinUrl,
      room_password: payload.roomPassword  ?? null,
      is_public:     payload.isPublic      ?? true,
      created_at:    now,
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
 * Delete a live session and its Daily.co room.
 */
async function deleteSession(id) {
  // Fetch room_name before deleting so we can clean up on Daily
  const { data: session } = await supabaseAdmin
    .from('live_sessions')
    .select('room_name')
    .eq('id', id)
    .maybeSingle();

  const { error } = await supabaseAdmin.from('live_sessions').delete().eq('id', id);
  if (error) throw error;

  // Best-effort Daily room cleanup (fire-and-forget)
  if (session?.room_name) await deleteDailyRoom(session.room_name);
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

/**
 * Fetch cloud recordings for a session from Daily.co.
 * Also syncs the recording_url of the latest recording back to the DB.
 */
async function getSessionRecordings(sessionId) {
  // Look up the room_name for this session
  const { data: session, error } = await supabaseAdmin
    .from('live_sessions')
    .select('room_name, recording_url')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session?.room_name) return [];

  const recordings = await getRoomRecordings(session.room_name);

  // Sync the most recent recording URL back to the DB row
  if (recordings.length > 0) {
    const latest = recordings[0];
    const downloadUrl = latest.download_link ?? latest.s3_key ?? null;
    if (downloadUrl && downloadUrl !== session.recording_url) {
      await supabaseAdmin
        .from('live_sessions')
        .update({ recording_url: downloadUrl, status: 'ended', updated_at: new Date().toISOString() })
        .eq('id', sessionId);
    }
  }

  return recordings;
}

module.exports = { getLiveSessions, createSession, updateSession, deleteSession, toggleRsvp, getSessionRecordings, emailRecordingToParticipants };

/**
 * Bulk-email all RSVP'd participants the recording download links for a session.
 *
 * Flow:
 *  1. Fetch session details + latest recordings from Daily.co
 *  2. Fetch all RSVPs for the session
 *  3. Look up email + full_name from profiles for each RSVP user
 *  4. Send sendRecordingEmail() to each — collects sent/failed counts
 *
 * @param {string} sessionId
 * @returns {{ sent: number, failed: number, skipped: number }}
 */
async function emailRecordingToParticipants(sessionId) {
  // 1. Session + recordings
  const { data: session, error: sessionErr } = await supabaseAdmin
    .from('live_sessions')
    .select('id, title, scheduled_at, instructor, room_name')
    .eq('id', sessionId)
    .maybeSingle();

  if (sessionErr || !session) throw new Error('Session not found');

  const recordings = session.room_name ? await getRoomRecordings(session.room_name) : [];

  const sessionDate = session.scheduled_at
    ? new Date(session.scheduled_at).toLocaleString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null;

  // 2. RSVPs
  const { data: rsvps, error: rsvpErr } = await supabaseAdmin
    .from('session_rsvps')
    .select('user_id')
    .eq('session_id', sessionId);

  if (rsvpErr) throw rsvpErr;
  if (!rsvps || rsvps.length === 0) return { sent: 0, failed: 0, skipped: 0 };

  const userIds = [...new Set(rsvps.map((r) => r.user_id))];

  // 3. Profile emails
  const { data: profiles, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds);

  if (profileErr) throw profileErr;

  // 4. Send emails
  let sent = 0, failed = 0, skipped = 0;

  await Promise.allSettled(
    (profiles ?? []).map(async (p) => {
      if (!p.email) { skipped++; return; }
      try {
        await sendRecordingEmail({
          to:            p.email,
          recipientName: p.full_name ?? '',
          sessionTitle:  session.title,
          sessionDate,
          instructor:    session.instructor ?? '',
          recordings,
        });
        sent++;
      } catch {
        failed++;
      }
    }),
  );

  return { sent, failed, skipped };
}
