export const meta = {
  title: 'Yogurt Tuxedo Thrust',
  author: 'cooooter',
  prompt: 'a man in a suit with spilled yogurt as his face thrusts his hips forward and backwards while his hands are placed behind his head. make his shoes fancy and his face showing pleasure.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const CREAM = '#fff6e2';
const CREAM_DARK = '#f2dfb8';
const CREAM_SHADOW = '#d9c294';
const GOLD = '#ffd45e';
const GOLD_DARK = '#c9962f';
const INK = '#171733';
const BLUSH = '#ff8fae';

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, u) { return a + (b - a) * u; }
function smooth(u) { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); }

function rr(c, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
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

function star(c, x, y, r, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.fillStyle = GOLD;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.34;
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
  c.restore();
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;

  const s = ctx.streamer;
  const S = s
    ? { x: s.x * W, y: s.y * H, w: s.w * W, h: s.h * H }
    : { x: W * 0.25, y: H * 0.08, w: W * 0.5, h: H * 0.78 };

  // Yogurt blob shape, in blob-local unit coords.
  const blob = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    blob.push({
      a,
      r: 0.82 + ctx.rand() * 0.24,
      w: 0.6 + ctx.rand() * 1.0,
    });
  }

  // Thrust beat schedule: starts easy, gets frantic.
  const beats = [];
  let bt = 4.7;
  let iv = 0.92;
  while (bt < 13.3) {
    beats.push({ t: bt, iv });
    bt += iv;
    iv = Math.max(0.52, iv - 0.032);
  }

  ctx.state = {
    S,
    blob,
    beats,
    fired: {},
    beatIdx: -1,
    hearts: [],
    ended: false,
    shoeSparks: [
      { x: 0.28, y: 0.9, ph: 0.2 },
      { x: 0.5, y: 0.86, ph: 1.4 },
      { x: 0.72, y: 0.9, ph: 2.6 },
      { x: 0.4, y: 0.94, ph: 3.7 },
      { x: 0.62, y: 0.95, ph: 0.9 },
    ],
  };
}

