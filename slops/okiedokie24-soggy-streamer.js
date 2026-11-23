export const meta = {
  title: 'Soggy Streamer',
  author: 'okiedokie24',
  prompt: 'pour coffee on the streamer',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

// A glass carafe descends over the live camera and tips. Coffee goes on the
// streamer's frame. Nothing is painted behind them; the stream stays visible.

const DUR = 14.2;
const POUR_A = 2.0;
const POUR_B = 8.6;
const CAP_A = 9.4;

let S = null;

function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function easeInOut(x) { return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2; }

function makeRng(seed) {
  let s = seed >>> 0 || 123456789;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function targetRect(ctx) {
  const s = ctx.streamer;
  if (s) {
    return {
      x: s.x * ctx.width,
      y: s.y * ctx.height,
      w: s.w * ctx.width,
      h: s.h * ctx.height,
    };
  }
  const w = ctx.width * 0.44;
  const h = ctx.height * 0.58;
  return { x: (ctx.width - w) / 2, y: ctx.height * 0.2, w, h };
}

export function init(ctx) {
  S = {
    rand: makeRng(Math.floor((ctx.rand ? ctx.rand() : 0.5) * 1e9) || 7),
    streaks: [],
    splash: [],
    steam: [],
    streakAcc: 0,
    steamAcc: 0,
    nextPourSound: 0,
    nextDrip: 0,
    sounded: false,
    tiltSound: false,
    ended: false,
  };
}

function drawPot(c, x, y, ang, fill, alpha, sc) {
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(sc, sc);
  c.globalAlpha = alpha;

  // handle
  c.beginPath();
  c.arc(134, -56, 32, -Math.PI * 0.62, Math.PI * 0.62);
  c.lineWidth = 13;
  c.strokeStyle = 'rgba(235,246,255,0.45)';
  c.stroke();

  const top = -8 - 100 * fill;

  // coffee inside the glass
  c.save();
  roundRect(c, 24, -108, 108, 100, 22);
  c.clip();
  c.fillStyle = 'rgba(205,232,255,0.10)';
  c.fillRect(24, -108, 108, 100);
  c.fillStyle = '#3a2317';
  c.fillRect(24, top, 108, 100 - top - 4);
  c.beginPath();
  c.ellipse(78, top, 48, 7, 0, 0, Math.PI * 2);
  c.fillStyle = '#6b4026';
  c.fill();
  c.beginPath();
  c.ellipse(64, top - 1, 20, 3.2, 0, 0, Math.PI * 2);
  c.fillStyle = 'rgba(255,222,192,0.45)';
  c.fill();
  c.restore();

  // glass body
  roundRect(c, 24, -108, 108, 100, 22);
  c.fillStyle = 'rgba(255,255,255,0.05)';
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(255,255,255,0.72)';
  c.stroke();

  // highlight
  c.beginPath();
  c.moveTo(42, -98);
  c.quadraticCurveTo(31, -60, 45, -20);
  c.lineWidth = 6;
  c.strokeStyle = 'rgba(255,255,255,0.3)';
  c.stroke();

  // spout
  c.beginPath();
  c.moveTo(0, 0);
  c.quadraticCurveTo(9, -25, 32, -34);
  c.lineTo(32, -4);
  c.closePath();
  c.fillStyle = 'rgba(228,244,255,0.16)';
  c.fill();
  c.lineWidth = 4;
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.stroke();

  c.restore();
}

function drawStream(c, sx, sy, iy, width, t, pour) {
  const n = 16;
  if (width < 0.8) return;

  const path = [];
  for (let i = 0; i <= n; i++) {
    const p = i / n;
    const y = sy + (iy - sy) * p;
    const wob = Math.sin(p * 6.5 + t * 8.5) * 4 * pour * p * (1 - p);
    path.push([sx + wob, y]);
  }

  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  c.beginPath();
  c.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i++) c.lineTo(path[i][0], path[i][1]);
  c.lineWidth = width;
  c.strokeStyle = '#3a2317';
  c.stroke();

  c.beginPath();
  c.moveTo(path[2][0] - width * 0.16, path[2][1]);
  for (let i = 3; i < path.length; i++) c.lineTo(path[i][0] - width * 0.16, path[i][1]);
  c.lineWidth = Math.max(1, width * 0.3);
  c.strokeStyle = 'rgba(180,120,75,0.8)';
  c.stroke();

  // beads on the rope
  for (let i = 1; i < 9; i++) {
    const p = i / 9;
    const y = sy + (iy - sy) * p;
    const x = sx + Math.sin(p * 6.5 + t * 8.5) * 4 * pour * p * (1 - p);
    c.beginPath();
    c.ellipse(x - width * 0.12, y, width * 0.4, width * 0.52, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(95,60,38,0.8)';
    c.fill();
  }
  c.restore();
}

function iyAt(p, sy, iy) {
  return (iy - sy) * p;
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  const R = targetRect(ctx);
  const cx = R.x + R.w * 0.5;
  const impactY = R.y + R.h * 0.25;
  ctx._impactY = impactY;
  const sc = Math.min(1, Math.max(0.45, Math.min(W, H) / 1050));
  const rand = S.rand;

  if (t >= DUR) {
    if (!S.ended) { S.ended = true; ctx.done(); }
    return;
  }

  const tiltIn = easeInOut(clamp01((t - 1.7) / 0.65));
  const tiltOut = easeInOut(clamp01((t - POUR_B) / 0.9));
  const pourAng = -0.44;
  const ang = 0.06 + (pourAng - 0.06) * tiltIn + (0.06 - pourAng) * tiltOut;

  const targetY = impactY - 160 * sc;
  let py = targetY;
  if (t < 1.7) py = targetY - 300 * (1 - easeInOut(clamp01(t / 1.7)));
  if (t > 8.7) py = targetY - 330 * easeInOut(clamp01((t - 8.7) / 1.7));

  const px = cx - 4 + Math.sin(t * 1.6) * 4;
  const pour = clamp01((t - POUR_A) / 0.7) * clamp01((POUR_B - t) / 1.1);
  const drain = clamp01((t - POUR_A) / (POUR_B - POUR_A));
  const fill = Math.max(0.07, 0.9 - 0.83 * drain);
  const potAlpha = t > 9.6 ? Math.max(0, 1 - (t - 9.6) / 1.2) : 1;

  // ---- coffee on the glass, clipped to the streamer's frame ----
  c.save();
  c.beginPath();
  c.rect(R.x, R.y, R.w, R.h);
  c.clip();
  for (const s of S.streaks) {
    c.globalAlpha = s.a;
    c.beginPath();
    c.moveTo(s.x, s.y);
    c.quadraticCurveTo(s.x + s.bend, s.y + s.len * 0.5, s.x + s.bend * 0.4, s.y + s.len);
    c.lineWidth = s.w;
    c.lineCap = 'round';
    c.strokeStyle = '#3a2317';
    c.stroke();
    c.beginPath();
    c.moveTo(s.x - s.w * 0.22, s.y);
    c.quadraticCurveTo(s.x + s.bend - s.w * 0.22, s.y + s.len * 0.5, s.x + s.bend * 0.4, s.y + s.len);
    c.lineWidth = Math.max(0.7, s.w * 0.28);
    c.strokeStyle = 'rgba(170,115,72,0.75)';
    c.stroke();
    // bead at the leading edge
    c.beginPath();
    c.ellipse(s.x + s.bend * 0.4, s.y + s.len, s.w * 0.6, s.w * 0.72, 0, 0, Math.PI * 2);
    c.fillStyle = '#3a2317';
    c.fill();
    c.beginPath();
    c.ellipse(s.x + s.bend * 0.4 - s.w * 0.15, s.y + s.len + s.w * 0.2, s.w * 0.2, s.w * 0.26, 0, 0, Math.PI * 2);
    c.fillStyle = 'rgba(220,170,130,0.6)';
    c.fill();
  }
  c.globalAlpha = 1;
  c.restore();

  // ---- splash droplets ----
  for (const d of S.splash) {
    c.globalAlpha = clamp01(d.life * 2.2);
    c.beginPath();
    c.ellipse(d.x, d.y, d.r, d.r * 1.45, d.spin, 0, Math.PI * 2);
    c.fillStyle = '#4a2c1c';
    c.fill();
  }
  c.globalAlpha = 1;

  // ---- the stream ----
  if (pour > 0.01) {
    drawStream(ctx, px, py, cx, 2.5 + 13 * pour, t, pour);
  }

  // ---- the carafe ----
  if (potAlpha > 0.01) {
    drawPot(c, px, py, ang, fill, potAlpha, sc);
    if (t < 1.7) {
      // motion ticks as it drops in
      c.save();
      c.globalAlpha = 0.32 * (1 - clamp01(t / 1.7));
      c.strokeStyle = '#ffffff';
      c.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const lx = px + (i - 1) * 16 * sc;
        c.beginPath();
        c.moveTo(lx, py - 120 * sc);
        c.lineTo(lx, py - 150 * sc);
        c.stroke();
      }
      c.restore();
    }
  }

  // ---- impact crown ----
  if (pour > 0.05) {
    c.save();
    c.globalAlpha = 0.85 * pour;
    c.beginPath();
    c.ellipse(cx, impactY, 34 * pour * sc, 9 * pour * sc, 0, 0, Math.PI * 2);
    c.fillStyle = '#4a2c1c';
    c.fill();
    c.restore();
  }

  // ---- steam ----
  for (const s of S.steam) {
    c.globalAlpha = clamp01(s.life) * 0.22;
    c.beginPath();
    c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    c.fillStyle = '#ffffff';
    c.fill();
  }
  c.globalAlpha = 1;

  // ---- caption ----
  if (t > CAP_A) {
    const a = easeInOut(clamp01((t - CAP_A) / 0.5)) * clamp01((DUR - t) / 1.2);
    const cy = Math.min(H - 58, R.y + R.h + 30);
    c.save();
    c.globalAlpha = a;
    const l1 = 'SAVORYSAILOR';
    const l2 = 'now 40% coffee by volume.';
    c.font = 'bold 30px system-ui, sans-serif';
    const w1 = c.measureText(l1).width;
    c.font = 'italic 20px system-ui, sans-serif';
    const w2 = c.measureText(l2).width;
    const bw = Math.max(w1, w2) + 44;
    const bh = 76;
    const bx = cx - bw / 2;
    c.beginPath();
    roundRect(c, bx, cy - 34, bw, bh, 14);
    c.fillStyle = 'rgba(12,18,34,0.58)';
    c.fill();
    c.lineWidth = 1.5;
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.stroke();

    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = 'bold 30px system-ui, sans-serif';
    c.fillStyle = '#ffe9d2';
    c.fillText(l1, cx, cy - 8);
    c.font = 'italic 20px system-ui, sans-serif';
    c.fillStyle = 'rgba(255,235,214,0.8)';
    c.fillText(l2, cx, cy + 22);
    c.restore();
  }

  // ---- particles ----
  for (let i = S.streaks.length - 1; i >= 0; i--) {
    const s = S.streaks[i];
    s.y += s.vy * dt;
    s.x += s.drift * dt;
    if (s.y > R.y + R.h + 30 || t > DUR) S.streaks.splice(i, 1);
  }
  for (let i = S.splash.length - 1; i >= 0; i--) {
    const d = S.splash[i];
    d.vy += 1300 * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.spin += dt * 6;
    d.life -= dt * 0.85;
    if (d.life <= 0 || d.y > H + 40) S.splash.splice(i, 1);
  }
  for (let i = S.steam.length - 1; i >= 0; i--) {
    const s = S.steam[i];
    s.y += s.vy * dt;
    s.x += Math.sin(s.y * 0.03) * 6 * dt;
    s.r += 9 * dt;
    s.life -= dt * 0.35;
    if (s.life <= 0) S.steam.splice(i, 1);
  }

  // ---- spawn ----
  if (pour > 0.15) {
    S.streakAcc += dt;
    while (S.streakAcc > 0.17) {
      S.streakAcc -= 0.17;
      S.streaks.push({
        x: cx + (rand() - 0.5) * R.w * 0.55,
        y: impactY - 6 + rand() * 18,
        len: 40 + rand() * 80,
        vy: 60 + rand() * 150,
        drift: (rand() - 0.5) * 18,
        bend: (rand() - 0.5) * 12,
        w: 2.4 + rand() * 4.2,
        a: 0.36 + rand() * 0.3,
      });
    }
    if (rand() < clamp01(pour)) {
      S.splash.push({
        x: cx + (rand() - 0.5) * 30,
        y: impactY,
        vx: (rand() - 0.5) * 210,
        vy: -240 + rand() * 160,
        r: 1.8 + rand() * 3.4,
        spin: rand() * 6,
        life: 1,
      });
    }
  }

  if (t > 3.2) {
    S.steamAcc += dt;
    while (S.steamAcc > 0.22) {
      S.steamAcc -= 0.22;
      S.steam.push({
        x: cx + (rand() - 0.5) * R.w * 0.4,
        y: impactY - 10 - rand() * 20,
        vy: -22 - rand() * 34,
        r: 6 + rand() * 9,
        life: 0.6 + rand() * 0.5,
      });
    }
  }

  // ---- audio ----
  if (!S.sounded && t > 0.04) {
    S.sounded = true;
    ctx.sound.noise(150);
    ctx.sound.beep(150, 80);
  }
  if (!S.tiltSound && t > 1.72) {
    S.tiltSound = true;
    ctx.sound.beep(240, 90);
  }
  if (t > POUR_A && t < POUR_B + 0.2 && t > S.nextPourSound) {
    S.nextPourSound = t + 0.5;
    ctx.sound.noise(70);
  }
  if (t > POUR_B - 0.6 && t > S.nextDrip) {
    S.nextDrip = t + 0.26;
    ctx.sound.beep(700 + Math.floor(rand() * 500), 45);
  }
  if (t > CAP_A + 0.1 && !S.capSound) {
    S.capSound = true;
    ctx.sound.beep(660, 130);
    ctx.sound.beep(880, 180);
  }
}

export function dispose() {}
