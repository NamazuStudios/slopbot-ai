export const meta = {
  title: 'Turtle Toot Zoom',
  author: 'heychicano',
  prompt: 'cute turtle cartoon farts while smiling, gets closer to the camera, then frowns',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const END_T = 16.0;

const FARTS = [
  { at: 2.05, dur: 0.55, power: 0.5, label: 'poot' },
  { at: 3.70, dur: 0.80, power: 1.0, label: 'PFFT' },
  { at: 5.30, dur: 0.65, power: 0.8, label: 'brrt' },
  { at: 6.90, dur: 1.55, power: 1.5, label: 'PRRRRFFFT' },
  { at: 8.65, dur: 1.05, power: 1.25, label: 'PFFFT' },
];

const SOUNDS = [
  [0.30, (c) => c.sound.beep(900, 70)],
  [0.52, (c) => c.sound.beep(1200, 60)],
  [1.45, (c) => c.sound.noise(60)],
  [1.95, (c) => { c.sound.beep(210, 120); c.sound.noise(90); }],
  [2.05, (c) => { c.sound.beep(120, 150); c.sound.noise(190); }],
  [2.22, (c) => c.sound.beep(92, 120)],
  [2.40, (c) => c.sound.beep(330, 80)],
  [3.55, (c) => c.sound.beep(240, 140)],
  [3.70, (c) => { c.sound.beep(85, 210); c.sound.noise(260); }],
  [3.95, (c) => c.sound.beep(110, 150)],
  [4.08, (c) => c.sound.beep(360, 70)],
  [5.20, (c) => c.sound.beep(260, 140)],
  [5.30, (c) => { c.sound.beep(98, 180); c.sound.noise(180); }],
  [5.52, (c) => c.sound.beep(124, 150)],
  [5.66, (c) => c.sound.beep(400, 70)],
  [6.80, (c) => c.sound.beep(220, 160)],
  [6.90, (c) => { c.sound.beep(74, 420); c.sound.noise(420); }],
  [7.15, (c) => c.sound.beep(58, 300)],
  [7.40, (c) => c.sound.beep(95, 250)],
  [7.66, (c) => c.sound.beep(66, 300)],
  [7.95, (c) => c.sound.beep(88, 260)],
  [8.25, (c) => c.sound.beep(60, 320)],
  [8.45, (c) => c.sound.beep(320, 90)],
  [8.55, (c) => c.sound.beep(240, 120)],
  [8.65, (c) => { c.sound.beep(96, 200); c.sound.noise(240); }],
  [8.90, (c) => c.sound.beep(78, 220)],
  [9.10, (c) => { c.sound.beep(64, 280); c.sound.noise(320); }],
  [9.35, (c) => c.sound.beep(300, 80)],
  [9.60, (c) => c.sound.noise(90)],
  [9.90, (c) => c.sound.beep(150, 160)],
  [10.15, (c) => c.sound.noise(55)],
  [10.42, (c) => c.sound.noise(55)],
  [10.60, (c) => c.sound.beep(520, 60)],
  [11.00, (c) => c.sound.beep(700, 150)],
  [11.18, (c) => c.sound.beep(600, 160)],
  [11.36, (c) => c.sound.beep(500, 180)],
  [11.56, (c) => c.sound.beep(410, 220)],
  [12.00, (c) => c.sound.beep(330, 320)],
  [12.50, (c) => c.sound.beep(260, 480)],
  [13.40, (c) => c.sound.beep(210, 420)],
  [15.30, (c) => c.sound.beep(170, 600)],
];

const CAPTIONS = [
  { at: 0.5, until: 2.55, text: 'It is a turtle. A cute one. Nothing bad can happen.' },
  { at: 2.65, until: 4.9, text: 'The turtle has made a small decision.' },
  { at: 5.0, until: 7.35, text: 'It has made several more.' },
  { at: 7.45, until: 10.3, text: 'It is approaching the camera. Confidently.' },
  { at: 10.4, until: 12.55, text: 'SavorySailor, do not encourage this.' },
  { at: 12.65, until: 16.1, text: 'And now the frown. The worst special effect.' },
];

let state = null;
let ended = false;

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

function fartEnergy(t) {
  let e = 0;
  for (const f of FARTS) {
    if (t >= f.at && t <= f.at + f.dur) {
      const p = (t - f.at) / f.dur;
      e += f.power * Math.sin(Math.PI * Math.pow(p, 0.65));
    }
  }
  return e;
}

function getCam(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  if (ctx.streamer && ctx.streamer.w > 0 && ctx.streamer.h > 0) {
    return {
      x: ctx.streamer.x * W,
      y: ctx.streamer.y * H,
      w: ctx.streamer.w * W,
      h: ctx.streamer.h * H,
    };
  }
  return null;
}

function pose(st, t) {
  const { W, H, S, cam } = st;
  const p = smooth(clamp((t - 0.15) / 9.8, 0, 1));
  const deflate = smooth(clamp((t - 11.0) / 3.5, 0, 1));
  const push = 1 + fartEnergy(t) * 0.04;
  const grow = lerp(0.58, 2.35, p) * (1 - 0.075 * deflate) * push;
  const startX = W * 0.86;
  const endX = cam
    ? clamp(cam.x + cam.w * 0.5, W * 0.34, W * 0.66)
    : W * 0.5;
  const x = lerp(startX, endX, p);
  const y = lerp(H * 0.80, H * 0.935, p);
  return { x, y, s: S * grow };
}

function buildState(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const cam = getCam(ctx);
  const S = clamp(Math.min(W, H) / 900, 0.7, 1.5);

  const st = {
    W,
    H,
    S,
    cam,
    sounds: SOUNDS,
    sndIdx: 0,
    puffs: [],
    pfft: [],
    sparkles: [],
    lines: [],
    captions: CAPTIONS,
    doneCalled: false,
    ended: false,
  };

  for (let fi = 0; fi < FARTS.length; fi++) {
    const f = FARTS[fi];
    const pos = pose(st, f.at);
    const count = Math.round(9 + f.power * 8);
    for (let i = 0; i < count; i++) {
      const at = f.at + (i / count) * f.dur + (ctx.rand() - 0.5) * 0.06;
      const bx = (ctx.rand() - 0.5) * 140;
      const by = 98 + ctx.rand() * 34;
      const sc = pos.s;
      st.puffs.push({
        at,
        ox: pos.x + bx * sc,
        oy: pos.y + by * sc,
        vx: (ctx.rand() - 0.5) * 80 * sc,
        vy: -(34 + ctx.rand() * 62) * sc,
        r: (15 + ctx.rand() * 22) * sc * 0.72,
        life: 1.3 + ctx.rand() * 1.7,
        wob: ctx.rand() * Math.PI * 2,
        spin: 1.4 + ctx.rand() * 2.6,
        tone: Math.floor(ctx.rand() * 3),
        sc,
      });
    }
    st.pfft.push({
      dx: (ctx.rand() - 0.5) * 60,
      dy: (ctx.rand() - 0.5) * 40,
      rot: (ctx.rand() - 0.5) * 0.5,
      scale: 0.9 + ctx.rand() * 0.5,
    });
  }

  for (let i = 0; i < 8; i++) {
    st.sparkles.push({
      a: ctx.rand() * Math.PI * 2,
      rad: 108 + ctx.rand() * 30,
      phase: ctx.rand() * Math.PI * 2,
      size: 6 + ctx.rand() * 7,
    });
  }

  for (let i = 0; i < 26; i++) {
    st.lines.push({
      a: ctx.rand() * Math.PI * 2,
      len: 90 + ctx.rand() * 190,
      speed: 0.5 + ctx.rand() * 0.9,
      off: ctx.rand(),
      thick: 1 + ctx.rand() * 2.5,
    });
  }

  return st;
}

export function init(ctx) {
  state = buildState(ctx);
  ended = false;
}

function playSounds(ctx, t) {
  const st = state;
  while (st.sndIdx < st.sounds.length && t >= st.sounds[st.sndIdx][0]) {
    try {
      st.sounds[st.sndIdx][1](ctx);
    } catch (err) {
      /* a sound is not worth a crash */
    }
    st.sndIdx++;
  }
}

function hexPath(g, cx, cy, r) {
  g.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    const px = cx + Math.cos(a) * r;
    const py = cy + Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

function ellipse(g, x, y, rx, ry, rot) {
  g.beginPath();
  g.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2);
}

function drawFlipper(g, x, y, rx, ry, rot, fill) {
  ellipse(g, x, y, rx, ry, rot);
  g.fillStyle = fill;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#2c5b22';
  g.stroke();
}

function drawTurtle(g, st, t, o) {
  const { x, y, s, smile, frown, squint, tilt } = o;

  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.scale(s, s);

  const bob = Math.sin(t * 2.1) * 4 * (1 - frown * 0.75);
  const shellY = bob + frown * 10;

  // contact shadow under the turtle, never a background fill
  g.fillStyle = 'rgba(6, 10, 18, 0.30)';
  ellipse(g, 0, 114, 94, 20, 0);
  g.fill();

  // rear flippers
  drawFlipper(g, -84, 88, 31, 16, 0.55 + Math.sin(t * 1.7) * 0.1, '#4f9a37');
  drawFlipper(g, 84, 88, 31, 16, -0.55 - Math.sin(t * 1.7 + 1.2) * 0.1, '#4f9a37');

  // tail
  g.beginPath();
  g.moveTo(-12, shellY + 108);
  g.lineTo(0, shellY + 134);
  g.lineTo(12, shellY + 108);
  g.closePath();
  g.fillStyle = '#6cb84a';
  g.fill();
  g.strokeStyle = '#2c5b22';
  g.lineWidth = 4;
  g.stroke();

  // shell
  const sg = g.createRadialGradient(-26, shellY - 44, 16, 0, shellY, 128);
  sg.addColorStop(0, '#b9f08b');
  sg.addColorStop(0.55, '#8bd25f');
  sg.addColorStop(1, '#4d8f34');
  ellipse(g, 0, shellY + 8, 96, 106, 0);
  g.fillStyle = sg;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = '#2c5b22';
  g.stroke();

  // shell rim
  ellipse(g, 0, shellY + 8, 79, 89, 0);
  g.lineWidth = 8;
  g.strokeStyle = 'rgba(226, 255, 196, 0.42)';
  g.stroke();

  // shell plates
  g.save();
  ellipse(g, 0, shellY + 8, 94, 104, 0);
  g.clip();
  g.strokeStyle = 'rgba(52, 106, 40, 0.55)';
  g.lineWidth = 3;
  for (let row = -3; row <= 3; row++) {
    for (let col = -2; col <= 2; col++) {
      const cx = col * 44 + (row % 2 ? 22 : 0);
      const cy = shellY + row * 38 + 6;
      hexPath(g, cx, cy, 23);
      g.stroke();
    }
  }
  // shell shine
  ellipse(g, -34, shellY - 34, 30, 14, -0.6);
  g.fillStyle = 'rgba(255, 255, 255, 0.22)';
  g.fill();
  g.restore();

  // neck
  ellipse(g, 0, shellY - 62, 33, 26, 0);
  g.fillStyle = '#79c453';
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = '#2c5b22';
  g.stroke();

  // head
  const headY = shellY - 98 + Math.sin(t * 2.1 + 0.6) * 3 + frown * 7;
  const hg = g.createRadialGradient(-16, headY - 18, 8, 0, headY, 58);
  hg.addColorStop(0, '#bff28c');
  hg.addColorStop(1, '#74bd4d');
  ellipse(g, 0, headY, 50, 46, 0);
  g.fillStyle = hg;
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = '#2c5b22';
  g.stroke();

  // cheeks
  g.globalAlpha = 0.35 * (1 - frown);
  g.fillStyle = '#ff8fb0';
  ellipse(g, -31, headY + 12, 10, 7, 0);
  g.fill();
  ellipse(g, 31, headY + 12, 10, 7, 0);
  g.fill();
  g.globalAlpha = 1;

  // nostrils
  g.fillStyle = '#2f6b28';
  ellipse(g, -7, headY + 6, 2.4, 2.4, 0);
  g.fill();
  ellipse(g, 7, headY + 6, 2.4, 2.4, 0);
  g.fill();

  // eyes
  const lookY = 1.5 + frown * 3;
  for (const side of [-1, 1]) {
    const ex = side * 19;
    const ey = headY - 9;
    ellipse(g, ex, ey, 13.5, 15, 0);
    g.fillStyle = '#fffdf3';
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = '#2c5b22';
    g.stroke();

    // pupil
    ellipse(g, ex + side * 1.5, ey + lookY, 6.4, 7, 0);
    g.fillStyle = '#23331f';
    g.fill();

    // sparkle
    if (smile > 0.4) {
      ellipse(g, ex + side * 1.5 + 2.4, ey + lookY - 2.8, 2.4, 2.4, 0);
      g.fillStyle = 'rgba(255, 255, 255, 0.9)';
      g.fill();
    }

    // eyelid / blink for the cute squint
    const lid = clamp(squint, 0, 1);
    if (lid > 0.02) {
      g.save();
      ellipse(g, ex, ey, 13.5, 15, 0);
      g.clip();
      g.fillStyle = '#83cb58';
      g.fillRect(ex - 16, ey - 17, 32, 34 * lid);
      g.restore();
      g.lineWidth = 3;
      g.strokeStyle = '#2c5b22';
      ellipse(g, ex, ey, 13.5, 15, 0);
      g.stroke();
    }
  }

  // brows, only when the mood curdles
  if (frown > 0.35) {
    const k = (frown - 0.35) / 0.65;
    g.globalAlpha = k;
    g.strokeStyle = '#2c5b22';
    g.lineWidth = 4;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-31, headY - 27);
    g.lineTo(-11, headY - 20);
    g.stroke();
    g.beginPath();
    g.moveTo(31, headY - 27);
    g.lineTo(11, headY - 20);
    g.stroke();
    g.globalAlpha = 1;
  }

  // mouth
  const mw = lerp(27, 16, frown);
  const my = headY + 21;
  const ctrlY = my + lerp(20, -20, frown);
  g.beginPath();
  g.moveTo(-mw, my);
  g.quadraticCurveTo(0, ctrlY, mw, my);
  g.lineWidth = 4.5;
  g.strokeStyle = '#2c5b22';
  g.lineCap = 'round';
  g.stroke();

  // front flippers
  const wave = Math.sin(t * 6.4) * 0.45 * smile * clamp(1 - (t - 6) / 4, 0, 1);
  drawFlipper(g, -93, 6, 27, 14, 0.25 + wave, '#83cb58');
  drawFlipper(g, 93, 6, 27, 14, -0.25 - wave, '#83cb58');

  g.restore();
}

