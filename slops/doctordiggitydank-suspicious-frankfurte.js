export const meta = {
  title: 'Suspicious Frankfurter',
  author: 'doctordiggitydank',
  prompt: 'a VERY large and endless, thick, drippy hotdog (with veins) and NO BUN inches into the screen from the left like an inchworm. it inches tow',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const T_ENTER = 0.4;
const T_REACH = 10.2;
const T_BOOP = 10.55;
const T_RETREAT = 13.0;
const T_END = 18.7;
const T_DONE = 19.05;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, p) => a + (b - a) * p;
const easeInOut = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);

let S = null;

function snd(ctx, key, fn) {
  if (!S || S.flags[key]) return;
  S.flags[key] = true;
  try {
    fn();
  } catch (e) {}
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const rnd = ctx.rand;
  S = {
    R: clamp(Math.min(H * 0.115, W * 0.085), 44, 135),
    Lmax: clamp(W * 0.6, 260, 900),
    phase: rnd() * Math.PI * 2,
    veins: [],
    drips: [],
    flags: {},
  };
  for (let i = 0; i < 16; i++) {
    S.veins.push({
      u: 0.06 + rnd() * 0.86,
      side: rnd() < 0.5 ? -1 : 1,
      amp: 0.16 + rnd() * 0.24,
      len: 0.04 + rnd() * 0.09,
      w: 1.4 + rnd() * 2.2,
      ph: rnd() * Math.PI * 2,
    });
  }
  for (let i = 0; i < 12; i++) {
    S.drips.push({
      u: 0.04 + rnd() * 0.88,
      len: 0.25 + rnd() * 0.75,
      sp: 0.4 + rnd() * 1.1,
      ph: rnd() * Math.PI * 2,
    });
  }
}

function aimTarget(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const s = ctx.streamer;
  if (s && s.w > 0 && s.h > 0) {
    return {
      x: clamp(s.x * W + s.w * W * 0.5, W * 0.3, W * 0.87),
      y: clamp(s.y * H + s.h * H * 0.44, H * 0.18, H * 0.8),
    };
  }
  return { x: W * 0.6, y: H * 0.46 };
}

function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, h / 2, w / 2);
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

