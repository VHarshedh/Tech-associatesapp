import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

// Gemini quiz generation is now proxied through the Express backend (/api/generate-quiz)
// The API key lives only in server.js via process.env.GEMINI_API_KEY
async function generateQuizWithGemini(numQuestions, topic, types) {


  const response = await fetch("/api/generate-quiz", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ numQuestions, topic, types }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || "Failed to generate quiz from server.");
  }


  return data.quiz;
}

const QUIZ_TYPES = ["MCQ", "MSQ", "Short Answer", "Numerical", "Coding"];
const CODING_LANGUAGES = ["python", "javascript", "java", "c++", "c", "typescript", "go", "rust", "sql", "other"];

const QuizCreator = ({ user }) => {
  const [numQuestions, setNumQuestions] = useState(5);
  const [topic, setTopic] = useState("");
  const [useLLM, setUseLLM] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState(["MCQ"]);
  const [questions, setQuestions] = useState([]);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [deadline, setDeadline] = useState("");
  const [timed, setTimed] = useState(false);
  const [timerDuration, setTimerDuration] = useState(0);
  const [shareEnabled, setShareEnabled] = useState(false);
  const [shareLink, setShareLink] = useState("");

  const handleTypeChange = (type) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    let quizQuestions = [];

    if (useLLM) {
      try {
        quizQuestions = await generateQuizWithGemini(numQuestions, topic, selectedTypes);
        if (!quizQuestions.length) {
          setError("Failed to generate quiz with Gemini.");
        } else {
          setQuestions(quizQuestions);
          const docRef = await addDoc(collection(db, "quizzes"), {
            userId: user.uid,
            topic,
            types: selectedTypes,
            questions: quizQuestions,
            deadline: deadline ? new Date(deadline) : null,
            timed,
            timerDuration: timed ? Number(timerDuration) : null,
            created: serverTimestamp(),
            shareEnabled,
          });
          setSuccess("Quiz saved successfully!");
          if (shareEnabled) {
            const link = `${window.location.origin}/#/quiz/${docRef.id}`;
            setShareLink(link);
          }
        }
      } catch (err) {
        console.error("Failed to save AI-generated quiz:", err);
        setError("Failed to save AI-generated quiz: " + (err.message || err));
      }
      setLoading(false);
    } else {
      // Generate default questions and enter edit mode
      quizQuestions = Array.from({ length: numQuestions }, (_, i) => {
        const type = selectedTypes[i % selectedTypes.length];
        if (type === "MCQ" || type === "MSQ") {
          return { type, question: "", options: ["", "", "", ""], answer: type === "MSQ" ? [] : "" };
        } else if (type === "Coding") {
          return { type, question: "", language: "python", answer: "" };
        } else {
          return { type, question: "", answer: "" };
        }
      });
      setQuestions(quizQuestions);
      setEditing(true);
      setLoading(false);
    }
  };

  return (
    <div
      className="quiz-creator"
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 32,
        borderRadius: 16,
        boxShadow: "0 2px 24px rgba(0,0,0,0.10)",
        background: "#f9f9f9",
        fontFamily: "Segoe UI, Arial, sans-serif",
      }}
    >
      <h2 style={{ textAlign: "center", color: "#2c3e50" }}>Create a Quiz</h2>
      <form onSubmit={handleCreateQuiz} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <label style={{ fontWeight: 500, marginTop: 8 }}>
          <input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)} /> Timed Quiz
        </label>
        {timed && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="timerDuration" style={{ fontWeight: 500 }}>Timer (minutes):</label>
            <input
              id="timerDuration"
              type="number"
              min={1}
              max={180}
              value={timerDuration}
              onChange={e => setTimerDuration(e.target.value)}
              style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 16, width: 100 }}
            />
          </div>
        )}

        <label htmlFor="deadline" style={{ fontWeight: 500 }}>Quiz Deadline</label>
        <input
          id="deadline"
          type="datetime-local"
          value={deadline}
          onChange={e => setDeadline(e.target.value)}
          style={{ padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 16 }}
        />

        <label htmlFor="topic" style={{ fontWeight: 500 }}>Quiz Topic</label>
        <input
          id="topic"
          type="text"
          value={topic}
          onChange={e => setTopic(e.target.value)}
          placeholder="Enter topic"
          required
          style={{ padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 16 }}
        />

        <label htmlFor="numQuestions" style={{ fontWeight: 500 }}>Number of Questions</label>
        <input
          id="numQuestions"
          type="number"
          min={1}
          max={50}
          value={numQuestions}
          onChange={e => setNumQuestions(e.target.value)}
          placeholder="Number of questions"
          required
          style={{ padding: 10, borderRadius: 6, border: "1px solid #ccc", fontSize: 16 }}
        />

        <label style={{ fontWeight: 500 }}>Question Types</label>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {QUIZ_TYPES.map(type => (
            <label key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={selectedTypes.includes(type)}
                onChange={() => handleTypeChange(type)}
              />{" "}
              {type}
            </label>
          ))}
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          <input type="checkbox" checked={useLLM} onChange={e => setUseLLM(e.target.checked)} />
          <span>Generate quiz using Gemini AI</span>
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={shareEnabled} onChange={e => setShareEnabled(e.target.checked)} />
          <span>Enable shareable link (anyone can attempt)</span>
        </label>

        {useLLM && (
          <div style={{ background: "#eef", padding: 12, borderRadius: 8, margin: "8px 0" }}>
            <strong>Prompt to AI:</strong>
            <div style={{ fontSize: 15, marginTop: 4 }}>
              Generate a quiz with {numQuestions} questions on the topic: <b>{topic || "[topic]"}</b>.<br />
              The questions should be a mix of these types: <b>{selectedTypes.join(", ")}</b>.<br />
              Format: [&#123;type, question, options:[], answer&#125;]
            </div>
          </div>
        )}

        {shareEnabled && shareLink && (
          <div style={{ background: "#eef", padding: 12, borderRadius: 8 }}>
            <div style={{ fontWeight: 600 }}>Shareable link</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
              <input
                type="text"
                readOnly
                value={shareLink}
                style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
              />
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(shareLink)}
                style={{ background: "#2c3e50", color: "#fff", border: "none", borderRadius: 6, padding: "8px 12px", cursor: "pointer" }}
              >
                Copy
              </button>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            background: "#2c3e50",
            color: "#fff",
            padding: "14px 0",
            border: "none",
            borderRadius: 8,
            fontSize: 18,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            marginTop: 10,
          }}
        >
          {loading ? "Creating..." : "Create Quiz"}
        </button>
      </form>

      {error && <p style={{ color: "#e74c3c", marginTop: 12 }}>{error}</p>}
      {success && <p style={{ color: "#27ae60", marginTop: 12 }}>{success}</p>}

      {questions.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3 style={{ color: "#2c3e50" }}>{editing ? "Edit Quiz Questions" : "Quiz Preview (answers hidden)"}</h3>
          {editing ? (
            <form
              onSubmit={async e => {
                e.preventDefault();
                setError("");
                setSuccess("");
                // Validate MCQ/MSQ answers
                for (let i = 0; i < questions.length; i++) {
                  const q = questions[i];
                  if ((q.type?.toUpperCase() === "MCQ" || q.type?.toUpperCase() === "MSQ") && q.options && Array.isArray(q.options)) {
                    if (q.type?.toUpperCase() === "MCQ" && !q.options.includes(q.answer)) {
                      setError(`Answer for Question ${i + 1} must be one of the options.`);
                      return;
                    }
                    if (q.type?.toUpperCase() === "MSQ" && (!Array.isArray(q.answer) || q.answer.some(ans => !q.options.includes(ans)))) {
                      setError(`All answers for Question ${i + 1} must be among the options.`);
                      return;
                    }
                  }
                }
                setEditing(false);
                setLoading(true);
                try {
                  const docRef = await addDoc(collection(db, "quizzes"), {
                    userId: user.uid,
                    topic,
                    types: selectedTypes,
                    questions,
                    deadline: deadline ? new Date(deadline) : null,
                    timed,
                    timerDuration: timed ? Number(timerDuration) : null,
                    created: serverTimestamp(),
                    shareEnabled,
                  });
                  setSuccess("Quiz saved successfully!");
                  if (shareEnabled) {
                    const link = `${window.location.origin}/#/quiz/${docRef.id}`;
                    setShareLink(link);
                  }
                } catch (err) {
                  console.error("Failed to save quiz:", err);
                  setError("Failed to save quiz: " + (err.message || err));
                }
                setLoading(false);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {questions.map((q, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 8px rgba(0,0,0,0.04)", padding: 16, marginBottom: 18 }}>
                  <label style={{ fontWeight: 500 }}>Question {i + 1} [{q.type}]</label>
                  <input
                    type="text"
                    value={q.question}
                    onChange={e => {
                      const updated = [...questions];
                      updated[i].question = e.target.value;
                      setQuestions(updated);
                    }}
                    required
                    style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 16, marginBottom: 8 }}
                  />
                  {q.options && Array.isArray(q.options) && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontWeight: 500 }}>Options</label>
                      {q.options.map((opt, idx) => (
                        <input
                          key={idx}
                          type="text"
                          value={opt}
                          onChange={e => {
                            const updated = [...questions];
                            updated[i].options[idx] = e.target.value;
                            setQuestions(updated);
                          }}
                          required
                          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 15, marginRight: 8, marginBottom: 6 }}
                        />
                      ))}
                    </div>
                  )}
                  {/* Coding: language selector */}
                  {q.type === "Coding" && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontWeight: 500, display: 'block', marginBottom: 4 }}>Language</label>
                      <select
                        value={q.language || 'python'}
                        onChange={e => {
                          const updated = [...questions];
                          updated[i].language = e.target.value;
                          setQuestions(updated);
                        }}
                        style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 15, width: '100%' }}
                      >
                        {CODING_LANGUAGES.map(lang => (
                          <option key={lang} value={lang}>{lang}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <label style={{ fontWeight: 500, marginTop: 8 }}>Answer{q.type === "Coding" ? " (Reference / Model Solution)" : q.type === "Short Answer" ? " (Ideal Answer for AI Grading)" : ""}</label>
                  {q.type?.toUpperCase() === "MSQ" ? (
                    <input
                      type="text"
                      value={Array.isArray(q.answer) ? q.answer.join(", ") : ""}
                      onChange={e => {
                        const updated = [...questions];
                        updated[i].answer = e.target.value.split(",").map(s => s.trim());
                        setQuestions(updated);
                      }}
                      placeholder="Comma separated answers"
                      required
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 16 }}
                    />
                  ) : q.type === "Coding" ? (
                    <textarea
                      value={q.answer}
                      onChange={e => {
                        const updated = [...questions];
                        updated[i].answer = e.target.value;
                        setQuestions(updated);
                      }}
                      rows={6}
                      placeholder={`Write the reference ${q.language || 'code'} solution here...`}
                      required
                      style={{
                        padding: 12, borderRadius: 6, border: "1px solid #ccc", fontSize: 14,
                        fontFamily: 'monospace', background: '#1e293b', color: '#f1f5f9',
                        width: '100%', resize: 'vertical', boxSizing: 'border-box'
                      }}
                    />
                  ) : q.type === "Short Answer" ? (
                    <textarea
                      value={q.answer}
                      onChange={e => {
                        const updated = [...questions];
                        updated[i].answer = e.target.value;
                        setQuestions(updated);
                      }}
                      rows={3}
                      placeholder="Ideal/expected answer (used for AI grading)..."
                      required
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 15, width: '100%', resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  ) : (
                    <input
                      type="text"
                      value={q.answer}
                      onChange={e => {
                        const updated = [...questions];
                        updated[i].answer = e.target.value;
                        setQuestions(updated);
                      }}
                      required
                      style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 16 }}
                    />
                  )}
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                style={{ background: "#27ae60", color: "#fff", padding: "14px 0", border: "none", borderRadius: 8, fontSize: 18, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", marginTop: 10 }}
              >
                {loading ? "Saving..." : "Save Quiz"}
              </button>
            </form>
          ) : (
            <div>
              {questions.map((q, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 8, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", padding: 20, marginBottom: 22 }}>
                  <div style={{ fontWeight: 600, fontSize: 17, marginBottom: 6 }}>
                    {i + 1}. {q.question}
                    {q.type && <span style={{ marginLeft: 10, color: "#2980b9", fontSize: 13 }}>[{q.type}]</span>}
                  </div>
                  {(q.type?.toUpperCase() === "MCQ" || q.type?.toLowerCase() === "multiple_choice") && q.options && Array.isArray(q.options) && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {q.options.map((opt, idx) => (
                        <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, background: "#f4f8fb", borderRadius: 6, padding: "6px 12px" }}>
                          <input type="radio" name={`mcq-${i}`} disabled />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type?.toUpperCase() === "MSQ" && q.options && Array.isArray(q.options) && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
                      {q.options.map((opt, idx) => (
                        <label key={idx} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16, background: "#f4f8fb", borderRadius: 6, padding: "6px 12px" }}>
                          <input type="checkbox" name={`msq-${i}`} disabled />
                          {opt}
                        </label>
                      ))}
                    </div>
                  )}
                  {q.type?.toLowerCase() === "short answer" && (
                    <div style={{ marginTop: 10 }}>
                      <input type="text" disabled placeholder="Your answer..." style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dbeafe", fontSize: 16, background: "#f4f8fb" }} />
                      <div style={{ marginTop: 6, fontSize: 12, color: '#6366f1', fontStyle: 'italic' }}>✨ Graded by Gemini AI</div>
                    </div>
                  )}
                  {q.type?.toLowerCase() === "numerical" && (
                    <div style={{ marginTop: 10 }}>
                      <input type="number" disabled placeholder="Enter number..." style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #dbeafe", fontSize: 16, background: "#f4f8fb" }} />
                    </div>
                  )}
                  {q.type?.toLowerCase() === "coding" && (
                    <div style={{ marginTop: 10 }}>
                      {q.language && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: 12, padding: '3px 10px', borderRadius: 4, fontFamily: 'monospace' }}>{q.language}</span>
                          <span style={{ fontSize: 12, color: '#6366f1', fontStyle: 'italic' }}>✨ Graded by Gemini AI</span>
                        </div>
                      )}
                      <textarea
                        disabled
                        placeholder="Write your code here..."
                        rows={4}
                        style={{ width: "100%", padding: "10px", borderRadius: 6, border: "1px solid #334155", fontSize: 14, background: "#1e293b", color: '#94a3b8', fontFamily: 'monospace', boxSizing: 'border-box' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuizCreator;
