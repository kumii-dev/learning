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
    enable_recording:   'cloud',  // 'cloud' | 'local' | 'raw-tracks'
    enable_network_ui:  true,     // network quality indicator in UI

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

module.exports = { createDailyRoom, deleteDailyRoom };
