import express from 'express';
import { writeLog } from '../lib/logger.js';
import { callGeminiForQA } from '../lib/gemini.js';

export function createAskRoute() {
  const r = express.Router();
  r.post('/api/ask', async (req, res) => {
    try {
      const { spec, question } = req.body || {};
      if (!spec || !question) return res.status(400).json({ error: 'spec and question required' });
      writeLog('ask-input', { question, spec });
      const answer = await callGeminiForQA(spec, question);
      writeLog('ask-output', { answer });
      res.json({ answer });
    } catch (e) {
      writeLog('ask-error', { message: e?.message });
      res.status(500).json({ error: e?.message || 'ask failed' });
    }
  });
  return r;
}

