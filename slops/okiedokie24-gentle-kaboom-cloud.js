export const meta = {
  title: 'Gentle Kaboom Cloud',
  author: 'okiedokie24',
  prompt: 'when a user types !kaboom in chat, bursts a soft cloud of gray-and-white smoke from the bottom of the screen',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!kaboom"] },
  ],
};

let state = null;

const BURSTS = [
  { at: 0.00, intensity: 1.05 },
  { at: 0.65, intensity: 0.85 },
  { at: 1.55, intensity: 1.10 },
  { at: 2.80, intensity: 1.35 },
  { at: 4.20, intensity: 1.60 },
  { at: 5.55, intensity: 1.00 },
];

function easeOut(x) {
  return 1 - Math.pow(1 - x, 2.2);
}

function spawnBurst(ctx, intensity) {
  const w = ctx.width;
  const h = ctx.height;
  const originX = w * (0.22 + ctx.rand() * 0.56);
  const count = Math.round(22 * intensity) + 6;

  state.shocks.push({
    x: originX,
    y: h * 0.995,
    age: 0,
    life: 1.15 + ctx.rand() * 0.35,
    width: w * (0.16 + ctx.rand() * 0.08) * intensity,
  });

  for (let i = 0; i < count; i++) {
    const spread = w * (0.05 + Math.pow(ctx.rand(), 0.7) * 0.30) * intensity;
    const x = originX + (ctx.rand() - 0.5) * spread;
    const y = h + h * (0.005 + ctx.rand() * 0.03);
    const life = 2.4 + ctx.rand() * 1.4 + intensity * 0.25;
    const shade = ctx.rand();
    const value = Math.round(128 + shade * 104 + intensity * 8);
    state.puffs.push({
      x,
      y,
      vx: (ctx.rand() - 0.5) * w * 0.035,
      vy: -(h * (0.045 + ctx.rand() * 0.105)) * (0.75 + intensity * 0.2),
      r0: h * (0.022 + ctx.rand() * 0.030) * (0.9 + intensity * 0.12),
      r1: h * (0.105 + ctx.rand() * 0.105) * (0.9 + intensity * 0.14),
      age: 0,
      life,
      value: Math.min(248, value),
      alpha: 0.075 + ctx.rand() * 0.075,
      wobbleAmp: w * (0.004 + ctx.rand() * 0.014),
      wobbleFreq: 0.35 + ctx.rand() * 0.85,
      phase: ctx.rand() * Math.PI * 2,
      drift: (ctx.rand() - 0.5) * 0.5,
    });
  }
}

export function init(ctx) {
  state = {
    puffs: [],
    shocks: [],
    nextBurst: 0,
    started: 0,
    ended: false,
    captionSeed: 0,
  };
  // Pre-burn the RNG so each play starts from a different little weather system.
  for (let i = 0; i < 12; i++) ctx.rand();
}

