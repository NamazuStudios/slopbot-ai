export const meta = {
  title: 'Eyeball Fountain',
  author: 'doctordiggitydank',
  prompt: "A giant cartoon man pops into frame from the bottom of the screen, and his upper half fills the screen so we don't really...",
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

// ---------------------------------------------------------------------------
// Eyeball Fountain — a huge stranger barges into frame, grins like a maniac,
// loses both eyeballs at speed, and becomes a rainbow sprinkler until he
// detonates. Transparent glass start to finish; the real stream stays visible
// around (and eventually through) the mess.
// ---------------------------------------------------------------------------

const T_POP = 4.2;    // eyeballs leave the building
const T_BOOM = 16.8;  // and so does the rest of him
const T_END = 20.5;

const RAINBOW = ['#ff2d55', '#ff9500', '#ffe14d', '#4dff88', '#38d0ff', '#5b7bff', '#c04dff'];

let S = null;

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function smooth(v) { v = clamp01(v); return v * v * (3 - 2 * v); }
function easeOut(v) { const u = 1 - clamp01(v); return 1 - u * u * u; }
function frac(v) { return v - Math.floor(v); }

function env(t, a, b, f) {
  f = f || 0.25;
  if (t < a || t > b) return 0;
  return Math.min(1, (t - a) / f, (b - t) / f);
}

// ---------------------------------------------------------------------------

function buildCues() {
  const cues = [];
  const add = (at, fn) => cues.push({ at, fn });

  // the approach
  for (let i = 0; i < 5; i++) {
    const f = 88 + i * 58;
    add(0.05 + i * 0.24, (s) => s.beep(f, 110));
  }
  add(1.85, (s) => { s.noise(150); s.beep(64, 190); });

  // the grin
  add(2.5, (s) => s.beep(620, 80));
  add(3.0, (s) => s.beep(780, 80));
  add(3.5, (s) => s.beep(980, 80));

  // the pop
  add(T_POP, (s) => { s.noise(220); s.beep(1500, 120); s.beep(1950, 120); });

  // rainbow sparkle chatter
  for (let i = 0; i < 46; i++) {
    const at = 4.65 + i * 0.265;
    if (at > T_BOOM - 0.5) break;
    const f = 820 + ((i * 137) % 950);
    add(at, (s) => s.beep(f, 45));
  }

  // dread
  add(15.9, (s) => s.beep(440, 90));
  add(16.2, (s) => s.beep(560, 90));
  add(16.5, (s) => s.beep(720, 90));

  // he explodes
  add(T_BOOM, (s) => { s.noise(720); s.beep(50, 620); s.beep(96, 420); });

  add(19.0, (s) => s.beep(300, 120));
  return cues;
}

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  const diag = Math.hypot(W, H);

  const shards = [];
  for (let i = 0; i < 180; i++) {
    const a = ctx.rand() * Math.PI * 2;
    const sp = (0.28 + ctx.rand() * 1.15) * diag * 0.92;
    shards.push({
      a,
      sp,
      size: 3 + ctx.rand() * 13,
      len: 1 + ctx.rand() * 2.4,
      spin: (ctx.rand() - 0.5) * 16,
      delay: 0.01 + ctx.rand() * 0.3,
      life: 1.1 + ctx.rand() * 1.4,
      grav: 0.45 + ctx.rand() * 0.7,
      c: RAINBOW[Math.floor(ctx.rand() * RAINBOW.length)],
    });
  }

  S = { shards, cues: buildCues(), cueIdx: 0, done: false };
}

// ---------------------------------------------------------------------------

function headGeom(ctx, t) {
  const W = ctx.width, H = ctx.height;
  const p = easeOut(t / 1.9);
  const R = Math.min(W * 0.375, H * 0.45);

  let cx = W * 0.5;
  const st = ctx.streamer;
  if (st) {
    const scx = st.x + st.w / 2;
    cx += (scx < 0.5 ? 1 : -1) * W * 0.15;
  }

  const restY = H * 0.56;
  const startY = restY + R * 2.7;
  let cy = startY + (restY - startY) * p;

  if (t > 1.55) {
    const settle = Math.max(0, 1 - (t - 1.55) * 1.5);
    cy += Math.sin((t - 1.55) * 11) * R * 0.05 * settle;
  }

  const wobAmp = t < T_POP ? 0.012 : Math.min(0.14, 0.012 + (t - T_POP) * 0.021);
  const rot = Math.sin(t * 8.1) * wobAmp;

  return { cx, cy, R, rot };
}

