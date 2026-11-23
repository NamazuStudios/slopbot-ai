export const meta = {
  title: 'Gassy Kitten Delivery',
  author: 'blembily',
  prompt: 'a big butt approaches the camera slowly until it encapsulates the screen before it farts out a litter of kittens that each meow and fart before scampering off screen',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

/* ── helpers ─────────────────────────────────────────────────── */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, p) { return a + (b - a) * p; }
function easeInCubic(p) { return p * p * p; }
function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
function easeInOutCubic(p) {
  return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
}
function rr(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const COATS = ['#f2d8b0', '#c9c9d4', '#e8a05c', '#4a4050', '#f6efe6', '#a8b8c8'];
const EARS = ['#e8b98a', '#a8a8b6', '#cf8044', '#3a3240', '#e2d6c6', '#8a9aac'];

/* ── init ────────────────────────────────────────────────────── */

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  const sc = Math.min(W / 1280, H / 720) || 1;
  const R = () => ctx.rand();

  const sR = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : { x: W * 0.30, y: H * 0.36, w: W * 0.40, h: H * 0.46 };

  const st = {
    W, H, sc, R, sR,
    approachT: 4.3,
    blastT: 4.6,
    endAt: 9.7,
    done: false,
    cueIdx: 0,
    puffs: [],
    kittens: [],
    cues: [
      { t: 0.05, fn: (x) => x.sound.beep(52, 420) },
      { t: 0.9, fn: (x) => x.sound.beep(47, 360) },
      { t: 1.9, fn: (x) => x.sound.beep(43, 380) },
      { t: 2.9, fn: (x) => { x.sound.beep(38, 420); x.sound.noise(120); } },
      { t: 3.7, fn: (x) => x.sound.beep(34, 260) },
      { t: 4.28, fn: (x) => { x.sound.noise(90); x.sound.beep(120, 90); } },
      { t: 4.6, fn: (x) => { x.sound.noise(460); x.sound.beep(41, 540); } },
      { t: 4.78, fn: (x) => { x.sound.noise(260); x.sound.beep(30, 720); } },
      { t: 5.04, fn: (x) => x.sound.noise(200) },
    ],
  };

  st.fartPoint = { x: W * 0.5, y: H * 0.56 };

  /* kittens */
  const N = 7;
  for (let i = 0; i < N; i++) {
    const u = (Math.min(W, H) / 720) * (26 + R() * 12) * 1.0;
    const tx = W * (0.07 + (0.86 * (i + 0.5)) / N) + (R() - 0.5) * W * 0.05;
    const ty = lerp(sR.y + sR.h * 0.70, H * 0.90, R() * 0.55);
    const launchAt = 4.63 + i * 0.055 + R() * 0.04;
    const flightDur = 0.40 + R() * 0.20;
    const landAt = launchAt + flightDur;
    const fartAt = landAt + 0.42 + R() * 0.10;
    const runAt = fartAt + 0.50 + R() * 0.15;
    const dir = tx < W * 0.5 ? -1 : 1;

    st.kittens.push({
      i,
      u,
      coat: COATS[Math.floor(R() * COATS.length)],
      ear: EARS[Math.floor(R() * EARS.length)],
      tx, ty,
      sx: st.fartPoint.x + (R() - 0.5) * W * 0.06,
      sy: st.fartPoint.y + (R() - 0.5) * H * 0.04,
      launchAt, flightDur, landAt, fartAt, runAt,
      arc: (H * 0.10 + R() * H * 0.12),
      spin: (R() - 0.5) * 8,
      runDir: dir,
      runSpeed: (W * 0.5 + R() * W * 0.22),
      hop: 9 + R() * 4,
      legPhase: R() * 7,
      meowSound: false,
      fartSound: false,
      sizeWob: 0.9 + R() * 0.25,
    });

    /* precompute that kitten's fart puff */
    st.puffs.push({
      spawn: fartAt,
      life: 1.1,
      x: tx - dir * u * 3.0,
      y: ty + u * 0.6,
      vx: -dir * 40 * sc,
      vy: -12 * sc,
      r: u * 0.9,
      grow: 26 * sc,
      rgb: '198,232,124',
      alpha: 0.34,
    });
  }

  /* the big blast */
  for (let i = 0; i < 46; i++) {
    const a = Math.PI * (0.08 + R() * 0.84);
    const sp = (160 + R() * 560) * sc;
    st.puffs.push({
      spawn: 4.6 + R() * 0.5,
      life: 0.9 + R() * 1.0,
      x: st.fartPoint.x + (R() - 0.5) * W * 0.10,
      y: st.fartPoint.y + (R() - 0.5) * H * 0.06,
      vx: Math.cos(a) * sp * 0.8,
      vy: Math.sin(a) * sp * 0.55 - 40 * sc,
      r: (16 + R() * 42) * sc,
      grow: (60 + R() * 90) * sc,
      rgb: R() < 0.68 ? '198,236,126' : '228,242,204',
      alpha: 0.30,
    });
  }
  st.puffs.sort((a, b) => a.spawn - b.spawn);

  ctx._gassySt = st;
}

