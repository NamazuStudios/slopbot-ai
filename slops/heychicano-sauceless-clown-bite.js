export const meta = {
  title: 'Sauceless Clown Bite',
  author: 'heychicano',
  prompt: 'deranged clown with twitching eyes licks streamer and then gets angry when he notices there is no BBQ sauce on the streamer. then he douses the streamer in BBQ sauce and takes a bite.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const END_T = 21.0;

const CAPTIONS = [
  { at: 0.35, until: 2.9, text: 'A clown has entered the frame. He does not look well.' },
  { at: 3.0, until: 4.95, text: 'He has licked SavorySailor. He tastes nothing.' },
  { at: 5.05, until: 7.0, text: 'No barbecue sauce. SavorySailor, this is serious.' },
  { at: 7.15, until: 11.1, text: 'Corrective barbecue sauce, applied directly to the streamer.' },
  { at: 11.25, until: 14.5, text: 'Now THAT is a properly marinated broadcast.' },
  { at: 14.7, until: 18.5, text: 'The clown is taking a bite. Of SavorySailor. Live.' },
  { at: 18.7, until: 21.0, text: 'SavorySailor survives. The sauce was worth it.' },
];

const SOUNDS = [
  [0.25, (c) => c.sound.noise(240)],
  [0.55, (c) => { c.sound.beep(520, 90); c.sound.beep(700, 80); }],
  [0.85, (c) => { c.sound.noise(120); c.sound.beep(300, 80); }],
  [1.25, (c) => { c.sound.beep(200, 110); c.sound.beep(260, 80); }],
  [1.60, (c) => { c.sound.beep(185, 120); c.sound.beep(240, 90); }],
  [1.95, (c) => { c.sound.beep(210, 110); c.sound.beep(275, 80); }],
  [2.30, (c) => { c.sound.beep(190, 120); c.sound.beep(250, 90); }],
  [2.62, (c) => { c.sound.beep(175, 130); c.sound.noise(90); }],
  [2.90, (c) => { c.sound.noise(70); c.sound.beep(720, 60); }],
  [3.30, (c) => c.sound.noise(45)],
  [3.55, (c) => { c.sound.noise(60); c.sound.beep(620, 50); }],
  [3.85, (c) => c.sound.beep(110, 130)],
  [4.10, (c) => c.sound.beep(105, 130)],
  [4.35, (c) => c.sound.beep(420, 120)],
  [4.50, (c) => c.sound.beep(500, 120)],
  [4.65, (c) => c.sound.beep(590, 120)],
  [4.80, (c) => c.sound.beep(690, 130)],
  [4.95, (c) => { c.sound.beep(820, 160); c.sound.noise(120); }],
  [5.20, (c) => c.sound.beep(150, 160)],
  [5.55, (c) => c.sound.noise(70)],
  [5.85, (c) => c.sound.noise(70)],
  [6.15, (c) => c.sound.beep(130, 150)],
  [6.55, (c) => c.sound.beep(240, 90)],
  [7.05, (c) => { c.sound.beep(880, 60); c.sound.beep(1080, 50); }],
  [7.35, (c) => { c.sound.beep(90, 150); c.sound.noise(90); }],
  [10.95, (c) => { c.sound.beep(150, 260); c.sound.noise(140); }],
  [11.35, (c) => { c.sound.noise(60); c.sound.beep(230, 90); }],
  [12.10, (c) => c.sound.beep(160, 90)],
  [12.80, (c) => c.sound.beep(140, 100)],
  [13.50, (c) => c.sound.beep(120, 110)],
  [14.30, (c) => c.sound.beep(320, 120)],
  [14.85, (c) => { c.sound.beep(78, 480); c.sound.noise(200); }],
  [15.60, (c) => c.sound.beep(90, 260)],
  [16.16, (c) => { c.sound.noise(320); c.sound.beep(62, 420); c.sound.beep(184, 160); }],
  [16.55, (c) => { c.sound.beep(70, 300); c.sound.noise(120); }],
  [17.55, (c) => c.sound.beep(112, 260)],
  [18.20, (c) => c.sound.beep(280, 140)],
  [19.10, (c) => { c.sound.beep(88, 240); c.sound.beep(72, 180); }],
  [20.10, (c) => c.sound.beep(310, 200)],
  [20.32, (c) => c.sound.beep(392, 200)],
];

let state = null;
let ended = false;

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  const x = clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function easeOutCubic(t) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

function ellipse(g, x, y, rx, ry, rot) {
  g.beginPath();
  g.ellipse(x, y, Math.abs(rx), Math.abs(ry), rot || 0, 0, Math.PI * 2);
}

function getCam(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  if (ctx.streamer && ctx.streamer.w > 0 && ctx.streamer.h > 0) {
    return {
      x: ctx.streamer.x * W,
      y: ctx.streamer.y * H,
      w: ctx.streamer.w * W,
      h: ctx.streamer.h * H,
    };
  }
  return null;
}

function frameRect(st) {
  if (st.cam) return st.cam;
  return {
    x: st.W * 0.08,
    y: st.H * 0.08,
    w: st.W * 0.84,
    h: st.H * 0.8,
  };
}

function buildState(ctx) {
  const W = ctx ? ctx.width : 1280;
  const H = ctx ? ctx.height : 720;
  const cam = getCam(ctx);
  const S = clamp(Math.min(W, H) / 620, 0.62, 2.2);

  const rect = cam || { x: W * 0.08, y: H * 0.08, w: W * 0.84, h: H * 0.8 };
  const camCx = rect.x + rect.w * 0.5;
  const camCy = rect.y + rect.h * 0.5;

  const clownOnRight = !cam || camCx < W * 0.5;
  const clownX = clownOnRight ? W * 0.84 : W * 0.16;
  const dir = Math.sign(camCx - clownX) || -1;

  const st = {
    W,
    H,
    S,
    cam,
    rect,
    camCx,
    camCy,
    clownX,
    dir,
    sounds: [],
    sndIdx: 0,
    drops: [],
    splats: [],
    captions: CAPTIONS,
    nozzle: { x: lerp(clownX, camCx, 0.42), y: H * 0.40 },
    ended: false,
  };

  st.sounds = SOUNDS.slice();

  // sauce glugs under the douse window
  for (let i = 0; i < 12; i++) {
    const at = 7.40 + i * 0.28;
    st.sounds.push([at, (c) => { c.sound.beep(86 + (i % 3) * 14, 150); c.sound.noise(80); }]);
  }

  // flying sauce
  const nDrops = 86;
  for (let i = 0; i < nDrops; i++) {
    const at = 7.22 + (i / nDrops) * 3.55 + (ctx.rand() - 0.5) * 0.10;
    const tx = rect.x + rect.w * (0.06 + ctx.rand() * 0.88);
    const ty = rect.y + rect.h * (0.06 + ctx.rand() * 0.82);
    const sx = st.nozzle.x + (ctx.rand() - 0.5) * 34;
    const sy = st.nozzle.y + (ctx.rand() - 0.5) * 26;
    st.drops.push({
      at,
      flight: 0.24 + ctx.rand() * 0.20,
      sx,
      sy,
      tx,
      ty,
      r: 7 + ctx.rand() * 16,
      arc: 40 + ctx.rand() * 110,
      spin: (ctx.rand() - 0.5) * 3,
      seed: ctx.rand(),
    });
  }

  // static splat lobes (a few per landed drop)
  for (const d of st.drops) {
    const lobes = [];
    const n = 2 + Math.floor(ctx.rand() * 3);
    for (let k = 0; k < n; k++) {
      lobes.push({
        dx: (ctx.rand() - 0.5) * d.r * 1.7,
        dy: (ctx.rand() - 0.5) * d.r * 1.1,
        r: d.r * (0.35 + ctx.rand() * 0.55),
      });
    }
    st.splats.push({
      land: d.at + d.flight,
      tx: d.tx,
      ty: d.ty,
      r: d.r,
      lobes,
      drip: 26 + ctx.rand() * 90,
      dripSpeed: 16 + ctx.rand() * 30,
    });
  }

  st.sounds.sort((a, b) => a[0] - b[0]);

  return st;
}

export function init(ctx) {
  state = buildState(ctx);
  ended = false;
}

function playSounds(ctx, t) {
  const st = state;
  while (st.sndIdx < st.sounds.length && t >= st.sounds[st.sndIdx][0]) {
    try {
      st.sounds[st.sndIdx][1](ctx);
    } catch (err) {
      /* a sound is not worth a crash */
    }
    st.sndIdx++;
  }
}

function angerAt(t) {
  const rise = smooth(clamp((t - 2.85) / 1.85, 0, 1));
  const calm = smooth(clamp((t - 17.55) / 1.7, 0, 1));
  return rise * (1 - 0.68 * calm);
}

function openAt(t) {
  if (t < 0.0) return 0;
  const lickOpen = smooth(clamp((t - 0.72) / 0.3, 0, 1)) * (1 - smooth(clamp((t - 2.5) / 0.3, 0, 1)));
  const douse = smooth(clamp((t - 6.9) / 0.6, 0, 1)) * (1 - smooth(clamp((t - 11.6) / 0.7, 0, 1)));
  let o = Math.max(lickOpen * 0.45, douse * 0.22);
  const maw = smooth(clamp((t - 14.75) / 1.3, 0, 1));
  if (t >= 14.75 && t < 16.16) o = Math.max(o, maw);
  if (t >= 16.16 && t < 16.62) o = 0.1;
  if (t >= 16.62 && t < 17.6) o = 0.55 * (1 - smooth(clamp((t - 16.9) / 0.7, 0, 1)));
  if (t >= 17.6) o = 0.10 + 0.06 * Math.abs(Math.sin((t - 17.6) * 7));
  return clamp(o, 0, 1);
}

function poseClown(st, t) {
  const { W, H, S, camCx } = st;
  const bob = Math.sin(t * 2.35) * 6 * S;
  const excitement = 0.5 + 0.5 * Math.sin(t * 1.6);
  let x = st.clownX;
  let y = H * 0.665 + bob;
  let tilt = Math.sin(t * 1.1) * 0.012;

  // lean toward the streamer while licking
  const lickAmt = smooth(clamp((t - 0.7) / 0.5, 0, 1)) * (1 - smooth(clamp((t - 2.62) / 0.4, 0, 1)));
  x = lerp(x, camCx, 0.10 * lickAmt);
  y -= 8 * S * lickAmt;

  // lunge at the bite, then recoil
  if (t >= 14.9 && t < 16.16) {
    const k = smooth(clamp((t - 14.9) / 1.2, 0, 1));
    x = lerp(x, camCx, 0.16 * k);
    y -= 26 * S * k;
    tilt = lerp(tilt, -0.06 * st.dir * -1, k * 0.7);
  } else if (t >= 16.16 && t < 17.3) {
    const k = smooth(clamp((t - 16.16) / 0.3, 0, 1));
    const back = 1 - smooth(clamp((t - 16.46) / 0.7, 0, 1));
    x = lerp(x, camCx, 0.16 * (1 - k) + 0.03 * back);
    y += 16 * S * k * back;
    tilt = lerp(tilt, 0.05, k * back);
  }

  // smug satisfied wobble at the end
  if (t > 17.6) {
    tilt += Math.sin((t - 17.6) * 2.4) * 0.03;
    y += Math.sin((t - 17.6) * 2.4) * 3 * S;
  }

  const mouthLocalY = 64;
  const mouthX = x + (-Math.sin(tilt) * mouthLocalY) * S;
  const mouthY = y + (Math.cos(tilt) * mouthLocalY) * S;

  return {
    x,
    y,
    s: S,
    tilt,
    mouthX,
    mouthY,
    excitement,
    anger: angerAt(t),
    open: openAt(t),
    chew: t > 17.5 ? Math.abs(Math.sin((t - 17.5) * 7)) : 0,
    lick: lickAmt,
  };
}

function drawClown(g, st, t, o) {
  const { x, y, s, anger, open, chew, excitement } = o;
  g.save();
  g.translate(x, y);
  g.rotate(o.tilt);
  g.scale(s, s);

  // contact shadow, never a background
  g.fillStyle = 'rgba(6, 8, 18, 0.26)';
  ellipse(g, 0, 152, 118, 20, 0);
  g.fill();

  // toxic hair
  g.fillStyle = '#1fbf68';
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.95 + i * 0.40 + Math.sin(t * 1.7 + i) * 0.05;
    const hx = Math.cos(a) * 104;
    const hy = -56 + Math.sin(a) * 90;
    ellipse(g, hx, hy, 44, 31, a);
    g.fill();
  }
  g.fillStyle = 'rgba(10, 110, 60, 0.5)';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI * 0.8 + i * 0.42;
    ellipse(g, Math.cos(a) * 100, -44 + Math.sin(a) * 88, 20, 14, a);
    g.fill();
  }

  // tiny crooked hat
  g.save();
  g.translate(6, -132);
  g.rotate(-0.16 + Math.sin(t * 1.3) * 0.02);
  g.fillStyle = '#6a3fb5';
  g.beginPath();
  g.moveTo(-56, 0);
  g.lineTo(56, 0);
  g.lineTo(34, -46);
  g.lineTo(-34, -46);
  g.closePath();
  g.fill();
  g.fillStyle = '#4d2b8a';
  ellipse(g, 0, 2, 62, 13, 0);
  g.fill();
  g.fillStyle = '#ffdb4d';
  ellipse(g, 0, -22, 9, 9, 0);
  g.fill();
  g.restore();

  // head
  const hg = g.createRadialGradient(-34, -42, 12, 0, 0, 160);
  hg.addColorStop(0, '#fffdf8');
  hg.addColorStop(0.62, '#f4eadf');
  hg.addColorStop(1, '#d9c9bb');
  ellipse(g, 0, 0, 112, 124, 0);
  g.fillStyle = hg;
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(74, 44, 60, 0.65)';
  g.stroke();

  // furious flush
  if (anger > 0.02) {
    const flush = g.createRadialGradient(0, 34, 10, 0, 34, 120);
    flush.addColorStop(0, `rgba(255, 86, 96, ${0.34 * anger})`);
    flush.addColorStop(1, 'rgba(255, 86, 96, 0)');
    g.fillStyle = flush;
    ellipse(g, 0, 30, 112, 118, 0);
    g.fill();
  }

  // ears
  for (const side of [-1, 1]) {
    ellipse(g, side * 112, 6, 17, 26, side * 0.2);
    g.fillStyle = '#f4eadf';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = 'rgba(74, 44, 60, 0.55)';
    g.stroke();
  }

  // eyes
  const jitter = 0.5 + anger * 2.6;
  for (const side of [-1, 1]) {
    const ex = side * 46 + side * 4;
    const ey = -20 + side * 2;
    const rx = side < 0 ? 33 : 27;
    const ry = side < 0 ? 30 : 35;

    // purple eyeshadow
    g.fillStyle = 'rgba(122, 60, 190, 0.55)';
    g.beginPath();
    g.moveTo(ex - rx - 8, ey - ry - 4);
    g.quadraticCurveTo(ex + side * 6, ey - ry - 30, ex + rx + 10, ey - ry + 2);
    g.quadraticCurveTo(ex, ey - ry + 12, ex - rx - 8, ey - ry - 4);
    g.closePath();
    g.fill();

    ellipse(g, ex, ey, rx, ry, 0);
    g.fillStyle = '#fffdf6';
    g.fill();
    g.lineWidth = 4;
    g.strokeStyle = anger > 0.4 ? '#b5394a' : 'rgba(74, 44, 60, 0.6)';
    g.stroke();

    const tgx = (st.camCx - x) / (s * 620);
    const tgy = (st.camCy - y) / (s * 620);
    const lookX = clamp(tgx * 160, -1, 1) * 5;
    const lookY = clamp(tgy * 120, -1, 1) * 4;
    const px = ex + lookX + Math.sin(t * 13.7 + side * 2.1) * jitter;
    const py = ey + lookY + Math.cos(t * 11.3 + side) * jitter * 0.8;

    ellipse(g, px, py, rx * 0.42, ry * 0.46, 0);
    g.fillStyle = '#1b1220';
    g.fill();
    ellipse(g, px + rx * 0.14, py - ry * 0.14, rx * 0.13, ry * 0.13, 0);
    g.fillStyle = 'rgba(255, 255, 255, 0.9)';
    g.fill();

    // eyelid creeping down as he stews
    const lid = anger * 0.34;
    if (lid > 0.02) {
      g.save();
      ellipse(g, ex, ey, rx, ry, 0);
      g.clip();
      g.fillStyle = '#f0e2d5';
      g.fillRect(ex - rx - 4, ey - ry - 4, rx * 2 + 8, ry * 2 * lid);
      g.restore();
      g.lineWidth = 4;
      g.strokeStyle = '#b5394a';
      ellipse(g, ex, ey, rx, ry, 0);
      g.stroke();
    }
  }

  // brows
  g.strokeStyle = '#241726';
  g.lineWidth = 8;
  g.lineCap = 'round';
  const browDrop = 6 + anger * 18;
  g.beginPath();
  g.moveTo(-82, -70 + browDrop * 0.3);
  g.lineTo(-22, -60 + browDrop);
  g.stroke();
  g.beginPath();
  g.moveTo(82, -74 + browDrop * 0.3);
  g.lineTo(20, -62 + browDrop);
  g.stroke();

  // nose
  const nose = g.createRadialGradient(-8, 24, 4, 0, 34, 30);
  nose.addColorStop(0, '#ff7d84');
  nose.addColorStop(1, '#c31f34');
  ellipse(g, 0, 34, 28, 26, 0);
  g.fillStyle = nose;
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(90, 12, 26, 0.6)';
  g.stroke();
  ellipse(g, -8, 26, 8, 6, -0.5);
  g.fillStyle = 'rgba(255, 255, 255, 0.55)';
  g.fill();

  // mouth
  const my = 64;
  if (open > 0.06) {
    const rx = 66 + 40 * open;
    const ry = 22 + 76 * open;
    // lips
    ellipse(g, 0, my, rx + 9, ry + 8, 0);
    g.fillStyle = '#a3132e';
    g.fill();
    // throat
    ellipse(g, 0, my, rx, ry, 0);
    const th = g.createRadialGradient(0, my - ry * 0.2, 4, 0, my + ry * 0.2, ry);
    th.addColorStop(0, '#3a0714');
    th.addColorStop(1, '#120208');
    g.fillStyle = th;
    g.fill();
    // inner tongue
    ellipse(g, 0, my + ry * 0.42, rx * 0.62, ry * 0.36, 0);
    g.fillStyle = '#d95a76';
    g.fill();

    // teeth
    const tn = Math.max(5, Math.round(rx / 13));
    const step = (rx * 1.7) / tn;
    for (let i = 0; i < tn; i++) {
      const tx = -rx * 0.85 + step * (i + 0.5);
      g.beginPath();
      g.moveTo(tx - step * 0.42, my - ry * 0.82);
      g.lineTo(tx + step * 0.42, my - ry * 0.82);
      g.lineTo(tx, my - ry * 0.22);
      g.closePath();
      g.fillStyle = i % 3 === 1 ? '#f0dfae' : '#fff8e2';
      g.fill();
      g.lineWidth = 2;
      g.strokeStyle = 'rgba(90, 60, 40, 0.5)';
      g.stroke();
      g.beginPath();
      g.moveTo(tx - step * 0.38, my + ry * 0.78);
      g.lineTo(tx + step * 0.38, my + ry * 0.78);
      g.lineTo(tx, my + ry * 0.26);
      g.closePath();
      g.fillStyle = i % 4 === 2 ? '#e8d3a2' : '#fff8e2';
      g.fill();
      g.stroke();
    }
  } else {
    // clenched grin
    g.beginPath();
    g.moveTo(-70, my - 12);
    g.quadraticCurveTo(0, my + 46 + chew * 8, 70, my - 12);
    g.quadraticCurveTo(0, my - 6, -70, my - 12);
    g.closePath();
    g.fillStyle = '#2a0712';
    g.fill();
    g.lineWidth = 5;
    g.strokeStyle = '#a3132e';
    g.stroke();
    // teeth strip
    g.save();
    g.beginPath();
    g.moveTo(-70, my - 12);
    g.quadraticCurveTo(0, my + 46 + chew * 8, 70, my - 12);
    g.quadraticCurveTo(0, my - 6, -70, my - 12);
    g.closePath();
    g.clip();
    g.fillStyle = '#fff7e0';
    g.fillRect(-74, my - 14, 148, 20);
    g.strokeStyle = 'rgba(110, 76, 50, 0.55)';
    g.lineWidth = 2;
    for (let i = -5; i <= 5; i++) {
      g.beginPath();
      g.moveTo(i * 13, my - 14);
      g.lineTo(i * 13, my + 8);
      g.stroke();
    }
    g.restore();
  }

  // chin crease
  g.strokeStyle = 'rgba(74, 44, 60, 0.35)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-24, 118);
  g.quadraticCurveTo(0, 126, 24, 118);
  g.stroke();

  g.restore();
}