function socketWorld(geom, localX, localY) {
  const c = Math.cos(geom.rot), s = Math.sin(geom.rot);
  return {
    x: geom.cx + localX * c - localY * s,
    y: geom.cy + localX * s + localY * c,
  };
}

// ---------------------------------------------------------------------------

function drawHead(g, ctx, t, geom) {
  const { cx, cy, R, rot } = geom;
  const sp = smooth((t - 2.2) / 1.7);
  const ew = smooth((t - 2.5) / 1.5);
  const ews = 0.6 + 0.72 * ew;

  g.save();
  g.translate(cx, cy);
  g.rotate(rot);

  // shoulders / torso
  const shoulderY = R * 0.78;
  const tw = R * 1.42;
  const shirt = g.createLinearGradient(0, shoulderY, 0, R * 3);
  shirt.addColorStop(0, '#31cfc0');
  shirt.addColorStop(1, '#0f6370');
  g.beginPath();
  g.moveTo(-tw, shoulderY + R * 0.62);
  g.quadraticCurveTo(-tw * 0.95, shoulderY - R * 0.06, -tw * 0.5, shoulderY - R * 0.02);
  g.quadraticCurveTo(0, shoulderY + R * 0.2, tw * 0.5, shoulderY - R * 0.02);
  g.quadraticCurveTo(tw * 0.95, shoulderY - R * 0.06, tw, shoulderY + R * 0.62);
  g.lineTo(tw, R * 3.2);
  g.lineTo(-tw, R * 3.2);
  g.closePath();
  g.fillStyle = shirt;
  g.fill();
  g.lineWidth = R * 0.022;
  g.strokeStyle = '#1b1026';
  g.stroke();

  // collar
  g.beginPath();
  g.moveTo(-R * 0.36, shoulderY + R * 0.04);
  g.quadraticCurveTo(0, shoulderY + R * 0.42, R * 0.36, shoulderY + R * 0.04);
  g.quadraticCurveTo(0, shoulderY + R * 0.16, -R * 0.36, shoulderY + R * 0.04);
  g.closePath();
  g.fillStyle = '#faf6e9';
  g.fill();
  g.lineWidth = R * 0.018;
  g.stroke();

  // ears
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * R * 0.84, R * 0.03, R * 0.14, R * 0.2, 0, 0, Math.PI * 2);
    g.fillStyle = '#f2b98a';
    g.fill();
    g.lineWidth = R * 0.022;
    g.strokeStyle = '#1b1026';
    g.stroke();
    g.beginPath();
    g.ellipse(s * R * 0.86, R * 0.03, R * 0.065, R * 0.1, 0, 0, Math.PI * 2);
    g.strokeStyle = 'rgba(120,60,50,0.5)';
    g.lineWidth = R * 0.014;
    g.stroke();
  }

  // head
  const skin = g.createRadialGradient(-R * 0.25, -R * 0.38, R * 0.1, 0, 0, R * 1.05);
  skin.addColorStop(0, '#ffe2c6');
  skin.addColorStop(0.68, '#f7bd8e');
  skin.addColorStop(1, '#e09663');
  g.beginPath();
  g.ellipse(0, 0, R * 0.86, R, 0, 0, Math.PI * 2);
  g.fillStyle = skin;
  g.fill();
  g.lineWidth = R * 0.024;
  g.strokeStyle = '#1b1026';
  g.stroke();

  // hair dome + unruly sprigs
  g.beginPath();
  g.ellipse(0, -R * 0.86, R * 0.8, R * 0.22, 0, Math.PI, Math.PI * 2);
  g.fillStyle = '#3a2232';
  g.fill();
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.moveTo(i * R * 0.22, -R * 0.96);
    g.quadraticCurveTo(
      i * R * 0.36 + Math.sin(t * 4 + i) * R * 0.06,
      -R * 1.2,
      i * R * 0.2 + R * 0.16,
      -R * 1.3
    );
    g.lineWidth = R * 0.05;
    g.lineCap = 'round';
    g.strokeStyle = '#3a2232';
    g.stroke();
  }

  // brows, climbing with the madness
  for (const s of [-1, 1]) {
    const bx = s * R * 0.36;
    const by = -R * (0.42 + 0.12 * ew);
    g.beginPath();
    g.moveTo(bx - R * 0.22 * s, by + R * 0.03);
    g.quadraticCurveTo(bx, by - R * (0.14 + 0.1 * ew), bx + R * 0.2 * s, by + R * 0.05);
    g.lineWidth = R * 0.055;
    g.lineCap = 'round';
    g.strokeStyle = '#3a2232';
    g.stroke();
  }

  const eyeX = R * 0.35, eyeY = -R * 0.12;
  if (t < T_POP) {
    for (const s of [-1, 1]) {
      const ex = s * eyeX;
      g.beginPath();
      g.ellipse(ex, eyeY, R * 0.185 * ews, R * 0.225 * ews, 0, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
      g.lineWidth = R * 0.02;
      g.strokeStyle = '#1b1026';
      g.stroke();

      const ix = ex + s * R * 0.02;
      g.beginPath();
      g.arc(ix, eyeY + R * 0.01, R * 0.088 * ews, 0, Math.PI * 2);
      g.fillStyle = '#2b6f7a';
      g.fill();
      g.beginPath();
      g.arc(ix, eyeY + R * 0.01, R * 0.046 * ews, 0, Math.PI * 2);
      g.fillStyle = '#120a14';
      g.fill();
      g.beginPath();
      g.arc(ix - R * 0.03, eyeY - R * 0.035, R * 0.02 * ews, 0, Math.PI * 2);
      g.fillStyle = '#ffffff';
      g.fill();
    }
  } else {
    // empty sockets
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(s * eyeX, eyeY, R * 0.2, R * 0.24, 0, 0, Math.PI * 2);
      g.fillStyle = '#170812';
      g.fill();
      g.lineWidth = R * 0.018;
      g.strokeStyle = 'rgba(30,10,25,0.9)';
      g.stroke();
    }
  }

  // nose
  g.beginPath();
  g.ellipse(0, R * 0.15, R * 0.1, R * 0.085, 0, 0, Math.PI * 2);
  g.fillStyle = '#eaa578';
  g.fill();
  g.lineWidth = R * 0.018;
  g.strokeStyle = '#1b1026';
  g.stroke();

  // the grin
  const my = R * 0.36;
  const mw = R * (0.28 + 0.46 * sp);
  const md = R * (0.2 + 0.42 * sp);
  g.beginPath();
  g.moveTo(-mw, my);
  g.bezierCurveTo(-mw * 0.45, my + md * 1.65, mw * 0.45, my + md * 1.65, mw, my);
  g.bezierCurveTo(mw * 0.4, my + md * 0.5, -mw * 0.4, my + md * 0.5, -mw, my);
  g.closePath();
  g.fillStyle = '#3f1028';
  g.fill();
  g.lineWidth = R * 0.022;
  g.strokeStyle = '#1b1026';
  g.stroke();

  if (sp > 0.15) {
    g.save();
    g.clip();
    g.fillStyle = '#fffef4';
    g.beginPath();
    g.ellipse(0, my + md * 0.16, mw * 0.94, md * 0.36, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(60,20,30,0.35)';
    g.lineWidth = R * 0.012;
    for (let k = -2; k <= 2; k++) {
      g.beginPath();
      g.moveTo((k * mw) / 2.7, my - R * 0.02);
      g.lineTo((k * mw) / 2.7, my + md * 0.5);
      g.stroke();
    }
    g.beginPath();
    g.ellipse(0, my + md * 1.3, mw * 0.5, md * 0.5, 0, 0, Math.PI * 2);
    g.fillStyle = '#e05c8a';
    g.fill();
    g.restore();
  }

  // blush
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * R * 0.6, R * 0.2, R * 0.15, R * 0.09, 0, 0, Math.PI * 2);
    g.fillStyle = 'rgba(255,110,150,0.38)';
    g.fill();
  }

  g.restore();
}

