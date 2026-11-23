export const meta = {
  title: 'Emperor Zero Clothes',
  author: 'savorysailor',
  prompt: 'emperor trump has no clothes',
  createdAt: new Date().toISOString(),
  moderationLevel: 'anything',
  controls: `A pompous emperor parades in a suit that does not exist.
!pose - strike a fresh, magnificent pose
!boo - the crowd unleashes a boo wave
!tomato - hurl a tomato at the royal dignity
!crown - knock the crown clean off`,
};

const REVEAL = 26;
const EXIT = 52.5;

const SKIN = '#efc09a';
const SKIN_DARK = '#d9a077';
const GOLD = '#f0c25a';
const ROBE_MID = '#9c1b38';
const ROBE_DARK = '#5e0e22';
const NAVY = '#1b2552';
const STAR = '#f4c44e';

const POSES = [
  { eL: [-94, -198], hL: [-126, -240], eR: [94, -198], hR: [126, -240], foot: 34, lean: 0, tilt: 0 },
  { eL: [-88, -130], hL: [-40, -94], eR: [88, -130], hR: [40, -94], foot: 30, lean: 0.01, tilt: 0.02 },
  { eL: [-86, -206], hL: [-98, -262], eR: [86, -132], hR: [54, -96], foot: 30, lean: -0.015, tilt: -0.03 },
  { eL: [-106, -168], hL: [-58, -208], eR: [106, -168], hR: [58, -208], foot: 38, lean: 0, tilt: 0 },
  { eL: [-78, -122], hL: [-6, -142], eR: [78, -122], hR: [6, -142], foot: 26, lean: 0.02, tilt: 0.03 },
  { eL: [-98, -150], hL: [-134, -116], eR: [96, -200], hR: [124, -244], foot: 32, lean: 0.015, tilt: -0.02 },
];

const CONFETTI_COLORS = ['#f0c25a', '#ff6f91', '#f7f2e7', '#7fa8ff', '#ff9d5c'];

let S = null;

export function init(ctx) {
  S = {
    pose: 0,
    poseTimer: 3.0,
    boo: 0,
    flash: 0,
    hitFlash: 0,
    shake: 0,
    shout: null,
    bubbles: [],
    bubbleTimer: 0.7,
    confetti: [],
    sparkles: [],
    tomatoes: [],
    splats: [],
    crownOff: false,
    crown: null,
    fired: Object.create(null),
    px: ctx.width / 2,
    footY: ctx.height * 0.8,
    s: Math.min(ctx.width / 1100, ctx.height / 640),
  };
}

export function frame(ctx, t, dt) {
  if (!S) return;
  const c = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;

  if (!isFinite(dt) || dt <= 0) dt = 1 / 60;
  else dt = Math.min(dt, 0.1);

  const s = Math.min(W / 1100, H / 640);
  const cx = W * 0.5;
  const footY = H * 0.80;
  const revealed = t >= REVEAL;
  const robeStage = revealed ? clamp01((t - REVEAL) / 1.15) : 0;

  c.clearRect(0, 0, W, H);

  let px = cx;
  let bob = 0;
  let walking = false;
  if (t < 6) {
    const p = Math.min(1, t / 6);
    px = lerp(-W * 0.18, cx, easeOutCubic(p));
    walking = true;
    bob = Math.abs(Math.sin(t * 7.5)) * 8 * s;
  } else if (t > EXIT) {
    const p = Math.min(1, (t - EXIT) / 6.2);
    px = lerp(cx, W * 1.22, easeInOut(p));
    walking = true;
    bob = Math.abs(Math.sin(t * 7.5)) * 8 * s;
  } else {
    px = cx + Math.sin(t * 0.8) * 6 * s;
    bob = Math.sin(t * 1.8) * 3 * s;
  }
  if (S.shake > 0) px += Math.sin(t * 13) * 3 * s * S.shake;

  S.px = px;
  S.footY = footY;
  S.s = s;

  autoBeats(ctx, t);

  S.boo = Math.max(0, S.boo - dt);
  S.shake = Math.max(0, S.shake - dt * 2);
  S.hitFlash = Math.max(0, S.hitFlash - dt * 2);
  S.flash = Math.max(0, S.flash - dt / 0.8);
  if (S.shout) {
    S.shout.life -= dt;
    if (S.shout.life <= 0) S.shout = null;
  }

  S.poseTimer -= dt;
  if (S.poseTimer <= 0) {
    S.pose = (S.pose + 1) % POSES.length;
    S.poseTimer = revealed ? 2.2 : 3.2;
  }

  S.bubbleTimer -= dt;
  if (S.bubbleTimer <= 0 && t > 7.5 && t < 57) {
    let pool = null;
    if (t < REVEAL) pool = ['OOH', 'MMM', 'FABULOUS', 'SILK?', 'MAGNIFIQUE'];
    else if (t > REVEAL + 4.5) pool = ['BOO', 'HA!', 'BOLD', 'ICONIC', 'SHAMELESS'];
    if (pool) spawnBubble(ctx, pool[Math.floor(ctx.rand() * pool.length)]);
    S.bubbleTimer = 0.8 + ctx.rand() * 1.5;
  }

  updateParticles(ctx, dt, s);

  drawPennants(c, W, H, s, t);
  drawFloor(c, W, H, cx, footY, s, t, revealed);
  drawSpotlight(c, W, H, px, footY, s, revealed);
  drawFabric(ctx, c, px, footY, s, t, revealed);
  drawEmperor(ctx, c, t, s, px, footY, revealed, bob, robeStage);
  if (S.crown) drawCrown(c, S.crown.x, S.crown.y, s, S.crown.rot);
  drawEffects(c, W, H, s, t);
  drawCrowd(c, W, H, s, t, false);
  drawCrowd(c, W, H, s, t, true);
  drawBubbles(c, s);
  drawShout(c, W, H, s, px, footY);
  drawFlash(c, W, H, s, px, footY);
  drawHud(c, W, H, s, t, revealed);
}

