'use strict';

// Playwright config for the browser tier of the regression suite
// (docs/regression/SPEC.md): one headless-Chromium run against the /slop
// overlay, asserting the CLIENT-SIDE behaviors the HTTP tier cannot reach.
//
// The fixture boot (scripts/fixtures/server.js) supplies the server — booted
// here automatically when nothing is already answering at BASE_URL
// (reuseExistingServer), so `npm run test:browser` works standalone. It needs
// MONGO_URL like any boot (locally: the kubectl port-forward; in CI: the
// mongo:7 service container).
//
// The stage is a SINGLE shared resource on the server (one current play),
// so tests run strictly serially — parallel workers would fight over it.

const BASE_URL = (process.env.BASE_URL || 'http://127.0.0.1:3000').replace(/\/+$/, '');

module.exports = {
  testDir: './tests/browser',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    headless: true,
    launchOptions: {
      // The overlay's AudioContext must actually run headless for the sound
      // assertions; audio output itself is muted.
      args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
    },
  },
  webServer: {
    command: 'node scripts/fixtures/server.js',
    url: `${BASE_URL}/api/slop`,
    reuseExistingServer: true,
    timeout: 180_000,
  },
  outputDir: 'test-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
};
