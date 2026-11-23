// Sudden Cat Blorp — a giant cat face inflates out of the middle of the live
// stream, boops the camera, selects SavorySailor as its human, then folds
// itself away with a quiet mrrp. Transparent glass: no background fills.

const TAU = Math.PI * 2;
const END = 8.6;

const FUR = '#f2a35c';
const FUR_DARK = '#d9793a';
const CREAM = '#ffe9d2';
const INK = '#221b2e';
const PINK = '#ff8fb0';
const GREEN = '#77e39b';

export const meta = {
  title: 'Sudden Cat Blorp',
  author: 'okiedokie24',
  prompt: 'when a viewer types !cat in chat, pops a giant cat face out from the middle of the screen',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  assets: [],
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!cat"] }
  ],
};

let S = null;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (k) => k * k * (3 - 2 * k);
const easeOutCubic = (k) => 1 - Math.pow(1 - k, 3);
const easeInCubic = (k) => k * k * k;
const easeOutBack = (k) => {
  const c1 = 1.9;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

export function init(ctx) {
  const rnd = () => ctx.rand();
  S = {
    sparks: [],
    motes: [],
    doneFired: false,
    beeped: {},
    purrIdx: 0,
    purrAt: [4.5, 4.78, 5.06, 5.34, 5.62, 5.9, 6.18, 6.44],
  };
  for (let i = 0; i < 26; i++) {
    const a = rnd() * TAU;
    const sp = 0.25 + rnd() * 0.9;
    S.sparks.push({
      at: 3.42 + rnd() * 0.18,
      a,
      sp,
      life: 0.55 + rnd() * 0.5,
      size: 0.006 + rnd() * 0.014,
      warm: rnd() < 0.5,
    });
  }
  for (let i = 0; i < 18; i++) {
    S.motes.push({
      a: rnd() * TAU,
      rad: 0.7 + rnd() * 0.8,
      speed: 0.18 + rnd() * 0.5,
      size: 0.004 + rnd() * 0.008,
      wob: rnd() * TAU,
      warm: rnd() < 0.5,
    });
  }
}

function streamerRect(ctx) {
  const st = ctx.streamer;
  if (st && st.w > 0 && st.h > 0) {
    return {
      x: st.x * ctx.width,
      y: st.y * ctx.height,
      w: st.w * ctx.width,
      h: st.h * ctx.height,
    };
  }
  return null;
}

function blinkOpenAt(t, times) {
  let open = 1;
  for (let i = 0; i < times.length; i++) {
    const d = Math.abs(t - times[i]);
    if (d < 0.19) open = Math.min(open, smooth(clamp(d / 0.19, 0, 1)));
  }
  return open;
}

function catScale(t) {
  if (t < 0.55) {
    return lerp(0.02, 0.13, easeOutCubic(clamp(t / 0.55, 0, 1)));
  }
  if (t < 1.45) {
    return lerp(0.13, 1.0, easeOutBack(clamp((t - 0.55) / 0.9, 0, 1)));
  }
  if (t < 3.3) {
    return 1.0 + 0.014 * Math.sin(t * 9.5);
  }
  if (t < 3.5) {
    return lerp(1.0, 1.15, smooth(clamp((t - 3.3) / 0.2, 0, 1)));
  }
  if (t < 4.2) {
    return lerp(1.15, 1.0, smooth(clamp((t - 3.5) / 0.7, 0, 1)));
  }
  if (t < 6.8) {
    return 1.0 + 0.02 * Math.sin(t * 6.2);
  }
  if (t < 7.5) {
    return lerp(1.0, 0.14, easeInCubic(clamp((t - 6.8) / 0.7, 0, 1)));
  }
  if (t < 8.2) {
    return 0.14 + 0.006 * Math.sin(t * 11);
  }
  return lerp(0.14, 0.0, easeInCubic(clamp((t - 8.2) / 0.38, 0, 1)));
}

function drawGlow(c, x, y, r, alpha) {
  if (alpha <= 0.005) return;
  const g = c.createRadialGradient(x, y, r * 0.15, x, y, r * 1.55);
  g.addColorStop(0, 'rgba(255,132,190,' + (alpha * 0.34) + ')');
  g.addColorStop(0.6, 'rgba(255,96,160,' + (alpha * 0.12) + ')');
  g.addColorStop(1, 'rgba(255,96,160,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, r * 1.55, 0, TAU);
  c.fill();
}

function headPath(c, r) {
  c.beginPath();
  c.ellipse(0, 0, r, r * 0.86, 0, 0, TAU);
}

function drawCatFace(c, x, y, r, p) {
  const blink = p.blink;
  const whisk = p.whisk;
  c.save();
  c.translate(x, y);
  c.rotate(p.tilt || 0);
  c.scale(p.sx || 1, p.sy || 1);
  c.globalAlpha = clamp(p.alpha == null ? 1 : p.alpha, 0, 1);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  const lw = Math.max(1.2, r * 0.055);

  // Ears (behind head)
  for (let side = -1; side <= 1; side += 2) {
    c.beginPath();
    c.moveTo(side * 0.74 * r, -0.42 * r);
    c.lineTo(side * 0.86 * r, -1.34 * r);
    c.quadraticCurveTo(side * 0.52 * r, -0.98 * r, side * 0.24 * r, -0.78 * r);
    c.closePath();
    c.fillStyle = FUR;
    c.strokeStyle = INK;
    c.lineWidth = lw;
    c.fill();
    c.stroke();

    c.beginPath();
    c.moveTo(side * 0.66 * r, -0.52 * r);
    c.lineTo(side * 0.78 * r, -1.08 * r);
    c.quadraticCurveTo(side * 0.50 * r, -0.86 * r, side * 0.42 * r, -0.76 * r);
    c.closePath();
    c.fillStyle = PINK;
    c.fill();
  }

  // Head
  headPath(c, r);
  c.fillStyle = FUR;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = lw;
  c.stroke();

  // Forehead stripes, clipped to the head
  c.save();
  headPath(c, r);
  c.clip();
  c.strokeStyle = FUR_DARK;
  c.lineWidth = r * 0.075;
  c.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.moveTo(i * 0.24 * r, -0.80 * r);
    c.quadraticCurveTo(i * 0.30 * r, -0.58 * r, i * 0.24 * r, -0.40 * r);
    c.stroke();
  }
  // Cheek stripes
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 2; i++) {
      c.beginPath();
      c.moveTo(side * (0.70 * r), (0.02 + i * 0.16) * r);
      c.lineTo(side * (0.92 * r), (0.06 + i * 0.16) * r);
      c.stroke();
    }
  }
  c.restore();

  // Muzzle
  c.fillStyle = CREAM;
  c.beginPath();
  c.ellipse(-0.14 * r, 0.34 * r, 0.24 * r, 0.19 * r, 0, 0, TAU);
  c.ellipse(0.14 * r, 0.34 * r, 0.24 * r, 0.19 * r, 0, 0, TAU);
  c.fill();

  // Eyes
  const eyeOpen = blink;
  for (let side = -1; side <= 1; side += 2) {
    const ex = side * 0.36 * r;
    const ey = -0.14 * r;
    if (eyeOpen < 0.14) {
      c.beginPath();
      c.strokeStyle = INK;
      c.lineWidth = r * 0.05;
      c.arc(ex, ey + 0.04 * r, 0.16 * r, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    } else {
      c.beginPath();
      c.ellipse(ex, ey, 0.21 * r, 0.205 * r * eyeOpen, 0, 0, TAU);
      c.fillStyle = CREAM;
      c.fill();
      c.strokeStyle = INK;
      c.lineWidth = r * 0.038;
      c.stroke();

      const irisY = 0.205 * r * eyeOpen * 0.92;
      c.beginPath();
      c.ellipse(ex, ey, 0.15 * r, Math.min(irisY, 0.16 * r), 0, 0, TAU);
      c.fillStyle = GREEN;
      c.fill();

      const pH = Math.min(0.17 * r * eyeOpen * p.pupil, Math.max(0.02 * r, irisY));
      c.beginPath();
      c.ellipse(ex, ey, 0.052 * r, Math.max(0.015 * r, pH), 0, 0, TAU);
      c.fillStyle = INK;
      c.fill();

      c.beginPath();
      c.arc(ex - 0.055 * r, ey - 0.055 * r, 0.042 * r, 0, TAU);
      c.fillStyle = 'rgba(255,255,255,0.9)';
      c.fill();
    }
  }

  // Nose
  c.beginPath();
  c.moveTo(-0.10 * r, 0.20 * r);
  c.quadraticCurveTo(0, 0.15 * r, 0.10 * r, 0.20 * r);
  c.quadraticCurveTo(0.075 * r, 0.31 * r, 0, 0.33 * r);
  c.quadraticCurveTo(-0.075 * r, 0.31 * r, -0.10 * r, 0.20 * r);
  c.closePath();
  c.fillStyle = PINK;
  c.fill();
  c.strokeStyle = INK;
  c.lineWidth = r * 0.028;
  c.stroke();

  // Mouth
  if (p.mouth > 0.02) {
    const mw = 0.20 * r;
    const mh = 0.10 * r + 0.28 * r * p.mouth;
    c.beginPath();
    c.ellipse(0, 0.36 * r + mh * 0.4, mw, mh, 0, 0, TAU);
    c.fillStyle = INK;
    c.fill();
    c.beginPath();
    c.ellipse(0, 0.40 * r + mh * 0.55, mw * 0.72, mh * 0.42, 0, 0, TAU);
    c.fillStyle = PINK;
    c.fill();
  } else {
    c.strokeStyle = INK;
    c.lineWidth = r * 0.03;
    c.beginPath();
    c.moveTo(0, 0.33 * r);
    c.lineTo(0, 0.40 * r);
    c.stroke();
    c.beginPath();
    c.arc(-0.065 * r, 0.40 * r, 0.075 * r, 0, Math.PI * 0.85);
    c.stroke();
    c.beginPath();
    c.arc(0.065 * r, 0.40 * r, 0.075 * r, Math.PI * 0.15, Math.PI);
    c.stroke();
  }

  // Whiskers
  c.strokeStyle = 'rgba(34,27,46,0.88)';
  c.lineWidth = Math.max(1, r * 0.028);
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 3; i++) {
      const baseY = (0.20 + i * 0.11) * r;
      const wag = Math.sin(whisk + i * 0.9 + (side > 0 ? 1.2 : 0)) * 0.10 * r;
      c.beginPath();
      c.moveTo(side * 0.24 * r, baseY);
      c.quadraticCurveTo(
        side * 0.85 * r,
        baseY - 0.16 * r + wag,
        side * 1.38 * r,
        baseY - 0.26 * r + wag * 1.8
      );
      c.stroke();
    }
  }

  // Blush dots
  c.fillStyle = 'rgba(255,127,168,0.45)';
  c.beginPath();
  c.ellipse(-0.60 * r, 0.24 * r, 0.105 * r, 0.062 * r, 0.15, 0, TAU);
  c.ellipse(0.60 * r, 0.24 * r, 0.105 * r, 0.062 * r, -0.15, 0, TAU);
  c.fill();

  c.restore();
}

