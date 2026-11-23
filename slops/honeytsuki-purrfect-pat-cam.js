export const meta = {
  title: 'Purrfect Pat Cam',
  author: 'honeytsuki',
  prompt: 'Pet cat on camera',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const PATS = [
  { at: 5.0, dx: -0.3 },
  { at: 6.5, dx: 0.0 },
  { at: 8.0, dx: 0.3 },
];
const PAT_DUR = 0.62;
const PAT_LAND = 0.42;
const END = 15.0;

const TAU = Math.PI * 2;
const OUT = '#2a1f3d';
const FUR = '#ffbf85';
const FUR_D = '#e08b4f';
const CREAM = '#fff1dc';
const PINK = '#ff6fa5';

let S = null;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeOutBack = (p) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2);
};

function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.lineTo(x + w - rr, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rr);
  c.lineTo(x + w, y + h - rr);
  c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  c.lineTo(x + rr, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rr);
  c.lineTo(x, y + rr);
  c.quadraticCurveTo(x, y, x + rr, y);
  c.closePath();
}

function heartPath(c, x, y, r, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(r, r);
  c.beginPath();
  c.moveTo(0, 0.42);
  c.bezierCurveTo(-0.95, -0.3, -0.6, -1.05, 0, -0.5);
  c.bezierCurveTo(0.6, -1.05, 0.95, -0.3, 0, 0.42);
  c.closePath();
  c.restore();
}

function snd(ctx, fn) {
  if (ctx.sound) fn(ctx.sound);
}

export function init(ctx) {
  S = {
    fired: Object.create(null),
    hearts: [],
    ripples: [],
    done: false,
  };
}

