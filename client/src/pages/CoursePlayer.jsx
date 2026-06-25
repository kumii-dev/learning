/**
 * client/src/pages/CoursePlayer.jsx
 *
 * Full course-player experience.
 * Route: /courses/:id/player
 *
 * Data shape (from GET /courses/:id):
 *   course.modules[]    — each module is a lesson { id, title, content, content_type, video_url, pdf_url, order }
 *   course.assessments[] — [{ id, title, type }]
 *
 * Layout:
 *   ┌──────────────────┬──────────────────────────────┐
 *   │  Sidebar         │  Lesson content / video       │
 *   │  module list     │  Tabs: Content · Notes        │
 *   └──────────────────┴──────────────────────────────┘
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link }     from 'react-router-dom';
import FeatherIcon                          from 'feather-icons-react';
import apiClient                            from '../lib/apiClient';
import styles from './CoursePlayer.module.css';
import ErrorMessage from '../components/ErrorMessage';

/* ── helpers ─────────────────────────────────────────────────────────────── */
function pct(done, total) {
  return total === 0 ? 0 : Math.round((done / total) * 100);
}

/**
 * Given a video URL, returns:
 *   { type: 'embed', src: '<iframe-safe embed URL>' }  — for YouTube / Vimeo
 *   { type: 'file',  src: '<original URL>' }           — for direct .mp4 / .webm / etc.
 */
