# Ticket 02 — Per-user Twitch OAuth login

**Status: implemented** (single-tenant form). The Namazu Elements deployment
form (Elements-issued sessions, per-pod OIDC) is ticket 07's cutover.

## Reference

Implemented following the Namazu Elements manual
([NamazuStudios/elements-manual](https://github.com/NamazuStudios/elements-manual)):

- **"Setting Up Twitch OIDC Login (Backend)"** — the browser-redirect flow:
  deterministic callback URL (must match the Twitch app registration
  byte-for-byte), scopes MUST include `openid` (Twitch returns no id_token
  without it) plus `user:read:email`, and **Client-Secret-POST** for the token
  exchange (`tokenEndpointAuthMethod: Client Secret Post` — never Basic).
- **"User Authentication in Elements" / "Sessions"** — identity verified
  authoritatively server-side; sessions are bearer credentials presented on
  every call. Here the session rides an HttpOnly, SameSite=Lax cookie
  (HMAC-signed payload: Twitch id, login, display name, image, role, expiry —
  7 days); Elements' own session secret replaces it at cutover.
- Provider name becomes the callback path, as in Elements'
  `/oidc/twitch/callback` — here `/auth/login` → `/auth/callback`.

## What was built

- `lib/auth.js` — OAuth flow, session issue/verify, role resolution, the
  `requireManager` gate.
- Routes: `/auth/login`, `/auth/callback` (state-cookie CSRF check),
  `/auth/logout`, `GET /api/auth/me`.
- Roles: `superuser` (configured `superusers` list in `slop.json`, now a
  deck-editable config key), `streamer` (login matching the configured
  channel), `viewer`. Fresh install with no channel = local dev mode (any
  login manages the tenant); fails closed the moment a channel is set.
- Management gate: every deck/operator route (config, triggers, build, queue,
  moderation, pause/resume, rewards, delete, synthetic dispatch, stinger POST)
  requires streamer/superuser — `401` anonymous, `403` viewer. Viewer/OBS
  endpoints stay open: snapshot, events (SSE), bundles, heartbeat, end
  reports, cameo plays.
- Deck UI: auth bar (who am I + login/logout), and any 401 response flips it
  back to logged-out mode.
- Landing page: the login button now drives the real flow.

## Remaining for the Elements deployment

- Session issuance moves to Elements (its session secret, `Authorization:
  bearer` header form per the manual's Sessions page).
- Impersonation/`superuser` privileges — ticket 08.