function drawTongue(g, st, t, base, tip, width, alpha) {
  if (alpha <= 0.01) return;
  const dx = tip.x - base.x;
  const dy = tip.y - base.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const bend = Math.sin(t * 7.1) * 0.14 + 0.10;
  const mx = (base.x + tip.x) * 0.5 + nx * len * bend;
  const my = (base.y + tip.y) * 0.5 + ny * len * bend;

  const N = 26;
  const left = [];
  const right = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const iu = 1 - u;
    const px = iu * iu * base.x + 2 * iu * u * mx + u * u * tip.x;
    const py = iu * iu * base.y + 2 * iu * u * my + u * u * tip.y;
    const tx = 2 * iu * (mx - base.x) + 2 * u * (tip.x - mx);
    const ty = 2 * iu * (my - base.y) + 2 * u * (tip.y - my);
    const tl = Math.hypot(tx, ty) || 1;
    const ux = -ty / tl;
    const uy = tx / tl;
    const w = width * (0.62 + 0.8 * Math.sin(Math.PI * Math.pow(u, 0.75))) * (1 - 0.2 * u);
    left.push([px + ux * w, py + uy * w]);
    right.push([px - ux * w, py - uy * w]);
  }

  const dirx = dx / len;
  const diry = dy / len;

  g.save();
  g.globalAlpha = alpha;
  g.beginPath();
  g.moveTo(left[0][0], left[0][1]);
  for (let i = 1; i <= N; i++) g.lineTo(left[i][0], left[i][1]);
  g.quadraticCurveTo(
    tip.x + dirx * width * 0.9,
    tip.y + diry * width * 0.9,
    right[N][0],
    right[N][1]
  );
  for (let i = N - 1; i >= 0; i--) g.lineTo(right[i][0], right[i][1]);
  g.closePath();

  const tg = g.createLinearGradient(base.x, base.y, tip.x, tip.y);
  tg.addColorStop(0, '#d9576f');
  tg.addColorStop(0.5, '#ff9ab2');
  tg.addColorStop(1, '#ff7d9c');
  g.fillStyle = tg;
  g.fill();
  g.lineWidth = 3.5;
  g.strokeStyle = 'rgba(150, 44, 68, 0.85)';
  g.stroke();

  // taste bumps
  g.fillStyle = 'rgba(255, 205, 220, 0.55)';
  for (let i = 2; i < N - 1; i += 3) {
    const u = i / N;
    const iu = 1 - u;
    const px = iu * iu * base.x + 2 * iu * u * mx + u * u * tip.x;
    const py = iu * iu * base.y + 2 * iu * u * my + u * u * tip.y;
    ellipse(g, px, py, width * 0.16, width * 0.1, 0);
    g.fill();
  }

  // wet shine
  const hx = base.x * 0.45 + tip.x * 0.55;
  const hy = base.y * 0.45 + tip.y * 0.55;
  ellipse(g, hx, hy, width * 0.3, width * 0.13, Math.atan2(dy, dx));
  g.fillStyle = 'rgba(255, 255, 255, 0.35)';
  g.fill();

  g.restore();
}

