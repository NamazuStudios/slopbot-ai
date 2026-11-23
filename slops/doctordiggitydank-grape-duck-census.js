// Grape Duck Census — 350 ducks, one question, zero grapes.

export const meta = {
  title: 'Grape Duck Census',
  author: 'doctordiggitydank',
  prompt: 'Over the course of 60 seconds, three hundred and fifty fully animated ducks waddle into the screen and ask if the streamer has any grapes.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const TOTAL = 350;

const LINES = [
  'you got any grapes?',
  'excuse me. grapes?',
  'do you have grapes, please?',
  'grapes. that is all.',
  'ma\u2019am. grapes?',
  'you got any motherfuckin\u2019 grapes?',
  'I walked here. grapes.',
  'is this a grape establishment?',
  'one grape. I ask for one.',
  'grapes, or I riot.',
  'the children demand grapes.',
  'I have been waddling for years.',
  'you got any motherfuckin\u2019 grapes though?',
  'sorry to bother you. grapes.',
  'I smell no grapes.',
  'GRAPES. GRAPES. GRAPES.',
  'do you have grapes or do I have to get loud?',
  'my whole family is outside. grapes.',
  'quick question. grapes?',
  'I am not leaving without grapes.',
  'sir. ma\u2019am. grapes.',
  'you got any damn grapes?',
  'this is a grape emergency.',
  'I brought thirty of my cousins. grapes.',
  'you got any motherfuckin\u2019 grapes or what?',
  'grapes. now. please.',
  'I have travelled six miles for grapes.',
  'are the grapes in the back?',
  'I heard there were grapes.',
  'bill me later. grapes first.',
];

const BODY_COLORS = ['#f8f5ec', '#f1ead9', '#e9ddc4', '#f4e7cf', '#ded4c6', '#e6d8b8'];
const WING_COLORS = ['#ddd5c1', '#d3c9b2', '#cfc3aa', '#cabd9f', '#c9c0b4'];

let S = null;

function spawnTime(i) {
  const u = i / (TOTAL - 1);
  return 1.2 + 48.5 * Math.pow(u, 0.55);
}

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }

function easeOut(k) { return 1 - Math.pow(1 - k, 3); }

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  const streamer = ctx.streamer
    ? { x: ctx.streamer.x * W, y: ctx.streamer.y * H, w: ctx.streamer.w * W, h: ctx.streamer.h * H }
    : null;

  const duckW = clamp(W * 0.044, 34, 88);
  const dw = duckW;

  let bandTop = H * 0.5;
  if (streamer) bandTop = Math.max(bandTop, streamer.y + streamer.h + duckW * 0.35);
  bandTop = clamp(bandTop, H * 0.38, H * 0.74);
  const bandBottom = H - duckW * 0.55;

  S = {
    W, H, dw, bandTop, bandBottom, streamer,
    ducks: [],
    spawned: 0,
    tokens: 5,
    done: false,
    finale: 0,
    fringe: [],
    captions: [
      { at: 51.6, text: 'THREE HUNDRED AND FIFTY DUCKS.', until: 54.2 },
      { at: 54.2, text: 'SAVORYSAILOR, MA\u2019AM. DO YOU HAVE ANY GRAPES?', until: 56.6 },
      { at: 56.6, text: 'GRAPE DEFICIT: TOTAL.', until: 99 },
    ],
  };
}

function pickLine(r) {
  return LINES[Math.floor(r * LINES.length) % LINES.length];
}

