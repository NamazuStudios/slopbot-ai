export const meta = {
  title: 'Mashed Menace',
  author: 'deedeemarie',
  prompt: 'An animated turkey pops in on the side of the screen throwing mash potatoes at the streamers.',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;

let S = null;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const easeOut = (k) => 1 - Math.pow(1 - k, 3);
const easeIn = (k) => k * k * k;
const easeOutBack = (k) => {
  const c = 1.70158;
  const x = k - 1;
  return 1 + (c + 1) * x * x * x + c * x * x;
};

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const rand = ctx.rand;

  const rect = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : { x: W * 0.53, y: H * 0.12, w: W * 0.36, h: H * 0.6 };

  const size = Math.min(W, H) * 0.26;
  const turkeyLeft = rect.x + rect.w * 0.5 > W * 0.5;
  const tx = turkeyLeft ? W * 0.135 : W * 0.865;
  const ty = Math.min(H * 0.75, H - size * 0.85);
  const dir = turkeyLeft ? 1 : -1;

  const spots = [
    [0.18, 0.7], [0.5, 0.84], [0.82, 0.66],
    [0.3, 0.52], [0.7, 0.5], [0.12, 0.48],
    [0.88, 0.5], [0.45, 0.66], [0.62, 0.78],
    [0.36, 0.86], [0.76, 0.88], [0.24, 0.62],
  ];

  // ---- throw schedule: one, two, three, then a full barrage ----
  const groups = [
    { t0: 2.9, dur: 0.62, count: 1, stagger: 0.0 },
    { t0: 4.4, dur: 0.56, count: 2, stagger: 0.13 },
    { t0: 6.0, dur: 0.52, count: 3, stagger: 0.11 },
    { t0: 7.55, dur: 0.5, count: 5, stagger: 0.075 },
  ];

  const potatoes = [];
  const splats = [];
  const events = [];
  let spotIndex = 0;

  events.push({ at: 0.15, done: false, run: () => ctx.sound.beep(520, 90) });
  events.push({ at: 1.12, done: false, run: () => ctx.sound.beep(165, 110) });
  events.push({ at: 1.26, done: false, run: () => ctx.sound.beep(140, 90) });
  events.push({ at: 9.25, done: false, run: () => ctx.sound.beep(660, 110) });
  events.push({ at: 9.42, done: false, run: () => ctx.sound.beep(880, 150) });

  groups.forEach((grp, gi) => {
    events.push({
      at: grp.t0 - 0.08,
      done: false,
      run: () => ctx.sound.noise(80),
    });

    let lastImpact = 0;
    for (let i = 0; i < grp.count; i++) {
      const spot = spots[spotIndex % spots.length];
      spotIndex++;
      const jx = (rand() - 0.5) * rect.w * 0.1;
      const jy = (rand() - 0.5) * rect.h * 0.08;
      const destX = rect.x + spot[0] * rect.w + jx;
      const destY = rect.y + spot[1] * rect.h + jy;
      const startX = tx + dir * size * 0.5 + (rand() - 0.5) * size * 0.18;
      const startY = ty - size * 0.42 + (rand() - 0.5) * size * 0.2;
      const t0 = grp.t0 + i * grp.stagger;
      const dur = grp.dur + rand() * 0.06;
      const arc = H * (0.3 + rand() * 0.16);
      const r = size * (0.2 + rand() * 0.05);
      const impact = t0 + dur;
      lastImpact = Math.max(lastImpact, impact);

      potatoes.push({
        t0, dur, r,
        x0: startX, y0: startY,
        x1: destX, y1: destY,
        arc,
        spin: (rand() - 0.5) * 2.4,
        trailSeed: rand() * 100,
      });

      const drips = [];
      for (let d = 0; d < 3; d++) {
        drips.push({
          ox: (rand() - 0.5) * r * 1.1,
          len: r * (0.5 + rand() * 0.9),
          w: r * (0.2 + rand() * 0.16),
        });
      }
      const lumps = [];
      for (let l = 0; l < 4; l++) {
        const a = rand() * TAU;
        const rr = rand() * r * 0.65;
        lumps.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * 0.8, s: r * (0.12 + rand() * 0.13) });
      }
      splats.push({
        x: destX, y: destY,
        r: r * (1.15 + rand() * 0.35),
        rot: rand() * TAU,
        at: impact,
        drips,
        lumps,
        butter: rand() > 0.55,
      });
    }

    events.push({
      at: lastImpact,
      done: false,
      run: () => {
        ctx.sound.noise(150);
        ctx.sound.beep(gi % 2 ? 95 : 112, 120);
      },
    });
  });

  S = {
    W, H, rect, size, tx, ty, dir, turkeyLeft,
    potatoes, splats, events,
    total: 12.0,
    lastT: 0,
    done: false,
  };

  // seed a couple of idle blinks so the bird feels alive
  S.blinks = [1.8, 3.6, 5.2, 8.1, 9.6];
}

