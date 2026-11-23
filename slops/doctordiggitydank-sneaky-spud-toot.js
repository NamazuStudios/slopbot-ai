// Sneaky Spud Toot — a cartoon potato with legs runs along the bottom edge,
// rips a glorious green fart cloud at mid-screen, and giggles away off-stage.
// Transparent glass overlay: clearRect every frame, stream shows through.

export const meta = {
  title: 'Sneaky Spud Toot',
  author: 'doctordiggitydank',
  prompt: 'When a chatter types for the first time, a cartoon potato with legs should come running into the sce',
  createdAt: '2026-11-21T00:00:00.000Z',
  moderationLevel: 'anything',
  controls: `A leggy cartoon potato sprints across the bottom edge, farts a green cloud mid-screen, and giggles away on each chatter's first message.
!spud - sends another sneaky potato running onto the screen
!beans - supercharges the next potato fart into a mega green cloud
!giggle - makes every potato on screen crack up and sprint faster
!fan - blasts a cartoon gust to swirl all floating fart clouds`,
};

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutCubic = (k) => {
  const x = clamp(k, 0, 1);
  return 1 - Math.pow(1 - x, 3);
};
const easeOutBack = (k) => {
  const x = clamp(k, 0, 1);
  return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
};

// Palette presets for different spud varieties (read well over navy & pink)
const SPUD_STYLES = [
  { name: 'russet', hi: '#e8c088', mid: '#c48f52', lo: '#8c5a2b', spot: '#6b3e19', shoe: '#e63946', hat: 'sprout' },
  { name: 'yukon', hi: '#fff0a8', mid: '#e2bc58', lo: '#a87d28', spot: '#7d5717', shoe: '#2ec4b6', hat: 'twin' },
  { name: 'redskin', hi: '#f2a28c', mid: '#c95e4c', lo: '#8a3228', spot: '#611e18', shoe: '#ffbe0b', hat: 'bandana' },
  { name: 'purple', hi: '#c9a6e8', mid: '#8e5fb8', lo: '#59347d', spot: '#3a1d57', shoe: '#ff5d8f', hat: 'sprout' },
  { name: 'sweet', hi: '#ffbe7d', mid: '#e07a38', lo: '#9e4716', spot: '#6e2c09', shoe: '#3a86ff', hat: 'leaf' },
];

const FART_WORDS = ['PFFFT!', 'TOOT!', 'PRRRT!', 'POOT!', 'BRAAAP!'];
const MEGA_WORDS = ['KA-PFFFT!', 'MEGA TOOT!', 'BIOHAZARD!', 'BEAN BLAST!'];
const GIGGLE_WORDS = ['hee hee!', 'hehe!', 'teehee!', 'heh heh!', 'hihihi!'];

// Runtime state
let W = 1280;
let H = 720;
let U = 1;
let RND = Math.random;

let seenUsers = new Set();
let potatoes = [];
let clouds = [];
let dust = [];
let bubbles = [];
let popups = [];
let windGusts = [];
let beanCharges = 0;
let nextDir = 1; // 1 = left-to-right, -1 = right-to-left
let spudCounter = 0;

// Beat scheduler for standalone 60-second arc
let beatDone = [false, false, false, false, false];
let lastFartSfxAt = -10;
let lastGiggleSfxAt = -10;
let lastWhooshSfxAt = -10;
let lastBoingSfxAt = -10;

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function updateMetrics(ctx) {
  W = ctx.width || 1280;
  H = ctx.height || 720;
  U = clamp(Math.min(W, H) / 720, 0.52, 1.85);
}

// ---------------------------------------------------------------- sound helpers
// Literal sound.sample('...') calls ensure the host bundles the shared clips.

function playFartSound(ctx, t, mega) {
  if (t - lastFartSfxAt < 0.14) return;
  lastFartSfxAt = t;
  if (mega) {
    ctx.sound.sample('fart-big');
    ctx.sound.beep(78, 220);
  } else {
    ctx.sound.sample('fart');
  }
}

function playSoftGiggleSound(ctx, t, pitchShift = 0) {
  // Play the shared giggle clip (throttled so overlapping spuds stay gentle)
  // and sprinkle tiny delicate high-register chirps for soft giggling texture.
  if (t - lastGiggleSfxAt >= 0.45) {
    lastGiggleSfxAt = t;
    ctx.sound.sample('giggle');
  } else if (t - lastGiggleSfxAt >= 0.16) {
    ctx.sound.beep(660 + pitchShift * 90, 42);
  }
}

function playBoingSound(ctx, t) {
  if (t - lastBoingSfxAt < 0.18) return;
  lastBoingSfxAt = t;
  ctx.sound.sample('boing');
}

function playWhooshSound(ctx, t) {
  if (t - lastWhooshSfxAt < 0.25) return;
  lastWhooshSfxAt = t;
  ctx.sound.sample('whoosh');
}

// ---------------------------------------------------------------- spawners

function spawnDust(x, y, vx, vy, size = 10) {
  dust.push({
    x,
    y,
    vx,
    vy,
    r: size * U * (0.7 + RND() * 0.6),
    life: 0,
    maxLife: 0.35 + RND() * 0.28,
  });
}

function spawnPopup(text, x, y, vx, vy, color, stroke, size = 24, maxLife = 1.25) {
  popups.push({
    text,
    x,
    y,
    vx,
    vy,
    color,
    stroke,
    size: size * U,
    life: 0,
    maxLife,
    rot: (RND() - 0.5) * 0.26,
  });
}

