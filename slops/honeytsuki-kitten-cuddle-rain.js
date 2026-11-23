// Kitten Cuddle Rain — transparent-glass overlay for SavorySailor's live shot.
// Kittens fall from the sky and cuddle the broadcaster's camera frame.

export const meta = {
  title: 'Kitten Cuddle Rain',
  author: 'honeytsuki',
  prompt: '!slop kitties fall from sky to cuddle camera man',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;

let S = null;

function r(ctx, a, b) {
  return a + (b - a) * ctx.rand();
}

const FURS = [
  { fur: '#fdf2e3', dark: '#8b6d4f', stripe: '#e6cfae', eye: '#2b2340', nose: '#ff9db3' },
  { fur: '#d7dde8', dark: '#5b6377', stripe: '#b3bccc', eye: '#2b2340', nose: '#ff9db3' },
  { fur: '#ffd3df', dark: '#a56277', stripe: '#ffbcd0', eye: '#43213a', nose: '#ff7f9f' },
  { fur: '#2f2a3f', dark: '#12101a', stripe: '#4a4260', eye: '#ffe27a', nose: '#ff9db3' },
  { fur: '#f6d7a9', dark: '#9c7442', stripe: '#e2bc85', eye: '#2b2340', nose: '#ff9db3' },
  { fur: '#e8e2ff', dark: '#7a6fa8', stripe: '#cfc6f2', eye: '#2b2340', nose: '#ff9db3' },
];

function buildKitten(ctx, i, tBorn, W, H, rect, base) {
  const role = i % 5 === 3 ? 'hug' : 'inside';
  const f = FURS[(i * 3 + 1) % FURS.length];
  const size = base * r(ctx, 0.062, 0.088);
  let hx, hy, rot = 0;
  if (role === 'inside') {
    hx = rect.x + rect.w * r(ctx, 0.2, 0.8);
    hy = rect.y + rect.h * r(ctx, 0.24, 0.72);
  } else {
    const edge = Math.floor(r(ctx, 0, 3));
    if (edge === 0) {
      hx = rect.x + rect.w * 0.035;
      hy = rect.y + rect.h * r(ctx, 0.3, 0.7);
      rot = -0.22;
    } else if (edge === 1) {
      hx = rect.x + rect.w * 0.965;
      hy = rect.y + rect.h * r(ctx, 0.3, 0.7);
      rot = 0.22;
    } else {
      hx = rect.x + rect.w * r(ctx, 0.3, 0.7);
      hy = rect.y + rect.h * 0.94;
      rot = r(ctx, -0.12, 0.12);
    }
  }
  return {
    role,
    fur: f,
    size,
    x: hx + r(ctx, -0.06, 0.06) * W,
    y: -size * 2 - r(ctx, 0, H * 0.25),
    vy: r(ctx, 60, 220),
    sx: hx,
    sy: hy,
    hx,
    hy,
    rot,
    wobble: r(ctx, 0, TAU),
    landed: false,
    landTime: 0,
    mewed: false,
    purred: false,
    purr: i % 2 === 0,
    tBorn,
  };
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const base = Math.min(W, H);
  const rect = ctx.streamer
    ? { x: ctx.streamer.x * W, y: ctx.streamer.y * H, w: ctx.streamer.w * W, h: ctx.streamer.h * H }
    : { x: W * 0.27, y: H * 0.2, w: W * 0.46, h: H * 0.64 };

  const N = 22;
  const kittens = [];
  for (let i = 0; i < N; i++) {
    const tb = 0.55 + 7.3 * Math.pow(i / (N - 1), 1.32);
    kittens.push(buildKitten(ctx, i, tb, W, H, rect, base));
  }

  S = {
    W,
    H,
    base,
    rect,
    kittens,
    hearts: [],
    nextHeart: 9.0,
    frameGlow: 0,
    done: false,
    fade: 1,
    endT: 13.1,
    purrFlip: false,
    captionPulse: 0,
  };
  S.captionSize = Math.max(13, Math.min(W * 0.036, 42));
}

function roundRect(g, x, y, w, h, rad) {
  const rr = Math.min(rad, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.arcTo(x + w, y, x + w, y + rr, rr);
  g.lineTo(x + w, y + h - rr);
  g.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  g.lineTo(x + rr, y + h);
  g.arcTo(x, y + h, x, y + h - rr, rr);
  g.lineTo(x, y + rr);
  g.arcTo(x, y, x + rr, y, rr);
  g.closePath();
}

function heart(g, x, y, s, alpha, col) {
  g.save();
  g.translate(x, y);
  g.scale(s, s);
  g.globalAlpha = alpha;
  g.fillStyle = col;
  g.beginPath();
  g.moveTo(0, 0.32);
  g.bezierCurveTo(-0.55, -0.12, -0.34, -0.55, 0, -0.24);
  g.bezierCurveTo(0.34, -0.55, 0.55, -0.12, 0, 0.32);
  g.closePath();
  g.fill();
  g.restore();
}

function drawKitten(g, k, t, alpha) {
  const u = k.size;
  const age = k.landed ? t - k.landTime : 0;
  let sx = 1;
  let sy = 1;
  if (k.landed) {
    const sq = Math.exp(-age * 7) * Math.cos(age * 20);
    sy = 1 - 0.32 * sq;
    sx = 1 + 0.26 * sq;
  } else {
    sy = 1.06;
    sx = 0.94;
  }
  const breath = 1 + (k.landed ? 0.045 * Math.sin(t * 2.6 + k.wobble) : 0);
  const snug = k.landed ? 1 + 0.05 * Math.sin(t * 4 + k.wobble) : 1;
  const tilt = k.rot + (k.landed ? Math.sin(t * 1.8 + k.wobble) * 0.05 : Math.sin(t * 2.4 + k.wobble) * 0.14);
  const happy = k.landed && age > 0.22;

  g.save();
  g.translate(k.x, k.y);
  g.rotate(tilt);
  g.globalAlpha = alpha;

  // soft ground/body shadow for readability over bright footage
  g.fillStyle = 'rgba(12,8,26,0.28)';
  g.beginPath();
  g.ellipse(u * 0.06, u * 0.52, u * 0.52, u * 0.16, 0, 0, TAU);
  g.fill();

  g.scale(sx * breath * snug, sy * breath * snug);

  // tail
  g.strokeStyle = k.fur.dark;
  g.lineWidth = u * 0.17;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(u * 0.3, u * 0.2);
  g.quadraticCurveTo(
    u * 0.78,
    u * 0.16 + Math.sin(t * 5 + k.wobble) * u * 0.22,
    u * 0.58,
    -u * 0.24 + Math.sin(t * 5 + k.wobble) * u * 0.12
  );
  g.stroke();

  // body
  g.fillStyle = k.fur.fur;
  g.strokeStyle = k.fur.dark;
  g.lineWidth = u * 0.055;
  g.beginPath();
  g.ellipse(0, u * 0.2, u * 0.46, u * 0.4, 0, 0, TAU);
  g.fill();
  g.stroke();

  // paws
  g.fillStyle = k.fur.fur;
  g.beginPath();
  g.ellipse(-u * 0.22, u * 0.5, u * 0.15, u * 0.1, -0.2, 0, TAU);
  g.ellipse(u * 0.22, u * 0.5, u * 0.15, u * 0.1, 0.2, 0, TAU);
  g.fill();
  g.stroke();

  // body stripes
  g.strokeStyle = k.fur.stripe;
  g.lineWidth = u * 0.07;
  g.beginPath();
  g.arc(0, u * 0.2, u * 0.36, Math.PI * 0.15, Math.PI * 0.5);
  g.stroke();

  // ears
  const earY = -u * 0.44;
  g.fillStyle = k.fur.fur;
  g.strokeStyle = k.fur.dark;
  g.lineWidth = u * 0.05;
  g.beginPath();
  g.moveTo(-u * 0.34, -u * 0.4);
  g.lineTo(-u * 0.24, earY - u * 0.3);
  g.lineTo(-u * 0.05, -u * 0.46);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(u * 0.34, -u * 0.4);
  g.lineTo(u * 0.24, earY - u * 0.3);
  g.lineTo(u * 0.05, -u * 0.46);
  g.closePath();
  g.fill();
  g.stroke();

  // head
  g.fillStyle = k.fur.fur;
  g.beginPath();
  g.ellipse(0, -u * 0.22, u * 0.38, u * 0.34, 0, 0, TAU);
  g.fill();
  g.stroke();

  // forehead stripes
  g.strokeStyle = k.fur.stripe;
  g.lineWidth = u * 0.055;
  g.beginPath();
  g.moveTo(-u * 0.1, -u * 0.5);
  g.lineTo(-u * 0.12, -u * 0.4);
  g.moveTo(0, -u * 0.53);
  g.lineTo(0, -u * 0.42);
  g.moveTo(u * 0.1, -u * 0.5);
  g.lineTo(u * 0.12, -u * 0.4);
  g.stroke();

  // eyes
  g.strokeStyle = k.fur.eye;
  g.fillStyle = k.fur.eye;
  g.lineWidth = u * 0.05;
  g.lineCap = 'round';
  const blink = !happy && Math.sin(t * 1.7 + k.wobble * 3) > 0.965;
  if (happy || blink) {
    g.beginPath();
    g.arc(-u * 0.15, -u * 0.19, u * 0.075, Math.PI * 1.1, Math.PI * 1.9);
    g.arc(u * 0.15, -u * 0.19, u * 0.075, Math.PI * 1.1, Math.PI * 1.9);
    g.stroke();
  } else {
    g.beginPath();
    g.ellipse(-u * 0.15, -u * 0.2, u * 0.065, u * 0.085, 0, 0, TAU);
    g.ellipse(u * 0.15, -u * 0.2, u * 0.065, u * 0.085, 0, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.arc(-u * 0.17, -u * 0.23, u * 0.022, 0, TAU);
    g.arc(u * 0.13, -u * 0.23, u * 0.022, 0, TAU);
    g.fill();
  }

  // blush
  g.fillStyle = 'rgba(255,140,170,0.5)';
  g.beginPath();
  g.ellipse(-u * 0.27, -u * 0.1, u * 0.07, u * 0.04, 0, 0, TAU);
  g.ellipse(u * 0.27, -u * 0.1, u * 0.07, u * 0.04, 0, 0, TAU);
  g.fill();

  // nose + mouth
  g.fillStyle = k.fur.nose;
  g.beginPath();
  g.moveTo(0, -u * 0.12);
  g.lineTo(-u * 0.035, -u * 0.085);
  g.lineTo(u * 0.035, -u * 0.085);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(40,24,50,0.8)';
  g.lineWidth = u * 0.028;
  g.beginPath();
  if (happy) {
    g.arc(-u * 0.04, -u * 0.06, u * 0.045, 0, Math.PI * 0.9);
    g.moveTo(u * 0.085, -u * 0.06);
    g.arc(u * 0.04, -u * 0.06, u * 0.045, Math.PI * 0.1, Math.PI * 1.0, true);
  } else {
    g.moveTo(-u * 0.05, -u * 0.055);
    g.lineTo(u * 0.05, -u * 0.055);
  }
  g.stroke();

  // whiskers
  g.strokeStyle = 'rgba(255,255,255,0.55)';
  g.lineWidth = u * 0.018;
  for (let s2 = -1; s2 <= 1; s2 += 2) {
    for (let w2 = 0; w2 < 2; w2++) {
      g.beginPath();
      g.moveTo(s2 * u * 0.24, -u * 0.1 + w2 * u * 0.05);
      g.lineTo(s2 * u * (0.52 + w2 * 0.04), -u * 0.14 + w2 * u * 0.13);
      g.stroke();
    }
  }

  g.restore();
}

function drawCaption(g, t, alpha, rect) {
  const size = S.captionSize;
  const main = t < 8.45 ? 'KITTEN WEATHER WARNING' : 'SAVORYSAILOR: FULLY CUDDLED';
  const sub = t < 8.45 ? 'cuddle front incoming · seek shelter immediately' : 'all units have made contact · do not move';

  const above = rect.y > 0.34 * S.H;
  const cx = S.W / 2;
  const cy = above ? Math.max(size * 2.4, rect.y - size * 1.5) : Math.min(S.H - size * 2.4, rect.y + rect.h + size * 1.5);

  g.save();
  g.globalAlpha = alpha;
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const boxW = Math.min(S.W * 0.94, Math.max(g.measureText(main).width, main.length * size * 0.62) + size * 2.2);
  const boxH = size * 2.1;
  g.fillStyle = 'rgba(16,12,34,0.62)';
  roundRect(g, cx - boxW / 2, cy - boxH / 2, boxW, boxH, size * 0.75);
  g.fill();
  g.strokeStyle = 'rgba(255,157,179,0.55)';
  g.lineWidth = Math.max(1.5, size * 0.06);
  g.stroke();

  g.fillStyle = '#ffe9ef';
  g.font = `800 ${size}px ui-rounded, 'Segoe UI', system-ui, sans-serif`;
  g.fillText(main, cx, cy - size * 0.34);
  g.fillStyle = 'rgba(255,196,214,0.92)';
  g.font = `500 ${size * 0.52}px 'Segoe UI', system-ui, sans-serif`;
  g.fillText(sub, cx, cy + size * 0.55);
  g.restore();
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const { W, H, rect, base } = S;

  g.clearRect(0, 0, W, H);

  const step = Math.min(dt || 0.016, 1 / 20);
  const punch = t >= 8.45;
  const fade = t > 11.7 ? Math.max(0, 1 - (t - 11.7) / 1.35) : 1;

  // ---- glow / rays behind the live shot area (semi-transparent only) ----
  const glowAmt = punch ? Math.min(1, (t - 8.45) / 0.5) : 0.18;
  if (glowAmt > 0) {
    const grad = g.createRadialGradient(
      rect.x + rect.w / 2,
      rect.y + rect.h / 2,
      Math.min(rect.w, rect.h) * 0.15,
      rect.x + rect.w / 2,
      rect.y + rect.h / 2,
      Math.max(rect.w, rect.h) * 0.85
    );
    grad.addColorStop(0, `rgba(255,206,146,${0.16 * glowAmt * fade})`);
    grad.addColorStop(1, 'rgba(255,206,146,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }
  if (punch) {
    g.save();
    g.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
    g.rotate(t * 0.35);
    const rays = 14;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU;
      g.rotate(TAU / rays);
      g.globalAlpha = 0.1 * fade * (0.6 + 0.4 * Math.sin(t * 3 + i));
      g.fillStyle = i % 2 ? '#ffd9a0' : '#ff9db3';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(Math.max(rect.w, rect.h) * 0.85, -base * 0.03);
      g.lineTo(Math.max(rect.w, rect.h) * 0.85, base * 0.03);
      g.closePath();
      g.fill();
    }
    g.restore();
  }

  // ---- cuddle-zone reticle on the real streamer ----
  if (!punch) {
    g.save();
    g.globalAlpha = 0.34 * fade * (0.75 + 0.25 * Math.sin(t * 3));
    g.strokeStyle = '#ffc4d6';
    g.lineWidth = Math.max(1.5, base * 0.004);
    g.setLineDash([base * 0.02, base * 0.02]);
    roundRect(g, rect.x + 4, rect.y + 4, rect.w - 8, rect.h - 8, base * 0.03);
    g.stroke();
    g.setLineDash([]);
    g.globalAlpha = 0.5 * fade;
    g.fillStyle = '#ffc4d6';
    g.font = `700 ${Math.max(11, base * 0.022)}px 'Segoe UI', system-ui, sans-serif`;
    g.textAlign = 'center';
    g.fillText('CUDDLE ZONE', rect.x + rect.w / 2, rect.y + rect.h - base * 0.035);
    g.restore();
  }

  // ---- kitten physics ----
  let landedCount = 0;
  for (const k of S.kittens) {    if (t < k.tBorn) continue;

    if (!k.landed) {
      k.vy += 2400 * step;
      k.y += k.vy * step;
      k.x += (k.hx - k.x) * Math.min(1, step * 1.4);
      if (k.y >= k.hy) {
        k.y = k.hy;
        k.landed = true;
        k.landTime = t;
        k.x = k.hx;
        if (!k.mewed && S.purrFlip) {
          try { ctx.sound.beep(520 + (k.size / base) * 4200, 90); } catch (e) {}
        }
        k.mewed = true;
        S.purrFlip = !S.purrFlip;
      }
    } else {
      landedCount++;
      // settle inward toward the frame's heart
      if (punch) {
        const tx = rect.x + rect.w * 0.5 + (k.hx - (rect.x + rect.w * 0.5)) * 0.72;
        const ty = rect.y + rect.h * 0.5 + (k.hy - (rect.y + rect.h * 0.5)) * 0.72;
        k.x += (tx - k.x) * Math.min(1, step * 1.1);
        k.y += (ty - k.y) * Math.min(1, step * 1.1);
      }
    }

    // landing purr rings + one purr sound per kitten (throttled)
    const age = k.landed ? t - k.landTime : 0;
    if (k.landed && age < 1.0) {
      g.save();
      g.globalAlpha = (1 - age) * 0.5 * fade;
      g.strokeStyle = '#ffd6e2';
      g.lineWidth = Math.max(1.2, base * 0.0035);
      for (let i = 0; i < 2; i++) {
        const p = Math.max(0, age - i * 0.22);
        if (p <= 0) continue;
        g.beginPath();
        g.arc(k.x, k.y + k.size * 0.2, k.size * (0.5 + p * 1.9), 0, TAU);
        g.stroke();
      }
      g.restore();
      if (!k.purred) {
        k.purred = true;
        if (k.purr) {
          try { ctx.sound.beep(64 + k.size * 2, 260); } catch (e) {}
        }
      }
    }

    // fall dust trail
    if (!k.landed && k.vy > 400) {
      g.save();
      g.globalAlpha = 0.3 * fade;
      g.fillStyle = '#ffe6ee';
      for (let i = 0; i < 3; i++) {
        const d = (i + 1) * k.size * 0.55;
        g.beginPath();
        g.arc(k.x + Math.sin(t * 9 + i * 2 + k.wobble) * k.size * 0.16, k.y - d, k.size * 0.05 * (3 - i), 0, TAU);
        g.fill();
      }
      g.restore();
    }
  }

  // draw kittens back-to-front by y
  const drawable = S.kittens.filter((k) => t >= k.tBorn && k.y > 0);
  drawable.sort((a, b) => a.y - b.y);
  for (const k of drawable) drawKitten(g, k, t, fade);

  // ---- hearts after the punchline ----
  if (punch && t >= S.nextHeart && t < 12.9) {
    S.nextHeart = t + 0.16;
    const k = S.kittens[Math.floor(ctx.rand() * S.kittens.length)];
    S.hearts.push({
      x: k.hx + r(ctx, -base * 0.06, base * 0.06),
      y: k.hy - base * 0.01,
      vy: -base * 0.06 - ctx.rand() * base * 0.05,
      vx: r(ctx, -base * 0.012, base * 0.012),
      s: base * r(ctx, 0.016, 0.03),
      life: 0,
      max: r(ctx, 1.2, 2.2),
      rot: r(ctx, -0.4, 0.4),
      col: ctx.rand() > 0.5 ? '#ff9db3' : '#ffd9a0',
    });
    if (S.hearts.length > 40) S.hearts.shift();
  }
  for (let i = S.hearts.length - 1; i >= 0; i--) {
    const h = S.hearts[i];
    h.life += step;
    h.x += h.vx;
    h.y += h.vy;
    h.vy *= 0.995;
    const a = Math.max(0, 1 - h.life / h.max) * 0.9 * fade;
    heart(g, h.x, h.y, h.s, a, h.col);
    if (h.life >= h.max) S.hearts.splice(i, 1);
  }

  // ---- caption ----
  if (t > 0.45 && t < 11.9) {
    const inA = Math.min(1, (t - 0.45) / 0.35);
    const outA = t > 11.2 ? Math.max(0, 1 - (t - 11.2) / 0.7) : 1;
    drawCaption(g, t, inA * outA, rect);
  }

  // ---- finale sparkle around the crown of the frame ----
  if (punch) {
    g.save();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + t * 0.4;
      const rad = Math.max(rect.w, rect.h) * (0.52 + 0.04 * Math.sin(t * 5 + i));
      const x = rect.x + rect.w / 2 + Math.cos(a) * rad;
      const y = rect.y + rect.h / 2 + Math.sin(a) * rad * 0.8;
      const tw = 0.5 + 0.5 * Math.sin(t * 8 + i * 1.7);
      g.globalAlpha = tw * 0.65 * fade;
      g.fillStyle = i % 3 === 0 ? '#ffd9a0' : '#ffe9ef';
      g.beginPath();
      g.arc(x, y, base * (0.004 + tw * 0.005), 0, TAU);
      g.fill();
    }
    g.restore();
  }

  if (t >= S.endT && !S.done) {
    S.done = true;
    ctx.done();
  }
}

export function dispose(ctx) {}
