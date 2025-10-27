import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";
import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));
// Ensure UTF-8 for all JSON responses to avoid Korean mojibake in some shells/clients
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

// simple file logger
// Resolve __dirname in ESM and fix path on Windows
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Use server directory to avoid cwd variations
const logsDir = path.resolve(__dirname, "..", "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
function writeLog(kind, obj) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const file = path.join(logsDir, `${ts}-${kind}.json`);
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  } catch { /* ignore */ }
}

function buildPrompt(userInstruction) {
  const core = `Convert the chart IMAGE into valid Vega-Lite v6 JSON.

OUTPUT: Valid JSON only, starting with { "$schema": "https://vega.github.io/schema/vega-lite/v6.json" }

CRITICAL: Match EXACT appearance - colors (#hex), labels, positions, formats.

STRUCTURE:

**Single View (bars/lines/scatter):**
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "data": {"values": [...]},
  "mark": {"type": "bar"},
  "encoding": {
    "x": {"field": "cat", "type": "nominal"},
    "y": {"field": "val", "type": "quantitative"}
  },
  "width": 520,
  "height": 320
}

**Pie/Donut with External Labels:**
{
  "$schema": "https://vega.github.io/schema/vega-lite/v6.json",
  "width": 520,
  "height": 320,
  "layer": [
    {
      "mark": {"type": "arc", "innerRadius": 0},
      "encoding": {
        "theta": {"field": "value", "type": "quantitative", "stack": true},
        "color": {"field": "cat", "type": "nominal", "scale": {"range": ["#5b9bd5", "#f28e2b"]}}
      }
    },
    {
      "mark": {"type": "text", "fontSize": 14, "align": "left"},
      "data": {
        "values": [
          {"text": "Label text", "x": 280, "y": 100, "fill": "#000"}
        ]
      },
      "encoding": {
        "text": {"field": "text"},
        "x": {"field": "x", "type": "quantitative", "axis": null},
        "y": {"field": "y", "type": "quantitative", "axis": null},
        "fill": {"field": "fill", "type": "nominal", "scale": {"range": ["#000000"]}}
      }
    }
  ]
}

PIE CHART TEXT RULES:
- ALWAYS use separate layer for external labels
- Position text OUTSIDE pie (not on/in slices)
- Use absolute coordinates: x (left: 200-280, right: 350-450), y (50-250)
- Left side labels: x around 250, align left
- Right side labels: x around 400, align right

AXIS FORMATTING:
- Numbers: "axis.format": ",d" (prevents scientific notation)
- Explicit ticks: "axis.values": [100, 200, 300]
- Y-axis: domain [0, max] unless truncated in image

${userInstruction ? `USER INSTRUCTION:\n${userInstruction}\n` : ''}`;
  return core;
}

function normalizeModelId(name) {
  return String(name || "").replace(/^models\//, "");
}

// Minimal spec fixes - only remove invalid properties
function fixSpec(spec) {
  if (!spec) return spec;
  const fixed = JSON.parse(JSON.stringify(spec));
  
  // Remove invalid mark properties
  function cleanMark(mark) {
    if (!mark || typeof mark !== 'object') return mark;
    delete mark.orient; // Vega-Lite doesn't use this
    delete mark.height?.band;
    delete mark.width?.band;
    delete mark.baseline;
    return mark;
  }
  
  // Fix axis format to prevent scientific notation
  function fixAxisFormat(axis) {
    if (!axis || typeof axis !== 'object') return;
    if (axis.format === ',' || axis.format === ',') {
      axis.format = ',d';
    }
  }
  
  // Recursively clean layers
  function cleanLayer(layer) {
    if (Array.isArray(layer)) return layer.map(cleanLayer);
    if (!layer || typeof layer !== 'object') return layer;
    
    if (layer.mark) layer.mark = cleanMark(layer.mark);
    if (layer.layer) layer.layer = cleanLayer(layer.layer);
    
    if (layer.encoding) {
      if (layer.encoding.x?.axis) fixAxisFormat(layer.encoding.x.axis);
      if (layer.encoding.y?.axis) fixAxisFormat(layer.encoding.y.axis);
    }
    
    return layer;
  }
  
  if (fixed.layer) fixed.layer = cleanLayer(fixed.layer);
  if (fixed.mark) fixed.mark = cleanMark(fixed.mark);
  if (fixed.encoding) {
    if (fixed.encoding.x?.axis) fixAxisFormat(fixed.encoding.x.axis);
    if (fixed.encoding.y?.axis) fixAxisFormat(fixed.encoding.y.axis);
  }
  
  return fixed;
}

async function callGeminiWithImage(b64Image, prompt, mime = "image/png") {
  const apiKey = process.env.GOOGLE_API_KEY;
  const candidates = ["gemini-2.5-pro"];
  const body = {
    contents: [
      { role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: mime, data: b64Image } }] }
    ],
    generationConfig: { temperature: 0.05, maxOutputTokens: 80000 }
  };
  let lastErrText = "";
  for (const raw of candidates) {
    const model = normalizeModelId(raw);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) return text;
      lastErrText = JSON.stringify(json);
      continue;
    }
    const txt = await res.text();
    lastErrText = `model=${model} status=${res.status} ${txt}`;
    if (res.status !== 404) break; // only retry on model not found
  }
  throw new Error(`Gemini API error: ${lastErrText}`);
}