function spawnFartCloud(x, y, dir, mega) {
  // dir is the potato's facing direction; fart shoots behind it (-dir)
  const backDir = -dir;
  const count = mega ? 20 : 11;
  const greens = ['#8bff3b', '#5fe02c', '#b4ff66', '#3db821', '#74e843'];

  const cluster = {
    x: x + backDir * 24 * U,
    y: y - 16 * U,
    vx: backDir * (mega ? 95 : 65) * U,
    vy: -(mega ? 46 : 36) * U,
    age: 0,
    maxLife: mega ? 10.5 : 7.8,
    mega,
    swayPhase: RND() * TAU,
    puffs: [],
    stinkLines: [],
    flies: [],
  };

  for (let i = 0; i < count; i++) {
    const angle = RND() * TAU;
    const spread = (mega ? 54 : 30) * U * Math.pow(RND(), 0.65);
    const ox = Math.cos(angle) * spread * 1.15 + backDir * RND() * (mega ? 38 : 22) * U;
    const oy = Math.sin(angle) * spread * 0.85;
    cluster.puffs.push({
      ox,
      oy,
      vx: backDir * (20 + RND() * (mega ? 80 : 48)) * U + (RND() - 0.5) * 28 * U,
      vy: -(10 + RND() * (mega ? 44 : 26)) * U,
      r0: (mega ? 18 : 13) * U * (0.75 + RND() * 0.85),
      grow: (mega ? 34 : 22) * U * (0.7 + RND() * 0.8),
      color: greens[Math.floor(RND() * greens.length)],
      wobblePhase: RND() * TAU,
      wobbleFreq: 1.8 + RND() * 1.8,
    });
  }

  const lineCount = mega ? 6 : 3;
  for (let i = 0; i < lineCount; i++) {
    cluster.stinkLines.push({
      ox: (i - (lineCount - 1) / 2) * (mega ? 26 : 20) * U + (RND() - 0.5) * 10 * U,
      oy: -(mega ? 26 : 16) * U - RND() * 14 * U,
      h: (mega ? 56 : 38) * U * (0.8 + RND() * 0.4),
      phase: RND() * TAU,
    });
  }

  const flyCount = mega ? 4 : 2;
  for (let i = 0; i < flyCount; i++) {
    cluster.flies.push({
      orbitX: (28 + RND() * (mega ? 56 : 30)) * U,
      orbitY: (18 + RND() * (mega ? 40 : 22)) * U,
      speed: (2.6 + RND() * 2.2) * (RND() < 0.5 ? 1 : -1),
      phase: RND() * TAU,
    });
  }

  clouds.push(cluster);

  // Burst of tiny toxic green bubbles
  const bCount = mega ? 18 : 9;
  for (let i = 0; i < bCount; i++) {
    bubbles.push({
      x: cluster.x + (RND() - 0.5) * 28 * U,
      y: cluster.y + (RND() - 0.5) * 20 * U,
      vx: backDir * (45 + RND() * (mega ? 140 : 90)) * U + (RND() - 0.5) * 40 * U,
      vy: -(25 + RND() * (mega ? 95 : 60)) * U,
      r: (4 + RND() * (mega ? 9 : 6)) * U,
      life: 0,
      maxLife: 1.4 + RND() * 1.8,
      color: greens[Math.floor(RND() * greens.length)],
    });
  }

  // Comic onomatopoeia callout
  const words = mega ? MEGA_WORDS : FART_WORDS;
  const word = words[Math.floor(RND() * words.length)];
  spawnPopup(
    word,
    cluster.x + backDir * 16 * U,
    cluster.y - 36 * U,
    backDir * 24 * U,
    -42 * U,
    mega ? '#ccff33' : '#a8ff4d',
    '#143b0b',
    mega ? 34 : 24,
    mega ? 1.7 : 1.2
  );
}

function spawnPotato(ctx, t, opts = {}) {
  if (potatoes.length >= 14) {
    // Let the oldest fleeing potato gracefully finish first
    const idx = potatoes.findIndex((p) => p.state === 'flee');
    if (idx >= 0) potatoes.splice(idx, 1);
    else return null;
  }

  spudCounter++;
  const dir = opts.dir ?? nextDir;
  nextDir = -dir;

  const seed = opts.seed ?? (spudCounter * 977 + Math.floor(t * 100));
  const style = SPUD_STYLES[seed % SPUD_STYLES.length];
  const scale = (opts.scale ?? (0.92 + (seed % 7) * 0.04)) * U;
  const isBoss = Boolean(opts.boss);
  const mega = Boolean(opts.mega || beanCharges > 0);
  if (!opts.mega && beanCharges > 0) beanCharges--;

  // Slight horizontal jitter around center screen so simultaneous spuds don't stack identically
  const targetX = opts.targetX ?? (W * 0.5 + ((seed % 9) - 4) * 22 * U);
  const laneOffset = ((spudCounter % 3) * 7) * U;
  const groundY = H - (12 * U + laneOffset);
  const startX = dir > 0 ? -90 * scale : W + 90 * scale;

  // Build organic potato dimples and lump harmonics
  const dimples = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + ((seed + i * 31) % 10) * 0.06;
    const rad = 0.25 + ((seed + i * 17) % 10) * 0.04;
    dimples.push({
      x: Math.cos(a) * rad * 36,
      y: Math.sin(a) * rad * 44,
      r: 2.2 + ((seed + i * 13) % 3) * 0.9,
    });
  }

  const spud = {
    id: spudCounter,
    dir,
    x: startX,
    targetX,
    groundY,
    scale,
    style,
    isBoss,
    mega,
    state: 'run_in', // run_in -> skid -> crouch -> fart -> flee
    stateT: 0,
    runSpeed: (isBoss ? 255 : 315 + (seed % 5) * 18) * U,
    fleeSpeed: (isBoss ? 360 : 395 + (seed % 4) * 22) * U,
    stride: RND() * TAU,
    lastStepSign: 1,
    lumpA: 0.06 + (seed % 5) * 0.012,
    lumpB: 0.04 + ((seed >> 3) % 4) * 0.01,
    lumpPhase: (seed % 12) * 0.5,
    dimples,
    giggleBoostUntil: -1,
    gigglePopupTimer: 0,
    giggleSfxPlayed: false,
    giggleSecondPlayed: false,
    farted: false,
    pitch: ((seed % 5) - 2) * 0.6,
    blush: 0,
    recoil: 0,
    doubleToot: Boolean(opts.doubleToot),
    secondTootDone: false,
  };

  potatoes.push(spud);

  // Tiny entry puff at the edge so viewers immediately notice the new runner
  spawnDust(dir > 0 ? 12 * U : W - 12 * U, groundY - 12 * U, dir * 45 * U, -24 * U, 12);
  if (opts.chatterBurst) {
    playBoingSound(ctx, t);
  }
  return spud;
}

function triggerWindFan(ctx, t) {
  playWhooshSound(ctx, t);
  const gustDir = RND() < 0.5 ? 1 : -1;
  for (let i = 0; i < 6; i++) {
    windGusts.push({
      x: gustDir > 0 ? -120 * U : W + 120 * U,
      y: H * (0.25 + i * 0.11) + (RND() - 0.5) * 35 * U,
      vx: gustDir * (680 + RND() * 240) * U,
      len: (130 + RND() * 110) * U,
      amp: (14 + RND() * 18) * U,
      life: 0,
      maxLife: 1.55 + RND() * 0.4,
      dir: gustDir,
    });
  }
  for (const cl of clouds) {
    cl.vx += gustDir * (240 + RND() * 120) * U;
    cl.vy -= (45 + RND() * 35) * U;
    for (const p of cl.puffs) {
      p.vx += gustDir * (45 + RND() * 45) * U;
    }
  }
  spawnPopup(
    'WHOOOSH!',
    W * 0.5,
    H * 0.45,
    gustDir * 60 * U,
    -20 * U,
    '#aef6ff',
    '#0d3b66',
    30,
    1.1
  );
}

