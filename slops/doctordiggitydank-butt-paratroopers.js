export const meta = {
  title: 'Butt Paratroopers',
  author: 'doctordiggitydank',
  prompt: 'a big butt lowers into the screen and farts, and when it farts, twenty little human guys come flying out of it at the streamer',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

/* ── tiny helpers ─────────────────────────────────────────────── */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, p) { return a + (b - a) * p; }
function easeOutCubic(p) { return 1 - Math.pow(1 - p, 3); }
function easeInCubic(p) { return p * p * p; }
function easeOutBack(p) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}
function rr(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

const SHIRTS = ['#ff6b9d', '#5ec8f0', '#ffd166', '#a8ff9e', '#c9a2ff', '#ff9f68', '#7bf0d0'];
const SKINS = ['#f4c9a3', '#e0ac82', '#c68b62', '#8d5a3b', '#f7dcc2'];
const HAIRS = ['#2b1a20', '#5a3a24', '#c99a4a', '#141018'];

/* ── init ─────────────────────────────────────────────────────── */

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  const sc = Math.min(W / 1280, H / 720) || 1;
  const R = () => ctx.rand();

  const bw = Math.min(H * 0.58, W * 0.55);
  const bh = bw * 0.82;

  const sR = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : { x: W * 0.32, y: H * 0.44, w: W * 0.36, h: H * 0.36 };

  const st = {
    W, H, sc, R, sR,
    bw, bh,
    parkY: H * 0.105,
    startY: -bh * 0.58,
    descendT: 1.5,
    blastT: 2.5,
    liftT: 5.2,
    liftDur: 1.1,
    endAt: 7.4,
    g: 1800 * sc,
    butt: { x: W * 0.5, y: -bh, squeeze: 0, shake: 0 },
    dudes: [],
    puffs: [],
    rings: [],
    puffAcc: 0,
    landCount: 0,
    done: false,
    cueIdx: 0,
    cues: [],
  };

  /* twenty little human guys, already boarding */
  for (let i = 0; i < 20; i++) {
    const u = (1.5 + R() * 0.65) * sc;
    st.dudes.push({
      idx: i,
      u,
      shirt: SHIRTS[Math.floor(R() * SHIRTS.length)],
      skin: SKINS[Math.floor(R() * SKINS.length)],
      hair: HAIRS[Math.floor(R() * HAIRS.length)],
      x: W * 0.5, y: -H,
      vx: 0, vy: 0,
      ang: 0, angVel: 0,
      flailA: (R() - 0.5) * 2.4,
      flailB: (R() - 0.5) * 2.4,
      armA: (R() - 0.5) * 2.6,
      armB: (R() - 0.5) * 2.6,
      wig: R() * 10,
      launchAt: 2.5 + i * 0.017 + R() * 0.04,
      state: 'idle',
      bounces: 0,
      restT: 0,
      restDur: 0.5 + R() * 0.5,
      riseP: 0,
      runPhase: R() * 7,
      runVx: 0,
      standY: 0,
      surfaceY: 0,
      baseY: 0,
      restAng: 0,
      fromY: 0,
      fromAng: 0,
    });
  }

  st.cues = [
    { t: 0.02, fn: (x) => x.sound.noise(160) },
    { t: 0.06, fn: (x) => x.sound.beep(105, 170) },
    { t: 1.44, fn: (x) => x.sound.beep(84, 150) },
    { t: 1.62, fn: (x) => x.sound.beep(70, 130) },
    { t: 1.98, fn: (x) => x.sound.beep(61, 120) },
    { t: 2.27, fn: (x) => x.sound.beep(54, 130) },
    { t: 2.5, fn: (x) => { x.sound.noise(360); x.sound.beep(43, 460); } },
    { t: 2.58, fn: (x) => { x.sound.noise(220); x.sound.beep(51, 300); } },
    { t: 2.68, fn: (x) => { x.sound.noise(150); x.sound.beep(38, 340); } },
    { t: 2.9, fn: (x) => x.sound.noise(110) },
    { t: 4.7, fn: (x) => x.sound.beep(660, 60) },
    { t: 4.86, fn: (x) => x.sound.beep(880, 60) },
    { t: 5.05, fn: (x) => x.sound.beep(740, 60) },
    { t: 5.2, fn: (x) => x.sound.noise(180) },
    { t: 5.22, fn: (x) => x.sound.beep(120, 320) },
  ];

  ctx._buttSt = st;
}

