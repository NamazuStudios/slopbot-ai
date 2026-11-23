// Cheeky Butt Cannon — a rear end lobs twenty tiny men at the live streamer.
// Transparent glass overlay: clear every frame, draw only, no opaque background.

export const meta = {
  title: 'Cheeky Butt Cannon',
  author: 'doctordiggitydank',
  prompt: 'a butt appears from the left side of the screen, angled upward at a 45 degree angle, and every second, it fires another tiny little man at the streamer in an arc',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

const TOTAL = 20;
const TAU = Math.PI * 2;

let S = null;

function easeOut(x) {
  return 1 - Math.pow(1 - x, 3);
}

function roundRect(c, x, y, w, h, r) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function muzzle() {
  const b = S.butt;
  const ox = 88;
  const oxr = ox - b.recoil * 14;
  return {
    x: b.x + oxr * Math.cos(b.rot),
    y: b.y + oxr * Math.sin(b.rot) + Math.sin(performanceSafeTime() * 2.1) * 3,
  };
}

function performanceSafeTime() {
  return S ? S.now : 0;
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const st = ctx.streamer;
  const target = st
    ? { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H }
    : { x: W * 0.58, y: H * 0.14, w: W * 0.34, h: H * 0.7 };

  S = {
    W,
    H,
    target,
    now: 0,
    butt: {
      x: -360,
      y: H * 0.70,
      rest: Math.max(96, Math.min(160, W * 0.065)),
      rot: -Math.PI / 4,
      recoil: 0,
    },
    men: [],
    puffs: [],
    rings: [],
    launched: 0,
    nextLaunch: 1.15,
    finished: false,
    endStart: 0,
    shake: 0,
  };
}

function launch(ctx, t) {
  const start = muzzle();
  const tr = S.target;
  const tx = tr.x + tr.w * (0.18 + ctx.rand() * 0.64);
  const ty = tr.y + tr.h * (0.45 + ctx.rand() * 0.50);
  const len = Math.max(180, Math.hypot(tx - start.x, ty - start.y));
  const lift = 0.44 + ctx.rand() * 0.14;
  const ctrl = {
    x: start.x + len * lift * 0.7071,
    y: start.y - len * lift * 0.7071 - 24,
  };
  const dur = 1.0 + ctx.rand() * 0.35;

  S.men.push({
    start,
    ctrl,
    end: { x: tx, y: ty },
    t0: t,
    dur,
    state: 'fly',
    rot: (ctx.rand() - 0.5) * 1.2,
    spin: (ctx.rand() < 0.5 ? -1 : 1) * (5 + ctx.rand() * 6),
    x: start.x,
    y: start.y,
    wob: ctx.rand() * TAU,
    scale: 0.85 + ctx.rand() * 0.55,
    clingDur: 0.7 + ctx.rand() * 0.55,
    clingT: 0,
    runT: 0,
    runDir: 1,
    alpha: 1,
  });

  for (let i = 0; i < 5; i++) {
    S.puffs.push({
      x: start.x,
      y: start.y,
      vx: 40 + ctx.rand() * 130,
      vy: -30 - ctx.rand() * 100,
      life: 0,
      max: 0.7 + ctx.rand() * 0.7,
      size: 7 + ctx.rand() * 15,
    });
  }

  ctx.sound.beep(58 + ctx.rand() * 22, 220);
  ctx.sound.noise(190);
  S.butt.recoil = 1;
}

function drawButt(ctx, t) {
  const c = ctx.canvas;
  const b = S.butt;
  c.save();
  c.translate(b.x - b.recoil * 14, b.y + Math.sin(t * 2.1) * 3);
  c.rotate(b.rot);

  // waistband / belt
  c.fillStyle = '#c9922f';
  roundRect(c, -84, -84, 48, 168, 16);
  c.fill();
  c.strokeStyle = '#1b2a4f';
  c.lineWidth = 6;
  c.stroke();

  // two fully-clothed denim cheeks
  c.fillStyle = '#4468b8';
  c.beginPath();
  c.ellipse(18, -46, 66, 58, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.ellipse(18, 46, 66, 58, 0, 0, TAU);
  c.fill();
  c.strokeStyle = '#1b2a4f';
  c.lineWidth = 6;
  c.beginPath();
  c.ellipse(18, -46, 66, 58, 0, 0, TAU);
  c.stroke();
  c.beginPath();
  c.ellipse(18, 46, 66, 58, 0, 0, TAU);
  c.stroke();

  // gold stitching down the middle
  c.setLineDash([9, 7]);
  c.strokeStyle = '#d9b25e';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(-34, 0);
  c.lineTo(30, 0);
  c.stroke();
  c.setLineDash([]);

  // pockets
  c.fillStyle = 'rgba(255,255,255,0.14)';
  roundRect(c, 6, -80, 40, 34, 6);
  c.fill();
  roundRect(c, 6, 46, 40, 34, 6);
  c.fill();

  // belt buckle
  c.fillStyle = '#ffd76a';
  roundRect(c, -72, -16, 22, 32, 5);
  c.fill();
  c.strokeStyle = '#7a5a14';
  c.lineWidth = 3;
  c.stroke();

  c.restore();
}

function drawMan(ctx, m, t) {
  const c = ctx.canvas;
  c.save();
  c.translate(m.x, m.y);
  c.rotate(m.rot);
  c.scale(m.scale, m.scale);
  c.globalAlpha = m.alpha;

  const running = m.state === 'run';
  const phase = running ? Math.sin((t - m.runT) * 13) : Math.sin(t * 14 + m.wob);
  const legSwing = running || m.state === 'fly' ? phase * 4 : 0;
  const armY = m.state === 'cling' ? -6 : phase * 4;

  c.lineCap = 'round';

  // legs
  c.strokeStyle = '#101a33';
  c.lineWidth = 3.4;
  c.beginPath();
  c.moveTo(0, -7);
  c.lineTo(-5 - legSwing, 0);
  c.moveTo(0, -7);
  c.lineTo(5 + legSwing, 0);
  c.stroke();

  // torso
  c.strokeStyle = '#ff6fae';
  c.lineWidth = 8;
  c.beginPath();
  c.moveTo(0, -8);
  c.lineTo(0, -18);
  c.stroke();

  // arms
  c.strokeStyle = '#101a33';
  c.lineWidth = 3.2;
  c.beginPath();
  c.moveTo(0, -16);
  c.lineTo(-8, -16 + armY);
  c.moveTo(0, -16);
  c.lineTo(8, -16 + armY);
  c.stroke();

  // head
  c.fillStyle = '#ffd9b8';
  c.beginPath();
  c.arc(0, -23, 5.5, 0, TAU);
  c.fill();
  c.strokeStyle = '#101a33';
  c.lineWidth = 2.4;
  c.stroke();

  // silly little helmet
  c.fillStyle = '#ffe66d';
  c.beginPath();
  c.arc(0, -25, 6.4, Math.PI * 1.02, Math.PI * 1.98);
  c.fill();
  c.strokeStyle = '#101a33';
  c.lineWidth = 1.8;
  c.stroke();

  c.restore();
}

function drawPuffs(ctx) {
  const c = ctx.canvas;
  c.save();
  for (const p of S.puffs) {
    const k = Math.min(1, p.life / p.max);
    c.globalAlpha = Math.max(0, 0.30 * (1 - k));
    c.fillStyle = '#b7e06a';
    c.beginPath();
    c.arc(p.x, p.y, p.size * (1 + k * 1.7), 0, TAU);
    c.fill();
  }
  c.restore();
}

function drawRings(ctx, t) {
  const c = ctx.canvas;
  c.save();
  for (const r of S.rings) {
    const age = t - r.t0;
    const k = Math.min(1, age / 0.34);
    c.globalAlpha = 0.55 * (1 - k);
    c.strokeStyle = '#fff4fa';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(r.x, r.y, 8 + k * 34, 0, TAU);
    c.stroke();
  }
  c.restore();
}

function drawReticle(ctx, t) {
  const tr = S.target;
  const c = ctx.canvas;
  const m = 10;
  const L = Math.min(58, tr.w * 0.16, tr.h * 0.16);
  const x0 = tr.x - m;
  const y0 = tr.y - m;
  const x1 = tr.x + tr.w + m;
  const y1 = tr.y + tr.h + m;

  c.save();
  c.strokeStyle = ctx.accent || '#ff6fae';
  c.globalAlpha = 0.55 + Math.sin(t * 6) * 0.15;
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(x0, y0 + L);
  c.lineTo(x0, y0);
  c.lineTo(x0 + L, y0);
  c.moveTo(x1 - L, y0);
  c.lineTo(x1, y0);
  c.lineTo(x1, y0 + L);
  c.moveTo(x1, y1 - L);
  c.lineTo(x1, y1);
  c.lineTo(x1 - L, y1);
  c.moveTo(x0 + L, y1);
  c.lineTo(x0, y1);
  c.lineTo(x0, y1 - L);
  c.stroke();
  c.restore();
}

function drawCaption(ctx, text, x, y, size, align) {
  if (!text) return;
  const c = ctx.canvas;
  c.save();
  c.font = '700 ' + size + 'px ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif';
  c.textAlign = align || 'left';
  c.textBaseline = 'middle';
  const w = c.measureText(text).width;
  const padX = Math.round(size * 0.55);
  const h = Math.round(size * 1.75);
  const bx = align === 'center' ? x - w / 2 : x;
  c.fillStyle = 'rgba(10, 18, 38, 0.55)';
  roundRect(c, bx - padX, y - h / 2, w + padX * 2, h, 10);
  c.fill();
  c.fillStyle = '#fff4fa';
  c.fillText(text, x, y);
  c.restore();
}

export function frame(ctx, t, dt) {
  if (!S || S.W !== ctx.width || S.H !== ctx.height) init(ctx);
  S.now = t;

  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);

  const b = S.butt;
  if (!S.finished) {
    const enter = Math.min(1, t / 0.85);
    b.x = -360 + (b.rest + 360) * easeOut(enter);
  } else {
    b.x += (-420 - b.x) * Math.min(1, dt * 3.2);
  }
  b.recoil = Math.max(0, b.recoil - dt * 6);

  // one tiny man per second, twenty total
  while (!S.finished && S.launched < TOTAL && t >= S.nextLaunch) {
    launch(ctx, t);
    S.launched += 1;
    S.nextLaunch += 1.0;
  }

  // update little men
  for (let i = S.men.length - 1; i >= 0; i--) {
    const m = S.men[i];

    if (m.state === 'fly') {
      const u = (t - m.t0) / m.dur;
      if (u >= 1) {
        m.state = 'cling';
        m.clingT = t;
        m.x = m.end.x;
        m.y = m.end.y;
        m.rot = 0;
        m.runDir = m.end.x >= W * 0.5 ? 1 : -1;
        ctx.sound.noise(80);
        ctx.sound.beep(300 + ctx.rand() * 120, 40);
        S.rings.push({ x: m.end.x, y: m.end.y, t0: t });
        S.shake = 0.7;
      } else {
        const iu = 1 - u;
        m.x = iu * iu * m.start.x + 2 * iu * u * m.ctrl.x + u * u * m.end.x;
        m.y = iu * iu * m.start.y + 2 * iu * u * m.ctrl.y + u * u * m.end.y;
        m.rot += m.spin * dt * (1 - u * 0.65);
        m.alpha = 1;
      }
    } else if (m.state === 'cling') {
      const age = t - m.clingT;
      m.x = m.end.x + Math.sin(age * 17 + m.wob) * 2.5;
      m.y = m.end.y + Math.cos(age * 15 + m.wob) * 2.0;
      m.alpha = 1;
      if (age >= m.clingDur) {
        m.state = 'run';
        m.runT = t;
        S.rings.push({ x: m.end.x, y: m.end.y, t0: t });
        ctx.sound.noise(55);
      }
    } else {
      const age = t - m.runT;
      m.x += m.runDir * 460 * dt;
      m.y = m.end.y - Math.abs(Math.sin(age * 13)) * 11;
      m.rot = m.runDir * 0.14;
      const edge = m.runDir > 0 ? W + 70 - m.x : m.x + 70;
      m.alpha = Math.max(0, Math.min(1, edge / 40));
      if (m.x < -90 || m.x > W + 90) {
        S.men.splice(i, 1);
      }
    }
  }

  // puffs
  for (let i = S.puffs.length - 1; i >= 0; i--) {
    const p = S.puffs[i];
    p.life += dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 34 * dt;
    if (p.life >= p.max) S.puffs.splice(i, 1);
  }

  // impact rings
  for (let i = S.rings.length - 1; i >= 0; i--) {
    if (t - S.rings[i].t0 > 0.36) S.rings.splice(i, 1);
  }

  // end bookkeeping
  if (!S.finished && S.launched >= TOTAL && S.men.length === 0) {
    S.finished = true;
    S.endStart = t;
  }
  const wrapUp = S.finished && t - S.endStart > 1.4;

  S.shake = Math.max(0, S.shake - dt * 3);

  c.save();
  if (S.shake > 0) {
    c.translate((ctx.rand() - 0.5) * 4 * S.shake, (ctx.rand() - 0.5) * 4 * S.shake);
  }

  drawReticle(ctx, t);
  drawButt(ctx, t);
  drawPuffs(ctx);
  drawRings(ctx, t);
  for (const m of S.men) drawMan(ctx, m, t);

  const size = Math.max(22, Math.round(W * 0.016));
  let cap = '';
  if (S.finished) {
    cap = 'THEY ALL RAN AWAY. SAVORYSAILOR IS FREE.';
  } else if (t < 1.2) {
    cap = 'SPECIAL DELIVERY FOR SAVORYSAILOR.';
  } else if (S.launched >= TOTAL) {
    cap = 'TWENTY LITTLE MEN. ALL HANDS ON SAVORYSAILOR.';
  } else {
    cap = 'LITTLE MAN ' + S.launched + ' OF ' + TOTAL + ' — INCOMING.';
  }
  drawCaption(ctx, cap, 30, H - size * 1.6, size, 'left');

  const tr = S.target;
  drawCaption(
    ctx,
    'SAVORYSAILOR',
    tr.x + tr.w / 2,
    Math.min(H - 24, tr.y + tr.h + 26),
    Math.max(16, Math.round(size * 0.62)),
    'center'
  );

  c.restore();

  if (wrapUp) {
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
