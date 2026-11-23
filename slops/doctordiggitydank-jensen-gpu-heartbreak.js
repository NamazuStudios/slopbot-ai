export const meta = {
  title: 'Jensen GPU Heartbreak',
  author: 'doctordiggitydank',
  prompt: 'Jensen Huang from nVidia shows up and flirts with the streamer, offering him an RTX 5090 GPU in exchange for a "blowie". The words "NOT A CHINESE SPY" show up above the streamer and Jensen gets bummed out and cries while walking away.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;
const T_ENTER_END = 5.0;
const T_CARD = 5.6;
const T_STAMP = 15.4;
const T_EXIT = 21.5;
const T_END = 30.6;

const BUBBLES = [
  { from: 1.8, to: 5.3, lines: ['hey, sailor.', 'nice frame rate.'] },
  { from: 6.0, to: 9.0, lines: ['fresh RTX 5090.', 'for you, big guy.'] },
  { from: 9.3, to: 13.4, lines: ['yours. all it costs', 'is one blowie.'] },
  { from: 15.7, to: 17.9, lines: ['…what.'] },
  { from: 18.7, to: 22.2, lines: ['so that is a no', 'on the blowie?'] },
];

let ENGINE = null;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, p) { return a + (b - a) * p; }
function easeOut(p) { return 1 - Math.pow(1 - p, 3); }
function easeInOut(p) { return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }
function smooth(p) { return p * p * (3 - 2 * p); }

function rr(c, x, y, w, h, r) {
  const rad = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

function drawHeart(c, x, y, size, alpha, color, broken) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(size / 20, size / 20);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, 6);
  c.bezierCurveTo(-14, -4, -8, -14, 0, -7);
  c.bezierCurveTo(8, -14, 14, -4, 0, 6);
  c.closePath();
  c.fill();
  if (broken) {
    c.globalCompositeOperation = 'destination-out';
    c.lineWidth = 2.4;
    c.strokeStyle = 'rgba(0,0,0,1)';
    c.beginPath();
    c.moveTo(-1, -11);
    c.lineTo(2, -5);
    c.lineTo(-2, 0);
    c.lineTo(2, 6);
    c.stroke();
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
}

function drawSparkle(c, x, y, size, alpha, color) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(0, -size);
  c.quadraticCurveTo(size * 0.16, -size * 0.16, size, 0);
  c.quadraticCurveTo(size * 0.16, size * 0.16, 0, size);
  c.quadraticCurveTo(-size * 0.16, size * 0.16, -size, 0);
  c.quadraticCurveTo(-size * 0.16, -size * 0.16, 0, -size);
  c.closePath();
  c.fill();
  c.restore();
}

/* ---------------------------------- Jensen --------------------------------- */

function drawLeg(c, hx, ang) {
  c.save();
  c.translate(hx, -80);
  c.rotate(ang);
  c.strokeStyle = '#14161c';
  c.lineWidth = 19;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(1, 72);
  c.stroke();
  c.fillStyle = '#0c0d11';
  c.beginPath();
  c.ellipse(7, 78, 16, 7.5, 0, 0, TAU);
  c.fill();
  c.restore();
}

function drawArm(c, sx, sy, ang, len, sleeve) {
  c.save();
  c.translate(sx, sy);
  c.rotate(ang);
  c.strokeStyle = sleeve;
  c.lineWidth = 17;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(0, len * 0.82);
  c.stroke();
  c.fillStyle = '#dfa87d';
  c.beginPath();
  c.arc(0, len * 0.82, 8.5, 0, TAU);
  c.fill();
  c.restore();
}

