const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
app.use(bodyParser.json());

app.post('/api/verify-captcha', async (req, res) => {
  const token = req.body.token;
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!token) return res.status(400).json({ success: false, error: "Missing token" });
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );
    res.json({ success: response.data.success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(5000, () => console.log('Server running on port 5000'));
