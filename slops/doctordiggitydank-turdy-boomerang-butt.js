const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t;

export const meta = {
  title: 'Turdy Boomerang Butt',
  author: 'doctordiggitydank',
  prompt: 'A medium-sized butt leans into the screen. This butt is attached to a whole body, it is not just a solo butt. It fires in 40 fresh turds',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const CAPS = [
  { a: 0.45, b: 3.05, txt: 'SAVORYSAILOR, LOOK AWAY', sub: 'THE RUMP IS NOT YOURS', color: '#ffffff' },
  { a: 2.55, b: 5.45, txt: 'ROUND ONE: FORTY FRESH TURDS', sub: 'FIRED WITH INTENT', color: '#ffd9ec' },
  { a: 5.65, b: 7.85, txt: 'SUCK MODE: ENGAGED', sub: 'EVERY TURD COMES HOME', color: '#ffffff' },
  { a: 8.30, b: 11.30, txt: 'ROUND TWO: STILL WARM', sub: 'SAVORYSAILOR, STILL LIVE', color: '#ffd9ec' },
  { a: 11.55, b: 13.40, txt: 'REVERSE THE PIPELINE', sub: 'NO TURD LEFT BEHIND', color: '#ffffff' },
  { a: 14.00, b: 16.80, txt: 'ROUND THREE: THE WHOLE HARVEST', sub: 'THIS IS THE FINAL VOLLEY', color: '#ffd9ec' },
  { a: 17.00, b: 18.95, txt: 'INHALE, SAVORYSAILOR, INHALE', sub: 'THE OVERLAY BELIEVES IN YOU', color: '#ffffff' },
  { a: 19.10, b: 21.45, txt: 'ONE HUNDRED TWENTY TURDS, ALL HOME', sub: 'THE STREAM MAY RESUME', color: '#ffffff' },
];

let S = null;

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const unit = Math.min(W, H);
  const cam = ctx.streamer;
  const camX = cam ? cam.x + cam.w * 0.5 : 0.5;
  const camY = cam ? cam.y + cam.h * 0.5 : 0.35;
  const dir = camX < 0.5 ? -1 : 1;
  const R = unit * 0.098;

  S = {
    W,
    H,
    unit,
    R,
    dir,
    bx: (dir === 1 ? 0.245 : 0.755) * W,
    by: 0.62 * H,
    slide0: -dir * W * 0.42,
    slide: 0,
    cx: 0,
    cy: 0,
    capY: camY > 0.5 ? 0.12 : 0.88,
    rnd: ctx.rand,
    turds: [],
    spawned: [0, 0, 0],
    suckedFlag: [false, false, false],
    cycles: [
      { shootAt: 2.30, shootDur: 1.45, suckAt: 5.60, suckEnd: 7.80 },
      { shootAt: 8.30, shootDur: 1.30, suckAt: 11.40, suckEnd: 13.40 },
      { shootAt: 14.00, shootDur: 1.15, suckAt: 16.90, suckEnd: 18.90 },
    ],
    endTime: 22.10,
    recoil: 0,
    flash: 0,
    gulp: 0,
    nextBeep: 0,
    nextGulpSfx: 0,
    popped: 0,
  };
}

function sfxBeep(ctx, f, ms) {
  try { ctx.sound.beep(f, ms); } catch (e) { /* silence is golden */ }
}

function sfxNoise(ctx, ms) {
  try { ctx.sound.noise(ms); } catch (e) { /* likewise */ }
}

function spawnTurd(ctx, ci, idx) {
  const rnd = S.rnd;
  const unit = S.unit;
  const dir = S.dir;
  const r = unit * (0.024 + rnd() * 0.015);
  const speed = unit * (1.10 + rnd() * 0.85);
  const x = S.cx + dir * S.R * 0.35 + (rnd() - 0.5) * S.R * 0.25;
  const y = S.cy + (rnd() - 0.5) * S.R * 0.55;
  S.turds.push({
    x,
    y,
    vx: dir * speed * (0.78 + rnd() * 0.35),
    vy: (rnd() - 0.5) * unit * 1.15 - unit * 0.12,
    r,
    rot: rnd() * TAU,
    spin: (rnd() - 0.5) * 9,
    cyc: ci,
    suck: false,
    suckAge: 0,
    dead: false,
    seed: rnd(),
  });

  S.flash = 1;
  S.recoil = Math.max(S.recoil, 0.65);
  if (idx === 0) {
    sfxNoise(ctx, 180);
    sfxBeep(ctx, 90, 90);
  } else if (idx % 6 === 0) {
    sfxNoise(ctx, 55);
  }
}

