import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getScore, getScoreLabel, isCorrect, needsAIValidation } from './utils/scoring';
import { useToast } from './components/Toast';

/**
 * QuizAttempt — the in-app quiz-taking view for logged-in users.
 * MCQ / MSQ / Numerical are scored exactly.
 * Coding and Short Answer are sent to the backend for Gemini AI grading.
 */
function QuizAttempt({ quiz, user, onBack }) {
  const { showToast } = useToast();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.timed ? quiz.timerDuration * 60 : null);

  // AI grading state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState({}); // { [questionIndex]: { score, feedback, isCorrect } }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isDeadlinePassed = () => {
    if (!quiz.deadline) return false;
    const deadline = quiz.deadline.toDate?.() || new Date(quiz.deadline);
    return new Date() > deadline;
  };

  const isTimerExpired = () => quiz.timed && timeLeft === 0;

  const exactScore = getScore(quiz.questions, answers);

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== '' && answers[k] !== null &&
    !(Array.isArray(answers[k]) && answers[k].length === 0)
  ).length;

  // ─── AI Validation ───────────────────────────────────────────────────────────

  const validateWithAI = async (currentAnswers) => {
    const aiQuestions = quiz.questions.filter((q) => needsAIValidation(q));
    if (aiQuestions.length === 0) return;

    setAiLoading(true);
    try {
      const res = await fetch('/api/validate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questions: quiz.questions,
          userAnswers: currentAnswers,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'AI validation failed');

      const map = {};
      (data.results || []).forEach((r) => { map[r.index] = r; });
      setAiResults(map);
    } catch (err) {
      console.error('AI validation error:', err);
      showToast('AI grading failed — manual review needed.', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  // ─── Aggregate final score (exact + AI) ──────────────────────────────────────

  const computeFinalScore = (currentAnswers, aiResultsMap) => {
    const questions = quiz.questions;
    if (!questions?.length) return 0;

    let totalPoints = 0;
    questions.forEach((q, i) => {
      if (needsAIValidation(q)) {
        const aiResult = aiResultsMap[i];
        totalPoints += aiResult ? aiResult.score : 0;
      } else {
        totalPoints += isCorrect(q, currentAnswers[i]) ? 100 : 0;
      }
    });
    return Math.round(totalPoints / questions.length);
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleChange = (qid, value) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
  };

  const saveAttempt = async (finalScore) => {
    try {
      const responses = quiz.questions.map((q, i) => ({
        question: q.question ?? '',
        answer: answers[i] ?? null,
      }));
      await addDoc(collection(db, 'attempts'), {
        userId: user.uid,
        email: user.email || null,
        quizId: quiz.id ?? quiz.quizId ?? '',
        quizTopic: quiz.topic ?? 'Untitled',
        timestamp: serverTimestamp(),
        scorePercent: finalScore ?? 0,
        responses,
        timeRemaining: timeLeft,
      });
    } catch (err) {
      console.error('Failed to save attempt:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDeadlinePassed()) {
      showToast('This quiz is no longer available. The deadline has passed.', 'error');
      return;
    }
    setSubmitted(true);
    // Run AI validation in background; save after it completes
    await validateWithAI(answers);
  };

  // Save to Firestore once AI results are ready
  useEffect(() => {
    if (!submitted || aiLoading) return;
    const finalScore = computeFinalScore(answers, aiResults);
    saveAttempt(finalScore);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, aiLoading]);

  // ─── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!quiz.timed || submitted || timeLeft === 0) return;
    const timer = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [quiz.timed, submitted, timeLeft]);

  // ─── Derived values ──────────────────────────────────────────────────────────

  const finalScore = submitted && !aiLoading ? computeFinalScore(answers, aiResults) : exactScore;

  const aiQuestionsCount = quiz.questions?.filter((q) => needsAIValidation(q)).length ?? 0;

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        maxWidth: 800, margin: '40px auto', padding: 0, borderRadius: 20,
        background: '#ffffff', boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        fontFamily: 'inherit', border: '1px solid #e5e7eb', overflow: 'hidden',
      }}
    >
      {/* ── Header ── */}
      <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '30px', textAlign: 'center', position: 'relative' }}>
        <button
          onClick={onBack}
          style={{ position: 'absolute', top: '20px', left: '20px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: '500', color: 'white', fontSize: '14px' }}
          onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
          onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.2)')}
        >
          ← Back
        </button>
        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700' }}>{quiz.topic}</h1>
        <p style={{ margin: '0 0 16px 0', opacity: 0.9, fontSize: '16px' }}>Complete this quiz to test your knowledge</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {aiQuestionsCount > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}>
              ✨ {aiQuestionsCount} AI-graded question{aiQuestionsCount > 1 ? 's' : ''}
            </span>
          )}
          {quiz.timed && !submitted && (
            <span style={{ background: 'rgba(255,255,255,0.2)', padding: '6px 14px', borderRadius: '20px', fontSize: '13px' }}>
              ⏱ {quiz.timerDuration} min limit
            </span>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '40px' }}>

        {/* Deadline expired */}
        {isDeadlinePassed() && (
          <div style={{ marginBottom: '24px', padding: '20px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⏰</span>
            <div><strong>Quiz Deadline Expired</strong><br /><span style={{ fontSize: '14px' }}>This quiz is no longer available.</span></div>
          </div>
        )}

        {/* Timer */}
        {quiz.timed && !submitted && (
          <div style={{ background: timeLeft === 0 ? '#fef2f2' : '#fef3c7', border: `1px solid ${timeLeft === 0 ? '#fecaca' : '#fbbf24'}`, borderRadius: '12px', padding: '16px', marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: '700', color: timeLeft === 0 ? '#dc2626' : '#92400e', fontFamily: 'monospace' }}>
              {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </div>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: timeLeft === 0 ? '#dc2626' : '#92400e' }}>
              {timeLeft === 0 ? "Time's up! Submit when ready." : 'Time remaining'}
            </p>
          </div>
        )}

        {/* Progress */}
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontWeight: '600', color: '#1e293b' }}>Progress</span>
            <span className="badge badge-info">{answeredCount} / {quiz.questions.length} answered</span>
          </div>
          <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${(answeredCount / quiz.questions.length) * 100}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', borderRadius: '4px', transition: 'width 0.3s ease' }} />
          </div>
        </div>

        {/* Questions */}
        <form onSubmit={handleSubmit}>
          {quiz.questions.map((q, i) => {
            const qType = (q.type ?? '').toLowerCase().replace(/[\s_]/g, '');
            const isAI = needsAIValidation(q);
            const aiResult = aiResults[i];

            return (
              <div key={i} style={{ marginBottom: '28px', background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', padding: '24px', border: `1px solid ${isAI ? '#e0e7ff' : '#f1f5f9'}` }}>
                {/* Question header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ background: isAI ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', flexShrink: 0 }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '17px', color: '#1e293b', lineHeight: '1.5', marginBottom: '8px' }}>{q.question}</div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="badge badge-info">{q.type}</span>
                      {q.language && <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>{q.language}</span>}
                      {isAI && <span style={{ fontSize: '12px', color: '#6366f1', fontStyle: 'italic' }}>✨ AI graded</span>}
                    </div>
                  </div>
                </div>

                {/* MCQ */}
                {qType === 'mcq' && Array.isArray(q.options) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, idx) => (
                      <label key={idx} className={`option-label ${answers[i] === opt ? 'option-label--selected' : ''}`} style={{ cursor: submitted ? 'default' : 'pointer' }}>
                        <input type="radio" name={`mcq-${i}`} value={opt} checked={answers[i] === opt} disabled={submitted || isDeadlinePassed() || isTimerExpired()} onChange={() => handleChange(i, opt)} />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {/* MSQ */}
                {qType === 'msq' && Array.isArray(q.options) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {q.options.map((opt, idx) => (
                      <label key={idx} className={`option-label ${answers[i]?.includes(opt) ? 'option-label--selected' : ''}`} style={{ cursor: submitted ? 'default' : 'pointer' }}>
                        <input type="checkbox" checked={answers[i]?.includes(opt) || false} disabled={submitted || isDeadlinePassed() || isTimerExpired()} onChange={(e) => {
                          let arr = answers[i] || [];
                          arr = e.target.checked ? [...arr, opt] : arr.filter((o) => o !== opt);
                          handleChange(i, arr);
                        }} />
                        {opt}
                      </label>
                    ))}
                  </div>
                )}

                {/* Short Answer */}
                {qType === 'shortanswer' && (
                  <textarea
                    value={answers[i] || ''}
                    disabled={submitted}
                    onChange={(e) => handleChange(i, e.target.value)}
                    placeholder="Write your answer here..."
                    rows={4}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #6366f1', fontSize: '15px', background: '#fff', resize: 'vertical', minHeight: '100px', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                )}

                {/* Numerical */}
                {qType === 'numerical' && (
                  <input
                    type="number"
                    value={answers[i] || ''}
                    disabled={submitted}
                    onChange={(e) => handleChange(i, e.target.value)}
                    placeholder="Enter number..."
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '2px solid #8b5cf6', fontSize: '16px', background: '#fff', boxSizing: 'border-box' }}
                  />
                )}

                {/* Coding */}
                {qType === 'coding' && (
                  <div>
                    <textarea
                      value={answers[i] || ''}
                      disabled={submitted}
                      onChange={(e) => handleChange(i, e.target.value)}
                      placeholder={`Write your ${q.language || 'code'} here...`}
                      rows={8}
                      style={{
                        width: '100%', padding: '16px', borderRadius: '10px',
                        border: '2px solid #334155', fontSize: '14px',
                        background: '#0f172a', color: '#e2e8f0',
                        fontFamily: "'Fira Code', 'Courier New', monospace",
                        resize: 'vertical', minHeight: '160px', lineHeight: '1.6',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}

                {/* ── Post-submission feedback ── */}
                {submitted && (
                  <div style={{ marginTop: '16px' }}>
                    {isAI ? (
                      /* AI feedback */
                      aiLoading ? (
                        <div style={{ padding: '14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#0369a1' }}>
                          <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                          <span style={{ fontSize: '14px' }}>✨ Gemini is grading your answer…</span>
                        </div>
                      ) : aiResult ? (
                        <div style={{ padding: '16px', background: aiResult.score >= 70 ? '#f0fdf4' : aiResult.score >= 40 ? '#fefce8' : '#fef2f2', border: `1px solid ${aiResult.score >= 70 ? '#bbf7d0' : aiResult.score >= 40 ? '#fde68a' : '#fecaca'}`, borderRadius: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '18px' }}>{aiResult.score >= 70 ? '✅' : aiResult.score >= 40 ? '⚠️' : '❌'}</span>
                              <strong style={{ color: '#1e293b', fontSize: '15px' }}>AI Score</strong>
                            </div>
                            <div style={{ fontWeight: '800', fontSize: '22px', color: aiResult.score >= 70 ? '#166534' : aiResult.score >= 40 ? '#854d0e' : '#dc2626' }}>
                              {aiResult.score}/100
                            </div>
                          </div>
                          <div style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6', background: 'white', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.06)' }}>
                            <strong>Feedback:</strong> {aiResult.feedback}
                          </div>
                        </div>
                      ) : (
                        <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px', color: '#64748b', fontSize: '14px' }}>
                          AI grading not available for this question.
                        </div>
                      )
                    ) : (
                      /* Exact-match result */
                      <div style={{ padding: '14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534' }}>
                        <strong>Correct Answer: </strong>{Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                        {answers[i] !== undefined && (
                          <div style={{ marginTop: '8px', padding: '8px 12px', background: isCorrect(q, answers[i]) ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCorrect(q, answers[i]) ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', color: isCorrect(q, answers[i]) ? '#166534' : '#dc2626', fontSize: '14px' }}>
                            {isCorrect(q, answers[i]) ? '🎯' : '❌'} <strong>Your Answer:</strong> {Array.isArray(answers[i]) ? answers[i].join(', ') : answers[i]}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Submit */}
          {!submitted && (
            <div style={{ textAlign: 'center', marginTop: '32px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '20px', marginBottom: '20px', maxWidth: '450px', margin: '0 auto 20px auto' }}>
                <h4 style={{ margin: '0 0 12px 0', color: '#1e293b' }}>📝 Ready to Submit?</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Answered:</span>
                  <strong>{answeredCount} / {quiz.questions.length}</strong>
                </div>
                {aiQuestionsCount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>AI-graded:</span>
                    <strong>{aiQuestionsCount} question{aiQuestionsCount > 1 ? 's' : ''}</strong>
                  </div>
                )}
                <p style={{ margin: '12px 0 0 0', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                  {aiQuestionsCount > 0
                    ? 'After submitting, Gemini will grade your Coding & Short Answer responses.'
                    : 'Review your answers before submitting.'}
                </p>
              </div>
              <button type="submit" disabled={isDeadlinePassed()} className="btn btn-primary btn-lg">
                🚀 Submit Quiz
              </button>
            </div>
          )}
        </form>

        {/* Results */}
        {submitted && (
          <div style={{ marginTop: '40px', textAlign: 'center' }}>
            {aiLoading ? (
              <div style={{ padding: '32px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '20px' }}>
                <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px auto', borderTopColor: '#6366f1' }} />
                <h3 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>✨ Gemini is grading your answers…</h3>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>This usually takes 5–10 seconds</p>
              </div>
            ) : (
              <div style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)', border: '1px solid #bbf7d0', borderRadius: '20px', padding: '32px' }}>
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                <h2 style={{ margin: '0 0 8px 0', color: '#166534', fontSize: '26px' }}>Quiz Completed!</h2>
                <div style={{ background: '#fff', padding: '20px', borderRadius: '14px', display: 'inline-block', border: '1px solid #bbf7d0', marginBottom: '20px' }}>
                  <div style={{ fontSize: '48px', fontWeight: '800', color: '#166534' }}>{finalScore}%</div>
                  <div style={{ fontSize: '14px', color: '#166534', opacity: 0.8 }}>{getScoreLabel(finalScore)}</div>
                  {aiQuestionsCount > 0 && <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '4px' }}>✨ Includes AI grading</div>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', maxWidth: '400px', margin: '0 auto 24px auto' }}>
                  {[
                    { icon: '📝', value: quiz.questions.length, label: 'Total' },
                    { icon: '✅', value: Math.round((finalScore / 100) * quiz.questions.length), label: 'Correct' },
                    { icon: '🤖', value: aiQuestionsCount, label: 'AI Graded' },
                  ].map(({ icon, value, label }) => (
                    <div key={label} style={{ textAlign: 'center', padding: '12px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '20px' }}>{icon}</div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b' }}>{value}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{label}</div>
                    </div>
                  ))}
                </div>
                <button onClick={onBack} className="btn btn-secondary">← Back to Dashboard</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default QuizAttempt;