function drawSauceSplat(g, st, t, sp) {
  const age = t - sp.land;
  if (age < 0) return;
  const grow = easeOutCubic(clamp(age / 0.16, 0, 1));
  if (grow <= 0.01) return;

  const alpha = 0.9;
  g.save();
  g.globalAlpha = alpha;

  // main blob
  ellipse(g, sp.tx, sp.ty, sp.r * grow, sp.r * 0.82 * grow, 0);
  g.fillStyle = '#7c3a10';
  g.fill();

  for (const lo of sp.lobes) {
    ellipse(g, sp.tx + lo.dx * grow, sp.ty + lo.dy * grow, lo.r * grow, lo.r * 0.8 * grow, 0);
    g.fillStyle = '#8d4513';
    g.fill();
  }

  // glossy highlight
  ellipse(g, sp.tx - sp.r * 0.22, sp.ty - sp.r * 0.3, sp.r * 0.3 * grow, sp.r * 0.16 * grow, -0.4);
  g.fillStyle = 'rgba(255, 214, 170, 0.45)';
  g.fill();

  // drip
  const dripLen = Math.min(age * sp.dripSpeed, sp.drip);
  if (dripLen > 2) {
    const bottom = sp.ty + sp.r * 0.6 + dripLen;
    g.lineWidth = Math.max(2, sp.r * 0.5);
    g.lineCap = 'round';
    g.strokeStyle = '#6b2f0c';
    g.beginPath();
    g.moveTo(sp.tx, sp.ty + sp.r * 0.3);
    g.lineTo(sp.tx, bottom);
    g.stroke();
    ellipse(g, sp.tx, bottom, sp.r * 0.34, sp.r * 0.4, 0);
    g.fillStyle = '#7c3a10';
    g.fill();
  }

  g.restore();
}

