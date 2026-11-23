export const meta = {
  title: 'Sky Frankfurter',
  author: 'okiedokie24',
  prompt: 'when a user types !dogg a raw hot dog falls from the sky, bounces around and then goes towards the streamers camera',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!dogg"] }
  ],
};

let S = null;

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const k = Math.max(0.4, Math.min(W, H) / 900);
  S = {
    k,
    x: W * (0.28 + ctx.rand() * 0.44),
    y: -140 * k,
    vx: (ctx.rand() * 2 - 1) * 160,
    vy: 140,
    ang: ctx.rand() * Math.PI * 2,
    spin: (ctx.rand() * 2 - 1) * 6,
    bounces: 0,
    homingT: 0,
    phase: 'fall',
    splatAt: -1,
    splatX: W * 0.5,
    splatY: H * 0.4,
    splats: [],
    trail: [],
    lastTrailX: -999,
    lastTrailY: -999,
    hit: false,
  };
}

export function dispose() {
  S = null;
}

function caption(g, txt, x, y, size, alpha, fill) {
  g.save();
  g.globalAlpha = Math.max(0, Math.min(1, alpha));
  g.font = '900 ' + size + 'px Arial, Helvetica, sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(4, size * 0.14);
  g.strokeStyle = 'rgba(14, 18, 42, 0.92)';
  g.strokeText(txt, x, y);
  g.fillStyle = fill || '#ffffff';
  g.fillText(txt, x, y);
  g.restore();
}

