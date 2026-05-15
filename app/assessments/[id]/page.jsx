/**
 * app/assessments/[id]/page.jsx — Assessment / Quiz taking UI
 */

'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import apiClient from '@/lib/apiClient';
import { notify } from '@/lib/authBridge';
import styles from './page.module.css';

export default function AssessmentPage() {
  const { id } = useParams();
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

  const handleAnswer = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const formatted = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));
      const res = await apiClient.post(`/assessments/${id}/submit`, { answers: formatted });
      setResult(res.data.data);

      if (res.data.data.passed) {
        notify.courseCompleted(assessment?.courses?.id);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading)  return <p className={styles.state}>Loading assessment…</p>;
  if (error)    return <p className={styles.error}>{error}</p>;

  if (result) {
    return (
      <main className={styles.page}>
        <h1 className={styles.heading}>{assessment.title} — Results</h1>
        <div className={result.passed ? styles.passed : styles.failed}>
          {result.passed ? '✅ Passed!' : '❌ Did not pass'}
        </div>
        {result.score != null && <p>Score: <strong>{result.score}%</strong> (pass mark: {assessment.pass_mark}%)</p>}
        {result.ai_feedback && (
          <div className={styles.feedback}>
            <h3>Feedback</h3>
            <p>{result.ai_feedback}</p>
          </div>
        )}
        <a href="/my-learning" className={styles.link}>← Back to My Learning</a>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <a href={`/courses/${assessment.courses?.id}`} className={styles.back}>← Back to course</a>
      <h1 className={styles.heading}>{assessment.title}</h1>
      <p className={styles.meta}>Type: {assessment.type} · Pass mark: {assessment.pass_mark}%</p>

      <form onSubmit={handleSubmit} className={styles.form}>
        {(assessment.questions ?? []).map((q, idx) => (
          <div key={q.id} className={styles.question}>
            <p className={styles.prompt}><strong>Q{idx + 1}.</strong> {q.prompt}</p>

            {q.type === 'mcq' && (
              <div className={styles.options}>
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className={styles.option}>
                    <input
                      type="radio"
                      name={q.id}
                      value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleAnswer(q.id, opt)}
                      required
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'multi_select' && (
              <div className={styles.options}>
                {(q.options ?? []).map((opt) => (
                  <label key={opt} className={styles.option}>
                    <input
                      type="checkbox"
                      value={opt}
                      checked={(answers[q.id] ?? []).includes(opt)}
                      onChange={(e) => {
                        const prev = answers[q.id] ?? [];
                        handleAnswer(q.id, e.target.checked
                          ? [...prev, opt]
                          : prev.filter((v) => v !== opt));
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'short_answer' && (
              <textarea
                className={styles.textarea}
                rows={3}
                value={answers[q.id] ?? ''}
                onChange={(e) => handleAnswer(q.id, e.target.value)}
                required
              />
            )}
          </div>
        ))}

        <button type="submit" className={styles.btn} disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit Assessment'}
        </button>
      </form>
    </main>
  );
}
