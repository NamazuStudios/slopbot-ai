// Kitten Pile Protocol — a follow celebration where the live streamer gets
// methodically buried under a small, purring pyramid of kittens.
// Transparent glass: every frame clears to the broadcast underneath.

const TAU = Math.PI * 2;
const OUT = '#101a33';
const COLORS = ['#ffd9e8', '#ffe6b3', '#cfe9ff', '#e2d4ff', '#d3f7df', '#ffd0c2', '#f7e1ff', '#c8f0f2'];

let S = null;

export const meta = {
  title: 'Kitten Pile Protocol',
  author: 'savorysailor',
  prompt: 'make an animation that plays when somebody follows the streamer make sure it invovles a kittne pile on',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  triggers: [
    { "type": "follow" },
    { "type": "firstfollow" }
  ],
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function cleanName(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
}

function fadeBand(t, a, b, f) {
  if (t < a || t > b) return 0;
  return Math.max(0, Math.min(1, (t - a) / f, (b - t) / f));
}

function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
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

function drawKitten(c, x, y, r, k, t, squash, rot, open) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  const sy = 1 - squash * 0.30;
  const sx = 1 + squash * 0.26;
  c.scale(sx, sy);
  const s = r;

  // tail
  const tw = Math.sin(t * 3.1 + k.tailPh) * s * 0.30;
  c.lineCap = 'round';
  c.strokeStyle = OUT;
  c.lineWidth = s * 0.17;
  c.beginPath();
  c.moveTo(s * 0.72, s * 0.34);
  c.quadraticCurveTo(s * 1.55, s * 0.18 + tw, s * 1.26, -s * 0.56 + tw * 0.6);
  c.stroke();
  c.strokeStyle = k.color;
  c.lineWidth = s * 0.10;
  c.stroke();

  // ears
  c.fillStyle = k.color;
  c.strokeStyle = OUT;
  c.lineWidth = s * 0.10;
  for (const dir of [-1, 1]) {
    c.beginPath();
    c.moveTo(dir * s * 0.62, -s * 0.45);
    c.lineTo(dir * s * 0.55, -s * 1.02);
    c.lineTo(dir * s * 0.14, -s * 0.66);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.fillStyle = 'rgba(255,150,190,0.85)';
  for (const dir of [-1, 1]) {
    c.beginPath();
    c.moveTo(dir * s * 0.52, -s * 0.55);
    c.lineTo(dir * s * 0.49, -s * 0.88);
    c.lineTo(dir * s * 0.24, -s * 0.63);
    c.closePath();
    c.fill();
  }

  // body
  c.beginPath();
  c.ellipse(0, 0, s * 0.94, s * 0.80, 0, 0, TAU);
  c.fillStyle = k.color;
  c.fill();
  c.lineWidth = s * 0.11;
  c.strokeStyle = OUT;
  c.stroke();

  // forehead stripes
  c.strokeStyle = 'rgba(20,30,60,0.26)';
  c.lineWidth = s * 0.075;
  for (const ox of [-0.28, 0, 0.28]) {
    c.beginPath();
    c.moveTo(s * ox, -s * 0.72);
    c.quadraticCurveTo(s * ox + s * 0.07, -s * 0.52, s * ox, -s * 0.36);
    c.stroke();
  }

  // eyes
  const ey = s * 0.02;
  if (open) {
    c.fillStyle = OUT;
    for (const dir of [-1, 1]) {
      c.beginPath();
      c.ellipse(dir * s * 0.33, ey, s * 0.10, s * 0.13, 0, 0, TAU);
      c.fill();
    }
    c.fillStyle = 'rgba(255,255,255,0.92)';
    for (const dir of [-1, 1]) {
      c.beginPath();
      c.arc(dir * s * 0.33 + s * 0.03, ey - s * 0.04, s * 0.035, 0, TAU);
      c.fill();
    }
  } else {
    c.strokeStyle = OUT;
    c.lineWidth = s * 0.085;
    c.lineCap = 'round';
    for (const dir of [-1, 1]) {
      c.beginPath();
      c.arc(dir * s * 0.33, ey - s * 0.06, s * 0.13, Math.PI * 0.18, Math.PI * 0.82);
      c.stroke();
    }
  }

  // nose
  c.fillStyle = '#ff8fb5';
  c.beginPath();
  c.moveTo(0, s * 0.27);
  c.lineTo(-s * 0.055, s * 0.20);
  c.lineTo(s * 0.055, s * 0.20);
  c.closePath();
  c.fill();

  // mouth
  c.strokeStyle = OUT;
  c.lineWidth = s * 0.055;
  c.beginPath();
  c.moveTo(0, s * 0.29);
  c.quadraticCurveTo(-s * 0.07, s * 0.38, -s * 0.12, s * 0.30);
  c.moveTo(0, s * 0.29);
  c.quadraticCurveTo(s * 0.07, s * 0.38, s * 0.12, s * 0.30);
  c.stroke();

  // whiskers
  c.strokeStyle = 'rgba(16,26,51,0.68)';
  c.lineWidth = s * 0.035;
  for (const dir of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.moveTo(dir * s * 0.30, s * 0.16 + i * s * 0.10);
      c.lineTo(dir * s * 0.82, s * 0.10 + i * s * 0.16);
      c.stroke();
    }
  }

  // paws
  c.fillStyle = 'rgba(255,255,255,0.78)';
  c.strokeStyle = OUT;
  c.lineWidth = s * 0.06;
  for (const dir of [-1, 1]) {
    c.beginPath();
    c.ellipse(dir * s * 0.50, s * 0.62, s * 0.18, s * 0.12, 0, 0, TAU);
    c.fill();
    c.stroke();
  }

  c.restore();
}

