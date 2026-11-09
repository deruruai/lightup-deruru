// ===========================================================================
//  scene_select.js — 곡 선택 : 곡 카드(좌우로 넘김) · 난이도 3단계 · 설정 · 갤러리
// ===========================================================================
Scenes.select = {
  dim: 0.72,
  idx: 0, mode: 1, slide: 0, drag: null,
  enter(arg) {
    if (arg && arg.song) this.idx = SONGS.indexOf(arg.song);
    if (arg && arg.mode !== undefined) this.mode = arg.mode;
    this.preview();
  },
  exit() {},
  get song() { return SONGS[this.idx]; },
  preview() {
    const s = this.song; backdropImg = IMG['stage_' + s.id];
    Music.load(s); Music.playFrom(s.preview, 0.5);
  },
  change(d) {
    this.idx = (this.idx + d + SONGS.length) % SONGS.length;
    this.slide = d * 1; this.preview();
  },
  draw(t) {
    const c = ctx(), s = this.song, ch = CHARTS[s.id];
    this.slide *= 0.8;
    // 배경
    if (OX < 1 && OY < 1) imgCover(IMG['stage_' + s.id], 0, 0, W, H);
    if (OX < 1 && OY < 1) { c.fillStyle = 'rgba(10,4,24,.72)'; c.fillRect(0, 0, W, H); }
    Stars.draw(0.6);

    // 머리줄
    txt('SELECT SONG', 24, 46, 13, rgba(s.accent2, 1), 'left', 900);
    txt('곡 선택', 24, 70, 24, '#fff', 'left', 900);
    btn('gallery', 400, 30, 120, 44, (x, y, w, h) => {
      rrect(x, y, w, h, 22, 'rgba(255,255,255,.12)', 'rgba(255,255,255,.4)', 1.5);
      txt('🖼  갤러리', x + w / 2, y + h / 2 + 1, 15, '#fff', 'center', 700);
      if (Save.data.newIll.length) { c.fillStyle = '#FF3DAA'; c.beginPath(); c.arc(x + w - 6, y + 6, 7, 0, Math.PI * 2); c.fill(); }
    });

    // 곡 카드
    const cx = 90 + this.slide * 120, cy = 100, cw = 360, chh = 470;
    c.save();
    c.shadowColor = rgba(s.accent, .7); c.shadowBlur = 40;
    rrect(cx, cy, cw, chh, 26, '#000');
    c.restore();
    c.save(); c.beginPath(); c.roundRect(cx, cy, cw, chh, 26); c.clip();
    imgCover(IMG['stage_' + s.id], cx, cy, cw, chh);
    c.fillStyle = grad(0, cy + 200, 0, cy + chh, [[0, 'rgba(10,4,24,0)'], [1, 'rgba(10,4,24,.92)']]); c.fillRect(cx, cy, cw, chh);
    // 카드 안 데루루 (FEVER 컷인 그림 재활용)
    const fim = IMG[`cut_${s.id}_fever`];
    if (ok(fim)) { c.globalAlpha = 0.95; c.drawImage(fim, cx + cw - 270, cy + 70, 270, 360); c.globalAlpha = 1; }
    c.restore();
    rrect(cx, cy, cw, chh, 26, null, rgba(s.accent, .9), 3);
    rrect(cx + 20, cy + 20, 92, 30, 15, rgba(s.accent, .9));
    txt(s.season, cx + 66, cy + 36, 14, '#fff', 'center', 900);
    txt(`${this.idx + 1} / ${SONGS.length}`, cx + cw - 22, cy + 36, 13, '#fff', 'right', 700);
    txt(s.title, cx + 22, cy + chh - 70, s.title.length > 12 ? 30 : 36, '#fff', 'left', 900, { glow: s.accent, blur: 18 });
    txt(s.theme, cx + 24, cy + chh - 34, 14, '#e6dcff', 'left', 400);

    // 좌우 화살표
    for (const [id, x, dir] of [['prev', 14, -1], ['next', 476, 1]]) {
      btn(id, x, 290, 50, 90, (bx, by, bw, bh) => {
        rrect(bx, by, bw, bh, 16, 'rgba(255,255,255,.10)');
        const k = ctx(); k.strokeStyle = '#fff'; k.lineWidth = 4; k.lineCap = 'round'; k.lineJoin = 'round';
        k.beginPath(); k.moveTo(bx + bw / 2 - dir * 8, by + bh / 2 - 14); k.lineTo(bx + bw / 2 + dir * 8, by + bh / 2); k.lineTo(bx + bw / 2 - dir * 8, by + bh / 2 + 14); k.stroke();
      });
    }
    // 점
    SONGS.forEach((_, i) => { c.fillStyle = i === this.idx ? '#fff' : 'rgba(255,255,255,.3)'; c.beginPath(); c.arc(W / 2 + (i - 2) * 18, 594, i === this.idx ? 5 : 4, 0, Math.PI * 2); c.fill(); });

    // 곡 정보
    const dur = Music.el && isFinite(Music.el.duration) ? Music.el.duration : 0;
    txt(`BPM ${ch.bpmShow}   ·   ${dur ? fmtTime(dur) : '-:--'}   ·   떼창 ${ch.chants.length}회`, W / 2, 622, 14, '#e6dcff', 'center', 700);

    // 난이도 3단계 (모두 열림)
    MODES.forEach((m, i) => {
      const x = 24 + i * 168, y = 648, w = 156, h = 92, on = i === this.mode;
      btn('mode' + i, x, y, w, h, () => {
        const k = ctx(); k.save();
        if (on) { k.shadowColor = m.color; k.shadowBlur = 22; }
        rrect(x, y, w, h, 18, on ? rgba(m.color, .28) : 'rgba(255,255,255,.07)', on ? m.color : 'rgba(255,255,255,.25)', on ? 3 : 1.5);
        k.restore();
        txt(m.en, x + w / 2, y + 20, 11, on ? m.color : '#bdb3d6', 'center', 900);
        txt(m.name, x + w / 2, y + 44, 21, '#fff', 'center', 900);
        txt(`노트 ${ch.modes[i].length}`, x + w / 2, y + 68, 12, '#cfc6e6', 'center', 400);
        const b = Save.best(s.id, i);
        if (b) txt(`${b.rank}${b.fc ? ' · FC' : ''}`, x + w - 12, y + 18, 12, '#FFD54F', 'right', 900);
      });
    });

    // 시작
    pillButton('start', '▶  START', 70, 756, 400, 64, s.accent2, s.accent, 26);

    // 설정 : 노트 속도 · 싱크
    const sp = Save.data.speed, of = Save.data.offset;
    this.stepper('spd', '노트 속도', sp.toFixed(1) + 'x', 24, 834);
    this.stepper('off', '싱크 조절', (of > 0 ? '+' : '') + Math.round(of * 1000) + 'ms', 278, 834);
    // MV 배경 켜기/끄기 · MV 싱크 맞추기
    const mvOk = Mv.available, mvOn = Save.data.mvOn !== false;
    btn('mvToggle', 24, 902, 238, 44, (x, y, w, h) => {
      rrect(x, y, w, h, 14, mvOk && mvOn ? rgba(s.accent2, .3) : 'rgba(255,255,255,.07)', mvOk && mvOn ? s.accent2 : 'rgba(255,255,255,.25)', 1.5);
      txt('▶ MV 배경', x + 16, y + h / 2 + 1, 14, mvOk ? '#fff' : '#8f86a8', 'left', 900);
      txt(!mvOk ? (Mv.failed ? '사용 불가' : '준비 중…') : mvOn ? 'ON' : 'OFF', x + w - 16, y + h / 2 + 1, 14, mvOk && mvOn ? '#FFD54F' : '#8f86a8', 'right', 900);
    });
    btn('mvSync', 278, 902, 238, 44, (x, y, w, h) => {
      rrect(x, y, w, h, 14, 'rgba(255,255,255,.07)', 'rgba(255,255,255,.25)', 1.5);
      const o = Mv.offset(s);
      txt('MV 싱크 맞추기', x + 16, y + h / 2 + 1, 14, mvOk ? '#fff' : '#8f86a8', 'left', 900);
      txt((o >= 0 ? '+' : '') + o.toFixed(2) + '초', x + w - 16, y + h / 2 + 1, 13, '#cfc6e6', 'right', 700);
    });
  },
  stepper(id, label, val, x, y) {
    rrect(x, y, 238, 56, 16, 'rgba(255,255,255,.07)');
    txt(label, x + 14, y + 28, 13, '#cfc6e6', 'left', 700);
    txt(val, x + 162, y + 29, 15, '#fff', 'center', 900);
    for (const [bid, bx, sym] of [[id + '-', x + 92, '−'], [id + '+', x + 198, '+']]) {
      btn(bid, bx, y + 10, 36, 36, (a, b, w, h) => { rrect(a, b, w, h, 18, 'rgba(255,255,255,.16)'); txt(sym, a + w / 2, b + h / 2 + 1, 20, '#fff', 'center', 900); });
    }
  },
  onButton(id) {
    const d = Save.data;
    if (id === 'prev') this.change(-1);
    else if (id === 'next') this.change(1);
    else if (id.startsWith('mode')) this.mode = +id[4];
    else if (id === 'start') this.start();
    else if (id === 'gallery') go('gallery', { back: 'select' });
    else if (id === 'mvToggle') { if (!Mv.available) Toast.show(Mv.whyNot(), 3600); else d.mvOn = !(d.mvOn !== false); }
    else if (id === 'mvSync') { if (!Mv.available) Toast.show(Mv.whyNot(), 3600); else go('mvsync', { song: this.song, mode: this.mode }); }
    else if (id === 'spd-') d.speed = Math.max(0.5, +(d.speed - 0.1).toFixed(1));
    else if (id === 'spd+') d.speed = Math.min(2.5, +(d.speed + 0.1).toFixed(1));
    else if (id === 'off-') d.offset = +(d.offset - 0.01).toFixed(3);
    else if (id === 'off+') d.offset = +(d.offset + 0.01).toFixed(3);
    Save.write();
  },
  start() { go('play', { song: this.song, mode: this.mode }); },
  // 카드 좌우로 밀어서 넘기기
  onDown(x, y, id, b) { if (!b && y > 100 && y < 570) this.drag = { x, id }; },
  onUp(x, y, id) { if (this.drag && this.drag.id === id) { const dx = x - this.drag.x; if (Math.abs(dx) > 50) this.change(dx < 0 ? 1 : -1); } this.drag = null; },
  onKey(k, d) {
    if (!d) return;
    if (k === 'arrowleft') this.change(-1);
    else if (k === 'arrowright') this.change(1);
    else if (k === 'arrowup') this.mode = Math.min(2, this.mode + 1);
    else if (k === 'arrowdown') this.mode = Math.max(0, this.mode - 1);
    else if (k === 'enter' || k === ' ') this.start();
  },
};
