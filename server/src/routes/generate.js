import express from 'express';
import { writeLog } from '../lib/logger.js';
import { callGeminiForEdit } from '../lib/gemini.js';

export function createGenerateRoute() {
  const r = express.Router();
  r.post('/api/generate', async (req, res) => {
    try {
      const { instruction } = req.body || {};
      if (!instruction) return res.status(400).json({ error: 'instruction required' });
      if (!process.env.GOOGLE_API_KEY) {
        const spec = {
          $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
          description: 'Offline generated chart',
          title: instruction || 'Generated Chart',
          width: 520,
          height: 320,
          data: { values: [ { category: 'Q1', value: 10 }, { category: 'Q2', value: 16 }, { category: 'Q3', value: 8 }, { category: 'Q4', value: 14 } ] },
          mark: { type: 'bar' },
          encoding: {
            x: { field: 'category', type: 'nominal', axis: { labelAngle: 0 } },
            y: { field: 'value', type: 'quantitative' },
            color: { field: 'category', type: 'nominal' }
          }
        };
        writeLog('generate-offline', { instruction, spec });
        return res.json({ spec, offline: true });
      }

      const prompt = `You are a senior data-vis engineer. Create a Vega-Lite v5 JSON chart based on the user's instruction.

STRICT OUTPUT: valid JSON ONLY (one object). NO code fences, NO prose.

GOALS
- Create a chart that matches the user's request
- Generate reasonable sample data as an array of objects in data.values
- Use appropriate chart type, colors, and styling

REQUIRED FIELDS
- $schema: "https://vega.github.io/schema/vega-lite/v5.json"
- description, title, width (520), height (320)
- mark: correct type with appropriate options
- encoding: include x/y (or theta/radius for pie/donut), color when needed
- data: { values: [...] } with sample data

CHART TYPES
- Bar chart: mark:'bar', x: nominal categories, y: quantitative
- Line chart: mark:'line', x: quantitative/temporal, y: quantitative
- Pie chart: mark:'arc', theta: quantitative, color: nominal
- Scatter plot: mark:'point', x: quantitative, y: quantitative
- Area chart: mark:'area', x: quantitative, y: quantitative
- Heatmap: mark:'rect', x: ordinal, y: ordinal, color: quantitative

SAMPLE DATA
Generate 5-10 realistic data points that make sense for the chart type.

${instruction}`;

      writeLog('generate-input', { instruction, prompt });
      const out = await callGeminiForEdit({}, prompt);
      let spec;
      try {
        spec = JSON.parse(out);
      } catch (e) {
        const jsonMatch = out.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try { spec = JSON.parse(jsonMatch[0]); }
          catch (e2) { throw new Error(`Invalid JSON response: ${e.message}`); }
        } else {
          throw new Error(`No JSON found in response: ${e.message}`);
        }
      }
      writeLog('generate-output', { spec });
      res.json({ spec });
    } catch (e) {
      console.error('/api/generate error', e);
      writeLog('generate-error', { message: e?.message, stack: e?.stack });
      res.status(500).json({ error: e?.message || 'generate failed', stack: e?.stack });
    }
  });
  return r;
}