// ---------------------------------------------------------------------------

function drawBeam(g, x, y, ang, len, wid, t, seed) {
  const dx = Math.cos(ang), dy = Math.sin(ang);
  const px = -dy, py = dx;
  const tipX = x + dx * len;
  const tipY = y + dy * len;
  const w1 = wid * 0.42;

  g.beginPath();
  g.moveTo(x + px * wid, y + py * wid);
  g.lineTo(tipX + px * w1, tipY + py * w1);
  g.lineTo(tipX - px * w1, tipY - py * w1);
  g.lineTo(x - px * wid, y - py * wid);
  g.closePath();

  const grad = g.createLinearGradient(x - px * wid, y - py * wid, x + px * wid, y + py * wid);
  for (let i = 0; i < RAINBOW.length; i++) {
    grad.addColorStop(i / (RAINBOW.length - 1), RAINBOW[i]);
  }
  g.globalAlpha = 0.9;
  g.fillStyle = grad;
  g.fill();

  // hot core
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(tipX, tipY);
  g.lineWidth = wid * 0.3;
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.globalAlpha = 0.45;
  g.stroke();

  // sparks riding the beam
  for (let k = 0; k < 9; k++) {
    const u = frac(t * 0.85 + k * 0.137 + seed * 0.21);
    const along = u * len;
    const jitter = Math.sin(t * 9 + k * 2.3 + seed) * wid * 1.15;
    const sx = x + dx * along + px * jitter;
    const sy = y + dy * along + py * jitter;
    const rr = wid * 0.15 * (1 - u * 0.55) + 1;
    g.beginPath();
    g.arc(sx, sy, rr, 0, Math.PI * 2);
    g.fillStyle = RAINBOW[(k + seed) % RAINBOW.length];
    g.globalAlpha = 0.9 * (1 - u * 0.55);
    g.fill();
  }
}