function drawJensen(c, o) {
  const { k, x, t, mood, cry, walk, moving, faceLeft } = o;
  const y = o.y;

  c.save();
  c.translate(x, y);
  c.scale(faceLeft ? -k : k, k);

  const sw = moving ? Math.sin(walk) : Math.sin(t * 1.7) * 0.05;
  const bob = moving ? Math.abs(Math.cos(walk)) * 3.2 : Math.sin(t * 1.7) * 0.7;
  const lean = mood * 0.06 + (cry > 0.35 ? Math.sin(t * 7.5) * 0.018 * cry : 0);
  c.translate(0, -bob);
  c.rotate(lean);

  /* shadow is drawn outside this transform */

  drawLeg(c, -14, sw * 0.38);
  drawLeg(c, 14, -sw * 0.38);

  // torso: black leather jacket
  const grad = c.createLinearGradient(-36, -176, 36, -74);
  grad.addColorStop(0, '#2a2d36');
  grad.addColorStop(0.45, '#191b22');
  grad.addColorStop(1, '#101116');
  c.fillStyle = grad;
  rr(c, -34, -174, 68, 98, 19);
  c.fill();

  // shirt v
  c.fillStyle = '#33363f';
  c.beginPath();
  c.moveTo(-13, -174);
  c.lineTo(13, -174);
  c.lineTo(0, -148);
  c.closePath();
  c.fill();

  // zipper
  c.strokeStyle = 'rgba(120,126,140,0.55)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, -148);
  c.lineTo(0, -80);
  c.stroke();

  // collar
  c.fillStyle = '#242630';
  c.beginPath();
  c.moveTo(-30, -176);
  c.lineTo(-8, -172);
  c.lineTo(-16, -160);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(30, -176);
  c.lineTo(8, -172);
  c.lineTo(16, -160);
  c.closePath();
  c.fill();

  // nvidia badge
  c.fillStyle = '#76ff5e';
  rr(c, -24, -152, 20, 14, 4);
  c.fill();
  c.fillStyle = '#0d2a0a';
  c.font = '700 9px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('nv', -14, -144.5);

  // arms
  const armUp = o.armUp;
  const swingA = moving ? sw * 0.42 : Math.sin(t * 1.7) * 0.04;
  drawArm(c, -29, -164, 0.12 - swingA, 66, '#191b22');
  const presentAng = lerp(0.14 + swingA * 0.4, -1.2 + Math.sin(t * 2.4) * 0.045, armUp);
  drawArm(c, 29, -164, presentAng, 70, '#1d1f27');
  const handX = 29 + 70 * 0.82 * -Math.sin(presentAng);
  const handY = -164 + 70 * 0.82 * Math.cos(presentAng);

  // neck
  c.fillStyle = '#c99771';
  c.fillRect(-7, -186, 14, 12);

  // head
  c.save();
  c.translate(0, -206);

  // ears
  c.fillStyle = '#d8a077';
  c.beginPath(); c.arc(-23, 1, 5.5, 0, TAU); c.fill();
  c.beginPath(); c.arc(23, 1, 5.5, 0, TAU); c.fill();

  // face
  const skin = c.createLinearGradient(-20, -24, 20, 24);
  skin.addColorStop(0, '#e6b287');
  skin.addColorStop(1, '#cf9469');
  c.fillStyle = skin;
  c.beginPath();
  c.ellipse(0, 0, 24, 27, 0, 0, TAU);
  c.fill();

  // hair
  c.fillStyle = '#151318';
  c.beginPath();
  c.moveTo(-25, 1);
  c.quadraticCurveTo(-29, -27, -4, -30);
  c.quadraticCurveTo(24, -33, 26, -6);
  c.quadraticCurveTo(27, 4, 23, 8);
  c.quadraticCurveTo(21, -7, 8, -12);
  c.quadraticCurveTo(-4, -16, -13, -8);
  c.quadraticCurveTo(-21, -3, -25, 1);
  c.closePath();
  c.fill();

  // brows
  c.strokeStyle = '#241a18';
  c.lineWidth = 2.4;
  c.lineCap = 'round';
  const browLift = lerp(0, -3.2, mood);
  c.beginPath();
  c.moveTo(-16, -11 + browLift);
  c.quadraticCurveTo(-10, -13.5 + browLift * 0.4, -5, -11.5 + browLift * 0.3);
  c.stroke();
  c.beginPath();
  c.moveTo(5, -11.5 + browLift * 0.3);
  c.quadraticCurveTo(10, -13.5 + browLift * 0.4, 16, -11 + browLift);
  c.stroke();

  const crying = cry > 0.45;

  if (crying) {
    // squeezed-shut crying eyes
    c.strokeStyle = '#2a1c18';
    c.lineWidth = 2.2;
    c.beginPath();
    c.moveTo(-15, -1);
    c.quadraticCurveTo(-10, 3.5, -5, -1);
    c.stroke();
    c.beginPath();
    c.moveTo(5, -1);
    c.quadraticCurveTo(10, 3.5, 15, -1);
    c.stroke();
  } else {
    // eyes
    const eyeOpen = lerp(1, 1.18, mood);
    c.fillStyle = '#fdfbf6';
    c.beginPath();
    c.ellipse(-10, -1, 4.8, 4.4 * eyeOpen, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.ellipse(10, -1, 4.8, 4.4 * eyeOpen, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#241a18';
    c.beginPath();
    c.arc(-10 + Math.sin(t * 1.3) * 1.2, -1 - mood * 0.8, 2.3, 0, TAU);
    c.fill();
    c.beginPath();
    c.arc(10 + Math.sin(t * 1.3) * 1.2, -1 - mood * 0.8, 2.3, 0, TAU);
    c.fill();
  }

  // glasses
  c.strokeStyle = 'rgba(34,30,34,0.85)';
  c.lineWidth = 1.7;
  rr(c, -19, -8, 16, 11, 3.5);
  c.stroke();
  rr(c, 3, -8, 16, 11, 3.5);
  c.stroke();
  c.beginPath();
  c.moveTo(-3, -4);
  c.lineTo(3, -4);
  c.stroke();
  c.beginPath();
  c.moveTo(-19, -4.5);
  c.lineTo(-24, -5.5);
  c.stroke();
  c.beginPath();
  c.moveTo(19, -4.5);
  c.lineTo(24, -5.5);
  c.stroke();

  // nose
  c.strokeStyle = 'rgba(140,84,54,0.65)';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(-1.5, 5);
  c.quadraticCurveTo(1.5, 9, -2.5, 9.5);
  c.stroke();

  // mouth
  if (cry > 0.5) {
    const wob = Math.sin(t * 9) * 1.1 * cry;
    c.fillStyle = '#612634';
    c.beginPath();
    c.ellipse(0.5, 15.5, 6.2 + wob, 7.4 + wob * 0.6, 0, 0, TAU);
    c.fill();
    c.strokeStyle = '#3d1520';
    c.lineWidth = 1.2;
    c.stroke();
  } else {
    const ctrlY = lerp(16.5, 10.5, mood);
    const endY = lerp(12.5, 15.5, mood);
    c.strokeStyle = '#7c4430';
    c.lineWidth = 2.1;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-6.5, endY);
    c.quadraticCurveTo(0.5, ctrlY, 7, endY - 0.8);
    c.stroke();
  }

  // tears
  if (cry > 0.12) {
    for (let i = 0; i < 6; i++) {
      const ph = (t * 0.85 + i * 0.19) % 1;
      const side = i % 2 === 0 ? -1 : 1;
      const fade = cry * (1 - ph) * 0.95;
      c.globalAlpha = fade;
      c.fillStyle = '#a6ddff';
      c.beginPath();
      c.ellipse(side * 10 + ph * 3, 5 + ph * 44, 2.5, 3.6, 0, 0, TAU);
      c.fill();
      c.globalAlpha = 1;
    }
  }

  c.restore(); // head

  // card held in hand
  if (o.showCard) {
    drawGpu(c, handX + 12, handY - 6, 92, 50, -0.14, o.glow, t);
    // sparkle ring
    for (let i = 0; i < 7; i++) {
      const a = t * 1.6 + i * (TAU / 7);
      const rad = 62 + Math.sin(t * 3 + i) * 6;
      drawSparkle(
        c,
        handX + 12 + Math.cos(a) * rad * 0.85,
        handY - 6 + Math.sin(a) * rad * 0.5,
        6 + Math.sin(t * 5 + i) * 1.8,
        o.glow * (0.5 + 0.5 * Math.sin(t * 4 + i * 1.7)),
        '#b6ffd0'
      );
    }
  }

  c.restore();
}

function drawGpuFan(c, x, y, r, spin) {
  c.save();
  c.translate(x, y);
  c.strokeStyle = '#565d6b';
  c.lineWidth = Math.max(1, r * 0.16);
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.stroke();
  c.fillStyle = '#3c434e';
  for (let i = 0; i < 5; i++) {
    const a = spin + (i * TAU) / 5;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, r * 0.82, a, a + 0.52);
    c.closePath();
    c.fill();
  }
  c.fillStyle = '#939bab';
  c.beginPath();
  c.arc(0, 0, r * 0.22, 0, TAU);
  c.fill();
  c.restore();
}

