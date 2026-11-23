// Grand Face Drop — a piano falls keys-first onto the live camera.
// Transparent glass overlay: the piano, dust and notes float over the real
// stream, aimed at ctx.streamer, and end up on top of absolutely everything.

const TAU = Math.PI * 2;
const FALL_START = 0.5;
const IMPACT = 2.15;
const END = 9.2;

export const meta = {
  title: 'Grand Face Drop',
  author: 'okiedokie24',
  prompt: 'when the user types !pianofall have a piano fall on the person\'s face on screen. Have it in front of every layer on the screen',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  assets: [],
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!pianofall"] }
  ],
};

let S = null;

function init(ctx) {
  const rnd = () => ctx.rand();
  S = {
    dust: [],
    debris: [],
    notes: [],
    hit: false,
    fallBeep: 0,
    plink: 0,
    plink2: 0,
    slide: false,
    doneFired: false,
  };
  for (let i = 0; i < 46; i++) {
    S.dust.push({
      vx: (rnd() * 2 - 1) * (70 + rnd() * 280),
      vy: -(30 + rnd() * 220),
      r: 0.012 + rnd() * 0.05,
      life: 0.55 + rnd() * 1.15,
      tone: rnd(),
    });
  }
  for (let i = 0; i < 14; i++) {
    S.debris.push({
      x: (rnd() * 2 - 1) * 0.35,
      vx: (rnd() * 2 - 1) * 260,
      vy: -(180 + rnd() * 330),
      w: 0.012 + rnd() * 0.022,
      h: 0.028 + rnd() * 0.04,
      rot: rnd() * TAU,
      spin: (rnd() * 2 - 1) * 9,
      black: rnd() < 0.35,
      life: 1.1 + rnd() * 0.8,
    });
  }
  const noteTimes = [2.78, 3.10, 3.42, 3.74, 4.10, 4.62, 5.35, 6.10];
  for (let i = 0; i < noteTimes.length; i++) {
    S.notes.push({
      at: noteTimes[i],
      x: (rnd() * 2 - 1) * 0.30,
      drift: (rnd() * 2 - 1) * 26,
      sway: rnd() * TAU,
      size: 0.035 + rnd() * 0.035,
      glyph: rnd() < 0.5 ? '\u266A' : '\u266B',
    });
  }
}

function aimRect(ctx) {
  const st = ctx.streamer;
  if (st && st.w > 0 && st.h > 0) {
    return {
      x: st.x * ctx.width,
      y: st.y * ctx.height,
      w: st.w * ctx.width,
      h: st.h * ctx.height,
    };
  }
  return {
    x: ctx.width * 0.24,
    y: ctx.height * 0.08,
    w: ctx.width * 0.52,
    h: ctx.height * 0.72,
  };
}

