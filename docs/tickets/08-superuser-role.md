# Ticket 08 — Superuser role

## Scope

- SUPERUSER gets special privileges on the main page:
  - **View as any user** — full impersonation: switch into any streamer's
    dashboard/registry/deck and act as them (audit-logged).
- Superusers get an **additional moderation feature in their slop dashboard**:
  elevated moderation tooling beyond per-streamer controls — registry-wide
  review, suspend/remove slops across tenants, moderation queue visibility
  across all pods.
- Role comes from the Twitch login mapping (or Elements-issued claim, ticket
  07), never from client-side state.

## Acceptance

- A superuser can list users, impersonate one, and return — actions land with
  the acting identity recorded.
- Non-superusers see none of it (routes 403).
- Cross-tenant moderation actions (suspend/remove) work from the superuser
  dashboard only.
