/**
 * client/src/admin/pages/AdminCourseEditor.jsx
 * Multi-step wizard: Details → Modules → Assessment → Publish.
 * Handles both Create (/admin/courses/new) and Edit (/admin/courses/:id/edit).
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import styles from './AdminCourseEditor.module.css';

const STEPS = ['Course Details', 'Modules', 'Assessment', 'Review & Publish'];

const BLANK_MODULE  = () => ({ title: '', content: '', videoUrl: '' });
const BLANK_QUESTION = () => ({ type: 'mcq', text: '', options: ['', '', '', ''], correct: 0, points: 1 });

/* ── Step 1: Course details ─────────────────────────────────────────────── */
function DetailsStep({ form, onChange }) {
  return (
    <div className={styles.stepBody}>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Course Title *</label>
          <input className={styles.input} value={form.title} required
            onChange={(e) => onChange('title', e.target.value)} placeholder="e.g. Financial Modelling Fundamentals" />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Description *</label>
        <textarea className={styles.textarea} rows={4} value={form.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="What will learners gain from this course?" />
      </div>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Level</label>
          <select className={styles.select} value={form.level} onChange={(e) => onChange('level', e.target.value)}>
            <option value="">— Select —</option>
            {['Beginner', 'Intermediate', 'Advanced'].map((l) => (
              <option key={l} value={l.toLowerCase()}>{l}</option>
            ))}
          </select>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Category</label>
          <input className={styles.input} value={form.category}
            onChange={(e) => onChange('category', e.target.value)} placeholder="e.g. Finance, Tech, Business" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Estimated Hours</label>
          <input className={styles.input} type="number" min="0" value={form.estimatedHours}
            onChange={(e) => onChange('estimatedHours', e.target.value)} placeholder="e.g. 6" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Pass Mark (%)</label>
          <input className={styles.input} type="number" min="0" max="100" value={form.passMark}
            onChange={(e) => onChange('passMark', e.target.value)} placeholder="e.g. 70" />
        </div>
      </div>
      <div className={styles.field}>
        <label className={styles.label}>Tags <span className={styles.hint}>(comma-separated)</span></label>
        <input className={styles.input} value={form.tagsStr}
          onChange={(e) => onChange('tagsStr', e.target.value)} placeholder="e.g. excel, accounting, startup" />
      </div>
    </div>
  );
}

/* ── Step 2: Modules ────────────────────────────────────────────────────── */
function ModulesStep({ modules, setModules }) {
  function add()    { setModules((m) => [...m, BLANK_MODULE()]); }
  function remove(i){ setModules((m) => m.filter((_, j) => j !== i)); }
  function upd(i, k, v) {
    setModules((m) => m.map((mod, j) => j === i ? { ...mod, [k]: v } : mod));
  }

  return (
    <div className={styles.stepBody}>
      {modules.map((mod, i) => (
        <div key={i} className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleNum}>Module {i + 1}</span>
            <button className={styles.removeBtn} onClick={() => remove(i)}>✕ Remove</button>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input className={styles.input} value={mod.title}
              onChange={(e) => upd(i, 'title', e.target.value)} placeholder="Module title" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Content / Description</label>
            <textarea className={styles.textarea} rows={3} value={mod.content}
              onChange={(e) => upd(i, 'content', e.target.value)} placeholder="What this module covers…" />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Video URL <span className={styles.hint}>(optional)</span></label>
            <input className={styles.input} value={mod.videoUrl}
              onChange={(e) => upd(i, 'videoUrl', e.target.value)} placeholder="https://…" />
          </div>
        </div>
      ))}
      <button className={styles.addBtn} onClick={add}>+ Add Module</button>
    </div>
  );
}