function roundRect(g, x, y, w, h, rad) {
  const r = Math.min(rad, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function label(g, text, x, y, size, color, align) {
  g.font = '800 ' + size + 'px system-ui, sans-serif';
  g.textAlign = align || 'left';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, size * 0.16);
  g.strokeStyle = 'rgba(7,10,20,0.9)';
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function fitSize(g, text, base, maxW) {
  if (maxW <= 0 || !text) return base;
  g.font = '800 ' + base + 'px system-ui, sans-serif';
  const w = g.measureText(text).width;
  if (w <= maxW) return base;
  return Math.max(base * 0.42, base * (maxW / w));
}

function caption(g, text, cx, y, base, maxW, color) {
  const size = fitSize(g, text, base, maxW);
  g.font = '800 ' + size + 'px system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const tw = g.measureText(text).width;
  const padX = size * 0.55;
  const padY = size * 0.34;
  g.fillStyle = 'rgba(8,11,22,0.62)';
  roundRect(g, cx - tw / 2 - padX, y - size / 2 - padY, tw + padX * 2, size + padY * 2, size * 0.4);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.14)';
  g.lineWidth = 2;
  g.stroke();
  label(g, text, cx, y + size * 0.03, size, color, 'center');
}

// ------------------------------------------------------------------ piano

function drawPiano(g, cx, cy, pw, rot, sx, sy, alpha) {
  const w = pw;
  const h = pw * 0.76;
  g.save();
  g.globalAlpha *= alpha;
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(sx, sy);

  // body
  const grad = g.createLinearGradient(-w * 0.5, -h, w * 0.5, 0);
  grad.addColorStop(0, '#2a2c34');
  grad.addColorStop(0.42, '#101116');
  grad.addColorStop(1, '#07080b');
  g.fillStyle = grad;
  roundRect(g, -w * 0.5, -h, w, h * 0.87, w * 0.035);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.16)';
  g.lineWidth = Math.max(1.5, w * 0.005);
  g.stroke();

  // top cap
  g.fillStyle = '#34363f';
  roundRect(g, -w * 0.525, -h - h * 0.045, w * 1.05, h * 0.062, w * 0.014);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.28)';
  g.fillRect(-w * 0.5, -h - h * 0.045, w * 1.0, Math.max(1, h * 0.008));

  // panel inlay
  g.strokeStyle = 'rgba(255,255,255,0.09)';
  g.lineWidth = Math.max(1, w * 0.004);
  roundRect(g, -w * 0.35, -h * 0.92, w * 0.7, h * 0.58, w * 0.012);
  g.stroke();

  // gold brand
  g.font = '700 ' + Math.max(9, w * 0.045) + 'px Georgia, serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = 'rgba(219,186,110,0.92)';
  g.fillText('SLOP & SONS', 0, -h * 0.64);

  // fallboard
  g.fillStyle = '#191a20';
  g.fillRect(-w * 0.545, -h * 0.205, w * 1.09, h * 0.05);
  g.fillStyle = 'rgba(255,255,255,0.10)';
  g.fillRect(-w * 0.545, -h * 0.205, w * 1.09, Math.max(1, h * 0.004));

  // keybed
  g.fillStyle = '#e9dfc9';
  g.fillRect(-w * 0.55, -h * 0.155, w * 1.10, h * 0.145);

  const kx = -w * 0.53;
  const kw = w * 1.06;
  const ky = -h * 0.145;
  const kh = h * 0.115;
  const nWhite = 15;
  const wkW = kw / nWhite;
  for (let i = 0; i < nWhite; i++) {
    g.fillStyle = i % 2 === 0 ? '#fbf7ec' : '#f1ebdc';
    g.fillRect(kx + i * wkW + wkW * 0.06, ky, wkW * 0.88, kh);
  }
  for (let i = 0; i < nWhite - 1; i++) {
    if (i % 7 === 2 || i % 7 === 6) continue;
    g.fillStyle = '#0a0b0f';
    g.fillRect(kx + (i + 1) * wkW - wkW * 0.28, ky, wkW * 0.56, kh * 0.62);
    g.fillStyle = 'rgba(255,255,255,0.10)';
    g.fillRect(kx + (i + 1) * wkW - wkW * 0.28, ky, wkW * 0.56, Math.max(1, kh * 0.05));
  }
  // slab under the keys
  g.fillStyle = '#0d0e12';
  g.fillRect(-w * 0.56, -h * 0.012, w * 1.12, h * 0.032);
  g.fillStyle = 'rgba(255,255,255,0.13)';
  g.fillRect(-w * 0.56, -h * 0.012, w * 1.12, Math.max(1, h * 0.004));

  g.restore();
}

// ---------------------------------------------------------------- effects

function drawDust(g, fx, fy, ti, W) {
  if (ti <= 0) return;
  for (const d of S.dust) {
    if (ti > d.life) continue;
    const k = (1 - Math.exp(-ti * 3.0)) / 3.0;
    const x = fx + d.vx * k * W * 0.25;
    const y = fy + d.vy * k * W * 0.25 + 42 * ti * ti * W * 0.05;
    const life = 1 - ti / d.life;
    const r = d.r * W * (0.6 + (ti / d.life) * 2.1);
    g.fillStyle = d.tone < 0.5
      ? 'rgba(236,228,210,' + (0.42 * life).toFixed(3) + ')'
      : 'rgba(196,186,170,' + (0.32 * life).toFixed(3) + ')';
    g.beginPath();
    g.arc(x, y, r, 0, TAU);
    g.fill();
  }
}

function drawDebris(g, fx, fy, ti, W) {
  if (ti <= 0) return;
  for (const p of S.debris) {
    if (ti > p.life) continue;
    const life = 1 - ti / p.life;
    const x = fx + p.x * W + p.vx * ti;
    const y = fy + p.vy * ti + 760 * ti * ti;
    g.save();
    g.globalAlpha *= life;
    g.translate(x, y);
    g.rotate(p.rot + p.spin * ti);
    g.fillStyle = p.black ? '#12131a' : '#f6f0e0';
    g.fillRect(-p.w * W * 0.5, -p.h * W * 0.5, p.w * W, p.h * W);
    g.restore();
  }
}

