'use strict';

// Twitch EventSub over WebSocket — channel point reward redemptions.
// The OAuth lifecycle lives here too: browser-flow token exchange, silent
// refresh before expiry, and persistence to config/ (gitignored — it holds
// secrets). server.js wires onRedemption into the SSE feed the overlay
// pages subscribe to.
//
// Docs: https://dev.twitch.tv/docs/eventsub/handling-websocket-events/

const fs = require('node:fs');
const path = require('node:path');
const { WebSocket } = require('ws');
const secrets = require('./secrets');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const APP_FILE = path.join(CONFIG_DIR, 'twitch.json'); // app creds: { clientId, clientSecret }
const AUTH_FILE = path.join(CONFIG_DIR, 'twitch-auth.json'); // tokens + broadcaster identity
const SCOPES = ['channel:read:redemptions', 'channel:manage:redemptions', 'user:write:chat', 'moderator:read:followers'];
const EVENTSUB_WS_URL = 'wss://eventsub.wss.twitch.tv/ws';
const HELIX_URL = 'https://api.twitch.tv/helix';
const AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const REDEMPTION_TYPE = 'channel.channel_points_custom_reward_redemption.add';
const FOLLOW_TYPE = 'channel.follow'; // v2 (condition: broadcaster + moderator) — needs moderator:read:followers (one re-auth)

const CONNECT_TIMEOUT_MS = 15000; // give up on a socket that never says hello
const RETRY_DELAYS_MS = [1000, 2000, 5000, 10000, 30000]; // capped backoff

// --- logging ---------------------------------------------------------------

const log = (...parts) => console.log('[eventsub]', ...parts);
const warn = (...parts) => console.warn('[eventsub]', ...parts);

// --- persisted state -------------------------------------------------------

const readJson = (file) => {
  try {
    let text = fs.readFileSync(file, 'utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM tolerance
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const writeJson = (file, data) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 });
};

// App credentials: secrets.ensureLoaded() runs at startup — it reads
// config/twitch.json or decrypts config/twitch.json.aes (passphrase prompt)
// into memory. Env vars override whichever source.
const loadApp = () => {
  const file = secrets.get();
  return {
    clientId: process.env.TWITCH_CLIENT_ID || file.clientId || '',
    clientSecret: process.env.TWITCH_CLIENT_SECRET || file.clientSecret || '',
    redirectUri: process.env.TWITCH_REDIRECT_URI || file.redirectUri || '',
  };
};

const readAuth = () => readJson(AUTH_FILE);
const writeAuth = (auth) => writeJson(AUTH_FILE, auth);

// The OAuth redirect URL must match the one registered in the dev console
// exactly — character for character (Twitch rejects the flow otherwise, and
// yes, that includes trailing slashes and localhost vs 127.0.0.1). Defaults
// to the local server's callback; a config/twitch.json "redirectUri" or
// TWITCH_REDIRECT_URI pins it to whatever the dev console actually has.
const redirectUri = () =>
  process.env.TWITCH_REDIRECT_URI ||
  loadApp().redirectUri ||
  `http://localhost:${process.env.PORT || 3000}/auth/twitch/callback`;

const authorizeUrl = () => {
  const app = loadApp();
  return `${AUTHORIZE_URL}?${new URLSearchParams({
    client_id: app.clientId,
    redirect_uri: redirectUri(),
    response_type: 'code',
    scope: SCOPES.join(' '),
  })}`;
};

// --- OAuth token lifecycle -------------------------------------------------

const tokenPost = (params) =>
  fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });

// Exchange the browser-flow ?code= for tokens, stash them, and connect.
async function exchangeCode(code) {
  const app = loadApp();
  if (!app.clientId || !app.clientSecret) {
    throw new Error('Twitch app credentials missing — create config/twitch.json with clientId and clientSecret');
  }

  const res = await tokenPost({
    client_id: app.clientId,
    client_secret: app.clientSecret,
    code,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri(),
  });
  if (!res.ok) {
    throw new Error(`token exchange failed (${res.status}) — check the redirect URI matches the dev console exactly`);
  }
  const data = await res.json();

  const auth = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 4 * 3600) * 1000,
    obtainedAt: Date.now(),
    scope: data.scope ?? SCOPES,
  };
  try {
    auth.broadcaster = await fetchMe(app, auth.accessToken);
  } catch (err) {
    warn(`could not resolve broadcaster id: ${err.message}`);
  }
  writeAuth(auth);
  retryIndex = 0;
  connect();
  return { broadcaster: auth.broadcaster ?? null, scope: auth.scope };
}

