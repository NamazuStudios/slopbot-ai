// Dank Ass Bounce — a hand-drawn homage to the supplied orange goofball drops
// in, ricochets off everything, lands on the streamer's live camera frame,
// wiggles with intent, toots, and evacuates. Transparent glass: clearRect only.

export const meta = {
  title: 'Dank Ass Bounce',
  author: 'doctordiggitydank',
  prompt: 'with command "dankass" make the image at this URL: https://i.postimg.cc/XqPFF9xs/download-(1).png show up and bounce ar',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["dankass"], "caseSensitive": false },
  ],
  assets: [],
};

const TAU = Math.PI * 2;
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOutCubic = (k) => 1 - Math.pow(1 - clamp(k, 0, 1), 3);
const easeOutBack = (k) => {
  const x = clamp(k, 0, 1);
  return 1 + 2.70158 * Math.pow(x - 1, 3) + 1.70158 * Math.pow(x - 1, 2);
};

const INK = '#241305';
const ORANGE_HI = '#ffb23f';
const ORANGE = '#ff8a00';
const ORANGE_LO = '#d95c00';

// timeline, seconds
const T_BOUNCE_END = 6.2;
const T_LAND_END = 6.85;
const T_WIGGLE_END = 10.0;
const T_FART = 10.45;
const T_EXIT = 10.9;
const T_DONE = 12.6;

let W = 1280;
let H = 720;
let U = 1;
let RND = Math.random;

let bl = null;
let puffs = [];
let sparks = [];
let caps = [];
let shake = 0;
let summoner = '';
let fartFired = false;
let giggleFired = false;
let burstFired = false;
let landFired = false;
let doneFired = false;
let doneCalled = false;
let uhOhFired = false;
let lastBoingAt = -10;
let bounces = 0;
let landFrom = { x: 0, y: 0 };
let landAt = 0;

function updateMetrics(ctx) {
  W = ctx.width || 1280;
  H = ctx.height || 720;
  U = clamp(Math.min(W, H) / 720, 0.5, 1.9);
}

function streamerRect(ctx) {
  const s = ctx.streamer;
  if (!s) return { x: W * 0.5, y: H * 0.16, w: W * 0.3, h: H * 0.45 };
  return { x: s.x * W, y: s.y * H, w: s.w * W, h: s.h * H };
}

function addCap(text, dur, x, y, color, size, stroke) {
  caps.push({
    text,
    life: 0,
    maxLife: dur,
    x,
    y,
    color: color || '#ffe9c7',
    stroke: stroke || INK,
    size: (size || 30) * U,
    rot: (RND() - 0.5) * 0.1,
    vy: -14 * U,
  });
}

function spawnPuff(x, y, vx, vy) {
  puffs.push({
    x,
    y,
    vx,
    vy,
    r: (14 + RND() * 14) * U,
    grow: (26 + RND() * 22) * U,
    life: 0,
    maxLife: 2.4 + RND() * 1.3,
    wob: RND() * TAU,
    color: ['#b6ff5c', '#8ef03a', '#d4ff8a', '#6fd82b'][Math.floor(RND() * 4)],
  });
}

function spawnSpark(x, y, n, color) {
  for (let i = 0; i < n; i++) {
    const a = RND() * TAU;
    const sp = (120 + RND() * 260) * U;
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      maxLife: 0.4 + RND() * 0.35,
      r: (3 + RND() * 4) * U,
      color: color || '#ffd76a',
    });
  }
}

export function init(ctx) {
  updateMetrics(ctx);
  RND = ctx.rand || Math.random;
  puffs = [];
  sparks = [];
  caps = [];
  shake = 0;
  summoner = '';
  fartFired = false;
  giggleFired = false;
  burstFired = false;
  landFired = false;
  doneFired = false;
  doneCalled = false;
  uhOhFired = false;
  lastBoingAt = -10;
  bounces = 0;
  const r = streamerRect(ctx);
  bl = {
    x: W * 0.32,
    y: -130 * U,
    vx: (250 + RND() * 120) * U,
    vy: 60 * U,
    sx: 1,
    sy: 1,
    rot: 0,
    spin: 0,
    scale: 0.92 * U,
    lookX: 0,
    lookY: 0,
    phase: 'drop',
    seed: RND() * 10,
    landX: r.x,
    landY: r.y,
    hopZ: 0,
  };
  landFrom = { x: bl.x, y: bl.y };
}

export function onTrigger(ctx, event) {
  if (event && event.login) summoner = String(event.login).slice(0, 24);
}

