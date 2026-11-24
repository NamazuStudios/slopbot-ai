#!/usr/bin/env node
'use strict';

// Fixture boot for the carried-forward behavior regression suite
// (docs/regression/SPEC.md). Boots the REFERENCE server (node server.js) as
// a supervised child process and wires the fixture environment around it:
//
//   - a fixture config: the repo's gitignored config/ + slop.json are
//     rewritten (backed up first, restored on exit) with a known channel,
//     a known superuser login, a short play fuse, and — when
//     SLOP_FLOOD_OVERRIDE is set — a deterministic trigger dispatch budget.
//     Config state files (triggers/cooldowns/seen/suspended) reset per boot,
//     so runs are idempotent.
//   - the fixture slop library (tests/fixtures/slops/) copied into the
//     server's slops/ directory (gitignored patterns), plus its assets.
//   - a scripted fake IRC server (the client's connect target is rewritten
//     to it via scripts/fixtures/irc-hook.js, preloaded with -r) so the IRC
//     keepalive contract is observable without touching real Twitch.
//   - a control API on FIXTURE_CONTROL_PORT (default 3999): session minting
//     (signed with the same fixture auth secret the child reads),
//     config-disk reads/injects for the configure()-merge check, reboots
//     (including the BOM-prefixed config boot), and the fake IRC's scripted
//     lines. The regression runner drives ALL fixture behavior through this
//     HTTP surface — its checks stay transport-only.
//
// Required env:
//   MONGO_URL        — MongoDB for lib/store.js (required by the server).
//                      Locally: a `kubectl port-forward` to the Elements
//                      preview instance pod (port 27017). In CI: the mongo:7
//                      service container.
// Optional env:
//   MONGO_DATABASE   — default 'slopbot_regression' (a dedicated database;
//                      the store creates collections as needed).
//   SLOP_FLOOD_OVERRIDE — pins triggerDispatchesPerMinute for the whole run
//                      (the flood-cap check asserts the throttled-notice
//                      path deterministically; the default 6 would bite
//                      mid-suite). CI sets 30.
//   PORT / SLOP_FEED_PORT / FIXTURE_CONTROL_PORT / FIXTURE_FAKE_IRC_PORT
//   BASE_URL only matters to the runner, not here.

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const { WebSocketServer } = require('ws');

const ROOT = path.join(__dirname, '..', '..');
const PORT = Number(process.env.PORT || 3000);
const FEED_PORT = Number(process.env.SLOP_FEED_PORT || 3010);
const CONTROL_PORT = Number(process.env.FIXTURE_CONTROL_PORT || 3999);
const FAKE_IRC_PORT = Number(process.env.FIXTURE_FAKE_IRC_PORT || 4999);
const MONGO_URL = process.env.MONGO_URL || '';
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'slopbot_regression';
const FLOOD_OVERRIDE = Number(process.env.SLOP_FLOOD_OVERRIDE) || null;

const CHANNEL = 'slopfixchannel';
const SUPERUSER = 'slopfixadmin';
// Fixture-only HMAC key for config/auth-secret.json — the child signs and
// verifies session cookies with it; the control API mints test sessions
// with the same key. Meaningless outside a test boot (and gitignored).
const AUTH_KEY = 'slopfix-regression-fixture-auth-key';

const CONFIG_DIR = path.join(ROOT, 'config');
const SLOP_JSON = path.join(ROOT, 'slop.json');
const FIXTURE_SLOPS_DIR = path.join(__dirname, '..', '..', 'tests', 'fixtures', 'slops');
const BACKUP_DIR = path.join(ROOT, '.slop-regression-backup');

if (!MONGO_URL) {
  console.error('[fixture] MONGO_URL is required — the store has no file fallback.');
  console.error('[fixture] locally: kubectl port-forward pod/<namazu-instance pod> 27017:27017, then');
  console.error('[fixture]   MONGO_URL=mongodb://127.0.0.1:27017 node scripts/fixtures/server.js');
  process.exit(1);
}

const log = (...args) => console.log('[fixture]', ...args);

// --- fixture config -----------------------------------------------------------

