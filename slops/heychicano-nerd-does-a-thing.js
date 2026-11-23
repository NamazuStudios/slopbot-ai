export const meta = {
  title: 'Nerd Does A Thing',
  author: 'heychicano',
  prompt: 'nerd does a thing then leaves',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const T_DONE = 5.2;
const T_CERT = 6.0;
const T_LEAVE = 8.4;
const T_END = 10.5;

let S = null;

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const fade = (a, b, v) => clamp01((v - a) / (b - a));
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const easeBack = (u) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2);
};

function rr(c, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

function label(c, str, x, y, size, fill, opts) {
  const o = opts || {};
  c.save();
  c.font = '900 ' + size + 'px "Arial Black", "Trebuchet MS", system-ui, sans-serif';
  c.textAlign = o.align || 'center';
  c.textBaseline = o.baseline || 'middle';
  c.lineJoin = 'round';
  if (o.stroke !== false) {
    c.lineWidth = Math.max(2, size * 0.14);
    c.strokeStyle = o.stroke || 'rgba(4,7,22,0.9)';
    c.strokeText(str, x, y);
  }
  c.fillStyle = fill;
  c.fillText(str, x, y);
  c.restore();
}

function glint(c, x, y, r, rot, col, alpha) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = c.globalAlpha * alpha;
  c.strokeStyle = col;
  c.lineWidth = Math.max(2, r * 0.14);
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(0, -r);
  c.lineTo(0, r);
  c.stroke();
  c.beginPath();
  c.moveTo(-r, 0);
  c.lineTo(r, 0);
  c.stroke();
  c.restore();
}

export function init(ctx) {
  const rnd = ctx.rand;
  const glyphs = ['✓', '+', '!', '∑', '?', '7', '3'];
  const cols = ['#ffd54a', '#7ef7ff', '#ff5fa8', '#ffffff'];
  const conf = [];
  for (let i = 0; i < 64; i++) {
    conf.push({
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: rnd() * 6.2832,
      vr: (rnd() - 0.5) * 9,
      g: glyphs[Math.floor(rnd() * glyphs.length)],
      col: cols[Math.floor(rnd() * cols.length)],
      size: 0.012 + rnd() * 0.02,
      a: rnd() * 6.2832,
      ang: -1.9 + rnd() * 3.8,
      spd: 0.45 + rnd() * 0.75,
    });
  }
  S = {
    fired: {},
    ended: false,
    confSpawned: false,
    conf: conf,
    eq: ['E=mc²', 'πr²', '∑ⁿ', '>>', 'NaM', 'x²', '∫dx'],
    streamer: ctx.streamer
      ? { x: ctx.streamer.x, y: ctx.streamer.y, w: ctx.streamer.w, h: ctx.streamer.h }
      : { x: 0.3, y: 0.22, w: 0.4, h: 0.52 },
  };
  void growl;
}

function growl() {}

