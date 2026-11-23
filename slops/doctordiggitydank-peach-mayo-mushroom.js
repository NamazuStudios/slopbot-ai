export const meta = {
  title: 'Peach Mayo Mushroom',
  author: 'doctordiggitydank',
  prompt: 'a peach colored thick mushroom enters the frame from the upper left corner, aimed directly at the streamer, pulsates then bursts mayonnaise',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const T_SETTLE = 1.15;
const T_PULSE_A = 1.2;
const T_SHRINK = 2.7;
const T_FIRE = 3.05;
const T_FIRE_END = 5.5;
const T_FADE = 8.9;
const T_END = 9.8;

let S = null;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }
function easeOutBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
function easeInQuad(k) { return k * k; }
function safeLogin(v) {
  return typeof v === 'string' && /^[A-Za-z0-9_]{1,25}$/.test(v) ? v : '';
}

export function init(ctx) {
  const rnd = ctx.rand;
  const W = ctx.width, H = ctx.height;
  const st = ctx.streamer;
  let rect;
  if (st && st.w > 0 && st.h > 0) {
    rect = { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H };
  } else {
    rect = { x: W * 0.18, y: H * 0.1, w: W * 0.64, h: H * 0.78 };
  }
  const tx = rect.x + rect.w * 0.5;
  const ty = rect.y + rect.h * 0.42;
  const R = Math.min(W, H) * 0.115;

  const restX = clamp(rect.x + rect.w * 0.08, R * 1.2, W - R * 1.2);
  const restY = clamp(rect.y - rect.h * 0.02, R * 1.35, H - R * 2.4);

  const phrases = [
    { text: 'HE ASKED FOR IT', at: 4.35, x: 0.5, y: 0.94, rot: 0.02, size: 0.052 },
    { text: "CHEF'S KISS", at: 4.95, x: 0.16, y: 0.52, rot: -0.24, size: 0.066 },
    { text: 'SECOND HELPING', at: 5.55, x: 0.85, y: 0.42, rot: 0.21, size: 0.056 },
    { text: 'MORE, PLEASE', at: 6.15, x: 0.5, y: 0.985, rot: -0.02, size: 0.056 },
  ];

  S = {
    W, H, rect, tx, ty, R,
    restX, restY,
    startX: -W * 0.16,
    startY: -H * 0.14,
    startRot: -2.35,
    mushX: rect.x, mushY: rect.y, rot: -2.35,
    particles: [], splats: [],
    spawnAcc: 0, lastHitNoise: -10,
    shake: 0, fired: {}, ended: false,
    hitCount: 0,
    phrases,
    login: safeLogin(ctx.trigger && ctx.trigger.login),
    triggerType: (ctx.trigger && typeof ctx.trigger.type === 'string') ? ctx.trigger.type : '',
    wow: 1,
  };
  return S;
}

function addSplat(s, rnd, x, y, size) {
  const lobes = [];
  const n = 4 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const ang = rnd() * Math.PI * 2;
    const d = rnd() * size * 1.05;
    lobes.push({ dx: Math.cos(ang) * d, dy: Math.sin(ang) * d * 0.85, r: size * (0.3 + rnd() * 0.6) });
  }
  const drips = [];
  const dn = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < dn; i++) {
    drips.push({
      dx: (rnd() - 0.5) * size * 1.1,
      w: size * (0.1 + rnd() * 0.14),
      len: size * (0.7 + rnd() * 2.0),
      delay: rnd() * 0.3,
    });
  }
  s.splats.push({ x, y, size, lobes, drips, age: 0 });
  if (s.splats.length > 70) s.splats.shift();
}

