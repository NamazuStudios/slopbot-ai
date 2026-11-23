export const meta = {
  title: 'Sunglass Seagull Squad',
  author: 'morbeir',
  prompt: 'Have a flock of seagulls fly towards the streamer and pick at him. Those seagulls are wearing sunglasses because they\u2019re cool like that.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const GULL_COUNT = 7;
const DONE_TIME = 15.9;

let state = null;

/* ---------- small helpers ---------- */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }
function easeOutCubic(u) { const k = 1 - u; return 1 - k * k * k; }
function easeInOut(u) { return u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2; }
function easeInQuad(u) { return u * u; }

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

function targetNorm(ctx) {
  const s = ctx.streamer;
  if (s) return { x: s.x, y: s.y, w: s.w, h: s.h };
  return { x: 0.29, y: 0.17, w: 0.42, h: 0.66 };
}

/* ---------- bird art ---------- */

function wingPath(c) {
  c.beginPath();
  c.moveTo(0.14, -0.02);
  c.bezierCurveTo(0.02, -0.30, -0.10, -0.62, -0.30, -0.74);
  c.bezierCurveTo(-0.50, -0.58, -0.40, -0.26, -0.14, -0.05);
  c.closePath();
}

function wingTip(c, dark) {
  c.beginPath();
  c.ellipse(-0.33, -0.66, 0.105, 0.13, 0.55, 0, Math.PI * 2);
  c.fillStyle = dark ? '#2f3742' : '#39424e';
  c.fill();
}

function shades(c, lx, ly, w, h, gold, glint) {
  const fill = '#0e141c';
  const frame = gold ? '#e9c76b' : '#0e141c';
  for (const side of [-1, 1]) {
    const cy = ly * side;
    roundRectPath(c, lx - w / 2, cy - h / 2, w, h, 0.045);
    c.fillStyle = fill;
    c.fill();
    c.lineWidth = 0.022;
    c.strokeStyle = frame;
    c.stroke();
    // lens sheen
    c.strokeStyle = 'rgba(190,225,255,0.5)';
    c.lineWidth = 0.02;
    c.beginPath();
    c.moveTo(lx - 0.045, cy + 0.035);
    c.lineTo(lx + 0.015, cy - 0.022);
    c.stroke();
  }
  // bridge
  c.fillStyle = frame;
  c.fillRect(lx - 0.035, -0.018, 0.07, 0.036);
  // temples
  c.strokeStyle = frame;
  c.lineWidth = 0.024;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(lx - w / 2, ly * side);
    c.lineTo(lx - w / 2 - 0.10, ly * side + 0.05 * side);
    c.stroke();
  }
  if (glint > 0.02) {
    const gx = lx + 0.03;
    const gy = ly * -1;
    const r = 0.11 * glint;
    c.fillStyle = 'rgba(255,255,255,' + clamp(glint, 0, 1) + ')';
    c.beginPath();
    c.moveTo(gx, gy - r);
    c.quadraticCurveTo(gx + r * 0.15, gy - r * 0.15, gx + r, gy);
    c.quadraticCurveTo(gx + r * 0.15, gy + r * 0.15, gx, gy + r);
    c.quadraticCurveTo(gx - r * 0.15, gy + r * 0.15, gx - r, gy);
    c.quadraticCurveTo(gx - r * 0.15, gy - r * 0.15, gx, gy - r);
    c.fill();
  }
}