function drawSparkles(g, st, t, pos, alpha) {
  if (alpha <= 0.02) return;
  const headY = pos.y - 150 * pos.s;
  g.save();
  for (const sp of st.sparkles) {
    const tw = 0.35 + 0.65 * Math.abs(Math.sin(t * 3.4 + sp.phase));
    const a = sp.a + t * 0.6;
    const px = pos.x + Math.cos(a) * sp.rad * pos.s;
    const py = headY + Math.sin(a) * sp.rad * 0.55 * pos.s;
    const r = sp.size * pos.s * tw;
    g.globalAlpha = alpha * tw;
    g.fillStyle = '#fff6c9';
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (Math.PI / 4) * i;
      const rr = i % 2 === 0 ? r : r * 0.28;
      const qx = px + Math.cos(ang) * rr;
      const qy = py + Math.sin(ang) * rr;
      if (i === 0) g.moveTo(qx, qy);
      else g.lineTo(qx, qy);
    }
    g.closePath();
    g.fill();
  }
  g.globalAlpha = 1;
  g.restore();
}

function drawZoomLines(g, st, t, pos) {
  const show =
    smooth(clamp((t - 2.9) / 1.3, 0, 1)) *
    (1 - smooth(clamp((t - 10.6) / 1.6, 0, 1)));
  if (show <= 0.02) return;
  const cx = pos.x;
  const cy = pos.y - 100 * pos.s;
  g.save();
  g.strokeStyle = 'rgba(255, 170, 225, 0.5)';
  g.lineCap = 'round';
  for (const ln of st.lines) {
    const prog = (ln.off + t * ln.speed * 0.35) % 1;
    const r2 = (220 + ln.len) * pos.s * (0.55 + prog * 0.7);
    const r1 = r2 - 60 * pos.s;
    const a = ln.a;
    g.globalAlpha = show * 0.20 * (1 - prog * 0.55);
    g.lineWidth = ln.thick;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    g.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
}

function drawPuffs(g, st, t, pos) {
  const grey = smooth(clamp((t - 11.3) / 1.8, 0, 1));
  for (const p of st.puffs) {
    const age = t - p.at;
    if (age < 0 || age > p.life) continue;
    const k = age / p.life;
    const px = p.ox + p.vx * age + Math.sin(p.wob + age * p.spin) * 10 * p.sc;
    const py = p.oy + p.vy * age + Math.cos(p.wob + age * p.spin * 0.7) * 7 * p.sc;
    const r = p.r * (0.55 + age * 1.15);
    const fade =
      smooth(clamp(age / 0.12, 0, 1)) *
      (1 - smooth(clamp((k - 0.5) / 0.5, 0, 1)));
    const alpha = fade * 0.5;
    if (alpha <= 0.01) continue;

    let col;
    if (grey > 0.45) {
      col = '178, 190, 196';
    } else if (p.tone === 0) {
      col = '195, 242, 158';
    } else if (p.tone === 1) {
      col = '163, 224, 122';
    } else {
      col = '134, 204, 92';
    }

    g.fillStyle = `rgba(${col}, ${alpha})`;
    ellipse(g, px, py, r, r * 0.86, 0);
    g.fill();
    ellipse(g, px - r * 0.6, py + r * 0.28, r * 0.62, r * 0.55, 0);
    g.fill();
    ellipse(g, px + r * 0.62, py + r * 0.18, r * 0.55, r * 0.5, 0);
    g.fill();
  }

  // soft lens fog, transparent at the edges
  const fogK =
    smooth(clamp((t - 4) / 2, 0, 1)) *
    (1 - smooth(clamp((t - 11.4) / 2.4, 0, 1)));
  if (fogK > 0.02) {
    const R = 340 * pos.s;
    const gr = g.createRadialGradient(pos.x, pos.y, R * 0.15, pos.x, pos.y, R);
    gr.addColorStop(0, `rgba(175, 224, 152, ${0.10 * fogK})`);
    gr.addColorStop(1, 'rgba(175, 224, 152, 0)');
    g.fillStyle = gr;
    g.fillRect(pos.x - R, pos.y - R, R * 2, R * 2);
  }
}

function drawPfft(g, st, t, pos) {
  for (let i = 0; i < FARTS.length; i++) {
    const f = FARTS[i];
    const p = (t - f.at) / f.dur;
    if (p < 0 || p > 1) continue;
    const j = st.pfft[i];
    const pop = easeOutCubic(clamp(p / 0.16, 0, 1));
    const fade = 1 - smooth(clamp((p - 0.6) / 0.4, 0, 1));
    if (fade <= 0.01) continue;
    const px = pos.x + (j.dx + 10) * pos.s;
    const py = pos.y + (118 + j.dy - p * 30) * pos.s;
    g.save();
    g.translate(px, py);
    g.rotate(j.rot);
    g.scale(pop * j.scale * pos.s * 0.9, pop * j.scale * pos.s * 0.9);
    g.globalAlpha = fade;
    g.font = '900 30px "Arial Black", Impact, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = '#1a1526';
    g.strokeText(f.label, 0, 0);
    g.fillStyle = '#ffd6f0';
    g.fillText(f.label, 0, 0);
    g.globalAlpha = 1;
    g.restore();
  }
}

function drawBrackets(g, st, t) {
  const { W, H, cam } = st;
  const pulse = 0.5 + 0.22 * Math.sin(t * 2.2);
  let x;
  let y;
  let w;
  let h;
  if (cam) {
    x = cam.x;
    y = cam.y;
    w = cam.w;
    h = cam.h;
  } else {
    x = W * 0.06;
    y = H * 0.07;
    w = W * 0.88;
    h = H * 0.86;
  }
  const L = Math.min(28, w * 0.12, h * 0.12);
  g.save();
  g.strokeStyle = `rgba(255, 122, 212, ${pulse})`;
  g.lineWidth = 3;
  g.lineCap = 'round';
  const corners = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const c of corners) {
    g.beginPath();
    g.moveTo(c[0] + c[2] * L, c[1]);
    g.lineTo(c[0], c[1]);
    g.lineTo(c[0], c[1] + c[3] * L);
    g.stroke();
  }

  if (cam) {
    const fs = clamp(H * 0.016, 11, 18);
    g.font = `700 ${Math.round(fs)}px "Segoe UI", Arial, sans-serif`;
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(16, 12, 26, 0.75)';
    g.strokeText('LIVE · SavorySailor', x + w - 8, y + h + fs + 6);
    g.fillStyle = `rgba(255, 180, 228, ${0.75 + 0.2 * Math.sin(t * 2.2)})`;
    g.fillText('LIVE · SavorySailor', x + w - 8, y + h + fs + 6);
  }
  g.restore();
}

