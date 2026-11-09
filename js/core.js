// ===========================================================================
//  core.js — 게임 전체가 같이 쓰는 것들
//   · 화면 크기(540×960 세로 기준) · 색
//   · 이미지 불러오기 (Assets) · 음악 (Music) · 노래 시계 (Clock)
//   · 저장 (Save) · 효과음 (Sfx) · 글자/그림 그리기 도우미
// ===========================================================================

let S = 1, OX = 0, OY = 0;                    // 확대 비율 · 가운데 맞춤 여백 (main.js 에서 계산)
let scene = null;                             // 지금 화면
const Scenes = {};                            // 화면 목록 (scene_*.js 파일들이 채움)
let backdropImg = null;                       // 화면 양옆 빈 곳을 채울 배경
const W = 540, H = 960;                       // 설계 기준 화면 (폰 세로 9:16)
const LANE_COLORS = ['#FF3DAA', '#4FC3FF', '#B45AFF', '#FFD54F'];   // 핑크 · 블루 · 퍼플 · 옐로
const LANE_KEYS = ['pink', 'blue', 'purple', 'yellow'];
const KEYS = ['d', 'f', 'j', 'k'];            // PC 키보드
const FONT = "'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif";
const QS = new URLSearchParams(location.search);
const AUTO = QS.get('auto') === '1';          // ?auto=1 : 자동 플레이 (시연 · 녹화용)

// ---------------------------------------------------------------- 이미지
// p5 의 loadImage 대신 브라우저 기본 Image 를 쓴다 → index.html 더블클릭(file://)으로도 열림
const IMG = {};
const Assets = {
  total: 0, done: 0, failed: [],
  img(key, src) {
    this.total++;
    const im = new Image();
    im.onload = () => this.done++;
    im.onerror = () => { this.done++; this.failed.push(src); };
    im.src = src;
    IMG[key] = im;
    return im;
  },
  loadAll() {
    this.img('logo', 'assets/img/title_logo.webp');
    for (const k of LANE_KEYS) {
      this.img('note_' + k, `assets/img/note_${k}.png`);
      this.img('beam_' + k, `assets/img/beam_${k}.png`);
    }
    for (const s of SONGS) {
      this.img('stage_' + s.id, `assets/stage/${s.id}.webp`);
      for (const n of ['nice', 'great', 'amazing', 'fever']) this.img(`cut_${s.id}_${n}`, `assets/cutin/${s.id}_${n}.webp`);
      this.img('thumb_' + s.id, `assets/illust/${s.ill}_thumb.webp`);
    }
  },
  // 원본 일러스트는 클 수 있으니 필요할 때만 불러온다
  illust(song) {
    const k = 'ill_' + song.id;
    if (!IMG[k]) { const im = new Image(); im.src = `assets/illust/${song.ill}.jpg`; IMG[k] = im; }
    return IMG[k];
  },
  get progress() { return this.total ? this.done / this.total : 0; },
};
function ok(im) { return im && im.complete && im.naturalWidth > 0; }

// ---------------------------------------------------------------- 음악
const Music = {
  el: null, id: null, fade: null,
  load(song) {
    if (this.id === song.id && this.el) return this.el;
    this.stop();
    const a = new Audio();
    a.preload = 'auto';
    a.src = `assets/music/${song.id}.mp3`;
    this.el = a; this.id = song.id;
    return a;
  },
  playFrom(t, vol = 1) {
    const a = this.el; if (!a) return;
    this.fade = null;
    a.volume = vol;
    const seek = () => { try { a.currentTime = t; } catch (e) {} };
    if (a.readyState >= 1) seek(); else a.addEventListener('loadedmetadata', seek, { once: true });
    const p = a.play(); if (p && p.catch) p.catch(() => {});
    Clock.reset();
    return p;
  },
  pause() { if (this.el) this.el.pause(); },
  resume() { if (this.el) { const p = this.el.play(); if (p && p.catch) p.catch(() => {}); Clock.reset(); } },
  stop() { if (this.el) { this.el.pause(); } this.fade = null; },
  fadeOut(ms = 800) { if (this.el) this.fade = { from: this.el.volume, t0: performance.now(), ms }; },
  update() {
    if (!this.fade || !this.el) return;
    const u = (performance.now() - this.fade.t0) / this.fade.ms;
    if (u >= 1) { this.el.pause(); this.fade = null; return; }
    this.el.volume = Math.max(0, this.fade.from * (1 - u));
  },
};