function drawGpu(c, x, y, w, h, rot, glow, t) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.shadowColor = 'rgba(118,255,94,0.8)';
  c.shadowBlur = 8 + 20 * glow;
  c.fillStyle = 'rgba(27,31,39,0.98)';
  rr(c, -w / 2, -h / 2, w, h, h * 0.12);
  c.fill();
  c.shadowBlur = 0;
  c.strokeStyle = 'rgba(140,255,110,' + (0.5 + 0.45 * glow).toFixed(3) + ')';
  c.lineWidth = Math.max(1.5, h * 0.045);
  rr(c, -w / 2, -h / 2, w, h, h * 0.12);
  c.stroke();

  drawGpuFan(c, -w * 0.2, h * 0.06, h * 0.32, t * 7);
  drawGpuFan(c, w * 0.17, h * 0.06, h * 0.32, t * 7 + 0.7);

  c.fillStyle = '#c9ffbb';
  c.font = '700 ' + Math.max(7, Math.round(h * 0.25)) + 'px system-ui, sans-serif';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText('RTX 5090', -w * 0.46, -h * 0.5 + h * 0.2);

  c.fillStyle = '#76ff5e';
  c.fillRect(w * 0.33, -h * 0.44, w * 0.12, h * 0.15);
  c.restore();
}

