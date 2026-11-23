export const meta = {
  title: 'Catnip Downpour',
  author: 'honeytsuki',
  prompt: 'Catnip fall from sky',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

/* ---------- tiny helpers ---------- */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(a, b, x) {
  const u = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return u * u * (3 - 2 * u);
}

const T = {
  warn: 0.2,
  rain: 1.15,
  catA: 2.9,
  catB: 4.35,
  frenzy: 5.9,
  halo: 8.3,
  end: 15.4,
};

const CAT_COLORS = [
  { body: '#3B3552', dark: '#241F36', belly: '#5E5779', nose: '#E58FA8' },
  { body: '#E79A46', dark: '#8F5320', belly: '#F7CA92', nose: '#D9788F' },
  { body: '#CBD3E0', dark: '#6C7688', belly: '#EDF1F7', nose: '#D990A6' },
  { body: '#B98BE0', dark: '#6B4694', belly: '#DCC0F4', nose: '#D67FA6' },
];

let S = null;

/* ---------- init ---------- */

export function init(ctx) {
  const W = ctx.width || 1920;
  const H = ctx.height || 1080;
  const k = clamp(Math.min(W / 1920, H / 1080), 0.6, 1.4);
  const rnd = () => ctx.rand();

  const rect = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : null;

  const floorY = rect ? clamp(rect.y + rect.h, H * 0.4, H * 0.95) : H * 0.9;

  let captionY = H * 0.15;
  if (rect && rect.y + rect.h > H * 0.06 && rect.y < H * 0.26) {
    captionY = clamp(rect.y + rect.h + 54 * k, H * 0.12, H * 0.82);
  }

  /* ---- catnip sprigs (stateless: everything derived from t) ---- */
  const sprigs = [];
  for (let i = 0; i < 132; i++) {
    let t0;
    if (i < 16) t0 = 0.35 + rnd() * 3.4;
    else if (i < 104) t0 = T.rain + Math.pow(rnd(), 0.72) * 2.7;
    else t0 = 4.2 + rnd() * 9.6;

    const depth = 0.4 + rnd() * 0.9;
    const size = (8 + rnd() * 9) * depth * k;
    const speed = (0.16 + rnd() * 0.22) * H * depth;
    const amp = (10 + rnd() * 42) * k * depth;
    const freq = 0.5 + rnd() * 1.4;
    const phase = rnd() * 6.2832;
    const y0 = -70 - rnd() * H * 0.3;
    const landY = H * (0.5 + rnd() * 0.47);
    const rot = rnd() * 6.2832;
    const spin = (rnd() - 0.5) * 4.2;

    sprigs.push({
      t0,
      size,
      speed,
      amp,
      freq,
      phase,
      x0: rnd() * W,
      y0,
      landY,
      landTime: t0 + (landY - y0) / speed,
      rot,
      spin,
    });
  }

  /* ---- cats living along the bottom of the real shot ---- */
  const catDefs = [
    { t0: T.catA, from: -1, target: 0.34, hold: 1.2, crazy: 6.2, size: 34, color: 2, phase: 0.4 },
    { t0: T.catB, from: 1, target: 0.66, hold: 0.95, crazy: 5.6, size: 32, color: 0, phase: 2.1 },
    { t0: 5.8, from: -1, target: 0.17, hold: 0.3, crazy: 4.9, size: 28, color: 1, phase: 4.0 },
    { t0: 6.15, from: 1, target: 0.85, hold: 0.35, crazy: 4.6, size: 30, color: 3, phase: 1.2 },
    { t0: 6.7, from: -1, target: 0.52, hold: 0.2, crazy: 4.1, size: 22, color: 2, phase: 3.3 },
  ];

  const cats = catDefs.map((d) => ({
    ...d,
    size: d.size * k,
    x: d.from > 0 ? -80 * k : W + 80 * k,
    y: floorY,
    yOff: 0,
    dir: d.from,
    state: 'in',
    crazyStart: 0,
    sleepStart: 0,
  }));

  /* ---- captions ---- */
  const captions = [
    { from: 0.2, to: 2.7, lines: [{ text: 'CATNIP WEATHER WARNING', size: 46 }] },
    { from: 3.1, to: 5.4, lines: [{ text: 'SAVORYSAILOR, PLEASE REMAIN CALM', size: 31 }] },
    { from: 5.9, to: 8.1, lines: [{ text: 'CATS INBOUND', size: 58, color: '#FFD9EC' }] },
    {
      from: 8.4,
      to: 12.2,
      lines: [
        { text: 'SAVORYSAILOR IS NOW A CAT TREE', size: 40 },
        { text: 'this is a great honor', size: 22, color: '#CBB6E8' },
      ],
    },
    {
      from: 12.4,
      to: 15.2,
      lines: [
        { text: 'CATNIP REDISTRIBUTION COMPLETE', size: 29, color: '#BFEFC8' },
        { text: 'the cats thank you for your service', size: 21, color: '#DCE8DD' },
      ],
    },
  ];

  /* ---- sound schedule ---- */
  const sounds = [];
  const add = (t, play) => sounds.push({ t, play });

  add(0.3, (c) => c.sound.beep(760, 90));
  add(0.58, (c) => c.sound.beep(760, 90));
  add(T.rain, (c) => c.sound.noise(900));
  add(2.9, (c) => c.sound.beep(440, 120));
  add(3.35, (c) => c.sound.beep(560, 90));
  add(4.35, (c) => c.sound.beep(500, 110));
  add(4.8, (c) => c.sound.beep(620, 90));
  add(T.frenzy, (c) => c.sound.noise(500));
  add(6.0, (c) => c.sound.beep(920, 55));
  add(6.22, (c) => c.sound.beep(1080, 55));
  add(6.5, (c) => c.sound.beep(1240, 55));
  add(6.85, (c) => c.sound.beep(960, 55));
  add(7.25, (c) => c.sound.beep(1320, 55));
  add(7.7, (c) => c.sound.beep(1120, 55));
  add(8.15, (c) => c.sound.beep(1420, 60));
  add(8.3, (c) => c.sound.noise(700));
  add(8.45, (c) => c.sound.beep(1180, 120));
  add(9.1, (c) => c.sound.beep(980, 60));
  add(9.7, (c) => c.sound.beep(1260, 60));
  add(10.3, (c) => c.sound.beep(1060, 60));
  add(11.3, (c) => c.sound.beep(120, 260));
  add(11.75, (c) => c.sound.beep(96, 300));
  add(12.25, (c) => c.sound.beep(84, 340));
  add(14.85, (c) => c.sound.beep(880, 150));
  add(15.1, (c) => c.sound.beep(1174, 200));

  for (let i = 0; i < 12; i++) {
    const tt = 1.6 + i * 0.56 + rnd() * 0.28;
    const f = 900 + rnd() * 700;
    add(tt, (c) => c.sound.beep(f, 40));
  }
  sounds.sort((a, b) => a.t - b.t);

  S = {
    W,
    H,
    k,
    rect,
    floorY,
    captionY,
    sprigs,
    cats,
    captions,
    sounds,
    si: 0,
    dust: [],
    finished: false,
  };
}

/* ---------- drawing: catnip ---------- */

function drawLeaf(g, x, y, rot) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.fillStyle = 'rgba(168,224,176,0.92)';
  g.strokeStyle = 'rgba(38,86,58,0.55)';
  g.lineWidth = 0.7;
  g.beginPath();
  g.ellipse(0, 0, 4.4, 1.9, 0, 0, 6.2832);
  g.fill();
  g.stroke();
  g.restore();
}

