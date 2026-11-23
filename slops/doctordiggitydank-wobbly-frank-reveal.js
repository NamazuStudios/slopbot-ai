export const meta = {
  title: 'Wobbly Frank Reveal',
  author: 'doctordiggitydank',
  prompt: 'A blond girl named Cooter walks onto the screen wearing a dress, lifts it to reveal a wobbly hotdog with no bun, and rubs it on the streamer.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const STREAMER_NAME = 'SavorySailor';

let S = { hit: Object.create(null), ended: false };

export function init(ctx) {
  S = { hit: Object.create(null), ended: false };
}

const T = {
  WALK_START: 0.2,
  WALK_END: 3.6,
  REVEAL: 5.0,
  REVEAL_POP: 5.5,
  DANCE: 6.0,
  RUB_START: 12.2,
  RUB_END: 14.9,
  FINALE: 15.0,
  END: 16.4,
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function easeInOut(p) { return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2; }
function smooth(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }
function lerp(a, b, p) { return a + (b - a) * p; }

function captionTarget(ctx) {
  const W = ctx.width, H = ctx.height;
  const st = ctx.streamer;
  let x = W / 2, y = H * 0.1;
  if (st) {
    const top = st.y * H, bottom = (st.y + st.h) * H;
    if (top < H * 0.16) y = bottom + (H - bottom) * 0.34;
  }
  return { x, y };
}

function caption(g, text, ctx, s, alpha, accent) {
  if (alpha <= 0.01) return;
  const W = ctx.width;
  const pos = captionTarget(ctx);
  const size = Math.round(clamp(W * 0.028, 20, 42));
  g.save();
  g.globalAlpha = alpha;
  g.font = `800 ${size}px "Trebuchet MS", "Segoe UI", sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = Math.round(size * 0.28);
  g.strokeStyle = 'rgba(20,10,30,0.92)';
  g.strokeText(text, clamp(pos.x, 40, W - 40), pos.y);
  g.fillStyle = accent || '#ffffff';
  g.fillText(text, clamp(pos.x, 40, W - 40), pos.y);
  g.restore();
}

function drawCooter(g, ctx, s, cx, feetY, t, hemLift, showHotdog, rubPhase, faceLocal, accent) {
  const skin = '#f3c8a2';
  const skinShade = '#dfa97f';
  const hair = '#f0cf6d';
  const hairShade = '#d4b04a';
  const ink = '#2a1a2e';

  g.save();
  g.translate(cx, feetY);
  g.scale(s, s);

  const shimmy = Math.sin(t * 8.2) * 0.045 + (rubPhase > 0 ? Math.sin(t * 13) * 0.03 : 0);
  g.rotate(shimmy);

  // ground shadow
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath();
  g.ellipse(0, 6, 118, 16, 0, 0, Math.PI * 2);
  g.fill();

  // legs
  const legSway = Math.sin(t * 5.4) * 14 * (t < T.WALK_END ? 1 : 0.35);
  g.lineCap = 'round';
  g.strokeStyle = ink;
  g.lineWidth = 30;
  g.beginPath();
  g.moveTo(-34, -150);
  g.lineTo(-40 + legSway * 0.4, -10);
  g.moveTo(34, -150);
  g.lineTo(40 - legSway * 0.4, -10);
  g.stroke();
  g.strokeStyle = skin;
  g.lineWidth = 23;
  g.beginPath();
  g.moveTo(-34, -150);
  g.lineTo(-40 + legSway * 0.4, -10);
  g.moveTo(34, -150);
  g.lineTo(40 - legSway * 0.4, -10);
  g.stroke();

  // shoes
  g.fillStyle = ink;
  g.beginPath();
  g.ellipse(-44 + legSway * 0.4, -4, 26, 13, 0, 0, Math.PI * 2);
  g.ellipse(44 - legSway * 0.4, -4, 26, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#7ad3e6';
  g.beginPath();
  g.ellipse(-48 + legSway * 0.4, -7, 16, 7, 0, 0, Math.PI * 2);
  g.ellipse(48 - legSway * 0.4, -7, 16, 7, 0, 0, Math.PI * 2);
  g.fill();

  // back hair
  g.fillStyle = hairShade;
  g.beginPath();
  g.ellipse(-54, -300, 30, 90, 0.12, 0, Math.PI * 2);
  g.ellipse(54, -300, 30, 90, -0.12, 0, Math.PI * 2);
  g.fill();

  // dress
  const hemR = 108;
  const hemRy = -140 - 78 * hemLift;
  const hemLx = -110;
  const hemLy = -140;

  g.beginPath();
  g.moveTo(-50, -338);
  g.lineTo(50, -338);
  g.quadraticCurveTo(80, -250, hemR, hemRy);
  g.quadraticCurveTo(0, -128 - 30 * hemLift, hemLx, hemLy);
  g.closePath();
  g.fillStyle = accent || '#ff5fa2';
  g.fill();
  g.lineWidth = 6;
  g.strokeStyle = ink;
  g.stroke();

  // dress fold / lift seam
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(-12, -320);
  g.quadraticCurveTo(-6, -240, -20 + 10 * hemLift, -150 - 20 * hemLift);
  g.stroke();
  g.beginPath();
  g.moveTo(26, -322);
  g.quadraticCurveTo(38, -250, 70, -150 - 50 * hemLift);
  g.stroke();

  // arms
  const handLx = -78, handLy = -222;
  const handRx = 92, handRy = -190 - 66 * hemLift;

  g.lineCap = 'round';
  g.strokeStyle = ink;
  g.lineWidth = 30;
  g.beginPath();
  g.moveTo(-52, -330);
  g.quadraticCurveTo(-84, -278, handLx, handLy);
  g.moveTo(52, -330);
  g.quadraticCurveTo(78, -262, handRx, handRy);
  g.stroke();
  g.strokeStyle = skin;
  g.lineWidth = 22;
  g.beginPath();
  g.moveTo(-52, -330);
  g.quadraticCurveTo(-84, -278, handLx, handLy);
  g.moveTo(52, -330);
  g.quadraticCurveTo(78, -262, handRx, handRy);
  g.stroke();

  // hands
  g.fillStyle = skin;
  g.beginPath();
  g.arc(handLx, handLy, 13, 0, Math.PI * 2);
  g.arc(handRx, handRy, 14, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = ink;
  g.stroke();

  // neck
  g.fillStyle = skinShade;
  g.fillRect(-14, -352, 28, 24);

  // head
  g.fillStyle = skin;
  g.beginPath();
  g.ellipse(0, -398, 48, 54, 0, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = ink;
  g.stroke();

  // hair cap
  g.fillStyle = hair;
  g.beginPath();
  g.ellipse(0, -422, 54, 42, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.strokeStyle = ink;
  g.lineWidth = 5;
  g.stroke();
  g.beginPath();
  g.ellipse(-46, -386, 18, 46, 0.15, 0, Math.PI * 2);
  g.ellipse(46, -386, 18, 46, -0.15, 0, Math.PI * 2);
  g.fillStyle = hair;
  g.fill();
  g.stroke();

  // face
  g.fillStyle = '#3a2233';
  const blink = (t % 4.2) < 0.13 ? 0.18 : 1;
  g.beginPath();
  g.ellipse(-17, -400, 5, 6.5 * blink, 0, 0, Math.PI * 2);
  g.ellipse(17, -400, 5, 6.5 * blink, 0, 0, Math.PI * 2);
  g.fill();

  // blush
  g.fillStyle = 'rgba(255,110,150,0.35)';
  g.beginPath();
  g.ellipse(-31, -378, 10, 6, 0, 0, Math.PI * 2);
  g.ellipse(31, -378, 10, 6, 0, 0, Math.PI * 2);
  g.fill();

  // smile
  g.strokeStyle = '#3a2233';
  g.lineWidth = 4;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(0, -383, 15, 0.25, Math.PI - 0.25);
  g.stroke();

  // nose
  g.strokeStyle = skinShade;
  g.lineWidth = 4;
  g.beginPath();
  g.moveTo(1, -389);
  g.lineTo(-3, -381);
  g.stroke();

  // hotdog
  if (showHotdog) {
    let bx = 18, by = -208;
    let len = 152;
    let ang, bend;

    if (rubPhase > 0 && faceLocal) {
      const tx = faceLocal.x, ty = faceLocal.y;
      ang = Math.atan2(tx - bx, ty - by);
      const dist = Math.hypot(tx - bx, ty - by);
      len = clamp(dist - 12, 110, 560);
      ang += Math.sin(t * 15) * 0.09 * rubPhase;
      bend = Math.sin(t * 17) * 16 * rubPhase;
    } else {
      ang = 0.42 + Math.sin(t * 7.4) * 0.42;
      bend = Math.sin(t * 9.1) * 34;
      len = 152 + Math.sin(t * 6.1) * 10;
    }

    drawHotdog(g, bx, by, ang, bend, len, t);

    // hand riding the hem during reveal
  }

  g.restore();
}

function drawHotdog(g, bx, by, ang, bend, len, t) {
  const ink = '#2a1a2e';
  const dx = Math.sin(ang), dy = Math.cos(ang);
  const tx = bx + dx * len;
  const ty = by + dy * len;
  const mx = (bx + tx) / 2 + Math.cos(ang) * bend;
  const my = (by + ty) / 2 - Math.sin(ang) * bend;

  function path() {
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(mx, my, tx, ty);
  }

  g.lineCap = 'round';
  path();
  g.lineWidth = 58;
  g.strokeStyle = ink;
  g.stroke();

  path();
  g.lineWidth = 46;
  g.strokeStyle = '#b5542a';
  g.stroke();

  // highlight
  g.save();
  g.globalAlpha = 0.22;
  path();
  g.lineWidth = 16;
  g.strokeStyle = '#ffd9b0';
  g.translate(-6, -4);
  g.stroke();
  g.restore();

  // mustard squiggle
  g.strokeStyle = '#f6c945';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const px = (1 - u) * (1 - u) * bx + 2 * (1 - u) * u * mx + u * u * tx;
    const py = (1 - u) * (1 - u) * by + 2 * (1 - u) * u * my + u * u * ty;
    const off = Math.sin(u * Math.PI * 6 + t * 2) * 9;
    const ox = Math.cos(ang) * off;
    const oy = -Math.sin(ang) * off;
    if (i === 0) g.moveTo(px + ox, py + oy);
    else g.lineTo(px + ox, py + oy);
  }
  g.stroke();

  // little face on the tip
  const backU = 0.86;
  const fx = (1 - backU) * (1 - backU) * bx + 2 * (1 - backU) * backU * mx + backU * backU * tx;
  const fy = (1 - backU) * (1 - backU) * by + 2 * (1 - backU) * backU * my + backU * backU * ty;
  const px = Math.cos(ang), py = -Math.sin(ang);

  g.fillStyle = '#fff8f0';
  g.beginPath();
  g.ellipse(fx + px * 9, fy + py * 9, 7, 9, ang, 0, Math.PI * 2);
  g.ellipse(fx - px * 9, fy - py * 9, 7, 9, ang, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#241224';
  g.beginPath();
  g.arc(fx + px * 9 + dx * 2, fy + py * 9 + dy * 2, 3.4, 0, Math.PI * 2);
  g.arc(fx - px * 9 + dx * 2, fy - py * 9 + dy * 2, 3.4, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = '#241224';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(fx + dx * 5, fy + dy * 5, 7, 0.3, Math.PI - 0.3);
  g.stroke();
}

function drawRevealBurst(g, ctx, x, y, p, s) {
  if (p <= 0 || p >= 1) return;
  g.save();
  g.translate(x, y);
  g.globalAlpha = 1 - p;
  const n = 12;
  g.strokeStyle = '#ffd94a';
  g.lineWidth = 8 * (1 - p) + 2;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + p * 0.8;
    const r0 = 22 + p * 90 * s;
    const r1 = r0 + 34 * s * (1 - p);
    g.beginPath();
    g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
    g.stroke();
  }
  g.restore();
}

function drawRubEffects(g, ctx, faceX, faceY, t, p, s) {
  if (p <= 0) return;
  g.save();

  // mustard dabs near the streamer's face, kept to the edges
  for (let i = 0; i < 5; i++) {
    const a = i * 1.7 + t * 1.4;
    const r = (72 + i * 11) * s;
    const x = faceX + Math.cos(a) * r;
    const y = faceY + Math.sin(a) * r * 0.7;
    g.globalAlpha = clamp(p, 0, 1) * 0.85;
    g.fillStyle = '#f6c945';
    g.beginPath();
    g.ellipse(x, y, (7 + (i % 3) * 4) * s, (5 + (i % 2) * 4) * s, a, 0, Math.PI * 2);
    g.fill();
  }

  // starbursts
  g.globalAlpha = clamp(p, 0, 1);
  g.strokeStyle = '#fff2a8';
  g.lineWidth = 4 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t * 3;
    const r = (70 + Math.sin(t * 9 + i) * 14) * s;
    const x = faceX + Math.cos(a) * r;
    const y = faceY + Math.sin(a) * r;
    g.beginPath();
    g.moveTo(x - 7 * s, y);
    g.lineTo(x + 7 * s, y);
    g.moveTo(x, y - 7 * s);
    g.lineTo(x, y + 7 * s);
    g.stroke();
  }
  g.restore();
}

function drawMusicNotes(g, ctx, cx, feetY, t, s, accent) {
  const start = T.DANCE;
  if (t < start || t > T.RUB_END) return;
  g.save();
  g.font = `700 ${Math.round(30 * s)}px "Trebuchet MS", sans-serif`;
  g.textAlign = 'center';
  for (let i = 0; i < 7; i++) {
    const born = start + i * 0.9;
    const age = t - born;
    if (age < 0 || age > 2.4) continue;
    const x = cx + Math.sin(i * 2.1 + age * 2) * 130 * s;
    const y = feetY - 250 * s - age * 80 * s;
    g.globalAlpha = clamp(1 - age / 2.4, 0, 1);
    g.fillStyle = i % 2 ? accent : '#ffe27a';
    g.fillText(i % 2 ? '♪' : '♫', x, y);
  }
  g.restore();
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width, H = ctx.height;
  g.clearRect(0, 0, W, H);

  const s = Math.min(W, H) / 720;
  const accent = ctx.accent || '#ff5fa2';

  const once = (key, at, fn) => {
    if (t >= at && !S.hit[key]) { S.hit[key] = 1; fn(); }
  };

  // where the real SavorySailor sits
  const st = ctx.streamer;
  let faceX = W * 0.72, faceY = H * 0.36;
  if (st) {
    faceX = (st.x + st.w * 0.5) * W;
    faceY = (st.y + st.h * 0.34) * H;
  }
  faceX = clamp(faceX, W * 0.12, W * 0.88);
  faceY = clamp(faceY, H * 0.16, H * 0.8);

  // where Cooter stands
  let targetX = W * 0.36;
  if (st) {
    const left = st.x * W, right = (st.x + st.w) * W;
    const center = (left + right) / 2;
    targetX = center < W / 2 ? right + 150 * s : left - 150 * s;
  }
  targetX = clamp(targetX, W * 0.14, W * 0.86);

  const startX = -W * 0.2;
  const walkP = smooth((t - T.WALK_START) / (T.WALK_END - T.WALK_START));
  const cx = lerp(startX, targetX, walkP);
  const walking = t < T.WALK_END;

  let feetY = H * 0.9;
  if (walking) feetY -= Math.abs(Math.sin(t * 8.4)) * 10 * s;
  else if (t > T.DANCE && t < T.RUB_END) feetY -= Math.abs(Math.sin(t * 6.2)) * 8 * s;

  const hemLift = smooth((t - (T.REVEAL - 0.4)) / 0.9);
  const showHotdog = t >= T.REVEAL;
  const rubP = smooth((t - T.RUB_START) / 0.7) * (1 - smooth((t - T.RUB_END) / 0.5));

  // convert the streamer's face into Cooter's local coordinates for the lunge
  const faceLocal = {
    x: (faceX - cx) / s,
    y: (faceY - feetY) / s,
  };

  drawCooter(g, ctx, s, cx, feetY, t, hemLift, showHotdog, rubP, faceLocal, accent);
  drawMusicNotes(g, ctx, cx, feetY, t, s, accent);
  drawRubEffects(g, ctx, faceX, faceY, t, rubP, s);

  // reveal burst
  const burstP = clamp((t - T.REVEAL_POP) / 0.9, 0, 1);
  if (burstP > 0 && burstP < 1) {
    drawRevealBurst(g, ctx, cx + 40 * s, feetY - 300 * s, burstP, s);
  }

  // captions
  const caps = [
    [0.6, 3.8, 'COOTER HAS ENTERED THE FRAME. NO APPOINTMENT.'],
    [5.1, 7.7, 'SHE BROUGHT A HOTDOG. THE BUN DID NOT MAKE THE CUT.'],
    [7.9, 11.9, 'THE WOBBLE IS LOAD-BEARING. DO NOT ADJUST IT.'],
    [12.3, 14.8, `EXTRA MUSTARD FOR ${STREAMER_NAME.toUpperCase()}.`],
    [15.1, 16.4, 'NO BUN. NO NOTES. FRANKED.'],
  ];
  for (const [a, b, text] of caps) {
    if (t >= a && t <= b) {
      const fade = Math.min(1, (t - a) / 0.25, (b - t) / 0.25);
      caption(g, text, ctx, s, fade, '#ffffff');
    }
  }

  // soundtrack
  once('step1', 0.6, () => ctx.sound.beep(150, 55));
  once('step2', 1.2, () => ctx.sound.beep(170, 55));
  once('step3', 1.9, () => ctx.sound.beep(150, 55));
  once('step4', 2.6, () => ctx.sound.beep(170, 55));
  once('step5', 3.3, () => ctx.sound.beep(150, 55));

  once('lift', 4.7, () => ctx.sound.noise(90));
  once('pop', 5.5, () => { ctx.sound.noise(140); ctx.sound.beep(920, 100); ctx.sound.beep(1240, 90); });

  for (let i = 0; i < 12; i++) {
    once('beat' + i, T.DANCE + i * 0.5, () => {
      ctx.sound.beep(200 + (i % 4) * 90, 75);
      if (i % 4 === 0) ctx.sound.noise(45);
    });
  }

  once('wig1', 8.2, () => ctx.sound.beep(880, 55));
  once('wig2', 9.4, () => ctx.sound.beep(1020, 55));
  once('wig3', 10.7, () => ctx.sound.beep(760, 55));

  once('rub1', 12.5, () => ctx.sound.noise(80));
  once('rub2', 13.1, () => ctx.sound.beep(960, 60));
  once('rub3', 13.6, () => ctx.sound.beep(1150, 60));
  once('rub4', 14.3, () => { ctx.sound.noise(180); ctx.sound.beep(640, 70); });

  once('fin1', 15.2, () => ctx.sound.beep(660, 110));
  once('fin2', 15.4, () => ctx.sound.beep(520, 110));
  once('fin3', 15.6, () => ctx.sound.beep(390, 140));
  once('fin4', 15.85, () => { ctx.sound.beep(260, 220); ctx.sound.noise(120); });

  if (t >= T.END && !S.ended) {
    S.ended = true;
    ctx.done();
  }
}

export function dispose(ctx) {}
