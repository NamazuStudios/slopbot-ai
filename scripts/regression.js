#!/usr/bin/env node
'use strict';

// SlopBot AI — carried-forward behavior regression suite, HTTP tier.
// (docs/regression/SPEC.md — the binding contract; this runner pins the
// monolith's hard-won behaviors as executable checks so the Kotlin element
// port cannot regress any of them.)
//
// Transport-only: HTTP + SSE + pages. The runner boots NOTHING — it drives
// a RUNNING server (the fixture boot from scripts/fixtures/server.js, or
// any BASE_URL). Every check is idempotent: setup via the API → act
// (synthetic chat / trigger dispatch / trigger test) → assert (snapshot
// deltas + SSE broadcast payloads).
//
// Env:
//   BASE_URL          — target server (default http://127.0.0.1:3000)
//   TOKEN             — optional bearer/Elements session for a remote run
//                       (the Kotlin element); the reference runs token-less
//                       and gets its session from the fixture control API
//   FIXTURE_CONTROL   — fixture control API (default http://127.0.0.1:3999);
//                       when unreachable, fixture-dependent checks (BOM
//                       boot, reboots, config injection, scripted IRC) skip
//                       cleanly so the suite runs against any BASE_URL
//   SLOP_REGRESSION_AGENT_BUILD=1 — opt in to the agent build-path check
//                       (needs a reachable opencode service; skips cleanly
//                       otherwise)

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');
const TOKEN = process.env.TOKEN || '';
const FIXTURE_CONTROL = (process.env.FIXTURE_CONTROL || 'http://127.0.0.1:3999').replace(/\/+$/, '');
const MONGO_DATABASE = process.env.MONGO_DATABASE || 'slopbot_regression';
const FLOOD_OVERRIDE = Number(process.env.SLOP_FLOOD_OVERRIDE) || 6;
const FEED_PORT = Number(process.env.FEED_PORT || 3010);

// The fixture slop library (checked in at tests/fixtures/slops/) — the
// runner reads the list from disk; the SERVER receives everything over HTTP.
const FIXTURE_SLOPS_DIR = path.join(__dirname, '..', 'tests', 'fixtures', 'slops');
const FIXTURE_FILES = fs.readdirSync(FIXTURE_SLOPS_DIR).filter((f) => f.endsWith('.js'));

// --- tiny test harness ----------------------------------------------------------

class SkipError extends Error {}

const assert = (condition, message) => {
  if (!condition) throw new Error(message ?? 'assertion failed');
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const checks = [];
const check = (id, name, fn) => checks.push({ id, name, fn });

// --- HTTP -------------------------------------------------------------------------

const request = (url, { method = 'GET', headers = {}, body = null, timeoutMs = 15_000 } = {}) =>
  new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      { hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method, headers, setHost: true },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }));
      },
    );
    req.on('error', reject);
    req.setTimeout(timeoutMs, () => req.destroy(new Error(`request timed out after ${timeoutMs}ms: ${method} ${url}`)));
    if (body != null) req.write(body);
    req.end();
  });

const json = async (url, opts = {}) => {
  const res = await request(url, opts);
  let data = null;
  try { data = JSON.parse(res.body); } catch { /* non-JSON */ }
  return { status: res.status, headers: res.headers, data, body: res.body };
};

let authHeaders = {};
let fixtureAvailable = false;

const fixture = {
  call: async (method, pathname, body, timeoutMs = 180_000) =>
    json(`${FIXTURE_CONTROL}${pathname}`, {
      method,
      headers: { 'content-type': 'application/json' },
      body: body == null ? undefined : JSON.stringify(body),
      timeoutMs,
    }),
};

// --- SSE --------------------------------------------------------------------------

class SseFeed {
  constructor(req) {
    this.events = [];
    this.req = req;
    this.waiters = [];
  }
  push(type, raw) {
    let data = null;
    try { data = JSON.parse(raw); } catch { data = { raw }; }
    const event = { type, data, at: Date.now() };
    this.events.push(event);
    if (this.events.length > 2000) this.events.shift();
    this.waiters = this.waiters.filter((w) => {
      if (w.type !== type || !w.pred(event)) return true;
      clearTimeout(w.timer);
      w.resolve(event);
      return false;
    });
  }
  // Index from which `waitAfter`/`findAfter` look — mark BEFORE acting, since
  // a broadcast can land before the triggering HTTP response returns.
  mark() {
    return this.events.length;
  }
  findAfter(mark, type, pred) {
    return this.events.slice(mark).find((e) => e.type === type && pred(e)) ?? null;
  }
  waitAfter(mark, type, pred, timeoutMs = 5000, label = type) {
    const existing = this.findAfter(mark, type, pred);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { type, pred, resolve, timer: null };
      waiter.timer = setTimeout(() => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(new Error(`no ${label} event within ${timeoutMs}ms`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }
  close() {
    try { this.req.destroy(); } catch { /* already gone */ }
  }
}

const openSse = (url, headers = {}) =>
  new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request(
      { hostname: u.hostname, port: u.port || 80, path: u.pathname + u.search, method: 'GET', headers },
      (res) => {
        if (res.statusCode !== 200) {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => reject(new Error(`SSE ${url} → ${res.statusCode}`)));
          return;
        }
        const feed = new SseFeed(req);
        let buffer = '';
        let eventType = null;
        let dataLines = [];
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          buffer += chunk;
          let idx;
          while ((idx = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 1);
            line = line.replace(/\r$/, '');
            if (line === '') {
              if (eventType || dataLines.length) feed.push(eventType ?? 'message', dataLines.join('\n'));
              eventType = null;
              dataLines = [];
              continue;
            }
            if (line.startsWith(':')) continue; // heartbeat comment
            if (line.startsWith('event:')) eventType = line.slice(6).trim();
            else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
          }
        });
        res.on('end', () => { feed.closed = true; });
        res.on('error', () => { feed.closed = true; });
        resolve(feed);
      },
    );
    req.on('error', reject);
    req.end();
  });

// --- API surface -------------------------------------------------------------------

