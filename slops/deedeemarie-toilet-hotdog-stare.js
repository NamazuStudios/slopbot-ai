// A doodle. A toilet. A hotdog. An unbearable amount of eye contact.
export const meta = {
  title: 'Toilet Hotdog Stare',
  author: 'deedeemarie',
  prompt: 'doodle dank sittin on a toilet eating a hotdog turns and smiles at chat very awkward',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;
const INK = '#241a3a';
const CREAM = '#fff4e6';
const BUN = '#e9b46c';
const RED = '#b8483c';
const MUSTARD = '#f7c948';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
function ease(a, b, x) {
  const k = clamp((x - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
}
function outBack(u) {
  const s = 1.70158;
  const x = u - 1;
  return 1 + (s + 1) * x * x * x + s * x * x;
}

let S = null;

export function init(ctx) {
  S = {
    cues: Object.create(null),
    chomps: [1.0, 1.7, 2.4, 3.05],
    seed: Math.floor(ctx.rand() * 1000),
    endAt: 11.4,
  };
}

export function dispose() {}

/* ---------- tiny sketch kit ---------- */

function roundRectPath(g, x, y, w, h, r) {
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

function ellipsePts(g, x, y, rx, ry, rot, t, seed, amp) {
  const n = 26;
  const cr = Math.cos(rot);
  const sr = Math.sin(rot);
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * TAU;
    const wob =
      Math.sin(a * 3 + t * 2.0 + seed) * amp +
      Math.sin(a * 5 - t * 1.6 + seed * 1.7) * amp * 0.45;
    const ex = Math.cos(a) * (rx + wob);
    const ey = Math.sin(a) * (ry + wob);
    const px = x + ex * cr - ey * sr;
    const py = y + ex * sr + ey * cr;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

function shape(g, x, y, rx, ry, rot, t, seed, amp, fill, lw) {
  ellipsePts(g, x, y, Math.max(1, rx), Math.max(1, ry), rot, t, seed, amp);
  if (fill) {
    g.fillStyle = fill;
    g.fill();
  }
  g.strokeStyle = INK;
  g.lineWidth = lw || 3.2;
  g.lineJoin = 'round';
  g.stroke();
}

function limb(g, pts, w, seed) {
  const trace = () => {
    g.beginPath();
    g.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const q = pts[i + 1];
      g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
    }
    const last = pts[pts.length - 1];
    g.lineTo(last[0], last[1]);
  };
  g.lineCap = 'round';
  g.lineJoin = 'round';
  trace();
  g.strokeStyle = INK;
  g.lineWidth = w + 6;
  g.stroke();
  trace();
  g.strokeStyle = CREAM;
  g.lineWidth = w;
  g.stroke();
  trace();
  g.strokeStyle = 'rgba(36,26,58,0.22)';
  g.lineWidth = 1.4;
  g.stroke();
}

/* ---------- timing ---------- */

function chewAmount(t) {
  let m = 0;
  for (let i = 0; i < S.chomps.length; i++) {
    const u = (t - S.chomps[i]) / 0.5;
    if (u > 0 && u < 1) m = Math.max(m, Math.sin(u * Math.PI));
  }
  return m;
}

function biteCount(t) {
  let n = 0;
  for (let i = 0; i < S.chomps.length; i++) if (t > S.chomps[i] + 0.42) n++;
  return n;
}

function blinkAmount(t) {
  let b = 0;
  const times = [6.65, 10.2];
  for (let i = 0; i < times.length; i++) {
    const u = (t - times[i]) / 0.24;
    if (u > 0 && u < 1) b = Math.max(b, Math.sin(u * Math.PI));
  }
  return b;
}

function cue(ctx, key, when, t, fn) {
  if (t >= when && !S.cues[key]) {
    S.cues[key] = 1;
    fn();
  }
}

function soundCues(ctx, t) {
  const snd = ctx.sound;
  cue(ctx, 'pop', 0.05, t, () => {
    snd.beep(170, 120);
    snd.noise(130);
  });
  for (let i = 0; i < S.chomps.length; i++) {
    const ct = S.chomps[i];
    cue(ctx, 'chomp' + i, ct + 0.18, t, () => {
      snd.beep(110 + i * 14, 90);
      snd.noise(90);
    });
  }
  cue(ctx, 'turn1', 4.02, t, () => {
    snd.beep(300, 90);
    snd.noise(240);
  });
  cue(ctx, 'turn2', 4.36, t, () => snd.beep(380, 80));
  cue(ctx, 'turn3', 4.7, t, () => snd.beep(470, 80));
  cue(ctx, 'squeak1', 6.05, t, () => snd.beep(880, 170));
  cue(ctx, 'squeak2', 6.4, t, () => snd.beep(1180, 120));
  cue(ctx, 'bubble', 7.4, t, () => snd.beep(720, 90));
  cue(ctx, 'fin', 9.6, t, () => snd.beep(520, 110));
}

/* ---------- layout ---------- */

function anchor(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const stm = ctx.streamer;
  let ax = W * 0.5;
  let s = Math.min(H / 560, W / 1000) * (stm ? 0.88 : 1);
  if (stm) {
    const cx = stm.x + stm.w / 2;
    ax = W * (cx <= 0.5 ? 0.8 : 0.2);
  }
  const maxS = Math.min((ax - W * 0.06) / 115, (W * 0.94 - ax) / 115);
  if (maxS > 0) s = Math.min(s, maxS);
  return { ax, ay: H * 0.85, s };
}

/* ---------- the set ---------- */

function drawToilet(g, t, seed) {
  g.beginPath();
  g.ellipse(0, 10, 84, 12, 0, 0, TAU);
  g.fillStyle = 'rgba(36,26,58,0.16)';
  g.fill();

  g.beginPath();
  roundRectPath(g, -74, -238, 148, 108, 16);
  g.fillStyle = CREAM;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3.2;
  g.lineJoin = 'round';
  g.stroke();

  ellipsePts(g, 0, -238, 82, 11, 0, t, seed + 4, 1.4);
  g.fillStyle = CREAM;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.stroke();

  g.beginPath();
  g.arc(0, -241, 6, 0, TAU);
  g.fillStyle = '#ffd6e6';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();

  g.beginPath();
  g.moveTo(74, -200);
  g.lineTo(92, -206);
  g.strokeStyle = INK;
  g.lineWidth = 5;
  g.lineCap = 'round';
  g.stroke();

  g.beginPath();
  g.moveTo(-62, -106);
  g.bezierCurveTo(-64, -74, -40, -18, -32, -14);
  g.lineTo(32, -14);
  g.bezierCurveTo(40, -18, 64, -74, 62, -106);
  g.closePath();
  g.fillStyle = CREAM;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3.4;
  g.stroke();

  ellipsePts(g, 0, -106, 68, 16, 0, t, seed + 5, 1.5);
  g.fillStyle = '#fff9f0';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3.2;
  g.stroke();

  ellipsePts(g, 0, -106, 40, 8, 0, t, seed + 6, 1.0);
  g.strokeStyle = 'rgba(36,26,58,0.4)';
  g.lineWidth = 2;
  g.stroke();
}

function hotdog(g, x, y, rot, len, t) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  ellipsePts(g, 0, 0, 34 * len, 11, 0, t, 3, 1.2);
  g.fillStyle = BUN;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.stroke();

  ellipsePts(g, 0, -3, 30 * len, 6.5, 0, t, 7, 0.9);
  g.fillStyle = RED;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2;
  g.stroke();

  g.beginPath();
  for (let i = 0; i <= 10; i++) {
    const u = i / 10;
    const px = lerp(-24 * len, 24 * len, u);
    const py = -6 + Math.sin(u * Math.PI * 3 + t * 1.5) * 3;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.strokeStyle = MUSTARD;
  g.lineWidth = 3;
  g.lineCap = 'round';
  g.stroke();
  g.restore();
}

/* ---------- the doodle ---------- */

function drawHead(g, ctx, t, rot, faceOff, chew, A, blink, seed) {
  g.save();
  g.translate(0, -218);
  g.rotate(rot);
  g.translate(0, 218);

  shape(g, 0, -262, 52, 50, 0, t, seed, 2.2, CREAM, 3.4);
  shape(g, -50, -256, 10, 11, 0, t, seed + 1, 1.2, CREAM, 2.8);
  shape(g, 50, -256, 10, 11, 0, t, seed + 2, 1.2, CREAM, 2.8);

  g.strokeStyle = INK;
  g.lineWidth = 2.6;
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const x = -18 + i * 18;
    g.beginPath();
    g.moveTo(x, -306);
    g.quadraticCurveTo(
      x + Math.sin(t * 2 + i) * 4,
      -318,
      x + 3 + Math.sin(t * 2.5 + i) * 3,
      -326
    );
    g.stroke();
  }

  drawFace(g, ctx, t, faceOff, chew, A, blink);
  g.restore();
}

function drawFace(g, ctx, t, fx, chew, A, blink) {
  g.lineCap = 'round';

  for (let side = -1; side <= 1; side += 2) {
    const ex = fx + side * 17;
    const ey = -272;
    const er = 4 + 7.5 * A;
    const ery = Math.max(0.7, er * (1 - 0.78 * blink));
    g.beginPath();
    g.ellipse(ex, ey, er, ery, 0, 0, TAU);
    g.fillStyle = A > 0.25 ? '#fffdf6' : INK;
    g.fill();
    if (A > 0.25) {
      g.strokeStyle = INK;
      g.lineWidth = 2.4;
      g.stroke();
      g.beginPath();
      g.ellipse(
        ex + side * 1.6,
        ey + 1.2,
        3,
        Math.max(0.7, 3 * (1 - blink * 0.85)),
        0,
        0,
        TAU
      );
      g.fillStyle = INK;
      g.fill();
    }
  }

  const br = 3 + A * 6;
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(fx - 27, -288 - br);
  g.quadraticCurveTo(fx - 17, -293 - br, fx - 7, -288 - br);
  g.stroke();
  g.beginPath();
  g.moveTo(fx + 7, -288 - br);
  g.quadraticCurveTo(fx + 17, -293 - br, fx + 27, -288 - br);
  g.stroke();

  g.lineWidth = 2.6;
  g.beginPath();
  g.moveTo(fx - 2, -266);
  g.quadraticCurveTo(fx + 6, -261, fx - 1, -256);
  g.stroke();

  const mw = 9 + 20 * A;
  const top = -247;
  const depth = (2 + 10 * chew) * (1 - A) + 15 * A;
  g.beginPath();
  g.moveTo(fx - mw, top);
  g.quadraticCurveTo(fx, top + depth * 2, fx + mw, top);
  g.quadraticCurveTo(fx, top - 2.5, fx - mw, top);
  g.closePath();
  g.fillStyle = A > 0.55 ? '#ffe6d8' : INK;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 2.7;
  g.stroke();

  if (A > 0.5) {
    const ta = (A - 0.5) * 2;
    g.save();
    g.globalAlpha *= ta;
    g.strokeStyle = INK;
    g.lineWidth = 2.2;
    for (let i = -1; i <= 1; i++) {
      const x = fx + i * 11;
      g.beginPath();
      g.moveTo(x, top + 1);
      g.lineTo(x + i * 1.5, top + 7);
      g.stroke();
    }
    g.restore();
  }

  if (A > 0.02) {
    g.save();
    g.globalAlpha *= A * 0.55;
    g.fillStyle = ctx.accent || '#ff6fa5';
    g.beginPath();
    g.ellipse(fx - 33, -257, 10, 6, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(fx + 33, -257, 10, 6, 0, 0, TAU);
    g.fill();
    g.restore();
  }

  const swIn = ease(6.3, 6.6, t);
  if (swIn > 0.02) {
    const fall = Math.max(0, t - 7.6);
    const sy = -290 + fall * 44;
    const a = swIn * (1 - clamp(fall / 0.9, 0, 1));
    if (a > 0.02) {
      g.save();
      g.globalAlpha *= a;
      g.beginPath();
      g.moveTo(fx + 46, sy - 9);
      g.quadraticCurveTo(fx + 53, sy, fx + 46, sy + 3);
      g.quadraticCurveTo(fx + 39, sy, fx + 46, sy - 9);
      g.fillStyle = '#8fd8ff';
      g.fill();
      g.strokeStyle = INK;
      g.lineWidth = 2;
      g.stroke();
      g.restore();
    }
  }
}

function drawDoodle(g, ctx, t, A, chew, turnE, blink, seed) {
  const bounce = -chew * 2.5;
  const turnU = turnE;

  limb(g, [[-20, -106], [-30, -70], [-31, -38]], 17, seed);
  limb(g, [[20, -106], [30, -70], [31, -38]], 17, seed + 1);
  shape(g, -34, -33, 16, 9, -0.12, t, seed + 2, 1.0, CREAM, 3);
  shape(g, 34, -33, 16, 9, 0.12, t, seed + 3, 1.0, CREAM, 3);

  shape(g, 0, -168 + bounce, 46, 59, 0, t, seed + 7, 2.0, CREAM, 3.4);

  const hx = lerp(36, 47, turnE);
  const hy = lerp(-232, -212, turnE);
  limb(g, [[-40, -186], [-59, -156], [-53, -127]], 16, seed + 8);
  limb(g, [[40, -188], [58, -212], [hx, hy]], 16, seed + 9);

  let rot =
    lerp(-0.22, 0, turnE) +
    Math.sin(turnU * Math.PI * 3) * 0.07 * (1 - turnE) +
    Math.sin(t * 0.9) * 0.028 * A;

  const faceOff = lerp(15, 0, turnE);
  drawHead(g, ctx, t, rot, faceOff, chew, A, blink, seed);

  const bites = biteCount(t);
  const len = Math.max(0.42, 1 - bites * 0.12);
  const hrot = lerp(-0.55, 0.4, turnE) + Math.sin(t * 1.2) * 0.03 * A;
  hotdog(g, hx, hy, hrot, len, t);

  const dripU = clamp((t - 6.5) / 1.4, 0, 1);
  if (t > 6.4) {
    g.beginPath();
    g.arc(hx - 4, hy + 14 + dripU * 40, 3, 0, TAU);
    g.fillStyle = MUSTARD;
    g.fill();
  }
}

function drawLabel(g, t, seed) {
  const a = ease(0.2, 0.6, t);
  g.save();
  g.globalAlpha *= a;
  g.font = 'italic 700 26px "Comic Sans MS", "Segoe Print", cursive';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = INK;
  g.fillText('doodle dank', 0, 44);
  g.beginPath();
  g.moveTo(-72, 60);
  for (let i = 0; i <= 8; i++) {
    const x = -72 + i * 18;
    g.lineTo(x, 60 + Math.sin(i * 2.1 + t * 1.4) * 2.4);
  }
  g.strokeStyle = INK;
  g.lineWidth = 2.4;
  g.stroke();
  g.restore();
}

function drawBubble(g, t) {
  const u = clamp((t - 7.4) / 0.45, 0, 1);
  if (u <= 0) return;
  const k = outBack(u);
  const a = ease(7.35, 7.55, t);
  g.save();
  g.globalAlpha *= a;
  g.translate(108, -344);
  g.scale(k, k);
  g.translate(-108, 344);

  g.beginPath();
  roundRectPath(g, 108 - 46, -344 - 32, 92, 64, 20);
  g.fillStyle = '#fffdf6';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3.2;
  g.stroke();

  g.beginPath();
  g.moveTo(70, -284);
  g.quadraticCurveTo(62, -270, 50, -270);
  g.quadraticCurveTo(64, -266, 76, -278);
  g.closePath();
  g.fillStyle = '#fffdf6';
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.stroke();

  g.font = 'italic 700 34px "Comic Sans MS", "Segoe Print", cursive';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = INK;
  g.fillText('hi.', 110, -344);
  g.restore();
}

function drawStreamerNote(ctx, t) {
  const a = Math.min(ease(8.6, 9.3, t), 1 - ease(10.5, 11.1, t));
  if (a <= 0.01) return;
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const stm = ctx.streamer;

  let cx = W * 0.5;
  let cy = H * 0.09;
  if (stm) {
    cx = (stm.x + stm.w / 2) * W;
    cy = (stm.y + stm.h) * H + 30;
  }
  cx = clamp(cx, W * 0.22, W * 0.78);
  cy = clamp(cy, H * 0.07, H * 0.93);

  const fz = clamp(Math.min(W, H) * 0.024, 13, 24);
  g.save();
  g.globalAlpha = a;
  g.translate(cx, cy);
  g.rotate(-0.015);
  g.font = 'italic 700 ' + fz + 'px "Comic Sans MS", "Segoe Print", cursive';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(3, fz * 0.24);
  g.strokeStyle = 'rgba(18,10,30,0.85)';
  g.strokeText('SavorySailor, blink twice.', 0, 0);
  g.fillStyle = CREAM;
  g.fillText('SavorySailor, blink twice.', 0, 0);
  g.restore();
}

/* ---------- frame ---------- */

export function frame(ctx, t, dt) {
  if (!S) return;
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);

  const turnU = clamp((t - 4.0) / 1.15, 0, 1);
  const turnE = turnU * turnU * (3 - 2 * turnU);
  const A = ease(5.25, 7.1, t);
  const chew = chewAmount(t);
  const blink = blinkAmount(t);
  const popIn = ease(0, 0.3, t);
  const z = 1 + 0.12 * ease(5.2, 10.4, t);

  soundCues(ctx, t);

  const lay = anchor(ctx);
  const jx = Math.sin(t * 2.7) * 0.6 * A;
  const jy = Math.cos(t * 3.1) * 0.6 * A;

  g.save();
  g.globalAlpha = popIn;
  g.translate(lay.ax, lay.ay);
  g.scale(lay.s * z, lay.s * z);
  g.translate(jx, jy);

  drawToilet(g, t, S.seed);
  drawDoodle(g, ctx, t, A, chew, turnE, blink, S.seed);
  drawLabel(g, t, S.seed);
  drawBubble(g, t);

  g.restore();

  drawStreamerNote(ctx, t);

  cue(ctx, 'end', S.endAt, t, () => ctx.done());
}
