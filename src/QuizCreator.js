import React, { useState } from "react";
import { db } from "./firebase";
import { collection, addDoc } from "firebase/firestore";

const GEMINI_API_KEY = "AIzaSyBaa7HT3O0Z4pFeYO6HUrEtFKRQu7gRXKM";

async function generateQuizWithGemini(numQuestions, topic) {
  const prompt = `Create a ${numQuestions}-question multiple choice quiz on the topic: ${topic}. Format: [{question, options:[], answer}]`;
  const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + GEMINI_API_KEY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
  });
  const data = await response.json();
  // Parse Gemini response (assume JSON in text)
  try {
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(text);
  } catch {
    return [];
  }
}

const QuizCreator = ({ user }) => {
  const [numQuestions, setNumQuestions] = useState(5);
  const [topic, setTopic] = useState("");
  const [useLLM, setUseLLM] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCreateQuiz = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    let quizQuestions = [];
    if (useLLM) {
      quizQuestions = await generateQuizWithGemini(numQuestions, topic);
      if (!quizQuestions.length) setError("Failed to generate quiz with Gemini.");
    } else {
      quizQuestions = Array.from({ length: numQuestions }, (_, i) => ({
        question: `Question ${i + 1}`,
        options: ["Option 1", "Option 2", "Option 3", "Option 4"],
        answer: "Option 1"
      }));
    }
    setQuestions(quizQuestions);
    setLoading(false);
    // Save to Firestore
    if (quizQuestions.length) {
      await addDoc(collection(db, "quizzes"), {
        userId: user.uid,
        topic,
        questions: quizQuestions,
        created: new Date()
      });
    }
  };

  return (
    <div className="quiz-creator">
      <h3>Create a Quiz</h3>
      <form onSubmit={handleCreateQuiz}>
        <input type="number" min={1} max={50} value={numQuestions} onChange={e => setNumQuestions(e.target.value)} placeholder="Number of questions" required />
        <input type="text" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic" required />
        <label>
          <input type="checkbox" checked={useLLM} onChange={e => setUseLLM(e.target.checked)} /> Generate quiz using Gemini LLM
        </label>
        <button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Quiz"}</button>
      </form>
      {error && <p style={{color:'red'}}>{error}</p>}
      {questions.length > 0 && (
        <div>
          <h4>Quiz Preview</h4>
          {questions.map((q, i) => (
            <div key={i}>
              <strong>{q.question}</strong>
              <ul>
                {q.options.map((opt, idx) => <li key={idx}>{opt}</li>)}
              </ul>
              <em>Answer: {q.answer}</em>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuizCreator;
