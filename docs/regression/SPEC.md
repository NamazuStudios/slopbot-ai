# SlopBot AI — Carried-Forward Behavior Regression Suite — Implementation SPEC

The design of record is the AI Slop Bot notebook; this is the distilled implementation contract for the suite in **this** repo (`NamazuStudios/slopbot-ai`, the reference implementation — which is also the suite's calibration oracle).

## Purpose

Pin the monolith's hard-won behavior as executable checks so the Kotlin element port (`NamazuStudios/slopbot-ai-element`) cannot regress any of it. **Greenlit decisions (binding):** the suite has an HTTP tier AND a browser tier (Playwright in CI — approved); fixture slops are checked into the repo at `tests/fixtures/slops/`; the flood-cap check asserts the throttled-notice path with a deterministic env override; **the pod's main container is responsible for monitoring chat and events** (the ELM does not talk IRC) — the keepalive checks target that container's surface.

## Requirements

- Pure Node (repo is Node; runner: `node scripts/regression.js`) — no new test framework beyond Playwright for the browser tier.
- Transport-only: HTTP + SSE + pages — no filesystem/process internals — so the same suite runs unmodified against the Kotlin element later via `BASE_URL` + `TOKEN` env (the reference runs token-less).
- The suite must be green on the reference BEFORE any port work is reviewed; it is also the Kotlin port's parity harness ("port complete" = the suite passes against the ELM).

## The pinned behaviors (each = one check)

1. **Triggers** — chat criteria (exact/contains/starts/ends/word/wildcard/regex modes, case sensitivity), event types (follow/sub/resub/subgift/raid/cheer/redemption/firstchat/firstfollower), registry allow-list gating creator-proposed triggers only, flood cap (visible throttled overlay note on drops), immediate vs queued dispatch, `bypassCooldown`; and the `http` type — a secret per-slop key posted as the whole `text/plain` body of `POST /trigger` that identifies and plays the slop (no session; the key is the credential, never exposed on open surfaces; rotation kills the old key; a creator proposal of type `http` is rejected, not held).
2. **Cooldowns** — per-slop, seconds, arm on trigger plays only, manual plays unaffected, streamer-resettable.
3. **IRC keepalive** — client pings every 15s; force-reconnect when pongs stop; a silently-dead socket can never leave the listener deaf; liveness visible in `/api/slop` (`irc.connected`, `lastTrafficAgoMs`).
4. **`!name` is server-owned** — the agent never proposes `!`-patterns; keyword triggers spelled exactly as the viewer wrote them.
5. **Streamer cam** — registry-global placement, normalized 0–1, injected from the Twitch token — never hardcoded; null cam on save is a no-op; `configure()` merges with disk so stale processes can't erase newer keys.
6. **Config reads are BOM-tolerant** (a PowerShell-written `slop.json` once silently reset the entire config to defaults at boot).
7. **Overlay self-heal** — end reports retry with CORS preflight answered; heartbeat watchdog ends orphaned plays; boot report + `?debug=1` chip.
8. **Sound** — host-owned AudioContext, `slop-sound` commands over postMessage, gain capped at 0.5; canvas resize re-runs `init` self-heal.
9. **Agent rules** — interactivity (`onChat`/`meta.controls`) opt-in only; runs capped at 60s via `ctx.done()`; `meta.triggers` strict JSON (parser tolerates trailing commas).

## Implementation plan

**Harness skeleton**
- `scripts/regression.js` — the runner: boots nothing itself; drives a RUNNING server (the fixture server started by the CI job, or any `BASE_URL`).
- `scripts/fixtures/server.js` — boots the reference server for tests: `MOCK_AGENT=1` is NOT used (mock removed by decision) — instead the build path is exercised via the real agent when available and SKIPPED cleanly (marked skipped, not failed) when no agent is reachable; trigger/chat/event checks run fully offline.
- `tests/fixtures/slops/` — a purpose-built mini-library checked into the repo: one slop per trigger mode + cooldown + cam + asset case, with their `.txt` metadata and the assets they need.

**HTTP tier (`scripts/regression.js`)**
- Env: `BASE_URL` (default `http://127.0.0.1:3000`), `TOKEN` (optional — the ELM run presents an Elements session; the reference runs token-less).
- Checks are idempotent: setup (create/alter a fixture slop via the API) → act (synthetic chat via `POST /api/slop/chat`, events via `POST /api/slop/trigger/dispatch`, per-trigger test via `POST /api/slop/triggers/:name/test`) → assert (snapshot deltas: queue contents, SSE `plays`/`queue`/`cooldowns` broadcast payloads, `/api/slop` fields).
- Flood cap: `SLOP_FLOOD_OVERRIDE` env on the fixture server forces a deterministic dispatch budget; assert the SSE throttled-notice payload arrives (not timing-sensitive counts).
- IRC keepalive: assert the observable contract (`irc.connected` transitions, `lastTrafficAgoMs` advances) against a scripted fake IRC server the fixture boot connects to; unit-test the 15s ping/force-reconnect logic directly against a fake socket.
- BOM tolerance: boot the fixture server with a BOM-prefixed config; assert the config echo round-trips values (not defaults).
- Agent rules: a fixture build output exercising `onChat` opt-in, `ctx.done()` timing, malformed-trigger JSON (dropped), trailing-comma JSON (accepted) — assert registration outcomes (skipped cleanly without an agent).
- `!name` resolution: exact handle wins outright over token-subset siblings; spacing-insensitive; only `!slop`-enabled slops exist to the search.
- Cam: save with null → no-op; configure() merge preserves newer keys.

**Browser tier (`tests/browser/`, Playwright)**
- One headless-Chromium job in CI: load `/slop` (the overlay) per case and assert the CLIENT-SIDE behaviors the HTTP tier cannot reach:
  - end reports retry with CORS preflight answered;
  - heartbeat watchdog ends orphaned plays;
  - boot report arrives; `?debug=1` chip shows;
  - host-owned AudioContext: `slop-sound` postMessage commands honored, gain capped at 0.5 (assert the generated sandbox preamble + the audio engine state);
  - canvas resize re-runs `init` self-heal.
- Separable: `npm run test:http` and `npm run test:browser` so the HTTP tier runs everywhere.

**CI (`.github/workflows/ci.yaml` — the repo has NO workflows today; this is its first)**
- Triggers: push to `main`, PRs to `main`.
- Job 1: `npm ci` → boot the fixture server → `npm run test:http`.
- Job 2: Playwright (`playwright/test` action) → `npm run test:browser`.
- Job 3 (element parity, wired later): `BASE_URL`/`TOKEN` pointed at the Kotlin element — same checks; add the job now with `if: false` (dormant, documented) so the contract is visible.

## Exit criteria

- `npm run test:http` green on the reference implementation.
- `npm run test:browser` green in CI.
- The suite is transport-only and parameterized (`BASE_URL`/`TOKEN`).
