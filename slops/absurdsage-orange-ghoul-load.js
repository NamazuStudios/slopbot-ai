// Orange Ghoul Load — a smug orange ghoul in a diaper does laps around the stream.

export const meta = {
  title: 'Orange Ghoul Load',
  author: 'absurdsage',
  prompt: 'the orange face of a balding yellow haired ghoul with a smug expression on the body of a baby crawling left and right, and top to bottom',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

const DURATION = 26;
let S = null;

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w * 0.5, h * 0.5);
  g.beginPath();
  g.moveTo(x + rr, y);
  g.lineTo(x + w - rr, y);
  g.quadraticCurveTo(x + w, y, x + w, y + rr);
  g.lineTo(x + w, y + h - rr);
  g.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  g.lineTo(x + rr, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - rr);
  g.lineTo(x, y + rr);
  g.quadraticCurveTo(x, y, x + rr, y);
  g.closePath();
}

/* a smooth closed loop around the edges of the frame (4 corner control points) */
function buildLoop(W, H) {
  const corners = [
    [0.14 * W, 0.84 * H],
    [0.86 * W, 0.84 * H],
    [0.90 * W, 0.20 * H],
    [0.10 * W, 0.20 * H],
  ];
  const n = corners.length;
  const pts = [];
  const cr = (p0, p1, p2, p3, u) => {
    const u2 = u * u;
    const u3 = u2 * u;
    return [
      0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
      0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3),
    ];
  };
  for (let i = 0; i < n; i++) {
    const p0 = corners[(i - 1 + n) % n];
    const p1 = corners[i];
    const p2 = corners[(i + 1) % n];
    const p3 = corners[(i + 2) % n];
    for (let k = 0; k < 26; k++) pts.push(cr(p0, p1, p2, p3, k / 26));
  }
  pts.push(pts[0].slice());

  const cum = [0];
  for (let i = 1; i < pts.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  return { pts, cum, total: cum[cum.length - 1] };
}

function sampleLoop(loop, u) {
  const { pts, cum, total } = loop;
  let s = u * total;
  s = ((s % total) + total) % total;
  let lo = 0;
  let hi = cum.length - 1;
  while (lo < hi - 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= s) lo = mid; else hi = mid;
  }
  const seg = cum[hi] - cum[lo] || 1;
  const f = (s - cum[lo]) / seg;
  const a = pts[lo];
  const b = pts[hi];
  return {
    x: a[0] + (b[0] - a[0]) * f,
    y: a[1] + (b[1] - a[1]) * f,
    dx: b[0] - a[0],
    dy: b[1] - a[1],
    u,
  };
}

/* ------------------------------------------------------------------ */
/* lifecycle                                                           */
/* ------------------------------------------------------------------ */

export function init(ctx) {
  S = {
    trail: [],
    cries: [],
    notes: [],
    sub: null,
    lastDrop: -1,
    nextCry: 0.55,
    nextVoice: 3.4,
    burst: false,
    ended: false,
    loop: null,
    loopKey: '',
  };
}

export function dispose() {
  S = null;
}

/* ------------------------------------------------------------------ */
/* frame                                                               */
/* ------------------------------------------------------------------ */