// The server reads config ONLY from the repo root (ROOT is baked into
// lib/slop.js), so "a temp config fixture dir" is realized as: back the real
// config state up, write the fixture state, restore on exit.
const STATE_FILES = [
  'auth-secret.json',
  'slop-triggers.json',
  'slop-cooldowns.json',
  'slop-command.json',
  'slop-seen-users.json',
  'slop-suspended.json',
];

// Everything the fixture may clobber, as { from → to } pairs.
const protectedFiles = () => [
  ...STATE_FILES.map((f) => ({ from: path.join(CONFIG_DIR, f), to: path.join(BACKUP_DIR, f) })),
  { from: SLOP_JSON, to: path.join(BACKUP_DIR, 'slop.json') },
];

const baseConfig = () => ({
  channel: CHANNEL,
  superusers: [SUPERUSER],
  redeemTitle: 'Regression Redeem',
  feedPort: FEED_PORT,
  maxSlopSeconds: 12, // short fuse — the sandbox self-ends quickly if a test forgets
  ...(FLOOD_OVERRIDE
    ? { triggerDispatchesPerMinute: Math.max(1, Math.min(30, FLOOD_OVERRIDE)) }
    : {}),
});

const writeSlopJson = ({ extra = {}, bom = false } = {}) => {
  const text = `${JSON.stringify({ ...baseConfig(), ...extra }, null, 2)}\n`;
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(SLOP_JSON, (bom ? '﻿' : '') + text);
};

const backup = () => {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  for (const { from, to } of protectedFiles()) {
    if (fs.existsSync(from)) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    }
  }
};

const restore = () => {
  if (!fs.existsSync(BACKUP_DIR)) return;
  for (const { from, to } of protectedFiles()) {
    if (fs.existsSync(from)) {
      fs.mkdirSync(path.dirname(to), { recursive: true });
      fs.copyFileSync(from, to);
    } else {
      fs.rmSync(to, { force: true });
    }
  }
  fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
};

const prepareConfig = () => {
  backup();
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  // Fresh state per run — the suite is idempotent by construction.
  for (const f of STATE_FILES) fs.rmSync(path.join(CONFIG_DIR, f), { force: true });
  fs.writeFileSync(path.join(CONFIG_DIR, 'auth-secret.json'), `${JSON.stringify({ key: AUTH_KEY }, null, 2)}\n`);
  writeSlopJson();
};

// --- fixture slops -------------------------------------------------------------

const installFixtureSlops = () => {
  const slopsDir = path.join(ROOT, 'slops');
  const assetsDir = path.join(slopsDir, 'assets');
  fs.mkdirSync(assetsDir, { recursive: true });
  for (const entry of fs.readdirSync(FIXTURE_SLOPS_DIR, { withFileTypes: true })) {
    if (entry.name === 'assets') continue;
    fs.copyFileSync(path.join(FIXTURE_SLOPS_DIR, entry.name), path.join(slopsDir, entry.name));
  }
  const fixtureAssets = path.join(FIXTURE_SLOPS_DIR, 'assets');
  if (fs.existsSync(fixtureAssets)) {
    for (const dir of fs.readdirSync(fixtureAssets, { withFileTypes: true })) {
      if (!dir.isDirectory()) continue;
      const dst = path.join(assetsDir, dir.name);
      fs.mkdirSync(dst, { recursive: true });
      for (const file of fs.readdirSync(path.join(fixtureAssets, dir.name))) {
        fs.copyFileSync(path.join(fixtureAssets, dir.name, file), path.join(dst, file));
      }
    }
  }
};

const removeFixtureSlops = () => {
  const slopsDir = path.join(ROOT, 'slops');
  for (const f of fs.readdirSync(FIXTURE_SLOPS_DIR, { withFileTypes: true })) {
    if (f.name === 'assets') continue;
    fs.rmSync(path.join(slopsDir, f.name), { force: true });
  }
  // own-asset dirs go too (shared sound pool untouched)
  const fixtureAssets = path.join(FIXTURE_SLOPS_DIR, 'assets');
  if (fs.existsSync(fixtureAssets)) {
    for (const dir of fs.readdirSync(fixtureAssets, { withFileTypes: true })) {
      if (dir.isDirectory) fs.rmSync(path.join(slopsDir, 'assets', dir.name), { recursive: true, force: true });
    }
  }
};

