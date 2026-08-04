const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

// ── CORS headers ──────────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '256kb' }));

// ── Simple in-memory rate limiter ─────────────────────────────────────────────
const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) { entry.count = 1; entry.start = now; }
  else entry.count++;
  rateLimitMap.set(ip, entry);
  if (entry.count > RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests. Please try again in a minute.' });
  }
  next();
}

app.use('/api', rateLimit);

function sanitiseString(value, maxLength = 500) {
  if (typeof value !== 'string') return null;
  return value.trim().slice(0, maxLength);
}

// ── Proxy: reCAPTCHA verification ─────────────────────────────────────────────
app.post('/api/verify-captcha', async (req, res) => {
  const token = sanitiseString(req.body.token, 4096);
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!token) return res.status(400).json({ success: false, error: 'Missing token' });
  if (!secret) return res.status(500).json({ success: false, error: 'RECAPTCHA_SECRET_KEY not configured' });
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );
    res.json({ success: response.data.success });
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    res.status(500).json({ success: false, error: 'Verification request failed' });
  }
});

// ── Proxy: Gemini quiz generation ─────────────────────────────────────────────
app.post('/api/generate-quiz', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });

  const topic = sanitiseString(req.body.topic, 200);
  const numQuestions = parseInt(req.body.numQuestions, 10);
  const rawTypes = req.body.types;
  const types = Array.isArray(rawTypes)
    ? rawTypes.map((t) => sanitiseString(String(t), 50)).filter(Boolean)
    : null;

  if (!topic) return res.status(400).json({ error: 'Missing or invalid field: topic.' });
  if (!numQuestions || numQuestions < 1 || numQuestions > 50)
    return res.status(400).json({ error: 'Invalid field: numQuestions must be between 1 and 50.' });
  if (!types || types.length === 0)
    return res.status(400).json({ error: 'Missing or invalid field: types.' });

  const ALLOWED_TYPES = ['MCQ', 'MSQ', 'Short Answer', 'Numerical', 'Coding'];
  const invalidTypes = types.filter((t) => !ALLOWED_TYPES.includes(t));
  if (invalidTypes.length > 0)
    return res.status(400).json({ error: `Invalid question type(s): ${invalidTypes.join(', ')}.` });

  const prompt = `Generate a quiz with exactly ${numQuestions} questions on the topic: "${topic}".
Question types to use: ${types.join(', ')}.

Rules per type:
- MCQ: single correct answer from 4 options. Include "options" array and "answer" as one of the options.
- MSQ: multiple correct answers. Include "options" array and "answer" as an array of correct options.
- Short Answer: open-ended text. No options. "answer" is the ideal model answer (used for AI grading).
- Numerical: numeric answer. No options. "answer" is the correct number as a string.
- Coding: programming challenge. No options. "answer" is the reference/ideal solution code. Include a "language" field (e.g., "python", "javascript").

Return ONLY a valid JSON array, no markdown, no explanation:
[{ "type": "MCQ", "question": "...", "options": ["A","B","C","D"], "answer": "A" }]
[{ "type": "Coding", "question": "Write a function...", "language": "python", "answer": "def foo(): ..." }]`;

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;
    if (data.error) return res.status(500).json({ error: data.error.message || 'Gemini API error.' });

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No quiz data returned from Gemini.' });
    text = text.replace(/```json[\r\n]+|```/g, '').trim();

    let quiz;
    try { quiz = JSON.parse(text); } catch {
      return res.status(500).json({ error: 'Gemini returned invalid JSON. Please try again.' });
    }
    if (!Array.isArray(quiz) || quiz.length === 0)
      return res.status(500).json({ error: 'Gemini returned an unexpected quiz format.' });

    res.json({ quiz });
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message || 'Failed to generate quiz.';
    console.error('Gemini quiz generation error:', apiError);
    res.status(500).json({ error: `Failed to generate quiz: ${apiError}` });
  }
});

// ── Proxy: AI answer validation (Coding + Short Answer) ───────────────────────
/**
 * POST /api/validate-answers
 * Body: {
 *   questions: [{ type, question, answer (ideal/reference), language? }],
 *   userAnswers: { "0": "...", "1": "..." }   (indices into questions array)
 * }
 * Response: {
 *   results: [{ index, score, feedback, isCorrect }]
 * }
 * Only processes questions of type "Coding" or "Short Answer".
 */
app.post('/api/validate-answers', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });

  const { questions, userAnswers } = req.body;

  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'Missing or invalid field: questions.' });
  if (typeof userAnswers !== 'object' || userAnswers === null)
    return res.status(400).json({ error: 'Missing or invalid field: userAnswers.' });

  // Only validate AI-graded types
  const aiGradedTypes = ['coding', 'short answer', 'shortanswer', 'short_answer'];
  const toGrade = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => aiGradedTypes.includes((q.type ?? '').toLowerCase().replace(/[\s_]/g, '')));

  if (toGrade.length === 0) {
    return res.json({ results: [] });
  }

  // Build grading prompt
  const items = toGrade.map(({ q, i }) => {
    const userAnswer = userAnswers[String(i)] || userAnswers[i] || '(no answer provided)';
    const isCode = (q.type ?? '').toLowerCase() === 'coding';
    return `
--- Question ${i + 1} [${q.type}${isCode && q.language ? ` / ${q.language}` : ''}] ---
Question: ${q.question}
Reference Answer / Ideal Solution:
${q.answer}
Student's Answer:
${typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer)}
`.trim();
  }).join('\n\n');

  const prompt = `You are an expert quiz evaluator. Grade the following student answers carefully and fairly.

For each question:
- Assign a score from 0 to 100 (100 = perfect, 0 = completely wrong/missing).
- For Coding questions: check correctness of logic, edge cases, and code quality. Minor syntax differences are acceptable.
- For Short Answer questions: check factual accuracy and completeness. Partial credit is encouraged.
- Write 1-3 sentences of actionable feedback explaining what was right, what was wrong, and what was missed.

Return ONLY a valid JSON array with NO markdown and NO extra text:
[{ "index": <original question index as integer>, "score": <0-100>, "feedback": "...", "isCorrect": <true if score >= 70> }]

Questions to grade:
${items}`;

  try {
    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );

    const data = response.data;
    if (data.error) return res.status(500).json({ error: data.error.message || 'Gemini API error.' });

    let text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return res.status(500).json({ error: 'No grading data returned from Gemini.' });
    text = text.replace(/```json[\r\n]+|```/g, '').trim();

    let results;
    try { results = JSON.parse(text); } catch {
      return res.status(500).json({ error: 'Gemini returned invalid grading JSON. Please try again.' });
    }

    if (!Array.isArray(results))
      return res.status(500).json({ error: 'Unexpected grading response format.' });

    res.json({ results });
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message || 'Failed to validate answers.';
    console.error('Gemini validation error:', apiError);
    res.status(500).json({ error: `Failed to validate answers: ${apiError}` });
  }
});

app.listen(5000, () => console.log('✅  Server running on http://localhost:5000'));
