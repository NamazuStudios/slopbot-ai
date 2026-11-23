'use strict';

// Passphrase-encrypted app credentials.
//
// The real credentials live in config/twitch.json (gitignored). To check
// them into the repo without shipping plaintext, `npm run secrets:encrypt`
// wraps them into config/twitch.json.aes — AES-256-GCM under a key derived
// from a passphrase (scrypt). Only the .aes blob is committed; the app
// prompts for the passphrase at startup (or reads $TWITCH_PASSPHRASE), so
// the plaintext never has to exist on a fresh clone.
//
// File format: "TJS1" magic | 16-byte scrypt salt | 12-byte GCM IV |
// ciphertext | 16-byte GCM auth tag. The tag makes a wrong passphrase fail
// cleanly instead of producing garbage.
//
// CLI: node lib/secrets.js encrypt | decrypt | view

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const PLAIN_FILE = path.join(CONFIG_DIR, 'twitch.json');
const ENC_FILE = path.join(CONFIG_DIR, 'twitch.json.aes');
const MAGIC = Buffer.from('TJS1');
const KEY_LEN = 32; // aes-256
// 128·N·r = 32 MiB of scrypt memory — above Node's 32 MiB default cap, so raise maxmem.
const SCRYPT_OPTS = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

const deriveKey = (salt, passphrase) => crypto.scryptSync(passphrase, salt, KEY_LEN, SCRYPT_OPTS);

const encryptBuffer = (jsonString, passphrase) => {
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveKey(salt, passphrase), iv);
  const ciphertext = Buffer.concat([cipher.update(jsonString, 'utf8'), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, ciphertext, cipher.getAuthTag()]);
};

// Returns the decrypted string, or null on any failure (bad format, wrong
// passphrase — the GCM tag check covers both).
const decryptBuffer = (buffer, passphrase) => {
  try {
    if (buffer.length < MAGIC.length + 16 + 12 + 16 || !buffer.subarray(0, MAGIC.length).equals(MAGIC)) {
      return null;
    }
    const salt = buffer.subarray(MAGIC.length, MAGIC.length + 16);
    const iv = buffer.subarray(MAGIC.length + 16, MAGIC.length + 28);
    const tag = buffer.subarray(buffer.length - 16);
    const ciphertext = buffer.subarray(MAGIC.length + 28, buffer.length - 16);
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(salt, passphrase), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    return null;
  }
};

const decryptFile = (passphrase) => {
  const data = decryptBuffer(fs.readFileSync(ENC_FILE), passphrase);
  try {
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

// --- prompts -----------------------------------------------------------------

// Muted-input prompt, raw-mode style: the prompt is written once and stays
// visible (readline's line refresh would erase it — that's why this doesn't
// use readline), and typed characters are never echoed. Resolves null when
// there's no terminal or the user hits Ctrl+D.
const askHidden = (prompt) =>
  new Promise((resolve) => {
    if (!process.stdin.isTTY) {
      resolve(null);
      return;
    }
    process.stdout.write(prompt);
    const chars = [];
    const wasRaw = process.stdin.isRaw;
    process.stdin.setRawMode(true);
    process.stdin.resume();
    const onData = (chunk) => {
      const input = chunk.toString('utf8');
      if (input === '\r' || input === '\n') {
        process.stdin.setRawMode(wasRaw);
        process.stdin.removeListener('data', onData);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(chars.join(''));
      } else if (input === '\u0003') {
        // Ctrl+C — restore the terminal before dying
        process.stdin.setRawMode(wasRaw);
        process.stdout.write('\n');
        process.exit(1);
      } else if (input === '\u0004') {
        // Ctrl+D — give up on this prompt
        process.stdin.setRawMode(wasRaw);
        process.stdin.removeListener('data', onData);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(null);
      } else if (input === '\u007f' || input === '\b') {
        chars.pop(); // backspace — silently un-type
      } else if (input >= ' ') {
        chars.push(input);
      }
    };
    process.stdin.on('data', onData);
  });

const passphraseFor = async (purpose) =>
  process.env.TWITCH_PASSPHRASE ?? (await askHidden(`${purpose} passphrase: `));

// --- runtime loading ----------------------------------------------------------

let cache = null; // decrypted credentials, memory-only

// Must run before the server starts listening; the rest of the app then
// reads the plaintext-shaped object through get() with no prompting.
const ensureLoaded = async () => {
  if (cache) return cache;

  if (fs.existsSync(PLAIN_FILE)) {
    cache = readJson(PLAIN_FILE) ?? {};
    return cache;
  }

  if (!fs.existsSync(ENC_FILE)) {
    cache = {}; // nothing configured yet — /auth/twitch shows setup help
    return cache;
  }

  if (process.env.TWITCH_PASSPHRASE) {
    cache = decryptFile(process.env.TWITCH_PASSPHRASE);
    if (!cache) {
      throw new Error('config/twitch.json.aes could not be decrypted with $TWITCH_PASSPHRASE');
    }
    return cache;
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      'config/twitch.json.aes needs its passphrase, but there is no terminal — set $TWITCH_PASSPHRASE',
    );
  }

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const passphrase = await askHidden(`Passphrase for config/twitch.json.aes (${attempt}/3): `);
    cache = passphrase ? decryptFile(passphrase) : null;
    if (cache) {
      console.log('[secrets] credentials decrypted');
      return cache;
    }
    console.error(`[secrets] wrong passphrase (attempt ${attempt}/3)`);
  }
  throw new Error('could not decrypt config/twitch.json.aes after 3 attempts');
};

