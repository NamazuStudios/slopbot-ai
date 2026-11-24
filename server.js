'use strict';

// SlopBot AI — standalone server. This is the single-tenant reference
// implementation: one streamer, one process, the full slop pipeline.
// The multi-tenant Namazu Elements deployment (pod-per-stream, OIDC, MCP
// agent surface) is specified in docs/DESIGN.md and tracked in
// docs/tickets/.

const path = require('node:path');
const http = require('node:http');
const express = require('express');
const eventsub = require('./lib/eventsub');
const secrets = require('./lib/secrets');
const slop = require('./lib/slop');
const auth = require('./lib/auth');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const app = express();
app.use(express.json());

// Per-user Twitch login (ticket 02): parses the session cookie and attaches
// req.auth to every request. Management routes below are gated on it.
app.use(auth.attach);

// Management gate: every deck/operator route requires a logged-in streamer
// (or superuser). Viewer/OBS-facing endpoints (snapshot, events, bundles,
// heartbeats, end reports, cameo plays) stay open on purpose — those are what
// the overlay and the chat audience drive.
const manage = auth.requireManager;

// Twitch OAuth — the browser-redirect flow from the Namazu Elements manual
// ("Setting Up Twitch OIDC Login (Backend)"): deterministic callback URL,
// scopes `openid user:read:email` (openid is mandatory — Twitch returns no
// id_token without it), Client-Secret-POST token exchange, state cookie for
// CSRF. Separate from the channel/bot authorization at /auth/twitch.
app.get('/auth/login', (req, res) => {
  if (!auth.credentials().configured) {
    res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>SlopBot AI — login</title></head>
<body style="background:#0D1335;color:#fff;font-family:system-ui,sans-serif;max-width:44rem;margin:10vh auto;padding:0 1.5rem;line-height:1.6">
<h1 style="color:#FF0099">Login not configured</h1>
<p>Add your Twitch app's <code>clientId</code> and <code>clientSecret</code> to <code>config/twitch.json</code>, and register this exact OAuth Redirect URL in the <a href="https://dev.twitch.tv/console" style="color:#FF0099">Twitch Developer Console</a>:</p>
<p><code>${auth.callbackUri(req)}</code></p>
<p style="color:#8a93c9">It must match byte-for-byte — Twitch rejects any mismatch.</p>
</body></html>`);
    return;
  }
  const { url, state } = auth.authorizeUrl(req);
  auth.setStateCookie(res, state);
  res.redirect(url);
});

app.get('/auth/callback', async (req, res) => {
  const code = String(req.query.code ?? '');
  const state = String(req.query.state ?? '');
  const expectedState = auth.popState(req);
  if (!code || !state || !expectedState || state !== expectedState) {
    res.status(400).type('html').send('<body style="background:#0D1335;color:#fff;font-family:system-ui"><h1 style="color:#FF0099">Login failed</h1><p>Bad or expired state — try again.</p><a href="/auth/login" style="color:#FF0099">Try again</a>');
    return;
  }
  try {
    const tokens = await auth.exchangeCode(code, auth.callbackUri(req));
    const user = await auth.fetchUser(tokens.access_token);
    auth.setSessionCookie(res, auth.issueSession(user));
    res.redirect('/deck');
  } catch (err) {
    res.status(400).type('html').send(`<body style="background:#0D1335;color:#fff;font-family:system-ui"><h1 style="color:#FF0099">Login failed</h1><p>${String(err.message).replace(/[<>&]/g, '')}</p><a href="/auth/login" style="color:#FF0099">Try again</a>`);
  }
});

app.get('/auth/logout', (req, res) => {
  auth.clearSessionCookie(res);
  res.redirect('/');
});

// Who am I? The deck and landing page read this to render their auth bar.
app.get('/api/auth/me', (req, res) => {
  res.json(auth.status(req));
});

// Never cache anything: OBS's embedded browser heuristically caches pages in
// its own profile and keeps booting stale ones across OBS restarts, which
// looks exactly like a broken feature.
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Landing page — Twitch login (placeholder until the marketing page lands).
const INDEX = path.join(__dirname, 'public', 'index.html');
app.get('/', (req, res) => res.sendFile(INDEX));

// The overlay you point an OBS browser source at.
app.get('/slop', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'slop.html'));
});

// The properties screen / deck.
app.get('/deck', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'deck.html'));
});

// Stinger transition — the deck fires these between actions. Kept so the
// deck keeps working standalone; overlays that want the run subscribe at
// /api/stinger/events.
let stingerRun = null;
const stingerClients = new Set(); // open SSE responses

const clampStingerMs = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(2000, Math.max(40, n)) : fallback;
};

app.post('/api/stinger', manage, (req, res) => {
  const body = req.body ?? {};
  const seed = Number(body.seed);
  stingerRun = {
    at: Date.now(),
    now: Date.now(), // pair with `at` so receivers can correct their clock
    style: body.style === 'sweep' ? 'sweep' : 'slash',
    direction: body.direction === -1 ? -1 : 1,
    to: typeof body.to === 'string' ? body.to.slice(0, 100) : null,
    seed: Number.isFinite(seed)
      ? Math.max(0, Math.min(2147483647, Math.round(seed)))
      : Math.floor(Math.random() * 2147483648),
    coverMs: clampStingerMs(body.coverMs, 140),
    holdMs: clampStingerMs(body.holdMs, 280),
    revealMs: clampStingerMs(body.revealMs, 320),
  };
  for (const client of stingerClients) {
    try {
      client.write(`event: trigger\ndata: ${JSON.stringify(stingerRun)}\n\n`);
    } catch {
      stingerClients.delete(client);
    }
  }
  res.json(stingerRun);
});

app.get('/api/stinger', (req, res) => {
  res.json(stingerRun ? { ...stingerRun, now: Date.now() } : { idle: true });
});

app.get('/api/stinger/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write('retry: 500\n\n');
  const snapshot = () => JSON.stringify(stingerRun ? { ...stingerRun, now: Date.now() } : { idle: true });
  res.write(`event: state\ndata: ${snapshot()}\n\n`);
  stingerClients.add(res);
  const heartbeat = setInterval(() => {
    try {
      res.write(': hb\n\n');
    } catch {
      // reaped below when the connection closes
    }
  }, 15000);
  req.on('close', () => {
    clearInterval(heartbeat);
    stingerClients.delete(res);
  });
});

// Channel point redemptions — the EventSub WebSocket lives in
// lib/eventsub.js (with its OAuth lifecycle). The slop machine claims its
// reward; everything else is ignored. One choke point, deduped.
const seenRedemptionIds = new Set(); // EventSub dedupe (at-least-once delivery)
const seenRedemptionOrder = [];

const broadcastReward = (reward) => {
  if (seenRedemptionIds.has(reward.id)) return;
  seenRedemptionIds.add(reward.id);
  seenRedemptionOrder.push(reward.id);
  if (seenRedemptionOrder.length > 500) seenRedemptionIds.delete(seenRedemptionOrder.shift());

  if (slop.matches(reward)) {
    slop.handleRedemption(reward);
  } else {
    slop.dispatchTrigger({ type: 'redemption', login: reward.user?.login, rewardId: reward.reward?.id ?? null });
  }
};

// The Twitch event handlers, shared by both init calls below — the early
// one wires callbacks before credentials exist (it can't connect yet), the
// post-secrets one actually connects. Both must carry the same callbacks or
// the second init silently orphans the first wiring (that's how follow
// triggers died while redemptions kept working).
const onTwitchRedemption = (reward) => broadcastReward(reward);
const onTwitchEvent = (type, payload) => slop.dispatchTrigger({ type, ...payload });

eventsub.init({
  onRedemption: onTwitchRedemption,
  onEvent: onTwitchEvent,
});

// The dedicated feed server: SSE connections live on their own port, so the
// per-host connection budget of the main server (page loads, bundles, polls)
// is never touched. CORS open: the overlay page embeds from anywhere.
const feedServer = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://127.0.0.1:' + (slop.status().config.feedPort || 3010)).pathname;
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Answer CORS preflights properly — a JSON POST from the overlay page is
  // preflighted, and an unanswered OPTIONS blocked it (which silently ate
  // every end report the overlay ever sent).
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.writeHead(204);
    res.end();
    return;
  }
  if (pathname === '/api/slop/events') {
    slop.eventsHandler(req, res);
    return;
  }
  if (pathname === '/api/slop') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(slop.status()));
    return;
  }
  if (pathname.startsWith('/api/slop/bundle/')) {
    slop.bundleHandler(req, res);
    return;
  }
  if (pathname === '/api/slop/ended' && req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: slop.playEnded(String(payload.name ?? ''), payload.playId ?? null) }));
      } catch {
        res.writeHead(400).end();
      }
    });
    return;
  }
  res.writeHead(404).end();
});

feedServer.listen(slop.status().config.feedPort || 3010, () => {
  console.log('[slop] event feed on port ' + (slop.status().config.feedPort || 3010));
});
feedServer.on('error', (err) => console.warn('[slop] feed server:', err.message));

// One-time channel authorization: redirects to Twitch, and Twitch returns
// to /auth/twitch/callback (the page there posts the code back to us).
// In the Namazu Elements deployment this flow becomes the per-user Twitch
// login (docs/tickets/02-twitch-oauth-login.md).
app.get('/auth/twitch', (req, res) => {
  if (eventsub.status().configured) {
    res.redirect(eventsub.authorizeUrl());
    return;
  }
  res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>SlopBot AI — Twitch setup</title>
<style>body{background:#0D1335;color:#fff;font-family:system-ui,sans-serif;max-width:44rem;margin:8vh auto;padding:0 1.5rem;line-height:1.6}
h1{color:#FF0099}code{background:#1a2150;padding:.15em .4em;border-radius:.3em;overflow-wrap:anywhere}li{margin:.6em 0}</style></head>
<body><h1>Twitch setup</h1>
<ol>
<li>Create an app at <a href="https://dev.twitch.tv/console" style="color:#FF0099">dev.twitch.tv/console</a> — any name, category <em>Chat Bot</em>.</li>
<li>In the app's <em>OAuth Redirect URLs</em> add exactly:<br><code>${eventsub.redirectUri()}</code></li>
<li>Copy the <em>Client ID</em> and generate a <em>Client Secret</em> into <code>config/twitch.json</code>:<br>
<code>{"clientId": "...", "clientSecret": "..."}</code></li>
<li>To check the credentials in, wrap them encrypted: <code>npm run secrets:encrypt</code> — only <code>config/twitch.json.aes</code> is committed, and the passphrase is asked for at startup (<code>$TWITCH_PASSPHRASE</code> skips the prompt).</li>
<li>Restart the server, then reload <code>/auth/twitch</code> to authorize your channel.</li>
</ol></body></html>`);
});

