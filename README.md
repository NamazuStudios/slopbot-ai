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

Then:

1. Open `/auth/twitch` and follow the one-time channel authorization.
2. Set your channel in the deck's ⚙ settings (or `slop.json` → `"channel"`).
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

## License

UNLICENSED — private project.