function potatoPos(p, t) {
  const k = clamp((t - p.t0) / p.dur, 0, 1);
  return {
    k,
    x: lerp(p.x0, p.x1, k),
    y: lerp(p.y0, p.y1, k) - Math.sin(k * Math.PI) * p.arc,
  };
}

function drawMash(g, r, rot) {
  g.beginPath();
  const lobes = 11;
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * TAU;
    const rr = r * (0.84 + 0.16 * Math.sin(a * 3 + rot) + 0.09 * Math.sin(a * 5 + rot * 1.7));
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr * 0.88;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
}

function drawSplat(g, s, t) {
  const age = t - s.at;
  if (age < 0) return;
  const pop = clamp(age / 0.13, 0, 1);
  const sc = 0.5 + 0.5 * easeOutBack(pop);
  const alpha = 0.94;

  g.save();
  g.translate(s.x, s.y);
  g.scale(sc, sc);

  // drips first, so the blob sits over them
  const grow = clamp(age / 1.7, 0, 1);
  g.fillStyle = `rgba(235, 219, 182, ${alpha * 0.9})`;
  for (const d of s.drips) {
    const len = d.len * easeOut(grow) * (1 + Math.sin(t * 1.5 + s.rot) * 0.02);
    g.beginPath();
    g.moveTo(d.ox - d.w * 0.5, 0);
    g.quadraticCurveTo(d.ox - d.w * 0.55, len * 0.7, d.ox, len);
    g.quadraticCurveTo(d.ox + d.w * 0.55, len * 0.7, d.ox + d.w * 0.5, 0);
    g.closePath();
    g.fill();
  }

  g.save();
  g.rotate(s.rot);
  drawMash(g, s.r, s.rot);
  g.fillStyle = `rgba(243, 230, 196, ${alpha})`;
  g.fill();
  g.lineWidth = Math.max(1.5, s.r * 0.07);
  g.strokeStyle = `rgba(176, 148, 104, ${alpha * 0.85})`;
  g.stroke();

  // potato lumps
  for (const l of s.lumps) {
    g.beginPath();
    g.arc(l.x, l.y, l.s, 0, TAU);
    g.fillStyle = `rgba(255, 246, 219, ${alpha})`;
    g.fill();
    g.strokeStyle = `rgba(190, 165, 122, ${alpha * 0.6})`;
    g.lineWidth = 1;
    g.stroke();
  }

  // a pat of butter, for class
  if (s.butter) {
    g.save();
    g.translate(s.r * 0.18, -s.r * 0.2);
    g.rotate(-0.2);
    const b = s.r * 0.28;
    g.fillStyle = `rgba(255, 214, 92, ${alpha})`;
    g.strokeStyle = `rgba(212, 160, 45, ${alpha})`;
    g.lineWidth = 1.2;
    g.beginPath();
    g.rect(-b * 0.5, -b * 0.35, b, b * 0.7);
    g.fill();
    g.stroke();
    g.restore();
  }
  g.restore();
  g.restore();
}

