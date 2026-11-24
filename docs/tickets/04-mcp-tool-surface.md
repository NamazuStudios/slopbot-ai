# Ticket 04 — MCP tool surface for the agent

## Context — what the original project does today

In `twitch-three-js`, the build agent (OpenCode) works through the **filesystem**: it reads `slops/AGENTS.md` (the module contract), reads any existing slop file for reference, downloads assets into `.slop-builds/<id>/assets/`, writes `slop.js` into its work dir, and the server's `settleGeneration()` moves the finished file into `slops/`, runs `inspectSlopCode()` (the bouncer), parses `metaOf()` (title/author/triggers/controls), registers it, and holds it for the pending-approval flow (`approvePending`/`rejectPending`).

In the pod, the agent **has no filesystem access to the platform** (ticket 05's isolation). Every one of those file interactions becomes an MCP tool call.

## Security model

- Namazu Conductor **injects an OIDC token** into the agent pod at job start.
- Every MCP tool call carries that token as the **bearer** credential (replacing the original's single shared `Basic opencode:<password>` header, which was only safe because everything ran on one localhost).
- The MCP server rejects: missing tokens, expired tokens, and tokens from any Elements instance other than the one the pod is bound to.
- The token is **scoped to the user associated with the current stream** — the agent is that streamer's own temporary agent. Lifetime: at least the stream's life; the main container's watcher loop **refreshes/rotates it while the stream is alive** (ticket 07). When the stream ends, rotation stops and the token dies on its own.

## Tools (each mapped to the original behavior it replaces)

| Tool | Replaces (original) | Spec |
| --- | --- | --- |
| `slops.search` | scanning `slops/*.js`, the `!slop` resolver's `matchSlopNames` | Query by name/displayName/creator/tags → summary list (no source). Tenant-scoped. |
| `slops.reference` | the agent reading any file under `slops/` | Pull full metadata (meta: title, controls, triggers, cooldown) + source of a **tenant-owned** slop to use as a style/structure reference |
| `slops.read` | re-reading its own work before an edit (modify mode copies the old file into the work dir) | Read one owned slop: metadata + source |
| `slops.create` | writing `slop.js` into `.slop-builds/<id>/` + `settleGeneration()` | Create for this streamer. **Server-side the bouncer runs exactly as `inspectSlopCode()` does today** (size cap 250 KB, capability line, hard rules), then `metaOf()` extracts title/author/triggers/controls. Creator = the chat user who prompted (passed in the call), streamer = the token's tenant. Lands `moderation: pending`. Returns the assigned name (original naming rules: `author-slug[.js]`, collision counters). |
| `slops.update` | modify-mode builds overwriting `slops/<name>` | Update an **owned** slop's source and/or metadata — same bouncer + meta pipeline as create, versioned (previous source kept in the large-object history) |
| `assets.list` / `assets.read` | reading `slops/assets/<name>/` and `sharedSounds()` (the shared pool) | `assets.list` → every asset available to the tenant (shared pool tagged `shared`, per-slop tagged to the slop), with kind (audio `.mp3/.ogg/.wav`, video `.mp4/.webm`), mime, size. `assets.read` → the bytes (base64) — the agent inlines/references them per the AGENTS.md contract. |
| `sources.fetch` | the agent reading any file in `slops/` | Raw source of **any slop in the system**, cross-tenant by design (read-only) — the agent learns from the wider library. Cannot modify what it does not own. |
| `slops.submitModeration` | the pending-approval flow (`approvePending`/`rejectPending` on the deck) | Submit a created/updated slop for moderation — not playable until approved. The deck's verdicts hit the same record. |

## Rules

- Create/read/update are limited to slops the token's streamer owns; `sources.fetch` is the one deliberate cross-tenant read.
- Moderation is mandatory on create — no direct-to-approved path.
- Trigger proposals ride the existing rules: `meta.triggers` strict JSON (parser tolerates trailing commas), validated by `normalizeTrigger` server-side, gated by the registry allow-list; the agent never proposes `!`-patterns (the server owns the `!<short>` default).
- The bouncer's rules are server-authoritative — the agent cannot bypass `inspectSlopCode` by any tool combination.

## Build lifecycle (unchanged semantics, new transport)

The main container keeps the original lifecycle: one build at a time (`generation` slot), 20-minute watchdog, restart with the same model, cancel, prompt retries, completion polling. Only the file I/O swaps to tools.

## Acceptance

- With a valid token, the agent builds a slop end-to-end via tools only — zero filesystem access to the platform.
- Without a token (or with a foreign/expired one), every tool returns `401/403`.
- A token from another streamer's pod cannot read or write this tenant's slops (except `sources.fetch` reads).
- A `slops.create` result plays identically after approval: same bundle shape (code + inlined assets + shared sounds + `ctx.streamer` cam) as the original bundler produces.