function drawFlyingSauce(g, st, t) {
  for (const d of st.drops) {
    const p = (t - d.at) / d.flight;
    if (p < 0 || p > 1) continue;
    const e = p;
    const px = lerp(d.sx, d.tx, e);
    const py = lerp(d.sy, d.ty, e) - Math.sin(Math.PI * e) * d.arc;
    const r = d.r * (0.55 + 0.45 * e);
    g.save();
    g.globalAlpha = 0.95;
    g.translate(px, py);
    g.rotate(d.spin * e + d.seed * 6);
    ellipse(g, 0, 0, r, r * 0.72, 0);
    g.fillStyle = '#8a4413';
    g.fill();
    ellipse(g, -r * 0.2, -r * 0.18, r * 0.32, r * 0.18, 0);
    g.fillStyle = 'rgba(255, 220, 180, 0.5)';
    g.fill();
    g.restore();
  }
}

function drawBottle(g, st, t) {
  if (t < 7.0 || t > 11.6) return;
  const appear = smooth(clamp((t - 7.0) / 0.25, 0, 1)) * (1 - smooth(clamp((t - 11.25) / 0.35, 0, 1)));
  if (appear <= 0.01) return;

  const { nozzle, dir } = st;
  const squeeze = t < 10.9 ? 0.5 + 0.5 * Math.sin(t * 17) : 0;
  const pump = Math.max(0, Math.sin(t * 9)) * 0.05;

  g.save();
  g.globalAlpha = appear;
  g.translate(nozzle.x, nozzle.y);
  g.rotate(dir > 0 ? -1.15 : 1.15);
  g.scale(1 + squeeze * 0.05, 1 - squeeze * 0.05 + pump);

  // body
  g.beginPath();
  g.roundRect ? g.roundRect(-34, 40, 68, 150, 18) : g.rect(-34, 40, 68, 150);
  const bg = g.createLinearGradient(-34, 40, 34, 190);
  bg.addColorStop(0, '#d94b32');
  bg.addColorStop(1, '#8e2718');
  g.fillStyle = bg;
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#4c130c';
  g.stroke();

  // label
  g.fillStyle = '#ffe9c7';
  g.fillRect(-30, 92, 60, 52);
  g.fillStyle = '#5b2209';
  g.font = '900 26px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BBQ', 0, 116);

  // neck + cap
  g.fillStyle = '#b33322';
  g.fillRect(-16, 12, 32, 32);
  g.fillStyle = '#ffcf3f';
  g.fillRect(-20, -2, 40, 18);
  // nozzle
  g.fillStyle = '#2a2a33';
  g.fillRect(-9, -26, 18, 28);
  g.fillStyle = '#6b2f0c';
  ellipse(g, 0, -28, 9, 5, 0);
  g.fill();

  // squeeze stream
  g.strokeStyle = '#8a4413';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(0, -28);
  g.quadraticCurveTo(dir * 18, -48 - pump * 300, dir * 26, -58 - pump * 340);
  g.stroke();

  g.restore();
}

