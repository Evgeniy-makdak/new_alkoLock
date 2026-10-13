/**
 * Dev-only handler: POST /api/reports-ai/compose → Google Gemini.
 * Ключ: GEMINI_API_KEY или REACT_APP_GEMINI_API_KEY в окружении yarn start.
 * Файл внутри src/, чтобы tsc (rootDir=./src, allowJs) не ругался на scripts/.
 */

const GEMINI_MODEL = process.env.REPORTS_AI_GEMINI_MODEL || 'gemini-2.0-flash';

function readGeminiApiKey() {
  return (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.REACT_APP_GEMINI_API_KEY?.trim() ||
    ''
  );
}

function extractTextFromGeminiResponse(data) {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts
    .map((p) => (typeof p?.text === 'string' ? p.text : ''))
    .join('\n')
    .trim();
}

function tryParseJson(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fence ? fence[1].trim() : trimmed;
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

async function callGemini({ systemPrompt, userPrompt, apiKey }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    GEMINI_MODEL,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return extractTextFromGeminiResponse(data);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    if (req.body && typeof req.body === 'object') {
      resolve(req.body);
      return;
    }
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2_000_000) {
        reject(new Error('Body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/**
 * @param {import('express').Express} app
 */
function mountReportsAiComposeProxy(app) {
  app.post('/api/reports-ai/compose', async (req, res) => {
    try {
      const body = await readJsonBody(req);
      const apiKey = readGeminiApiKey();
      if (!apiKey) {
        res.status(503).json({
          error: 'GEMINI_API_KEY not configured',
          hint: 'Set GEMINI_API_KEY or REACT_APP_GEMINI_API_KEY for yarn start',
        });
        return;
      }

      const systemPrompt = String(body.systemPrompt || '');
      const userPrompt = String(body.userPrompt || body.userText || '');
      if (!userPrompt.trim()) {
        res.status(400).json({ error: 'userPrompt required' });
        return;
      }

      const text = await callGemini({ systemPrompt, userPrompt, apiKey });
      const draft = tryParseJson(text);
      if (!draft) {
        res.status(502).json({ error: 'Model returned non-JSON', rawModelText: text });
        return;
      }
      res.json({ draft, rawModelText: text });
    } catch (e) {
      const status = e?.status && Number(e.status) >= 400 ? Number(e.status) : 500;
      res.status(status).json({
        error: e instanceof Error ? e.message : 'AI compose failed',
      });
    }
  });
}

module.exports = { mountReportsAiComposeProxy, readGeminiApiKey };
