// ===========================================================================
//  main.js — p5.js 시작점 : setup() · draw() · 화면(scene) 전환
//   화면 목록 : loading → title → select → play → result  (+ gallery)
//   모든 화면은 540×960 기준으로 그리고, 실제 창 크기에 맞춰 확대/축소한다
// ===========================================================================


function go(name, arg) {
  if (scene && scene.exit) scene.exit();
  scene = Scenes[name];
  scene.t0 = performance.now();
  Input.pressedBtn = null;
  if (scene.enter) scene.enter(arg);
}

function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  fit();
  Save.load();
  Crowd.init();
  Assets.loadAll();
  Input.bind(cnv.elt);
  Mv.init();
  document.addEventListener('visibilitychange', () => { if (document.hidden && scene && scene.onHide) scene.onHide(); });
  go('loading');
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); fit(); }
function fit() { S = Math.min(width / W, height / H); OX = (width - W * S) / 2; OY = (height - H * S) / 2; }

function draw() {
  BUTTONS = [];
  Music.update();
  const c = drawingContext;
  c.setTransform(pixelDensity(), 0, 0, pixelDensity(), 0, 0);
  if (Mv.showing && Mv.mode === 'cover') {
    // MV 가 뒤에 깔려 있으면 캔버스를 투명하게 비우고 살짝 어둡게만
    c.clearRect(0, 0, width, height);
    c.fillStyle = `rgba(10,4,24,${scene.dim !== undefined ? scene.dim : 0.5})`; c.fillRect(0, 0, width, height);
  } else {
  c.fillStyle = '#0a0614'; c.fillRect(0, 0, width, height);
  // 화면 양옆(또는 위아래) 빈 곳 : 배경을 그대로 이어서 깔고 같은 밝기로 어둡게
  if (ok(backdropImg) && (OX > 1 || OY > 1)) {
    c.save();
    const r = Math.max(width / backdropImg.naturalWidth, height / backdropImg.naturalHeight);
    c.drawImage(backdropImg, (width - backdropImg.naturalWidth * r) / 2, (height - backdropImg.naturalHeight * r) / 2, backdropImg.naturalWidth * r, backdropImg.naturalHeight * r);
    c.fillStyle = `rgba(10,4,24,${scene.dim !== undefined ? scene.dim : 0.6})`; c.fillRect(0, 0, width, height);
    c.restore();
  }
  }
  Mv.layout();
  c.save();
  c.translate(OX, OY); c.scale(S, S);
  c.beginPath(); c.rect(0, 0, W, H); c.clip();
  scene.draw((performance.now() - scene.t0) / 1000);
  Toast.draw();
  c.restore();
  // 세로로 긴 폰 : 위 · 아래 남는 곳을 화면 끝 색으로 이어 주기
  if (OY > 1) {
    if (scene.edgeTop) { c.fillStyle = scene.edgeTop; c.fillRect(0, 0, width, OY + 1); }
    if (scene.edgeBottom) { c.fillStyle = scene.edgeBottom; c.fillRect(0, OY + H * S - 1, width, OY + 1); }
  }
}

// ---------------------------------------------------------------- 불러오는 중
Scenes.loading = {
  enter() { this.fontReady = false; (document.fonts ? document.fonts.load(`900 20px 'Noto Sans KR'`) : Promise.resolve()).then(() => this.fontReady = true, () => this.fontReady = true); setTimeout(() => this.fontReady = true, 2500); },
  draw(t) {
    const c = ctx(); c.fillStyle = grad(0, 0, 0, H, [[0, '#1a0830'], [1, '#07030f']]); c.fillRect(0, 0, W, H);
    Stars.draw();
    const p = Assets.progress;
    txt('LIGHT UP, DERURU!', W / 2, 420, 34, '#fff', 'center', 900, { glow: '#FF3DAA', blur: 24 });
    rrect(120, 480, 300, 10, 5, 'rgba(255,255,255,.12)');
    rrect(120, 480, 300 * p, 10, 5, grad(120, 0, 420, 0, [[0, '#FF3DAA'], [1, '#4FC3FF']]));
    txt(`응원봉 충전 중… ${Math.round(p * 100)}%`, W / 2, 520, 15, '#cfc6e6', 'center', 400);
    if (p >= 1 && this.fontReady && t > 0.6) go(QS.get('song') ? 'play' : 'title', QS.get('song') ? { song: SONGS.find(s => s.id === QS.get('song')) || SONGS[0], mode: +(QS.get('mode') || 1) } : undefined);
  },
};
