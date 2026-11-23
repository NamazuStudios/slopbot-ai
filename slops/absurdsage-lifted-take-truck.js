export const meta = {
  title: 'Lifted Take Truck',
  author: 'absurdsage',
  prompt: 'a lifted pickup truck that fills the screen drives into frame, a bald moron rolls down the window and makes various specious criticisms of equality and justice',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

let S = null;

const CLAMP = (v, a, b) => Math.max(a, Math.min(b, v));
const LERP = (a, b, p) => a + (b - a) * p;
const easeOut = (x) => 1 - Math.pow(1 - CLAMP(x, 0, 1), 3);
const easeIn = (x) => Math.pow(CLAMP(x, 0, 1), 2.6);
const smooth = (x) => {
  x = CLAMP(x, 0, 1);
  return x * x * (3 - 2 * x);
};

const CAPTIONS = [
  { t0: 0.35, t1: 2.7, text: 'A LIFTED OPINION-DELIVERY VEHICLE APPROACHES.' },
  { t0: 2.8, t1: 5.2, text: 'PLEASE STAND CLEAR OF THE WINDOW OF WISDOM.' },
  { t0: 5.3, t1: 7.7, text: 'DURR. HERP. LEEDLE. THE SACRED TRINITY.' },
  { t0: 7.8, t1: 9.9, text: 'HE HAS OPINIONS ABOUT EQUALITY. HE HAS NO SOURCES.' },
  { t0: 10.0, t1: 12.4, text: 'SORRY ABOUT THE MUD, SAVORYSAILOR.' },
];

const TAKES = [
  { t0: 3.35, t1: 5.3, text: 'IF EVERYBODY IS EQUAL, WHY IS MY TRUCK SO MUCH BIGGER?' },
  { t0: 5.6, t1: 7.6, text: 'JUSTICE IS WHEN I GET THE GOOD PARKING SPOT.' },
  { t0: 7.9, t1: 9.6, text: 'I READ HALF A FORUM POST. I AM BASICALLY A SCHOLAR.' },
];

const BURSTS = [
  { at: 3.62, dur: 0.95, label: 'DURR', rot: -0.12, color: '#ffd23f' },
  { at: 5.92, dur: 0.95, label: 'HERP', rot: 0.1, color: '#5ee6c8' },
  { at: 8.12, dur: 1.1, label: 'LEEDLE', rot: -0.06, color: '#ff8ad1' },
];

/* ------------------------------------------------------------------ */
/* init / dispose                                                      */
/* ------------------------------------------------------------------ */

export function init(ctx) {
  S = {
    fired: new Set(),
    mud: [],
    dust: [],
    splats: [],
    rumble: 0,
    mudAcc: 0,
    dustAcc: 0,
    splatAcc: 0,
    seedA: ctx.rand(),
  };
}

export function dispose() {
  S = null;
}

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

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

function beep(ctx, f, ms) {
  try { ctx.sound.beep(f, ms); } catch (e) { /* muted */ }
}

function noise(ctx, ms) {
  try { ctx.sound.noise(ms); } catch (e) { /* muted */ }
}

function once(ctx, t, key, at, fn) {
  if (t >= at && !S.fired.has(key)) {
    S.fired.add(key);
    try { fn(); } catch (e) { /* ignore */ }
  }
}

function wrapText(c, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (c.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ------------------------------------------------------------------ */
/* truck drawing                                                       */
/* ------------------------------------------------------------------ */

function drawWheel(c, x, y, r, ang, accent) {
  c.save();
  c.translate(x, y);
  // tire
  c.fillStyle = '#15171f';
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  // tread blocks
  c.fillStyle = '#242833';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + ang * 0.4;
    const px = Math.cos(a) * (r * 0.93);
    const py = Math.sin(a) * (r * 0.93);
    c.save();
    c.translate(px, py);
    c.rotate(a);
    c.fillRect(-r * 0.1, -r * 0.05, r * 0.2, r * 0.1);
    c.restore();
  }
  // rim
  c.fillStyle = '#3c4252';
  c.beginPath();
  c.arc(0, 0, r * 0.66, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#cfd6e4';
  c.lineWidth = r * 0.07;
  c.beginPath();
  c.arc(0, 0, r * 0.55, 0, Math.PI * 2);
  c.stroke();
  // spokes
  c.save();
  c.rotate(ang);
  c.strokeStyle = '#b9c1d1';
  c.lineWidth = r * 0.09;
  c.lineCap = 'round';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
    c.stroke();
  }
  c.fillStyle = accent;
  c.beginPath();
  c.arc(0, 0, r * 0.17, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.restore();
}

function drawDriver(c, open, headBob, talk, accent) {
  if (open <= 0.02) return;
  c.save();
  rr(c, 48, -224, 200, 146, 14);
  c.clip();
  c.globalAlpha = CLAMP(open, 0, 1);

  const hx = 150;
  const hy = -142 + headBob;

  // shoulders / tank top
  c.fillStyle = '#e9edf5';
  rr(c, hx - 82, hy + 70, 164, 90, 26);
  c.fill();
  c.fillStyle = '#cfd6e4';
  rr(c, hx - 12, hy + 70, 24, 90, 9);
  c.fill();

  // neck
  c.fillStyle = '#d7a578';
  rr(c, hx - 20, hy + 36, 40, 42, 12);
  c.fill();

  // bald head
  c.fillStyle = '#e8b98e';
  c.beginPath();
  c.ellipse(hx, hy, 47, 52, 0, 0, Math.PI * 2);
  c.fill();
  // shiny dome
  c.fillStyle = 'rgba(255,255,255,0.32)';
  c.beginPath();
  c.ellipse(hx - 15, hy - 30, 16, 12, -0.5, 0, Math.PI * 2);
  c.fill();
  // ear
  c.fillStyle = '#d9a97c';
  c.beginPath();
  c.ellipse(hx - 44, hy + 6, 8, 12, 0, 0, Math.PI * 2);
  c.fill();

  // sunglasses
  c.fillStyle = '#10121a';
  rr(c, hx - 38, hy - 14, 32, 18, 7);
  c.fill();
  rr(c, hx + 2, hy - 14, 32, 18, 7);
  c.fill();
  c.fillStyle = '#2b3040';
  rr(c, hx - 8, hy - 10, 14, 5, 2);
  c.fill();

  // nose
  c.fillStyle = '#d9a97c';
  c.beginPath();
  c.ellipse(hx + 12, hy + 10, 9, 7, 0.3, 0, Math.PI * 2);
  c.fill();

  // mouth
  const mo = 3 + talk * 15;
  c.fillStyle = '#5a1d22';
  c.beginPath();
  c.ellipse(hx + 8, hy + 28, 15, mo, 0, 0, Math.PI * 2);
  c.fill();
  if (talk > 0.35) {
    c.fillStyle = '#f4f0ea';
    rr(c, hx - 2, hy + 20, 22, 6, 3);
    c.fill();
  }

  c.restore();
}

function drawTruck(c, ctx, X, Y, s, opt) {
  const accent = ctx.accent || '#ff4fa3';
  const navy = ctx.bg || '#1b2340';
  const open = opt.open;
  const wheelAng = opt.wheelAng;

  c.save();
  c.translate(X, Y);
  c.scale(s, s);

  // shadow under truck
  c.save();
  c.globalAlpha = 0.3;
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(20, 258, 470, 26, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // exhaust puffs
  if (opt.exhaust > 0) {
    c.save();
    c.globalAlpha = opt.exhaust * 0.35;
    c.fillStyle = '#8d94a6';
    for (let i = 0; i < 3; i++) {
      const ex = -430 - i * 34 - (opt.wheelAng * 6) % 30;
      const ey = 60 - i * 12;
      c.beginPath();
      c.arc(ex, ey, 14 + i * 9, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // axles + suspension
  c.strokeStyle = '#2a2f3d';
  c.lineWidth = 20;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-290, 138); c.lineTo(-290, 78);
  c.moveTo(320, 138); c.lineTo(320, 78);
  c.stroke();
  c.strokeStyle = '#4a5165';
  c.lineWidth = 10;
  c.beginPath();
  c.moveTo(-290, 138); c.lineTo(-230, 80);
  c.moveTo(320, 138); c.lineTo(380, 80);
  c.stroke();

  // wheels
  drawWheel(c, -290, 138, 112, wheelAng, accent);
  drawWheel(c, 320, 138, 112, wheelAng, accent);

  // ladder frame
  c.fillStyle = '#20242f';
  rr(c, -405, 66, 850, 42, 9);
  c.fill();

  // rear bumper
  c.fillStyle = '#343b4d';
  rr(c, -455, 32, 44, 60, 10);
  c.fill();

  // bed
  c.fillStyle = accent;
  rr(c, -432, -86, 462, 160, 20);
  c.fill();
  // darker bed end
  c.fillStyle = 'rgba(0,0,0,0.18)';
  rr(c, -432, -86, 70, 160, 20);
  c.fill();
  // rail highlight
  c.fillStyle = 'rgba(255,255,255,0.24)';
  rr(c, -424, -80, 444, 16, 8);
  c.fill();
  // mud flap
  c.fillStyle = '#191c26';
  rr(c, -360, 120, 66, 74, 8);
  c.fill();
  // sticker on bed
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.85)';
  c.font = '700 24px sans-serif';
  c.textAlign = 'center';
  c.fillText('LOUD & UNSURE', -210, 12);
  c.restore();

  // fender flares
  c.fillStyle = '#1c202b';
  c.beginPath();
  c.arc(-290, 100, 132, Math.PI, Math.PI * 2);
  c.lineTo(-290 + 132, 96);
  c.lineTo(-290 - 132, 96);
  c.closePath();
  c.fill();
  c.beginPath();
  c.arc(320, 100, 132, Math.PI, Math.PI * 2);
  c.lineTo(320 + 132, 96);
  c.lineTo(320 - 132, 96);
  c.closePath();
  c.fill();

  // cab
  c.fillStyle = accent;
  c.beginPath();
  c.moveTo(28, 74);
  c.lineTo(28, -150);
  c.lineTo(88, -240);
  c.lineTo(256, -240);
  c.lineTo(306, -150);
  c.lineTo(306, 74);
  c.closePath();
  c.fill();
  // cab shade
  c.fillStyle = 'rgba(0,0,0,0.14)';
  c.beginPath();
  c.moveTo(28, -150);
  c.lineTo(28, 74);
  c.lineTo(96, 74);
  c.lineTo(96, -150);
  c.closePath();
  c.fill();

  // window glass
  c.fillStyle = '#0e1626';
  rr(c, 48, -224, 200, 146, 16);
  c.fill();
  // glass sheen
  c.save();
  rr(c, 48, -224, 200, 146, 16);
  c.clip();
  c.fillStyle = 'rgba(140,200,255,0.12)';
  c.beginPath();
  c.moveTo(70, -240);
  c.lineTo(130, -240);
  c.lineTo(60, -70);
  c.lineTo(10, -70);
  c.closePath();
  c.fill();
  c.restore();

  // driver
  drawDriver(c, open, opt.headBob, opt.talk, accent);

  // window frame
  c.strokeStyle = '#2a3040';
  c.lineWidth = 10;
  rr(c, 48, -224, 200, 146, 16);
  c.stroke();

  // door + handle
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(36, -60);
  c.lineTo(36, 62);
  c.stroke();
  c.fillStyle = '#242a38';
  rr(c, 240, -46, 46, 16, 7);
  c.fill();

  // hood
  c.fillStyle = accent;
  c.beginPath();
  c.moveTo(300, 74);
  c.lineTo(302, -46);
  c.lineTo(424, -46);
  c.lineTo(444, 8);
  c.lineTo(444, 74);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.2)';
  rr(c, 312, -38, 100, 12, 6);
  c.fill();

  // grille / headlight / bumper
  c.fillStyle = '#2b3142';
  rr(c, 418, -34, 30, 62, 7);
  c.fill();
  c.fillStyle = '#ffe9a8';
  rr(c, 408, -24, 16, 26, 6);
  c.fill();
  c.fillStyle = '#3a4154';
  rr(c, 428, 38, 32, 50, 8);
  c.fill();

  // roof lights
  c.fillStyle = '#2a3040';
  rr(c, 92, -260, 150, 22, 9);
  c.fill();
  for (let i = 0; i < 4; i++) {
    c.fillStyle = i % 2 ? '#ffd23f' : '#9fb4ff';
    c.beginPath();
    c.arc(118 + i * 32, -249, 7, 0, Math.PI * 2);
    c.fill();
  }

  // mirror
  c.strokeStyle = '#2a3040';
  c.lineWidth = 8;
  c.beginPath();
  c.moveTo(298, -196);
  c.lineTo(334, -206);
  c.stroke();
  c.fillStyle = '#20242f';
  rr(c, 330, -222, 20, 34, 7);
  c.fill();

  // front mud flap / accent stripe
  c.fillStyle = 'rgba(255,255,255,0.3)';
  rr(c, -424, 30, 430, 8, 4);
  c.fill();
  c.fillStyle = navy;
  c.globalAlpha = 0.5;
  rr(c, 44, 48, 250, 10, 5);
  c.fill();
  c.globalAlpha = 1;

  c.restore();
}

/* ------------------------------------------------------------------ */
/* bubble / burst / caption                                            */
/* ------------------------------------------------------------------ */

function drawBubble(c, W, H, text, alpha, pop, tailX, tailY) {
  const fs = Math.round(CLAMP(W * 0.0215, 17, 33));
  c.save();
  c.font = `900 ${fs}px sans-serif`;
  const maxW = Math.min(W * 0.44, 760);
  const lines = wrapText(c, text, maxW - fs * 1.6);
  let widest = 0;
  for (const l of lines) widest = Math.max(widest, c.measureText(l).width);
  const bw = widest + fs * 1.8;
  const lh = fs * 1.24;
  const bh = lines.length * lh + fs * 1.1;
  const bx = W * 0.5 - bw * 0.5 - W * 0.02;
  const by = H * 0.055;

  c.globalAlpha = alpha;
  c.translate(bx + bw / 2, by + bh / 2);
  c.scale(pop, pop);
  c.translate(-(bx + bw / 2), -(by + bh / 2));

  // tail
  const tx = CLAMP(tailX, bx + 40, bx + bw - 40);
  c.fillStyle = 'rgba(10,12,24,0.9)';
  c.beginPath();
  c.moveTo(tx - 18, by + bh - 4);
  c.lineTo(tailX, tailY);
  c.lineTo(tx + 22, by + bh - 4);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = 4;
  c.stroke();

  // body
  c.fillStyle = 'rgba(10,12,24,0.9)';
  rr(c, bx, by, bw, bh, 20);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.9)';
  c.lineWidth = 4;
  c.stroke();

  // text
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let ty = by + fs * 0.55 + lh * 0.5;
  for (const l of lines) {
    c.fillText(l, bx + bw / 2, ty);
    ty += lh;
  }
  c.restore();
}

function drawBurst(c, W, H, x, y, label, p, rot, color, alpha) {
  const fs = Math.round(CLAMP(W * 0.052, 34, 92));
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(p, p);
  c.globalAlpha = alpha;
  // star
  c.beginPath();
  const spikes = label.length > 4 ? 14 : 12;
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 ? fs * 1.42 : fs * 0.95;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad * 0.62;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.strokeStyle = '#141828';
  c.lineWidth = 6;
  c.stroke();

  c.font = `900 ${fs}px sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineWidth = 8;
  c.strokeStyle = '#141828';
  c.strokeText(label, 0, 2);
  c.fillStyle = '#141828';
  c.fillText(label, 0, 2);
  c.restore();
}

function drawCaption(c, W, H, text, alpha) {
  if (alpha <= 0.01) return;
  const fs = Math.round(CLAMP(W * 0.019, 16, 31));
  c.save();
  c.font = `900 ${fs}px sans-serif`;
  const tw = c.measureText(text).width;
  const bw = Math.min(W * 0.9, tw + fs * 2.6);
  const bh = fs * 2.1;
  const bx = (W - bw) / 2;
  const by = H - bh - fs * 0.8;
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(10,12,24,0.86)';
  rr(c, bx, by, bw, bh, bh / 2);
  c.fill();
  c.strokeStyle = '#ffffff';
  c.lineWidth = 2.5;
  c.stroke();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, W / 2, by + bh / 2);
  c.restore();
}

/* ------------------------------------------------------------------ */
/* splats                                                              */
/* ------------------------------------------------------------------ */

function makeSplat(ctx, W, H) {
  const side = ctx.rand();
  let x, y;
  if (side < 0.35) {
    x = W * (0.02 + ctx.rand() * 0.16);
    y = H * (0.12 + ctx.rand() * 0.7);
  } else if (side < 0.7) {
    x = W * (0.82 + ctx.rand() * 0.16);
    y = H * (0.1 + ctx.rand() * 0.7);
  } else {
    x = W * (0.1 + ctx.rand() * 0.8);
    y = H * (ctx.rand() < 0.5 ? 0.04 + ctx.rand() * 0.08 : 0.86 + ctx.rand() * 0.1);
  }
  const r = W * (0.012 + ctx.rand() * 0.035);
  const pts = [];
  const n = 9;
  for (let i = 0; i < n; i++) pts.push(0.62 + ctx.rand() * 0.55);
  return { x, y, r, pts, life: 2.6, maxLife: 2.6, brown: ctx.rand() < 0.7 };
}

function drawSplat(c, sp) {
  const a = CLAMP(sp.life / 0.5, 0, 1) * 0.72;
  if (a <= 0.01) return;
  c.save();
  c.globalAlpha = a;
  c.translate(sp.x, sp.y);
  c.beginPath();
  const n = sp.pts.length;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2;
    const rad = sp.r * sp.pts[i];
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = sp.brown ? '#4b3822' : '#3a2c1c';
  c.fill();
  c.strokeStyle = '#2a1f13';
  c.lineWidth = 3;
  c.stroke();
  // droplet satellites
  c.fillStyle = sp.brown ? '#4b3822' : '#3a2c1c';
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.7;
    c.beginPath();
    c.arc(Math.cos(ang) * sp.r * 1.55, Math.sin(ang) * sp.r * 1.55, sp.r * 0.18, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/* ------------------------------------------------------------------ */
/* main frame                                                          */
/* ------------------------------------------------------------------ */

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  dt = CLAMP(dt || 0, 0, 0.05);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  const accent = ctx.accent || '#ff4fa3';
  const s = Math.min(W / 1180, H / 720);
  const groundY = H * 0.9;

  /* ---- sound schedule ---- */
  once(ctx, t, 'start', 0.02, () => noise(ctx, 420));
  once(ctx, t, 'winopen1', 2.5, () => beep(ctx, 330, 110));
  once(ctx, t, 'winopen2', 2.64, () => beep(ctx, 460, 90));
  once(ctx, t, 'd1', 3.66, () => { beep(ctx, 300, 80); beep(ctx, 210, 110); });
  once(ctx, t, 'd2', 3.82, () => beep(ctx, 160, 140));
  once(ctx, t, 'h1', 5.96, () => { beep(ctx, 260, 80); beep(ctx, 180, 110); });
  once(ctx, t, 'h2', 6.12, () => beep(ctx, 140, 140));
  once(ctx, t, 'l1', 8.16, () => beep(ctx, 380, 70));
  once(ctx, t, 'l2', 8.28, () => beep(ctx, 500, 70));
  once(ctx, t, 'l3', 8.4, () => beep(ctx, 640, 90));
  once(ctx, t, 'winclose1', 9.55, () => beep(ctx, 520, 80));
  once(ctx, t, 'winclose2', 9.66, () => beep(ctx, 300, 110));
  once(ctx, t, 'peel', 9.94, () => noise(ctx, 480));
  once(ctx, t, 'land', 11.4, () => noise(ctx, 300));
  once(ctx, t, 'done', 12.4, () => { try { ctx.done(); } catch (e) {} });

  const rumbleActive = t < 3.25 || (t > 9.92 && t < 11.85);
  if (rumbleActive) {
    S.rumble -= dt;
    if (S.rumble <= 0) {
      S.rumble = 0.15 + ctx.rand() * 0.07;
      beep(ctx, 50 + ctx.rand() * 24, 75);
    }
  }

  /* ---- truck motion ---- */
  let tx;
  if (t < 2.3) tx = LERP(-0.62, 0.46, easeOut(t / 2.3));
  else if (t < 9.9) tx = 0.46;
  else tx = LERP(0.46, 1.75, easeIn((t - 9.9) / 1.8));

  let bob = 0;
  if (t > 2.0 && t < 9.9) {
    const k = t - 2.0;
    bob = Math.sin(k * 10) * Math.exp(-k * 2.4) * 16 + Math.sin(t * 2.1) * 2.5;
  }
  const wheelAng = t * 8.5;

  // window open amount
  let open = 0;
  if (t > 2.45 && t < 3.2) open = smooth((t - 2.45) / 0.75);
  else if (t >= 3.2 && t < 9.5) open = 1;
  else if (t >= 9.5 && t < 10.05) open = 1 - smooth((t - 9.5) / 0.55);

  // talking mouth
  let talk = 0;
  for (const take of TAKES) {
    if (t > take.t0 + 0.1 && t < take.t1) talk = 0.5 + 0.5 * Math.sin(t * 22);
  }

  const headBob = Math.sin(t * 5.5) * 3;
  const exhaust = (t < 3.2 ? 1 : t > 9.9 && t < 11.8 ? 1 : 0) * (0.6 + 0.4 * Math.sin(t * 9));

  /* ---- particles spawn ---- */
  const moving = t < 2.3 || (t > 9.9 && t < 11.9);
  const speedKick = t > 9.9 ? 1.6 : 1;

  if (moving) {
    S.dustAcc += dt;
    while (S.dustAcc > 0.045) {
      S.dustAcc -= 0.045;
      const rx = tx * W - 290 * s;
      const ry = groundY + 118 * s;
      S.dust.push({
        x: rx + (ctx.rand() - 0.5) * 70,
        y: ry + (ctx.rand() - 0.5) * 26,
        vx: -40 - ctx.rand() * 130 * speedKick,
        vy: -20 - ctx.rand() * 60,
        r: (16 + ctx.rand() * 30) * s * 0.6,
        life: 0.7 + ctx.rand() * 0.5,
        maxLife: 1.2,
        grey: 0.25 + ctx.rand() * 0.2,
      });
    }
  }

  if (t > 9.95 && t < 11.7) {
    S.mudAcc += dt;
    while (S.mudAcc > 0.018) {
      S.mudAcc -= 0.018;
      const rx = tx * W - 285 * s;
      const ry = groundY + 120 * s;
      for (let k = 0; k < 2; k++) {
        S.mud.push({
          x: rx + (ctx.rand() - 0.5) * 80 * s,
          y: ry + (ctx.rand() - 0.5) * 40 * s,
          vx: -260 - ctx.rand() * 780,
          vy: -280 - ctx.rand() * 720,
          r: (4 + ctx.rand() * 16) * s * 0.7,
          life: 0.9 + ctx.rand() * 0.9,
        });
      }
    }
  }

  // splats thrown at the glass during the peel-out
  if (t > 10.05 && t < 11.4) {
    S.splatAcc += dt;
    while (S.splatAcc > 0.17) {
      S.splatAcc -= 0.17;
      if (S.splats.length < 22) S.splats.push(makeSplat(ctx, W, H));
    }
  }

  /* ---- update particles ---- */
  for (const p of S.dust) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy -= 16 * dt;
    p.r += 26 * dt;
    p.life -= dt;
  }
  S.dust = S.dust.filter((p) => p.life > 0);
  if (S.dust.length > 90) S.dust.splice(0, S.dust.length - 90);

  const gravity = 1250;
  for (const p of S.mud) {
    p.vy += gravity * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  S.mud = S.mud.filter((p) => p.life > 0 && p.y < H + 80);
  if (S.mud.length > 240) S.mud.splice(0, S.mud.length - 240);

  for (const sp of S.splats) sp.life -= dt;
  S.splats = S.splats.filter((sp) => sp.life > 0);

  /* ---- draw scene ---- */
  const fade = t > 11.9 ? 1 - smooth((t - 11.9) / 0.55) : 1;
  c.save();
  c.globalAlpha = fade;

  // camera shake on the peel-out
  let shakeX = 0;
  let shakeY = 0;
  if (t > 9.9 && t < 11.6) {
    const k = 1 - (t - 9.9) / 1.7;
    shakeX = Math.sin(t * 71) * 6 * k;
    shakeY = Math.cos(t * 63) * 5 * k;
  }
  c.translate(shakeX, shakeY);

  // dust behind
  for (const p of S.dust) {
    const a = CLAMP(p.life / p.maxLife, 0, 1) * 0.42;
    c.globalAlpha = a * fade;
    c.fillStyle = 'rgba(170,176,190,1)';
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = fade;

  // streamer marker behind the truck
  const st = ctx.streamer;
  if (st && t > 3.0 && t < 9.6) {
    const sx = st.x * W;
    const sy = st.y * H;
    const sw = st.w * W;
    const sh = st.h * H;
    c.save();
    c.globalAlpha = 0.45 * fade;
    c.strokeStyle = accent;
    c.lineWidth = 4;
    c.setLineDash([14, 12]);
    c.lineDashOffset = -t * 40;
    rr(c, sx, sy, sw, sh, 24);
    c.stroke();
    c.restore();
  }

  // truck
  c.save();
  c.globalAlpha = fade;
  drawTruck(c, ctx, tx * W, groundY + bob, s, {
    open,
    headBob,
    talk,
    wheelAng,
    exhaust,
  });
  c.restore();

  // mud in flight
  for (const p of S.mud) {
    const a = CLAMP(p.life / 0.35, 0, 1);
    c.globalAlpha = a * fade;
    c.fillStyle = '#4b3822';
    c.beginPath();
    c.ellipse(p.x, p.y, p.r, p.r * 1.35, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = fade;

  // splats on the glass
  for (const sp of S.splats) drawSplat(c, sp);

  // speech bubble
  const cabX = tx * W + 150 * s;
  const cabY = groundY - 250 * s;
  for (const take of TAKES) {
    if (t < take.t0 || t > take.t1) continue;
    const inA = smooth((t - take.t0) / 0.2);
    const outA = 1 - smooth((t - (take.t1 - 0.16)) / 0.16);
    const pop = 0.82 + 0.18 * easeOut((t - take.t0) / 0.24);
    drawBubble(c, W, H, take.text, CLAMP(Math.min(inA, outA), 0, 1) * fade, pop, cabX, cabY);
  }

  // comic bursts
  for (const b of BURSTS) {
    if (t < b.at || t > b.at + b.dur) continue;
    const k = (t - b.at) / b.dur;
    const p = 0.55 + 0.45 * easeOut((t - b.at) / 0.2) + Math.sin(t * 18) * 0.02;
    const a = CLAMP(1 - (k - 0.75) / 0.25, 0, 1);
    drawBurst(c, W, H, W * 0.7 + Math.sin(t * 7) * 6, H * 0.42, b.label, p * 1.05, b.rot, b.color, a * fade);
  }

  // streamer audience label
  if (st && t > 4.4 && t < 9.4) {
    const sx = (st.x + st.w / 2) * W;
    const sy = st.y * H;
    const fs = Math.round(CLAMP(W * 0.013, 12, 22));
    const label = 'TARGET AUDIENCE';
    c.save();
    c.font = `800 ${fs}px sans-serif`;
    const tw = c.measureText(label).width;
    c.globalAlpha = 0.8 * fade;
    c.fillStyle = 'rgba(10,12,24,0.85)';
    const bx = CLAMP(sx - tw / 2 - fs, 8, W - tw - fs * 2 - 8);
    const by = CLAMP(sy - fs * 2.6, 8, H * 0.5);
    rr(c, bx, by, tw + fs * 2, fs * 1.9, fs);
    c.fill();
    c.strokeStyle = accent;
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = '#fff';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, bx + (tw + fs * 2) / 2, by + fs * 0.95);
    // pointer
    c.beginPath();
    c.moveTo(sx - fs * 0.55, by + fs * 1.9);
    c.lineTo(sx + fs * 0.55, by + fs * 1.9);
    c.lineTo(sx, by + fs * 2.7);
    c.closePath();
    c.fillStyle = accent;
    c.fill();
    c.restore();
  }

  // speed lines during the peel-out
  if (t > 9.95 && t < 11.7) {
    c.save();
    c.globalAlpha = 0.35 * fade;
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.lineCap = 'round';
    for (let i = 0; i < 7; i++) {
      const yy = H * (0.2 + i * 0.09) + Math.sin(t * 12 + i) * 8;
      const len = W * (0.1 + 0.1 * ((i * 37) % 10) / 10);
      const xx = ((t * 2.4 + i * 0.17) % 1.3) * W - len;
      c.beginPath();
      c.moveTo(xx, yy);
      c.lineTo(xx + len, yy);
      c.stroke();
    }
    c.restore();
  }

  // captions
  for (const cap of CAPTIONS) {
    if (t < cap.t0 || t > cap.t1) continue;
    const a = CLAMP(Math.min((t - cap.t0) / 0.18, (cap.t1 - t) / 0.16), 0, 1);
    drawCaption(c, W, H, cap.text, a * fade);
  }

  c.restore();
}