export function frame(ctx, t, dt) {
  updateMetrics(ctx);
  const c = ctx.canvas;
  const sdt = clamp(dt || 0.016, 0.001, 0.05);
  c.clearRect(0, 0, W, H);

  const r = streamerRect(ctx);
  landAt = { x: r.x, y: r.y };

  // ------------------------------------------------------------- choreography
  if (t < T_BOUNCE_END) {
    if (t < 0.55) {
      // establishing drop
      bl.vy += 1500 * U * sdt;
      bl.x += bl.vx * sdt;
      bl.y += bl.vy * sdt;
      if (bl.y > H * 0.5) {
        bl.phase = 'bounce';
        bl.vy = -1020 * U;
      }
    } else {
      bl.phase = 'bounce';
      bl.vy += 1650 * U * sdt;
      bl.x += bl.vx * sdt;
      bl.y += bl.vy * sdt;
      const padX = 92 * U * bl.scale;
      const padTop = 100 * U * bl.scale;
      const padBot = 120 * U * bl.scale;
      let hit = false;
      if (bl.x < padX) {
        bl.x = padX;
        bl.vx = Math.abs(bl.vx) * 0.94;
        hit = true;
      } else if (bl.x > W - padX) {
        bl.x = W - padX;
        bl.vx = -Math.abs(bl.vx) * 0.94;
        hit = true;
      }
      if (bl.y < padTop) {
        bl.y = padTop;
        bl.vy = Math.abs(bl.vy) * 0.92;
        hit = true;
      } else if (bl.y > H - padBot) {
        bl.y = H - padBot;
        bl.vy = -Math.abs(bl.vy) * 0.93;
        hit = true;
        if (Math.abs(bl.vy) < 180 * U) bl.vy = -640 * U;
      }
      if (hit) {
        bounces++;
        bl.sx = 1.26;
        bl.sy = 0.76;
        spawnSpark(bl.x, bl.y, 7, '#ffd76a');
        if (t - lastBoingAt > 0.11) {
          lastBoingAt = t;
          ctx.sound.sample('boing');
          ctx.sound.beep(240 + (bounces % 4) * 70, 55);
        }
      }
      bl.spin += bl.vx * sdt * 0.0016;
    }
    bl.scale = 0.92 * U;
    bl.lookX = clamp(bl.vx / (400 * U), -1, 1);
    bl.lookY = clamp(-bl.vy / (700 * U), -1, 1);
    if (t > 0.05 && !burstFired) {
      burstFired = true;
      addCap('DANK ASS INBOUND', 2.2, W * 0.5, H * 0.12, '#ffd166', 40);
      if (summoner) addCap(`summoned by ${summoner}`, 2.4, W * 0.5, H * 0.12 + 44 * U, '#ffe9c7', 22);
      ctx.sound.sample('whoosh');
    }
  } else if (t < T_LAND_END) {
    if (!landFired) {
      landFired = true;
      bl.phase = 'land';
      bl.spin = 0;
      landFrom = { x: bl.x, y: bl.y };
      bl.vx = 0;
      bl.vy = 0;
      ctx.sound.sample('whoosh');
      ctx.sound.beep(520, 70);
    }
    const k = easeOutCubic((t - T_BOUNCE_END) / (T_LAND_END - T_BOUNCE_END));
    bl.x = lerp(landFrom.x, landAt.x, k);
    const arc = Math.sin(k * Math.PI) * 90 * U;
    bl.y = lerp(landFrom.y, landAt.y - 34 * U, k) - arc;
    bl.rot = lerp(bl.rot, k * TAU, 0.4);
    bl.sx = 1 + 0.1 * Math.sin(t * 24);
    bl.sy = 1 - 0.1 * Math.sin(t * 24);
    bl.lookX = clamp((landAt.x - bl.x) / (200 * U), -1, 1);
    bl.lookY = 1;
  } else if (t < T_WIGGLE_END) {
    bl.phase = 'wiggle';
    bl.x = landAt.x + Math.sin(t * 9.2 + bl.seed) * 9 * U;
    bl.y = landAt.y - 34 * U + Math.abs(Math.sin(t * 9.2 + bl.seed)) * 7 * U;
    bl.rot = Math.sin(t * 11.3 + bl.seed) * 0.16;
    bl.sx = 1 + Math.sin(t * 13) * 0.09;
    bl.sy = 1 - Math.sin(t * 13) * 0.09;
    bl.lookX = Math.sin(t * 3.1) * 0.9;
    bl.lookY = Math.sin(t * 2.4) * 0.5;
    if (!giggleFired && t > T_LAND_END + 0.15) {
      giggleFired = true;
      ctx.sound.sample('giggle');
      addCap('wiggle wiggle wiggle', 2.0, W * 0.5, H * 0.1, '#ffe9c7', 26);
      ctx.sound.beep(760, 40);
    }
  } else if (t < T_FART) {
    bl.phase = 'anticipate';
    const k = clamp((t - T_WIGGLE_END) / (T_FART - T_WIGGLE_END), 0, 1);
    bl.x = landAt.x;
    bl.y = landAt.y - 34 * U + k * 10 * U;
    bl.rot = Math.sin(t * 44) * 0.05 * k;
    bl.sx = 1 + k * 0.2;
    bl.sy = 1 - k * 0.16;
    bl.lookX = 0;
    bl.lookY = 0.8;
    if (!uhOhFired) {
      uhOhFired = true;
      addCapSafe('uh oh', 1.0, landAt.x, landAt.y - 210 * U, '#ff6b6b', 30);
    }
  } else if (t < T_EXIT) {
    bl.phase = 'fart';
    if (!fartFired) {
      fartFired = true;
      shake = 1;
      ctx.sound.sample('fart');
      ctx.sound.noise(150);
      ctx.sound.beep(70, 240);
      for (let i = 0; i < 16; i++) {
        const side = RND() < 0.5 ? -1 : 1;
        spawnPuff(
          landAt.x + (RND() - 0.5) * 60 * U,
          landAt.y - 10 * U + (RND() - 0.5) * 26 * U,
          side * (40 + RND() * 200) * U,
          (10 + RND() * 90) * U
        );
      }
      spawnSpark(landAt.x, landAt.y - 20 * U, 14, '#b6ff5c');
      addCap('PFFFT', 1.4, landAt.x, landAt.y - 190 * U, '#c8ff6e', 46);
    }
    const k = clamp((t - T_FART) / (T_EXIT - T_FART), 0, 1);
    bl.sx = 1.3 - k * 0.5;
    bl.sy = 0.7 + k * 0.55;
    bl.x = landAt.x + Math.sin(t * 52) * 5 * U;
    bl.y = landAt.y - 34 * U - k * 6 * U;
    bl.rot = Math.sin(t * 38) * 0.08;
  } else if (t < T_DONE) {
    bl.phase = 'exit';
    bl.vy -= 1500 * U * sdt;
    bl.y += bl.vy * sdt;
    bl.x += bl.vx * sdt;
    bl.spin += sdt * 6.5;
    bl.rot = bl.spin;
    bl.scale = clamp(0.92 * U * (1 - (t - T_EXIT) / (T_DONE - T_EXIT)), 0, 1);
    if (!doneFired) {
      doneFired = true;
      ctx.sound.sample('boing-metallic');
      ctx.sound.beep(900, 80);
      addCap('dank ass: evacuated', 1.6, landAt.x, landAt.y - 210 * U, '#ffd166', 26);
    }
  } else if (!doneCalled) {
    doneCalled = true;
    ctx.sound.beep(660, 60);
    ctx.done();
  }

  // squash recovery
  bl.sx = lerp(bl.sx, 1, sdt * 9);
  bl.sy = lerp(bl.sy, 1, sdt * 9);

  // --------------------------------------------------------------- particles
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.life += sdt;
    p.x += p.vx * sdt;
    p.y += p.vy * sdt;
    p.vx *= Math.pow(0.5, sdt);
    p.vy = lerp(p.vy, -22 * U, sdt * 1.4);
    if (p.life >= p.maxLife) puffs.splice(i, 1);
  }
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life += sdt;
    s.x += s.vx * sdt;
    s.y += s.vy * sdt;
    s.vy += 600 * U * sdt;
    if (s.life >= s.maxLife) sparks.splice(i, 1);
  }
  for (let i = caps.length - 1; i >= 0; i--) {
    const cp = caps[i];
    cp.life += sdt;
    cp.y += cp.vy * sdt;
    cp.vy *= Math.pow(0.4, sdt);
    if (cp.life >= cp.maxLife) caps.splice(i, 1);
  }
  shake = Math.max(0, shake - sdt * 2.4);

  // ------------------------------------------------------------------ render
  c.save();
  if (shake > 0) {
    c.translate(Math.sin(t * 63) * 9 * U * shake, Math.cos(t * 57) * 7 * U * shake);
  }

  // soft rim glow so the act reads over bright gameplay
  const glow = c.createRadialGradient(bl.x, bl.y, 10 * U, bl.x, bl.y, 230 * U * Math.max(0.2, bl.scale));
  glow.addColorStop(0, 'rgba(255,150,30,0.22)');
  glow.addColorStop(1, 'rgba(255,150,30,0)');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(bl.x, bl.y, 230 * U * Math.max(0.2, bl.scale), 0, TAU);
  c.fill();

  // stink clouds behind the figure
  for (const p of puffs) {
    const k = p.life / p.maxLife;
    const a = Math.sin(clamp(k, 0, 1) * Math.PI) * 0.88;
    const rr = (p.r + p.grow * easeOutCubic(clamp(p.life / 1.2, 0, 1))) * (0.8 + Math.sin(p.wob + p.life * 3) * 0.12);
    c.globalAlpha = a;
    c.fillStyle = p.color;
    c.strokeStyle = '#20500f';
    c.lineWidth = 3 * U;
    c.beginPath();
    c.arc(p.x, p.y, rr, 0, TAU);
    c.fill();
    c.stroke();
  }
  c.globalAlpha = 1;

  // speed arcs during the bounce
  if (bl.phase === 'bounce') {
    const speed = Math.hypot(bl.vx, bl.vy);
    const n = clamp(Math.floor(speed / 300), 0, 4);
    c.strokeStyle = 'rgba(255,230,170,0.6)';
    c.lineWidth = 5 * U;
    c.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const ox = -bl.vx * 0.06 * (i + 1) * 0.5;
      const oy = -bl.vy * 0.06 * (i + 1) * 0.5;
      c.globalAlpha = 0.5 - i * 0.1;
      c.beginPath();
      c.moveTo(bl.x + ox - 40 * U, bl.y + oy - 40 * U);
      c.lineTo(bl.x + ox - 14 * U, bl.y + oy - 14 * U);
      c.stroke();
    }
    c.globalAlpha = 1;
  }

  drawDank(c, bl, t);

  // sparkles
  for (const s of sparks) {
    const a = 1 - s.life / s.maxLife;
    c.globalAlpha = clamp(a, 0, 1);
    c.fillStyle = s.color;
    c.beginPath();
    c.arc(s.x, s.y, s.r * (0.6 + a * 0.8), 0, TAU);
    c.fill();
  }
  c.globalAlpha = 1;

  // captions
  for (const cp of caps) {
    const k = cp.life / cp.maxLife;
    const pop = easeOutBack(clamp(cp.life / 0.18, 0, 1));
    const a = k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1;
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.translate(cp.x, cp.y);
    c.rotate(cp.rot);
    c.scale(pop, pop);
    c.font = `900 ${Math.round(cp.size)}px "Comic Sans MS", "Trebuchet MS", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 7 * U;
    c.strokeStyle = cp.stroke;
    c.strokeText(cp.text, 0, 0);
    c.fillStyle = cp.color;
    c.fillText(cp.text, 0, 0);
    c.restore();
  }

  c.restore();
}

function addCapSafe(text, dur, x, y, color, size) {
  addCap(text, dur, clamp(x, 120 * U, W - 120 * U), clamp(y, 80 * U, H - 60 * U), color, size);
}

// --------------------------------------------------------------- the drawing
// A loving vector forgery of the supplied orange weirdo: lumpy body, huge
// googly eyes, noodle arms, and a suspicious black undercarriage.

function lumpyPath(c, w, h, seed, wob) {
  const N = 34;
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * TAU;
    const bump = 1 + 0.055 * Math.sin(a * 3 + seed) + 0.035 * Math.cos(a * 5 - seed) + wob;
    const x = Math.cos(a) * w * bump;
    const y = Math.sin(a) * h * bump;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
}

function drawDank(c, b, t) {
  const s = Math.max(0.02, b.scale);
  if (s < 0.05) return;
  const puff = b.phase === 'fart' ? Math.sin(t * 60) * 0.03 : 0;

  c.save();
  c.translate(b.x, b.y);
  c.rotate(b.rot);
  c.scale(b.sx * s, b.sy * s);

  const wob = Math.sin(t * 3 + b.seed) * 0.02 + puff;

  // ---- arms (drawn behind body). They flail, obviously.
  const flail = b.phase === 'bounce' ? 0.5 : b.phase === 'fart' ? 0.9 : 0.22;
  const armSwing = Math.sin(t * 8 + b.seed) * 18 * flail;
  c.strokeStyle = INK;
  c.lineWidth = 13;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(side * 56, -18);
    c.quadraticCurveTo(side * 108, -54 + armSwing * 0.4, side * 104, -112 + armSwing);
    c.stroke();
  }
  c.strokeStyle = ORANGE;
  c.lineWidth = 6.5;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(side * 56, -18);
    c.quadraticCurveTo(side * 108, -54 + armSwing * 0.4, side * 104, -112 + armSwing);
    c.stroke();
  }
  // little fists
  for (const side of [-1, 1]) {
    c.fillStyle = ORANGE_HI;
    c.strokeStyle = INK;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(side * 104, -116 + armSwing, 15, 0, TAU);
    c.fill();
    c.stroke();
  }

  // ---- black undercarriage / trouser hammock
  c.fillStyle = '#141414';
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.beginPath();
  c.ellipse(0, 48, 82, 42, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.fillStyle = '#2b2b2b';
  c.beginPath();
  c.ellipse(-16, 40, 44, 20, -0.2, 0, TAU);
  c.fill();

  // ---- body
  lumpyPath(c, 74, 66, b.seed, wob);
  const g = c.createRadialGradient(-24, -30, 8, 0, 0, 100);
  g.addColorStop(0, ORANGE_HI);
  g.addColorStop(0.55, ORANGE);
  g.addColorStop(1, ORANGE_LO);
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.lineJoin = 'round';
  c.stroke();

  // shading freckles / arm-holes
  c.fillStyle = 'rgba(180,70,0,0.35)';
  c.beginPath();
  c.ellipse(-62, 6, 10, 6, 0.4, 0, TAU);
  c.ellipse(62, 6, 10, 6, -0.4, 0, TAU);
  c.ellipse(0, -52, 8, 5, 0, 0, TAU);
  c.fill();

  // ---- face
  const lookX = (b.lookX || 0) * 8;
  const lookY = (b.lookY || 0) * 5;
  const squint = b.phase === 'fart' || b.phase === 'anticipate';

  for (const side of [-1, 1]) {
    const ex = side * 30;
    const ey = -18;
    c.fillStyle = '#ffffff';
    c.strokeStyle = INK;
    c.lineWidth = 6;
    if (squint) {
      // squeezed >< eyes
      c.beginPath();
      c.moveTo(ex - side * 16, ey - 12);
      c.quadraticCurveTo(ex + side * 2, ey, ex - side * 16, ey + 12);
      c.stroke();
    } else {
      c.beginPath();
      c.ellipse(ex, ey, 23, 26, 0, 0, TAU);
      c.fill();
      c.stroke();
      c.fillStyle = '#141414';
      c.beginPath();
      c.arc(ex + lookX, ey + lookY + 2, 10.5, 0, TAU);
      c.fill();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(ex + lookX - 3, ey + lookY - 2, 3.4, 0, TAU);
      c.fill();
    }
  }

  // eyebrows
  c.strokeStyle = INK;
  c.lineWidth = 7;
  c.lineCap = 'round';
  for (const side of [-1, 1]) {
    const browY = -52 + (b.phase === 'fart' ? -6 : 0);
    c.beginPath();
    c.moveTo(side * 14, browY + 2);
    c.lineTo(side * 46, browY - side * 4);
    c.stroke();
  }

  // mouth: goofy grin, or a strained little O during the toot
  c.strokeStyle = INK;
  c.lineWidth = 6;
  if (b.phase === 'fart') {
    c.fillStyle = '#5c1200';
    c.beginPath();
    c.ellipse(0, 20, 9, 13, 0, 0, TAU);
    c.fill();
    c.stroke();
  } else {
    c.fillStyle = '#5c1200';
    c.beginPath();
    c.arc(0, 12, 27, 0.12 * Math.PI, 0.88 * Math.PI);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#ff7b9c';
    c.beginPath();
    c.ellipse(0, 30, 11, 6, 0, 0, TAU);
    c.fill();
  }

  // tiny hair sprouts
  c.strokeStyle = INK;
  c.lineWidth = 5;
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.moveTo(i * 15, -66);
    c.quadraticCurveTo(i * 22, -84, i * 10 + Math.sin(t * 6 + i) * 4, -94);
    c.stroke();
  }

  c.restore();
}

export function dispose() {
  bl = null;
  puffs = [];
  sparks = [];
  caps = [];
}
