export const meta = {
  title: 'Catfish Kitten Cycle',
  author: 'doctordiggitydank',
  prompt: 'a catfish, which is a cat front half with a fish tail, like a mermaid cat, swims around on the screen, pooping out kittens',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

let S = null;

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, u) => a + (b - a) * u;
const easeIn = (u) => u * u * u;
const easeOut = (u) => 1 - Math.pow(1 - u, 3);
const smooth = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const easeInOut = (u) => (u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2);

const KCOLORS = [
  { main: '#f0a75a', dark: '#c97a33' },
  { main: '#a9b2ba', dark: '#7d868e' },
  { main: '#f3ece0', dark: '#c9bda8' },
];

function samplePath(t) {
  const P = S.path;
  let dir = 1;
  if (t <= P[0].t) return { x: P[0].x, y: P[0].y, dir: 1 };
  for (let i = 0; i < P.length - 1; i++) {
    const a = P[i];
    const b = P[i + 1];
    const dx = b.x - a.x;
    if (Math.abs(dx) > 0.002) dir = dx > 0 ? 1 : -1;
    if (t <= b.t) {
      const span = Math.max(0.0001, b.t - a.t);
      const u = easeInOut(clamp((t - a.t) / span, 0, 1));
      return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u), dir };
    }
  }
  const l = P[P.length - 1];
  return { x: l.x, y: l.y, dir };
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  const rng = ctx.rand || Math.random;
  const st = ctx.streamer;

  const streamerX = clamp(st ? st.x + st.w * 0.5 : 0.5, 0.12, 0.88);
  const streamerY = clamp(st ? st.y + st.h * 0.1 : 0.3, 0.12, 0.6);

  const R = Math.min(W, H) * 0.065;
  const hoverX = clamp(streamerX + 0.02, 0.15, 0.85);
  const hoverY = clamp(streamerY - 0.27, 0.1, 0.42);

  const path = [
    { t: 0.0, x: -0.26, y: 0.3 },
    { t: 2.0, x: 0.32, y: 0.3 },
    { t: 3.2, x: 0.5, y: 0.36 },
    { t: 4.3, x: 0.36, y: 0.27 },
    { t: 5.4, x: 0.63, y: 0.35 },
    { t: 6.6, x: 0.47, y: 0.4 },
    { t: 7.6, x: 0.78, y: 0.31 },
    { t: 9.2, x: 0.62, y: 0.26 },
    { t: 10.6, x: 0.44, y: 0.34 },
    { t: 11.4, x: 0.5, y: 0.66 },
    { t: 12.5, x: 0.5, y: 0.55 },
    { t: 13.4, x: 0.63, y: 0.66 },
    { t: 14.5, x: 0.63, y: 0.55 },
    { t: 15.4, x: 0.78, y: 0.66 },
    { t: 16.6, x: 0.67, y: 0.5 },
    { t: 18.0, x: 0.62, y: 0.42 },
    { t: 19.6, x: 0.62, y: 0.38 },
    { t: 21.2, x: hoverX, y: hoverY },
    { t: 22.3, x: hoverX, y: hoverY },
    { t: 23.4, x: hoverX + 0.1, y: hoverY - 0.05 },
    { t: 26.6, x: 1.4, y: -0.3 },
  ];

  S = {
    W,
    H,
    rng,
    R,
    path,
    sfx: new Set(),
    pops: new Set(),
    parts: [],
    done: false,
    poopTimes: [3.2, 5.4, 7.6],
    eatTimes: [11.4, 13.4, 15.4],
    groundY: H * 0.72,
    kittenS: Math.min(W, H) * 0.05,
    kittenBigS: Math.min(W, H) * 0.062,
    turdR: Math.min(W, H) * 0.055,
    turd: { x: streamerX * W, y: streamerY * H },
    captions: [
      { a: 0.5, b: 2.8, text: 'a catfish. cat front, fish back. no notes.' },
      { a: 3.3, b: 5.2, text: 'it is producing kittens. do not ask how.' },
      { a: 5.7, b: 7.6, text: 'the kittens are exiting the fish end. science.' },
      { a: 8.4, b: 10.4, text: 'and now it is eating them. of course.' },
      { a: 16.6, b: 18.6, text: 'cleanup complete. nobody tell the kittens.' },
      { a: 19.6, b: 21.6, text: 'it is looking at SavorySailor. that is a warning.' },
      { a: 23.0, b: 24.6, text: 'sorry about your head, SavorySailor.' },
      { a: 25.5, b: 27.2, text: 'good news. the turd is a kitten now.' },
      { a: 27.6, b: 29.0, text: 'and it is leaving. bye.' },
    ],
  };

  S.kittens = S.poopTimes.map((pt, i) => {
    const p = samplePath(pt);
    return {
      born: pt,
      fromX: p.x * W,
      fromY: p.y * H + R * 0.9,
      x: p.x * W + (i - 1) * W * 0.004,
      y: S.groundY,
      eatAt: S.eatTimes[i],
      col: KCOLORS[i % KCOLORS.length],
      phase: i * 1.7,
    };
  });

  const hp = samplePath(22.2);
  S.dropFrom = { x: hp.x * W - hp.dir * R * 1.7, y: hp.y * H + R * 0.6 };
  S.runKittenCol = KCOLORS[0];
}

