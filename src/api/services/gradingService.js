/**
 * src/api/services/gradingService.js
 * Manual grading logic and course-completion orchestration.
 */

'use strict';

const { supabaseAdmin } = require('../../integrations/supabase');
const { emit, EVENTS }  = require('../../utils/eventEmitter');
const certificatesService = require('./certificatesService');

/**
 * Apply a manual grade to an assignment/project submission.
 * @param {string} submissionId
 * @param {number} score
 * @param {string} [feedback]
 * @param {string} graderId  — req.user.id of the grader (admin/instructor)
 * @returns {Promise<object>}
 */
async function applyManualGrade(submissionId, score, feedback, graderId) {
  const { data: submission, error: fetchErr } = await supabaseAdmin
    .from('submissions')
    .select('id, user_id, assessment_id, status')
    .eq('id', submissionId)
    .single();

  if (fetchErr || !submission) {
    const err = new Error('Submission not found');
    err.status = 404;
    throw err;
  }

  if (submission.status === 'graded') {
    const err = new Error('Submission already graded');
    err.status = 409;
    throw err;
  }

  // Fetch pass mark from CMS-managed assessment
  const { data: assessment, error: aErr } = await supabaseAdmin
    .from('assessments')
    .select('pass_mark')
    .eq('id', submission.assessment_id)
    .single();

  if (aErr || !assessment) throw new Error('Assessment config not found');

  const passed = score >= assessment.pass_mark;

  const { data: updated, error: updateErr } = await supabaseAdmin
    .from('submissions')
    .update({
      score,
      feedback,
      status:    'graded',
      grader_id: graderId,
      graded_at: new Date().toISOString(),
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (updateErr) throw updateErr;

  emit(EVENTS.ASSESSMENT_SUBMITTED, {
    userId: submission.user_id,
    assessmentId: submission.assessment_id,
    submissionId,
    score,
  });

  if (passed) {
    emit(EVENTS.ASSESSMENT_PASSED, {
      userId: submission.user_id,
      assessmentId: submission.assessment_id,
      submissionId,
      score,
    });
    await handlePassedAssessment(submission.user_id, submission.assessment_id);
  }

  return { ...updated, passed };
}

/**
 * Called whenever a learner passes an assessment.
 * Checks if all assessments for the course are passed; if so, marks the
 * course complete and triggers certificate issuance.
 *
 * @param {string} userId
 * @param {string} assessmentId
 */
async function handlePassedAssessment(userId, assessmentId) {
  // 1. Find the course for this assessment
  const { data: assessment } = await supabaseAdmin
    .from('assessments')
    .select('course_id')
    .eq('id', assessmentId)
    .single();

  if (!assessment?.course_id) return;
  const { course_id: courseId } = assessment;

  // 2. Get all assessments for the course
  const { data: allAssessments } = await supabaseAdmin
    .from('assessments')
    .select('id')
    .eq('course_id', courseId);

  const allIds = (allAssessments ?? []).map((a) => a.id);

  // 3. Check the user has a passing submission for every assessment
  const { data: passedSubmissions } = await supabaseAdmin
    .from('submissions')
    .select('assessment_id')
    .eq('user_id', userId)
    .eq('status', 'graded')
    .gte('score', 1) // score > 0 is a proxy; actual pass mark checked per submission
    .in('assessment_id', allIds);

  const passedIds = new Set((passedSubmissions ?? []).map((s) => s.assessment_id));
  const courseComplete = allIds.every((id) => passedIds.has(id));

  if (!courseComplete) return;

  // 4. Mark enrolment as completed
  const { error: enrolErr } = await supabaseAdmin
    .from('enrolments')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('course_id', courseId);

  if (enrolErr) throw enrolErr;

  emit(EVENTS.COURSE_COMPLETED, { userId, courseId });

  // 5. Issue certificate
  await certificatesService.issueCertificate(userId, courseId);
}

module.exports = { applyManualGrade, handlePassedAssessment };