function drawTurkey(g, t) {
  const { tx, ty, size, dir, turkeyLeft } = S;

  // pop-in
  const popStart = 0.15;
  let pop = 0;
  if (t >= popStart) pop = clamp((t - popStart) / 0.7, 0, 1);
  let scale = 0;
  if (pop > 0) scale = easeOutBack(pop);
  let extraY = 0;
  let fade = 1;

  // exit
  const exitStart = 11.15;
  if (t >= exitStart) {
    const k = clamp((t - exitStart) / 0.85, 0, 1);
    extraY = easeIn(k) * size * 2.6;
    fade = 1 - k;
    scale *= 1 - easeIn(k) * 0.4;
  }
  if (scale <= 0.001 || fade <= 0.001) return;

  const bob = Math.sin(t * 3.1) * size * 0.025;
  let tilt = Math.sin(t * 1.7) * 0.025;
  let danceY = 0;
  if (t > 9.1 && t < 11.1) {
    tilt += Math.sin((t - 9.1) * 13) * 0.09;
    danceY = -Math.abs(Math.sin((t - 9.1) * 9)) * size * 0.07;
  }

  // shadow
  g.save();
  g.globalAlpha = 0.2 * fade;
  const sg = g.createRadialGradient(tx, ty + size * 0.92, size * 0.05, tx, ty + size * 0.92, size * 0.85);
  sg.addColorStop(0, 'rgba(0,0,0,0.55)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sg;
  g.beginPath();
  g.ellipse(tx, ty + size * 0.92, size * 0.8, size * 0.17, 0, 0, TAU);
  g.fill();
  g.restore();

  g.save();
  g.globalAlpha = fade;
  g.translate(tx, ty + bob + extraY + danceY);
  g.rotate(tilt);
  g.scale(scale * size * dir, scale * size);

  // ---- tail feathers ----
  const featherCols = ['#d1603d', '#e08a3c', '#c24747', '#e3a94f', '#b8543a'];
  for (let i = 0; i < 5; i++) {
    const a = -1.35 + i * 0.36;
    g.save();
    g.rotate(a);
    g.beginPath();
    g.ellipse(-0.62, -0.16, 0.62, 0.24, 0, 0, TAU);
    g.fillStyle = featherCols[i];
    g.fill();
    g.strokeStyle = 'rgba(74, 40, 26, 0.75)';
    g.lineWidth = 0.045;
    g.stroke();
    g.restore();
  }

  // ---- body ----
  g.beginPath();
  g.ellipse(0, 0, 0.86, 0.78, 0, 0, TAU);
  g.fillStyle = '#8d5a38';
  g.fill();
  g.strokeStyle = '#4a2b1a';
  g.lineWidth = 0.05;
  g.stroke();

  // belly
  g.beginPath();
  g.ellipse(0.14, 0.16, 0.56, 0.5, -0.15, 0, TAU);
  g.fillStyle = '#b07c4f';
  g.fill();

  // ---- neck + head ----
  g.beginPath();
  g.moveTo(0.35, -0.5);
  g.quadraticCurveTo(0.52, -0.9, 0.62, -1.16);
  g.lineWidth = 0.3;
  g.strokeStyle = '#8d5a38';
  g.lineCap = 'round';
  g.stroke();
  g.lineWidth = 0.34;
  g.strokeStyle = 'rgba(74, 43, 26, 0.4)';
  g.beginPath();
  g.moveTo(0.35, -0.5);
  g.quadraticCurveTo(0.52, -0.9, 0.62, -1.16);
  g.stroke();

  const hx = 0.64;
  const hy = -1.24;
  g.beginPath();
  g.arc(hx, hy, 0.29, 0, TAU);
  g.fillStyle = '#94603b';
  g.fill();
  g.strokeStyle = '#4a2b1a';
  g.lineWidth = 0.05;
  g.stroke();

  // beak
  g.beginPath();
  g.moveTo(hx + 0.22, hy - 0.04);
  g.lineTo(hx + 0.52, hy + 0.05);
  g.lineTo(hx + 0.22, hy + 0.14);
  g.closePath();
  g.fillStyle = '#f2b134';
  g.fill();
  g.strokeStyle = '#8a5a12';
  g.lineWidth = 0.04;
  g.stroke();

  // wattle
  g.beginPath();
  g.ellipse(hx + 0.24, hy + 0.24, 0.1, 0.17, 0.25, 0, TAU);
  g.fillStyle = '#c8383f';
  g.fill();

  // snood
  g.beginPath();
  g.moveTo(hx + 0.14, hy - 0.12);
  g.quadraticCurveTo(hx + 0.3, hy - 0.16, hx + 0.26, hy + 0.06);
  g.lineWidth = 0.07;
  g.strokeStyle = '#c8383f';
  g.lineCap = 'round';
  g.stroke();

  // eye + angry brow
  const blinkPhase = S.blinks.some((b) => Math.abs(t - b) < 0.09);
  const eyeY = hy - 0.09;
  if (blinkPhase) {
    g.beginPath();
    g.moveTo(hx + 0.0, eyeY);
    g.lineTo(hx + 0.14, eyeY);
    g.lineWidth = 0.035;
    g.strokeStyle = '#241309';
    g.stroke();
  } else {
    g.beginPath();
    g.arc(hx + 0.07, eyeY, 0.075, 0, TAU);
    g.fillStyle = '#fdf6e8';
    g.fill();
    g.beginPath();
    g.arc(hx + 0.095, eyeY, 0.036, 0, TAU);
    g.fillStyle = '#1a0e06';
    g.fill();
  }
  g.beginPath();
  g.moveTo(hx - 0.06, eyeY - 0.12);
  g.lineTo(hx + 0.17, eyeY - 0.045);
  g.lineWidth = 0.05;
  g.strokeStyle = '#3a1f10';
  g.stroke();

  // ---- throwing wing ----
  let wing = Math.sin(t * 2.3) * 0.09;
  let bestT0 = -99;
  for (const p of S.potatoes) {
    if (p.t0 > bestT0 && p.t0 <= t) bestT0 = p.t0;
  }
  const upcoming = S.potatoes.find((p) => t < p.t0 && p.t0 - t < 0.52);
  if (upcoming) {
    const k = clamp(1 - (upcoming.t0 - t) / 0.52, 0, 1);
    wing = -1.95 * easeOut(k);
  } else if (t - bestT0 < 0.3) {
    const k = clamp((t - bestT0) / 0.3, 0, 1);
    wing = 0.95 * (1 - easeOut(k));
  }

  g.save();
  g.translate(0.22, -0.02);
  g.rotate(wing);
  g.beginPath();
  g.ellipse(0.42, 0.06, 0.44, 0.19, 0.05, 0, TAU);
  g.fillStyle = '#a06a42';
  g.fill();
  g.strokeStyle = '#4a2b1a';
  g.lineWidth = 0.045;
  g.stroke();
  // feather tips
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.ellipse(0.76 + i * 0.07, 0.03 + i * 0.075, 0.11, 0.055, 0.2, 0, TAU);
    g.fillStyle = i === 1 ? '#e08a3c' : '#c47a4c';
    g.fill();
  }
  g.restore();

  // back wing
  g.save();
  g.translate(-0.1, 0.05);
  g.rotate(-0.2 + Math.sin(t * 2.3 + 1) * 0.06);
  g.beginPath();
  g.ellipse(-0.34, 0.16, 0.38, 0.17, 0.1, 0, TAU);
  g.fillStyle = '#7c4d2f';
  g.fill();
  g.strokeStyle = '#4a2b1a';
  g.lineWidth = 0.04;
  g.stroke();
  g.restore();

  // legs
  g.strokeStyle = '#e0a23c';
  g.lineWidth = 0.07;
  for (const lx of [-0.18, 0.2]) {
    g.beginPath();
    g.moveTo(lx, 0.68);
    g.lineTo(lx + 0.02, 0.9);
    g.stroke();
    g.beginPath();
    g.moveTo(lx - 0.12, 0.94);
    g.lineTo(lx + 0.02, 0.9);
    g.lineTo(lx + 0.14, 0.94);
    g.lineWidth = 0.05;
    g.stroke();
  }

  g.restore();
}

