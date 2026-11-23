export const meta = {
  title: 'Six Seven Avalanche',
  author: 'doctordiggitydank',
  prompt: 'for command !67 make the screen fill up from the top with the numbers 6 and 7, all falling in like they\'re being po',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!67"] },
  ],
};

const T_POUR = 5.6;
const T_EXPLODE = 6.2;
const T_END = 11.6;
const MAX_PARTS = 240;

let S = null;

function makeGiant(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  let gy = H * 0.5;
  const s = ctx.streamer;
  if (s) {
    const mid = s.y + s.h / 2;
    gy = mid < 0.45 ? H * 0.76 : H * 0.26;
  }
  return { x: W / 2, y: gy };
}

function reset(ctx) {
  S = {
    parts: [],
    spawned: 0,
    spawnAcc: 0,
    boomed: false,
    boomT: 0,
    ended: false,
    lastBeep: -99,
    s1: false,
    s2: false,
    s3: false,
    s4: false,
    login: ctx.trigger && ctx.trigger.login ? String(ctx.trigger.login) : '',
    giant: makeGiant(ctx),
  };
}

export function init(ctx) {
  reset(ctx);
}

function makePart(ctx, W, H) {
  const size = 44 + ctx.rand() * 86;
  const roll = ctx.rand();
  const ch = roll < 0.47 ? '6' : roll < 0.94 ? '7' : '67';
  const pick = ctx.rand();
  const accent = ctx.accent || '#ff4fa3';
  let color = '#ffffff';
  if (pick > 0.44 && pick <= 0.82) color = accent;
  else if (pick > 0.82) color = '#ffd84d';
  return {
    x: 24 + ctx.rand() * Math.max(1, W - 48),
    y: -size,
    vy: 120 + ctx.rand() * 300,
    vx: (ctx.rand() - 0.5) * 80,
    rot: (ctx.rand() - 0.5) * 0.8,
    vr: (ctx.rand() - 0.5) * 2.4,
    size,
    ch,
    color,
    alpha: 0.82 + ctx.rand() * 0.18,
    settled: false,
  };
}

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = x - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

