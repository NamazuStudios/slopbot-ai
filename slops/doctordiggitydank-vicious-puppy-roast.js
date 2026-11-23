// A giant adorable puppy trots in on the left, sits, stares at the real
// streamer through the glass, roasts them for a while, then leaves a series
// of small, warm parting gifts on the way out. Vector only, transparent glass.

export const meta = {
  title: 'Vicious Puppy Roast',
  author: 'doctordiggitydank',
  prompt: 'A giant adorable puppydog walks in on the left half of the screen, sits down, looks over at the streamer, and roasts them.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const ENTER_END = 2.6;
const SIT_END = 3.5;
const NOTICE_END = 4.6;
const LINE_DUR = 3.05;
const ROAST_START = 4.85;

const ROASTS = [
  { p: 'Six hours live and your highlight reel is a sneeze.', s: 'The puppy is not impressed.' },
  { p: 'Your aim is a rumor. People have heard of it. Nobody has seen it.', s: 'It is called a crosshair.' },
  { p: 'You talk to chat like a hostage negotiator.', s: 'Nobody is getting out of here.' },
  { p: 'That gaming chair has done more cardio than you.', s: 'It deserves the sponsorship.' },
  { p: 'Your entire setup costs more than your personality.', s: 'The RGB is doing all the work.' },
  { p: 'Your hair lost a fight with that headset.', s: 'The headset is winning.' },
  { p: 'You laugh at your own jokes before anyone else does.', s: 'Brave. Lonely. Brave.' },
  { p: 'You read donations like a clerk at the DMV.', s: 'Next. Next. Thank you.' },
  { p: 'Your game sense is a bedtime story for disappointed mods.', s: 'They are tired. So tired.' },
  { p: 'Somewhere a tutorial is still waiting for you to finish it.', s: 'It has been years.' },
  { p: 'Twelve viewers, and one of them is your router.', s: 'The router says hi.' },
  { p: 'You call that a signature move. I call it falling over.', s: 'The floor disagrees.' },
];

const EXIT_LINE = 'I have made my point. And also that.';
const LINE_COUNT = ROASTS.length;
const ROAST_END = ROAST_START + LINE_DUR * LINE_COUNT;
const EXIT_START = ROAST_END + 1.2;
const EXIT_END = EXIT_START + 5.6;
const END = EXIT_END + 0.9;
const POOP_TIMES = [EXIT_START + 0.8, EXIT_START + 1.95, EXIT_START + 3.1];

let S = null;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, u) { return a + (b - a) * u; }
function smooth(x) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1)); }
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInQuad(x) { return x * x; }

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
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

