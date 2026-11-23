export const meta = {
  title: 'Endless Suspicious Hotdog',
  author: 'doctordiggitydank',
  prompt: 'a VERY large and endless hotdog inches into the screen from the left like an inchworm. it inches toward the streamer',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const T = {
  alertAt: 0.15,
  inStart: 1.0,
  boop: 7.4,
  holdEnd: 8.8,
  outStart: 8.8,
  outEnd: 14.2,
  end: 15.0,
};

let S = null;

function makeState() {
  return {
    cues: {},
    sparks: [],
    winks: 0,
  };
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, k) => a + (b - a) * k;
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
const easeOutBack = (k) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
};

function sfx(ctx, key, fn) {
  if (!S || S.cues[key]) return;
  S.cues[key] = true;
  try {
    fn();
  } catch (e) {}
}

export function init(ctx) {
  S = makeState();
}

function buildSparks(ctx) {
  const list = [];
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.22;
    list.push({
      a,
      speed: 0.55 + ((i * 37) % 11) / 11,
      size: 0.5 + ((i * 17) % 9) / 9,
    });
  }
  S.sparks = list;
}

function traceBody(g, pts, scale) {
  g.beginPath();
  g.moveTo(pts[0].x, pts[0].yc - pts[0].ry * scale);
  for (let i = 1; i < pts.length; i++) {
    g.lineTo(pts[i].x, pts[i].yc - pts[i].ry * scale);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    g.lineTo(pts[i].x, pts[i].yc + pts[i].ry * scale);
  }
  g.closePath();
}

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

function drawAlert(g, W, H, t, level, below, rot, scale) {
  const bannerW = W * 0.9;
  let bannerH = Math.min(H * 0.185, bannerW * 0.2);
  const cx = W * 0.5;
  const cy = below ? H * 0.845 : H * 0.15;

  g.save();
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(scale, scale);

  g.shadowColor = 'rgba(255, 47, 138, 0.9)';
  g.shadowBlur = 34;
  g.fillStyle = 'rgba(22, 7, 17, 0.9)';
  roundRect(g, -bannerW / 2, -bannerH / 2, bannerW, bannerH, bannerH * 0.22);
  g.fill();
  g.shadowBlur = 0;

  g.lineWidth = Math.max(4, bannerH * 0.06);
  g.strokeStyle = '#ffd23f';
  roundRect(g, -bannerW / 2, -bannerH / 2, bannerW, bannerH, bannerH * 0.22);
  g.stroke();

  g.lineWidth = Math.max(1.5, bannerH * 0.018);
  g.strokeStyle = 'rgba(255, 120, 190, 0.85)';
  roundRect(
    g,
    -bannerW / 2 + bannerH * 0.1,
    -bannerH / 2 + bannerH * 0.1,
    bannerW - bannerH * 0.2,
    bannerH - bannerH * 0.2,
    bannerH * 0.14
  );
  g.stroke();

  const label = 'THIS IS NOT A HOTDOG. ;)';
  let size = bannerH * 0.58;
  g.font = `900 ${size}px Impact, "Arial Black", "Franklin Gothic Heavy", sans-serif`;
  let tw = g.measureText(label).width;
  const maxW = bannerW * 0.9;
  if (tw > maxW) {
    size = size * (maxW / tw);
    g.font = `900 ${size}px Impact, "Arial Black", "Franklin Gothic Heavy", sans-serif`;
    tw = g.measureText(label).width;
  }

  const jitter = level * Math.sin(t * 46) * bannerH * 0.03;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.max(4, size * 0.12);
  g.strokeStyle = '#2a0d12';
  g.strokeText(label, jitter, bannerH * 0.02);
  g.fillStyle = '#ffe23f';
  g.fillText(label, jitter, bannerH * 0.02);

  g.restore();
}

