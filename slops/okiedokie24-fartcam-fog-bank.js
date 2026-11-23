export const meta = {
  title: 'Fartcam Fog Bank',
  author: 'okiedokie24',
  prompt: 'when a user type !fartcam have a green gas cloud pass though the streamers camera',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
  triggers: [
    { "type": "chat", "mode": "word", "patterns": ["!fartcam"], "caseSensitive": false }
  ]
};

const GREEN = '#9dff70';
const LIME = '#d8ffb4';
const WARN = '#ffe066';

let S = null;
let puffs = [];
let drops = [];
let fired = {};
let ended = false;

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function smooth(x) { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
function easeOutBack(x) {
  const c = 1.70158, c3 = c + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
}
function rr(g, x, y, w, h, r) {
  r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

function sanitize(name) {
  return String(name || '').replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20).toUpperCase();
}

export function init(ctx) {
  S = ctx.streamer
    ? { x: ctx.streamer.x, y: ctx.streamer.y, w: ctx.streamer.w, h: ctx.streamer.h }
    : { x: 0.22, y: 0.18, w: 0.56, h: 0.62 };

  puffs = [];
  for (let i = 0; i < 84; i++) {
    puffs.push({
      ang: ctx.rand() * Math.PI * 2,
      dist: Math.pow(ctx.rand(), 0.62),
      r: 0.055 + ctx.rand() * 0.135,
      phase: ctx.rand() * Math.PI * 2,
      spin: (0.18 + ctx.rand() * 0.75) * (ctx.rand() < 0.5 ? -1 : 1),
      shade: ctx.rand()
    });
  }

  drops = [];
  for (let i = 0; i < 26; i++) {
    drops.push({
      x: 0.06 + ctx.rand() * 0.88,
      y: 0.05 + ctx.rand() * 0.9,
      r: 0.004 + ctx.rand() * 0.011,
      drift: 0.006 + ctx.rand() * 0.014,
      ph: ctx.rand() * Math.PI * 2
    });
  }

  fired = {};
  ended = false;
}

function cue(ctx, key, fn) {
  if (!fired[key]) {
    fired[key] = true;
    fn();
  }
}

function plate(g, text, x, y, size, color, alpha, align) {
  g.save();
  g.font = '700 ' + size + 'px "Segoe UI", Arial, sans-serif';
  const tw = g.measureText(text).width;
  const padX = size * 0.62;
  const w = tw + padX * 2;
  const h = size * 1.85;
  let px = x;
  if (align === 'center') px = x - w / 2;
  else if (align === 'right') px = x - w;

  g.globalAlpha = clamp(alpha, 0, 1);
  g.fillStyle = 'rgba(6,16,22,0.64)';
  rr(g, px, y - h / 2, w, h, size * 0.24);
  g.fill();

  g.strokeStyle = color;
  g.lineWidth = Math.max(1, size * 0.07);
  rr(g, px, y - h / 2, w, h, size * 0.24);
  g.stroke();

  g.fillStyle = color;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(text, px + padX, y + size * 0.05);
  g.restore();
  return { x: px, w: w };
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width, H = ctx.height;
  g.clearRect(0, 0, W, H);

  if (!S) init(ctx);

  const u = Math.max(0.72, Math.min(W / 1280, H / 720));
  const sx0 = S.x * W, sy0 = S.y * H, sw = S.w * W, sh = S.h * H;
  const scx = sx0 + sw / 2, scy = sy0 + sh / 2;
  const pad = 15 * u;

  // ---- timeline ----------------------------------------------------------
  const p = smooth(clamp((t - 1.05) / 7.6, 0, 1));
  const cx = -0.30 * W + p * 1.62 * W;
  const cy = scy + Math.sin(p * Math.PI * 1.15) * sh * 0.14;
  const R = Math.max(sw, sh) * 0.66 * (0.82 + 0.34 * Math.sin(p * Math.PI));
  const env = smooth(clamp(p / 0.13, 0, 1)) * smooth(clamp((1 - p) / 0.18, 0, 1));

  const nd = Math.hypot((cx - scx) / (W * 0.5), (cy - scy) / (H * 0.5));
  const haze = clamp(env * (1.22 - nd), 0, 1);

  // ---- sound cues --------------------------------------------------------
  if (t > 0.12) cue(ctx, 'b1', () => ctx.sound.beep(760, 55));
  if (t > 0.44) cue(ctx, 'b2', () => ctx.sound.beep(1010, 55));
  if (t > 1.02) cue(ctx, 'n1', () => ctx.sound.noise(680));
  if (t > 2.10) cue(ctx, 'n2', () => ctx.sound.noise(430));
  if (t > 3.30) cue(ctx, 'b3', () => ctx.sound.beep(360, 70));
  if (t > 4.60) cue(ctx, 'b4', () => ctx.sound.beep(415, 70));
  if (t > 5.90) cue(ctx, 'b5', () => ctx.sound.beep(470, 70));
  if (t > 7.20) cue(ctx, 'n3', () => ctx.sound.noise(560));
  if (t > 8.85) cue(ctx, 'n4', () => ctx.sound.noise(380));
  if (t > 9.12) cue(ctx, 'b6', () => ctx.sound.beep(880, 90));
  if (t > 9.30) cue(ctx, 'b7', () => ctx.sound.beep(1240, 110));
  if (t > 10.20) cue(ctx, 'b8', () => ctx.sound.beep(1560, 90));

  // ---- lens haze inside the streamer's camera ---------------------------
  if (haze > 0.02) {
    g.save();
    g.beginPath();
    g.rect(sx0, sy0, sw, sh);
    g.clip();

    const hg = g.createRadialGradient(cx, cy, 0, cx, cy, Math.max(sw, sh) * 0.95);
    hg.addColorStop(0, 'rgba(96,236,110,' + (0.20 * haze) + ')');
    hg.addColorStop(0.55, 'rgba(72,196,100,' + (0.15 * haze) + ')');
    hg.addColorStop(1, 'rgba(40,130,80,0)');
    g.fillStyle = hg;
    g.fillRect(sx0, sy0, sw, sh);

    // condensation on the glass
    g.fillStyle = 'rgba(210,255,205,' + (0.22 * haze) + ')';
    for (const d of drops) {
      const dx = sx0 + d.x * sw;
      const dy = sy0 + ((d.y + t * d.drift) % 1) * sh;
      const dr = d.r * Math.min(sw, sh) * (1 + 0.25 * Math.sin(t * 2 + d.ph));
      g.beginPath();
      g.arc(dx, dy, dr, 0, 6.2832);
      g.fill();
    }
    g.restore();
  }

  // ---- the cloud ---------------------------------------------------------
  if (env > 0.01) {
    const a = env * 0.55;

    const blob = g.createRadialGradient(cx, cy, R * 0.08, cx, cy, R * 1.18);
    blob.addColorStop(0, 'rgba(118,246,120,' + (a * 0.5) + ')');
    blob.addColorStop(0.62, 'rgba(74,198,96,' + (a * 0.28) + ')');
    blob.addColorStop(1, 'rgba(46,150,78,0)');
    g.fillStyle = blob;
    g.beginPath();
    g.arc(cx, cy, R * 1.18, 0, 6.2832);
    g.fill();

    for (const pf of puffs) {
      const spin = pf.ang + t * pf.spin;
      const wob = 1 + 0.07 * Math.sin(t * 1.7 + pf.phase);
      const d = pf.dist * wob;
      const px = cx + Math.cos(spin) * d * R;
      const py = cy + Math.sin(spin) * d * R * 0.78 + Math.sin(t * 2.1 + pf.phase) * R * 0.035;
      const pr = Math.max(1, pf.r * R);
      const pa = a * (0.45 + 0.55 * pf.shade);
      g.fillStyle = 'rgba(' + (92 + (pf.shade * 58) | 0) + ',' + (208 + (pf.shade * 42) | 0) + ',' + (78 + (pf.shade * 46) | 0) + ',' + pa + ')';
      g.beginPath();
      g.arc(px, py, pr, 0, 6.2832);
      g.fill();
      g.fillStyle = 'rgba(225,255,196,' + (pa * 0.18) + ')';
      g.beginPath();
      g.arc(px - pr * 0.26, py - pr * 0.3, pr * 0.5, 0, 6.2832);
      g.fill();
    }
  }

  // ---- early sensor sweep -------------------------------------------------
  if (t > 0.18 && t < 1.55) {
    const sp = clamp((t - 0.18) / 1.3, 0, 1);
    const yy = sy0 + sp * sh;
    const fa = 1 - sp;
    g.save();
    g.beginPath();
    g.rect(sx0, sy0, sw, sh);
    g.clip();
    const lg = g.createLinearGradient(sx0, yy, sx0 + sw, yy);
    lg.addColorStop(0, 'rgba(157,255,112,0)');
    lg.addColorStop(0.5, 'rgba(157,255,112,' + (0.75 * fa) + ')');
    lg.addColorStop(1, 'rgba(157,255,112,0)');
    g.strokeStyle = lg;
    g.lineWidth = 2 * u;
    g.beginPath();
    g.moveTo(sx0, yy);
    g.lineTo(sx0 + sw, yy);
    g.stroke();
    g.restore();
  }

  // ---- camera brackets ----------------------------------------------------
  const brIn = smooth(clamp((t - 0.02) / 0.42, 0, 1));
  const brOut = clamp((11.25 - t) / 0.45, 0, 1);
  const brA = brIn * brOut;
  if (brA > 0.01) {
    const grow = 1 + (1 - brIn) * 0.22;
    const bx0 = sx0 - pad - (grow - 1) * sw * 0.5;
    const by0 = sy0 - pad - (grow - 1) * sh * 0.5;
    const bw = sw + pad * 2 + (grow - 1) * sw;
    const bh = sh + pad * 2 + (grow - 1) * sh;
    const arm = Math.min(bw, bh) * 0.12;
    const stroke = haze > 0.55 ? WARN : GREEN;

    g.save();
    g.globalAlpha = brA;
    g.strokeStyle = stroke;
    g.lineWidth = 3 * u;
    g.lineCap = 'round';
    g.shadowColor = stroke;
    g.shadowBlur = 14 * u;

    g.beginPath();
    g.moveTo(bx0, by0 + arm); g.lineTo(bx0, by0); g.lineTo(bx0 + arm, by0);
    g.moveTo(bx0 + bw - arm, by0); g.lineTo(bx0 + bw, by0); g.lineTo(bx0 + bw, by0 + arm);
    g.moveTo(bx0, by0 + bh - arm); g.lineTo(bx0, by0 + bh); g.lineTo(bx0 + arm, by0 + bh);
    g.moveTo(bx0 + bw - arm, by0 + bh); g.lineTo(bx0 + bw, by0 + bh); g.lineTo(bx0 + bw, by0 + bh - arm);
    g.stroke();
    g.restore();

    // live tag
    const tagY = clamp(by0 - 22 * u, 22 * u, H - 22 * u);
    g.save();
    g.globalAlpha = brA;
    g.fillStyle = '#ff5d6c';
    const dotPulse = 0.55 + 0.45 * Math.sin(t * 5.2);
    g.beginPath();
    g.arc(bx0 + 8 * u, tagY, 5.5 * u * (0.8 + 0.2 * dotPulse), 0, 6.2832);
    g.fill();
    g.restore();
    plate(g, 'GAS-CAM · LIVE', bx0 + 20 * u, tagY, 17 * u, GREEN, brA, 'left');

    const subY = clamp(tagY + 34 * u, 52 * u, H - 18 * u);
    if (t > 0.35) plate(g, 'SUBJECT: SAVORYSAILOR', bx0, subY, 13 * u, LIME, brA, 'left');
  }

  // ---- culprit caption ----------------------------------------------------
  if (t > 2.05 && t < 9.4) {
    let who = 'SUMMONED BY: NOBODY WILL ADMIT IT';
    if (ctx.trigger && ctx.trigger.login) {
      const n = sanitize(ctx.trigger.login);
      if (n) who = 'SUMMONED BY: ' + n;
    }
    const ca = smooth(clamp((t - 2.05) / 0.4, 0, 1)) * clamp((9.4 - t) / 0.5, 0, 1);
    const cy2 = clamp(sy0 + sh + pad + 26 * u, 24 * u, H - 22 * u);
    plate(g, who, clamp(sx0 - pad, 12 * u, W - 12 * u), cy2, 13 * u, WARN, ca, 'left');
  }

  // ---- particulate meter --------------------------------------------------
  const mW = Math.min(250 * u, W * 0.44);
  const mX = clamp(24 * u, 8 * u, W - mW - 8 * u);
  const mY = H - 46 * u;
  const density = clamp(haze + (t > 8.8 ? 0 : 0), 0, 1);
  const ticks = 12;
  g.save();
  g.globalAlpha = 0.92;
  g.font = '700 ' + (11 * u) + 'px "Segoe UI", Arial, sans-serif';
  g.fillStyle = density > 0.7 ? WARN : GREEN;
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText('PARTICULATE DENSITY', mX, mY - 16 * u);
  for (let i = 0; i < ticks; i++) {
    const lit = i < Math.round(density * ticks);
    const tw2 = mW / ticks - 3 * u;
    g.fillStyle = lit
      ? (i > ticks - 4 ? WARN : GREEN)
      : 'rgba(140,190,160,0.22)';
    g.fillRect(mX + i * (tw2 + 3 * u), mY, tw2, 10 * u);
  }
  g.restore();

  // ---- punchline stamp ----------------------------------------------------
  if (t > 9.05) {
    const sIn = clamp((t - 9.05) / 0.42, 0, 1);
    const pop = 1 + Math.sin(clamp(sIn, 0, 1) * Math.PI) * 0.10;
    const scale = easeOutBack(sIn) * pop;
    const fade = clamp((11.15 - t) / 0.42, 0, 1);
    const stepY = clamp(sy0 + sh + pad + 88 * u, H * 0.5, H - 100 * u);
    const stepX = scx;

    g.save();
    g.globalAlpha = fade;
    g.translate(stepX, stepY);
    g.rotate(-0.055);
    g.scale(scale, scale);

    const tw2 = 380 * u, th2 = 104 * u;
    g.fillStyle = 'rgba(8,22,16,0.66)';
    rr(g, -tw2 / 2, -th2 / 2, tw2, th2, 10 * u);
    g.fill();
    g.strokeStyle = GREEN;
    g.lineWidth = 4 * u;
    rr(g, -tw2 / 2, -th2 / 2, tw2, th2, 10 * u);
    g.stroke();
    g.strokeStyle = 'rgba(157,255,112,0.45)';
    g.lineWidth = 1.5 * u;
    rr(g, -tw2 / 2 + 6 * u, -th2 / 2 + 6 * u, tw2 - 12 * u, th2 - 12 * u, 7 * u);
    g.stroke();

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = LIME;
    g.font = '800 ' + (34 * u) + 'px "Segoe UI", Arial, sans-serif';
    g.fillText('CAMERA CLEARED', 0, -13 * u);
    g.fillStyle = WARN;
    g.font = '700 ' + (14 * u) + 'px "Segoe UI", Arial, sans-serif';
    g.fillText('AIR QUALITY: SPICY · EXHAUST VENTED', 0, 26 * u);
    g.restore();
  }

  // ---- final nudge --------------------------------------------------------
  if (t > 9.8 && t < 11.25) {
    const fa = smooth(clamp((t - 9.8) / 0.35, 0, 1)) * clamp((11.25 - t) / 0.4, 0, 1);
    plate(g, 'SAVORYSAILOR, PLEASE OPEN A WINDOW', W / 2, H - 92 * u, 15 * u, LIME, fa, 'center');
  }

  if (!ended && t > 11.15) {
    ended = true;
    ctx.done();
  }
}

export function dispose(ctx) {
  puffs = [];
  drops = [];
  S = null;
  fired = {};
}
