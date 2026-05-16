/**
 * client/src/pages/CoursePlayer.jsx
 *
 * Full course-player experience — matches the Coursera-style player screenshots.
 * Accessible via:
 *   /live-sessions          → auto-loads most recent in-progress enrolment
 *   /courses/:id/player     → loads specific course
 *
 * Layout:
 *   ┌──────────────────────────────────────────────────────┐
 *   │ Left sidebar  │  Video / content area                │
 *   │  module list  │  Transcript / Notes / Downloads tabs │
 *   └──────────────────────────────────────────────────────┘
 */

import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { getProfile } from '../lib/authBridge';
import styles from './CoursePlayer.module.css';

/* ── Helpers ──────────────────────────────────────────────────────────────── */
function typeIcon(type = '') {
  if (type.includes('video'))   return '▶';
  if (type.includes('reading')) return '📄';
  if (type.includes('quiz') || type.includes('assignment') || type.includes('practice')) return '📝';
  if (type.includes('plugin'))  return '🔌';
  return '●';
}

function itemDuration(item) {
  if (item.duration_min) return `${item.duration_min} min`;
  if (item.duration)     return item.duration;
  return null;
}

/* ── Sample transcript lines (shown when no real transcript available) ──── */
const SAMPLE_TRANSCRIPT = [
  { t: '0:47', text: "Together, we'll explore how e-commerce stores work and how to engage customers." },
  { t: '0:53', text: "Hello, I'm Mike, and I'm a Global Performance Curriculum manager here at Google." },
  { t: '1:10', text: "I'll be your instructor for the final course of the program." },
  { t: '1:15', text: "There, we'll discuss how to build customer loyalty and other e-commerce topics." },
  { t: '1:15', text: "I'll be guiding you on how to prepare for your upcoming job search and land a career in digital marketing and e-commerce." },
  { t: '1:30', text: "This is such a great time to grow your career in digital marketing and e-commerce. Sound exciting? Let's get started." },
];