export function frame(ctx, t, dt) {
  if (!S) S = makeState();
  if (!S.sparks.length) buildSparks(ctx);

  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);

  if (t >= T.end) {
    sfx(ctx, 'end', () => ctx.sound.beep(120, 280));
    ctx.done();
    return;
  }

  const st = ctx.streamer;
  const aimX = st ? (st.x + st.w * 0.5) * W : W * 0.56;
  const aimY = st ? (st.y + st.h * 0.5) * H : H * 0.46;
  const bunR = Math.min(H * 0.082, W * 0.05);
  const restX = aimX - bunR * 0.9;
  const startX = -W * 0.8;
  const cookY = aimY + Math.sin(t * 2.1) * bunR * 0.05;

  let headX = startX;
  let squash = 0;
  let shake = 0;
  let boopAge = t - T.boop;
  const phase = t * 4.6;

  if (t < T.inStart) {
    headX = startX;
  } else if (t < T.boop) {
    const p = clamp01((t - T.inStart) / (T.boop - T.inStart));
    const e = easeInOut(p);
    headX = lerp(startX, restX, e) + Math.sin(p * Math.PI * 2 * 7) * W * 0.011;
    const wind = T.boop - 0.5;
    if (t > wind) {
      headX -= W * 0.022 * Math.sin(Math.PI * ((t - wind) / 0.5));
    }
  } else if (t < T.holdEnd) {
    headX = restX;
    if (boopAge >= 0 && boopAge < 0.5) {
      squash = 0.2 * Math.sin(Math.PI * (boopAge / 0.5));
      headX += Math.sin(boopAge * 44) * bunR * 0.06 * Math.exp(-boopAge * 6);
    }
  } else {
    const p = clamp01((t - T.outStart) / (T.outEnd - T.outStart));
    const e = easeInOut(p);
    headX = lerp(restX, -W * 2.0, e) + Math.sin(p * Math.PI * 4) * W * 0.012;
  }

  if (boopAge >= 0 && boopAge < 0.55) {
    shake = (1 - boopAge / 0.55) * Math.min(W, H) * 0.014;
  }

  // ----- sounds -----
  if (t > 0.18) sfx(ctx, 'a', () => ctx.sound.noise(150));
  if (t > T.inStart) sfx(ctx, 'b', () => ctx.sound.beep(120, 90));
  if (t > 2.0) sfx(ctx, 'c', () => ctx.sound.beep(98, 80));
  if (t > 3.1) sfx(ctx, 'd', () => ctx.sound.beep(128, 80));
  if (t > 4.2) sfx(ctx, 'e', () => ctx.sound.beep(104, 80));
  if (t > 5.3) sfx(ctx, 'f', () => ctx.sound.beep(138, 80));
  if (t > 6.4) sfx(ctx, 'g', () => ctx.sound.beep(110, 85));
  if (boopAge >= 0) sfx(ctx, 'boop1', () => {
    ctx.sound.noise(70);
    ctx.sound.beep(520, 150);
  });
  if (boopAge >= 0.16) sfx(ctx, 'boop2', () => ctx.sound.beep(360, 200));
  if (boopAge >= 0.38) sfx(ctx, 'boop3', () => ctx.sound.beep(270, 190));
  if (t > 10.4) sfx(ctx, 'h', () => ctx.sound.beep(165, 140));
  if (t > 12.0) sfx(ctx, 'i', () => ctx.sound.beep(142, 160));
  if (t > 13.6) sfx(ctx, 'j', () => ctx.sound.beep(118, 210));

  g.save();
  if (shake > 0.01) {
    g.translate(Math.sin(t * 57) * shake, Math.sin(t * 71 + 1.3) * shake);
  }

  const len = W * 3.2;
  const N = 190;
  const humps = 11;
  const pts = [];
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    const x = headX - len * u;
    const wave = Math.sin(u * Math.PI * 2 * humps - phase);
    let ry = bunR * (1 + 0.17 * wave);
    ry *= 1 - squash * Math.exp(-u * 8);
    const yc =
      cookY +
      Math.sin(u * Math.PI * 2 * (humps * 0.5) - phase * 0.75) * bunR * 0.09;
    pts.push({ x, yc, ry });
  }

  const bunGrad = g.createLinearGradient(0, cookY - bunR * 1.4, 0, cookY + bunR * 1.4);
  bunGrad.addColorStop(0, '#f7d097');
  bunGrad.addColorStop(0.45, '#dda059');
  bunGrad.addColorStop(1, '#a86a30');

  const meatGrad = g.createLinearGradient(0, cookY - bunR, 0, cookY + bunR);
  meatGrad.addColorStop(0, '#e5765a');
  meatGrad.addColorStop(0.5, '#c94a33');
  meatGrad.addColorStop(1, '#8e2a1c');

  traceBody(g, pts, 1);
  g.fillStyle = bunGrad;
  g.fill();

  traceBody(g, pts, 0.58);
  g.fillStyle = meatGrad;
  g.fill();

  // soft shading along the underbelly
  g.save();
  traceBody(g, pts, 1);
  g.clip();
  const shade = g.createLinearGradient(0, cookY, 0, cookY + bunR * 1.4);
  shade.addColorStop(0, 'rgba(80, 34, 8, 0)');
  shade.addColorStop(1, 'rgba(60, 22, 4, 0.42)');
  g.fillStyle = shade;
  g.fillRect(headX - len, cookY, len + W, bunR * 1.6);
  g.restore();

  // bun shine
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const y = p.yc - p.ry * 0.62;
    if (i === 0) g.moveTo(p.x, y);
    else g.lineTo(p.x, y);
  }
  g.strokeStyle = 'rgba(255, 242, 205, 0.5)';
  g.lineWidth = Math.max(2, bunR * 0.07);
  g.lineCap = 'round';
  g.stroke();

  // sausage gloss
  g.beginPath();
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const y = p.yc - p.ry * 0.58 * 0.42;
    if (i === 0) g.moveTo(p.x, y);
    else g.lineTo(p.x, y);
  }
  g.strokeStyle = 'rgba(255, 205, 180, 0.35)';
  g.lineWidth = Math.max(2, bunR * 0.05);
  g.stroke();

  // rounded head
  const hRy = pts[0].ry;
  g.fillStyle = bunGrad;
  g.beginPath();
  g.ellipse(headX, pts[0].yc, bunR * 0.88, hRy, 0, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = meatGrad;
  g.beginPath();
  g.ellipse(headX + bunR * 0.06, pts[0].yc, bunR * 0.74, hRy * 0.58, 0, 0, Math.PI * 2);
  g.fill();

  const noseX = headX + bunR * 0.42;
  const noseY = pts[0].yc - hRy * 0.26;
  g.fillStyle = 'rgba(255, 246, 222, 0.55)';
  g.beginPath();
  g.ellipse(noseX, noseY, bunR * 0.2, bunR * 0.11, -0.35, 0, Math.PI * 2);
  g.fill();

  g.fillStyle = 'rgba(120, 42, 24, 0.35)';
  g.beginPath();
  g.ellipse(headX + bunR * 0.1, pts[0].yc + hRy * 0.42, bunR * 0.5, bunR * 0.12, 0, 0, Math.PI * 2);
  g.fill();

  // ----- boop impact -----
  if (boopAge >= 0 && boopAge < 1.5) {
    const k = clamp01(boopAge / 1.5);
    for (let i = 0; i < 3; i++) {
      const rk = clamp01((boopAge - i * 0.11) / 0.85);
      if (rk <= 0 || rk >= 1) continue;
      g.globalAlpha = (1 - rk) * 0.85;
      g.strokeStyle = i % 2 === 0 ? '#ffe23f' : '#ff7aa8';
      g.lineWidth = Math.max(2, bunR * 0.1 * (1 - rk));
      g.beginPath();
      g.arc(aimX, aimY, rk * (bunR * 1.2 + bunR * 4.2 * rk), 0, Math.PI * 2);
      g.stroke();
    }
    g.globalAlpha = 1;

    const sAlpha = 1 - clamp01((boopAge - 0.75) / 0.6);
    for (const sp of S.sparks) {
      const d = (bunR * 0.6 + boopAge * bunR * 5.2 * sp.speed);
      g.globalAlpha = sAlpha * 0.9;
      g.fillStyle = sp.size > 0.5 ? '#ffe23f' : '#ff8fb8';
      g.beginPath();
      g.arc(
        aimX + Math.cos(sp.a) * d,
        aimY + Math.sin(sp.a) * d * 0.85 + boopAge * boopAge * bunR * 0.5,
        bunR * 0.1 * sp.size,
        0,
        Math.PI * 2
      );
      g.fill();
    }
    g.globalAlpha = 1;

    const wAlpha = 1 - clamp01((boopAge - 0.7) / 0.7);
    const rise = boopAge * bunR * 0.9;
    const pop = boopAge < 0.18 ? easeOutBack(boopAge / 0.18) : 1;
    g.save();
    g.translate(aimX + bunR * 0.2, aimY - bunR * 1.9 - rise);
    g.rotate(-0.07 + Math.sin(t * 3) * 0.02);
    g.scale(pop, pop);
    g.globalAlpha = wAlpha;
    g.font = `900 ${bunR * 1.5}px Impact, "Arial Black", sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineJoin = 'round';
    g.lineWidth = bunR * 0.22;
    g.strokeStyle = '#2a0d12';
    g.strokeText('BOOP', 0, 0);
    g.fillStyle = '#ffe23f';
    g.fillText('BOOP', 0, 0);
    g.restore();
    g.globalAlpha = 1;
  }

  g.restore();

  // ----- alert -----
  const entry = clamp01((t - T.alertAt) / 0.5);
  let scale = entry <= 0 ? 0 : easeOutBack(entry);
  if (scale <= 0) return;

  const jolt = boopAge >= 0 && boopAge < 0.45 ? 0.09 * Math.sin(Math.PI * (boopAge / 0.45)) : 0;
  scale *= 1 + 0.01 * Math.sin(t * 2.4) + jolt;
  const below = !!(st && st.y + st.h * 0.5 < 0.48);
  const rot = 0.016 * Math.sin(t * 1.9) - jolt * 0.5;
  const level = boopAge >= 0 && boopAge < 0.6 ? 1 : 0.25;

  drawAlert(g, W, H, t, level, below, rot, scale);
}

export function dispose(ctx) {}
