export const meta = {
  title: 'Trouser Intervention',
  author: 'morbeir',
  prompt: 'Throw 52 various pants and undergarments at the streamer with a big sign saying "PUT ON SOME PANTS"',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const TOTAL = 52;
const T_SIGN = 0.2;
const T_THROW = 1.25;
const INTERVAL = 0.185;
const T_STAMP = 11.9;
const T_FADE = 14.6;
const T_END = 16.2;

const KINDS = [
  { name: 'jeans', body: '#3f6fb5', band: '#2b4d80', detail: 'stitch' },
  { name: 'boxers', body: '#e0497a', band: '#a82f57', detail: 'dots' },
  { name: 'briefs', body: '#f4f1ea', band: '#cdd6e8', detail: 'stripe' },
  { name: 'longjohns', body: '#c9b48a', band: '#a08a5f', detail: 'stripes' },
  { name: 'cargo', body: '#8d9b6a', band: '#6c7750', detail: 'pocket' },
  { name: 'bloomers', body: '#f0a7c2', band: '#cf7d9c', detail: 'dots' },
  { name: 'leggings', body: '#2f2b3a', band: '#171522', detail: 'stripe' },
  { name: 'boxerbriefs', body: '#5a4fb0', band: '#3d3582', detail: 'stripes' },
  { name: 'tightywhities', body: '#ffffff', band: '#e0e6f2', detail: 'stitch' },
  { name: 'camo', body: '#6f7a4e', band: '#525c39', detail: 'dots' },
  { name: 'hawaiian', body: '#f2c14e', band: '#c99a2e', detail: 'dots' },
  { name: 'velour', body: '#b0447c', band: '#8a2c5d', detail: 'stripes' },
];

let S = null;

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = x - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

function easeOutCubic(x) {
  return 1 - Math.pow(1 - x, 3);
}

function buildGarments(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const s = ctx.streamer;
  let tx, ty, spreadX, spreadY;
  if (s) {
    tx = (s.x + s.w * 0.5) * W;
    ty = (s.y + s.h * 0.66) * H;
    spreadX = s.w * W * 0.44;
    spreadY = s.h * H * 0.26;
  } else {
    tx = W * 0.5;
    ty = H * 0.62;
    spreadX = W * 0.22;
    spreadY = H * 0.12;
  }

  const list = [];
  for (let i = 0; i < TOTAL; i++) {
    const kind = KINDS[Math.floor(ctx.rand() * KINDS.length)];
    const side = ctx.rand();
    let sx, sy, cx, cy;
    if (side < 0.42) {
      sx = -W * 0.12;
      sy = H * (0.55 + ctx.rand() * 0.4);
      cx = W * (0.15 + ctx.rand() * 0.2);
      cy = H * (0.05 + ctx.rand() * 0.25);
    } else if (side < 0.84) {
      sx = W * 1.12;
      sy = H * (0.55 + ctx.rand() * 0.4);
      cx = W * (0.65 + ctx.rand() * 0.2);
      cy = H * (0.05 + ctx.rand() * 0.25);
    } else {
      sx = W * (0.35 + ctx.rand() * 0.3);
      sy = -H * 0.14;
      cx = W * (0.45 + ctx.rand() * 0.1);
      cy = H * 0.02;
    }
    const ex = tx + (ctx.rand() - 0.5) * 2 * spreadX;
    const ey = ty + (ctx.rand() - 0.5) * 2 * spreadY;
    list.push({
      kind,
      sx,
      sy,
      cx,
      cy,
      ex,
      ey,
      delay: T_THROW + i * INTERVAL + (ctx.rand() - 0.5) * 0.05,
      dur: 0.62 + ctx.rand() * 0.26,
      spin0: (ctx.rand() - 0.5) * 0.6,
      spin: (ctx.rand() - 0.5) * 3.2,
      size: Math.min(W, H) * (0.09 + ctx.rand() * 0.055),
      tilt: (ctx.rand() - 0.5) * 0.7,
      seed: Math.floor(ctx.rand() * 997),
      landed: false,
      landT: 0,
    });
  }
  return list;
}

function reset(ctx) {
  S = {
    garments: buildGarments(ctx),
    spawned: 0,
    landedCount: 0,
    lastThud: -99,
    ended: false,
    signHit: false,
    stampHit: false,
    chords: 0,
    login: ctx.trigger && ctx.trigger.login ? String(ctx.trigger.login) : '',
  };
}

export function init(ctx) {
  reset(ctx);
}

function pathPants(c, size) {
  const h = size * 1.15;
  c.beginPath();
  c.moveTo(-size * 0.42, -h * 0.5);
  c.lineTo(size * 0.42, -h * 0.5);
  c.lineTo(size * 0.46, h * 0.5);
  c.lineTo(size * 0.13, h * 0.5);
  c.lineTo(size * 0.03, -h * 0.06);
  c.lineTo(-size * 0.07, h * 0.5);
  c.lineTo(-size * 0.46, h * 0.5);
  c.closePath();
}

function drawGarment(c, g, px, py, rot, scale, alpha) {
  const size = g.size * scale;
  const h = size * 1.15;
  const k = g.kind;

  c.save();
  c.translate(px, py);
  c.rotate(rot);
  c.globalAlpha = alpha;
  c.shadowColor = 'rgba(0,0,0,0.45)';
  c.shadowBlur = size * 0.22;
  c.shadowOffsetY = size * 0.06;

  pathPants(c, size);
  c.fillStyle = k.body;
  c.fill();

  c.shadowBlur = 0;
  c.shadowOffsetY = 0;
  c.lineWidth = Math.max(1.5, size * 0.055);
  c.strokeStyle = 'rgba(20,14,32,0.85)';
  c.stroke();

  // waistband
  c.beginPath();
  c.rect(-size * 0.42, -h * 0.5, size * 0.84, h * 0.15);
  c.fillStyle = k.band;
  c.fill();
  c.lineWidth = Math.max(1, size * 0.035);
  c.stroke();

  c.save();
  pathPants(c, size);
  c.clip();

  if (k.detail === 'dots') {
    c.fillStyle = 'rgba(255,255,255,0.78)';
    for (let i = 0; i < 9; i++) {
      const dx = ((g.seed * (i + 3) * 37) % 100) / 100 - 0.5;
      const dy = ((g.seed * (i + 7) * 53) % 100) / 100 - 0.5;
      c.beginPath();
      c.arc(dx * size * 0.7, dy * h * 0.8, size * 0.045, 0, Math.PI * 2);
      c.fill();
    }
  } else if (k.detail === 'stripes') {
    c.fillStyle = 'rgba(255,255,255,0.42)';
    for (let x = -size * 0.45; x < size * 0.45; x += size * 0.16) {
      c.fillRect(x, -h * 0.5, size * 0.06, h);
    }
  } else if (k.detail === 'stripe') {
    c.fillStyle = 'rgba(255,255,255,0.6)';
    c.fillRect(-size * 0.45, -h * 0.02, size * 0.9, size * 0.055);
  } else if (k.detail === 'pocket') {
    c.fillStyle = 'rgba(0,0,0,0.2)';
    c.fillRect(size * 0.12, -h * 0.24, size * 0.22, h * 0.2);
    c.strokeStyle = 'rgba(0,0,0,0.35)';
    c.lineWidth = Math.max(1, size * 0.03);
    c.strokeRect(size * 0.12, -h * 0.24, size * 0.22, h * 0.2);
  } else if (k.detail === 'stitch') {
    c.strokeStyle = 'rgba(255,220,120,0.75)';
    c.lineWidth = Math.max(1, size * 0.025);
    c.setLineDash([size * 0.07, size * 0.05]);
    c.beginPath();
    c.moveTo(-size * 0.38, h * 0.34);
    c.lineTo(-size * 0.14, h * 0.34);
    c.moveTo(size * 0.1, h * 0.34);
    c.lineTo(size * 0.36, h * 0.34);
    c.stroke();
    c.setLineDash([]);
  }
  c.restore();
  c.restore();
}

function drawSign(ctx, t, fade) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const accent = ctx.accent || '#ff4fa3';
  const k = Math.min(1, Math.max(0, (t - T_SIGN) / 0.4));
  if (k <= 0) return;

  const pop = easeOutBack(k);
  const signW = Math.min(W * 0.6, H * 1.05);
  const signH = signW * 0.29;
  const cx = W * 0.5;
  const cy = H * 0.155;
  const wob = Math.sin(t * 2.1) * 0.012 + Math.sin(t * 0.7) * 0.01;

  c.save();
  c.globalAlpha = fade;
  c.translate(cx, cy);
  c.scale(pop, pop);
  c.rotate(-0.045 + wob);

  // support stick
  c.fillStyle = '#8a6b45';
  c.fillRect(-signW * 0.065, -signH * 0.4, signW * 0.13, signH * 2.6);

  // board
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = signH * 0.35;
  c.shadowOffsetY = signH * 0.09;
  c.fillStyle = '#f6e6c8';
  c.fillRect(-signW / 2, -signH / 2, signW, signH);
  c.shadowBlur = 0;
  c.shadowOffsetY = 0;

  c.lineWidth = Math.max(3, signH * 0.075);
  c.strokeStyle = '#241a33';
  c.strokeRect(-signW / 2, -signH / 2, signW, signH);
  c.lineWidth = Math.max(2, signH * 0.03);
  c.strokeStyle = accent;
  c.strokeRect(-signW / 2 + signH * 0.09, -signH / 2 + signH * 0.09, signW - signH * 0.18, signH - signH * 0.18);

  // tape corners
  c.fillStyle = 'rgba(255,255,255,0.42)';
  c.fillRect(-signW * 0.5 - signH * 0.05, -signH * 0.46, signH * 0.3, signH * 0.18);
  c.fillRect(signW * 0.5 - signH * 0.25, signH * 0.28, signH * 0.3, signH * 0.18);

  // text
  let fs = signH * 0.4;
  c.font = '900 ' + Math.round(fs) + 'px "Arial Black", Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const msg = 'PUT ON SOME PANTS';
  const maxW = signW * 0.82;
  const mw = c.measureText(msg).width;
  if (mw > maxW) {
    fs *= maxW / mw;
    c.font = '900 ' + Math.round(fs) + 'px "Arial Black", Impact, sans-serif';
  }
  c.lineWidth = Math.max(2, fs * 0.1);
  c.strokeStyle = '#241a33';
  c.lineJoin = 'round';
  c.strokeText(msg, 0, signH * 0.02);
  c.fillStyle = '#e83f6f';
  c.fillText(msg, 0, signH * 0.02);

  c.restore();
  c.globalAlpha = 1;
}

