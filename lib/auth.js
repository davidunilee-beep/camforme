import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const SESSION_SECONDS = 60 * 60 * 12;
const STATE_SECONDS = 60 * 10;

function config() {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_ALLOWED_LOGIN, SESSION_SECRET } = process.env;
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET || !GITHUB_ALLOWED_LOGIN || !SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error('Missing OAuth/session environment variables');
  }
  return { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_ALLOWED_LOGIN, SESSION_SECRET };
}

const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('base64url');
const constantEqual = (left, right) => {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
};

export function cookie(req, name) {
  const header = req.headers.cookie || '';
  const prefix = `${name}=`;
  for (const item of header.split(';')) {
    const part = item.trim();
    if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
  }
  return '';
}

export function signedToken(payload, secret) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${body}.${sign(body, secret)}`;
}

export function verifyToken(token, secret) {
  if (!token) return null;
  const [body, signature, extra] = token.split('.');
  if (!body || !signature || extra || !constantEqual(signature, sign(body, secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

export function sessionConfig() {
  return { ...config(), SESSION_SECONDS };
}

export function newOAuthState(secret) {
  const nonce = randomBytes(32).toString('base64url');
  return { nonce, token: signedToken({ nonce, exp: Math.floor(Date.now() / 1000) + STATE_SECONDS }, secret) };
}

export function validOAuthState(token, nonce, secret) {
  const payload = verifyToken(token, secret);
  return Boolean(payload?.nonce && nonce && constantEqual(payload.nonce, nonce));
}

export function safeReturnHost(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  return /^[a-z0-9.-]+(?::\d+)?$/i.test(host) ? host : '';
}

export function cookieOptions(maxAge) {
  return `Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearCookieOptions() {
  return 'Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

export function originAllowed(req) {
  const origin = req.headers.origin;
  const host = safeReturnHost(req);
  return !origin || (host && new URL(origin).host.toLowerCase() === host.toLowerCase());
}

export function randomStateSecret() {
  return randomBytes(32).toString('base64url');
}
