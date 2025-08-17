const axios = require('axios');

module.exports = async (req, res) => {
  let token;
  if (req.body && typeof req.body === 'string') {
    try {
      token = JSON.parse(req.body).token;
    } catch {
      token = undefined;
    }
  } else {
    token = req.body?.token;
  }
  const secret = process.env.RECAPTCHA_SECRET_KEY;
  if (!token) {
    return res.status(400).json({ success: false, error: "Missing token" });
  }
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`
    );
    res.json({ success: response.data.success });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