function drawCaption(g, st, t) {
  const { W, H, cam } = st;
  let cap = null;
  for (const c of st.captions) {
    if (t >= c.at && t <= c.until) {
      cap = c;
      break;
    }
  }
  if (!cap) return;

  const fadeIn = smooth(clamp((t - cap.at) / 0.25, 0, 1));
  const fadeOut = 1 - smooth(clamp((t - (cap.until - 0.3)) / 0.3, 0, 1));
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0.01) return;

  let ax = W * 0.5;
  let ay = H * 0.09;
  if (cam) {
    const top = cam.y;
    const bottom = cam.y + cam.h;
    if (top > H * 0.12) {
      ax = clamp(cam.x + cam.w * 0.5, W * 0.22, W * 0.78);
      ay = top - 38;
    } else if (bottom < H * 0.86) {
      ax = clamp(cam.x + cam.w * 0.5, W * 0.22, W * 0.78);
      ay = bottom + 54;
    } else {
      ax = W * 0.5;
      ay = H * 0.08;
    }
  }

  let fs = clamp(H * 0.034, 18, 40);
  const maxW = Math.min(W * 0.76, 1150);
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) {
    g.font = `900 ${Math.round(fs)}px "Arial Black", Impact, sans-serif`;
    if (g.measureText(cap.text).width <= maxW) break;
    fs *= 0.9;
  }
  g.globalAlpha = alpha;
  g.lineWidth = Math.max(5, fs * 0.16);
  g.strokeStyle = 'rgba(14, 11, 24, 0.85)';
  g.strokeText(cap.text, ax, ay);
  g.fillStyle = '#fff7fb';
  g.fillText(cap.text, ax, ay);
  g.globalAlpha = 1;
  g.restore();
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  g.clearRect(0, 0, ctx.width, ctx.height);

  if (!state) state = buildState(ctx);
  const st = state;

  if (t >= END_T || st.ended) {
    if (!ended) {
      ended = true;
      st.ended = true;
      ctx.done();
    }
    return;
  }

  playSounds(ctx, t);

  const pos = pose(st, t);
  const energy = fartEnergy(t);
  const shakeX = Math.sin(t * 47) * energy * 4.5;
  const shakeY = Math.cos(t * 39) * energy * 3.5;

  const moodT = smooth(clamp((t - 10.25) / 1.35, 0, 1));
  const smile = 1 - moodT;
  const frown = moodT;
  const wobble = t > 10.2 && t < 11.5 ? Math.sin(t * 26) * 0.22 * (1 - moodT) : 0;
  const blink = (t + 1.1) % 4.2 < 0.1 ? 1 : 0;
  const squint = clamp(Math.max(energy * 0.42, blink), 0, 1);
  const tilt = -0.055 * frown + Math.sin(t * 1.3) * 0.008;

  g.save();
  g.translate(shakeX, shakeY);

  drawZoomLines(g, st, t, pos);
  drawSparkles(g, st, t, pos, smile * (1 - smooth(clamp((t - 6) / 3, 0, 1))));
  drawSparkles(g, st, t, pos, smile * 0.35);

  drawTurtle(g, st, t, {
    x: pos.x,
    y: pos.y,
    s: pos.s,
    smile: clamp(smile + wobble, 0, 1),
    frown,
    squint,
    tilt,
  });

  drawPuffs(g, st, t, pos);
  drawPfft(g, st, t, pos);

  g.restore();

  drawCaption(g, st, t);
  drawBrackets(g, st, t);
}

export function dispose() {
  ended = true;
}
