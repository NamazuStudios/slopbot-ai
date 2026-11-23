// Pink Kitten Requiem — transparent-glass overlay for SavorySailor's live shot.
// A small pink kitten appears, meows, then commits fully to a haunting ballad
// while dancing and weeping at the same time. Nothing here paints a background.

export const meta = {
  title: 'Pink Kitten Requiem',
  author: 'blembily',
  prompt: 'a pink kitten appears and meows cutely before it bursts into a haunting and melodramatic song, dancing and crying simultaneously',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;

let S = null;

const FUR = {
  fur: '#ffb8d1',
  furLight: '#ffd6e4',
  dark: '#a8446d',
  stripe: '#ff96b8',
  inner: '#ff7ea8',
  eye: '#3b1f33',
  nose: '#ff6d97',
  mouth: '#5e1f35',
  tongue: '#ff8fae',
};

const VERSE = [440, 523.25, 659.25, 587.33, 523.25, 440, 392, 440, 523.25, 659.25, 698.46, 659.25];
const BASS = [110, 98, 87.31, 82.41];
const HIGH = [659.25, 880, 987.77, 1174.66, 1318.51, 1174.66, 987.77, 880];

const LYRICS = [
  { at: 4.7, main: 'i was small... i was pink...', sub: 'and then the moon asked me to sing' },
  { at: 7.3, main: 'every note i hit is wet', sub: 'i have made peace with this' },
  { at: 9.9, main: 'i dance because i weep', sub: 'i weep because i dance' },
  { at: 12.5, main: 'the tears are part of the choreography', sub: 'please do not offer me a towel' },
  { at: 15.3, main: 'SAVORYSAILOR... weep with me', sub: 'the ballad does not care about your face' },
  { at: 19.3, main: '*a very small sob*', sub: 'thank you for coming to my recital' },
];

const CUES = [
  [0.15, 'poof'],
  [0.55, 'mewA'],
  [1.45, 'mewB'],
  [2.35, 'mewC'],
  [3.35, 'shift'],
  [4.5, 'songOn'],
  [15.2, 'climax'],
  [19.25, 'collapse'],
  [20.35, 'sob'],
];

function tone(ctx, f, ms) {
  try { ctx.sound.beep(f, ms); } catch (e) {}
}
function hit(ctx, ms) {
  try { ctx.sound.noise(ms); } catch (e) {}
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function lerp(a, b, p) { return a + (b - a) * p; }
function easeOutBack(p) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
}

function roundRect(g, x, y, w, h, rad) {
  const r0 = Math.min(rad, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r0, y);
  g.lineTo(x + w - r0, y);
  g.arcTo(x + w, y, x + w, y + r0, r0);
  g.lineTo(x + w, y + h - r0);
  g.arcTo(x + w, y + h, x + w - r0, y + h, r0);
  g.lineTo(x + r0, y + h);
  g.arcTo(x, y + h, x, y + h - r0, r0);
  g.lineTo(x, y + r0);
  g.arcTo(x, y, x + r0, y, r0);
  g.closePath();
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const base = Math.min(W, H);

  let rect = null;
  if (ctx.streamer) {
    rect = {
      x: ctx.streamer.x * W,
      y: ctx.streamer.y * H,
      w: ctx.streamer.w * W,
      h: ctx.streamer.h * H,
    };
  }

  // Keep the kitten out of the live camera's face: park her at the bottom
  // corner furthest from the streamer rect.
  let kx = W * 0.5;
  if (rect) {
    const rcx = rect.x + rect.w / 2;
    kx = rcx > W / 2 ? W * 0.17 : W * 0.83;
  }
  const ky = H * 0.87;

  const u = base * 0.105;

  S = {
    W, H, base, rect, u,
    kitten: { x: kx, y: ky, u },
    tears: [],
    rain: [],
    notes: [],
    sparks: [],
    puddle: 0,
    tearAcc: 0,
    rainAcc: 0,
    noteAcc: 0,
    cueIdx: 0,
    verseBeat: -1,
    climaxBeat: -1,
    lastClimaxSpark: 0,
    done: false,
    endT: 21.35,
    captionSize: Math.max(15, Math.min(W * 0.038, 44)),
    mbSize: Math.max(12, Math.min(W * 0.016, 20)),
  };
}

function spawnSpark(ctx, x, y, n, spread, speed, col) {
  for (let i = 0; i < n; i++) {
    const a = ctx.rand() * TAU;
    const sp = speed * (0.35 + ctx.rand());
    S.sparks.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      r: spread * (0.4 + ctx.rand() * 0.8),
      life: 0,
      max: 0.6 + ctx.rand() * 0.7,
      col: col || (ctx.rand() < 0.5 ? '#ffd0e0' : '#ffe9ef'),
    });
  }
}

