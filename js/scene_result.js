// ===========================================================================
//  scene_result.js — 결과 화면 : 랭크 · 싱크로율 · 판정 수 · 떼창 · 보상 일러스트 해금
//   해금 조건 : 싱크로율 70% 이상으로 클리어 (모드 무관) → 그 곡의 클리어 보상 일러스트
// ===========================================================================
Scenes.result = {
  dim: 0.74,
  enter(r) {
    this.r = r; this.popup = null;
    backdropImg = IMG['stage_' + r.song.id];
    if (!r.auto) {
      Save.setBest(r.song.id, r.mode, { score: r.score, sync: +r.sync.toFixed(1), rank: r.rank, fc: r.fc });
      if (r.sync >= 70 && Save.unlock(r.song.id)) this.popup = { t0: performance.now() + 1400 };
    }
    Assets.illust(r.song);      // 원본 일러스트 미리 불러오기
    if (r.rank === 'S' || r.fc) setTimeout(() => Sfx.fanfare(), 600);
  },
  draw(t) {
    const c = ctx(), r = this.r, s = r.song, m = MODES[r.mode];
    if (OX < 1 && OY < 1) imgCover(IMG['stage_' + s.id], 0, 0, W, H);
    if (OX < 1 && OY < 1) { c.fillStyle = 'rgba(10,4,24,.74)'; c.fillRect(0, 0, W, H); }
    Stars.draw(0.7);
    // 데루루 (랭크에 따라 다른 컷인 그림)
    const kind = r.rank === 'S' ? 'amazing' : r.rank === 'A' ? 'great' : 'nice';
    const u = ease.out(clamp(t / 0.7, 0, 1));
    c.save(); c.shadowColor = rgba(s.accent, .8); c.shadowBlur = 40;
    img(IMG[`cut_${s.id}_${kind}`], 210 + (1 - u) * 200, 110, 345, 460, u * (r.rank === 'D' ? 0.6 : 1)); c.restore();

    txt('RESULT', 28, 50, 14, s.accent2, 'left', 900);
    txt(s.title, 28, 80, 26, '#fff', 'left', 900);
    rrect(28, 100, 74, 24, 12, rgba(m.color, .3), m.color, 1.5); txt(m.name, 65, 112.5, 12, '#fff', 'center', 900);
    if (r.auto) txt('AUTO 플레이 — 기록 · 해금 저장 안 함', 112, 112.5, 11, '#FFD54F', 'left', 700);

    // 랭크
    const ru = ease.back(clamp((t - 0.3) / 0.6, 0, 1));
    c.save(); c.translate(115, 255); c.scale(ru, ru);
    txt(r.rank, 0, 0, 150, '#fff', 'center', 900, { italic: true, glow: r.rank === 'S' ? '#FFD54F' : s.accent, blur: 40, stroke: 'rgba(60,10,80,.6)', sw: 10 });
    c.restore();
    if (r.fc && t > 0.9) { c.save(); c.translate(115, 352); c.rotate(-0.08); rrect(-80, -18, 160, 36, 18, grad(-80, 0, 80, 0, [[0, '#FFD54F'], [1, '#FF3DAA']])); txt('FULL COMBO', 0, 1, 18, '#fff', 'center', 900, { italic: true }); c.restore(); }
    txt('싱크로율', 34, 410, 14, '#cfc6e6', 'left', 700);
    txt(`${(r.sync * clamp(t / 1.0, 0, 1)).toFixed(1)}%`, 34, 448, 40, '#FFD54F', 'left', 900, { glow: '#FF3DAA', blur: 14 });
    txt('SCORE', 34, 492, 14, '#cfc6e6', 'left', 700);
    txt(String(Math.round(r.score * clamp(t / 1.0, 0, 1))).padStart(7, '0'), 34, 524, 30, '#fff', 'left', 900);

    // 기록 카드
    rrect(24, 568, 492, 196, 20, 'rgba(255,255,255,.08)', 'rgba(255,255,255,.2)', 1.5);
    const rows = [['PERFECT', r.cnt.PERFECT, '#FFF0A0'], ['GOOD', r.cnt.GOOD, '#8FE8FF'], ['MISS', r.cnt.MISS, '#b9addb']];
    rows.forEach(([k, v, col], i) => { txt(k, 48, 602 + i * 34, 16, col, 'left', 900, { italic: true }); txt(String(v), 250, 602 + i * 34, 18, '#fff', 'right', 900); });
    txt('MAX COMBO', 290, 602, 14, '#cfc6e6', 'left', 700); txt(`${r.maxCombo} / ${r.N}`, 492, 602, 17, '#fff', 'right', 900);
    txt('떼창 성공', 290, 636, 14, '#cfc6e6', 'left', 700); txt(`${r.chantOk} / ${r.chantTotal}`, 492, 636, 17, '#fff', 'right', 900);
    const ms = Math.round(r.avg * 1000);
    txt('평균 타이밍', 290, 670, 14, '#cfc6e6', 'left', 700);
    txt(`${ms > 0 ? '+' : ''}${ms}ms ${Math.abs(ms) < 15 ? '정확' : ms > 0 ? '느림' : '빠름'}`, 492, 670, 15, '#fff', 'right', 900);
    const tip = Math.abs(ms) >= 25 ? `💡 계속 ${ms > 0 ? '늦게' : '빠르게'} 눌린다면 곡 선택 화면의 '싱크 조절'을 ${ms > 0 ? '+' : '−'}${Math.round(Math.abs(ms) / 10) * 10}ms 해 보세요`
              : r.auto ? 'AUTO 플레이는 시연용이에요 — 직접 플레이해야 일러스트가 해금돼요'
              : r.sync >= 70 ? '🎉 싱크로율 70% 이상 — 이 곡의 보상 일러스트 해금 조건 달성!' : '싱크로율 70% 이상이면 보상 일러스트가 해금돼요';
    txt(tip, W / 2, 735, 12, '#e6dcff', 'center', 700);

    // 버튼
    ghostButton('retry', '다시하기', 24, 796, 150, 60, 17);
    pillButton('select', '곡 선택', 186, 796, 168, 60, s.accent2, s.accent, 19);
    ghostButton('gallery', '갤러리', 366, 796, 150, 60, 17);
    txt('결과 화면을 캡처해서 응원 인증해 주세요!', W / 2, 900, 12, 'rgba(255,255,255,.55)', 'center', 400);

    if (this.popup) this.drawPopup();
  },
  drawPopup() {
    const p = this.popup, u = (performance.now() - p.t0) / 1000;
    if (u < 0) return;
    if (!p.sfx) { p.sfx = true; Sfx.fanfare(); }
    const c = ctx(), s = this.r.song, a = ease.out(clamp(u / 0.5, 0, 1));
    BUTTONS = [];   // 팝업이 떠 있으면 뒤 버튼은 막기
    c.fillStyle = `rgba(6,3,14,${0.88 * a})`; c.fillRect(0, 0, W, H);
    // 빛 번짐
    c.save(); c.globalCompositeOperation = 'lighter'; c.translate(W / 2, 420); c.rotate(u * 0.3);
    for (let i = 0; i < 12; i++) { c.rotate(Math.PI / 6); c.fillStyle = rgba(LANE_COLORS[i % 4], 0.12 * a); c.beginPath(); c.moveTo(0, 0); c.lineTo(-40, -420); c.lineTo(40, -420); c.fill(); }
    c.restore();
    txt('NEW!', W / 2, 90, 22, '#FFD54F', 'center', 900, { italic: true, alpha: a, glow: '#FF3DAA' });
    txt('클리어 보상 일러스트 해금', W / 2, 124, 24, '#fff', 'center', 900, { alpha: a });
    const im = ok(IMG['ill_' + s.id]) ? IMG['ill_' + s.id] : IMG['thumb_' + s.id];
    const sc = 0.85 + 0.15 * ease.back(clamp(u / 0.6, 0, 1)), w = 300 * sc, h = 533 * sc;
    c.save(); c.shadowColor = s.accent; c.shadowBlur = 50 * a;
    c.beginPath(); c.roundRect(W / 2 - w / 2, 420 - h / 2 + 30, w, h, 18); c.clip();
    img(im, W / 2 - w / 2, 420 - h / 2 + 30, w, h, a); c.restore();
    rrect(W / 2 - w / 2, 420 - h / 2 + 30, w, h, 18, null, rgba('#ffffff', .8 * a), 3);
    if (u > 0.6) {
      pillButton('popGallery', '갤러리에서 크게 보기', 100, 772, 340, 60, s.accent2, s.accent, 18);
      ghostButton('popClose', '닫기', 190, 846, 160, 50, 16);
    }
  },
  onButton(id) {
    const r = this.r;
    if (id === 'retry') go('play', { song: r.song, mode: r.mode });
    else if (id === 'select') go('select', { song: r.song, mode: r.mode });
    else if (id === 'gallery') go('gallery', { back: 'result', r });
    else if (id === 'popClose') this.popup = null;
    else if (id === 'popGallery') { this.popup = null; go('gallery', { back: 'result', r, open: r.song.id }); }
  },
  onKey(k, d) { if (d && (k === 'enter' || k === ' ')) { if (this.popup) this.popup = null; else go('select', { song: this.r.song, mode: this.r.mode }); } },
};
