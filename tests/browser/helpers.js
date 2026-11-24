'use strict';

// Shared helpers for the browser-tier specs. The server is driven purely
// over HTTP (transport-only, docs/regression/SPEC.md): plays are started
// with the cameo route (open by design) and observed through the SSE
// snapshot at GET /api/slop.

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

const startPlay = async (name, via = 'deck') => {
  const res = await fetch(`${BASE_URL}/api/slop/play/${encodeURIComponent(name)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ via }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.ok !== true) throw new Error(`startPlay(${name}) failed: ${res.status} ${JSON.stringify(body)}`);
  return body;
};

const endPlay = async (name, playId = null) => {
  const res = await fetch(`${BASE_URL}/api/slop/ended`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, playId }),
  });
  if (!res.ok) throw new Error(`endPlay(${name}) failed: ${res.status}`);
};

const snapshot = async () => {
  const res = await fetch(`${BASE_URL}/api/slop`);
  if (!res.ok) throw new Error(`GET /api/slop failed: ${res.status}`);
  return res.json();
};

const currentPlay = async () => (await snapshot()).plays?.current ?? null;

// Poll the snapshot until the stage is empty — with a deadline.
const waitForStageEmpty = async (timeoutMs) => {
  const deadline = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await currentPlay();
    if (!last) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`the stage never drained (still playing ${last?.name})`);
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Drain anything a previous test left on the stage.
const resetStage = async () => {
  for (let i = 0; i < 15; i++) {
    const s = await snapshot();
    const plays = s.plays ?? {};
    if (!plays.current && !(plays.upcoming ?? []).length && !plays.paused) return;
    if (plays.paused) await fetch(`${BASE_URL}/api/slop/plays/resume`, { method: 'POST' });
    if (plays.current) await endPlay(plays.current.name, plays.current.playId ?? null);
    else if ((plays.upcoming ?? []).length) {
      await fetch(`${BASE_URL}/api/slop/plays/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: plays.upcoming[0].name }),
      });
    }
    await sleep(150);
  }
  throw new Error('the stage did not drain');
};

module.exports = { BASE_URL, startPlay, endPlay, snapshot, currentPlay, waitForStageEmpty, sleep, resetStage };
