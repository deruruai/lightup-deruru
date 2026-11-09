// ===========================================================================
//  songs.js — 곡 목록
//   id      : 파일 이름에 쓰는 곡 id (assets/music/<id>.mp3, assets/stage/<id>.webp …)
//   ill     : 클리어 보상 일러스트 파일 이름 (assets/illust/<ill>.jpg)
//   accent  : 곡 카드 · 컷인 띠에 쓰는 대표 색
//   preview : 곡 선택 화면에서 미리듣기를 시작할 위치(초)
//   youtubeId : 데루루 MV 유튜브 주소의 v= 뒤 11글자
//   mvOffset  : 음원 0초가 MV 영상의 몇 초인지 (MV 앞에 인트로 영상이 있으면 그만큼 +)
//               곡 선택 화면 'MV 싱크 맞추기' 로 맞춘 값이 있으면 그 값이 우선
//   firstSound : 음원에서 첫 소리가 나는 시각(초) — MV 싱크 1단계(노래 시작 탭)에 사용
// ===========================================================================
window.SONGS = [
  { id: 'revolution', youtubeId: 'zU6TexBYUxw', mvOffset: 0, firstSound: 0.76,     title: 'REVOLUTION',     season: '데뷔',       theme: '네온 레이저 스테이지',
    ill: 'ill_01_revolution',     accent: '#B45AFF', accent2: '#FF3DAA', preview: 48 },
  { id: 'snowy-love', youtubeId: 'hr0I2KYzxkg', mvOffset: 0, firstSound: 1.39,     title: 'Snowy Love',     season: '크리스마스', theme: '눈 내리는 시계탑 광장',
    ill: 'ill_02_snowy-love',     accent: '#FF5A7A', accent2: '#7FD8FF', preview: 66 },
  { id: 'new-day', youtubeId: 'KpsacT4StvM', mvOffset: 0, firstSound: 1.39,        title: '새 날의 노래',   season: '설날',       theme: '보름달과 벚꽃',
    ill: 'ill_03_new-day',        accent: '#F5C04A', accent2: '#FF7AC0', preview: 104 },
  { id: 'lollipop-devil', youtubeId: 'Vb_DNSWWCEc', mvOffset: 0, firstSound: 0.0, title: 'Lollipop Devil', season: '화이트데이', theme: '캔디 랜드',
    ill: 'ill_04_lollipop-devil', accent: '#FF4F9A', accent2: '#9B6BFF', preview: 28 },
  { id: 'summer-breeze', youtubeId: 'bPmEg67P93A', mvOffset: 0, firstSound: 0.32,  title: 'Summer Breeze',  season: '여름',       theme: '햇살과 파도',
    ill: 'ill_05_summer-breeze',  accent: '#2EC4D6', accent2: '#FFD23F', preview: 48 },
];

// 난이도 3단계 — 지금 버전은 처음부터 모두 열려 있다
window.MODES = [
  { name: '새내기팬', en: 'EASY',   color: '#4FE0B0' },
  { name: '찐팬',     en: 'NORMAL', color: '#4FC3FF' },
  { name: '최애',     en: 'HYPER',  color: '#FF3DAA' },
];
