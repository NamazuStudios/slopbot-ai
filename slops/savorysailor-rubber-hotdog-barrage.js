export const meta = {
  title: 'Rubber Hotdog Barrage',
  author: 'savorysailor',
  prompt: 'throw rubber hotdogs at the streamer every time somebody says hotdog, bouncing off of them and around the scene',
  createdAt: '2026-11-22T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["hotdog"] },
  ],
};

let S = null;

const TOTAL_DOGS = 12;
const SPAWN_START = 0.4;
const SPAWN_GAP = 0.31;
const PUNCH_AT = 7.4;
const END_AT = 9.9;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function rectOf(ctx) {
  const st = ctx.streamer;
  if (st && st.w > 0.02 && st.h > 0.02) {
    return {
      x: st.x * ctx.width,
      y: st.y * ctx.height,
      w: st.w * ctx.width,
      h: st.h * ctx.height,
    };
  }
  return {
    x: ctx.width * 0.3,
    y: ctx.height * 0.2,
    w: ctx.width * 0.4,
    h: ctx.height * 0.55,
  };
}

function safeName(v) {
  if (!v) return null;
  const n = String(v).replace(/[^A-Za-z0-9_]/g, '').slice(0, 22);
  return n.length ? n : null;
}

export function init(ctx) {
  S = {
    dogs: [],
    rings: [],
    sparks: [],
    nextSpawn: SPAWN_START,
    spawned: 0,
    thrower: null,
    punch: false,
    ended: false,
    hits: 0,
  };
}

export function onTrigger(ctx, event) {
  if (!S) init(ctx);
  if (event) {
    const n = safeName(event.login);
    if (n) S.thrower = n;
  }
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);
  if (!S) init(ctx);

  const step = clamp(dt || 0, 0, 0.05);
  const W = ctx.width;
  const H = ctx.height;
  const R = rectOf(ctx);

  // spawn the barrage
  while (S.spawned < TOTAL_DOGS && t >= S.nextSpawn) {
    spawnDog(ctx, R, W, H);
    S.spawned++;
    S.nextSpawn += SPAWN_GAP;
    if (ctx.sound && ctx.sound.noise) ctx.sound.noise(80);
  }

  // punchline moment
  if (!S.punch && t >= PUNCH_AT) {
    S.punch = true;
    if (ctx.sound && ctx.sound.beep) {
      ctx.sound.beep(523, 120);
      ctx.sound.beep(784, 160);
    }
  }

  // physics
  for (let i = S.dogs.length - 1; i >= 0; i--) {
    const d = S.dogs[i];
    d.age += step;
    d.vy += 620 * step;
    d.vx *= 0.999;
    d.vy *= 0.999;

    const sp = Math.hypot(d.vx, d.vy);
    if (sp > 1500) {
      d.vx = (d.vx / sp) * 1500;
      d.vy = (d.vy / sp) * 1500;
    }

    d.x += d.vx * step;
    d.y += d.vy * step;
    d.angle += d.spin * step;
    d.squash *= Math.exp(-step * 9);
    d.hitCd = Math.max(0, d.hitCd - step);
    d.sndCd = Math.max(0, d.sndCd - step);

    // trailing ghosts
    d.trail.push({ x: d.x, y: d.y, a: d.angle });
    if (d.trail.length > 7) d.trail.shift();

    collideStreamer(ctx, d, R);

    // walls keep the dogs roaming the scene
    const pad = d.r + 4;
    if (d.x < pad) {
      d.x = pad;
      d.vx = Math.abs(d.vx) * 0.86;
      bump(d);
    } else if (d.x > W - pad) {
      d.x = W - pad;
      d.vx = -Math.abs(d.vx) * 0.86;
      bump(d);
    }
    if (d.y < pad) {
      d.y = pad;
      d.vy = Math.abs(d.vy) * 0.86;
      bump(d);
    } else if (d.y > H - pad) {
      d.y = H - pad;
      d.vy = -Math.abs(d.vy) * 0.84;
      d.vx *= 0.985;
      bump(d);
    }
  }

  // effects
  for (let i = S.rings.length - 1; i >= 0; i--) {
    const r = S.rings[i];
    r.life -= step;
    r.r += r.grow * step;
    if (r.life <= 0) S.rings.splice(i, 1);
  }
  for (let i = S.sparks.length - 1; i >= 0; i--) {
    const p = S.sparks[i];
    p.life -= step;
    p.vy += 900 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.rot += p.spin * step;
    if (p.life <= 0) S.sparks.splice(i, 1);
  }

  drawTargetReticle(c, ctx, R, t);
  drawRings(c);
  drawSparks(c);

  for (let i = 0; i < S.dogs.length; i++) drawTrail(c, S.dogs[i]);
  for (let i = 0; i < S.dogs.length; i++) drawDog(c, S.dogs[i]);

  drawHud(ctx, t);

  if (!S.ended && t >= END_AT) {
    S.ended = true;
    ctx.done();
  }
}

