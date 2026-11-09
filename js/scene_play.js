// ===========================================================================
//  scene_play.js — 플레이 화면
//   · 원근 무대 레인 4줄 위로 하트 노트가 내려오고, 판정선(응원봉 버튼)에 닿을 때 터치
//   · 꾹 노트 : 빛 꼬리가 다 들어올 때까지 누르고 있기
//   · 떼창 TIME : 노트 없는 구간 — 화면을 연타해서 떼창 게이지 채우기
//   · 콤보 50 / 100 / 200 … 마다 데루루 컷인, 끝까지 MISS 0 이면 FULL COMBO 컷인
// ===========================================================================

const WIN = [[0.10, 0.20], [0.08, 0.16], [0.065, 0.13]];   // [PERFECT, GOOD] 판정 범위(초) — 새내기팬 · 찐팬 · 최애
const LEAD = [1.45, 1.15, 0.92];                         // 노트가 화면에 보이는 시간(초)
const CHANT_RATE = [2.2, 3.0, 3.8];                      // 떼창 성공에 필요한 초당 터치 수
const ACC = { PERFECT: 1, GOOD: 0.65, MISS: 0 };
const COMBO_CUTS = [[50, 'nice'], [100, 'great'], [200, 'amazing']];   // 이후 100콤보마다 amazing

// 원근 레인 모양
const HY = 60, JY = 800, CX = 270, LW = 115, PK = 3;      // 소실점 높이 · 판정선 y · 가운데 x · 레인 폭 · 원근 세기
const scaleAt = p => 1 / (1 + PK * (1 - p));              // p : 0(멀리) → 1(판정선)
const yAt = sc => HY + (JY - HY) * sc;
const xAt = (e, sc) => CX + e * LW * sc;                   // e : 레인 가장자리 -2 ~ 2 (가운데 = c - 1.5)

