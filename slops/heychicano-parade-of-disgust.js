export const meta = {
  title: 'Parade Of Disgust',
  author: 'heychicano',
  prompt: '15 people walking around having a good time until they walk past the streamer and each one shows a different level of disgust. except for the last one that falls in love and feels shy and then kisses streamer on the cheek in a wholesome way.',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

const END_T = 34.8;
const KISS_T = 27.5;
const LOVE_SPAWN = 21.6;
const LOVE_ARRIVE = 25.0;

let state = null;
let ended = false;

/* ---------- tiny math ---------- */

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function easeOutCubic(t) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function ellipse(g, x, y, rx, ry, rot) {
  g.beginPath();
  g.ellipse(x, y, Math.max(0.01, Math.abs(rx)), Math.max(0.01, Math.abs(ry)), rot || 0, 0, Math.PI * 2);
}

function roundRectPath(g, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) * 0.5, Math.abs(h) * 0.5);
  g.beginPath();
  if (g.roundRect) {
    g.roundRect(x, y, w, h, rr);
    return;
  }
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

function heartPath(g, x, y, s) {
  g.beginPath();
  g.moveTo(x, y + s);
  g.bezierCurveTo(x - s * 1.35, y - s * 0.25, x - s * 0.62, y - s * 1.2, x, y - s * 0.42);
  g.bezierCurveTo(x + s * 0.62, y - s * 1.2, x + s * 1.35, y - s * 0.25, x, y + s);
  g.closePath();
}

/* ---------- cast ---------- */

const PEOPLE = [
  { skin: '#f6cfae', hair: '#2e2420', shirt: '#5ad0a8', pants: '#33415c', shoe: '#22283a', style: 'bob', prop: 'balloon', balloon: '#ff7ab6' },
  { skin: '#8d5a3b', hair: '#1c1614', shirt: '#ffd166', pants: '#3a3352', shoe: '#232030', style: 'spiky', prop: 'icecream' },
  { skin: '#e8b48c', hair: '#b5651d', shirt: '#7fb2ff', pants: '#2d3f57', shoe: '#1f2a3c', style: 'bun', prop: 'phone' },
  { skin: '#f2d3b8', hair: '#d8c26a', shirt: '#ff9f68', pants: '#403a5a', shoe: '#22203a', style: 'cap', prop: 'balloon', balloon: '#8fe3ff' },
  { skin: '#6b4630', hair: '#241a17', shirt: '#c8a6ff', pants: '#2f3a4f', shoe: '#1d2434', style: 'long', prop: null },
  { skin: '#f0c19a', hair: '#413026', shirt: '#8ee08a', pants: '#374264', shoe: '#232a40', style: 'curly', prop: 'icecream' },
  { skin: '#d9a273', hair: '#5a3a22', shirt: '#ff8fa3', pants: '#2e3a55', shoe: '#202738', style: 'ponytail', prop: null },
  { skin: '#f8d9c0', hair: '#9a7bea', shirt: '#ffe27a', pants: '#3a4668', shoe: '#242c46', style: 'beanie', prop: null },
  { skin: '#a86b45', hair: '#141010', shirt: '#67e0d0', pants: '#2b3550', shoe: '#1c2434', style: 'bob', prop: 'phone' },
  { skin: '#f1c8a8', hair: '#8c3b2c', shirt: '#d4f07a', pants: '#3c3a5e', shoe: '#232238', style: 'spiky', prop: null },
  { skin: '#7a4f36', hair: '#2a1d18', shirt: '#ffb3d9', pants: '#313c5c', shoe: '#1e253a', style: 'long', prop: null },
  { skin: '#f7d2b3', hair: '#3b3b45', shirt: '#9fd6ff', pants: '#2f3a54', shoe: '#212938', style: 'cap', prop: null },
  { skin: '#c48a5f', hair: '#1a1412', shirt: '#ffd0a1', pants: '#373f5e', shoe: '#222840', style: 'bun', prop: null },
  { skin: '#f3c9a4', hair: '#6b4a2f', shirt: '#8affc1', pants: '#2c3852', shoe: '#1d2536', style: 'curly', prop: null },
  { skin: '#f6d6bd', hair: '#e0a3c8', shirt: '#ff9ec4', pants: '#4a3a66', shoe: '#2a2140', style: 'long', prop: null },
];

const DISGUST = [
  { meter: 0.08, bubble: 'hm', face: { eye: 0.85, brow: 0.45, browTilt: 0.35, mouth: 'tight' }, body: { lean: 0.03 }, hand: null },
  { meter: 0.15, bubble: 'oh', face: { eye: 0.65, brow: 0.85, mouth: 'o', open: 0.2 }, body: { lean: -0.03 }, hand: null },
  { meter: 0.22, bubble: '??', face: { eye: 0.55, brow: 1.0, browTilt: -0.4, mouth: 'flat' }, body: { lean: -0.07 }, hand: null },
  { meter: 0.3, bubble: 'eww', face: { eye: 0.5, eyeClosed: 0.6, brow: 0.55, browTilt: 0.8, mouth: 'tight' }, body: { lean: -0.05 }, hand: 'nose' },
  { meter: 0.37, bubble: 'ugh', face: { eye: 0.4, brow: 0.5, browTilt: 0.95, mouth: 'snarl' }, body: { lean: -0.09 }, hand: 'nose', stink: 0.3 },
  { meter: 0.45, bubble: '!?', face: { eye: 1.45, brow: 0.15, mouth: 'o', open: 0.45 }, body: { lean: -0.11 }, hand: null, sweat: 0.7 },
  { meter: 0.53, bubble: 'bleh', face: { eye: 0.18, eyeClosed: 1, brow: 0.1, mouth: 'gag', open: 0.7 }, body: { lean: 0.12 }, hand: null, stink: 0.4 },
  { meter: 0.6, bubble: 'GAG', face: { eye: 0.22, mouth: 'gag', open: 0.95 }, body: { lean: 0.32 }, hand: null },
  { meter: 0.66, bubble: 'nope', face: { eye: 1.1, mouth: 'flat' }, body: { lean: -0.06 }, hand: 'eyes' },
  { meter: 0.72, bubble: 'wth', face: { eye: 0.3, brow: 0.9, browTilt: 1.0, mouth: 'snarl' }, body: { lean: -0.16 }, hand: 'fan', stink: 0.5 },
  { meter: 0.79, bubble: 'OW', face: { eye: 0.45, mouth: 'scream', open: 0.55 }, body: { lean: -0.1 }, hand: 'chest', stink: 0.7, tear: 0.6 },
  { meter: 0.86, bubble: '!!!', face: { eye: 1.7, mouth: 'scream', open: 0.8 }, body: { lean: -0.28 }, hand: 'up', stink: 0.9 },
  { meter: 0.93, bubble: 'x_x', face: { xEyes: 1, mouth: 'wobble' }, body: { lean: -0.5 }, hand: null },
  { meter: 1.0, bubble: 'AAAA', face: { eye: 1.4, mouth: 'scream', open: 1 }, body: { lean: -0.34 }, hand: 'up', stink: 1 },
];