function spawnDog(ctx, R, W, H) {
  const rnd = ctx.rand();
  const edge = Math.floor(ctx.rand() * 4);
  const m = 70;
  let x = 0;
  let y = 0;
  if (edge === 0) {
    x = -m;
    y = H * (0.12 + ctx.rand() * 0.76);
  } else if (edge === 1) {
    x = W + m;
    y = H * (0.12 + ctx.rand() * 0.76);
  } else if (edge === 2) {
    x = W * (0.1 + ctx.rand() * 0.8);
    y = -m;
  } else {
    x = W * (0.1 + ctx.rand() * 0.8);
    y = H + m;
  }

  const tx = R.x + R.w * (0.2 + ctx.rand() * 0.6);
  const ty = R.y + R.h * (0.2 + ctx.rand() * 0.6);
  let dx = tx - x;
  let dy = ty - y;
  const len = Math.max(1, Math.hypot(dx, dy));
  dx /= len;
  dy /= len;

  const jitter = (ctx.rand() - 0.5) * 0.22;
  const cs = Math.cos(jitter);
  const sn = Math.sin(jitter);
  const ndx = dx * cs - dy * sn;
  const ndy = dx * sn + dy * cs;

  const speed = 760 + ctx.rand() * 460;
  const rad = 15 + ctx.rand() * 4;

  S.dogs.push({
    x,
    y,
    vx: ndx * speed,
    vy: ndy * speed,
    angle: ctx.rand() * Math.PI * 2,
    spin: (ctx.rand() - 0.5) * 9,
    len: 88 + ctx.rand() * 26,
    r: rad,
    squash: 0,
    age: 0,
    hitCd: 0,
    sndCd: 0,
    trail: [],
    tint: rnd,
  });
}

function bump(d) {
  if (d.hitCd > 0) return;
  d.hitCd = 0.08;
  d.squash = 0.3;
}

function collideStreamer(ctx, d, R) {
  const pad = d.r * 0.7;
  const rx = R.x - pad;
  const ry = R.y - pad;
  const rw = R.w + pad * 2;
  const rh = R.h + pad * 2;
  if (d.x < rx || d.x > rx + rw || d.y < ry || d.y > ry + rh) return;

  const dl = d.x - rx;
  const dr = rx + rw - d.x;
  const dtp = d.y - ry;
  const db = ry + rh - d.y;
  const m = Math.min(dl, dr, dtp, db);
  const speed = Math.hypot(d.vx, d.vy);

  if (m === dl) {
    d.x = rx;
    d.vx = -Math.abs(d.vx) * 0.9;
  } else if (m === dr) {
    d.x = rx + rw;
    d.vx = Math.abs(d.vx) * 0.9;
  } else if (m === dtp) {
    d.y = ry;
    d.vy = -Math.abs(d.vy) * 0.9;
  } else {
    d.y = ry + rh;
    d.vy = Math.abs(d.vy) * 0.9;
  }

  d.spin += (ctx.rand() - 0.5) * 10;
  d.squash = 0.5;
  d.hitCd = 0.07;
  S.hits++;

  S.rings.push({
    x: d.x,
    y: d.y,
    r: d.r * 0.9,
    grow: 460 + speed * 0.15,
    life: 0.38,
    max: 0.38,
    col: '#ff5fa8',
  });

  const n = 6 + Math.floor(ctx.rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = ctx.rand() * Math.PI * 2;
    const v = 120 + ctx.rand() * 320;
    S.sparks.push({
      x: d.x,
      y: d.y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 80,
      rot: ctx.rand() * 6,
      spin: (ctx.rand() - 0.5) * 16,
      life: 0.35 + ctx.rand() * 0.3,
      max: 0.65,
      col: ctx.rand() > 0.5 ? '#ffd23f' : '#ff8fc0',
    });
  }

  if (d.sndCd <= 0 && ctx.sound && ctx.sound.beep) {
    d.sndCd = 0.11;
    const f = 300 + Math.min(420, speed * 0.28) + ctx.rand() * 90;
    ctx.sound.beep(f, 55);
  }
}

