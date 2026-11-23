// Tiny People Stampede — 2000 parachuting commuters over the live shot.
// Pure animation, transparent glass, no background paint.

export const meta = {
  title: 'Tiny People Stampede',
  author: 'doctordiggitydank',
  prompt: 'Two thousand little tiny people get dropped into the screen by parachute and then run back and forth all over the screen for 20 seconds, and then they run away.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const COUNT = 2000;
const DROP_START = 0.4;
const RUN_END = 25.0;
const END_AT = 29.45;
const STRAGGLE_AT = 27.7;

const PAL = ['#ffd6a8', '#ff5fa2', '#8ef0d2', '#fff1cf', '#ffb45c', '#b9d4ff'];
const PAL_FAR = ['#a28f7e', '#a2507a', '#659b8e', '#aaa292', '#a67c4e', '#8595ab'];
const CANOPY = ['#ff5fa2', '#8ef0d2', '#ffd6a8', '#fff1cf', '#ffb45c', '#b9d4ff'];

let S = null;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, p) => a + (b - a) * p;

export function init(ctx) {
  const r = ctx.rand;
  const people = new Array(COUNT);

  for (let i = 0; i < COUNT; i++) {
    const depth = r();
    const size = 3.4 + depth * 6.2;
    const amp = r() < 0.1 ? 0.1 + r() * 0.13 : 0.015 + r() * 0.07;
    const dropDelay = r() * 2.25;
    const fallDur = 2.9 + r() * 2.3;
    people[i] = {
      depth,
      size,
      sx: -0.02 + r() * 1.04,
      ground: 0.665 + r() * 0.255,
      dropDelay,
      fallDur,
      phase: r() * Math.PI * 2,
      runSpeed: 1.1 + r() * 1.5,
      amp,
      sway: 0.006 + r() * 0.02,
      hue: Math.floor(r() * 6),
      canopy: Math.floor(r() * 6),
      fleeDir: r() < 0.5 ? -1 : 1,
      fleeDelay: r() * 0.85,
      fleeAccel: 1.4 + r() * 1.3,
      landT: DROP_START + dropDelay + fallDur,
    };
  }

  // Person zero is the straggler: stays behind, then bolts.
  const p0 = people[0];
  p0.depth = 1;
  p0.size = 11;
  p0.sx = 0.5;
  p0.ground = 0.875;
  p0.amp = 0.02;
  p0.runSpeed = 0.6;
  p0.phase = 0.7;
  p0.fleeDir = 1;
  p0.fleeDelay = 0;
  p0.landT = DROP_START + 0.2 + 2.4;

  S = {
    p: people,
    px: new Float32Array(COUNT),
    py: new Float32Array(COUNT),
    ps: new Float32Array(COUNT),
    pl: new Float32Array(COUNT),
    st: new Uint8Array(COUNT),
    face: new Int8Array(COUNT),
    hue: new Uint8Array(COUNT),
    canopy: new Uint8Array(COUNT),
    sfx: new Set(),
    murmurK: -1,
    ended: false,
  };
}

function addBody(g, x, y, s, leg, state, f) {
  x = Math.round(x);
  y = Math.round(y);
  const hd = Math.max(1, Math.round(s * 0.42));
  const tw = Math.max(1, Math.round(s * 0.28));
  const lw = Math.max(1, Math.round(s * 0.13));
  const lh = Math.max(1, Math.round(s * 0.25));

  // head, nudged toward facing
  g.rect(Math.round(x - hd / 2 + f * hd * 0.12), Math.round(y - s), hd, hd);
  // torso
  g.rect(Math.round(x - tw / 2), Math.round(y - s * 0.62), tw, Math.round(s * 0.42));
  // legs, scissoring while running or fleeing
  const moving = state === 1 || state === 2;
  const swing = moving ? Math.sin(leg) * s * 0.26 : s * 0.04;
  g.rect(Math.round(x - tw / 2 - swing), Math.round(y - lh), lw, lh);
  g.rect(Math.round(x + tw / 2 - lw + swing), Math.round(y - lh), lw, lh);
}