const CAPTIONS = [
  { at: 0.25, until: 2.6, text: 'Fifteen strangers are out having a lovely day. SavorySailor is simply standing there.' },
  { at: 2.8, until: 5.0, text: 'Person one rates SavorySailor: a polite wince. Nothing personal, allegedly.' },
  { at: 5.2, until: 7.6, text: 'Person three is squinting. Person four is pinching their nose. It is not the nose\u2019s fault.' },
  { at: 7.8, until: 10.2, text: 'Person five is appalled. Person six brought an entire facial expression to a public place.' },
  { at: 10.4, until: 12.8, text: 'Person seven is gagging. Person eight has practically made it a sport.' },
  { at: 13.0, until: 15.4, text: 'Person nine is covering her eyes. Person ten is fanning herself like it is a crime scene.' },
  { at: 15.6, until: 18.0, text: 'Person eleven is clutching her chest. Person twelve is screaming now. Indoors.' },
  { at: 18.2, until: 20.4, text: 'Person thirteen has fainted. Person fourteen is running. Fourteen out of fourteen, then.' },
  { at: 20.8, until: 24.6, text: 'Wait. Person fifteen has stopped walking. She does not look disgusted at all.' },
  { at: 24.8, until: 27.2, text: 'She is blushing. SavorySailor, do not make this weird.' },
  { at: 27.4, until: 30.2, text: 'That was a kiss. On the cheek. A wholesome one. On live television.' },
  { at: 30.4, until: 34.8, text: 'Final result: fourteen strangers appalled, one stranger in love. Pick a lane, chat.' },
];

const FACE_BASE = {
  eye: 1,
  eyeClosed: 0,
  xEyes: 0,
  heartEyes: 0,
  brow: 0.2,
  browTilt: 0.05,
  mouth: 'smile',
  open: 0,
  lookX: 0,
  lookY: 0,
  blush: 0,
  sweat: 0,
  tear: 0,
};

/* ---------- layout / state ---------- */

function getCam(ctx) {
  if (ctx.streamer && ctx.streamer.w > 0 && ctx.streamer.h > 0) {
    return {
      x: ctx.streamer.x * ctx.width,
      y: ctx.streamer.y * ctx.height,
      w: ctx.streamer.w * ctx.width,
      h: ctx.streamer.h * ctx.height,
    };
  }
  return null;
}

function buildState(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const cam = getCam(ctx);
  const rect = cam || { x: W * 0.1, y: H * 0.12, w: W * 0.8, h: H * 0.68 };
  const S = clamp(Math.min(W, H) / 720, 0.55, 2.6) * 0.98;
  const laneY = clamp(rect.y + rect.h + H * 0.012, H * 0.45, H * 0.965);
  const camCx = rect.x + rect.w * 0.5;
  const startX = -0.14 * W;
  const endX = 1.14 * W;
  const speed = (endX - startX) / 4.7;

  const walkers = [];
  for (let i = 0; i < 14; i++) {
    const spawn = 0.35 + i * 1.3;
    const crossT = spawn + (camCx - startX) / speed;
    walkers.push({
      ...PEOPLE[i],
      idx: i,
      x0: startX,
      speed,
      spawn,
      crossT,
      s: S * (0.92 + ctx.rand() * 0.15),
      phase: ctx.rand() * Math.PI * 2,
      phaseSpeed: 6.6 + ctx.rand() * 1.2,
      profile: DISGUST[i],
    });
  }

  const love = {
    ...PEOPLE[14],
    s: S * 1.02,
    phase: 0,
  };

  const loveStopX = clamp(rect.x + rect.w * 0.16, W * 0.17, W * 0.36);
  const kissX = rect.x + rect.w * 0.26;
  const kissY = rect.y + rect.h * 0.33;

  const hearts = [];
  for (let i = 0; i < 42; i++) {
    hearts.push({
      at: 24.2 + i * 0.24 + ctx.rand() * 0.16,
      x: rect.x + rect.w * (0.1 + ctx.rand() * 0.26) + (i % 2 ? 44 : -18),
      y: H * (0.48 + ctx.rand() * 0.18),
      rise: 90 + ctx.rand() * 150,
      wob: 9 + ctx.rand() * 24,
      life: 1.5 + ctx.rand() * 1.2,
      size: (8 + ctx.rand() * 10) * Math.max(0.7, S),
      alpha: 0.5 + ctx.rand() * 0.5,
      color: ['#ff7ab6', '#ff9ec4', '#ff5f9e', '#ffcadf'][i % 4],
      seed: ctx.rand(),
    });
  }

  const st = {
    W,
    H,
    S,
    cam,
    rect,
    camCx,
    laneY,
    walkers,
    love,
    loveScale: love.s,
    loveStopX,
    kissX,
    kissY,
    hearts,
    captions: CAPTIONS,
    sounds: [],
    sndIdx: 0,
  };

  st.sounds = buildSounds(st);
  return st;
}

