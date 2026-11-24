'use strict';

// Slop + SlopAsset first-class database objects (ticket 03), following the
// Namazu Elements manual:
//
//   - "Data Models": every object carries id (server-generated, opaque),
//     name (unique system-readable reference), displayName (human label),
//     metadata (key-value, not indexed), tags (indexed, for filtering) and
//     timestamp (64-bit ms since epoch).
//   - "Large Object API": file content is a first-class record whose bytes
//     live in MongoDB GridFS keyed by the object id, with path, mimeType,
//     state (EMPTY/UPLOADED) and originalFilename alongside.
//
// The Java Morphia entities for the ELM (ticket 07) mirror these documents
// field-for-field — see docs/slop-data-model.md. This module is the Node
// reference implementation of the same model. MongoDB is REQUIRED: without
// it the server refuses to start (no file fallback — the store is the only
// source of truth).

const SLOP_MIME = 'text/javascript';

let client = null;
let db = null;
let slops = null;
let assets = null;
let largeObjects = null; // GridFS bucket — content keyed by object id
let active = false;
let lastError = null;

const status = () => ({
  active,
  database: db?.databaseName ?? null,
  lastError: lastError ?? null,
});

const objectId = () => {
  const bytes = require('node:crypto').randomBytes(12);
  bytes[0] = Math.floor(Date.now() / 0x100000000); // ObjectId-ish shape
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
};

const hexId = (v) => (v ? String(v) : objectId());

// --- connection ---------------------------------------------------------------

// Mongo target: slop.json → "mongo": { "url", "database" } or env.
const target = (config) => ({
  url: process.env.MONGO_URL || config?.mongo?.url || null,
  database: process.env.MONGO_DATABASE || config?.mongo?.database || 'slopbot',
});

async function connect(config) {
  if (active) return true;
  const { url, database } = target(config);
  if (!url) throw new Error('no MongoDB configured — set MONGO_URL (or slop.json "mongo": {"url", "database"})');
  let mongodb;
  try {
    mongodb = require('mongodb');
  } catch {
    throw new Error('the mongodb driver is not installed (npm i mongodb)');
  }
  client = new mongodb.MongoClient(url, { serverSelectionTimeoutMS: 4000 });
  await client.connect();
  db = client.db(database);
  slops = db.collection('slops');
  assets = db.collection('slopAssets');
  largeObjects = new mongodb.GridFSBucket(db, { bucketName: 'largeObjects' });
  await slops.createIndex({ name: 1 }, { unique: true });
  await assets.createIndex({ name: 1 }, { unique: true });
  active = true;
  lastError = null;
  return true;
}

// --- large objects (Elements "Large Object API" shape) --------------------------

// Content lives in GridFS keyed by an object id; the ref recorded on the
// owning document carries the manual's metadata fields (path, mimeType,
// state, originalFilename). `url` is assembled on read in Elements — there
// is no CDN in the reference deployment, so it stays null.
async function putLargeObject(bucket, { path, mimeType, originalFilename, bytes }) {
  const id = objectId();
  const upload = { _id: id, filename: id, metadata: { path, mimeType, state: 'UPLOADED', originalFilename: originalFilename ?? null } };
  const stream = bucket.openUploadStreamWithId(id, id, upload);
  await new Promise((resolve, reject) => {
    stream.end(bytes, (err) => (err ? reject(err) : resolve()));
  });
  return { id, mimeType, originalFilename: originalFilename ?? null, state: 'UPLOADED' };
}