// ---------------------------------------------------------------- 노래 시계
// audio.currentTime 은 브라우저에 따라 띄엄띄엄 갱신되므로,
// performance.now() 로 부드럽게 이어 주고 차이가 커지면 다시 맞춘다
const Clock = {
  a0: 0, p0: 0, synced: false,
  reset() { this.synced = false; },
  now() {
    const a = Music.el; if (!a) return 0;
    const at = a.currentTime;
    if (a.paused || a.readyState < 3) { this.synced = false; return at; }
    const p = performance.now() / 1000;
    let t = this.a0 + (p - this.p0);
    if (!this.synced || Math.abs(t - at) > 0.08) { this.a0 = at; this.p0 = p; this.synced = true; return at; }
    this.a0 += (at - t) * 0.03;                 // 아주 조금씩 실제 재생 위치 쪽으로
    return t;
  },
};

// ---------------------------------------------------------------- 저장 (이 기기의 브라우저에만)
const Save = {
  key: 'lightupderuru_v2',
  data: { offset: 0, speed: 1.0, best: {}, unlocked: [], newIll: [], mvOn: true, mvOffset: {} },
  load() {
    try { const s = JSON.parse(localStorage.getItem(this.key)); if (s) Object.assign(this.data, s); } catch (e) {}
  },
  write() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} },
  best(id, mode) { return (this.data.best[id] || {})[mode] || null; },
  setBest(id, mode, rec) {
    const b = this.data.best[id] = this.data.best[id] || {};
    const old = b[mode];
    if (!old || rec.score > old.score) b[mode] = rec;
    else if (rec.fc && !old.fc) old.fc = true;
    this.write();
  },
  unlock(id) {
    if (this.data.unlocked.includes(id)) return false;
    this.data.unlocked.push(id); this.data.newIll.push(id); this.write(); return true;
  },
  isUnlocked(id) { return this.data.unlocked.includes(id); },
};

// ---------------------------------------------------------------- 효과음 (파일 없이 소리 합성)
const Sfx = {
  ctx: null,
  init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  tone(freq, dur = 0.12, type = 'sine', vol = 0.15, delay = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination); o.start(t); o.stop(t + dur + 0.02);
  },
  click() { this.tone(880, 0.06, 'triangle', 0.08); },
  clap() {
    const c = this.ctx; if (!c) return;
    const n = c.sampleRate * 0.08, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1500; g.gain.value = 0.25;
    s.buffer = b; s.connect(f).connect(g).connect(c.destination); s.start();
  },
  chime() { [1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.35, 'sine', 0.1, i * 0.07)); },
  fanfare() { [784, 988, 1175, 1568, 1976].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.09, i * 0.09)); },
};

// ---------------------------------------------------------------- 그리기 도우미 (캔버스 2D 를 직접 사용)
function ctx() { return drawingContext; }

function txt(s, x, y, size, col = '#fff', align = 'center', weight = 700, opt = {}) {
  const c = ctx();
  c.save();
  c.font = `${opt.italic ? 'italic ' : ''}${weight} ${size}px ${FONT}`;
  c.textAlign = align; c.textBaseline = opt.base || 'middle';
  if (opt.alpha !== undefined) c.globalAlpha *= opt.alpha;
  if (opt.glow) { c.shadowColor = opt.glow; c.shadowBlur = opt.blur || 16; }
  if (opt.stroke) { c.lineJoin = 'round'; c.lineWidth = opt.sw || 4; c.strokeStyle = opt.stroke; c.strokeText(s, x, y); }
  c.fillStyle = col; c.fillText(s, x, y);
  c.restore();
}

function img(im, x, y, w, h, alpha = 1) {
  if (!ok(im)) return;
  const c = ctx(); c.save(); c.globalAlpha *= alpha; c.drawImage(im, x, y, w, h); c.restore();
}

// 이미지가 영역을 꽉 채우도록 (잘라서) 그리기
function imgCover(im, x, y, w, h, alpha = 1) {
  if (!ok(im)) return;
  const r = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const iw = im.naturalWidth * r, ih = im.naturalHeight * r;
  img(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih, alpha);
}

