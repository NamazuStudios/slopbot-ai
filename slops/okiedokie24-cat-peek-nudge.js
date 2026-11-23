export const meta = {
  title: 'Cat Peek Nudge',
  author: 'okiedokie24',
  prompt: 'viewer types !catpeek in chat, slides a cat\'s head in from the side of the screen so it peeks out, pauses for a couple of seconds, then slides back out of view',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!catpeek"] }
  ],
};

/* ---------- helpers ---------- */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function smooth(a, b, x) {
  const u = clamp((x - a) / (b - a || 1e-6), 0, 1);
  return u * u * (3 - 2 * u);
}
function easeOut(u) { return 1 - Math.pow(1 - clamp(u, 0, 1), 3); }
function easeIn(u) { return Math.pow(clamp(u, 0, 1), 2.4); }

const T = {
  in0: 0.02,
  in1: 1.25,
  settle: 1.75,
  tilt: 3.95,
  tiltEnd: 4.45,
  out0: 7.35,
  out1: 8.55,
  end: 8.78,
};

const BLINKS = [2.35, 4.72, 5.42, 7.0];

const FUR = {
  body: '#E7A24F',
  dark: '#B96E2B',
  stripe: '#C97F35',
  belly: '#FBDBAD',
  inner: '#F2A0AC',
  nose: '#E8798F',
  iris: '#7ED88F',
  pupil: '#17131F',
};

let S = null;

/* ---------- init ---------- */

export function init(ctx) {
  const W = ctx.width || 1920;
  const H = ctx.height || 1080;
  const k = clamp(Math.min(W / 1920, H / 1080), 0.6, 1.5);
  const rnd = () => ctx.rand();

  const rect = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : null;

  const sz = Math.min(H * 0.235, W * 0.2) * 1.0;

  // peek from the side the streamer isn't hugging
  const fromLeft = !rect || rect.x + rect.w * 0.5 > W * 0.45;
  const peekX = fromLeft ? sz * 1.02 + W * 0.012 : W - sz * 1.02 - W * 0.012;
  const hiddenX = fromLeft ? -sz * 1.55 : W + sz * 1.55;
  const headY = H * (rect ? clamp(rect.y + rect.h * 0.52, H * 0.3, H * 0.78) : 0.52);

  // captions sit away from the camera rect where possible
  const capAtTop = !rect || rect.y > H * 0.34;
  const capY = capAtTop ? H * 0.115 : H * 0.885;

  // gaze target: roughly the streamer's face, else mid frame
  const lookX = rect ? rect.x + rect.w * 0.5 : W * 0.5;
  const lookY = rect ? rect.y + rect.h * 0.34 : H * 0.42;

  const captions = [
    { from: 0.95, to: 2.95, text: 'CAT DETECTED', size: 52, color: '#FFE6F0' },
    { from: 3.15, to: 5.35, text: 'SAVORYSAILOR, DO NOT MOVE', size: 33, color: '#FFFFFF' },
    { from: 5.55, to: 7.2, text: 'IT HAS SEEN YOUR GAMEPLAY', size: 32, color: '#BFE8FF' },
    { from: 7.3, to: 8.5, text: 'catpeek concluded', size: 22, color: '#D9CBEA' },
  ];

  const sounds = [];
  const add = (t, play) => sounds.push({ t, play });
  add(0.02, (c) => c.sound.noise(420));
  add(1.24, (c) => c.sound.beep(520, 80));
  add(1.5, (c) => c.sound.beep(760, 70));
  add(1.72, (c) => c.sound.beep(940, 60));
  add(2.35, (c) => c.sound.beep(1240, 34));
  add(3.98, (c) => c.sound.beep(600, 95));
  add(4.16, (c) => c.sound.beep(690, 95));
  add(4.34, (c) => c.sound.beep(820, 120));
  add(5.44, (c) => c.sound.beep(1260, 32));
  add(7.32, (c) => c.sound.noise(460));
  add(8.42, (c) => c.sound.beep(300, 130));
  add(8.56, (c) => c.sound.beep(220, 180));
  sounds.sort((a, b) => a.t - b.t);

  // floating motes that drift while the head is parked (depth, not background)
  const motes = [];
  for (let i = 0; i < 14; i++) {
    motes.push({
      x: rnd() * W,
      y: H * (0.2 + rnd() * 0.65),
      r: (1.4 + rnd() * 3.4) * k,
      sp: 6 + rnd() * 24,
      ph: rnd() * 6.2832,
      a: 0.12 + rnd() * 0.22,
    });
  }

  S = {
    W, H, k, sz,
    fromLeft, peekX, hiddenX, headY,
    lookX, lookY,
    capY,
    captions,
    sounds,
    si: 0,
    motes,
    finished: false,
  };
}

