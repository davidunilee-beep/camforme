import { sessionConfig, cookie, validOAuthState, signedToken, cookieOptions, clearCookieOptions, safeReturnHost } from '../lib/auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  const host = safeReturnHost(req);
  if (!host) return res.status(400).end('Invalid host');
  try {
    const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_ALLOWED_LOGIN, SESSION_SECRET, SESSION_SECONDS } = sessionConfig();
    const { code, state, error } = req.query;
    const stateCookie = cookie(req, 'cam_oauth_state');
    const nonceCookie = cookie(req, 'cam_oauth_nonce');
    const valid = !error && typeof code === 'string' && typeof state === 'string'
      && validOAuthState(stateCookie, nonceCookie, SESSION_SECRET)
      && validOAuthState(stateCookie, state, SESSION_SECRET);
    if (!valid) {
      res.setHeader('Set-Cookie', [`cam_oauth_state=; ${clearCookieOptions()}`, `cam_oauth_nonce=; ${clearCookieOptions()}`]);
      return res.redirect(302, '/?auth=denied');
    }

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: GITHUB_CLIENT_ID, client_secret: GITHUB_CLIENT_SECRET, code }),
      signal: AbortSignal.timeout(10000),
    });
    if (!tokenResponse.ok) throw new Error('GitHub token exchange failed');
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('GitHub did not return an access token');

    const userResponse = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      signal: AbortSignal.timeout(10000),
    });
    if (!userResponse.ok) throw new Error('GitHub user lookup failed');
    const user = await userResponse.json();
    if (typeof user.login !== 'string' || user.login.toLowerCase() !== GITHUB_ALLOWED_LOGIN.toLowerCase()) {
      res.setHeader('Set-Cookie', [`cam_oauth_state=; ${clearCookieOptions()}`, `cam_oauth_nonce=; ${clearCookieOptions()}`]);
      return res.redirect(302, '/?auth=denied');
    }

    const now = Math.floor(Date.now() / 1000);
    const session = signedToken({ login: user.login, id: user.id, iat: now, exp: now + SESSION_SECONDS }, SESSION_SECRET);
    res.setHeader('Set-Cookie', [
      `cam_session=${encodeURIComponent(session)}; ${cookieOptions(SESSION_SECONDS)}`,
      `cam_oauth_state=; ${clearCookieOptions()}`,
      `cam_oauth_nonce=; ${clearCookieOptions()}`,
    ]);
    res.setHeader('Cache-Control', 'no-store');
    return res.redirect(302, '/');
  } catch {
    res.setHeader('Set-Cookie', [`cam_oauth_state=; ${clearCookieOptions()}`, `cam_oauth_nonce=; ${clearCookieOptions()}`]);
    return res.redirect(302, '/?auth=error');
  }
}