export function frame(ctx, t, dt) {
  if (!S) reset(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  if (typeof dt !== 'number' || !isFinite(dt) || dt <= 0) dt = 1 / 60;
  dt = Math.min(dt, 0.05);

  const accent = ctx.accent || '#ff4fa3';
  const cx = W / 2;
  const cy = H / 2;

  const pourP = Math.min(1, t / T_POUR);
  const fillLine = H * (1 - Math.pow(pourP, 0.9));

  // pour: constantly add digits falling in from above
  if (!S.boomed && t < T_EXPLODE && S.spawned < MAX_PARTS) {
    S.spawnAcc += dt;
    const interval = Math.max(0.016, 0.05 - 0.032 * pourP);
    let guard = 0;
    while (S.spawnAcc >= interval && S.spawned < MAX_PARTS && guard++ < 40) {
      S.spawnAcc -= interval;
      S.parts.push(makePart(ctx, W, H));
      S.spawned++;
    }
  }

  // explode
  if (!S.boomed && t >= T_EXPLODE) {
    S.boomed = true;
    S.boomT = t;
    for (const p of S.parts) {
      const dx = p.x - cx;
      const dy = p.y - cy;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const sp = 480 + ctx.rand() * 1150;
      p.vx = (dx / len) * sp + (ctx.rand() - 0.5) * 320;
      p.vy = (dy / len) * sp + (ctx.rand() - 0.5) * 320 - 160;
      p.vr = (ctx.rand() - 0.5) * 20;
      p.settled = false;
    }
    ctx.sound.noise(650);
    ctx.sound.beep(80, 520);
    ctx.sound.beep(165, 380);
  }

  // fill line while pouring
  if (!S.boomed && t < T_EXPLODE) {
    c.save();
    c.globalAlpha = 0.22 + 0.12 * Math.sin(t * 5);
    c.strokeStyle = accent;
    c.lineWidth = Math.max(2, H * 0.003);
    c.setLineDash([W * 0.02, W * 0.014]);
    c.beginPath();
    c.moveTo(W * 0.08, fillLine);
    c.lineTo(W * 0.92, fillLine);
    c.stroke();
    c.restore();
    c.setLineDash([]);
    c.globalAlpha = 1;
  }

  // physics
  for (const p of S.parts) {
    if (S.boomed) {
      p.vy += 920 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 1 - 1.4 * dt;
      p.rot += p.vr * dt;
      continue;
    }
    if (p.settled) continue;
    p.vy += 2100 * dt;
    p.y += p.vy * dt;
    p.x += p.vx * dt;
    p.rot += p.vr * dt;
    const restY = Math.max(p.size * 0.55, Math.min(H - p.size * 0.55, fillLine + p.size * 0.35));
    if (p.y >= restY) {
      p.y = restY;
      p.settled = true;
      p.rot = (ctx.rand() - 0.5) * 0.4;
      if (t - S.lastBeep > 0.12) {
        S.lastBeep = t;
        ctx.sound.beep(150 + ctx.rand() * 380, 45);
      }
    }
  }

  // digits
  for (const p of S.parts) {
    let a = 1;
    if (S.boomed) {
      a = Math.max(0, 1 - (t - S.boomT) / 1.35);
      if (a <= 0.02) continue;
    }
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.globalAlpha = a * p.alpha;
    c.font = '900 ' + Math.round(p.size) + 'px "Arial Black", "Trebuchet MS", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = p.color;
    c.shadowColor = p.color;
    c.shadowBlur = p.size * 0.35;
    c.fillText(p.ch, 0, 0);
    c.restore();
  }
  c.globalAlpha = 1;
  c.shadowBlur = 0;

  // giant 6 7 punchline
  if (t >= T_EXPLODE) {
    drawGiant(ctx, t, accent);
  }

  // who called it
  if (!S.boomed && S.login) {
    const a = t < 2.9 ? 1 : Math.max(0, 1 - (t - 2.9) / 0.9);
    if (a > 0) {
      c.save();
      c.globalAlpha = a * 0.92;
      c.font = '700 ' + Math.round(H * 0.027) + 'px "Trebuchet MS", Arial, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'top';
      c.fillStyle = '#ffffff';
      c.shadowColor = 'rgba(0,0,0,0.7)';
      c.shadowBlur = 9;
      c.fillText('6 7 \u00b7 ' + S.login + ' called it', cx, Math.round(H * 0.03));
      c.restore();
      c.globalAlpha = 1;
      c.shadowBlur = 0;
    }
  }

  // final chime sequence
  if (S.boomed) {
    const bt = t - S.boomT;
    if (bt >= 0.18 && !S.s1) { S.s1 = true; ctx.sound.beep(220, 110); }
    if (bt >= 0.48 && !S.s2) { S.s2 = true; ctx.sound.beep(660, 130); }
    if (bt >= 0.78 && !S.s3) { S.s3 = true; ctx.sound.beep(880, 150); }
    if (bt >= 1.06 && !S.s4) { S.s4 = true; ctx.sound.beep(1046, 480); }
  }

  if (t >= T_END && !S.ended) {
    S.ended = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
}

function drawGiant(ctx, t, accent) {
  const W = ctx.width;
  const H = ctx.height;
  const c = ctx.canvas;
  const k = Math.min(1, (t - T_EXPLODE) / 0.55);
  const pop = easeOutBack(k);
  const fadeStart = T_END - 1.1;
  const fade = t < fadeStart ? 1 : Math.max(0, (T_END - t) / 1.1);
  if (fade <= 0) return;

  const g = S.giant;
  const base = Math.min(W * 0.42, H * 0.62);
  const bob = Math.sin(t * 2.2) * base * 0.012;
  const pulse = 1 + 0.018 * Math.sin(t * 6.5);

  c.save();
  c.translate(g.x, g.y + bob);

  // burst rays behind the numbers
  c.globalAlpha = 0.4 * fade * Math.min(1, k * 1.6);
  c.strokeStyle = accent;
  c.lineCap = 'round';
  for (let i = 0; i < 22; i++) {
    const ang = (i / 22) * Math.PI * 2 + t * 0.18;
    const r1 = base * (0.6 + 0.05 * Math.sin(t * 2 + i));
    const r2 = base * (0.95 + 0.12 * Math.sin(t * 3 + i * 1.7));
    c.lineWidth = base * 0.022;
    c.beginPath();
    c.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    c.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
    c.stroke();
  }

  c.globalAlpha = fade;
  const s = pop * pulse;
  c.scale(s, s);

  const fs = base * 0.52;
  c.font = '900 ' + Math.round(fs) + 'px "Arial Black", Impact, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';

  const grad = c.createLinearGradient(0, -fs * 0.55, 0, fs * 0.55);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#ffe9f4');
  grad.addColorStop(1, accent);

  c.shadowColor = accent;
  c.shadowBlur = fs * 0.45;
  c.lineWidth = fs * 0.1;
  c.strokeStyle = '#1a1230';
  c.strokeText('6 7', 0, 0);
  c.shadowBlur = fs * 0.3;
  c.fillStyle = grad;
  c.fillText('6 7', 0, 0);

  c.restore();
  c.globalAlpha = 1;
  c.shadowBlur = 0;
}

export function dispose() {
  S = null;
}
