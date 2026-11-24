# Ticket 05 — OpenCode agent sidecar container (Conductor job)

## Context — what the original project does today

In `twitch-three-js` (`lib/slop.js`, "attach" mode), the server:

1. Discovers a running OpenCode v2 service: `slop.json → opencode {mode:"connect", url, password}`, then **port-scans** for it (`ss -ltnp` on Linux, `netstat -ano` + `tasklist` on Windows) because the desktop app picks a new port every boot.
2. Probes candidates with `GET /api/session` + `Basic opencode:<password>`.
3. Creates a session: `POST /api/session?directory=<repo>` with `{title, agent:"build", model:{providerID,id}}`.
4. **Moves the session into the repo** (`POST /api/session/<id>/move`) because the service runs from its own cwd — the agent's relative paths and `.slop-builds/<id>/` writes must land where the server looks.
5. Dispatches the prompt (`POST /api/session/<id>/prompt`, 5 retries), opens the event stream, polls the session record for completion, 20-minute watchdog, one build at a time.

The sidecar container removes the fragile parts of this: **no port scanning, no session move, no desktop app** — OpenCode v2 runs headless in its own container, preconfigured, at a fixed address.

## Container spec

- **Image**: OpenCode v2, headless (`opencode serve`), annotated as a **Namazu Conductor job**.
- **Working directory**: the pod's seeded slop directory (`slops/AGENTS.md` contract baked in — the module contract, capability line, hard rules, narration style, and the bright-line "never depict the streamer" rule all still apply verbatim).
- **Binds localhost only** — fixed port (no discovery): the main container connects exactly as `agentFetch()` does today, minus the scan.
- **Session directory pre-seeded** — no `session/move` dance; `.slop-builds/<id>/` scratch dirs work as today.
- Generates slops **purely through the MCP tool surface** (ticket 04) using the OIDC token Conductor injects — the original's asset downloads via network fetch are replaced by `assets.read`.

## Isolation requirements

The agent is hostile by construction — it eats twitch chat and writes code:

- **Completely sanitary environment.** No Kubernetes service-account tokens or CA certs, no AWS/cloud keys, no cluster secrets, no Conductor internals, no database URLs. The only environment variables are explicitly allow-listed: the per-stream OIDC token, the MCP endpoint, and OpenCode's own working-dir/model config. (The original leaks nothing worse than a shared password — but it also never ran against a cluster.)
- **No mounted credentials.** `automountServiceAccountToken: false`; nothing that can reach the Kubernetes API exists inside the container. Cloud credentials never enter the pod at all.
- **Network isolation.** Only paths: localhost MCP endpoint / security proxy and OpenCode's own listener. No route to the cluster network, other pods, or cloud metadata endpoints — network policy blocks `169.254.169.254`.
- **Filesystem isolation.** Read-only root filesystem except the slop working directory; no shared volumes with the main/proxy containers beyond the designed handoff.

**Principle:** the agent holds exactly one secret — its short-lived OIDC token — which can only perform the MCP operations. Everything else is invisible.

## What carries over from the original, unchanged

- One build at a time; 20-minute watchdog; prompt dispatch retries; completion polling with a kick watchdog for never-started runs; restart/cancel from the deck; modify-mode seeding of the previous source; remark/narration capture (`CHAT SUMMARY:`).
- `MOCK_AGENT=1` mock agent mode for tests (no OpenCode at all).

## Acceptance

- Container image builds; Conductor schedules it as a job annotation.
- Main container attaches at the fixed address with the injected token — no discovery code runs.
- From inside the container: cluster API, metadata endpoint, and cloud creds are unreachable; the MCP endpoint works through the proxy.
- A leaked environment dump (`env`) shows only the allow-listed keys.
- A full build round-trips: prompt → tools → created slop → moderation → plays exactly like an original build.
