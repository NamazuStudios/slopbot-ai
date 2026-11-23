// A gigantic fuzzy orange gentleman, a hidden chocolate fountain, and one
// very sticky streamer. Everything floats on transparent glass.

export const meta = {
  title: 'Chocolate Pants Fountain',
  author: 'doctordiggitydank',
  prompt:
    'A gigantic guy walks onto the screen looking like Ernie from Sesame Street. He reaches the halfway point and then turns around. He has a hidden c',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

/* ------------------------------------------------------------------ */
/* timeline                                                            */
/* ------------------------------------------------------------------ */

const T = {
  walkIn: 4.2,
  turn: 5.9,
  pants: 6.1,
  sprayStart: 7.4,
  sprayEnd: 41.0,
  walkOut: 42.6,
  end: 48.2,
};

let S = null;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function smooth(p) {
  p = clamp(p, 0, 1);
  return p * p * (3 - 2 * p);
}

function easeInOut(p) {
  p = clamp(p, 0, 1);
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}

function rrect(c, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arcTo(x + w, y, x + w, y + r, r);
  c.lineTo(x + w, y + h - r);
  c.arcTo(x + w, y + h, x + w - r, y + h, r);
  c.lineTo(x + r, y + h);
  c.arcTo(x, y + h, x, y + h - r, r);
  c.lineTo(x, y + r);
  c.arcTo(x, y, x + r, y, r);
  c.closePath();
}

const CHOCO = '#4a2411';
const CHOCO_LIGHT = '#7d4420';
const CHOCO_DARK = '#2b1308';

/* ------------------------------------------------------------------ */
/* init                                                                */
/* ------------------------------------------------------------------ */

export function init(ctx) {
  const rand = ctx.rand;
  const fur = [];
  for (let i = 0; i < 150; i++) {
    fur.push({
      u: rand() * 2 - 1,
      v: rand(),
      len: 0.006 + rand() * 0.011,
      a: 0.22 + rand() * 0.5,
      light: rand() < 0.45,
    });
  }
  const drops = [];
  for (let i = 0; i < 40; i++) drops.push(i / 40);

  S = {
    fur,
    drops,
    splats: [],
    fired: {},
    lastStep: -1,
    lastSplatBeep: -1,
    lastHiss: -1,
    lastSpawn: 0,
    done: false,
    t: 0,
  };
}

/* ------------------------------------------------------------------ */
/* the fuzzy giant                                                     */
/* ------------------------------------------------------------------ */

function drawGuy(c, H, g) {
  const h = g.h;
  const squeeze = g.squeeze;
  const orange = '#e79a2b';
  const orangeDark = '#bd7520';
  const orangeLight = '#f7c164';

  // floor shadow
  c.save();
  c.globalAlpha = 0.26;
  c.fillStyle = '#000';
  c.beginPath();
  c.ellipse(g.gx, g.gy + h * 0.008, h * 0.185, h * 0.026, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  c.save();
  c.translate(g.gx, g.gy + g.bob);
  c.scale(squeeze, 1);

  // legs
  c.fillStyle = orangeDark;
  rrect(c, -h * 0.125, -h * 0.215, h * 0.09, h * 0.215, h * 0.04);
  c.fill();
  rrect(c, h * 0.035, -h * 0.215, h * 0.09, h * 0.215, h * 0.04);
  c.fill();

  // feet
  c.fillStyle = '#5c3a12';
  rrect(c, -h * 0.155, -h * 0.045, h * 0.13, h * 0.045, h * 0.02);
  c.fill();
  rrect(c, h * 0.025, -h * 0.045, h * 0.13, h * 0.045, h * 0.02);
  c.fill();

  // torso
  c.fillStyle = orange;
  c.beginPath();
  c.ellipse(0, -h * 0.47, h * 0.178, h * 0.258, 0, 0, Math.PI * 2);
  c.fill();

  // fur texture on torso
  c.save();
  c.beginPath();
  c.ellipse(0, -h * 0.47, h * 0.178, h * 0.258, 0, 0, Math.PI * 2);
  c.clip();
  c.lineWidth = Math.max(1.1, h * 0.004);
  c.lineCap = 'round';
  for (let i = 0; i < S.fur.length; i++) {
    const f = S.fur[i];
    const x = f.u * h * 0.172;
    const y = -h * 0.47 + (f.v - 0.5) * h * 0.51;
    c.strokeStyle = f.light
      ? 'rgba(255, 214, 138, ' + f.a.toFixed(2) + ')'
      : 'rgba(140, 76, 12, ' + f.a.toFixed(2) + ')';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + f.u * h * 0.004, y - f.len * h);
    c.stroke();
  }
  c.restore();

  // pants (they live here, until they do not)
  if (g.pantsDrop < 0.99 || !g.back) {
    const drop = g.pantsDrop;
    const py = -h * 0.335 + drop * h * 0.245;
    const ph = h * 0.185 * (1 - 0.42 * drop);
    const pw = h * 0.185 * (1 + 1.05 * drop);
    c.fillStyle = '#3d5fae';
    rrect(c, -pw / 2, py, pw, ph, h * 0.03);
    c.fill();
    c.fillStyle = '#2c4585';
    rrect(c, -pw / 2, py, pw, h * 0.024, h * 0.008);
    c.fill();
    c.fillStyle = '#f0d34a';
    c.beginPath();
    c.arc(0, py + h * 0.012, h * 0.012, 0, Math.PI * 2);
    c.fill();
  }

  // rear, revealed. two fuzzy circles, zero anatomy, all comedy
  if (g.back && g.pantsDrop > 0.1) {
    const reveal = smooth(clamp((g.pantsDrop - 0.1) / 0.5, 0, 1));
    c.save();
    c.globalAlpha = reveal;
    c.fillStyle = orange;
    c.beginPath();
    c.ellipse(-h * 0.062, -h * 0.268, h * 0.079, h * 0.073, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.ellipse(h * 0.062, -h * 0.268, h * 0.079, h * 0.073, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(140, 76, 12, 0.55)';
    c.lineWidth = Math.max(1.5, h * 0.006);
    c.beginPath();
    c.moveTo(0, -h * 0.335);
    c.quadraticCurveTo(h * 0.006, -h * 0.27, 0, -h * 0.205);
    c.stroke();
    c.strokeStyle = 'rgba(255, 220, 160, 0.35)';
    c.lineWidth = Math.max(1, h * 0.005);
    c.beginPath();
    c.arc(-h * 0.062, -h * 0.268, h * 0.062, Math.PI * 1.05, Math.PI * 1.75);
    c.stroke();
    c.beginPath();
    c.arc(h * 0.062, -h * 0.268, h * 0.062, Math.PI * 1.25, Math.PI * 1.95);
    c.stroke();
    c.restore();
  }

  // arms
  c.fillStyle = orange;
  c.save();
  c.translate(-h * 0.205, -h * 0.44);
  c.rotate(0.16);
  c.beginPath();
  c.ellipse(0, 0, h * 0.046, h * 0.152, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
  c.save();
  c.translate(h * 0.205, -h * 0.44);
  c.rotate(-0.16);
  c.beginPath();
  c.ellipse(0, 0, h * 0.046, h * 0.152, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // hands
  c.fillStyle = orangeLight;
  c.beginPath();
  c.arc(-h * 0.238, -h * 0.30, h * 0.042, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(h * 0.238, -h * 0.30, h * 0.042, 0, Math.PI * 2);
  c.fill();

  // collar
  c.strokeStyle = '#2f6f4a';
  c.lineWidth = h * 0.022;
  c.beginPath();
  c.arc(0, -h * 0.68, h * 0.105, Math.PI * 0.12, Math.PI * 0.88);
  c.stroke();

  // head
  c.fillStyle = orange;
  c.beginPath();
  c.ellipse(0, -h * 0.795, h * 0.118, h * 0.128, 0, 0, Math.PI * 2);
  c.fill();

  // hair tufts
  c.strokeStyle = '#3a2410';
  c.lineWidth = h * 0.012;
  c.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    c.beginPath();
    c.moveTo(i * h * 0.03, -h * 0.905);
    c.quadraticCurveTo(i * h * 0.045, -h * 0.945, i * h * 0.02, -h * 0.955);
    c.stroke();
  }

  if (!g.back) {
    // face
    const eyeR = h * 0.032;
    c.fillStyle = '#fff';
    c.beginPath();
    c.arc(-h * 0.048, -h * 0.815, eyeR, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(h * 0.048, -h * 0.815, eyeR, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#20140a';
    const blink = g.blink;
    if (blink) {
      c.fillRect(-h * 0.048 - eyeR, -h * 0.818, eyeR * 2, h * 0.007);
      c.fillRect(h * 0.048 - eyeR, -h * 0.818, eyeR * 2, h * 0.007);
    } else {
      c.beginPath();
      c.arc(-h * 0.044, -h * 0.812, eyeR * 0.5, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.arc(h * 0.052, -h * 0.812, eyeR * 0.5, 0, Math.PI * 2);
      c.fill();
    }
    // unibrow, one brow to rule them
    c.strokeStyle = '#2b1a0c';
    c.lineWidth = h * 0.014;
    c.beginPath();
    c.moveTo(-h * 0.078, -h * 0.862);
    c.quadraticCurveTo(0, -h * 0.878, h * 0.078, -h * 0.862);
    c.stroke();
    // nose
    c.fillStyle = orangeLight;
    c.beginPath();
    c.ellipse(0, -h * 0.762, h * 0.037, h * 0.031, 0, 0, Math.PI * 2);
    c.fill();
    // grin
    c.strokeStyle = '#2b1a0c';
    c.lineWidth = h * 0.011;
    c.beginPath();
    c.arc(0, -h * 0.74, h * 0.052, Math.PI * 0.12, Math.PI * 0.88);
    c.stroke();
  } else {
    // back of head: fur only
    c.strokeStyle = 'rgba(140, 76, 12, 0.5)';
    c.lineWidth = Math.max(1, h * 0.005);
    for (let i = 0; i < 9; i++) {
      const a = Math.PI * (0.1 + i * 0.1);
      c.beginPath();
      c.moveTo(Math.cos(a) * h * 0.04, -h * 0.80 + Math.sin(a) * h * 0.03);
      c.lineTo(Math.cos(a) * h * 0.07, -h * 0.80 + Math.sin(a) * h * 0.055);
      c.stroke();
    }
  }

  // the smuggled fountain, fully unlicensed
  if (g.pantsDrop > 0.55) {
    const rev = smooth(clamp((g.pantsDrop - 0.55) / 0.4, 0, 1));
    c.save();
    c.globalAlpha = rev;
    c.fillStyle = '#a9723a';
    rrect(c, 0, -h * 0.316, h * 0.115, h * 0.034, h * 0.012);
    c.fill();
    c.fillStyle = '#7a4d24';
    rrect(c, 0, -h * 0.316, h * 0.115, h * 0.011, h * 0.005);
    c.fill();
    c.fillStyle = '#d9b163';
    rrect(c, h * 0.088, -h * 0.322, h * 0.03, h * 0.046, h * 0.008);
    c.fill();
    c.strokeStyle = '#8d5e2c';
    c.lineWidth = h * 0.008;
    c.beginPath();
    c.arc(h * 0.048, -h * 0.352, h * 0.024, 0, Math.PI * 2);
    c.stroke();
    c.fillStyle = '#f6e2a6';
    c.font = '900 ' + Math.round(h * 0.026) + 'px Arial, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('F', h * 0.048, -h * 0.352);
    c.restore();
  }

  c.restore();
}

/* ------------------------------------------------------------------ */
/* the chocolate stream                                                */
/* ------------------------------------------------------------------ */

function streamPos(t, p, x0, y0, tx, ty, W, H) {
  const cx = (x0 + tx) * 0.5 + Math.sin(t * 1.7) * W * 0.012;
  const cy = Math.min(y0, ty) - H * 0.235;
  const u = 1 - p;
  let x = u * u * x0 + 2 * u * p * cx + p * p * tx;
  let y = u * u * y0 + 2 * u * p * cy + p * p * ty;
  const wob = Math.sin(t * 9 + p * 11) * H * 0.009 * p;
  x += wob;
  y += Math.cos(t * 7 + p * 9) * H * 0.006 * p;
  return { x, y };
}

function drawStream(c, t, H, x0, y0, tx, ty, W, thick) {
  const N = 26;
  // body of the stream
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';
  for (let pass = 0; pass < 2; pass++) {
    c.beginPath();
    for (let i = 0; i <= N; i++) {
      const p = i / N;
      const pt = streamPos(t, p, x0, y0, tx, ty, W, H);
      if (i === 0) c.moveTo(pt.x, pt.y);
      else c.lineTo(pt.x, pt.y);
    }
    c.strokeStyle = pass === 0 ? CHOCO_DARK : CHOCO;
    c.lineWidth = pass === 0 ? thick * 1.5 : thick;
    c.stroke();
  }
  // glossy highlight
  c.beginPath();
  for (let i = 0; i <= N; i++) {
    const p = i / N;
    const pt = streamPos(t, p, x0, y0, tx, ty, W, H);
    if (i === 0) c.moveTo(pt.x, pt.y - thick * 0.22);
    else c.lineTo(pt.x, pt.y - thick * 0.22);
  }
  c.strokeStyle = 'rgba(150, 96, 48, 0.75)';
  c.lineWidth = Math.max(1.4, thick * 0.28);
  c.stroke();
  c.restore();

  // droplets riding the flow
  for (let i = 0; i < S.drops.length; i++) {
    const p = (t * 1.35 + S.drops[i]) % 1;
    const pt = streamPos(t, p, x0, y0, tx, ty, W, H);
    const r = thick * (0.30 + 0.16 * Math.sin(i * 4.1 + t * 3));
    c.fillStyle = i % 3 === 0 ? CHOCO_LIGHT : CHOCO;
    c.beginPath();
    c.arc(pt.x, pt.y + thick * 0.16, Math.max(1.2, r), 0, Math.PI * 2);
    c.fill();
  }

  // impact splash
  const imp = streamPos(1, 1, x0, y0, tx, ty, W, H);
  c.save();
  c.globalAlpha = 0.85;
  c.fillStyle = CHOCO_LIGHT;
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + t * 2.4;
    const d = thick * (0.7 + 0.5 * Math.sin(t * 8 + i));
    c.beginPath();
    c.arc(imp.x + Math.cos(a) * d, imp.y + Math.sin(a) * d * 0.8, Math.max(1.4, thick * 0.2), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

/* ------------------------------------------------------------------ */
/* captions                                                           */
/* ------------------------------------------------------------------ */

const CAPTIONS = [
  [0.3, 3.3, 'KNOCK KNOCK, SAVORYSAILOR.'],
  [3.7, 5.6, 'OH. HE IS TURNING AROUND.'],
  [6.0, 7.4, 'THAT IS NOT A POCKET.'],
  [7.7, 11.0, 'SAVORYSAILOR, BRACE YOURSELF.'],
  [11.2, 15.2, 'THIS IS A LOT OF CHOCOLATE.'],
  [15.4, 19.4, 'IT IS STILL GOING.'],
  [19.6, 23.8, 'THE FLOOR IS CHOCOLATE NOW.'],
  [24.0, 28.4, 'HE IS NOT TIRED. HE IS THRIVING.'],
  [28.6, 32.8, 'SOMEONE GET SAVORYSAILOR A TOWEL.'],
  [33.0, 37.0, 'THIRTY SECONDS. NO WORDS.'],
  [37.2, 41.2, 'AND STILL THE FOUNTAIN FLOWS.'],
  [41.6, 44.6, 'HE IS DONE. HE IS LEAVING.'],
  [44.8, 47.9, 'SAVORYSAILOR SMELLS LIKE A CANDY BAR.'],
];

function drawCaptions(c, t, W, H) {
  let text = null;
  let alpha = 0;
  for (let i = 0; i < CAPTIONS.length; i++) {
    const cap = CAPTIONS[i];
    if (t >= cap[0] && t <= cap[1]) {
      text = cap[2];
      const fin = smooth((t - cap[0]) / 0.22);
      const fout = smooth((cap[1] - t) / 0.22);
      alpha = Math.min(fin, fout);
      break;
    }
  }
  if (!text || alpha <= 0.01) return;

  c.save();
  c.globalAlpha = Math.max(0, Math.min(1, alpha));
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let size = Math.round(H * 0.052);
  const maxW = W * 0.82;
  for (let guard = 0; guard < 40; guard++) {
    c.font = '900 ' + size + 'px "Arial Black", Arial, sans-serif';
    if (c.measureText(text).width <= maxW || size <= 14) break;
    size -= 2;
  }
  const tw = c.measureText(text).width;
  const bw = Math.min(maxW + size, tw + size * 1.6);
  const bh = size * 1.95;
  const cx = W / 2;
  const cy = H * 0.862;
  c.fillStyle = 'rgba(28, 12, 5, 0.74)';
  rrect(c, cx - bw / 2, cy - bh / 2, bw, bh, bh * 0.34);
  c.fill();
  c.strokeStyle = 'rgba(255, 226, 184, 0.28)';
  c.lineWidth = Math.max(1.5, H * 0.0022);
  c.stroke();
  c.fillStyle = '#ffecc9';
  c.fillText(text, cx, cy + 1);
  c.restore();
}

/* ------------------------------------------------------------------ */
/* frame                                                              */
/* ------------------------------------------------------------------ */

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  if (!S) init(ctx);
  S.t = t;

  c.clearRect(0, 0, W, H);

  dt = Math.min(0.05, dt > 0 ? dt : 0.016);

  const st = ctx.streamer;
  const target = st
    ? { x: (st.x + st.w * 0.5) * W, y: (st.y + st.h * 0.5) * H, w: st.w * W, h: st.h * H }
    : { x: W * 0.74, y: H * 0.44, w: W * 0.26, h: H * 0.48 };

  const h = H * 1.0;
  const inX = W * 0.335;
  const startX = -W * 0.24;
  const outX = W * 1.32;
  const gy = H * 0.975;

  let gx = inX;
  let flip = 1;
  let back = false;
  let pantsDrop = 0;
  let spraying = false;
  let walking = false;

  if (t < T.walkIn) {
    const p = easeInOut(t / T.walkIn);
    gx = startX + (inX - startX) * p;
    walking = true;
  } else if (t < T.turn) {
    const p = (t - T.walkIn) / (T.turn - T.walkIn);
    flip = Math.cos(Math.PI * smooth(p));
    back = p > 0.5;
    gx = inX;
  } else if (t < T.walkOut) {
    gx = inX;
    flip = -1;
    back = true;
    pantsDrop = smooth(clamp((t - T.pants) / 1.4, 0, 1));
    spraying = t >= T.sprayStart && t < T.sprayEnd;
  } else {
    const p = easeInOut(clamp((t - T.walkOut) / (T.end - T.walkOut), 0, 1));
    gx = inX + (outX - inX) * p;
    flip = -1;
    back = true;
    pantsDrop = 1 - smooth(clamp((t - T.walkOut) / 0.8, 0, 1));
    walking = p < 0.96;
  }

  const bob = walking
    ? Math.abs(Math.sin(t * 10.5)) * H * 0.016 - H * 0.008
    : Math.sin(t * 2.2) * H * 0.004;
  const squeeze = Math.max(0.14, Math.abs(flip));
  const blink = !back && Math.sin(t * 1.3) > 0.985;

  /* ---- audio cues ---- */
  const fire = (key, when, fn) => {
    if (t >= when && !S.fired[key]) {
      S.fired[key] = true;
      fn();
    }
  };

  fire('start', 0.05, () => ctx.sound.beep(160, 130));
  fire('turn', T.walkIn, () => ctx.sound.noise(320));
  fire('pants', T.pants + 0.15, () => ctx.sound.noise(240));
  fire('spray', T.sprayStart, () => ctx.sound.beep(70, 200));
  fire('sputter', T.sprayEnd - 0.1, () => ctx.sound.noise(360));
  fire('away', T.walkOut + 0.25, () => ctx.sound.beep(130, 160));

  if (walking) {
    const step = Math.floor(t / 0.32);
    if (step !== S.lastStep) {
      S.lastStep = step;
      ctx.sound.beep(85 + ctx.rand() * 25, 70);
    }
  }

  /* ---- spray spawns ---- */
  const nozzleX = gx + h * 0.10 * squeeze;
  const nozzleY = gy + bob - h * 0.316;

  if (spraying) {
    S.lastSpawn += dt;
    const burst = S.lastSpawn > 0.045 ? 3 : 0;
    if (burst) {
      S.lastSpawn = 0;
      for (let k = 0; k < burst; k++) {
        const g1 = (ctx.rand() + ctx.rand() + ctx.rand() - 1.5) / 1.5;
        const g2 = (ctx.rand() + ctx.rand() + ctx.rand() - 1.5) / 1.5;
        S.splats.push({
          x: target.x + g1 * target.w * 0.62,
          y: target.y + g2 * target.h * 0.58,
          r: H * (0.007 + ctx.rand() * 0.018),
          born: t,
          drip: ctx.rand() < 0.24,
          a: 0.30 + ctx.rand() * 0.32,
        });
      }
      if (S.splats.length > 150) S.splats.splice(0, S.splats.length - 150);
    }

    const beepSlot = Math.floor(t / 0.42);
    if (beepSlot !== S.lastSplatBeep) {
      S.lastSplatBeep = beepSlot;
      ctx.sound.beep(95 + ctx.rand() * 110, 45);
    }
    const hissSlot = Math.floor(t / 1.6);
    if (hissSlot !== S.lastHiss) {
      S.lastHiss = hissSlot;
      ctx.sound.noise(220);
    }
  }

  /* ---- chocolate on the lens ---- */
  c.save();
  for (let i = 0; i < S.splats.length; i++) {
    const s = S.splats[i];
    c.globalAlpha = s.a;
    c.fillStyle = i % 4 === 0 ? CHOCO_LIGHT : CHOCO;
    c.beginPath();
    c.ellipse(s.x, s.y, s.r * 1.25, s.r, (i % 5) * 0.3, 0, Math.PI * 2);
    c.fill();
  }
  // drips
  c.fillStyle = CHOCO;
  for (let i = 0; i < S.splats.length; i += 3) {
    const s = S.splats[i];
    if (!s.drip) continue;
    const len = Math.min(H * 0.16, (t - s.born) * H * 0.035 + s.r * 2);
    if (len < 2) continue;
    c.globalAlpha = 0.55;
    c.beginPath();
    c.moveTo(s.x - s.r * 0.35, s.y);
    c.lineTo(s.x - s.r * 0.2, s.y + len);
    c.lineTo(s.x + s.r * 0.2, s.y + len);
    c.lineTo(s.x + s.r * 0.35, s.y);
    c.closePath();
    c.fill();
    c.beginPath();
    c.arc(s.x, s.y + len, s.r * 0.42, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();

  // chocolate puddle growing under the poor streamer
  const puddleT = clamp((t - T.sprayStart) / (T.sprayEnd - T.sprayStart + 3), 0, 1);
  if (puddleT > 0) {
    const pw = target.w * (0.25 + 0.75 * puddleT);
    const py = Math.min(H * 0.96, target.y + target.h * 0.52);
    c.save();
    c.globalAlpha = 0.75;
    c.fillStyle = CHOCO;
    c.beginPath();
    c.ellipse(target.x, py, pw * 0.6, H * 0.03 * (0.5 + puddleT), 0, 0, Math.PI * 2);
    c.fill();
    c.globalAlpha = 0.5;
    c.fillStyle = CHOCO_LIGHT;
    c.beginPath();
    c.ellipse(target.x - pw * 0.12, py - H * 0.006, pw * 0.28, H * 0.012, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /* ---- the man himself ---- */
  drawGuy(c, H, {
    h,
    gx,
    gy,
    bob,
    flip,
    squeeze,
    back,
    pantsDrop,
    t,
    blink,
  });

  /* ---- the stream ---- */
  if (spraying && pantsDrop > 0.9) {
    const thick = H * (0.018 + 0.004 * Math.sin(t * 6));
    drawStream(c, t, H, nozzleX, nozzleY, target.x, target.y, W, thick);
  }

  /* ---- labels ---- */
  drawCaptions(c, t, W, H);

  // tiny tasteful title card at the very end
  const endA = smooth(clamp((t - 45.6) / 0.8, 0, 1)) * smooth(clamp((T.end - t) / 0.6, 0, 1));
  if (endA > 0.01) {
    c.save();
    c.globalAlpha = endA;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = '900 ' + Math.round(H * 0.085) + 'px "Arial Black", Arial, sans-serif';
    c.fillStyle = 'rgba(255, 236, 201, 0.92)';
    c.fillText('THE END', W / 2, H * 0.20);
    c.restore();
  }

  if (!S.done && t >= T.end) {
    S.done = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