function rrect(x, y, w, h, r, fill, stroke, sw = 2) {
  const c = ctx(); c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (stroke) { c.strokeStyle = stroke; c.lineWidth = sw; c.stroke(); }
}

function rgba(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

function grad(x0, y0, x1, y1, stops) {
  const g = ctx().createLinearGradient(x0, y0, x1, y1);
  stops.forEach(([o, col]) => g.addColorStop(o, col));
  return g;
}

const ease = { out: u => 1 - Math.pow(1 - u, 3), inOut: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2, back: u => 1 + 2.7 * Math.pow(u - 1, 3) + 1.7 * Math.pow(u - 1, 2) };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function fmtTime(s) { s = Math.max(0, Math.floor(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

// ---------------------------------------------------------------- 버튼 (화면마다 매 프레임 다시 등록)
// btn(id, x, y, w, h, 그리기함수) → 눌렀는지는 scene.onButton(id) 로 전달
let BUTTONS = [];
function btn(id, x, y, w, h, drawFn) {
  BUTTONS.push({ id, x, y, w, h });
  const press = Input.pressedBtn === id;
  const c = ctx(); c.save();
  if (press) { c.translate(x + w / 2, y + h / 2); c.scale(0.95, 0.95); c.translate(-(x + w / 2), -(y + h / 2)); }
  drawFn(x, y, w, h, press);
  c.restore();
}
function hitButton(x, y) {
  for (let i = BUTTONS.length - 1; i >= 0; i--) {
    const b = BUTTONS[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}

// 자주 쓰는 알약 모양 버튼
function pillButton(id, label, x, y, w, h, colA = '#FF3DAA', colB = '#B45AFF', size = 20) {
  btn(id, x, y, w, h, () => {
    const c = ctx(); c.save(); c.shadowColor = rgba(colA, .6); c.shadowBlur = 18;
    rrect(x, y, w, h, h / 2, grad(x, 0, x + w, 0, [[0, colA], [1, colB]])); c.restore();
    txt(label, x + w / 2, y + h / 2 + 1, size, '#fff', 'center', 900);
  });
}
function ghostButton(id, label, x, y, w, h, size = 16) {
  btn(id, x, y, w, h, () => {
    rrect(x, y, w, h, h / 2, 'rgba(255,255,255,.10)', 'rgba(255,255,255,.35)', 1.5);
    txt(label, x + w / 2, y + h / 2 + 1, size, '#fff', 'center', 700);
  });
}

// ---------------------------------------------------------------- 입력 (터치 여러 손가락 · 마우스 · 키보드)
const Input = {
  pressedBtn: null, down: {}, // pointerId → {x,y,lane,btn,sx,sy}
  toLocal(e) { return { x: (e.clientX - OX) / S, y: (e.clientY - OY) / S }; },
  bind(el) {
    el.addEventListener('pointerdown', e => {
      e.preventDefault(); Sfx.init();
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
      const p = this.toLocal(e), b = hitButton(p.x, p.y);
      this.down[e.pointerId] = { x: p.x, y: p.y, sx: p.x, sy: p.y, btn: b };
      if (b) this.pressedBtn = b;
      if (scene && scene.onDown) scene.onDown(p.x, p.y, e.pointerId, b);
    });
    const up = e => {
      const d = this.down[e.pointerId]; delete this.down[e.pointerId];
      const p = this.toLocal(e);
      if (d && d.btn && this.pressedBtn === d.btn && hitButton(p.x, p.y) === d.btn) {
        Sfx.click(); if (scene && scene.onButton) scene.onButton(d.btn);
      }
      if (d && d.btn) this.pressedBtn = null;
      if (scene && scene.onUp) scene.onUp(p.x, p.y, e.pointerId, d);
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('pointermove', e => {
      const d = this.down[e.pointerId]; if (!d) return;
      const p = this.toLocal(e); d.x = p.x; d.y = p.y;
      if (scene && scene.onMove) scene.onMove(p.x, p.y, e.pointerId, d);
    });
    el.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('keydown', e => {
      if (e.repeat) return; Sfx.init();
      if (scene && scene.onKey) scene.onKey(e.key.toLowerCase(), true, e);
    });
    window.addEventListener('keyup', e => { if (scene && scene.onKey) scene.onKey(e.key.toLowerCase(), false, e); });
  },
};
