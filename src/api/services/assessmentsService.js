/**
 * src/api/services/assessmentsService.js
 * Assessment retrieval and submission logic.
 * quiz → auto-graded here
 * assignment/project → stored as pending, graded manually via /grading
 */

'use strict';

const { supabaseAdmin }              = require('../../integrations/supabase');
const { generateAssessmentFeedback } = require('../../integrations/openai');
const { emit, EVENTS }               = require('../../utils/eventEmitter');
const gradingService                 = require('./gradingService');

/**
 * Fetch a single assessment with its questions.
 * Strips correct answers before sending to the client.
 * @param {string} assessmentId
 * @returns {Promise<object>}
 */
async function getAssessmentById(assessmentId) {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .select('id, title, type, pass_mark, course_id, courses(id, title), questions')
    .eq('id', assessmentId)
    .single();

  if (error || !data) {
    const err = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }

  // Strip answer keys from questions before returning to the client
  const safe = {
    ...data,
    questions: (data.questions ?? []).map(({ answer: _a, ...q }) => q),
  };
  return safe;
}

/**
 * Submit answers for an assessment.
 * Auto-grades quizzes; stores assignments/projects as 'pending'.
 *
 * @param {string} assessmentId
 * @param {string} userId
 * @param {{ questionId: string, answer: string|string[] }[]} answers
 * @returns {Promise<object>} submission record
 */
async function submitAssessment(assessmentId, userId, answers) {
  // 1. Fetch full assessment (with answers for auto-grading)
  const { data: assessment, error: aErr } = await supabaseAdmin
    .from('assessments')
    .select('id, type, pass_mark, questions')
    .eq('id', assessmentId)
    .single();

  if (aErr || !assessment) {
    const err = new Error('Assessment not found');
    err.status = 404;
    throw err;
  }

  let score   = null;
  let status  = 'pending';
  let passed  = false;
  let aiFeedback = null;

  if (assessment.type === 'quiz') {
    // Auto-grade
    const questionMap = {};
    for (const q of assessment.questions ?? []) {
      questionMap[q.id] = q;
    }

    let correct = 0;
    for (const { questionId, answer } of answers) {
      const q = questionMap[questionId];
      if (!q) continue;

      // q.correct may be an index (number), an array of indices (multi_select),
      // or a legacy direct answer string (q.answer)
      let isCorrect = false;
      if (Array.isArray(q.correct)) {
        // Multi-select: expected = sorted array of option strings
        const expectedArr = q.correct.map((i) => q.options[i]).sort();
        const givenArr    = (Array.isArray(answer) ? [...answer] : [answer]).sort();
        isCorrect = JSON.stringify(expectedArr) === JSON.stringify(givenArr);
      } else if (typeof q.correct === 'number') {
        const expected = q.options?.[q.correct] ?? '';
        const given    = Array.isArray(answer) ? answer[0] : answer;
        isCorrect = String(given).trim().toLowerCase() === String(expected).trim().toLowerCase();
      } else {
        // Fallback: direct string comparison (legacy q.answer field)
        const expected = q.answer ?? '';
        const given    = Array.isArray(answer) ? answer.join(',') : answer;
        isCorrect = String(given).trim().toLowerCase() === String(expected).trim().toLowerCase();
      }
      if (isCorrect) correct++;
    }

    score  = Math.round((correct / assessment.questions.length) * 100);
    passed = score >= assessment.pass_mark;
    status = 'graded';

    // Non-blocking AI feedback for the last question
    const lastAnswer = answers[answers.length - 1];
    const lastQ      = questionMap[lastAnswer?.questionId];
    if (lastQ) {
      aiFeedback = await generateAssessmentFeedback({
        question:      lastQ.question ?? lastQ.text ?? lastQ.prompt ?? '',
        userAnswer:    String(lastAnswer.answer),
        correctAnswer: Array.isArray(lastQ.correct)
          ? lastQ.correct.map((i) => lastQ.options[i]).join(', ')
          : String(lastQ.options?.[lastQ.correct] ?? lastQ.answer ?? ''),
        score,
      });
    }
  }

  // 2. Persist submission
  const { data: submission, error: sErr } = await supabaseAdmin
    .from('submissions')
    .insert({
      assessment_id: assessmentId,
      user_id:       userId,
      answers,
      score,
      status,
      ai_feedback:   aiFeedback,
      submitted_at:  new Date().toISOString(),
    })
    .select()
    .single();

  if (sErr) throw sErr;

  emit(EVENTS.ASSESSMENT_SUBMITTED, { userId, assessmentId, submissionId: submission.id, score });

  if (passed) {
    emit(EVENTS.ASSESSMENT_PASSED, { userId, assessmentId, submissionId: submission.id, score });
    // Attempt to auto-complete course and issue certificate
    await gradingService.handlePassedAssessment(userId, assessmentId);
  }

  return { ...submission, passed };
}

module.exports = { getAssessmentById, submitAssessment };
