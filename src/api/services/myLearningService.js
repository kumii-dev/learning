/**
 * src/api/services/myLearningService.js
 * Aggregates a learner's progress across all their enrolments.
 */

'use strict';

const { supabaseAdmin } = require('../../integrations/supabase');
const { analyseSkillGap } = require('../../integrations/openai');

/**
 * Build the full "My Learning" dashboard payload for a user.
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getMyLearning(userId) {
  const { data: enrolments, error } = await supabaseAdmin
    .from('enrolments')
    .select(`
      id,
      status,
      enrolled_at,
      completed_at,
      courses (
        id, title, thumbnail_url, description,
        tags,
        assessments ( id, type, title )
      )
    `)
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });

  if (error) throw error;

  // Fetch submission scores for context
  const { data: submissions } = await supabaseAdmin
    .from('submissions')
    .select('id, assessment_id, score, status, submitted_at')
    .eq('user_id', userId);

  const submissionMap = {};
  for (const s of submissions ?? []) {
    submissionMap[s.assessment_id] = s;
  }

  // Attach submission data to each assessment
  const enriched = (enrolments ?? []).map((enrolment) => ({
    ...enrolment,
    courses: {
      ...enrolment.courses,
      assessments: (enrolment.courses?.assessments ?? []).map((a) => ({
        ...a,
        submission: submissionMap[a.id] ?? null,
      })),
    },
  }));

  // Non-blocking AI skill gap analysis
  const assessmentResults = (submissions ?? []).map((s) => ({
    assessmentId: s.assessment_id,
    score: s.score,
    status: s.status,
  }));

  const skillGap = await analyseSkillGap({
    assessmentResults,
    targetRole: 'learner',
  });

  return {
    enrolments: enriched,
    skillGap,   // null if AI failed — frontend handles gracefully
  };
}

module.exports = { getMyLearning };