function drawMaw(g, st, t) {
  if (t < 14.85 || t > 17.95) return;
  const r = st.rect;

  let top;
  let bottom;
  if (t < 16.16) {
    const k = smooth(clamp((t - 14.85) / 1.25, 0, 1));
    top = lerp(r.y - 120, r.y + r.h * 0.40, k);
    bottom = lerp(r.y + r.h + 120, r.y + r.h * 0.60, k);
  } else if (t < 16.52) {
    const k = smooth(clamp((t - 16.16) / 0.1, 0, 1));
    const mid = r.y + r.h * 0.5;
    top = lerp(r.y + r.h * 0.4, mid, k);
    bottom = lerp(r.y + r.h * 0.6, mid, k);
  } else if (t < 17.4) {
    const k = smooth(clamp((t - 16.52) / 0.25, 0, 1));
    top = lerp(r.y + r.h * 0.5, r.y + r.h * 0.30, k);
    bottom = lerp(r.y + r.h * 0.5, r.y + r.h * 0.70, k);
  } else {
    const k = smooth(clamp((t - 17.4) / 0.5, 0, 1));
    top = lerp(r.y + r.h * 0.3, r.y - 160, k);
    bottom = lerp(r.y + r.h * 0.7, r.y + r.h + 160, k);
  }

  const bx = r.x - r.w * 0.14;
  const bw = r.w * 1.28;

  const drawRow = (yTeeth, upward) => {
    const bandH = 150;
    const bandTop = upward ? yTeeth : yTeeth - bandH + 44;
    // white band
    g.beginPath();
    g.rect(bx, bandTop, bw, bandH - 44);
    g.fillStyle = '#fdf6e8';
    g.fill();
    // gums
    g.fillStyle = '#d9506b';
    g.fillRect(bx, upward ? yTeeth + 26 : yTeeth - 70, bw, 18);

    // teeth
    const n = Math.max(5, Math.round(bw / (r.w * 0.135)));
    const step = bw / n;
    for (let i = 0; i < n; i++) {
      const x0 = bx + i * step;
      g.beginPath();
      if (upward) {
        g.moveTo(x0 + step * 0.06, yTeeth + 30);
        g.lineTo(x0 + step * 0.94, yTeeth + 30);
        g.lineTo(x0 + step * 0.5, yTeeth - 34);
      } else {
        g.moveTo(x0 + step * 0.06, yTeeth - 30);
        g.lineTo(x0 + step * 0.94, yTeeth - 30);
        g.lineTo(x0 + step * 0.5, yTeeth + 34);
      }
      g.closePath();
      g.fillStyle = i % 3 === 1 ? '#f0dfae' : '#fffaf0';
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = 'rgba(120, 90, 66, 0.6)';
      g.stroke();
      if (i % 4 === 2) {
        // sauce on a tooth
        g.globalAlpha = 0.55;
        g.fillStyle = '#8a4413';
        g.beginPath();
        if (upward) {
          g.moveTo(x0 + step * 0.2, yTeeth + 28);
          g.lineTo(x0 + step * 0.8, yTeeth + 28);
          g.lineTo(x0 + step * 0.5, yTeeth + 4);
        } else {
          g.moveTo(x0 + step * 0.2, yTeeth - 28);
          g.lineTo(x0 + step * 0.8, yTeeth - 28);
          g.lineTo(x0 + step * 0.5, yTeeth - 4);
        }
        g.closePath();
        g.fill();
        g.globalAlpha = 1;
      }
    }
  };

  g.save();
  drawRow(top, false);
  drawRow(bottom, true);
  g.restore();
}