function spawnTear(ctx, up, sideHint) {
  const k = S.kitten;
  const u = k.u;
  const side = sideHint || (ctx.rand() < 0.5 ? -1 : 1);
  S.tears.push({
    x: k.x + side * u * 0.145 + (ctx.rand() - 0.5) * u * 0.04,
    y: k.y - u * 0.275,
    vx: side * (0.15 + ctx.rand() * 0.7) * u,
    vy: (up ? -0.55 - ctx.rand() * 0.75 : 0.15) * u,
    r: u * (0.024 + ctx.rand() * 0.03),
    life: 0,
    max: 1.1 + ctx.rand() * 1.5,
    col: ctx.rand() < 0.5 ? 'rgba(190,236,255,0.92)' : 'rgba(224,247,255,0.92)',
  });
}

function spawnNote(ctx) {
  const k = S.kitten;
  const u = k.u;
  S.notes.push({
    x: k.x + (ctx.rand() - 0.5) * u * 0.5,
    y: k.y - u * 0.45,
    vx: (ctx.rand() - 0.5) * u * 0.9,
    vy: -u * (0.5 + ctx.rand() * 0.7),
    life: 0,
    max: 1.6 + ctx.rand() * 1.2,
    rot: (ctx.rand() - 0.5) * 0.6,
    glyph: ['\u266a', '\u266b', '\u2669'][Math.floor(ctx.rand() * 3)],
    size: u * (0.14 + ctx.rand() * 0.1),
  });
}

function drawSpark(g, p, alpha) {
  const a = Math.max(0, 1 - p.life / p.max) * alpha;
  g.globalAlpha = a;
  g.fillStyle = p.col;
  g.beginPath();
  g.arc(p.x, p.y, p.r, 0, TAU);
  g.fill();
}

