// Deez Nuts Downpour — transparent glass over the live broadcast.
// A nut-weather event escalates from a light drizzle to a full delivery.

export const meta = {
  title: 'Deez Nuts Downpour',
  author: 'cooooter',
  prompt: 'DEEZ NUTS DROPPED ALL OVER THE SCREEN RAINING DEEZ NUTS AT A GOOD PACE',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
};

const TAU = Math.PI * 2;

let S = null;

function r(ctx, a, b) {
  return a + (b - a) * ctx.rand();
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

function drawAcorn(g, s) {
  g.lineWidth = s * 0.1;
  g.strokeStyle = '#5b3a1d';
  g.fillStyle = '#c98d4b';
  g.beginPath();
  g.moveTo(-0.72 * s, -0.05 * s);
  g.bezierCurveTo(-0.8 * s, 0.72 * s, -0.32 * s, 1.05 * s, 0, 1.05 * s);
  g.bezierCurveTo(0.32 * s, 1.05 * s, 0.8 * s, 0.72 * s, 0.72 * s, -0.05 * s);
  g.closePath();
  g.fill();
  g.stroke();

  g.fillStyle = '#7b5230';
  g.beginPath();
  g.ellipse(0, -0.1 * s, 0.84 * s, 0.5 * s, 0, Math.PI, TAU);
  g.closePath();
  g.fill();
  g.stroke();

  g.strokeStyle = 'rgba(255,224,178,0.35)';
  g.lineWidth = s * 0.045;
  for (let i = -2; i <= 2; i++) {
    g.beginPath();
    g.moveTo(i * s * 0.26, -0.42 * s);
    g.lineTo(i * s * 0.32, -0.08 * s);
    g.stroke();
  }

  g.strokeStyle = '#5b3a1d';
  g.lineWidth = s * 0.11;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, -0.5 * s);
  g.lineTo(0.14 * s, -0.86 * s);
  g.stroke();

  g.fillStyle = 'rgba(255,255,255,0.22)';
  g.beginPath();
  g.ellipse(-0.3 * s, 0.42 * s, 0.16 * s, 0.3 * s, -0.4, 0, TAU);
  g.fill();
}

function drawWalnut(g, s) {
  g.lineWidth = s * 0.1;
  g.strokeStyle = '#59391a';
  g.fillStyle = '#b57a3f';
  g.beginPath();
  g.ellipse(0, 0, 0.8 * s, 0.95 * s, 0, 0, TAU);
  g.fill();
  g.stroke();

  g.strokeStyle = 'rgba(80,48,20,0.65)';
  g.lineWidth = s * 0.06;
  g.beginPath();
  g.moveTo(0, -0.9 * s);
  g.bezierCurveTo(-0.28 * s, -0.4 * s, 0.3 * s, -0.2 * s, 0.02 * s, 0.2 * s);
  g.bezierCurveTo(-0.24 * s, 0.55 * s, 0.18 * s, 0.7 * s, 0, 0.92 * s);
  g.stroke();

  g.beginPath();
  g.moveTo(-0.55 * s, -0.42 * s);
  g.bezierCurveTo(-0.35 * s, -0.2 * s, -0.62 * s, 0.28 * s, -0.38 * s, 0.46 * s);
  g.moveTo(0.55 * s, -0.4 * s);
  g.bezierCurveTo(0.34 * s, -0.15 * s, 0.6 * s, 0.3 * s, 0.36 * s, 0.5 * s);
  g.stroke();

  g.fillStyle = 'rgba(255,231,190,0.26)';
  g.beginPath();
  g.ellipse(-0.34 * s, -0.4 * s, 0.17 * s, 0.3 * s, -0.5, 0, TAU);
  g.fill();
}