// Refresh-token flow. Twitch rotates the refresh token on every use, so the
// new one always replaces the old.
async function refreshAuth() {
  const app = loadApp();
  const auth = readAuth();
  if (!app.clientSecret || !auth?.refreshToken) return false;

  const res = await tokenPost({
    client_id: app.clientId,
    client_secret: app.clientSecret,
    grant_type: 'refresh_token',
    refresh_token: auth.refreshToken,
  });
  if (!res.ok) {
    warn(`token refresh failed (${res.status}) — visit /auth/twitch to re-authorize`);
    return false;
  }
  const data = await res.json();
  writeAuth({
    ...auth,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 4 * 3600) * 1000,
    refreshedAt: Date.now(),
  });
  log('access token refreshed');
  return true;
}

// A valid access token, silently refreshed when within a minute of expiring.
async function accessToken() {
  const auth = readAuth();
  if (!auth?.accessToken) return null;
  if (auth.expiresAt && Date.now() >= auth.expiresAt - 60_000) {
    return (await refreshAuth()) ? readAuth()?.accessToken ?? null : null;
  }
  return auth.accessToken;
}

// --- Helix helpers ----------------------------------------------------------

// One fetch with auth headers; on a stale token, refresh once and retry.
async function helix(pathname, init = {}, retried = false) {
  const app = loadApp();
  const token = await accessToken();
  if (!token) return { status: 401, body: null };
  const res = await fetch(`${HELIX_URL}${pathname}`, {
    ...init,
    headers: {
      'Client-Id': app.clientId,
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  if (res.status === 401 && !retried && (await refreshAuth())) {
    return helix(pathname, init, true);
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    // DELETE responses have no body — fine
  }
  return { status: res.status, body };
}

async function fetchMe(app, token) {
  const res = await fetch(`${HELIX_URL}/users`, {
    headers: { 'Client-Id': app.clientId, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`/users returned ${res.status}`);
  const data = await res.json();
  const user = data?.data?.[0];
  if (!user) throw new Error('/users returned no data');
  return { id: user.id, login: user.login, name: user.display_name };
}

// A dead session's subscription lingers and blocks re-subscribing with 409 —
// sweep stale websocket subscriptions for our type, then retry once.
async function subscribe(sessionId) {
  const auth = readAuth();
  const broadcasterId = auth?.broadcaster?.id;
  if (!sessionId || !broadcasterId) {
    warn('cannot subscribe yet — waiting for session welcome and broadcaster id');
    return;
  }

  const post = (type, version, condition) =>
    helix('/eventsub/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        version,
        condition,
        transport: { method: 'websocket', session_id: sessionId },
      }),
    });

  // Both of our subscription types get the same 409 treatment: a dead
  // session's lingering subscription blocks re-subscribing. Sweep the stale
  // ones and retry; if the old session's subscriptions are still marked
  // enabled (Twitch notices a dead socket on its own schedule), wait and
  // sweep again. A last-resort delayed attempt follows — giving up entirely
  // means events are lost until the NEXT reconnect, which is the worst
  // possible state for a live trigger feed.
  const createWithSweep = async (type, version, condition, describe) => {
    const attempt = async () => post(type, version, condition);
    let { status, body } = await attempt();
    for (let round = 0; status === 409 && round < 6; round++) {
      log(`${type} already exists on a dead session — sweeping and retrying (${round + 1})`);
      const list = await helix('/eventsub/subscriptions');
      const stale = (list.body?.data ?? []).filter(
        (sub) => sub.type === type && sub.transport?.method === 'websocket' && sub.status !== 'enabled',
      );
      for (const sub of stale) {
        await helix(`/eventsub/subscriptions?id=${sub.id}`, { method: 'DELETE' });
      }
      // Twitch marks a just-died session's subscriptions disconnected on its
      // own schedule — give it a beat before re-checking.
      await new Promise((resolve) => setTimeout(resolve, 5000));
      ({ status, body } = await attempt());
    }
    if (status === 409) {
      // Still colliding after ~30s of sweeps — one more attempt after a
      // minute before conceding to the next reconnect.
      warn(`${type} still colliding — one delayed retry in 60s`);
      await new Promise((resolve) => setTimeout(resolve, 60_000));
      ({ status, body } = await attempt());
    }
    if (status === 200 || status === 202) {
      log(`subscribed to ${type} for ${auth.broadcaster.login}${describe ?? ''}`);
    } else {
      warn(`${type} subscription failed (${status})`, JSON.stringify(body?.detail ?? body?.message ?? body));
    }
  };

  await createWithSweep(REDEMPTION_TYPE, '1', { broadcaster_user_id: broadcasterId });

  // Follow triggers (slop tickets #3/#4). The broadcaster is their own
  // moderator, so moderator_user_id = broadcaster_id. A token from before
  // the scope change gets a 403 here — the subscription (and follow
  // triggers) stay dormant until one re-auth at /auth/twitch; redemptions
  // are unaffected.
  await createWithSweep(FOLLOW_TYPE, '2', {
    broadcaster_user_id: broadcasterId,
    moderator_user_id: broadcasterId,
  }, ' (follow triggers live)');
}

// --- WebSocket connection ---------------------------------------------------

let socket = null; // the live EventSub socket (may briefly differ mid-handover)
let sessionId = null;
let keepaliveMs = 10000;
let keepaliveTimer = null;
let reconnectTimer = null;
let retryIndex = 0;
let onRedemption = null; // wired by server.js
let onEvent = null; // wired by server.js — (type, payload) for non-redemption events

const stopKeepalive = () => {
  if (keepaliveTimer) {
    clearTimeout(keepaliveTimer);
    keepaliveTimer = null;
  }
};

const resetKeepalive = () => {
  stopKeepalive();
  keepaliveTimer = setTimeout(() => {
    warn(`no keepalive for ${Math.round(keepaliveMs / 1000) + 5}s — reconnecting`);
    try {
      socket?.close();
    } catch {
      // close handler takes over from here
    }
  }, keepaliveMs + 5000);
};

const scheduleReconnect = () => {
  if (reconnectTimer) return;
  const delay = RETRY_DELAYS_MS[Math.min(retryIndex, RETRY_DELAYS_MS.length - 1)];
  retryIndex += 1;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, delay);
  log(`reconnecting in ${Math.round(delay / 1000)}s`);
};

const normalizeRedemption = (event) => ({
  id: event.id,
  at: Date.now(),
  user: {
    id: event.user_id,
    login: event.user_login,
    name: event.user_name,
  },
  reward: {
    id: event.reward?.id,
    title: event.reward?.title ?? 'Unknown reward',
    cost: event.reward?.cost ?? 0,
    prompt: event.reward?.prompt ?? '',
  },
  input: event.user_input || '',
  status: event.status,
  redeemedAt: event.redeemed_at ? Date.parse(event.redeemed_at) : Date.now(),
});

// Attach the shared message/close handlers to any socket — the reconnect
// handover opens a second socket that needs the exact same wiring.
const wire = (sock) => {
  sock.on('open', () => {
    // A socket that never receives its welcome is dead weight — close it and
    // let the close handler schedule a retry.
    sock._connectTimer = setTimeout(() => {
      warn('no welcome within 15s — closing');
      try {
        sock.close();
      } catch {
        // already gone
      }
    }, CONNECT_TIMEOUT_MS);
  });
  sock.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    resetKeepalive();
    switch (msg.metadata?.message_type) {
      case 'session_welcome': {
        clearTimeout(sock._connectTimer);
        // Reconnect handover: adopt the new socket, retire the old one.
        if (socket && socket !== sock) {
          try {
            socket.close();
          } catch {
            // already gone
          }
        }
        socket = sock;
        sessionId = msg.payload.session.id;
        keepaliveMs = (msg.payload.session.keepalive_timeout_seconds || 10) * 1000;
        retryIndex = 0; // a welcome means Twitch is reachable again
        log('session established');
        // On handover the subscriptions transfer across; only a fresh
        // connection needs to subscribe.
        if (!sock._transfer) {
          subscribe(sessionId);
        }
        break;
      }
      case 'session_reconnect': {
        const url = msg.payload.session.reconnect_url;
        log('server requested reconnect — opening handover socket');
        const replacement = new WebSocket(url);
        replacement._transfer = true; // subscriptions move over, don't re-post
        wire(replacement);
        socket = replacement; // old socket's close is now a no-op
        break;
      }
      case 'notification': {
        if (msg.payload.subscription?.type === REDEMPTION_TYPE) {
          const reward = normalizeRedemption(msg.payload.event);
          log(`redeem: ${reward.user.login} → ${reward.reward.title}${reward.input ? ` (${reward.input})` : ''}`);
          onRedemption?.(reward);
        } else if (msg.payload.subscription?.type === FOLLOW_TYPE) {
          const login = msg.payload.event?.user_login ?? 'someone';
          log(`follow: ${login}`);
          onEvent?.('follow', { login, userId: msg.payload.event?.user_id ?? null });
        }
        break;
      }
      case 'revocation': {
        warn(`subscription revoked (${msg.payload.subscription?.status}) — re-authorize at /auth/twitch`);
        break;
      }
      default:
        break; // session_keepalive and anything unknown
    }
  });
  sock.on('close', () => {
    clearTimeout(sock._connectTimer);
    if (sock !== socket) return; // a superseded handover socket — ignore
    socket = null;
    sessionId = null;
    stopKeepalive();
    scheduleReconnect();
  });
  sock.on('error', (err) => warn(`socket error: ${err.message}`));
};

