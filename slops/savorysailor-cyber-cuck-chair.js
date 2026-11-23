// Cyber Cuck Chair — a brutalist stainless-steel hotel-corner tragedy.
// Transparent glass only: clearRect every frame so the live stream shines through.

export const meta = {
  title: 'Cyber Cuck Chair',
  author: 'savorysailor',
  prompt: "elon's cuck chair",
  createdAt: '2026-11-20T00:00:00Z',
  moderationLevel: 'anything',
};

const INK = '#121521';
const STEEL_LIGHT = '#D8E0EA';
const STEEL_MID = '#9AA7B8';
const STEEL_DARK = '#5C6778';
const STEEL_DEEP = '#323A47';
const CUSHION = '#8C274C';
const CUSHION_LIGHT = '#B83B66';
const CUSHION_DARK = '#58152E';
const CARPET_MAIN = '#4B2A4A';
const CARPET_TRIM = '#D9A441';
const CARPET_PATTERN = '#6A3B68';
const BRASS = '#E6B655';
const BRASS_DARK = '#9C7225';
const SKIN = '#F5CFB8';
const SKIN_SHADE = '#DFB196';
const HAIR = '#2B2220';
const JACKET = '#1D2230';
const CYAN = '#38E8FF';
const WARN_ORANGE = '#FF8C42';
const ALERT_RED = '#FF3B5C';
const PAPER = '#FFFDF7';
const BED_SHEET = '#F4EFE6';
const BED_QUILT = '#D64572';

