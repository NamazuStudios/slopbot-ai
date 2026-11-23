export const meta = {
  title: 'Big Butt Duck',
  author: 'cooooter',
  prompt: 'A duck with a BIG HEAD AND BIG BUTT WALKS UP TO THE STREAMER AND GROWS HUMAN HANDS TO WAVE',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  assets: [],
};

const C = {
  yellow: '#ffd93d',
  shade: '#edb622',
  belly: '#ffe98a',
  beak: '#ff8a3d',
  beakDark: '#dc6a1e',
  ink: '#1b2340',
  skin: '#f2b58e',
  skinLite: '#ffcba6',
  skinDark: '#c9895f',
  white: '#fffdf7',
  spark: '#ffe066',
};

let S = null;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function roundRect(c, x, y, w, h, r) {
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

function build(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const unit = Math.min(W, H);
  const st = ctx.streamer;

  const r = unit * 0.072;
  const groundY = st
    ? clamp(st.y * H + st.h * H * 0.94, H * 0.25, H * 0.96)
    : H * 0.74;

  let face = 1;
  let stopX;
  if (st) {
    const boxL = st.x * W;
    const boxR = (st.x + st.w) * W;
    if (boxL > W * 0.48) {
      face = 1;
      stopX = boxL - r * 2.5;
    } else {
      face = -1;
      stopX = boxR + r * 2.5;
    }
    stopX = clamp(stopX, r * 2.2, W - r * 2.2);
  } else {
    face = 1;
    stopX = W * 0.5;
  }

  const startX = face === 1 ? -r * 3.2 : W + r * 3.2;
  const walkDur = 5.0;

  const sparks = [];
  for (let i = 0; i < 34; i++) {
    const a = ctx.rand() * Math.PI * 2;
    const sp = 0.4 + ctx.rand() * 0.9;
    sparks.push({
      a,
      sp,
      size: 0.5 + ctx.rand() * 1.1,
      spin: (ctx.rand() - 0.5) * 7,
      col: ctx.rand() > 0.55 ? C.spark : C.white,
    });
  }

  return {
    W,
    H,
    unit,
    r,
    groundY,
    face,
    startX,
    stopX,
    walkDur,
    duckX: startX,
    sparks,
    dur: 13.9,
    ended: false,
    lastStep: -99,
    f: {},
  };
}

function drawFeet(ctx, st, t) {
  const c = ctx.canvas;
  const r = st.r;
  const face = st.face;
  const walking = t < st.walkDur;
  const phase = t * 7.2;
  const lift = walking
    ? Math.max(0, Math.sin(phase)) * r * 0.34
    : Math.abs(Math.sin(t * 2.4)) * r * 0.03;
  const lift2 = walking
    ? Math.max(0, -Math.sin(phase)) * r * 0.34
    : 0;

  const feet = [
    { dx: -face * r * 0.34, up: lift, rot: -0.12 },
    { dx: face * r * 0.42, up: lift2, rot: 0.12 },
  ];

  for (const ft of feet) {
    const fx = st.duckX + ft.dx;
    const fy = st.groundY - ft.up;
    c.save();
    c.translate(fx, fy);
    c.rotate(ft.rot);
    c.lineCap = 'round';

    c.strokeStyle = C.ink;
    c.lineWidth = r * 0.30;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-face * r * 0.12, -r * (1.05 + ft.up / r));
    c.stroke();

    c.strokeStyle = C.beak;
    c.lineWidth = r * 0.20;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(-face * r * 0.12, -r * (1.05 + ft.up / r));
    c.stroke();

    c.fillStyle = C.beak;
    c.strokeStyle = C.ink;
    c.lineWidth = r * 0.08;
    c.beginPath();
    c.ellipse(face * r * 0.10, 0, r * 0.40, r * 0.14, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    c.strokeStyle = C.beakDark;
    c.lineWidth = r * 0.04;
    c.beginPath();
    c.moveTo(face * r * 0.02, -r * 0.02);
    c.lineTo(face * r * 0.34, -r * 0.02);
    c.stroke();
    c.restore();
  }
}

function drawHand(ctx, r, rot, wave, scale) {
  const c = ctx.canvas;
  c.save();
  c.rotate(rot);
  c.scale(scale, scale);
  c.lineCap = 'round';

  const pr = r * 0.46;

  // fingers
  for (let i = 0; i < 4; i++) {
    const fx = (i - 1.5) * pr * 0.44;
    const len = pr * (1.02 - Math.abs(i - 1.5) * 0.14);
    const ang = (i - 1.5) * 0.26 + Math.sin(wave + i * 0.8) * 0.46;

    c.save();
    c.translate(fx, -pr * 0.50);
    c.rotate(ang);

    c.strokeStyle = C.ink;
    c.lineWidth = pr * 0.40;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -len);
    c.stroke();

    c.strokeStyle = C.skin;
    c.lineWidth = pr * 0.28;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -len);
    c.stroke();

    c.strokeStyle = C.skinLite;
    c.lineWidth = pr * 0.10;
    c.beginPath();
    c.moveTo(-pr * 0.05, -pr * 0.05);
    c.lineTo(-pr * 0.05, -len * 0.8);
    c.stroke();
    c.restore();
  }

  // thumb
  c.save();
  c.translate(-pr * 0.85, -pr * 0.05);
  c.rotate(-0.75 + Math.sin(wave + 2.2) * 0.3);
  c.strokeStyle = C.ink;
  c.lineWidth = pr * 0.42;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-pr * 0.55, 0);
  c.stroke();
  c.strokeStyle = C.skin;
  c.lineWidth = pr * 0.30;
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-pr * 0.55, 0);
  c.stroke();
  c.restore();

  // palm
  c.fillStyle = C.ink;
  c.beginPath();
  c.ellipse(0, 0, pr * 0.98, pr * 0.84, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.skin;
  c.beginPath();
  c.ellipse(0, 0, pr * 0.86, pr * 0.72, 0, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = C.skinDark;
  c.lineWidth = pr * 0.09;
  c.beginPath();
  c.arc(pr * 0.05, pr * 0.12, pr * 0.42, 0.35, 2.2);
  c.stroke();

  c.restore();
}

function drawArm(ctx, r, sx, sy, hx, hy, wave, g, side) {
  const c = ctx.canvas;

  hx += Math.sin(wave) * r * 0.14;
  hy += Math.cos(wave * 1.3) * r * 0.06;

  const ex = (sx + hx) * 0.5 + (side === 0 ? -r * 0.42 : r * 0.18);
  const ey = (sy + hy) * 0.5 - r * 0.34;

  c.lineCap = 'round';

  c.strokeStyle = C.ink;
  c.lineWidth = r * 0.34 * g;
  c.beginPath();
  c.moveTo(sx, sy);
  c.quadraticCurveTo(ex, ey, hx, hy);
  c.stroke();

  c.strokeStyle = C.skin;
  c.lineWidth = r * 0.23 * g;
  c.beginPath();
  c.moveTo(sx, sy);
  c.quadraticCurveTo(ex, ey, hx, hy);
  c.stroke();

  c.save();
  c.translate(hx, hy);
  drawHand(ctx, r, -0.55 + Math.sin(wave) * 0.42, wave + side * 1.4, clamp(g, 0.001, 1.12));
  c.restore();
}

function drawDuck(ctx, st, t) {
  const c = ctx.canvas;
  const r = st.r;
  const face = st.face;
  const walking = t < st.walkDur;
  const phase = t * 7.2;

  const bob = walking
    ? Math.abs(Math.sin(phase)) * r * 0.18
    : Math.sin(t * 2.2) * r * 0.035;
  const tilt = walking ? Math.sin(phase) * 0.10 : Math.sin(t * 1.7) * 0.015;
  const bodyY = st.groundY - r * 1.45 - bob;
  const jiggle = walking
    ? Math.sin(phase * 2 + 1.1) * r * 0.07
    : Math.sin(t * 2.0) * r * 0.02;

  drawFeet(ctx, st, t);

  // contact shadow
  c.fillStyle = 'rgba(8, 12, 30, 0.20)';
  c.beginPath();
  c.ellipse(st.duckX - face * r * 0.1, st.groundY + r * 0.06, r * 1.55, r * 0.28, 0, 0, Math.PI * 2);
  c.fill();

  c.save();
  c.translate(st.duckX, bodyY);
  c.scale(face, 1);
  c.rotate(tilt);
  c.lineJoin = 'round';

  // BIG BUTT — the main character
  const br = r * (1.05 + jiggle / r);
  c.fillStyle = C.ink;
  c.beginPath();
  c.ellipse(-r * 0.82, r * 0.30, br * 1.02, br * 0.98, -0.18, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.shade;
  c.beginPath();
  c.ellipse(-r * 0.82, r * 0.30, br * 0.88, br * 0.84, -0.18, 0, Math.PI * 2);
  c.fill();

  // tail feathers
  c.fillStyle = C.ink;
  c.beginPath();
  c.ellipse(-r * 1.5, -r * 0.15, r * 0.46, r * 0.20, -0.55, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = C.yellow;
  c.beginPath();
  c.ellipse(-r * 1.5, -r * 0.15, r * 0.38, r * 0.13, -0.55, 0, Math.PI * 2);
  c.fill();

  // body
  c.fillStyle = C.ink;
  c.beginPath();
  c.ellipse(0, 0, r * 1.13, r * 0.95, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.yellow;
  c.beginPath();
  c.ellipse(0, 0, r * 1.02, r * 0.84, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.belly;
  c.beginPath();
  c.ellipse(r * 0.28, r * 0.28, r * 0.62, r * 0.42, -0.12, 0, Math.PI * 2);
  c.fill();

  // wing
  c.fillStyle = C.ink;
  c.save();
  c.translate(-r * 0.08, -r * 0.02);
  c.rotate(-0.32);
  c.beginPath();
  c.ellipse(0, 0, r * 0.60, r * 0.38, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  c.fillStyle = C.shade;
  c.save();
  c.translate(-r * 0.08, -r * 0.02);
  c.rotate(-0.32);
  c.beginPath();
  c.ellipse(0, 0, r * 0.51, r * 0.30, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  c.strokeStyle = C.skinDark;
  c.globalAlpha = 0.35;
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.arc(-r * 0.12, 0, r * 0.36, -0.4, 1.3);
  c.stroke();
  c.globalAlpha = 1;

  // BIG HEAD
  const hx = r * 0.52;
  const hy = -r * 1.42;

  c.fillStyle = C.ink;
  c.beginPath();
  c.arc(hx, hy, r * 1.08, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.yellow;
  c.beginPath();
  c.arc(hx, hy, r * 0.99, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.belly;
  c.beginPath();
  c.arc(hx + r * 0.28, hy + r * 0.36, r * 0.55, 0, Math.PI * 2);
  c.fill();

  // beak
  c.fillStyle = C.ink;
  c.beginPath();
  c.moveTo(hx + r * 0.72, hy - r * 0.30);
  c.quadraticCurveTo(hx + r * 1.95, hy - r * 0.20, hx + r * 1.86, hy + r * 0.06);
  c.quadraticCurveTo(hx + r * 1.78, hy + r * 0.30, hx + r * 0.66, hy + r * 0.34);
  c.closePath();
  c.fill();

  c.fillStyle = C.beak;
  c.beginPath();
  c.moveTo(hx + r * 0.78, hy - r * 0.24);
  c.quadraticCurveTo(hx + r * 1.84, hy - r * 0.15, hx + r * 1.76, hy + r * 0.05);
  c.quadraticCurveTo(hx + r * 1.68, hy + r * 0.22, hx + r * 0.72, hy + r * 0.27);
  c.closePath();
  c.fill();

  c.strokeStyle = C.beakDark;
  c.lineWidth = r * 0.05;
  c.beginPath();
  c.moveTo(hx + r * 0.86, hy + r * 0.05);
  c.quadraticCurveTo(hx + r * 1.35, hy + r * 0.09, hx + r * 1.72, hy + r * 0.04);
  c.stroke();

  // nostril
  c.fillStyle = C.beakDark;
  c.beginPath();
  c.ellipse(hx + r * 1.12, hy - r * 0.08, r * 0.06, r * 0.04, 0, 0, Math.PI * 2);
  c.fill();

  // eye
  const ex = hx + r * 0.30;
  const ey = hy - r * 0.34;
  const blink = Math.max(0, Math.sin(t * 1.9 - 2)) > 0.985 ? 0.12 : 1;

  c.fillStyle = C.ink;
  c.beginPath();
  c.ellipse(ex, ey, r * 0.30, r * 0.30 * blink, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.white;
  c.beginPath();
  c.ellipse(ex, ey, r * 0.23, r * 0.23 * blink, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = C.ink;
  c.beginPath();
  c.ellipse(ex + r * 0.07, ey + r * 0.02, r * 0.13, r * 0.13 * blink, 0, 0, Math.PI * 2);
  c.fill();

  if (blink > 0.5) {
    c.fillStyle = C.white;
    c.beginPath();
    c.arc(ex + r * 0.14, ey - r * 0.09, r * 0.05, 0, Math.PI * 2);
    c.fill();
  }

  // brow — permanently surprised
  c.strokeStyle = C.beakDark;
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.arc(ex, ey - r * 0.02, r * 0.36, -2.35, -0.95);
  c.stroke();

  // cheek
  c.fillStyle = 'rgba(255, 138, 61, 0.35)';
  c.beginPath();
  c.ellipse(hx + r * 0.02, hy + r * 0.32, r * 0.26, r * 0.16, 0, 0, Math.PI * 2);
  c.fill();

  // human hands
  const grow = clamp((t - st.walkDur - 0.15) / 1.05, 0, 1);
  if (grow > 0) {
    const g = easeOutBack(grow);
    const waveTime = Math.max(0, t - st.walkDur - 1.15) * 7.4;
    const wave = grow >= 1 ? waveTime : 0;

    const sh1x = r * 0.34;
    const sh1y = -r * 0.12;
    const tg1x = r * 1.85;
    const tg1y = -r * 2.05;

    const sh2x = r * 0.02;
    const sh2y = r * 0.18;
    const tg2x = r * 1.42;
    const tg2y = -r * 1.40;

    drawArm(
      ctx, r,
      sh2x, sh2y,
      lerp(sh2x, tg2x, g), lerp(sh2y, tg2y, g),
      wave, g, 1
    );
    drawArm(
      ctx, r,
      sh1x, sh1y,
      lerp(sh1x, tg1x, g), lerp(sh1y, tg1y, g),
      wave, g, 0
    );
  }

  c.restore();
}

function drawSparks(ctx, st, t) {
  const c = ctx.canvas;
  const start = st.walkDur + 0.15;
  const p = (t - start) / 1.6;
  if (p < 0 || p > 1) return;

  const cx = st.duckX + st.face * st.r * 1.2;
  const cy = st.groundY - st.r * 2.7;

  for (const s of st.sparks) {
    const dist = s.sp * st.r * 3.0 * easeOut(p);
    const x = cx + Math.cos(s.a) * dist;
    const y = cy + Math.sin(s.a) * dist * 0.8 + p * p * st.r * 0.9;
    const a = 1 - p;
    const size = s.size * st.r * 0.16;

    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.translate(x, y);
    c.rotate(s.a + p * s.spin);
    c.fillStyle = s.col;
    c.beginPath();
    c.moveTo(0, -size);
    c.lineTo(size * 0.45, 0);
    c.lineTo(0, size);
    c.lineTo(-size * 0.45, 0);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.globalAlpha = 1;
}

function drawBubble(ctx, st, t, line1, line2) {
  const c = ctx.canvas;
  const r = st.r;
  const w1 = t >= st.walkDur + 2.0;

  const x1 = line1;
  const x2 = w1 ? line2 : '';
  if (!x2) return;

  const fs = clamp(ctx.width * 0.024, 15, 34);
  c.save();
  c.font = `700 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
  c.textBaseline = 'middle';

  const tw1 = c.measureText(x1).width;
  const tw2 = c.measureText(x2).width;
  const padX = fs * 0.8;
  const padY = fs * 0.42;
  const lh = fs * 1.25;
  const bw = Math.max(tw1, tw2) + padX * 2;
  const bh = lh * 2 + padY * 2;

  let bx = st.duckX - bw * 0.42;
  bx = clamp(bx, fs, ctx.width - bw - fs);
  let by = st.groundY - r * 4.05 - bh;
  by = clamp(by, fs, ctx.height - bh - fs);
  const tailX = clamp(st.duckX, bx + fs, bx + bw - fs);

  c.fillStyle = 'rgba(20, 27, 52, 0.88)';
  c.strokeStyle = C.yellow;
  c.lineWidth = Math.max(2, fs * 0.10);
  roundRect(c, bx, by, bw, bh, fs * 0.7);
  c.fill();
  c.stroke();

  c.beginPath();
  c.moveTo(tailX - fs * 0.5, by + bh - 2);
  c.lineTo(tailX + fs * 0.5, by + bh - 2);
  c.lineTo(tailX, by + bh + fs * 0.75);
  c.closePath();
  c.fillStyle = 'rgba(20, 27, 52, 0.88)';
  c.fill();
  c.strokeStyle = C.yellow;
  c.beginPath();
  c.moveTo(tailX - fs * 0.42, by + bh - 2);
  c.lineTo(tailX, by + bh + fs * 0.65);
  c.lineTo(tailX + fs * 0.42, by + bh - 2);
  c.stroke();

  c.fillStyle = C.white;
  c.textAlign = 'center';
  c.fillText(x1, bx + bw / 2, by + padY + lh * 0.5);
  c.fillStyle = C.spark;
  c.fillText(x2, bx + bw / 2, by + padY + lh * 1.5);

  c.restore();
}

export function init(ctx) {
  S = build(ctx);
}

export function frame(ctx, t, dt) {
  if (!S) S = build(ctx);
  const st = S;
  const c = ctx.canvas;

  c.clearRect(0, 0, ctx.width, ctx.height);

  const p = clamp(t / st.walkDur, 0, 1);
  const move = p < 0.85 ? (p / 0.85) * 0.9 : 0.9 + 0.1 * easeOut((p - 0.85) / 0.15);
  st.duckX = lerp(st.startX, st.stopX, move);

  // waddle footsteps
  const walking = t < st.walkDur;
  if (walking) {
    const step = Math.floor((t * 7.2) / Math.PI);
    if (step !== st.lastStep) {
      st.lastStep = step;
      const loud = st.lastStep % 2 === 0;
      ctx.sound.beep(loud ? 150 : 122, 55);
    }
  }

  // hand growth sting
  if (t >= st.walkDur + 0.15 && !st.f.grow) {
    st.f.grow = true;
    ctx.sound.noise(240);
  }
  if (t >= st.walkDur + 1.15 && !st.f.snap) {
    st.f.snap = true;
    ctx.sound.beep(700, 90);
  }
  if (t >= st.walkDur + 1.6 && !st.f.w1) {
    st.f.w1 = true;
    ctx.sound.beep(784, 110);
  }
  if (t >= st.walkDur + 1.78 && !st.f.w2) {
    st.f.w2 = true;
    ctx.sound.beep(988, 110);
  }
  if (t >= st.walkDur + 1.96 && !st.f.w3) {
    st.f.w3 = true;
    ctx.sound.beep(1175, 160);
  }
  if (t >= st.walkDur + 3.4 && !st.f.chirp) {
    st.f.chirp = true;
    ctx.sound.beep(560, 70);
  }

  drawSparks(ctx, st, t);
  drawDuck(ctx, st, t);
  drawBubble(ctx, st, t, 'hi SavorySailor', 'the duck has HANDS');

  if (t >= st.dur && !st.ended) {
    st.ended = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
}

export function dispose(ctx) {
  S = null;
}