function drawSausage(g, x, y, ang, k, sx, sy, alpha, dead) {
  const L = 96 * k;
  const R = 21 * k;
  g.save();
  g.globalAlpha = Math.max(0, Math.min(1, alpha));
  g.translate(x, y);
  g.rotate(ang);
  g.scale(sx, sy);

  g.lineJoin = 'round';
  g.lineWidth = 4 * k;

  // shadow
  g.save();
  g.translate(6 * k, 8 * k);
  g.globalAlpha = 0.28 * alpha;
  g.fillStyle = '#0b1026';
  g.beginPath();
  g.ellipse(0, 0, L * 0.92, R * 1.15, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  // raw link body
  const grad = g.createLinearGradient(0, -R, 0, R);
  grad.addColorStop(0, '#f7b3ab');
  grad.addColorStop(0.55, '#eb918a');
  grad.addColorStop(1, '#c96b68');
  g.fillStyle = grad;
  g.strokeStyle = 'rgba(90, 26, 36, 0.65)';
  g.beginPath();
  g.moveTo(-L + R, -R);
  g.lineTo(L - R, -R);
  g.arc(L - R, 0, R, -Math.PI / 2, Math.PI / 2);
  g.lineTo(-L + R, R);
  g.arc(-L + R, 0, R, Math.PI / 2, Math.PI * 1.5);
  g.closePath();
  g.fill();
  g.stroke();

  // casing sheen
  g.globalAlpha = 0.7 * alpha;
  g.fillStyle = '#ffe2dd';
  g.beginPath();
  g.ellipse(-8 * k, -9 * k, L * 0.5, 4.6 * k, 0, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = alpha;

  // tied ends
  g.fillStyle = '#b95b58';
  g.beginPath();
  g.ellipse(-L + 6 * k, 0, 5 * k, 9 * k, 0, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.ellipse(L - 6 * k, 0, 5 * k, 9 * k, 0, 0, Math.PI * 2);
  g.fill();

  // small RAW stamp
  g.save();
  g.rotate(-0.06);
  g.font = '900 ' + Math.round(11 * k) + 'px Arial, Helvetica, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.globalAlpha = 0.75 * alpha;
  g.fillStyle = 'rgba(92, 24, 34, 0.8)';
  g.fillText('RAW', -30 * k, 5 * k);
  g.restore();
  g.globalAlpha = alpha;

  // eyes
  const eyeY = -4 * k;
  if (dead) {
    g.strokeStyle = '#3a1420';
    g.lineWidth = 3.4 * k;
    const eyes = [[24 * k, 10 * k], [46 * k, 10 * k]];
    for (let i = 0; i < eyes.length; i++) {
      const ex = eyes[i][0];
      g.beginPath();
      g.moveTo(ex - 5 * k, eyeY - 5 * k);
      g.lineTo(ex + 5 * k, eyeY + 5 * k);
      g.moveTo(ex + 5 * k, eyeY - 5 * k);
      g.lineTo(ex - 5 * k, eyeY + 5 * k);
      g.stroke();
    }
  } else {
    g.fillStyle = '#2b0f16';
    g.beginPath();
    g.ellipse(22 * k, eyeY, 4.4 * k, 5.6 * k, 0, 0, Math.PI * 2);
    g.fill();
    g.beginPath();
    g.ellipse(44 * k, eyeY, 4.4 * k, 5.6 * k, 0, 0, Math.PI * 2);
    g.fill();
    // angry brows
    g.strokeStyle = '#2b0f16';
    g.lineWidth = 3 * k;
    g.beginPath();
    g.moveTo(16 * k, eyeY - 11 * k);
    g.lineTo(27 * k, eyeY - 7 * k);
    g.moveTo(50 * k, eyeY - 11 * k);
    g.lineTo(39 * k, eyeY - 7 * k);
    g.stroke();
  }

  g.restore();
}

function drawReticle(g, ctx, rx, ry, rw, rh, alpha) {
  const len = Math.min(rw, rh) * 0.22;
  g.save();
  g.globalAlpha = Math.max(0, Math.min(1, alpha));
  g.strokeStyle = ctx.accent || '#ff5f8d';
  g.lineWidth = Math.max(2, Math.min(rw, rh) * 0.018);
  g.lineCap = 'round';
  const corners = [
    [rx, ry, 1, 1],
    [rx + rw, ry, -1, 1],
    [rx, ry + rh, 1, -1],
    [rx + rw, ry + rh, -1, -1],
  ];
  for (let i = 0; i < corners.length; i++) {
    const c = corners[i];
    g.beginPath();
    g.moveTo(c[0] + len * c[2], c[1]);
    g.lineTo(c[0], c[1]);
    g.lineTo(c[0], c[1] + len * c[3]);
    g.stroke();
  }
  g.restore();
}

function makeSplats(ctx) {
  const out = [];
  for (let i = 0; i < 10; i++) {
    out.push({
      a: ctx.rand() * Math.PI * 2,
      d: (44 + ctx.rand() * 110),
      r: (6 + ctx.rand() * 15),
    });
  }
  return out;
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);

  if (!S) init(ctx);
  const k = S.k;
  const ddt = Math.min(Math.max(dt, 0), 0.05);

  const target = ctx.streamer
    ? {
        x: (ctx.streamer.x + ctx.streamer.w * 0.5) * W,
        y: (ctx.streamer.y + ctx.streamer.h * 0.3) * H,
      }
    : { x: W * 0.5, y: H * 0.42 };

  const floor = H * 0.86;
  const rad = 30 * k;

  // --- physics ---
  if (S.phase === 'fall' || S.phase === 'bounce') {
    S.vy += 1550 * k * ddt;
    S.x += S.vx * ddt;
    S.y += S.vy * ddt;
    S.ang += S.spin * ddt;

    if (S.y + rad > floor && S.vy > 0) {
      S.y = floor - rad;
      S.vy = -Math.abs(S.vy) * 0.7;
      S.vx *= 0.94;
      S.bounces++;
      if (S.bounces === 1) ctx.sound.beep(560, 90);
      else if (S.bounces === 2) ctx.sound.beep(470, 90);
      else if (S.bounces === 3) ctx.sound.beep(390, 100);
      else ctx.sound.beep(320, 110);
      if (S.bounces >= 4 || t > 3.6) {
        S.phase = 'homing';
        S.homingT = 0;
        ctx.sound.beep(960, 130);
      }
    }

    if (S.x < rad) {
      S.x = rad;
      S.vx = Math.abs(S.vx) * 0.9;
      S.spin *= -1;
    }
    if (S.x > W - rad) {
      S.x = W - rad;
      S.vx = -Math.abs(S.vx) * 0.9;
      S.spin *= -1;
    }
    if (S.y < rad) {
      S.y = rad;
      S.vy = Math.abs(S.vy) * 0.8;
    }
  } else if (S.phase === 'homing') {
    S.homingT += ddt;
    const dx = target.x - S.x;
    const dy = target.y - S.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const wantSpeed = (520 + 780 * Math.min(1, S.homingT * 1.4)) * k;
    const wantVx = (dx / d) * wantSpeed;
    const wantVy = (dy / d) * wantSpeed;
    const blend = Math.min(1, ddt * 6);
    S.vx += (wantVx - S.vx) * blend;
    S.vy += (wantVy - S.vy) * blend;
    S.x += S.vx * ddt;
    S.y += S.vy * ddt;
    S.ang += 15 * ddt;

    if (d < 62 * k || t > 7.5) {
      S.phase = 'splat';
      S.splatAt = t;
      S.splatX = target.x;
      S.splatY = target.y;
      S.splats = makeSplats(ctx);
      S.hit = true;
      ctx.sound.noise(240);
      ctx.sound.beep(150, 200);
    }
  }

  // --- trail ---
  if (S.phase !== 'splat') {
    const movedX = S.x - S.lastTrailX;
    const movedY = S.y - S.lastTrailY;
    if (movedX * movedX + movedY * movedY > 90) {
      S.trail.push({ x: S.x, y: S.y, a: S.ang });
      if (S.trail.length > 14) S.trail.shift();
      S.lastTrailX = S.x;
      S.lastTrailY = S.y;
    }
  } else if (S.trail.length > 0) {
    S.trail.shift();
  }

  for (let i = 0; i < S.trail.length; i++) {
    const p = S.trail[i];
    const a = ((i + 1) / S.trail.length) * 0.2;
    drawSausage(g, p.x, p.y, p.a, k, 0.85, 0.85, a, false);
  }

  // --- reticle over the live streamer ---
  if (ctx.streamer && (S.phase === 'homing' || S.phase === 'splat')) {
    const rx = ctx.streamer.x * W;
    const ry = ctx.streamer.y * H;
    const rw = ctx.streamer.w * W;
    const rh = ctx.streamer.h * H;
    const pulse = 0.55 + 0.2 * Math.sin(t * 3.4);
    drawReticle(g, ctx, rx, ry, rw, rh, pulse);
    if (S.phase === 'homing') {
      caption(g, 'TARGET: SAVORYSAILOR', rx + 6, ry - 12, Math.max(12, Math.min(rw * 0.075, 30)), 0.9, ctx.accent || '#ff5f8d');
    }
  }

  // --- the frankfurter itself ---
  if (S.phase !== 'splat') {
    const squash = S.phase === 'homing' ? 1.12 : 1;
    drawSausage(g, S.x, S.y, S.ang, k, squash, 1 / squash, 1, false);
  } else {
    const e = t - S.splatAt;

    // shock ring
    const ringR = 30 * k + e * 620 * k;
    g.save();
    g.globalAlpha = Math.max(0, 0.75 - e * 0.7);
    g.strokeStyle = ctx.accent || '#ff5f8d';
    g.lineWidth = 7 * k;
    g.beginPath();
    g.arc(S.splatX, S.splatY, ringR, 0, Math.PI * 2);
    g.stroke();
    g.restore();

    // juice blobs
    for (let i = 0; i < S.splats.length; i++) {
      const b = S.splats[i];
      const grow = Math.min(1, e * 6);
      g.save();
      g.globalAlpha = 0.75 * (1 - Math.min(1, e / 2.2));
      g.fillStyle = '#e8697f';
      g.beginPath();
      g.ellipse(
        S.splatX + Math.cos(b.a) * b.d * k,
        S.splatY + Math.sin(b.a) * b.d * k * 0.8,
        b.r * k * grow,
        b.r * k * grow * 0.72,
        b.a,
        0,
        Math.PI * 2
      );
      g.fill();
      g.restore();
    }

    // flattened, deceased frankfurter
    drawSausage(g, S.splatX, S.splatY, 0.35, k, 1.05, 0.55, 1, true);

    // BONK
    const bonkScale = Math.min(1, e * 8);
    g.save();
    g.translate(S.splatX, S.splatY - 88 * k);
    g.scale(bonkScale, bonkScale);
    g.rotate(-0.08);
    caption(g, 'BONK!', -70 * k, 18 * k, Math.round(56 * k), 1, '#ffd75e');
    g.restore();
  }

  // --- captions ---
  const cx = W * 0.045;
  if (S.phase !== 'splat') {
    if (t < 1.7) {
      caption(g, 'A RAW FRANKFURTER ENTERS THE FRAME', cx, H * 0.12, Math.round(Math.min(W * 0.033, 44)), 1);
    } else if (S.phase === 'homing') {
      caption(g, 'IT IS RAW. IT IS COMING FOR YOU.', cx, H * 0.12, Math.round(Math.min(W * 0.033, 44)), 1);
    } else {
      caption(g, 'THAT IS NOT A HOT DOG. THAT IS A WARNING.', cx, H * 0.12, Math.round(Math.min(W * 0.033, 44)), 1);
    }
  } else {
    const e = t - S.splatAt;
    const a = Math.min(1, e * 3);
    caption(g, 'SAVORYSAILOR, YOU HAVE BEEN FRANKED.', cx, H * 0.12, Math.round(Math.min(W * 0.033, 44)), a, '#ffd75e');
  }

  if (ctx.trigger && ctx.trigger.login) {
    const who = String(ctx.trigger.login).slice(0, 20).toUpperCase();
    caption(g, 'SUMMONED BY ' + who, cx, H * 0.12 + Math.round(Math.min(W * 0.033, 44)) * 0.85, Math.round(Math.min(W * 0.02, 26)), 0.85, '#c9d4ff');
  }

  // --- end ---
  if (S.phase === 'splat' && t - S.splatAt > 2.6) {
    ctx.done();
  }
}
