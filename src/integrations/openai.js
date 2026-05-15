/**
 * src/integrations/openai.js
 * OpenAI client wrapper.
 * AI is used ONLY for: recommendations, skill-gap analysis, assessment feedback.
 * Core flows must NEVER be blocked if AI fails.
 */

'use strict';

const OpenAI = require('openai');
const logger = require('../utils/logger');

// Lazy singleton — avoids throwing at module load when the key is not yet set
let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY env var is not set');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

/**
 * Safe wrapper — returns null instead of throwing if OpenAI is unavailable.
 * @param {Function} fn  async function that uses `client`
 * @returns {Promise<unknown|null>}
 */
async function safeAI(fn) {
  try {
    return await fn(getClient());
  } catch (err) {
    logger.warn('OpenAI call failed (non-blocking)', { message: err.message });
    return null;
  }
}

/**
 * Generate course recommendations for a user based on their skill profile.
 * @param {{ completedCourseIds: string[], skills: string[], persona: string }} profile
 * @returns {Promise<string|null>}
 */
async function getCourseRecommendations(profile) {
  return safeAI(async (ai) => {
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a corporate learning advisor. Suggest 3 concise course topics based on the learner profile. Return a JSON array of strings.',
        },
        {
          role: 'user',
          content: JSON.stringify(profile),
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 300,
    });
    const raw = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(raw);
    return parsed.recommendations ?? parsed;
  });
}

/**
 * Analyse skill gaps from completed assessments.
 * @param {{ assessmentResults: object[], targetRole: string }} data
 * @returns {Promise<string|null>}
 */
async function analyseSkillGap(data) {
  return safeAI(async (ai) => {
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a skills analyst. Identify 3 key skill gaps and learning priorities from the assessment data. Return JSON with keys: gaps (array), priorities (array).',
        },
        {
          role: 'user',
          content: JSON.stringify(data),
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 400,
    });
    return JSON.parse(completion.choices[0]?.message?.content ?? '{}');
  });
}

/**
 * Generate personalised feedback for an assessment submission.
 * @param {{ question: string, userAnswer: string, correctAnswer: string, score: number }} submission
 * @returns {Promise<string|null>}
 */
async function generateAssessmentFeedback(submission) {
  return safeAI(async (ai) => {
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a supportive tutor. Write 2–3 sentences of constructive feedback for a learner based on their assessment answer. Be specific and encouraging.',
        },
        {
          role: 'user',
          content: JSON.stringify(submission),
        },
      ],
      max_tokens: 200,
    });
    return completion.choices[0]?.message?.content ?? null;
  });
}

module.exports = { getCourseRecommendations, analyseSkillGap, generateAssessmentFeedback };