function drawNotes(g, fx, fy, t, W, H) {
  for (const n of S.notes) {
    const ti = t - n.at;
    if (ti < 0 || ti > 2.6) continue;
    const life = ti < 0.3 ? ti / 0.3 : Math.min(1, (2.6 - ti) / 0.7);
    const x = fx + n.x * W + n.drift * ti + Math.sin(ti * 2.4 + n.sway) * W * 0.02;
    const y = fy - H * 0.24 - ti * H * 0.10;
    g.save();
    g.globalAlpha *= Math.max(0, life);
    g.font = '700 ' + (n.size * W) + 'px Georgia, serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = Math.max(2, n.size * W * 0.16);
    g.strokeStyle = 'rgba(7,10,20,0.85)';
    g.strokeText(n.glyph, x, y);
    g.fillStyle = '#ffe6a1';
    g.fillText(n.glyph, x, y);
    g.restore();
  }
}

function drawReticle(g, r, t, W) {
  const pulse = 0.55 + 0.35 * Math.sin(t * 9);
  const pad = r.w * 0.05;
  const x = r.x + r.w * 0.18 - pad;
  const y = r.y + r.h * 0.16 - pad;
  const w = r.w * 0.64 + pad * 2;
  const h = r.h * 0.55 + pad * 2;
  const c = Math.min(w, h) * 0.16;
  g.save();
  g.globalAlpha *= pulse;
  g.strokeStyle = '#ff5fa2';
  g.lineWidth = Math.max(2, W * 0.0035);
  g.lineCap = 'round';
  const corners = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [px, py, dx, dy] of corners) {
    g.beginPath();
    g.moveTo(px + dx * c, py);
    g.lineTo(px, py);
    g.lineTo(px, py + dy * c);
    g.stroke();
  }
  g.restore();
  label(g, 'TARGET: FACE', x + w * 0.5, y - Math.max(14, W * 0.022), Math.max(12, W * 0.020), '#ff9dc4', 'center');
}

// ------------------------------------------------------------------ frame