export function frame(ctx, t, dt) {
  const w = ctx.width;
  const h = ctx.height;
  ctx.canvas.clearRect(0, 0, w, h);

  if (!state) init(ctx);

  while (state.nextBurst < BURSTS.length && t >= BURSTS[state.nextBurst].at) {
    const b = BURSTS[state.nextBurst];
    spawnBurst(ctx, b.intensity);
    ctx.sound.noise(300 + Math.round(b.intensity * 130));
    if (b.intensity >= 1.2) ctx.sound.beep(62 + b.intensity * 9, 220);
    state.nextBurst++;
  }

  // Pressure rings rolling out along the floor.
  for (const ring of state.shocks) {
    ring.age += dt;
    const k = Math.min(1, ring.age / ring.life);
    const a = Math.sin(k * Math.PI) * 0.20;
    const rx = ring.width * (0.35 + easeOut(k) * 2.1);
    const ry = rx * 0.16;
    if (a > 0.002) {
      ctx.canvas.globalAlpha = a;
      ctx.canvas.strokeStyle = 'rgba(226, 228, 232, 0.9)';
      ctx.canvas.lineWidth = Math.max(1.5, h * 0.0025 * (1 - k * 0.5));
      ctx.canvas.beginPath();
      ctx.canvas.ellipse(ring.x, ring.y, rx, ry, 0, Math.PI, Math.PI * 2);
      ctx.canvas.stroke();
    }
  }
  state.shocks = state.shocks.filter((r) => r.age < r.life);

  // The soft gray-and-white cloud.
  for (const p of state.puffs) {
    p.age += dt;
    p.x += (p.vx + Math.sin(p.age * p.wobbleFreq * 6.28 + p.phase) * p.wobbleAmp) * dt;
    p.y += p.vy * dt;
    p.vx *= 1 - 0.55 * dt;
    p.vy += Math.sin(p.age * 1.7 + p.phase) * h * 0.006 * dt;
  }
  state.puffs = state.puffs.filter((p) => p.age < p.life);

  ctx.canvas.save();
  for (const p of state.puffs) {
    const k = p.age / p.life;
    const fadeIn = k < 0.12 ? k / 0.12 : 1;
    const fade = fadeIn * Math.pow(1 - k, 1.45);
    const r = p.r0 + (p.r1 - p.r0) * easeOut(k);
    const a = p.alpha * fade;
    if (a < 0.002 || r < 1) continue;
    const v = p.value;
    const g = ctx.canvas.createRadialGradient(
      p.x - r * 0.18,
      p.y - r * 0.24,
      Math.max(1, r * 0.04),
      p.x,
      p.y,
      r,
    );
    g.addColorStop(0, `rgba(${v},${v},${Math.min(255, v + 6)},${a})`);
    g.addColorStop(0.52, `rgba(${v},${v},${v},${a * 0.62})`);
    g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    ctx.canvas.fillStyle = g;
    ctx.canvas.beginPath();
    ctx.canvas.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.canvas.fill();
  }
  ctx.canvas.restore();
  ctx.canvas.globalAlpha = 1;

  // The caption, delivered with total sincerity.
  const capIn = 1.0;
  const capOut = 6.4;
  let capA = 0;
  if (t > capIn && t < capOut + 0.9) {
    const inK = Math.min(1, (t - capIn) / 0.7);
    const outK = t > capOut ? 1 - Math.min(1, (t - capOut) / 0.9) : 1;
    capA = easeOut(inK) * outK;
  }
  if (capA > 0.003) {
    const cx = w * 0.5;
    const cy = h * 0.80;
    const pop = 0.94 + 0.06 * easeOut(Math.min(1, Math.max(0, (t - capIn) / 0.8)));
    ctx.canvas.save();
    ctx.canvas.translate(cx, cy);
    ctx.canvas.scale(pop, pop);
    ctx.canvas.textAlign = 'center';
    ctx.canvas.textBaseline = 'middle';
    ctx.canvas.shadowColor = 'rgba(8, 14, 30, 0.75)';
    ctx.canvas.shadowBlur = h * 0.02;
    ctx.canvas.globalAlpha = capA;
    ctx.canvas.fillStyle = 'rgba(246, 246, 248, 0.96)';
    ctx.canvas.font = `italic 700 ${Math.round(h * 0.058)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.canvas.fillText('kaboom.', 0, 0);
    ctx.canvas.globalAlpha = capA * 0.9;
    ctx.canvas.fillStyle = ctx.accent;
    ctx.canvas.font = `600 ${Math.round(h * 0.020)}px 'Segoe UI', system-ui, sans-serif`;
    ctx.canvas.fillText('a soft one, for the viewers at home', 0, h * 0.055);
    ctx.canvas.restore();
    ctx.canvas.globalAlpha = 1;
  }

  if (!state.ended && t > 9.3) {
    state.ended = true;
    ctx.done();
  }
}

export function dispose(ctx) {
  state = null;
}
