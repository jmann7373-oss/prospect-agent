const express = require('express');
const path = require('path');
const nodemailer = require('nodemailer');
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Proxy to Anthropic (research + structuring)
app.post('/api/research', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Anthropic API key not configured.' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy to Perplexity (web research)
app.post('/api/perplexity', async (req, res) => {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Perplexity API key not configured.' });
  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Proxy to Exa (fallback company research)
app.post('/api/exa', async (req, res) => {
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Exa API key not configured.' });
  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send email via Gmail SMTP
app.post('/api/send-email', async (req, res) => {
  const { to, subject, body } = req.body;
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailPass) {
    return res.status(500).json({ error: 'Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file.' });
  }
  if (!to || !subject || !body) {
    return res.status(400).json({ error: 'Missing required fields: to, subject, body.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: gmailPass }
    });

    await transporter.sendMail({
      from: gmailUser,
      to,
      subject,
      text: body
    });

    res.json({ success: true, message: `Email sent to ${to}` });
  } catch (err) {
    res.status(500).json({ error: `Failed to send email: ${err.message}` });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
