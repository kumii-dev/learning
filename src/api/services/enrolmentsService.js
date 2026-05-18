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
 * @param {string} [email]   - passed from req.user for safety-net profile row
 * @returns {Promise<object>}
 */
async function enrolUser(userId, courseId, email) {
  // Safety-net: ensure a profiles row exists before any FK write.
  // Covers users whose auth/sync profile upsert silently failed.
  // email is included to satisfy the NOT NULL constraint on profiles.email.
  const profileRow = {
    id:         userId,
    role:       'user',              // profiles_role_check: platform_admin|tenant_admin|staff|user
    updated_at: new Date().toISOString(),
    ...(email ? { email } : {}),
  };
  const { error: profileErr } = await supabaseAdmin
    .from('profiles')
    .upsert(profileRow, { onConflict: 'id', ignoreDuplicates: false });

  if (profileErr) {
    // Surface this — a silent failure here always causes the FK violation below.
    // Most common causes:
    //   • profiles.email is still NOT NULL and email was missing (run migration 006)
    //   • enrolments FK still points at public.users instead of profiles (run migration 005)
    const safetyErr = new Error(
      `[enrolUser] safety-net profiles upsert failed for userId=${userId}: ${profileErr.message}`
    );
    safetyErr.status = 500;
    safetyErr.cause  = profileErr;
    throw safetyErr;
  }

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
