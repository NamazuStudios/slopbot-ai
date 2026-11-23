// Burger Airstrike — a transparent-glass slop over the live stream.
// The streamer is already in frame; we just deliver lunch at speed.

export const meta = {
  title: 'Burger Airstrike',
  author: 'okiedokie24',
  prompt: 'throw hamburgers at the streamer',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function rr(g, x, y, w, h, r) {
  const rad = Math.min(r, w * 0.5, h * 0.5);
  g.beginPath();
  g.moveTo(x + rad, y);
  g.arcTo(x + w, y, x + w, y + h, rad);
  g.arcTo(x + w, y + h, x, y + h, rad);
  g.arcTo(x, y + h, x, y, rad);
  g.arcTo(x, y, x + w, y, rad);
  g.closePath();
}

function targetCenter(ctx) {
  const s = ctx.streamer;
  if (s) {
    return {
      x: (s.x + s.w * 0.5) * ctx.width,
      y: (s.y + s.h * 0.5) * ctx.height,
    };
  }
  return { x: ctx.width * 0.52, y: ctx.height * 0.42 };
}

function drawBurger(g, s) {
  const R = 0.5 * s;
  // --- bottom bun
  g.fillStyle = '#c07f3f';
  g.beginPath();
  g.ellipse(0, 0.40 * s, 0.47 * s, 0.12 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#a9692f';
  g.beginPath();
  g.ellipse(0, 0.44 * s, 0.44 * s, 0.075 * s, 0, 0, Math.PI * 2);
  g.fill();

  // --- patty
  g.fillStyle = '#43281a';
  g.beginPath();
  g.ellipse(0, 0.27 * s, 0.5 * s, 0.11 * s, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#5a3824';
  g.beginPath();
  g.ellipse(0, 0.245 * s, 0.46 * s, 0.07 * s, 0, 0, Math.PI * 2);
  g.fill();

  // --- cheese, with drooping corners
  g.fillStyle = '#f5c53c';
  g.beginPath();
  g.moveTo(-0.48 * s, 0.15 * s);
  g.lineTo(-0.35 * s, 0.28 * s);
  g.lineTo(-0.18 * s, 0.17 * s);
  g.lineTo(0, 0.29 * s);
  g.lineTo(0.2 * s, 0.17 * s);
  g.lineTo(0.37 * s, 0.28 * s);
  g.lineTo(0.48 * s, 0.15 * s);
  g.closePath();
  g.fill();

  // --- lettuce
  g.strokeStyle = '#7bb94a';
  g.lineWidth = 0.11 * s;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-0.48 * s, 0.08 * s);
  for (let i = 0; i < 6; i++) {
    const x0 = -0.48 * s + (i + 0.5) * (0.96 * s / 6);
    g.quadraticCurveTo(x0, 0.155 * s, x0 + 0.08 * s, 0.08 * s);
  }
  g.stroke();

  // --- top bun dome
  g.fillStyle = '#dda05c';
  g.beginPath();
  g.arc(0, 0.05 * s, R, Math.PI, Math.PI * 2);
  g.closePath();
  g.fill();
  // dome shading
  g.fillStyle = 'rgba(160, 105, 52, 0.35)';
  g.beginPath();
  g.arc(0, 0.05 * s, R, Math.PI * 1.55, Math.PI * 2);
  g.lineTo(0, 0.05 * s);
  g.closePath();
  g.fill();
  // bright cap
  g.fillStyle = 'rgba(255, 226, 180, 0.55)';
  g.beginPath();
  g.ellipse(-0.12 * s, -0.2 * s, 0.2 * s, 0.1 * s, -0.5, 0, Math.PI * 2);
  g.fill();

  // --- sesame seeds
  g.fillStyle = '#fff3d6';
  const seeds = [
    [-0.26, -0.2, -0.5], [-0.06, -0.3, 0.3], [0.16, -0.24, -0.2],
    [0.3, -0.08, 0.6], [-0.34, -0.03, 0.2], [0.04, -0.1, -0.7],
  ];
  for (const [sx, sy, rot] of seeds) {
    g.save();
    g.translate(sx * s, sy * s);
    g.rotate(rot);
    g.beginPath();
    g.ellipse(0, 0, 0.045 * s, 0.023 * s, 0, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

function makeSplat(ctx, x, y, radius) {
  const pts = [];
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push({
      a,
      r: radius * (0.62 + ctx.rand() * 0.62),
    });
  }
  const drips = [];
  const dn = 3 + Math.floor(ctx.rand() * 3);
  for (let i = 0; i < dn; i++) {
    drips.push({
      a: Math.PI * (0.15 + ctx.rand() * 0.7),
      len: radius * (0.25 + ctx.rand() * 0.55),
      w: radius * (0.1 + ctx.rand() * 0.1),
    });
  }
  return { x, y, r: radius, pts, drips, born: 0, hue: ctx.rand() < 0.6 ? 'ketchup' : 'mustard' };
}

function drawSplat(g, sp, alpha) {
  g.save();
  g.globalAlpha *= alpha;
  const col = sp.hue === 'ketchup' ? '#b62a2a' : '#e0a52e';
  g.fillStyle = col;
  g.beginPath();
  for (let i = 0; i < sp.pts.length; i++) {
    const p = sp.pts[i];
    const px = sp.x + Math.cos(p.a) * p.r;
    const py = sp.y + Math.sin(p.a) * p.r;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
  g.fill();

  // drips run down the glass
  for (const d of sp.drips) {
    const dx = sp.x + Math.cos(d.a) * sp.r * 0.85;
    const dy = sp.y + Math.sin(d.a) * sp.r * 0.85;
    g.beginPath();
    g.ellipse(dx, dy + d.len * 0.5, d.w, d.len * 0.5, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.arc(dx, dy + d.len, d.w * 1.25, 0, Math.PI * 2);
    g.fill();
  }

  // glossy highlight
  g.globalAlpha *= 0.5;
  g.fillStyle = 'rgba(255,255,255,0.7)';
  g.beginPath();
  g.ellipse(sp.x - sp.r * 0.28, sp.y - sp.r * 0.3, sp.r * 0.16, sp.r * 0.1, -0.6, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawCaption(g, cx, cy, title, sub, accent) {
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  g.font = '700 34px system-ui, sans-serif';
  const tw = g.measureText(title).width;
  g.font = '600 17px system-ui, sans-serif';
  const sw = sub ? g.measureText(sub).width : 0;
  const pad = 22;
  const w = Math.max(tw, sw) + pad * 2;
  const h = sub ? 96 : 62;

  g.fillStyle = 'rgba(10, 16, 36, 0.74)';
  rr(g, cx - w / 2, cy - h / 2, w, h, 14);
  g.fill();
  g.strokeStyle = accent;
  g.lineWidth = 2.5;
  g.stroke();

  g.fillStyle = '#ffffff';
  g.font = '700 34px system-ui, sans-serif';
  g.fillText(title, cx, cy + (sub ? -15 : 0));

  if (sub) {
    g.fillStyle = accent;
    g.font = '600 17px system-ui, sans-serif';
    g.fillText(sub, cx, cy + 24);
  }
  g.restore();
}

function drawReceipt(g, ctx, alpha, lines) {
  g.save();
  g.globalAlpha *= alpha;
  const w = Math.min(ctx.width * 0.24, 260);
  const h = 24 + lines.length * 24 + 18;
  const x = ctx.width - w - ctx.width * 0.035;
  const y = ctx.height - h - ctx.height * 0.08;
  g.translate(x + w / 2, y + h / 2);
  g.rotate(-0.045);
  g.fillStyle = 'rgba(252, 249, 240, 0.94)';
  rr(g, -w / 2, -h / 2, w, h, 6);
  g.fill();
  g.strokeStyle = 'rgba(30,30,40,0.25)';
  g.lineWidth = 1.5;
  g.stroke();

  // torn bottom edge
  g.fillStyle = 'rgba(252, 249, 240, 0.94)';
  g.beginPath();
  const steps = 10;
  for (let i = 0; i <= steps; i++) {
    const px = -w / 2 + (i / steps) * w;
    const py = h / 2 + (i % 2 === 0 ? 7 : 0);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.lineTo(w / 2, h / 2);
  g.lineTo(-w / 2, h / 2);
  g.closePath();
  g.fill();

  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillStyle = '#2a2a34';
  g.font = '700 13px ui-monospace, monospace';
  g.fillText('BURGER JOINT', -w / 2 + 16, -h / 2 + 20);
  g.strokeStyle = 'rgba(40,40,50,0.35)';
  g.setLineDash([4, 4]);
  g.beginPath();
  g.moveTo(-w / 2 + 14, -h / 2 + 34);
  g.lineTo(w / 2 - 14, -h / 2 + 34);
  g.stroke();
  g.setLineDash([]);

  g.font = '12px ui-monospace, monospace';
  lines.forEach((ln, i) => {
    g.fillStyle = '#3a3a44';
    g.fillText(ln, -w / 2 + 16, -h / 2 + 54 + i * 24);
  });
  g.restore();
}

// ---------------------------------------------------------------------------
// lifecycle
// ---------------------------------------------------------------------------

let state = null;

const THROW_TIMES = [1.55, 2.95, 4.15, 5.25, 6.25, 7.15, 7.95, 8.65, 9.3, 9.9, 10.5, 11.1];
const FINAL_AT = 12.35;
const DONE_AT = 18.6;

export function init(ctx) {
  const planned = THROW_TIMES.map((at, i) => ({ at, big: i === 7 }));
  planned.push({ at: FINAL_AT, big: true });
  state = {
    planned,
    idx: 0,
    proj: [],
    splats: [],
    crumbs: [],
    rings: [],
    hits: 0,
    finalT: null,
    done: false,
    lastT: 0,
  };
}

function spawn(ctx, big) {
  const w = ctx.width;
  const h = ctx.height;
  const uc = targetCenter(ctx);
  const tx = uc.x + (ctx.rand() - 0.5) * w * (big ? 0.05 : 0.2);
  const ty = uc.y + (ctx.rand() - 0.5) * h * (big ? 0.05 : 0.16);

  const side = Math.floor(ctx.rand() * 4);
  let sx, sy;
  if (side === 0) { sx = -w * 0.14; sy = ctx.rand() * h * 0.95; }
  else if (side === 1) { sx = w * 1.14; sy = ctx.rand() * h * 0.95; }
  else if (side === 2) { sx = ctx.rand() * w; sy = -h * 0.18; }
  else { sx = ctx.rand() * w; sy = h * 1.15; }

  const G = h * 0.9;
  const d = big ? 1.95 : 0.8 + ctx.rand() * 0.3;
  const vx = (tx - sx) / d;
  const vy = (ty - sy - 0.5 * G * d * d) / d;

  state.proj.push({
    x: sx, y: sy, vx, vy,
    t: 0, flight: d,
    size: (big ? h * 0.34 : h * 0.13) * (0.9 + ctx.rand() * 0.25),
    rot: ctx.rand() * Math.PI * 2,
    spin: (big ? 1.4 : 6 + ctx.rand() * 6) * (ctx.rand() < 0.5 ? -1 : 1),
    big,
  });

  ctx.sound.noise(big ? 260 : 130);
}

function impact(ctx, p) {
  const s = Math.min(ctx.width, ctx.height);
  const radius = p.big ? s * 0.17 : s * 0.055;
  const sp = makeSplat(ctx, p.x, p.y, radius);
  sp.born = state.lastT;
  state.splats.push(sp);
  state.hits++;

  state.rings.push({ x: p.x, y: p.y, t: 0, life: p.big ? 0.9 : 0.45, max: radius * (p.big ? 2.6 : 1.9) });

  const n = p.big ? 34 : 11;
  const crumbCols = ['#dda05c', '#c07f3f', '#43281a', '#7bb94a', '#f5c53c'];
  for (let i = 0; i < n; i++) {
    const a = ctx.rand() * Math.PI * 2;
    const sp2 = s * (0.05 + ctx.rand() * (p.big ? 0.4 : 0.16));
    state.crumbs.push({
      x: p.x, y: p.y,
      vx: Math.cos(a) * sp2,
      vy: Math.sin(a) * sp2 - s * 0.08,
      rot: ctx.rand() * 6,
      spin: (ctx.rand() - 0.5) * 14,
      size: s * (p.big ? 0.012 + ctx.rand() * 0.014 : 0.005 + ctx.rand() * 0.007),
      col: crumbCols[Math.floor(ctx.rand() * crumbCols.length)],
    });
  }

  ctx.sound.noise(p.big ? 300 : 120);
  if (p.big) {
    ctx.sound.beep(90, 220);
    state.finalT = state.lastT;
  } else {
    ctx.sound.beep(150, 70);
  }
}

export function frame(ctx, t, dt) {
  if (!state) return;
  const g = ctx.canvas;
  g.clearRect(0, 0, ctx.width, ctx.height);

  const step = Math.min(dt, 0.05);
  state.lastT = t;
  const G = ctx.height * 0.9;

  // --- schedule throws
  while (state.idx < state.planned.length && t >= state.planned[state.idx].at) {
    spawn(ctx, state.planned[state.idx].big);
    state.idx++;
  }

  // --- projectiles
  for (let i = state.proj.length - 1; i >= 0; i--) {
    const p = state.proj[i];
    p.t += step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.vy += G * step;
    p.rot += p.spin * step;
    if (p.t >= p.flight) {
      impact(ctx, p);
      state.proj.splice(i, 1);
    }
  }

  // --- crumbs
  for (let i = state.crumbs.length - 1; i >= 0; i--) {
    const c = state.crumbs[i];
    c.x += c.vx * step;
    c.y += c.vy * step;
    c.vy += G * 0.8 * step;
    c.rot += c.spin * step;
    if (c.y > ctx.height * 1.2) state.crumbs.splice(i, 1);
  }

  // --- rings
  for (let i = state.rings.length - 1; i >= 0; i--) {
    const r = state.rings[i];
    r.t += step;
    if (r.t >= r.life) state.rings.splice(i, 1);
  }

  // --- global fade at the end
  const fadeStart = DONE_AT - 1.0;
  g.globalAlpha = t > fadeStart ? Math.max(0, 1 - (t - fadeStart) / 0.95) : 1;

  const s = Math.min(ctx.width, ctx.height);

  // --- splats on the glass (translucent: stream still shows through)
  for (const sp of state.splats) {
    const age = t - sp.born;
    const a = Math.min(0.8, 0.35 + age * 0.9);
    drawSplat(g, sp, a);
  }

  // --- impact rings
  for (const r of state.rings) {
    const k = r.t / r.life;
    g.save();
    g.globalAlpha *= (1 - k) * 0.85;
    g.strokeStyle = ctx.accent;
    g.lineWidth = 4 * (1 - k) + 1;
    g.beginPath();
    g.arc(r.x, r.y, r.max * (0.3 + k), 0, Math.PI * 2);
    g.stroke();
    g.restore();
  }

  // --- crumbs
  for (const c of state.crumbs) {
    g.save();
    g.translate(c.x, c.y);
    g.rotate(c.rot);
    g.fillStyle = c.col;
    g.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
    g.restore();
  }

  // --- burgers in flight (with motion streaks)
  for (const p of state.proj) {
    if (p.t < p.flight * 0.6) {
      g.save();
      g.globalAlpha *= 0.22;
      g.strokeStyle = '#f7d9a8';
      g.lineWidth = p.size * 0.16;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(p.x, p.y);
      g.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
      g.stroke();
      g.restore();
    }
    g.save();
    g.translate(p.x, p.y);
    g.rotate(p.rot);
    // soft shadow for readability over any footage
    g.globalAlpha *= 0.95;
    drawBurger(g, p.size);
    g.restore();
  }

  // --- faint target reticle over the real streamer
  const uc = targetCenter(ctx);
  if (t < FINAL_AT + 1.2) {
    const pulse = 0.55 + Math.sin(t * 4) * 0.12;
    g.save();
    g.globalAlpha *= pulse;
    g.strokeStyle = 'rgba(255, 90, 160, 0.75)';
    g.lineWidth = 2;
    g.setLineDash([9, 11]);
    g.beginPath();
    g.arc(uc.x, uc.y, s * 0.19, 0, Math.PI * 2);
    g.stroke();
    g.setLineDash([]);
    g.beginPath();
    g.moveTo(uc.x - s * 0.23, uc.y);
    g.lineTo(uc.x - s * 0.15, uc.y);
    g.moveTo(uc.x + s * 0.15, uc.y);
    g.lineTo(uc.x + s * 0.23, uc.y);
    g.moveTo(uc.x, uc.y - s * 0.23);
    g.lineTo(uc.x, uc.y - s * 0.15);
    g.moveTo(uc.x, uc.y + s * 0.15);
    g.lineTo(uc.x, uc.y + s * 0.23);
    g.stroke();
    g.restore();
  }

  // --- top captions
  const cx = ctx.width * 0.5;
  const cy = ctx.height * 0.135;
  if (t < 5.6) {
    drawCaption(g, cx, cy, 'AIRMAIL: ONE (1) BURGER', 'RECIPIENT: SAVORYSAILOR', ctx.accent);
  } else if (t < 9.3) {
    drawCaption(g, cx, cy, 'ORDER AMENDED', 'RECIPIENT: SAVORYSAILOR', ctx.accent);
  } else if (!state.finalT || t < state.finalT + 0.6) {
    drawCaption(g, cx, cy, 'ESCALATING TO A COMBO MEAL', 'RECIPIENT: SAVORYSAILOR', ctx.accent);
  }

  // delivery counter
  g.save();
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.font = '700 20px system-ui, sans-serif';
  const label = 'DELIVERIES: ' + state.hits;
  const lw = g.measureText(label).width;
  g.fillStyle = 'rgba(10, 16, 36, 0.7)';
  rr(g, ctx.width * 0.03, ctx.height * 0.055, lw + 28, 40, 10);
  g.fill();
  g.strokeStyle = ctx.accent;
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = '#ffffff';
  g.fillText(label, ctx.width * 0.03 + 14, ctx.height * 0.055 + 21);
  g.restore();

  // --- punchline
  if (state.finalT !== null && t > state.finalT + 0.45) {
    const k = Math.min(1, (t - state.finalT - 0.45) / 0.4);
    g.save();
    g.globalAlpha *= k;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const bx = cx;
    const by = ctx.height * 0.72;
    g.font = '800 44px system-ui, sans-serif';
    const tw = g.measureText('BURGER DELIVERED').width;
    g.fillStyle = 'rgba(10, 16, 36, 0.78)';
    rr(g, bx - tw / 2 - 30, by - 46, tw + 60, 92, 16);
    g.fill();
    g.strokeStyle = ctx.accent;
    g.lineWidth = 3;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.fillText('BURGER DELIVERED', bx, by - 8);
    g.fillStyle = ctx.accent;
    g.font = '600 19px system-ui, sans-serif';
    g.fillText('TIP NOT INCLUDED', bx, by + 28);
    g.restore();

    drawReceipt(g, ctx, Math.min(1, (t - state.finalT - 1.0) / 0.5) * 0.96, [
      '1x CHEESEBURGER     0.00',
      'AIRMAIL             0.00',
      'SPLAT CLEANUP       0.00',
      'TIP                 0.00',
      'TOTAL             $0.00',
    ]);
  }

  g.globalAlpha = 1;

  if (!state.done && t >= DONE_AT) {
    state.done = true;
    ctx.done();
  }
}

export function dispose() {
  state = null;
}
