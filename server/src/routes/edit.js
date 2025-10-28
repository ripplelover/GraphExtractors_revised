import express from 'express';
import { writeLog } from '../lib/logger.js';
import { callGeminiForEdit } from '../lib/gemini.js';

export function createEditRoute() {
  const r = express.Router();
  r.post('/api/edit', async (req, res) => {
    try {
      const { spec, instruction } = req.body || {};
      if (!spec || !instruction) return res.status(400).json({ error: 'spec and instruction required' });
      if (!process.env.GOOGLE_API_KEY) {
        const next = JSON.parse(JSON.stringify(spec));
        try { next.title = instruction || next.title || 'Edited Chart'; } catch {}
        try { if (next?.encoding?.color && !next.encoding.color.scale) { next.encoding.color.scale = { range: ['#4e79a7','#f28e2b','#e15759','#76b7b2'] }; } } catch {}
        writeLog('edit-offline', { instruction, spec: next });
        return res.json({ spec: next, offline: true });
      }
      writeLog('edit-input', { instruction, spec });
      const out = await callGeminiForEdit(spec, instruction);
      let updated;
      try {
        let txt = String(out);
        txt = txt.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
        updated = JSON.parse(txt);
      } catch {
        let s = String(out).replace(/```[\s\S]*?```/g, '');
        const start = s.indexOf('{');
        const end = s.lastIndexOf('}');
        if (start >= 0 && end > start) {
          const slice = s.slice(start, end + 1);
          try { updated = JSON.parse(slice); }
          catch {
            let fixed = slice
              .replace(/,\s*}/g, '}')
              .replace(/,\s*]/g, ']')
              .replace(/(\w+):/g, '"$1":')
              .replace(/'/g, '"');
            updated = JSON.parse(fixed);
          }
        } else {
          throw new Error('model returned non-JSON');
        }
      }
      writeLog('edit-output', { spec: updated });
      res.json({ spec: updated });
    } catch (e) {
      const snippet = (req && req.body && typeof req.body.instruction === 'string') ? req.body.instruction.slice(0, 140) : '';
      writeLog('edit-error', { message: e?.message, snippet });
      res.status(500).json({ error: e?.message || 'edit failed', hint: '모델 응답이 JSON이 아닙니다. 지시어를 간단히 써보세요.' });
    }
  });
  return r;
}

