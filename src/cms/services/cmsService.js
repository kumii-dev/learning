/**
 * src/cms/services/cmsService.js
 * CMS service — only admins may call these.
 * This is the source-of-truth write path for courses, modules, assessments.
 */

'use strict';

const { supabaseAdmin } = require('../../integrations/supabase');

async function createCourse(payload) {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .insert({
      title:       payload.title,
      description: payload.description,
      tags:        payload.tags ?? [],
      pass_mark:   payload.passMark,
      published:   false,
      created_at:  new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createModule(payload) {
  const { data, error } = await supabaseAdmin
    .from('modules')
    .insert({
      course_id:  payload.courseId,
      title:      payload.title,
      content:    payload.content,
      order:      payload.order,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function createAssessment(payload) {
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .insert({
      course_id:  payload.courseId,
      type:       payload.type,
      title:      payload.title,
      pass_mark:  payload.passMark,
      questions:  payload.questions ?? [],
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Publish a course — makes it visible to learners.
 * @param {string} courseId
 */
async function publishCourse(courseId) {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .update({ published: true, published_at: new Date().toISOString() })
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

module.exports = { createCourse, createModule, createAssessment, publishCourse };
