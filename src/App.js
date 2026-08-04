// src/App.js
// Main application shell — handles auth state, routing, and layout.
// Quiz attempt logic has been moved to QuizAttempt.js and PublicQuizAttempt.js.
import React, { useState, useEffect } from 'react';
import './App.css';

import Auth from './Auth';
import QuizCreator from './QuizCreator';
import QuizList from './QuizList';
import AttemptHistory from './AttemptHistory';
import QuizAttempt from './QuizAttempt';
import PublicQuizAttempt from './PublicQuizAttempt';
import Footer from './components/Footer';

import { db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from 'firebase/auth';

function App() {
  const [user, setUser] = useState(null);
  const [attemptQuiz, setAttemptQuiz] = useState(null);
  const [publicQuiz, setPublicQuiz] = useState(null);

  // ── Auth persistence & user profile ──────────────────────────────────────

  useEffect(() => {
    const auth = getAuth();
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error('Failed to set auth persistence:', err);
    });

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          await setDoc(
            doc(db, 'users', firebaseUser.uid),
            {
              name: firebaseUser.displayName || 'Anonymous',
              email: firebaseUser.email,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch {
          // Silently skip if Firestore rules disallow this write
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // ── Hash-based router for public quiz links: #/quiz/{id} ──────────────────

  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash || '';
      const match = hash.match(/^#\/(?:quiz)\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        const quizId = match[1];
        try {
          const ref = doc(db, 'quizzes', quizId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = { id: quizId, ...snap.data() };
            setPublicQuiz(data.shareEnabled ? data : { disabled: true });
          } else {
            setPublicQuiz({ notFound: true });
          }
        } catch {
          setPublicQuiz({ error: true });
        }
      } else {
        setPublicQuiz(null);
      }
    };

    window.addEventListener('hashchange', handleHash);
    handleHash();
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const isVerified = user?.emailVerified;

  return (
    <div className="App">
      {/* ── Header ── */}
      <header
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px 0',
          boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
          marginBottom: '30px',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '800' }}>🎯 QuizMaster Pro</h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '15px' }}>
              Create, Share &amp; Take Quizzes
            </p>
          </div>
          {user && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 4px 0', fontSize: '13px', opacity: 0.85 }}>
                Welcome back!
              </p>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '15px' }}>{user.email}</p>
            </div>
          )}
        </div>
      </header>

      {/* ── Route Switching ── */}
      {publicQuiz ? (
        <PublicQuizAttempt
          quiz={publicQuiz}
          onBack={() => {
            window.location.hash = '';
            setPublicQuiz(null);
          }}
        />
      ) : !user ? (
        <Auth onAuth={setUser} />
      ) : !isVerified ? (
        <EmailVerificationBanner />
      ) : attemptQuiz ? (
        <QuizAttempt quiz={attemptQuiz} user={user} onBack={() => setAttemptQuiz(null)} />
      ) : (
        <Dashboard user={user} onAttempt={setAttemptQuiz} />
      )}

      <Footer />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function EmailVerificationBanner() {
  return (
    <div
      style={{
        maxWidth: 500,
        margin: '60px auto',
        padding: 32,
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        textAlign: 'center',
        border: '1px solid #e5e7eb',
      }}
    >
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
      <h2 style={{ color: '#e67e22', marginBottom: '16px' }}>Verify Your Email</h2>
      <p style={{ fontSize: 16, marginBottom: 16, color: '#374151', lineHeight: '1.6' }}>
        Please check your inbox and verify your email address to access quiz features.
      </p>
      <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>
        Refresh this page after verification.
      </p>
    </div>
  );
}

function Dashboard({ user, onAttempt }) {
  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
      {/* Dashboard header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '30px',
          padding: '20px 24px',
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 4px 0', color: '#1e293b', fontSize: '24px' }}>Dashboard</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>
            Manage your quizzes and track performance
          </p>
        </div>
        <button className="btn btn-danger" onClick={() => getAuth().signOut()}>
          🚪 Sign Out
        </button>
      </div>

      {/* Getting started guide */}
      <div
        style={{
          background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
          border: '1px solid #0ea5e9',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px',
        }}
      >
        <h3
          style={{
            margin: '0 0 16px 0',
            color: '#0369a1',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          🚀 Getting Started
        </h3>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {[
            { icon: '📝', step: '1. Create a Quiz', desc: 'Build your first quiz with multiple question types below.' },
            { icon: '🔗', step: '2. Share Your Quiz', desc: 'Generate a shareable link for others to take your quiz.' },
            { icon: '📊', step: '3. Track Results', desc: 'View detailed results and analytics for all attempts.' },
          ].map(({ icon, step, desc }) => (
            <div
              key={step}
              style={{
                background: 'white',
                padding: '16px',
                borderRadius: '10px',
                border: '1px solid #e0f2fe',
              }}
            >
              <div style={{ fontSize: '22px', marginBottom: '8px' }}>{icon}</div>
              <h4 style={{ margin: '0 0 6px 0', color: '#0c4a6e', fontSize: '15px' }}>{step}</h4>
              <p style={{ margin: 0, fontSize: '13px', color: '#64748b', lineHeight: '1.5' }}>
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      <QuizCreator user={user} />
      <QuizList user={user} onAttempt={onAttempt} />
      <AttemptHistory user={user} />
    </div>
  );
}

export default App;