const api = {
  get: (pathname) => json(`${BASE_URL}${pathname}`, { headers: authHeaders }),
  post: (pathname, body = {}, opts = {}) =>
    json(`${BASE_URL}${pathname}`, {
      method: 'POST',
      headers: { ...authHeaders, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      ...opts,
    }),
  snapshot: async () => {
    const res = await api.get('/api/slop');
    assert(res.status === 200 && res.data, `GET /api/slop → ${res.status}`);
    return res.data;
  },
  dispatch: (event) => api.post('/api/slop/trigger/dispatch', event),
  sse: () => openSse(`${BASE_URL}/api/slop/events`, authHeaders),
};

const entryOf = (snapshot, name) => snapshot.registered.find((e) => e.name === name);

// The runner is the overlay's stand-in: heartbeat every 2s so the stage
// watchdog never eats a play mid-check (that path has its own browser-tier
// check where the heartbeat is deliberately withheld).
let heartbeatTimer = null;

// Deterministic stage: nothing current, nothing queued, not paused.
const resetStage = async () => {
  for (let i = 0; i < 15; i++) {
    const s = await api.snapshot();
    const plays = s.plays ?? {};
    if (!plays.current && !(plays.upcoming ?? []).length && !plays.paused) return;
    if (plays.paused) await api.post('/api/slop/plays/resume');
    if (plays.current) {
      await api.post('/api/slop/ended', { name: plays.current.name, playId: plays.current.playId ?? null });
    } else if ((plays.upcoming ?? []).length) {
      await api.post('/api/slop/plays/remove', { name: plays.upcoming[0].name });
    }
    await sleep(150);
  }
  throw new Error('the stage did not drain');
};

// Idempotent per-slop setup: registered, unsuspended, streamer-saved trigger
// list (+ optional cooldown seconds and !slop command toggle). Any armed
// cooldown from a previous run is cleared, so a re-run starts clean.
const ensureSlop = async (name, { triggers = [], cooldownSeconds = 0, slopCommand = true } = {}) => {
  let s = await api.snapshot();
  if (!entryOf(s, name)) throw new Error(`${name} is not registered — the fixture boot should have installed it`);
  const suspended = await api.post(`/api/slop/suspend/${encodeURIComponent(name)}`, { suspended: false });
  assert(suspended.data?.ok === true, `unsuspend ${name}`);
  const saved = await api.post(`/api/slop/triggers/${encodeURIComponent(name)}`, { triggers, cooldownSeconds, slopCommand });
  assert(saved.data?.ok === true, `save triggers on ${name}: ${JSON.stringify(saved.data)}`);
  await api.post(`/api/slop/cooldown/${encodeURIComponent(name)}/clear`, {}); // idempotency: no stale window
  return saved.data;
};

const waitPlay = (feed, mark, name, { via = null, timeoutMs = 6000 } = {}) =>
  feed.waitAfter(
    mark,
    'play',
    (e) => e.data?.current?.name === name && (!via || String(e.data.via ?? '').startsWith(via)),
    timeoutMs,
    `play(${name})`,
  ).catch(async (err) => {
    // Make a timeout diagnosable: what DID the feed see, and where is the stage?
    const seen = feed.events.slice(mark).map((e) => e.type).join(',') || '(nothing)';
    const plays = await api.snapshot().then((s) => JSON.stringify(s.plays)).catch(() => '(snapshot failed)');
    throw new Error(`${err.message} — events since mark: [${seen}]; plays now: ${plays}`);
  });

// ============================================================================
// Checks — one per pinned behavior (docs/regression/SPEC.md)
// ============================================================================

check('boot', 'server health: store attached, snapshot shape, fixture registry, IRC liveness surface', async (t) => {
  const s = await api.snapshot();
  assert(s.plays && Array.isArray(s.plays.upcoming) && 'paused' in (s.plays ?? {}), 'GET /api/slop exposes plays{current,upcoming,paused}');
  assert(Array.isArray(s.registered) && s.registered.length > 0, 'registry present');
  assert(Array.isArray(s.queue) && Array.isArray(s.history), 'queue + history present');
  assert(s.store?.active === true, `store attached (status: ${JSON.stringify(s.store)})`);
  assert(s.store?.database === MONGO_DATABASE, `store database is the dedicated regression database (${s.store?.database})`);
  assert(s.config?.allowedTriggers?.length > 0, 'config echoes the registry allow-list');
  // The dispatch budget: with the fixture boot, SLOP_FLOOD_OVERRIDE pins it;
  // on a remote target just sanity-check the range.
  if (t.fixture) {
    assert(s.config?.triggerDispatchesPerMinute === t.expectedBudget, `deterministic dispatch budget pinned by SLOP_FLOOD_OVERRIDE (${s.config?.triggerDispatchesPerMinute})`);
  } else {
    const budget = Number(s.config?.triggerDispatchesPerMinute);
    assert(Number.isFinite(budget) && budget >= 1 && budget <= 30, `dispatch budget in range (${s.config?.triggerDispatchesPerMinute})`);
  }
  assert(s.mock === false, 'the real build path is live (no mock)');
  for (const name of FIXTURE_FILES) {
    assert(entryOf(s, name), `${name} registered`);
  }
  // IRC liveness surface — against the scripted fake IRC server (fixture boot).
  if (t.fixture) {
    let s2 = s;
    for (let i = 0; i < 20 && s2.irc?.connected !== true; i++) {
      await sleep(500);
      s2 = await api.snapshot();
    }
    assert(s2.irc?.connected === true, `irc.connected true against the fake IRC server (${JSON.stringify(s2.irc)})`);
    assert(s2.irc?.lastTrafficAgoMs === null || typeof s2.irc?.lastTrafficAgoMs === 'number', 'lastTrafficAgoMs present');
  }
});

check('feed-preflight', 'the feed port answers CORS preflights on the wire (204 + headers) — end reports died exactly here once', async (t) => {
  const u = new URL(BASE_URL);
  const res = await request(`http://${u.hostname}:${FEED_PORT}/api/slop/ended`, {
    method: 'OPTIONS',
    headers: { 'access-control-request-method': 'POST', origin: BASE_URL, 'access-control-request-headers': 'content-type' },
  }).catch(() => null);
  if (!res) throw new SkipError(`nothing answered on the feed port ${u.hostname}:${FEED_PORT} — a remote target may not run one`);
  assert(res.status === 204, `OPTIONS preflight → 204 (got ${res.status})`);
  assert(res.headers['access-control-allow-origin'] === '*', `Access-Control-Allow-Origin: * (got ${JSON.stringify(res.headers['access-control-allow-origin'])})`);
  assert(/GET, POST, OPTIONS/i.test(res.headers['access-control-allow-methods'] ?? ''), 'Access-Control-Allow-Methods covers POST');
  assert(/content-type/i.test(res.headers['access-control-allow-headers'] ?? ''), 'Access-Control-Allow-Headers covers Content-Type');
});

check('trigger-modes', 'chat trigger modes: exact/contains/starts/ends/word/wildcard/regex, case sensitivity, validation', async () => {
  await resetStage();
  const triggers = [
    { id: 'exact-lower', type: 'chat', mode: 'exact', patterns: ['gm'] },
    { id: 'exact-cs', type: 'chat', mode: 'exact', patterns: ['GM'], caseSensitive: true },
    { id: 'contains', type: 'chat', mode: 'contains', patterns: ['omlette'] },
    { id: 'starts', type: 'chat', mode: 'starts', patterns: ['bug'] },
    { id: 'ends', type: 'chat', mode: 'ends', patterns: ['lol'] },
    { id: 'word', type: 'chat', mode: 'word', patterns: ['cat'] },
    { id: 'word-cs', type: 'chat', mode: 'word', patterns: ['cat'], caseSensitive: true },
    { id: 'wildcard', type: 'chat', mode: 'wildcard', patterns: ['pip*'] },
    { id: 'regex', type: 'chat', mode: 'regex', patterns: ['^g+a+t$'], caseSensitive: true },
  ];
  const saved = await ensureSlop('slopfix-trigger-modes.js', { triggers });
  assert(saved.triggers.length === 9, `all 9 triggers saved (got ${saved.triggers.length})`);
  assert(saved.triggers.every((tr) => triggers.some((raw) => raw.id === tr.id)), 'trigger ids preserved through validation');
  assert(saved.triggers.every((tr) => tr.source === 'streamer' && tr.dispatch === 'queue'), 'deck saves are streamer-authored, queue-dispatched');

  // The deck settings screen's matcher test — the same server-side matcher
  // an event would hit, over POST /api/slop/triggers/:name/test.
  const match = async (text) => {
    const res = await api.post(`/api/slop/triggers/${encodeURIComponent('slopfix-trigger-modes.js')}/test`, { text });
    assert(res.data?.ok === true, `test endpoint ok for "${text}"`);
    return res.data.matched ?? [];
  };
  const expectMatch = async (text, expected, label) => {
    const matched = await match(text);
    for (const id of expected) assert(matched.includes(id), `${label}: "${text}" should match ${id} (matched: ${JSON.stringify(matched)})`);
    for (const id of triggers.map((tr) => tr.id)) {
      if (!expected.includes(id)) assert(!matched.includes(id), `${label}: "${text}" should NOT match ${id} (matched: ${JSON.stringify(matched)})`);
    }
  };
  await expectMatch('gm', ['exact-lower'], 'exact');
  await expectMatch('  GM  ', ['exact-lower', 'exact-cs'], 'exact trims; case-insensitive default folds');
  await expectMatch('gm!', [], 'exact matches the whole line only');
  await expectMatch('an omlette proposal', ['contains'], 'contains');
  await expectMatch('bug report', ['starts'], 'starts');
  await expectMatch('a real bug report', [], 'starts anchors at line start');
  await expectMatch('haha lol', ['ends'], 'ends');
  await expectMatch('lol!', [], 'ends anchors at line end');
  await expectMatch('a cat appeared', ['word', 'word-cs'], 'word');
  await expectMatch('a CAT appeared', ['word'], 'word case sensitivity');
  await expectMatch('concatenate', [], 'word respects token boundaries');
  await expectMatch('pipcup', ['wildcard'], 'wildcard star');
  await expectMatch('xpipcup', [], 'wildcard anchors both ends');
  await expectMatch('gaaat', ['regex'], 'regex');
  await expectMatch('GAAT', [], 'regex case sensitivity');

  // Validation: invalid regex and patternless chat triggers are rejected.
  const bad = await api.post(`/api/slop/triggers/${encodeURIComponent('slopfix-trigger-modes.js')}`, { triggers: [{ id: 'bad', type: 'chat', mode: 'regex', patterns: ['[unclosed'] }] });
  assert(bad.data?.ok === false, 'invalid regex trigger rejected at save');
  const empty = await api.post(`/api/slop/triggers/${encodeURIComponent('slopfix-trigger-modes.js')}`, { triggers: [{ id: 'empty', type: 'chat', mode: 'contains', patterns: [] }] });
  assert(empty.data?.ok === false, 'chat trigger without patterns rejected');
});

check('trigger-events', 'who-gating; event types and criteria; firstchat/firstfollow; immediate vs queued dispatch', async () => {
  await resetStage();
  await ensureSlop('slopfix-who-mods.js', { triggers: [{ id: 'm', type: 'chat', mode: 'word', patterns: ['!modgo'], who: 'mods' }] });
  await ensureSlop('slopfix-who-bcaster.js', { triggers: [{ id: 'b', type: 'chat', mode: 'word', patterns: ['!bcgo'], who: 'broadcaster' }] });
  await ensureSlop('slopfix-events.js', {
    triggers: [
      { id: 'sub2', type: 'sub', tier: 2 },
      { id: 'resub2', type: 'resub', minMonths: 2 },
      { id: 'gift', type: 'subgift' },
      { id: 'raid10', type: 'raid', minViewers: 10 },
      { id: 'cheer100', type: 'cheer', minBits: 100 },
      { id: 'redeem42', type: 'redemption', rewardId: 'slopfix-reward-42' },
      { id: 'firstchat', type: 'firstchat', mode: 'word', patterns: ['first time slopfix chat'] },
    ],
  });
  await ensureSlop('slopfix-evt-follow.js', { triggers: [{ id: 'f', type: 'follow' }] });
  await ensureSlop('slopfix-evt-firstfollow.js', { triggers: [{ id: 'ff', type: 'firstfollow' }] });
  await ensureSlop('slopfix-imm.js', { triggers: [{ id: 'imm', type: 'chat', mode: 'word', patterns: ['!imgo'], dispatch: 'immediate' }] });
  await ensureSlop('slopfix-slow.js', { triggers: [] });

  const feed = await api.sse();
  try {
    // --- who-gating -----------------------------------------------------------
    let mark = feed.mark();
    let r = await api.dispatch({ type: 'chat', text: '!modgo', login: 'viewer1', mod: false });
    assert(r.data?.ok === false, 'mods-gated trigger ignores non-mod chat (dispatch answered ok:false)');
    r = await api.dispatch({ type: 'chat', text: '!modgo', login: 'viewer1', mod: true });
    assert(r.data?.ok === true, 'mods-gated trigger fires for mods');
    await waitPlay(feed, mark, 'slopfix-who-mods.js');
    await resetStage();

    mark = feed.mark();
    r = await api.dispatch({ type: 'chat', text: '!bcgo', login: 'viewer1', mod: true, broadcaster: false });
    assert(r.data?.ok === false, 'broadcaster-gated trigger ignores mod-but-not-broadcaster chat');
    r = await api.dispatch({ type: 'chat', text: '!bcgo', login: 'viewer1', broadcaster: true });
    assert(r.data?.ok === true, 'broadcaster-gated trigger fires for the broadcaster');
    await waitPlay(feed, mark, 'slopfix-who-bcaster.js');
    await resetStage();

    // --- event types + criteria -------------------------------------------------
    const cases = [
      { event: { type: 'sub', tier: 1 }, ok: false, label: 'sub below tier' },
      { event: { type: 'sub', tier: 2 }, ok: true, label: 'sub at tier' },
      { event: { type: 'resub', months: 1 }, ok: false, label: 'resub below months' },
      { event: { type: 'resub', months: 3 }, ok: true, label: 'resub at months' },
      { event: { type: 'subgift' }, ok: true, label: 'subgift presence' },
      { event: { type: 'raid', viewers: 5 }, ok: false, label: 'raid below minViewers' },
      { event: { type: 'raid', viewers: 20 }, ok: true, label: 'raid at minViewers' },
      { event: { type: 'cheer', bits: 50 }, ok: false, label: 'cheer below minBits' },
      { event: { type: 'cheer', bits: 500 }, ok: true, label: 'cheer at minBits' },
      { event: { type: 'redemption', rewardId: 'wrong-reward' }, ok: false, label: 'redemption mismatched rewardId' },
      { event: { type: 'redemption', rewardId: 'slopfix-reward-42' }, ok: true, label: 'redemption matching rewardId' },
    ];
    for (const c of cases) {
      mark = feed.mark();
      r = await api.dispatch(c.event);
      assert(
        r.data?.ok === c.ok,
        `${c.label}: dispatch ${JSON.stringify(c.event)} → expected ok:${c.ok}, got ${JSON.stringify(r.data)}`,
      );
      if (c.ok) await waitPlay(feed, mark, 'slopfix-events.js');
      await resetStage();
    }

    // firstchat rides chat events with the first-ever flag
    mark = feed.mark();
    r = await api.dispatch({ type: 'chat', text: 'first time slopfix chat', login: 'newbie' });
    assert(r.data?.ok === false, 'firstchat trigger ignores a non-first message');
    r = await api.dispatch({ type: 'chat', text: 'first time slopfix chat', login: 'newbie', first: true });
    assert(r.data?.ok === true, 'firstchat trigger fires on the first-ever message');
    await waitPlay(feed, mark, 'slopfix-events.js');
    await resetStage();

    // follow presence + firstfollow (once per user, ever)
    mark = feed.mark();
    r = await api.dispatch({ type: 'follow', login: 'follower1' });
    assert(r.data?.ok === true, 'follow trigger fires on presence of the event');
    await waitPlay(feed, mark, 'slopfix-evt-follow.js');
    await resetStage();

    // suspend the plain-follow slop so the firstfollow pick is deterministic
    await api.post(`/api/slop/suspend/${encodeURIComponent('slopfix-evt-follow.js')}`, { suspended: true });
    // A user never seen before (unique per run — the seen set persists)
    const freshFollower = `slopfix-follower-${Date.now().toString(36)}`;
    mark = feed.mark();
    r = await api.dispatch({ type: 'follow', userId: freshFollower, login: 'follower9' });
    assert(r.data?.ok === true, 'firstfollow fires on a first-ever follow (the dispatcher records the seen id)');
    await waitPlay(feed, mark, 'slopfix-evt-firstfollow.js');
    await resetStage();
    r = await api.dispatch({ type: 'follow', userId: freshFollower, login: 'follower9' });
    assert(r.data?.ok === false, 'the same follow is no longer first — the seen set persists');
    await api.post(`/api/slop/suspend/${encodeURIComponent('slopfix-evt-follow.js')}`, { suspended: false });
    await resetStage();

    // --- immediate vs queued dispatch ----------------------------------------------
    let playRes = await api.post('/api/slop/play/slopfix-slow', { via: 'deck' });
    assert(playRes.data?.ok === true, 'manual play takes the stage');
    mark = feed.mark();
    r = await api.dispatch({ type: 'chat', text: '!imgo', login: 'viewer1' });
    assert(r.data?.ok === true, 'immediate trigger dispatch accepted');
    const immPlay = await waitPlay(feed, mark, 'slopfix-imm.js');
    assert(String(immPlay.data.via ?? '').startsWith('trigger: chat'), `immediate play rides the trigger via (${immPlay.data.via})`);
    let s = await api.snapshot();
    assert(s.plays?.current?.name === 'slopfix-imm.js', 'the immediate slop took the stage now');
    assert(s.plays?.upcoming?.[0]?.name === 'slopfix-slow.js' && s.plays.upcoming[0].via === 'resume', 'the interrupted play requeued in front for resume');

    await api.post('/api/slop/ended', { name: 'slopfix-imm.js', playId: s.plays.current.playId });
    mark = feed.mark();
    const resumePlay = await waitPlay(feed, mark, 'slopfix-slow.js', { via: 'resume' });
    assert(resumePlay, 'the interrupt resumed after the immediate finished');
    await resetStage();

    // immediate while paused: the streamer's freeze outranks any trigger — it queues
    await api.post('/api/slop/plays/pause');
    r = await api.dispatch({ type: 'chat', text: '!imgo', login: 'viewer1' });
    assert(r.data?.ok === true, 'immediate dispatch under pause queues instead of forcing');
    s = await api.snapshot();
    assert(s.plays?.paused === true && s.plays?.upcoming?.[0]?.name === 'slopfix-imm.js', 'paused immediate is queued, stage stays empty');
    await api.post('/api/slop/plays/resume');
    mark = feed.mark();
    await waitPlay(feed, mark, 'slopfix-imm.js', { timeoutMs: 10_000 });
    await resetStage();

    // unknown trigger types are refused outright
    const bad = await api.post('/api/slop/trigger/dispatch', { type: 'subbomb' });
    assert(bad.status === 400, `unknown dispatch type → 400 (got ${bad.status})`);
  } finally {
    feed.close();
  }
  await resetStage();
});

check('cooldowns', 'per-slop cooldown: arms on trigger plays only, manual plays exempt, streamer-resettable, bypassCooldown', async () => {
  await resetStage();
  const name = 'slopfix-cd-window.js';
  await ensureSlop(name, { triggers: [{ id: 'cd', type: 'chat', mode: 'word', patterns: ['!cdgo'] }], cooldownSeconds: 30 });
  const feed = await api.sse();
  try {
    // Arming happens on the trigger-initiated play — and only there.
    let mark = feed.mark();
    let r = await api.dispatch({ type: 'chat', text: '!cdgo', login: 'viewer1' });
    assert(r.data?.ok === true, 'trigger dispatch plays');
    await waitPlay(feed, mark, name);
    let s = await api.snapshot();
    const until = s.cooldownUntil?.[name];
    assert(Number.isFinite(until) && until > Date.now() + 20_000 && until <= Date.now() + 31_000, `cooldown window armed for the saved duration (until=${until})`);
    assert(entryOf(s, name)?.cooldownSeconds === 30, 'registry entry carries cooldownSeconds');
    const cdEvent = await feed.waitAfter(mark, 'cooldowns', (e) => Number(e.data?.cooldownUntil?.[name]) > 0, 4000);
    assert(cdEvent, 'the armed window was broadcast on the cooldowns channel for the deck chips');

    // While cooled: invisible to triggers…
    r = await api.dispatch({ type: 'chat', text: '!cdgo', login: 'viewer1' });
    assert(r.data?.ok === false, 'a cooled slop is invisible to trigger dispatch');
    // …but manual plays are never blocked, and never re-arm the window.
    await resetStage(); // free the stage so the manual play takes it
    mark = feed.mark();
    r = await api.post('/api/slop/play/slopfix-cd-window', { via: 'deck' });
    assert(r.data?.ok === true, 'manual play works while the cooldown is armed');
    await waitPlay(feed, mark, name);
    s = await api.snapshot();
    assert(s.cooldownUntil?.[name] === until, 'the manual play did not move the window');

    // The streamer's reset — the registry chip's clear button.
    await resetStage();
    r = await api.post(`/api/slop/cooldown/${encodeURIComponent(name)}/clear`, {});
    assert(r.data?.ok === true, 'cooldown clear endpoint ok');
    s = await api.snapshot();
    assert(!s.cooldownUntil?.[name], 'the window is gone after the clear');
    mark = feed.mark();
    r = await api.dispatch({ type: 'chat', text: '!cdgo', login: 'viewer1' });
    assert(r.data?.ok === true, 'trigger dispatch plays again after the clear (and re-arms)');
    await waitPlay(feed, mark, name);
    await resetStage();

    // bypassCooldown rides through an armed window — and a bypassing
    // trigger's own play never arms the window (it would defeat itself).
    // The window is armed here by the SAME slop's plain trigger.
    const bypass = 'slopfix-cd-bypass.js';
    await ensureSlop(bypass, {
      triggers: [
        { id: 'arm', type: 'chat', mode: 'word', patterns: ['!cdarm'] },
        { id: 'b', type: 'chat', mode: 'word', patterns: ['!cdbye'], bypassCooldown: true },
      ],
      cooldownSeconds: 30,
    });
    mark = feed.mark();
    r = await api.dispatch({ type: 'chat', text: '!cdarm', login: 'viewer1' });
    assert(r.data?.ok === true, 'the plain trigger plays');
    await waitPlay(feed, mark, bypass);
    await resetStage();
    s = await api.snapshot();
    const armedUntil = s.cooldownUntil?.[bypass];
    assert(armedUntil > Date.now(), 'the window is armed by the plain trigger play');
    mark = feed.mark();
    r = await api.dispatch({ type: 'chat', text: '!cdbye', login: 'viewer1' });
    assert(r.data?.ok === true, 'bypassCooldown plays through the armed window');
    await waitPlay(feed, mark, bypass);
    s = await api.snapshot();
    assert(s.cooldownUntil?.[bypass] === armedUntil, 'the bypass play did not move the window');
  } finally {
    feed.close();
  }
  await resetStage();
});

check('trigger-http', 'http trigger: a secret per-slop key posted as the whole text/plain body of POST /trigger identifies and plays the slop — key never on open surfaces, rotation retires the old key, retirement on save, cooldown arms, creator proposals rejected', async () => {
  await resetStage();
  const name = 'slopfix-http-key.js';

  // The creator proposal of type "http" in the fixture's meta is rejected
  // outright — it never registers as a (held) trigger; only a streamer save
  // creates one.
  let s = await api.snapshot();
  let entry = entryOf(s, name);
  assert(entry, 'slopfix-http-key.js is registered');
  assert(!(entry.triggers ?? []).some((t) => t.type === 'http'), 'a creator-proposed http trigger is rejected, not held');

  // Saving an http trigger as the streamer mints the slop's secret key.
  const saved = await ensureSlop(name, { triggers: [{ id: 'key', type: 'http' }], cooldownSeconds: 60 });
  const key = saved.triggerKey;
  assert(typeof key === 'string' && /^[A-Za-z0-9_-]{32}$/.test(key), `the key mints at save (got ${JSON.stringify(key)})`);

  // The key is SECRET: none of the open surfaces (snapshot, registry SSE
  // broadcast, bundle) may ever carry it — checked against the raw response
  // text, not a parsed shape that could drop an unexpected field.
  const snap = await json(`${BASE_URL}/api/slop`);
  assert(snap.status === 200 && !snap.body.includes(key), 'GET /api/slop never carries the trigger key');
  const bundle = await json(`${BASE_URL}/api/slop/bundle/${encodeURIComponent(name)}`);
  assert(!bundle.body.includes(key), 'the bundle never carries the trigger key');

  const feed = await api.sse();
  try {
    // A registry broadcast is triggered by re-saving the triggers; the key
    // must not ride the registry entries.
    let mark = feed.mark();
    await api.post(`/api/slop/triggers/${encodeURIComponent(name)}`, { triggers: [{ id: 'key', type: 'http' }], cooldownSeconds: 60 });
    await feed.waitAfter(mark, 'registry', () => true, 6000, 'registry broadcast');
    assert(!feed.events.some((e) => e.type === 'registry' && JSON.stringify(e.data).includes(key)), 'the registry SSE broadcast never carries the trigger key');

    // Content-Type and body contract: text/plain only, body is exactly the key.
    // (The JSON body must be an object — express's strict json parser rejects
    // bare strings before the route sees them.)
    const wrongType = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ key }) });
    assert(wrongType.status === 415, `a JSON body is refused with 415 (got ${wrongType.status})`);
    const empty = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '' });
    assert(empty.status === 400, `an empty body is refused with 400 (got ${empty.status})`);

    // A wrong key is a 404 — distinguishable from every "the slop refused" case.
    const miss = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'not-a-real-key-at-all' });
    assert(miss.status === 404 && miss.data?.reason === 'unknown-key', `an unknown key answers 404 unknown-key (got ${miss.status} ${miss.data?.reason})`);

    // The right key plays the slop — labeled trigger: http — and arms the
    // cooldown like any trigger play.
    await api.post(`/api/slop/cooldown/${encodeURIComponent(name)}/clear`, {});
    mark = feed.mark();
    const hit = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: key });
    assert(hit.status === 200 && hit.data?.ok === true, `the key plays the slop (got ${hit.status} ${JSON.stringify(hit.data)})`);
    await waitPlay(feed, mark, name, { via: 'trigger: http' });
    const cooled = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: key });
    assert(cooled.status === 409 && cooled.data?.reason === 'cooldown', `a second play inside the cooldown window is a 409 cooldown (got ${cooled.status} ${cooled.data?.reason})`);
    assert(Number(cooled.headers['retry-after']) > 0, 'the cooldown refusal carries Retry-After');
    await resetStage();

    // Rotation: a fresh key, the old one dead immediately.
    await api.post(`/api/slop/cooldown/${encodeURIComponent(name)}/clear`, {});
    mark = feed.mark();
    const rotated = await api.post(`/api/slop/triggers/${encodeURIComponent(name)}/rotate-key`, {});
    assert(rotated.data?.ok === true && rotated.data.triggerKey && rotated.data.triggerKey !== key, 'rotate-key mints a fresh key');
    const oldKey = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: key });
    assert(oldKey.status === 404, `the retired key is dead (got ${oldKey.status})`);
    const fresh = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: rotated.data.triggerKey });
    assert(fresh.status === 200, `the rotated key plays (got ${fresh.status})`);
    await waitPlay(feed, mark, name, { via: 'trigger: http' });
    await resetStage();

    // A suspended slop refuses its key with 409 — the streamer's freeze
    // outranks any trigger.
    await api.post(`/api/slop/cooldown/${encodeURIComponent(name)}/clear`, {});
    await api.post(`/api/slop/suspend/${encodeURIComponent(name)}`, { suspended: true });
    const suspendedHit = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: rotated.data.triggerKey });
    assert(suspendedHit.status === 409 && suspendedHit.data?.reason === 'suspended', `a suspended slop refuses its key (got ${suspendedHit.status} ${suspendedHit.data?.reason})`);

    // Removing the last http trigger retires the key entirely.
    await api.post(`/api/slop/suspend/${encodeURIComponent(name)}`, { suspended: false });
    const retired = await api.post(`/api/slop/triggers/${encodeURIComponent(name)}`, { triggers: [], cooldownSeconds: 0 });
    assert(retired.data?.ok === true && retired.data.triggerKey == null, 'dropping the last http trigger retires the key');
    const afterRetire = await json(`${BASE_URL}/trigger`, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: rotated.data.triggerKey });
    assert(afterRetire.status === 404, `the retired-on-save key is dead (got ${afterRetire.status})`);
  } finally {
    feed.close();
  }
  await resetStage();
});

