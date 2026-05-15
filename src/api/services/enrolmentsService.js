/**
 * src/api/services/enrolmentsService.js
 * Business logic for course enrolments.
 */

'use strict';

const { supabaseAdmin } = require('../../integrations/supabase');
const { emit, EVENTS }  = require('../../utils/eventEmitter');

/**
 * Enrol a user into a course.
 * Idempotent — returns existing enrolment if already enrolled.
 *
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<object>}
 */
async function enrolUser(userId, courseId) {
  // Verify course exists and is published
  const { data: course, error: courseError } = await supabaseAdmin
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('published', true)
    .single();

  if (courseError || !course) {
    const err = new Error('Course not found or not published');
    err.status = 404;
    throw err;
  }

  // Upsert enrolment (idempotent)
  const { data: enrolment, error } = await supabaseAdmin
    .from('enrolments')
    .upsert(
      { user_id: userId, course_id: courseId, status: 'enrolled', enrolled_at: new Date().toISOString() },
      { onConflict: 'user_id,course_id', ignoreDuplicates: false }
    )
    .select()
    .single();

  if (error) throw error;

  emit(EVENTS.COURSE_ENROLLED, { userId, courseId, enrolmentId: enrolment.id });

  return enrolment;
}

/**
 * List all enrolments for a user.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getUserEnrolments(userId) {
  const { data, error } = await supabaseAdmin
    .from('enrolments')
    .select('*, courses(id, title, thumbnail_url)')
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;
  return data;
}

module.exports = { enrolUser, getUserEnrolments };