/* ---------- drawing: the cat ---------- */

function blinkAmount(t) {
  let b = 0;
  for (const bt of BLINKS) {
    const d = Math.abs(t - bt);
    if (d < 0.09) b = Math.max(b, 1 - d / 0.09);
  }
  return b;
}

function drawWhisker(g, side, base, len, ang, curve, alpha) {
  g.beginPath();
  g.moveTo(base[0], base[1]);
  g.quadraticCurveTo(
    base[0] + side * len * 0.55,
    base[1] + curve,
    base[0] + side * len,
    base[1] + ang
  );
  g.globalAlpha = alpha;
  g.stroke();
  g.globalAlpha = 1;
}

function drawCat(ctx, t, x, y, alpha) {
  const g = ctx.canvas;
  const s = S.sz;
  const blink = blinkAmount(t);

  // ear twitch around the settle
  const twitch = Math.max(0, 1 - Math.abs(t - 1.86) / 0.34);
  const earL = -0.16 * Math.sin(twitch * Math.PI) - 0.05 * Math.sin(t * 2.1);
  const earR = 0.1 * Math.sin(twitch * Math.PI + 0.5);

  // gaze drift
  const dx = clamp((S.lookX - x) / (S.W * 0.5), -1, 1);
  const dy = clamp((S.lookY - y) / (S.H * 0.5), -1, 1);
  const lookA = 0.1 + 0.06 * Math.sin(t * 0.9);
  const px = dx * 0.13 * s * lookA * 8;
  const py = dy * 0.1 * s * lookA * 8;

  g.save();
  g.translate(x, y);
  g.globalAlpha = alpha;

  // soft shadow cast on the stream behind the head
  const sh = g.createRadialGradient(0, 0, s * 0.25, 0, 0, s * 1.7);
  sh.addColorStop(0, 'rgba(8,6,16,0.4)');
  sh.addColorStop(0.7, 'rgba(8,6,16,0.16)');
  sh.addColorStop(1, 'rgba(8,6,16,0)');
  g.fillStyle = sh;
  g.beginPath();
  g.ellipse(0, 0, s * 1.7, s * 1.55, 0, 0, 6.2832);
  g.fill();

  // ---- ears ----
  const earPath = (dir, lift) => {
    const bx = dir * s * 0.62;
    const tipX = dir * s * 0.92;
    const tipY = -s * (1.5 + lift);
    g.beginPath();
    g.moveTo(bx - dir * s * 0.28, -s * 0.62);
    g.quadraticCurveTo(bx - dir * s * 0.08, -s * 1.05, tipX, tipY);
    g.quadraticCurveTo(bx + dir * s * 0.34, -s * 0.95, bx + dir * s * 0.5, -s * 0.5);
    g.closePath();
  };

  for (const [dir, lift] of [[-1, earL], [1, earR]]) {
    earPath(dir, lift);
    g.fillStyle = FUR.dark;
    g.fill();
    g.strokeStyle = 'rgba(70,40,18,0.5)';
    g.lineWidth = s * 0.02;
    g.stroke();

    // inner ear
    g.save();
    g.translate(dir * s * 0.76, -s * 1.06 - lift * s * 0.5);
    g.rotate(dir * (0.18 + lift * 0.4));
    g.fillStyle = FUR.inner;
    g.beginPath();
    g.ellipse(0, 0, s * 0.17, s * 0.32, 0, 0, 6.2832);
    g.fill();
    g.restore();
  }

  // ---- head silhouette ----
  g.beginPath();
  g.moveTo(-s * 1.06, -s * 0.12);
  // cheek fluff, left
  g.bezierCurveTo(-s * 1.3, s * 0.14, -s * 1.18, s * 0.52, -s * 0.94, s * 0.62);
  g.bezierCurveTo(-s * 0.62, s * 0.86, s * 0.62, s * 0.86, s * 0.94, s * 0.62);
  g.bezierCurveTo(s * 1.2, s * 0.5, s * 1.32, s * 0.1, s * 1.06, -s * 0.14);
  g.bezierCurveTo(s * 1.02, -s * 0.62, s * 0.8, -s * 0.86, s * 0.5, -s * 0.88);
  g.bezierCurveTo(s * 0.2, -s * 0.98, -s * 0.2, -s * 0.98, -s * 0.5, -s * 0.88);
  g.bezierCurveTo(-s * 0.82, -s * 0.86, -s * 1.02, -s * 0.6, -s * 1.06, -s * 0.12);
  g.closePath();
  g.fillStyle = FUR.body;
  g.fill();
  g.strokeStyle = 'rgba(88,48,18,0.45)';
  g.lineWidth = s * 0.022;
  g.stroke();

  // neck fluff tapering below
  g.beginPath();
  g.moveTo(-s * 0.86, s * 0.55);
  g.quadraticCurveTo(-s * 0.7, s * 1.08, 0, s * 1.16);
  g.quadraticCurveTo(s * 0.7, s * 1.08, s * 0.86, s * 0.55);
  g.quadraticCurveTo(s * 0.5, s * 0.78, 0, s * 0.78);
  g.quadraticCurveTo(-s * 0.5, s * 0.78, -s * 0.86, s * 0.55);
  g.closePath();
  g.fillStyle = FUR.belly;
  g.fill();

  // ---- fur tufts along the cheeks ----
  g.fillStyle = FUR.body;
  g.strokeStyle = 'rgba(88,48,18,0.3)';
  g.lineWidth = s * 0.015;
  for (let i = 0; i < 4; i++) {
    const yy = -s * 0.28 + i * s * 0.24;
    for (const dir of [-1, 1]) {
      g.beginPath();
      g.moveTo(dir * s * 0.96, yy);
      g.lineTo(dir * s * (1.2 + 0.04 * Math.sin(t * 2 + i)), yy + s * 0.12);
      g.lineTo(dir * s * 0.95, yy + s * 0.18);
      g.closePath();
      g.fill();
    }
  }

  // ---- tabby stripes on the forehead ----
  g.strokeStyle = 'rgba(160,90,32,0.55)';
  g.lineCap = 'round';
  g.lineWidth = s * 0.055;
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(i * s * 0.27, -s * 0.84);
    g.quadraticCurveTo(i * s * 0.33, -s * 0.66, i * s * 0.22, -s * 0.5);
    g.stroke();
  }

  // ---- muzzle ----
  g.fillStyle = FUR.belly;
  g.beginPath();
  g.ellipse(-s * 0.19, s * 0.4, s * 0.32, s * 0.24, 0, 0, 6.2832);
  g.fill();
  g.beginPath();
  g.ellipse(s * 0.19, s * 0.4, s * 0.32, s * 0.24, 0, 0, 6.2832);
  g.fill();

  // nose
  g.fillStyle = FUR.nose;
  g.beginPath();
  g.moveTo(-s * 0.1, s * 0.24);
  g.quadraticCurveTo(0, s * 0.18, s * 0.1, s * 0.24);
  g.quadraticCurveTo(s * 0.08, s * 0.36, 0, s * 0.39);
  g.quadraticCurveTo(-s * 0.08, s * 0.36, -s * 0.1, s * 0.24);
  g.closePath();
  g.fill();

  // mouth
  g.strokeStyle = 'rgba(90,48,28,0.75)';
  g.lineWidth = s * 0.024;
  g.beginPath();
  g.moveTo(0, s * 0.39);
  g.quadraticCurveTo(0, s * 0.48, -s * 0.1, s * 0.48);
  g.moveTo(0, s * 0.39);
  g.quadraticCurveTo(0, s * 0.48, s * 0.1, s * 0.48);
  g.stroke();

  // ---- eyes ----
  for (const dir of [-1, 1]) {
    const ex = dir * s * 0.42;
    const ey = -s * 0.14;

    // socket shading
    g.fillStyle = 'rgba(255,240,214,0.5)';
    g.beginPath();
    g.ellipse(ex, ey, s * 0.31, s * 0.29, 0, 0, 6.2832);
    g.fill();

    if (blink > 0.72) {
      // closed lid
      g.strokeStyle = 'rgba(45,26,14,0.9)';
      g.lineWidth = s * 0.045;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(ex, ey - s * 0.02, s * 0.25, 0.14 * Math.PI, 0.86 * Math.PI);
      g.stroke();
    } else {
      const open = 1 - blink;
      g.save();
      g.beginPath();
      g.ellipse(ex, ey, s * 0.28, s * 0.27 * open, 0, 0, 6.2832);
      g.clip();

      g.fillStyle = '#FBF6E4';
      g.fillRect(ex - s * 0.3, ey - s * 0.3, s * 0.6, s * 0.6);

      g.fillStyle = FUR.iris;
      g.beginPath();
      g.ellipse(ex + px, ey + py, s * 0.19, s * 0.21, 0, 0, 6.2832);
      g.fill();

      g.fillStyle = 'rgba(60,130,80,0.55)';
      g.beginPath();
      g.ellipse(ex + px, ey + py + s * 0.07, s * 0.17, s * 0.09, 0, 0, 6.2832);
      g.fill();

      g.fillStyle = FUR.pupil;
      g.beginPath();
      g.ellipse(ex + px, ey + py, s * 0.075, s * 0.19 * open, 0, 0, 6.2832);
      g.fill();

      g.fillStyle = 'rgba(255,255,255,0.85)';
      g.beginPath();
      g.ellipse(ex + px - s * 0.07, ey + py - s * 0.09, s * 0.05, s * 0.05, 0, 0, 6.2832);
      g.fill();

      g.restore();

      // lid rim
      g.strokeStyle = 'rgba(45,26,14,0.7)';
      g.lineWidth = s * 0.03;
      g.beginPath();
      g.ellipse(ex, ey, s * 0.28, s * 0.27 * open, 0, 0, 6.2832);
      g.stroke();
    }
  }

  // brow dots (those little judgmental marks cats have)
  g.strokeStyle = 'rgba(120,66,26,0.5)';
  g.lineWidth = s * 0.045;
  g.lineCap = 'round';
  for (const dir of [-1, 1]) {
    g.beginPath();
    g.moveTo(dir * s * 0.3, -s * 0.5);
    g.lineTo(dir * s * 0.56, -s * 0.52);
    g.stroke();
  }

  // ---- whiskers ----
  g.strokeStyle = 'rgba(255,252,246,0.85)';
  g.lineWidth = s * 0.018;
  const wSway = Math.sin(t * 1.6) * s * 0.04;
  for (const dir of [-1, 1]) {
    drawWhisker(g, dir, [dir * s * 0.26, s * 0.4], s * 0.72, -s * 0.2 + wSway, -s * 0.08, 0.8);
    drawWhisker(g, dir, [dir * s * 0.26, s * 0.46], s * 0.78, 0 + wSway, s * 0.02, 0.75);
    drawWhisker(g, dir, [dir * s * 0.24, s * 0.51], s * 0.68, s * 0.22 + wSway, s * 0.1, 0.65);
  }

  // rim light from the stream
  g.strokeStyle = 'rgba(255,231,198,0.35)';
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.arc(0, 0, s * 1.0, Math.PI * 1.15, Math.PI * 1.62);
  g.stroke();

  g.restore();
}