function buildSounds(st) {
  const snd = [];
  const add = (at, fn) => snd.push([at, fn]);

  for (let i = 0; i < 6; i++) {
    add(0.22 + i * 0.38, (c) => {
      c.sound.beep(500 + (i % 3) * 70, 90);
    });
  }

  st.walkers.forEach((w, i) => {
    const base = 480 - i * 22;
    add(w.crossT - 0.45, (c) => c.sound.beep(base, 80));
    add(w.crossT - 0.12, (c) => {
      c.sound.beep(base * 0.75, 110);
      c.sound.noise(55);
    });
    if (i >= 5) add(w.crossT + 0.25, (c) => c.sound.noise(115));
    if (i >= 10) {
      add(w.crossT + 0.5, (c) => {
        c.sound.beep(96, 210);
        c.sound.noise(140);
      });
    }
  });

  [523, 659, 784, 1047].forEach((f, i) => {
    add(22.3 + i * 0.17, (c) => c.sound.beep(f, 150));
  });
  add(23.2, (c) => c.sound.beep(1319, 120));

  [25.1, 25.9, 26.7].forEach((at) => {
    add(at, (c) => {
      c.sound.beep(120, 90);
      c.sound.beep(96, 110);
    });
  });

  add(KISS_T, (c) => {
    c.sound.beep(1250, 60);
    c.sound.beep(1650, 70);
    c.sound.noise(40);
  });
  add(KISS_T + 0.12, (c) => c.sound.beep(880, 220));

  [28.4, 29.2, 30.0].forEach((at, i) => {
    add(at, (c) => c.sound.beep(1046 + i * 90, 110));
  });

  add(31.4, (c) => {
    c.sound.beep(523, 170);
    c.sound.beep(659, 170);
  });
  add(31.75, (c) => {
    c.sound.beep(784, 210);
    c.sound.beep(1047, 250);
  });
  add(33.4, (c) => {
    c.sound.beep(659, 200);
    c.sound.beep(1047, 300);
  });

  snd.sort((a, b) => a[0] - b[0]);
  return snd;
}

/* ---------- walker logic ---------- */

function reactOf(w, t) {
  return (
    smooth(clamp((t - (w.crossT - 0.62)) / 0.34, 0, 1)) *
    (1 - smooth(clamp((t - (w.crossT + 0.55)) / 0.6, 0, 1)))
  );
}

function haterPose(st, w, t) {
  let x = w.x0 + w.speed * (t - w.spawn);
  const react = reactOf(w, t);
  let lean = (w.profile.body.lean || 0) * react;
  const bobY = Math.sin(w.phase * 2) * 3.2;
  const face = haterFace(st, w, react);
  return {
    x,
    bobY,
    lean,
    phase: w.phase + t * w.phaseSpeed,
    walk: 1,
    react,
    hand: react > 0.3 ? w.profile.hand : null,
    face,
    propAlpha: 1 - clamp(react * 1.6, 0, 1),
  };
}

function haterFace(st, w, a) {
  const pr = w.profile.face || {};
  const f = { ...FACE_BASE };
  f.eye = lerp(1, pr.eye == null ? 1 : pr.eye, a);
  f.eyeClosed = lerp(0, pr.eyeClosed || 0, a);
  f.brow = lerp(0.2, pr.brow == null ? 0.2 : pr.brow, a);
  f.browTilt = lerp(0.05, pr.browTilt == null ? 0.1 : pr.browTilt, a);
  f.open = lerp(0, pr.open || 0, a);
  if (a > 0.45) f.mouth = pr.mouth || 'flat';
  else if (a > 0.15) f.mouth = 'flat';
  else f.mouth = 'smile';
  f.lookX = clamp((st.camCx - w.x0) / (st.W * 0.5), -0.55, 0.55) + 0.35;
  f.lookX = clamp(f.lookX, -1, 1) * a;
  f.lookY = -0.25 * a;
  f.sweat = (w.profile.sweat || 0) * a;
  f.tear = (w.profile.tear || 0) * a;
  f.xEyes = pr.xEyes ? (a > 0.6 ? 1 : 0) : 0;
  return f;
}

function loveX(st, t) {
  const W = st.W;
  const x0 = -0.16 * W;
  const stop = st.loveStopX;
  if (t <= LOVE_SPAWN) return x0;
  if (t < LOVE_ARRIVE) {
    const u = (t - LOVE_SPAWN) / (LOVE_ARRIVE - LOVE_SPAWN);
    return lerp(x0, stop, smooth(u));
  }
  if (t < 30.6) return stop;
  const u = clamp((t - 30.6) / 3.6, 0, 1);
  return lerp(stop, x0 - 20, u * u);
}

function lovePose(st, t) {
  const x = loveX(st, t);
  let walk = 0;
  if (t < 24.6) walk = 1;
  else if (t < 25.2) walk = 1 - smooth((t - 24.6) / 0.6);
  else if (t > 30.8) walk = smooth((t - 30.8) / 0.6);

  const phase = t * 6.0;
  let bobY = Math.sin(phase * 2) * 3 * walk;
  let lean = 0;
  let hand = null;

  const tiptoe =
    smooth(clamp((t - 26.85) / 0.45, 0, 1)) * (1 - smooth(clamp((t - 28.15) / 0.35, 0, 1)));
  bobY -= tiptoe * 9;
  lean += tiptoe * 0.17;

  if (t > 28.2 && t < 30.8) lean += Math.sin(t * 2.2) * 0.025;

  if (t > 25.0 && t < 26.4) hand = 'clasp';
  else if (t >= 26.4 && t < 26.9) hand = 'cheek';
  else if (t >= 26.9 && t < 28.2) hand = 'clasp';
  else if (t >= 28.2 && t < 30.6) hand = 'cheek';
  else if (t >= 30.6) hand = 'wave';

  return {
    x,
    bobY,
    lean,
    phase,
    walk,
    react: 1,
    hand,
    face: loveFace(t),
    propAlpha: 0,
  };
}

function loveFace(t) {
  const f = { ...FACE_BASE };
  if (t < 24.9) return f;
  const shy = smooth(clamp((t - 24.6) / 1.2, 0, 1));
  f.blush = shy * (t < 29.8 ? 1 : 0.65);
  if (t < 26.4) {
    f.heartEyes = 1;
    f.brow = 0.6;
    f.lookX = 0.9;
    f.mouth = 'smile';
  } else if (t < 26.9) {
    f.heartEyes = 0.7;
    f.lookX = -1;
    f.lookY = 0.3;
    f.brow = 0.5;
    f.mouth = 'tight';
  } else if (t < 28.2) {
    f.eyeClosed = 1;
    f.brow = 0.5;
    f.mouth = 'kiss';
  } else if (t < 30.6) {
    f.eyeClosed = 1;
    f.brow = 0.55;
    f.mouth = 'smile';
  } else {
    f.mouth = 'smile';
    f.brow = 0.3;
    f.heartEyes = t < 31.6 ? 1 : 0;
    f.lookX = 0.3;
  }
  return f;
}