function wrapLines(c, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const test = cur ? cur + ' ' + words[i] : words[i];
    if (cur && c.measureText(test).width > maxW) {
      lines.push(cur);
      cur = words[i];
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

export function init(ctx) {
  S = {
    fired: {},
    poops: [],
    dropped: {},
    spots: [],
  };
  for (let i = 0; i < 7; i++) {
    S.spots.push({
      x: -0.5 + ctx.rand() * 1.0,
      y: -0.35 + ctx.rand() * 0.7,
      rx: 0.08 + ctx.rand() * 0.14,
      ry: 0.06 + ctx.rand() * 0.1,
      a: ctx.rand() * 3.14,
    });
  }
}

function drawLeg(c, s, hx, hipY, swing, col, lw, pawCol, ink) {
  const fx = hx * s + swing;
  c.beginPath();
  c.moveTo(hx * s, hipY);
  c.lineTo(fx, -0.05 * s);
  c.strokeStyle = ink;
  c.lineWidth = lw * s;
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = (lw - 0.09) * s;
  c.stroke();
  c.beginPath();
  c.ellipse(fx + 0.04 * s, -0.06 * s, 0.19 * s, 0.11 * s, 0, 0, Math.PI * 2);
  c.fillStyle = pawCol;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.03 * s;
  c.stroke();
}

function drawDog(c, o) {
  const s = o.s;
  const ink = '#2b1a2f';
  const fur = '#f2c87e';
  const furD = '#c89448';
  const furL = '#fff1d2';
  const ear = '#bd873c';

  c.save();
  c.translate(o.x, o.groundY);
  c.scale(o.face, 1);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  const lift = o.stand;
  const bodyY = -(0.95 + 0.48 * lift) * s;
  const bodyRX = (1.06 - 0.10 * lift) * s;
  const bodyRY = (0.92 - 0.24 * lift) * s;

  // ground shadow
  c.fillStyle = 'rgba(10,6,18,0.28)';
  c.beginPath();
  c.ellipse(0.05 * s, 0.03 * s, 1.72 * s, 0.19 * s, 0, 0, Math.PI * 2);
  c.fill();

  // tail, behind everything
  const tw = Math.sin(o.tailWag);
  const tailTipX = -1.58 * s;
  const tailTipY = bodyY - 0.72 * s + tw * 0.24 * s;
  c.strokeStyle = ink;
  c.lineWidth = 0.29 * s;
  c.beginPath();
  c.moveTo(-0.8 * s, bodyY + 0.15 * s);
  c.quadraticCurveTo(-1.55 * s, bodyY - 0.12 * s, tailTipX, tailTipY);
  c.stroke();
  c.strokeStyle = fur;
  c.lineWidth = 0.19 * s;
  c.stroke();
  c.fillStyle = furL;
  c.beginPath();
  c.arc(tailTipX, tailTipY, 0.14 * s, 0, Math.PI * 2);
  c.fill();

  // haunch
  c.fillStyle = furD;
  c.beginPath();
  c.ellipse(-0.52 * s, bodyY + 0.36 * s, 0.6 * s, 0.48 * s, -0.12, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.05 * s;
  c.stroke();

  // legs
  const hipY = bodyY + bodyRY * 0.62;
  const swingA = Math.sin(o.walkPhase + 1.1) * (o.moving ? 0.2 : 0.015) * s;
  const swingB = Math.sin(o.walkPhase) * (o.moving ? 0.2 : 0.015) * s;
  drawLeg(c, s, 0.74, hipY, swingA, furD, 0.27, furD, ink);
  drawLeg(c, s, 0.4, hipY, swingB, fur, 0.31, fur, ink);

  // body
  c.beginPath();
  c.ellipse(0, bodyY, bodyRX, bodyRY, -0.04, 0, Math.PI * 2);
  c.fillStyle = fur;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.05 * s;
  c.stroke();

  // belly + spots, clipped to the body
  c.save();
  c.beginPath();
  c.ellipse(0, bodyY, bodyRX, bodyRY, -0.04, 0, Math.PI * 2);
  c.clip();
  c.globalAlpha = 0.85;
  c.fillStyle = furL;
  c.beginPath();
  c.ellipse(0.34 * s, bodyY + 0.22 * s, 0.52 * s, 0.55 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 0.5;
  c.fillStyle = furD;
  for (let i = 0; i < S.spots.length; i++) {
    const sp = S.spots[i];
    c.beginPath();
    c.ellipse(sp.x * s, bodyY + sp.y * s, sp.rx * s, sp.ry * s, sp.a, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.restore();

  // neck
  const hx = (0.48 + 0.12 * o.look) * s;
  const hy = bodyY - bodyRY * 0.98 - 0.44 * s + Math.sin(o.headBob) * 0.03 * s;
  c.strokeStyle = ink;
  c.lineWidth = 0.62 * s;
  c.beginPath();
  c.moveTo(0.3 * s, bodyY - bodyRY * 0.55);
  c.lineTo(hx, hy + 0.4 * s);
  c.stroke();
  c.strokeStyle = fur;
  c.lineWidth = 0.5 * s;
  c.stroke();

  // head group
  c.save();
  c.translate(hx, hy);
  if (o.headTilt) c.rotate(o.headTilt);

  // back ear
  c.beginPath();
  c.moveTo(-0.34 * s, -0.44 * s);
  c.quadraticCurveTo(-1.02 * s, -0.5 * s, -1.03 * s, 0.16 * s);
  c.quadraticCurveTo(-0.99 * s, 0.5 * s, -0.56 * s, 0.27 * s);
  c.quadraticCurveTo(-0.28 * s, 0.05 * s, -0.2 * s, -0.36 * s);
  c.closePath();
  c.fillStyle = ear;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.045 * s;
  c.stroke();

  // head
  const R = 0.66 * s;
  c.beginPath();
  c.arc(0, 0, R, 0, Math.PI * 2);
  c.fillStyle = fur;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.05 * s;
  c.stroke();

  // fluffy tuft
  c.fillStyle = furL;
  c.beginPath();
  c.arc(-0.14 * s, -0.6 * s, 0.14 * s, 0.2, Math.PI * 1.4);
  c.arc(0.06 * s, -0.64 * s, 0.15 * s, 0.1, Math.PI * 1.5);
  c.arc(0.26 * s, -0.58 * s, 0.12 * s, 0.1, Math.PI * 1.6);
  c.fill();

  // muzzle
  c.save();
  c.rotate(0.06);
  c.beginPath();
  c.ellipse(0.5 * s, 0.2 * s, 0.43 * s, 0.31 * s, 0.05, 0, Math.PI * 2);
  c.fillStyle = furL;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.04 * s;
  c.stroke();
  c.restore();

  // nose
  c.save();
  c.translate(0.87 * s, 0.08 * s);
  c.rotate(-0.15);
  c.beginPath();
  c.ellipse(0, 0, 0.14 * s, 0.1 * s, 0, 0, Math.PI * 2);
  c.fillStyle = ink;
  c.fill();
  c.beginPath();
  c.ellipse(-0.04 * s, -0.03 * s, 0.04 * s, 0.025 * s, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.fill();
  c.restore();

  // mouth
  if (o.mouth > 0.04) {
    c.beginPath();
    c.ellipse(0.6 * s, 0.36 * s, 0.22 * s, 0.05 * s + 0.12 * s * o.mouth, 0.02, 0, Math.PI * 2);
    c.fillStyle = '#33191f';
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 0.03 * s;
    c.stroke();
    c.beginPath();
    c.ellipse(0.6 * s, 0.44 * s, 0.13 * s, 0.05 * s + 0.05 * s * o.mouth, 0.02, 0, Math.PI * 2);
    c.fillStyle = '#e0708a';
    c.fill();
    c.fillStyle = '#fffaf0';
    c.beginPath();
    c.moveTo(0.42 * s, 0.3 * s);
    c.lineTo(0.5 * s, 0.3 * s);
    c.lineTo(0.46 * s, 0.37 * s);
    c.closePath();
    c.fill();
  } else {
    c.beginPath();
    c.moveTo(0.42 * s, 0.3 * s);
    c.quadraticCurveTo(0.62 * s, 0.42 * s, 0.82 * s, 0.27 * s);
    c.strokeStyle = 'rgba(43,26,47,0.65)';
    c.lineWidth = 0.035 * s;
    c.stroke();
  }

  // eyes
  const eye = (ex, ey, r) => {
    c.beginPath();
    c.arc(ex, ey, r, 0, Math.PI * 2);
    c.fillStyle = '#fffaf0';
    c.fill();
    c.strokeStyle = ink;
    c.lineWidth = 0.025 * s;
    c.stroke();
    const px = ex + o.look * 0.055 * s;
    const py = ey + 0.01 * s;
    c.beginPath();
    c.arc(px, py, r * 0.56, 0, Math.PI * 2);
    c.fillStyle = '#2b1a2f';
    c.fill();
    c.beginPath();
    c.arc(px - r * 0.2, py - r * 0.26, r * 0.22, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.92)';
    c.fill();
  };
  eye(0.16 * s, -0.14 * s, 0.155 * s);
  eye(-0.3 * s, -0.12 * s, 0.14 * s);

  // brows, angrier as o.brow rises
  const tilt = 0.12 * s * o.brow;
  c.strokeStyle = ink;
  c.lineWidth = 0.05 * s;
  c.beginPath();
  c.moveTo(0.02 * s, -0.38 * s + tilt);
  c.lineTo(0.31 * s, -0.45 * s);
  c.stroke();
  c.beginPath();
  c.moveTo(-0.5 * s, -0.45 * s);
  c.lineTo(-0.15 * s, -0.38 * s + tilt);
  c.stroke();

  // blush
  c.fillStyle = 'rgba(235,120,140,0.32)';
  c.beginPath();
  c.ellipse(0.4 * s, 0.06 * s, 0.17 * s, 0.09 * s, 0.1, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(-0.34 * s, 0.06 * s, 0.15 * s, 0.08 * s, -0.1, 0, Math.PI * 2);
  c.fill();

  // near ear, flopping in front
  c.beginPath();
  c.moveTo(0.38 * s, -0.5 * s);
  c.quadraticCurveTo(1.0 * s, -0.56 * s, 1.03 * s, 0.05 * s);
  c.quadraticCurveTo(1.0 * s, 0.45 * s, 0.58 * s, 0.22 * s);
  c.quadraticCurveTo(0.32 * s, 0.0 * s, 0.26 * s, -0.42 * s);
  c.closePath();
  c.fillStyle = ear;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.045 * s;
  c.stroke();
  c.beginPath();
  c.moveTo(0.46 * s, -0.4 * s);
  c.quadraticCurveTo(0.88 * s, -0.33 * s, 0.87 * s, 0.08 * s);
  c.quadraticCurveTo(0.83 * s, 0.3 * s, 0.6 * s, 0.14 * s);
  c.quadraticCurveTo(0.46 * s, 0.0 * s, 0.42 * s, -0.33 * s);
  c.closePath();
  c.fillStyle = 'rgba(110,62,26,0.3)';
  c.fill();

  c.restore();

  // little collar tag
  c.beginPath();
  c.arc(0.3 * s, bodyY - bodyRY * 0.98 + 0.34 * s, 0.1 * s, 0, Math.PI * 2);
  c.fillStyle = '#ff5fa8';
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.03 * s;
  c.stroke();

  c.restore();
}

function drawSpeech(c, W, H, text, fs, alpha, ox, oy, tailX, tailY) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.font = '800 ' + fs.toFixed(1) + 'px "Trebuchet MS", system-ui, sans-serif';
  const maxText = Math.min(W * 0.4, fs * 14);
  const lines = wrapLines(c, text, maxText);
  let wMax = 0;
  for (let i = 0; i < lines.length; i++) wMax = Math.max(wMax, c.measureText(lines[i]).width);
  const pad = fs * 0.7;
  const bw = Math.min(W - 24, wMax + pad * 2);
  const lh = fs * 1.22;
  const bh = lines.length * lh + pad * 1.05;
  const x = clamp(ox, bw / 2 + 12, W - bw / 2 - 12);
  const y = clamp(oy, bh / 2 + 12, H - bh / 2 - 12);
  const l = x - bw / 2;
  const r = x + bw / 2;
  const tp = y - bh / 2;
  const b = y + bh / 2;

  const tx = clamp(tailX, l + fs, r - fs);
  let ay;
  if (tailY >= b) ay = b - 1;
  else if (tailY <= tp) ay = tp + 1;
  else ay = tailY;

  c.beginPath();
  c.moveTo(tx - fs * 0.3, ay);
  c.lineTo(tx + fs * 0.3, ay);
  c.lineTo(clamp(tailX, 6, W - 6), clamp(tailY, 6, H - 6));
  c.closePath();
  c.fillStyle = 'rgba(255,249,235,0.96)';
  c.fill();
  c.strokeStyle = '#3a2440';
  c.lineWidth = Math.max(2, fs * 0.06);
  c.stroke();

  roundRectPath(c, l, tp, bw, bh, Math.min(bw, bh) * 0.24);
  c.fillStyle = 'rgba(255,249,235,0.96)';
  c.fill();
  c.strokeStyle = '#3a2440';
  c.stroke();

  c.fillStyle = '#2b1a2f';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    c.fillText(lines[i], x, tp + pad * 0.55 + lh * (i + 0.5));
  }
  c.restore();
}

function drawCaption(c, W, y, main, sub, alpha, col) {
  if (alpha <= 0.01) return;
  const fs = clamp(W * 0.04, 20, 50);
  c.save();
  c.globalAlpha = alpha;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.font = '900 ' + fs.toFixed(1) + 'px "Trebuchet MS", system-ui, sans-serif';
  c.lineWidth = fs * 0.2;
  c.strokeStyle = 'rgba(16,8,20,0.9)';
  c.strokeText(main, W / 2, y);
  c.fillStyle = col || '#ffe8f3';
  c.fillText(main, W / 2, y);
  if (sub) {
    const ss = fs * 0.42;
    c.font = '700 ' + ss.toFixed(1) + 'px "Trebuchet MS", system-ui, sans-serif';
    c.lineWidth = ss * 0.3;
    c.strokeStyle = 'rgba(16,8,20,0.9)';
    c.strokeText(sub, W / 2, y + fs * 0.82);
    c.fillStyle = '#bfe9ff';
    c.fillText(sub, W / 2, y + fs * 0.82);
  }
  c.restore();
}

function drawTarget(c, cam, alpha) {
  if (!cam || alpha <= 0.01) return;
  const { l, t, r, b } = cam;
  const len = Math.min(38, (r - l) * 0.16);
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = '#ff5fa8';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(l, t + len); c.lineTo(l, t); c.lineTo(l + len, t);
  c.moveTo(r - len, t); c.lineTo(r, t); c.lineTo(r, t + len);
  c.moveTo(r, b - len); c.lineTo(r, b); c.lineTo(r - len, b);
  c.moveTo(l + len, b); c.lineTo(l, b); c.lineTo(l, b - len);
  c.stroke();
  const fs = clamp((r - l) * 0.055, 12, 24);
  c.font = '800 ' + fs.toFixed(1) + 'px "Trebuchet MS", system-ui, sans-serif';
  c.textAlign = 'left';
  c.textBaseline = 'bottom';
  c.lineWidth = fs * 0.3;
  c.strokeStyle = 'rgba(16,8,20,0.9)';
  c.strokeText('SUBJECT: SAVORYSAILOR', l, t - 8);
  c.fillStyle = '#ff9fca';
  c.fillText('SUBJECT: SAVORYSAILOR', l, t - 8);
  c.restore();
}

function drawPoop(c, x, y, size, alpha) {
  if (alpha <= 0.01 || size <= 1) return;
  c.save();
  c.globalAlpha = alpha;
  c.lineJoin = 'round';
  const ink = '#3a2312';
  const brown = '#7b4a24';
  c.fillStyle = brown;
  c.strokeStyle = ink;
  c.lineWidth = Math.max(1.5, size * 0.055);

  c.beginPath();
  c.ellipse(x, y, size * 0.52, size * 0.24, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.beginPath();
  c.ellipse(x, y - size * 0.2, size * 0.39, size * 0.22, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.beginPath();
  c.ellipse(x + size * 0.06, y - size * 0.37, size * 0.25, size * 0.16, 0.24, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.beginPath();
  c.ellipse(x + size * 0.2, y - size * 0.49, size * 0.11, size * 0.1, 0.2, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.fillStyle = 'rgba(255,232,190,0.35)';
  c.beginPath();
  c.ellipse(x - size * 0.1, y - size * 0.26, size * 0.09, size * 0.06, 0.3, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawStink(c, x, y, size, t, phase) {
  c.save();
  c.strokeStyle = 'rgba(200,255,180,0.6)';
  c.lineWidth = Math.max(1.5, size * 0.05);
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * size * 0.3;
    const wob = Math.sin(t * 3.2 + phase + i * 1.3) * size * 0.09;
    c.beginPath();
    c.moveTo(x + off + wob, y - size * 0.55);
    c.quadraticCurveTo(
      x + off - wob * 1.5, y - size * 0.8,
      x + off + wob, y - size * 1.05 - i * size * 0.04,
    );
    c.stroke();
  }
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!S) init(ctx);

  const sound = (key, cond, fn) => {
    if (cond && !S.fired[key]) {
      S.fired[key] = true;
      try { fn(); } catch (e) { /* audio is best effort */ }
    }
  };

  const s = clamp(Math.min(W * 0.13, H * 0.18), 42, 200);
  const groundY = H * 0.9;
  const stopX = clamp(W * 0.2, 1.4 * s, W * 0.3);

  let cam = null;
  let aimX;
  if (ctx.streamer) {
    const st = ctx.streamer;
    cam = {
      l: st.x * W,
      t: st.y * H,
      r: (st.x + st.w) * W,
      b: (st.y + st.h) * H,
    };
    cam.w = cam.r - cam.l;
    cam.h = cam.b - cam.t;
    aimX = cam.l + cam.w * 0.5;
  } else {
    aimX = W * 0.68;
  }

  const lookAt = clamp((aimX - (stopX + 0.5 * s)) / (s * 1.7), -0.9, 0.9);

  // ---- motion ----
  let dogX;
  let face = 1;
  let moving = false;
  let walkPhase = 0;
  let stand = 0;

  if (t < ENTER_END) {
    const u = easeOutCubic(clamp(t / ENTER_END, 0, 1));
    dogX = -3.4 * s + (stopX + 3.4 * s) * u;
    moving = true;
    walkPhase = t * 11;
    stand = 1;
  } else if (t < EXIT_START) {
    dogX = stopX + Math.sin(Math.max(0, t - ENTER_END) * 1.6) * s * 0.045;
    if (t < SIT_END) stand = 1 - smooth((t - ENTER_END) / (SIT_END - ENTER_END));
    else if (t < ROAST_END) stand = 0;
    else stand = smooth((t - ROAST_END) / (EXIT_START - ROAST_END));
  } else {
    const u = clamp((t - EXIT_START) / (EXIT_END - EXIT_START), 0, 1);
    dogX = stopX - (stopX + 4.2 * s) * easeInQuad(u);
    face = -1;
    moving = true;
    walkPhase = (t - EXIT_START) * 13;
    stand = u < 0.14 ? smooth(u / 0.14) : 1;
  }

  // ---- expression ----
  let look = 0.55;
  if (t < ENTER_END) look = 0.2 + 0.15 * Math.sin(t * 3);
  else if (t < NOTICE_END) look = lerp(0.2, lookAt, smooth((t - SIT_END) / 0.9));
  else if (t < ROAST_END) look = lookAt + Math.sin(t * 1.7) * 0.1;
  else if (t < EXIT_START) look = lookAt;
  else look = t > EXIT_START + 1.4 && face < 0 ? -0.4 : 0.4;

  let idx = -1;
  let lineU = 0;
  if (t >= ROAST_START && t < ROAST_END) {
    idx = Math.min(LINE_COUNT - 1, Math.floor((t - ROAST_START) / LINE_DUR));
    lineU = t - ROAST_START - idx * LINE_DUR;
  }

  const speaking = idx >= 0 && lineU < 1.75;
  const exitSpeaking = t > EXIT_START + 0.9 && t < EXIT_START + 3.2;
  const mouth = speaking
    ? 0.35 + 0.65 * Math.abs(Math.sin(t * 13))
    : exitSpeaking
      ? 0.3 + 0.5 * Math.abs(Math.sin(t * 11))
      : 0;
  const brow = idx >= 0 ? 1 : t > SIT_END ? 0.5 : 0.05;
  const wagRate = t < EXIT_START ? (idx >= 0 ? 4.2 : 7.5) : 11;
  const headBob = speaking || exitSpeaking ? t * 8 : t * 2;
  const headTilt = idx >= 0 ? Math.sin(t * 2.2) * 0.03 : 0;

  // ---- sounds ----
  sound('enter1', t > 0.15, () => ctx.sound.noise(190));
  sound('enter2', t > 1.25, () => ctx.sound.noise(200));
  sound('sit', t > SIT_END - 0.15, () => ctx.sound.noise(250));
  sound('notice1', t > SIT_END + 0.1, () => ctx.sound.beep(660, 90));
  sound('notice2', t > SIT_END + 0.24, () => ctx.sound.beep(880, 120));
  sound('roastGo', t > ROAST_START - 0.15, () => ctx.sound.noise(320));
  if (idx >= 0) {
    for (let k = 0; k < 3; k++) {
      const yk = 'yap' + idx + '_' + k;
      sound(yk, lineU > 0.1 + k * 0.48, () => ctx.sound.beep(560 - idx * 15 - k * 35, 55));
    }
  }
  sound('stand', t > ROAST_END + 0.1, () => ctx.sound.noise(240));
  sound('bark1', t > EXIT_START + 0.1, () => ctx.sound.beep(240, 90));
  sound('bark2', t > EXIT_START + 0.28, () => ctx.sound.beep(165, 130));

  // ---- poop trail ----
  for (let i = 0; i < POOP_TIMES.length; i++) {
    if (t >= POOP_TIMES[i] && !S.dropped['p' + i]) {
      S.dropped['p' + i] = true;
      S.poops.push({ x: dogX + 0.95 * s, t: t, ph: i * 2.1 });
      try {
        ctx.sound.beep(95, 150);
        ctx.sound.noise(120);
      } catch (e) { /* audio is best effort */ }
    }
  }

  // target brackets on the real streamer
  let targetAlpha = 0;
  if (t > SIT_END + 0.2 && t < ROAST_END) {
    targetAlpha = 0.3 + 0.25 * Math.sin(t * 4.5);
  }
  drawTarget(c, cam, targetAlpha);

  // dropped gifts
  for (let i = 0; i < S.poops.length; i++) {
    const p = S.poops[i];
    const age = t - p.t;
    const pop = clamp(age * 5, 0, 1);
    const sc = pop * (1 + 0.16 * Math.sin(Math.min(1, age * 5) * Math.PI));
    const px = p.x;
    const py = groundY - 0.02 * s;
    if (age < 2.4) drawStink(c, px, py, s * 0.55, t, p.ph);
    drawPoop(c, px, py, s * 0.58 * sc, 1);
  }

  // the giant puppy
  drawDog(c, {
    x: dogX,
    groundY,
    s,
    face,
    stand,
    moving,
    walkPhase,
    look,
    mouth,
    brow,
    headBob,
    headTilt,
    tailWag: t * wagRate,
  });

  // ---- speech bubbles ----
  const headWX = dogX + face * (0.5 + 0.12 * look) * s;
  const headTopY = groundY - (2.55 + 0.55 * stand) * s;
  const bubbleX = clamp(headWX + face * 0.7 * s, 60, W - 60);
  const bubbleY = headTopY - 1.3 * s;
  const bFs = clamp(s * 0.27, 17, 44);

  if (t > SIT_END + 0.4 && t < SIT_END + 0.95) {
    drawSpeech(c, W, H, 'AHEM.', bFs * 0.8, clamp((t - SIT_END - 0.4) / 0.15, 0, 1) * clamp((SIT_END + 0.95 - t) / 0.15, 0, 1), bubbleX, bubbleY, headWX, headTopY + 0.3 * s);
  }

  if (idx >= 0) {
    const show = lineU > 0.1 && lineU < LINE_DUR - 0.18;
    const fade = clamp((lineU - 0.1) / 0.22, 0, 1) * clamp((LINE_DUR - 0.18 - lineU) / 0.28, 0, 1);
    if (show) {
      drawSpeech(c, W, H, ROASTS[idx].p, bFs, fade, bubbleX, bubbleY, headWX, headTopY + 0.3 * s);
    }
  }

  if (t > EXIT_START + 0.9 && t < EXIT_START + 3.4) {
    const a = clamp((t - EXIT_START - 0.9) / 0.25, 0, 1) * clamp((EXIT_START + 3.4 - t) / 0.35, 0, 1);
    drawSpeech(c, W, H, EXIT_LINE, bFs, a, bubbleX, bubbleY, headWX, headTopY + 0.3 * s);
  }

  // ---- displeasure meter ----
  if (idx >= 0) {
    const mw = clamp(W * 0.15, 120, 300);
    const mx = W - mw - 28;
    const my = 30;
    const prog = clamp((t - ROAST_START) / (ROAST_END - ROAST_START), 0, 1);
    c.save();
    c.globalAlpha = 0.9;
    c.font = '800 12px "Trebuchet MS", system-ui, sans-serif';
    c.textAlign = 'right';
    c.textBaseline = 'bottom';
    c.fillStyle = '#ffd9ec';
    c.fillText('PUPPY DISPLEASURE', W - 28, my - 6);
    roundRectPath(c, mx, my, mw, 10, 5);
    c.fillStyle = 'rgba(20,10,32,0.5)';
    c.fill();
    c.strokeStyle = 'rgba(255,159,202,0.7)';
    c.lineWidth = 1.5;
    c.stroke();
    roundRectPath(c, mx, my, Math.max(6, mw * prog), 10, 5);
    c.fillStyle = '#ff5fa8';
    c.fill();
    c.restore();
  }

  // ---- captions ----
  const capFs = clamp(W * 0.04, 20, 50);
  const capY = cam && cam.b > H * 0.86 ? capFs * 1.4 : H - capFs * 1.25;
  let capMain = '';
  let capSub = '';
  let capCol = '#ffe8f3';
  let capA = 1;

  if (t < ENTER_END) {
    capMain = 'A GIANT DOG ENTERS THE STREAM';
    capSub = 'This is normal. Do not question it.';
    capA = clamp(t / 0.4, 0, 1);
  } else if (t < SIT_END) {
    capMain = 'THE DOG HAS SAT DOWN';
    capSub = 'It is assessing SavorySailor.';
  } else if (t < NOTICE_END) {
    capMain = 'EYE CONTACT';
    capSub = 'SavorySailor has been noticed.';
    capCol = '#ff8cc6';
  } else if (idx >= 0) {
    capMain = 'ROAST ' + (idx + 1) + ' OF ' + LINE_COUNT;
    capSub = ROASTS[idx].s;
    capCol = '#ff8cc6';
    capA = clamp(lineU / 0.15, 0, 1) * clamp((LINE_DUR - lineU) / 0.3, 0, 1);
  } else if (t < EXIT_START) {
    capMain = 'THE PUPPY HAS SAID ENOUGH';
    capSub = 'For now.';
  } else if (t < EXIT_END) {
    capMain = 'THE DOG LEAVES';
    capSub = 'And drops a parting gift.';
    capCol = '#d6ff9a';
  } else {
    capMain = 'ASSESSMENT COMPLETE';
    capSub = 'SavorySailor remains employed. Barely.';
  }
  drawCaption(c, W, capY, capMain, capSub, capA, capCol);

  if (t >= END && !S.fired.__done) {
    S.fired.__done = true;
    try { ctx.done(); } catch (e) { /* host may already be tearing down */ }
  }
}

export function dispose(ctx) {
  S = null;
}
