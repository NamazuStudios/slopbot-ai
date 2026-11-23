export const meta = {
  title: 'Mayo Geyser Incident',
  author: 'doctordiggitydank',
  prompt: 'when a user types !jism, make an explosion of white mayonnaise sauce erupt from the center of the bottom of the streamer\'s webcam, firing upward into a fountain spout of white sauce, splattering everywhere.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!jism"] }
  ],
};

const T_RUMBLE = 0;
const T_ERUPT = 0.95;
const T_FOUNTAIN_END = 6.15;
const T_CAPTION = 6.75;
const T_CAPTION2 = 7.35;
const T_FADE = 8.8;
const T_END = 10.5;

let S = null;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function easeOutBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
function safeLogin(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_]{1,25}$/.test(v) ? v : '';
}

export function init(ctx) {
  const rnd = ctx.rand;
  const W = ctx.width, H = ctx.height;
  const st = ctx.streamer;
  let rect;
  if (st && st.w > 0 && st.h > 0) {
    rect = {
      x: st.x * W, y: st.y * H,
      w: st.w * W, h: st.h * H,
    };
  } else {
    rect = { x: W * 0.16, y: H * 0.08, w: W * 0.68, h: H * 0.84 };
  }
  const ox = clamp(rect.x + rect.w * 0.5, W * 0.14, W * 0.86);
  const oy = clamp(rect.y + rect.h, H * 0.35, H * 1.02);

  // Words hover around the bottom half of the streamer's frame.
  const spots = [
    { x: rect.x - 0.10, y: rect.y + rect.h * 0.26, rot: -0.16 },
    { x: rect.x + rect.w + 0.02, y: rect.y + rect.h * 0.18, rot: 0.13 },
    { x: rect.x + 0.06, y: rect.y + rect.h * 0.56, rot: 0.08 },
    { x: rect.x + rect.w * 0.58, y: rect.y + rect.h * 0.82, rot: -0.10 },
    { x: rect.x - 0.04, y: rect.y + rect.h * 0.84, rot: 0.19 },
    { x: rect.x + rect.w * 0.30, y: rect.y - 0.12, rot: -0.07 },
    { x: rect.x + rect.w * 0.78, y: rect.y + rect.h * 0.48, rot: 0.22 },
  ];
  const words = [];
  const times = [1.55, 2.35, 3.1, 3.95, 4.7, 5.5, 6.3];
  for (let i = 0; i < spots.length; i++) {
    const sp = spots[i];
    const jx = (rnd() - 0.5) * W * 0.07;
    const jy = (rnd() - 0.5) * H * 0.06;
    words.push({
      x: clamp(sp.x * W + jx, W * 0.06, W * 0.94),
      y: clamp(sp.y * H + jy, H * 0.08, H * 0.94),
      rot: sp.rot + (rnd() - 0.5) * 0.12,
      size: Math.min(W, H) * (0.085 + rnd() * 0.055),
      at: times[i],
      hot: i % 3 === 1,
    });
  }

  S = {
    rect, ox, oy,
    W, H,
    words,
    particles: [],
    splats: [],
    drips: [],
    spawnAcc: 0,
    splatAcc: 0,
    shake: 0,
    erupted: false,
    ended: false,
    fired: {},
    lastNoise: -10,
    login: safeLogin(ctx.trigger && ctx.trigger.login),
  };
  return S;
}

function addParticle(s, rnd, power) {
  const a = -Math.PI * 0.5 + (rnd() - 0.5) * 0.62;
  const speed = (430 + rnd() * 940) * power;
  s.particles.push({
    x: s.ox + (rnd() - 0.5) * 34,
    y: s.oy - rnd() * 14,
    vx: Math.cos(a) * speed * (0.42 + rnd() * 0.35),
    vy: Math.sin(a) * speed,
    r: 5 + rnd() * 15,
    life: 0,
    max: 0.9 + rnd() * 1.5,
    seed: rnd() * 6.28,
  });
}