/* ---------- drawing: character ---------- */

function drawWalker(g, st, w, t, pose) {
  g.save();
  g.translate(pose.x, st.laneY + pose.bobY);
  g.scale(w.s, w.s);
  g.translate(0, -80);
  g.rotate(pose.lean);
  g.translate(0, 80);

  const phase = pose.phase;

  drawLeg(g, -11, phase, pose.walk, w.pants, w.shoe);
  drawLeg(g, 11, phase + Math.PI, pose.walk, w.pants, w.shoe);

  g.beginPath();
  g.moveTo(-22, -124);
  g.quadraticCurveTo(0, -132, 22, -124);
  g.lineTo(18, -64);
  g.quadraticCurveTo(0, -56, -18, -64);
  g.closePath();
  g.fillStyle = w.shirt;
  g.fill();
  g.lineWidth = 2.6;
  g.strokeStyle = 'rgba(16,14,26,0.4)';
  g.stroke();

  drawArms(g, w, pose, t);

  g.fillStyle = w.skin;
  g.fillRect(-6, -142, 12, 18);

  drawHead(g, w, pose.face, t);

  if (w.prop && pose.propAlpha > 0.02) drawProp(g, w, pose, t);

  g.restore();
}

function drawLeg(g, hipX, phase, walk, pants, shoe) {
  const hipY = -66;
  const a = Math.sin(phase) * 0.45 * walk;
  const kx = hipX + Math.sin(a) * 34;
  const ky = hipY + Math.cos(a) * 34;
  const bend = Math.max(0, Math.sin(phase + 0.9)) * 0.4 * walk;
  const b = a - bend;
  const fx = kx + Math.sin(b) * 33;
  const fy = ky + Math.cos(b) * 33;

  g.lineCap = 'round';
  g.strokeStyle = pants;
  g.lineWidth = 14;
  g.beginPath();
  g.moveTo(hipX, hipY);
  g.lineTo(kx, ky);
  g.stroke();
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(kx, ky);
  g.lineTo(fx, fy);
  g.stroke();

  g.save();
  g.translate(fx, fy);
  g.rotate(b * 0.5);
  ellipse(g, 3, 3, 10.5, 5.6, 0);
  g.fillStyle = shoe;
  g.fill();
  g.restore();
}

function drawArms(g, w, pose, t) {
  const handAmt = clamp((pose.react - 0.2) / 0.4, 0, 1);
  for (const side of [-1, 1]) {
    const sx = side * 21;
    const sy = -116;
    const swing = Math.sin(pose.phase + (side > 0 ? Math.PI : 0)) * 0.55 * pose.walk;
    let ex = sx + Math.sin(swing) * 25;
    let ey = sy + Math.cos(swing) * 25;
    let hx = ex + Math.sin(swing + 0.3) * 23;
    let hy = ey + Math.cos(swing + 0.3) * 23;

    const sp = specialHand(side, pose.hand, t);
    if (sp) {
      ex = lerp(ex, sp.ex, handAmt);
      ey = lerp(ey, sp.ey, handAmt);
      hx = lerp(hx, sp.hx, handAmt);
      hy = lerp(hy, sp.hy, handAmt);
    }

    g.lineCap = 'round';
    g.strokeStyle = w.shirt;
    g.lineWidth = 11;
    g.beginPath();
    g.moveTo(sx, sy);
    g.lineTo(ex, ey);
    g.stroke();

    g.strokeStyle = w.skin;
    g.lineWidth = 9.5;
    g.beginPath();
    g.moveTo(ex, ey);
    g.lineTo(hx, hy);
    g.stroke();

    ellipse(g, hx, hy, 5.6, 5.6, 0);
    g.fillStyle = w.skin;
    g.fill();
    g.lineWidth = 1.8;
    g.strokeStyle = 'rgba(16,14,26,0.35)';
    g.stroke();
  }
}

function specialHand(side, mode, t) {
  if (!mode) return null;
  const wob = Math.sin(t * 9) * 3;
  if (mode === 'nose') {
    if (side < 0) return null;
    return { ex: 22, ey: -150, hx: 6, hy: -172 };
  }
  if (mode === 'eyes') {
    return { ex: side * 24, ey: -152, hx: side * 11, hy: -172 };
  }
  if (mode === 'fan') {
    if (side < 0) return null;
    return { ex: 26, ey: -150, hx: 26 + wob, hy: -172 + Math.cos(t * 9) * 3 };
  }
  if (mode === 'chest') {
    return { ex: side * 18, ey: -104, hx: side * 8, hy: -112 };
  }
  if (mode === 'clasp') {
    return { ex: side * 16, ey: -124, hx: side * 2, hy: -142 };
  }
  if (mode === 'cheek') {
    return { ex: side * 22, ey: -148, hx: side * 18, hy: -160 + wob * 0.3 };
  }
  if (mode === 'up') {
    return { ex: side * 30, ey: -160, hx: side * 34 + wob, hy: -196 };
  }
  if (mode === 'wave') {
    if (side < 0) return null;
    return { ex: 30, ey: -158, hx: 38 + wob, hy: -194 };
  }
  return null;
}