function drawSplat(c, sp, alpha) {
  const k = clamp(sp.age / 0.14, 0, 1);
  if (k <= 0) return;
  const grow = 0.45 + 0.55 * easeOutBack(k);
  c.globalAlpha = alpha * Math.min(1, k * 1.7) * 0.94;
  for (const l of sp.lobes) {
    c.beginPath();
    c.arc(sp.x + l.dx * grow, sp.y + l.dy * grow, l.r * grow, 0, Math.PI * 2);
    c.fillStyle = '#f6efdc';
    c.fill();
  }
  c.beginPath();
  c.arc(sp.x, sp.y, sp.size * 0.92 * grow, 0, Math.PI * 2);
  c.fillStyle = '#fffdf3';
  c.fill();
  c.beginPath();
  c.arc(sp.x - sp.size * 0.22, sp.y - sp.size * 0.24, sp.size * 0.3 * grow, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.fill();
  c.beginPath();
  c.arc(sp.x, sp.y, sp.size * 0.92 * grow, 0, Math.PI * 2);
  c.strokeStyle = 'rgba(206,196,170,0.5)';
  c.lineWidth = Math.max(1, sp.size * 0.05);
  c.stroke();
  for (const d of sp.drips) {
    const dk = clamp((sp.age - d.delay) / 0.55, 0, 1);
    if (dk <= 0) continue;
    const len = d.len * dk;
    const grd = c.createLinearGradient(0, sp.y, 0, sp.y + len + 4);
    grd.addColorStop(0, 'rgba(255,253,243,0.95)');
    grd.addColorStop(1, 'rgba(245,238,219,0.7)');
    c.fillStyle = grd;
    c.beginPath();
    if (c.roundRect) c.roundRect(sp.x + d.dx - d.w / 2, sp.y, d.w, len + 4, d.w * 0.65);
    else c.rect(sp.x + d.dx - d.w / 2, sp.y, d.w, len + 4);
    c.fill();
    c.beginPath();
    c.arc(sp.x + d.dx, sp.y + len + 4, d.w * 0.62, 0, Math.PI * 2);
    c.fillStyle = 'rgba(250,244,227,0.85)';
    c.fill();
  }
  c.globalAlpha = 1;
}

function drawHairyCoconut(c, x, y, r, wob, phase) {
  c.save();
  c.translate(x, y);
  c.rotate(wob);
  // hairs first (behind the nut)
  c.strokeStyle = 'rgba(84,55,31,0.92)';
  c.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + phase * 0.4;
    const inner = r * 0.94;
    const outer = r * (1.18 + 0.14 * Math.sin(phase * 2.6 + i * 1.7));
    c.lineWidth = Math.max(1.2, r * 0.075);
    c.beginPath();
    c.moveTo(Math.cos(a) * inner, Math.sin(a) * inner * 0.98);
    c.quadraticCurveTo(
      Math.cos(a + 0.14) * (inner + r * 0.12),
      Math.sin(a + 0.14) * (inner + r * 0.12),
      Math.cos(a + 0.07) * outer,
      Math.sin(a + 0.07) * outer
    );
    c.stroke();
  }
  const grd = c.createRadialGradient(-r * 0.3, -r * 0.34, r * 0.15, 0, 0, r * 1.05);
  grd.addColorStop(0, '#a9784b');
  grd.addColorStop(0.6, '#7d5330');
  grd.addColorStop(1, '#543320');
  c.fillStyle = grd;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  // fibrous seams
  c.strokeStyle = 'rgba(58,37,22,0.55)';
  c.lineWidth = Math.max(1, r * 0.06);
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.arc(i * r * 0.34, 0, r * 0.72, -0.85, 0.85);
    c.stroke();
  }
  c.beginPath();
  c.arc(-r * 0.3, -r * 0.36, r * 0.22, 0, Math.PI * 2);
  c.fillStyle = 'rgba(214,170,124,0.42)';
  c.fill();
  c.restore();
}

