import type { NextApiRequest, NextApiResponse } from 'next';

// A same-origin proxy keeps deployment URLs and server credentials out of the browser.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const parts = req.query.path;
  const path = Array.isArray(parts) ? parts.join('/') : parts || '';
  const allowed = req.method === 'POST' && path === 'routes/estimate' || req.method === 'GET' && /^(health|geocode|jobs\/[a-f0-9]{32}(\/result)?)$/.test(path);
  if (!allowed) return res.status(404).json({ detail: 'Endpoint not found.' });
  const base = (process.env.BACKEND_BASE_URL || process.env.NEXT_PUBLIC_BACKEND_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
  const target = new URL(`${base}/api/v1/${path}`);
  if (path === 'geocode' && typeof req.query.query === 'string') target.searchParams.set('query', req.query.query);
  res.setHeader('Cache-Control', 'no-store');
  try {
    const upstream = await fetch(target, {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? JSON.stringify(req.body) : undefined,
      signal: AbortSignal.timeout(45000),
    });
    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch {
    return res.status(502).json({ detail: 'Routing API is unavailable. Check the backend deployment and try again.' });
  }
}

export const config = { api: { bodyParser: { sizeLimit: '32kb' } }, maxDuration: 60 };
