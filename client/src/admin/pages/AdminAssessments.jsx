/**
 * client/src/admin/pages/AdminAssessments.jsx
 * Assessment results overview — all learner submissions across every course.
 *
 * Columns: Learner | Course | Assessment | Type | Score | Pass/Fail | Status | Submitted
 * Filters: search (learner / course), status (all / graded / pending), pass/fail
 */
import { useEffect, useState, useMemo, useCallback } from 'react';
import apiClient from '../../lib/apiClient';
import FeatherIcon from 'feather-icons-react';
import styles from './AdminAssessments.module.css';

/* ── helpers ─────────────────────────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}
function fmtTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
function learnerLabel(l) {
  if (!l) return '—';
  const name = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim();
  return name || l.email || '—';
}
function initials(l) {
  if (!l) return '?';
  const name = `${l.firstName ?? ''} ${l.lastName ?? ''}`.trim();
  if (name) return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (l.email ?? '?')[0].toUpperCase();
}

/* ── sub-components ─────────────────────────────────────────────────── */
function TypeBadge({ type }) {
  const map = {
    quiz:       { label: 'Quiz',       bg: '#dbeafe', color: '#1d4ed8' },
    assignment: { label: 'Assignment', bg: '#fef9c3', color: '#a16207' },
    project:    { label: 'Project',    bg: '#f3e8ff', color: '#7e22ce' },
  };
  const s = map[type] ?? { label: type ?? '?', bg: '#f1f5f9', color: '#475569' };
  return (
    <span style={{ background: s.bg, color: s.color,
                   fontSize: 11, fontWeight: 600, padding: '3px 8px',
                   borderRadius: 99, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const graded  = status === 'graded';
  return (
    <span className={graded ? styles.badgeGraded : styles.badgePending}>
      {graded ? 'Graded' : 'Pending'}
    </span>
  );
}

function ScoreCell({ score, passed, passMark }) {
  if (score === null || score === undefined) {
    return <span className={styles.scoreDash}>—</span>;
  }
  return (
    <span className={passed === true ? styles.scorePass : passed === false ? styles.scoreFail : styles.scoreNeutral}>
      {score}%
      {passMark != null && (
        <span className={styles.passMark}> / {passMark}%</span>
      )}
    </span>
  );
}

function FeedbackPopover({ text }) {
  const [open, setOpen] = useState(false);
  if (!text) return <span className={styles.noFeedback}>—</span>;
  return (
    <div className={styles.feedbackWrap}>
      <button className={styles.feedbackBtn} onClick={() => setOpen((o) => !o)} title="View AI feedback">
        <FeatherIcon icon="message-circle" size={14} />
      </button>
      {open && (
        <div className={styles.feedbackPopover}>
          <p>{text}</p>
          <button className={styles.feedbackClose} onClick={() => setOpen(false)}>Close</button>
        </div>
      )}
    </div>
  );
}

/* ── DrillDownDrawer ─────────────────────────────────────────────────── */
const DRILL_META = {
  total:   { title: 'All Submissions',  icon: 'file-text'    },
  graded:  { title: 'Graded',           icon: 'check-circle' },
  pending: { title: 'Pending Review',   icon: 'clock'        },
  pass:    { title: 'Passed',           icon: 'award'        },
  scored:  { title: 'Scored Results',   icon: 'trending-up'  },
};

function DrillDownDrawer({ type, results, onClose }) {
  const [q, setQ] = useState('');
  const [transcript, setTranscript] = useState(null);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') { if (transcript) setTranscript(null); else onClose(); } };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, transcript]);

  const subset = useMemo(() => {
    let base;
    switch (type) {
      case 'graded':  base = results.filter((r) => r.status === 'graded');                           break;
      case 'pending': base = results.filter((r) => r.status === 'pending');                          break;
      case 'pass':    base = results.filter((r) => r.passed === true);                               break;
      case 'scored':  base = results.filter((r) => r.score !== null && r.score !== undefined);       break;
      default:        base = results;
    }
    if (!q) return base;
    const lq = q.toLowerCase();
    return base.filter((r) => {
      const text = [
        learnerLabel(r.learner), r.learner?.email,
        r.course?.title, r.assessment?.title,
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(lq);
    });
  }, [type, results, q]);

  const meta = DRILL_META[type] ?? DRILL_META.total;

  return (
    <>
      {transcript && <TranscriptModal result={transcript} onClose={() => setTranscript(null)} />}
      <div className={styles.ddBackdrop} onClick={onClose} />
      <aside className={styles.ddDrawer} role="dialog" aria-modal="true" aria-label={meta.title}>
        <div className={styles.ddHeader}>
          <div className={styles.ddTitleRow}>
            <span className={styles.ddIcon}><FeatherIcon icon={meta.icon} size={20} /></span>
            <span className={styles.ddTitle}>{meta.title}</span>
            <button className={styles.ddClose} onClick={onClose} aria-label="Close">
              <FeatherIcon icon="x" size={18} />
            </button>
          </div>
          <div className={styles.ddSearch}>
            <span className={styles.ddSearchIcon}><FeatherIcon icon="search" size={14} /></span>
            <input
              className={styles.ddSearchInput}
              placeholder="Search learner, course, assessment…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className={styles.ddCount}>{subset.length.toLocaleString()} result{subset.length !== 1 ? 's' : ''}</div>
        </div>

        <div className={styles.ddBody}>
          {subset.length === 0 ? (
            <div className={styles.ddState}>No results found.</div>
          ) : (
            <div className={styles.ddTableWrap}>
              <table className={styles.ddTable}>
                <thead>
                  <tr>
                    <th>Learner</th>
                    <th>Course</th>
                    <th>Assessment</th>
                    <th>Type</th>
                    <th>Score</th>
                    <th>Pass/Fail</th>
                    <th>Status</th>
                    <th>Submitted</th>
                    <th>Transcript</th>
                  </tr>
                </thead>
                <tbody>
                  {subset.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className={styles.ddUserCell}>
                          <div className={styles.ddAvatar}>{initials(r.learner)}</div>
                          <div>
                            <div>{learnerLabel(r.learner)}</div>
                            {r.learner?.email && <div className={styles.ddMuted}>{r.learner.email}</div>}
                          </div>
                        </div>
                      </td>
                      <td>{r.course?.title ?? '—'}</td>
                      <td>{r.assessment?.title ?? '—'}</td>
                      <td><TypeBadge type={r.assessment?.type} /></td>
                      <td className={styles.ddNum}>
                        <ScoreCell score={r.score} passed={r.passed} passMark={r.assessment?.passMark} />
                      </td>
                      <td>
                        {r.passed === true  && <span className={styles.passLabel}><FeatherIcon icon="check" size={12} /> Pass</span>}
                        {r.passed === false && <span className={styles.failLabel}><FeatherIcon icon="x"     size={12} /> Fail</span>}
                        {r.passed === null  && <span className={styles.scoreDash}>—</span>}
                      </td>
                      <td><StatusBadge status={r.status} /></td>
                      <td className={styles.ddMuted}>{fmtDate(r.submittedAt)}</td>
                      <td>
                        <button
                          className={styles.transcriptBtn}
                          onClick={() => setTranscript(r)}
                          title="View full transcript"
                        >
                          <FeatherIcon icon="file-text" size={13} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
/* ── TranscriptModal ─────────────────────────────────────────────── */

function TranscriptModal({ result, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const { learner, course, assessment, score, passed, status,
          submittedAt, gradedAt, feedback, aiFeedback, answers } = result;

  const name = learnerLabel(learner);
  const ini  = initials(learner);

  const answerList = Array.isArray(answers) ? answers : [];

  return (
    <>
      <div className={styles.tmBackdrop} onClick={onClose} />
      <div className={styles.tmModal} role="dialog" aria-modal="true" aria-label="Assessment Transcript">

        {/* Header */}
        <div className={styles.tmHeader}>
          <div className={styles.tmTitleRow}>
            <FeatherIcon icon="file-text" size={20} className={styles.tmHeaderIcon} />
            <div className={styles.tmHeaderText}>
              <span className={styles.tmTitle}>Assessment Transcript</span>
              <span className={styles.tmSubtitle}>Audit record · {fmtDate(submittedAt)}</span>
            </div>
            <button className={styles.tmClose} onClick={onClose} aria-label="Close">
              <FeatherIcon icon="x" size={18} />
            </button>
          </div>
        </div>

        <div className={styles.tmBody}>

          {/* Learner + meta strip */}
          <div className={styles.tmMeta}>
            <div className={styles.tmLearnerRow}>
              <div className={styles.tmAvatar}>{ini}</div>
              <div>
                <div className={styles.tmLearnerName}>{name}</div>
                {learner?.email && <div className={styles.tmLearnerEmail}>{learner.email}</div>}
              </div>
            </div>
            <div className={styles.tmMetaGrid}>
              <div className={styles.tmMetaItem}>
                <span className={styles.tmMetaLabel}>Course</span>
                <span className={styles.tmMetaValue}>{course?.title ?? '—'}</span>
              </div>
              <div className={styles.tmMetaItem}>
                <span className={styles.tmMetaLabel}>Assessment</span>
                <span className={styles.tmMetaValue}>{assessment?.title ?? '—'}</span>
              </div>
              <div className={styles.tmMetaItem}>
                <span className={styles.tmMetaLabel}>Type</span>
                <span className={styles.tmMetaValue}><TypeBadge type={assessment?.type} /></span>
              </div>
              <div className={styles.tmMetaItem}>
                <span className={styles.tmMetaLabel}>Status</span>
                <span className={styles.tmMetaValue}><StatusBadge status={status} /></span>
              </div>
              <div className={styles.tmMetaItem}>
                <span className={styles.tmMetaLabel}>Score</span>
                <span className={styles.tmMetaValue}>
                  <ScoreCell score={score} passed={passed} passMark={assessment?.passMark} />
                </span>
              </div>
              <div className={styles.tmMetaItem}>
                <span className={styles.tmMetaLabel}>Result</span>
                <span className={styles.tmMetaValue}>
                  {passed === true  && <span className={styles.passLabel}><FeatherIcon icon="check" size={12} /> Pass</span>}
                  {passed === false && <span className={styles.failLabel}><FeatherIcon icon="x"     size={12} /> Fail</span>}
                  {passed === null  && <span className={styles.scoreDash}>Pending</span>}
                </span>
              </div>
              <div className={styles.tmMetaItem}>
                <span className={styles.tmMetaLabel}>Submitted</span>
                <span className={styles.tmMetaValue}>{fmtDate(submittedAt)} {fmtTime(submittedAt)}</span>
              </div>
              {gradedAt && (
                <div className={styles.tmMetaItem}>
                  <span className={styles.tmMetaLabel}>Graded</span>
                  <span className={styles.tmMetaValue}>{fmtDate(gradedAt)} {fmtTime(gradedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Answers */}
          <div className={styles.tmSection}>
            <div className={styles.tmSectionTitle}>
              <FeatherIcon icon="list" size={15} />
              Learner Responses
              <span className={styles.tmSectionCount}>{answerList.length} answer{answerList.length !== 1 ? 's' : ''}</span>
            </div>
            {answerList.length === 0 ? (
              <div className={styles.tmEmpty}>No answer data recorded for this submission.</div>
            ) : (
              <div className={styles.tmAnswerList}>
                {answerList.map((ans, i) => (
                  <div key={i} className={styles.tmAnswer}>
                    <div className={styles.tmAnswerNum}>Q{i + 1}</div>
                    <div className={styles.tmAnswerBody}>
                      {ans.question && (
                        <div className={styles.tmQuestion}>{ans.question}</div>
                      )}
                      <div className={styles.tmResponse}>
                        {typeof ans.answer === 'object'
                          ? JSON.stringify(ans.answer)
                          : String(ans.answer ?? ans.response ?? ans.value ?? '—')}
                      </div>
                      {ans.correct !== undefined && (
                        <div className={ans.correct ? styles.tmCorrect : styles.tmIncorrect}>
                          {ans.correct
                            ? <><FeatherIcon icon="check-circle" size={12} /> Correct</>
                            : <><FeatherIcon icon="x-circle" size={12} /> Incorrect
                                {ans.correctAnswer != null && (
                                  <span className={styles.tmCorrectAnswer}> — Correct answer: {String(ans.correctAnswer)}</span>
                                )}
                              </>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grader feedback */}
          {feedback && (
            <div className={styles.tmSection}>
              <div className={styles.tmSectionTitle}>
                <FeatherIcon icon="message-square" size={15} />
                Grader Feedback
              </div>
              <div className={styles.tmFeedbackBox}>{feedback}</div>
            </div>
          )}

          {/* AI feedback */}
          {aiFeedback && (
            <div className={styles.tmSection}>
              <div className={styles.tmSectionTitle}>
                <FeatherIcon icon="cpu" size={15} />
                AI Feedback
              </div>
              <div className={styles.tmFeedbackBox + ' ' + styles.tmAiFeedback}>{aiFeedback}</div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className={styles.tmFooter}>
          <span className={styles.tmFooterNote}>
            <FeatherIcon icon="shield" size={12} /> Audit record · submission ID: {result.id}
          </span>
          <button className={styles.tmCloseBtn} onClick={onClose}>Close</button>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════ */

export default function AdminAssessments() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  // Drill-down
  const [drilldown, setDrilldown] = useState(null);
  const closeDrill = useCallback(() => setDrilldown(null), []);

  // Filters
  const [q,          setQ]          = useState('');
  const [statusF,    setStatusF]    = useState('all');   // all | graded | pending
  const [passFilter, setPassFilter] = useState('all');   // all | pass | fail

  // Sort
  const [sortKey, setSortKey] = useState('submittedAt');
  const [sortDir, setSortDir] = useState('desc');

  // Pagination
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);

  useEffect(() => {
    const params = {};
    if (statusF !== 'all') params.status = statusF;
    apiClient.get('/cms/assessment-results', { params })
      .then((r) => setResults(r.data.data ?? []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [statusF]);

  function toggleSort(key) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(1);
  }

  const filtered = useMemo(() => {
    const lq = q.toLowerCase();
    return results
      .filter((r) => {
        if (q) {
          const text = [
            learnerLabel(r.learner),
            r.learner?.email,
            r.course?.title,
            r.assessment?.title,
          ].filter(Boolean).join(' ').toLowerCase();
          if (!text.includes(lq)) return false;
        }
        if (passFilter === 'pass' && r.passed !== true)  return false;
        if (passFilter === 'fail' && r.passed !== false) return false;
        return true;
      })
      .sort((a, b) => {
        let av = a[sortKey] ?? '';
        let bv = b[sortKey] ?? '';
        if (sortKey === 'score')       { av = a.score ?? -1; bv = b.score ?? -1; }
        if (sortKey === 'learner')     { av = learnerLabel(a.learner); bv = learnerLabel(b.learner); }
        if (sortKey === 'course')      { av = a.course?.title ?? ''; bv = b.course?.title ?? ''; }
        if (sortKey === 'assessment')  { av = a.assessment?.title ?? ''; bv = b.assessment?.title ?? ''; }
        if (typeof av === 'string')    { av = av.toLowerCase(); bv = bv.toLowerCase(); }
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [results, q, passFilter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage   = Math.min(page, totalPages);
  const paged      = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Summary stats
  const totalGraded  = results.filter((r) => r.status === 'graded').length;
  const totalPending = results.filter((r) => r.status === 'pending').length;
  const passCount    = results.filter((r) => r.passed === true).length;
  const avgScore     = (() => {
    const scored = results.filter((r) => r.score !== null);
    return scored.length
      ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length)
      : null;
  })();

  const summaryCards = [
    { key: 'total',   label: 'Total Submissions', value: results.length,  icon: 'file-text',    color: '#1d4ed8' },
    { key: 'graded',  label: 'Graded',            value: totalGraded,     icon: 'check-circle', color: '#16a34a' },
    { key: 'pending', label: 'Pending Review',    value: totalPending,    icon: 'clock',        color: '#d97706' },
    { key: 'pass',    label: 'Pass Rate',
      value: results.length ? `${Math.round(passCount / results.length * 100)}%` : '—',
      icon: 'award', color: '#7c3aed' },
    { key: 'scored',  label: 'Avg Score',
      value: avgScore !== null ? `${avgScore}%` : '—',
      icon: 'trending-up', color: '#0891b2' },
  ];

  function SortIcon({ k }) {
    if (sortKey !== k) return <span className={styles.sortIcon}>↕</span>;
    return <span className={styles.sortIconActive}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  if (loading) return <div className={styles.state}>Loading assessment results…</div>;
  if (error)   return <div className={styles.error}>{error}</div>;

  return (
    <div className={styles.page}>

      {/* ── Drill-down drawer ── */}
      {drilldown && (
        <DrillDownDrawer type={drilldown} results={results} onClose={closeDrill} />
      )}

      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Assessment Results</h1>
          <p className={styles.pageSub}>{results.length.toLocaleString()} submissions across all courses</p>
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className={styles.summaryRow}>
        {summaryCards.map((c) => (
          <button key={c.key} className={styles.summaryCard} onClick={() => setDrilldown(c.key)}>
            <div className={styles.summaryIcon} style={{ background: c.color + '18', color: c.color }}>
              <FeatherIcon icon={c.icon} size={18} />
            </div>
            <div>
              <div className={styles.summaryValue}>{c.value}</div>
              <div className={styles.summaryLabelRow}>
                <span className={styles.summaryLabel}>{c.label}</span>
                <FeatherIcon icon="chevron-right" size={13} className={styles.summaryChevron} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <FeatherIcon icon="search" size={15} className={styles.searchIcon} />
          <input
            type="search"
            className={styles.searchInput}
            placeholder="Search learner, course, assessment…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        <select
          className={styles.filterSelect}
          value={statusF}
          onChange={(e) => { setStatusF(e.target.value); setPage(1); }}
        >
          <option value="all">All statuses</option>
          <option value="graded">Graded</option>
          <option value="pending">Pending</option>
        </select>

        <select
          className={styles.filterSelect}
          value={passFilter}
          onChange={(e) => { setPassFilter(e.target.value); setPage(1); }}
        >
          <option value="all">Pass &amp; Fail</option>
          <option value="pass">Passed only</option>
          <option value="fail">Failed only</option>
        </select>

        {(q || statusF !== 'all' || passFilter !== 'all') && (
          <button
            className={styles.clearBtn}
            onClick={() => { setQ(''); setStatusF('all'); setPassFilter('all'); setPage(1); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <FeatherIcon icon="inbox" size={36} />
          <p>No submissions match the current filters.</p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort('learner')}    className={styles.th}>Learner <SortIcon k="learner" /></th>
                  <th onClick={() => toggleSort('course')}     className={styles.th}>Course <SortIcon k="course" /></th>
                  <th onClick={() => toggleSort('assessment')} className={styles.th}>Assessment <SortIcon k="assessment" /></th>
                  <th className={styles.th}>Type</th>
                  <th onClick={() => toggleSort('score')}      className={`${styles.th} ${styles.thCenter}`}>Score <SortIcon k="score" /></th>
                  <th className={`${styles.th} ${styles.thCenter}`}>Pass/Fail</th>
                  <th className={`${styles.th} ${styles.thCenter}`}>Status</th>
                  <th onClick={() => toggleSort('submittedAt')} className={styles.th}>Submitted <SortIcon k="submittedAt" /></th>
                  <th className={`${styles.th} ${styles.thCenter}`}>Feedback</th>
                </tr>
              </thead>
              <tbody>
                {paged.map((r) => (
                  <tr key={r.id} className={styles.tr}>
                    <td className={styles.td}>
                      <div className={styles.learnerName}>{learnerLabel(r.learner)}</div>
                      {r.learner?.email && (
                        <div className={styles.learnerEmail}>{r.learner.email}</div>
                      )}
                    </td>
                    <td className={styles.td}>
                      <span className={styles.courseTitle}>{r.course?.title ?? '—'}</span>
                      {r.course?.category && (
                        <span className={styles.courseCategory}>{r.course.category}</span>
                      )}
                    </td>
                    <td className={styles.td}>{r.assessment?.title ?? '—'}</td>
                    <td className={styles.td}><TypeBadge type={r.assessment?.type} /></td>
                    <td className={`${styles.td} ${styles.tdCenter}`}>
                      <ScoreCell score={r.score} passed={r.passed} passMark={r.assessment?.passMark} />
                    </td>
                    <td className={`${styles.td} ${styles.tdCenter}`}>
                      {r.passed === true  && <span className={styles.passLabel}><FeatherIcon icon="check" size={13} /> Pass</span>}
                      {r.passed === false && <span className={styles.failLabel}><FeatherIcon icon="x"     size={13} /> Fail</span>}
                      {r.passed === null  && <span className={styles.scoreDash}>—</span>}
                    </td>
                    <td className={`${styles.td} ${styles.tdCenter}`}>
                      <StatusBadge status={r.status} />
                    </td>
                    <td className={styles.td}>
                      <div className={styles.dateMain}>{fmtDate(r.submittedAt)}</div>
                      <div className={styles.dateTime}>{fmtTime(r.submittedAt)}</div>
                    </td>
                    <td className={`${styles.td} ${styles.tdCenter}`}>
                      <FeedbackPopover text={r.aiFeedback} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                <FeatherIcon icon="chevron-left" size={16} />
              </button>
              <span className={styles.pageInfo}>
                Page {safePage} of {totalPages}
                <span className={styles.pageCount}> ({filtered.length} results)</span>
              </span>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                <FeatherIcon icon="chevron-right" size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
