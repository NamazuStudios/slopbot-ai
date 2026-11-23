// Peach Spore Problem — a peach-toned mushroom with a wildly thick stem
// politely aerosolizes the stream. Glass overlay: transparent everywhere.

export const meta = {
  title: 'Peach Spore Problem',
  author: 'absurdsage',
  prompt: 'a peach toned mushroom with a very thick stem and rounded cap begins shooting white spores into the air in a consistent stream while they rain down on the screen and stick all over the stream',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

const CAPTIONS = [
  [1.05, 'A SPECIMEN HAS ENTERED THE FRAME.'],
  [3.40, 'IT IS EMITTING SPORES. STEADILY.'],
  [6.80, 'SAVORYSAILOR HAS BEEN SEASONED.'],
  [10.60, 'PLEASE STOP INHALING THE CAMERA.'],
  [14.40, 'THAT IS ENOUGH. THAT IS PLENTY.'],
];

const END_AT = 17.7;

let S = null;

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

function makeLayout(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const streamer = ctx.streamer;
  // Put the specimen on the side of the frame away from the live camera.
  const cameraCenter = streamer ? streamer.x + streamer.w * 0.5 : 0.5;
  const onRight = cameraCenter < 0.5;
  const size = Math.min(H * 0.42, W * 0.36);
  const bx = (onRight ? 0.80 : 0.20) * W;
  const by = H * 1.05;
  const stemH = size * 0.64;
  const stemW = size * 0.31;
  const capW = size * 0.96;
  const capH = size * 0.58;
  const topY = by - stemH;
  return {
    W, H, size, bx, by, stemH, stemW, capW, capH, topY,
    emitX: bx,
    emitY: topY - capH * 0.42,
  };
}

export function init(ctx) {
  const geo = makeLayout(ctx);
  S = {
    geo,
    W: geo.W,
    H: geo.H,
    m: Math.min(geo.W, geo.H),
    spores: [],
    stuck: [],
    puffs: [],
    emitAcc: 0,
    pulse: 0,
    burstFlags: [false, false, false],
    lastLandBeep: 0,
  };
  // A first, tiny pre-puff of dust so the arrival reads as a landing.
  if (S.puffs) S.puffs.push({ x: geo.emitX, y: geo.by, r: geo.size * 0.2, life: 0, max: 0.6 });
}

export function dispose() {
  S = null;
}

function spawnSpore(ctx, boost) {
  const g = S.geo;
  const r = ctx.rand();
  const x = g.emitX + (r - 0.5) * g.capW * 0.32;
  const y = g.emitY - Math.abs(ctx.rand() - 0.5) * S.m * 0.04;
  const vy = -(0.42 + ctx.rand() * 0.24) * S.H * (boost ? 1.18 : 1);
  const vx = (ctx.rand() - 0.5) * S.H * 0.11;
  const radius = S.m * (0.0038 + ctx.rand() * 0.0058);
  const stickAt = clamp(y + (0.16 + ctx.rand() * 0.62) * S.H, y + S.H * 0.04, S.H * 0.995);
  S.spores.push({
    x, y, vx, vy, r: radius, stickAt,
    ph: ctx.rand() * TAU,
    glow: 0.55 + ctx.rand() * 0.45,
  });
}

function stickSpore(ctx, s) {
  const blobs = [];
  const n = 3 + Math.floor(ctx.rand() * 3);
  for (let i = 0; i < n; i++) {
    blobs.push({
      dx: (ctx.rand() - 0.5) * s.r * 2.6,
      dy: (ctx.rand() - 0.5) * s.r * 2.6,
      rr: s.r * (0.35 + ctx.rand() * 0.72),
    });
  }
  S.stuck.push({
    x: s.x,
    y: s.y,
    r: s.r,
    blobs,
    ph: ctx.rand() * TAU,
    tint: 0.75 + ctx.rand() * 0.25,
  });
  if (S.stuck.length > 420) S.stuck.shift();
}

function puff(ctx, strength) {
  const g = S.geo;
  S.puffs.push({
    x: g.emitX,
    y: g.emitY,
    r: S.m * (0.05 + 0.03 * strength),
    life: 0,
    max: 0.7 + 0.2 * strength,
  });
}

function update(ctx, t, d) {
  // growth in
  S.grow = easeOutBack(clamp((t - 0.15) / 0.9, 0, 1));
  S.pulse = Math.max(0, S.pulse - d * 2.4);

  // bursts punctuate the otherwise very consistent stream
  const burstTimes = [4.4, 8.2, 11.4];
  for (let i = 0; i < burstTimes.length; i++) {
    if (!S.burstFlags[i] && t >= burstTimes[i]) {
      S.burstFlags[i] = true;
      S.pulse = 1;
      puff(ctx, 1);
      try {
        ctx.sound.noise(190);
      } catch (e) { /* the host owns sound failures */ }
      for (let k = 0; k < 18; k++) spawnSpore(ctx, true);
      try {
        ctx.sound.beep(210 + i * 60, 70);
      } catch (e) { /* ignore */ }
    }
  }

  // emission rate: nothing, then steady, then a wind-down
  let rate = 0;
  if (t >= 1.6) {
    if (t < 3.2) rate = lerp(8, 20, (t - 1.6) / 1.6);
    else if (t < 12.0) rate = 20;
    else if (t < 13.8) rate = lerp(20, 0, (t - 12.0) / 1.8);
  }
  S.emitAcc += rate * d;
  while (S.emitAcc >= 1) {
    S.emitAcc -= 1;
    spawnSpore(ctx, false);
  }

  // spore physics
  const grav = S.H * 0.78;
  for (let i = S.spores.length - 1; i >= 0; i--) {
    const s = S.spores[i];
    s.vy += grav * d;
    s.vy *= 1 - 0.22 * d;
    s.vx *= 1 - 0.9 * d;
    s.x += s.vx * d + Math.sin(t * 2.4 + s.ph) * S.m * 0.004 * d * 60;
    s.y += s.vy * d;

    if (s.vy > 0 && s.y >= s.stickAt && s.y > S.geo.emitY) {
      stickSpore(ctx, s);
      S.spores.splice(i, 1);
      if (ctx.rand() < 0.05 && t - S.lastLandBeep > 0.18) {
        S.lastLandBeep = t;
        try {
          ctx.sound.beep(820 + ctx.rand() * 1100, 22);
        } catch (e) { /* ignore */ }
      }
    } else if (s.y > S.H * 1.15) {
      S.spores.splice(i, 1);
    }
  }

  // puff rings
  for (let i = S.puffs.length - 1; i >= 0; i--) {
    const p = S.puffs[i];
    p.life += d;
    if (p.life >= p.max) S.puffs.splice(i, 1);
  }
}

function drawMushroom(ctx, t) {
  const c = ctx.canvas;
  const g = S.geo;
  const k = S.grow;
  const wob = Math.sin(t * 1.7) * 0.013 + Math.sin(t * 4.1) * 0.004 + S.pulse * 0.008;
  const squash = S.pulse * 0.9 + Math.sin(t * 3.2) * 0.16;

  c.save();
  c.translate(g.bx, g.by);
  c.rotate(wob);
  c.scale(k * (1 + squash * 0.018), k * (1 - squash * 0.024));
  c.translate(-g.bx, -g.by);

  const topY = g.topY;
  const capMidY = topY + g.capH * 0.03;

  // contact shadow at the base
  c.save();
  c.globalAlpha = 0.24;
  c.fillStyle = '#20102a';
  c.beginPath();
  c.ellipse(g.bx, g.by, g.stemW * 0.95, g.stemW * 0.22, 0, 0, TAU);
  c.fill();
  c.restore();

  // ---- stem: thick, peachy, a little smug ----
  const stemGrad = c.createLinearGradient(g.bx - g.stemW * 0.6, 0, g.bx + g.stemW * 0.6, 0);
  stemGrad.addColorStop(0, '#d28d6c');
  stemGrad.addColorStop(0.22, '#f2c3a3');
  stemGrad.addColorStop(0.5, '#ffe3cd');
  stemGrad.addColorStop(0.78, '#f0bc9b');
  stemGrad.addColorStop(1, '#c9805f');
  c.fillStyle = stemGrad;
  c.beginPath();
  c.moveTo(g.bx - g.stemW * 0.46, g.by);
  c.bezierCurveTo(
    g.bx - g.stemW * 0.72, g.by - g.stemH * 0.34,
    g.bx - g.stemW * 0.54, g.by - g.stemH * 0.78,
    g.bx - g.stemW * 0.42, topY + g.stemH * 0.04,
  );
  c.quadraticCurveTo(g.bx, topY - g.stemH * 0.06, g.bx + g.stemW * 0.42, topY + g.stemH * 0.04);
  c.bezierCurveTo(
    g.bx + g.stemW * 0.54, g.by - g.stemH * 0.78,
    g.bx + g.stemW * 0.72, g.by - g.stemH * 0.34,
    g.bx + g.stemW * 0.46, g.by,
  );
  c.closePath();
  c.fill();

  // soft left highlight down the stem
  c.save();
  c.translate(g.bx - g.stemW * 0.19, g.by - g.stemH * 0.44);
  c.rotate(-0.06);
  c.globalAlpha = 0.34;
  c.fillStyle = '#fff4ea';
  c.beginPath();
  c.ellipse(0, 0, g.stemW * 0.085, g.stemH * 0.26, 0, 0, TAU);
  c.fill();
  c.restore();

  // faint stem grain so it does not read as a plastic tube
  c.save();
  c.globalAlpha = 0.10;
  c.strokeStyle = '#b56f52';
  c.lineWidth = Math.max(1, S.m * 0.0022);
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.moveTo(g.bx + i * g.stemW * 0.26, g.by - g.stemH * 0.10);
    c.quadraticCurveTo(
      g.bx + i * g.stemW * 0.30, g.by - g.stemH * 0.45,
      g.bx + i * g.stemW * 0.24, g.by - g.stemH * 0.76,
    );
    c.stroke();
  }
  c.restore();

  // ---- cap: round, peach, heavily speckled ----
  const capGrad = c.createRadialGradient(
    g.bx - g.capW * 0.14, capMidY - g.capH * 0.42, g.capW * 0.05,
    g.bx, capMidY, g.capW * 0.62,
  );
  capGrad.addColorStop(0, '#ffe0c6');
  capGrad.addColorStop(0.45, '#f8b992');
  capGrad.addColorStop(0.82, '#e79a72');
  capGrad.addColorStop(1, '#c97c58');
  c.fillStyle = capGrad;
  c.beginPath();
  c.moveTo(g.bx - g.capW * 0.5, capMidY);
  c.bezierCurveTo(
    g.bx - g.capW * 0.53, topY - g.capH * 0.92,
    g.bx + g.capW * 0.53, topY - g.capH * 0.92,
    g.bx + g.capW * 0.5, capMidY,
  );
  c.bezierCurveTo(
    g.bx + g.capW * 0.42, capMidY + g.capH * 0.26,
    g.bx - g.capW * 0.42, capMidY + g.capH * 0.26,
    g.bx - g.capW * 0.5, capMidY,
  );
  c.closePath();
  c.fill();

  // rim shading
  c.save();
  c.globalAlpha = 0.30;
  c.strokeStyle = '#9c5a3e';
  c.lineWidth = Math.max(1, S.m * 0.0035);
  c.beginPath();
  c.moveTo(g.bx - g.capW * 0.47, capMidY + g.capH * 0.02);
  c.quadraticCurveTo(g.bx, capMidY + g.capH * 0.30, g.bx + g.capW * 0.47, capMidY + g.capH * 0.02);
  c.stroke();
  c.restore();

  // skirt frill under the cap
  c.save();
  c.strokeStyle = 'rgba(220,150,120,0.55)';
  c.lineWidth = Math.max(1, S.m * 0.003);
  const frillN = 9;
  for (let i = 0; i < frillN; i++) {
    const fx = g.bx + (i / (frillN - 1) - 0.5) * g.capW * 0.72;
    c.beginPath();
    c.moveTo(fx, capMidY + g.capH * 0.06);
    c.quadraticCurveTo(fx + g.capW * 0.02, capMidY + g.capH * 0.16, fx, capMidY + g.capH * 0.21);
    c.stroke();
  }
  c.restore();

  // cream speckles
  c.save();
  c.fillStyle = 'rgba(255,244,228,0.85)';
  const spots = [
    [-0.22, -0.26, 0.115, 0.085, -0.3],
    [0.10, -0.40, 0.085, 0.062, 0.2],
    [0.30, -0.14, 0.100, 0.072, 0.5],
    [-0.32, -0.02, 0.075, 0.055, -0.1],
    [0.02, -0.14, 0.065, 0.048, 0.0],
    [-0.06, -0.48, 0.055, 0.042, 0.3],
  ];
  for (let i = 0; i < spots.length; i++) {
    const sp = spots[i];
    c.save();
    c.translate(g.bx + sp[0] * g.capW, capMidY + sp[1] * g.capH);
    c.rotate(sp[4]);
    c.beginPath();
    c.ellipse(0, 0, sp[2] * g.capW * 0.5, sp[3] * g.capH, 0, 0, TAU);
    c.fill();
    c.restore();
  }
  c.restore();

  // glossy sheen on the cap
  c.save();
  c.globalAlpha = 0.18;
  c.fillStyle = '#fffdf8';
  c.beginPath();
  c.ellipse(g.bx - g.capW * 0.20, capMidY - g.capH * 0.34, g.capW * 0.16, g.capH * 0.10, -0.5, 0, TAU);
  c.fill();
  c.restore();

  c.restore();
}