function drawGull(c, x, y, s, heading, flap, alpha, gold, glint) {
  c.save();
  c.translate(x, y);
  c.rotate(heading);
  c.scale(s, s);
  c.globalAlpha = alpha;
  c.lineJoin = 'round';

  const ang = flap * 0.8;

  // far wing (underside, darker)
  c.save();
  c.translate(0.02, 0);
  c.scale(1, -1);
  c.rotate(ang);
  wingPath(c);
  c.fillStyle = '#d5e0ec';
  c.fill();
  c.strokeStyle = '#a8b9cb';
  c.lineWidth = 0.018;
  c.stroke();
  wingTip(c, false);
  c.restore();

  // near wing
  c.save();
  c.translate(0.02, 0);
  c.rotate(-ang);
  wingPath(c);
  c.fillStyle = '#f0f6fc';
  c.fill();
  c.strokeStyle = '#a8b9cb';
  c.lineWidth = 0.018;
  c.stroke();
  wingTip(c, true);
  c.restore();

  // tail
  c.beginPath();
  c.moveTo(-0.36, 0);
  c.lineTo(-0.62, -0.12);
  c.lineTo(-0.56, 0);
  c.lineTo(-0.62, 0.12);
  c.closePath();
  c.fillStyle = '#e8f0f8';
  c.fill();
  c.strokeStyle = '#bccadb';
  c.lineWidth = 0.016;
  c.stroke();

  // body
  c.beginPath();
  c.ellipse(0, 0, 0.42, 0.19, 0, 0, Math.PI * 2);
  c.fillStyle = '#fbfdff';
  c.fill();
  c.strokeStyle = '#c3cfdd';
  c.lineWidth = 0.02;
  c.stroke();

  c.beginPath();
  c.ellipse(-0.03, 0.055, 0.28, 0.09, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(221,232,244,0.85)';
  c.fill();

  // head
  c.beginPath();
  c.arc(0.40, 0, 0.17, 0, Math.PI * 2);
  c.fillStyle = '#ffffff';
  c.fill();
  c.strokeStyle = '#c3cfdd';
  c.lineWidth = 0.02;
  c.stroke();

  // beak
  c.beginPath();
  c.moveTo(0.53, -0.05);
  c.lineTo(0.80, 0.005);
  c.lineTo(0.53, 0.06);
  c.closePath();
  c.fillStyle = '#f3a63f';
  c.fill();
  c.strokeStyle = '#bf7c22';
  c.lineWidth = 0.014;
  c.stroke();

  // the whole point of the bit
  shades(c, 0.455, 0.085, 0.20, 0.11, gold, glint);

  c.restore();
}

function drawLooseShades(c, x, y, rot, s, alpha, gold) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(s, s);
  c.globalAlpha = alpha;
  shades(c, 0.0, 0.115, 0.30, 0.15, gold, 0.9);
  c.restore();
}

