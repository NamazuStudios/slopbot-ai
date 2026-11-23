// My Dixie Wrecked — a proud 90s jazz-pattern Dixie cup stands tall, gets
// catastrophically demolished by a wrecking ball, a cold shower, and a ten-ton
// anvil, then forces chat to say the title out loud to a sad trombone.

export const meta = {
  title: 'My Dixie Wrecked',
  author: 'savorysailor',
  prompt: 'my dixie wrecked',
  createdAt: '2026-11-20T00:00:00Z',
  moderationLevel: 'anything',
};

let W = 1280;
let H = 720;
let u = 1;

// Dynamic entities & particle pools
let particles = [];
let rainDrops = [];
let iceCubes = [];
let smokePuffs = [];
let paperScraps = [];
let notes = [];
let sparkles = [];
let puddle = { r: 0, targetR: 0 };
let shake = { mag: 0, x: 0, y: 0 };

// One-shot audio & event flags
let cues = {};
let lastRainSound = -10;
let lastAlarmSound = -10;
let lastWhistleStep = -1;
let lastSmokeSpawn = -10;
let lastRainSpawn = -10;
let lastSparkleSpawn = -10;

// Helpers
function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, k) {
  return a + (b - a) * k;
}

function invLerp(a, b, v) {
  return clamp((v - a) / (b - a), 0, 1);
}

