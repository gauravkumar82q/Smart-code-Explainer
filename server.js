import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import fetch from 'node-fetch';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama3-70b-8192';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/api/explain', async (req, res) => {
  try {
    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: 'Missing GROQ_API_KEY on server' });
    }

    const { code, language } = req.body || {};
    if (!code || !String(code).trim()) {
      return res.status(400).json({ error: 'Missing code to explain' });
    }

    const prompt =
      'You are a helpful assistant that explains code clearly and concisely.\n' +
      `Language: ${language || 'unknown'}\n` +
      'Code:\n' +
      String(code) +
      '\n\nExplain the code in plain English.';

    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant that explains code clearly and concisely.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 400,
        temperature: 0.2,
      }),
    });

    const contentType = groqResponse.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await groqResponse.json() : await groqResponse.text();

    if (!groqResponse.ok) {
      const errorMessage =
        (typeof data === 'object' && data && (data.error || data.message)) ||
        (typeof data === 'string' && data) ||
        'Groq API error';
      console.log(`[Groq] ${groqResponse.status} ${errorMessage}`);
      return res.status(groqResponse.status).json({
        error: errorMessage,
      });
    }

    let generated = '';
    if (data?.choices?.[0]?.message?.content) {
      generated = data.choices[0].message.content;
    }

    if (!generated) {
      return res.status(502).json({ error: 'Empty response from Groq API' });
    }

    return res.json({
      choices: [{ message: { content: generated.trim() } }],
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`HF proxy listening on http://localhost:${port}`);
});