// --- session minting (same wire format as lib/auth.js issueSession) -----------

const b64url = (buf) => Buffer.from(buf).toString('base64url');
const signSession = (data) => crypto.createHmac('sha256', AUTH_KEY).update(data).digest('base64url');
const issueSession = (login, role) => {
  const payload = {
    sub: 'slopfix-1',
    login,
    display: 'Slopfix Admin',
    image: null,
    role,
    exp: Date.now() + 24 * 60 * 60 * 1000,
  };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${signSession(body)}`;
};

// --- the scripted fake IRC server ----------------------------------------------

const irc = {
  nextId: 1,
  sockets: new Map(), // id → ws
  totalConnections: 0,
  closedConnections: 0,
  pings: [], // epoch ms of every client PING (the 15s keepalive)
  lines: [], // last 100 raw inbound lines
  silent: false, // the dead-socket scenario: no pong, no traffic, nothing
};

const startFakeIrc = () => {
  const wss = new WebSocketServer({ port: FAKE_IRC_PORT, host: '127.0.0.1' });
  wss.on('connection', (ws) => {
    const id = irc.nextId++;
    irc.totalConnections += 1;
    irc.sockets.set(id, ws);
    ws.on('message', (data) => {
      for (const line of data.toString().split('\r\n')) {
        if (!line) continue;
        irc.lines.push(line);
        if (irc.lines.length > 100) irc.lines.shift();
        if (/^PING/i.test(line)) {
          irc.pings.push(Date.now());
          if (irc.pings.length > 500) irc.pings.shift();
          if (!irc.silent) {
            try { ws.send(':tmi.twitch.tv PONG tmi.twitch.tv :tmi.twitch.tv\r\n'); } catch { /* dead */ }
          }
          continue;
        }
        if (!irc.silent && /^CAP REQ/i.test(line)) {
          try { ws.send(':tmi.twitch.tv CAP * ACK :twitch.tv/tags\r\n'); } catch { /* dead */ }
        }
        // PASS/NICK/JOIN need no response for the anonymous listener
      }
    });
    ws.on('close', () => {
      irc.closedConnections += 1;
      irc.sockets.delete(id);
    });
    ws.on('error', () => { /* the close handler records it */ });
  });
  wss.on('error', (err) => {
    console.error(`[fixture] fake IRC server error: ${err.message}`);
    process.exit(1);
  });
  return wss;
};

const ircState = () => {
  const now = Date.now();
  const lastPing = irc.pings[irc.pings.length - 1] ?? null;
  return {
    ok: true,
    totalConnections: irc.totalConnections,
    openConnections: irc.sockets.size,
    closedConnections: irc.closedConnections,
    pingCount: irc.pings.length,
    lastPingAt: lastPing,
    lastPingAgoMs: lastPing == null ? null : now - lastPing,
    silent: irc.silent,
    lines: irc.lines.slice(-20),
  };
};

// --- the supervised child ---------------------------------------------------------

let child = null;
let childLogs = [];

const spawnChild = () => {
  const hook = path.join(__dirname, 'irc-hook.js');
  child = spawn(
    process.execPath,
    ['-r', hook, path.join(ROOT, 'server.js')],
    {
      cwd: ROOT,
      env: {
        ...process.env,
        PORT: String(PORT),
        MONGO_URL,
        MONGO_DATABASE,
        SLOP_FAKE_IRC_URL: `ws://127.0.0.1:${FAKE_IRC_PORT}`,
        SLOP_FIXTURE: '1',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  const pipe = (stream, label) => {
    stream.setEncoding('utf8');
    stream.on('data', (chunk) => {
      for (const line of chunk.split('\n')) {
        if (!line) continue;
        childLogs.push(`[${label}] ${line}`);
        if (childLogs.length > 400) childLogs.shift();
      }
    });
  };
  pipe(child.stdout, 'server');
  pipe(child.stderr, 'server:err');
  child.on('exit', (code, signal) => {
    childLogs.push(`[fixture] child exited code=${code} signal=${signal}`);
  });
  log(`child pid ${child.pid} (node server.js, port ${PORT}, feed ${FEED_PORT}, fake irc ${FAKE_IRC_PORT})`);
};

