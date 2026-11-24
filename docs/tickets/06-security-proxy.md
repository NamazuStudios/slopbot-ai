# Ticket 06 — Security proxy sidecar

## Context — what the original project does today

In `twitch-three-js`, trust is positional: everything runs on one machine, the agent talks to the server and OpenCode over localhost, and the only credential is one shared password sent as `Basic opencode:<password>` (`authHeader()`). There is no per-caller identity, no expiry, no issuer — safe only because every process is the same operator's, on the same host.

In the pod, that's no longer true: three containers, a cluster outside, and one of them is hostile by construction (ticket 05). The proxy sidecar replaces positional trust with per-call identity.

## Spec

- **Lightweight proxy sidecar** in front of the pod's platform-facing surface: the MCP tool endpoint (ticket 04) and any platform callbacks.
- Accepts an **OIDC token issued by the Namazu Elements instance the pod is bound to**; tokens from other instances (or pods) are rejected.
- **Every call through the proxy requires valid OIDC — including the agent's own calls** to reach the MCP surface. The original's rule is inverted: localhost position grants *nothing*.
- Validates per call: signature, issuer (the bound Elements instance), audience (this pod), expiry. Rejects with `401` (missing/invalid) or `403` (valid token, wrong scope).
- Token rotation-aware: the main container's watcher loop refreshes the agent's token while the stream is alive (ticket 07) — the proxy accepts the new token immediately (issuer keys cached with short TTL, no restart, no pinned token).

## Pod trust topology

```
[agent sidecar] --OIDC bearer--> [security proxy] --validated--> [MCP server] --> platform/DB
[main container] --OIDC bearer--> [security proxy] (management, moderation verdicts)
[anything on localhost] --> 401 (position grants nothing)
[no token / foreign instance / expired] --> 401
```

- The agent has **no other network path** — no route to the cluster network, other pods, or metadata endpoints (ticket 05's network policy).
- The proxy holds no secrets beyond the Elements issuer's public keys (from the instance's OIDC discovery document — the same discovery URL the manual's Twitch OIDC setup uses for provider config).
- Fail closed: proxy down → agent cannot reach anything; proxy cannot "pass through" unauthenticated requests on any route.

## Acceptance

- Valid issuing-instance token → forwarded, with identity/scopes attached to the forwarded request.
- Foreign-instance token, expired token, or no token → 401; token without the pod's audience → 403.
- The agent cannot reach the platform except through the proxy (network policy verified from inside the agent container).
- Token rotation mid-stream: old token dies, new token accepted, zero downtime.
