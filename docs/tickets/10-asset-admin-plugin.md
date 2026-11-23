# Ticket 10 — Slop assets admin panel plugin

## Context

Slop assets (audio: `.mp3/.ogg/.wav`; video: `.mp4/.webm` — see ticket 03) are
**managed fully by Namazu's team on the backend**, via an admin panel plugin.

## Scope

- Admin panel plugin: list, upload, replace, and retire assets per tenant and
  globally (shared pool).
- Validation: extension/mime allow-list, size caps, name normalization (the
  bundler references assets by bare name).
- Retired assets must not break existing slops: bundler behavior for missing
  assets stays graceful (the sandbox's audio pool already self-heals).
- Access restricted to Namazu team roles (server-side enforced, ticket 08
  roles apply).

## Acceptance

- Team uploads `boing.mp3`; an existing slop calling `sound.sample('boing')`
  finds it at next bundle.
- Retiring an asset suspends the sound cleanly, without breaking playback.
- Non-team roles cannot reach any of it.
