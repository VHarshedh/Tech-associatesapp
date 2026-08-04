/**
 * Shared quiz scoring utilities.
 * MCQ, MSQ and Numerical use exact matching via getScore().
 * Coding and Short Answer are graded by Gemini AI — use needsAIValidation().
 */

/** Question types that require AI grading instead of exact string matching. */
export const AI_GRADED_TYPES = ['coding', 'shortanswer'];

/**
 * Normalises a question type string for consistent comparison.
 * e.g. "Short Answer", "short_answer", "shortanswer" → "shortanswer"
 */
function normaliseType(type) {
  return (type ?? '').toLowerCase().replace(/[\s_-]/g, '');
}

/**
 * Determines whether the user's answer matches the correct answer for a question.
 * @param {Object} q - Question object with `type` and `answer` fields
 * @param {*} userAnswer - The user's submitted answer
 * @returns {boolean}
 */
export function isCorrect(q, userAnswer) {
  if (userAnswer === undefined || userAnswer === null || userAnswer === '') return false;
  const type = normaliseType(q.type);

  if (type === 'msq') {
    if (!Array.isArray(q.answer) || !Array.isArray(userAnswer)) return false;
    const sorted = (arr) => arr.map((a) => String(a).trim().toLowerCase()).sort();
    return JSON.stringify(sorted(q.answer)) === JSON.stringify(sorted(userAnswer));
  }

  return String(userAnswer).trim().toLowerCase() === String(q.answer).trim().toLowerCase();
}

/**
 * Returns true if the question type requires AI (Gemini) grading.
 * @param {Object} q - Question object with a `type` field
 */
export function needsAIValidation(q) {
  const t = normaliseType(q.type);
  return t === 'coding' || t === 'shortanswer';
}

/**
 * Calculates a percentage score for only the exact-match questions in a quiz.
 * AI-graded questions (Coding, Short Answer) are excluded from this calculation
 * and are scored separately via validateWithAI().
 * @param {Array} questions
 * @param {Object} answers
 * @returns {number} Integer percentage 0–100 (based on exact-match questions only)
 */
export function getScore(questions, answers) {
  if (!questions || questions.length === 0) return 0;
  const correct = questions.reduce((count, q, i) => {
    return count + (isCorrect(q, answers[i]) ? 1 : 0);
  }, 0);
  return Math.round((correct / questions.length) * 100);
}

/**
 * Returns a motivational label for a given score percentage.
 * @param {number} score
 * @returns {string}
 */
export function getScoreLabel(score) {
  if (score >= 90) return 'Outstanding Performance! 🌟';
  if (score >= 80) return 'Excellent Work! 🎯';
  if (score >= 70) return 'Good Job! 👍';
  if (score >= 60) return 'Well Done! ✅';
  if (score >= 50) return 'Keep Learning! 📚';
  return 'Keep Practicing! 💪';
}
