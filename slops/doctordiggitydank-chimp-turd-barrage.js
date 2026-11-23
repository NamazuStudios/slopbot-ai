export const meta = {
  title: 'Chimp Turd Barrage',
  author: 'doctordiggitydank',
  prompt: 'a big chimpanzee leans into the frame from the left of the screen and looks at the streamer, then makes chimp noises and looks angry. then the chimpanzee reaches behind himself, pulls out a turd and throws his poop at the streamer. it splats with a splat sound. this happens 10 times. the splats get bigger each time.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const RELEASES = [2.4, 4.35, 6.3, 8.25, 10.2, 12.15, 14.1, 16.05, 18.0, 19.95];
const FLIGHT = 0.62;

const T_LEAN = 1.8;
const T_RETREAT = 21.25;
const T_RETREAT_END = 22.6;
const T_PUNCH = 21.55;
const T_SUB = 22.7;
const T_FADE = 24.3;
const T_END = 25.4;

let S = null;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }
function smooth(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
function easeOutBack(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
function quad(ax, ay, bx, by, cx, cy, u) {
  const v = 1 - u;
  return {
    x: v * v * ax + 2 * v * u * bx + u * u * cx,
    y: v * v * ay + 2 * v * u * by + u * u * cy,
  };
}
function cue(s, t, name, at, fn) {
  if (s.fired[name] || t < at) return;
  s.fired[name] = true;
  fn();
}

export function init(ctx) {
  const rnd = ctx.rand;
  const W = ctx.width, H = ctx.height;
  const minDim = Math.min(W, H);
  const st = ctx.streamer;

  let rect;
  if (st && st.w > 0 && st.h > 0) {
    rect = { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H };
  } else {
    rect = { x: W * 0.18, y: H * 0.08, w: W * 0.66, h: H * 0.84 };
  }

  const headR = minDim * 0.115;
  const headY = clamp(rect.y + rect.h * 0.44, H * 0.24, H * 0.76);
  const headXIn = clamp(rect.x * 0.55 + W * 0.10, W * 0.12, W * 0.30);
  const headXOut = headXIn - headR * 3.2;

  const throws = [];
  for (let i = 0; i < RELEASES.length; i++) {
    const at = RELEASES[i];
    const targetX = clamp(
      rect.x + rect.w * (0.38 + rnd() * 0.5),
      W * 0.22, W * 0.94
    );
    const targetY = clamp(
      rect.y + rect.h * (0.14 + rnd() * 0.46),
      H * 0.10, H * 0.86
    );
    const fromX = headXIn + headR * 1.05;
    const fromY = headY - headR * 0.3;
    throws.push({
      at,
      fromX,
      fromY,
      ctrlX: lerp(fromX, targetX, 0.5),
      ctrlY: Math.min(fromY, targetY) - headR * (1.35 + i * 0.06),
      targetX,
      targetY,
      flight: FLIGHT,
      spin: (rnd() < 0.5 ? -1 : 1) * (3 + rnd() * 4),
      size: minDim * (0.030 + i * 0.0078),
      doneSplat: false,
      seed: rnd() * 100,
    });
  }

  S = {
    W, H, minDim, rect,
    headR, headY, headXIn, headXOut,
    throws,
    splats: [],
    particles: [],
    fired: {},
    shake: 0,
    ended: false,
    splatCount: 0,
    lastSplatAt: -99,
    gazeX: rect.x + rect.w * 0.62,
    gazeY: rect.y + rect.h * 0.36,
  };
  return S;
}

function handPos(s, t) {
  const R = s.headR, hX = s.headX, hY = s.headY;
  let hx = hX + R * 0.62;
  let hy = hY + R * 1.18;
  let holding = false;
  for (let i = 0; i < s.throws.length; i++) {
    const at = s.throws[i].at;
    if (t >= at - 0.95 && t < at - 0.42) {
      const k = smooth((t - (at - 0.95)) / 0.53);
      hx = lerp(hX + R * 0.62, hX - R * 1.05, k);
      hy = lerp(hY + R * 1.18, hY + R * 0.95, k);
    } else if (t >= at - 0.42 && t < at - 0.18) {
      const k = smooth((t - (at - 0.42)) / 0.24);
      hx = lerp(hX - R * 1.05, hX + R * 0.28, k);
      hy = lerp(hY + R * 0.95, hY + R * 0.34, k);
      holding = k > 0.3;
    } else if (t >= at - 0.18 && t < at - 0.04) {
      const k = smooth((t - (at - 0.18)) / 0.14);
      hx = lerp(hX + R * 0.28, hX + R * 0.02, k);
      hy = lerp(hY + R * 0.34, hY - R * 0.44, k);
      holding = true;
    } else if (t >= at - 0.04 && t < at + 0.3) {
      const k = smooth((t - (at - 0.04)) / 0.34);
      hx = lerp(hX + R * 0.02, hX + R * 1.68, k);
      hy = lerp(hY - R * 0.44, hY - R * 0.18, k);
      holding = k < 0.16;
    } else if (t >= at + 0.3 && t < at + 0.9) {
      const k = smooth((t - (at + 0.3)) / 0.6);
      hx = lerp(hX + R * 1.68, hX + R * 0.62, k);
      hy = lerp(hY - R * 0.18, hY + R * 1.18, k);
    }
  }
  return { hx, hy, holding };
}

function addSplat(s, rnd, x, y, size) {
  const lobes = [];
  const n = 4 + Math.floor(rnd() * 4);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * size * 0.85;
    lobes.push({
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d * 0.78,
      r: size * (0.30 + rnd() * 0.52),
    });
  }
  const drips = [];
  const dn = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < dn; i++) {
    drips.push({
      dx: (rnd() - 0.5) * size * 1.15,
      w: size * (0.11 + rnd() * 0.14),
      len: size * (1.1 + rnd() * 2.0),
      delay: rnd() * 0.35,
    });
  }
  const specks = [];
  for (let i = 0; i < 7; i++) {
    const a = rnd() * Math.PI * 2;
    const d = rnd() * size * 0.85;
    specks.push({
      dx: Math.cos(a) * d,
      dy: Math.sin(a) * d * 0.8,
      r: size * (0.05 + rnd() * 0.08),
      light: rnd() < 0.45,
    });
  }
  s.splats.push({
    x, y, size, lobes, drips, specks,
    age: 0,
    rot: (rnd() - 0.5) * 0.8,
  });
  if (s.splats.length > 20) s.splats.shift();
}

