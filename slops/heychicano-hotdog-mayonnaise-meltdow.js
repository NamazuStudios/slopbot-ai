export const meta = {
  title: 'Hotdog Mayonnaise Meltdown',
  author: 'heychicano',
  prompt: 'happy robot gets overloaded over 30 seconds and then gets angrier from seconds 31 to 60 and at the end',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

let S = null;

const SOUNDS = [
  ['boot1', 0.15, 620, 110],
  ['boot2', 0.42, 820, 130],
  ['joy1', 3.2, 980, 90],
  ['joy2', 6.4, 760, 80],
  ['joy3', 9.6, 1040, 90],
  ['warn1', 15.5, 1120, 90],
  ['warn2', 18.5, 1180, 80],
  ['warn3', 21.0, 1240, 80],
  ['warn4', 23.5, 1320, 70],
  ['warn5', 25.5, 1400, 70],
  ['warn6', 27.2, 1500, 60],
  ['warn7', 28.8, 1620, 60],
  ['pop', 30.0, 0, 220],
  ['growl1', 30.4, 120, 260],
  ['growl2', 33.0, 105, 280],
  ['growl3', 35.8, 96, 300],
  ['growl4', 38.6, 88, 320],
  ['growl5', 41.4, 82, 340],
  ['growl6', 44.2, 76, 360],
  ['growl7', 47.0, 70, 380],
  ['stompburst', 50.2, 0, 280],
  ['bye', 55.6, 220, 500],
];

const CAPTIONS = [
  { a: 0.6, b: 5.6, lines: ['HELLO, SAVORYSAILOR!', 'ALL SYSTEMS JOYFUL.'] },
  { a: 6.2, b: 12.0, lines: ['MY JOY LEVELS ARE', 'ILLEGALLY HIGH.'] },
  { a: 12.6, b: 18.5, lines: ['WARNING: HAPPINESS', 'EXCEEDS SAFE LIMITS.'] },
  { a: 19.0, b: 25.2, lines: ['TEMPERATURE: TOASTY.', 'STILL FINE. PROBABLY.'] },
  { a: 25.8, b: 30.2, lines: ['WHY IS MY BELLY', 'MAKING A SIZZLING NOISE.'] },
  { a: 30.8, b: 36.6, lines: ['SAVORYSAILOR.', 'WHAT IS IN MY VENTS.'] },
  { a: 37.2, b: 43.4, lines: ['THAT IS MAYONNAISE.', 'HOTDOG MAYONNAISE.'] },
  { a: 44.0, b: 49.6, lines: ['MY CIRCUITS ARE NOW', 'A DELI COUNTER.'] },
  { a: 50.0, b: 53.4, lines: ['I AM LEAVING.', 'DO NOT FOLLOW ME.'] },
];

export function init(ctx) {
  S = {
    fired: {},
    hearts: [],
    steam: [],
    sparks: [],
    drips: [],
    accHeart: 0,
    accSteam: 0,
    accSpark: 0,
    accDrip: 0,
    ended: false,
  };
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function palette(ctx) {
  return {
    accent: ctx.accent || '#ff4fa3',
    metalTop: '#f4f7ff',
    metalMid: '#c9d3e6',
    metalDark: '#8f9bb8',
    edge: '#4b5675',
    screen: '#0d1934',
    eye: '#6ef0ff',
    hot: '#ff5636',
    mayo: '#f6e6a4',
  };
}

function roundRect(c, x, y, w, h, r) {
  const rad = Math.max(0, Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5));
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

function layout(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const s = Math.min(W / 13, H / 9.5);
  const sr = ctx.streamer;
  let cx = W * 0.33;
  let dir = -1;
  if (sr) {
    const streamerX = (sr.x + sr.w / 2) * W;
    if (streamerX < W * 0.5) {
      cx = W * 0.76;
      dir = 1;
    } else {
      cx = W * 0.24;
      dir = -1;
    }
  }
  return { s, cx, baseY: H * 0.92, dir, sr };
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  const step = Math.max(0, Math.min(0.05, dt || 0.016));
  const L = layout(ctx);
  const P = palette(ctx);
  const s = L.s;

  const mood = t < 20 ? 'happy' : t < 30 ? 'overload' : t < 50.4 ? 'angry' : 'leave';
  const heat = clamp((t - 15) / 15, 0, 1);
  const k = mood === 'angry' || mood === 'leave' ? clamp((t - 30) / 14, 0, 1) : 0;

  runSounds(ctx, t);

  if (!S.ended) spawnParticles(ctx, t, step);

  let shakeX = 0;
  let shakeY = 0;
  if (t > 20) {
    const amp = Math.min(1, (t - 20) / 18) * s * 0.03;
    shakeX = Math.sin(t * 17) * amp + Math.sin(t * 29) * amp * 0.35;
    shakeY = Math.cos(t * 21) * amp * 0.55;
  }

  let moveX = 0;
  if (t > 50.4) {
    const p = clamp((t - 50.4) / 6, 0, 1);
    const dist = (L.dir > 0 ? W - L.cx : L.cx) + s * 2.2;
    moveX = L.dir * dist * Math.pow(p, 2.4);
  }
  const cx = L.cx + moveX;

  c.save();
  c.translate(shakeX, shakeY);

  // warm / cheerful aura behind the robot — glass-safe, no full-canvas paint
  const auraR = s * 2.6;
  const aura = c.createRadialGradient(cx, L.baseY - 1.6 * s, s * 0.15, cx, L.baseY - 1.6 * s, auraR);
  if (mood === 'happy') {
    aura.addColorStop(0, 'rgba(110,240,255,0.10)');
    aura.addColorStop(1, 'rgba(110,240,255,0)');
  } else {
    aura.addColorStop(0, 'rgba(255,86,54,' + (0.05 + 0.13 * k + 0.03 * heat) + ')');
    aura.addColorStop(1, 'rgba(255,86,54,0)');
  }
  c.fillStyle = aura;
  c.beginPath();
  c.arc(cx, L.baseY - 1.6 * s, auraR, 0, Math.PI * 2);
  c.fill();

  drawPuddle(ctx, L, t);

  drawRobot(ctx, cx, L.baseY, s, t, mood, k, heat, L.dir);

  drawParticles(ctx, t);

  drawBubble(ctx, cx, L.baseY - 3.35 * s, s, t);

  if (mood === 'angry' && t < 50) drawStreamerMarks(ctx, t, L.sr);

  c.restore();

  if (!S.ended && t >= 56.8) {
    S.ended = true;
    ctx.done();
  }
}

function runSounds(ctx, t) {
  for (let i = 0; i < SOUNDS.length; i++) {
    const ev = SOUNDS[i];
    if (t >= ev[1] && !S.fired[ev[0]]) {
      S.fired[ev[0]] = true;
      if (ev[2] > 0) ctx.sound.beep(ev[2], ev[3]);
      else ctx.sound.noise(ev[3]);
    }
  }
  if (t > 50.6 && t < 56.4) {
    const idx = Math.floor((t - 50.6) / 0.4);
    const key = 'stomp' + idx;
    if (!S.fired[key]) {
      S.fired[key] = true;
      ctx.sound.noise(105);
    }
  }
}

function spawnParticles(ctx, t, dt) {
  const R = () => ctx.rand();
  const L = layout(ctx);

  if (t > 0.5 && t < 20) {
    S.accHeart += dt;
    if (S.accHeart > 0.6) {
      S.accHeart = 0;
      S.hearts.push({
        x: L.cx + (R() - 0.5) * 1.2 * L.s,
        y: L.baseY - 2.5 * L.s,
        vx: (R() - 0.5) * 30,
        vy: -40 - R() * 40,
        life: 0,
        max: 1.8 + R() * 0.8,
        size: (0.09 + R() * 0.06) * L.s,
        rot: (R() - 0.5) * 0.6,
      });
    }
  }

  if (t >= 20) {
    S.accSteam += dt;
    const rate = t < 30 ? 0.22 : 0.14;
    if (S.accSteam > rate) {
      S.accSteam = 0;
      const side = R() < 0.5 ? -1 : 1;
      S.steam.push({
        x: L.cx + side * (0.55 + R() * 0.2) * L.s,
        y: L.baseY - (2.1 + R() * 0.5) * L.s,
        vx: (R() - 0.5) * 20,
        vy: -30 - R() * 40,
        life: 0,
        max: 1.2 + R() * 0.9,
        r: (0.1 + R() * 0.12) * L.s,
      });
    }
  }

  if (t >= 24) {
    S.accSpark += dt;
    const rate = t < 30 ? 0.3 : 0.13;
    if (S.accSpark > rate) {
      S.accSpark = 0;
      S.sparks.push({
        x: L.cx + (R() - 0.5) * 1.2 * L.s,
        y: L.baseY - (0.6 + R() * 1.9) * L.s,
        vx: (R() - 0.5) * 240,
        vy: -60 - R() * 180,
        life: 0,
        max: 0.35 + R() * 0.35,
      });
    }
  }

  if (t >= 32 && t < 52) {
    S.accDrip += dt;
    if (S.accDrip > 0.45) {
      S.accDrip = 0;
      S.drips.push({
        x: L.cx + (R() - 0.5) * 0.5 * L.s,
        y: L.baseY - 0.85 * L.s,
        vy: 20 + R() * 40,
        life: 0,
        max: 1.7,
        size: (0.06 + R() * 0.05) * L.s,
      });
    }
  }

  for (const p of S.hearts) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy *= 0.995;
  }
  for (const p of S.steam) {
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.r += 0.35 * L.s * dt;
  }
  for (const p of S.sparks) {
    p.life += dt;
    p.vy += 340 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (const p of S.drips) {
    p.life += dt;
    p.vy += 420 * dt;
    p.y += p.vy * dt;
  }

  S.hearts = S.hearts.filter((p) => p.life < p.max);
  S.steam = S.steam.filter((p) => p.life < p.max);
  S.sparks = S.sparks.filter((p) => p.life < p.max);
  S.drips = S.drips.filter((p) => p.life < p.max && p.y < ctx.height + 40);
}

function drawPuddle(ctx, L, t) {
  if (t < 32) return;
  const c = ctx.canvas;
  const grow = clamp((t - 32) / 12, 0, 1);
  const rx = L.s * (0.45 + 0.55 * grow);
  const ry = L.s * (0.09 + 0.05 * grow);
  c.save();
  c.globalAlpha = 0.55;
  const g = c.createRadialGradient(L.cx, L.baseY + L.s * 0.02, 1, L.cx, L.baseY + L.s * 0.02, rx);
  g.addColorStop(0, '#f8ecc0');
  g.addColorStop(0.75, '#eeda95');
  g.addColorStop(1, 'rgba(238,218,149,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(L.cx, L.baseY + L.s * 0.02, rx, ry, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawRobot(ctx, cx, baseY, s, t, mood, k, heat, dir) {
  const c = ctx.canvas;
  const P = palette(ctx);
  const moving = mood === 'leave';
  const bob =
    mood === 'happy'
      ? Math.sin(t * 3.2) * s * 0.05
      : moving
        ? Math.abs(Math.sin(t * 15)) * s * 0.055
        : Math.sin(t * 1.6) * s * 0.014;

  c.save();
  c.translate(cx, baseY - bob);
  c.rotate(
    (moving ? dir * 0.09 : Math.sin(t * 1.1) * 0.012) +
      (mood === 'angry' ? Math.sin(t * 9) * 0.018 * k : 0),
  );

  // shadow under the feet
  c.fillStyle = 'rgba(4,8,24,0.34)';
  c.beginPath();
  c.ellipse(0, 0, s * 0.92, s * 0.14, 0, 0, Math.PI * 2);
  c.fill();

  // legs
  const swing = moving ? Math.sin(t * 15) : 0;
  drawLeg(c, -0.34 * s, -0.7 * s, s, swing, -1);
  drawLeg(c, 0.34 * s, -0.7 * s, s, -swing, 1);

  // arms (drawn behind the torso)
  let aR;
  let aL;
  let bendR = 0.2;
  let bendL = -0.2;
  if (mood === 'happy') {
    aR = 2.3 + Math.sin(t * 7) * 0.28;
    aL = -0.6 + Math.sin(t * 2.2) * 0.07;
    bendR = 0.5;
    bendL = -0.25;
  } else if (mood === 'overload') {
    aR = 0.6 + Math.sin(t * 11) * 0.12 * heat;
    aL = -0.7 - Math.sin(t * 10) * 0.1 * heat;
    bendR = 0.25 + Math.sin(t * 8) * 0.15 * heat;
    bendL = -0.25 - Math.sin(t * 8) * 0.15 * heat;
  } else if (mood === 'angry') {
    aR = 0.55 + Math.sin(t * 22) * 0.06;
    aL = -0.55 - Math.sin(t * 22 + 1) * 0.06;
    bendR = 0.55;
    bendL = -0.55;
  } else {
    aR = 0.85 + Math.sin(t * 15) * 0.7;
    aL = -0.85 - Math.sin(t * 15) * 0.7;
    bendR = 0.25;
    bendL = -0.25;
  }
  drawArm(c, 0.83 * s, -1.5 * s, aR, bendR, s);
  drawArm(c, -0.83 * s, -1.5 * s, aL, bendL, s);

  // torso
  const bodyGrad = c.createLinearGradient(0, -1.8 * s, 0, -0.6 * s);
  bodyGrad.addColorStop(0, P.metalTop);
  bodyGrad.addColorStop(1, P.metalMid);
  c.fillStyle = bodyGrad;
  c.strokeStyle = P.edge;
  c.lineWidth = 0.055 * s;
  roundRect(c, -0.82 * s, -1.8 * s, 1.64 * s, 1.16 * s, 0.24 * s);
  c.fill();
  c.stroke();

  // chest panel
  c.fillStyle = '#1b2440';
  c.strokeStyle = '#56628a';
  c.lineWidth = 0.035 * s;
  roundRect(c, -0.52 * s, -1.66 * s, 1.04 * s, 0.62 * s, 0.12 * s);
  c.fill();
  c.stroke();

  // gauge
  const gauge = clamp(0.16 + t / 34, 0, 1);
  const gx = -0.4 * s;
  const gy = -1.53 * s;
  const gw = 0.8 * s;
  const gh = 0.13 * s;
  c.fillStyle = '#0a1126';
  roundRect(c, gx, gy, gw, gh, gh * 0.5);
  c.fill();
  c.fillStyle = 'hsl(' + Math.round(115 * (1 - gauge)) + ',85%,55%)';
  roundRect(c, gx + 0.02 * s, gy + 0.025 * s, Math.max(0.03 * s, (gw - 0.04 * s) * gauge), gh - 0.05 * s, (gh - 0.05 * s) * 0.5);
  c.fill();
  if (mood !== 'happy') {
    c.fillStyle = 'rgba(255,86,54,' + (0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 6))) + ')';
    c.beginPath();
    c.arc(0.52 * s - 0.02 * s, -1.75 * s + 0.02 * s, 0.04 * s, 0, Math.PI * 2);
    c.fill();
  }

  // bolts
  c.fillStyle = '#7f8bab';
  for (const bx of [-0.66, 0.66]) {
    for (const by of [-1.7, -0.74]) {
      c.beginPath();
      c.arc(bx * s, by * s, 0.045 * s, 0, Math.PI * 2);
      c.fill();
    }
  }

  // mayo contamination oozing from the chest seam
  if (t >= 31) {
    c.save();
    c.translate(0.1 * s, -1.0 * s);
    c.beginPath();
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = (0.17 + 0.055 * Math.sin(a * 3 + t * 2.4)) * s;
      if (i === 0) c.moveTo(Math.cos(a) * r, Math.sin(a) * r * 0.75);
      else c.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.75);
    }
    c.closePath();
    c.fillStyle = P.mayo;
    c.strokeStyle = '#d9c47b';
    c.lineWidth = 0.03 * s;
    c.fill();
    c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.55)';
    c.beginPath();
    c.ellipse(-0.06 * s, -0.05 * s, 0.05 * s, 0.035 * s, -0.4, 0, Math.PI * 2);
    c.fill();
    c.restore();

    if (k > 0.4) {
      c.strokeStyle = '#2a3552';
      c.lineWidth = 0.025 * s;
      c.beginPath();
      c.moveTo(-0.46 * s, -1.2 * s);
      c.lineTo(-0.28 * s, -1.08 * s);
      c.lineTo(-0.38 * s, -0.98 * s);
      c.lineTo(-0.18 * s, -0.9 * s);
      c.stroke();
    }
  }

  // neck
  c.fillStyle = P.metalDark;
  roundRect(c, -0.24 * s, -1.86 * s, 0.48 * s, 0.14 * s, 0.05 * s);
  c.fill();

  // head
  const headGrad = c.createLinearGradient(0, -2.8 * s, 0, -1.72 * s);
  headGrad.addColorStop(0, P.metalTop);
  headGrad.addColorStop(1, P.metalMid);
  c.fillStyle = headGrad;
  c.strokeStyle = P.edge;
  c.lineWidth = 0.055 * s;
  roundRect(c, -0.72 * s, -2.8 * s, 1.44 * s, 1.0 * s, 0.28 * s);
  c.fill();
  c.stroke();

  // ears
  c.fillStyle = P.metalDark;
  roundRect(c, -0.86 * s, -2.5 * s, 0.16 * s, 0.36 * s, 0.06 * s);
  c.fill();
  roundRect(c, 0.7 * s, -2.5 * s, 0.16 * s, 0.36 * s, 0.06 * s);
  c.fill();

  // face screen
  c.fillStyle = P.screen;
  roundRect(c, -0.58 * s, -2.66 * s, 1.16 * s, 0.72 * s, 0.18 * s);
  c.fill();

  // antenna
  c.strokeStyle = '#7c88a6';
  c.lineWidth = 0.05 * s;
  c.beginPath();
  c.moveTo(0, -2.8 * s);
  c.lineTo(0.09 * s, -3.12 * s);
  c.stroke();
  let ballColor = P.eye;
  if (mood === 'overload') ballColor = 'hsl(' + Math.round(190 - 130 * heat) + ',100%,62%)';
  if (mood === 'angry' || mood === 'leave') ballColor = P.hot;
  c.shadowColor = ballColor;
  c.shadowBlur = 0.2 * s;
  c.fillStyle = ballColor;
  c.beginPath();
  c.arc(0.09 * s, -3.14 * s, 0.085 * s, 0, Math.PI * 2);
  c.fill();
  c.shadowBlur = 0;

  // face
  drawFace(ctx, s, t, mood, k, heat);

  c.restore();
}

