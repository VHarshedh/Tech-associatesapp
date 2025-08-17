
import React, { useState } from 'react';
import './App.css';

import Auth from './Auth';
import QuizCreator from './QuizCreator';
import QuizList from './QuizList';

function App() {
  const [user, setUser] = useState(null);
  const [attemptQuiz, setAttemptQuiz] = useState(null);

  // Enforce email verification
  const isVerified = user?.emailVerified;
  return (
    <div className="App">
      {!user ? (
        <Auth onAuth={setUser} />
      ) : !isVerified ? (
        <div style={{maxWidth: 500, margin: "60px auto", padding: 32, background: "#fff", borderRadius: 12, boxShadow: "0 2px 16px rgba(0,0,0,0.08)", textAlign: "center"}}>
          <h2 style={{color: "#e67e22"}}>Verify Your Email</h2>
          <p style={{fontSize: 17, marginTop: 18}}>Please check your inbox and verify your email address to access quiz features.</p>
          <p style={{color: "#888", marginTop: 12}}>Refresh this page after verification.</p>
        </div>
      ) : attemptQuiz ? (
        <QuizAttempt quiz={attemptQuiz} onBack={() => setAttemptQuiz(null)} />
      ) : (
        <div>
          <h2>Welcome, {user.email}</h2>
          <QuizCreator user={user} />
          <QuizList user={user} onAttempt={setAttemptQuiz} />
        </div>
      )}
    </div>
  );
}


function QuizAttempt({ quiz, onBack }) {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quiz.timed ? quiz.timerDuration * 60 : null);
  React.useEffect(() => {
    if (!quiz.timed || submitted) return;
    if (timeLeft === 0) setSubmitted(true);
    const timer = setInterval(() => {
      setTimeLeft(t => t > 0 ? t - 1 : 0);
    }, 1000);
    return () => clearInterval(timer);
  }, [quiz.timed, submitted, timeLeft]);

  const handleChange = (qid, value) => {
    setAnswers(a => ({ ...a, [qid]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{maxWidth: 600, margin: "40px auto", padding: 32, borderRadius: 16, background: "#f9f9f9"}}>
      <button onClick={onBack} style={{marginBottom: 16}}>Back to Quizzes</button>
      <h2>{quiz.topic}</h2>
      <div>Deadline: {quiz.deadline ? new Date(quiz.deadline).toLocaleString() : "None"}</div>
      {quiz.timed && !submitted && (
        <div style={{margin: "16px 0", color: "#e67e22", fontWeight: 600}}>
          Time Left: {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
        </div>
      )}
      <form onSubmit={handleSubmit} style={{marginTop: 24}}>
        {quiz.questions.map((q, i) => (
          <div key={i} style={{marginBottom: 24, background: "#fff", borderRadius: 8, padding: 16}}>
            <strong>{q.question}</strong> <span style={{color: "#888"}}>[{q.type}]</span>
            {q.options && Array.isArray(q.options) && (
              <ul style={{marginTop: 8}}>
                {q.options.map((opt, idx) => (
                  <li key={idx}>
                    {q.type === "MSQ" ? (
                      <label>
                        <input type="checkbox" checked={answers[i]?.includes(opt) || false} onChange={e => {
                          let arr = answers[i] || [];
                          if (e.target.checked) arr = [...arr, opt];
                          else arr = arr.filter(o => o !== opt);
                          handleChange(i, arr);
                        }} /> {opt}
                      </label>
                    ) : (
                      <label>
                        <input type={q.type === "MCQ" ? "radio" : "checkbox"} name={`q${i}`} value={opt} checked={answers[i] === opt} onChange={() => handleChange(i, opt)} /> {opt}
                      </label>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {q.type === "Short Answer" && (
              <input type="text" value={answers[i] || ""} onChange={e => handleChange(i, e.target.value)} style={{marginTop: 8, width: "100%"}} />
            )}
            {q.type === "Numerical" && (
              <input type="number" value={answers[i] || ""} onChange={e => handleChange(i, e.target.value)} style={{marginTop: 8, width: "100%"}} />
            )}
            {submitted && (
              <div style={{marginTop: 8, color: "#2c3e50"}}>
                <strong>Correct Answer:</strong> {Array.isArray(q.answer) ? q.answer.join(", ") : q.answer}
              </div>
            )}
          </div>
        ))}
        {!submitted && <button type="submit" style={{background: "#2c3e50", color: "#fff", padding: "12px 24px", border: "none", borderRadius: 8, fontSize: 18, fontWeight: 600}}>Submit Quiz</button>}
      </form>
      {submitted && <div style={{marginTop: 24, color: "#27ae60"}}><strong>Quiz submitted! Review your answers above.</strong></div>}
      {quiz.timed && submitted && <div style={{marginTop: 12, color: "#e74c3c"}}><strong>Quiz ended due to timer.</strong></div>}
    </div>
  );
}

export default App;
