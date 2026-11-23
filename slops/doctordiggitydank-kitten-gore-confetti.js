export const meta = {
  title: 'Kitten Gore Confetti',
  author: 'doctordiggitydank',
  prompt:
    'A human man stands center screen. Robot arms remove his arms, legs and head, his torso explodes into gore, and the gore turns into glitter kittens that meow and fly away.',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TL = {
  events: [
    { t: 1.15, kind: 'armL', label: 'ARM #1 — REMOVED' },
    { t: 2.25, kind: 'armR', label: 'ARM #2 — REMOVED' },
    { t: 3.35, kind: 'legL', label: 'LEG #1 — REMOVED' },
    { t: 4.45, kind: 'legR', label: 'LEG #2 — REMOVED' },
    { t: 5.55, kind: 'head', label: 'HEAD — NEGOTIABLE' },
    { t: 6.75, kind: 'torso', label: 'TORSO — RESTRUCTURED' },
  ],
  burst: 6.75,
  glitter: 8.5,
  kittens: 10.2,
  end: 18.3,
};

let S = null;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function lerp(a, b, u) {
  return a + (b - a) * u;
}
function easeOut(u) {
  return 1 - Math.pow(1 - u, 3);
}
function easeIn(u) {
  return u * u * u;
}
function easeInOut(u) {
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}
function R(ctx, a, b) {
  return a + (ctx.rand ? ctx.rand() : Math.random()) * (b - a);
}
function pick(ctx, arr) {
  return arr[Math.floor((ctx.rand ? ctx.rand() : Math.random()) * arr.length) % arr.length];
}

function streamRect(ctx) {
  const s = ctx.streamer;
  if (s && s.w > 0 && s.h > 0) {
    return { x: s.x * ctx.width, y: s.y * ctx.height, w: s.w * ctx.width, h: s.h * ctx.height };
  }
  return { x: 0.32 * ctx.width, y: 0.16 * ctx.height, w: 0.36 * ctx.width, h: 0.58 * ctx.height };
}

function rounded(c, x, y, w, h, r) {
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

export function init(ctx) {
  const ev = TL.events.map((e) => ({
    t: e.t,
    kind: e.kind,
    label: e.label,
    snd: false,
    labelDone: true,
  }));

  S = {
    W: ctx.width,
    H: ctx.height,
    ev,
    gore: [],
    glitter: [],
    puffs: [],
    limbs: [],
    kittens: [],
    burst: false,
    burstSound: false,
    glitterSound: false,
    kittensSpawned: false,
    endSound: false,
    ended: false,
  };
}

/* ---------------------------------------------------------------- geometry */

function armGeom(ctx, rect, kind) {
  const W = ctx.width;
  const H = ctx.height;
  const x = rect.x;
  const y = rect.y;
  const w = rect.w;
  const h = rect.h;
  switch (kind) {
    case 'armL':
      return { bx: -0.18 * W, by: y + 0.36 * h, tx: x + 0.06 * w, ty: y + 0.50 * h, tone: 0 };
    case 'armR':
      return { bx: 1.18 * W, by: y + 0.36 * h, tx: x + 0.94 * w, ty: y + 0.50 * h, tone: 1 };
    case 'legL':
      return { bx: x - 0.14 * W, by: 1.24 * H, tx: x + 0.30 * w, ty: y + 0.92 * h, tone: 2 };
    case 'legR':
      return { bx: x + w + 0.14 * W, by: 1.24 * H, tx: x + 0.70 * w, ty: y + 0.92 * h, tone: 3 };
    default:
      return { bx: x + 0.5 * w, by: -0.26 * H, tx: x + 0.5 * w, ty: y + 0.10 * h, tone: 4 };
  }
}

/* ------------------------------------------------------------------ spawns */

function spawnPop(ctx, rect, ev) {
  const g = armGeom(ctx, rect, ev.kind);
  const px = g.tx;
  const py = g.ty;
  const n = 22;
  for (let i = 0; i < n; i++) {
    const a = R(ctx, 0, Math.PI * 2);
    const sp = R(ctx, 40, 230);
    S.gore.push({
      x: px + R(ctx, -8, 8),
      y: py + R(ctx, -8, 8),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 40,
      r: R(ctx, 2.5, 8),
      rot: R(ctx, 0, 6.28),
      vr: R(ctx, -3, 3),
      col: pick(ctx, ['#c1121f', '#9d1119', '#e5383b', '#7a0a12']),
      small: true,
    });
  }
  S.puffs.push({ x: px, y: py, age: 0, life: 0.75, r1: R(ctx, 46, 78) });
  S.puffs.push({ x: px, y: py, age: 0, life: 0.5, r1: R(ctx, 22, 40) });

  if (ev.kind === 'armL' || ev.kind === 'armR' || ev.kind === 'legL' || ev.kind === 'legR') {
    S.limbs.push({
      x: px,
      y: py,
      vx: (ev.kind === 'armL' || ev.kind === 'legL' ? -1 : 1) * R(ctx, 160, 260),
      vy: R(ctx, -330, -190),
      rot: R(ctx, 0, 6.28),
      vr: R(ctx, -5, 5),
      type: ev.kind.startsWith('leg') ? 'leg' : 'arm',
      age: 0,
      life: 1.9,
    });
  }
}

function spawnBurst(ctx, rect) {
  const cx = rect.x + rect.w * 0.5;
  const cy = rect.y + rect.h * 0.56;
  for (let i = 0; i < 118; i++) {
    const a = R(ctx, 0, Math.PI * 2);
    const sp = R(ctx, 40, 520);
    S.gore.push({
      x: cx + R(ctx, -12, 12),
      y: cy + R(ctx, -12, 12),
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 60,
      r: R(ctx, 3, 14),
      rot: R(ctx, 0, 6.28),
      vr: R(ctx, -5, 5),
      col: pick(ctx, ['#c1121f', '#9d1119', '#e5383b', '#7a0a12', '#b3061a']),
      small: false,
    });
  }
  for (let i = 0; i < 6; i++) {
    S.puffs.push({
      x: cx + R(ctx, -30, 30),
      y: cy + R(ctx, -30, 30),
      age: 0,
      life: R(ctx, 0.7, 1.2),
      r1: R(ctx, 90, 190),
    });
  }
}

function spawnGlitter(ctx, rect) {
  const src = S.gore.slice(0, 90);
  src.forEach((g) => {
    S.glitter.push({
      x: g.x,
      y: g.y,
      vx: g.vx * 0.25,
      vy: g.vy * 0.25,
      r: R(ctx, 1.6, 4.2),
      ph: R(ctx, 0, 6.28),
      hue: R(ctx, 34, 56),
    });
  });
  for (let i = 0; i < 70; i++) {
    S.glitter.push({
      x: rect.x + rect.w * 0.5 + R(ctx, -rect.w * 0.5, rect.w * 0.5),
      y: rect.y + rect.h * 0.55 + R(ctx, -rect.h * 0.4, rect.h * 0.4),
      vx: R(ctx, -18, 18),
      vy: R(ctx, -34, -6),
      r: R(ctx, 1.4, 3.6),
      ph: R(ctx, 0, 6.28),
      hue: R(ctx, 32, 58),
    });
  }
}

function spawnKittens(ctx, rect) {
  const cx = rect.x + rect.w * 0.5;
  const cy = rect.y + rect.h * 0.55;
  const n = 8;
  for (let i = 0; i < n; i++) {
    const ang = -Math.PI * 0.5 + (i / (n - 1) - 0.5) * 1.7;
    const dist = R(ctx, 40, 120);
    S.kittens.push({
      x: cx + Math.cos(ang) * dist,
      y: cy + Math.sin(ang) * dist,
      dx: Math.cos(ang) * R(ctx, 30, 90),
      delay: i * 0.14 + R(ctx, 0, 0.16),
      scale: R(ctx, 0.7, 1.15),
      tilt: R(ctx, -0.35, 0.35),
      ph: R(ctx, 0, 6.28),
      hue: pick(ctx, [0, 12, 330, 290, 200, 44]),
      m1: false,
      m2: false,
      meowAt: 0,
    });
  }
  S.kittens.forEach((k, i) => {
    k.meowAt = TL.kittens + 0.35 + i * 0.22;
  });
}

/* ------------------------------------------------------------------ sound */

function tickSounds(ctx, t) {
  S.ev.forEach((ev) => {
    if (!ev.snd && t >= ev.t) {
      ev.snd = true;
      if (ev.kind === 'torso') {
        ctx.sound.noise(330);
        ctx.sound.beep(62, 380);
      } else {
        ctx.sound.noise(95);
        ctx.sound.beep(ev.kind === 'head' ? 180 : 240, 85);
      }
    }
  });
  if (!S.burstSound && t >= TL.burst) {
    S.burstSound = true;
  }
  if (!S.glitterSound && t >= TL.glitter) {
    S.glitterSound = true;
    ctx.sound.beep(1320, 90);
    ctx.sound.beep(1760, 130);
  }
  S.kittens.forEach((k) => {
    if (!k.m1 && t >= k.meowAt) {
      k.m1 = true;
      ctx.sound.beep(560, 105);
    }
    if (k.m1 && !k.m2 && t >= k.meowAt + 0.14) {
      k.m2 = true;
      ctx.sound.beep(880, 145);
    }
  });
  if (!S.endSound && t >= TL.end - 1.5) {
    S.endSound = true;
    ctx.sound.beep(880, 110);
    ctx.sound.beep(1180, 220);
  }
}

/* ------------------------------------------------------------------- draw */

function drawTarget(ctx, rect, t) {
  const c = ctx.canvas;
  const a = clamp((t - 0.15) / 0.6, 0, 1) * (1 - clamp((t - 6.6) / 0.9, 0, 1));
  if (a <= 0.01) return;
  const len = Math.min(rect.w, rect.h) * 0.16;
  const pulse = 0.75 + 0.25 * Math.sin(t * 6);
  c.save();
  c.globalAlpha = a * pulse;
  c.strokeStyle = ctx.accent || '#ff4fa3';
  c.lineWidth = 3;
  c.lineCap = 'round';
  const x = rect.x;
  const y = rect.y;
  const w = rect.w;
  const h = rect.h;
  const corners = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [px, py, sx, sy] of corners) {
    c.beginPath();
    c.moveTo(px + sx * len, py);
    c.lineTo(px, py);
    c.lineTo(px, py + sy * len);
    c.stroke();
  }
  c.globalAlpha = a * 0.7;
  c.setLineDash([6, 8]);
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = 1.5;
  c.strokeRect(x, y, w, h);
  c.setLineDash([]);
  c.restore();
}

function drawArm(ctx, g, frac, grip, t) {
  const c = ctx.canvas;
  const ax = g.bx;
  const ay = g.by;
  const ex = lerp(ax, g.tx, frac);
  const ey = lerp(ay, g.ty, frac);
  const dx = ex - ax;
  const dy = ey - ay;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const bend = 22 + Math.sin(t * 5 + g.tone * 1.7) * 12;
  const mx = ax + ux * len * 0.5 + px * bend;
  const my = ay + uy * len * 0.5 + py * bend;

  c.save();
  c.lineCap = 'round';
  // shadow-ish base pass
  c.strokeStyle = 'rgba(10,14,28,0.55)';
  c.lineWidth = 30;
  c.beginPath();
  c.moveTo(ax, ay);
  c.quadraticCurveTo(mx, my, ex, ey);
  c.stroke();
  // metal
  c.strokeStyle = '#8d99ab';
  c.lineWidth = 22;
  c.beginPath();
  c.moveTo(ax, ay);
  c.quadraticCurveTo(mx, my, ex, ey);
  c.stroke();
  // highlight
  c.strokeStyle = '#dbe6f4';
  c.lineWidth = 7;
  c.beginPath();
  c.moveTo(ax + px * -6, ay + py * -6);
  c.quadraticCurveTo(mx + px * -6, my + py * -6, ex + px * -6, ey + py * -6);
  c.stroke();
  // joints
  c.fillStyle = ctx.accent || '#ff4fa3';
  c.beginPath();
  c.arc(mx, my, 10, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#2a3140';
  c.beginPath();
  c.arc(mx, my, 4, 0, Math.PI * 2);
  c.fill();

  // claw
  const ang = Math.atan2(uy, ux);
  const open = 0.42 + (1 - grip) * 0.55;
  c.translate(ex, ey);
  c.rotate(ang);
  c.lineCap = 'round';
  c.strokeStyle = '#c9d5e6';
  c.lineWidth = 8;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(-4, 0);
    c.quadraticCurveTo(12, s * 8 * open, 20, s * 26 * open);
    c.stroke();
  }
  c.fillStyle = '#ffd166';
  c.beginPath();
  c.arc(0, 0, 7, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawRobotArms(ctx, rect, t) {
  for (const ev of S.ev) {
    if (ev.kind === 'torso') continue;
    const t0 = ev.t - 0.72;
    const t1 = ev.t + 0.62;
    if (t < t0 || t > t1) continue;
    const g = armGeom(ctx, rect, ev.kind);
    let frac = easeOut(clamp((t - t0) / 0.52, 0, 1));
    if (t > ev.t + 0.26) {
      frac *= 1 - easeIn(clamp((t - ev.t - 0.26) / 0.36, 0, 1));
    }
    const grip = clamp((t - (ev.t - 0.34)) / 0.2, 0, 1) * (t > ev.t ? 0.5 : 1);
    drawArm(ctx, g, frac, grip, t);
  }
}

function drawPuffs(ctx, t, dt) {
  const c = ctx.canvas;
  for (let i = S.puffs.length - 1; i >= 0; i--) {
    const p = S.puffs[i];
    p.age += dt;
    const u = p.age / p.life;
    if (u >= 1) {
      S.puffs.splice(i, 1);
      continue;
    }
    c.save();
    c.globalAlpha = (1 - u) * 0.55;
    c.strokeStyle = '#ffd9e8';
    c.lineWidth = 4 * (1 - u) + 1;
    c.beginPath();
    c.arc(p.x, p.y, p.r1 * easeOut(u), 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
}

function drawGore(ctx, t, dt, rect) {
  const c = ctx.canvas;
  const fade = clamp((t - 8.4) / 1.1, 0, 1);
  for (let i = S.gore.length - 1; i >= 0; i--) {
    const g = S.gore[i];
    g.vy += 120 * dt;
    g.vx *= 0.985;
    g.vy *= 0.99;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.rot += g.vr * dt;
    if (g.y > ctx.height + 60) {
      g.y = ctx.height + 60;
      g.vy *= -0.25;
    }
    if (fade >= 1) {
      S.gore.splice(i, 1);
      continue;
    }
    c.save();
    c.globalAlpha = 1 - fade;
    c.translate(g.x, g.y);
    c.rotate(g.rot);
    c.fillStyle = g.col;
    c.beginPath();
    c.ellipse(0, 0, g.r * 1.25, g.r, 0, 0, Math.PI * 2);
    c.fill();
    if (!g.small && g.r > 8) {
      c.fillStyle = 'rgba(255,255,255,0.16)';
      c.beginPath();
      c.arc(-g.r * 0.3, -g.r * 0.3, g.r * 0.32, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }
}

function drawLimb(ctx, l, c) {
  c.save();
  c.translate(l.x, l.y);
  c.rotate(l.rot);
  const L = l.type === 'leg' ? 44 : 40;
  const w = l.type === 'leg' ? 15 : 12;
  c.strokeStyle = '#2b2330';
  c.lineWidth = w + 6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-L * 0.5, 0);
  c.lineTo(L * 0.5, 0);
  c.stroke();
  c.strokeStyle = '#f2cdb4';
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(-L * 0.5, 0);
  c.lineTo(L * 0.5, 0);
  c.stroke();
  c.fillStyle = '#f2cdb4';
  c.strokeStyle = '#2b2330';
  c.lineWidth = 3;
  c.beginPath();
  c.ellipse(L * 0.58, 0, l.type === 'leg' ? 10 : 8, l.type === 'leg' ? 7 : 8, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();
}

function drawLimbs(ctx, t, dt) {
  const c = ctx.canvas;
  for (let i = S.limbs.length - 1; i >= 0; i--) {
    const l = S.limbs[i];
    l.age += dt;
    if (l.age > l.life) {
      S.limbs.splice(i, 1);
      continue;
    }
    l.vy += 420 * dt;
    l.x += l.vx * dt;
    l.y += l.vy * dt;
    l.rot += l.vr * dt;
    const u = l.age / l.life;
    c.save();
    c.globalAlpha = 1 - clamp((u - 0.65) / 0.35, 0, 1);
    drawLimb(ctx, l, c);
    c.restore();
  }
}

function drawGlitter(ctx, t, dt) {
  const c = ctx.canvas;
  for (const g of S.glitter) {
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vy += 14 * dt;
    g.vx *= 0.995;
    const tw = 0.55 + 0.45 * Math.sin(t * 9 + g.ph);
    c.save();
    c.globalAlpha = 0.35 + tw * 0.65;
    c.translate(g.x, g.y);
    c.fillStyle = `hsl(${g.hue}, 100%, 72%)`;
    c.shadowColor = '#ffe9a8';
    c.shadowBlur = 10 * tw;
    const r = g.r * (0.7 + tw * 0.6);
    c.beginPath();
    c.moveTo(0, -r * 2.1);
    c.quadraticCurveTo(r * 0.25, -r * 0.25, r * 1.7, 0);
    c.quadraticCurveTo(r * 0.25, r * 0.25, 0, r * 2.1);
    c.quadraticCurveTo(-r * 0.25, r * 0.25, -r * 1.7, 0);
    c.quadraticCurveTo(-r * 0.25, -r * 0.25, 0, -r * 2.1);
    c.fill();
    c.restore();
  }
}

function drawKitten(c, k, x, y, s, tilt, flap) {
  c.save();
  c.translate(x, y);
  c.rotate(tilt);
  c.scale(s, s);

  // cape
  c.fillStyle = `hsl(${k.hue}, 82%, 54%)`;
  c.beginPath();
  c.moveTo(-3, -3);
  c.quadraticCurveTo(-30 - flap * 5, 4, -26 - flap * 6, 26);
  c.quadraticCurveTo(-8, 18, 1, 11);
  c.closePath();
  c.fill();

  // tail
  c.strokeStyle = '#d9a06b';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-14, 6);
  c.quadraticCurveTo(-28, 2 + flap * 4, -23, -8);
  c.stroke();

  // body
  c.fillStyle = '#f7e6cd';
  c.beginPath();
  c.ellipse(0, 0, 16, 11, 0, 0, Math.PI * 2);
  c.fill();

  // legs
  c.strokeStyle = '#ebd0ad';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(2, 8);
  c.lineTo(0, 17);
  c.stroke();
  c.beginPath();
  c.moveTo(11, 7);
  c.lineTo(13, 16);
  c.stroke();

  // head
  c.fillStyle = '#f9ecd8';
  c.beginPath();
  c.arc(13, -6, 10, 0, Math.PI * 2);
  c.fill();

  // ears
  c.beginPath();
  c.moveTo(6, -13);
  c.lineTo(9, -23);
  c.lineTo(15, -12);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(17, -12);
  c.lineTo(23, -20);
  c.lineTo(23, -9);
  c.closePath();
  c.fill();

  // eyes
  c.fillStyle = '#26303f';
  c.beginPath();
  c.arc(9.5, -8, 1.9, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(17, -7, 1.9, 0, Math.PI * 2);
  c.fill();

  // nose
  c.fillStyle = '#ff8fb0';
  c.beginPath();
  c.moveTo(19.5, -2);
  c.lineTo(22.5, -2);
  c.lineTo(21, 0);
  c.closePath();
  c.fill();

  // whiskers
  c.strokeStyle = 'rgba(60,50,55,0.6)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(20, -3);
  c.lineTo(28, -6);
  c.moveTo(20, -1);
  c.lineTo(28, 0);
  c.stroke();

  c.restore();
}

function drawKittens(ctx, t) {
  const dur = 5.4;
  const H = ctx.height;
  for (const k of S.kittens) {
    const u0 = (t - TL.kittens - k.delay) / dur;
    if (u0 < 0 || u0 > 1.05) continue;
    const u = clamp(u0, 0, 1);
    const rise = easeInOut(u) * (H * 0.55 + 340);
    const x = k.x + k.dx * easeOut(u) + Math.sin(u * 7 + k.ph) * 16;
    const y = k.y - rise;
    const s = k.scale * (1 - 0.25 * u);
    const tilt = k.tilt + Math.sin(u * 6 + k.ph) * 0.12;
    const flap = Math.sin(t * 12 + k.ph);
    // speed trail
    ctx.canvas.save();
    ctx.canvas.globalAlpha = 0.25 * (1 - u);
    ctx.canvas.strokeStyle = '#ffe9a8';
    ctx.canvas.lineWidth = 3;
    ctx.canvas.beginPath();
    ctx.canvas.moveTo(x - 6, y + 20 * s);
    ctx.canvas.lineTo(x - 6, y + 46 * s);
    ctx.canvas.stroke();
    ctx.canvas.restore();
    drawKitten(ctx.canvas, k, x, y, s, tilt, flap);
  }
}

function drawEventLabel(ctx, rect, t) {
  const c = ctx.canvas;
  for (const ev of S.ev) {
    const age = t - ev.t;
    if (age < 0 || age > 1.25) continue;
    const g = ev.kind === 'torso'
      ? { tx: rect.x + rect.w * 0.5, ty: rect.y + rect.h * 0.5 }
      : armGeom(ctx, rect, ev.kind);
    const a = clamp(age / 0.12, 0, 1) * (1 - clamp((age - 0.95) / 0.3, 0, 1));
    const y = g.ty - 30 - age * 26;
    c.save();
    c.globalAlpha = a;
    c.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
    const tw = c.measureText(ev.label).width;
    rounded(c, g.tx - tw / 2 - 10, y - 15, tw + 20, 24, 12);
    c.fillStyle = 'rgba(12,16,32,0.68)';
    c.fill();
    c.strokeStyle = 'rgba(255,79,163,0.7)';
    c.lineWidth = 1.5;
    c.stroke();
    c.fillStyle = '#ffffff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(ev.label, g.tx, y - 2);
    c.restore();
  }
}

function captionFor(t) {
  if (t < 2.4) return 'LIVE MAINTENANCE FOR SAVORYSAILOR — HOLD STILL';
  if (t < 5.2) return 'LIMB REMOVAL IS COMPLIMENTARY';
  if (t < 7.2) return 'HEAD: OPTIONAL ACCESSORY';
  if (t < 10.0) return 'TOTAL LOSS. TOTALLY FINE.';
  if (t < 12.6) return 'REFORMATTING INTO GLITTER…';
  if (t < 16.1) return 'NOW SHIPPING: ONE (1) KITTEN SWARM';
  return 'SAVORYSAILOR: GLITTERED, CAT-ADJACENT, STILL LIVE';
}

function drawCaptions(ctx, t) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const text = captionFor(t);
  c.save();
  c.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(text).width;
  const w = Math.min(tw + 46, W - 40);
  const h = 48;
  const x = W / 2 - w / 2;
  const y = H * 0.885 - h / 2;
  const alpha = clamp(t / 0.4, 0, 1) * (t > TL.end - 0.6 ? clamp((TL.end - t) / 0.6, 0, 1) : 1);
  c.globalAlpha = alpha;
  rounded(c, x, y, w, h, 24);
  c.fillStyle = 'rgba(10,14,30,0.66)';
  c.fill();
  c.strokeStyle = 'rgba(255,79,163,0.55)';
  c.lineWidth = 2;
  c.stroke();
  c.fillStyle = '#ffffff';
  if (tw + 46 > W - 40) {
    c.font = 'bold 17px "Segoe UI", system-ui, sans-serif';
  }
  c.fillText(text, W / 2, H * 0.885, w - 24);
  c.restore();
}

function shakeAt(t) {
  let ax = 0;
  let ay = 0;
  for (const ev of S.ev) {
    if (ev.kind === 'torso') continue;
    const d = t - ev.t;
    if (d >= 0 && d < 0.42) {
      const k = 1 - d / 0.42;
      ax += Math.sin(t * 88) * 5 * k;
      ay += Math.cos(t * 74) * 5 * k;
    }
  }
  const d = t - TL.burst;
  if (d >= 0 && d < 1.7) {
    const k = Math.max(0, 1 - d / 1.7);
    ax += Math.sin(t * 63) * 17 * k * k;
    ay += Math.cos(t * 57) * 17 * k * k;
  }
  return { x: ax, y: ay };
}

/* ------------------------------------------------------------------ frame */

export function frame(ctx, t, dt) {
  if (!S) return;
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);
  const rect = streamRect(ctx);

  // spawns
  for (const ev of S.ev) {
    if (t >= ev.t && ev.labelDone) {
      ev.labelDone = false;
      if (ev.kind === 'torso') spawnBurst(ctx, rect);
      else spawnPop(ctx, rect, ev);
    }
  }
  if (!S.kittensSpawned && t >= TL.kittens) {
    S.kittensSpawned = true;
    spawnKittens(ctx, rect);
  }
  if (!S.glitterSpawned && t >= TL.glitter) {
    S.glitterSpawned = true;
    spawnGlitter(ctx, rect);
  }

  const sh = shakeAt(t);
  c.save();
  c.translate(sh.x, sh.y);

  drawTarget(ctx, rect, t);
  drawRobotArms(ctx, rect, t);
  drawEventLabel(ctx, rect, t);
  drawPuffs(ctx, t, clamp(dt, 0, 0.1));
  drawLimbs(ctx, t, clamp(dt, 0, 0.1));
  drawGore(ctx, t, clamp(dt, 0, 0.1), rect);
  drawGlitter(ctx, t, clamp(dt, 0, 0.1));
  drawKittens(ctx, t);

  c.restore();

  drawCaptions(ctx, t);
  tickSounds(ctx, t);

  if (!S.ended && t >= TL.end) {
    S.ended = true;
    ctx.done();
  }
}

export function dispose(ctx) {
  S = null;
}
