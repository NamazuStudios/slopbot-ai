# Ticket 12 — Migration: file-based slops → Morphia records

## Context

The reference implementation ships with the whole live library as files
(76+ slops, `.js` + `.txt` metadata pairs, shared sounds, downloaded assets).
Ticket 03 defines the DB objects; this ticket moves the data.

## Scope

- One-time importer: for each slop file pair, create a `Slop` record —
  metadata from the `.txt`, source into a large object, creator/streamer
  resolved (backfill: legacy slops where the creator is unknown get the
  streamer as creator, marked `legacy`).
- Import `slops/assets/` and `slops/shared/sounds/` into `SlopAsset` records
  (shared pool → tenant-visible).
- The importer is idempotent (re-run skips already-imported names).
- Cutover: bundler and registry read from the DB with a file fallback flag,
  so the reference implementation can run file-based until Elements deploys.

## Acceptance

- Importing the shipped library yields a registry identical in behavior:
  same names, triggers, cooldowns, playable bundles.
- Re-running the importer changes nothing.