function drawHead(g, w, f, t) {
  g.save();
  g.translate(0, -166);

  if (w.style === 'long') {
    g.fillStyle = w.hair;
    g.beginPath();
    g.moveTo(-27, -10);
    g.quadraticCurveTo(-36, 24, -26, 34);
    g.quadraticCurveTo(0, 44, 26, 34);
    g.quadraticCurveTo(36, 24, 27, -10);
    g.closePath();
    g.fill();
  } else if (w.style === 'ponytail') {
    g.fillStyle = w.hair;
    ellipse(g, 27, -6, 11, 12, 0.4);
    g.fill();
    ellipse(g, 31, 6, 9, 12, 0.5);
    g.fill();
  }

  for (const side of [-1, 1]) {
    ellipse(g, side * 26, 4, 6.5, 8, 0);
    g.fillStyle = w.skin;
    g.fill();
    g.lineWidth = 2.2;
    g.strokeStyle = 'rgba(20,14,26,0.4)';
    g.stroke();
  }

  ellipse(g, 0, 0, 26, 27, 0);
  g.fillStyle = w.skin;
  g.fill();
  g.lineWidth = 2.6;
  g.strokeStyle = 'rgba(20,14,26,0.5)';
  g.stroke();

  drawHair(g, w);

  drawEyes(g, f);
  drawBrows(g, f);
  drawMouth(g, f);

  if (f.blush > 0.02) {
    for (const side of [-1, 1]) {
      const a = 0.6 * clamp(f.blush, 0, 1);
      const grd = g.createRadialGradient(side * 16, 9, 1, side * 16, 9, 10);
      grd.addColorStop(0, `rgba(255,110,160,${a})`);
      grd.addColorStop(1, 'rgba(255,110,160,0)');
      g.fillStyle = grd;
      ellipse(g, side * 16, 9, 10, 7, 0);
      g.fill();
    }
  }

  if (f.sweat > 0.05) {
    g.globalAlpha = clamp(f.sweat, 0, 1);
    g.fillStyle = '#9fe8ff';
    g.beginPath();
    g.moveTo(23, -16);
    g.quadraticCurveTo(29, -8, 24, -3);
    g.quadraticCurveTo(19, -7, 23, -16);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    ellipse(g, 22.5, -9, 1.8, 2.6, 0);
    g.fill();
    g.globalAlpha = 1;
  }

  if (f.tear > 0.05) {
    g.globalAlpha = clamp(f.tear, 0, 1);
    for (const side of [-1, 1]) {
      g.fillStyle = '#a8e6ff';
      ellipse(g, side * 12, 10 + Math.sin(t * 8 + side) * 1.5, 1.8, 3.2, 0);
      g.fill();
    }
    g.globalAlpha = 1;
  }

  g.restore();
}

function drawHair(g, w) {
  g.fillStyle = w.hair;
  g.beginPath();
  g.moveTo(-26.5, 2);
  g.quadraticCurveTo(-30, -28, 0, -30);
  g.quadraticCurveTo(30, -28, 26.5, 2);
  g.quadraticCurveTo(19, -12, 0, -14);
  g.quadraticCurveTo(-19, -12, -26.5, 2);
  g.closePath();
  g.fill();

  if (w.style === 'spiky') {
    g.beginPath();
    for (let i = 0; i < 5; i++) {
      const x = -22 + i * 11;
      g.moveTo(x, -18);
      g.lineTo(x + 5, -35 - (i % 2) * 5);
      g.lineTo(x + 10, -18);
    }
    g.fill();
  } else if (w.style === 'bun') {
    ellipse(g, 0, -32, 9, 8, 0);
    g.fill();
  } else if (w.style === 'curly') {
    for (let i = 0; i < 6; i++) {
      const a = Math.PI + i * (Math.PI / 5);
      ellipse(g, Math.cos(a) * 20, -16 + Math.sin(a) * 14, 8, 8, 0);
      g.fill();
    }
  } else if (w.style === 'beanie') {
    g.fillStyle = '#ff6fae';
    g.beginPath();
    g.moveTo(-27, -4);
    g.quadraticCurveTo(-28, -34, 0, -36);
    g.quadraticCurveTo(28, -34, 27, -4);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffd166';
    ellipse(g, 0, -38, 6, 6, 0);
    g.fill();
  } else if (w.style === 'cap') {
    g.fillStyle = '#ff6fae';
    g.beginPath();
    g.moveTo(-26, -6);
    g.quadraticCurveTo(-27, -33, 0, -34);
    g.quadraticCurveTo(27, -33, 26, -6);
    g.closePath();
    g.fill();
    g.fillStyle = '#e0578f';
    g.beginPath();
    g.moveTo(8, -8);
    g.quadraticCurveTo(34, -11, 40, -2);
    g.quadraticCurveTo(26, -2, 10, -3);
    g.closePath();
    g.fill();
  }
}

function drawEyes(g, f) {
  for (const side of [-1, 1]) {
    const ex = side * 10;
    const ey = -4;

    if (f.xEyes > 0.5) {
      g.strokeStyle = '#221820';
      g.lineWidth = 2.6;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(ex - 5, ey - 6);
      g.lineTo(ex + 5, ey + 4);
      g.moveTo(ex + 5, ey - 6);
      g.lineTo(ex - 5, ey + 4);
      g.stroke();
      continue;
    }

    if (f.eyeClosed > 0.55) {
      g.strokeStyle = '#221820';
      g.lineWidth = 2.6;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(ex, ey - 3.5, 6, 0.28 * Math.PI, 0.72 * Math.PI);
      g.stroke();
      continue;
    }

    const ry = clamp(7.6 * f.eye, 1.8, 13);
    ellipse(g, ex, ey, 6.6, ry, 0);
    g.fillStyle = '#fffaf6';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(30,20,30,0.8)';
    g.stroke();

    if (f.heartEyes > 0.5) {
      heartPath(g, ex, ey + 1, 4.4);
      g.fillStyle = '#ff5f9e';
      g.fill();
    } else {
      const px = ex + clamp(f.lookX, -1, 1) * 3.2;
      const py = ey + clamp(f.lookY, -1, 1) * 2.6;
      ellipse(g, px, py, 3.1, 3.4, 0);
      g.fillStyle = '#221820';
      g.fill();
    }
  }
}

function drawBrows(g, f) {
  for (const side of [-1, 1]) {
    const innerX = side * 3.5;
    const outerX = side * 19;
    const innerY = -16 + f.browTilt * 5 - f.brow * 3;
    const outerY = -18 - f.brow * 4 + f.browTilt * 1.5;
    g.strokeStyle = '#2a1c22';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(innerX, innerY);
    g.quadraticCurveTo(side * 11, outerY - 1.5, outerX, outerY);
    g.stroke();
  }
}

