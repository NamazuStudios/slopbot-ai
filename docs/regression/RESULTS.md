# SlopBot AI — Regression Suite Results

Local verification of the carried-forward behavior regression suite
(`docs/regression/SPEC.md`) against the reference implementation, run
**2026-11-24** on the implementation commit preceding this one
(`6e06598 Regression suite spec (greenlit plan)`).

## Local run results

**HTTP tier** (`npm run test:http`, `node scripts/regression.js` against the
fixture boot):

```
12 passed, 0 failed, 1 skipped (of 13 checks)
```

| # | Check | Pinned behavior | Result |
| --- | --- | --- | --- |
| 1 | `boot` | store attached, snapshot shape, fixture registry, IRC liveness surface | PASS |
| 2 | `feed-preflight` | the feed port answers CORS preflights on the wire (204 + `Access-Control-*`) | PASS |
| 3 | `trigger-modes` | chat modes exact/contains/starts/ends/word/wildcard/regex, case sensitivity, invalid-regex / patternless rejection | PASS |
| 4 | `trigger-events` | who-gating (mods/broadcaster), event types + criteria (sub tier, resub months, raid viewers, cheer bits, redemption rewardId, subgift, follow), firstchat/firstfollow-once, immediate vs queued, immediate-under-pause, unknown type → 400 | PASS |
| 5 | `cooldowns` | arms on trigger plays only, manual plays exempt + never re-arm, streamer-resettable via the clear endpoint, `bypassCooldown` plays through an armed window and never arms one itself | PASS |
| 6 | `name-resolution` | exact handle beats token-subset siblings, spacing-insensitive, `!slop`-disabled slops invisible to the resolver, default `!<short-name>` activation command | PASS |
| 7 | `irc-keepalive` | client pings on its own 15s schedule, `irc.connected` + `lastTrafficAgoMs` observable and advancing, force-reconnect of a silently-dead link (scripted fake IRC server) | PASS |
| 8 | `allow-list` | creator proposals outside the allow-list are held (disabled + badge) and don't dispatch; streamer-authored triggers always win; allow-list round-trips through the config API (string form, dedupe, unknown-type filter, empty refusal) | PASS |
| 9 | `cam` | normalized 0–1 placement + clamping, null save is a no-op, degenerate rect is a no-op, `configure()` merges with disk so newer keys survive an older process's write and a reboot | PASS |
| 10 | `bom-tolerance` | a BOM-prefixed `slop.json` boots with its values (not defaults), a live config write round-trips the file, clean config restorable | PASS |
| 11 | `agent-rules` | malformed `meta.triggers` JSON dropped whole, trailing-comma accepted (stored verbatim, held), `meta.controls` opt-in registration, server-side chat relay (rate limits, playId payload, no-stage refusal) | PASS |
| 12 | `flood-cap` | throttled overlay note on drops with a deterministic budget (`triggerDispatchesPerMinute` pinned to 1 via the config API, then restored) | PASS |
| 13 | `agent-build-path` | real agent build: `onChat` opt-in, `meta.controls` refresh, `ctx.done` timing | SKIPPED — runs only with `SLOP_REGRESSION_AGENT_BUILD=1` and a reachable opencode service; registration outcomes are covered by `agent-rules` (the SPEC's skip-cleanly contract) |

**Browser tier** (`npm run test:browser`, Playwright headless Chromium against
`/slop` on the same fixture boot):

```
6 passed (of 6 tests)
```

- boot report arrives and the `?debug=1` chip shows it (feed origin, SSE state, boot size + cam state, last bundle)
- no chip without `?debug`
- end reports: a preflighted cross-origin JSON POST to the feed port round-trips (the preflight was answered — this is the exact bug the feed server's OPTIONS handler exists for)
- heartbeat watchdog ends orphaned plays (heartbeat withheld → the play is up at +6s, gone by the 12s-stale + 5s watchdog window)
- canvas resize re-runs `init` (a narrowing after a wide boot ends the play within ~a frame — well ahead of the overlay's 2.5s self-heal)
- host-owned audio engine: exactly one AudioContext across repeated mounts, master gain capped at 0.5, `slop-sound` postMessage command channel in the generated sandbox preamble, the beep reaches the host engine

Both tiers were run twice back-to-back; the suite is idempotent (per-run
fixture-state reset + the fixture boot dropping its dedicated database).

## Mongo access path

Local runs used a `kubectl port-forward` to this session's Elements preview
instance pod, with the suite's dedicated database:

```
kubectl port-forward -n <namespace> pod/namazu-instance-<id> 27017:27017
MONGO_URL=mongodb://127.0.0.1:27017 MONGO_DATABASE=slopbot_regression \
SLOP_FLOOD_OVERRIDE=30 node scripts/fixtures/server.js
```

`MONGO_URL` is required (lib/store.js has no file fallback); `MONGO_DATABASE`
selects the dedicated database; `SLOP_FLOOD_OVERRIDE=30` pins the
deterministic dispatch budget for everything except the flood-cap check. In
CI both jobs use a `mongo:7` service container on the same env contract.

## CI

`.github/workflows/ci.yaml` — the repo's first workflow:

- Triggers: push to `main`, PRs to `main`.
- **Job `http`**: `npm ci` → boot the fixture server (mongo:7 service
  container) → `npm run test:http`; fixture-server log uploaded on failure.
- **Job `browser`**: `npm ci` → `npx playwright install --with-deps
  chromium` → `npm run test:browser` (Playwright's `webServer` boots the
  fixture boot itself when nothing is already answering at `BASE_URL`);
  Playwright report uploaded on failure.
- **Job `element-parity`**: wired and dormant (`if: false`) — the same
  runner against the deployed Kotlin element via `BASE_URL` + `TOKEN`
  (sent as bearer + `Elements-SessionSecret`); fixture-dependent checks
  skip cleanly on a remote target.

## Deviations and findings

1. **Registration-time store write-through never lands (found by the suite;
   documented, not worked around in the engine).** `slop.init()` calls
   `scanRegistered()` BEFORE `storeBoot()` connects the store, and
   `register()`'s `store.putSlop(...)` is fire-and-forget with an
   `if (!active) return false` guard — so at boot the file-derived
   registration NEVER reaches the store. The store only receives
   registrations via the first boot's `importFromFiles` (per-name skip
   afterwards), and every later boot's `loadRegistry()` stomps the fresh
   in-memory registration with that frozen document. Consequences observed:
   an allow-list change cannot un-hold a creator proposal across a restart
   (the merged triggers are refreshed in memory, then overwritten by the
   stale DB doc), and file-side meta changes never re-import. The suite
   pins the OBSERVABLE contract (held-at-registration, streamer-wins,
   allow-list round-trip) and works with the store as-is; the fixture boot
   drops its dedicated regression database precisely so the first import
   is always authoritative and runs stay deterministic. Worth an upstream
   look in this repo: move `storeBoot()` before `scanRegistered()`, or
   queue registration writes until the store is active.
2. **The `agent-build-path` check is opt-in** (`SLOP_REGRESSION_AGENT_BUILD=1`
   + a reachable opencode service) — per the SPEC it must not block the
   suite when no agent is present; the registration-level outcomes are
   asserted unconditionally by `agent-rules`.
3. **`bypassCooldown` semantics confirmed by testing** (and pinned as such):
   a bypassing trigger's play NEVER arms the window (`dispatchTrigger` only
   arms when `!trigger.bypassCooldown`) — arming is done by the same slop's
   plain trigger in the check.
4. **Browser tier environment note:** the Chromium *download* works here,
   but the system libraries cannot be installed in this container (sudo is
   blocked by no-new-privileges and the apt package lists are stale), so the
   browser tier was run with the required libraries extracted locally into a
   temp dir (`LD_LIBRARY_PATH`) — CI's `playwright install --with-deps` is
   the durable path.
5. **Suite-side design choices worth knowing:** the fixture boot signs
   management sessions with a fixture-owned HMAC key (the same wire format
   the server's session cookie uses), rewrites the Twitch IRC WebSocket URL
   to the scripted fake IRC server via a `node -r` preload hook, and backs
   up/restores the repo's `config/` + `slop.json` around each run. None of
   that touches the server code; every check drives the server over
   HTTP/SSE only.

## Files added (no server code touched)

- `scripts/regression.js` — the HTTP-tier runner (all checks)
- `scripts/fixtures/server.js`, `scripts/fixtures/irc-hook.js` — fixture boot
- `tests/fixtures/slops/` — the checked-in fixture mini-library (21 slops +
  `.txt` metadata + the `boing.wav` asset case)
- `tests/browser/` — the Playwright tier (3 spec files + helpers)
- `playwright.config.js`
- `.github/workflows/ci.yaml`
- `package.json` — scripts (`test`, `test:http`, `test:browser`,
  `fixtures:server`) + the `@playwright/test` devDependency only
