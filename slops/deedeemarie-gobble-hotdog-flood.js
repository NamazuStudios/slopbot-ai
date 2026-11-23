export const meta = {
  title: 'Gobble Hotdog Flood',
  author: 'deedeemarie',
  prompt: "flood the screen with 50 turkey's with hotdogs yelling at chat and the streamers",
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const YELLS = [
  'GOBBLE!!!',
  'WHERE IS THE MUSTARD',
  'CHAT IS WRONG',
  'HOTDOG HOTDOG HOTDOG',
  'SAVORYSAILOR!!',
  'WE BROUGHT FIFTY HOTDOGS',
  'STOP TYPING. EAT.',
  'THIS IS A RAID',
  'BUN FIRST. QUESTIONS LATER.',
  'YOUR AIM IS FINE. YOUR DIET IS NOT.',
  'GOBBLE GOBBLE GOBBLE',
  'CRANBERRY IS A LIE',
  'HEY. HEY. HEY CHAT.',
  'ONE OF US IS A HOTDOG',
  'MUSTARD IS A PERSONALITY',
  'SAVORY. SAILOR. LISTEN.',
  'WE HAVE BEEN IN THE FRIDGE',
  'FIFTY BIRDS. ZERO PATIENCE.',
  'SIR THIS IS A GOBBLE ZONE',
  'YOU LOOK HUNGRY. FIX IT.',
];

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const smooth = (a, b, x) => {
  const k = clamp((x - a) / (b - a || 1), 0, 1);
  return k * k * (3 - 2 * k);
};

let S = null;

/* ---------- shapes ---------- */

function rr(g, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.lineTo(x + w - rad, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rad);
  g.lineTo(x + w, y + h - rad);
  g.quadraticCurveTo(x + w, y + h, x + w - rad, y + h);
  g.lineTo(x + rad, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rad);
  g.lineTo(x, y + rad);
  g.quadraticCurveTo(x, y, x + rad, y);
  g.closePath();
}

function drawHotdog(g, mustard, ketchup) {
  g.save();
  g.rotate(-0.28);
  // bun
  g.fillStyle = '#e2ab61';
  g.beginPath();
  g.ellipse(0, 1, 24, 9, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(60,30,10,0.6)';
  g.lineWidth = 1.8;
  g.stroke();
  // sausage
  g.fillStyle = '#b4462e';
  g.beginPath();
  g.ellipse(0, -3, 21, 6.5, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(60,20,8,0.6)';
  g.lineWidth = 1.4;
  g.stroke();
  // shine
  g.fillStyle = 'rgba(255,190,160,0.5)';
  g.beginPath();
  g.ellipse(-6, -5.5, 8, 2.2, 0, 0, Math.PI * 2);
  g.fill();
  // mustard zigzag
  if (mustard) {
    g.strokeStyle = '#f3ce4a';
    g.lineWidth = 3;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-17, -4);
    g.lineTo(-11, -8);
    g.lineTo(-5, -3);
    g.lineTo(1, -8);
    g.lineTo(7, -3);
    g.lineTo(13, -8);
    g.lineTo(18, -4);
    g.stroke();
  }
  if (ketchup) {
    g.strokeStyle = '#d1332b';
    g.lineWidth = 2.4;
    g.beginPath();
    g.moveTo(-15, 0);
    g.lineTo(-9, 2);
    g.lineTo(-3, 0);
    g.lineTo(3, 2);
    g.lineTo(9, 0);
    g.stroke();
  }
  g.restore();
}

function drawTurkey(g, x, y, size, t, mouth, raise, alpha) {
  const s = size / 100;
  const dark = 'rgba(42,20,6,0.6)';
  g.save();
  g.translate(x, y);
  g.rotate(Math.sin(t * 1.8 + size * 0.7) * 0.045);
  g.scale(s, s);
  g.globalAlpha = alpha;
  g.lineJoin = 'round';

  // fan tail
  for (let j = 0; j < 7; j++) {
    const a = -1.15 + j * 0.38;
    g.save();
    g.translate(-26, -4);
    g.rotate(a);
    g.fillStyle = j % 2 ? '#6f4020' : '#8a5327';
    g.beginPath();
    g.ellipse(0, -20, 8.5, 20, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = dark;
    g.lineWidth = 1.6;
    g.stroke();
    g.restore();
  }

  // legs
  g.strokeStyle = '#e09a34';
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-8, 22);
  g.lineTo(-10, 39);
  g.moveTo(-10, 39);
  g.lineTo(-17, 42);
  g.moveTo(-10, 39);
  g.lineTo(-4, 43);
  g.moveTo(8, 22);
  g.lineTo(10, 39);
  g.moveTo(10, 39);
  g.lineTo(3, 43);
  g.moveTo(10, 39);
  g.lineTo(17, 42);
  g.stroke();

  // body
  g.fillStyle = '#a8662f';
  g.beginPath();
  g.ellipse(0, 0, 34, 29, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = dark;
  g.lineWidth = 2;
  g.stroke();

  g.fillStyle = 'rgba(230,176,116,0.5)';
  g.beginPath();
  g.ellipse(6, 7, 20, 14, 0.1, 0, Math.PI * 2);
  g.fill();

  // hotdog-holding wing
  g.save();
  g.translate(4, 2);
  g.rotate(-0.5 + raise * 1.0 + Math.sin(t * 6 + size) * 0.09);
  g.fillStyle = '#98591f';
  g.beginPath();
  g.ellipse(0, 10, 19, 12, 0.15, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = dark;
  g.lineWidth = 1.8;
  g.stroke();
  g.translate(10, 20);
  drawHotdog(g, true, Math.sin(size) > 0.2);
  g.restore();

  // neck
  g.fillStyle = '#a8662f';
  g.beginPath();
  g.ellipse(19, -22, 14, 17, 0.2, 0, Math.PI * 2);
  g.fill();

  // head
  g.beginPath();
  g.ellipse(26, -34, 13, 12, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = dark;
  g.lineWidth = 2;
  g.stroke();

  // wattle
  g.fillStyle = '#d2352e';
  g.beginPath();
  g.ellipse(24, -21, 7, 9, 0.12, 0, Math.PI * 2);
  g.fill();

  // beak, upper
  g.fillStyle = '#eaa63b';
  g.beginPath();
  g.moveTo(34, -37);
  g.lineTo(51, -32);
  g.lineTo(34, -27);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(90,45,10,0.55)';
  g.lineWidth = 1.4;
  g.stroke();

  // beak, lower — opens with the yell
  g.save();
  g.translate(34, -28);
  g.rotate(mouth * 0.55);
  g.fillStyle = '#d99a30';
  g.beginPath();
  g.moveTo(0, 0);
  g.lineTo(16, 3);
  g.lineTo(0, 8);
  g.closePath();
  g.fill();
  g.restore();

  // eye
  g.fillStyle = '#fff7e8';
  g.beginPath();
  g.arc(29, -38, 4.2, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#1b1410';
  g.beginPath();
  g.arc(30.6, -38, 2.2, 0, Math.PI * 2);
  g.fill();

  // brow: permanently offended
  g.strokeStyle = '#4a2608';
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(24, -44);
  g.lineTo(33, -42);
  g.stroke();

  g.restore();
}

/* ---------- init ---------- */

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const rng = ctx.rand;
  const N = 50;
  const st = ctx.streamer;

  const streamer = st
    ? { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H }
    : null;

  const cx = streamer ? streamer.x + streamer.w / 2 : W * 0.5;
  const cy = streamer ? streamer.y + streamer.h / 2 : H * 0.48;
  const minD = Math.min(W, H);
  const faceHalf = streamer
    ? Math.max(streamer.w, streamer.h) * 0.6
    : minD * 0.2;

  const turkeys = [];
  for (let i = 0; i < N; i++) {
    const ang = (i / N) * Math.PI * 2 + rng() * 0.6;
    const rad = faceHalf + 30 + rng() * minD * 0.45;
    let tx = cx + Math.cos(ang) * rad * 1.2;
    let ty = cy + Math.sin(ang) * rad * 0.85;
    tx = clamp(tx, minD * 0.06, W - minD * 0.06);
    ty = clamp(ty, H * 0.12, H - H * 0.07);

    const size = 46 + rng() * 54;
    const m = size * 1.4 + 70;
    const edge = Math.floor(rng() * 4);
    let sx, sy;
    if (edge === 0) {
      sx = tx;
      sy = -m;
    } else if (edge === 1) {
      sx = W + m;
      sy = ty;
    } else if (edge === 2) {
      sx = tx;
      sy = H + m;
    } else {
      sx = -m;
      sy = ty;
    }

    const dx = tx - cx;
    const dy = ty - cy;
    const dl = Math.hypot(dx, dy) || 1;

    turkeys.push({
      tx,
      ty,
      sx,
      sy,
      size,
      delay: rng() * 1.9,
      ph: rng() * Math.PI * 2,
      ex: dx / dl + (rng() - 0.5) * 0.6,
      ey: dy / dl - 0.55 - rng() * 0.5,
    });
  }

  const bannerTop = !streamer || !(streamer.y < H * 0.24 && streamer.x < W * 0.7 && streamer.x + streamer.w > W * 0.3);

  S = {
    W,
    H,
    N,
    cx,
    cy,
    streamer,
    turkeys,
    nextBeep: 2.2,
    boomed: false,
    ended: false,
    bannerY: bannerTop ? H * 0.11 : H * 0.88,
    accent: ctx.accent || '#ff4fa3',
  };
}

/* ---------- helpers ---------- */

function banner(g, text, x, y, size, alpha, accent) {
  g.save();
  g.globalAlpha = alpha;
  g.font = `900 ${size}px system-ui, "Segoe UI", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = g.measureText(text).width + size * 0.95;
  const h = size * 1.5;
  g.fillStyle = 'rgba(9,11,24,0.8)';
  rr(g, x - w / 2, y - h / 2, w, h, h * 0.42);
  g.fill();
  g.strokeStyle = accent;
  g.lineWidth = Math.max(2, size * 0.08);
  g.stroke();
  g.fillStyle = '#fff4f9';
  g.fillText(text, x, y);
  g.restore();
}

function bubble(g, fx, fy, tx, ty, text, size, alpha, accent, W, H) {
  const fs = Math.max(11, Math.round(size * 0.235));
  g.save();
  g.font = `900 ${fs}px system-ui, "Segoe UI", sans-serif`;
  const pad = fs * 0.55;
  const tw = g.measureText(text).width;
  const bw = tw + pad * 2;
  const bh = fs * 1.75;
  let bx = clamp(fx - bw / 2, 6, W - bw - 6);
  let by = fy - bh - 4;
  if (by < 6) by = fy + 6;
  const tailX = clamp(tx, bx + 14, bx + bw - 14);

  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(8,10,20,0.88)';
  g.strokeStyle = accent;
  g.lineWidth = 2;
  rr(g, bx, by, bw, bh, bh * 0.38);
  g.fill();
  g.stroke();
  // tail
  g.beginPath();
  if (by < fy) {
    g.moveTo(tailX - 8, by + bh - 1);
    g.lineTo(tailX, fy - 2);
    g.lineTo(tailX + 8, by + bh - 1);
  } else {
    g.moveTo(tailX - 8, by + 1);
    g.lineTo(tailX, fy + 2);
    g.lineTo(tailX + 8, by + 1);
  }
  g.closePath();
  g.fillStyle = 'rgba(8,10,20,0.88)';
  g.fill();

  g.fillStyle = '#fff6fb';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, bx + bw / 2, by + bh / 2 + 1);
  g.restore();
}

function streamerMark(g, st, t) {
  const r = st.streamer;
  if (!r) return;
  const pad = 16;
  const L = clamp(Math.min(r.w, r.h) * 0.16, 18, 46);
  g.save();
  g.strokeStyle = st.accent;
  g.lineWidth = 3;
  g.globalAlpha = 0.34 + 0.18 * Math.sin(t * 3.4);
  const corners = [
    [r.x - pad, r.y - pad, 1, 1],
    [r.x + r.w + pad, r.y - pad, -1, 1],
    [r.x - pad, r.y + r.h + pad, 1, -1],
    [r.x + r.w + pad, r.y + r.h + pad, -1, -1],
  ];
  for (const c of corners) {
    g.beginPath();
    g.moveTo(c[0] + c[2] * L, c[1]);
    g.lineTo(c[0], c[1]);
    g.lineTo(c[0], c[1] + c[3] * L);
    g.stroke();
  }
  // label
  g.globalAlpha = 0.85;
  g.font = '800 15px system-ui, "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'top';
  const label = 'LIVE STREAMER · SAVORYSAILOR';
  const tw = g.measureText(label).width;
  const lx = clamp(r.x + r.w / 2, tw / 2 + 12, st.W - tw / 2 - 12);
  const ly = clamp(r.y + r.h + pad + 8, 6, st.H - 36);
  g.fillStyle = 'rgba(8,10,20,0.72)';
  rr(g, lx - tw / 2 - 9, ly, tw + 18, 24, 8);
  g.fill();
  g.fillStyle = '#ffe9f3';
  g.fillText(label, lx, ly + 5);
  g.restore();
}

/* ---------- frame ---------- */

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);
  if (!S) return;
  const st = S;

  const FLOOD = 3.0;
  const ESC = 11.5;
  const INHALE = 15.4;
  const BOOM = 16.3;
  const FLING = 17.3;
  const END = 18.6;

  // camera shake — motion, not flicker
  let shake;
  if (t < BOOM) {
    shake = (t < 2.4 ? smooth(0, 1.2, t) * 2.6 : 2.4) + Math.abs(Math.sin(t * 6.1)) * 1.8;
    shake += smooth(ESC, INHALE, t) * 2.4;
    if (t > INHALE) shake *= 1 - smooth(INHALE, BOOM, t) * 0.8;
  } else {
    shake = 11 * (1 - smooth(BOOM, FLING + 0.4, t)) + 1.5;
  }
  const ox = Math.sin(t * 37.3) * shake;
  const oy = Math.cos(t * 29.7) * shake * 0.8;

  g.save();
  g.translate(ox, oy);

  // streamer target brackets
  if (t > 2.0) streamerMark(g, st, t);

  // banner
  let bText = '';
  let bAlpha = 0;
  let bSize = clamp(W * 0.033, 18, 44);
  if (t > 0.4 && t < FLOOD) {
    bText = '50 TURKEYS. 50 HOTDOGS.';
    bAlpha = smooth(0.4, 1.2, t) * (1 - smooth(FLOOD - 0.4, FLOOD, t));
  } else if (t >= FLOOD && t < 6.4) {
    bText = 'THEY BROUGHT MUSTARD';
    bAlpha = smooth(FLOOD, FLOOD + 0.5, t) * (1 - smooth(6.0, 6.4, t));
  } else if (t >= 6.4 && t < ESC) {
    bText = 'THE TURKEYS HAVE CONCERNS';
    bAlpha = smooth(6.4, 6.9, t);
  } else if (t >= ESC && t < INHALE) {
    bText = 'SAVORYSAILOR. LISTEN TO US.';
    bAlpha = smooth(ESC, ESC + 0.4, t);
    bSize = clamp(W * 0.036, 18, 50);
  } else if (t >= INHALE && t < BOOM) {
    bText = 'they are inhaling';
    bAlpha = smooth(INHALE, INHALE + 0.3, t);
    bSize = clamp(W * 0.024, 14, 32);
  } else if (t >= BOOM && t < FLING + 0.4) {
    bText = 'GOBBLE.';
    bAlpha = 1;
    bSize = clamp(W * 0.075, 34, 110);
  } else if (t >= FLING + 0.4) {
    bText = 'chat has been fed';
    bAlpha = smooth(FLING + 0.4, FLING + 0.9, t);
    bSize = clamp(W * 0.028, 16, 38);
  }
  if (bAlpha > 0.01) {
    banner(g, bText, W / 2, st.bannerY, bSize, clamp(bAlpha, 0, 1), st.accent);
  }

  // build positions
  const list = [];
  let landed = 0;
  for (let i = 0; i < st.turkeys.length; i++) {
    const tk = st.turkeys[i];
    const inP = clamp((t - tk.delay) / 0.85, 0, 1);
    if (inP >= 1) landed++;
    const e = 1 - Math.pow(1 - inP, 3);
    let px = tk.sx + (tk.tx - tk.sx) * e;
    let py = tk.sy + (tk.ty - tk.sy) * e;
    px += Math.sin((t + tk.ph) * 1.9) * 8 * e;
    py += Math.sin((t + tk.ph) * 2.7) * 9 * e;

    let sc = 1;
    let alpha = e;

    if (t > INHALE && t < BOOM) {
      const k = smooth(INHALE, BOOM, t);
      px += (st.cx - px) * 0.05 * k;
      py += (st.cy - py) * 0.05 * k;
      sc *= 1 - 0.13 * k;
    }

    if (t >= BOOM) {
      const k = smooth(BOOM, BOOM + 0.45, t);
      const dx = px - st.cx;
      const dy = py - st.cy;
      const dl = Math.hypot(dx, dy) || 1;
      px += (dx / dl) * 34 * k;
      py += (dy / dl) * 34 * k;
    }

    if (t > FLING) {
      const k = Math.pow(smooth(FLING, END + 0.2, t), 1.6);
      px += tk.ex * k * W * 0.95;
      py += tk.ey * k * H * 1.15;
      alpha *= 1 - smooth(FLING + 0.45, END, t);
      sc *= 1 - 0.28 * k;
    }

    let mouth = 0.3 + 0.5 * (0.5 + 0.5 * Math.sin(t * 11 + tk.ph * 3));
    if (t > INHALE && t < BOOM) mouth *= 0.12;
    if (t >= BOOM && t < FLING) mouth = 0.95;

    const raise = smooth(ESC, ESC + 2.0, t) + Math.sin(t * 7 + tk.ph) * 0.12 * smooth(ESC, ESC + 2, t);

    list.push({ i, tk, px, py, sc, alpha, mouth, raise });
  }

  // turkeys, back to front
  list.sort((a, b) => a.py - b.py);
  for (const o of list) {
    if (o.alpha <= 0.01) continue;
    drawTurkey(g, o.px, o.py, o.tk.size * o.sc, t, o.mouth, o.raise, clamp(o.alpha, 0, 1));
  }

  // rotating chorus of speech bubbles
  if (t > FLOOD && t < INHALE + 0.2) {
    const SLOT = 1.6;
    const slot = Math.floor(t / SLOT);
    const frac = t / SLOT - slot;
    const group = ((slot % 6) + 6) % 6;
    const a = smooth(0, 0.14, frac) * (1 - smooth(0.8, 1, frac));
    if (a > 0.02) {
      for (const o of list) {
        if (o.i % 6 !== group) continue;
        if (o.alpha < 0.4) continue;
        const text = YELLS[(o.i * 5 + slot * 3) % YELLS.length];
        bubble(
          g,
          o.px,
          o.py - o.tk.size * o.sc * 0.62,
          o.px + Math.cos(o.tk.ph) * 6,
          o.py - o.tk.size * o.sc * 0.28,
          text,
          o.tk.size * o.sc,
          a * clamp(o.alpha, 0, 1),
          st.accent,
          W,
          H
        );
      }
    }
  }

  // blast ring
  if (t > BOOM && t < END) {
    const k = clamp((t - BOOM) / (FLING - BOOM + 0.3), 0, 1.6);
    const R = Math.min(W, H) * 0.08 + k * Math.max(W, H) * 0.9;
    g.save();
    g.globalAlpha = Math.max(0, 0.5 * (1 - k));
    g.strokeStyle = st.accent;
    g.lineWidth = Math.max(2, 12 * (1 - k));
    g.beginPath();
    g.arc(st.cx, st.cy, R, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 3;
    for (let j = 0; j < 26; j++) {
      const a2 = (j / 26) * Math.PI * 2 + 0.18;
      const r1 = R * 0.94;
      const r2 = R * 1.14;
      g.beginPath();
      g.moveTo(st.cx + Math.cos(a2) * r1, st.cy + Math.sin(a2) * r1);
      g.lineTo(st.cx + Math.cos(a2) * r2, st.cy + Math.sin(a2) * r2);
      g.stroke();
    }
    g.restore();
  }

  // counter, top-left
  if (t < FLING + 0.6) {
    g.save();
    g.globalAlpha = 0.92;
    g.font = '800 15px system-ui, "Segoe UI", sans-serif';
    g.textAlign = 'left';
    g.textBaseline = 'top';
    const label = t < FLOOD ? `TURKEYS LANDED ${String(landed).padStart(2, '0')}/50` : '50 TURKEYS · 50 HOTDOGS · 0 PATIENCE';
    const tw = g.measureText(label).width;
    g.fillStyle = 'rgba(8,10,20,0.72)';
    rr(g, 12, 12, tw + 20, 28, 9);
    g.fill();
    g.fillStyle = '#ffe9f3';
    g.fillText(label, 22, 18);
    g.restore();
  }

  g.restore();
  g.globalAlpha = 1;

  // ---- sound ----
  if (t > 2.2 && t < INHALE && t >= st.nextBeep) {
    st.nextBeep = t + 0.4 + Math.random() * 0.45;
    ctx.sound.beep(180 + Math.random() * 260, 70);
  }
  if (!st.boomed && t >= BOOM) {
    st.boomed = true;
    ctx.sound.noise(520);
    ctx.sound.beep(95, 380);
  }

  if (!st.ended && t > END) {
    st.ended = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
