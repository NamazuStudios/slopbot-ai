// Bouncing Hotdog — a big mustard-slicked sausage ricochets around the glass,
// then gets delivered directly to the streamer's camera. Transparent overlay.
const TAU = Math.PI * 2;

export const meta = {
  title: 'Bouncing Hotdog',
  author: 'savorysailor',
  prompt: 'bounce a big hot dog around on screen when somebody says hotdog',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["hotdog"] }
  ],
};

let S = null;

export function init(ctx) {
  const W = ctx.width, H = ctx.height;
  const m = Math.min(W, H);
  const r = m * 0.105;
  const ang = -0.7 + ctx.rand() * 1.4;
  const sp = m * 0.62;
  S = {
    t: 0,
    r,
    baseR: r,
    x: W * 0.5 + (ctx.rand() - 0.5) * W * 0.2,
    y: H * 0.5 + (ctx.rand() - 0.5) * H * 0.2,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp,
    angle: ang,
    squash: 0,
    bounces: 0,
    phase: 'bounce',
    phaseT: 0,
    hoverX: 0,
    hoverY: 0,
    slamFrom: null,
    target: null,
    ghosts: [],
    ghostClock: 0,
    rings: [],
    parts: [],
    stains: [],
    capt: null,
    impactX: 0,
    impactY: 0,
    name: '',
    doneSent: false,
  };
  const tr = ctx.trigger;
  if (tr && typeof tr.login === 'string' && tr.login) S.name = tr.login;
}

export function onTrigger(ctx, event) {
  if (S && event && typeof event.login === 'string' && event.login) {
    S.name = event.login;
  }
}

function pad(ctx) {
  return Math.min(ctx.width, ctx.height) * 0.055;
}

function capsule(g, halfLen, thick) {
  const r = thick / 2;
  g.beginPath();
  g.moveTo(-halfLen + r, -r);
  g.lineTo(halfLen - r, -r);
  g.arc(halfLen - r, 0, r, -Math.PI / 2, Math.PI / 2);
  g.lineTo(-halfLen + r, r);
  g.arc(-halfLen + r, 0, r, Math.PI / 2, Math.PI * 1.5);
  g.closePath();
}