function drawBrackets(c, rc, t) {
  const pad = Math.min(rc.w, rc.h) * 0.10 + 8;
  const x = rc.x - pad;
  const y = rc.y - pad;
  const w = rc.w + pad * 2;
  const h = rc.h + pad * 2;
  const seg = Math.min(w, h) * 0.22;
  const pulse = 0.55 + 0.35 * Math.sin(t * 5.2);

  c.save();
  c.strokeStyle = 'rgba(255,150,200,' + pulse + ')';
  c.lineWidth = 4;
  c.shadowColor = 'rgba(255,120,190,0.9)';
  c.shadowBlur = 16;
  c.beginPath();
  // top left
  c.moveTo(x, y + seg);
  c.lineTo(x, y);
  c.lineTo(x + seg, y);
  // top right
  c.moveTo(x + w - seg, y);
  c.lineTo(x + w, y);
  c.lineTo(x + w, y + seg);
  // bottom right
  c.moveTo(x + w, y + h - seg);
  c.lineTo(x + w, y + h);
  c.lineTo(x + w - seg, y + h);
  // bottom left
  c.moveTo(x + seg, y + h);
  c.lineTo(x, y + h);
  c.lineTo(x, y + h - seg);
  c.stroke();
  c.restore();
}

function drawSpark(c, x, y, size, warm, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = warm ? '#ffe28a' : '#ff9ec7';
  c.beginPath();
  c.moveTo(x, y - size);
  c.quadraticCurveTo(x + size * 0.18, y - size * 0.18, x + size, y);
  c.quadraticCurveTo(x + size * 0.18, y + size * 0.18, x, y + size);
  c.quadraticCurveTo(x - size * 0.18, y + size * 0.18, x - size, y);
  c.quadraticCurveTo(x - size * 0.18, y - size * 0.18, x, y - size);
  c.fill();
  c.restore();
}