function drawMouth(g, f) {
  const m = f.mouth;
  const o = clamp(f.open, 0, 1);
  const dark = '#3a1420';
  g.lineCap = 'round';
  g.lineJoin = 'round';

  if (m === 'smile') {
    g.strokeStyle = dark;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-7.5, 11);
    g.quadraticCurveTo(0, 17.5, 7.5, 11);
    g.stroke();
  } else if (m === 'tight') {
    g.strokeStyle = dark;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-8, 12.5);
    g.quadraticCurveTo(-4, 9.5, 0, 12.5);
    g.quadraticCurveTo(4, 15.5, 8, 12.5);
    g.stroke();
  } else if (m === 'flat') {
    g.strokeStyle = dark;
    g.lineWidth = 2.2;
    g.beginPath();
    g.moveTo(-7, 12.5);
    g.lineTo(7, 12);
    g.stroke();
  } else if (m === 'o') {
    ellipse(g, 0, 13, 4 + 3 * o, 4 + 5 * o, 0);
    g.fillStyle = dark;
    g.fill();
  } else if (m === 'gag') {
    const rx = 5.5 + 4 * o;
    const ry = 6 + 9 * o;
    ellipse(g, 0, 14, rx, ry, 0);
    g.fillStyle = dark;
    g.fill();
    ellipse(g, 0, 14 + ry * 0.5, rx * 0.65, ry * 0.45, 0);
    g.fillStyle = '#e2687e';
    g.fill();
    if (o > 0.55) {
      ellipse(g, 0, 14 + ry * 0.95, rx * 0.42, ry * 0.45, 0);
      g.fillStyle = '#e2687e';
      g.fill();
      g.lineWidth = 1.6;
      g.strokeStyle = '#a83750';
      g.stroke();
    }
  } else if (m === 'snarl') {
    g.strokeStyle = dark;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-8.5, 13);
    g.quadraticCurveTo(-4, 9, 0, 12.5);
    g.quadraticCurveTo(4, 16, 8.5, 12);
    g.stroke();
    g.fillStyle = '#fff6e8';
    g.beginPath();
    g.moveTo(-5.5, 12.2);
    g.lineTo(-2.6, 12.6);
    g.lineTo(-4, 15.4);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(5.5, 12);
    g.lineTo(2.6, 12.6);
    g.lineTo(4, 15.2);
    g.closePath();
    g.fill();
  } else if (m === 'scream') {
    const rx = 7 + 5 * o;
    const ry = 8 + 10 * o;
    ellipse(g, 0, 14, rx, ry, 0);
    g.fillStyle = dark;
    g.fill();
    ellipse(g, 0, 14 + ry * 0.45, rx * 0.58, ry * 0.42, 0);
    g.fillStyle = '#e2687e';
    g.fill();
  } else if (m === 'kiss') {
    ellipse(g, 0, 13, 4.4, 3.4, 0.15);
    g.fillStyle = '#d94b6e';
    g.fill();
    g.lineWidth = 1.6;
    g.strokeStyle = '#a32546';
    g.stroke();
  } else if (m === 'wobble') {
    g.strokeStyle = dark;
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-8, 13);
    g.quadraticCurveTo(-4, 9.5, 0, 13);
    g.quadraticCurveTo(4, 16.5, 8, 13);
    g.stroke();
  }
}

function drawProp(g, w, pose, t) {
  const a = clamp(pose.propAlpha, 0, 1);
  if (a <= 0.02) return;
  g.save();
  g.globalAlpha = a;
  const bob = Math.sin(t * 2 + w.phase) * 4;

  if (w.prop === 'balloon') {
    g.strokeStyle = 'rgba(240,240,250,0.7)';
    g.lineWidth = 1.6;
    g.beginPath();
    g.moveTo(24, -96);
    g.quadraticCurveTo(30 + bob, -150, 34 + bob * 2, -206);
    g.stroke();
    ellipse(g, 34 + bob * 2, -226, 20, 24, 0);
    g.fillStyle = w.balloon || '#ff7ab6';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(20,16,30,0.4)';
    g.stroke();
    ellipse(g, 27 + bob * 2, -234, 6, 8, -0.5);
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fill();
  } else if (w.prop === 'icecream') {
    g.fillStyle = '#e0a86a';
    g.beginPath();
    g.moveTo(20, -120);
    g.lineTo(34, -120);
    g.lineTo(27, -88);
    g.closePath();
    g.fill();
    ellipse(g, 27 + bob * 0.4, -130, 12, 11, 0);
    g.fillStyle = '#ffb3d9';
    g.fill();
    ellipse(g, 27 + bob * 0.4, -140, 8, 7, 0);
    g.fillStyle = '#fff3c4';
    g.fill();
  } else if (w.prop === 'phone') {
    g.save();
    g.translate(26, -112);
    g.rotate(-0.3);
    g.fillStyle = '#2a2f45';
    roundRectPath(g, -6, -11, 12, 21, 3);
    g.fill();
    g.fillStyle = '#8fe3ff';
    g.fillRect(-4.5, -9, 9, 15);
    g.restore();
  }

  g.restore();
}

/* ---------- drawing: scene ---------- */

function drawStink(g, st, pose, w, t) {
  const s = w.profile.stink || 0;
  if (!s || pose.react < 0.3) return;
  const a = clamp(pose.react, 0, 1) * s;
  if (a < 0.05) return;
  const x = pose.x;
  const y = st.laneY - 195 * w.s;
  g.save();
  g.globalAlpha = 0.55 * a;
  g.strokeStyle = '#9bff8a';
  g.lineWidth = 3;
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const off = (i - 1) * 16 * w.s;
    const ph = t * 5 + i * 1.7;
    g.beginPath();
    g.moveTo(x + off, y);
    g.quadraticCurveTo(x + off + Math.sin(ph) * 9, y - 18, x + off + Math.sin(ph + 1) * 7, y - 34);
    g.quadraticCurveTo(x + off + Math.sin(ph + 2) * 6, y - 44, x + off + Math.sin(ph + 2.6) * 5, y - 52);
    g.stroke();
  }
  g.restore();
}

