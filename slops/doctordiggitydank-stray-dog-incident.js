// A mangy stray dog wanders in, sniffs, claims SavorySailor, barks, farts,
// and exits laughing. Drawn entirely in vector primitives over transparent glass.

export const meta = {
  title: 'Stray Dog Incident',
  author: 'doctordiggitydank',
  prompt: 'A mangy dog walks into the screen and sniffs the ground as he walks toward the streamer, then relieves himself on them and barks.',
  createdAt: '2026-11-23T12:00:00.000Z',
  moderationLevel: 'anything',
};

const T = {
  trotEnd: 3.3,
  sniffEnd: 6.0,
  turnEnd: 6.5,
  peeStart: 6.8,
  peeEnd: 10.4,
  bark: 10.6,
  fart: 11.9,
  laugh: 13.0,
  run: 14.0,
  end: 17.4,
};

let S = null;

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function easeOutCubic(x) { return 1 - Math.pow(1 - x, 3); }
function easeInQuad(x) { return x * x; }
function smooth(x) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp(x, 0, 1)); }
function lerp(a, b, u) { return a + (b - a) * u; }

function bezPoint(p0, p1, p2, u) {
  const iu = 1 - u;
  return {
    x: iu * iu * p0.x + 2 * iu * u * p1.x + u * u * p2.x,
    y: iu * iu * p0.y + 2 * iu * u * p1.y + u * u * p2.y,
  };
}

export function init(ctx) {
  const r = () => ctx.rand();
  S = {
    fired: {},
    patches: [],
    flies: [],
    drops: [],
    farts: [],
    sniffPuffs: [],
  };
  for (let i = 0; i < 9; i++) {
    S.patches.push({
      x: -0.75 + r() * 1.5,
      y: -1.3 + r() * 0.62,
      rx: 0.10 + r() * 0.17,
      ry: 0.07 + r() * 0.11,
      a: r() * Math.PI,
    });
  }
  for (let i = 0; i < 3; i++) {
    S.flies.push({ a: r() * Math.PI * 2, sp: 0.9 + r() * 1.3, rad: 0.55 + r() * 0.5, ph: r() * 6.283 });
  }
  for (let i = 0; i < 30; i++) {
    S.drops.push({ p: r(), sp: 0.75 + r() * 0.6, off: r() * 2 - 1, rad: 0.5 + r() * 1.1 });
  }
  for (let i = 0; i < 11; i++) {
    S.farts.push({ x: r() * 2 - 1, y: r() * 2 - 1, r: 0.4 + r() * 0.7, ph: r() * 6.283 });
  }
}

function drawLeg(c, s, hx, hy, swing, col, lw, far) {
  const kx = hx + Math.sin(swing) * 0.2;
  const ky = hy * 0.5;
  const fx = hx + Math.sin(swing) * 0.36;
  c.beginPath();
  c.moveTo(hx * s, hy * s);
  c.quadraticCurveTo((hx + 0.04) * s, (hy * 0.55) * s, kx * s, ky * s);
  c.lineTo(fx * s, 0);
  c.strokeStyle = far ? 'rgba(36,26,18,0.55)' : '#241a12';
  c.lineWidth = (lw + 0.035) * s;
  c.stroke();
  c.strokeStyle = col;
  c.lineWidth = lw * s;
  c.stroke();
}

