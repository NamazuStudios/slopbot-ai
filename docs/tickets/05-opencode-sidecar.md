# Ticket 05 — OpenCode agent sidecar container (Conductor job)

## Context

OpenCode v2 runs headless in Docker, **annotated as a Namazu Conductor job**,
as the agent sidecar in each pod (ticket 07).

## Container spec

- Preconfigured with the streamer's slop working directory (seeded per pod).
- Listens on **localhost only**.
- Generates slops **purely through the MCP tool surface** (ticket 04) using the
  OIDC token Conductor injects.

## Isolation requirements (the agent is hostile by construction — it eats
twitch chat and writes code)

- **Completely sanitary environment.** No Kubernetes service-account tokens or
  CA certs, no AWS/cloud keys, no cluster secrets, no Conductor internals, no
  database URLs. The only environment variables are explicitly allow-listed:
  the per-stream OIDC token, the MCP endpoint, and OpenCode's own
  working-dir/model config.
- **No mounted credentials.** `automountServiceAccountToken: false`; nothing
  that can reach the Kubernetes API exists inside the container. Cloud
  credentials never enter the pod at all.
- **Network isolation.** Only paths: localhost MCP endpoint / security proxy
  and OpenCode's own listener. No route to the cluster network, other pods, or
  cloud metadata endpoints — network policy blocks `169.254.169.254`.
- **Filesystem isolation.** Read-only root filesystem except the slop working
  directory; no shared volumes with the main/proxy containers beyond the
  designed handoff.

**Principle:** the agent holds exactly one secret — its short-lived OIDC token
— which can only perform the MCP operations. Everything else is invisible.

## Acceptance

- Container image builds; Conductor schedules it as a job annotation.
- From inside the container: cluster API, metadata endpoint, and cloud creds
  are unreachable; the MCP endpoint works with the injected token.
- A leaked full-environment dump (`env`) shows only the allow-listed keys.
