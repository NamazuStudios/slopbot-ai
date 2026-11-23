// Suspended Wiener Forecast — transparent glass over the live broadcast.
// Ten hotdogs drift down from the top of frame. They never land. That is the joke.

export const meta = {
  title: 'Suspended Wiener Forecast',
  author: 'doctordiggitydank',
  prompt: 'For all future slop prompts, ALSO add ten hotdogs that spawn from the top of the scene and slowly fall downward.',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;

let S = null;

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function smooth(a, b, v) {
  const p = clamp((v - a) / (b - a), 0, 1);
  return p * p * (3 - 2 * p);
}

function easeOut(p) {
  return 1 - Math.pow(1 - clamp(p, 0, 1), 3);
}

function drawDog(g, s) {
  const L = s;
  const W = s * 0.42;
  g.lineJoin = 'round';
  g.lineCap = 'round';

  // lower bun
  g.fillStyle = '#e6ab5e';
  g.strokeStyle = '#7d4a19';
  g.lineWidth = s * 0.05;
  g.beginPath();
  g.ellipse(0, W * 0.16, L * 0.5, W * 0.5, 0, 0, TAU);
  g.fill();
  g.stroke();

  // upper bun lobes
  g.fillStyle = '#f4c47c';
  for (let k = -1; k <= 1; k += 2) {
    g.beginPath();
    g.ellipse(k * L * 0.24, -W * 0.04, L * 0.26, W * 0.44, 0, 0, TAU);
    g.fill();
    g.stroke();
  }

  // sausage
  g.fillStyle = '#b5422a';
  g.beginPath();
  g.ellipse(0, -W * 0.14, L * 0.47, W * 0.31, 0, 0, TAU);
  g.fill();
  g.stroke();

  // sausage shine
  g.fillStyle = 'rgba(255,214,170,0.3)';
  g.beginPath();
  g.ellipse(-L * 0.09, -W * 0.26, L * 0.25, W * 0.08, -0.06, 0, TAU);
  g.fill();

  // mustard squiggle
  g.strokeStyle = '#f4d21c';
  g.lineWidth = s * 0.045;
  g.beginPath();
  for (let i = 0; i <= 6; i++) {
    const xx = -L * 0.36 + i * ((L * 0.72) / 6);
    const yy = -W * 0.14 + (i % 2 ? -1 : 1) * W * 0.09;
    if (i === 0) g.moveTo(xx, yy);
    else g.lineTo(xx, yy);
  }
  g.stroke();
}

function makeDogs(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const dogs = [];
  const base = Math.min(W, H);
  for (let i = 0; i < 10; i++) {
    const size = base * (0.105 + ctx.rand() * 0.05);
    dogs.push({
      x: W * (0.06 + ctx.rand() * 0.88),
      y0: -H * (0.14 + ctx.rand() * 0.18),
      delay: 1.0 + i * 0.45,
      speed: H * (0.055 + ctx.rand() * 0.02),
      size,
      rot: (ctx.rand() - 0.5) * 0.5,
      spin: (ctx.rand() - 0.5) * 0.22,
      swayAmp: W * (0.006 + ctx.rand() * 0.016),
      swayFreq: 0.6 + ctx.rand() * 0.8,
      phase: ctx.rand() * TAU,
      fired: false,
    });
  }
  return dogs;
}

export function init(ctx) {
  S = {
    dogs: makeDogs(ctx),
    whooshed: false,
    captionChimed: false,
    finalChimed: false,
    done: false,
  };
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);

  if (!S) init(ctx);

  const fade = 1 - smooth(10.3, 11.4, t);
  g.save();
  g.globalAlpha = fade;

  // ---- sound cues -------------------------------------------------------
  if (!S.whooshed && t > 0.02) {
    S.whooshed = true;
    ctx.sound.noise(0.28);
  }
  for (let i = 0; i < S.dogs.length; i++) {
    const d = S.dogs[i];
    if (!d.fired && t >= d.delay) {
      d.fired = true;
      ctx.sound.beep(680 - i * 32, 0.09);
    }
  }
  if (!S.captionChimed && t > 8.6) {
    S.captionChimed = true;
    ctx.sound.beep(190, 0.16);
  }
  if (!S.finalChimed && t > 10.4) {
    S.finalChimed = true;
    ctx.sound.beep(120, 0.3);
  }

  // ---- the falling wieners ---------------------------------------------
  for (const d of S.dogs) {
    if (t < d.delay) continue;
    const age = t - d.delay;
    const y = d.y0 + d.speed * age;
    if (y > H * 1.25) continue;
    const sway = Math.sin(age * d.swayFreq * TAU * 0.32 + d.phase) * d.swayAmp;
    g.save();
    g.translate(d.x + sway, y);
    g.rotate(d.rot + d.spin * age * 0.35);
    drawDog(g, d.size);
    g.restore();
  }

  // ---- advisory banner -------------------------------------------------
  const bh = Math.max(H * 0.115, 54);
  const drop = easeOut(t / 0.7);
  const bannerY = -bh + drop * (bh + H * 0.02);
  const bw = Math.min(W * 0.86, W - 40);
  const bx = (W - bw) / 2;

  g.save();
  g.translate(bx, bannerY);
  g.fillStyle = 'rgba(14,18,42,0.82)';
  g.strokeStyle = 'rgba(255,84,170,0.9)';
  g.lineWidth = Math.max(2, bh * 0.035);
  const rad = bh * 0.16;
  g.beginPath();
  g.moveTo(rad, 0);
  g.lineTo(bw - rad, 0);
  g.quadraticCurveTo(bw, 0, bw, rad);
  g.lineTo(bw, bh - rad);
  g.quadraticCurveTo(bw, bh, bw - rad, bh);
  g.lineTo(rad, bh);
  g.quadraticCurveTo(0, bh, 0, bh - rad);
  g.lineTo(0, rad);
  g.quadraticCurveTo(0, 0, rad, 0);
  g.closePath();
  g.fill();
  g.stroke();

  // warning dot (slow pulse, well under 3 Hz)
  const pulse = 0.5 + 0.5 * Math.sin(t * TAU * 0.55);
  g.fillStyle = `rgba(255,84,170,${0.35 + pulse * 0.6})`;
  g.beginPath();
  g.arc(bh * 0.42, bh * 0.5, bh * 0.11, 0, TAU);
  g.fill();

  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  g.font = `700 ${Math.round(bh * 0.34)}px system-ui, sans-serif`;
  g.fillText('WEINER WEATHER ADVISORY', bw * 0.52, bh * 0.38);
  g.fillStyle = 'rgba(255,84,170,0.95)';
  g.font = `600 ${Math.round(bh * 0.18)}px system-ui, sans-serif`;
  const subline = t > 9.4 ? 'FORECAST: SUSPENDED' : 'LIGHT WIENER DRIFT · 100% CHANCE OF BUNS';
  g.fillText(subline, bw * 0.52, bh * 0.7);
  g.restore();

  // ---- caption ---------------------------------------------------------
  if (t > 6.0) {
    const capA = smooth(6.0, 6.5, t) * fade;
    g.save();
    g.globalAlpha = capA;
    const line = t > 8.6 ? 'THEY ARE NOT LANDING.' : 'SAVORYSAILOR, HOLD POSITION.';
    g.font = `800 ${Math.round(Math.min(W, H) * 0.045)}px system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const ty = H * 0.86;
    const tw = g.measureText(line).width;
    const padX = Math.min(W, H) * 0.035;
    const padY = Math.min(W, H) * 0.024;
    g.fillStyle = 'rgba(14,18,42,0.78)';
    g.beginPath();
    const rw = tw + padX * 2;
    const rh = Math.min(W, H) * 0.045 + padY * 2;
    const rx = W / 2 - rw / 2;
    const ry = ty - rh / 2;
    const rr = rh * 0.3;
    g.moveTo(rx + rr, ry);
    g.lineTo(rx + rw - rr, ry);
    g.quadraticCurveTo(rx + rw, ry, rx + rw, ry + rr);
    g.lineTo(rx + rw, ry + rh - rr);
    g.quadraticCurveTo(rx + rw, ry + rh, rx + rw - rr, ry + rh);
    g.lineTo(rx + rr, ry + rh);
    g.quadraticCurveTo(rx, ry + rh, rx, ry + rh - rr);
    g.lineTo(rx, ry + rr);
    g.quadraticCurveTo(rx, ry, rx + rr, ry);
    g.closePath();
    g.fill();
    g.fillStyle = '#ffe9f4';
    g.fillText(line, W / 2, ty + 1);
    g.restore();
  }

  g.restore();

  if (!S.done && t > 11.8) {
    S.done = true;
    ctx.done();
  }
}

export function dispose(ctx) {
  S = null;
}