function addChunks(s, rnd, x, y, size) {
  const n = 6 + Math.floor(rnd() * 6);
  for (let i = 0; i < n; i++) {
    const a = rnd() * Math.PI * 2;
    const sp = 120 + rnd() * 460;
    s.particles.push({
      x: x + (rnd() - 0.5) * size * 0.6,
      y: y + (rnd() - 0.5) * size * 0.5,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 90,
      r: 2 + rnd() * size * 0.10,
      life: 0,
      max: 0.5 + rnd() * 0.7,
    });
  }
}

function drawTurd(c, x, y, rot, r, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.rotate(rot);
  c.fillStyle = '#402714';
  c.beginPath();
  c.ellipse(0, 0, r, r * 0.86, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(r * 0.25, -r * 0.42, r * 0.62, r * 0.5, 0.3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#55351f';
  c.beginPath();
  c.ellipse(-r * 0.18, -r * 0.1, r * 0.42, r * 0.34, -0.2, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#6b472e';
  c.beginPath();
  c.arc(-r * 0.34, -r * 0.36, r * 0.13, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawChimp(c, s, t, alpha) {
  const R = s.headR;
  let lean = 1;
  if (t < T_LEAN) lean = smooth(t / T_LEAN);
  if (t > T_RETREAT) lean = 1 - smooth((t - T_RETREAT) / (T_RETREAT_END - T_RETREAT));
  if (lean <= 0.01) return;

  const bob = Math.sin(t * 1.6) * R * 0.02;
  const hX = lerp(s.headXOut, s.headXIn, lean);
  const hY = s.headY + bob;
  s.headX = hX;
  s.headY = hY;

  const hand = handPos(s, t);

  c.save();
  c.globalAlpha = alpha;

  // shoulder mass spilling in from the left edge
  c.fillStyle = '#4a3325';
  c.beginPath();
  c.ellipse(hX - R * 1.35, hY + R * 1.05, R * 1.55, R * 1.35, -0.12, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5b3f2d';
  c.beginPath();
  c.ellipse(hX - R * 1.5, hY + R * 0.95, R * 1.2, R * 1.05, -0.12, 0, Math.PI * 2);
  c.fill();

  // ears
  c.fillStyle = '#4a3325';
  c.beginPath();
  c.arc(hX - R * 0.78, hY - R * 0.02, R * 0.27, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(hX + R * 0.84, hY - R * 0.06, R * 0.25, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#a97756';
  c.beginPath();
  c.arc(hX - R * 0.78, hY - R * 0.02, R * 0.14, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(hX + R * 0.84, hY - R * 0.06, R * 0.12, 0, Math.PI * 2);
  c.fill();

  // arm
  const shx = hX - R * 1.0, shy = hY + R * 0.55;
  const ex = (shx + hand.hx) / 2 + R * (hand.hx < hX ? -0.25 : 0.4);
  const ey = (shy + hand.hy) / 2 - R * 0.2;
  c.strokeStyle = '#4a3325';
  c.lineWidth = R * 0.44;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(shx, shy);
  c.quadraticCurveTo(ex, ey, hand.hx, hand.hy);
  c.stroke();
  c.strokeStyle = '#5b3f2d';
  c.lineWidth = R * 0.30;
  c.beginPath();
  c.moveTo(shx, shy);
  c.quadraticCurveTo(ex, ey, hand.hx, hand.hy);
  c.stroke();

  // head
  c.fillStyle = '#5d4130';
  c.beginPath();
  c.arc(hX, hY, R, 0, Math.PI * 2);
  c.fill();
  // fur crest
  c.fillStyle = '#4a3325';
  c.beginPath();
  c.ellipse(hX - R * 0.05, hY - R * 0.88, R * 0.55, R * 0.3, -0.12, 0, Math.PI * 2);
  c.fill();

  // face mask
  c.fillStyle = '#c89a72';
  c.beginPath();
  c.ellipse(hX + R * 0.20, hY + R * 0.06, R * 0.74, R * 0.80, 0.05, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#b9885f';
  c.beginPath();
  c.ellipse(hX - R * 0.10, hY + R * 0.30, R * 0.34, R * 0.42, 0.1, 0, Math.PI * 2);
  c.fill();

  // eyes
  const gdx = s.gazeX - hX, gdy = s.gazeY - hY;
  const gl = Math.max(1, Math.hypot(gdx, gdy));
  const px = (gdx / gl) * R * 0.055;
  const py = (gdy / gl) * R * 0.045;
  const angrier = clamp((t - 1.4) / 1.0, 0, 1);
  for (let i = 0; i < 2; i++) {
    const exx = hX + R * (i === 0 ? 0.10 : 0.56);
    const eyy = hY - R * (i === 0 ? 0.20 : 0.16);
    c.fillStyle = '#f7efe2';
    c.beginPath();
    c.ellipse(exx, eyy, R * 0.155, R * 0.135, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#241610';
    c.beginPath();
    c.arc(exx + px, eyy + py, R * 0.075, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fffaf0';
    c.beginPath();
    c.arc(exx + px - R * 0.025, eyy + py - R * 0.028, R * 0.022, 0, Math.PI * 2);
    c.fill();
    // angry brow, inner end tipped down
    c.strokeStyle = '#33221a';
    c.lineWidth = R * 0.085;
    c.lineCap = 'round';
    c.beginPath();
    if (i === 0) {
      c.moveTo(exx - R * 0.20, eyy - R * 0.30 - angrier * R * 0.06);
      c.lineTo(exx + R * 0.19, eyy - R * 0.24 + angrier * R * 0.16);
    } else {
      c.moveTo(exx - R * 0.19, eyy - R * 0.24 + angrier * R * 0.16);
      c.lineTo(exx + R * 0.20, eyy - R * 0.30 - angrier * R * 0.06);
    }
    c.stroke();
  }

  // muzzle
  c.fillStyle = '#e0b98f';
  c.beginPath();
  c.ellipse(hX + R * 0.40, hY + R * 0.50, R * 0.56, R * 0.36, 0.02, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#6b4a33';
  c.beginPath();
  c.ellipse(hX + R * 0.27, hY + R * 0.33, R * 0.055, R * 0.045, -0.2, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(hX + R * 0.53, hY + R * 0.34, R * 0.055, R * 0.045, 0.2, 0, Math.PI * 2);
  c.fill();

  // angry mouth + teeth
  c.strokeStyle = '#3a2318';
  c.lineWidth = R * 0.06;
  c.beginPath();
  c.moveTo(hX + R * 0.14, hY + R * 0.62);
  c.quadraticCurveTo(hX + R * 0.40, hY + R * 0.50, hX + R * 0.68, hY + R * 0.62);
  c.stroke();
  if (angrier > 0.4) {
    c.fillStyle = '#fff8e8';
    for (let i = 0; i < 4; i++) {
      const tx = hX + R * (0.20 + i * 0.125);
      const ty = hY + R * 0.575;
      c.beginPath();
      c.moveTo(tx, ty);
      c.lineTo(tx + R * 0.075, ty);
      c.lineTo(tx + R * 0.037, ty + R * 0.09);
      c.closePath();
      c.fill();
    }
  }

  // forehead anger mark
  const pulse = 0.6 + 0.4 * Math.sin(t * 9);
  c.strokeStyle = `rgba(220,70,60,${0.55 + 0.35 * pulse})`;
  c.lineWidth = R * 0.05;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(hX + R * 0.52, hY - R * 0.84);
  c.lineTo(hX + R * 0.66, hY - R * 0.68);
  c.moveTo(hX + R * 0.66, hY - R * 0.84);
  c.lineTo(hX + R * 0.52, hY - R * 0.68);
  c.stroke();

  // hand + held turd
  c.fillStyle = '#b9885f';
  c.beginPath();
  c.arc(hand.hx, hand.hy, R * 0.26, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = '#8e6444';
  c.lineWidth = R * 0.035;
  c.beginPath();
  c.arc(hand.hx, hand.hy, R * 0.26, 0, Math.PI * 2);
  c.stroke();
  if (hand.holding) drawTurd(c, hand.hx, hand.hy - R * 0.15, 0.3, R * 0.30, alpha);

  c.restore();
}

function drawSplats(c, s, alpha) {
  for (let i = 0; i < s.splats.length; i++) {
    const sp = s.splats[i];
    const pop = clamp(sp.age / 0.15, 0, 1);
    const g = 0.45 + 0.55 * easeOutBack(pop);
    const a = alpha * clamp(pop * 1.7, 0, 1);
    c.globalAlpha = a;

    // drips
    for (const d of sp.drips) {
      const dk = clamp((sp.age - d.delay) / 1.0, 0, 1);
      if (dk <= 0) continue;
      const len = d.len * (0.25 + 0.75 * dk);
      const bx = sp.x + d.dx;
      c.fillStyle = '#3d2617';
      c.fillRect(bx - d.w / 2, sp.y, d.w, len);
      c.beginPath();
      c.ellipse(bx, sp.y + len, d.w * 0.75, d.w * 0.9, 0, 0, Math.PI * 2);
      c.fill();
    }

    for (const l of sp.lobes) {
      c.fillStyle = '#4a2e1c';
      c.beginPath();
      c.arc(sp.x + l.dx * g, sp.y + l.dy * g, l.r * g, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#54351f';
    c.beginPath();
    c.ellipse(sp.x, sp.y, sp.size * 0.86 * g, sp.size * 0.74 * g, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#5f3c23';
    c.beginPath();
    c.ellipse(sp.x - sp.size * 0.2, sp.y - sp.size * 0.18, sp.size * 0.42 * g, sp.size * 0.3 * g, -0.3, 0, Math.PI * 2);
    c.fill();

    for (const k of sp.specks) {
      c.fillStyle = k.light ? '#7a5232' : '#33200f';
      c.beginPath();
      c.arc(sp.x + k.dx * g, sp.y + k.dy * g, Math.max(1, k.r * g * 0.8), 0, Math.PI * 2);
      c.fill();
    }

    if (sp.age < 0.62) {
      const tk = clamp(sp.age / 0.15, 0, 1);
      const fadeOut = 1 - clamp((sp.age - 0.35) / 0.27, 0, 1);
      const fs = Math.max(12, sp.size * 0.62);
      c.save();
      c.globalAlpha = alpha * tk * fadeOut * 0.95;
      c.translate(sp.x + sp.size * 0.55, sp.y - sp.size * 0.7);
      c.rotate(-0.22);
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.font = `900 ${Math.round(fs)}px "Arial Black", Impact, system-ui, sans-serif`;
      c.lineJoin = 'round';
      c.lineWidth = Math.max(3, fs * 0.18);
      c.strokeStyle = 'rgba(18,10,4,0.9)';
      c.strokeText('SPLAT', 0, 0);
      c.fillStyle = '#f6d9a4';
      c.fillText('SPLAT', 0, 0);
      c.restore();
    }
  }
  c.globalAlpha = 1;
}

function label(c, text, x, y, size, fill, alpha, weight) {
  c.save();
  c.globalAlpha = alpha;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `${weight || 900} ${Math.round(size)}px "Arial Black", Impact, system-ui, sans-serif`;
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, size * 0.16);
  c.strokeStyle = 'rgba(10,10,22,0.88)';
  c.strokeText(text, x, y);
  c.fillStyle = fill;
  c.fillText(text, x, y);
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width, H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!S) init(ctx);
  const s = S;
  const rnd = ctx.rand;
  const step = clamp(dt || 0, 0, 0.05);
  const minDim = s.minDim;

  if (t > T_END && !s.ended) {
    s.ended = true;
    ctx.done();
  }

  let fade = 1;
  if (t > T_FADE) fade = clamp(1 - (t - T_FADE) / (T_END - T_FADE), 0, 1);

  // ---- chimp noises ----
  cue(s, t, 'ho1', 1.42, () => { ctx.sound.beep(392, 80); });
  cue(s, t, 'ho2', 1.54, () => { ctx.sound.beep(494, 70); });
  cue(s, t, 'ho3', 1.66, () => { ctx.sound.beep(440, 70); });
  cue(s, t, 'ho4', 1.80, () => { ctx.sound.noise(110); ctx.sound.beep(587, 120); });

  for (let i = 0; i < s.throws.length; i++) {
    const th = s.throws[i];
    const idx = String(i);
    cue(s, t, 'grunt' + idx, th.at - 0.22, () => {
      ctx.sound.beep(150 - i * 4, 90);
    });
    cue(s, t, 'whoosh' + idx, th.at, () => {
      ctx.sound.noise(80);
      ctx.sound.beep(300 + i * 20, 55);
    });
  }

  // ---- splat settlement ----
  for (let i = 0; i < s.throws.length; i++) {
    const th = s.throws[i];
    const idx = String(i);
    const land = th.at + th.flight;
    cue(s, t, 'splat' + idx, land, () => {
      addSplat(s, rnd, th.targetX, th.targetY, th.size);
      addChunks(s, rnd, th.targetX, th.targetY, th.size);
      s.splatCount++;
      s.lastSplatAt = t;
      s.shake = Math.min(1, 0.3 + i * 0.075);
      ctx.sound.noise(150 + i * 16);
      ctx.sound.beep(70 + i * 4, 130 + i * 8);
    });
  }

  // ---- victory hoots + captions ----
  cue(s, t, 'vic1', 21.3, () => { ctx.sound.beep(660, 90); });
  cue(s, t, 'vic2', 21.45, () => { ctx.sound.beep(784, 80); });
  cue(s, t, 'vic3', 21.62, () => { ctx.sound.beep(587, 110); });
  cue(s, t, 'vic4', 21.8, () => { ctx.sound.noise(130); ctx.sound.beep(880, 150); });
  cue(s, t, 'punch', T_PUNCH, () => { ctx.sound.beep(520, 110); });
  cue(s, t, 'sub', T_SUB, () => { ctx.sound.beep(392, 120); });

  // ---- shake ----
  s.shake = Math.max(0, s.shake - step * 2.2);
  const amp = s.shake * Math.min(W, H) * 0.012;
  const sx = Math.sin(t * 61.3) * amp;
  const sy = Math.cos(t * 47.7) * amp * 0.7;

  c.save();
  c.translate(sx, sy);

  // ---- target brackets on the live streamer ----
  if (t > 1.75 && t < 3.0) {
    const k = clamp((t - 1.75) / 0.2, 0, 1) * clamp((3.0 - t) / 0.5, 0, 1);
    const r = s.rect;
    const bx = r.x + r.w * 0.26, by = r.y + r.h * 0.10;
    const bw = r.w * 0.52, bh = r.h * 0.52;
    const L = Math.min(bw, bh) * 0.18;
    c.save();
    c.globalAlpha = fade * k * 0.85;
    c.strokeStyle = '#ff5fa2';
    c.lineWidth = Math.max(2, minDim * 0.004);
    c.beginPath();
    c.moveTo(bx, by + L); c.lineTo(bx, by); c.lineTo(bx + L, by);
    c.moveTo(bx + bw - L, by); c.lineTo(bx + bw, by); c.lineTo(bx + bw, by + L);
    c.moveTo(bx + bw, by + bh - L); c.lineTo(bx + bw, by + bh); c.lineTo(bx + bw - L, by + bh);
    c.moveTo(bx + L, by + bh); c.lineTo(bx, by + bh); c.lineTo(bx, by + bh - L);
    c.stroke();
    c.restore();
  }

  drawChimp(c, s, t, fade);

  // ---- flying turds ----
  for (const th of s.throws) {
    const u = (t - th.at) / th.flight;
    if (u < 0 || u > 1) continue;
    const p = quad(th.fromX, th.fromY, th.ctrlX, th.ctrlY, th.targetX, th.targetY, u);
    for (let j = 1; j <= 3; j++) {
      const uu = clamp(u - j * 0.055, 0, 1);
      if (uu <= 0) continue;
      const q = quad(th.fromX, th.fromY, th.ctrlX, th.ctrlY, th.targetX, th.targetY, uu);
      c.globalAlpha = fade * 0.18 * (1 - j / 4);
      c.fillStyle = '#6b472e';
      c.beginPath();
      c.arc(q.x, q.y, s.headR * 0.2 * (1 - j * 0.2), 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
    drawTurd(c, p.x, p.y, th.spin * u, s.headR * 0.3, fade);
  }

  // ---- splat particles ----
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.life += step;
    p.vy += 1500 * step;
    p.vx *= 1 - 0.8 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    if (p.life >= p.max || p.y > H + 40) { s.particles.splice(i, 1); continue; }
    const a = fade * clamp(1 - p.life / p.max, 0, 1);
    c.globalAlpha = a;
    c.fillStyle = '#4a2e1c';
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // ---- splats on the glass ----
  for (const sp of s.splats) sp.age += step;
  drawSplats(c, s, fade);

  // ---- captions ----
  if (t > 1.05 && t < 3.6) {
    const k = clamp((t - 1.05) / 0.25, 0, 1) * clamp((3.6 - t) / 0.5, 0, 1);
    label(c, 'AN ANGRY APE HAS ENTERED THE FRAME',
      W * 0.5, H * 0.10, Math.min(W * 0.036, H * 0.05, 42),
      '#ffd9e8', fade * k);
  }

  // tally after each splat
  if (s.splatCount > 0 && t - s.lastSplatAt < 1.05 && t < T_PUNCH - 0.2) {
    const age = t - s.lastSplatAt;
    const k = clamp(age / 0.12, 0, 1) * clamp((1.05 - age) / 0.35, 0, 1);
    const pop = 0.7 + 0.3 * easeOutBack(clamp(age / 0.2, 0, 1));
    const fs = Math.min(W * 0.05, H * 0.075, 62);
    c.save();
    c.translate(W * 0.5, H * 0.88);
    c.scale(pop, pop);
    label(c, `SPLAT ${s.splatCount}/10`, 0, 0, fs, '#ffe9a8', fade * k);
    c.restore();
  }

  if (t > T_PUNCH) {
    const k = clamp((t - T_PUNCH) / 0.3, 0, 1) * clamp((T_END - t) / 0.9, 0, 1);
    const pop = 0.75 + 0.25 * easeOutBack(clamp((t - T_PUNCH) / 0.35, 0, 1));
    const fs = Math.min(W * 0.062, H * 0.09, 74);
    c.save();
    c.translate(W * 0.5, H * 0.52);
    c.scale(pop, pop);
    label(c, 'TEN OUT OF TEN, SAVORYSAILOR', 0, 0, fs, '#fff3d6', fade * k);
    c.restore();
  }
  if (t > T_SUB) {
    const k = clamp((t - T_SUB) / 0.3, 0, 1) * clamp((T_END - t) / 0.9, 0, 1);
    const fs = Math.min(W * 0.026, H * 0.038, 30);
    label(c, 'somebody get the hose', W * 0.5, H * 0.60, fs, '#ffc7de', fade * k, 700);
  }

  c.restore();
}

export function dispose(ctx) {
  if (S) {
    S.splats.length = 0;
    S.particles.length = 0;
  }
  S = null;
}
