export const meta = {
  title: 'Steeped Sailor',
  author: 'savorysailor',
  prompt: 'when somebody says teabag in chat teabag the streamer',
  createdAt: '2026-11-22T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["teabag"] }
  ],
};

const DUNKS = [2.0, 3.5, 5.0];
const DESCEND = 0.42;
const REBOUND = 0.5;
const STAMP_AT = 6.6;
const END_AT = 9.3;

let S = null;

const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - (1 - p) * (1 - p);
const easeIn = (p) => p * p;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

function spawnImpact(ctx, x, y, u) {
  for (let i = 0; i < 18; i++) {
    const a = -Math.PI * (0.15 + ctx.rand() * 0.7);
    const sp = u * (0.35 + ctx.rand() * 0.85);
    S.parts.push({
      kind: 'drop',
      x: x + (ctx.rand() - 0.5) * u * 0.22,
      y: y + u * 0.04,
      vx: Math.cos(a) * sp * (ctx.rand() < 0.5 ? -1 : 1),
      vy: Math.sin(a) * sp,
      r: u * (0.006 + ctx.rand() * 0.012),
      life: 0,
      max: 0.55 + ctx.rand() * 0.4,
    });
  }
  for (let i = 0; i < 10; i++) {
    S.parts.push({
      kind: 'steam',
      x: x + (ctx.rand() - 0.5) * u * 0.3,
      y: y + (ctx.rand() - 0.5) * u * 0.06,
      vx: (ctx.rand() - 0.5) * u * 0.14,
      vy: -u * (0.1 + ctx.rand() * 0.2),
      r: u * (0.02 + ctx.rand() * 0.035),
      life: 0,
      max: 0.9 + ctx.rand() * 0.7,
    });
  }
  S.rings.push({ x, y, life: 0, max: 0.4 });
}

export function init(ctx) {
  const u = Math.min(ctx.width, ctx.height);
  const r = ctx.streamer
    ? { x: ctx.streamer.x, y: ctx.streamer.y, w: ctx.streamer.w, h: ctx.streamer.h }
    : { x: 0.28, y: 0.12, w: 0.44, h: 0.56 };

  const px = r.x * ctx.width;
  const py = r.y * ctx.height;
  const pw = r.w * ctx.width;
  const ph = r.h * ctx.height;

  S = {
    u,
    rectPx: { x: px, y: py, w: pw, h: ph },
    bagW: Math.max(70, Math.min(pw * 0.5, u * 0.26)),
    bagH: Math.max(64, Math.min(pw * 0.5, u * 0.24)),
    hoverY: Math.max(u * 0.19, py - u * 0.24),
    targetY: py + ph * 0.24,
    login: ctx.trigger && ctx.trigger.login ? String(ctx.trigger.login) : null,
    parts: [],
    rings: [],
    hit: [false, false, false],
    whoosh: [false, false, false],
    stampHit: false,
    finale: [false, false, false],
  };
}

export function onTrigger(ctx, event) {
  if (S && event && event.login) S.login = String(event.login);
}

function bagPose(t) {
  const { hoverY, targetY, u } = S;
  let y = hoverY + Math.sin(t * 2.4) * u * 0.012;
  if (t < DUNKS[0]) return { y, squash: 0 };

  let squash = 0;
  for (let i = 0; i < DUNKS.length; i++) {
    const t0 = DUNKS[i];
    const ti = t0 + DESCEND;
    if (t >= t0 && t < ti) {
      const p = (t - t0) / DESCEND;
      y = lerp(hoverY, targetY, easeIn(p));
    } else if (t >= ti && t < ti + REBOUND) {
      const p = (t - ti) / REBOUND;
      y = lerp(targetY, hoverY, easeOut(p));
      squash = Math.max(squash, Math.pow(1 - p, 2));
    }
  }

  const riseT = DUNKS[2] + DESCEND + 0.45;
  if (t > riseT) {
    const p = clamp01((t - riseT) / 0.8);
    y = lerp(hoverY, -S.bagH * 1.6, easeIn(p));
  }
  return { y, squash };
}