function drawTargetReticle(c, ctx, R, t) {
  if (t > 2.6) return;
  const a = t < 1.6 ? 1 : clamp(1 - (t - 1.6) / 1, 0, 1);
  const blink = 0.55 + 0.45 * Math.sin(t * 10);
  const len = Math.min(R.w, R.h) * 0.2;
  const inset = 8;
  c.save();
  c.globalAlpha = a * (0.45 + 0.3 * blink);
  c.strokeStyle = '#ff5fa8';
  c.lineWidth = 4;
  c.lineCap = 'round';
  const x0 = R.x - inset;
  const y0 = R.y - inset;
  const x1 = R.x + R.w + inset;
  const y1 = R.y + R.h + inset;
  c.beginPath();
  c.moveTo(x0, y0 + len); c.lineTo(x0, y0); c.lineTo(x0 + len, y0);
  c.moveTo(x1 - len, y0); c.lineTo(x1, y0); c.lineTo(x1, y0 + len);
  c.moveTo(x1, y1 - len); c.lineTo(x1, y1); c.lineTo(x1 - len, y1);
  c.moveTo(x0 + len, y1); c.lineTo(x0, y1); c.lineTo(x0, y1 - len);
  c.stroke();
  c.restore();
}

function drawRings(c) {
  c.save();
  for (let i = 0; i < S.rings.length; i++) {
    const r = S.rings[i];
    c.globalAlpha = clamp(r.life / r.max, 0, 1) * 0.8;
    c.strokeStyle = r.col;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(r.x, r.y, r.r, 0, Math.PI * 2);
    c.stroke();
  }
  c.restore();
}

function drawSparks(c) {
  c.save();
  for (let i = 0; i < S.sparks.length; i++) {
    const p = S.sparks[i];
    c.globalAlpha = clamp(p.life / p.max, 0, 1);
    c.fillStyle = p.col;
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillRect(-4, -2, 8, 4);
    c.restore();
  }
  c.restore();
}

function drawTrail(c, d) {
  c.save();
  for (let i = 0; i < d.trail.length; i++) {
    const g = d.trail[i];
    const f = (i + 1) / d.trail.length;
    c.globalAlpha = f * 0.09;
    c.fillStyle = '#f2c583';
    c.save();
    c.translate(g.x, g.y);
    c.rotate(g.a);
    capsule(c, 0, 0, d.len * (0.7 + 0.3 * f), d.r * 1.6 * f);
    c.fill();
    c.restore();
  }
  c.restore();
}

function capsule(c, x, y, w, h) {
  const r = Math.max(1, h / 2);
  const hw = Math.max(r, w / 2);
  c.beginPath();
  c.moveTo(x - hw + r, y - r);
  c.lineTo(x + hw - r, y - r);
  c.arc(x + hw - r, y, r, -Math.PI / 2, Math.PI / 2);
  c.lineTo(x - hw + r, y + r);
  c.arc(x - hw + r, y, r, Math.PI / 2, Math.PI * 1.5);
  c.closePath();
}

function drawDog(c, d) {
  const L = d.len;
  const R = d.r;
  c.save();
  c.translate(d.x, d.y);
  c.rotate(d.angle);
  const sq = d.squash;
  c.scale(1 + sq * 0.7, 1 - sq * 0.55);

  // bun
  c.fillStyle = '#f0c07a';
  c.strokeStyle = 'rgba(86,46,16,0.9)';
  c.lineWidth = 3;
  capsule(c, 0, 0, L, R * 2);
  c.fill();
  c.stroke();

  // bun shading
  c.strokeStyle = 'rgba(186,124,62,0.55)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-L * 0.3, -R * 0.42);
  c.lineTo(L * 0.3, -R * 0.42);
  c.stroke();

  // sausage
  c.fillStyle = '#b8502c';
  c.strokeStyle = 'rgba(58,20,10,0.92)';
  c.lineWidth = 2.5;
  capsule(c, 0, R * 0.04, L * 0.9, R * 1.2);
  c.fill();
  c.stroke();

  // sausage highlight
  c.fillStyle = 'rgba(255,176,132,0.5)';
  capsule(c, -L * 0.04, -R * 0.2, L * 0.58, R * 0.26);
  c.fill();

  // grill marks
  c.strokeStyle = 'rgba(66,22,10,0.5)';
  c.lineWidth = 3;
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.moveTo(i * L * 0.21 - L * 0.045, -R * 0.3);
    c.lineTo(i * L * 0.21 + L * 0.045, R * 0.38);
    c.stroke();
  }

  // mustard
  c.strokeStyle = '#ffd23f';
  c.lineWidth = Math.max(3, R * 0.24);
  c.lineCap = 'round';
  c.beginPath();
  const n = 6;
  for (let i = 0; i <= n; i++) {
    const x = -L * 0.36 + (L * 0.72 * i) / n;
    const y = (i % 2 ? 1 : -1) * R * 0.28;
    if (i === 0) c.moveTo(x, y);
    else c.lineTo(x, y);
  }
  c.stroke();

  c.restore();
}

