// Fifty little kawaii characters twerk under disco lights, over the live stream.
export const meta = {
  title: 'Fifty Twerking Marshmallows',
  author: 'doctordiggitydank',
  prompt: 'On command !twerk, make fifty little random kawaii characters show up and make them all twerk under disco lights',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "starts", "patterns": ["!twerk"] }
  ],
  assets: [],
};

const COUNT = 50;
const BEAT_START = 3.0;
const BEAT_END = 18.4;
const CROWN_AT = 9.0;
const FINALE = 19.1;
const OUTRO = 19.35;
const END = 21.9;

const S = {
  chars: [],
  confetti: [],
  sparks: [],
  W: 0,
  H: 0,
  k: 1,
  phase: 0,
  beatClock: 0,
  hatDone: false,
  beatCount: 0,
  popIndex: 0,
  sfx: {},
  streamer: null,
  crownY: null,
  burstDone: false,
  outDone: false,
};

function smooth(a, b, x) {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
}

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

function placeChar(rand, W, H, rect) {
  for (let i = 0; i < 44; i++) {
    const x = (0.05 + rand() * 0.90) * W;
    const y = (0.47 + rand() * 0.48) * H;
    if (rect) {
      const rx = rect.x * W;
      const ry = rect.y * H;
      const rw = rect.w * W;
      const rh = rect.h * H;
      const pad = 18;
      if (x > rx - pad && x < rx + rw + pad && y > ry - pad && y < ry + rh + pad) continue;
    }
    return { x, y };
  }
  return { x: rand() * W, y: (0.6 + rand() * 0.34) * H };
}

export function init(ctx) {
  const rand = ctx.rand;
  const W = ctx.width;
  const H = ctx.height;
  S.chars = [];
  S.confetti = [];
  S.sparks = [];
  S.W = W;
  S.H = H;
  S.k = H / 720;
  S.phase = 0;
  S.beatClock = 0;
  S.hatDone = false;
  S.beatCount = 0;
  S.popIndex = 0;
  S.sfx = {};
  S.streamer = ctx.streamer || null;
  S.crownY = null;
  S.burstDone = false;
  S.outDone = false;

  const rect = ctx.streamer || null;

  for (let i = 0; i < COUNT; i++) {
    const pos = placeChar(rand, W, H, rect);
    const depth = (pos.y / H - 0.45) / 0.55;
    const scale = (0.72 + rand() * 0.42) * (0.82 + depth * 0.35) * S.k;
    const hue = Math.floor(rand() * 360);
    S.chars.push({
      x: pos.x,
      y: pos.y,
      scale,
      hue,
      faceHue: Math.floor(rand() * 360),
      phase: rand() * Math.PI * 2,
      wig: rand() * Math.PI * 2,
      accent: Math.floor(rand() * 5),
      flip: rand() < 0.5 ? -1 : 1,
      appearAt: 0.45 + i * 0.052 + rand() * 0.12,
      outAt: OUTRO + i * 0.026,
      blink: rand() * 5,
      shade: 0.86 + rand() * 0.1,
    });
  }
  S.chars.sort((a, b) => a.y - b.y);
}

export function onTrigger(ctx) {
  // Nothing event-specific to greet: the joke is a crowd, not a guest list.
}

function beatInterval(t) {
  const ramp = smooth(BEAT_START, 17.0, t);
  return 0.46 - ramp * 0.16;
}

function drawBeams(c, t, W, H, alpha, energy) {
  const cx = W * 0.5;
  const cy = -H * 0.06;
  const hues = [320, 190, 55, 275, 150];
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < hues.length; i++) {
    const hh = hues[i];
    const ang = t * 0.5 + i * 1.2566;
    const tx = cx + Math.sin(ang) * W * 0.95;
    const spread = W * (0.07 + 0.03 * Math.sin(t * 0.9 + i));
    const grad = c.createLinearGradient(cx, cy, tx, H * 0.92);
    grad.addColorStop(0, 'hsla(' + hh + ',100%,72%,' + (0.26 * alpha * energy) + ')');
    grad.addColorStop(0.55, 'hsla(' + hh + ',100%,62%,' + (0.10 * alpha * energy) + ')');
    grad.addColorStop(1, 'hsla(' + hh + ',100%,60%,0)');
    c.fillStyle = grad;
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(tx - spread, H * 0.95);
    c.lineTo(tx + spread, H * 0.95);
    c.closePath();
    c.fill();
  }
  c.restore();
}

