/**
 * src/utils/validate.js
 * Input validation helpers using Zod.
 * Returns { success, data, errors } — never throws.
 */

'use strict';

const { z } = require('zod');

/**
 * Validate data against a Zod schema.
 * @template T
 * @param {z.ZodSchema<T>} schema
 * @param {unknown} data
 * @returns {{ success: boolean, data: T|null, errors: string[]|null }}
 */
function validate(schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data, errors: null };
  }
  const errors = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
  return { success: false, data: null, errors };
}

// ── Reusable schemas ─────────────────────────────────────────────────────────

const enrolmentSchema = z.object({
  courseId: z.string().uuid(),
});

const assessmentSubmitSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      answer:     z.union([z.string(), z.number(), z.array(z.string())]),
    })
  ).min(1),
});

const gradingSchema = z.object({
  submissionId: z.string().uuid(),
  score:        z.number().min(0).max(100),
  feedback:     z.string().optional(),
});

const cmsCourseSchema = z.object({
  title:       z.string().min(1).max(255),
  description: z.string().min(1),
  tags:        z.array(z.string()).optional(),
  passMark:    z.number().min(0).max(100),
});

const cmsModuleSchema = z.object({
  courseId:    z.string().uuid(),
  title:       z.string().min(1).max(255),
  content:     z.string().min(1),
  order:       z.number().int().min(0),
});

const cmsAssessmentSchema = z.object({
  courseId:    z.string().uuid(),
  type:        z.enum(['quiz', 'assignment', 'project']),
  title:       z.string().min(1),
  passMark:    z.number().min(0).max(100),
  questions:   z.array(z.object({
    id:       z.string().uuid(),
    prompt:   z.string().min(1),
    type:     z.enum(['mcq', 'short_answer', 'multi_select']),
    options:  z.array(z.string()).optional(),
    answer:   z.union([z.string(), z.array(z.string())]).optional(),
  })).optional(),
});

module.exports = {
  validate,
  enrolmentSchema,
  assessmentSubmitSchema,
  gradingSchema,
  cmsCourseSchema,
  cmsModuleSchema,
  cmsAssessmentSchema,
};