function drawKitten(g, t, alpha) {
  const k = S.kitten;
  const u = k.u;
  const sing = t >= 4.5 && t < 19.25;
  const climax = t >= 15.2 && t < 19.25;
  const collapsed = t >= 19.25;
  const sob = t >= 20.35;

  const pop = clamp01((t - 0.15) / 0.5);
  const popScale = t < 0.15 ? 0 : Math.max(0.001, easeOutBack(pop));

  let bob = Math.sin(t * 2.2) * u * 0.018;
  if (sing) bob = Math.sin(t * 6.0) * u * 0.05 + Math.abs(Math.sin(t * 3.0)) * u * 0.028;
  if (climax) bob -= Math.sin(clamp01((t - 15.2) / 1.2) * Math.PI) * u * 0.16;

  let rot = Math.sin(t * 1.3) * 0.035;
  if (sing) rot = Math.sin(t * 2.7) * 0.13;
  if (climax) rot = clamp01((t - 15.2) / 1.25) * TAU + Math.sin(t * 8) * 0.08;
  if (collapsed) {
    rot = lerp(0, 1.25, clamp01((t - 19.25) / 0.55));
    rot += Math.sin(t * 24) * 0.02 * Math.max(0, 1 - (t - 19.25) * 1.2);
  }

  let sx = 1;
  let sy = 1;
  if (collapsed) {
    const q = clamp01((t - 19.25) / 0.45);
    sy = 1 - 0.3 * q;
    sx = 1 + 0.16 * q;
  }
  if (sob) {
    sy += Math.sin(t * 22) * 0.02;
    sx -= Math.sin(t * 22) * 0.015;
  }

  const gx = k.x;
  const gy = k.y + bob;

  // ground shadow
  g.save();
  g.globalAlpha = 0.3 * alpha;
  g.fillStyle = 'rgba(10,6,26,0.6)';
  g.beginPath();
  g.ellipse(gx, k.y + u * 0.62, u * 0.45, u * 0.1, 0, 0, TAU);
  g.fill();
  g.restore();

  g.save();
  g.translate(gx, gy);
  g.rotate(rot);
  g.scale(sx * popScale, sy * popScale);
  g.globalAlpha = alpha;

  // ---- tail ----
  const tw = Math.sin(t * (sing ? 6.5 : 2.4)) * u * 0.22;
  g.strokeStyle = FUR.dark;
  g.lineWidth = u * 0.15;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(u * 0.32, u * 0.2);
  g.quadraticCurveTo(u * 0.72, u * 0.2 + tw, u * 0.66, -u * 0.22 + tw * 0.5);
  g.stroke();
  g.strokeStyle = FUR.fur;
  g.lineWidth = u * 0.1;
  g.beginPath();
  g.moveTo(u * 0.32, u * 0.2);
  g.quadraticCurveTo(u * 0.72, u * 0.2 + tw, u * 0.66, -u * 0.22 + tw * 0.5);
  g.stroke();

  // ---- body ----
  g.fillStyle = FUR.fur;
  g.strokeStyle = FUR.dark;
  g.lineWidth = u * 0.045;
  g.beginPath();
  g.ellipse(0, u * 0.2, u * 0.42, u * 0.35, 0, 0, TAU);
  g.fill();
  g.stroke();

  // chest patch
  g.fillStyle = FUR.furLight;
  g.beginPath();
  g.ellipse(0, u * 0.2, u * 0.2, u * 0.2, 0, 0, TAU);
  g.fill();

  // ---- arms / paws ----
  const waveL = sing ? Math.sin(t * 7.0) * 0.55 - 0.4 : 0;
  const waveR = sing ? Math.sin(t * 7.0 + Math.PI) * 0.55 - 0.4 : 0;
  const armY = sing ? -u * 0.05 : u * 0.32;
  const arms = [
    { sx: -1, ang: waveL },
    { sx: 1, ang: waveR },
  ];
  for (const a of arms) {
    g.save();
    g.translate(a.sx * u * 0.36, armY);
    g.rotate(a.sx * (sing ? 0.9 + a.ang : 0.25));
    g.strokeStyle = FUR.dark;
    g.lineWidth = u * 0.12;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(a.sx * u * 0.18, u * 0.16);
    g.stroke();
    g.fillStyle = FUR.fur;
    g.strokeStyle = FUR.dark;
    g.lineWidth = u * 0.035;
    g.beginPath();
    g.ellipse(a.sx * u * 0.18, u * 0.18, u * 0.1, u * 0.085, 0, 0, TAU);
    g.fill();
    g.stroke();
    g.restore();
  }

  // ---- ears ----
  g.fillStyle = FUR.fur;
  g.strokeStyle = FUR.dark;
  g.lineWidth = u * 0.045;
  for (const s of [-1, 1]) {
    g.beginPath();
    g.moveTo(s * u * 0.3, -u * 0.42);
    g.lineTo(s * u * 0.25, -u * 0.74);
    g.lineTo(s * u * 0.03, -u * 0.5);
    g.closePath();
    g.fill();
    g.stroke();
    g.fillStyle = FUR.inner;
    g.beginPath();
    g.moveTo(s * u * 0.27, -u * 0.46);
    g.lineTo(s * u * 0.24, -u * 0.66);
    g.lineTo(s * u * 0.11, -u * 0.51);
    g.closePath();
    g.fill();
    g.fillStyle = FUR.fur;
  }

  // ---- head ----
  g.fillStyle = FUR.fur;
  g.strokeStyle = FUR.dark;
  g.lineWidth = u * 0.045;
  g.beginPath();
  g.ellipse(0, -u * 0.27, u * 0.37, u * 0.32, 0, 0, TAU);
  g.fill();
  g.stroke();

  // forehead tuft stripes
  g.strokeStyle = FUR.stripe;
  g.lineWidth = u * 0.04;
  g.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(i * u * 0.11, -u * 0.53);
    g.lineTo(i * u * 0.12, -u * 0.44);
    g.stroke();
  }

  // ---- blush ----
  g.fillStyle = 'rgba(255,110,150,0.5)';
  g.beginPath();
  g.ellipse(-u * 0.26, -u * 0.14, u * 0.07, u * 0.04, 0, 0, TAU);
  g.ellipse(u * 0.26, -u * 0.14, u * 0.07, u * 0.04, 0, 0, TAU);
  g.fill();

  // ---- eyes ----
  g.strokeStyle = FUR.eye;
  g.lineWidth = u * 0.045;
  g.lineCap = 'round';
  const blinking = !sing && Math.sin(t * 1.6 + 1.1) > 0.96;
  if (!sing && !blinking) {
    // huge pleading kitten eyes
    g.fillStyle = FUR.eye;
    g.beginPath();
    g.ellipse(-u * 0.14, -u * 0.28, u * 0.068, u * 0.088, 0, 0, TAU);
    g.ellipse(u * 0.14, -u * 0.28, u * 0.068, u * 0.088, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    g.arc(-u * 0.165, -u * 0.31, u * 0.023, 0, TAU);
    g.arc(u * 0.115, -u * 0.31, u * 0.023, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,160,200,0.8)';
    g.beginPath();
    g.arc(-u * 0.115, -u * 0.255, u * 0.012, 0, TAU);
    g.arc(u * 0.165, -u * 0.255, u * 0.012, 0, TAU);
    g.fill();
  } else if (sob || collapsed) {
    // squeezed shut, sobbing
    g.beginPath();
    g.moveTo(-u * 0.2, -u * 0.27);
    g.lineTo(-u * 0.14, -u * 0.31);
    g.lineTo(-u * 0.08, -u * 0.27);
    g.moveTo(u * 0.08, -u * 0.27);
    g.lineTo(u * 0.14, -u * 0.31);
    g.lineTo(u * 0.2, -u * 0.27);
    g.stroke();
  } else {
    // tragic closed singing eyes
    g.beginPath();
    g.arc(-u * 0.14, -u * 0.265, u * 0.07, Math.PI * 1.15, Math.PI * 1.85);
    g.arc(u * 0.14, -u * 0.265, u * 0.07, Math.PI * 1.15, Math.PI * 1.85);
    g.stroke();
  }

  // ---- tear streams on the face ----
  if (sing || sob) {
    const flow = sing ? 1 : 0.5;
    g.strokeStyle = 'rgba(200,242,255,0.75)';
    g.lineWidth = u * 0.028;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * u * 0.145, -u * 0.24);
      g.bezierCurveTo(
        s * u * 0.18, -u * 0.16,
        s * u * 0.13, -u * 0.08,
        s * u * 0.155, u * 0.02 + Math.sin(t * 12 + s) * u * 0.02
      );
      g.stroke();
      g.fillStyle = 'rgba(214,246,255,0.85)';
      g.beginPath();
      g.arc(s * u * 0.155, u * 0.02 + Math.sin(t * 12 + s) * u * 0.02, u * 0.028 * flow, 0, TAU);
      g.fill();
    }
  }

  // ---- nose + mouth ----
  g.fillStyle = FUR.nose;
  g.beginPath();
  g.moveTo(0, -u * 0.16);
  g.lineTo(-u * 0.033, -u * 0.125);
  g.lineTo(u * 0.033, -u * 0.125);
  g.closePath();
  g.fill();

  if (sing) {
    const open = climax ? 1.35 : 1;
    g.fillStyle = FUR.mouth;
    g.beginPath();
    g.ellipse(0, -u * 0.05, u * 0.075 * open, u * 0.11 * open, 0, 0, TAU);
    g.fill();
    g.fillStyle = FUR.tongue;
    g.beginPath();
    g.ellipse(0, -u * 0.015, u * 0.05 * open, u * 0.045 * open, 0, 0, TAU);
    g.fill();
  } else if (sob) {
    g.strokeStyle = 'rgba(60,25,45,0.9)';
    g.lineWidth = u * 0.028;
    g.beginPath();
    g.ellipse(0, -u * 0.07, u * 0.055, u * 0.045 + Math.abs(Math.sin(t * 16)) * u * 0.02, 0, 0, TAU);
    g.stroke();
  } else {
    g.strokeStyle = 'rgba(60,25,45,0.85)';
    g.lineWidth = u * 0.028;
    g.beginPath();
    g.arc(-u * 0.045, -u * 0.09, u * 0.048, 0, Math.PI * 0.9);
    g.moveTo(u * 0.093, -u * 0.09);
    g.arc(u * 0.045, -u * 0.09, u * 0.048, Math.PI * 0.1, Math.PI, true);
    g.stroke();
  }

  // whiskers
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = u * 0.014;
  for (const s of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.moveTo(s * u * 0.2, -u * 0.15 + i * u * 0.055);
      g.lineTo(s * u * (0.46 + i * 0.03), -u * 0.19 + i * u * 0.12);
      g.stroke();
    }
  }

  g.restore();
}