function drawPeanut(g, s) {
  g.lineWidth = s * 0.09;
  g.strokeStyle = '#8a5f2e';
  g.fillStyle = '#d7a35c';
  g.beginPath();
  g.moveTo(0, -0.9 * s);
  g.bezierCurveTo(0.66 * s, -0.92 * s, 0.76 * s, -0.18 * s, 0.34 * s, 0);
  g.bezierCurveTo(0.76 * s, 0.18 * s, 0.66 * s, 0.92 * s, 0, 0.9 * s);
  g.bezierCurveTo(-0.66 * s, 0.92 * s, -0.76 * s, 0.18 * s, -0.34 * s, 0);
  g.bezierCurveTo(-0.76 * s, -0.18 * s, -0.66 * s, -0.92 * s, 0, -0.9 * s);
  g.closePath();
  g.fill();
  g.stroke();

  g.strokeStyle = 'rgba(120,78,32,0.5)';
  g.lineWidth = s * 0.045;
  for (let i = -1; i <= 1; i++) {
    g.beginPath();
    g.arc(-0.2 * s, i * 0.34 * s, 0.16 * s, 0.2, Math.PI - 0.2);
    g.stroke();
    g.beginPath();
    g.arc(0.24 * s, i * 0.34 * s, 0.13 * s, 0.2, Math.PI - 0.2);
    g.stroke();
  }

  g.strokeStyle = 'rgba(120,78,32,0.45)';
  g.lineWidth = s * 0.07;
  g.beginPath();
  g.moveTo(-0.34 * s, 0);
  g.lineTo(0.34 * s, 0);
  g.stroke();
}

function drawNut(g, type, s) {
  if (type === 0) drawAcorn(g, s);
  else if (type === 1) drawWalnut(g, s);
  else drawPeanut(g, s);
}

function makeNut(ctx, t, W, H, base, sizeScale) {
  return {
    type: Math.floor(ctx.rand() * 3),
    x: r(ctx, 0.03, 0.97) * W,
    y: -base * 0.08,
    vx: r(ctx, -30, 30),
    vy: r(ctx, 260, 470),
    s: base * r(ctx, 0.024, 0.045) * sizeScale,
    rot: r(ctx, 0, TAU),
    spin: r(ctx, -3.2, 3.2),
    impactY: r(ctx, 0.42, 1.01) * H,
    landed: false,
    landT: 0,
    seed: ctx.rand() * 10,
  };
}

function makeSplat(ctx, nut, base) {
  const frags = [];
  const n = 5 + Math.floor(ctx.rand() * 4);
  for (let i = 0; i < n; i++) {
    const a = r(ctx, 0, TAU);
    const sp = r(ctx, 0.06, 0.2) * base;
    frags.push({
      dx: 0,
      dy: 0,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - base * 0.05,
      s: nut.s * r(ctx, 0.09, 0.2),
    });
  }
  return {
    x: nut.x,
    y: nut.y,
    s: nut.s,
    rot: nut.rot,
    type: nut.type,
    age: 0,
    frags,
  };
}

