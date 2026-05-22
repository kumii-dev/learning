/**
 * client/src/pages/Assessment.jsx
 * Quiz / practice-assignment page — matches Coursera-style screenshots.
 *
 * States:
 *  1. "start"   – assignment details + coach panel
 *  2. "taking"  – full-page numbered questions
 *  3. "results" – green grade banner + reviewed questions
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import FeatherIcon from 'feather-icons-react';
import apiClient from '../lib/apiClient';
import { notify, getProfile } from '../lib/authBridge';
import styles from './Assessment.module.css';
import ErrorMessage from '../components/ErrorMessage';

/* Format due date: e.g. "May 18, 11:59 PM SAST" */
function fmtDue(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString('en-ZA', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    }) + ' SAST';
  } catch { return iso; }
}

export default function Assessment() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const profile   = getProfile();
  const fullName  = profile?.full_name
    ?? (`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
    || 'Learner');

  const [assessment,  setAssessment]  = useState(null);
  const [answers,     setAnswers]     = useState({});
  const [result,      setResult]      = useState(null);
  const [honor,       setHonor]       = useState(false);
  const [screen,      setScreen]      = useState('start'); // 'start' | 'taking' | 'results'
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState(null);

  useEffect(() => {
    apiClient.get(`/assessments/${id}`)
      .then((res) => setAssessment(res.data.data))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (qIndex, value) =>
    setAnswers((prev) => ({ ...prev, [qIndex]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!honor) return;
    setSubmitting(true);
    try {
      // Convert { [q.id]: value } map → [{ questionId, answer }] array expected by the API
    const formatted = Object.entries(answers).map(([qId, answer]) => ({
      questionId: Number(qId),
      answer,
    }));
    const res  = await apiClient.post(`/assessments/${id}/submit`, { answers: formatted });
      const data = res.data.data;
      setResult(data);
      setScreen('results');
      if (data.passed) notify.courseCompleted(data.courseId ?? '');
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className={styles.state}>Loading assessment…</p>;
  if (error)   return <ErrorMessage error={error} onRetry={() => { setError(null); setLoading(true); apiClient.get(`/assessments/${id}`).then((res) => setAssessment(res.data.data)).catch((e) => setError(e)).finally(() => setLoading(false)); }} />;

  const questions = assessment?.questions ?? [];
  const due       = fmtDue(assessment?.due_at);
  const courseId  = assessment?.course_id ?? '';

  /* ════════════════════ RESULTS SCREEN ════════════════════════════════════ */
  if (screen === 'results') {
    const pct  = result?.score ?? 0;
    const pass = result?.passed ?? false;
    return (
      <div className={styles.resultsPage}>
        {/* Sub-header */}
        <div className={styles.subHeader}>
          <button className={styles.backBtn} onClick={() => navigate(-1)}><FeatherIcon icon="arrow-left" size={16} /> Back</button>
          <div className={styles.subHeaderMid}>
            <span className={styles.subTitle}>{assessment.title}</span>
            <span className={styles.subMeta}>Practice Assignment · {assessment.duration_min ?? 10} min</span>
          </div>
          {due && <span className={styles.dueLabel}><FeatherIcon icon="calendar" size={14} /> Due {due}</span>}
        </div>

        {/* Grade banner */}
        <div className={`${styles.gradeBanner} ${pass ? styles.gradeBannerPass : styles.gradeBannerFail}`}>
          <div className={styles.gradeLeft}>
            <span className={styles.gradeTitle}>Your grade: <strong>{pct}%</strong></span>
            <span className={styles.gradeSub}>
              Your latest: {pct}% · Your highest: {pct}% · To pass you need at least 75%. We keep your highest score.
            </span>
          </div>
          <button className={styles.nextItemBtn} onClick={() => navigate(-1)}>
            Next Item <FeatherIcon icon="arrow-right" size={16} />
          </button>
        </div>

        {/* Reviewed questions */}
        <div className={styles.reviewPage}>
          {questions.map((q, idx) => {
            const userAns    = answers[q.id];
            const correctOpt = q.options?.[q.correct] ?? null;
            const isCorrect  = Array.isArray(correctOpt)
              ? JSON.stringify([...(userAns ?? [])].sort()) === JSON.stringify([...correctOpt].sort())
              : userAns === correctOpt;
            return (
              <div key={idx} className={styles.reviewQuestion}>
                <div className={styles.questionRow}>
                  <span className={styles.qNum}>{idx + 1}.</span>
                  <div className={styles.qBody}>
                    <p className={styles.qText}>{q.question}</p>
                    <div className={styles.qPoints}>{q.points ?? 1} / {q.points ?? 1} point</div>
                  </div>
                </div>
                {q.options?.map((opt, oi) => {
                  const sel          = Array.isArray(userAns) ? userAns.includes(opt) : userAns === opt;
                  const isCorrectOpt = opt === correctOpt;
                  const inputType    = ['checklist', 'multi_select'].includes(q.type) ? 'checkbox' : 'radio';
                  return (
                    <label
                      key={oi}
                      className={[
                        styles.reviewOption,
                        sel            ? styles.reviewSelected : '',
                        isCorrectOpt   ? styles.reviewCorrect  : '',
                        sel && !isCorrectOpt ? styles.reviewWrong : '',
                      ].join(' ')}
                    >
                      <input type={inputType} readOnly checked={sel} />
                      {opt}
                      {isCorrectOpt && <FeatherIcon icon="check-circle" size={13} className={styles.correctIcon} />}
                    </label>
                  );
                })}
                {isCorrect && (
                  <div className={styles.niceWork}>
                    <span className={styles.niceIcon}><FeatherIcon icon="check-circle" size={14} /> Nice work</span>
                    <p>{result?.question_feedback?.[idx] ?? q.explanation ?? 'Correct!'}</p>
                  </div>
                )}
                {!isCorrect && userAns !== undefined && userAns !== '' && (
                  <div className={styles.wrongWork}>
                    <span className={styles.wrongIcon}><FeatherIcon icon="x-circle" size={14} /> Incorrect</span>
                    {correctOpt && <p>Correct answer: <strong>{correctOpt}</strong></p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* ════════════════════ TAKING SCREEN ══════════════════════════════════════ */
  if (screen === 'taking') {
    return (
      <form className={styles.takingPage} onSubmit={submit}>
        {/* Sub-header */}
        <div className={styles.subHeader}>
          <button type="button" className={styles.backBtn} onClick={() => setScreen('start')}><FeatherIcon icon="arrow-left" size={16} /> Back</button>
          <div className={styles.subHeaderMid}>
            <span className={styles.subTitle}>{assessment.title}</span>
            <span className={styles.subMeta}>Practice Assignment · {assessment.duration_min ?? 10} min</span>
          </div>
          {due && <span className={styles.dueLabel}><FeatherIcon icon="calendar" size={14} /> Due {due}</span>}
        </div>

        <div className={styles.takingBody}>
          {questions.map((q, idx) => (
            <div key={idx} className={styles.question}>
              <div className={styles.questionRow}>
                <span className={styles.qNum}>{idx + 1}.</span>
                <div className={styles.qBody}>
                  <p className={styles.qText}>{q.question}</p>
                  <span className={styles.qPoints}>{q.points ?? 1} point</span>
                </div>
              </div>

              {/* Radio options: multiple_choice / scenario / mcq */}
              {(['multiple_choice', 'scenario', 'mcq'].includes(q.type) || !q.type) && q.options?.map((opt, oi) => (
                <label key={oi} className={styles.option}>
                  <input
                    type="radio"
                    name={`q${idx}`}
                    value={opt}
                    checked={answers[q.id] === opt}
                    onChange={() => setAnswer(q.id, opt)}
                  />
                  {opt}
                </label>
              ))}

              {/* Checkbox options: checklist / multi_select */}
              {['checklist', 'multi_select'].includes(q.type) && q.options?.map((opt, oi) => (
                <label key={oi} className={styles.option}>
                  <input
                    type="checkbox"
                    checked={(answers[q.id] ?? []).includes(opt)}
                    onChange={(e) => {
                      const prev = answers[q.id] ?? [];
                      setAnswer(q.id, e.target.checked
                        ? [...prev, opt]
                        : prev.filter((v) => v !== opt));
                    }}
                  />
                  {opt}
                </label>
              ))}

              {/* Short answer */}
              {q.type === 'short_answer' && (
                <textarea
                  className={styles.textarea}
                  rows={4}
                  value={answers[q.id] ?? ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer…"
                />
              )}
            </div>
          ))}

          {/* Honor code */}
          <div className={`${styles.honorBox} ${honor ? styles.honorChecked : ''}`}>
            <p className={styles.honorTitle}>Coursera Honor Code</p>
            <p className={styles.honorText}>
              By clicking Submit, you confirm this work is your own. Submitting work created with AI tools
              may result in course failure or account deactivation according to the{' '}
              <a href="#" className={styles.honorLink}>Coursera Honor Code policy.</a>
            </p>
            <label className={styles.honorLabel}>
              <input
                type="checkbox"
                checked={honor}
                onChange={(e) => setHonor(e.target.checked)}
              />
              <span>I, <strong>{fullName}</strong>, understand and agree.</span>
            </label>
            {!honor && (
              <p className={styles.honorWarn}>You must select the checkbox in order to submit the assignment</p>
            )}
          </div>

          <div className={styles.takingActions}>
            <button type="submit" className={styles.submitBtn} disabled={submitting || !honor}>
              {submitting ? 'Submitting…' : 'Submit'}
            </button>
            <button type="button" className={styles.draftBtn} onClick={() => setScreen('start')}>
              Save draft
            </button>
          </div>
        </div>
      </form>
    );
  }

  /* ════════════════════ START SCREEN ═════════════════════════════════════ */
  return (
    <div className={styles.startPage}>
      <h1 className={styles.assignTitle}>{assessment.title}</h1>
      <Link to="#" className={styles.objLink}>Review Learning Objectives</Link>

      {/* Coach panel */}
      <div className={styles.coachBox}>
        <div className={styles.coachHeader}>
          <span className={styles.coachLabel}>coach</span>
          <button className={styles.coachChevron}><FeatherIcon icon="chevron-up" size={16} /></button>
        </div>
        <p className={styles.coachText}>
          Ready to review what you've learned before starting the assignment? I'm here to help.
        </p>
        <div className={styles.coachActions}>
          <button className={styles.coachBtn}>+ Help me practice</button>
          <button className={styles.coachBtn}>+ Let's chat</button>
        </div>
      </div>

      {/* Assignment details */}
      <div className={styles.detailsBox}>
        <p className={styles.detailsTitle}>Assignment details</p>
        <div className={styles.detailsRow}>
          <div>
            <p className={styles.detailLabel}>Due</p>
            <p className={styles.detailValue}>{due ?? 'No due date'}</p>
          </div>
          <div>
            <p className={styles.detailLabel}>Attempts</p>
            <p className={styles.detailValue}>{assessment.max_attempts ?? 'Unlimited'}</p>
          </div>
          <button className={styles.startBtn} onClick={() => setScreen('taking')}>Start</button>
        </div>
      </div>

      {/* Grade */}
      <div className={styles.gradeSection}>
        <p className={styles.gradeLabel}>Your grade</p>
        <p className={styles.gradeNote}>You haven't submitted this yet. We keep your highest score.</p>
        <p className={styles.gradeDash}>--</p>
      </div>

      {/* Footer */}
      <div className={styles.startFooter}>
        <div className={styles.footerLeft}>
          <button className={styles.reactBtn}><FeatherIcon icon="thumbs-up" size={14} /> Like</button>
          <button className={styles.reactBtn}><FeatherIcon icon="thumbs-down" size={14} /> Dislike</button>
          <button className={styles.reactBtn}><FeatherIcon icon="flag" size={14} /> Report an issue</button>
        </div>
        <button className={styles.nextItemBtn} onClick={() => navigate(-1)}>Go to next item <FeatherIcon icon="arrow-right" size={16} /></button>
      </div>
    </div>
  );
}