function drawBubble(g, st, w, pose) {
  const a = clamp(pose.react * 1.5, 0, 1);
  if (a < 0.05 || !w.profile.bubble) return;
  const text = w.profile.bubble;
  const fs = clamp(st.H * 0.028, 13, 30);
  g.save();
  g.font = `900 ${Math.round(fs)}px "Arial Black", Impact, sans-serif`;
  const tw = g.measureText(text).width;
  const bw = tw + fs * 0.9;
  const bh = fs * 1.5;
  const cx = pose.x;
  const cy = st.laneY - 220 * w.s - fs * 0.4;
  const pop = 0.7 + 0.3 * easeOutCubic(clamp(pose.react, 0, 1));

  g.translate(cx, cy);
  g.scale(pop, pop);
  g.globalAlpha = a;
  roundRectPath(g, -bw / 2, -bh / 2, bw, bh, bh * 0.45);
  g.fillStyle = 'rgba(255,247,250,0.94)';
  g.fill();
  g.lineWidth = 2.5;
  g.strokeStyle = 'rgba(60,18,50,0.75)';
  g.stroke();
  g.beginPath();
  g.moveTo(-fs * 0.28, bh / 2 - 2);
  g.lineTo(0, bh / 2 + fs * 0.38);
  g.lineTo(fs * 0.28, bh / 2 - 2);
  g.closePath();
  g.fillStyle = 'rgba(255,247,250,0.94)';
  g.fill();
  g.stroke();

  g.fillStyle = '#5a1236';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 0, 1);
  g.restore();
}

function drawFrameOutline(g, st, t) {
  const r = st.rect;
  const pulse = 0.32 + 0.12 * Math.sin(t * 1.6);
  g.save();
  g.lineWidth = 2.5;
  g.strokeStyle = `rgba(255,122,212,${pulse})`;
  g.setLineDash([14, 12]);
  g.lineDashOffset = -t * 18;
  roundRectPath(g, r.x + 4, r.y + 4, r.w - 8, r.h - 8, 20);
  g.stroke();
  g.setLineDash([]);

  const fs = clamp(st.H * 0.014, 9, 16);
  g.font = `800 ${Math.round(fs)}px "Segoe UI", Arial, sans-serif`;
  g.textAlign = 'left';
  g.textBaseline = 'bottom';
  g.fillStyle = 'rgba(255,185,230,0.85)';
  g.fillText('SAVORYSAILOR \u00b7 LIVE', r.x + 12, r.y + r.h - 12);
  g.restore();
}

function drawMeter(g, st, t, judged, meter, love) {
  const W = st.W;
  const H = st.H;
  const x = W - Math.max(24, W * 0.03);
  const top = H * 0.3;
  const bottom = H * 0.78;
  const wdt = Math.max(9, W * 0.009);

  g.save();
  g.globalAlpha = 0.9;

  roundRectPath(g, x - wdt / 2, top, wdt, bottom - top, wdt / 2);
  g.fillStyle = 'rgba(10,12,26,0.35)';
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  g.stroke();

  const hgt = (bottom - top - 6) * clamp(meter, 0, 1);
  if (hgt > 2) {
    const col = love ? '#ff6ea9' : meter > 0.62 ? '#ff5b7a' : '#7ee0b8';
    roundRectPath(g, x - wdt / 2 + 3, bottom - 3 - hgt, wdt - 6, hgt, (wdt - 6) / 2);
    g.fillStyle = col;
    g.fill();
  }

  if (love) {
    heartPath(g, x, top - 20, 8);
    g.fillStyle = '#ff6ea9';
    g.fill();
  }

  const fs = clamp(H * 0.016, 10, 18);
  g.font = `800 ${Math.round(fs)}px "Segoe UI", Arial, sans-serif`;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(255,220,240,0.9)';
  g.textBaseline = 'bottom';
  g.fillText('JUDGED', x, top - (love ? 34 : 12));
  g.textBaseline = 'top';
  g.fillStyle = love ? '#ffb6d8' : 'rgba(255,255,255,0.85)';
  g.fillText(judged + '/15', x, bottom + 12);
  g.restore();
}

function drawHearts(g, st, t) {
  for (const h of st.hearts) {
    const age = t - h.at;
    if (age < 0 || age > h.life) continue;
    const u = age / h.life;
    const x = h.x + Math.sin(age * 2.4 + h.seed * 6.28) * h.wob;
    const y = h.y - h.rise * u - age * 9;
    const a = Math.sin(Math.PI * clamp(u * 1.1, 0, 1));
    g.save();
    g.globalAlpha = clamp(a, 0, 1) * h.alpha;
    heartPath(g, x, y, h.size * (0.7 + 0.3 * u));
    g.fillStyle = h.color;
    g.fill();
    g.restore();
  }
}

