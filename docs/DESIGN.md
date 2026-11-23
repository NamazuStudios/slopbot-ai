# SlopBot AI — `ptwohig/slopbot-ai`

Design for splitting the slop feature out of `twitch-three-js` into a standalone, multi-tenant product.

## Product overview

SlopBot AI is the slop engine as a service: any streamer can connect their Twitch
account, get a slop deck and a `/slop` overlay, and their viewers build slops in
chat. The monolith's single-streamer assumption disappears — every stream is its
own tenant.

## High-level components

- **`/slop` page** — the OBS overlay, per-streamer. Preserves the current color
  scheme (accent pink `#ff0099`, navy `#0d1335`).
- **`/deck` page** — the properties screen, per-streamer.
- **Embeddable deck module** — the slop deck controls ship as a module
  (web component / iframe embed) that other pages can drop in.
- **All auth through Twitch login.** Namazu Elements instances issue per-pod
  OIDC tokens; nothing else authenticates.

## Technical architecture

- **Namazu Elements port.** The slop feature becomes an ELM-based distribution
  that runs inside a copy of Namazu Elements. The ELM handles triggers, scene
  serving, queueing, IRC/eventsub connections.
- **OpenCode headless sidecar.** OpenCode v2 runs headless in Docker, annotated
  as a Namazu Conductor job, preconfigured with a slop working directory.
  Listens on localhost only.
- **One pod per stream.** The ELM brings up a dedicated pod per streamer; each
  pod serves exactly one stream.

## Pod specification

Each pod contains three containers:

1. **Main container** — connects IRC, eventsub, etc. when the streamer goes
   live; stays connected until the stream ends. Streams flap, so a down-event
   is only acted on after a **5-minute grace timeout**.
2. **OpenCode sidecar** — OpenCode v2, working directory seeded with the
   streamer's slops, bound to localhost only. It generates slops purely through
   the MCP tool surface (below), using the OIDC token Conductor injects.
3. **Security proxy sidecar** — lightweight proxy enforcing auth. Accepts an
   OIDC token issued by the Namazu Elements instance the pod is bound to;
   tokens from other instances (or pods) are rejected. Every call through the
   proxy — including the ones the OpenCode agent itself makes to reach the MCP
   surface — must present valid OIDC from the issuing Elements instance. The
   proxy accepts nothing else: no pod-internal traffic is trusted by
   position on localhost alone.

### Agent container isolation

The OpenCode sidecar consumes untrusted input (twitch chat) and writes code.
It is treated as hostile and runs with the least access a container can have:

- **Sanitary environment.** The agent container gets a completely clean
  environment: no Kubernetes service-account tokens or CA certs, no AWS/cloud
  keys, no cluster secrets, no Conductor internals, no database URLs. The only
  environment variables are the ones explicitly allow-listed: the per-stream
  OIDC token, the MCP endpoint, and OpenCode's own working-dir/model config.
- **No mounted credentials.** Service-account token projection is disabled for
  the pod's agent container (`automountServiceAccountToken: false`); nothing
  that would let it talk to the Kubernetes API is present. Cloud credentials
  never enter the pod at all — only the security proxy and main container (if
  anything) ever see them, and the agent can't reach those containers.
- **Network isolation.** The agent's only network paths are: the localhost MCP
  endpoint (or the security proxy) and OpenCode's localhost listener. No route
  to the cluster network, cloud metadata endpoints, or other pods. A
  metadata-service block on the pod's network policy kills the classic
  `169.254.169.254` credential-theft path.
- **Filesystem isolation.** Read-only root filesystem except the slop working
  directory; no shared volumes with the main or proxy containers beyond the
  explicitly designed handoff.
- **Principle:** the agent holds exactly one secret — its own short-lived
  OIDC token — which can only do the MCP operations listed above. Everything
  else in the world is invisible to it.

## ELM specification

- **Landing page** — Twitch login. Placeholder for now; a marketing landing
  page comes later.
- **Logged-in dashboard** — view and modify the slop registry, adjust settings,
  moderate, play slops on stream. A robust, detailed editor.
- **`/deck` page** — shows only:
  - the slop generation queue,
  - the slop registry,
  - the slop playback queue.

### Superusers

- SUPERUSER role gets special privileges on the main page: they can **switch to
  view (and act) as any other user** — full impersonation of another
  streamer's dashboard.