/* ── butt motion ─────────────────────────────────────────────── */

function buttParam(st, t) {
  const { W, H } = st;
  let w, cx, cy, alpha = 0.94, squash = 0;

  if (t < st.approachT) {
    const p = easeInOutCubic(clamp(t / st.approachT, 0, 1));
    w = lerp(W * 0.30, W * 2.95, Math.pow(p, 1.15));
    cy = lerp(H * 0.64, H * 0.56, p);
    cx = W * 0.5;
  } else if (t < st.blastT) {
    const p = (t - st.approachT) / (st.blastT - st.approachT);
    w = W * 2.95;
    cx = W * 0.5 + Math.sin(t * 74) * 5 * st.sc;
    cy = H * 0.56 + Math.cos(t * 66) * 4 * st.sc;
    squash = 0.05 + 0.03 * Math.sin(p * 20);
  } else {
    const q = clamp((t - st.blastT) / 1.25, 0, 1);
    const e = easeInCubic(q);
    w = lerp(W * 2.95, W * 0.40, e);
    cy = lerp(H * 0.56, -H * 0.85, e);
    cx = W * 0.5 + Math.sin(q * 9) * W * 0.04 * (1 - q);
    alpha = 0.94 * (1 - clamp((q - 0.55) / 0.45, 0, 1));
  }

  return { cx, cy, w, h: w * 0.82, alpha, squash };
}

function drawButt(c, st, bp) {
  if (bp.alpha <= 0.01) return;
  const { cx, cy, w, h, alpha, squash } = bp;
  const sx = 1 + squash * 0.5;
  const sy = 1 - squash * 0.5;

  c.save();
  c.translate(cx, cy);
  c.scale(sx, sy);
  c.globalAlpha = clamp(alpha, 0, 1);

  /* soft pink rim glow so it reads over gameplay */
  c.shadowColor = 'rgba(255,110,180,0.55)';
  c.shadowBlur = 26 * st.sc;

  /* thighs rising out of the top of the silhouette */
  if (w < st.W * 1.2) {
    c.fillStyle = '#1e2436';
    rr(c, -w * 0.36, -h * 1.5, w * 0.27, h * 1.32, w * 0.10); c.fill();
    rr(c, w * 0.09, -h * 1.5, w * 0.27, h * 1.32, w * 0.10); c.fill();
  }

  /* denim silhouette */
  const g = c.createLinearGradient(0, -h * 0.75, 0, h * 0.55);
  g.addColorStop(0, '#3d4a70');
  g.addColorStop(0.45, '#2a3350');
  g.addColorStop(1, '#161d30');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, -h * 0.26, w * 0.44, h * 0.30, 0, 0, Math.PI * 2);
  c.ellipse(-w * 0.205, h * 0.04, w * 0.275, h * 0.44, -0.05, 0, Math.PI * 2);
  c.ellipse(w * 0.205, h * 0.04, w * 0.275, h * 0.44, 0.05, 0, Math.PI * 2);
  c.fill();

  c.shadowBlur = 0;

  /* waistband */
  c.fillStyle = 'rgba(255,107,157,0.80)';
  rr(c, -w * 0.34, -h * 0.40, w * 0.68, h * 0.085, h * 0.042); c.fill();
  c.fillStyle = 'rgba(255,228,244,0.34)';
  rr(c, -w * 0.34, -h * 0.396, w * 0.68, h * 0.016, h * 0.008); c.fill();

  /* center seam */
  c.strokeStyle = 'rgba(8,4,14,0.55)';
  c.lineWidth = Math.max(1, w * 0.012);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -h * 0.18);
  c.quadraticCurveTo(-w * 0.03, h * 0.06, 0, h * 0.38);
  c.stroke();

  /* stitched pocket arcs */
  c.setLineDash([w * 0.026, w * 0.022]);
  c.strokeStyle = 'rgba(255,170,215,0.42)';
  c.lineWidth = Math.max(1, w * 0.006);
  c.beginPath();
  c.ellipse(-w * 0.21, h * 0.02, w * 0.14, h * 0.22, 0.2, Math.PI * 0.86, Math.PI * 1.62);
  c.stroke();
  c.beginPath();
  c.ellipse(w * 0.21, h * 0.02, w * 0.14, h * 0.22, -0.2, Math.PI * 1.38, Math.PI * 2.14);
  c.stroke();
  c.setLineDash([]);

  /* fabric highlights */
  c.strokeStyle = 'rgba(200,225,255,0.13)';
  c.lineWidth = Math.max(1, w * 0.02);
  c.beginPath();
  c.ellipse(-w * 0.23, -h * 0.02, w * 0.12, h * 0.20, 0.25, Math.PI * 0.9, Math.PI * 1.62);
  c.stroke();
  c.beginPath();
  c.ellipse(w * 0.23, -h * 0.02, w * 0.12, h * 0.20, -0.25, Math.PI * 1.38, Math.PI * 2.1);
  c.stroke();

  c.restore();
}