async function callGeminiForEdit(spec, instruction) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const candidates = ["gemini-2.5-pro"];
  const prompt = `JSON only:

${JSON.stringify(spec)}

${instruction}`;
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.05, maxOutputTokens: 4000 } };
  let lastErrText = "";
  for (const raw of candidates) {
    const model = normalizeModelId(raw);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
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

async function callGeminiForQA(spec, question) {
  const apiKey = process.env.GOOGLE_API_KEY;
  const candidates = ["gemini-2.5-pro"];
  const prompt = `You are a helpful data visualization assistant. You will be given a Vega-Lite JSON spec and a user question. Answer the question briefly in Korean using ONLY the information derivable from the spec (data.values, encodings, titles, ranges). Do not output JSON, only a short natural language answer.\n\nSPEC:\n${JSON.stringify(spec)}\n\nQUESTION:\n${question}`;
  const body = { contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 256 } };
  let lastErrText = "";
  for (const raw of candidates) {
    const model = normalizeModelId(raw);
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      if (text) return text;
      lastErrText = JSON.stringify(json);
      continue;
    }
    const txt = await res.text();
    lastErrText = `model=${model} status=${res.status} ${txt}`;
    if (res.status !== 404) break;
  }
  throw new Error(`Gemini QA error: ${lastErrText}`);
}

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Simple root message so hitting http://localhost:4000 shows something useful
app.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Image2Graph API is running. Open the web app at http://localhost:5173");
});

app.post("/api/convert", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      console.error("/api/convert: missing file field 'image'", { bodyKeys: Object.keys(req.body || {}) });
      return res.status(400).json({ error: "image required", hint: "send multipart/form-data with field name 'image'" });
    }
    if (!process.env.GOOGLE_API_KEY) {
      // Offline/dev fallback: return a simple spec so UI flows work without API key
      const fallback = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Offline fallback chart",
        title: "Sample Bar Chart (offline)",
        width: 520,
        height: 320,
        data: { values: [
          { category: "A", value: 12 },
          { category: "B", value: 7 },
          { category: "C", value: 18 }
        ] },
        mark: { type: "bar" },
        encoding: {
          x: { field: "category", type: "nominal", axis: { labelAngle: 0 } },
          y: { field: "value", type: "quantitative" },
          color: { field: "category", type: "nominal", scale: { domain: ["A","B","C"], range: ["#4e79a7","#f28e2b","#e15759"] } }
        },
        background: "#ffffff"
      };
      return res.json({ spec: fallback, offline: true });
    }
    const instruction = req.body?.instruction;
    const mime = req.file.mimetype || "image/png";
    const b64 = req.file.buffer.toString("base64");
    const prompt = buildPrompt(instruction);
    writeLog("convert-input", { instruction, mime, prompt });
    const out = await callGeminiWithImage(b64, prompt, mime);
    let spec;
    try {
      spec = JSON.parse(out);
    } catch {
      const m = out.match(/\{[\s\S]*\}/);
      spec = m ? JSON.parse(m[0]) : JSON.parse(out);
    }
    // If Gemini wrapped the spec in a "spec" field, unwrap it
    while (spec && spec.spec && typeof spec.spec === 'object') {
      spec = spec.spec;
      console.warn('Gemini wrapped spec in extra layer, unwrapping...');
    }
    // Fix common spec issues before returning
    spec = fixSpec(spec);
    
    // Log raw spec directly (ready to copy-paste into Vega-Lite editor)
    writeLog("convert-output", spec);
    
    // Return spec wrapped in {spec: ...} for frontend
    res.json({ spec });
  } catch (e) {
    console.error("/api/convert error", e);
    writeLog("convert-error", { message: e?.message, stack: e?.stack });
    res.status(500).json({ error: e?.message || "convert failed", stack: e?.stack });
  }
});