function drawSprig(g, x, y, rot, size, alpha) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(size / 12, size / 12);
  g.globalAlpha = alpha;
  g.lineCap = 'round';

  g.strokeStyle = 'rgba(126,190,146,0.95)';
  g.lineWidth = 1.7;
  g.beginPath();
  g.moveTo(0, 7);
  g.quadraticCurveTo(2.4, 0, 0.4, -11);
  g.stroke();

  for (let i = 0; i < 3; i++) {
    const yy = 3.6 - i * 5.4;
    const side = i % 2 === 0 ? -1 : 1;
    drawLeaf(g, side * 4.6, yy, side * 0.55 + 0.15);
    if (i < 2) drawLeaf(g, -side * 3.4, yy - 2.6, -side * 0.55 - 0.1);
  }

  const petals = [[0, -12.4], [-2.1, -10.9], [2.1, -10.9], [-1.1, -14.2], [1.1, -14.2]];
  g.fillStyle = 'rgba(206,164,246,0.95)';
  for (const p of petals) {
    g.beginPath();
    g.ellipse(p[0], p[1], 1.7, 1.5, 0, 0, 6.2832);
    g.fill();
  }
  g.fillStyle = 'rgba(255,246,190,0.95)';
  g.beginPath();
  g.ellipse(0, -12.1, 1.1, 1.1, 0, 0, 6.2832);
  g.fill();

  g.restore();
}

/* ---------- drawing: cats ---------- */

