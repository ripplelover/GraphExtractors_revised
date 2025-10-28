import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname reliably under ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Place logs under server/logs relative to this file
const logsDir = path.resolve(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

export function writeLog(kind, obj) {
  try {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const file = path.join(logsDir, `${ts}-${kind}.json`);
    fs.writeFileSync(file, JSON.stringify(obj, null, 2));
  } catch { /* ignore logging errors */ }
}