/* ---------- drawing: captions ---------- */

function drawCaption(ctx, t, cap, y) {
  if (t < cap.from || t > cap.to) return;
  const g = ctx.canvas;
  const k = S.k;
  const a = Math.min(
    smooth(cap.from, cap.from + 0.2, t),
    1 - smooth(cap.to - 0.3, cap.to, t)
  );
  if (a <= 0.002) return;

  const pop = 1 + 0.08 * Math.exp(-Math.max(0, t - cap.from) * 8);
  const fs = cap.size * k * pop;

  g.save();
  g.globalAlpha = a;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.font = `800 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
  g.lineWidth = Math.max(4, fs * 0.18);
  g.strokeStyle = 'rgba(12,10,22,0.8)';
  g.strokeText(cap.text, S.W / 2, y);
  g.fillStyle = cap.color || '#FFFFFF';
  g.fillText(cap.text, S.W / 2, y);
  g.restore();
}

/* ---------- frame ---------- */

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);
  if (!S) init(ctx);

  const step = clamp(dt || 0, 0, 0.06);

  // scheduled sounds
  while (S.si < S.sounds.length && t >= S.sounds[S.si].t) {
    const snd = S.sounds[S.si++];
    if (t - snd.t < 0.35) {
      try { snd.play(ctx); } catch (e) { /* the host owns the mix */ }
    }
  }

  // ---- slide motion ----
  const dirSign = S.fromLeft ? 1 : -1;
  let x = S.hiddenX;
  let alpha = 1;

  if (t >= T.out0) {
    const u = easeIn((t - T.out0) / (T.out1 - T.out0));
    x = S.peekX + (S.hiddenX - S.peekX) * u;
    alpha = 1 - smooth(T.out1 - 0.35, T.out1, t) * 0.9;
  } else if (t >= T.in0) {
    const u = easeOut((t - T.in0) / (T.in1 - T.in0));
    x = S.hiddenX + (S.peekX - S.hiddenX) * u;
    // little overshoot on arrival
    if (t > T.in1 - 0.28) {
      x += dirSign * Math.sin((t - (T.in1 - 0.28)) * 13) * S.sz * 0.05 *
        (1 - smooth(T.in1 - 0.28, T.in1 + 0.12, t));
    }
  } else {
    return; // head still offscreen
  }

  // vertical peek bob: dips, then lifts to peer over the edge
  const bob = -Math.sin(smooth(T.in0, T.in1, t) * Math.PI) * S.sz * 0.06;

  // head tilt during the look-around beat
  const tiltU = smooth(T.tilt, T.tilt + 0.18, t) * (1 - smooth(T.tiltEnd - 0.18, T.tiltEnd, t));
  const tilt = tiltU * 0.16 * dirSign * Math.sin(t * 1.7);

  // idle sway while parked
  const sway = Math.sin(t * 1.35) * S.sz * 0.014;
  const y = S.headY + bob + Math.sin(t * 2.2) * S.sz * 0.008;

  // ---- ambient motes ----
  for (const m of S.motes) {
    const my = (m.y - t * m.sp) % (H * 1.1);
    const yy = my < 0 ? my + H * 1.1 : my;
    const mx = m.x + Math.sin(t * 0.7 + m.ph) * 18 * S.k;
    g.globalAlpha = m.a * (0.55 + 0.45 * Math.sin(t * 1.8 + m.ph));
    g.fillStyle = '#FFE9F4';
    g.beginPath();
    g.arc(mx, yy, m.r, 0, 6.2832);
    g.fill();
  }
  g.globalAlpha = 1;

  // ---- the cat ----
  g.save();
  g.translate(x + sway, y);
  g.rotate(tilt);
  g.translate(-(x + sway), -y);
  drawCat(ctx, t, x + sway, y, alpha);
  g.restore();

  // ---- captions ----
  for (const cap of S.captions) drawCaption(ctx, t, cap, S.capY);

  // ---- the end ----
  if (t >= T.end && !S.finished) {
    S.finished = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