function drawNerd(c, R, pr, panelA, alpha) {
  const lensR = R * 0.8;
  const gap = R * 0.98;

  c.lineCap = 'round';
  c.strokeStyle = '#e9f6ff';
  c.lineWidth = R * 0.16;
  c.beginPath();
  c.moveTo(-gap - lensR * 0.9, -lensR * 0.3);
  c.lineTo(-gap - lensR * 1.6, -lensR * 0.85);
  c.stroke();
  c.beginPath();
  c.moveTo(gap + lensR * 0.9, -lensR * 0.3);
  c.lineTo(gap + lensR * 1.6, -lensR * 0.85);
  c.stroke();

  c.fillStyle = 'rgba(126,247,255,0.16)';
  c.strokeStyle = '#f7fcff';
  c.lineWidth = R * 0.22;
  c.beginPath();
  c.arc(-gap, 0, lensR, 0, 6.2832);
  c.fill();
  c.stroke();
  c.beginPath();
  c.arc(gap, 0, lensR, 0, 6.2832);
  c.fill();
  c.stroke();

  c.beginPath();
  c.moveTo(-gap + lensR, -lensR * 0.08);
  c.lineTo(gap - lensR, -lensR * 0.08);
  c.stroke();

  c.strokeStyle = '#ffd54a';
  c.lineWidth = R * 0.17;
  c.beginPath();
  c.moveTo(-gap - lensR * 0.8, -lensR * 1.3);
  c.lineTo(-gap + lensR * 0.15, -lensR * 0.98);
  c.stroke();
  c.beginPath();
  c.moveTo(gap + lensR * 0.8, -lensR * 1.3);
  c.lineTo(gap - lensR * 0.15, -lensR * 0.98);
  c.stroke();

  const by = R * 1.45;
  c.fillStyle = '#ff5fa8';
  c.beginPath();
  c.moveTo(0, by);
  c.lineTo(-R * 0.95, by - R * 0.52);
  c.lineTo(-R * 0.95, by + R * 0.52);
  c.closePath();
  c.fill();
  c.beginPath();
  c.moveTo(0, by);
  c.lineTo(R * 0.95, by - R * 0.52);
  c.lineTo(R * 0.95, by + R * 0.52);
  c.closePath();
  c.fill();
  c.fillStyle = '#ffd54a';
  c.beginPath();
  c.arc(0, by, R * 0.19, 0, 6.2832);
  c.fill();

  const ty = R * 2.0;
  rr(c, -R * 1.55, ty, R * 3.1, R * 1.06, R * 0.2);
  c.fillStyle = 'rgba(247,252,255,0.95)';
  c.fill();
  c.strokeStyle = '#ff5fa8';
  c.lineWidth = R * 0.09;
  c.stroke();
  label(c, 'NERD', 0, ty + R * 0.55, R * 0.6, '#111a3d', { stroke: false });

  if (panelA > 0.01) {
    c.save();
    c.globalAlpha = alpha * panelA;
    const pw = R * 6.1;
    const ph = R * 1.5;
    const px = -pw * 0.5;
    const py = R * 3.35;
    rr(c, px, py, pw, ph, R * 0.22);
    c.fillStyle = 'rgba(6,10,30,0.62)';
    c.fill();
    c.strokeStyle = '#7ef7ff';
    c.lineWidth = R * 0.08;
    c.stroke();

    label(c, 'THING', px + R * 0.32, py + ph * 0.34, R * 0.56, '#f7fcff', {
      align: 'left',
      stroke: 'rgba(4,7,22,0.8)',
    });
    label(c, Math.round(pr * 100) + '%', px + pw - R * 0.32, py + ph * 0.34, R * 0.56, '#ffd54a', {
      align: 'right',
      stroke: 'rgba(4,7,22,0.8)',
    });

    const bx = px + R * 0.32;
    const bw = pw - R * 0.64;
    const bh = ph * 0.24;
    const byy = py + ph * 0.64;
    rr(c, bx, byy, bw, bh, bh * 0.45);
    c.fillStyle = 'rgba(255,255,255,0.16)';
    c.fill();
    if (pr > 0.004) {
      rr(c, bx, byy, Math.max(bh, bw * pr), bh, bh * 0.45);
      c.fillStyle = pr >= 0.999 ? '#7ef7ff' : '#ff5fa8';
      c.fill();
    }
    c.restore();
  }
}

