export const meta = {
  title: 'Hungry Mega Musk',
  author: 'doctordiggitydank',
  prompt: 'A giant Elon Musk appears from the left side of the screen, crawling toward the streamer, saying "HUNGRY FOR DADDY", then unhinges his jaw and eats the streamer, then explodes in confetti.',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const COL = {
  skin: '#e9b98d',
  skinShade: '#d39a6d',
  hair: '#43302a',
  suit: '#1b2337',
  suitLight: '#2b3652',
  tie: '#ff4fa3',
  maw: '#2a0a12',
  mawInner: '#6c1b2e',
  tongue: '#c8546d',
  teeth: '#f6f1e3',
  ink: '#161a26',
};

const CONFETTI = ['#ff4fa3', '#ffd166', '#4cc9f0', '#f8f9fa', '#8bf58b', '#ff8c42'];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, k) { return a + (b - a) * k; }
function smooth(k) { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); }
function easeOut(k) { k = clamp(k, 0, 1); return 1 - (1 - k) * (1 - k); }
function easeIn(k) { k = clamp(k, 0, 1); return k * k; }
function fade(t, a, b, f) {
  if (t < a || t > b) return 0;
  return Math.min(1, (t - a) / f, (b - t) / f);
}

function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
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

function beep(ctx, freq, ms) {
  try { ctx.sound.beep(freq, ms); } catch (e) { /* sandbox */ }
}
function noise(ctx, ms) {
  try { ctx.sound.noise(ms); } catch (e) { /* sandbox */ }
}
function once(ctx, st, key, fn) {
  if (st.fired[key]) return;
  st.fired[key] = true;
  fn();
}

/* ------------------------------------------------------------------ */
/* state                                                               */
/* ------------------------------------------------------------------ */

export function init(ctx) {
  ctx._s = {
    fired: {},
    parts: [],
    dust: [],
    exploded: false,
    doneCalled: false,
    nextThump: 0.25,
    flash: 0,
  };
}

/* ------------------------------------------------------------------ */
/* the giant                                                           */
/* ------------------------------------------------------------------ */

function drawArm(c, ax, ay, bx, by, wide, color) {
  c.strokeStyle = color;
  c.lineCap = 'round';
  c.lineWidth = wide;
  c.beginPath();
  c.moveTo(ax, ay);
  c.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 + wide * 0.4, bx, by);
  c.stroke();
}

function drawHand(c, x, y, r, color, skin) {
  c.save();
  roundRect(c, x - r, y - r * 0.7, r * 2, r * 1.35, r * 0.6);
  c.fillStyle = skin;
  c.fill();
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, r * 0.08);
  c.stroke();
  // knuckle lines
  c.beginPath();
  for (let i = -1; i <= 1; i++) {
    c.moveTo(x + i * r * 0.55, y - r * 0.55);
    c.lineTo(x + i * r * 0.55, y - r * 0.12);
  }
  c.globalAlpha = 0.45;
  c.stroke();
  c.restore();
}