function drawCat(ctx, c, t) {
  const g = ctx.canvas;
  const s = c.size;
  const col = CAT_COLORS[c.color % CAT_COLORS.length];
  const sleeping = c.state === 'sleep';
  const crazy = c.state === 'crazy';
  const breathe = sleeping ? 1 + Math.sin(t * 2.6 + c.phase) * 0.04 : 1;
  const wobble = crazy ? 1 + Math.sin(t * 20 + c.phase) * 0.05 : 1;
  const outline = 'rgba(16,13,26,0.55)';

  g.save();
  g.translate(c.x, c.y + c.yOff);
  g.scale(c.dir >= 0 ? 1 : -1, 1);

  // ground shadow
  g.globalAlpha = 0.22;
  g.fillStyle = '#14101F';
  g.beginPath();
  g.ellipse(0, 2, s * 1.35, s * 0.17, 0, 0, 6.2832);
  g.fill();
  g.globalAlpha = 1;

  // motion ghosts
  if (crazy) {
    g.fillStyle = col.body;
    for (let i = 1; i <= 3; i++) {
      g.globalAlpha = 0.14 / i;
      g.beginPath();
      g.ellipse(-i * 17 * s / 32, -s * 0.72, s * 1.2, s * 0.55, 0, 0, 6.2832);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  // tail
  g.strokeStyle = col.body;
  g.lineWidth = s * 0.29;
  g.lineCap = 'round';
  const tw = crazy ? Math.sin(t * 15 + c.phase) * s * 0.45 : Math.sin(t * 2 + c.phase) * s * 0.18;
  g.beginPath();
  g.moveTo(-s * 1.05, -s * 0.66);
  g.quadraticCurveTo(-s * 1.95, -s * 0.95, -s * 1.55, -s * 1.5 - tw);
  g.stroke();

  // feet
  g.fillStyle = col.dark;
  g.beginPath();
  g.ellipse(-s * 0.66, -s * 0.16, s * 0.28, s * 0.17, 0, 0, 6.2832);
  g.fill();
  g.beginPath();
  g.ellipse(s * 0.64, -s * 0.16, s * 0.28, s * 0.17, 0, 0, 6.2832);
  g.fill();

  // body
  g.fillStyle = col.body;
  g.beginPath();
  g.ellipse(0, -s * 0.72, s * 1.25 * wobble, s * 0.62 * breathe, 0, 0, 6.2832);
  g.fill();
  g.strokeStyle = outline;
  g.lineWidth = s * 0.06;
  g.stroke();

  // belly
  g.fillStyle = col.belly;
  g.beginPath();
  g.ellipse(s * 0.12, -s * 0.56, s * 0.78, s * 0.3, 0, 0, 6.2832);
  g.fill();

  // ears
  g.fillStyle = col.body;
  g.strokeStyle = outline;
  g.lineWidth = s * 0.055;
  g.beginPath();
  g.moveTo(s * 0.6, -s * 1.72);
  g.lineTo(s * 0.7, -s * 2.18);
  g.lineTo(s * 0.98, -s * 1.84);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(s * 1.14, -s * 1.9);
  g.lineTo(s * 1.44, -s * 2.1);
  g.lineTo(s * 1.5, -s * 1.6);
  g.closePath();
  g.fill();
  g.stroke();

  // head
  g.fillStyle = col.body;
  g.beginPath();
  g.ellipse(s * 1.06, -s * 1.27, s * 0.58, s * 0.53, 0, 0, 6.2832);
  g.fill();
  g.stroke();

  // muzzle
  g.fillStyle = col.belly;
  g.beginPath();
  g.ellipse(s * 1.24, -s * 1.06, s * 0.24, s * 0.18, 0, 0, 6.2832);
  g.fill();

  // nose
  g.fillStyle = col.nose;
  g.beginPath();
  g.moveTo(s * 1.2, -s * 1.1);
  g.lineTo(s * 1.31, -s * 1.1);
  g.lineTo(s * 1.255, -s * 1.03);
  g.closePath();
  g.fill();

  // eyes
  const eyeA = { x: s * 0.92, y: -s * 1.33 };
  const eyeB = { x: s * 1.3, y: -s * 1.35 };
  if (sleeping) {
    g.strokeStyle = 'rgba(20,16,30,0.85)';
    g.lineWidth = s * 0.05;
    for (const e of [eyeA, eyeB]) {
      g.beginPath();
      g.arc(e.x, e.y, s * 0.11, 0.15 * Math.PI, 0.85 * Math.PI);
      g.stroke();
    }
  } else {
    const big = crazy;
    const jitter = crazy ? Math.sin(t * 23 + c.phase) * s * 0.02 : 0;
    for (const e of [eyeA, eyeB]) {
      g.fillStyle = '#F7F4EA';
      g.beginPath();
      g.ellipse(e.x + jitter, e.y, s * (big ? 0.2 : 0.13), s * (big ? 0.21 : 0.15), 0, 0, 6.2832);
      g.fill();
      g.strokeStyle = outline;
      g.lineWidth = s * 0.035;
      g.stroke();
      g.fillStyle = '#171320';
      g.beginPath();
      if (big) {
        g.ellipse(e.x + jitter, e.y - s * 0.02, s * 0.055, s * 0.06, 0, 0, 6.2832);
      } else {
        g.ellipse(e.x, e.y, s * 0.035, s * 0.1, 0, 0, 6.2832);
      }
      g.fill();
      if (big) {
        g.fillStyle = 'rgba(255,255,255,0.9)';
        g.beginPath();
        g.ellipse(e.x + jitter - s * 0.05, e.y - s * 0.06, s * 0.025, s * 0.025, 0, 0, 6.2832);
        g.fill();
      }
    }
  }

  // whiskers
  g.strokeStyle = 'rgba(240,240,240,0.55)';
  g.lineWidth = s * 0.022;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.moveTo(s * 1.32, -s * 1.08 + i * s * 0.06);
    g.lineTo(s * 1.75, -s * 1.18 + i * s * 0.1);
    g.stroke();
  }

  // stolen catnip in mouth
  if (crazy) {
    drawSprig(g, s * 1.5, -s * 0.95, 0.85, s * 0.55, 0.95);
  }

  g.restore();
}

/* ---------- drawing: crown of catnip ---------- */

function drawCrown(ctx, t, a) {
  if (a <= 0.001) return;
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const k = S.k;
  const r = S.rect;
  const cx = r ? r.x + r.w / 2 : W / 2;
  const topY = r ? r.y : H * 0.2;
  const cy = Math.max(52 * k, topY - 8 * k);
  const rx = Math.min(r ? r.w * 0.5 : W * 0.42, W * 0.44) * 0.52;
  const ry = Math.max(13 * k, rx * 0.15);

  g.save();
  g.globalAlpha = a;

  const glow = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, 62 * k));
  glow.addColorStop(0, 'rgba(196,255,208,0.2)');
  glow.addColorStop(1, 'rgba(196,255,208,0)');
  g.fillStyle = glow;
  g.beginPath();
  g.ellipse(cx, cy, Math.max(rx * 1.2, 70 * k), Math.max(rx * 1.2, 70 * k) * 0.7, 0, 0, 6.2832);
  g.fill();

  g.strokeStyle = 'rgba(255,236,170,0.45)';
  g.lineWidth = Math.max(2, 3 * k);
  const rot = t * 0.32;
  for (let i = 0; i < 16; i++) {
    const ang = rot + (i / 16) * 6.2832;
    const r0 = rx * 1.05;
    const r1 = rx * (1.2 + 0.14 * Math.sin(t * 2 + i));
    g.beginPath();
    g.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0 * 0.42);
    g.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1 * 0.42);
    g.stroke();
  }

  g.globalAlpha = 1;
  for (let i = 0; i < 11; i++) {
    const u = i / 10;
    const ang = Math.PI + u * Math.PI;
    const px = cx + Math.cos(ang) * rx;
    const py = cy + Math.sin(ang) * ry;
    const tilt = ang + Math.PI / 2 + Math.sin(t * 1.5 + i) * 0.12;
    drawSprig(g, px, py, tilt, 13 * k, 0.9 * a);
  }

  g.restore();
}

