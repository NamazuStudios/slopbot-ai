# Slop & SlopAsset data model (ticket 03)

First-class database objects, defined per the Namazu Elements manual
("Data Models", "Large Object API"). The Node reference implementation lives in
`lib/store.js`; the Java Morphia entities below are what the ELM ships
(ticket 07). Both mirror the same documents field-for-field.

## Elements conventions applied

- `id` — server-generated, opaque, string in API responses.
- `name` — unique system-readable reference (alphanumeric + `_`/`.`/`-`), the
  programmatic handle.
- `displayName` — human label; never a data decision.
- `metadata` — key-value extras; not indexed.
- `tags` — indexed; used for filtering (shared pool, tenant scoping, legacy).
- `timestamp` — 64-bit ms since epoch.
- **Large Objects** — file content stored in **MongoDB GridFS keyed by the
  object id**, with `path`, `mimeType`, `state` (`EMPTY`/`UPLOADED`),
  `originalFilename` recorded; `url` assembled on read (null in the reference
  deployment — no CDN).

## `Slop`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | ObjectId/hex | server-generated |
| `name` | string, unique | the file name, e.g. `savorysailor-tomato-tribunal.js` |
| `displayName` | string | the title |
| `timestamp` | long | created |
| `tags` | array | e.g. `["legacy"]` |
| `creator` | `{id, login, displayName}` | **the chat user who prompted the slop** |
| `streamer` | `{id, login}` | **the streamer whose stream it belongs to** — ownership assigns to the streamer whose chat created it; the creator is whoever typed the prompt (streamer included) |
| `moderation` | enum | `pending` / `approved` / `rejected` / `suspended` |
| `suspended` | bool | deck quick-suspend |
| `triggers` | array | the streamer's saved trigger list (Elements-shaped trigger docs) |
| `triggerKey` | string \| null | the `http` trigger's **secret** per-slop key (24 random bytes, base64url) — `POST /trigger` with the key as the whole `text/plain` body plays this slop. Written through on trigger save and rotation; retired when the last `http` trigger goes. Never exposed on open surfaces (snapshot, SSE registry, bundle) — only the manage-gated trigger routes return it |
| `cooldownSeconds`, `slopCommand` | int, bool | carried from #5 / the `!name` default |
| `playCount`, `lastPlayedAt` | int, long | statistics |
| `metadata` | object | `{short, author, summary, controls, moderationLevel}` |
| `source` | Large Object ref | **the slop's source code, linked as a large object** (`{id, mimeType, originalFilename, state}`) |

### Morphia entity (ELM)

```java
@Entity(useDatabase = "slopbot", value = "slops")
public class Slop {

    @Id
    private ObjectId id;

    @Indexed(options = @IndexOptions(unique = true))
    private String name;              // system-readable reference

    private String displayName;       // the title

    private Long timestamp;           // ms since epoch

    private List<String> tags;

    @Embedded
    private Participant creator;      // chat user who prompted

    @Embedded
    private Participant streamer;     // tenant owner

    private String moderation;        // PENDING | APPROVED | REJECTED | SUSPENDED

    private boolean suspended;

    @Embedded
    private List<Trigger> triggers;

    private String triggerKey;        // http trigger's secret key (never on open surfaces)

    private Integer cooldownSeconds;

    private boolean slopCommand;

    private Integer playCount;

    private Long lastPlayedAt;

    private Metadata metadata;        // short, author, summary, controls, moderationLevel

    @Embedded
    private LargeObjectRef source;    // { id, mimeType, originalFilename, state } → GridFS
}
```

`Participant` is `{ String id; String login; String displayName; }`;
`LargeObjectRef` is `{ ObjectId id; String mimeType; String originalFilename;
String state; }` — content bytes in GridFS keyed by `id`, exactly as the
manual's Large Object API describes.

## `SlopAsset`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | ObjectId/hex | server-generated |
| `name` | string, unique | `shared/boing` or `<slop-name>/boing` |
| `displayName` | string | the bare sample name slops reference |
| `timestamp` | long | created |
| `tags` | array | `["shared"]` for the common pool, `["slop", "<slop-name>"]` for per-slop assets |
| `kind` | enum | `audio` (`.mp3` `.ogg` `.wav`) or `video` (`.mp4` `.webm`) — the bundler's supported set |
| `mimeType` | string | |
| `metadata` | object | `{originalFilename}` |
| `source` | Large Object ref | the bytes, in GridFS |

Assets are **managed by Namazu's team via the admin panel plugin** (ticket 10)
— creation is effectively superuser-only, matching the manual's Large Object
access levels.

### Morphia entity (ELM)

```java
@Entity(useDatabase = "slopbot", value = "slopAssets")
public class SlopAsset {

    @Id
    private ObjectId id;

    @Indexed(options = @IndexOptions(unique = true))
    private String name;

    private String displayName;

    private Long timestamp;

    private List<String> tags;        // ["shared"] | ["slop", <slop-name>]

    private String kind;              // AUDIO | VIDEO

    private String mimeType;

    private Metadata metadata;

    @Embedded
    private LargeObjectRef source;
}
```

## Reference implementation behavior (`lib/store.js`)

- **MongoDB is required — no file mode.** The connection comes from the
  `MONGO_URL` env var (database defaults to `slopbot`). A failed connect
  refuses startup, exactly like missing credentials. In the Elements
  deployment this disappears entirely: the Datastore is injected by the
  platform and no connection string exists anywhere in product config.
- **Idempotent import at boot** (file → DB): file slops missing from the
  store get records (tagged `legacy`), plus per-slop assets and the shared
  sound pool — the one-time migration of the original library. From then on
  the store is the only source of truth; files are just the agent's handoff.
- **Registry loads from the store**; sources are served from it at bundle
  time (in-memory cache, refreshed on every registration).
- **Write-through:** register (new build/modify), triggers save, suspend,
  cooldown changes, approve/reject/delete, play statistics (`$inc`).
- `/api/slop` exposes `store.status()` for visibility.
- Run `node scripts/store-roundtrip.js` against any Mongo to verify the
  round-trip (import → load → source equality → write-through → delete).