export function onChat(ctx, msg) {
  if (!S || !msg) return;
  const cmd = (msg.cmd || '').toLowerCase();

  if (cmd === '!pose' || cmd === 'pose') {
    S.pose = (S.pose + 1) % POSES.length;
    S.poseTimer = 2.4;
    S.shout = { text: 'MAGNIFICENT.', life: 2.4 };
    sparkleBurst(ctx, 16);
    ctx.sound.beep(700, 80);
    ctx.sound.beep(980, 120);
  } else if (cmd === '!boo' || cmd === 'boo') {
    S.boo = Math.max(S.boo, 1.6);
    S.shake = 0.5;
    S.shout = { text: 'I HEAR ONLY ADORATION.', life: 2.6 };
    for (let i = 0; i < 6; i++) spawnBubble(ctx, i % 2 ? 'BOO' : 'BOOO');
    ctx.sound.noise(240);
    ctx.sound.beep(150, 220);
  } else if (cmd === '!tomato' || cmd === 'tomato') {
    S.shout = { text: 'WHO THREW THAT.', life: 2.4 };
    spawnTomato(ctx);
    ctx.sound.beep(320, 60);
  } else if (cmd === '!crown' || cmd === 'crown') {
    detachCrown(ctx);
  }
}

export function dispose() {
  S = null;
}

/* ---------- beats ---------- */

function autoBeats(ctx, t) {
  const fanfare = [
    [0.25, 523],
    [0.55, 659],
    [0.9, 784],
    [1.3, 1046],
    [8.5, 700],
    [18, 880],
  ];
  for (let i = 0; i < fanfare.length; i++) {
    const [when, freq] = fanfare[i];
    if (t >= when) once('fan' + i, () => ctx.sound.beep(freq, 120));
  }

  for (let i = 0; i < 9; i++) {
    const tt = 21.6 + i * 0.45;
    if (t >= tt) once('drum' + i, () => ctx.sound.beep(120 + i * 40, 55));
  }

  if (t >= REVEAL) {
    once('reveal', () => {
      ctx.sound.noise(280);
      ctx.sound.beep(1046, 180);
      ctx.sound.beep(1318, 320);
      S.flash = 1;
      S.boo = 0;
      spawnConfetti(ctx, 85);
      spawnBubble(ctx, 'GASP');
      spawnBubble(ctx, 'OH!');
      spawnBubble(ctx, 'SIR?');
      spawnBubble(ctx, '!!!');
      spawnBubble(ctx, 'THE SHORTS');
      sparkleBurst(ctx, 20);
    });
  }

  if (t >= REVEAL + 4.5) {
    once('booAuto', () => {
      S.boo = 1.4;
      ctx.sound.noise(220);
      for (let i = 0; i < 4; i++) spawnBubble(ctx, 'BOO');
    });
  }

  const tomatoTimes = [42.5, 44.0, 45.5, 47.0];
  for (let i = 0; i < tomatoTimes.length; i++) {
    const tt = tomatoTimes[i];
    if (t >= tt) {
      once('tom' + i, () => {
        spawnTomato(ctx);
        ctx.sound.beep(320, 50);
      });
    }
  }

  if (t >= 56) once('crownAuto', () => detachCrown(ctx));

  if (t >= 54) once('finalTune', () => ctx.sound.beep(784, 160));
}

function once(key, fn) {
  if (!S.fired[key]) {
    S.fired[key] = true;
    fn();
  }
}

/* ---------- actions ---------- */

function spawnTomato(ctx) {
  if (S.tomatoes.length > 8) return;
  const s = S.s || 1;
  const fromLeft = ctx.rand() < 0.5;
  const x0 = fromLeft ? -20 : ctx.width + 20;
  const y0 = ctx.height * (0.86 + ctx.rand() * 0.06);
  const x1 = S.px + (ctx.rand() - 0.5) * 70 * s;
  const y1 = S.footY - (120 + ctx.rand() * 70) * s;
  S.tomatoes.push({
    x0,
    y0,
    x1,
    y1,
    age: 0,
    dur: 0.62 + ctx.rand() * 0.18,
    arc: (70 + ctx.rand() * 50) * s,
    spin: ctx.rand() * 6,
    spinV: (ctx.rand() < 0.5 ? -1 : 1) * 12,
  });
}