check('name-resolution', '!name resolution: exact handle beats token-subset siblings, spacing-insensitive, !slop-disabled invisible, default !name', async (t) => {
  if (!t.fixture) throw new SkipError('the scripted fake IRC server is required to deliver !slop chat lines');
  await resetStage();
  await ensureSlop('slopfix-cd-window.js', { triggers: [{ id: 'cd', type: 'chat', mode: 'word', patterns: ['!cdgo'] }], cooldownSeconds: 0 });
  // The token-subset sibling: every token of "cd-window" also appears in
  // "cd-window-plus" — the exact handle must still win outright.
  await ensureSlop('slopfix-cd-window-plus.js', { triggers: [] });
  await fixture.call('POST', '/irc/reset', {});
  const feed = await api.sse();
  const say = async (text) => {
    const mark = feed.mark();
    const sent = await fixture.call('POST', '/irc/send', { line: `:slopfixviewer!slopfixviewer@slopfix.tmi.twitch.tv PRIVMSG #slopfixchannel :${text}` });
    assert(sent.data?.ok, `fake IRC delivered the line (${text})`);
    return mark;
  };
  try {
    // Exact handle wins over the token-subset sibling.
    let mark = await say('!slop cd-window');
    const played = await waitPlay(feed, mark, 'slopfix-cd-window.js', { timeoutMs: 8000 });
    assert(String(played.data.via ?? '').startsWith('!slop by slopfixviewer'), `the play is attributed to the !slop command (${played.data.via})`);
    await resetStage();

    // Spacing-insensitive: "cd   window" resolves like "cd-window".
    mark = await say('!slop cd   window');
    await waitPlay(feed, mark, 'slopfix-cd-window.js', { timeoutMs: 8000 });
    await resetStage();

    // A slop with !slop turned off doesn't exist to the resolver at all.
    const off = await api.post(`/api/slop/triggers/${encodeURIComponent('slopfix-cd-window-plus.js')}`, { triggers: [], slopCommand: false });
    assert(off.data?.ok === true && off.data.slopCommand === false, 'slopCommand:false accepted on save');
    mark = await say('!slop cd-window-plus');
    await sleep(2500);
    assert(!feed.findAfter(mark, 'play', (e) => e.data?.current?.name === 'slopfix-cd-window-plus.js'), 'the disabled slop did not play');
    assert(feed.findAfter(mark, 'note', (e) => /no slop matching/i.test(String(e.data?.text ?? ''))), 'the resolver answered with a not-found note');
    await api.post(`/api/slop/triggers/${encodeURIComponent('slopfix-cd-window-plus.js')}`, { triggers: [], slopCommand: true });

    // Default activation command: a slop with no proposals and no saved list
    // gets "!<short-name>" — the server owns the ! namespace.
    mark = await say('!slop default-name');
    await waitPlay(feed, mark, 'slopfix-default-name.js', { timeoutMs: 8000 });
    await resetStage();
  } finally {
    feed.close();
  }
});