function drawLeg(c, hx, hy, s, swing, side) {
  const footX = hx + Math.sin(swing) * 0.22 * s;
  const footY = -0.06 * s;
  c.strokeStyle = '#96a2bd';
  c.lineWidth = 0.2 * s;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(hx, hy);
  c.lineTo(footX, footY - 0.08 * s);
  c.stroke();
  c.fillStyle = '#7c88a6';
  c.beginPath();
  c.ellipse(footX + side * 0.02 * s, footY, 0.2 * s, 0.09 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#4f5a78';
  c.lineWidth = 0.025 * s;
  c.stroke();
}

function drawArm(c, sx, sy, a, bend, s) {
  const l1 = 0.5 * s;
  const l2 = 0.46 * s;
  const ex = sx + Math.sin(a) * l1;
  const ey = sy + Math.cos(a) * l1;
  const hx = ex + Math.sin(a + bend) * l2;
  const hy = ey + Math.cos(a + bend) * l2;
  c.strokeStyle = '#9aa6c1';
  c.lineWidth = 0.17 * s;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(ex, ey);
  c.lineTo(hx, hy);
  c.stroke();
  c.strokeStyle = '#5d6885';
  c.lineWidth = 0.02 * s;
  c.beginPath();
  c.moveTo(sx, sy);
  c.lineTo(ex, ey);
  c.lineTo(hx, hy);
  c.stroke();
  c.fillStyle = '#c3cde0';
  c.beginPath();
  c.arc(hx, hy, 0.13 * s, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#5d6885';
  c.lineWidth = 0.03 * s;
  c.stroke();
  c.fillStyle = '#9aa6c1';
  c.beginPath();
  c.arc(sx, sy, 0.1 * s, 0, Math.PI * 2);
  c.fill();
}

function drawFace(ctx, s, t, mood, k, heat) {
  const c = ctx.canvas;
  const P = palette(ctx);
  const eyeY = -2.42 * s;

  if (mood === 'angry' || mood === 'leave') {
    // slanted angry eyes
    c.shadowColor = P.hot;
    c.shadowBlur = 0.22 * s;
    c.fillStyle = P.hot;
    c.beginPath();
    c.moveTo(-0.48 * s, eyeY + 0.12 * s);
    c.lineTo(-0.12 * s, eyeY - 0.02 * s);
    c.lineTo(-0.12 * s, eyeY + 0.18 * s);
    c.lineTo(-0.48 * s, eyeY + 0.22 * s);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(0.48 * s, eyeY + 0.12 * s);
    c.lineTo(0.12 * s, eyeY - 0.02 * s);
    c.lineTo(0.12 * s, eyeY + 0.18 * s);
    c.lineTo(0.48 * s, eyeY + 0.22 * s);
    c.closePath();
    c.fill();
    c.shadowBlur = 0;
    // brows
    c.strokeStyle = '#e9eefb';
    c.lineWidth = 0.055 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-0.52 * s, eyeY - 0.12 * s);
    c.lineTo(-0.1 * s, eyeY + 0.02 * s);
    c.stroke();
    c.beginPath();
    c.moveTo(0.52 * s, eyeY - 0.12 * s);
    c.lineTo(0.1 * s, eyeY + 0.02 * s);
    c.stroke();
  } else {
    const eyeCol =
      mood === 'happy'
        ? P.eye
        : 'hsl(' + Math.round(190 - 130 * heat) + ',100%,63%)';
    c.shadowColor = eyeCol;
    c.shadowBlur = 0.22 * s;
    c.fillStyle = eyeCol;
    const eh = (0.26 - 0.07 * heat) * s;
    roundRect(c, -0.44 * s, eyeY, 0.3 * s, eh, 0.1 * s);
    c.fill();
    roundRect(c, 0.14 * s, eyeY, 0.3 * s, eh, 0.1 * s);
    c.fill();
    c.shadowBlur = 0;
    c.fillStyle = 'rgba(255,255,255,0.75)';
    c.beginPath();
    c.arc(-0.33 * s, eyeY + 0.08 * s, 0.035 * s, 0, Math.PI * 2);
    c.arc(0.25 * s, eyeY + 0.08 * s, 0.035 * s, 0, Math.PI * 2);
    c.fill();
  }

  // blush while happy
  if (mood === 'happy') {
    c.fillStyle = 'rgba(255,110,160,0.35)';
    c.beginPath();
    c.ellipse(-0.47 * s, -2.13 * s, 0.09 * s, 0.055 * s, 0, 0, Math.PI * 2);
    c.ellipse(0.47 * s, -2.13 * s, 0.09 * s, 0.055 * s, 0, 0, Math.PI * 2);
    c.fill();
  }

  // mouth
  const mouthY = -2.12 * s;
  if (mood === 'happy') {
    c.strokeStyle = P.eye;
    c.lineWidth = 0.05 * s;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(0, mouthY - 0.03 * s, 0.24 * s, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  } else if (mood === 'overload') {
    c.strokeStyle = 'hsl(' + Math.round(190 - 130 * heat) + ',100%,65%)';
    c.lineWidth = 0.045 * s;
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = (-0.26 + (0.52 * i) / 8) * s;
      const y = mouthY - 0.02 * s + Math.sin(i / 8 * Math.PI * 2 + t * 6) * 0.03 * s;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  } else {
    // angry mouth — zigzag, opening into a shout
    const open = 0.06 + 0.16 * k;
    c.fillStyle = '#3a0d12';
    roundRect(c, -0.3 * s, mouthY - open * 0.5 * s, 0.6 * s, open * s, 0.05 * s);
    c.fill();
    // teeth
    c.fillStyle = '#f2f5ff';
    const tw = 0.11 * s;
    for (let i = 0; i < 3; i++) {
      const tx = (-0.28 + i * 0.14) * s;
      c.beginPath();
      c.moveTo(tx, mouthY - open * 0.5 * s);
      c.lineTo(tx + tw, mouthY - open * 0.5 * s);
      c.lineTo(tx + tw * 0.5, mouthY - open * 0.5 * s + 0.06 * s);
      c.closePath();
      c.fill();
      c.beginPath();
      c.moveTo(tx, mouthY + open * 0.5 * s);
      c.lineTo(tx + tw, mouthY + open * 0.5 * s);
      c.lineTo(tx + tw * 0.5, mouthY + open * 0.5 * s - 0.06 * s);
      c.closePath();
      c.fill();
    }
  }
}

function drawParticles(ctx, t) {
  const c = ctx.canvas;
  const P = palette(ctx);

  // steam
  for (const p of S.steam) {
    const a = (1 - p.life / p.max) * 0.24;
    c.fillStyle = 'rgba(232,240,255,' + a + ')';
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fill();
  }

  // hearts
  for (const p of S.hearts) {
    const a = clamp(1 - p.life / p.max, 0, 1);
    drawHeart(c, p.x, p.y, p.size, p.rot, a * 0.9, P.accent);
  }

  // sparks
  for (const p of S.sparks) {
    const a = clamp(1 - p.life / p.max, 0, 1);
    c.strokeStyle = 'rgba(255,214,110,' + a + ')';
    c.lineWidth = ctx.width * 0.0022;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x - p.vx * 0.022, p.y - p.vy * 0.022);
    c.stroke();
  }

  // mayonnaise drips
  for (const p of S.drips) {
    const a = clamp(1 - p.life / p.max, 0.15, 1);
    c.fillStyle = 'rgba(246,230,164,' + a + ')';
    c.beginPath();
    c.ellipse(p.x, p.y, p.size, p.size * 1.45, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,' + a * 0.5 + ')';
    c.beginPath();
    c.arc(p.x - p.size * 0.25, p.y - p.size * 0.3, p.size * 0.25, 0, Math.PI * 2);
    c.fill();
  }
}

function drawHeart(c, x, y, size, rot, alpha, color) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, size * 0.35);
  c.bezierCurveTo(size * 0.6, size * -0.15, size * 0.45, size * -0.7, 0, size * -0.32);
  c.bezierCurveTo(size * -0.45, size * -0.7, size * -0.6, size * -0.15, 0, size * 0.35);
  c.fill();
  c.restore();
}