/* ── gas ─────────────────────────────────────────────────────── */

function drawPuffs(c, st, t) {
  for (const p of st.puffs) {
    const age = t - p.spawn;
    if (age < 0 || age > p.life) continue;
    const k = age / p.life;
    const a = (1 - k) * p.alpha;
    if (a <= 0) continue;
    const x = p.x + p.vx * age * (1 - age * 0.35);
    const y = p.y + p.vy * age + 16 * st.sc * age * age;
    const r = p.r + p.grow * age;
    const grd = c.createRadialGradient(x, y, r * 0.1, x, y, r);
    grd.addColorStop(0, `rgba(${p.rgb},${a})`);
    grd.addColorStop(0.62, `rgba(${p.rgb},${a * 0.45})`);
    grd.addColorStop(1, `rgba(${p.rgb},0)`);
    c.fillStyle = grd;
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
  }
}

/* ── kittens ─────────────────────────────────────────────────── */

function kittenPose(k, t, st) {
  if (t < k.launchAt) return null;
  if (t < k.landAt) {
    const p = clamp((t - k.launchAt) / k.flightDur, 0, 1);
    const x = lerp(k.sx, k.tx, p);
    const y = lerp(k.sy, k.ty, p) - Math.sin(Math.PI * p) * k.arc;
    return { mode: 'fly', x, y, ang: k.spin * (1 - p), p };
  }
  if (t < k.runAt) {
    const bob = Math.sin((t - k.landAt) * 9 + k.legPhase) * k.u * 0.25;
    return { mode: 'sit', x: k.tx, y: k.ty + bob, ang: 0, p: 1 };
  }
  const runT = t - k.runAt;
  const x = k.tx + k.runDir * k.runSpeed * runT;
  const hop = Math.abs(Math.sin(runT * k.hop + k.legPhase)) * k.u * 1.8;
  const y = k.ty - hop;
  const ang = k.runDir * Math.sin(runT * k.hop + k.legPhase) * 0.05;
  if (x < -k.u * 10 || x > st.W + k.u * 10) return null;
  return { mode: 'run', x, y, ang, runT };
}