function drawGiant(c, W, H, cx, cy, hw, hh, jaw, squash, t) {
  const shoulderY = cy + hh * 1.15;
  const groundY = H * 0.99;
  const bob = Math.sin(t * 7.5) * hh * 0.05;
  const suitBase = COL.suit;

  // rear shoulder hump (body slides in from the left)
  c.save();
  c.beginPath();
  c.ellipse(cx - hw * 1.35, cy + hh * 1.75 + bob, hw * 1.9, hh * 1.15, -0.15, 0, Math.PI * 2);
  c.fillStyle = suitBase;
  c.fill();
  c.beginPath();
  c.ellipse(cx - hw * 0.6, cy + hh * 1.6 + bob, hw * 1.15, hh * 0.9, 0, 0, Math.PI * 2);
  c.fillStyle = COL.suitLight;
  c.globalAlpha = 0.55;
  c.fill();
  c.globalAlpha = 1;
  c.restore();

  // arms crawl toward the camera
  const step = Math.sin(t * 7.5);
  const handLX = cx - hw * 0.95 + step * hw * 0.22;
  const handRX = cx + hw * 0.85 - step * hw * 0.22;
  const armWide = hw * 0.34;
  drawArm(c, cx - hw * 0.7, shoulderY, handLX, groundY - hh * 0.15, armWide, suitBase);
  drawArm(c, cx + hw * 0.55, shoulderY, handRX, groundY - hh * 0.15, armWide, suitBase);
  drawHand(c, handLX, groundY - hh * 0.1, hw * 0.34, COL.ink, COL.skin);
  drawHand(c, handRX, groundY - hh * 0.1, hw * 0.32, COL.ink, COL.skin);

  // pink tie dangling
  c.save();
  c.beginPath();
  c.moveTo(cx - hw * 0.1, cy + hh * 0.95 + bob);
  c.lineTo(cx + hw * 0.1, cy + hh * 0.95 + bob);
  c.lineTo(cx + hw * 0.16, cy + hh * 1.75 + bob);
  c.lineTo(cx, cy + hh * 1.9 + bob);
  c.lineTo(cx - hw * 0.16, cy + hh * 1.75 + bob);
  c.closePath();
  c.fillStyle = COL.tie;
  c.fill();
  c.restore();

  // head group (with squash when chomping)
  c.save();
  c.translate(cx, cy + bob);
  c.scale(1 + squash * 0.05, 1 - squash * 0.08);

  const mouthY = hh * 0.26;
  const jawDrop = jaw * hh * 1.55;
  const jawCY = mouthY + hh * 0.34 + jawDrop;
  const jawRX = hw * 0.76;
  const jawRY = hh * 0.34;

  // cranium
  c.beginPath();
  c.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
  c.fillStyle = COL.skin;
  c.fill();

  // cheek shading
  c.save();
  c.beginPath();
  c.ellipse(0, 0, hw, hh, 0, 0, Math.PI * 2);
  c.clip();
  c.globalAlpha = 0.18;
  c.fillStyle = COL.skinShade;
  c.beginPath();
  c.ellipse(hw * 0.55, hh * 0.15, hw * 0.7, hh * 0.9, 0, 0, Math.PI * 2);
  c.fill();
  c.restore();

  // hair cap
  c.save();
  c.beginPath();
  c.ellipse(0, 0, hw * 1.005, hh * 1.005, 0, 0, Math.PI * 2);
  c.clip();
  c.fillStyle = COL.hair;
  c.beginPath();
  c.ellipse(0, -hh * 0.72, hw * 0.95, hh * 0.62, 0, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.ellipse(0, -hh * 0.45, hw * 1.02, hh * 0.3, 0, 0, Math.PI * 2);
  c.globalAlpha = 0.9;
  c.fill();
  c.restore();

  // neck shadow under chin when closed
  // maw
  if (jaw > 0.02) {
    const mawY = (mouthY + jawCY - jawRY * 0.55) / 2;
    const mawRY = Math.max(hh * 0.1, (jawCY - jawRY * 0.55 - mouthY) * 0.62 + hh * 0.05);
    c.beginPath();
    c.ellipse(0, mawY, hw * 0.66, mawRY, 0, 0, Math.PI * 2);
    c.fillStyle = COL.maw;
    c.fill();
    c.beginPath();
    c.ellipse(0, mawY + mawRY * 0.25, hw * 0.46, mawRY * 0.6, 0, 0, Math.PI * 2);
    c.fillStyle = COL.mawInner;
    c.fill();
    // tongue
    c.beginPath();
    c.ellipse(0, jawCY - jawRY * 0.6, hw * 0.42, mawRY * 0.45, 0, 0, Math.PI * 2);
    c.fillStyle = COL.tongue;
    c.fill();
  }

  // lower jaw
  c.beginPath();
  c.ellipse(0, jawCY, jawRX, jawRY, 0, 0, Math.PI * 2);
  c.fillStyle = COL.skin;
  c.fill();

  // jaw inner lip
  if (jaw > 0.02) {
    c.beginPath();
    c.ellipse(0, jawCY - jawRY * 0.55, jawRX * 0.82, jawRY * 0.5, 0, 0, Math.PI * 2);
    c.fillStyle = COL.mawInner;
    c.fill();
    // lower teeth
    c.fillStyle = COL.teeth;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const fx = lerp(-jawRX * 0.66, jawRX * 0.66, i / (n - 1));
      const tw = jawRX * 0.13;
      const th = hh * 0.15 * clamp(jaw * 1.4, 0, 1);
      c.beginPath();
      c.moveTo(fx - tw / 2, jawCY - jawRY * 0.62);
      c.lineTo(fx + tw / 2, jawCY - jawRY * 0.62);
      c.lineTo(fx, jawCY - jawRY * 0.62 - th);
      c.closePath();
      c.fill();
    }
  }

  // upper lip line + upper teeth
  if (jaw > 0.02) {
    c.fillStyle = COL.teeth;
    const n = 7;
    for (let i = 0; i < n; i++) {
      const fx = lerp(-hw * 0.6, hw * 0.6, i / (n - 1));
      const tw = hw * 0.12;
      const th = hh * 0.16 * clamp(jaw * 1.4, 0, 1);
      c.beginPath();
      c.moveTo(fx - tw / 2, mouthY - hh * 0.02);
      c.lineTo(fx + tw / 2, mouthY - hh * 0.02);
      c.lineTo(fx, mouthY - hh * 0.02 + th);
      c.closePath();
      c.fill();
    }
  } else {
    // smug closed mouth
    c.strokeStyle = COL.ink;
    c.lineWidth = hh * 0.045;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-hw * 0.38, mouthY);
    c.quadraticCurveTo(0, mouthY + hh * 0.04, hw * 0.42, mouthY - hh * 0.05);
    c.stroke();
  }

  // nose
  c.beginPath();
  c.moveTo(-hw * 0.02, -hh * 0.08);
  c.quadraticCurveTo(-hw * 0.16, hh * 0.1, -hw * 0.09, hh * 0.14);
  c.quadraticCurveTo(0, hh * 0.19, hw * 0.1, hh * 0.13);
  c.quadraticCurveTo(hw * 0.16, hh * 0.08, hw * 0.03, -hh * 0.08);
  c.closePath();
  c.fillStyle = COL.skinShade;
  c.fill();

  // eyes
  const eyeY = -hh * 0.3;
  const eyeX = hw * 0.4;
  const eyeR = hw * 0.115;
  for (const sgn of [-1, 1]) {
    c.beginPath();
    c.ellipse(sgn * eyeX, eyeY, eyeR, eyeR * 0.85, 0, 0, Math.PI * 2);
    c.fillStyle = '#fbf8f1';
    c.fill();
    c.strokeStyle = COL.ink;
    c.lineWidth = Math.max(1.5, hw * 0.012);
    c.stroke();
    c.beginPath();
    c.arc(sgn * eyeX + eyeR * 0.28, eyeY + eyeR * 0.06, eyeR * 0.42, 0, Math.PI * 2);
    c.fillStyle = '#2a3547';
    c.fill();
    c.beginPath();
    c.arc(sgn * eyeX + eyeR * 0.45, eyeY - eyeR * 0.12, eyeR * 0.13, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
  }

  // brows
  c.strokeStyle = COL.hair;
  c.lineWidth = hh * 0.05;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-hw * 0.58, -hh * 0.47);
  c.quadraticCurveTo(-hw * 0.38, -hh * 0.55, -hw * 0.22, -hh * 0.45);
  c.stroke();
  c.beginPath();
  c.moveTo(hw * 0.22, -hh * 0.45);
  c.quadraticCurveTo(hw * 0.4, -hh * 0.55, hw * 0.58, -hh * 0.46);
  c.stroke();

  c.restore();
}