function detachCrown(ctx) {
  if (S.crownOff) return;
  S.crownOff = true;
  const s = S.s || 1;
  S.crown = {
    x: S.px,
    y: S.footY - 252 * s,
    vx: 90 * s,
    vy: -270 * s,
    rot: 0,
    vr: 4.5,
    rested: false,
  };
  S.shake = 0.55;
  S.shout = { text: 'MY CROWN. I WAS WEARING THAT.', life: 2.8 };
  ctx.sound.beep(240, 90);
  ctx.sound.noise(90);
}

function sparkleBurst(ctx, n) {
  const s = S.s || 1;
  for (let i = 0; i < n; i++) {
    S.sparkles.push({
      x: S.px + (ctx.rand() - 0.5) * 190 * s,
      y: S.footY - (60 + ctx.rand() * 230) * s,
      vx: (ctx.rand() - 0.5) * 60 * s,
      vy: -ctx.rand() * 55 * s,
      life: 1,
      size: (2.5 + ctx.rand() * 4) * s,
      rot: ctx.rand() * 6.28,
      col: ctx.rand() < 0.5 ? '#fff3c4' : '#ffd166',
    });
  }
}

function spawnConfetti(ctx, n) {
  const W = ctx.width;
  const H = ctx.height;
  for (let i = 0; i < n; i++) {
    S.confetti.push({
      x: ctx.rand() * W,
      y: -20 - ctx.rand() * H * 0.25,
      vx: (ctx.rand() - 0.5) * 40,
      vy: 50 + ctx.rand() * 90,
      rot: ctx.rand() * 6.28,
      vr: (ctx.rand() - 0.5) * 8,
      w: 5 + ctx.rand() * 7,
      h: 3 + ctx.rand() * 4,
      col: CONFETTI_COLORS[Math.floor(ctx.rand() * CONFETTI_COLORS.length)],
    });
  }
}

function spawnBubble(ctx, text) {
  S.bubbles.push({
    x: ctx.width * (0.08 + ctx.rand() * 0.84),
    y: ctx.height * (0.86 + ctx.rand() * 0.03),
    text,
    life: 1,
  });
}

/* ---------- particles ---------- */

function updateParticles(ctx, dt, s) {
  for (let i = S.confetti.length - 1; i >= 0; i--) {
    const f = S.confetti[i];
    f.vy += 30 * dt;
    f.x += (f.vx + Math.sin(f.y * 0.01 + f.rot) * 12) * dt;
    f.y += f.vy * dt;
    f.rot += f.vr * dt;
    if (f.y > ctx.height + 40) S.confetti.splice(i, 1);
  }

  for (let i = S.sparkles.length - 1; i >= 0; i--) {
    const sp = S.sparkles[i];
    sp.life -= dt * 0.95;
    sp.x += sp.vx * dt;
    sp.y += sp.vy * dt;
    sp.vy += 24 * dt;
    sp.rot += dt * 2;
    if (sp.life <= 0) S.sparkles.splice(i, 1);
  }

  for (let i = S.splats.length - 1; i >= 0; i--) {
    const p = S.splats[i];
    p.life -= dt * 0.28;
    if (p.life <= 0) S.splats.splice(i, 1);
  }

  for (let i = S.bubbles.length - 1; i >= 0; i--) {
    const b = S.bubbles[i];
    b.life -= dt * 0.7;
    b.y -= 8 * dt;
    if (b.life <= 0) S.bubbles.splice(i, 1);
  }

  for (let i = S.tomatoes.length - 1; i >= 0; i--) {
    const tm = S.tomatoes[i];
    tm.age += dt;
    if (tm.age >= tm.dur) {
      S.tomatoes.splice(i, 1);
      S.splats.push({ x: tm.x1, y: tm.y1, size: 17 * s, life: 1, seed: ctx.rand() * 6.28 });
      S.hitFlash = 0.6;
      S.shake = Math.max(S.shake, 0.4);
      ctx.sound.noise(150);
      ctx.sound.beep(150, 100);
      if (ctx.rand() < 0.7) spawnBubble(ctx, 'SPLAT');
    }
  }

  if (S.crown) {
    const cr = S.crown;
    if (!cr.rested) {
      cr.vy += 1500 * s * dt;
      cr.x += cr.vx * dt;
      cr.y += cr.vy * dt;
      cr.rot += cr.vr * dt;
      const floor = S.footY + 12 * s;
      if (cr.y > floor) {
        cr.y = floor;
        if (Math.abs(cr.vy) > 90 * s) {
          cr.vy *= -0.35;
          cr.vx *= 0.6;
          cr.vr *= 0.5;
          ctx.sound.beep(180, 60);
        } else {
          cr.rested = true;
          cr.vy = 0;
          cr.vx = 0;
          cr.vr = 0;
          cr.rot = 1.25;
        }
      }
    }
  }
}

/* ---------- stage ---------- */