function stepPhysics(dt) {
  const unit = S.unit;
  const W = S.W;
  const H = S.H;
  const g = unit * 2.05;
  const steps = clamp(Math.ceil(dt / 0.014), 1, 5);
  const h = dt / steps;

  for (let s = 0; s < steps; s++) {
    const arr = S.turds;
    for (let i = 0; i < arr.length; i++) {
      const m = arr[i];
      if (m.dead) continue;
      if (m.suck) {
        const dx = S.cx - m.x;
        const dy = S.cy - m.y;
        const d = Math.hypot(dx, dy) || 1;
        const ramp = clamp(0.45 + m.suckAge * 1.6, 0.45, 1.8);
        const pull = unit * (2.6 + (d / unit) * 5.2) * ramp;
        m.vx += (dx / d) * pull * h;
        m.vy += (dy / d) * pull * h;
        m.vx += (-dy / d) * pull * 0.34 * h;
        m.vy += (dx / d) * pull * 0.34 * h;
        m.vx *= 0.986;
        m.vy *= 0.986;
        m.x += m.vx * h;
        m.y += m.vy * h;
        m.rot += h * (7 + m.spin);
        if (d < S.R * 0.45) m.dead = true;
      } else {
        m.vy += g * h;
        m.x += m.vx * h;
        m.y += m.vy * h;
        const r = m.r;
        if (m.x < r) { m.x = r; m.vx = Math.abs(m.vx) * 0.72; }
        if (m.x > W - r) { m.x = W - r; m.vx = -Math.abs(m.vx) * 0.72; }
        if (m.y > H - r) {
          m.y = H - r;
          m.vy = -Math.abs(m.vy) * 0.62;
          m.vx *= 0.94;
          if (Math.abs(m.vy) < unit * 0.05) m.vy = -Math.abs(m.vy);
        }
        if (m.y < r) { m.y = r; m.vy = Math.abs(m.vy) * 0.6; }
        m.rot += m.spin * h;
      }
    }

    for (let i = 0; i < arr.length; i++) {
      const a = arr[i];
      if (a.dead || a.suck) continue;
      for (let j = i + 1; j < arr.length; j++) {
        const b = arr[j];
        if (b.dead || b.suck) continue;
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        const rr = (a.r + b.r) * 0.92;
        const d2 = dx * dx + dy * dy;
        if (d2 > rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d;
        const ny = dy / d;
        const overlap = rr - d;
        a.x -= nx * overlap * 0.5;
        a.y -= ny * overlap * 0.5;
        b.x += nx * overlap * 0.5;
        b.y += ny * overlap * 0.5;
        const rvx = b.vx - a.vx;
        const rvy = b.vy - a.vy;
        const vn = rvx * nx + rvy * ny;
        if (vn < 0) {
          const imp = -1.5 * vn * 0.5;
          a.vx -= imp * nx;
          a.vy -= imp * ny;
          b.vx += imp * nx;
          b.vy += imp * ny;
        }
      }
    }
  }
}

function ball(c, x, y, r, fill, stroke, lw) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = fill;
  c.fill();
  if (stroke) {
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.lineWidth = lw || r * 0.1;
    c.strokeStyle = stroke;
    c.stroke();
  }
}

function capsule(c, x1, y1, x2, y2, r, fill, stroke) {
  c.lineCap = 'round';
  if (stroke) {
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.lineWidth = r * 2 + (r * 0.2);
    c.strokeStyle = stroke;
    c.stroke();
  }
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x2, y2);
  c.lineWidth = r * 2;
  c.strokeStyle = fill;
  c.stroke();
}

function turdPath(c, r) {
  c.beginPath();
  c.arc(0, r * 0.34, r * 0.96, 0, TAU);
  c.arc(0, -r * 0.30, r * 0.78, 0, TAU);
  c.arc(0, -r * 0.86, r * 0.52, 0, TAU);
  c.moveTo(-r * 0.40, -r * 0.92);
  c.quadraticCurveTo(-r * 0.10, -r * 1.72, r * 0.44, -r * 0.98);
  c.quadraticCurveTo(r * 0.10, -r * 1.34, -r * 0.40, -r * 0.92);
  c.closePath();
}

