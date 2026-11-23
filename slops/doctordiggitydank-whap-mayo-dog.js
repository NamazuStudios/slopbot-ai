// Whap Mayo Dog — a limp hot dog is pinned to the top of the glass, swings
// like a damped pendulum, settles, and detonates into white mayonnaise.
// Transparent overlay: everything floats over the live stream.

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const meta = {
  title: 'Whap Mayo Dog',
  author: 'doctordiggitydank',
  prompt: 'When a user types !whap, a limp hot dog swings into the scene pinned at the top center and explodes into white mayonnaise when it stops.',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!whap"] }
  ],
};

let S = null;

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  const m = Math.min(W, H);
  const tr = ctx.trigger;
  const owner = tr && typeof tr.login === 'string' ? tr.login : '';
  const st = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : null;

  S = {
    W, H, m,
    px: W * 0.5,
    py: H * 0.035,
    L: Math.min(H * 0.46, W * 0.30),
    seed: ctx.rand() * TAU,
    theta: 1.18,
    omega: 0,
    phase: 'swing',
    time: 0,
    swingT: 0,
    restT: 0,
    boomT: 0,
    limp: 0,
    eyeWide: 0,
    prevOmega: 0,
    trail: [],
    trailClock: 0,
    parts: [],
    decals: [],
    drips: [],
    rain: [],
    rainClock: 0,
    plops: [],
    plopIndex: 0,
    capt: null,
    owner,
    streamer: st,
    shake: 0,
    flash: 0,
    boomX: 0,
    boomY: 0,
    doneSent: false,
    startSound: false,
    dogPts: null,
  };
}

export function onTrigger(ctx, event) {
  if (S && event && typeof event.login === 'string' && event.login) {
    S.owner = event.login;
  }
}

// ---------------------------------------------------------------- helpers

function strokePoly(g, pts, width, color) {
  if (!pts || pts.length < 2) return;
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
  g.strokeStyle = color;
  g.lineWidth = width;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

function normalAt(pts, i) {
  const a = pts[Math.max(0, i - 1)];
  const b = pts[Math.min(pts.length - 1, i + 1)];
  let tx = b.x - a.x, ty = b.y - a.y;
  const l = Math.hypot(tx, ty) || 1;
  return { x: -ty / l, y: tx / l };
}

function offsetPts(pts, dist, wob) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const n = normalAt(pts, i);
    const d = dist + (wob ? Math.sin(i * 1.7 + 0.6) * wob : 0);
    out.push({ x: pts[i].x + n.x * d, y: pts[i].y + n.y * d });
  }
  return out;
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
  if (!text || maxW <= 0) return base;
  g.font = '800 ' + base + 'px system-ui, sans-serif';
  const w = g.measureText(text).width;
  if (w <= maxW) return base;
  return Math.max(base * 0.5, base * (maxW / w));
}

// ---------------------------------------------------------------- hot dog

function getDogPoints() {
  const N = 20;
  const seg = S.L / N;
  const limp = S.limp;
  const bend = clamp(-S.omega * 0.16, -0.5, 0.5) * (0.35 + limp * 0.75);
  const sway = (0.04 + limp * 0.12) * Math.sin(S.time * 2.2 + S.seed);
  const pts = [];
  let x = S.px, y = S.py;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const dir = S.theta + bend * s * s + sway * Math.sin(s * 2.4) * (0.3 + s);
    x += Math.sin(dir) * seg;
    y += Math.cos(dir) * seg;
    pts.push({ x, y });
  }
  return pts;
}

function drawMustard(g, pts, w) {
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const n = normalAt(pts, i);
    const off = (i % 2 === 0 ? 1 : -1) * w * 0.17;
    const x = pts[i].x + n.x * off;
    const y = pts[i].y + n.y * off;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.strokeStyle = '#f3ce39';
  g.lineWidth = Math.max(2, w * 0.13);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.stroke();
}