function drawHeart(c, x, y, s, alpha, color) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.scale(s, s);
  c.beginPath();
  c.moveTo(0, 0.36);
  c.bezierCurveTo(-0.58, -0.10, -0.38, -0.62, 0, -0.28);
  c.bezierCurveTo(0.38, -0.62, 0.58, -0.10, 0, 0.36);
  c.fillStyle = color;
  c.fill();
  c.lineWidth = 0.10;
  c.strokeStyle = 'rgba(16,26,51,0.75)';
  c.stroke();
  c.restore();
}

function drawStar(c, x, y, s, alpha, rot, color) {
  c.save();
  c.globalAlpha = alpha;
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rr = i % 2 === 0 ? s : s * 0.30;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
  }
  c.closePath();
  c.fillStyle = color;
  c.fill();
  c.restore();
}

function caption(c, cx, y, text, size, alpha, color) {
  if (alpha <= 0.01) return;
  const W = c.canvas.width;
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let fs = size;
  c.font = `900 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
  let w = c.measureText(text).width;
  while (w > W * 0.86 && fs > 12) {
    fs *= 0.92;
    c.font = `900 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
    w = c.measureText(text).width;
  }
  const padX = fs * 0.6;
  const padY = fs * 0.50;
  c.globalAlpha = alpha * 0.86;
  roundRect(c, cx - w / 2 - padX, y - fs * 0.72 - padY * 0.5, w + padX * 2, fs * 1.44 + padY, fs * 0.55);
  c.fillStyle = 'rgba(10,16,38,0.74)';
  c.fill();
  c.strokeStyle = 'rgba(255,160,205,0.85)';
  c.lineWidth = Math.max(2, fs * 0.07);
  c.stroke();
  c.globalAlpha = alpha;
  c.fillStyle = color;
  c.fillText(text, cx, y + fs * 0.02);
  c.restore();
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;

  const rect = ctx.streamer && typeof ctx.streamer.x === 'number'
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : { x: W * 0.5 - W * 0.22, y: H * 0.34, w: W * 0.44, h: H * 0.46 };

  const pileW = Math.min(W * 0.62, Math.max(rect.w * 1.08, W * 0.34));
  const r = clamp(Math.min(pileW / (4 * 2 * 0.94), H * 0.078, W * 0.062), 14, 120);
  const baseY = Math.min(H - r * 1.15, rect.y + rect.h * 0.96);
  const cx = clamp(rect.x + rect.w * 0.5, W * 0.26, W * 0.74);

  const rows = [4, 3, 2, 1];
  const kittens = [];
  let idx = 0;
  for (let row = 0; row < rows.length; row++) {
    const n = rows[row];
    for (let col = 0; col < n; col++) {
      const tx = cx + (col - (n - 1) / 2) * r * 1.80;
      const ty = baseY - row * r * 1.32;
      const side = idx % 2 === 0 ? 1 : -1;
      const delay = idx === 0 ? 0.35 : 1.25 + (idx - 1) * 0.32;
      kittens.push({
        i: idx,
        row,
        tx,
        ty,
        x: tx,
        y: -r * 1.6,
        startX: tx + side * (W * 0.06 + ctx.rand() * W * 0.16),
        startY: -r * 1.6 - ctx.rand() * r * 1.2,
        color: COLORS[idx % COLORS.length],
        rot: (ctx.rand() - 0.5) * 0.34,
        delay,
        landT: delay + 0.52,
        landed: false,
        squash: 0,
        tailPh: ctx.rand() * TAU,
        freq: 430 + idx * 52,
      });
      idx++;
    }
  }

  const tr = ctx.trigger;
  S = {
    W,
    H,
    r,
    baseY,
    cx,
    rect,
    kittens,
    N: kittens.length,
    landedCount: 0,
    parts: [],
    hearts: [],
    heartAcc: 0,
    stampT: 7.4,
    endT: 10.6,
    stamped: false,
    ended: false,
    purrBeat: -1,
    name: cleanName(tr && tr.login),
    first: !!(tr && tr.first),
    evType: tr && tr.type ? tr.type : '',
    viewers: tr && typeof tr.viewers === 'number' ? tr.viewers : 0,
    bits: tr && typeof tr.bits === 'number' ? tr.bits : 0,
    pileTop: baseY - 3 * r * 1.32 - r * 1.0,
  };
}