function drawPuffs(ctx) {
  const c = ctx.canvas;
  for (let i = 0; i < S.puffs.length; i++) {
    const p = S.puffs[i];
    const u = clamp(p.life / p.max, 0, 1);
    const rr = p.r * (0.5 + u * 1.9);
    c.save();
    c.globalAlpha = (1 - u) * 0.34;
    c.strokeStyle = '#ffffff';
    c.lineWidth = Math.max(1, S.m * 0.006 * (1 - u));
    c.beginPath();
    c.arc(p.x, p.y, rr, 0, TAU);
    c.stroke();
    c.restore();
  }
}

function drawSpores(ctx, t) {
  const c = ctx.canvas;
  for (let i = 0; i < S.spores.length; i++) {
    const s = S.spores[i];
    const flick = 0.78 + 0.22 * Math.sin(t * 9 + s.ph);
    c.save();
    c.globalAlpha = 0.22 * flick * s.glow;
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.arc(s.x, s.y, s.r * 2.1, 0, TAU);
    c.fill();
    c.globalAlpha = 0.92 * flick;
    c.beginPath();
    c.arc(s.x, s.y, s.r, 0, TAU);
    c.fill();
    c.restore();
  }
}

function drawStuck(ctx, t) {
  const c = ctx.canvas;
  for (let i = 0; i < S.stuck.length; i++) {
    const s = S.stuck[i];
    const dx = Math.sin(t * 1.1 + s.ph) * S.m * 0.0012;
    const dy = Math.cos(t * 0.9 + s.ph) * S.m * 0.0009;
    c.save();
    c.translate(s.x + dx, s.y + dy);
    // translucent, so the live shot still reads through the splat
    c.globalAlpha = 0.20 * s.tint;
    c.fillStyle = '#f3f7ff';
    for (let j = 0; j < s.blobs.length; j++) {
      const b = s.blobs[j];
      c.beginPath();
      c.arc(b.dx, b.dy, b.rr * 1.7, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 0.55 * s.tint;
    c.fillStyle = '#ffffff';
    for (let j = 0; j < s.blobs.length; j++) {
      const b = s.blobs[j];
      c.beginPath();
      c.arc(b.dx, b.dy, b.rr, 0, TAU);
      c.fill();
    }
    c.restore();
  }
}

function drawCaption(ctx, t) {
  const c = ctx.canvas;
  let entry = null;
  for (let i = 0; i < CAPTIONS.length; i++) {
    if (t >= CAPTIONS[i][0]) entry = CAPTIONS[i];
  }
  if (!entry) return;
  const age = t - entry[0];
  const fadeIn = clamp(age / 0.28, 0, 1);
  const fadeOut = clamp((END_AT - t) / 0.35, 0, 1);
  const alpha = fadeIn * fadeOut;
  if (alpha <= 0.01) return;

  let fs = clamp(Math.min(S.W * 0.028, S.H * 0.040), 13, 46);
  c.save();
  c.font = `800 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
  let tw = c.measureText(entry[1]).width;
  const maxW = S.W * 0.84;
  if (tw > maxW) {
    fs *= maxW / tw;
    c.font = `800 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
    tw = c.measureText(entry[1]).width;
  }
  const padX = fs * 0.9;
  const padY = fs * 0.55;
  const bw = tw + padX * 2;
  const bh = fs + padY * 2;
  const bx = (S.W - bw) * 0.5;
  const by = S.H * 0.055;
  const pop = 1 + 0.05 * (1 - easeOutCubic(clamp(age / 0.32, 0, 1)));

  c.translate(S.W * 0.5, by + bh * 0.5);
  c.scale(pop, pop);
  c.translate(-S.W * 0.5, -(by + bh * 0.5));

  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(18,12,32,0.62)';
  roundRect(c, bx, by, bw, bh, bh * 0.32);
  c.fill();
  c.strokeStyle = ctx.accent;
  c.lineWidth = Math.max(1.5, fs * 0.06);
  c.globalAlpha = alpha * 0.8;
  roundRect(c, bx, by, bw, bh, bh * 0.32);
  c.stroke();

  c.globalAlpha = alpha;
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(entry[1], S.W * 0.5, by + bh * 0.5 + fs * 0.03);
  c.restore();
}

function drawMeter(ctx, t) {
  const c = ctx.canvas;
  const pct = Math.min(1, S.stuck.length / 300);
  const fs = clamp(S.W * 0.014, 9, 20);
  const barW = clamp(S.W * 0.16, 90, 260);
  const barH = Math.max(6, fs * 0.5);
  const x = S.W - barW - S.W * 0.03;
  const y = S.H - barH - S.H * 0.035;

  c.save();
  c.font = `700 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
  c.textAlign = 'right';
  c.textBaseline = 'bottom';
  c.globalAlpha = 0.9;
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.fillText(`SPORE COVERAGE ${Math.round(pct * 100)}%`, x + barW, y - fs * 0.45);

  c.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(c, x, y, barW, barH, barH * 0.5);
  c.fill();
  c.fillStyle = ctx.accent;
  roundRect(c, x, y, Math.max(barH, barW * pct), barH, barH * 0.5);
  c.fill();
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);
  if (!S) init(ctx);

  const d = Math.min(dt || 0, 0.05);
  update(ctx, t, d);

  drawMushroom(ctx, t);
  drawPuffs(ctx);
  drawSpores(ctx, t);
  drawStuck(ctx, t);
  drawCaption(ctx, t);
  drawMeter(ctx, t);

  if (t >= END_AT) {
    try {
      ctx.done();
    } catch (e) { /* the host may already be tearing us down */ }
  }
}