check('irc-keepalive', 'IRC keepalive: the client pings every 15s, keeps lastTrafficAgoMs fresh, and force-reconnects a silently-dead link', async (t) => {
  if (!t.fixture) throw new SkipError('needs the scripted fake IRC server (fixture control)');
  await fixture.call('POST', '/irc/reset', {});
  let state = (await fixture.call('GET', '/irc/state')).data;
  assert(state.openConnections >= 1, `the chat listener is connected to the fake IRC server (${state.openConnections} open)`);

  // The client pings on its own 15s schedule — two pings within ~35s.
  const pingsAtStart = state.pingCount;
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    await sleep(2000);
    state = (await fixture.call('GET', '/irc/state')).data;
    if (state.pingCount >= pingsAtStart + 2) break;
  }
  assert(state.pingCount >= pingsAtStart + 2, `the client pings the server on its own schedule (saw ${state.pingCount - pingsAtStart} new pings in 40s)`);

  // Liveness is visible in /api/slop: injected traffic refreshes it, and it
  // ages forward.
  await fixture.call('POST', '/irc/send', { line: ':slopfixviewer!slopfixviewer@slopfix.tmi.twitch.tv PRIVMSG #slopfixchannel :hello regression feed' });
  await sleep(500);
  let s = await api.snapshot();
  const fresh = s.irc?.lastTrafficAgoMs;
  assert(typeof fresh === 'number' && fresh < 3000, `lastTrafficAgoMs is fresh after server traffic (${fresh}ms)`);
  await sleep(3000);
  s = await api.snapshot();
  assert(s.irc?.lastTrafficAgoMs > fresh, `lastTrafficAgoMs advances with silence (${fresh}ms → ${s.irc?.lastTrafficAgoMs}ms)`);
  assert(s.irc?.connected === true, 'the link reports connected while traffic flows');

  // A silently-dead socket must never leave the listener deaf: with the fake
  // server silenced (no pongs, no traffic at all), the client stops trusting
  // the link (15s ping + 12s dead-window) and force-reconnects.
  await fixture.call('POST', '/irc/silence', { on: true });
  const totalAtStart = state.totalConnections;
  const closedAtStart = state.closedConnections;
  const reconnectDeadline = Date.now() + 75_000;
  let reconnected = false;
  while (Date.now() < reconnectDeadline) {
    await sleep(3000);
    state = (await fixture.call('GET', '/irc/state')).data;
    if (state.totalConnections > totalAtStart && state.closedConnections > closedAtStart) { reconnected = true; break; }
  }
  await fixture.call('POST', '/irc/silence', { on: false });
  assert(reconnected, `the client force-reconnected a dead link (connections ${totalAtStart}→${state.totalConnections}, closed ${closedAtStart}→${state.closedConnections})`);
  for (let i = 0; i < 20; i++) {
    s = await api.snapshot();
    if (s.irc?.connected === true) break;
    await sleep(1000);
  }
  assert(s.irc?.connected === true, 'the listener is live again on the fresh connection');
});

