export const meta = {
  title: 'Ragdoll Butt Cannon',
  author: 'doctordiggitydank',
  prompt: 'a bit butt lowers into the screen and farts, and when it farts, twenty little human guys come flying out of it at the streamer and their bodies ragdoll on him as they land, then they get up and run away.',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const FART = 4.2;
const GUY_COUNT = 20;
const SPAWN_START = FART + 0.05;
const SPAWN_GAP = 0.085;

const SHIRTS = ['#ff6fae', '#78e3a4', '#ffd166', '#8fb8ff', '#c39bff', '#ff9d6e', '#6ee7f0'];
const SKINS = ['#f2c6a0', '#d99a6c', '#a9703f', '#f7d9b8'];
const HAIRS = ['#2b1d16', '#4a2f1c', '#7a4a24', '#1d1a2b'];

let S = null;

export function init(ctx) {
  S = {
    guys: [],
    puffs: [],
    spawned: 0,
    fired: {},
    shake: 0,
    lastThud: -1,
    finished: false,
  };
}

/* ---------- small helpers ---------- */

function rrect(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function limb(c, x, y, l1, l2, a1, a2) {
  const kx = x + Math.sin(a1) * l1;
  const ky = y + Math.cos(a1) * l1;
  const fx = kx + Math.sin(a1 + a2) * l2;
  const fy = ky + Math.cos(a1 + a2) * l2;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(kx, ky);
  c.lineTo(fx, fy);
  c.stroke();
}

function getStreamer(ctx, W, H) {
  const s = ctx.streamer;
  if (s && isFinite(s.x) && isFinite(s.y) && s.w > 0 && s.h > 0) {
    return {
      x: s.x * W,
      y: s.y * H,
      w: Math.max(W * 0.12, s.w * W),
      h: Math.max(H * 0.12, s.h * H),
    };
  }
  return { x: W * 0.35, y: H * 0.30, w: W * 0.30, h: H * 0.46 };
}

function addPuff(x, y, vx, vy, r, life, alpha) {
  if (S.puffs.length > 140) return;
  S.puffs.push({ x, y, vx, vy, r, grow: 34, life: 0, max: life, a: alpha });
}

function thud(g, t, snd, U) {
  if (t - S.lastThud > 0.075) {
    S.lastThud = t;
    snd.beep(105 + (g.phase % 1) * 95, 55);
  }
}

function doLand(g, groundY, ctx) {
  g.state = 'land';
  g.y = Math.min(g.y, groundY - g.half * 0.45);
  g.vy = 0;
  g.vx = 0;
  g.rest = (ctx.rand() < 0.5 ? -1 : 1) * (1.0 + ctx.rand() * 0.6);
  g.timer = 0.42 + ctx.rand() * 0.4;
}

function spawnGuy(ctx, mx, my, U, rect, bw) {
  const half = U * (17 + ctx.rand() * 7);
  const targetX = rect.x + rect.w * (0.06 + ctx.rand() * 0.88);
  const targetY = rect.y + rect.h * (0.22 + ctx.rand() * 0.5);
  const flight = 0.5 + ctx.rand() * 0.45;
  const x0 = mx + (ctx.rand() - 0.5) * bw * 0.26;
  const y0 = my + (ctx.rand() - 0.5) * U * 8;
  const ga = 1900 * U;
  let vx = (targetX - x0) / flight;
  let vy = (targetY - y0 - 0.5 * ga * flight * flight) / flight;
  vx = Math.max(-1400 * U, Math.min(1400 * U, vx));
  vy = Math.max(-1500 * U, Math.min(760 * U, vy));

  const pick = (arr) => arr[Math.floor(ctx.rand() * arr.length) % arr.length];

  S.guys.push({
    x: x0,
    y: y0,
    vx,
    vy,
    hit: false,
    ty: targetY,
    half,
    rot: ctx.rand() * Math.PI * 2,
    vrot: (ctx.rand() - 0.5) * 22,
    state: 'fly',
    timer: 0,
    rest: 0,
    phase: ctx.rand() * 6.283,
    color: pick(SHIRTS),
    skin: pick(SKINS),
    hair: pick(HAIRS),
    dir: 1,
    speed: 0,
    baseY: 0,
  });
}

/* ---------- drawing ---------- */

function drawButt(c, cx, cy, bw, bh, sq, t, U, fartGlow) {
  c.save();
  c.translate(cx, cy);
  c.scale(1 + sq * 0.16, 1 - sq * 0.1);

  // kicking legs above the waistband
  for (const s of [-1, 1]) {
    const kick = Math.sin(t * 5 + (s < 0 ? 0 : 1.9)) * 0.16;
    const hx = s * bw * 0.3 + Math.sin(kick) * bw * 0.06;
    const hy = -bh * 1.02;
    c.lineCap = 'round';
    c.lineWidth = bw * 0.1;
    c.strokeStyle = '#e9b48c';
    c.beginPath();
    c.moveTo(s * bw * 0.16, -bh * 0.3);
    c.quadraticCurveTo(s * bw * 0.28, -bh * 0.6, hx, hy);
    c.stroke();
    c.fillStyle = '#f7f4ff';
    c.beginPath();
    c.ellipse(hx, hy - bh * 0.04, bw * 0.085, bw * 0.055, kick * 2, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#22314d';
    c.lineWidth = Math.max(1.5, U * 2.5);
    c.stroke();
  }

  // cheeks
  for (const s of [-1, 1]) {
    c.beginPath();
    c.ellipse(s * bw * 0.21, bh * 0.02, bw * 0.29, bh * 0.44, s * 0.06, 0, Math.PI * 2);
    c.fillStyle = '#3d5a8c';
    c.fill();
    c.strokeStyle = '#22314d';
    c.lineWidth = Math.max(2, U * 3.5);
    c.stroke();

    c.beginPath();
    c.ellipse(s * bw * 0.25, -bh * 0.07, bw * 0.13, bh * 0.19, s * 0.1, 0, Math.PI * 2);
    c.globalAlpha = 0.45;
    c.fillStyle = '#5b7db8';
    c.fill();
    c.globalAlpha = 1;
  }

  // waistband
  rrect(c, -bw * 0.5, -bh * 0.52, bw, bh * 0.32, bh * 0.1);
  c.fillStyle = '#2f4a78';
  c.fill();
  c.strokeStyle = '#22314d';
  c.lineWidth = Math.max(2, U * 3.5);
  c.stroke();

  c.beginPath();
  c.moveTo(-bw * 0.45, -bh * 0.2);
  c.lineTo(bw * 0.45, -bh * 0.2);
  c.strokeStyle = '#ff7fb0';
  c.lineWidth = Math.max(2, U * 5);
  c.lineCap = 'round';
  c.stroke();

  // seam
  c.beginPath();
  c.moveTo(0, -bh * 0.16);
  c.quadraticCurveTo(bw * 0.016, bh * 0.08, 0, bh * 0.36);
  c.strokeStyle = '#22314d';
  c.lineWidth = Math.max(2, U * 4);
  c.stroke();

  // the exhaust port
  if (fartGlow > 0) {
    c.globalAlpha = Math.min(1, fartGlow);
    c.beginPath();
    c.ellipse(0, bh * 0.36, bw * 0.1, bh * 0.06, 0, 0, Math.PI * 2);
    c.fillStyle = '#1b2a1c';
    c.fill();
    c.globalAlpha = 1;
  }

  c.restore();
}

function drawGuy(c, g, t) {
  const h = g.half;
  const rag = g.state === 'fly' || g.state === 'land';
  const run = g.state === 'run';
  const spd = rag ? 17 : 12;
  const ph = g.phase;

  c.save();
  c.translate(g.x, g.y);
  c.rotate(g.rot);
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const limbW = Math.max(1.4, h * 0.16);

  // legs
  c.lineWidth = limbW;
  c.strokeStyle = '#20183a';
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    let a1, a2;
    if (rag) {
      a1 = Math.sin(t * spd + ph + i * 2.1) * 1.25;
      a2 = 0.85 + Math.sin(t * spd * 1.3 + ph + i) * 0.75;
    } else if (run) {
      const sw = Math.sin(t * 16 + ph + i * Math.PI);
      a1 = sw * 0.95;
      a2 = Math.max(0, -sw) * 1.15;
    } else {
      a1 = s * 0.09 + Math.sin(t * 2.4 + ph + i) * 0.05;
      a2 = 0.06;
    }
    limb(c, s * h * 0.11, h * 0.16, h * 0.42, h * 0.42, a1, a2);
  }

  // arms, in shirtsleeves
  c.strokeStyle = g.color;
  c.lineWidth = limbW * 0.9;
  for (let i = 0; i < 2; i++) {
    const s = i === 0 ? -1 : 1;
    let a1, a2;
    if (rag) {
      a1 = s * 1.45 + Math.sin(t * spd + ph + i * 2.6) * 1.15;
      a2 = 0.7 * Math.sin(t * spd * 1.4 + ph + i);
    } else if (run) {
      a1 = s * 0.72 + Math.sin(t * 16 + ph + (i ? Math.PI : 0)) * 0.9;
      a2 = -0.9;
    } else {
      a1 = s * 0.55 + Math.sin(t * 2.6 + ph) * 0.12;
      a2 = -0.15;
    }
    limb(c, s * h * 0.14, -h * 0.32, h * 0.36, h * 0.34, a1, a2);
  }

  // torso
  rrect(c, -h * 0.27, -h * 0.42, h * 0.54, h * 0.66, h * 0.22);
  c.fillStyle = g.color;
  c.fill();
  c.strokeStyle = '#20183a';
  c.lineWidth = Math.max(1, h * 0.06);
  c.stroke();

  // head
  c.beginPath();
  c.arc(0, -h * 0.72, h * 0.34, 0, Math.PI * 2);
  c.fillStyle = g.skin;
  c.fill();
  c.lineWidth = Math.max(1, h * 0.055);
  c.stroke();

  // hair
  c.beginPath();
  c.arc(0, -h * 0.74, h * 0.34, Math.PI * 0.95, Math.PI * 2.05);
  c.closePath();
  c.fillStyle = g.hair;
  c.fill();

  // face
  c.fillStyle = '#20183a';
  const ex = h * 0.125;
  if (rag) {
    // dazed x eyes
    c.lineWidth = Math.max(1, h * 0.05);
    c.strokeStyle = '#20183a';
    for (const s of [-1, 1]) {
      c.beginPath();
      c.moveTo(s * ex - h * 0.05, -h * 0.76);
      c.lineTo(s * ex + h * 0.05, -h * 0.66);
      c.moveTo(s * ex + h * 0.05, -h * 0.76);
      c.lineTo(s * ex - h * 0.05, -h * 0.66);
      c.stroke();
    }
  } else {
    c.beginPath();
    c.arc(-ex, -h * 0.72, h * 0.05, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(ex, -h * 0.72, h * 0.05, 0, Math.PI * 2);
    c.fill();
  }

  c.restore();
}

function caption(c, main, sub, alpha, W, H, U) {
  if (alpha <= 0.01) return;
  const fs = Math.max(12, U * 30);
  const fs2 = Math.max(10, U * 19);
  c.save();
  c.globalAlpha = Math.min(1, alpha);
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  c.font = '800 ' + Math.round(fs) + 'px "Trebuchet MS", Verdana, sans-serif';
  const w1 = c.measureText(main).width;
  c.font = '600 ' + Math.round(fs2) + 'px "Trebuchet MS", Verdana, sans-serif';
  const w2 = sub ? c.measureText(sub).width : 0;
  const pw = Math.max(w1, w2) + U * 50;
  const ph = (sub ? fs + fs2 * 1.2 : fs) * 1.5;
  const cy = H * 0.88;

  rrect(c, W / 2 - pw / 2, cy - ph / 2, pw, ph, U * 14);
  c.fillStyle = 'rgba(18, 16, 38, 0.52)';
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.18)';
  c.lineWidth = Math.max(1, U * 2);
  c.stroke();

  c.fillStyle = '#ffffff';
  c.font = '800 ' + Math.round(fs) + 'px "Trebuchet MS", Verdana, sans-serif';
  c.fillText(main, W / 2, cy - (sub ? fs2 * 0.5 : 0));
  if (sub) {
    c.fillStyle = '#ffc6e0';
    c.font = '600 ' + Math.round(fs2) + 'px "Trebuchet MS", Verdana, sans-serif';
    c.fillText(sub, W / 2, cy + fs * 0.65);
  }
  c.restore();
}

/* ---------- frame ---------- */

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!(W > 0 && H > 0)) return;

  if (typeof dt !== 'number' || !isFinite(dt) || dt <= 0) dt = 1 / 60;
  dt = Math.min(dt, 0.05);

  const U = Math.max(0.5, Math.min(W, H) / 800);
  const snd = ctx.sound || { beep() {}, noise() {} };
  const once = (k) => {
    if (S.fired[k]) return false;
    S.fired[k] = true;
    return true;
  };

  /* audio cues */
  if (t >= FART) {
    if (once('fart')) {
      snd.noise(700);
      snd.beep(46, 380);
    }
    if (t >= FART + 0.22 && once('fart2')) snd.noise(380);
    if (t >= FART + 0.95 && once('fart3')) snd.noise(240);
  }
  if (t >= 9.2 && once('leave')) snd.noise(320);
  if (t >= 11.0 && once('ding')) snd.beep(880, 120);

  const rect = getStreamer(ctx, W, H);
  const groundY = rect.y + rect.h * 0.88;

  /* butt geometry */
  const bw = 330 * U;
  const bh = 260 * U;
  const restY = H * 0.3;
  let cy;
  if (t < 2.3) {
    const p = Math.min(1, Math.max(0, t / 2.3));
    const e = 1 - Math.pow(1 - p, 3.2);
    cy = -bh * 1.3 + (restY + bh * 1.3) * e;
  } else {
    const s = t - 2.3;
    cy = restY + Math.sin(s * 9) * Math.exp(-s * 3.5) * H * 0.02;
  }
  if (t > 8.8) {
    const p = Math.min(1, (t - 8.8) / 1.5);
    cy -= p * p * (H * 0.8);
  }

  const wobble = Math.sin(t * 1.3) * bw * 0.014;
  const mouthX = W * 0.5 + wobble;
  const mouthY = cy + bh * 0.36;

  let sq = 0;
  const fs = t - FART;
  if (fs >= 0 && fs < 1.6) sq = Math.exp(-fs * 2.6) * Math.min(1, fs * 12);

  /* launch */
  while (S.spawned < GUY_COUNT && t >= SPAWN_START + S.spawned * SPAWN_GAP) {
    spawnGuy(ctx, mouthX, mouthY, U, rect, bw);
    for (let i = 0; i < 2; i++) {
      addPuff(
        mouthX,
        mouthY,
        (ctx.rand() - 0.5) * 240 * U,
        (ctx.rand() - 0.4) * 240 * U,
        10 * U,
        0.45 + ctx.rand() * 0.3,
        0.4
      );
    }
    S.spawned++;
  }

  if (t >= FART && once('burst')) {
    for (let i = 0; i < 18; i++) {
      const a = ctx.rand() * Math.PI * 2;
      const sp = (60 + ctx.rand() * 260) * U;
      addPuff(
        mouthX,
        mouthY,
        Math.cos(a) * sp,
        Math.sin(a) * sp - 30 * U,
        24 + ctx.rand() * 44,
        0.9 + ctx.rand() * 0.7,
        0.42
      );
    }
    S.shake = 1;
  }

  /* puffs */
  for (const p of S.puffs) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 32 * U * dt;
    p.vx *= 1 - Math.min(1, dt * 1.4);
    p.r += p.grow * dt;
  }
  for (let i = S.puffs.length - 1; i >= 0; i--) {
    if (S.puffs[i].life > S.puffs[i].max) S.puffs.splice(i, 1);
  }

  /* guy physics */
  const gAcc = 1900 * U;
  for (const g of S.guys) {
    if (g.state === 'fly') {
      g.vy += gAcc * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      g.rot += g.vrot * dt;

      if (!g.hit && g.y >= g.ty) {
        g.hit = true;
        g.y = g.ty;
        if (g.ty < groundY - g.half * 0.8) {
          g.vy = -Math.abs(g.vy) * 0.4;
          g.vx += (ctx.rand() - 0.5) * 220 * U;
          g.vrot += (ctx.rand() - 0.5) * 18;
          for (let i = 0; i < 3; i++) {
            addPuff(
              g.x,
              g.y,
              (ctx.rand() - 0.5) * 160 * U,
              (ctx.rand() - 0.5) * 160 * U + 30 * U,
              9 * U,
              0.35,
              0.32
            );
          }
          thud(g, t, snd, U);
        } else {
          doLand(g, groundY, ctx);
          thud(g, t, snd, U);
        }
      }
      if (g.state === 'fly' && g.y >= groundY - g.half) {
        doLand(g, groundY, ctx);
        thud(g, t, snd, U);
      }
    } else if (g.state === 'land') {
      g.timer -= dt;
      g.rot += (g.rest - g.rot) * Math.min(1, dt * 9);
      g.y += (groundY - g.half * 0.32 - g.y) * Math.min(1, dt * 8);
      if (g.timer <= 0) {
        g.state = 'stand';
        g.timer = 0.22 + ctx.rand() * 0.22;
      }
    } else if (g.state === 'stand') {
      g.timer -= dt;
      g.rot += (0 - g.rot) * Math.min(1, dt * 11);
      if (g.timer <= 0) {
        g.state = 'run';
        g.dir = ctx.rand() < 0.5 ? -1 : 1;
        g.speed = (200 + ctx.rand() * 170) * U;
        g.baseY = groundY - g.half * 0.5;
      }
    } else if (g.state === 'run') {
      g.x += g.dir * g.speed * dt;
      g.y = g.baseY - Math.abs(Math.sin(t * 13 + g.phase)) * g.half * 0.16;
      g.rot = g.dir * 0.07 + Math.sin(t * 13 + g.phase) * 0.04;
      if (g.x < -W * 0.12 || g.x > W * 1.12) g.state = 'gone';
    }
  }

  /* draw */
  S.shake *= Math.exp(-dt * 3);
  const ox = S.shake > 0.01 ? (ctx.rand() - 0.5) * S.shake * 26 * U : 0;
  const oy = S.shake > 0.01 ? (ctx.rand() - 0.5) * S.shake * 26 * U : 0;

  c.save();
  c.translate(ox, oy);

  // gas cloud
  for (const p of S.puffs) {
    const k = Math.max(0, 1 - p.life / p.max);
    c.globalAlpha = k * p.a;
    c.fillStyle = '#a8e05a';
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = k * p.a * 0.5;
    c.fillStyle = '#e2f79a';
    c.beginPath();
    c.arc(p.x - p.r * 0.24, p.y - p.r * 0.24, p.r * 0.62, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // shockwave
  if (fs >= 0 && fs < 0.8) {
    const p = fs / 0.8;
    c.globalAlpha = (1 - p) * 0.7;
    c.strokeStyle = '#d9ff8a';
    c.lineWidth = Math.max(2, U * 8 * (1 - p));
    c.beginPath();
    c.arc(mouthX, mouthY, (40 + p * 400) * U, 0, Math.PI * 2);
    c.stroke();
    c.globalAlpha = 1;
  }

  drawButt(c, mouthX, cy, bw, bh, sq, t, U, fs > -0.1 && fs < 1.2 ? 1 - fs / 1.2 : 0);

  // ground shadows
  c.fillStyle = 'rgba(10,8,24,0.26)';
  for (const g of S.guys) {
    if (g.state === 'fly' || g.state === 'gone') continue;
    const sw = g.half * 0.78;
    c.beginPath();
    c.ellipse(g.x, groundY + U * 2, sw, sw * 0.28, 0, 0, Math.PI * 2);
    c.fill();
  }

  const sorted = S.guys.slice().sort((a, b) => a.y - b.y);
  for (const g of sorted) {
    if (g.state === 'gone') continue;
    drawGuy(c, g, t);
  }

  c.restore();

  /* scoreboard */
  if (S.spawned > 0) {
    c.save();
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.font = '700 ' + Math.round(Math.max(10, U * 18)) + 'px ui-monospace, Consolas, monospace';
    const txt = 'TINY MEN DEPLOYED ' + String(S.spawned).padStart(2, '0') + ' / ' + GUY_COUNT;
    const tw = c.measureText(txt).width;
    rrect(c, W * 0.03, H * 0.045, tw + U * 30, U * 34, U * 8);
    c.fillStyle = 'rgba(18,16,38,0.55)';
    c.fill();
    c.fillStyle = '#ffd166';
    c.fillText(txt, W * 0.03 + U * 15, H * 0.045 + U * 9);
    c.restore();
  }

  /* captions */
  const caps = [
    { a: 0.3, b: 3.9, m: 'A rear descends upon the broadcast.', s: 'SavorySailor, brace yourself.' },
    { a: FART, b: FART + 2.4, m: 'DEPLOYING TWENTY TINY MEN.', s: 'Muzzle velocity: unwise.' },
    { a: FART + 2.7, b: FART + 4.7, m: 'SavorySailor is now a landing zone.', s: 'Please do not move.' },
    { a: 9.4, b: 11.9, m: 'They are leaving.', s: 'Nobody will speak of this.' },
  ];
  for (const cap of caps) {
    if (t < cap.a - 0.3 || t > cap.b + 0.3) continue;
    let a = 1;
    if (t < cap.a) a = (t - (cap.a - 0.3)) / 0.3;
    else if (t > cap.b) a = 1 - (t - cap.b) / 0.3;
    a = Math.max(0, Math.min(1, a));
    caption(c, cap.m, cap.s, a, W, H, U);
  }

  /* the end */
  const allGone = S.spawned >= GUY_COUNT && S.guys.every((g) => g.state === 'gone');
  if (!S.finished && (t > 11.9 || (allGone && t > 9.6))) {
    S.finished = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