function once(key, fn) {
  if (!S.fired[key]) {
    S.fired[key] = true;
    fn();
  }
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!S) init(ctx);
  if (S.done) return;
  if (t >= END) {
    S.done = true;
    ctx.done();
    return;
  }

  const step = Math.min(dt || 0.016, 0.1);

  const cam = ctx.streamer
    ? {
        x: ctx.streamer.x * W,
        y: ctx.streamer.y * H,
        w: ctx.streamer.w * W,
        h: ctx.streamer.h * H,
      }
    : { x: W * 0.16, y: H * 0.1, w: W * 0.68, h: H * 0.74 };

  const cs = clamp(cam.w / 320, 0.7, 2.4);

  // ---- cat placement: peeking up from the bottom of the live camera frame
  const rise = clamp(t / 0.9, 0, 1);
  let catX = cam.x + cam.w * 0.5;
  let catY = clamp(cam.y + cam.h * 0.96, cam.y + 105 * cs, H - 58 * cs);
  catY += (1 - easeOutBack(rise)) * 180 * cs;

  let patsDone = 0;
  for (const p of PATS) if (t >= p.at + PAT_LAND) patsDone++;

  let squish = 0;
  for (const p of PATS) {
    const dt2 = t - (p.at + PAT_LAND);
    if (dt2 >= 0) squish += 0.15 * Math.exp(-dt2 * 5.5);
  }
  squish = Math.min(squish, 0.28);

  const purring = t >= 8.6 && t < 12.4;
  if (purring) catX += Math.sin(t * 6.5) * 1.6 * cs;

  const csFinal = cs * (1 + patsDone * 0.055);

  // ---- impacts: ripples, hearts, squish sounds
  PATS.forEach((p, i) => {
    if (t < p.at + PAT_LAND) return;
    const hx = catX + p.dx * 92 * csFinal;
    const hy = catY - 40 * csFinal;
    once('imp' + i, () => {
      S.ripples.push({ x: hx, y: hy, life: 0, max: 0.9 });
      const offs = [
        [-1, 0.2],
        [0, -0.5],
        [0.8, 0.1],
        [-0.45, -0.8],
        [0.5, -0.65],
      ];
      for (const o of offs) {
        S.hearts.push({
          x: hx + o[0] * 26 * csFinal,
          y: hy + o[1] * 22 * csFinal,
          vx: o[0] * 26 * csFinal,
          vy: -60 * csFinal - Math.abs(o[1]) * 55 * csFinal,
          life: 0,
          max: 1.5 + Math.random() * 0.2,
          size: (7 + Math.abs(o[0]) * 5) * csFinal,
          rot: o[0] * 0.3,
        });
      }
      snd(ctx, (s) => {
        s.beep(620 + i * 90, 120);
        s.noise(160);
      });
    });
  });

  // ---- ambient sounds
  once('rise', () => snd(ctx, (s) => s.noise(240)));
  if (purring) {
    for (let i = 0; i < 18; i++) {
      const at = 8.6 + i * 0.15;
      if (t >= at) {
        once('purr' + i, () =>
          snd(ctx, (s) => s.beep(96 + i * 2.5, 90)),
        );
      }
    }
  }
  if (t >= 12.4) {
    once('chime', () =>
      snd(ctx, (s) => {
        s.beep(523, 110);
        s.beep(659, 110);
        s.beep(784, 130);
        s.beep(1046, 220);
      }),
    );
    once('finale', () => {
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        S.hearts.push({
          x: catX + Math.cos(a) * 40 * csFinal,
          y: catY - Math.sin(a) * 20 * csFinal,
          vx: Math.cos(a) * 90 * csFinal,
          vy: -90 - Math.sin(a) * 60 * csFinal,
          life: 0,
          max: 2.0,
          size: (8 + (i % 3) * 3) * csFinal,
          rot: a * 0.2,
        });
      }
    });
  }

  // ---- update particles
  for (const h of S.hearts) {
    h.life += step;
    h.x += h.vx * step;
    h.y += h.vy * step;
    h.vy += 26 * step;
    h.vx *= 1 - 0.6 * step;
    h.rot += 1.2 * step;
  }
  S.hearts = S.hearts.filter((h) => h.life < h.max);
  for (const r of S.ripples) r.life += step;
  S.ripples = S.ripples.filter((r) => r.life < r.max);

  // ---- ripples behind cat
  for (const r of S.ripples) {
    const p = r.life / r.max;
    c.save();
    c.globalAlpha = 0.55 * (1 - p);
    c.strokeStyle = PINK;
    c.lineWidth = 4 * cs;
    c.beginPath();
    c.arc(r.x, r.y, (12 + p * 105) * csFinal, 0, TAU);
    c.stroke();
    c.globalAlpha = 0.25 * (1 - p);
    c.strokeStyle = CREAM;
    c.lineWidth = 2 * cs;
    c.beginPath();
    c.arc(r.x, r.y, (26 + p * 130) * csFinal, 0, TAU);
    c.stroke();
    c.restore();
  }

  // ---- final rays around the live frame
  if (t >= 12.3) {
    const pulse = 0.5 + 0.5 * Math.sin((t - 12.3) * 1.5);
    const cx = cam.x + cam.w / 2;
    const cy = cam.y + cam.h / 2;
    const maxR = Math.hypot(W, H) * 0.6;
    c.save();
    c.globalAlpha = 0.16 + pulse * 0.14;
    c.strokeStyle = PINK;
    c.lineWidth = 8 * cs;
    c.lineCap = 'round';
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + t * 0.25;
      c.beginPath();
      c.moveTo(cx + Math.cos(a) * maxR * 0.2, cy + Math.sin(a) * maxR * 0.2);
      c.lineTo(cx + Math.cos(a) * maxR * 0.46, cy + Math.sin(a) * maxR * 0.46);
      c.stroke();
    }
    c.restore();
  }

  // ---- purr arcs
  if (purring) {
    const pa =
      clamp((t - 8.6) / 0.5, 0, 1) * clamp((12.4 - t) / 0.4, 0, 1);
    for (let i = 0; i < 3; i++) {
      const a = 0.34 * pa * (0.65 + 0.35 * Math.sin(t * 2.4 - i * 0.8));
      if (a <= 0.01) continue;
      c.save();
      c.globalAlpha = a;
      c.strokeStyle = '#ffd9ec';
      c.lineWidth = 5 * cs;
      c.lineCap = 'round';
      for (const side of [-1, 1]) {
        c.beginPath();
        c.arc(
          catX + side * (78 + i * 15) * csFinal,
          catY - 8 * csFinal,
          (26 + i * 13) * csFinal,
          side > 0 ? -0.75 : Math.PI - 0.75,
          side > 0 ? 0.75 : Math.PI + 0.75,
        );
        c.stroke();
      }
      c.restore();
    }
  }

  // ---- cat
  const happy = t >= 8.6;
  drawCat(c, t, catX, catY, csFinal, squish, happy, patsDone);

  // ---- pat glows
  PATS.forEach((p) => {
    const q = (t - p.at) / PAT_DUR;
    if (q < 0 || q > 1) return;
    const hx = catX + p.dx * 92 * csFinal;
    const hy = catY - 40 * csFinal;
    const drop = q < 0.62 ? easeOut(q / 0.62) : 1 - easeOut((q - 0.62) / 0.38) * 0.55;
    const px = hx;
    const py = hy - (1 - drop) * 190 * csFinal;
    const alpha = q < 0.9 ? 1 : 1 - (q - 0.9) / 0.1;
    if (alpha <= 0) return;
    c.save();
    c.globalAlpha = 0.9 * alpha;
    const g = c.createRadialGradient(px, py, 0, px, py, 46 * csFinal);
    g.addColorStop(0, 'rgba(255, 234, 246, 0.95)');
    g.addColorStop(0.45, 'rgba(255, 111, 165, 0.55)');
    g.addColorStop(1, 'rgba(255, 111, 165, 0)');
    c.fillStyle = g;
    c.beginPath();
    c.arc(px, py, 46 * csFinal, 0, TAU);
    c.fill();
    c.strokeStyle = 'rgba(255, 247, 251, 0.95)';
    c.lineWidth = 3 * cs;
    c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + t * 0.8;
      c.beginPath();
      c.moveTo(px + Math.cos(a) * 18 * csFinal, py + Math.sin(a) * 18 * csFinal);
      c.lineTo(px + Math.cos(a) * 30 * csFinal, py + Math.sin(a) * 30 * csFinal);
      c.stroke();
    }
    c.restore();
  });

  // ---- hearts on top
  for (const h of S.hearts) {
    const p = h.life / h.max;
    const a = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    heartPath(c, h.x, h.y, h.size, h.rot);
    c.fillStyle = h.size > 10 * csFinal ? '#ff8fc0' : PINK;
    c.fill();
    c.restore();
  }

  // ---- pets counter
  if (t > 3.4 && t < 12.2) {
    const a =
      clamp((t - 3.4) / 0.3, 0, 1) * clamp((12.2 - t) / 0.35, 0, 1);
    const label = patsDone + '/3 PETS';
    const fs = clamp(W * 0.024, 12, 26);
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.font = `900 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const tw = c.measureText(label).width + fs * 1.8;
    const th = fs * 1.75;
    const py = Math.max(th / 2 + 8, catY - 106 * csFinal);
    roundRect(c, catX - tw / 2, py - th / 2, tw, th, th / 2);
    c.fillStyle = 'rgba(18, 12, 34, 0.62)';
    c.fill();
    c.lineWidth = 2;
    c.strokeStyle = 'rgba(255, 111, 165, 0.55)';
    c.stroke();
    c.fillStyle = '#fff7fb';
    c.fillText(label, catX, py + 1);
    c.restore();
  }

  // ---- captions
  const capFs = clamp(W * 0.05, 18, 58);
  const capY = cam.y + cam.h / 2 < H * 0.5 ? H * 0.87 : H * 0.13;

  const lineFor = (start, end, text) => {
    if (t < start - 0.05 || t > end) return;
    const a = Math.min(
      clamp((t - start) / 0.3, 0, 1),
      clamp((end - t) / 0.3, 0, 1),
    );
    if (a > 0.01) drawCaption(c, W, text, capY, a, capFs);
  };

  lineFor(0.5, 3.4, 'A CAT IS NOW ON CAMERA.');
  lineFor(3.6, 8.5, 'PET THE CAT, SAVORYSAILOR.');
  lineFor(8.7, 12.2, 'THE CAT IS PURRING. DO NOT STOP.');

  // ---- punchline stamp
  if (t >= 12.4) {
    const p = clamp((t - 12.4) / 0.5, 0, 1);
    const pop = 0.6 + easeOutBack(p) * 0.4;
    const a = clamp((t - 12.4) / 0.25, 0, 1);
    const fs = clamp(W * 0.095, 32, 108);
    c.save();
    c.translate(W / 2, capY);
    c.rotate(-0.08);
    c.scale(pop, pop);
    c.globalAlpha = a;
    c.font = `900 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = fs * 0.16;
    c.strokeStyle = OUT;
    c.lineJoin = 'round';
    c.strokeText('PURRFECT.', 0, 0);
    c.fillStyle = PINK;
    c.fillText('PURRFECT.', 0, 0);
    c.font = `800 ${fs * 0.28}px "Trebuchet MS", "Segoe UI", sans-serif`;
    c.lineWidth = fs * 0.055;
    c.strokeStyle = OUT;
    c.strokeText('CERTIFIED GOOD PET', 0, fs * 0.72);
    c.fillStyle = '#fff7fb';
    c.fillText('CERTIFIED GOOD PET', 0, fs * 0.72);
    c.restore();
  }
}