/* ---------------------------------- speech ---------------------------------- */

function drawBubble(c, s, tipX, tipY, boxX, boxY, lines, alpha) {
  if (alpha <= 0.02) return;
  c.save();
  c.globalAlpha = alpha;
  c.font = '700 ' + Math.round(25 * s) + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, c.measureText(l).width);
  const padX = 18 * s;
  const padY = 13 * s;
  const lh = 32 * s;
  const w = maxW + padX * 2;
  const h = lines.length * lh + padY * 2 - lh * 0.15;

  // tail
  c.fillStyle = 'rgba(255,250,240,0.97)';
  c.beginPath();
  c.moveTo(boxX + w * 0.14, boxY + h - 3);
  c.lineTo(tipX, tipY);
  c.lineTo(boxX + w * 0.34, boxY + h - 3);
  c.closePath();
  c.fill();

  rr(c, boxX, boxY, w, h, 14 * s);
  c.fill();
  c.strokeStyle = 'rgba(60,48,72,0.35)';
  c.lineWidth = 1.5 * s;
  rr(c, boxX, boxY, w, h, 14 * s);
  c.stroke();

  c.fillStyle = '#211c2a';
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  for (let i = 0; i < lines.length; i++) {
    c.fillText(lines[i], boxX + padX, boxY + padY + lh * (i + 0.5) - lh * 0.08);
  }
  c.restore();
}

/* ----------------------------------- stamp ---------------------------------- */

function drawStamp(c, W, H, s, cx, cy, t, alpha) {
  if (alpha <= 0.01) return;
  const fs = Math.min(W * 0.034, H * 0.062);
  const text = 'NOT A CHINESE SPY';
  c.save();
  c.font = '900 ' + Math.round(fs) + 'px "Arial Black", Impact, system-ui, sans-serif';
  const tw = c.measureText(text).width;
  const padX = fs * 0.55;
  const boxW = tw + padX * 2;
  const boxH = fs * 1.55;
  const px = clamp(cx, boxW / 2 + 18, W - boxW / 2 - 18);
  const py = clamp(cy, boxH / 2 + 18, H - boxH / 2 - 18);

  const land = clamp((t - T_STAMP) / 0.3, 0, 1);
  const pop = lerp(2.3, 1, easeOut(land));
  const jitter = land < 1 ? (1 - land) * 3 : 0;

  c.translate(px + Math.sin(t * 90) * jitter, py + Math.cos(t * 77) * jitter);
  c.rotate(-0.06);
  c.scale(pop, pop);
  c.globalAlpha = alpha;

  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(255,45,85,0.95)';
  c.lineWidth = Math.max(3, fs * 0.14);
  rr(c, -boxW / 2, -boxH / 2, boxW, boxH, fs * 0.13);
  c.stroke();
  c.lineWidth = Math.max(1.4, fs * 0.032);
  rr(c, -boxW / 2 + fs * 0.15, -boxH / 2 + fs * 0.13, boxW - fs * 0.3, boxH - fs * 0.26, fs * 0.1);
  c.stroke();

  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = fs * 0.25;
  c.lineWidth = Math.max(3, fs * 0.16);
  c.strokeStyle = 'rgba(255,250,245,0.9)';
  c.strokeText(text, 0, fs * 0.03);
  c.shadowBlur = 0;
  c.fillStyle = 'rgba(255,50,90,0.97)';
  c.fillText(text, 0, fs * 0.03);

  c.restore();
}

