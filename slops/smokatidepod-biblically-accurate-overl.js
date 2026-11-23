// Biblically accurate angel — an overlay of rings of eyes, wings, and halo
// around the live streamer. The person on camera is never drawn; they get
// crowned, ringed, and gently told to be not afraid.

export const meta = {
  title: 'Biblically Accurate Overlay',
  author: 'smoka_tidepod',
  prompt: 'Turn the streamer into a biblically accurate angel',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(a, b, x) {
  const u = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return u * u * (3 - 2 * u);
}
function easeOut(u) { return 1 - Math.pow(1 - clamp(u, 0, 1), 3); }

const RING_DEFS = [
  { n: 14, k: 1.0, r: 0.032, speed: 0.10, reveal: 1.15, step: 0.10, dir: 1 },
  { n: 18, k: 1.18, r: 0.024, speed: -0.075, reveal: 4.25, step: 0.085, dir: 1 },
  { n: 24, k: 1.36, r: 0.018, speed: 0.05, reveal: 6.55, step: 0.065, dir: 1 },
];

const CAPTIONS = [
  { t0: 1.5, t1: 4.4, text: 'BE NOT AFRAID.' },
  { t0: 4.9, t1: 8.2, text: "IT'S JUST SAVORYSAILOR." },
  { t0: 8.8, t1: 12.7, text: 'MOSTLY EYES. MOSTLY FINE.' },
  { t0: 13.2, t1: 15.7, text: 'THE ANGEL HAS NO NOTES.' },
  { t0: 16.5, t1: 18.35, text: "BE NOT AFRAID. YOU'RE STILL LIVE." },
];

const PENT = [392, 440, 493.88, 587.33, 659.25];

function buildNotes() {
  const n = [];
  const push = (t, f, ms) => n.push({ t, f, ms });
  push(0.05, 110, 1400);
  push(0.6, 164.81, 1200);
  push(1.0, 196, 1000);
  for (let i = 0; i < 14; i += 2) push(1.2 + i * 0.105, PENT[(i / 2) % 5], 180);
  push(3.2, 220, 500);
  push(3.3, 329.63, 500);
  for (let i = 0; i < 18; i += 3) push(4.25 + i * 0.09, PENT[(i / 3 + 2) % 5] * 1.5, 140);
  for (let i = 0; i < 24; i += 4) push(6.55 + i * 0.07, PENT[(i / 4) % 5] * 2, 120);
  const rise = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
  rise.forEach((f, i) => push(8.2 + i * 0.18, f, 150));
  [261.63, 329.63, 392, 523.25, 659.25].forEach((f) => push(11.0, f, 1100));
  [783.99, 659.25, 523.25, 392, 329.63].forEach((f, i) => push(14.0 + i * 0.22, f, 260));
  push(16.5, 196, 900);
  push(16.6, 293.66, 900);
  push(17.0, 392, 700);
  return n.sort((a, b) => a.t - b.t);
}

function buildNoises() {
  return [
    { t: 0.12, ms: 420 },
    { t: 3.15, ms: 620 },
    { t: 10.9, ms: 750 },
    { t: 14.0, ms: 480 },
    { t: 16.4, ms: 520 },
  ];
}

let S = null;

export function init(ctx) {
  const rnd = ctx.rand;
  const rings = RING_DEFS.map((d) => ({ ...d }));
  const eyes = [];
  rings.forEach((ring, ri) => {
    for (let i = 0; i < ring.n; i++) {
      eyes.push({
        ri,
        order: i,
        angle: (i / ring.n) * TAU + (rnd() - 0.5) * 0.12,
        phase: rnd() * TAU,
        blinkPeriod: 2.5 + rnd() * 1.7,
        sizeJit: 0.85 + rnd() * 0.35,
        revealAt: ring.reveal + i * ring.step,
      });
    }
  });
  S = {
    rings,
    eyes,
    notes: buildNotes(),
    noteIdx: 0,
    noises: buildNoises(),
    noiseIdx: 0,
    rayJit: Array.from({ length: 28 }, () => rnd()),
    doneCalled: false,
  };
}

function eyeOpenness(t, eye) {
  const u = ((t + eye.phase) % eye.blinkPeriod) / eye.blinkPeriod;
  let o = 1;
  if (u < 0.06) o = 1 - Math.sin((u / 0.06) * Math.PI) * 0.94;
  const closeAt = 13.95 + eye.ri * 0.16 + eye.order * 0.018;
  o *= 1 - smooth(closeAt, closeAt + 0.4, t) * 0.97;
  return clamp(o, 0.02, 1);
}

function drawEye(c, x, y, r, open, rot, alpha) {
  if (alpha <= 0.01) return;
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(1, Math.max(0.06, open));
  c.globalAlpha = alpha;

  c.beginPath();
  c.ellipse(0, 0, r * 1.55, r, 0, 0, TAU);
  c.fillStyle = 'rgba(255,249,231,0.93)';
  c.fill();
  c.lineWidth = Math.max(1, r * 0.09);
  c.strokeStyle = 'rgba(255,205,112,0.88)';
  c.stroke();

  c.beginPath();
  c.arc(0, 0, r * 0.53, 0, TAU);
  c.fillStyle = '#f0a92e';
  c.fill();
  c.lineWidth = Math.max(1, r * 0.05);
  c.strokeStyle = 'rgba(120,68,12,0.55)';
  c.stroke();

  c.beginPath();
  c.arc(0, 0, r * 0.26, 0, TAU);
  c.fillStyle = '#23150a';
  c.fill();

  c.beginPath();
  c.arc(-r * 0.14, -r * 0.14, r * 0.10, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fill();

  c.restore();
  c.globalAlpha = 1;
}

function drawWing(c, W, H, rootX, rootY, side, L, unfold, alpha, wobble) {
  if (unfold <= 0.01 || alpha <= 0.01) return;
  const u = easeOut(unfold);
  c.save();
  c.translate(rootX, rootY);
  c.scale(side * (0.35 + 0.65 * u), 1);

  // wing sweep outline
  c.beginPath();
  c.moveTo(0, L * 0.1);
  c.quadraticCurveTo(L * 0.55, -L * 0.95, L * 1.02, -L * 0.42);
  c.lineWidth = 2;
  c.strokeStyle = `rgba(255,214,132,${0.28 * alpha})`;
  c.stroke();

  for (let j = 0; j < 9; j++) {
    const p = j / 8;
    const ang = -1.52 + p * 1.04 + wobble * 0.02;
    const taper = 0.52 + 0.6 * Math.sin(p * 2.3 + 0.45);
    const len = L * taper * (0.3 + 0.7 * u);
    const w = L * 0.14 * (0.5 + 0.5 * (1 - p));
    const cx = Math.cos(ang) * len * 0.5;
    const cy = Math.sin(ang) * len * 0.5;
    c.save();
    c.translate(cx, cy);
    c.rotate(ang);
    c.beginPath();
    c.ellipse(0, 0, len * 0.5, w * 0.5, 0, 0, TAU);
    c.fillStyle = `rgba(255,246,224,${0.07 * alpha})`;
    c.fill();
    c.lineWidth = Math.max(0.8, w * 0.06);
    c.strokeStyle = `rgba(255,215,134,${0.5 * alpha})`;
    c.stroke();
    c.beginPath();
    c.moveTo(-len * 0.4, 0);
    c.lineTo(len * 0.42, 0);
    c.lineWidth = Math.max(0.6, w * 0.035);
    c.strokeStyle = `rgba(255,222,160,${0.22 * alpha})`;
    c.stroke();
    c.restore();
  }
  c.restore();
}

function drawCaption(c, W, H, cap, t) {
  if (t < cap.t0 || t > cap.t1) return;
  const fadeIn = smooth(cap.t0, cap.t0 + 0.25, t);
  const fadeOut = 1 - smooth(cap.t1 - 0.35, cap.t1, t);
  const a = fadeIn * fadeOut;
  if (a <= 0.01) return;

  const fs = clamp(W * 0.021, 16, 32);
  c.save();
  c.globalAlpha = a;
  c.font = `italic 600 ${fs}px Georgia, 'Times New Roman', serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  const shown = cap.text.slice(0, Math.floor((t - cap.t0) * 34) + 1);
  const tw = Math.min(c.measureText(cap.text).width, c.measureText(shown).width);
  const plateW = Math.max(tw + fs * 2.2, fs * 6);
  const plateH = fs * 1.85;
  const px = W / 2;
  const py = H - plateH * 1.25;

  const rr = plateH * 0.32;
  c.beginPath();
  c.moveTo(px - plateW / 2 + rr, py - plateH / 2);
  c.lineTo(px + plateW / 2 - rr, py - plateH / 2);
  c.quadraticCurveTo(px + plateW / 2, py - plateH / 2, px + plateW / 2, py - plateH / 2 + rr);
  c.lineTo(px + plateW / 2, py + plateH / 2 - rr);
  c.quadraticCurveTo(px + plateW / 2, py + plateH / 2, px + plateW / 2 - rr, py + plateH / 2);
  c.lineTo(px - plateW / 2 + rr, py + plateH / 2);
  c.quadraticCurveTo(px - plateW / 2, py + plateH / 2, px - plateW / 2, py + plateH / 2 - rr);
  c.lineTo(px - plateW / 2, py - plateH / 2 + rr);
  c.quadraticCurveTo(px - plateW / 2, py - plateH / 2, px - plateW / 2 + rr, py - plateH / 2);
  c.closePath();
  c.fillStyle = 'rgba(9,14,30,0.58)';
  c.fill();
  c.lineWidth = 1.4;
  c.strokeStyle = 'rgba(255,214,140,0.72)';
  c.stroke();

  c.fillStyle = '#ffeec2';
  c.shadowColor = 'rgba(255,180,60,0.55)';
  c.shadowBlur = fs * 0.5;
  c.fillText(shown, px, py + fs * 0.04);
  c.restore();
}

function drawTopLabel(c, W, H, t) {
  const a = smooth(0.4, 1.0, t) * (1 - smooth(2.9, 3.5, t));
  if (a <= 0.01) return;
  const fs = clamp(W * 0.012, 11, 18);
  c.save();
  c.globalAlpha = a * 0.9;
  c.font = `500 ${fs}px Georgia, 'Times New Roman', serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = 'rgba(255,226,160,0.95)';
  c.shadowColor = 'rgba(255,180,60,0.6)';
  c.shadowBlur = fs;
  const txt = 'A BIBLICALLY ACCURATE ANGEL  ·  APPROX.';
  c.fillText(txt, W / 2, H * 0.07);
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  if (!c || !W || !H || !S) return;

  c.clearRect(0, 0, W, H);

  // Sound timeline
  if (ctx.sound) {
    while (S.noteIdx < S.notes.length && S.notes[S.noteIdx].t <= t) {
      const n = S.notes[S.noteIdx++];
      try { ctx.sound.beep(n.f, n.ms); } catch (e) { /* ignore */ }
    }
    while (S.noiseIdx < S.noises.length && S.noises[S.noiseIdx].t <= t) {
      const n = S.noises[S.noiseIdx++];
      try { ctx.sound.noise(n.ms); } catch (e) { /* ignore */ }
    }
  }

  const cam = ctx.streamer || { x: 0.27, y: 0.14, w: 0.46, h: 0.68 };
  const camW = Math.max(40, cam.w * W);
  const camH = Math.max(40, cam.h * H);
  const cx = cam.x * W + camW / 2;
  const cy = cam.y * H + camH / 2;
  const diag = Math.hypot(W, H);
  const minDim = Math.min(W, H);

  const fade = smooth(0, 0.8, t) * (1 - smooth(17.7, 18.4, t));
  const peak = smooth(10.6, 11.0, t) * (1 - smooth(11.0, 12.2, t));
  const col = smooth(13.9, 15.5, t);
  const env = smooth(0, 1.1, t) * (1 - smooth(16.6, 18.0, t));

  let rxBase = clamp(camW * 0.55, W * 0.16, W * 0.33);
  let ryBase = clamp(camH * 0.55, H * 0.14, H * 0.30);
  const rxMax = Math.max(W * 0.12, Math.min(cx - W * 0.02, W - cx - W * 0.02) * 0.98);
  const ryMax = Math.max(H * 0.1, Math.min(cy - H * 0.02, H - cy - H * 0.02) * 0.98);
  rxBase = Math.min(rxBase, rxMax / 1.36);
  ryBase = Math.min(ryBase, ryMax / 1.36);

  // ---- rays (behind everything) ----
  c.save();
  c.globalCompositeOperation = 'lighter';
  const rayA = (0.05 + 0.06 * env + 0.10 * peak) * fade;
  for (let i = 0; i < 28; i++) {
    const jit = S.rayJit[i];
    const a0 = (i / 28) * TAU + t * (0.05 + peak * 0.12) + jit * 0.06;
    const width = 0.012 + jit * 0.028;
    const r0 = Math.min(rxBase, ryBase) * (0.45 + jit * 0.5);
    const r1 = diag * (0.26 + 0.09 * Math.sin(t * 0.7 + i));
    c.beginPath();
    c.moveTo(cx + Math.cos(a0 - width) * r0, cy + Math.sin(a0 - width) * r0);
    c.lineTo(cx + Math.cos(a0) * r1, cy + Math.sin(a0) * r1);
    c.lineTo(cx + Math.cos(a0 + width) * r0, cy + Math.sin(a0 + width) * r0);
    c.closePath();
    c.fillStyle = `rgba(255,204,110,${rayA * (0.5 + jit)})`;
    c.fill();
  }

  // ---- halo bloom ----
  const glowR = minDim * (0.48 + 0.08 * peak + 0.04 * Math.sin(t * 1.4));
  const g = c.createRadialGradient(cx, cy, minDim * 0.04, cx, cy, glowR);
  g.addColorStop(0, `rgba(255,214,130,${(0.10 * env + 0.13 * peak) * fade})`);
  g.addColorStop(0.55, `rgba(255,180,90,${(0.045 * env + 0.06 * peak) * fade})`);
  g.addColorStop(1, 'rgba(255,150,60,0)');
  c.beginPath();
  c.arc(cx, cy, glowR, 0, TAU);
  c.fillStyle = g;
  c.fill();

  // ---- shock ring at the reveal ----
  if (t > 10.85 && t < 12.1) {
    const p = (t - 10.85) / 1.25;
    const rr = diag * (0.06 + 0.52 * easeOut(p));
    c.beginPath();
    c.arc(cx, cy, rr, 0, TAU);
    c.lineWidth = 2 + 7 * (1 - p);
    c.strokeStyle = `rgba(255,225,160,${(1 - p) * 0.55 * fade})`;
    c.stroke();
  }
  c.restore();

  // ---- wings ----
  const unfold1 = smooth(3.05, 4.1, t) * (1 - col * 0.8);
  const unfold2 = smooth(5.7, 6.9, t) * (1 - col * 0.85);
  const rootSpread = Math.min(camW * 0.46, W * 0.41);
  const rootY = cam.y * H + camH * 0.34;
  const wingL = clamp(camW * 0.55, W * 0.10, W * 0.24);
  const wingA = 0.9 * fade;
  const wob = Math.sin(t * 0.9) * 3;

  for (const side of [-1, 1]) {
    drawWing(c, W, H, cx + side * rootSpread, rootY, side, wingL, unfold1, wingA, wob);
    drawWing(
      c, W, H,
      cx + side * rootSpread * 0.92,
      rootY + camH * 0.20,
      side,
      wingL * 0.7,
      unfold2,
      wingA * 0.8,
      wob + 1.7,
    );
  }

  // ---- halo above the head ----
  const haloY = clamp(cam.y * H - H * 0.035, H * 0.05, H * 0.36);
  const haloRX = clamp(camW * 0.20, W * 0.055, W * 0.135) * (1 + 0.03 * Math.sin(t * 2));
  const haloRY = haloRX * 0.3;
  const haloA = smooth(0.5, 1.6, t) * (1 - smooth(17.4, 18.3, t));
  if (haloA > 0.01) {
    c.save();
    c.translate(cx, haloY);
    c.rotate(-0.16);
    c.globalCompositeOperation = 'lighter';
    c.beginPath();
    c.ellipse(0, 0, haloRX, haloRY, 0, 0, TAU);
    c.lineWidth = Math.max(7, minDim * 0.012);
    c.strokeStyle = `rgba(255,206,110,${0.12 * haloA})`;
    c.stroke();
    c.beginPath();
    c.ellipse(0, 0, haloRX, haloRY, 0, 0, TAU);
    c.lineWidth = Math.max(2, minDim * 0.0032);
    c.strokeStyle = `rgba(255,236,180,${0.9 * haloA})`;
    c.stroke();
    c.restore();
  }

  // ---- eye rings ----
  for (let ri = S.rings.length - 1; ri >= 0; ri--) {
    const ring = S.rings[ri];
    const k = ring.k * (1 - 0.26 * col);
    const rx = Math.min(rxBase * k, rxMax);
    const ry = Math.min(ryBase * k, ryMax);
    const rot = t * ring.speed * ring.dir;
    for (const eye of S.eyes) {
      if (eye.ri !== ri) continue;
      const reveal = smooth(eye.revealAt, eye.revealAt + 0.42, t);
      if (reveal <= 0.01) continue;
      const a = eye.angle + rot;
      const breathe = 1 + 0.014 * Math.sin(t * 1.2 + eye.phase);
      const ex = cx + Math.cos(a) * rx * breathe;
      const ey = cy + Math.sin(a) * ry * breathe;
      const r = minDim * ring.r * eye.sizeJit * (0.8 + 0.3 * reveal);
      drawEye(c, ex, ey, r, eyeOpenness(t, eye), a + Math.PI / 2, reveal * 0.95 * fade);
    }
  }

  // ---- lone final eye, the punchline's only witness ----
  if (t > 16.6 && t < 18.35) {
    const a = smooth(16.6, 17.0, t) * (1 - smooth(17.9, 18.3, t));
    if (a > 0.01) {
      const blink = 1 - smooth(17.55, 17.62, t) * 0.95;
      drawEye(c, cx, clamp(haloY - haloRX * 0.95, H * 0.05, H * 0.4),
        minDim * 0.028, blink, 0, a);
    }
  }

  // ---- captions ----
  for (const cap of CAPTIONS) drawCaption(c, W, H, cap, t);
  drawTopLabel(c, W, H, t);

  if (!S.doneCalled && t >= 18.45) {
    S.doneCalled = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
}

export function dispose() {
  S = null;
}
