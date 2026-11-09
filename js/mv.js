// ===========================================================================
//  mv.js — 데루루 유튜브 MV 를 플레이 화면 뒤에 깔기
//
//  · 게임의 시계는 계속 음원(mp3) 이다 → 판정은 MV 와 상관없이 정확하다.
//  · MV 는 소리를 끄고(음소거) 화면만 쓴다. 매 프레임 "음원 시간 + MV 싱크값" 에 맞춰
//    영상이 0.35초 넘게 어긋나면 그 자리로 다시 맞춘다 (광고 · 버퍼링 뒤에도 자동 복구).
//  · MV 싱크값 = 음원 0초가 MV 영상의 몇 초에 해당하는지 (곡마다 다름)
//      → data/songs.js 의 mvOffset 기본값, 또는 곡 선택 화면 'MV 싱크 맞추기' 에서 조절한 값
//  · 유튜브를 쓸 수 없는 곳(파일 더블클릭 · Claude 미리보기 · 인터넷 없음 · 퍼가기 금지 영상)에서는
//    자동으로 스테이지 배경 그림으로 진행한다.
// ===========================================================================
const Mv = {
  apiReady: false, failed: false, reason: '', player: null, ready: false,
  song: null, want: false, playing: false, showing: false, muted: true,
  mode: 'cover', rect: null, lastSeek: 0, bad: {},

  // 유튜브는 http(s) 주소에서만 재생된다 (file:// 로 열면 오류 153)
  init() {
    if (!/^https?:$/.test(location.protocol)) { this.fail(location.protocol === 'file:' ? 'file' : 'env'); return; }
    if (window.self !== window.top && /claude/.test(document.referrer + location.hostname)) { this.fail('preview'); return; }
    window.onYouTubeIframeAPIReady = () => { this.apiReady = true; this.create(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => this.fail('blocked');
    document.head.appendChild(s);
    setTimeout(() => { if (!this.ready) this.fail('blocked'); }, 9000);
  },
  fail(r) { if (!this.ready) { this.failed = true; this.reason = r; } },
  create() {
    this.player = new YT.Player('ytplayer', {
      width: '100%', height: '100%',
      playerVars: { playsinline: 1, controls: 0, rel: 0, disablekb: 1, fs: 0, iv_load_policy: 3, modestbranding: 1, origin: location.origin },
      events: {
        onReady: () => { this.ready = true; this.failed = false; },
        onStateChange: e => this.onState(e.data),
        onError: e => this.onError(e.data),
      },
    });
  },
  get available() { return this.ready && !this.failed; },
  whyNot() {
    return { file: '파일을 더블클릭해서 열면 유튜브가 막혀요 → "MV와 함께 실행" 으로 여세요',
             preview: 'Claude 미리보기 화면에서는 유튜브를 띄울 수 없어요',
             blocked: '유튜브에 연결하지 못했어요 (인터넷 · 학교 방화벽 확인)',
             env: '이 환경에서는 유튜브를 쓸 수 없어요' }[this.reason] || 'MV 준비 중…';
  },
  offset(song) {
    const o = Save.data.mvOffset && Save.data.mvOffset[song.id];
    return typeof o === 'number' ? o : (song.mvOffset || 0);
  },

  // 재생 시작 : songT = 지금 음원 시간. 반드시 터치 안에서 부른다 (휴대폰 자동재생 제한)
  start(song, songT, opt = {}) {
    if (!this.available || this.bad[song.id] || !song.youtubeId) return false;
    this.song = song; this.want = true; this.playing = false; this.showing = false;
    this.mode = opt.mode || 'cover'; this.rect = opt.rect || null; this.muted = opt.muted !== false;
    const el = document.getElementById('mv'); el.style.display = 'block'; el.style.opacity = '0';
    try {
      if (this.muted) this.player.mute(); else { this.player.unMute(); this.player.setVolume(opt.volume || 60); }
      this.player.loadVideoById({ videoId: song.youtubeId, startSeconds: Math.max(0, songT + this.offset(song)) });
    } catch (e) { this.want = false; return false; }
    this.lastSeek = performance.now();
    return true;
  },
  onState(s) {   // 1 재생 · 2 일시정지 · 3 버퍼링 · 0 끝
    this.playing = s === 1;
    if (s === 1 && this.want) { this.showing = true; document.getElementById('mv').style.opacity = '1'; }
  },
  onError(code) {
    if (this.song) this.bad[this.song.id] = code;
    this.stop();
    Toast.show(code === 101 || code === 150 ? '이 MV는 다른 사이트에서 재생이 막혀 있어서 무대 배경으로 진행해요' : `MV를 재생하지 못했어요 (오류 ${code}) — 무대 배경으로 진행`);
  },
  // 유튜브가 알려주는 영상 시간은 띄엄띄엄 갱신되므로 사이를 부드럽게 이어 준다
  rawT: 0, aT: 0, aAt: 0, comp: 0.15,
  time() {
    let cur; try { cur = this.player.getCurrentTime(); } catch (e) { return null; }
    const now = performance.now();
    if (cur !== this.rawT) {
      const pred = this.aT + (now - this.aAt) / 1000;
      this.rawT = cur;
      if (!this.playing || Math.abs(cur - pred) > 0.15) { this.aT = cur; this.aAt = now; }
    }
    return this.playing ? this.aT + (now - this.aAt) / 1000 : cur;
  },
  // 매 프레임 (게임 중) : 음원 시간에 맞춰 영상 위치 보정
  //   영상을 옮기면 다시 재생되기까지 조금 늦어지므로, 그만큼(comp)을 스스로 배워서 앞당겨 옮긴다
  sync(songT, musicPlaying) {
    if (!this.want || !this.player || !this.player.getCurrentTime) return;
    const target = songT + this.offset(this.song), now = performance.now();
    if (!musicPlaying) { if (this.playing) try { this.player.pauseVideo(); } catch (e) {} return; }
    if (!this.playing) { if (now - this.lastSeek > 1500) { try { this.player.playVideo(); } catch (e) {} this.lastSeek = now; } return; }
    if (target < 0) return;
    const cur = this.time(); if (cur === null) return;
    const err = cur - target;
    if (Math.abs(err) > 0.12 && now - this.lastSeek > 1500) {
      if (now - this.lastSeek < 4000) this.comp = clamp(this.comp - err, 0, 1.2);   // 방금 옮겼는데도 어긋나면 보정값 학습
      try { this.player.seekTo(target + this.comp, true); } catch (e) {}
      this.lastSeek = now;
    }
  },
  seekNow(songT) {
    if (!this.want) return;
    try { this.player.seekTo(Math.max(0, songT + this.offset(this.song)), true); this.player.playVideo(); } catch (e) {}
    this.lastSeek = performance.now();
  },
  pause() { if (this.player && this.want) try { this.player.pauseVideo(); } catch (e) {} },
  stop() {
    this.want = false; this.playing = false; this.showing = false;
    if (this.player && this.player.stopVideo) try { this.player.stopVideo(); } catch (e) {}
    const el = document.getElementById('mv'); if (el) el.style.display = 'none';
  },
  // 영상 위치 : cover = 창 전체를 꽉 채움 / panel = 게임 화면 안 지정한 칸
  layout() {
    if (!this.want) return;
    const box = document.getElementById('mvbox'); if (!box) return;
    let x, y, w, h;
    if (this.mode === 'panel' && this.rect) { x = OX + this.rect.x * S; y = OY + this.rect.y * S; w = this.rect.w * S; h = this.rect.h * S; }
    else {
      const vw = window.innerWidth, vh = window.innerHeight;
      w = Math.max(vw, vh * 16 / 9); h = w * 9 / 16; if (h < vh) { h = vh; w = h * 16 / 9; }
      x = (vw - w) / 2; y = (vh - h) / 2;
    }
    Object.assign(box.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
  },
};

// ---------------------------------------------------------------- 짧은 안내 문구
const Toast = {
  msg: null, t0: 0, ms: 2800,
  show(m, ms = 2800) { this.msg = m; this.t0 = performance.now(); this.ms = ms; },
  draw() {
    if (!this.msg) return;
    const u = (performance.now() - this.t0) / this.ms; if (u > 1) { this.msg = null; return; }
    const a = Math.min(1, u * 8, (1 - u) * 6), c = ctx();
    c.save(); c.globalAlpha = a; c.font = `700 13px ${FONT}`;
    const w = Math.min(524, c.measureText(this.msg).width + 36);
    rrect((W - w) / 2, 104, w, 44, 22, 'rgba(20,8,40,.92)', 'rgba(255,255,255,.35)', 1.5);
    c.restore();
    txt(this.msg, W / 2, 126.5, 13, '#fff', 'center', 700, { alpha: a });
  },
};