/* ----------------------------------- sounds --------------------------------- */

function makeBeats() {
  const beats = [];
  const add = (t, fn) => beats.push({ t, fn, on: false });
  add(0.4, (c) => c.sound.noise(140));
  add(1.15, (c) => c.sound.beep(130, 40));
  add(1.85, (c) => c.sound.beep(118, 40));
  add(2.55, (c) => c.sound.beep(112, 40));
  add(3.25, (c) => c.sound.beep(118, 40));
  add(1.7, (c) => { c.sound.beep(523, 110); c.sound.beep(659, 140); });
  add(5.6, (c) => c.sound.noise(120));
  add(5.9, (c) => { c.sound.beep(1046, 90); c.sound.beep(1568, 120); });
  add(6.15, (c) => c.sound.beep(2093, 150));
  add(9.3, (c) => { c.sound.beep(392, 200); c.sound.beep(330, 240); });
  add(11.2, (c) => { c.sound.beep(880, 70); c.sound.beep(1174, 90); });
  add(13.6, (c) => c.sound.beep(196, 220));
  add(15.4, (c) => { c.sound.noise(240); c.sound.beep(70, 340); });
  add(16.0, (c) => c.sound.beep(1500, 90));
  add(17.9, (c) => c.sound.beep(620, 180));
  add(18.5, (c) => c.sound.beep(520, 200));
  add(19.2, (c) => c.sound.beep(430, 220));
  add(20.0, (c) => c.sound.beep(350, 240));
  add(20.9, (c) => c.sound.beep(290, 260));
  add(22.4, (c) => c.sound.beep(250, 240));
  add(23.4, (c) => c.sound.beep(210, 300));
  add(25.0, (c) => c.sound.beep(180, 340));
  add(27.2, (c) => c.sound.beep(150, 420));
  add(29.4, (c) => c.sound.beep(120, 500));
  return beats;
}

/* --------------------------------- lifecycle -------------------------------- */

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const s = Math.min(H / 720, W / 1280);

  const sr = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : { x: W * 0.5, y: H * 0.14, w: W * 0.38, h: H * 0.62 };

  const standX = Math.max(W * 0.19, 90 * s);
  ENGINE = {
    W,
    H,
    s,
    sr,
    groundY: H * 0.9,
    standX,
    enterFrom: -W * 0.22,
    exitTo: -W * 0.26,
    target: { x: sr.x + sr.w * 0.5, y: sr.y + sr.h * 0.4 },
    beats: makeBeats(),
    ended: false,
  };
}

