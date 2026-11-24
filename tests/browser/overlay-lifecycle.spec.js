'use strict';

// Stage lifecycle self-heal on the /slop overlay (docs/regression/SPEC.md,
// pinned behavior 7): the heartbeat watchdog ends orphaned plays when the
// overlay stops pinging, and a canvas resize re-runs the slop's init.

const { test, expect } = require('@playwright/test');
const { startPlay, currentPlay, waitForStageEmpty, resetStage } = require('./helpers');

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
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/slop');

  await startPlay('slopfix-doneresize.js');
  await page.waitForSelector('#stage iframe');
  // The boot race: a fresh iframe can boot before the parent's CSS sizes it —
  // so wait for the SETTLED wide boot (the sandbox re-posts its boot report on
  // every re-init, so bootInfo tracks the current truth).
  await page.waitForFunction(() => {
    const boot = document.getElementById('stage')?._slopMount?.bootInfo;
    return Boolean(boot && boot.w >= 1000);
  }, undefined, { timeout: 20_000 });

  // Resize → the sandbox re-fits and RE-RUNS init with the corrected ctx —
  // and re-posts the boot report, so the corrected ctx is directly observable.
  await page.setViewportSize({ width: 800, height: 600 });
  await page.waitForFunction(() => {
    const boot = document.getElementById('stage')?._slopMount?.bootInfo;
    return Boolean(boot && boot.w > 0 && boot.w < 1000);
  }, undefined, { timeout: 10_000 });

  // And the play SURVIVED the re-init (still up, still animating).
  await expect.poll(currentPlay, { timeout: 5_000, intervals: [250] }).toBeTruthy();
});