function drawTurd(c, m, t) {
  const unit = S.unit;
  const r = m.r;
  let alpha = 1;
  if (m.suck) {
    const d = Math.hypot(S.cx - m.x, S.cy - m.y);
    alpha = clamp(d / (S.R * 1.8), 0.15, 1);
  }
  const sp = Math.hypot(m.vx, m.vy);
  c.save();
  c.globalAlpha = alpha;

  if (sp > unit * 0.9 && !m.suck) {
    const nx = m.vx / sp;
    const ny = m.vy / sp;
    for (let k = 1; k <= 3; k++) {
      c.beginPath();
      c.arc(m.x - nx * r * 2.1 * k, m.y - ny * r * 2.1 * k, r * (1 - k * 0.26), 0, TAU);
      c.fillStyle = 'rgba(120,70,34,' + (0.20 - k * 0.055) + ')';
      c.fill();
    }
  }

  c.translate(m.x, m.y);
  c.rotate(m.rot);

  turdPath(c, r * 1.10);
  c.fillStyle = '#3f210e';
  c.fill();

  turdPath(c, r);
  c.fillStyle = '#8a4f27';
  c.fill();

  c.beginPath();
  c.ellipse(-r * 0.36, -r * 0.52, r * 0.17, r * 0.30, -0.5, 0, TAU);
  c.fillStyle = 'rgba(255,214,170,0.35)';
  c.fill();

  const look = m.suck ? 0.5 : 0.0;
  const ex = -r * 0.26;
  const ey = -r * 0.70;
  for (let i = 0; i < 2; i++) {
    const ox = ex + i * r * 0.46;
    c.beginPath();
    c.arc(ox, ey, r * 0.21, 0, TAU);
    c.fillStyle = '#fff6ea';
    c.fill();
    c.beginPath();
    c.arc(ox + look * r * 0.10, ey + r * 0.02, r * 0.10, 0, TAU);
    c.fillStyle = '#20140a';
    c.fill();
  }

  c.restore();
}

function drawButt(c, t) {
  const R = S.R;
  const rec = S.recoil;
  const jig = Math.sin(t * 27) * rec * 0.035;
  const sqx = 1 + jig;
  const sqy = 1 - jig;

  const SKIN = '#eab78e';
  const SKIN_SH = '#d29a6d';
  const OUT = '#6b3d28';
  const JEAN = '#34466a';
  const JEAN_SH = '#283752';
  const TOP = '#b34a86';
  const TOP_SH = '#8e3767';
  const HAIR = '#3b2a2a';

  c.save();
  c.translate(S.cx, S.cy);
  c.scale(S.dir * R * sqx, R * sqy);

  // legs behind the rump
  capsule(c, -0.80, 1.30, -0.98, 3.30, 0.60, JEAN, OUT);
  capsule(c, 0.80, 1.30, 0.98, 3.30, 0.60, JEAN, OUT);
  capsule(c, -0.98, 3.30, -1.04, 4.25, 0.40, SKIN, OUT);
  capsule(c, 0.98, 3.30, 1.04, 4.25, 0.40, SKIN, OUT);
  ball(c, -1.10, 4.42, 0.36, '#2b2b33', OUT);
  ball(c, 1.10, 4.42, 0.36, '#2b2b33', OUT);

  // torso, leaning in and foreshortened
  c.save();
  c.translate(0, -2.05);
  c.rotate(-0.10);
  c.beginPath();
  c.ellipse(0, 0, 1.62, 1.45, 0, 0, TAU);
  c.fillStyle = TOP;
  c.fill();
  c.lineWidth = 0.10;
  c.strokeStyle = OUT;
  c.stroke();
  c.beginPath();
  c.ellipse(0, 0.30, 1.20, 0.95, 0, 0, TAU);
  c.fillStyle = TOP_SH;
  c.globalAlpha = 0.5;
  c.fill();
  c.globalAlpha = 1;
  c.restore();

  // shoulders and tucked head, seen from behind
  ball(c, 0, -3.02, 1.34, TOP, OUT, 0.10);
  c.save();
  c.translate(0, -3.62);
  c.rotate(0.08);
  c.beginPath();
  c.ellipse(0, 0, 0.96, 0.70, 0, 0, TAU);
  c.fillStyle = HAIR;
  c.fill();
  c.lineWidth = 0.09;
  c.strokeStyle = '#22161a';
  c.stroke();
  c.beginPath();
  c.ellipse(-0.28, -0.22, 0.46, 0.24, -0.35, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,0.10)';
  c.fill();
  c.restore();

  // arms down to the knees
  capsule(c, -1.24, -2.80, -1.36, -0.85, 0.26, SKIN, OUT);
  capsule(c, -1.36, -0.85, -1.05, 1.05, 0.25, SKIN, OUT);
  capsule(c, 1.24, -2.80, 1.36, -0.85, 0.26, SKIN, OUT);
  capsule(c, 1.36, -0.85, 1.05, 1.05, 0.25, SKIN, OUT);
  ball(c, -1.02, 1.14, 0.30, SKIN, OUT);
  ball(c, 1.02, 1.14, 0.30, SKIN, OUT);

  // jeans waistband just below the rump
  c.save();
  c.globalAlpha = 0.9;
  capsule(c, -0.66, 1.05, 0.66, 1.05, 0.14, JEAN_SH, OUT);
  c.restore();

  // the two cheeks
  ball(c, -0.58, 0.02, 1.02, SKIN, OUT, 0.10);
  ball(c, 0.58, 0.02, 1.02, SKIN, OUT, 0.10);

  // shading on each cheek
  c.save();
  c.globalAlpha = 0.45;
  ball(c, -0.72, 0.28, 0.62, SKIN_SH);
  ball(c, 0.72, 0.28, 0.62, SKIN_SH);
  c.restore();

  // crack
  c.beginPath();
  c.moveTo(0, -0.86);
  c.quadraticCurveTo(0.10, 0.10, 0.0, 0.94);
  c.lineWidth = 0.16;
  c.strokeStyle = '#8a5836';
  c.lineCap = 'round';
  c.stroke();
  c.beginPath();
  c.moveTo(0, -0.70);
  c.quadraticCurveTo(0.04, 0.05, 0.0, 0.80);
  c.lineWidth = 0.07;
  c.strokeStyle = '#5c3520';
  c.stroke();

  // totally unrelated heart tattoo
  c.save();
  c.translate(-0.98, -0.30);
  c.rotate(-0.22);
  c.beginPath();
  c.moveTo(0, 0.16);
  c.bezierCurveTo(-0.18, -0.02, -0.14, -0.20, 0, -0.10);
  c.bezierCurveTo(0.14, -0.20, 0.18, -0.02, 0, 0.16);
  c.fillStyle = 'rgba(240,110,150,0.85)';
  c.fill();
  c.restore();

  c.restore();
}