function beatPulse(state, t) {
  const beats = state.beats;
  if (!beats.length) return { p: 0, idx: -1 };
  let idx = -1;
  for (let i = 0; i < beats.length; i++) {
    if (beats[i].t <= t) idx = i; else break;
  }
  if (idx < 0) return { p: 0, idx: -1 };
  const b = beats[idx];
  const next = idx + 1 < beats.length ? beats[idx + 1].t : b.t + b.iv;
  const u = clamp((t - b.t) / (next - b.t), 0, 1);
  // Quick snap forward, slower settle back.
  const p = u < 0.32 ? smooth(u / 0.32) : 1 - smooth((u - 0.32) / 0.68) * 0.85;
  return { p, idx };
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const st = ctx.state;
  const S = st.S;
  const cx = S.x + S.w * 0.5;
  const cy = S.y + S.h * 0.5;

  c.clearRect(0, 0, W, H);

  const suitIn = smooth((t - 2.2) / 0.9);
  const shoeIn = smooth((t - 3.1) / 0.7);
  const splatIn = smooth(t / 0.8);
  const finalGlow = smooth((t - 13.4) / 0.8);
  const { p: pulse, idx } = beatPulse(st, t);

  // ---- sounds -------------------------------------------------------------
  const sfx = (key, fn) => {
    if (!st.fired[key]) { st.fired[key] = true; fn(); }
  };
  if (t > 0.4) sfx('splat', () => ctx.sound.noise(280));
  if (t > 2.25) sfx('suit', () => { ctx.sound.noise(180); ctx.sound.beep(220, 90); });
  if (t > 3.1) sfx('shoes', () => {
    ctx.sound.beep(1180, 90);
    ctx.sound.beep(1560, 90);
  });
  if (t > 13.4) sfx('final', () => {
    ctx.sound.beep(660, 220);
    ctx.sound.beep(990, 320);
    ctx.sound.noise(240);
  });

  if (idx !== st.beatIdx) {
    st.beatIdx = idx;
    if (idx >= 0) {
      const f = idx % 4 === 0 ? 190 : 150;
      ctx.sound.beep(f, 65);
      if (t > 4.5 && t < 13.6) {
        for (let k = 0; k < 2; k++) {
          st.hearts.push({
            x: S.x + S.w * (0.3 + ctx.rand() * 0.4),
            y: S.y + S.h * (0.16 + ctx.rand() * 0.16),
            vx: (ctx.rand() - 0.5) * 0.5,
            vy: -(0.4 + ctx.rand() * 0.5),
            life: 1,
            size: 0.7 + ctx.rand() * 0.6,
            ph: ctx.rand() * 6,
          });
        }
      }
    }
  }

  // ---- speed lines behind the frame --------------------------------------
  if (pulse > 0.02 && suitIn > 0.5) {
    c.save();
    c.globalAlpha = 0.55 * pulse;
    c.strokeStyle = ctx.accent;
    c.lineWidth = Math.max(2, W * 0.004);
    c.lineCap = 'round';
    const lines = 7;
    for (let i = 0; i < lines; i++) {
      const yy = S.y + S.h * (0.12 + (i / (lines - 1)) * 0.78);
      const len = S.w * (0.10 + 0.14 * pulse) * (0.6 + 0.4 * Math.sin(i * 1.7 + t * 9));
      c.beginPath();
      c.moveTo(S.x - S.w * 0.02, yy);
      c.lineTo(S.x - len, yy + S.h * 0.01);
      c.stroke();
      c.beginPath();
      c.moveTo(S.x + S.w * 1.02, yy);
      c.lineTo(S.x + S.w * 1.02 + len, yy - S.h * 0.01);
      c.stroke();
    }
    c.restore();
  }

  // ---- floor shadow -------------------------------------------------------
  if (shoeIn > 0) {
    c.save();
    c.globalAlpha = 0.20 * shoeIn;
    c.fillStyle = INK;
    c.beginPath();
    c.ellipse(cx, S.y + S.h * 0.985, S.w * 0.32, S.h * 0.025, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // ---- suit jacket overlay -----------------------------------------------
  if (suitIn > 0.001) {
    const bob = pulse * S.h * 0.008;
    const sc = 1 + pulse * 0.045;
    c.save();
    c.globalAlpha = suitIn;
    c.translate(cx, cy + bob);
    c.scale(sc, sc);
    c.translate(-cx, -cy);

    // Jacket body, just an outline hugging the live shot.
    c.lineWidth = Math.max(5, S.w * 0.022);
    c.strokeStyle = INK;
    rr(c, S.x + 2, S.y + 2, S.w - 4, S.h - 4, S.w * 0.06);
    c.stroke();

    c.lineWidth = Math.max(1.5, S.w * 0.005);
    c.strokeStyle = ctx.accent;
    c.globalAlpha = suitIn * 0.75;
    rr(c, S.x + S.w * 0.018, S.y + S.h * 0.018, S.w * 0.964, S.h * 0.964, S.w * 0.055);
    c.stroke();
    c.globalAlpha = suitIn;

    // Lapels.
    c.fillStyle = '#232347';
    c.beginPath();
    c.moveTo(S.x, S.y);
    c.lineTo(S.x + S.w * 0.30, S.y);
    c.lineTo(S.x + S.w * 0.5, S.y + S.h * 0.42);
    c.lineTo(S.x + S.w * 0.36, S.y + S.h * 0.20);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(S.x + S.w, S.y);
    c.lineTo(S.x + S.w * 0.70, S.y);
    c.lineTo(S.x + S.w * 0.5, S.y + S.h * 0.42);
    c.lineTo(S.x + S.w * 0.64, S.y + S.h * 0.20);
    c.closePath();
    c.fill();

    // Lapel sheen.
    c.strokeStyle = 'rgba(255,255,255,0.22)';
    c.lineWidth = Math.max(1, S.w * 0.003);
    c.beginPath();
    c.moveTo(S.x + S.w * 0.06, S.y + S.h * 0.02);
    c.lineTo(S.x + S.w * 0.34, S.y + S.h * 0.24);
    c.stroke();
    c.beginPath();
    c.moveTo(S.x + S.w * 0.94, S.y + S.h * 0.02);
    c.lineTo(S.x + S.w * 0.66, S.y + S.h * 0.24);
    c.stroke();

    // Bow tie, because formality.
    const bx = cx;
    const by = S.y + S.h * 0.05;
    const bw = S.w * 0.085;
    const bh = S.h * 0.028;
    c.fillStyle = ctx.accent;
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx - bw, by - bh);
    c.lineTo(bx - bw, by + bh);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + bw, by - bh);
    c.lineTo(bx + bw, by + bh);
    c.closePath();
    c.fill();
    c.fillStyle = INK;
    rr(c, bx - bw * 0.22, by - bh * 0.55, bw * 0.44, bh * 1.1, bh * 0.3);
    c.fill();

    // Pocket square.
    c.fillStyle = CREAM;
    c.beginPath();
    c.moveTo(S.x + S.w * 0.80, S.y + S.h * 0.58);
    c.lineTo(S.x + S.w * 0.89, S.y + S.h * 0.555);
    c.lineTo(S.x + S.w * 0.875, S.y + S.h * 0.60);
    c.closePath();
    c.fill();

    c.restore();
  }

  // ---- fancy shoes --------------------------------------------------------
  if (shoeIn > 0.001) {
    const lift = pulse * S.h * 0.012;
    c.save();
    c.globalAlpha = shoeIn;
    c.translate(0, -lift);

    const shoeW = S.w * 0.21;
    const shoeH = S.h * 0.062;
    const baseY = S.y + S.h * 0.945;

    const drawShoe = (ox, dir, tap) => {
      c.save();
      c.translate(ox, baseY + tap * S.h * 0.012);
      c.rotate(dir * 0.05);

      // Sole.
      c.fillStyle = '#12122a';
      c.beginPath();
      c.moveTo(-shoeW * 0.5, shoeH * 0.30);
      c.quadraticCurveTo(-shoeW * 0.56, shoeH * 0.02, -shoeW * 0.18, -shoeH * 0.02);
      c.quadraticCurveTo(shoeW * 0.30, -shoeH * 0.06, shoeW * 0.62 * dir + shoeW * 0.10, shoeH * 0.06);
      c.quadraticCurveTo(shoeW * 0.72 * dir + shoeW * 0.08, shoeH * 0.24, shoeW * 0.30, shoeH * 0.34);
      c.quadraticCurveTo(-shoeW * 0.12, shoeH * 0.44, -shoeW * 0.5, shoeH * 0.30);
      c.closePath();
      c.fill();

      // Glossy upper.
      const g = c.createLinearGradient(0, -shoeH * 0.2, 0, shoeH * 0.3);
      g.addColorStop(0, '#3b3b70');
      g.addColorStop(1, '#0d0d20');
      c.fillStyle = g;
      c.beginPath();
      c.moveTo(-shoeW * 0.46, shoeH * 0.22);
      c.quadraticCurveTo(-shoeW * 0.5, -shoeH * 0.02, -shoeW * 0.16, -shoeH * 0.04);
      c.quadraticCurveTo(shoeW * 0.28, -shoeH * 0.08, shoeW * 0.58 * dir + shoeW * 0.10, shoeH * 0.04);
      c.quadraticCurveTo(shoeW * 0.62 * dir + shoeW * 0.08, shoeH * 0.18, shoeW * 0.26, shoeH * 0.24);
      c.quadraticCurveTo(-shoeW * 0.1, shoeH * 0.32, -shoeW * 0.46, shoeH * 0.22);
      c.closePath();
      c.fill();

      // Patent shine.
      c.globalAlpha = shoeIn * 0.6;
      c.strokeStyle = '#cfd6ff';
      c.lineWidth = Math.max(1.5, shoeW * 0.03);
      c.beginPath();
      c.moveTo(-shoeW * 0.22, shoeH * 0.03);
      c.quadraticCurveTo(shoeW * 0.06, -shoeH * 0.03, shoeW * 0.34 * dir, shoeH * 0.03);
      c.stroke();
      c.globalAlpha = shoeIn;

      // Gold buckle.
      c.fillStyle = GOLD;
      rr(c, -shoeW * 0.06, -shoeH * 0.06, shoeW * 0.20, shoeH * 0.13, shoeH * 0.04);
      c.fill();
      c.fillStyle = GOLD_DARK;
      rr(c, -shoeW * 0.005, -shoeH * 0.025, shoeW * 0.09, shoeH * 0.06, shoeH * 0.02);
      c.fill();

      // Toe gem.
      c.fillStyle = CREAM;
      c.beginPath();
      c.arc(shoeW * 0.40 * dir, shoeH * 0.08, shoeW * 0.035, 0, Math.PI * 2);
      c.fill();

      c.restore();
    };

    const tap = pulse * 0.8;
    drawShoe(cx - S.w * 0.185, -1, tap);
    drawShoe(cx + S.w * 0.185, 1, -tap * 0.4);

    // Sparkles on the loafers.
    for (const sp of st.shoeSparks) {
      const tw = 0.55 + 0.45 * Math.sin(t * 7 + sp.ph);
      star(c, S.x + S.w * sp.x, S.y + S.h * sp.y, S.w * (0.012 + 0.010 * tw), shoeIn * tw);
    }

    // Final gold glow under the shoes.
    if (finalGlow > 0) {
      c.globalAlpha = finalGlow * 0.35;
      const glow = c.createRadialGradient(cx, baseY, 0, cx, baseY, S.w * 0.42);
      glow.addColorStop(0, 'rgba(255,212,94,0.9)');
      glow.addColorStop(1, 'rgba(255,212,94,0)');
      c.fillStyle = glow;
      c.beginPath();
      c.ellipse(cx, baseY + shoeH * 0.2, S.w * 0.42, S.h * 0.10, 0, 0, Math.PI * 2);
      c.fill();
    }

    c.restore();
  }

  // ---- yogurt face --------------------------------------------------------
  {
    const bx = cx;
    const by = S.y + S.h * 0.23;
    const rx = S.w * 0.40;
    const ry = S.h * 0.19;
    const wob = 1 + pulse * 0.06;

    c.save();
    c.globalAlpha = 0.97 * splatIn;
    c.translate(bx, by);
    c.scale(wob, wob);

    c.fillStyle = CREAM;
    c.beginPath();
    for (let i = 0; i < st.blob.length; i++) {
      const q = st.blob[i];
      const rr2 = q.r * (1 + 0.045 * Math.sin(t * 3.2 + q.w * 5));
      const px = Math.cos(q.a) * rx * rr2;
      const py = Math.sin(q.a) * ry * rr2;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();

    // Drips.
    c.fillStyle = CREAM;
    for (let i = 0; i < 5; i++) {
      const dx = -rx * 0.7 + (i / 4) * rx * 1.4;
      const dl = ry * (0.22 + 0.16 * Math.sin(t * 2.1 + i * 1.9));
      const dw = rx * 0.075;
      c.beginPath();
      c.moveTo(dx - dw, ry * 0.55);
      c.quadraticCurveTo(dx - dw * 0.9, ry * 0.55 + dl, dx, ry * 0.55 + dl + dw);
      c.quadraticCurveTo(dx + dw * 0.9, ry * 0.55 + dl, dx + dw, ry * 0.55);
      c.closePath();
      c.fill();
      c.beginPath();
      c.arc(dx, ry * 0.55 + dl + dw, dw * 0.9, 0, Math.PI * 2);
      c.fill();
    }

    // Glossy top highlight.
    c.fillStyle = 'rgba(255,255,255,0.65)';
    c.beginPath();
    c.ellipse(-rx * 0.28, -ry * 0.42, rx * 0.22, ry * 0.11, -0.5, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.32)';
    c.beginPath();
    c.ellipse(-rx * 0.05, -ry * 0.55, rx * 0.10, ry * 0.05, -0.4, 0, Math.PI * 2);
    c.fill();

    // Blush.
    c.fillStyle = BLUSH;
    c.globalAlpha = 0.42 * splatIn;
    c.beginPath();
    c.ellipse(-rx * 0.50, ry * 0.10, rx * 0.13, ry * 0.06, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(rx * 0.50, ry * 0.10, rx * 0.13, ry * 0.06, 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.97 * splatIn;

    // Blissful closed eyes.
    c.strokeStyle = INK;
    c.lineWidth = Math.max(2.5, rx * 0.035);
    c.lineCap = 'round';
    const eyeY = -ry * 0.06 + pulse * ry * 0.02;
    c.beginPath();
    c.arc(-rx * 0.28, eyeY, rx * 0.10, Math.PI * 0.12, Math.PI * 0.88);
    c.stroke();
    c.beginPath();
    c.arc(rx * 0.28, eyeY, rx * 0.10, Math.PI * 0.12, Math.PI * 0.88);
    c.stroke();

    // Content little smile.
    c.beginPath();
    c.arc(0, ry * 0.13, rx * 0.20, Math.PI * 0.16, Math.PI * 0.84);
    c.stroke();

    // A leaf of mint, because yogurt.
    c.fillStyle = '#7fbf6a';
    c.beginPath();
    c.ellipse(rx * 0.60, -ry * 0.44, rx * 0.06, ry * 0.035, 0.7, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }

  // ---- floating hearts ----------------------------------------------------
  for (let i = st.hearts.length - 1; i >= 0; i--) {
    const h = st.hearts[i];
    h.life -= dt * 0.45;
    h.x += h.vx * dt * 40;
    h.y += h.vy * dt * 40;
    if (h.life <= 0) { st.hearts.splice(i, 1); continue; }
    const sz = S.w * 0.02 * h.size * (0.7 + 0.3 * Math.sin(t * 8 + h.ph));
    c.save();
    c.globalAlpha = clamp(h.life, 0, 1) * 0.85;
    c.fillStyle = ctx.accent;
    c.translate(h.x, h.y);
    c.rotate(Math.sin(t * 3 + h.ph) * 0.25);
    c.beginPath();
    c.moveTo(0, sz * 0.75);
    c.bezierCurveTo(-sz * 1.4, -sz * 0.15, -sz * 0.6, -sz * 1.15, 0, -sz * 0.35);
    c.bezierCurveTo(sz * 0.6, -sz * 1.15, sz * 1.4, -sz * 0.15, 0, sz * 0.75);
    c.closePath();
    c.fill();
    c.restore();
  }

  // ---- thrust-o-meter -----------------------------------------------------
  if (suitIn > 0.2) {
    const mw = S.w * 0.34;
    const mh = S.h * 0.026;
    const mx = S.x + S.w * 0.06;
    const my = S.y + S.h * 0.965 - mh;
    const frac = clamp(t / 13.4, 0, 1);
    c.save();
    c.globalAlpha = suitIn * 0.9;
    c.fillStyle = 'rgba(23,23,51,0.72)';
    rr(c, mx - mh * 0.3, my - mh * 0.3, mw + mh * 0.6, mh + mh * 0.6, mh * 0.8);
    c.fill();
    c.fillStyle = ctx.accent;
    rr(c, mx, my, Math.max(mh, mw * frac), mh, mh * 0.6);
    c.fill();
    c.fillStyle = CREAM;
    c.font = `800 ${Math.max(9, mh * 0.9)}px system-ui, sans-serif`;
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    c.fillText('BLISS', mx + mh * 0.4, my + mh * 0.55);
    c.restore();
  }

  // ---- captions -----------------------------------------------------------
  const captions = [
    { a: 0.35, b: 2.9, text: `${(ctx.trigger && ctx.trigger.login ? ctx.trigger.login : 'SAVORYSAILOR').toUpperCase()}, YOUR FACE IS YOGURT.` },
    { a: 2.9, b: 5.9, text: 'the suit is sharp. the shoes are illegal.' },
    { a: 5.9, b: 9.8, text: 'hands behind the head. this is cardio.' },
    { a: 9.8, b: 13.2, text: 'flawless form. flawless loafers.' },
    { a: 13.2, b: 16.4, text: 'and the yogurt holds.' },
  ];
  for (const cap of captions) {
    if (t < cap.a || t > cap.b) continue;
    const fade = Math.min(smooth((t - cap.a) / 0.25), smooth((cap.b - t) / 0.25));
    const fs = Math.min(H * 0.058, W * 0.045);
    c.save();
    c.font = `900 ${fs}px system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tw = c.measureText(cap.text).width;
    const padX = fs * 0.6;
    const padY = fs * 0.45;
    const pw = tw + padX * 2;
    const ph = fs + padY * 2;
    const px = clamp(cx - pw / 2, W * 0.02, W * 0.98 - pw);
    const py = Math.min(S.y + S.h + ph * 0.55, H - ph * 0.8);
    c.globalAlpha = fade * 0.92;
    c.fillStyle = 'rgba(23,23,51,0.86)';
    rr(c, px, py - ph / 2, pw, ph, ph * 0.28);
    c.fill();
    c.strokeStyle = ctx.accent;
    c.lineWidth = Math.max(2, fs * 0.05);
    rr(c, px, py - ph / 2, pw, ph, ph * 0.28);
    c.stroke();
    c.globalAlpha = fade;
    c.fillStyle = CREAM;
    c.fillText(cap.text, px + pw / 2, py + fs * 0.04);
    c.restore();
  }

  // ---- curtain ------------------------------------------------------------
  if (t > 15.7) {
    const fadeOut = smooth((t - 15.7) / 0.55);
    c.save();
    c.globalAlpha = fadeOut * 0.9;
    c.fillStyle = 'rgba(23,23,51,0.55)';
    const bandH = H * 0.05;
    c.fillRect(0, 0, W, bandH);
    c.fillRect(0, H - bandH, W, bandH);
    c.restore();
    if (t > 16.45 && !st.ended) {
      st.ended = true;
      ctx.done();
    }
  }
}

export function dispose(ctx) {
  if (ctx && ctx.state) {
    ctx.state.hearts.length = 0;
  }
}