function drawCaption(g, t, alpha, rect) {
  const size = S.captionSize;
  let main, sub;
  if (t < 3.6) {
    main = 'NUT WEATHER ALERT';
    sub = 'a light drizzle of deez · keep a hat nearby';
  } else if (t < 8.1) {
    main = 'DEEZ NUTS: INCOMING';
    sub = 'density increasing · this is not a drill';
  } else if (t < 11.15) {
    main = 'SAVORYSAILOR, TAKE COVER';
    sub = '100 percent chance of nuts · all day';
  } else {
    main = 'DEEZ NUTS, DELIVERED';
    sub = 'thank you for your service, SavorySailor';
  }

  const above = rect.y > 0.32 * S.H;
  const cx = S.W / 2;
  const cy = above
    ? Math.max(size * 2.2, rect.y - size * 1.45)
    : Math.min(S.H - size * 2.2, rect.y + rect.h + size * 1.45);

  g.save();
  g.globalAlpha = alpha;
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  g.font = `900 ${size}px 'Segoe UI', system-ui, sans-serif`;
  const mw = g.measureText(main).width;
  g.font = `600 ${size * 0.5}px 'Segoe UI', system-ui, sans-serif`;
  const sw = g.measureText(sub).width;
  const boxW = Math.min(S.W * 0.95, Math.max(mw, sw) + size * 2);
  const boxH = size * 2.02;

  g.fillStyle = 'rgba(30,18,10,0.6)';
  roundRect(g, cx - boxW / 2, cy - boxH / 2, boxW, boxH, size * 0.7);
  g.fill();
  g.strokeStyle = 'rgba(255,208,140,0.65)';
  g.lineWidth = Math.max(1.5, size * 0.055);
  g.stroke();

  g.fillStyle = '#ffe3ad';
  g.font = `900 ${size}px 'Segoe UI', system-ui, sans-serif`;
  g.fillText(main, cx, cy - size * 0.33);
  g.fillStyle = 'rgba(255,206,150,0.92)';
  g.font = `600 ${size * 0.5}px 'Segoe UI', system-ui, sans-serif`;
  g.fillText(sub, cx, cy + size * 0.53);
  g.restore();
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const base = Math.min(W, H);
  const rect = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : { x: W * 0.3, y: H * 0.2, w: W * 0.4, h: H * 0.62 };

  S = {
    W,
    H,
    base,
    rect,
    nuts: [],
    splats: [],
    words: [],
    opened: false,
    nextSpawn: 1.4,
    thunkAt: 0,
    shake: 0,
    shakeAt: -10,
    big: null,
    bigImpact: null,
    bigT: 10.55,
    bigLanded: false,
    flash: 0,
    captionSize: Math.max(12, Math.min(W * 0.032, 40)),
    endT: 14.4,
    done: false,
    intro: 0,
  };

  // drifting background meme-words
  for (let i = 0; i < 5; i++) {
    S.words.push({
      text: i % 2 ? 'NUTS' : 'DEEZ',
      x: r(ctx, 0.08, 0.92) * W,
      y: r(ctx, 0.1, 0.95) * H,
      vy: -r(ctx, 6, 18),
      s: base * r(ctx, 0.03, 0.06),
      rot: r(ctx, -0.35, 0.35),
      a: r(ctx, 0.07, 0.14),
    });
  }
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const { W, H, base, rect } = S;

  g.clearRect(0, 0, W, H);

  const step = Math.min(dt || 0.016, 1 / 20);
  const fade = t > S.endT - 1.25 ? Math.max(0, 1 - (t - (S.endT - 1.25)) / 1.15) : 1;
  const introA = Math.min(1, t / 0.5);

  S.shake *= Math.exp(-step * 6.5);
  S.flash *= Math.exp(-step * 3.4);

  const shakeX = Math.sin(t * 71) * S.shake * base * 0.014;
  const shakeY = Math.cos(t * 63) * S.shake * base * 0.011;

  g.save();
  g.translate(shakeX, shakeY);

  // faint drifting words
  for (const w of S.words) {
    w.y += w.vy * step;
    if (w.y < -w.s) w.y = H + w.s;
    g.save();
    g.globalAlpha = w.a * introA * fade;
    g.translate(w.x, w.y);
    g.rotate(w.rot);
    g.fillStyle = '#ffd9a2';
    g.font = `900 ${w.s}px 'Segoe UI', system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(w.text, 0, 0);
    g.restore();
  }

  // spawn manual opener nuts
  if (!S.opened && t >= 0.45) {
    S.opened = true;
    S.nuts.push(makeNut(ctx, t, W, H, base, 1.15));
    S.nuts.push(makeNut(ctx, t, W, H, base, 0.9));
  }

  // spawn downpour
  if (t >= 1.4 && t < S.bigT - 0.25) {
    let interval;
    if (t < 3.4) interval = 0.46;
    else if (t < 6.0) interval = 0.28;
    else if (t < 8.4) interval = 0.16;
    else interval = 0.09;

    if (t >= S.nextSpawn) {
      S.nuts.push(makeNut(ctx, t, W, H, base, 1));
      if (t > 6.2 && ctx.rand() > 0.55) {
        S.nuts.push(makeNut(ctx, t, W, H, base, 0.85));
      }
      if (t > 8.8 && ctx.rand() > 0.6) {
        S.nuts.push(makeNut(ctx, t, W, H, base, 0.75));
      }
      S.nextSpawn = t + interval;
    }
  }

  // giant nut
  if (!S.big && t >= S.bigT) {
    S.big = {
      x: rect.x + rect.w * 0.5 + r(ctx, -0.04, 0.04) * W,
      y: -base * 0.36,
      vy: base * 0.34,
      s: base * 0.29,
      rot: -0.12,
      targetY: rect.y + rect.h * 0.46,
    };
    try {
      ctx.sound.noise(180);
    } catch (e) {}
  }

  if (S.big && !S.bigLanded) {
    const b = S.big;
    b.vy += base * 2.9 * step;
    b.y += b.vy * step;
    b.rot += step * 0.55;
    if (b.y >= b.targetY) {
      b.y = b.targetY;
      b.rot = -0.06;
      S.bigLanded = true;
      S.shake = 1.35;
      S.flash = 1;
      S.bigImpact = t;
      try {
        ctx.sound.noise(620);
        ctx.sound.beep(42, 520);
      } catch (e) {}
      for (let i = 0; i < 8; i++) {
        S.splats.push({
          x: b.x + r(ctx, -b.s, b.s) * 0.9,
          y: b.y + r(ctx, -b.s * 0.5, b.s * 0.7),
          s: b.s * r(ctx, 0.16, 0.3),
          rot: r(ctx, 0, TAU),
          type: Math.floor(ctx.rand() * 3),
          age: 0,
          frags: [],
        });
      }
    }
  }

  // nut simulation
  for (let i = S.nuts.length - 1; i >= 0; i--) {
    const n = S.nuts[i];
    n.vy += base * 0.65 * step;
    n.x += n.vx * step;
    n.y += n.vy * step;
    n.rot += n.spin * step;

    if (!n.landed && n.y >= n.impactY) {
      n.y = n.impactY;
      S.splats.push(makeSplat(ctx, n, base));
      S.nuts.splice(i, 1);
      if (t - S.thunkAt > 0.085) {
        S.thunkAt = t;
        try {
          ctx.sound.beep(90 + ctx.rand() * 70, 70);
          if (ctx.rand() > 0.65) ctx.sound.noise(70);
        } catch (e) {}
      }
      continue;
    }

    if (n.x < -base * 0.1 || n.x > W + base * 0.1) {
      S.nuts.splice(i, 1);
      continue;
    }

    g.save();
    g.globalAlpha = 0.94 * fade;
    g.translate(n.x, n.y);
    g.rotate(n.rot);
    g.scale(1, 1 + Math.min(0.11, n.vy / (base * 7)));
    drawNut(g, n.type, n.s);
    g.restore();
  }
  if (S.nuts.length > 240) S.nuts.splice(0, S.nuts.length - 240);

  // splats on the glass
  for (let i = S.splats.length - 1; i >= 0; i--) {
    const p = S.splats[i];
    p.age += step;
    const life = 0.85;
    if (p.age >= life) {
      S.splats.splice(i, 1);
      continue;
    }
    const a = (1 - p.age / life) * fade;

    for (const f of p.frags) {
      f.dx += f.vx * step;
      f.dy += f.vy * step;
      f.vy += base * 0.5 * step;
      g.save();
      g.globalAlpha = a * 0.9;
      g.fillStyle = '#c08848';
      g.beginPath();
      g.arc(p.x + f.dx, p.y + f.dy, f.s, 0, TAU);
      g.fill();
      g.restore();
    }

    if (p.age < 0.34) {
      g.save();
      g.globalAlpha = a;
      g.translate(p.x, p.y);
      g.rotate(p.rot);
      g.scale(1.35, 0.42);
      drawNut(g, p.type, p.s);
      g.restore();

      g.save();
      g.globalAlpha = a * 0.5;
      g.strokeStyle = '#ffe1ae';
      g.lineWidth = Math.max(1, base * 0.0035);
      g.beginPath();
      g.arc(p.x, p.y, p.s * (1.2 + p.age * 4), 0, TAU);
      g.stroke();
      g.restore();
    }
  }

  // lunch is served: giant nut + banner
  if (S.big && S.bigLanded) {
    const b = S.big;
    const age = t - S.bigImpact;
    const pop = Math.min(1, age / 0.28);
    const squash = 1 + Math.exp(-age * 9) * 0.16 * Math.cos(age * 26);

    g.save();
    g.globalAlpha = fade;
    g.translate(b.x, b.y + (1 - pop) * -base * 0.02);
    g.rotate(b.rot);
    g.scale(1.08 * squash, 0.7 / squash);
    drawNut(g, 1, b.s);
    g.restore();

    if (age > 0.12) {
      const ta = Math.min(1, (age - 0.12) / 0.3) * fade;
      g.save();
      g.globalAlpha = ta;
      g.translate(b.x, b.y - b.s * 0.32);
      g.rotate(-0.035);
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `900 ${Math.max(18, b.s * 0.42)}px 'Segoe UI', system-ui, sans-serif`;
      g.lineWidth = Math.max(3, b.s * 0.09);
      g.strokeStyle = 'rgba(46,26,10,0.85)';
      g.strokeText('DEEZ NUTS', 0, 0);
      g.fillStyle = '#ffe7b4';
      g.fillText('DEEZ NUTS', 0, 0);
      g.restore();
    }
  }

  // punch-out flash at impact (semi-transparent only)
  if (S.flash > 0.01 && S.big) {
    const rr = base * 0.85;
    const grad = g.createRadialGradient(S.big.x, S.big.y, base * 0.02, S.big.x, S.big.y, rr);
    grad.addColorStop(0, `rgba(255,224,160,${0.34 * S.flash})`);
    grad.addColorStop(0.5, `rgba(255,186,110,${0.14 * S.flash})`);
    grad.addColorStop(1, 'rgba(255,186,110,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
  }

  // early nut-zone framing on the live shot
  if (t < 4.2 && t > 0.2) {
    g.save();
    g.globalAlpha = 0.3 * Math.min(1, (t - 0.2) / 0.4) * fade * (0.7 + 0.3 * Math.sin(t * 2.4));
    g.strokeStyle = '#ffd39a';
    g.lineWidth = Math.max(1.5, base * 0.004);
    g.setLineDash([base * 0.022, base * 0.02]);
    roundRect(g, rect.x + 5, rect.y + 5, rect.w - 10, rect.h - 10, base * 0.03);
    g.stroke();
    g.setLineDash([]);
    g.fillStyle = '#ffe0ae';
    g.font = `700 ${Math.max(10, base * 0.02)}px 'Segoe UI', system-ui, sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('NUT IMPACT ZONE', rect.x + rect.w / 2, rect.y + rect.h - base * 0.032);
    g.restore();
  }

  // caption
  if (t > 0.25) {
    const inA = Math.min(1, (t - 0.25) / 0.3);
    drawCaption(g, t, inA * fade, rect);
  }

  g.restore();

  if (fade < 1) {
    g.save();
    g.globalCompositeOperation = 'destination-out';
    g.fillStyle = `rgba(0,0,0,${1 - fade})`;
    g.fillRect(0, 0, W, H);
    g.restore();
  }

  if (t >= S.endT && !S.done) {
    S.done = true;
    ctx.done();
  }
}

export function dispose(ctx) {}
