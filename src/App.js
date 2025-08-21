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
          // Don’t block app load if rules disallow this write
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
            borderRadius: 12,
            boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#e67e22" }}>Verify Your Email</h2>
          <p style={{ fontSize: 17, marginTop: 18 }}>
            Please check your inbox and verify your email address to access quiz
            features.
          </p>
          <p style={{ color: "#888", marginTop: 12 }}>
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
        <div>
          <h2>Welcome, {user.email}</h2>
          <QuizCreator user={user} />
          <QuizList user={user} onAttempt={setAttemptQuiz} />
          <AttemptHistory user={user} />
        </div>
      )}
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

  useEffect(() => {
    if (!quiz.timed || submitted) return;
    if (timeLeft === 0) {
      setSubmitted(true);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz.timed, submitted, timeLeft]);

  // Calculate percentage score — now scoped to the component so it can use quiz + answers
  const getScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (q.type === 'MCQ' || q.type === 'Numerical' || q.type === 'Short Answer') {
        if (
          answers[i] !== undefined &&
          String(answers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
        )
          correct++;
      } else if (q.type === 'MSQ') {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    // Save attempt to Firestore
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
      };

      await addDoc(collection(db, 'attempts'), attemptData);
    } catch (err) {
      // Optionally show error to user
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
        Back to Quizzes
      </button>

      <h2 style={{ color: '#2c3e50' }}>{quiz.topic}</h2>

      <div style={{ marginBottom: 8, color: '#555' }}>
        Deadline:{' '}
        {quiz.deadline ? (quiz.deadline.toDate?.() ? quiz.deadline.toDate().toLocaleString() : new Date(quiz.deadline).toLocaleString()) : 'None'}
      </div>

      {quiz.timed && !submitted && (
        <div
          style={{
            margin: '16px 0',
            color: '#e67e22',
            fontWeight: 600,
            fontSize: 16,
          }}
        >
          Time Left: {Math.floor(timeLeft / 60)}:
          {(timeLeft % 60).toString().padStart(2, '0')}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
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
            <div
              style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}
            >
              {i + 1}. {q.question}
              {q.type && (
                <span
                  style={{
                    marginLeft: 10,
                    color: '#2980b9',
                    fontSize: 13,
                  }}
                >
                  [{q.type}]
                </span>
              )}
            </div>

            {q.type?.toUpperCase() === 'MCQ' && q.options && Array.isArray(q.options) && (
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {q.options.map((opt, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 16,
                      background: '#f4f8fb',
                      borderRadius: 6,
                      padding: '6px 12px',
                    }}
                  >
                    <input
                      type="radio"
                      name={`mcq-${i}`}
                      value={opt}
                      checked={answers[i] === opt}
                      disabled={submitted}
                      onChange={() => handleChange(i, opt)}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type?.toUpperCase() === 'MSQ' && q.options && Array.isArray(q.options) && (
              <div
                style={{
                  marginTop: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {q.options.map((opt, idx) => (
                  <label
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: 16,
                      background: '#f4f8fb',
                      borderRadius: 6,
                      padding: '6px 12px',
                    }}
                  >
                    <input
                      type="checkbox"
                      name={`msq-${i}`}
                      checked={answers[i]?.includes(opt) || false}
                      disabled={submitted}
                      onChange={(e) => {
                        let arr = answers[i] || [];
                        if (e.target.checked) arr = [...arr, opt];
                        else arr = arr.filter((o) => o !== opt);
                        handleChange(i, arr);
                      }}
                    />
                    {opt}
                  </label>
                ))}
              </div>
            )}

            {q.type === 'Short Answer' && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  value={answers[i] || ''}
                  disabled={submitted}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="Your answer..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #dbeafe',
                    fontSize: 16,
                    background: '#f4f8fb',
                  }}
                />
              </div>
            )}

            {q.type === 'Numerical' && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="number"
                  value={answers[i] || ''}
                  disabled={submitted}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="Enter number..."
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 6,
                    border: '1px solid #dbeafe',
                    fontSize: 16,
                    background: '#f4f8fb',
                  }}
                />
              </div>
            )}

            {submitted && (
              <div style={{ marginTop: 8, color: '#2c3e50', fontSize: 15 }}>
                <strong>Correct Answer:</strong>{' '}
                {Array.isArray(q.answer) ? q.answer.join(', ') : q.answer}
              </div>
            )}
          </div>
        ))}

        {!submitted && (
          <button
            type="submit"
            style={{
              background: '#2c3e50',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            Submit Quiz
          </button>
        )}
      </form>

      {submitted && (
        <div style={{ marginTop: 24, color: '#27ae60', fontSize: 17 }}>
          <strong>Quiz submitted! Review your answers above.</strong>
          <br />
          <span style={{ color: '#2c3e50', fontWeight: 500, fontSize: 18 }}>
            Score: {getScore()}%
          </span>
        </div>
      )}

      {quiz.timed && submitted && (
        <div style={{ marginTop: 12, color: '#e74c3c', fontSize: 16 }}>
          <strong>Quiz ended due to timer.</strong>
        </div>
      )}
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

  // Check if user is logged in
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  if (quiz?.notFound) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
        <h2>Quiz not found</h2>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }
  if (quiz?.disabled) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
        <h2>This quiz is not available for public attempts.</h2>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }
  if (quiz?.error) {
    return (
      <div style={{ maxWidth: 600, margin: '40px auto', padding: 24 }}>
        <h2>Failed to load quiz.</h2>
        <button onClick={onBack}>Back</button>
      </div>
    );
  }

  const getScore = () => {
    let correct = 0;
    quiz.questions.forEach((q, i) => {
      if (q.type === 'MCQ' || q.type === 'Numerical' || q.type === 'Short Answer') {
        if (
          answers[i] !== undefined &&
          String(answers[i]).trim().toLowerCase() === String(q.answer).trim().toLowerCase()
        )
          correct++;
      } else if (q.type === 'MSQ') {
        if (Array.isArray(q.answer) && Array.isArray(answers[i])) {
          const a1 = q.answer.map((a) => String(a).trim().toLowerCase()).sort();
          const a2 = answers[i].map((a) => String(a).trim().toLowerCase()).sort();
          if (JSON.stringify(a1) === JSON.stringify(a2)) correct++;
        }
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const scorePercent = getScore();
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

      <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
        {!user && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600 }}>Your Name</label>
            <input
              type="text"
              value={participantName}
              onChange={(e) => setParticipantName(e.target.value)}
              placeholder="Enter your name"
              required
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

            {q.type?.toUpperCase() === 'MCQ' && q.options && Array.isArray(q.options) && (
              <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {q.options.map((opt, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, background: '#f4f8fb', borderRadius: 6, padding: '6px 12px' }}>
                    <input
                      type="radio"
                      name={`mcq-${i}`}
                      value={opt}
                      checked={answers[i] === opt}
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

            {q.type === 'Short Answer' && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="text"
                  value={answers[i] || ''}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  placeholder="Your answer..."
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

            {q.type === 'Numerical' && (
              <div style={{ marginTop: 10 }}>
                <input
                  type="number"
                  value={answers[i] || ''}
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
          </div>
        ))}

        {!submitted && (
          <button
            type="submit"
            style={{
              background: '#2c3e50',
              color: '#fff',
              padding: '12px 24px',
              border: 'none',
              borderRadius: 8,
              fontSize: 18,
              fontWeight: 600,
              marginTop: 10,
            }}
          >
            Submit Quiz
          </button>
        )}
      </form>

      {submitted && (
        <div style={{ marginTop: 24, color: '#27ae60', fontSize: 17 }}>
          <strong>Quiz submitted!</strong>
          <br />
          <span style={{ color: '#2c3e50', fontWeight: 500, fontSize: 18 }}>
            Score: {score}%
          </span>
        </div>
      )}
    </div>
  );
}
