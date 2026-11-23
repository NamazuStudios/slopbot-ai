export const meta = {
  title: 'Wobbly Eggplant Jackpot',
  author: 'cooooter',
  prompt: 'A shot machine appears. The first pull lands Cherry, 7 and a golden bell. The second pull lands three eggplants and prompts !slop wobbly-frank-reveal.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

/* ============================================================
   WOBBLY EGGPLANT JACKPOT
   A one-armed bandit drops into frame, reads SavorySailor's
   future, and refuses to be subtle about it. Transparent glass:
   the live shot stays visible under every bulb and bracket.
   ============================================================ */

const STREAMER_NAME = 'SavorySailor';
const CAMEO = 'wobbly-frank-reveal';

const T = {
  IN: 0.05,
  IN_END: 1.0,
  PULL1: 2.35,
  PULL1_END: 2.72,
  SPIN1: 2.72,
  STOP1: [4.60, 5.15, 5.75],
  PULL2: 7.45,
  PULL2_END: 7.85,
  SPIN2: 7.85,
  STOP2: [10.90, 11.45, 12.05],
  WIN: 12.10,
  RECEIPT: 13.60,
  CAMEO: 15.80,
  DONE: 18.00,
};

const GOLD = '#f4c73c';
const GOLD_DARK = '#9c6c14';
const GOLD_PALE = '#ffe9a3';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => clamp(v, 0, 1);
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - Math.pow(1 - clamp01(p), 3);
const easeInOut = (p) => {
  p = clamp01(p);
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
};
const easeOutBack = (p) => {
  p = clamp01(p);
  const s = 1.70158;
  return 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
};

/* ---------------------------------------------------------------- icons */

function iconCherry(c, s) {
  c.save();
  c.strokeStyle = '#4f8a3a';
  c.lineWidth = s * 0.075;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -s * 0.40);
  c.quadraticCurveTo(-s * 0.06, -s * 0.18, -s * 0.20, s * 0.06);
  c.moveTo(0, -s * 0.40);
  c.quadraticCurveTo(s * 0.05, -s * 0.16, s * 0.19, s * 0.07);
  c.stroke();
  c.fillStyle = '#63a84a';
  c.beginPath();
  c.ellipse(s * 0.12, -s * 0.40, s * 0.16, s * 0.075, -0.5, 0, Math.PI * 2);
  c.fill();
  for (const [cx, cy, r] of [
    [-s * 0.21, s * 0.16, s * 0.225],
    [s * 0.2, s * 0.2, s * 0.21],
  ]) {
    const g = c.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, '#ff7a6b');
    g.addColorStop(0.55, '#d9262f');
    g.addColorStop(1, '#7d0d18');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.ellipse(cx - r * 0.33, cy - r * 0.4, r * 0.24, r * 0.15, -0.7, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function iconSeven(c, s) {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 ${s * 0.95}px Georgia, "Times New Roman", serif`;
  c.lineJoin = 'round';
  c.lineWidth = s * 0.12;
  c.strokeStyle = '#5c0713';
  c.strokeText('7', 0, s * 0.04);
  const g = c.createLinearGradient(0, -s * 0.45, 0, s * 0.45);
  g.addColorStop(0, '#ff8577');
  g.addColorStop(0.5, '#e02334');
  g.addColorStop(1, '#a30d1e');
  c.fillStyle = g;
  c.fillText('7', 0, s * 0.04);
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.lineWidth = s * 0.035;
  c.strokeText('7', 0, s * 0.04);
  c.restore();
}

function iconBell(c, s) {
  c.save();
  c.beginPath();
  c.moveTo(-s * 0.36, s * 0.22);
  c.quadraticCurveTo(-s * 0.3, s * 0.1, -s * 0.27, -s * 0.02);
  c.quadraticCurveTo(-s * 0.24, -s * 0.33, 0, -s * 0.36);
  c.quadraticCurveTo(s * 0.24, -s * 0.33, s * 0.27, -s * 0.02);
  c.quadraticCurveTo(s * 0.3, s * 0.1, s * 0.36, s * 0.22);
  c.closePath();
  const g = c.createLinearGradient(-s * 0.3, -s * 0.35, s * 0.3, s * 0.25);
  g.addColorStop(0, '#fff3b8');
  g.addColorStop(0.35, '#f6cd4c');
  g.addColorStop(0.7, '#d09a1a');
  g.addColorStop(1, '#8f5f0b');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = '#6d430a';
  c.lineWidth = s * 0.045;
  c.stroke();
  c.beginPath();
  c.ellipse(s * 0.12, -s * 0.42, s * 0.075, s * 0.055, 0.2, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#7a4b0c';
  c.beginPath();
  c.arc(0, s * 0.27, s * 0.085, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = s * 0.055;
  c.beginPath();
  c.moveTo(-s * 0.13, s * 0.02);
  c.quadraticCurveTo(-s * 0.12, -s * 0.22, 0, -s * 0.27);
  c.stroke();
  c.restore();
}

function iconEggplant(c, s) {
  c.save();
  c.rotate(-0.28);
  const g = c.createLinearGradient(-s * 0.25, -s * 0.3, s * 0.3, s * 0.4);
  g.addColorStop(0, '#c07bde');
  g.addColorStop(0.35, '#8b3fb0');
  g.addColorStop(0.75, '#4b1670');
  g.addColorStop(1, '#2a0a40');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, -s * 0.36);
  c.bezierCurveTo(s * 0.2, -s * 0.3, s * 0.36, -s * 0.02, s * 0.33, s * 0.2);
  c.bezierCurveTo(s * 0.31, s * 0.41, s * 0.1, s * 0.48, -s * 0.05, s * 0.45);
  c.bezierCurveTo(-s * 0.3, s * 0.42, -s * 0.38, s * 0.18, -s * 0.32, -s * 0.06);
  c.bezierCurveTo(-s * 0.28, -s * 0.28, -s * 0.14, -s * 0.34, 0, -s * 0.36);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(255,210,255,0.32)';
  c.lineWidth = s * 0.03;
  c.stroke();
  c.fillStyle = '#5a9c3c';
  c.beginPath();
  c.moveTo(0, -s * 0.31);
  c.quadraticCurveTo(-s * 0.2, -s * 0.44, -s * 0.3, -s * 0.33);
  c.quadraticCurveTo(-s * 0.16, -s * 0.26, -s * 0.03, -s * 0.27);
  c.quadraticCurveTo(s * 0.18, -s * 0.45, s * 0.29, -s * 0.34);
  c.quadraticCurveTo(s * 0.15, -s * 0.24, 0, -s * 0.27);
  c.closePath();
  c.fill();
  c.strokeStyle = '#3d6e2a';
  c.lineWidth = s * 0.055;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -s * 0.34);
  c.lineTo(s * 0.04, -s * 0.48);
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.beginPath();
  c.ellipse(s * 0.03, s * 0.02, s * 0.085, s * 0.18, 0.2, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function iconLemon(c, s) {
  c.save();
  c.rotate(0.35);
  const g = c.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.05, 0, 0, s * 0.38);
  g.addColorStop(0, '#fff7a6');
  g.addColorStop(0.6, '#f6d735');
  g.addColorStop(1, '#b48c09');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, 0, s * 0.36, s * 0.25, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-s * 0.36, 0);
  c.lineTo(-s * 0.44, -s * 0.04);
  c.lineTo(-s * 0.35, s * 0.07);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(s * 0.36, 0);
  c.lineTo(s * 0.44, -s * 0.04);
  c.lineTo(s * 0.35, s * 0.07);
  c.closePath();
  c.fill();
  c.restore();
}

function iconGrape(c, s) {
  c.save();
  c.strokeStyle = '#4d7c30';
  c.lineWidth = s * 0.05;
  c.beginPath();
  c.moveTo(0, -s * 0.3);
  c.lineTo(0, -s * 0.42);
  c.stroke();
  c.fillStyle = '#5f9a3c';
  c.beginPath();
  c.ellipse(s * 0.1, -s * 0.42, s * 0.12, s * 0.06, -0.4, 0, Math.PI * 2);
  c.fill();
  const pts = [
    [-0.15, -0.2],
    [0.15, -0.2],
    [0, -0.03],
    [-0.2, 0.12],
    [0.2, 0.12],
    [0, 0.26],
  ];
  for (const [px, py] of pts) {
    const g = c.createRadialGradient(px * s - s * 0.04, py * s - s * 0.05, s * 0.02, px * s, py * s, s * 0.16);
    g.addColorStop(0, '#b06fd0');
    g.addColorStop(1, '#4c1a6b');
    c.fillStyle = g;
    c.beginPath();
    c.arc(px * s, py * s, s * 0.145, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function iconStar(c, s) {
  c.save();
  c.fillStyle = GOLD;
  c.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? s * 0.42 : s * 0.18;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.closePath();
  const g = c.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
  g.addColorStop(0, '#fff3ba');
  g.addColorStop(1, '#c58a12');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = '#8d5f08';
  c.lineWidth = s * 0.03;
  c.stroke();
  c.restore();
}

const ICON_DRAW = [iconCherry, iconSeven, iconBell, iconLemon, iconGrape, iconStar, iconEggplant];
const CHERRY = 0;
const SEVEN = 1;
const BELL = 2;
const EGGPLANT = 6;

const ICON_COUNT = ICON_DRAW.length;

/* --------------------------------------------------------------- sounds */

function makeCues() {
  const beep = (t, f, ms) => ({ t, f, ms });
  return [
    beep(0.10, 240, 90),
    beep(0.30, 190, 110),
    { t: 0.78, f: 0, ms: 180 },
    beep(0.86, 120, 140),
    beep(1.35, 620, 60),
    beep(1.55, 780, 60),
    beep(2.36, 420, 70),
    beep(2.48, 340, 70),
    beep(2.60, 260, 80),
    { t: 2.72, f: 0, ms: 130 },
    beep(4.60, 175, 110),
    { t: 4.60, f: 0, ms: 90 },
    beep(5.15, 152, 120),
    { t: 5.15, f: 0, ms: 100 },
    beep(5.75, 128, 170),
    { t: 5.75, f: 0, ms: 150 },
    beep(6.05, 300, 100),
    beep(6.28, 252, 120),
    beep(6.55, 196, 230),
    beep(7.46, 460, 70),
    beep(7.58, 360, 70),
    beep(7.70, 280, 80),
    { t: 7.85, f: 0, ms: 220 },
    beep(10.90, 168, 130),
    { t: 10.90, f: 0, ms: 120 },
    beep(11.45, 144, 150),
    { t: 11.45, f: 0, ms: 160 },
    beep(12.05, 112, 220),
    { t: 12.05, f: 0, ms: 220 },
    beep(12.12, 523, 110),
    beep(12.24, 659, 110),
    beep(12.36, 784, 120),
    beep(12.48, 1046, 130),
    beep(12.62, 1318, 180),
    beep(12.95, 784, 100),
    beep(13.10, 1046, 100),
    beep(13.25, 1318, 220),
    beep(13.62, 880, 50),
    beep(13.76, 990, 50),
    beep(13.90, 1100, 60),
    beep(15.82, 400, 80),
    beep(15.94, 600, 80),
    beep(16.06, 800, 120),
  ];
}

/* ---------------------------------------------------------------- state */

let S = null;

export function init(ctx) {
  const confetti = [];
  const sparks = [];
  for (let i = 0; i < 36; i += 1) {
    confetti.push({
      x: ctx.rand(),
      y: ctx.rand() * 0.75 - 0.55,
      vy: 0.16 + ctx.rand() * 0.2,
      drift: (ctx.rand() - 0.5) * 0.13,
      rot: ctx.rand() * Math.PI * 2,
      spin: (ctx.rand() - 0.5) * 5,
      size: 0.4 + ctx.rand() * 0.6,
      delay: ctx.rand() * 0.9,
    });
  }
  for (let i = 0; i < 26; i += 1) {
    sparks.push({
      a: ctx.rand() * Math.PI * 2,
      v: 0.25 + ctx.rand() * 0.55,
      size: 0.25 + ctx.rand() * 0.6,
      life: 0.7 + ctx.rand() * 0.9,
    });
  }
  S = {
    cues: makeCues(),
    cueIdx: 0,
    tickAt: -1,
    cameoFired: false,
    doneFired: false,
    confetti,
    sparks,
  };
}

function fireCues(ctx, t) {
  while (S.cueIdx < S.cues.length && t >= S.cues[S.cueIdx].t) {
    const q = S.cues[S.cueIdx];
    S.cueIdx += 1;
    if (q.f > 0) ctx.sound.beep(q.f, q.ms);
    else ctx.sound.noise(q.ms);
  }
}

function spinTicks(ctx, t) {
  let window = null;
  let interval = 0;
  let freq = 0;
  if (t >= T.SPIN1 && t < T.STOP1[2]) {
    window = t;
    const p = clamp01((t - T.SPIN1) / (T.STOP1[2] - T.SPIN1));
    interval = lerp(0.115, 0.062, p);
    freq = lerp(1350, 900, p);
  } else if (t >= T.SPIN2 && t < T.STOP2[2]) {
    window = t;
    const p = clamp01((t - T.SPIN2) / (T.STOP2[2] - T.SPIN2));
    interval = lerp(0.1, 0.05, p);
    freq = lerp(1500, 760, p);
  }
  if (window === null) return;
  if (S.tickAt < 0 || t - S.tickAt >= interval) {
    S.tickAt = t;
    ctx.sound.beep(freq, 32);
  }
}

/* ------------------------------------------------------------- geometry */

function machineGeom(ctx, t) {
  const W = ctx.width;
  const H = ctx.height;
  const mh = Math.min(H * 0.66, W * 0.58);
  const mw = mh * 0.68;

  let cx = W * 0.7;
  const st = ctx.streamer;
  if (st) {
    const scx = (st.x + st.w / 2) * W;
    cx = scx > W * 0.5 ? W * 0.27 : W * 0.73;
  }

  const inP = clamp01((t - T.IN) / (T.IN_END - T.IN));
  const drop = (1 - easeOutBack(inP)) * (H * 0.62);
  const wobble = (1 - easeOut(inP)) * Math.sin(t * 9) * 0.035;

  let shake = 0;
  if (t >= T.SPIN2 && t < T.STOP2[2]) {
    const p = clamp01((t - T.SPIN2) / (T.STOP2[2] - T.SPIN2));
    shake = 1.4 + p * 4.6;
  }
  const after = t - T.STOP2[2];
  if (t >= T.STOP2[2] && after < 0.9) shake = 4.8 * Math.exp(-after * 5);

  const sx = Math.sin(t * 51) * shake;
  const sy = Math.cos(t * 43) * shake * 0.7;

  return {
    W,
    H,
    cx,
    cy: H * 0.48 + drop + sy,
    mw,
    mh,
    rot: wobble,
    alpha: clamp01(inP * 1.8),
    sx,
    drop,
  };
}

/* --------------------------------------------------------------- labels */

function captionFor(t) {
  if (t >= 0.95 && t < 2.3) return `The machine has a prophecy for ${STREAMER_NAME}.`;
  if (t >= 2.35 && t < 4.45) return 'One pull. One destiny. Zero refunds.';
  if (t >= 5.8 && t < 7.4) return 'Cherry. Seven. Bell. The machine is deeply unimpressed.';
  if (t >= 7.5 && t < 9.3) return 'Fine. Second pull. The machine gets one more chance to be interesting.';
  if (t >= 9.35 && t < 10.8) return 'Something purple is loading.';
  if (t >= T.WIN && t < T.RECEIPT) return 'EGGPLANT CUBED. The prophecy is produce.';
  if (t >= T.RECEIPT && t < T.CAMEO) return `Payout approved: one wobbly frank. For ${STREAMER_NAME}. Act natural.`;
  if (t >= T.CAMEO && t < T.DONE) return 'The wobbly frank protocol is engaged. Nobody look directly at it.';
  return '';
}

function drawCaption(c, ctx, text, t) {
  if (!text) return;
  const W = ctx.width;
  const H = ctx.height;
  const st = ctx.streamer;
  const bottomBlocked = st ? (st.y + st.h) * H > H * 0.74 : false;
  const cy = bottomBlocked ? H * 0.1 : H * 0.9;

  const fs = clamp(H * 0.033, 13, 46);
  c.save();
  c.font = `700 ${fs}px "Segoe UI", system-ui, Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const maxW = W * 0.74;
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (c.measureText(test).width > maxW && cur) {
      lines.push(cur);
      cur = w;
    } else cur = test;
  }
  if (cur) lines.push(cur);
  const lineH = fs * 1.28;
  const blockH = lines.length * lineH;
  const widest = Math.max(...lines.map((l) => c.measureText(l).width));
  const padX = fs * 0.9;
  const padY = fs * 0.55;
  const boxW = Math.min(W * 0.94, widest + padX * 2);
  const boxH = blockH + padY * 2;
  const alpha = clamp01(Math.min(1, (t % 1) * 4 + 0.005));
  c.globalAlpha = 0.96;

  c.beginPath();
  const x = W / 2 - boxW / 2;
  const y = cy - boxH / 2;
  rr(c, x, y, boxW, boxH, Math.min(boxH / 2, fs * 0.8));
  const g = c.createLinearGradient(x, y, x, y + boxH);
  g.addColorStop(0, 'rgba(10,16,32,0.9)');
  g.addColorStop(1, 'rgba(24,10,30,0.9)');
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = 'rgba(244,199,60,0.8)';
  c.lineWidth = Math.max(1.5, fs * 0.06);
  c.stroke();

  c.shadowColor = 'rgba(0,0,0,0.85)';
  c.shadowBlur = fs * 0.5;
  for (let i = 0; i < lines.length; i += 1) {
    const ly = cy - blockH / 2 + lineH * (i + 0.5);
    c.fillStyle = i === 0 ? GOLD_PALE : '#ffffff';
    c.fillText(lines[i], W / 2, ly);
  }
  c.restore();
}

/* ----------------------------------------------------------------- art */

function rr(c, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
}

function drawStreamerBrackets(c, ctx, t) {
  const st = ctx.streamer;
  if (!st) return;
  const W = ctx.width;
  const H = ctx.height;
  const x = st.x * W;
  const y = st.y * H;
  const w = st.w * W;
  const h = st.h * H;
  const corner = Math.min(w, h) * 0.16;
  const pulse = 0.45 + Math.sin(t * 2.1) * 0.16;

  c.save();
  c.strokeStyle = `rgba(255,236,170,${pulse})`;
  c.lineWidth = Math.max(2, H * 0.0028);
  c.lineCap = 'round';
  c.beginPath();
  const pts = [
    [x, y + corner, x, y, x + corner, y],
    [x + w - corner, y, x + w, y, x + w, y + corner],
    [x + w, y + h - corner, x + w, y + h, x + w - corner, y + h],
    [x + corner, y + h, x, y + h, x, y + h - corner],
  ];
  for (const p of pts) {
    c.moveTo(p[0], p[1]);
    c.lineTo(p[2], p[3]);
    c.lineTo(p[4], p[5]);
  }
  c.stroke();

  const fs = clamp(H * 0.019, 9, 20);
  c.font = `700 ${fs}px "Segoe UI", system-ui, Arial, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'bottom';
  const label = `SUBJECT 01 · ${STREAMER_NAME.toUpperCase()}`;
  const tw = c.measureText(label).width;
  c.fillStyle = 'rgba(8,12,24,0.72)';
  rr(c, x, y - fs * 2.0, tw + fs * 1.1, fs * 1.7, fs * 0.5);
  c.fill();
  c.fillStyle = GOLD_PALE;
  c.fillText(label, x + fs * 0.55, y - fs * 0.45);
  c.restore();
}

function drawRayBurst(c, g, t) {
  const p = easeOut((t - T.WIN) / 0.9);
  if (p <= 0) return;
  const R = g.mh * 1.35;
  const rot = t * 0.35;
  c.save();
  c.translate(g.cx, g.cy);
  c.globalAlpha = 0.16 * p * (0.7 + Math.sin(t * 3.1) * 0.18);
  for (let i = 0; i < 18; i += 1) {
    const a = rot + (i / 18) * Math.PI * 2;
    c.save();
    c.rotate(a);
    const grad = c.createLinearGradient(0, 0, R, 0);
    grad.addColorStop(0, 'rgba(255,225,130,0.85)');
    grad.addColorStop(1, 'rgba(255,190,60,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(g.mw * 0.1, 0);
    c.lineTo(R, -R * 0.09);
    c.lineTo(R, R * 0.09);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.restore();
}

function drawBeam(c, ctx, g, t) {
  if (!ctx.streamer || t < T.WIN) return;
  const W = ctx.width;
  const H = ctx.height;
  const p = clamp01((t - T.WIN) / 0.8);
  const sx = g.cx;
  const sy = g.cy - g.mh * 0.34;
  const tx = (ctx.streamer.x + ctx.streamer.w / 2) * W;
  const ty = (ctx.streamer.y + ctx.streamer.h / 2) * H;
  c.save();
  c.globalAlpha = 0.35 * p * (0.72 + Math.sin(t * 4.2) * 0.28);
  c.strokeStyle = GOLD_PALE;
  c.lineWidth = Math.max(2, H * 0.006);
  c.setLineDash([H * 0.03, H * 0.026]);
  c.lineDashOffset = -t * H * 0.09;
  c.beginPath();
  c.moveTo(sx, sy);
  c.quadraticCurveTo((sx + tx) / 2, Math.min(sy, ty) - H * 0.09, tx, ty);
  c.stroke();
  c.setLineDash([]);
  c.globalAlpha = 0.4 * p;
  c.beginPath();
  c.arc(tx, ty, Math.max(14, H * 0.055) + Math.sin(t * 5) * H * 0.006, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

function reelOffset(t, stopT, cy, symbolH) {
  if (t >= stopT) {
    const d = t - stopT;
    if (d < 0.5) return Math.sin(d * 22) * Math.exp(-d * 9) * symbolH * 0.05;
    return 0;
  }
  const u = stopT - t;
  return -2.4 * symbolH * u * u;
}

function drawReel(c, x, y, w, h, finalIcon, t, stopT, symbolHSeed) {
  c.save();
  c.beginPath();
  rr(c, x, y, w, h, Math.min(w, h) * 0.14);
  c.clip();

  const bg = c.createLinearGradient(x, y, x, y + h);
  bg.addColorStop(0, 'rgba(4,7,14,0.96)');
  bg.addColorStop(0.5, 'rgba(14,22,38,0.94)');
  bg.addColorStop(1, 'rgba(3,5,10,0.96)');
  c.fillStyle = bg;
  c.fillRect(x, y, w, h);

  const symbolH = h * 0.92;
  const off = reelOffset(t, stopT, y + h / 2, symbolH);
  const u = Math.max(0, stopT - t);
  const speed = t < stopT ? 4.8 * u : 0;

  // motion streaks
  if (speed > 0.4) {
    c.save();
    c.globalAlpha = clamp01(speed * 0.07);
    c.strokeStyle = 'rgba(190,215,255,0.55)';
    c.lineWidth = Math.max(1, w * 0.02);
    for (let i = 0; i < 5; i += 1) {
      const lx = x + w * (0.18 + i * 0.16);
      const ly = y + ((i * 37 + ((t * 350) % h)) % h);
      c.beginPath();
      c.moveTo(lx, ly);
      c.lineTo(lx, ly - h * 0.22);
      c.stroke();
    }
    c.restore();
  }

  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const n = Math.round(off / symbolH);
  const rem = off - n * symbolH;
  for (let j = -2; j <= 2; j += 1) {
    const yy = y + h / 2 + j * symbolH + rem;
    if (yy < y - symbolH || yy > y + h + symbolH) continue;
    const idx = (((finalIcon + j - n) % ICON_COUNT) + ICON_COUNT) % ICON_COUNT;
    c.save();
    c.translate(x + w / 2, yy);
    ICON_DRAW[idx](c, Math.min(w, h) * 0.82);
    c.restore();
  }

  // glass sheen
  const sheen = c.createLinearGradient(x, y, x + w, y + h);
  sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
  sheen.addColorStop(0.22, 'rgba(255,255,255,0.02)');
  sheen.addColorStop(0.62, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(255,255,255,0.08)');
  c.fillStyle = sheen;
  c.fillRect(x, y, w, h);

  c.restore();

  // frame
  c.save();
  c.beginPath();
  rr(c, x, y, w, h, Math.min(w, h) * 0.14);
  c.lineWidth = Math.max(2, w * 0.045);
  c.strokeStyle = 'rgba(30,38,58,0.95)';
  c.stroke();
  c.lineWidth = Math.max(1, w * 0.018);
  c.strokeStyle = 'rgba(255,255,255,0.5)';
  c.stroke();
  c.restore();
}

function drawBulbs(c, x, y, w, h, t, color) {
  const n = 8;
  for (let i = 0; i < n; i += 1) {
    const bx = x + (w * (i + 0.5)) / n;
    const by = y;
    const pulse = 0.45 + 0.55 * Math.max(0, Math.sin(t * 5 - i * 0.8));
    c.save();
    c.globalAlpha = 0.35 + pulse * 0.65;
    c.fillStyle = color;
    c.shadowColor = color;
    c.shadowBlur = 8 + pulse * 14;
    c.beginPath();
    c.arc(bx, by, Math.max(1.6, h * 0.22), 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

function fitFont(c, text, maxW, fs, weight, family) {
  let size = fs;
  for (let i = 0; i < 14; i += 1) {
    c.font = `${weight} ${size}px ${family}`;
    if (c.measureText(text).width <= maxW) break;
    size *= 0.9;
  }
  return size;
}

function statusText(t) {
  if (t < T.PULL1) return 'INSERT DESTINY';
  if (t < T.STOP1[2]) return 'SPINNING…';
  if (t < T.PULL2) return 'LOL. NO.';
  if (t < T.STOP2[2]) return 'PLEASE WAIT';
  if (t < T.RECEIPT) return 'EGGPLANT! EGGPLANT! EGGPLANT!';
  return 'PAYOUT ISSUED';
}

function drawReceipt(c, g, t) {
  const p = clamp01((t - T.RECEIPT) / 1.0);
  if (p <= 0) return;
  const w = g.mw * 0.4;
  const h = g.mh * 0.3 * easeOut(p);
  const x = -w / 2 + Math.sin(t * 2.4) * 2;
  const y = g.mh * 0.32;
  c.save();
  c.translate(x, y);
  c.rotate(0.03);
  c.fillStyle = '#f6f1e2';
  c.shadowColor = 'rgba(0,0,0,0.5)';
  c.shadowBlur = 12;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(w, 0);
  c.lineTo(w, h);
  for (let i = 8; i >= 0; i -= 1) {
    c.lineTo((w * i) / 8, h + (i % 2 === 0 ? 0 : 4));
  }
  c.closePath();
  c.fill();
  c.shadowBlur = 0;

  if (h > g.mh * 0.14) {
    const rw = g.mw * 0.4;
    c.textAlign = 'center';
    c.textBaseline = 'top';
    c.fillStyle = '#3a2a1c';
    const f1 = fitFont(c, 'SAVORY SLOTS', rw * 0.9, g.mw * 0.04, 700, '"Courier New", monospace');
    c.fillText('SAVORY SLOTS', w / 2, h * 0.13);
    c.font = `400 ${f1 * 0.72}px "Courier New", monospace`;
    c.fillText('— PAYOUT SLIP —', w / 2, h * 0.13 + f1 * 1.35);
    const f2 = fitFont(c, '1x WOBBLY FRANK', rw * 0.88, g.mw * 0.045, 700, '"Courier New", monospace');
    c.fillText('1x WOBBLY FRANK', w / 2, h * 0.13 + f1 * 2.5);
    c.fillText('FOR ONE SAILOR', w / 2, h * 0.13 + f1 * 2.5 + f2 * 1.35);
    c.fillStyle = '#8a2a1e';
    const f3 = fitFont(c, 'STATUS: APPROVED', rw * 0.9, g.mw * 0.038, 700, '"Courier New", monospace');
    c.fillText('STATUS: APPROVED', w / 2, h * 0.13 + f1 * 2.5 + f2 * 2.7);
  }
  c.restore();
}

function drawMachine(c, ctx, g, t) {
  const w = g.mw;
  const h = g.mh;

  c.save();
  c.globalAlpha = g.alpha;
  c.translate(g.cx + g.sx, g.cy);
  c.rotate(g.rot);

  // soft halo so the cabinet reads over busy footage
  c.save();
  const halo = c.createRadialGradient(0, 0, h * 0.1, 0, 0, h * 0.66);
  halo.addColorStop(0, 'rgba(10,16,30,0.32)');
  halo.addColorStop(1, 'rgba(10,16,30,0)');
  c.fillStyle = halo;
  c.beginPath();
  c.arc(0, 0, h * 0.66, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // legs
  c.fillStyle = '#0b1220';
  rr(c, -w * 0.36, h * 0.38, w * 0.14, h * 0.075, w * 0.02);
  c.fill();
  rr(c, w * 0.22, h * 0.38, w * 0.14, h * 0.075, w * 0.02);
  c.fill();

  // cabinet
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.65)';
  c.shadowBlur = h * 0.06;
  const body = c.createLinearGradient(-w * 0.5, 0, w * 0.5, 0);
  body.addColorStop(0, 'rgba(22,34,58,0.97)');
  body.addColorStop(0.28, 'rgba(13,21,38,0.97)');
  body.addColorStop(0.72, 'rgba(18,28,48,0.97)');
  body.addColorStop(1, 'rgba(36,20,52,0.97)');
  rr(c, -w * 0.5, -h * 0.5, w, h, w * 0.085);
  c.fillStyle = body;
  c.fill();
  c.restore();

  c.lineWidth = Math.max(2, w * 0.012);
  c.strokeStyle = 'rgba(255,222,140,0.55)';
  rr(c, -w * 0.5, -h * 0.5, w, h, w * 0.085);
  c.stroke();
  c.lineWidth = Math.max(1, w * 0.005);
  c.strokeStyle = 'rgba(255,255,255,0.22)';
  rr(c, -w * 0.468, -h * 0.468, w * 0.936, h * 0.936, w * 0.07);
  c.stroke();

  // corner screws
  for (const [sx, sy] of [
    [-0.45, -0.45],
    [0.45, -0.45],
    [-0.45, 0.45],
    [0.45, 0.45],
  ]) {
    c.fillStyle = 'rgba(210,220,240,0.4)';
    c.beginPath();
    c.arc(sx * w, sy * h, w * 0.011, 0, Math.PI * 2);
    c.fill();
  }

  // topper
  const tw = w * 0.84;
  const th = h * 0.125;
  const tx = -tw / 2;
  const ty = -h * 0.475;
  const topG = c.createLinearGradient(tx, ty, tx, ty + th);
  topG.addColorStop(0, '#ff9ec2');
  topG.addColorStop(0.45, '#e8457f');
  topG.addColorStop(1, '#7d1747');
  c.fillStyle = topG;
  rr(c, tx, ty, tw, th, w * 0.05);
  c.fill();
  c.strokeStyle = 'rgba(255,235,170,0.85)';
  c.lineWidth = Math.max(1.5, w * 0.008);
  rr(c, tx, ty, tw, th, w * 0.05);
  c.stroke();
  drawBulbs(c, tx + tw * 0.03, ty, tw * 0.94, th * 0.34, t, '#ffe27a');
  drawBulbs(c, tx + tw * 0.03, ty + th, tw * 0.94, th * 0.34, t + 0.5, '#ffe27a');

  c.font = `900 ${w * 0.115}px "Segoe UI", system-ui, Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#2a0b1e';
  c.fillText('SALTY SLOTS', 0, ty + th * 0.54);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  const sheen = c.createLinearGradient(0, ty, 0, ty + th);
  sheen.addColorStop(0, 'rgba(255,255,255,0.34)');
  sheen.addColorStop(0.5, 'rgba(255,255,255,0)');
  c.fillStyle = sheen;
  rr(c, tx + tw * 0.01, ty + th * 0.05, tw * 0.98, th * 0.45, w * 0.04);
  c.fill();

  // reel panel
  const px = -w * 0.44;
  const py = -h * 0.325;
  const pw = w * 0.88;
  const ph = h * 0.395;
  c.fillStyle = 'rgba(4,8,16,0.9)';
  rr(c, px, py, pw, ph, w * 0.035);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.2)';
  c.lineWidth = Math.max(1, w * 0.006);
  rr(c, px, py, pw, ph, w * 0.035);
  c.stroke();

  const innerX = px + pw * 0.04;
  const winW = (pw * 0.92 - w * 0.05) / 3;
  const winH = ph * 0.76;
  const winY = py + ph * 0.12;
  const gap = (pw * 0.92 - winW * 3) / 2;
  const finalIcons = [CHERRY, SEVEN, BELL];
  const finalIcons2 = [EGGPLANT, EGGPLANT, EGGPLANT];
  const stop1 = T.STOP1;
  const stop2 = T.STOP2;
  const spinning1 = t < stop1[2];
  const spinning2 = t >= T.SPIN2 && t < stop2[2];

  for (let i = 0; i < 3; i += 1) {
    const wx = innerX + i * (winW + gap);
    let icon;
    let stopT;
    if (t < T.SPIN2 && t >= T.PULL1) {
      icon = finalIcons[i];
      stopT = stop1[i];
    } else if (t >= T.SPIN2) {
      icon = finalIcons2[i];
      stopT = stop2[i];
    } else {
      icon = [CHERRY, EGGPLANT, BELL][i];
      stopT = -1;
    }
    drawReel(c, wx, winY, winW, winH, icon, t, stopT, i);
  }

  // payline
  const lineY = winY + winH / 2;
  const winGlow = t >= T.WIN ? 0.85 : 0.25;
  c.save();
  c.globalAlpha = winGlow * (0.7 + Math.sin(t * 4) * 0.2);
  c.strokeStyle = t >= T.WIN ? GOLD : 'rgba(255,90,120,0.9)';
  c.shadowColor = t >= T.WIN ? GOLD : 'rgba(255,90,120,0.8)';
  c.shadowBlur = 10;
  c.lineWidth = Math.max(1, w * 0.006);
  c.beginPath();
  c.moveTo(px + w * 0.02, lineY);
  c.lineTo(px + pw - w * 0.02, lineY);
  c.stroke();
  c.restore();

  // lower panel
  const lx = -w * 0.42;
  const ly = h * 0.1;
  const lw = w * 0.84;
  const lh = h * 0.235;
  const lower = c.createLinearGradient(lx, ly, lx, ly + lh);
  lower.addColorStop(0, 'rgba(12,19,34,0.95)');
  lower.addColorStop(1, 'rgba(26,14,38,0.95)');
  c.fillStyle = lower;
  rr(c, lx, ly, lw, lh, w * 0.03);
  c.fill();
  c.strokeStyle = 'rgba(255,220,150,0.35)';
  c.lineWidth = Math.max(1, w * 0.005);
  rr(c, lx, ly, lw, lh, w * 0.03);
  c.stroke();

  // status display
  const sfs = fitFont(c, statusText(t), lw * 0.86, w * 0.055, 800, '"Segoe UI", system-ui, Arial, sans-serif');
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const win = t >= T.WIN;
  c.fillStyle = win ? GOLD : '#9fe0ff';
  c.shadowColor = win ? 'rgba(255,200,70,0.9)' : 'rgba(120,210,255,0.7)';
  c.shadowBlur = win ? 18 : 10;
  c.fillText(statusText(t), 0, ly + lh * 0.26);
  c.shadowBlur = 0;

  c.font = `600 ${w * 0.036}px "Segoe UI", system-ui, Arial, sans-serif`;
  c.fillStyle = 'rgba(230,240,255,0.6)';
  c.fillText('SAVORY-APPROVED GAMING', 0, ly + lh * 0.63);

  // coin slot
  c.fillStyle = '#05090f';
  rr(c, -w * 0.1, ly + lh * 0.74, w * 0.2, lh * 0.14, w * 0.012);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.lineWidth = 1;
  c.stroke();
  const coinPulse = 0.5 + 0.5 * Math.sin(t * 3.5);
  c.fillStyle = `rgba(255,214,90,${0.35 + coinPulse * 0.4})`;
  c.beginPath();
  c.arc(-w * 0.128, ly + lh * 0.81, w * 0.016, 0, Math.PI * 2);
  c.fill();

  // handle
  const pivotX = w * 0.5;
  const pivotY = -h * 0.02;
  let pullP = 0;
  if (t >= T.PULL1 && t < T.PULL1_END) pullP = easeInOut((t - T.PULL1) / (T.PULL1_END - T.PULL1));
  else if (t >= T.PULL2 && t < T.PULL2_END) pullP = easeInOut((t - T.PULL2) / (T.PULL2_END - T.PULL2));
  else if (t >= T.PULL2_END && t < T.PULL2_END + 0.22) pullP = 1 - easeOut((t - T.PULL2_END) / 0.22);
  else if (t >= T.PULL1_END && t < T.PULL1_END + 0.22) pullP = 1 - easeOut((t - T.PULL1_END) / 0.22);
  const angle = pullP * 0.95;
  const armLen = h * 0.26;

  c.save();
  c.translate(pivotX, pivotY);
  c.rotate(angle);
  c.strokeStyle = '#d9e2f0';
  c.lineWidth = w * 0.03;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(armLen * 0.35, -armLen * 0.94);
  c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.65)';
  c.lineWidth = w * 0.011;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(armLen * 0.35, -armLen * 0.9);
  c.stroke();

  const ballX = armLen * 0.35 * 1.06;
  const ballY = -armLen * 0.98;
  const ballG = c.createRadialGradient(ballX - w * 0.014, ballY - w * 0.018, w * 0.006, ballX, ballY, w * 0.06);
  ballG.addColorStop(0, '#ff8fa2');
  ballG.addColorStop(0.55, '#d61f45');
  ballG.addColorStop(1, '#5c0719');
  c.fillStyle = ballG;
  c.beginPath();
  c.arc(ballX, ballY, w * 0.058, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = 1.2;
  c.stroke();
  c.restore();

  // handle mount
  c.fillStyle = '#1a2438';
  c.beginPath();
  c.arc(pivotX, pivotY, w * 0.055, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.stroke();

  // receipt
  drawReceipt(c, g, t);

  c.restore();
}

function drawConfetti(c, ctx, g, t) {
  if (t < T.WIN) return;
  const W = ctx.width;
  const H = ctx.height;
  const el = t - T.WIN;
  for (const p of S.confetti) {
    const local = el - p.delay;
    if (local < 0) continue;
    const y = (p.y + p.vy * local) * H;
    if (y > H + H * 0.1) continue;
    const x = (p.x + Math.sin(local * 1.7 + p.rot) * 0.035 + p.drift * local) * W;
    const wobble = Math.sin(local * 2.4 + p.rot) * 0.5;
    c.save();
    c.globalAlpha = clamp01(1 - Math.max(0, y / H - 0.9) * 6);
    c.translate(x, y);
    c.rotate(p.rot + p.spin * local);
    c.scale(0.6 + p.size * 0.5, 0.6 + p.size * 0.5);
    iconEggplant(c, H * 0.055 * (0.9 + wobble * 0.3));
    c.restore();
  }
}

function drawSparks(c, ctx, g, t) {
  if (t < T.WIN) return;
  const H = ctx.height;
  const el = t - T.WIN;
  const p = clamp01(el / 1.4);
  c.save();
  for (const s of S.sparks) {
    const local = el / s.life;
    if (local > 1) continue;
    const r = g.mh * (0.25 + s.v * local * 1.1);
    const a = s.a + local * 0.6;
    const x = g.cx + Math.cos(a) * r;
    const y = g.cy + Math.sin(a) * r * 0.75;
    c.globalAlpha = (1 - local) * 0.9;
    c.fillStyle = s.size > 0.6 ? GOLD_PALE : GOLD;
    c.shadowColor = GOLD;
    c.shadowBlur = 14;
    const size = H * 0.008 * s.size * (1 + (1 - local));
    c.beginPath();
    c.arc(x, y, Math.max(1, size), 0, Math.PI * 2);
    c.fill();
    if (s.size > 0.75) {
      c.strokeStyle = GOLD_PALE;
      c.lineWidth = Math.max(1, size * 0.35);
      c.beginPath();
      c.moveTo(x - size * 2.2, y);
      c.lineTo(x + size * 2.2, y);
      c.moveTo(x, y - size * 2.2);
      c.lineTo(x, y + size * 2.2);
      c.stroke();
    }
  }
  c.restore();
}

function drawJackpotBadge(c, ctx, g, t) {
  if (t < T.WIN) return;
  const p = easeOutBack((t - T.WIN) / 0.45);
  if (p <= 0) return;
  const y = g.cy - g.mh * 0.56;
  const fs = g.mw * 0.17;
  c.save();
  c.translate(g.cx, y);
  c.rotate(-0.06 + Math.sin(t * 3.4) * 0.012);
  c.scale(p, p);
  c.globalAlpha = clamp01(p);
  c.font = `900 ${fs}px "Segoe UI", system-ui, Arial, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = fs * 0.14;
  c.strokeStyle = '#5b2a05';
  c.strokeText('JACKPOT', 0, 0);
  const grad = c.createLinearGradient(0, -fs * 0.5, 0, fs * 0.5);
  grad.addColorStop(0, '#fff6c9');
  grad.addColorStop(0.5, GOLD);
  grad.addColorStop(1, '#c07a10');
  c.fillStyle = grad;
  c.shadowColor = 'rgba(255,200,80,0.85)';
  c.shadowBlur = 22;
  c.fillText('JACKPOT', 0, 0);
  c.restore();
}

/* ---------------------------------------------------------------- frame */

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;

  c.clearRect(0, 0, W, H);

  fireCues(ctx, t);
  spinTicks(ctx, t);

  if (!S.cameoFired && t >= T.CAMEO) {
    S.cameoFired = true;
    if (typeof ctx.playSlop === 'function') {
      try {
        ctx.playSlop(CAMEO);
      } catch {}
    }
  }
  if (!S.doneFired && t >= T.DONE) {
    S.doneFired = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
  if (t <= T.IN || t >= T.DONE) return;

  const g = machineGeom(ctx, t);

  drawStreamerBrackets(c, ctx, t);
  drawRayBurst(c, g, t);
  drawBeam(c, ctx, g, t);
  drawMachine(c, ctx, g, t);
  drawJackpotBadge(c, ctx, g, t);
  drawConfetti(c, ctx, g, t);
  drawSparks(c, ctx, g, t);
  drawCaption(c, ctx, captionFor(t), t);
}

export function dispose(ctx) {}
