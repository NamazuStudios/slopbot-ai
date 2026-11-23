// Mega Queef — a Category 5 barometric comedy event rendered on transparent glass.
// A pressurized cartoon bellows builds from shy sputters to a supersonic pastel gale
// that launches toupees, rubber ducks, and savorysailor's tiny boat across the stream.

export const meta = {
  title: 'Mega Queef',
  author: 'savorysailor',
  prompt: 'mega queef',
  createdAt: '2026-11-20T00:00:00Z',
  moderationLevel: 'anything',
};

let W = 1280;
let H = 720;
let unit = 1;

// Core visual entities
let puffs = [];
let shockwaves = [];
let windRibbons = [];
let debris = [];
let petals = [];
let sweatDrops = [];
let callouts = [];
let suctionLines = [];
let afterBubble = null;

// Widget states
let needleBroken = false;
let needleFlying = null;
let anemoBroken = false;
let anemoFlying = null;
let anemoAngle = 0;

// One-shot beat flags & sound rate limiter
let lastSoundAt = -10;
let lastNoiseAt = -10;
let sputterFlags = [false, false, false];
let warningStep = 0;
let inhaleStarted = false;
let boomTriggered = false;
let blastStep = 0;
let boatSpawned = false;
let anemoShearTriggered = false;
let deflateSighPlayed = false;
let encoreSpawned = false;
let encorePopped = false;
let reportBeeped = false;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, k) {
  return a + (b - a) * k;
}

