import { sessionConfig, cookie, verifyToken } from '../lib/auth.js';

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Cookie');
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const { GITHUB_ALLOWED_LOGIN, SESSION_SECRET } = sessionConfig();
    const session = verifyToken(cookie(req, 'cam_session'), SESSION_SECRET);
    if (!session?.login || session.login.toLowerCase() !== GITHUB_ALLOWED_LOGIN.toLowerCase()) return res.status(401).json({ error: 'unauthorized' });
    return res.status(200).json({ user: { login: session.login } });
  } catch {
    return res.status(503).json({ error: 'auth_not_configured' });
  }
}
