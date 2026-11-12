import { clearCookieOptions, originAllowed } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!originAllowed(req)) return res.status(403).end();
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Set-Cookie', `cam_session=; ${clearCookieOptions()}`);
  return res.status(204).end();
}