const get = () => cache ?? {};

const readJson = (file) => {
  try {
    let text = fs.readFileSync(file, 'utf8');
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // BOM tolerance
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// --- CLI -----------------------------------------------------------------------

const usage = () => `usage: node lib/secrets.js <encrypt|decrypt|view>  (or $TWITCH_PASSPHRASE to skip prompts)

  encrypt  wrap config/twitch.json into config/twitch.json.aes (committed; plaintext stays, delete it if you like)
  decrypt  turn config/twitch.json.aes back into config/twitch.json (for editing — re-encrypt afterwards)
  view     print the decrypted credentials without writing anything`;

const promptTwice = async () => {
  for (;;) {
    const first = await askHidden('New passphrase: ');
    if (first === null) throw new Error('cancelled');
    if (!first) {
      console.log('[secrets] a passphrase is required — it cannot be empty');
      continue;
    }
    const second = await askHidden('Confirm passphrase: ');
    if (second === null) throw new Error('cancelled');
    if (first === second) return first;
    console.log('[secrets] passphrases do not match — try again');
  }
};

const main = async ([command]) => {
  if (command === 'encrypt') {
    const creds = readJson(PLAIN_FILE);
    if (!creds) {
      throw new Error('no config/twitch.json to encrypt — create it first (see /auth/twitch for help)');
    }
    if (!creds.clientId || !creds.clientSecret) {
      throw new Error('config/twitch.json needs both "clientId" and "clientSecret"');
    }
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const passphrase = process.env.TWITCH_PASSPHRASE ?? (await promptTwice());
    fs.writeFileSync(ENC_FILE, encryptBuffer(JSON.stringify(creds, null, 2), passphrase), { mode: 0o600 });
    console.log(`[secrets] encrypted → ${path.relative(process.cwd(), ENC_FILE)}`);
    console.log('[secrets] config/twitch.json still exists (and stays gitignored) — delete it for passphrase-only access');
  } else if (command === 'decrypt' || command === 'view') {
    const creds = decryptFile(await passphraseFor('Passphrase for config/twitch.json.aes'));
    if (!creds) throw new Error('decryption failed — wrong passphrase?');
    if (command === 'view') {
      console.log(JSON.stringify(creds, null, 2));
    } else {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(PLAIN_FILE, `${JSON.stringify(creds, null, 2)}\n`, { mode: 0o600 });
      console.log(`[secrets] decrypted → ${path.relative(process.cwd(), PLAIN_FILE)}`);
    }
  } else {
    console.error(usage());
    process.exitCode = 1;
  }
};

if (require.main === module) {
  main(process.argv.slice(2)).catch((err) => {
    console.error(`[secrets] ${err.message}`);
    process.exitCode = 1;
  });
}

module.exports = { ensureLoaded, get, encryptBuffer, decryptBuffer };
