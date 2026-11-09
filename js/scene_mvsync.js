// ===========================================================================
//  scene_mvsync.js — MV 싱크 맞추기 (곡마다 한 번만 하면 이 기기에 저장됨)
//
//   1단계 (대충 맞추기) : MV 를 처음부터 틀어 두고, 노래 첫 소리가 들리는 순간 탭
//   2단계 (미세 조정)   : MV 소리 + 게임 음원을 동시에 틀어 준다
//                         → 노래가 메아리처럼 두 번 들리면 ± 버튼, 하나로 들리면 저장
//   이 화면에서만은 MV 가 기준이고, 게임 음원이 MV 를 따라간다
// ===========================================================================
Scenes.mvsync = {
  dim: 0.92, edgeBottom: '#08040f',
  panel: { x: 20, y: 150, w: 500, h: 281 },
  enter({ song, mode }) {
    this.song = song; this.mode = mode; this.step = 1; this.lastFix = 0;
    backdropImg = IMG['stage_' + song.id];
    Music.load(song); Music.stop();
    this.startStep1();
  },
  exit() { Mv.stop(); Music.stop(); },
  startStep1() {
    this.step = 1; Music.pause();
    Mv.start(this.song, -Mv.offset(this.song), { mode: 'panel', rect: this.panel, muted: false, volume: 70 });   // MV 0초부터
  },
  startStep2() {
    this.step = 2;
    if (!Mv.want) Mv.start(this.song, this.song.preview, { mode: 'panel', rect: this.panel, muted: false, volume: 55 });
    else { try { Mv.player.setVolume(55); } catch (e) {} Mv.seekNow(this.song.preview); }
    Music.el.volume = 0.55;
  },
  setOffset(o) { Save.data.mvOffset[this.song.id] = Math.round(o * 100) / 100; Save.write(); },

  draw(t) {
    const c = ctx(), s = this.song, P = this.panel;
    // 2단계 : 게임 음원을 MV 위치에 맞춰 따라가게
    const a = Music.el;
    if (this.step === 2 && a) {
      if (Mv.playing) {
        const want = Mv.time() - Mv.offset(s);
        if (want >= 0 && want < (a.duration || 1e9)) {
          if (a.paused) { const p = a.play(); if (p && p.catch) p.catch(() => {}); }
          if (performance.now() - this.lastFix > 300 && Math.abs(a.currentTime - want) > 0.06) { a.currentTime = want; this.lastFix = performance.now(); }
        } else if (!a.paused) a.pause();
      } else if (!a.paused) a.pause();
    }

    c.fillStyle = grad(0, 0, 0, H, [[0, '#1c0a33'], [1, '#08040f']]); c.fillRect(0, 0, W, H);
    btn('back', 18, 26, 96, 44, (x, y, w, h) => { rrect(x, y, w, h, 22, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.4)', 1.5); txt('‹  뒤로', x + w / 2, y + h / 2 + 1, 15, '#fff', 'center', 700); });
    txt('MV SYNC', W / 2, 40, 13, s.accent2, 'center', 900);
    txt('MV 싱크 맞추기', W / 2, 66, 24, '#fff', 'center', 900);
    txt(s.title, W / 2, 112, 16, '#e6dcff', 'center', 700);

    // MV 칸 (영상이 재생되면 캔버스에 구멍을 뚫어 뒤의 유튜브가 보이게)
    rrect(P.x - 4, P.y - 4, P.w + 8, P.h + 8, 14, '#000', rgba(s.accent, .9), 3);
    if (Mv.showing) c.clearRect(P.x, P.y, P.w, P.h);
    else txt(Mv.available ? 'MV 불러오는 중…' : Mv.whyNot(), W / 2, P.y + P.h / 2, 14, '#cfc6e6', 'center', 700);

    const o = Mv.offset(s);
    txt('MV 싱크', W / 2, 466, 13, '#cfc6e6', 'center', 700);
    txt(`${o >= 0 ? '+' : ''}${o.toFixed(2)}초`, W / 2, 500, 38, '#FFD54F', 'center', 900, { glow: '#FF3DAA', blur: 14 });

    if (this.step === 1) {
      rrect(24, 540, 492, 92, 16, 'rgba(255,255,255,.07)');
      txt('1단계 · 대충 맞추기', 44, 566, 15, s.accent2, 'left', 900);
      txt('MV를 처음부터 틀었어요. 노래 첫 소리가 들리는 순간', 44, 594, 13, '#fff', 'left', 400);
      txt('아래 큰 버튼을 누르세요. (영상 인트로는 기다리기)', 44, 614, 13, '#fff', 'left', 400);
      pillButton('tap', '♪  노래 시작!  (탭)', 60, 652, 420, 96, s.accent2, s.accent, 26);
      ghostButton('again1', 'MV 처음부터 다시', 60, 770, 200, 50, 15);
      ghostButton('skip1', '건너뛰고 2단계로', 280, 770, 200, 50, 15);
    } else {
      rrect(24, 540, 492, 92, 16, 'rgba(255,255,255,.07)');
      txt('2단계 · 미세 조정', 44, 566, 15, s.accent2, 'left', 900);
      txt('MV 소리와 게임 음원이 같이 나와요. 노래가 메아리처럼', 44, 594, 13, '#fff', 'left', 400);
      txt('두 번 들리면 ± 로 조절, 하나로 깔끔하게 들리면 저장!', 44, 614, 13, '#fff', 'left', 400);
      [[-1, '−1'], [-0.1, '−0.1'], [-0.02, '−0.02'], [0.02, '+0.02'], [0.1, '+0.1'], [1, '+1']].forEach(([d, lab], i) => {
        btn('adj' + d, 22 + i * 84, 650, 76, 56, (x, y, w, h) => { rrect(x, y, w, h, 14, 'rgba(255,255,255,.13)', 'rgba(255,255,255,.35)', 1.5); txt(lab, x + w / 2, y + h / 2 + 1, 15, '#fff', 'center', 900); });
      });
      txt('MV가 음원보다 늦으면 +   ·   MV가 빠르면 −', W / 2, 726, 12, '#cfc6e6', 'center', 400);
      ghostButton('again2', '다시 듣기', 24, 752, 156, 50, 15);
      ghostButton('step1', '1단계로', 192, 752, 156, 50, 15);
      ghostButton('reset', '0초로 초기화', 360, 752, 156, 50, 15);
    }
    pillButton('save', '저장하고 돌아가기', 90, 846, 360, 62, s.accent2, s.accent, 20);
    txt('맞춘 값은 이 기기에 곡마다 저장돼요', W / 2, 930, 12, 'rgba(255,255,255,.55)', 'center', 400);
  },
  onButton(id) {
    const s = this.song;
    if (id === 'tap') {
      const mt = Mv.time();
      if (!Mv.playing || mt === null) { Toast.show('MV가 재생 중일 때 눌러 주세요'); return; }
      this.setOffset(mt - 0.2 - (s.firstSound || 0));   // 0.2초 = 듣고 누르기까지 걸리는 평균 반응 시간
      Toast.show('좋아요! 이제 2단계에서 소리를 맞춰요');
      this.startStep2();
    }
    else if (id === 'again1') this.startStep1();
    else if (id === 'skip1') this.startStep2();
    else if (id.startsWith('adj')) this.setOffset(Mv.offset(s) + parseFloat(id.slice(3)));
    else if (id === 'again2') Mv.seekNow(s.preview);
    else if (id === 'step1') this.startStep1();
    else if (id === 'reset') { delete Save.data.mvOffset[s.id]; Save.write(); }
    else if (id === 'save' || id === 'back') { Save.write(); go('select', { song: s, mode: this.mode }); }
  },
  onKey(k, d) { if (d && k === 'escape') this.onButton('back'); if (d && k === ' ' && this.step === 1) this.onButton('tap'); },
};