function drawPuddle(g, alpha) {
  const k = S.kitten;
  const u = k.u;
  if (S.puddle <= 0.01) return;
  const w = u * (0.3 + Math.min(1.5, S.puddle));
  g.save();
  g.globalAlpha = 0.32 * alpha;
  g.fillStyle = 'rgba(150,222,255,0.7)';
  g.beginPath();
  g.ellipse(k.x, k.y + u * 0.63, w, u * 0.1, 0, 0, TAU);
  g.fill();
  g.globalAlpha = 0.5 * alpha;
  g.strokeStyle = 'rgba(220,248,255,0.7)';
  g.lineWidth = Math.max(1, u * 0.012);
  g.beginPath();
  g.ellipse(k.x, k.y + u * 0.63, w * 0.82, u * 0.075, 0, 0, TAU);
  g.stroke();
  g.restore();
}

function drawSpotlight(g, t) {
  const k = S.kitten;
  const u = k.u;
  const songAmt = clamp01((t - 3.35) / 0.9);
  if (songAmt <= 0) return;
  const cx = k.x;
  const cy = k.y;

  g.save();
  g.globalAlpha = 0.5 * songAmt;
  const grad = g.createRadialGradient(cx, cy - u * 0.2, u * 0.15, cx, cy - u * 0.2, u * 2.3);
  grad.addColorStop(0, 'rgba(255,205,235,0.32)');
  grad.addColorStop(0.55, 'rgba(210,160,255,0.12)');
  grad.addColorStop(1, 'rgba(120,80,180,0)');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(cx, cy + u * 0.62, u * 2.5, u * 0.95, 0, 0, TAU);
  g.fill();

  // a cone of stage light from above, translucent only
  const cone = g.createLinearGradient(cx, 0, cx, cy);
  cone.addColorStop(0, 'rgba(255,220,245,0.09)');
  cone.addColorStop(1, 'rgba(255,220,245,0)');
  g.globalAlpha = songAmt;
  g.fillStyle = cone;
  g.beginPath();
  g.moveTo(cx - u * 0.45, 0);
  g.lineTo(cx + u * 0.45, 0);
  g.lineTo(cx + u * 1.5, cy + u * 0.6);
  g.lineTo(cx - u * 1.5, cy + u * 0.6);
  g.closePath();
  g.fill();
  g.restore();
}