function emit(st, x, y, n, color, spread, speed, gravity, size) {
  for (let i = 0; i < n; i++) {
    const a = st.rng() * TAU;
    const sp = speed * (0.4 + st.rng() * 0.9);
    const life = 0.45 + st.rng() * 0.6;
    st.parts.push({
      x,
      y,
      vx: Math.cos(a) * spread * sp,
      vy: Math.sin(a) * spread * sp - spread * 0.5,
      g: gravity,
      life,
      max: life,
      size: size * (0.6 + st.rng() * 0.9),
      color,
    });
  }
}

function drawParticles(g, st) {
  for (const p of st.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    g.globalAlpha = a;
    g.fillStyle = p.color;
    g.beginPath();
    g.arc(p.x, p.y, p.size, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

function drawCatfish(g, x, y, dir, t, o) {
  const R = o.R;
  const strain = o.strain;
  const bulge = o.bulge;
  const wag = Math.sin(t * 12.5) * 0.4 + Math.sin(t * 6.1) * 0.15;

  g.save();
  g.translate(x + Math.sin(t * 70) * R * 0.05 * strain, y);
  g.scale(dir, 1);
  g.scale(1 + 0.1 * strain, 1 - 0.12 * strain);

  // tail fin
  g.save();
  g.translate(-2.0 * R, 0);
  g.rotate(wag * 0.35 + strain * 0.15);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(-R * 1.0, -R * 1.5, -R * 1.75, -R * 1.6);
  g.quadraticCurveTo(-R * 1.15, 0, -R * 1.75, R * 1.6);
  g.quadraticCurveTo(-R * 1.0, R * 1.5, 0, 0);
  g.closePath();
  g.fillStyle = 'rgba(58, 163, 155, 0.95)';
  g.fill();
  g.strokeStyle = 'rgba(15, 60, 66, 0.38)';
  g.lineWidth = Math.max(1, R * 0.06);
  g.stroke();
  g.restore();

  // dorsal fin
  g.beginPath();
  g.moveTo(-R * 1.7, -R * 0.5);
  g.quadraticCurveTo(-R * 1.35, -R * 1.35 - bulge * R * 0.4, -R * 0.45, -R * 1.0);
  g.quadraticCurveTo(-R * 1.15, -R * 0.6, -R * 1.7, -R * 0.5);
  g.fillStyle = 'rgba(58, 163, 155, 0.9)';
  g.fill();

  // body
  g.beginPath();
  g.ellipse(-R * 1.05, R * 0.02, R * 1.28, R * 0.74 * (1 + bulge * 0.4), 0, 0, TAU);
  const bg = g.createLinearGradient(-R * 2.2, 0, R * 0.3, 0);
  bg.addColorStop(0, '#2f9a92');
  bg.addColorStop(1, '#6fd8cb');
  g.fillStyle = bg;
  g.fill();

  // scales
  g.strokeStyle = 'rgba(255,255,255,0.25)';
  g.lineWidth = Math.max(1, R * 0.05);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 2; j++) {
      g.beginPath();
      g.arc(-R * 1.65 + i * R * 0.42, -R * 0.24 + j * R * 0.36, R * 0.2, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
    }
  }

  // pectoral fin
  g.save();
  g.translate(-R * 0.85, R * 0.5);
  g.rotate(0.45 + Math.sin(t * 9) * 0.28);
  g.beginPath();
  g.moveTo(0, 0);
  g.quadraticCurveTo(-R * 0.15, R * 0.7, -R * 0.62, R * 0.78);
  g.quadraticCurveTo(-R * 0.35, R * 0.25, 0, 0);
  g.fillStyle = 'rgba(47, 154, 146, 0.95)';
  g.fill();
  g.restore();

  // head
  const hx = R * 0.32;
  const hy = -R * 0.12;
  const fur = g.createLinearGradient(hx - R, hy - R, hx + R, hy + R);
  fur.addColorStop(0, '#f6c48c');
  fur.addColorStop(1, '#e2a057');

  g.fillStyle = '#eaa95f';
  g.beginPath();
  g.moveTo(hx - R * 0.78, hy - R * 0.45);
  g.lineTo(hx - R * 0.42, hy - R * 1.42);
  g.lineTo(hx - R * 0.02, hy - R * 0.85);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(hx + R * 0.72, hy - R * 0.45);
  g.lineTo(hx + R * 0.55, hy - R * 1.35);
  g.lineTo(hx + R * 0.05, hy - R * 0.85);
  g.closePath();
  g.fill();

  g.fillStyle = '#ef8aa0';
  g.beginPath();
  g.moveTo(hx - R * 0.6, hy - R * 0.58);
  g.lineTo(hx - R * 0.42, hy - R * 1.14);
  g.lineTo(hx - R * 0.16, hy - R * 0.78);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(hx + R * 0.58, hy - R * 0.58);
  g.lineTo(hx + R * 0.52, hy - R * 1.08);
  g.lineTo(hx + R * 0.19, hy - R * 0.78);
  g.closePath();
  g.fill();

  g.beginPath();
  g.ellipse(hx, hy, R * 0.98, R * 0.9, 0, 0, TAU);
  g.fillStyle = fur;
  g.fill();

  // eyes
  const eyeL = { x: hx - R * 0.33, y: hy - R * 0.02 };
  const eyeR = { x: hx + R * 0.36, y: hy - R * 0.02 };
  if (strain > 0.45) {
    g.strokeStyle = '#3a2317';
    g.lineWidth = R * 0.09;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(eyeL.x - R * 0.16, eyeL.y - R * 0.05);
    g.quadraticCurveTo(eyeL.x, eyeL.y + R * 0.12, eyeL.x + R * 0.16, eyeL.y - R * 0.05);
    g.stroke();
    g.beginPath();
    g.moveTo(eyeR.x - R * 0.16, eyeR.y - R * 0.05);
    g.quadraticCurveTo(eyeR.x, eyeR.y + R * 0.12, eyeR.x + R * 0.16, eyeR.y - R * 0.05);
    g.stroke();
  } else {
    for (const e of [eyeL, eyeR]) {
      g.beginPath();
      g.ellipse(e.x, e.y, R * 0.2, R * 0.21, 0, 0, TAU);
      g.fillStyle = '#fdfbf4';
      g.fill();
      g.beginPath();
      g.arc(e.x, e.y, R * 0.14, 0, TAU);
      g.fillStyle = '#4fa86b';
      g.fill();
      g.beginPath();
      g.ellipse(e.x, e.y, R * 0.055, R * 0.13, 0, 0, TAU);
      g.fillStyle = '#1d1712';
      g.fill();
      g.beginPath();
      g.arc(e.x - R * 0.06, e.y - R * 0.08, R * 0.04, 0, TAU);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.fill();
    }
  }

  // muzzle
  g.beginPath();
  g.ellipse(hx + R * 0.12, hy + R * 0.42, R * 0.52, R * 0.3, 0, 0, TAU);
  g.fillStyle = '#ffe8d2';
  g.fill();

  g.fillStyle = '#ef8aa0';
  g.beginPath();
  g.moveTo(hx - R * 0.02, hy + R * 0.2);
  g.lineTo(hx + R * 0.26, hy + R * 0.2);
  g.lineTo(hx + R * 0.12, hy + R * 0.31);
  g.closePath();
  g.fill();

  if (o.mouthOpen) {
    g.beginPath();
    g.ellipse(hx + R * 0.12, hy + R * 0.54, R * 0.26, R * 0.28, 0, 0, TAU);
    g.fillStyle = '#7c2d3a';
    g.fill();
    g.beginPath();
    g.ellipse(hx + R * 0.12, hy + R * 0.68, R * 0.16, R * 0.1, 0, 0, TAU);
    g.fillStyle = '#e8788c';
    g.fill();
  } else {
    g.strokeStyle = '#5c3a26';
    g.lineWidth = Math.max(1, R * 0.055);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(hx + R * 0.12, hy + R * 0.31);
    g.lineTo(hx + R * 0.12, hy + R * 0.42);
    g.moveTo(hx + R * 0.12, hy + R * 0.42);
    g.quadraticCurveTo(hx - R * 0.02, hy + R * 0.55, hx - R * 0.14, hy + R * 0.44);
    g.moveTo(hx + R * 0.12, hy + R * 0.42);
    g.quadraticCurveTo(hx + R * 0.26, hy + R * 0.55, hx + R * 0.38, hy + R * 0.44);
    g.stroke();
  }

  // whiskers
  g.strokeStyle = 'rgba(255,255,255,0.8)';
  g.lineWidth = Math.max(1, R * 0.035);
  g.beginPath();
  for (let i = 0; i < 3; i++) {
    g.moveTo(hx + R * 0.5, hy + R * 0.34 + i * R * 0.07);
    g.lineTo(hx + R * 1.42, hy + R * 0.05 + i * R * 0.24);
    g.moveTo(hx - R * 0.28, hy + R * 0.34 + i * R * 0.07);
    g.lineTo(hx - R * 1.12, hy + R * 0.05 + i * R * 0.24);
  }
  g.stroke();

  g.restore();
}

function drawKitten(g, x, y, s, dir, col, t, alpha, sy, pose) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.scale(dir * pose, sy);

  // tail
  g.strokeStyle = col.dark;
  g.lineWidth = s * 0.14;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-s * 0.55, -s * 0.42);
  g.quadraticCurveTo(-s * 1.15, -s * 1.05 + Math.sin(t * 5) * s * 0.18, -s * 0.78, -s * 0.15);
  g.stroke();

  // legs
  g.fillStyle = col.dark;
  g.beginPath();
  g.ellipse(-s * 0.42, -s * 0.12, s * 0.14, s * 0.19, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(s * 0.3, -s * 0.12, s * 0.14, s * 0.19, 0, 0, TAU);
  g.fill();

  // body
  g.beginPath();
  g.ellipse(-s * 0.1, -s * 0.44, s * 0.56, s * 0.42, 0, 0, TAU);
  g.fillStyle = col.main;
  g.fill();

  // head
  g.beginPath();
  g.arc(s * 0.46, -s * 0.78, s * 0.38, 0, TAU);
  g.fillStyle = col.main;
  g.fill();

  // ears
  g.beginPath();
  g.moveTo(s * 0.22, -s * 1.02);
  g.lineTo(s * 0.3, -s * 1.38);
  g.lineTo(s * 0.56, -s * 1.08);
  g.closePath();
  g.fill();
  g.beginPath();
  g.moveTo(s * 0.56, -s * 1.08);
  g.lineTo(s * 0.8, -s * 1.34);
  g.lineTo(s * 0.8, -s * 0.98);
  g.closePath();
  g.fill();

  // face
  const blink = Math.sin(t * 3 + x * 0.01) > 0.97;
  if (blink) {
    g.strokeStyle = '#241a18';
    g.lineWidth = s * 0.07;
    g.beginPath();
    g.arc(s * 0.34, -s * 0.82, s * 0.07, 0, Math.PI);
    g.stroke();
    g.beginPath();
    g.arc(s * 0.62, -s * 0.82, s * 0.07, 0, Math.PI);
    g.stroke();
  } else {
    g.fillStyle = '#241a18';
    g.beginPath();
    g.arc(s * 0.34, -s * 0.8, s * 0.075, 0, TAU);
    g.fill();
    g.beginPath();
    g.arc(s * 0.62, -s * 0.8, s * 0.075, 0, TAU);
    g.fill();
  }

  g.fillStyle = '#e7798f';
  g.beginPath();
  g.moveTo(s * 0.44, -s * 0.68);
  g.lineTo(s * 0.52, -s * 0.68);
  g.lineTo(s * 0.48, -s * 0.62);
  g.closePath();
  g.fill();

  g.strokeStyle = 'rgba(255,255,255,0.75)';
  g.lineWidth = s * 0.03;
  g.beginPath();
  g.moveTo(s * 0.55, -s * 0.66);
  g.lineTo(s * 0.9, -s * 0.72);
  g.moveTo(s * 0.55, -s * 0.63);
  g.lineTo(s * 0.92, -s * 0.6);
  g.stroke();

  g.restore();
}

function drawTurd(g, x, y, scale, alpha, rot, t, squash) {
  if (alpha <= 0.01 || scale <= 0.001) return;
  const R = S.turdR;
  g.save();
  g.globalAlpha = alpha;
  g.translate(x, y);
  g.rotate(rot);
  g.scale(scale * (1 + squash * 0.16), scale * (1 - squash * 0.26));

  const grd = g.createLinearGradient(-R, -R * 1.4, R, R * 0.4);
  grd.addColorStop(0, '#a4723c');
  grd.addColorStop(1, '#5b3315');
  g.fillStyle = grd;

  g.beginPath();
  g.ellipse(0, -R * 0.2, R * 1.0, R * 0.42, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(R * 0.06, -R * 0.62, R * 0.72, R * 0.34, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(-R * 0.06, -R * 0.95, R * 0.46, R * 0.26, 0, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(-R * 0.24, -R * 1.14, R * 0.17, R * 0.14, 0, 0, TAU);
  g.fill();

  g.strokeStyle = 'rgba(255,220,170,0.35)';
  g.lineWidth = R * 0.07;
  g.beginPath();
  g.arc(-R * 0.1, -R * 0.8, R * 0.5, -2.4, -1.2);
  g.stroke();

  g.restore();
}

function drawStink(g, x, topY, t, intensity) {
  const R = S.turdR;
  g.save();
  g.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = t * 1.7 + i * 1.9;
    const ox = (i - 1) * R * 0.55;
    g.beginPath();
    for (let k = 0; k <= 12; k++) {
      const u = k / 12;
      const yy = topY - u * R * 3.2;
      const xx = x + ox + Math.sin(u * 5 + ph) * R * 0.3 * (0.3 + u);
      if (k === 0) g.moveTo(xx, yy);
      else g.lineTo(xx, yy);
    }
    g.strokeStyle = 'rgba(160, 226, 96,' + 0.4 * intensity + ')';
    g.lineWidth = R * 0.11;
    g.stroke();
  }
  g.restore();
}

function drawFlies(g, x, y, t, intensity) {
  const R = S.turdR;
  g.save();
  g.globalAlpha = intensity;
  for (let i = 0; i < 2; i++) {
    const a = t * 2.6 + i * Math.PI;
    const fx = x + Math.cos(a) * R * 1.5;
    const fy = y - R * 1.1 + Math.sin(a * 1.7) * R * 0.6;
    g.fillStyle = '#1c1a18';
    g.beginPath();
    g.arc(fx, fy, R * 0.11, 0, TAU);
    g.fill();
    g.fillStyle = 'rgba(230,240,250,0.6)';
    g.beginPath();
    g.ellipse(fx - R * 0.1, fy - R * 0.1, R * 0.12, R * 0.06, Math.sin(a * 6), 0, TAU);
    g.fill();
    g.beginPath();
    g.ellipse(fx + R * 0.1, fy - R * 0.1, R * 0.12, R * 0.06, -Math.sin(a * 6), 0, TAU);
    g.fill();
  }
  g.restore();
}

function drawCaptions(g) {
  const fs = clamp(S.H * 0.042, 14, 40);
  g.save();
  g.font = '800 ' + fs + 'px system-ui, -apple-system, "Segoe UI", sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  const y = S.H * 0.935;
  for (const c of S.captions) {
    if (S.t < c.a || S.t > c.b) continue;
    const a = Math.min(smooth((S.t - c.a) / 0.3), smooth((c.b - S.t) / 0.3));
    g.globalAlpha = a;
    g.lineWidth = Math.max(3, fs * 0.16);
    g.strokeStyle = 'rgba(8,10,28,0.8)';
    g.strokeText(c.text, S.W / 2, y, S.W * 0.92);
    g.fillStyle = '#fff4f8';
    g.fillText(c.text, S.W / 2, y, S.W * 0.92);
  }
  g.restore();
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);
  if (!S) return;
  S.W = W;
  S.H = H;
  S.t = t;

  const st = S;
  const sfx = (key, fn) => {
    if (st.sfx.has(key)) return;
    st.sfx.add(key);
    try { fn(); } catch (e) {}
  };
  const pop = (key, fn) => {
    if (st.pops.has(key)) return;
    st.pops.add(key);
    fn();
  };

  // particles
  for (let i = st.parts.length - 1; i >= 0; i--) {
    const p = st.parts[i];
    p.life -= dt;
    if (p.life <= 0) {
      st.parts.splice(i, 1);
      continue;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += p.g * dt;
    p.vx *= 0.985;
  }

  // sound cues
  if (t > 0.12) {
    sfx('enter', () => {
      ctx.sound.beep(620, 110);
      ctx.sound.beep(930, 140);
    });
  }
  st.poopTimes.forEach((pt, i) => {
    if (t >= pt) {
      sfx('poop' + i, () => {
        ctx.sound.noise(140);
        ctx.sound.beep(170, 90);
      });
      pop('popP' + i, () => {
        const c = samplePath(t);
        emit(st, c.x * W - c.dir * st.R * 1.7, c.y * H + st.R * 0.5, 7, '#6b4423', 1, 150, 520, st.R * 0.12);
      });
    }
    if (t >= pt + 0.5) {
      sfx('land' + i, () => ctx.sound.beep(1250 + i * 130, 60));
    }
  });
  st.eatTimes.forEach((et, i) => {
    if (t >= et) {
      sfx('chomp' + i, () => {
        ctx.sound.noise(90);
        ctx.sound.beep(160, 80);
      });
      pop('puffE' + i, () => {
        const k = st.kittens[i];
        emit(st, k.x, k.y - st.kittenS * 0.5, 9, '#ffd9a8', 1, 130, 300, st.kittenS * 0.13);
      });
    }
  });
  if (t >= 21.6) {
    sfx('rumble', () => {
      ctx.sound.beep(95, 260);
    });
  }
  if (t >= 22.2) {
    sfx('dropwhoosh', () => ctx.sound.noise(220));
    pop('dropP', () => {
      emit(st, st.dropFrom.x, st.dropFrom.y, 8, '#7a4a22', 1, 120, 420, st.turdR * 0.12);
    });
  }
  if (t >= 22.95) {
    sfx('plop', () => {
      ctx.sound.noise(290);
      ctx.sound.beep(90, 230);
    });
    pop('landP', () => {
      emit(st, st.turd.x, st.turd.y, 12, '#c9a97c', 1, 220, 260, st.turdR * 0.15);
    });
  }
  if (t >= 24.3) {
    sfx('morph', () => {
      ctx.sound.beep(880, 120);
      ctx.sound.beep(1180, 170);
    });
    pop('morphP', () => {
      emit(st, st.turd.x, st.turd.y - st.turdR, 18, '#ffd6ee', 1, 240, -40, st.turdR * 0.12);
      emit(st, st.turd.x, st.turd.y - st.turdR, 12, '#fff3b0', 1, 200, -40, st.turdR * 0.1);
    });
  }
  if (t >= 25.3) {
    sfx('popk', () => {
      ctx.sound.beep(1400, 70);
      ctx.sound.beep(1780, 90);
    });
  }
  if (t >= 26.9) sfx('run1', () => ctx.sound.beep(1150, 50));
  if (t >= 27.3) sfx('run2', () => ctx.sound.beep(1300, 50));
  if (t >= 27.7) sfx('run3', () => ctx.sound.beep(1500, 50));

  // strain + mouth
  let strain = 0;
  for (const pt of st.poopTimes) {
    const u = (t - (pt - 0.85)) / 0.85;
    if (u > 0 && u < 1) strain = Math.max(strain, Math.sin(u * Math.PI));
  }
  const bigU = (t - 21.1) / 1.2;
  if (bigU > 0 && bigU < 1) strain = Math.max(strain, Math.sin(bigU * Math.PI) * 0.9);

  let mouthOpen = false;
  for (const et of st.eatTimes) if (Math.abs(t - et) < 0.3) mouthOpen = true;

  const eatenCount = st.eatTimes.filter((e) => t > e + 0.1).length;
  const bulge = smooth((eatenCount - 0.4) / 1.4) * 0.9;

  // kittens (behind the catfish)
  for (const k of st.kittens) {
    const dropU = (t - k.born) / 0.55;
    if (dropU < 0) continue;
    const eatenU = (t - k.eatAt) / 0.18;
    if (eatenU > 1) continue;
    let alpha = 1;
    let sy = 1;
    let pose = 1;
    let y = k.y;
    if (dropU < 1) {
      const u = clamp(dropU, 0, 1);
      y = lerp(k.fromY, k.y, easeIn(u));
      sy = 1 + 0.25 * (1 - u);
      pose = 0.9;
    }
    if (eatenU > 0) {
      alpha = 1 - eatenU;
      pose = 1 - eatenU * 0.6;
    }
    const wob = Math.sin(t * 3.1 + k.phase) * 2;
    drawKitten(g, k.x + wob, y, st.kittenS, 1, k.col, t, alpha, sy, pose);
  }

  // catfish
  const c = samplePath(t);
  const px = c.x * W;
  const py = c.y * H + Math.sin(t * 2.2) * H * 0.006;
  drawCatfish(g, px, py, c.dir, t, { R: st.R, strain, bulge, mouthOpen });

  // big turd
  if (t > 22.2) {
    const fallU = clamp((t - 22.2) / 0.75, 0, 1);
    let tx = st.turd.x;
    let ty = st.turd.y;
    let trot = 0;
    let squash = 0;
    if (fallU < 1) {
      tx = lerp(st.dropFrom.x, st.turd.x, fallU);
      ty = lerp(st.dropFrom.y, st.turd.y, easeIn(fallU));
      trot = Math.sin(fallU * 7) * 0.14;
    } else {
      const landU = (t - 22.95) / 0.45;
      if (landU >= 0 && landU < 1) squash = Math.sin(clamp(landU, 0, 1) * Math.PI);
    }
    const morphU = clamp((t - 24.3) / 1.05, 0, 1);
    let scale = 1;
    let alpha = 1;
    if (morphU > 0) {
      scale = 1 - easeIn(morphU) * 0.92;
      alpha = 1 - smooth((morphU - 0.5) / 0.5);
    }
    drawTurd(g, tx, ty, scale, alpha, trot, t, squash);
    if (t > 23.0 && t < 25.4) {
      const intensity = smooth((t - 23.0) / 0.5) * (1 - smooth((t - 24.9) / 0.5));
      drawStink(g, tx, ty - st.turdR * 1.3 * scale, t, intensity);
      drawFlies(g, tx, ty, t, intensity * 0.9);
    }
  }

  // the final kitten
  if (t > 24.95) {
    const popU = clamp((t - 25.0) / 0.45, 0, 1);
    let kx = st.turd.x;
    let ky = st.turd.y;
    let sy = 1;
    let pose = 1;
    const s = st.kittenBigS * (0.25 + easeOut(popU) * 0.85);
    const runU = clamp((t - 26.35) / 2.15, 0, 1);
    if (runU > 0) {
      kx = st.turd.x + runU * runU * W * 1.6;
      ky = st.turd.y - Math.abs(Math.sin(runU * Math.PI * 5)) * H * 0.035;
      pose = 0.94;
      sy = 0.96 + Math.abs(Math.sin(t * 16)) * 0.12;
    }
    drawKitten(g, kx, ky, s, 1, st.runKittenCol, t, 1, sy, pose);
  }

  drawParticles(g, st);
  drawCaptions(g);

  if (t >= 29.0 && !st.done) {
    st.done = true;
    try { ctx.done(); } catch (e) {}
  }
}

export function dispose(ctx) {
  S = null;
}