function spawnDuck(ctx) {
  const st = S;
  const i = st.spawned;
  const boss = i === TOTAL - 1;
  const r1 = ctx.rand(), r2 = ctx.rand(), r3 = ctx.rand(), r4 = ctx.rand();

  const s = boss ? 1.85 : 0.86 + r2 * 0.32;
  const tx = boss ? st.W * 0.5 : st.W * (0.04 + 0.92 * r3);
  const ty = boss
    ? st.bandBottom - 26 * s
    : st.bandBottom - (st.bandBottom - st.bandTop) * Math.pow(r1, 1.5);

  const fromLeft = tx < st.W * 0.5;
  const dir = fromLeft ? 1 : -1;
  const startX = fromLeft ? -st.dw * 1.2 : st.W + st.dw * 1.2;
  const dur = boss ? 1.5 : 0.95 + r4 * 0.75;
  const at = spawnTime(i);

  const duck = {
    i, s, tx, ty, x: startX, dir,
    t0: at,
    arriveAt: at + dur,
    startX,
    arrived: false,
    qAt: null,
    q: 0,
    talkUntil: 0,
    bob: r4 * Math.PI * 2,
    phase: r1 * Math.PI * 2,
    pitch: r2,
    body: BODY_COLORS[Math.floor(r3 * BODY_COLORS.length)],
    wing: WING_COLORS[Math.floor(r1 * WING_COLORS.length)],
    mallard: !boss && r4 > 0.82,
    line: boss ? 'so. you got any grapes?' : pickLine(r3),
    boss,
  };
  if (boss) {
    duck.body = '#f8f5ec';
    duck.wing = '#d8d0bd';
    duck.ty = st.bandBottom - 24 * s;
  }
  st.ducks.push(duck);
  st.spawned++;
}

function tryQuack(ctx, duck) {
  if (S.tokens < 1) return;
  S.tokens -= 1;
  const base = 400 + duck.pitch * 240;
  const f = base * (1 - duck.q * 0.085);
  ctx.sound.beep(f, duck.boss ? 90 : 54);
}

function updateDuck(ctx, d, t) {
  if (!d.arrived) {
    if (t >= d.arriveAt) {
      d.arrived = true;
      d.qAt = [t + 0.02, t + 0.16, t + 0.3];
      d.talkUntil = t + (d.boss ? 9 : 1.7 + ctx.rand() * 1.9);
    } else {
      const p = clamp((t - d.t0) / (d.arriveAt - d.t0), 0, 1);
      d.x = lerp(d.startX, d.tx, easeOut(p));
    }
  } else {
    d.x = d.tx;
  }

  if (d.q < 3 && d.qAt && t >= d.qAt[d.q]) {
    tryQuack(ctx, d);
    d.q++;
  }
}