app.get('/auth/twitch/callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'twitch-callback.html'));
});

// The callback page hands the ?code= back here for the server-side token
// exchange (client secret must never sit in a URL).
app.post('/api/twitch/auth/callback', async (req, res) => {
  const code = String(req.body?.code || '');
  if (!code) {
    res.status(400).json({ error: 'code is required' });
    return;
  }
  try {
    res.json(await eventsub.exchangeCode(code));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/rewards/status', (req, res) => {
  res.json(eventsub.status());
});

// The broadcaster's custom rewards — powers the deck's redeem picker.
app.get('/api/rewards/list', manage, async (req, res) => {
  try {
    res.json({ authorized: true, rewards: await eventsub.listCustomRewards() });
  } catch (err) {
    res.json({ authorized: false, rewards: [], error: err.message });
  }
});

// Fire a fake redemption through the real pipeline — testing without Twitch.
app.post('/api/rewards/test', manage, (req, res) => {
  res.json(eventsub.testRedemption(req.body ?? {}));
});

// Channel point slop machine — queue/review/agent/plays (see docs/DESIGN.md).
// Initialization happens once, awaited in the startup chain below (the store
// must be attached before the server accepts traffic).

app.get('/api/slop', (req, res) => {
  res.json(slop.status());
});

app.get('/api/slop/events', slop.eventsHandler);

// The gated bundle for one playthrough — code + inlined assets.
app.get('/api/slop/bundle/:name', slop.bundleHandler);

for (const action of ['present', 'dismiss', 'approve', 'reject', 'remove', 'restart', 'cancel']) {
  app.post(`/api/slop/queue/:id/${action}`, manage, (req, res) => {
    res.json({ ok: slop[action](req.params.id) });
  });
}

// Deck quick-suspend per slop — body {suspended: true|false}.
app.post('/api/slop/suspend/:name', manage, (req, res) => {
  res.json({ ok: slop.suspend(req.params.name, Boolean(req.body?.suspended)) });
});

// Per-slop trigger settings: GET reads, POST saves (validated server-side),
// POST …/test runs the server-side chat matcher for the settings screen.
app.get('/api/slop/triggers/:name', manage, (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const entry = slop.status().registered.find((e) => e.name === name);
  if (!entry) return res.status(404).json({ ok: false, error: 'no such slop' });
  res.json({ ok: true, triggers: entry.triggers ?? [] });
});
app.post('/api/slop/triggers/:name', manage, (req, res) => {
  const name = decodeURIComponent(req.params.name);
  const body = req.body ?? {};
  res.json(slop.setTriggers(name, body.triggers ?? body, body.cooldownSeconds, body.slopCommand));
});
app.post('/api/slop/triggers/:name/test', manage, (req, res) => {
  res.json(slop.testTriggers(decodeURIComponent(req.params.name), String(req.body?.text ?? '')));
});

// The streamer's per-slop cooldown reset — the registry chip's clear button.
app.post('/api/slop/cooldown/:name/clear', manage, (req, res) => {
  res.json({ ok: slop.cooldownClear(decodeURIComponent(req.params.name)) });
});

// Fire a synthetic trigger event through the real dispatcher — test
// triggers (and cooldowns/allow-lists/immediate dispatch) without waiting
// for a live follow/raid/sub. Body: { type, text?, login?, userId?,
// viewers?, bits?, tier?, months?, rewardId? }.
app.post('/api/slop/trigger/dispatch', manage, (req, res) => {
  const body = req.body ?? {};
  const type = String(body.type ?? '');
  const allowed = ['chat', 'follow', 'sub', 'resub', 'subgift', 'raid', 'cheer', 'redemption'];
  if (!allowed.includes(type)) return res.status(400).json({ ok: false, error: 'unknown trigger type' });
  res.json({ ok: slop.dispatchTrigger({ ...body, type }) });
});

// Live-editable slop config — persists to slop.json.
app.post('/api/slop/config', manage, (req, res) => {
  res.json(slop.configure(req.body ?? {}));
});

// The model catalog for the slop build agent (from the opencode gateway).
app.get('/api/slop/models', manage, async (req, res) => {
  res.json(await slop.availableModels());
});

// The overlay's liveness ping: the /slop page calls this every 2s. If the
// pings stop while a play is current (OBS source reloaded/deleted), the
// watchdog ends the play quickly instead of stalling the full fuse.
app.post('/api/slop/plays/heartbeat', (req, res) => {
  slop.noteOverlayAlive();
  res.json({ ok: true });
});

// Fire a fake viewer chat message at the on-stage slop (tests onChat).
app.post('/api/slop/chat', manage, (req, res) => {
  res.json(slop.testChat(String(req.body?.text ?? ''), String(req.body?.user || 'TestViewer')));
});

// Cameo requests from a playing slop's sandbox — routed through the same
// play() rules as chat (repeats, suspends). Short names resolve like !slop.
app.post('/api/slop/play/:name', (req, res) => {
  const candidates = slop.matchSlopNames(req.params.name);
  if (candidates.length !== 1) {
    res.status(404).json({ ok: false, error: candidates.length > 1 ? 'ambiguous' : 'no such slop' });
    return;
  }
  const via = req.body?.via ?? 'deck';
  res.json({ ok: slop.play(candidates[0], via, Boolean(req.body?.chained)) });
});

// The overlay reports its fuse burning out (or a replaced stage) — the play
// queue advances. The playId guards replays of the same slop from killing
// each other's reports.
app.post('/api/slop/ended', (req, res) => {
  res.json({ ok: slop.playEnded(String(req.body?.name ?? ''), req.body?.playId ?? null) });
});

// Stage monitor controls: pause/resume the play pipeline, ✕ a row.
app.post('/api/slop/plays/pause', manage, (req, res) => {
  res.json({ ok: slop.setPaused(true) });
});
app.post('/api/slop/plays/resume', manage, (req, res) => {
  res.json({ ok: slop.setPaused(false) });
});
app.post('/api/slop/plays/remove', manage, (req, res) => {
  res.json({ ok: slop.playRemove(String(req.body?.name ?? '')) });
});

// The operator's verdict on a freshly built slop (pending-approval flow).
app.post('/api/slop/pending/:name/approve', manage, (req, res) => {
  res.json({ ok: slop.approvePending(decodeURIComponent(req.params.name)) });
});
app.post('/api/slop/pending/:name/reject', manage, (req, res) => {
  res.json({ ok: slop.rejectPending(decodeURIComponent(req.params.name)) });
});
// Delete a registered slop entirely (non-pending rows).
app.post('/api/slop/delete/:name', manage, (req, res) => {
  const candidates = slop.matchSlopNames(req.params.name);
  if (candidates.length !== 1) {
    res.status(404).json({ ok: false, error: candidates.length > 1 ? 'ambiguous' : 'no such slop' });
    return;
  }
  res.json({ ok: slop.deleteSlop(candidates[0]) });
});

// Build a slop from a chat prompt via the OpenCode agent.
app.post('/api/slop/build', manage, (req, res) => {
  res.json({ ok: slop.buildDirect(String(req.body?.text ?? ''), req.body?.model) });
});

// Dry-run the whole pipeline without a real redemption (body: {text, user}).
app.post('/api/slop/test', manage, (req, res) => {
  const body = req.body ?? {};
  const item = slop.handleRedemption({
    id: `test-${Date.now().toString(36)}`,
    synthetic: true,
    user: { id: '0', login: body.user || 'TestViewer', name: body.user || 'TestViewer' },
    input: body.text ?? '',
    reward: { id: 'test-reward', title: slop.status().config.redeemTitle, cost: 500, prompt: 'test' },
  });
  res.json({ queued: Boolean(item) });
});

// Unknown paths get a plain 404 — no shell to fall back to here.
app.use((req, res) => {
  res.status(404).send('not found');
});

// Credentials first: reads config/twitch.json or prompts to decrypt
// config/twitch.json.aes — before anything listens, so a wrong passphrase
// fails fast in the terminal instead of starting a server that can't connect.
// The slop store (MongoDB) is likewise required — no store, no server.
secrets
  .ensureLoaded()
  .then(async () => {
    eventsub.init({ onRedemption: onTwitchRedemption, onEvent: onTwitchEvent });
    await slop.init({
      helixUpdate: eventsub.updateRedemptionStatus,
      sendChat: eventsub.sendChatMessage,
    });
    app.listen(PORT, HOST, () => {
      console.log(`slopbot-ai is running:`);
      console.log(`  landing: http://localhost:${PORT}/`);
      console.log(`  overlay: http://localhost:${PORT}/slop`);
      console.log(`  deck:    http://localhost:${PORT}/deck`);
    });
  })
  .catch((err) => {
    console.error(`startup failed: ${err.message}`);
    process.exit(1);
  });