function drawConfetti(c, dt, t, W, H, min, alpha) {
  if (!S.confSpawned) return;
  for (const p of S.conf) {
    p.vy += 1.25 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rot += p.vr * dt;
    if (p.y > 1.15) continue;
    c.save();
    c.globalAlpha = alpha;
    c.translate(p.x * W, p.y * H);
    c.rotate(p.rot);
    c.font = '900 ' + Math.round(p.size * min) + 'px "Arial Black", "Trebuchet MS", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = p.col;
    c.fillText(p.g, 0, 0);
    c.restore();
  }
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const min = Math.min(W, H);
  const step = Math.min(dt || 0.016, 0.05);

  c.clearRect(0, 0, W, H);

  const st = S.streamer;
  const scx = st.x + st.w * 0.5;
  const scen = st.y + st.h * 0.5;
  const nerdSideLeft = scx >= 0.5;
  const targetX = (nerdSideLeft ? 0.82 : 0.18) * W;
  const nerdY = Math.max(0.3, Math.min(0.52, scen)) * H;

  const pIn = easeOut(clamp01(t / 1.05));
  const pOutRaw = clamp01((t - T_LEAVE) / (T_END - T_LEAVE));
  const pOut = easeOut(pOutRaw);

  const startX = nerdSideLeft ? -0.42 * W : 1.42 * W;
  const endX = nerdSideLeft ? -0.5 * W : 1.5 * W;
  const nx = startX + (targetX - startX) * pIn + (endX - targetX) * pOut;

  const groupAlpha = clamp01(t / 0.4) * (1 - clamp01((pOutRaw - 0.3) / 0.6));

  const pr = clamp01((t - 2.25) / (T_DONE - 2.25));
  const panelA = clamp01((t - 1.95) / 0.5);
  const computeA = clamp01((t - 2.2) / 0.4) * (1 - clamp01((t - T_DONE) / 0.35));

  const stampY = Math.max(0.13 * H, st.y * H * 0.55);
  const stampU = clamp01((t - T_DONE) / 0.34);

  const R = min * 0.05;

  const adj = -min * 0.028 * Math.sin(clamp01((t - 0.95) / 0.55) * Math.PI);
  const bob = Math.sin(t * 3.1) * min * 0.008;

  if (groupAlpha > 0.01) {
    c.save();
    c.globalAlpha = groupAlpha;
    c.translate(nx, nerdY + bob + adj);
    c.rotate(Math.sin(t * 1.6) * 0.035);
    drawNerd(c, R, pr, panelA, groupAlpha);
    c.restore();

    glint(
      c,
      nx - R * 0.9,
      nerdY + bob + adj - R * 0.6,
      min * 0.028,
      t * 0.6,
      '#ffffff',
      groupAlpha * (0.35 + 0.65 * Math.exp(-Math.pow((t - 1.3) / 0.35, 2)))
    );
  }

  for (let i = 0; i < S.eq.length; i++) {
    if (computeA <= 0.01) break;
    const ang = (i / S.eq.length) * Math.PI * 2 + t * 0.55;
    const rad = min * (0.12 + 0.035 * Math.sin(t * 1.7 + i * 1.3));
    const ex = nx + Math.cos(ang) * rad * 1.35;
    const ey = nerdY + Math.sin(ang) * rad * 0.95;
    label(c, S.eq[i], ex, ey, min * 0.023, 'rgba(126,247,255,0.9)', {
      stroke: 'rgba(4,7,22,0.55)',
    });
    void computeA;
  }

  if (t > T_DONE && t < T_LEAVE + 1.1) {
    if (!S.confSpawned) {
      S.confSpawned = true;
      for (const p of S.conf) {
        p.x = 0.5 + (p.a - 3.14) * 0.004;
        p.y = stampY / H;
        p.vx = Math.cos(p.ang) * p.spd * 0.8;
        p.vy = Math.sin(p.ang) * p.spd;
      }
    }
    drawConfetti(c, step, t, W, H, min, 1 - clamp01((t - T_LEAVE) / 1.1));
  }

  if (stampU > 0) {
    const sc = easeBack(stampU);
    const a = clamp01(stampU * 3);
    const size = min * 0.082;
    const bw = Math.min(W * 0.62, size * 8.6);
    const bh = size * 2.0;
    c.save();
    c.globalAlpha = a * (1 - clamp01((pOutRaw - 0.2) / 0.6));
    c.translate(W * 0.5, stampY);
    c.rotate(-0.045);
    c.scale(sc, sc);

    rr(c, -bw * 0.5, -bh * 0.5, bw, bh, size * 0.18);
    c.fillStyle = 'rgba(8,12,32,0.55)';
    c.fill();
    c.strokeStyle = '#ffd54a';
    c.lineWidth = size * 0.1;
    c.stroke();
    rr(c, -bw * 0.5 + size * 0.16, -bh * 0.5 + size * 0.16, bw - size * 0.32, bh - size * 0.32, size * 0.1);
    c.lineWidth = size * 0.04;
    c.strokeStyle = 'rgba(255,247,215,0.85)';
    c.stroke();

    label(c, 'THING: DONE', 0, size * 0.02, size, '#ffd54a', { stroke: 'rgba(4,7,22,0.95)' });
    label(c, 'no further things required', 0, size * 0.78, size * 0.22, '#f7fcff', {
      stroke: 'rgba(4,7,22,0.8)',
    });
    c.restore();
  }

  if (t > T_CERT) {
    const u = easeOut(clamp01((t - T_CERT) / 0.65));
    const bandH = H * 0.16;
    const bandY = H - bandH * u;
    c.save();
    c.globalAlpha = u * (1 - clamp01((pOutRaw - 0.1) / 0.5));
    c.fillStyle = 'rgba(6,10,30,0.72)';
    c.fillRect(0, bandY, W, bandH);
    c.strokeStyle = '#ff5fa8';
    c.lineWidth = Math.max(2, H * 0.005);
    c.beginPath();
    c.moveTo(0, bandY);
    c.lineTo(W, bandY);
    c.stroke();
    label(c, 'CERTIFIED THING: COMPLETE', W * 0.5, bandY + bandH * 0.36, H * 0.048, '#ffd54a', {
      stroke: 'rgba(4,7,22,0.9)',
    });
    label(c, 'WITNESSED LIVE BY SAVORYSAILOR', W * 0.5, bandY + bandH * 0.68, H * 0.03, '#f7fcff', {
      stroke: 'rgba(4,7,22,0.9)',
    });
    c.restore();
  }

  const entryA = fade(0.35, 0.8, t) * (1 - fade(1.7, 2.3, t));
  if (entryA > 0.01) {
    label(c, 'A NERD APPROACHES', W * 0.5, H * 0.13, H * 0.05, '#7ef7ff', {
      stroke: 'rgba(4,7,22,0.9)',
    });
    c.save();
    c.globalAlpha = entryA;
    c.restore();
  }

  if (t > T_LEAVE - 0.1) {
    const exA = fade(T_LEAVE - 0.1, T_LEAVE + 0.45, t);
    if (exA > 0.01) {
      const exY = H * 0.13;
      label(c, 'THE NERD HAS LEFT', W * 0.5, exY, H * 0.055, '#ff5fa8', {
        stroke: 'rgba(4,7,22,0.95)',
      });
      label(c, '— — — — —', W * 0.5, exY + H * 0.06, H * 0.03, 'rgba(247,252,255,0.8)', {
        stroke: false,
      });
    }
  }

  for (let i = 0; i < 3; i++) {
    const speedA = Math.max(fade(0, 0.25, t) * (1 - fade(0.9, 1.3, t)), fade(T_LEAVE, T_LEAVE + 0.3, t));
    if (speedA <= 0.01) continue;
    c.save();
    c.globalAlpha = speedA * 0.55;
    c.strokeStyle = '#7ef7ff';
    c.lineWidth = Math.max(2, min * 0.006);
    c.lineCap = 'round';
    const dir = nerdSideLeft ? 1 : -1;
    const sx = nx - dir * (R * 5.5 + i * min * 0.02);
    const yy = nerdY - min * 0.02 + i * min * 0.025;
    c.beginPath();
    c.moveTo(sx, yy);
    c.lineTo(sx - dir * min * 0.11, yy);
    c.stroke();
    c.restore();
  }

  // Audio cues
  const hit = (key, when, fn) => {
    if (t >= when && !S.fired[key]) {
      S.fired[key] = true;
      fn();
    }
  };
  hit('in', 0.02, () => ctx.sound.noise(280));
  hit('adj', 1.05, () => ctx.sound.beep(720, 90));
  hit('adj2', 1.32, () => ctx.sound.beep(940, 70));
  for (let i = 0; i < 7; i++) {
    hit('tick' + i, 2.25 + i * 0.33, () => ctx.sound.beep(420 + i * 85, 55));
  }
  hit('done', T_DONE, () => {
    ctx.sound.noise(320);
    ctx.sound.beep(990, 140);
  });
  hit('fan1', 5.5, () => ctx.sound.beep(523, 110));
  hit('fan2', 5.68, () => ctx.sound.beep(659, 110));
  hit('fan3', 5.86, () => ctx.sound.beep(784, 120));
  hit('fan4', 6.06, () => ctx.sound.beep(1046, 280));
  hit('bye', T_LEAVE, () => ctx.sound.noise(300));
  hit('bye2', T_END - 0.55, () => ctx.sound.beep(392, 70));

  if (!S.ended && t >= T_END) {
    S.ended = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