export function frame(ctx, t, dt) {
  const W = ctx.width;
  const H = ctx.height;
  const c = ctx.canvas;
  c.clearRect(0, 0, W, H);
  if (!S) return;

  const R = S.R;
  const aim = aimTarget(ctx);
  const boopX = aim.x;
  const boopY = aim.y;
  const reachHeadX = boopX - R * 0.7;
  const startX = -R * 2.8;

  let headX;
  let bodyLen;
  let baseY = boopY;

  if (t < T_ENTER) {
    headX = startX;
    bodyLen = S.Lmax * 0.7;
  } else if (t < T_REACH) {
    const p = clamp((t - T_ENTER) / (T_REACH - T_ENTER), 0, 1);
    const e = easeInOut(p);
    headX = lerp(startX, reachHeadX, e) + Math.sin(p * Math.PI * 18) * R * 0.16 * (1 - p);
    bodyLen = S.Lmax * (0.62 + 0.3 * (0.5 + 0.5 * Math.sin(t * 5.4 + S.phase)));
    baseY = boopY + Math.sin(t * 1.6 + S.phase) * R * 0.12;
  } else if (t < T_RETREAT) {
    headX = reachHeadX + Math.sin((t - T_BOOP) * 7.0) * R * 0.05;
    bodyLen = S.Lmax * (0.6 + 0.22 * (0.5 + 0.5 * Math.sin(t * 4.4 + S.phase)));
    baseY = boopY + Math.sin((t - T_BOOP) * 2.0) * R * 0.03;
  } else {
    const p = clamp((t - T_RETREAT) / (T_END - T_RETREAT), 0, 1);
    const e = easeInOut(p);
    headX = lerp(reachHeadX, startX * 1.6, e);
    bodyLen = S.Lmax * (0.72 - 0.26 * e);
    baseY = boopY;
  }

  const tailX = headX - bodyLen;
  const N = 30;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    const cx = lerp(tailX, headX, u);
    const cy = baseY + Math.sin(u * 2.4 + t * 1.4 + S.phase) * R * 0.08;
    const rr = R * (1 + 0.06 * Math.sin(u * Math.PI * 2.5 - t * 6 + S.phase));
    pts.push({ u, cx, cy, rr });
  }

  const headPt = pts[N - 1];
  const headY = headPt.cy;

  // ---- sausage body ----
  const outline = '#481408';
  c.save();
  c.beginPath();
  for (const p of pts) {
    c.moveTo(p.cx + p.rr + 4, p.cy);
    c.arc(p.cx, p.cy, p.rr + 4, 0, Math.PI * 2);
  }
  c.fillStyle = outline;
  c.fill();

  const grad = c.createLinearGradient(0, baseY - R, 0, baseY + R);
  grad.addColorStop(0, '#e08a5e');
  grad.addColorStop(0.3, '#cb5c31');
  grad.addColorStop(0.72, '#a83c1e');
  grad.addColorStop(1, '#78240f');
  c.beginPath();
  for (const p of pts) {
    c.moveTo(p.cx + p.rr, p.cy);
    c.arc(p.cx, p.cy, p.rr, 0, Math.PI * 2);
  }
  c.fillStyle = grad;
  c.fill();

  // glossy top streak
  c.beginPath();
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const y = p.cy - p.rr * 0.46;
    if (i === 0) c.moveTo(p.cx, y);
    else c.lineTo(p.cx, y);
  }
  c.lineWidth = R * 0.28;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(255, 220, 180, 0.16)';
  c.stroke();

  // ---- veins ----
  for (const v of S.veins) {
    const u = clamp(v.u + Math.sin(t * 0.6 + v.ph) * 0.006, 0, 1);
    const cx = lerp(tailX, headX, u);
    const cy = baseY + Math.sin(u * 2.4 + t * 1.4 + S.phase) * R * 0.08;
    const surf = cy + v.side * R * 0.38;
    const halfLen = v.len * bodyLen * 0.5;
    const wob = Math.sin(t * 2.2 + v.ph) * 0.02 * bodyLen;
    c.beginPath();
    for (let i = 0; i <= 8; i++) {
      const k = i / 8;
      const x = cx - halfLen + k * halfLen * 2 + wob;
      const y =
        surf +
        Math.sin(k * Math.PI * 2 + t * 3 + v.ph) * v.amp * R * 0.5 +
        v.side * Math.sin(k * Math.PI) * R * 0.04;
      if (i === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.lineCap = 'round';
    c.lineWidth = v.w + 1.6;
    c.strokeStyle = 'rgba(58, 10, 10, 0.45)';
    c.stroke();
    c.lineWidth = v.w * 0.6;
    c.strokeStyle = 'rgba(214, 110, 104, 0.38)';
    c.stroke();
  }

  // ---- drips ----
  for (const d of S.drips) {
    const u = clamp(d.u + Math.sin(t * 0.5 + d.ph) * 0.01, 0, 1);
    const cx = lerp(tailX, headX, u);
    const cy = baseY + Math.sin(u * 2.4 + t * 1.4 + S.phase) * R * 0.08;
    const bot = cy + R * 0.92;
    const osc = 0.5 + 0.5 * Math.sin(t * d.sp * 3 + d.ph);
    const len = R * (0.18 + 0.75 * osc) * d.len;
    if (len < 3) continue;
    const x = cx + Math.sin(t * 1.3 + d.ph) * R * 0.06;
    c.beginPath();
    c.moveTo(x - R * 0.09, bot);
    c.quadraticCurveTo(x - R * 0.05, bot + len * 0.7, x, bot + len);
    c.quadraticCurveTo(x + R * 0.05, bot + len * 0.7, x + R * 0.09, bot);
    c.closePath();
    c.fillStyle = 'rgba(228, 168, 66, 0.55)';
    c.fill();
    c.beginPath();
    c.arc(x, bot + len + R * 0.05, Math.max(2, R * 0.09), 0, Math.PI * 2);
    c.fillStyle = 'rgba(244, 196, 92, 0.7)';
    c.fill();
  }

  // ---- mushroom tip ----
  const squashP = clamp((t - T_BOOP) / 0.45, 0, 1);
  const squash =
    t >= T_BOOP && t < T_BOOP + 0.45 ? 1 - 0.2 * Math.sin(squashP * Math.PI) : 1;
  c.save();
  c.translate(headX, headY);
  c.scale(squash, 1);
  c.beginPath();
  c.ellipse(R * 0.1, 0, R * 1.12 + 4, R * 1.0 + 4, 0, 0, Math.PI * 2);
  c.fillStyle = outline;
  c.fill();
  const capG = c.createRadialGradient(-R * 0.32, -R * 0.42, R * 0.12, 0, 0, R * 1.45);
  capG.addColorStop(0, '#f3a982');
  capG.addColorStop(0.5, '#cf5d35');
  capG.addColorStop(1, '#8a2914');
  c.beginPath();
  c.ellipse(R * 0.1, 0, R * 1.12, R * 1.0, 0, 0, Math.PI * 2);
  c.fillStyle = capG;
  c.fill();
  c.beginPath();
  c.ellipse(R * 0.1, R * 0.3, R * 1.0, R * 0.46, 0, 0.12 * Math.PI, 0.88 * Math.PI);
  c.lineWidth = Math.max(2, R * 0.06);
  c.strokeStyle = 'rgba(66, 14, 8, 0.55)';
  c.stroke();
  c.fillStyle = 'rgba(255, 226, 200, 0.5)';
  for (let i = 0; i < 4; i++) {
    const a = -2.5 + i * 0.7;
    c.beginPath();
    c.arc(R * 0.1 + Math.cos(a) * R * 0.55, Math.sin(a) * R * 0.5, Math.max(1.5, R * 0.045), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // ---- sound ----
  if (t >= T_ENTER) snd(ctx, 'enter', () => ctx.sound.noise(200));
  if (t < T_REACH) {
    const n = Math.floor(Math.max(0, t - T_ENTER) / 1.55);
    snd(ctx, 'blip' + n, () => ctx.sound.beep(92 + (n % 5) * 7, 65));
  }
  if (t >= T_BOOP) {
    snd(ctx, 'boop', () => ctx.sound.beep(760, 150));
    snd(ctx, 'boop2', () => ctx.sound.beep(1020, 110));
  }
  if (t >= T_RETREAT) snd(ctx, 'retreat', () => ctx.sound.noise(240));
  if (t >= T_END - 0.25) snd(ctx, 'pop', () => ctx.sound.beep(140, 110));

  // ---- boop FX ----
  if (t >= T_BOOP && t < T_RETREAT + 1.4) {
    const e = t - T_BOOP;
    const fade = clamp(1 - (t - T_RETREAT - 0.4) / 1.0, 0, 1);
    c.save();
    for (let k = 0; k < 2; k++) {
      const rr = R * 0.5 + ((e + k * 0.22) % 0.85) * R * 2.2;
      const a = clamp(1 - ((e + k * 0.22) % 0.85) / 0.85, 0, 1) * 0.8 * fade;
      c.beginPath();
      c.arc(boopX, boopY, rr, 0, Math.PI * 2);
      c.lineWidth = Math.max(2, R * 0.07);
      c.strokeStyle = 'rgba(255, 236, 180, ' + a.toFixed(3) + ')';
      c.stroke();
    }
    c.globalAlpha = fade;
    const popScale =
      e < 0.16 ? 0.3 + (e / 0.16) * 0.85 : 1.15 - 0.15 * clamp((e - 0.16) / 0.28, 0, 1);
    const fs = clamp(R * 0.85, 44, 130);
    c.font = '900 ' + fs + 'px "Arial Black", Impact, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tx = clamp(boopX, fs * 2.1, W - fs * 2.1);
    const ty = clamp(boopY - R * 1.7, fs * 0.8, H - fs * 0.8);
    c.save();
    c.translate(tx, ty);
    c.rotate(-0.06 + Math.sin(t * 12) * 0.02);
    c.scale(popScale, popScale);
    c.lineJoin = 'round';
    c.lineWidth = fs * 0.18;
    c.strokeStyle = '#3d0a0a';
    c.strokeText('BOOP!', 0, 0);
    c.lineWidth = fs * 0.08;
    c.strokeStyle = ctx.accent;
    c.strokeText('BOOP!', 0, 0);
    c.fillStyle = '#ffe9c9';
    c.fillText('BOOP!', 0, 0);
    c.restore();
    c.restore();
  }

  drawBanner(ctx, t);

  if (t >= T_DONE) ctx.done();
}

function drawBanner(ctx, t) {
  const W = ctx.width;
  const H = ctx.height;
  const c = ctx.canvas;
  const s = ctx.streamer;
  const centerY = s ? (s.y + s.h / 2) * H : H * 0.5;
  const cy = centerY < H * 0.42 ? H * 0.88 : H * 0.12;
  const bw = Math.min(W * 0.86, 960);
  const bh = clamp(H * 0.13, 62, 104);
  const bx = (W - bw) / 2;
  const by = cy - bh / 2;

  const grow = t < 0.35 ? 0.35 + (t / 0.35) * 0.65 : 1;
  const wob = Math.sin(t * 2.3) * 0.009;

  c.save();
  c.translate(W / 2, cy);
  c.rotate(wob);
  c.scale(grow, grow);
  c.translate(-W / 2, -cy);

  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 24;
  c.shadowOffsetY = 6;
  roundRect(c, bx, by, bw, bh, bh * 0.28);
  c.fillStyle = 'rgba(24, 8, 12, 0.74)';
  c.fill();
  c.restore();

  roundRect(c, bx, by, bw, bh, bh * 0.28);
  c.lineWidth = 3;
  c.strokeStyle = ctx.accent;
  c.stroke();

  let fs = bh * 0.44;
  c.font = '900 ' + fs + 'px "Arial Black", Impact, sans-serif';
  const label = 'THIS IS NOT A HOTDOG. ;)';
  let tw = c.measureText(label).width;
  if (tw > bw * 0.9) {
    fs *= (bw * 0.9) / tw;
    c.font = '900 ' + fs + 'px "Arial Black", Impact, sans-serif';
    tw = c.measureText(label).width;
  }
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const pulse = 1 + Math.sin(t * 4.2) * 0.012;
  c.save();
  c.translate(W / 2, by + bh / 2 + 1);
  c.scale(pulse, pulse);
  c.shadowColor = ctx.accent;
  c.shadowBlur = 14;
  c.fillStyle = '#fff4e6';
  c.fillText(label, 0, 0);
  c.restore();
  c.restore();
}

export function dispose(ctx) {
  S = null;
}
