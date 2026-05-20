/**
 * src/integrations/videoProvider.js
 *
 * Deterministic Jitsi Meet room helpers.
 * Jitsi public server (meet.jit.si) creates a room on first join —
 * no API key or account required.
 */
'use strict';

const BASE_URL = 'https://meet.jit.si';

/**
 * Derive a stable Jitsi room name from a session UUID.
 * @param {string} sessionId
 * @returns {{ roomName: string, joinUrl: string }}
 */
function createJitsiRoom(sessionId) {
  const roomName = `kumii-${sessionId}`;
  const joinUrl  = `${BASE_URL}/${roomName}`;
  return { roomName, joinUrl };
}

module.exports = { createJitsiRoom };