export function onTrigger(ctx, event) {
  if (!S || !event) return;
  const nm = cleanName(event.login);
  if (nm) S.name = nm;
  if (event.first) S.first = true;
  if (typeof event.viewers === 'number') S.viewers = event.viewers;
  if (typeof event.bits === 'number') S.bits = event.bits;
  if (event.type) S.evType = event.type;
}

function puff(c, k, S) {
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU + k.i;
    const sp = k.r * (1.6 + ((i * 37) % 10) / 10);
    S.parts.push({
      type: 'puff',
      x: k.tx + Math.cos(a) * k.r * 0.5,
      y: k.ty + k.r * 0.45,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.6 - k.r * 1.0,
      life: 0.55,
      max: 0.55,
      size: k.r * (0.13 + ((i * 13) % 7) / 42),
      color: '#ffffff',
      rot: 0,
    });
  }
}

function sparkleBurst(c, S) {
  const cx = S.cx;
  const cy = S.pileTop + S.r * 0.5;
  for (let i = 0; i < 34; i++) {
    const a = (i / 34) * TAU + 0.3;
    const sp = S.r * (4 + ((i * 29) % 9));
    S.parts.push({
      type: 'star',
      x: cx,
      y: cy,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp * 0.8 - S.r * 1.4,
      life: 1.2,
      max: 1.2,
      size: S.r * (0.16 + ((i * 17) % 8) / 40),
      color: i % 3 === 0 ? '#ffe9a3' : i % 3 === 1 ? '#ff9fc6' : '#ffffff',
      rot: ((i * 23) % 10) / 10,
    });
  }
}