function drawKiss(g, st, t) {
  if (t < KISS_T) return;
  const u = t - KISS_T;
  const x = st.kissX;
  const y = st.kissY;
  const pop = easeOutCubic(clamp(u / 0.22, 0, 1)) * (1 + 0.22 * Math.sin(u * 16) * Math.exp(-u * 3));
  const fade = 1 - 0.45 * smooth(clamp((u - 4) / 3, 0, 1));

  g.save();
  const glow = g.createRadialGradient(x, y, 2, x, y, 72 * pop);
  glow.addColorStop(0, `rgba(255,110,170,${0.5 * fade})`);
  glow.addColorStop(1, 'rgba(255,110,170,0)');
  g.fillStyle = glow;
  ellipse(g, x, y, 72 * pop, 72 * pop, 0);
  g.fill();

  g.translate(x, y);
  g.rotate(-0.32);
  g.scale(pop, pop);
  g.globalAlpha = fade;
  g.fillStyle = '#ff5f9e';
  g.beginPath();
  g.moveTo(-16, 0);
  g.quadraticCurveTo(-9, -9, -3, -2);
  g.quadraticCurveTo(0, -6, 3, -2);
  g.quadraticCurveTo(9, -9, 16, 0);
  g.quadraticCurveTo(8, 4, 0, 4);
  g.quadraticCurveTo(-8, 4, -16, 0);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(-13, 4);
  g.quadraticCurveTo(0, 14, 13, 4);
  g.quadraticCurveTo(0, 8, -13, 4);
  g.closePath();
  g.fill();
  g.restore();

  if (u < 0.85) {
    const a = 1 - u / 0.85;
    g.save();
    g.globalAlpha = a;
    g.strokeStyle = '#ffb3d3';
    g.lineWidth = 2.5;
    g.setLineDash([6, 9]);
    const sx = st.loveStopX + 34;
    const sy = st.laneY - 168 * st.loveScale;
    g.beginPath();
    g.moveTo(sx, sy);
    g.quadraticCurveTo(lerp(sx, x, 0.5) - 60, lerp(sy, y, 0.55), x, y);
    g.stroke();
    g.setLineDash([]);
    g.restore();
  }

  if (u < 1.35) {
    const p = easeOutCubic(clamp(u / 0.16, 0, 1));
    const f = 1 - smooth(clamp((u - 0.72) / 0.63, 0, 1));
    g.save();
    g.globalAlpha = f;
    g.translate(x + 70, y - 40);
    g.rotate(-0.14 + 0.05 * Math.sin(u * 20));
    g.scale(0.6 + 0.4 * p, 0.6 + 0.4 * p);
    g.font = `900 ${Math.round(clamp(st.H * 0.05, 20, 62))}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 7;
    g.strokeStyle = 'rgba(50,10,30,0.85)';
    g.strokeText('MWAH!', 0, 0);
    g.fillStyle = '#ffd1e6';
    g.fillText('MWAH!', 0, 0);
    g.restore();
  }

  if (t > 30.4) {
    const a = smooth(clamp((t - 30.4) / 0.5, 0, 1));
    g.save();
    g.globalAlpha = a * 0.95;
    g.translate(x, y + 60);
    g.rotate(-0.06);
    const fs = clamp(st.H * 0.026, 12, 30);
    g.font = `900 ${Math.round(fs)}px "Arial Black", Impact, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 5;
    g.strokeStyle = 'rgba(40,10,30,0.8)';
    g.strokeText('SMILE RATING: 10/10', 0, 0);
    g.fillStyle = '#ffe0ee';
    g.fillText('SMILE RATING: 10/10', 0, 0);
    g.restore();
  }
}

function drawCaption(g, st, t) {
  const { W, H, rect } = st;
  let cap = null;
  for (const c of st.captions) {
    if (t >= c.at && t <= c.until) {
      cap = c;
      break;
    }
  }
  if (!cap) return;

  const fadeIn = smooth(clamp((t - cap.at) / 0.25, 0, 1));
  const fadeOut = 1 - smooth(clamp((t - (cap.until - 0.35)) / 0.35, 0, 1));
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0.01) return;

  let ax = W * 0.5;
  let ay = H * 0.07;
  const above = rect.y - 40;
  const below = rect.y + rect.h + 46;
  if (above > H * 0.075) {
    ax = clamp(rect.x + rect.w * 0.5, W * 0.24, W * 0.76);
    ay = above;
  } else if (below < H * 0.9) {
    ax = clamp(rect.x + rect.w * 0.5, W * 0.24, W * 0.76);
    ay = below;
  }

  let fs = clamp(H * 0.032, 16, 38);
  const maxW = Math.min(W * 0.8, 1180);
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 12; i++) {
    g.font = `900 ${Math.round(fs)}px "Arial Black", Impact, sans-serif`;
    if (g.measureText(cap.text).width <= maxW) break;
    fs *= 0.9;
  }
  g.globalAlpha = alpha;
  g.lineWidth = Math.max(5, fs * 0.18);
  g.strokeStyle = 'rgba(20,10,24,0.88)';
  g.strokeText(cap.text, ax, ay);
  g.fillStyle = '#fff6ef';
  g.fillText(cap.text, ax, ay);
  g.globalAlpha = 1;
  g.restore();
}

/* ---------- lifecycle ---------- */

export function init(ctx) {
  state = buildState(ctx);
  ended = false;
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  g.clearRect(0, 0, ctx.width, ctx.height);

  if (!state || state.W !== ctx.width || state.H !== ctx.height) {
    state = buildState(ctx);
  }
  const st = state;

  if (t >= END_T) {
    if (!ended) {
      ended = true;
      ctx.done();
    }
    return;
  }

  while (st.sndIdx < st.sounds.length && t >= st.sounds[st.sndIdx][0]) {
    try {
      st.sounds[st.sndIdx][1](ctx);
    } catch (err) {
      /* a sound is not worth a crash */
    }
    st.sndIdx++;
  }

  // meter ratchets as the crowd judges the streamer
  let meter = 0;
  let judged = 0;
  for (const w of st.walkers) {
    if (t >= w.crossT) judged++;
    const r = reactOf(w, t);
    const m = w.profile.meter * smooth(clamp(r * 1.2, 0, 1));
    if (m > meter) meter = m;
  }
  judged = Math.min(judged, 14);
  const loveOn = t >= KISS_T;
  if (loveOn) meter = 1;

  drawFrameOutline(g, st, t);
  drawHearts(g, st, t);

  for (const w of st.walkers) {
    if (t < w.spawn - 0.3) continue;
    const pose = haterPose(st, w, t);
    if (pose.x < -0.2 * st.W || pose.x > 1.2 * st.W) continue;
    drawWalker(g, st, w, t, pose);
    drawStink(g, st, pose, w, t);
    drawBubble(g, st, w, pose);
  }

  if (t >= LOVE_SPAWN - 0.4) {
    const lp = lovePose(st, t);
    drawWalker(g, st, st.love, t, lp);
    if (t > 24.9 && t < 27.4) {
      const a = clamp((t - 24.9) / 0.4, 0, 1) * (1 - smooth(clamp((t - 26.9) / 0.5, 0, 1)));
      g.save();
      g.globalAlpha = a;
      const fs = clamp(st.H * 0.028, 13, 30);
      g.font = `900 ${Math.round(fs)}px "Arial Black", Impact, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 5;
      g.strokeStyle = 'rgba(60,18,50,0.8)';
      g.strokeText('!', lp.x + 44, st.laneY - 232 * st.loveScale);
      g.fillStyle = '#ffd1e6';
      g.fillText('!', lp.x + 44, st.laneY - 232 * st.loveScale);
      g.restore();
    }
  }

  drawKiss(g, st, t);
  drawMeter(g, st, t, loveOn ? 15 : judged, meter, loveOn);
  drawCaption(g, st, t);
}

export function dispose() {
  ended = true;
}
