// ===========================================================================
//  scene_gallery.js — 보상 일러스트 갤러리
//   해금한 카드를 누르면 원본을 크게 띄운다 (진짜 <img> 라서 폰에서 길게 눌러 저장 가능)
// ===========================================================================
Scenes.gallery = {
  dim: 0.9,
  enter(arg) {
    this.arg = arg || { back: 'select' };
    backdropImg = IMG.stage_revolution;
    if (this.arg.open) setTimeout(() => this.open(SONGS.find(s => s.id === this.arg.open)), 50);
    const v = document.getElementById('viewer');
    document.getElementById('viewerClose').onclick = () => v.classList.remove('on');
    v.onclick = e => { if (e.target === v) v.classList.remove('on'); };
  },
  exit() { document.getElementById('viewer').classList.remove('on'); },
  open(song) {
    if (!song || !Save.isUnlocked(song.id)) return;
    const src = `assets/illust/${song.ill}.jpg`;
    document.getElementById('viewerImg').src = src;
    const a = document.getElementById('viewerSave'); a.href = src; a.setAttribute('download', `DERURU_${song.ill}.jpg`);
    document.getElementById('viewer').classList.add('on');
    Save.data.newIll = Save.data.newIll.filter(id => id !== song.id); Save.write();
  },
  draw(t) {
    const c = ctx();
    c.fillStyle = grad(0, 0, 0, H, [[0, '#1c0a33'], [1, '#08040f']]); c.fillRect(0, 0, W, H);
    Stars.draw(0.8);
    btn('back', 18, 26, 96, 44, (x, y, w, h) => { rrect(x, y, w, h, 22, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.4)', 1.5); txt('‹  뒤로', x + w / 2, y + h / 2 + 1, 15, '#fff', 'center', 700); });
    txt('GALLERY', W / 2, 40, 13, '#FF9AD5', 'center', 900);
    txt('보상 일러스트', W / 2, 66, 24, '#fff', 'center', 900);
    const got = SONGS.filter(s => Save.isUnlocked(s.id)).length;
    txt(`${got} / ${SONGS.length} 해금`, W - 24, 48, 14, '#FFD54F', 'right', 900);

    SONGS.forEach((s, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const cw = 156, chh = 277, x = row === 0 ? 24 + col * 168 : 108 + col * 168, y = 112 + row * 300;
      const open = Save.isUnlocked(s.id);
      btn('card' + i, x, y, cw, chh, () => {
        c.save();
        if (open) { c.shadowColor = s.accent; c.shadowBlur = 22; }
        rrect(x, y, cw, chh, 16, '#140a24'); c.restore();
        c.save(); c.beginPath(); c.roundRect(x, y, cw, chh, 16); c.clip();
        if (open) imgCover(IMG['thumb_' + s.id], x, y, cw, chh);
        else {
          imgCover(IMG['thumb_' + s.id], x, y, cw, chh, 0.18); c.filter = 'none';
          c.fillStyle = 'rgba(20,10,36,.75)'; c.fillRect(x, y, cw, chh);
          // 자물쇠
          const lx = x + cw / 2, ly = y + 110;
          c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 6; c.beginPath(); c.arc(lx, ly - 14, 16, Math.PI, 0); c.stroke();
          rrect(lx - 24, ly - 14, 48, 38, 8, 'rgba(255,255,255,.75)');
          txt('싱크로율 70% 이상', lx, y + 180, 12, '#e6dcff', 'center', 700);
          txt('클리어하면 해금', lx, y + 198, 12, '#e6dcff', 'center', 700);
        }
        c.fillStyle = grad(0, y + chh - 70, 0, y + chh, [[0, 'rgba(10,4,24,0)'], [1, 'rgba(10,4,24,.9)']]); c.fillRect(x, y + chh - 70, cw, 70);
        c.restore();
        rrect(x, y, cw, chh, 16, null, open ? rgba(s.accent, .9) : 'rgba(255,255,255,.2)', 2);
        txt(`No.0${i + 1}`, x + 12, y + chh - 40, 11, open ? s.accent2 : '#9a8fb3', 'left', 900);
        txt(s.title, x + 12, y + chh - 20, 15, '#fff', 'left', 900);
        if (Save.data.newIll.includes(s.id)) { rrect(x + cw - 56, y + 10, 46, 22, 11, '#FF3DAA'); txt('NEW', x + cw - 33, y + 21.5, 11, '#fff', 'center', 900); }
      });
    });
    rrect(24, 728, 492, 92, 16, 'rgba(255,255,255,.06)');
    txt('곡마다 싱크로율 70% 이상으로 클리어하면 일러스트가 열려요 (모드 상관없음)', W / 2, 760, 12, '#e6dcff', 'center', 700);
    txt('스페셜(찐팬 풀콤보) · 시크릿 일러스트는 다음 버전에서 추가 예정', W / 2, 788, 12, 'rgba(230,220,255,.6)', 'center', 400);
    txt('열린 카드를 누르면 크게 보고 저장할 수 있어요', W / 2, 860, 13, '#fff', 'center', 700);
  },
  onButton(id) {
    if (id === 'back') { const a = this.arg; a.back === 'result' ? go('result_back', a.r) : go('select'); }
    else if (id.startsWith('card')) this.open(SONGS[+id.slice(4)]);
  },
  onKey(k, d) { if (d && k === 'escape') this.onButton('back'); },
};

// 결과 화면으로 돌아갈 때는 기록을 다시 저장하지 않도록, 그리기만 재사용
Scenes.result_back = Object.assign(Object.create(Scenes.result), {
  enter(r) { this.r = r; this.popup = null; backdropImg = IMG['stage_' + r.song.id]; this.t0 = performance.now() - 3000; },
  draw(t) { Scenes.result.draw.call(this, t + 3); },
});