function drawFace(g, pts, w, alpha) {
  const i = Math.floor(pts.length * 0.66);
  const p = pts[i];
  const a = pts[Math.min(pts.length - 1, i + 1)];
  const ang = Math.atan2(a.y - p.y, a.x - p.x);
  g.save();
  g.translate(p.x, p.y);
  g.rotate(ang);
  g.globalAlpha = alpha;
  const wide = S.eyeWide;
  const er = w * (0.085 + 0.05 * wide);
  g.fillStyle = '#241009';
  g.beginPath(); g.arc(0, -w * 0.155, er, 0, TAU); g.fill();
  g.beginPath(); g.arc(0, w * 0.155, er, 0, TAU); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.88)';
  g.beginPath(); g.arc(-er * 0.32, -w * 0.155 - er * 0.34, er * 0.32, 0, TAU); g.fill();
  g.beginPath(); g.arc(-er * 0.32, w * 0.155 - er * 0.34, er * 0.32, 0, TAU); g.fill();
  g.strokeStyle = '#241009';
  g.lineWidth = Math.max(1.5, w * 0.05);
  g.beginPath();
  if (wide > 0.55) {
    g.arc(w * 0.24, 0, w * 0.09, 0, TAU);
  } else {
    g.arc(w * 0.08, 0, w * 0.13, -0.75, 0.75);
  }
  g.stroke();
  g.restore();
}

function drawDog(g, pts, alpha) {
  if (!pts) return;
  const w = S.m * 0.083 * (1 + S.limp * 0.1);
  g.save();
  g.globalAlpha = alpha;

  // bun shadow edges
  strokePoly(g, offsetPts(pts, w * 0.53, w * 0.045), w * 0.60, 'rgba(150,96,38,0.55)');
  strokePoly(g, offsetPts(pts, -w * 0.53, w * 0.045), w * 0.60, 'rgba(150,96,38,0.55)');
  // bun halves
  strokePoly(g, offsetPts(pts, w * 0.515, w * 0.055), w * 0.565, '#e9bb72');
  strokePoly(g, offsetPts(pts, -w * 0.515, w * 0.055), w * 0.565, '#e2ad62');
  // bun shine
  g.globalAlpha = alpha * 0.42;
  strokePoly(g, offsetPts(pts, w * 0.62, 0), w * 0.11, '#ffe4b8');
  g.globalAlpha = alpha;
  // sausage
  strokePoly(g, pts, w * 0.70, '#c14236');
  strokePoly(g, offsetPts(pts, 0, 0), w * 0.70, 'rgba(255,255,255,0)');
  // casing lines
  g.globalAlpha = alpha * 0.5;
  strokePoly(g, offsetPts(pts, -w * 0.13, w * 0.02), w * 0.17, '#e57a63');
  g.globalAlpha = alpha;
  // mustard
  drawMustard(g, pts, w);
  // face
  drawFace(g, pts, w, alpha);
  g.restore();
}

// ---------------------------------------------------------------- mayo

function makeBlobCircle(g, x, y, r, rot, lobes) {
  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * TAU;
    const rr = r * (0.80 + 0.26 * Math.sin(i * 2.3 + rot * 2 + lobes));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
  }
  g.closePath();
}

function drawMayoBlob(g, x, y, r, rot, alpha, lobes) {
  g.save();
  g.globalAlpha = alpha;
  g.fillStyle = '#fffdf4';
  makeBlobCircle(g, x, y, r, rot, lobes);
  g.fill();
  g.strokeStyle = 'rgba(172,170,150,0.42)';
  g.lineWidth = Math.max(1, r * 0.07);
  g.stroke();
  g.globalAlpha = alpha * 0.6;
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(x - r * 0.22, y - r * 0.28, r * 0.34, r * 0.20, -0.6, 0, TAU);
  g.fill();
  g.restore();
}