function caption(c, W, H, text, alpha, yFrac, sizeFrac) {
  if (alpha <= 0.01) return;
  const size = Math.max(16, Math.min(W, H) * (sizeFrac || 0.048));
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.font = '900 ' + size + 'px "Arial Black", Impact, system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(4, size * 0.14);
  c.strokeStyle = 'rgba(18,14,30,0.92)';
  c.strokeText(text, W * 0.5, H * yFrac, W * 0.92);
  c.fillStyle = '#fff3f8';
  c.fillText(text, W * 0.5, H * yFrac, W * 0.92);
  c.restore();
}

function cue(t, a, b, fade) {
  if (t < a || t > b) return 0;
  const f = fade == null ? 0.22 : fade;
  return clamp(Math.min((t - a) / f, (b - t) / f), 0, 1);
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  if (!S) init(ctx);
  c.clearRect(0, 0, W, H);

  if (t >= END) {
    if (!S.doneFired) {
      S.doneFired = true;
      ctx.done();
    }
    return;
  }

  const sf = Math.min(W, H);
  const maxR = sf * 0.30;
  const baseScale = catScale(t);
  const r = Math.max(0.6, maxR * baseScale);
  const cx = W * 0.5;
  const cy = H * 0.53;

  const rc = streamerRect(ctx);

  // Sound cues
  const beep = (key, at, fn) => {
    if (!S.beeped[key] && t >= at) {
      S.beeped[key] = true;
      fn();
    }
  };
  beep('sniff', 0.42, () => ctx.sound.beep(180, 150));
  beep('inflate', 0.72, () => {
    ctx.sound.beep(240, 200);
    ctx.sound.beep(480, 160);
  });
  beep('arrive', 1.42, () => ctx.sound.beep(720, 120));
  beep('whoosh', 3.32, () => ctx.sound.noise(240));
  beep('boop', 3.5, () => {
    ctx.sound.beep(900, 90);
    ctx.sound.beep(1250, 70);
  });
  beep('settle', 4.1, () => ctx.sound.beep(560, 110));
  beep('fold', 6.8, () => {
    ctx.sound.noise(340);
    ctx.sound.beep(300, 180);
  });
  beep('mrrp', 7.62, () => {
    ctx.sound.beep(680, 130);
    ctx.sound.beep(940, 150);
  });
  beep('pop', 8.28, () => ctx.sound.beep(1120, 80));

  while (S.purrIdx < S.purrAt.length && t >= S.purrAt[S.purrIdx]) {
    ctx.sound.beep(58 + (S.purrIdx % 2) * 9, 170);
    S.purrIdx++;
  }

  // Body animation params
  let sx = 1;
  let sy = 1;
  let tilt = 0;
  let pupil = 1;
  let mouth = 0;
  let glowA = 1;

  if (t > 0.55 && t < 1.45) {
    const k = clamp((t - 0.55) / 0.9, 0, 1);
    const wob = Math.sin(k * Math.PI * 3.2) * (1 - k);
    sx = 1 + wob * 0.16;
    sy = 1 - wob * 0.16;
  }
  if (t > 3.3 && t < 4.2) {
    const k = clamp((t - 3.3) / 0.9, 0, 1);
    pupil = lerp(1, 1.45, Math.sin(k * Math.PI));
  }
  if (t > 4.35 && t < 5.6) {
    mouth = smooth(clamp((t - 4.35) / 0.3, 0, 1)) * smooth(clamp((5.6 - t) / 0.3, 0, 1)) * 0.35;
  }
  if (t > 5.9 && t < 6.75) {
    mouth = smooth(clamp((t - 5.9) / 0.3, 0, 1)) * smooth(clamp((6.75 - t) / 0.3, 0, 1));
  }
  if (t > 4.4) {
    tilt = Math.sin((t - 4.4) * 1.8) * 0.035;
  }
  if (t > 6.8 && t < 7.5) {
    glowA = 1 - clamp((t - 6.8) / 0.7, 0, 1) * 0.5;
  }

  let blinkTimes = [2.0, 5.15];
  if (t >= 7.5) blinkTimes = [7.72];
  let blink = blinkOpenAt(t, blinkTimes);
  if (t > 3.38 && t < 3.95) blink = 1;

  // Glow behind the cat
  if (baseScale > 0.05) {
    drawGlow(c, cx, cy, r, glowA * clamp(baseScale * 1.6, 0, 1), t);
  }

  // Camera targeting brackets while the cat is deciding
  if (rc && t > 3.2 && t < 7.0) {
    drawBrackets(c, rc, t);
  }

  // Sparks from the boop
  for (let i = 0; i < S.sparks.length; i++) {
    const sp = S.sparks[i];
    if (t < sp.at) continue;
    const age = t - sp.at;
    if (age > sp.life) continue;
    const k = age / sp.life;
    const ox = Math.cos(sp.a) * sp.sp * sf * 0.55 * easeOutCubic(k);
    const oy = Math.sin(sp.a) * sp.sp * sf * 0.4 * easeOutCubic(k) + k * k * sf * 0.12;
    const bx = rc ? rc.x + rc.w * 0.5 : cx;
    const by = rc ? rc.y + rc.h * 0.42 : cy - r * 0.1;
    drawSpark(c, bx + ox, by + oy, sp.size * sf * (1 - k * 0.6), sp.warm, (1 - k) * 0.95);
  }

  // Floating motes around the cat
  if (t > 1.2 && t < 6.9) {
    for (let i = 0; i < S.motes.length; i++) {
      const m = S.motes[i];
      const a = m.a + t * m.speed * 0.35;
      const rad = r * m.rad + Math.sin(t * 1.4 + m.wob) * r * 0.08;
      const mx = cx + Math.cos(a) * rad * 1.15;
      const my = cy + Math.sin(a) * rad * 0.85;
      const tw = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 3 + m.wob));
      drawSpark(c, mx, my, m.size * sf, m.warm, tw * 0.8);
    }
  }

  // The cat
  drawCatFace(c, cx, cy, r, {
    blink,
    pupil,
    mouth,
    tilt,
    sx,
    sy,
    whisk: t * 4.2,
    alpha: 1,
  });

  // Nose boop ring
  if (t > 3.45 && t < 4.15) {
    const k = clamp((t - 3.45) / 0.7, 0, 1);
    const by = cy + r * 0.26;
    c.save();
    c.globalAlpha = (1 - k) * 0.85;
    c.strokeStyle = '#ffd38a';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(cx, by, r * (0.18 + k * 0.85), 0, TAU);
    c.stroke();
    c.restore();
  }

  // Captions
  caption(c, W, H, 'THE CAT HAS ARRIVED.', cue(t, 1.55, 3.15, 0.25), 0.14, 0.05);
  caption(c, W, H, 'BOOP.', cue(t, 3.55, 4.6, 0.14), 0.14, 0.062);
  caption(c, W, H, 'SAVORYSAILOR HAS BEEN CHOSEN.', cue(t, 4.95, 6.75, 0.3), 0.865, 0.042);
  caption(c, W, H, 'mrrp.', cue(t, 7.55, 8.15, 0.14), 0.72, 0.036);

  // End pop ring
  if (t > 8.18 && t < 8.5) {
    const k = clamp((t - 8.18) / 0.32, 0, 1);
    c.save();
    c.globalAlpha = 1 - k;
    c.strokeStyle = 'rgba(255,190,220,0.9)';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(cx, cy, r * 2.4 + k * sf * 0.18, 0, TAU);
    c.stroke();
    c.restore();
  }
}

export function dispose(ctx) {
  S = null;
}
