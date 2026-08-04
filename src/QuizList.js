import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Spinner from './components/Spinner';
import EmptyState from './components/EmptyState';
import { useToast } from './components/Toast';

const QuizList = ({ user, onAttempt }) => {
  const { showToast } = useToast();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuizzes, setExpandedQuizzes] = useState(new Set());

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    const q = query(collection(db, 'quizzes'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setQuizzes(data);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching quizzes:', err);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [user]);

  const toggleQuizExpansion = (quizId) => {
    setExpandedQuizzes((prev) => {
      const next = new Set(prev);
      next.has(quizId) ? next.delete(quizId) : next.add(quizId);
      return next;
    });
  };

  const copyShareLink = (quizId) => {
    const link = `${window.location.origin}/#/quiz/${quizId}`;
    navigator.clipboard
      .writeText(link)
      .then(() => showToast('Share link copied to clipboard!', 'success'))
      .catch(() => showToast('Failed to copy link. Please copy manually.', 'error'));
  };

  const renderQuestion = (question, index) => (
    <div
      key={index}
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '12px' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            color: 'white',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '14px',
            fontWeight: '700',
            flexShrink: 0,
          }}
        >
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: '600', fontSize: '15px', marginBottom: '6px', color: '#1e293b', lineHeight: '1.5' }}>
            {question.question}
          </div>
          {question.type && <span className="badge badge-info">{question.type}</span>}
        </div>
      </div>

      {/* MCQ options */}
      {(question.type?.toUpperCase() === 'MCQ' || question.type?.toLowerCase() === 'multiple_choice') &&
        Array.isArray(question.options) && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
              Options (select one):
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {question.options.map((opt, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '7px 12px',
                    background: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    fontSize: '13px',
                    color: '#374151',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <span
                    style={{
                      background: '#3b82f6',
                      color: 'white',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '11px',
                      fontWeight: '600',
                      flexShrink: 0,
                    }}
                  >
                    {String.fromCharCode(65 + idx)}
                  </span>
                  {opt}
                </div>
              ))}
            </div>
          </div>
        )}

      {/* MSQ options */}
      {question.type?.toUpperCase() === 'MSQ' && Array.isArray(question.options) && (
        <div style={{ marginTop: '8px' }}>
          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: '500' }}>
            Options (select multiple):
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {question.options.map((opt, idx) => (
              <div
                key={idx}
                style={{
                  padding: '7px 12px',
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    background: '#8b5cf6',
                    color: 'white',
                    width: '20px',
                    height: '20px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: '600',
                    flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </span>
                {opt}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Correct answer */}
      {question.answer && (
        <div
          style={{
            marginTop: '10px',
            padding: '8px 12px',
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '6px',
          }}
        >
          <span style={{ fontSize: '12px', color: '#166534', fontWeight: '700' }}>
            ✅ Correct Answer:{' '}
          </span>
          <span style={{ fontSize: '13px', color: '#166534' }}>
            {Array.isArray(question.answer) ? question.answer.join(', ') : question.answer}
          </span>
        </div>
      )}
    </div>
  );

  if (loading) return <Spinner text="Loading your quizzes..." />;

  return (
    <div style={{ marginTop: 32 }}>
      <h2 style={{ color: '#1e293b', fontSize: '20px', fontWeight: '700', marginBottom: '20px' }}>
        📚 Your Quizzes
      </h2>

      {quizzes.length === 0 ? (
        <EmptyState
          icon="🧩"
          title="No quizzes yet"
          subtitle="Create your first quiz using the creator above. It takes less than a minute!"
        />
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {quizzes.map((qz) => {
            let deadlineStr = 'None';
            if (qz.deadline) {
              try {
                deadlineStr = (qz.deadline.toDate?.() || new Date(qz.deadline)).toLocaleString();
              } catch {
                deadlineStr = 'Invalid date';
              }
            }

            const isExpanded = expandedQuizzes.has(qz.id);

            return (
              <li
                key={qz.id}
                style={{
                  background: '#fff',
                  borderRadius: '12px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  padding: '20px',
                  marginBottom: '20px',
                  border: '1px solid #f1f5f9',
                  transition: 'box-shadow 0.2s ease',
                }}
              >
                {/* ── Quiz Header ── */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '14px',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: '17px', color: '#1e293b', display: 'block', marginBottom: '8px' }}>
                      {qz.topic || 'Untitled Quiz'}
                    </strong>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span className="badge badge-muted">{qz.questions?.length || 0} questions</span>
                      <span className="badge badge-muted">Due: {deadlineStr}</span>
                      {qz.timed && (
                        <span className="badge badge-warning">⏱ {qz.timerDuration} min</span>
                      )}
                      {qz.shareEnabled && (
                        <span className="badge badge-success">🔗 Shared</span>
                      )}
                    </div>
                  </div>

                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '13px', padding: '7px 12px', marginLeft: '12px' }}
                    onClick={() => toggleQuizExpansion(qz.id)}
                  >
                    {isExpanded ? '▲ Hide' : '▶ Details'}
                  </button>
                </div>

                {/* ── Quick Actions (always visible) ── */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <button className="btn btn-primary" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => onAttempt(qz)}>
                    🎯 Attempt
                  </button>
                  {qz.shareEnabled && (
                    <button className="btn btn-success" style={{ fontSize: '13px', padding: '8px 16px' }} onClick={() => copyShareLink(qz.id)}>
                      🔗 Copy Link
                    </button>
                  )}
                </div>

                {/* ── Expanded Details ── */}
                {isExpanded && (
                  <div
                    className="animate-slide-down"
                    style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '16px' }}
                  >
                    {/* Stats row */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                        gap: '10px',
                        marginBottom: '20px',
                      }}
                    >
                      {[
                        { label: 'Total', value: qz.questions?.length || 0 },
                        { label: 'MCQ', value: qz.questions?.filter((q) => q.type?.toUpperCase() === 'MCQ').length || 0 },
                        { label: 'MSQ', value: qz.questions?.filter((q) => q.type?.toUpperCase() === 'MSQ').length || 0 },
                        {
                          label: 'Text/Num',
                          value: qz.questions?.filter((q) =>
                            ['short answer', 'short_answer', 'numerical'].includes(q.type?.toLowerCase())
                          ).length || 0,
                        },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          style={{
                            textAlign: 'center',
                            padding: '10px',
                            background: '#f8fafc',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ fontSize: '18px', fontWeight: '700', color: '#1e293b' }}>{value}</div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Questions preview */}
                    <h4 style={{ margin: '0 0 14px 0', color: '#1e293b', fontSize: '15px' }}>
                      📝 Questions Preview
                    </h4>
                    {qz.questions?.length > 0 ? (
                      qz.questions.map((q, i) => renderQuestion(q, i))
                    ) : (
                      <p style={{ color: '#64748b', fontStyle: 'italic', fontSize: '14px' }}>
                        No questions available.
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default QuizList;