// ---------------------------------------------------------------- lifecycle

export function init(ctx) {
  updateMetrics(ctx);
  RND = ctx.rand || Math.random;
  seenUsers = new Set();
  potatoes = [];
  clouds = [];
  dust = [];
  bubbles = [];
  popups = [];
  windGusts = [];
  beanCharges = 0;
  nextDir = 1;
  spudCounter = 0;
  beatDone = [false, false, false, false, false];
  lastFartSfxAt = -10;
  lastGiggleSfxAt = -10;
  lastWhooshSfxAt = -10;
  lastBoingSfxAt = -10;
}

export function onChat(ctx, msg) {
  if (!msg) return;
  const t = msg.at || 0;
  const cmd = (msg.cmd || '').toLowerCase();
  const userKey = (msg.user || '').toLowerCase().trim() || `anon-${spudCounter}`;
  const isFirstMessage = !seenUsers.has(userKey);
  if (isFirstMessage) seenUsers.add(userKey);

  let spawnedFromCmd = false;

  if (cmd === '!beans') {
    beanCharges = Math.min(beanCharges + 1, 5);
    // Upgrade an incoming potato if one hasn't farted yet
    const incoming = potatoes.find((p) => !p.farted && !p.mega);
    if (incoming) {
      incoming.mega = true;
      beanCharges = Math.max(0, beanCharges - 1);
      spawnPopup('BEAN POWER!', incoming.x, incoming.groundY - 120 * U, 0, -35 * U, '#ffbe0b', '#5c2100', 24, 1.2);
    } else {
      spawnPopup('BEANS LOADED!', W * 0.5, H - 140 * U, 0, -35 * U, '#ffbe0b', '#5c2100', 26, 1.25);
    }
    ctx.sound.beep(210, 80);
    ctx.sound.beep(320, 95);
    ctx.sound.noise(110);
  } else if (cmd === '!giggle') {
    playSoftGiggleSound(ctx, t, 1.5);
    if (potatoes.length === 0) {
      const p = spawnPotato(ctx, t, { seed: hashStr(userKey), chatterBurst: true });
      if (p) p.giggleBoostUntil = t + 4.0;
      spawnedFromCmd = true;
    } else {
      for (const p of potatoes) {
        p.giggleBoostUntil = t + 3.5;
        p.blush = 1;
        spawnPopup(
          GIGGLE_WORDS[Math.floor(RND() * GIGGLE_WORDS.length)],
          p.x,
          p.groundY - 115 * U,
          (RND() - 0.5) * 35 * U,
          -45 * U,
          '#ffd6e8',
          '#7a1647',
          20,
          1.0
        );
      }
    }
  } else if (cmd === '!fan') {
    triggerWindFan(ctx, t);
  } else if (cmd === '!spud') {
    spawnPotato(ctx, t, {
      seed: hashStr(userKey + String(spudCounter)),
      chatterBurst: true,
    });
    spawnedFromCmd = true;
  }

  // Prompt's signature behavior: whenever a chatter types for the first time,
  // a cartoon potato with legs runs in along the bottom edge, farts at mid-screen,
  // and giggles off to the opposite side!
  if (isFirstMessage && !spawnedFromCmd) {
    spawnPotato(ctx, t, {
      seed: hashStr(userKey),
      dir: 1, // classic left-to-right entrance for first-timers (varies if crowded)
      targetX: W * 0.5 + (potatoes.length % 3 - 1) * 34 * U,
      chatterBurst: true,
    });
  }
}

// ---------------------------------------------------------------- update

function runStandaloneBeats(ctx, t) {
  // Act 1 (Establish): Solo classic russet potato runs left -> center -> farts -> giggles off right
  if (!beatDone[0] && t >= 1.1) {
    beatDone[0] = true;
    spawnPotato(ctx, t, {
      dir: 1,
      seed: 0, // Classic russet with sprout
      targetX: W * 0.5,
      scale: 1.05,
    });
  }

  // Act 2a (Escalate): Cheeky Yukon gold sprints in from the right, double-toots, flees left
  if (!beatDone[1] && t >= 15.5) {
    beatDone[1] = true;
    spawnPotato(ctx, t, {
      dir: -1,
      seed: 1,
      targetX: W * 0.52,
      scale: 1.08,
      doubleToot: true,
    });
  }

  // Act 2b (Escalate): Conspiratorial potato duo jogs in from the left
  if (!beatDone[2] && t >= 26.5) {
    beatDone[2] = true;
    spawnPotato(ctx, t, {
      dir: 1,
      seed: 2,
      targetX: W * 0.45,
      scale: 0.95,
    });
  }
  if (!beatDone[3] && t >= 27.9) {
    beatDone[3] = true;
    spawnPotato(ctx, t, {
      dir: 1,
      seed: 3,
      targetX: W * 0.55,
      scale: 0.86,
    });
  }

  // Act 3 (Punchline): Boss Spud delivers the supreme bean-charged mega toot and roadrunners off giggling
  if (!beatDone[4] && t >= 39.0) {
    beatDone[4] = true;
    spawnPotato(ctx, t, {
      dir: 1,
      seed: 4,
      targetX: W * 0.5,
      scale: 1.24,
      boss: true,
      mega: true,
    });
  }
}