export function frame(ctx, t, dt) {
  if (!S || S.W !== ctx.width || S.H !== ctx.height) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (dt === undefined || dt === null || !(dt > 0)) dt = 0.016;
  dt = Math.min(dt, 0.1);

  const r = S.r;
  const pileDone = S.landedCount >= S.N;

  // ---- landing bookkeeping ----
  for (const k of S.kittens) {
    if (!k.landed && t >= k.landT) {
      k.landed = true;
      k.squash = 1;
      S.landedCount++;
      if (ctx.sound && typeof ctx.sound.beep === 'function') ctx.sound.beep(k.freq, 70);
      puff(c, k, S);
      for (const o of S.kittens) {
        if (o !== k && o.landed &&
            Math.abs(o.tx - k.tx) < r * 2.0 &&
            Math.abs(o.ty - k.ty) < r * 2.0) {
          o.squash = Math.max(o.squash, 0.55);
        }
      }
    }
    if (k.squash > 0) k.squash = Math.max(0, k.squash - dt * 3.4);
  }

  // ---- purr ----
  if (pileDone && t > 4.8) {
    const beat = Math.floor((t - 4.8) / 0.85);
    if (beat !== S.purrBeat) {
      S.purrBeat = beat;
      if (ctx.sound && typeof ctx.sound.beep === 'function') {
        ctx.sound.beep(beat % 2 === 0 ? 96 : 104, 230);
      }
    }
  }

  // ---- hearts ----
  if (pileDone && t > 4.9 && t < 10.4) {
    S.heartAcc += dt;
    while (S.heartAcc > 0.15) {
      S.heartAcc -= 0.15;
      S.hearts.push({
        x: S.cx + (ctx.rand() - 0.5) * r * 3.4,
        y: S.pileTop + r * (0.6 + ctx.rand() * 1.6),
        vy: r * (0.7 + ctx.rand() * 0.5),
        life: 1.7,
        max: 1.7,
        size: r * (0.14 + ctx.rand() * 0.13),
        sway: 0.5 + ctx.rand(),
        ph: ctx.rand() * TAU,
        color: ctx.rand() < 0.5 ? '#ff9fc6' : '#ffd3e4',
      });
    }
  }

  // ---- stamp punchline ----
  if (!S.stamped && t >= S.stampT) {
    S.stamped = true;
    if (ctx.sound) {
      if (typeof ctx.sound.noise === 'function') ctx.sound.noise(260);
      if (typeof ctx.sound.beep === 'function') {
        ctx.sound.beep(660, 110);
        ctx.sound.beep(880, 140);
      }
    }
    sparkleBurst(c, S);
  }

  // ---- particles ----
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.life -= dt;
    if (p.life <= 0) { S.parts.splice(i, 1); continue; }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += (p.type === 'star' ? r * 2.0 : r * 3.2) * dt;
    p.vx *= 1 - dt * 1.2;
    p.rot += dt * 3;
  }

  // ---- hearts update ----
  for (let i = S.hearts.length - 1; i >= 0; i--) {
    const h = S.hearts[i];
    h.life -= dt;
    if (h.life <= 0) { S.hearts.splice(i, 1); continue; }
    h.y -= h.vy * dt;
    h.ph += dt * 3;
  }

  // ---- draw: purr rings ----
  if (pileDone && t > 4.6) {
    const cyc = (t * 0.7) % 1;
    for (let i = 0; i < 3; i++) {
      const u = (cyc + i / 3) % 1;
      const rr = r * (2.0 + u * 4.0);
      c.beginPath();
      c.arc(S.cx, S.baseY - r * 0.9, rr, 0, TAU);
      c.strokeStyle = 'rgba(255,159,198,' + (0.30 * (1 - u)).toFixed(3) + ')';
      c.lineWidth = Math.max(2, r * 0.06);
      c.stroke();
    }
  }

  // ---- draw: landed kittens, back rows first ----
  const openEyes = t >= S.stampT;
  const landed = S.kittens.filter((k) => k.landed).sort((a, b) => b.row - a.row || a.i - b.i);
  for (const k of landed) {
    const wob = pileDone && !openEyes ? 0 : Math.sin(t * 3.4 + k.i * 1.2) * r * 0.04;
    drawKitten(c, k.tx, k.ty + wob, r, k, t, k.squash, k.rot, openEyes);
  }

  // ---- draw: falling kittens ----
  for (const k of S.kittens) {
    if (k.landed || t < k.delay) continue;
    const u = clamp((t - k.delay) / 0.52, 0, 1);
    const e = u * u;
    const x = k.startX + (k.tx - k.startX) * e;
    const y = k.startY + (k.ty - k.startY) * e;
    const spin = k.rot + (1 - e) * 0.9 * (k.i % 2 ? 1 : -1);
    drawKitten(c, x, y, r, k, t, 0, spin, false);
  }

  // ---- draw: particles ----
  for (const p of S.parts) {
    const a = Math.max(0, p.life / p.max);
    if (p.type === 'star') {
      drawStar(c, p.x, p.y, p.size, a, p.rot, p.color);
    } else {
      c.save();
      c.globalAlpha = a * 0.9;
      c.fillStyle = p.color;
      c.beginPath();
      c.arc(p.x, p.y, p.size, 0, TAU);
      c.fill();
      c.restore();
    }
  }

  // ---- draw: hearts ----
  for (const h of S.hearts) {
    const a = Math.min(1, h.life / 0.5);
    const x = h.x + Math.sin(h.ph) * r * 0.25 * h.sway;
    drawHeart(c, x, h.y, h.size, a * 0.95, h.color);
  }

  // ---- captions ----
  const capY = clamp(S.pileTop - r * 1.0, H * 0.12, H * 0.80);
  const midSize = clamp(r * 0.55, 15, 36);

  const a1 = fadeBand(t, 0.15, 1.45, 0.25);
  if (a1 > 0) {
    caption(c, S.cx, capY, 'a wild kitten approaches savorysailor', midSize, a1, '#fff3f9');
  }

  const a2 = fadeBand(t, 1.5, 4.75, 0.2);
  if (a2 > 0) {
    caption(c, S.cx, capY, S.landedCount + ' / ' + S.N + ' KITTENS DEPLOYED', midSize, a2, '#ffe6b3');
  }

  const a3 = fadeBand(t, 4.85, S.stampT - 0.05, 0.2);
  if (a3 > 0) {
    caption(c, S.cx, capY, 'kitten pile stabilized. purring engaged.', midSize, a3, '#cfe9ff');
  }

  if (t >= S.stampT) {
    const big = clamp(W * 0.034, 20, 48);
    const small = clamp(W * 0.019, 14, 26);
    const ap = clamp((t - S.stampT) / 0.18, 0, 1);
    const outA = fadeBand(t, S.stampT, S.endT + 0.2, 0.15);
    caption(c, S.cx, capY, 'KITTEN PILE: COMPLETE', big, ap * outA, '#ffe9a3');

    const who = S.name
      ? 'welcome, ' + S.name + '!'
      : 'welcome, mystery new friend!';
    caption(c, S.cx, capY + big * 1.18, who, small, ap * outA, '#ffd3e4');

    let tag = '';
    if (S.first) tag = 'FIRST FOLLOW. MAXIMUM KITTEN.';
    else if (S.evType === 'raid' && S.viewers > 0) tag = S.viewers + ' raiders, all of them kittens.';
    else if (S.bits > 0) tag = S.bits + ' bits of premium kitten.';
    if (tag) {
      caption(c, S.cx, capY + big * 1.18 + small * 1.35, tag, small * 0.82, ap * outA, '#cfe9ff');
    }
  }

  // ---- end ----
  if (!S.ended && t >= S.endT) {
    S.ended = true;
    if (typeof ctx.done === 'function') ctx.done();
  }
}

export function dispose() {
  S = null;
}
