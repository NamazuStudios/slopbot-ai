# SlopBot AI

The slop engine as a service: viewers prompt an AI agent from Twitch chat, the
agent codes a live canvas **slop** in seconds, and it plays on stream — with
triggers, cooldowns, a moderation flow, a playback queue, and a deck you
control.

**Brand colors:** accent pink `#ff0099`, navy `#0d1335`.

## Pages

| Route | What it is |
| --- | --- |
| `/` | Landing page — Twitch login (placeholder until the marketing page lands) |
| `/slop` | The overlay you point an OBS browser source at |
| `/deck` | The properties screen: registry, generation queue, playback queue, triggers, settings |

The deck controls are built to be embeddable as a module on other pages
(ticket 11).

## Run it

```
npm install
npm start
```

Requires a reachable MongoDB (`MONGO_URL` env var) — the slop store is the
source of truth, and startup fails fast without it.

Then:

1. Open `/auth/login` and log in with Twitch (registers your session; the
   first login manages the tenant until you set `"channel"` in the deck's ⚙
   settings, after which only that channel's streamer and configured
   `superusers` can manage).
2. Open `/auth/twitch` for the one-time bot/channel authorization (separate
   from your user login).
3. Point an OBS browser source at `http://localhost:3000/slop` (1920×1080).

Config lives in `slop.json` (created from defaults on first run — see
`slop.json.example`). Twitch credentials live in `config/twitch.json`, or the
encrypted `config/twitch.json.aes` (committed form) via
`npm run secrets:encrypt`.

## Architecture

`docs/DESIGN.md` is the full design: the Namazu Elements port, the
pod-per-stream model, the OpenCode agent sidecar, the MCP tool surface, OIDC
security, and the Morphia data model. `docs/tickets/` carries the executable
ticket series (mirrored as GitHub issues) to get from this single-tenant
reference implementation to the deployed multi-tenant product.

## Regression suite

`docs/regression/SPEC.md` is the binding contract for the carried-forward
behavior regression suite: transport-only checks that pin the monolith's
hard-won behaviors (trigger modes, cooldowns, allow-lists, flood cap,
`!name` resolution, streamer cam, BOM tolerance, IRC keepalive, agent-rule
registration) so the Kotlin element port (`slopbot-ai-element`) cannot
regress any of them. Two tiers:

- **HTTP tier** — `npm run test:http` (runner: `scripts/regression.js`,
  fixture boot: `scripts/fixtures/server.js`, checked-in fixture slops:
  `tests/fixtures/slops/`). Needs `MONGO_URL` (the store is required).
- **Browser tier** — `npm run test:browser` (Playwright, headless Chromium
  against `/slop`; the fixture boot is started automatically when nothing
  answers at `BASE_URL`). Needs its system deps
  (`npx playwright install --with-deps chromium`).

`docs/regression/RESULTS.md` records the current results. CI runs both
tiers (`.github/workflows/ci.yaml`) plus the dormant element-parity job.

## License

UNLICENSED — private project.