/* ── butt motion ──────────────────────────────────────────────── */

function updateButt(st, t) {
  let y;
  if (t < st.descendT) {
    y = lerp(st.startY, st.parkY, easeOutCubic(clamp(t / st.descendT, 0, 1)));
  } else if (t < st.liftT) {
    const k = t - st.descendT;
    y = st.parkY + Math.exp(-k * 3.2) * Math.sin(k * 16) * st.bh * 0.035;
  } else {
    y = lerp(st.parkY, st.startY, easeInCubic(clamp((t - st.liftT) / st.liftDur, 0, 1)));
  }
  st.butt.y = y;

  let squeeze = 0, shake = 0;
  if (t > 1.5 && t < 2.5) {
    const p = t - 1.5;
    squeeze = 0.30 + 0.30 * Math.sin(p * 8.5);
    shake = 0.25 + p * 0.55;
  } else if (t >= 2.5 && t < 2.72) {
    squeeze = 1;
    shake = 1.9;
  } else if (t >= 2.72 && t < 3.9) {
    const q = 1 - (t - 2.72) / 1.18;
    squeeze = 0.35 * q * Math.abs(Math.sin((t - 2.72) * 9));
    shake = 0.65 * q;
  }
  st.butt.squeeze = squeeze;
  st.butt.shake = shake;
}

/* ── launching the guys ───────────────────────────────────────── */

function fartPoint(st) {
  return {
    x: st.butt.x,
    y: st.butt.y + st.bh * 0.37,
  };
}

function launchDude(ctx, st, d) {
  const sR = st.sR;
  const o = fartPoint(st);
  const ox = o.x + (ctx.rand() - 0.5) * st.bw * 0.22;
  const oy = o.y + (ctx.rand() - 0.5) * st.bh * 0.07;
  const tx = sR.x + sR.w * (0.10 + ctx.rand() * 0.80);
  const ty = sR.y + sR.h * (0.06 + ctx.rand() * 0.55);
  const T = 0.42 + ctx.rand() * 0.30;

  d.x = ox;
  d.y = oy;
  d.vx = (tx - ox) / T;
  d.vy = (ty - oy) / T - 0.5 * st.g * T;
  d.angVel = (ctx.rand() - 0.5) * 17;
  d.ang = 0;
  d.bounces = 0;
  d.state = 'fly';

  if (d.idx % 5 === 0) ctx.sound.beep(180 + ctx.rand() * 420, 24);
}

/* ── landing ──────────────────────────────────────────────────── */

function landDude(ctx, st, d, surfaceY) {
  d.surfaceY = surfaceY;
  d.baseY = surfaceY - 2.2 * d.u;
  d.standY = surfaceY - 8.6 * d.u;
  d.state = 'ragdoll';
  d.restT = 0;
  d.restAng = (ctx.rand() - 0.5) * 1.0;
  d.ang = d.restAng;
  d.vy = 0;
  d.vx *= 0.3;

  st.landCount++;
  ctx.sound.noise(45 + ctx.rand() * 30);
  if (st.landCount % 4 === 0) ctx.sound.beep(150 + ctx.rand() * 120, 50);

  /* a little impact dust */
  for (let i = 0; i < 4; i++) {
    const a = -Math.PI / 2 + (ctx.rand() - 0.5) * 2.6;
    const sp = (40 + ctx.rand() * 90) * st.sc;
    st.puffs.push({
      x: d.x + (ctx.rand() - 0.5) * d.u * 4,
      y: surfaceY,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.5,
      r: d.u * (1.4 + ctx.rand() * 1.6),
      grow: 18 * st.sc,
      life: 0.5 + ctx.rand() * 0.4,
      maxLife: 0.9,
      rgb: '235,225,240',
      alpha: 0.22,
    });
  }
}

