'use strict';

// Preloaded with `node -r scripts/fixtures/irc-hook.js server.js` by the
// fixture boot (scripts/fixtures/server.js). The reference server hardcodes
// its chat listener to `wss://irc-ws.chat.twitch.tv:443` (lib/slop.js,
// startChatListener) — the only seam a test harness has. When
// SLOP_FAKE_IRC_URL is set, every Twitch-shaped WebSocket URL is rewritten
// to the scripted fake IRC server instead, so the suite never touches real
// Twitch and the keepalive/liveness contract is observable. Nothing else is
// patched; a non-Twitch address (or unset env) behaves stock.

const Module = require('node:module');

const FAKE_URL = process.env.SLOP_FAKE_IRC_URL || '';

if (FAKE_URL) {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    const exports = originalLoad.apply(this, arguments);
    if (request === 'ws' && exports && exports.WebSocket && !exports.__slopIrcHooked) {
      const RealWebSocket = exports.WebSocket;
      class FixtureWebSocket extends RealWebSocket {
        constructor(address, protocols, options) {
          if (typeof address === 'string' && /twitch/i.test(String(address))) {
            address = FAKE_URL; // the scripted fake IRC server
            options = undefined; // plain ws:// — no TLS-specific options carry over
          }
          super(address, protocols, options);
        }
      }
      const patched = Object.create(exports);
      patched.WebSocket = FixtureWebSocket;
      Object.defineProperty(patched, '__slopIrcHooked', { value: true });
      return patched;
    }
    return exports;
  };
}