function resolveVideoEmbed(url) {
  if (!url) return null;

  // YouTube — handles watch?v=, youtu.be/, shorts/, embed/ formats
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (ytMatch) {
    return {
      type: 'embed',
      src:  `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }

  // Vimeo — handles vimeo.com/<id> and player.vimeo.com/video/<id>
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'embed',
      src:  `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Direct file — mp4, webm, ogg, or a Supabase storage URL
  return { type: 'file', src: url };
}

/* ── Sidebar module row ──────────────────────────────────────────────────── */
function ModuleRow({ mod, index, active, done, onClick }) {
  return (
    <button
      className={`${styles.lessonItem} ${active ? styles.lessonActive : ''} ${done ? styles.lessonDone : ''}`}
      onClick={onClick}
    >
      <span className={styles.lessonIcon}>
        {done
          ? <FeatherIcon icon="check-circle" size={14} />
          : active
            ? <FeatherIcon icon="play-circle" size={14} />
            : <FeatherIcon icon="circle" size={14} />}
      </span>
      <div className={styles.lessonMeta}>
        <span className={styles.lessonTitle}>{mod.title}</span>
        <span className={styles.lessonType}>
          {mod.pdf_url
            ? 'PDF' : mod.video_url
            ? 'Video' : 'Reading'} · Module {index + 1}
        </span>
      </div>
    </button>
  );
}

/* ── Main export ─────────────────────────────────────────────────────────── */
export default function CoursePlayer() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [course,    setCourse]    = useState(null);
  const [enrolment, setEnrolment] = useState(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [completed, setCompleted] = useState(new Set()); // Set of module ids
  const [tab,       setTab]       = useState('content');
  const [sideOpen,  setSideOpen]  = useState(true);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [notes,     setNotes]     = useState('');
  const [saving,    setSaving]    = useState(false);

  /* ── Load course + enrolment ──────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, eRes] = await Promise.all([
          apiClient.get(`/courses/${id}`),
          apiClient.get('/enrolments').catch(() => ({ data: { data: [] } })),
        ]);
        const c = cRes.data.data;
        c.modules = (c.modules ?? []).slice().sort((a, b) => a.order - b.order);
        setCourse(c);

        const enrol = (eRes.data.data ?? []).find((e) => e.course_id === id);
        if (enrol) {
          setEnrolment(enrol);
        } else {
          // Auto-enrol when landing on the player
          const newE = await apiClient.post('/enrolments', { courseId: id })
            .then((r) => r.data.data).catch(() => null);
          setEnrolment(newE);
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  /* ── Persist progress to server (best-effort) ────────────────────────── */
  const saveProgress = useCallback(async (completedSet, currentEnrolment) => {
    const e = currentEnrolment ?? enrolment;
    if (!e?.id || !course) return;
    const total = (course.modules ?? []).length;
    if (total === 0) return;
    const donePct = pct(completedSet.size, total);
    setSaving(true);
    try {
      const res = await apiClient.patch(`/enrolments/${e.id}`, { progressPct: donePct });
      setEnrolment(res.data.data);
    } catch (_) { /* non-blocking */ } finally {
      setSaving(false);
    }
  }, [enrolment, course]);

  /* ── Mark current module done and advance ─────────────────────────────── */
  const markDoneAndAdvance = async () => {
    const modules = course?.modules ?? [];
    const mod = modules[activeIdx];
    if (!mod) return;
    const next = new Set(completed);
    next.add(mod.id);
    setCompleted(next);
    await saveProgress(next, enrolment);
    if (activeIdx < modules.length - 1) {
      setActiveIdx(activeIdx + 1);
      setTab('content');
    }
  };

  /* ── Guards ─────────────────────────────────────────────────────────── */
  if (loading) return <p className={styles.state}>Loading course…</p>;
  if (error)   return <ErrorMessage error={error} onRetry={() => window.location.reload()} />;
  if (!course) return (
    <div className={styles.noCourse}>
      <div className={styles.noCourseIcon}><FeatherIcon icon="book-open" size={48} /></div>
      <h2>Course not found</h2>
      <Link to="/courses" className={styles.browseBtn}>Browse Courses</Link>
    </div>
  );

  const modules     = course.modules ?? [];
  const assessments = course.assessments ?? [];
  const activeMod   = modules[activeIdx];
  const allDone     = modules.length > 0 && modules.every((m) => completed.has(m.id));
  const progressPct = pct(completed.size, modules.length);

  return (
    <div className={styles.playerShell}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sideOpen ? '' : styles.sidebarClosed}`}>
        <div className={styles.sideHeader}>
          <div>
            <p className={styles.courseTitle}>{course.title}</p>
            <div className={styles.sideProgress}>
              <div className={styles.sideProgressFill} style={{ width: `${progressPct}%` }} />
            </div>
            <p className={styles.sideProgressLabel}>{progressPct}% · {completed.size}/{modules.length} modules</p>
          </div>
          <button className={styles.closeSide} onClick={() => setSideOpen(false)} title="Close sidebar">
            <FeatherIcon icon="x" size={18} />
          </button>
        </div>

        <div className={styles.moduleList}>
          {modules.length === 0 && <p className={styles.noItems}>No modules published yet.</p>}
          {modules.map((mod, i) => (
            <ModuleRow
              key={mod.id}
              mod={mod}
              index={i}
              active={i === activeIdx}
              done={completed.has(mod.id)}
              onClick={() => { setActiveIdx(i); setTab('content'); }}
            />
          ))}

          {/* Assessment entry in sidebar */}
          {assessments.length > 0 && (
            <div className={styles.assessmentEntry}>
              <FeatherIcon icon="edit" size={14} />
              <span>Assessment</span>
              {allDone
                ? <Link to={`/assessments/${assessments[0].id}`} className={styles.assessmentLink}>Take now →</Link>
                : <span className={styles.assessmentLocked}><FeatherIcon icon="lock" size={12} /> Complete modules first</span>
              }
            </div>
          )}
        </div>
      </aside>

      {/* Sidebar toggle */}
      {!sideOpen && (
        <button className={styles.openSide} onClick={() => setSideOpen(true)} title="Open menu">
          <FeatherIcon icon="menu" size={20} />
        </button>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className={styles.main}>

        {/* Breadcrumb */}
        <div className={styles.playerBreadcrumb}>
          <Link to="/my-learning"><FeatherIcon icon="arrow-left" size={14} /> My Learning</Link>
          <FeatherIcon icon="chevron-right" size={14} />
          <span>{course.title}</span>
          {activeMod && <><FeatherIcon icon="chevron-right" size={14} /><span>{activeMod.title}</span></>}
          {saving && <span className={styles.savingBadge}><FeatherIcon icon="loader" size={12} /> Saving…</span>}
        </div>

        {modules.length === 0 ? (
          <div className={styles.noCourse}>
            <FeatherIcon icon="book-open" size={48} />
            <h2>No modules yet</h2>
            <p>This course's content hasn't been published yet. Check back soon.</p>
            <Link to="/my-learning" className={styles.browseBtn}>← Back to My Learning</Link>
          </div>
        ) : activeMod ? (
          <>
            {/* Video (if video_url exists) */}
            {activeMod.video_url && (() => {
              const embed = resolveVideoEmbed(activeMod.video_url);
              return (
                <div className={styles.videoWrap}>
                  {embed?.type === 'embed' ? (
                    <iframe
                      key={activeMod.id}
                      src={embed.src}
                      title={activeMod.title}
                      className={styles.video}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                      allowFullScreen
                      style={{ border: 'none' }}
                    />
                  ) : (
                    <video key={activeMod.id} controls className={styles.video}
                      src={activeMod.video_url} poster={course.thumbnail_url ?? undefined} />
                  )}
                </div>
              );
            })()}

            {/* PDF viewer */}
            {!activeMod.video_url && activeMod.pdf_url && (
              <div className={styles.pdfWrap}>
                <div className={styles.pdfHeader}>
                  <FeatherIcon icon="file" size={16} />
                  <span>{activeMod.title}</span>
                  <a href={activeMod.pdf_url} target="_blank" rel="noreferrer" className={styles.pdfDownload}>
                    <FeatherIcon icon="download" size={14} /> Download PDF
                  </a>
                </div>
                <iframe
                  key={activeMod.id}
                  src={activeMod.pdf_url}
                  title={activeMod.title}
                  className={styles.pdfEmbed}
                />
              </div>
            )}

            {/* No video, no PDF — decorative lesson header */}
            {!activeMod.video_url && !activeMod.pdf_url && (
              <div className={styles.lessonHeader}>
                <div className={styles.lessonHeaderIcon}><FeatherIcon icon="book-open" size={28} /></div>
                <div>
                  <p className={styles.lessonHeaderMeta}>Module {activeIdx + 1} of {modules.length}</p>
                  <h2 className={styles.lessonHeaderTitle}>{activeMod.title}</h2>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className={styles.tabBar}>
              {['content', 'notes'].map((t) => (
                <button key={t}
                  className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
                  onClick={() => setTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div className={styles.tabContent}>
              {tab === 'content' && (
                <div className={styles.lessonContent}>
                  {(activeMod.video_url || activeMod.pdf_url) && <h2 className={styles.lessonContentTitle}>{activeMod.title}</h2>}
                  <div className={styles.lessonBody}>
                    {(activeMod.content ?? '').split('\n').map((para, i) =>
                      para.trim() ? <p key={i}>{para}</p> : <br key={i} />
                    )}
                  </div>
                </div>
              )}
              {tab === 'notes' && (
                <textarea className={styles.notes}
                  placeholder="Add your personal notes for this module…"
                  rows={10} value={notes} onChange={(e) => setNotes(e.target.value)} />
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <div className={styles.footerLeft}>
                {activeIdx > 0 && (
                  <button className={styles.prevBtn}
                    onClick={() => { setActiveIdx(activeIdx - 1); setTab('content'); }}>
                    <FeatherIcon icon="arrow-left" size={14} /> Previous
                  </button>
                )}
              </div>
              <div className={styles.footerRight}>
                {allDone && assessments.length > 0 && (
                  <Link to={`/assessments/${assessments[0].id}`} className={styles.assessmentBtn}>
                    <FeatherIcon icon="edit-3" size={14} /> Take Assessment
                  </Link>
                )}
                {allDone && assessments.length === 0 && (
                  <Link to="/my-learning" className={styles.nextBtn}>
                    <FeatherIcon icon="check" size={14} /> Course Complete
                  </Link>
                )}
                {!allDone && (
                  <button className={styles.nextBtn} onClick={markDoneAndAdvance}>
                    {completed.has(activeMod.id)
                      ? activeIdx < modules.length - 1
                        ? <>Next Module <FeatherIcon icon="arrow-right" size={14} /></>
                        : <>Mark Complete <FeatherIcon icon="check" size={14} /></>
                      : activeIdx < modules.length - 1
                        ? <>Mark Done &amp; Continue <FeatherIcon icon="arrow-right" size={14} /></>
                        : <>Mark as Complete <FeatherIcon icon="check" size={14} /></>
                    }
                  </button>
                )}
              </div>
            </div>
          </>
        ) : null}

        {/* All modules complete banner */}
        {allDone && (
          <div className={styles.completionBanner}>
            <FeatherIcon icon="award" size={36} />
            <h3>All modules complete!</h3>
            {assessments.length > 0 ? (
              <>
                <p>You're ready to take the assessment and earn your certificate.</p>
                <Link to={`/assessments/${assessments[0].id}`} className={styles.assessmentBtn}>
                  <FeatherIcon icon="edit-3" size={14} /> Take Assessment →
                </Link>
              </>
            ) : (
              <>
                <p>Great work finishing this course!</p>
                <Link to="/my-learning" className={styles.browseBtn}>← My Learning</Link>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
