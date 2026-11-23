export const meta = {
  title: 'Hotdog Covenant',
  author: 'doctordiggitydank',
  prompt: 'Every time a slop plays in the future, ALSO add ten hotdogs that spawn from the top of the scene and slowly fall downward. For every slop prompt that plays after that, double the amount of hotdogs.',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

// --- scheduling -------------------------------------------------------------
const WAVES = [
  { at: 0.3, count: 10, caption: 'TEN HOTDOGS, SAVORYSAILOR.' },
  { at: 4.0, count: 20, caption: 'NOW TWENTY. THAT IS THE MATH.' },
  { at: 7.7, count: 40, caption: 'FORTY. STILL FINE. PROBABLY.' },
  { at: 11.4, count: 80, caption: 'EIGHTY, PER THE COVENANT.' },
  { at: 15.1, count: 160, caption: 'ONE HUNDRED AND SIXTY. LOOK UP.' },
];

const LINES = [
  { at: 19.9, text: 'IT DOUBLES FOREVER. THAT IS THE RULE NOW.' },
  { at: 22.7, text: 'SORRY, SAVORYSAILOR.' },
  { at: 24.9, text: 'HOTDOG COMPLETE.' },
];

const TOTAL_DOGS = WAVES.reduce((n, w) => n + w.count, 0);
const END_AT = 27.4;
const BINS = 16;

// --- state ------------------------------------------------------------------
let S = null;

export function init(ctx) {
  const W = ctx.width || 1280;
  const H = ctx.height || 720;
  const s = Math.max(19, Math.min(46, H * 0.056));

  S = {
    W,
    H,
    s,
    step: s * 0.44,
    floorY: H * 0.95,
    binW: W / BINS,
    startedAt: null,
    dogs: [],
    bins: new Array(BINS).fill(0),
    nextWave: 0,
    nextLine: 0,
    cap: { text: '', at: -99 },
    deployed: 0,
    lastBeep: -99,
    ended: false,
    fanfare: false,
  };
}

export function dispose() {
  S = null;
}

export function frame(ctx, t) {
  if (!S) init(ctx);
  if (S.startedAt === null) S.startedAt = t;
  const el = t - S.startedAt;
  const g = ctx.canvas;

  // transparent glass: never paint a background
  g.clearRect(0, 0, S.W, S.H);

  while (S.nextWave < WAVES.length && el >= WAVES[S.nextWave].at) {
    startWave(ctx, WAVES[S.nextWave], el);
    S.nextWave++;
  }
  while (S.nextLine < LINES.length && el >= LINES[S.nextLine].at) {
    S.cap = { text: LINES[S.nextLine].text, at: el };
    S.nextLine++;
  }

  drawDogs(ctx, g, el);
  drawCounter(g);
  drawCaption(g, el);

  if (!S.fanfare && el >= 24.9) {
    S.fanfare = true;
    ctx.sound.noise(0.22);
    ctx.sound.beep(392, 110);
    ctx.sound.beep(523, 110);
    ctx.sound.beep(659, 180);
    ctx.sound.beep(784, 300);
  }

  if (!S.ended && el >= END_AT) {
    S.ended = true;
    ctx.done();
  }
}

// --- waves ------------------------------------------------------------------
function startWave(ctx, wave, el) {
  S.cap = { text: wave.caption, at: el };
  ctx.sound.noise(0.15);

  const bag = balancedBins(ctx, wave.count);
  const gap = Math.min(0.13, 2.6 / wave.count);

  for (let i = 0; i < wave.count; i++) {
    const bin = bag[i];
    const idx = S.bins[bin]++;
    const jitter = (ctx.rand() - 0.5) * S.binW * 0.62;
    const ty = S.floorY - idx * S.step - S.s * 0.34;

    S.dogs.push({
      x: (bin + 0.5) * S.binW + jitter,
      y0: -S.s * 1.4 - ctx.rand() * S.H * 0.32,
      ty,
      born: el + i * gap,
      vy: (115 + ctx.rand() * 80) * (S.H / 720),
      spin0: (ctx.rand() - 0.5) * 0.6,
      spinV: (ctx.rand() - 0.5) * 2.4,
      settleRot: (ctx.rand() - 0.5) * 0.34,
      sauce: ctx.rand() < 0.3 ? 'k' : 'm',
      hit: false,
    });
    S.deployed++;
  }
}

function balancedBins(ctx, count) {
  const bag = [];
  for (let i = 0; i < count; i++) bag.push(i % BINS);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(ctx.rand() * (i + 1));
    const tmp = bag[i];
    bag[i] = bag[j];
    bag[j] = tmp;
  }
  return bag;
}