function cues(ctx, t) {
  while (S.fallBeep < 8 && t >= FALL_START + S.fallBeep * 0.2) {
    const k = S.fallBeep++;
    ctx.sound.beep(1500 - k * 158, 95);
  }
  if (!S.hit && t >= IMPACT) {
    S.hit = true;
    ctx.sound.noise(430);
    ctx.sound.beep(54, 340);
    ctx.sound.beep(92, 260);
  }
  const plinks = [[2.80, 523], [3.12, 659], [3.44, 784], [3.76, 622], [4.14, 466]];
  while (S.plink < plinks.length && t >= plinks[S.plink][0]) {
    ctx.sound.beep(plinks[S.plink][1], 150);
    S.plink++;
  }
  const tail = [[6.05, 392], [6.30, 494], [6.6, 587], [7.35, 330]];
  while (S.plink2 < tail.length && t >= tail[S.plink2][0]) {
    ctx.sound.beep(tail[S.plink2][1], 190);
    S.plink2++;
  }
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalAlpha = 1;
  g.clearRect(0, 0, W, H);
  if (!S) init(ctx);

  cues(ctx, t);

  const r = aimRect(ctx);
  const fx = r.x + r.w * 0.5;
  const fy = r.y + r.h * 0.46;
  const ti = t - IMPACT;

  // build the piano transform
  const pw = Math.max(W * 0.30, Math.min(r.w * 1.3, W * 0.64));
  const ph = pw * 0.76;

  let cx = fx;
  let cy = fy;
  let rot = 0;
  let sxs = 1;
  let sys = 1;

  if (t < IMPACT) {
    const p = Math.max(0, Math.min(1, (t - FALL_START) / (IMPACT - FALL_START)));
    const e = p * p * (0.55 + 0.45 * p);
    cy = -ph * 1.05 + (fy + ph * 1.05) * e;
    rot = -0.24 * (1 - e) + 0.05 * e;
    cx = fx + (1 - e) * W * 0.03;
  } else {
    // impact squash, small bounce, then a slow defeated sink
    const sq = 0.26 * Math.exp(-ti * 6.5) * Math.cos(ti * 20);
    sxs = 1 + sq * 0.5;
    sys = 1 - sq;
    const bounce = -0.035 * H * Math.exp(-ti * 5.5) * Math.abs(Math.sin(ti * 13));
    const sink = Math.min(1, Math.max(0, (t - 4.9) / 1.6));
    const sinkE = sink * sink * (3 - 2 * sink);
    cy = fy + bounce + sinkE * H * 0.085;
    rot = sinkE * 0.055;
    cx = fx + Math.sin(ti * 7.5) * Math.exp(-ti * 3.4) * W * 0.008;
  }

  // fade out right at the end so the glass snaps back clean
  const fade = t > END - 0.38 ? Math.max(0, (END - t) / 0.38) : 1;
  g.save();
  g.globalAlpha = fade;

  // impact camera shake
  let shakeX = 0;
  let shakeY = 0;
  if (ti > 0 && ti < 0.75) {
    const amp = H * 0.018 * Math.exp(-ti * 7);
    shakeX = Math.sin(t * 71) * amp;
    shakeY = Math.cos(t * 59) * amp * 0.8;
  }
  g.translate(shakeX, shakeY);

  // motion streaks while falling
  if (t > FALL_START && t < IMPACT) {
    for (let i = 1; i <= 4; i++) {
      const yy = cy - ph * (0.9 + i * 0.5);
      g.fillStyle = 'rgba(255,255,255,' + (0.05 + 0.03 * i).toFixed(3) + ')';
      roundRect(g, cx - pw * 0.34, yy, pw * 0.68, ph * 0.09, pw * 0.02);
      g.fill();
    }
  }

  drawDust(g, fx, fy, ti, W);
  drawDebris(g, fx, fy, ti, W);

  // impact ring
  if (ti > 0 && ti < 0.7) {
    const k = ti / 0.7;
    g.save();
    g.globalAlpha *= 1 - k;
    g.strokeStyle = '#ffd98a';
    g.lineWidth = Math.max(2, W * 0.008 * (1 - k));
    g.beginPath();
    g.ellipse(fx, fy, pw * (0.35 + k * 0.8), pw * 0.10 * (0.5 + k * 1.6), 0, 0, TAU);
    g.stroke();
    g.restore();
  }

  drawPiano(g, cx, cy, pw, rot, sxs, sys, 1);

  // one key slides loose and plinks away for no reason
  if (ti > 1.0 && ti < 3.2) {
    const kt = ti - 1.0;
    const kx = cx - pw * 0.16 - kt * pw * 0.22;
    const ky = cy - pw * 0.03 + 0.5 * 620 * kt * kt;
    g.save();
    g.translate(kx, ky);
    g.rotate(-kt * 2.2);
    g.fillStyle = '#fbf7ec';
    g.fillRect(0, 0, pw * 0.032, pw * 0.026);
    g.restore();
  }

  drawNotes(g, fx, fy, t, W, H);
  g.restore();

  // ------------------------------------------------------------- captions
  const capW = r.w * 1.5;
  const capY = Math.min(H * 0.88, r.y + r.h + H * 0.075);

  if (t < FALL_START) {
    caption(g, 'wait. what is that noise.', fx, capY, Math.max(20, H * 0.038), capW, '#ffffff');
    drawReticle(g, r, t, W);
  } else if (t < IMPACT) {
    caption(g, 'SAVORYSAILOR. LOOK UP. LOOK UP.', fx, capY, Math.max(20, H * 0.042), capW, '#ff9dc4');
    drawReticle(g, r, t, W);
  } else if (t < 3.35) {
    const punch = 1 + 0.25 * Math.exp(-ti * 8);
    caption(g, 'PLONK.', fx, capY, Math.max(26, H * 0.062) * punch, capW, '#ffd98a');
  } else if (t < 4.9) {
    caption(g, 'that was an A minor. he lives in A minor now.', fx, capY, Math.max(18, H * 0.036), capW, '#ffffff');
  } else if (t < 6.4) {
    caption(g, 'SavorySailor has been promoted to percussion.', fx, capY, Math.max(18, H * 0.036), capW, '#ffffff');
  } else if (t < 7.9) {
    caption(g, 'no notes. well. several notes.', fx, capY, Math.max(18, H * 0.036), capW, '#ff9dc4');
  } else {
    caption(g, 'tuned to perfection.', fx, capY, Math.max(18, H * 0.038), capW, '#ffd98a');
  }

  // top-layer badge, because the prompt insisted
  if (t > 0.35) {
    g.save();
    g.globalAlpha = 0.72;
    const bw = Math.min(W * 0.24, 330);
    const bh = Math.max(24, H * 0.036);
    g.fillStyle = 'rgba(8,11,22,0.55)';
    roundRect(g, W - bw - W * 0.02, H * 0.02, bw, bh, bh * 0.45);
    g.fill();
    label(g, 'ABSOLUTE TOP LAYER', W - bw * 0.5 - W * 0.02, H * 0.02 + bh * 0.53, bh * 0.44, '#cfd6e6', 'center');
    g.restore();
  }

  if (!S.doneFired && t >= END) {
    S.doneFired = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