function spawnDecal(ctx, x, y, r) {
  const blobs = [];
  const n = 3 + Math.floor(ctx.rand() * 4);
  for (let i = 0; i < n; i++) {
    blobs.push({
      dx: (ctx.rand() - 0.5) * r * 2.2,
      dy: (ctx.rand() - 0.5) * r * 2.2,
      r: r * (0.32 + ctx.rand() * 0.68),
      rot: ctx.rand() * TAU,
      lob: ctx.rand() * 4,
    });
  }
  const drips = [];
  const dn = 1 + Math.floor(ctx.rand() * 3);
  for (let i = 0; i < dn; i++) {
    drips.push({
      dx: (ctx.rand() - 0.5) * r * 1.3,
      len: 0,
      max: r * (1.6 + ctx.rand() * 5.5),
      sp: r * (0.9 + ctx.rand() * 1.8),
      w: r * (0.18 + ctx.rand() * 0.25),
      delay: ctx.rand() * 0.45,
    });
  }
  S.decals.push({
    x, y, r, blobs, drips,
    alpha: 0.94,
    rot: ctx.rand() * TAU,
    lob: ctx.rand() * 4,
  });
}

function detonate(ctx, pts) {
  const W = S.W, H = S.H, m = S.m;
  const o = pts[Math.floor(pts.length * 0.62)] || { x: S.px, y: S.py + S.L * 0.5 };
  S.boomX = o.x;
  S.boomY = o.y;
  S.flash = 1;
  S.shake = 1;

  const areaScale = clamp((W * H) / (1280 * 720), 0.7, 2.2);
  const n = Math.round(120 * areaScale);
  for (let i = 0; i < n; i++) {
    const ang = ctx.rand() * TAU;
    const sp = m * (0.25 + ctx.rand() * 1.35);
    S.parts.push({
      x: o.x + (ctx.rand() - 0.5) * m * 0.06,
      y: o.y + (ctx.rand() - 0.5) * m * 0.06,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - m * 0.18,
      r: m * (0.010 + ctx.rand() * 0.032),
      rot: ctx.rand() * TAU,
      spin: (ctx.rand() - 0.5) * 7,
      lob: ctx.rand() * 5,
      life: 1.0 + ctx.rand() * 2.0,
      max: 3.0,
    });
  }

  // splats everywhere
  const dn = Math.round(22 * clamp(areaScale, 0.8, 1.6));
  for (let i = 0; i < dn; i++) {
    spawnDecal(ctx, ctx.rand() * W, ctx.rand() * H, m * (0.02 + ctx.rand() * 0.05));
  }
  // and a few squarely on the live camera shot, below the face line
  const st = S.streamer;
  if (st) {
    for (let i = 0; i < 4; i++) {
      const x = st.x + st.w * (0.08 + ctx.rand() * 0.84);
      const y = st.y + st.h * (0.55 + ctx.rand() * 0.40);
      spawnDecal(ctx, x, y, m * (0.022 + ctx.rand() * 0.035));
    }
  }

  ctx.sound.noise(650);
  ctx.sound.beep(62, 420);
  ctx.sound.beep(1350, 80);
  ctx.sound.beep(780, 60);

  S.plops = [];
  for (let i = 0; i < 12; i++) {
    S.plops.push({
      at: 0.06 + ctx.rand() * 1.7,
      f: 260 + ctx.rand() * 540,
      ms: 45 + ctx.rand() * 85,
    });
  }
  S.plopIndex = 0;

  S.capt = {
    head: 'MAYONNAISE.',
    sub: 'savorysailor has been whapped into condiment form.',
    sub2: S.owner
      ? 'requested by ' + S.owner + ', who has no regrets.'
      : 'requested by somebody with no regrets.',
  };
}

// ---------------------------------------------------------------- frame

