// ===========================================================================
//  fx.js — 효과들
//   · Particles : 판정 불꽃 · 하트 조각
//   · Cutin     : 데루루 컷인 (캐릭터 PNG + 색 띠 + 글자를 코드로 합성)
//   · Crowd     : 관객석 응원봉 (코드로 그림)
//   · Stars     : 배경 반짝이
// ===========================================================================

// ---------------------------------------------------------------- 파티클
const Particles = {
  list: [],
  burst(x, y, col, n = 14, power = 1) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 5) * power;
      this.list.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, life: 1, col, r: 2 + Math.random() * 4, heart: Math.random() < 0.25 });
    }
  },
  ring(x, y, col, r0 = 30) { this.list.push({ ring: true, x, y, col, life: 1, r: r0 }); },
  update() {
    for (const p of this.list) {
      if (p.ring) { p.r += 3.2; p.life -= 0.05; continue; }
      p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.vx *= 0.97; p.life -= 0.028;
    }
    this.list = this.list.filter(p => p.life > 0);
  },
  draw() {
    const c = ctx(); c.save(); c.globalCompositeOperation = 'lighter';
    for (const p of this.list) {
      c.globalAlpha = Math.max(0, p.life);
      if (p.ring) { c.strokeStyle = p.col; c.lineWidth = 4 * p.life + 1; c.beginPath(); c.ellipse(p.x, p.y, p.r, p.r * 0.45, 0, 0, Math.PI * 2); c.stroke(); continue; }
      c.fillStyle = p.col;
      if (p.heart) heartPath(p.x, p.y, p.r * 2.2), c.fill();
      else { c.beginPath(); c.arc(p.x, p.y, p.r * p.life + 0.5, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  },
  clear() { this.list = []; },
};

function heartPath(x, y, s) {
  const c = ctx(); c.beginPath();
  c.moveTo(x, y + s * 0.35);
  c.bezierCurveTo(x - s * 0.9, y - s * 0.2, x - s * 0.45, y - s * 0.85, x, y - s * 0.38);
  c.bezierCurveTo(x + s * 0.45, y - s * 0.85, x + s * 0.9, y - s * 0.2, x, y + s * 0.35);
  c.closePath();
}

// ---------------------------------------------------------------- 컷인
// 종류 : nice(50콤보) · great(100) · amazing(200, 이후 100마다) · fever(떼창 · 풀콤보)
const CUTIN_STYLE = {
  nice:    { label: 'NICE~!',     colA: '#FF3DAA', colB: '#FF9AD5' },
  great:   { label: 'GREAT!!',    colA: '#4FC3FF', colB: '#B45AFF' },
  amazing: { label: 'AMAZING!!!', colA: '#FFD54F', colB: '#FF3DAA' },
  fever:   { label: '떼창 TIME!', colA: '#B45AFF', colB: '#FF3DAA' },
};
const Cutin = {
  cur: null,
  show(song, kind, sub = '', opt = {}) {
    const st = CUTIN_STYLE[kind];
    this.cur = { im: IMG[`cut_${song.id}_${kind}`], label: opt.label || st.label, sub, colA: st.colA, colB: st.colB,
                 t0: performance.now(), dur: opt.dur || 1500, big: !!opt.big, compact: !!opt.compact };
  },
  draw() {
    const k = this.cur; if (!k) return;
    const u = (performance.now() - k.t0) / k.dur;
    if (u >= 1) { this.cur = null; return; }
    if (k.compact) return this.drawCompact(k, u);
    const inn = ease.out(clamp(u / 0.18, 0, 1)), out = clamp((u - 0.8) / 0.2, 0, 1);
    const c = ctx(); c.save();
    c.globalAlpha = (1 - out) * (k.big ? 1 : 0.92);
    // 화면 살짝 어둡게
    c.fillStyle = `rgba(10,4,24,${0.35 * (1 - out) * inn})`; c.fillRect(0, 0, W, H);
    // 대각선 색 띠
    const by = k.big ? 360 : 300, bh = k.big ? 230 : 170, slide = (1 - inn) * 600 + out * -200;
    c.save(); c.translate(slide, 0);
    c.beginPath(); c.moveTo(-40, by + 40); c.lineTo(W + 40, by - 40); c.lineTo(W + 40, by - 40 + bh); c.lineTo(-40, by + 40 + bh); c.closePath();
    c.fillStyle = grad(0, 0, W, 0, [[0, rgba(k.colA, .92)], [1, rgba(k.colB, .92)]]); c.fill();
    // 띠 위 줄무늬
    c.globalAlpha *= 0.25; c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (let i = -10; i < 30; i++) { c.beginPath(); c.moveTo(i * 30, by + 60 + bh); c.lineTo(i * 30 + 120, by - 60); c.stroke(); }
    c.restore();
    // 캐릭터 (오른쪽에서 들어옴)
    const ch = k.big ? 620 : 520, cw = ch * 0.75, cx = W - cw + 40 + (1 - inn) * 360 - out * 80;
    if (ok(k.im)) { c.save(); c.shadowColor = rgba(k.colA, .9); c.shadowBlur = 30; c.drawImage(k.im, cx, by + bh / 2 - ch * 0.58, cw, ch); c.restore(); }
    // 반짝이
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 10; i++) {
      const a = (performance.now() / 600 + i * 0.7), sx = 40 + ((i * 97) % 300) + Math.sin(a) * 10, sy = by + 20 + ((i * 53) % bh);
      c.globalAlpha = 0.5 + 0.5 * Math.sin(a * 3); starPath(sx, sy, 6 + (i % 3) * 3); c.fillStyle = '#fff'; c.fill();
    }
    c.restore();
    // 글자 (왼쪽에서 들어옴)
    const tx = 30 - (1 - inn) * 400, sc = 1 + 0.15 * Math.max(0, 1 - u / 0.25);
    c.save(); c.translate(tx, by + bh / 2 + 6); c.rotate(-0.15); c.scale(sc, sc);
    txt(k.label, 0, -6, k.big ? 64 : 54, '#fff', 'left', 900, { italic: true, stroke: rgba('#2a0838', .9), sw: 10, glow: k.colA, blur: 24 });
    if (k.sub) txt(k.sub, 6, k.big ? 52 : 44, 22, '#fff', 'left', 900, { italic: true, stroke: 'rgba(42,8,56,.8)', sw: 6 });
    c.restore();
    c.restore();
  },
  // 콤보 컷인 : 노트가 내려오는 레인(화면 y 245 아래)을 가리지 않도록 위쪽 띠 안에만 작게
  drawCompact(k, u) {
    const inn = ease.out(clamp(u / 0.2, 0, 1)), out = clamp((u - 0.8) / 0.2, 0, 1);
    const c = ctx(); c.save();
    c.beginPath(); c.rect(0, 88, W, 157); c.clip();          // 88 ~ 245 : HUD 아래 · 레인 위
    c.globalAlpha = 1 - out;
    const by = 148, bh = 70, slide = (1 - inn) * 560 - out * 160;
    // 색 띠
    c.save(); c.translate(slide, 0);
    c.beginPath(); c.moveTo(-20, by + 14); c.lineTo(W + 20, by - 14); c.lineTo(W + 20, by - 14 + bh); c.lineTo(-20, by + 14 + bh); c.closePath();
    c.fillStyle = grad(0, 0, W, 0, [[0, rgba(k.colA, .9)], [1, rgba(k.colB, .9)]]); c.fill();
    c.globalAlpha *= 0.25; c.strokeStyle = '#fff'; c.lineWidth = 2;
    for (let i = -6; i < 24; i++) { c.beginPath(); c.moveTo(i * 26, by + bh + 20); c.lineTo(i * 26 + 60, by - 20); c.stroke(); }
    c.restore();
    // 캐릭터 상반신 (오른쪽)
    if (ok(k.im)) {
      const dw = 196, dh = 157, sw = k.im.naturalWidth, sh = sw * dh / dw;
      const dx = W - dw + 6 + (1 - inn) * 220 - out * 40;
      c.save(); c.shadowColor = rgba(k.colA, .9); c.shadowBlur = 16;
      c.drawImage(k.im, 0, sw * 0.02, sw, sh, dx, 88, dw, dh); c.restore();
    }
    // 글자 (왼쪽)
    const sc = 1 + 0.18 * Math.max(0, 1 - u / 0.2);
    c.save(); c.translate(22 - (1 - inn) * 300, by + bh / 2 - 2); c.rotate(-0.05); c.scale(sc, sc);
    txt(k.label, 0, -8, 36, '#fff', 'left', 900, { italic: true, stroke: rgba('#2a0838', .9), sw: 8, glow: k.colA, blur: 16 });
    if (k.sub) txt(k.sub, 4, 20, 15, '#fff', 'left', 900, { italic: true, stroke: 'rgba(42,8,56,.8)', sw: 5 });
    c.restore();
    c.restore();
  },
  clear() { this.cur = null; },
};

function starPath(x, y, r) {
  const c = ctx(); c.beginPath();
  for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.3 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}

// ---------------------------------------------------------------- 관객석 응원봉
// energy(0~1) 이 높을수록 응원봉이 많이 · 밝게 켜진다. beat(0~1) 에 맞춰 흔든다
const Crowd = {
  people: [],
  init() {
    this.people = [];
    const rows = [{ y: 905, n: 13, s: 1.0 }, { y: 935, n: 11, s: 1.15 }, { y: 968, n: 9, s: 1.3 }];
    rows.forEach((r, ri) => {
      for (let i = 0; i < r.n; i++) {
        this.people.push({ x: (i + 0.5 + (ri % 2) * 0.35) * (W / r.n) + (Math.random() - .5) * 10, y: r.y + (Math.random() - .5) * 6, s: r.s,
                           col: LANE_COLORS[(i + ri) % 4], th: Math.random(), ph: Math.random() * Math.PI * 2 });
      }
    });
  },
  draw(energy, beat, allOn = 0) {
    const c = ctx(); c.save();
    c.fillStyle = grad(0, 860, 0, H, [[0, 'rgba(8,4,18,0)'], [0.35, 'rgba(8,4,18,.85)'], [1, 'rgba(5,2,12,1)']]);
    c.fillRect(0, 850, W, H - 850);
    for (const p of this.people) {
      const on = allOn > 0 || p.th < energy;
      const sway = Math.sin(beat * Math.PI * 2 + p.ph * 0.3) * (on ? 0.35 : 0.08);
      const len = 34 * p.s, bx = p.x, by = p.y;
      const tx = bx + Math.sin(sway) * len, ty = by - Math.cos(sway) * len;
      // 손잡이
      c.strokeStyle = 'rgba(30,20,50,1)'; c.lineWidth = 5 * p.s; c.lineCap = 'round';
      c.beginPath(); c.moveTo(bx, by); c.lineTo(tx, ty); c.stroke();
      // 빛
      const col = allOn > 0 ? LANE_COLORS[(Math.floor(performance.now() / 250) + Math.round(p.x)) % 4] : p.col;
      const a = on ? 0.55 + 0.45 * Math.max(energy, allOn) : 0.12;
      c.save(); c.globalCompositeOperation = 'lighter';
      if (on) { c.fillStyle = rgba(col, 0.18 * a); c.beginPath(); c.ellipse(tx, ty, 14 * p.s, 20 * p.s, sway, 0, Math.PI * 2); c.fill(); }   // 번짐 (shadowBlur 대신 — 폰에서 가볍게)
      c.fillStyle = rgba(col, a); c.beginPath(); c.ellipse(tx, ty, 6 * p.s, 11 * p.s, sway, 0, Math.PI * 2); c.fill(); c.restore();
      // 머리 실루엣
      c.fillStyle = 'rgba(12,6,26,1)'; c.beginPath(); c.arc(bx - 14 * p.s, by + 12 * p.s, 15 * p.s, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  },
};

// ---------------------------------------------------------------- 배경 반짝이
const Stars = {
  list: Array.from({ length: 40 }, () => ({ x: Math.random() * W, y: Math.random() * H * 0.7, r: Math.random() * 2 + .5, ph: Math.random() * 6 })),
  draw(alpha = 1) {
    const c = ctx(); c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#fff';
    const t = performance.now() / 1000;
    for (const s of this.list) { c.globalAlpha = alpha * (0.3 + 0.7 * Math.abs(Math.sin(t * 1.3 + s.ph))); c.beginPath(); c.arc(s.x, s.y, s.r, 0, Math.PI * 2); c.fill(); }
    c.restore();
  },
};