/* ---------- drawing: captions ---------- */

function drawCaption(ctx, t, cap, y) {
  if (t < cap.from || t > cap.to) return;
  const g = ctx.canvas;
  const W = ctx.width;
  const k = S.k;
  const a = Math.min(smooth(cap.from, cap.from + 0.22, t), 1 - smooth(cap.to - 0.32, cap.to, t));
  if (a <= 0.002) return;
  const pop = 1 + 0.07 * Math.exp(-Math.max(0, t - cap.from) * 7);

  g.save();
  g.globalAlpha = a;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';

  let offset = 0;
  const total = cap.lines.reduce((h, l) => h + l.size * k * 1.24, 0);
  offset = -total / 2;

  for (const line of cap.lines) {
    const fs = line.size * k * pop;
    offset += (line.size * k * 1.24) / 2;
    g.font = `800 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
    g.lineWidth = Math.max(4, fs * 0.2);
    g.strokeStyle = 'rgba(14,11,24,0.82)';
    g.strokeText(line.text, W / 2, y + offset);
    g.fillStyle = line.color || '#FFFFFF';
    g.fillText(line.text, W / 2, y + offset);
    offset += (line.size * k * 1.24) / 2;
  }

  g.restore();
}

/* ---------- frame ---------- */

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);
  if (!S) init(ctx);

  const step = clamp(dt || 0, 0, 0.06);
  const k = S.k;

  // scheduled sounds
  while (S.si < S.sounds.length && t >= S.sounds[S.si].t) {
    const snd = S.sounds[S.si++];
    if (t - snd.t < 0.4) {
      try { snd.play(ctx); } catch (e) { /* host owns the mix */ }
    }
  }

  // halo fade
  const haloA = smooth(T.halo, T.halo + 0.9, t);

  drawCrown(ctx, t, haloA * 0.9);

  // --- catnip sprigs ---
  for (const sp of S.sprigs) {
    if (t < sp.t0) continue;
    if (t < sp.landTime) {
      const age = t - sp.t0;
      const x = sp.x0 + Math.sin(t * sp.freq + sp.phase) * sp.amp;
      const y = sp.y0 + sp.speed * age;
      const rot = sp.rot + sp.spin * age;
      drawSprig(g, x, y, rot, sp.size, 0.92);
    } else {
      const xL = sp.x0 + Math.sin(sp.landTime * sp.freq + sp.phase) * sp.amp;
      const rotL = sp.rot + sp.spin * (sp.landTime - sp.t0);
      drawSprig(g, xL, sp.landY, rotL + Math.PI * 0.5, sp.size * 0.9, 0.8);
    }
  }

  // --- kicked-up leaflets ---
  for (let i = S.dust.length - 1; i >= 0; i--) {
    const p = S.dust[i];
    p.life -= step;
    if (p.life <= 0) {
      S.dust.splice(i, 1);
      continue;
    }
    p.vy += 1200 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.rot += p.spin * step;
    const a = clamp(p.life / p.max, 0, 1) * 0.85;
    drawSprig(g, p.x, p.y, p.rot, p.size, a);
  }

  // --- cats ---
  for (const c of S.cats) {
    if (t < c.t0) continue;

    if (c.state === 'in') {
      const targetX = c.target * W;
      c.x += c.dir * W * 0.19 * step;
      if ((c.dir > 0 && c.x >= targetX) || (c.dir < 0 && c.x <= targetX)) {
        c.x = targetX;
        c.state = 'sniff';
        c.sniffStart = t;
      }
    } else if (c.state === 'sniff') {
      c.yOff = -Math.abs(Math.sin((t - c.sniffStart) * 3.4)) * c.size * 0.1;
      if (t - c.sniffStart > c.hold) {
        c.state = 'crazy';
        c.crazyStart = t;
        c.dir = ctx.rand() < 0.5 ? -1 : 1;
      }
    } else if (c.state === 'crazy') {
      c.x += c.dir * W * 0.52 * step;
      const lo = W * 0.06;
      const hi = W * 0.94;
      if (c.x < lo) { c.x = lo; c.dir = 1; }
      if (c.x > hi) { c.x = hi; c.dir = -1; }
      c.yOff = -Math.abs(Math.sin((t - c.crazyStart) * 9.5 + c.phase)) * c.size * 0.85;

      if (S.dust.length < 130 && ctx.rand() < step * 9) {
        S.dust.push({
          x: c.x + (ctx.rand() - 0.5) * c.size,
          y: c.y - c.size * 0.1,
          vx: (ctx.rand() - 0.5) * 220,
          vy: -120 - ctx.rand() * 220,
          rot: ctx.rand() * 6.2832,
          spin: (ctx.rand() - 0.5) * 10,
          life: 0.6 + ctx.rand() * 0.5,
          max: 1.1,
          size: (6 + ctx.rand() * 6) * k,
        });
      }

      if (t - c.crazyStart > c.crazy) {
        c.state = 'sleep';
        c.sleepStart = t;
      }
    } else if (c.state === 'sleep') {
      c.yOff += (0 - c.yOff) * Math.min(1, step * 10);
      if (c.yOff > -1) c.yOff = 0;
    }

    drawCat(ctx, c, t);
  }

  // --- captions ---
  for (const cap of S.captions) drawCaption(ctx, t, cap, S.captionY);

  // --- the end ---
  if (t >= T.end && !S.finished) {
    S.finished = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