check('allow-list', 'registry allow-list gates creator-proposed triggers only; streamer triggers always win; un-hold needs re-registration', async (t) => {
  await resetStage();
  let s = await api.snapshot();
  const held = entryOf(s, 'slopfix-held-raid.js');
  assert(held, 'held-raid fixture registered');
  const proposal = (held.triggers ?? []).find((tr) => tr.type === 'raid');
  assert(proposal, 'the file\'s creator raid proposal is in the merged trigger list');
  assert(proposal.source === 'creator' && proposal.enabled === false && proposal.held === true, 'the proposal is held: creator-sourced, disabled, held badge');

  // A streamer-authored raid trigger fires while raid is NOT in the allow-list.
  await ensureSlop('slopfix-streamer-raid.js', { triggers: [{ id: 'sr', type: 'raid' }] });
  const feed = await api.sse();
  try {
    let mark = feed.mark();
    let r = await api.dispatch({ type: 'raid', login: 'raider', viewers: 5 });
    assert(r.data?.ok === true, 'a streamer-authored raid trigger dispatches regardless of the allow-list');
    await waitPlay(feed, mark, 'slopfix-streamer-raid.js');
    await resetStage();

    // Silence every other raid-matching slop, then prove the held proposal stays shut.
    await api.post(`/api/slop/suspend/${encodeURIComponent('slopfix-streamer-raid.js')}`, { suspended: true });
    await api.post(`/api/slop/suspend/${encodeURIComponent('slopfix-events.js')}`, { suspended: true });
    mark = feed.mark();
    r = await api.dispatch({ type: 'raid', login: 'raider', viewers: 50 });
    assert(r.data?.ok === false, 'the held creator proposal does not dispatch while raid is outside the allow-list');
    assert(!feed.findAfter(mark, 'play', (e) => e.data?.current?.name === 'slopfix-held-raid.js'), 'no play from the held slop');

    // The allow-list gates CREATOR proposals ONLY — the registry allow-list
    // itself is deck-editable and round-trips through the config API.
    r = await api.post('/api/slop/config', { allowedTriggers: 'chat, firstchat, raid,' });
    assert(r.data?.ok === true, 'allowedTriggers updated through the config API');
    assert(deepEq(r.data.applied?.allowedTriggers, ['chat', 'firstchat', 'raid']), 'string form parsed, trimmed, deduped');
    r = await api.post('/api/slop/config', { allowedTriggers: 'chat, firstchat, not-a-type' });
    assert(r.data?.ok === true && deepEq(r.data.applied?.allowedTriggers, ['chat', 'firstchat']), 'unknown trigger types filtered out');
    r = await api.post('/api/slop/config', { allowedTriggers: '' });
    assert(r.data?.ok === false, 'an empty allow-list is refused (it would mute everything)');
  } finally {
    feed.close();
    // Restores run even on failure, so a failed check can't poison the rest.
    await api.post(`/api/slop/suspend/${encodeURIComponent('slopfix-streamer-raid.js')}`, { suspended: false }).catch(() => {});
    await api.post(`/api/slop/suspend/${encodeURIComponent('slopfix-events.js')}`, { suspended: false }).catch(() => {});
    await api.post('/api/slop/config', { allowedTriggers: 'chat,firstchat' }).catch(() => {});
  }
  await resetStage();
});

