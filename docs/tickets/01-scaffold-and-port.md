# Ticket 01 — Repo scaffold & single-tenant reference port

**Status: delivered in the initial commit.** This ticket is the record of what
was ported and is the baseline every other ticket builds on.

## Scope

- Stand up `ptwohig/slopbot-ai` as a standalone repo, split out of
  `twitch-three-js` (the monolith keeps its three.js scenes; only the slop
  feature moves).
- Port the complete, working single-tenant pipeline:
  - `lib/slop.js` — the engine: generation queue, registry, playback queue,
    triggers (chat/event criteria, allow-list, flood cap with visible
    throttled notice, first-ever chatter/follower tracking, immediate vs
    queued dispatch, `bypassCooldown`), per-slop cooldowns in seconds,
    IRC listener with keepalive + force-reconnect, cam placement, bundler,
    OpenCode agent bridge, BOM-tolerant config reads.
  - `lib/eventsub.js` — EventSub WebSocket, OAuth lifecycle, redemptions,
    follow subscription, chat send.
  - `lib/secrets.js` — encrypted credential handling.
  - `public/slop.*` — the OBS overlay (self-healing end reports, heartbeat,
    debug chip).
  - `public/deck.*` — the properties screen: generation queue, registry,
    playback queue, triggers pane, allow-list, flood cap field, cam editor
    with live stream embed, moderation.
  - `public/lib/slop-sandbox.js` — the sandbox: `ctx.trigger`/`onTrigger`/
    `ctx.streamer`/`ctx.done`/host-owned sound commands (gain capped 0.5).
- New standalone `server.js`: slop routes only (no three.js scenes), plus a
  landing page at `/` with a Twitch-login placeholder.
- Preserve the color scheme: pink `#ff0099`, navy `#0d1335`.
- Migrate the existing slop library: all current slops, their `.txt` metadata,
  and `slops/shared/sounds` + `slops/assets` come across as files. (The DB
  migration is ticket 12.)

## Acceptance

- `npm install && npm start` boots; `/`, `/deck`, `/slop` serve.
- A viewer prompt through the deck builds, moderates, and plays a slop.
- Chat triggers, `!slop`, redemptions, and follows all fire as in the monolith.