function drawBubble(ctx, cx, bottomY, s, t) {
  const c = ctx.canvas;
  const P = palette(ctx);
  let cap = null;
  for (const entry of CAPTIONS) {
    if (t >= entry.a && t < entry.b) {
      cap = entry;
      break;
    }
  }
  if (!cap) return;

  const fadeIn = clamp((t - cap.a) / 0.25, 0, 1);
  const fadeOut = clamp((cap.b - t) / 0.3, 0, 1);
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0.01) return;

  const fs = Math.max(11, Math.round(s * 0.235));
  c.font = '700 ' + fs + 'px ' + FONT;
  let wmax = 0;
  for (const line of cap.lines) wmax = Math.max(wmax, c.measureText(line).width);
  const padX = fs * 0.8;
  const padY = fs * 0.55;
  const lineH = fs * 1.28;
  const bw = wmax + padX * 2;
  const bh = cap.lines.length * lineH + padY * 2;
  let x = cx - bw / 2;
  let y = bottomY - bh;
  if (y < 8) y = 8;
  x = clamp(x, 8, ctx.width - bw - 8);

  c.save();
  c.globalAlpha = alpha;

  // tail
  c.fillStyle = 'rgba(8,12,32,0.74)';
  c.beginPath();
  c.moveTo(cx - fs * 0.35, y + bh - 2);
  c.lineTo(cx + fs * 0.35, y + bh - 2);
  c.lineTo(cx, y + bh + fs * 0.7);
  c.closePath();
  c.fill();

  roundRect(c, x, y, bw, bh, fs * 0.65);
  c.fill();
  c.strokeStyle = P.accent;
  c.lineWidth = Math.max(1.5, fs * 0.075);
  c.stroke();

  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let i = 0; i < cap.lines.length; i++) {
    c.fillText(cap.lines[i], x + bw / 2, y + padY + lineH * (i + 0.5));
  }
  c.restore();
}

