// Combusting Tin Can — a legally distinct robot has a very bad day on the live feed.

export const meta = {
  title: 'Combusting Tin Can',
  author: 'cooooter',
  prompt: 'MAKE A ROBOT WHO LOOKS LIKE THE STREAMER DOCTORDIGGITDANK WHO COMBUSTS WHEN THEY SEE BOOBS',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const T_BOOT = 0.35;
const T_SCAN = 3.3;
const T_LOCK = 6.6;
const T_HEART = 9.3;
const T_BOOM = 11.6;
const T_AFTER = 17.2;
const T_END = 21.6;

let S = null;

export function init(ctx) {
  S = {
    u: Math.min(ctx.width, ctx.height) * 0.055,
    parts: [],
    bolts: [],
    flags: {},
    scan: 0,
    beat: -1,
    shake: 0,
    flash: 0,
    seedSpin: 0,
  };
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);

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

function heartPath(g, cx, cy, s) {
  g.beginPath();
  g.moveTo(cx, cy + s * 0.55);
  g.bezierCurveTo(cx - s * 1.35, cy - s * 0.25, cx - s * 0.55, cy - s * 1.05, cx, cy - s * 0.35);
  g.bezierCurveTo(cx + s * 0.55, cy - s * 1.05, cx + s * 1.35, cy - s * 0.25, cx, cy + s * 0.55);
  g.closePath();
}

function caption(g, text, cx, cy, size, alpha, color) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = alpha;
  g.font = '700 ' + size + 'px "Trebuchet MS", system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const wid = g.measureText(text).width + size * 1.5;
  const hh = size * 1.85;
  g.fillStyle = 'rgba(10,14,26,0.62)';
  roundRect(g, cx - wid / 2, cy - hh / 2, wid, hh, size * 0.4);
  g.fill();
  g.strokeStyle = 'rgba(255,110,180,0.8)';
  g.lineWidth = Math.max(1.5, size * 0.055);
  g.stroke();
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = size * 0.32;
  g.fillStyle = color || '#ffe9f3';
  g.fillText(text, cx, cy + size * 0.05);
  g.restore();
}

function capAlpha(t, a, b) {
  const inn = clamp((t - a) / 0.28, 0, 1);
  const out = clamp((b - t) / 0.3, 0, 1);
  return Math.min(inn, out);
}

function spawnFire(ctx, x, y, spread, power) {
  const n = 2 + Math.floor(ctx.rand() * 3);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (ctx.rand() - 0.5) * spread;
    const sp = (60 + ctx.rand() * 180) * power;
    S.parts.push({
      kind: 'fire',
      x: x + (ctx.rand() - 0.5) * 40,
      y: y + (ctx.rand() - 0.5) * 24,
      vx: Math.cos(a) * sp * 0.55,
      vy: Math.sin(a) * sp,
      life: 0.5 + ctx.rand() * 0.7,
      max: 1,
      r: 6 + ctx.rand() * 16,
    });
    S.parts[S.parts.length - 1].max = S.parts[S.parts.length - 1].life;
  }
}

function spawnSmoke(ctx, x, y) {
  S.parts.push({
    kind: 'smoke',
    x: x + (ctx.rand() - 0.5) * 20,
    y: y,
    vx: (ctx.rand() - 0.5) * 20,
    vy: -30 - ctx.rand() * 40,
    life: 1.6 + ctx.rand() * 1.2,
    max: 2.8,
    r: 8 + ctx.rand() * 12,
  });
}

function burstBolts(ctx, x, y) {
  for (let i = 0; i < 14; i++) {
    const a = ctx.rand() * Math.PI * 2;
    const sp = 160 + ctx.rand() * 320;
    S.bolts.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 120,
      rot: ctx.rand() * 6.28,
      vr: (ctx.rand() - 0.5) * 18,
      life: 1.4 + ctx.rand() * 0.8,
      max: 2.2,
      s: 5 + ctx.rand() * 5,
    });
  }
}

