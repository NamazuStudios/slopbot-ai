export const meta = {
  title: 'Winner Wiener',
  author: 'deedeemarie',
  prompt: 'Draw a winner dog in the shape of a hot dog',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const DARK = 'rgba(8,10,28,0.88)';
let st = null;

/* ---------------- tiny math ---------------- */

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const easeOutCubic = (u) => 1 - Math.pow(1 - u, 3);
const easeInQuad = (u) => u * u;
const easeOutBack = (u) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};

function alpha(hex, a) {
  const h = String(hex || '#ff5fa2').replace('#', '');
  const n = h.length === 3 ? h.split('').map((x) => x + x).join('') : h.padEnd(6, '0');
  const r = parseInt(n.slice(0, 2), 16) || 0;
  const g = parseInt(n.slice(2, 4), 16) || 0;
  const b = parseInt(n.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${a})`;
}

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

function label(c, text, x, y, size, fill, align, weight, strokeSize) {
  c.save();
  c.font = `${weight || 800} ${size}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`;
  c.textAlign = align || 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.miterLimit = 2;
  c.lineWidth = strokeSize || size * 0.22;
  c.strokeStyle = DARK;
  c.strokeText(text, x, y);
  c.fillStyle = fill;
  c.fillText(text, x, y);
  c.restore();
}

function beep(ctx, f, ms) {
  try { ctx.sound.beep(f, ms); } catch (e) { /* silence is fine */ }
}
function noise(ctx, ms) {
  try { ctx.sound.noise(ms); } catch (e) { /* silence is fine */ }
}
function once(key) {
  if (!st || st.fired.has(key)) return false;
  st.fired.add(key);
  return true;
}

/* ---------------- particles ---------------- */

const CONF_COLORS = ['#FF6FAE', '#FFD763', '#7BE0C4', '#A98BFF', '#FFFFFF', '#FF9B54'];

function burstConfetti(x, y, n, spread, power) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (st.rng() * 2 - 1) * spread;
    const sp = power * (0.35 + st.rng() * 0.9);
    st.confetti.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      rot: st.rng() * Math.PI * 2,
      vr: (st.rng() * 2 - 1) * 9,
      w: 5 + st.rng() * 7,
      h: 3 + st.rng() * 7,
      col: CONF_COLORS[(st.rng() * CONF_COLORS.length) | 0],
      age: 0,
      life: 2.2 + st.rng() * 1.8,
    });
  }
}

function burstSparks(x, y, n, power) {
  for (let i = 0; i < n; i++) {
    const a = st.rng() * Math.PI * 2;
    const sp = power * (0.25 + st.rng() * 0.9);
    st.sparks.push({
      x, y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - power * 0.15,
      r: 2 + st.rng() * 4,
      age: 0,
      life: 0.7 + st.rng() * 0.8,
    });
  }
}

function stepParticles(dt, W, H) {
  const g = 620;
  for (let i = st.confetti.length - 1; i >= 0; i--) {
    const p = st.confetti[i];
    p.age += dt;
    p.vy += g * dt;
    p.vx *= 1 - 0.9 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.age > p.life || p.y > H + 60) st.confetti.splice(i, 1);
  }
  for (let i = st.sparks.length - 1; i >= 0; i--) {
    const p = st.sparks[i];
    p.age += dt;
    p.vy += g * 0.55 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.age > p.life) st.sparks.splice(i, 1);
  }
}

function drawParticles(c) {
  for (const p of st.confetti) {
    const u = clamp(1 - p.age / p.life, 0, 1);
    c.save();
    c.globalAlpha = Math.min(1, u * 1.8);
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillStyle = p.col;
    c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    c.restore();
  }
  for (const p of st.sparks) {
    const u = clamp(1 - p.age / p.life, 0, 1);
    c.save();
    c.globalAlpha = u;
    c.fillStyle = '#FFE9A3';
    c.beginPath();
    c.arc(p.x, p.y, p.r * u, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
}

/* ---------------- the hot dog dog ---------------- */

function drawHotdogDog(c, x, groundY, w, o) {
  const sh = w * 0.22;
  const sl = w * 0.66;
  const headR = sh * 0.7;
  const legLen = w * 0.12;
  const bodyCY = groundY - legLen - sh * 0.5 + (o.bob || 0);
  const bodyL = x - sl * 0.5;
  const bodyR = x + sl * 0.5;
  const lw = Math.max(2, sh * 0.07);
  const trot = o.trot || 0;

  // contact shadow
  c.save();
  c.fillStyle = 'rgba(8,10,28,0.22)';
  c.beginPath();
  c.ellipse(x, groundY + sh * 0.06, sl * 0.52, sh * 0.2, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // legs (behind the sausage)
  const hips = [-0.36, -0.16, 0.16, 0.36];
  const phases = [0, Math.PI, Math.PI * 0.55, Math.PI * 1.55];
  for (let i = 0; i < hips.length; i++) {
    const px = x + hips[i] * sl;
    const swing = Math.sin(trot + phases[i]) * (o.legAmp || 0);
    c.save();
    c.translate(px, bodyCY);
    c.rotate(swing * 0.45);
    c.fillStyle = '#A8432A';
    c.strokeStyle = DARK;
    c.lineWidth = lw;
    rr(c, -sh * 0.11, 0, sh * 0.22, legLen + sh * 0.62, sh * 0.11);
    c.fill();
    c.stroke();
    c.fillStyle = '#7E2E1D';
    rr(c, -sh * 0.15, legLen + sh * 0.30, sh * 0.32, sh * 0.26, sh * 0.12);
    c.fill();
    c.restore();
  }

  // buns, tucked behind the sausage
  c.strokeStyle = DARK;
  c.lineWidth = lw;
  c.fillStyle = '#E8B263';
  rr(c, bodyL - w * 0.045, bodyCY - sh * 0.98, sl + w * 0.09, sh * 0.68, sh * 0.34);
  c.fill();
  c.stroke();
  rr(c, bodyL - w * 0.045, bodyCY + sh * 0.30, sl + w * 0.09, sh * 0.66, sh * 0.33);
  c.fill();
  c.stroke();

  // tails before the body so it tucks in
  c.save();
  c.translate(bodyL + sh * 0.06, bodyCY - sh * 0.22);
  c.rotate(-0.95 + (o.tail || 0));
  c.fillStyle = '#B0472A';
  c.strokeStyle = DARK;
  c.lineWidth = lw;
  rr(c, -sh * 0.9, -sh * 0.16, sh * 0.9, sh * 0.32, sh * 0.16);
  c.fill();
  c.stroke();
  c.restore();

  // sausage body
  const g = c.createLinearGradient(0, bodyCY - sh * 0.5, 0, bodyCY + sh * 0.5);
  g.addColorStop(0, '#E28252');
  g.addColorStop(0.45, '#C4552E');
  g.addColorStop(1, '#93331D');
  c.fillStyle = g;
  c.strokeStyle = DARK;
  c.lineWidth = lw;
  rr(c, bodyL, bodyCY - sh * 0.5, sl, sh, sh * 0.5);
  c.fill();
  c.stroke();

  // char marks
  c.strokeStyle = 'rgba(90,28,12,0.45)';
  c.lineWidth = Math.max(2, sh * 0.05);
  c.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const cx0 = bodyL + sl * (0.28 + i * 0.2);
    c.beginPath();
    c.moveTo(cx0 - sh * 0.12, bodyCY - sh * 0.30);
    c.quadraticCurveTo(cx0, bodyCY - sh * 0.34, cx0 + sh * 0.12, bodyCY - sh * 0.28);
    c.stroke();
  }

  // mustard squiggle, the signature of a serious athlete
  c.strokeStyle = '#F7D24B';
  c.lineWidth = Math.max(3, sh * 0.15);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  const N = 7;
  for (let i = 0; i <= N; i++) {
    const px = bodyL + sl * 0.1 + sl * 0.8 * (i / N);
    const py = bodyCY - sh * 0.02 + (i % 2 ? 1 : -1) * sh * 0.16;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.stroke();

  // medal of extreme good behaviour
  if (o.medal) {
    const mx = bodyL + sl * 0.27;
    const my = bodyCY + sh * 0.06;
    c.fillStyle = '#5C7CFA';
    c.strokeStyle = DARK;
    c.lineWidth = lw * 0.8;
    c.beginPath();
    c.moveTo(mx - sh * 0.14, my);
    c.lineTo(mx + sh * 0.02, my + sh * 0.72);
    c.lineTo(mx - sh * 0.32, my + sh * 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(mx + sh * 0.14, my);
    c.lineTo(mx - sh * 0.02, my + sh * 0.72);
    c.lineTo(mx + sh * 0.32, my + sh * 0.5);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = '#FFD763';
    c.beginPath();
    c.arc(mx, my, sh * 0.34, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    c.fillStyle = '#FF6FAE';
    c.beginPath();
    c.arc(mx, my, sh * 0.2, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(mx - sh * 0.07, my - sh * 0.08, sh * 0.06, 0, Math.PI * 2);
    c.fill();
  }

  /* head */
  const hx0 = bodyR + headR * 0.32;
  const hy0 = bodyCY - sh * 0.30 + (o.headBob || 0);
  const tilt = o.headTilt || 0;

  c.save();
  c.translate(hx0, hy0);
  c.rotate(tilt);

  // ear
  c.save();
  c.translate(-headR * 0.18, -headR * 0.62);
  c.rotate(-0.45 + Math.sin(trot * 0.7) * 0.05);
  c.fillStyle = '#E8B263';
  c.strokeStyle = DARK;
  c.lineWidth = lw;
  c.beginPath();
  c.ellipse(0, 0, headR * 0.36, headR * 0.78, 0.22, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.restore();

  // skull
  c.fillStyle = '#C4552E';
  c.strokeStyle = DARK;
  c.lineWidth = lw;
  c.beginPath();
  c.arc(0, 0, headR, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // snout
  c.fillStyle = '#D5653A';
  rr(c, headR * 0.32, -headR * 0.02, headR * 1.18, headR * 0.64, headR * 0.32);
  c.fill();
  c.stroke();

  // nose
  c.fillStyle = '#2A1410';
  c.beginPath();
  c.ellipse(headR * 1.38, headR * 0.16, headR * 0.19, headR * 0.15, 0, 0, Math.PI * 2);
  c.fill();

  // eye
  c.fillStyle = '#1A0E0A';
  c.beginPath();
  c.arc(headR * 0.16, -headR * 0.28, headR * 0.15, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.beginPath();
  c.arc(headR * 0.22, -headR * 0.34, headR * 0.05, 0, Math.PI * 2);
  c.fill();

  // mouth
  c.strokeStyle = '#3A1710';
  c.lineWidth = Math.max(2, headR * 0.1);
  c.lineCap = 'round';
  c.beginPath();
  c.arc(headR * 0.55, headR * 0.16, headR * 0.42, 0.15, Math.PI - 0.2, false);
  c.stroke();

  // tongue, deployed when pleased
  if (o.happy) {
    c.fillStyle = '#FF7DA6';
    c.strokeStyle = DARK;
    c.lineWidth = Math.max(2, headR * 0.06);
    rr(c, headR * 0.9, headR * 0.42, headR * 0.3, headR * 0.36, headR * 0.15);
    c.fill();
    c.stroke();
  }

  c.restore();
}

/* ---------------- crown ---------------- */

function drawCrown(c, cx, bottomY, w, t, a) {
  const h = w * 0.58;
  const bandY = bottomY - h * 0.58;
  c.save();
  c.globalAlpha = a;

  // soft halo
  const glow = c.createRadialGradient(cx, bandY, 0, cx, bandY, w * 0.95);
  glow.addColorStop(0, 'rgba(255,215,99,0.30)');
  glow.addColorStop(1, 'rgba(255,215,99,0)');
  c.fillStyle = glow;
  c.beginPath();
  c.arc(cx, bandY, w * 0.95, 0, Math.PI * 2);
  c.fill();

  const gold = c.createLinearGradient(0, bandY - h, 0, bandY + h * 0.45);
  gold.addColorStop(0, '#FFE9A0');
  gold.addColorStop(0.5, '#FFD763');
  gold.addColorStop(1, '#E0A22B');

  c.strokeStyle = DARK;
  c.lineWidth = Math.max(2, w * 0.035);
  c.lineJoin = 'round';

  // spikes
  c.beginPath();
  c.moveTo(cx - w * 0.5, bandY);
  c.lineTo(cx - w * 0.36, bandY - h * 0.62);
  c.lineTo(cx - w * 0.18, bandY - h * 0.12);
  c.lineTo(cx - w * 0.02, bandY - h * 0.86);
  c.lineTo(cx + w * 0.17, bandY - h * 0.12);
  c.lineTo(cx + w * 0.36, bandY - h * 0.62);
  c.lineTo(cx + w * 0.5, bandY);
  c.closePath();
  c.fillStyle = gold;
  c.fill();
  c.stroke();

  // band
  c.fillStyle = gold;
  rr(c, cx - w * 0.5, bandY, w, h * 0.42, w * 0.05);
  c.fill();
  c.stroke();

  // jewels
  const jw = w * 0.075;
  const jewels = ['#FF6FAE', '#7BE0C4', '#FF6FAE'];
  for (let i = 0; i < 3; i++) {
    c.fillStyle = jewels[i];
    c.beginPath();
    c.arc(cx + (i - 1) * w * 0.24, bandY + h * 0.2, jw, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  // sparkles
  for (let i = 0; i < 4; i++) {
    const ang = t * 1.6 + i * (Math.PI / 2);
    const rx = cx + Math.cos(ang) * w * 0.62;
    const ry = bandY - h * 0.35 + Math.sin(ang) * w * 0.3;
    const s = w * 0.045 * (0.7 + 0.5 * Math.sin(t * 6 + i));
    c.fillStyle = '#FFF6D0';
    c.beginPath();
    c.moveTo(rx, ry - s);
    c.lineTo(rx + s * 0.35, ry);
    c.lineTo(rx, ry + s);
    c.lineTo(rx - s * 0.35, ry);
    c.closePath();
    c.fill();
  }

  c.restore();
}

/* ---------------- rays ---------------- */

function drawRays(c, cx, cy, R, rot, color, a) {
  if (a <= 0.01) return;
  c.save();
  c.translate(cx, cy);
  c.rotate(rot);
  c.globalAlpha = a;
  const n = 14;
  for (let i = 0; i < n; i++) {
    c.save();
    c.rotate((i / n) * Math.PI * 2);
    const grd = c.createLinearGradient(R * 0.1, 0, R, 0);
    grd.addColorStop(0, alpha(color, 0.02));
    grd.addColorStop(0.5, alpha(color, 0.16));
    grd.addColorStop(1, alpha(color, 0));
    c.fillStyle = grd;
    c.beginPath();
    c.moveTo(R * 0.12, 0);
    c.lineTo(R, -R * 0.055);
    c.lineTo(R, R * 0.055);
    c.closePath();
    c.fill();
    c.restore();
  }
  c.restore();
}

/* ---------------- certified badge ---------------- */

function drawBadge(c, x, y, r, sc) {
  c.save();
  c.translate(x, y);
  c.rotate(-0.18);
  c.scale(sc, sc);
  c.globalAlpha = clamp(sc, 0, 1);

  c.fillStyle = 'rgba(255,111,174,0.92)';
  c.strokeStyle = DARK;
  c.lineWidth = Math.max(3, r * 0.1);
  c.beginPath();
  c.arc(0, 0, r, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  c.strokeStyle = 'rgba(255,255,255,0.85)';
  c.lineWidth = r * 0.06;
  c.beginPath();
  c.arc(0, 0, r * 0.82, 0, Math.PI * 2);
  c.stroke();

  c.strokeStyle = '#fff';
  c.lineWidth = r * 0.16;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(-r * 0.34, 0);
  c.lineTo(-r * 0.08, r * 0.28);
  c.lineTo(r * 0.36, -r * 0.26);
  c.stroke();

  label(c, 'GOOD', 0, -r * 0.5, r * 0.26, '#fff', 'center', 800, r * 0.07);
  label(c, 'CERTIFIED', 0, r * 0.5, r * 0.22, '#fff', 'center', 800, r * 0.06);

  c.restore();
}

/* ---------------- lifecycle ---------------- */

export function init(ctx) {
  st = {
    rng: typeof ctx.rand === 'function' ? ctx.rand : Math.random,
    confetti: [],
    sparks: [],
    fired: new Set(),
    rainAcc: 0,
    stepIdx: -1,
    ended: false,
  };
}

const CAPTIONS = [
  { a: 0.7, b: 2.9, text: 'Something is trotting.' },
  { a: 3.1, b: 5.9, text: 'It has detected a winner.' },
  { a: 6.2, b: 9.6, text: 'The winner dog has chosen its human.' },
  { a: 9.9, b: 13.2, text: 'SavorySailor. Winner. Dog-certified.' },
  { a: 13.5, b: 15.7, text: 'Good boy confirmed.' },
];

function captionAlpha(t, a, b) {
  const fin = 0.28;
  const fout = 0.4;
  if (t < a || t > b) return 0;
  return clamp(Math.min((t - a) / fin, (b - t) / fout), 0, 1);
}

export function frame(ctx, t, dt) {
  if (!st) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  dt = clamp(dt || 0.016, 0.001, 0.05);
  const S = Math.min(W, H);
  const accent = ctx.accent || '#ff5fa2';

  const s = ctx.streamer;
  const sr = (s && s.w > 0 && s.h > 0)
    ? { x: s.x * W, y: s.y * H, w: s.w * W, h: s.h * H }
    : { x: W * 0.35, y: H * 0.28, w: W * 0.30, h: H * 0.42 };
  const scx = sr.x + sr.w * 0.5;

  const T_ENTER = 2.8;
  const T_CROWN = 6.0;
  const T_LAND = 7.3;
  const T_WIN = 9.9;
  const T_EXIT = 13.6;
  const T_GONE = 16.0;
  const T_END = 16.2;

  const dogW = Math.min(W * 0.31, S * 0.46);
  const groundY = H * 0.87;

  /* ----- dog motion ----- */
  let dogX;
  let legAmp = 0.12;
  let bob = 0;
  let tail = Math.sin(t * 10) * 0.4;
  let headBob = 0;
  let headTilt = 0;
  let happy = false;

  if (t < T_ENTER) {
    const u = clamp(t / T_ENTER, 0, 1);
    dogX = lerp(-dogW * 0.8, W * 0.43, easeOutCubic(u));
    legAmp = 0.55;
    bob = -Math.abs(Math.sin(t * 9.5)) * S * 0.012;
    tail = Math.sin(t * 12) * 0.35;
  } else if (t < T_EXIT) {
    dogX = W * 0.43 + Math.sin(t * 0.9) * W * 0.006;
    legAmp = 0.12;
    headBob = Math.sin(t * 3.1) * dogW * 0.012;
    if (t < T_CROWN) {
      // sniffing the situation
      headTilt = Math.sin(t * 2.2) * 0.09;
      tail = Math.sin(t * 9) * 0.35;
    } else if (t < T_WIN) {
      // watching the crown fall
      headTilt = -0.16;
      headBob = -dogW * 0.02;
      tail = Math.sin(t * 13) * 0.45;
    } else {
      happy = true;
      bob = -Math.abs(Math.sin((t - T_WIN) * 6.4)) * S * 0.055;
      legAmp = 0.3;
      tail = Math.sin(t * 16) * 0.5;
      headTilt = Math.sin(t * 6) * 0.05;
    }
  } else {
    const u = clamp((t - T_EXIT) / (T_GONE - T_EXIT), 0, 1);
    dogX = lerp(W * 0.43, W + dogW * 1.0, easeInQuad(u));
    legAmp = 0.6;
    bob = -Math.abs(Math.sin(t * 11)) * S * 0.014;
    tail = Math.sin(t * 14) * 0.4;
    happy = t < T_GONE;
  }

  /* ----- crown geometry ----- */
  const crownW = clamp(sr.w * 0.4, S * 0.09, S * 0.22);
  const crownTarget = sr.y + sr.h * 0.15;
  let crownBottom = null;
  let crownA = 0;

  if (t >= T_CROWN) {
    const u = clamp((t - T_CROWN) / 1.25, 0, 1);
    crownBottom = lerp(sr.y - H * 0.4, crownTarget, easeOutBack(u));
    if (u >= 1) {
      const settle = clamp((t - T_LAND) / 1.1, 0, 1);
      crownBottom = crownTarget + Math.sin((t - T_LAND) * 8) * 4 * (1 - settle);
    }
    crownA = clamp((t - T_CROWN) / 0.3, 0, 1);
  }

  /* ----- sounds ----- */
  if (t < T_ENTER || t > T_EXIT) {
    const idx = Math.floor(t / 0.22);
    if (idx !== st.stepIdx) {
      st.stepIdx = idx;
      beep(ctx, 150 + (idx % 2) * 60, 34);
    }
  }
  if (t > 2.6 && t < 5.9) {
    const idx = Math.floor(t / 0.42);
    if (idx !== st.stepIdx) {
      st.stepIdx = idx;
      beep(ctx, 900, 24);
    }
  }
  if (t >= T_CROWN && once('drop')) noise(ctx, 260);
  if (t >= T_LAND && once('land')) {
    noise(ctx, 180);
    beep(ctx, 620, 110);
    burstConfetti(scx, crownTarget, 46, 1.0, 380);
    burstSparks(scx, crownTarget, 22, 220);
  }
  const fanfare = [[7.5, 523], [7.72, 659], [7.94, 784], [8.16, 1046]];
  for (let i = 0; i < fanfare.length; i++) {
    if (t >= fanfare[i][0] && once('fa' + i)) beep(ctx, fanfare[i][1], 150);
  }
  if (t >= T_WIN && once('win')) {
    noise(ctx, 300);
    burstConfetti(dogX, groundY - dogW * 0.3, 42, 1.1, 420);
    burstSparks(dogX, groundY - dogW * 0.3, 16, 200);
  }

  /* ----- confetti rain ----- */
  if (t > T_WIN && t < T_EXIT) {
    st.rainAcc += dt;
    while (st.rainAcc > 0.1) {
      st.rainAcc -= 0.1;
      st.confetti.push({
        x: st.rng() * W,
        y: -20,
        vx: (st.rng() * 2 - 1) * 40,
        vy: 40 + st.rng() * 60,
        rot: st.rng() * Math.PI * 2,
        vr: (st.rng() * 2 - 1) * 6,
        w: 5 + st.rng() * 7,
        h: 3 + st.rng() * 7,
        col: CONF_COLORS[(st.rng() * CONF_COLORS.length) | 0],
        age: 0,
        life: 3.2 + st.rng() * 1.4,
      });
    }
  }
  stepParticles(dt, W, H);

  /* ----- draw: rays behind the real streamer ----- */
  const rayA = clamp((t - 6.5) / 1.8, 0, 1) * 0.9;
  drawRays(c, scx, sr.y + sr.h * 0.42, Math.max(sr.w, sr.h) * 0.95, t * 0.22, '#FFD763', rayA);
  drawRays(c, scx, sr.y + sr.h * 0.42, Math.max(sr.w, sr.h) * 0.7, -t * 0.15, accent, rayA * 0.7);

  /* ----- crown ----- */
  if (crownBottom !== null) drawCrown(c, scx, crownBottom, crownW, t, crownA);

  /* ----- certified stamp over the live frame ----- */
  if (t > 10.15) {
    const u = clamp((t - 10.15) / 0.45, 0, 1);
    drawBadge(c, sr.x + sr.w * 0.79, sr.y + sr.h * 0.16, Math.max(28, S * 0.055), easeOutBack(u));
  }

  /* ----- the dog ----- */
  drawHotdogDog(c, dogX, groundY, dogW, {
    trot: t * 10,
    legAmp,
    bob,
    tail,
    headBob,
    headTilt,
    happy,
    medal: t > T_LAND,
  });

  /* ----- confetti on top ----- */
  drawParticles(c);

  /* ----- banner ----- */
  if (t > T_WIN - 0.1 && t < 15.9) {
    const u = clamp((t - (T_WIN - 0.1)) / 0.5, 0, 1);
    const wob = Math.sin((t - T_WIN) * 3) * 0.025;
    c.save();
    c.translate(W * 0.5, H * 0.135);
    c.rotate(wob);
    c.scale(lerp(0.6, 1, easeOutBack(u)), lerp(0.6, 1, easeOutBack(u)));
    c.globalAlpha = clamp((15.9 - t) / 0.6, 0, 1);

    const big = S * 0.082;
    c.save();
    c.translate(S * 0.012, S * 0.014);
    c.globalAlpha *= 0.45;
    label(c, 'WINNER DOG', 0, 0, big, '#0a0c22', 'center', 900, big * 0.26);
    c.restore();
    label(c, 'WINNER DOG', 0, 0, big, '#FFD763', 'center', 900, big * 0.24);
    label(c, 'SAVORYSAILOR  ·  CERTIFIED BY DOG', 0, big * 0.92, S * 0.032, '#FF9BC6', 'center', 800, S * 0.032 * 0.24);
    c.restore();
  }

  /* ----- captions ----- */
  for (const cap of CAPTIONS) {
    const a = captionAlpha(t, cap.a, cap.b);
    if (a <= 0.01) continue;
    c.save();
    c.globalAlpha = a;
    label(c, cap.text, W * 0.035, H * 0.915, S * 0.036, '#FFFFFF', 'left', 800, S * 0.036 * 0.3);
    c.restore();
  }

  /* ----- clean ending ----- */
  if (t >= T_END && !st.ended) {
    st.ended = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
}

export function dispose() {
  st = null;
}