function drawDuck(c, d, t, pulse) {
  const s = d.s;
  const walking = !d.arrived;
  const spd = walking ? 11 : 3.2;
  const wob = Math.sin(t * spd + d.phase) * (walking ? 0.075 : 0.035);
  const bobY = Math.sin(t * spd * 2 + d.phase) * (walking ? 2.4 : 1.1) + pulse * Math.sin(t * 7 + d.phase) * 2.2;

  const small = s < 1.0;

  c.save();
  c.translate(d.x, d.ty + bobY * s);
  c.scale(d.dir * s, s);
  c.rotate(wob);

  // shadow
  if (!small) {
    c.beginPath();
    c.ellipse(0, 2, 26, 6, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(10,14,28,0.22)';
    c.fill();
  }

  // legs
  const step = walking ? Math.sin(t * spd * 2 + d.phase) * 4 : 0;
  c.strokeStyle = '#e07d22';
  c.lineWidth = 3;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-6 + step, -14); c.lineTo(-7 + step, -1);
  c.moveTo(-7 + step, -1); c.lineTo(-12 + step, 1);
  c.moveTo(-7 + step, -1); c.lineTo(-3 + step, 1);
  c.moveTo(7 - step, -14); c.lineTo(8 - step, -1);
  c.moveTo(8 - step, -1); c.lineTo(3 - step, 1);
  c.moveTo(8 - step, -1); c.lineTo(12 - step, 1);
  c.stroke();

  c.lineJoin = 'round';
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(18,22,38,0.7)';

  // tail
  c.beginPath();
  c.moveTo(-18, -30);
  c.lineTo(-30, -34);
  c.lineTo(-19, -22);
  c.closePath();
  c.fillStyle = d.body;
  c.fill();
  c.stroke();

  // body
  c.beginPath();
  c.ellipse(0, -24, 22, 15.5, 0, 0, Math.PI * 2);
  c.fillStyle = d.body;
  c.fill();
  c.stroke();

  // wing
  c.beginPath();
  c.ellipse(2, -23, 13, 8.5, -0.15, 0, Math.PI * 2);
  c.fillStyle = d.wing;
  c.fill();
  c.globalAlpha = 0.5;
  c.stroke();
  c.globalAlpha = 1;

  // neck
  c.beginPath();
  c.moveTo(9, -33);
  c.quadraticCurveTo(14, -42, 15, -44);
  c.lineTo(24, -40);
  c.quadraticCurveTo(18, -36, 15, -32);
  c.closePath();
  c.fillStyle = d.body;
  c.fill();

  // head
  c.beginPath();
  c.arc(17, -46, 10.5, 0, Math.PI * 2);
  c.fillStyle = d.mallard ? '#2f7a4e' : d.body;
  c.fill();
  c.stroke();

  // eye
  c.beginPath();
  c.arc(20, -48, 2.1, 0, Math.PI * 2);
  c.fillStyle = '#161a2c';
  c.fill();

  // beak
  c.beginPath();
  c.moveTo(26, -47);
  c.lineTo(37, -44.5);
  c.lineTo(26, -41.5);
  c.closePath();
  c.fillStyle = '#ef8c2f';
  c.fill();
  c.stroke();

  // beak open when quacking/talking
  const talking = d.arrived && t < d.talkUntil;
  if (talking) {
    const open = 0.5 + 0.5 * Math.sin(t * 22 + d.phase);
    c.beginPath();
    c.moveTo(26, -45.5);
    c.lineTo(35, -44.5 + open * 4);
    c.lineTo(26, -42);
    c.closePath();
    c.fillStyle = '#c96d18';
    c.fill();
  }

  c.restore();
}

