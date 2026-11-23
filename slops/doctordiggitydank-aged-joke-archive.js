// SAVORYSAILOR'S FAVORITE JOKES — a retired-card archive gag.
// The canvas is glass over the live stream: clear every frame, draw only the card.

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = '"Trebuchet MS", "Segoe UI", sans-serif';

let S = null;

export const meta = {
  title: 'Aged Joke Archive',
  author: 'doctordiggitydank',
  prompt:
    'this shows a random poorly-aged joke about women in text sized to fill the screen but not leave the boundaries of the screen. it should say at the top "SAVORYSAILOR\'S FAVORITE JOKES #35" but with a random generated number',
  createdAt: '2026-11-23T00:00:00.000Z',
  moderationLevel: 'anything',
};

function wrapLines(g, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const test = cur ? cur + ' ' + words[i] : words[i];
    if (g.measureText(test).width <= maxW || !cur) cur = test;
    else {
      lines.push(cur);
      cur = words[i];
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function fitText(g, text, maxW, maxH, maxFont, minFont, weight, family, lineRatio) {
  const ratio = lineRatio || 1.14;
  let font = Math.max(minFont, Math.round(maxFont));
  let lines = [text];
  for (; font > minFont; font -= 1) {
    g.font = weight + ' ' + font + 'px ' + family;
    lines = wrapLines(g, text, maxW);
    const lh = font * ratio;
    let widest = 0;
    for (let i = 0; i < lines.length; i++) {
      widest = Math.max(widest, g.measureText(lines[i]).width);
    }
    if (lines.length * lh <= maxH && widest <= maxW) {
      return { lines: lines, font: font, lh: lh, widest: widest };
    }
  }
  g.font = weight + ' ' + minFont + 'px ' + family;
  lines = wrapLines(g, text, maxW);
  return { lines: lines, font: minFont, lh: minFont * ratio, widest: maxW };
}

function roundRect(g, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
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

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}

function easeOut(v) {
  return 1 - Math.pow(1 - v, 3);
}

export function init(ctx) {
  const num = 31 + Math.floor(ctx.rand() * 860);

  const specks = [];
  for (let i = 0; i < 110; i++) {
    specks.push({
      x: ctx.rand() - 0.5,
      y: ctx.rand() - 0.5,
      r: 0.35 + ctx.rand() * 1.7,
      a: 0.03 + ctx.rand() * 0.09,
    });
  }

  const stains = [];
  for (let i = 0; i < 8; i++) {
    stains.push({
      x: (ctx.rand() - 0.5) * 0.9,
      y: (ctx.rand() - 0.5) * 0.9,
      r: 0.05 + ctx.rand() * 0.12,
      a: 0.06 + ctx.rand() * 0.11,
      at: 7.3 + i * 0.32,
    });
  }

  S = {
    num: num,
    specks: specks,
    stains: stains,
    kicker: 'FROM THE RETIRED JOKE VAULT',
    setup: 'WHAT DO YOU CALL A JOKE ABOUT WOMEN THAT WAS FUNNY IN 1957?',
    answer: 'A CONFESSION.',
    note: 'ARCHIVE NOTE: PRINTING THIS JOKE IS NO LONGER LEGAL IN FOURTEEN COUNTRIES.',
    flakes: [],
    tickCount: -1,
    sCard: false,
    sBar: false,
    sStamp: false,
    sReveal: false,
    sCrumb: false,
    ended: false,
  };
}

export function frame(ctx, t, dt) {
  const g = ctx.canvas;
  const W = ctx.width;
  const H = ctx.height;
  g.clearRect(0, 0, W, H);
  if (!S) return;

  const cardH = Math.min(H * 0.74, 980);
  const cardW = Math.min(W * 0.9, cardH * 1.6);

  let cy = H * 0.56;
  if (ctx.streamer) {
    const faceY = (ctx.streamer.y + ctx.streamer.h * 0.4) * H;
    cy = faceY < H * 0.5 ? H * 0.60 : H * 0.44;
  }
  cy = clamp(cy, cardH / 2 + H * 0.10, H - cardH / 2 - H * 0.025);
  const cx = W / 2;

  // ---- sounds (one-shots) ----
  if (!S.sCard && t > 0.02) {
    S.sCard = true;
    ctx.sound.noise(90);
  }

  const intro = clamp(t / 0.7, 0, 1);
  const ie = easeOut(intro);
  const scale = 0.92 + 0.08 * ie;
  const cardAlpha = clamp(intro, 0, 1) * (t < 12.6 ? 1 : clamp(1 - (t - 12.6) / 1.7, 0, 1));
  const rot = -0.014 + Math.sin(t * 0.6) * 0.003;

  // ---- reveal of setup text ----
  const totalChars = S.setup.length;
  const revealed = clamp(Math.floor((t - 0.85) * 24), 0, totalChars);
  if (revealed > 0) {
    const tick = Math.floor(revealed / 4);
    if (tick > S.tickCount) {
      S.tickCount = tick;
      ctx.sound.beep(820 + (tick % 5) * 40, 16);
    }
  }

  // ---- title caption above the card ----
  const capY = Math.max(H * 0.055, cy - cardH / 2 - H * 0.038);
  const capText = "SAVORYSAILOR'S FAVORITE JOKES #" + S.num;
  const cap = fitText(g, capText, W * 0.92, H * 0.09, Math.min(W * 0.045, 46), 14, '700', SANS, 1.1);
  g.save();
  g.globalAlpha = clamp(t / 0.5, 0, 1);
  g.textAlign = 'center';
  g.textBaseline = 'alphabetic';
  g.font = '700 ' + cap.font + 'px ' + SANS;
  g.shadowColor = 'rgba(10,14,30,0.85)';
  g.shadowBlur = 14;
  g.fillStyle = 'rgba(255,241,214,0.97)';
  g.fillText(capText, W / 2, capY + cap.font * 0.8);
  const cw = g.measureText(capText).width;
  g.shadowBlur = 0;
  g.fillStyle = ctx.accent;
  g.globalAlpha = clamp(t / 0.5, 0, 1) * 0.9;
  g.fillRect(W / 2 - cw / 2, capY + cap.font * 0.98, cw, Math.max(2, cap.font * 0.09));
  g.restore();

  // ---- card ----
  g.save();
  g.globalAlpha = cardAlpha;
  g.translate(cx, cy);
  g.rotate(rot);
  g.scale(scale, scale);

  const x0 = -cardW / 2;
  const y0 = -cardH / 2;

  g.save();
  g.shadowColor = 'rgba(6,8,18,0.55)';
  g.shadowBlur = 38;
  g.shadowOffsetY = 14;
  roundRect(g, x0, y0, cardW, cardH, cardW * 0.014);
  const paper = g.createLinearGradient(x0, y0, x0 + cardW, y0 + cardH);
  paper.addColorStop(0, 'rgba(249,242,220,0.94)');
  paper.addColorStop(0.55, 'rgba(241,231,203,0.94)');
  paper.addColorStop(1, 'rgba(228,214,180,0.94)');
  g.fillStyle = paper;
  g.fill();
  g.restore();

  // paper border
  g.lineWidth = Math.max(2, cardW * 0.0035);
  g.strokeStyle = 'rgba(78,60,40,0.42)';
  roundRect(g, x0, y0, cardW, cardH, cardW * 0.014);
  g.stroke();

  // ageing wash
  const age = clamp((t - 7.0) / 5.0, 0, 1);
  if (age > 0) {
    g.fillStyle = 'rgba(146,101,48,' + (0.05 + age * 0.20) + ')';
    roundRect(g, x0, y0, cardW, cardH, cardW * 0.014);
    g.fill();
  }

  // paper grain specks
  for (let i = 0; i < S.specks.length; i++) {
    const s = S.specks[i];
    g.fillStyle = 'rgba(96,74,48,' + s.a + ')';
    g.beginPath();
    g.arc(s.x * cardW, s.y * cardH, s.r, 0, Math.PI * 2);
    g.fill();
  }

  // spreading stains
  for (let i = 0; i < S.stains.length; i++) {
    const st = S.stains[i];
    const sa = clamp((t - st.at) / 0.9, 0, 1);
    if (sa <= 0) continue;
    g.fillStyle = 'rgba(120,78,34,' + st.a * sa + ')';
    g.beginPath();
    g.ellipse(st.x * cardW, st.y * cardH, st.r * cardW, st.r * cardW * 0.78, i * 0.6, 0, Math.PI * 2);
    g.fill();
  }

  // curled corners darkening with age
  if (age > 0) {
    g.fillStyle = 'rgba(86,62,34,' + age * 0.22 + ')';
    const cs = cardW * 0.05 * (0.4 + age);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0 + cs, y0);
    g.lineTo(x0, y0 + cs);
    g.closePath();
    g.fill();
    g.beginPath();
    g.moveTo(x0 + cardW, y0 + cardH);
    g.lineTo(x0 + cardW - cs, y0 + cardH);
    g.lineTo(x0 + cardW, y0 + cardH - cs);
    g.closePath();
    g.fill();
  }

  // ---- kicker ----
  const kFont = Math.max(11, Math.round(cardH * 0.030));
  g.font = '700 ' + kFont + 'px ' + SANS;
  g.textAlign = 'center';
  g.fillStyle = 'rgba(96,74,48,0.78)';
  g.fillText(S.kicker, 0, y0 + cardH * 0.10);

  // thin rule under kicker
  g.strokeStyle = 'rgba(96,74,48,0.32)';
  g.lineWidth = Math.max(1, cardW * 0.0018);
  g.beginPath();
  g.moveTo(x0 + cardW * 0.14, y0 + cardH * 0.13);
  g.lineTo(x0 + cardW * 0.86, y0 + cardH * 0.13);
  g.stroke();

  // ---- setup text (typewriter) ----
  const setupBox = fitText(
    g,
    S.setup,
    cardW * 0.84,
    cardH * 0.34,
    cardW * 0.115,
    Math.round(cardH * 0.045),
    '700',
    SERIF,
    1.16
  );
  const setupTop = -cardH * 0.045 - (setupBox.lines.length * setupBox.lh) / 2 + setupBox.font * 0.1;
  g.font = '700 ' + setupBox.font + 'px ' + SERIF;
  g.fillStyle = 'rgba(40,31,24,0.93)';
  let left = revealed;
  for (let i = 0; i < setupBox.lines.length; i++) {
    if (left <= 0) break;
    const line = setupBox.lines[i];
    const part = line.slice(0, Math.max(0, Math.floor(left)));
    left -= line.length + 1;
    if (!part) continue;
    g.fillText(part, 0, setupTop + i * setupBox.lh + setupBox.font * 0.86);
  }

  // blinking caret while typing
  if (t > 0.85 && t < 4.4 && revealed < totalChars) {
    const lines = setupBox.lines;
    let acc = 0;
    let li = 0;
    for (let i = 0; i < lines.length; i++) {
      if (revealed <= acc + lines[i].length) {
        li = i;
        break;
      }
      acc += lines[i].length + 1;
      li = i;
    }
    const vis = Math.floor(t * 8) % 2 === 0;
    if (vis) {
      g.fillStyle = 'rgba(150,32,42,0.85)';
      const lineW = g.measureText(lines[li].slice(0, Math.max(0, revealed - acc))).width;
      g.fillRect(lineW / 2 + setupBox.font * 0.06, setupTop + li * setupBox.lh + setupBox.font * 0.12, setupBox.font * 0.09, setupBox.font * 0.78);
    }
  }

  // ---- answer block + redaction bar ----
  const ansBox = fitText(
    g,
    S.answer,
    cardW * 0.72,
    cardH * 0.18,
    cardW * 0.13,
    Math.round(cardH * 0.05),
    '700',
    SERIF,
    1.14
  );
  const ansY = cardH * 0.27;

  const barAppear = t >= 4.3;
  const barExit = t >= 6.9 ? clamp((t - 6.9) / 0.45, 0, 1) : 0;
  if (barAppear && barExit < 1) {
    if (!S.sBar) {
      S.sBar = true;
      ctx.sound.noise(130);
    }
    const slam = clamp((t - 4.3) / 0.16, 0, 1);
    const bw = cardW * 0.82;
    const bh = cardH * 0.155 * (1.7 - 0.7 * easeOut(slam));
    const by = ansY - bh / 2 - barExit * cardH * 0.5;
    g.save();
    g.globalAlpha = cardAlpha * (1 - barExit);
    g.fillStyle = 'rgba(28,25,32,0.94)';
    g.fillRect(-bw / 2, by, bw, bh);
    g.strokeStyle = 'rgba(240,232,210,0.18)';
    g.lineWidth = 1;
    for (let hx = -bw / 2 - bh; hx < bw / 2; hx += 14) {
      g.beginPath();
      g.moveTo(hx, by + bh);
      g.lineTo(hx + bh, by);
      g.stroke();
    }
    g.restore();
  }

  // ---- answer text ----
  const ansReveal = t >= 6.9 ? clamp((t - 6.9) / 0.5, 0, 1) : 0;
  if (ansReveal > 0) {
    if (!S.sReveal) {
      S.sReveal = true;
      ctx.sound.beep(560, 150);
    }
    const pop = 0.86 + 0.14 * easeOut(ansReveal);
    g.save();
    g.globalAlpha = cardAlpha * ansReveal;
    g.translate(0, ansY);
    g.scale(pop, pop);
    g.font = '700 ' + ansBox.font + 'px ' + SERIF;
    g.fillStyle = 'rgba(150,32,42,0.95)';
    g.textAlign = 'center';
    const aTop = -(ansBox.lines.length * ansBox.lh) / 2 + ansBox.font * 0.86;
    for (let i = 0; i < ansBox.lines.length; i++) {
      g.fillText(ansBox.lines[i], 0, aTop + i * ansBox.lh);
    }
    g.restore();
  }

  // ---- RETIRED stamp ----
  if (t >= 5.5) {
    if (!S.sStamp) {
      S.sStamp = true;
      ctx.sound.noise(180);
      ctx.sound.beep(88, 200);
    }
    const sp = clamp((t - 5.5) / 0.22, 0, 1);
    const sc = 1.9 - 0.9 * easeOut(sp);
    g.save();
    g.globalAlpha = cardAlpha * 0.72 * clamp((t - 5.5) / 0.18, 0, 1);
    g.translate(cardW * 0.245, -cardH * 0.295);
    g.rotate(-0.2);
    g.scale(sc, sc);
    g.strokeStyle = 'rgba(154,30,40,0.85)';
    g.lineWidth = Math.max(2, cardW * 0.005);
    const sw = cardW * 0.30;
    const sh = cardH * 0.085;
    g.strokeRect(-sw / 2, -sh / 2, sw, sh);
    g.lineWidth = Math.max(1, cardW * 0.0018);
    g.strokeRect(-sw / 2 + sw * 0.035, -sh / 2 + sh * 0.13, sw * 0.93, sh * 0.74);
    g.fillStyle = 'rgba(154,30,40,0.85)';
    g.textAlign = 'center';
    g.font = '700 ' + Math.round(sh * 0.46) + 'px ' + SANS;
    g.fillText('RETIRED', 0, sh * 0.16);
    g.restore();
  }

  // ---- footnote ----
  const noteFont = Math.max(10, Math.round(cardH * 0.021));
  const note = fitText(g, S.note, cardW * 0.84, cardH * 0.09, noteFont, 8, '400', SANS, 1.3);
  g.font = '400 ' + note.font + 'px ' + SANS;
  g.fillStyle = 'rgba(96,74,48,0.62)';
  g.textAlign = 'center';
  const noteTop = cardH * 0.405 - (note.lines.length * note.lh) / 2;
  for (let i = 0; i < note.lines.length; i++) {
    g.fillText(note.lines[i], 0, noteTop + i * note.lh + note.font * 0.8);
  }

  g.restore(); // card transform

  // ---- crumble ----
  if (t >= 12.4) {
    if (!S.sCrumb) {
      S.sCrumb = true;
      ctx.sound.noise(460);
    }
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const spawn = Math.min(4, Math.ceil(dt / 0.02));
    for (let i = 0; i < spawn; i++) {
      const edge = ctx.rand();
      let lx;
      let ly;
      if (edge < 0.25) {
        lx = (ctx.rand() - 0.5) * cardW;
        ly = -cardH / 2;
      } else if (edge < 0.5) {
        lx = (ctx.rand() - 0.5) * cardW;
        ly = cardH / 2;
      } else if (edge < 0.75) {
        lx = -cardW / 2;
        ly = (ctx.rand() - 0.5) * cardH;
      } else {
        lx = cardW / 2;
        ly = (ctx.rand() - 0.5) * cardH;
      }
      lx *= scale;
      ly *= scale;
      S.flakes.push({
        x: cx + lx * cos - ly * sin,
        y: cy + lx * sin + ly * cos,
        vx: (ctx.rand() - 0.5) * 90,
        vy: 20 + ctx.rand() * 70,
        life: 1.5,
        age: 0,
        rot: ctx.rand() * Math.PI,
        vr: (ctx.rand() - 0.5) * 6,
        size: 3 + ctx.rand() * 9,
      });
    }
  }

  // draw + update flakes
  for (let i = S.flakes.length - 1; i >= 0; i--) {
    const f = S.flakes[i];
    f.age += dt;
    if (f.age >= f.life) {
      S.flakes.splice(i, 1);
      continue;
    }
    f.vy += 34 * dt;
    f.vx += Math.sin((f.age + f.x) * 3) * 14 * dt;
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.rot += f.vr * dt;
    const a = (1 - f.age / f.life) * 0.9;
    g.save();
    g.globalAlpha = a;
    g.translate(f.x, f.y);
    g.rotate(f.rot);
    g.fillStyle = 'rgba(226,210,174,0.95)';
    g.fillRect(-f.size / 2, -f.size / 4, f.size, f.size / 2);
    g.restore();
  }

  if (!S.ended && t >= 14.4) {
    S.ended = true;
    ctx.done();
  }
}

export function dispose() {
  S = null;
}