const connect = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  const app = loadApp();
  const auth = readAuth();
  if (!app.clientId || !app.clientSecret) {
    log('no app credentials — create config/twitch.json (see /auth/twitch for help)');
    return;
  }
  if (!auth?.accessToken || !auth?.broadcaster) {
    log('not authorized yet — visit /auth/twitch to connect your channel');
    return;
  }
  if (socket && socket.readyState !== WebSocket.CLOSED) return;

  const sock = new WebSocket(EVENTSUB_WS_URL);
  sock._transfer = false;
  wire(sock);
  socket = sock;
  log('connecting…');
};

// Fire a fake redemption through the same pipeline — lets overlays be tested
// without redeeming real channel points.
const testRedemption = (overrides = {}) => {
  const reward = normalizeRedemption({
    id: `test-${Date.now().toString(36)}`,
    user_id: '0',
    user_login: overrides.user || 'TestViewer',
    user_name: overrides.user || 'TestViewer',
    user_input: overrides.input ?? 'test redemption',
    status: 'fulfilled',
    redeemed_at: new Date().toISOString(),
    reward: {
      id: 'test-reward',
      title: overrides.title || 'Test Reward',
      cost: overrides.cost || 100,
      prompt: 'Fired from /api/rewards/test — not a real redemption',
    },
  });
  onRedemption?.(reward);
  return reward;
};