// --- hotdogs ----------------------------------------------------------------
function drawDogs(ctx, g, el) {
  const s = S.s;
  for (let i = 0; i < S.dogs.length; i++) {
    const d = S.dogs[i];
    const age = el - d.born;
    if (age < 0) continue;

    const landAt = (d.ty - d.y0) / d.vy;
    let y;
    let rot;

    if (age < landAt) {
      y = d.y0 + d.vy * age;
      rot = d.spin0 + d.spinV * age;
    } else {
      const b = age - landAt;
      y = d.ty - (b < 0.3 ? Math.sin((b / 0.3) * Math.PI) * 5 : 0);
      rot = d.settleRot;
      if (!d.hit) {
        d.hit = true;
        if (el - S.lastBeep > 0.085) {
          S.lastBeep = el;
          const pan = d.x / S.W;
          ctx.sound.beep(230 + pan * 420 + (d.sauce === 'k' ? 40 : 0), 45);
        }
      }
    }

    drawDog(g, d, y, rot, s);
  }
}

function drawDog(g, d, y, rot, s) {
  const L = s * 2.05;
  const hh = s * 0.52;

  g.save();
  g.translate(d.x, y);
  g.rotate(rot);

  // bun
  g.fillStyle = '#e7b76b';
  rr(g, -L * 0.5, -hh * 0.64, L, hh * 1.58, hh * 0.78);
  g.fill();
  g.strokeStyle = 'rgba(62,30,14,0.55)';
  g.lineWidth = Math.max(1, s * 0.055);
  g.stroke();

  // bun highlight
  g.fillStyle = 'rgba(255,236,190,0.45)';
  rr(g, -L * 0.4, -hh * 0.46, L * 0.8, hh * 0.4, hh * 0.2);
  g.fill();

  // sausage
  g.fillStyle = '#b8482c';
  rr(g, -L * 0.47, -hh * 0.44, L * 0.94, hh * 0.86, hh * 0.43);
  g.fill();
  g.strokeStyle = 'rgba(58,20,10,0.6)';
  g.lineWidth = Math.max(1, s * 0.045);
  g.stroke();

  // sausage shine
  g.fillStyle = 'rgba(255,152,112,0.4)';
  rr(g, -L * 0.38, -hh * 0.36, L * 0.76, hh * 0.2, hh * 0.1);
  g.fill();

  // mustard or ketchup squiggle
  g.strokeStyle = d.sauce === 'k' ? '#c0392b' : '#f2cf3c';
  g.lineWidth = Math.max(1.5, s * 0.15);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  const x0 = -L * 0.34;
  const x1 = L * 0.34;
  const steps = 6;
  for (let i = 0; i <= steps; i++) {
    const px = x0 + ((x1 - x0) * i) / steps;
    const py = i % 2 === 0 ? -hh * 0.2 : hh * 0.2;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.stroke();

  g.restore();
}

function rr(g, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.lineTo(x + w - rad, y);
  g.arcTo(x + w, y, x + w, y + rad, rad);
  g.lineTo(x + w, y + h - rad);
  g.arcTo(x + w, y + h, x + w - rad, y + h, rad);
  g.lineTo(x + rad, y + h);
  g.arcTo(x, y + h, x, y + h - rad, rad);
  g.lineTo(x, y + rad);
  g.arcTo(x, y, x + rad, y, rad);
  g.closePath();
}

// --- typography -------------------------------------------------------------
function drawCounter(g) {
  const fs = Math.max(11, Math.min(22, S.H * 0.026));
  g.save();
  g.globalAlpha = 0.9;
  g.font = `800 ${fs}px system-ui, sans-serif`;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  const txt = `HOTDOGS DEPLOYED  ${S.deployed} / ${TOTAL_DOGS}`;
  g.lineWidth = Math.max(2, fs * 0.16);
  g.strokeStyle = 'rgba(16,12,30,0.8)';
  g.strokeText(txt, fs, fs);
  g.fillStyle = '#ffd6ea';
  g.fillText(txt, fs, fs);
  g.restore();
}

function drawCaption(g, el) {
  if (!S.cap.text) return;
  const age = el - S.cap.at;
  const dur = 3.5;
  if (age < 0 || age > dur) return;

  const fade = Math.min(1, age / 0.16) * Math.min(1, (dur - age) / 0.4);
  const pop = 1 + Math.max(0, 0.16 - age * 0.6);
  const fs = Math.max(20, Math.min(60, S.W * 0.044));

  g.save();
  g.globalAlpha = fade;
  g.translate(S.W / 2, S.H * 0.155);
  g.scale(pop, pop);
  g.font = `900 ${fs}px system-ui, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(4, fs * 0.17);
  g.strokeStyle = 'rgba(18,10,36,0.88)';
  g.strokeText(S.cap.text, 0, 0);
  g.fillStyle = '#ff5fa2';
  g.fillText(S.cap.text, 0, 0);
  g.restore();
}
