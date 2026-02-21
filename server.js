import express from 'express';
import cors from 'cors';
import 'dotenv/config';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.url}`);
  next();
});

const HF_API_TOKEN = process.env.HF_API_TOKEN;
const HF_MODEL = process.env.HF_MODEL || 'mistralai/Mistral-7B-Instruct-v0.2';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;

app.post('/api/explain', async (req, res) => {
  try {
    if (!HF_API_TOKEN) {
      return res.status(500).json({ error: 'Missing HF_API_TOKEN on server' });
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

    const hfResponse = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        'Content-Type': 'application/json',
        'X-Wait-For-Model': 'true',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 400,
          temperature: 0.2,
        },
      }),
    });

    const contentType = hfResponse.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await hfResponse.json() : await hfResponse.text();

    if (!hfResponse.ok) {
      const errorMessage =
        (typeof data === 'object' && data && (data.error || data.message)) ||
        (typeof data === 'string' && data) ||
        'Hugging Face API error';
      console.log(`[HF] ${hfResponse.status} ${errorMessage}`);
      const hint =
        hfResponse.status === 404
          ? 'Model not found or not supported. Check HF_MODEL.'
          : '';
      return res.status(hfResponse.status).json({
        error: hint ? `${errorMessage} ${hint}`.trim() : errorMessage,
      });
    }

    let generated = '';
    if (Array.isArray(data) && data[0]?.generated_text) {
      generated = data[0].generated_text;
    } else if (typeof data === 'string') {
      generated = data;
    } else if (data?.generated_text) {
      generated = data.generated_text;
    }

    if (generated.startsWith(prompt)) {
      generated = generated.slice(prompt.length).trim();
    }

    if (!generated) {
      return res.status(502).json({ error: 'Empty response from Hugging Face' });
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