/* ------------------------------------------------------------------ */
/* speech bubble                                                       */
/* ------------------------------------------------------------------ */

function drawBubble(c, W, H, cx, cy, hw, hh, text, alpha) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.font = `800 ${Math.round(hh * 0.33)}px "Trebuchet MS", system-ui, sans-serif`;
  const tw = c.measureText(text).width;
  const bw = tw + hh * 0.55;
  const bh = hh * 0.62;
  let bx = cx - bw * 0.72;
  let by = cy - hh * 2.15;
  bx = clamp(bx, hh * 0.1, W - bw - hh * 0.1);
  by = Math.max(hh * 0.1, by);

  roundRect(c, bx, by, bw, bh, bh * 0.28);
  c.fillStyle = 'rgba(252, 246, 236, 0.96)';
  c.fill();
  c.strokeStyle = COL.ink;
  c.lineWidth = Math.max(2, hh * 0.028);
  c.stroke();

  // tail
  c.beginPath();
  c.moveTo(bx + bw * 0.38, by + bh - 2);
  c.lineTo(bx + bw * 0.3, by + bh + bh * 0.34);
  c.lineTo(bx + bw * 0.52, by + bh - 2);
  c.closePath();
  c.fillStyle = 'rgba(252, 246, 236, 0.96)';
  c.fill();
  c.strokeStyle = COL.ink;
  c.stroke();

  c.fillStyle = COL.ink;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(text, bx + bw / 2, by + bh / 2);
  c.restore();
}

/* ------------------------------------------------------------------ */
/* captions                                                            */
/* ------------------------------------------------------------------ */

