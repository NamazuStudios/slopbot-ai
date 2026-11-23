// Got Milk Bandit — a slop about a very censored man with a squirt bottle.
// Transparent glass: every frame is cleared, the live stream is never painted over.
// Edit: chest bar removed, groin bar is now a tall vertical slab, milk drips twice
// as far, and the bandit leaps on every DIGGITY.

export const meta = {
  title: 'Got Milk Bandit',
  author: 'absurdsage',
  prompt: 'update got-milk-bandit to remove the top censor bar over the naked man, make the lower censor bar a vertical rectangle reaching below the knees, the milk drips across half the height of the screen when dripping, and the male jumps in the air when saying diggity',
  createdAt: '2026-11-23T12:05:00.000Z',
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);

const SHOUTS = [9.45, 9.85, 10.22, 10.56, 10.88];

let S = null;

function rr(c, x, y, w, h, r) {
  const k = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.lineTo(x + w - k, y);
  c.quadraticCurveTo(x + w, y, x + w, y + k);
  c.lineTo(x + w, y + h - k);
  c.quadraticCurveTo(x + w, y + h, x + w - k, y + h);
  c.lineTo(x + k, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - k);
  c.lineTo(x, y + k);
  c.quadraticCurveTo(x, y, x + k, y);
  c.closePath();
}

function jumpAt(t) {
  // one clean hop per DIGGITY, overlapping arcs, in world units
  let h = 0;
  for (let i = 0; i < SHOUTS.length; i++) {
    const p = (t - (SHOUTS[i] - 0.1)) / 0.6;
    if (p > 0 && p < 1) h = Math.max(h, Math.sin(p * Math.PI) * 52);
  }
  return h;
}

export function init(ctx) {
  S = {
    particles: [],
    splats: [],
    noiseAcc: 0,
    shoutIdx: 0,
    entered: false,
    exited: false,
    ended: false,
    lastT: 0,
  };
}

function guyState(ctx, t) {
  const W = ctx.width;
  const H = ctx.height;
  const u = Math.min(W, H) / 800;
  const groundY = H * 0.87;
  const cx = W * 0.5;
  let x = -W * 0.2;
  let dir = 1;
  let spraying = false;

  if (t < 0.9) {
    const p = clamp(t / 0.9, 0, 1);
    x = lerp(-W * 0.14, cx, easeOut(p));
    spraying = t > 0.3;
  } else if (t < 5.2) {
    const ph = (t - 0.9) * (Math.PI / 0.85);
    x = cx + Math.sin(ph) * W * 0.26;
    dir = Math.cos(ph) >= 0 ? 1 : -1;
    spraying = true;
  } else if (t < 7.2) {
    const ph = (5.2 - 0.9) * (Math.PI / 0.85);
    const startX = cx + Math.sin(ph) * W * 0.26;
    const p = easeOut(clamp((t - 5.2) / 0.55, 0, 1));
    x = lerp(startX, cx, p);
    dir = 1;
    spraying = true;
  } else if (t < 9.4) {
    const ph = (t - 7.2) * (Math.PI / 0.62);
    x = cx + Math.sin(ph) * W * 0.24;
    dir = Math.cos(ph) >= 0 ? 1 : -1;
    spraying = true;
  } else if (t < 11.2) {
    x = cx + Math.sin((t - 9.4) * 9) * W * 0.025;
    dir = 1;
    spraying = false;
  } else if (t < 13.5) {
    const p = clamp((t - 11.2) / 2.3, 0, 1);
    x = lerp(cx, W * 1.25, p * p * 0.85 + p * 0.15);
    dir = 1;
    spraying = p > 0.08;
  } else {
    x = W * 1.3;
    dir = 1;
    spraying = false;
  }

  const scale = u * 0.95 * (1 + Math.sin(t * 13) * 0.012);
  const jumpPx = jumpAt(t) * u;
  return { x, groundY, dir, scale, spraying, u, jumpPx };
}