function rrect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function banner(ctx, text, sub, color, alpha, pop) {
  const c = ctx.canvas;
  const fs = clamp(ctx.height * 0.062, 22, 56) * pop;
  const subFs = fs * 0.42;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = '900 ' + fs + 'px system-ui, "Segoe UI", sans-serif';
  const tw = c.measureText(text).width;
  c.font = '700 ' + subFs + 'px system-ui, "Segoe UI", sans-serif';
  const sw = sub ? c.measureText(sub).width : 0;
  const w = Math.max(tw, sw) + fs * 1.4;
  const h = fs * 1.32 + (sub ? subFs * 1.55 : 0);
  const cx = ctx.width / 2;
  const cy = Math.max(h / 2 + ctx.height * 0.03, ctx.height * 0.11);

  c.globalAlpha = 0.5 * alpha;
  c.fillStyle = '#140b1f';
  rrect(c, cx - w / 2, cy - h / 2, w, h, fs * 0.34);
  c.fill();

  c.globalAlpha = alpha * 0.9;
  c.lineWidth = Math.max(1.5, fs * 0.04);
  c.strokeStyle = 'rgba(255,255,255,0.2)';
  c.stroke();

  const titleY = cy - (sub ? subFs * 0.5 : 0);
  c.globalAlpha = alpha;
  c.font = '900 ' + fs + 'px system-ui, "Segoe UI", sans-serif';
  c.lineJoin = 'round';
  c.lineWidth = fs * 0.16;
  c.strokeStyle = 'rgba(10,5,18,0.95)';
  c.strokeText(text, cx, titleY);
  c.fillStyle = color;
  c.fillText(text, cx, titleY);

  if (sub) {
    c.font = '700 ' + subFs + 'px system-ui, "Segoe UI", sans-serif';
    c.fillStyle = 'rgba(255,240,250,0.88)';
    c.fillText(sub, cx, cy + fs * 0.56);
  }
  c.restore();
}

function drawHud(ctx, t) {
  const c = ctx.canvas;
  const culprit = S.thrower ? 'culprit: ' + S.thrower : 'culprit: still at large';

  if (t < 1.5) {
    const p = 1 + 0.22 * Math.exp(-t * 8);
    banner(ctx, 'HOTDOG ALERT', culprit, '#ff5fa8', 1, p);
  } else if (t < PUNCH_AT) {
    const pt = t - 1.5;
    const p = 1 + 0.14 * Math.exp(-pt * 6);
    banner(ctx, 'RUBBER HOTDOGS INBOUND', 'streamer is advised to duck', '#ffd23f', 0.96, p);
  } else {
    const pt = t - PUNCH_AT;
    const p = 1 + 0.34 * Math.exp(-pt * 5) * Math.cos(pt * 14);
    banner(ctx, "YOU'VE BEEN HOTDOGGED", culprit, '#7cf6c8', 1, p);
  }

  // bonk counter, bottom left
  c.save();
  c.globalAlpha = 0.85;
  c.font = '800 ' + clamp(ctx.height * 0.028, 13, 22) + 'px system-ui, "Segoe UI", sans-serif';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  const label = S.hits + (S.hits === 1 ? ' BONK' : ' BONKS');
  const padX = 12;
  const padY = 7;
  const tw = c.measureText(label).width;
  const bw = tw + padX * 2;
  const bh = padY * 2 + clamp(ctx.height * 0.028, 13, 22);
  const bx = ctx.width * 0.035;
  const by = ctx.height * 0.9;
  c.globalAlpha = 0.45;
  c.fillStyle = '#140b1f';
  rrect(c, bx, by - bh / 2, bw, bh, bh / 2);
  c.fill();
  c.globalAlpha = 0.9;
  c.fillStyle = '#ffd23f';
  c.fillText(label, bx + padX, by);
  c.restore();
}
