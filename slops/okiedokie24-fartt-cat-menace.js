export const meta = {
  title: 'Fartt Cat Menace',
  author: 'okiedokie24',
  prompt: 'when a user types !fartt a cat appears on screen and it farts, pees and poops on the streamers camera',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!fartt"], "caseSensitive": false }
  ],
};

let state = null;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = clamp(t, 0, 1);
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function easeInOutCubic(t) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function getCameraRect(ctx) {
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
  const w = W * 0.30;
  const h = H * 0.32;
  return {
    x: W - w - W * 0.04,
    y: H - h - H * 0.06,
    w,
    h,
  };
}

function buildState(ctx, existingLogin) {
  const W = ctx.width;
  const H = ctx.height;
  const cam = getCameraRect(ctx);
  const scale = clamp(Math.min(cam.w, cam.h) / 250, 0.58, 1.45);
  const floorY = Math.min(cam.y + cam.h - 6 * scale, H - 14 * scale);
  const spotX = clamp(cam.x + cam.w * 0.24, 75 * scale, W - 110 * scale);
  const camCenterX = cam.x + cam.w * 0.55;
  const camCenterY = cam.y + cam.h * 0.48;

  const login = existingLogin || (ctx.trigger && ctx.trigger.login) || null;

  // Deterministic sound cues scheduled by timestamp
  const soundCues = [
    // Arrival meow
    { t: 0.72, fn: (c) => c.sound.beep(660, 65) },
    { t: 0.80, fn: (c) => c.sound.beep(860, 85) },
    { t: 0.90, fn: (c) => c.sound.beep(610, 110) },
    // Paw steps on approach
    { t: 0.35, fn: (c) => c.sound.noise(28) },
    { t: 1.15, fn: (c) => c.sound.noise(28) },
    { t: 1.65, fn: (c) => c.sound.noise(35) },

    // Act I: Fart buildup & sputtering blast
    { t: 2.30, fn: (c) => c.sound.beep(175, 110) },
    { t: 2.65, fn: (c) => { c.sound.noise(220); c.sound.beep(98, 70); } },
    { t: 2.74, fn: (c) => c.sound.beep(84, 55) },
    { t: 2.81, fn: (c) => { c.sound.noise(170); c.sound.beep(112, 60); } },
    { t: 2.89, fn: (c) => c.sound.beep(78, 65) },
    { t: 2.97, fn: (c) => { c.sound.noise(200); c.sound.beep(92, 55); } },
    { t: 3.05, fn: (c) => c.sound.beep(72, 80) },
    { t: 3.16, fn: (c) => { c.sound.noise(140); c.sound.beep(104, 50); } },
    { t: 3.25, fn: (c) => c.sound.beep(88, 70) },
    { t: 3.36, fn: (c) => c.sound.beep(295, 75) }, // cheeky squeaker tail
    { t: 3.95, fn: (c) => { c.sound.noise(130); c.sound.beep(86, 85); } }, // aftershock puff

    // Act II: Pee stream patter
    { t: 5.25, fn: (c) => { c.sound.noise(70); c.sound.beep(1120, 28); } },
    { t: 5.42, fn: (c) => c.sound.beep(1280, 26) },
    { t: 5.60, fn: (c) => { c.sound.noise(55); c.sound.beep(980, 28); } },
    { t: 5.80, fn: (c) => c.sound.beep(1390, 24) },
    { t: 6.02, fn: (c) => { c.sound.noise(55); c.sound.beep(1080, 26); } },
    { t: 6.24, fn: (c) => c.sound.beep(1240, 26) },
    { t: 6.48, fn: (c) => { c.sound.noise(55); c.sound.beep(1020, 28); } },
    { t: 6.72, fn: (c) => c.sound.beep(1340, 24) },
    { t: 6.96, fn: (c) => { c.sound.noise(50); c.sound.beep(1160, 26); } },
    { t: 7.22, fn: (c) => c.sound.beep(940, 32) },
    { t: 7.52, fn: (c) => c.sound.beep(820, 38) },

    // Act III: Poop strain & splats
    { t: 8.35, fn: (c) => c.sound.beep(142, 120) },
    { t: 8.65, fn: (c) => c.sound.beep(126, 130) },
    { t: 9.02, fn: (c) => c.sound.beep(480, 45) },
    { t: 9.09, fn: (c) => c.sound.beep(270, 50) },
    { t: 9.16, fn: (c) => { c.sound.noise(160); c.sound.beep(88, 95); } },
    { t: 9.65, fn: (c) => c.sound.beep(430, 40) },
    { t: 9.72, fn: (c) => { c.sound.noise(140); c.sound.beep(80, 90); } },
    { t: 10.18, fn: (c) => c.sound.beep(520, 40) },
    { t: 10.25, fn: (c) => { c.sound.noise(180); c.sound.beep(72, 115); } },
    { t: 10.65, fn: (c) => { c.sound.noise(95); c.sound.beep(210, 80); } }, // stamp thud

    // Disrespectful litter kicks
    { t: 11.45, fn: (c) => c.sound.noise(75) },
    { t: 11.75, fn: (c) => c.sound.noise(75) },
    { t: 12.05, fn: (c) => c.sound.noise(85) },
    // Smug parting chirp
    { t: 12.30, fn: (c) => c.sound.beep(780, 65) },
    { t: 12.39, fn: (c) => c.sound.beep(980, 75) },

    // Windshield wiper squeak
    { t: 13.05, fn: (c) => { c.sound.beep(1450, 95); c.sound.noise(110); } },
    { t: 13.35, fn: (c) => c.sound.beep(1680, 110) },
  ];

  // Pre-seed fart cloud puffs
  const fartPuffs = [];
  for (let i = 0; i < 28; i++) {
    const angle = -0.75 + ctx.rand() * 1.15;
    const speed = (65 + ctx.rand() * 155) * scale;
    fartPuffs.push({
      delay: ctx.rand() * 0.95,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 25 * scale,
      r: (16 + ctx.rand() * 28) * scale,
      rot: ctx.rand() * Math.PI * 2,
      spin: (ctx.rand() - 0.5) * 2.4,
      hue: 84 + ctx.rand() * 34,
      life: 2.0 + ctx.rand() * 2.4,
    });
  }

  // Pre-seed pee drips on the camera lens
  const peeDrips = [];
  for (let i = 0; i < 22; i++) {
    peeDrips.push({
      spawnAt: 5.3 + ctx.rand() * 2.2,
      x: cam.x + cam.w * (0.28 + ctx.rand() * 0.62),
      y: cam.y + cam.h * (0.20 + ctx.rand() * 0.45),
      r: (4.5 + ctx.rand() * 7.5) * scale,
      speed: (18 + ctx.rand() * 44) * scale,
      wobble: ctx.rand() * Math.PI * 2,
      len: (10 + ctx.rand() * 28) * scale,
    });
  }

  // Pre-seed flies orbiting the poop splat
  const flies = [];
  for (let i = 0; i < 5; i++) {
    flies.push({
      phase: ctx.rand() * Math.PI * 2,
      rx: (28 + ctx.rand() * 38) * scale,
      ry: (16 + ctx.rand() * 26) * scale,
      speed: 3.4 + ctx.rand() * 3.0,
      dir: i % 2 === 0 ? 1 : -1,
    });
  }

  // Pre-seed litter kick debris flecks
  const kickFlecks = [];
  for (let i = 0; i < 16; i++) {
    kickFlecks.push({
      kickIdx: i % 3,
      vx: (110 + ctx.rand() * 140) * scale,
      vy: -(90 + ctx.rand() * 130) * scale,
      size: (2.5 + ctx.rand() * 3.5) * scale,
    });
  }

  return {
    W,
    H,
    cam,
    scale,
    floorY,
    spotX,
    camCenterX,
    camCenterY,
    login,
    soundCues,
    firedCues: new Set(),
    fartPuffs,
    peeDrips,
    flies,
    kickFlecks,
    doneCalled: false,
  };
}