function drawBiteMark(g, st, t) {
  if (t < 16.3 || t > END_T) return;
  const r = st.rect;
  const k = smooth(clamp((t - 16.3) / 0.3, 0, 1));
  const cx = r.x + r.w * 0.16;
  const cy = r.y + r.h * 0.16;
  const rad = Math.min(r.w, r.h) * 0.2;

  g.save();
  g.globalAlpha = 0.9 * k;
  g.strokeStyle = 'rgba(255, 214, 228, 0.95)';
  g.lineWidth = 4;
  g.setLineDash([10, 8]);
  g.beginPath();
  g.arc(cx, cy, rad, -Math.PI * 0.1, Math.PI * 1.15);
  g.stroke();
  g.setLineDash([]);

  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 0.05 + (i / 6) * Math.PI * 1.2;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    ellipse(g, px, py, 7, 11, a);
    g.fillStyle = 'rgba(255, 236, 244, 0.85)';
    g.fill();
    g.lineWidth = 2;
    g.strokeStyle = 'rgba(180, 40, 70, 0.8)';
    g.stroke();
  }
  g.restore();
}

function drawLickStreak(g, st, t) {
  const a = smooth(clamp((t - 1.0) / 0.6, 0, 1)) * (1 - smooth(clamp((t - 3.2) / 1.0, 0, 1)));
  if (a <= 0.01) return;
  const r = st.rect;
  g.save();
  g.globalAlpha = 0.22 * a;
  const gr = g.createLinearGradient(r.x + r.w * 0.35, r.y + r.h * 0.85, r.x + r.w * 0.35, r.y + r.h * 0.15);
  gr.addColorStop(0, 'rgba(255, 255, 255, 0)');
  gr.addColorStop(0.5, 'rgba(255, 245, 250, 0.9)');
  gr.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = gr;
  g.beginPath();
  const x0 = r.x + r.w * 0.34;
  g.moveTo(x0 - r.w * 0.05, r.y + r.h * 0.86);
  g.quadraticCurveTo(x0 + r.w * 0.05, r.y + r.h * 0.5, x0 - r.w * 0.01, r.y + r.h * 0.14);
  g.lineTo(x0 + r.w * 0.05, r.y + r.h * 0.14);
  g.quadraticCurveTo(x0 + r.w * 0.11, r.y + r.h * 0.5, x0 + r.w * 0.05, r.y + r.h * 0.86);
  g.closePath();
  g.fill();
  g.restore();
}