const killChild = async () => {
  if (!child || child.exitCode != null) return;
  const pid = child.pid;
  child.kill('SIGTERM');
  await new Promise((resolve) => {
    const timer = setTimeout(resolve, 8000);
    child.on('exit', () => { clearTimeout(timer); resolve(); });
  });
  log(`child ${pid} stopped`);
};

const get = (url, timeoutMs = 3000) => new Promise((resolve) => {
  const u = new URL(url);
  const req = http.request({ hostname: u.hostname, port: u.port, path: u.pathname + u.search, method: 'GET', timeout: timeoutMs }, (res) => {
    const chunks = [];
    res.on('data', (c) => chunks.push(c));
    res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
  });
  req.on('timeout', () => { req.destroy(); resolve(null); });
  req.on('error', () => resolve(null));
  req.end();
});

const waitHealthy = async (timeoutMs = 120_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child && child.exitCode != null) {
      throw new Error(`child exited (code=${child.exitCode}) — last logs:\n${childLogs.slice(-25).join('\n')}`);
    }
    const res = await get(`http://127.0.0.1:${PORT}/api/slop`);
    if (res && res.status === 200) {
      try {
        const data = JSON.parse(res.body);
        if (Array.isArray(data.registered)) return data;
      } catch { /* not up yet */ }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`child not healthy after ${timeoutMs}ms — last logs:\n${childLogs.slice(-25).join('\n')}`);
};

// --- the control API --------------------------------------------------------------

let rebootChain = Promise.resolve();

const rebootChild = async () => {
  // Serialized: a reboot is destructive to the child; overlapping reboots
  // would race the port bind.
  rebootChain = rebootChain.then(async () => {
    await killChild();
    childLogs = [];
    spawnChild();
    await waitHealthy();
    return { ok: true };
  });
  return rebootChain;
};

