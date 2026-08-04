const axios = require('axios');

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!token) return res.status(400).json({ success: false, error: 'Missing token' });
  if (!secret) return res.status(500).json({ success: false, error: 'RECAPTCHA_SECRET_KEY not configured' });

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );
    return res.status(200).json({ success: response.data.success });
  } catch (error) {
    console.error('reCAPTCHA verification error:', error.message);
    return res.status(500).json({ success: false, error: 'Verification request failed' });
  }
};
