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
const { generateCertificatePdf } = require('../../utils/certificateGenerator');
const { sendCertificateEmail }   = require('../../utils/emailService');

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
    .select('id, pdf_url')
    .eq('user_id', userId)
    .eq('course_id', courseId)
    .maybeSingle();

  if (existing) {
    // If logos have since been added to the template, regenerate the PDF so they appear
    const { data: tmpl } = await supabaseAdmin
      .from('certificate_templates')
      .select('logo_left_url, logo_right_url')
      .eq('course_id', courseId)
      .maybeSingle();

    const hasLogos = tmpl?.logo_left_url || tmpl?.logo_right_url;
    if (hasLogos) {
      logger.info('Certificate exists but logos present — regenerating PDF', { userId, courseId });
      try { return await regeneratePdf(existing.id, userId); } catch (_) { /* fall through */ }
    }

    logger.info('Certificate already issued', { userId, courseId });
    return existing;
  }

  // Fetch course details
  const { data: course } = await supabaseAdmin
    .from('courses')
    .select('title, category, estimated_hours')
    .eq('id', courseId)
    .single();

  // Fetch user profile — users are stored in profiles, not public.users
  const { data: user } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', userId)
    .single();

  // Fetch CMS certificate template for this course (optional)
  const { data: template } = await supabaseAdmin
    .from('certificate_templates')
    .select('*')
    .eq('course_id', courseId)
    .maybeSingle();

  const certId      = uuidv4();
  const issuedAt    = new Date().toISOString();
  const learnerName = user?.full_name?.trim() || user?.email?.split('@')[0] || 'Learner';

  // ── Generate PDF ─────────────────────────────────────────────────────
  let pdfUrl = null;
  try {
    const pdfBuffer = await generateCertificatePdf({
      learnerName,
      courseTitle:     course?.title          ?? 'Course',
      category:        course?.category       ?? '',
      estimatedHours:  course?.estimated_hours ?? null,
      issuedAt,
      certificateId:   certId,
      logoLeftUrl:     template?.logo_left_url  ?? null,
      logoRightUrl:    template?.logo_right_url ?? null,
    });

    const filePath = `certificates/${certId}.pdf`;
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('course-content')
      .upload(filePath, pdfBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (!uploadErr) {
      const { data: { publicUrl } } = supabaseAdmin.storage
        .from('course-content')
        .getPublicUrl(filePath);
      pdfUrl = publicUrl;
    } else {
      logger.warn('Certificate PDF upload failed', { error: uploadErr.message });
    }
  } catch (genErr) {
    logger.warn('Certificate PDF generation failed', { error: genErr.message });
  }

  // ── Save certificate record ────────────────────────────────────────
  const certData = {
    id:          certId,
    user_id:     userId,
    course_id:   courseId,
    issued_at:   issuedAt,
    template_id: template?.id ?? null,
    pdf_url:     pdfUrl,
    metadata: {
      learner_name: learnerName,
      course_title: course?.title ?? 'Course',
      issued_date:  new Date(issuedAt).toLocaleDateString('en-AU', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    },
  };

  const { data: cert, error } = await supabaseAdmin
    .from('certificates')
    .insert(certData)
    .select()
    .single();

  if (error) throw error;

  emit(EVENTS.CERTIFICATE_ISSUED, { userId, courseId, certificateId: cert.id });

  // Fire-and-forget — email failure must never break certificate issuance
  sendCertificateEmail({
    to:            user?.email,
    learnerName,
    courseTitle:   course?.title ?? 'Course',
    pdfUrl,
    certificateId: certId,
    issuedAt,
  }).catch(() => {}); // already logged inside sendCertificateEmail

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
        title, description, tags, thumbnail_url,
        skills, topics, learning_outcomes, estimated_hours,
        module_count, rating_count, instructor, provider, level, category
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
    .select('*, courses(title), profiles(full_name, email)')
    .eq('id', certificateId)
    .single();

  if (error || !data) {
    const err = new Error('Certificate not found');
    err.status = 404;
    throw err;
  }
  return data;
}

/**
 * Re-generate (or generate for the first time) the PDF for an existing certificate.
 * Returns the updated certificate row with pdf_url.
 */
async function regeneratePdf(certificateId, userId) {
  const { data: cert, error } = await supabaseAdmin
    .from('certificates')
    .select('*, courses(title, category, estimated_hours), profiles(full_name, email)')
    .eq('id', certificateId)
    .single();

  if (error || !cert) {
    const e = new Error('Certificate not found'); e.status = 404; throw e;
  }
  // Only the owner can regenerate
  if (cert.user_id !== userId) {
    const e = new Error('Forbidden'); e.status = 403; throw e;
  }

  const learnerName = cert.profiles?.full_name?.trim() || cert.profiles?.email?.split('@')[0] || 'Learner';
  const course      = cert.courses ?? {};

  // Fetch logo URLs from certificate_templates for this course
  const { data: template } = await supabaseAdmin
    .from('certificate_templates')
    .select('logo_left_url, logo_right_url')
    .eq('course_id', cert.course_id)
    .maybeSingle();

  const pdfBuffer = await generateCertificatePdf({
    learnerName,
    courseTitle:    course.title           ?? 'Course',
    category:       course.category        ?? '',
    estimatedHours: course.estimated_hours ?? null,
    issuedAt:       cert.issued_at,
    certificateId,
    logoLeftUrl:    template?.logo_left_url  ?? null,
    logoRightUrl:   template?.logo_right_url ?? null,
  });

  const filePath = `certificates/${certificateId}.pdf`;
  await supabaseAdmin.storage.from('course-content').upload(filePath, pdfBuffer, {
    contentType: 'application/pdf', upsert: true,
  });

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('course-content').getPublicUrl(filePath);

  const { data: updated } = await supabaseAdmin
    .from('certificates')
    .update({ pdf_url: publicUrl })
    .eq('id', certificateId)
    .select()
    .single();

  return updated;
}

module.exports = { issueCertificate, getUserCertificates, getCertificateById, regeneratePdf };
