'use strict';

// Boot surface of the /slop overlay (docs/regression/SPEC.md, pinned
// behavior 7): the sandbox boot report arrives and the ?debug=1 chip shows
// it; end reports round-trip against the feed port with its CORS preflight
// answered.

const { test, expect } = require('@playwright/test');
const { BASE_URL, startPlay, resetStage } = require('./helpers');

const FEED_PORT = Number(process.env.FEED_PORT || 3010);

test.beforeEach(resetStage);
test.afterEach(resetStage);

test('boot report arrives and the ?debug=1 chip shows it', async ({ page }) => {
  await page.goto('/slop?debug=1');
  await startPlay('slopfix-beeper.js');

  // The stage mounts the sandboxed iframe for the play…
  const iframe = page.locator('#stage iframe');
  await expect(iframe).toHaveCount(1);

  // …the sandbox reports what it actually booted with, and the chip surfaces
  // it: feed origin, SSE state, boot size + cam state, and the bundle name.
  const chip = page.locator('.debugchip');
  await expect(chip).toHaveText(/sse open/, { timeout: 20_000 });
  await expect(chip).toHaveText(/last: slopfix-beeper/, { timeout: 20_000 });
  await expect(chip).toHaveText(/boot \d+x\d+ cam/, { timeout: 20_000 });
  const bootInfo = await page.evaluate(() => document.getElementById('stage')?._slopMount?.bootInfo ?? null);
  expect(bootInfo).toBeTruthy();
  expect(bootInfo.w).toBeGreaterThan(0);
  expect(bootInfo.h).toBeGreaterThan(0);
});

test('without ?debug there is no chip', async ({ page }) => {
  await page.goto('/slop');
  await startPlay('slopfix-beeper.js');
  await expect(page.locator('#stage iframe')).toHaveCount(1);
  await expect(page.locator('.debugchip')).toHaveCount(0);
});

test('end reports: the feed port answers the CORS preflight a JSON POST sends', async ({ page }) => {
  await page.goto('/slop');
  // The overlay's end reports are JSON POSTs — preflighted when
  // cross-origin (the feed lives on its own port). The feed must answer the
  // preflight or the report silently dies — this is the exact bug the feed
  // server's OPTIONS handler exists for.
  const feedOrigin = `${new URL(BASE_URL).protocol}//${new URL(BASE_URL).hostname}:${FEED_PORT}`;
  const result = await page.evaluate(async (origin) => {
    const res = await fetch(`${origin}/api/slop/ended`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'slopfix-beeper.js', playId: null }),
    });
    return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) };
  }, feedOrigin);
  // A preflighted cross-origin POST that resolves ok IS the proof: the
  // browser would have thrown before sending it had the feed's OPTIONS
  // preflight gone unanswered. (The wire headers themselves are asserted in
  // the HTTP tier — Access-Control-Allow-Origin is not JS-readable here
  // without Access-Control-Expose-Headers.)
  expect(result.ok).toBeTruthy();
  expect(typeof result.body?.ok).toBe('boolean');
});
