// Strawberry Camera Splat — a fruit barrage hurled at the live camera.
// Transparent glass overlay: berries arc in, plaster the lens in front of
// SavorySailor, and the recording indicator slowly gives up.
const TAU = Math.PI * 2;

export const meta = {
  title: 'Strawberry Camera Splat',
  author: 'honeytsuki',
  prompt: '!slop throw strawberries at camera man',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

let S = null;

const SEEDS = [
  [-0.38, -0.26], [-0.10, -0.42], [0.18, -0.34], [0.42, -0.14],
  [-0.52, 0.04], [-0.24, -0.02], [0.04, 0.02], [0.34, 0.14],
  [-0.34, 0.34], [-0.04, 0.40], [0.26, 0.44], [0.02, 0.20],
];

function aimRect(ctx) {
  const st = ctx.streamer;
  if (st && st.w > 0 && st.h > 0) {
    return {
      x: st.x * ctx.width,
      y: st.y * ctx.height,
      w: st.w * ctx.width,
      h: st.h * ctx.height,
    };
  }
  return {
    x: ctx.width * 0.22,
    y: ctx.height * 0.10,
    w: ctx.width * 0.56,
    h: ctx.height * 0.70,
  };
}

function roundRect(g, x, y, w, h, rad) {
  const r = Math.min(rad, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function label(g, text, x, y, size, color, align) {
  g.font = '800 ' + size + 'px system-ui, sans-serif';
  g.textAlign = align || 'left';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, size * 0.18);
  g.strokeStyle = 'rgba(8,14,30,0.88)';
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function fitSize(g, text, base, maxW) {
  if (maxW <= 0 || !text) return base;
  g.font = '800 ' + base + 'px system-ui, sans-serif';
  const w = g.measureText(text).width;
  if (w <= maxW) return base;
  return Math.max(base * 0.5, base * (maxW / w));
}

function labelFit(g, text, x, y, size, color, align, maxW) {
  label(g, text, x, y, fitSize(g, text, size, maxW), color, align);
}

// ---------------------------------------------------------------- berries

function berryPath(g, r) {
  g.beginPath();
  g.moveTo(0, r * 0.98);
  g.bezierCurveTo(-r * 0.55, r * 0.62, -r * 0.99, r * 0.04, -r * 0.84, -r * 0.48);
  g.bezierCurveTo(-r * 0.70, -r * 0.94, -r * 0.24, -r * 0.88, 0, -r * 0.60);
  g.bezierCurveTo(r * 0.24, -r * 0.88, r * 0.70, -r * 0.94, r * 0.84, -r * 0.48);
  g.bezierCurveTo(r * 0.99, r * 0.04, r * 0.55, r * 0.62, 0, r * 0.98);
  g.closePath();
}

function drawBerry(g, r, rot, alpha) {
  g.save();
  g.rotate(rot);
  g.globalAlpha = alpha;

  berryPath(g, r);
  const grd = g.createLinearGradient(-r * 0.6, -r * 0.8, r * 0.5, r * 0.9);
  grd.addColorStop(0, '#ff5a6e');
  grd.addColorStop(0.45, '#e11f3f');
  grd.addColorStop(1, '#8d1226');
  g.fillStyle = grd;
  g.fill();
  g.lineWidth = Math.max(1, r * 0.07);
  g.strokeStyle = 'rgba(96,10,26,0.75)';
  g.stroke();

  // seeds
  g.fillStyle = 'rgba(255,236,170,0.92)';
  for (let i = 0; i < SEEDS.length; i++) {
    const s = SEEDS[i];
    g.beginPath();
    g.ellipse(s[0] * r, s[1] * r, r * 0.055, r * 0.035, s[0] * 1.4, 0, TAU);
    g.fill();
  }

  // shine
  g.fillStyle = 'rgba(255,200,205,0.42)';
  g.beginPath();
  g.ellipse(-r * 0.38, -r * 0.32, r * 0.17, r * 0.28, -0.4, 0, TAU);
  g.fill();

  // leafy top
  g.fillStyle = '#3fbf5a';
  g.strokeStyle = '#1f7a35';
  g.lineWidth = Math.max(1, r * 0.05);
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i / 10) * TAU;
    const rad = (i % 2 === 0 ? 0.52 : 0.20) * r;
    const x = Math.cos(ang) * rad;
    const y = -r * 0.56 + Math.sin(ang) * rad * 0.62;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.stroke();

  g.restore();
}

// ---------------------------------------------------------------- splats

function smoothBlob(g, pts, r) {
  const n = pts.length;
  const vx = [], vy = [];
  for (let i = 0; i < n; i++) {
    vx.push(Math.cos(pts[i].a) * pts[i].d * r);
    vy.push(Math.sin(pts[i].a) * pts[i].d * r);
  }
  g.beginPath();
  g.moveTo((vx[n - 1] + vx[0]) * 0.5, (vy[n - 1] + vy[0]) * 0.5);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    g.quadraticCurveTo(vx[i], vy[i], (vx[i] + vx[j]) * 0.5, (vy[i] + vy[j]) * 0.5);
  }
  g.closePath();
}

function addSplat(ctx, x, y, r, big) {
  const n = 18;
  const pts = [];
  for (let i = 0; i < n; i++) {
    pts.push({ a: (i / n) * TAU, d: 0.80 + ctx.rand() * 0.42 });
  }
  const seeds = [];
  const ns = big ? 20 : 7;
  for (let i = 0; i < ns; i++) {
    const a = ctx.rand() * TAU;
    const dd = Math.sqrt(ctx.rand()) * 0.72;
    seeds.push({
      dx: Math.cos(a) * dd * r,
      dy: Math.sin(a) * dd * r,
      s: r * (0.05 + ctx.rand() * 0.05),
      rot: ctx.rand() * TAU,
    });
  }
  const chunks = [];
  for (let i = 0; i < (big ? 10 : 4); i++) {
    const a = ctx.rand() * TAU;
    const dd = Math.sqrt(ctx.rand()) * 0.76;
    chunks.push({
      dx: Math.cos(a) * dd * r,
      dy: Math.sin(a) * dd * r,
      s: r * (0.10 + ctx.rand() * 0.18),
    });
  }
  const drips = [];
  const nd = big ? 13 : 4;
  for (let i = 0; i < nd; i++) {
    drips.push({
      x: (ctx.rand() - 0.5) * r * 1.55,
      w: r * (0.09 + ctx.rand() * 0.11),
      max: r * (0.45 + ctx.rand() * (big ? 1.7 : 0.85)),
      speed: r * (0.45 + ctx.rand() * 0.75),
      delay: ctx.rand() * 0.4,
    });
  }
  S.splats.push({ x, y, r, pts, seeds, chunks, drips, birth: S.t, big });
}

function drawSplat(g, sp) {
  const age = Math.max(0, S.t - sp.birth);
  const r = sp.r;
  g.save();
  g.translate(sp.x, sp.y);

  // drips first, behind the main blob
  for (let i = 0; i < sp.drips.length; i++) {
    const d = sp.drips[i];
    const len = Math.min(d.max, Math.max(0, age - d.delay) * d.speed);
    if (len < 1) continue;
    g.fillStyle = '#c01a34';
    roundRect(g, d.x - d.w / 2, -r * 0.2, d.w, len + r * 0.2, d.w / 2);
    g.fill();
    g.beginPath();
    g.arc(d.x, -r * 0.2 + len, d.w * 0.58, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,130,140,0.30)';
    g.beginPath();
    g.arc(d.x - d.w * 0.18, -r * 0.2 + len * 0.55, d.w * 0.18, 0, TAU);
    g.fill();
  }

  // main flesh
  smoothBlob(g, sp.pts, r);
  const grd = g.createRadialGradient(-r * 0.2, -r * 0.25, r * 0.05, 0, 0, r * 1.15);
  grd.addColorStop(0, '#ee3a52');
  grd.addColorStop(0.5, '#cf1c39');
  grd.addColorStop(1, '#9a1428');
  g.fillStyle = grd;
  g.fill();
  g.lineWidth = Math.max(1, r * 0.025);
  g.strokeStyle = 'rgba(112,10,26,0.55)';
  g.stroke();

  // darker flesh chunks
  g.fillStyle = 'rgba(124,14,32,0.85)';
  for (let i = 0; i < sp.chunks.length; i++) {
    const c = sp.chunks[i];
    g.beginPath();
    g.arc(c.dx, c.dy, c.s, 0, TAU);
    g.fill();
  }

  // pale pulp core
  g.fillStyle = 'rgba(255,196,196,0.20)';
  g.beginPath();
  g.arc(-r * 0.08, -r * 0.1, r * 0.34, 0, TAU);
  g.fill();

  // seeds
  for (let i = 0; i < sp.seeds.length; i++) {
    const sd = sp.seeds[i];
    g.save();
    g.translate(sd.dx, sd.dy);
    g.rotate(sd.rot);
    g.fillStyle = 'rgba(255,238,178,0.95)';
    g.beginPath();
    g.ellipse(0, 0, sd.s, sd.s * 0.6, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  // wet highlight
  g.fillStyle = 'rgba(255,190,198,0.32)';
  g.beginPath();
  g.ellipse(-r * 0.3, -r * 0.34, r * 0.24, r * 0.13, -0.5, 0, TAU);
  g.fill();

  g.restore();
}

function spawnDebris(ctx, x, y, power, big) {
  const m = Math.min(ctx.width, ctx.height);
  const juice = big ? 46 : 16;
  for (let i = 0; i < juice; i++) {
    const a = ctx.rand() * TAU;
    const sp = power * (0.25 + ctx.rand());
    S.parts.push({
      kind: 0,
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - power * 0.3,
      r: m * (0.004 + ctx.rand() * (big ? 0.016 : 0.010)),
      life: 0.7 + ctx.rand() * 0.9,
      max: 1.6,
    });
  }
  const seeds = big ? 18 : 6;
  for (let i = 0; i < seeds; i++) {
    const a = ctx.rand() * TAU;
    const sp = power * (0.35 + ctx.rand() * 1.1);
    S.parts.push({
      kind: 1,
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - power * 0.5,
      r: m * (0.005 + ctx.rand() * 0.006),
      life: 1.0 + ctx.rand() * 1.1,
      max: 2.1,
      rot: ctx.rand() * TAU,
      spin: (ctx.rand() - 0.5) * 12,
    });
  }
}

// ---------------------------------------------------------------- init

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  const m = Math.min(W, H);

  const times = [1.5, 2.15, 2.7, 3.2, 3.65, 4.05, 4.45, 5.15, 5.6, 6.0, 6.4, 6.8];
  const queue = [];
  for (let i = 0; i < times.length; i++) {
    queue.push({
      at: times[i],
      size: m * (0.030 + i * 0.0025),
      dur: 0.60 - i * 0.012 + ctx.rand() * 0.06,
      side: i % 2 === 0 ? -1 : 1,
      spin: (ctx.rand() * 2 - 1) * 8,
    });
  }
  queue.push({ at: 8.25, size: m * 0.155, dur: 0.92, side: 0, spin: 2.5, giant: true });

  S = {
    t: 0,
    queue,
    shots: [],
    splats: [],
    parts: [],
    shake: 0,
    punchAt: -1,
    doneSent: false,
    caps: [
      { at: 1.55, dur: 2.2, text: 'STRAWBERRY ONE.', sub: 'the camera man has been warned.' },
      { at: 3.30, dur: 2.2, text: 'STRAWBERRY TWO.', sub: 'he did not move.' },
      { at: 5.20, dur: 2.3, text: 'ESCALATION.', sub: 'savorysailor, your lens is fruit now.' },
      { at: 7.00, dur: 1.9, text: 'THE CAMERA MAN HAS BECOME JAM.' },
    ],
    finaleText: 'LENS FULL OF BERRY.',
  };
}

function nextShot(ctx, spec) {
  const W = ctx.width, H = ctx.height;
  const m = Math.min(W, H);
  const A = aimRect(ctx);
  const jx = (ctx.rand() - 0.5) * A.w * 0.62;
  const jy = (ctx.rand() - 0.5) * A.h * 0.62;
  const tx = A.x + A.w * 0.5 + jx;
  const ty = A.y + A.h * 0.5 + jy;

  let x0, y0;
  if (spec.giant) {
    x0 = W * 0.5 + (ctx.rand() - 0.5) * W * 0.25;
    y0 = H + m * 0.16;
  } else if (spec.side < 0) {
    x0 = -m * 0.10;
    y0 = H * (0.82 + ctx.rand() * 0.14);
  } else {
    x0 = W + m * 0.10;
    y0 = H * (0.82 + ctx.rand() * 0.14);
  }

  const arc = spec.giant ? m * 0.22 : m * (0.30 + ctx.rand() * 0.18);
  const dist = Math.hypot(tx - x0, ty - y0);
  return {
    x0, y0, tx, ty, arc,
    u: 0,
    dur: spec.dur,
    size: spec.size,
    rot: ctx.rand() * TAU,
    spin: spec.spin,
    giant: !!spec.giant,
    prev: { x: x0, y: y0 },
    dist,
  };
}

// ---------------------------------------------------------------- frame

export function frame(ctx, t, dt) {
  if (!S) return;
  const g = ctx.canvas;
  const W = ctx.width, H = ctx.height;
  const m = Math.min(W, H);
  const d = Math.min(Math.max(dt || 0, 0), 0.05);
  S.t += d;
  g.clearRect(0, 0, W, H);

  const A = aimRect(ctx);

  // ---------- spawn scheduled shots ----------
  while (S.queue.length && S.t >= S.queue[0].at) {
    const spec = S.queue.shift();
    S.shots.push(nextShot(ctx, spec));
    ctx.sound.beep(spec.giant ? 130 : 300 + ctx.rand() * 220, 55);
    ctx.sound.noise(spec.giant ? 120 : 45);
  }

  // ---------- simulate shots ----------
  for (let i = S.shots.length - 1; i >= 0; i--) {
    const p = S.shots[i];
    p.prev.x = p.x0 + (p.tx - p.x0) * easeIn(p.u);
    p.prev.y = p.y0 + (p.ty - p.y0) * easeIn(p.u) - p.arc * Math.sin(Math.PI * p.u);
    p.u += d / p.dur;
    p.rot += p.spin * d;
    // slight gravity pull on the arc so it feels thrown
    if (p.u >= 1) {
      S.shots.splice(i, 1);
      const r = p.size * (p.giant ? 1.05 : 1.22);
      addSplat(ctx, p.tx, p.ty, r, p.giant);
      spawnDebris(ctx, p.tx, p.ty, m * (p.giant ? 1.5 : 0.7), p.giant);
      S.shake = Math.min(m * 0.028, S.shake + (p.giant ? m * 0.026 : m * 0.0075));
      if (p.giant) {
        S.punchAt = S.t;
        ctx.sound.noise(520);
        ctx.sound.beep(58, 460);
        ctx.sound.beep(92, 300);
      } else {
        ctx.sound.noise(140);
        ctx.sound.beep(120 + ctx.rand() * 70, 120);
      }
    }
  }

  // ---------- particles ----------
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const pt = S.parts[i];
    pt.life -= d;
    if (pt.life <= 0) { S.parts.splice(i, 1); continue; }
    pt.vy += m * 1.9 * d;
    pt.x += pt.vx * d;
    pt.y += pt.vy * d;
    if (pt.rot !== undefined) pt.rot += pt.spin * d;
    if (pt.y > H + m * 0.1) { S.parts.splice(i, 1); continue; }
  }

  // ---------- shake ----------
  const sx = Math.sin(S.t * 97) * S.shake;
  const sy = Math.cos(S.t * 83) * S.shake * 0.7;
  S.shake = Math.max(0, S.shake - S.shake * 7 * d);

  const ended = S.punchAt >= 0 && S.t - S.punchAt > 2.25;
  if (ended && !S.doneSent) {
    S.doneSent = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
  if (S.t > 15 && !S.doneSent) {
    S.doneSent = true;
    if (typeof ctx.done === 'function') ctx.done();
  }

  g.save();
  g.translate(sx, sy);

  // ---------- splats ----------
  for (let i = 0; i < S.splats.length; i++) drawSplat(g, S.splats[i]);

  // ---------- particles ----------
  for (let i = 0; i < S.parts.length; i++) {
    const pt = S.parts[i];
    const k = Math.min(1, pt.life / 0.5);
    g.save();
    g.globalAlpha = k;
    if (pt.kind === 0) {
      g.fillStyle = '#d91e3a';
      g.beginPath();
      g.arc(pt.x, pt.y, pt.r * (0.7 + 0.3 * k), 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,150,160,0.5)';
      g.beginPath();
      g.arc(pt.x - pt.r * 0.2, pt.y - pt.r * 0.2, pt.r * 0.35, 0, TAU);
      g.fill();
    } else {
      g.translate(pt.x, pt.y);
      g.rotate(pt.rot || 0);
      g.fillStyle = '#ffe9a8';
      g.beginPath();
      g.ellipse(0, 0, pt.r, pt.r * 0.62, 0, 0, TAU);
      g.fill();
      g.strokeStyle = 'rgba(150,110,20,0.5)';
      g.lineWidth = 1;
      g.stroke();
    }
    g.restore();
  }

  // ---------- incoming berries ----------
  for (let i = 0; i < S.shots.length; i++) {
    const p = S.shots[i];
    const u = easeIn(Math.min(1, p.u));
    const x = p.x0 + (p.tx - p.x0) * u;
    const y = p.y0 + (p.ty - p.y0) * u - p.arc * Math.sin(Math.PI * p.u);

    // motion ghosts
    const gx = p.prev.x - x;
    const gy = p.prev.y - y;
    for (let k = 1; k <= 3; k++) {
      g.save();
      g.translate(x + gx * k * 0.75, y + gy * k * 0.75);
      drawBerry(g, p.size * (0.94 - k * 0.05), p.rot - p.spin * 0.05 * k, 0.16);
      g.restore();
    }

    g.save();
    g.translate(x, y);
    drawBerry(g, p.size, p.rot, 1);
    g.restore();
  }

  // ---------- HUD: target brackets + crosshair ----------
  const hudAlpha = S.punchAt >= 0 ? 0.35 : 1;
  g.save();
  g.globalAlpha = hudAlpha;
  const pad = m * 0.022;
  const x0 = A.x - pad, y0 = A.y - pad, x1 = A.x + A.w + pad, y1 = A.y + A.h + pad;
  const c = Math.min(A.w, A.h) * 0.13;
  g.strokeStyle = ctx.accent || '#ff6bb5';
  g.lineWidth = Math.max(2, m * 0.005);
  g.lineCap = 'round';
  const corners = [
    [x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1],
  ];
  for (let i = 0; i < corners.length; i++) {
    const [cx, cy, dx, dy] = corners[i];
    g.beginPath();
    g.moveTo(cx + c * dx, cy);
    g.lineTo(cx, cy);
    g.lineTo(cx, cy + c * dy);
    g.stroke();
  }

  if (S.punchAt < 0) {
    const cx = A.x + A.w * 0.5;
    const cy = A.y + A.h * 0.5;
    const cr = Math.min(A.w, A.h) * 0.17;
    g.strokeStyle = '#ffe680';
    g.lineWidth = Math.max(1.5, m * 0.003);
    g.beginPath();
    g.arc(cx, cy, cr, 0, TAU);
    g.stroke();
    g.beginPath();
    g.arc(cx, cy, cr * 1.35, 0, TAU);
    g.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i * (TAU / 4) + S.t * 1.6;
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * cr * 0.55, cy + Math.sin(a) * cr * 0.55);
      g.lineTo(cx + Math.cos(a) * cr * 0.95, cy + Math.sin(a) * cr * 0.95);
      g.stroke();
    }
    label(g, 'LOCK', cx + cr * 1.5, cy - cr * 0.9, Math.max(10, m * 0.02), '#ffe680', 'left');
  }
  g.restore();

  // ---------- HUD: REC block ----------
  const hp = m * 0.045;
  const blink = Math.floor(S.t * 1.4) % 2 === 0;
  g.save();
  g.globalAlpha = 0.95;
  const recColor = '#ff4d63';
  if (blink && S.punchAt < 0) {
    g.fillStyle = recColor;
    g.beginPath();
    g.arc(hp + m * 0.014, hp + m * 0.016, m * 0.014, 0, TAU);
    g.fill();
  }
  label(g, S.punchAt >= 0 ? 'REC \u00b7 100% BERRY' : 'REC', hp + m * 0.036, hp + m * 0.016,
    Math.max(11, m * 0.024), '#ffe4ea', 'left');
  const secs = 4 * 3600 + 13 * 60 + 7 + Math.floor(S.t);
  const tc = '04:' + String(Math.floor(secs / 60) % 60).padStart(2, '0') + ':' + String(secs % 60).padStart(2, '0');
  label(g, tc, hp, hp + m * 0.056, Math.max(10, m * 0.019), 'rgba(255,228,234,0.75)', 'left');
  labelFit(g, 'CAM 01 \u00b7 GLASS', W - hp, hp + m * 0.016, Math.max(10, m * 0.021),
    'rgba(255,228,234,0.8)', 'right', W * 0.3);
  g.restore();

  // ---------- captions ----------
  let active = null;
  for (let i = 0; i < S.caps.length; i++) {
    const cp = S.caps[i];
    if (S.t >= cp.at && S.t < cp.at + cp.dur) active = cp;
  }
  if (S.punchAt >= 0) {
    active = { at: S.punchAt + 0.15, dur: 2.4, text: S.finaleText, sub: 'camera man status: delicious.' };
  }
  if (active) {
    const k = Math.min(1, (S.t - active.at) / 0.18) * Math.min(1, (active.at + active.dur - S.t) / 0.4);
    const size = Math.max(16, m * 0.052);
    const subSize = size * 0.44;
    g.save();
    g.globalAlpha = Math.max(0, k);
    g.font = '800 ' + size + 'px system-ui, sans-serif';
    const tw = g.measureText(active.text).width;
    let sw = 0;
    if (active.sub) {
      g.font = '700 ' + subSize + 'px system-ui, sans-serif';
      sw = g.measureText(active.sub).width;
    }
    const bw = Math.min(W - m * 0.08, Math.max(tw, sw) + size * 1.2);
    const bh = size * (active.sub ? 2.15 : 1.5);
    const bx = W * 0.5 - bw / 2;
    const by = H - m * 0.10 - bh;
    g.fillStyle = 'rgba(12,18,38,0.72)';
    roundRect(g, bx, by, bw, bh, size * 0.28);
    g.fill();
    g.strokeStyle = ctx.accent || '#ff6bb5';
    g.lineWidth = Math.max(2, size * 0.07);
    g.stroke();
    labelFit(g, active.text, W * 0.5, by + bh * (active.sub ? 0.36 : 0.5), size, '#ffffff', 'center', bw - size);
    if (active.sub) {
      labelFit(g, active.sub, W * 0.5, by + bh * 0.72, subSize, '#ffd9ea', 'center', bw - size);
    }
    g.restore();
  }

  g.restore();
}

function easeIn(u) {
  return u * u * (3 - 2 * u) * 0.35 + u * 0.65;
}

export function dispose(ctx) {}