function suckingCycle(t) {
  for (let i = 0; i < S.cycles.length; i++) {
    const cy = S.cycles[i];
    if (t >= cy.suckAt && t <= cy.suckEnd + 0.25) return i;
  }
  return -1;
}

function drawSuckFx(c, t, ci) {
  const cy = S.cycles[ci];
  const p = clamp((t - cy.suckAt) / (cy.suckEnd - cy.suckAt), 0, 1);
  c.save();
  c.translate(S.cx, S.cy);
  c.lineCap = 'round';
  c.lineWidth = S.R * 0.055;

  for (let i = 0; i < 30; i++) {
    const ang = i * 2.399 + t * (i % 2 ? 3.1 : -3.1);
    const base = S.R * (1.5 + ((i * 13) % 8) * 0.62);
    const rr = base * (1 - 0.55 * p);
    const x1 = Math.cos(ang) * rr;
    const y1 = Math.sin(ang) * rr * 0.96;
    const a2 = ang + 0.26;
    const x2 = Math.cos(a2) * rr * 0.9;
    const y2 = Math.sin(a2) * rr * 0.86;
    c.globalAlpha = (0.16 + 0.30 * (1 - rr / (S.R * 6.4))) * (1 - p * 0.4);
    c.strokeStyle = '#ffc4e0';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
  }

  c.globalAlpha = 0.35 + 0.25 * Math.sin(t * 12);
  c.beginPath();
  c.arc(0, 0, S.R * (1.15 + 0.18 * Math.sin(t * 9)), 0, TAU);
  c.strokeStyle = '#ff9ecb';
  c.lineWidth = S.R * 0.06;
  c.stroke();
  c.restore();
}

function drawFlash(c) {
  if (S.flash <= 0.02) return;
  c.save();
  c.translate(S.cx, S.cy);
  c.globalAlpha = S.flash * 0.8;
  c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const ang = (i / 9) * TAU + 0.3;
    const r1 = S.R * 1.2;
    const r2 = S.R * (1.9 + S.flash * 0.9);
    c.beginPath();
    c.moveTo(Math.cos(ang) * r1, Math.sin(ang) * r1);
    c.lineTo(Math.cos(ang) * r2, Math.sin(ang) * r2);
    c.strokeStyle = '#ffd9ec';
    c.lineWidth = S.R * 0.09;
    c.stroke();
  }
  c.restore();
}

