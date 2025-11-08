import express from 'express';
import fetch from 'node-fetch';
import { normalizeModelId } from '../lib/prompts.js';

export function createDebugRoute() {
  const r = express.Router();
  r.get('/api/debug', async (_req, res) => {
    try {
      const apiKeyPresent = Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith('AIza'));
      const model = normalizeModelId(process.env.MODEL_ID || 'gemini-1.5-pro');
      let ping = null;
      if (apiKeyPresent) {
        const body = { contents: [{ role: 'user', parts: [{ text: 'ping' }] }], generationConfig: { temperature: 0, maxOutputTokens: 8 } };
        const r2 = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        );
        ping = { ok: r2.ok, status: r2.status, text: await r2.text() };
      }
      res.json({ apiKeyPresent, model, ping });
    } catch (e) {
      res.status(500).json({ error: e?.message || 'debug failed' });
    }
  });
  return r;
}