export function frame(ctx, t, dt) {
  const S = ENGINE;
  if (!S) return;
  const c = ctx.canvas;
  const { W, H, s, groundY, standX } = S;
  c.clearRect(0, 0, W, H);

  for (const b of S.beats) {
    if (!b.on && t >= b.t) {
      b.on = true;
      try { b.fn(ctx); } catch (e) { /* keep drawing */ }
    }
  }

  if (t >= T_END && !S.ended) {
    S.ended = true;
    ctx.done();
    return;
  }

  /* ------- derived timeline values ------- */
  const enterP = clamp((t - 0.2) / (T_ENTER_END - 0.2), 0, 1);
  const exitP = clamp((t - T_EXIT) / 7.6, 0, 1);
  let jx;
  let moving = false;
  let faceLeft = false;
  let walk = 0;
  if (t < T_ENTER_END) {
    jx = lerp(S.enterFrom, standX, easeOut(enterP));
    moving = true;
    walk = t * 9.5;
  } else if (t >= T_EXIT) {
    jx = lerp(standX, S.exitTo, easeInOut(exitP));
    moving = exitP < 0.98;
    walk = t * 10.5;
    faceLeft = true;
  } else {
    jx = standX;
    walk = t * 1.8;
  }

  const mood = smooth(clamp((t - (T_STAMP + 0.15)) / 1.6, 0, 1));
  const cry = clamp((t - 18.2) / 2.0, 0, 1);
  const glow = t >= T_CARD && t < T_STAMP
    ? 0.6 + 0.4 * Math.sin(t * 4)
    : 0.15;
  const armUp = smooth(clamp((t - 5.35) / 0.6, 0, 1)) * (1 - smooth(clamp((t - T_STAMP) / 0.8, 0, 1)));

  let shake = 0;
  if (t >= T_STAMP && t < T_STAMP + 0.55) {
    const p = (t - T_STAMP) / 0.55;
    shake = (1 - p) * 15 * s;
  }

  c.save();
  if (shake > 0) {
    c.translate(Math.sin(t * 91) * shake, Math.cos(t * 73) * shake);
  }

  /* ------- ground shadow (soft, translucent) ------- */
  const shX = jx;
  const shW = 88 * s;
  const shH = 20 * s;
  const sg = c.createRadialGradient(shX, groundY, 2, shX, groundY, shW * 0.7);
  sg.addColorStop(0, 'rgba(0,0,0,0.32)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  c.save();
  c.translate(0, 0);
  c.scale(1, shH / shW);
  c.fillStyle = sg;
  c.beginPath();
  c.arc(shX, groundY / (shH / shW), shW * 0.7, 0, TAU);
  c.fill();
  c.restore();

  /* ------- hearts ------- */
  const headX = jx + 26 * s;
  const headY = groundY - 224 * s;
  for (let i = 0; i < 11; i++) {
    const st = 5.9 + i * 0.52;
    const dur = 3.0;
    const p = (t - st) / dur;
    if (p < 0 || p > 1.05) continue;
    if (t >= T_STAMP) continue;
    const alpha = Math.sin(clamp(p, 0, 1) * Math.PI) * 0.9;
    const wob = Math.sin(p * 8 + i * 1.3) * 18 * s;
    const x = lerp(headX, S.target.x, easeOut(clamp(p, 0, 1))) + wob;
    const y = lerp(headY, S.target.y, easeOut(clamp(p, 0, 1))) - Math.sin(p * Math.PI) * 40 * s;
    drawHeart(c, x, y, (10 + (i % 3) * 3) * s, alpha, i % 2 ? '#ff5f8f' : '#ff8fb0', false);
  }

  // hearts pop into broken ones after the stamp
  if (t >= T_STAMP) {
    for (let i = 0; i < 7; i++) {
      const st = T_STAMP + i * 0.1;
      const p = (t - st) / 1.7;
      if (p < 0 || p > 1) continue;
      const bx = S.target.x + (i - 3) * 46 * s + Math.sin(p * 5 + i) * 8 * s;
      const by = S.target.y - 10 * s + p * p * 150 * s;
      drawHeart(c, bx, by, 13 * s, (1 - p) * 0.85, '#ff5f8f', true);
    }
  }

  /* ------- Jensen ------- */
  drawJensen(c, {
    k: s,
    x: jx,
    y: groundY,
    t,
    mood,
    cry,
    walk,
    moving,
    faceLeft,
    armUp,
    glow,
    showCard: t >= T_CARD - 0.1 && t < T_STAMP,
  });

  /* ------- dropped card ------- */
  if (t >= T_STAMP + 0.12) {
    const fallT = t - (T_STAMP + 0.12);
    const x0 = standX + 86 * s;
    const y0 = groundY - 148 * s;
    const gx = standX + 118 * s;
    const gyFlat = groundY - 16 * s;
    let gxNow = x0;
    let gyNow = y0;
    let rot = -0.14;
    if (fallT < 0.7) {
      const p = fallT / 0.7;
      gyNow = lerp(y0, gyFlat, p * p);
      gxNow = lerp(x0, gx, p);
      rot = lerp(-0.14, 0.35, p);
    } else {
      const q = fallT - 0.7;
      const bounce = Math.max(0, Math.sin(q * 11)) * Math.exp(-q * 8) * 26 * s;
      gyNow = gyFlat - bounce;
      gxNow = gx;
      rot = 0.35 + Math.sin(q * 8) * 0.05 * Math.exp(-q * 6);
    }
    drawGpu(c, gxNow, gyNow, 92 * s, 50 * s, rot, 0.12 + 0.12 * Math.sin(t * 3), t);

    if (t > 23.2) {
      const a = clamp((t - 23.2) / 0.6, 0, 1);
      c.save();
      c.globalAlpha = a * 0.95;
      c.translate(gx + 104 * s, gyFlat - 4 * s);
      c.rotate(0.1);
      c.fillStyle = 'rgba(255,252,244,0.96)';
      c.fillRect(-25 * s, -17 * s, 50 * s, 34 * s);
      c.strokeStyle = 'rgba(60,48,72,0.4)';
      c.lineWidth = 1.4 * s;
      c.strokeRect(-25 * s, -17 * s, 50 * s, 34 * s);
      c.fillStyle = '#2a2230';
      c.font = '800 ' + Math.round(17 * s) + 'px system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('FREE', 0, 1 * s);
      c.restore();
    }

    for (let i = 0; i < 4; i++) {
      const a = t * 1.3 + i * 1.7;
      drawSparkle(
        c,
        gx + Math.cos(a) * 62 * s,
        gyFlat - 40 * s + Math.sin(a * 1.4) * 20 * s,
        5 * s,
        0.25 + 0.2 * Math.sin(t * 2.5 + i),
        '#b6ffd0'
      );
    }
  }

  /* ------- speech bubbles ------- */
  for (const bb of BUBBLES) {
    if (t < bb.from || t > bb.to) continue;
    const a = Math.min(
      clamp((t - bb.from) / 0.18, 0, 1),
      clamp((bb.to - t) / 0.28, 0, 1)
    );
    drawBubble(
      c,
      s,
      jx + 22 * s,
      groundY - 232 * s,
      jx + 58 * s,
      groundY - 352 * s,
      bb.lines,
      a
    );
  }

  /* ------- the stamp ------- */
  const stampAlpha = clamp((t - T_STAMP) / 0.12, 0, 1) * (1 - clamp((t - 29.2) / 1.2, 0, 1));
  if (t >= T_STAMP && stampAlpha > 0.01) {
    const cx = S.sr.x + S.sr.w * 0.5;
    const fs = Math.min(W * 0.034, H * 0.062);
    const cy = Math.max(fs * 1.25, S.sr.y - fs * 0.85);
    drawStamp(c, W, H, s, cx, cy, t, stampAlpha);

    // impact rings
    for (let i = 0; i < 2; i++) {
      const p = clamp((t - T_STAMP - i * 0.1) / 1.1, 0, 1);
      if (p <= 0 || p >= 1) continue;
      c.save();
      c.globalAlpha = (1 - p) * 0.5;
      c.strokeStyle = '#ff3d68';
      c.lineWidth = 3 * s * (1 - p) + 1;
      c.beginPath();
      c.arc(cx, cy, (60 + p * 340) * s, 0, TAU);
      c.stroke();
      c.restore();
    }

    // ink flecks around the box
    const ff = Math.min(2, stampAlpha);
    c.save();
    c.globalAlpha = 0.55 * ff;
    c.fillStyle = '#ff3d68';
    for (let i = 0; i < 14; i++) {
      const ang = (i * 2.399) % TAU;
      const rad = (110 + (i % 5) * 26) * s;
      const px = cx + Math.cos(ang) * rad * 1.7;
      const py = cy + Math.sin(ang) * rad * 0.55;
      c.beginPath();
      c.arc(px, py, (1.5 + (i % 3)) * s, 0, TAU);
      c.fill();
    }
    c.restore();
  }

  c.restore();
}

export function dispose() {
  ENGINE = null;
}
