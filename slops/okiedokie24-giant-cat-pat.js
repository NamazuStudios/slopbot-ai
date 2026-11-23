// Giant Cat Pat — a very large, very real cat pats the streamer's camera.
// Transparent glass over the live broadcast. Nothing here replaces the stream.

export const meta = {
  title: 'Giant Cat Pat',
  author: 'okiedokie24',
  prompt: "when a user types !catpat a giant realistic cat pats the streamer's camera with a giant cat paw",
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!catpat"] }
  ],
};

const D = Math.PI * 2;

const PATS = [
  { down: 0.15, hit: 1.55, pressEnd: 1.86, liftEnd: 2.35, force: 0.85, dx: -0.05, rot: -0.08, claw: 0.55 },
  { down: 2.35, hit: 2.95, pressEnd: 3.12, liftEnd: 3.38, force: 0.95, dx: 0.06, rot: 0.07, claw: 0.7 },
  { down: 3.38, hit: 3.92, pressEnd: 4.14, liftEnd: 4.55, force: 1.05, dx: -0.03, rot: -0.04, claw: 0.8 },
  { down: 4.55, hit: 6.05, pressEnd: 6.95, liftEnd: 7.90, force: 1.45, dx: 0, rot: 0, claw: 0.15 },
];

const END_T = 9.6;

const CAPS = [
  { a: 0.50, b: 1.25, text: 'INCOMING', size: 0.80 },
  { a: 1.55, b: 2.15, text: 'PAT', size: 1.60 },
  { a: 2.95, b: 3.35, text: 'PAT', size: 1.15 },
  { a: 3.92, b: 4.50, text: 'PAT', size: 1.15 },
  { a: 6.05, b: 7.00, text: 'P A T .', size: 1.90 },
  { a: 7.00, b: 8.05, text: 'THE CAMERA HAS BEEN PATTED', size: 0.72 },
  { a: 8.05, b: 9.45, text: 'good streamer, SavorySailor', size: 0.90 },
];

let state = null;

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function easeInQuad(p) {
  return p * p;
}

function easeOutCubic(p) {
  return 1 - Math.pow(1 - p, 3);
}

function reset() {
  state = { sfx: Object.create(null), done: false };
}

export function init(ctx) {
  reset();
}

function pawAt(t) {
  for (let i = 0; i < PATS.length; i++) {
    const p = PATS[i];
    if (t < p.down) continue;
    if (t < p.hit) {
      const u = (t - p.down) / (p.hit - p.down);
      return { i, p, visible: true, off: -1.6 * (1 - easeInQuad(u)), depth: easeInQuad(u) };
    }
    if (t < p.liftEnd) {
      if (t <= p.pressEnd) {
        return { i, p, visible: true, off: 0, depth: 1 };
      }
      const u = (t - p.pressEnd) / (p.liftEnd - p.pressEnd);
      return { i, p, visible: true, off: -1.6 * easeOutCubic(u), depth: 1 - easeOutCubic(u) };
    }
  }
  return { i: -1, p: null, visible: false, off: -1.6, depth: 0 };
}

function limbFur(g, seed) {
  g.lineCap = 'round';
  for (let j = 0; j < 30; j++) {
    const y = -1.25 + j * 0.042;
    const lightish = hash(seed + j * 17.3) > 0.4;
    g.strokeStyle = lightish ? 'rgba(235,219,194,0.55)' : 'rgba(96,74,53,0.5)';
    g.lineWidth = 0.005 + hash(seed + j * 5.1) * 0.004;
    for (let side = -1; side <= 1; side += 2) {
      const wob = (hash(seed + j * 3.1 + side * 11) - 0.5) * 0.03;
      const px = side * (0.30 + wob);
      const len = 0.05 + hash(seed + j * 7.7 + side * 3) * 0.055;
      const ang = side > 0
        ? 0.18 + hash(seed + j * 2.2 + side) * 0.75
        : Math.PI - 0.18 - hash(seed + j * 4.4 + side) * 0.75;
      const ex = px + Math.cos(ang) * len;
      const ey = y + Math.sin(ang) * len;
      g.beginPath();
      g.moveTo(px, y);
      g.quadraticCurveTo(
        px + Math.cos(ang) * len * 0.5,
        y + Math.sin(ang) * len * 0.5 + 0.01,
        ex, ey
      );
      g.stroke();
    }
  }
}