- Superusers get an **additional moderation feature in their slop dashboard**:
  elevated moderation tooling beyond the per-streamer controls (registry-wide
  review, suspend/remove slops across tenants).

## The agent and its MCP tools

- **OIDC injection.** Namazu Conductor injects an OIDC token into the agent pod
  as an environment/secret at job start. OpenCode never sees a long-lived
  credential; the token is the only thing the agent can present.
- **Bearer only.** Every MCP tool call carries that token as the bearer
  credential. The MCP server rejects calls with no token, a token from another
  Elements instance, or an expired token.
- **Token lifetime = stream lifetime.** The OIDC token is short-lived, but
  always covers at least the life of the stream: the **main container's
  watcher loop refreshes/rotates it while the stream is alive**, so the agent
  never holds an expired credential mid-stream. When the stream ends (after
  the 5-minute flap grace), rotation stops and the token dies on its own —
  the agent's access ends with the stream by construction, no revocation step
  to forget.
- **Scoped to one streamer.** The token is scoped to the user associated with
  the current stream — the agent is that streamer's own temporary agent. Its
  lifetime is the pod's lifetime (the stream), and its reach is that
  streamer's tenant.
- **The agent works exclusively against a set of MCP tools** to generate
  slops. It has no direct database or filesystem access to the platform.

| Tool | Operation |
| --- | --- |
| `slops.search` | Search all slops owned by the streamer |
| `slops.reference` | Pull slops owned by the streamer as references/style sources |
| `slops.create` | Create a slop for this streamer (submits it for moderation) |
| `slops.read` | Read a slop owned by this streamer |
| `slops.update` | Update a slop owned by this streamer |
| `assets.list` / `assets.read` | Access every asset available to the tenant |
| `sources.fetch` | Fetch the raw source of **any slop in the system** so the agent may examine it (read-only, cross-tenant by design) |
| `slops.submitModeration` | Submit a created slop for moderation |

- **Ownership rules.** Create/read/update/delete are limited to slops the
  token's streamer owns. The one deliberate cross-tenant hole is
  `sources.fetch`: examining any slop's source is allowed so an agent can
  learn from the wider library, but it cannot modify what it does not own.
- **Moderation is mandatory on create.** A new slop is not playable until it
  goes through moderation; `slops.create` submits it as part of the flow.

## Data architecture

- **Slop** — a first-class database object (Morphia). Metadata includes:
  - `creator` — the chat user who prompted the slop,
  - `streamer` — the streamer whose stream it belongs to (ownership assigns to
    the streamer whose chat created it; the creator is whoever typed the
    prompt, streamer included),
  - title, name/handle, timestamps, moderation state, trigger config, etc.
- **Slop source** — the slop's source code is stored as a linked large object.
- **Slop asset** — another first-class database object (Morphia) referenced by
  slops. Supported types today (matches the current bundler):
  - audio: `.mp3`, `.ogg`, `.wav`
  - video: `.mp4`, `.webm`
  - Assets are managed by Namazu's team via an **admin panel plugin** on the
    backend.

## Carried-forward behavior (from the monolith)

- Triggers: per-slop trigger lists (Twitch events + chat string criteria),
  registry allow-list, flood cap with visible throttled notice, first-ever
  chatter/follower tracking, immediate-vs-queued dispatch, `bypassCooldown`.
- Cooldowns: per-slop, in seconds, arm on trigger plays only, streamer
  can reset.
- `!name` command is server-owned; agents never propose `!`-patterns.
- Agent rules: interactivity opt-in only; slops run up to 60s via `ctx.done()`;
  `meta.triggers` is strict JSON (parser tolerates trailing commas); keywords
  spelled exactly as the viewer wrote them.
- Streamer cam: registry-global placement, normalized 0–1, edited in settings;
  injected from the Twitch token — never hardcoded. The streamer is always
  already in frame; slops never depict them as a character.
- Sound: host-owned AudioContext; the sandbox posts `slop-sound` commands
  (beep/noise/sample), gain capped at 0.5.

## Migration notes

- `plans/Slop.md` is the original design; this document supersedes it for the
  new repo.
- Existing slops in `twitch-three-js` migrate as rows: file → large object,
  metadata extracted into the slop records.
- Test servers never carry real credentials (`config/` excluded from copies).
