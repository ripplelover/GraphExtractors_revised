import express from 'express';

export function createRootRoute() {
  const r = express.Router();
  r.get('/', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('Image2Graph API is running. Open the web app at http://localhost:5173');
  });
  return r;
}

