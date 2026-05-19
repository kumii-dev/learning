/**
 * src/cms/services/cmsService.js
 * CMS service — only admins may call these.
 * Source-of-truth write path for courses, modules, assessments + analytics reads.
 */

'use strict';

const { supabaseAdmin } = require('../../integrations/supabase');

/* ═══════════════════════════════════════════════════════════════════
   COURSES
═══════════════════════════════════════════════════════════════════ */

async function createCourse(payload) {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .insert({
      title:            payload.title,
      description:      payload.description,
      tags:             payload.tags ?? [],
      pass_mark:        payload.passMark,
      level:            payload.level ?? null,
      category:         payload.category ?? null,
      estimated_hours:  payload.estimatedHours ?? null,
      published:        false,
      created_at:       new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function listCoursesAdmin() {
  const [
    { data: courses, error },
    { data: enrolments },
  ] = await Promise.all([
    supabaseAdmin.from('courses').select('*').order('created_at', { ascending: false }),
    supabaseAdmin.from('enrolments').select('course_id, status'),
  ]);

  if (error) throw error;

  const statsMap = {};
  for (const e of enrolments ?? []) {
    if (!statsMap[e.course_id]) statsMap[e.course_id] = { enrolled: 0, completed: 0 };
    statsMap[e.course_id].enrolled++;
    if (e.status === 'completed') statsMap[e.course_id].completed++;
  }

  return (courses ?? []).map((c) => ({
    ...c,
    enrolled:  statsMap[c.id]?.enrolled  ?? 0,
    completed: statsMap[c.id]?.completed ?? 0,
  }));
}

async function updateCourse(id, payload) {
  const updates = {};
  if (payload.title           !== undefined) updates.title           = payload.title;
  if (payload.description     !== undefined) updates.description     = payload.description;
  if (payload.tags            !== undefined) updates.tags            = payload.tags;
  if (payload.passMark        !== undefined) updates.pass_mark       = payload.passMark;
  if (payload.level           !== undefined) updates.level           = payload.level;
  if (payload.category        !== undefined) updates.category        = payload.category;
  if (payload.estimatedHours  !== undefined) updates.estimated_hours = payload.estimatedHours;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('courses')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function deleteCourse(id) {
  const { error } = await supabaseAdmin.from('courses').delete().eq('id', id);
  if (error) throw error;
}

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

async function unpublishCourse(courseId) {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .update({ published: false })
    .eq('id', courseId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/* ═══════════════════════════════════════════════════════════════════
   MODULES
═══════════════════════════════════════════════════════════════════ */

async function createModule(payload) {
  const { data, error } = await supabaseAdmin
    .from('modules')
    .insert({
      course_id:  payload.courseId,
      title:      payload.title,
      content:    payload.content,
      video_url:  payload.videoUrl ?? null,
      order:      payload.order,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function upsertModules(courseId, modules) {
  // Delete all existing modules for this course, then re-insert the full set.
  // This avoids needing a unique constraint on (course_id, order) and is safe
  // because modules have no external FK references that would break on re-insert.
  await supabaseAdmin.from('modules').delete().eq('course_id', courseId);

  if (!modules || modules.length === 0) return [];

  const ts = new Date().toISOString();
  const rows = modules.map((m, i) => ({
    course_id:    courseId,
    title:        m.title,
    content:      m.content ?? '',
    content_type: m.contentType ?? 'text',
    video_url:    m.videoUrl  || null,
    pdf_url:      m.pdfUrl    || null,
    order:        i,
    created_at:   ts,
    updated_at:   ts,
  }));

  const { data, error } = await supabaseAdmin
    .from('modules')
    .insert(rows)
    .select();
  if (error) throw error;

  return data;
}

/* ═══════════════════════════════════════════════════════════════════
   ASSESSMENTS
═══════════════════════════════════════════════════════════════════ */

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

async function upsertAssessment(courseId, payload) {
  // Check if an assessment already exists for this course
  const { data: existing } = await supabaseAdmin
    .from('assessments')
    .select('id')
    .eq('course_id', courseId)
    .maybeSingle();

  const fields = {
    course_id:  courseId,
    type:       payload.type ?? 'quiz',
    title:      payload.title ?? 'Course Assessment',
    pass_mark:  payload.passMark ?? 70,
    questions:  payload.questions ?? [],
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    // UPDATE in-place — preserves the assessment ID so existing submissions stay intact
    const { data, error } = await supabaseAdmin
      .from('assessments')
      .update(fields)
      .eq('id', existing.id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // No existing assessment — safe to insert
  const { data, error } = await supabaseAdmin
    .from('assessments')
    .insert({ ...fields, created_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/* ═══════════════════════════════════════════════════════════════════
   ANALYTICS
═══════════════════════════════════════════════════════════════════ */

async function analyticsOverview() {
  const [
    { count: totalCourses },
    { count: publishedCourses },
    { data: enrolments },
    { data: grades },
  ] = await Promise.all([
    supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('courses').select('*', { count: 'exact', head: true }).eq('published', true),
    supabaseAdmin.from('enrolments').select('status, enrolled_at, course_id'),
    supabaseAdmin.from('grades').select('score'),
  ]);

  const totalEnrolled = enrolments?.length ?? 0;
  const completions   = enrolments?.filter((e) => e.status === 'completed').length ?? 0;
  const avgScore      = grades?.length
    ? Math.round(grades.reduce((s, g) => s + (g.score ?? 0), 0) / grades.length)
    : 0;

  // Enrollments per day for the last 7 days
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day   = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
    const count = enrolments?.filter((e) => e.enrolled_at?.slice(0, 10) === day).length ?? 0;
    last7.push({ day, label, count });
  }

  // Top 5 courses by enrollment
  const courseMap = {};
  for (const e of enrolments ?? []) {
    if (!courseMap[e.course_id]) courseMap[e.course_id] = { enrolled: 0, completed: 0 };
    courseMap[e.course_id].enrolled++;
    if (e.status === 'completed') courseMap[e.course_id].completed++;
  }
  const topCourseIds = Object.entries(courseMap)
    .sort(([, a], [, b]) => b.enrolled - a.enrolled)
    .slice(0, 5)
    .map(([id]) => id);

  let topCourses = [];
  if (topCourseIds.length > 0) {
    const { data: tc } = await supabaseAdmin
      .from('courses').select('id, title, published').in('id', topCourseIds);
    topCourses = (tc ?? []).map((c) => ({
      ...c,
      enrolled:  courseMap[c.id]?.enrolled  ?? 0,
      completed: courseMap[c.id]?.completed ?? 0,
    }));
  }

  return {
    totalCourses: totalCourses ?? 0,
    publishedCourses: publishedCourses ?? 0,
    totalEnrolled,
    completions,
    avgScore,
    last7,
    topCourses,
  };
}

async function analyticsCourse(courseId) {
  const [
    { data: course, error: courseErr },
    { data: enrolments },
    { data: grades },
  ] = await Promise.all([
    supabaseAdmin.from('courses').select('*').eq('id', courseId).single(),
    supabaseAdmin.from('enrolments').select('status, enrolled_at').eq('course_id', courseId),
    supabaseAdmin.from('grades').select('score, submitted_at').eq('course_id', courseId),
  ]);

  if (courseErr) throw courseErr;

  const enrolled   = enrolments?.length ?? 0;
  const completed  = enrolments?.filter((e) => e.status === 'completed').length ?? 0;
  const inProgress = enrolments?.filter((e) => e.status === 'in_progress').length ?? 0;
  const avgScore   = grades?.length
    ? Math.round(grades.reduce((s, g) => s + (g.score ?? 0), 0) / grades.length)
    : 0;

  const dist = [
    { label: '0–49%',   count: grades?.filter((g) => g.score < 50).length ?? 0 },
    { label: '50–69%',  count: grades?.filter((g) => g.score >= 50 && g.score < 70).length ?? 0 },
    { label: '70–84%',  count: grades?.filter((g) => g.score >= 70 && g.score < 85).length ?? 0 },
    { label: '85–100%', count: grades?.filter((g) => g.score >= 85).length ?? 0 },
  ];

  // Enrollments over last 30 days
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const day   = d.toISOString().slice(0, 10);
    const label = i % 5 === 0 ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';
    const count = enrolments?.filter((e) => e.enrolled_at?.slice(0, 10) === day).length ?? 0;
    last30.push({ day, label, count });
  }

  return { course, enrolled, completed, inProgress, avgScore, dist, last30 };
}

/* ═══════════════════════════════════════════════════════════════════
   LEARNERS
═══════════════════════════════════════════════════════════════════ */

async function listLearners() {
  const [
    { data: profiles },
    { data: enrolments },
    { data: grades },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, first_name, last_name, email, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabaseAdmin.from('enrolments').select('user_id, course_id, status, enrolled_at'),
    supabaseAdmin.from('grades').select('user_id, score'),
  ]);

  return (profiles ?? []).map((p) => {
    const ue  = enrolments?.filter((e) => e.user_id === p.id) ?? [];
    const ug  = grades?.filter((g) => g.user_id === p.id) ?? [];
    const avg = ug.length
      ? Math.round(ug.reduce((s, g) => s + (g.score ?? 0), 0) / ug.length)
      : null;
    return {
      ...p,
      enrolled:  ue.length,
      completed: ue.filter((e) => e.status === 'completed').length,
      avgScore:  avg,
    };
  });
}

/* ═══════════════════════════════════════════════════════════════════
   COURSE DETAIL (admin — includes drafts)
═══════════════════════════════════════════════════════════════════ */

async function getCourseById(courseId) {
  const { data: course, error } = await supabaseAdmin
    .from('courses')
    .select('*, modules(*), assessments(*)')
    .eq('id', courseId)
    .single();

  if (error || !course) {
    const err = new Error('Course not found');
    err.status = 404;
    throw err;
  }
  return course;
}

module.exports = {
  createCourse, listCoursesAdmin, getCourseById, updateCourse, deleteCourse, publishCourse, unpublishCourse,
  createModule, upsertModules,
  createAssessment, upsertAssessment,
  analyticsOverview, analyticsCourse,
  listLearners,
};