/* ── dude simulation ──────────────────────────────────────────── */

function updateDudes(ctx, st, t, dt) {
  const g = st.g;
  const sR = st.sR;
  const floorY = st.H - 12 * st.sc;

  for (const d of st.dudes) {
    if (d.state === 'idle') {
      if (t >= d.launchAt) launchDude(ctx, st, d);
      continue;
    }
    if (d.state === 'gone') continue;

    d.wig += dt * (d.state === 'ragdoll' ? 9 : 6);

    if (d.state === 'fly') {
      d.vy += g * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.ang += d.angVel * dt;

      if (d.vy > 0 && d.y >= sR.y && d.x > sR.x - 6 && d.x < sR.x + sR.w + 6) {
        if (d.bounces < 1 && d.vy > 340 * st.sc) {
          d.bounces++;
          d.y = sR.y - d.u * 1.2;
          d.vy *= -0.34;
          d.vx *= 0.7;
          d.angVel *= 0.7;
          ctx.sound.noise(40);
        } else {
          d.y = sR.y;
          landDude(ctx, st, d, sR.y);
        }
      } else if (d.y > floorY) {
        d.y = floorY;
        landDude(ctx, st, d, floorY);
      }

      if (d.x < -120 || d.x > st.W + 120) d.state = 'gone';

    } else if (d.state === 'ragdoll') {
      d.restT += dt;
      d.ang = d.restAng + Math.sin(d.wig * 1.7) * 0.11;
      d.y = d.baseY + Math.sin(d.wig * 2.3) * d.u * 0.35;
      d.x += d.vx * dt;
      if (d.restT > d.restDur) {
        d.state = 'rise';
        d.riseP = 0;
        d.fromY = d.y;
        d.fromAng = d.ang;
      }

    } else if (d.state === 'rise') {
      d.riseP = clamp(d.riseP + dt / 0.34, 0, 1);
      const e = easeOutCubic(d.riseP);
      d.y = lerp(d.fromY, d.standY, e);
      d.ang = lerp(d.fromAng, 0, e);
      if (d.riseP >= 1) {
        d.state = 'run';
        const dir = d.x < st.W * 0.5 ? 1 : -1;
        d.runVx = dir * (300 + ctx.rand() * 140) * st.sc;
        d.ang = 0;
      }

    } else if (d.state === 'run') {
      d.x += d.runVx * dt;
      d.runPhase += dt * 15;
      d.y = d.standY - Math.abs(Math.sin(d.runPhase)) * 1.2 * d.u;
      d.ang = 0;
      if (d.x < sR.x - 26 || d.x > sR.x + sR.w + 26) {
        d.state = 'fall';
        d.vy = 30;
      }

    } else if (d.state === 'fall') {
      d.vy += g * dt;
      d.x += d.runVx * dt;
      d.y += d.vy * dt;
      d.ang += 5 * dt;
      if (d.y > st.H + 90) d.state = 'gone';
    }
  }
}

/* ── gas ─────────────────────────────────────────────────────── */

function updatePuffs(st, t, dt) {
  if (t >= st.blastT && t < st.blastT + 0.5) {
    st.puffAcc += dt * 110;
    while (st.puffAcc > 1) {
      st.puffAcc -= 1;
      const o = fartPoint(st);
      const a = Math.PI * (0.18 + st.R() * 0.64);
      const sp = (90 + st.R() * 220) * st.sc;
      const green = st.R() < 0.72;
      st.puffs.push({
        x: o.x + (st.R() - 0.5) * st.bw * 0.12,
        y: o.y + (st.R() - 0.5) * st.bh * 0.05,
        vx: Math.cos(a) * sp * 0.7,
        vy: Math.sin(a) * sp,
        r: (10 + st.R() * 26) * st.sc,
        grow: (50 + st.R() * 70) * st.sc,
        life: 1.0 + st.R() * 0.9,
        maxLife: 1.9,
        rgb: green ? '200,238,128' : '232,244,214',
        alpha: 0.30,
      });
    }
  }

  for (const p of st.puffs) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= Math.pow(0.12, dt);
    p.vy = p.vy * Math.pow(0.25, dt) + 22 * st.sc * dt;
    p.r += p.grow * dt;
    p.life -= dt;
  }
  if (st.puffs.length > 260) st.puffs.splice(0, st.puffs.length - 260);
  st.puffs = st.puffs.filter((p) => p.life > 0);

  for (const r of st.rings) {
    r.r += dt * 620 * st.sc;
    r.life -= dt;
  }
  st.rings = st.rings.filter((r) => r.life > 0);
}

