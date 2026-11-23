export const meta = {
  title: 'Wobbly Wet Frank',
  author: 'doctordiggitydank',
  prompt: 'update wobbly-frank-reveal to layer the hotdog behind the dress, make the hotdog wet, and smear mayonnaise on the streamer',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const STREAMER_NAME = 'SavorySailor';

let S = { hit: Object.create(null), ended: false, blobs: [] };

export function init(ctx) {
  S = { hit: Object.create(null), ended: false, blobs: [] };
  for (let i = 0; i < 30; i++) {
    S.blobs.push({
      x: ctx.rand(),
      y: ctx.rand(),
      rx: 0.055 + ctx.rand() * 0.11,
      ry: 0.05 + ctx.rand() * 0.1,
      rot: (ctx.rand() - 0.5) * 1.3,
      at: ctx.rand() * 0.55,
      drip: ctx.rand() < 0.45 ? 0.25 + ctx.rand() * 0.85 : 0,
      shine: ctx.rand(),
    });
  }
}

const T = {
  WALK_START: 0.2,
  WALK_END: 3.4,
  REVEAL: 4.6,
  REVEAL_POP: 5.2,
  DANCE: 5.6,
  REACH_START: 8.6,
  CONTACT: 11.0,
  RUB_END: 14.6,
  END: 17.2,
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, p) { return a + (b - a) * p; }
function smooth(p) { p = clamp(p, 0, 1); return p * p * (3 - 2 * p); }

function streamerZone(ctx, s) {
  const W = ctx.width, H = ctx.height, st = ctx.streamer;
  if (st) {
    return { x: st.x * W, y: st.y * H, w: st.w * W, h: st.h * H };
  }
  const w = Math.min(W * 0.34, 620 * s);
  const h = w * 0.8;
  return { x: W * 0.62 - w / 2, y: H * 0.12, w, h };
}

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

function drawCooter(g, ctx, s, cx, feetY, t, hemLift, showHotdog, reachP, rubP, faceLocal, accent) {
  const skin = '#f3c8a2';
  const skinShade = '#dfa97f';
  const hair = '#f0cf6d';
  const hairShade = '#d4b04a';
  const ink = '#2a1a2e';

  g.save();
  g.translate(cx, feetY);
  g.scale(s, s);

  const shimmy = Math.sin(t * 8.2) * 0.045 + (rubP > 0 ? Math.sin(t * 13) * 0.03 : 0);
  g.rotate(shimmy);

  // ground shadow plus a suspiciously damp ring
  g.fillStyle = 'rgba(0,0,0,0.22)';
  g.beginPath();
  g.ellipse(0, 6, 118, 16, 0, 0, Math.PI * 2);
  g.fill();
  if (showHotdog) {
    g.fillStyle = 'rgba(190,235,255,0.18)';
    g.beginPath();
    g.ellipse(6, 8, 74 + Math.sin(t * 2) * 4, 13, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = 'rgba(225,248,255,0.35)';
    g.lineWidth = 2;
    g.stroke();
  }

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

  // ---- THE FRANK LIVES BEHIND THE DRESS NOW ----
  if (showHotdog) {
    const bx = 46, by = -168;
    const dist = Math.hypot(faceLocal.x - bx, faceLocal.y - by);
    const baseAng = Math.atan2(faceLocal.x - bx, faceLocal.y - by);
    const retract = smooth((t - T.RUB_END - 0.2) / 1.4);

    const idleAng = 0.95 + Math.sin(t * 6.4) * 0.24;
    const idleLen = 152 + Math.sin(t * 6.1) * 9;

    const reachAng = baseAng + Math.sin(t * 15) * 0.07 * rubP + Math.sin(t * 2.2) * 0.06 * (1 - reachP);
    const len = lerp(idleLen, dist + 8, smooth(reachP)) * (1 - 0.86 * retract);
    const ang = lerp(idleAng, reachAng, smooth(reachP * 1.15));
    const bend = Math.sin(t * 9.1) * 30 * (1 - reachP) + Math.sin(t * 17) * 15 * rubP;

    drawHotdog(g, bx, by, ang, bend, len, t, rubP);
  }

  // dress (drawn OVER the frank, as requested, by law, by prompt)
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

  g.restore();
}

function drawHotdog(g, bx, by, ang, bend, len, t, rubP) {
  const ink = '#2a1a2e';
  const dx = Math.sin(ang), dy = Math.cos(ang);
  const nx = Math.cos(ang), ny = -Math.sin(ang);
  const tx = bx + dx * len;
  const ty = by + dy * len;
  const mx = (bx + tx) / 2 + nx * bend;
  const my = (by + ty) / 2 + ny * bend;

  function point(u) {
    const a = (1 - u) * (1 - u), b = 2 * (1 - u) * u, c = u * u;
    return { x: a * bx + b * mx + c * tx, y: a * by + b * my + c * ty };
  }
  function path() {
    g.beginPath();
    g.moveTo(bx, by);
    g.quadraticCurveTo(mx, my, tx, ty);
  }

  // wet halo
  g.lineCap = 'round';
  path();
  g.lineWidth = 62;
  g.strokeStyle = 'rgba(150,232,255,0.22)';
  g.stroke();

  // outline + meat
  path();
  g.lineWidth = 58;
  g.strokeStyle = ink;
  g.stroke();

  path();
  g.lineWidth = 46;
  g.strokeStyle = '#b5542a';
  g.stroke();

  // wet base sheen
  g.save();
  path();
  g.lineWidth = 20;
  g.strokeStyle = 'rgba(255,214,175,0.28)';
  g.translate(nx * 8, ny * 8);
  g.stroke();
  g.restore();

  // slimy specular streak
  g.save();
  path();
  g.lineWidth = 5;
  g.strokeStyle = 'rgba(235,252,255,0.7)';
  g.translate(nx * 14, ny * 14);
  g.stroke();
  g.restore();

  // wet beads clinging to the underside
  for (let i = 0; i < 7; i++) {
    const u = 0.14 + i * 0.115;
    const pw = point(u);
    const bob = Math.sin(t * 3.4 + i * 1.9) * 5;
    const off = 22 + bob;
    g.fillStyle = 'rgba(216,245,255,0.85)';
    g.beginPath();
    g.ellipse(pw.x - nx * off, pw.y - ny * off, 4.6, 3.2, ang, 0, Math.PI * 2);
    g.fill();
  }

  // dribbling drops, because wet means consequences
  for (let i = 0; i < 8; i++) {
    const phase = ((t - T.REVEAL) / 1.15 + i * 0.23) % 1;
    if (phase < 0) continue;
    const age = phase * 1.15;
    const u = 0.28 + ((i * 0.137) % 0.58);
    const pw = point(u);
    const fy = age * age * 420;
    const alpha = clamp(1 - age / 1.15, 0, 1);
    if (alpha <= 0) continue;
    g.fillStyle = `rgba(208,242,255,${(alpha * 0.8).toFixed(3)})`;
    g.beginPath();
    g.ellipse(pw.x - nx * 24 + Math.sin(t * 2 + i) * 6, pw.y - ny * 24 + fy, 4, 6.5, 0, 0, Math.PI * 2);
    g.fill();
  }

  // mustard squiggle
  g.strokeStyle = '#f6c945';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const pw = point(u);
    const off = Math.sin(u * Math.PI * 6 + t * 2) * 9;
    if (i === 0) g.moveTo(pw.x + nx * off, pw.y + ny * off);
    else g.lineTo(pw.x + nx * off, pw.y + ny * off);
  }
  g.stroke();

  // little face on the tip
  const backU = 0.8;
  const f = point(backU);
  const fx = f.x, fy = f.y;

  g.fillStyle = '#fff8f0';
  g.beginPath();
  g.ellipse(fx + nx * 9, fy + ny * 9, 7, 9, ang, 0, Math.PI * 2);
  g.ellipse(fx - nx * 9, fy - ny * 9, 7, 9, ang, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#241224';
  g.beginPath();
  g.arc(fx + nx * 9 + dx * 2, fy + ny * 9 + dy * 2, 3.4, 0, Math.PI * 2);
  g.arc(fx - nx * 9 + dx * 2, fy - ny * 9 + dy * 2, 3.4, 0, Math.PI * 2);
  g.fill();

  g.strokeStyle = '#241224';
  g.lineWidth = 3;
  g.beginPath();
  g.arc(fx + dx * 5, fy + dy * 5, 7, 0.3, Math.PI - 0.3);
  g.stroke();

  // mayo dollop perched on the very tip
  const dollop = 1 + rubP * 0.8;
  g.save();
  g.translate(tx + dx * 5, ty + dy * 5);
  g.rotate(ang);
  g.fillStyle = '#fdf9ea';
  g.beginPath();
  g.ellipse(0, 0, 19 * dollop, 14 * dollop, 0, 0, Math.PI * 2);
  g.ellipse(-3, -12 * dollop, 10 * dollop, 9 * dollop, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(255,255,255,0.95)';
  g.beginPath();
  g.ellipse(-6, -5 * dollop, 8 * dollop, 5 * dollop, -0.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = 'rgba(240,232,205,0.85)';
  g.beginPath();
  g.ellipse(2, 4 * dollop, 12 * dollop, 6 * dollop, 0.1, 0, Math.PI * 2);
  g.fill();
  g.restore();
}

function drawRevealBurst(g, ctx, x, y, p, s) {
  if (p <= 0 || p >= 1) return;
  g.save();
  g.translate(x, y);
  g.globalAlpha = 1 - p;
  const n = 12;
  g.strokeStyle = '#a9ecff';
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

function drawMayoSmear(g, ctx, p, t, s) {
  if (p <= 0.01) return;
  const W = ctx.width, H = ctx.height;
  const z = streamerZone(ctx, s);
  const fx = z.x + z.w * 0.14;
  const fy = z.y + z.h * 0.07;
  const fw = z.w * 0.72;
  const fh = z.h * 0.62;
  const coat = smooth(p / 0.7);

  g.save();
  g.beginPath();
  g.rect(z.x - z.w * 0.05, z.y - z.h * 0.05, z.w * 1.1, z.h * 1.42);
  g.clip();

  // thin overall coating so the smear reads as smeared, not dotted
  g.globalAlpha = 0.3 * coat;
  g.fillStyle = '#fdf9ea';
  g.beginPath();
  g.ellipse(fx + fw * 0.5, fy + fh * 0.48, fw * 0.52 * coat, fh * 0.56 * coat, 0.1, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;

  // fat drag streaks
  g.globalAlpha = 0.55 * coat;
  g.strokeStyle = '#fdf9ea';
  g.lineCap = 'round';
  const streaks = [
    [0.12, 0.3, 0.82, 0.24, 0.3],
    [0.5, 0.1, 0.3, 0.8, 0.5],
    [0.2, 0.62, 0.7, 0.15, 0.24],
  ];
  for (const [ax, ay, bx, by, wdt] of streaks) {
    g.lineWidth = fw * wdt * coat * 0.25;
    g.beginPath();
    g.moveTo(fx + ax * fw, fy + ay * fh);
    g.quadraticCurveTo(fx + (ax + bx) * 0.5 * fw, fy + (ay + by) * 0.5 * fh + fh * 0.06, fx + bx * fw, fy + by * fh);
    g.stroke();
  }
  g.globalAlpha = 1;

  // blobs
  for (const b of S.blobs) {
    const po = smooth((p - b.at) / 0.32);
    if (po <= 0) continue;
    const bx = fx + b.x * fw;
    const by = fy + b.y * fh;
    const rx = b.rx * fw * (0.35 + 0.65 * po);
    const ry = b.ry * fh * (0.35 + 0.65 * po);

    g.save();
    g.translate(bx, by);
    g.rotate(b.rot);
    g.fillStyle = 'rgba(232,220,188,0.9)';
    g.beginPath();
    g.ellipse(0, ry * 0.24, rx, ry, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(253,249,234,0.95)';
    g.beginPath();
    g.ellipse(0, 0, rx * 0.96, ry * 0.94, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.beginPath();
    g.ellipse(-rx * 0.24, -ry * 0.3, rx * 0.42, ry * 0.32, -0.4, 0, Math.PI * 2);
    g.fill();
    g.restore();

    if (b.drip > 0) {
      const dlen = b.drip * fh * (0.5 + 0.9 * po) * (0.7 + 0.3 * Math.sin(t * 1.6 + b.shine * 6));
      const dxr = bx + Math.sin(t * 1.1 + b.shine * 9) * 7;
      g.strokeStyle = 'rgba(253,249,234,0.92)';
      g.lineWidth = Math.max(5, rx * 0.5);
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(bx, by + ry * 0.4);
      g.quadraticCurveTo(dxr, by + ry * 0.4 + dlen * 0.55, dxr, by + ry * 0.4 + dlen);
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.95)';
      g.beginPath();
      g.arc(dxr, by + ry * 0.4 + dlen, Math.max(4, rx * 0.4), 0, Math.PI * 2);
      g.fill();
    }
  }

  // splatter specks around the edges
  for (let i = 0; i < 14; i++) {
    const po = smooth((p - 0.1 - i * 0.02) / 0.4);
    if (po <= 0) continue;
    const a = i * 2.3 + 1.1;
    const rad = (0.42 + (i % 4) * 0.09) * Math.min(fw, fh) * (0.6 + po * 0.6);
    const sx = fx + fw * 0.5 + Math.cos(a) * rad;
    const sy = fy + fh * 0.5 + Math.sin(a) * rad * 0.8;
    g.fillStyle = 'rgba(253,249,234,0.9)';
    g.beginPath();
    g.ellipse(sx, sy, (4 + (i % 3) * 3) * s, (3 + (i % 2) * 3) * s, a, 0, Math.PI * 2);
    g.fill();
  }

  g.restore();
}

function drawMayoImpact(g, ctx, t, s, contactX, contactY) {
  const age = t - T.CONTACT;
  if (age < 0 || age > 1.6) return;
  const p = age / 1.6;
  g.save();
  g.globalAlpha = clamp(1 - p, 0, 1);

  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = 10 * (1 - p) + 2;
  g.beginPath();
  g.arc(contactX, contactY, (26 + age * 210) * s, 0, Math.PI * 2);
  g.stroke();

  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.3;
    const dist = (40 + (i % 5) * 26) * s * (0.4 + age * 1.7);
    const x = contactX + Math.cos(a) * dist;
    const y = contactY + Math.sin(a) * dist + age * 55 * s * (i % 2 ? 1 : 0.45);
    const r = (5 + (i % 4) * 3) * s * (1 - p * 0.4);
    g.fillStyle = i % 3 ? 'rgba(253,249,234,0.95)' : 'rgba(255,255,255,0.95)';
    g.beginPath();
    g.ellipse(x, y, r * 1.3, r, a, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
}

function drawMusicNotes(g, ctx, cx, feetY, t, s, accent) {
  if (t < T.DANCE || t > T.RUB_END) return;
  g.save();
  g.font = `700 ${Math.round(30 * s)}px "Trebuchet MS", sans-serif`;
  g.textAlign = 'center';
  for (let i = 0; i < 7; i++) {
    const born = T.DANCE + i * 0.9;
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

  const zone = streamerZone(ctx, s);
  const faceX = clamp(zone.x + zone.w * 0.5, W * 0.12, W * 0.88);
  const faceY = clamp(zone.y + zone.h * 0.38, H * 0.16, H * 0.8);

  let targetX = W * 0.36;
  if (ctx.streamer) {
    const left = ctx.streamer.x * W, right = (ctx.streamer.x + ctx.streamer.w) * W;
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

  const hemLift = smooth((t - (T.REVEAL - 0.35)) / 0.9);
  const showHotdog = t >= T.REVEAL;
  const reachP = smooth((t - T.REACH_START) / (T.CONTACT - T.REACH_START));
  const rubP = smooth((t - T.CONTACT) / 0.4) * (1 - smooth((t - T.RUB_END) / 0.6));
  const smearP = smooth((t - T.CONTACT) / 0.5);

  const faceLocal = {
    x: (faceX - cx) / s,
    y: (faceY - feetY) / s,
  };

  drawCooter(g, ctx, s, cx, feetY, t, hemLift, showHotdog, reachP, rubP, faceLocal, accent);
  drawMusicNotes(g, ctx, cx, feetY, t, s, accent);

  drawMayoSmear(g, ctx, smearP, t, s);
  if (smearP > 0) drawMayoImpact(g, ctx, t, s, faceX, faceY);

  const burstP = clamp((t - T.REVEAL_POP) / 0.9, 0, 1);
  if (burstP > 0 && burstP < 1) {
    drawRevealBurst(g, ctx, cx + 40 * s, feetY - 300 * s, burstP, s);
  }

  const caps = [
    [0.6, 3.5, 'COOTER HAS ENTERED. SHE BROUGHT CONDIMENTS.'],
    [4.8, 7.6, 'THE FRANK NOW LIVES BEHIND THE DRESS.'],
    [7.8, 10.6, 'IT IS UNCOMFORTABLY WET.'],
    [11.0, 13.3, `CONTACT WITH ${STREAMER_NAME.toUpperCase()}. MAYO DEPLOYED.`],
    [13.5, 15.6, 'THAT IS MAYO. SAVORYSAILOR, THAT IS MAYO.'],
    [15.8, 17.2, "MAYO'D. STREAM MAY CONTINUE."],
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

  once('lift', 4.4, () => ctx.sound.noise(100));
  once('pop', 5.2, () => { ctx.sound.noise(140); ctx.sound.beep(900, 90); ctx.sound.beep(1240, 80); });
  once('wet1', 5.45, () => { ctx.sound.noise(190); ctx.sound.beep(300, 130); });
  once('wet2', 6.5, () => ctx.sound.noise(95));
  once('wet3', 7.4, () => { ctx.sound.noise(120); ctx.sound.beep(380, 90); });

  once('drip1', 6.1, () => ctx.sound.beep(1500, 40));
  once('drip2', 6.9, () => ctx.sound.beep(1720, 40));
  once('drip3', 7.7, () => ctx.sound.beep(1580, 40));
  once('drip4', 8.5, () => ctx.sound.beep(1800, 40));

  once('reach1', 9.2, () => ctx.sound.beep(500, 100));
  once('reach2', 10.0, () => ctx.sound.beep(700, 100));
  once('reach3', 10.6, () => ctx.sound.beep(900, 90));

  once('splat', 11.0, () => { ctx.sound.noise(260); ctx.sound.beep(210, 200); ctx.sound.beep(540, 150); });
  once('rub1', 11.5, () => { ctx.sound.noise(80); ctx.sound.beep(760, 55); });
  once('rub2', 12.1, () => { ctx.sound.noise(95); ctx.sound.beep(980, 55); });
  once('rub3', 12.7, () => { ctx.sound.noise(70); ctx.sound.beep(1180, 55); });
  once('rub4', 13.3, () => { ctx.sound.noise(100); ctx.sound.beep(880, 55); });
  once('rub5', 13.9, () => { ctx.sound.noise(85); ctx.sound.beep(1040, 55); });
  once('rub6', 14.4, () => { ctx.sound.noise(170); ctx.sound.beep(620, 90); });

  once('fin1', 15.2, () => ctx.sound.beep(660, 110));
  once('fin2', 15.45, () => ctx.sound.beep(520, 110));
  once('fin3', 15.7, () => ctx.sound.beep(390, 140));
  once('fin4', 16.0, () => { ctx.sound.noise(210); ctx.sound.beep(250, 240); });
  once('fin5', 16.55, () => ctx.sound.beep(180, 300));

  if (t >= T.END && !S.ended) {
    S.ended = true;
    ctx.done();
  }
}

export function dispose(ctx) {}
