import express from "express";
import cors from "cors";
import multer from "multer";
import fetch from "node-fetch";
import dotenv from "dotenv";
import http from "http";
import { writeLog } from "./lib/logger.js";
import { buildPrompt, normalizeModelId } from "./lib/prompts.js";
import { fixSpec } from "./lib/specFixes.js";
import { callGeminiWithImage, callGeminiForEdit, callGeminiForQA } from "./lib/gemini.js";
import { createHealthRoute } from "./routes/health.js";
import { createRootRoute } from "./routes/root.js";
import { createConvertRoute } from "./routes/convert.js";
import { createDebugRoute } from "./routes/debug.js";
import { createModelsRoute } from "./routes/models.js";
import { createEditRoute } from "./routes/edit.js";
import { createGenerateRoute } from "./routes/generate.js";
import { createAskRoute } from "./routes/ask.js";

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

// Mount modular routes
app.use(createHealthRoute());
app.use(createRootRoute());
app.use(createConvertRoute({ upload }));

// Minimal debug endpoint to verify API key and outbound connectivity
app.use(createDebugRoute());

// List available models from Google AI Studio to pick a valid model id
app.use(createModelsRoute());

app.use(createEditRoute());

// QA endpoint: answer questions about current spec without returning a new spec
app.use(createGenerateRoute());

// QA endpoint: answer questions about current spec without returning a new spec
app.use(createAskRoute());

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


