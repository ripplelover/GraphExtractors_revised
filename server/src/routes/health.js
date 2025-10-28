import express from 'express';

export function createHealthRoute() {
  const r = express.Router();
  r.get('/api/health', (_req, res) => res.json({ ok: true }));
  return r;
}