function caption(ctx, text, alpha, y, size, color) {
  if (alpha <= 0.01) return;
  const c = ctx.canvas;
  c.save();
  c.globalAlpha = alpha;
  c.font = '800 ' + Math.round(size) + 'px system-ui, "Segoe UI", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(3, size * 0.16);
  c.strokeStyle = 'rgba(8,10,30,0.72)';
  c.strokeText(text, ctx.width / 2, y);
  c.fillStyle = color;
  c.fillText(text, ctx.width / 2, y);
  c.restore();
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  const u = S.u;

  c.clearRect(0, 0, W, H);

  // Impacts + audio cues
  for (let i = 0; i < DUNKS.length; i++) {
    const ti = DUNKS[i] + DESCEND;
    if (!S.whoosh[i] && t >= DUNKS[i]) {
      S.whoosh[i] = true;
      ctx.sound.noise(120);
    }
    if (!S.hit[i] && t >= ti) {
      S.hit[i] = true;
      spawnImpact(ctx, S.rectPx.x + S.rectPx.w / 2, S.targetY, u);
      ctx.sound.noise(160);
      ctx.sound.beep(105 + i * 18, 130);
    }
  }
  if (!S.stampHit && t >= STAMP_AT) {
    S.stampHit = true;
    ctx.sound.noise(220);
    ctx.sound.beep(740, 140);
  }
  if (!S.finale[0] && t >= STAMP_AT + 0.2) { S.finale[0] = true; ctx.sound.beep(523, 100); }
  if (!S.finale[1] && t >= STAMP_AT + 0.36) { S.finale[1] = true; ctx.sound.beep(659, 100); }
  if (!S.finale[2] && t >= STAMP_AT + 0.52) { S.finale[2] = true; ctx.sound.beep(880, 220); }

  // Camera-frame pulse on each hit
  for (let i = 0; i < DUNKS.length; i++) {
    const ti = DUNKS[i] + DESCEND;
    if (t >= ti && t < ti + 0.45) {
      const p = (t - ti) / 0.45;
      c.save();
      c.globalAlpha = (1 - p) * 0.55;
      c.strokeStyle = ctx.accent;
      c.lineWidth = Math.max(3, u * 0.008);
      const r = S.rectPx;
      c.strokeRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
      c.restore();
    }
  }

  // Shock rings
  for (let i = S.rings.length - 1; i >= 0; i--) {
    const g = S.rings[i];
    g.life += dt;
    if (g.life > g.max) { S.rings.splice(i, 1); continue; }
    const p = g.life / g.max;
    c.save();
    c.globalAlpha = (1 - p) * 0.6;
    c.strokeStyle = ctx.accent;
    c.lineWidth = u * 0.012 * (1 - p);
    c.beginPath();
    c.ellipse(g.x, g.y, u * (0.06 + p * 0.3), u * (0.02 + p * 0.09), 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // Particles
  for (let i = S.parts.length - 1; i >= 0; i--) {
    const p = S.parts[i];
    p.life += dt;
    if (p.life > p.max) { S.parts.splice(i, 1); continue; }
    const k = p.life / p.max;
    const grav = p.kind === 'drop' ? u * 1.9 : -u * 0.32;
    p.vy += grav * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.kind === 'drop') {
      p.vx *= 1 - 0.6 * dt;
    }
    c.save();
    if (p.kind === 'drop') {
      c.globalAlpha = (1 - k) * 0.85;
      c.fillStyle = ctx.accent;
      c.beginPath();
      c.arc(p.x, p.y, p.r * (1 - k * 0.5), 0, Math.PI * 2);
      c.fill();
    } else {
      c.globalAlpha = (1 - k) * 0.32;
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.beginPath();
      c.arc(p.x, p.y, p.r * (1 + k * 1.6), 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  // Bag
  const pose = bagPose(t);
  const bx = S.rectPx.x + S.rectPx.w / 2 + Math.sin(t * 1.7) * u * 0.012;
  const by = pose.y;
  const wob = Math.sin(t * 5.2) * 0.06 + (1 - pose.squash) * 0;
  const sq = pose.squash;

  // String
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.55)';
  c.lineWidth = Math.max(1.5, u * 0.0035);
  c.beginPath();
  c.moveTo(bx, by - S.bagH * 0.5);
  const sway = Math.sin(t * 3.1) * u * 0.03;
  c.quadraticCurveTo(bx + sway, by - S.bagH * 1.6 - u * 0.25, bx + sway * 2.2, -u * 0.2);
  c.stroke();
  c.restore();

  c.save();
  c.translate(bx, by);
  c.rotate(wob);
  c.scale(1 + sq * 0.16, 1 - sq * 0.2);

  const bw = S.bagW;
  const bh = S.bagH;

  // Bag body
  c.beginPath();
  const rr = Math.min(bw, bh) * 0.16;
  const x0 = -bw / 2, y0 = -bh / 2;
  c.moveTo(x0 + rr, y0);
  c.lineTo(x0 + bw - rr, y0);
  c.quadraticCurveTo(x0 + bw, y0, x0 + bw, y0 + rr);
  c.lineTo(x0 + bw, y0 + bh - rr);
  c.quadraticCurveTo(x0 + bw, y0 + bh, x0 + bw - rr, y0 + bh);
  c.lineTo(x0 + rr, y0 + bh);
  c.quadraticCurveTo(x0, y0 + bh, x0, y0 + bh - rr);
  c.lineTo(x0, y0 + rr);
  c.quadraticCurveTo(x0, y0, x0 + rr, y0);
  c.closePath();
  c.fillStyle = 'rgba(246,233,214,0.94)';
  c.fill();
  c.strokeStyle = ctx.accent;
  c.lineWidth = Math.max(2.5, u * 0.006);
  c.stroke();

  // Fold lines
  c.strokeStyle = 'rgba(200,160,120,0.5)';
  c.lineWidth = Math.max(1, u * 0.0025);
  c.beginPath();
  c.moveTo(x0 + bw * 0.18, y0 + bh * 0.12);
  c.lineTo(x0 + bw * 0.18, y0 + bh * 0.88);
  c.moveTo(x0 + bw * 0.82, y0 + bh * 0.12);
  c.lineTo(x0 + bw * 0.82, y0 + bh * 0.88);
  c.stroke();

  // Little leaf mark
  c.save();
  c.translate(0, -bh * 0.02);
  c.fillStyle = 'rgba(60,120,80,0.8)';
  c.beginPath();
  c.ellipse(0, 0, bw * 0.1, bh * 0.05, -0.6, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // Tag
  const tagW = bw * 0.36, tagH = bh * 0.24;
  const tagX = bw * 0.5 + tagW * 0.28;
  const tagY = -bh * 0.18;
  c.save();
  c.translate(tagX, tagY);
  c.rotate(0.18);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.strokeStyle = 'rgba(30,30,60,0.5)';
  c.lineWidth = Math.max(1.5, u * 0.003);
  c.fillRect(-tagW / 2, -tagH / 2, tagW, tagH);
  c.strokeRect(-tagW / 2, -tagH / 2, tagW, tagH);
  c.fillStyle = 'rgba(40,40,70,0.85)';
  c.font = '800 ' + Math.round(tagH * 0.55) + 'px system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('TEA', 0, tagH * 0.04);
  c.restore();

  c.restore();

  // Captions
  const capY = H * 0.87;
  const name = S.login ? '@' + S.login : 'SOMEONE';
  const streamerName = 'SAVORYSAILOR';

  caption(ctx, name + ' SENDS THE BAG', clamp01((t - 0.2) / 0.3) * (1 - clamp01((t - 1.8) / 0.35)), capY, u * 0.058, '#ffffff');
  caption(ctx, 'STEEPING: ' + streamerName, clamp01((t - 2.0) / 0.25) * (1 - clamp01((t - 5.6) / 0.3)), capY, u * 0.058, ctx.accent);
  caption(ctx, 'STEEP LEVEL: CRITICAL', clamp01((t - 5.7) / 0.25) * (1 - clamp01((t - 6.5) / 0.3)), capY, u * 0.058, '#ffffff');

  // Punchline stamp
  if (t >= STAMP_AT) {
    const p = clamp01((t - STAMP_AT) / 0.28);
    const pop = easeOut(p);
    const a = clamp01((t - STAMP_AT) / 0.12) * (1 - clamp01((t - (END_AT - 0.35)) / 0.3));
    c.save();
    c.globalAlpha = a;
    c.translate(W / 2, H * 0.72);
    c.rotate(-0.09);
    c.scale(1.6 - 0.6 * pop, 1.6 - 0.6 * pop);
    const fs = u * 0.11;
    c.font = '900 ' + Math.round(fs) + 'px system-ui, "Segoe UI", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(5, fs * 0.1);
    c.strokeStyle = 'rgba(8,10,30,0.75)';
    c.strokeText('TEA. BAGGED.', 0, 0);
    c.fillStyle = ctx.accent;
    c.fillText('TEA. BAGGED.', 0, 0);
    c.strokeStyle = ctx.accent;
    c.lineWidth = Math.max(2, u * 0.005);
    c.strokeRect(-fs * 2.75, -fs * 0.75, fs * 5.5, fs * 1.5);
    c.restore();
  }

  if (t >= END_AT) {
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
