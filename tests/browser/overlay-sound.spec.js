'use strict';

// The host-owned audio engine (docs/regression/SPEC.md, pinned behavior 8):
// ONE AudioContext per page, sandbox sounds ride 'slop-sound' postMessage
// commands, the master gain is capped at 0.5, and repeated mounts never
// exhaust the engine.

const { test, expect } = require('@playwright/test');
const { startPlay, endPlay, resetStage } = require('./helpers');

test.beforeEach(resetStage);
test.afterEach(resetStage);

test('host-owned audio engine: one context for the whole page, gain capped at 0.5, slop-sound commands honored', async ({ page }) => {
  // Wrap AudioContext before the page's own scripts run: count contexts,
  // record created gain values, and count oscillators actually started.
  await page.addInitScript(() => {
    const spy = { contexts: 0, gainNodes: [], oscStarts: 0 };
    window.__slopAudioSpy = spy;
    const Orig = window.AudioContext;
    if (!Orig) return;
    class Wrapped extends Orig {
      constructor(...args) {
        super(...args);
        spy.contexts += 1;
        const origGain = this.createGain.bind(this);
        this.createGain = (...g) => {
          const node = origGain(...g);
          spy.gainNodes.push(node); // read gain.value at assert time — the engine sets it AFTER create
          return node;
        };
        const origOsc = this.createOscillator.bind(this);
        this.createOscillator = (...o) => {
          const osc = origOsc(...o);
          const origStart = osc.start.bind(osc);
          osc.start = (...s) => {
            spy.oscStarts += 1;
            return origStart(...s);
          };
          return osc;
        };
      }
    }
    window.AudioContext = Wrapped;
  });

  await page.goto('/slop');
  await startPlay('slopfix-beeper.js'); // init(ctx) → ctx.sound.beep → a 'slop-sound' command
  const iframe = page.locator('#stage iframe');
  await expect(iframe).toHaveCount(1);

  // The generated sandbox preamble wires the command channel and reports the
  // cap to the slop itself (ctx.sound.gain.value).
  const srcdoc = await iframe.getAttribute('srcdoc');
  expect(srcdoc).toContain("type: 'slop-sound'"); // the postMessage command channel
  expect(srcdoc).toContain("sound: 'beep'"); // the synthesized command set
  expect(srcdoc).toContain('value: 0.5'); // the cap the sandbox reports to the slop

  // The host owns exactly ONE AudioContext, its master gain pinned at 0.5.
  let spy = await page.evaluate(() => window.__slopAudioSpy);
  expect(spy.contexts).toBe(1);
  const gainValues = () => page.evaluate(() => window.__slopAudioSpy.gainNodes.map((n) => n.gain.value));
  expect(await gainValues()).toContain(0.5);

  // A second mount must reuse the same context (per-iframe contexts
  // exhausted Chrome's pool — that is the bug this pins).
  const firstMount = await page.evaluate(() => document.getElementById('stage')?._slopMount?.opts?.playId ?? null);
  await endPlay('slopfix-beeper.js');
  await startPlay('slopfix-beeper.js');
  await page.waitForFunction(
    (old) => {
      const mount = document.getElementById('stage')?._slopMount;
      return mount && mount.opts?.playId && mount.opts.playId !== old;
    },
    firstMount,
    { timeout: 20_000 },
  );
  spy = await page.evaluate(() => window.__slopAudioSpy);
  expect(spy.contexts).toBe(1); // still the one host-owned context
  expect(await gainValues()).toContain(0.5);

  // The beep actually reached the engine (sandbox → postMessage → host synth).
  await expect
    .poll(() => page.evaluate(() => window.__slopAudioSpy.oscStarts), { timeout: 10_000 })
    .toBeGreaterThan(0);
  await endPlay('slopfix-beeper.js');
});