function drawCounter(ctx, t, fade) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const accent = ctx.accent || '#ff4fa3';
  const n = Math.min(TOTAL, S.landedCount);
  const s = ctx.streamer;
  const px = W * 0.5;
  const py = s && s.y + s.h > 0.82 ? H * 0.94 : H * 0.915;

  c.save();
  c.globalAlpha = fade * 0.95;
  c.font = '900 ' + Math.round(H * 0.032) + 'px "Arial Black", Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const label = 'PANTS DELIVERED  ' + n + ' / ' + TOTAL;
  c.lineWidth = Math.max(3, H * 0.007);
  c.strokeStyle = 'rgba(15,10,26,0.85)';
  c.strokeText(label, px, py);
  c.fillStyle = n >= TOTAL ? '#ffe45c' : '#ffffff';
  c.fillText(label, px, py);
  c.restore();
  c.globalAlpha = 1;
}

function drawStamp(ctx, t, fade) {
  if (t < T_STAMP) return;
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const k = Math.min(1, (t - T_STAMP) / 0.32);
  const pop = easeOutBack(k);
  const cx = W * 0.5;
  const cy = H * 0.845;
  const boxW = Math.min(W * 0.58, H * 1.0);
  const boxH = boxW * 0.19;
  const red = '#ff3b5c';

  c.save();
  c.globalAlpha = fade * Math.min(1, k * 2);
  c.translate(cx, cy);
  c.rotate(-0.075);
  c.scale(pop, pop);

  c.lineWidth = Math.max(3, boxH * 0.08);
  c.strokeStyle = red;
  c.strokeRect(-boxW / 2, -boxH / 2, boxW, boxH);
  c.lineWidth = Math.max(1.5, boxH * 0.025);
  c.strokeRect(-boxW / 2 + boxH * 0.1, -boxH / 2 + boxH * 0.1, boxW - boxH * 0.2, boxH - boxH * 0.2);

  let fs = boxH * 0.5;
  const msg = 'STILL NO PANTS DETECTED';
  c.font = '900 ' + Math.round(fs) + 'px "Arial Black", Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const mw = c.measureText(msg).width;
  if (mw > boxW * 0.86) {
    fs *= (boxW * 0.86) / mw;
    c.font = '900 ' + Math.round(fs) + 'px "Arial Black", Impact, sans-serif';
  }
  c.fillStyle = red;
  c.fillText(msg, 0, boxH * 0.03);

  c.restore();
  c.globalAlpha = 1;
}