function drawCaption(c, W, H, text, alpha, color) {
  if (alpha <= 0.01) return;
  c.save();
  c.globalAlpha = alpha;
  c.font = `700 ${Math.round(H * 0.042)}px "Trebuchet MS", system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const tw = c.measureText(text).width;
  const bh = H * 0.075;
  const bw = tw + H * 0.06;
  const bx = W / 2 - bw / 2;
  const by = H * 0.885 - bh / 2;
  roundRect(c, bx, by, bw, bh, bh * 0.32);
  c.fillStyle = 'rgba(12, 16, 32, 0.84)';
  c.fill();
  c.strokeStyle = color;
  c.lineWidth = Math.max(2, H * 0.0035);
  c.stroke();
  c.fillStyle = '#fff';
  c.fillText(text, W / 2, by + bh / 2 + 1);
  c.restore();
}

/* ------------------------------------------------------------------ */
/* frame                                                               */
/* ------------------------------------------------------------------ */

export function frame(ctx, t, dt) {
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  if (!ctx._s) init(ctx);
  const st = ctx._s;

  c.clearRect(0, 0, W, H);

  const S = ctx.streamer || { x: 0.6, y: 0.14, w: 0.34, h: 0.66 };
  const sx = S.x * W;
  const sy = S.y * H;
  const sw = S.w * W;
  const sh = S.h * H;
  const targetX = sx + sw * 0.5;
  const targetY = sy + sh * 0.34;

  const unit = Math.min(W, H);
  const hw = unit * 0.25;
  const hh = unit * 0.28;

  // timeline
  const CRAWL_A = 0.6;
  const CRAWL_B = 6.7;
  const JAW_A = 6.95;
  const JAW_B = 8.55;
  const CHOMP = 8.95;
  const BURST = 10.85;
  const END = 14.2;

  const crawlP = smooth((t - CRAWL_A) / (CRAWL_B - CRAWL_A));
  const cx = lerp(-hw * 1.6, targetX, crawlP);
  const cy = lerp(H * 0.62, targetY, crawlP) + Math.sin(t * 7.5) * hh * 0.06 * (1 - crawlP) * 4;

  let jaw = 0;
  if (t >= JAW_A && t < CHOMP) jaw = smooth((t - JAW_A) / (JAW_B - JAW_A));
  else if (t >= CHOMP) jaw = Math.max(0, 1 - easeIn((t - CHOMP) / 0.2));

  let squash = 0;
  if (t > CHOMP && t < BURST) squash = Math.sin(clamp((t - CHOMP) / 1.7, 0, 1) * Math.PI);

  // screen shake on the chomp and the burst
  let shake = 0;
  if (t > CHOMP && t < CHOMP + 0.45) shake = (1 - (t - CHOMP) / 0.45) * H * 0.016;
  if (t > BURST && t < BURST + 0.5) shake = (1 - (t - BURST) / 0.5) * H * 0.02;

  c.save();
  if (shake > 0.2) {
    c.translate(Math.sin(t * 91) * shake, Math.cos(t * 77) * shake);
  }

  /* --- dust trail while crawling --- */
  if (t < CHOMP + 0.2) {
    if (t > st.nextThump && t < CRAWL_B + 0.4) {
      st.nextThump = t + 0.42;
      noise(ctx, 55);
      beep(ctx, 70 + Math.random() * 20, 40);
      st.dust.push({ x: cx + (Math.random() - 0.5) * hw, y: H * 0.98, r: unit * 0.03, life: 1, vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 30 });
    }
  }

  /* --- the target brackets on the live streamer --- */
  const bracketA = fade(t, 6.2, CHOMP + 0.25, 0.3);
  if (bracketA > 0.01) {
    c.save();
    c.globalAlpha = bracketA;
    c.strokeStyle = '#ff4fa3';
    c.lineWidth = Math.max(3, unit * 0.005);
    c.setLineDash([unit * 0.02, unit * 0.014]);
    const pad = unit * 0.018;
    c.strokeRect(sx - pad, sy - pad, sw + pad * 2, sh + pad * 2);
    c.setLineDash([]);
    c.font = `800 ${Math.round(unit * 0.026)}px system-ui, sans-serif`;
    c.fillStyle = '#ff4fa3';
    c.textAlign = 'left';
    c.textBaseline = 'bottom';
    c.fillText('TARGET: SAVORYSAILOR', sx - pad, sy - pad * 2.2);
    c.restore();
  }

  /* --- the giant (unless he has already become confetti) --- */
  if (t < BURST) {
    drawGiant(c, W, H, cx, cy, hw, hh, jaw, squash, t);
    drawBubble(c, W, H, cx, cy, hw, hh, 'HUNGRY FOR DADDY', fade(t, 6.0, 8.7, 0.35));
  }

  c.restore();

  /* --- dust puffs --- */
  for (let i = st.dust.length - 1; i >= 0; i--) {
    const d = st.dust[i];
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.vy += 40 * dt;
    d.r += unit * 0.03 * dt;
    d.life -= dt * 0.9;
    if (d.life <= 0) { st.dust.splice(i, 1); continue; }
    c.save();
    c.globalAlpha = d.life * 0.35;
    c.fillStyle = '#cfd6e4';
    c.beginPath();
    c.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  /* --- sounds --- */
  once(ctx, st, 'rumble', () => { noise(ctx, 320); beep(ctx, 48, 260); });
  once(ctx, st, 'bubble', () => { beep(ctx, 520, 90); });
  once(ctx, st, 'creak', () => { beep(ctx, 260, 120); });
  if (t > JAW_A && t < CHOMP) {
    const step = Math.floor((t - JAW_A) / 0.18);
    once(ctx, st, 'jaw' + step, () => { beep(ctx, 300 + step * 55, 45); });
  }
  once(ctx, st, 'chomp', () => { noise(ctx, 260); beep(ctx, 62, 240); beep(ctx, 41, 320); });
  once(ctx, st, 'gulp', () => { beep(ctx, 180, 130); beep(ctx, 120, 180); });
  once(ctx, st, 'gulp2', () => { beep(ctx, 150, 120); });
  once(ctx, st, 'burstSfx', () => {
    noise(ctx, 520);
    beep(ctx, 660, 90); beep(ctx, 880, 90); beep(ctx, 990, 120);
  });
  /* --- explosion --- */
  if (t >= BURST && !st.exploded) {
    st.exploded = true;
    st.flash = 1;
    const bx = clamp(cx, 0, W);
    const by = clamp(cy, 0, H);
    for (let i = 0; i < 240; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (0.15 + Math.random() * 1.1) * H;
      st.parts.push({
        x: bx + (Math.random() - 0.5) * hw,
        y: by + (Math.random() - 0.5) * hh,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - H * 0.15,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        w: unit * (0.012 + Math.random() * 0.014),
        h: unit * (0.008 + Math.random() * 0.01),
        color: CONFETTI[i % CONFETTI.length],
        life: 1,
      });
    }
  }

  /* --- flash ring --- */
  if (t >= BURST && t < BURST + 0.85) {
    const k = (t - BURST) / 0.85;
    c.save();
    c.globalAlpha = (1 - k) * 0.7;
    c.strokeStyle = '#ffd166';
    c.lineWidth = unit * 0.02 * (1 - k);
    c.beginPath();
    c.arc(clamp(cx, 0, W), clamp(cy, 0, H), unit * 0.1 + easeOut(k) * unit * 1.1, 0, Math.PI * 2);
    c.stroke();
    c.restore();
  }

  /* --- confetti physics --- */
  if (st.parts.length) {
    for (let i = st.parts.length - 1; i >= 0; i--) {
      const p = st.parts[i];
      p.vy += H * 0.55 * dt;
      p.vx *= 1 - 0.9 * dt;
      p.vy *= 1 - 0.25 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      if (p.y > H * 1.15) { st.parts.splice(i, 1); continue; }

      c.save();
      c.translate(p.x, p.y);
      c.rotate(p.rot);
      c.globalAlpha = clamp((H * 1.15 - p.y) / (H * 0.25), 0, 1);
      c.fillStyle = p.color;
      c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * (0.4 + Math.abs(Math.sin(p.rot * 1.7)) * 0.8));
      c.restore();
    }
  }

  /* --- captions --- */
  drawCaption(c, W, H, 'SAVORYSAILOR, THE JAW IS UNHINGING', fade(t, 7.4, 8.9, 0.25), '#ff4fa3');
  drawCaption(c, W, H, 'CONSUMED. ALLEGEDLY.', fade(t, 9.1, 10.8, 0.2), '#ffd166');
  drawCaption(c, W, H, 'GONE IN A BURST OF CONFETTI', fade(t, 11.0, 14.0, 0.25), '#4cc9f0');

  /* --- end --- */
  if (t > END && !st.doneCalled) {
    st.doneCalled = true;
    try { ctx.done(); } catch (e) { /* sandbox */ }
  }
}

export function dispose(ctx) {
  if (ctx && ctx._s) ctx._s = null;
}