function drawPotatoes(g, t) {
  for (const p of S.potatoes) {
    if (t < p.t0 || t > p.t0 + p.dur) continue;
    const pos = potatoPos(p, t);

    // motion trail
    for (let i = 1; i <= 3; i++) {
      const tt = t - i * 0.045;
      if (tt < p.t0) continue;
      const q = potatoPos(p, tt);
      g.beginPath();
      g.arc(q.x, q.y, p.r * (0.32 - i * 0.06), 0, TAU);
      g.fillStyle = `rgba(243, 230, 196, ${0.34 - i * 0.08})`;
      g.fill();
    }

    g.save();
    g.translate(pos.x, pos.y);
    g.rotate(p.spin * pos.k * Math.PI * 2);
    drawMash(g, p.r, p.spin);
    g.fillStyle = '#f3e6c4';
    g.fill();
    g.strokeStyle = '#b09468';
    g.lineWidth = Math.max(1.4, p.r * 0.08);
    g.stroke();
    // butter pat mid-air
    g.beginPath();
    g.rect(-p.r * 0.18, -p.r * 0.3, p.r * 0.36, p.r * 0.24);
    g.fillStyle = '#ffd65c';
    g.fill();
    g.restore();
  }
}

function drawImpacts(g, t) {
  for (const s of S.splats) {
    const age = t - s.at;
    if (age < 0 || age > 0.45) continue;
    const k = age / 0.45;
    g.beginPath();
    g.arc(s.x, s.y, s.r * (1.1 + k * 2.6), 0, TAU);
    g.lineWidth = Math.max(1.5, s.r * 0.16 * (1 - k));
    g.strokeStyle = `rgba(255, 246, 219, ${0.75 * (1 - k)})`;
    g.stroke();

    // flying crumbs
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + s.rot;
      const d = s.r * (0.6 + easeOut(k) * 2.4);
      g.beginPath();
      g.arc(s.x + Math.cos(a) * d, s.y + Math.sin(a) * d + k * k * s.r * 1.4, s.r * 0.09 * (1 - k), 0, TAU);
      g.fillStyle = `rgba(243, 230, 196, ${0.8 * (1 - k)})`;
      g.fill();
    }
  }
}