function drawReticle(g, st, t) {
  const r = st.rect;
  const pulse = 0.55 + 0.2 * Math.sin(t * 2.0);
  const L = Math.min(30, r.w * 0.1, r.h * 0.1);
  g.save();
  g.strokeStyle = `rgba(255, 122, 212, ${pulse})`;
  g.lineWidth = 3;
  g.lineCap = 'round';
  const corners = [
    [r.x, r.y, 1, 1],
    [r.x + r.w, r.y, -1, 1],
    [r.x, r.y + r.h, 1, -1],
    [r.x + r.w, r.y + r.h, -1, -1],
  ];
  for (const c of corners) {
    g.beginPath();
    g.moveTo(c[0] + c[2] * L, c[1]);
    g.lineTo(c[0], c[1]);
    g.lineTo(c[0], c[1] + c[3] * L);
    g.stroke();
  }

  const sauced = t > 10.9 ? 1 : 0;
  const label = sauced ? 'SAVORYSAILOR · BBQ 100%' : 'SAVORYSAILOR · BBQ 0%';
  const fs = clamp(st.H * 0.015, 10, 17);
  g.font = `700 ${Math.round(fs)}px "Segoe UI", Arial, sans-serif`;
  g.textAlign = 'right';
  g.textBaseline = 'bottom';
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(16, 12, 26, 0.75)';
  g.strokeText(label, r.x + r.w - 8, r.y + r.h + fs + 8);
  g.fillStyle = sauced ? 'rgba(255, 214, 140, 0.95)' : `rgba(255, 180, 228, ${0.75 + 0.2 * Math.sin(t * 2.0)})`;
  g.fillText(label, r.x + r.w - 8, r.y + r.h + fs + 8);
  g.restore();
}