function drawBall(c, t, W, H, alpha) {
  const bx = W * 0.5 + Math.sin(t * 0.6) * W * 0.015;
  const by = H * 0.15;
  const r = Math.max(9, H * 0.022);
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = 'rgba(220,225,255,0.55)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(bx, 0);
  c.lineTo(bx, by - r);
  c.stroke();
  const g = c.createRadialGradient(bx - r * 0.35, by - r * 0.4, r * 0.15, bx, by, r);
  g.addColorStop(0, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.55, 'rgba(190,220,255,0.65)');
  g.addColorStop(1, 'rgba(110,120,180,0.35)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(bx, by, r, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    c.beginPath();
    c.ellipse(bx, by, r * 0.95, Math.abs(r * Math.sin(i * 0.5)) + 1, 0, 0, Math.PI * 2);
    c.stroke();
  }
  for (let i = 0; i < 7; i++) {
    const a = t * 1.4 + i * 0.9;
    const sx = bx + Math.cos(a) * (r * 1.5);
    const sy = by + Math.sin(a * 1.3) * (r * 0.9);
    c.globalAlpha = alpha * (0.35 + 0.3 * Math.sin(t * 3 + i));
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(sx, sy, 1.6, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawChar(c, ch, t, tPhase, intensity, alpha) {
  const ap = smooth(ch.appearAt, ch.appearAt + 0.32, t);
  if (ap <= 0.002) return;
  const out = smooth(ch.outAt, ch.outAt + 0.3, t);
  if (out >= 0.999) return;

  const s = ch.scale;
  const sq = (Math.sin(tPhase + ch.phase) * 0.5 + 0.5) * intensity;
  const wig = Math.sin(tPhase * 2 + ch.wig) * intensity;
  const breathe = Math.sin(t * 1.6 + ch.phase) * 0.04;
  const sc = ap * (1 - out);

  const bob = -sq * 7 * s - breathe * s * 8;
  const rot = wig * 0.13;

  // contact shadow
  c.save();
  c.globalAlpha = alpha * sc * 0.28;
  c.fillStyle = 'rgba(0,0,0,0.55)';
  c.beginPath();
  c.ellipse(ch.x, ch.y + 2 * s, 15 * s * (1 + sq * 0.1), 5 * s, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  c.save();
  c.globalAlpha = alpha * sc;
  c.translate(ch.x, ch.y + bob + sq * 3 * s);
  c.rotate(rot);
  c.scale(ch.flip, 1);
  const sx = 1 + sq * 0.09;
  const sy = 1 - sq * 0.12;
  c.scale(sx * s, sy * s);

  const base = 'hsl(' + ch.hue + ',85%,78%)';
  const dark = 'hsl(' + ch.hue + ',72%,' + Math.round(52 + (1 - ch.shade) * 40) + '%)';
  const light = 'hsl(' + ch.hue + ',95%,90%)';

  // legs / feet
  c.fillStyle = dark;
  c.beginPath();
  c.ellipse(-5.5 + wig * 1.2, -4, 4.4, 3.2, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(5.5 - wig * 1.2, -4, 4.4, 3.2, 0, 0, Math.PI * 2);
  c.fill();

  // the twin pillows of destiny
  c.fillStyle = 'hsl(' + ch.hue + ',78%,72%)';
  c.beginPath();
  c.ellipse(-6.5 + wig * 3.2, -11, 7.4, 7.0, 0.15 * wig, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(6.5 + wig * 3.2, -11, 7.4, 7.0, -0.15 * wig, 0, Math.PI * 2);
  c.fill();

  // body
  c.fillStyle = base;
  c.beginPath();
  c.ellipse(0 + wig * 1.0, -21, 13.5, 14, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = light;
  c.globalAlpha = alpha * sc * 0.35;
  c.beginPath();
  c.ellipse(-3.5, -25, 7, 5.5, -0.4, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = alpha * sc;

  // accessories
  const accCol = 'hsl(' + ch.faceHue + ',85%,72%)';
  if (ch.accent === 0) {
    c.fillStyle = base;
    c.beginPath();
    c.moveTo(-9, -33);
    c.lineTo(-4.5, -43);
    c.lineTo(1, -33);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(9, -33);
    c.lineTo(4.5, -43);
    c.lineTo(-1, -33);
    c.closePath();
    c.fill();
    c.fillStyle = 'hsl(' + ch.faceHue + ',90%,82%)';
    c.beginPath();
    c.moveTo(-7, -34);
    c.lineTo(-4.5, -40);
    c.lineTo(-2, -34);
    c.closePath();
    c.fill();
    c.beginPath();
    c.moveTo(7, -34);
    c.lineTo(4.5, -40);
    c.lineTo(2, -34);
    c.closePath();
    c.fill();
  } else if (ch.accent === 1) {
    c.fillStyle = accCol;
    c.beginPath();
    c.ellipse(-4.5, -39, 3.2, 9, 0.22 + wig * 0.08, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(4.5, -39, 3.2, 9, -0.22 + wig * 0.08, 0, Math.PI * 2);
    c.fill();
  } else if (ch.accent === 2) {
    c.strokeStyle = accCol;
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(0, -33);
    c.quadraticCurveTo(2, -40, 0, -44);
    c.stroke();
    c.fillStyle = 'hsl(50,100%,70%)';
    const r = 4.2 + sq * 0.8;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      const px = Math.cos(a) * rr;
      const py = -45 + Math.sin(a) * rr;
      if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
    }
    c.closePath();
    c.fill();
  } else if (ch.accent === 3) {
    c.fillStyle = 'hsl(' + ch.faceHue + ',90%,80%)';
    c.beginPath();
    c.ellipse(-8.5, -32, 3.6, 3.2, -0.3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(8.5, -32, 3.6, 3.2, 0.3, 0, Math.PI * 2);
    c.fill();
  } else {
    c.fillStyle = base;
    c.beginPath();
    c.ellipse(-4, -34, 2.6, 5, 0.3, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(4, -34, 2.6, 5, -0.3, 0, Math.PI * 2);
    c.fill();
  }

  // face
  const happy = intensity > 0.55;
  c.fillStyle = '#2a2340';
  if (happy) {
    c.strokeStyle = '#2a2340';
    c.lineWidth = 1.7;
    c.beginPath();
    c.arc(-5, -24, 2.6, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
    c.beginPath();
    c.arc(5, -24, 2.6, Math.PI * 1.05, Math.PI * 1.95);
    c.stroke();
  } else {
    const blink = Math.sin(t * 2.2 + ch.blink) > 0.96;
    if (blink) {
      c.strokeStyle = '#2a2340';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(-7, -24);
      c.lineTo(-3, -24);
      c.stroke();
      c.beginPath();
      c.moveTo(3, -24);
      c.lineTo(7, -24);
      c.stroke();
    } else {
      c.beginPath();
      c.ellipse(-5, -24.5, 2.1, 2.7, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(5, -24.5, 2.1, 2.7, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.beginPath();
      c.arc(-5.7, -25.4, 0.8, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(4.3, -25.4, 0.8, 0, Math.PI * 2);
      c.fill();
    }
  }

  c.fillStyle = 'hsla(' + ch.faceHue + ',95%,66%,0.45)';
  c.beginPath();
  c.ellipse(-9.4, -20.5, 3.1, 1.9, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(9.4, -20.5, 3.1, 1.9, 0, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = '#2a2340';
  c.lineWidth = 1.4;
  c.beginPath();
  if (happy) {
    c.arc(0, -19, 2.9, 0.15, Math.PI - 0.15);
  } else {
    c.arc(0, -20, 1.7, 0.25, Math.PI - 0.25);
  }
  c.stroke();

  // little arms
  c.fillStyle = base;
  c.save();
  c.translate(-13, -21);
  c.rotate(-0.5 + wig * 0.5);
  c.beginPath();
  c.ellipse(0, 3, 3.2, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.save();
  c.translate(13, -21);
  c.rotate(0.5 + wig * 0.5);
  c.beginPath();
  c.ellipse(0, 3, 3.2, 6, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  c.restore();
}

function drawCrown(c, t, W, H, alpha) {
  const rect = S.streamer;
  const centerX = rect ? (rect.x + rect.w * 0.5) * W : W * 0.5;
  const topY = rect ? Math.max(H * 0.06, rect.y * H - 8) : H * 0.17;
  if (S.crownY === null) S.crownY = -40;

  const drop = smooth(CROWN_AT, CROWN_AT + 0.55, t);
  const y = S.crownY + (topY - S.crownY) * drop + Math.sin(t * 2.4) * 3 * drop;
  const bob = Math.sin(t * 3.1) * 2;

  c.save();
  c.globalAlpha = alpha * drop;
  c.translate(centerX, y + bob);

  // glow
  const g = c.createRadialGradient(0, 0, 4, 0, 0, 60);
  g.addColorStop(0, 'rgba(255,220,120,0.45)');
  g.addColorStop(1, 'rgba(255,220,120,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(0, 0, 60, 0, Math.PI * 2);
  c.fill();

  const cw = 30;
  const chh = 22;
  c.fillStyle = '#ffd75e';
  c.strokeStyle = '#a97a12';
  c.lineWidth = 1.6;
  c.beginPath();
  c.moveTo(-cw, chh * 0.5);
  c.lineTo(-cw, -chh * 0.5);
  c.lineTo(-cw * 0.5, -chh * 0.05);
  c.lineTo(0, -chh * 0.95);
  c.lineTo(cw * 0.5, -chh * 0.05);
  c.lineTo(cw, -chh * 0.5);
  c.lineTo(cw, chh * 0.5);
  c.closePath();
  c.fill();
  c.stroke();

  c.fillStyle = '#ff5fa2';
  c.beginPath();
  c.arc(0, -chh * 0.62, 2.6, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5fd7ff';
  c.beginPath();
  c.arc(-cw * 0.62, chh * 0.02, 2.1, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(cw * 0.62, chh * 0.02, 2.1, 0, Math.PI * 2);
  c.fill();

  c.restore();

  // supervisor label
  const lAlpha = alpha * smooth(CROWN_AT + 0.4, CROWN_AT + 0.9, t);
  if (lAlpha > 0.01) {
    const fs = Math.max(10, Math.round(H * 0.016));
    c.save();
    c.font = `800 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
    const label = 'TWERK SUPERVISOR: SAVORYSAILOR';
    const tw = c.measureText(label).width;
    const padX = fs * 0.8;
    const h = fs * 1.8;
    const lx = centerX - tw / 2 - padX;
    const ly = y + 26;
    c.globalAlpha = lAlpha * 0.85;
    c.fillStyle = 'rgba(30,10,40,0.72)';
    roundRect(c, lx, ly, tw + padX * 2, h, h / 2);
    c.fill();
    c.globalAlpha = lAlpha;
    c.strokeStyle = 'rgba(255,215,94,0.8)';
    c.lineWidth = 1.4;
    roundRect(c, lx, ly, tw + padX * 2, h, h / 2);
    c.stroke();
    c.fillStyle = '#ffe9a8';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(label, centerX, ly + h / 2 + 1);
    c.restore();
  }
}

function captionFor(t) {
  if (t < 3.1) return "SAVORYSAILOR'S TWERK DISCO";
  if (t < 9.0) return 'FIFTY VOLUNTEERS. ZERO SHAME.';
  if (t < 14.2) return 'ALL HAIL THE TWERK SUPERVISOR';
  if (t < FINALE) return 'BEAT SYNC: 98 PERCENT';
  return 'CLASS DISMISSED.';
}

function drawCaption(c, text, W, H, alpha) {
  const fs = Math.max(13, Math.round(H * 0.027));
  c.save();
  c.font = `800 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
  const tw = c.measureText(text).width;
  const padX = fs * 0.9;
  const h = fs * 1.95;
  const w = tw + padX * 2;
  const x = W * 0.5 - w / 2;
  const y = H * 0.045;
  c.globalAlpha = alpha * 0.8;
  c.fillStyle = 'rgba(14,10,34,0.7)';
  roundRect(c, x, y, w, h, h / 2);
  c.fill();
  c.globalAlpha = alpha;
  c.strokeStyle = 'rgba(255,110,180,0.9)';
  c.lineWidth = 2;
  roundRect(c, x, y, w, h, h / 2);
  c.stroke();
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, W * 0.5, y + h / 2 + 1);
  c.restore();
}

function spawnBurst(ctx, W, H) {
  const cx = W * 0.5;
  const cy = H * 0.45;
  for (let i = 0; i < 90; i++) {
    const a = ctx.rand() * Math.PI * 2;
    const sp = 90 + ctx.rand() * 420;
    S.confetti.push({
      x: cx + (ctx.rand() - 0.5) * W * 0.7,
      y: cy + (ctx.rand() - 0.5) * H * 0.3,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 120,
      rot: ctx.rand() * Math.PI * 2,
      vr: (ctx.rand() - 0.5) * 8,
      size: 4 + ctx.rand() * 8,
      hue: Math.floor(ctx.rand() * 360),
      heart: ctx.rand() < 0.4,
      life: 0,
      max: 2.6 + ctx.rand() * 1.4,
    });
  }
}

function drawConfetti(c, W, H, alpha) {
  for (const p of S.confetti) {
    const fade = Math.max(0, 1 - p.life / p.max);
    if (fade <= 0) continue;
    c.save();
    c.globalAlpha = alpha * fade;
    c.translate(p.x, p.y);
    c.rotate(p.rot);
    c.fillStyle = 'hsl(' + p.hue + ',95%,70%)';
    if (p.heart) {
      const s = p.size * 0.22;
      c.beginPath();
      c.moveTo(0, 3 * s);
      c.bezierCurveTo(-6 * s, -2 * s, -3 * s, -7 * s, 0, -3.4 * s);
      c.bezierCurveTo(3 * s, -7 * s, 6 * s, -2 * s, 0, 3 * s);
      c.fill();
    } else {
      c.fillRect(-p.size * 0.5, -p.size * 0.22, p.size, p.size * 0.44);
    }
    c.restore();
  }
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  if (W !== S.W || H !== S.H) {
    S.W = W;
    S.H = H;
  }

  const step = Math.min(0.05, Math.max(0, dt || 0));
  const fadeIn = smooth(0, 0.35, t);
  const fadeOut = 1 - smooth(END - 0.9, END, t);
  const alpha = fadeIn * fadeOut;
  if (alpha <= 0) {
    if (t >= END && !S.outDone) {
      S.outDone = true;
      ctx.done();
    }
    return;
  }

  // sound: intro sweep
  if (!S.sfx.intro && t > 0.1) {
    S.sfx.intro = true;
    ctx.sound.noise(320);
  }

  // pop-in blips as each marshmallow lands
  while (S.popIndex < S.chars.length && t >= S.chars[S.popIndex].appearAt) {
    const f = 480 + (S.popIndex % 12) * 38;
    ctx.sound.beep(f, 45);
    S.popIndex++;
  }

  // beat clock + twerk phase
  const beating = t >= BEAT_START && t < FINALE;
  let intensity = smooth(BEAT_START, BEAT_START + 1.1, t);
  if (t >= FINALE) intensity = 1;
  if (t > FINALE) intensity = 1 - smooth(FINALE + 0.6, OUTRO + 1.4, t);

  if (beating) {
    const interval = beatInterval(t);
    S.beatClock += step;
    S.phase += step * (Math.PI * 2) / interval;
    if (!S.hatDone && S.beatClock >= interval * 0.5) {
      S.hatDone = true;
      ctx.sound.noise(30);
    }
    if (S.beatClock >= interval) {
      S.beatClock -= interval;
      S.hatDone = false;
      S.beatCount++;
      ctx.sound.beep(105, 90);
      if (S.beatCount % 4 === 0) {
        const notes = [440, 523, 659, 784, 659, 523];
        ctx.sound.beep(notes[(S.beatCount / 4) % notes.length], 110);
      }
    }
  } else {
    S.phase += step * 2.2;
  }

  // crown fanfare
  if (!S.sfx.crown && t >= CROWN_AT) {
    S.sfx.crown = true;
    ctx.sound.beep(523, 110);
    ctx.sound.beep(659, 130);
    ctx.sound.beep(880, 220);
  }

  // finale burst
  if (!S.burstDone && t >= FINALE) {
    S.burstDone = true;
    ctx.sound.noise(520);
    ctx.sound.beep(880, 260);
    spawnBurst(ctx, W, H);
    for (let i = 0; i < 60; i++) {
      const a = ctx.rand() * Math.PI * 2;
      const sp = 60 + ctx.rand() * 260;
      S.sparks.push({
        x: W * 0.5,
        y: H * 0.35,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        max: 1.0 + ctx.rand() * 0.9,
        hue: Math.floor(ctx.rand() * 360),
      });
    }
  }

  // light show
  const beamEnergy = beating || t > FINALE ? 1 : smooth(0.6, 2.4, t) * 0.7;
  drawBeams(c, t, W, H, alpha, beamEnergy);
  drawBall(c, t, W, H, alpha * 0.9);

  // floor pools
  c.save();
  c.globalCompositeOperation = 'lighter';
  for (const ch of S.chars) {
    const ap = smooth(ch.appearAt, ch.appearAt + 0.35, t);
    if (ap <= 0.01) continue;
    const out = smooth(ch.outAt, ch.outAt + 0.3, t);
    const pulse = 0.1 + 0.06 * Math.sin(t * 6 + ch.phase);
    c.globalAlpha = alpha * ap * (1 - out) * pulse;
    c.fillStyle = 'hsl(' + ch.hue + ',95%,62%)';
    c.beginPath();
    c.ellipse(ch.x, ch.y + 3, 26 * (ch.scale / S.k) * S.k, 8 * S.k, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // characters
  const tp = S.phase;
  for (const ch of S.chars) {
    drawChar(c, ch, t, tp, intensity, alpha);
  }

  // crown for the real human on camera
  if (t >= CROWN_AT) drawCrown(c, t, W, H, alpha);

  // confetti + sparks
  for (const p of S.confetti) {
    p.life += step;
    p.vy += 420 * step;
    p.vx *= 1 - 0.9 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
    p.rot += p.vr * step;
    if (p.y > H + 40) p.life = p.max;
  }
  for (const p of S.sparks) {
    p.life += step;
    p.vx *= 1 - 2.2 * step;
    p.vy *= 1 - 1.6 * step;
    p.x += p.vx * step;
    p.y += p.vy * step;
  }
  for (const p of S.sparks) {
    const f = Math.max(0, 1 - p.life / p.max);
    if (f <= 0) continue;
    c.save();
    c.globalAlpha = alpha * f;
    c.fillStyle = 'hsl(' + p.hue + ',100%,75%)';
    c.beginPath();
    c.arc(p.x, p.y, 3.2 * f + 0.6, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  drawConfetti(c, W, H, alpha);

  // closing caption fade
  const capA = smooth(0.2, 0.7, t) * (1 - smooth(END - 1.4, END - 0.5, t));
  drawCaption(c, captionFor(t), W, H, Math.min(1, capA * 1.15));

  // progress ticker for the crowd count
  if (t > 0.6 && t < 4.2) {
    const fs = Math.max(10, Math.round(H * 0.017));
    const n = Math.min(COUNT, S.popIndex);
    c.save();
    c.globalAlpha = alpha * 0.8;
    c.font = `700 ${fs}px system-ui, -apple-system, Segoe UI, sans-serif`;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.textAlign = 'left';
    c.textBaseline = 'top';
    c.fillText('DANCERS DEPLOYED: ' + n + '/' + COUNT, W * 0.03, H * 0.045 + fs * 2.3);
    c.restore();
  }

  if (t >= END) ctx.done();
}

export function dispose(ctx) {
  S.chars = [];
  S.confetti = [];
  S.sparks = [];
}