function drawRays(g, t) {
  const climax = t >= 15.2 && t < 19.6;
  if (!climax) return;
  const amt = clamp01((t - 15.2) / 0.5) * (1 - clamp01((t - 19.25) / 0.35));
  if (amt <= 0) return;
  const rect = S.rect;
  const cx = rect ? rect.x + rect.w / 2 : S.W / 2;
  const cy = rect ? rect.y + rect.h / 2 : S.H * 0.4;
  const rad = rect ? Math.max(rect.w, rect.h) * 0.9 : S.base * 0.55;

  g.save();
  g.translate(cx, cy);
  g.rotate(t * 0.3);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.15;
    g.save();
    g.rotate(a);
    g.globalAlpha = 0.11 * amt * (0.55 + 0.45 * Math.sin(t * 3 + i));
    g.fillStyle = i % 2 === 0 ? '#ffd6e8' : '#c9b3ff';
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(rad, -S.base * 0.035);
    g.lineTo(rad, S.base * 0.035);
    g.closePath();
    g.fill();
    g.restore();
  }
  g.restore();
}

function drawCaption(g, t, alpha) {
  let main = '';
  let sub = '';
  let serif = true;
  let a = 0;

  if (t >= 0.9 && t < 3.45) {
    main = 'a pink kitten appears';
    sub = 'and immediately begins her emotional arc';
    a = Math.min(1, (t - 0.9) / 0.35) * Math.min(1, (3.45 - t) / 0.4);
    serif = false;
  } else {
    for (let i = 0; i < LYRICS.length; i++) {
      const L = LYRICS[i];
      const next = i + 1 < LYRICS.length ? LYRICS[i + 1].at : 21.0;
      if (t >= L.at && t < next) {
        main = L.main;
        sub = L.sub;
        a = Math.min(1, (t - L.at) / 0.36) * Math.min(1, Math.max(0, (next - t) / 0.42));
      }
    }
  }

  if (!main || a <= 0.01) return;

  const size = S.captionSize;
  const cx = S.W / 2;
  const yMain = Math.max(size * 2.2, S.H * 0.1);
  g.save();
  g.globalAlpha = a * alpha;
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const font = serif
    ? `italic 600 ${size}px Georgia, 'Times New Roman', serif`
    : `800 ${size * 0.92}px ui-rounded, 'Segoe UI', system-ui, sans-serif`;
  g.font = font;
  const wMain = g.measureText(main).width;
  const boxW = Math.min(S.W * 0.94, wMain + size * 2.0);
  const boxH = size * 2.2;

  g.fillStyle = 'rgba(12,8,30,0.6)';
  roundRect(g, cx - boxW / 2, yMain - boxH / 2, boxW, boxH, size * 0.6);
  g.fill();
  g.strokeStyle = serif ? 'rgba(216,180,255,0.5)' : 'rgba(255,157,179,0.6)';
  g.lineWidth = Math.max(1.5, size * 0.05);
  g.stroke();

  g.fillStyle = serif ? '#f5ecff' : '#ffe9ef';
  g.font = font;
  g.fillText(main, cx, yMain - size * 0.28, S.W * 0.9);

  g.font = `500 ${Math.max(11, size * 0.46)}px 'Segoe UI', system-ui, sans-serif`;
  g.fillStyle = serif ? 'rgba(214,196,255,0.9)' : 'rgba(255,196,214,0.92)';
  g.fillText(sub, cx, yMain + size * 0.62, S.W * 0.9);
  g.restore();
}

