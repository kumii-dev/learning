/**
 * client/src/admin/pages/AdminCourseEditor.jsx
 * Multi-step wizard: Details → Modules → Assessment → Publish.
 * Handles both Create (/admin/courses/new) and Edit (/admin/courses/:id/edit).
 */
import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../lib/apiClient';
import styles from './AdminCourseEditor.module.css';
import FeatherIcon from 'feather-icons-react';

const STEPS = ['Course Details', 'Modules', 'Assessment', 'Review & Publish'];

const CONTENT_TYPES = [
  { value: 'text',        label: 'Text',         icon: 'file-text' },
  { value: 'video_url',   label: 'Video URL',    icon: 'link' },
  { value: 'video_file',  label: 'Upload MP4',   icon: 'video' },
  { value: 'pdf',         label: 'Upload PDF',   icon: 'file' },
];

const BLANK_MODULE   = () => ({ title: '', content: '', contentType: 'text', videoUrl: '', pdfUrl: '', _uploadPct: null, _uploadErr: null });
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
  const fileRefs = useRef({});

  function add()     { setModules((m) => [...m, BLANK_MODULE()]); }
  function remove(i) { setModules((m) => m.filter((_, j) => j !== i)); }
  function upd(i, k, v) {
    setModules((m) => m.map((mod, j) => j === i ? { ...mod, [k]: v } : mod));
  }

  async function handleFileUpload(i, file, type) {
    if (!file) return;
    upd(i, '_uploadPct', 0);
    upd(i, '_uploadErr', null);
    try {
      // Step 1 — ask the backend for a Supabase signed upload URL.
      // This tiny JSON request is well within Vercel's 4.5 MB body limit.
      const { data: urlData } = await apiClient.post('/cms/upload-url', {
        filename: file.name,
        mimeType: file.type,
      });

      // Step 2 — PUT the file directly to Supabase Storage using XHR so we
      // can track upload progress without routing bytes through the server.
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', urlData.signedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.upload.onprogress = (e) => {
          const pct = e.total ? Math.round((e.loaded / e.total) * 100) : 0;
          setModules((m) => m.map((mod, j) => j === i ? { ...mod, _uploadPct: pct } : mod));
        };
        xhr.onload  = () => xhr.status < 400 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`));
        xhr.onerror = () => reject(new Error('Network error during upload'));
        xhr.send(file);
      });

      // Step 3 — use the public URL returned alongside the signed URL
      const publicUrl = urlData.publicUrl;
      if (type === 'pdf') {
        upd(i, 'pdfUrl', publicUrl);
      } else {
        upd(i, 'videoUrl', publicUrl);
      }
      upd(i, '_uploadPct', null);
    } catch (e) {
      upd(i, '_uploadPct', null);
      upd(i, '_uploadErr', e?.response?.data?.error ?? e.message ?? 'Upload failed');
    }
  }

  return (
    <div className={styles.stepBody}>
      {modules.map((mod, i) => (
        <div key={i} className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleNum}>Module {i + 1}</span>
            <button className={styles.removeBtn} onClick={() => remove(i)}>
              <FeatherIcon icon="x" size={14} /> Remove
            </button>
          </div>

          {/* Title */}
          <div className={styles.field}>
            <label className={styles.label}>Title *</label>
            <input className={styles.input} value={mod.title}
              onChange={(e) => upd(i, 'title', e.target.value)} placeholder="Module title" />
          </div>

          {/* Content type selector */}
          <div className={styles.field}>
            <label className={styles.label}>Content Type</label>
            <div className={styles.contentTypePicker}>
              {CONTENT_TYPES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.ctypeBtn} ${mod.contentType === value ? styles.ctypeActive : ''}`}
                  onClick={() => upd(i, 'contentType', value)}
                >
                  <FeatherIcon icon={icon} size={14} /> {label}
                </button>
              ))}
            </div>
          </div>

          {/* Text */}
          {mod.contentType === 'text' && (
            <div className={styles.field}>
              <label className={styles.label}>Content / Description</label>
              <textarea className={styles.textarea} rows={4} value={mod.content}
                onChange={(e) => upd(i, 'content', e.target.value)}
                placeholder="What this module covers…" />
            </div>
          )}

          {/* Video URL */}
          {mod.contentType === 'video_url' && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Video URL</label>
                <input className={styles.input} value={mod.videoUrl}
                  onChange={(e) => upd(i, 'videoUrl', e.target.value)}
                  placeholder="https://youtube.com/… or https://vimeo.com/…" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Notes / Description <span className={styles.hint}>(optional)</span></label>
                <textarea className={styles.textarea} rows={3} value={mod.content}
                  onChange={(e) => upd(i, 'content', e.target.value)}
                  placeholder="Supporting text for this lesson…" />
              </div>
            </>
          )}

          {/* Upload MP4 */}
          {mod.contentType === 'video_file' && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>Video File <span className={styles.hint}>(MP4, WebM — max 500 MB)</span></label>
                {mod.videoUrl ? (
                  <div className={styles.uploadedFile}>
                    <FeatherIcon icon="video" size={14} />
                    <span className={styles.uploadedName}>Video uploaded</span>
                    <a href={mod.videoUrl} target="_blank" rel="noreferrer" className={styles.uploadedLink}>Preview ↗</a>
                    <button className={styles.removeUpload} onClick={() => upd(i, 'videoUrl', '')}>
                      <FeatherIcon icon="x" size={12} />
                    </button>
                  </div>
                ) : (
                  <label className={styles.fileDropZone}>
                    <FeatherIcon icon="upload" size={20} />
                    <span>{mod._uploadPct !== null ? `Uploading… ${mod._uploadPct}%` : 'Click to choose or drag an MP4'}</span>
                    <input ref={(el) => (fileRefs.current[`video-${i}`] = el)}
                      type="file" accept="video/mp4,video/webm,video/ogg" className={styles.fileInput}
                      onChange={(e) => handleFileUpload(i, e.target.files[0], 'video')}
                      disabled={mod._uploadPct !== null} />
                    {mod._uploadPct !== null && (
                      <div className={styles.uploadBar}>
                        <div className={styles.uploadBarFill} style={{ width: `${mod._uploadPct}%` }} />
                      </div>
                    )}
                  </label>
                )}
                {mod._uploadErr && <p className={styles.uploadErr}>{mod._uploadErr}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Notes / Description <span className={styles.hint}>(optional)</span></label>
                <textarea className={styles.textarea} rows={3} value={mod.content}
                  onChange={(e) => upd(i, 'content', e.target.value)}
                  placeholder="Supporting text for this lesson…" />
              </div>
            </>
          )}

          {/* Upload PDF */}
          {mod.contentType === 'pdf' && (
            <>
              <div className={styles.field}>
                <label className={styles.label}>PDF File <span className={styles.hint}>(max 500 MB)</span></label>
                {mod.pdfUrl ? (
                  <div className={styles.uploadedFile}>
                    <FeatherIcon icon="file" size={14} />
                    <span className={styles.uploadedName}>PDF uploaded</span>
                    <a href={mod.pdfUrl} target="_blank" rel="noreferrer" className={styles.uploadedLink}>Preview ↗</a>
                    <button className={styles.removeUpload} onClick={() => upd(i, 'pdfUrl', '')}>
                      <FeatherIcon icon="x" size={12} />
                    </button>
                  </div>
                ) : (
                  <label className={styles.fileDropZone}>
                    <FeatherIcon icon="upload" size={20} />
                    <span>{mod._uploadPct !== null ? `Uploading… ${mod._uploadPct}%` : 'Click to choose a PDF'}</span>
                    <input ref={(el) => (fileRefs.current[`pdf-${i}`] = el)}
                      type="file" accept="application/pdf" className={styles.fileInput}
                      onChange={(e) => handleFileUpload(i, e.target.files[0], 'pdf')}
                      disabled={mod._uploadPct !== null} />
                    {mod._uploadPct !== null && (
                      <div className={styles.uploadBar}>
                        <div className={styles.uploadBarFill} style={{ width: `${mod._uploadPct}%` }} />
                      </div>
                    )}
                  </label>
                )}
                {mod._uploadErr && <p className={styles.uploadErr}>{mod._uploadErr}</p>}
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Summary / Description <span className={styles.hint}>(optional)</span></label>
                <textarea className={styles.textarea} rows={3} value={mod.content}
                  onChange={(e) => upd(i, 'content', e.target.value)}
                  placeholder="Brief description of this document…" />
              </div>
            </>
          )}
        </div>
      ))}
      <button className={styles.addBtn} onClick={add}>+ Add Module</button>
    </div>
  );
}