function drawStreamerMarks(ctx, t, sr) {
  if (!sr) return;
  const c = ctx.canvas;
  const P = palette(ctx);
  const W = ctx.width;
  const H = ctx.height;
  const rx = sr.x * W;
  const ry = sr.y * H;
  const rw = sr.w * W;
  const rh = sr.h * H;

  const pulse = 0.55 + 0.25 * Math.sin(t * 1.3);
  c.save();
  c.globalAlpha = pulse;
  c.strokeStyle = P.accent;
  c.lineWidth = Math.max(2, W * 0.0022);
  c.lineCap = 'round';
  const L = Math.min(rw, rh) * 0.16;
  const corners = [
    [rx, ry, 1, 1],
    [rx + rw, ry, -1, 1],
    [rx, ry + rh, 1, -1],
    [rx + rw, ry + rh, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    c.beginPath();
    c.moveTo(x + sx * L, y);
    c.lineTo(x, y);
    c.lineTo(x, y + sy * L);
    c.stroke();
  }
  c.restore();

  const fs = Math.max(12, Math.min(28, W * 0.014));
  c.save();
  c.font = '700 ' + fs + 'px ' + FONT;
  const label = 'MAYO SOURCE?';
  const tw = c.measureText(label).width;
  const px = rx + rw / 2;
  let tagY = ry - fs * 0.7;
  let above = true;
  if (tagY - fs * 1.3 < 6) {
    tagY = ry + rh + fs * 1.5;
    above = false;
  }
  c.fillStyle = 'rgba(10,14,36,0.78)';
  roundRect(c, px - tw / 2 - fs * 0.6, tagY - fs * 1.25, tw + fs * 1.2, fs * 1.7, fs * 0.4);
  c.fill();
  c.strokeStyle = P.accent;
  c.lineWidth = Math.max(1.5, fs * 0.08);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(label, px, tagY - fs * 0.4);
  c.fillStyle = P.accent;
  c.beginPath();
  if (above) {
    c.moveTo(px, tagY + fs * 1.0);
    c.lineTo(px - fs * 0.32, tagY + fs * 0.45);
    c.lineTo(px + fs * 0.32, tagY + fs * 0.45);
  } else {
    c.moveTo(px, tagY - fs * 1.6);
    c.lineTo(px - fs * 0.32, tagY - fs * 1.05);
    c.lineTo(px + fs * 0.32, tagY - fs * 1.05);
  }
  c.closePath();
  c.fill();
  c.restore();
}

export function dispose(ctx) {}
