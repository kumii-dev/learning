/**
 * client/src/pages/Assessment.jsx
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../lib/apiClient';
import { notify } from '../lib/authBridge';
import styles from './Assessment.module.css';

export default function Assessment() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [answers,    setAnswers]    = useState({});
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState(null);

  useEffect(() => {
    apiClient.get(`/assessments/${id}`)
      .then((res) => setAssessment(res.data.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const setAnswer = (qIndex, value) =>
    setAnswers((prev) => ({ ...prev, [qIndex]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiClient.post(`/assessments/${id}/submit`, { answers });
      const data = res.data.data;
      setResult(data);
      if (data.passed) {
        notify.courseCompleted(data.courseId ?? '');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className={styles.state}>Loading assessment…</p>;
  if (error)   return <p className={styles.error}>{error}</p>;

  /* ---------- Result screen ---------- */
  if (result) return (
    <main className={styles.page}>
      <div className={`${styles.resultCard} ${result.passed ? styles.pass : styles.fail}`}>
        <h1>{result.passed ? '🎉 Passed!' : '❌ Not passed'}</h1>
        <p className={styles.score}>Score: {result.score}%</p>
        {result.ai_feedback && (
          <div className={styles.feedback}>
            <h3>AI Feedback</h3>
            <p>{result.ai_feedback}</p>
          </div>
        )}
        {result.passed
          ? <button className={styles.btn} onClick={() => navigate('/certificates')}>View Certificates</button>
          : <button className={styles.btn} onClick={() => window.location.reload()}>Try Again</button>
        }
      </div>
    </main>
  );

  /* ---------- Question form ---------- */
  const questions = assessment.questions ?? [];

  return (
    <main className={styles.page}>
      <h1 className={styles.heading}>{assessment.title}</h1>
      <p className={styles.type}>Type: {assessment.type}</p>
      <form className={styles.form} onSubmit={submit}>
        {questions.map((q, idx) => (
          <fieldset key={idx} className={styles.question}>
            <legend className={styles.questionText}>{idx + 1}. {q.question}</legend>

            {/* MCQ — single select */}
            {q.type === 'mcq' && q.options?.map((opt, oi) => (
              <label key={oi} className={styles.option}>
                <input
                  type="radio"
                  name={`q${idx}`}
                  value={opt}
                  checked={answers[idx] === opt}
                  onChange={() => setAnswer(idx, opt)}
                />
                {opt}
              </label>
            ))}

            {/* Multi-select */}
            {q.type === 'multi_select' && q.options?.map((opt, oi) => (
              <label key={oi} className={styles.option}>
                <input
                  type="checkbox"
                  value={opt}
                  checked={(answers[idx] ?? []).includes(opt)}
                  onChange={(e) => {
                    const prev = answers[idx] ?? [];
                    setAnswer(idx, e.target.checked
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
                value={answers[idx] ?? ''}
                onChange={(e) => setAnswer(idx, e.target.value)}
                placeholder="Your answer…"
              />
            )}
          </fieldset>
        ))}

        <button type="submit" className={styles.btn} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Assessment'}
        </button>
      </form>
    </main>
  );
}
