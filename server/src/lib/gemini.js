import fetch from 'node-fetch';
import { normalizeModelId } from './prompts.js';

export async function callGeminiWithImage(b64Image, prompt, mime = 'image/png') {
  const apiKey = process.env.GOOGLE_API_KEY;
  const candidates = ['gemini-2.5-pro'];
  const body = {
    contents: [
      { role: 'user', parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64Image } }] }
    ],
    generationConfig: { temperature: 0.05, maxOutputTokens: 80000 }
  };
  let lastErrText = '';
  for (const raw of candidates) {
    const model = normalizeModelId(raw);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text) return text;
      lastErrText = JSON.stringify(json);
      continue;
    }
    const txt = await res.text();
    lastErrText = `model=${model} status=${res.status} ${txt}`;
    if (res.status !== 404) break;
  }
  throw new Error(`Gemini API error: ${lastErrText}`);
}

export async function callGeminiForEdit(spec, instruction) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const candidates = ['gemini-2.5-pro'];
  const prompt = `JSON only:\n\n${JSON.stringify(spec)}\n\n${instruction}`;
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.05, maxOutputTokens: 4000 } };
  let lastErrText = '';
  for (const raw of candidates) {
    const model = normalizeModelId(raw);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      if (text) return text;
      lastErrText = JSON.stringify(json);
      continue;
    }
    const txt = await res.text();
    lastErrText = `model=${model} status=${res.status} ${txt}`;
    if (res.status !== 404) break;
  }
  throw new Error(`Gemini API error: ${lastErrText}`);
}

export async function callGeminiForQA(spec, question) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const candidates = ['gemini-2.5-pro'];
  const prompt = `You are a helpful data visualization assistant. You will be given a Vega-Lite JSON spec and a user question. Answer the question briefly in Korean using ONLY the information derivable from the spec (data.values, encodings, titles, ranges). Do not output JSON, only a short natural language answer.\n\nSPEC:\n${JSON.stringify(spec)}\n\nQUESTION:\n${question}`;
  const body = { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 1024 } };
  let lastErrText = '';
  for (const raw of candidates) {
    const model = normalizeModelId(raw);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    // Allow up to 2 attempts, increasing maxOutputTokens if we hit MAX_TOKENS with no text
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (res.ok) {
        const json = await res.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        if (text) return text;
        const finish = json?.candidates?.[0]?.finishReason || json?.candidates?.[0]?.finish_reason;
        // If the model ran out of tokens before emitting text (e.g., due to internal reasoning tokens), retry with higher limit
        if ((finish === 'MAX_TOKENS' || finish === 'MAX_TOKENS_EXCEEDED') && (body.generationConfig.maxOutputTokens || 0) < 2048) {
          body.generationConfig.maxOutputTokens = Math.min(2048, (body.generationConfig.maxOutputTokens || 1024) * 2);
          continue; // retry once with larger budget
        }
        lastErrText = JSON.stringify(json);
        break; // break attempt loop, try next model
      }
      const txt = await res.text();
      lastErrText = `model=${model} status=${res.status} ${txt}`;
      if (res.status !== 429 && res.status !== 503 && res.status !== 404) break; // don't spin
    }
    if (lastErrText) continue;
  }
  throw new Error(`Gemini QA error: ${lastErrText}`);
}

