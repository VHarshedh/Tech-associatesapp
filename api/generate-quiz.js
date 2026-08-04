const axios = require('axios');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });

  const { topic, numQuestions, types } = req.body || {};

  // ── Validation ────────────────────────────────────────────────────────────
  const sanitise = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : null);

  const cleanTopic = sanitise(topic, 200);
  const cleanNum = parseInt(numQuestions, 10);
  const cleanTypes = Array.isArray(types)
    ? types.map((t) => sanitise(String(t), 50)).filter(Boolean)
    : null;

  if (!cleanTopic) return res.status(400).json({ error: 'Missing or invalid field: topic.' });
  if (!cleanNum || cleanNum < 1 || cleanNum > 50)
    return res.status(400).json({ error: 'Invalid field: numQuestions must be between 1 and 50.' });
  if (!cleanTypes || cleanTypes.length === 0)
    return res.status(400).json({ error: 'Missing or invalid field: types.' });

  const ALLOWED = ['MCQ', 'MSQ', 'Short Answer', 'Numerical', 'Coding'];
  const invalid = cleanTypes.filter((t) => !ALLOWED.includes(t));
  if (invalid.length > 0)
    return res.status(400).json({ error: `Invalid question type(s): ${invalid.join(', ')}.` });

  // ── Prompt ────────────────────────────────────────────────────────────────
  const prompt = `Generate a quiz with exactly ${cleanNum} questions on the topic: "${cleanTopic}".
Question types to use: ${cleanTypes.join(', ')}.

Rules per type:
- MCQ: single correct answer from 4 options. Include "options" array and "answer" as one of the options.
- MSQ: multiple correct answers. Include "options" array and "answer" as an array of correct options.
- Short Answer: open-ended text. No options. "answer" is the ideal model answer (used for AI grading).
- Numerical: numeric answer. No options. "answer" is the correct number as a string.
- Coding: programming challenge. No options. "answer" is the reference/ideal solution code. Include a "language" field (e.g., "python", "javascript").

Return ONLY a valid JSON array, no markdown, no explanation:
[{ "type": "MCQ", "question": "...", "options": ["A","B","C","D"], "answer": "A" }]`;

  try {
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
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

    return res.status(200).json({ quiz });
  } catch (err) {
    console.error('Gemini quiz generation error:', err.message);
    return res.status(500).json({ error: 'Failed to generate quiz. Check server logs.' });
  }
};