// Minimal debug endpoint to verify API key and outbound connectivity
app.get("/api/debug", async (_req, res) => {
  try {
    const apiKeyPresent = Boolean(process.env.GOOGLE_API_KEY && process.env.GOOGLE_API_KEY.startsWith("AIza"));
    const model = normalizeModelId(process.env.MODEL_ID || "gemini-1.5-pro");
    let ping = null;
    if (apiKeyPresent) {
      const body = {
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8 }
      };
      const r = await fetch(`https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${process.env.GOOGLE_API_KEY}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      ping = { ok: r.ok, status: r.status, text: await r.text() };
    }
    res.json({ apiKeyPresent, model, ping });
  } catch (e) {
    res.status(500).json({ error: e?.message || "debug failed" });
  }
});

// List available models from Google AI Studio to pick a valid model id
app.get("/api/models", async (_req, res) => {
  try {
    if (!process.env.GOOGLE_API_KEY) return res.status(500).json({ error: "missing GOOGLE_API_KEY" });
    const url = `https://generativelanguage.googleapis.com/v1/models?key=${process.env.GOOGLE_API_KEY}`;
    const r = await fetch(url);
    const raw = await r.text();
    if (!r.ok) return res.status(r.status).send(raw);
    const json = JSON.parse(raw);
    const models = (json.models || []).map((m) => ({
      name: m.name, // e.g., models/gemini-1.5-pro-latest
      displayName: m.displayName,
      description: m.description,
      inputTokenLimit: m.inputTokenLimit,
      outputTokenLimit: m.outputTokenLimit,
      supportedGenerationMethods: m.supportedGenerationMethods
    }));
    res.json({ models });
  } catch (e) {
    res.status(500).json({ error: e?.message || "list models failed" });
  }
});

app.post("/api/edit", async (req, res) => {
  try {
    const { spec, instruction } = req.body || {};
    if (!spec || !instruction) return res.status(400).json({ error: "spec and instruction required" });
    if (!process.env.GOOGLE_API_KEY) {
      // Offline/dev fallback: apply a couple of predictable tweaks client-side
      const next = JSON.parse(JSON.stringify(spec));
      try { next.title = instruction || next.title || "Edited Chart"; } catch {}
      try {
        if (next?.encoding?.color && !next.encoding.color.scale) {
          next.encoding.color.scale = { range: ["#4e79a7","#f28e2b","#e15759","#76b7b2"] };
        }
      } catch {}
      writeLog("edit-offline", { instruction, spec: next });
      return res.json({ spec: next, offline: true });
    }
    writeLog("edit-input", { instruction, spec });
    const out = await callGeminiForEdit(spec, instruction);
    let updated;
    try {
      let txt = String(out);
      // remove all code fences variants
      txt = txt.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
      // quick path parse
      updated = JSON.parse(txt);
    } catch {
      // fallback: extract first JSON object from the whole text
      let s = String(out).replace(/```[\s\S]*?```/g, '');
      const start = s.indexOf('{');
      const end = s.lastIndexOf('}');
      if (start >= 0 && end > start) {
        const slice = s.slice(start, end + 1);
        try {
          updated = JSON.parse(slice);
        } catch {
          // Try to fix common JSON issues
          let fixed = slice
            .replace(/,\s*}/g, '}')  // trailing commas
            .replace(/,\s*]/g, ']')   // trailing commas in arrays
            .replace(/(\w+):/g, '"$1":')  // unquoted keys
            .replace(/'/g, '"');      // single quotes to double quotes
          updated = JSON.parse(fixed);
        }
      } else {
        throw new Error('model returned non-JSON');
      }
    }
    writeLog("edit-output", { spec: updated });
    res.json({ spec: updated });
  } catch (e) {
    const snippet = (req && req.body && typeof req.body.instruction === 'string') ? req.body.instruction.slice(0, 140) : '';
    writeLog("edit-error", { message: e?.message, snippet });
    res.status(500).json({ error: e?.message || "edit failed", hint: '모델 응답이 JSON이 아닙니다. 지시어를 간단히 써보세요.' });
  }
});