/* ── Step 3: Assessment ─────────────────────────────────────────────────── */
function AssessmentStep({ assessment, setAssessment }) {
  const [logoUploading, setLogoUploading] = useState({ left: false, right: false });
  const [logoUploadErr, setLogoUploadErr] = useState({ left: null, right: null });

  async function handleLogoUpload(side, file) {
    if (!file) return;
    setLogoUploading((s) => ({ ...s, [side]: true }));
    setLogoUploadErr((s) => ({ ...s, [side]: null }));
    try {
      const fd = new FormData();
      fd.append('file', file);
      const { data } = await apiClient.post('/cms/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = data.data?.url ?? data.url;
      const key = side === 'left' ? 'logoLeftUrl' : 'logoRightUrl';
      setAssessment((a) => ({ ...a, [key]: url }));
    } catch (e) {
      setLogoUploadErr((s) => ({ ...s, [side]: e.message ?? 'Upload failed' }));
    } finally {
      setLogoUploading((s) => ({ ...s, [side]: false }));
    }
  }

  function removeLogo(side) {
    const key = side === 'left' ? 'logoLeftUrl' : 'logoRightUrl';
    setAssessment((a) => ({ ...a, [key]: '' }));
  }

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
        <div className={styles.field}>
          <label className={styles.label}>Timer (minutes)</label>
          <input className={styles.input} type="number" min="1" max="180" value={assessment.timerMinutes ?? 5}
            onChange={(e) => setAssessment((a) => ({ ...a, timerMinutes: Math.max(1, parseInt(e.target.value, 10) || 5) }))}
            placeholder="e.g. 5" />
        </div>
      </div>

      {/* ── Certificate logos ───────────────────────────────────────── */}
      <div className={styles.moduleCard}>
        <div className={styles.moduleHeader}>
          <span className={styles.moduleNum}>Certificate Logos</span>
          <span className={styles.hint}>Displayed at the top of the issued certificate</span>
        </div>
        <div className={styles.fieldRow}>
          {/* Logo Left */}
          <div className={styles.field}>
            <label className={styles.label}>Top-Left Logo <span className={styles.hint}>(partner / organisation)</span></label>
            {assessment.logoLeftUrl ? (
              <div className={styles.uploadedFile}>
                <FeatherIcon icon="image" size={14} />
                <img src={assessment.logoLeftUrl} alt="Left logo preview" style={{ height: 32, maxWidth: 120, objectFit: 'contain', marginLeft: 8 }} />
                <button className={styles.removeUpload} onClick={() => removeLogo('left')}>
                  <FeatherIcon icon="x" size={12} />
                </button>
              </div>
            ) : (
              <label className={styles.fileDropZone}>
                <FeatherIcon icon="upload" size={18} />
                <span>{logoUploading.left ? 'Uploading…' : 'Click to upload logo (PNG/JPG)'}</span>
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className={styles.fileInput}
                  onChange={(e) => handleLogoUpload('left', e.target.files[0])}
                  disabled={logoUploading.left} />
              </label>
            )}
            {logoUploadErr.left && <p className={styles.uploadErr}>{logoUploadErr.left}</p>}
          </div>

          {/* Logo Right */}
          <div className={styles.field}>
            <label className={styles.label}>Top-Right Logo <span className={styles.hint}>(partner / accreditor)</span></label>
            {assessment.logoRightUrl ? (
              <div className={styles.uploadedFile}>
                <FeatherIcon icon="image" size={14} />
                <img src={assessment.logoRightUrl} alt="Right logo preview" style={{ height: 32, maxWidth: 120, objectFit: 'contain', marginLeft: 8 }} />
                <button className={styles.removeUpload} onClick={() => removeLogo('right')}>
                  <FeatherIcon icon="x" size={12} />
                </button>
              </div>
            ) : (
              <label className={styles.fileDropZone}>
                <FeatherIcon icon="upload" size={18} />
                <span>{logoUploading.right ? 'Uploading…' : 'Click to upload logo (PNG/JPG)'}</span>
                <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className={styles.fileInput}
                  onChange={(e) => handleLogoUpload('right', e.target.files[0])}
                  disabled={logoUploading.right} />
              </label>
            )}
            {logoUploadErr.right && <p className={styles.uploadErr}>{logoUploadErr.right}</p>}
          </div>
        </div>
        <p className={styles.hint} style={{ marginTop: 6 }}>
          The Kumii logo will appear at the bottom-left of the certificate automatically.
        </p>
      </div>

      {assessment.questions.map((q, i) => (
        <div key={i} className={styles.moduleCard}>
          <div className={styles.moduleHeader}>
            <span className={styles.moduleNum}>Question {i + 1}</span>
            <button className={styles.removeBtn} onClick={() => removeQ(i)}><FeatherIcon icon="x" size={14} /> Remove</button>
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
              <label className={styles.label}>Options (mark correct with <FeatherIcon icon="check" size={13} />)</label>
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
        <p className={styles.reviewMeta}>{assessment.questions.length} questions · Pass: {assessment.passMark}% · Timer: {assessment.timerMinutes ?? 5} min</p>
      </div>
      {!courseId && (
        <div className={styles.publishBox}>
          <p className={styles.publishNote}>
            <FeatherIcon icon="check-circle" size={14} /> Everything looks good! Save as a draft first, then publish when ready.
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
    title: 'Course Assessment', passMark: 70, timerMinutes: 5, questions: [BLANK_QUESTION()],
    logoLeftUrl: '', logoRightUrl: '',
  });

  function patchForm(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  // Load existing course for edit
  useEffect(() => {
    if (!isEdit) return;
    Promise.all([
      apiClient.get(`/cms/courses/${id}`),
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
          title:       m.title,
          content:     m.content ?? '',
          contentType: m.content_type ?? 'text',
          videoUrl:    m.video_url ?? '',
          pdfUrl:      m.pdf_url   ?? '',
          _uploadPct:  null,
          _uploadErr:  null,
        })));
      }
      // assessments is an array — take the first one
      const firstAssessment = c.assessments?.[0] ?? c.assessment ?? null;
      // certificate_templates is an array — take the first one
      const certTemplate = c.certificate_templates?.[0] ?? null;
      if (firstAssessment) {
        setAssessment({
          title:        firstAssessment.title ?? 'Course Assessment',
          passMark:     firstAssessment.pass_mark ?? 70,
          timerMinutes: firstAssessment.timer_minutes ?? 5,
          questions:    firstAssessment.questions ?? [BLANK_QUESTION()],
          logoLeftUrl:  certTemplate?.logo_left_url  ?? '',
          logoRightUrl: certTemplate?.logo_right_url ?? '',
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
        modules: modules
          .filter((m) => m.title)
          .map(({ _uploadPct: _p, _uploadErr: _e, ...m }) => m),
      });

      // Save assessment
      if (assessment.questions.filter((q) => q.text).length > 0) {
        await apiClient.put('/cms/assessments', {
          courseId,
          ...assessment,
          timerMinutes: Number(assessment.timerMinutes) || 5,
          logoLeftUrl:  assessment.logoLeftUrl  || null,
          logoRightUrl: assessment.logoRightUrl || null,
          questions: assessment.questions
            .filter((q) => q.text)
            .map((q, idx) => ({
              id:       q.id ?? idx + 1,
              type:     q.type === 'multi' ? 'multi_select' : q.type,
              question: q.text,
              options:  q.options,
              correct:  q.correct,
              points:   q.points ?? 1,
            })),
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
          <FeatherIcon icon="arrow-left" size={16} /> Back to Courses
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
            <span className={styles.stepCircle}>{i < step ? <FeatherIcon icon="check" size={14} /> : i + 1}</span>
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
              <FeatherIcon icon="arrow-left" size={16} /> Previous
            </button>
          )}
          {step < STEPS.length - 1 && (
            <button className={styles.nextBtn} onClick={() => setStep((s) => s + 1)}>
              Next <FeatherIcon icon="arrow-right" size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