function drawGuy(ctx, g, t) {
  const c = ctx.canvas;
  const run = Math.sin(t * 17);
  const shout = t > 9.3 && t < 11.1;

  // shadow stays on the floor and shrinks as he hops
  const lift = clamp(1 - g.jumpPx / (38 * g.u), 0.35, 1);
  c.save();
  c.fillStyle = `rgba(6, 8, 14, ${0.3 * lift})`;
  c.beginPath();
  c.ellipse(g.x, g.groundY + 4, 46 * g.scale * lift, 9 * g.scale * lift, 0, 0, TAU);
  c.fill();
  c.restore();

  c.save();
  c.translate(g.x, g.groundY - g.jumpPx);
  c.scale(g.scale * g.dir, g.scale);

  c.lineCap = 'round';

  // legs
  c.strokeStyle = '#e9d2b4';
  c.lineWidth = 13;
  c.beginPath();
  c.moveTo(-6, -54);
  c.lineTo(-8 + run * 16, -3);
  c.stroke();
  c.beginPath();
  c.moveTo(7, -54);
  c.lineTo(8 - run * 16, -3);
  c.stroke();

  // torso — top censor bar removed, the live stream may witness a sternum
  c.fillStyle = '#e9d2b4';
  rr(c, -19, -106, 38, 58, 17);
  c.fill();
  c.strokeStyle = 'rgba(196, 160, 126, 0.9)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-1, -99);
  c.lineTo(-1, -78);
  c.stroke();

  // the lower censor bar is now a vertical slab reaching below the knees
  c.fillStyle = '#141821';
  rr(c, -16, -74, 32, 74, 6);
  c.fill();
  c.save();
  c.translate(0, -34);
  c.rotate(Math.PI / 2);
  c.fillStyle = '#f6f3ea';
  c.font = 'bold 10px Arial, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('CENSORED', 0, 0);
  c.restore();

  // arms
  c.strokeStyle = '#e9d2b4';
  c.lineWidth = 10;
  c.beginPath();
  c.moveTo(-14, -97);
  c.lineTo(-24 - run * 7, -70);
  c.stroke();
  c.beginPath();
  c.moveTo(14, -97);
  c.lineTo(40, -86);
  c.stroke();

  // milk bottle
  c.save();
  c.translate(46, -90);
  c.rotate(-0.55 + Math.sin(t * 9) * 0.06);
  c.fillStyle = '#f7f4ea';
  rr(c, -9, -20, 18, 34, 5);
  c.fill();
  c.fillStyle = '#dfe6ef';
  c.fillRect(-7, -22, 14, 5);
  c.fillStyle = '#5b6b7d';
  c.fillRect(-8, -6, 16, 4);
  c.restore();

  // head
  c.fillStyle = '#e9d2b4';
  c.beginPath();
  c.arc(0, -124, 17, 0, TAU);
  c.fill();

  // dark grey mohawk
  c.fillStyle = '#3a3f47';
  for (let i = -3; i <= 3; i++) {
    const h = 16 - Math.abs(i) * 2.5;
    c.beginPath();
    c.moveTo(i * 5.2 - 3.5, -137);
    c.lineTo(i * 5.2, -137 - h);
    c.lineTo(i * 5.2 + 3.5, -137);
    c.closePath();
    c.fill();
  }

  // face
  c.fillStyle = '#1b1f27';
  c.beginPath();
  c.arc(7, -127, 2.3, 0, TAU);
  c.fill();
  c.beginPath();
  c.arc(-1, -127, 2.3, 0, TAU);
  c.fill();

  c.beginPath();
  c.ellipse(4, -115, 6, shout ? 7 : 3.2, 0, 0, TAU);
  c.fill();

  c.restore();

  // muzzle position in world space
  return {
    x: g.x + g.dir * g.scale * 64,
    y: g.groundY - g.jumpPx - g.scale * 104,
  };
}

function spawnSpray(ctx, m, g) {
  const u = g.u;
  const n = 3;
  for (let i = 0; i < n; i++) {
    const spread = (Math.random() - 0.5) * 1.1;
    const speed = (150 + Math.random() * 210) * u;
    S.particles.push({
      x: m.x,
      y: m.y,
      vx: Math.cos(spread) * speed * g.dir,
      vy: Math.sin(spread) * speed - (110 + Math.random() * 120) * u,
      r: (2 + Math.random() * 4) * u,
      life: 0,
    });
    if (S.particles.length > 260) S.particles.shift();
  }
}