function roundRect(g, x, y, w, h, rad) {
  const r = Math.min(rad, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}

function label(g, text, x, y, size, color, align) {
  g.font = '800 ' + size + 'px system-ui, sans-serif';
  g.textAlign = align || 'left';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, size * 0.18);
  g.strokeStyle = 'rgba(8,14,30,0.88)';
  g.strokeText(text, x, y);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function fitSize(g, text, base, maxW) {
  if (maxW <= 0 || !text) return base;
  g.font = '800 ' + base + 'px system-ui, sans-serif';
  const w = g.measureText(text).width;
  if (w <= maxW) return base;
  return Math.max(base * 0.55, base * (maxW / w));
}

function labelFit(g, text, x, y, size, color, align, maxW) {
  label(g, text, x, y, fitSize(g, text, size, maxW), color, align);
}

function drawHotdog(g, a, alpha) {
  const th = a * 0.66;
  g.save();
  g.globalAlpha = alpha;

  // bun
  g.fillStyle = '#e7b167';
  capsule(g, a + th * 0.24, th * 1.12);
  g.fill();
  g.strokeStyle = 'rgba(122,72,24,0.6)';
  g.lineWidth = Math.max(1, th * 0.05);
  g.stroke();

  // bun shine
  g.fillStyle = 'rgba(255,232,186,0.55)';
  g.save();
  g.translate(0, -th * 0.36);
  capsule(g, a * 0.92, th * 0.2);
  g.fill();
  g.restore();

  // sausage
  g.fillStyle = '#c8483a';
  capsule(g, a, th * 0.72);
  g.fill();
  g.strokeStyle = '#8b2c22';
  g.lineWidth = Math.max(1, th * 0.055);
  g.stroke();

  // sausage sheen
  g.fillStyle = 'rgba(255,146,116,0.6)';
  g.save();
  g.translate(0, -th * 0.14);
  capsule(g, a * 0.78, th * 0.16);
  g.fill();
  g.restore();

  // mustard zigzag
  g.strokeStyle = '#f4ce39';
  g.lineWidth = Math.max(2, th * 0.14);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.beginPath();
  const n = 7;
  for (let i = 0; i <= n; i++) {
    const x = -a * 0.84 + a * 1.68 * (i / n);
    const y = (i % 2 === 0 ? -1 : 1) * th * 0.17;
    if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
  }
  g.stroke();

  // tiny face
  g.fillStyle = '#2a0f0a';
  const ey = th * 0.02;
  g.beginPath(); g.arc(-a * 0.24, ey, th * 0.075, 0, TAU); g.fill();
  g.beginPath(); g.arc(a * 0.24, ey, th * 0.075, 0, TAU); g.fill();
  g.strokeStyle = '#2a0f0a';
  g.lineWidth = Math.max(1.5, th * 0.045);
  g.beginPath();
  g.arc(0, th * 0.1, th * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();

  g.restore();
}

function spawnBurst(ctx, x, y, count, power) {
  for (let i = 0; i < count; i++) {
    const ang = ctx.rand() * TAU;
    const sp = power * (0.35 + ctx.rand() * 0.9);
    S.parts.push({
      x, y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - power * 0.25,
      r: Math.max(2, Math.min(ctx.width, ctx.height) * (0.004 + ctx.rand() * 0.012)),
      life: 0.55 + ctx.rand() * 0.9,
      max: 1.4,
    });
  }
}

function addStain(ctx, x, y, radius) {
  const seeds = [];
  for (let i = 0; i < 7; i++) {
    seeds.push({
      dx: (ctx.rand() - 0.5) * radius * 2.1,
      dy: (ctx.rand() - 0.5) * radius * 2.1,
      r: radius * (0.35 + ctx.rand() * 0.6),
    });
  }
  S.stains.push({ x, y, seeds, alpha: 0.85, fade: 0 });
}

export function frame(ctx, t, dt) {
  if (!S) return;
  const g = ctx.canvas;
  const W = ctx.width, H = ctx.height;
  const d = Math.min(Math.max(dt || 0, 0), 0.05);
  const m = Math.min(W, H);
  S.t += d;
  g.clearRect(0, 0, W, H);

  const p = pad(ctx);

  // ---------- simulate ----------
  if (S.phase === 'bounce') {
    S.x += S.vx * d;
    S.y += S.vy * d;
    const b = S.r + p;
    let bounced = false;
    if (S.x < b) { S.x = b; S.vx = Math.abs(S.vx); bounced = true; }
    if (S.x > W - b) { S.x = W - b; S.vx = -Math.abs(S.vx); bounced = true; }
    if (S.y < b) { S.y = b; S.vy = Math.abs(S.vy); bounced = true; }
    if (S.y > H - b) { S.y = H - b; S.vy = -Math.abs(S.vy); bounced = true; }

    if (bounced) {
      S.bounces++;
      S.squash = 1;
      const speed = Math.hypot(S.vx, S.vy);
      S.r = Math.min(S.baseR * 1.32, S.r * 1.05);
      S.vx *= 1.1;
      S.vy *= 1.1;
      const cap = m * 1.6;
      const s2 = Math.hypot(S.vx, S.vy);
      if (s2 > cap) { S.vx = S.vx / s2 * cap; S.vy = S.vy / s2 * cap; }
      S.rings.push({ x: S.x, y: S.y, r: S.r * 0.7, life: 0.45 });
      ctx.sound.beep(150 + S.bounces * 38 + Math.min(140, speed * 0.02), 95);
      ctx.sound.noise(55);
      if (S.bounces >= 6) {
        S.phase = 'windup';
        S.phaseT = 0;
        const st = ctx.streamer;
        const tx = st ? (st.x + st.w * 0.5) * W : W * 0.5;
        const ty = st ? (st.y + st.h * 0.78) * H : H * 0.62;
        S.target = {
          x: Math.max(S.r + p, Math.min(W - S.r - p, tx)),
          y: Math.max(S.r + p, Math.min(H - S.r - p, ty)),
        };
        S.hoverX = S.target.x;
        S.hoverY = Math.max(S.r + p, S.target.y - H * 0.3);
        ctx.sound.beep(420, 140);
      }
    }
    // ease angle toward travel direction
    const want = Math.atan2(S.vy, S.vx);
    let diff = ((want - S.angle + Math.PI) % TAU + TAU) % TAU - Math.PI;
    S.angle += diff * Math.min(1, d * 5);
  } else if (S.phase === 'windup') {
    S.phaseT += d;
    const k = Math.min(1, d * 7);
    S.x += (S.hoverX - S.x) * k;
    S.y += (S.hoverY - S.y) * k;
    S.angle += d * 12;
    if (S.phaseT > 0.8) {
      S.phase = 'slam';
      S.phaseT = 0;
      S.slamFrom = { x: S.x, y: S.y };
      ctx.sound.beep(180, 90);
      ctx.sound.noise(90);
    }
  } else if (S.phase === 'slam') {
    S.phaseT += d;
    const u = Math.min(1, S.phaseT / 0.26);
    const e = u * u;
    S.x = S.slamFrom.x + (S.target.x - S.slamFrom.x) * e;
    S.y = S.slamFrom.y + (S.target.y - S.slamFrom.y) * e;
    S.angle = Math.PI / 2;
    if (u >= 1) {
      S.phase = 'splat';
      S.phaseT = 0;
      S.impactX = S.target.x;
      S.impactY = S.target.y;
      spawnBurst(ctx, S.impactX, S.impactY, 34, m * 0.9);
      addStain(ctx, S.impactX, S.impactY, m * 0.05);
      S.rings.push({ x: S.impactX, y: S.impactY, r: S.r * 1.4, life: 0.7 });
      ctx.sound.noise(320);
      ctx.sound.beep(70, 280);
      S.capt = {
        head: 'SPLAT.',
        sub: S.name
          ? S.name + ' has released the hotdog.'
          : 'An unclaimed hotdog has chosen violence.',
        sub2: 'savorysailor, you have mustard now.',
      };
    }
  } else if (S.phase === 'splat') {
    S.phaseT += d;
    S.stains.forEach((s) => { s.alpha = Math.max(0, 0.85 * (1 - S.phaseT / 2.6)); });
    if (S.phaseT > 2.35 && !S.doneSent) {
      S.doneSent = true;
      if (typeof ctx.done === 'function') ctx.done();
    }
  }

  if (S.t > 45 && !S.doneSent) {
    S.doneSent = true;
    if (typeof ctx.done === 'function') ctx.done();
  }

  S.squash = Math.max(0, S.squash - d * 6);

  // ---------- ghosts ----------
  if (S.phase === 'bounce' || S.phase === 'slam') {
    S.ghostClock += d;
    if (S.ghostClock > 0.05) {
      S.ghostClock = 0;
      S.ghosts.push({ x: S.x, y: S.y, a: S.angle, life: 0.3 });
    }
  }
  for (let i = S.ghosts.length - 1; i >= 0; i--) {
    S.ghosts[i].life -= d;
    if (S.ghosts[i].life <= 0) S.ghosts.splice(i, 1);
  }

  // ---------- stains ----------
  S.stains.forEach((s) => {
    if (s.alpha <= 0.01) return;
    g.save();
    g.globalAlpha = s.alpha;
    g.fillStyle = '#f2cd3b';
    s.seeds.forEach((sd) => {
      g.beginPath();
      g.arc(s.x + sd.dx, s.y + sd.dy, sd.r, 0, TAU);
      g.fill();
    });
    g.fillStyle = 'rgba(255,240,150,0.9)';
    g.beginPath();
    g.arc(s.x, s.y, m * 0.012, 0, TAU);
    g.fill();
    g.restore();
  });

  // ---------- ghost trail ----------
  S.ghosts.forEach((gh) => {
    g.save();
    g.translate(gh.x, gh.y);
    g.rotate(gh.a);
    drawHotdog(g, S.r * 0.85, Math.max(0, gh.life / 0.3) * 0.16);
    g.restore();
  });

  // ---------- rings ----------
  for (let i = S.rings.length - 1; i >= 0; i--) {
    const rg = S.rings[i];
    rg.life -= d;
    rg.r += d * m * 0.35;
    if (rg.life <= 0) { S.rings.splice(i, 1); continue; }
    g.save();
    g.globalAlpha = Math.max(0, rg.life / 0.7);
    g.strokeStyle = '#ffd95e';
    g.lineWidth = Math.max(2, m * 0.006);
    g.beginPath();
    g.arc(rg.x, rg.y, rg.r, 0, TAU);
    g.stroke();
    g.restore();
  }

  // ---------- the dog ----------
  if (S.phase !== 'splat') {
    let alpha = 1;
    let scale = 1;
    if (S.phase === 'windup') {
      scale = 1.22 + Math.sin(S.phaseT * 22) * 0.06;
    } else if (S.phase === 'slam') {
      scale = 1.15;
    }
    const sq = S.squash;
    const sx = 1 + 0.3 * sq;
    const sy = 1 - 0.28 * sq;

    // shadow blob
    g.save();
    g.globalAlpha = 0.28;
    g.fillStyle = '#0a1024';
    g.beginPath();
    g.ellipse(S.x, S.y + S.r * 0.55, S.r * 0.9, S.r * 0.3, 0, 0, TAU);
    g.fill();
    g.restore();

    g.save();
    g.translate(S.x, S.y);
    g.rotate(S.angle);
    if (S.phase === 'slam') g.scale(0.78 * scale, 1.3 * scale);
    else g.scale(sx * scale, sy * scale);
    drawHotdog(g, S.r, alpha);
    g.restore();
  }

  // ---------- impact star ----------
  if (S.phase === 'splat' && S.phaseT < 0.5) {
    const k = 1 - S.phaseT / 0.5;
    g.save();
    g.globalAlpha = k * 0.9;
    g.fillStyle = '#ffe680';
    g.beginPath();
    const spikes = 12;
    for (let i = 0; i < spikes * 2; i++) {
      const ang = (i / (spikes * 2)) * TAU + S.phaseT * 2;
      const rad = (i % 2 === 0 ? 1 : 0.45) * m * 0.16 * (0.6 + k * 0.6);
      const x = S.impactX + Math.cos(ang) * rad;
      const y = S.impactY + Math.sin(ang) * rad * 0.75;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fill();
    g.restore();
  }

  // ---------- particles ----------
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const pt = S.parts[i];
    pt.life -= d;
    if (pt.life <= 0) { S.parts.splice(i, 1); continue; }
    pt.vy += m * 1.6 * d;
    pt.x += pt.vx * d;
    pt.y += pt.vy * d;
    if (pt.y > H + 40) { S.parts.splice(i, 1); continue; }
    const k = Math.min(1, pt.life / 0.4);
    g.save();
    g.globalAlpha = k;
    g.fillStyle = '#f2cd3b';
    g.beginPath();
    g.arc(pt.x, pt.y, pt.r * (0.6 + 0.4 * k), 0, TAU);
    g.fill();
    g.strokeStyle = 'rgba(150,110,10,0.5)';
    g.lineWidth = 1;
    g.stroke();
    g.restore();
  }

  // ---------- captions ----------
  if (S.phase !== 'splat') {
    const size = Math.max(14, m * 0.038);
    label(g, 'HOTDOG EVENT', p, p + size * 0.7, size, '#ffd9ea', 'left');
    const sub = S.name
      ? 'summoned by ' + S.name
      : 'nobody claimed this one';
    label(g, sub, p, p + size * 1.85, size * 0.62, '#ffe680', 'left');
    if (S.phase === 'windup') {
      label(g, 'incoming', W - p, p + size * 0.7, size * 0.7, '#ff9fd0', 'right');
    }
  } else if (S.capt) {
    const size = Math.max(20, m * 0.075);
    const cw = Math.min(W - p * 2, m * 1.05);
    const ch = size * 2.6;
    const cx = S.impactX;
    const cy = Math.max(p + ch * 0.5, Math.min(H - p - ch * 0.5, S.impactY - m * 0.17));
    g.save();
    g.globalAlpha = 0.92;
    g.fillStyle = ctx.accent || '#ff6bb5';
    roundRect(g, cx - cw / 2, cy - ch / 2, cw, ch, size * 0.3);
    g.fill();
    g.strokeStyle = 'rgba(10,16,36,0.9)';
    g.lineWidth = Math.max(2, size * 0.09);
    g.stroke();
    g.restore();
    label(g, S.capt.head, cx, cy - ch * 0.2, size, '#0a1024', 'center');
    label(g, S.capt.sub, cx, cy + ch * 0.13, size * 0.38, '#0a1024', 'center');
    label(g, S.capt.sub2, cx, cy + ch * 0.36, size * 0.34, '#3a1430', 'center');
  }
}

export function dispose(ctx) {}
