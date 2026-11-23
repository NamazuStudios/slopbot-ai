export const meta = {
  title: 'Squirmy Heart Handoff',
  author: 'cooooter',
  prompt: 'a little squirmy man with a blonde mohawk and smushed face appears on the left side of the stream confused where he is',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

let S = null;

const PH = {
  notice: 3.2,
  walk0: 5.4,
  walk1: 9.8,
  reach0: 9.8,
  reach1: 10.9,
  rummage1: 14.2,
  pull0: 14.6,
  hAppear: 15.0,
  hold0: 15.6,
  handoff0: 17.6,
  arrive: 19.4,
  exit0: 21.0,
  exit1: 23.6,
  end: 23.9,
};

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, k) { return a + (b - a) * k; }
function smooth(k) { return k * k * (3 - 2 * k); }
function easeIn(k) { return k * k * k; }
function easeOut(k) { return 1 - Math.pow(1 - k, 3); }
function easeInOut(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
function backOut(k) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
}
function seg(t, a, b) { return clamp((t - a) / (b - a), 0, 1); }

export function init(ctx) {
  S = {
    fired: {},
    done: false,
    lastStep: -1,
    lastExitStep: -1,
    sparks: [],
  };
  for (let i = 0; i < 30; i++) {
    S.sparks.push({
      a: ctx.rand() * Math.PI * 2,
      d: 0.5 + ctx.rand() * 1.7,
      sz: 0.4 + ctx.rand() * 1.2,
      delay: ctx.rand() * 0.05,
    });
  }
}

function cue(ctx, t, key, when, fn) {
  if (t >= when && !S.fired[key]) {
    S.fired[key] = true;
    try { fn(); } catch (e) { /* sound is best effort */ }
  }
}

function beep(ctx, f, ms) {
  if (ctx.sound && ctx.sound.beep) ctx.sound.beep(f, ms);
}
function noise(ctx, ms) {
  if (ctx.sound && ctx.sound.noise) ctx.sound.noise(ms);
}

function drawHeart(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y + r * 0.78);
  c.bezierCurveTo(x - r * 1.4, y - r * 0.28, x - r * 0.55, y - r * 1.18, x, y - r * 0.34);
  c.bezierCurveTo(x + r * 0.55, y - r * 1.18, x + r * 1.4, y - r * 0.28, x, y + r * 0.78);
  c.closePath();
}

function star(c, x, y, r, alpha) {
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = '#ffe9f1';
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
  c.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
  c.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
  c.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
  c.fill();
  c.restore();
}