check('cam', 'streamer cam: normalized 0–1 placement, null save is a no-op, configure() merges with disk so newer keys survive', async (t) => {
  await resetStage();
  let r = await api.post('/api/slop/config', { streamerCam: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } });
  assert(r.data?.ok === true && r.data.applied?.streamerCam?.x === 0.25, 'cam save applied');
  let s = await api.snapshot();
  assert(deepEq(s.config?.streamerCam, { x: 0.25, y: 0.25, w: 0.5, h: 0.5 }), 'the cam echoes back normalized');

  // A null cam save is a NO-OP — the saved placement stands (this key was
  // once wiped repeatedly by stale pages sending null).
  r = await api.post('/api/slop/config', { streamerCam: null });
  assert(r.data?.ok === false, 'null cam save is a no-op (nothing to change)');
  s = await api.snapshot();
  assert(s.config?.streamerCam?.x === 0.25, 'the saved cam survived the null save');

  // Values normalize + clamp into 0–1 and against the canvas edge. Float
  // math (1 - 0.8) needs an epsilon-tolerant compare.
  r = await api.post('/api/slop/config', { streamerCam: { x: 0.8, y: 0.7, w: 9, h: 9 } });
  const cam = r.data?.applied?.streamerCam ?? {};
  const near = (a, b) => Math.abs(Number(a) - b) < 1e-6;
  assert(r.data?.ok === true && near(cam.x, 0.8) && near(cam.y, 0.7) && near(cam.w, 0.2) && near(cam.h, 0.3), `out-of-range cam normalized and clamped (got ${JSON.stringify(cam)})`);
  const echo = (await api.snapshot()).config?.streamerCam ?? {};
  assert(near(echo.x, 0.8) && near(echo.w, 0.2), 'the normalized cam echoes back');

  // Degenerate rects are refused too (a rect clamped to ≤0.01 wide/tall).
  r = await api.post('/api/slop/config', { streamerCam: { x: 0.995, y: 0.995, w: 0.9, h: 0.9 } });
  assert(r.data?.ok === false, 'a degenerate cam rect is a no-op');

  // configure() merges with DISK: a newer key an older running process
  // doesn't know about must survive that process's next config write.
  if (t.fixture) {
    await fixture.call('POST', '/config/inject', { key: 'streamerPreset', value: { hotkey: 'F13' } });
    r = await api.post('/api/slop/config', { redeemTitle: 'Merge Survivor' });
    assert(r.data?.ok === true, 'a live config write applied');
    const disk = await fixture.call('GET', '/config/disk');
    assert(disk.data?.config?.streamerPreset?.hotkey === 'F13', 'configure() merged with disk — the newer key survived the older process\'s write');
    assert(disk.data?.config?.redeemTitle === 'Merge Survivor', 'the applied key persisted to disk');
    await fixture.call('POST', '/reboot', {});
    s = await api.snapshot();
    assert(s.config?.redeemTitle === 'Merge Survivor', 'the merged config survives a reboot (boot reads the merged file)');
  } else {
    throw new SkipError('the configure()-merge assertion needs the fixture control API (config-disk inject/read + reboot)');
  }
  await api.post('/api/slop/config', { streamerCam: { x: 0.25, y: 0.25, w: 0.5, h: 0.5 } });
});