function drawPennants(c, W, H, s, t) {
  const y = H * 0.03;
  c.strokeStyle = 'rgba(240,200,110,0.5)';
  c.lineWidth = Math.max(1, 1.5 * s);
  c.beginPath();
  c.moveTo(0, y);
  c.quadraticCurveTo(W / 2, y + 18 * s, W, y);
  c.stroke();

  const n = Math.max(8, Math.min(30, Math.floor(W / (60 * s))));
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const x = lerp(0, W, u);
    const yy = y + Math.sin(Math.PI * u) * 18 * s;
    const sway = Math.sin(t * 1.5 + i * 0.7) * 3 * s;
    c.fillStyle = i % 3 === 0 ? 'rgba(200,40,70,0.82)' : i % 3 === 1 ? 'rgba(240,194,90,0.85)' : 'rgba(70,90,170,0.78)';
    c.beginPath();
    c.moveTo(x - 11 * s, yy);
    c.lineTo(x + 11 * s, yy);
    c.lineTo(x + sway, yy + 30 * s);
    c.closePath();
    c.fill();
  }
}

function drawFloor(c, W, H, cx, footY, s, t, revealed) {
  const g = c.createLinearGradient(0, footY - 20 * s, 0, H);
  g.addColorStop(0, revealed ? 'rgba(255,220,130,0.26)' : 'rgba(255,220,130,0.14)');
  g.addColorStop(1, 'rgba(255,220,130,0.02)');
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(cx - 78 * s, footY - 6 * s);
  c.lineTo(cx + 78 * s, footY - 6 * s);
  c.lineTo(cx + 340 * s, H + 10);
  c.lineTo(cx - 340 * s, H + 10);
  c.closePath();
  c.fill();

  c.strokeStyle = 'rgba(255,225,150,0.4)';
  c.lineWidth = Math.max(1, 2.5 * s);
  for (const dir of [-1, 1]) {
    c.beginPath();
    c.moveTo(cx + dir * 78 * s, footY - 6 * s);
    c.lineTo(cx + dir * 340 * s, H + 10);
    c.stroke();
  }

  c.strokeStyle = 'rgba(255,235,180,' + (0.22 + 0.12 * Math.sin(t * 3)) + ')';
  c.beginPath();
  c.ellipse(cx, footY + 2 * s, 120 * s, 22 * s, 0, 0, Math.PI * 2);
  c.stroke();
}

