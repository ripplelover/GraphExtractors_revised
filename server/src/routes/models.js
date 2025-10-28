import express from 'express';
import fetch from 'node-fetch';

export function createModelsRoute() {
  const r = express.Router();
  r.get('/api/models', async (_req, res) => {
    try {
      if (!process.env.GOOGLE_API_KEY) return res.status(500).json({ error: 'missing GOOGLE_API_KEY' });
      const url = `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GOOGLE_API_KEY}`;
      const rr = await fetch(url);
      const raw = await rr.text();
      if (!rr.ok) return res.status(rr.status).send(raw);
      const json = JSON.parse(raw);
      const models = (json.models || []).map((m) => ({
        name: m.name,
        displayName: m.displayName,
        description: m.description,
        inputTokenLimit: m.inputTokenLimit,
        outputTokenLimit: m.outputTokenLimit,
        supportedGenerationMethods: m.supportedGenerationMethods
      }));
      res.json({ models });
    } catch (e) {
      res.status(500).json({ error: e?.message || 'list models failed' });
    }
  });
  return r;
}

