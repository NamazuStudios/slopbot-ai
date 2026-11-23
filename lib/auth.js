'use strict';

// Per-user Twitch OAuth login (ticket 02), following the Namazu Elements
// manual's Twitch OIDC browser-redirect flow
// (NamazuStudios/elements-manual → "Setting Up Twitch OIDC Login (Backend)"):
//
//   - the redirect target is a deterministic callback URL
//     (`{base}/auth/callback` here; Elements uses `/oidc/twitch/callback`)
//   - scopes MUST include `openid` (Twitch only returns an id_token with it)
//     plus `user:read:email`
//   - the token exchange is Client-Secret-POST (not Basic)
//   - Elements verifies identity authoritatively server-side; sessions are
//     bearer credentials the client presents on every call
//
// The channel-level EventSub authorization (/auth/twitch) is a separate
// flow with separate credentials — user login never grants bot rights.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const secrets = require('./secrets');

const ROOT = path.join(__dirname, '..');
const SECRET_FILE = path.join(ROOT, 'config', 'auth-secret.json');

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // a week
const STATE_TTL_MS = 10 * 60 * 1000; // the login round-trip
const COOKIE = 'slopbot_session';
const STATE_COOKIE = 'slopbot_oauth_state';

const AUTHORIZED = 'https://id.twitch.tv/oauth2/authorize';
const TOKEN = 'https://id.twitch.tv/oauth2/token';
const USERS = 'https://api.twitch.tv/helix/users';

let hmacKey = null;

const ensureHmacKey = () => {
  if (hmacKey) return hmacKey;
  try {
    hmacKey = JSON.parse(fs.readFileSync(SECRET_FILE, 'utf8')).key;
  } catch {
    hmacKey = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.dirname(SECRET_FILE), { recursive: true });
    fs.writeFileSync(SECRET_FILE, `${JSON.stringify({ key: hmacKey }, null, 2)}\n`);
  }
  return hmacKey;
};

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const sign = (data) => crypto.createHmac('sha256', ensureHmacKey()).update(data).digest('base64url');

// Stateless signed session token: base64url(payload).hmac — the bearer
// credential the browser presents on every call (Elements sessions work the
// same way; this one rides an HttpOnly cookie instead of a header).
const issueSession = (user) => {
  const payload = {
    sub: user.id,
    login: user.login,
    display: user.display_name,
    image: user.profile_image_url ?? null,
    role: roleFor(user.login),
    exp: Date.now() + SESSION_TTL_MS,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
};

const readSession = (token) => {
  if (!token || typeof token !== 'string') return null;
  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  const expect = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
};

// Roles (ticket 08 adds the full superuser surface): `superuser` (configured
// list), `streamer` (the login matching the configured channel), `viewer`.
// Everything management-shaped requires streamer or superuser.
const roleFor = (login) => {
  const slop = require('./slop');
  const supers = Array.isArray(slop.status().config.superusers) ? slop.status().config.superusers : [];
  if (supers.some((s) => String(s).toLowerCase() === String(login).toLowerCase())) return 'superuser';
  const channel = String(slop.status().config.channel ?? '').toLowerCase();
  // Fresh install (no channel configured): local dev mode — the first login
  // manages the single tenant. Fails closed the moment a channel is set.
  if (!channel) return 'streamer';
  return String(login).toLowerCase() === channel ? 'streamer' : 'viewer';
};

const parseCookies = (header) => {
  const out = {};
  for (const part of String(header ?? '').split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
};

const credentials = () => {
  const cfg = secrets.get() ?? {};
  const clientId = process.env.TWITCH_CLIENT_ID || cfg.clientId || null;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET || cfg.clientSecret || null;
  return { clientId, clientSecret, configured: Boolean(clientId && clientSecret) };
};

// The callback URL must match what is registered with Twitch byte-for-byte
// (the manual's Step 1 rule). Derived from the request when not overridden.
const callbackUri = (req) => {
  const configured = process.env.SLOPBOT_PUBLIC_URL || process.env.ELEMENTS_PUBLIC_URL;
  if (configured) return `${configured.replace(/\/+$/, '')}/auth/callback`;
  const proto = String(req.headers['x-forwarded-proto'] ?? req.protocol ?? 'http').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] ?? req.headers.host ?? 'localhost:3000').split(',')[0].trim();
  return `${proto}://${host}/auth/callback`;
};

const authorizeUrl = (req) => {
  const { clientId } = credentials();
  const state = crypto.randomBytes(16).toString('hex');
  const url = new URL(AUTHORIZED);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUri(req));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid user:read:email');
  url.searchParams.set('state', state);
  return { url: url.toString(), state };
};

// Client-Secret-POST (the manual: tokenEndpointAuthMethod = Client Secret Post).
const exchangeCode = async (code, redirectUri) => {
  const { clientId, clientSecret } = credentials();
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri,
  });
  const res = await fetch(TOKEN, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `token exchange failed (${res.status})`);
  return data;
};

const fetchUser = async (accessToken) => {
  const { clientId } = credentials();
  const res = await fetch(USERS, { headers: { Authorization: `Bearer ${accessToken}`, 'Client-Id': clientId } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !Array.isArray(data.data) || !data.data[0]) throw new Error(`helix/users failed (${res.status})`);
  return data.data[0];
};

// --- Express wiring ---------------------------------------------------------

const cookie = (name, value, maxAgeMs) => {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax'];
  if (maxAgeMs != null) parts.push(`Max-Age=${Math.floor(maxAgeMs / 1000)}`);
  return parts.join('; ');
};

// Parses the session cookie and attaches req.auth ({...payload} | null).
const attach = (req, res, next) => {
  const cookies = parseCookies(req.headers.cookie);
  req.auth = readSession(cookies[COOKIE]);
  req._cookies = cookies;
  next();
};

const setSessionCookie = (res, token) => res.append('Set-Cookie', cookie(COOKIE, token, SESSION_TTL_MS));
const clearSessionCookie = (res) => res.append('Set-Cookie', cookie(COOKIE, '', 0));
const setStateCookie = (res, state) => res.append('Set-Cookie', cookie(STATE_COOKIE, state, STATE_TTL_MS));

const popState = (req) => {
  const cookies = req._cookies ?? parseCookies(req.headers.cookie);
  return cookies[STATE_COOKIE] ?? null;
};

const isManager = (auth) => Boolean(auth && (auth.role === 'streamer' || auth.role === 'superuser'));

// Management gate: every mutating/deck route requires a logged-in user whose
// role is streamer or superuser. Viewers get 403; anonymous gets 401.
const requireManager = (req, res, next) => {
  if (!req.auth) {
    res.status(401).json({ ok: false, error: 'login required', login: '/auth/login' });
    return;
  }
  if (!isManager(req.auth)) {
    res.status(403).json({ ok: false, error: 'this deck belongs to another streamer' });
    return;
  }
  next();
};

const status = (req) => ({
  configured: credentials().configured,
  authenticated: Boolean(req?.auth),
  user: req?.auth ? { login: req.auth.login, display: req.auth.display, image: req.auth.image, role: req.auth.role } : null,
});

module.exports = {
  issueSession,
  readSession,
  attach,
  setSessionCookie,
  clearSessionCookie,
  setStateCookie,
  popState,
  requireManager,
  isManager,
  authorizeUrl,
  exchangeCode,
  fetchUser,
  callbackUri,
  credentials,
  status,
};
