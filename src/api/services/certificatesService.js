/**
 * src/api/services/certificatesService.js
 * Certificate issuance — triggered only after all assessments are passed.
 * Template rules sourced from the CMS-managed certificate_templates table.
 */

'use strict';

const { v4: uuidv4 }    = require('uuid');
const { supabaseAdmin } = require('../../integrations/supabase');
const { emit, EVENTS }  = require('../../utils/eventEmitter');
const logger            = require('../../utils/logger');

/**
 * Issue a certificate for a user who has completed a course.
 * Idempotent — will not issue a duplicate.
 *
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<object>}
 */
async function issueCertificate(userId, courseId) {
  // Check for existing certificate
  const { data: existing } = await supabaseAdmin
    .from('certificates')
    .select('id')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existing) {
    logger.info('Certificate already issued', { userId, courseId });
    return existing;
  }

  // Fetch CMS certificate template for this course
  const { data: template } = await supabaseAdmin
    .from('certificate_templates')
    .select('*')
    .eq('course_id', courseId)
    .maybeSingle();

  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('title')
    .eq('id', courseId)
    .single();

  const { data: user } = await supabaseAdmin
    .from('users')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  const certData = {
    id:           uuidv4(),
    user_id:      userId,
    course_id:    courseId,
    issued_at:    new Date().toISOString(),
    template_id:  template?.id ?? null,
    metadata: {
      learner_name: user?.full_name ?? user?.email ?? 'Learner',
      course_title: course?.title ?? 'Course',
      issued_date:  new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' }),
    },
  };

  const { data: cert, error } = await supabaseAdmin
    .from('certificates')
    .insert(certData)
    .select()
    .single();

  if (error) throw error;

  emit(EVENTS.CERTIFICATE_ISSUED, { userId, courseId, certificateId: cert.id });

  return cert;
}

/**
 * Fetch all certificates for a user.
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function getUserCertificates(userId) {
  const { data, error } = await supabaseAdmin
    .from('certificates')
    .select(`
      *,
      courses (
        title, description, tags,
        thumbnail_url
      )
    `)
    .eq('user_id', userId)
    .order('issued_at', { ascending: false });

  if (error) throw error;
  return data;
}

/**
 * Fetch a single certificate (for public verification).
 * @param {string} certificateId
 * @returns {Promise<object>}
 */
async function getCertificateById(certificateId) {
  const { data, error } = await supabaseAdmin
    .from('certificates')
    .select('*, courses(title), users(full_name, email)')
    .eq('id', certificateId)
    .single();

  if (error || !data) {
    const err = new Error('Certificate not found');
    err.status = 404;
    throw err;
  }
  return data;
}

module.exports = { issueCertificate, getUserCertificates, getCertificateById };
