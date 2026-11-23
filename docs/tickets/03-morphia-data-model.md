# Ticket 03 — Morphia data model: `Slop` and `SlopAsset`

## Context

Today a slop is a pair of files (`.js` source + `.txt` metadata) on disk. In
the Namazu Elements deployment, **slops and assets are first-class database
objects defined in Morphia**.

## Scope

### `Slop`
- `creator` — the chat user who prompted the slop.
- `streamer` — the streamer whose stream it belongs to. **Ownership assigns to
  the streamer whose chat created it**; the creator is whoever typed the
  prompt (or the streamer themselves).
- Title, short name/handle, timestamps (created/played/moderated), moderation
  state (`pending`/`approved`/`rejected`/`suspended`), trigger config,
  cooldown settings, play statistics.
- `source` — the slop's source code, linked as a **large object** (not a
  document field).
- Migration path: a slop's on-disk `.js` becomes the large object; the `.txt`
  fields populate the metadata. (Ticket 12.)

### `SlopAsset`
- First-class Morphia object referenced by slops.
- Supported types (matching the current bundler): **audio** `.mp3` `.ogg`
  `.wav` and **video** `.mp4` `.webm`.
- Fields: name, kind, mime, bytes (or large-object link), owning tenant,
  referenced-by list.

## Acceptance

- A slop round-trips DB ↔ playback with identical behavior to the file-based
  reference implementation.
- Creator and streamer are both recorded and queryable.
- Assets resolve at bundle time exactly like the current file-based pool.
