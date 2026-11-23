// Confetti Welcome Cannon — a glass-over-stream greeting for deedeemarie.
// The canvas stays transparent the entire time; the live shot is the stage.

const GUEST = 'deedeemarie';
const DURATION = 9.8;

export const meta = {
  title: 'Confetti Welcome Cannon',
  author: 'savorysailor',
  prompt: 'Welcome in deedeemarie enjoy the slop',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

let S = null;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
function easeOutBack(x) {
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function palette() {
  return ['#ff5fa2', '#ffd166', '#7ee8fa', '#ffffff', '#ff9ecb'];
}

function makeParticle(ctx, x, y, vx, vy, extra) {
  const pal = palette();
  return {
    x, y, vx, vy,
    rot: ctx.rand() * Math.PI * 2,
    vr: (ctx.rand() - 0.5) * 9,
    w: 5 + ctx.rand() * 7,
    h: 3 + ctx.rand() * 5,
    color: pal[(ctx.rand() * pal.length) | 0],
    life: 0,
    wob: ctx.rand() * Math.PI * 2,
    sway: 0.6 + ctx.rand() * 1.6,
    ...extra,
  };
}

function spawnBurst(ctx, n, x, y, dir, spread, speed) {
  for (let i = 0; i < n; i++) {
    const a = dir + (ctx.rand() - 0.5) * spread;
    const sp = speed * (0.55 + ctx.rand() * 0.85);
    S.parts.push(makeParticle(ctx, x, y, Math.cos(a) * sp, Math.sin(a) * sp));
  }
}

function spawnRain(ctx, n) {
  const H = ctx.height;
  for (let i = 0; i < n; i++) {
    S.parts.push(makeParticle(
      ctx,
      ctx.rand() * ctx.width,
      -16 - ctx.rand() * H * 0.2,
      (ctx.rand() - 0.5) * 40,
      80 + ctx.rand() * 130
    ));
  }
}

function once(key) {
  if (S.fired[key]) return false;
  S.fired[key] = true;
  return true;
}

function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

function star(c, x, y, r, alpha, color) {
  c.save();
  c.translate(x, y);
  c.globalAlpha *= alpha;
  c.fillStyle = color;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = -Math.PI / 2 + i * (Math.PI / 4);
    const rr = i % 2 === 0 ? r : r * 0.32;
    const px = Math.cos(ang) * rr;
    const py = Math.sin(ang) * rr;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fill();
  c.restore();
}

function fitFont(c, text, maxW, basePx) {
  let px = basePx;
  c.font = `900 ${px}px system-ui, Arial, sans-serif`;
  while (c.measureText(text).width > maxW && px > 12) {
    px *= 0.94;
    c.font = `900 ${px}px system-ui, Arial, sans-serif`;
  }
  return px;
}

function drawCrown(c, cx, cy, scale, tilt, alpha) {
  c.save();
  c.globalAlpha *= alpha;
  c.translate(cx, cy);
  c.rotate(tilt);
  c.scale(scale, scale);

  const g = c.createLinearGradient(-44, 0, 44, 0);
  g.addColorStop(0, '#ffcf4d');
  g.addColorStop(0.5, '#fff3b0');
  g.addColorStop(1, '#e8a51e');

  c.shadowColor = 'rgba(255, 210, 90, 0.75)';
  c.shadowBlur = 22;
  c.fillStyle = g;
  c.strokeStyle = 'rgba(72, 36, 0, 0.5)';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-44, 16);
  c.lineTo(-44, -8);
  c.lineTo(-23, 4);
  c.lineTo(0, -26);
  c.lineTo(23, 4);
  c.lineTo(44, -8);
  c.lineTo(44, 16);
  c.closePath();
  c.fill();
  c.stroke();
  c.shadowBlur = 0;

  const gems = ['#ff5fa2', '#7ee8fa', '#ffffff'];
  for (let i = 0; i < 3; i++) {
    c.fillStyle = gems[i];
    c.beginPath();
    c.arc(-23 + i * 23, 8, 4.6, 0, Math.PI * 2);
    c.fill();
  }

  c.fillStyle = 'rgba(255,255,255,0.85)';
  for (let i = 0; i < 3; i++) {
    const tx = -23 + i * 23;
    star(c, tx, -12 - (i === 1 ? 4 : 0), 3.4, 0.9, '#fffbe6');
  }

  c.restore();
}

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  S = {
    parts: [],
    fired: {},
    rainAcc: 0,
    sparkles: [],
  };
  for (let i = 0; i < 7; i++) {
    S.sparkles.push({
      ang: ctx.rand() * Math.PI * 2,
      rad: 0.045 * Math.min(W, H) + ctx.rand() * 0.05 * Math.min(W, H),
      ph: ctx.rand() * Math.PI * 2,
      sz: 4 + ctx.rand() * 6,
      spd: 0.7 + ctx.rand() * 1.4,
    });
  }
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const d = Math.min(dt || 0, 0.05);

  c.clearRect(0, 0, W, H);

  // --- sounds --------------------------------------------------------------
  if (t > 0.12 && once('s1')) ctx.sound.beep(660, 90);
  if (t > 0.5 && once('s2')) ctx.sound.beep(880, 110);
  if (t > 0.95 && once('s3')) ctx.sound.beep(1175, 140);
  if (t > 1.3 && once('n1')) { ctx.sound.noise(210); ctx.sound.beep(392, 130); }
  if (t > 1.5 && once('n2')) { ctx.sound.noise(230); ctx.sound.beep(523, 130); }
  if (t > 2.1 && once('s4')) ctx.sound.beep(1568, 100);
  if (t > 2.8 && once('s5')) ctx.sound.beep(1318, 150);
  if (t > 6.4 && once('p1')) { ctx.sound.noise(150); ctx.sound.beep(990, 160); }
  if (t > 7.2 && once('s6')) ctx.sound.beep(1760, 110);

  // --- where the real streamer sits ---------------------------------------
  const st = ctx.streamer;
  const sx = st ? st.x * W : W * 0.30;
  const sy = st ? st.y * H : H * 0.18;
  const sw = st ? st.w * W : W * 0.40;
  const sh = st ? st.h * H : H * 0.66;
  const headX = sx + sw / 2;
  const headY = sy;

  const fade = t < 8.5 ? 1 : clamp01(1 - (t - 8.5) / 1.2);
  c.globalAlpha = fade;

  // --- god rays behind the streamer ---------------------------------------
  if (t > 0.6 && t < 8.4) {
    const R = Math.hypot(W, H);
    const a0 = t * 0.5;
    const rayAlpha = 0.09 + 0.03 * Math.sin(t * 2.4);
    c.save();
    c.translate(headX, sy + sh * 0.3);
    c.rotate(a0);
    c.fillStyle = `rgba(255, 214, 110, ${rayAlpha})`;
    for (let i = 0; i < 12; i++) {
      c.rotate((Math.PI * 2) / 12);
      c.beginPath();
      c.moveTo(0, 0);
      c.lineTo(R * 0.11, -R);
      c.lineTo(-R * 0.11, -R);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  // --- spotlight sweep -----------------------------------------------------
  if (t < 2.4) {
    const p = clamp01(t / 2.4);
    const cx = headX;
    const cy = sy + sh * 0.26;
    const rad = 50 + p * Math.max(sw, 260);
    const g = c.createRadialGradient(cx, cy, 4, cx, cy, rad);
    g.addColorStop(0, `rgba(255,255,255,${0.20 * (1 - p)})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(cx, cy, rad, 0, Math.PI * 2);
    c.fill();
  }

  // --- banner geometry -----------------------------------------------------
  const bw = Math.min(W * 0.86, 860);
  const bh = Math.min(H * 0.30, 208);
  let bcy = H * 0.2;
  if (st) {
    const topLimit = sy - 12;
    if (topLimit < bcy + bh / 2) {
      bcy = Math.max(bh / 2 + 10, topLimit - bh / 2);
    }
  }
  const dropP = clamp01((t - 0.35) / 0.85);
  const dropOff = (1 - easeOutBack(dropP)) * (bcy + bh);
  const bannerCy = bcy - dropOff + (dropP > 0.98 ? Math.sin(t * 2.4) * 3 : 0);
  const bannerX = (W - bw) / 2;
  const bannerY = bannerCy - bh / 2;

  if (dropP > 0.01) {
    c.save();
    c.globalAlpha *= clamp01(dropP * 2);

    c.shadowColor = 'rgba(255, 95, 162, 0.6)';
    c.shadowBlur = 34;
    const bg = c.createLinearGradient(0, bannerY, 0, bannerY + bh);
    bg.addColorStop(0, 'rgba(255, 95, 162, 0.94)');
    bg.addColorStop(1, 'rgba(214, 62, 130, 0.92)');
    c.fillStyle = bg;
    roundRect(c, bannerX, bannerY, bw, bh, Math.min(26, bh * 0.16));
    c.fill();
    c.shadowBlur = 0;

    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.lineWidth = 4;
    roundRect(c, bannerX + 2, bannerY + 2, bw - 4, bh - 4, Math.min(24, bh * 0.15));
    c.stroke();

    c.strokeStyle = 'rgba(255, 226, 140, 0.75)';
    c.lineWidth = 2;
    roundRect(c, bannerX + 10, bannerY + 10, bw - 20, bh - 20, Math.min(18, bh * 0.11));
    c.stroke();

    c.textAlign = 'center';
    c.textBaseline = 'middle';

    const headerPx = Math.max(13, bh * 0.13);
    c.font = `800 ${headerPx}px system-ui, Arial, sans-serif`;
    c.fillStyle = '#ffe08a';
    c.fillText('W E L C O M E   I N', W / 2, bannerY + bh * 0.27);

    const name = GUEST.toUpperCase();
    const namePx = fitFont(c, name, bw * 0.82, bh * 0.44);
    c.font = `900 ${namePx}px system-ui, Arial, sans-serif`;
    c.fillStyle = '#ffffff';
    c.strokeStyle = 'rgba(70, 10, 45, 0.85)';
    c.lineWidth = Math.max(4, namePx * 0.075);
    c.lineJoin = 'round';
    c.strokeText(name, W / 2, bannerY + bh * 0.62);
    c.fillText(name, W / 2, bannerY + bh * 0.62);

    // tiny stars flanking the guest name
    const wName = c.measureText(name).width;
    const gap = Math.min(wName / 2 + 34, bw * 0.42);
    star(c, W / 2 - gap, bannerY + bh * 0.6, Math.max(7, namePx * 0.22), 0.95, '#ffe08a');
    star(c, W / 2 + gap, bannerY + bh * 0.6, Math.max(7, namePx * 0.22), 0.95, '#ffe08a');

    c.restore();
  }

  // --- punchline tag -------------------------------------------------------
  if (t > 6.4) {
    const p = clamp01((t - 6.4) / 0.5);
    const sc = Math.max(0.001, easeOutBack(p));
    const tagW = Math.min(bw * 0.62, 470);
    const tagH = Math.min(H * 0.1, 72);
    const tagX = W / 2;
    const tagY = bannerY + bh + tagH * 0.5 - 4;
    c.save();
    c.translate(tagX, tagY);
    c.rotate(-0.05 + Math.sin(t * 3.2) * 0.015);
    c.scale(sc, sc);
    c.globalAlpha *= clamp01(p * 1.6);
    c.shadowColor = 'rgba(10, 18, 40, 0.5)';
    c.shadowBlur = 16;
    c.fillStyle = '#0b1630';
    roundRect(c, -tagW / 2, -tagH / 2, tagW, tagH, tagH * 0.28);
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255, 214, 110, 0.85)';
    c.lineWidth = 2.5;
    roundRect(c, -tagW / 2 + 4, -tagH / 2 + 4, tagW - 8, tagH - 8, tagH * 0.22);
    c.stroke();
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tp = fitFont(c, 'ENJOY THE SLOP!', tagW * 0.86, tagH * 0.46);
    c.font = `900 ${tp}px system-ui, Arial, sans-serif`;
    c.fillStyle = '#ffe08a';
    c.fillText('ENJOY THE SLOP!', 0, 1);
    c.restore();
  }

  // --- confetti ------------------------------------------------------------
  if (t > 1.25 && once('burstL')) {
    spawnBurst(ctx, 46, 0, H * 0.94, -Math.PI / 3, 0.5, 900);
    spawnBurst(ctx, 22, 0, H * 0.94, -Math.PI / 3.4, 0.3, 700);
  }
  if (t > 1.45 && once('burstR')) {
    spawnBurst(ctx, 46, W, H * 0.94, -Math.PI * 2 / 3, 0.5, 900);
    spawnBurst(ctx, 22, W, H * 0.94, -Math.PI * 1.7 / 3, 0.3, 700);
  }
  if (t > 6.5 && once('burstTag')) {
    spawnBurst(ctx, 18, W / 2, bannerY + bh * 0.2, -Math.PI / 2, 1.9, 520);
  }

  if (t > 1.6 && t < 7.6) {
    S.rainAcc += d;
    let guard = 0;
    while (S.rainAcc > 0.045 && guard < 6) {
      S.rainAcc -= 0.045;
      spawnRain(ctx, 1);
      guard++;
    }
  }

  if (S.parts.length > 420) S.parts.splice(0, S.parts.length - 420);

  for (const p of S.parts) {
    p.life += d;
    p.vy += 800 * d;
    p.vx *= 1 - 0.55 * d;
    p.vy *= 1 - 0.22 * d;
    p.x += p.vx * d + Math.sin(p.life * 3.1 * p.sway + p.wob) * 22 * d;
    p.y += p.vy * d;
    p.rot += p.vr * d;
  }
  S.parts = S.parts.filter((p) => p.y < H + 70);

  for (const p of S.parts) {
    c.save();
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillStyle = p.color;
    c.globalAlpha *= 0.95;
    c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    c.restore();
  }

  // --- crown over the live streamer ---------------------------------------
  if (t > 2.1) {
    const p = clamp01((t - 2.1) / 1.0);
    const scale = clamp(sw / 250, 0.55, 1.5);
    const baseCy = clamp(headY - 14 * scale - 6, 28, H - 40);
    const crownCy = baseCy - (1 - easeOutBack(p)) * H * 0.45;
    const wobble = t > 6.4 && t < 7.6 ? Math.sin((t - 6.4) * 14) * 0.12 : 0;
    const tilt = Math.sin(t * 1.8) * 0.035 + wobble;
    drawCrown(c, headX, crownCy, scale, tilt, clamp01(p * 1.4));

    // sparkles orbiting the crown
    if (t > 2.8) {
      for (const sp of S.sparkles) {
        const ph = t * sp.spd + sp.ph;
        const a = sp.ang + t * 0.4;
        const rr = sp.rad * (1 + 0.12 * Math.sin(ph * 1.7));
        const px = headX + Math.cos(a) * rr * 1.5;
        const py = crownCy + 6 + Math.sin(a) * rr * 0.7;
        const tw = 0.35 + 0.45 * Math.abs(Math.sin(ph * 2.1));
        star(c, px, py, sp.sz, tw * clamp01((t - 2.8) / 0.6), '#fff6c9');
      }
    }
  }

  if (t >= DURATION - 0.05) ctx.done();
}

export function dispose() {
  S = null;
}
