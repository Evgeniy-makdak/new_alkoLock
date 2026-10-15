/**
 * Только отчёты. Dev-only: POST /api/reports-ai/compose → Google Gemini / OpenRouter.
 * Ключи берутся из тела запроса (настройки в рантайме) или из env (yarn start):
 *   GEMINI_API_KEY / REACT_APP_GEMINI_API_KEY
 *   OPENROUTER_API_KEY / REACT_APP_OPENROUTER_API_KEY
 * Подключается одной строкой из src/setupProxy.js (CRA грузит только его).
 * Тот же контракт реализован в electron/aiComposeProxy.cjs для production.
 */

const GEMINI_MODEL = process.env.REPORTS_AI_GEMINI_MODEL || 'gemini-2.0-flash';
const OPENROUTER_MODEL =
  process.env.REPORTS_AI_OPENROUTER_MODEL || 'google/gemini-2.0-flash-exp:free';

function readEnvKey(...names) {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return '';
}

function readGeminiApiKey(body) {
  return (
    String(body?.geminiApiKey || '').trim() ||
    readEnvKey('GEMINI_API_KEY', 'REACT_APP_GEMINI_API_KEY')
  );
}

function readOpenRouterApiKey(body) {
  return (
    String(body?.openRouterApiKey || '').trim() ||
    readEnvKey('OPENROUTER_API_KEY', 'REACT_APP_OPENROUTER_API_KEY')
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

function extractTextFromOpenRouterResponse(data) {
  const text = data?.choices?.[0]?.message?.content;
  if (typeof text === 'string') return text.trim();
  if (Array.isArray(text)) {
    return text
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join('\n')
      .trim();
  }
  return '';
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

async function callOpenRouter({ systemPrompt, userPrompt, apiKey }) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || `OpenRouter HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return extractTextFromOpenRouterResponse(data);
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

      const systemPrompt = String(body.systemPrompt || '');
      const userPrompt = String(body.userPrompt || body.userText || '');
      if (!userPrompt.trim()) {
        res.status(400).json({ error: 'userPrompt required' });
        return;
      }

      const geminiKey = readGeminiApiKey(body);
      const openRouterKey = readOpenRouterApiKey(body);
      if (!geminiKey && !openRouterKey) {
        res.status(503).json({
          error: 'No AI provider key configured',
          hint: 'Set GEMINI_API_KEY / OPENROUTER_API_KEY in env or in the app settings',
        });
        return;
      }

      const preferred = String(body.preferredProvider || 'auto');
      const order =
        preferred === 'openrouter'
          ? ['openrouter', 'gemini']
          : preferred === 'gemini'
            ? ['gemini', 'openrouter']
            : ['gemini', 'openrouter'];

      const attempts = [];
      for (const provider of order) {
        const apiKey = provider === 'gemini' ? geminiKey : openRouterKey;
        if (!apiKey) continue;
        try {
          const text =
            provider === 'gemini'
              ? await callGemini({ systemPrompt, userPrompt, apiKey })
              : await callOpenRouter({ systemPrompt, userPrompt, apiKey });
          const draft = tryParseJson(text);
          if (!draft) {
            attempts.push(`${provider}: non-JSON`);
            continue;
          }
          res.json({ draft, rawModelText: text, provider });
          return;
        } catch (e) {
          attempts.push(`${provider}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }

      res.status(502).json({ error: 'All AI providers failed', attempts });
    } catch (e) {
      const status = e?.status && Number(e.status) >= 400 ? Number(e.status) : 500;
      res.status(status).json({
        error: e instanceof Error ? e.message : 'AI compose failed',
      });
    }
  });
}

module.exports = { mountReportsAiComposeProxy, readGeminiApiKey: readEnvKey };
