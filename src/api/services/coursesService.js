/**
 * src/api/services/coursesService.js
 * Business logic for course retrieval and AI recommendations.
 */

'use strict';

const { supabaseAdmin }             = require('../../integrations/supabase');
const { getCourseRecommendations }  = require('../../integrations/openai');
const logger                        = require('../../utils/logger');

/**
 * Fetch all published courses from the CMS-managed courses table.
 * @returns {Promise<object[]>}
 */
async function getAllCourses() {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select(
      'id, title, description, tags, pass_mark, thumbnail_url, created_at, published, level, category, estimated_hours, instructor, instructor_rating, enrolled_count'
    )
    .eq('published', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch a single published course with its modules.
 * @param {string} courseId
 * @returns {Promise<object>}
 */
async function getCourseById(courseId) {
  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .select('*, modules(*), assessments(*)')
    .eq('id', courseId)
    .eq('published', true)
    .single();

  if (error || !course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }
  return course;
}

/**
 * Return AI-powered course recommendations for a user.
 * Falls back gracefully to an empty array if AI is unavailable.
 *
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
async function getRecommendationsForUser(userId) {
  // Fetch the user's completed enrolments to build a skill profile
  const { data: enrolments } = await supabaseAdmin
    .from('enrolments')
    .select('course_id, courses(tags)')
    .eq('user_id', userId)
    .eq('status', 'completed');

  const completedCourseIds = (enrolments ?? []).map((e) => e.course_id);
  const skills = (enrolments ?? []).flatMap((e) => e.courses?.tags ?? []);

  const { data: userRow } = await supabaseAdmin
    .from('users')
    .select('persona')
    .eq('id', userId)
    .single();

  const recommendations = await getCourseRecommendations({
    completedCourseIds,
    skills,
    persona: userRow?.persona ?? 'learner',
  });

  if (!recommendations || recommendations.length === 0) return [];

  // Match AI-returned title strings against published courses in the DB
  const titles = recommendations.map((t) => t.trim()).filter(Boolean);
  const { data: matchedCourses } = await supabaseAdmin
    .from('courses')
    .select(
      'id, title, description, tags, pass_mark, thumbnail_url, created_at, published, level, category, estimated_hours, instructor, instructor_rating, enrolled_count'
    )
    .eq('published', true)
    .in('title', titles)
    .limit(6);

  return matchedCourses ?? [];
}

module.exports = { getAllCourses, getCourseById, getRecommendationsForUser };
