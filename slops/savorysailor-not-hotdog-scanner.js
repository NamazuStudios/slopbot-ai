export const meta = {
  title: 'Not Hotdog Scanner',
  author: 'savorysailor',
  prompt: 'not hotdog silicon valley',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

/* ============================================================
   NOT HOTDOG — a scanning app that has never met a hotdog.
   Transparent glass HUD over the live stream. No streamer sprite:
   the reticle aims at ctx.streamer and the app judges the human.
   ============================================================ */

let S = null;

const CUES = [
  { t: 0.10, f: 520, ms: 80 },
  { t: 0.32, f: 700, ms: 70 },
  { t: 1.10, f: 880, ms: 55 },
  { t: 1.65, f: 980, ms: 55 },
  { t: 2.20, f: 1180, ms: 55 },
  { t: 3.05, f: 0, ms: 140 },
  { t: 3.20, f: 210, ms: 210 },
  { t: 5.80, f: 420, ms: 55 },
  { t: 6.10, f: 300, ms: 55 },
  { t: 6.40, f: 440, ms: 55 },
  { t: 6.70, f: 280, ms: 55 },
  { t: 7.00, f: 460, ms: 55 },
  { t: 7.30, f: 240, ms: 55 },
  { t: 7.60, f: 300, ms: 55 },
  { t: 7.90, f: 200, ms: 90 },
  { t: 8.70, f: 1320, ms: 60 },
  { t: 9.00, f: 990, ms: 60 },
  { t: 9.40, f: 1480, ms: 50 },
  { t: 10.00, f: 1240, ms: 50 },
  { t: 10.60, f: 1600, ms: 50 },
  { t: 11.45, f: 523, ms: 150 },
  { t: 11.62, f: 659, ms: 150 },
  { t: 11.79, f: 784, ms: 200 },
  { t: 12.10, f: 1046, ms: 160 },
  { t: 12.40, f: 1318, ms: 200 },
  { t: 14.15, f: 0, ms: 220 },
  { t: 14.25, f: 330, ms: 140 },
  { t: 14.50, f: 247, ms: 180 },
  { t: 14.80, f: 165, ms: 300 },
  { t: 17.10, f: 130, ms: 320 },
];

const LOG_LINES = [
  ['DESK CHAIR', 'NOT HOTDOG'],
  ['MICROPHONE', 'NOT HOTDOG'],
  ['YOUR SOUL', 'NOT HOTDOG'],
  ['THE MOON', 'NOT HOTDOG'],
];

const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const clamp01 = (p) => (p < 0 ? 0 : p > 1 ? 1 : p);

function rr(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function target(ctx) {
  const W = ctx.width, H = ctx.height;
  if (ctx.streamer && ctx.streamer.w > 0.01 && ctx.streamer.h > 0.01) {
    return {
      x: ctx.streamer.x * W,
      y: ctx.streamer.y * H,
      w: ctx.streamer.w * W,
      h: ctx.streamer.h * H,
      known: true,
    };
  }
  return { x: W * 0.36, y: H * 0.14, w: W * 0.28, h: H * 0.4, known: false };
}

function layout(ctx) {
  const s = Math.max(0.62, Math.min(ctx.width / 1280, ctx.height / 720));
  const tgt = target(ctx);
  const cw = 350 * s;
  const ch = 306 * s;
  const centerX = tgt.x + tgt.w / 2;
  let cx = centerX > ctx.width / 2 ? ctx.width * 0.035 : ctx.width * 0.965 - cw;
  const cy = Math.min(ctx.height * 0.34, ctx.height - ch - 26 * s);
  return { s, tgt, cw, ch, cx, cy };
}

export function init(ctx) {
  S = {
    ci: 0,
    card: [],
    confetti: [],
    sparks: [],
  };
  for (let i = 0; i < 110; i++) {
    const a = -Math.PI * (0.15 + ctx.rand() * 0.7);
    const sp = 120 + ctx.rand() * 320;
    S.confetti.push({
      x: 0,
      y: 0,
      vx: Math.cos(a) * sp * (0.5 + ctx.rand()),
      vy: Math.sin(a) * sp * (0.6 + ctx.rand() * 1.2),
      r: 2 + ctx.rand() * 4,
      rot: ctx.rand() * 6.28,
      vr: (ctx.rand() - 0.5) * 12,
      hue: ctx.rand() < 0.5 ? 'rgba(255,209,102,0.95)' : 'rgba(255,89,140,0.95)',
      life: 1,
    });
  }
}

function cue(ctx, t) {
  while (S.ci < CUES.length && t >= CUES[S.ci].t) {
    const c = CUES[S.ci];
    if (c.f === 0) ctx.sound.noise(c.ms);
    else ctx.sound.beep(c.f, c.ms);
    S.ci++;
  }
}

function drawHotdogIcon(c, x, y, sc, angle) {
  c.save();
  c.translate(x, y);
  c.rotate(angle || 0);
  c.scale(sc, sc);
  // bun
  c.fillStyle = 'rgba(232,180,96,0.95)';
  rr(c, -13, -5, 26, 10, 5);
  c.fill();
  // sausage
  c.fillStyle = 'rgba(255,96,110,0.95)';
  rr(c, -15, -3.4, 30, 6.8, 3.4);
  c.fill();
  // mustard
  c.strokeStyle = 'rgba(255,214,80,0.95)';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-11, -0.2);
  c.quadraticCurveTo(-6, -2.6, -1, 0.1);
  c.quadraticCurveTo(4, 2.6, 9, -0.1);
  c.stroke();
  c.restore();
}

function drawReticle(ctx, tgt, t, appear, sweep, heat) {
  const c = ctx.canvas;
  const W = ctx.width;
  const s = Math.max(0.62, Math.min(W / 1280, ctx.height / 720));
  const pad = 10 * s;

  const version = Math.floor(t * 8);
  const jx = Math.sin(version * 2.7) * 1.4 * s * heat;
  const jy = Math.cos(version * 3.3) * 1.4 * s * heat;
  const x = tgt.x - pad + jx;
  const y = tgt.y - pad + jy;
  const w = tgt.w + pad * 2;
  const h = tgt.h + pad * 2;
  const arm = Math.min(w, h) * 0.14 + 10 * s;

  c.save();
  c.globalAlpha *= appear;

  // frame glow
  c.strokeStyle = 'rgba(120,255,190,0.22)';
  c.lineWidth = 5 * s;
  rr(c, x, y, w, h, 10 * s);
  c.stroke();

  c.strokeStyle = 'rgba(130,255,200,0.95)';
  c.lineWidth = 2.4 * s;
  const corners = [
    [x, y, 1, 1],
    [x + w, y, -1, 1],
    [x, y + h, 1, -1],
    [x + w, y + h, -1, -1],
  ];
  for (const [px, py, sx, sy] of corners) {
    c.beginPath();
    c.moveTo(px + sx * arm, py);
    c.lineTo(px, py);
    c.lineTo(px, py + sy * arm);
    c.stroke();
  }

  // sweeping scan band
  if (sweep > 0) {
    const sy = y + clamp01(sweep) * h;
    const g = c.createLinearGradient(0, sy - 26 * s, 0, sy + 26 * s);
    g.addColorStop(0, 'rgba(130,255,200,0)');
    g.addColorStop(0.5, 'rgba(130,255,200,0.30)');
    g.addColorStop(1, 'rgba(130,255,200,0)');
    c.fillStyle = g;
    c.fillRect(x + 2, sy - 26 * s, w - 4, 52 * s);
    c.strokeStyle = 'rgba(190,255,225,0.9)';
    c.lineWidth = 1.6 * s;
    c.beginPath();
    c.moveTo(x + 3, sy);
    c.lineTo(x + w - 3, sy);
    c.stroke();
  }

  // corner ticks
  c.fillStyle = 'rgba(130,255,200,0.8)';
  c.fillRect(tgt.x + tgt.w / 2 - 1, tgt.y - 4 * s, 2 * s, 8 * s);
  c.fillRect(tgt.x + tgt.w / 2 - 1, tgt.y + tgt.h - 4 * s, 2 * s, 8 * s);
  c.fillRect(tgt.x - 4 * s, tgt.y + tgt.h / 2 - 1, 8 * s, 2 * s);
  c.fillRect(tgt.x + tgt.w - 4 * s, tgt.y + tgt.h / 2 - 1, 8 * s, 2 * s);

  c.restore();
}

function verdictState(t) {
  // returns {main, sub, conf, color, mood}
  if (t < 3.6) return { main: 'SCANNING\u2026', conf: null, color: 'rgba(130,255,200,1)', mood: 'scan' };
  if (t < 5.6) return { main: 'NOT HOTDOG', conf: 99.1, color: 'rgba(130,255,200,1)', mood: 'no' };
  if (t < 8.6) return { main: 'NOT HOTDOG', conf: 99.4, color: 'rgba(130,255,200,1)', mood: 'log' };
  if (t < 11.6) return { main: 'ANALYZING\u2026', conf: 62 + (t - 8.6) * 9, color: 'rgba(150,220,255,1)', mood: 'deep' };
  if (t < 14.6) return { main: 'HOTDOG?', conf: 51.2, color: 'rgba(255,209,102,1)', mood: 'yes' };
  if (t < 17.4) return { main: 'NOT HOTDOG', conf: 100.0, color: 'rgba(255,110,140,1)', mood: 'sorry' };
  return { main: 'NOT HOTDOG', conf: 100.0, color: 'rgba(255,110,140,1)', mood: 'bye' };
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);
  if (!S) init(ctx);
  cue(ctx, t);

  const { s, tgt, cw, ch, cx, cy } = layout(ctx);
  const v = verdictState(t);
  const st = { s, cw, ch, cx, cy, v };

  // ---------- reticle over the live shot ----------
  if (t > 0.55) {
    const appear = clamp01((t - 0.55) / 0.4);
    let sweep = -1;
    if (t >= 0.9 && t < 3.5) sweep = ((t - 0.9) / 2.6) % 1;
    if (t >= 8.8 && t < 11.4) sweep = ((t - 8.8) / 2.6) % 1;
    if (t >= 14.7 && t < 15.4) sweep = (t - 14.7) / 0.7;
    const heat = v.mood === 'deep' ? 1 : v.mood === 'sorry' ? 1.6 : 0.5;
    drawReticle(ctx, tgt, t, appear * (t < 17.4 ? 1 : 1 - clamp01((t - 17.4) / 0.8)), sweep, heat);
  }

  // ---------- celebration rays behind the card ----------
  if (t > 11.5 && t < 14.7) {
    const a = clamp01((t - 11.5) / 0.5) * (1 - clamp01((t - 14.2) / 0.5));
    const mx = tgt.x + tgt.w / 2;
    const my = tgt.y + tgt.h / 2;
    c.save();
    c.globalAlpha = 0.16 * a;
    c.translate(mx, my);
    c.rotate(t * 0.35);
    for (let i = 0; i < 20; i++) {
      const ang = (i / 20) * Math.PI * 2;
      const long = Math.max(ctx.width, ctx.height) * 0.85;
      c.fillStyle = i % 2 ? 'rgba(255,209,102,1)' : 'rgba(255,89,140,1)';
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(Math.cos(ang - 0.05) * long, Math.sin(ang - 0.05) * long);
      c.lineTo(Math.cos(ang + 0.05) * long, Math.sin(ang + 0.05) * long);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  // ---------- confetti ----------
  if (t > 11.6 && t < 15.0) {
    const mt = t - 11.6;
    c.save();
    for (const p of S.confetti) {
      const px = cx + cw / 2 + p.vx * mt;
      const py = cy + 90 * s + p.vy * mt + 320 * mt * mt * 0.5;
      const alive = py < ctx.height + 40 && mt < 3.2;
      if (!alive) continue;
      c.save();
      c.translate(px, py);
      c.rotate(p.rot + p.vr * mt);
      c.fillStyle = p.hue;
      c.globalAlpha = 0.95;
      c.fillRect(-p.r, -p.r * 0.5, p.r * 2, p.r);
      c.restore();
    }
    c.restore();
  }

  // ---------- the app card ----------
  const inP = clamp01(t / 0.75);
  const outP = clamp01((t - 17.5) / 1.1);
  let alpha = easeOut(inP) * (1 - outP);
  let oy = (1 - easeOut(inP)) * 90 * s + outP * outP * 150 * s;
  const shake = v.mood === 'sorry' ? Math.sin(t * 44) * 3.2 * s * (1 - clamp01((t - 14.6) / 1.2)) : 0;

  if (alpha > 0.01) {
    c.save();
    c.globalAlpha = alpha;
    c.translate(cx + shake, cy + oy);

    // panel
    const g = c.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, 'rgba(16,21,36,0.90)');
    g.addColorStop(1, 'rgba(8,11,20,0.84)');
    c.fillStyle = g;
    rr(c, 0, 0, cw, ch, 16 * s);
    c.fill();
    c.strokeStyle = v.mood === 'yes' ? 'rgba(255,209,102,0.75)' : 'rgba(160,190,255,0.28)';
    c.lineWidth = 1.5 * s;
    rr(c, 0.5, 0.5, cw - 1, ch - 1, 16 * s);
    c.stroke();
    c.fillStyle = 'rgba(255,89,140,0.9)';
    rr(c, 14 * s, 0, cw - 28 * s, 3 * s, 1.5 * s);
    c.fill();

    // header
    drawHotdogIcon(c, 30 * s, 27 * s, s * 0.95, -0.12);
    c.fillStyle = 'rgba(238,244,255,0.98)';
    c.font = `700 ${Math.round(19 * s)}px "Segoe UI", Arial, sans-serif`;
    c.textBaseline = 'middle';
    c.textAlign = 'left';
    c.fillText('NOT HOTDOG', 48 * s, 28 * s);
    c.fillStyle = 'rgba(170,190,225,0.75)';
    c.font = `600 ${Math.round(10 * s)}px "Consolas", monospace`;
    c.textAlign = 'right';
    c.fillText('v0.2 BETA', cw - 16 * s, 28 * s);

    // viewport
    const vx = 16 * s, vy = 46 * s, vw = cw - 32 * s, vh = 112 * s;
    c.fillStyle = 'rgba(0,0,0,0.42)';
    rr(c, vx, vy, vw, vh, 9 * s);
    c.fill();
    c.save();
    c.beginPath();
    rr(c, vx, vy, vw, vh, 9 * s);
    c.clip();

    c.strokeStyle = 'rgba(120,255,190,0.10)';
    c.lineWidth = 1;
    for (let gx = 0; gx < vw; gx += 18 * s) {
      c.beginPath();
      c.moveTo(vx + gx, vy);
      c.lineTo(vx + gx, vy + vh);
      c.stroke();
    }
    for (let gy = 0; gy < vh; gy += 18 * s) {
      c.beginPath();
      c.moveTo(vx, vy + gy);
      c.lineTo(vx + vw, vy + gy);
      c.stroke();
    }

    // subject wireframe: a blob that is definitely not a hotdog
    const mx = vx + vw / 2, my = vy + vh / 2 + 4 * s;
    c.strokeStyle = v.mood === 'yes' ? 'rgba(255,209,102,0.9)' : 'rgba(140,255,210,0.8)';
    c.lineWidth = 1.6 * s;
    const wob = Math.sin(t * 5) * 2 * s;
    c.beginPath();
    c.ellipse(mx, my - 12 * s, 26 * s + wob, 22 * s, 0, 0, Math.PI * 2);
    c.stroke();
    c.beginPath();
    if (v.mood === 'yes') {
      rr(c, mx - 40 * s, my - 8 * s, 80 * s, 16 * s, 8 * s);
      c.stroke();
    } else {
      c.moveTo(mx - 30 * s, my + 30 * s);
      c.lineTo(mx + 30 * s, my + 30 * s);
      c.stroke();
    }
    c.setLineDash([4 * s, 4 * s]);
    c.strokeStyle = 'rgba(255,255,255,0.18)';
    c.beginPath();
    c.moveTo(mx, vy + 6 * s);
    c.lineTo(mx, vy + vh - 6 * s);
    c.stroke();
    c.setLineDash([]);

    if (t < 3.6 || (t > 8.6 && t < 11.6)) {
      const sw = ((t * 0.9) % 1) * vh;
      c.fillStyle = 'rgba(130,255,200,0.18)';
      c.fillRect(vx, vy + sw - 8 * s, vw, 16 * s);
    }
    c.restore();

    c.strokeStyle = 'rgba(160,190,255,0.26)';
    c.lineWidth = 1 * s;
    rr(c, vx, vy, vw, vh, 9 * s);
    c.stroke();

    // live dot + label
    const blink = Math.sin(t * 6) > -0.2 ? 1 : 0.25;
    c.fillStyle = `rgba(255,89,140,${blink})`;
    c.beginPath();
    c.arc(vx + 12 * s, vy + 13 * s, 3.2 * s, 0, 7);
    c.fill();
    c.fillStyle = 'rgba(235,242,255,0.9)';
    c.font = `600 ${Math.round(9.5 * s)}px "Consolas", monospace`;
    c.textAlign = 'left';
    const feed = t < 11.6 ? (tgt.known ? 'CAM: LIVESTREAM' : 'CAM: STREAM') : 'CAM: LIVESTREAM';
    c.fillText(feed, vx + 20 * s, vy + 14 * s);

    // confidence bar
    const by = vy + vh + 14 * s;
    c.fillStyle = 'rgba(170,190,225,0.7)';
    c.font = `600 ${Math.round(9.5 * s)}px "Consolas", monospace`;
    c.textAlign = 'left';
    c.fillText('CONFIDENCE', 16 * s, by);
    c.textAlign = 'right';
    c.fillStyle = v.color;
    c.fillText(v.conf === null ? '\u2014\u2014' : v.conf.toFixed(1) + '%', cw - 16 * s, by);

    const bx = 16 * s, bw = cw - 32 * s, bhh = 7 * s;
    c.fillStyle = 'rgba(255,255,255,0.08)';
    rr(c, bx, by + 8 * s, bw, bhh, 3.5 * s);
    c.fill();
    if (v.conf !== null) {
      let prog = v.conf;
      if (v.mood === 'scan') prog = 0;
      if (v.mood === 'exc') prog = 0;
      const targetProg = Math.max(0.02, Math.min(1, prog / 100));
      const ramp = v.mood === 'scan' || v.mood === 'deep' ? clamp01((t % 3) / 2.6) : 1;
      const use = v.mood === 'scan' ? 0.15 + ramp * 0.5 : targetProg;
      c.fillStyle = v.color;
      rr(c, bx, by + 8 * s, bw * use, bhh, 3.5 * s);
      c.fill();
    }

    // verdict
    const vy2 = by + 34 * s;
    c.textAlign = 'center';
    c.fillStyle = v.color;
    c.font = `800 ${Math.round(30 * s)}px "Segoe UI", Arial, sans-serif`;
    const pop = v.mood === 'yes' ? 1 + Math.max(0, 0.14 - (t - 11.6)) * 1.3 : 1;
    c.save();
    c.translate(cw / 2, vy2);
    c.scale(pop, pop);
    c.fillText(v.main, 0, 0);
    c.restore();

    // subcaption
    const subs = {
      scan: 'DEEP LEARNING: 9,000,000 NEURONS',
      no: 'CONFIDENCE IS A FEELING',
      log: 'SCANNING EVERYTHING ELSE',
      deep: t < 9.6 ? 'TARGET: SAVORYSAILOR' : t < 10.4 ? 'MAPPING FACE\u2026 (RUDE)' : 'CROSS-REFERENCING 40,000 HOTDOGS',
      yes: 'THE ALGORITHM IS CONFIDENT',
      sorry: t < 15.4 ? 'PIPELINE ERROR: HOTDOG NOT FOUND' : 'APOLOGY AUTO-GENERATED',
      bye: 'THIS APP HAS NEVER SEEN ONE',
    };
    c.fillStyle = 'rgba(190,205,235,0.8)';
    c.font = `600 ${Math.round(10.5 * s)}px "Consolas", monospace`;
    c.fillText(subs[v.mood] || '', cw / 2, vy2 + 19 * s);

    // scan log stack
    if (t > 5.6 && t < 8.6) {
      c.textAlign = 'left';
      c.font = `600 ${Math.round(9.8 * s)}px "Consolas", monospace`;
      let ly = vy2 + 40 * s;
      for (let i = 0; i < LOG_LINES.length; i++) {
        const appearAt = 5.7 + i * 0.62;
        if (t < appearAt) break;
        const k = clamp01((t - appearAt) / 0.2);
        c.globalAlpha = alpha * k;
        c.fillStyle = 'rgba(160,180,215,0.85)';
        c.fillText(LOG_LINES[i][0], 22 * s, ly);
        c.fillStyle = 'rgba(130,255,200,0.95)';
        c.textAlign = 'right';
        c.fillText(LOG_LINES[i][1], cw - 22 * s, ly);
        c.textAlign = 'left';
        ly += 11 * s;
      }
      c.globalAlpha = alpha;
    }

    // footer / counter
    c.font = `700 ${Math.round(9.8 * s)}px "Consolas", monospace`;
    c.textAlign = 'left';
    if (t > 7.9 && t < 17.5) {
      const n = t > 11.6 && t < 14.6 ? 1 : 0;
      c.fillStyle = n ? 'rgba(255,209,102,0.9)' : 'rgba(255,110,140,0.9)';
      c.fillText(`HOTDOGS FOUND: ${n}`, 20 * s, ch - 16 * s);
    }
    c.textAlign = 'right';
    c.fillStyle = 'rgba(140,160,195,0.6)';
    c.fillText(tgt.known ? 'SUBJ: HUMAN' : 'SUBJ: UNKNOWN', cw - 20 * s, ch - 16 * s);

    c.restore();
  }

  // ---------- caption strip, below the shot ----------
  let cap = '';
  if (t > 0.9 && t < 3.6) cap = 'NOT HOTDOG IS ANALYZING SAVORYSAILOR.';
  else if (t > 3.6 && t < 5.6) cap = 'VERDICT: NOT HOTDOG. 99.1% SURE.';
  else if (t > 5.6 && t < 8.6) cap = 'IT CHECKED EVERYTHING ELSE TOO. STILL NOT HOTDOG.';
  else if (t > 8.6 && t < 11.6) cap = 'DEEP SCANNING SAVORYSAILOR. THIS IS SCIENCE.';
  else if (t > 11.6 && t < 14.6) cap = 'BREAKING: SAVORYSAILOR IS A HOTDOG.';
  else if (t > 14.6 && t < 17.5) cap = 'CORRECTION: SAVORYSAILOR IS A HUMAN. SORRY.';
  else if (t >= 17.5) cap = 'NOT HOTDOG. YOUR HOTDOG, EXPERTLY NOT IDENTIFIED.';

  if (cap) {
    c.save();
    const capY = ctx.height * 0.925;
    c.font = `700 ${Math.round(16 * s)}px "Segoe UI", Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tw = c.measureText(cap).width;
    const padx = 16 * s, bxw = tw + padx * 2;
    const ba = clamp01((t - 0.9) / 0.3) * (t > 17.5 ? 1 - clamp01((t - 18.2) / 0.5) : 1);
    c.globalAlpha = ba;
    c.fillStyle = 'rgba(8,11,20,0.78)';
    rr(c, ctx.width / 2 - bxw / 2, capY - 18 * s, bxw, 36 * s, 8 * s);
    c.fill();
    c.strokeStyle = 'rgba(255,89,140,0.55)';
    c.lineWidth = 1.2 * s;
    rr(c, ctx.width / 2 - bxw / 2, capY - 18 * s, bxw, 36 * s, 8 * s);
    c.stroke();
    c.fillStyle = 'rgba(240,246,255,0.97)';
    c.fillText(cap, ctx.width / 2, capY);
    c.restore();
  }

  if (t > 18.9) ctx.done();
}

export function dispose() {
  S = null;
}