function furRing(g, cx, cy, rx, ry, count, seed, lightAlpha, darkAlpha, lengthBase) {
  g.lineCap = 'round';
  for (let i = 0; i < count; i++) {
    const a = (i / count) * D + (hash(seed + i) - 0.5) * (D / count) * 1.7;
    const ca = Math.cos(a);
    const sa = Math.sin(a);
    const px = cx + ca * rx;
    const py = cy + sa * ry;
    const len = lengthBase + hash(seed + i * 3.1) * lengthBase * 1.3;
    const ang = a + (hash(seed + i * 7.7) - 0.5) * 0.9;
    const bend = (hash(seed + i * 5.3) - 0.5) * 0.7;
    const ex = px + Math.cos(ang) * len;
    const ey = py + Math.sin(ang) * len;
    const mx = px + Math.cos(ang) * len * 0.55 - Math.sin(ang) * len * bend * 0.5;
    const my = py + Math.sin(ang) * len * 0.55 + Math.cos(ang) * len * bend * 0.5;
    const light = hash(seed + i * 11.1) > 0.38;
    g.strokeStyle = light
      ? 'rgba(240,224,200,' + lightAlpha + ')'
      : 'rgba(88,66,47,' + darkAlpha + ')';
    g.lineWidth = 0.0035 + hash(seed + i * 13.3) * 0.0045;
    g.beginPath();
    g.moveTo(px, py);
    g.quadraticCurveTo(mx, my, ex, ey);
    g.stroke();
  }
}

function palmPath(g, cx, cy, rx, ry) {
  g.beginPath();
  g.ellipse(cx, cy, rx, ry, 0, 0, D);
}

function toeList() {
  const out = [];
  for (let i = 0; i < 4; i++) {
    const u = (i - 1.5) / 1.5;
    const rx = i === 0 || i === 3 ? 0.085 : 0.095;
    const ry = i === 0 || i === 3 ? 0.115 : 0.128;
    out.push({
      x: u * 0.255,
      y: 0.212 + (1 - Math.abs(u)) * 0.038,
      rx,
      ry,
    });
  }
  return out;
}

