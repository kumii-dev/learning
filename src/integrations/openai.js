/**
 * src/integrations/openai.js
 * OpenAI client wrapper.
 * AI is used ONLY for: recommendations, skill-gap analysis, assessment feedback.
 * Core flows must NEVER be blocked if AI fails.
 */

'use strict';

const OpenAI        = require('openai');
const { toFile }    = require('openai/uploads');
const axios         = require('axios');
const logger        = require('../utils/logger');

// Lazy singleton — avoids throwing at module load when the key is not yet set.
// timeout: 8 000 ms — keeps well inside Vercel's 10 s function limit so safeAI
// can catch the AbortError and return null rather than the function being killed.
let _client = null;
function getClient() {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY env var is not set');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 8_000 });
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

module.exports = { getCourseRecommendations, analyseSkillGap, generateAssessmentFeedback, transcribeAudio, summariseTranscript };

/* ── Audio Transcription (Whisper) ─────────────────────────────────────────── */

/**
 * Transcribe a session recording using OpenAI Whisper.
 * Streams the file from the provided URL directly to the Whisper API —
 * avoids writing to disk and keeps memory usage low for large recordings.
 *
 * Whisper has a 25 MB file size limit.  For longer recordings Daily.co
 * transcripts should be used instead (see videoProvider.getSessionTranscripts).
 *
 * @param {string} downloadUrl  Pre-signed URL to the recording (mp4 / webm)
 * @param {string} [filename]   Original filename hint for MIME detection
 * @returns {Promise<string|null>}  Plain-text transcript, or null on failure
 */
async function transcribeAudio(downloadUrl, filename = 'recording.mp4') {
  if (!downloadUrl) return null;

  return safeAI(async (ai) => {
    // 1. Stream the recording from the pre-signed URL
    const response = await axios.get(downloadUrl, {
      responseType: 'stream',
      timeout:      120_000,   // 2 min — large files
    });

    // 2. Wrap the stream in an OpenAI-compatible File object
    const fileObj = await toFile(response.data, filename, {
      type: response.headers['content-type'] ?? 'video/mp4',
    });

    // 3. Send to Whisper — override the default 8 s client timeout;
    //    a 2–3 minute recording typically takes 30–90 s to transcribe.
    const transcription = await ai.audio.transcriptions.create(
      {
        file:            fileObj,
        model:           'whisper-1',
        response_format: 'text',
        language:        'en',
      },
      { timeout: 180_000 },   // 3-minute cap; overrides the 8 s client default
    );

    return typeof transcription === 'string'
      ? transcription.trim()
      : (transcription?.text?.trim() ?? null);
  });
}

/* ── Transcript Summary (GPT-4o) ───────────────────────────────────────────── */

/**
 * Generate a structured Markdown summary of a session transcript using GPT-4o.
 *
 * @param {object} opts
 * @param {string}  opts.transcript   Full transcript text
 * @param {string}  opts.sessionTitle Session / webinar title
 * @param {string}  [opts.instructor] Instructor / host name
 * @param {string}  [opts.topic]      Session topic / subject area
 * @returns {Promise<string|null>}  Markdown summary, or null on failure
 */
async function summariseTranscript({ transcript, sessionTitle, instructor, topic }) {
  if (!transcript?.trim()) return null;

  // Truncate very long transcripts to stay within token limits (~30 000 chars ≈ 7 500 tokens)
  const MAX_CHARS  = 28_000;
  const truncated  = transcript.length > MAX_CHARS
    ? transcript.slice(0, MAX_CHARS) + '\n\n[Transcript truncated for brevity]'
    : transcript;

  const contextLine = [
    `Session: "${sessionTitle}"`,
    instructor ? `Host: ${instructor}` : '',
    topic      ? `Topic: ${topic}`     : '',
  ].filter(Boolean).join(' | ');

  return safeAI(async (ai) => {
    const completion = await ai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an expert learning facilitator. Analyse the provided live-session transcript and produce a structured Markdown summary for the session administrator and learners. Use clear headings.

Your summary MUST include the following sections (use ## for headings):
## 🎯 Session Overview
One paragraph describing the session purpose and key context.

## 📋 Key Topics Covered
Bulleted list of the main topics discussed.

## 💡 Key Insights & Takeaways
The most important learning points — concise bullet points.

## ✅ Action Items
Concrete next steps or tasks mentioned in the session. If none, say "No specific action items were identified."

## ❓ Questions & Answers
Summarise significant questions raised and answers given. If none, say "No notable Q&A captured."

## 📝 Notable Quotes
Up to 3 impactful or memorable direct quotes from the session (only if clearly present in the transcript). Wrap each in > blockquote.

Keep the tone professional and accessible. Write for learners who were not in the session.`,
        },
        {
          role: 'user',
          content: `${contextLine}\n\n--- TRANSCRIPT ---\n${truncated}`,
        },
      ],
      max_tokens: 1_800,
    });

    return completion.choices[0]?.message?.content?.trim() ?? null;
  });
}
