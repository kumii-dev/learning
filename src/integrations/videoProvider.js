/**
 * src/integrations/videoProvider.js
 *
 * Daily.co room helpers.
 * Rooms are created via the Daily REST API and hosted on the
 * Kumii subdomain: https://kumii.daily.co/<room-name>
 *
 * Docs: https://docs.daily.co/reference/rest-api/rooms/create-room
 */
'use strict';

const axios = require('axios');

const DAILY_API_BASE  = 'https://api.daily.co/v1';
const DAILY_SUBDOMAIN = 'kumii';

/**
 * Create a Daily.co room for a live session with all features enabled:
 * screen share, cloud recording, transcription, raise hand, chat,
 * noise cancellation, network-adaptive simulcast, and breakout rooms.
 *
 * @param {string} sessionId         UUID of the live_sessions row
 * @param {string} [scheduledAt]     ISO string — room expiry based on this + 8 h
 * @param {number} [maxParticipants] Optional hard cap enforced by Daily.co
 * @returns {Promise<{ roomName: string, joinUrl: string }>}
 */
async function createDailyRoom(sessionId, scheduledAt, maxParticipants) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error('DAILY_API_KEY is not set');

  const roomName = `kumii-${sessionId}`;
  const base     = scheduledAt ? new Date(scheduledAt).getTime() : Date.now();
  const exp      = Math.floor(base / 1000) + 8 * 60 * 60; // 8 h window

  const properties = {
    // ── Lifecycle ──────────────────────────────────────────────────
    exp,
    enable_prejoin_ui:  true,     // lobby / device-check screen before joining

    // ── Screen sharing — enabled by default on all Daily plans ────
    enable_screenshare: true,

    // ── Cloud recording ────────────────────────────────────────────
    enable_recording:    'cloud',  // 'cloud' | 'local' | 'raw-tracks'
    enable_network_ui:   true,     // network quality indicator in UI

    // ── Transcription — Daily.co built-in (Business/Enterprise plans)
    // Required for the AI Transcript feature to use Daily's native transcripts.
    enable_transcription: 'deepgram',

    // ── Chat ───────────────────────────────────────────────────────
    enable_chat:        true,

    // ── Raise hand ─────────────────────────────────────────────────
    enable_hand_raising: true,

    // ── Noise cancellation (Krisp) ─────────────────────────────────
    enable_noise_cancellation_ui: true,

    // ── Breakout rooms ─────────────────────────────────────────────
    enable_breakout_rooms: true,

    // ── Emoji reactions ────────────────────────────────────────────
    enable_emoji_reactions: true,
  };

  if (maxParticipants && maxParticipants > 0) {
    properties.max_participants = maxParticipants;
  }

  const { data } = await axios.post(
    `${DAILY_API_BASE}/rooms`,
    {
      name:       roomName,
      privacy:    'public',
      properties,
    },
    {
      headers: {
        Authorization:  `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 10_000,
    }
  );

  const joinUrl = data.url ?? `https://${DAILY_SUBDOMAIN}.daily.co/${roomName}`;
  return { roomName, joinUrl };
}

/**
 * Delete a Daily.co room (called when a session is deleted).
 * Fails silently if the room does not exist.
 *
 * @param {string} roomName
 */
async function deleteDailyRoom(roomName) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !roomName) return;
  try {
    await axios.delete(`${DAILY_API_BASE}/rooms/${roomName}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 8_000,
    });
  } catch (_) {
    // Room may already be gone — ignore
  }
}

/**
 * Fetch all cloud recordings for a Daily.co room.
 * Returns an array of recording objects with download/streaming URLs.
 *
 * @param {string} roomName
 * @returns {Promise<Array>}
 */
async function getRoomRecordings(roomName) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !roomName) return [];
  try {
    const { data } = await axios.get(`${DAILY_API_BASE}/recordings`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params:  { room_name: roomName },
      timeout: 10_000,
    });
    return data?.data ?? [];
  } catch (err) {
    console.error('[Daily] getRoomRecordings error:', err.response?.data ?? err.message);
    return [];
  }
}

/**
 * Get a presigned download link for a single Daily.co recording.
 * The link expires in ~1 hour.
 *
 * Docs: https://docs.daily.co/reference/rest-api/recordings/get-recording-link
 *
 * @param {string} recordingId  Daily.co recording ID
 * @returns {Promise<string|null>}  presigned download URL or null
 */
async function getRecordingAccessLink(recordingId) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !recordingId) return null;
  try {
    const { data } = await axios.get(`${DAILY_API_BASE}/recordings/${recordingId}/access-link`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 10_000,
    });
    return data?.download_link ?? null;
  } catch (err) {
    console.error('[Daily] getRecordingAccessLink error:', err.response?.data ?? err.message);
    return null;
  }
}

module.exports = { createDailyRoom, deleteDailyRoom, getRoomRecordings, getRecordingAccessLink, getSessionTranscripts, getDailyTranscriptText };

/**
 * Fetch Daily.co transcripts for a room.
 * Returns an array of transcript objects.  Each has an `id` and (when ready)
 * a `transcriptUrl` / `transcription_url` field pointing to a VTT/plain text file.
 *
 * Docs: https://docs.daily.co/reference/rest-api/transcripts
 *
 * @param {string} roomName
 * @returns {Promise<Array>}
 */
async function getSessionTranscripts(roomName) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !roomName) return [];
  try {
    const { data } = await axios.get(`${DAILY_API_BASE}/transcripts`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      params:  { room_name: roomName },
      timeout: 10_000,
    });
    return data?.data ?? [];
  } catch (err) {
    console.warn('[Daily] getSessionTranscripts error:', err.response?.data ?? err.message);
    return [];
  }
}

/**
 * Fetch the plain text of a Daily.co transcript by transcript ID.
 * Daily returns a VTT file at /transcripts/{id}/text — we strip the VTT
 * cue headers so the result is clean prose for OpenAI to summarise.
 *
 * @param {string} transcriptId
 * @returns {Promise<string|null>}
 */
async function getDailyTranscriptText(transcriptId) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey || !transcriptId) return null;
  try {
    const { data } = await axios.get(`${DAILY_API_BASE}/transcripts/${transcriptId}/text`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 30_000,
    });
    // `data` may be a VTT string or plain text
    if (typeof data !== 'string') return null;
    // Strip WebVTT headers + cue timing lines → keep speaker text only
    const lines = data.split('\n');
    const text = lines
      .filter((l) => {
        if (!l.trim()) return false;
        if (l.startsWith('WEBVTT')) return false;
        if (/^\d{2}:\d{2}/.test(l)) return false;   // timecodes
        if (/^NOTE/.test(l))        return false;
        return true;
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text || null;
  } catch (err) {
    console.warn('[Daily] getDailyTranscriptText error:', err.response?.data ?? err.message);
    return null;
  }
}