function drawPaw(g, x, y, s, squash, rot, claw) {
  const toes = toeList();
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(s * (1 + squash * 0.55), s * (1 - squash));

  // --- foreleg continuing up out of frame ---
  const limb = new Path2D();
  limb.moveTo(-0.30, -0.05);
  limb.bezierCurveTo(-0.35, -0.55, -0.34, -1.05, -0.31, -1.55);
  limb.lineTo(0.31, -1.55);
  limb.bezierCurveTo(0.34, -1.05, 0.35, -0.55, 0.30, -0.05);
  limb.closePath();

  const limbGrad = g.createLinearGradient(-0.35, -1.2, 0.30, 0.1);
  limbGrad.addColorStop(0, '#d6c1a3');
  limbGrad.addColorStop(0.5, '#b1956f');
  limbGrad.addColorStop(1, '#85684c');
  g.fillStyle = limbGrad;
  g.fill(limb);

  // tabby bands on the arm
  g.save();
  g.clip(limb);
  for (let i = 0; i < 5; i++) {
    const by = -1.35 + i * 0.26;
    g.beginPath();
    g.ellipse(hash(i * 9.7) * 0.2 - 0.1, by, 0.52, 0.055, -0.18, 0, D);
    g.fillStyle = 'rgba(84,62,44,0.14)';
    g.fill();
  }
  const armShade = g.createLinearGradient(-0.36, 0, 0.36, 0);
  armShade.addColorStop(0, 'rgba(255,244,226,0.22)');
  armShade.addColorStop(0.42, 'rgba(255,244,226,0)');
  armShade.addColorStop(1, 'rgba(52,34,20,0.28)');
  g.fillStyle = armShade;
  g.fillRect(-0.4, -1.6, 0.8, 1.7);
  g.restore();

  limbFur(g, 4.2);

  // --- fuzz behind the toes and palm ---
  for (let i = 0; i < toes.length; i++) {
    const td = toes[i];
    furRing(g, td.x, td.y, td.rx * 1.02, td.ry * 1.02, 16, 40 + i * 13, 0.5, 0.45, 0.035);
  }
  furRing(g, 0, -0.15, 0.345, 0.335, 40, 3.7, 0.5, 0.5, 0.04);

  // --- toe pads base ---
  const toeGrad = g.createLinearGradient(-0.3, -0.45, 0.32, 0.42);
  toeGrad.addColorStop(0, '#d9c5a9');
  toeGrad.addColorStop(0.5, '#b79b7b');
  toeGrad.addColorStop(1, '#8a6d51');

  for (let i = 0; i < toes.length; i++) {
    const td = toes[i];
    g.beginPath();
    g.ellipse(td.x, td.y, td.rx, td.ry, 0, 0, D);
    g.fillStyle = toeGrad;
    g.fill();
  }

  // --- palm ---
  palmPath(g, 0, -0.15, 0.345, 0.335);
  g.fillStyle = toeGrad;
  g.fill();

  // palm shading
  g.save();
  palmPath(g, 0, -0.15, 0.345, 0.335);
  g.clip();
  const shade = g.createLinearGradient(-0.32, -0.48, 0.32, 0.40);
  shade.addColorStop(0, 'rgba(255,246,229,0.50)');
  shade.addColorStop(0.45, 'rgba(255,246,229,0)');
  shade.addColorStop(1, 'rgba(56,38,24,0.42)');
  g.fillStyle = shade;
  g.fillRect(-0.4, -0.55, 0.8, 0.95);

  // soft inner texture strokes
  g.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const a = hash(i * 5.7 + 2) * D;
    const r = Math.sqrt(hash(i * 9.1 + 4)) * 0.75;
    const px = Math.cos(a) * r * 0.30;
    const py = -0.15 + Math.sin(a) * r * 0.28;
    const len = 0.035 + hash(i * 3.3) * 0.045;
    g.beginPath();
    g.moveTo(px, py);
    g.quadraticCurveTo(px + 0.008, py + len * 0.5, px + 0.018, py + len);
    g.strokeStyle = hash(i * 7.7) > 0.5 ? 'rgba(238,224,201,0.16)' : 'rgba(70,48,30,0.16)';
    g.lineWidth = 0.005;
    g.stroke();
  }
  g.restore();

  // fur fringe over the front of the shapes
  for (let i = 0; i < toes.length; i++) {
    const td = toes[i];
    furRing(g, td.x, td.y, td.rx, td.ry, 10, 200 + i * 17, 0.75, 0.3, 0.028);
  }
  furRing(g, 0, -0.15, 0.345, 0.335, 22, 90.7, 0.7, 0.3, 0.03);

  // rim light on the lower silhouette
  g.beginPath();
  g.ellipse(0, -0.12, 0.35, 0.34, 0, 0.5, Math.PI - 0.5);
  g.strokeStyle = 'rgba(255,246,230,0.20)';
  g.lineWidth = 0.012;
  g.stroke();

  // --- pads ---
  const padGrad = g.createRadialGradient(-0.04, 0.01, 0.01, 0, 0.06, 0.20);
  padGrad.addColorStop(0, '#eab4b6');
  padGrad.addColorStop(0.6, '#d79aa0');
  padGrad.addColorStop(1, '#b87d86');

  g.beginPath();
  g.ellipse(0, 0.045, 0.185, 0.145, 0, 0, D);
  g.fillStyle = padGrad;
  g.fill();
  g.strokeStyle = 'rgba(90,50,52,0.30)';
  g.lineWidth = 0.008;
  g.stroke();

  for (let i = 0; i < toes.length; i++) {
    const td = toes[i];
    g.beginPath();
    g.ellipse(td.x, td.y + 0.015, 0.052, 0.066, 0, 0, D);
    g.fillStyle = padGrad;
    g.fill();
    g.strokeStyle = 'rgba(90,50,52,0.28)';
    g.lineWidth = 0.006;
    g.stroke();
  }

  // --- claws (sheathed to a hint) ---
  if (claw > 0.04) {
    for (let i = 0; i < toes.length; i++) {
      const td = toes[i];
      const bx = td.x;
      const by = td.y + td.ry * 0.92;
      g.beginPath();
      g.moveTo(bx - 0.016, by - 0.012);
      g.quadraticCurveTo(bx - 0.004, by + 0.04 * claw, bx + 0.012, by + 0.032 * claw);
      g.quadraticCurveTo(bx + 0.014, by, bx + 0.004, by - 0.012);
      g.closePath();
      g.fillStyle = 'rgba(247,240,228,0.92)';
      g.fill();
      g.strokeStyle = 'rgba(70,52,38,0.35)';
      g.lineWidth = 0.003;
      g.stroke();
    }
  }

  g.restore();
}

