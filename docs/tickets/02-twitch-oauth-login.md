# Ticket 02 — Per-user Twitch OAuth login

## Context

The reference implementation has one channel-level authorization
(`/auth/twitch` → EventSub credentials). The product requires **all auth
through Twitch login** at the user level: every visitor logs in with Twitch,
and a logged-in streamer manages *their own* tenant.

## Scope

- Real Twitch OAuth login (implicit or authorization-code + PKCE) on the
  landing page. The placeholder button links to the existing flow until this
  lands.
- Session issuance after login (signed cookie or JWT). Sessions carry:
  Twitch user id + login, display name, profile image, and role
  (streamer / viewer / moderator / superuser — see ticket 08).
- Resolve the logged-in user's tenant: a streamer's session maps to their
  pod/registry; non-streamers get viewer-level access (track their creations,
  see decks read-only).
- Every management route (registry, settings, moderation, play) requires a
  valid session; `401` otherwise. The deck UI switches from operator-mode to
  logged-out mode cleanly.
- The channel-level EventSub authorization (bot credentials) remains a
  separate, admin-level flow — it must not be confused with user login.

## Acceptance

- Logging in with Twitch on `/` returns to a personalized dashboard.
- A logged-out visitor cannot mutate anything.
- Sessions expire and re-auth cleanly.

## Depends on

- Ticket 07 (Elements issues per-pod OIDC) for the deployed form; locally this
  ticket stands alone.
