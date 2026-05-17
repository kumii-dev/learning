/**
 * src/api/services/liveSessionsService.js
 * Retrieves live sessions from the live_sessions table.
 * Returns an empty array gracefully if the table doesn't exist yet.
 */

'use strict';

const { supabaseAdmin } = require('../../integrations/supabase');

/**
 * Fetch all upcoming (and recent) live sessions.
 * Ordered by scheduled_at ascending so the nearest sessions appear first.
 * @returns {Promise<object[]>}
 */
async function getLiveSessions() {
  const { data, error } = await supabaseAdmin
    .from('live_sessions')
    .select(
      'id, title, topic, description, instructor, scheduled_at, end_time, ' +
      'join_url, meeting_url, course_id, max_attendees, status'
    )
    .order('scheduled_at', { ascending: true });

  // If the table doesn't exist yet (error code 42P01) return empty gracefully
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return [];
    }
    throw error;
  }

  return data ?? [];
}

module.exports = { getLiveSessions };