function drawDog(c, o) {
  const s = o.s;
  const ink = '#241a12';
  const fur = '#8a6b4a';
  const furD = '#5e4831';
  const furL = '#b99a72';

  c.save();
  c.translate(o.dogX, o.groundY + o.bob);
  c.scale(o.sx, 1);
  c.lineJoin = 'round';
  c.lineCap = 'round';

  // ground shadow
  c.fillStyle = 'rgba(15,10,5,0.28)';
  c.beginPath();
  c.ellipse(0, 0.03 * s, 1.55 * s, 0.15 * s, 0, 0, Math.PI * 2);
  c.fill();

  // mangy tail
  const tw = Math.sin(o.tailWag);
  c.beginPath();
  c.moveTo(-0.88 * s, -1.15 * s);
  c.quadraticCurveTo(-1.5 * s, -1.25 * s, -1.7 * s, -1.6 * s + tw * 0.3 * s);
  c.strokeStyle = ink;
  c.lineWidth = 0.18 * s;
  c.stroke();
  c.strokeStyle = furD;
  c.lineWidth = 0.1 * s;
  c.stroke();

  // far legs
  drawLeg(c, s, 0.55, -0.88, Math.sin(o.walk + 3.1) * 0.5, furD, 0.13, true);
  drawLeg(c, s, -0.55, -0.9, Math.sin(o.walk + 1.0) * 0.5, furD, 0.13, true);

  // rear leg: lifted or planted
  const lift = o.legLift;
  if (lift < 0.98) {
    c.save();
    c.globalAlpha = 1 - lift;
    drawLeg(c, s, -0.62, -0.9, Math.sin(o.walk + 5.2) * 0.5, fur, 0.145, false);
    c.restore();
  }
  if (lift > 0.02) {
    c.save();
    c.globalAlpha = Math.min(1, lift);
    c.strokeStyle = ink;
    c.lineWidth = 0.18 * s;
    c.beginPath();
    c.moveTo(-0.62 * s, -0.92 * s);
    c.quadraticCurveTo(-1.06 * s, -0.96 * s, -1.2 * s, -0.68 * s);
    c.stroke();
    c.strokeStyle = fur;
    c.lineWidth = 0.11 * s;
    c.stroke();
    c.strokeStyle = ink;
    c.lineWidth = 0.14 * s;
    c.beginPath();
    c.moveTo(-1.2 * s, -0.68 * s);
    c.lineTo(-1.44 * s, -0.5 * s);
    c.stroke();
    c.strokeStyle = fur;
    c.lineWidth = 0.07 * s;
    c.stroke();
    c.restore();
  }

  // body
  c.beginPath();
  c.ellipse(0, -0.98 * s, 1.04 * s, 0.5 * s, -0.03, 0, Math.PI * 2);
  c.fillStyle = fur;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.055 * s;
  c.stroke();

  // patches, belly, ribs inside the body
  c.save();
  c.beginPath();
  c.ellipse(0, -0.98 * s, 1.04 * s, 0.5 * s, -0.03, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = furL;
  c.beginPath();
  c.ellipse(0.08 * s, -0.72 * s, 0.86 * s, 0.26 * s, 0, 0, Math.PI * 2);
  c.fill();
  for (let i = 0; i < S.patches.length; i++) {
    const p = S.patches[i];
    c.globalAlpha = 0.5;
    c.fillStyle = furD;
    c.beginPath();
    c.ellipse(p.x * s, p.y * s, p.rx * s, p.ry * s, p.a, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;
  c.strokeStyle = 'rgba(36,26,18,0.3)';
  c.lineWidth = 0.03 * s;
  for (let i = 0; i < 3; i++) {
    const bx = (-0.15 + i * 0.32) * s;
    c.beginPath();
    c.moveTo(bx, -1.32 * s);
    c.quadraticCurveTo(bx + 0.06 * s, -0.95 * s, bx - 0.02 * s, -0.68 * s);
    c.stroke();
  }
  c.restore();

  // neck — stretches down when the head dips to sniff
  const dip = o.sniff * 0.62 * s;
  const headPx = 1.04 * s;
  const headPy = -1.36 * s + dip;
  c.lineCap = 'round';
  c.strokeStyle = ink;
  c.lineWidth = 0.5 * s;
  c.beginPath();
  c.moveTo(0.7 * s, -1.02 * s);
  c.lineTo(headPx, headPy + 0.2 * s);
  c.stroke();
  c.strokeStyle = fur;
  c.lineWidth = 0.38 * s;
  c.stroke();

  // head
  c.save();
  c.translate(headPx, headPy);
  c.rotate(o.sniff * 0.9 + o.headShake);

  c.beginPath();
  c.ellipse(0.24 * s, -0.16 * s, 0.4 * s, 0.34 * s, 0.15, 0, Math.PI * 2);
  c.fillStyle = fur;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.05 * s;
  c.stroke();

  c.beginPath();
  c.moveTo(0.45 * s, -0.3 * s);
  c.quadraticCurveTo(0.9 * s, -0.3 * s, 1.0 * s, -0.12 * s);
  c.quadraticCurveTo(0.9 * s, 0.04 * s, 0.5 * s, 0.02 * s);
  c.closePath();
  c.fillStyle = fur;
  c.fill();
  c.stroke();

  c.beginPath();
  c.ellipse(0.99 * s, -0.18 * s, 0.13 * s, 0.11 * s, 0, 0, Math.PI * 2);
  c.fillStyle = ink;
  c.fill();

  if (o.mouth > 0.05) {
    c.beginPath();
    c.ellipse(0.78 * s, 0.03 * s, 0.2 * s, 0.11 * s * o.mouth, 0.05, 0, Math.PI * 2);
    c.fillStyle = '#2a1a16';
    c.fill();
    c.beginPath();
    c.ellipse(0.78 * s, 0.08 * s, 0.12 * s, 0.05 * s * o.mouth, 0.05, 0, Math.PI * 2);
    c.fillStyle = '#d4788a';
    c.fill();
  } else {
    c.beginPath();
    c.moveTo(0.55 * s, 0.02 * s);
    c.quadraticCurveTo(0.75 * s, 0.09 * s, 0.92 * s, 0.0 * s);
    c.strokeStyle = 'rgba(36,26,18,0.6)';
    c.lineWidth = 0.03 * s;
    c.stroke();
  }

  // floppy ear
  c.beginPath();
  c.moveTo(0.12 * s, -0.42 * s);
  c.quadraticCurveTo(-0.06 * s, 0.0 * s, 0.16 * s, 0.22 * s);
  c.quadraticCurveTo(0.3 * s, 0.05 * s, 0.32 * s, -0.36 * s);
  c.closePath();
  c.fillStyle = furD;
  c.fill();
  c.strokeStyle = ink;
  c.lineWidth = 0.045 * s;
  c.stroke();

  // eye + sad brow
  c.beginPath();
  c.arc(0.32 * s, -0.28 * s, 0.075 * s, 0, Math.PI * 2);
  c.fillStyle = '#f2e6cf';
  c.fill();
  c.beginPath();
  c.arc(0.345 * s, -0.27 * s, 0.04 * s, 0, Math.PI * 2);
  c.fillStyle = ink;
  c.fill();
  c.beginPath();
  c.moveTo(0.24 * s, -0.38 * s);
  c.lineTo(0.42 * s, -0.34 * s);
  c.strokeStyle = ink;
  c.lineWidth = 0.035 * s;
  c.stroke();

  c.restore();

  // near front leg
  drawLeg(c, s, 0.55, -0.88, Math.sin(o.walk) * 0.5, fur, 0.145, false);

  c.restore();
}

function drawFlies(c, W, H, s, headX, headY, t) {
  for (let i = 0; i < S.flies.length; i++) {
    const f = S.flies[i];
    const ang = f.a + t * f.sp;
    const fx = headX + Math.cos(ang) * f.rad * s * 1.05;
    const fy = headY + Math.sin(ang * 1.7) * f.rad * s * 0.45 + Math.sin(t * 3 + f.ph) * 0.12 * s;
    c.fillStyle = 'rgba(25,25,25,0.85)';
    c.beginPath();
    c.arc(fx, fy, 0.035 * s + 1, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.5)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(fx, fy - 2);
    c.lineTo(fx - 4, fy - 7);
    c.moveTo(fx, fy - 2);
    c.lineTo(fx + 4, fy - 7);
    c.stroke();
    c.strokeStyle = 'rgba(25,25,25,0.35)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(fx, fy);
    c.lineTo(fx + Math.cos(ang + 2.2) * 7, fy + Math.sin(ang + 2.2) * 5);
    c.stroke();
  }
}

function drawTargetBrackets(c, rect, alpha) {
  if (!rect) return;
  const { l, t, r, b } = rect;
  const len = Math.min(34, (r - l) * 0.16);
  c.save();
  c.globalAlpha = alpha;
  c.strokeStyle = '#ff5fa8';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(l, t + len); c.lineTo(l, t); c.lineTo(l + len, t);
  c.moveTo(r - len, t); c.lineTo(r, t); c.lineTo(r, t + len);
  c.moveTo(r, b - len); c.lineTo(r, b); c.lineTo(r - len, b);
  c.moveTo(l + len, b); c.lineTo(l, b); c.lineTo(l, b - len);
  c.stroke();
  c.restore();
}

function drawBubble(c, x, y, text, fs, fill, ink, rot) {
  c.save();
  c.translate(x, y);
  if (rot) c.rotate(rot);
  c.font = '900 ' + fs.toFixed(1) + 'px "Trebuchet MS", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.lineWidth = fs * 0.22;
  c.strokeStyle = ink;
  c.strokeText(text, 0, 0);
  c.fillStyle = fill;
  c.fillText(text, 0, 0);
  c.restore();
}

function drawCaption(c, W, y, main, sub, alpha, mainCol) {
  if (alpha <= 0.01) return;
  const fs = clamp(W * 0.042, 20, 52);
  c.save();
  c.globalAlpha = alpha;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.lineJoin = 'round';
  c.font = '900 ' + fs.toFixed(1) + 'px "Trebuchet MS", system-ui, sans-serif';
  c.lineWidth = fs * 0.2;
  c.strokeStyle = 'rgba(18,10,18,0.9)';
  c.strokeText(main, W / 2, y);
  c.fillStyle = mainCol || '#ffe8f3';
  c.fillText(main, W / 2, y);
  if (sub) {
    const ss = fs * 0.42;
    c.font = '700 ' + ss.toFixed(1) + 'px "Trebuchet MS", system-ui, sans-serif';
    c.lineWidth = ss * 0.3;
    c.strokeStyle = 'rgba(18,10,18,0.9)';
    c.strokeText(sub, W / 2, y + fs * 0.82);
    c.fillStyle = '#bfe9ff';
    c.fillText(sub, W / 2, y + fs * 0.82);
  }
  c.restore();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  c.clearRect(0, 0, W, H);
  if (!S) init(ctx);

  const sound = (key, cond, fn) => {
    if (cond && !S.fired[key]) {
      S.fired[key] = true;
      try { fn(); } catch (e) { /* audio is best effort */ }
    }
  };

  const s = clamp(Math.min(W * 0.085, H * 0.15), 30, 120);
  const st = ctx.streamer;
  let aimX;
  let aimY;
  let cam = null;
  if (st) {
    const l = st.x * W;
    const tp = st.y * H;
    const rw = st.w * W;
    const rh = st.h * H;
    cam = { l, t: tp, r: l + rw, b: tp + rh };
    aimX = l + rw * 0.5;
    aimY = tp + rh * 0.8;
  } else {
    aimX = W * 0.55;
    aimY = H * 0.66;
  }
  const groundY = clamp(aimY + s * 1.0, H * 0.5, H * 0.94);
  const stopX = clamp(aimX - s * 2.5, s * 1.5, W * 0.82);

  // motion
  let dogX;
  let sx = 1;
  let bob = 0;
  let walk = 0;
  if (t < T.trotEnd) {
    const u = clamp(t / T.trotEnd, 0, 1);
    dogX = -s * 3.2 + (stopX + s * 3.2) * easeOutCubic(u);
    walk = t * 12;
    bob = Math.abs(Math.sin(walk)) * 0.05 * s;
  } else if (t < T.run) {
    dogX = stopX + Math.sin((t - T.trotEnd) * 1.7) * s * 0.1;
  } else {
    const u = clamp((t - T.run) / (T.end - T.run), 0, 1);
    dogX = stopX - (stopX + s * 4.5) * easeInQuad(u);
    walk = (t - T.run) * 17;
    bob = Math.abs(Math.sin(walk)) * 0.08 * s;
  }

  if (t < T.sniffEnd) {
    sx = 1;
  } else if (t < T.turnEnd) {
    sx = 1 - 2 * smooth((t - T.sniffEnd) / (T.turnEnd - T.sniffEnd));
  } else {
    sx = -1;
  }

  const sniffing = t > T.trotEnd - 0.4 && t < T.sniffEnd;
  const sniff = sniffing ? 0.55 + 0.45 * Math.sin((t - T.trotEnd) * 5.5) : 0;
  const legLift = t < T.peeStart + 0.15
    ? 0
    : t < T.peeStart + 0.55
      ? smooth((t - T.peeStart - 0.15) / 0.4)
      : t < T.peeEnd
        ? 1
        : 1 - smooth((t - T.peeEnd) / 0.3);

  const barking = t > T.bark && t < T.bark + 0.5;
  const laughing = t > T.laugh && t < T.run + 0.4;
  const mouth = barking
    ? 0.6 + 0.4 * Math.abs(Math.sin(t * 22))
    : laughing
      ? 0.55 + 0.45 * Math.abs(Math.sin(t * 15))
      : 0;
  const headShake = laughing ? Math.sin(t * 17) * 0.12 : 0;

  // sounds
  sound('sniff1', t > 3.8, () => ctx.sound.noise(140));
  sound('sniff2', t > 4.5, () => ctx.sound.noise(140));
  sound('sniff3', t > 5.2, () => ctx.sound.noise(140));
  sound('turn', t > T.sniffEnd, () => ctx.sound.noise(240));
  sound('pee', t > T.peeStart + 0.4, () => ctx.sound.noise(900));
  for (let i = 0; i < 7; i++) {
    sound('drip' + i, t > T.peeStart + 0.8 + i * 0.45, () => ctx.sound.beep(1300 + i * 60, 45));
  }
  sound('bark1', t > T.bark, () => ctx.sound.beep(240, 110));
  sound('bark2', t > T.bark + 0.2, () => ctx.sound.beep(175, 150));
  sound('fart1', t > T.fart, () => ctx.sound.noise(280));
  sound('fart2', t > T.fart + 0.08, () => ctx.sound.beep(62, 320));
  for (let i = 0; i < 5; i++) {
    sound('laugh' + i, t > T.laugh + i * 0.22, () => ctx.sound.beep(430 - i * 45, 70));
  }
  sound('run', t > T.run, () => ctx.sound.noise(280));

  // target brackets on the real camera
  if (cam && t > 4.3 && t < T.peeStart + 0.2) {
    drawTargetBrackets(c, cam, 0.45 + 0.35 * Math.sin(t * 9));
  }

  // growing puddle at the streamer's feet
  if (t > T.peeStart + 0.5) {
    const g = clamp((t - T.peeStart - 0.5) / 2.6, 0, 1);
    const pr = s * (0.35 + 1.25 * easeOutCubic(g));
    c.save();
    c.fillStyle = 'rgba(240,200,70,0.32)';
    c.beginPath();
    c.ellipse(aimX, groundY + 0.03 * s, pr, pr * 0.28, 0, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = 'rgba(255,235,140,0.5)';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(aimX - pr * 0.25, groundY + 0.01 * s, pr * 0.3, pr * 0.08, 0, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  // the dog
  drawDog(c, {
    dogX,
    groundY,
    s,
    sx,
    bob,
    walk,
    sniff,
    headShake,
    mouth,
    legLift,
    tailWag: t * (laughing ? 14 : 5.5),
  });

  // sniff puffs at the ground ahead of the muzzle
  if (sniffing && Math.abs(sx) > 0.7) {
    for (let i = 0; i < 3; i++) {
      const ph = (t * 1.7 + i / 3) % 1;
      const px = dogX + sx * (1.55 + ph * 0.5) * s;
      const py = groundY - 0.08 * s - ph * 0.12 * s;
      c.strokeStyle = 'rgba(255,255,255,' + (0.4 * (1 - ph)) + ')';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(px, py, (0.1 + ph * 0.35) * s, 0, Math.PI * 2);
      c.stroke();
    }
  }

  // pee stream
  if (t > T.peeStart && t < T.peeEnd + 0.9) {
    const nozzle = { x: dogX - sx * 0.95 * s, y: groundY - 0.75 * s };
    const ctrl = {
      x: (nozzle.x + aimX) / 2 + (aimX - nozzle.x) * 0.08,
      y: Math.min(nozzle.y, aimY) - 0.55 * s,
    };
    const local = Math.max(0, t - T.peeStart);
    const head = clamp(local / 0.55, 0, 1);
    const stopPeeing = t > T.peeEnd ? clamp(1 - (t - T.peeEnd) / 0.35, 0, 1) : 1;

    c.save();
    c.globalAlpha = stopPeeing;
    // main stream
    c.strokeStyle = 'rgba(250,205,60,0.8)';
    c.lineWidth = 0.055 * s;
    c.lineCap = 'round';
    c.beginPath();
    const N = 18;
    for (let i = 0; i <= N; i++) {
      const u = (head * i) / N;
      const p = bezPoint(nozzle, ctrl, { x: aimX, y: aimY }, u);
      if (i === 0) c.moveTo(p.x, p.y);
      else c.lineTo(p.x, p.y);
    }
    c.stroke();
    c.strokeStyle = 'rgba(255,245,170,0.55)';
    c.lineWidth = 0.02 * s;
    c.stroke();

    // droplets
    for (let i = 0; i < S.drops.length; i++) {
      const d = S.drops[i];
      const u = (d.p + local * d.sp * 1.25) % 1;
      if (u > head) continue;
      const p = bezPoint(nozzle, ctrl, { x: aimX, y: aimY }, u);
      const wiggle = Math.sin(u * 18 + d.off * 4) * 0.05 * s;
      c.fillStyle = 'rgba(255,215,70,0.9)';
      c.beginPath();
      c.arc(p.x, p.y + wiggle, d.rad + (u > 0.85 ? 0.6 : 0), 0, Math.PI * 2);
      c.fill();
    }

    // splash at the victim
    if (head > 0.9) {
      const ft = t - T.peeStart;
      c.strokeStyle = 'rgba(255,240,150,0.55)';
      c.lineWidth = 2;
      for (let i = 0; i < S.drops.length; i++) {
        const d = S.drops[i];
        const ang = d.p * Math.PI * 2;
        const rr = (0.1 + ((ft * 0.9 + d.p) % 1) * 0.7) * s;
        const px = aimX + Math.cos(ang) * rr;
        const py = aimY + Math.sin(ang) * rr * 0.5 + 0.05 * s;
        c.globalAlpha = stopPeeing * (0.55 - ((ft * 0.9 + d.p) % 1) * 0.3);
        c.beginPath();
        c.arc(px, py, d.rad * 0.8 + 0.5, 0, Math.PI * 2);
        c.stroke();
      }
      c.globalAlpha = stopPeeing;
      // drips on the lower camera edge
      if (cam) {
        c.fillStyle = 'rgba(250,210,70,0.5)';
        for (let i = 0; i < 4; i++) {
          const dx = cam.l + (cam.r - cam.l) * (0.2 + i * 0.22);
          const dy = cam.b + ((t * 26 + i * 41) % 40);
          c.fillRect(dx, cam.b - 2, 3, Math.min(22, dy - cam.b + 8));
        }
      }
    }
    c.restore();
  }

  // fart cloud
  const ft = t - T.fart;
  if (ft > 0 && ft < 2.4) {
    const rearX = dogX - sx * 0.82 * s;
    const rearY = groundY - 0.9 * s;
    const u = clamp(ft / 1.5, 0, 1);
    c.save();
    for (let i = 0; i < S.farts.length; i++) {
      const p = S.farts[i];
      const px = rearX + (0.1 + p.x * 0.3) * s + u * s * 1.3;
      const py = rearY + (0.1 + p.y * 0.25) * s - u * s * 1.1 + Math.sin(ft * 2 + p.ph) * s * 0.07;
      const rad = (0.17 + p.r * 0.28) * s * (0.6 + u * 1.4);
      c.fillStyle = 'rgba(158,190,96,' + (0.5 * (1 - u)) + ')';
      c.beginPath();
      c.arc(px, py, rad, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = 'rgba(110,130,60,' + (0.35 * (1 - u)) + ')';
      c.beginPath();
      c.arc(px - rad * 0.2, py + rad * 0.15, rad * 0.55, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
    if (ft < 0.9) {
      drawBubble(c, rearX + s * 0.9, rearY - s * 0.55 - ft * s * 0.4, 'pffbt', clamp(s * 0.3, 14, 40), '#d6ff9a', '#1d2a10', -0.12);
    }
  }

  // barks
  if (barking) {
    const hx = dogX + sx * 1.5 * s;
    const hy = groundY - 1.9 * s;
    const pop = 1 + 0.15 * Math.sin(t * 24);
    drawBubble(c, hx, hy, 'WOOF!', clamp(s * 0.34 * pop, 16, 46), '#ffffff', '#241a12', 0.06);
  }

  // laughing
  if (laughing) {
    const hx = dogX + sx * 0.6 * s;
    const hy = groundY - 2.2 * s + Math.sin(t * 9) * 0.08 * s;
    drawBubble(c, hx, hy, 'HEH HEH HEH', clamp(s * 0.24, 12, 34), '#ffe6a0', '#241a12', Math.sin(t * 4) * 0.05);
  }

  // flies
  const headX = dogX + sx * 1.35 * s;
  const headY = groundY - 1.55 * s;
  drawFlies(c, W, H, s, headX, headY, t);

  // caption band
  const capY = cam && cam.t < H * 0.32 ? H * 0.9 : H * 0.13;
  const caps = [
    [0.6, 3.4, 'A COMPLETELY NORMAL DOG ENTERS', 'He has seen better days.', '#ffe8f3'],
    [3.4, 6.15, 'SNIFFING FOR A SUITABLE TARGET', 'SavorySailor, do not move.', '#ffe8f3'],
    [6.15, 7.7, 'TARGET ACQUIRED', 'It is you. It was always you.', '#ff8cc6'],
    [7.7, 10.35, 'SAVORYSAILOR HAS BEEN CLAIMED', 'By a dog. With a bladder.', '#ff8cc6'],
    [10.35, 11.8, 'THE DOG BARKS IN TRIUMPH', 'He has earned this.', '#ffe8f3'],
    [11.8, 13.0, 'AND NOW, THE FINAL INSULT', 'Nobody asked for this.', '#d6ff9a'],
    [13.0, 15.2, 'HE LEAVES. HE IS LAUGHING.', 'Goodbye, mangy king.', '#ffe8f3'],
  ];
  for (let i = 0; i < caps.length; i++) {
    const cp = caps[i];
    if (t >= cp[0] && t < cp[1]) {
      const a = clamp((t - cp[0]) / 0.22, 0, 1) * clamp((cp[1] - t) / 0.2, 0, 1);
      drawCaption(c, W, capY, cp[2], cp[3], a, cp[4]);
      break;
    }
  }

  if (t >= T.end && !S.fired.done) {
    S.fired.done = true;
    try { ctx.done(); } catch (e) { /* host may already be tearing down */ }
  }
}

export function dispose(ctx) {
  S = null;
}