export function frame(ctx, t, dt) {
  if (!S) return;
  const g = ctx.canvas;
  const W = S.W, H = S.H, m = S.m;
  const d = Math.min(Math.max(dt || 0, 0), 0.05);
  S.time += d;
  g.clearRect(0, 0, W, H);

  if (!S.startSound) {
    S.startSound = true;
    ctx.sound.noise(200);
    ctx.sound.beep(255, 90);
  }

  // -------- simulate
  if (S.phase === 'swing') {
    S.swingT += d;
    const prev = S.omega;
    stepSwing(d);
    S.theta = clamp(S.theta, -1.45, 1.45);
    S.limp = Math.min(1, S.swingT / 5.5);
    if (prev * S.omega < 0 && Math.abs(prev) > 0.25 && S.swingT > 0.2) {
      ctx.sound.beep(150 + Math.abs(prev) * 20, 65);
      ctx.sound.noise(40);
    }
    if (
      (S.swingT > 2.6 && Math.abs(S.theta) < 0.035 && Math.abs(S.omega) < 0.17) ||
      S.swingT > 8.0
    ) {
      S.phase = 'rest';
      S.restT = 0;
      S.theta = 0;
      S.omega = 0;
      S.eyeWide = 1;
      ctx.sound.beep(95, 260);
      ctx.sound.noise(140);
    }
  } else if (S.phase === 'rest') {
    S.restT += d;
    S.theta = Math.sin(S.time * 34) * 0.007 * Math.min(1, S.restT * 3);
    S.eyeWide = Math.min(1.5, 0.5 + S.restT * 3);
    if (S.restT > 0.62) {
      S.phase = 'boom';
      S.boomT = 0;
      detonate(ctx, getDogPoints());
    }
  } else if (S.phase === 'boom') {
    S.boomT += d;
    while (S.plopIndex < S.plops.length && S.plops[S.plopIndex].at <= S.boomT) {
      const pl = S.plops[S.plopIndex++];
      ctx.sound.beep(pl.f, pl.ms);
    }
    // brief mayo drizzle from above
    if (S.boomT < 1.1) {
      S.rainClock += d;
      while (S.rainClock > 0.035) {
        S.rainClock -= 0.035;
        S.rain.push({
          x: ctx.rand() * W,
          y: -m * 0.02,
          vy: m * (0.5 + ctx.rand() * 0.7),
          r: m * (0.004 + ctx.rand() * 0.010),
          life: 2.2,
        });
      }
    }
    if (S.boomT > 3.0 && !S.doneSent) {
      S.doneSent = true;
      if (typeof ctx.done === 'function') ctx.done();
    }
  }

  if (S.time > 45 && !S.doneSent) {
    S.doneSent = true;
    if (typeof ctx.done === 'function') ctx.done();
  }

  const pts = getDogPoints();
  S.dogPts = pts;

  // -------- screen shake
  S.shake = Math.max(0, S.shake - d * 3.2);
  const shx = Math.sin(S.time * 61) * m * 0.012 * S.shake;
  const shy = Math.cos(S.time * 47) * m * 0.012 * S.shake;

  g.save();
  g.translate(shx, shy);

  // -------- swing ghost trail
  if (S.phase === 'swing') {
    S.trailClock += d;
    if (S.trailClock > 0.055) {
      S.trailClock = 0;
      S.trail.push({ pts: pts.slice(), life: 0.34 });
    }
  }
  for (let i = S.trail.length - 1; i >= 0; i--) {
    S.trail[i].life -= d;
    if (S.trail[i].life <= 0) { S.trail.splice(i, 1); continue; }
    drawDog(g, S.trail[i].pts, 0.09 * (S.trail[i].life / 0.34));
  }

  // -------- pivot pin
  g.save();
  g.strokeStyle = 'rgba(210,216,235,0.75)';
  g.lineWidth = Math.max(2, m * 0.004);
  g.beginPath();
  g.moveTo(S.px, -H * 0.04);
  g.lineTo(S.px, S.py);
  g.stroke();
  g.fillStyle = '#cfd6ea';
  g.beginPath();
  g.arc(S.px, S.py, Math.max(5, m * 0.011), 0, TAU);
  g.fill();
  g.strokeStyle = 'rgba(30,40,70,0.8)';
  g.lineWidth = Math.max(1.5, m * 0.003);
  g.stroke();
  g.restore();

  // -------- hot dog
  if (S.phase === 'swing' || S.phase === 'rest') {
    drawDog(g, pts, 1);
  }

  // -------- mayo decals
  for (const dc of S.decals) {
    const a = dc.alpha * (S.phase === 'boom' ? clamp(1 - Math.max(0, S.boomT - 1.5) / 1.6, 0, 1) : 1);
    if (a <= 0.01) continue;
    g.save();
    g.globalAlpha = a;
    for (const b of dc.blobs) {
      drawMayoBlob(g, dc.x + b.dx, dc.y + b.dy, b.r, b.rot, a, b.lob);
    }
    // drips
    for (const dp of dc.drips) {
      if (S.boomT < dp.delay) continue;
      dp.len = Math.min(dp.max, dp.len + dp.sp * d);
      const x = dc.x + dp.dx;
      const y0 = dc.y + dp.len * 0.35;
      const len = dp.len;
      g.globalAlpha = a;
      g.fillStyle = '#fffdf4';
      roundRect(g, x - dp.w * 0.5, y0, dp.w, len, dp.w * 0.5);
      g.fill();
      g.beginPath();
      g.arc(x, y0 + len, dp.w * 0.62, 0, TAU);
      g.fill();
    }
    g.restore();
  }

  // -------- mayo rain
  for (let i = S.rain.length - 1; i >= 0; i--) {
    const rp = S.rain[i];
    rp.y += rp.vy * d;
    rp.life -= d;
    if (rp.y > H + 20 || rp.life <= 0) { S.rain.splice(i, 1); continue; }
    g.save();
    g.globalAlpha = 0.8 * clamp(rp.life, 0, 1);
    g.fillStyle = '#fffdf4';
    g.beginPath();
    g.ellipse(rp.x, rp.y, rp.r * 0.55, rp.r * 1.5, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  // -------- mayo particles
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const pt = S.parts[i];
    pt.life -= d;
    if (pt.life <= 0) { S.parts.splice(i, 1); continue; }
    pt.vy += m * 1.05 * d;
    const drag = Math.exp(-1.15 * d);
    pt.vx *= drag;
    pt.vy *= drag;
    pt.x += pt.vx * d;
    pt.y += pt.vy * d;
    pt.rot += pt.spin * d;
    const k = clamp(pt.life / 0.5, 0, 1);
    drawMayoBlob(g, pt.x, pt.y, pt.r * (0.65 + 0.35 * k), pt.rot, k, pt.lob);
  }

  // -------- flash + burst rays
  if (S.phase === 'boom' && S.boomT < 0.55) {
    const k = 1 - S.boomT / 0.55;
    g.save();
    g.globalAlpha = k * 0.95;
    g.fillStyle = '#ffffff';
    g.beginPath();
    const spikes = 16;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i / (spikes * 2)) * TAU + S.boomT * 3;
      const rad = (i % 2 === 0 ? 1 : 0.42) * m * 0.30 * (0.7 + (1 - k) * 0.9);
      const x = S.boomX + Math.cos(ang) * rad;
      const y = S.boomY + Math.sin(ang) * rad * 0.8;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.globalAlpha = k * 0.6;
    g.strokeStyle = '#ffffff';
    g.lineWidth = Math.max(2, m * 0.008);
    g.beginPath();
    g.arc(S.boomX, S.boomY, m * (0.05 + S.boomT * 1.4), 0, TAU);
    g.stroke();
    g.restore();
  }

  g.restore(); // shake

  // -------- target brackets on the live shot
  if (S.streamer && (S.phase === 'swing' || S.phase === 'rest')) {
    const ramp = S.phase === 'rest' ? 1 : clamp((S.swingT - 4.0) / 2.5, 0, 1);
    if (ramp > 0.02) drawTarget(g, S.streamer, ramp, ctx);
  }

  // -------- captions
  const p = m * 0.045;
  if (S.phase === 'swing' || S.phase === 'rest') {
    const hs = m * 0.045;
    label(g, 'WHAP EVENT', p, p + hs * 0.7, hs, '#ffd9ea', 'left');
    const sub = S.owner ? 'requested by ' + S.owner : 'requested by nobody in particular';
    label(g, sub, p, p + hs * 1.9, m * 0.026, '#ffe680', 'left');
    if (S.phase === 'swing') {
      label(g, 'MAYO PRESSURE: CRITICAL', W - p, p + hs * 0.7, m * 0.026, '#ff9fd0', 'right');
    } else {
      label(g, 'FULL STOP. MAYO ARMED.', W - p, p + hs * 0.7, m * 0.026, '#ff9fd0', 'right');
    }
  } else if (S.capt) {
    drawFinalCaption(g, ctx);
  }
}

