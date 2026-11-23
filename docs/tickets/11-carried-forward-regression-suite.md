# Ticket 11 — Carried-forward behavior regression suite

## Context

The monolith accumulated hard-won fixes. This ticket pins them as executable
checks so the Elements port (ticket 07) can't regress any of them.

## The list

- **Triggers**: chat criteria (starts/word/regex modes, case sensitivity),
  event types (follow/sub/resub/subgift/raid/cheer/redemption/firstchat/
  firstfollower), registry allow-list gating creator-proposed triggers only,
  flood cap (visible throttled overlay note on drops), immediate vs queued
  dispatch, `bypassCooldown`.
- **Cooldowns**: per-slop, seconds, arm on trigger plays only, manual plays
  unaffected, streamer-resettable.
- **IRC keepalive**: client pings every 15s; force-reconnect when pongs stop;
  a silently-dead socket can never leave the listener deaf; liveness visible
  in `/api/slop` (`irc.connected`, `lastTrafficAgoMs`).
- **`!name` is server-owned** — the agent never proposes `!`-patterns; keyword
  triggers spelled exactly as the viewer wrote them.
- **Streamer cam**: registry-global placement, normalized 0–1, injected from
  the Twitch token — never hardcoded; null cam on save is a no-op;
  `configure()` merges with disk so stale processes can't erase newer keys.
- **Config reads are BOM-tolerant** (a PowerShell-written `slop.json` once
  silently reset the entire config to defaults at boot).
- **Overlay self-heal**: end reports retry with CORS preflight answered;
  heartbeat watchdog ends orphaned plays; boot report + `?debug=1` chip.
- **Sound**: host-owned AudioContext, `slop-sound` commands over postMessage,
  gain capped at 0.5; canvas resize re-runs `init` self-heal.
- **Agent rules**: interactivity (`onChat`/`meta.controls`) opt-in only; runs
  capped at 60s via `ctx.done()`; `meta.triggers` strict JSON (parser
  tolerates trailing commas).

## Acceptance

- A test script exercises each item against the running server (synthetic
  trigger dispatch, chat test endpoints, boot assertions).
- The suite runs green in CI before any ticket 03–07 refactor lands.