function stepParticles(ctx, t, dt) {
  const c = ctx.canvas;
  const H = ctx.height;
  const u = Math.min(ctx.width, H) / 800;
  const floor = H * 0.93;
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const p = S.particles[i];
    p.life += dt;
    p.vy += 900 * u * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y > floor || p.x < -40 || p.x > ctx.width + 40 || p.life > 3) {
      if (p.y > floor - 2 || p.life > 0.5) {
        S.splats.push({
          x: clamp(p.x, 0, ctx.width),
          y: clamp(p.y, 0, H * 0.94),
          r: p.r * (1.3 + Math.random() * 1.4),
          born: t,
          wob: Math.random() * TAU,
        });
        if (S.splats.length > 110) S.splats.shift();
      }
      S.particles.splice(i, 1);
      continue;
    }
    c.fillStyle = 'rgba(248, 246, 238, 0.9)';
    c.beginPath();
    c.arc(p.x, p.y, p.r, 0, TAU);
    c.fill();
  }
}

function drawSplats(ctx, t) {
  const c = ctx.canvas;
  const H = ctx.height;
  const u = Math.min(ctx.width, H) / 800;
  for (const sp of S.splats) {
    const age = t - sp.born;
    if (age < 0) continue;
    const grow = clamp(age * 7, 0, 1);
    const r = sp.r * grow;
    c.fillStyle = 'rgba(247, 245, 237, 0.62)';
    c.beginPath();
    c.ellipse(sp.x, sp.y, r * 1.25, r * 0.85, sp.wob, 0, TAU);
    c.fill();
    c.beginPath();
    c.arc(sp.x + r * 0.7, sp.y + r * 0.4, r * 0.5, 0, TAU);
    c.fill();

    // the drip down the glass — now allowed to run half the screen
    const len = Math.min(age * 46 * u, H * 0.5);
    if (len > 1) {
      const sway = Math.sin(t * 2 + sp.wob) * 2.5 * u;
      c.strokeStyle = 'rgba(247, 245, 237, 0.55)';
      c.lineWidth = Math.max(1.5, r * 0.5);
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(sp.x, sp.y);
      c.quadraticCurveTo(sp.x + sway, sp.y + len * 0.55, sp.x + sway * 0.4, sp.y + len);
      c.stroke();

      c.fillStyle = 'rgba(247, 245, 237, 0.72)';
      c.beginPath();
      c.arc(sp.x + sway * 0.4, sp.y + len, Math.max(2, r * 0.6), 0, TAU);
      c.fill();
    }
  }
}

