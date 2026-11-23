// Tomato Tribunal — an escalating produce assault on the live shot.
const TAU = Math.PI * 2;
let ST = null;

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - Math.pow(1 - clamp(p, 0, 1), 3);

function rr(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function streamerRect(ctx) {
  if (ctx.streamer) {
    const s = ctx.streamer;
    return {
      x: s.x * ctx.width,
      y: s.y * ctx.height,
      w: s.w * ctx.width,
      h: s.h * ctx.height,
    };
  }
  return {
    x: ctx.width * 0.3,
    y: ctx.height * 0.14,
    w: ctx.width * 0.4,
    h: ctx.height * 0.56,
  };
}

function text(c, str, x, y, size, color, line) {
  c.font = '900 ' + size + 'px Impact, "Arial Black", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, size * 0.1);
  c.strokeStyle = 'rgba(8,14,32,0.85)';
  c.strokeText(str, x, y);
  c.fillStyle = color;
  c.fillText(str, x, y);
  if (line) {
    c.lineWidth = Math.max(1.5, size * 0.03);
    c.strokeStyle = 'rgba(8,14,32,0.55)';
    c.strokeText(str, x, y);
  }
}

function makeSplat(x, y, r, t, alpha) {
  const R = ST.rand;
  const pts = [];
  const n = 18;
  for (let i = 0; i < n; i++) {
    pts.push(0.68 + R() * 0.55 + (i % 2 ? 0.06 : 0));
  }
  const seeds = [];
  const ns = Math.round(4 + R() * 6);
  for (let i = 0; i < ns; i++) {
    const a = R() * TAU;
    const d = 0.15 + R() * 0.55;
    seeds.push({
      x: Math.cos(a) * d,
      y: Math.sin(a) * d,
      a: R() * TAU,
    });
  }
  const drips = [];
  const nd = Math.round(1 + R() * 3);
  for (let i = 0; i < nd; i++) {
    drips.push({
      x: -0.6 + R() * 1.2,
      len: 0.2 + R() * 0.7,
    });
  }
  return { x, y, r, at: t, alpha, pts, seeds, drips };
}

function drawSplat(c, s, t) {
  const age = t - s.at;
  if (age < 0) return;
  const grow = easeOut(age / 0.16);
  const R = s.r * grow;
  if (R < 2) return;
  c.save();
  c.translate(s.x, s.y);
  c.globalAlpha = s.alpha;
  c.beginPath();
  const n = s.pts.length;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const rad = R * s.pts[i];
    const px = Math.cos(a) * rad;
    const py = Math.sin(a) * rad * 0.92;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
  const g = c.createRadialGradient(-R * 0.2, -R * 0.25, R * 0.08, 0, 0, R);
  g.addColorStop(0, '#ef4c34');
  g.addColorStop(0.65, '#c62b1e');
  g.addColorStop(1, '#8b1912');
  c.fillStyle = g;
  c.fill();
  c.lineWidth = Math.max(2, R * 0.05);
  c.strokeStyle = 'rgba(96,14,10,0.5)';
  c.stroke();
  c.fillStyle = 'rgba(255,232,190,0.92)';
  for (const sd of s.seeds) {
    c.beginPath();
    c.ellipse(sd.x * R, sd.y * R, R * 0.048, R * 0.08, sd.a, 0, TAU);
    c.fill();
  }
  c.fillStyle = '#b3251b';
  for (const d of s.drips) {
    const prog = clamp(age / 2.6, 0, 1);
    const dy = R * (0.5 + d.len * prog);
    c.globalAlpha = s.alpha * 0.95;
    c.beginPath();
    c.ellipse(d.x * R, dy, R * 0.075, R * 0.13 + d.len * R * prog * 0.6, 0, 0, TAU);
    c.fill();
    c.beginPath();
    c.arc(d.x * R, dy + R * 0.16, R * 0.075, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawTomato(c, x, y, r, rot, alpha) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = alpha;
  const g = c.createRadialGradient(-r * 0.32, -r * 0.36, r * 0.1, 0, 0, r * 1.06);
  g.addColorStop(0, '#ff7a5c');
  g.addColorStop(0.5, '#e33c2a');
  g.addColorStop(1, '#8a1a13');
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.fillStyle = g;
  c.fill();
  c.lineWidth = Math.max(1.5, r * 0.06);
  c.strokeStyle = 'rgba(80,12,8,0.5)';
  c.stroke();
  c.beginPath();
  c.ellipse(-r * 0.33, -r * 0.38, r * 0.22, r * 0.12, -0.62, 0, TAU);
  c.fillStyle = 'rgba(255,255,255,0.38)';
  c.fill();
  // stem star
  c.fillStyle = '#3f9340';
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2;
    c.beginPath();
    c.moveTo(0, -r * 0.08);
    c.lineTo(Math.cos(a - 0.24) * r * 0.42, Math.sin(a - 0.24) * r * 0.42);
    c.lineTo(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62);
    c.lineTo(Math.cos(a + 0.24) * r * 0.42, Math.sin(a + 0.24) * r * 0.42);
    c.closePath();
    c.fill();
  }
  c.beginPath();
  c.arc(0, 0, r * 0.13, 0, TAU);
  c.fillStyle = '#2f7531';
  c.fill();
  c.restore();
}

function drawReticle(c, r, alpha) {
  const len = Math.min(r.w, r.h) * 0.16;
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = '#ff4fa3';
  c.lineWidth = 5;
  c.lineCap = 'square';
  const corners = [
    [r.x, r.y, 1, 1],
    [r.x + r.w, r.y, -1, 1],
    [r.x, r.y + r.h, 1, -1],
    [r.x + r.w, r.y + r.h, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    c.beginPath();
    c.moveTo(x, y + sy * len);
    c.lineTo(x, y);
    c.lineTo(x + sx * len, y);
    c.stroke();
  }
  c.restore();
}

export const meta = {
  title: 'Tomato Tribunal',
  author: 'savorysailor',
  prompt: 'when somebody says boo in chat, throw tomatoes at the streamer throw more tomatoes when soemboyd says tomato',
  createdAt: '2026-11-22T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["boo"] },
    { "type": "chat", "mode": "word", "patterns": ["tomato"] }
  ],
};

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const R = ctx.rand;
  const fr = streamerRect(ctx);
  ST = {
    rand: R,
    splats: [],
    throws: [],
    shake: 0,
    ended: false,
    booed: false,
    W,
    H,
    fr,
  };
  const aim = () => ({
    x: fr.x + (0.18 + R() * 0.64) * fr.w,
    y: fr.y + (0.16 + R() * 0.6) * fr.h,
  });
  const add = (t0, dur, x0, y0, x1, y1, r, arc, spin) => {
    ST.throws.push({
      t0, dur, x0, y0, x1, y1, r, arc, spin,
      seed: R() * TAU,
      whoosh: false,
      hit: false,
    });
  };

  let a = aim();
  add(0.55, 0.8, -0.12 * W, 0.96 * H, a.x, a.y, 32, 0.16 * H, 9);
  a = aim();
  add(2.3, 1.05, 1.12 * W, 1.0 * H, a.x, a.y, 44, 0.22 * H, -8);

  for (let i = 0; i < 11; i++) {
    a = aim();
    const side = i % 2 ? 1.1 : -0.1;
    add(
      3.45 + i * 0.235,
      0.5 + R() * 0.22,
      side * W,
      (0.62 + R() * 0.5) * H,
      a.x,
      a.y,
      22 + R() * 15,
      (0.1 + R() * 0.14) * H,
      6 + R() * 12
    );
  }

  a = aim();
  add(6.6, 0.85, (fr.x + fr.w * 0.5), -0.3 * H, a.x, a.y, Math.max(90, Math.min(fr.w * 0.46, 130)), 0, 3);

  for (let i = 0; i < 16; i++) {
    a = aim();
    add(
      9.0 + i * 0.095,
      0.52,
      (0.06 + R() * 0.88) * W,
      -0.18 * H,
      a.x,
      a.y,
      13 + R() * 10,
      0,
      8 + R() * 14
    );
  }
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!ST) return;

  // sound + impact pass
  for (const th of ST.throws) {
    if (!th.whoosh && t >= th.t0) {
      th.whoosh = true;
      ctx.sound.noise(th.r > 60 ? 280 : 85);
    }
    if (!th.hit && t >= th.t0 + th.dur) {
      th.hit = true;
      const big = th.r > 60;
      ST.splats.push(
        makeSplat(th.x1, th.y1, th.r * (big ? 1.55 : 1.3), t, big ? 0.72 : 0.84)
      );
      if (ST.splats.length > 46) ST.splats.shift();
      ctx.sound.beep(big ? 62 : 95 + (th.r % 30), big ? 320 : 110);
      if (big) ctx.sound.noise(220);
      ST.shake = Math.max(ST.shake, big ? 20 : th.r * 0.14);
    }
  }
  if (!ST.booed && t >= 0.03) {
    ST.booed = true;
    ctx.sound.beep(88, 260);
  }
  ST.shake = Math.max(0, ST.shake - dt * 44);

  const sx = ST.shake > 0.1 ? Math.sin(t * 121) * ST.shake : 0;
  const sy = ST.shake > 0.1 ? Math.cos(t * 97) * ST.shake * 0.7 : 0;

  c.save();
  c.translate(sx, sy);

  // splats first — they sit on the lens
  for (const s of ST.splats) drawSplat(c, s, t);

  // reticle over the live shot
  if (t > 2.4 && t < 3.7) {
    const p = Math.min(1, (t - 2.4) / 0.2, (3.7 - t) / 0.2);
    drawReticle(c, ST.fr, Math.max(0, p));
    if (t > 2.7 && t < 3.5) {
      c.save();
      c.globalAlpha = Math.max(0, Math.min(1, (t - 2.7) / 0.15, (3.5 - t) / 0.15));
      c.font = '700 15px "Courier New", monospace';
      c.textAlign = 'center';
      c.fillStyle = '#ff8cc4';
      c.fillText('TARGET ACQUIRED', ST.fr.x + ST.fr.w / 2, ST.fr.y - 12);
      c.restore();
    }
  }

  // tomatoes in flight
  for (const th of ST.throws) {
    if (t < th.t0 || t > th.t0 + th.dur) continue;
    const p = (t - th.t0) / th.dur;
    const x = lerp(th.x0, th.x1, p);
    const y = lerp(th.y0, th.y1, p) - Math.sin(Math.PI * p) * th.arc;
    const rot = th.seed + p * th.spin;
    for (let k = 3; k >= 1; k--) {
      const pp = clamp(p - k * 0.045, 0, 1);
      const tx = lerp(th.x0, th.x1, pp);
      const ty = lerp(th.y0, th.y1, pp) - Math.sin(Math.PI * pp) * th.arc;
      drawTomato(c, tx, ty, th.r * (1 - k * 0.05), rot - k * 0.2, 0.12);
    }
    drawTomato(c, x, y, th.r, rot, 1);
  }

  // captions
  const cap = (t0, t1, str, sub, cy, size, color) => {
    if (t < t0 || t > t1) return;
    const k = easeOut((t - t0) / 0.24) * Math.min(1, (t1 - t) / 0.22);
    if (k <= 0.01) return;
    const scale = 1.22 - 0.22 * easeOut((t - t0) / 0.24);
    c.save();
    c.globalAlpha = Math.min(1, k);
    c.translate(W * 0.5, cy);
    c.scale(scale, scale);
    text(c, str, 0, 0, size, color, true);
    if (sub) text(c, sub, 0, size * 0.62, size * 0.27, '#ffe3ef', false);
    c.restore();
  };

  cap(0, 2.3, 'BOO.', 'the chat has registered a complaint', H * 0.25, W * 0.155, '#ffffff');
  cap(2.2, 4.1, 'ONE TOMATO', 'a proportionate, farm-to-table response', H * 0.2, W * 0.085, '#ffb3d6');
  cap(4.05, 6.55, 'THE MOTION CARRIES', 'escalation approved by popular demand', H * 0.17, W * 0.072, '#ffffff');
  cap(8.95, 11.4, 'IT IS RAINING PRODUCE', 'somewhere a farmer is weeping', H * 0.16, W * 0.068, '#ffd9e8');

  // typed-in TOMATO box
  if (t > 6.5 && t < 9.0) {
    const bw = W * 0.5;
    const bh = H * 0.145;
    const bx = W * 0.5 - bw / 2;
    const by = H * 0.235;
    const alpha = easeOut((t - 6.5) / 0.2) * Math.min(1, (9.0 - t) / 0.25);
    const reveal = clamp(Math.floor((t - 6.5) / 0.115), 0, 6);
    c.save();
    c.globalAlpha = alpha;
    rr(c, bx, by, bw, bh, bh * 0.22);
    c.fillStyle = 'rgba(12,18,40,0.74)';
    c.fill();
    c.lineWidth = 4;
    c.strokeStyle = '#ff4fa3';
    c.stroke();
    c.font = '900 ' + Math.round(bh * 0.6) + 'px "Courier New", monospace';
    c.textAlign = 'left';
    c.textBaseline = 'middle';
    const word = 'TOMATO'.slice(0, reveal);
    const fullW = c.measureText('TOMATO').width;
    const startX = W * 0.5 - fullW / 2;
    c.fillStyle = '#ff7fb8';
    c.fillText(word, startX, by + bh * 0.54);
    if (Math.floor(t * 2) % 2 === 0) {
      const cw = c.measureText(word).width;
      c.fillStyle = '#ffffff';
      c.fillRect(startX + cw + 6, by + bh * 0.25, bh * 0.3, bh * 0.5);
    }
    c.restore();
  }

  // verdict card
  if (t > 11.5) {
    const a = easeOut((t - 11.5) / 0.45);
    const cw = W * 0.62;
    const ch = H * 0.36;
    const cx = W * 0.5;
    const cy = H * 0.5;
    c.save();
    c.globalAlpha = a;
    c.translate(0, (1 - a) * 24);
    rr(c, cx - cw / 2, cy - ch / 2, cw, ch, 20);
    c.fillStyle = 'rgba(12,17,38,0.8)';
    c.fill();
    c.lineWidth = 5;
    c.strokeStyle = '#ff4fa3';
    c.stroke();
    text(c, 'FINAL VERDICT', cx, cy - ch * 0.33, ch * 0.09, '#ffb3d6');
    text(c, 'SAVORYSAILOR', cx, cy - ch * 0.155, ch * 0.135, '#ffffff');
    text(c, 'v. THE CHAT', cx, cy + ch * 0.0, ch * 0.085, '#c9d4f5');
    c.save();
    c.translate(cx, cy + ch * 0.19);
    c.rotate(-0.06);
    text(c, 'TOMATOED', 0, 0, ch * 0.19, '#ff4fa3', true);
    c.restore();
    const counted = Math.min(ST.splats.length, Math.floor((t - 11.5) * 26));
    text(c, 'TOMATOES LANDED: ' + counted, cx, cy + ch * 0.36, ch * 0.075, '#ffd9e8');
    c.restore();
  }

  c.restore();

  if (!ST.ended && t > 15.4) {
    ST.ended = true;
    ctx.done();
  }
}

export function dispose() {
  ST = null;
}
