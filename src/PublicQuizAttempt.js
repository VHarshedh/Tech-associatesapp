import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getScoreLabel, isCorrect, needsAIValidation } from './utils/scoring';

/**
 * PublicQuizAttempt — the quiz-taking view for shared, public quiz links.
 * Supports both logged-in users and anonymous participants.
 * Extracted from App.js to keep that file manageable.
 *
 * Props:
 *  - quiz   {Object}   Firestore quiz document (may include { notFound, disabled, error } sentinel fields)
 *  - onBack {function} Navigate back (clears the hash route)
 */
function PublicQuizAttempt({ quiz, onBack }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [participantName, setParticipantName] = useState('');
  const [user, setUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState(quiz.timed ? quiz.timerDuration * 60 : null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState({});
  const [finalScore, setFinalScore] = useState(0);

  // ─── Auth listener ───────────────────────────────────────────────────────────

  useEffect(() => {
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (firebaseUser) => setUser(firebaseUser));
    return () => unsub();
  }, []);

  // ─── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!quiz.timed || submitted || timeLeft === 0) return;
    const timer = setInterval(() => setTimeLeft((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => clearInterval(timer);
  }, [quiz.timed, submitted, timeLeft]);

  // ─── AI Validation ────────────────────────────────────────────────────────

  const validateWithAI = async (currentAnswers) => {
    const aiQuestions = quiz.questions?.filter((q) => needsAIValidation(q)) ?? [];
    if (aiQuestions.length === 0) return {};
    setAiLoading(true);
    try {
      const res = await fetch('/api/validate-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: quiz.questions, userAnswers: currentAnswers }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error);
      const map = {};
      (data.results || []).forEach((r) => { map[r.index] = r; });
      setAiResults(map);
      return map;
    } catch (err) {
      console.error('AI validation error:', err);
      return {};
    } finally {
      setAiLoading(false);
    }
  };

  const computeFinalScore = (currentAnswers, aiResultsMap) => {
    const questions = quiz.questions;
    if (!questions?.length) return 0;
    let totalPoints = 0;
    questions.forEach((q, i) => {
      if (needsAIValidation(q)) {
        const r = aiResultsMap[i];
        totalPoints += r ? r.score : 0;
      } else {
        totalPoints += isCorrect(q, currentAnswers[i]) ? 100 : 0;
      }
    });
    return Math.round(totalPoints / questions.length);
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const isDeadlinePassed = () => {
    if (!quiz.deadline) return false;
    const deadline = quiz.deadline.toDate?.() || new Date(quiz.deadline);
    return new Date() > deadline;
  };

  const isTimerExpired = () => quiz.timed && timeLeft === 0;

  // ─── Sentinel states ─────────────────────────────────────────────────────────

  const ErrorCard = ({ icon, title, message }) => (
    <div
      style={{
        maxWidth: 600, margin: '40px auto', padding: '40px', textAlign: 'center',
        background: '#ffffff', borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)', border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: '64px', marginBottom: '20px' }}>{icon}</div>
      <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '28px', fontWeight: '700' }}>
        {title}
      </h2>
      <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
        {message}
      </p>
      <button className="btn btn-primary" onClick={onBack}>← Go Back</button>
    </div>
  );

  if (quiz?.notFound)
    return <ErrorCard icon="🔍" title="Quiz Not Found" message="The quiz you're looking for doesn't exist or may have been removed." />;
  if (quiz?.disabled)
    return <ErrorCard icon="🔒" title="Quiz Not Available" message="This quiz is not available for public attempts. Please contact the quiz creator for access." />;
  if (quiz?.error)
    return <ErrorCard icon="⚠️" title="Failed to Load Quiz" message="There was an error loading the quiz. Please try again or contact support." />;

  // ─── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isDeadlinePassed()) return;

    setSubmitted(true);

    // Run AI validation; it returns the map directly so we don't depend on stale state
    const aiMap = await validateWithAI(answers);
    const scorePercent = computeFinalScore(answers, aiMap);
    setFinalScore(scorePercent);

    try {
      const responses = quiz.questions.map((q, i) => ({
        question: q.question ?? '',
        answer: answers[i] ?? null,
      }));
      if (user) {
        await addDoc(collection(db, 'attempts'), {
          userId: user.uid, email: user.email || null, quizId: quiz.id,
          quizTopic: quiz.topic ?? 'Untitled', timestamp: serverTimestamp(),
          scorePercent, responses,
        });
      } else {
        await addDoc(collection(db, 'publicAttempts'), {
          ownerId: quiz.userId, quizId: quiz.id, quizTopic: quiz.topic ?? 'Untitled',
          participantName: participantName || 'Anonymous',
          timestamp: serverTimestamp(), scorePercent, responses,
        });
      }
    } catch (err) {
      console.error('Failed to save public attempt:', err);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] !== undefined && answers[k] !== '' && answers[k] !== null &&
    !(Array.isArray(answers[k]) && answers[k].length === 0)
  ).length;
  const aiQuestionsCount = quiz.questions?.filter((q) => needsAIValidation(q)).length ?? 0;

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: '0 16px', fontFamily: 'inherit' }}>
      {/* Back button */}
      <button onClick={onBack} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
        ← Back
      </button>

      {/* Quiz header card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white', padding: '30px', borderRadius: '16px',
          textAlign: 'center', marginBottom: '24px',
        }}
      >
        <h1 style={{ margin: '0 0 8px 0', fontSize: '28px', fontWeight: '700' }}>{quiz.topic}</h1>
        <p style={{ margin: 0, opacity: 0.9 }}>
          {quiz.questions?.length} questions · {quiz.timed ? `${quiz.timerDuration} min limit` : 'No time limit'}
        </p>
        {aiQuestionsCount > 0 && (
          <p style={{ margin: '8px 0 0 0', fontSize: '13px', opacity: 0.85 }}>
            ✨ {aiQuestionsCount} AI-graded question{aiQuestionsCount > 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Deadline expired */}
      {isDeadlinePassed() && (
        <div style={{ marginBottom: '20px', padding: '16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', color: '#dc2626', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>⏰</span>
          This quiz is no longer available. The deadline has passed.
        </div>
      )}

      {/* Timer */}
      {quiz.timed && !submitted && (
        <div
          style={{
            background: timeLeft === 0 ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: timeLeft === 0 ? '1px solid #fecaca' : '1px solid #fbbf24',
            borderRadius: '12px', padding: '16px', marginBottom: '20px', textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>{timeLeft === 0 ? '⏰' : '⏱️'}</span>
            <strong style={{ color: timeLeft === 0 ? '#dc2626' : '#92400e' }}>
              {timeLeft === 0 ? 'Time Expired' : 'Time Remaining'}
            </strong>
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: timeLeft === 0 ? '#dc2626' : '#92400e', fontFamily: 'monospace', background: 'white', padding: '10px 20px', borderRadius: '8px', display: 'inline-block' }}>
            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {/* Anonymous participant name */}
        {!user && (
          <div style={{ marginBottom: '24px', background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)', border: '1px solid #0ea5e9', borderRadius: '16px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 12px 0', color: '#0369a1', fontSize: '16px' }}>
              👋 Please introduce yourself
            </h3>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your full name"
              required
              style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #0ea5e9', fontSize: '16px', background: '#ffffff', boxSizing: 'border-box' }}
            />
          </div>
        )}

        {/* Questions */}
        {quiz.questions.map((q, i) => {
          const qType = (q.type ?? '').toLowerCase().replace(/[\s_]/g, '');
          const isAI = needsAIValidation(q);
          const aiResult = aiResults[i];

          return (
            <div
              key={i}
              style={{
                marginBottom: '24px', background: '#fff', borderRadius: '12px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '24px',
                border: `1px solid ${isAI ? '#e0e7ff' : '#f1f5f9'}`,
              }}
            >
              {/* Question header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                <div
                  style={{
                    background: isAI ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                    color: 'white', width: '32px', height: '32px', borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '14px', fontWeight: '700', flexShrink: 0,
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', fontSize: '17px', color: '#1e293b', lineHeight: '1.5' }}>
                    {q.question}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px', alignItems: 'center' }}>
                    {q.type && <span className="badge badge-info">{q.type}</span>}
                    {q.language && <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '11px', padding: '3px 8px', borderRadius: '4px', fontFamily: 'monospace' }}>{q.language}</span>}
                    {isAI && <span style={{ fontSize: '12px', color: '#6366f1', fontStyle: 'italic' }}>✨ AI graded</span>}
                  </div>
                </div>
              </div>

              {/* MCQ */}
              {(qType === 'mcq' || qType === 'multiplechoice') && Array.isArray(q.options) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`option-label ${answers[i] === opt ? 'option-label--selected' : ''}`}
                      style={{ cursor: submitted || isDeadlinePassed() || isTimerExpired() ? 'default' : 'pointer' }}
                    >
                      <input
                        type="radio"
                        name={`mcq-${i}`}
                        value={opt}
                        checked={answers[i] === opt}
                        disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                        onChange={() => setAnswers((a) => ({ ...a, [i]: opt }))}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {/* MSQ */}
              {qType === 'msq' && Array.isArray(q.options) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {q.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`option-label ${answers[i]?.includes(opt) ? 'option-label--selected' : ''}`}
                      style={{ cursor: submitted || isDeadlinePassed() || isTimerExpired() ? 'default' : 'pointer' }}
                    >
                      <input
                        type="checkbox"
                        checked={answers[i]?.includes(opt) || false}
                        disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                        onChange={(e) => {
                          let arr = answers[i] || [];
                          arr = e.target.checked ? [...arr, opt] : arr.filter((o) => o !== opt);
                          setAnswers((a) => ({ ...a, [i]: arr }));
                        }}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              )}

              {/* Short Answer */}
              {qType === 'shortanswer' && (
                <textarea
                  value={answers[i] || ''}
                  disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder="Type your answer here..."
                  rows={4}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '8px',
                    border: '2px solid #6366f1', fontSize: '15px', background: '#ffffff',
                    resize: 'vertical', minHeight: '100px', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              )}

              {/* Numerical */}
              {(qType === 'numerical' || qType === 'number') && (
                <input
                  type="number"
                  value={answers[i] || ''}
                  disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder="Enter number..."
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '8px', border: '1px solid #dbeafe', fontSize: '16px', background: '#fff', boxSizing: 'border-box' }}
                />
              )}

              {/* Coding */}
              {qType === 'coding' && (
                <textarea
                  value={answers[i] || ''}
                  disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder={`Write your ${q.language || 'code'} here...`}
                  rows={7}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '10px',
                    border: '2px solid #334155', fontSize: '14px',
                    background: '#0f172a', color: '#e2e8f0',
                    fontFamily: "'Fira Code', 'Courier New', monospace",
                    resize: 'vertical', minHeight: '140px', lineHeight: '1.6',
                    boxSizing: 'border-box',
                  }}
                />
              )}

              {/* Post-submission feedback */}
              {submitted && (
                <div style={{ marginTop: '16px' }}>
                  {isAI ? (
                    aiLoading ? (
                      <div style={{ padding: '12px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '10px', color: '#0369a1' }}>
                        <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        <span style={{ fontSize: '14px' }}>✨ Gemini is grading your answer…</span>
                      </div>
                    ) : aiResult ? (
                      <div style={{ padding: '14px', background: aiResult.score >= 70 ? '#f0fdf4' : aiResult.score >= 40 ? '#fefce8' : '#fef2f2', border: `1px solid ${aiResult.score >= 70 ? '#bbf7d0' : aiResult.score >= 40 ? '#fde68a' : '#fecaca'}`, borderRadius: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <strong style={{ color: '#1e293b' }}>{aiResult.score >= 70 ? '✅' : aiResult.score >= 40 ? '⚠️' : '❌'} AI Score</strong>
                          <span style={{ fontWeight: '800', fontSize: '20px', color: aiResult.score >= 70 ? '#166534' : aiResult.score >= 40 ? '#854d0e' : '#dc2626' }}>{aiResult.score}/100</span>
                        </div>
                        <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.6', background: 'white', padding: '10px', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.05)' }}>
                          <strong>Feedback:</strong> {aiResult.feedback}
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px', background: '#f1f5f9', borderRadius: '10px', color: '#64748b', fontSize: '14px' }}>
                        AI grading not available for this question.
                      </div>
                    )
                  ) : (
                    <div style={{ padding: '12px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', color: '#166534' }}>
                      <div style={{ fontWeight: '600', marginBottom: '6px' }}>
                        ✅ Correct Answer: {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                      </div>
                      {answers[i] !== undefined && (
                        <div style={{ padding: '7px 12px', background: isCorrect(q, answers[i]) ? '#f0fdf4' : '#fef2f2', border: `1px solid ${isCorrect(q, answers[i]) ? '#bbf7d0' : '#fecaca'}`, borderRadius: '8px', color: isCorrect(q, answers[i]) ? '#166534' : '#dc2626', fontSize: '14px' }}>
                          {isCorrect(q, answers[i]) ? '🎯' : '❌'} Your Answer: {Array.isArray(answers[i]) ? answers[i].join(', ') : answers[i]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Submit section */}
        {!submitted && (
          <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '16px' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '20px', marginBottom: '20px', maxWidth: '400px', margin: '0 auto 20px auto', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Questions Answered:</span>
                <strong>{answeredCount} / {quiz.questions.length}</strong>
              </div>
              {aiQuestionsCount > 0 && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6366f1', fontStyle: 'italic' }}>
                  ✨ {aiQuestionsCount} question{aiQuestionsCount > 1 ? 's' : ''} will be graded by Gemini AI after submission.
                </p>
              )}
              <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                Review your answers before submitting — you won't be able to change them.
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button
                type="submit"
                disabled={isDeadlinePassed()}
                className="btn btn-primary btn-lg"
                style={{ opacity: isDeadlinePassed() ? 0.5 : 1, cursor: isDeadlinePassed() ? 'not-allowed' : 'pointer' }}
              >
                <span style={{ marginRight: '8px' }}>{isDeadlinePassed() ? '⏰' : '🚀'}</span>
                {isDeadlinePassed() ? 'Quiz Expired' : isTimerExpired() ? 'Submit (Time Expired)' : 'Submit Quiz'}
              </button>
            </div>
          </div>
        )}
      </form>

      {/* Results */}
      {submitted && (
        <div style={{ marginTop: '32px', textAlign: 'center' }}>
          {aiLoading ? (
            <div style={{ padding: '32px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '20px' }}>
              <div className="spinner" style={{ width: 40, height: 40, margin: '0 auto 16px auto', borderTopColor: '#6366f1' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#0369a1' }}>✨ Gemini is grading your answers…</h3>
              <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>This usually takes 5–10 seconds</p>
            </div>
          ) : (
            <div>
              <div
                style={{
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  border: '1px solid #bbf7d0', borderRadius: '20px',
                  padding: '32px', marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '56px', marginBottom: '16px' }}>🎉</div>
                <h2 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '24px', fontWeight: '700' }}>
                  Quiz Completed!
                </h2>
                <div style={{ background: '#ffffff', padding: '20px', borderRadius: '14px', display: 'inline-block', border: '1px solid #bbf7d0' }}>
                  <div style={{ fontSize: '42px', fontWeight: '800', color: '#166534' }}>{finalScore}%</div>
                  <div style={{ fontSize: '14px', color: '#166534', opacity: 0.8, marginTop: '4px' }}>
                    {getScoreLabel(finalScore)}
                  </div>
                  {aiQuestionsCount > 0 && (
                    <div style={{ fontSize: '12px', color: '#6366f1', marginTop: '4px' }}>✨ Includes AI grading</div>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                  { icon: '📝', value: quiz.questions.length, label: 'Total' },
                  { icon: '✅', value: Math.round((finalScore / 100) * quiz.questions.length), label: 'Correct' },
                  {
                    icon: '⏱️',
                    value: quiz.timed
                      ? `${Math.floor((quiz.timerDuration * 60 - (timeLeft ?? 0)) / 60)}:${((quiz.timerDuration * 60 - (timeLeft ?? 0)) % 60).toString().padStart(2, '0')}`
                      : 'N/A',
                    label: 'Time Used',
                  },
                ].map(({ icon, value, label }) => (
                  <div key={label} style={{ textAlign: 'center', padding: '14px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '20px', marginBottom: '4px' }}>{icon}</div>
                    <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{value}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{label}</div>
                  </div>
                ))}
              </div>

              <button onClick={onBack} className="btn btn-secondary">
                ← Take Another Quiz
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default PublicQuizAttempt;
