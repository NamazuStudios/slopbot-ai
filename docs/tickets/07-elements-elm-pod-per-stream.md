# Ticket 07 — Namazu Elements ELM distribution: pod-per-stream

## Context

The slop feature becomes an **ELM-based distribution that runs in a copy of
Namazu Elements**. The ELM handles triggers, scene serving, queueing. It
brings up **one pod per stream, each dedicated to a single streamer**.

## What gets absorbed from the reference `server.js` (nothing double-exists)

- **HTTP server, routes, static files** → Elements. It owns the runtime and
  **it serves static files**: the pages (`/`, `/deck`, `/slop`), the sandbox,
  CSS/JS, and assets mount as static content / handler registrations in the
  ELM. The reference `server.js` and its Express app do not ship in the
  Elements deployment — it remains only the runnable reference and migration
  source.
- **Feed server on :3010** → Elements' own serving/SSE machinery — the
  dedicated port exists in the monolith only to dodge its per-host connection
  budget, which is a non-problem in Elements.
- **Secrets/config loading** → Elements instance config + Conductor-injected
  secrets.
- **IRC/EventSub wiring + the watcher loop** → the pod's main container, owned
  by the ELM lifecycle.
- **`lib/slop.js` engine** mostly survives as the ELM's engine module — it is
  already a plain library; only its wiring is monolith-shaped.

## ELM contents

- **Landing page** — Twitch login. Placeholder now, marketing page later
  (ticket 02).
- **Logged-in dashboard** — view/modify the slop registry, settings,
  moderation, play slops on stream; a robust, detailed editor.
- **`/deck` page** — only: generation queue, registry, playback queue.

## Pod lifecycle

1. The ELM detects a streamer going live (Twitch stream status) and schedules
   the pod (Conductor job annotation per ticket 05).
2. **Main container** connects IRC + EventSub at stream start and stays
   connected until the stream ends. Streams flap: a down-event is acted on
   only after a **5-minute grace timeout**.
3. The main container's **watcher loop refreshes/rotates the agent's OIDC
   token while the stream is alive** — the token always covers at least the
   stream's life; when rotation stops, access ends by construction.
4. Stream ends (post-grace) → pod is torn down cleanly (queue drained,
   registry state persisted per ticket 03).

## Pod contents

1. Main container (above)
2. OpenCode sidecar (ticket 05)
3. Security proxy sidecar (ticket 06)

## Acceptance

- Stream start → pod up → IRC/EventSub connected → triggers live.
- A 4-minute stream flap does not tear down the pod.
- Stream end (+5 min) → pod down, state persisted, no orphaned tokens.
- Two simultaneous streams get two isolated pods; neither can see the other.