/* ── drawing ─────────────────────────────────────────────────── */

function drawButt(c, st, t) {
  const b = st.butt, bw = st.bw, bh = st.bh;
  const jx = Math.sin(t * 61) * b.shake * 7 * st.sc;
  const jy = Math.cos(t * 47) * b.shake * 5 * st.sc;

  c.save();
  c.translate(b.x + jx, b.y + jy);
  c.rotate(Math.sin(t * 33) * b.shake * 0.022);
  c.scale(1 - b.squeeze * 0.055, 1 + b.squeeze * 0.045);

  /* legs / thighs rising out of frame */
  c.fillStyle = '#2a1c33';
  rr(c, -bw * 0.35, -bh * 1.95, bw * 0.28, bh * 1.76, bw * 0.10); c.fill();
  rr(c, bw * 0.07, -bh * 1.95, bw * 0.28, bh * 1.76, bw * 0.10); c.fill();

  /* motion streaks while descending */
  if (t < 1.15) {
    const a = clamp(1 - t / 1.15, 0, 1) * 0.35;
    c.strokeStyle = `rgba(255,205,235,${a})`;
    c.lineWidth = 3 * st.sc;
    for (let i = 0; i < 5; i++) {
      const x = (-0.42 + i * 0.21) * bw;
      const len = bh * (0.35 + (i % 3) * 0.18);
      c.beginPath();
      c.moveTo(x, -bh * 0.55);
      c.lineTo(x, -bh * 0.55 - len);
      c.stroke();
    }
  }

  /* the silhouette, gently glowing pink so it reads over anything */
  c.save();
  c.shadowColor = 'rgba(255,110,180,0.55)';
  c.shadowBlur = 22 * st.sc;
  const g = c.createLinearGradient(0, -bh * 0.6, 0, bh * 0.5);
  g.addColorStop(0, '#523a5c');
  g.addColorStop(0.5, '#3a2646');
  g.addColorStop(1, '#241730');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(0, -bh * 0.24, bw * 0.44, bh * 0.30, 0, 0, Math.PI * 2);
  c.ellipse(-bw * 0.20, bh * 0.02, bw * 0.27, bh * 0.42, -0.06, 0, Math.PI * 2);
  c.ellipse(bw * 0.20, bh * 0.02, bw * 0.27, bh * 0.42, 0.06, 0, Math.PI * 2);
  c.fill();
  c.restore();

  /* waistband */
  c.fillStyle = 'rgba(255,107,157,0.78)';
  rr(c, -bw * 0.34, -bh * 0.40, bw * 0.68, bh * 0.085, bh * 0.042); c.fill();
  c.fillStyle = 'rgba(255,225,242,0.35)';
  rr(c, -bw * 0.34, -bh * 0.395, bw * 0.68, bh * 0.017, bh * 0.009); c.fill();

  /* center seam */
  c.strokeStyle = 'rgba(10,4,16,0.5)';
  c.lineWidth = bw * 0.014;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -bh * 0.18);
  c.quadraticCurveTo(-bw * 0.035, bh * 0.05, 0, bh * 0.36);
  c.stroke();

  /* fabric highlights */
  c.strokeStyle = 'rgba(255,235,250,0.13)';
  c.lineWidth = bw * 0.025;
  c.beginPath();
  c.ellipse(-bw * 0.22, -bh * 0.02, bw * 0.13, bh * 0.20, 0.25, Math.PI * 0.9, Math.PI * 1.65);
  c.stroke();
  c.beginPath();
  c.ellipse(bw * 0.22, -bh * 0.02, bw * 0.13, bh * 0.20, -0.25, Math.PI * 1.35, Math.PI * 2.1);
  c.stroke();

  c.restore();
}