function drawGotMilk(ctx, t) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const p = clamp((t - 5.15) / 0.4, 0, 1);
  if (p <= 0) return;
  const fade = t > 13.6 ? clamp(1 - (t - 13.6) / 0.9, 0, 1) : 1;
  if (fade <= 0) return;

  const fs = Math.min(W * 0.2, H * 0.24);
  const scale = 0.65 + easeOut(p) * 0.42 + Math.sin(clamp((t - 5.15) / 0.5, 0, 1) * Math.PI) * 0.06;
  const wob = Math.sin(t * 2.2) * 0.035;
  const x = W * 0.5;
  const y = H * 0.29;

  c.save();
  c.globalAlpha = fade;
  c.translate(x, y);
  c.rotate(wob);
  c.scale(scale, scale);
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `900 ${fs}px Impact, "Arial Black", "Helvetica Neue", sans-serif`;

  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(10, 14, 22, 0.9)';
  c.lineWidth = fs * 0.11;
  c.strokeText('got milk?', 0, 0);
  c.fillStyle = '#fbfaf4';
  c.fillText('got milk?', 0, 0);

  // milk hanging off the letters
  const half = fs * 2.35;
  const spots = [-0.82, -0.44, -0.05, 0.35, 0.74];
  c.strokeStyle = 'rgba(251, 250, 244, 0.85)';
  c.fillStyle = 'rgba(251, 250, 244, 0.9)';
  c.lineCap = 'round';
  for (let i = 0; i < spots.length; i++) {
    const lx = spots[i] * half;
    const grow = clamp((t - 5.5 - i * 0.18) * 5, 0, 1);
    const len = (fs * 0.3 + Math.sin(t * 1.6 + i) * fs * 0.06) * grow;
    if (len <= 0) continue;
    c.lineWidth = fs * 0.028;
    c.beginPath();
    c.moveTo(lx, fs * 0.34);
    c.quadraticCurveTo(lx + 3, fs * 0.34 + len * 0.6, lx, fs * 0.34 + len);
    c.stroke();
    c.beginPath();
    c.arc(lx, fs * 0.34 + len, fs * 0.036, 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawShouts(ctx, t) {
  const c = ctx.canvas;
  for (let i = 0; i < SHOUTS.length; i++) {
    const start = SHOUTS[i];
    const a = clamp((t - start) / 0.12, 0, 1) * clamp(1 - (t - start - 0.42) / 0.25, 0, 1);
    if (a <= 0) continue;
    const g = guyState(ctx, t);
    const size = (26 + i * 7) * g.u;
    const bx = g.x - g.dir * (30 + i * 8) * g.u;
    const by = g.groundY - g.jumpPx - (170 + i * 16) * g.u;
    c.save();
    c.globalAlpha = a;
    c.translate(bx, by);
    c.rotate((i % 2 ? 1 : -1) * (0.08 + i * 0.02));
    c.scale(0.8 + a * 0.3, 0.8 + a * 0.3);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `900 ${size}px Impact, "Arial Black", sans-serif`;
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(9, 12, 20, 0.92)';
    c.lineWidth = size * 0.19;
    c.strokeText('DIGGITY!', 0, 0);
    c.fillStyle = i % 2 ? '#ffd76e' : '#ffffff';
    c.fillText('DIGGITY!', 0, 0);
    c.restore();
  }
}

function drawCaption(ctx, t, text, yFrac, alpha) {
  if (alpha <= 0) return;
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const fs = Math.min(W * 0.036, H * 0.045);
  const x = W * 0.5;
  const y = H * yFrac;
  c.save();
  c.globalAlpha = alpha;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.font = `800 ${fs}px "Arial Black", Arial, sans-serif`;
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(8, 11, 19, 0.9)';
  c.lineWidth = fs * 0.3;
  c.strokeText(text, x, y);
  c.fillStyle = '#fdfcf6';
  c.fillText(text, x, y);
  c.restore();
  void t;
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  c.clearRect(0, 0, ctx.width, ctx.height);

  const d = Math.min(dt || 0.016, 0.1);
  S.lastT = t;

  const g = guyState(ctx, t);

  // sounds
  if (!S.entered && t > 0.02) {
    ctx.sound.noise(120);
    S.entered = true;
  }
  if (g.spraying) {
    S.noiseAcc += d;
    if (S.noiseAcc > 0.24) {
      ctx.sound.noise(70);
      S.noiseAcc = 0;
    }
  }
  while (S.shoutIdx < SHOUTS.length && t >= SHOUTS[S.shoutIdx]) {
    ctx.sound.beep(430 + S.shoutIdx * 80, 130);
    ctx.sound.noise(60);
    S.shoutIdx++;
  }
  if (!S.exited && t > 11.2) {
    ctx.sound.noise(180);
    S.exited = true;
  }
  if (t > 5.12 && t < 5.12 + d) ctx.sound.beep(660, 180);

  // the cartoon intruder, clearly not the streamer, clearly censored below the belt
  const m = drawGuy(ctx, g, t);
  if (g.spraying && t < 13.2) spawnSpray(ctx, m, g);
  stepParticles(ctx, t, d);

  drawGotMilk(ctx, t);
  drawSplats(ctx, t);
  drawShouts(ctx, t);

  const capA = clamp((t - 0.55) / 0.3, 0, 1) * clamp(1 - (t - 4.6) / 0.35, 0, 1);
  drawCaption(ctx, t, 'SAVORYSAILOR, WE HAVE A SITUATION.', 0.93, capA * 0.95);

  const capB = clamp((t - 5.9) / 0.3, 0, 1) * clamp(1 - (t - 9.2) / 0.4, 0, 1);
  drawCaption(ctx, t, 'SORRY, SAVORYSAILOR.', 0.93, capB * 0.95);

  const capC = clamp((t - 13.7) / 0.4, 0, 1) * clamp(1 - (t - 14.9) / 0.3, 0, 1);
  drawCaption(ctx, t, 'SOMEONE CLEAN THE LENS.', 0.93, capC * 0.9);

  if (!S.ended && t > 15.1) {
    S.ended = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
