'use strict';

// Round-trip verification for ticket 03 (run against any MongoDB):
//   MONGO_URL=mongodb://localhost:27017 node scripts/store-roundtrip.js
//
// Exercises: connect → idempotent import → DB-authoritative load → source
// equality (DB ↔ playback round-trip) → write-throughs (triggers, suspend,
// play stats) → delete. Exits non-zero on any failure.

const store = require('../lib/store');

const fail = (msg) => {
  console.error('ROUND-TRIP FAILED:', msg);
  process.exit(1);
};

(async () => {
  const entry = {
    name: `roundtrip-${Date.now().toString(36)}.js`,
    title: 'Round Trip Test',
    author: 'testviewer',
    short: 'roundtrip',
    suspended: false,
    triggers: [{ id: 't0', type: 'chat', mode: 'word', patterns: ['boo'], source: 'streamer', dispatch: 'queue', bypassCooldown: false, caseSensitive: false }],
    cooldownSeconds: 30,
    cooldownUntil: 0,
    slopCommand: true,
    creator: { id: '42', login: 'testviewer', displayName: 'TestViewer' },
  };
  const code = '// slops/roundtrip — sound.sample("boing"); ctx.done();\nconst x = 1;\n';

  await store.connect({ mongo: { url: process.env.MONGO_URL, database: process.env.MONGO_DATABASE || 'slopbot-roundtrip' } });
  if (!store.active()) fail(`store did not activate (${store.status().lastError ?? 'no MONGO_URL set'})`);
  console.log('connected:', store.status().database);

  // import (idempotent check runs twice)
  const readSource = (name) => (name === entry.name ? code : null);
  const first = await store.importFromFiles({ entries: [entry], readSource, assetsFor: () => [], sharedSounds: [], readSharedSound: () => null, streamer: 'savorysailor' });
  const second = await store.importFromFiles({ entries: [entry], readSource, assetsFor: () => [], sharedSounds: [], readSharedSound: () => null, streamer: 'savorysailor' });
  if (first.slops !== 1 || second.slops !== 0) fail(`import not idempotent: ${JSON.stringify([first, second])}`);
  console.log('import: 1 slop (re-run: 0) ✓');

  // load + entry fields
  const doc = await store.getSlop(entry.name);
  if (!doc) fail('slop not found after import');
  const fields = store.entryFields(doc);
  if (fields.title !== 'Round Trip Test' || fields.creator?.login !== 'testviewer') fail(`entry fields wrong: ${JSON.stringify(fields)}`);
  if (doc.streamer?.login !== 'savorysailor') fail(`streamer not recorded: ${JSON.stringify(doc.streamer)}`);
  console.log('load: creator + streamer recorded ✓');

  // source round-trip (DB ↔ playback)
  const bytes = await store.getAssetBytes(doc.source);
  if (bytes?.toString('utf8') !== code) fail('source round-trip mismatch');
  console.log('source round-trip: identical ✓');

  // write-throughs
  await store.updateSlop(entry.name, { suspended: true, triggers: [], cooldownSeconds: 5, slopCommand: false, pending: false });
  const after = await store.getSlop(entry.name);
  if (!after.suspended || after.triggers.length !== 0 || after.cooldownSeconds !== 5 || after.slopCommand !== false || after.moderation !== 'approved') {
    fail(`updateSlop wrong: ${JSON.stringify(after)}`);
  }
  await store.bumpPlay(entry.name);
  await store.bumpPlay(entry.name);
  const played = await store.getSlop(entry.name);
  if (played.playCount !== 2) fail(`playCount ${played.playCount}`);
  console.log('write-throughs: suspend/triggers/cooldown/moderation/playCount ✓');

  // delete
  await store.deleteSlop(entry.name);
  const gone = await store.getSlop(entry.name);
  if (gone) fail('delete did not remove the record');
  console.log('delete ✓');

  console.log('ROUND-TRIP OK');
  process.exit(0);
})().catch((e) => fail(e.message));