const status = () => {
  const app = loadApp();
  const auth = readAuth();
  return {
    configured: Boolean(app.clientId && app.clientSecret),
    authorized: Boolean(auth?.accessToken),
    connected: Boolean(socket && socket.readyState === WebSocket.OPEN && sessionId),
    broadcaster: auth?.broadcaster ?? null,
    expiresAt: auth?.expiresAt ?? null,
    scopes: SCOPES,
    redirectUri: redirectUri(),
    authorizeUrl: app.clientId ? authorizeUrl() : null,
  };
};

// The broadcaster's custom channel point rewards — powers the deck's
// redeem picker in the slop settings modal.
async function listCustomRewards() {
  const auth = readAuth();
  const broadcasterId = auth?.broadcaster?.id;
  if (!broadcasterId) {
    throw new Error('not authorized yet');
  }
  const { status: code, body } = await helix(
    `/channel_points/custom_rewards?broadcaster_id=${broadcasterId}`,
  );
  if (code !== 200) {
    throw new Error(`custom rewards fetch failed (${code}): ${body?.message ?? ''}`);
  }
  return (body?.data ?? []).map((reward) => ({
    id: reward.id,
    title: reward.title,
    cost: reward.cost,
    isEnabled: reward.is_enabled,
    userInputRequired: reward.is_user_input_required,
  }));
}

// Fulfill or refund (CANCELED — Twitch auto-refunds the points) a channel
// point redemption. Used by the slop queue on approve/reject/generation-fail.
async function updateRedemptionStatus(redemptionId, status) {
  const auth = readAuth();
  const broadcasterId = auth?.broadcaster?.id;
  if (!redemptionId || !broadcasterId) {
    throw new Error('cannot update redemption — not authorized yet');
  }
  const { status: code, body } = await helix(
    `/channel_points/custom_rewards_redemptions?id=${redemptionId}&broadcaster_user_id=${broadcasterId}`,
    { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) },
  );
  if (code !== 200) {
    throw new Error(`redemption ${status.toLowerCase()} failed (${code}): ${body?.message ?? ''}`);
  }
  return body?.data?.[0] ?? null;
}

// Post in the channel as the broadcaster — how the bot announces new slops
// (chat can't be written by the anonymous read-only IRC connection). Needs
// the user:write:chat scope; no separate bot account required.
async function sendChatMessage(text) {
  const auth = readAuth();
  const broadcasterId = auth?.broadcaster?.id;
  if (!broadcasterId) {
    throw new Error('not authorized yet');
  }
  const { status: code, body } = await helix('/chat/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      broadcaster_id: broadcasterId,
      sender_id: broadcasterId,
      message: text.slice(0, 480),
    }),
  });
  if (code !== 200) {
    throw new Error(`chat send failed (${code}): ${body?.message ?? ''}`);
  }
  const sent = body?.data?.[0];
  if (!sent?.is_sent) {
    throw new Error(`message dropped: ${sent?.drop_reason?.message ?? 'unknown reason'}`);
  }
  return sent;
}

const init = ({ onRedemption: handler, onEvent: eventHandler } = {}) => {
  onRedemption = handler;
  onEvent = eventHandler;
  if (readAuth()?.accessToken) connect();
  return { connect, status, testRedemption };
};

module.exports = {
  init,
  connect,
  status,
  testRedemption,
  exchangeCode,
  authorizeUrl,
  redirectUri,
  updateRedemptionStatus,
  sendChatMessage,
  listCustomRewards,
};
