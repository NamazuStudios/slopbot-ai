# Ticket 09 — Embeddable deck module

## Context

The slop deck controls must be **embeddable in another page as a module** —
not only served at `/deck`.

## Scope

- Package the deck as a self-contained embed: a web component
  (`<slopbot-deck>`) that mounts the deck UI inside a shadow root, or an
  iframe embed with a small loader script — whichever keeps the host page
  isolated from the deck's internals.
- Configuration via attributes/params: tenant/streamer identity, auth token
  (session or OIDC per ticket 02/07), theme (default: pink `#ff0099` on navy
  `#0d1335`).
- The embed carries the full deck surface or a subset (registry only,
  playback queue only) via attributes.
- Works on third-party pages: CORS/preflight handled everywhere (the feed
  server already answers OPTIONS), SSE reconnects cleanly.

## Acceptance

- A minimal static HTML page drops in `<slopbot-deck streamer="…">` and gets
  a working deck.
- The embed authenticates via the host's session/token and fails closed.
- Styling stays self-contained (no leakage in or out).