function drawCaption(g, st, t) {
  const { W, H, rect } = st;
  let cap = null;
  for (const c of st.captions) {
    if (t >= c.at && t <= c.until) {
      cap = c;
      break;
    }
  }
  if (!cap) return;

  const fadeIn = smooth(clamp((t - cap.at) / 0.25, 0, 1));
  const fadeOut = 1 - smooth(clamp((t - (cap.until - 0.35)) / 0.35, 0, 1));
  const alpha = Math.min(fadeIn, fadeOut);
  if (alpha <= 0.01) return;

  let ax = W * 0.5;
  let ay = H * 0.085;
  const above = rect.y - 44;
  const below = rect.y + rect.h + 58;
  if (above > H * 0.09) {
    ax = clamp(rect.x + rect.w * 0.5, W * 0.22, W * 0.78);
    ay = above;
  } else if (below < H * 0.93) {
    ax = clamp(rect.x + rect.w * 0.5, W * 0.22, W * 0.78);
    ay = below;
  }

  let fs = clamp(H * 0.033, 17, 40);
  const maxW = Math.min(W * 0.8, 1180);
  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let i = 0; i < 10; i++) {
    g.font = `900 ${Math.round(fs)}px "Arial Black", Impact, sans-serif`;
    if (g.measureText(cap.text).width <= maxW) break;
    fs *= 0.9;
  }
  g.globalAlpha = alpha;
  g.lineWidth = Math.max(5, fs * 0.17);
  g.strokeStyle = 'rgba(20, 10, 24, 0.88)';
  g.strokeText(cap.text, ax, ay);
  g.fillStyle = '#fff6ef';
  g.fillText(cap.text, ax, ay);
  g.globalAlpha = 1;
  g.restore();
}

function drawChompWord(g, st, t) {
  if (t < 16.1 || t > 17.0) return;
  const p = (t - 16.1) / 0.9;
  const pop = easeOutCubic(clamp(p / 0.18, 0, 1));
  const fade = 1 - smooth(clamp((p - 0.6) / 0.4, 0, 1));
  g.save();
  g.translate(st.W * 0.5, st.H * 0.28);
  g.rotate(-0.08);
  g.scale(pop * (1 + 0.06 * Math.sin(t * 30)), pop * (1 + 0.06 * Math.sin(t * 30)));
  g.globalAlpha = fade;
  g.font = `900 ${Math.round(clamp(st.H * 0.11, 44, 130))}px "Arial Black", Impact, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineWidth = 10;
  g.strokeStyle = '#2a0712';
  g.strokeText('CHOMP!', 0, 0);
  g.fillStyle = '#ffd166';
  g.fillText('CHOMP!', 0, 0);
  g.restore();
}

function drawLickDroplets(g, st, t, tip, alpha) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = alpha * 0.8;
  for (let i = 0; i < 3; i++) {
    const ph = t * 5 + i * 2.1;
    const px = tip.x + Math.sin(ph) * 14;
    const py = tip.y + Math.cos(ph * 0.8) * 12 + 6;
    ellipse(g, px, py, 3.5, 4.5, 0);
    g.fillStyle = 'rgba(255, 230, 240, 0.9)';
    g.fill();
  }
  g.restore();
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  g.clearRect(0, 0, ctx.width, ctx.height);

  if (!state) state = buildState(ctx);
  const st = state;

  if (t >= END_T || st.ended) {
    if (!ended) {
      ended = true;
      st.ended = true;
      ctx.done();
    }
    return;
  }

  playSounds(ctx, t);

  const pose = poseClown(st, t);
  const { rect } = st;

  // bite shake
  let shakeX = 0;
  let shakeY = 0;
  if (t >= 16.16 && t < 16.75) {
    const k = 1 - (t - 16.16) / 0.59;
    shakeX = Math.sin(t * 71) * 7 * k;
    shakeY = Math.cos(t * 63) * 5 * k;
  }
  if (t >= 10.85 && t < 11.35) {
    const k = 1 - (t - 10.85) / 0.5;
    shakeX += Math.sin(t * 53) * 3 * k;
  }

  g.save();
  g.translate(shakeX, shakeY);

  drawReticle(g, st, t);
  drawLickStreak(g, st, t);

  // tongue under the clown head
  const lickAmt = pose.lick;
  if (lickAmt > 0.02) {
    const u = smooth(clamp((t - 0.78) / 0.4, 0, 1)) * (1 - smooth(clamp((t - 2.42) / 0.4, 0, 1)));
    const scan = (t - 0.9) / 1.5;
    const tipX = rect.x + rect.w * (0.42 + Math.sin(t * 2.6) * 0.05);
    const tipY = rect.y + rect.h * (0.72 - 0.42 * clamp(scan, 0, 1)) + Math.sin(t * 9) * 6;
    const ext = u;
    const base = { x: pose.mouthX, y: pose.mouthY };
    const tip = {
      x: lerp(base.x, tipX, ext),
      y: lerp(base.y, tipY, ext),
    };
    if (ext > 0.02) {
      drawTongue(g, st, t, base, tip, 24 * st.S * (0.55 + 0.45 * ext), clamp(ext * 1.5, 0, 1));
      drawLickDroplets(g, st, t, tip, clamp(ext - 0.4, 0, 1));
    }
  }

  drawClown(g, st, t, pose);

  // sauce landing on the stream
  for (const sp of st.splats) drawSauceSplat(g, st, t, sp);
  drawFlyingSauce(g, st, t);
  drawBottle(g, st, t);

  drawMaw(g, st, t);
  drawBiteMark(g, st, t);

  g.restore();

  drawChompWord(g, st, t);
  drawCaption(g, st, t);
}

export function dispose() {
  ended = true;
}
