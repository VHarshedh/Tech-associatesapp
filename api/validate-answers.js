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

  const { questions, userAnswers } = req.body || {};

  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'Missing or invalid field: questions.' });
  if (typeof userAnswers !== 'object' || userAnswers === null)
    return res.status(400).json({ error: 'Missing or invalid field: userAnswers.' });

  // Only grade AI-graded types
  const aiTypes = ['coding', 'short answer', 'shortanswer', 'short_answer'];
  const toGrade = questions
    .map((q, i) => ({ q, i }))
    .filter(({ q }) => aiTypes.includes((q.type ?? '').toLowerCase().replace(/[\s_]/g, '')));

  if (toGrade.length === 0) return res.status(200).json({ results: [] });

  const items = toGrade.map(({ q, i }) => {
    const userAnswer = userAnswers[String(i)] || userAnswers[i] || '(no answer provided)';
    const isCode = (q.type ?? '').toLowerCase() === 'coding';
    return `--- Question ${i + 1} [${q.type}${isCode && q.language ? ` / ${q.language}` : ''}] ---
Question: ${q.question}
Reference Answer / Ideal Solution:
${q.answer}
Student's Answer:
${typeof userAnswer === 'string' ? userAnswer : JSON.stringify(userAnswer)}`;
  }).join('\n\n');

  const prompt = `You are an expert quiz evaluator. Grade the following student answers carefully and fairly.

For each question:
- Assign a score from 0 to 100 (100 = perfect, 0 = completely wrong/missing).
- For Coding questions: check correctness of logic, edge cases, and code quality. Minor syntax differences are acceptable.
- For Short Answer questions: check factual accuracy and completeness. Partial credit is encouraged.
- Write 1-3 sentences of actionable feedback.

Return ONLY a valid JSON array with NO markdown and NO extra text:
[{ "index": <original question index as integer>, "score": <0-100>, "feedback": "...", "isCorrect": <true if score >= 70> }]

Questions to grade:
${items}`;

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
    if (!text) return res.status(500).json({ error: 'No grading data returned from Gemini.' });

    text = text.replace(/```json[\r\n]+|```/g, '').trim();

    let results;
    try { results = JSON.parse(text); } catch {
      return res.status(500).json({ error: 'Gemini returned invalid grading JSON. Please try again.' });
    }
    if (!Array.isArray(results))
      return res.status(500).json({ error: 'Unexpected grading response format.' });

    return res.status(200).json({ results });
  } catch (err) {
    const apiError = err.response?.data?.error?.message || err.message || 'Failed to validate answers.';
    console.error('Gemini validation error:', apiError);
    return res.status(500).json({ error: `Failed to validate answers: ${apiError}` });
  }
};