async function getLargeObject(ref) {
  if (!ref?.id) return null;
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = largeObjects.openDownloadStream(ref.id);
    stream.on('data', (c) => chunks.push(c));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// --- Slop -----------------------------------------------------------------------

// Files → documents (ticket 12's importer, folded here so boot is always
// idempotent): every file slop missing from the store gets a record. Legacy
// imports tag themselves and record the streamer as creator when unknown.
async function importFromFiles({ entries, readSource, assetsFor, sharedSounds, readSharedSound, streamer }) {
  if (!active) return { slops: 0, assets: 0 };
  let slopCount = 0;
  let assetCount = 0;
  for (const entry of entries) {
    const existing = await slops.findOne({ name: entry.name });
    if (existing) continue;
    let code;
    try {
      code = readSource(entry.name);
    } catch {
      continue;
    }
    await putSlop(entry, code, { tags: ['legacy'], streamer });
    slopCount += 1;
    // The slop's own asset directory → SlopAsset records.
    for (const a of assetsFor(entry.name)) {
      const name = `${entry.name}/${a.name}`;
      if (await assets.findOne({ name })) continue;
      const source = await putLargeObject(largeObjects, { path: name, mimeType: a.mime, originalFilename: a.file, bytes: a.bytes });
      await assets.insertOne(toAssetDoc({ name, displayName: a.name, kind: a.kind, mime: a.mime, tags: ['slop', entry.name], source }));
      assetCount += 1;
    }
  }
  // The shared sound library → SlopAsset records tagged 'shared' (the admin
  // panel plugin, ticket 10, manages these going forward).
  for (const [name, file] of sharedSounds) {
    if (await assets.findOne({ name: `shared/${name}` })) continue;
    let bytes;
    try {
      bytes = readSharedSound(file);
    } catch {
      continue;
    }
    const source = await putLargeObject(largeObjects, { path: `shared/${name}`, mimeType: 'audio/mpeg', originalFilename: file, bytes });
    await assets.insertOne(toAssetDoc({ name: `shared/${name}`, displayName: name, kind: 'audio', mime: 'audio/mpeg', tags: ['shared'], source }));
    assetCount += 1;
  }
  return { slops: slopCount, assets: assetCount };
}

const toAssetDoc = ({ name, displayName, kind, mime, tags, source }) => ({
  name,
  displayName,
  tags,
  kind,
  mimeType: mime,
  timestamp: Date.now(),
  metadata: { originalFilename: source.originalFilename ?? null },
  source,
});

// A store document → the engine's registry entry fields (merged over the
// file-derived entry by the caller). The DB is authoritative for the
// streamer-saved state: title/author, triggers, cooldown, !name command,
// suspension, moderation.
const entryFields = (doc) => ({
  name: doc.name,
  title: doc.displayName,
  author: doc.metadata?.author ?? doc.creator?.login ?? doc.streamer?.login ?? 'anonymous',
  summary: doc.metadata?.summary ?? null,
  controls: doc.metadata?.controls ?? null,
  moderationLevel: doc.metadata?.moderationLevel ?? null,
  short: doc.metadata?.short ?? doc.name,
  suspended: Boolean(doc.suspended),
  triggers: Array.isArray(doc.triggers) ? doc.triggers : [],
  cooldownSeconds: doc.cooldownSeconds ?? 60,
  slopCommand: doc.slopCommand !== false,
  pending: doc.moderation === 'pending',
  creator: doc.creator ?? null,
  streamer: doc.streamer ?? null,
  createdAt: doc.timestamp ?? null,
  playCount: doc.playCount ?? 0,
  id: hexId(doc._id),
});

async function loadRegistry() {
  if (!active) return [];
  return slops.find().toArray();
}

async function getSlop(name) {
  if (!active) return null;
  return slops.findOne({ name });
}

// Upsert by name — new builds and modified builds both land here. The
// creator is the chat user who prompted (the author when unknown); the
// streamer is the tenant owner (whose chat created it — ticket 03's
// ownership rule).
async function putSlop(entry, code, { tags = [], streamer } = {}) {
  if (!active) return false;
  const now = Date.now();
  const previous = await slops.findOne({ name: entry.name });
  const sourceRef = await putLargeObject(largeObjects, {
    path: entry.name,
    mimeType: SLOP_MIME,
    originalFilename: entry.name,
    bytes: Buffer.from(code, 'utf8'),
  });
  const doc = {
    name: entry.name,
    displayName: entry.title ?? entry.name,
    timestamp: previous?.timestamp ?? entry.createdAt ?? now,
    tags: [...new Set([...(previous?.tags ?? []), ...tags])],
    creator: entry.creator ?? previous?.creator ?? (entry.author ? { id: null, login: entry.author, displayName: entry.author } : null),
    streamer: previous?.streamer ?? { id: null, login: streamer ?? null },
    moderation: entry.pending ? 'pending' : 'approved',
    suspended: Boolean(entry.suspended),
    triggers: entry.triggers ?? [],
    cooldownSeconds: entry.cooldownSeconds ?? 60,
    slopCommand: entry.slopCommand !== false,
    playCount: previous?.playCount ?? 0,
    lastPlayedAt: previous?.lastPlayedAt ?? null,
    metadata: {
      short: entry.short ?? null,
      author: entry.author ?? null,
      summary: entry.summary ?? null,
      controls: entry.controls ?? null,
      moderationLevel: entry.moderationLevel ?? null,
    },
    source: sourceRef,
  };
  await slops.replaceOne({ name: entry.name }, doc, { upsert: true });
  return true;
}

// Partial write-through for the streamer's saved state (triggers pane,
// suspend chips, cooldown resets). Never touches the source ref.
async function updateSlop(name, patch) {
  if (!active) return false;
  const set = {};
  if ('triggers' in patch) set.triggers = patch.triggers;
  if ('cooldownSeconds' in patch) set.cooldownSeconds = patch.cooldownSeconds;
  if ('slopCommand' in patch) set.slopCommand = patch.slopCommand;
  if ('suspended' in patch) set.suspended = Boolean(patch.suspended);
  if ('pending' in patch) set.moderation = patch.pending ? 'pending' : 'approved';
  if ('title' in patch) set.displayName = patch.title;
  if (Object.keys(set).length === 0) return false;
  await slops.updateOne({ name }, { $set: set });
  return true;
}

async function bumpPlay(name) {
  if (!active) return false;
  await slops.updateOne({ name }, { $inc: { playCount: 1 }, $set: { lastPlayedAt: Date.now() } });
  return true;
}

async function deleteSlop(name) {
  if (!active) return false;
  const doc = await slops.findOne({ name });
  if (!doc) return false;
  if (doc.source?.id) await rmLargeObject(doc.source.id);
  await slops.deleteOne({ name });
  // Its own assets go with it (shared pool assets are untouched).
  const own = await assets.find({ tags: name }).toArray();
  for (const a of own) {
    if (a.source?.id) await rmLargeObject(a.source.id);
    await assets.deleteOne({ name: a.name });
  }
  return true;
}

async function rmLargeObject(id) {
  try {
    await largeObjects.delete(id);
  } catch {
    // already gone
  }
}

// --- SlopAsset reads -------------------------------------------------------------

async function listAssets(tag) {
  if (!active) return [];
  const q = tag ? { tags: tag } : {};
  return assets.find(q).toArray();
}

async function getAssetBytes(ref) {
  return getLargeObject(ref);
}

module.exports = {
  connect,
  status,
  active: () => active,
  importFromFiles,
  loadRegistry,
  getSlop,
  putSlop,
  updateSlop,
  bumpPlay,
  deleteSlop,
  listAssets,
  getAssetBytes,
  entryFields,
};
