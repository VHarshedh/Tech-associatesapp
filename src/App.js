// src/App.js
// This is the main app component that handles the authentication and quiz functionality.
// It uses the Firebase Auth and Firestore services to manage user authentication and quiz data.
// The component is responsible for:
// 1. Handling user authentication
// 2. Displaying the appropriate UI based on the user's authentication state
// 3. Managing the state of the quiz attempt
// 4. Displaying the quiz questions and handling user answers
// 5. Submitting the quiz answers to the database
import React, { useState, useEffect } from 'react';
import './App.css';

import Auth from './Auth';
import QuizCreator from './QuizCreator';
import QuizList from './QuizList';
import AttemptHistory from './AttemptHistory';
import { collection, addDoc, getDoc } from 'firebase/firestore';
import { doc, setDoc } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged } from "firebase/auth";
 
// Ensure auth state is persisted across page reloads



function App() {
  const [user, setUser] = useState(null);
  const [attemptQuiz, setAttemptQuiz] = useState(null);
  const [publicQuiz, setPublicQuiz] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    // Set persistence once on mount (move from top-level to avoid top-level await errors)
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("Failed to set auth persistence:", err);
    });
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // ✅ Ensure Firestore user doc exists
        try {
          await setDoc(
            doc(db, "users", firebaseUser.uid),
            {
              name: firebaseUser.displayName || "Anonymous",
              email: firebaseUser.email,
              createdAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (e) {
          // Don't block app load if rules disallow this write
          console.warn("Skipping user profile write due to permissions:", e?.message || e);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const isVerified = user?.emailVerified;

  // Simple hash-based router for public quiz links: #/quiz/{id}
  useEffect(() => {
    const handleHash = async () => {
      const hash = window.location.hash || "";
      const match = hash.match(/^#\/(?:quiz)\/([A-Za-z0-9_-]+)/);
      if (match && match[1]) {
        const quizId = match[1];
        try {
          const ref = doc(db, "quizzes", quizId);
          const snap = await getDoc(ref);
          if (snap.exists()) {
            const data = { id: quizId, ...snap.data() };
            if (data.shareEnabled) {
              setPublicQuiz(data);
            } else {
              setPublicQuiz({ disabled: true });
            }
          } else {
            setPublicQuiz({ notFound: true });
          }
        } catch (e) {
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

  return (
    <div className="App">
      {/* Professional Header */}
      <header style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px 0',
        boxShadow: '0 2px 20px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
              🎯 QuizMaster Pro
            </h1>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
              Create, Share & Take Quizzes
            </p>
          </div>
          {user && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: '14px', opacity: 0.9 }}>
                Welcome back!
              </p>
              <p style={{ margin: 0, fontWeight: '600', fontSize: '16px' }}>
                {user.email}
              </p>
            </div>
          )}
        </div>
      </header>

      {publicQuiz ? (
        <PublicQuizAttempt quiz={publicQuiz} onBack={() => { window.location.hash = ''; setPublicQuiz(null); }} />
      ) : !user ? (
        <Auth onAuth={setUser} />
      ) : !isVerified ? (
        <div
          style={{
            maxWidth: 500,
            margin: "60px auto",
            padding: 32,
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
            textAlign: "center",
            border: '1px solid #e5e7eb'
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
          <h2 style={{ color: "#e67e22", marginBottom: '20px' }}>Verify Your Email</h2>
          <p style={{ fontSize: 17, marginBottom: 18, color: '#374151', lineHeight: '1.6' }}>
            Please check your inbox and verify your email address to access quiz features.
          </p>
          <p style={{ color: "#6b7280", fontSize: '15px' }}>
            Refresh this page after verification.
          </p>
        </div>
      ) : attemptQuiz ? (
        <QuizAttempt
          quiz={attemptQuiz}
          user={user}
          onBack={() => setAttemptQuiz(null)}
        />
      ) : (
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
          {/* User Dashboard Header */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '30px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            <div>
              <h2 style={{ margin: '0 0 8px 0', color: '#1e293b', fontSize: '24px' }}>
                Dashboard
              </h2>
              <p style={{ margin: 0, color: '#64748b', fontSize: '16px' }}>
                Manage your quizzes and track performance
              </p>
            </div>
            <button
              onClick={() => {
                const auth = getAuth();
                auth.signOut();
              }}
              style={{
                background: '#ef4444',
                color: '#fff',
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
              onMouseOver={(e) => {
                e.target.style.background = '#dc2626';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = '#ef4444';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              <span>🚪</span>
              Sign Out
            </button>
          </div>

          {/* Quick Start Guide for First Time Users */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #0ea5e9',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '30px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🚀</span>
              Getting Started
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e' }}>1. Create a Quiz</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                  Use the quiz creator below to build your first quiz with multiple question types.
                </p>
              </div>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>🔗</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e' }}>2. Share Your Quiz</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                  Generate a shareable link to let others take your quiz without logging in.
                </p>
              </div>
              <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '1px solid #e0f2fe' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📊</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e' }}>3. Track Results</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b' }}>
                  View detailed results and analytics for all quiz attempts.
                </p>
              </div>
            </div>
          </div>

          <QuizCreator user={user} />
          <QuizList user={user} onAttempt={setAttemptQuiz} />
          <AttemptHistory user={user} />
        </div>
      )}

      {/* Contact Footer */}
      <footer style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        padding: '40px 20px',
        marginTop: '60px',
        textAlign: 'center',
        borderTop: '1px solid #475569'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '10px'
            }}>
              🎯 QuizMaster Pro
            </div>
            <div style={{
              fontSize: '16px',
              opacity: 0.9,
              marginBottom: '20px'
            }}>
              Create, Share & Take Quizzes
            </div>
            
            {/* Contact Information */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: '400px',
              width: '100%'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '15px',
                color: '#fbbf24'
              }}>
                📞 Need Help?
              </div>
              <div style={{
                fontSize: '16px',
                marginBottom: '10px',
                opacity: 0.9
              }}>
                If you encounter any issues or need assistance, please contact us:
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#10b981',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                📱 Contact: 9363615853
              </div>
              <div style={{
                fontSize: '14px',
                opacity: 0.7,
                marginTop: '10px'
              }}>
                We're here to help you get the most out of your quiz experience!
              </div>
            </div>

            <div style={{
              fontSize: '14px',
              opacity: 0.6,
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              width: '100%'
            }}>
              © 2025 QuizMaster Pro. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


function QuizAttempt({ quiz, user, onBack }) {
  console.log("--- VERCEL QUIZ DATA ---");
  console.log("Received quiz object:", JSON.stringify(quiz, null, 2));
  if (quiz && quiz.questions && quiz.questions.length > 0) {
    console.log("First question:", quiz.questions[0]);
    console.log("Options of first question:", quiz.questions[0].options);
    console.log("Is it an array?", Array.isArray(quiz.questions[0].options));
  }
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.timed ? quiz.timerDuration * 60 : null);

  // Check if deadline has passed
  const isDeadlinePassed = () => {
    if (!quiz.deadline) return false;
    const deadline = quiz.deadline.toDate?.() || new Date(quiz.deadline);
    return new Date() > deadline;
  };

  // Check if timer has expired (for disabling inputs)
  const isTimerExpired = () => {
    return quiz.timed && timeLeft === 0;
  };

  // Calculate percentage score — now scoped to the component so it can use quiz + answers
  const getScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (q.type?.toUpperCase() === 'MCQ' || q.type?.toUpperCase() === 'NUMERICAL' || q.type?.toUpperCase() === 'SHORT ANSWER' || q.type?.toLowerCase() === 'multiple_choice') {
        if (
          answers[i] !== undefined &&
          String(answers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
        )
          correct++;
      } else if (q.type?.toUpperCase() === 'MSQ') {
        if (Array.isArray(q.answer) && Array.isArray(answers[i])) {
          const a1 = q.answer.map((a) => String(a).trim().toLowerCase()).sort();
          const a2 = answers[i].map((a) => String(a).trim().toLowerCase()).sort();
          if (JSON.stringify(a1) === JSON.stringify(a2)) correct++;
        }
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleChange = (qid, value) => {
    setAnswers((a) => ({ ...a, [qid]: value }));
  };

  // Function to save quiz attempt to Firestore
  const saveAttempt = async (submissionType = 'manual') => {
    try {
      const responses = quiz.questions.map((q, i) => ({
        question: q.question ?? "",
        answer: answers[i] ?? null, // replace undefined with null
      }));

      const attemptData = {
        userId: user.uid,
        email: user.email || null,
        quizId: quiz.id ?? quiz.quizId ?? "",
        quizTopic: quiz.topic ?? "Untitled",
        timestamp: serverTimestamp(),
        scorePercent: getScore() ?? 0,
        responses,
        submittedBy: submissionType, // Indicate submission type
        timeRemaining: timeLeft, // Store remaining time when submitted
      };

      await addDoc(collection(db, 'attempts'), attemptData);
      console.log('Quiz attempt saved successfully');
    } catch (err) {
      console.error('Failed to save attempt:', err);
      // Optionally show error to user
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if deadline has passed
    if (isDeadlinePassed()) {
      alert("This quiz is no longer available. The deadline has passed.");
      return;
    }
    
    setSubmitted(true);

    // Save attempt to Firestore
    await saveAttempt('manual');
  };

  useEffect(() => {
    if (!quiz.timed || submitted) return;
    if (timeLeft === 0) {
      // Don't auto-submit, just disable answer changes
      // User can still submit manually
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz.timed, submitted, timeLeft]);

  return (
    <div
      style={{
        maxWidth: 800,
        margin: '40px auto',
        padding: 0,
        borderRadius: 20,
        background: '#ffffff',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        fontFamily: 'Segoe UI, Arial, sans-serif',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}
    >
      {/* Quiz Header */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '30px',
        textAlign: 'center',
        position: 'relative'
      }}>
        <button
          onClick={onBack}
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 16px',
            cursor: 'pointer',
            fontWeight: '500',
            color: 'white',
            fontSize: '14px',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.3)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
        >
          <span>←</span>
          Back
        </button>
        
        <h1 style={{ margin: '0 0 10px 0', fontSize: '32px', fontWeight: '700' }}>
          {quiz.topic}
        </h1>
        
        <p style={{ margin: '0 0 20px 0', opacity: 0.9, fontSize: '16px' }}>
          Complete this quiz to test your knowledge
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '30px', marginTop: '20px' }}>
          {quiz.deadline && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Deadline</div>
              <div style={{ fontWeight: '600' }}>
                {quiz.deadline.toDate?.() ? quiz.deadline.toDate().toLocaleString() : new Date(quiz.deadline).toLocaleString()}
              </div>
            </div>
          )}
          {quiz.timed && !submitted && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '5px' }}>Time Limit</div>
              <div style={{ fontWeight: '600', fontSize: '18px' }}>
                {Math.floor(quiz.timerDuration)} minutes
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quiz Content */}
      <div style={{ padding: '40px' }}>
        {isDeadlinePassed() && (
          <div style={{ 
            marginBottom: '30px', 
            padding: '24px', 
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', 
            border: '1px solid #fecaca', 
            borderRadius: '16px',
            color: '#dc2626',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <span style={{ fontSize: '24px' }}>⏰</span>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', color: '#dc2626' }}>
                Quiz Deadline Expired
              </h4>
              <p style={{ margin: '0', fontSize: '15px', opacity: 0.9, lineHeight: '1.5' }}>
                This quiz is no longer available for attempts. The deadline has passed.
              </p>
            </div>
          </div>
        )}

        {quiz.timed && !submitted && (
          <div style={{
            background: timeLeft === 0 
              ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
              : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
            border: timeLeft === 0 ? '1px solid #fecaca' : '1px solid #fbbf24',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '30px',
            textAlign: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '12px' }}>
              <span style={{ fontSize: '24px' }}>{timeLeft === 0 ? '⏰' : '⏱️'}</span>
              <h3 style={{ 
                margin: 0, 
                color: timeLeft === 0 ? '#dc2626' : '#92400e', 
                fontSize: '18px' 
              }}>
                {timeLeft === 0 ? 'Time Expired' : 'Time Remaining'}
              </h3>
            </div>
            {timeLeft > 0 ? (
              <>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700', 
                  color: '#92400e',
                  fontFamily: 'monospace',
                  background: 'white',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  border: '1px solid #fbbf24',
                  boxShadow: '0 2px 8px rgba(251, 191, 36, 0.2)'
                }}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <p style={{ margin: '12px 0 0 0', color: '#92400e', fontSize: '14px', opacity: 0.8 }}>
                  Make sure to submit your quiz before time runs out!
                </p>
              </>
            ) : (
              <>
                <div style={{ 
                  fontSize: '32px', 
                  fontWeight: '700', 
                  color: '#dc2626',
                  fontFamily: 'monospace',
                  background: 'white',
                  padding: '16px 24px',
                  borderRadius: '12px',
                  display: 'inline-block',
                  border: '1px solid #fecaca',
                  boxShadow: '0 2px 8px rgba(220, 38, 38, 0.2)'
                }}>
                  00:00
                </div>
                <p style={{ margin: '12px 0 0 0', color: '#dc2626', fontSize: '14px', opacity: 0.8 }}>
                  Time's up! You can still submit your quiz, but you cannot change your answers.
                </p>
              </>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '30px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, color: '#1e293b', fontSize: '18px' }}>Quiz Progress</h3>
            <span style={{ 
              background: '#3b82f6', 
              color: 'white', 
              padding: '6px 12px', 
              borderRadius: '20px', 
              fontSize: '14px', 
              fontWeight: '600' 
            }}>
              {Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '' && answers[key] !== null).length} of {quiz.questions.length} answered
            </span>
          </div>
          <div style={{ 
            width: '100%', 
            height: '8px', 
            background: '#e2e8f0', 
            borderRadius: '4px',
            overflow: 'hidden'
          }}>
            <div style={{
              width: `${(Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '' && answers[key] !== null).length / quiz.questions.length) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)',
              borderRadius: '4px',
              transition: 'width 0.3s ease'
            }}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {quiz.questions.map((q, i) => (
            <div
              key={i}
              style={{
                marginBottom: '32px',
                background: '#ffffff',
                borderRadius: '16px',
                boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                padding: '30px',
                border: '1px solid #f1f5f9',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.target.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'}
              onMouseOut={(e) => e.target.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'}
            >
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '16px',
                  fontWeight: '700',
                  flexShrink: 0,
                  boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: '18px', 
                    marginBottom: '12px', 
                    color: '#1e293b', 
                    lineHeight: '1.6' 
                  }}>
                    {q.question}
                  </div>
                  {q.type && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        display: 'inline-block',
                        background: '#e0f2fe',
                        color: '#0369a1',
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '12px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {q.type}
                      </span>
                                             <span style={{ fontSize: '14px', color: '#64748b' }}>
                         {q.type?.toUpperCase() === 'MCQ' && 'Select one answer'}
                         {q.type?.toUpperCase() === 'MSQ' && 'Select multiple answers'}
                         {(q.type === 'Short Answer' || q.type === 'short_answer' || q.type?.toLowerCase() === 'short_answer') && 'Provide a detailed answer'}
                         {(q.type === 'Numerical' || q.type?.toLowerCase() === 'numerical' || q.type?.toLowerCase() === 'number') && 'Enter a number'}
                       </span>
                    </div>
                  )}
                </div>
              </div>

            {(q.type?.toUpperCase() === 'MCQ' || q.type?.toLowerCase() === 'multiple_choice') && q.options && Array.isArray(q.options) && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, idx) => (
                  <label key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    fontSize: 16, 
                    background: '#f8fafc', 
                    borderRadius: 8, 
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    cursor: (submitted || isDeadlinePassed() || isTimerExpired()) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!isTimerExpired() && !submitted && !isDeadlinePassed()) {
                      e.target.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isTimerExpired() && !submitted && !isDeadlinePassed()) {
                      e.target.style.background = '#f8fafc';
                    }
                  }}
                  >
                    <input
                      type="radio"
                      name={`mcq-${i}`}
                      value={opt}
                      checked={answers[i] === opt}
                      disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                      onChange={() => handleChange(i, opt)}
                      style={{ margin: 0 }}
                    />
                    <span style={{ color: '#1e293b' }}>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {q.type?.toUpperCase() === 'MSQ' && q.options && Array.isArray(q.options) && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, idx) => (
                  <label key={idx} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    fontSize: 16, 
                    background: '#f8fafc', 
                    borderRadius: 8, 
                    padding: '12px 16px',
                    border: '1px solid #e2e8f0',
                    cursor: (submitted || isDeadlinePassed() || isTimerExpired()) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    if (!isTimerExpired() && !submitted && !isDeadlinePassed()) {
                      e.target.style.background = '#f1f5f9';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isTimerExpired() && !submitted && !isDeadlinePassed()) {
                      e.target.style.background = '#f8fafc';
                    }
                  }}
                  >
                    <input
                      type="checkbox"
                      name={`msq-${i}`}
                      checked={answers[i]?.includes(opt) || false}
                      disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                      onChange={(e) => {
                        let arr = answers[i] || [];
                        if (e.target.checked) arr = [...arr, opt];
                        else arr = arr.filter((o) => o !== opt);
                        handleChange(i, arr);
                      }}
                      style={{ margin: 0 }}
                    />
                    <span style={{ color: '#1e293b' }}>{opt}</span>
                  </label>
                ))}
              </div>
            )}



            {(q.type === 'Short Answer' || q.type?.toLowerCase() === 'short answer' || q.type?.toLowerCase() === 'shortanswer' || q.type === 'short_answer' || q.type?.toLowerCase() === 'short_answer') && (
              <div style={{ marginTop: 10 }}>
                <textarea
                  value={answers[i] || ''}
                  disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="Type your answer here..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isTimerExpired() ? '2px solid #fbbf24' : '2px solid #3b82f6',
                    fontSize: '16px',
                    background: isTimerExpired() ? '#fef3c7' : '#ffffff',
                    resize: 'vertical',
                    minHeight: '120px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    boxShadow: isTimerExpired() ? '0 2px 8px rgba(251, 191, 36, 0.2)' : '0 2px 8px rgba(59, 130, 246, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
            )}

            {(q.type === 'Numerical' || q.type?.toLowerCase() === 'numerical' || q.type?.toLowerCase() === 'number') && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="number"
                  value={answers[i] || ''}
                  disabled={submitted || isDeadlinePassed() || isTimerExpired()}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="Enter number..."
                  style={{
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: isTimerExpired() ? '2px solid #fbbf24' : '2px solid #8b5cf6',
                    fontSize: '16px',
                    background: isTimerExpired() ? '#fef3c7' : '#ffffff',
                    boxShadow: isTimerExpired() ? '0 2px 8px rgba(251, 191, 36, 0.2)' : '0 2px 8px rgba(139, 92, 246, 0.1)',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
            )}

            {submitted && (
              <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                background: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: '12px',
                color: '#166534'
              }}>
                <strong>Correct Answer:</strong>{' '}
                {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
              </div>
            )}
          </div>
        ))}

        {!submitted && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            {/* Pre-submission Summary */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              maxWidth: '500px',
              margin: '0 auto 24px auto'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
                📝 Ready to Submit?
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Questions Answered:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '' && answers[key] !== null).length} / {quiz.questions.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Time Status:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {quiz.timed ? (
                    timeLeft > 0 
                      ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')} remaining`
                      : 'Time expired'
                  ) : 'No time limit'}
                </span>
              </div>
              {isTimerExpired() && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '14px',
                  fontStyle: 'italic'
                }}>
                  ⏰ Time has expired. You can submit your current answers, but cannot change them.
                </div>
              )}
              <p style={{ margin: '16px 0 0 0', fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                Please review your answers before submitting. You won't be able to change them after submission.
              </p>
            </div>

            <button
              type="submit"
              disabled={isDeadlinePassed()}
              style={{
                background: isDeadlinePassed() ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '18px 36px',
                border: 'none',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: isDeadlinePassed() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isDeadlinePassed() ? 'none' : '0 6px 20px rgba(102, 126, 234, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!isDeadlinePassed()) {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!isDeadlinePassed()) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {isDeadlinePassed() ? (
                <>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>⏰</span>
                  Quiz Expired
                </>
              ) : isTimerExpired() ? (
                <>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>🚀</span>
                  Submit Quiz (Time Expired)
                </>
              ) : (
                <>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>🚀</span>
                  Submit Quiz
                </>
              )}
            </button>
          </div>
        )}
        </form>

        {submitted && (
          <div style={{ 
            marginTop: '40px', 
            padding: '0',
            textAlign: 'center'
          }}>
            {/* Success Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #bbf7d0',
              borderRadius: '20px',
              padding: '32px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
              <h2 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '28px', fontWeight: '700' }}>
                Quiz Completed Successfully!
              </h2>
              <p style={{ margin: '0 0 24px 0', color: '#166534', fontSize: '18px', lineHeight: '1.6' }}>
                Great job! You've completed the quiz. Here's how you performed:
              </p>
              
              {/* Score Display */}
              <div style={{ 
                background: '#ffffff', 
                padding: '24px', 
                borderRadius: '16px', 
                display: 'inline-block',
                border: '1px solid #bbf7d0',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{ fontSize: '16px', color: '#166534', marginBottom: '12px', fontWeight: '600' }}>
                  Your Final Score
                </div>
                <div style={{ fontSize: '48px', fontWeight: '800', color: '#166534', marginBottom: '8px' }}>
                  {getScore()}%
                </div>
                <div style={{ fontSize: '14px', color: '#166534', opacity: 0.8 }}>
                  {getScore() >= 90 ? 'Outstanding Performance! 🌟' :
                   getScore() >= 80 ? 'Excellent Work! 🎯' :
                   getScore() >= 70 ? 'Good Job! 👍' :
                   getScore() >= 60 ? 'Well Done! ✅' :
                   getScore() >= 50 ? 'Keep Learning! 📚' : 'Keep Practicing! 💪'}
                </div>
              </div>
            </div>

            {/* Performance Insights */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              maxWidth: '600px',
              margin: '0 auto 24px auto'
            }}>
              <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📊</span>
                Performance Summary
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {quiz.questions.length}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Total Questions</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {Math.round((getScore() / 100) * quiz.questions.length)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Correct Answers</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                    {quiz.timed ? `${Math.floor((quiz.timerDuration * 60 - timeLeft) / 60)}:${((quiz.timerDuration * 60 - timeLeft) % 60).toString().padStart(2, '0')}` : 'N/A'}
                  </div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Time Taken</div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #0ea5e9',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <h3 style={{ margin: '0 0 16px 0', color: '#0369a1', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>🚀</span>
                What's Next?
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔍</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '16px' }}>Review Answers</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                    Scroll up to see which questions you got right and wrong.
                  </p>
                </div>
                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>📚</div>
                  <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '16px' }}>Learn & Improve</h4>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                    Use the correct answers to understand where you can improve.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {quiz.timed && submitted && (
          <div style={{ 
            marginTop: '20px', 
            padding: '16px', 
            background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
            border: '1px solid #fbbf24', 
            borderRadius: '12px',
            color: '#92400e',
            textAlign: 'center',
            fontWeight: '500'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '20px' }}>⏱️</span>
              <strong>Timer Expired</strong>
            </div>
            <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
              The quiz timer has ended. Your answers were submitted before the timer expired.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

function PublicQuizAttempt({ quiz, onBack }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [participantName, setParticipantName] = useState("");
  const [score, setScore] = useState(0);
  const [user, setUser] = useState(null);
  const [timeLeft, setTimeLeft] = useState(quiz.timed ? quiz.timerDuration * 60 : null);

  // Check if deadline has passed
  const isDeadlinePassed = () => {
    if (!quiz.deadline) return false;
    const deadline = quiz.deadline.toDate?.() || new Date(quiz.deadline);
    return new Date() > deadline;
  };

  // Check if user is logged in
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Timer countdown effect
  useEffect(() => {
    if (!quiz.timed || submitted) return;
    if (timeLeft === 0) {
      // Don't auto-submit, just disable answer changes
      // User can still submit manually
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz.timed, submitted, timeLeft]);

  // Check if timer has expired (for disabling inputs)
  const isTimerExpired = () => {
    return quiz.timed && timeLeft === 0;
  };

  if (quiz?.notFound) {
    return (
      <div style={{ 
        maxWidth: 600, 
        margin: '40px auto', 
        padding: '40px',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
        <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '28px', fontWeight: '700' }}>
          Quiz Not Found
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
          The quiz you're looking for doesn't exist or may have been removed.
        </p>
        <button 
          onClick={onBack}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }
  
  if (quiz?.disabled) {
    return (
      <div style={{ 
        maxWidth: 600, 
        margin: '40px auto', 
        padding: '40px',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
        <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '28px', fontWeight: '700' }}>
          Quiz Not Available
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
          This quiz is not available for public attempts. Please contact the quiz creator for access.
        </p>
        <button 
          onClick={onBack}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }
  
  if (quiz?.error) {
    return (
      <div style={{ 
        maxWidth: 600, 
        margin: '40px auto', 
        padding: '40px',
        textAlign: 'center',
        background: '#ffffff',
        borderRadius: '20px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>⚠️</div>
        <h2 style={{ color: '#1e293b', marginBottom: '16px', fontSize: '28px', fontWeight: '700' }}>
          Failed to Load Quiz
        </h2>
        <p style={{ color: '#64748b', marginBottom: '24px', fontSize: '16px', lineHeight: '1.6' }}>
          There was an error loading the quiz. Please try again or contact support.
        </p>
        <button 
          onClick={onBack}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: '#fff',
            padding: '12px 24px',
            border: 'none',
            borderRadius: '12px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)'
          }}
          onMouseOver={(e) => {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)';
          }}
          onMouseOut={(e) => {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
          }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  const getScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      // Handle MCQ questions (including multiple_choice from existing quizzes)
      if (q.type?.toUpperCase() === 'MCQ' || q.type?.toLowerCase() === 'multiple_choice') {
        if (
          answers[i] !== undefined &&
          answers[i] !== null &&
          answers[i] !== '' &&
          String(answers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
        ) {
          correct++;
        }
      }
      // Handle MSQ questions
      else if (q.type?.toUpperCase() === 'MSQ') {
        if (Array.isArray(q.answer) && Array.isArray(answers[i])) {
          const a1 = q.answer.map((a) => String(a).trim().toLowerCase()).sort();
          const a2 = answers[i].map((a) => String(a).trim().toLowerCase()).sort();
          if (JSON.stringify(a1) === JSON.stringify(a2)) correct++;
        }
      }
      // Handle Numerical questions
      else if (q.type?.toLowerCase() === 'numerical' || q.type?.toLowerCase() === 'number') {
        if (
          answers[i] !== undefined &&
          answers[i] !== null &&
          answers[i] !== '' &&
          String(answers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
        ) {
          correct++;
        }
      }
      // Handle Short Answer questions
      else if (q.type?.toLowerCase() === 'short answer' || 
               q.type?.toLowerCase() === 'shortanswer' || 
               q.type === 'short_answer' || 
               q.type?.toLowerCase() === 'short_answer') {
        if (
          answers[i] !== undefined &&
          answers[i] !== null &&
          answers[i] !== '' &&
          String(answers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
        ) {
          correct++;
        }
      }

    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if deadline has passed
    if (isDeadlinePassed()) {
      alert("This quiz is no longer available. The deadline has passed.");
      return;
    }
    
    // Debug scoring
    console.log("=== SCORING DEBUG ===");
    console.log("Quiz questions:", quiz.questions);
    console.log("User answers:", answers);
    quiz.questions.forEach((q, i) => {
      const userAnswer = answers[i];
      const correctAnswer = q.answer;
      let isCorrect = false;
      
      if (q.type?.toUpperCase() === 'MCQ' || q.type?.toLowerCase() === 'multiple_choice') {
        isCorrect = userAnswer !== undefined && 
                   userAnswer !== null && 
                   userAnswer !== '' && 
                   String(userAnswer).trim().toLowerCase() === String(correctAnswer).trim().toLowerCase();
        console.log(`Question ${i + 1} (MCQ):`, {
          type: q.type,
          question: q.question,
          correctAnswer: correctAnswer,
          userAnswer: userAnswer,
          isCorrect: isCorrect,
          comparison: `${String(userAnswer || '').trim().toLowerCase()} === ${String(correctAnswer || '').trim().toLowerCase()}`
        });
      } else if (q.type?.toUpperCase() === 'MSQ') {
        // MSQ logic
        isCorrect = Array.isArray(correctAnswer) && Array.isArray(userAnswer);
        console.log(`Question ${i + 1} (MSQ):`, {
          type: q.type,
          question: q.question,
          correctAnswer: correctAnswer,
          userAnswer: userAnswer,
          isCorrect: isCorrect
        });
      } else {
        // Other question types
        isCorrect = String(userAnswer || '').trim().toLowerCase() === String(correctAnswer || '').trim().toLowerCase();
        console.log(`Question ${i + 1} (${q.type}):`, {
          type: q.type,
          question: q.question,
          correctAnswer: correctAnswer,
          userAnswer: userAnswer,
          isCorrect: isCorrect
        });
      }
    });
    
    const scorePercent = getScore();
    console.log("Final score:", scorePercent + "%");
    setScore(scorePercent);
    setSubmitted(true);
    
    console.log("Submit attempt - User state:", user ? "Logged in" : "Anonymous");
    console.log("User UID:", user?.uid);
    console.log("Quiz owner UID:", quiz.userId);
    
    try {
      const responses = quiz.questions.map((q, i) => ({
        question: q.question ?? "",
        answer: answers[i] ?? null,
      }));

      if (user) {
        // Logged in user - save to attempts collection
        console.log("Saving to 'attempts' collection for logged-in user");
        const attemptData = {
          userId: user.uid,
          email: user.email || null,
          quizId: quiz.id,
          quizTopic: quiz.topic ?? "Untitled",
          timestamp: serverTimestamp(),
          scorePercent,
          responses,
        };
        await addDoc(collection(db, 'attempts'), attemptData);
      } else {
        // Anonymous user - save to publicAttempts collection
        console.log("Saving to 'publicAttempts' collection for anonymous user");
        const attemptData = {
          ownerId: quiz.userId,
          quizId: quiz.id,
          quizTopic: quiz.topic ?? "Untitled",
          participantName: participantName || "Anonymous",
          timestamp: serverTimestamp(),
          scorePercent,
          responses,
        };
        await addDoc(collection(db, 'publicAttempts'), attemptData);
      }
    } catch (err) {
      console.error('Failed to save attempt:', err);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '40px auto',
        padding: 32,
        borderRadius: 16,
        background: '#f9f9f9',
        boxShadow: '0 2px 24px rgba(0,0,0,0.10)',
        fontFamily: 'Segoe UI, Arial, sans-serif',
      }}
    >
      <button
        onClick={onBack}
        style={{
          marginBottom: 16,
          background: '#eee',
          border: 'none',
          borderRadius: 6,
          padding: '8px 16px',
          cursor: 'pointer',
          fontWeight: 500,
        }}
      >
        Back
      </button>

      <h2 style={{ color: '#2c3e50' }}>{quiz.topic}</h2>

      {isDeadlinePassed() && (
        <div style={{ 
          marginBottom: 16, 
          padding: 12, 
          background: '#fdf2f2', 
          border: '1px solid #fecaca', 
          borderRadius: 6,
          color: '#dc2626',
          fontWeight: 500
        }}>
          ⚠️ This quiz is no longer available. The deadline has passed.
        </div>
      )}

      {quiz.timed && !submitted && (
        <div style={{
          background: timeLeft === 0 
            ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)' 
            : 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: timeLeft === 0 ? '1px solid #fecaca' : '1px solid #fbbf24',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>{timeLeft === 0 ? '⏰' : '⏱️'}</span>
            <h3 style={{ 
              margin: 0, 
              color: timeLeft === 0 ? '#dc2626' : '#92400e', 
              fontSize: '16px' 
            }}>
              {timeLeft === 0 ? 'Time Expired' : 'Time Remaining'}
            </h3>
          </div>
          {timeLeft > 0 ? (
            <>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#92400e',
                fontFamily: 'monospace',
                background: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                display: 'inline-block',
                border: '1px solid #fbbf24',
                boxShadow: '0 2px 6px rgba(251, 191, 36, 0.2)'
              }}>
                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <p style={{ margin: '8px 0 0 0', color: '#92400e', fontSize: '13px', opacity: 0.8 }}>
                Submit your quiz before time runs out!
              </p>
            </>
          ) : (
            <>
              <div style={{ 
                fontSize: '24px', 
                fontWeight: '700', 
                color: '#dc2626',
                fontFamily: 'monospace',
                background: 'white',
                padding: '12px 20px',
                borderRadius: '8px',
                display: 'inline-block',
                border: '1px solid #fecaca',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.2)'
              }}>
                00:00
              </div>
              <p style={{ margin: '8px 0 0 0', color: '#dc2626', fontSize: '13px', opacity: 0.8 }}>
                Time's up! You can still submit, but cannot change answers.
              </p>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        {!user && (
          <div style={{ 
            marginBottom: '30px',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #0ea5e9',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{ 
              margin: '0 0 16px 0', 
              color: '#0369a1', 
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span>👋</span>
              Welcome! Please introduce yourself
            </h3>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ 
                  display: 'block',
                  fontWeight: '600', 
                  color: '#0c4a6e',
                  marginBottom: '8px',
                  fontSize: '14px'
                }}>
                  Your Name
                </label>
                <input
                  type="text"
                  value={participantName}
                  onChange={(e) => setParticipantName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #0ea5e9',
                    fontSize: '16px',
                    background: '#ffffff',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 1px 3px rgba(14, 165, 233, 0.1)'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0284c7';
                    e.target.style.boxShadow = '0 0 0 3px rgba(14, 165, 233, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#0ea5e9';
                    e.target.style.boxShadow = '0 1px 3px rgba(14, 165, 233, 0.1)';
                  }}
                />
                <div style={{ 
                  marginTop: '12px',
                  background: '#ffffff',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #e0f2fe',
                  fontSize: '14px',
                  color: '#64748b'
                }}>
                  <strong>Anonymous users</strong> can take this quiz without creating an account.
                </div>
              </div>
            </div>
          </div>
        )}

        {quiz.questions.map((q, i) => (
          <div
            key={i}
            style={{
              marginBottom: 28,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
              padding: 20,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}>
              {i + 1}. {q.question}
              {q.type && (
                <span style={{ marginLeft: 10, color: '#2980b9', fontSize: 13 }}>
                  [{q.type}]
                </span>
              )}
            </div>

            {(q.type?.toUpperCase() === 'MCQ' || q.type?.toLowerCase() === 'multiple_choice') && q.options && Array.isArray(q.options) && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, background: '#f4f8fb', borderRadius: 6, padding: '6px 12px' }}>
                    <input
                      type="radio"
                      name={`mcq-${i}`}
                      value={opt}
                      checked={answers[i] === opt}
                      disabled={isDeadlinePassed() || isTimerExpired()}
                      onChange={() => setAnswers((a) => ({ ...a, [i]: opt }))}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type?.toUpperCase() === 'MSQ' && q.options && Array.isArray(q.options) && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, background: '#f4f8fb', borderRadius: 6, padding: '6px 12px' }}>
                    <input
                      type="checkbox"
                      name={`msq-${i}`}
                      checked={answers[i]?.includes(opt) || false}
                      disabled={isDeadlinePassed() || isTimerExpired()}
                      onChange={(e) => {
                        let arr = answers[i] || [];
                        if (e.target.checked) arr = [...arr, opt];
                        else arr = arr.filter((o) => o !== opt);
                        setAnswers((a) => ({ ...a, [i]: arr }));
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}



            {(q.type === 'Short Answer' || q.type?.toLowerCase() === 'short answer' || q.type?.toLowerCase() === 'shortanswer' || q.type === 'short_answer' || q.type?.toLowerCase() === 'short_answer') && (
              <div style={{ marginTop: 10 }}>
                <textarea
                  value={answers[i] || ''}
                  disabled={isDeadlinePassed() || isTimerExpired()}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder="Type your answer here..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 8,
                    border: '2px solid #3b82f6',
                    fontSize: 16,
                    background: '#ffffff',
                    resize: 'vertical',
                    minHeight: '100px',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  }}
                />
              </div>
            )}

            {(q.type === 'Numerical' || q.type?.toLowerCase() === 'numerical' || q.type?.toLowerCase() === 'number') && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="number"
                  value={answers[i] || ''}
                  disabled={isDeadlinePassed() || isTimerExpired()}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder="Enter number..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #dbeafe',
                    fontSize: 16,
                    background: '#fff',
                  }}
                />
              </div>
            )}

            {/* Show correct answers after submission */}
            {submitted && (
              <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                background: '#f0fdf4', 
                border: '1px solid #bbf7d0', 
                borderRadius: '12px',
                color: '#166534'
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '8px',
                  fontWeight: '600'
                }}>
                  <span style={{ fontSize: '16px' }}>✅</span>
                  <span>Correct Answer:</span>
                </div>
                <div style={{ 
                  fontSize: '16px', 
                  fontWeight: '500',
                  padding: '8px 12px',
                  background: '#ffffff',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
                </div>
                {answers[i] && (
                  <div style={{ 
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: answers[i] === q.answer || 
                      (Array.isArray(q.answer) && Array.isArray(answers[i]) && 
                       JSON.stringify(q.answer.map(a => String(a).trim().toLowerCase()).sort()) === 
                       JSON.stringify(answers[i].map(a => String(a).trim().toLowerCase()).sort())) ||
                      (q.answer && answers[i] && 
                       String(q.answer).trim().toLowerCase() === String(answers[i]).trim().toLowerCase())
                        ? '#f0fdf4' : '#fef2f2',
                    border: answers[i] === q.answer || 
                      (Array.isArray(q.answer) && Array.isArray(answers[i]) && 
                       JSON.stringify(q.answer.map(a => String(a).trim().toLowerCase()).sort()) === 
                       JSON.stringify(answers[i].map(a => String(a).trim().toLowerCase()).sort())) ||
                      (q.answer && answers[i] && 
                       String(q.answer).trim().toLowerCase() === String(answers[i]).trim().toLowerCase())
                        ? '1px solid #bbf7d0' : '1px solid #fecaca',
                    borderRadius: '8px',
                    color: answers[i] === q.answer || 
                      (Array.isArray(q.answer) && Array.isArray(answers[i]) && 
                       JSON.stringify(q.answer.map(a => String(a).trim().toLowerCase()).sort()) === 
                       JSON.stringify(answers[i].map(a => String(a).trim().toLowerCase()).sort())) ||
                      (q.answer && answers[i] && 
                       String(q.answer).trim().toLowerCase() === String(answers[i]).trim().toLowerCase())
                        ? '#166534' : '#dc2626'
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px', 
                      marginBottom: '4px',
                      fontWeight: '600'
                    }}>
                      <span style={{ fontSize: '14px' }}>
                        {answers[i] === q.answer || 
                          (Array.isArray(q.answer) && Array.isArray(answers[i]) && 
                           JSON.stringify(q.answer.map(a => String(a).trim().toLowerCase()).sort()) === 
                           JSON.stringify(answers[i].map(a => String(a).trim().toLowerCase()).sort())) ||
                          (q.answer && answers[i] && 
                           String(q.answer).trim().toLowerCase() === String(answers[i]).trim().toLowerCase())
                            ? '🎯' : '❌'}
                      </span>
                      <span>Your Answer:</span>
                    </div>
                    <div style={{ fontSize: '15px' }}>
                      {Array.isArray(answers[i]) ? answers[i].join(', ') : answers[i]}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {!submitted && (
          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            {/* Pre-submission Summary */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '16px',
              padding: '24px',
              marginBottom: '24px',
              maxWidth: '500px',
              margin: '0 auto 24px auto'
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '18px' }}>
                📝 Ready to Submit?
              </h4>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Questions Answered:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {Object.keys(answers).filter(key => answers[key] !== undefined && answers[key] !== '' && answers[key] !== null).length} / {quiz.questions.length}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Time Status:</span>
                <span style={{ fontWeight: '600', color: '#1e293b' }}>
                  {quiz.timed ? (
                    timeLeft > 0 
                      ? `${Math.floor(timeLeft / 60)}:${(timeLeft % 60).toString().padStart(2, '0')} remaining`
                      : 'Time expired'
                  ) : 'No time limit'}
                </span>
              </div>
              {isTimerExpired() && (
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '8px',
                  color: '#dc2626',
                  fontSize: '14px',
                  fontStyle: 'italic'
                }}>
                  ⏰ Time has expired. You can submit your current answers, but cannot change them.
                </div>
              )}
              <p style={{ margin: '16px 0 0 0', fontSize: '14px', color: '#64748b', fontStyle: 'italic' }}>
                Please review your answers before submitting. You won't be able to change them after submission.
              </p>
            </div>

            <button
              type="submit"
              disabled={isDeadlinePassed()}
              style={{
                background: isDeadlinePassed() ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                padding: '18px 36px',
                border: 'none',
                borderRadius: '16px',
                fontSize: '18px',
                fontWeight: '600',
                cursor: isDeadlinePassed() ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: isDeadlinePassed() ? 'none' : '0 6px 20px rgba(102, 126, 234, 0.3)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseOver={(e) => {
                if (!isDeadlinePassed()) {
                  e.target.style.transform = 'translateY(-3px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseOut={(e) => {
                if (!isDeadlinePassed()) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.3)';
                }
              }}
            >
              {isDeadlinePassed() ? (
                <>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>⏰</span>
                  Quiz Expired
                </>
              ) : isTimerExpired() ? (
                <>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>🚀</span>
                  Submit Quiz (Time Expired)
                </>
              ) : (
                <>
                  <span style={{ fontSize: '20px', marginRight: '8px' }}>🚀</span>
                  Submit Quiz
                </>
              )}
            </button>
          </div>
        )}
      </form>

      {submitted && (
        <div style={{ 
          marginTop: '40px', 
          padding: '0',
          textAlign: 'center'
        }}>
          {/* Success Header */}
          <div style={{ 
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ margin: '0 0 16px 0', color: '#166534', fontSize: '28px', fontWeight: '700' }}>
              Quiz Completed Successfully!
            </h2>
            <p style={{ margin: '0 0 24px 0', color: '#166534', fontSize: '18px', lineHeight: '1.6' }}>
              Great job! You've completed the quiz. Here's how you performed:
            </p>
            
            {/* Score Display */}
            <div style={{ 
              background: '#ffffff', 
              padding: '24px', 
              borderRadius: '16px', 
              display: 'inline-block',
              border: '1px solid #bbf7d0',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)'
            }}>
              <div style={{ fontSize: '16px', color: '#166534', marginBottom: '12px', fontWeight: '600' }}>
                Your Final Score
              </div>
              <div style={{ fontSize: '48px', fontWeight: '800', color: '#166534', marginBottom: '8px' }}>
                {score}%
              </div>
              <div style={{ fontSize: '14px', color: '#166534', opacity: 0.8 }}>
                {score >= 90 ? 'Outstanding Performance! 🌟' :
                 score >= 80 ? 'Excellent Work! 🎯' :
                 score >= 70 ? 'Good Job! 👍' :
                 score >= 60 ? 'Well Done! ✅' :
                 score >= 50 ? 'Keep Learning! 📚' : 'Keep Practicing! 💪'}
              </div>
            </div>
          </div>

          {/* Performance Insights */}
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '16px',
            padding: '24px',
            marginBottom: '24px',
            maxWidth: '600px',
            margin: '0 auto 24px auto'
          }}>
            <h3 style={{ margin: '0 0 20px 0', color: '#1e293b', fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>📊</span>
              Performance Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>📝</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  {quiz.questions.length}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Total Questions</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>✅</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  {Math.round((score / 100) * quiz.questions.length)}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Correct Answers</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>⏱️</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#1e293b', marginBottom: '4px' }}>
                  {quiz.timed ? `${Math.floor((quiz.timerDuration * 60 - timeLeft) / 60)}:${((quiz.timerDuration * 60 - timeLeft) % 60).toString().padStart(2, '0')}` : 'N/A'}
                </div>
                <div style={{ fontSize: '14px', color: '#64748b' }}>Time Taken</div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div style={{
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            border: '1px solid #0ea5e9',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <h3 style={{ margin: '0 0 16px 0', color: '#0369a1', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🚀</span>
              What's Next?
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>🔍</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '16px' }}>Review Answers</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                  Scroll up to see which questions you got right and wrong.
                </p>
              </div>
              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #e0f2fe' }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>📚</div>
                <h4 style={{ margin: '0 0 8px 0', color: '#0c4a6e', fontSize: '16px' }}>Learn & Improve</h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#64748b', lineHeight: '1.5' }}>
                  Use the correct answers to understand where you can improve.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {quiz.timed && submitted && (
        <div style={{ 
          marginTop: '20px', 
          padding: '16px', 
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
          border: '1px solid #fbbf24', 
          borderRadius: '12px',
          color: '#92400e',
          textAlign: 'center',
          fontWeight: '500'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '20px' }}>⏱️</span>
            <strong>Timer Expired</strong>
          </div>
          <p style={{ margin: '0', fontSize: '14px', opacity: 0.8 }}>
            The quiz timer has ended. Your answers were submitted before the timer expired.
          </p>
        </div>
      )}

      {/* Contact Footer */}
      <footer style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
        color: 'white',
        padding: '40px 20px',
        marginTop: '60px',
        textAlign: 'center',
        borderTop: '1px solid #475569'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px'
          }}>
            <div style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '10px'
            }}>
              🎯 QuizMaster Pro
            </div>
            <div style={{
              fontSize: '16px',
              opacity: 0.9,
              marginBottom: '20px'
            }}>
              Create, Share & Take Quizzes
            </div>
            
            {/* Contact Information */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '20px',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              maxWidth: '400px',
              width: '100%'
            }}>
              <div style={{
                fontSize: '18px',
                fontWeight: '600',
                marginBottom: '15px',
                color: '#fbbf24'
              }}>
                📞 Need Help?
              </div>
              <div style={{
                fontSize: '16px',
                marginBottom: '10px',
                opacity: 0.9
              }}>
                If you encounter any issues or need assistance, please contact us:
              </div>
              <div style={{
                fontSize: '20px',
                fontWeight: '700',
                color: '#10b981',
                padding: '12px',
                background: 'rgba(16, 185, 129, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                📱 {user ? 'Contact: 9363615853' : 'Contact: 9363615853'}
              </div>
              <div style={{
                fontSize: '14px',
                opacity: 0.7,
                marginTop: '10px'
              }}>
                We're here to help you get the most out of your quiz experience!
              </div>
            </div>

            <div style={{
              fontSize: '14px',
              opacity: 0.6,
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              width: '100%'
            }}>
              © 2025 QuizMaster Pro. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