export default function CoursePlayer() {
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  const [course,      setCourse]      = useState(null);
  const [enrolment,   setEnrolment]   = useState(null);
  const [activeItem,  setActiveItem]  = useState(null); // { module, item }
  const [tab,         setTab]         = useState('transcript');
  const [sideOpen,    setSideOpen]    = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [theaterNote, setTheaterNote] = useState(true);
  const videoRef = useRef(null);

  useEffect(() => {
    const loadPlayer = async () => {
      try {
        let courseId = paramId;

        /* If no specific ID, find the most recent in-progress enrolment */
        if (!courseId) {
          const mlRes = await apiClient.get('/my-learning');
          const enrolments = mlRes.data.data?.enrolments ?? [];
          const inProgress = enrolments.find((e) => e.status !== 'completed')
                          ?? enrolments[0];
          if (!inProgress) {
            setError('no_course');
            setLoading(false);
            return;
          }
          setEnrolment(inProgress);
          courseId = inProgress.courses?.id ?? inProgress.course_id;
        }

        if (!courseId) {
          setError('no_course');
          setLoading(false);
          return;
        }

        const cRes = await apiClient.get(`/courses/${courseId}`);
        const c = cRes.data.data;
        setCourse(c);

        /* Default to first item in first module */
        const mods = (c.modules ?? []).slice().sort((a, b) => a.order - b.order);
        if (mods[0]?.items?.length) {
          setActiveItem({ module: mods[0], item: mods[0].items[0] });
        } else if (mods[0]) {
          setActiveItem({ module: mods[0], item: null });
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadPlayer();
  }, [paramId]);

  /* ── Navigate to next item ────────────────────────────────────────── */
  const goNext = () => {
    if (!course) return;
    const mods = (course.modules ?? []).slice().sort((a, b) => a.order - b.order);
    let found = false;
    for (const mod of mods) {
      for (const item of (mod.items ?? [])) {
        if (found) { setActiveItem({ module: mod, item }); return; }
        if (activeItem?.item?.id === item.id) found = true;
      }
    }
  };

  /* ── Flat list of all items for "N items" count ─────────────────── */
  const allItems = (course?.modules ?? [])
    .slice().sort((a, b) => a.order - b.order)
    .flatMap((m) => (m.items ?? []).map((item) => ({ module: m, item })));

  /* ── Active item index ──────────────────────────────────────────── */
  const activeIdx = allItems.findIndex((x) => x.item?.id === activeItem?.item?.id);

  if (loading) return <p className={styles.state}>Loading course…</p>;

  if (error === 'no_course') return (
    <div className={styles.noCourse}>
      <div className={styles.noCourseIcon}>🎓</div>
      <h2>No course in progress</h2>
      <p>Enrol in a course to start your learning journey here.</p>
      <Link to="/courses" className={styles.browseBtn}>Browse Courses</Link>
    </div>
  );

  if (error) return <p className={styles.error}>{error}</p>;

  const modules = (course?.modules ?? []).slice().sort((a, b) => a.order - b.order);
  const isVideo = !activeItem?.item?.type || activeItem.item.type.includes('video');
  const isAssessment = activeItem?.item?.type?.includes('quiz')
    || activeItem?.item?.type?.includes('assignment')
    || activeItem?.item?.type?.includes('practice');

  return (
    <div className={styles.playerShell}>

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className={`${styles.sidebar} ${sideOpen ? '' : styles.sidebarClosed}`}>
        {/* Header */}
        <div className={styles.sideHeader}>
          <p className={styles.courseTitle}>{course.title}</p>
          <button className={styles.closeSide} onClick={() => setSideOpen(false)} title="Close">✕</button>
        </div>

        {/* Module + item list */}
        <div className={styles.moduleList}>
          {modules.map((mod, mi) => (
            <ModuleSection
              key={mod.id}
              mod={mod}
              moduleIdx={mi}
              activeItem={activeItem}
              onSelect={(item) => setActiveItem({ module: mod, item })}
            />
          ))}
        </div>
      </aside>

      {/* ── Sidebar toggle when closed ───────────────────────────── */}
      {!sideOpen && (
        <button className={styles.openSide} onClick={() => setSideOpen(true)} title="Open menu">☰</button>
      )}

      {/* ── Main content ────────────────────────────────────────────── */}
      <main className={styles.main}>

        {/* Video area */}
        <div className={styles.videoWrap}>
          {course.thumbnail_url ? (
            <video
              ref={videoRef}
              poster={course.thumbnail_url}
              controls
              className={styles.video}
              src={activeItem?.item?.video_url ?? undefined}
            />
          ) : (
            <div className={styles.videoPlaceholder}>
              <div className={styles.videoPlaceholderInner}>
                <div className={styles.instructorAvatar}>
                  {(getProfile()?.first_name ?? 'I')[0]}
                </div>
                <p className={styles.instructorTitle}>
                  {activeItem?.item?.title ?? course.title}
                </p>
              </div>
              {/* Fake controls */}
              <div className={styles.videoControls}>
                <button className={styles.vcBtn}>▶</button>
                <button className={styles.vcBtn}>🔇</button>
                <span className={styles.vcTime}>0:10 / 7:38</span>
                <div className={styles.vcProgress}>
                  <div className={styles.vcProgressFill} style={{ width: '2%' }} />
                </div>
                <button className={styles.vcBtn}>↻</button>
                <span className={styles.vcSpeed}>1x</span>
                <button className={styles.vcBtn}>⚙</button>
                <button className={styles.vcBtn}>⛶</button>
              </div>
            </div>
          )}

          {/* Theater mode toast */}
          {theaterNote && (
            <div className={styles.theaterToast}>
              <button className={styles.theaterClose} onClick={() => setTheaterNote(false)}>✕</button>
              <p className={styles.theaterTitle}>Theater mode available</p>
              <p className={styles.theaterSub}>Enjoy an immersive video experience with dark mode and an auto-scrolling transcript.</p>
            </div>
          )}
        </div>

        {/* Transcript / Notes / Downloads tabs */}
        <div className={styles.tabBar}>
          {['transcript','notes','downloads'].map((t) => (
            <button
              key={t}
              className={`${styles.tabBtn} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.tabContent}>
          {tab === 'transcript' && (
            <div className={styles.transcript}>
              {(activeItem?.item?.transcript ?? SAMPLE_TRANSCRIPT).map((line, i) => (
                <div key={i} className={styles.transcriptLine}>
                  <span className={styles.timestamp}>{line.t}</span>
                  <span>{line.text}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'notes' && (
            <textarea className={styles.notes} placeholder="Add your notes here…" rows={8} />
          )}
          {tab === 'downloads' && (
            <p className={styles.noDownloads}>No downloadable resources for this item.</p>
          )}
        </div>

        {/* Footer actions */}
        <div className={styles.footer}>
          <div className={styles.footerLeft}>
            <button className={styles.reactBtn}>👍 Like</button>
            <button className={styles.reactBtn}>👎 Dislike</button>
            <button className={styles.reactBtn}>🚩 Report an issue</button>
          </div>
          <button className={styles.nextBtn} onClick={goNext} disabled={activeIdx >= allItems.length - 1}>
            Go to next item →
          </button>
        </div>
      </main>
    </div>
  );
}

/* ── ModuleSection sub-component ─────────────────────────────────────────── */
function ModuleSection({ mod, moduleIdx, activeItem, onSelect }) {
  const [open, setOpen] = useState(moduleIdx === 0);
  const items = mod.items ?? [];

  return (
    <div className={styles.modSection}>
      <button
        className={`${styles.modHeader} ${open ? styles.modHeaderOpen : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <div className={styles.modHeaderLeft}>
          <span className={styles.modLabel}>Module {moduleIdx + 1}</span>
          <span className={styles.modTitle}>{mod.title}</span>
        </div>
        <span className={styles.modChevron}>{open ? '∧' : '∨'}</span>
      </button>

      {open && (
        <div className={styles.itemList}>
          {items.length === 0 && (
            <p className={styles.noItems}>No lessons in this module yet.</p>
          )}
          {items.map((item) => {
            const active = activeItem?.item?.id === item.id;
            return (
              <button
                key={item.id}
                className={`${styles.lessonItem} ${active ? styles.lessonActive : ''}`}
                onClick={() => onSelect(item)}
              >
                <span className={styles.lessonIcon}>{typeIcon(item.type)}</span>
                <div className={styles.lessonMeta}>
                  <span className={styles.lessonTitle}>{item.title}</span>
                  <span className={styles.lessonType}>
                    {item.type ?? 'Video'}
                    {itemDuration(item) ? ` · ${itemDuration(item)}` : ''}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