let fired = new Set();
let particles = [];
let tweets = [];
let popups = [];
let hearts = [];
let bolts = [];
let shakeAmt = 0;
let boingPhase = 0;
let boingTimer = 0;
let ratioReplies = 0;
let ratioLikes = 3;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeOutCubic(x) {
  const t = clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(x) {
  const t = clamp(x, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutQuad(x) {
  const t = clamp(x, 0, 1);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function once(id, t, at, fn) {
  if (t >= at && !fired.has(id)) {
    fired.add(id);
    fn();
  }
}

function spawnDust(ctx, x, y, count, S, color = '#D5DBE5') {
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI * 0.1 - ctx.rand() * Math.PI * 0.8;
    const spd = (55 + ctx.rand() * 140) * S;
    particles.push({
      kind: 'dust',
      x: x + (ctx.rand() - 0.5) * 40 * S,
      y: y + (ctx.rand() - 0.5) * 10 * S,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.45 - 15 * S,
      size: (8 + ctx.rand() * 14) * S,
      color,
      life: 0,
      maxLife: 0.9 + ctx.rand() * 0.7,
      gravity: -20 * S,
    });
  }
}

function spawnSparks(ctx, x, y, count, S, color = WARN_ORANGE) {
  for (let i = 0; i < count; i++) {
    const ang = ctx.rand() * Math.PI * 2;
    const spd = (90 + ctx.rand() * 210) * S;
    particles.push({
      kind: 'spark',
      x,
      y,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 60 * S,
      size: (3 + ctx.rand() * 4.5) * S,
      color: ctx.rand() > 0.4 ? color : '#FFF2A6',
      life: 0,
      maxLife: 0.45 + ctx.rand() * 0.45,
      gravity: 480 * S,
    });
  }
}

function spawnFlame(ctx, x, y, S, intensity = 1) {
  particles.push({
    kind: 'flame',
    x: x + (ctx.rand() - 0.5) * 26 * S,
    y,
    vx: (ctx.rand() - 0.5) * 55 * S,
    vy: (120 + ctx.rand() * 130) * S * intensity,
    size: (9 + ctx.rand() * 12) * S * intensity,
    color: ctx.rand() > 0.45 ? '#FF7B29' : '#FFE066',
    life: 0,
    maxLife: 0.35 + ctx.rand() * 0.25,
    gravity: -60 * S,
  });
}

function spawnSmoke(ctx, x, y, S) {
  particles.push({
    kind: 'smoke',
    x: x + (ctx.rand() - 0.5) * 24 * S,
    y,
    vx: (ctx.rand() - 0.5) * 30 * S,
    vy: -(35 + ctx.rand() * 35) * S,
    size: (11 + ctx.rand() * 12) * S,
    color: '#B8C0CC',
    life: 0,
    maxLife: 1.5 + ctx.rand() * 0.8,
    gravity: -12 * S,
  });
}

function spawnBolt(ctx, x, y, S) {
  bolts.push({
    x,
    y,
    vx: (ctx.rand() > 0.5 ? 1 : -1) * (80 + ctx.rand() * 110) * S,
    vy: -(160 + ctx.rand() * 90) * S,
    rot: ctx.rand() * Math.PI * 2,
    vrot: (ctx.rand() - 0.5) * 14,
    floorY: y + 95 * S,
    bounces: 0,
    life: 0,
    maxLife: 8,
  });
}

function spawnTweet(x, y, handle, body, S, isGrok = false) {
  tweets.push({
    x,
    y,
    vy: -44 * S,
    handle,
    body,
    isGrok,
    life: 0,
    maxLife: 5.4,
    wobble: (tweets.length % 2 === 0 ? 1 : -1) * 0.03,
  });
}

function spawnPopup(x, y, text, color, S, scale = 1, maxLife = 1.6) {
  popups.push({
    x,
    y,
    vy: -52 * S,
    text,
    color,
    scale,
    life: 0,
    maxLife,
  });
}

function spawnHeart(ctx, x, y, S) {
  hearts.push({
    x: x + (ctx.rand() - 0.5) * 60 * S,
    y,
    vx: (ctx.rand() - 0.5) * 35 * S,
    vy: -(65 + ctx.rand() * 55) * S,
    size: (10 + ctx.rand() * 10) * S,
    phase: ctx.rand() * Math.PI * 2,
    life: 0,
    maxLife: 2.2 + ctx.rand() * 0.9,
  });
}

function drawRoundedRect(c, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
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

function drawSpeechBubble(c, x, y, lines, S, tailDir = 'down-left', accentColor = INK) {
  c.save();
  c.font = `900 ${Math.round(15 * S)}px "Arial Black", Impact, sans-serif`;
  let maxW = 0;
  for (const line of lines) {
    maxW = Math.max(maxW, c.measureText(line).width);
  }
  const padX = 16 * S;
  const padY = 11 * S;
  const lineH = 20 * S;
  const w = maxW + padX * 2;
  const h = lines.length * lineH + padY * 2;
  const bx = x - w / 2;
  const by = y - h;

  c.fillStyle = 'rgba(12, 16, 28, 0.25)';
  drawRoundedRect(c, bx + 4 * S, by + 5 * S, w, h, 14 * S);
  c.fill();

  c.fillStyle = PAPER;
  c.strokeStyle = accentColor;
  c.lineWidth = 3 * S;
  drawRoundedRect(c, bx, by, w, h, 14 * S);
  c.fill();
  c.stroke();

  c.beginPath();
  if (tailDir === 'down-left') {
    c.moveTo(bx + w * 0.28, by + h - 1 * S);
    c.lineTo(bx + w * 0.18, by + h + 16 * S);
    c.lineTo(bx + w * 0.42, by + h - 1 * S);
  } else if (tailDir === 'down-right') {
    c.moveTo(bx + w * 0.62, by + h - 1 * S);
    c.lineTo(bx + w * 0.82, by + h + 16 * S);
    c.lineTo(bx + w * 0.76, by + h - 1 * S);
  } else {
    c.moveTo(bx + w * 0.45, by + h - 1 * S);
    c.lineTo(bx + w * 0.5, by + h + 15 * S);
    c.lineTo(bx + w * 0.56, by + h - 1 * S);
  }
  c.closePath();
  c.fillStyle = PAPER;
  c.fill();
  c.stroke();

  // Cover tail seam
  c.fillStyle = PAPER;
  c.fillRect(bx + w * 0.2, by + h - 5 * S, w * 0.62, 6 * S);

  c.fillStyle = INK;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    c.fillText(lines[i], x, by + padY + lineH * (i + 0.5));
  }
  c.restore();
}

function drawCarpet(c, cx, cy, S, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(cx, cy);

  // Soft drop shadow on transparent glass
  c.fillStyle = 'rgba(10, 12, 24, 0.35)';
  c.beginPath();
  c.moveTo(-225 * S, 12 * S);
  c.lineTo(225 * S, 12 * S);
  c.lineTo(275 * S, 96 * S);
  c.lineTo(-275 * S, 96 * S);
  c.closePath();
  c.fill();

  // Hotel carpet swatch
  c.fillStyle = CARPET_MAIN;
  c.strokeStyle = INK;
  c.lineWidth = 4 * S;
  c.beginPath();
  c.moveTo(-220 * S, 0);
  c.lineTo(220 * S, 0);
  c.lineTo(268 * S, 86 * S);
  c.lineTo(-268 * S, 86 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Gold border trim
  c.strokeStyle = CARPET_TRIM;
  c.lineWidth = 3 * S;
  c.beginPath();
  c.moveTo(-202 * S, 10 * S);
  c.lineTo(202 * S, 10 * S);
  c.lineTo(240 * S, 76 * S);
  c.lineTo(-240 * S, 76 * S);
  c.closePath();
  c.stroke();

  // Tacky motel diamond motifs
  c.fillStyle = CARPET_PATTERN;
  for (let i = -3; i <= 3; i++) {
    const dx = i * 58 * S;
    const dy = 42 * S;
    c.beginPath();
    c.moveTo(dx, dy - 12 * S);
    c.lineTo(dx + 16 * S, dy);
    c.lineTo(dx, dy + 12 * S);
    c.lineTo(dx - 16 * S, dy);
    c.closePath();
    c.fill();
  }

  // Tiny floating baseboard corner behind chair
  c.fillStyle = '#E8DFCF';
  c.strokeStyle = INK;
  c.lineWidth = 3 * S;
  c.beginPath();
  c.moveTo(-210 * S, -14 * S);
  c.lineTo(-95 * S, -14 * S);
  c.lineTo(-95 * S, 4 * S);
  c.lineTo(-210 * S, 4 * S);
  c.closePath();
  c.fill();
  c.stroke();

  c.restore();
}

function drawNightstandAndLamp(c, x, y, S, t, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);

  // Nightstand body
  c.fillStyle = '#523428';
  c.strokeStyle = INK;
  c.lineWidth = 3.2 * S;
  drawRoundedRect(c, -42 * S, -64 * S, 84 * S, 72 * S, 5 * S);
  c.fill();
  c.stroke();

  // Drawer + brass knob
  c.fillStyle = '#6A4435';
  drawRoundedRect(c, -34 * S, -54 * S, 68 * S, 24 * S, 3 * S);
  c.fill();
  c.stroke();
  c.fillStyle = BRASS;
  c.beginPath();
  c.arc(0, -42 * S, 4.5 * S, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Tissue box
  c.fillStyle = '#7ED6DF';
  drawRoundedRect(c, 4 * S, -80 * S, 32 * S, 16 * S, 3 * S);
  c.fill();
  c.stroke();
  // Tissue tuft
  c.fillStyle = PAPER;
  c.beginPath();
  c.moveTo(15 * S, -80 * S);
  c.quadraticCurveTo(10 * S, -96 * S, 21 * S, -92 * S);
  c.quadraticCurveTo(28 * S, -100 * S, 26 * S, -80 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Sad brass hotel lamp
  c.fillStyle = BRASS;
  c.beginPath();
  c.moveTo(-28 * S, -64 * S);
  c.lineTo(-8 * S, -64 * S);
  c.lineTo(-14 * S, -73 * S);
  c.lineTo(-22 * S, -73 * S);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillRect(-20 * S, -112 * S, 4 * S, 40 * S);
  c.strokeRect(-20 * S, -112 * S, 4 * S, 40 * S);

  // Subtle warm glow cone (gentle low-freq hum, never flickers fast)
  const warmPulse = 0.22 + 0.05 * Math.sin(t * 2.2);
  const grad = c.createRadialGradient(-18 * S, -118 * S, 6 * S, -18 * S, -112 * S, 85 * S);
  grad.addColorStop(0, `rgba(255, 224, 130, ${warmPulse})`);
  grad.addColorStop(1, 'rgba(255, 224, 130, 0)');
  c.fillStyle = grad;
  c.beginPath();
  c.arc(-18 * S, -112 * S, 85 * S, 0, Math.PI * 2);
  c.fill();

  // Slightly crooked lampshade
  c.save();
  c.translate(-18 * S, -126 * S);
  c.rotate(-0.08);
  c.fillStyle = '#F7E7B4';
  c.beginPath();
  c.moveTo(-18 * S, -22 * S);
  c.lineTo(18 * S, -22 * S);
  c.lineTo(28 * S, 16 * S);
  c.lineTo(-28 * S, 16 * S);
  c.closePath();
  c.fill();
  c.stroke();
  c.restore();

  c.restore();
}

function drawCyberChairBack(c, S, t, ledColor, rocketActive) {
  // Underglow strip
  c.save();
  const glowGrad = c.createRadialGradient(0, 12 * S, 8 * S, 0, 12 * S, 95 * S);
  glowGrad.addColorStop(0, ledColor === WARN_ORANGE ? 'rgba(255,140,66,0.45)' : 'rgba(56,232,255,0.42)');
  glowGrad.addColorStop(1, 'rgba(56,232,255,0)');
  c.fillStyle = glowGrad;
  c.beginPath();
  c.ellipse(0, 12 * S, 95 * S, 24 * S, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // Rocket nozzles under chair when armed/launching
  if (rocketActive) {
    c.fillStyle = STEEL_DEEP;
    c.strokeStyle = INK;
    c.lineWidth = 2.8 * S;
    for (const nx of [-42 * S, 42 * S]) {
      c.beginPath();
      c.moveTo(nx - 10 * S, 2 * S);
      c.lineTo(nx + 10 * S, 2 * S);
      c.lineTo(nx + 16 * S, 22 * S);
      c.lineTo(nx - 16 * S, 22 * S);
      c.closePath();
      c.fill();
      c.stroke();
    }
  }

  // Brutalist angular chair legs
  c.fillStyle = STEEL_DEEP;
  c.strokeStyle = INK;
  c.lineWidth = 3.2 * S;
  // Left leg
  c.beginPath();
  c.moveTo(-66 * S, -8 * S);
  c.lineTo(-48 * S, -8 * S);
  c.lineTo(-58 * S, 26 * S);
  c.lineTo(-76 * S, 26 * S);
  c.closePath();
  c.fill();
  c.stroke();
  // Right leg
  c.beginPath();
  c.moveTo(48 * S, -8 * S);
  c.lineTo(66 * S, -8 * S);
  c.lineTo(76 * S, 26 * S);
  c.lineTo(58 * S, 26 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Cybertruck low-poly tall stainless backrest
  c.fillStyle = STEEL_MID;
  c.beginPath();
  c.moveTo(-78 * S, -48 * S);
  c.lineTo(-86 * S, -158 * S);
  c.lineTo(0, -196 * S);
  c.lineTo(86 * S, -158 * S);
  c.lineTo(78 * S, -48 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Faceted stainless highlight planes
  c.fillStyle = STEEL_LIGHT;
  c.beginPath();
  c.moveTo(-84 * S, -156 * S);
  c.lineTo(0, -194 * S);
  c.lineTo(14 * S, -110 * S);
  c.lineTo(-74 * S, -70 * S);
  c.closePath();
  c.fill();

  c.fillStyle = STEEL_DARK;
  c.beginPath();
  c.moveTo(0, -194 * S);
  c.lineTo(84 * S, -156 * S);
  c.lineTo(76 * S, -50 * S);
  c.lineTo(14 * S, -110 * S);
  c.closePath();
  c.fill();

  // Outer stroke again + absurdly wide misaligned panel gap line
  c.strokeStyle = INK;
  c.lineWidth = 3.6 * S;
  c.beginPath();
  c.moveTo(-78 * S, -48 * S);
  c.lineTo(-86 * S, -158 * S);
  c.lineTo(0, -196 * S);
  c.lineTo(86 * S, -158 * S);
  c.lineTo(78 * S, -48 * S);
  c.closePath();
  c.stroke();

  // Misaligned panel gap (intentional dark wedge)
  c.fillStyle = INK;
  c.beginPath();
  c.moveTo(22 * S, -184 * S);
  c.lineTo(29 * S, -180 * S);
  c.lineTo(16 * S, -120 * S);
  c.lineTo(13 * S, -121 * S);
  c.closePath();
  c.fill();

  // Awkward velvet motel back-cushion crammed inside steel frame
  c.fillStyle = CUSHION;
  c.beginPath();
  c.moveTo(-58 * S, -54 * S);
  c.lineTo(-62 * S, -142 * S);
  c.lineTo(62 * S, -142 * S);
  c.lineTo(58 * S, -54 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Cushion tuft dimples
  c.fillStyle = CUSHION_DARK;
  for (const [tx, ty] of [[-26, -116], [26, -116], [-26, -82], [26, -82]]) {
    c.beginPath();
    c.arc(tx * S, ty * S, 4 * S, 0, Math.PI * 2);
    c.fill();
  }

  // Headrest X logo
  c.save();
  c.strokeStyle = INK;
  c.lineWidth = 5 * S;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-13 * S, -172 * S);
  c.lineTo(13 * S, -150 * S);
  c.moveTo(13 * S, -172 * S);
  c.lineTo(-13 * S, -150 * S);
  c.stroke();
  c.strokeStyle = ledColor;
  c.lineWidth = 2.4 * S;
  c.beginPath();
  c.moveTo(-13 * S, -172 * S);
  c.lineTo(13 * S, -150 * S);
  c.moveTo(13 * S, -172 * S);
  c.lineTo(-13 * S, -150 * S);
  c.stroke();
  c.restore();

  // Seat base
  c.fillStyle = CUSHION_LIGHT;
  c.strokeStyle = INK;
  c.lineWidth = 3.2 * S;
  drawRoundedRect(c, -74 * S, -54 * S, 148 * S, 36 * S, 8 * S);
  c.fill();
  c.stroke();

  // Steel lower chassis + LED lightbar
  c.fillStyle = STEEL_MID;
  c.beginPath();
  c.moveTo(-84 * S, -22 * S);
  c.lineTo(84 * S, -22 * S);
  c.lineTo(74 * S, 4 * S);
  c.lineTo(-74 * S, 4 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Cyber LED strip
  c.fillStyle = ledColor;
  c.fillRect(-66 * S, -14 * S, 132 * S, 5 * S);

  // Brass plaque on front
  c.fillStyle = BRASS;
  c.strokeStyle = INK;
  c.lineWidth = 2 * S;
  drawRoundedRect(c, -46 * S, -8 * S, 92 * S, 18 * S, 3 * S);
  c.fill();
  c.stroke();
  c.fillStyle = INK;
  c.font = `900 ${Math.round(9.5 * S)}px "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('CYBERCUCK X', 0, 1.5 * S);
}

function drawCyberChairFrontArms(c, S, rightArmBroken, armFallT, buttonPressed) {
  c.strokeStyle = INK;
  c.lineWidth = 3.2 * S;

  // Left brutalist steel armrest
  c.fillStyle = STEEL_LIGHT;
  c.beginPath();
  c.moveTo(-94 * S, -76 * S);
  c.lineTo(-64 * S, -76 * S);
  c.lineTo(-60 * S, -22 * S);
  c.lineTo(-88 * S, -22 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Red "ALPHA MODE" button on left armrest
  c.fillStyle = buttonPressed ? '#FF9F1C' : ALERT_RED;
  c.beginPath();
  c.ellipse(-78 * S, -76 * S, 8 * S, 4 * S, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Right brutalist steel armrest (breaks off at t=33.2s!)
  c.save();
  if (rightArmBroken) {
    const f = easeOutCubic(clamp(armFallT, 0, 1));
    c.translate(32 * S * f, 82 * S * f);
    c.rotate(1.15 * f);
  }
  c.fillStyle = STEEL_DARK;
  c.beginPath();
  c.moveTo(64 * S, -76 * S);
  c.lineTo(94 * S, -76 * S);
  c.lineTo(88 * S, -22 * S);
  c.lineTo(60 * S, -22 * S);
  c.closePath();
  c.fill();
  c.stroke();
  c.restore();
}

function drawElon(c, S, t, mood, phoneGlow, crying, typingFast, pressingBtn) {
  // Elon seated inside chair coordinates (origin near seat base)
  c.save();
  c.strokeStyle = INK;
  c.lineWidth = 3 * S;
  c.lineJoin = 'round';

  const breath = Math.sin(t * 3.1) * 1.8 * S;
  const shiver = mood === 'panicked' || mood === 'seething' ? Math.sin(t * 28) * 1.4 * S : 0;

  // Legs (black jeans, knees pressed awkwardly together)
  c.fillStyle = '#1C202E';
  // Left thigh/calf
  drawRoundedRect(c, -40 * S, -42 * S, 26 * S, 56 * S, 10 * S);
  c.fill();
  c.stroke();
  // Right thigh/calf
  drawRoundedRect(c, 14 * S, -42 * S, 26 * S, 56 * S, 10 * S);
  c.fill();
  c.stroke();

  // Cowboy boots / chunky black shoes
  c.fillStyle = '#11131A';
  drawRoundedRect(c, -44 * S, 6 * S, 34 * S, 18 * S, 7 * S);
  c.fill();
  c.stroke();
  drawRoundedRect(c, 10 * S, 6 * S, 34 * S, 18 * S, 7 * S);
  c.fill();
  c.stroke();

  // Torso (black leather jacket + X t-shirt)
  c.save();
  c.translate(shiver, breath);

  // T-shirt center
  c.fillStyle = '#151822';
  drawRoundedRect(c, -38 * S, -118 * S, 76 * S, 78 * S, 18 * S);
  c.fill();
  c.stroke();

  // Subtle white X on tee
  c.strokeStyle = '#DCE4F0';
  c.lineWidth = 2.8 * S;
  c.beginPath();
  c.moveTo(-10 * S, -96 * S);
  c.lineTo(10 * S, -74 * S);
  c.moveTo(10 * S, -96 * S);
  c.lineTo(-10 * S, -74 * S);
  c.stroke();

  // Leather jacket lapels
  c.strokeStyle = INK;
  c.lineWidth = 3 * S;
  c.fillStyle = JACKET;
  c.beginPath();
  c.moveTo(-40 * S, -116 * S);
  c.lineTo(-14 * S, -116 * S);
  c.lineTo(-22 * S, -44 * S);
  c.lineTo(-44 * S, -46 * S);
  c.closePath();
  c.fill();
  c.stroke();

  c.beginPath();
  c.moveTo(40 * S, -116 * S);
  c.lineTo(14 * S, -116 * S);
  c.lineTo(22 * S, -44 * S);
  c.lineTo(44 * S, -46 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Neck
  c.fillStyle = SKIN_SHADE;
  c.fillRect(-11 * S, -130 * S, 22 * S, 16 * S);
  c.strokeRect(-11 * S, -130 * S, 22 * S, 16 * S);

  // Head (slightly tilted toward the off-screen bed on the right!)
  c.save();
  const headTilt =
    mood === 'smug' ? -0.05 :
    mood === 'shocked' ? 0.08 :
    mood === 'seething' ? 0.12 :
    mood === 'defeated' ? 0.22 : 0.06;
  c.translate(0, -156 * S);
  c.rotate(headTilt);

  // Ears
  c.fillStyle = SKIN_SHADE;
  c.beginPath();
  c.arc(-30 * S, 2 * S, 8 * S, 0, Math.PI * 2);
  c.arc(30 * S, 2 * S, 8 * S, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Rounded-jaw caricature head
  c.fillStyle = SKIN;
  c.beginPath();
  c.moveTo(-29 * S, -12 * S);
  c.quadraticCurveTo(-30 * S, -36 * S, 0, -36 * S);
  c.quadraticCurveTo(30 * S, -36 * S, 29 * S, -12 * S);
  c.lineTo(27 * S, 16 * S);
  c.quadraticCurveTo(25 * S, 33 * S, 0, 34 * S);
  c.quadraticCurveTo(-25 * S, 33 * S, -27 * S, 16 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Hairplug swoop
  c.fillStyle = HAIR;
  c.beginPath();
  c.moveTo(-30 * S, -12 * S);
  c.quadraticCurveTo(-34 * S, -42 * S, -4 * S, -44 * S);
  c.quadraticCurveTo(28 * S, -44 * S, 31 * S, -14 * S);
  c.lineTo(24 * S, -18 * S);
  c.quadraticCurveTo(10 * S, -28 * S, -12 * S, -22 * S);
  c.quadraticCurveTo(-22 * S, -18 * S, -28 * S, -8 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Eyes (glancing right toward the hotel bed!)
  const lookX = mood === 'smug' ? 2 * S : 5.5 * S;
  const eyeH = mood === 'shocked' || mood === 'panicked' ? 9.5 * S : mood === 'defeated' ? 4.5 * S : 7 * S;
  for (const ex of [-11 * S, 12 * S]) {
    c.fillStyle = PAPER;
    c.beginPath();
    c.ellipse(ex, -4 * S, 8 * S, eyeH, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Pupil
    c.fillStyle = INK;
    c.beginPath();
    c.arc(ex + lookX * 0.55, -3.5 * S, mood === 'shocked' ? 2.6 * S : 3.4 * S, 0, Math.PI * 2);
    c.fill();
  }

  // Eyebrows
  c.strokeStyle = HAIR;
  c.lineWidth = 3.2 * S;
  c.lineCap = 'round';
  c.beginPath();
  if (mood === 'smug') {
    c.moveTo(-20 * S, -14 * S);
    c.lineTo(-4 * S, -16 * S);
    c.moveTo(4 * S, -18 * S);
    c.lineTo(21 * S, -15 * S);
  } else if (mood === 'seething' || mood === 'panicked') {
    c.moveTo(-20 * S, -18 * S);
    c.lineTo(-3 * S, -12 * S);
    c.moveTo(4 * S, -12 * S);
    c.lineTo(21 * S, -18 * S);
  } else if (mood === 'defeated') {
    c.moveTo(-20 * S, -11 * S);
    c.lineTo(-4 * S, -16 * S);
    c.moveTo(4 * S, -16 * S);
    c.lineTo(20 * S, -11 * S);
  } else {
    c.moveTo(-20 * S, -17 * S);
    c.lineTo(-4 * S, -19 * S);
    c.moveTo(4 * S, -19 * S);
    c.lineTo(20 * S, -17 * S);
  }
  c.stroke();

  // Nose
  c.strokeStyle = INK;
  c.lineWidth = 2.2 * S;
  c.beginPath();
  c.moveTo(2 * S, -3 * S);
  c.lineTo(5 * S, 7 * S);
  c.lineTo(-1 * S, 8 * S);
  c.stroke();

  // Mouth
  c.lineWidth = 2.8 * S;
  c.beginPath();
  if (mood === 'smug') {
    c.moveTo(-11 * S, 18 * S);
    c.quadraticCurveTo(2 * S, 24 * S, 14 * S, 14 * S);
  } else if (mood === 'shocked') {
    c.fillStyle = '#4A1826';
    c.ellipse(1 * S, 19 * S, 7 * S, 8.5 * S, 0, 0, Math.PI * 2);
    c.fill();
  } else if (mood === 'seething' || mood === 'panicked') {
    c.fillStyle = PAPER;
    drawRoundedRect(c, -12 * S, 14 * S, 24 * S, 9 * S, 3 * S);
    c.fill();
  } else {
    c.moveTo(-11 * S, 21 * S);
    c.quadraticCurveTo(0, 14 * S, 11 * S, 21 * S);
  }
  c.stroke();

  // Sweat drop when stressed
  if (mood === 'shocked' || mood === 'seething' || mood === 'panicked') {
    const dropY = -12 * S + ((t * 28) % 24) * S;
    c.fillStyle = '#7CE8FF';
    c.strokeStyle = INK;
    c.lineWidth = 2 * S;
    c.beginPath();
    c.moveTo(-24 * S, dropY - 9 * S);
    c.quadraticCurveTo(-18 * S, dropY, -24 * S, dropY + 5 * S);
    c.quadraticCurveTo(-30 * S, dropY, -24 * S, dropY - 9 * S);
    c.fill();
    c.stroke();
  }

  // Giant single comic tear
  if (crying) {
    const tearY = 4 * S + ((t * 22) % 26) * S;
    c.fillStyle = '#5CE1FF';
    c.strokeStyle = INK;
    c.lineWidth = 2 * S;
    c.beginPath();
    c.moveTo(14 * S, tearY - 8 * S);
    c.quadraticCurveTo(20 * S, tearY + 2 * S, 14 * S, tearY + 7 * S);
    c.quadraticCurveTo(8 * S, tearY + 2 * S, 14 * S, tearY - 8 * S);
    c.fill();
    c.stroke();
  }

  c.restore(); // end head

  // Arms & hands
  c.strokeStyle = INK;
  c.lineWidth = 3 * S;
  c.fillStyle = JACKET;

  if (pressingBtn) {
    // Left arm slamming the red armrest button
    c.beginPath();
    c.moveTo(-36 * S, -102 * S);
    c.lineTo(-76 * S, -80 * S);
    c.lineTo(-68 * S, -68 * S);
    c.lineTo(-30 * S, -86 * S);
    c.closePath();
    c.fill();
    c.stroke();

    c.fillStyle = SKIN;
    c.beginPath();
    c.arc(-76 * S, -77 * S, 9 * S, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  } else {
    // Left arm resting or holding phone
    const tapOffset = typingFast ? Math.sin(t * 26) * 4 * S : 0;
    c.beginPath();
    c.moveTo(-36 * S, -100 * S);
    c.lineTo(-56 * S, -72 * S);
    c.lineTo(-14 * S, -64 * S + tapOffset);
    c.lineTo(-12 * S, -50 * S + tapOffset);
    c.lineTo(-66 * S, -58 * S);
    c.lineTo(-42 * S, -108 * S);
    c.closePath();
    c.fill();
    c.stroke();

    c.fillStyle = SKIN;
    c.beginPath();
    c.arc(-10 * S, -57 * S + tapOffset, 8 * S, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // Right arm holding phone (or thumbs up during smug intro)
  const tapR = typingFast ? Math.cos(t * 26) * 4 * S : 0;
  c.fillStyle = JACKET;
  c.beginPath();
  c.moveTo(36 * S, -100 * S);
  c.lineTo(56 * S, -72 * S);
  c.lineTo(16 * S, -64 * S + tapR);
  c.lineTo(14 * S, -50 * S + tapR);
  c.lineTo(66 * S, -58 * S);
  c.lineTo(42 * S, -108 * S);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(14 * S, -57 * S + tapR, 8 * S, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Glowing smartphone held in center
  if (phoneGlow) {
    c.save();
    c.translate(2 * S, -62 * S);
    c.rotate(-0.08);
    // Phone screen glow onto face
    const pg = c.createRadialGradient(0, 0, 4 * S, 0, -18 * S, 55 * S);
    pg.addColorStop(0, 'rgba(56, 232, 255, 0.32)');
    pg.addColorStop(1, 'rgba(56, 232, 255, 0)');
    c.fillStyle = pg;
    c.beginPath();
    c.arc(0, -18 * S, 55 * S, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = '#0D111A';
    c.strokeStyle = INK;
    c.lineWidth = 2.6 * S;
    drawRoundedRect(c, -14 * S, -22 * S, 28 * S, 42 * S, 5 * S);
    c.fill();
    c.stroke();

    c.fillStyle = '#1E293B';
    c.fillRect(-10 * S, -17 * S, 20 * S, 32 * S);
    // Little X on phone screen
    c.strokeStyle = PAPER;
    c.lineWidth = 2 * S;
    c.beginPath();
    c.moveTo(-5 * S, -7 * S);
    c.lineTo(5 * S, 3 * S);
    c.moveTo(5 * S, -7 * S);
    c.lineTo(-5 * S, 3 * S);
    c.stroke();
    c.restore();
  }

  c.restore(); // end torso
  c.restore();
}

function drawHotelBedCorner(c, x, y, S, bounceAmt, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);

  const sqY = Math.sin(bounceAmt) * 10 * S;
  const sqScaleY = 1 - Math.sin(bounceAmt) * 0.08;
  const sqScaleX = 1 + Math.sin(bounceAmt) * 0.05;

  // Bed shadow
  c.fillStyle = 'rgba(10, 12, 24, 0.35)';
  c.beginPath();
  c.ellipse(75 * S, 42 * S, 118 * S, 20 * S, 0, 0, Math.PI * 2);
  c.fill();

  c.translate(0, sqY * 0.45);
  c.scale(sqScaleX, sqScaleY);

  // Brass headboard post + bars (classic motel bed edge)
  c.strokeStyle = INK;
  c.lineWidth = 3.2 * S;
  c.fillStyle = BRASS;
  // Post
  drawRoundedRect(c, -18 * S, -158 * S, 16 * S, 194 * S, 5 * S);
  c.fill();
  c.stroke();
  // Brass finial ball
  c.beginPath();
  c.arc(-10 * S, -166 * S, 14 * S, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  // Headboard crossbars extending right
  drawRoundedRect(c, -4 * S, -138 * S, 170 * S, 12 * S, 4 * S);
  c.fill();
  c.stroke();
  for (let bx = 24; bx <= 130; bx += 32) {
    drawRoundedRect(c, bx * S, -126 * S, 10 * S, 64 * S, 3 * S);
    c.fill();
    c.stroke();
  }

  // Wooden frame + mattress
  c.fillStyle = '#5E3829';
  drawRoundedRect(c, -12 * S, -18 * S, 190 * S, 42 * S, 6 * S);
  c.fill();
  c.stroke();

  c.fillStyle = BED_SHEET;
  drawRoundedRect(c, -6 * S, -52 * S, 184 * S, 38 * S, 10 * S);
  c.fill();
  c.stroke();

  // Bouncing cartoon quilt hump (strictly covered slapstick cartoon bounce!)
  const humpY = -52 * S - Math.abs(Math.sin(bounceAmt)) * 22 * S;
  c.fillStyle = BED_QUILT;
  c.beginPath();
  c.moveTo(8 * S, -42 * S);
  c.quadraticCurveTo(86 * S, humpY - 58 * S, 176 * S, -44 * S);
  c.lineTo(176 * S, -12 * S);
  c.lineTo(8 * S, -12 * S);
  c.closePath();
  c.fill();
  c.stroke();

  // Motion bounce arcs above blanket when bouncing
  if (Math.abs(Math.sin(bounceAmt)) > 0.35) {
    c.strokeStyle = '#FFE066';
    c.lineWidth = 3.5 * S;
    c.lineCap = 'round';
    c.beginPath();
    c.arc(82 * S, humpY - 46 * S, 34 * S, -Math.PI * 0.78, -Math.PI * 0.22);
    c.stroke();
    c.beginPath();
    c.arc(82 * S, humpY - 56 * S, 48 * S, -Math.PI * 0.72, -Math.PI * 0.28);
    c.stroke();
  }

  // Little "HOTEL SUITE 420" pillow on edge
  c.fillStyle = PAPER;
  c.strokeStyle = INK;
  c.lineWidth = 3 * S;
  c.beginPath();
  c.ellipse(18 * S, -58 * S, 28 * S, 16 * S, -0.25, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.restore();
}

function drawTweetCard(c, tw, S) {
  const alpha = clamp(1 - Math.max(0, tw.life - (tw.maxLife - 1.1)) / 1.1, 0, 1) * clamp(tw.life / 0.25, 0, 1);
  c.save();
  c.globalAlpha = alpha;
  c.translate(tw.x, tw.y);
  c.rotate(tw.wobble);

  const w = 278 * S;
  const h = 64 * S;

  c.fillStyle = tw.isGrok ? '#131B2E' : '#0F141F';
  c.strokeStyle = tw.isGrok ? CYAN : '#3B4861';
  c.lineWidth = 2.6 * S;
  drawRoundedRect(c, -w / 2, -h / 2, w, h, 12 * S);
  c.fill();
  c.stroke();

  // Avatar circle
  c.fillStyle = tw.isGrok ? CYAN : '#E2E8F0';
  c.beginPath();
  c.arc(-w / 2 + 24 * S, -8 * S, 12 * S, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = INK;
  c.font = `900 ${Math.round(12 * S)}px "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(tw.isGrok ? 'G' : 'X', -w / 2 + 24 * S, -7.5 * S);

  // Handle + blue check
  c.textAlign = 'left';
  c.fillStyle = tw.isGrok ? CYAN : '#94A3B8';
  c.font = `700 ${Math.round(11 * S)}px Arial, sans-serif`;
  c.fillText(tw.handle, -w / 2 + 44 * S, -14 * S);

  // Tweet text
  c.fillStyle = PAPER;
  c.font = `800 ${Math.round(12.5 * S)}px Arial, sans-serif`;
  c.fillText(tw.body, -w / 2 + 44 * S, 8 * S);

  c.restore();
}

function drawHeartShape(c, x, y, size) {
  c.beginPath();
  c.moveTo(x, y + size * 0.35);
  c.bezierCurveTo(x - size, y - size * 0.35, x - size * 0.55, y - size * 1.1, x, y - size * 0.35);
  c.bezierCurveTo(x + size * 0.55, y - size * 1.1, x + size, y - size * 0.35, x, y + size * 0.35);
  c.closePath();
}

function drawTitleBanner(c, cx, cy, S, alpha, scale) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(cx, cy);
  c.scale(scale, scale);

  const w = 510 * S;
  const h = 92 * S;
  c.fillStyle = 'rgba(13, 17, 29, 0.92)';
  c.strokeStyle = CYAN;
  c.lineWidth = 3.5 * S;
  // Angular cyber banner
  c.beginPath();
  c.moveTo(-w / 2 + 18 * S, -h / 2);
  c.lineTo(w / 2, -h / 2);
  c.lineTo(w / 2 - 18 * S, h / 2);
  c.lineTo(-w / 2, h / 2);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = PAPER;
  c.font = `900 ${Math.round(31 * S)}px "Arial Black", Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('THE CYBERCUCK CHAIR', 0, -12 * S);

  c.fillStyle = CYAN;
  c.font = `700 ${Math.round(14 * S)}px monospace`;
  c.fillText('FULL SELF-WATCHING  •  $69,420 MSRP  •  PANEL GAPS INCLUDED', 0, 22 * S);

  c.restore();
}

function drawStamp(c, cx, cy, S, progress, text, subtext) {
  const s = lerp(2.4, 1.0, easeOutCubic(progress));
  const alpha = clamp(progress * 2.5, 0, 1);
  c.save();
  c.globalAlpha = alpha;
  c.translate(cx, cy);
  c.rotate(-0.14);
  c.scale(s, s);

  const w = 360 * S;
  const h = 88 * S;
  c.fillStyle = 'rgba(20, 12, 22, 0.84)';
  c.strokeStyle = ALERT_RED;
  c.lineWidth = 6 * S;
  drawRoundedRect(c, -w / 2, -h / 2, w, h, 10 * S);
  c.fill();
  c.stroke();

  c.strokeStyle = ALERT_RED;
  c.lineWidth = 2 * S;
  drawRoundedRect(c, -w / 2 + 7 * S, -h / 2 + 7 * S, w - 14 * S, h - 14 * S, 6 * S);
  c.stroke();

  c.fillStyle = ALERT_RED;
  c.font = `900 ${Math.round(30 * S)}px "Arial Black", Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 0, -10 * S);

  c.fillStyle = '#FFD166';
  c.font = `800 ${Math.round(14 * S)}px monospace`;
  c.fillText(subtext, 0, 22 * S);
  c.restore();
}

function drawRatioMeter(c, x, y, S, likes, replies, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);

  const w = 220 * S;
  const h = 50 * S;
  c.fillStyle = 'rgba(13, 17, 29, 0.9)';
  c.strokeStyle = ALERT_RED;
  c.lineWidth = 2.6 * S;
  drawRoundedRect(c, -w / 2, -h / 2, w, h, 10 * S);
  c.fill();
  c.stroke();

  c.font = `900 ${Math.round(14 * S)}px monospace`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.fillStyle = '#94A3B8';
  c.fillText(`♥ ${likes}`, -w / 2 + 16 * S, 0);

  c.textAlign = 'right';
  c.fillStyle = ALERT_RED;
  c.fillText(`RATIO: ${Math.floor(replies).toLocaleString()}`, w / 2 - 14 * S, 0);

  c.restore();
}

export function init(ctx) {
  fired = new Set();
  particles = [];
  tweets = [];
  popups = [];
  hearts = [];
  bolts = [];
  shakeAmt = 0;
  boingPhase = 0;
  boingTimer = 0;
  ratioReplies = 0;
  ratioLikes = 3;
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;

  // Transparent glass over live stream — ALWAYS clear first, never paint opaque bg!
  c.clearRect(0, 0, W, H);

  if (t > 58.2) return;

  const safeDt = clamp(dt, 0, 0.05);
  const S = Math.min(W / 1280, H / 720);

  // Clean exit slide-out from 53s to 57.5s
  const exitP = t >= 53 ? easeInOutQuad((t - 53) / 4.2) : 0;
  const exitY = exitP * 440 * S;
  const masterAlpha = 1 - clamp((t - 54.5) / 3.0, 0, 1);

  // Anchor coordinates (floating cleanly in lower half, letting gameplay shine above)
  const sceneX = W * 0.43;
  const floorY = H * 0.80 + exitY;
  const chairBaseX = sceneX;
  const chairBaseY = floorY - 12 * S;
  const bedX = W * 0.82;
  const bedY = floorY + 8 * S;

  // Screen-local camera shake decay
  shakeAmt = Math.max(0, shakeAmt - safeDt * 18);
  const shX = (ctx.rand() - 0.5) * shakeAmt * S;
  const shY = (ctx.rand() - 0.5) * shakeAmt * S;

  // ===================== SOUND & SCRIPTED BEATS =====================

  // ACT 1: Product reveal
  once('fanfare1', t, 0.3, () => ctx.sound.beep(220, 160));
  once('fanfare2', t, 0.55, () => ctx.sound.beep(330, 160));
  once('fanfare3', t, 0.8, () => ctx.sound.beep(440, 260));

  once('carpetDrop', t, 2.3, () => {
    ctx.sound.noise(160);
    spawnDust(ctx, sceneX, floorY + 20 * S, 10, S);
  });

  once('chairSlam', t, 3.6, () => {
    ctx.sound.noise(280);
    ctx.sound.beep(110, 180);
    shakeAmt = 12;
    spawnDust(ctx, chairBaseX, chairBaseY + 24 * S, 18, S);
    spawnSparks(ctx, chairBaseX + 35 * S, chairBaseY - 130 * S, 10, S, CYAN);
    spawnBolt(ctx, chairBaseX + 32 * S, chairBaseY - 135 * S, S);
    spawnPopup(chairBaseX + 80 * S, chairBaseY - 150 * S, 'PANEL GAP!', CYAN, S, 0.9, 1.8);
  });

  once('lampPop', t, 5.4, () => {
    ctx.sound.beep(520, 90);
  });

  once('elonSit', t, 7.0, () => {
    ctx.sound.noise(120);
    ctx.sound.beep(280, 90);
    spawnDust(ctx, chairBaseX, chairBaseY - 25 * S, 8, S, '#C78CA2');
  });

  // ACT 2: Bed slides in and rhythmic bouncing begins
  once('bedEnter', t, 10.2, () => {
    ctx.sound.noise(140);
  });

  // Tweet barrage during Act 2
  once('tw1', t, 14.0, () => {
    ctx.sound.beep(780, 70);
    spawnTweet(chairBaseX - 30 * S, chairBaseY - 210 * S, '@elonmusk ✓', 'LOOKING INTO THIS.', S);
  });
  once('tw2', t, 17.0, () => {
    ctx.sound.beep(840, 70);
    spawnTweet(chairBaseX + 20 * S, chairBaseY - 210 * S, '@elonmusk ✓', 'ACTUALLY I INVENTED WATCHING.', S);
  });
  once('tw3', t, 20.2, () => {
    ctx.sound.beep(900, 70);
    spawnTweet(chairBaseX - 20 * S, chairBaseY - 210 * S, '@elonmusk ✓', 'CONCERNING IF TRUE!!', S);
  });
  once('tw4', t, 23.4, () => {
    ctx.sound.beep(960, 70);
    spawnTweet(chairBaseX + 10 * S, chairBaseY - 210 * S, '@elonmusk ✓', 'THE CHAIR ALGORITHM IS RIGGED', S);
  });

  // ACT 3: Alpha Mode malfunction
  once('pressAlpha', t, 28.5, () => {
    ctx.sound.beep(480, 120);
    spawnPopup(chairBaseX - 95 * S, chairBaseY - 110 * S, 'ALPHA MODE!', WARN_ORANGE, S, 1.05, 1.8);
  });

  once('grind1', t, 30.2, () => {
    ctx.sound.noise(240);
    ctx.sound.beep(150, 180);
    shakeAmt = 8;
    spawnSparks(ctx, chairBaseX + 74 * S, chairBaseY - 56 * S, 16, S);
  });

  once('armSnap', t, 32.5, () => {
    ctx.sound.noise(320);
    ctx.sound.beep(95, 220);
    shakeAmt = 14;
    spawnSparks(ctx, chairBaseX + 78 * S, chairBaseY - 54 * S, 24, S, WARN_ORANGE);
    spawnBolt(ctx, chairBaseX + 72 * S, chairBaseY - 54 * S, S);
    spawnBolt(ctx, chairBaseX + 60 * S, chairBaseY - 65 * S, S);
    spawnPopup(chairBaseX + 110 * S, chairBaseY - 105 * S, 'WARRANTY VOIDED!', ALERT_RED, S, 1.15, 2.4);
  });

  once('grokBurn', t, 35.8, () => {
    ctx.sound.beep(660, 90);
    ctx.sound.beep(520, 120);
    spawnTweet(
      chairBaseX + 10 * S,
      chairBaseY - 220 * S,
      '@grok ✓',
      'Yes boss, this is statistically a cuck chair.',
      S,
      true
    );
  });

  // ACT 4: Mars Escape Pod launch fail!
  once('cd3', t, 40.5, () => {
    ctx.sound.beep(440, 130);
    spawnPopup(chairBaseX, chairBaseY - 235 * S, 'MARS ESCAPE: 3', CYAN, S, 1.2, 0.9);
  });
  once('cd2', t, 41.6, () => {
    ctx.sound.beep(523, 130);
    spawnPopup(chairBaseX, chairBaseY - 235 * S, 'MARS ESCAPE: 2', WARN_ORANGE, S, 1.25, 0.9);
  });
  once('cd1', t, 42.7, () => {
    ctx.sound.beep(659, 130);
    spawnPopup(chairBaseX, chairBaseY - 235 * S, 'MARS ESCAPE: 1', ALERT_RED, S, 1.3, 0.9);
  });
  once('launchIgnite', t, 43.8, () => {
    ctx.sound.noise(480);
    ctx.sound.beep(180, 320);
    shakeAmt = 11;
  });
  once('launchSputter', t, 45.6, () => {
    ctx.sound.noise(220);
    ctx.sound.beep(115, 160);
    spawnPopup(chairBaseX + 70 * S, chairBaseY - 180 * S, 'PFFFT...', '#CBD5E1', S, 1.1, 1.6);
  });
  once('chairCrash', t, 46.7, () => {
    ctx.sound.noise(360);
    ctx.sound.beep(85, 220);
    shakeAmt = 16;
    spawnDust(ctx, chairBaseX - 20 * S, chairBaseY + 12 * S, 24, S);
    spawnSparks(ctx, chairBaseX + 10 * S, chairBaseY - 30 * S, 18, S);
  });
  once('finalTweet', t, 48.2, () => {
    ctx.sound.beep(720, 80);
    spawnTweet(
      chairBaseX,
      chairBaseY - 140 * S,
      '@elonmusk ✓',
      'RAPID UNSCHEDULED CUCKING: HUGE SUCCESS.',
      S
    );
  });
  once('stampHit', t, 50.0, () => {
    ctx.sound.noise(240);
    ctx.sound.beep(140, 150);
    shakeAmt = 10;
  });

  // ===================== RHYTHMIC BED BOUNCING (11s to 52s) =====================
  const bedActive = t >= 11.2 && t < 52.5;
  if (bedActive) {
    const fastBed = t >= 24.0 && t < 44.0;
    const interval = fastBed ? 0.85 : 1.35;
    boingPhase += safeDt * (fastBed ? 7.4 : 4.6);
    boingTimer += safeDt;
    if (boingTimer >= interval) {
      boingTimer -= interval;
      // Gentle slapstick spring boing
      ctx.sound.beep(fastBed ? 290 : 230, 75);
      spawnHeart(ctx, bedX + 50 * S, bedY - 95 * S, S);
      const words = ['BOING!', 'CREAK!', 'SQUEAK!', 'OH YEAH!'];
      const word = words[Math.floor(ctx.rand() * words.length)];
      spawnPopup(bedX + 35 * S, bedY - 125 * S, word, '#FF6B9D', S, 0.95, 1.15);
    }
  }

  // Ratio counter rises from 14.5s onward
  if (t >= 14.5 && t < 53) {
    ratioReplies += safeDt * (t > 28 ? 2450 : 920);
    if (t > 36 && ratioLikes > 1) ratioLikes = 1;
  }

  // Rocket flames & smoke during Act 4
  if (t >= 43.8 && t < 46.2) {
    spawnFlame(ctx, chairBaseX - 38 * S, chairBaseY - 22 * S, S, t < 45.4 ? 1.1 : 0.5);
    spawnFlame(ctx, chairBaseX + 38 * S, chairBaseY - 22 * S, S, t < 45.4 ? 1.1 : 0.5);
  }
  if (t >= 46.7 && t < 53.5 && ctx.rand() < safeDt * 7) {
    spawnSmoke(ctx, chairBaseX + 15 * S, chairBaseY - 24 * S, S);
  }

  // ===================== UPDATE PARTICLES & FLOATING ELEMENTS =====================
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += safeDt;
    p.vy += p.gravity * safeDt;
    p.x += p.vx * safeDt;
    p.y += p.vy * safeDt;
    if (p.life >= p.maxLife) particles.splice(i, 1);
  }

  for (let i = bolts.length - 1; i >= 0; i--) {
    const b = bolts[i];
    b.life += safeDt;
    b.vy += 650 * S * safeDt;
    b.x += b.vx * safeDt;
    b.y += b.vy * safeDt;
    b.rot += b.vrot * safeDt;
    if (b.y > b.floorY && b.vy > 0) {
      b.y = b.floorY;
      b.vy *= -0.45;
      b.vx *= 0.72;
      b.vrot *= 0.65;
    }
    if (b.life >= b.maxLife) bolts.splice(i, 1);
  }

  for (let i = tweets.length - 1; i >= 0; i--) {
    const tw = tweets[i];
    tw.life += safeDt;
    tw.y += tw.vy * safeDt;
    if (tw.life >= tw.maxLife) tweets.splice(i, 1);
  }

  for (let i = popups.length - 1; i >= 0; i--) {
    const pp = popups[i];
    pp.life += safeDt;
    pp.y += pp.vy * safeDt;
    if (pp.life >= pp.maxLife) popups.splice(i, 1);
  }

  for (let i = hearts.length - 1; i >= 0; i--) {
    const ht = hearts[i];
    ht.life += safeDt;
    ht.x += (ht.vx + Math.sin(ht.life * 4 + ht.phase) * 28 * S) * safeDt;
    ht.y += ht.vy * safeDt;
    if (ht.life >= ht.maxLife) hearts.splice(i, 1);
  }

  // ===================== DRAW LAYERED SCENE =====================
  c.save();
  c.globalAlpha = masterAlpha;
  c.translate(shX, shY);

  // Subtle holographic spotlight cone during unveiling (0.2s – 6.2s)
  if (t > 0.2 && t < 6.2) {
    const spotA = clamp(Math.min((t - 0.2) / 0.8, (6.2 - t) / 1.2), 0, 1) * 0.22;
    const sweep = Math.sin(t * 1.4) * 50 * S;
    const sg = c.createLinearGradient(chairBaseX, 0, chairBaseX, floorY + 60 * S);
    sg.addColorStop(0, `rgba(56, 232, 255, ${spotA})`);
    sg.addColorStop(1, 'rgba(56, 232, 255, 0)');
    c.fillStyle = sg;
    c.beginPath();
    c.moveTo(chairBaseX - 65 * S + sweep * 0.3, 0);
    c.lineTo(chairBaseX + 65 * S + sweep * 0.3, 0);
    c.lineTo(chairBaseX + 220 * S + sweep, floorY + 75 * S);
    c.lineTo(chairBaseX - 220 * S + sweep, floorY + 75 * S);
    c.closePath();
    c.fill();
  }

  // 1. Hotel carpet swatch (drops in 2.0s – 2.5s)
  if (t >= 1.9) {
    const cp = easeOutBack((t - 1.9) / 0.55);
    const cy = lerp(floorY - 120 * S, floorY, cp);
    drawCarpet(c, sceneX, cy, S, clamp((t - 1.9) / 0.3, 0, 1));
  }

  // 2. Sad nightstand + lamp (pops in 5.2s – 5.8s)
  if (t >= 5.2) {
    const lp = easeOutBack((t - 5.2) / 0.55);
    c.save();
    c.translate(sceneX - 165 * S, floorY + 24 * S);
    c.scale(lp, lp);
    drawNightstandAndLamp(c, 0, 0, S, t, 1);
    c.restore();
  }

  // 3. Hotel bed corner sliding in from right edge (10.0s – 11.2s)
  if (t >= 10.0) {
    const bp = easeOutCubic((t - 10.0) / 1.1);
    const curBedX = lerp(W + 180 * S, bedX, bp);
    drawHotelBedCorner(c, curBedX, bedY, S, boingPhase, 1);
  }

  // 4. Cyber Chair + Elon transform (drop-in, malfunction wobble, failed rocket launch & tip-over!)
  if (t >= 3.2) {
    const dropP = easeOutCubic((t - 3.2) / 0.42);
    let curChairX = chairBaseX;
    let curChairY = lerp(-240 * S, chairBaseY, dropP);
    let chairRot = 0;

    // Alpha Mode violent shudder (29.8s – 32.8s)
    if (t >= 29.8 && t < 32.8) {
      chairRot = Math.sin(t * 22) * 0.055;
      curChairX += Math.sin(t * 30) * 5 * S;
    }

    // Mars Escape Pod launch attempt (43.8s – 46.8s) & tipped-over aftermath (46.8s+)
    if (t >= 43.8 && t < 45.6) {
      const liftP = easeOutCubic((t - 43.8) / 1.8);
      curChairY -= liftP * 68 * S;
      chairRot = Math.sin(t * 9) * 0.14 * liftP;
    } else if (t >= 45.6 && t < 46.7) {
      const tipP = easeInOutQuad((t - 45.6) / 1.1);
      curChairY -= (1 - tipP) * 68 * S;
      curChairY += tipP * 20 * S;
      curChairX -= tipP * 32 * S;
      chairRot = lerp(0.1, -1.72, tipP);
    } else if (t >= 46.7) {
      curChairY += 20 * S;
      curChairX -= 32 * S;
      chairRot = -1.72;
    }

    const ledColor =
      t >= 29.8 && t < 46.7
        ? Math.floor(t * 2.2) % 2 === 0
          ? WARN_ORANGE
          : ALERT_RED
        : t >= 46.7
        ? '#475569'
        : CYAN;

    const rocketArmed = t >= 40.5;
    const rightArmBroken = t >= 32.5;
    const armFallT = (t - 32.5) / 0.55;
    const pressingBtn = t >= 28.4 && t < 29.8;

    c.save();
    c.translate(curChairX, curChairY);
    c.rotate(chairRot);

    // Back of Cyber Chair
    drawCyberChairBack(c, S, t, ledColor, rocketArmed);

    // Elon hops in at t = 6.7s
    if (t >= 6.7) {
      const hopP = easeOutBack((t - 6.7) / 0.45);
      const hopY = lerp(-95 * S, 0, clamp(hopP, 0, 1.05));
      let mood = 'smug';
      if (t >= 11.4 && t < 15.0) mood = 'shocked';
      else if (t >= 15.0 && t < 29.8) mood = 'seething';
      else if (t >= 29.8 && t < 36.2) mood = 'panicked';
      else if (t >= 36.2) mood = 'defeated';

      const phoneGlow = t >= 13.5 && !pressingBtn;
      const typingFast = (t >= 13.8 && t < 28.0) || (t >= 47.6 && t < 51.0);
      const crying = t >= 36.2 && t < 46.7;

      c.save();
      c.translate(0, hopY);
      drawElon(c, S, t, mood, phoneGlow, crying, typingFast, pressingBtn);
      c.restore();
    }

    // Front steel armrests over Elon's elbows
    drawCyberChairFrontArms(c, S, rightArmBroken, armFallT, pressingBtn);

    c.restore();
  }

  // 5. Flying loose Cybertruck bolts
  for (const b of bolts) {
    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.rot);
    c.fillStyle = STEEL_LIGHT;
    c.strokeStyle = INK;
    c.lineWidth = 2 * S;
    c.fillRect(-5 * S, -3 * S, 10 * S, 6 * S);
    c.strokeRect(-5 * S, -3 * S, 10 * S, 6 * S);
    c.fillRect(-2.5 * S, 3 * S, 5 * S, 7 * S);
    c.strokeRect(-2.5 * S, 3 * S, 5 * S, 7 * S);
    c.restore();
  }

  // 6. Particles (dust, sparks, flames, smoke)
  for (const p of particles) {
    const a = clamp(1 - p.life / p.maxLife, 0, 1);
    c.save();
    c.globalAlpha = a * masterAlpha;
    c.fillStyle = p.color;
    if (p.kind === 'spark') {
      c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 1.6);
    } else {
      c.beginPath();
      c.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? 0.8 + (1 - a) * 1.1 : a * 0.6 + 0.4), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // 7. Floating pink hearts from the bed
  for (const ht of hearts) {
    const a = clamp(1 - ht.life / ht.maxLife, 0, 1);
    c.save();
    c.globalAlpha = a * masterAlpha;
    c.fillStyle = ctx.accent || '#FF5CA8';
    c.strokeStyle = INK;
    c.lineWidth = 2 * S;
    drawHeartShape(c, ht.x, ht.y, ht.size);
    c.fill();
    c.stroke();
    c.restore();
  }

  // 8. Speech bubbles (comedic dialogue beats)
  if (t >= 7.6 && t < 10.6) {
    drawSpeechBubble(c, chairBaseX, chairBaseY - 228 * S, ['BEST SEAT IN THE', 'ENTIRE HOTEL.'], S, 'down-left');
  } else if (t >= 11.8 && t < 14.2) {
    drawSpeechBubble(c, chairBaseX, chairBaseY - 228 * S, ['WAIT... WHO IS', 'ON MY BED?!'], S, 'down-left', ALERT_RED);
  } else if (t >= 25.0 && t < 28.2) {
    drawSpeechBubble(c, bedX - 40 * S, bedY - 155 * S, ['FINALLY SOMEONE WHO', 'FINISHES A LAUNCH!'], S, 'down-right', '#FF5CA8');
  } else if (t >= 37.2 && t < 40.2) {
    drawSpeechBubble(c, chairBaseX, chairBaseY - 228 * S, ['SHUT UP GROK!', 'ENGAGING MARS POD!'], S, 'down-left', ALERT_RED);
  }

  // 9. Floating Tweet cards
  for (const tw of tweets) {
    drawTweetCard(c, tw, S);
  }

  // 10. Floating comic popups
  for (const pp of popups) {
    const a = clamp(1 - Math.max(0, pp.life - (pp.maxLife - 0.4)) / 0.4, 0, 1);
    const popS = easeOutBack(clamp(pp.life / 0.2, 0, 1)) * pp.scale;
    c.save();
    c.globalAlpha = a * masterAlpha;
    c.translate(pp.x, pp.y);
    c.scale(popS, popS);
    c.font = `900 ${Math.round(22 * S)}px "Arial Black", Impact, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 5 * S;
    c.strokeStyle = INK;
    c.strokeText(pp.text, 0, 0);
    c.fillStyle = pp.color;
    c.fillText(pp.text, 0, 0);
    c.restore();
  }

  // 11. Live Ratio Meter (14.5s – 52.8s)
  if (t >= 14.5 && t < 53.0) {
    const rAlpha = clamp(Math.min((t - 14.5) / 0.4, (53.0 - t) / 0.6), 0, 1);
    drawRatioMeter(c, sceneX - 175 * S, floorY - 195 * S, S, ratioLikes, ratioReplies, rAlpha);
  }

  // 12. Intro cyber title card (0.3s – 5.2s)
  if (t >= 0.3 && t < 5.2) {
    const inP = easeOutBack((t - 0.3) / 0.55);
    const outA = t > 4.4 ? clamp(1 - (t - 4.4) / 0.8, 0, 1) : 1;
    drawTitleBanner(c, W * 0.5, H * 0.20, S, outA, inP);
  }

  // 13. Final punchline stamp (50.0s – 54.0s)
  if (t >= 50.0 && t < 54.5) {
    const p = clamp((t - 50.0) / 0.35, 0, 1);
    drawStamp(c, sceneX + 20 * S, floorY - 145 * S, S, p, '$44B WELL SPENT', '10/10 CORNER VIEW • VERIFIED');
  }

  c.restore();
}

export function dispose(ctx) {
  fired = new Set();
  particles = [];
  tweets = [];
  popups = [];
  hearts = [];
  bolts = [];
  shakeAmt = 0;
}