export function frame(ctx, t, dt) {
  if (!S) init(ctx);
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;

  g.clearRect(0, 0, W, H);

  if (t >= DURATION) {
    if (!S.ended) {
      S.ended = true;
      ctx.done();
    }
    return;
  }

  const key = W + 'x' + H;
  if (S.loopKey !== key) {
    S.loop = buildLoop(W, H);
    S.loopKey = key;
  }
  const loop = S.loop;

  const r = Math.min(W, H) * 0.072;
  const full = clamp((t - 1) / 21, 0, 1);
  const lap = 8.8;
  const u = (t / lap) % 1;
  const p = sampleLoop(loop, u);
  const dir = p.dx >= 0 ? 1 : -1;

  const wob = Math.sin(t * 5.2);
  const x = p.x - p.dy * 0.0 + (p.dy / (Math.hypot(p.dx, p.dy) || 1)) * wob * 0.014 * H;
  const y = p.y - (p.dx / (Math.hypot(p.dx, p.dy) || 1)) * wob * 0.014 * H;

  /* ---- trail drops ---- */
  if (t > 0.55 && t - S.lastDrop >= 0.1) {
    S.lastDrop = t;
    const back = sampleLoop(loop, u - 0.045);
    const jx = (Math.sin(t * 37.1) + Math.sin(t * 13.3)) * 0.35 * r * 0.35;
    const jy = (Math.cos(t * 29.7) + Math.cos(t * 17.9)) * 0.35 * r * 0.35;
    S.trail.push({
      x: back.x + jx,
      y: back.y + jy,
      r: r * (0.16 + 0.28 * full),
      born: t,
    });
    if (S.trail.length > 260) S.trail.shift();
  }

  /* ---- punchline burst ---- */
  if (!S.burst && t >= 22.4) {
    S.burst = true;
    ctx.sound.noise(280);
    ctx.sound.beep(96, 260);
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI * 2 + 0.4;
      S.trail.push({
        x: x + Math.cos(a) * r * 1.5,
        y: y + Math.sin(a) * r * 0.9 + r * 1.9,
        r: r * (0.18 + 0.10 * Math.sin(i * 2.3)),
        born: t,
      });
    }
    if (S.trail.length > 300) S.trail.splice(0, S.trail.length - 300);
  }

  /* ---- cries ---- */
  if (t >= S.nextCry) {
    S.cries.push({ born: t, big: t > 18.5, side: S.cries.length % 2 === 0 ? 1 : -1 });
    ctx.sound.beep(500 + (S.cries.length % 3) * 70, 80);
    S.nextCry = t + 1.85;
  }

  /* ---- periodic voice line ---- */
  if (t >= S.nextVoice && t < DURATION - 1.4) {
    S.sub = { born: t };
    const seq = [[0, 168, 105], [0.15, 205, 105], [0.29, 176, 90], [0.43, 232, 140], [0.62, 300, 190]];
    for (const n of seq) S.notes.push({ at: t + n[0], f: n[1], ms: n[2], played: false });
    S.nextVoice = t + 5;
  }

  for (const n of S.notes) {
    if (!n.played && t >= n.at) {
      n.played = true;
      ctx.sound.beep(n.f, n.ms);
    }
  }
  S.notes = S.notes.filter((n) => !n.played || t < n.at + 1.5);

  /* ---- draw ---- */
  drawTrail(g, r, t);
  drawGhoul(g, x, y, r, t, full, dir, W, H);
  drawBubbles(g, x, y, r, t, full, dir, W, H);
  drawCaption(g, W, H, t);
}

/* ------------------------------------------------------------------ */
/* drawing: trail                                                      */
/* ------------------------------------------------------------------ */