function addCanopy(g, x, y, s) {
  const cw = Math.max(2, Math.round(s * 1.7));
  const ch = Math.max(1, Math.round(s * 0.4));
  const cy = Math.round(y - s * 2.15);
  g.rect(Math.round(x - cw / 2), cy, cw, ch);
  g.rect(Math.round(x), cy + ch, Math.max(1, Math.round(s * 0.09)), Math.round(s * 1.15));
}

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);

  const P = S.p;
  const px = S.px;
  const py = S.py;
  const ps = S.ps;
  const pl = S.pl;
  const st = S.st;
  const face = S.face;
  let landed = 0;

  for (let i = 0; i < COUNT; i++) {
    const p = P[i];
    let xN;
    let yN;
    let state;
    let f = 1;
    let leg = 0;

    if (t < p.landT) {
      const pr = clamp((t - DROP_START - p.dropDelay) / p.fallDur, 0, 1);
      xN = p.sx + p.sway * 6 * Math.sin(t * 1.7 + p.phase) * (1 - pr);
      yN = lerp(-0.12, p.ground, pr);
      state = 0;
      leg = 0.4;
    } else {
      landed++;
      if (i === 0) {
        if (t < STRAGGLE_AT) {
          xN = p.sx + Math.sin(t * 0.9) * 0.015;
          yN = p.ground - Math.abs(Math.sin(t * 2.2)) * 0.004;
          state = 1;
          f = Math.cos(t * 0.9) >= 0 ? 1 : -1;
          leg = t * 2.4;
        } else {
          const d = t - STRAGGLE_AT;
          xN = p.sx + 0.5 * 3.6 * d * d;
          yN = p.ground - Math.abs(Math.sin(d * 16)) * 0.012;
          state = 2;
          f = 1;
          leg = d * 20;
          if (xN > 1.2) state = 3;
        }
      } else if (t < RUN_END + p.fleeDelay) {
        const ang = p.runSpeed * (t - p.landT) + p.phase;
        xN = p.sx + p.amp * (Math.sin(ang) - Math.sin(p.phase));
        yN = p.ground - Math.abs(Math.sin(ang * 2)) * 0.006;
        state = 1;
        f = Math.cos(ang) >= 0 ? 1 : -1;
        leg = ang * 2;
      } else {
        const d = t - (RUN_END + p.fleeDelay);
        const xf = p.sx + p.amp * (Math.sin(p.runSpeed * (RUN_END - p.landT) + p.phase) - Math.sin(p.phase));
        xN = xf + p.fleeDir * 0.5 * p.fleeAccel * d * d;
        yN = p.ground - Math.abs(Math.sin(d * 14 + p.phase)) * 0.008;
        state = 2;
        f = p.fleeDir;
        leg = d * 18;
        if (xN < -0.18 || xN > 1.18) state = 3;
      }
    }

    px[i] = xN * W;
    py[i] = yN * H;
    ps[i] = p.size;
    pl[i] = leg;
    st[i] = state;
    face[i] = f;
    S.hue[i] = p.hue;
    S.canopy[i] = p.canopy;
  }

  // parachutes first, so the falling bodies sit on top of them
  for (let c = 0; c < 6; c++) {
    g.beginPath();
    let any = false;
    for (let i = 0; i < COUNT; i++) {
      if (st[i] !== 0 || S.canopy[i] !== c) continue;
      addCanopy(g, px[i], py[i], ps[i]);
      any = true;
    }
    if (!any) continue;
    g.fillStyle = CANOPY[c];
    g.fill();
  }

  // crowd, batched by colour so the fill count stays sane at two thousand
  for (let c = 0; c < 12; c++) {
    g.beginPath();
    let any = false;
    for (let i = 0; i < COUNT; i++) {
      if (st[i] === 3) continue;
      const far = ps[i] < 6.0;
      if (S.hue[i] + (far ? 6 : 0) !== c) continue;
      addBody(g, px[i], py[i], ps[i], pl[i], st[i], face[i]);
      any = true;
    }
    if (!any) continue;
    g.fillStyle = c < 6 ? PAL[c] : PAL_FAR[c - 6];
    g.fill();
  }

  drawHud(ctx, t, landed, W, H);
  drawCaption(ctx, t, W, H);
  cueSfx(ctx, t);

  if (t >= END_AT && !S.ended) {
    S.ended = true;
    ctx.done();
  }
}