function drawTag(ctx, fade) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.save();
  c.globalAlpha = fade * 0.8;
  c.font = '700 ' + Math.round(H * 0.022) + 'px "Trebuchet MS", Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffffff';
  c.shadowColor = 'rgba(0,0,0,0.8)';
  c.shadowBlur = 8;
  c.fillText('SAVORYSAILOR \u00b7 PANTS COMPLIANCE DIVISION', W * 0.5, H * 0.955);
  c.restore();
  c.globalAlpha = 1;
  c.shadowBlur = 0;
}

export function frame(ctx, t, dt) {
  if (!S) reset(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  if (typeof dt !== 'number' || !isFinite(dt) || dt <= 0) dt = 1 / 60;

  const fade = t < T_FADE ? 1 : Math.max(0, 1 - (t - T_FADE) / (T_END - T_FADE));

  // sign slam sound
  if (!S.signHit && t >= T_SIGN) {
    S.signHit = true;
    ctx.sound.noise(220);
    ctx.sound.beep(70, 380);
    ctx.sound.beep(104, 200);
  }

  // spawn in order
  while (S.spawned < TOTAL && t >= S.garments[S.spawned].delay) {
    const g = S.garments[S.spawned];
    S.spawned++;
    if (S.spawned % 4 === 0) ctx.sound.noise(110);
  }

  // draw + land
  const active = [];
  for (let i = 0; i < S.spawned; i++) {
    const g = S.garments[i];
    const p = (t - g.delay) / g.dur;
    if (p < 1) { active.push({ g, p }); continue; }
    if (!g.landed) {
      g.landed = true;
      g.landT = t;
      S.landedCount++;
      if (t - S.lastThud > 0.075) {
        S.lastThud = t;
        ctx.sound.beep(95 + ctx.rand() * 70, 55);
      }
    }
    const settle = Math.min(1, (t - g.landT) / 0.34);
    const drop = (1 - easeOutCubic(settle)) * g.size * 0.5;
    const rot = g.spin0 + g.spin * 0.35 + g.tilt * easeOutCubic(settle);
    const scale = 1 + (1 - easeOutCubic(settle)) * 0.35;
    drawGarment(c, g, g.ex, g.ey + drop, rot, scale, 0.95 * fade);
  }

  for (const a of active) {
    const g = a.g;
    const p = a.p;
    const u = 1 - p;
    const px = u * u * g.sx + 2 * u * p * g.cx + p * p * g.ex;
    const py = u * u * g.sy + 2 * u * p * g.cy + p * p * g.ey;
    const rot = g.spin0 + g.spin * p;
    const sc = 1 + Math.sin(p * Math.PI) * 0.15;
    drawGarment(c, g, px, py, rot, sc, fade);
  }

  drawSign(ctx, t, fade);
  drawCounter(ctx, t, fade);
  drawStamp(ctx, t, fade);
  drawTag(ctx, fade);

  // stamp slam sound + closing chord
  if (!S.stampHit && t >= T_STAMP) {
    S.stampHit = true;
    ctx.sound.noise(280);
    ctx.sound.beep(58, 520);
    ctx.sound.beep(87, 300);
  }
  if (S.stampHit) {
    const bt = t - T_STAMP;
    if (S.chords === 0 && bt >= 0.35) { S.chords = 1; ctx.sound.beep(392, 130); }
    if (S.chords === 1 && bt >= 0.6) { S.chords = 2; ctx.sound.beep(523, 130); }
    if (S.chords === 2 && bt >= 0.85) { S.chords = 3; ctx.sound.beep(659, 420); }
  }

  if (t >= T_END && !S.ended) {
    S.ended = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
}

export function dispose() {
  S = null;
}
