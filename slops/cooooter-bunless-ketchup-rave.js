// Bunless Ketchup Rave — a forty-second occupation by unhinged sausages.
// Transparent glass over the live stream. Nothing here paints a background.

export const meta = {
  title: 'Bunless Ketchup Rave',
  author: 'cooooter',
  prompt: 'OVER THE COURSE OF 40 SECONDS UNBUNNED HOTDAWGS WITH WHITE KETCHUP FILL THE ENTIRE SCREEN AND BEGIN DANCING IN ALL DIRECTIONS.',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;

let S = null;

/* ---------------------------------------------------------------- helpers */

function smooth01(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x * x * (3 - 2 * x);
}

function capsulePath(g, L, T) {
  const r = T / 2;
  const half = L / 2 - r;
  g.beginPath();
  g.moveTo(-half, -r);
  g.lineTo(half, -r);
  g.arc(half, 0, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(-half, r);
  g.arc(-half, 0, r, Math.PI / 2, Math.PI * 1.5);
  g.closePath();
}

function drawKetchupBand(g, L, T, d) {
  g.strokeStyle = '#fdfbf2';
  g.lineWidth = T * 0.155;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  const steps = 26;
  for (let i = 0; i <= steps; i++) {
    const x = -L * 0.4 + (L * 0.8) * (i / steps);
    const y = -T * 0.1 + Math.sin((x / L) * Math.PI * 5.4 + d.dripSeed) * T * 0.17;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
}

function drawDrips(g, L, T, t, d) {
  g.fillStyle = '#fdfbf2';
  g.strokeStyle = '#fdfbf2';
  g.lineCap = 'round';
  const growth = smooth01((t - d.arrive - 1.2) / 3.5);
  if (growth <= 0) return;
  for (let i = 0; i < 3; i++) {
    const bx = -L * 0.26 + i * L * 0.26;
    const len =
      (0.3 + 0.75 * Math.abs(Math.sin(d.dripSeed + i * 2.1))) *
      T *
      (0.45 + 0.85 * growth) *
      (1 + 0.12 * Math.sin(t * 2.2 + i * 1.7));
    const w = T * 0.115;
    const y0 = T * 0.02;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(bx, y0);
    g.quadraticCurveTo(bx + w * 0.7, y0 + len * 0.6, bx, y0 + len);
    g.stroke();
    g.beginPath();
    g.arc(bx, y0 + len, w * 0.92, 0, TAU);
    g.fill();
  }
}

function drawFace(g, kind, L, T, t, dist) {
  const ex = L * 0.16;
  const ey = -T * 0.03;
  const eyeR = T * 0.085;
  g.fillStyle = '#21120b';
  g.strokeStyle = '#21120b';
  g.lineWidth = T * 0.055;
  g.lineCap = 'round';

  if (kind === 7) {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * ex - eyeR, ey - eyeR);
      g.lineTo(s * ex + eyeR, ey + eyeR);
      g.moveTo(s * ex + eyeR, ey - eyeR);
      g.lineTo(s * ex - eyeR, ey + eyeR);
      g.stroke();
    }
  } else if (kind === 4) {
    g.beginPath();
    g.arc(-ex, ey, eyeR, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(ex - eyeR, ey);
    g.lineTo(ex + eyeR, ey);
    g.stroke();
  } else if (kind === 0) {
    g.beginPath();
    g.arc(-ex, ey, eyeR * 0.8, 0, TAU);
    g.arc(ex, ey, eyeR * 0.8, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(-ex - eyeR * 1.6, ey - eyeR * 0.55);
    g.lineTo(-ex + eyeR * 1.6, ey - eyeR * 1.15);
    g.moveTo(ex + eyeR * 1.6, ey - eyeR * 0.55);
    g.lineTo(ex - eyeR * 1.6, ey - eyeR * 1.15);
    g.stroke();
  } else if (kind === 3) {
    g.beginPath();
    g.arc(-ex, ey, eyeR * 0.55, 0, TAU);
    g.arc(ex, ey, eyeR * 0.55, 0, TAU);
    g.fill();
  } else if (kind === 5) {
    g.beginPath();
    g.arc(-ex, ey + eyeR * 0.3, eyeR * 0.8, 0, TAU);
    g.arc(ex, ey + eyeR * 0.3, eyeR * 0.8, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(-ex - eyeR * 1.45, ey - eyeR * 1.45);
    g.lineTo(-ex + eyeR * 1.15, ey - eyeR * 0.25);
    g.moveTo(ex + eyeR * 1.45, ey - eyeR * 1.45);
    g.lineTo(ex - eyeR * 1.15, ey - eyeR * 0.25);
    g.stroke();
  } else if (kind === 1) {
    g.beginPath();
    g.arc(-ex, ey, eyeR * 0.85, 0, TAU);
    g.arc(ex, ey, eyeR * 0.85, 0, TAU);
    g.fill();
    g.beginPath();
    g.moveTo(-ex - eyeR * 1.35, ey - eyeR * 2.0);
    g.lineTo(-ex + eyeR * 1.0, ey - eyeR * 1.4);
    g.moveTo(ex + eyeR * 1.35, ey - eyeR * 2.0);
    g.lineTo(ex - eyeR * 1.0, ey - eyeR * 1.4);
    g.stroke();
  } else {
    const rr = kind === 2 ? eyeR * 1.45 : eyeR * 1.2;
    g.beginPath();
    g.arc(-ex, ey, rr, 0, TAU);
    g.arc(ex, ey, rr, 0, TAU);
    g.fill();
    g.fillStyle = '#fdfbf2';
    g.beginPath();
    g.arc(-ex + rr * 0.3, ey - rr * 0.32, rr * 0.3, 0, TAU);
    g.arc(ex + rr * 0.3, ey - rr * 0.32, rr * 0.3, 0, TAU);
    g.fill();
    g.fillStyle = '#21120b';
  }

  const my = ey + T * 0.15;
  g.lineWidth = T * 0.06;
  if (kind === 2) {
    g.beginPath();
    g.ellipse(0, my + T * 0.05, T * 0.13, T * 0.17, 0, 0, TAU);
    g.fill();
  } else if (kind === 6) {
    g.beginPath();
    g.arc(0, my - T * 0.04, T * 0.165, 0.12 * Math.PI, 0.88 * Math.PI);
    g.stroke();
  } else if (kind === 1) {
    g.beginPath();
    for (let i = 0; i <= 8; i++) {
      const x = -T * 0.16 + T * 0.32 * (i / 8);
      const y = my + Math.sin(i * 1.5 + t * 6) * T * 0.03;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.stroke();
  } else if (kind === 5) {
    g.beginPath();
    g.moveTo(-T * 0.14, my + T * 0.04);
    g.quadraticCurveTo(0, my - T * 0.08, T * 0.14, my + T * 0.04);
    g.stroke();
  } else if (kind === 3) {
    g.beginPath();
    g.moveTo(-T * 0.12, my);
    g.lineTo(T * 0.12, my);
    g.stroke();
  } else if (kind === 4) {
    g.beginPath();
    g.arc(T * 0.04, my - T * 0.02, T * 0.11, -0.15 * Math.PI, 0.6 * Math.PI);
    g.stroke();
  } else if (kind === 7) {
    g.beginPath();
    g.ellipse(0, my, T * 0.09, T * 0.06, 0, 0, TAU);
    g.stroke();
  } else {
    g.beginPath();
    g.moveTo(-T * 0.12, my);
    g.quadraticCurveTo(T * 0.02, my + T * 0.1, T * 0.14, my - T * 0.03);
    g.stroke();
  }

  if (dist > 0) {
    g.fillStyle = 'rgba(190,235,255,0.85)';
    for (const s of [-1, 1]) {
      const bx = s * (L * 0.24);
      const by = -T * 0.42 + Math.sin(t * 5 + s) * T * 0.05;
      g.beginPath();
      g.moveTo(bx, by);
      g.quadraticCurveTo(bx + T * 0.06, by + T * 0.09, bx, by + T * 0.14);
      g.quadraticCurveTo(bx - T * 0.06, by + T * 0.09, bx, by);
      g.fill();
    }
  }
}

function drawDog(ctx, d, t, px, py, rot, scale, alpha, dance, alarm, grin) {
  const g = ctx.canvas;
  const L = d.size * scale;
  const T = L * 0.34;
  if (alpha <= 0.01) return;

  g.save();
  g.globalAlpha = alpha;

  // soft grounding shadow — translucent, not paint
  g.save();
  g.translate(px, py + L * 0.09);
  g.rotate(rot);
  g.fillStyle = 'rgba(12,7,18,0.26)';
  g.beginPath();
  g.ellipse(0, L * 0.26, L * 0.48, L * 0.11, 0, 0, TAU);
  g.fill();
  g.restore();

  g.translate(px, py);
  g.rotate(rot);

  capsulePath(g, L, T);
  const grad = g.createLinearGradient(0, -T * 0.5, 0, T * 0.5);
  grad.addColorStop(0, '#e5794c');
  grad.addColorStop(0.45, '#c25a33');
  grad.addColorStop(1, '#8b381d');
  g.fillStyle = grad;
  g.fill();
  g.lineWidth = Math.max(2, T * 0.07);
  g.strokeStyle = '#5c2211';
  g.stroke();

  g.save();
  capsulePath(g, L, T);
  g.clip();

  g.strokeStyle = 'rgba(70,25,12,0.5)';
  g.lineWidth = T * 0.09;
  for (let i = -1; i <= 1; i++) {
    const bx = i * L * 0.23;
    g.beginPath();
    g.moveTo(bx - T * 0.17, -T);
    g.lineTo(bx + T * 0.17, T);
    g.stroke();
  }

  g.fillStyle = 'rgba(255,222,192,0.16)';
  g.beginPath();
  g.ellipse(0, -T * 0.29, L * 0.29, T * 0.065, 0, 0, TAU);
  g.fill();

  drawKetchupBand(g, L, T, d);
  g.restore();

  drawDrips(g, L, T, t, d);

  const kind = grin ? (d.ex % 2 === 0 ? 6 : 2) : d.ex;
  drawFace(g, kind, L, T, t, alarm);

  g.restore();
}

function drawSplat(ctx, x, y, r) {
  const g = ctx.canvas;
  g.save();
  g.fillStyle = '#fdfbf2';
  g.beginPath();
  const lobes = 9;
  for (let i = 0; i <= lobes; i++) {
    const a = (i / lobes) * TAU;
    const rr = r * (0.72 + 0.28 * Math.abs(Math.sin(i * 2.3 + 1.1)));
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();
  g.beginPath();
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU + 0.21;
    const dist = r * (1.05 + (i % 4) * 0.14);
    const rr = r * (0.06 + (i % 3) * 0.035);
    g.moveTo(x + Math.cos(a) * dist + rr, y + Math.sin(a) * dist);
    g.arc(x + Math.cos(a) * dist, y + Math.sin(a) * dist, rr, 0, TAU);
  }
  g.fill();
  g.restore();
}

/* ------------------------------------------------------------------- init */

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const R = ctx.rand;

  const cols = W > H ? 7 : 5;
  const rows = W > H ? 4 : 6;
  const cellW = W / cols;
  const cellH = H / rows;
  const base = Math.min(cellW, cellH) * 1.3;

  const dogs = [];
  let idx = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = cellW * (c + 0.5) + (R() - 0.5) * cellW * 0.32;
      const y = cellH * (r + 0.5) + (R() - 0.5) * cellH * 0.32;
      const ang = R() * TAU;
      const dist = Math.max(W, H) * (0.75 + R() * 0.6);
      dogs.push({
        x,
        y,
        sx: x + Math.cos(ang) * dist,
        sy: y + Math.sin(ang) * dist,
        size: base * (0.78 + R() * 0.5),
        rot: (R() - 0.5) * 0.7,
        rotDir: R() < 0.5 ? -1 : 1,
        phase: R() * TAU,
        beat: 0.75 + R() * 0.9,
        amp: 12 + R() * 26,
        ex: Math.floor(R() * 8),
        arrive: 1.5 + idx * 0.92 + R() * 0.35,
        dripSeed: R() * 100,
      });
      idx++;
    }
  }

  const events = [];
  events.push({ t: 1.4, kind: 'noise', a: 0.16 });
  for (let i = 0; i < 26; i++) {
    const tt = 5.5 + i * 1.05;
    if (tt > 33) break;
    events.push({ t: tt, kind: 'beep', a: i % 2 === 0 ? 98 : 146, b: 70 });
    if (i % 4 === 2) events.push({ t: tt + 0.5, kind: 'beep', a: 392, b: 40 });
  }
  events.push({ t: 33.9, kind: 'noise', a: 0.1 });
  events.push({ t: 36.3, kind: 'noise', a: 0.42 });
  events.push({ t: 36.32, kind: 'beep', a: 58, b: 320 });

  S = {
    dogs,
    drops: [],
    events,
    evIdx: 0,
    splatAt: 36.3,
    finished: false,
    W,
    H,
  };
}

/* ------------------------------------------------------------------ frame */

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);
  if (!S) return;

  const R = ctx.rand;
  const streamer = ctx.streamer || null;
  const energy = smooth01((t - 4) / 17);
  const freeze = t > 34 && t < 34.95;
  const grin = t >= 34.95;
  const splat = t >= S.splatAt;
  const alarm = smooth01((t - 33.4) / 1.2);

  // scheduled sounds
  while (S.evIdx < S.events.length && t >= S.events[S.evIdx].t) {
    const e = S.events[S.evIdx++];
    if (e.kind === 'noise') ctx.sound.noise(e.a * 1000);
    else ctx.sound.beep(e.a, e.b);
  }

  // ambient white-ketchup droplets
  if (t > 6 && t < 38.5) {
    const want = (dt || 0.016) * 26 * (0.4 + energy);
    if (R() < want && S.drops.length < 150) {
      const dx = R() * W;
      const dy = -30 - R() * 40;
      let skip = false;
      if (streamer) {
        const sx = streamer.x * W;
        const sy = streamer.y * H;
        const sw = streamer.w * W;
        const sh = streamer.h * H;
        if (dx > sx && dx < sx + sw && dy < sy + sh * 0.7 && R() < 0.85) skip = true;
      }
      if (!skip) {
        S.drops.push({
          x: dx,
          y: dy,
          vy: 130 + R() * 330,
          r: 4 + R() * 12,
          wob: R() * TAU,
        });
      }
    }
  }

  // draw the sausages
  for (const d of S.dogs) {
    const ap = smooth01((t - d.arrive) / 1.7);
    if (ap <= 0) continue;
    const dance = smooth01((t - d.arrive - 1.3) / 1.2);
    const px0 = d.sx + (d.x - d.sx) * ap;
    const py0 = d.sy + (d.y - d.sy) * ap;

    let move = dance * (0.35 + energy);
    if (freeze) move *= 0.05;
    else if (grin) move *= 0.35;

    const wob = Math.sin(t * d.beat + d.phase);
    const wob2 = Math.sin(t * d.beat * 1.33 + d.phase * 1.7);
    let dx = Math.cos(t * d.beat + d.phase) * d.amp * move;
    let dy = wob2 * d.amp * 0.85 * move;
    let rot = d.rot + d.rotDir * wob * 0.34 * move;

    if (freeze) {
      dx += Math.sin(t * 47 + d.phase) * 2.2;
      dy += Math.cos(t * 41 + d.phase) * 2.2;
    }

    let scale = 1;
    if (grin) scale = 1.06;
    if (freeze) scale = 1 + 0.03 * alarm;

    drawDog(ctx, d, t, px0 + dx, py0 + dy, rot, scale, ap, dance, alarm, grin);
  }

  // falling ketchup
  for (let i = S.drops.length - 1; i >= 0; i--) {
    const p = S.drops[i];
    p.y += p.vy * dt;
    p.x += Math.sin(t * 2 + p.wob) * 22 * dt;
    if (p.y > H + 40) {
      S.drops.splice(i, 1);
      continue;
    }
    g.fillStyle = 'rgba(253,251,242,0.92)';
    g.beginPath();
    g.ellipse(p.x, p.y, p.r * 0.62, p.r, 0, 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(p.x, p.y - p.r * 0.5, p.r * 0.24, p.r * 0.5, 0, 0, TAU);
    g.fill();
  }

  // the punchline splat, aimed low on the live shot so faces stay clear
  if (splat) {
    const k = smooth01((t - S.splatAt) / 0.55);
    let cx = W * 0.5;
    let cy = H * 0.72;
    if (streamer) {
      cx = (streamer.x + streamer.w * 0.5) * W;
      cy = (streamer.y + streamer.h * 0.82) * H;
    }
    drawSplat(ctx, cx, cy, Math.min(W, H) * 0.34 * k);
    if (k > 0.7) {
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * TAU + 0.3;
        const rr = Math.min(W, H) * 0.34 * (1.1 + (i % 3) * 0.2);
        g.fillStyle = 'rgba(253,251,242,0.9)';
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 8 + (i % 4) * 6, 5 + (i % 3) * 5, a, 0, TAU);
        g.fill();
      }
    }
  }

  // caption over the live footage
  if (t > 34.4 && t < 39.4) {
    const pop = smooth01((t - 34.4) / 0.35);
    const words = grin
      ? 'SAVORYSAILOR — YOUR BUNLESS ARMY HAS ARRIVED'
      : 'SAVORYSAILOR... DO NOT LOOK AWAY';
    g.save();
    g.globalAlpha = 0.92 * pop;
    const fs = Math.max(20, Math.min(W * 0.036, 58));
    g.font = 'bold ' + fs + 'px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const cx = W * 0.5;
    const cy = H * 0.93;
    const tw = g.measureText(words).width;
    g.fillStyle = 'rgba(16,10,24,0.55)';
    const bw = tw + fs * 1.4;
    const bh = fs * 1.5;
    const rad = bh * 0.5;
    g.beginPath();
    g.moveTo(cx - bw / 2 + rad, cy - bh / 2);
    g.lineTo(cx + bw / 2 - rad, cy - bh / 2);
    g.quadraticCurveTo(cx + bw / 2, cy - bh / 2, cx + bw / 2, cy - bh / 2 + rad);
    g.lineTo(cx + bw / 2, cy + bh / 2 - rad);
    g.quadraticCurveTo(cx + bw / 2, cy + bh / 2, cx + bw / 2 - rad, cy + bh / 2);
    g.lineTo(cx - bw / 2 + rad, cy + bh / 2);
    g.quadraticCurveTo(cx - bw / 2, cy + bh / 2, cx - bw / 2, cy + bh / 2 - rad);
    g.lineTo(cx - bw / 2, cy - bh / 2 + rad);
    g.quadraticCurveTo(cx - bw / 2, cy - bh / 2, cx - bw / 2 + rad, cy - bh / 2);
    g.closePath();
    g.fill();
    g.fillStyle = '#fdfbf2';
    g.fillText(words, cx, cy);
    g.restore();
  }

  if (t >= 39.6 && !S.finished) {
    S.finished = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