function stepPotato(ctx, p, t, dt) {
  p.stateT += dt;
  const giggleBoost = t < p.giggleBoostUntil ? 1.45 : 1.0;

  if (p.state === 'run_in') {
    const speed = p.runSpeed * giggleBoost;
    p.x += p.dir * speed * dt;
    p.stride += dt * (14.5 * giggleBoost);

    // Footstep dust puffs
    const stepSign = Math.sin(p.stride) >= 0 ? 1 : -1;
    if (stepSign !== p.lastStepSign) {
      p.lastStepSign = stepSign;
      spawnDust(p.x - p.dir * 10 * p.scale, p.groundY - 4 * p.scale, -p.dir * 38 * U, -18 * U, 8);
    }

    const reached = p.dir > 0 ? p.x >= p.targetX : p.x <= p.targetX;
    if (reached) {
      p.x = p.targetX;
      p.state = 'skid';
      p.stateT = 0;
      for (let i = 0; i < 4; i++) {
        spawnDust(
          p.x + p.dir * (8 + i * 6) * p.scale,
          p.groundY - 4 * p.scale,
          p.dir * (40 + RND() * 50) * U,
          -(15 + RND() * 35) * U,
          10
        );
      }
      ctx.sound.noise(95);
    }
  } else if (p.state === 'skid') {
    // Brief skid-stop settle
    p.x += p.dir * (1 - clamp(p.stateT / 0.28, 0, 1)) * 55 * U * dt;
    if (p.stateT >= 0.28) {
      p.state = 'crouch';
      p.stateT = 0;
    }
  } else if (p.state === 'crouch') {
    // Look slyly left and right, squat down, build comic pressure
    const crouchDur = p.isBoss ? 1.15 : 0.78;
    p.blush = clamp(p.stateT / crouchDur, 0, 0.55);
    if (p.stateT >= crouchDur) {
      p.state = 'fart';
      p.stateT = 0;
      p.farted = true;
      p.recoil = 1.0;
      p.blush = 1.0;
      playFartSound(ctx, t, p.mega);
      spawnFartCloud(p.x, p.groundY - 44 * p.scale, p.dir, p.mega);
    }
  } else if (p.state === 'fart') {
    p.recoil = Math.max(0, p.recoil - dt * 2.4);
    if (p.doubleToot && !p.secondTootDone && p.stateT >= 0.42) {
      p.secondTootDone = true;
      p.recoil = 0.85;
      playFartSound(ctx, t, false);
      spawnFartCloud(p.x, p.groundY - 46 * p.scale, p.dir, false);
    }
    const fartPoseDur = p.doubleToot ? 0.92 : p.mega ? 0.88 : 0.62;
    if (p.stateT >= fartPoseDur) {
      p.state = 'flee';
      p.stateT = 0;
      p.gigglePopupTimer = 0.05;
      p.giggleSfxPlayed = true;
      playSoftGiggleSound(ctx, t, p.pitch);
    }
  } else if (p.state === 'flee') {
    const speed = p.fleeSpeed * giggleBoost * (p.mega ? 1.12 : 1.0);
    p.x += p.dir * speed * dt;
    p.stride += dt * (21.5 * giggleBoost);
    p.blush = 0.92;

    // Soft secondary giggle chirp halfway off screen
    if (!p.giggleSecondPlayed && p.stateT > 0.75) {
      p.giggleSecondPlayed = true;
      playSoftGiggleSound(ctx, t, p.pitch + 0.8);
    }

    // Floating giggle comic words as it scampers away
    p.gigglePopupTimer -= dt;
    if (p.gigglePopupTimer <= 0) {
      p.gigglePopupTimer = 0.36 + RND() * 0.22;
      spawnPopup(
        GIGGLE_WORDS[Math.floor(RND() * GIGGLE_WORDS.length)],
        p.x - p.dir * 12 * p.scale,
        p.groundY - 108 * p.scale,
        -p.dir * 28 * U,
        -48 * U,
        '#ffe5f1',
        '#7a1647',
        18,
        0.95
      );
    }

    // Rapid cartoon scamper dust
    const stepSign = Math.sin(p.stride) >= 0 ? 1 : -1;
    if (stepSign !== p.lastStepSign) {
      p.lastStepSign = stepSign;
      spawnDust(p.x - p.dir * 16 * p.scale, p.groundY - 4 * p.scale, -p.dir * 65 * U, -28 * U, 9);
    }
  }
}

function isPotatoOffscreen(p) {
  if (p.state !== 'flee') return false;
  return p.dir > 0 ? p.x > W + 140 * p.scale : p.x < -140 * p.scale;
}

// ---------------------------------------------------------------- drawing