const controlServer = http.createServer((req, res) => {
  const done = (code, data) => {
    res.writeHead(code, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };
  const readBody = () => new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => { body += c; });
    req.on('end', () => resolve(body));
  });
  (async () => {
    const u = new URL(req.url, `http://127.0.0.1:${CONTROL_PORT}`);
    try {
      if (req.method === 'GET' && u.pathname === '/healthz') {
        return done(200, {
          ok: true,
          pid: process.pid,
          childPid: child?.pid ?? null,
          port: PORT,
          feedPort: FEED_PORT,
          fakeIrcPort: FAKE_IRC_PORT,
          floodOverride: FLOOD_OVERRIDE,
          mongoDatabase: MONGO_DATABASE,
          irc: ircState(),
        });
      }
      if (req.method === 'POST' && u.pathname === '/session') {
        // A signed session for the child's own auth scheme (the same HMAC
        // key the child reads from config/auth-secret.json).
        const body = JSON.parse((await readBody()) || '{}');
        const login = String(body.login ?? SUPERUSER);
        return done(200, { ok: true, token: issueSession(login, 'superuser'), cookieName: 'slopbot_session' });
      }
      if (req.method === 'POST' && u.pathname === '/reboot') {
        // plain /reboot → restart the child, PRESERVE the current slop.json
        // (config changes made through the API must survive a restart);
        // { fresh: true } → rewrite the clean fixture config;
        // { bom: true, config } → rewrite with a BOM prefix (BOM check).
        const body = JSON.parse((await readBody()) || '{}');
        if (body.bom || body.fresh) {
          await killChild();
          writeSlopJson({ extra: body.config ?? {}, bom: Boolean(body.bom) });
          childLogs = [];
          spawnChild();
          await waitHealthy();
        } else {
          await rebootChild();
        }
        return done(200, { ok: true, bom: Boolean(body.bom), fresh: Boolean(body.fresh) });
      }
      if (req.method === 'GET' && u.pathname === '/config/disk') {
        // BOM-stripped parse of what is actually on disk right now.
        let text = fs.readFileSync(SLOP_JSON, 'utf8');
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        return done(200, { ok: true, hasBom: fs.readFileSync(SLOP_JSON, 'utf8').charCodeAt(0) === 0xfeff, config: JSON.parse(text) });
      }
      if (req.method === 'POST' && u.pathname === '/config/inject') {
        // Simulate a NEWER process writing a key the running one doesn't know.
        const body = JSON.parse((await readBody()) || '{}');
        let text = fs.readFileSync(SLOP_JSON, 'utf8');
        if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
        const disk = JSON.parse(text);
        disk[String(body.key)] = body.value ?? null;
        fs.writeFileSync(SLOP_JSON, `${JSON.stringify(disk, null, 2)}\n`);
        return done(200, { ok: true });
      }
      if (u.pathname === '/irc/state') return done(200, ircState());
      if (req.method === 'POST' && u.pathname === '/irc/reset') {
        irc.pings = [];
        irc.lines = [];
        irc.silent = false;
        return done(200, { ok: true });
      }
      if (req.method === 'POST' && u.pathname === '/irc/silence') {
        const body = JSON.parse((await readBody()) || '{}');
        irc.silent = Boolean(body.on);
        return done(200, { ok: true, silent: irc.silent });
      }
      if (req.method === 'POST' && u.pathname === '/irc/send') {
        const body = JSON.parse((await readBody()) || '{}');
        const line = String(body.line ?? '');
        if (!line) return done(400, { ok: false, error: 'line is required' });
        let delivered = 0;
        for (const ws of irc.sockets.values()) {
          try { ws.send(`${line}\r\n`); delivered += 1; } catch { /* dead */ }
        }
        return done(200, { ok: true, delivered });
      }
      if (req.method === 'GET' && u.pathname === '/logs') {
        return done(200, { ok: true, logs: childLogs.slice(-200) });
      }
      return done(404, { ok: false, error: 'no such control endpoint' });
    } catch (err) {
      return done(500, { ok: false, error: err.message });
    }
  })();
});

// --- boot -------------------------------------------------------------------------

// The regression database is fixture-owned and dedicated (MONGO_DATABASE):
// dropping it at boot makes every run's first import the authority, mirroring
// CI's fresh mongo:7 container. Without this, a persistent local Mongo keeps
// the FIRST-EVER boot's registration docs — and the engine's
// registration-time putSlop runs before the store connects (a no-op), so the
// files can never heal a stale DB doc: loadRegistry would stomp the fresh
// registration with the frozen one (see docs/regression/RESULTS.md).
const dropRegressionDatabase = async () => {
  const { MongoClient } = require('mongodb');
  const mc = new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 4000 });
  await mc.connect();
  try {
    await mc.db(MONGO_DATABASE).dropDatabase();
    log(`regression database dropped for a clean boot: ${MONGO_DATABASE}`);
  } finally {
    await mc.close();
  }
};

const shutdown = async (signal) => {
  log(`${signal} — stopping the child and restoring the backed-up config`);
  await killChild();
  try { removeFixtureSlops(); } catch { /* best effort */ }
  try { restore(); } catch { /* best effort */ }
  process.exit(0);
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

const main = async () => {
  await dropRegressionDatabase();
  prepareConfig();
  installFixtureSlops();
  startFakeIrc();
  controlServer.listen(CONTROL_PORT, '127.0.0.1', () => {
    log(`control API on http://127.0.0.1:${CONTROL_PORT}`);
  });
  spawnChild();
  await waitHealthy();
  log('fixture ready — the reference server is up under the fixture environment');
  log(`  app:   http://127.0.0.1:${PORT}/api/slop`);
  log(`  feed:  http://127.0.0.1:${FEED_PORT}/api/slop/events`);
  log(`  control: http://127.0.0.1:${CONTROL_PORT}/healthz`);
};

main().catch((err) => {
  console.error(`[fixture] boot failed: ${err.message}`);
  process.exit(1);
});
