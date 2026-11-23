// Fishy Cat Deposit — transparent overlay cartoon.
// A cat produces a fish and then eats it. The streamer stays visible underneath.

export const meta = {
  title: 'Fishy Cat Deposit',
  author: 'savorysailor',
  prompt: 'I want cat pooping fish and eating it',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const T = {
  strain: 1.8,
  plop: 4.2,
  land: 4.95,
  sniff: 5.3,
  eat: 7.5,
  chew: 8.4,
  burp: 9.3,
  end: 11.0,
};

let S = null;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const smooth = (p) => {
  p = clamp(p, 0, 1);
  return p * p * (3 - 2 * p);
};
const easeOut = (p) => 1 - Math.pow(1 - clamp(p, 0, 1), 3);

const CREAM = '#f6e0bd';
const CREAM_DARK = '#e3c49a';
const INK = '#251c38';
const FISH = '#86e6f2';
const FISH_DARK = '#0f6577';

export function init(ctx) {
  S = {
    fired: {},
    ended: false,
    blinkPhase: ctx.rand() * 6.28,
  };
}

function beep(ctx, freq, ms) {
  if (ctx.sound && typeof ctx.sound.beep === 'function') ctx.sound.beep(freq, ms);
}
function noise(ctx, ms) {
  if (ctx.sound && typeof ctx.sound.noise === 'function') ctx.sound.noise(ms);
}

function sounds(ctx, t) {
  const f = S.fired;
  const once = (key, when, fn) => {
    if (!f[key] && t >= when) {
      f[key] = true;
      fn();
    }
  };
  once('strain', T.strain, () => beep(ctx, 92, 320));
  once('strain2', 3.0, () => beep(ctx, 78, 260));
  once('plop', T.plop, () => {
    noise(ctx, 240);
    beep(ctx, 96, 200);
  });
  once('land', T.land, () => beep(ctx, 430, 90));
  once('sniff1', T.sniff, () => beep(ctx, 680, 60));
  once('sniff2', T.sniff + 0.35, () => beep(ctx, 760, 60));
  once('sniff3', T.sniff + 0.7, () => beep(ctx, 830, 60));
  once('eat', T.eat, () => beep(ctx, 300, 130));
  once('chew1', T.chew, () => {
    beep(ctx, 190, 110);
    noise(ctx, 70);
  });
  once('chew2', T.chew + 0.3, () => beep(ctx, 160, 120));
  once('chew3', T.chew + 0.6, () => beep(ctx, 135, 130));
  once('burp', T.burp, () => beep(ctx, 68, 300));
}

function layout(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const u = Math.min(W, H) * 0.016;
  const pad = 12 * u;
  const r = ctx.streamer;
  const sr = r ? { x: r.x * W, y: r.y * H, w: r.w * W, h: r.h * H } : null;

  const candidates = [
    { x: W * 0.20, y: H * 0.94 },
    { x: W * 0.80, y: H * 0.94 },
    { x: W * 0.20, y: H * 0.99 },
    { x: W * 0.80, y: H * 0.99 },
    { x: W * 0.50, y: H * 0.99 },
  ];

  let chosen = candidates[candidates.length - 1];
  for (const c of candidates) {
    chosen = c;
    if (!sr) break;
    const box = { x: c.x - pad, y: c.y - 16 * u, w: pad * 2, h: 18 * u };
    const hit =
      box.x < sr.x + sr.w && box.x + box.w > sr.x && box.y < sr.y + sr.h && box.y + box.h > sr.y;
    if (!hit) break;
  }
  return { x: chosen.x, y: chosen.y, u };
}

function drawCushion(g, u) {
  g.save();
  g.translate(0, 0.9 * u);
  g.beginPath();
  g.ellipse(0, 0, 10.2 * u, 2.3 * u, 0, 0, Math.PI * 2);
  g.fillStyle = 'rgba(240, 120, 180, 0.85)';
  g.fill();
  g.lineWidth = 0.35 * u;
  g.strokeStyle = INK;
  g.stroke();
  // little tuft seams
  g.beginPath();
  g.moveTo(-6 * u, -0.6 * u);
  g.lineTo(0, 0.7 * u);
  g.lineTo(6 * u, -0.6 * u);
  g.strokeStyle = 'rgba(37,28,56,0.45)';
  g.lineWidth = 0.28 * u;
  g.stroke();
  g.restore();
}

function drawTail(g, u, phase, mood) {
  const sway = Math.sin(phase) * 0.9 * (mood === 'strain' ? 0.35 : 1);
  g.beginPath();
  g.moveTo(-5.6 * u, -3.4 * u);
  g.bezierCurveTo(
    -8.2 * u,
    -3.6 * u,
    -9.6 * u,
    -6.2 * u + sway * u,
    -8.1 * u,
    -7.9 * u + sway * u,
  );
  g.strokeStyle = CREAM;
  g.lineWidth = 1.5 * u;
  g.lineCap = 'round';
  g.stroke();
  g.strokeStyle = INK;
  g.lineWidth = 1.85 * u;
  g.globalAlpha = 0.35;
  g.stroke();
  g.globalAlpha = 1;
  g.strokeStyle = CREAM;
  g.lineWidth = 1.4 * u;
  g.stroke();
}

function drawHead(g, u, hx, hy, tilt, mouth, eyes, mood) {
  g.save();
  g.translate(hx * u, hy * u);
  g.rotate(tilt);

  // ears
  g.fillStyle = CREAM;
  g.strokeStyle = INK;
  g.lineWidth = 0.22 * u;
  const ear = (pts) => {
    g.beginPath();
    g.moveTo(pts[0] * u, pts[1] * u);
    g.lineTo(pts[2] * u, pts[3] * u);
    g.lineTo(pts[4] * u, pts[5] * u);
    g.closePath();
    g.fill();
    g.stroke();
  };
  ear([-2.9, -2.0, -2.4, -4.5, -0.9, -2.6]);
  ear([0.4, -2.9, 1.4, -4.6, 2.5, -2.2]);
  g.fillStyle = '#ff9ecb';
  g.beginPath();
  g.moveTo(-2.5 * u, -2.4 * u);
  g.lineTo(-2.4 * u, -3.7 * u);
  g.lineTo(-1.5 * u, -2.6 * u);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(0.9 * u, -2.8 * u);
  g.lineTo(1.4 * u, -3.9 * u);
  g.lineTo(2.0 * u, -2.4 * u);
  g.closePath();
  g.fill();

  // skull
  g.beginPath();
  g.ellipse(0, 0, 3.3 * u, 3.0 * u, 0, 0, Math.PI * 2);
  g.fillStyle = CREAM;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.26 * u;
  g.stroke();

  // muzzle
  g.beginPath();
  g.ellipse(1.9 * u, 0.9 * u, 1.6 * u, 1.15 * u, 0, 0, Math.PI * 2);
  g.fillStyle = '#fdf1d9';
  g.fill();

  // eyes
  const blink = eyes === 'blink';
  const squint = eyes === 'squint';
  g.fillStyle = INK;
  g.strokeStyle = INK;
  if (blink) {
    g.lineWidth = 0.3 * u;
    g.beginPath();
    g.moveTo(0.4 * u, -0.9 * u);
    g.lineTo(1.3 * u, -0.9 * u);
    g.moveTo(1.8 * u, -1.0 * u);
    g.lineTo(2.6 * u, -1.0 * u);
    g.stroke();
  } else if (squint) {
    g.lineWidth = 0.32 * u;
    g.beginPath();
    g.moveTo(0.3 * u, -0.75 * u);
    g.lineTo(1.35 * u, -0.35 * u);
    g.moveTo(1.75 * u, -0.45 * u);
    g.lineTo(2.7 * u, -0.85 * u);
    g.stroke();
  } else {
    g.beginPath();
    g.ellipse(0.85 * u, -0.85 * u, 0.44 * u, 0.55 * u, 0, 0, Math.PI * 2);
    g.ellipse(2.2 * u, -0.95 * u, 0.42 * u, 0.53 * u, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fff';
    g.beginPath();
    g.arc(0.7 * u, -1.05 * u, 0.15 * u, 0, Math.PI * 2);
    g.arc(2.05 * u, -1.15 * u, 0.14 * u, 0, Math.PI * 2);
    g.fill();
  }

  // nose
  g.fillStyle = '#ff86bd';
  g.beginPath();
  g.moveTo(2.0 * u, 0.45 * u);
  g.lineTo(2.6 * u, 0.45 * u);
  g.lineTo(2.3 * u, 0.95 * u);
  g.closePath();
  g.fill();

  // mouth
  g.strokeStyle = INK;
  g.lineWidth = 0.2 * u;
  if (mouth > 0.02) {
    g.beginPath();
    g.ellipse(2.25 * u, 1.45 * u, 0.55 * u, 0.25 + mouth * 0.75 * u, 0, 0, Math.PI * 2);
    g.fillStyle = '#5b2233';
    g.fill();
    g.stroke();
  } else {
    g.beginPath();
    g.moveTo(1.75 * u, 1.5 * u);
    g.quadraticCurveTo(2.3 * u, 1.85 * u, 2.8 * u, 1.45 * u);
    g.stroke();
  }

  // whiskers
  g.lineWidth = 0.13 * u;
  g.globalAlpha = 0.75;
  g.beginPath();
  g.moveTo(2.4 * u, 0.8 * u);
  g.lineTo(4.3 * u, 0.35 * u);
  g.moveTo(2.4 * u, 1.05 * u);
  g.lineTo(4.35 * u, 1.05 * u);
  g.moveTo(2.4 * u, 1.3 * u);
  g.lineTo(4.2 * u, 1.75 * u);
  g.stroke();
  g.globalAlpha = 1;

  g.restore();
}

function drawFish(g, u, x, y, rot, s, wiggle) {
  g.save();
  g.translate(x * u, y * u);
  g.rotate(rot);
  g.scale(s, s);
  g.beginPath();
  g.ellipse(0, 0, 1.55 * u, 0.78 * u, 0, 0, Math.PI * 2);
  g.fillStyle = FISH;
  g.fill();
  g.strokeStyle = FISH_DARK;
  g.lineWidth = 0.17 * u;
  g.stroke();
  // tail
  g.beginPath();
  const w = Math.sin(wiggle) * 0.22;
  g.moveTo(-1.4 * u, 0);
  g.lineTo(-2.5 * u, (-0.8 + w) * u);
  g.lineTo(-2.2 * u, 0);
  g.lineTo(-2.5 * u, (0.8 + w) * u);
  g.closePath();
  g.fill();
  g.stroke();
  // fin
  g.beginPath();
  g.moveTo(-0.1 * u, -0.7 * u);
  g.lineTo(0.5 * u, -1.35 * u);
  g.lineTo(0.9 * u, -0.6 * u);
  g.closePath();
  g.fill();
  g.stroke();
  // eye
  g.fillStyle = '#0a2430';
  g.beginPath();
  g.arc(0.95 * u, -0.2 * u, 0.17 * u, 0, Math.PI * 2);
  g.fill();
  // gill
  g.beginPath();
  g.moveTo(0.45 * u, -0.6 * u);
  g.quadraticCurveTo(0.2 * u, 0, 0.45 * u, 0.6 * u);
  g.stroke();
  g.restore();
}

function drawFishBones(g, u, x, y) {
  g.save();
  g.translate(x * u, y * u);
  g.strokeStyle = '#f4f7ff';
  g.lineWidth = 0.16 * u;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-1.3 * u, 0);
  g.lineTo(1.2 * u, 0);
  for (let i = -3; i <= 3; i++) {
    const bx = i * 0.35 * u;
    const h = (0.75 - Math.abs(i) * 0.09) * u;
    g.moveTo(bx, -h);
    g.lineTo(bx, h);
  }
  g.moveTo(1.2 * u, 0);
  g.lineTo(1.9 * u, -0.6 * u);
  g.moveTo(1.2 * u, 0);
  g.lineTo(1.9 * u, 0.6 * u);
  g.stroke();
  g.restore();
}

function drawPuff(g, u, x, y, p) {
  if (p <= 0) return;
  const a = clamp(1 - p, 0, 1);
  g.save();
  g.globalAlpha = a * 0.85;
  g.fillStyle = '#ffe9f4';
  g.strokeStyle = 'rgba(37,28,56,0.4)';
  g.lineWidth = 0.15 * u;
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + 0.4;
    const r = (0.8 + p * 2.2) * u;
    g.beginPath();
    g.arc(x * u + Math.cos(ang) * r, y * u + Math.sin(ang) * r * 0.7, (0.55 + p * 0.8) * u, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }
  g.restore();
}

function caption(g, W, H, text, sub, alpha) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = alpha;
  const base = Math.max(18, Math.min(W, H) * 0.032);
  g.font = `700 ${base}px "Trebuchet MS", "Segoe UI", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const tw = g.measureText(text).width;
  const padX = base * 0.8;
  const boxW = tw + padX * 2;
  const boxH = base * (sub ? 2.5 : 1.7);
  const cx = W * 0.5;
  const cy = H * 0.12;

  g.beginPath();
  const r = base * 0.45;
  const x0 = cx - boxW / 2;
  const y0 = cy - boxH / 2;
  g.moveTo(x0 + r, y0);
  g.lineTo(x0 + boxW - r, y0);
  g.quadraticCurveTo(x0 + boxW, y0, x0 + boxW, y0 + r);
  g.lineTo(x0 + boxW, y0 + boxH - r);
  g.quadraticCurveTo(x0 + boxW, y0 + boxH, x0 + boxW - r, y0 + boxH);
  g.lineTo(x0 + r, y0 + boxH);
  g.quadraticCurveTo(x0, y0 + boxH, x0, y0 + boxH - r);
  g.lineTo(x0, y0 + r);
  g.quadraticCurveTo(x0, y0, x0 + r, y0);
  g.closePath();
  g.fillStyle = 'rgba(18, 14, 34, 0.82)';
  g.fill();
  g.strokeStyle = 'rgba(255, 158, 203, 0.9)';
  g.lineWidth = Math.max(2, base * 0.09);
  g.stroke();

  g.fillStyle = '#fff3fa';
  g.fillText(text, cx, cy - (sub ? base * 0.4 : 0));
  if (sub) {
    g.font = `500 ${base * 0.62}px "Trebuchet MS", "Segoe UI", sans-serif`;
    g.fillStyle = '#ffb8d9';
    g.fillText(sub, cx, cy + base * 0.62);
  }
  g.restore();
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  if (!S) init(ctx);
  g.clearRect(0, 0, ctx.width, ctx.height);

  sounds(ctx, t);

  const L = layout(ctx);
  const u = L.u;
  const W = ctx.width;
  const H = ctx.height;

  // timeline scalars
  const strain = smooth((t - T.strain) / 1.0) * (t < T.plop ? 1 : 0);
  const pushP = clamp((t - (T.plop - 0.5)) / 0.5, 0, 1);
  const relax = smooth((t - T.plop) / 0.8);
  const sniffP = smooth((t - T.sniff) / 0.7) * (t < T.eat ? 1 : 0);
  const eatP = smooth((t - T.eat) / 0.8);
  const chewP = t >= T.chew ? 1 : 0;
  const burpP = smooth((t - T.burp) / 0.8);

  // breathing / bob
  const bob = Math.sin(t * 2.2) * 0.12;

  // squash: strain crouch, then relieved sag
  let sx = 1 + 0.16 * strain - 0.06 * relax;
  let sy = 1 - 0.22 * strain + 0.04 * relax;
  let lift = 0.25 * strain - 0.1 * relax;

  // head position
  let hx = 5.2 + 0.4 * strain;
  let hy = -7.4 + bob - 0.25 * strain;
  let tilt = 0.06 * Math.sin(t * 1.7);
  if (sniffP > 0) {
    hx = lerp(hx, 6.1, sniffP);
    hy = lerp(hy, -5.1, sniffP);
    tilt = lerp(tilt, 0.3, sniffP);
  }
  if (eatP > 0) {
    hx = lerp(6.1, 6.6, eatP);
    hy = lerp(-5.1, -3.9, eatP);
    tilt = lerp(0.3, 0.55, eatP);
  }
  if (burpP > 0) {
    hx = lerp(6.6, 5.4, burpP);
    hy = lerp(-3.9, -7.3, burpP);
    tilt = lerp(0.55, -0.12, burpP);
  }

  // eyes
  const blinkTick = Math.sin(t * 1.6 + S.blinkPhase);
  let eyes = 'open';
  if (strain > 0.2) eyes = 'squint';
  else if (blinkTick > 0.97) eyes = 'blink';
  if (burpP > 0.5) eyes = 'blink';
  if (sniffP > 0.4 && t < T.eat) eyes = 'open';

  // mouth
  let mouth = 0;
  if (strain > 0) mouth = 0.1 * strain;
  if (sniffP > 0) mouth = 0.08;
  if (eatP > 0.15 && t < T.chew) mouth = 0.85;
  if (chewP) {
    const chomp = Math.abs(Math.sin((t - T.chew) * 9));
    mouth = 0.12 + 0.75 * chomp * (t < T.burp ? 1 : 0.2);
  }
  if (burpP > 0 && burpP < 0.6) mouth = 0.55;

  // cat base
  g.save();
  g.translate(L.x, L.y);
  g.scale(u, u);

  drawCushion(g, u);

  // body group with squash
  g.save();
  g.translate(0, lift);
  g.scale(sx, sy);

  // haunch
  g.beginPath();
  g.ellipse(-3.2, -3.4, 4.3, 3.9, -0.12, 0, Math.PI * 2);
  g.fillStyle = CREAM_DARK;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.26;
  g.stroke();

  // torso
  g.beginPath();
  g.ellipse(0.2, -4.1, 6.1, 4.0, 0.05, 0, Math.PI * 2);
  g.fillStyle = CREAM;
  g.fill();
  g.stroke();
  g.lineWidth = 0.26;
  g.strokeStyle = INK;

  // belly shading
  g.beginPath();
  g.ellipse(1.1, -2.4, 4.2, 2.0, 0.08, 0, Math.PI * 2);
  g.fillStyle = '#fdf1d9';
  g.globalAlpha = 0.7;
  g.fill();
  g.globalAlpha = 1;

  // stripes
  g.strokeStyle = 'rgba(214, 160, 110, 0.85)';
  g.lineWidth = 0.45;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-4.6, -6.4);
  g.quadraticCurveTo(-4.1, -4.6, -4.7, -3.2);
  g.moveTo(-2.6, -7.0);
  g.quadraticCurveTo(-2.0, -5.2, -2.7, -3.7);
  g.stroke();

  // front legs
  g.fillStyle = CREAM;
  g.strokeStyle = INK;
  g.lineWidth = 0.26;
  g.beginPath();
  g.ellipse(3.5, -1.5, 1.15, 1.55, 0.06, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.beginPath();
  g.ellipse(1.9, -1.2, 1.0, 1.4, 0.0, 0, Math.PI * 2);
  g.fill();
  g.stroke();

  // toes
  g.strokeStyle = 'rgba(37,28,56,0.5)';
  g.lineWidth = 0.14;
  g.beginPath();
  g.moveTo(3.15, -0.4);
  g.lineTo(3.1, 0.0);
  g.moveTo(3.7, -0.35);
  g.lineTo(3.72, 0.05);
  g.stroke();

  // rear foot
  g.beginPath();
  g.ellipse(-4.9, -1.4, 1.5, 1.05, -0.1, 0, Math.PI * 2);
  g.fillStyle = CREAM;
  g.fill();
  g.strokeStyle = INK;
  g.lineWidth = 0.26;
  g.stroke();

  g.restore(); // squash

  // tail (outside squash so it keeps volume)
  g.save();
  g.translate(0, lift * 0.5);
  drawTail(g, u, t * 3.2, strain > 0.3 ? 'strain' : 'idle');
  g.restore();

  // puff cloud around the deposit moment
  const puffP = t >= T.plop - 0.15 && t < T.plop + 0.9 ? (t - (T.plop - 0.15)) / 1.05 : -1;
  if (puffP >= 0) drawPuff(g, u, -5.6, -4.4, puffP);

  // strain lines
  if (strain > 0.25) {
    g.save();
    g.strokeStyle = `rgba(255, 158, 203, ${0.55 * strain})`;
    g.lineWidth = 0.18;
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const off = Math.sin(t * 14 + i * 2) * 0.35;
      const bx = -8.6 - i * 0.9;
      g.beginPath();
      g.moveTo(bx, -6.2 + i * 1.1);
      g.lineTo(bx - 0.9 + off, -6.2 + i * 1.1);
      g.stroke();
    }
    g.restore();
  }

  // fish
  if (t >= T.plop) {
    const land = { x: 5.6, y: 0.85 };
    if (t < T.land) {
      const p = clamp((t - T.plop) / (T.land - T.plop), 0, 1);
      const x = lerp(-5.7, land.x, p);
      const y = lerp(-4.2, land.y, p) - Math.sin(p * Math.PI) * 5.6;
      drawFish(g, u, x, y, p * Math.PI * 3, 1, t * 16);
    } else if (t < T.eat) {
      const settle = Math.max(0, 1 - (t - T.land) * 1.6);
      const fw = Math.sin(t * 10) * 0.055 * settle;
      const fy = land.y - Math.abs(Math.sin((t - T.land) * 5)) * 0.5 * settle;
      drawFish(g, u, land.x, fy, fw, 1, t * 14);
    } else if (t < T.chew) {
      const p = smooth((t - T.eat) / (T.chew - T.eat));
      const mx = hx + 1.75;
      const my = hy + 1.35;
      const x = lerp(land.x, mx, p);
      const y = lerp(land.y, my, p) - Math.sin(p * Math.PI) * 1.6;
      drawFish(g, u, x, y, p * Math.PI * 1.4, 1 - p * 0.75, t * 18);
    } else if (t < T.burp) {
      // tail sticking out of the mouth, then gone
      const p = clamp((t - T.chew) / (T.burp - T.chew), 0, 1);
      g.save();
      g.globalAlpha = 1 - p * 0.9;
      g.translate((hx + 2.5) * u, (hy + 1.1) * u);
      g.rotate(0.9);
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(0.7 * u, -0.7 * u);
      g.lineTo(0.9 * u, 0.15 * u);
      g.closePath();
      g.fillStyle = FISH;
      g.fill();
      g.strokeStyle = FISH_DARK;
      g.lineWidth = 0.14 * u;
      g.stroke();
      g.restore();
    }
  }

  if (t >= T.burp) drawFishBones(g, u, 5.6, 0.8);

  // head on top
  drawHead(g, u, hx, hy, tilt, mouth, eyes, strain > 0.3 ? 'strain' : 'idle');

  // burp ring
  if (burpP > 0 && burpP < 0.75) {
    const bp = burpP / 0.75;
    g.save();
    g.globalAlpha = 1 - bp;
    g.strokeStyle = '#ffe9f4';
    g.lineWidth = 0.25;
    g.beginPath();
    g.arc(hx + 2.9, hy + 1.4, (0.4 + bp * 2.4) * u, -0.5, 0.9);
    g.stroke();
    g.restore();
  }

  g.restore(); // cat base

  // captions
  let cap = '';
  let sub = '';
  let capA = 1;
  if (t < T.strain) {
    cap = "savorysailor's cat needs a private moment";
    sub = 'please look away';
  } else if (t < T.plop) {
    cap = 'do not make eye contact';
    sub = 'this is a professional at work';
  } else if (t < T.eat) {
    cap = 'a whole fish has been produced';
    sub = 'this is normal. this is fine.';
  } else if (t < T.burp) {
    cap = 'waste not, want not';
    sub = 'savorysailor is watching this happen';
  } else {
    cap = 'recycled. local. sustainable.';
    sub = 'zero waste, one cat, no regrets';
    capA = 1 - clamp((t - T.end + 0.9) / 0.9, 0, 1);
  }
  caption(g, W, H, cap, sub, capA);

  if (t >= T.end && !S.ended) {
    S.ended = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