function drawPuffs(c, st) {
  for (const p of st.puffs) {
    const a = clamp(p.life / p.maxLife, 0, 1) * p.alpha;
    if (a <= 0 || p.r <= 0) continue;
    const grd = c.createRadialGradient(p.x, p.y, p.r * 0.1, p.x, p.y, p.r);
    grd.addColorStop(0, `rgba(${p.rgb},${a})`);
    grd.addColorStop(0.65, `rgba(${p.rgb},${a * 0.5})`);
    grd.addColorStop(1, `rgba(${p.rgb},0)`);
    c.fillStyle = grd;
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fill();
  }
}

function drawRings(c, st) {
  const o = fartPoint(st);
  for (const r of st.rings) {
    const a = clamp(r.life / r.maxLife, 0, 1) * 0.5;
    c.save();
    c.strokeStyle = `rgba(210,245,150,${a})`;
    c.lineWidth = 3 * st.sc;
    c.beginPath();
    c.ellipse(o.x, o.y + r.r * 0.28, r.r, r.r * 0.4, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }
}

function drawDude(c, d) {
  const u = d.u;
  const run = d.state === 'run';
  const rise = d.state === 'rise';
  const k = rise ? 1 - d.riseP : 1;
  const swing = run ? Math.sin(d.runPhase) : 0;

  const legA = run ? swing * 0.95 : (d.flailA + Math.sin(d.wig * 3.1) * 0.15) * k;
  const legB = run ? -swing * 0.95 : (d.flailB + Math.cos(d.wig * 2.7) * 0.15) * k;
  const armA = run ? -swing * 0.9 : (d.armA + Math.sin(d.wig * 2.3) * 0.2) * k;
  const armB = run ? swing * 0.9 : (d.armB + Math.cos(d.wig * 2.9) * 0.2) * k;

  c.save();
  c.translate(d.x, d.y);
  c.rotate(d.ang);
  c.lineCap = 'round';

  /* arms behind torso */
  c.strokeStyle = d.skin;
  c.lineWidth = 1.7 * u;
  const shoulders = [-2.4 * u, 2.4 * u];
  const armAngles = [armA, armB];
  for (let i = 0; i < 2; i++) {
    const sx = shoulders[i];
    const a = armAngles[i];
    const len = 5.2 * u;
    c.beginPath();
    c.moveTo(sx, -4.8 * u);
    c.lineTo(sx + Math.sin(a) * len, -4.8 * u + Math.cos(a) * len);
    c.stroke();
  }

  /* legs */
  c.lineWidth = 2.0 * u;
  const hips = [-1.6 * u, 1.6 * u];
  const legAngles = [legA, legB];
  for (let i = 0; i < 2; i++) {
    const hx = hips[i];
    const a = legAngles[i];
    const len = 5.6 * u;
    c.beginPath();
    c.moveTo(hx, 1.4 * u);
    c.lineTo(hx + Math.sin(a) * len, 1.4 * u + Math.cos(a) * len);
    c.stroke();
  }

  /* torso */
  c.fillStyle = d.shirt;
  rr(c, -2.8 * u, -6.4 * u, 5.6 * u, 8.2 * u, 2.0 * u);
  c.fill();

  /* collar */
  c.fillStyle = 'rgba(255,255,255,0.25)';
  rr(c, -1.5 * u, -6.3 * u, 3.0 * u, 1.0 * u, 0.5 * u);
  c.fill();

  /* head */
  c.fillStyle = d.skin;
  c.beginPath();
  c.arc(0, -8.4 * u, 2.7 * u, 0, Math.PI * 2);
  c.fill();

  /* hair */
  c.fillStyle = d.hair;
  c.beginPath();
  c.arc(0, -8.9 * u, 2.5 * u, Math.PI * 1.02, Math.PI * 1.98);
  c.fill();

  /* eyes */
  c.fillStyle = 'rgba(18,8,24,0.85)';
  c.beginPath(); c.arc(-0.9 * u, -8.3 * u, 0.42 * u, 0, 6.3); c.fill();
  c.beginPath(); c.arc(0.9 * u, -8.3 * u, 0.42 * u, 0, 6.3); c.fill();

  /* mouth */
  c.strokeStyle = 'rgba(60,25,35,0.7)';
  c.lineWidth = 0.4 * u;
  c.beginPath();
  c.arc(0, -7.5 * u, 0.75 * u, 0.35, Math.PI - 0.35);
  c.stroke();

  c.restore();
}

function drawDudes(c, st) {
  for (const d of st.dudes) {
    if (d.state === 'idle' || d.state === 'gone') continue;

    /* soft contact shadow when standing on the streamer */
    if (d.state === 'run' || d.state === 'rise') {
      c.save();
      c.fillStyle = 'rgba(8,2,14,0.22)';
      c.beginPath();
      c.ellipse(d.x, d.standY + 8.4 * d.u, 4.2 * d.u, 1.3 * d.u, 0, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }

    drawDude(c, d);
  }
}

function drawPixelWord(c, st, t) {
  if (t < 2.5 || t > 3.5) return;
  const p = clamp((t - 2.5) / 0.6, 0, 1);
  const a = 1 - clamp((t - 2.95) / 0.5, 0, 1);
  if (a <= 0) return;

  const o = fartPoint(st);
  c.save();
  c.globalAlpha = a;
  c.translate(o.x, o.y + st.bh * 0.10);
  c.rotate(-0.09);
  const s = 0.72 + easeOutBack(clamp((t - 2.5) / 0.24, 0, 1)) * 0.4;
  c.scale(s, s);
  c.font = `900 ${Math.round(st.H * 0.072)}px "Trebuchet MS", system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = st.H * 0.016;
  c.strokeStyle = 'rgba(10,4,16,0.85)';
  c.strokeText('PFFFT!', 0, 0);
  c.fillStyle = '#d8ff7a';
  c.fillText('PFFFT!', 0, 0);
  c.restore();
  void p;
}

function drawCaptions(c, st, t) {
  const caps = [
    { t0: 2.24, t1: 4.05, text: 'DUCK, SAVORYSAILOR' },
    { t0: 4.25, t1: 6.05, text: 'TWENTY TINY PASSENGERS' },
    { t0: 6.2, t1: 7.35, text: 'GO FORTH, LITTLE GUYS' },
  ];
  const y = st.H * 0.86;
  const size = Math.round(Math.min(st.H * 0.05, st.W * 0.032));

  for (const cap of caps) {
    if (t < cap.t0 || t > cap.t1) continue;
    const a = Math.min(1, (t - cap.t0) / 0.18) * Math.min(1, (cap.t1 - t) / 0.22);
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.font = `800 ${size}px "Trebuchet MS", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = size * 0.30;
    c.strokeStyle = 'rgba(10,4,16,0.82)';
    c.strokeText(cap.text, st.W * 0.5, y);
    c.fillStyle = '#fff4fb';
    c.fillText(cap.text, st.W * 0.5, y);
    c.restore();
  }
}

/* ── frame ────────────────────────────────────────────────────── */

export function frame(ctx, t, dt) {
  const st = ctx._buttSt;
  if (!st) return;

  const c = ctx.canvas;
  const W = st.W, H = st.H;
  c.clearRect(0, 0, W, H);

  dt = Math.min(dt || 0.016, 0.05);

  /* scheduled sounds */
  while (st.cueIdx < st.cues.length && t >= st.cues[st.cueIdx].t) {
    st.cues[st.cueIdx].fn(ctx);
    st.cueIdx++;
  }

  updateButt(st, t);
  updateDudes(ctx, st, t, dt);
  updatePuffs(st, t, dt);

  drawPuffs(c, st);
  drawRings(c, st);
  drawButt(c, st, t);
  drawDudes(c, st);
  drawPixelWord(c, st, t);
  drawCaptions(c, st, t);

  if (!st.done && t >= st.endAt) {
    st.done = true;
    ctx.done();
  }
}

export function dispose() {}