function tracePotatoPath(c, rx, ry, lumpA, lumpB, phase) {
  const N = 40;
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    // Slight pear-ish tuber pinch near top, fuller bottom, plus organic bumps
    const topPinch = 1 - 0.1 * Math.sin(a);
    const lump =
      1 +
      lumpA * Math.sin(a * 3 + phase) +
      lumpB * Math.cos(a * 5 - phase * 1.3) +
      0.03 * Math.sin(a * 2 + 0.8);
    const x = Math.cos(a) * rx * topPinch * lump;
    const y = Math.sin(a) * ry * lump;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

function drawCartoonLeg(c, hipX, hipY, footX, footY, dir, shoeColor, scale, ink) {
  const mx = (hipX + footX) * 0.5 + dir * 10 * scale;
  const my = (hipY + footY) * 0.5 - 4 * scale;

  // Rubber-hose leg line
  c.strokeStyle = ink;
  c.lineWidth = 6.2 * scale;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(hipX, hipY);
  c.quadraticCurveTo(mx, my, footX, footY - 4 * scale);
  c.stroke();

  // Inner warm leg tint
  c.strokeStyle = '#6b4226';
  c.lineWidth = 2.6 * scale;
  c.stroke();

  // Oversized cartoon sneaker
  c.save();
  c.translate(footX, footY);
  const footTilt = clamp((footY - hipY - 30 * scale) * 0.015, -0.35, 0.35);
  c.rotate(dir * footTilt);

  // Sneaker body
  c.fillStyle = shoeColor;
  c.strokeStyle = ink;
  c.lineWidth = 3 * scale;
  c.beginPath();
  c.moveTo(-10 * scale * dir, 0);
  c.lineTo(15 * scale * dir, 0);
  c.quadraticCurveTo(21 * scale * dir, -2 * scale, 18 * scale * dir, -9 * scale);
  c.quadraticCurveTo(10 * scale * dir, -14 * scale, -4 * scale * dir, -12 * scale);
  c.quadraticCurveTo(-12 * scale * dir, -10 * scale, -10 * scale * dir, 0);
  c.closePath();
  c.fill();
  c.stroke();

  // White toe cap & sole
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.roundRect(
    dir > 0 ? -10 * scale : -17 * scale,
    -3.2 * scale,
    27 * scale,
    3.6 * scale,
    2 * scale
  );
  c.fill();
  c.stroke();

  c.restore();
}

function drawPotatoHat(c, p, rx, ry, t) {
  const s = p.scale;
  const ink = '#2a180d';
  c.save();
  c.translate(0, -ry + 2 * s);

  if (p.isBoss) {
    // Tiny royal golden crown for the finale Boss Spud
    c.rotate(Math.sin(t * 7) * 0.07);
    c.fillStyle = '#ffd166';
    c.strokeStyle = ink;
    c.lineWidth = 3 * s;
    c.beginPath();
    c.moveTo(-18 * s, 2 * s);
    c.lineTo(-22 * s, -18 * s);
    c.lineTo(-9 * s, -8 * s);
    c.lineTo(0, -24 * s);
    c.lineTo(9 * s, -8 * s);
    c.lineTo(22 * s, -18 * s);
    c.lineTo(18 * s, 2 * s);
    c.closePath();
    c.fill();
    c.stroke();

    // Little pink gem in center
    c.fillStyle = '#ff2d78';
    c.beginPath();
    c.arc(0, -6 * s, 3.6 * s, 0, TAU);
    c.fill();
  } else if (p.style.hat === 'sprout' || p.style.hat === 'twin' || p.style.hat === 'leaf') {
    const sway = Math.sin(t * 8 + p.id) * 0.16;
    c.rotate(sway);
    c.strokeStyle = '#245c17';
    c.lineWidth = 3.2 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(0, 3 * s);
    c.quadraticCurveTo(3 * s, -10 * s, 0, -17 * s);
    c.stroke();

    // Cute green sprout leaf
    c.fillStyle = '#6ee03a';
    c.strokeStyle = '#1b4710';
    c.lineWidth = 2.4 * s;
    c.beginPath();
    c.ellipse(9 * s, -16 * s, 9 * s, 4.5 * s, -0.45, 0, TAU);
    c.fill();
    c.stroke();

    if (p.style.hat === 'twin') {
      c.beginPath();
      c.ellipse(-8 * s, -14 * s, 8 * s, 4 * s, 0.5, 0, TAU);
      c.fill();
      c.stroke();
    }
  } else if (p.style.hat === 'bandana') {
    // Cheeky headband across forehead
    c.translate(0, 14 * s);
    c.fillStyle = '#ff2d78';
    c.strokeStyle = ink;
    c.lineWidth = 2.6 * s;
    c.beginPath();
    c.ellipse(0, 0, rx * 0.9, 6.5 * s, 0, 0, TAU);
    c.fill();
    c.stroke();
  }
  c.restore();
}

function drawPotato(c, p, t) {
  const s = p.scale;
  const ink = '#2a180d';
  const dir = p.dir;

  // Pose kinematics
  let bob = 0;
  let tilt = 0;
  let sx = 1;
  let sy = 1;
  let shakeX = 0;
  let shakeY = 0;
  let crouchDrop = 0;

  if (p.state === 'run_in') {
    bob = Math.abs(Math.sin(p.stride)) * 10 * s;
    tilt = dir * (0.14 + Math.sin(p.stride * 2) * 0.05);
    sx = 1 + Math.sin(p.stride * 2) * 0.05;
    sy = 1 - Math.sin(p.stride * 2) * 0.05;
  } else if (p.state === 'skid') {
    const k = clamp(p.stateT / 0.28, 0, 1);
    tilt = -dir * 0.24 * (1 - k);
    sx = 1 + 0.08 * (1 - k);
    sy = 1 - 0.08 * (1 - k);
  } else if (p.state === 'crouch') {
    const k = easeOutCubic(p.stateT / (p.isBoss ? 1.15 : 0.78));
    crouchDrop = k * 14 * s;
    sx = 1 + k * 0.16;
    sy = 1 - k * 0.14;
    tilt = dir * 0.16 * k; // sticks rear out slightly!
    const vib = k * (p.mega ? 3.5 : 2.0) * s;
    shakeX = Math.sin(t * 48) * vib;
    shakeY = Math.cos(t * 53) * vib * 0.5;
  } else if (p.state === 'fart') {
    const pop = p.recoil;
    bob = pop * 18 * s;
    sx = 1 - pop * 0.12;
    sy = 1 + pop * 0.16;
    tilt = dir * (0.28 * pop + 0.08);
  } else if (p.state === 'flee') {
    // Bouncy giggling scamper!
    bob = Math.abs(Math.sin(p.stride)) * 15 * s;
    const giggleRock = Math.sin(t * 26 + p.id) * 0.14;
    tilt = dir * 0.22 + giggleRock;
    sx = 1 + Math.sin(t * 28) * 0.06;
    sy = 1 - Math.sin(t * 28) * 0.06;
  }

  const legLen = 30 * s;
  const rx = 34 * s;
  const ry = 44 * s;
  const bodyX = p.x + shakeX;
  const bodyY = p.groundY - legLen - ry * 0.78 - bob + crouchDrop + shakeY;

  // Ground contact shadow (transparent glass friendly)
  c.save();
  c.fillStyle = 'rgba(15, 10, 25, 0.34)';
  const shadowScale = clamp(1 - bob / (48 * s), 0.65, 1.15);
  c.beginPath();
  c.ellipse(p.x, p.groundY, 34 * s * shadowScale, 8 * s * shadowScale, 0, 0, TAU);
  c.fill();
  c.restore();

  // Compute leg foot targets
  const hipY = bodyY + ry * 0.65;
  let foot1X, foot1Y, foot2X, foot2Y;
  if (p.state === 'run_in' || p.state === 'flee') {
    const strideR = (p.state === 'flee' ? 28 : 23) * s;
    const liftH = (p.state === 'flee' ? 19 : 14) * s;
    const a1 = p.stride;
    const a2 = p.stride + Math.PI;
    foot1X = bodyX + Math.cos(a1) * strideR * dir;
    foot1Y = p.groundY - Math.max(0, Math.sin(a1)) * liftH;
    foot2X = bodyX + Math.cos(a2) * strideR * dir;
    foot2Y = p.groundY - Math.max(0, Math.sin(a2)) * liftH;
  } else if (p.state === 'crouch') {
    foot1X = bodyX - 15 * s;
    foot1Y = p.groundY;
    foot2X = bodyX + 15 * s;
    foot2Y = p.groundY;
  } else if (p.state === 'fart') {
    // Little recoil hop feet dangling slightly during fart burst
    const hop = p.recoil * 12 * s;
    foot1X = bodyX - 16 * s;
    foot1Y = p.groundY - hop;
    foot2X = bodyX + 14 * s;
    foot2Y = p.groundY - hop * 0.8;
  } else {
    // Skid pose
    foot1X = bodyX + dir * 18 * s;
    foot1Y = p.groundY;
    foot2X = bodyX - dir * 10 * s;
    foot2Y = p.groundY;
  }

  // Back leg
  drawCartoonLeg(c, bodyX - 8 * s * dir, hipY, foot2X, foot2Y, dir, p.style.shoe, s, ink);

  // Bean-boost spicy aura if mega-charged before farting
  if (p.mega && !p.farted) {
    c.save();
    c.translate(bodyX, bodyY);
    const pulse = 0.5 + 0.5 * Math.sin(t * 14);
    const grad = c.createRadialGradient(0, 0, rx * 0.4, 0, 0, ry * 1.45);
    grad.addColorStop(0, `rgba(140, 255, 50, ${0.28 + pulse * 0.16})`);
    grad.addColorStop(1, 'rgba(140, 255, 50, 0)');
    c.fillStyle = grad;
    c.beginPath();
    c.arc(0, 0, ry * 1.45, 0, TAU);
    c.fill();
    c.restore();
  }

  // Potato body
  c.save();
  c.translate(bodyX, bodyY);
  c.rotate(tilt);
  c.scale(sx, sy);

  // Main potato shape with rich 3-stop shading
  tracePotatoPath(c, rx, ry, p.lumpA, p.lumpB, p.lumpPhase);
  const bodyGrad = c.createRadialGradient(-rx * 0.3, -ry * 0.32, rx * 0.12, 0, 0, ry * 1.2);
  bodyGrad.addColorStop(0, p.style.hi);
  bodyGrad.addColorStop(0.58, p.style.mid);
  bodyGrad.addColorStop(1, p.style.lo);
  c.fillStyle = bodyGrad;
  c.fill();

  // Cel highlight crescent on upper left
  c.save();
  c.clip();
  c.fillStyle = 'rgba(255, 250, 230, 0.25)';
  c.beginPath();
  c.ellipse(-rx * 0.42, -ry * 0.4, rx * 0.32, ry * 0.22, -0.5, 0, TAU);
  c.fill();

  // Potato skin dimples / freckles
  c.fillStyle = p.style.spot;
  for (const d of p.dimples) {
    c.globalAlpha = 0.52;
    c.beginPath();
    c.ellipse(d.x * s, d.y * s, d.r * s * 1.3, d.r * s * 0.8, 0.3, 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;
  c.restore();

  // Crisp cartoon ink outline
  tracePotatoPath(c, rx, ry, p.lumpA, p.lumpB, p.lumpPhase);
  c.strokeStyle = ink;
  c.lineWidth = 4.2 * s;
  c.lineJoin = 'round';
  c.stroke();

  // Hat / Sprout
  drawPotatoHat(c, p, rx, ry, t);

  // Expressive face (positioned slightly toward facing direction)
  const faceX = dir * 7 * s;
  const faceY = -6 * s;

  // Rosy blush cheeks
  if (p.blush > 0.05 || p.state === 'flee') {
    c.fillStyle = `rgba(255, 92, 148, ${0.42 + p.blush * 0.35})`;
    c.beginPath();
    c.ellipse(faceX - 16 * s, faceY + 10 * s, 7.5 * s, 4.5 * s, 0, 0, TAU);
    c.ellipse(faceX + 16 * s, faceY + 10 * s, 7.5 * s, 4.5 * s, 0, 0, TAU);
    c.fill();
  }

  // Eyes
  const eyeOff = 10.5 * s;
  if (p.state === 'flee') {
    // Joyful squeezed giggling ^ ^ eyes!
    c.strokeStyle = ink;
    c.lineWidth = 3.6 * s;
    c.lineCap = 'round';
    for (const side of [-1, 1]) {
      const ex = faceX + side * eyeOff;
      c.beginPath();
      c.arc(ex, faceY + 1 * s, 6.2 * s, Math.PI * 1.12, Math.PI * 1.88);
      c.stroke();
    }
  } else {
    // Big expressive cartoon eyes
    let lookX = dir * 2.5 * s;
    let lookY = 0;
    if (p.state === 'crouch') {
      // Shifty left-right glance before farting!
      lookX = Math.sin(p.stateT * 11) * 4.2 * s;
      lookY = -1 * s;
    } else if (p.state === 'fart') {
      lookX = -dir * 3.5 * s; // glancing back at its handiwork!
    }

    for (const side of [-1, 1]) {
      const ex = faceX + side * eyeOff;
      const ey = faceY - 2 * s;
      const er = (p.state === 'fart' ? 8.8 : 7.6) * s;

      c.fillStyle = '#ffffff';
      c.strokeStyle = ink;
      c.lineWidth = 2.8 * s;
      c.beginPath();
      c.ellipse(ex, ey, er * 0.9, er, 0, 0, TAU);
      c.fill();
      c.stroke();

      // Pupil
      c.fillStyle = '#1b110d';
      c.beginPath();
      c.arc(ex + lookX, ey + lookY, er * 0.44, 0, TAU);
      c.fill();

      // Specular sparkle
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(ex + lookX - 1.6 * s, ey + lookY - 1.8 * s, er * 0.17, 0, TAU);
      c.fill();
    }

    // Mischievous eyebrows
    c.strokeStyle = ink;
    c.lineWidth = 3.2 * s;
    c.lineCap = 'round';
    const browTilt = p.state === 'crouch' ? 0.35 : p.state === 'fart' ? -0.25 : 0.22;
    for (const side of [-1, 1]) {
      const ex = faceX + side * eyeOff;
      const by = faceY - 12 * s;
      c.beginPath();
      c.moveTo(ex - 6 * s, by - side * browTilt * 7 * s);
      c.lineTo(ex + 6 * s, by + side * browTilt * 7 * s);
      c.stroke();
    }
  }

  // Mouth
  c.strokeStyle = ink;
  c.lineWidth = 3.0 * s;
  c.lineCap = 'round';
  if (p.state === 'flee') {
    // Open giggling laugh mouth
    const laughOpen = 6 + Math.abs(Math.sin(t * 28 + p.id)) * 5;
    c.fillStyle = '#6b1128';
    c.beginPath();
    c.arc(faceX, faceY + 10 * s, 9 * s, 0, Math.PI);
    c.lineTo(faceX - 9 * s, faceY + 10 * s);
    c.closePath();
    c.fill();
    c.stroke();
    // Little pink tongue
    c.fillStyle = '#ff6b9d';
    c.beginPath();
    c.ellipse(faceX, faceY + (11 + laughOpen * 0.35) * s, 5 * s, 3.2 * s, 0, 0, TAU);
    c.fill();
  } else if (p.state === 'crouch') {
    // Straining / puckered concentration mouth
    c.beginPath();
    c.moveTo(faceX - 7 * s, faceY + 12 * s);
    c.quadraticCurveTo(faceX, faceY + 8 * s, faceX + 7 * s, faceY + 12 * s);
    c.stroke();
    // Comic sweat drop during crouch
    const dropY = -ry * 0.55 + (p.stateT * 18) % 14;
    c.fillStyle = '#7ce8ff';
    c.strokeStyle = '#155a75';
    c.lineWidth = 2 * s;
    c.beginPath();
    c.moveTo(faceX + dir * 22 * s, dropY - 7 * s);
    c.quadraticCurveTo(faceX + dir * 27 * s, dropY + 2 * s, faceX + dir * 22 * s, dropY + 5 * s);
    c.quadraticCurveTo(faceX + dir * 17 * s, dropY + 2 * s, faceX + dir * 22 * s, dropY - 7 * s);
    c.fill();
    c.stroke();
  } else if (p.state === 'fart') {
    // Cheeky 'O' mouth / smug relief grin
    c.fillStyle = '#5c1424';
    c.beginPath();
    c.ellipse(faceX, faceY + 12 * s, 5.5 * s, 7.2 * s, 0, 0, TAU);
    c.fill();
    c.stroke();
  } else {
    // Mischievous running smirk
    c.beginPath();
    c.arc(faceX, faceY + 7 * s, 9.5 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  }

  c.restore();

  // Front leg drawn in front of potato lower edge
  drawCartoonLeg(c, bodyX + 8 * s * dir, hipY, foot1X, foot1Y, dir, p.style.shoe, s, ink);
}

function drawFartCloud(c, cl, t) {
  const k = clamp(cl.age / cl.maxLife, 0, 1);
  // Quick snappy pop-in, long lazy float, smooth fade out
  const fadeIn = easeOutBack(clamp(cl.age / 0.28, 0, 1));
  const fadeOut = k > 0.62 ? 1 - (k - 0.62) / 0.38 : 1;
  const alpha = clamp(fadeOut, 0, 1) * 0.92;
  if (alpha <= 0.01) return;

  c.save();
  c.translate(cl.x, cl.y);

  // Soft toxic green outer glow so it pops over dark OR bright streams
  c.save();
  c.globalAlpha = alpha * 0.26;
  const glowR = (cl.mega ? 120 : 72) * U * (0.85 + k * 0.55);
  const g = c.createRadialGradient(0, 0, 8 * U, 0, 0, glowR);
  g.addColorStop(0, '#8cff2e');
  g.addColorStop(0.6, '#48c71c');
  g.addColorStop(1, 'rgba(60, 190, 20, 0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, glowR, 0, TAU);
  c.fill();
  c.restore();

  // Dark cartoon outline pass behind all puffs (creates unified comic cloud silhouette!)
  c.globalAlpha = alpha;
  c.fillStyle = '#1b5210';
  for (const pf of cl.puffs) {
    const r = (pf.r0 + pf.grow * easeOutCubic(k * 1.15)) * fadeIn;
    const wob = Math.sin(t * pf.wobbleFreq + pf.wobblePhase) * 4 * U;
    c.beginPath();
    c.arc(pf.ox + wob, pf.oy, r + 3.4 * U, 0, TAU);
    c.fill();
  }

  // Green cloud fill pass
  for (const pf of cl.puffs) {
    const r = (pf.r0 + pf.grow * easeOutCubic(k * 1.15)) * fadeIn;
    const wob = Math.sin(t * pf.wobbleFreq + pf.wobblePhase) * 4 * U;
    c.fillStyle = pf.color;
    c.beginPath();
    c.arc(pf.ox + wob, pf.oy, r, 0, TAU);
    c.fill();

    // Inner pale lime highlight dot
    c.fillStyle = 'rgba(235, 255, 180, 0.34)';
    c.beginPath();
    c.arc(pf.ox + wob - r * 0.28, pf.oy - r * 0.28, r * 0.36, 0, TAU);
    c.fill();
  }

  // Goofy cartoon stink-skull / dizzy face inside mega clouds!
  if (cl.mega && cl.age > 0.25 && cl.age < 5.5) {
    const skullA = clamp(Math.sin(clamp((cl.age - 0.25) / 5.25, 0, 1) * Math.PI) * 1.4, 0, 0.85);
    c.save();
    c.globalAlpha = alpha * skullA;
    c.fillStyle = '#14420a';
    // X-eyes
    c.strokeStyle = '#14420a';
    c.lineWidth = 4 * U;
    c.lineCap = 'round';
    for (const sx of [-16 * U, 16 * U]) {
      c.beginPath();
      c.moveTo(sx - 6 * U, -10 * U);
      c.lineTo(sx + 6 * U, 2 * U);
      c.moveTo(sx + 6 * U, -10 * U);
      c.lineTo(sx - 6 * U, 2 * U);
      c.stroke();
    }
    // Wavy grimace mouth
    c.beginPath();
    c.moveTo(-16 * U, 16 * U);
    c.quadraticCurveTo(-8 * U, 10 * U, 0, 16 * U);
    c.quadraticCurveTo(8 * U, 22 * U, 16 * U, 16 * U);
    c.stroke();
    c.restore();
  }

  // Wavy rising cartoon stink lines
  c.strokeStyle = '#c8ff6e';
  c.lineWidth = 3 * U;
  c.lineCap = 'round';
  c.globalAlpha = alpha * 0.78;
  for (const sl of cl.stinkLines) {
    c.beginPath();
    const segs = 12;
    for (let i = 0; i <= segs; i++) {
      const f = i / segs;
      const sx = sl.ox + Math.sin(f * 5.2 - t * 6.5 + sl.phase) * 7 * U;
      const sy = sl.oy - f * sl.h;
      if (i === 0) c.moveTo(sx, sy);
      else c.lineTo(sx, sy);
    }
    c.stroke();
  }

  // Tiny buzzing cartoon flies around the cloud
  for (const fl of cl.flies) {
    const a = t * fl.speed + fl.phase;
    const fx = Math.cos(a) * fl.orbitX;
    const fy = Math.sin(a * 1.4) * fl.orbitY;
    c.fillStyle = '#1a1a1a';
    c.beginPath();
    c.arc(fx, fy, 2.6 * U, 0, TAU);
    c.fill();
    // Little fluttering wings
    const wing = Math.sin(t * 48 + fl.phase) * 2 * U;
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath();
    c.ellipse(fx - 2.5 * U, fy - 2.5 * U + wing * 0.3, 3.2 * U, 1.6 * U, -0.5, 0, TAU);
    c.ellipse(fx + 2.5 * U, fy - 2.5 * U - wing * 0.3, 3.2 * U, 1.6 * U, 0.5, 0, TAU);
    c.fill();
  }

  c.restore();
}

// ---------------------------------------------------------------- main frame

export function frame(ctx, t, dt) {
  updateMetrics(ctx);
  const c = ctx.canvas;
  const safeDt = clamp(dt || 0.016, 0.001, 0.05);

  // Transparent glass over the live stream — always clear every frame!
  c.clearRect(0, 0, W, H);

  // Run the 60-second solo arc so the show is always entertaining
  runStandaloneBeats(ctx, t);

  // Step potatoes
  for (let i = potatoes.length - 1; i >= 0; i--) {
    const p = potatoes[i];
    stepPotato(ctx, p, t, safeDt);
    if (isPotatoOffscreen(p)) potatoes.splice(i, 1);
  }

  // Step fart clouds (float upward, sway, and drift away)
  for (let i = clouds.length - 1; i >= 0; i--) {
    const cl = clouds[i];
    cl.age += safeDt;
    cl.vx *= Math.pow(0.45, safeDt); // air drag slows initial blast into gentle drift
    const sway = Math.sin(t * 1.7 + cl.swayPhase) * 26 * U;
    cl.x += (cl.vx + sway) * safeDt;
    cl.y += cl.vy * safeDt;
    cl.vy = lerp(cl.vy, -(cl.mega ? 54 : 44) * U, safeDt * 0.8);
    for (const pf of cl.puffs) {
      pf.ox += pf.vx * safeDt;
      pf.oy += pf.vy * safeDt;
      pf.vx *= Math.pow(0.32, safeDt);
      pf.vy *= Math.pow(0.4, safeDt);
    }
    if (cl.age >= cl.maxLife || cl.y < -220 * U) {
      clouds.splice(i, 1);
    }
  }

  // Step bubbles
  for (let i = bubbles.length - 1; i >= 0; i--) {
    const b = bubbles[i];
    b.life += safeDt;
    b.vx *= Math.pow(0.35, safeDt);
    b.x += (b.vx + Math.sin(t * 5 + i) * 14 * U) * safeDt;
    b.y += b.vy * safeDt;
    if (b.life >= b.maxLife) bubbles.splice(i, 1);
  }

  // Step dust puffs
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i];
    d.life += safeDt;
    d.x += d.vx * safeDt;
    d.y += d.vy * safeDt;
    d.vx *= Math.pow(0.2, safeDt);
    if (d.life >= d.maxLife) dust.splice(i, 1);
  }

  // Step wind gusts
  for (let i = windGusts.length - 1; i >= 0; i--) {
    const g = windGusts[i];
    g.life += safeDt;
    g.x += g.vx * safeDt;
    if (g.life >= g.maxLife) windGusts.splice(i, 1);
  }

  // Step popups
  for (let i = popups.length - 1; i >= 0; i--) {
    const pp = popups[i];
    pp.life += safeDt;
    pp.x += pp.vx * safeDt;
    pp.y += pp.vy * safeDt;
    pp.vy *= Math.pow(0.4, safeDt);
    if (pp.life >= pp.maxLife) popups.splice(i, 1);
  }

  // ---- Render layers (back to front) ----

  // 1. Floating green fart clouds
  for (const cl of clouds) {
    drawFartCloud(c, cl, t);
  }

  // 2. Green stink bubbles
  for (const b of bubbles) {
    const k = b.life / b.maxLife;
    const a = (1 - k) * 0.85;
    c.save();
    c.globalAlpha = a;
    c.fillStyle = b.color;
    c.strokeStyle = '#1b5210';
    c.lineWidth = 2 * U;
    c.beginPath();
    c.arc(b.x, b.y, b.r * (0.7 + 0.4 * k), 0, TAU);
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.beginPath();
    c.arc(b.x - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.25, 0, TAU);
    c.fill();
    c.restore();
  }

  // 3. Footstep dust puffs
  for (const d of dust) {
    const k = d.life / d.maxLife;
    c.save();
    c.globalAlpha = (1 - k) * 0.55;
    c.fillStyle = '#f2e8d5';
    c.beginPath();
    c.arc(d.x, d.y, d.r * (0.6 + k * 0.9), 0, TAU);
    c.fill();
    c.restore();
  }

  // 4. Cartoon potatoes with legs (sorted slightly by groundY for clean overlap)
  const sortedSpuds = [...potatoes].sort((a, b) => a.groundY - b.groundY);
  for (const p of sortedSpuds) {
    drawPotato(c, p, t);
  }

  // 5. Wind fan ribbons
  for (const g of windGusts) {
    const k = g.life / g.maxLife;
    const a = Math.sin(k * Math.PI) * 0.72;
    c.save();
    c.globalAlpha = a;
    c.strokeStyle = '#d4f8ff';
    c.lineWidth = 4.5 * U;
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= 16; i++) {
      const f = i / 16;
      const wx = g.x - g.dir * f * g.len;
      const wy = g.y + Math.sin(f * Math.PI * 2.5 + t * 10) * g.amp;
      if (i === 0) c.moveTo(wx, wy);
      else c.lineTo(wx, wy);
    }
    c.stroke();
    c.restore();
  }

  // 6. Comic callouts (PFFFT!, hee hee!, BEAN POWER!)
  for (const pp of popups) {
    const k = pp.life / pp.maxLife;
    const popScale = easeOutBack(clamp(pp.life / 0.18, 0, 1));
    const a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.translate(pp.x, pp.y);
    c.rotate(pp.rot);
    c.scale(popScale, popScale);
    c.font = `900 ${Math.round(pp.size)}px "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 6 * U;
    c.strokeStyle = pp.stroke;
    c.strokeText(pp.text, 0, 0);
    c.fillStyle = pp.color;
    c.fillText(pp.text, 0, 0);
    c.restore();
  }
}

export function dispose() {
  potatoes = [];
  clouds = [];
  dust = [];
  bubbles = [];
  popups = [];
  windGusts = [];
  seenUsers.clear();
}