function drawRobot(g, x, y, u, o) {
  const t = o.t;
  const charred = o.charred;
  const metal = charred ? '#3b3f48' : '#c8d3e1';
  const dark = charred ? '#171a21' : '#57657c';
  const hi = charred ? '#585e6a' : '#eef4fc';
  const wob = Math.sin(t * (7 + o.heat * 22)) * o.heat * u * 0.05;

  g.save();
  g.translate(x + wob, y);

  // legs
  g.fillStyle = dark;
  roundRect(g, -0.95 * u, 0.15 * u, 0.55 * u, 1.0 * u, 0.2 * u);
  g.fill();
  roundRect(g, 0.4 * u, 0.15 * u, 0.55 * u, 1.0 * u, 0.2 * u);
  g.fill();
  // feet
  g.fillStyle = metal;
  roundRect(g, -1.05 * u, 1.05 * u, 0.8 * u, 0.28 * u, 0.12 * u);
  g.fill();
  roundRect(g, 0.25 * u, 1.05 * u, 0.8 * u, 0.28 * u, 0.12 * u);
  g.fill();

  // body
  g.beginPath();
  g.moveTo(-1.28 * u, -1.7 * u);
  g.lineTo(1.28 * u, -1.7 * u);
  g.lineTo(1.08 * u, 0.2 * u);
  g.lineTo(-1.08 * u, 0.2 * u);
  g.closePath();
  const bg = g.createLinearGradient(-u, -1.7 * u, u, 0.2 * u);
  bg.addColorStop(0, hi);
  bg.addColorStop(0.55, metal);
  bg.addColorStop(1, dark);
  g.fillStyle = bg;
  g.fill();
  g.strokeStyle = charred ? '#0c0e12' : '#42506a';
  g.lineWidth = Math.max(1.5, u * 0.06);
  g.stroke();

  // chest plate + bolts
  g.fillStyle = charred ? '#20242c' : '#8fa0ba';
  roundRect(g, -0.75 * u, -1.42 * u, 1.5 * u, 1.0 * u, 0.16 * u);
  g.fill();
  g.fillStyle = charred ? '#4b3826' : '#ff6eb4';
  g.globalAlpha = charred ? 0.5 : 0.6 + o.heat * 0.4;
  roundRect(g, -0.45 * u, -1.2 * u, 0.9 * u, 0.2 * u, 0.1 * u);
  g.fill();
  roundRect(g, -0.45 * u, -0.85 * u, 0.9 * u, 0.2 * u, 0.1 * u);
  g.fill();
  g.globalAlpha = 1;

  // arms
  g.fillStyle = metal;
  g.save();
  g.translate(-1.25 * u, -1.45 * u);
  g.rotate(-0.35 - Math.sin(t * 9) * o.heat * 0.35);
  roundRect(g, -0.32 * u, 0, 0.5 * u, 1.15 * u, 0.2 * u);
  g.fill();
  g.restore();

  if (o.thumbs) {
    g.save();
    g.translate(1.25 * u, -1.45 * u);
    g.rotate(-2.0);
    roundRect(g, -0.3 * u, 0, 0.52 * u, 1.15 * u, 0.2 * u);
    g.fill();
    g.beginPath();
    g.arc(0, -0.18 * u, 0.3 * u, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = charred ? '#4c4f57' : '#dfe8f4';
    roundRect(g, -0.12 * u, -0.55 * u, 0.2 * u, 0.32 * u, 0.1 * u);
    g.fill();
    g.restore();
  } else {
    g.save();
    g.translate(1.25 * u, -1.45 * u);
    g.rotate(0.35 + Math.sin(t * 9 + 1) * o.heat * 0.35);
    roundRect(g, -0.18 * u, 0, 0.5 * u, 1.15 * u, 0.2 * u);
    g.fill();
    g.restore();
  }

  // neck
  g.fillStyle = dark;
  roundRect(g, -0.3 * u, -1.95 * u, 0.6 * u, 0.3 * u, 0.1 * u);
  g.fill();

  // head
  const hg = g.createLinearGradient(-u, -3.4 * u, u, -1.9 * u);
  hg.addColorStop(0, hi);
  hg.addColorStop(0.6, metal);
  hg.addColorStop(1, dark);
  g.fillStyle = hg;
  roundRect(g, -1.12 * u, -3.42 * u, 2.24 * u, 1.55 * u, 0.3 * u);
  g.fill();
  g.strokeStyle = charred ? '#0b0d11' : '#42506a';
  g.lineWidth = Math.max(1.5, u * 0.06);
  g.stroke();

  // ear pods
  g.fillStyle = dark;
  roundRect(g, -1.38 * u, -3.05 * u, 0.32 * u, 0.7 * u, 0.12 * u);
  g.fill();
  roundRect(g, 1.06 * u, -3.05 * u, 0.32 * u, 0.7 * u, 0.12 * u);
  g.fill();

  // antenna
  g.strokeStyle = dark;
  g.lineWidth = Math.max(1.5, u * 0.07);
  g.beginPath();
  if (charred) {
    g.moveTo(0, -3.42 * u);
    g.quadraticCurveTo(0.1 * u, -3.8 * u, 0.6 * u, -3.95 * u);
  } else {
    g.moveTo(0, -3.42 * u);
    g.lineTo(0, -4.1 * u);
  }
  g.stroke();
  g.fillStyle = charred ? '#4a3a2c' : '#ffd166';
  g.beginPath();
  g.arc(charred ? 0.62 * u : 0, charred ? -3.97 * u : -4.15 * u, 0.17 * u, 0, Math.PI * 2);
  g.fill();

  // visor
  g.fillStyle = charred ? '#0c0d10' : '#14203a';
  roundRect(g, -0.92 * u, -3.12 * u, 1.84 * u, 0.98 * u, 0.3 * u);
  g.fill();
  g.strokeStyle = charred ? '#1c1f26' : '#3b4f78';
  g.lineWidth = Math.max(1, u * 0.05);
  g.stroke();

  g.save();
  roundRect(g, -0.92 * u, -3.12 * u, 1.84 * u, 0.98 * u, 0.3 * u);
  g.clip();

  if (o.visor === 'heart') {
    g.shadowColor = '#ff4fa8';
    g.shadowBlur = u * 0.9;
    g.fillStyle = '#ff6eb4';
    heartPath(g, 0, -2.66 * u, u * 0.55);
    g.fill();
    g.shadowBlur = 0;
    g.fillStyle = '#ffd0e6';
    heartPath(g, 0, -2.66 * u, u * 0.22);
    g.fill();
  } else if (o.visor === 'dead') {
    g.strokeStyle = '#ff5a3c';
    g.lineWidth = Math.max(2, u * 0.12);
    g.lineCap = 'round';
    for (const ex of [-0.42, 0.42]) {
      g.beginPath();
      g.moveTo(ex * u - 0.2 * u, -2.92 * u);
      g.lineTo(ex * u + 0.2 * u, -2.36 * u);
      g.moveTo(ex * u + 0.2 * u, -2.92 * u);
      g.lineTo(ex * u - 0.2 * u, -2.36 * u);
      g.stroke();
    }
  } else {
    const scanX = -0.92 + ((o.t * 0.55) % 1) * 1.84;
    const sg = g.createLinearGradient(-0.92 * u, 0, 0.92 * u, 0);
    sg.addColorStop(0, 'rgba(120,220,255,0)');
    sg.addColorStop(clamp(scanX / 1.84, 0.05, 0.9), 'rgba(120,220,255,0.75)');
    sg.addColorStop(1, 'rgba(120,220,255,0)');
    g.fillStyle = sg;
    g.fillRect(-0.92 * u, -3.02 * u, 1.84 * u, 0.16 * u);
    g.shadowColor = '#65d9ff';
    g.shadowBlur = u * 0.5;
    g.fillStyle = 'rgba(160,235,255,0.95)';
    g.beginPath();
    g.arc(-0.5 * u, -2.62 * u, u * 0.09, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(0.5 * u, -2.62 * u, u * 0.09, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // scorch marks when charred
  if (charred) {
    g.globalAlpha = 0.5;
    g.fillStyle = '#0a0b0e';
    g.beginPath();
    g.ellipse(-0.5 * u, -2.1 * u, 0.6 * u, 0.35 * u, 0.4, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(0.6 * u, -0.9 * u, 0.5 * u, 0.4 * u, -0.5, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  }

  g.restore();
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const w = ctx.width;
  const h = ctx.height;
  g.clearRect(0, 0, w, h);

  if (!S) init(ctx);
  if (dt > 0.05) dt = 0.05;
  const u = S.u;

  // where the real streamer sits on the glass
  const st = ctx.streamer || { x: 0.56, y: 0.12, w: 0.38, h: 0.68 };
  const sx = st.x * w;
  const sy = st.y * h;
  const sw = st.w * w;
  const sh = st.h * h;

  const onLeft = sx + sw * 0.5 > w * 0.5;
  const robX = onLeft ? w * 0.2 : w * 0.8;
  const robY = Math.min(h * 0.72, sy + sh + u * 1.2);
  const robBaseY = clamp(robY, u * 5.4, h - u * 1.8);

  const heat = t < T_BOOM ? smooth(seg(t, 5.4, T_HEART)) * (0.6 + 0.4 * seg(t, T_HEART, T_BOOM)) : 0;
  const charred = t >= T_BOOM;
  const thumbs = t >= T_AFTER + 0.9;

  // ---------- sound cues ----------
  const beepOnce = (key, cond, freq, ms) => {
    if (cond && !S.flags[key]) {
      S.flags[key] = true;
      try { ctx.sound.beep(freq, ms); } catch (e) {}
    }
  };
  beepOnce('boot', t > T_BOOT, 520, 130);
  beepOnce('scan', t > T_SCAN, 700, 90);
  beepOnce('lock', t > T_LOCK, 880, 110);
  beepOnce('heart', t > T_HEART, 1180, 150);
  beepOnce('boom', t > T_BOOM, 90, 60);
  beepOnce('sad1', t > T_AFTER, 300, 220);
  beepOnce('sad2', t > T_AFTER + 0.4, 200, 340);

  if (t > T_BOOM && !S.flags.boomNoise) {
    S.flags.boomNoise = true;
    try { ctx.sound.noise(520); } catch (e) {}
    S.shake = 14;
    S.flash = 1;
    burstBolts(ctx, robX, robBaseY - u * 2.4);
  }
  if (t > T_BOOM + 0.25 && !S.flags.boomNoise2) {
    S.flags.boomNoise2 = true;
    try { ctx.sound.noise(300); } catch (e) {}
  }

  // rising alarm beeps
  if (t > T_LOCK && t < T_BOOM) {
    const n = Math.floor((t - T_LOCK) / 0.26);
    if (n !== S.beat) {
      S.beat = n;
      try { ctx.sound.beep(420 + heat * 900 + n * 8, 55); } catch (e) {}
    }
  }

  // ---------- particles ----------
  S.shake = Math.max(0, S.shake - dt * 34);
  S.flash = Math.max(0, S.flash - dt * 2.4);

  if (t > T_BOOM && t < T_BOOM + 4.2) {
    spawnFire(ctx, robX, robBaseY - u * 2.2, 2.2, 1);
    if (ctx.rand() < dt * 14) spawnSmoke(ctx, robX, robBaseY - u * 3.2);
  }
  if (t >= T_AFTER) {
    if (ctx.rand() < dt * 2.4) spawnSmoke(ctx, robX, robBaseY - u * 3.4);
    if (ctx.rand() < dt * 5) spawnFire(ctx, robX - u * 0.3, robBaseY - u * 1.4, 1.0, 0.35);
  }

  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.life -= dt;
    if (p.life <= 0) { S.parts.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'fire') {
      p.vy -= 40 * dt;
      p.vx *= 0.98;
      p.r += dt * 14;
    } else {
      p.vy -= 6 * dt;
      p.vx += (ctx.rand() - 0.5) * 26 * dt;
      p.r += dt * 16;
    }
  }
  if (S.parts.length > 320) S.parts.splice(0, S.parts.length - 320);

  for (let i = S.bolts.length - 1; i >= 0; i--) {
    const b = S.bolts[i];
    b.life -= dt;
    if (b.life <= 0) { S.bolts.splice(i, 1); continue; }
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.vy += 620 * dt;
    b.vx *= 0.99;
    b.rot += b.vr * dt;
    if (b.y > h + 40) S.bolts.splice(i, 1);
  }

  // ---------- world transform (shake) ----------
  g.save();
  if (S.shake > 0.2) {
    g.translate((ctx.rand() - 0.5) * S.shake, (ctx.rand() - 0.5) * S.shake);
  }

  // ---------- sensor lock on the live shot ----------
  const lockOn = smooth(seg(t, T_LOCK - 0.2, T_LOCK + 0.9)) * (charred ? 0.25 : 1);
  if (lockOn > 0.02) {
    const pad = u * 0.45;
    const bx = sx - pad, by = sy - pad, bw = sw + pad * 2, bh = sh + pad * 2;
    const c = Math.min(bw, bh) * 0.22;
    g.save();
    g.globalAlpha = lockOn * (0.6 + 0.4 * Math.sin(t * 6));
    g.strokeStyle = '#ff6eb4';
    g.lineWidth = Math.max(2, u * 0.07);
    g.lineCap = 'round';
    const corners = [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]];
    for (const [cx0, cy0, dx, dy] of corners) {
      g.beginPath();
      g.moveTo(cx0 + dx * c, cy0);
      g.lineTo(cx0, cy0);
      g.lineTo(cx0, cy0 + dy * c);
      g.stroke();
    }
    g.restore();

    // dashed heat beam from the robot's eye to the shot
    g.save();
    g.globalAlpha = lockOn * 0.55;
    g.strokeStyle = 'rgba(255,120,190,0.9)';
    g.lineWidth = Math.max(1.5, u * 0.045);
    g.setLineDash([u * 0.35, u * 0.3]);
    g.lineDashOffset = -t * 70;
    g.beginPath();
    g.moveTo(robX + (onLeft ? u * 1.1 : -u * 1.1), robBaseY - u * 2.6);
    g.lineTo(sx + sw / 2, sy + sh / 2);
    g.stroke();
    g.restore();
  }

  // ---------- gauge ----------
  const gx = robX + (onLeft ? u * 2.15 : -u * 2.75);
  const gyTop = robBaseY - u * 3.4;
  const gh = u * 2.6;
  g.save();
  g.fillStyle = 'rgba(12,16,28,0.6)';
  roundRect(g, gx - u * 0.32, gyTop - u * 0.22, u * 0.64, gh + u * 0.44, u * 0.3);
  g.fill();
  g.strokeStyle = 'rgba(255,110,180,0.7)';
  g.lineWidth = Math.max(1.2, u * 0.04);
  g.stroke();
  const fillH = gh * heat;
  const grad = g.createLinearGradient(0, gyTop + gh, 0, gyTop);
  grad.addColorStop(0, '#5bd1ff');
  grad.addColorStop(0.5, '#ffd166');
  grad.addColorStop(1, '#ff4d4d');
  g.fillStyle = grad;
  roundRect(g, gx - u * 0.18, gyTop + gh - fillH, u * 0.36, fillH, u * 0.14);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.85)';
  g.font = '700 ' + Math.round(u * 0.4) + 'px "Trebuchet MS", system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillText(charred ? 'ERR' : Math.round(heat * 100) + '%', gx, gyTop + gh + u * 0.62);
  g.restore();

  // ---------- fire glow ----------
  if (charred && t < T_AFTER + 3) {
    const glow = g.createRadialGradient(robX, robBaseY - u * 2, u * 0.3, robX, robBaseY - u * 2, u * 5);
    glow.addColorStop(0, 'rgba(255,150,60,0.42)');
    glow.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = glow;
    g.fillRect(robX - u * 5, robBaseY - u * 7, u * 10, u * 10);
  }

  // ---------- particles behind robot ----------
  g.save();
  g.globalCompositeOperation = 'lighter';
  for (const p of S.parts) {
    if (p.kind !== 'fire') continue;
    const k = clamp(p.life / p.max, 0, 1);
    const rg = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
    rg.addColorStop(0, 'rgba(255,235,170,' + (0.75 * k) + ')');
    rg.addColorStop(0.45, 'rgba(255,150,50,' + (0.5 * k) + ')');
    rg.addColorStop(1, 'rgba(180,40,10,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // ---------- robot ----------
  let visor = 'scan';
  if (charred) visor = 'dead';
  else if (t >= T_HEART) visor = 'heart';

  drawRobot(g, robX, robBaseY, u, {
    t,
    heat,
    charred,
    visor,
    thumbs,
  });

  // little nameplate so nobody mistakes it for the talent
  g.save();
  g.globalAlpha = 0.85;
  g.font = '600 ' + Math.round(u * 0.33) + 'px "Trebuchet MS", system-ui, sans-serif';
  g.textAlign = 'center';
  g.fillStyle = 'rgba(230,240,255,0.8)';
  g.shadowColor = 'rgba(0,0,0,0.9)';
  g.shadowBlur = u * 0.2;
  g.fillText('LEGALLY DISTINCT ROBOT', robX, robBaseY + u * 1.75);
  g.font = '500 ' + Math.round(u * 0.27) + 'px "Trebuchet MS", system-ui, sans-serif';
  g.fillStyle = 'rgba(255,180,215,0.75)';
  g.fillText('NOT DOCTORDIGGITDANK', robX, robBaseY + u * 2.1);
  g.restore();

  // ---------- smoke ----------
  for (const p of S.parts) {
    if (p.kind !== 'smoke') continue;
    const k = clamp(p.life / p.max, 0, 1);
    g.fillStyle = 'rgba(120,128,142,' + (0.28 * k) + ')';
    g.beginPath();
    g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    g.fill();
  }

  // ---------- bolts ----------
  for (const b of S.bolts) {
    g.save();
    g.translate(b.x, b.y);
    g.rotate(b.rot);
    g.globalAlpha = clamp(b.life / 1.2, 0, 1);
    g.fillStyle = '#b9c6d8';
    g.fillRect(-b.s / 2, -b.s / 2, b.s, b.s * 0.7);
    g.restore();
  }

  g.restore(); // end shake

  // ---------- flash ----------
  if (S.flash > 0.01) {
    g.save();
    g.globalAlpha = S.flash * 0.35;
    const fg = g.createRadialGradient(robX, robBaseY - u * 2, 0, robX, robBaseY - u * 2, Math.max(w, h) * 0.6);
    fg.addColorStop(0, 'rgba(255,210,140,0.9)');
    fg.addColorStop(1, 'rgba(255,90,20,0)');
    g.fillStyle = fg;
    g.fillRect(0, 0, w, h);
    g.restore();
  }

  // ---------- caption rail ----------
  const capY = h * 0.86;
  const capSize = Math.round(Math.max(18, Math.min(w, h) * 0.042));
  caption(g, 'UNIT-8008 ONLINE.', w / 2, capY, capSize, capAlpha(t, 0.5, 3.1));
  caption(g, 'SCANNING THE LIVE FEED.', w / 2, capY, capSize, capAlpha(t, T_SCAN, 6.5));
  caption(g, 'SUBJECT LOCATED. TEMPERATURE RISING.', w / 2, capY, capSize, capAlpha(t, 6.7, 9.4));
  caption(g, 'BOOB DETECTED. THIS UNIT IS NOT OKAY.', w / 2, capY, capSize, capAlpha(t, 9.6, 11.6));
  caption(g, 'OW. OW. OW.', w / 2, capY, capSize * 1.15, capAlpha(t, 11.9, 13.9));
  caption(g, 'STRUCTURAL INTEGRITY: DEPARTED.', w / 2, capY, capSize, capAlpha(t, 14.1, 16.9));
  caption(g, 'DOCTORDIGGITDANK IS FINE. THE ROBOT IS NOT.', w / 2, capY, capSize, capAlpha(t, T_AFTER + 0.6, T_END));

  if (t >= T_END) {
    ctx.done();
  }
}

export function dispose(ctx) {}