/* ── Step 3: Assessment ─────────────────────────────────────────────────── */
function AssessmentStep({ assessment, setAssessment }) {
  function addQ() { setAssessment((a) => ({ ...a, questions: [...a.questions, BLANK_QUESTION()] })); }
  function removeQ(i) { setAssessment((a) => ({ ...a, questions: a.questions.filter((_, j) => j !== i) })); }
  function updQ(i, k, v) {
    setAssessment((a) => ({
      ...a,
      questions: a.questions.map((q, j) => j === i ? { ...q, [k]: v } : q),
    }));
  }
  function updOption(qi, oi, v) {
    setAssessment((a) => ({
      ...a,
      questions: a.questions.map((q, j) => {
        if (j !== qi) return q;
        const options = [...q.options];
        options[oi] = v;
        return { ...q, options };
      }),
    }));
  }

  return (
    <div className={styles.stepBody}>
      <div className={styles.fieldRow}>
        <div className={styles.field}>
          <label className={styles.label}>Assessment Title</label>
          <input className={styles.input} value={assessment.title}
            onChange={(e) => setAssessment((a) => ({ ...a, title: e.target.value }))}
            placeholder="e.g. Final Quiz" />
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Pass Mark (%)</label>
          <input className={styles.input} type="number" min="0" max="100" value={assessment.passMark}
            onChange={(e) => setAssessment((a) => ({ ...a, passMark: e.target.value }))} />
        </div>
      </div>

      {assessment.questions.map((q, i) => (
        <div key={i} className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleNum}>Question {i + 1}</span>
            <button className={styles.removeBtn} onClick={() => removeQ(i)}>✕ Remove</button>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Type</label>
              <select className={styles.select} value={q.type} onChange={(e) => updQ(i, 'type', e.target.value)}>
                <option value="mcq">Multiple Choice</option>
                <option value="multi">Multi-Select</option>
                <option value="short_answer">Short Answer</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Points</label>
              <input className={styles.input} type="number" min="1" value={q.points}
                onChange={(e) => updQ(i, 'points', parseInt(e.target.value, 10) || 1)} />
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Question Text *</label>
            <textarea className={styles.textarea} rows={2} value={q.text}
              onChange={(e) => updQ(i, 'text', e.target.value)} placeholder="Write the question…" />
          </div>
          {(q.type === 'mcq' || q.type === 'multi') && (
            <div className={styles.field}>
              <label className={styles.label}>Options (mark correct with ✓)</label>
              {q.options.map((opt, oi) => (
                <div key={oi} className={styles.optionRow}>
                  <input
                    type={q.type === 'mcq' ? 'radio' : 'checkbox'}
                    name={`q${i}-correct`}
                    checked={q.type === 'mcq' ? q.correct === oi : (Array.isArray(q.correct) ? q.correct.includes(oi) : false)}
                    onChange={() => {
                      if (q.type === 'mcq') {
                        updQ(i, 'correct', oi);
                      } else {
                        const cur = Array.isArray(q.correct) ? q.correct : [];
                        const next = cur.includes(oi) ? cur.filter((x) => x !== oi) : [...cur, oi];
                        updQ(i, 'correct', next);
                      }
                    }}
                    className={styles.optionCheck}
                  />
                  <input className={styles.optionInput} value={opt}
                    onChange={(e) => updOption(i, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`} />
                </div>
              ))}
              <button className={styles.addSmallBtn} onClick={() => updQ(i, 'options', [...q.options, ''])}>
                + Add option
              </button>
            </div>
          )}
        </div>
      ))}
      <button className={styles.addBtn} onClick={addQ}>+ Add Question</button>
    </div>
  );
}

/* ── Step 4: Review & Publish ───────────────────────────────────────────── */
function ReviewStep({ form, modules, assessment, courseId, onPublish, publishing }) {
  return (
    <div className={styles.stepBody}>
      <div className={styles.reviewSection}>
        <h3 className={styles.reviewTitle}>Course Details</h3>
        <p><strong>{form.title}</strong></p>
        <p className={styles.reviewMuted}>{form.description}</p>
        <p className={styles.reviewMeta}>
          Level: {form.level || '—'} · Category: {form.category || '—'} ·
          {form.estimatedHours}h · Pass mark: {form.passMark}%
        </p>
      </div>
      <div className={styles.reviewSection}>
        <h3 className={styles.reviewTitle}>Modules ({modules.length})</h3>
        {modules.map((m, i) => (
          <div key={i} className={styles.reviewItem}>
            <span className={styles.reviewNum}>{i + 1}</span>
            <span>{m.title || <em>Untitled</em>}</span>
          </div>
        ))}
      </div>
      <div className={styles.reviewSection}>
        <h3 className={styles.reviewTitle}>Assessment: {assessment.title}</h3>
        <p className={styles.reviewMeta}>{assessment.questions.length} questions · Pass: {assessment.passMark}%</p>
      </div>
      {!courseId && (
        <div className={styles.publishBox}>
          <p className={styles.publishNote}>
            ✓ Everything looks good! Save as a draft first, then publish when ready.
          </p>
          <button className={styles.publishBtn} onClick={() => onPublish(false)} disabled={publishing}>
            {publishing ? 'Saving…' : 'Save as Draft'}
          </button>
          <button className={styles.publishBtnGreen} onClick={() => onPublish(true)} disabled={publishing}>
            {publishing ? 'Publishing…' : 'Save & Publish'}
          </button>
        </div>
      )}
      {courseId && (
        <div className={styles.publishBox}>
          <button className={styles.publishBtnGreen} onClick={() => onPublish(true)} disabled={publishing}>
            {publishing ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function AdminCourseEditor() {
  const { id }    = useParams();   // undefined on /new
  const navigate  = useNavigate();
  const isEdit    = !!id;

  const [step,       setStep]       = useState(0);
  const [loading,    setLoading]    = useState(isEdit);
  const [publishing, setPublishing] = useState(false);
  const [error,      setError]      = useState(null);

  const [form, setForm] = useState({
    title: '', description: '', level: '', category: '',
    estimatedHours: '', passMark: 70, tagsStr: '',
  });
  const [modules,    setModules]    = useState([BLANK_MODULE()]);
  const [assessment, setAssessment] = useState({
    title: 'Course Assessment', passMark: 70, questions: [BLANK_QUESTION()],
  });

  function patchForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Load existing course for edit
  useEffect(() => {
    if (!isEdit) return;
    Promise.all([
      apiClient.get(`/courses/${id}`),
    ]).then(([courseRes]) => {
      const c = courseRes.data.data;
      setForm({
        title:          c.title ?? '',
        description:    c.description ?? '',
        level:          c.level ?? '',
        category:       c.category ?? '',
        estimatedHours: c.estimated_hours ?? '',
        passMark:       c.pass_mark ?? 70,
        tagsStr:        (c.tags ?? []).join(', '),
      });
      if (c.modules?.length) {
        setModules(c.modules.map((m) => ({
          title: m.title, content: m.content ?? '', videoUrl: m.video_url ?? '',
        })));
      }
      if (c.assessment) {
        setAssessment({
          title:     c.assessment.title ?? 'Course Assessment',
          passMark:  c.assessment.pass_mark ?? 70,
          questions: c.assessment.questions ?? [BLANK_QUESTION()],
        });
      }
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  async function save(publish = false) {
    setPublishing(true);
    setError(null);
    try {
      const payload = {
        title:          form.title,
        description:    form.description,
        level:          form.level || null,
        category:       form.category || null,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : null,
        passMark:       Number(form.passMark) || 70,
        tags:           form.tagsStr.split(',').map((t) => t.trim()).filter(Boolean),
      };

      let courseId = id;

      if (isEdit) {
        await apiClient.put(`/cms/courses/${id}`, payload);
      } else {
        const { data } = await apiClient.post('/cms/courses', payload);
        courseId = data.data.id;
      }

      // Save modules
      await apiClient.put('/cms/modules', {
        courseId,
        modules: modules.filter((m) => m.title),
      });

      // Save assessment
      if (assessment.questions.filter((q) => q.text).length > 0) {
        await apiClient.put('/cms/assessments', {
          courseId,
          ...assessment,
          questions: assessment.questions.filter((q) => q.text),
        });
      }

      // Publish if requested
      if (publish && !isEdit) {
        await apiClient.post(`/cms/courses/${courseId}/publish`);
      }

      navigate('/admin/courses');
    } catch (e) {
      setError(e.message);
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <div style={{ padding: '2rem', color: '#64748b' }}>Loading course…</div>;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.pageHeader}>
        <button className={styles.backBtn} onClick={() => navigate('/admin/courses')}>
          ← Back to Courses
        </button>
        <h1 className={styles.pageTitle}>{isEdit ? 'Edit Course' : 'New Course'}</h1>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Step indicator */}
      <div className={styles.stepper}>
        {STEPS.map((s, i) => (
          <button
            key={s}
            className={`${styles.stepDot} ${i === step ? styles.stepActive : ''} ${i < step ? styles.stepDone : ''}`}
            onClick={() => setStep(i)}
          >
            <span className={styles.stepCircle}>{i < step ? '✓' : i + 1}</span>
            <span className={styles.stepLabel}>{s}</span>
          </button>
        ))}
      </div>

      {/* Step content */}
      <div className={styles.stepCard}>
        <h2 className={styles.stepTitle}>{STEPS[step]}</h2>
        {step === 0 && <DetailsStep    form={form}            onChange={patchForm} />}
        {step === 1 && <ModulesStep    modules={modules}      setModules={setModules} />}
        {step === 2 && <AssessmentStep assessment={assessment} setAssessment={setAssessment} />}
        {step === 3 && (
          <ReviewStep form={form} modules={modules} assessment={assessment}
            courseId={isEdit ? id : null}
            onPublish={save} publishing={publishing} />
        )}

        {/* Nav buttons */}
        <div className={styles.stepNav}>
          {step > 0 && (
            <button className={styles.prevBtn} onClick={() => setStep((s) => s - 1)}>
              ← Previous
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button className={styles.nextBtn} onClick={() => setStep((s) => s + 1)}>
              Next →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