function drawCaption(g, t) {
  let text = '';
  let a = 0;
  if (t > 0.35 && t < 2.3) {
    text = 'gobble gobble.';
    a = clamp((t - 0.35) / 0.2, 0, 1) * (t > 2.0 ? clamp((2.3 - t) / 0.3, 0, 1) : 1);
  } else if (t >= 2.3 && t < 9.2) {
    text = 'target acquired: SAVORYSAILOR';
    a = clamp((t - 2.3) / 0.2, 0, 1) * (t > 8.9 ? clamp((9.2 - t) / 0.3, 0, 1) : 1);
  } else if (t >= 9.3 && t < 11.6) {
    text = 'SAVORYSAILOR: thoroughly mashed.';
    a = clamp((t - 9.3) / 0.25, 0, 1) * (t > 11.35 ? clamp((11.6 - t) / 0.25, 0, 1) : 1);
  }
  if (!text || a <= 0.01) return;

  const fs = Math.max(15, Math.min(36, S.W * 0.027));
  g.save();
  g.font = `800 ${fs}px system-ui, "Segoe UI", Arial, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const w = g.measureText(text).width;
  const padX = fs * 0.7;
  const padY = fs * 0.5;
  const cx = clamp(S.tx, w / 2 + padX + 8, S.W - w / 2 - padX - 8);
  const cy = Math.max(fs * 2.2, S.ty - S.size * 1.5);

  g.globalAlpha = a;
  const bw = w + padX * 2;
  const bh = fs + padY * 2;
  const r = bh * 0.4;
  g.beginPath();
  g.moveTo(cx - bw / 2 + r, cy - bh / 2);
  g.arcTo(cx + bw / 2, cy - bh / 2, cx + bw / 2, cy + bh / 2, r);
  g.arcTo(cx + bw / 2, cy + bh / 2, cx - bw / 2, cy + bh / 2, r);
  g.arcTo(cx - bw / 2, cy + bh / 2, cx - bw / 2, cy - bh / 2, r);
  g.arcTo(cx - bw / 2, cy - bh / 2, cx + bw / 2, cy - bh / 2, r);
  g.closePath();
  g.fillStyle = 'rgba(24, 12, 34, 0.62)';
  g.fill();
  g.lineWidth = 2;
  g.strokeStyle = 'rgba(255, 110, 199, 0.75)';
  g.stroke();

  g.fillStyle = '#fff3df';
  g.fillText(text, cx, cy + 1);
  g.restore();
}

export function frame(ctx, t, dt) {
  if (!S) return;
  const g = ctx.canvas;
  const W = S.W;
  const H = S.H;

  g.clearRect(0, 0, ctx.width, ctx.height);

  // fire any due sound events
  for (const e of S.events) {
    if (!e.done && t >= e.at) {
      e.done = true;
      try { e.run(); } catch (err) { /* keep the show going */ }
    }
  }

  // shake from recent impacts
  let shake = 0;
  for (const s of S.splats) {
    const age = t - s.at;
    if (age >= 0 && age < 0.9) shake += Math.exp(-age * 9) * 7;
  }
  shake = Math.min(shake, 9);

  g.save();
  if (shake > 0.2) {
    g.translate(Math.sin(t * 71) * shake, Math.cos(t * 59) * shake * 0.7);
  }

  // splats stick to the glass over the live shot
  for (const s of S.splats) drawSplat(g, s, t);
  drawImpacts(g, t);
  drawPotatoes(g, t);
  drawTurkey(g, t);

  g.restore();

  drawCaption(g, t);

  if (!S.done && t >= S.total) {
    S.done = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
