'use strict';

// Stage lifecycle self-heal on the /slop overlay (docs/regression/SPEC.md,
// pinned behavior 7): the heartbeat watchdog ends orphaned plays when the
// overlay stops pinging, and a canvas resize re-runs the slop's init.

const { test, expect } = require('@playwright/test');
const { startPlay, currentPlay, waitForStageEmpty, resetStage, mintTestSession, installSession } = require('./helpers');

test.beforeEach(resetStage);
test.afterEach(resetStage);

test('heartbeat watchdog ends orphaned plays — a dead overlay can never stall the queue', async ({ page }) => {
  // This page will NOT heartbeat: swallow the overlay's own liveness pings
  // while every other request (SSE, polls, bundles) keeps working.
  await page.addInitScript(() => {
    const orig = window.fetch.bind(window);
    window.__origFetch = orig;
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (String(url).includes('/api/slop/plays/heartbeat')) {
        return Promise.resolve(new Response('{"ok":true}', { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return orig(input, init);
    };
  });
  await page.goto('/slop');

  // One REAL heartbeat so the watchdog clock starts fresh with this test.
  await page.evaluate(() => window.__origFetch('/api/slop/plays/heartbeat', { method: 'POST' }));

  await startPlay('slopfix-slow.js');
  await page.waitForSelector('#stage iframe');
  await new Promise((r) => setTimeout(r, 6000));
  // 6s in: well inside the 12s heartbeat-stale window — the play must still be up.
  expect(await currentPlay()).toBeTruthy();

  // The pings never come: the host watchdog (12s stale + the 5s tick) ends
  // the orphaned play instead of stalling the full 75s fuse.
  await waitForStageEmpty(30_000);
  // And the page cleared its stage to match.
  await expect(page.locator('#stage iframe')).toHaveCount(0, { timeout: 10_000 });
});

test('canvas resize re-runs init — the slop re-inits with the corrected ctx', async ({ page }) => {
  // Raise the fuse for this test: the fixture self-ends only on a narrowing
  // after a 20s stable wide boot (see the fixture's debounce), so the fuse
  // must not expire mid-verification. Restored at the end. The config route
  // is manage-gated — the test mints a session from the fixture control API
  // (anonymous is 401 even in dev mode).
  const session = await mintTestSession('superuser');
  await installSession(page.context(), session);
  const cfgRes = await page.request.post('/api/slop/config', { data: { maxSlopSeconds: 120 } });
  if (cfgRes.status() !== 200) throw new Error(`config POST failed: ${cfgRes.status()}`);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/slop');

  // This slop ends itself from init() once the canvas NARROWS AFTER a wide
  // boot — a pure init-driven end, nothing else can report it. (A fresh
  // iframe can boot before the parent's CSS sizes it — the boot race the
  // sandbox's self-heal exists for — so "wide boot first" is part of the
  // fixture's contract.)
  await startPlay('slopfix-doneresize.js');
  await page.waitForSelector('#stage iframe');
  await page.waitForFunction(() => {
    const boot = document.getElementById('stage')?._slopMount?.bootInfo;
    return Boolean(boot && boot.w >= 1000);
  }, undefined, { timeout: 20_000 });
  // Settle past the fixture's 20s wide-boot debounce — after this, ANY
  // narrowing is a real resize, and none can have fired during the settle
  // (the debounce forbids it). Control: the play must still be up; polled,
  // since the server snapshot can lag the iframe's boot on slow runners.
  await page.waitForTimeout(21_000);
  await expect.poll(currentPlay, { timeout: 15_000, intervals: [250] }).toBeTruthy();

  // Resize → the sandbox re-fits and RE-RUNS init with the corrected ctx →
  // the slop's own init logic (ctx.done()) ends the play.
  await page.setViewportSize({ width: 800, height: 600 });
  await waitForStageEmpty(2500);
  await page.request.post('/api/slop/config', { data: { maxSlopSeconds: 12 } });
});
