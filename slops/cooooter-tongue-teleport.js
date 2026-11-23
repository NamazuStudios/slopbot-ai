// A cartoon face leans in from the left and unfurls an unreasonable tongue
// across the glass until it lands on the live streamer's camera. Then it
// retracts, smug, and leaves. Nothing is drawn where the stream should be.

export const meta = {
  title: 'Tongue Teleport',
  author: 'cooooter',
  prompt: 'a blonde woman with blue eyes and an open mouth appears on the left side of the screen and extends her tongue which is very pink and thick and long to the other side of the screen to touch the streamer',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

const S = { ready: false };

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOutBack = (t) => {
  const c = 1.70158;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

// timeline (seconds)
const T_IN = 0.9;
const T_OPEN = 1.0;
const T_EXT0 = 1.9;
const T_EXT1 = 4.6;
const T_CONTACT = 4.6;
const T_RET0 = 6.7;
const T_RET1 = 8.6;
const T_OUT = 8.8;
const T_OUT1 = 10.2;
const T_END = 10.5;

export function init(ctx) {
  const w = ctx.width;
  const h = ctx.height;
  const r = Math.min(w, h) * 0.155;

  S.ready = true;
  S.r = r;
  S.headHomeX = w * 0.15;
  S.headY = h * 0.47;
  S.headX = -w * 0.4;
  S.mouthOpen = 0;
  S.p = 0;
  S.droplets = [];
  S.rings = [];
  S.splat = false;
  S.sfx = {};
  S.done = false;

  const st = ctx.streamer;
  if (st) {
    S.tx = (st.x + st.w * 0.5) * w;
    S.ty = (st.y + st.h * 0.42) * h;
  } else {
    S.tx = w * 0.78;
    S.ty = h * 0.47;
  }
}

function mouthPoint() {
  return {
    x: S.headX + S.r * 0.38,
    y: S.headY + S.r * 0.42,
  };
}

function buildSides(pts, wBase) {
  const left = [];
  const right = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    let nx = -(b.y - a.y);
    let ny = b.x - a.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    const s = i / (n - 1);
    const wid = (wBase * (0.55 + 0.55 * Math.sin(Math.PI * (0.12 + 0.76 * s)))) * 0.5;
    left.push({ x: pts[i].x + nx * wid, y: pts[i].y + ny * wid, wid });
    right.push({ x: pts[i].x - nx * wid, y: pts[i].y - ny * wid, wid });
  }
  return { left, right };
}

function sidePath(c, sides, pts, extra) {
  const { left, right } = sides;
  const last = pts.length - 1;
  const tip = pts[last];
  const tdx = tip.x - pts[last - 1].x;
  const tdy = tip.y - pts[last - 1].y;
  const tl = Math.hypot(tdx, tdy) || 1;

  c.beginPath();
  c.moveTo(left[0].x, left[0].y);
  for (let i = 1; i <= last; i++) c.lineTo(left[i].x, left[i].y);
  c.quadraticCurveTo(
    tip.x + (tdx / tl) * extra,
    tip.y + (tdy / tl) * extra,
    right[last].x,
    right[last].y
  );
  for (let i = last - 1; i >= 0; i--) c.lineTo(right[i].x, right[i].y);
  c.closePath();
}

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const w = ctx.width;
  const h = ctx.height;

  if (!S.ready) init(ctx);
  c.clearRect(0, 0, w, h);

  const r = S.r;
  const snd = ctx.sound;
  const once = (key, cond, fn) => {
    if (cond && !S.sfx[key]) {
      S.sfx[key] = true;
      try {
        fn();
      } catch (e) {}
    }
  };

  // ---- clock ------------------------------------------------------------
  let hx;
  if (t < T_IN) hx = lerp(-w * 0.4, S.headHomeX, easeOutBack(clamp(t / T_IN, 0, 1)));
  else if (t < T_OUT) hx = S.headHomeX;
  else hx = lerp(S.headHomeX, -w * 0.45, easeInOut(clamp((t - T_OUT) / (T_OUT1 - T_OUT), 0, 1)));
  S.headX = hx;

  let open = clamp((t - T_OPEN) / 0.5, 0, 1);
  if (t > 8.5) open *= 1 - clamp((t - 8.5) / 0.4, 0, 1);
  S.mouthOpen = open;

  let p = 0;
  if (t >= T_EXT0 && t < T_EXT1) p = easeInOut(clamp((t - T_EXT0) / (T_EXT1 - T_EXT0), 0, 1));
  else if (t >= T_EXT1 && t < T_RET0) p = 1;
  else if (t >= T_RET0 && t < T_RET1) p = 1 - easeInOut(clamp((t - T_RET0) / (T_RET1 - T_RET0), 0, 1));
  S.p = p;

  // ---- sounds -----------------------------------------------------------
  once('in', t > 0.02, () => snd.beep(180, 150));
  once('open', t > 1.0, () => snd.beep(320, 90));
  once('go', t > T_EXT0, () => snd.beep(270, 170));
  once('mid', t > 3.2, () => snd.beep(440, 150));
  once('contact', t > T_CONTACT, () => {
    snd.noise(320);
    snd.beep(130, 340);
  });
  once('ret', t > T_RET0, () => snd.beep(520, 150));
  once('out', t > T_OUT, () => snd.beep(240, 220));

  // ---- face -------------------------------------------------------------
  c.save();
  c.translate(hx, S.headY);

  // hair behind
  c.fillStyle = '#f0cf74';
  c.beginPath();
  c.ellipse(-r * 0.04, -r * 0.08, r * 1.1, r * 1.18, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#e2bf5e';
  c.beginPath();
  c.ellipse(-r * 0.72, r * 0.18, r * 0.42, r * 0.72, 0.25, 0, Math.PI * 2);
  c.fill();
  // hair shine
  c.strokeStyle = 'rgba(255, 246, 200, 0.6)';
  c.lineWidth = r * 0.05;
  c.lineCap = 'round';
  c.beginPath();
  c.arc(r * 0.02, -r * 0.05, r * 0.85, -2.5, -1.7);
  c.stroke();
  c.beginPath();
  c.arc(-r * 0.6, -r * 0.05, r * 0.55, -2.4, -1.6);
  c.stroke();

  // face
  c.fillStyle = '#ffd9c2';
  c.beginPath();
  c.ellipse(r * 0.08, r * 0.02, r * 0.9, r * 0.99, 0, 0, Math.PI * 2);
  c.fill();

  // ear
  c.fillStyle = '#f7c9ae';
  c.beginPath();
  c.ellipse(-r * 0.72, r * 0.06, r * 0.16, r * 0.24, 0, 0, Math.PI * 2);
  c.fill();

  // fringe
  c.fillStyle = '#efcf74';
  c.beginPath();
  c.moveTo(-r * 0.8, -r * 0.25);
  c.quadraticCurveTo(-r * 0.2, -r * 1.12, r * 0.72, -r * 0.5);
  c.quadraticCurveTo(r * 0.5, -r * 0.78, r * 0.1, -r * 0.62);
  c.quadraticCurveTo(-r * 0.25, -r * 0.5, -r * 0.42, -r * 0.2);
  c.quadraticCurveTo(-r * 0.6, -r * 0.34, -r * 0.8, -r * 0.25);
  c.fill();

  // brow
  c.strokeStyle = '#c99a45';
  c.lineWidth = r * 0.055;
  c.beginPath();
  c.moveTo(r * 0.16, -r * 0.42);
  c.quadraticCurveTo(r * 0.4, -r * 0.52, r * 0.62, -r * 0.4);
  c.stroke();

  // eye
  let blink = 0;
  const blinkA = (t - 1.05) / 0.2;
  const blinkB = (t - 5.85) / 0.2;
  if (blinkA > 0 && blinkA < 1) blink = Math.sin(blinkA * Math.PI);
  else if (blinkB > 0 && blinkB < 1) blink = Math.sin(blinkB * Math.PI);
  c.save();
  c.translate(r * 0.38, -r * 0.1);
  c.scale(1, 1 - 0.94 * clamp(blink, 0, 1));
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.ellipse(0, 0, r * 0.17, r * 0.13, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#3f8fe0';
  c.beginPath();
  c.arc(r * 0.05, 0, r * 0.095, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#1d2836';
  c.beginPath();
  c.arc(r * 0.055, 0, r * 0.046, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.92)';
  c.beginPath();
  c.arc(r * 0.022, -r * 0.035, r * 0.024, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = 'rgba(60,40,40,0.5)';
  c.lineWidth = r * 0.02;
  c.beginPath();
  c.ellipse(0, 0, r * 0.17, r * 0.13, 0, 0, Math.PI * 2);
  c.stroke();
  c.restore();

  // nose
  c.strokeStyle = 'rgba(200,120,100,0.55)';
  c.lineWidth = r * 0.03;
  c.beginPath();
  c.moveTo(r * 0.46, r * 0.02);
  c.quadraticCurveTo(r * 0.5, r * 0.16, r * 0.42, r * 0.2);
  c.stroke();

  // blush
  c.fillStyle = 'rgba(255,110,140,0.22)';
  c.beginPath();
  c.ellipse(r * 0.3, r * 0.28, r * 0.24, r * 0.13, 0, 0, Math.PI * 2);
  c.fill();

  // mouth
  const m = mouthPoint();
  const mw = r * (0.2 + 0.06 * open);
  const mh = r * (0.06 + 0.2 * open);
  c.save();
  c.translate(m.x - hx, m.y - S.headY);
  c.rotate(0.22);
  c.fillStyle = '#7d2342';
  c.beginPath();
  c.ellipse(0, 0, mw, mh, 0, 0, Math.PI * 2);
  c.fill();
  // inner tongue root
  c.fillStyle = '#e2608e';
  c.beginPath();
  c.ellipse(0, mh * 0.35, mw * 0.8, mh * 0.55, 0, 0, Math.PI * 2);
  c.fill();
  // teeth hint
  c.fillStyle = 'rgba(255,255,255,0.9)';
  c.fillRect(-mw * 0.62, -mh, mw * 1.24, Math.max(2, mh * 0.18));
  c.restore();

  c.restore();

  // ---- tongue -----------------------------------------------------------
  if (p > 0.001) {
    const pts = [];
    const N = 52;
    const dx = S.tx - m.x;
    const dy = S.ty - m.y;
    const dist = Math.hypot(dx, dy) || 1;
    const bow = -dist * 0.1;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      const along = s * p;
      const wob =
        Math.sin(s * 6.5 - t * 9) * dist * 0.018 * Math.sin(Math.PI * s) * (0.5 + 0.5 * p);
      const off = bow * Math.sin(Math.PI * s) + wob;
      const px = (-dy / dist) * off;
      const py = (dx / dist) * off;
      pts.push({ x: m.x + dx * along + px, y: m.y + dy * along + py });
    }

    const wBase = Math.min(w, h) * 0.055;
    const sides = buildSides(pts, wBase);

    // soft contact shadow
    c.save();
    c.translate(0, wBase * 0.16);
    c.fillStyle = 'rgba(20, 10, 30, 0.18)';
    sidePath(c, sides, pts, wBase * 0.28);
    c.fill();
    c.restore();

    // body
    sidePath(c, sides, pts, wBase * 0.28);
    const grad = c.createLinearGradient(0, pts[0].y - wBase, 0, pts[0].y + wBase);
    grad.addColorStop(0, '#ff8fbc');
    grad.addColorStop(0.55, '#ff6ba6');
    grad.addColorStop(1, '#d94b83');
    c.fillStyle = grad;
    c.fill();
    c.lineWidth = Math.max(1.5, wBase * 0.06);
    c.strokeStyle = '#b13a67';
    c.stroke();

    // centre groove
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.lineWidth = Math.max(1.2, wBase * 0.05);
    c.strokeStyle = 'rgba(170, 50, 95, 0.55)';
    c.stroke();

    // gloss along the top edge
    const gloss = [];
    for (let i = 0; i < pts.length; i++) {
      const s = i / (pts.length - 1);
      const gw = sides.left[i].wid * 0.45;
      gloss.push({
        x: (sides.left[i].x + pts[i].x) / 2,
        y: (sides.left[i].y + pts[i].y) / 2 - gw * 0.05,
      });
    }
    c.beginPath();
    c.moveTo(gloss[0].x, gloss[0].y);
    for (let i = 1; i < gloss.length; i++) c.lineTo(gloss[i].x, gloss[i].y);
    c.lineWidth = Math.max(1.5, wBase * 0.17);
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = 'rgba(255, 206, 226, 0.55)';
    c.stroke();

    // tip pressure blob on contact
    if (p > 0.985) {
      const pulse = 1 + Math.sin(t * 14) * 0.06;
      const tr = wBase * 0.62 * pulse;
      const rg = c.createRadialGradient(S.tx, S.ty, tr * 0.2, S.tx, S.ty, tr * 1.9);
      rg.addColorStop(0, 'rgba(255, 140, 185, 0.55)');
      rg.addColorStop(1, 'rgba(255, 140, 185, 0)');
      c.fillStyle = rg;
      c.beginPath();
      c.arc(S.tx, S.ty, tr * 1.9, 0, Math.PI * 2);
      c.fill();

      c.fillStyle = '#ff7fb0';
      c.beginPath();
      c.ellipse(S.tx, S.ty, tr, tr * 0.86, 0, 0, Math.PI * 2);
      c.fill();
      c.strokeStyle = '#b13a67';
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = 'rgba(255, 215, 231, 0.8)';
      c.beginPath();
      c.ellipse(S.tx - tr * 0.25, S.ty - tr * 0.3, tr * 0.26, tr * 0.18, -0.5, 0, Math.PI * 2);
      c.fill();
    }
  }

  // ---- splat effects ----------------------------------------------------
  if (!S.splat && t >= T_CONTACT && S.p > 0.9) {
    S.splat = true;
    S.rings.push({ t0: t });
    S.rings.push({ t0: t + 0.12 });
    for (let i = 0; i < 20; i++) {
      const a = ctx.rand() * Math.PI * 2;
      const sp = 60 + ctx.rand() * 260;
      S.droplets.push({
        x: S.tx,
        y: S.ty,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - 80,
        life: 0.6 + ctx.rand() * 0.7,
        age: 0,
        size: 3 + ctx.rand() * 7,
      });
    }
  }

  for (let i = S.rings.length - 1; i >= 0; i--) {
    const ring = S.rings[i];
    const age = t - ring.t0;
    if (age < 0) continue;
    if (age > 0.9) {
      S.rings.splice(i, 1);
      continue;
    }
    const rr = S.r * 0.15 + age * S.r * 1.9;
    c.beginPath();
    c.arc(S.tx, S.ty, rr, 0, Math.PI * 2);
    c.lineWidth = Math.max(1, 5 * (1 - age / 0.9));
    c.strokeStyle = `rgba(255, 130, 180, ${0.55 * (1 - age / 0.9)})`;
    c.stroke();
  }

  for (let i = S.droplets.length - 1; i >= 0; i--) {
    const d = S.droplets[i];
    d.age += dt || 0.016;
    d.vy += 900 * (dt || 0.016);
    d.x += d.vx * (dt || 0.016);
    d.y += d.vy * (dt || 0.016);
    if (d.age > d.life || d.y > h + 40) {
      S.droplets.splice(i, 1);
      continue;
    }
    const a = clamp(1 - d.age / d.life, 0, 1);
    c.fillStyle = `rgba(255, 120, 172, ${0.85 * a})`;
    c.beginPath();
    c.ellipse(d.x, d.y, d.size * 0.75, d.size, 0.3, 0, Math.PI * 2);
    c.fill();
  }

  // ---- stamp ------------------------------------------------------------
  if (t >= T_CONTACT && t < T_CONTACT + 1.7) {
    const lt = t - T_CONTACT;
    const pop = lt < 0.22 ? 0.4 + (lt / 0.22) * 0.8 : 1.1 - Math.min(0.1, (lt - 0.22) * 0.2);
    const fade = lt > 1.25 ? 1 - clamp((lt - 1.25) / 0.45, 0, 1) : 1;
    c.save();
    c.translate(S.tx, S.ty - S.r * 0.55);
    c.rotate(-0.18);
    c.scale(pop, pop);
    c.globalAlpha = fade;
    c.font = `900 ${Math.max(22, Math.round(S.r * 0.55))}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = Math.max(4, S.r * 0.12);
    c.strokeStyle = 'rgba(25, 8, 25, 0.75)';
    c.strokeText('MWAH!', 0, 0);
    c.fillStyle = '#ff8dbd';
    c.fillText('MWAH!', 0, 0);
    c.restore();
  }

  // ---- captions ---------------------------------------------------------
  const cap =
    t < T_CONTACT
      ? 'SOMETHING WOULD LIKE A WORD WITH SAVORYSAILOR'
      : 'DIRECT TONGUE CONTACT. STREAMER HOLD STILL.';
  if (t > 1.0 && t < T_RET0 + 0.3 && cap) {
    const a = t < 1.4 ? clamp((t - 1.0) / 0.4, 0, 1) : 1;
    c.save();
    c.globalAlpha = a;
    c.font = `800 ${Math.max(14, Math.round(Math.min(w * 0.028, 34)))}px sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.lineWidth = 6;
    c.strokeStyle = 'rgba(20, 10, 30, 0.7)';
    c.strokeText(cap, w / 2, h * 0.09, w * 0.9);
    c.fillStyle = '#ffd0e3';
    c.fillText(cap, w / 2, h * 0.09, w * 0.9);
    c.restore();
  }

  if (t > T_END && !S.done) {
    S.done = true;
    try {
      ctx.done();
    } catch (e) {}
  }
}

export function dispose() {
  S.ready = false;
}
