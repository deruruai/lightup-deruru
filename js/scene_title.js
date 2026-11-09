// ===========================================================================
//  scene_title.js — 타이틀 화면 : 로고 + TAP TO START
// ===========================================================================
Scenes.title = {
  dim: 0.3, edgeBottom: '#05020c',
  enter() { backdropImg = IMG.stage_revolution; },
  draw(t) {
    const c = ctx();
    if (OX < 1 && OY < 1) imgCover(IMG.stage_revolution, 0, 0, W, H);
    c.fillStyle = grad(0, 0, 0, H, [[0, 'rgba(10,4,24,.25)'], [0.55, 'rgba(10,4,24,.35)'], [1, 'rgba(10,4,24,.9)']]); c.fillRect(0, 0, W, H);
    Stars.draw();
    // 무대 조명
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const a = Math.sin(t * 0.8 + i * 1.6) * 0.35;
      c.save(); c.translate(W / 2 + (i - 1.5) * 120, -20); c.rotate(a);
      c.fillStyle = grad(0, 0, 0, 700, [[0, rgba(LANE_COLORS[i], .35)], [1, rgba(LANE_COLORS[i], 0)]]);
      c.beginPath(); c.moveTo(-8, 0); c.lineTo(8, 0); c.lineTo(90, 700); c.lineTo(-90, 700); c.fill(); c.restore();
    }
    c.restore();
    // 로고 (살짝 통통 튀며 등장)
    const u = ease.back(clamp(t / 0.8, 0, 1)), lw = 470 * u, lh = lw * (IMG.logo.naturalHeight || 622) / (IMG.logo.naturalWidth || 1000);
    const bob = Math.sin(t * 2.2) * 6;
    c.save(); c.shadowColor = 'rgba(255,61,170,.6)'; c.shadowBlur = 40;
    img(IMG.logo, (W - lw) / 2, 300 - lh / 2 + bob, lw, lh); c.restore();
    txt('데루루 응원봉 리듬게임', W / 2, 470, 17, '#fff', 'center', 700, { alpha: clamp(t - 0.6, 0, 1), glow: '#B45AFF' });
    Crowd.draw(0.5 + 0.5 * Math.sin(t), (t * 2) % 1);
    if (t > 1) txt('TAP TO START', W / 2, 700, 26, '#fff', 'center', 900, { alpha: 0.55 + 0.45 * Math.sin(t * 4), glow: '#FF3DAA', blur: 20 });
    txt('새내기팬 · 찐팬 · 최애  전 모드 오픈', W / 2, 740, 13, '#e6dcff', 'center', 400, { alpha: clamp(t - 1, 0, 1) * 0.8 });
    txt('© DERURU  ·  26-2 프로세싱', W / 2, 775, 11, 'rgba(255,255,255,.55)', 'center', 400);
  },
  onDown() { if ((performance.now() - this.t0) > 500) go('select'); },
  onKey(k, d) { if (d && (k === 'enter' || k === ' ')) go('select'); },
};
