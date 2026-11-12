import { sessionConfig, newOAuthState, cookieOptions, safeReturnHost } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    const { GITHUB_CLIENT_ID, SESSION_SECRET } = sessionConfig();
    const host = safeReturnHost(req);
    if (!host) return res.status(400).end('Invalid host');
    const { nonce, token } = newOAuthState(SESSION_SECRET);
    res.setHeader('Set-Cookie', [
      `cam_oauth_state=${encodeURIComponent(token)}; ${cookieOptions(600)}`,
      `cam_oauth_nonce=${encodeURIComponent(nonce)}; ${cookieOptions(600)}`,
    ]);
    const redirect = new URL('https://github.com/login/oauth/authorize');
    redirect.searchParams.set('client_id', GITHUB_CLIENT_ID);
    redirect.searchParams.set('redirect_uri', `https://${host}/api/callback`);
    redirect.searchParams.set('scope', 'read:user');
    redirect.searchParams.set('state', nonce);
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, redirect.toString());
  } catch {
    res.redirect(302, '/?auth=error');
  }
}