check('bom-tolerance', 'config reads are BOM-tolerant — a PowerShell-written slop.json boots with values, not defaults', async (t) => {
  if (!t.fixture) throw new SkipError('needs the fixture boot, which writes the BOM-prefixed slop.json');
  await resetStage();
  const rb = await fixture.call('POST', '/reboot', { bom: true, config: { redeemTitle: 'BOM Survived Redeem', maxSlopSeconds: 21 } });
  assert(rb.data?.ok === true, 'BOM-prefixed boot ok');
  let s = await api.snapshot();
  assert(s.config?.redeemTitle === 'BOM Survived Redeem', 'redeemTitle read through the BOM (not reset to default)');
  assert(s.config?.maxSlopSeconds === 21, 'maxSlopSeconds read through the BOM (not the default 60)');
  assert(s.config?.channel === 'slopfixchannel', 'identity keys intact');
  // A live configure() write on top parses the BOM file and writes clean JSON.
  await api.post('/api/slop/config', { customRules: 'bom-round-trip' });
  const disk = await fixture.call('GET', '/config/disk');
  assert(disk.data?.config?.customRules === 'bom-round-trip', 'the post-write disk config parses and carries the new key');
  // Restore the clean fixture config for any later checks.
  await fixture.call('POST', '/reboot', { fresh: true });
  s = await api.snapshot();
  assert(s.config?.redeemTitle === 'Regression Redeem', 'clean config restored');
});

check('agent-rules', 'agent-rule registration: malformed trigger JSON dropped, trailing-comma accepted, controls opt-in, chat relay', async (t) => {
  const s = await api.snapshot();
  // The registration outcomes are asserted through the SAME code path the
  // server uses for agent builds (register() reads the file, parses
  // meta.triggers, merges creator proposals) — the fixture files stand in
  // for build output, so this half runs with no agent at all.
  const bad = entryOf(s, 'slopfix-agent-badjson.js');
  assert(bad, 'badjson fixture registered');
  assert(!(bad.triggers ?? []).some((tr) => tr.type === 'raid'), 'the malformed meta.triggers JSON was dropped whole — no proposal from it');
  assert((bad.triggers ?? []).some((tr) => (tr.patterns ?? []).includes('!agent-badjson')), 'the default !name activation command took over');

  const comma = entryOf(s, 'slopfix-agent-trailcomma.js');
  assert(comma, 'trailcomma fixture registered');
  const commaProp = (comma.triggers ?? []).find((tr) => tr.type === 'raid');
  assert(commaProp && commaProp.source === 'creator', 'the trailing-comma meta.triggers JSON parsed and registered as a creator proposal');
  assert(commaProp.enabled === false && commaProp.held === true, 'and it is held like any creator proposal outside the allow-list');
  assert(commaProp.minViewers === 5, 'the proposal content is stored verbatim (keyword spelled exactly as written)');

  const controls = entryOf(s, 'slopfix-controls.js');
  assert(String(controls?.controls ?? '').includes('!zap'), 'meta.controls registered for the interactive slop');
  const plain = entryOf(s, 'slopfix-trigger-modes.js');
  assert(plain?.controls == null, 'a non-interactive slop ships no controls — interactivity is opt-in');

  // Server-side chat relay surface (what onChat receives).
  await resetStage();
  const feed = await api.sse();
  try {
    let r = await api.post('/api/slop/chat', { text: 'nobody home', user: 'RelayViewer' });
    assert(r.data?.ok === false && /no slop is playing/i.test(r.data?.error ?? ''), 'the relay refuses with no stage');

    await api.post('/api/slop/play/slopfix-controls', { via: 'deck' });
    const mark = feed.mark();
    r = await api.post('/api/slop/chat', { text: '!zap hello', user: 'RelayViewer' });
    assert(r.data?.ok === true, 'chat relays to the on-stage slop');
    const chatEvent = await feed.waitAfter(mark, 'chat', (e) => e.data?.user === 'RelayViewer' && e.data?.text === '!zap hello', 4000);
    assert(chatEvent, 'the relayed chat was broadcast with user + text (and the playId)');
    assert(typeof chatEvent.data.playId === 'string', 'the relay payload carries the playId');
    r = await api.post('/api/slop/chat', { text: 'again', user: 'RelayViewer' });
    assert(r.data?.ok === false && /rate limited/i.test(r.data?.error ?? ''), 'the relay rate-limits a viewer (1s)');
  } finally {
    feed.close();
  }
  await resetStage();
});

check('agent-build-path', 'build path through a real agent: onChat opt-in, meta.controls refresh, ctx.done timing', async () => {
  if (process.env.SLOP_REGRESSION_AGENT_BUILD !== '1') {
    throw new SkipError('runs only with SLOP_REGRESSION_AGENT_BUILD=1 (needs a reachable opencode service); registration outcomes are covered by the agent-rules check');
  }
  // Probe: the build path fails fast and loudly when no agent is reachable.
  const probe = await api.post('/api/slop/build', { text: 'regression suite agent probe — build nothing yet' });
  assert(probe.data?.ok === true, 'the deck build was accepted');
  let reachable = false;
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    const s = await api.snapshot();
    const failed = [...(s.queue ?? []), ...(s.history ?? [])].find((i) => i.status === 'failed' && /opencode/i.test(String(i.reason ?? '')));
    if (failed) break;
    if ((s.queue ?? []).some((i) => i.status === 'generating')) { reachable = true; break; }
    await sleep(2000);
  }
  if (!reachable) {
    // Clean up the failed probe job, then skip — the build-path assertions
    // are agent-dependent and the SPEC says they skip cleanly.
    const s = await api.snapshot();
    const job = (s.queue ?? []).find((i) => i.status === 'failed');
    if (job) await api.post(`/api/slop/queue/${encodeURIComponent(job.id)}/cancel`, {});
    throw new SkipError('no opencode service reachable — the build-path assertions skip cleanly');
  }
  // An agent IS reachable: run the real build-path check.
  const before = new Set((await api.snapshot()).registered.map((e) => e.name));
  const build = await api.post('/api/slop/build', { text: 'a five second confetti pop; viewers can poke it with a !pop chat command (interactive)' });
  assert(build.data?.ok === true, 'the interactive build was accepted');
  const buildDeadline = Date.now() + 8 * 60_000;
  let builtName = null;
  while (Date.now() < buildDeadline) {
    const s = await api.snapshot();
    const fresh = s.registered.filter((e) => !before.has(e.name));
    if (fresh.length > 0) { builtName = fresh[fresh.length - 1].name; break; }
    const failed = [...(s.queue ?? []), ...(s.history ?? [])].find((i) => i.status === 'failed');
    if (failed) throw new Error(`the agent build failed: ${failed.reason}`);
    await sleep(3000);
  }
  assert(builtName, 'the agent build produced a slop');
  const entry = entryOf(await api.snapshot(), builtName);
  assert(String(entry.controls ?? '').includes('!pop'), 'the built slop registered meta.controls (interactivity was asked for)');
  const bundle = await api.get(`/api/slop/bundle/${encodeURIComponent(builtName)}`);
  const code = Buffer.from(bundle.data.codeBase64 ?? '', 'base64').toString('utf8');
  assert(/export\s+function\s+onChat/.test(code), 'the built slop exports onChat');
  await api.post(`/api/slop/pending/${encodeURIComponent(builtName)}/reject`, {}); // clean up
});

