/**
 * Cloudflare Worker — AI-прокси для отчётов (статический web / Docker).
 *
 * Зачем: в dev и Electron AI-прокси живёт в Node-сервере (CRA setupProxy /
 * electron/bundledWebServer.cjs). Для статического web/Docker сервера нет —
 * поэтому фронт указывает reportsAiUrl в config.json на этот Worker.
 *
 * Деплой:
 *   npx wrangler deploy serverless/cloudflare-worker.js
 *   # затем в public/config.json: "reportsAiUrl": "https://<your-worker>.workers.dev/api/reports-ai/compose"
 *
 * Ключи: секреты Worker (wrangler secret put GEMINI_API_KEY / OPENROUTER_API_KEY)
 * или env vars. Ключи из тела запроса НЕ принимаются (безопаснее для публичного URL).
 */

const GEMINI_MODEL = 'gemini-2.0-flash';
const OPENROUTER_MODEL = 'google/gemini-2.0-flash-exp:free';

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
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Gemini HTTP ${res.status}`);
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
  if (!res.ok) throw new Error(data?.error?.message || `OpenRouter HTTP ${res.status}`);
  return extractTextFromOpenRouterResponse(data);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }
    if (request.method !== 'POST' || url.pathname !== '/api/reports-ai/compose') {
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const systemPrompt = String(body.systemPrompt || '');
    const userPrompt = String(body.userPrompt || body.userText || '');
    if (!userPrompt.trim()) {
      return new Response(JSON.stringify({ error: 'userPrompt required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const geminiKey = (env.GEMINI_API_KEY || '').trim();
    const openRouterKey = (env.OPENROUTER_API_KEY || '').trim();
    if (!geminiKey && !openRouterKey) {
      return new Response(
        JSON.stringify({ error: 'No AI provider key configured on the worker' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } },
      );
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
        return new Response(JSON.stringify({ draft, rawModelText: text, provider }), {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      } catch (e) {
        attempts.push(`${provider}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    return new Response(JSON.stringify({ error: 'All AI providers failed', attempts }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