/* ---------- init ---------- */

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const min = Math.min(W, H);
  const rnd = ctx.rand;
  const tn = targetNorm(ctx);

  const st = {
    gulls: [],
    impacts: [],
    feathers: [],
    fired: {},
    startle: 0,
    done: false,
  };
  state = st;

  const ccx = tn.x + tn.w / 2;
  const ccy = tn.y + tn.h / 2;
  const rx = tn.w * 0.85 + 0.07;
  const ry = tn.h * 0.60 + 0.09;

  const order = [0, 3, 1, 5, 2, 6, 4, 1, 4, 0, 6, 3, 5, 2, 0, 6];

  for (let i = 0; i < GULL_COUNT; i++) {
    const a = Math.PI * (0.92 - (i / (GULL_COUNT - 1)) * 0.84);
    const slot = {
      x: clamp(ccx + Math.cos(a) * rx, 0.06, 0.94),
      y: clamp(ccy - Math.sin(a) * ry, 0.06, 0.86),
    };
    const entry = {
      x: i % 2 === 0 ? -0.10 : 1.10,
      y: 0.10 + 0.14 * (i % 5),
    };
    st.gulls.push({
      slot,
      entry,
      exit: {
        x: slot.x + (slot.x - 0.5) * 1.3,
        y: slot.y - 0.65,
      },
      arrive: 1.55 + i * 0.235,
      exitAt: i === 0 ? 13.30 : 12.85 + i * 0.12,
      ph: rnd() * Math.PI * 2,
      orbitX: 0.007 + rnd() * 0.006,
      orbitY: 0.006 + rnd() * 0.005,
      gold: i === 0,
      sizeMul: i === 0 ? 1.14 : 0.86 + rnd() * 0.22,
      heading: 0,
      dives: [],
      perch: i === 0 ? { start: 11.30, end: 13.30 } : null,
    });
  }

  // peck schedule, handed to gulls in a fixed shuffle
  const peckTimes = [];
  for (let i = 0; i < 14; i++) peckTimes.push(4.15 + i * 0.47);
  peckTimes.push(10.95, 11.30);

  for (let k = 0; k < peckTimes.length; k++) {
    const gi = order[k % order.length];
    const px = tn.x + (0.22 + rnd() * 0.56) * tn.w;
    const py = tn.y + (0.12 + rnd() * 0.46) * tn.h;
    st.gulls[gi].dives.push({
      start: peckTimes[k],
      dur: 1.12,
      point: { x: px, y: py },
      hit: false,
      text: ['PECK', 'BONK', 'OOF', 'BIP', 'TOINK', 'NOM'][k % 6],
    });
  }

  st.captions = [
    { t0: 2.75, t1: 4.45, main: 'FLOCK INBOUND.', sub: 'seven gulls. seven pairs of sunglasses. no permits.' },
    { t0: 4.75, t1: 6.85, main: 'they have chosen a target.', sub: 'and unfortunately it is the person already in frame' },
    { t0: 7.45, t1: 9.90, main: 'BEAK-BASED PEER REVIEW', sub: 'feedback is being delivered at four hundred pecks per minute' },
    { t0: 11.55, t1: 13.20, main: 'the leader would like a word.', sub: 'he is wearing the gold frames. he is in charge.' },
    { t0: 13.65, t1: 15.55, main: 'THEY CAME. THEY PECKED. THEY LEFT.', sub: 'coolest thing to happen on this stream all day' },
  ];

  st.looseShades = { from: 14.05, to: 14.85 };
  st.min = min;
}

/* ---------- motion ---------- */

function hoverAt(g, t, W, H) {
  const ox = Math.cos(t * 1.25 + g.ph) * g.orbitX;
  const oy = Math.sin(t * 1.7 + g.ph) * g.orbitY;
  return { x: (g.slot.x + ox) * W, y: (g.slot.y + oy) * H };
}

function posAt(g, t, W, H, tnPx) {
  const hover = hoverAt(g, t, W, H);

  // perch on the shoulder of the live shot
  if (g.perch && t >= g.perch.start && t < g.perch.end) {
    return {
      x: (tnPx.x + tnPx.w * 0.74) * 1,
      y: tnPx.y + tnPx.h * 0.10 + Math.sin(t * 3) * 3,
      mode: 'perch',
      u: 0,
      alpha: 1,
      scaleMul: 0.94,
    };
  }

  // departure
  if (t >= g.exitAt) {
    const u = clamp((t - g.exitAt) / 1.4, 0, 1);
    const hs = hoverAt(g, g.exitAt, W, H);
    const k = Math.pow(u, 1.4);
    return {
      x: lerp(hs.x, g.exit.x * W, k),
      y: lerp(hs.y, g.exit.y * H, k),
      mode: 'exit',
      u,
      alpha: 1 - u * 0.95,
      scaleMul: 1 - 0.4 * u,
    };
  }

  // dive
  for (let i = 0; i < g.dives.length; i++) {
    const d = g.dives[i];
    if (t >= d.start && t < d.start + d.dur) {
      const u = (t - d.start) / d.dur;
      const hs = hoverAt(g, d.start, W, H);
      const pp = { x: d.point.x * W, y: d.point.y * H };
      if (u < 0.40) {
        const k = easeInOut(u / 0.40);
        return {
          x: lerp(hs.x, pp.x, k),
          y: lerp(hs.y, pp.y, k) - Math.sin(Math.PI * k) * H * 0.035,
          mode: 'dive',
          u,
          alpha: 1,
          scaleMul: 1 + 0.10 * k,
        };
      }
      if (u < 0.62) {
        const j = Math.sin(((u - 0.40) / 0.22) * Math.PI * 2) * 9;
        const dx = pp.x - hs.x;
        const dy = pp.y - hs.y;
        const dl = Math.hypot(dx, dy) || 1;
        return {
          x: pp.x + (dx / dl) * j,
          y: pp.y + (dy / dl) * j,
          mode: 'peck',
          u,
          alpha: 1,
          scaleMul: 1.10,
        };
      }
      const k = easeInOut((u - 0.62) / 0.38);
      return {
        x: lerp(pp.x, hs.x, k),
        y: lerp(pp.y, hs.y, k) - Math.sin(Math.PI * k) * H * 0.02,
        mode: 'dive',
        u,
        alpha: 1,
        scaleMul: 1.10 - 0.10 * k,
      };
    }
  }

  // arrival
  if (t < g.arrive) {
    const u = clamp(t / g.arrive, 0, 1);
    const e = easeOutCubic(u);
    return {
      x: lerp(g.entry.x * W, hover.x, e),
      y: lerp(g.entry.y * H, hover.y, e) - Math.sin(Math.PI * u) * H * 0.05,
      mode: 'approach',
      u,
      alpha: 1,
      scaleMul: 0.55 + 0.45 * e,
    };
  }

  return { x: hover.x, y: hover.y, mode: 'hover', u: 0, alpha: 1, scaleMul: 1 };
}