function runCue(ctx, kind, t) {
  switch (kind) {
    case 'poof': {
      hit(ctx, 150);
      spawnSpark(ctx, S.kitten.x, S.kitten.y - S.u * 0.1, 26, S.u * 0.03, S.u * 2.2);
      break;
    }
    case 'mewA':
      tone(ctx, 760, 150);
      break;
    case 'mewB':
      tone(ctx, 880, 120);
      tone(ctx, 1180, 110);
      break;
    case 'mewC':
      tone(ctx, 700, 110);
      tone(ctx, 1050, 150);
      break;
    case 'shift': {
      hit(ctx, 340);
      tone(ctx, 82, 900);
      break;
    }
    case 'songOn':
      tone(ctx, 110, 320);
      tone(ctx, 220, 300);
      break;
    case 'climax': {
      hit(ctx, 240);
      tone(ctx, 880, 220);
      spawnSpark(ctx, S.kitten.x, S.kitten.y - S.u * 0.4, 30, S.u * 0.035, S.u * 3.2, '#e8d6ff');
      break;
    }
    case 'collapse':
      tone(ctx, 140, 420);
      hit(ctx, 120);
      break;
    case 'sob':
      tone(ctx, 620, 90);
      tone(ctx, 540, 150);
      break;
    default:
      break;
  }
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const { W, H } = S;

  g.clearRect(0, 0, W, H);

  const step = Math.min(dt || 0.016, 1 / 20);
  const fadeOut = t > 20.35 ? Math.max(0, 1 - (t - 20.35) / 0.95) : 1;

  // ---------- cues ----------
  while (S.cueIdx < CUES.length && t >= CUES[S.cueIdx][0]) {
    runCue(ctx, CUES[S.cueIdx][1], t);
    S.cueIdx++;
  }

  // ---------- music ----------
  if (t >= 4.5 && t < 15.15) {
    const b = Math.floor((t - 4.5) / 0.62);
    if (b !== S.verseBeat) {
      S.verseBeat = b;
      tone(ctx, VERSE[b % VERSE.length], 230);
      if (b % 3 === 0) tone(ctx, BASS[Math.floor(b / 3) % BASS.length], 300);
    }
  }
  if (t >= 15.2 && t < 19.2) {
    const b = Math.floor((t - 15.2) / 0.31);
    if (b !== S.climaxBeat) {
      S.climaxBeat = b;
      tone(ctx, HIGH[b % HIGH.length], 150);
      if (b % 2 === 0) hit(ctx, 90);
    }
  }

  const singing = t >= 4.5;
  const climax = t >= 15.2 && t < 19.25;
  const collapsed = t >= 19.25;

  // ---------- ambient stage dressing ----------
  drawSpotlight(g, t);
  drawRays(g, t);

  // ---------- tear physics ----------
  if (singing) {
    S.tearAcc += step * (climax ? 34 : collapsed ? 5 : 17);
    while (S.tearAcc >= 1) {
      S.tearAcc -= 1;
      spawnTear(ctx, climax && ctx.rand() < 0.3);
    }
  }

  if (climax) {
    S.rainAcc += step * 26;
    while (S.rainAcc >= 1) {
      S.rainAcc -= 1;
      S.rain.push({
        x: ctx.rand() * W,
        y: -S.base * 0.05,
        vx: (ctx.rand() - 0.5) * S.base * 0.12,
        vy: S.base * (0.45 + ctx.rand() * 0.5),
        r: S.base * (0.004 + ctx.rand() * 0.008),
        col: ctx.rand() < 0.5 ? 'rgba(190,236,255,0.55)' : 'rgba(232,214,255,0.5)',
      });
    }
  }

  const floorY = S.kitten.y + S.kitten.u * 0.63;
  for (let i = S.tears.length - 1; i >= 0; i--) {
    const p = S.tears[i];
    p.life += step;
    p.vy += S.kitten.u * 7.2 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    if (p.y > floorY) {
      S.puddle = Math.min(1.6, S.puddle + 0.03);
      if (ctx.rand() < 0.35) {
        S.sparks.push({
          x: p.x,
          y: floorY,
          vx: (ctx.rand() - 0.5) * S.kitten.u * 1.6,
          vy: -ctx.rand() * S.kitten.u * 1.4,
          r: S.kitten.u * 0.02,
          life: 0,
          max: 0.35,
          col: '#dff4ff',
        });
      }
      S.tears.splice(i, 1);
      continue;
    }
    if (p.life > p.max) {
      S.tears.splice(i, 1);
      continue;
    }
    const a = Math.max(0, 1 - p.life / p.max);
    g.save();
    g.globalAlpha = a * fadeOut;
    g.fillStyle = p.col;
    g.beginPath();
    g.ellipse(p.x, p.y, p.r * 0.85, p.r * 1.35, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.7)';
    g.beginPath();
    g.arc(p.x - p.r * 0.25, p.y - p.r * 0.35, p.r * 0.25, 0, TAU);
    g.fill();
    g.restore();
  }

  for (let i = S.rain.length - 1; i >= 0; i--) {
    const p = S.rain[i];
    p.x += p.vx * step;
    p.y += p.vy * step;
    if (p.y > H + 20) {
      S.rain.splice(i, 1);
      continue;
    }
    g.save();
    g.globalAlpha = fadeOut * 0.9;
    g.fillStyle = p.col;
    g.beginPath();
    g.ellipse(p.x, p.y, p.r * 0.7, p.r * 2.4, Math.atan2(p.vy, p.vx) + Math.PI / 2, 0, TAU);
    g.fill();
    g.restore();
  }

  // ---------- musical notes ----------
  if (t >= 4.5 && t < 19.0) {
    S.noteAcc += step * (climax ? 5 : 2.2);
    while (S.noteAcc >= 1) {
      S.noteAcc -= 1;
      spawnNote(ctx);
    }
  }
  for (let i = S.notes.length - 1; i >= 0; i--) {
    const p = S.notes[i];
    p.life += step;
    p.x += (p.vx + Math.sin(p.life * 3) * S.kitten.u * 0.2) * step;
    p.y += p.vy * step;
    const a = Math.max(0, 1 - p.life / p.max) * 0.9 * fadeOut;
    if (p.life > p.max) {
      S.notes.splice(i, 1);
      continue;
    }
    g.save();
    g.globalAlpha = a;
    g.translate(p.x, p.y);
    g.rotate(p.rot + Math.sin(p.life * 2) * 0.2);
    g.fillStyle = '#ffe4f0';
    g.font = `${p.size}px Georgia, serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(p.glyph, 0, 0);
    g.restore();
  }

  // ---------- kitten ----------
  drawPuddle(g, fadeOut);
  drawKitten(g, t, fadeOut);

  // ---------- sparks ----------
  for (let i = S.sparks.length - 1; i >= 0; i--) {
    const p = S.sparks[i];
    p.life += step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.vy += S.base * 0.12 * step;
    if (p.life > p.max) {
      S.sparks.splice(i, 1);
      continue;
    }
    drawSpark(g, p, fadeOut);
  }
  g.globalAlpha = 1;

  // ---------- caption ----------
  drawCaption(g, t, fadeOut);

  if (t >= S.endT && !S.done) {
    S.done = true;
    ctx.done();
  }
}

export function dispose(ctx) {
  S = null;
}
