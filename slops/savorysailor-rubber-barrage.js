export const meta = {
  title: 'Rubber Barrage',
  author: 'savorysailor',
  prompt: 'throw a bunch of rubber dildos at the streamer',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const PALETTE = ['#ff7ab6', '#ffd166', '#7be0c3', '#b79bff', '#ff9e6d', '#8fd8ff'];

const CAPTIONS = [
  { t0: 0.2, t1: 2.5, text: 'INCOMING: RUBBER' },
  { t0: 2.65, t1: 5.25, text: 'DUCK, SAVORYSAILOR' },
  { t0: 5.35, t1: 7.05, text: 'THE RUBBER HAS NO BRAKES' },
  { t0: 7.12, t1: 8.05, text: 'SPECIAL DELIVERY' },
  { t0: 8.2, t1: 10.4, text: 'SAVORYSAILOR: RUBBERIZED' },
];

let S = null;

export function init(ctx) {
  S = {
    times: [],
    toys: [],
    splats: [],
    thrown: 0,
    hits: 0,
    shake: 0,
    giant: null,
    impactDone: false,
    ended: false,
  };
  let tt = 0.8;
  while (tt < 6.4) {
    S.times.push(tt);
    tt += 0.17 + ctx.rand() * 0.13;
  }
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}

function getZone(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  if (ctx.streamer) {
    return {
      x: ctx.streamer.x * W,
      y: ctx.streamer.y * H,
      w: ctx.streamer.w * W,
      h: ctx.streamer.h * H,
    };
  }
  return { x: W * 0.32, y: H * 0.14, w: W * 0.36, h: H * 0.5 };
}

function addSplat(ctx, S, x, y, col, r) {
  S.splats.push({
    x,
    y,
    col,
    r: r || Math.max(8, ctx.height * 0.024),
    life: 1,
    rot: ctx.rand() * Math.PI * 2,
  });
}

function spawnToy(ctx, S, zone, t) {
  const W = ctx.width;
  const H = ctx.height;
  const len = H * (0.085 + ctx.rand() * 0.055);
  const rad = len * 0.19;
  let x;
  let y;
  const side = Math.floor(ctx.rand() * 3);
  if (side === 0) {
    x = -W * 0.1;
    y = H * (0.08 + ctx.rand() * 0.84);
  } else if (side === 1) {
    x = W * 1.1;
    y = H * (0.08 + ctx.rand() * 0.84);
  } else {
    x = W * (0.12 + ctx.rand() * 0.76);
    y = -H * 0.12;
  }
  const tx = zone.x + zone.w * (0.2 + ctx.rand() * 0.6);
  const ty = zone.y + zone.h * (0.2 + ctx.rand() * 0.55);
  const sp = H * (1.1 + ctx.rand() * 0.6);
  const d = Math.hypot(tx - x, ty - y) || 1;
  S.toys.push({
    x,
    y,
    vx: ((tx - x) / d) * sp + (ctx.rand() - 0.5) * H * 0.12,
    vy: ((ty - y) / d) * sp + (ctx.rand() - 0.5) * H * 0.12,
    len,
    rad,
    rot: ctx.rand() * Math.PI * 2,
    vr: (ctx.rand() - 0.5) * 11,
    col: PALETTE[Math.floor(ctx.rand() * PALETTE.length)],
    squash: 1,
    hit: false,
    born: t,
    eyes: ctx.rand() < 0.4,
    giant: false,
  });
  S.thrown++;
  if (ctx.rand() < 0.55) ctx.sound.noise(38);
}

function spawnMini(ctx, S, x, y, t) {
  const H = ctx.height;
  const len = H * (0.06 + ctx.rand() * 0.05);
  const ang = -Math.PI * (0.15 + ctx.rand() * 0.7);
  const sp = H * (0.55 + ctx.rand() * 0.85);
  S.toys.push({
    x,
    y,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    len,
    rad: len * 0.19,
    rot: ctx.rand() * Math.PI * 2,
    vr: (ctx.rand() - 0.5) * 16,
    col: PALETTE[Math.floor(ctx.rand() * PALETTE.length)],
    squash: 1,
    hit: true,
    born: t,
    eyes: ctx.rand() < 0.5,
    giant: false,
  });
  S.thrown++;
}

function updateToys(ctx, S, dt, t, zone) {
  const W = ctx.width;
  const H = ctx.height;
  const G = H * 2.2;
  for (const toy of S.toys) {
    if (toy.dead) continue;
    toy.vy += G * dt;
    toy.x += toy.vx * dt;
    toy.y += toy.vy * dt;
    toy.rot += toy.vr * dt;
    toy.squash += (1 - toy.squash) * Math.min(1, dt * 14);

    if (
      !toy.hit &&
      toy.x > zone.x - toy.rad && toy.x < zone.x + zone.w + toy.rad &&
      toy.y > zone.y - toy.rad && toy.y < zone.y + zone.h + toy.rad
    ) {
      toy.hit = true;
      toy.squash = 0.46;
      const cx = zone.x + zone.w / 2;
      toy.vx = (toy.x > cx ? 1 : -1) * H * (0.3 + ctx.rand() * 0.35);
      toy.vy = -H * (0.15 + ctx.rand() * 0.35);
      toy.vr = (ctx.rand() - 0.5) * 14;
      S.shake = Math.min(26, S.shake + 6);
      addSplat(ctx, S, toy.x, toy.y, toy.col);
      S.hits++;
      if (S.hits < 26) ctx.sound.beep(360 + ctx.rand() * 420, 40);
    }

    if (
      toy.y - toy.len > H + H * 0.25 ||
      toy.x < -W * 0.3 || toy.x > W * 1.3 ||
      t - toy.born > 8
    ) {
      toy.dead = true;
    }
  }
  S.toys = S.toys.filter((o) => !o.dead);
}

function updateGiant(ctx, S, t, dt, zone) {
  const H = ctx.height;
  if (t >= 7.15 && !S.giant) {
    const len = H * 0.46;
    S.giant = {
      x: zone.x + zone.w / 2,
      y: -len,
      vx: 0,
      vy: 0,
      len,
      rad: len * 0.19,
      rot: 0.45,
      vr: 0.7,
      col: '#ff7ab6',
      squash: 1,
      hit: false,
      born: t,
      eyes: false,
      giant: true,
      dropT: t,
      target: zone.y + zone.h * 0.42,
    };
  }
  const g = S.giant;
  if (!g) return;

  if (!S.impactDone) {
    const p = clamp((t - g.dropT) / 0.62, 0, 1);
    g.y = -g.len * 0.9 + (g.target + g.len * 0.9) * p * p;
    g.rot = 0.45 + p * 0.5;
    if (p >= 1) {
      S.impactDone = true;
      g.squash = 0.42;
      g.hit = true;
      g.vy = H * 0.95;
      g.vx = (ctx.rand() - 0.5) * H * 0.25;
      g.vr = (ctx.rand() - 0.5) * 7;
      S.shake = 42;
      ctx.sound.noise(300);
      ctx.sound.beep(96, 320);
      addSplat(ctx, S, g.x, g.y - g.len * 0.1, '#ffd166', H * 0.13);
      addSplat(ctx, S, g.x - g.rad * 2.2, g.y, '#7be0c3', H * 0.07);
      addSplat(ctx, S, g.x + g.rad * 2.2, g.y - g.len * 0.2, '#b79bff', H * 0.06);
      for (let i = 0; i < 12; i++) {
        spawnMini(ctx, S, g.x + (ctx.rand() - 0.5) * g.rad * 2, g.y - ctx.rand() * g.len * 0.6, t);
      }
    }
  } else {
    g.vy += H * 1.9 * dt;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.rot += g.vr * dt;
    g.squash += (1 - g.squash) * Math.min(1, dt * 10);
  }
}

function toyPath(c, len, rad) {
  c.beginPath();
  c.arc(0, -len / 2 + rad, rad, Math.PI, 0);
  c.lineTo(rad, len / 2 - rad * 0.1);
  c.quadraticCurveTo(rad, len / 2 + rad * 0.25, rad * 0.5, len / 2 + rad * 0.25);
  c.lineTo(-rad * 0.5, len / 2 + rad * 0.25);
  c.quadraticCurveTo(-rad, len / 2 + rad * 0.25, -rad, len / 2 - rad * 0.1);
  c.closePath();
}

function drawToy(c, toy) {
  const { len, rad, col } = toy;
  c.save();
  c.translate(toy.x, toy.y);
  c.rotate(toy.rot);
  const sq = clamp(toy.squash, 0.35, 1.15);
  c.scale(1 + (1 - sq) * 0.5, sq);

  const grad = c.createLinearGradient(-rad, 0, rad, 0);
  grad.addColorStop(0, shade(col, 46));
  grad.addColorStop(0.45, col);
  grad.addColorStop(1, shade(col, -42));
  c.fillStyle = grad;

  toyPath(c, len, rad);
  c.fill();

  for (const dx of [-rad * 0.62, 0, rad * 0.62]) {
    c.beginPath();
    c.ellipse(dx, len / 2 - rad * 0.05, rad * 0.64, rad * 0.72, 0, 0, Math.PI * 2);
    c.fill();
  }

  c.globalAlpha = 0.5;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(-rad * 0.42, -len * 0.12, rad * 0.2, len * 0.26, 0, 0, Math.PI * 2);
  c.fill();

  c.globalAlpha = 0.75;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(-rad * 0.28, -len / 2 + rad * 2.1, rad * 0.13, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;

  if (toy.eyes && rad > 7) {
    const ey = -len / 2 + rad * 2.35;
    for (const dx of [-rad * 0.42, rad * 0.42]) {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(dx, ey, rad * 0.3, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = '#20142c';
      c.beginPath();
      c.arc(dx + rad * 0.08, ey + rad * 0.06, rad * 0.13, 0, Math.PI * 2);
      c.fill();
    }
  }
  c.restore();
}

function drawSplat(c, s, H) {
  const a = clamp(s.life, 0, 1);
  const r = s.r * (1.65 - a * 0.55);
  c.save();
  c.translate(s.x, s.y);
  c.rotate(s.rot);
  c.strokeStyle = s.col;
  c.lineWidth = Math.max(2, s.r * 0.14);
  c.globalAlpha = a * 0.9;
  c.beginPath();
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.52;
    const px = Math.cos(ang) * rr;
    const py = Math.sin(ang) * rr;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.stroke();
  c.globalAlpha = a * 0.22;
  c.fillStyle = s.col;
  c.fill();
  c.restore();
}

function drawCorner(c, x, y, L, sx, sy) {
  c.beginPath();
  c.moveTo(x, y + sy * L);
  c.lineTo(x, y);
  c.lineTo(x + sx * L, y);
  c.stroke();
}

function drawReticle(ctx, S, t, zone) {
  const c = ctx.canvas;
  const W = ctx.width;
  const t0 = 0.2;
  const t1 = 2.4;
  let a = 0;
  if (t > t0 && t < t1) a = Math.min(1, (t - t0) / 0.25) * Math.min(1, (t1 - t) / 0.35);
  if (a <= 0) return;
  const accent = ctx.accent || '#ff7ab6';
  c.save();
  c.globalAlpha = a * 0.95;
  c.strokeStyle = accent;
  c.lineWidth = Math.max(2, W * 0.004);
  const pulse = 1 + Math.sin(t * 9) * 0.03;
  const pad = Math.min(zone.w, zone.h) * 0.12 + 6;
  const w = (zone.w + pad * 2) * pulse;
  const hh = (zone.h + pad * 2) * pulse;
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  const L = Math.min(w, hh) * 0.18;
  drawCorner(c, cx - w / 2, cy - hh / 2, L, 1, 1);
  drawCorner(c, cx + w / 2, cy - hh / 2, L, -1, 1);
  drawCorner(c, cx - w / 2, cy + hh / 2, L, 1, -1);
  drawCorner(c, cx + w / 2, cy + hh / 2, L, -1, -1);
  const fs = Math.max(11, Math.min(W * 0.018, 22));
  c.font = `800 ${fs}px Inter, system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'bottom';
  c.fillStyle = accent;
  c.fillText('LIVE HUMAN', cx, cy - hh / 2 - fs * 0.45);
  c.restore();
}

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
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

function drawCaptions(ctx, t) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  for (const cap of CAPTIONS) {
    if (t < cap.t0 || t > cap.t1) continue;
    const aIn = Math.min(1, (t - cap.t0) / 0.18);
    const aOut = Math.min(1, (cap.t1 - t) / 0.3);
    const a = Math.min(aIn, aOut);
    const pop = 1 + (1 - aIn) * 0.12;
    c.save();
    c.globalAlpha = a;
    c.translate(W / 2, H * 0.145);
    c.rotate(-0.015);
    c.scale(pop, pop);
    let fs = Math.min(W * 0.055, H * 0.062);
    c.font = `900 ${fs}px Impact, "Arial Black", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tw = c.measureText(cap.text).width;
    const maxW = W * 0.86;
    if (tw > maxW) {
      fs *= maxW / tw;
      c.font = `900 ${fs}px Impact, "Arial Black", system-ui, sans-serif`;
    }
    const padX = fs * 0.5;
    const padY = fs * 0.32;
    const bw = Math.min(tw, maxW) + padX * 2;
    const bh = fs + padY * 2;
    roundRectPath(c, -bw / 2, -bh / 2, bw, bh, bh * 0.35);
    c.fillStyle = 'rgba(10,16,38,0.55)';
    c.fill();
    c.lineWidth = Math.max(2, fs * 0.05);
    c.strokeStyle = ctx.accent || '#ff7ab6';
    c.stroke();
    c.lineWidth = Math.max(3, fs * 0.12);
    c.strokeStyle = 'rgba(8,10,26,0.7)';
    c.strokeText(cap.text, 0, fs * 0.04);
    c.fillStyle = '#fff7fb';
    c.fillText(cap.text, 0, fs * 0.04);
    c.restore();
  }
}

function drawHud(ctx, S, t) {
  if (t < 0.9 || t > 7.0) return;
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const fs = Math.max(11, Math.min(W * 0.017, 20));
  c.save();
  c.globalAlpha = 0.85;
  c.font = `800 ${fs}px Inter, system-ui, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'bottom';
  c.strokeStyle = 'rgba(8,12,30,0.7)';
  c.lineWidth = Math.max(2, fs * 0.16);
  c.fillStyle = 'rgba(255,255,255,0.92)';
  const label = `RUBBER IN FLIGHT: ${String(S.thrown).padStart(2, '0')}`;
  c.strokeText(label, W * 0.035, H * 0.965);
  c.fillText(label, W * 0.035, H * 0.965);
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!S) return;

  const step = Math.min(Math.max(dt || 0, 0), 0.05);
  const zone = getZone(ctx);

  S.shake *= Math.exp(-step * 5.5);
  if (S.shake < 0.3) S.shake = 0;

  while (S.times.length && S.times[0] <= t) {
    S.times.shift();
    spawnToy(ctx, S, zone, t);
  }

  updateGiant(ctx, S, t, step, zone);
  updateToys(ctx, S, step, t, zone);

  for (const s of S.splats) s.life -= step / 0.85;
  S.splats = S.splats.filter((s) => s.life > 0);

  c.save();
  if (S.shake > 0.3) {
    c.translate((ctx.rand() - 0.5) * S.shake, (ctx.rand() - 0.5) * S.shake);
  }
  for (const s of S.splats) drawSplat(c, s, H);
  for (const toy of S.toys) drawToy(c, toy);
  if (S.giant) drawToy(c, S.giant);
  drawReticle(ctx, S, t, zone);
  drawCaptions(ctx, t);
  drawHud(ctx, S, t);
  c.restore();

  if (t > 10.45 && !S.ended) {
    S.ended = true;
    ctx.done();
  }
}