function stepSwing(d) {
  const grav = 12.2;
  let zeta = 0.055;
  if (S.swingT > 5.2) zeta = 0.055 + (S.swingT - 5.2) * 0.30;
  zeta = Math.min(0.85, zeta);
  const sub = 5;
  const h = d / sub;
  const w0 = Math.sqrt(grav);
  for (let i = 0; i < sub; i++) {
    const acc = -grav * Math.sin(S.theta) - 2 * zeta * w0 * S.omega;
    S.omega += acc * h;
    S.theta += S.omega * h;
  }
}

function drawTarget(g, rect, alpha, ctx) {
  const len = Math.min(rect.w, rect.h) * 0.16;
  const off = Math.min(rect.w, rect.h) * 0.02;
  const x0 = rect.x - off;
  const y0 = rect.y - off;
  const x1 = rect.x + rect.w + off;
  const y1 = rect.y + rect.h + off;
  g.save();
  g.globalAlpha = alpha * 0.55;
  g.strokeStyle = ctx.accent || '#ff6bb5';
  g.lineWidth = Math.max(2, S.m * 0.005);
  g.lineCap = 'square';
  const corners = [
    [x0, y0, 1, 1],
    [x1, y0, -1, 1],
    [x0, y1, 1, -1],
    [x1, y1, -1, -1],
  ];
  for (const c of corners) {
    g.beginPath();
    g.moveTo(c[0] + len * c[2], c[1]);
    g.lineTo(c[0], c[1]);
    g.lineTo(c[0], c[1] + len * c[3]);
    g.stroke();
  }
  g.restore();
  const tag = 'MAYO LOCK';
  const size = Math.max(11, S.m * 0.024);
  const ty = Math.max(size, y0 - size * 0.9);
  label(g, tag, x1, ty, size, '#ffd9ea', 'right');
}