function drawSmudge(g, x, y, s, alpha, rot) {
  if (alpha <= 0.01) return;
  g.save();
  g.translate(x, y);
  g.rotate(rot);

  const rg = g.createRadialGradient(0, 0, 0, 0, 0, s * 0.20);
  rg.addColorStop(0, 'rgba(255,250,240,' + (0.20 * alpha) + ')');
  rg.addColorStop(0.65, 'rgba(255,246,232,' + (0.075 * alpha) + ')');
  rg.addColorStop(1, 'rgba(255,246,232,0)');
  g.fillStyle = rg;
  g.beginPath();
  g.ellipse(0, s * 0.02, s * 0.20, s * 0.155, 0, 0, D);
  g.fill();

  for (let i = 0; i < 4; i++) {
    const u = (i - 1.5) / 1.5;
    const tx = u * s * 0.145;
    const ty = -s * 0.135 - (1 - Math.abs(u)) * s * 0.018;
    const trg = g.createRadialGradient(tx, ty, 0, tx, ty, s * 0.055);
    trg.addColorStop(0, 'rgba(255,250,240,' + (0.22 * alpha) + ')');
    trg.addColorStop(1, 'rgba(255,250,240,0)');
    g.fillStyle = trg;
    g.beginPath();
    g.ellipse(tx, ty, s * 0.055, s * 0.062, 0, 0, D);
    g.fill();
  }

  // faint streaks in the smudge
  g.strokeStyle = 'rgba(255,252,246,' + (0.09 * alpha) + ')';
  g.lineWidth = Math.max(1, s * 0.006);
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(0, 0, s * (0.13 + i * 0.03), 0.3, Math.PI - 0.4);
    g.stroke();
  }
  g.restore();
}

function drawCaption(g, text, x, y, px, alpha, shake) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = clamp(alpha, 0, 1);
  g.translate(x + Math.sin(px * 0.7) * shake * 4, y + Math.cos(px * 0.5) * shake * 3);
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = '900 ' + Math.round(px) + 'px system-ui, "Segoe UI", Arial, sans-serif';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(9,11,30,0.78)';
  g.lineWidth = px * 0.16;
  g.strokeText(text, 0, 0);
  g.fillStyle = '#fff4e4';
  g.fillText(text, 0, 0);
  g.restore();
}

function playSounds(ctx, t) {
  const S = ctx.sound;
  if (!S) return;

  for (let i = 0; i < PATS.length; i++) {
    const p = PATS[i];
    const downKey = 'down' + i;
    const hitKey = 'hit' + i;

    if (!state.sfx[downKey] && t >= p.down && t < p.hit) {
      state.sfx[downKey] = 1;
      S.noise(190);
    }
    if (!state.sfx[hitKey] && t >= p.hit && t < p.hit + 0.35) {
      state.sfx[hitKey] = 1;
      S.noise(150);
      if (i === PATS.length - 1) {
        S.beep(72, 280);
        S.beep(140, 130);
      } else {
        S.beep(120 + i * 16, 110);
      }
    }
  }

  const fanfare = [[7.0, 523.25], [7.18, 659.25], [7.36, 783.99], [7.6, 1046.5]];
  for (let k = 0; k < fanfare.length; k++) {
    const key = 'note' + k;
    if (!state.sfx[key] && t >= fanfare[k][0] && t < fanfare[k][0] + 0.3) {
      state.sfx[key] = 1;
      S.beep(fanfare[k][1], 160);
    }
  }
}

