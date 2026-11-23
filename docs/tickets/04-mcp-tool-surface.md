# Ticket 04 — MCP tool surface for the agent

## Context

The agent pod's OpenCode instance works **exclusively against a set of MCP
tools** — no direct database or filesystem access to the platform.

## Security model

- Namazu Conductor **injects an OIDC token** into the agent pod at job start.
- Every MCP tool call carries that token as the **bearer** credential.
- The MCP server rejects: missing tokens, expired tokens, and tokens from any
  Elements instance other than the one the pod is bound to.
- The token is **scoped to the user associated with the current stream** — the
  agent is that streamer's own temporary agent. Lifetime: at least the stream's
  life; the main container's watcher loop **refreshes/rotates it while the
  stream is alive** (ticket 07). When the stream ends, rotation stops and the
  token dies on its own — no revocation step to forget.

## Tools

| Tool | Operation |
| --- | --- |
| `slops.search` | Search all slops owned by the streamer |
| `slops.reference` | Pull the streamer's slops as references/style sources |
| `slops.create` | Create a slop for this streamer — **submits it for moderation** |
| `slops.read` | Read a slop owned by this streamer |
| `slops.update` | Update a slop owned by this streamer |
| `assets.list` / `assets.read` | Access every asset available to the tenant |
| `sources.fetch` | Fetch the raw source of **any slop in the system** (read-only, cross-tenant by design — the agent learns from the wider library) |
| `slops.submitModeration` | Submit a created slop for moderation |

## Rules

- Create/read/update are limited to slops the token's streamer owns.
  `sources.fetch` is the one deliberate cross-tenant read; it cannot modify.
- Moderation is mandatory on create: a new slop is not playable until it
  passes moderation.
- A newly created slop carries `creator` (chat user who prompted) and
  `streamer` (tenant) per ticket 03.

## Acceptance

- With a valid token, the agent builds a slop end-to-end via tools only.
- Without a token (or with a foreign/expired one), every tool returns `401/403`.
- A token from another streamer's pod cannot read or write this tenant's slops.
