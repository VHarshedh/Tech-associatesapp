// AttemptHistory.js
import React, { useEffect, useState } from 'react';
import { db } from './firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import Spinner from './components/Spinner';
import EmptyState from './components/EmptyState';

function AttemptHistory({ user }) {
  const [attempts, setAttempts] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.uid) return;
    setLoading(true);
    setError(null);

    const ownQuery = query(collection(db, 'attempts'), where('userId', '==', user.uid));
    const ownerQuery = query(collection(db, 'publicAttempts'), where('ownerId', '==', user.uid));

    let ownSnapCache = null;
    let ownerSnapCache = null;

    const mergeAndSet = (ownSnap, ownerSnap) => {
      try {
        const own = ownSnap ? ownSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
        const received = ownerSnap ? ownerSnap.docs.map((d) => ({ id: d.id, ...d.data() })) : [];
        const map = new Map();
        [...own, ...received].forEach((a) => map.set(a.id, a));
        const merged = Array.from(map.values()).sort((a, b) => {
          const aMs = a.timestamp?.toMillis?.() || (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0);
          const bMs = b.timestamp?.toMillis?.() || (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0);
          return bMs - aMs;
        });
        setAttempts(merged);
        setLoading(false);
      } catch (err) {
        console.error('Error processing attempts:', err);
        setError('Failed to process attempts');
        setLoading(false);
      }
    };

    const unsubOwn = onSnapshot(
      ownQuery,
      (snap) => { ownSnapCache = snap; mergeAndSet(ownSnapCache, ownerSnapCache); },
      (err) => { console.error('Error fetching own attempts:', err); setError('Failed to fetch your attempts'); setLoading(false); }
    );
    const unsubOwner = onSnapshot(
      ownerQuery,
      (snap) => { ownerSnapCache = snap; mergeAndSet(ownSnapCache, ownerSnapCache); },
      (err) => { console.error('Error fetching public attempts:', err); setError('Failed to fetch public attempts'); setLoading(false); }
    );

    return () => { unsubOwn(); unsubOwner(); };
  }, [user]);

  if (loading) return <Spinner text="Loading attempts..." />;

  if (error) {
    return (
      <div
        style={{
          maxWidth: 600,
          margin: '40px auto',
          padding: 24,
          textAlign: 'center',
          background: '#fff',
          borderRadius: 12,
          border: '1px solid #fecaca',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
        <p style={{ color: '#dc2626', fontWeight: '600', marginBottom: '16px' }}>{error}</p>
        <button className="btn btn-secondary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        marginTop: 32,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        padding: '28px',
        border: '1px solid #e2e8f0',
        fontFamily: 'inherit',
      }}
    >
      <h2 style={{ marginBottom: 20, color: '#1e293b', fontSize: '20px', fontWeight: '700' }}>
        📋 Quiz Attempts
      </h2>

      {attempts.length === 0 ? (
        <EmptyState
          icon="🗂️"
          title="No attempts yet"
          subtitle="Complete a quiz to see your history and scores here."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {attempts.map((attempt) => {
            const dateStr = attempt.timestamp?.seconds
              ? new Date(attempt.timestamp.seconds * 1000).toLocaleString()
              : 'No timestamp';
            const isExpanded = expandedId === attempt.id;
            const score = attempt.scorePercent ?? 0;
            const scoreColor = score >= 70 ? '#166534' : score >= 50 ? '#854d0e' : '#dc2626';
            const scoreBg = score >= 70 ? '#f0fdf4' : score >= 50 ? '#fefce8' : '#fef2f2';

            return (
              <div
                key={attempt.id}
                className={`attempt-card ${isExpanded ? 'attempt-card--selected' : ''}`}
                onClick={() => setExpandedId(isExpanded ? null : attempt.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && setExpandedId(isExpanded ? null : attempt.id)}
                aria-expanded={isExpanded}
              >
                {/* ── Row ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
                      {attempt.quizTopic || 'Untitled Quiz'}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: '3px' }}>{dateStr}</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      {attempt.participantName || (attempt.email ? attempt.email : 'You')}
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 700,
                      fontSize: '18px',
                      color: scoreColor,
                      background: scoreBg,
                      padding: '6px 14px',
                      borderRadius: '20px',
                      minWidth: '60px',
                      textAlign: 'center',
                    }}
                  >
                    {score}%
                  </div>

                  <span style={{ color: '#94a3b8', fontSize: '18px' }}>
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>

                {/* ── Expanded responses ── */}
                {isExpanded && (
                  <div
                    className="animate-slide-down"
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: '1px solid #e2e8f0',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p style={{ margin: '0 0 10px 0', fontWeight: 600, color: '#374151', fontSize: '14px' }}>
                      Responses:
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {attempt.responses?.map((r, i) => (
                        <div
                          key={i}
                          style={{
                            background: '#f8fafc',
                            borderRadius: 8,
                            padding: '10px 14px',
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          <div style={{ fontWeight: 500, fontSize: '14px', color: '#1e293b', marginBottom: '4px' }}>
                            {i + 1}. {r.question}
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            Answer:{' '}
                            <span style={{ color: '#374151', fontWeight: 500 }}>
                              {Array.isArray(r.answer) ? r.answer.join(', ') : r.answer ?? '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default AttemptHistory;