function wrap(c, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (let i = 0; i < words.length; i++) {
    const test = line ? line + ' ' + words[i] : words[i];
    if (c.measureText(test).width > maxW && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function drawBubble(c, d, t) {
  const s = d.s;
  const fs = Math.round(clamp(12 * s, 10, 19));
  c.font = '700 ' + fs + 'px "Trebuchet MS", Arial, sans-serif';
  const maxW = 150 * s;
  const lines = wrap(c, d.line, maxW);
  const lh = fs * 1.18;
  const padX = 8 * s, padY = 6 * s;
  let textW = 0;
  for (let i = 0; i < lines.length; i++) textW = Math.max(textW, c.measureText(lines[i]).width);

  const bw = textW + padX * 2;
  const bh = lines.length * lh + padY * 2;
  const ax = d.x + (d.dir > 0 ? 12 * s : -12 * s);
  const ay = d.ty - 74 * s - bh;
  let bx = ax - bw * 0.35;
  bx = clamp(bx, 4, S.W - bw - 4);
  const by = Math.max(4, ay);

  c.save();
  c.beginPath();
  const rr = Math.min(10 * s, bh * 0.4);
  c.moveTo(bx + rr, by);
  c.lineTo(bx + bw - rr, by);
  c.quadraticCurveTo(bx + bw, by, bx + bw, by + rr);
  c.lineTo(bx + bw, by + bh - rr);
  c.quadraticCurveTo(bx + bw, by + bh, bx + bw - rr, by + bh);
  c.lineTo(bx + rr, by + bh);
  c.quadraticCurveTo(bx, by + bh, bx, by + bh - rr);
  c.lineTo(bx, by + rr);
  c.quadraticCurveTo(bx, by, bx + rr, by);
  c.closePath();
  c.fillStyle = 'rgba(252,250,244,0.94)';
  c.fill();
  c.lineWidth = Math.max(1.4, 2 * s * 0.7);
  c.strokeStyle = 'rgba(24,28,48,0.85)';
  c.stroke();

  // tail
  c.beginPath();
  c.moveTo(ax - 7 * s, by + bh - 1);
  c.lineTo(ax, by + bh + 9 * s);
  c.lineTo(ax + 7 * s, by + bh - 1);
  c.closePath();
  c.fillStyle = 'rgba(252,250,244,0.94)';
  c.fill();
  c.stroke();

  c.fillStyle = '#1b1f31';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    c.fillText(lines[i], bx + bw / 2, by + padY + lh * (i + 0.5));
  }
  c.restore();
}

function drawCaption(c, text, alpha, size, cx, cy) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '900 ' + size + 'px "Arial Black", Impact, Arial, sans-serif';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(6, size * 0.14);
  c.strokeStyle = 'rgba(16,20,38,0.92)';
  c.strokeText(text, cx, cy, S.W * 0.92);
  c.fillStyle = '#fdf8ec';
  c.fillText(text, cx, cy, S.W * 0.92);
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const st = S;
  if (!st) return;
  c.clearRect(0, 0, ctx.width, ctx.height);

  st.tokens = Math.min(9, st.tokens + Math.min(dt, 0.1) * 9);

  while (st.spawned < TOTAL && t >= spawnTime(st.spawned)) spawnDuck(ctx);

  for (let i = 0; i < st.ducks.length; i++) updateDuck(ctx, st.ducks[i], t);

  // draw the crowd back-to-front
  const order = st.ducks.slice().sort((a, b) => a.ty - b.ty);
  const pulse = t > 56.4 ? clamp((t - 56.4) / 0.8, 0, 1) : 0;
  for (let i = 0; i < order.length; i++) {
    const d = order[i];
    if (d.x < -st.dw * 2 || d.x > ctx.width + st.dw * 2) continue;
    drawDuck(c, d, t, pulse);
  }

  // speech bubbles: the freshest speakers only
  const talkers = st.ducks.filter(d => d.arrived && t < d.talkUntil);
  talkers.sort((a, b) => b.talkUntil - a.talkUntil);
  const shown = talkers.slice(0, 20);
  for (let i = shown.length - 1; i >= 0; i--) drawBubble(c, shown[i], t);

  // HUD
  c.save();
  c.font = '900 ' + Math.round(clamp(ctx.width * 0.012, 13, 24)) + 'px "Arial Black", Arial, sans-serif';
  c.textAlign = 'left';
  c.textBaseline = 'top';
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(16,20,38,0.85)';
  c.strokeText('DUCKS: ' + st.spawned + ' / ' + TOTAL + '   GRAPES: 0', 16, 14);
  c.fillStyle = st.spawned >= TOTAL ? '#ffd75e' : '#fdf8ec';
  c.fillText('DUCKS: ' + st.spawned + ' / ' + TOTAL + '   GRAPES: 0', 16, 14);
  c.restore();

  // caption band
  const cx = st.streamer ? st.streamer.x + st.streamer.w / 2 : ctx.width / 2;
  let cy = st.streamer ? st.streamer.y - 60 : ctx.height * 0.16;
  const bigSize = Math.round(clamp(ctx.width * 0.034, 26, 64));
  cy = clamp(cy, bigSize, ctx.height - bigSize);

  for (let i = 0; i < st.captions.length; i++) {
    const cap = st.captions[i];
    if (t < cap.at || t > cap.until) continue;
    const a = clamp((t - cap.at) / 0.4, 0, 1) * clamp((cap.until - t) / 0.5, 0, 1);
    drawCaption(c, cap.text, a, bigSize, cx, cy);
  }

  if (t >= 51.6 && !st.finale1) {
    st.finale1 = true;
    ctx.sound.beep(523, 180);
    ctx.sound.beep(659, 180);
    ctx.sound.beep(784, 240);
  }
  if (t >= 56.4 && !st.finale2) {
    st.finale2 = true;
    ctx.sound.noise(260);
  }

  if (t >= 58.6 && !st.done) {
    st.done = true;
    ctx.done();
  }
}

export function dispose(ctx) {
  S = null;
}