export function init(ctx) {
  const prevLogin = state ? state.login : null;
  state = buildState(ctx, prevLogin);
}

export function onTrigger(ctx, event) {
  if (!state) state = buildState(ctx, null);
  if (event && event.login) {
    state.login = String(event.login);
  }
}

function drawRoundedRect(g, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

function drawSpeechBubble(g, x, y, text, scale, accent) {
  g.save();
  g.font = `900 ${Math.round(16 * scale)}px "Arial Black", Impact, sans-serif`;
  const padX = 12 * scale;
  const metrics = g.measureText(text);
  const bw = metrics.width + padX * 2;
  const bh = 30 * scale;
  const bx = x - bw / 2;
  const by = y - bh;

  g.fillStyle = '#fffdf6';
  g.strokeStyle = '#181825';
  g.lineWidth = 3 * scale;
  drawRoundedRect(g, bx, by, bw, bh, 12 * scale);
  g.fill();
  g.stroke();

  // Pointer triangle
  g.beginPath();
  g.moveTo(x - 6 * scale, by + bh - 1);
  g.lineTo(x + 2 * scale, by + bh + 10 * scale);
  g.lineTo(x + 9 * scale, by + bh - 1);
  g.closePath();
  g.fill();
  g.stroke();

  // Cover seam
  g.fillRect(x - 5 * scale, by + bh - 4 * scale, 13 * scale, 5 * scale);

  g.fillStyle = accent || '#181825';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, by + bh / 2 + 1 * scale);
  g.restore();
}