// QA endpoint: answer questions about current spec without returning a new spec
app.post("/api/generate", async (req, res) => {
  try {
    const { instruction } = req.body || {};
    if (!instruction) return res.status(400).json({ error: "instruction required" });
    if (!process.env.GOOGLE_API_KEY) {
      // Offline/dev fallback: generate a simple chart using the instruction as title
      const spec = {
        $schema: "https://vega.github.io/schema/vega-lite/v5.json",
        description: "Offline generated chart",
        title: instruction || "Generated Chart",
        width: 520,
        height: 320,
        data: { values: [
          { category: "Q1", value: 10 },
          { category: "Q2", value: 16 },
          { category: "Q3", value: 8 },
          { category: "Q4", value: 14 }
        ] },
        mark: { type: "bar" },
        encoding: {
          x: { field: "category", type: "nominal", axis: { labelAngle: 0 } },
          y: { field: "value", type: "quantitative" },
          color: { field: "category", type: "nominal" }
        }
      };
      writeLog("generate-offline", { instruction, spec });
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

    writeLog("generate-input", { instruction, prompt });
    const out = await callGeminiForEdit({}, prompt);
    let spec;
    try {
      spec = JSON.parse(out);
    } catch (e) {
      console.log("JSON parse error, trying to extract JSON from response:", e.message);
      console.log("Raw response:", out);
      // Try to extract JSON from the response
      const jsonMatch = out.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          spec = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.log("Failed to parse extracted JSON:", e2.message);
          throw new Error(`Invalid JSON response: ${e.message}`);
        }
      } else {
        throw new Error(`No JSON found in response: ${e.message}`);
      }
    }
    writeLog("generate-output", { spec });
    res.json({ spec });
  } catch (e) {
    console.error("/api/generate error", e);
    writeLog("generate-error", { message: e?.message, stack: e?.stack });
    res.status(500).json({ error: e?.message || "generate failed", stack: e?.stack });
  }
});

// QA endpoint: answer questions about current spec without returning a new spec
app.post("/api/ask", async (req, res) => {
  try {
    const { spec, question } = req.body || {};
    if (!spec || !question) return res.status(400).json({ error: "spec and question required" });
    writeLog("ask-input", { question, spec });
    const answer = await callGeminiForQA(spec, question);
    writeLog("ask-output", { answer });
    res.json({ answer });
  } catch (e) {
    writeLog("ask-error", { message: e?.message });
    res.status(500).json({ error: e?.message || "ask failed" });
  }
});

const primaryPort = Number(process.env.PORT) || 4000;
const mirrorPort = 4001; // expose a mirror to avoid port conflicts

function startOn(port) {
  const server = http.createServer(app);
  server.on("error", (err) => {
    if (err && (err.code === "EADDRINUSE")) {
      console.warn(`port ${port} is in use, skipping mirror on this port.`);
      return;
    }
    console.error(`server error on ${port}:`, err);
  });
  server.listen(port, () => console.log(`server on ${port}`));
}

// Start on primary and mirror. If one is occupied, the other should still work.
startOn(primaryPort);
if (mirrorPort !== primaryPort) startOn(mirrorPort);


