# Ticket 06 — Security proxy sidecar

## Context

Each pod runs a **lightweight proxy sidecar** that enforces security for
everything crossing the pod boundary.

## Spec

- Accepts an **OIDC token issued by the Namazu Elements instance the pod is
  bound to**; tokens from other instances (or pods) are rejected.
- **Every call through the proxy requires valid OIDC — including the agent's
  own calls** to reach the MCP surface. Localhost position grants nothing.
- Validates: signature, issuer, audience (this pod), expiry. Rejects with 401.
- Fronts the platform-facing surface (MCP server, moderation callbacks) so no
  container in the pod talks to the cluster without passing through it.

## Acceptance

- Valid issuing-instance token → forwarded.
- Foreign-instance token, expired token, or no token → 401.
- The agent cannot reach the platform except through the proxy.