export function frame(ctx, t, dt) {
  if (!state) reset();

  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);

  const s = Math.min(W * 1.1, H * 1.25);

  let ax = W * 0.5;
  let ay = H * 0.5;
  if (ctx.streamer && ctx.streamer.w > 0 && ctx.streamer.h > 0) {
    ax = (ctx.streamer.x + ctx.streamer.w * 0.5) * W;
    ay = (ctx.streamer.y + ctx.streamer.h * 0.52) * H;
  }
  ax = clamp(ax, W * 0.25, W * 0.75);
  ay = clamp(ay, H * 0.30, H * 0.72);

  const ps = pawAt(t);

  let shake = 0;
  for (let i = 0; i < PATS.length; i++) {
    const p = PATS[i];
    if (t >= p.hit) shake += p.force * Math.exp(-(t - p.hit) * 6.2);
  }
  shake = Math.min(shake, 1.5);

  const jitterX = Math.sin(t * 91.3) * shake * 9;
  const jitterY = Math.cos(t * 77.1) * shake * 7;

  // --- lens paw-print smudges left behind by each contact ---
  for (let i = 0; i < PATS.length; i++) {
    const p = PATS[i];
    if (t < p.hit) continue;
    const age = t - p.hit;
    const cx = ax + p.dx * s + (i === PATS.length - 1 ? jitterX * 0.3 : 0);
    const cy = ay + 0.06 * s;
    drawSmudge(g, cx, cy, s * 0.55, Math.min(1, age / 0.25) * (0.55 + p.force * 0.35), p.rot * 0.5);
  }

  // --- shockwave rings at each contact ---
  for (let i = 0; i < PATS.length; i++) {
    const p = PATS[i];
    if (t < p.hit) continue;
    const age = t - p.hit;
    if (age > 0.85) continue;
    const cx = ax + p.dx * s;
    const cy = ay + 0.06 * s;
    const prog = age / 0.85;
    const r = s * (0.08 + prog * 0.55);
    g.save();
    g.globalAlpha = (1 - prog) * 0.7;
    g.strokeStyle = i === PATS.length - 1 ? 'rgba(255,224,236,0.95)' : 'rgba(255,246,228,0.9)';
    g.lineWidth = Math.max(1.5, s * 0.012 * (1 - prog));
    g.beginPath();
    g.arc(cx, cy, r, 0, D);
    g.stroke();
    g.globalAlpha = (1 - prog) * 0.35;
    g.beginPath();
    g.arc(cx, cy, r * 0.72, 0, D);
    g.stroke();
    g.restore();
  }

  // --- glass compression glow where the paw presses ---
  if (ps.visible && ps.depth > 0.02) {
    const cx = ax + ps.p.dx * s;
    const cy = ay + 0.06 * s;
    const rad = s * 0.42;
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, rad);
    rg.addColorStop(0, 'rgba(255,250,240,' + (0.16 * ps.depth) + ')');
    rg.addColorStop(0.6, 'rgba(255,240,225,' + (0.05 * ps.depth) + ')');
    rg.addColorStop(1, 'rgba(255,240,225,0)');
    g.fillStyle = rg;
    g.beginPath();
    g.ellipse(cx, cy, rad, rad * 0.8, 0, 0, D);
    g.fill();
  }

  // --- the paw ---
  if (ps.visible) {
    const p = ps.p;
    const px = ax + p.dx * s + jitterX;
    const py = ay - 0.235 * s + ps.off * s + jitterY;
    let depth = clamp(ps.depth, 0, 1);
    if (t >= p.hit && t <= p.pressEnd) {
      depth *= 1 + 0.16 * Math.sin((t - p.hit) * 26);
    }
    const squash = clamp(depth, 0, 1.2) * 0.14 * Math.min(1.3, p.force);
    const rot = p.rot + Math.sin(t * 63) * shake * 0.02;
    drawPaw(g, px, py, s, squash, rot, p.claw * (t >= p.hit ? 1 : 1));
  }

  // --- flying fur / dust from impacts ---
  for (let i = 0; i < PATS.length; i++) {
    const p = PATS[i];
    if (t < p.hit) continue;
    const age = t - p.hit;
    if (age > 0.85) continue;
    const cx = ax + p.dx * s;
    const cy = ay + 0.02 * s;
    g.save();
    g.lineCap = 'round';
    for (let k = 0; k < 18; k++) {
      const sd = i * 131.7 + k * 7.3;
      const ang = -Math.PI * 0.5 + (hash(sd) - 0.5) * 2.3;
      const speed = s * (0.30 + hash(sd + 1.3) * 0.85) * (0.6 + p.force * 0.5);
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed;
      const x0 = cx + (hash(sd + 2.1) - 0.5) * s * 0.5;
      const y0 = cy + (hash(sd + 3.7) - 0.5) * s * 0.28;
      const px = x0 + vx * age;
      const py = y0 + vy * age + 0.5 * s * 2.1 * age * age;
      const a = clamp(1 - age / 0.85, 0, 1) * 0.75;
      const len = s * (0.012 + hash(sd + 4.1) * 0.016);
      const light = hash(sd + 5.5) > 0.45;
      g.globalAlpha = a;
      g.strokeStyle = light ? 'rgba(240,226,203,0.9)' : 'rgba(112,84,60,0.85)';
      g.lineWidth = Math.max(1.2, s * 0.004);
      g.beginPath();
      g.moveTo(px, py);
      g.lineTo(px + Math.cos(ang) * len, py + Math.sin(ang) * len);
      g.stroke();
    }
    g.restore();
  }

  // --- impact ticks around the contact ---
  if (shake > 0.12) {
    g.save();
    g.strokeStyle = 'rgba(255,248,232,' + (0.5 * Math.min(1, shake)) + ')';
    g.lineWidth = Math.max(1.5, s * 0.006);
    const cx = ax;
    const cy = ay + 0.02 * s;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * D + Math.sin(t * 50) * 0.05;
      const r0 = s * 0.52 + Math.sin(k * 7 + t * 13) * s * 0.02;
      const r1 = r0 + s * (0.05 + shake * 0.05);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
      g.stroke();
    }
    g.restore();
  }

  // --- captions ---
  const base = Math.min(W, H) * 0.062;
  for (let i = 0; i < CAPS.length; i++) {
    const c = CAPS[i];
    if (t < c.a || t > c.b) continue;
    const fadeIn = clamp((t - c.a) / 0.14, 0, 1);
    const fadeOut = clamp((c.b - t) / 0.2, 0, 1);
    const alpha = Math.min(fadeIn, fadeOut);
    const pop = 1 + (1 - fadeIn) * 0.12;
    drawCaption(g, c.text, W * 0.5, H * 0.87, base * c.size * pop, alpha, shake);
  }

  // --- a tiny love note to the streamer, bottom corner ---
  if (t > 7.1 && t < END_T) {
    const a = clamp((t - 7.1) / 0.4, 0, 1) * clamp((END_T - t) / 0.4, 0, 1) * 0.65;
    g.save();
    g.globalAlpha = a;
    g.textAlign = 'right';
    g.textBaseline = 'bottom';
    g.font = '600 ' + Math.round(base * 0.3) + 'px system-ui, "Segoe UI", Arial, sans-serif';
    g.fillStyle = '#ffe9f0';
    g.fillText('purr', W * 0.94, H * 0.96);
    g.restore();
  }

  playSounds(ctx, t);

  if (t >= END_T && !state.done) {
    state.done = true;
    if (ctx.done) ctx.done();
  }
}

export function dispose(ctx) {
  state = null;
}
