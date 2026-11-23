export const meta = {
  title: 'Triple Eggplant Jackpot',
  author: 'klowderm',
  prompt: 'A shot machine appears. First pull lands one cherry, a red seven, and a golden bell. Second pull lands three eggplants and prompts the wobbly reveal.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

/* ============================================================
   TRIPLE EGGPLANT JACKPOT
   A boardwalk slot machine rolls into frame, reads SavorySailor's
   fortune, and gets increasingly personal about it. Transparent
   glass all the way down: only bulbs, brackets and reels are
   painted, the live shot keeps showing through.
   ============================================================ */

const STREAMER_NAME = 'SavorySailor';
const CAMEO = 'wobbly-frank-reveal';

const PINK = '#ff5ba8';
const PINK_HOT = '#ff2f86';
const GOLD = '#f6c945';
const GOLD_PALE = '#ffeaa8';
const UI_FONT = '"Trebuchet MS", "Segoe UI", sans-serif';
const SHOW_FONT = 'Georgia, "Times New Roman", serif';

const T = {
  IN_END: 0.85,
  PULL1: 2.7,
  SPIN1: 3.05,
  STOP1: [4.95, 5.4, 5.85],
  SAD: 6.2,
  PULL2: 8.0,
  SPIN2: 8.35,
  STOP2: [10.45, 10.9, 11.35],
  CAMEO: 14.5,
  END: 17.3,
};

const CAPTIONS = [
  { a: 0.7, b: 2.55, text: `Step right up, ${STREAMER_NAME}. The machine already knows.` },
  { a: 6.05, b: 7.85, text: 'Cherry, seven, bell. That is a fruit salad with a warning.' },
  { a: 8.25, b: 9.75, text: 'Pull it again. What could possibly go wrong.' },
  { a: 11.9, b: 13.95, text: `Three eggplants. ${STREAMER_NAME}, that is not a jackpot, that is a proposition.` },
  { a: 14.25, b: 16.95, text: 'It has summoned Wobbly Frank. This is entirely your fault.' },
];

/* ------------------------------------------------------------ math */

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const clamp01 = (v) => clamp(v, 0, 1);
const lerp = (a, b, p) => a + (b - a) * p;
const easeOutCubic = (p) => 1 - Math.pow(1 - clamp01(p), 3);
const easeInOut = (p) => {
  p = clamp01(p);
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
};
const smooth = (p) => {
  p = clamp01(p);
  return p * p * (3 - 2 * p);
};

/* ------------------------------------------------------------ icons */

function iconCherry(g, s) {
  g.save();
  g.strokeStyle = '#3f7a30';
  g.lineWidth = s * 0.07;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, -s * 0.34);
  g.quadraticCurveTo(-s * 0.04, -s * 0.12, -s * 0.18, s * 0.06);
  g.moveTo(0, -s * 0.34);
  g.quadraticCurveTo(s * 0.04, -s * 0.12, s * 0.17, s * 0.08);
  g.stroke();
  g.fillStyle = '#5ba045';
  g.beginPath();
  g.ellipse(s * 0.11, -s * 0.36, s * 0.15, s * 0.07, -0.5, 0, Math.PI * 2);
  g.fill();
  for (const [x, y, r] of [
    [-s * 0.19, s * 0.17, s * 0.22],
    [s * 0.19, s * 0.2, s * 0.2],
  ]) {
    const rg = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.08, x, y, r * 1.05);
    rg.addColorStop(0, '#ff8b7d');
    rg.addColorStop(0.55, '#d9262f');
    rg.addColorStop(1, '#7c0d17');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.6)';
    g.beginPath();
    g.ellipse(x - r * 0.3, y - r * 0.38, r * 0.2, r * 0.12, -0.7, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function iconSeven(g, s) {
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `900 ${s * 1.0}px ${SHOW_FONT}`;
  g.lineJoin = 'round';
  g.lineWidth = s * 0.13;
  g.strokeStyle = '#5c0713';
  g.strokeText('7', 0, s * 0.04);
  const fill = g.createLinearGradient(0, -s * 0.48, 0, s * 0.48);
  fill.addColorStop(0, '#ff8d7f');
  fill.addColorStop(0.5, '#e02334');
  fill.addColorStop(1, '#a30d1e');
  g.fillStyle = fill;
  g.fillText('7', 0, s * 0.04);
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = s * 0.035;
  g.strokeText('7', 0, s * 0.04);
  g.restore();
}

function iconBell(g, s) {
  g.save();
  g.beginPath();
  g.moveTo(-s * 0.36, s * 0.22);
  g.quadraticCurveTo(-s * 0.3, s * 0.1, -s * 0.27, -s * 0.02);
  g.quadraticCurveTo(-s * 0.24, -s * 0.33, 0, -s * 0.36);
  g.quadraticCurveTo(s * 0.24, -s * 0.33, s * 0.27, -s * 0.02);
  g.quadraticCurveTo(s * 0.3, s * 0.1, s * 0.36, s * 0.22);
  g.closePath();
  const fill = g.createLinearGradient(-s * 0.3, -s * 0.35, s * 0.3, s * 0.25);
  fill.addColorStop(0, '#fff6c4');
  fill.addColorStop(0.35, '#f6cd4c');
  fill.addColorStop(0.7, '#d09a1a');
  fill.addColorStop(1, '#8f5f0b');
  g.fillStyle = fill;
  g.fill();
  g.strokeStyle = '#6d430a';
  g.lineWidth = s * 0.045;
  g.stroke();
  g.beginPath();
  g.ellipse(s * 0.12, -s * 0.42, s * 0.075, s * 0.055, 0.2, 0, Math.PI * 2);
  g.fillStyle = '#f6cd4c';
  g.fill();
  g.stroke();
  g.fillStyle = '#7a4b0c';
  g.beginPath();
  g.arc(0, s * 0.27, s * 0.085, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = s * 0.055;
  g.beginPath();
  g.moveTo(-s * 0.13, s * 0.02);
  g.quadraticCurveTo(-s * 0.12, -s * 0.22, 0, -s * 0.27);
  g.stroke();
  g.restore();
}

function iconEggplant(g, s) {
  g.save();
  g.rotate(-0.26);
  const fill = g.createLinearGradient(-s * 0.25, -s * 0.3, s * 0.3, s * 0.4);
  fill.addColorStop(0, '#c886e6');
  fill.addColorStop(0.35, '#8b3fb0');
  fill.addColorStop(0.75, '#4b1670');
  fill.addColorStop(1, '#2a0a40');
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(0, -s * 0.36);
  g.bezierCurveTo(s * 0.2, -s * 0.3, s * 0.36, -s * 0.02, s * 0.33, s * 0.2);
  g.bezierCurveTo(s * 0.31, s * 0.41, s * 0.1, s * 0.48, -s * 0.05, s * 0.45);
  g.bezierCurveTo(-s * 0.3, s * 0.42, -s * 0.38, s * 0.18, -s * 0.32, -s * 0.06);
  g.bezierCurveTo(-s * 0.28, -s * 0.28, -s * 0.14, -s * 0.34, 0, -s * 0.36);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(255,214,255,0.35)';
  g.lineWidth = s * 0.028;
  g.stroke();
  g.fillStyle = '#5a9c3c';
  g.beginPath();
  g.moveTo(0, -s * 0.31);
  g.quadraticCurveTo(-s * 0.2, -s * 0.44, -s * 0.3, -s * 0.33);
  g.quadraticCurveTo(-s * 0.16, -s * 0.26, -s * 0.03, -s * 0.27);
  g.quadraticCurveTo(s * 0.18, -s * 0.45, s * 0.29, -s * 0.34);
  g.quadraticCurveTo(s * 0.15, -s * 0.24, 0, -s * 0.27);
  g.closePath();
  g.fill();
  g.strokeStyle = '#3d6e2a';
  g.lineWidth = s * 0.055;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, -s * 0.34);
  g.lineTo(s * 0.04, -s * 0.48);
  g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.beginPath();
  g.ellipse(s * 0.03, s * 0.02, s * 0.08, s * 0.17, 0.2, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function iconLemon(g, s) {
  g.save();
  g.rotate(0.35);
  const fill = g.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.05, 0, 0, s * 0.38);
  fill.addColorStop(0, '#fff9a8');
  fill.addColorStop(0.6, '#f6d735');
  fill.addColorStop(1, '#b48c09');
  g.fillStyle = fill;
  g.beginPath();
  g.ellipse(0, 0, s * 0.36, s * 0.25, 0, 0, Math.PI * 2);
  g.fill();
  for (const dir of [-1, 1]) {
    g.beginPath();
    g.moveTo(dir * s * 0.36, 0);
    g.lineTo(dir * s * 0.45, -s * 0.04);
    g.lineTo(dir * s * 0.35, s * 0.07);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function iconStar(g, s) {
  g.save();
  const fill = g.createLinearGradient(0, -s * 0.4, 0, s * 0.4);
  fill.addColorStop(0, '#fff4bd');
  fill.addColorStop(1, '#c58a12');
  g.fillStyle = fill;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.42 : s * 0.18;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
  g.fill();
  g.strokeStyle = '#8d5f08';
  g.lineWidth = s * 0.03;
  g.stroke();
  g.restore();
}

function iconGrape(g, s) {
  g.save();
  g.strokeStyle = '#4d7c30';
  g.lineWidth = s * 0.05;
  g.beginPath();
  g.moveTo(0, -s * 0.3);
  g.lineTo(0, -s * 0.42);
  g.stroke();
  g.fillStyle = '#5f9a3c';
  g.beginPath();
  g.ellipse(s * 0.1, -s * 0.42, s * 0.12, s * 0.06, -0.4, 0, Math.PI * 2);
  g.fill();
  for (const [px, py] of [
    [-0.15, -0.2],
    [0.15, -0.2],
    [0, -0.03],
    [-0.2, 0.12],
    [0.2, 0.12],
    [0, 0.26],
  ]) {
    const fill = g.createRadialGradient(px * s - s * 0.04, py * s - s * 0.05, s * 0.02, px * s, py * s, s * 0.16);
    fill.addColorStop(0, '#b06fd0');
    fill.addColorStop(1, '#4c1a6b');
    g.fillStyle = fill;
    g.beginPath();
    g.arc(px * s, py * s, s * 0.145, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

const ICONS = [
  { name: 'cherry', draw: iconCherry },
  { name: 'seven', draw: iconSeven },
  { name: 'bell', draw: iconBell },
  { name: 'eggplant', draw: iconEggplant },
  { name: 'lemon', draw: iconLemon },
  { name: 'star', draw: iconStar },
  { name: 'grape', draw: iconGrape },
];

const ICON_INDEX = {};
ICONS.forEach((icon, i) => {
  ICON_INDEX[icon.name] = i;
});

/* ------------------------------------------------------------ state */

let S = null;

export function init(ctx) {
  S = {
    fired: Object.create(null),
    lastTick: -1,
    tick: 0,
    lastBlip: -1,
    done: false,
    parts: [],
  };
  for (let i = 0; i < 30; i++) {
    const u = ctx.rand();
    const d = ctx.rand();
    const dr = ctx.rand();
    const ro = ctx.rand();
    const sp = ctx.rand();
    S.parts.push({
      u: (u * 2 - 1) * 0.5,
      delay: d * 0.8,
      drift: (dr * 2 - 1) * 0.7,
      rot: ro * Math.PI * 2,
      spin: (sp * 2 - 1) * 7,
      scale: 0.5 + u * 0.9,
    });
  }
}

/* ------------------------------------------------------------ helpers */

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr);
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}

function fitFont(g, text, maxW, size, weight, family) {
  let fs = size;
  g.font = `${weight} ${fs}px ${family}`;
  while (fs > 8 && g.measureText(text).width > maxW) {
    fs -= 1;
    g.font = `${weight} ${fs}px ${family}`;
  }
  return fs;
}

function layout(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const mw = clamp(Math.min(W * 0.42, H * 0.5), 270, 760);
  const mh = mw * 1.5;

  let cx = W / 2;
  const st = ctx.streamer;
  if (st) {
    const cameraX = (st.x + st.w / 2) * W;
    cx = cameraX > W * 0.5 ? W * 0.29 : W * 0.71;
  }
  const armRoom = mw * 0.2 + 18;
  cx = clamp(cx, mw / 2 + 18, W - mw / 2 - armRoom);

  let cy = H * 0.55;
  cy = clamp(cy, mh / 2 + 16, H - mh / 2 - 16);

  const size = mw * 0.235;
  const gap = mw * 0.052;
  const total = size * 3 + gap * 2;
  const winTop = cy - mh / 2 + mh * 0.3;
  const xs = [0, 1, 2].map((i) => cx - total / 2 + size / 2 + i * (size + gap));

  return {
    W,
    H,
    cx,
    cy,
    mw,
    mh,
    mx: cx - mw / 2,
    my: cy - mh / 2,
    win: { size, gap, total, xs, top: winTop, wy: winTop + size / 2 },
  };
}

function pullAmount(t, at) {
  const p = t - at;
  if (p <= 0) return 0;
  if (p < 0.28) return easeInOut(p / 0.28);
  if (p < 0.5) return 1;
  if (p < 1.15) return 1 - smooth((p - 0.5) / 0.65);
  return 0;
}

function stopBounce(dt) {
  if (dt < 0 || dt > 0.55) return 0;
  return Math.sin(dt * 45) * Math.exp(-dt * 12) * 0.07;
}

function drawCrown(g, x, y, s, alpha, bob) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y + bob);
  g.shadowColor = 'rgba(255,200,80,0.9)';
  g.shadowBlur = s * 0.45;
  const fill = g.createLinearGradient(0, -s * 0.5, 0, s * 0.4);
  fill.addColorStop(0, '#fff2bb');
  fill.addColorStop(0.5, '#f5c53c');
  fill.addColorStop(1, '#a8760e');
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(-s * 0.55, s * 0.28);
  g.lineTo(-s * 0.62, -s * 0.28);
  g.lineTo(-s * 0.3, -s * 0.02);
  g.lineTo(0, -s * 0.5);
  g.lineTo(s * 0.3, -s * 0.02);
  g.lineTo(s * 0.62, -s * 0.28);
  g.lineTo(s * 0.55, s * 0.28);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(120,80,10,0.9)';
  g.lineWidth = s * 0.05;
  g.stroke();
  g.shadowBlur = 0;
  g.fillStyle = '#ff5aa8';
  for (const gx of [-0.36, 0, 0.36]) {
    g.beginPath();
    g.arc(gx * s, s * 0.12, s * 0.075, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

/* ------------------------------------------------------------ machine */

function drawRays(g, ctx, t, L) {
  const t0 = T.STOP2[2];
  if (t < t0) return;
  const p = clamp01((t - t0) / 3.4);
  const alpha = (1 - p) * 0.13;
  if (alpha <= 0.004) return;
  const R = Math.max(ctx.width, ctx.height) * 0.85;
  g.save();
  g.translate(L.cx, L.cy);
  g.rotate(t * 0.14);
  g.fillStyle = `rgba(255,214,92,${alpha.toFixed(3)})`;
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, R, a, a + 0.125);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function drawLever(g, t, L) {
  const pivotX = L.mx + L.mw * 0.985;
  const pivotY = L.my + L.mh * 0.37;
  const len = L.mw * 0.36;
  const pulled = Math.max(pullAmount(t, T.PULL1), pullAmount(t, T.PULL2));
  const angle = lerp(0.38, 2.35, pulled);
  const kx = pivotX + Math.sin(angle) * len;
  const ky = pivotY - Math.cos(angle) * len;

  g.save();
  g.lineCap = 'round';
  g.strokeStyle = 'rgba(10,6,18,0.85)';
  g.lineWidth = L.mw * 0.062;
  g.beginPath();
  g.moveTo(pivotX, pivotY);
  g.lineTo(kx, ky);
  g.stroke();
  g.strokeStyle = '#8b96ad';
  g.lineWidth = L.mw * 0.04;
  g.beginPath();
  g.moveTo(pivotX, pivotY);
  g.lineTo(kx, ky);
  g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.5)';
  g.lineWidth = L.mw * 0.011;
  g.beginPath();
  g.moveTo(pivotX - L.mw * 0.008, pivotY);
  g.lineTo(kx - L.mw * 0.008, ky);
  g.stroke();

  const kr = L.mw * 0.058;
  const kg = g.createRadialGradient(kx - kr * 0.35, ky - kr * 0.4, kr * 0.1, kx, ky, kr * 1.05);
  kg.addColorStop(0, '#ff9cce');
  kg.addColorStop(0.5, '#e0236f');
  kg.addColorStop(1, '#7a0631');
  g.fillStyle = kg;
  g.shadowColor = 'rgba(255,47,134,0.8)';
  g.shadowBlur = kr * 0.9;
  g.beginPath();
  g.arc(kx, ky, kr, 0, Math.PI * 2);
  g.fill();
  g.shadowBlur = 0;
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.ellipse(kx - kr * 0.3, ky - kr * 0.35, kr * 0.25, kr * 0.14, -0.7, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = '#241531';
  g.strokeStyle = GOLD;
  g.lineWidth = Math.max(2, L.mw * 0.008);
  g.beginPath();
  g.arc(pivotX, pivotY, L.mw * 0.045, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}

function drawReel(g, t, L, i) {
  const { size, xs, wy } = L.win;
  const wx = xs[i];
  const round2 = t >= T.SPIN2;
  const start = round2 ? T.SPIN2 : T.SPIN1;
  const stop = (round2 ? T.STOP2 : T.STOP1)[i];

  let finalName;
  if (round2) finalName = 'eggplant';
  else if (t >= T.SPIN1) finalName = ['cherry', 'seven', 'bell'][i];
  else finalName = ['grape', 'lemon', 'star'][i];

  const spinning = t >= start && t < stop;
  let off = 0;
  if (t >= start) {
    const p = clamp01((t - start) / Math.max(0.001, stop - start));
    off = (1 - easeOutCubic(p)) * size * (7 + i * 2.5);
  }
  const bounce = stopBounce(t - stop) * size;
  const finalIdx = ICON_INDEX[finalName];
  const n = ICONS.length;
  const base = Math.floor(off / size);
  const frac = off - base * size;

  g.save();
  roundRect(g, wx - size / 2, wy - size / 2, size, size, size * 0.11);
  g.clip();

  const bg = g.createLinearGradient(0, wy - size / 2, 0, wy + size / 2);
  bg.addColorStop(0, 'rgba(255,246,226,0.8)');
  bg.addColorStop(0.5, 'rgba(255,252,242,0.93)');
  bg.addColorStop(1, 'rgba(238,224,196,0.8)');
  g.fillStyle = bg;
  g.fillRect(wx - size / 2, wy - size / 2, size, size);

  g.strokeStyle = 'rgba(150,120,84,0.18)';
  g.lineWidth = 1;
  for (let k = -2; k <= 2; k++) {
    g.beginPath();
    g.moveTo(wx - size / 2, wy + k * size + frac);
    g.lineTo(wx + size / 2, wy + k * size + frac);
    g.stroke();
  }

  for (let k = -2; k <= 2; k++) {
    const idx = (((finalIdx + k + base) % n) + n) % n;
    const y = wy + k * size + frac + bounce;
    g.save();
    g.translate(wx, y);
    ICONS[idx].draw(g, size * 0.76);
    g.restore();
  }

  if (spinning) {
    const blur = g.createLinearGradient(0, wy - size / 2, 0, wy + size / 2);
    blur.addColorStop(0, 'rgba(255,250,235,0.4)');
    blur.addColorStop(0.5, 'rgba(255,250,235,0)');
    blur.addColorStop(1, 'rgba(255,250,235,0.4)');
    g.fillStyle = blur;
    g.fillRect(wx - size / 2, wy - size / 2, size, size);
  }

  const shine = g.createLinearGradient(wx - size / 2, wy - size / 2, wx + size / 2, wy + size / 2);
  shine.addColorStop(0, 'rgba(255,255,255,0.42)');
  shine.addColorStop(0.42, 'rgba(255,255,255,0.02)');
  shine.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = shine;
  g.fillRect(wx - size / 2, wy - size / 2, size, size);
  g.restore();

  const since = t - stop;
  const flash = since >= 0 && since < 0.5 ? 1 - since / 0.5 : 0;
  const winAmt = t >= T.STOP2[2] ? clamp01((t - T.STOP2[2]) / 0.35) : 0;

  roundRect(g, wx - size / 2, wy - size / 2, size, size, size * 0.11);
  g.strokeStyle = flash > 0.02 ? `rgba(255,240,170,${0.4 + flash * 0.6})` : 'rgba(246,201,69,0.85)';
  g.lineWidth = Math.max(2, size * 0.035);
  g.shadowColor = `rgba(255,211,96,${0.25 + Math.max(flash, winAmt * (0.35 + 0.25 * Math.sin(t * 4)))})`;
  g.shadowBlur = size * (0.18 + 0.2 * Math.max(flash, winAmt));
  g.stroke();
  g.shadowBlur = 0;
}

function drawMachine(g, ctx, t, L) {
  const { cx, cy, mw, mh, mx, my, win } = L;
  const appear = clamp01(t / T.IN_END);
  const pop = easeOutCubic(appear);
  const winAmt = t >= T.STOP2[2] ? clamp01((t - T.STOP2[2]) / 0.4) : 0;
  const winStart = T.STOP2[2];
  let wob = 0;
  if (t >= winStart) {
    const a = t - winStart;
    wob = Math.sin(a * 9) * 0.0045 * Math.exp(-a * 1.4);
  }

  g.save();
  g.translate(0, (1 - pop) * mh * 0.18);
  g.globalAlpha = appear;
  g.translate(cx, cy);
  g.rotate(wob);
  g.translate(-cx, -cy);

  // floor shadow
  g.fillStyle = 'rgba(4,2,10,0.32)';
  g.beginPath();
  g.ellipse(cx, my + mh - mh * 0.02, mw * 0.56, mh * 0.028, 0, 0, Math.PI * 2);
  g.fill();

  drawLever(g, t, L);

  // cabinet body
  const body = g.createLinearGradient(mx, my, mx + mw, my + mh);
  body.addColorStop(0, 'rgba(62,36,100,0.94)');
  body.addColorStop(0.5, 'rgba(31,18,55,0.95)');
  body.addColorStop(1, 'rgba(13,8,26,0.96)');
  g.fillStyle = body;
  g.shadowColor = 'rgba(255,60,150,0.55)';
  g.shadowBlur = mw * 0.07;
  roundRect(g, mx, my + mh * 0.1, mw, mh * 0.9, mw * 0.055);
  g.fill();
  g.shadowBlur = 0;

  g.strokeStyle = PINK;
  g.lineWidth = Math.max(2, mw * 0.009);
  roundRect(g, mx, my + mh * 0.1, mw, mh * 0.9, mw * 0.055);
  g.stroke();
  g.strokeStyle = 'rgba(246,201,69,0.5)';
  g.lineWidth = Math.max(1, mw * 0.004);
  roundRect(g, mx + mw * 0.012, my + mh * 0.112, mw * 0.976, mh * 0.876, mw * 0.045);
  g.stroke();

  // marquee
  const mqX = mx + mw * 0.07;
  const mqY = my;
  const mqW = mw * 0.86;
  const mqH = mh * 0.21;
  const mqGrad = g.createLinearGradient(mqX, mqY, mqX, mqY + mqH);
  mqGrad.addColorStop(0, '#ff8ec4');
  mqGrad.addColorStop(0.45, PINK_HOT);
  mqGrad.addColorStop(1, '#9c1550');
  g.fillStyle = mqGrad;
  g.shadowColor = 'rgba(255,47,134,0.75)';
  g.shadowBlur = mw * 0.06;
  roundRect(g, mqX, mqY, mqW, mqH, mw * 0.07);
  g.fill();
  g.shadowBlur = 0;
  g.strokeStyle = 'rgba(255,234,168,0.95)';
  g.lineWidth = Math.max(2, mw * 0.007);
  roundRect(g, mqX, mqY, mqW, mqH, mw * 0.07);
  g.stroke();

  const bulbY = mqY + mqH * 0.12;
  for (let i = 0; i < 9; i++) {
    const bx = mqX + mqW * 0.09 + (i / 8) * mqW * 0.82;
    const on = 0.5 + 0.5 * Math.sin(t * 5 + i * 0.9);
    g.fillStyle = i % 2 ? `rgba(255,231,150,${0.35 + on * 0.65})` : `rgba(255,255,255,${0.3 + on * 0.6})`;
    g.shadowColor = 'rgba(255,236,170,0.9)';
    g.shadowBlur = mw * 0.012 * on;
    g.beginPath();
    g.arc(bx, bulbY, mw * 0.011, 0, Math.PI * 2);
    g.fill();
  }
  g.shadowBlur = 0;

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const titleSize = fitFont(g, 'SLOP-O-MATIC', mqW * 0.86, mqH * 0.46, '900', SHOW_FONT);
  g.font = `900 ${titleSize}px ${SHOW_FONT}`;
  g.lineJoin = 'round';
  g.lineWidth = titleSize * 0.16;
  g.strokeStyle = '#5c0a30';
  g.strokeText('SLOP-O-MATIC', mqX + mqW / 2, mqY + mqH * 0.6);
  const titleFill = g.createLinearGradient(0, mqY + mqH * 0.35, 0, mqY + mqH * 0.86);
  titleFill.addColorStop(0, '#fff6cf');
  titleFill.addColorStop(0.55, GOLD);
  titleFill.addColorStop(1, '#c98d14');
  g.fillStyle = titleFill;
  g.fillText('SLOP-O-MATIC', mqX + mqW / 2, mqY + mqH * 0.6);

  // window band
  const bandY = win.top - win.size * 0.16;
  const bandH = win.size * 1.32;
  g.fillStyle = 'rgba(9,5,18,0.72)';
  g.strokeStyle = 'rgba(246,201,69,0.55)';
  g.lineWidth = Math.max(2, mw * 0.006);
  roundRect(g, mx + mw * 0.06, bandY, mw * 0.88, bandH, mw * 0.05);
  g.fill();
  g.stroke();

  if (winAmt > 0) {
    g.save();
    g.globalAlpha = winAmt * (0.4 + 0.25 * Math.sin(t * 4));
    g.fillStyle = 'rgba(255,206,90,0.20)';
    roundRect(g, mx + mw * 0.06, bandY, mw * 0.88, bandH, mw * 0.05);
    g.fill();
    g.restore();
  }

  for (let i = 0; i < 3; i++) drawReel(g, t, L, i);

  // payline
  const payGlow = winAmt * (0.5 + 0.5 * Math.sin(t * 4));
  g.strokeStyle = winAmt > 0 ? `rgba(255,232,150,${0.5 + payGlow * 0.5})` : 'rgba(255,91,168,0.4)';
  g.lineWidth = Math.max(1, mw * (winAmt > 0 ? 0.008 : 0.004));
  g.setLineDash([mw * 0.02, mw * 0.02]);
  g.beginPath();
  g.moveTo(mx + mw * 0.1, win.wy);
  g.lineTo(mx + mw * 0.9, win.wy);
  g.stroke();
  g.setLineDash([]);

  // payout plaque
  const plX = mx + mw * 0.12;
  const plY = my + mh * 0.6;
  const plW = mw * 0.76;
  const plH = mh * 0.12;
  g.fillStyle = 'rgba(6,4,14,0.66)';
  g.strokeStyle = 'rgba(246,201,69,0.6)';
  g.lineWidth = Math.max(1, mw * 0.004);
  roundRect(g, plX, plY, plW, plH, mw * 0.02);
  g.fill();
  g.stroke();

  const labelSize = Math.max(8, mw * 0.024);
  g.font = `700 ${labelSize}px ${UI_FONT}`;
  g.fillStyle = 'rgba(255,234,168,0.7)';
  g.fillText('PAYOUT', cx, plY + plH * 0.28);
  const payout = winAmt > 0 ? '3 EGGPLANTS' : 'ONE (1) DIGNITY';
  const valueSize = fitFont(g, payout, plW * 0.9, mw * 0.058, '800', UI_FONT);
  g.font = `800 ${valueSize}px ${UI_FONT}`;
  g.fillStyle = winAmt > 0 ? GOLD_PALE : '#ffffff';
  g.fillText(payout, cx, plY + plH * 0.63);

  // coin slot
  const slotY = my + mh * 0.79;
  g.fillStyle = 'rgba(6,4,14,0.8)';
  roundRect(g, cx - mw * 0.17, slotY, mw * 0.34, mw * 0.055, mw * 0.02);
  g.fill();
  g.fillStyle = 'rgba(255,240,190,0.8)';
  roundRect(g, cx - mw * 0.13, slotY + mw * 0.018, mw * 0.26, mw * 0.012, mw * 0.006);
  g.fill();

  g.font = `600 ${Math.max(7, mw * 0.02)}px ${UI_FONT}`;
  g.fillStyle = 'rgba(255,255,255,0.35)';
  g.fillText('NO REFUNDS · NO DIGNITY', cx, my + mh * 0.885);

  // corner screws
  g.fillStyle = 'rgba(220,200,255,0.35)';
  for (const [sx, sy] of [
    [mx + mw * 0.05, my + mh * 0.14],
    [mx + mw * 0.95, my + mh * 0.14],
    [mx + mw * 0.05, my + mh * 0.94],
    [mx + mw * 0.95, my + mh * 0.94],
  ]) {
    g.beginPath();
    g.arc(sx, sy, mw * 0.011, 0, Math.PI * 2);
    g.fill();
  }

  g.restore();
}

/* ------------------------------------------------------------ extras */

function drawConfetti(g, ctx, t, L) {
  const start = T.STOP2[2] + 0.15;
  if (t < start) return;
  const { cx, mw, mh, win } = L;
  for (const p of S.parts) {
    const age = t - start - p.delay;
    if (age < 0) continue;
    const x = cx + p.u * mw * 0.9 + p.drift * mw * 0.55 * age;
    const y = win.wy + age * mh * 0.42 + age * age * mh * 0.4;
    if (y > ctx.height + 90) continue;
    const alpha = clamp01(1.5 - age * 0.5);
    if (alpha <= 0.02) continue;
    g.save();
    g.translate(x, y);
    g.rotate(p.rot + p.spin * age);
    g.globalAlpha = alpha * 0.92;
    iconEggplant(g, mw * 0.1 * p.scale);
    g.restore();
  }
}

function drawStreamerGlory(g, ctx, t) {
  const st = ctx.streamer;
  const t0 = T.STOP2[2];
  if (!st || t < t0) return;
  const p = clamp01((t - t0) / 0.6);
  const sx = st.x * ctx.width;
  const sy = st.y * ctx.height;
  const sw = st.w * ctx.width;
  const sh = st.h * ctx.height;
  const pad = 10 + (1 - p) * 16;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);

  g.save();
  g.strokeStyle = `rgba(255,206,86,${(0.45 * p).toFixed(3)})`;
  g.lineWidth = 4 + pulse * 3;
  g.shadowColor = 'rgba(255,196,70,0.9)';
  g.shadowBlur = 24;
  roundRect(g, sx - pad, sy - pad, sw + pad * 2, sh + pad * 2, 18);
  g.stroke();
  g.restore();

  const cw = clamp(sw * 0.16, 24, 92);
  const crownX = sx + sw / 2;
  let crownY = sy - cw * 0.8;
  if (crownY < cw) crownY = sy + cw * 0.6;
  drawCrown(g, crownX, crownY, cw, 0.95 * p, Math.sin(t * 4) * cw * 0.05);

  g.save();
  g.fillStyle = `rgba(255,240,180,${(0.7 * p).toFixed(3)})`;
  g.shadowColor = 'rgba(255,220,120,0.9)';
  g.shadowBlur = 10;
  for (let i = 0; i < 4; i++) {
    const ang = t * 1.3 + (i / 4) * Math.PI * 2;
    const rx = crownX + Math.cos(ang) * cw * 1.4;
    const ry = crownY + Math.sin(ang) * cw * 0.8;
    const r = cw * 0.06;
    g.beginPath();
    g.moveTo(rx, ry - r);
    g.lineTo(rx + r * 0.35, ry);
    g.lineTo(rx, ry + r);
    g.lineTo(rx - r * 0.35, ry);
    g.closePath();
    g.fill();
  }
  g.restore();
}

function drawCaptions(g, ctx, t) {
  let active = null;
  for (const c of CAPTIONS) {
    if (t >= c.a && t <= c.b) active = c;
  }
  if (!active) return;

  const fade = Math.min(clamp01((t - active.a) / 0.22), clamp01((active.b - t) / 0.22));
  const W = ctx.width;
  const H = ctx.height;
  let y = H * 0.085;
  const st = ctx.streamer;
  if (st && st.y < 0.16) y = H * 0.93;

  const base = clamp(W * 0.027, 18, 42);
  const size = fitFont(g, active.text, W * 0.9, base, '800', UI_FONT);
  g.save();
  g.globalAlpha = fade;
  g.font = `800 ${size}px ${UI_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.round(size * 0.3);
  g.strokeStyle = 'rgba(16,8,28,0.92)';
  g.strokeText(active.text, W / 2, y);
  g.fillStyle = '#fff8e6';
  g.shadowColor = 'rgba(255,120,190,0.7)';
  g.shadowBlur = 14;
  g.fillText(active.text, W / 2, y);
  g.restore();
}

/* ------------------------------------------------------------ frame */

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const g = ctx.canvas;
  g.clearRect(0, 0, ctx.width, ctx.height);

  const L = layout(ctx);
  const cue = (key, at, fn) => {
    if (!S.fired[key] && t >= at) {
      S.fired[key] = true;
      fn();
    }
  };

  // settle thunk
  cue('land', T.IN_END, () => {
    ctx.sound.noise(160);
    ctx.sound.beep(96, 240);
  });

  // marquee blips
  if (t > 0.9 && t < 2.6 && t - S.lastBlip > 0.42) {
    S.lastBlip = t;
    ctx.sound.beep(S.tick % 2 ? 1320 : 990, 26);
    S.tick++;
  }

  // lever pulls
  cue('pull1', T.PULL1, () => {
    ctx.sound.noise(90);
    ctx.sound.beep(150, 110);
  });
  cue('pull2', T.PULL2, () => {
    ctx.sound.noise(90);
    ctx.sound.beep(150, 110);
  });

  // reel chatter while spinning
  const spinning1 = t >= T.SPIN1 && t < T.STOP1[2];
  const spinning2 = t >= T.SPIN2 && t < T.STOP2[2];
  if ((spinning1 || spinning2) && t - S.lastTick > 0.055) {
    S.lastTick = t;
    S.tick = (S.tick + 1) % 3;
    ctx.sound.beep(760 + S.tick * 80, 18);
  }

  // reel stops
  for (let i = 0; i < 3; i++) {
    cue(`s1${i}`, T.STOP1[i], () => {
      ctx.sound.noise(55);
      ctx.sound.beep(540, 55);
    });
    cue(`s2${i}`, T.STOP2[i], () => {
      ctx.sound.noise(55);
      ctx.sound.beep(560 + i * 40, 55);
    });
  }

  // sad little trombone
  [392, 330, 262, 196].forEach((f, i) => {
    cue(`sad${i}`, T.SAD + i * 0.2, () => ctx.sound.beep(f, 170));
  });

  // jackpot fanfare
  cue('winNoise', T.STOP2[2] + 0.12, () => ctx.sound.noise(320));
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    cue(`win${i}`, T.STOP2[2] + 0.18 + i * 0.11, () => ctx.sound.beep(f, 140));
  });
  cue('winCoin', T.STOP2[2] + 0.95, () => {
    ctx.sound.beep(1568, 90);
    ctx.sound.beep(2093, 70);
  });

  // the machine makes a call
  cue('cameo', T.CAMEO, () => {
    ctx.sound.beep(196, 210);
    ctx.sound.beep(165, 240);
    ctx.playSlop(CAMEO);
  });

  cue('outro', T.END - 0.5, () => ctx.sound.beep(330, 120));

  drawRays(g, ctx, t, L);
  drawMachine(g, ctx, t, L);
  drawConfetti(g, ctx, t, L);
  drawStreamerGlory(g, ctx, t);
  drawCaptions(g, ctx, t);

  if (!S.done && t >= T.END) {
    S.done = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