function addSplat(s, rnd, x, y, size) {
  const lobes = [];
  const n = 3 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const ang = rnd() * Math.PI * 2;
    const d = rnd() * size * 0.9;
    lobes.push({
      dx: Math.cos(ang) * d,
      dy: Math.sin(ang) * d * 0.8,
      r: size * (0.35 + rnd() * 0.55),
    });
  }
  const drips = [];
  const dn = Math.floor(rnd() * 3);
  for (let i = 0; i < dn; i++) {
    drips.push({
      dx: (rnd() - 0.5) * size * 1.2,
      w: size * (0.10 + rnd() * 0.16),
      len: size * (0.8 + rnd() * 2.2),
      delay: rnd() * 0.25,
    });
  }
  s.splats.push({ x, y, size, lobes, drips, age: 0, seed: rnd() * 10 });
  if (s.splats.length > 46) s.splats.shift();
}

function drawSplat(c, sp, alpha) {
  const k = Math.min(1, sp.age / 0.16);
  if (k <= 0) return;
  const grow = 0.5 + 0.5 * easeOutBack(k);
  const a = alpha * Math.min(1, k * 1.6);
  c.globalAlpha = a;
  for (const l of sp.lobes) {
    c.beginPath();
    c.arc(sp.x + l.dx * grow, sp.y + l.dy * grow, l.r * grow, 0, Math.PI * 2);
    c.fillStyle = '#f7f1df';
    c.fill();
  }
  c.beginPath();
  c.arc(sp.x, sp.y, sp.size * 0.9 * grow, 0, Math.PI * 2);
  c.fillStyle = '#fffdf4';
  c.fill();
  // soft rim
  c.beginPath();
  c.arc(sp.x, sp.y, sp.size * 0.9 * grow, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(205,196,170,0.55)';
  c.lineWidth = Math.max(1, sp.size * 0.045);
  c.stroke();
  // drips
  for (const d of sp.drips) {
    const dk = clamp((sp.age - d.delay) / 0.5, 0, 1);
    if (dk <= 0) continue;
    const len = d.len * dk;
    const grd = c.createLinearGradient(0, sp.y, 0, sp.y + len + 4);
    grd.addColorStop(0, 'rgba(255,253,244,0.95)');
    grd.addColorStop(1, 'rgba(247,241,223,0.75)');
    c.fillStyle = grd;
    c.beginPath();
    c.roundRect ? c.roundRect(sp.x + d.dx - d.w / 2, sp.y, d.w, len + 4, d.w * 0.6)
      : c.rect(sp.x + d.dx - d.w / 2, sp.y, d.w, len + 4);
    c.fill();
  }
  c.globalAlpha = 1;
}

function drawWord(c, w, t, alpha, W, H) {
  const k = clamp((t - w.at) / 0.24, 0, 1);
  if (k <= 0 || t > w.at + 5.4) return;
  const pop = k >= 1 ? 1 : 0.55 + 0.45 * easeOutBack(k);
  const fadeLate = t > w.at + 4.4 ? clamp(1 - (t - (w.at + 4.4)) / 1.0, 0, 1) : 1;
  const wob = Math.sin(t * 2.1 + w.rot * 10) * 0.035;
  c.save();
  c.globalAlpha = alpha * Math.min(1, k * 2) * fadeLate;
  c.translate(w.x, w.y);
  c.rotate(w.rot + wob);
  c.scale(pop, pop);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 ${Math.round(w.size)}px "Arial Black", Impact, system-ui, sans-serif`;
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, w.size * 0.09);
  c.strokeStyle = 'rgba(12,16,34,0.85)';
  c.strokeText('CUM', 0, 0);
  c.fillStyle = '#fffdf6';
  c.fillText('CUM', 0, 0);
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width, H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!S) init(ctx);
  const s = S;
  const rnd = ctx.rand;
  const step = clamp(dt || 0, 0, 0.05);
  if (t > T_END && !s.ended) {
    s.ended = true;
    ctx.done();
  }
  let fade = 1;
  if (t > T_FADE) fade = clamp(1 - (t - T_FADE) / (T_END - T_FADE), 0, 1);

  // ---- sound cues ----
  if (!s.fired.rumble && t >= T_RUMBLE + 0.05) {
    s.fired.rumble = true;
    ctx.sound.beep(92, 140);
  }
  if (!s.fired.rumble2 && t >= 0.55) {
    s.fired.rumble2 = true;
    ctx.sound.beep(118, 160);
    ctx.sound.noise(90);
  }
  if (!s.fired.erupt && t >= T_ERUPT) {
    s.fired.erupt = true;
    s.erupted = true;
    s.shake = 1;
    ctx.sound.noise(320);
    ctx.sound.beep(220, 150);
    const burst = 96;
    for (let i = 0; i < burst; i++) addParticle(s, rnd, 0.85 + rnd() * 0.5);
    addSplat(s, rnd, s.ox + (rnd() - 0.5) * 30, s.oy - 6, 26 + rnd() * 16);
  }
  if (!s.fired.cap && t >= T_CAPTION) {
    s.fired.cap = true;
    ctx.sound.beep(660, 120);
  }
  if (!s.fired.cap2 && t >= T_CAPTION2) {
    s.fired.cap2 = true;
    ctx.sound.beep(880, 90);
  }

  // ---- screen shake ----
  let sx = 0, sy = 0;
  if (t > T_ERUPT && t < T_ERUPT + 1.6) {
    const amp = (1 - (t - T_ERUPT) / 1.6) * 9;
    sx = Math.sin(t * 47.3) * amp;
    sy = Math.cos(t * 39.1) * amp * 0.7;
  }

  c.save();
  c.translate(sx, sy);

  // ---- rumble bulge before eruption ----
  if (!s.erupted) {
    const k = clamp(t / T_ERUPT, 0, 1);
    const pulse = 1 + Math.sin(t * 22) * 0.06 * k;
    const rx = 90 * (0.35 + k * 0.65) * pulse;
    const ry = 34 * (0.35 + k * 0.65) * pulse;
    c.globalAlpha = 0.5 + 0.5 * k;
    const grd = c.createRadialGradient(s.ox, s.oy, 2, s.ox, s.oy, rx);
    grd.addColorStop(0, 'rgba(255,253,244,0.95)');
    grd.addColorStop(0.65, 'rgba(250,244,226,0.55)');
    grd.addColorStop(1, 'rgba(250,244,226,0)');
    c.fillStyle = grd;
    c.beginPath();
    c.ellipse(s.ox, s.oy, rx, ry, 0, Math.PI, Math.PI * 2);
    c.fill();
    // little bubbles
    for (let i = 0; i < 7; i++) {
      const bx = s.ox + Math.sin(i * 2.3 + t * 3) * 46 * k;
      const by = s.oy - ((t * 90 + i * 23) % 60);
      c.beginPath();
      c.arc(bx, by, 3 + (i % 3) * 2, 0, Math.PI * 2);
      c.fillStyle = 'rgba(255,255,248,0.85)';
      c.fill();
    }
    c.globalAlpha = 1;
  }

  // ---- fountain spawning ----
  if (t >= T_ERUPT && t < T_FOUNTAIN_END) {
    const ramp = clamp((t - T_ERUPT) / 0.25, 1, 1);
    const taper = t > T_FOUNTAIN_END - 0.9 ? clamp((T_FOUNTAIN_END - t) / 0.9, 0, 1) : 1;
    s.spawnAcc += step * (110 + 90 * taper) * ramp;
    while (s.spawnAcc >= 1 && s.particles.length < 620) {
      s.spawnAcc -= 1;
      addParticle(s, rnd, 0.55 + taper * 0.7);
    }
    // occasional side splats while erupting
    s.splatAcc += step;
    if (s.splatAcc > 0.085 && s.splats.length < 44) {
      s.splatAcc = 0;
      const edgeBias = rnd();
      const x = edgeBias < 0.35
        ? s.ox + (rnd() - 0.5) * s.rect.w * 1.5
        : rnd() * W;
      const y = rnd() < 0.5
        ? s.rect.y + rnd() * s.rect.h * 0.35
        : rnd() * H;
      addSplat(s, rnd, clamp(x, W * 0.03, W * 0.97), clamp(y, H * 0.05, H * 0.97), 8 + rnd() * 20);
      if (t - s.lastNoise > 0.34) {
        s.lastNoise = t;
        ctx.sound.noise(50);
      }
    }
  }

  // ---- update particles ----
  const grav = 1750;
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.life += step;
    p.vy += grav * step;
    p.vx *= 1 - 0.9 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    if (p.life >= p.max || p.y > H + 60 || p.x < -80 || p.x > W + 80) {
      if (p.y > H + 10 && p.x > 0 && p.x < W && rnd() < 0.16) {
        addSplat(s, rnd, p.x, H - 10 - rnd() * 12, 5 + p.r * 0.9);
      }
      s.particles.splice(i, 1);
    }
  }

  // ---- draw splats ----
  for (const sp of s.splats) {
    sp.age += step;
    drawSplat(c, sp, fade);
  }

  // ---- draw particles ----
  for (const p of s.particles) {
    const a = fade * clamp(1 - p.life / p.max, 0, 1) * 0.96;
    if (a <= 0.01) continue;
    c.globalAlpha = a;
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fillStyle = '#fbf6e7';
    c.fill();
    c.beginPath();
    c.arc(p.x, p.y, p.r * 0.92, 0, Math.PI * 2);
    c.fillStyle = '#fffef8';
    c.fill();
    c.beginPath();
    c.arc(p.x - p.r * 0.3, p.y - p.r * 0.32, p.r * 0.26, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.fill();
  }
  c.globalAlpha = 1;

  // ---- eruption shock ring ----
  if (s.erupted && t > T_ERUPT && t < T_ERUPT + 0.9) {
    const k = (t - T_ERUPT) / 0.9;
    c.globalAlpha = fade * (1 - k) * 0.7;
    c.strokeStyle = '#fffdf2';
    c.lineWidth = 6 * (1 - k) + 1;
    c.beginPath();
    c.arc(s.ox, s.oy, 40 + k * Math.max(W, H) * 0.55, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
  }

  // ---- words ----
  for (const w of s.words) {
    drawWord(c, w, t, fade, W, H);
  }

  // ---- captions ----
  if (t > T_CAPTION) {
    const k = clamp((t - T_CAPTION) / 0.3, 0, 1);
    c.save();
    c.globalAlpha = fade * k;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const fs = Math.min(W * 0.062, H * 0.085, 54);
    c.font = `900 ${Math.round(fs)}px "Arial Black", Impact, system-ui, sans-serif`;
    const label = 'CLEANUP ON AISLE SAVORYSAILOR';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(4, fs * 0.14);
    c.strokeStyle = 'rgba(10,14,30,0.9)';
    c.strokeText(label, W * 0.5, H * 0.5);
    c.fillStyle = '#fffdf6';
    c.fillText(label, W * 0.5, H * 0.5);
    c.restore();
  }
  if (t > T_CAPTION2) {
    const k = clamp((t - T_CAPTION2) / 0.3, 0, 1);
    c.save();
    c.globalAlpha = fade * k;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const fs = Math.min(W * 0.034, H * 0.045, 26);
    c.font = `700 ${Math.round(fs)}px system-ui, sans-serif`;
    const sub = s.login ? `the webcam is a condiment now, per @${s.login}` : 'the webcam is a condiment now';
    c.lineWidth = Math.max(3, fs * 0.22);
    c.strokeStyle = 'rgba(10,14,30,0.85)';
    c.strokeText(sub, W * 0.5, H * 0.5 + Math.min(W, H) * 0.075);
    c.fillStyle = '#ffd9e8';
    c.fillText(sub, W * 0.5, H * 0.5 + Math.min(W, H) * 0.075);
    c.restore();
  }

  c.restore();
}

export function dispose(ctx) {
  if (S) {
    S.particles.length = 0;
    S.splats.length = 0;
  }
  S = null;
}