function drawSpotlight(c, W, H, px, footY, s, revealed) {
  const g = c.createRadialGradient(px, footY - 190 * s, 8 * s, px, footY - 190 * s, 460 * s);
  g.addColorStop(0, revealed ? 'rgba(255,250,225,0.18)' : 'rgba(255,250,225,0.11)');
  g.addColorStop(0.5, 'rgba(255,240,200,0.05)');
  g.addColorStop(1, 'rgba(255,240,200,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(px, footY - 190 * s, 460 * s, 0, Math.PI * 2);
  c.fill();
}

function drawFabric(ctx, c, px, footY, s, t, revealed) {
  if (revealed || t < 6.5) return;
  const fade = Math.min(1, (t - 6.5) / 1.5) * Math.min(1, (REVEAL - t) / 1.2);
  if (fade <= 0) return;

  c.save();
  for (let i = 0; i < 5; i++) {
    const ang = t * 0.7 + i * 1.256;
    const x = px + Math.cos(ang) * 175 * s;
    const y = footY - 185 * s + Math.sin(ang * 1.3) * 90 * s;
    c.save();
    c.globalAlpha = 0.5 * fade;
    c.translate(x, y);
    c.rotate(ang * 0.8);
    c.fillStyle = 'rgba(210,235,255,0.22)';
    c.fillRect(-38 * s, -26 * s, 76 * s, 52 * s);
    c.setLineDash([6 * s, 6 * s]);
    c.strokeStyle = 'rgba(240,250,255,0.9)';
    c.lineWidth = Math.max(1, 1.6 * s);
    c.strokeRect(-38 * s, -26 * s, 76 * s, 52 * s);
    c.setLineDash([]);
    c.fillStyle = 'rgba(255,255,255,0.75)';
    star(c, -8 * s, -2 * s, 4 * s, 4);
    c.fill();
    c.restore();
  }
  c.restore();
}

/* ---------- the emperor ---------- */

function drawEmperor(ctx, c, t, s, px, footY, revealed, bob, robeStage) {
  const P = POSES[S.pose % POSES.length];
  const walking = t < 6 || t > EXIT;
  const scared = S.boo > 0.25 || S.hitFlash > 0.1;

  c.save();
  c.translate(px, footY + bob);
  c.scale(s, s);
  c.rotate(P.lean + (S.boo > 0 ? Math.sin(t * 7) * 0.022 : 0));

  c.fillStyle = 'rgba(0,0,0,0.22)';
  c.beginPath();
  c.ellipse(0, 6, 105, 15, 0, 0, Math.PI * 2);
  c.fill();

  const footL = walking ? -26 + Math.sin(t * 7.5) * 16 : -P.foot;
  const footR = walking ? 26 - Math.sin(t * 7.5) * 16 : P.foot;
  leg(c, -20, -70, footL, -2);
  leg(c, 20, -70, footR, -2);

  c.beginPath();
  c.moveTo(-52, -178);
  c.bezierCurveTo(-66, -152, -60, -126, -46, -116);
  c.lineTo(46, -116);
  c.bezierCurveTo(60, -126, 66, -152, 52, -178);
  c.quadraticCurveTo(0, -192, -52, -178);
  c.closePath();
  c.fillStyle = SKIN;
  c.fill();

  c.strokeStyle = 'rgba(180,110,60,0.22)';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(0, -134, 30, 0.2, 1.3);
  c.stroke();

  c.fillStyle = '#c62b3d';
  c.beginPath();
  c.moveTo(-9, -186);
  c.lineTo(9, -186);
  c.lineTo(6, -146);
  c.lineTo(0, -140);
  c.lineTo(-6, -146);
  c.closePath();
  c.fill();
  c.fillStyle = '#8f1a2a';
  c.beginPath();
  c.ellipse(0, -188, 10, 6, 0, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = GOLD;
  c.lineWidth = 13;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-43, -172);
  c.lineTo(30, -124);
  c.stroke();
  c.fillStyle = GOLD;
  c.beginPath();
  c.arc(8, -152, 8, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#ff7b93';
  c.beginPath();
  c.arc(8, -152, 3.5, 0, Math.PI * 2);
  c.fill();

  if (revealed) drawBoxers(c);

  if (!revealed) {
    drawRobe(c, t, 1);
  } else if (robeStage < 1) {
    const e = robeStage * robeStage;
    c.save();
    c.translate(Math.sin(e * 3) * 8, e * 640);
    c.rotate(e * 0.5);
    drawRobe(c, t, 1 - e);
    c.restore();
  }

  const sL = [-50, -170];
  const sR = [50, -170];
  let eL = P.eL;
  let hL = P.hL;
  let eR = P.eR;
  let hR = P.hR;
  if (walking) {
    const sw = Math.sin(t * 7.5) * 8;
    eL = [eL[0], eL[1] + sw];
    hL = [hL[0], hL[1] + sw];
    eR = [eR[0], eR[1] - sw];
    hR = [hR[0], hR[1] - sw];
  }
  arm(c, sL, eL, hL);
  arm(c, sR, eR, hR);

  rr(c, -12, -198, 24, 26, 8);
  c.fillStyle = SKIN_DARK;
  c.fill();

  c.save();
  c.translate(0, -214);
  c.rotate(P.tilt);

  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(-32, 2, 8, 0, Math.PI * 2);
  c.arc(32, 2, 8, 0, Math.PI * 2);
  c.fill();

  c.beginPath();
  c.ellipse(0, 0, 33, 36, 0, 0, Math.PI * 2);
  c.fill();

  c.fillStyle = '#e8a43f';
  c.beginPath();
  c.ellipse(0, -23, 32, 17, 0, Math.PI, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.moveTo(-32, -25);
  c.quadraticCurveTo(-10, -41, 26, -35);
  c.quadraticCurveTo(34, -29, 30, -22);
  c.quadraticCurveTo(6, -30, -14, -22);
  c.closePath();
  c.fill();

  for (const ex of [-12, 12]) {
    c.fillStyle = '#fff';
    c.beginPath();
    c.ellipse(ex, -2, 5.4, scared ? 6 : 4.6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#243056';
    c.beginPath();
    c.arc(ex + (scared ? 0 : 1.4), -1, scared ? 1.9 : 2.4, 0, Math.PI * 2);
    c.fill();
  }

  c.strokeStyle = '#d99a3c';
  c.lineWidth = 2.4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-19, -11);
  c.lineTo(-7, -9);
  c.stroke();
  c.beginPath();
  c.moveTo(19, scared ? -12 : -9);
  c.lineTo(7, -11);
  c.stroke();

  c.strokeStyle = 'rgba(160,90,60,0.7)';
  c.lineWidth = 1.8;
  c.beginPath();
  c.moveTo(4, -6);
  c.quadraticCurveTo(7, -1, 3, 1);
  c.stroke();

  if (scared || S.boo > 0.2) {
    c.fillStyle = '#5b1e24';
    c.beginPath();
    c.ellipse(0, 15, 7, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#7fd0ff';
    c.beginPath();
    c.ellipse(34, 6, 3.2, 5.2, 0.3, 0, Math.PI * 2);
    c.fill();
  } else {
    c.strokeStyle = '#8a4a3a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, 13);
    c.quadraticCurveTo(0, 17, 7, 12);
    c.stroke();
  }

  c.restore();

  if (!S.crownOff) {
    drawCrown(c, 0, -252 + Math.sin(t * 2) * 1.2, 1, Math.sin(t * 1.7) * 0.06);
  }

  c.restore();
}

function drawBoxers(c) {
  c.fillStyle = NAVY;
  rr(c, -50, -124, 100, 66, 14);
  c.fill();

  c.fillStyle = GOLD;
  rr(c, -51, -124, 102, 11, 5);
  c.fill();

  c.fillStyle = STAR;
  const pts = [[-30, -104], [-6, -90], [20, -108], [-18, -76], [10, -70], [34, -90], [-38, -116]];
  for (const [x, y] of pts) {
    star(c, x, y, 5.5, 5);
    c.fill();
  }

  c.strokeStyle = 'rgba(255,255,255,0.16)';
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(0, -113);
  c.lineTo(0, -60);
  c.stroke();
}

function drawRobe(c, t, alpha) {
  const sway = Math.sin(t * 1.6) * 5;
  c.save();
  c.globalAlpha = alpha;

  c.beginPath();
  c.moveTo(-52, -168);
  c.bezierCurveTo(-120, -110, -172, -50, -196, 2);
  c.quadraticCurveTo(0, 18, 196, 2);
  c.bezierCurveTo(172, -50, 120, -110, 52, -168);
  c.closePath();
  const g = c.createLinearGradient(0, -170, 0, 10);
  g.addColorStop(0, ROBE_MID);
  g.addColorStop(1, ROBE_DARK);
  c.fillStyle = g;
  c.fill();

  c.strokeStyle = 'rgba(255,210,120,0.2)';
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(-30, -150);
  c.quadraticCurveTo(-60, -60, -70, 2);
  c.stroke();
  c.beginPath();
  c.moveTo(30, -150);
  c.quadraticCurveTo(60, -60, 70, 2);
  c.stroke();

  c.strokeStyle = 'rgba(245,205,110,0.85)';
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(-192, 2 + sway * 0.1);
  c.quadraticCurveTo(0, 16, 192, 2);
  c.stroke();

  c.fillStyle = '#f7f2e7';
  for (const sx of [-40, 40]) {
    c.beginPath();
    c.ellipse(sx, -172, 44, 25, sx < 0 ? 0.25 : -0.25, 0, Math.PI * 2);
    c.fill();
  }

  c.fillStyle = 'rgba(20,20,30,0.75)';
  for (const sx of [-40, 40]) {
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.arc(sx + (i - 2) * 14, -178 + (i % 2) * 10, 2.2, 0, Math.PI * 2);
      c.fill();
    }
  }

  c.restore();
}

function leg(c, hipX, hipY, footX, footY) {
  c.strokeStyle = SKIN;
  c.lineWidth = 23;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(hipX, hipY);
  c.quadraticCurveTo((hipX + footX) / 2 + (footX < hipX ? -6 : 6), -34, footX, footY);
  c.stroke();

  c.fillStyle = '#2b2136';
  c.beginPath();
  c.ellipse(footX + (footX < 0 ? -5 : 5), footY + 2, 15, 8, 0, 0, Math.PI * 2);
  c.fill();

  c.strokeStyle = GOLD;
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(footX - 6, footY - 8);
  c.lineTo(footX + 6, footY - 8);
  c.stroke();
}

function arm(c, shoulder, elbow, hand) {
  c.strokeStyle = SKIN;
  c.lineWidth = 19;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(shoulder[0], shoulder[1]);
  c.lineTo(elbow[0], elbow[1]);
  c.lineTo(hand[0], hand[1]);
  c.stroke();
  c.fillStyle = SKIN;
  c.beginPath();
  c.arc(hand[0], hand[1], 10, 0, Math.PI * 2);
  c.fill();
}

/* ---------- crown ---------- */

function drawCrown(c, x, y, sc, rot) {
  c.save();
  c.translate(x, y);
  c.scale(sc, sc);
  c.rotate(rot);

  c.fillStyle = GOLD;
  rr(c, -25, -6, 50, 15, 3);
  c.fill();

  c.beginPath();
  c.moveTo(-25, -4);
  c.lineTo(-25, -20);
  c.lineTo(-13, -12);
  c.lineTo(0, -26);
  c.lineTo(13, -12);
  c.lineTo(25, -20);
  c.lineTo(25, -4);
  c.closePath();
  c.fill();

  c.fillStyle = '#c9973a';
  c.fillRect(-25, 6, 50, 4);

  const jewels = ['#e6485e', '#4d7bd6', '#57c785', '#e08b3c', '#b45fd6'];
  for (let i = 0; i < 5; i++) {
    c.fillStyle = jewels[i];
    c.beginPath();
    c.arc(-18 + i * 9, 1, 2.8, 0, Math.PI * 2);
    c.fill();
  }

  c.fillStyle = '#fff4cf';
  c.beginPath();
  c.arc(0, -26, 2.6, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(-25, -20, 2.2, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.arc(25, -20, 2.2, 0, Math.PI * 2);
  c.fill();

  c.restore();
}

/* ---------- effects ---------- */

function drawEffects(c, W, H, s, t) {
  for (const f of S.confetti) {
    c.save();
    c.translate(f.x, f.y);
    c.rotate(f.rot);
    c.fillStyle = f.col;
    c.fillRect(-f.w / 2, -f.h / 2, f.w, f.h);
    c.restore();
  }

  for (const p of S.splats) {
    c.save();
    c.globalAlpha = Math.min(1, p.life * 1.2);
    c.fillStyle = '#b81f2a';
    for (let i = 0; i < 6; i++) {
      const ang = p.seed + i * 1.05;
      const rad = p.size * (0.5 + (i % 3) * 0.32);
      c.beginPath();
      c.arc(p.x + Math.cos(ang) * p.size * 0.7, p.y + Math.sin(ang) * p.size * 0.5, rad, 0, Math.PI * 2);
      c.fill();
    }
    c.fillStyle = 'rgba(255,140,130,0.35)';
    c.beginPath();
    c.arc(p.x - p.size * 0.2, p.y - p.size * 0.2, p.size * 0.35, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }

  for (const tm of S.tomatoes) {
    if (tm.age >= tm.dur) continue;
    const p = tm.age / tm.dur;
    const x = lerp(tm.x0, tm.x1, p);
    const y = lerp(tm.y0, tm.y1, p) - Math.sin(Math.PI * p) * tm.arc;
    c.save();
    c.translate(x, y);
    c.rotate(tm.spin + tm.age * tm.spinV);
    c.fillStyle = '#cc2a33';
    c.beginPath();
    c.arc(0, 0, 11 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.arc(-3 * s, -3 * s, 3 * s, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#3f8a45';
    c.beginPath();
    c.moveTo(-4 * s, -9 * s);
    c.lineTo(0, -13 * s);
    c.lineTo(4 * s, -9 * s);
    c.closePath();
    c.fill();
    c.restore();
  }

  for (const sp of S.sparkles) {
    c.save();
    c.globalAlpha = Math.max(0, sp.life);
    c.translate(sp.x, sp.y);
    c.rotate(sp.rot);
    c.strokeStyle = sp.col;
    c.lineWidth = Math.max(1, 1.6 * s);
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(-sp.size, 0);
    c.lineTo(sp.size, 0);
    c.moveTo(0, -sp.size);
    c.lineTo(0, sp.size);
    c.stroke();
    c.restore();
  }
}

function drawCrowd(c, W, H, s, t, front) {
  const n = front ? 11 : 13;
  for (let i = 0; i < n; i++) {
    const seed = i * 7 + (front ? 3 : 0);
    const x = W * (0.04 + 0.92 * (i / (n - 1))) + Math.sin(t * 1.1 + seed) * 3 * s;
    const base = H + (front ? 8 * s : 26 * s);
    let bob = Math.sin(t * 2.2 + seed) * 3 * s;
    if (S.boo > 0) bob += Math.sin(t * 9 + seed) * 3.5 * s;
    const headR = (front ? 15 : 11) * s;
    const y = base - (front ? 62 : 42) * s + bob;

    c.fillStyle = front ? 'rgba(8,12,30,0.74)' : 'rgba(8,12,30,0.45)';
    c.beginPath();
    c.ellipse(x, y + headR * 2.2, headR * 2.1, headR * 1.6, 0, 0, Math.PI * 2);
    c.fill();
    c.beginPath();
    c.arc(x, y, headR, 0, Math.PI * 2);
    c.fill();

    if (front && (i === 2 || i === 7)) {
      c.strokeStyle = 'rgba(8,12,30,0.74)';
      c.lineWidth = 6 * s;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(x - headR * 1.8, y + headR * 2);
      c.lineTo(x - headR * 2.6, y - headR * (0.6 + Math.abs(Math.sin(t * 4 + i)) * 1.4));
      c.stroke();
    }
  }
}

function drawBubbles(c, s) {
  for (const b of S.bubbles) {
    const a = Math.min(1, b.life * 2.2);
    if (a <= 0) continue;
    c.save();
    c.globalAlpha = a;
    c.font = '700 ' + Math.round(13 * s) + 'px Georgia, serif';
    const w = Math.max(40 * s, c.measureText(b.text).width + 22 * s);
    const h = 28 * s;
    c.fillStyle = 'rgba(255,252,244,0.94)';
    rr(c, b.x - w / 2, b.y - h, w, h, h / 2);
    c.fill();
    c.beginPath();
    c.moveTo(b.x - 5 * s, b.y - 1);
    c.lineTo(b.x + 4 * s, b.y - 1);
    c.lineTo(b.x - 1 * s, b.y + 8 * s);
    c.closePath();
    c.fill();
    c.fillStyle = '#2a2440';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(b.text, b.x, b.y - h / 2 + 1);
    c.restore();
  }
}

function drawShout(c, W, H, s, px, footY) {
  if (!S.shout) return;
  const b = S.shout;
  const a = Math.min(1, b.life * 1.4);
  if (a <= 0) return;

  c.save();
  c.globalAlpha = a;
  let size = 20 * s;
  c.font = '700 ' + Math.round(size) + 'px Georgia, serif';
  let tw = c.measureText(b.text).width;
  const maxW = Math.min(W * 0.7, 520 * s);
  if (tw + 36 * s > maxW) {
    size *= maxW / (tw + 36 * s);
    c.font = '700 ' + Math.round(size) + 'px Georgia, serif';
    tw = c.measureText(b.text).width;
  }
  const w = tw + 36 * s;
  const h = size + 22 * s;
  const x = Math.max(w / 2 + 8, Math.min(W - w / 2 - 8, px));
  const y = Math.max(H * 0.16, footY - 300 * s);

  c.fillStyle = 'rgba(255,252,246,0.95)';
  rr(c, x - w / 2, y - h, w, h, h / 2);
  c.fill();
  c.strokeStyle = 'rgba(240,194,90,0.9)';
  c.lineWidth = Math.max(1, 2.5 * s);
  c.stroke();

  c.beginPath();
  c.moveTo(x - 9 * s, y - 2);
  c.lineTo(x + 9 * s, y - 2);
  c.lineTo(x, y + 12 * s);
  c.closePath();
  c.fillStyle = 'rgba(255,252,246,0.95)';
  c.fill();

  c.fillStyle = '#33284a';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(b.text, x, y - h / 2 + 1);
  c.restore();
}

function drawFlash(c, W, H, s, px, footY) {
  if (S.flash <= 0) return;
  c.save();
  const g = c.createRadialGradient(px, footY - 170 * s, 0, px, footY - 170 * s, 420 * s);
  g.addColorStop(0, 'rgba(255,250,225,' + 0.5 * S.flash + ')');
  g.addColorStop(1, 'rgba(255,250,225,0)');
  c.fillStyle = g;
  c.beginPath();
  c.arc(px, footY - 170 * s, 420 * s, 0, Math.PI * 2);
  c.fill();

  const rad = 40 * s + (1 - S.flash) * 300 * s;
  c.strokeStyle = 'rgba(255,235,170,' + S.flash * 0.9 + ')';
  c.lineWidth = Math.max(1, 6 * s);
  c.beginPath();
  c.arc(px, footY - 150 * s, rad, 0, Math.PI * 2);
  c.stroke();
  c.restore();
}

/* ---------- HUD ---------- */

function drawHud(c, W, H, s, t, revealed) {
  if (t > 3.5 && t < 25.5) {
    fitGlow(c, "THE EMPEROR'S NEW LOOK", W / 2, H * 0.115, W * 0.88, Math.min(46 * s, W * 0.06), '#ffd76e');
    fitText(c, 'The royal tailor guarantees 100% invisible thread', W / 2, H * 0.163, W * 0.72, 19 * s, 'rgba(255,240,210,0.82)', '400');
  }

  if (t >= 8 && t < 24.5) {
    fitText(c, '100% INVISIBLE FABRIC - ZERO ITCH', W / 2, H * 0.203, W * 0.6, 15 * s, 'rgba(240,220,180,0.7)', '700');
  }

  if (t > REVEAL + 0.15 && t < REVEAL + 3.8) {
    const pop = 1 + Math.max(0, 0.5 - (t - REVEAL)) * 0.5;
    fitGlow(c, 'TA-DA!', W / 2, H * 0.185, W * 0.8, 72 * s * pop, '#ffe08a');
  }

  if (t >= REVEAL + 5 && t < 51) {
    fitText(c, 'ROYAL UNDERPANTS - STAR PATTERN', W / 2, H * 0.135, W * 0.7, 21 * s, 'rgba(255,235,190,0.8)', '700');
  }

  if (t >= 52.5) {
    fitGlow(c, 'THE EMPEROR HAS NO CLOTHES', W / 2, H * 0.145, W * 0.9, Math.min(58 * s, W * 0.075), '#ffd76e');
    fitText(c, 'AND ABSOLUTELY NO PLANS TO ADDRESS IT', W / 2, H * 0.195, W * 0.84, 21 * s, 'rgba(255,240,210,0.88)', '400');
  }
}

function fitGlow(c, text, x, y, maxW, size, color) {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let fs = Math.max(10, size);
  c.font = '700 ' + Math.round(fs) + 'px Georgia, serif';
  let guard = 0;
  while (fs > 10 && c.measureText(text).width > maxW && guard < 120) {
    fs -= 1;
    guard++;
    c.font = '700 ' + Math.round(fs) + 'px Georgia, serif';
  }
  c.shadowColor = 'rgba(255,200,90,0.85)';
  c.shadowBlur = 16;
  c.fillStyle = color;
  c.fillText(text, x, y);
  c.restore();
}

function fitText(c, text, x, y, maxW, size, color, weight) {
  c.save();
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  let fs = Math.max(8, size);
  c.font = (weight || '700') + ' ' + Math.round(fs) + 'px Georgia, serif';
  let guard = 0;
  while (fs > 8 && c.measureText(text).width > maxW && guard < 120) {
    fs -= 1;
    guard++;
    c.font = (weight || '700') + ' ' + Math.round(fs) + 'px Georgia, serif';
  }
  c.fillStyle = color;
  c.fillText(text, x, y);
  c.restore();
}

/* ---------- little helpers ---------- */

function rr(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function star(c, x, y, r, n) {
  c.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / n;
    const rad = i % 2 ? r * 0.45 : r;
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) c.moveTo(px, py);
    else c.lineTo(px, py);
  }
  c.closePath();
}

function lerp(a, b, p) {
  return a + (b - a) * p;
}

function clamp01(p) {
  return Math.max(0, Math.min(1, p));
}

function easeOutCubic(p) {
  return 1 - Math.pow(1 - p, 3);
}

function easeInOut(p) {
  return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
}