Scenes.play = {
  dim: 0.5, edgeTop: 'rgba(8,4,20,.85)', edgeBottom: '#05020c',
  enter({ song, mode }) {
    const ch = CHARTS[song.id];
    Object.assign(this, {
      song, mode, ch,
      notes: ch.modes[mode].map(([t, c, d]) => ({ t, c, d, type: d > 0 ? 'hold' : 'tap', st: 0, res: null, head: null })),
      chants: ch.chants.map(([t0, t1]) => ({ t0, t1, taps: 0, need: Math.round((t1 - t0) * CHANT_RATE[mode]), cut: false, done: false, ok: false })),
      cnt: { PERFECT: 0, GOOD: 0, MISS: 0 }, combo: 0, maxCombo: 0, accSum: 0, judged: 0,
      energy: 0.3, deltas: [], chantBonus: 0, shownScore: 0,
      laneDown: [0, 0, 0, 0], laneFlash: [0, 0, 0, 0], jtext: [null, null, null, null], comboPulse: 0,
      ptrLane: {}, phase: 'play', blocked: false, finishAt: 0, nextCut: 0, autoHold: {}, fcShown: false,
      lead: LEAD[mode] / Save.data.speed, win: WIN[mode],
    });
    this.N = this.notes.length;
    this.endT = Math.max(...this.notes.map(n => n.t + n.d), ...this.chants.map(c => c.t1)) + 1.4;
    backdropImg = IMG['stage_' + song.id];
    Particles.clear(); Cutin.clear();
    Music.load(song);
    const t0 = +(QS.get('seek') || 0);
    const p = Music.playFrom(t0, 1);
    // MV 배경 (켜져 있고 이 환경에서 유튜브가 되면)
    if (Save.data.mvOn !== false) Mv.start(song, t0);
    if (p && p.catch) p.catch(() => { this.blocked = true; });
  },
  exit() { Music.stop(); Mv.stop(); Cutin.clear(); },

  // 판정에 쓰는 시간 : 싱크 조절값만큼 보정
  time() { return Clock.now() - Save.data.offset; },

  // ------------------------------------------------------------ 입력
  press(c) {
    this.laneDown[c]++; this.laneFlash[c] = 1;
    if (this.phase !== 'play') return;
    const t = this.time();
    const ch = this.activeChant(t);
    if (ch) { this.chantTap(ch); return; }
    let best = null;
    for (const n of this.notes) {
      if (n.st !== 0 || n.c !== c) continue;
      if (n.t - t > this.win[1]) break;
      if (Math.abs(t - n.t) <= this.win[1] && (!best || Math.abs(t - n.t) < Math.abs(t - best.t))) best = n;
    }
    if (!best) return;                                   // 노트 없는 곳 터치 : 벌점 없음
    const delta = t - best.t, res = Math.abs(delta) <= this.win[0] ? 'PERFECT' : 'GOOD';
    if (best.type === 'hold') { best.st = 1; best.head = res; best.delta = delta; this.hitFx(best.c, res, true); }
    else this.judge(best, res, delta);
  },
  release(c) {
    this.laneDown[c] = Math.max(0, this.laneDown[c] - 1);
    if (this.laneDown[c] > 0 || this.phase !== 'play') return;
    const t = this.time();
    for (const n of this.notes) {
      if (n.st !== 1 || n.c !== c) continue;
      const end = n.t + n.d;
      if (t >= end - 0.15) this.judge(n, n.head, n.delta);            // 끝까지 잘 버팀
      else if (t >= n.t + n.d * 0.6) this.judge(n, 'GOOD', n.delta);   // 조금 일찍 뗌
      else this.judge(n, 'MISS', 0);                                   // 너무 일찍 뗌
    }
  },
  laneAt(x) { return clamp(Math.floor((x - (CX - 2 * LW)) / LW), 0, 3); },
  onDown(x, y, id, b) {
    if (b) return;
    if (this.blocked) { this.blocked = false; Music.resume(); Mv.seekNow(Music.el.currentTime); return; }
    if (this.phase === 'play' && y > 380) { const c = this.laneAt(x); this.ptrLane[id] = c; this.press(c); }
    else if (this.phase === 'play') { const ch = this.activeChant(this.time()); if (ch) this.chantTap(ch); }
  },
  onUp(x, y, id) { if (this.ptrLane[id] !== undefined) { this.release(this.ptrLane[id]); delete this.ptrLane[id]; } },
  onKey(k, d) {
    const c = KEYS.indexOf(k);
    if (c >= 0) { d ? this.press(c) : this.release(c); return; }
    if (!d) return;
    if (k === ' ' && this.phase === 'play') { const ch = this.activeChant(this.time()); if (ch) this.chantTap(ch); }
    if (k === 'escape') this.phase === 'paused' ? this.resume() : this.pause();
  },
  onButton(id) {
    if (id === 'pause') this.pause();
    else if (id === 'resume') this.resume();
    else if (id === 'retry') go('play', { song: this.song, mode: this.mode });
    else if (id === 'quit') go('select', { song: this.song, mode: this.mode });
  },
  onHide() { this.pause(); },
  pause() { if (this.phase !== 'play') return; this.phase = 'paused'; Music.pause(); this.laneDown = [0, 0, 0, 0]; },
  resume() { if (this.phase !== 'paused') return; this.phase = 'play'; Music.resume(); Mv.seekNow(Music.el.currentTime); },

  // ------------------------------------------------------------ 판정
  judge(n, res, delta) {
    n.st = 2; n.res = res; n.jt = this.time();
    this.cnt[res]++; this.judged++; this.accSum += ACC[res];
    if (res === 'MISS') { this.combo = 0; this.energy = Math.max(0, this.energy - 0.12); }
    else {
      this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo); this.comboPulse = 1;
      this.energy = Math.min(1, this.energy + (res === 'PERFECT' ? 0.035 : 0.02));
      this.deltas.push(delta);
      this.comboCutin();
    }
    this.jtext[n.c] = { res, t: performance.now(), fast: res === 'GOOD' ? (delta < 0 ? 'FAST' : 'SLOW') : '' };
    if (res !== 'MISS') this.hitFx(n.c, res, false);
  },
  hitFx(c, res, hold) {
    const x = xAt(c - 1.5, 1), col = LANE_COLORS[c];
    Particles.burst(x, JY, col, res === 'PERFECT' ? 16 : 9, res === 'PERFECT' ? 1.1 : 0.8);
    Particles.ring(x, JY, col, 36);
    if (hold) this.jtext[c] = { res, t: performance.now(), fast: '' };
  },
  comboCutin() {
    const k = this.combo;
    let kind = null;
    for (const [n, kk] of COMBO_CUTS) if (k === n) kind = kk;
    if (k > 200 && k % 100 === 0) kind = 'amazing';
    if (!kind) return;
    const t = this.time();
    if (this.chants.some(c => t > c.t0 - 1.6 && t < c.t1)) return;   // 떼창 컷인과 겹치지 않게
    Cutin.show(this.song, kind, `${k} COMBO`, { dur: 1400, compact: true });
    Sfx.chime();
  },
  activeChant(t) { return this.chants.find(c => t >= c.t0 && t < c.t1 && !c.done) || null; },
  chantTap(ch) {
    ch.taps++; Sfx.clap();
    const x = 120 + Math.random() * 300, y = 470 + Math.random() * 120;
    Particles.burst(x, y, LANE_COLORS[ch.taps % 4], 6, 0.7);
  },

  // ------------------------------------------------------------ 매 프레임 갱신
  update(t) {
    if (this.phase !== 'play') return;
    // 자동 플레이 (?auto=1)
    if (AUTO) {
      for (const n of this.notes) {
        if (n.t > t + 0.02) break;
        if (n.st === 0 && t >= n.t) { this.press(n.c); if (n.type === 'tap') this.release(n.c); else this.autoHold[n.c] = n; }
      }
      for (const c in this.autoHold) { const n = this.autoHold[c]; if (t >= n.t + n.d) { this.release(+c); delete this.autoHold[c]; } }
      const ch = this.activeChant(t); if (ch && t - (this.autoTapT || 0) > 0.12) { this.autoTapT = t; this.chantTap(ch); }
    }
    // 놓친 노트
    for (const n of this.notes) {
      if (n.t - t > 0.5) break;
      if (n.st === 0 && t - n.t > this.win[1]) this.judge(n, 'MISS', 0);
      if (n.st === 1) {
        if (t >= n.t + n.d) this.judge(n, n.head, n.delta);                       // 끝까지 누르고 있으면 자동 완료
        else if (frameCount % 5 === 0) Particles.burst(xAt(n.c - 1.5, 1), JY, LANE_COLORS[n.c], 2, 0.6);
      }
    }
    // 떼창
    for (const c of this.chants) {
      if (!c.cut && t >= c.t0 - 0.15) {   // 마지막 노트가 지나간 뒤에 등장
        c.cut = true; Cutin.show(this.song, 'fever', '화면을 마구 터치해서 함께 불러요!', { dur: 1900 }); Sfx.chime(); }
      if (!c.done && t >= c.t1) {
        c.done = true; c.ok = c.taps >= c.need;
        if (c.ok) { this.chantBonus += 10000; this.energy = 1; Sfx.fanfare(); for (let i = 0; i < 6; i++) Particles.burst(60 + i * 84, 500, LANE_COLORS[i % 4], 14, 1.3); }
        c.resT = performance.now();
      }
    }
    // 끝
    if (t > this.endT && !this.finishAt) {
      this.finishAt = performance.now();
      if (this.cnt.MISS === 0 && this.N > 0) { Cutin.show(this.song, 'fever', `${this.maxCombo} COMBO · MISS 0`, { label: 'FULL COMBO!', big: true, dur: 2600 }); Sfx.fanfare(); this.fcShown = true; }
      Music.fadeOut(this.fcShown ? 2400 : 1200);
    }
    if (this.finishAt && performance.now() - this.finishAt > (this.fcShown ? 2700 : 1300)) this.finish();
  },
  get sync() { return this.judged ? this.accSum / this.judged * 100 : 100; },
  get score() { return this.N ? Math.round(900000 * this.accSum / this.N + 100000 * this.maxCombo / this.N) + this.chantBonus : 0; },
  finish() {
    const sync = this.N ? this.accSum / this.N * 100 : 0;
    const rank = sync >= 95 ? 'S' : sync >= 88 ? 'A' : sync >= 75 ? 'B' : sync >= 60 ? 'C' : 'D';
    const avg = this.deltas.length ? this.deltas.reduce((a, b) => a + b, 0) / this.deltas.length : 0;
    go('result', { song: this.song, mode: this.mode, cnt: this.cnt, maxCombo: this.maxCombo, N: this.N, sync, score: this.score, rank,
                   fc: this.cnt.MISS === 0, chantOk: this.chants.filter(c => c.ok).length, chantTotal: this.chants.length, avg, auto: AUTO });
  },

  // ------------------------------------------------------------ 그리기
  draw() {
    const t = this.time(), c = ctx(), song = this.song;
    this.update(t);
    Mv.sync(Clock.now(), Music.el && !Music.el.paused && this.phase === 'play');
    const beatLen = 60 / this.ch.bpm, beat = (((t - this.ch.ph) / beatLen) % 1 + 1) % 1;
    const chant = this.activeChant(t);

    // 1. 무대 배경 (화면 전체에 깔리는 배경은 main.js 가 그림 — 여기서는 같은 그림을 같은 밝기로)
    this.dim = Mv.showing ? (chant ? 0.25 : 0.45) : (chant ? 0.35 : 0.5);
    if (!Mv.showing && OX < 1 && OY < 1) { imgCover(IMG['stage_' + song.id], 0, 0, W, H); c.fillStyle = `rgba(10,4,24,${this.dim})`; c.fillRect(0, 0, W, H); }
    Stars.draw(0.5);
    // 박자에 맞춰 번쩍이는 무대 조명
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const sw = Math.sin(t * 0.9 + i * 1.7) * 0.4;
      c.save(); c.translate(70 + i * 133, -10); c.rotate(sw);
      c.fillStyle = grad(0, 0, 0, 520, [[0, rgba(LANE_COLORS[i], 0.10 + 0.18 * (1 - beat) * this.energy)], [1, rgba(LANE_COLORS[i], 0)]]);
      c.beginPath(); c.moveTo(-6, 0); c.lineTo(6, 0); c.lineTo(70, 520); c.lineTo(-70, 520); c.fill(); c.restore();
    }
    c.restore();

    // 2. 레인
    this.drawLanes(t, beatLen);
    // 3. 노트 (먼 것부터)
    this.drawNotes(t);
    // 4. 판정선 · 응원봉 버튼
    this.drawButtons();
    // 5. 관객석
    const allOn = this.chants.some(ch => ch.ok && performance.now() - ch.resT < 2500) ? 1 : 0;
    Crowd.draw(this.energy, beat, allOn);
    // 6. 불꽃 · 판정 글자 · 콤보
    Particles.update(); Particles.draw();
    this.drawJudge();
    // 7. 떼창
    this.drawChant(t, beat, chant);
    // 8. 위쪽 정보
    this.drawHud(t);
    // 9. 컷인
    Cutin.draw();
    // 10. 시작 · 일시정지 안내
    if (this.blocked) { c.fillStyle = 'rgba(8,4,20,.7)'; c.fillRect(0, 0, W, H); txt('화면을 터치하면 시작해요', W / 2, H / 2, 24, '#fff', 'center', 900, { glow: '#FF3DAA' }); }
    else if (t < 1.6 && this.phase === 'play') {
      const u = t / 1.6;
      txt(t < 1.1 ? 'READY?' : 'GO!', W / 2, 440, t < 1.1 ? 44 : 60, '#fff', 'center', 900, { italic: true, glow: song.accent, blur: 26, alpha: t < 1.1 ? clamp(t * 3, 0, 1) : 1 - (u - 0.69) / 0.31 });
      txt(`${song.title}  ·  ${MODES[this.mode].name}`, W / 2, 500, 16, '#fff', 'center', 700, { alpha: clamp(1 - u, 0, 1) });
    }
    if (this.phase === 'paused') this.drawPause();
    for (let i = 0; i < 4; i++) this.laneFlash[i] *= 0.85;
    this.comboPulse *= 0.85;
  },

  drawLanes(t, beatLen) {
    const c = ctx(), s0 = scaleAt(0) * 0.92, s1 = 1.2;
    // 바닥
    c.beginPath(); c.moveTo(xAt(-2, s0), yAt(s0)); c.lineTo(xAt(2, s0), yAt(s0)); c.lineTo(xAt(2, s1), yAt(s1)); c.lineTo(xAt(-2, s1), yAt(s1)); c.closePath();
    c.fillStyle = grad(0, yAt(s0), 0, JY, [[0, 'rgba(20,8,40,0)'], [0.3, 'rgba(20,8,40,.55)'], [1, 'rgba(20,8,40,.75)']]); c.fill();
    // 누른 레인 빛기둥
    for (let i = 0; i < 4; i++) {
      const a = Math.max(this.laneDown[i] > 0 ? 0.85 : 0, this.laneFlash[i] * 0.7);
      if (a < 0.02) continue;
      c.save(); c.beginPath();
      c.moveTo(xAt(i - 2, s0), yAt(s0)); c.lineTo(xAt(i - 1, s0), yAt(s0)); c.lineTo(xAt(i - 1, 1), JY); c.lineTo(xAt(i - 2, 1), JY); c.closePath(); c.clip();
      c.globalCompositeOperation = 'lighter';
      img(IMG['beam_' + LANE_KEYS[i]], xAt(i - 2, 1), yAt(s0), LW, JY - yAt(s0), a);
      c.restore();
    }
    // 박자선
    c.save(); c.lineWidth = 2;
    const k0 = Math.ceil((t - this.ch.ph) / beatLen);
    for (let k = k0; ; k++) {
      const tb = this.ch.ph + k * beatLen, p = 1 - (tb - t) / this.lead;
      if (p < 0) break;
      const sc = scaleAt(p), y = yAt(sc);
      c.strokeStyle = `rgba(255,255,255,${(k % 4 === 0 ? 0.22 : 0.08) * Math.min(1, p * 4)})`;
      c.beginPath(); c.moveTo(xAt(-2, sc), y); c.lineTo(xAt(2, sc), y); c.stroke();
    }
    c.restore();
    // 레인 경계선
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let e = -2; e <= 2; e++) {
      c.strokeStyle = grad(0, yAt(s0), 0, JY, [[0, 'rgba(255,255,255,0)'], [1, e === -2 || e === 2 ? 'rgba(255,120,220,.75)' : 'rgba(255,255,255,.28)']]);
      c.lineWidth = e === -2 || e === 2 ? 3 : 1.5;
      c.beginPath(); c.moveTo(xAt(e, s0), yAt(s0)); c.lineTo(xAt(e, s1), yAt(s1)); c.stroke();
    }
    c.restore();
  },

  drawNotes(t) {
    const c = ctx(), L = this.lead;
    const vis = [];
    for (const n of this.notes) {
      const p = 1 - (n.t - t) / L;
      if (p < 0) break;
      if (n.st === 2 && n.res !== 'MISS') continue;
      if (n.st === 2 && t - n.jt > 0.35) continue;
      vis.push([n, p]);
    }
    vis.reverse();
    for (const [n, p] of vis) {
      const col = LANE_COLORS[n.c], missed = n.st === 2;
      // 꾹 노트 빛 꼬리
      if (n.type === 'hold') {
        const ph = n.st === 1 ? 1 : p, pt = Math.max(0, 1 - (n.t + n.d - t) / L);
        if (pt < ph) {
          const a = scaleAt(pt), b = scaleAt(ph), e = n.c - 1.5, hw = 0.3;
          c.save(); c.globalCompositeOperation = missed ? 'source-over' : 'lighter';
          c.beginPath(); c.moveTo(xAt(e - hw, a), yAt(a)); c.lineTo(xAt(e + hw, a), yAt(a)); c.lineTo(xAt(e + hw, b), yAt(b)); c.lineTo(xAt(e - hw, b), yAt(b)); c.closePath();
          c.fillStyle = missed ? 'rgba(120,110,140,.35)' : grad(0, yAt(a), 0, yAt(b), [[0, rgba(col, .15)], [1, rgba(col, n.st === 1 ? .85 : .55)]]); c.fill();
          if (!missed) {
            c.beginPath(); c.moveTo(xAt(e - 0.07, a), yAt(a)); c.lineTo(xAt(e + 0.07, a), yAt(a)); c.lineTo(xAt(e + 0.07, b), yAt(b)); c.lineTo(xAt(e - 0.07, b), yAt(b)); c.closePath();
            c.fillStyle = `rgba(255,255,255,${n.st === 1 ? 0.8 : 0.45})`; c.fill();
          }
          c.restore();
        }
        if (n.st === 1) continue;   // 누르는 중이면 머리는 판정선에 붙어 있음 (버튼이 빛남)
      }
      if (p > 1.3) continue;
      const sc = scaleAt(Math.min(p, 1.3)), x = xAt(n.c - 1.5, sc), y = yAt(sc), sz = 96 * sc;
      const fade = Math.min(1, p / 0.08) * (missed ? 0.35 : 1);
      c.save(); c.globalAlpha = fade;
      if (!missed) { c.shadowColor = col; c.shadowBlur = 18 * sc; }
      if (missed) c.filter = 'grayscale(1)';
      img(IMG['note_' + LANE_KEYS[n.c]], x - sz / 2, y - sz / 2, sz, sz);
      c.restore();
      if (!missed) {   // 하트 위 하이라이트 · 테두리
        c.save(); c.globalAlpha = fade * 0.9;
        heartPath(x, y + sz * 0.02, sz * 0.62); c.strokeStyle = '#fff'; c.lineWidth = 2.5 * sc; c.stroke();
        c.globalAlpha = fade * 0.55; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x - sz * 0.17, y - sz * 0.12, sz * 0.09, sz * 0.06, -0.6, 0, Math.PI * 2); c.fill();
        if (n.type === 'hold') { txt('꾹', x, y + sz * 0.05, 20 * sc, '#fff', 'center', 900, { stroke: rgba(col, 1), sw: 4 * sc }); }
        c.restore();
      }
    }
  },

  drawButtons() {
    const c = ctx();
    // 판정선
    c.save(); c.globalCompositeOperation = 'lighter';
    c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 3; c.shadowColor = '#FF3DAA'; c.shadowBlur = 16;
    c.beginPath(); c.moveTo(xAt(-2, 1), JY); c.lineTo(xAt(2, 1), JY); c.stroke(); c.restore();
    for (let i = 0; i < 4; i++) {
      const x = xAt(i - 1.5, 1), col = LANE_COLORS[i], on = this.laneDown[i] > 0, f = Math.max(on ? 1 : 0, this.laneFlash[i]);
      const holding = this.notes.some(n => n.st === 1 && n.c === i);
      c.save();
      c.shadowColor = col; c.shadowBlur = 14 + 26 * f;
      c.fillStyle = on || holding ? rgba(col, .75) : 'rgba(15,8,30,.55)';
      c.beginPath(); c.ellipse(x, JY, 46 + 4 * f, 24 + 2 * f, 0, 0, Math.PI * 2); c.fill();
      c.lineWidth = 4; c.strokeStyle = col; c.stroke();
      c.restore();
      // 응원봉 모양 (가운데 하트)
      c.save(); heartPath(x, JY + 2, 26); c.fillStyle = on || holding ? '#fff' : rgba(col, .9); c.fill(); c.restore();
      txt(KEYS[i].toUpperCase(), x, JY + 42, 11, 'rgba(255,255,255,.45)', 'center', 700);
    }
  },

  drawJudge() {
    const now = performance.now();
    for (let i = 0; i < 4; i++) {
      const j = this.jtext[i]; if (!j) continue;
      const u = (now - j.t) / 520; if (u > 1) { this.jtext[i] = null; continue; }
      const x = xAt(i - 1.5, 1), y = 730 - u * 26, col = j.res === 'PERFECT' ? '#FFF0A0' : j.res === 'GOOD' ? '#8FE8FF' : '#a99cc4';
      const sc = 1 + 0.25 * Math.max(0, 1 - u * 5);
      const c = ctx(); c.save(); c.translate(x, y); c.scale(sc, sc);
      txt(j.res, 0, 0, j.res === 'PERFECT' ? 20 : 18, col, 'center', 900, { italic: true, alpha: 1 - u * u, stroke: 'rgba(30,8,50,.85)', sw: 5, glow: j.res === 'MISS' ? null : LANE_COLORS[i] });
      if (j.fast) txt(j.fast, 0, 20, 11, j.fast === 'FAST' ? '#7fd8ff' : '#ff9a7a', 'center', 900, { alpha: 1 - u });
      c.restore();
    }
    // 콤보
    if (this.combo >= 3) {
      const c = ctx(), sc = 1 + this.comboPulse * 0.18;
      c.save(); c.translate(W / 2, 400); c.scale(sc, sc);
      txt('COMBO', 0, -40, 14, '#fff', 'center', 900, { alpha: 0.85, glow: '#FF3DAA' });
      txt(String(this.combo), 0, 2, 62, '#fff', 'center', 900, { italic: true, stroke: 'rgba(60,10,80,.7)', sw: 8, glow: '#FF3DAA', blur: 24 });
      c.restore();
    }
  },

  drawChant(t, beat, chant) {
    const c = ctx();
    if (chant) {
      const u = (t - chant.t0) / (chant.t1 - chant.t0), fill = Math.min(1, chant.taps / chant.need), r = 92 + (1 - beat) * 16;
      c.save(); c.globalCompositeOperation = 'lighter';
      const rg = c.createRadialGradient(W / 2, 530, 40, W / 2, 530, 330);
      rg.addColorStop(0, `rgba(255,61,170,${0.30 + 0.2 * (1 - beat)})`); rg.addColorStop(0.6, 'rgba(180,90,255,.12)'); rg.addColorStop(1, 'rgba(180,90,255,0)');
      c.fillStyle = rg; c.fillRect(0, 200, W, 660);
      c.restore();
      c.save(); c.shadowColor = '#FF3DAA'; c.shadowBlur = 40;
      c.fillStyle = 'rgba(30,8,50,.65)'; c.beginPath(); c.arc(W / 2, 530, r, 0, Math.PI * 2); c.fill();
      c.lineWidth = 10; c.strokeStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(W / 2, 530, r - 8, 0, Math.PI * 2); c.stroke();
      c.strokeStyle = fill >= 1 ? '#FFD54F' : '#FF3DAA'; c.beginPath(); c.arc(W / 2, 530, r - 8, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fill); c.stroke();
      c.restore();
      txt('떼창!', W / 2, 515, 40, '#fff', 'center', 900, { italic: true, glow: '#FF3DAA', blur: 20 });
      txt(fill >= 1 ? '성공! 계속 불러요' : `${chant.taps} / ${chant.need}`, W / 2, 560, 16, fill >= 1 ? '#FFD54F' : '#fff', 'center', 900);
      txt('화면 아무 곳이나 연타!', W / 2, 660, 15, '#fff', 'center', 700, { alpha: 0.6 + 0.4 * Math.sin(t * 10) });
      rrect(120, 690, 300, 8, 4, 'rgba(255,255,255,.15)'); rrect(120, 690, 300 * (1 - u), 8, 4, 'rgba(255,255,255,.6)');
    }
    // 결과 알림
    for (const ch of this.chants) {
      if (!ch.done) continue;
      const u = (performance.now() - ch.resT) / 1800; if (u > 1) continue;
      txt(ch.ok ? '떼창 성공!! +10000' : '떼창 아쉬워요…', W / 2, 520 - u * 30, ch.ok ? 34 : 26, ch.ok ? '#FFD54F' : '#cfc6e6', 'center', 900, { italic: true, alpha: 1 - u * u, stroke: 'rgba(40,8,60,.8)', sw: 7, glow: ch.ok ? '#FF3DAA' : null });
    }
  },

  drawHud(t) {
    const c = ctx(), song = this.song, m = MODES[this.mode];
    c.fillStyle = grad(0, 0, 0, 110, [[0, 'rgba(8,4,20,.85)'], [1, 'rgba(8,4,20,0)']]); c.fillRect(0, 0, W, 110);
    btn('pause', 14, 16, 46, 46, (x, y, w, h) => {
      rrect(x, y, w, h, 23, 'rgba(255,255,255,.14)', 'rgba(255,255,255,.4)', 1.5);
      c.fillStyle = '#fff'; c.fillRect(x + 16, y + 14, 5, 18); c.fillRect(x + 25, y + 14, 5, 18);
    });
    txt(song.title, 72, 30, 17, '#fff', 'left', 900);
    rrect(72, 44, 64, 20, 10, rgba(m.color, .3), m.color, 1.5); txt(m.name, 104, 54.5, 11, '#fff', 'center', 900);
    if (AUTO) txt('AUTO', 144, 54.5, 11, '#FFD54F', 'left', 900);
    const dur = this.endT, u = clamp(t / dur, 0, 1);
    rrect(72, 74, 250, 5, 2.5, 'rgba(255,255,255,.15)'); rrect(72, 74, 250 * u, 5, 2.5, grad(72, 0, 322, 0, [[0, song.accent2], [1, song.accent]]));
    for (const ch of this.chants) { const x = 72 + 250 * ch.t0 / dur; c.fillStyle = '#FFD54F'; c.fillRect(x, 70, 3, 13); }
    this.shownScore += (this.score - this.shownScore) * 0.2;
    txt(String(Math.round(this.shownScore)).padStart(7, '0'), W - 18, 30, 22, '#fff', 'right', 900, { glow: song.accent, blur: 10 });
    txt(`싱크로율 ${this.sync.toFixed(1)}%`, W - 18, 58, 13, '#FFD54F', 'right', 900);
  },

  drawPause() {
    const c = ctx();
    c.fillStyle = 'rgba(8,4,20,.92)'; c.fillRect(0, 0, W, H);
    txt('일시정지', W / 2, 330, 34, '#fff', 'center', 900, { glow: '#FF3DAA' });
    txt(`${this.song.title} · ${MODES[this.mode].name}`, W / 2, 375, 15, '#cfc6e6', 'center', 400);
    pillButton('resume', '계속하기', 140, 430, 260, 64, '#FF3DAA', '#B45AFF', 22);
    ghostButton('retry', '처음부터 다시', 140, 514, 260, 56, 18);
    ghostButton('quit', '곡 선택으로', 140, 590, 260, 56, 18);
  },
};