function drawHud(ctx, t, landed, W, H) {
  if (t > 9 || landed >= COUNT) return;
  const a = clamp((t - 0.6) / 0.4, 0, 1) * clamp((8.6 - t) / 0.5, 0, 1);
  if (a <= 0.001) return;
  const g = ctx.canvas;
  const size = Math.max(14, Math.min(24, W * 0.014));
  g.save();
  g.globalAlpha = a;
  g.font = `700 ${size}px Consolas, "Courier New", monospace`;
  g.textAlign = 'left';
  g.textBaseline = 'top';
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(8,10,24,0.75)';
  g.strokeText(`PARATROOPERS DOWN ${landed} / 2000`, W * 0.035, H * 0.055);
  g.fillStyle = '#ffe9f3';
  g.fillText(`PARATROOPERS DOWN ${landed} / 2000`, W * 0.035, H * 0.055);
  g.restore();
}

function drawCaption(ctx, t, W, H) {
  const segs = [
    [0.0, 'TWO THOUSAND TINY PEOPLE', 'INCOMING. PLEASE HOLD.'],
    [4.9, 'THEY ARE JUST RUNNING NOW', 'NO PLAN. NO PURPOSE. TWENTY SECONDS.'],
    [24.6, 'AND NOW THEY LEAVE', 'SORRY ABOUT THE FEET, SAVORYSAILOR'],
    [26.5, 'EXCEPT ONE', 'HE FORGOT SOMETHING'],
    [27.95, 'NEVER MIND', 'SAVORYSAILOR SURVIVES'],
  ];
  let idx = 0;
  for (let i = 0; i < segs.length; i++) if (t >= segs[i][0]) idx = i;
  const a = clamp((t - segs[idx][0]) / 0.3, 0, 1) * clamp((END_AT - t) / 0.35, 0, 1);
  if (a <= 0.001) return;

  const g = ctx.canvas;
  const size = Math.min(H * 0.072, W * 0.043, 96);
  const ss = Math.max(14, size * 0.3);
  const cx = W * 0.5;
  const cy = H * 0.13 + (1 - a) * 22;
  const title = segs[idx][1];
  const sub = segs[idx][2];

  g.save();
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.lineJoin = 'round';

  g.font = `900 ${size}px "Arial Black", "Segoe UI Black", Impact, sans-serif`;
  g.globalAlpha = a * 0.55;
  g.fillStyle = ctx.accent;
  g.fillText(title, cx + 5, cy + 5);
  g.globalAlpha = a;
  g.lineWidth = Math.max(4, size * 0.16);
  g.strokeStyle = 'rgba(8,10,24,0.88)';
  g.strokeText(title, cx, cy);
  g.fillStyle = '#fff6e6';
  g.fillText(title, cx, cy);

  g.font = `700 ${ss}px "Segoe UI", system-ui, sans-serif`;
  g.lineWidth = Math.max(3, ss * 0.2);
  g.strokeStyle = 'rgba(8,10,24,0.8)';
  g.strokeText(sub, cx, cy + ss * 1.7);
  g.fillStyle = '#ffe9f3';
  g.fillText(sub, cx, cy + ss * 1.7);

  g.restore();
}

function cueSfx(ctx, t) {
  const once = (k) => {
    if (S.sfx.has(k)) return false;
    S.sfx.add(k);
    return true;
  };

  if (t >= 0.45 && once('drop')) ctx.sound.noise(220);

  const pat = [[3.9, 1500], [4.5, 1320], [5.2, 1150], [5.9, 1000], [6.7, 880], [7.5, 760]];
  for (let i = 0; i < pat.length; i++) {
    const tt = pat[i][0];
    if (t >= tt && once('p' + tt)) ctx.sound.beep(pat[i][1], 35);
  }

  if (t >= 7 && t < 24.6) {
    const k = Math.floor((t - 7) / 2.3);
    if (k !== S.murmurK) {
      S.murmurK = k;
      if (k < 8 && t - (7 + k * 2.3) < 0.2) ctx.sound.beep(820 + (k % 4) * 110, 45);
    }
  }

  if (t >= RUN_END + 0.05 && once('flee')) ctx.sound.noise(520);
  if (t >= STRAGGLE_AT + 0.04 && once('straggle')) ctx.sound.beep(420, 90);
  if (t >= 28.1 && once('bye')) ctx.sound.beep(300, 140);
  if (t >= 29.0 && once('end')) ctx.sound.beep(740, 120);
}

export function dispose(ctx) {
  S = null;
}