function drawMushroom(c, s, t) {
  const R = s.R;
  const pulsePhase = t - T_PULSE_A;
  let squash = 1;
  let wobble = 0;
  if (t > T_PULSE_A && t < T_SHRINK + 0.1) {
    const k = clamp((t - T_PULSE_A) / (T_SHRINK - T_PULSE_A), 0, 1);
    squash = 1 + Math.sin(pulsePhase * 11) * (0.11 + 0.05 * k);
    wobble = Math.sin(pulsePhase * 5.5) * 0.05;
  }
  if (t >= T_SHRINK) {
    squash = lerp(squash, 1.22, clamp((t - T_SHRINK) / 0.32, 0, 1) * 0.6);
  }
  if (t >= T_FIRE) {
    const kick = clamp(1 - (t - T_FIRE) / 0.35, 0, 1);
    squash = 1 + Math.sin(t * 26) * 0.05 * kick;
  }

  c.save();
  c.translate(s.mushX, s.mushY);
  c.rotate(s.rot + wobble);

  const capW = R * 1.06 / Math.sqrt(squash);
  const capH = R * 0.94 * squash;

  // stem (draw first, sits below cap in local space)
  const stemTop = -R * 0.16;
  const stemBot = R * 1.42;
  const stemW = R * 0.5;
  const sg = c.createLinearGradient(-stemW * 0.6, 0, stemW * 0.7, 0);
  sg.addColorStop(0, '#f3dcb7');
  sg.addColorStop(0.45, '#fff3d9');
  sg.addColorStop(1, '#e0c299');
  c.fillStyle = sg;
  c.beginPath();
  if (c.roundRect) c.roundRect(-stemW * 0.5, stemTop, stemW, stemBot - stemTop, stemW * 0.42);
  else c.rect(-stemW * 0.5, stemTop, stemW, stemBot - stemTop);
  c.fill();
  c.strokeStyle = 'rgba(150,110,68,0.35)';
  c.lineWidth = Math.max(1, R * 0.03);
  c.stroke();

  // cap dome
  const cg = c.createLinearGradient(0, -capH, 0, capH * 0.25);
  cg.addColorStop(0, '#ffdcc0');
  cg.addColorStop(0.42, '#ffbe98');
  cg.addColorStop(1, '#e8936a');
  c.fillStyle = cg;
  c.beginPath();
  c.moveTo(-capW, 0);
  c.bezierCurveTo(-capW * 1.02, -capH * 1.28, capW * 1.02, -capH * 1.28, capW, 0);
  c.bezierCurveTo(capW * 0.7, capH * 0.24, -capW * 0.7, capH * 0.24, -capW, 0);
  c.fill();

  // rim
  c.save();
  c.translate(0, -capH * 0.035);
  c.beginPath();
  c.ellipse(0, 0, capW * 0.99, capH * 0.19, 0, 0, Math.PI * 2);
  c.fillStyle = '#f6a97f';
  c.fill();
  c.strokeStyle = 'rgba(176,104,66,0.5)';
  c.lineWidth = Math.max(1, R * 0.028);
  c.stroke();
  c.restore();

  // cap highlight
  c.beginPath();
  c.ellipse(-capW * 0.34, -capH * 0.62, capW * 0.24, capH * 0.16, -0.55, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,248,236,0.55)';
  c.fill();

  // tip nub — the nozzle
  const charge = t > T_PULSE_A ? clamp((t - T_PULSE_A) / (T_SHRINK - T_PULSE_A), 0, 1) : 0;
  const nubR = R * (0.16 + charge * 0.06);
  let nubY = -capH * 0.98;
  if (t >= T_FIRE) {
    const kick = clamp(1 - (t - T_FIRE) / 0.45, 0, 1);
    nubY -= Math.sin(t * 30) * R * 0.08 * kick;
  }
  c.beginPath();
  c.ellipse(0, nubY, nubR, nubR * 0.72, 0, 0, Math.PI * 2);
  c.fillStyle = charge > 0.75 ? '#fffdf0' : '#ffc9a4';
  c.fill();
  c.strokeStyle = 'rgba(180,106,68,0.6)';
  c.lineWidth = Math.max(1, R * 0.025);
  c.stroke();
  if (charge > 0.5) {
    c.beginPath();
    c.ellipse(0, nubY, nubR * (0.4 + 0.2 * Math.sin(t * 18)), nubR * 0.28, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,250,0.9)';
    c.fill();
  }

  c.restore();
}

function tipWorld(s) {
  const R = s.R;
  const capH = R * 0.94;
  const lx = 0, ly = -capH * 0.98;
  const cos = Math.cos(s.rot), sin = Math.sin(s.rot);
  return { x: s.mushX + lx * cos - ly * sin, y: s.mushY + lx * sin + ly * cos };
}
function baseWorld(s) {
  const R = s.R;
  const lx = 0, ly = R * 1.42;
  const cos = Math.cos(s.rot), sin = Math.sin(s.rot);
  return { x: s.mushX + lx * cos - ly * sin, y: s.mushY + lx * sin + ly * cos };
}