function easeOutCubic(x) {
  const t = clamp(x, 0, 1);
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(x) {
  const t = clamp(x, 0, 1);
  return t * t * t;
}

function easeOutBack(x) {
  const t = clamp(x, 0, 1);
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeOutElastic(x) {
  const t = clamp(x, 0, 1);
  if (t === 0 || t === 1) return t;
  return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
}

function once(key, cond, fn) {
  if (!cues[key] && cond) {
    cues[key] = true;
    fn();
  }
}

function roundRectPath(c, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
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

function spawnSplash(ctx, x, y, count, colors, speedScale = 1) {
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI * 0.15 - ctx.rand() * Math.PI * 0.7;
    const spd = (140 + ctx.rand() * 290) * u * speedScale;
    particles.push({
      x: x + (ctx.rand() - 0.5) * 30 * u,
      y: y + (ctx.rand() - 0.5) * 20 * u,
      vx: Math.cos(ang) * spd + (ctx.rand() - 0.5) * 90 * u,
      vy: Math.sin(ang) * spd - 40 * u,
      size: (5 + ctx.rand() * 8) * u,
      color: colors[Math.floor(ctx.rand() * colors.length)],
      life: 0,
      maxLife: 0.65 + ctx.rand() * 0.55,
      gravity: 680 * u,
      kind: ctx.rand() < 0.3 ? 'star' : 'drop',
      rot: ctx.rand() * Math.PI * 2,
      vrot: (ctx.rand() - 0.5) * 10,
    });
  }
}

function spawnPaperScraps(ctx, x, y, count) {
  const palette = ['#f9f7f2', '#00c2b8', '#6c2bd9', '#ff4fa3'];
  for (let i = 0; i < count; i++) {
    const ang = -Math.PI * 0.1 - ctx.rand() * Math.PI * 0.8;
    const spd = (180 + ctx.rand() * 360) * u;
    paperScraps.push({
      x: x + (ctx.rand() - 0.5) * 60 * u,
      y: y + (ctx.rand() - 0.5) * 30 * u,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 90 * u,
      w: (12 + ctx.rand() * 18) * u,
      h: (8 + ctx.rand() * 12) * u,
      rot: ctx.rand() * Math.PI * 2,
      vrot: (ctx.rand() - 0.5) * 14,
      color: palette[Math.floor(ctx.rand() * palette.length)],
      life: 0,
      maxLife: 1.4 + ctx.rand() * 1.0,
    });
  }
}

function spawnSmoke(ctx, x, y, ring = false) {
  smokePuffs.push({
    x: x + (ctx.rand() - 0.5) * 18 * u,
    y,
    vx: (ctx.rand() - 0.5) * 28 * u,
    vy: -(38 + ctx.rand() * 35) * u,
    r: (ring ? 10 : 8 + ctx.rand() * 8) * u,
    maxR: (ring ? 38 : 30 + ctx.rand() * 18) * u,
    life: 0,
    maxLife: ring ? 1.5 : 1.1 + ctx.rand() * 0.6,
    ring,
  });
}

function spawnSparkle(ctx, x, y, color) {
  sparkles.push({
    x,
    y,
    size: (8 + ctx.rand() * 10) * u,
    color,
    life: 0,
    maxLife: 0.55 + ctx.rand() * 0.35,
    rot: ctx.rand() * Math.PI,
  });
}

function spawnNote(ctx, x, y, color) {
  notes.push({
    x,
    y,
    vx: -(55 + ctx.rand() * 55) * u,
    vy: -(30 + ctx.rand() * 55) * u,
    size: (18 + ctx.rand() * 10) * u,
    color,
    glyph: ctx.rand() < 0.5 ? '♪' : '♫',
    life: 0,
    maxLife: 1.35,
  });
}

export function init(ctx) {
  W = ctx.width || 1280;
  H = ctx.height || 720;
  u = Math.min(W, H) / 720;

  particles = [];
  rainDrops = [];
  iceCubes = [];
  smokePuffs = [];
  paperScraps = [];
  notes = [];
  sparkles = [];
  puddle = { r: 0, targetR: 0 };
  shake = { mag: 0, x: 0, y: 0 };
  cues = {};
  lastRainSound = -10;
  lastAlarmSound = -10;
  lastWhistleStep = -1;
  lastSmokeSpawn = -10;
  lastRainSpawn = -10;
  lastSparkleSpawn = -10;
}

function drawFourPointStar(c, x, y, r, color, rot = 0) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r : r * 0.32;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
  c.restore();
}

function drawComicBurst(c, x, y, radius, text, fillColor, textColor, alpha) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x, y);

  const spikes = 12;
  c.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const ang = (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? radius : radius * 0.58;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad * 0.72;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = fillColor;
  c.fill();
  c.lineWidth = 4 * u;
  c.strokeStyle = '#1b1826';
  c.stroke();

  c.font = `900 ${Math.round(30 * u)}px "Arial Black", Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 6 * u;
  c.strokeStyle = '#1b1826';
  c.strokeText(text, 0, 0);
  c.fillStyle = textColor;
  c.fillText(text, 0, 0);

  c.restore();
}

function drawSpeechBubble(c, x, y, text, alpha, accentColor, wobble = 0) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x + wobble, y);

  c.font = `800 ${Math.round(21 * u)}px "Trebuchet MS", Arial, sans-serif`;
  const metrics = c.measureText(text);
  const padX = 18 * u;
  const bw = metrics.width + padX * 2;
  const bh = 46 * u;
  const bx = -bw * 0.5;
  const by = -bh;

  // Drop shadow
  c.fillStyle = 'rgba(15, 12, 28, 0.35)';
  roundRectPath(c, bx + 4 * u, by + 5 * u, bw, bh, 14 * u);
  c.fill();

  // Bubble body
  c.fillStyle = '#ffffff';
  roundRectPath(c, bx, by, bw, bh, 14 * u);
  c.fill();
  c.lineWidth = 3.5 * u;
  c.strokeStyle = '#1b1826';
  c.stroke();

  // Tail pointing down-left toward cup
  c.beginPath();
  c.moveTo(-14 * u, 0);
  c.lineTo(-28 * u, 16 * u);
  c.lineTo(2 * u, 0);
  c.closePath();
  c.fillStyle = '#ffffff';
  c.fill();
  c.beginPath();
  c.moveTo(-14 * u, -1 * u);
  c.lineTo(-28 * u, 16 * u);
  c.lineTo(2 * u, -1 * u);
  c.stroke();

  // Accent dot
  c.fillStyle = accentColor;
  c.beginPath();
  c.arc(bx + 11 * u, by + 11 * u, 3.5 * u, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#1b1826';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, 0, by + bh * 0.5 + 1 * u);
  c.restore();
}

function drawDixieCup(c, opts) {
  const {
    cx,
    baseY,
    scaleX,
    scaleY,
    rot,
    dented,
    bandaid,
    coldTint,
    icicles,
    crushed,
    flexing,
    expression,
    t,
    accent,
  } = opts;

  c.save();
  c.translate(cx, baseY);
  c.rotate(rot);
  c.scale(scaleX, scaleY);

  const cupH = 195 * u;
  const topW = 132 * u;
  const botW = 90 * u;

  if (!crushed) {
    // Paper straw sticking out the back-right
    c.save();
    c.translate(22 * u, -cupH + 6 * u);
    c.rotate(0.22);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#1b1826';
    c.lineWidth = 3 * u;
    roundRectPath(c, -6 * u, -58 * u, 12 * u, 62 * u, 4 * u);
    c.fill();
    // Pink candy stripes on straw
    c.fillStyle = accent;
    for (let s = -50; s < -6; s += 16) {
      c.fillRect(-5 * u, s * u, 10 * u, 6 * u);
    }
    c.stroke();
    c.restore();

    // Flexing cartoon stick arms during pride beat
    if (flexing > 0.01) {
      c.save();
      c.globalAlpha = clamp(flexing, 0, 1);
      c.strokeStyle = '#1b1826';
      c.lineWidth = 7 * u;
      c.lineCap = 'round';
      c.lineJoin = 'round';

      const pump = Math.sin(t * 7) * 5 * u;
      // Left flexed arm
      c.beginPath();
      c.moveTo(-54 * u, -108 * u);
      c.lineTo(-92 * u, -98 * u);
      c.lineTo(-88 * u, -138 * u + pump);
      c.stroke();
      // Left bicep bump
      c.fillStyle = '#ffe0b5';
      c.beginPath();
      c.arc(-78 * u, -110 * u, 11 * u, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 3 * u;
      c.stroke();
      // Left fist
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(-88 * u, -142 * u + pump, 9 * u, 0, Math.PI * 2);
      c.fill();
      c.stroke();

      // Right flexed arm
      c.lineWidth = 7 * u;
      c.beginPath();
      c.moveTo(54 * u, -108 * u);
      c.lineTo(92 * u, -98 * u);
      c.lineTo(88 * u, -138 * u - pump);
      c.stroke();
      c.fillStyle = '#ffe0b5';
      c.beginPath();
      c.arc(78 * u, -110 * u, 11 * u, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 3 * u;
      c.stroke();
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(88 * u, -142 * u - pump, 9 * u, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.restore();
    }

    // Cup silhouette path (with optional right-wall dent)
    const buildCupPath = () => {
      c.beginPath();
      c.moveTo(-topW * 0.5, -cupH);
      c.lineTo(topW * 0.5, -cupH);
      if (dented) {
        c.lineTo(topW * 0.45, -cupH * 0.72);
        c.lineTo(topW * 0.24, -cupH * 0.54);
        c.lineTo(botW * 0.54, -cupH * 0.34);
      }
      c.lineTo(botW * 0.5, 0);
      c.quadraticCurveTo(0, 12 * u, -botW * 0.5, 0);
      c.closePath();
    };

    // Main paper body fill
    buildCupPath();
    const grad = c.createLinearGradient(-topW * 0.5, 0, topW * 0.5, 0);
    if (coldTint > 0.05) {
      grad.addColorStop(0, '#d8f3ff');
      grad.addColorStop(0.5, '#eaf9ff');
      grad.addColorStop(1, '#a9dcf5');
    } else {
      grad.addColorStop(0, '#f3efe6');
      grad.addColorStop(0.45, '#fffdf9');
      grad.addColorStop(1, '#d6d0c4');
    }
    c.fillStyle = grad;
    c.fill();

    // Clip interior for iconic 90s Jazz squiggle + DIXIE stamp
    c.save();
    buildCupPath();
    c.clip();

    // Teal 90s Jazz swoosh
    c.strokeStyle = '#00c2b8';
    c.lineWidth = 17 * u;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(-76 * u, -62 * u);
    c.lineTo(-32 * u, -95 * u);
    c.lineTo(-12 * u, -54 * u);
    c.lineTo(30 * u, -92 * u);
    c.lineTo(54 * u, -52 * u);
    c.lineTo(84 * u, -78 * u);
    c.stroke();

    // Purple 90s Jazz jagged streak
    c.strokeStyle = '#6c2bd9';
    c.lineWidth = 8.5 * u;
    c.beginPath();
    c.moveTo(-72 * u, -46 * u);
    c.lineTo(-28 * u, -76 * u);
    c.lineTo(-4 * u, -38 * u);
    c.lineTo(36 * u, -72 * u);
    c.lineTo(74 * u, -42 * u);
    c.stroke();

    // Brand lettering along bottom curve
    c.fillStyle = '#6c2bd9';
    c.font = `900 ${Math.round(20 * u)}px "Arial Black", Impact, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('DIXIE', 0, -24 * u);

    // Dent crease shadow lines
    if (dented) {
      c.strokeStyle = 'rgba(27, 24, 38, 0.45)';
      c.lineWidth = 3 * u;
      c.beginPath();
      c.moveTo(topW * 0.24, -cupH * 0.54);
      c.lineTo(topW * 0.02, -cupH * 0.63);
      c.moveTo(topW * 0.24, -cupH * 0.54);
      c.lineTo(topW * 0.06, -cupH * 0.44);
      c.stroke();
    }

    c.restore();

    // Crisp cup outline
    buildCupPath();
    c.lineWidth = 4.5 * u;
    c.strokeStyle = '#1b1826';
    c.stroke();

    // Rolled top paper rim
    c.fillStyle = coldTint > 0.05 ? '#dff6ff' : '#ffffff';
    c.strokeStyle = '#1b1826';
    c.lineWidth = 4 * u;
    c.beginPath();
    c.ellipse(0, -cupH, topW * 0.53, 13 * u, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();

    // Inner cup opening shade
    c.fillStyle = '#3d3356';
    c.beginPath();
    c.ellipse(0, -cupH, topW * 0.44, 7.5 * u, 0, 0, Math.PI * 2);
    c.fill();

    // Band-aid slapped over dent
    if (bandaid > 0.01) {
      c.save();
      c.translate(34 * u, -cupH * 0.53);
      c.rotate(-0.42);
      c.scale(bandaid, bandaid);
      c.fillStyle = '#f2c191';
      c.strokeStyle = '#1b1826';
      c.lineWidth = 2.8 * u;
      roundRectPath(c, -22 * u, -9 * u, 44 * u, 18 * u, 6 * u);
      c.fill();
      c.stroke();
      c.fillStyle = '#fbe1c3';
      c.fillRect(-7 * u, -7 * u, 14 * u, 14 * u);
      c.restore();
    }

    // Hanging cartoon icicles when cold-showered
    if (icicles > 0.01) {
      c.save();
      c.globalAlpha = clamp(icicles, 0, 1);
      c.fillStyle = '#a8f0ff';
      c.strokeStyle = '#1d6f96';
      c.lineWidth = 2.2 * u;
      const xs = [-54, -30, -4, 24, 48];
      const hs = [24, 34, 20, 30, 22];
      for (let i = 0; i < xs.length; i++) {
        c.beginPath();
        c.moveTo((xs[i] - 7) * u, -cupH + 6 * u);
        c.lineTo(xs[i] * u, -cupH + (6 + hs[i] * icicles) * u);
        c.lineTo((xs[i] + 7) * u, -cupH + 6 * u);
        c.closePath();
        c.fill();
        c.stroke();
      }
      c.restore();
    }

    // Cartoon face on the upper half of the cup
    const eyeY = -cupH * 0.72;
    const eyeSep = 23 * u;

    if (expression === 'smug') {
      // Confident half-lidded eyes + cheeky grin
      for (const side of [-1, 1]) {
        const ex = side * eyeSep;
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#1b1826';
        c.lineWidth = 3 * u;
        c.beginPath();
        c.arc(ex, eyeY, 12 * u, 0, Math.PI * 2);
        c.fill();
        c.stroke();

        c.fillStyle = '#1b1826';
        c.beginPath();
        c.arc(ex + 2 * u, eyeY + 1 * u, 5 * u, 0, Math.PI * 2);
        c.fill();

        // Smug angled eyelid
        c.fillStyle = '#f3efe6';
        c.beginPath();
        c.rect(ex - 13 * u, eyeY - 14 * u, 26 * u, 10 * u);
        c.fill();
        c.beginPath();
        c.moveTo(ex - 13 * u, eyeY - 4 * u);
        c.lineTo(ex + 13 * u, eyeY - (side === -1 ? 2 : 6) * u);
        c.stroke();
      }
      // Cheeky smirk
      c.strokeStyle = '#1b1826';
      c.lineWidth = 3.5 * u;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-16 * u, eyeY + 24 * u);
      c.quadraticCurveTo(2 * u, eyeY + 34 * u, 20 * u, eyeY + 19 * u);
      c.stroke();
    } else if (expression === 'shock') {
      // Huge wide eyes + screaming O mouth
      for (const side of [-1, 1]) {
        const ex = side * eyeSep;
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#1b1826';
        c.lineWidth = 3 * u;
        c.beginPath();
        c.arc(ex, eyeY, 15 * u, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = '#1b1826';
        c.beginPath();
        c.arc(ex, eyeY, 3.5 * u, 0, Math.PI * 2);
        c.fill();
      }
      c.fillStyle = '#1b1826';
      c.beginPath();
      c.ellipse(0, eyeY + 28 * u, 10 * u, 14 * u, 0, 0, Math.PI * 2);
      c.fill();
    } else if (expression === 'shiver') {
      // Tightly squeezed > < eyes + chattering teeth
      c.strokeStyle = '#1b1826';
      c.lineWidth = 3.5 * u;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(-eyeSep - 10 * u, eyeY - 8 * u);
      c.lineTo(-eyeSep + 8 * u, eyeY);
      c.lineTo(-eyeSep - 10 * u, eyeY + 8 * u);
      c.moveTo(eyeSep + 10 * u, eyeY - 8 * u);
      c.lineTo(eyeSep - 8 * u, eyeY);
      c.lineTo(eyeSep + 10 * u, eyeY + 8 * u);
      c.stroke();

      // Chattering rectangle mouth
      c.fillStyle = '#ffffff';
      roundRectPath(c, -18 * u, eyeY + 18 * u, 36 * u, 14 * u, 4 * u);
      c.fill();
      c.stroke();
      for (let tx = -10; tx <= 10; tx += 10) {
        c.beginPath();
        c.moveTo(tx * u, eyeY + 18 * u);
        c.lineTo(tx * u, eyeY + 32 * u);
        c.stroke();
      }
    } else if (expression === 'lookup') {
      // Sweating eyes looking straight UP at the incoming anvil
      for (const side of [-1, 1]) {
        const ex = side * eyeSep;
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#1b1826';
        c.lineWidth = 3 * u;
        c.beginPath();
        c.arc(ex, eyeY, 14 * u, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = '#1b1826';
        c.beginPath();
        c.arc(ex, eyeY - 7 * u, 4 * u, 0, Math.PI * 2);
        c.fill();
      }
      // Sweat drop
      c.fillStyle = '#6ee7ff';
      c.beginPath();
      c.moveTo(42 * u, eyeY - 12 * u);
      c.quadraticCurveTo(49 * u, eyeY + 2 * u, 42 * u, eyeY + 6 * u);
      c.quadraticCurveTo(35 * u, eyeY + 2 * u, 42 * u, eyeY - 12 * u);
      c.fill();
      c.stroke();
      // Tiny worried mouth
      c.strokeStyle = '#1b1826';
      c.lineWidth = 3 * u;
      c.beginPath();
      c.arc(0, eyeY + 32 * u, 9 * u, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    } else {
      // Strained grimace after dent
      for (const side of [-1, 1]) {
        const ex = side * eyeSep;
        c.fillStyle = '#ffffff';
        c.strokeStyle = '#1b1826';
        c.lineWidth = 3 * u;
        c.beginPath();
        c.arc(ex, eyeY, 12 * u, 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.fillStyle = '#1b1826';
        c.beginPath();
        c.arc(ex, eyeY, 4.5 * u, 0, Math.PI * 2);
        c.fill();
      }
      c.strokeStyle = '#1b1826';
      c.lineWidth = 3.5 * u;
      c.beginPath();
      c.moveTo(-16 * u, eyeY + 24 * u);
      c.lineTo(-8 * u, eyeY + 20 * u);
      c.lineTo(0, eyeY + 26 * u);
      c.lineTo(8 * u, eyeY + 20 * u);
      c.lineTo(16 * u, eyeY + 25 * u);
      c.stroke();
    }
  } else {
    // COMPLETELY WRECKED ACCORDION-CRUSHED PAPER PANCAKE!
    // Little white surrender flag on a toothpick poking out
    c.save();
    c.translate(38 * u, -42 * u);
    c.rotate(0.24 + Math.sin(t * 4) * 0.08);
    c.strokeStyle = '#d9b382';
    c.lineWidth = 4 * u;
    c.beginPath();
    c.moveTo(0, 18 * u);
    c.lineTo(0, -52 * u);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#1b1826';
    c.lineWidth = 2.5 * u;
    c.beginPath();
    c.moveTo(0, -50 * u);
    c.quadraticCurveTo(18 * u, -55 * u + Math.sin(t * 6) * 4 * u, 34 * u, -45 * u);
    c.lineTo(32 * u, -24 * u);
    c.quadraticCurveTo(16 * u, -30 * u + Math.sin(t * 6) * 4 * u, 0, -26 * u);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();

    // Accordion crumpled jagged body
    c.beginPath();
    c.moveTo(-88 * u, 0);
    c.lineTo(-76 * u, -20 * u);
    c.lineTo(-92 * u, -36 * u);
    c.lineTo(-68 * u, -50 * u);
    c.lineTo(-10 * u, -58 * u);
    c.lineTo(58 * u, -48 * u);
    c.lineTo(94 * u, -34 * u);
    c.lineTo(74 * u, -18 * u);
    c.lineTo(88 * u, 0);
    c.quadraticCurveTo(0, 12 * u, -88 * u, 0);
    c.closePath();

    c.fillStyle = '#ebe6dc';
    c.fill();

    // Jazz pattern crushed inside
    c.save();
    c.clip();
    c.strokeStyle = '#00c2b8';
    c.lineWidth = 10 * u;
    c.beginPath();
    c.moveTo(-84 * u, -22 * u);
    c.lineTo(-30 * u, -34 * u);
    c.lineTo(14 * u, -14 * u);
    c.lineTo(78 * u, -28 * u);
    c.stroke();
    c.strokeStyle = '#6c2bd9';
    c.lineWidth = 6 * u;
    c.beginPath();
    c.moveTo(-78 * u, -10 * u);
    c.lineTo(-18 * u, -24 * u);
    c.lineTo(36 * u, -6 * u);
    c.lineTo(80 * u, -18 * u);
    c.stroke();
    c.restore();

    c.lineWidth = 4 * u;
    c.strokeStyle = '#1b1826';
    c.stroke();

    // Bent, mangled oval rim hanging crookedly on top
    c.save();
    c.translate(-6 * u, -50 * u);
    c.rotate(-0.08);
    c.fillStyle = '#ffffff';
    c.strokeStyle = '#1b1826';
    c.lineWidth = 3.5 * u;
    c.beginPath();
    c.ellipse(0, 0, 74 * u, 11 * u, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.restore();

    // Dizzy spiral eyes (@_@)
    for (const side of [-1, 1]) {
      const ex = side * 24 * u;
      const ey = -28 * u;
      c.strokeStyle = '#1b1826';
      c.lineWidth = 2.6 * u;
      c.beginPath();
      for (let a = 0; a < Math.PI * 4.5; a += 0.35) {
        const rad = a * 0.9 * u;
        const px = ex + Math.cos(a + t * 3 * side) * rad;
        const py = ey + Math.sin(a + t * 3 * side) * rad;
        if (a === 0) c.moveTo(px, py);
        else c.lineTo(px, py);
      }
      c.stroke();
    }

    // Tongue sticking out
    c.fillStyle = accent;
    c.strokeStyle = '#1b1826';
    c.lineWidth = 2.5 * u;
    c.beginPath();
    c.ellipse(4 * u, -8 * u, 9 * u, 6 * u, 0.2, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  c.restore();
}

function drawRigidityMeter(c, x, y, value, statusText, brokenTilt, alpha, accent) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x, y);
  c.rotate(brokenTilt);

  const mw = 54 * u;
  const mh = 185 * u;

  // Backplate
  c.fillStyle = 'rgba(20, 18, 34, 0.88)';
  c.strokeStyle = '#ffffff';
  c.lineWidth = 3 * u;
  roundRectPath(c, -mw * 0.5, -mh, mw, mh, 12 * u);
  c.fill();
  c.stroke();

  // Fill bar
  const pct = clamp(value / 100, 0, 1);
  const innerH = (mh - 20 * u) * pct;
  if (innerH > 1) {
    const barColor = pct > 0.65 ? '#00d9c8' : pct > 0.3 ? '#ffd24c' : '#ef233c';
    c.fillStyle = barColor;
    roundRectPath(c, -mw * 0.5 + 10 * u, -10 * u - innerH, mw - 20 * u, innerH, 6 * u);
    c.fill();
  }

  // Tick marks
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 2 * u;
  for (let i = 1; i <= 4; i++) {
    const ty = -10 * u - ((mh - 20 * u) * i) / 5;
    c.beginPath();
    c.moveTo(-mw * 0.5 + 8 * u, ty);
    c.lineTo(mw * 0.5 - 8 * u, ty);
    c.stroke();
  }

  // Label plate above
  c.font = `900 ${Math.round(14 * u)}px "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.lineWidth = 4 * u;
  c.strokeStyle = '#1b1826';
  c.strokeText('RIGIDITY', 0, -mh - 12 * u);
  c.fillStyle = '#ffffff';
  c.fillText('RIGIDITY', 0, -mh - 12 * u);

  // Percentage + status below
  c.font = `900 ${Math.round(16 * u)}px "Arial Black", sans-serif`;
  const pctText = `${Math.round(value)}%`;
  c.strokeText(pctText, 0, 22 * u);
  c.fillStyle = pct > 0.65 ? accent : pct > 0.3 ? '#ffd24c' : '#ff4d6d';
  c.fillText(pctText, 0, 22 * u);

  c.font = `800 ${Math.round(13 * u)}px Arial, sans-serif`;
  c.strokeText(statusText, 0, 41 * u);
  c.fillStyle = '#ffffff';
  c.fillText(statusText, 0, 41 * u);

  c.restore();
}

function drawWreckingBall(c, pivotX, pivotY, angle, len) {
  const bx = pivotX + Math.sin(angle) * len;
  const by = pivotY + Math.cos(angle) * len;

  c.save();
  // Heavy iron chain links
  const links = 14;
  for (let i = 0; i < links; i++) {
    const k = i / links;
    const lx = lerp(pivotX, bx, k);
    const ly = lerp(pivotY, by, k);
    c.save();
    c.translate(lx, ly);
    c.rotate(-angle);
    c.strokeStyle = i % 2 === 0 ? '#3a4052' : '#58617a';
    c.lineWidth = 6 * u;
    c.beginPath();
    c.ellipse(0, 0, 6 * u, 13 * u, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // Iron ball
  const r = 56 * u;
  const grad = c.createRadialGradient(bx - 18 * u, by - 18 * u, 6 * u, bx, by, r);
  grad.addColorStop(0, '#7c87a3');
  grad.addColorStop(0.45, '#303647');
  grad.addColorStop(1, '#141720');

  c.fillStyle = grad;
  c.strokeStyle = '#0e1017';
  c.lineWidth = 4.5 * u;
  c.beginPath();
  c.arc(bx, by, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // Hazard stripe across ball
  c.fillStyle = '#ffd24c';
  c.font = `900 ${Math.round(18 * u)}px "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('WRECK', bx, by);

  c.restore();
}

function drawColdCloud(c, x, y, alpha, t) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x, y + Math.sin(t * 5) * 4 * u);

  const puffs = [
    [-58, 8, 34],
    [-22, -14, 42],
    [28, -10, 40],
    [62, 10, 32],
    [0, 18, 42],
  ];

  // Crisp outer cartoon silhouette stroke (no internal seams)
  c.fillStyle = '#121e33';
  for (const [px, py, pr] of puffs) {
    c.beginPath();
    c.arc(px * u, py * u, (pr + 4) * u, 0, Math.PI * 2);
    c.fill();
  }

  // Main storm cloud body
  c.fillStyle = '#2c4a75';
  for (const [px, py, pr] of puffs) {
    c.beginPath();
    c.arc(px * u, py * u, pr * u, 0, Math.PI * 2);
    c.fill();
  }

  // Inner highlight fluff
  const highlights = [
    [-48, 4, 24],
    [-18, -16, 32],
    [24, -12, 30],
    [54, 8, 22],
  ];
  c.fillStyle = '#406ba8';
  for (const [px, py, pr] of highlights) {
    c.beginPath();
    c.arc(px * u, py * u, pr * u, 0, Math.PI * 2);
    c.fill();
  }

  // Label on cloud
  c.font = `900 ${Math.round(18 * u)}px "Arial Black", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 4.5 * u;
  c.strokeStyle = '#0f1829';
  c.strokeText('COLD SHOWER', 0, 4 * u);
  c.fillStyle = '#9cf0ff';
  c.fillText('COLD SHOWER', 0, 4 * u);

  c.restore();
}

function drawAnvil(c, x, y, rot, alpha) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x, y);
  c.rotate(rot);

  // Classic cartoon anvil silhouette
  c.beginPath();
  c.moveTo(-104 * u, -72 * u); // horn tip
  c.quadraticCurveTo(-60 * u, -80 * u, -42 * u, -80 * u);
  c.lineTo(76 * u, -80 * u);
  c.lineTo(76 * u, -50 * u);
  c.lineTo(44 * u, -40 * u);
  c.lineTo(48 * u, -16 * u);
  c.lineTo(72 * u, 0);
  c.lineTo(-74 * u, 0);
  c.lineTo(-48 * u, -16 * u);
  c.lineTo(-44 * u, -44 * u);
  c.quadraticCurveTo(-76 * u, -52 * u, -104 * u, -72 * u);
  c.closePath();

  const grad = c.createLinearGradient(0, -82 * u, 0, 0);
  grad.addColorStop(0, '#626c85');
  grad.addColorStop(0.35, '#2b3040');
  grad.addColorStop(1, '#151821');
  c.fillStyle = grad;
  c.fill();
  c.lineWidth = 4.5 * u;
  c.strokeStyle = '#0c0e14';
  c.stroke();

  // Specular top sheen
  c.fillStyle = 'rgba(255,255,255,0.22)';
  c.fillRect(-36 * u, -74 * u, 102 * u, 8 * u);

  // "10 TONS" white stencil
  c.font = `900 ${Math.round(24 * u)}px "Arial Black", Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffffff';
  c.fillText('10 TONS', 4 * u, -34 * u);

  c.restore();
}

function drawRedStamp(c, x, y, scale, alpha) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x, y);
  c.rotate(-0.24);
  c.scale(scale, scale);

  const sw = 270 * u;
  const sh = 78 * u;

  // Double distressed stamp frame
  c.fillStyle = 'rgba(239, 35, 60, 0.14)';
  roundRectPath(c, -sw * 0.5, -sh * 0.5, sw, sh, 10 * u);
  c.fill();

  c.strokeStyle = '#ef233c';
  c.lineWidth = 6 * u;
  roundRectPath(c, -sw * 0.5, -sh * 0.5, sw, sh, 10 * u);
  c.stroke();

  c.lineWidth = 2.5 * u;
  roundRectPath(c, -sw * 0.5 + 8 * u, -sh * 0.5 + 8 * u, sw - 16 * u, sh - 16 * u, 6 * u);
  c.stroke();

  c.font = `900 ${Math.round(42 * u)}px "Arial Black", Impact, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ef233c';
  c.fillText('WRECKED', 0, 2 * u);

  c.restore();
}

function drawTrombone(c, x, y, slideExtend, bellPuff, alpha) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x, y);

  // Brass slide U-tube extending left
  const slideLen = (85 + slideExtend * 58) * u;
  c.strokeStyle = '#d99a1e';
  c.lineWidth = 9 * u;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(45 * u, -10 * u);
  c.lineTo(-slideLen, -10 * u);
  c.arc(-slideLen, 2 * u, 12 * u, -Math.PI * 0.5, Math.PI * 0.5, true);
  c.lineTo(60 * u, 14 * u);
  c.stroke();

  // Inner brass highlight
  c.strokeStyle = '#ffe173';
  c.lineWidth = 3.5 * u;
  c.stroke();

  // Bell flare facing left-upward
  c.save();
  c.translate(-14 * u, -16 * u);
  c.scale(1 + bellPuff * 0.14, 1 + bellPuff * 0.22);
  c.beginPath();
  c.moveTo(68 * u, -6 * u);
  c.lineTo(8 * u, -10 * u);
  c.quadraticCurveTo(-18 * u, -18 * u, -34 * u, -38 * u);
  c.lineTo(-34 * u, 24 * u);
  c.quadraticCurveTo(-18 * u, 6 * u, 8 * u, 4 * u);
  c.lineTo(68 * u, 6 * u);
  c.closePath();

  const grad = c.createLinearGradient(0, -34 * u, 0, 24 * u);
  grad.addColorStop(0, '#ffe680');
  grad.addColorStop(0.5, '#f2b824');
  grad.addColorStop(1, '#b8770b');
  c.fillStyle = grad;
  c.fill();
  c.lineWidth = 3.5 * u;
  c.strokeStyle = '#1b1826';
  c.stroke();

  // Dark inside of bell
  c.fillStyle = '#5e3b05';
  c.beginPath();
  c.ellipse(-34 * u, -7 * u, 7 * u, 29 * u, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();

  c.restore();
}

function drawScorecard(c, x, y, alpha, accent) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(x, y);
  c.rotate(-0.04);

  const cw = 250 * u;
  const ch = 122 * u;

  // Shadow
  c.fillStyle = 'rgba(12, 10, 22, 0.45)';
  roundRectPath(c, -cw * 0.5 + 6 * u, -ch * 0.5 + 6 * u, cw, ch, 12 * u);
  c.fill();

  // Clipboard card
  c.fillStyle = '#fff9ee';
  c.strokeStyle = '#1b1826';
  c.lineWidth = 4 * u;
  roundRectPath(c, -cw * 0.5, -ch * 0.5, cw, ch, 12 * u);
  c.fill();
  c.stroke();

  // Clip header
  c.fillStyle = '#1b1826';
  roundRectPath(c, -48 * u, -ch * 0.5 - 10 * u, 96 * u, 20 * u, 6 * u);
  c.fill();

  c.textAlign = 'center';
  c.font = `900 ${Math.round(16 * u)}px "Arial Black", sans-serif`;
  c.fillStyle = '#6c2bd9';
  c.fillText('INSURANCE REPORT', 0, -28 * u);

  c.font = `900 ${Math.round(20 * u)}px "Arial Black", sans-serif`;
  c.fillStyle = '#1b1826';
  c.fillText('PUN SCORE: 2 / 10', 0, 4 * u);

  c.font = `800 ${Math.round(15 * u)}px "Trebuchet MS", Arial, sans-serif`;
  c.fillStyle = accent;
  c.fillText('STILL LAUGHED THO', 0, 34 * u);

  c.restore();
}

function drawRibbonBanner(c, cx, y, titleText, subText, highlightGlow, alpha, accent) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.translate(cx, y);

  c.font = `900 ${Math.round(30 * u)}px "Arial Black", Impact, sans-serif`;
  const tw = Math.max(290 * u, c.measureText(titleText).width + 64 * u);
  const bh = 54 * u;

  // Ribbon tails
  c.fillStyle = '#4e1ea8';
  c.strokeStyle = '#1b1826';
  c.lineWidth = 3.5 * u;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(side * (tw * 0.5 - 10 * u), -bh * 0.35);
    c.lineTo(side * (tw * 0.5 + 34 * u), -bh * 0.35);
    c.lineTo(side * (tw * 0.5 + 20 * u), 4 * u);
    c.lineTo(side * (tw * 0.5 + 34 * u), bh * 0.45);
    c.lineTo(side * (tw * 0.5 - 10 * u), bh * 0.45);
    c.closePath();
    c.fill();
    c.stroke();
  }

  // Main ribbon plaque
  c.fillStyle = 'rgba(20, 18, 36, 0.94)';
  c.strokeStyle = highlightGlow > 0.1 ? accent : '#ffd24c';
  c.lineWidth = 4 * u;
  roundRectPath(c, -tw * 0.5, -bh * 0.5, tw, bh, 12 * u);
  c.fill();
  c.stroke();

  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillStyle = '#ffffff';
  c.fillText(titleText, 0, 1 * u);

  if (subText) {
    c.font = `800 ${Math.round(18 * u)}px "Trebuchet MS", Arial, sans-serif`;
    const sw = c.measureText(subText).width + 36 * u;
    const sy = bh * 0.5 + 24 * u;
    c.fillStyle = 'rgba(20, 18, 36, 0.9)';
    c.strokeStyle = accent;
    c.lineWidth = 2.8 * u;
    roundRectPath(c, -sw * 0.5, sy - 16 * u, sw, 32 * u, 16 * u);
    c.fill();
    c.stroke();
    c.fillStyle = '#ffd24c';
    c.fillText(subText, 0, sy + 1 * u);
  }

  c.restore();
}

export function frame(ctx, t, rawDt) {
  const c = ctx.canvas;
  W = ctx.width || 1280;
  H = ctx.height || 720;
  u = Math.min(W, H) / 720;
  const dt = clamp(rawDt || 0.016, 0.001, 0.08);
  const accent = ctx.accent || '#ff4fa3';

  // Transparent glass overlay — clear every single frame, never fill background
  c.clearRect(0, 0, W, H);

  // Stop drawing cleanly after 58s
  if (t > 58.2) return;

  // Global clean fade-out at the end (55.0s -> 57.8s)
  const exitFade = t < 55.0 ? 1 : 1 - easeInCubic(invLerp(55.0, 57.8, t));
  const exitDrop = t < 55.0 ? 0 : easeInCubic(invLerp(55.0, 57.8, t)) * 90 * u;

  // Decay micro-shake
  if (shake.mag > 0.1) {
    shake.mag = Math.max(0, shake.mag - dt * 28 * u);
    shake.x = (ctx.rand() - 0.5) * 2 * shake.mag;
    shake.y = (ctx.rand() - 0.5) * 2 * shake.mag;
  } else {
    shake.x = 0;
    shake.y = 0;
  }

  const stageX = W * 0.5;
  const stageY = H * 0.80 + exitDrop;

  // =========================================================================
  // ONE-SHOT AUDIO & PARTICLE CHOREOGRAPHY
  // =========================================================================

  // Act 1: Entrance slide & proud spring-up fanfare
  once('enterSlide', t >= 0.25, () => ctx.sound.beep(196, 110));
  once('rise1', t >= 2.55, () => ctx.sound.beep(262, 75));
  once('rise2', t >= 2.75, () => ctx.sound.beep(330, 75));
  once('rise3', t >= 2.95, () => ctx.sound.beep(392, 75));
  once('rise4', t >= 3.15, () => ctx.sound.beep(523, 140));
  once('rise5', t >= 3.40, () => {
    ctx.sound.beep(659, 180);
    spawnSplash(ctx, stageX, stageY - 170 * u, 16, ['#ffd24c', accent, '#00d9c8'], 0.9);
  });

  // 100% Rigidity ding
  once('meterFull', t >= 5.6, () => ctx.sound.beep(880, 140));

  // Periodic proud sparkles (4.0s - 12.0s)
  if (t >= 3.8 && t <= 12.0 && t - lastSparkleSpawn > 0.42) {
    lastSparkleSpawn = t;
    spawnSparkle(
      ctx,
      stageX + (ctx.rand() - 0.5) * 190 * u,
      stageY - (40 + ctx.rand() * 175) * u,
      ctx.rand() < 0.5 ? '#ffd24c' : accent
    );
  }

  // Slow warning siren (12.3s - 15.2s, ~1.5 Hz safe cadence)
  if (t >= 12.3 && t <= 15.2 && t - lastAlarmSound >= 0.65) {
    lastAlarmSound = t;
    const high = Math.floor((t - 12.3) / 0.65) % 2 === 0;
    ctx.sound.beep(high ? 620 : 480, 150);
  }

  // Beat 2A: Wrecking ball impact at t = 15.85s
  once('ballHit', t >= 15.85, () => {
    ctx.sound.noise(210);
    ctx.sound.beep(115, 220);
    shake.mag = 16 * u;
    puddle.targetR = 56 * u;
    spawnSplash(ctx, stageX + 36 * u, stageY - 125 * u, 24, ['#00c2b8', '#6c2bd9', '#ffd24c', '#ffffff'], 1.25);
  });

  // Band-aid slap at t = 18.0s
  once('bandaidSlap', t >= 18.0, () => {
    ctx.sound.beep(420, 65);
  });

  // Beat 2B: Cold shower cloud arrives (20.5s) and dumps rain/ice (22.0s - 26.2s)
  once('cloudThunder', t >= 21.85, () => {
    ctx.sound.noise(170);
    ctx.sound.beep(140, 180);
  });

  if (t >= 22.0 && t <= 26.2) {
    if (t - lastRainSpawn >= 0.045) {
      lastRainSpawn = t;
      for (let i = 0; i < 3; i++) {
        rainDrops.push({
          x: stageX + (ctx.rand() - 0.5) * 145 * u,
          y: stageY - 305 * u,
          vy: (420 + ctx.rand() * 160) * u,
          len: (16 + ctx.rand() * 12) * u,
        });
      }
      if (ctx.rand() < 0.28) {
        iceCubes.push({
          x: stageX + (ctx.rand() - 0.5) * 115 * u,
          y: stageY - 300 * u,
          vx: (ctx.rand() - 0.5) * 40 * u,
          vy: (260 + ctx.rand() * 90) * u,
          size: (13 + ctx.rand() * 9) * u,
          rot: ctx.rand() * Math.PI,
          vrot: (ctx.rand() - 0.5) * 8,
          bounced: false,
          life: 0,
        });
      }
    }
    if (t - lastRainSound >= 0.42) {
      lastRainSound = t;
      ctx.sound.beep(780 + ctx.rand() * 320, 45);
    }
    puddle.targetR = Math.max(puddle.targetR, 95 * u);
  }

  // Beat 2C: Anvil falling whistle (27.8s - 29.4s)
  if (t >= 27.8 && t < 29.45) {
    const step = Math.floor((t - 27.8) / 0.24);
    if (step !== lastWhistleStep) {
      lastWhistleStep = step;
      const freq = Math.max(260, 1080 - step * 130);
      ctx.sound.beep(freq, 130);
    }
  }

  // Beat 2C: MASSIVE ANVIL CRUSH at t = 29.5s!
  once('anvilCrush', t >= 29.5, () => {
    ctx.sound.noise(300);
    ctx.sound.beep(85, 250);
    shake.mag = 26 * u;
    puddle.targetR = 138 * u;
    spawnSplash(ctx, stageX, stageY - 30 * u, 34, ['#00c2b8', '#6c2bd9', accent, '#ffd24c', '#ffffff'], 1.45);
    spawnPaperScraps(ctx, stageX, stageY - 45 * u, 22);
    for (let i = 0; i < 8; i++) {
      spawnSmoke(ctx, stageX + (i - 3.5) * 24 * u, stageY - 18 * u, false);
    }
  });

  // Anvil hop-off squeak (32.2s)
  once('anvilLift', t >= 32.2, () => {
    ctx.sound.beep(310, 75);
  });

  // Continuous light smoke from crushed wreckage (33.0s - 54.0s)
  if (t >= 33.0 && t <= 54.0 && t - lastSmokeSpawn >= 0.55) {
    lastSmokeSpawn = t;
    spawnSmoke(ctx, stageX - 18 * u, stageY - 52 * u, false);
  }

  // Act 3: Giant red "WRECKED" rubber stamp slam at t = 36.2s
  once('stampSlam', t >= 36.2, () => {
    ctx.sound.noise(150);
    ctx.sound.beep(125, 175);
    shake.mag = 12 * u;
  });

  // Rimshot on "SAY THAT OUT LOUD, CHAT." (42.3s)
  once('rim1', t >= 42.3, () => ctx.sound.beep(260, 55));
  once('rim2', t >= 42.48, () => ctx.sound.beep(350, 55));
  once('rim3', t >= 42.68, () => ctx.sound.noise(140));

  // Sad trombone 4-note gag (47.0s -> 50.8s)
  const tbBellX = stageX + 220 * u;
  const tbBellY = stageY - 170 * u;
  once('tb1', t >= 47.0, () => {
    ctx.sound.beep(233, 240);
    spawnNote(ctx, tbBellX, tbBellY, '#ffd24c');
  });
  once('tb2', t >= 47.65, () => {
    ctx.sound.beep(220, 240);
    spawnNote(ctx, tbBellX, tbBellY, accent);
  });
  once('tb3', t >= 48.3, () => {
    ctx.sound.beep(208, 240);
    spawnNote(ctx, tbBellX, tbBellY, '#00d9c8');
  });
  once('tb4a', t >= 48.95, () => {
    ctx.sound.beep(196, 260);
    spawnNote(ctx, tbBellX, tbBellY, '#ffd24c');
  });
  once('tb4b', t >= 49.25, () => {
    ctx.sound.beep(191, 260);
    spawnNote(ctx, tbBellX, tbBellY, accent);
  });
  once('tb4c', t >= 49.55, () => {
    ctx.sound.beep(195, 250);
  });

  // Final pathetic twitch & smoke ring (52.6s)
  once('finalTwitch', t >= 52.6, () => {
    ctx.sound.beep(350, 65);
  });
  once('finalFlop', t >= 52.95, () => {
    ctx.sound.beep(145, 95);
    ctx.sound.noise(55);
    spawnSmoke(ctx, stageX, stageY - 58 * u, true);
  });

  // =========================================================================
  // UPDATE PARTICLES & PHYSICS
  // =========================================================================
  puddle.r = lerp(puddle.r, puddle.targetR, clamp(dt * 4, 0, 1));

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += dt;
    if (p.life >= p.maxLife) {
      particles.splice(i, 1);
      continue;
    }
    p.vy += p.gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vrot * dt;
  }

  for (let i = paperScraps.length - 1; i >= 0; i--) {
    const s = paperScraps[i];
    s.life += dt;
    if (s.life >= s.maxLife) {
      paperScraps.splice(i, 1);
      continue;
    }
    s.vy += 420 * u * dt;
    s.vx *= Math.pow(0.45, dt);
    s.x += s.vx * dt + Math.sin(t * 9 + i) * 30 * u * dt;
    s.y += s.vy * dt;
    s.rot += s.vrot * dt;
  }

  for (let i = rainDrops.length - 1; i >= 0; i--) {
    const r = rainDrops[i];
    r.y += r.vy * dt;
    if (r.y > stageY + 6 * u) {
      rainDrops.splice(i, 1);
    }
  }

  for (let i = iceCubes.length - 1; i >= 0; i--) {
    const ic = iceCubes[i];
    ic.life += dt;
    ic.vy += 580 * u * dt;
    ic.x += ic.vx * dt;
    ic.y += ic.vy * dt;
    ic.rot += ic.vrot * dt;
    if (!ic.bounced && ic.y >= stageY - 12 * u) {
      ic.bounced = true;
      ic.y = stageY - 12 * u;
      ic.vy = -(120 + ctx.rand() * 110) * u;
      ic.vx = (ctx.rand() - 0.5) * 180 * u;
    }
    if (ic.life > 1.8 || ic.y > stageY + 40 * u) {
      iceCubes.splice(i, 1);
    }
  }

  for (let i = smokePuffs.length - 1; i >= 0; i--) {
    const sm = smokePuffs[i];
    sm.life += dt;
    if (sm.life >= sm.maxLife) {
      smokePuffs.splice(i, 1);
      continue;
    }
    sm.x += sm.vx * dt;
    sm.y += sm.vy * dt;
  }

  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    n.life += dt;
    if (n.life >= n.maxLife) {
      notes.splice(i, 1);
      continue;
    }
    n.x += n.vx * dt;
    n.y += n.vy * dt + Math.sin(t * 7 + i) * 18 * u * dt;
  }

  for (let i = sparkles.length - 1; i >= 0; i--) {
    const sp = sparkles[i];
    sp.life += dt;
    if (sp.life >= sp.maxLife) {
      sparkles.splice(i, 1);
    }
  }

  // =========================================================================
  // COMPUTE ANIMATION STATE FOR CUP & PROPS
  // =========================================================================
  let cupX = stageX;
  let cupY = stageY;
  let cupScaleX = 1;
  let cupScaleY = 1;
  let cupRot = 0;
  let cupFlex = 0;
  let cupDented = t >= 15.85;
  let cupBandaid = 0;
  let cupColdTint = 0;
  let cupIcicles = 0;
  let cupCrushed = t >= 29.5;
  let cupExpr = 'smug';

  // Act 1 entrance (0.0 -> 2.5s): slides in tilted, then BOINGS straight up (2.5 -> 4.0s)
  if (t < 2.5) {
    const k = easeOutCubic(invLerp(0.0, 2.2, t));
    cupX = lerp(stageX - 360 * u, stageX, k);
    cupRot = lerp(-1.25, -1.08, k);
    cupScaleX = 1.05;
    cupScaleY = 0.94;
  } else if (t < 4.2) {
    const k = easeOutElastic(invLerp(2.5, 4.1, t));
    cupRot = lerp(-1.08, 0, k);
    const stretch = Math.sin(clamp(invLerp(2.5, 3.6, t), 0, 1) * Math.PI) * 0.22;
    cupScaleX = 1 - stretch * 0.45;
    cupScaleY = 1 + stretch;
  } else if (t < 15.85) {
    // Proud breathing & flexing
    cupScaleX = 1 + Math.sin(t * 4.2) * 0.03;
    cupScaleY = 1 + Math.cos(t * 4.2) * 0.035;
    cupFlex = easeOutBack(invLerp(4.8, 5.5, t)) * (1 - invLerp(11.6, 12.2, t));
    if (t >= 12.6) {
      cupExpr = 'shock';
      cupRot = Math.sin(t * 18) * 0.04;
    }
  } else if (t < 20.5) {
    // Post wrecking-ball impact wobble & recovery
    const since = t - 15.85;
    if (since < 1.3) {
      const decay = Math.exp(-since * 2.8);
      cupRot = -Math.sin(since * 11) * 0.34 * decay - 0.14 * decay;
      cupScaleX = 1 + 0.18 * decay;
      cupScaleY = 1 - 0.14 * decay;
      cupExpr = 'shock';
    } else {
      cupExpr = 'grimace';
      cupRot = Math.sin(t * 3.5) * 0.03 - 0.04;
    }
    cupBandaid = easeOutBack(invLerp(17.9, 18.4, t));
  } else if (t < 27.5) {
    // Cold shower shrinkage & shivering
    const coldProg = easeOutCubic(invLerp(22.0, 25.5, t));
    cupColdTint = coldProg;
    cupIcicles = easeOutCubic(invLerp(23.0, 25.2, t));
    cupBandaid = 1;
    const shrink = lerp(1, 0.72, coldProg);
    cupScaleX = lerp(1, 0.84, coldProg);
    cupScaleY = shrink;
    if (t >= 22.0 && t <= 26.8) {
      cupX += Math.sin(t * 58) * 5.5 * u;
      cupExpr = 'shiver';
    } else {
      cupExpr = 'grimace';
    }
  } else if (t < 29.5) {
    // Looking up nervously at incoming 10-ton anvil
    cupColdTint = 1;
    cupIcicles = 1;
    cupBandaid = 1;
    cupScaleX = 0.84;
    cupScaleY = 0.72;
    cupExpr = 'lookup';
    cupX += Math.sin(t * 42) * 3.5 * u;
  } else {
    // Flattened pancake!
    cupScaleX = 1;
    cupScaleY = 1;
    if (t < 30.2) {
      const k = invLerp(29.5, 30.2, t);
      cupScaleX = lerp(1.38, 1.0, easeOutCubic(k));
      cupScaleY = lerp(0.55, 1.0, easeOutCubic(k));
    }
    // Final pathetic twitch at 52.6s -> 53.3s
    if (t >= 52.6 && t <= 53.4) {
      const lift = Math.sin(invLerp(52.6, 53.15, t) * Math.PI);
      cupY -= lift * 18 * u;
      cupScaleY = 1 + lift * 0.25;
      cupScaleX = 1 - lift * 0.08;
    }
  }

  // Rigidity meter value & status
  let meterVal = 0;
  let meterStatus = 'WARMING UP';
  let meterTilt = 0;
  if (t < 2.5) {
    meterVal = 15;
    meterStatus = 'SLUMPED';
  } else if (t < 5.6) {
    meterVal = lerp(15, 100, easeOutCubic(invLerp(2.5, 5.6, t)));
    meterStatus = meterVal > 95 ? 'ROCK SOLID' : 'RISING...';
  } else if (t < 15.85) {
    meterVal = 100;
    meterStatus = 'ROCK SOLID';
  } else if (t < 22.0) {
    meterVal = lerp(100, 64, easeOutCubic(invLerp(15.85, 16.5, t)));
    meterStatus = 'DENTED';
  } else if (t < 29.5) {
    meterVal = lerp(64, 26, easeOutCubic(invLerp(22.0, 25.5, t)));
    meterStatus = 'SOGGY';
  } else {
    meterVal = lerp(26, 0, easeOutCubic(invLerp(29.5, 30.0, t)));
    meterStatus = 'TOTALED';
    meterTilt = easeOutBack(invLerp(29.5, 30.4, t)) * 0.28;
  }

  // =========================================================================
  // RENDER SCENE (ALL OVER TRANSPARENT GLASS)
  // =========================================================================
  c.save();
  c.globalAlpha = exitFade;
  c.translate(shake.x, shake.y);

  // 1. Subtle ground contact shadow + spilled jazz-slush puddle
  c.save();
  c.fillStyle = 'rgba(12, 10, 24, 0.36)';
  c.beginPath();
  c.ellipse(stageX, stageY + 6 * u, 95 * u, 16 * u, 0, 0, Math.PI * 2);
  c.fill();

  if (puddle.r > 2) {
    const pGrad = c.createRadialGradient(
      stageX,
      stageY + 6 * u,
      Math.min(4 * u, puddle.r * 0.2),
      stageX,
      stageY + 6 * u,
      puddle.r
    );
    pGrad.addColorStop(0, 'rgba(108, 43, 217, 0.72)');
    pGrad.addColorStop(0.65, 'rgba(0, 194, 184, 0.65)');
    pGrad.addColorStop(1, 'rgba(0, 194, 184, 0.0)');
    c.fillStyle = pGrad;
    c.beginPath();
    c.ellipse(stageX, stageY + 8 * u, puddle.r, puddle.r * 0.22, 0, 0, Math.PI * 2);
    c.fill();
  }

  // Expanding anvil drop shadow (27.8s -> 29.5s)
  if (t >= 27.7 && t < 29.55) {
    const sk = easeInCubic(invLerp(27.7, 29.5, t));
    c.fillStyle = `rgba(10, 10, 18, ${0.15 + sk * 0.55})`;
    c.beginPath();
    c.ellipse(stageX, stageY + 4 * u, (35 + sk * 105) * u, (8 + sk * 20) * u, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // 2. Rigidity Meter on the right side (fades in at 2.2s, exits before trombone at 45.8s)
  const meterAlpha =
    easeOutCubic(invLerp(2.2, 3.0, t)) * (1 - easeInCubic(invLerp(45.2, 46.2, t)));
  drawRigidityMeter(
    c,
    stageX + 215 * u,
    stageY - 12 * u,
    meterVal,
    meterStatus,
    meterTilt,
    meterAlpha,
    accent
  );

  // 3. The Hero Dixie Cup
  drawDixieCup(c, {
    cx: cupX,
    baseY: cupY,
    scaleX: cupScaleX,
    scaleY: cupScaleY,
    rot: cupRot,
    dented: cupDented,
    bandaid: cupBandaid,
    coldTint: cupColdTint,
    icicles: cupIcicles,
    crushed: cupCrushed,
    flexing: cupFlex,
    expression: cupExpr,
    t,
    accent,
  });

  // 4. Smoke puffs
  for (const sm of smokePuffs) {
    const k = sm.life / sm.maxLife;
    const rad = lerp(sm.r, sm.maxR, easeOutCubic(k));
    c.save();
    c.globalAlpha = (1 - k) * 0.65 * exitFade;
    if (sm.ring) {
      c.strokeStyle = '#e5e7eb';
      c.lineWidth = 4 * u * (1 - k * 0.5);
      c.beginPath();
      c.ellipse(sm.x, sm.y, rad, rad * 0.45, 0, 0, Math.PI * 2);
      c.stroke();
    } else {
      c.fillStyle = '#d1d5db';
      c.beginPath();
      c.arc(sm.x, sm.y, rad, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // 5. Wrecking ball (13.6s -> 18.6s)
  if (t >= 13.6 && t <= 18.6) {
    const pivotX = stageX + 190 * u;
    const pivotY = -40 * u;
    const chainLen = Math.hypot(stageX + 54 * u - pivotX, stageY - 120 * u - pivotY);
    let ang = 1.45;
    if (t < 15.85) {
      // Swing down from top-right to slam the cup
      const k = easeInCubic(invLerp(13.8, 15.85, t));
      ang = lerp(1.45, -0.34, k);
    } else {
      // Bounce back out to top-right
      const k = easeOutCubic(invLerp(15.85, 18.5, t));
      ang = lerp(-0.34, 1.55, k);
    }
    drawWreckingBall(c, pivotX, pivotY, ang, chainLen);
  }

  // 6. Cold Shower Cloud & Precipitation (20.4s -> 27.6s)
  if (rainDrops.length > 0) {
    c.save();
    c.strokeStyle = '#7ce8ff';
    c.lineWidth = 3 * u;
    c.lineCap = 'round';
    for (const r of rainDrops) {
      c.beginPath();
      c.moveTo(r.x, r.y);
      c.lineTo(r.x - 3 * u, r.y + r.len);
      c.stroke();
    }
    c.restore();
  }

  for (const ic of iceCubes) {
    c.save();
    c.translate(ic.x, ic.y);
    c.rotate(ic.rot);
    c.fillStyle = 'rgba(180, 245, 255, 0.88)';
    c.strokeStyle = '#1f6e94';
    c.lineWidth = 2.5 * u;
    roundRectPath(c, -ic.size * 0.5, -ic.size * 0.5, ic.size, ic.size, 3 * u);
    c.fill();
    c.stroke();
    c.restore();
  }

  if (t >= 20.4 && t <= 27.7) {
    let cloudX = stageX;
    let cloudAlpha = 1;
    if (t < 21.8) {
      cloudX = lerp(W + 160 * u, stageX, easeOutCubic(invLerp(20.4, 21.8, t)));
    } else if (t > 26.3) {
      cloudX = lerp(stageX, -180 * u, easeInCubic(invLerp(26.3, 27.6, t)));
      cloudAlpha = 1 - invLerp(26.8, 27.6, t);
    }
    drawColdCloud(c, cloudX, stageY - 325 * u, cloudAlpha, t);
  }

  // 7. 10-Ton Anvil (28.9s -> 33.8s)
  if (t >= 28.9 && t <= 33.8) {
    let anvilX = stageX;
    let anvilY = -120 * u;
    let anvilRot = 0;
    let anvilAlpha = 1;
    if (t < 29.5) {
      const k = easeInCubic(invLerp(28.9, 29.5, t));
      anvilY = lerp(-140 * u, stageY - 22 * u, k);
    } else if (t < 32.2) {
      // Sitting triumphantly on top of the flattened cup
      const bounce = Math.exp(-(t - 29.5) * 9) * Math.abs(Math.sin((t - 29.5) * 18)) * 18 * u;
      anvilY = stageY - 22 * u - bounce;
    } else {
      // Hops off to the left to reveal the wreckage
      const k = invLerp(32.2, 33.7, t);
      anvilX = lerp(stageX, stageX - 380 * u, easeInCubic(k));
      anvilY = stageY - 22 * u - Math.sin(k * Math.PI) * 130 * u;
      anvilRot = -k * 0.7;
      anvilAlpha = 1 - invLerp(33.1, 33.7, t);
    }
    drawAnvil(c, anvilX, anvilY, anvilRot, anvilAlpha);
  }

  // 8. Splashes, paper scraps, sparkles
  for (const p of particles) {
    const k = p.life / p.maxLife;
    c.save();
    c.globalAlpha = (1 - k) * exitFade;
    if (p.kind === 'star') {
      drawFourPointStar(c, p.x, p.y, p.size * (1 - k * 0.3), p.color, p.rot);
    } else {
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size * (1 - k * 0.4), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  for (const s of paperScraps) {
    const k = s.life / s.maxLife;
    c.save();
    c.globalAlpha = (1 - k) * exitFade;
    c.translate(s.x, s.y);
    c.rotate(s.rot);
    c.fillStyle = s.color;
    c.strokeStyle = '#1b1826';
    c.lineWidth = 2 * u;
    c.fillRect(-s.w * 0.5, -s.h * 0.5, s.w, s.h);
    c.strokeRect(-s.w * 0.5, -s.h * 0.5, s.w, s.h);
    c.restore();
  }

  for (const sp of sparkles) {
    const k = sp.life / sp.maxLife;
    const pop = Math.sin(k * Math.PI);
    drawFourPointStar(c, sp.x, sp.y, sp.size * pop, sp.color, sp.rot + k * 1.4);
  }

  // 9. Comic Impact Bursts
  if (t >= 15.85 && t <= 17.2) {
    const k = invLerp(15.85, 17.2, t);
    const rad = lerp(55, 92, easeOutBack(Math.min(1, k * 3))) * u;
    drawComicBurst(c, stageX + 68 * u, stageY - 150 * u, rad, 'CRUNCH!', '#ffd24c', '#ef233c', 1 - invLerp(0.65, 1, k));
  }
  if (t >= 29.5 && t <= 31.3) {
    const k = invLerp(29.5, 31.3, t);
    const rad = lerp(70, 128, easeOutBack(Math.min(1, k * 3))) * u;
    drawComicBurst(c, stageX, stageY - 125 * u, rad, 'WRECKED!!', accent, '#ffffff', 1 - invLerp(0.65, 1, k));
  }

  // 10. Giant Red Rubber Stamp (36.2s -> end)
  if (t >= 36.2) {
    const sk = easeOutBack(invLerp(36.2, 36.55, t));
    const stampScale = lerp(2.1, 1.0, clamp(sk, 0, 1.15));
    drawRedStamp(c, stageX, stageY - 76 * u, stampScale, 1);
  }

  // 11. Speech Bubbles
  if (t >= 5.0 && t <= 9.4) {
    const a = easeOutCubic(invLerp(5.0, 5.4, t)) * (1 - invLerp(8.9, 9.4, t));
    drawSpeechBubble(c, stageX + 86 * u, stageY - 226 * u, 'STANDS TALL. STANDS PROUD.', a, accent);
  } else if (t >= 9.7 && t <= 12.6) {
    const a = easeOutCubic(invLerp(9.7, 10.1, t)) * (1 - invLerp(12.2, 12.6, t));
    drawSpeechBubble(c, stageX + 86 * u, stageY - 226 * u, 'ABSOLUTELY UNBREAKABLE.', a, '#00d9c8');
  } else if (t >= 17.8 && t <= 20.4) {
    const a = easeOutCubic(invLerp(17.8, 18.2, t)) * (1 - invLerp(20.0, 20.4, t));
    drawSpeechBubble(c, stageX + 84 * u, stageY - 222 * u, 'TIS BUT A SCRATCH!', a, '#ffd24c');
  } else if (t >= 23.0 && t <= 26.8) {
    const a = easeOutCubic(invLerp(23.0, 23.4, t)) * (1 - invLerp(26.3, 26.8, t));
    drawSpeechBubble(
      c,
      stageX + 86 * u,
      stageY - 196 * u,
      "IT'S JUST COLD IN HERE!!",
      a,
      '#6ee7ff',
      Math.sin(t * 50) * 3 * u
    );
  }

  // 12. Hazard Warning Pill (12.2s -> 15.6s, gentle <2Hz pulse)
  if (t >= 12.2 && t <= 15.6) {
    const a = easeOutCubic(invLerp(12.2, 12.6, t)) * (1 - invLerp(15.2, 15.6, t));
    const pulse = 0.72 + 0.28 * Math.sin((t - 12.2) * Math.PI * 2.5);
    c.save();
    c.globalAlpha = a * pulse * exitFade;
    const pw = 360 * u;
    const ph = 42 * u;
    const px = stageX - pw * 0.5;
    const py = H * 0.12;
    c.fillStyle = '#ffd24c';
    c.strokeStyle = '#1b1826';
    c.lineWidth = 4 * u;
    roundRectPath(c, px, py, pw, ph, 10 * u);
    c.fill();
    c.stroke();
    c.font = `900 ${Math.round(18 * u)}px "Arial Black", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#1b1826';
    c.fillText('! STRUCTURAL HAZARD INCOMING !', stageX, py + ph * 0.5 + 1 * u);
    c.restore();
  }

  // 13. Sad Brass Trombone (46.2s -> end) & Insurance Scorecard (47.5s -> end)
  if (t >= 46.2) {
    const tbIn = easeOutBack(invLerp(46.2, 47.0, t));
    const tbX = lerp(W + 170 * u, stageX + 265 * u, tbIn);
    const tbY = stageY - 150 * u;

    // Slide extends further on each of the 4 descending notes
    let slideExt = 0;
    let bellPuff = 0;
    if (t >= 47.0 && t < 47.65) {
      slideExt = 0.2;
      bellPuff = Math.sin(invLerp(47.0, 47.65, t) * Math.PI);
    } else if (t >= 47.65 && t < 48.3) {
      slideExt = 0.45;
      bellPuff = Math.sin(invLerp(47.65, 48.3, t) * Math.PI);
    } else if (t >= 48.3 && t < 48.95) {
      slideExt = 0.72;
      bellPuff = Math.sin(invLerp(48.3, 48.95, t) * Math.PI);
    } else if (t >= 48.95 && t < 50.6) {
      slideExt = 0.96 + Math.sin(t * 24) * 0.05;
      bellPuff = 0.7 * (1 - invLerp(49.9, 50.6, t));
    } else if (t >= 50.6) {
      slideExt = 0.92;
    }

    drawTrombone(c, tbX, tbY, slideExt, bellPuff, 1);
  }

  // Floating musical notes from trombone
  for (const n of notes) {
    const k = n.life / n.maxLife;
    c.save();
    c.globalAlpha = (1 - k) * exitFade;
    c.font = `900 ${Math.round(n.size)}px Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 4 * u;
    c.strokeStyle = '#1b1826';
    c.strokeText(n.glyph, n.x, n.y);
    c.fillStyle = n.color;
    c.fillText(n.glyph, n.x, n.y);
    c.restore();
  }

  // Deadpan Insurance Scorecard on the left (47.5s -> end)
  if (t >= 47.5) {
    const scIn = easeOutBack(invLerp(47.5, 48.2, t));
    const scX = lerp(-180 * u, stageX - 245 * u, scIn);
    drawScorecard(c, scX, stageY - 145 * u, 1, accent);
  }

  // 14. Bottom Nameplate Ribbon & Punchline Sub-card
  if (t >= 3.6) {
    const bannerAlpha = easeOutCubic(invLerp(3.6, 4.3, t));
    let titleText = 'MY DIXIE';
    let subText = '';
    let glow = 0;

    if (t >= 38.8) {
      titleText = 'MY DIXIE WRECKED.';
      glow = 1;
    }
    if (t >= 42.2) {
      subText = '...WAIT. SAY THAT OUT LOUD, CHAT.';
    }

    drawRibbonBanner(c, stageX, stageY + 56 * u, titleText, subText, glow, bannerAlpha, accent);
  }

  c.restore();
}

export function dispose() {
  particles = [];
  rainDrops = [];
  iceCubes = [];
  smokePuffs = [];
  paperScraps = [];
  notes = [];
  sparkles = [];
  cues = {};
}
