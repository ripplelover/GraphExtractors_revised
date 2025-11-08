import express from 'express';
import { writeLog } from '../lib/logger.js';
import { buildPrompt } from '../lib/prompts.js';
import { fixSpec, enforceStrictSpec } from '../lib/specFixes.js';
import { callGeminiWithImage } from '../lib/gemini.js';

export function createConvertRoute({ upload }) {
  const r = express.Router();
  r.post('/api/convert', upload.single('image'), async (req, res) => {
    try {
      if (!req.file) {
        console.error("/api/convert: missing file field 'image'", { bodyKeys: Object.keys(req.body || {}) });
        return res.status(400).json({ error: 'image required', hint: "send multipart/form-data with field name 'image'" });
      }
      if (!process.env.GOOGLE_API_KEY) {
        const fallback = {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          description: 'Offline fallback chart',
          title: 'Sample Bar Chart (offline)',
          width: 520,
          height: 320,
          data: { values: [ { category: 'A', value: 12 }, { category: 'B', value: 7 }, { category: 'C', value: 18 } ] },
          mark: { type: 'bar' },
          encoding: {
            x: { field: 'category', type: 'nominal', axis: { labelAngle: 0 } },
            y: { field: 'value', type: 'quantitative' },
            color: { field: 'category', type: 'nominal', scale: { domain: ['A','B','C'], range: ['#4e79a7','#f28e2b','#e15759'] } }
          },
          background: '#ffffff'
        };
        return res.json({ spec: fallback, offline: true });
      }
      const instruction = req.body?.instruction;
      const mime = req.file.mimetype || 'image/png';
      const b64 = req.file.buffer.toString('base64');
      const prompt = buildPrompt(instruction);
      writeLog('convert-input', { instruction, mime, prompt });
      const out = await callGeminiWithImage(b64, prompt, mime);
      let spec;
      try {
        spec = JSON.parse(out);
      } catch {
        const m = out.match(/\{[\s\S]*\}/);
        spec = m ? JSON.parse(m[0]) : JSON.parse(out);
      }
      while (spec && spec.spec && typeof spec.spec === 'object') {
        spec = spec.spec;
        console.warn('Gemini wrapped spec in extra layer, unwrapping...');
      }
      spec = enforceStrictSpec(fixSpec(spec));
      writeLog('convert-output', spec);
      res.json({ spec });
    } catch (e) {
      console.error('/api/convert error', e);
      writeLog('convert-error', { message: e?.message, stack: e?.stack });
      const code = e?.statusCode;
      if (code === 429 || code === 503) {
        const payload = { error: 'Upstream model is overloaded. Please retry shortly.' };
        if (e?.retryAfter) payload.retryAfter = e.retryAfter;
        return res.status(code).json(payload);
      }
      res.status(500).json({ error: e?.message || 'convert failed' });
    }
  });
  return r;
}

