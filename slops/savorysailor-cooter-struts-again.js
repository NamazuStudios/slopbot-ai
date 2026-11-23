export const meta = {
  title: 'Cooter Struts Again',
  author: 'savorysailor',
  prompt: 'cooter the prostitute again',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const C = {
  fur: '#9ba1b8',
  furDark: '#6b7190',
  mask: '#2a2e46',
  ink: '#161828',
  boa: '#ff5fa2',
  boaDark: '#d93a80',
  dress: '#ff3d8b',
  lips: '#ff2d78',
  gold: '#ffd166',
  cream: '#fff5e8',
  neon: '#ff6fc0',
  blue: '#5fa8ff',
  red: '#ff4d5e',
};

let st = null;

function P(x, y) {
  return { x, y };
}

function bez(a, b, c2, u) {
  const v = 1 - u;
  return {
    x: v * v * a.x + 2 * v * u * b.x + u * u * c2.x,
    y: v * v * a.y + 2 * v * u * b.y + u * u * c2.y,
  };
}

function easeOut(u) {
  u = Math.max(0, Math.min(1, u));
  return 1 - Math.pow(1 - u, 3);
}

function easeIn(u) {
  u = Math.max(0, Math.min(1, u));
  return u * u * u;
}

function clamp01(u) {
  return Math.max(0, Math.min(1, u));
}

export function init(ctx) {
  const W = ctx.width;
  const H = ctx.height;
  st = {
    W,
    H,
    sfx: new Set(),
    bills: [],
    hearts: [],
    sparks: [],
    kisses: [],
    nextBill: 0,
    stepPhase: 0,
    bolted: false,
    stamp: 0,
  };
}

function once(ctx, id, fn) {
  if (!st || st.sfx.has(id)) return;
  st.sfx.add(id);
  if (fn) fn();
}

function streamRect(ctx) {
  const s = ctx.streamer;
  if (s && s.w > 0 && s.h > 0) {
    return { x: s.x * ctx.width, y: s.y * ctx.height, w: s.w * ctx.width, h: s.h * ctx.height };
  }
  return {
    x: ctx.width * 0.64,
    y: ctx.height * 0.16,
    w: ctx.width * 0.28,
    h: ctx.height * 0.42,
  };
}

/* ---------- background furniture (glass, never opaque) ---------- */

function drawNeonSign(c, ctx, t) {
  const W = st.W;
  const H = st.H;
  const cx = W * 0.24;
  const cy = H * 0.145;
  const fs = Math.max(15, Math.min(W, H) * 0.052);
  const closing = t > 22.2;
  const flick = closing
    ? 0.35 + 0.18 * Math.abs(Math.sin(t * 13.0))
    : 0.82 + 0.18 * Math.abs(Math.sin(t * 31.0) * Math.sin(t * 7.7));
  const pulse = closing ? 0.4 : flick;
  const word = 'COOTER';

  c.save();
  c.translate(cx, cy);
  c.textAlign = 'center';
  c.textBaseline = 'middle';

  // dim backing panel, clearly a sign and not a backdrop
  const pw = fs * 5.2;
  const ph = fs * 1.9;
  c.globalAlpha = 0.22;
  c.fillStyle = '#0b0a16';
  c.beginPath();
  c.roundRect(-pw / 2, -ph / 2, pw, ph, fs * 0.35);
  c.fill();
  c.globalAlpha = 1;

  c.lineWidth = Math.max(1.5, fs * 0.045);
  c.strokeStyle = C.neon;
  c.globalAlpha = pulse * 0.85;
  c.beginPath();
  c.roundRect(-pw / 2, -ph / 2, pw, ph, fs * 0.35);
  c.stroke();
  c.globalAlpha = 1;

  c.font = `900 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
  c.shadowColor = C.neon;
  c.shadowBlur = fs * (closing ? 0.4 : 0.85);
  c.fillStyle = closing ? '#7a5870' : '#ffe3f2';
  c.globalAlpha = Math.max(0.28, pulse);
  c.fillText(closing ? 'CLOSED' : word, 0, -fs * 0.12);

  c.shadowBlur = fs * 0.35;
  c.fillStyle = C.neon;
  c.globalAlpha = Math.max(0.3, pulse * 0.95);
  c.font = `700 ${Math.round(fs * 0.3)}px "Trebuchet MS", "Segoe UI", sans-serif`;
  c.fillText(closing ? 'GONE FISHIN' : 'FINE COMPANIONSHIP', 0, fs * 0.62);
  c.restore();

  // marquee bulbs
  c.save();
  const bulbs = 9;
  for (let i = 0; i < bulbs; i++) {
    const a = Math.PI + (i / (bulbs - 1)) * Math.PI;
    const bx = cx + Math.cos(a) * pw * 0.52;
    const by = cy + Math.sin(a) * ph * 0.62;
    const on = Math.sin(t * 6 - i * 0.8) > -0.2 ? 1 : 0.25;
    c.globalAlpha = on * pulse;
    c.fillStyle = i % 2 ? C.gold : C.neon;
    c.beginPath();
    c.arc(bx, by, Math.max(1.6, fs * 0.05), 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawCorner(c, t) {
  const W = st.W;
  const H = st.H;
  const gy = H * 0.815;

  // lamp glow pool on the pavement
  c.save();
  const g = c.createRadialGradient(W * 0.36, gy, 0, W * 0.36, gy, W * 0.26);
  g.addColorStop(0, 'rgba(255,150,205,0.18)');
  g.addColorStop(0.55, 'rgba(255,95,162,0.07)');
  g.addColorStop(1, 'rgba(255,95,162,0)');
  c.fillStyle = g;
  c.beginPath();
  c.ellipse(W * 0.36, gy, W * 0.27, H * 0.075, 0, 0, Math.PI * 2);
  c.fill();

  // kerb line
  c.strokeStyle = 'rgba(255,225,240,0.28)';
  c.lineWidth = Math.max(1, H * 0.0022);
  c.beginPath();
  c.moveTo(W * 0.02, gy + H * 0.045);
  c.lineTo(W * 0.98, gy + H * 0.045);
  c.stroke();

  // lamp post
  c.strokeStyle = 'rgba(20,20,34,0.55)';
  c.lineWidth = Math.max(2, H * 0.006);
  c.beginPath();
  c.moveTo(W * 0.115, gy + H * 0.05);
  c.lineTo(W * 0.115, H * 0.36);
  c.quadraticCurveTo(W * 0.115, H * 0.30, W * 0.165, H * 0.30);
  c.stroke();
  c.fillStyle = 'rgba(255,220,160,0.85)';
  c.shadowColor = '#ffd28a';
  c.shadowBlur = H * 0.05;
  c.beginPath();
  c.ellipse(W * 0.168, H * 0.305, H * 0.012, H * 0.008, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function drawClientFrame(c, ctx, t) {
  const r = streamRect(ctx);
  const a = clamp01((t - 6.2) / 0.8) * clamp01((22.6 - t) / 0.7);
  if (a <= 0.01) return;
  const fs = Math.max(9, Math.min(st.W, st.H) * 0.014);
  c.save();
  c.globalAlpha = a * 0.8;
  c.strokeStyle = C.boa;
  c.lineWidth = Math.max(1.2, Math.min(st.W, st.H) * 0.0022);
  c.setLineDash([fs * 0.9, fs * 0.7]);
  c.strokeRect(r.x, r.y, r.w, r.h);
  c.setLineDash([]);
  c.fillStyle = C.boa;
  c.globalAlpha = a * 0.9;
  c.font = `800 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
  c.textAlign = 'left';
  c.textBaseline = 'bottom';
  c.fillText('CLIENT', r.x + 2, r.y - fs * 0.35);

  // corner ticks
  const tick = Math.min(r.w, r.h) * 0.11;
  c.lineWidth = Math.max(2, fs * 0.28);
  c.globalAlpha = a * 0.95;
  const corners = [
    [r.x, r.y, 1, 1],
    [r.x + r.w, r.y, -1, 1],
    [r.x, r.y + r.h, 1, -1],
    [r.x + r.w, r.y + r.h, -1, -1],
  ];
  for (const [x, y, sx, sy] of corners) {
    c.beginPath();
    c.moveTo(x + sx * tick, y);
    c.lineTo(x, y);
    c.lineTo(x, y + sy * tick);
    c.stroke();
  }
  c.restore();
}

/* ---------- the character ---------- */

function drawCooter(c, x, yb, k, t, o) {
  const walk = o.walk;
  const bolt = o.bolt || 0;
  const armUp = o.armUp;
  const bob = Math.sin(t * 9) * 3.2 * walk - bolt * 6;
  const sway = Math.sin(t * 9) * 0.05 * walk;
  const lean = bolt * 0.42;

  c.save();
  c.translate(x, yb);
  c.scale(k, k);
  c.rotate(-lean * 0.35);
  c.translate(0, bob * 0.4);

  const inkW = 3.2;

  // ground shadow
  c.save();
  c.globalAlpha = 0.28;
  c.fillStyle = '#0a0a14';
  c.beginPath();
  c.ellipse(0, 4, 66 - bolt * 18, 11, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // --- tail ---
  c.save();
  const tA = P(-34, -120);
  const tB = P(-108 - bolt * 70, -150);
  const tC = P(-108 - bolt * 120, -238 + Math.sin(t * 5) * 8);
  for (let i = 0; i < 9; i++) {
    const u = i / 8;
    const p = bez(tA, tB, tC, u);
    const rad = 22 - i * 1.15;
    c.fillStyle = i % 2 ? C.mask : C.fur;
    c.strokeStyle = C.ink;
    c.lineWidth = inkW * 0.8;
    c.beginPath();
    c.arc(p.x, p.y, rad, 0, Math.PI * 2);
    c.fill();
    if (i < 8) c.stroke();
  }
  c.restore();

  // --- legs ---
  const step = Math.sin(t * 9) * walk;
  const legA = step * 16 * (1 - bolt);
  const legB = -step * 16 * (1 - bolt);
  const legs = [
    { hx: -16, dx: legA, col: C.fur },
    { hx: 16, dx: legB, col: C.furDark },
  ];
  for (const L of legs) {
    const swing = bolt ? 30 : L.dx;
    c.strokeStyle = C.ink;
    c.lineWidth = 15;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(L.hx, -92);
    c.quadraticCurveTo(L.hx + swing * 0.4, -50, L.hx + swing, -6);
    c.stroke();
    c.strokeStyle = L.col;
    c.lineWidth = 11;
    c.beginPath();
    c.moveTo(L.hx, -92);
    c.quadraticCurveTo(L.hx + swing * 0.4, -50, L.hx + swing, -6);
    c.stroke();
    // heel
    c.fillStyle = C.dress;
    c.strokeStyle = C.ink;
    c.lineWidth = 2.4;
    c.beginPath();
    c.ellipse(L.hx + swing + 5, -3, 12, 5, 0, 0, Math.PI * 2);
    c.fill();
    c.stroke();
  }

  c.save();
  c.rotate(sway * 0.5);

  // --- body / dress ---
  c.fillStyle = C.dress;
  c.strokeStyle = C.ink;
  c.lineWidth = inkW;
  c.beginPath();
  c.moveTo(-38, -96);
  c.bezierCurveTo(-44, -130, -34, -170, -24, -186);
  c.bezierCurveTo(-10, -198, 10, -198, 24, -186);
  c.bezierCurveTo(34, -170, 44, -130, 38, -96);
  c.bezierCurveTo(20, -88, -20, -88, -38, -96);
  c.closePath();
  c.fill();
  c.stroke();

  // sequins
  c.fillStyle = 'rgba(255,240,250,0.55)';
  for (let i = 0; i < 14; i++) {
    const sx = ((i * 37) % 60) - 30;
    const sy = -100 - ((i * 23) % 80);
    c.beginPath();
    c.arc(sx, sy, 2.1, 0, Math.PI * 2);
    c.fill();
  }

  // hem glitter
  c.strokeStyle = C.gold;
  c.lineWidth = 2.2;
  c.beginPath();
  c.moveTo(-37, -98);
  c.quadraticCurveTo(0, -88, 37, -98);
  c.stroke();

  // --- hips arm + purse ---
  c.strokeStyle = C.ink;
  c.lineWidth = 13;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-26, -180);
  c.quadraticCurveTo(-56, -152, -40, -112);
  c.stroke();
  c.strokeStyle = C.fur;
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(-26, -180);
  c.quadraticCurveTo(-56, -152, -40, -112);
  c.stroke();

  c.save();
  c.translate(-42, -104);
  c.rotate(Math.sin(t * 4) * 0.06);
  c.fillStyle = C.gold;
  c.strokeStyle = C.ink;
  c.lineWidth = 2.4;
  c.beginPath();
  c.roundRect(-13, 0, 26, 24, 6);
  c.fill();
  c.stroke();
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, 0, 11, Math.PI, 0);
  c.stroke();
  c.restore();

  // --- raised arm + cigarette holder ---
  c.strokeStyle = C.ink;
  c.lineWidth = 13;
  c.beginPath();
  c.moveTo(26, -180);
  if (armUp) {
    c.quadraticCurveTo(58, -196, 62, -218);
  } else {
    c.quadraticCurveTo(48, -150, 38, -112);
  }
  c.stroke();
  c.strokeStyle = C.fur;
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(26, -180);
  if (armUp) {
    c.quadraticCurveTo(58, -196, 62, -218);
  } else {
    c.quadraticCurveTo(48, -150, 38, -112);
  }
  c.stroke();

  const hx = armUp ? 62 : 38;
  const hy = armUp ? -218 : -112;
  c.fillStyle = C.fur;
  c.strokeStyle = C.ink;
  c.lineWidth = 2.4;
  c.beginPath();
  c.arc(hx, hy, 7, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  if (armUp) {
    c.strokeStyle = '#efe6d6';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(hx + 30, hy - 16);
    c.stroke();
    c.fillStyle = C.lips;
    c.beginPath();
    c.arc(hx + 32, hy - 17, 3.4, 0, Math.PI * 2);
    c.fill();
    // ember
    const ember = 0.6 + 0.4 * Math.abs(Math.sin(t * 9));
    c.fillStyle = `rgba(255,140,80,${ember})`;
    c.shadowColor = '#ff8a50';
    c.shadowBlur = 10;
    c.beginPath();
    c.arc(hx + 33, hy - 18, 2.4, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;
    // smoke
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.5 + i * 0.25) % 1);
      c.globalAlpha = 0.22 * (1 - u);
      c.fillStyle = '#e8e2f0';
      c.beginPath();
      c.arc(hx + 34 + Math.sin(u * 6 + i) * 9, hy - 26 - u * 44, 3 + u * 6, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  // --- boa ---
  const boaY = -196;
  for (let i = 0; i < 13; i++) {
    const u = i / 12;
    const ang = Math.PI + u * Math.PI;
    const bx = Math.cos(ang) * 36;
    const by = boaY + Math.sin(ang) * -9 + Math.sin(t * 6 + i * 0.7) * 2;
    const rad = 8 + Math.sin(i * 2.1) * 3;
    c.fillStyle = i % 3 === 0 ? '#ffa9cd' : i % 2 ? C.boa : C.boaDark;
    c.strokeStyle = C.ink;
    c.lineWidth = 1.8;
    c.beginPath();
    c.arc(bx, by, rad, 0, Math.PI * 2);
    c.fill();
    c.stroke();
    if (i % 4 === 1) {
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath();
      c.arc(bx - rad * 0.35, by - rad * 0.35, 1.6, 0, Math.PI * 2);
      c.fill();
    }
  }

  // --- head ---
  const headBob = Math.sin(t * 9 + 0.6) * 1.6 * walk;
  c.save();
  c.translate(0, -232 + headBob);
  c.rotate(Math.sin(t * 3.4) * 0.03 + (armUp ? Math.sin(t * 5) * 0.05 : 0));

  // ears
  for (const s of [-1, 1]) {
    c.fillStyle = C.fur;
    c.strokeStyle = C.ink;
    c.lineWidth = inkW;
    c.beginPath();
    c.moveTo(s * 14, -28);
    c.lineTo(s * 34, -50);
    c.lineTo(s * 38, -22);
    c.closePath();
    c.fill();
    c.stroke();
    c.fillStyle = C.boa;
    c.beginPath();
    c.moveTo(s * 20, -30);
    c.lineTo(s * 31, -43);
    c.lineTo(s * 33, -26);
    c.closePath();
    c.fill();
  }

  // skull
  c.fillStyle = C.fur;
  c.strokeStyle = C.ink;
  c.lineWidth = inkW;
  c.beginPath();
  c.arc(0, 0, 36, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // mask band
  c.fillStyle = C.mask;
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-34, -6);
  c.bezierCurveTo(-20, -18, 20, -18, 34, -6);
  c.bezierCurveTo(24, 10, -24, 10, -34, -6);
  c.closePath();
  c.fill();
  c.stroke();

  // eyes
  for (const s of [-1, 1]) {
    c.fillStyle = '#fffdf7';
    c.beginPath();
    c.arc(s * 14, -4, 7.4, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#1a1420';
    const look = Math.sin(t * 2.2) * 1.6;
    c.beginPath();
    c.arc(s * 14 + look, -3, 3.6, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath();
    c.arc(s * 14 + look - 1.4, -4.6, 1.3, 0, Math.PI * 2);
    c.fill();
    // lashes
    c.strokeStyle = C.ink;
    c.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI * 0.85 + i * 0.38;
      c.beginPath();
      c.moveTo(s * 14 + Math.cos(a) * 7, -4 + Math.sin(a) * 7);
      c.lineTo(s * 14 + Math.cos(a) * 12.5, -4 + Math.sin(a) * 12.5);
      c.stroke();
    }
  }

  // muzzle + nose
  c.fillStyle = C.cream;
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(0, 15, 19, 13, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.fillStyle = '#241a26';
  c.beginPath();
  c.moveTo(0, 9);
  c.lineTo(-5, 14);
  c.lineTo(5, 14);
  c.closePath();
  c.fill();

  // lips
  c.fillStyle = C.lips;
  c.beginPath();
  c.moveTo(-15, 19);
  c.quadraticCurveTo(-8, 26, 0, 20);
  c.quadraticCurveTo(8, 26, 15, 19);
  c.quadraticCurveTo(8, 30, 0, 28);
  c.quadraticCurveTo(-8, 30, -15, 19);
  c.closePath();
  c.fill();
  c.strokeStyle = '#a0184a';
  c.lineWidth = 1.2;
  c.beginPath();
  c.moveTo(-12, 20);
  c.quadraticCurveTo(0, 24, 12, 20);
  c.stroke();

  // cheek blush
  c.globalAlpha = 0.5;
  c.fillStyle = C.boa;
  for (const s of [-1, 1]) {
    c.beginPath();
    c.ellipse(s * 22, 10, 6, 4, 0, 0, Math.PI * 2);
    c.fill();
  }
  c.globalAlpha = 1;

  // little fascinator
  c.fillStyle = C.boaDark;
  c.strokeStyle = C.ink;
  c.lineWidth = 2;
  c.beginPath();
  c.ellipse(-12, -33, 12, 7, -0.4, 0, Math.PI * 2);
  c.fill();
  c.stroke();
  c.strokeStyle = C.boa;
  c.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    c.beginPath();
    c.moveTo(-12, -33);
    c.quadraticCurveTo(-2 + i * 6, -46 - i * 4, 6 + i * 5, -44 - i * 3);
    c.stroke();
  }

  c.restore(); // head
  c.restore(); // body sway
  c.restore(); // root
}

/* ---------- particles + props ---------- */

function spawnBill() {
  const W = st.W;
  st.bills.push({
    x: W * (0.04 + Math.random() * 0.92),
    y: -30,
    vy: 95 + Math.random() * 130,
    rot: Math.random() * 6.28,
    spin: (Math.random() - 0.5) * 4.2,
    sway: 0.6 + Math.random() * 1.6,
    ph: Math.random() * 6.28,
    w: 26 + Math.random() * 12,
  });
}

function updateBill(px, dt, t) {
  return px;
}

function drawBills(c, dt, t, wind) {
  const W = st.W;
  if (t > 9.0 && t < 21.6) {
    st.nextBill -= dt;
    if (st.nextBill <= 0) {
      st.nextBill = 0.085;
      if (st.bills.length < 70) spawnBill();
    }
  }
  if (t > 21.4) {
    st.nextBill -= dt;
    if (st.nextBill <= 0) {
      st.nextBill = 0.16;
      if (st.bills.length < 55) {
        spawnBill();
        st.bills[st.bills.length - 1].x = W * (0.1 + Math.random() * 0.8);
        st.bills[st.bills.length - 1].vy = 40 + Math.random() * 60;
      }
    }
  }
  for (let i = st.bills.length - 1; i >= 0; i--) {
    const b = st.bills[i];
    b.y += b.vy * dt;
    b.x += Math.sin(t * b.sway + b.ph) * 26 * dt + wind * dt;
    b.rot += b.spin * dt;
    if (b.y > st.H + 60 || b.x > W + 120) {
      st.bills.splice(i, 1);
      continue;
    }
    c.save();
    c.translate(b.x, b.y);
    c.rotate(b.rot);
    const squash = Math.abs(Math.cos(b.rot * 1.3));
    c.scale(0.35 + squash * 0.65, 1);
    c.fillStyle = C.gold;
    c.globalAlpha = 0.94;
    c.fillRect(-b.w / 2, -b.w * 0.3, b.w, b.w * 0.6);
    c.globalAlpha = 1;
    c.strokeStyle = '#8a6a1e';
    c.lineWidth = 1.4;
    c.strokeRect(-b.w / 2, -b.w * 0.3, b.w, b.w * 0.6);
    c.fillStyle = '#6c5216';
    c.font = `900 ${Math.round(b.w * 0.5)}px Georgia, serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('$', 0, 1);
    c.restore();
  }
}

function drawKiss(c, x, y, size, alpha, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.globalAlpha = alpha;
  c.fillStyle = C.lips;
  // upper lip
  c.beginPath();
  c.moveTo(-size, 0);
  c.quadraticCurveTo(-size * 0.5, -size * 0.9, -size * 0.15, -size * 0.25);
  c.quadraticCurveTo(0, -size * 0.5, size * 0.15, -size * 0.25);
  c.quadraticCurveTo(size * 0.5, -size * 0.9, size, 0);
  c.quadraticCurveTo(size * 0.45, size * 0.85, 0, size * 0.62);
  c.quadraticCurveTo(-size * 0.45, size * 0.85, -size, 0);
  c.closePath();
  c.fill();
  c.globalAlpha = alpha * 0.6;
  c.strokeStyle = '#a0184a';
  c.lineWidth = Math.max(1, size * 0.09);
  c.beginPath();
  c.moveTo(-size * 0.8, 0);
  c.quadraticCurveTo(0, size * 0.35, size * 0.8, 0);
  c.stroke();
  c.restore();
}

function drawKisses(c, dt, t) {
  const r = streamRect({ width: st.W, height: st.H, streamer: st.streamerSrc });
  for (let i = st.kisses.length - 1; i >= 0; i--) {
    const k = st.kisses[i];
    k.age += dt;
    const u = easeOut(k.age / k.life);
    const x = k.x0 + (k.x1 - k.x0) * u + Math.sin(k.age * 4) * 8 * (1 - u);
    const y = k.y0 + (k.y1 - k.y0) * u - Math.sin(u * Math.PI) * 40;
    const a = clamp01(k.age / 0.18) * (1 - clamp01((k.age - k.life * 0.6) / (k.life * 0.4)));
    drawKiss(c, x, y, 13 + u * 7, a * 0.95, k.rot + Math.sin(k.age * 2) * 0.1);
    if (k.age > k.life) st.kisses.splice(i, 1);
  }
}

function drawHearts(c, dt, t) {
  for (let i = st.hearts.length - 1; i >= 0; i--) {
    const h = st.hearts[i];
    h.age += dt;
    const u = h.age / h.life;
    if (u >= 1) {
      st.hearts.splice(i, 1);
      continue;
    }
    const x = h.x + Math.sin(h.age * 3 + h.ph) * 14;
    const y = h.y - u * 120;
    const s = h.size * (0.6 + Math.sin(u * Math.PI) * 0.6);
    c.save();
    c.globalAlpha = (1 - u) * 0.9;
    c.translate(x, y);
    c.rotate(Math.sin(h.age * 2 + h.ph) * 0.2);
    c.fillStyle = i % 3 === 0 ? C.gold : C.boa;
    c.beginPath();
    c.moveTo(0, s * 0.35);
    c.bezierCurveTo(-s, -s * 0.5, -s * 0.2, -s, 0, -s * 0.45);
    c.bezierCurveTo(s * 0.2, -s, s, -s * 0.5, 0, s * 0.35);
    c.fill();
    c.restore();
  }
}

function drawSparkles(c, t) {
  const W = st.W;
  const H = st.H;
  for (let i = 0; i < 16; i++) {
    const ph = i * 1.37;
    const x = W * (0.1 + ((i * 0.618) % 1) * 0.8);
    const y = H * (0.38 + ((i * 0.33) % 1) * 0.36);
    const a = 0.18 + 0.42 * Math.abs(Math.sin(t * 3.1 + ph));
    const s = 2.4 + Math.abs(Math.sin(t * 2.2 + ph)) * 3.6;
    c.save();
    c.globalAlpha = a;
    c.strokeStyle = C.gold;
    c.lineWidth = 1.6;
    c.beginPath();
    c.moveTo(x - s, y);
    c.lineTo(x + s, y);
    c.moveTo(x, y - s);
    c.lineTo(x, y + s);
    c.stroke();
    c.restore();
  }
}

function bubbleLayout(text, fs) {
  const lines = text.split('\n');
  let maxW = 0;
  for (const l of lines) maxW = Math.max(maxW, l.length * fs * 0.52);
  return { lines, w: maxW + fs * 1.6, h: lines.length * fs * 1.35 + fs * 0.9 };
}

function drawBubble(c, x, y, text, fs, alpha, tailTo) {
  if (alpha <= 0.01) return;
  const L = bubbleLayout(text, fs);
  const bx = x - L.w / 2;
  const by = y - L.h;
  c.save();
  c.globalAlpha = alpha;
  c.fillStyle = 'rgba(255,247,252,0.96)';
  c.strokeStyle = C.ink;
  c.lineWidth = Math.max(2, fs * 0.13);
  c.beginPath();
  c.roundRect(bx, by, L.w, L.h, fs * 0.55);
  c.fill();
  c.stroke();

  if (tailTo) {
    c.beginPath();
    c.moveTo(x - fs * 0.6, by + L.h - 2);
    c.lineTo(tailTo.x, tailTo.y);
    c.lineTo(x + fs * 0.7, by + L.h - 2);
    c.closePath();
    c.fillStyle = 'rgba(255,247,252,0.96)';
    c.fill();
    c.strokeStyle = C.ink;
    c.lineWidth = Math.max(2, fs * 0.13);
    c.beginPath();
    c.moveTo(x - fs * 0.6, by + L.h);
    c.lineTo(tailTo.x, tailTo.y);
    c.lineTo(x + fs * 0.7, by + L.h);
    c.stroke();
    // mask the seam
    c.fillStyle = 'rgba(255,247,252,0.96)';
    c.fillRect(x - fs * 0.55, by + L.h - fs * 0.16, fs * 1.2, fs * 0.2);
  }

  c.fillStyle = '#2a1e2c';
  c.font = `800 ${fs}px "Trebuchet MS", "Segoe UI", sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  L.lines.forEach((line, i) => {
    c.fillText(line, x, by + fs * 0.75 + i * fs * 1.35);
  });
  c.restore();
}

function drawSiren(c, ctx, t) {
  if (t < 16.4 || t > 20.4) return;
  const W = st.W;
  const H = st.H;
  const a = clamp01((t - 16.4) / 0.3) * clamp01((20.4 - t) / 0.6);
  c.save();
  c.globalCompositeOperation = 'lighter';
  const sweep = Math.sin((t - 16.4) * 5.5);
  const blobs = [
    { x: W * (0.15 + 0.25 * sweep), y: H * 0.1, col: '255,60,80' },
    { x: W * (0.85 - 0.25 * sweep), y: H * 0.1, col: '60,120,255' },
  ];
  for (const b of blobs) {
    const g = c.createRadialGradient(b.x, b.y, 0, b.x, b.y, W * 0.4);
    g.addColorStop(0, `rgba(${b.col},${0.3 * a})`);
    g.addColorStop(0.5, `rgba(${b.col},${0.12 * a})`);
    g.addColorStop(1, `rgba(${b.col},0)`);
    c.fillStyle = g;
    c.beginPath();
    c.arc(b.x, b.y, W * 0.4, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}

function drawWhistle(c, x, y, t, start) {
  const u = (t - start) / 1.1;
  if (u < 0 || u > 1) return;
  c.save();
  c.strokeStyle = C.boa;
  c.globalAlpha = (1 - u) * 0.85;
  c.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    const r = 14 + u * 90 + i * 16;
    c.beginPath();
    c.arc(x, y, r, -0.7, 0.7);
    c.stroke();
  }
  c.restore();
}

/* ---------- main ---------- */

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  if (!st || st.W !== W || st.H !== H) init(ctx);
  st.W = W;
  st.H = H;

  dt = Math.min(dt || 0.016, 0.06);

  c.clearRect(0, 0, W, H);
  c.save();
  c.lineCap = 'round';
  c.lineJoin = 'round';

  const fs = Math.max(11, Math.min(W, H) * 0.026);
  const scale = Math.min(W, H) / 700;
  const gy = H * 0.815;
  const standX = W * 0.36;

  // ---- timing ----
  const ENTER0 = 1.5;
  const ENTER1 = 5.2;
  const SIREN = 16.4;
  const BOLT0 = 19.4;
  const BOLT1 = 21.2;
  const END = 24.0;

  // ---- sound cues ----
  once(ctx, 'power', () => {
    ctx.sound.beep(180, 120);
    ctx.sound.noise(90);
  });
  once(ctx, 'enter', () => ctx.sound.noise(200));
  once(ctx, 'catcall', () => {
    ctx.sound.beep(1250, 90);
    ctx.sound.beep(1750, 150);
    ctx.sound.beep(1150, 130);
  });
  once(ctx, 'line1', () => ctx.sound.beep(760, 70));
  once(ctx, 'line2', () => ctx.sound.beep(900, 70));
  once(ctx, 'line3', () => ctx.sound.beep(1020, 70));
  once(ctx, 'siren', () => {
    for (let i = 0; i < 3; i++) {
      ctx.sound.beep(i % 2 ? 660 : 980, 240);
    }
    ctx.sound.noise(300);
  });
  once(ctx, 'siren2', () => {
    ctx.sound.beep(1040, 300);
    ctx.sound.beep(700, 300);
  });
  once(ctx, 'bolt', () => {
    ctx.sound.noise(340);
    ctx.sound.beep(1500, 60);
  });
  once(ctx, 'mwah', () => {
    ctx.sound.beep(1800, 110);
    ctx.sound.beep(2300, 170);
  });
  once(ctx, 'close', () => ctx.sound.beep(240, 420));

  // ---- world ----
  drawSiren(c, ctx, t);
  drawCorner(c, t);
  drawSparkles(c, t);
  drawNeonSign(c, ctx, t);
  drawClientFrame(c, ctx, t);

  // walk-in position
  let cx = -W * 0.18;
  let walkAmp = 0;
  let armUp = false;
  let bolt = 0;
  let facingBolt = false;

  if (t >= ENTER0 && t < BOLT0) {
    const u = easeOut(clamp01((t - ENTER0) / (ENTER1 - ENTER0)));
    cx = -W * 0.18 + (standX + W * 0.18) * u;
    walkAmp = u < 0.999 ? 1 : 0;
    if (t > 5.4) walkAmp = 0.35;
    armUp = t > 9.6;
  } else if (t >= ENTER0 && t < ENTER1) {
    walkAmp = 1;
  }

  if (t >= BOLT0) {
    const u = easeIn(clamp01((t - BOLT0) / (BOLT1 - BOLT0)));
    cx = standX + (W * 1.3 - standX) * u;
    bolt = 1;
    facingBolt = true;
    walkAmp = 0;
  }

  // walking heel clicks
  if (walkAmp > 0.5 && t > ENTER0 && t < ENTER1) {
    st.stepPhase += dt * 3.0;
    if (st.stepPhase >= 1) {
      st.stepPhase = 0;
      ctx.sound.beep(1150, 18);
    }
  }

  // a couple of cheeky bursts
  if (t > 6.0 && t < 7.2) drawWhistle(c, cx + 44 * scale, gy - 232 * scale, t, 6.0);

  // hearts while she's working the corner
  if (t > 9.5 && t < 16.0 && Math.random() < dt * 4) {
    st.hearts.push({
      x: cx + (Math.random() - 0.5) * 90 * scale,
      y: gy - 200 * scale,
      age: 0,
      life: 1.6 + Math.random() * 0.9,
      size: 9 + Math.random() * 8,
      ph: Math.random() * 6.28,
    });
  }

  // kisses toward the client frame
  const r = streamRect(ctx);
  const kissTarget = { x: r.x + r.w * 0.5, y: r.y + r.h * 0.06 };
  if (!st.k1 && t > 6.7) {
    st.k1 = true;
    st.kisses.push({
      x0: cx + 30 * scale,
      y0: gy - 246 * scale,
      x1: kissTarget.x,
      y1: kissTarget.y,
      age: 0,
      life: 1.35,
      rot: -0.12,
    });
    ctx.sound.beep(1600, 60);
  }
  if (!st.k2 && t > 13.2) {
    st.k2 = true;
    st.kisses.push({
      x0: cx + 30 * scale,
      y0: gy - 246 * scale,
      x1: kissTarget.x + r.w * 0.22,
      y1: kissTarget.y + r.h * 0.14,
      age: 0,
      life: 1.2,
      rot: 0.18,
    });
    ctx.sound.beep(1400, 60);
  }

  // ---- the lady herself ----
  if (cx < W + 260 * scale) {
    drawCooter(c, cx, gy, scale, t, { walk: walkAmp, bolt, armUp });
  }

  // bills in front of the sidewalk
  drawBills(c, dt, t, bolt ? 320 : 0);
  drawKisses(c, dt, t);
  drawHearts(c, dt, t);

  // ---- dialogue ----
  const mouthX = cx + 34 * scale;
  const mouthY = gy - 224 * scale;
  const bubX = Math.min(W * 0.7, cx + 30 * scale);
  const bubY = gy - 300 * scale;

  const lines = [
    { s: 5.9, e: 8.4, txt: 'Hey Savory.\nNice cam.' },
    { s: 9.4, e: 11.9, txt: 'That wink\nis two bills.' },
    { s: 12.6, e: 15.4, txt: 'Cash only,\nsweetheart.' },
  ];
  for (const L of lines) {
    if (t < L.s || t > L.e) continue;
    const a = clamp01((t - L.s) / 0.22) * clamp01((L.e - t) / 0.25);
    drawBubble(c, bubX, bubY, L.txt, fs, a, { x: mouthX, y: mouthY });
  }
  if (t > 16.9 && t < 19.2) {
    const a = clamp01((t - 16.9) / 0.22) * clamp01((19.2 - t) / 0.25);
    const bx2 = Math.min(W * 0.72, cx + 20 * scale);
    drawBubble(c, bx2, gy - 300 * scale, 'Oops.\nFive-O.', fs, a, { x: mouthX, y: mouthY });
  }

  // ---- punchline ----
  if (t > 21.6) {
    const a = clamp01((t - 21.6) / 0.35);
    const kx = r.x + r.w * 0.56;
    const ky = r.y + r.h * 0.34;
    const pop = 0.4 + 0.6 * easeOut(clamp01((t - 21.6) / 0.5));
    drawKiss(c, kx, ky, 34 * pop, a * 0.92, -0.16);
    c.save();
    c.globalAlpha = a;
    c.fillStyle = C.boa;
    c.font = `800 ${fs * 0.85}px "Trebuchet MS", "Segoe UI", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('mwah. call me.', W * 0.5, H * 0.94);
    c.restore();
  }

  // ---- end card line ----
  if (t > 22.6) {
    const a = clamp01((t - 22.6) / 0.4);
    c.save();
    c.globalAlpha = a * 0.9;
    c.fillStyle = C.cream;
    c.font = `700 ${fs * 0.6}px "Trebuchet MS", "Segoe UI", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Cooter will return after these messages.', W * 0.5, H * 0.88);
    c.restore();
  }

  // vignette-ish corner sparkle ring around the sign at the very end
  if (t > 23.2) {
    const a = clamp01((t - 23.2) / 0.5);
    c.save();
    c.globalAlpha = a * 0.5;
    c.strokeStyle = C.boa;
    c.lineWidth = 2;
    c.beginPath();
    c.arc(W * 0.24, H * 0.145, Math.min(W, H) * (0.1 + (t - 23.2) * 0.12), 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  c.restore();

  if (t >= END) ctx.done();
}

export function dispose(ctx) {
  if (st) st.sfx.clear();
}