function drawCaption(c, W, text, y, alpha, fs) {
  c.save();
  c.globalAlpha = clamp(alpha, 0, 1);
  c.font = `900 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = Math.min(c.measureText(text).width + fs * 1.3, W * 0.94);
  const th = fs * 1.7;
  roundRect(c, W / 2 - tw / 2, y - th / 2, tw, th, th / 2);
  c.fillStyle = 'rgba(18, 12, 34, 0.62)';
  c.fill();
  c.lineWidth = 2;
  c.strokeStyle = 'rgba(255, 111, 165, 0.55)';
  c.stroke();
  c.fillStyle = '#fff7fb';
  c.fillText(text, W / 2, y + 1, W * 0.9);
  c.restore();
}

function drawCat(c, t, x, y, s, squish, happy, patsDone) {
  c.save();
  c.translate(x, y);
  c.translate(0, 46 * s);
  c.scale(1 + squish * 0.75, 1 - squish);
  c.translate(0, -46 * s);
  c.scale(s, s);

  c.lineJoin = 'round';
  c.lineCap = 'round';

  // tail
  c.strokeStyle = OUT;
  c.lineWidth = 22;
  c.beginPath();
  c.moveTo(-44, 30);
  c.quadraticCurveTo(-104, 44 + Math.sin(t * 2.2) * 12, -92, 104);
  c.stroke();
  c.strokeStyle = FUR_D;
  c.lineWidth = 15;
  c.beginPath();
  c.moveTo(-44, 30);
  c.quadraticCurveTo(-104, 44 + Math.sin(t * 2.2) * 12, -92, 104);
  c.stroke();

  // ears
  for (const side of [-1, 1]) {
    c.fillStyle = FUR;
    c.strokeStyle = OUT;
    c.lineWidth = 4.5;
    c.beginPath();
    c.moveTo(side * 48, -24);
    c.lineTo(side * 41, -76);
    c.lineTo(side * 9, -42);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = PINK;
    c.beginPath();
    c.moveTo(side * 42, -32);
    c.lineTo(side * 38, -64);
    c.lineTo(side * 20, -42);
    c.closePath();
    c.fill();
  }

  // head
  c.fillStyle = FUR;
  c.strokeStyle = OUT;
  c.lineWidth = 5;
  c.beginPath();
  c.ellipse(0, 0, 58, 50, 0, 0, TAU);
  c.fill();
  c.stroke();

  // forehead stripes
  c.strokeStyle = FUR_D;
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(-18, -40);
  c.quadraticCurveTo(-14, -30, -16, -22);
  c.moveTo(0, -44);
  c.quadraticCurveTo(0, -32, 0, -24);
  c.moveTo(18, -40);
  c.quadraticCurveTo(14, -30, 16, -22);
  c.stroke();

  // cheeks
  c.fillStyle = 'rgba(255, 140, 150, 0.32)';
  c.beginPath();
  c.arc(-34, 16, 11, 0, TAU);
  c.arc(34, 16, 11, 0, TAU);
  c.fill();

  // eyes
  if (happy) {
    c.strokeStyle = OUT;
    c.lineWidth = 5.5;
    for (const side of [-1, 1]) {
      c.beginPath();
      c.arc(side * 22, -4, 12, Math.PI * 1.15, Math.PI * 1.85);
      c.stroke();
    }
  } else {
    const blinkPhase = (t * 0.9 + 0.4) % 3.2;
    const open = blinkPhase < 0.13 ? 0.12 : 1;
    const lookX = Math.sin(t * 0.8) * 2.4;
    for (const side of [-1, 1]) {
      c.fillStyle = '#fff6e8';
      c.strokeStyle = OUT;
      c.lineWidth = 3.5;
      c.beginPath();
      c.ellipse(side * 22, -6, 11, 13 * open, 0, 0, TAU);
      c.fill();
      c.stroke();
      c.fillStyle = OUT;
      c.beginPath();
      c.ellipse(
        side * 22 + lookX,
        -7,
        7,
        9 * open,
        0,
        0,
        TAU,
      );
      c.fill();
      if (open > 0.5) {
        c.fillStyle = 'rgba(255,255,255,0.9)';
        c.beginPath();
        c.arc(side * 22 + lookX + 2.5, -11, 2.4, 0, TAU);
        c.fill();
      }
    }
  }

  // nose
  c.fillStyle = PINK;
  c.strokeStyle = OUT;
  c.lineWidth = 2.5;
  c.beginPath();
  c.moveTo(-8, 6);
  c.lineTo(8, 6);
  c.lineTo(0, 15);
  c.closePath();
  c.fill();
  c.stroke();

  // mouth
  c.strokeStyle = OUT;
  c.lineWidth = 3.5;
  if (happy) {
    c.fillStyle = '#3a2340';
    c.beginPath();
    c.moveTo(-17, 18);
    c.quadraticCurveTo(0, 40, 17, 18);
    c.quadraticCurveTo(0, 24, -17, 18);
    c.closePath();
    c.fill();
    c.fillStyle = PINK;
    c.beginPath();
    c.ellipse(0, 27, 8, 5, 0, 0, TAU);
    c.fill();
  } else {
    c.beginPath();
    c.moveTo(-13, 20);
    c.quadraticCurveTo(-6, 25, 0, 19);
    c.quadraticCurveTo(6, 25, 13, 20);
    c.stroke();
  }

  // whiskers
  c.strokeStyle = OUT;
  c.lineWidth = 2.4;
  c.globalAlpha = 0.75;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(side * 16, 8 + i * 6);
      c.lineTo(side * (72 + i * 2), 0 + i * 12);
      c.stroke();
    }
  }
  c.globalAlpha = 1;

  // paws on the frame edge
  for (const side of [-1, 1]) {
    c.fillStyle = CREAM;
    c.strokeStyle = OUT;
    c.lineWidth = 4;
    c.beginPath();
    c.ellipse(side * 31, 46, 17, 12, side * 0.16, 0, TAU);
    c.fill();
    c.stroke();
    c.strokeStyle = OUT;
    c.lineWidth = 2.2;
    for (let i = -1; i <= 1; i++) {
      c.beginPath();
      c.moveTo(side * 31 + i * 6, 38);
      c.lineTo(side * 31 + i * 6, 47);
      c.stroke();
    }
  }

  // little contented wiggle when fully petted
  if (patsDone >= 3) {
    c.globalAlpha = 0.5;
    c.strokeStyle = PINK;
    c.lineWidth = 4;
    c.beginPath();
    c.arc(0, 0, 74, -0.6, 0.6);
    c.stroke();
    c.globalAlpha = 1;
  }

  c.restore();
}

export function dispose(ctx) {
  S = null;
}