function drawCap(c, ctx, cap, t) {
  const fadeIn = clamp((t - cap.a) / 0.22, 0, 1);
  const fadeOut = clamp((cap.b - t) / 0.2, 0, 1);
  const a = Math.min(fadeIn, fadeOut);
  if (a <= 0) return;

  const size = S.unit * 0.056;
  const y = S.capY * S.H + (1 - fadeIn) * size * 0.3;

  c.save();
  c.globalAlpha = a;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.font = '900 ' + Math.round(size) + 'px "Arial Black", Impact, sans-serif';
  c.lineWidth = size * 0.17;
  c.strokeStyle = 'rgba(9,13,28,0.92)';
  c.strokeText(cap.txt, S.W * 0.5, y, S.W * 0.92);
  c.fillStyle = cap.color;
  c.fillText(cap.txt, S.W * 0.5, y, S.W * 0.92);

  if (cap.sub) {
    const ss = size * 0.46;
    c.font = '800 ' + Math.round(ss) + 'px "Arial Black", Impact, sans-serif';
    c.lineWidth = ss * 0.22;
    c.strokeStyle = 'rgba(9,13,28,0.92)';
    c.strokeText(cap.sub, S.W * 0.5, y + size * 0.95, S.W * 0.86);
    c.fillStyle = ctx.accent || '#ff7bb0';
    c.fillText(cap.sub, S.W * 0.5, y + size * 0.95, S.W * 0.86);
  }
  c.restore();
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = S.W;
  const H = S.H;
  const unit = S.unit;

  c.clearRect(0, 0, W, H);

  dt = clamp(dt || 0, 0, 0.05);
  t = t || 0;

  const enter = easeOut(clamp(t / 1.15, 0, 1));
  S.slide = S.slide0 * (1 - enter);
  if (t > 21.15) S.slide += S.slide0 * easeIn(clamp((t - 21.15) / 0.95, 0, 1));
  S.cx = S.bx + S.slide;
  S.cy = S.by;
  S.recoil = Math.max(0, S.recoil - dt * 2.4);
  S.flash = Math.max(0, S.flash - dt * 5.5);
  S.gulp = Math.max(0, S.gulp - dt * 4.0);

  for (let ci = 0; ci < S.cycles.length; ci++) {
    const cy = S.cycles[ci];
    while (S.spawned[ci] < 40) {
      const idx = S.spawned[ci];
      const at = cy.shootAt + idx * (cy.shootDur / 40);
      if (t < at) break;
      S.spawned[ci]++;
      spawnTurd(ctx, ci, idx);
    }
    if (!S.suckedFlag[ci] && t >= cy.suckAt) {
      S.suckedFlag[ci] = true;
      for (const m of S.turds) if (m.cyc === ci) m.suck = true;
      sfxNoise(ctx, 240);
      sfxBeep(ctx, 140, 120);
      S.nextBeep = t;
    }
  }

  for (const m of S.turds) {
    if (m.suck && !m.dead) m.suckAge += dt;
  }

  stepPhysics(dt);

  let deadPop = 0;
  for (const m of S.turds) {
    if (m.dead) deadPop++;
  }
  if (deadPop > 0) {
    S.gulp = Math.min(1, S.gulp + deadPop * 0.05);
    if (t >= S.nextGulpSfx) {
      S.nextGulpSfx = t + 0.16;
      sfxBeep(ctx, 260 + ((S.popped * 37) % 420), 28);
    }
    S.popped += deadPop;
    S.turds = S.turds.filter((m) => !m.dead);
  }

  drawButt(c, t);

  const sci = suckingCycle(t);
  if (sci >= 0) {
    drawSuckFx(c, t, sci);
    if (t >= S.nextBeep) {
      const cy = S.cycles[sci];
      const p = clamp((t - cy.suckAt) / (cy.suckEnd - cy.suckAt), 0, 1);
      S.nextBeep = t + 0.13;
      sfxBeep(ctx, 180 + p * 900, 42);
    }
  }

  drawFlash(c);

  for (const m of S.turds) drawTurd(c, m, t);

  for (const cap of CAPS) drawCap(c, ctx, cap, t);

  if (t >= S.endTime) {
    try { ctx.done(); } catch (e) { /* the host will handle it */ }
  }
}

export function dispose() {
  S = null;
}