function spawnDroplet(s, rnd, power) {
  const tip = tipWorld(s);
  const rx = s.rect.x + s.rect.w * (0.18 + rnd() * 0.64);
  const ry = s.rect.y + s.rect.h * (0.12 + rnd() * 0.62);
  const dx = rx - tip.x, dy = ry - tip.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / dist, ny = dx / dist;
  const spread = (rnd() - 0.5) * dist * 0.16;
  const cx = tip.x + dx * 0.5 + nx * spread;
  const cy = tip.y + dy * 0.5 + ny * spread - dist * (0.08 + rnd() * 0.12);
  s.particles.push({
    x0: tip.x + (rnd() - 0.5) * 8,
    y0: tip.y + (rnd() - 0.5) * 8,
    cx, cy, x1: rx, y1: ry,
    t0: 0, dur: (0.3 + rnd() * 0.22) / power,
    r: 4 + rnd() * 11,
    started: false,
    landed: false,
  });
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width, H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!S) init(ctx);
  const s = S;
  const rnd = ctx.rand;
  const step = clamp(dt || 0, 0, 0.05);

  if (t > T_END && !s.ended) {
    s.ended = true;
    ctx.done();
    return;
  }
  let fade = 1;
  if (t > T_FADE) fade = clamp(1 - (t - T_FADE) / (T_END - T_FADE), 0, 1);

  // ---- entry motion ----
  const ek = clamp(t / T_SETTLE, 0, 1);
  const eo = easeOutBack(ek);
  s.mushX = lerp(s.startX, s.restX, eo);
  s.mushY = lerp(s.startY, s.restY, eo);
  const aim = Math.atan2(s.tx - s.mushX, -(s.ty - s.mushY));
  s.rot = lerp(s.startRot, aim, clamp(ek * 1.15, 0, 1));

  // ---- sounds ----
  if (!s.fired.enter && t >= 0.05) {
    s.fired.enter = true;
    ctx.sound.noise(160);
    ctx.sound.beep(190, 110);
  }
  if (!s.fired.enter2 && t >= 0.55) {
    s.fired.enter2 = true;
    ctx.sound.beep(300, 90);
  }
  const pulseTimes = [1.25, 1.62, 1.99, 2.36];
  for (let i = 0; i < pulseTimes.length; i++) {
    if (!s.fired['p' + i] && t >= pulseTimes[i]) {
      s.fired['p' + i] = true;
      ctx.sound.beep(520 + i * 70, 100);
    }
  }
  if (!s.fired.shrink && t >= T_SHRINK) {
    s.fired.shrink = true;
    ctx.sound.beep(360, 90);
    ctx.sound.beep(300, 80);
  }
  if (!s.fired.fire && t >= T_FIRE) {
    s.fired.fire = true;
    s.shake = 1;
    ctx.sound.noise(300);
    ctx.sound.beep(150, 220);
    s.spawnAcc = 14;
  }
  if (!s.fired.big && t >= 3.75) {
    s.fired.big = true;
    ctx.sound.beep(700, 130);
  }
  const phraseBeeps = [4.35, 4.95, 5.55, 6.15];
  for (let i = 0; i < phraseBeeps.length; i++) {
    if (!s.fired['c' + i] && t >= phraseBeeps[i]) {
      s.fired['c' + i] = true;
      ctx.sound.beep(760 + i * 60, 110);
    }
  }

  // ---- spawn mayo ----
  if (t >= T_FIRE && t < T_FIRE_END) {
    const taper = t > T_FIRE_END - 0.8 ? clamp((T_FIRE_END - t) / 0.8, 0, 1) : 1;
    s.spawnAcc += step * (90 + 55 * taper);
    let guard = 0;
    while (s.spawnAcc >= 1 && s.particles.length < 380 && guard < 40) {
      s.spawnAcc -= 1;
      guard++;
      spawnDroplet(s, rnd, 0.9 + taper * 0.35);
    }
    if (t - s.lastHitNoise > 0.34) {
      s.lastHitNoise = t;
      ctx.sound.noise(45);
    }
  }

  // ---- update droplets ----
  const tip = tipWorld(s);
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    if (!p.started) { p.started = true; p.t0 = t; }
    const k = clamp((t - p.t0) / p.dur, 0, 1);
    if (k >= 1) {
      if (!p.landed) {
        p.landed = true;
        addSplat(s, rnd, p.x1, p.y1, p.r * (1.25 + rnd() * 0.8));
        s.hitCount++;
      }
      s.particles.splice(i, 1);
      continue;
    }
    const ik = 1 - k;
    p.x = ik * ik * p.x0 + 2 * ik * k * p.cx + k * k * p.x1;
    p.y = ik * ik * p.y0 + 2 * ik * k * p.cy + k * k * p.y1;
    p.scale = 1;
  }

  // ---- screen shake ----
  let sx = 0, sy = 0;
  if (t > T_FIRE && t < T_FIRE + 1.5) {
    const amp = (1 - (t - T_FIRE) / 1.5) * 8;
    sx = Math.sin(t * 45.7) * amp;
    sy = Math.cos(t * 37.3) * amp * 0.7;
  }

  c.save();
  c.translate(sx, sy);

  // ---- mayo sheen over the live frame (kept translucent) ----
  if (s.hitCount > 0) {
    const k = clamp((t - T_FIRE) / 0.6, 0, 1);
    c.save();
    c.beginPath();
    c.rect(s.rect.x, s.rect.y, s.rect.w, s.rect.h);
    c.clip();
    const grd = c.createRadialGradient(s.rect.x + s.rect.w * 0.5, s.rect.y + s.rect.h * 0.35, 10,
      s.rect.x + s.rect.w * 0.5, s.rect.y + s.rect.h * 0.35, Math.max(s.rect.w, s.rect.h) * 0.7);
    grd.addColorStop(0, 'rgba(255,252,240,0.14)');
    grd.addColorStop(1, 'rgba(255,250,232,0.03)');
    c.globalAlpha = fade * k;
    c.fillStyle = grd;
    c.fillRect(s.rect.x, s.rect.y, s.rect.w, s.rect.h);
    c.restore();
    c.globalAlpha = 1;
  }

  // ---- splats on the stream ----
  for (const sp of s.splats) {
    sp.age += step;
    drawSplat(c, sp, fade);
  }

  // ---- travelling mayo ----
  for (const p of s.particles) {
    if (typeof p.x !== 'number') continue;
    c.globalAlpha = fade * 0.96;
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fillStyle = '#fbf6e7';
    c.fill();
    c.beginPath();
    c.arc(p.x, p.y, p.r * 0.9, 0, Math.PI * 2);
    c.fillStyle = '#fffef8';
    c.fill();
    c.beginPath();
    c.arc(p.x - p.r * 0.28, p.y - p.r * 0.3, p.r * 0.26, 0, Math.PI * 2);
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.fill();
  }
  c.globalAlpha = 1;

  // ---- the mushroom itself ----
  drawMushroom(c, s, t);

  // ---- hanging coconuts at the base ----
  const base = baseWorld(s);
  let cocoScale = 1;
  if (t >= T_SHRINK) {
    cocoScale = lerp(1, 0.22, easeInQuad(clamp((t - T_SHRINK) / 0.34, 0, 1)));
  }
  const cr = s.R * 0.42 * cocoScale;
  const jig = t < T_FIRE ? 1 : clamp(1 - (t - T_FIRE) / 0.5, 0, 1);
  const bounce = Math.sin(t * 13.5) * 0.16 * jig;
  const sway = Math.cos(t * 9.1) * s.R * 0.05 * jig;
  if (cr > 1.5) {
    drawHairyCoconut(c, base.x - cr * 0.82 + sway, base.y + cr * 0.55 + Math.abs(bounce) * cr * 0.4, cr, bounce, t * 3);
    drawHairyCoconut(c, base.x + cr * 0.82 - sway, base.y + cr * 0.78 + Math.abs(bounce) * cr * 0.5, cr, -bounce * 1.2, t * 3 + 2.1);
    c.strokeStyle = 'rgba(96,66,40,0.7)';
    c.lineWidth = Math.max(1.2, s.R * 0.03);
    c.beginPath();
    c.moveTo(base.x - cr * 0.4, base.y + cr * 0.1);
    c.quadraticCurveTo(base.x - cr * 0.2, base.y + cr * 0.45, base.x - cr * 0.82 + sway, base.y + cr * 0.5);
    c.moveTo(base.x + cr * 0.4, base.y + cr * 0.1);
    c.quadraticCurveTo(base.x + cr * 0.2, base.y + cr * 0.55, base.x + cr * 0.82 - sway, base.y + cr * 0.72);
    c.stroke();
  }

  // ---- nozzle shock ring ----
  if (t >= T_FIRE && t < T_FIRE + 0.7) {
    const k = (t - T_FIRE) / 0.7;
    c.globalAlpha = fade * (1 - k) * 0.75;
    c.strokeStyle = '#fffdf0';
    c.lineWidth = 5 * (1 - k) + 1;
    c.beginPath();
    c.arc(tip.x, tip.y, s.R * 0.3 + k * Math.max(W, H) * 0.42, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
  }

  // ---- headline ----
  if (t > 3.75) {
    const k = clamp((t - 3.75) / 0.26, 0, 1);
    const pop = 0.6 + 0.4 * easeOutBack(k);
    const fs = Math.min(W * 0.115, H * 0.155, 130);
    const hx = s.rect.x + s.rect.w * 0.5;
    const hy = s.rect.y + s.rect.h * 0.8;
    c.save();
    c.globalAlpha = fade;
    c.translate(hx, hy);
    c.rotate(-0.03 + Math.sin(t * 3.4) * 0.012);
    c.scale(pop, pop);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${Math.round(fs)}px "Arial Black", Impact, system-ui, sans-serif`;
    c.lineJoin = 'round';
    c.lineWidth = Math.max(6, fs * 0.13);
    c.strokeStyle = 'rgba(12,16,34,0.9)';
    c.strokeText('HE LOVES IT', 0, 0);
    c.fillStyle = '#fffdf4';
    c.fillText('HE LOVES IT', 0, 0);
    c.lineWidth = Math.max(2, fs * 0.028);
    c.strokeStyle = 'rgba(255,199,126,0.9)';
    c.strokeText('HE LOVES IT', 0, 0);
    c.restore();

    // name tag
    c.save();
    c.globalAlpha = fade * k;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const ns = Math.min(W * 0.032, H * 0.042, 30);
    c.font = `800 ${Math.round(ns)}px system-ui, sans-serif`;
    c.lineWidth = Math.max(3, ns * 0.24);
    c.strokeStyle = 'rgba(12,16,34,0.85)';
    const nameLine = 'SAVORYSAILOR, ACCORDING TO THE MAYO';
    c.strokeText(nameLine, hx, hy + fs * 0.62);
    c.fillStyle = '#ffd9e8';
    c.fillText(nameLine, hx, hy + fs * 0.62);
    c.restore();
  }

  // ---- floating phrase stickers ----
  for (const ph of s.phrases) {
    if (t < ph.at) continue;
    const k = clamp((t - ph.at) / 0.22, 0, 1);
    const pop = 0.55 + 0.45 * easeOutBack(k);
    const fs = Math.min(W, H) * ph.size;
    const x = s.rect.x + s.rect.w * ph.x;
    const y = s.rect.y + s.rect.h * ph.y;
    c.save();
    c.globalAlpha = fade * Math.min(1, k * 2);
    c.translate(x, y);
    c.rotate(ph.rot + Math.sin(t * 2.2 + ph.at) * 0.03);
    c.scale(pop, pop);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${Math.round(fs)}px "Arial Black", Impact, system-ui, sans-serif`;
    c.lineJoin = 'round';
    c.lineWidth = Math.max(4, fs * 0.15);
    c.strokeStyle = 'rgba(12,16,34,0.9)';
    c.strokeText(ph.text, 0, 0);
    c.fillStyle = '#ffe9b8';
    c.fillText(ph.text, 0, 0);
    c.restore();
  }

  // ---- redemption tag ----
  if (s.login && t > 0.4) {
    const a = fade * clamp((t - 0.4) / 0.4, 0, 1) * 0.92;
    c.save();
    c.globalAlpha = a;
    c.textAlign = 'left';
    c.textBaseline = 'bottom';
    const fs = Math.min(W * 0.022, H * 0.03, 20);
    c.font = `700 ${Math.round(fs)}px system-ui, sans-serif`;
    c.lineWidth = Math.max(3, fs * 0.26);
    c.strokeStyle = 'rgba(12,16,34,0.85)';
    const tag = `a condiment delivery for @${s.login}`;
    c.strokeText(tag, W * 0.035, H * 0.97);
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.fillText(tag, W * 0.035, H * 0.97);
    c.restore();
  }

  c.restore();
}

export function dispose(ctx) {
  if (S) {
    S.particles.length = 0;
    S.splats.length = 0;
  }
  S = null;
}