function drawFinalCaption(g, ctx) {
  const W = S.W, H = S.H, m = S.m;
  const tr = S.streamer;
  const boxW = Math.min(W - m * 0.10, m * 1.30);
  const boxH = m * 0.225;
  let cx = W * 0.5;
  let cy = H * 0.80;
  if (tr) {
    const below = tr.y + tr.h + boxH / 2 + m * 0.035;
    const above = tr.y - boxH / 2 - m * 0.035;
    if (below + boxH / 2 < H - m * 0.02) cy = below;
    else if (above - boxH / 2 > m * 0.02) cy = above;
    else cy = H * 0.82;
  }
  cx = clamp(cx, boxW / 2 + m * 0.03, W - boxW / 2 - m * 0.03);
  cy = clamp(cy, boxH / 2 + m * 0.02, H - boxH / 2 - m * 0.02);

  g.save();
  g.globalAlpha = 0.94;
  g.fillStyle = ctx.accent || '#ff6bb5';
  roundRect(g, cx - boxW / 2, cy - boxH / 2, boxW, boxH, boxH * 0.16);
  g.fill();
  g.strokeStyle = 'rgba(10,16,36,0.9)';
  g.lineWidth = Math.max(2, m * 0.006);
  g.stroke();
  g.restore();

  const maxTextW = boxW - m * 0.09;
  const headSize = fitSize(g, S.capt.head, m * 0.085, maxTextW);
  const subSize = fitSize(g, S.capt.sub, m * 0.036, maxTextW);
  const sub2Size = fitSize(g, S.capt.sub2, m * 0.030, maxTextW);
  label(g, S.capt.head, cx, cy - boxH * 0.20, headSize, '#0a1024', 'center');
  label(g, S.capt.sub, cx, cy + boxH * 0.10, subSize, '#1c0a24', 'center');
  label(g, S.capt.sub2, cx, cy + boxH * 0.32, sub2Size, '#3a1430', 'center');
}

export function dispose(ctx) {
  S = null;
}