function drawKitten(c, st, k, t) {
  const pose = kittenPose(k, t, st);
  if (!pose) return;
  const u = k.u;

  if (pose.mode === 'sit' || pose.mode === 'run') {
    c.save();
    c.fillStyle = 'rgba(8,2,14,0.20)';
    c.beginPath();
    c.ellipse(pose.x, k.ty + u * 2.4, u * 3.4, u * 1.0, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  c.save();
  c.translate(pose.x, pose.y);
  c.rotate(pose.ang);
  const dir = pose.mode === 'run' ? k.runDir : (k.i % 2 === 0 ? 1 : -1);
  c.scale(dir, 1);

  const running = pose.mode === 'run';
  const swing = running ? Math.sin(pose.runT * k.hop * 1.2 + k.legPhase) : 0;
  const flying = pose.mode === 'fly';

  /* tail */
  const tailWave = flying ? Math.sin(t * 22 + k.i) * 0.5 : Math.sin(t * 4 + k.i) * 0.4;
  c.strokeStyle = k.coat;
  c.lineWidth = u * 0.8;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-u * 2.8, u * 0.1);
  c.quadraticCurveTo(-u * 5.0, -u * 1.0 + tailWave * u, -u * 5.4, -u * 2.6 + tailWave * u * 2);
  c.stroke();

  /* legs */
  c.strokeStyle = k.coat;
  c.lineWidth = u * 0.85;
  const legSpread = running ? 3.2 : 2.2;
  const l1 = running ? swing * 1.6 : 0.35;
  const l2 = running ? -swing * 1.6 : -0.35;
  c.beginPath();
  c.moveTo(-u * 1.7, u * 1.9);
  c.lineTo(-u * 1.7 + Math.sin(l1) * u * 2.2, u * 1.9 + Math.cos(l1) * u * 1.4);
  c.moveTo(u * 1.7, u * 1.9);
  c.lineTo(u * 1.7 + Math.sin(l2) * u * 2.2, u * 1.9 + Math.cos(l2) * u * 1.4);
  c.stroke();

  /* body */
  c.fillStyle = k.coat;
  c.beginPath();
  c.ellipse(0, u * 0.4, u * 3.1, u * 2.15, 0, 0, Math.PI * 2);
  c.fill();

  /* belly patch */
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.beginPath();
  c.ellipse(u * 0.3, u * 1.0, u * 1.6, u * 1.1, 0, 0, Math.PI * 2);
  c.fill();

  /* head */
  const hx = u * 2.5, hy = -u * 1.9;
  c.fillStyle = k.coat;
  c.beginPath();
  c.arc(hx, hy, u * 1.95, 0, Math.PI * 2);
  c.fill();

  /* ears */
  c.fillStyle = k.ear;
  c.beginPath();
  c.moveTo(hx - u * 1.5, hy - u * 1.0);
  c.lineTo(hx - u * 1.9, hy - u * 3.1);
  c.lineTo(hx - u * 0.2, hy - u * 1.7);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(hx + u * 1.5, hy - u * 1.0);
  c.lineTo(hx + u * 1.9, hy - u * 3.1);
  c.lineTo(hx + u * 0.2, hy - u * 1.7);
  c.closePath();
  c.fill();

  /* eyes */
  const meowing = t >= k.landAt + 0.06 && t < k.landAt + 0.45;
  c.fillStyle = 'rgba(20,10,26,0.9)';
  c.beginPath(); c.arc(hx - u * 0.6, hy - u * 0.15, u * 0.34, 0, 6.3); c.fill();
  c.beginPath(); c.arc(hx + u * 0.6, hy - u * 0.15, u * 0.34, 0, 6.3); c.fill();

  /* nose + mouth */
  c.fillStyle = '#f28fb0';
  c.beginPath();
  c.moveTo(hx, hy + u * 0.55);
  c.lineTo(hx - u * 0.25, hy + u * 0.32);
  c.lineTo(hx + u * 0.25, hy + u * 0.32);
  c.closePath();
  c.fill();
  if (meowing) {
    c.fillStyle = 'rgba(130,40,60,0.9)';
    c.beginPath();
    c.ellipse(hx, hy + u * 0.95, u * 0.4, u * 0.55, 0, 0, Math.PI * 2);
    c.fill();
  } else {
    c.strokeStyle = 'rgba(60,25,40,0.6)';
    c.lineWidth = u * 0.12;
    c.beginPath();
    c.arc(hx, hy + u * 0.62, u * 0.4, 0.2, Math.PI - 0.2);
    c.stroke();
  }

  /* whiskers */
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = u * 0.09;
  for (let s = -1; s <= 1; s += 2) {
    c.beginPath();
    c.moveTo(hx + s * u * 0.9, hy + u * 0.45);
    c.lineTo(hx + s * u * 2.2, hy + u * 0.30);
    c.moveTo(hx + s * u * 0.9, hy + u * 0.62);
    c.lineTo(hx + s * u * 2.2, hy + u * 0.78);
    c.stroke();
  }

  c.restore();

  /* little "mew!" on the meow beat */
  if (meowing) {
    const a = 1 - clamp(((t - k.landAt - 0.06) / 0.39), 0, 1);
    c.save();
    c.globalAlpha = clamp(a * 1.4, 0, 1);
    c.font = `800 ${Math.round(u * 1.5)}px "Trebuchet MS", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = u * 0.5;
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(10,4,16,0.8)';
    c.strokeText('mew!', pose.x, pose.y - u * 5.4);
    c.fillStyle = '#fff2fb';
    c.fillText('mew!', pose.x, pose.y - u * 5.4);
    c.restore();
  }
}

/* ── captions ────────────────────────────────────────────────── */

function drawCaptions(c, st, t) {
  const caps = [
    { t0: 0.7, t1: 3.6, text: 'INCOMING, SAVORYSAILOR' },
    { t0: 3.9, t1: 4.75, text: 'BRACE THE FRAME' },
    { t0: 5.2, t1: 6.5, text: 'KITTEN DELIVERY' },
    { t0: 7.4, t1: 9.5, text: 'SEVEN FRESH KITTENS, ALL GASSY' },
  ];
  const y = st.H * 0.87;
  const size = Math.round(Math.min(st.H * 0.052, st.W * 0.033));

  for (const cap of caps) {
    if (t < cap.t0 || t > cap.t1) continue;
    const a = Math.min(1, (t - cap.t0) / 0.18) * Math.min(1, (cap.t1 - t) / 0.25);
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.font = `800 ${size}px "Trebuchet MS", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = size * 0.30;
    c.strokeStyle = 'rgba(10,4,16,0.82)';
    c.strokeText(cap.text, st.W * 0.5, y);
    c.fillStyle = '#fff4fb';
    c.fillText(cap.text, st.W * 0.5, y);
    c.restore();
  }
}

/* ── frame ───────────────────────────────────────────────────── */

export function frame(ctx, t, dt) {
  const st = ctx._gassySt;
  if (!st) return;

  const c = ctx.canvas;
  const W = st.W, H = st.H;
  c.clearRect(0, 0, W, H);

  /* scheduled sounds */
  while (st.cueIdx < st.cues.length && t >= st.cues[st.cueIdx].t) {
    st.cues[st.cueIdx].fn(ctx);
    st.cueIdx++;
  }

  /* per-kitten sounds */
  for (const k of st.kittens) {
    if (!k.meowSound && t >= k.landAt + 0.06) {
      k.meowSound = true;
      ctx.sound.beep(760 + k.i * 70, 80);
      ctx.sound.beep(980 + k.i * 60, 70);
    }
    if (!k.fartSound && t >= k.fartAt) {
      k.fartSound = true;
      ctx.sound.noise(110);
      ctx.sound.beep(70 + k.i * 6, 150);
    }
  }

  /* screen shake around the blast */
  let shx = 0, shy = 0;
  if (t > 4.3 && t < 5.9) {
    const amp = 14 * st.sc * clamp(1 - (t - 4.6) / 1.3, 0, 1) * (t < 4.6 ? 0.5 : 1);
    shx = Math.sin(t * 71) * amp;
    shy = Math.cos(t * 63) * amp;
  }

  const bp = buttParam(st, t);

  c.save();
  c.translate(shx, shy);
  drawPuffs(c, st, t);
  drawButt(c, st, bp);
  for (const k of st.kittens) drawKitten(c, st, k, t);
  c.restore();

  drawCaptions(c, st, t);

  if (!st.done && t >= st.endAt) {
    st.done = true;
    ctx.done();
  }
}

export function dispose(ctx) {
  if (ctx) ctx._gassySt = null;
}