function drawStarburst(g, cx, cy, outerR, innerR, points, fill, stroke, text, scale, rot) {
  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i * Math.PI) / points;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fillStyle = fill;
  g.strokeStyle = stroke;
  g.lineWidth = 3.5 * scale;
  g.fill();
  g.stroke();

  g.font = `900 ${Math.round(17 * scale)}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 4 * scale;
  g.strokeStyle = '#181825';
  g.strokeText(text, 0, 1);
  g.fillStyle = '#ffffff';
  g.fillText(text, 0, 1);
  g.restore();
}

function drawCat(g, opts) {
  const {
    x,
    y,
    scale,
    facing, // 1 = facing right, -1 = facing left (rear toward right/camera)
    walkPhase,
    mood, // 'trot' | 'fart' | 'pee' | 'poop' | 'kick' | 'smug'
    t,
    strain,
    tailWag,
    liftPaw,
    kickCycle,
  } = opts;

  g.save();
  g.translate(x, y);
  g.scale(facing * scale, scale);

  // Subtle drop shadow under paws
  g.fillStyle = 'rgba(0, 0, 0, 0.28)';
  g.beginPath();
  g.ellipse(0, 2, 46, 10, 0, 0, Math.PI * 2);
  g.fill();

  const bounce = mood === 'trot' ? Math.abs(Math.sin(walkPhase)) * 7 : 0;
  const crouch = mood === 'fart' ? 6 : mood === 'poop' ? 12 : 0;
  const vibX = (mood === 'fart' || mood === 'poop') ? Math.sin(t * 68) * (2.6 * strain) : 0;
  const vibY = (mood === 'fart' || mood === 'poop') ? Math.cos(t * 54) * (1.5 * strain) : 0;

  g.translate(vibX, -bounce + crouch + vibY);

  const orange = '#f28b30';
  const orangeDark = '#c96318';
  const cream = '#fff1d6';
  const outline = '#1e1612';

  // Tail (high question-mark curl on the left/back side of the cat in local coords)
  g.save();
  g.translate(-34, -36);
  const tailAngle =
    mood === 'fart' || mood === 'pee' || mood === 'poop'
      ? -0.25 + Math.sin(t * 14) * 0.12
      : Math.sin(t * 5 + tailWag) * 0.22;
  g.rotate(tailAngle);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(-24, -18, -32, -58, -10, -72);
  g.bezierCurveTo(6, -80, 18, -64, 6, -54);
  g.strokeStyle = outline;
  g.lineWidth = 17;
  g.stroke();
  g.strokeStyle = orange;
  g.lineWidth = 11;
  g.stroke();
  // Tail stripes
  g.strokeStyle = orangeDark;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-17, -28);
  g.lineTo(-10, -24);
  g.moveTo(-22, -48);
  g.lineTo(-14, -47);
  g.moveTo(-12, -67);
  g.lineTo(-8, -60);
  g.stroke();
  g.restore();

  // Back legs (far side)
  const stride = mood === 'trot' ? Math.sin(walkPhase) * 10 : 0;
  const kickOffset = mood === 'kick' ? Math.sin(kickCycle * Math.PI) * 20 : 0;

  // Far back leg
  g.fillStyle = orangeDark;
  g.strokeStyle = outline;
  g.lineWidth = 3.2;
  g.beginPath();
  g.ellipse(-26 - stride * 0.6, -12, 9, 15, 0.12, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Far front leg
  g.beginPath();
  g.ellipse(22 + stride * 0.6, -12, 8.5, 14, -0.08, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Plump oval cat torso
  g.save();
  const bodyStretchY = mood === 'fart' ? 1.07 : mood === 'poop' ? 0.92 : 1;
  const bodyStretchX = mood === 'poop' ? 1.08 : 1;
  g.scale(bodyStretchX, bodyStretchY);
  g.fillStyle = orange;
  g.strokeStyle = outline;
  g.lineWidth = 3.6;
  g.beginPath();
  g.ellipse(-2, -35, 42, 29, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Cream belly patch
  g.fillStyle = cream;
  g.beginPath();
  g.ellipse(2, -20, 26, 12, 0, 0, Math.PI);
  g.fill();

  // Tabby stripes on back
  g.fillStyle = orangeDark;
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.ellipse(-8 + i * 13, -55, 4.5, 11, 0.1 * i, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();

  // Near back leg (lifts slightly during pee or kicks during litter-kick)
  g.save();
  if (mood === 'pee' && liftPaw > 0) {
    g.translate(-22, -20);
    g.rotate(liftPaw * 0.95);
    g.translate(22, 20);
  } else if (mood === 'kick') {
    g.translate(-24 - kickOffset, -14 - kickOffset * 0.35);
    g.rotate(kickOffset * 0.04);
    g.translate(24, 14);
  }
  g.fillStyle = orange;
  g.strokeStyle = outline;
  g.lineWidth = 3.2;
  g.beginPath();
  g.ellipse(-20 + stride * 0.7, -11, 10, 15, -0.1, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  // White sock
  g.fillStyle = cream;
  g.beginPath();
  g.ellipse(-18 + stride * 0.7, -1, 9, 5.5, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();

  // Near front leg
  g.fillStyle = orange;
  g.strokeStyle = outline;
  g.lineWidth = 3.2;
  g.beginPath();
  g.ellipse(18 - stride * 0.7, -11, 9, 15, 0.08, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = cream;
  g.beginPath();
  g.ellipse(20 - stride * 0.7, -1, 8.5, 5.2, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Head (turns slightly toward viewer when committing crimes)
  const headX = 33;
  const headY = -56 + (mood === 'poop' ? 4 : 0);
  g.save();
  g.translate(headX, headY);
  const headTilt =
    mood === 'poop' ? -0.16 : mood === 'smug' ? 0.1 : Math.sin(t * 3.5) * 0.05;
  g.rotate(headTilt);

  // Ears (pinned back when straining!)
  const earPin = mood === 'poop' ? 0.45 : mood === 'fart' ? 0.2 : 0;
  // Left ear
  g.save();
  g.translate(-14, -18);
  g.rotate(-0.2 - earPin);
  g.fillStyle = orange;
  g.strokeStyle = outline;
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(-10, 6);
  g.lineTo(-2, -18);
  g.lineTo(12, 2);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#f8a8b8';
  g.beginPath();
  g.moveTo(-5, 3);
  g.lineTo(-1, -11);
  g.lineTo(7, 1);
  g.closePath();
  g.fill();
  g.restore();

  // Right ear
  g.save();
  g.translate(12, -18);
  g.rotate(0.2 + earPin * 0.5);
  g.fillStyle = orange;
  g.strokeStyle = outline;
  g.lineWidth = 3.2;
  g.beginPath();
  g.moveTo(-10, 2);
  g.lineTo(4, -18);
  g.lineTo(12, 6);
  g.closePath();
  g.fill();
  g.stroke();
  g.fillStyle = '#f8a8b8';
  g.beginPath();
  g.moveTo(-5, 1);
  g.lineTo(3, -11);
  g.lineTo(7, 3);
  g.closePath();
  g.fill();
  g.restore();

  // Round head base
  g.fillStyle = mood === 'poop' ? '#f57842' : orange;
  g.strokeStyle = outline;
  g.lineWidth = 3.6;
  g.beginPath();
  g.ellipse(0, 0, 25, 22, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // Forehead M-stripes
  g.strokeStyle = orangeDark;
  g.lineWidth = 2.8;
  g.beginPath();
  g.moveTo(-7, -18);
  g.lineTo(-4, -10);
  g.moveTo(0, -20);
  g.lineTo(0, -10);
  g.moveTo(7, -18);
  g.lineTo(4, -10);
  g.stroke();

  // Cream muzzle
  g.fillStyle = cream;
  g.beginPath();
  g.ellipse(3, 8, 12, 8.5, 0, 0, Math.PI * 2);
  g.fill();

  // Eyes by mood
  if (mood === 'poop') {
    // Tightly squeezed >< straining eyes
    g.strokeStyle = outline;
    g.lineWidth = 3.2;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-12, -5);
    g.lineTo(-4, -1);
    g.lineTo(-12, 3);
    g.moveTo(15, -5);
    g.lineTo(7, -1);
    g.lineTo(15, 3);
    g.stroke();

    // Blue cartoon sweat drop on temple
    const dropY = -12 + ((t * 28) % 14);
    g.fillStyle = '#6ad4ff';
    g.strokeStyle = '#1b5f8a';
    g.lineWidth = 1.8;
    g.beginPath();
    g.moveTo(-20, dropY - 6);
    g.quadraticCurveTo(-15, dropY + 2, -20, dropY + 5);
    g.quadraticCurveTo(-25, dropY + 2, -20, dropY - 6);
    g.fill();
    g.stroke();
  } else if (mood === 'pee') {
    // Blissful zen closed curved eyes
    g.strokeStyle = outline;
    g.lineWidth = 3.2;
    g.lineCap = 'round';
    g.beginPath();
    g.arc(-7, -1, 5.5, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
    g.beginPath();
    g.arc(10, -1, 5.5, Math.PI * 1.05, Math.PI * 1.95);
    g.stroke();
  } else if (mood === 'fart' || mood === 'smug' || mood === 'kick') {
    // Half-lidded deadpan smug eyes
    g.fillStyle = '#e7ff70';
    g.strokeStyle = outline;
    g.lineWidth = 2.4;
    g.beginPath();
    g.ellipse(-7, -2, 6, 5.5, 0, 0, Math.PI * 2);
    g.ellipse(10, -2, 6, 5.5, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    // Pupils
    g.fillStyle = outline;
    g.beginPath();
    g.ellipse(-6, -1, 2.2, 4.2, 0, 0, Math.PI * 2);
    g.ellipse(11, -1, 2.2, 4.2, 0, 0, Math.PI * 2);
    g.fill();
    // Heavy smug eyelids
    g.fillStyle = orange;
    g.fillRect(-14, -9, 14, 6);
    g.fillRect(3, -9, 14, 6);
    g.strokeStyle = outline;
    g.lineWidth = 2.6;
    g.beginPath();
    g.moveTo(-14, -3);
    g.lineTo(0, -3);
    g.moveTo(3, -3);
    g.lineTo(17, -3);
    g.stroke();
  } else {
    // Big innocent bright eyes while trotting in
    g.fillStyle = '#d9ff59';
    g.strokeStyle = outline;
    g.lineWidth = 2.4;
    g.beginPath();
    g.ellipse(-7, -2, 6.2, 6.8, 0, 0, Math.PI * 2);
    g.ellipse(10, -2, 6.2, 6.8, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = outline;
    g.beginPath();
    g.ellipse(-5.5, -2, 2.6, 5, 0, 0, Math.PI * 2);
    g.ellipse(11.5, -2, 2.6, 5, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(-7.5, -4.5, 1.8, 0, Math.PI * 2);
    g.arc(9.5, -4.5, 1.8, 0, Math.PI * 2);
    g.fill();
  }

  // Pink triangle nose
  g.fillStyle = '#ff7b9c';
  g.strokeStyle = outline;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(0, 4);
  g.lineTo(6, 4);
  g.lineTo(3, 8);
  g.closePath();
  g.fill();
  g.stroke();

  // Mouth (:3 or clenched)
  g.strokeStyle = outline;
  g.lineWidth = 2.3;
  g.lineCap = 'round';
  if (mood === 'poop') {
    g.beginPath();
    g.moveTo(-3, 12);
    g.lineTo(1, 10);
    g.lineTo(5, 12);
    g.lineTo(9, 10);
    g.stroke();
  } else {
    g.beginPath();
    g.arc(0, 10, 3.2, 0.1, Math.PI * 0.9);
    g.stroke();
    g.beginPath();
    g.arc(6.2, 10, 3.2, 0.1, Math.PI * 0.9);
    g.stroke();
  }

  // Whiskers
  g.strokeStyle = outline;
  g.lineWidth = 1.8;
  g.beginPath();
  g.moveTo(-12, 6);
  g.lineTo(-28, 3);
  g.moveTo(-12, 10);
  g.lineTo(-27, 11);
  g.moveTo(16, 6);
  g.lineTo(31, 3);
  g.moveTo(16, 10);
  g.lineTo(30, 11);
  g.stroke();

  // Collar + golden tag
  g.strokeStyle = '#e63973';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(-3, 19, 16, 0.25, Math.PI - 0.5);
  g.stroke();
  g.fillStyle = '#ffd54f';
  g.strokeStyle = outline;
  g.lineWidth = 1.8;
  g.beginPath();
  g.arc(5, 25, 4.5, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  g.restore(); // head
  g.restore(); // cat
}

function drawPoopSwirl(g, cx, cy, scale, tiers, t) {
  if (tiers <= 0) return;
  g.save();
  g.translate(cx, cy);

  const brown = '#7a4419';
  const brownDark = '#4e290d';
  const highlight = '#a86734';

  // Splat puddle base on glass
  g.fillStyle = 'rgba(84, 45, 14, 0.88)';
  g.strokeStyle = '#2d1606';
  g.lineWidth = 2.8 * scale;
  g.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rad = (i % 2 === 0 ? 44 : 33) * scale;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad * 0.45 + 16 * scale;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  g.stroke();

  // Tier 1 (bottom coil)
  if (tiers >= 1) {
    const s1 = easeOutBack(clamp(tiers, 0, 1));
    g.save();
    g.scale(s1, s1);
    g.fillStyle = brown;
    g.strokeStyle = brownDark;
    g.lineWidth = 3.5 * scale;
    g.beginPath();
    g.ellipse(0, 10 * scale, 34 * scale, 15 * scale, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = highlight;
    g.beginPath();
    g.ellipse(-11 * scale, 6 * scale, 10 * scale, 4 * scale, -0.15, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Tier 2 (middle coil)
  if (tiers >= 1.05) {
    const s2 = easeOutBack(clamp(tiers - 1, 0, 1));
    g.save();
    g.scale(s2, s2);
    g.fillStyle = brown;
    g.strokeStyle = brownDark;
    g.lineWidth = 3.5 * scale;
    g.beginPath();
    g.ellipse(0, -6 * scale, 25 * scale, 12.5 * scale, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = highlight;
    g.beginPath();
    g.ellipse(-8 * scale, -9 * scale, 7.5 * scale, 3.2 * scale, -0.15, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Tier 3 (swirl tip)
  if (tiers >= 2.05) {
    const s3 = easeOutBack(clamp(tiers - 2, 0, 1));
    g.save();
    g.scale(s3, s3);
    g.fillStyle = brown;
    g.strokeStyle = brownDark;
    g.lineWidth = 3.4 * scale;
    g.beginPath();
    g.moveTo(-15 * scale, -14 * scale);
    g.bezierCurveTo(-14 * scale, -32 * scale, 2 * scale, -40 * scale, 9 * scale, -34 * scale);
    g.bezierCurveTo(3 * scale, -28 * scale, 16 * scale, -22 * scale, 15 * scale, -14 * scale);
    g.closePath();
    g.fill();
    g.stroke();

    // Comic sparkle glint on top
    const glint = 0.7 + 0.3 * Math.sin(t * 8);
    g.fillStyle = `rgba(255, 250, 210, ${glint})`;
    g.beginPath();
    g.arc(-4 * scale, -23 * scale, 3.2 * scale, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }

  // Wavy cartoon stink lines rising from the coil
  g.strokeStyle = 'rgba(138, 198, 56, 0.85)';
  g.lineWidth = 3 * scale;
  g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    const sx = i * 18 * scale;
    for (let step = 0; step <= 10; step++) {
      const p = step / 10;
      const wx = sx + Math.sin(p * 5 - t * 6 + i * 2) * 5.5 * scale;
      const wy = -32 * scale - p * 36 * scale;
      if (step === 0) g.moveTo(wx, wy);
      else g.lineTo(wx, wy);
    }
    g.stroke();
  }

  g.restore();
}

function drawFlyingProjectile(g, x0, y0, x1, y1, progress, scale) {
  if (progress <= 0 || progress >= 1) return;
  const x = lerp(x0, x1, progress);
  const arc = Math.sin(progress * Math.PI) * 58 * scale;
  const y = lerp(y0, y1, progress) - arc;
  g.save();
  g.translate(x, y);
  g.rotate(progress * 9);
  g.fillStyle = '#7a4419';
  g.strokeStyle = '#3b1e07';
  g.lineWidth = 2.6 * scale;
  g.beginPath();
  g.ellipse(0, 0, 12 * scale, 9 * scale, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.restore();
}

export function frame(ctx, t, dt) {
  if (!state) init(ctx);
  const g = ctx.canvas;
  const { W, H, cam, scale, floorY, spotX, camCenterX, camCenterY } = state;

  // Transparent glass clear every frame
  g.clearRect(0, 0, W, H);

  // Trigger scheduled sound cues
  for (let i = 0; i < state.soundCues.length; i++) {
    if (!state.firedCues.has(i) && t >= state.soundCues[i].t) {
      state.firedCues.add(i);
      state.soundCues[i].fn(ctx);
    }
  }

  // End cleanly after the wiper finishes
  const END_T = 14.3;
  if (t >= END_T) {
    if (!state.doneCalled) {
      state.doneCalled = true;
      ctx.done();
    }
    return;
  }

  // Wiper progress (12.95s -> 14.05s) sweeps mess cleanly off the camera glass
  const wiperP = clamp((t - 12.95) / 1.05, 0, 1);
  const wiperAngle = lerp(-Math.PI * 0.88, -Math.PI * 0.12, easeInOutCubic(wiperP));
  const messAlpha = wiperP > 0 ? clamp(1 - wiperP * 1.15, 0, 1) : 1;

  // Camera shake during fart blast and poop splats
  let camShakeX = 0;
  let camShakeY = 0;
  if (t >= 2.65 && t <= 3.55) {
    const k = (1 - (t - 2.65) / 0.9) * 7 * scale;
    camShakeX = Math.sin(t * 95) * k;
    camShakeY = Math.cos(t * 78) * k;
  } else if (
    (t >= 9.15 && t <= 9.35) ||
    (t >= 9.70 && t <= 9.90) ||
    (t >= 10.22 && t <= 10.48)
  ) {
    camShakeX = Math.sin(t * 110) * 5 * scale;
    camShakeY = Math.cos(t * 88) * 5 * scale;
  }

  // 1. Subtle HUD target frame locked onto SavorySailor's camera
  const hudFade = t < 0.4 ? t / 0.4 : t > 13.6 ? clamp((14.2 - t) / 0.6, 0, 1) : 1;
  g.save();
  g.translate(camShakeX, camShakeY);
  g.globalAlpha = hudFade;

  const isHazard = t >= 2.65 && t < 13.3;
  const frameColor = isHazard ? '#a6f235' : (ctx.accent || '#ff4fa3');
  g.strokeStyle = frameColor;
  g.lineWidth = 3 * scale;
  const corner = 20 * scale;

  // Four corner brackets around SavorySailor's live camera (keeps face completely open)
  g.beginPath();
  // TL
  g.moveTo(cam.x, cam.y + corner);
  g.lineTo(cam.x, cam.y);
  g.lineTo(cam.x + corner, cam.y);
  // TR
  g.moveTo(cam.x + cam.w - corner, cam.y);
  g.lineTo(cam.x + cam.w, cam.y);
  g.lineTo(cam.x + cam.w, cam.y + corner);
  // BL
  g.moveTo(cam.x, cam.y + cam.h - corner);
  g.lineTo(cam.x, cam.y + cam.h);
  g.lineTo(cam.x + corner, cam.y + cam.h);
  // BR
  g.moveTo(cam.x + cam.w - corner, cam.y + cam.h);
  g.lineTo(cam.x + cam.w, cam.y + cam.h);
  g.lineTo(cam.x + cam.w, cam.y + cam.h - corner);
  g.stroke();

  // Top status pill above the camera box
  const pillY = Math.max(12 * scale, cam.y - 34 * scale);
  const headerText = state.login
    ? `!FARTT DEPLOYED BY ${state.login.toUpperCase()}`
    : '!FARTT BIOHAZARD ON SAVORYSAILOR CAM';
  g.font = `900 ${Math.round(13 * scale)}px "Arial Black", sans-serif`;
  const tw = g.measureText(headerText).width + 22 * scale;
  const px = clamp(cam.x + cam.w / 2 - tw / 2, 10, W - tw - 10);
  g.fillStyle = 'rgba(18, 20, 34, 0.82)';
  g.strokeStyle = frameColor;
  g.lineWidth = 2.2 * scale;
  drawRoundedRect(g, px, pillY, tw, 24 * scale, 10 * scale);
  g.fill();
  g.stroke();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(headerText, px + tw / 2, pillY + 12.5 * scale);

  // 2. Mess clipped to SavorySailor's camera lens glass
  g.save();
  drawRoundedRect(g, cam.x, cam.y, cam.w, cam.h, 8 * scale);
  g.clip();

  // 2a. Semi-transparent toxic fart haze on the lens (keeps streamer visible underneath!)
  if (t >= 2.65 && messAlpha > 0) {
    const hazeIn = clamp((t - 2.65) / 0.55, 0, 1);
    const hazePulse = 0.22 + 0.05 * Math.sin(t * 5);
    const grad = g.createRadialGradient(
      camCenterX,
      camCenterY,
      10 * scale,
      camCenterX,
      camCenterY,
      Math.max(cam.w, cam.h) * 0.72
    );
    grad.addColorStop(0, `rgba(145, 224, 34, ${hazeIn * hazePulse * messAlpha})`);
    grad.addColorStop(1, `rgba(92, 158, 18, ${hazeIn * 0.10 * messAlpha})`);
    g.fillStyle = grad;
    g.fillRect(cam.x, cam.y, cam.w, cam.h);
  }

  // 2b. Pee puddles & dripping streaks sliding down the camera glass
  if (t >= 5.3 && messAlpha > 0) {
    g.save();
    g.globalAlpha = messAlpha;
    for (let i = 0; i < state.peeDrips.length; i++) {
      const d = state.peeDrips[i];
      if (t < d.spawnAt) continue;
      const age = t - d.spawnAt;
      const dy = d.y + age * d.speed;
      const dx = d.x + Math.sin(age * 3 + d.wobble) * 2.5 * scale;
      const trailTop = Math.max(d.y, dy - d.len - age * 14 * scale);

      // Glossy yellow streak
      g.strokeStyle = 'rgba(255, 224, 40, 0.76)';
      g.lineWidth = d.r * 1.15;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(d.x, trailTop);
      g.lineTo(dx, dy);
      g.stroke();

      // Droplet bead at tip
      g.fillStyle = 'rgba(255, 232, 66, 0.90)';
      g.beginPath();
      g.ellipse(dx, dy, d.r * 0.85, d.r * 1.15, 0, 0, Math.PI * 2);
      g.fill();

      // Specular white highlight on bead
      g.fillStyle = 'rgba(255, 255, 255, 0.78)';
      g.beginPath();
      g.arc(dx - d.r * 0.25, dy - d.r * 0.25, d.r * 0.28, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }

  // 2c. Poop splat coil on the camera glass
  if (t >= 9.15 && messAlpha > 0) {
    let tiers = 0;
    if (t >= 9.15) tiers += clamp((t - 9.15) / 0.22, 0, 1);
    if (t >= 9.72) tiers += clamp((t - 9.72) / 0.22, 0, 1);
    if (t >= 10.25) tiers += clamp((t - 10.25) / 0.25, 0, 1);

    const splatX = cam.x + cam.w * 0.62;
    const splatY = cam.y + cam.h * 0.56;
    g.save();
    g.globalAlpha = messAlpha;
    drawPoopSwirl(g, splatX, splatY, scale * 0.92, tiers, t);

    // Buzzing cartoon flies around the coil
    if (t >= 10.35) {
      const flyIn = clamp((t - 10.35) / 0.35, 0, 1);
      g.globalAlpha = messAlpha * flyIn;
      for (let i = 0; i < state.flies.length; i++) {
        const fl = state.flies[i];
        const a = t * fl.speed * fl.dir + fl.phase;
        const fx = splatX + Math.cos(a) * fl.rx;
        const fy = splatY - 18 * scale + Math.sin(a * 1.7) * fl.ry;
        // Wings
        const wingFlap = Math.sin(t * 55 + i) * 3 * scale;
        g.fillStyle = 'rgba(235, 245, 255, 0.85)';
        g.beginPath();
        g.ellipse(fx - 3 * scale, fy - 3 * scale + wingFlap * 0.3, 4 * scale, 2.2 * scale, -0.5, 0, Math.PI * 2);
        g.ellipse(fx + 3 * scale, fy - 3 * scale - wingFlap * 0.3, 4 * scale, 2.2 * scale, 0.5, 0, Math.PI * 2);
        g.fill();
        // Body
        g.fillStyle = '#141414';
        g.beginPath();
        g.arc(fx, fy, 2.6 * scale, 0, Math.PI * 2);
        g.fill();
      }
    }
    g.restore();
  }

  // 2d. Corner warning badge inside cam during moisture/territory chaos
  if (t >= 5.6 && messAlpha > 0) {
    g.save();
    g.globalAlpha = messAlpha * (0.75 + 0.25 * Math.sin(t * 10));
    const warnText = t >= 10.6 ? 'MARKED AS TERRITORY' : 'LENS MOISTURE: CRITICAL';
    const warnBg = t >= 10.6 ? 'rgba(122, 68, 25, 0.9)' : 'rgba(204, 152, 0, 0.9)';
    g.font = `900 ${Math.round(11 * scale)}px "Arial Black", sans-serif`;
    const ww = g.measureText(warnText).width + 16 * scale;
    const wx = cam.x + cam.w - ww - 8 * scale;
    const wy = cam.y + 8 * scale;
    g.fillStyle = warnBg;
    g.strokeStyle = '#181825';
    g.lineWidth = 2 * scale;
    drawRoundedRect(g, wx, wy, ww, 20 * scale, 6 * scale);
    g.fill();
    g.stroke();
    g.fillStyle = '#ffffff';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(warnText, wx + ww / 2, wy + 10.5 * scale);
    g.restore();
  }

  // 2e. Windshield wiper sweeping across the camera lens at the finale
  if (wiperP > 0 && wiperP < 1) {
    const pivotX = cam.x + cam.w * 0.5;
    const pivotY = cam.y + cam.h + 10 * scale;
    const armLen = Math.hypot(cam.w * 0.65, cam.h * 1.05);
    const tipX = pivotX + Math.cos(wiperAngle) * armLen;
    const tipY = pivotY + Math.sin(wiperAngle) * armLen;
    const bladeStartX = pivotX + Math.cos(wiperAngle) * (armLen * 0.25);
    const bladeStartY = pivotY + Math.sin(wiperAngle) * (armLen * 0.25);

    // Sudsy foam trail
    g.strokeStyle = 'rgba(235, 252, 255, 0.55)';
    g.lineWidth = 14 * scale;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(bladeStartX, bladeStartY);
    g.lineTo(tipX, tipY);
    g.stroke();

    // Rubber blade + metal arm
    g.strokeStyle = '#222530';
    g.lineWidth = 7 * scale;
    g.beginPath();
    g.moveTo(pivotX, pivotY);
    g.lineTo(tipX, tipY);
    g.stroke();

    g.strokeStyle = '#8fa0b5';
    g.lineWidth = 2.5 * scale;
    g.beginPath();
    g.moveTo(pivotX, pivotY);
    g.lineTo(tipX, tipY);
    g.stroke();
  }

  g.restore(); // end cam clip
  g.restore(); // end cam shake

  // 3. Determine cat position, orientation, and mood across the 5-act timeline
  let catX = spotX;
  let catY = floorY;
  let facing = -1; // -1 = facing left so fluffy rear aims right toward SavorySailor's cam!
  let mood = 'smug';
  let walkPhase = 0;
  let strain = 0;
  let liftPaw = 0;
  let kickCycle = 0;

  const entryStartX = Math.max(-90 * scale, cam.x - 160 * scale);
  const exitEndX = Math.min(W + 130 * scale, cam.x + cam.w + 170 * scale);

  if (t < 1.85) {
    // Act 0: Trots onto SavorySailor's camera frame
    const p = easeInOutCubic(t / 1.85);
    catX = lerp(entryStartX, spotX, p);
    facing = 1;
    mood = 'trot';
    walkPhase = t * 13;
  } else if (t < 2.25) {
    // Quick deliberate turn-around
    catX = spotX;
    facing = t < 2.05 ? 1 : -1;
    mood = 'smug';
  } else if (t < 5.15) {
    // Act I: Farting on the cam
    catX = spotX;
    facing = -1;
    mood = t >= 2.30 && t <= 4.35 ? 'fart' : 'smug';
    strain = t >= 2.65 && t <= 3.55 ? 1 : 0.45;
  } else if (t < 8.15) {
    // Act II: Peeing onto the cam lens
    catX = spotX + 6 * scale;
    facing = -1;
    mood = t >= 5.20 && t <= 7.75 ? 'pee' : 'smug';
    liftPaw = t >= 5.20 && t <= 7.75
      ? clamp((t - 5.20) / 0.25, 0, 1) * clamp((7.75 - t) / 0.25, 0, 1)
      : 0;
  } else if (t < 11.35) {
    // Act III: Pooping directly onto the cam glass
    catX = spotX + 12 * scale;
    facing = -1;
    mood = t >= 8.25 && t <= 10.55 ? 'poop' : 'smug';
    strain = t >= 8.35 && t <= 10.35 ? 1 : 0.2;
  } else if (t < 12.35) {
    // Act IV: Three disrespectful imaginary-litter kicks at the camera
    catX = spotX + 12 * scale;
    facing = -1;
    mood = 'kick';
    const kt = (t - 11.35) / 0.30;
    kickCycle = kt < 3 ? kt % 1 : 0;
  } else {
    // Act V: Smug trot off-stage right
    const p = easeInOutCubic((t - 12.35) / 1.35);
    catX = lerp(spotX + 12 * scale, exitEndX, p);
    facing = 1;
    mood = 'trot';
    walkPhase = t * 13;
  }

  // Cat rear origin (when facing === -1, rear faces RIGHT toward the camera lens!)
  const rearX = catX + (facing === -1 ? 40 * scale : -40 * scale);
  const rearY = catY - 30 * scale;

  // 4. Active effects between the cat and SavorySailor's camera lens

  // 4a. Billowing green cartoon fart cloud puffs
  if (t >= 2.62 && t <= 6.2) {
    for (let i = 0; i < state.fartPuffs.length; i++) {
      const pf = state.fartPuffs[i];
      const age = t - (2.65 + pf.delay);
      if (age < 0 || age > pf.life) continue;
      const p = age / pf.life;
      const px = rearX + pf.vx * age * (1 - p * 0.35);
      const py = rearY + pf.vy * age * (1 - p * 0.25);
      const r = pf.r * (0.45 + p * 1.15);
      const alpha = Math.sin(p * Math.PI) * 0.72;

      g.save();
      g.translate(px, py);
      g.rotate(pf.rot + age * pf.spin);
      g.fillStyle = `hsla(${pf.hue}, 82%, 48%, ${alpha})`;
      g.strokeStyle = `hsla(${pf.hue - 10}, 70%, 22%, ${alpha * 0.9})`;
      g.lineWidth = 2.4 * scale;
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.arc(r * 0.55, -r * 0.2, r * 0.62, 0, Math.PI * 2);
      g.arc(-r * 0.45, r * 0.25, r * 0.58, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.restore();
    }
  }

  // 4b. Cartoon golden pee arc splashing onto the camera lens
  if (t >= 5.25 && t <= 7.65) {
    const streamLife = clamp((t - 5.25) / 0.18, 0, 1) * clamp((7.65 - t) / 0.22, 0, 1);
    const targetX = cam.x + cam.w * (0.58 + Math.sin(t * 2.7) * 0.18);
    const targetY = cam.y + cam.h * (0.36 + Math.cos(t * 3.1) * 0.12);
    const ctrlX = (rearX + targetX) * 0.5;
    const ctrlY = Math.min(rearY, targetY) - 42 * scale;

    g.save();
    g.globalAlpha = streamLife * 0.92;
    g.lineCap = 'round';
    // Outer golden stream
    g.strokeStyle = '#f5c400';
    g.lineWidth = 8.5 * scale;
    g.beginPath();
    g.moveTo(rearX, rearY + 4 * scale);
    g.quadraticCurveTo(ctrlX, ctrlY, targetX, targetY);
    g.stroke();

    // Inner bright core
    g.strokeStyle = '#fff59d';
    g.lineWidth = 3.5 * scale;
    g.beginPath();
    g.moveTo(rearX, rearY + 4 * scale);
    g.quadraticCurveTo(ctrlX, ctrlY, targetX, targetY);
    g.stroke();

    // Impact splash rays on the camera glass
    for (let s = 0; s < 6; s++) {
      const a = t * 14 + (s * Math.PI) / 3;
      const r0 = 5 * scale;
      const r1 = (14 + (s % 2) * 8) * scale;
      g.strokeStyle = '#ffea47';
      g.lineWidth = 2.6 * scale;
      g.beginPath();
      g.moveTo(targetX + Math.cos(a) * r0, targetY + Math.sin(a) * r0);
      g.lineTo(targetX + Math.cos(a) * r1, targetY + Math.sin(a) * r1);
      g.stroke();
    }
    g.restore();
  }

  // 4c. Three flying cartoon poop blobs arcing onto the camera glass
  const splatX = cam.x + cam.w * 0.62;
  const splatY = cam.y + cam.h * 0.56;
  drawFlyingProjectile(g, rearX, rearY + 6 * scale, splatX, splatY + 6 * scale, (t - 8.95) / 0.22, scale);
  drawFlyingProjectile(g, rearX, rearY + 6 * scale, splatX, splatY - 8 * scale, (t - 9.52) / 0.22, scale);
  drawFlyingProjectile(g, rearX, rearY + 6 * scale, splatX, splatY - 22 * scale, (t - 10.05) / 0.22, scale);

  // 4d. Imaginary litter kick motion lines & flecks
  if (t >= 11.35 && t <= 12.35) {
    for (let i = 0; i < state.kickFlecks.length; i++) {
      const f = state.kickFlecks[i];
      const age = t - (11.40 + f.kickIdx * 0.30);
      if (age < 0 || age > 0.35) continue;
      const fx = rearX - 8 * scale + f.vx * age;
      const fy = floorY - 8 * scale + f.vy * age + 260 * scale * age * age;
      g.fillStyle = `rgba(255, 240, 200, ${1 - age / 0.35})`;
      g.beginPath();
      g.arc(fx, fy, f.size, 0, Math.PI * 2);
      g.fill();
    }
  }

  // 5. Draw the cat over the scene
  if (t < 13.75) {
    drawCat(g, {
      x: catX,
      y: catY,
      scale,
      facing,
      walkPhase,
      mood,
      t,
      strain,
      tailWag: 0.4,
      liftPaw,
      kickCycle,
    });
  }

  // 6. Comic speech bubbles & SFX starbursts
  if (t >= 0.72 && t <= 1.75) {
    drawSpeechBubble(g, catX + 32 * scale, catY - 96 * scale, 'mrrp.', scale, '#181825');
  } else if (t >= 2.68 && t <= 4.15) {
    const pop = easeOutBack(clamp((t - 2.68) / 0.22, 0, 1)) * clamp((4.15 - t) / 0.25, 0, 1);
    if (pop > 0.02) {
      g.save();
      const bx = cam.x + cam.w * 0.56;
      const by = cam.y + cam.h * 0.26;
      g.translate(bx, by);
      g.scale(pop, pop);
      drawStarburst(g, 0, 0, 66 * scale, 46 * scale, 11, '#8ae619', '#181825', 'PFFFRRRT!!', scale, -0.08 + Math.sin(t * 14) * 0.04);
      g.restore();
    }
  } else if (t >= 5.55 && t <= 7.25) {
    drawSpeechBubble(g, catX - 24 * scale, catY - 98 * scale, 'ahhh...', scale, '#b8860b');
  } else if (t >= 8.35 && t <= 10.15) {
    drawSpeechBubble(g, catX - 24 * scale, catY - 98 * scale, 'HNNNNNG...', scale, '#9c2a19');
  } else if (t >= 10.30 && t <= 11.45) {
    const pop = easeOutBack(clamp((t - 10.30) / 0.20, 0, 1)) * clamp((11.45 - t) / 0.25, 0, 1);
    if (pop > 0.02) {
      g.save();
      const bx = cam.x + cam.w * 0.62;
      const by = cam.y + cam.h * 0.26;
      g.translate(bx, by);
      g.scale(pop, pop);
      drawStarburst(g, 0, 0, 58 * scale, 40 * scale, 9, '#a65e26', '#181825', 'SPLAT!!', scale, 0.07);
      g.restore();
    }
  } else if (t >= 11.85 && t <= 12.85) {
    drawSpeechBubble(g, catX + (facing === 1 ? 30 : -24) * scale, catY - 98 * scale, 'my cam now :3', scale, '#181825');
  }
}

export function dispose(ctx) {
  state = null;
}