check('flood-cap', 'trigger flood cap: drops are announced with the throttled overlay note (deterministic via the config budget)', async (t) => {
  await resetStage();
  await ensureSlop('slopfix-flood-target.js', { triggers: [{ id: 'f', type: 'chat', mode: 'word', patterns: ['!floodgo'] }] });
  // Pin the budget deterministically — 1 dispatch per minute. The budget
  // change is live (the config API), so no reboot and no timing sensitivity.
  let r = await api.post('/api/slop/config', { triggerDispatchesPerMinute: 1 });
  assert(r.data?.ok === true, 'dispatch budget pinned to 1/min');
  const feed = await api.sse();
  try {
    const mark = feed.mark();
    // The first (or an already-budgeted) dispatch saturates the budget; a
    // second one inside the minute must drop — and SAY so.
    await api.dispatch({ type: 'chat', text: '!floodgo', login: 'viewer1' });
    await sleep(300);
    await api.dispatch({ type: 'chat', text: '!floodgo', login: 'viewer1' });
    const note = await feed.waitAfter(
      mark,
      'note',
      (e) => /flood cap hit/i.test(String(e.data?.text ?? '')),
      6000,
    );
    assert(/trigger flood cap hit \(1\/min\)/i.test(note.data.text), `the note names the pinned budget ("${note.data.text}")`);
    await sleep(1000);
    assert(!feed.findAfter(mark, 'play', (e) => e.data?.current?.name === 'slopfix-flood-target.js' && e.at > note.at), 'no further trigger play after the cap');
  } finally {
    feed.close();
  }
  // Restore the budget the fixture pinned (the check flipped it to 1/min).
  r = await api.post('/api/slop/config', { triggerDispatchesPerMinute: t.expectedBudget });
  assert(r.data?.ok === true, 'dispatch budget restored');
  await resetStage();
});

// --- main -----------------------------------------------------------------------

const initAuth = async () => {
  if (TOKEN) {
    // Remote/parity run: the ELM run presents an Elements session. Send it
    // both ways (bearer + Elements header) so either contract works.
    authHeaders = { authorization: `Bearer ${TOKEN}`, 'elements-session-secret': TOKEN };
    return 'token';
  }
  const res = await fixture.call('POST', '/session', { login: 'slopfixadmin' }, 10_000).catch(() => null);
  if (!res || res.status !== 200 || !res.data?.token) {
    throw new Error('no TOKEN and no fixture control API — management routes cannot be authenticated');
  }
  authHeaders = { cookie: `slopbot_session=${res.data.token}` };
  return 'fixture';
};

// Clear every fixture slop's streamer-saved state (triggers, cooldown,
// suspension, !slop toggle) so a re-run never inherits a previous run's
// leftovers — the store is authoritative for saved state and persists it.
// Skipped: the slops whose pin IS their file-meta-derived registration state
// (a save would overwrite exactly what they exist to prove), and they are
// never saved by any check.
const REGISTRATION_STATE_FIXTURES = new Set([
  'slopfix-default-name.js', // the unsaved default !name activation command
  'slopfix-held-raid.js', // creator proposal held by the allow-list
  'slopfix-agent-badjson.js', // malformed meta.triggers dropped → default !name
  'slopfix-agent-trailcomma.js', // trailing-comma proposal registered + held
  'slopfix-controls.js', // meta.controls registration surface
]);
const resetFixtureState = async () => {
  for (const name of FIXTURE_FILES) {
    if (REGISTRATION_STATE_FIXTURES.has(name)) continue;
    await api.post(`/api/slop/suspend/${encodeURIComponent(name)}`, { suspended: false });
    await api.post(`/api/slop/triggers/${encodeURIComponent(name)}`, { triggers: [], cooldownSeconds: 0, slopCommand: true });
    await api.post(`/api/slop/cooldown/${encodeURIComponent(name)}/clear`, {});
  }
};

const main = async () => {
  console.log(`slopbot-ai regression suite (HTTP tier) — BASE_URL=${BASE_URL}`);
  const authMode = await initAuth();
  console.log(`auth: ${authMode === 'token' ? 'TOKEN (remote/parity run)' : 'fixture-signed session cookie'}`);
  const health = await fixture.call('GET', '/healthz', undefined, 3000).catch(() => null);
  fixtureAvailable = Boolean(health && health.status === 200 && health.data?.ok);
  console.log(`fixture control: ${fixtureAvailable ? FIXTURE_CONTROL : 'unavailable — fixture-dependent checks will skip cleanly'}`);

  await resetFixtureState();
  const results = [];
  let failed = 0;
  let skipped = 0;
  const expectedBudget = fixtureAvailable && health?.data?.floodOverride ? Number(health.data.floodOverride) : FLOOD_OVERRIDE;
  heartbeatTimer = setInterval(() => {
    api.post('/api/slop/plays/heartbeat', {}).catch(() => {});
  }, 2000);

  for (const c of checks) {
    const t0 = Date.now();
    const ctx = { fixture: fixtureAvailable, expectedBudget };
    try {
      await c.fn(ctx);
      results.push(`PASS  ${c.id} (${Date.now() - t0}ms) — ${c.name}`);
      console.log(`PASS  ${c.id} (${Date.now() - t0}ms) — ${c.name}`);
    } catch (err) {
      if (err instanceof SkipError) {
        skipped += 1;
        results.push(`SKIP  ${c.id} — ${err.message}`);
        console.log(`SKIP  ${c.id} — ${err.message}`);
      } else {
        failed += 1;
        results.push(`FAIL  ${c.id} — ${c.name}\n      ${String(err?.stack ?? err)}`);
        console.log(`FAIL  ${c.id} — ${c.name}\n${String(err?.stack ?? err)}`);
      }
    }
  }
  clearInterval(heartbeatTimer);

  const passed = results.length - failed - skipped;
  console.log('\n=== results ===');
  for (const line of results) console.log(line);
  console.log(`\n${passed} passed, ${failed} failed, ${skipped} skipped (of ${results.length} checks)`);
  // A human-readable report for docs/regression/RESULTS.md regeneration.
  try { fs.writeFileSync(path.join(__dirname, '..', '.regression-results.txt'), `${results.join('\n')}\n`); } catch { /* nicety */ }
  process.exitCode = failed > 0 ? 1 : 0;
};

main().catch((err) => {
  console.error(`suite aborted: ${err.message}`);
  process.exit(1);
});