function drawArm(c, sx, sy, hx, hy, uu, dir) {
  const bow = uu * 0.65;
  const mx = (sx + hx) / 2;
  const my = (sy + hy) / 2 + bow;
  c.save();
  c.lineCap = 'round';
  c.strokeStyle = '#171027';
  c.lineWidth = uu * 0.36;
  c.beginPath();
  c.moveTo(sx, sy);
  c.quadraticCurveTo(mx, my, hx, hy);
  c.stroke();
  c.strokeStyle = '#f2c0a4';
  c.lineWidth = uu * 0.24;
  c.beginPath();
  c.moveTo(sx, sy);
  c.quadraticCurveTo(mx, my, hx, hy);
  c.stroke();
  c.fillStyle = '#171027';
  c.beginPath();
  c.arc(hx, hy, uu * 0.24, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f2c0a4';
  c.beginPath();
  c.arc(hx, hy, uu * 0.19, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawMan(c, x, gy, uu, o) {
  const t = o.t;
  const dir = o.dir;
  const wk = o.walk || 0;
  const ph = t * 11;
  const ink = '#171027';
  const skin = '#f2c0a4';
  const shirt = '#3fc0ad';
  const lw = Math.max(2, uu * 0.09);

  c.save();
  c.translate(x, gy);
  const sc = o.scale == null ? 1 : o.scale;
  c.scale(dir * sc, sc);
  c.rotate((o.tilt || 0) + Math.sin(t * 6.2) * 0.03 + (o.shake ? Math.sin(t * 47) * 0.055 : 0));

  // legs
  const drawLeg = (hipX, fx, lift) => {
    c.lineCap = 'round';
    c.strokeStyle = ink;
    c.lineWidth = uu * 0.36;
    c.beginPath();
    c.moveTo(hipX, -2.2 * uu);
    c.lineTo(fx, -0.12 * uu + lift);
    c.stroke();
    c.strokeStyle = skin;
    c.lineWidth = uu * 0.26;
    c.beginPath();
    c.moveTo(hipX, -2.2 * uu);
    c.lineTo(fx, -0.12 * uu + lift);
    c.stroke();
    c.fillStyle = ink;
    c.beginPath();
    c.ellipse(fx + 0.13 * uu, -0.05 * uu + lift, 0.32 * uu, 0.17 * uu, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2c2450';
    c.beginPath();
    c.ellipse(fx + 0.14 * uu, -0.06 * uu + lift, 0.25 * uu, 0.11 * uu, 0, 0, Math.PI * 2);
    c.fill();
  };
  const swing = Math.sin(ph) * 0.34 * uu * wk;
  const liftA = -Math.max(0, Math.sin(ph)) * 0.36 * uu * wk;
  const liftB = -Math.max(0, Math.sin(ph + Math.PI)) * 0.36 * uu * wk;
  drawLeg(-0.32 * uu, -0.42 * uu + swing, liftA);
  drawLeg(0.32 * uu, 0.42 * uu - swing, liftB);

  // shorts
  c.fillStyle = '#2b2450';
  c.strokeStyle = ink;
  c.lineWidth = lw;
  c.beginPath();
  c.ellipse(0, -2.38 * uu, 0.78 * uu, 0.6 * uu, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // torso
  c.fillStyle = shirt;
  c.strokeStyle = ink;
  c.lineWidth = lw;
  c.beginPath();
  c.ellipse(0, -3.35 * uu, 1.0 * uu, 1.18 * uu, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.globalAlpha = 0.25;
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(-0.32 * uu, -3.8 * uu, 0.34 * uu, 0.42 * uu, 0, 0, Math.PI * 2);
  c.fill();
  c.globalAlpha = 1;

  // back arm
  c.strokeStyle = ink;
  c.lineWidth = uu * 0.34;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-0.85 * uu, -3.5 * uu);
  c.quadraticCurveTo(-1.5 * uu, -2.9 * uu + Math.sin(t * 7) * 0.15 * uu, -1.5 * uu, -2.4 * uu);
  c.stroke();
  c.strokeStyle = '#e0ab90';
  c.lineWidth = uu * 0.22;
  c.beginPath();
  c.moveTo(-0.85 * uu, -3.5 * uu);
  c.quadraticCurveTo(-1.5 * uu, -2.9 * uu + Math.sin(t * 7) * 0.15 * uu, -1.5 * uu, -2.4 * uu);
  c.stroke();

  // head
  c.save();
  c.translate(0.08 * uu, -4.85 * uu);
  c.rotate(o.headTilt || 0);
  // neck
  c.fillStyle = skin;
  c.strokeStyle = ink;
  c.lineWidth = lw;
  c.beginPath();
  c.rect(-0.3 * uu, 0.2 * uu, 0.6 * uu, 0.7 * uu);
  c.fill();
  c.stroke();

  // smushed head
  c.beginPath();
  c.ellipse(0, 0, 1.55 * uu, 1.02 * uu, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // blonde mohawk
  c.fillStyle = '#f5c93f';
  c.strokeStyle = '#a8841a';
  c.lineWidth = Math.max(1.2, uu * 0.055);
  for (let i = 0; i < 7; i++) {
    const bx = -1.02 * uu + i * 0.34 * uu;
    const lean = (i - 3) * 0.06 * uu;
    const hgt = (0.62 + Math.sin(i * 1.7) * 0.16) * uu;
    const wob = Math.sin(t * 8 + i * 0.9) * 0.06 * uu;
    c.beginPath();
    c.moveTo(bx - 0.2 * uu, -0.86 * uu);
    c.lineTo(bx + lean + wob, -0.86 * uu - hgt);
    c.lineTo(bx + 0.2 * uu, -0.86 * uu);
    c.closePath();
    c.fill();
    c.stroke();
  }
  c.strokeStyle = ink;
  c.lineWidth = lw * 0.7;
  c.beginPath();
  c.ellipse(0, -0.95 * uu, 1.25 * uu, 0.22 * uu, 0, Math.PI, Math.PI * 2);
  c.stroke();

  // face
  const face = o.face || 'confused';
  const ex = 0.12 * uu;
  if (face === 'notice') {
    for (const exx of [ex - 0.52 * uu, ex + 0.44 * uu]) {
      c.fillStyle = '#ffffff';
      c.strokeStyle = ink;
      c.lineWidth = lw * 0.8;
      c.beginPath();
      c.ellipse(exx, -0.02 * uu, 0.31 * uu, 0.33 * uu, 0, 0, Math.PI * 2);
      c.fill();
      c.stroke();
      c.fillStyle = ink;
      c.beginPath();
      c.arc(exx + 0.1 * uu, -0.02 * uu, 0.12 * uu, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = '#4a2030';
    c.beginPath();
    c.ellipse(ex, 0.48 * uu, 0.2 * uu, 0.26 * uu, 0, 0, Math.PI * 2);
    c.fill();
  } else if (face === 'happy') {
    c.strokeStyle = ink;
    c.lineWidth = Math.max(2, uu * 0.085);
    c.lineCap = 'round';
    for (const exx of [ex - 0.52 * uu, ex + 0.44 * uu]) {
      c.beginPath();
      c.arc(exx, 0.02 * uu, 0.19 * uu, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    }
    c.beginPath();
    c.arc(ex, 0.22 * uu, 0.42 * uu, 0.15 * Math.PI, 0.85 * Math.PI);
    c.stroke();
  } else if (face === 'focus') {
    c.fillStyle = ink;
    for (const exx of [ex - 0.52 * uu, ex + 0.44 * uu]) {
      c.beginPath();
      c.ellipse(exx, -0.02 * uu, 0.11 * uu, 0.14 * uu, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = ink;
    c.lineWidth = Math.max(2, uu * 0.08);
    c.beginPath();
    c.moveTo(ex - 0.32 * uu, 0.46 * uu);
    c.quadraticCurveTo(ex, 0.58 * uu, ex + 0.34 * uu, 0.46 * uu);
    c.stroke();
  } else {
    c.fillStyle = ink;
    for (const exx of [ex - 0.52 * uu, ex + 0.44 * uu]) {
      c.beginPath();
      c.ellipse(exx, -0.02 * uu, 0.14 * uu, 0.17 * uu, 0, 0, Math.PI * 2);
      c.fill();
    }
    c.strokeStyle = ink;
    c.lineWidth = Math.max(2, uu * 0.075);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(ex - 0.42 * uu, 0.5 * uu);
    c.quadraticCurveTo(ex - 0.14 * uu, 0.38 * uu, ex + 0.06 * uu, 0.52 * uu);
    c.quadraticCurveTo(ex + 0.26 * uu, 0.66 * uu, ex + 0.46 * uu, 0.48 * uu);
    c.stroke();
  }
  // tiny nose
  c.strokeStyle = '#c98d75';
  c.lineWidth = Math.max(1.5, uu * 0.06);
  c.beginPath();
  c.arc(ex, 0.24 * uu, 0.16 * uu, Math.PI * 0.15, Math.PI * 0.85);
  c.stroke();

  c.restore();
  c.restore();
}

function caption(c, uu, text, x, y, alpha) {
  if (alpha <= 0.01) return;
  const size = Math.round(uu * 0.62);
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.font = '700 ' + size + 'px system-ui, "Segoe UI", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = Math.max(4, size * 0.22);
  c.strokeStyle = 'rgba(18, 12, 34, 0.92)';
  c.strokeText(text, x, y);
  c.fillStyle = '#fff6fb';
  c.fillText(text, x, y);
  c.restore();
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  const u = Math.min(W, H) * 0.048;
  const st = ctx.streamer && ctx.streamer.w > 0 && ctx.streamer.h > 0 ? ctx.streamer : null;
  const rect = st ? { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H } : null;
  const chest = rect
    ? {
        x: clamp(rect.x + rect.w * 0.5, W * 0.18, W * 0.86),
        y: clamp(rect.y + rect.h * 0.6, H * 0.2, H * 0.8),
      }
    : { x: W * 0.6, y: H * 0.44 };

  const startX = W * 0.1;
  const standX = clamp(chest.x - W * 0.15, W * 0.09, W * 0.4);
  const groundY = clamp(chest.y + H * 0.26, H * 0.6, H * 0.9);

  // ---- timeline ----
  const walkP = seg(t, PH.walk0, PH.walk1);
  const exitP = seg(t, PH.exit0, PH.exit1);

  let manX = lerp(startX, standX, easeInOut(walkP));
  if (exitP > 0) manX = lerp(standX, -W * 0.2, easeIn(exitP));
  const dir = exitP > 0 ? -1 : 1;

  let walkAmt = 0;
  if (walkP > 0 && walkP < 1) walkAmt = 0.85;
  if (exitP > 0 && exitP < 1) walkAmt = 1;
  if (t > PH.rummage1 - 0.6 && t < PH.pull0) walkAmt = 0.25;

  const popSc = backOut(clamp(t / 0.5, 0, 1));
  const bob = walkAmt > 0 ? -Math.abs(Math.sin(t * 11)) * u * 0.22 : 0;

  let face = 'confused';
  if (t >= PH.notice) face = 'notice';
  if (t >= PH.walk0) face = 'focus';
  if (t >= PH.arrive) face = 'happy';

  const headTilt =
    t < PH.notice
      ? Math.sin(t * 2.6) * 0.3
      : t < PH.walk0
        ? Math.sin(t * 3.4) * 0.08
        : 0;

  const shaking = t > PH.reach1 + 0.2 && t < PH.rummage1;

  // ---- arm + heart geometry ----
  const shoulder = { x: manX + dir * 0.85 * u, y: groundY - 3.45 * u + bob };
  const idle = { x: shoulder.x + dir * 0.55 * u, y: shoulder.y + 1.05 * u + Math.sin(t * 3) * u * 0.07 };
  const hold = { x: manX + dir * 1.72 * u, y: groundY - 4.05 * u + bob };
  const wave = { x: manX + dir * 1.85 * u, y: groundY - 5.35 * u + Math.sin(t * 7.5) * u * 0.28 + bob };

  let hand;
  if (t < PH.reach0) {
    hand = idle;
  } else if (t < PH.reach1) {
    const k = easeOut(seg(t, PH.reach0, PH.reach1));
    hand = { x: lerp(idle.x, chest.x, k), y: lerp(idle.y, chest.y, k) };
  } else if (t < PH.rummage1) {
    hand = {
      x: chest.x + Math.sin(t * 27) * u * 0.1,
      y: chest.y + Math.sin(t * 5.3) * u * 0.22 + Math.sin(t * 31) * u * 0.07,
    };
  } else if (t < PH.hold0) {
    const k = easeInOut(seg(t, PH.pull0, PH.hold0));
    hand = { x: lerp(chest.x, hold.x, k), y: lerp(chest.y, hold.y, k) - Math.sin(k * Math.PI) * u * 0.9 };
  } else if (t < PH.handoff0) {
    hand = { x: hold.x, y: hold.y + Math.sin(t * 4) * u * 0.06 };
  } else if (t < PH.arrive) {
    const k = smooth(seg(t, PH.handoff0, PH.arrive));
    hand = { x: lerp(hold.x, wave.x, k), y: lerp(hold.y, wave.y, k) };
  } else {
    hand = { x: wave.x, y: wave.y };
  }
  if (exitP > 0) {
    hand = { x: manX + dir * 1.15 * u, y: groundY - 4.2 * u + Math.sin(t * 12) * u * 0.35 };
  }

  // ---- streamer frame ring ----
  if (rect && t > PH.notice - 0.4) {
    const beat = 0.5 + 0.5 * Math.sin(t * 3.2);
    let a = 0.22 + beat * 0.16;
    if (t > PH.pull0 && t < PH.arrive) a += 0.18 * (0.5 + 0.5 * Math.sin(t * 12));
    c.save();
    c.strokeStyle = 'rgba(255, 96, 142, ' + a.toFixed(3) + ')';
    c.lineWidth = Math.max(2, u * 0.06);
    c.setLineDash([u * 0.28, u * 0.24]);
    c.lineDashOffset = -t * u * 0.4;
    c.strokeRect(rect.x + 3, rect.y + 3, Math.max(1, rect.w - 6), Math.max(1, rect.h - 6));
    c.restore();
  }

  // ---- chest mark ----
  if (t > PH.reach1) {
    const ringA = t < PH.arrive ? 0.45 : 0.16;
    c.save();
    c.strokeStyle = 'rgba(255, 150, 185, ' + ringA + ')';
    c.lineWidth = Math.max(2, u * 0.05);
    c.beginPath();
    c.arc(chest.x, chest.y, u * (0.55 + Math.sin(t * 4) * 0.08), 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // ---- shadow ----
  c.save();
  c.globalAlpha = 0.22;
  c.fillStyle = '#0a0618';
  c.beginPath();
  c.ellipse(manX, groundY + u * 0.05, u * 1.35 * (popSc < 1 ? popSc : 1), u * 0.26, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // ---- dust ----
  if (walkAmt > 0.5) {
    for (let k = 0; k < 5; k++) {
      const age = (walkP > 0 && walkP < 1 ? walkP : exitP) * 5.5 - k;
      if (age > 0 && age < 1.2) {
        const jitterX = Math.sin(k * 12.9898) * u * 0.4;
        const px = manX + jitterX - dir * age * u * 0.5;
        const py = groundY - age * u * 0.35;
        c.save();
        c.globalAlpha = 0.25 * (1 - age / 1.2);
        c.fillStyle = '#d9cde4';
        c.beginPath();
        c.arc(px, py, u * (0.16 + age * 0.22), 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
  }

  // ---- the man ----
  drawMan(c, manX, groundY + bob, u, {
    t,
    dir,
    walk: walkAmt,
    scale: popSc,
    face,
    headTilt,
    shake: shaking,
    tilt: 0,
  });

  // ---- reaching arm ----
  if (popSc > 0.25) drawArm(c, shoulder.x, shoulder.y, hand.x, hand.y, u, dir);

  // ---- heart ----
  let heart = null;
  if (t >= PH.hAppear) {
    const pop = backOut(seg(t, PH.hAppear, PH.hAppear + 0.5));
    let hx = hand.x + dir * u * 0.15;
    let hy = hand.y - u * 0.25;
    let hr = u * 0.95;

    if (t >= PH.handoff0 && t < PH.arrive) {
      const k = smooth(seg(t, PH.handoff0, PH.arrive));
      const cx = (hold.x + chest.x) / 2 + u * 0.4;
      const cy = Math.min(hold.y, chest.y) - u * 1.6;
      const ik = 1 - k;
      hx = ik * ik * hold.x + 2 * ik * k * cx + k * k * chest.x;
      hy = ik * ik * hold.y + 2 * ik * k * cy + k * k * chest.y;
    } else if (t >= PH.arrive) {
      const b = 1 + Math.sin((t - PH.arrive) * 7.5) * 0.07;
      hx = chest.x;
      hy = chest.y + Math.sin((t - PH.arrive) * 2.2) * u * 0.1;
      hr = u * 0.95 * b;
    }
    heart = { x: hx, y: hy, r: hr * pop, glow: pop };
  }

  if (heart && heart.r > 0.5) {
    // soft glow, small radius only
    const g = c.createRadialGradient(heart.x, heart.y, 0, heart.x, heart.y, heart.r * 3.2);
    g.addColorStop(0, 'rgba(255, 90, 140, 0.22)');
    g.addColorStop(1, 'rgba(255, 90, 140, 0)');
    c.save();
    c.fillStyle = g;
    c.beginPath();
    c.arc(heart.x, heart.y, heart.r * 3.2, 0, Math.PI * 2);
    c.fill();
    c.restore();

    c.save();
    c.lineJoin = 'round';
    c.strokeStyle = '#7d1039';
    c.lineWidth = Math.max(3, u * 0.1);
    drawHeart(c, heart.x, heart.y, heart.r);
    c.fillStyle = '#ff5c8a';
    c.fill();
    c.stroke();
    c.globalAlpha = 0.55;
    c.fillStyle = '#ffd3e2';
    c.beginPath();
    c.ellipse(heart.x - heart.r * 0.42, heart.y - heart.r * 0.32, heart.r * 0.22, heart.r * 0.28, -0.5, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  // ---- pull burst ----
  const burstAge = t - PH.hAppear;
  if (burstAge > 0 && burstAge < 1.15) {
    for (let i = 0; i < S.sparks.length; i++) {
      const sp = S.sparks[i];
      const age = burstAge - sp.delay;
      if (age <= 0 || age > 1) continue;
      const d = easeOut(age) * sp.d * u * 2.1;
      const x = chest.x + Math.cos(sp.a) * d;
      const y = chest.y + Math.sin(sp.a) * d * 0.85 - age * u * 0.4;
      star(c, x, y, u * 0.2 * sp.sz * (1 - age * 0.4), 1 - age);
    }
  }

  // ---- resting sparkles ----
  if (t > PH.arrive) {
    for (let i = 0; i < 5; i++) {
      const a = t * 1.1 + i * 1.35;
      const x = chest.x + Math.cos(a) * u * 1.9;
      const y = chest.y + Math.sin(a * 1.3) * u * 1.15;
      star(c, x, y, u * 0.16, 0.35 + 0.4 * Math.sin(t * 3 + i));
    }
  }

  // ---- confusion puffs ----
  if (t > 0.9 && t < PH.notice) {
    const size = u * 0.55;
    c.save();
    c.font = '700 ' + Math.round(size) + 'px system-ui, sans-serif';
    c.textAlign = 'center';
    c.lineWidth = Math.max(3, size * 0.2);
    for (let i = 0; i < 3; i++) {
      const local = t - 0.9 - i * 0.55;
      if (local < 0 || local > 1.4) continue;
      const a = 1 - local / 1.4;
      const qx = manX + (i - 1) * u * 0.9 + Math.sin(t * 2 + i) * u * 0.2;
      const qy = groundY - u * 7.2 - local * u * 0.8;
      c.globalAlpha = a * 0.9;
      c.strokeStyle = 'rgba(18,12,34,0.9)';
      c.strokeText('?', qx, qy);
      c.fillStyle = '#ffe9f1';
      c.fillText('?', qx, qy);
    }
    c.restore();
  }

  // ---- notice bang ----
  if (t > PH.notice + 0.05 && t < PH.notice + 1.4) {
    const age = t - PH.notice;
    const s = 1 + Math.sin(age * 14) * 0.12;
    c.save();
    c.translate(manX, groundY - u * 7.6);
    c.scale(s, s);
    c.font = '900 ' + Math.round(u * 1.05) + 'px system-ui, sans-serif';
    c.textAlign = 'center';
    c.lineWidth = Math.max(4, u * 0.22);
    c.strokeStyle = 'rgba(18,12,34,0.9)';
    c.strokeText('!', 0, 0);
    c.fillStyle = '#ff6b9d';
    c.fillText('!', 0, 0);
    c.restore();
  }

  // ---- captions ----
  const capY = H * 0.91;
  caption(c, u, 'this is not my apartment', W * 0.5, capY, Math.min(seg(t, 0.9, 1.5), 1 - seg(t, 2.8, 3.3)));
  caption(c, u, 'who is that. why is he glowing', W * 0.5, capY, Math.min(seg(t, PH.notice + 0.15, PH.notice + 0.7), 1 - seg(t, 4.9, 5.3)));
  caption(c, u, 'sorry. this will only take a second', W * 0.5, capY, Math.min(seg(t, PH.walk0 + 0.2, PH.walk0 + 0.7), 1 - seg(t, 9.0, 9.4)));
  caption(c, u, 'you left this in there', W * 0.5, capY, Math.min(seg(t, PH.arrive + 0.1, PH.arrive + 0.6), 1 - seg(t, 21.0, 21.4)));
  caption(c, u, "you're welcome, savorysailor", W * 0.5, capY, Math.min(seg(t, 21.25, 21.75), 1 - seg(t, PH.exit1, PH.exit1 + 0.3)));

  // ---- sounds ----
  cue(ctx, t, 'pop', 0.02, () => beep(ctx, 520, 110));
  cue(ctx, t, 'q1', 1.1, () => beep(ctx, 620, 70));
  cue(ctx, t, 'q2', 2.05, () => beep(ctx, 560, 70));
  cue(ctx, t, 'notice', PH.notice, () => beep(ctx, 900, 150));
  cue(ctx, t, 'reach', PH.reach0 + 0.1, () => noise(ctx, 140));
  cue(ctx, t, 'thump1', 10.8, () => { beep(ctx, 110, 130); noise(ctx, 90); });
  cue(ctx, t, 'thump2', 11.5, () => { beep(ctx, 95, 120); noise(ctx, 80); });
  cue(ctx, t, 'thump3', 12.2, () => { beep(ctx, 120, 130); noise(ctx, 95); });
  cue(ctx, t, 'thump4', 12.9, () => { beep(ctx, 100, 120); noise(ctx, 85); });
  cue(ctx, t, 'squeeze', 13.7, () => noise(ctx, 200));
  cue(ctx, t, 'pull1', PH.hAppear, () => { beep(ctx, 330, 90); noise(ctx, 120); });
  cue(ctx, t, 'pull2', PH.hAppear + 0.12, () => beep(ctx, 780, 150));
  cue(ctx, t, 'fan1', PH.arrive, () => beep(ctx, 523, 140));
  cue(ctx, t, 'fan2', PH.arrive + 0.18, () => beep(ctx, 659, 140));
  cue(ctx, t, 'fan3', PH.arrive + 0.36, () => beep(ctx, 784, 260));
  cue(ctx, t, 'settle', 21.3, () => beep(ctx, 440, 180));
  cue(ctx, t, 'bye', 23.0, () => beep(ctx, 660, 220));

  // footsteps
  if (walkP > 0 && walkP < 1) {
    const step = Math.floor((t - PH.walk0) / 0.27);
    if (step >= 0 && step !== S.lastStep) {
      S.lastStep = step;
      noise(ctx, 50);
    }
  }
  if (exitP > 0 && exitP < 1) {
    const step = Math.floor((t - PH.exit0) / 0.24);
    if (step >= 0 && step !== S.lastExitStep) {
      S.lastExitStep = step;
      noise(ctx, 45);
    }
  }

  // ---- end ----
  if (t >= PH.end && !S.done) {
    S.done = true;
    ctx.done();
  }
}

export function dispose(ctx) {}