/* ---------- effects ---------- */

function spawnImpact(ctx, x, y, text) {
  state.impacts.push({ x, y, age: 0, life: 0.55, text });
  for (let i = 0; i < 4; i++) {
    const a = ctx.rand() * Math.PI * 2;
    const sp = 40 + ctx.rand() * 120;
    state.feathers.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      rot: ctx.rand() * Math.PI,
      vr: (ctx.rand() - 0.5) * 9,
      size: 4 + ctx.rand() * 6,
      age: 0,
      life: 0.9 + ctx.rand() * 0.8,
    });
  }
}

function drawImpact(c, im, accent) {
  const u = clamp(im.age / im.life, 0, 1);
  const a = 1 - u;
  const px = im.x;
  const py = im.y;
  const rad = 6 + u * 42;

  c.save();
  c.globalAlpha = a * 0.9;
  c.strokeStyle = accent;
  c.lineWidth = 3.5 * (1 - u * 0.6);
  c.beginPath();
  c.arc(px, py, rad, 0, Math.PI * 2);
  c.stroke();

  // spikes
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 2.2 * (1 - u);
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.3;
    const r0 = rad * 0.72;
    const r1 = rad * 1.22;
    c.beginPath();
    c.moveTo(px + Math.cos(ang) * r0, py + Math.sin(ang) * r0);
    c.lineTo(px + Math.cos(ang) * r1, py + Math.sin(ang) * r1);
    c.stroke();
  }

  // pop text
  const fs = 20 + 4 * (1 - u);
  c.globalAlpha = a;
  c.font = '900 ' + fs.toFixed(1) + 'px "Segoe UI", "Trebuchet MS", Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 5;
  c.strokeStyle = 'rgba(9,13,22,0.9)';
  c.strokeText(im.text, px, py - 8 - u * 34);
  c.fillStyle = '#ffffff';
  c.fillText(im.text, px, py - 8 - u * 34);
  c.restore();
}