function drawTrail(g, r, t) {
  const tr = S.trail;
  if (!tr.length) return;

  g.save();
  g.lineCap = 'round';
  g.lineJoin = 'round';
  g.strokeStyle = 'rgba(112, 84, 38, 0.26)';
  g.lineWidth = Math.max(6, r * 0.52);
  g.beginPath();
  g.moveTo(tr[0].x, tr[0].y);
  for (let i = 1; i < tr.length; i++) g.lineTo(tr[i].x, tr[i].y);
  g.stroke();

  for (const b of tr) {
    const age = t - b.born;
    const rad = b.r * (1 + Math.min(0.45, age * 0.035));
    g.globalAlpha = 0.5;
    g.fillStyle = '#7a5c26';
    g.beginPath();
    g.ellipse(b.x, b.y + rad * 0.32, rad, rad * 0.68, 0, 0, Math.PI * 2);
    g.fill();

    g.globalAlpha = 0.32;
    g.fillStyle = '#46310f';
    g.beginPath();
    g.ellipse(b.x, b.y + rad * 0.5, rad * 0.62, rad * 0.42, 0, 0, Math.PI * 2);
    g.fill();

    g.globalAlpha = 0.35;
    g.fillStyle = '#b0903e';
    g.beginPath();
    g.ellipse(b.x - rad * 0.18, b.y - rad * 0.1, rad * 0.26, rad * 0.16, -0.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.globalAlpha = 1;
}

/* ------------------------------------------------------------------ */
/* drawing: the ghoul                                                  */
/* ------------------------------------------------------------------ */

function drawGhoul(g, x, y, r, t, full, dir, W, H) {
  const bob = Math.abs(Math.sin(t * 7.5)) * 0.1 * r;

  g.save();
  g.translate(x, y - r * 1.02 + bob);
  g.rotate(Math.sin(t * 3.4) * 0.05 + dir * 0.02);

  /* ground shadow */
  g.save();
  g.globalAlpha = 0.15;
  g.fillStyle = '#070a18';
  g.beginPath();
  g.ellipse(0, 2.95 * r, 1.45 * r, 0.3 * r, 0, 0, Math.PI * 2);
  g.fill();
  g.restore();

  drawLeg(g, r, -1, t);
  drawLeg(g, r, 1, t);
  drawDiaper(g, r, full, t, dir);
  drawTorso(g, r, t);
  drawArm(g, r, -1, t);
  drawArm(g, r, 1, t);
  drawHead(g, r, t, full);

  g.restore();
}

function drawLeg(g, r, side, t) {
  const ph = Math.sin(t * 7.5 + (side > 0 ? 0 : Math.PI));
  const cx = side * 0.62 * r;
  const cy = 2.42 * r + ph * 0.05 * r;
  g.save();
  g.translate(cx, cy);
  g.rotate(side * 0.55 + ph * 0.12);
  g.fillStyle = '#e9e2cf';
  g.strokeStyle = '#8d7f63';
  g.lineWidth = Math.max(2, 0.035 * r);
  g.beginPath();
  g.ellipse(0, 0, 0.3 * r, 0.19 * r, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#f0a24a';
  g.beginPath();
  g.arc(0.28 * r, 0.02 * r, 0.13 * r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#8a3c06';
  g.lineWidth = Math.max(1.5, 0.026 * r);
  g.stroke();
  g.restore();
}

function drawDiaper(g, r, full, t, dir) {
  const sag = full * 0.4 * r;
  const cx = -dir * 0.28 * r;
  const cy = 2.34 * r + sag;
  const rx = (1.1 + full * 0.42) * r;
  const ry = (0.82 + full * 0.28) * r;

  g.save();
  g.translate(cx, cy);
  g.rotate(-dir * 0.05 + Math.sin(t * 5) * 0.018);

  g.beginPath();
  g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = '#fbf7ea';
  g.fill();
  g.lineWidth = Math.max(2, 0.045 * r);
  g.strokeStyle = '#8d7f63';
  g.stroke();

  if (full > 0.02) {
    const grd = g.createLinearGradient(0, -ry, 0, ry);
    grd.addColorStop(0, 'rgba(150, 112, 52, 0)');
    grd.addColorStop(0.55, 'rgba(132, 94, 34, ' + (0.45 * full).toFixed(3) + ')');
    grd.addColorStop(1, 'rgba(94, 64, 20, ' + (0.82 * full).toFixed(3) + ')');
    g.fillStyle = grd;
    g.beginPath();
    g.ellipse(0, ry * 0.15, rx * 0.94, ry * 0.9, 0, 0, Math.PI * 2);
    g.fill();
  }

  g.strokeStyle = 'rgba(196, 182, 146, 0.9)';
  g.lineWidth = Math.max(1.5, 0.055 * r);
  g.beginPath();
  g.ellipse(0, -ry * 0.7, rx * 0.9, ry * 0.32, 0, 0, Math.PI * 2);
  g.stroke();

  g.fillStyle = '#f2a7c0';
  g.strokeStyle = '#8d7f63';
  g.lineWidth = Math.max(1.5, 0.03 * r);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * rx * 0.82, -ry * 0.18, 0.2 * r, 0.12 * r, s * 0.4, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  g.restore();

  if (full > 0.38) {
    const pulse = 0.35 + 0.2 * Math.sin(t * 4);
    g.save();
    g.strokeStyle = 'rgba(150, 155, 70, ' + pulse.toFixed(3) + ')';
    g.lineWidth = Math.max(2, 0.045 * r);
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const bx = cx + (i - 1) * rx * 0.55 + Math.sin(t * 3 + i) * 0.1 * r;
      const by = cy - ry * 1.05 - i * 0.12 * r;
      g.beginPath();
      g.moveTo(bx, by);
      g.bezierCurveTo(bx - 0.18 * r, by - 0.5 * r, bx + 0.2 * r, by - 0.9 * r, bx - 0.1 * r, by - 1.35 * r);
      g.stroke();
    }
    g.restore();
  }
}

function drawTorso(g, r, t) {
  g.beginPath();
  g.ellipse(0, 1.52 * r, 0.64 * r, 0.62 * r, 0, 0, Math.PI * 2);
  g.fillStyle = '#f7f2e4';
  g.fill();
  g.strokeStyle = '#8d7f63';
  g.lineWidth = Math.max(2, 0.04 * r);
  g.stroke();

  g.strokeStyle = '#f2a7c0';
  g.lineWidth = Math.max(2, 0.055 * r);
  g.beginPath();
  g.arc(0, 1.08 * r, 0.38 * r, 0.25, Math.PI - 0.25);
  g.stroke();

  g.strokeStyle = 'rgba(141, 127, 99, 0.55)';
  g.lineWidth = Math.max(1, 0.025 * r);
  g.beginPath();
  g.moveTo(-0.18 * r, 1.5 * r);
  g.quadraticCurveTo(0, 1.62 * r, 0.18 * r, 1.5 * r);
  g.stroke();
}

function drawArm(g, r, side, t) {
  const ph = Math.sin(t * 7.5 + (side > 0 ? 0 : Math.PI));
  const sx = side * 0.5 * r;
  const sy = 1.3 * r;
  const hx = side * 0.95 * r;
  const hy = 2.0 * r + ph * 0.12 * r;

  g.lineCap = 'round';
  g.strokeStyle = '#8d7f63';
  g.lineWidth = 0.34 * r;
  g.beginPath();
  g.moveTo(sx, sy);
  g.quadraticCurveTo(side * 0.98 * r, 1.6 * r, hx, hy);
  g.stroke();

  g.strokeStyle = '#f7f2e4';
  g.lineWidth = 0.27 * r;
  g.beginPath();
  g.moveTo(sx, sy);
  g.quadraticCurveTo(side * 0.98 * r, 1.6 * r, hx, hy);
  g.stroke();

  g.fillStyle = '#f0a24a';
  g.strokeStyle = '#8a3c06';
  g.lineWidth = Math.max(1.5, 0.03 * r);
  g.beginPath();
  g.arc(hx, hy, 0.155 * r, 0, Math.PI * 2);
  g.fill();
  g.stroke();
}

function drawHead(g, r, t, full) {
  /* ears */
  g.fillStyle = '#e8871f';
  g.strokeStyle = '#8a3c06';
  g.lineWidth = Math.max(2, 0.04 * r);
  for (const s of [-1, 1]) {
    g.beginPath();
    g.ellipse(s * 1.0 * r, -0.14 * r, 0.17 * r, 0.26 * r, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  /* head */
  const grd = g.createRadialGradient(-0.35 * r, -0.5 * r, 0.1 * r, 0, 0, 1.25 * r);
  grd.addColorStop(0, '#ffb75e');
  grd.addColorStop(0.55, '#f18a24');
  grd.addColorStop(1, '#bd5308');
  g.fillStyle = grd;
  g.beginPath();
  g.ellipse(0, -0.1 * r, 1.02 * r, 1.1 * r, 0, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = '#8a3c06';
  g.lineWidth = Math.max(2.5, 0.045 * r);
  g.stroke();

  /* bald scalp shine */
  g.save();
  g.globalAlpha = 0.22;
  g.fillStyle = '#ffdca6';
  g.beginPath();
  g.ellipse(-0.34 * r, -0.62 * r, 0.42 * r, 0.24 * r, -0.4, 0, Math.PI * 2);
  g.fill();
  g.restore();

  /* comb-over */
  const strands = 5;
  for (let i = 0; i < strands; i++) {
    const dy = i * 0.085 * r;
    const lift = Math.sin(t * 2 + i * 0.7) * 0.02 * r;
    const path = () => {
      g.beginPath();
      g.moveTo(-0.95 * r, -0.48 * r + dy);
      g.bezierCurveTo(-0.5 * r, -1.06 * r + dy * 0.7, 0.3 * r, -1.14 * r + dy + lift, 0.9 * r, -0.6 * r + dy * 0.55);
    };
    g.strokeStyle = '#c99a0a';
    g.lineWidth = Math.max(3, 0.13 * r);
    g.lineCap = 'round';
    path();
    g.stroke();
    g.strokeStyle = '#ffd93b';
    g.lineWidth = Math.max(1.5, 0.085 * r);
    path();
    g.stroke();
  }

  /* brows */
  g.strokeStyle = '#b56412';
  g.lineWidth = Math.max(2.5, 0.075 * r);
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-0.62 * r, -0.42 * r);
  g.quadraticCurveTo(-0.4 * r, -0.55 * r, -0.18 * r, -0.44 * r);
  g.stroke();
  g.beginPath();
  g.moveTo(0.18 * r, -0.34 * r);
  g.quadraticCurveTo(0.4 * r, -0.44 * r, 0.62 * r, -0.37 * r);
  g.stroke();

  /* eyes: half-lidded, smug */
  for (const s of [-1, 1]) {
    const ex = s * 0.4 * r;
    const ey = -0.12 * r;
    const erx = 0.235 * r;
    const ery = 0.175 * r;

    g.fillStyle = '#fff8ec';
    g.strokeStyle = '#8a3c06';
    g.lineWidth = Math.max(1.5, 0.03 * r);
    g.beginPath();
    g.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();

    g.save();
    g.beginPath();
    g.ellipse(ex, ey, erx, ery, 0, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = '#e8871f';
    g.fillRect(ex - erx - 1, ey - ery - 1, erx * 2 + 2, ery * 1.18);
    g.restore();

    g.fillStyle = '#3a2008';
    g.beginPath();
    g.arc(ex + s * 0.045 * r, ey + 0.045 * r, 0.075 * r, 0, Math.PI * 2);
    g.fill();

    g.strokeStyle = '#8a3c06';
    g.lineWidth = Math.max(1.5, 0.028 * r);
    g.beginPath();
    g.moveTo(ex - erx, ey);
    g.lineTo(ex + erx, ey);
    g.stroke();
  }

  /* nose */
  g.fillStyle = '#d9741a';
  g.strokeStyle = '#8a3c06';
  g.lineWidth = Math.max(1.5, 0.028 * r);
  g.beginPath();
  g.ellipse(0, 0.28 * r, 0.15 * r, 0.12 * r, 0, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  g.fillStyle = '#8a3c06';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(s * 0.06 * r, 0.33 * r, 0.026 * r, 0, Math.PI * 2);
    g.fill();
  }

  /* jowls */
  g.strokeStyle = 'rgba(138, 60, 6, 0.55)';
  g.lineWidth = Math.max(1.5, 0.026 * r);
  g.beginPath();
  g.arc(-0.34 * r, 0.5 * r, 0.32 * r, 0.15, 1.15);
  g.stroke();
  g.beginPath();
  g.arc(0.34 * r, 0.5 * r, 0.32 * r, Math.PI - 1.15, Math.PI - 0.15);
  g.stroke();

  /* mouth: wrung-out smug smirk, with an occasional wail */
  const crying = Math.sin(t * 6.2) > 0.15;
  if (crying) {
    const open = 0.16 + 0.1 * Math.abs(Math.sin(t * 6.2));
    g.fillStyle = '#581a05';
    g.strokeStyle = '#8a3c06';
    g.lineWidth = Math.max(1.5, 0.03 * r);
    g.beginPath();
    g.ellipse(0, 0.7 * r, 0.25 * r, open * r, 0, 0, Math.PI * 2);
    g.fill();
    g.stroke();
    g.fillStyle = '#d96b6b';
    g.beginPath();
    g.ellipse(0, 0.77 * r, 0.13 * r, open * 0.55 * r, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fffdf5';
    for (const s of [-1, 1]) {
      g.beginPath();
      g.moveTo(s * 0.2 * r, 0.58 * r);
      g.lineTo(s * 0.145 * r, 0.66 * r);
      g.lineTo(s * 0.09 * r, 0.58 * r);
      g.closePath();
      g.fill();
    }
    /* tears */
    for (const s of [-1, 1]) {
      const tp = (t * 1.7 + (s > 0 ? 0.5 : 0)) % 1;
      g.globalAlpha = 0.85 * (1 - tp * 0.4);
      g.fillStyle = '#7fd4ff';
      g.beginPath();
      g.ellipse(s * 0.46 * r, 0.05 * r + tp * 0.45 * r, 0.05 * r, 0.09 * r, 0, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
    }
  } else {
    g.strokeStyle = '#7c3204';
    g.lineWidth = Math.max(2, 0.07 * r);
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(-0.42 * r, 0.6 * r);
    g.quadraticCurveTo(0.02 * r, 0.84 * r, 0.44 * r, 0.55 * r);
    g.stroke();
    g.fillStyle = '#fffdf5';
    g.beginPath();
    g.moveTo(0.3 * r, 0.6 * r);
    g.lineTo(0.34 * r, 0.7 * r);
    g.lineTo(0.38 * r, 0.58 * r);
    g.closePath();
    g.fill();
  }

  /* chin */
  g.strokeStyle = 'rgba(138, 60, 6, 0.4)';
  g.lineWidth = Math.max(1.5, 0.025 * r);
  g.beginPath();
  g.arc(0, 0.92 * r, 0.22 * r, 0.35, Math.PI - 0.35);
  g.stroke();
}

/* ------------------------------------------------------------------ */
/* drawing: bubbles + captions                                         */
/* ------------------------------------------------------------------ */

function drawBubbles(g, x, y, r, t, full, dir, W, H) {
  const headX = x;
  const headY = y - r * 1.5;

  /* cry bubbles */
  for (const c of S.cries) {
    const age = t - c.born;
    if (age > 1.35) continue;
    const rise = Math.min(1, age / 1.35);
    const alpha = 1 - Math.max(0, (age - 0.9) / 0.45);
    const bx = clamp(headX + c.side * (1.7 + rise * 0.5) * r, 3 * r, W - 3 * r);
    const by = clamp(headY - (1.1 + rise * 1.1) * r, 1.4 * r, H - 1.4 * r);
    const text = c.big ? 'ME!' : 'me';
    speechBubble(g, bx, by, text, 0.62 * r, alpha, c.side);
  }

  /* voice subtitle */
  if (S.sub) {
    const age = t - S.sub.born;
    if (age < 1.6) {
      const alpha = age < 0.2 ? age / 0.2 : age > 1.25 ? Math.max(0, 1 - (age - 1.25) / 0.35) : 1;
      const bx = clamp(headX - dir * 2.1 * r, 3.1 * r, W - 3.1 * r);
      const by = clamp(headY - 0.5 * r, 1.5 * r, H - 1.5 * r);
      speechBubble(g, bx, by, "I'M GONNA COME!!", 0.36 * r, alpha, -dir);
    }
  }
}

function speechBubble(g, cx, cy, text, size, alpha, side) {
  if (alpha <= 0.01) return;
  g.save();
  g.globalAlpha = clamp(alpha, 0, 1);
  g.font = '800 ' + size.toFixed(0) + 'px "Trebuchet MS", Verdana, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  const tw = g.measureText(text).width;
  const bw = tw + size * 0.85;
  const bh = size * 1.45;
  const bx = cx - bw / 2;
  const by = cy - bh / 2;
  const tailX = clamp(cx - side * bw * 0.22, bx + size * 0.35, bx + bw - size * 0.35);

  g.fillStyle = '#fffdf5';
  g.strokeStyle = '#241309';
  g.lineWidth = Math.max(2, size * 0.07);

  roundRect(g, bx, by, bw, bh, size * 0.42);
  g.fill();
  g.stroke();

  g.beginPath();
  g.moveTo(tailX - size * 0.22, by + bh - 1);
  g.lineTo(tailX - side * size * 0.1, by + bh + size * 0.5);
  g.lineTo(tailX + size * 0.24, by + bh - 1);
  g.closePath();
  g.fill();
  g.stroke();

  g.fillStyle = '#241309';
  g.fillText(text, cx, cy + size * 0.04);
  g.restore();
}

function drawCaption(g, W, H, t) {
  const cues = [
    [0.4, 7.4, 'SavorySailor, an orange ghoul is circling your broadcast.'],
    [7.4, 13.0, 'It is crying for attention. The diaper is not coping.'],
    [13.0, 18.2, 'Diaper status: now a drag hazard.'],
    [18.2, 22.4, 'ME. ME. ME. It wants a snack and a change.'],
    [22.4, 99, 'SavorySailor, that is your problem now.'],
  ];
  let line = null;
  let a = 0;
  for (const c of cues) {
    if (t >= c[0] && t < c[1]) {
      line = c[2];
      a = Math.min(1, (t - c[0]) / 0.35, (c[1] - t) / 0.35);
    }
  }
  if (!line || a <= 0) return;

  const size = Math.max(15, Math.min(W, H) * 0.03);
  g.save();
  g.globalAlpha = clamp(a, 0, 1);
  g.font = '700 ' + size.toFixed(0) + 'px "Trebuchet MS", Verdana, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  const y = H * 0.935;
  g.lineWidth = size * 0.34;
  g.strokeStyle = 'rgba(8, 10, 24, 0.85)';
  g.strokeText(line, W / 2, y);
  g.fillStyle = '#fff6e8';
  g.fillText(line, W / 2, y);
  g.restore();
}