function drawBeams(g, ctx, t, geom) {
  const { R, rot } = geom;
  const ramp = smooth((t - T_POP) / 1.6);
  const diag = Math.hypot(ctx.width, ctx.height);
  const eyeX = R * 0.35, eyeY = -R * 0.12;

  const leftSock = socketWorld(geom, -eyeX, eyeY);
  const rightSock = socketWorld(geom, eyeX, eyeY);

  g.save();
  g.globalCompositeOperation = 'lighter';

  // socket light + pop flash
  const sockets = [leftSock, rightSock];
  for (let e = 0; e < 2; e++) {
    const sp = sockets[e];
    const glow = g.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, R * (0.3 + 0.4 * ramp));
    glow.addColorStop(0, 'rgba(255,255,255,0.85)');
    glow.addColorStop(0.4, 'rgba(255,170,255,0.35)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    g.globalAlpha = 0.9;
    g.fillStyle = glow;
    g.beginPath();
    g.arc(sp.x, sp.y, R * (0.3 + 0.4 * ramp), 0, Math.PI * 2);
    g.fill();

    const pt = t - T_POP;
    if (pt > 0 && pt < 0.4) {
      const u = pt / 0.4;
      g.beginPath();
      g.arc(sp.x, sp.y, R * (0.2 + u * 0.9), 0, Math.PI * 2);
      g.lineWidth = R * 0.09 * (1 - u);
      g.strokeStyle = 'rgba(255,255,255,0.9)';
      g.globalAlpha = 1 - u;
      g.stroke();
    }
  }

  g.globalAlpha = 1;

  const bases = [-0.72, -0.08, 0.58];
  if (t > 8.5) bases.push(-1.26, 1.04);

  for (let e = 0; e < 2; e++) {
    const sock = sockets[e];
    const side = e === 0 ? -1 : 1;
    for (let i = 0; i < bases.length; i++) {
      const sweep = Math.sin(t * 1.45 + i * 1.1 + e * 2.0) * (0.18 + 0.24 * ramp);
      let a = side < 0 ? Math.PI - (bases[i] + sweep) : bases[i] + sweep;
      a += rot;
      const len = diag * (0.85 + 0.38 * Math.sin(t * 1.9 + i * 1.3 + e));
      const wid = R * (0.15 + 0.05 * Math.sin(t * 3 + i)) * (0.55 + 0.65 * ramp);
      drawBeam(g, sock.x, sock.y, a, len, wid, t, i + e * 5);
    }

    // drifting spray droplets
    for (let k = 0; k < 9; k++) {
      const age = frac(t * 0.5 + k * 0.111 + e * 0.37);
      const ang = k * 2.399 + t * 0.7 + e;
      const dist = age * diag * 0.42;
      const sx = sock.x + Math.cos(ang) * dist;
      const sy = sock.y + Math.sin(ang) * dist * 0.8;
      g.beginPath();
      g.arc(sx, sy, R * 0.035 * (1 - age) + 1, 0, Math.PI * 2);
      g.fillStyle = RAINBOW[(k + e * 3) % RAINBOW.length];
      g.globalAlpha = 0.75 * (1 - age);
      g.fill();
    }
  }
  g.globalAlpha = 1;

  // a beam that insists on the streamer's camera
  if (ctx.streamer && t > 6.2) {
    const st = ctx.streamer;
    const tx = (st.x + st.w * 0.5) * ctx.width;
    const ty = (st.y + st.h * 0.42) * ctx.height;
    for (let e = 0; e < 2; e++) {
      const sock = sockets[e];
      const ang = Math.atan2(ty - sock.y, tx - sock.x) + Math.sin(t * 1.2 + e) * 0.16;
      drawBeam(g, sock.x, sock.y, ang, diag * 0.9, R * 0.1, t, 11 + e);
    }
  }

  g.restore();
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------------------

function drawEyeball(g, x, y, r, rot, alpha) {
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.rotate(rot);
  g.beginPath();
  g.arc(0, 0, r, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.lineWidth = Math.max(1, r * 0.13);
  g.strokeStyle = '#1b1026';
  g.stroke();
  g.beginPath();
  g.arc(r * 0.12, 0, r * 0.5, 0, Math.PI * 2);
  g.fillStyle = '#2b6f7a';
  g.fill();
  g.beginPath();
  g.arc(r * 0.12, 0, r * 0.26, 0, Math.PI * 2);
  g.fillStyle = '#120a14';
  g.fill();
  g.beginPath();
  g.arc(-r * 0.05, -r * 0.24, r * 0.11, 0, Math.PI * 2);
  g.fillStyle = '#ffffff';
  g.fill();
  g.restore();
}

function drawEyeballs(g, ctx, t) {
  const tau = t - T_POP;
  if (tau < 0) return;

  const popGeom = headGeom(ctx, T_POP);
  const R = popGeom.R;
  const W = ctx.width, H = ctx.height;

  for (let e = 0; e < 2; e++) {
    const side = e === 0 ? -1 : 1;
    const origin = socketWorld(popGeom, side * R * 0.35, -R * 0.12);
    const vx = side * W * 0.62;
    const vy = -H * 0.3;
    const grav = H * 1.75;

    const x = origin.x + vx * tau;
    const y = origin.y + vy * tau + 0.5 * grav * tau * tau;

    if (y > H + R * 2) continue;

    const r = R * 0.165;
    const spin = side * tau * 11;

    // motion ghosts
    for (let k = 3; k >= 1; k--) {
      const tt = Math.max(0, tau - k * 0.045);
      drawEyeball(
        g,
        origin.x + vx * tt,
        origin.y + vy * tt + 0.5 * grav * tt * tt,
        r,
        side * tt * 11,
        0.13 * k
      );
    }
    drawEyeball(g, x, y, r, spin, 1);
  }
}

// ---------------------------------------------------------------------------

function drawBoom(g, ctx, t, geom) {
  const tau = t - T_BOOM;
  if (tau < 0) return;

  const W = ctx.width, H = ctx.height;
  const diag = Math.hypot(W, H);
  const cx = geom.cx;
  const cy = geom.cy - geom.R * 0.08;

  // flash (brief, translucent)
  const flash = Math.max(0, 0.45 * Math.exp(-tau * 10));
  if (flash > 0.004) {
    g.fillStyle = `rgba(255,255,255,${flash.toFixed(4)})`;
    g.fillRect(0, 0, W, H);
  }

  // shock rings
  for (let r = 0; r < 3; r++) {
    const rt = tau - r * 0.07;
    if (rt <= 0) continue;
    const rad = rt * diag * 0.55;
    const a = Math.max(0, 1 - rt / 0.9);
    g.beginPath();
    g.arc(cx, cy, rad, 0, Math.PI * 2);
    g.lineWidth = Math.max(1, diag * 0.03 * a);
    g.strokeStyle = RAINBOW[(r * 2) % RAINBOW.length];
    g.globalAlpha = a * 0.8;
    g.stroke();
  }
  g.globalAlpha = 1;

  // shards
  for (let i = 0; i < S.shards.length; i++) {
    const sh = S.shards[i];
    const st = tau - sh.delay;
    if (st < 0 || st > sh.life) continue;
    const x = cx + Math.cos(sh.a) * sh.sp * st;
    const y = cy + Math.sin(sh.a) * sh.sp * st + 0.5 * H * sh.grav * st * st;
    const alpha = clamp01(1 - st / sh.life) * clamp01(st / 0.05);
    if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;

    g.save();
    g.globalAlpha = alpha;
    g.translate(x, y);
    g.rotate(sh.spin * st);
    g.fillStyle = sh.c;
    g.fillRect(-sh.size * 0.5, -sh.size * sh.len * 0.5, sh.size, sh.size * sh.len);
    g.restore();
  }
  g.globalAlpha = 1;
}

// ---------------------------------------------------------------------------

function drawCaption(g, ctx, text, nx, ny, size, alpha, color) {
  if (alpha <= 0.001) return;
  g.save();
  g.globalAlpha = clamp01(alpha);
  g.font = `900 ${Math.round(size)}px "Arial Black", "Segoe UI", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(3, size * 0.16);
  g.strokeStyle = 'rgba(18,6,24,0.92)';
  g.strokeText(text, nx * ctx.width, ny * ctx.height);
  g.fillStyle = color;
  g.fillText(text, nx * ctx.width, ny * ctx.height);
  g.restore();
}

// ---------------------------------------------------------------------------

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width, H = ctx.height;

  if (!S) init(ctx);

  // audio cues
  while (S.cueIdx < S.cues.length && t >= S.cues[S.cueIdx].at) {
    const cue = S.cues[S.cueIdx++];
    if (t - cue.at < 0.6) {
      try { cue.fn(ctx.sound); } catch (err) { /* the show goes on */ }
    }
  }

  g.clearRect(0, 0, W, H);

  let shake = 0;
  if (t > 8 && t < T_BOOM) {
    shake = ((t - 8) / (T_BOOM - 8)) * Math.min(W, H) * 0.018;
  } else if (t >= T_BOOM) {
    shake = Math.min(W, H) * 0.035 * Math.exp(-(t - T_BOOM) * 5);
  }

  const geom = headGeom(ctx, t);

  g.save();
  if (shake > 0.2) {
    g.translate(Math.sin(t * 23) * shake, Math.cos(t * 19) * shake * 0.7);
  }

  if (t < T_BOOM) {
    drawHead(g, ctx, t, geom);
    if (t >= T_POP) {
      drawBeams(g, ctx, t, geom);
      drawEyeballs(g, ctx, t);
    }
  } else {
    drawBoom(g, ctx, t, geom);
  }

  g.restore();

  // captions (steady, so the joke stays legible)
  const unit = Math.min(W, H);
  const small = unit * 0.045;
  const big = unit * 0.078;

  drawCaption(g, ctx, 'LEGS: NOT AVAILABLE', 0.5, 0.87, small, env(t, 0.8, 2.7), '#ffe14d');
  drawCaption(g, ctx, 'EYE CONTACT: AGGRESSIVE', 0.5, 0.9, small, env(t, 5.0, 7.4), '#ffffff');
  drawCaption(g, ctx, 'THIS IS A LOT OF RAINBOW', 0.5, 0.9, small, env(t, 9.6, 11.9), '#ffe14d');
  drawCaption(g, ctx, 'SAVORYSAILOR, PLEASE BLINK', 0.5, 0.88, small, env(t, 13.4, 15.8), '#ff9ad5');

  drawCaption(g, ctx, 'SAVORYSAILOR IS FINE.', 0.5, 0.42, big, env(t, 17.5, 19.1, 0.2), '#ffffff');
  drawCaption(g, ctx, 'THE LENS IS NOT.', 0.5, 0.54, big, env(t, 19.0, 20.4, 0.2), '#ffe14d');

  if (t >= T_END && !S.done) {
    S.done = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