function drawFeather(c, f) {
  const u = clamp(f.age / f.life, 0, 1);
  const a = 1 - u;
  c.save();
  c.translate(f.x, f.y);
  c.rotate(f.rot);
  c.globalAlpha = a;
  c.beginPath();
  c.ellipse(0, 0, f.size * 1.5, f.size * 0.55, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(248,252,255,0.92)';
  c.fill();
  c.strokeStyle = 'rgba(190,205,220,0.9)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-f.size * 1.4, 0);
  c.lineTo(f.size * 1.4, 0);
  c.stroke();
  c.restore();
}

function drawCaption(c, W, H, min, cap, alpha, accent, y) {
  const fs = clamp(min * 0.042, 17, 52);
  const ss = fs * 0.52;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '900 ' + fs.toFixed(1) + 'px "Segoe UI", "Trebuchet MS", Arial, sans-serif';
  const w1 = c.measureText(cap.main).width;
  c.font = '600 ' + ss.toFixed(1) + 'px "Segoe UI", "Trebuchet MS", Arial, sans-serif';
  const w2 = c.measureText(cap.sub).width;
  const padX = fs * 0.7;
  const panelW = Math.min(W * 0.94, Math.max(w1, w2) + padX * 2);
  const panelH = fs + ss + fs * 1.15;
  const px = W / 2 - panelW / 2;
  const py = y - panelH / 2;

  c.globalAlpha = alpha * 0.72;
  roundRectPath(c, px, py, panelW, panelH, fs * 0.35);
  c.fillStyle = 'rgba(8,13,24,0.78)';
  c.fill();
  c.globalAlpha = alpha;
  c.strokeStyle = accent;
  c.lineWidth = 2;
  c.stroke();

  c.font = '900 ' + fs.toFixed(1) + 'px "Segoe UI", "Trebuchet MS", Arial, sans-serif';
  c.lineWidth = Math.max(3, fs * 0.14);
  c.strokeStyle = 'rgba(6,10,18,0.9)';
  c.strokeText(cap.main, W / 2, py + fs * 0.8);
  c.fillStyle = '#ffffff';
  c.fillText(cap.main, W / 2, py + fs * 0.8);

  c.font = '600 ' + ss.toFixed(1) + 'px "Segoe UI", "Trebuchet MS", Arial, sans-serif';
  c.lineWidth = Math.max(2, ss * 0.16);
  c.strokeStyle = 'rgba(6,10,18,0.9)';
  c.strokeText(cap.sub, W / 2, py + fs * 1.15 + ss * 0.9);
  c.fillStyle = 'rgba(226,236,248,0.95)';
  c.fillText(cap.sub, W / 2, py + fs * 1.15 + ss * 0.9);
  c.restore();
}

/* ---------- frame ---------- */

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const min = Math.min(W, H);
  const accent = ctx.accent || '#ff6fb5';

  c.clearRect(0, 0, W, H);
  if (!state) return;
  const st = state;
  const step = clamp(dt, 0, 0.05);

  const tn = targetNorm(ctx);
  const tnPx = { x: tn.x * W, y: tn.y * H, w: tn.w * W, h: tn.h * H };

  const once = (key, fn) => {
    if (!st.fired[key]) { st.fired[key] = 1; fn(); }
  };

  // entrance noises
  once('w0', () => ctx.sound.noise(200));
  if (t > 0.9) once('w1', () => ctx.sound.noise(180));
  if (t > 1.6) once('w2', () => ctx.sound.noise(220));
  if (t > 2.7) once('honk', () => { ctx.sound.beep(760, 90); ctx.sound.beep(520, 120); });

  // pecks
  for (const g of st.gulls) {
    for (const d of g.dives) {
      const peckT = d.start + d.dur * 0.5;
      if (t >= peckT && !d.hit) {
        d.hit = true;
        spawnImpact(ctx, d.point.x * W, d.point.y * H, d.text);
        ctx.sound.beep(480 + ((d.start * 97) % 260), 55);
        st.startle = 1;
      }
    }
  }

  if (st.startle > 0) st.startle = Math.max(0, st.startle - step * 4);

  // update particles
  for (let i = st.feathers.length - 1; i >= 0; i--) {
    const f = st.feathers[i];
    f.age += step;
    if (f.age >= f.life) { st.feathers.splice(i, 1); continue; }
    f.vy += 130 * step;
    f.vx *= 1 - 1.6 * step;
    f.x += f.vx * step;
    f.y += f.vy * step;
    f.rot += f.vr * step;
  }
  for (let i = st.impacts.length - 1; i >= 0; i--) {
    const im = st.impacts[i];
    im.age += step;
    if (im.age >= im.life) st.impacts.splice(i, 1);
  }

  // perches / sparkles
  if (t > 11.35 && t < 13.25) once('sparkle', () => { ctx.sound.beep(1250, 130); ctx.sound.beep(1700, 90); });
  if (t > 14.2) once('finalwhoosh', () => ctx.sound.noise(320));
  if (t > 15.15) once('ding', () => { ctx.sound.beep(900, 90); ctx.sound.beep(1350, 160); });

  // feathers + impacts under the birds
  for (const f of st.feathers) drawFeather(c, f);
  for (const im of st.impacts) drawImpact(c, im, accent);

  // gulls
  const glintPulse = 0.5 + 0.5 * Math.sin(t * 2.1);

  for (const g of st.gulls) {
    const p = posAt(g, t, W, H, tnPx);
    if (p.alpha <= 0.02) continue;

    const p2 = posAt(g, t + 0.06, W, H, tnPx);
    let heading = g.heading;
    const dx = p2.x - p.x;
    const dy = p2.y - p.y;
    if (Math.hypot(dx, dy) > 0.6) {
      const targetH = Math.atan2(dy, dx);
      let diff = targetH - g.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      heading = g.heading + diff * 0.45;
      g.heading = heading;
    }

    let flap;
    if (p.mode === 'approach') flap = Math.sin(t * 19 + g.ph) * 0.95;
    else if (p.mode === 'perch') flap = Math.sin(t * 3 + g.ph) * 0.18;
    else if (p.mode === 'exit') flap = Math.sin(t * 21 + g.ph) * 0.95;
    else flap = Math.sin(t * 6.5 + g.ph) * 0.55;

    let glint = 0;
    if (p.mode === 'perch') glint = 0.55 + 0.45 * Math.sin(t * 5);
    else if (p.mode === 'dive' || p.mode === 'peck') glint = Math.max(0, Math.sin(p.u * Math.PI * 3)) * 0.8;
    else glint = glintPulse * 0.35;

    const baseS = min * 0.075 * g.sizeMul * p.scaleMul;
    drawGull(c, p.x, p.y, baseS, heading, flap, p.alpha, g.gold, glint);
  }

  // the leader's leftover gift
  const ls = st.looseShades;
  if (t >= ls.from && t < ls.to + 0.9) {
    const u = clamp((t - ls.from) / (ls.to - ls.from), 0, 1);
    const sx = (tn.x + tn.w * 0.22) * W;
    const sy = lerp(-0.06 * H, (tn.y + tn.h * 0.30) * H, easeInCubicLocal(u));
    const rot = Math.sin(u * Math.PI * 3) * 0.35 * (1 - u) + 0.12;
    const alpha = t > ls.to ? clamp(1 - (t - ls.to) / 0.9, 0, 1) : 1;
    const scale = min * 0.18 * (1 - u * 0.22);
    drawLooseShades(c, sx, sy, rot, scale, alpha, true);
  }

  // captions
  const captionY = tn.y > 0.32 ? H * 0.12 : H * 0.855;
  for (const cap of st.captions) {
    if (t < cap.t0 || t > cap.t1) continue;
    const fin = clamp((t - cap.t0) / 0.2, 0, 1);
    const fout = clamp((cap.t1 - t) / 0.25, 0, 1);
    const a = Math.min(fin, fout);
    if (a <= 0.01) continue;
    drawCaption(c, W, H, min, cap, a, accent, captionY);
  }

  if (!st.done && t >= DONE_TIME) {
    st.done = true;
    ctx.done();
  }
}

function easeInCubicLocal(u) { return u * u * u; }

export function dispose() {
  state = null;
}