function easeOutCubic(k) {
  const x = clamp(k, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function easeInOutQuad(k) {
  const x = clamp(k, 0, 1);
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function safeBeep(ctx, t, freq, ms, minGap = 0.06) {
  if (t - lastSoundAt < minGap) return;
  lastSoundAt = t;
  ctx.sound.beep(clamp(freq, 55, 1400), clamp(ms, 25, 320));
}

function safeNoise(ctx, t, ms, minGap = 0.14) {
  if (t - lastNoiseAt < minGap) return;
  lastNoiseAt = t;
  ctx.sound.noise(clamp(ms, 30, 420));
}

function roundRectPath(c, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.lineTo(x + w - rad, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rad);
  c.lineTo(x + w, y + h - rad);
  c.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  c.lineTo(x + rad, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rad);
  c.lineTo(x, y + rad);
  c.quadraticCurveTo(x, y, x + rad, y);
  c.closePath();
}

function spawnPuff(ctx, x, y, vx, vy, radius, color, maxLife) {
  puffs.push({
    x,
    y,
    vx,
    vy,
    r: radius,
    grow: radius * (0.9 + ctx.rand() * 1.1),
    color,
    life: 0,
    maxLife,
    rot: ctx.rand() * Math.PI * 2,
    vrot: (ctx.rand() - 0.5) * 2.2,
    lobes: 4 + Math.floor(ctx.rand() * 3),
  });
}

function spawnCallout(text, x, y, vx, vy, size, color, maxLife, rot = 0) {
  callouts.push({
    text,
    x,
    y,
    vx,
    vy,
    size,
    color,
    life: 0,
    maxLife,
    rot,
  });
}

function spawnShockwave(x, y, maxR, color, width) {
  shockwaves.push({
    x,
    y,
    r: 18 * unit,
    maxR,
    color,
    width,
    life: 0,
    maxLife: 1.35,
  });
}

function spawnPetal(ctx, x, y, vx, vy) {
  const palette = ['#ff7eb9', '#ffb3d9', '#ffd1e8', '#fff0f6', '#ff9ecd'];
  petals.push({
    x,
    y,
    vx,
    vy,
    size: (6 + ctx.rand() * 9) * unit,
    color: palette[Math.floor(ctx.rand() * palette.length)],
    rot: ctx.rand() * Math.PI * 2,
    vrot: (ctx.rand() - 0.5) * 6,
    wobble: ctx.rand() * Math.PI * 2,
    life: 0,
    maxLife: 3.5 + ctx.rand() * 2.8,
  });
}

function spawnWindRibbon(ctx, originX, originY) {
  const spread = (ctx.rand() - 0.5) * 0.62;
  const angle = -0.22 + spread;
  const speed = (680 + ctx.rand() * 520) * unit;
  const colors = ['rgba(255,180,220,0.65)', 'rgba(255,240,248,0.72)', 'rgba(255,115,185,0.58)', 'rgba(255,220,165,0.55)'];
  windRibbons.push({
    x: originX + (ctx.rand() - 0.5) * 35 * unit,
    y: originY + (ctx.rand() - 0.5) * 45 * unit,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    len: (90 + ctx.rand() * 150) * unit,
    amp: (8 + ctx.rand() * 18) * unit,
    freq: 0.03 + ctx.rand() * 0.03,
    phase: ctx.rand() * Math.PI * 2,
    width: (3 + ctx.rand() * 5) * unit,
    color: colors[Math.floor(ctx.rand() * colors.length)],
    life: 0,
    maxLife: 1.2 + ctx.rand() * 0.7,
    curl: ctx.rand() < 0.45,
  });
}

function spawnDebrisItem(ctx, kind, x, y, vx, vy) {
  debris.push({
    kind,
    x,
    y,
    vx,
    vy,
    rot: (ctx.rand() - 0.5) * 0.4,
    vrot: (kind === 'boat' ? 0.35 : (ctx.rand() > 0.5 ? 1 : -1) * (2.6 + ctx.rand() * 4.2)),
    scale: (0.85 + ctx.rand() * 0.35) * unit,
    life: 0,
    maxLife: kind === 'boat' ? 5.2 : 4.2,
    wobble: ctx.rand() * Math.PI * 2,
  });
}

function getBellowsAnchor(t) {
  // Slides up cleanly into bottom-left quadrant, leaving center stream unobstructed
  const enterK = easeOutCubic(clamp(t / 1.8, 0, 1));
  const baseX = W * 0.16;
  const baseY = lerp(H + 170 * unit, H * 0.75, enterK);
  return { x: baseX, y: baseY };
}

function drawCloudPuff(c, p) {
  const k = clamp(p.life / p.maxLife, 0, 1);
  const alpha = (1 - k) * (k < 0.12 ? k / 0.12 : 1) * 0.78;
  if (alpha <= 0.01) return;
  const r = p.r + p.grow * easeOutCubic(k);

  c.save();
  c.translate(p.x, p.y);
  c.rotate(p.rot);
  c.globalAlpha = alpha;
  c.fillStyle = p.color;
  c.strokeStyle = 'rgba(255,255,255,0.65)';
  c.lineWidth = 2 * unit;

  c.beginPath();
  c.arc(0, 0, r * 0.65, 0, Math.PI * 2);
  for (let i = 0; i < p.lobes; i++) {
    const a = (i / p.lobes) * Math.PI * 2;
    c.arc(Math.cos(a) * r * 0.45, Math.sin(a) * r * 0.45, r * 0.44, 0, Math.PI * 2);
  }
  c.fill();
  c.restore();
}

function drawBellows(c, t, anchor, pressure, state) {
  // Stylized glossy blush-pink twin-cushion comic air bellows with googly eyes and brass nozzle
  const { x, y } = anchor;

  let sx = 1;
  let sy = 1;
  let shakeX = 0;
  let shakeY = 0;
  let eyeMood = 'normal';
  let tintHot = 0;

  if (state === 'sputter') {
    sx = 0.92;
    sy = 1.08;
    eyeMood = 'sheepish';
  } else if (state === 'inflate') {
    const swell = easeInOutQuad(pressure);
    sx = 1 + swell * 0.72;
    sy = 1 + swell * 0.68;
    const vib = swell * 7 * unit;
    shakeX = Math.sin(t * 24) * vib;
    shakeY = Math.cos(t * 19) * vib * 0.7;
    tintHot = swell;
    eyeMood = swell > 0.55 ? 'panicked' : 'nervous';
  } else if (state === 'inhale') {
    const k = clamp((t - 21.5) / 2.3, 0, 1);
    const bulge = 1.72 + easeOutCubic(k) * 0.24;
    sx = bulge;
    sy = bulge * 0.96;
    shakeX = Math.sin(t * 16) * 2.5 * unit;
    tintHot = 1;
    eyeMood = 'uhoh';
  } else if (state === 'blast') {
    const blastT = clamp((t - 24.3) / 17.2, 0, 1);
    const flutter = Math.sin(t * 28) * (1 - blastT * 0.6) * 0.16;
    const shrink = lerp(1.65, 0.72, easeInOutQuad(blastT));
    sx = shrink * (0.9 + flutter);
    sy = shrink * (1.08 - flutter);
    shakeX = Math.sin(t * 22) * (1 - blastT) * 11 * unit;
    shakeY = Math.cos(t * 25) * (1 - blastT) * 8 * unit;
    tintHot = Math.max(0, 1 - blastT * 1.4);
    eyeMood = 'blasting';
  } else if (state === 'deflated') {
    const dK = easeOutCubic(clamp((t - 41.5) / 2.8, 0, 1));
    sx = lerp(0.75, 1.05, dK);
    sy = lerp(0.75, 0.36, dK);
    eyeMood = 'bliss';
  } else {
    // Gentle idle breathing
    const breath = Math.sin(t * 2.6) * 0.04;
    sx = 1 + breath;
    sy = 1 - breath * 0.8;
  }

  c.save();
  c.translate(x + shakeX, y + shakeY);
  c.scale(sx, sy);

  // Soft drop shadow on transparent glass
  c.save();
  c.fillStyle = 'rgba(15, 10, 35, 0.28)';
  c.beginPath();
  c.ellipse(0, 74 * unit, 92 * unit, 18 * unit, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // Flared brass/pink megaphone vent aimed up-right (-13 degrees)
  c.save();
  c.translate(64 * unit, -12 * unit);
  c.rotate(-0.22);
  const flare = state === 'blast' ? 1.18 + Math.sin(t * 26) * 0.08 : 1;
  c.scale(1, flare);

  const nozzleGrad = c.createLinearGradient(0, -35 * unit, 68 * unit, 35 * unit);
  nozzleGrad.addColorStop(0, '#ff85c0');
  nozzleGrad.addColorStop(0.55, '#ffd166');
  nozzleGrad.addColorStop(1, '#ff6b9d');

  c.fillStyle = nozzleGrad;
  c.strokeStyle = '#3a1438';
  c.lineWidth = 4 * unit;
  c.beginPath();
  c.moveTo(-6 * unit, -18 * unit);
  c.lineTo(54 * unit, -38 * unit);
  c.lineTo(54 * unit, 38 * unit);
  c.lineTo(-6 * unit, 18 * unit);
  c.closePath();
  c.fill();
  c.stroke();

  // Inner vent rim
  c.fillStyle = '#4a1236';
  c.beginPath();
  c.ellipse(54 * unit, 0, 12 * unit, 38 * unit, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Inner glow during pressure / blast
  if (tintHot > 0.2 || state === 'blast') {
    c.fillStyle = state === 'blast' ? 'rgba(255, 230, 245, 0.85)' : `rgba(255, 90, 175, ${tintHot * 0.65})`;
    c.beginPath();
    c.ellipse(52 * unit, 0, 8 * unit, 26 * unit, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // Plush twin-cushion bellows body
  const r1 = Math.round(lerp(255, 255, tintHot));
  const g1 = Math.round(lerp(182, 72, tintHot));
  const b1 = Math.round(lerp(208, 146, tintHot));
  const g2 = Math.round(lerp(130, 36, tintHot));
  const b2 = Math.round(lerp(174, 108, tintHot));

  const bodyGrad = c.createRadialGradient(-28 * unit, -36 * unit, 12 * unit, 0, 0, 105 * unit);
  bodyGrad.addColorStop(0, `rgb(${r1}, ${Math.min(255, g1 + 45)}, ${Math.min(255, b1 + 30)})`);
  bodyGrad.addColorStop(0.6, `rgb(${r1}, ${g1}, ${b1})`);
  bodyGrad.addColorStop(1, `rgb(218, ${g2}, ${b2})`);

  c.fillStyle = bodyGrad;
  c.strokeStyle = '#3a1438';
  c.lineWidth = 4.5 * unit;

  // Draw plush double-lobed silhouette
  c.beginPath();
  c.moveTo(-78 * unit, 12 * unit);
  c.bezierCurveTo(-92 * unit, -52 * unit, -22 * unit, -84 * unit, 10 * unit, -54 * unit);
  c.bezierCurveTo(36 * unit, -82 * unit, 84 * unit, -46 * unit, 72 * unit, 14 * unit);
  c.bezierCurveTo(80 * unit, 66 * unit, 26 * unit, 82 * unit, -2 * unit, 64 * unit);
  c.bezierCurveTo(-36 * unit, 84 * unit, -86 * unit, 62 * unit, -78 * unit, 12 * unit);
  c.closePath();
  c.fill();
  c.stroke();

  // Center plush crease detail
  c.strokeStyle = 'rgba(130, 28, 80, 0.35)';
  c.lineWidth = 3 * unit;
  c.beginPath();
  c.moveTo(6 * unit, -46 * unit);
  c.quadraticCurveTo(-2 * unit, -12 * unit, 4 * unit, 14 * unit);
  c.stroke();

  // Glossy specular highlights
  c.fillStyle = 'rgba(255, 255, 255, 0.45)';
  c.beginPath();
  c.ellipse(-36 * unit, -34 * unit, 22 * unit, 11 * unit, -0.45, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(34 * unit, -36 * unit, 15 * unit, 8 * unit, 0.35, 0, Math.PI * 2);
  c.fill();

  // Badge stencil: MEGA-Q 9000
  c.save();
  c.fillStyle = 'rgba(58, 20, 56, 0.78)';
  roundRectPath(c, -52 * unit, 24 * unit, 96 * unit, 22 * unit, 8 * unit);
  c.fill();
  c.fillStyle = '#ffe5f4';
  c.font = `900 ${Math.round(11 * unit)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('MEGA-Q 9000', -4 * unit, 35 * unit);
  c.restore();

  // Rosy cheeks
  c.fillStyle = 'rgba(255, 78, 140, 0.42)';
  c.beginPath();
  c.ellipse(-42 * unit, 6 * unit, 12 * unit, 7 * unit, 0, 0, Math.PI * 2);
  c.ellipse(32 * unit, 6 * unit, 12 * unit, 7 * unit, 0, 0, Math.PI * 2);
  c.fill();

  // Expressive cartoon eyes
  const leftEyeX = -24 * unit;
  const rightEyeX = 16 * unit;
  const eyeY = -12 * unit;

  if (eyeMood === 'bliss') {
    // Happy curved anime relief eyes ^ ^
    c.strokeStyle = '#3a1438';
    c.lineWidth = 4 * unit;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(leftEyeX, eyeY + 6 * unit, 11 * unit, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
    c.beginPath();
    c.arc(rightEyeX, eyeY + 6 * unit, 11 * unit, Math.PI * 1.15, Math.PI * 1.85);
    c.stroke();
    // Content tiny smile
    c.beginPath();
    c.arc(-4 * unit, 5 * unit, 9 * unit, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  } else if (eyeMood === 'blasting') {
    // Tightly squeezed > < eyes during maximum gale!
    c.strokeStyle = '#3a1438';
    c.lineWidth = 4.5 * unit;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(leftEyeX - 11 * unit, eyeY - 9 * unit);
    c.lineTo(leftEyeX + 7 * unit, eyeY);
    c.lineTo(leftEyeX - 11 * unit, eyeY + 9 * unit);
    c.moveTo(rightEyeX + 11 * unit, eyeY - 9 * unit);
    c.lineTo(rightEyeX - 7 * unit, eyeY);
    c.lineTo(rightEyeX + 11 * unit, eyeY + 9 * unit);
    c.stroke();

    // Wavy strained mouth
    c.beginPath();
    c.moveTo(-18 * unit, 10 * unit);
    c.quadraticCurveTo(-11 * unit, 4 * unit, -4 * unit, 10 * unit);
    c.quadraticCurveTo(3 * unit, 16 * unit, 10 * unit, 10 * unit);
    c.stroke();
  } else {
    // Googly cartoon whites + pupils
    const eyeR = eyeMood === 'uhoh' ? 16 * unit : eyeMood === 'panicked' ? 15 * unit : 13 * unit;
    const pupilR = eyeMood === 'uhoh' ? 3.5 * unit : eyeMood === 'panicked' ? 4.5 * unit : 6 * unit;
    const lookX = eyeMood === 'sheepish' ? 5 * unit : eyeMood === 'panicked' ? Math.sin(t * 17) * 3 * unit : 2 * unit;
    const lookY = eyeMood === 'sheepish' ? -2 * unit : eyeMood === 'panicked' ? Math.cos(t * 15) * 2.5 * unit : 0;

    for (const ex of [leftEyeX, rightEyeX]) {
      c.fillStyle = '#ffffff';
      c.strokeStyle = '#3a1438';
      c.lineWidth = 3 * unit;
      c.beginPath();
      c.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      c.fillStyle = '#240b24';
      c.beginPath();
      c.arc(ex + lookX, eyeY + lookY, pupilR, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(ex + lookX - pupilR * 0.35, eyeY + lookY - pupilR * 0.35, pupilR * 0.35, 0, Math.PI * 2);
      c.fill();
    }

    // Mouth expression
    c.strokeStyle = '#3a1438';
    c.lineWidth = 3.5 * unit;
    c.lineCap = 'round';
    if (eyeMood === 'uhoh') {
      c.fillStyle = '#3a1438';
      c.beginPath();
      c.ellipse(-4 * unit, 10 * unit, 7 * unit, 10 * unit, 0, 0, Math.PI * 2);
      c.fill();
    } else if (eyeMood === 'panicked' || eyeMood === 'nervous') {
      c.beginPath();
      c.moveTo(-16 * unit, 12 * unit);
      c.quadraticCurveTo(-4 * unit, 5 * unit, 8 * unit, 12 * unit);
      c.stroke();
    } else if (eyeMood === 'sheepish') {
      c.beginPath();
      c.moveTo(-14 * unit, 9 * unit);
      c.lineTo(6 * unit, 11 * unit);
      c.stroke();
    } else {
      c.beginPath();
      c.arc(-4 * unit, 6 * unit, 8 * unit, 0.1 * Math.PI, 0.9 * Math.PI);
      c.stroke();
    }
  }

  c.restore();
}

function drawWeatherBanner(c, t, ctx) {
  // Translucent slim top bar — leaves middle gameplay wide open
  const enter = easeOutCubic(clamp(t / 1.1, 0, 1));
  const exit = t > 44 ? 1 - easeOutCubic(clamp((t - 44) / 1.5, 0, 1)) : 1;
  const vis = enter * exit;
  if (vis <= 0.01) return;

  const isAlert = t >= 11.5 && t < 41.5;
  const isBlast = t >= 24.3 && t < 41.5;

  const bw = Math.min(W * 0.72, 760 * unit);
  const bh = 54 * unit;
  const bx = (W - bw) * 0.5;
  const by = lerp(-bh - 20 * unit, 20 * unit, vis);

  c.save();
  c.globalAlpha = vis;

  // Glass pill container
  c.fillStyle = isAlert ? 'rgba(42, 12, 42, 0.84)' : 'rgba(18, 22, 48, 0.82)';
  c.strokeStyle = isBlast ? '#ff6ec7' : isAlert ? '#ff4d8d' : (ctx.accent || '#ff66b3');
  c.lineWidth = 3 * unit;
  roundRectPath(c, bx, by, bw, bh, 14 * unit);
  c.fill();
  c.stroke();

  // Gentle pulse dot (<= 2 Hz, never seizure-fast)
  const pulse = 0.55 + 0.45 * Math.sin(t * 5.2);
  c.fillStyle = isAlert ? `rgba(255, 70, 130, ${pulse})` : `rgba(255, 209, 102, ${pulse})`;
  c.beginPath();
  c.arc(bx + 28 * unit, by + bh * 0.5, 9 * unit, 0, Math.PI * 2);
  c.fill();

  // Headline text
  let title = 'BAROMETRIC ADVISORY  •  PRESSURE ANOMALY DETECTED';
  if (t >= 11.5 && t < 21.5) title = 'WARNING: CAT-5 QUEEFCON 1  •  SECURE ALL TOUPEES';
  else if (t >= 21.5 && t < 24.3) title = 'CRITICAL INHALE DETECTED  •  BRACE FOR IMPACT';
  else if (t >= 24.3 && t < 41.5) title = 'MEGA QUEEF IN PROGRESS  •  PEAK GUST 694.2 KNOTS';
  else if (t >= 41.5) title = 'ALL CLEAR  •  ATMOSPHERIC DIGNITY RECOVERING';

  c.fillStyle = '#fff5fb';
  c.font = `900 ${Math.round(18 * unit)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(title, bx + bw * 0.5 + 10 * unit, by + bh * 0.5 + 1 * unit);

  c.restore();
}

function drawPressureGauge(c, t, pressure) {
  const enter = easeOutCubic(clamp((t - 0.6) / 1.0, 0, 1));
  const exit = t > 43.5 ? 1 - easeOutCubic(clamp((t - 43.5) / 1.6, 0, 1)) : 1;
  const vis = enter * exit;
  if (vis <= 0.01) return;

  const r = 56 * unit;
  const gx = W * 0.07 + 20 * unit;
  const gy = lerp(H + 100 * unit, H * 0.46, vis);

  c.save();
  c.globalAlpha = vis;
  c.translate(gx, gy);

  // Translucent dial housing
  c.fillStyle = 'rgba(18, 20, 44, 0.84)';
  c.strokeStyle = '#ff85c0';
  c.lineWidth = 3.5 * unit;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Color arc zones
  const startA = Math.PI * 0.78;
  const endA = Math.PI * 2.22;
  c.lineWidth = 8 * unit;
  c.strokeStyle = '#6ce5b1';
  c.beginPath();
  c.arc(0, 0, r - 12 * unit, startA, startA + (endA - startA) * 0.45);
  c.stroke();
  c.strokeStyle = '#ffd166';
  c.beginPath();
  c.arc(0, 0, r - 12 * unit, startA + (endA - startA) * 0.45, startA + (endA - startA) * 0.78);
  c.stroke();
  c.strokeStyle = '#ff3b7f';
  c.beginPath();
  c.arc(0, 0, r - 12 * unit, startA + (endA - startA) * 0.78, endA);
  c.stroke();

  // Label
  c.fillStyle = '#ffe5f4';
  c.font = `800 ${Math.round(11 * unit)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.fillText('PSI', 0, 26 * unit);
  const psiVal = t >= 24.3 && t < 41.5 ? 'MAX!' : `${Math.round(pressure * 140)}`;
  c.fillStyle = pressure > 0.75 ? '#ff5c99' : '#ffffff';
  c.font = `900 ${Math.round(14 * unit)}px system-ui, sans-serif`;
  c.fillText(psiVal, 0, 41 * unit);

  // Needle (unless snapped off at t = 20.5s!)
  if (!needleBroken) {
    const jitter = Math.sin(t * 21) * (0.04 + pressure * 0.14);
    const angle = lerp(startA, endA + 0.18, clamp(pressure, 0, 1.08)) + jitter;
    c.save();
    c.rotate(angle);
    c.strokeStyle = '#ff477e';
    c.lineWidth = 4 * unit;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-8 * unit, 0);
    c.lineTo(r - 16 * unit, 0);
    c.stroke();
    c.restore();
  }

  // Center pin
  c.fillStyle = '#ffd166';
  c.beginPath();
  c.arc(0, 0, 6 * unit, 0, Math.PI * 2);
  c.fill();

  c.restore();
}

function drawDopplerRadar(c, t) {
  // Appears during Act 2 & Act 3 in top-right corner
  const enter = easeOutCubic(clamp((t - 11.2) / 1.1, 0, 1));
  const exit = t > 43.0 ? 1 - easeOutCubic(clamp((t - 43.0) / 1.4, 0, 1)) : 1;
  const vis = enter * exit;
  if (vis <= 0.01) return;

  const r = 64 * unit;
  const rx = lerp(W + 100 * unit, W - 92 * unit, vis);
  const ry = 148 * unit;

  c.save();
  c.globalAlpha = vis;
  c.translate(rx, ry);

  // Translucent dark radar dish
  c.fillStyle = 'rgba(14, 24, 46, 0.82)';
  c.strokeStyle = '#ff7eb9';
  c.lineWidth = 3 * unit;
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Concentric range rings
  c.strokeStyle = 'rgba(255, 160, 210, 0.25)';
  c.lineWidth = 1.5 * unit;
  for (const frac of [0.33, 0.66]) {
    c.beginPath();
    c.arc(0, 0, r * frac, 0, Math.PI * 2);
    c.stroke();
  }
  c.beginPath();
  c.moveTo(-r, 0);
  c.lineTo(r, 0);
  c.moveTo(0, -r);
  c.lineTo(0, r);
  c.stroke();

  // Swirling storm cell blob inside radar
  const spin = t * (t >= 24.3 ? 4.2 : 1.9);
  const cellScale = t >= 24.3 ? 1.15 : lerp(0.45, 1.0, clamp((t - 11.2) / 12, 0, 1));
  c.save();
  c.rotate(spin);
  c.scale(cellScale, cellScale);
  for (let arm = 0; arm < 3; arm++) {
    c.rotate((Math.PI * 2) / 3);
    c.strokeStyle = arm === 0 ? 'rgba(255, 70, 150, 0.85)' : 'rgba(255, 170, 215, 0.65)';
    c.lineWidth = 7 * unit;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(14 * unit, 0, 18 * unit, 0, Math.PI * 1.15);
    c.stroke();
  }
  c.restore();

  // Rotating sweep beam
  const sweep = (t * 2.4) % (Math.PI * 2);
  c.fillStyle = 'rgba(120, 255, 200, 0.22)';
  c.beginPath();
  c.moveTo(0, 0);
  c.arc(0, 0, r - 2 * unit, sweep - 0.55, sweep);
  c.closePath();
  c.fill();

  c.fillStyle = '#ffe5f4';
  c.font = `900 ${Math.round(10 * unit)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.fillText('EYE OF THE POOF', 0, r + 15 * unit);

  c.restore();
}

function drawAnemometer(c, t) {
  // Bottom-right wind speed widget during blast; its cups shear off at t = 33s!
  const enter = easeOutCubic(clamp((t - 23.8) / 0.8, 0, 1));
  const exit = t > 43.0 ? 1 - easeOutCubic(clamp((t - 43.0) / 1.4, 0, 1)) : 1;
  const vis = enter * exit;
  if (vis <= 0.01) return;

  const ax = W - 110 * unit;
  const ay = lerp(H + 100 * unit, H - 105 * unit, vis);

  c.save();
  c.globalAlpha = vis;
  c.translate(ax, ay);

  // Glass badge
  c.fillStyle = 'rgba(18, 20, 44, 0.84)';
  c.strokeStyle = '#ffd166';
  c.lineWidth = 3 * unit;
  roundRectPath(c, -74 * unit, -64 * unit, 148 * unit, 128 * unit, 14 * unit);
  c.fill();
  c.stroke();

  // Spinning wind cups (until sheared off!)
  if (!anemoBroken) {
    c.save();
    c.translate(0, -18 * unit);
    c.rotate(anemoAngle);
    c.strokeStyle = '#ffe5f4';
    c.lineWidth = 3 * unit;
    for (let i = 0; i < 3; i++) {
      c.rotate((Math.PI * 2) / 3);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(24 * unit, 0);
      c.stroke();
      c.fillStyle = '#ff6ec7';
      c.beginPath();
      c.arc(26 * unit, 0, 8 * unit, -Math.PI * 0.5, Math.PI * 0.5);
      c.fill();
    }
    c.fillStyle = '#ffd166';
    c.beginPath();
    c.arc(0, 0, 5 * unit, 0, Math.PI * 2);
    c.fill();
    c.restore();
  } else {
    c.fillStyle = '#ff6b9d';
    c.font = `900 ${Math.round(12 * unit)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.fillText('SENSOR LOST!', 0, -16 * unit);
  }

  // Wind speed readout
  let ktsText = '0 KTS';
  if (t >= 24.3 && t < 33) {
    const k = clamp((t - 24.3) / 7.5, 0, 1);
    const kts = Math.round(lerp(95, 694, easeOutCubic(k)));
    ktsText = `${kts} KTS`;
  } else if (t >= 33 && t < 41.5) {
    ktsText = '694.2+ KTS';
  } else if (t >= 41.5) {
    ktsText = '4 KTS';
  }

  c.fillStyle = '#ffd166';
  c.font = `900 ${Math.round(20 * unit)}px system-ui, sans-serif`;
  c.textAlign = 'center';
  c.fillText(ktsText, 0, 28 * unit);

  c.fillStyle = '#ffb3d9';
  c.font = `700 ${Math.round(10 * unit)}px system-ui, sans-serif`;
  c.fillText('GUST METER', 0, 48 * unit);

  c.restore();
}

function drawDebrisItem(c, d) {
  const k = clamp(d.life / d.maxLife, 0, 1);
  const alpha = k > 0.85 ? (1 - k) / 0.15 : 1;
  if (alpha <= 0.01) return;

  c.save();
  c.globalAlpha = alpha;
  c.translate(d.x, d.y);
  c.rotate(d.rot);
  c.scale(d.scale, d.scale);

  if (d.kind === 'boat') {
    // Savorysailor's tiny wooden sailboat hydroplaning across the gale!
    c.fillStyle = '#c97a40';
    c.strokeStyle = '#3a1f12';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(-48, 8);
    c.lineTo(52, 8);
    c.lineTo(34, 30);
    c.lineTo(-36, 30);
    c.closePath();
    c.fill();
    c.stroke();

    // Nameplate
    c.fillStyle = '#fff5e4';
    c.font = '900 10px system-ui, sans-serif';
    c.textAlign = 'center';
    c.fillText('S.S. SAVORY', 4, 23);

    // Bent mast
    c.strokeStyle = '#5c3317';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(0, 8);
    c.quadraticCurveTo(18, -28, 34, -56);
    c.stroke();

    // Billowing over-inflated sail
    c.fillStyle = '#fff0f6';
    c.strokeStyle = '#ff6ec7';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(4, -2);
    c.quadraticCurveTo(54, -24, 34, -54);
    c.quadraticCurveTo(14, -30, 4, -2);
    c.fill();
    c.stroke();

    // Tiny horrified stick sailor clinging to mast
    c.strokeStyle = '#1e1b2e';
    c.lineWidth = 2.5;
    c.beginPath();
    c.arc(-14, -10, 6, 0, Math.PI * 2); // head
    c.moveTo(-14, -4);
    c.lineTo(-28, 4); // body flying horizontally!
    c.moveTo(-16, -2);
    c.lineTo(3, -8); // arms gripping mast
    c.stroke();
  } else if (d.kind === 'umbrella') {
    // Inside-out pink beach umbrella
    c.strokeStyle = '#5c3317';
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(0, -18);
    c.lineTo(0, 32);
    c.arc(-6, 32, 6, 0, Math.PI);
    c.stroke();

    c.fillStyle = '#ff6ec7';
    c.strokeStyle = '#3a1438';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-34, -26);
    c.quadraticCurveTo(0, 10, 34, -26);
    c.quadraticCurveTo(16, -6, 0, -12);
    c.quadraticCurveTo(-16, -6, -34, -26);
    c.closePath();
    c.fill();
    c.stroke();
  } else if (d.kind === 'toupee') {
    // Majestic flapping fluffy toupee!
    const flap = Math.sin(d.life * 16 + d.wobble) * 8;
    c.fillStyle = '#8b5a2b';
    c.strokeStyle = '#3a2210';
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(-30, 6);
    c.quadraticCurveTo(-24, -18 + flap, 0, -16 - flap * 0.5);
    c.quadraticCurveTo(26, -14 + flap, 34, 4);
    c.quadraticCurveTo(6, 12, -30, 6);
    c.closePath();
    c.fill();
    c.stroke();
    // Hair swoop highlights
    c.strokeStyle = '#c48f5a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-18, -4);
    c.quadraticCurveTo(0, -12 + flap * 0.4, 20, -3);
    c.stroke();
  } else if (d.kind === 'duck') {
    // Panicked yellow rubber duck
    c.fillStyle = '#ffd93d';
    c.strokeStyle = '#4a2f00';
    c.lineWidth = 2.5;
    c.beginPath();
    c.ellipse(0, 6, 20, 14, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.beginPath();
    c.arc(14, -10, 12, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    // Beak
    c.fillStyle = '#ff7b00';
    c.beginPath();
    c.moveTo(24, -12);
    c.lineTo(35, -8);
    c.lineTo(24, -4);
    c.closePath();
    c.fill();
    c.stroke();
    // Wide panicked eye
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(17, -12, 4.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#111111';
    c.beginPath();
    c.arc(18, -12, 2, 0, Math.PI * 2);
    c.fill();
  } else if (d.kind === 'note') {
    // Musical note blown sideways
    c.fillStyle = '#ff9ecd';
    c.strokeStyle = '#3a1438';
    c.lineWidth = 2.5;
    c.font = '900 34px system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.strokeText('♫', 0, 0);
    c.fillText('♫', 0, 0);
  }

  c.restore();
}

function drawBlastCone(c, t, anchor) {
  // Translucent supersonic pastel air-cone shooting out of the bellows during Act 3
  if (t < 24.3 || t > 41.8) return;
  const localT = t - 24.3;
  const fadeIn = easeOutCubic(clamp(localT / 0.35, 0, 1));
  const fadeOut = localT > 14.5 ? 1 - easeOutCubic(clamp((localT - 14.5) / 3.0, 0, 1)) : 1;
  const strength = fadeIn * fadeOut;
  if (strength <= 0.01) return;

  const nozzleX = anchor.x + 112 * unit;
  const nozzleY = anchor.y - 24 * unit;
  const len = W * 0.92 * strength;

  c.save();
  c.translate(nozzleX, nozzleY);
  c.rotate(-0.22);

  // Layered translucent air cone (lets the stream show right through!)
  const coneGrad = c.createLinearGradient(0, 0, len, 0);
  coneGrad.addColorStop(0, `rgba(255, 225, 245, ${0.52 * strength})`);
  coneGrad.addColorStop(0.35, `rgba(255, 130, 200, ${0.32 * strength})`);
  coneGrad.addColorStop(0.75, `rgba(255, 195, 230, ${0.14 * strength})`);
  coneGrad.addColorStop(1, 'rgba(255, 220, 240, 0)');

  const wobble = Math.sin(t * 22) * 18 * unit;
  c.fillStyle = coneGrad;
  c.beginPath();
  c.moveTo(0, -26 * unit);
  c.lineTo(len, -260 * unit + wobble);
  c.lineTo(len, 260 * unit + wobble);
  c.lineTo(0, 26 * unit);
  c.closePath();
  c.fill();

  // Mach pressure rings pulsing down the jet
  c.strokeStyle = `rgba(255, 245, 252, ${0.55 * strength})`;
  c.lineWidth = 4 * unit;
  for (let i = 0; i < 4; i++) {
    const phase = ((t * 2.2 + i * 0.25) % 1);
    const rx = phase * len * 0.85;
    const ry = lerp(34 * unit, 210 * unit, phase);
    c.globalAlpha = (1 - phase) * strength * 0.7;
    c.beginPath();
    c.ellipse(rx, 0, 16 * unit + phase * 22 * unit, ry, 0, 0, Math.PI * 2);
    c.stroke();
  }

  c.restore();
}

function drawSummaryCard(c, t, ctx) {
  // Act 4 meteorological punchline scorecard (49.5s – 58.2s)
  if (t < 49.5) return;
  const enter = easeOutCubic(clamp((t - 49.5) / 1.1, 0, 1));
  const exit = t > 56.8 ? 1 - easeOutCubic(clamp((t - 56.8) / 1.6, 0, 1)) : 1;
  const vis = enter * exit;
  if (vis <= 0.01) return;

  const cw = 430 * unit;
  const ch = 178 * unit;
  const cx = W - cw - 36 * unit;
  const cy = lerp(H + 40 * unit, H - ch - 34 * unit, vis);

  c.save();
  c.globalAlpha = vis;

  c.fillStyle = 'rgba(16, 20, 44, 0.88)';
  c.strokeStyle = ctx.accent || '#ff6ec7';
  c.lineWidth = 3.5 * unit;
  roundRectPath(c, cx, cy, cw, ch, 16 * unit);
  c.fill();
  c.stroke();

  // Header strip
  c.fillStyle = 'rgba(255, 110, 199, 0.24)';
  roundRectPath(c, cx + 10 * unit, cy + 10 * unit, cw - 20 * unit, 34 * unit, 10 * unit);
  c.fill();

  c.fillStyle = '#ffd166';
  c.font = `900 ${Math.round(14 * unit)}px system-ui, sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText('OFFICIAL METEOROLOGICAL SUMMARY', cx + 22 * unit, cy + 27 * unit);

  const lines = [
    ['EVENT', 'MEGA QUEEF (CAT-5)'],
    ['PEAK GUST', '694.2 KNOTS'],
    ['CASUALTIES', '1 SAILBOAT, 1 TOUPEE, ALL DIGNITY'],
    ['COMMISSIONED BY', 'SAVORYSAILOR'],
  ];

  for (let i = 0; i < lines.length; i++) {
    const ly = cy + 66 * unit + i * 27 * unit;
    c.fillStyle = '#ff9ecd';
    c.font = `800 ${Math.round(12 * unit)}px system-ui, sans-serif`;
    c.fillText(`${lines[i][0]}:`, cx + 22 * unit, ly);

    c.fillStyle = '#ffffff';
    c.font = `700 ${Math.round(12.5 * unit)}px system-ui, sans-serif`;
    c.fillText(lines[i][1], cx + 154 * unit, ly);
  }

  c.restore();
}

export function init(ctx) {
  W = ctx.width || 1280;
  H = ctx.height || 720;
  unit = Math.min(W / 1280, H / 720);

  puffs = [];
  shockwaves = [];
  windRibbons = [];
  debris = [];
  petals = [];
  sweatDrops = [];
  callouts = [];
  suctionLines = [];
  afterBubble = null;

  needleBroken = false;
  needleFlying = null;
  anemoBroken = false;
  anemoFlying = null;
  anemoAngle = 0;

  lastSoundAt = -10;
  lastNoiseAt = -10;
  sputterFlags = [false, false, false];
  warningStep = 0;
  inhaleStarted = false;
  boomTriggered = false;
  blastStep = 0;
  boatSpawned = false;
  anemoShearTriggered = false;
  deflateSighPlayed = false;
  encoreSpawned = false;
  encorePopped = false;
  reportBeeped = false;
}

export function frame(ctx, t, dt) {
  W = ctx.width || 1280;
  H = ctx.height || 720;
  unit = Math.min(W / 1280, H / 720);
  const stepDt = clamp(dt || 1 / 60, 0.001, 0.08);
  const c = ctx.canvas;

  // Transparent glass over the live stream — ALWAYS clear every frame
  c.clearRect(0, 0, W, H);

  // Global clean fade-out right before the 60s cutoff
  const masterAlpha = t > 57.5 ? clamp(1 - (t - 57.5) / 1.4, 0, 1) : 1;
  if (masterAlpha <= 0.005) return;

  const anchor = getBellowsAnchor(t);
  const nozzleX = anchor.x + 115 * unit;
  const nozzleY = anchor.y - 26 * unit;

  // Determine current act state & barometric pressure (0..1)
  let bellowsState = 'idle';
  let pressure = 0.08;

  if (t < 11.5) {
    pressure = lerp(0.08, 0.48, clamp(t / 11.5, 0, 1));
    // Shy test sputters at 3.2s, 6.2s, 9.1s
    const sputterTimes = [3.2, 6.2, 9.1];
    const sputterWords = ['pff.', 'prrt...', 'sqk?!'];
    const sputterFreqs = [135, 108, 220];
    for (let i = 0; i < 3; i++) {
      const st = sputterTimes[i];
      if (t >= st && t < st + 0.45) bellowsState = 'sputter';
      if (t >= st && !sputterFlags[i]) {
        sputterFlags[i] = true;
        safeBeep(ctx, t, sputterFreqs[i], 115, 0.05);
        safeNoise(ctx, t, 85, 0.1);
        for (let k = 0; k < 4; k++) {
          spawnPuff(
            ctx,
            nozzleX,
            nozzleY,
            (110 + ctx.rand() * 95) * unit,
            (-35 + (ctx.rand() - 0.5) * 60) * unit,
            (12 + ctx.rand() * 10) * unit,
            '#ffd6ec',
            1.4
          );
        }
        spawnCallout(
          sputterWords[i],
          nozzleX + 35 * unit,
          nozzleY - 24 * unit,
          55 * unit,
          -30 * unit,
          24 * unit,
          '#ffe5f4',
          1.5,
          -0.12
        );
      }
    }
  } else if (t < 21.5) {
    bellowsState = 'inflate';
    pressure = lerp(0.48, 1.05, clamp((t - 11.5) / 9.5, 0, 1));

    // Escalating warning pips & flying sweat drops
    const interval = lerp(0.85, 0.36, clamp((t - 11.5) / 9.5, 0, 1));
    const expectedStep = Math.floor((t - 11.5) / interval);
    if (expectedStep > warningStep) {
      warningStep = expectedStep;
      const pitch = lerp(190, 440, clamp((t - 11.5) / 9.5, 0, 1));
      safeBeep(ctx, t, pitch, 65, 0.12);
      // Spawn nervous sweat drop
      const ang = -Math.PI * 0.8 + ctx.rand() * Math.PI * 0.6;
      sweatDrops.push({
        x: anchor.x + Math.cos(ang) * 75 * unit,
        y: anchor.y + Math.sin(ang) * 65 * unit,
        vx: Math.cos(ang) * (120 + ctx.rand() * 90) * unit,
        vy: Math.sin(ang) * (130 + ctx.rand() * 90) * unit - 40 * unit,
        life: 0,
        maxLife: 0.9,
      });
    }

    // Needle snaps off gauge at t = 20.4s!
    if (t >= 20.4 && !needleBroken) {
      needleBroken = true;
      safeBeep(ctx, t, 680, 90, 0.05);
      needleFlying = {
        x: W * 0.07 + 20 * unit,
        y: H * 0.46,
        vx: 260 * unit,
        vy: -380 * unit,
        rot: 0,
        vrot: 18,
      };
      spawnCallout('SNAP!', W * 0.07 + 55 * unit, H * 0.42, 30 * unit, -45 * unit, 24 * unit, '#ffd166', 1.2, -0.2);
    }
  } else if (t < 24.3) {
    // Act 2 climax: deep comical inhale + "...oh no."
    bellowsState = 'inhale';
    pressure = 1.08;
    if (!inhaleStarted) {
      inhaleStarted = true;
      safeBeep(ctx, t, 310, 220, 0.05);
      spawnCallout('...oh no.', anchor.x + 15 * unit, anchor.y - 165 * unit, 0, -10 * unit, 28 * unit, '#ffffff', 2.2, 0);
    }
    if (t < 23.6 && ctx.rand() < 0.45) {
      const ang = -0.75 + ctx.rand() * 1.1;
      const dist = (210 + ctx.rand() * 240) * unit;
      suctionLines.push({
        x: nozzleX + Math.cos(ang) * dist,
        y: nozzleY + Math.sin(ang) * dist,
        tx: nozzleX,
        ty: nozzleY,
        life: 0,
        maxLife: 0.55,
      });
    }
  } else if (t < 41.5) {
    // ACT 3: THE MEGA QUEEF DETONATION!
    bellowsState = 'blast';
    const blastK = clamp((t - 24.3) / 17.2, 0, 1);
    pressure = lerp(1.08, 0.12, blastK);

    if (!boomTriggered) {
      boomTriggered = true;
      safeBeep(ctx, t, 78, 300, 0.01);
      safeNoise(ctx, t, 400, 0.01);
      spawnShockwave(nozzleX, nozzleY, W * 0.95, '#ff6ec7', 14 * unit);
      spawnShockwave(nozzleX, nozzleY, W * 0.72, '#fff0f6', 9 * unit);
      spawnShockwave(nozzleX, nozzleY, W * 0.52, '#ffd166', 7 * unit);

      spawnCallout(
        'PFFFFFFFRRRRRRRBTTTT!!',
        W * 0.52,
        H * 0.34,
        75 * unit,
        -22 * unit,
        46 * unit,
        '#ff85c0',
        3.4,
        -0.14
      );

      // Immediate explosion of clouds and petals
      for (let i = 0; i < 16; i++) {
        const a = -0.55 + ctx.rand() * 0.75;
        const spd = (240 + ctx.rand() * 440) * unit;
        spawnPuff(
          ctx,
          nozzleX,
          nozzleY,
          Math.cos(a) * spd,
          Math.sin(a) * spd,
          (24 + ctx.rand() * 26) * unit,
          i % 2 === 0 ? '#ffc2e2' : '#fff0f6',
          1.8 + ctx.rand() * 0.9
        );
      }
      for (let i = 0; i < 24; i++) {
        const a = -0.6 + ctx.rand() * 0.9;
        const spd = (320 + ctx.rand() * 480) * unit;
        spawnPetal(ctx, nozzleX, nozzleY, Math.cos(a) * spd, Math.sin(a) * spd);
      }
    }

    // Continuous comedic raspberry audio & wind ribbons while gale rages
    const intensity = 1 - blastK * 0.65;
    anemoAngle += stepDt * (18 + intensity * 26);

    const soundTick = Math.floor((t - 24.3) / 0.24);
    if (soundTick > blastStep && t < 39.8) {
      blastStep = soundTick;
      // Comedic bassoon / flutter raspberry pitch wobble
      const flutterFreqs = [82, 96, 74, 112, 68, 90, 104, 72];
      const f = flutterFreqs[soundTick % flutterFreqs.length] * (0.9 + ctx.rand() * 0.22);
      safeBeep(ctx, t, f, 145, 0.16);
      if (soundTick % 2 === 0) {
        safeNoise(ctx, t, Math.round(180 + intensity * 160), 0.28);
      }

      // Comic onomatopoeia & secondary shockwaves at memorable beats
      if (soundTick === 12) {
        spawnCallout('WHOOOOOOOSH!!', W * 0.46, H * 0.52, 110 * unit, -28 * unit, 38 * unit, '#ffd166', 2.4, -0.1);
        spawnShockwave(nozzleX, nozzleY, W * 0.78, '#ffb3d9', 8 * unit);
      } else if (soundTick === 25) {
        spawnCallout('SONIC POOF!', W * 0.56, H * 0.28, 95 * unit, -18 * unit, 36 * unit, '#ffffff', 2.2, -0.18);
      } else if (soundTick === 38) {
        spawnCallout('FLAP-FLAP-FLAP', W * 0.42, H * 0.62, 120 * unit, -35 * unit, 30 * unit, '#ff9ecd', 2.0, -0.08);
      } else if (soundTick === 50) {
        spawnCallout('694.2 KNOTS!!', W * 0.58, H * 0.44, 80 * unit, -20 * unit, 34 * unit, '#ffd166', 2.2, -0.12);
      }
    }

    // Spawn gust ribbons, puffs, petals, and hilarious flying debris
    if (ctx.rand() < 0.78 * intensity) {
      spawnWindRibbon(ctx, nozzleX, nozzleY);
    }
    if (ctx.rand() < 0.36 * intensity) {
      const a = -0.52 + ctx.rand() * 0.64;
      const spd = (320 + ctx.rand() * 380) * unit;
      spawnPuff(
        ctx,
        nozzleX + 20 * unit,
        nozzleY,
        Math.cos(a) * spd,
        Math.sin(a) * spd,
        (18 + ctx.rand() * 22) * unit,
        ctx.rand() < 0.5 ? '#ffd6ec' : '#ff9ecd',
        1.5 + ctx.rand() * 0.7
      );
    }
    if (ctx.rand() < 0.45 * intensity) {
      const a = -0.55 + ctx.rand() * 0.8;
      const spd = (360 + ctx.rand() * 440) * unit;
      spawnPetal(ctx, nozzleX, nozzleY, Math.cos(a) * spd, Math.sin(a) * spd);
    }

    // Spawn S.S. Savory sailboat at t = 28.2s!
    if (t >= 28.2 && !boatSpawned) {
      boatSpawned = true;
      spawnDebrisItem(ctx, 'boat', nozzleX + 30 * unit, H * 0.68, 410 * unit, -55 * unit);
      spawnCallout('MAN OVERBOARD!', W * 0.38, H * 0.76, 130 * unit, -35 * unit, 26 * unit, '#ffd166', 2.2, -0.08);
    }

    // Random funny props flying down-wind
    if (t < 38.5 && ctx.rand() < 0.055) {
      const kinds = ['umbrella', 'toupee', 'duck', 'note'];
      const kind = kinds[Math.floor(ctx.rand() * kinds.length)];
      const a = -0.45 + ctx.rand() * 0.55;
      const spd = (360 + ctx.rand() * 320) * unit;
      spawnDebrisItem(ctx, kind, nozzleX + 10 * unit, nozzleY + (ctx.rand() - 0.5) * 60 * unit, Math.cos(a) * spd, Math.sin(a) * spd);
    }

    // Anemometer cups shear off at t = 33.0s!
    if (t >= 33.0 && !anemoShearTriggered) {
      anemoShearTriggered = true;
      anemoBroken = true;
      safeBeep(ctx, t, 740, 110, 0.05);
      anemoFlying = {
        x: W - 110 * unit,
        y: H - 123 * unit,
        vx: 220 * unit,
        vy: -390 * unit,
        rot: 0,
        vrot: 22,
      };
      spawnCallout('RIP METER!', W - 165 * unit, H - 170 * unit, -20 * unit, -45 * unit, 22 * unit, '#ff6ec7', 1.8, -0.15);
    }
  } else {
    // ACT 4: Deflation, polite after-poof, & official weather report (41.5s – 58.5s)
    bellowsState = 'deflated';
    pressure = 0.02;

    if (!deflateSighPlayed) {
      deflateSighPlayed = true;
      safeNoise(ctx, t, 320, 0.05);
      safeBeep(ctx, t, 175, 220, 0.05);
    }

    // Gentle floating rose petals settling down
    if (t < 54 && ctx.rand() < 0.08) {
      spawnPetal(ctx, ctx.rand() * W, -20 * unit, (15 + ctx.rand() * 25) * unit, (45 + ctx.rand() * 40) * unit);
    }

    // Tiny polite encore bubble at 46.8s!
    if (t >= 46.8 && !encoreSpawned) {
      encoreSpawned = true;
      afterBubble = {
        x: anchor.x + 88 * unit,
        y: anchor.y - 6 * unit,
        r: 14 * unit,
        life: 0,
      };
      safeBeep(ctx, t, 460, 65, 0.05);
    }

    if (afterBubble && !encorePopped) {
      afterBubble.life += stepDt;
      afterBubble.x += (28 + Math.sin(t * 5) * 18) * unit * stepDt;
      afterBubble.y -= 62 * unit * stepDt;
      afterBubble.r = (14 + afterBubble.life * 4) * unit;
      if (afterBubble.life >= 2.0) {
        encorePopped = true;
        safeBeep(ctx, t, 860, 70, 0.04);
        spawnCallout('*poot*', afterBubble.x, afterBubble.y, 8 * unit, -22 * unit, 22 * unit, '#ffe5f4', 2.1, -0.06);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          spawnPetal(ctx, afterBubble.x, afterBubble.y, Math.cos(a) * 65 * unit, Math.sin(a) * 65 * unit);
        }
        afterBubble = null;
      }
    }

    if (t >= 49.5 && !reportBeeped) {
      reportBeeped = true;
      safeBeep(ctx, t, 520, 80, 0.05);
    }
  }

  // Update dynamic particles
  for (let i = puffs.length - 1; i >= 0; i--) {
    const p = puffs[i];
    p.life += stepDt;
    p.x += p.vx * stepDt;
    p.y += p.vy * stepDt;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.rot += p.vrot * stepDt;
    if (p.life >= p.maxLife) puffs.splice(i, 1);
  }

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const s = shockwaves[i];
    s.life += stepDt;
    const k = clamp(s.life / s.maxLife, 0, 1);
    s.r = lerp(24 * unit, s.maxR, easeOutCubic(k));
    if (s.life >= s.maxLife) shockwaves.splice(i, 1);
  }

  for (let i = windRibbons.length - 1; i >= 0; i--) {
    const r = windRibbons[i];
    r.life += stepDt;
    r.x += r.vx * stepDt;
    r.y += r.vy * stepDt;
    if (r.life >= r.maxLife || r.x > W + 240 * unit) windRibbons.splice(i, 1);
  }

  for (let i = debris.length - 1; i >= 0; i--) {
    const d = debris[i];
    d.life += stepDt;
    d.x += d.vx * stepDt;
    d.y += d.vy * stepDt + Math.sin(d.life * 6 + d.wobble) * 35 * unit * stepDt;
    d.rot += d.vrot * stepDt;
    if (d.life >= d.maxLife || d.x > W + 180 * unit || d.y < -180 * unit) debris.splice(i, 1);
  }

  for (let i = petals.length - 1; i >= 0; i--) {
    const p = petals[i];
    p.life += stepDt;
    p.x += (p.vx + Math.sin(t * 3 + p.wobble) * 28 * unit) * stepDt;
    p.y += p.vy * stepDt;
    p.vx *= 0.992;
    p.vy += 18 * unit * stepDt;
    p.rot += p.vrot * stepDt;
    if (p.life >= p.maxLife || p.x > W + 60 * unit || p.y > H + 60 * unit) petals.splice(i, 1);
  }

  for (let i = sweatDrops.length - 1; i >= 0; i--) {
    const s = sweatDrops[i];
    s.life += stepDt;
    s.x += s.vx * stepDt;
    s.y += s.vy * stepDt;
    s.vy += 420 * unit * stepDt;
    if (s.life >= s.maxLife) sweatDrops.splice(i, 1);
  }

  for (let i = suctionLines.length - 1; i >= 0; i--) {
    const s = suctionLines[i];
    s.life += stepDt;
    if (s.life >= s.maxLife) suctionLines.splice(i, 1);
  }

  for (let i = callouts.length - 1; i >= 0; i--) {
    const o = callouts[i];
    o.life += stepDt;
    o.x += o.vx * stepDt;
    o.y += o.vy * stepDt;
    o.vx *= 0.98;
    o.vy *= 0.98;
    if (o.life >= o.maxLife) callouts.splice(i, 1);
  }

  if (needleFlying) {
    needleFlying.x += needleFlying.vx * stepDt;
    needleFlying.y += needleFlying.vy * stepDt;
    needleFlying.vy += 780 * unit * stepDt;
    needleFlying.rot += needleFlying.vrot * stepDt;
    if (needleFlying.y > H + 120 * unit) needleFlying = null;
  }

  if (anemoFlying) {
    anemoFlying.x += anemoFlying.vx * stepDt;
    anemoFlying.y += anemoFlying.vy * stepDt;
    anemoFlying.vy += 680 * unit * stepDt;
    anemoFlying.rot += anemoFlying.vrot * stepDt;
    if (anemoFlying.y > H + 120 * unit) anemoFlying = null;
  }

  // ==================== RENDER LAYERS ====================
  c.save();
  c.globalAlpha = masterAlpha;

  // 1. Shockwave rings
  for (const s of shockwaves) {
    const k = clamp(s.life / s.maxLife, 0, 1);
    c.save();
    c.globalAlpha = (1 - k) * 0.72 * masterAlpha;
    c.strokeStyle = s.color;
    c.lineWidth = s.width * (1 - k * 0.65);
    c.beginPath();
    c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // 2. Translucent supersonic wind cone
  drawBlastCone(c, t, anchor);

  // 3. Swirling wind ribbons
  for (const r of windRibbons) {
    const k = clamp(r.life / r.maxLife, 0, 1);
    const alpha = Math.sin(k * Math.PI);
    c.save();
    c.globalAlpha = alpha * masterAlpha;
    c.strokeStyle = r.color;
    c.lineWidth = r.width;
    c.lineCap = 'round';
    c.beginPath();
    const steps = 10;
    for (let s = 0; s <= steps; s++) {
      const f = s / steps;
      const px = r.x - f * r.len;
      const py = r.y + Math.sin(f * Math.PI * 2 + r.phase + t * 14) * r.amp;
      if (s === 0) c.moveTo(px, py);
      else c.lineTo(px, py);
    }
    c.stroke();
    if (r.curl) {
      c.beginPath();
      c.arc(r.x, r.y - 10 * unit, 10 * unit, 0.2, Math.PI * 1.65);
      c.stroke();
    }
    c.restore();
  }

  // 4. Suction wind-lines during Act 2 inhale
  for (const s of suctionLines) {
    const k = clamp(s.life / s.maxLife, 0, 1);
    const x1 = lerp(s.x, s.tx, k);
    const y1 = lerp(s.y, s.ty, k);
    const x2 = lerp(s.x, s.tx, clamp(k + 0.22, 0, 1));
    const y2 = lerp(s.y, s.ty, clamp(k + 0.22, 0, 1));
    c.save();
    c.globalAlpha = (1 - k) * 0.7 * masterAlpha;
    c.strokeStyle = '#ffe5f4';
    c.lineWidth = 3 * unit;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x2, y2);
    c.stroke();
    c.restore();
  }

  // 5. Cloud puffs
  for (const p of puffs) {
    drawCloudPuff(c, p);
  }

  // 6. Flying comedic debris
  for (const d of debris) {
    drawDebrisItem(c, d);
  }

  // 7. Rose petals
  for (const p of petals) {
    const k = clamp(p.life / p.maxLife, 0, 1);
    c.save();
    c.globalAlpha = (1 - k) * 0.9 * masterAlpha;
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillStyle = p.color;
    c.beginPath();
    c.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // 8. The star of the show: MEGA-Q 9000 Bellows
  drawBellows(c, t, anchor, pressure, bellowsState);

  // 9. Relief sparkles when deflated
  if (bellowsState === 'deflated' && t < 56) {
    for (let i = 0; i < 4; i++) {
      const ang = t * 1.4 + i * 1.57;
      const sx = anchor.x + Math.cos(ang) * 78 * unit;
      const sy = anchor.y - 34 * unit + Math.sin(ang * 1.3) * 18 * unit;
      const pulse = 0.4 + 0.6 * Math.abs(Math.sin(t * 2.5 + i));
      c.save();
      c.globalAlpha = pulse * 0.85 * masterAlpha;
      c.fillStyle = '#fff5c0';
      c.translate(sx, sy);
      c.beginPath();
      const sr = 8 * unit;
      c.moveTo(0, -sr);
      c.quadraticCurveTo(0, 0, sr, 0);
      c.quadraticCurveTo(0, 0, 0, sr);
      c.quadraticCurveTo(0, 0, -sr, 0);
      c.quadraticCurveTo(0, 0, 0, -sr);
      c.fill();
      c.restore();
    }
  }

  // 10. Polite Act 4 encore bubble
  if (afterBubble) {
    c.save();
    c.translate(afterBubble.x, afterBubble.y);
    const bGrad = c.createRadialGradient(-4 * unit, -4 * unit, 2 * unit, 0, 0, afterBubble.r);
    bGrad.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
    bGrad.addColorStop(0.65, 'rgba(255, 175, 225, 0.45)');
    bGrad.addColorStop(1, 'rgba(170, 235, 255, 0.65)');
    c.fillStyle = bGrad;
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)';
    c.lineWidth = 2 * unit;
    c.beginPath();
    c.arc(0, 0, afterBubble.r, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  }

  // 11. Sweat drops
  for (const s of sweatDrops) {
    const k = clamp(s.life / s.maxLife, 0, 1);
    c.save();
    c.globalAlpha = (1 - k) * masterAlpha;
    c.fillStyle = '#8be9fd';
    c.strokeStyle = '#1e3a5f';
    c.lineWidth = 1.8 * unit;
    c.beginPath();
    c.arc(s.x, s.y, 5.5 * unit, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();
  }

  // 12. Broken flying widgets (snapped needle & anemometer cups)
  if (needleFlying) {
    c.save();
    c.translate(needleFlying.x, needleFlying.y);
    c.rotate(needleFlying.rot);
    c.strokeStyle = '#ff477e';
    c.lineWidth = 4.5 * unit;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-18 * unit, 0);
    c.lineTo(22 * unit, 0);
    c.stroke();
    c.restore();
  }

  if (anemoFlying) {
    c.save();
    c.translate(anemoFlying.x, anemoFlying.y);
    c.rotate(anemoFlying.rot);
    c.strokeStyle = '#ffe5f4';
    c.lineWidth = 3 * unit;
    for (let i = 0; i < 3; i++) {
      c.rotate((Math.PI * 2) / 3);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(24 * unit, 0);
      c.stroke();
      c.fillStyle = '#ff6ec7';
      c.beginPath();
      c.arc(26 * unit, 0, 8 * unit, -Math.PI * 0.5, Math.PI * 0.5);
      c.fill();
    }
    c.restore();
  }

  // 13. Comic text callouts
  for (const o of callouts) {
    const k = clamp(o.life / o.maxLife, 0, 1);
    const pop = k < 0.14 ? easeOutCubic(k / 0.14) : 1;
    const alpha = k > 0.72 ? (1 - k) / 0.28 : 1;
    c.save();
    c.globalAlpha = alpha * masterAlpha;
    c.translate(o.x, o.y);
    c.rotate(o.rot);
    c.scale(pop, pop);
    c.font = `900 ${Math.round(o.size)}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 6 * unit;
    c.strokeStyle = '#2d0c2c';
    c.strokeText(o.text, 0, 0);
    c.fillStyle = o.color;
    c.fillText(o.text, 0, 0);
    c.restore();
  }

  // 14. Weather overlay HUD widgets
  drawWeatherBanner(c, t, ctx);
  drawPressureGauge(c, t, pressure);
  drawDopplerRadar(c, t);
  drawAnemometer(c, t);
  drawSummaryCard(c, t, ctx);

  c.restore();
}

export function dispose() {
  puffs = [];
  shockwaves = [];
  windRibbons = [];
  debris = [];
  petals = [];
  sweatDrops = [];
  callouts = [];
  suctionLines = [];
  afterBubble = null;
  needleFlying = null;
  anemoFlying = null;
}
