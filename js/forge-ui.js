function __forgeSwordModule(root) {
  'use strict';
  /* ───────────── 공통 유틸 ───────────── */
  const CX = 104;
  let UID = 0;
  const nid = (p) => 'fg' + (++UID).toString(36) + p + '_';
  const r1 = (n) => Math.round(n * 10) / 10;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function rng(seed) {
    let a = (seed * 2654435761) >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(h) { h = h.replace('#', ''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(a, b, t) { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
  const pj = (arr) => arr.map((p) => r1(p[0]) + ' ' + r1(p[1])).join(' L ');
  const poly = (arr) => 'M ' + pj(arr) + ' Z';
  const line = (arr) => 'M ' + pj(arr);
  const stops = (s) => s.map((x) => `<stop offset="${x[0]}" stop-color="${x[1]}"${x[2] != null ? ` stop-opacity="${x[2]}"` : ''}/>`).join('');
  const lg = (id, s, x1 = 0, y1 = 0, x2 = 0, y2 = 1, ex = '') => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${ex}>${stops(s)}</linearGradient>`;
  const rg = (id, s, cx = 0.5, cy = 0.5, r = 0.5, ex = '') => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${ex}>${stops(s)}</radialGradient>`;
  function sparkle(x, y, s, fill, op = 1) {
    const k = s * 0.18;
    return `<path d="M ${r1(x)} ${r1(y - s)} Q ${r1(x + k)} ${r1(y - k)} ${r1(x + s)} ${r1(y)} Q ${r1(x + k)} ${r1(y + k)} ${r1(x)} ${r1(y + s)} Q ${r1(x - k)} ${r1(y + k)} ${r1(x - s)} ${r1(y)} Q ${r1(x - k)} ${r1(y - k)} ${r1(x)} ${r1(y - s)} Z" fill="${fill}" opacity="${op}"/>`;
  }
  const rhomb = (x, y, w, h, rot, fill, op = 1) => `<path d="${poly([[x, y - h], [x + w, y], [x, y + h], [x - w, y]])}" fill="${fill}" opacity="${r1(op * 100) / 100}" transform="rotate(${r1(rot)} ${r1(x)} ${r1(y)})"/>`;
  function octPts(x, y, rx, ry) { const a = []; for (let i = 0; i < 8; i++) { const t = Math.PI / 8 + (i * Math.PI) / 4; a.push([x + Math.cos(t) * rx, y + Math.sin(t) * ry]); } return a; }
  function starPts(x, y, n, ro, ri, rot = -Math.PI / 2) { const a = []; for (let i = 0; i < n * 2; i++) { const r = i % 2 ? ri : ro; const t = rot + (i * Math.PI) / n; a.push([x + Math.cos(t) * r, y + Math.sin(t) * r]); } return a; }

  /* ───────────── 팔레트 ───────────── */
  const MT = { // 금속 [하이라이트, 중간, 그림자, 외곽선]
    wood: ['#e2ab6e', '#a86b35', '#6e4220', '#3d240f'], iron: ['#cfd4da', '#8a929b', '#4f565e', '#2b3036'],
    steel: ['#f3f6f9', '#aab4be', '#5e6873', '#2f363e'], brass: ['#fbe3a1', '#d4a646', '#8f6420', '#4d340c'],
    bronze: ['#f3c99a', '#bf8248', '#7a4a22', '#41240e'], gold: ['#fff6cf', '#f4cb5a', '#b5832a', '#5f400d'],
    silver: ['#ffffff', '#dfe6ee', '#9eacbb', '#5d6a79'], bone: ['#fbf5e6', '#e0d2b4', '#a8946c', '#5e4f33'],
    verdant: ['#d8f0a8', '#7fae45', '#3f6b22', '#1f3a10'], blackgold: ['#f5d37a', '#3a3328', '#17130e', '#0a0806'],
    ice: ['#ffffff', '#bdefff', '#5cc0e0', '#1e6f8d'], crimson: ['#ffb199', '#c7372a', '#6e1212', '#360606'],
    teal: ['#d6fff6', '#5fd3bd', '#1e7f78', '#0d3f3c'], violet: ['#e9d4ff', '#8f5bd6', '#45237a', '#1f0d3d'],
    abyss: ['#ff6b8a', '#3a1420', '#14060b', '#050203'], pearl: ['#ffffff', '#f1efff', '#c4c8e6', '#7b7fa6'],
  };
  const BL = { // 칼날 [밝은 면, 중간, 그림자 면, 외곽선, 날 하이라이트]
    wood: ['#f0c58a', '#c88a4c', '#8d5528', '#4e2c12', '#ffe0b0'], iron: ['#e3e7eb', '#a7afb8', '#69727c', '#363c43', '#ffffff'],
    steel: ['#ffffff', '#c6d0da', '#7c8996', '#3a434d', '#ffffff'], bright: ['#ffffff', '#dce6ef', '#8fa0b2', '#44505d', '#ffffff'],
    greenSteel: ['#f4fff0', '#c3d8c6', '#6f8f78', '#2f4535', '#ffffff'], obsidian: ['#7d6a9e', '#2b2338', '#0f0b16', '#050307', '#c9a7ff'],
    silver: ['#ffffff', '#eef3f8', '#b3c0ce', '#6a7889', '#ffffff'], darkSteel: ['#c8cdd4', '#7d858f', '#3d434b', '#1c2025', '#eef2f6'],
    storm: ['#f0fffb', '#a9dcd6', '#4f8d8f', '#1d3d42', '#ffffff'], ice: ['#ffffff', '#c9f3ff', '#6fc8e6', '#2a7ea0', '#ffffff'],
    crimson: ['#ffe2d6', '#e07a64', '#9b2b24', '#4a0d0d', '#fff1e0'], void: ['#b9a3e8', '#4b3480', '#1d1236', '#0a0614', '#e2d3ff'],
    ember: ['#ffcfb8', '#8e2a2a', '#3c0d10', '#160406', '#ffb08a'], gold: ['#fffbe8', '#f6dc8c', '#c59a3c', '#6b4c14', '#ffffff'],
    abyss: ['#5a3346', '#1d0c14', '#090306', '#020001', '#ff5d7e'], chrono: ['#fdfdf6', '#d7e4e6', '#8fa9ae', '#3f5559', '#ffffff'],
    divine: ['#ffffff', '#fff6dc', '#e2c88a', '#8a6a2a', '#ffffff'],
  };
  const FILL = {
    twilight: ['#ffd9a8', '#f2906e', '#b8508f', '#5a2a8a', '#2a1446'],
    galaxy: ['#dfe7ff', '#8a8cf5', '#4a2aa0', '#1d0f52', '#0b0728'],
    aether: ['#ffffff', '#c9f7ff', '#e3d6ff', '#ffe9f6', '#f7fbff'],
    apocalypse: ['#ffb0a0', '#c21a3d', '#5a0818', '#1e0308', '#080103'],
  };
  const GEM = {
    ruby: ['#ffb3c0', '#e0244a', '#6e0820'], sapphire: ['#cfe3ff', '#2f6fe0', '#0c2a73'], emerald: ['#cdf7d8', '#1fae5b', '#0a4a26'],
    amber: ['#fff0b8', '#f0a020', '#7a3f05'], topaz: ['#fffbd0', '#ffd21f', '#a26a00'], amethyst: ['#f0d6ff', '#9b4fe0', '#3e1470'],
    aqua: ['#e8fdff', '#57d6f0', '#11657d'], diamond: ['#ffffff', '#e6f6ff', '#8fb7d6'], blood: ['#ff8fa3', '#b0102e', '#3a0310'],
    prism: ['#ffffff', '#9ff0ff', '#b07cff'], sun: ['#fff6c4', '#ffa21f', '#b0400a'], jade: ['#e6fff0', '#4fcf9a', '#0f5c40'],
  };
  const GRIP = {
    woodplain: { type: 'wood', c: ['#c98d52', '#9a6332', '#5e3a1a'] }, brown: { type: 'leather', c: ['#9a6a44', '#6b4428', '#3a2312'] },
    black: { type: 'leather', c: ['#5a5550', '#2c2826', '#141211'] }, red: { type: 'leather', c: ['#c04a3a', '#7c1f18', '#3c0a08'] },
    blue: { type: 'wire', c: ['#5d7fd0', '#2b4390', '#121f4d'], wire: '#f4cb5a' }, white: { type: 'wire', c: ['#ffffff', '#e3e6ee', '#a7acbb'], wire: '#aab4c2' },
    green: { type: 'leather', c: ['#7aa35a', '#45682f', '#203516'] }, ito: { type: 'ito', c: ['#9a6ae0', '#4a2a80', '#22123d'], base: '#ece6da' },
    fur: { type: 'leather', c: ['#8d8a86', '#57534f', '#2a2725'] }, ice: { type: 'wire', c: ['#d9f6ff', '#7fc8e6', '#2f7ea0'], wire: '#ffffff' },
    violet: { type: 'leather', c: ['#8b62c9', '#4b2d7d', '#22113f'] }, gold: { type: 'wire', c: ['#6a4520', '#3a2410', '#1a0f06'], wire: '#f4cb5a' },
    abyss: { type: 'leather', c: ['#6a1f32', '#2a0a12', '#0e0306'] }, aether: { type: 'wire', c: ['#ffffff', '#e8f4ff', '#a9c2e6'], wire: '#f4cb5a' },
    teal: { type: 'leather', c: ['#4fa8a0', '#21625e', '#0c2f2d'] },
  };

  const TIERS = [
    { min: 0, max: 4, name: '일반', en: 'Common', color: '#b7c0ca' }, { min: 5, max: 9, name: '고급', en: 'Uncommon', color: '#6ad69a' },
    { min: 10, max: 14, name: '희귀', en: 'Rare', color: '#5aaeff' }, { min: 15, max: 19, name: '영웅', en: 'Epic', color: '#bb86ff' },
    { min: 20, max: 25, name: '전설', en: 'Legendary', color: '#ffb547' }, { min: 26, max: 30, name: '신화', en: 'Mythic', color: '#ff6f91' },
  ];
  const tierOf = (lv) => TIERS.find((t) => lv >= t.min && lv <= t.max);

  /* ───────────── 0강 ~ 30강 도검 정의 ───────────── */
  const SWORDS = [
    { n: '수련용 목검', en: 'Training Bokken', blade: 'wood', w: 8, b: 'wood', guard: 'block', gm: 'wood', grip: 'woodplain', pommel: 'cap', fx: ['grain'], desc: '견습 대장장이가 처음 쥐는 참나무 목검. 나뭇결마다 첫 땀방울이 배어 있다.' },
    { n: '철검', en: 'Iron Sword', blade: 'straight', w: 8.5, b: 'iron', guard: 'bar', gm: 'iron', grip: 'brown', pommel: 'wheel', fx: ['fuller', 'scratch'], desc: '투박하게 두드린 무쇠 직검. 거칠지만 정직한 무게감을 지녔다.' },
    { n: '강철검', en: 'Steel Sword', blade: 'straight', w: 9, b: 'steel', guard: 'arch', gm: 'steel', grip: 'brown', pommel: 'wheel', fx: ['fuller'], desc: '여러 번 접어 단련한 강철. 혈조를 따라 맑은 광택이 흐른다.' },
    { n: '장검', en: 'Longsword', blade: 'straight', tip: 6, w: 8.6, b: 'steel', guard: 'cross', gm: 'steel', grip: 'black', pommel: 'pear', gem: 'ruby', fx: ['fuller'], fullerEnd: 0.7, desc: '양손으로도 쥘 수 있는 긴 손잡이의 기사 장검.' },
    { n: '브로드소드', en: 'Broadsword', blade: 'broad', w: 12.5, tip: 18, b: 'steel', guard: 'bar', heavy: 1, gm: 'bronze', grip: 'brown', pommel: 'wheel', gem: 'amber', fx: ['fuller2'], desc: '넓은 날과 이중 혈조로 내려치는 힘을 극대화한 브로드소드.' },
    { n: '세이버', en: 'Sabre', blade: 'saber', w: 7.4, b: 'bright', guard: 'dguard', gm: 'brass', grip: 'black', pommel: 'cap', gem: 'sapphire', fx: ['fuller'], fullerEnd: 0.6, desc: '기병의 손을 감싸는 너클가드와 유려한 곡선 날의 세이버.' },
    { n: '늑대 이빨검', en: 'Wolf Fang Blade', blade: 'serrated', w: 9, b: 'darkSteel', guard: 'fang', gm: 'bone', pm: 'iron', grip: 'fur', pommel: 'spike', gem: 'amber', glow: '#ffb347', fx: ['fuller', 'scratch'], fullerEnd: 0.55, desc: '늑대의 송곳니처럼 등날에 톱니가 돋은 사냥꾼의 검.' },
    { n: '숲의 수호검', en: 'Sylvan Warden', blade: 'leaf', w: 8.4, b: 'greenSteel', guard: 'leaf', gm: 'verdant', pm: 'gold', grip: 'green', pommel: 'pear', gem: 'emerald', glow: '#9be86f', fx: ['vine', 'motes', 'auraSoft'], desc: '숲의 정령이 깃든 잎사귀 모양 칼날. 에메랄드가 숨을 쉰다.' },
    { n: '흑요석 카타나', en: 'Obsidian Katana', blade: 'katana', w: 7.6, b: 'obsidian', guard: 'tsuba', gm: 'blackgold', grip: 'ito', pommel: 'kashira', glow: '#b98cff', fx: ['hamon', 'auraSoft'], gripLen: 46, desc: '화산 유리를 벼려 만든 칠흑의 카타나. 자색 하몬이 일렁인다.' },
    { n: '백은 기사도검', en: 'Argent Chivalry', blade: 'straight', w: 8.6, tip: 8, b: 'silver', guard: 'cross', filigree: 1, gm: 'silver', grip: 'white', pommel: 'gem', gem: 'sapphire', glow: '#cfe3ff', fx: ['fuller', 'filigree', 'auraSoft'], desc: '순백 은으로 세공한 기사도의 맹세. 사파이어가 서약을 지킨다.' },
    { n: '거인 대검', en: 'Titan Greatsword', blade: 'great', w: 13.5, b: 'darkSteel', guard: 'bar', heavy: 2, gm: 'iron', grip: 'black', pommel: 'wheel', gem: 'ruby', fx: ['fuller', 'scratch'], fullerStart: 0.14, desc: '거인의 팔로나 휘두를 법한 양손 대검. 리카소와 패링 훅을 갖췄다.' },
    { n: '뇌전 레이피어', en: 'Thunder Rapier', blade: 'rapier', w: 4.6, b: 'bright', guard: 'cup', gm: 'gold', grip: 'blue', pommel: 'pear', gem: 'topaz', glow: '#8fd8ff', fx: ['lightning', 'aura'], desc: '번개를 머금은 가느다란 레이피어. 찌르는 순간 뇌광이 터진다.' },
    { n: '빙결 크리스탈 소드', en: 'Glacial Crystal', blade: 'crystal', w: 10, b: 'ice', guard: 'ice', gm: 'ice', grip: 'ice', pommel: 'crystal', gem: 'aqua', glow: '#9fe9ff', fx: ['frost', 'aura'], desc: '만년설의 결정으로 깎은 얼음 칼날. 각진 면마다 냉기가 맺힌다.' },
    { n: '진홍 플람베르주', en: 'Crimson Flamberge', blade: 'flame', w: 9, tip: 8, b: 'crimson', guard: 'arch', gm: 'blackgold', grip: 'red', pommel: 'pear', gem: 'ruby', glow: '#ff6a3d', fx: ['flames', 'aura', 'embers'], desc: '타오르는 불꽃처럼 물결치는 진홍의 플람베르주.' },
    { n: '폭풍검', en: 'Tempest Blade', blade: 'broad', w: 11, tip: 14, b: 'storm', guard: 'storm', gm: 'teal', grip: 'teal', pommel: 'spike', gem: 'aqua', glow: '#76f2da', fx: ['fuller', 'wind', 'lightning', 'aura'], desc: '태풍의 눈을 봉인한 검. 휘두를 때마다 바람이 소용돌이친다.' },
    { n: '에스톡', en: 'Rune Estoc', blade: 'estoc', w: 5.6, tip: 6, b: 'steel', guard: 'cross', gm: 'steel', grip: 'black', pommel: 'gem', gem: 'sapphire', glow: '#7fb6ff', fx: ['runes', 'auraSoft'], desc: '갑옷 틈을 꿰뚫는 에스톡. 날 위에 고대 룬이 새겨져 있다.' },
    { n: '황혼 마검', en: 'Twilight Demonblade', blade: 'straight', w: 9.6, fill: 'twilight', b: 'void', guard: 'crescent', gm: 'violet', grip: 'violet', pommel: 'spike', gem: 'amethyst', glow: '#ff9a6a', fx: ['runes', 'aura', 'moon', 'embers'], desc: '해가 지는 경계에서 벼려진 마검. 초승달 코등이가 어둠을 부른다.' },
    { n: '별빛 성검', en: 'Starlight Holy Sword', blade: 'straight', w: 9.4, tip: 8, b: 'silver', guard: 'star', gm: 'pearl', grip: 'white', pommel: 'gem', gem: 'sapphire', glow: '#a9c8ff', fx: ['fuller', 'runes', 'aura', 'sparkles'], desc: '별빛을 녹여 부은 성검. 칼날 위로 은하의 숨결이 반짝인다.' },
    { n: '차원 집행검', en: 'Rift Executioner', blade: 'executioner', w: 12, b: 'void', guard: 'rift', gm: 'violet', grip: 'violet', pommel: 'spike', gem: 'amethyst', glow: '#b96bff', fx: ['void', 'shards', 'aura', 'hole'], desc: '차원을 가르는 집행자의 검. 칼끝 대신 공간 자체가 갈라진다.' },
    { n: '명왕 참마도', en: 'Underworld Zhanmadao', blade: 'zhanma', w: 11, tip: 8, base: 136, b: 'ember', guard: 'demon', gm: 'blackgold', grip: 'red', pommel: 'spike', gem: 'blood', glow: '#ff3d3d', fx: ['runes', 'aura', 'embers'], gripLen: 48, desc: '명계의 왕이 마귀를 베던 참마도. 붉은 룬이 핏줄처럼 맥동한다.' },
    { n: '태양신 군주검', en: 'Sun Sovereign', blade: 'straight', w: 10.4, tip: 8, b: 'gold', guard: 'sun', gm: 'gold', grip: 'gold', pommel: 'sunp', gem: 'sun', glow: '#ffd36a', fx: ['sunmark', 'rays', 'aura', 'sparkles', 'fuller'], fullerStart: 0.2, desc: '태양신의 왕권을 상징하는 군주검. 열여섯 갈래 광휘가 코등이를 감싼다.' },
    { n: '드래곤 슬레이어', en: 'Dragon Slayer', blade: 'great', w: 15, b: 'darkSteel', guard: 'dragon', gm: 'crimson', grip: 'black', pommel: 'spike', pm: 'blackgold', gem: 'ruby', glow: '#ff5a2a', fx: ['fuller', 'scratch', 'embers', 'aura'], fullerStart: 0.14, desc: '용의 비늘마저 쪼개는 거대한 대검. 용익 코등이가 불티를 뿜는다.' },
    { n: '엑스칼리버', en: 'Excalibur', blade: 'straight', w: 9.4, tip: 6, b: 'silver', guard: 'excal', gm: 'gold', grip: 'blue', pommel: 'gem', gem: 'sapphire', glow: '#ffe39a', fx: ['fuller', 'inlay', 'runes', 'aura', 'sparkles'], fullerEnd: 0.68, desc: '호수의 요정이 건넨 전설의 성검. 황금 상감 혈조가 왕을 증명한다.' },
    { n: '발키리 소드', en: 'Valkyrie Sword', blade: 'leaf', w: 8.2, tip: 8, b: 'silver', guard: 'wing', gm: 'pearl', pm: 'silver', grip: 'white', pommel: 'crown', gem: 'aqua', glow: '#dff2ff', fx: ['fuller', 'feathers', 'aura', 'sparkles'], desc: '전장의 영혼을 인도하는 발키리의 검. 순백 날개 코등이가 펼쳐진다.' },
    { n: '심연 종언검', en: 'Abyssal Terminus', blade: 'abyss', w: 9.6, b: 'abyss', guard: 'abyss', gm: 'abyss', grip: 'abyss', pommel: 'spike', gem: 'blood', glow: '#ff2e63', fx: ['void', 'aura', 'embers', 'shards'], desc: '심연의 끝에서 건져 올린 종언의 검. 가시 돋친 날이 빛을 삼킨다.' },
    { n: '크로노스', en: 'Chronos', blade: 'straight', w: 9.4, tip: 8, b: 'chrono', guard: 'clock', gm: 'gold', grip: 'gold', pommel: 'gem', gem: 'jade', glow: '#9ff0d0', fx: ['clockring', 'fuller', 'runes', 'aura', 'sparkles'], desc: '시간의 신 크로노스의 검. 등 뒤의 시계 고리가 영원을 센다.' },
    { n: '은하수 성좌검', en: 'Milky Way Constellation', blade: 'straight', w: 10, tip: 6, fill: 'galaxy', b: 'void', guard: 'star', gm: 'pearl', grip: 'violet', pommel: 'gem', gem: 'amethyst', glow: '#9db4ff', fx: ['galaxy', 'constellation', 'aura', 'sparkles'], desc: '은하수를 칼날에 담�� 성좌검. 별자리가 검기를 따라 이어진다.' },
    { n: '라그나로크', en: 'Ragnarök', blade: 'great', w: 13, b: 'ember', guard: 'dragon', gm: 'blackgold', grip: 'black', pommel: 'spike', gem: 'sun', glow: '#ff7a1a', fx: ['ghost2', 'flames', 'embers', 'aura', 'rays', 'runes'], desc: '신들의 황혼을 부르는 라그나로크. 세 개의 칼날이 불길 속에 겹친다.' },
    { n: '천지개벽 성검', en: 'Genesis Dawnbreaker', blade: 'divine', w: 9.6, tip: 6, b: 'divine', guard: 'wing', gm: 'gold', grip: 'aether', pommel: 'crown', gem: 'diamond', glow: '#ffe9a8', fx: ['halo', 'rays', 'crystals', 'aura', 'sparkles', 'fuller', 'inlay'], desc: '하늘과 땅을 여는 천지개벽의 성검. 후광과 성물 크리스탈이 떠오른다.' },
    { n: '무한의 아포칼립스', en: 'Infinite Apocalypse', blade: 'abyss', w: 10, tip: 6, fill: 'apocalypse', b: 'abyss', guard: 'abyss', gm: 'abyss', grip: 'abyss', pommel: 'spike', gem: 'blood', glow: '#ff3355', fx: ['ghost3', 'halo', 'crystals', 'void', 'aura', 'embers'], desc: '끝없는 종말을 새긴 무한의 아포칼립스. 다중 검영이 핏빛 후광을 두른다.' },
    { n: '창세의 신화검 · 에테르', en: 'Aether, Blade of Genesis', blade: 'divine', w: 10, tip: 4, fill: 'aether', b: 'divine', guard: 'aether', gm: 'gold', grip: 'aether', pommel: 'crown', gem: 'prism', glow: '#bdf4ff', fx: ['halo', 'ghost2', 'rays', 'crystals', 'aura', 'sparkles', 'constellation', 'fuller', 'inlay', 'wings6', 'orbit2', 'sats'], desc: '세계가 처음 열리던 날의 빛을 벼린 창세의 신화검, 에테르.' },
  ];

  /* ───────────── 칼날 기하 (실루엣 7계열+) ───────────── */
  function bladeGeometry(d) {
    const type = d.blade;
    const great = type === 'great';
    const tip = d.tip != null ? d.tip : ({ wood: 28, rapier: 6, estoc: 8, great: 6, executioner: 16, katana: 12, saber: 14 }[type] || 12);
    const base = d.base != null ? d.base : great ? 132 : type === 'rapier' ? 140 : 144;
    const w = d.w || 9;
    const n = { serrated: 156, abyss: 160, crystal: 9, flame: 120 }[type] || 64;
    const len = base - tip;
    const tf = (t, s, p = 0.85) => (t < s ? 1 : Math.pow(Math.max(0, 1 - (t - s) / (1 - s)), p));
    const smooth = (t, a, b) => { const x = clamp((t - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
    const L = [], R = [], C = [], T = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      let hl, hr, bend = 0, rf = 0.5;
      switch (type) {
        case 'wood': hl = hr = w * (1 - 0.06 * t) * tf(t, 0.88, 0.45); break;
        case 'broad': hl = hr = w * (1 - 0.1 * t) * tf(t, 0.86, 0.75); break;
        case 'great': hl = hr = t < 0.11 ? w * 0.58 : w * (1 - 0.12 * t) * tf(t, 0.85, 0.8); break;
        case 'rapier': hl = hr = w * (1 - 0.55 * t) * tf(t, 0.9, 1); break;
        case 'estoc': hl = hr = w * (1 - 0.5 * t) * tf(t, 0.84, 1); break;
        case 'saber': hl = w * (1 - 0.05 * t) * tf(t, 0.8, 0.7); hr = w * 0.42 * tf(t, 0.9, 1.4); bend = 18 * t * t; rf = 0.62; break;
        case 'katana': hl = w * (1 - 0.18 * t) * tf(t, 0.9, 0.6); hr = w * 0.5 * (1 - 0.15 * t) * tf(t, 0.93, 1.6); bend = 12 * t * t; rf = 0.7; break;
        case 'zhanma': hl = w * (1 - 0.08 * t) * tf(t, 0.86, 0.6); hr = w * 0.45 * tf(t, 0.95, 1.8); bend = 8 * t * t; rf = 0.72; break;
        case 'serrated': {
          const b0 = w * (1 - 0.14 * t) * tf(t, 0.8); const u = t * 13;
          const tooth = t > 0.06 && t < 0.72 ? 3.4 * Math.pow(1 - (u - Math.floor(u)), 1.6) : 0;
          hl = b0; hr = b0 + tooth; break;
        }
        case 'leaf': hl = hr = w * (0.7 + 0.48 * Math.sin(Math.PI * Math.min(1, t / 0.92) * 0.92)) * tf(t, 0.76, 0.9); break;
        case 'crystal': {
          const b0 = w * (1.15 - 0.2 * t) * tf(t, 0.7, 1);
          const j = i > 0 && i < n ? ((Math.sin(i * 12.9898) * 43758.5453) % 1) * 3.2 : 0;
          hl = Math.max(0, b0 + j); hr = Math.max(0, b0 - j * 0.6 + (i % 2 && i < n ? 1.6 : 0)); break;
        }
        case 'flame': hl = hr = w * (1 - 0.14 * t) * tf(t, 0.86); bend = 2.6 * Math.sin(t * Math.PI * 11) * smooth(t, 0.05, 0.12) * tf(t, 0.86, 1); break;
        case 'executioner': hl = hr = w * (1 - 0.05 * t) * (t > 0.96 ? 1 - ((t - 0.96) / 0.04) * 0.25 : 1); break;
        case 'abyss': {
          const b0 = w * (1 - 0.12 * t) * tf(t, 0.8, 0.8);
          const sp = (ph) => (t > 0.08 && t < 0.78 ? 4.4 * Math.pow(Math.max(0, Math.sin(t * Math.PI * 8 + ph)), 6) : 0);
          hl = b0 + sp(0); hr = b0 + sp(1.6); break;
        }
        case 'divine': hl = hr = w * (1.08 - 0.2 * t) * tf(t, 0.8, 0.8) + (t < 0.12 ? 6 * Math.pow(1 - t / 0.12, 2) : 0); break;
        default: hl = hr = w * (1 - 0.16 * t) * tf(t, 0.8);
      }
      const y = base - t * len;
      const xl = CX + bend - hl, xr = CX + bend + hr;
      L.push([xl, y]); R.push([xr, y]); C.push([xl + (xr - xl) * rf, y]); T.push(t);
    }
    return { L, R, C, T, tip, base, w, n, type, great, len, single: ['saber', 'katana', 'zhanma'].includes(type) };
  }

  const RUNES = [
    [[0, 0, 0, 1.6], [0, 0.3, 0.7, 0], [0, 0.7, 0.7, 0.4]], [[0, 0, 0, 1.6], [0, 0, 0.7, 0.4], [0.7, 0.4, 0.7, 1.6]],
    [[0, 0, 0, 1.6], [0, 0.4, 0.6, 0.8], [0.6, 0.8, 0, 1.2]], [[0, 0, 0, 1.6], [0, 0, 0.6, 0.4], [0.6, 0.4, 0, 0.8], [0, 0.8, 0.6, 1.6]],
    [[0.6, 0, 0, 0.8], [0, 0.8, 0.6, 1.6]], [[0, 0, 0.7, 1.6], [0.7, 0, 0, 1.6]], [[0.35, 0, 0.35, 1.6], [0.35, 0.6, 0, 0], [0.35, 0.6, 0.7, 0]],
    [[0.35, 0, 0.35, 1.6], [0.35, 0, 0, 0.5], [0.35, 0, 0.7, 0.5]], [[0, 0, 0, 1.6], [0.7, 0, 0.7, 1.6], [0, 0, 0.7, 1.6], [0.7, 0, 0, 1.6]],
    [[0.35, 0, 0.7, 0.8], [0.7, 0.8, 0.35, 1.6], [0.35, 1.6, 0, 0.8], [0, 0.8, 0.35, 0]],
  ];

  /* ───────────── 보석 (컷팅 코어) ───────────── */
  function gemSvg(c, x, y, rx, ry, col, setting = true) {
    const gid = c.id('gem' + c.k++);
    c.defs.push(rg(gid, [[0, col[0]], [0.45, col[1]], [1, col[2]]], 0.38, 0.32, 0.75));
    const o = octPts(x, y, rx, ry), tb = octPts(x, y - ry * 0.1, rx * 0.5, ry * 0.48);
    let s = '';
    if (setting) s += `<path d="${poly(octPts(x, y, rx + 1.3, ry + 1.3))}" fill="url(#${c.mh})" stroke="${c.m[3]}" stroke-width="0.6"/>`;
    s += `<path d="${poly(o)}" fill="url(#${gid})" stroke="${col[2]}" stroke-width="0.5"/>`;
    for (let i = 4; i < 8; i++) { const j = (i + 1) % 8; s += `<path d="${poly([o[i], o[j], tb[j], tb[i]])}" fill="${col[0]}" opacity="${i % 2 ? 0.28 : 0.12}"/>`; }
    s += `<path d="${o.map((p, i) => `M ${r1(p[0])} ${r1(p[1])} L ${r1(tb[i][0])} ${r1(tb[i][1])}`).join(' ')}" stroke="${col[0]}" stroke-width="0.35" opacity="0.6"/>`;
    s += `<path d="${poly(tb)}" fill="${col[0]}" opacity="0.32" stroke="${col[0]}" stroke-width="0.3"/>`;
    s += `<path d="${poly([[x - rx * 0.62, y - ry * 0.15], [x - rx * 0.22, y - ry * 0.66], [x - rx * 0.02, y - ry * 0.5], [x - rx * 0.42, y - ry * 0.02]])}" fill="#fff" opacity="0.85"/>`;
    if (!c.mini) s += sparkle(x + rx * 0.4, y - ry * 0.45, Math.max(1.1, rx * 0.45), '#fff', 0.95);
    return s;
  }

  /* ───────────── 코등이 ───────────── */
  function guardSvg(c) {
    const { d, y0, m } = c; const S = []; const t = d.guard;
    const MP = (p, ex = '') => `<path d="${p}" fill="url(#${c.mg})" stroke="${m[3]}" stroke-width="0.8" stroke-linejoin="round"${ex}/>`;
    const AP = (p) => `<path d="${p}" fill="url(#${c.ag})" stroke="#5f400d" stroke-width="0.6" stroke-linejoin="round"/>`;
    const HL = (p, op = 0.8, w = 0.7) => `<path d="${p}" fill="none" stroke="${m[0]}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
    const finial = (x, y, s) => MP(poly([[x, y - s], [x + s * 0.7, y], [x, y + s], [x - s * 0.7, y]])) + `<path d="${poly([[x, y - s], [x + s * 0.7, y], [x, y]])}" fill="${m[0]}" opacity="0.6"/>`;
    const gem = (x, y, rx, ry) => (c.gem ? gemSvg(c, x, y, rx, ry, c.gem) : MP(poly(octPts(x, y, rx * 0.8, ry * 0.8))) + HL(line(octPts(x, y, rx * 0.5, ry * 0.5).slice(4, 8)), 0.6, 0.5));
    const bar = (W, T) => {
      let s = MP(poly([[CX - W, y0 + 1.5], [CX - 7, y0], [CX + 7, y0], [CX + W, y0 + 1.5], [CX + W, y0 + T - 1.5], [CX + 7, y0 + T], [CX - 7, y0 + T], [CX - W, y0 + T - 1.5]]));
      s += HL(line([[CX - W + 1, y0 + 2], [CX - 7, y0 + 0.8], [CX + 7, y0 + 0.8], [CX + W - 1, y0 + 2]]));
      s += `<path d="M ${CX - W + 1} ${y0 + T - 2} L ${CX + W - 1} ${y0 + T - 2}" stroke="${m[3]}" stroke-width="0.5" opacity="0.6"/>`;
      return s + finial(CX - W - 2.5, y0 + T / 2, T * 0.62) + finial(CX + W + 2.5, y0 + T / 2, T * 0.62);
    };
    const knuckle = (p, w = 3) => `<path d="${p}" fill="none" stroke="${m[3]}" stroke-width="${w + 1.2}" stroke-linecap="round"/><path d="${p}" fill="none" stroke="url(#${c.mh})" stroke-width="${w}" stroke-linecap="round"/><path d="${p}" fill="none" stroke="${m[0]}" stroke-width="0.7" opacity="0.75" transform="translate(-0.6 0)"/>`;
    const sides = [-1, 1];
    switch (t) {
      case 'block':
        S.push(MP(`M ${CX - 15} ${y0} Q ${CX - 17.5} ${y0 + 4} ${CX - 15} ${y0 + 8} L ${CX + 15} ${y0 + 8} Q ${CX + 17.5} ${y0 + 4} ${CX + 15} ${y0} Z`));
        S.push(`<path d="M ${CX - 13} ${y0 + 2.6} Q ${CX - 4} ${y0 + 1.6} ${CX + 13} ${y0 + 3} M ${CX - 14} ${y0 + 5.4} Q ${CX + 2} ${y0 + 6.8} ${CX + 14} ${y0 + 5} M ${CX - 6} ${y0 + 4} Q ${CX + 2} ${y0 + 3.2} ${CX + 9} ${y0 + 4.2}" stroke="${m[2]}" stroke-width="0.5" fill="none" opacity="0.7"/>`);
        S.push(HL(`M ${CX - 14} ${y0 + 0.8} L ${CX + 14} ${y0 + 0.8}`, 0.6));
        S.push(rhomb(CX - 10, y0 + 4, 1.4, 1.8, 0, m[3], 0.7), rhomb(CX + 10, y0 + 4, 1.4, 1.8, 0, m[3], 0.7));
        break;
      case 'bar': {
        const W = d.heavy === 2 ? 34 : d.heavy ? 30 : 26, T = d.heavy ? 9 : 7;
        S.push(bar(W, T));
        S.push(MP(poly([[CX - 8, y0 + 1], [CX, y0 - 7], [CX + 8, y0 + 1], [CX, y0 + T + 2]])));
        S.push(`<path d="${poly([[CX - 8, y0 + 1], [CX, y0 - 7], [CX, y0 + T + 2]])}" fill="${m[0]}" opacity="0.35"/>`);
        if (c.gem) S.push(gemSvg(c, CX, y0 + T / 2 - 0.5, 3.2, 3.6, c.gem));
        break;
      }
      case 'arch': case 'excal': case 'storm': {
        const W = t === 'excal' ? 30 : t === 'storm' ? 23 : 27;
        S.push(MP(`M ${CX - W} ${y0 - 9} Q ${CX - W * 0.55} ${y0 + 1} ${CX} ${y0 - 0.5} Q ${CX + W * 0.55} ${y0 + 1} ${CX + W} ${y0 - 9} L ${CX + W + 2.4} ${y0 - 6.5} Q ${CX + W * 0.6} ${y0 + 9.5} ${CX} ${y0 + 8.5} Q ${CX - W * 0.6} ${y0 + 9.5} ${CX - W - 2.4} ${y0 - 6.5} Z`));
        S.push(HL(`M ${CX - W + 1} ${y0 - 7.6} Q ${CX - W * 0.55} ${y0 + 2.4} ${CX - 6} ${y0 + 1.4} M ${CX + 6} ${y0 + 1.4} Q ${CX + W * 0.55} ${y0 + 2.4} ${CX + W - 1} ${y0 - 7.6}`, 0.7));
        if (t === 'storm') {
          sides.forEach((s) => {
            S.push(MP(`M ${CX + s * 6} ${y0 + 6} Q ${CX + s * 20} ${y0 + 8} ${CX + s * 27} ${y0 + 19} Q ${CX + s * 16} ${y0 + 12} ${CX + s * 6} ${y0 + 10} Z`));
            S.push(knuckle(`M ${CX + s * W} ${y0 - 7} C ${CX + s * (W + 9)} ${y0 - 14} ${CX + s * (W + 14)} ${y0 - 2} ${CX + s * (W + 7)} ${y0 + 3} C ${CX + s * (W + 3)} ${y0 + 6} ${CX + s * (W - 1)} ${y0 + 1} ${CX + s * (W + 3)} ${y0 - 1}`, 2));
          });
        } else {
          S.push(finial(CX - W - 0.6, y0 - 10.5, 4), finial(CX + W + 0.6, y0 - 10.5, 4));
        }
        if (t === 'excal') {
          sides.forEach((s) => S.push(knuckle(`M ${CX + s * 9} ${y0 + 7} C ${CX + s * 15} ${y0 + 14} ${CX + s * 25} ${y0 + 13} ${CX + s * 23.5} ${y0 + 7} C ${CX + s * 22} ${y0 + 3.5} ${CX + s * 17.5} ${y0 + 5.5} ${CX + s * 19.2} ${y0 + 8}`, 1.4)));
          S.push(MP(poly([[CX - 3.5, y0 - 2], [CX, y0 - 11], [CX + 3.5, y0 - 2]])));
        }
        S.push(MP(`M ${CX - 9} ${y0 - 1} L ${CX + 9} ${y0 - 1} L ${CX + 7} ${y0 + 7} L ${CX} ${y0 + 11} L ${CX - 7} ${y0 + 7} Z`));
        S.push(HL(`M ${CX - 8} ${y0} L ${CX + 8} ${y0}`, 0.7));
        S.push(gem(CX, y0 + 4, 3.6, 4));
        break;
      }
      case 'cross': {
        const W = 31;
        sides.forEach((s) => {
          S.push(MP(poly([[CX + s * 6, y0 + 1.5], [CX + s * (W - 5), y0 + 2.4], [CX + s * W, y0 - 1.5], [CX + s * (W + 1), y0 + 4], [CX + s * W, y0 + 9.5], [CX + s * (W - 5), y0 + 5.6], [CX + s * 6, y0 + 6.5]])));
          S.push(HL(line([[CX + s * 7, y0 + 2.3], [CX + s * (W - 5), y0 + 3], [CX + s * (W - 0.6), y0 - 0.4]]), 0.75));
          if (d.filigree) S.push(`<path d="M ${CX + s * 9} ${y0 + 4} q ${s * 3} -2.6 ${s * 6} 0 t ${s * 6} 0 t ${s * 5} 0" fill="none" stroke="${m[3]}" stroke-width="0.5" opacity="0.7"/>`);
        });
        S.push(MP(poly(octPts(CX, y0 + 4, 8, 7))));
        S.push(`<path d="${poly(octPts(CX, y0 + 4, 6.2, 5.3))}" fill="none" stroke="${m[0]}" stroke-width="0.5" opacity="0.8"/>`);
        S.push(gem(CX, y0 + 4, 4, 4.3));
        break;
      }
      case 'dguard':
        S.push(MP(`M ${CX - 5} ${y0 + 1} Q ${CX - 18} ${y0} ${CX - 22} ${y0 + 9} L ${CX - 19.5} ${y0 + 10} Q ${CX - 16} ${y0 + 4.5} ${CX - 5} ${y0 + 6} Z`));
        S.push(finial(CX - 21.5, y0 + 12.5, 3));
        S.push(knuckle(`M ${CX + 8} ${y0 + 3} C ${CX + 23} ${y0 + 6} ${CX + 20} ${c.gripBot - 6} ${CX + 5} ${c.gripBot + 1}`));
        S.push(MP(`M ${CX - 6} ${y0 - 0.5} L ${CX + 10} ${y0 - 0.5} Q ${CX + 13} ${y0 + 3.5} ${CX + 8} ${y0 + 7} L ${CX - 6} ${y0 + 7} Z`));
        S.push(HL(`M ${CX - 5} ${y0 + 0.6} L ${CX + 9} ${y0 + 0.6}`, 0.7));
        S.push(gem(CX + 2, y0 + 3.3, 2.6, 2.8));
        break;
      case 'fang':
        sides.forEach((s) => {
          S.push(MP(`M ${CX + s * 5} ${y0 + 0.5} Q ${CX + s * 22} ${y0 - 3} ${CX + s * 27} ${y0 + 15} Q ${CX + s * 19} ${y0 + 5.5} ${CX + s * 5} ${y0 + 7} Z`));
          S.push(MP(`M ${CX + s * 6} ${y0 + 6} Q ${CX + s * 15} ${y0 + 6} ${CX + s * 16.5} ${y0 + 15} Q ${CX + s * 12} ${y0 + 9.5} ${CX + s * 6} ${y0 + 9} Z`));
          S.push(HL(`M ${CX + s * 7} ${y0 + 1.6} Q ${CX + s * 20} ${y0 - 0.8} ${CX + s * 25} ${y0 + 11}`, 0.85));
          S.push(`<path d="M ${CX + s * 12} ${y0 + 1} q ${s * 1} 2 0 4.5 M ${CX + s * 17} ${y0 + 1.2} q ${s * 1.2} 2.4 0 5" stroke="${m[2]}" stroke-width="0.5" fill="none"/>`);
        });
        S.push(`<path d="M ${CX - 7} ${y0 - 1} L ${CX + 7} ${y0 - 1} L ${CX + 6} ${y0 + 8} L ${CX - 6} ${y0 + 8} Z" fill="#3b3f46" stroke="#16181b" stroke-width="0.7"/>`);
        S.push(`<path d="M ${CX - 6} ${y0} L ${CX + 6} ${y0}" stroke="#9aa1aa" stroke-width="0.6"/>`);
        S.push(gem(CX, y0 + 3.6, 2.8, 3.2));
        break;
      case 'leaf':
        sides.forEach((s) => {
          S.push(MP(`M ${CX + s * 5} ${y0 + 3} Q ${CX + s * 16} ${y0 - 12} ${CX + s * 32} ${y0 - 8} Q ${CX + s * 20} ${y0 + 8} ${CX + s * 5} ${y0 + 3} Z`));
          S.push(`<path d="M ${CX + s * 5} ${y0 + 3} Q ${CX + s * 18} ${y0 - 3} ${CX + s * 31} ${y0 - 7.6} M ${CX + s * 12} ${y0 + 0.6} l ${s * 2} -4 M ${CX + s * 17} ${y0 - 1.2} l ${s * 2.4} -4 M ${CX + s * 22} ${y0 - 3.4} l ${s * 2} -3 M ${CX + s * 14} ${y0 + 0.2} l ${s * 3} 3 M ${CX + s * 20} ${y0 - 2.4} l ${s * 3} 2.6" stroke="${m[3]}" stroke-width="0.5" fill="none" opacity="0.75"/>`);
          S.push(MP(`M ${CX + s * 5} ${y0 + 6} Q ${CX + s * 12} ${y0 + 3.6} ${CX + s * 23} ${y0 + 14} Q ${CX + s * 13} ${y0 + 15} ${CX + s * 5} ${y0 + 6} Z`));
          S.push(`<path d="M ${CX + s * 6} ${y0 + 6.5} Q ${CX + s * 14} ${y0 + 9} ${CX + s * 22} ${y0 + 13.6}" stroke="${m[3]}" stroke-width="0.45" fill="none"/>`);
          S.push(`<path d="M ${CX + s * 4} ${y0 + 8} C ${CX + s * 11} ${y0 + 13} ${CX + s * 10} ${y0 + 19} ${CX + s * 7} ${y0 + 17} C ${CX + s * 5} ${y0 + 15.5} ${CX + s * 7} ${y0 + 13.8} ${CX + s * 8.4} ${y0 + 15}" stroke="#e9c766" stroke-width="0.9" fill="none" stroke-linecap="round"/>`);
        });
        S.push(AP(`M ${CX} ${y0 - 6} Q ${CX + 7} ${y0 + 2} ${CX} ${y0 + 11} Q ${CX - 7} ${y0 + 2} ${CX} ${y0 - 6} Z`));
        S.push(gem(CX, y0 + 2.6, 2.8, 3.4));
        break;
      case 'tsuba': {
        const hx1 = c.g.L[0][0] - 0.8, hx2 = c.g.R[0][0] + 0.8;
        S.push(AP(`M ${r1(hx1)} ${y0 - 9} L ${r1(hx2 - 0.4)} ${y0 - 9} L ${r1(hx2)} ${y0} L ${r1(hx1 - 0.4)} ${y0} Z`));
        S.push(`<path d="M ${r1(hx1 + 1)} ${y0 - 7} l 3 -1.4 M ${r1(hx1 + 1)} ${y0 - 4} l 5 -2.4 M ${r1(hx1 + 1)} ${y0 - 1.2} l 7 -3.4" stroke="#fff6cf" stroke-width="0.4" opacity="0.6"/>`);
        S.push(`<rect x="${CX - 12}" y="${y0}" width="24" height="1.4" fill="url(#${c.ag})"/>`);
        S.push(MP(`M ${CX - 17} ${y0 + 4.6} C ${CX - 17} ${y0 + 0.8} ${CX + 17} ${y0 + 0.8} ${CX + 17} ${y0 + 4.6} C ${CX + 17} ${y0 + 8.4} ${CX - 17} ${y0 + 8.4} ${CX - 17} ${y0 + 4.6} Z`));
        S.push(`<path d="M ${CX - 15} ${y0 + 4.6} C ${CX - 15} ${y0 + 2.2} ${CX + 15} ${y0 + 2.2} ${CX + 15} ${y0 + 4.6}" stroke="#f5d37a" stroke-width="0.6" fill="none" opacity="0.8"/>`);
        sides.forEach((s) => S.push(`<path d="M ${CX + s * 8} ${y0 + 4.6} Q ${CX + s * 11} ${y0 + 2.8} ${CX + s * 13} ${y0 + 4.6} Q ${CX + s * 11} ${y0 + 6.4} ${CX + s * 8} ${y0 + 4.6} Z" fill="${m[3]}" stroke="#f5d37a" stroke-width="0.3"/>`));
        S.push(`<rect x="${CX - 11}" y="${y0 + 8}" width="22" height="1.3" fill="url(#${c.ag})"/>`);
        break;
      }
      case 'cup':
        sides.forEach((s) => {
          S.push(knuckle(`M ${CX} ${y0 + 2.5} L ${CX + s * 27} ${y0 + 2} Q ${CX + s * 33} ${y0 + 1.5} ${CX + s * 32} ${y0 - 4}`, 2.2));
          S.push(finial(CX + s * 32, y0 - 5.5, 2.4));
          S.push(knuckle(`M ${CX + s * 2} ${y0} C ${CX + s * 2} ${y0 - 9} ${CX + s * 10} ${y0 - 9} ${CX + s * 10} ${y0 - 1}`, 1.3));
        });
        S.push(knuckle(`M ${CX + 14} ${y0 + 2} C ${CX + 25} ${y0 + 14} ${CX + 22} ${c.gripBot - 8} ${CX + 6} ${c.gripBot + 1}`, 2.4));
        S.push(MP(`M ${CX - 15} ${y0 + 0.5} Q ${CX - 15} ${y0 + 12} ${CX} ${y0 + 12.5} Q ${CX + 15} ${y0 + 12} ${CX + 15} ${y0 + 0.5} Z`));
        S.push(`<path d="M ${CX - 10} ${y0 + 5} q 2 -2.4 4 0 q -2 2.4 -4 0 Z M ${CX + 6} ${y0 + 5} q 2 -2.4 4 0 q -2 2.4 -4 0 Z M ${CX - 2} ${y0 + 9} q 2 -2 4 0 q -2 2 -4 0 Z" fill="${m[3]}" opacity="0.8"/>`);
        S.push(HL(`M ${CX - 14} ${y0 + 1.4} L ${CX + 14} ${y0 + 1.4}`, 0.85));
        S.push(gem(CX, y0 + 4.4, 2.8, 3));
        break;
      case 'ice':
        sides.forEach((s) => {
          const P = [[CX + s * 5, y0], [CX + s * 20, y0 - 9], [CX + s * 30, y0 - 17], [CX + s * 24, y0 - 4], [CX + s * 34, y0 + 1], [CX + s * 22, y0 + 5], [CX + s * 27, y0 + 13], [CX + s * 12, y0 + 8], [CX + s * 5, y0 + 8]];
          S.push(MP(poly(P)));
          const k = [CX + s * 11, y0 + 3.5];
          S.push(`<path d="${poly([P[0], P[2], k])}" fill="#fff" opacity="0.45"/><path d="${poly([k, P[4], P[6]])}" fill="${m[2]}" opacity="0.45"/>`);
          S.push(`<path d="${P.map((p) => `M ${r1(k[0])} ${r1(k[1])} L ${r1(p[0])} ${r1(p[1])}`).join(' ')}" stroke="#fff" stroke-width="0.4" opacity="0.7"/>`);
        });
        S.push(gem(CX, y0 + 4, 4, 4.6));
        break;
      case 'crescent':
        S.push(MP(`M ${CX - 31} ${y0 - 13} Q ${CX - 27} ${y0 + 9} ${CX} ${y0 + 9} Q ${CX + 27} ${y0 + 9} ${CX + 31} ${y0 - 13} Q ${CX + 19} ${y0 + 2.2} ${CX} ${y0 + 2.2} Q ${CX - 19} ${y0 + 2.2} ${CX - 31} ${y0 - 13} Z`));
        S.push(HL(`M ${CX - 29} ${y0 - 10.6} Q ${CX - 18} ${y0 + 3.6} ${CX} ${y0 + 3.4} Q ${CX + 18} ${y0 + 3.6} ${CX + 29} ${y0 - 10.6}`, 0.7));
        S.push(AP(`M ${CX - 20} ${y0 + 7} Q ${CX} ${y0 + 17} ${CX + 20} ${y0 + 7} Q ${CX} ${y0 + 12.6} ${CX - 20} ${y0 + 7} Z`));
        if (!c.mini) S.push(sparkle(CX - 31, y0 - 14, 2.6, c.glow), sparkle(CX + 31, y0 - 14, 2, c.glow));
        S.push(gem(CX, y0 + 5, 3.6, 4));
        break;
      case 'star': {
        const cy = y0 + 4;
        S.push(`<path d="${poly(starPts(CX, cy, 4, 14, 3.2, -Math.PI / 4))}" fill="url(#${c.ag})" stroke="#5f400d" stroke-width="0.5"/>`);
        const ang = [180, 270, 0, 90].map((a) => (a * Math.PI) / 180), lens = [33, 14, 33, 16];
        const inner = (a) => [CX + Math.cos(a) * 5.6, cy + Math.sin(a) * 5.6];
        ang.forEach((a, k) => {
          const O = [CX + Math.cos(a) * lens[k], cy + Math.sin(a) * lens[k]];
          S.push(`<path d="${poly([[CX, cy], inner(a - Math.PI / 4), O])}" fill="${m[0]}" stroke="${m[3]}" stroke-width="0.5" stroke-linejoin="round"/>`);
          S.push(`<path d="${poly([[CX, cy], O, inner(a + Math.PI / 4)])}" fill="${m[2]}" stroke="${m[3]}" stroke-width="0.5" stroke-linejoin="round"/>`);
        });
        S.push(gem(CX, cy, 3.8, 4));
        break;
      }
      case 'rift':
        sides.forEach((s, k) => {
          const o = k ? 1.5 : 0;
          S.push(MP(poly([[CX + s * 6, y0 - 1], [CX + s * 30, y0 - 8 - o], [CX + s * 27, y0 + 1.5], [CX + s * 6, y0 + 3]])));
          S.push(MP(poly([[CX + s * 6, y0 + 5], [CX + s * 24, y0 + 4.2], [CX + s * (31 + o), y0 + 12], [CX + s * 6, y0 + 9]])));
          S.push(`<path d="M ${CX + s * 6} ${y0 + 4} L ${CX + s * 27} ${y0 + 3}" stroke="${c.glow}" stroke-width="1.1"${c.fa}/>`);
          S.push(MP(poly([[CX + s * 34, y0 - 11], [CX + s * 38.5, y0 - 6.5], [CX + s * 33, y0 - 5]])));
        });
        S.push(MP(poly([[CX - 7, y0 - 2], [CX + 7, y0 - 2], [CX + 9, y0 + 4], [CX + 5, y0 + 11], [CX - 5, y0 + 11], [CX - 9, y0 + 4]])));
        S.push(gem(CX, y0 + 4.2, 3.6, 4));
        break;
      case 'demon':
        sides.forEach((s) => {
          S.push(MP(`M ${CX + s * 13} ${y0 + 2} C ${CX + s * 28} ${y0} ${CX + s * 32} ${y0 - 10} ${CX + s * 26} ${y0 - 23} C ${CX + s * 25} ${y0 - 12} ${CX + s * 20} ${y0 - 5} ${CX + s * 9} ${y0 - 2} Z`));
          S.push(`<path d="M ${CX + s * 18} ${y0 + 0.4} l ${s * 2} -3.4 M ${CX + s * 23} ${y0 - 2.6} l ${s * 2.6} -2.4 M ${CX + s * 26} ${y0 - 8} l ${s * 2.6} -1" stroke="#f5d37a" stroke-width="0.5" opacity="0.8"/>`);
        });
        S.push(MP(poly([[CX - 22, y0 + 1], [CX + 22, y0 + 1], [CX + 18, y0 + 8], [CX - 18, y0 + 8]])));
        S.push(`<path d="M ${CX - 20} ${y0 + 2.6} L ${CX + 20} ${y0 + 2.6}" stroke="${c.glow}" stroke-width="0.7"${c.fa}/>`);
        S.push(MP(poly([[CX, y0 - 8], [CX + 8, y0 - 1], [CX + 7, y0 + 9], [CX, y0 + 13], [CX - 7, y0 + 9], [CX - 8, y0 - 1]])));
        S.push(gem(CX, y0 + 3.4, 3.6, 4.2));
        break;
      case 'sun': {
        const cy = y0 + 3.5;
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2 - Math.PI / 2, len = k % 2 ? 15 : 25, h = k % 2 ? 0.14 : 0.1;
          S.push(AP(poly([[CX + Math.cos(a - h) * 7, cy + Math.sin(a - h) * 7], [CX + Math.cos(a) * len, cy + Math.sin(a) * len], [CX + Math.cos(a + h) * 7, cy + Math.sin(a + h) * 7]])));
        }
        S.push(bar(24, 7));
        S.push(MP(poly(starPts(CX, cy, 12, 9.4, 7.2))));
        S.push(`<path d="${poly(starPts(CX, cy, 12, 7.6, 6.2, -Math.PI / 2 + Math.PI / 12))}" fill="none" stroke="${m[0]}" stroke-width="0.5"/>`);
        S.push(gem(CX, cy, 4.2, 4.4));
        break;
      }
      case 'dragon':
        sides.forEach((s) => {
          const root = [CX + s * 7, y0 + 2], tips = [[CX + s * 38, y0 - 24], [CX + s * 45, y0 - 6], [CX + s * 37, y0 + 10]];
          S.push(`<path d="M ${root[0]} ${root[1]} L ${tips[0][0]} ${tips[0][1]} Q ${CX + s * 33} ${y0 - 11} ${tips[1][0]} ${tips[1][1]} Q ${CX + s * 33} ${y0 + 1} ${tips[2][0]} ${tips[2][1]} Q ${CX + s * 22} ${y0 + 4} ${root[0]} ${y0 + 7} Z" fill="url(#${c.id('mem')})" stroke="${m[3]}" stroke-width="0.7" stroke-linejoin="round"/>`);
          tips.forEach((tp, k) => S.push(knuckle(`M ${root[0]} ${root[1]} Q ${CX + s * (16 + k * 4)} ${y0 - 10 + k * 7} ${tp[0]} ${tp[1]}`, 1.8 - k * 0.3)));
          S.push(`<path d="M ${tips[0][0]} ${tips[0][1]} q ${s * 3.4} -0.6 ${s * 2.4} -5" stroke="${m[0]}" stroke-width="1" fill="none" stroke-linecap="round"/>`);
        });
        c.defs.push(lg(c.id('mem'), [[0, mix(m[1], '#000000', 0.15)], [1, mix(m[2], '#000000', 0.35)]]));
        S.push(MP(poly([[CX - 9, y0 + 1], [CX - 13, y0 - 10], [CX - 5, y0 - 3], [CX, y0 - 7], [CX + 5, y0 - 3], [CX + 13, y0 - 10], [CX + 9, y0 + 1], [CX + 6, y0 + 9], [CX, y0 + 13], [CX - 6, y0 + 9]])));
        S.push(`<path d="M ${CX - 5} ${y0 + 6} l 5 2.4 l 5 -2.4 M ${CX - 4} ${y0 + 9} l 4 2 l 4 -2" stroke="${m[0]}" stroke-width="0.5" fill="none" opacity="0.7"/>`);
        S.push(gem(CX, y0 + 2.2, 3.4, 3.8));
        break;
      case 'wing': case 'aether': {
        const fg = c.id('fea');
        c.defs.push(lg(fg, [[0, '#ffffff'], [0.55, mix('#ffffff', c.glow, 0.3)], [1, mix(m[1], '#ffffff', 0.25)]]));
        const feather = (root, a, len, w, s, fill, edge) => {
          const dx = s * Math.cos(a), dy = -Math.sin(a); const tip = [root[0] + dx * len, root[1] + dy * len];
          const nx = -dy, ny = dx; const mx = root[0] + dx * len * 0.55, my = root[1] + dy * len * 0.55;
          const c1 = [mx + nx * w * s, my + ny * w * s], c2 = [mx - nx * w * 0.55 * s, my - ny * w * 0.55 * s];
          return `<path d="M ${r1(root[0])} ${r1(root[1])} Q ${r1(c1[0])} ${r1(c1[1])} ${r1(tip[0])} ${r1(tip[1])} Q ${r1(c2[0])} ${r1(c2[1])} ${r1(root[0])} ${r1(root[1])} Z" fill="${fill}" stroke="${edge}" stroke-width="0.5" stroke-linejoin="round"/><path d="M ${r1(root[0])} ${r1(root[1])} L ${r1(tip[0] - dx * 2)} ${r1(tip[1] - dy * 2)}" stroke="${m[2]}" stroke-width="0.4" opacity="0.6"/>`;
        };
        const lens = [30, 36, 41, 39, 33, 25];
        sides.forEach((s) => {
          const root = [CX + s * 6, y0 + 3];
          for (let k = 5; k >= 0; k--) S.push(feather(root, ((-10 + k * 12.5) * Math.PI) / 180, lens[k], 5, s, `url(#${fg})`, m[2]));
          for (let k = 3; k >= 0; k--) S.push(feather([CX + s * 5, y0 + 2], ((-2 + k * 13) * Math.PI) / 180, 17 - k, 4.2, s, m[0], m[1]));
        });
        S.push(MP(poly([[CX, y0 - 9], [CX + 7, y0 + 1], [CX + 4, y0 + 10], [CX, y0 + 13], [CX - 4, y0 + 10], [CX - 7, y0 + 1]])));
        S.push(HL(line([[CX - 6, y0 + 1], [CX, y0 - 8], [CX + 6, y0 + 1]]), 0.8));
        S.push(gem(CX, y0 + 2.6, 3.4, 4));
        break;
      }
      case 'abyss':
        sides.forEach((s) => {
          S.push(MP(poly([[CX + s * 6, y0 + 1], [CX + s * 16, y0 - 4], [CX + s * 23, y0 - 18], [CX + s * 22, y0 - 5], [CX + s * 35, y0 - 3], [CX + s * 26, y0 + 3], [CX + s * 37, y0 + 13], [CX + s * 22, y0 + 7.5], [CX + s * 14, y0 + 14], [CX + s * 12, y0 + 8], [CX + s * 6, y0 + 8]])));
          S.push(`<path d="M ${CX + s * 7} ${y0 + 4} L ${CX + s * 18} ${y0 + 2} L ${CX + s * 23} ${y0 - 9} M ${CX + s * 18} ${y0 + 2} L ${CX + s * 31} ${y0 + 0.5} M ${CX + s * 16} ${y0 + 5} L ${CX + s * 31} ${y0 + 10}" stroke="${c.glow}" stroke-width="0.8" fill="none"${c.fa}/>`);
        });
        S.push(MP(poly([[CX - 7, y0 - 3], [CX + 7, y0 - 3], [CX + 9, y0 + 4], [CX, y0 + 14], [CX - 9, y0 + 4]])));
        S.push(gem(CX, y0 + 3.4, 3.6, 4.2));
        break;
      case 'clock': {
        S.push(bar(27, 7));
        const cy = y0 + 4;
        S.push(MP(poly(starPts(CX, cy, 18, 12.6, 11.2))));
        S.push(`<path d="${poly(octPts(CX, cy, 9.6, 9.6))}" fill="#16302c" stroke="${m[0]}" stroke-width="0.6"/>`);
        let ticks = '';
        for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; const r0 = k % 3 ? 7.6 : 6.4; ticks += `M ${r1(CX + Math.cos(a) * r0)} ${r1(cy + Math.sin(a) * r0)} L ${r1(CX + Math.cos(a) * 9)} ${r1(cy + Math.sin(a) * 9)} `; }
        S.push(`<path d="${ticks}" stroke="${m[0]}" stroke-width="0.6"/>`);
        S.push(`<path d="M ${CX} ${cy} L ${CX + 4.8} ${cy - 3.6} M ${CX} ${cy} L ${CX - 1.6} ${cy - 7}" stroke="${c.glow}" stroke-width="0.8" stroke-linecap="round"${c.fa}/>`);
        S.push(gem(CX, cy, 2, 2.2, false));
        break;
      }
    }
    return S.join('');
  }

  /* ───────────── 손잡이 ───────────── */
  function gripSvg(c, top, bot, gw, gd) {
    const col = gd.c; const gid = c.id('grip'), cid = c.id('gclip');
    c.defs.push(lg(gid, [[0, col[2]], [0.32, col[0]], [0.62, col[1]], [1, col[2]]], 0, 0, 1, 0));
    const mid = (top + bot) / 2;
    const dp = `M ${CX - gw} ${top} Q ${CX - gw - 1.2} ${mid} ${CX - gw} ${bot} L ${CX + gw} ${bot} Q ${CX + gw + 1.2} ${mid} ${CX + gw} ${top} Z`;
    c.defs.push(`<clipPath id="${cid}"><path d="${dp}"/></clipPath>`);
    let s = `<path d="${dp}" fill="${gd.type === 'ito' ? gd.base : `url(#${gid})`}" stroke="${mix(col[2], '#000000', 0.4)}" stroke-width="0.7"/>`;
    let inner = '';
    if (gd.type === 'leather') {
      for (let y = top - 6; y < bot + 2; y += 4.2) {
        inner += `<path d="M ${CX - gw - 2} ${r1(y)} L ${CX + gw + 2} ${r1(y + 4.6)}" stroke="${col[2]}" stroke-width="1.5" opacity="0.85"/>`;
        inner += `<path d="M ${CX - gw - 2} ${r1(y + 1.5)} L ${CX + gw + 2} ${r1(y + 6.1)}" stroke="${col[0]}" stroke-width="0.6" opacity="0.6"/>`;
      }
    } else if (gd.type === 'wire') {
      for (let y = top + 1; y < bot; y += 2.3) inner += `<path d="M ${CX - gw - 1} ${r1(y + 1)} L ${CX + gw + 1} ${r1(y)}" stroke="${gd.wire}" stroke-width="0.95"/><path d="M ${CX - gw * 0.4} ${r1(y + 0.5)} L ${CX + gw * 0.2} ${r1(y + 0.35)}" stroke="#fff" stroke-width="0.4" opacity="0.7"/>`;
      inner += `<rect x="${CX - gw - 1}" y="${top}" width="${gw * 2 + 2}" height="${bot - top}" fill="url(#${gid})" opacity="0.35"/>`;
    } else if (gd.type === 'ito') {
      for (let y = top - 6; y < bot + 6; y += 6.4) {
        inner += `<path d="M ${CX - gw - 1} ${r1(y)} L ${CX + gw + 1} ${r1(y + 6.4)} M ${CX + gw + 1} ${r1(y)} L ${CX - gw - 1} ${r1(y + 6.4)}" stroke="${col[1]}" stroke-width="2.8"/>`;
        inner += `<path d="M ${CX - gw - 1} ${r1(y - 0.8)} L ${CX + gw + 1} ${r1(y + 5.6)}" stroke="${col[0]}" stroke-width="0.6" opacity="0.8"/>`;
      }
      inner += `<rect x="${CX - gw - 1}" y="${top}" width="${gw * 2 + 2}" height="${bot - top}" fill="url(#${gid})" opacity="0.3"/>`;
    } else {
      for (let k = -2; k <= 2; k++) inner += `<path d="M ${CX + k * 2.3} ${top} Q ${CX + k * 2.3 + 1} ${mid} ${CX + k * 2.3} ${bot}" stroke="${col[2]}" stroke-width="0.45" fill="none" opacity="0.7"/>`;
    }
    s += `<g clip-path="url(#${cid})">${inner}</g>`;
    if (gd.type !== 'wood') {
      s += `<rect x="${CX - gw - 0.8}" y="${top}" width="${gw * 2 + 1.6}" height="2.6" rx="0.8" fill="url(#${c.mh})" stroke="${c.m[3]}" stroke-width="0.4"/>`;
      s += `<rect x="${CX - gw - 0.8}" y="${bot - 2.6}" width="${gw * 2 + 1.6}" height="2.6" rx="0.8" fill="url(#${c.mh})" stroke="${c.m[3]}" stroke-width="0.4"/>`;
    }
    return s;
  }

  /* ───────────── 폼멜 ───────────── */
  function pommelSvg(c, type, pb) {
    const m = c.pmc, MP = (p) => `<path d="${p}" fill="url(#${c.pg})" stroke="${m[3]}" stroke-width="0.7" stroke-linejoin="round"/>`;
    const HL = (p) => `<path d="${p}" fill="none" stroke="${m[0]}" stroke-width="0.6" opacity="0.8"/>`;
    switch (type) {
      case 'cap': return MP(`M ${CX - 6.5} ${pb} L ${CX + 6.5} ${pb} Q ${CX + 8.2} ${pb + 7} ${CX} ${pb + 9} Q ${CX - 8.2} ${pb + 7} ${CX - 6.5} ${pb} Z`) + HL(`M ${CX - 5} ${pb + 2} Q ${CX - 5.4} ${pb + 5.6} ${CX - 1} ${pb + 7}`);
      case 'wheel': {
        const o = octPts(CX, pb + 8, 8.6, 8), i = octPts(CX, pb + 8, 5, 4.6);
        return `<rect x="${CX - 3}" y="${pb - 1}" width="6" height="3" fill="url(#${c.pg})"/>` + MP(poly(o)) + `<path d="${poly(i)}" fill="${m[2]}" opacity="0.55" stroke="${m[3]}" stroke-width="0.4"/>` +
          `<path d="${o.map((p, k) => `M ${r1(p[0])} ${r1(p[1])} L ${r1(i[k][0])} ${r1(i[k][1])}`).join(' ')}" stroke="${m[0]}" stroke-width="0.4" opacity="0.6"/>` + rhomb(CX, pb + 17, 2, 1.6, 0, m[1]);
      }
      case 'pear': return MP(`M ${CX - 4} ${pb} Q ${CX - 9.5} ${pb + 6} ${CX - 6} ${pb + 11.5} Q ${CX} ${pb + 16} ${CX + 6} ${pb + 11.5} Q ${CX + 9.5} ${pb + 6} ${CX + 4} ${pb} Z`) + HL(`M ${CX - 4} ${pb + 2.6} Q ${CX - 6.6} ${pb + 7} ${CX - 3.6} ${pb + 11}`) + MP(poly([[CX - 1.6, pb + 14.4], [CX + 1.6, pb + 14.4], [CX, pb + 19]]));
      case 'gem': return MP(poly([[CX, pb - 1], [CX + 8, pb + 8], [CX, pb + 19], [CX - 8, pb + 8]])) + HL(line([[CX - 7, pb + 8], [CX, pb], [CX + 7, pb + 8]])) + gemSvg(c, CX, pb + 8.6, 4, 4.8, c.gem || GEM.diamond, false);
      case 'spike': return `<rect x="${CX - 4.6}" y="${pb - 0.5}" width="9.2" height="3" rx="1" fill="url(#${c.pg})" stroke="${m[3]}" stroke-width="0.5"/>` + MP(poly([[CX - 6.4, pb + 2.4], [CX + 6.4, pb + 2.4], [CX + 3.4, pb + 8.4], [CX, pb + 20], [CX - 3.4, pb + 8.4]])) + `<path d="${poly([[CX - 6.4, pb + 2.4], [CX, pb + 2.4], [CX, pb + 20], [CX - 3.4, pb + 8.4]])}" fill="${m[0]}" opacity="0.35"/>` + (c.gem ? gemSvg(c, CX, pb + 6, 1.8, 2, c.gem, false) : '');
      case 'kashira': return MP(`M ${CX - 6.6} ${pb} L ${CX + 6.6} ${pb} L ${CX + 6.2} ${pb + 4} Q ${CX} ${pb + 7.4} ${CX - 6.2} ${pb + 4} Z`) + `<path d="M ${CX - 5} ${pb + 2.6} Q ${CX} ${pb + 4.6} ${CX + 5} ${pb + 2.6}" stroke="#f5d37a" stroke-width="0.6" fill="none"/>`;
      case 'crystal': {
        const g = c.gem || GEM.aqua, P = [[CX - 5, pb], [CX + 5, pb], [CX + 3.6, pb + 7], [CX, pb + 18], [CX - 3.6, pb + 7]];
        return `<path d="${poly(P)}" fill="${g[1]}" stroke="${g[2]}" stroke-width="0.6"/><path d="${poly([P[0], [CX, pb], [CX, pb + 18], P[4]])}" fill="${g[0]}" opacity="0.7"/><path d="M ${CX - 3.6} ${pb + 7} L ${CX + 3.6} ${pb + 7}" stroke="#fff" stroke-width="0.4" opacity="0.8"/>`;
      }
      case 'crown': return MP(poly([[CX - 7, pb], [CX + 7, pb], [CX + 7, pb + 3], [CX + 8.8, pb + 10], [CX + 4, pb + 7], [CX, pb + 15], [CX - 4, pb + 7], [CX - 8.8, pb + 10], [CX - 7, pb + 3]])) + HL(`M ${CX - 6} ${pb + 1.4} L ${CX + 6} ${pb + 1.4}`) + gemSvg(c, CX, pb + 6.2, 2.2, 2.6, c.gem || GEM.diamond, false);
      case 'sunp': return MP(poly(starPts(CX, pb + 8, 8, 9, 5.4))) + gemSvg(c, CX, pb + 8, 3.4, 3.6, c.gem || GEM.sun, false);
      default: return '';
    }
  }

  /* ───────────── 메인 렌더러 ───────────── */
  function renderSwordSvg(level, mini = false) {
    const lv = clamp(Math.round(Number(level) || 0), 0, 30);
    const d = SWORDS[lv];
    const P = nid('s' + lv);
    const id = (s) => P + s;
    const R = rng(lv * 97 + 13);
    const D = mini ? 0.45 : 1;
    const has = (k) => d.fx.includes(k);
    const glow = d.glow || '#ffffff';
    const defs = [], back = [], ghost = [], blade = [], hilt = [], front = [];
    const g = bladeGeometry(d);
    const bc = BL[d.b];
    const fa = mini ? '' : ` filter="url(#${id('glow')})"`;
    const m = MT[d.gm];
    const c = { d, g, m, id, defs, mini, k: 0, glow, fa, gem: d.gem ? GEM[d.gem] : null, mg: id('mg'), mh: id('mh'), ag: id('ag'), pg: id('pg'), pmc: MT[d.pm || d.gm], y0: g.base };
    const guardT = { tsuba: 9.5, cup: 8, bar: d.heavy ? 9 : 7, block: 8 }[d.guard] || 8;
    const gripTop = g.base + guardT;
    const gripLen = d.gripLen || (g.great ? 52 : 38);
    const gripBot = gripTop + gripLen; c.gripBot = gripBot;
    const gw = g.great ? 6.4 : d.blade === 'rapier' ? 4.8 : d.guard === 'tsuba' ? 5.8 : 5.4;

    defs.push(lg(c.mg, [[0, m[0]], [0.45, m[1]], [1, m[2]]]));
    defs.push(lg(c.mh, [[0, m[2]], [0.4, m[0]], [1, m[2]]], 0, 0, 1, 0));
    defs.push(lg(c.ag, [[0, '#fff6cf'], [0.45, '#f4cb5a'], [1, '#a8781f']]));
    defs.push(lg(c.pg, [[0, c.pmc[0]], [0.5, c.pmc[1]], [1, c.pmc[2]]]));
    if (!mini) defs.push(`<filter id="${id('glow')}" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);

    const outlineD = `M ${pj(g.L)} L ${pj(g.R.slice().reverse())} Z`;
    const leftD = `M ${pj(g.L)} L ${pj(g.C.slice().reverse())} Z`;
    const rightD = `M ${pj(g.C)} L ${pj(g.R.slice().reverse())} Z`;
    const tipP = [(g.L[g.n][0] + g.R[g.n][0]) / 2, g.L[g.n][1]];
    const midY = (g.tip + g.base) / 2;
    defs.push(`<clipPath id="${id('clip')}"><path d="${outlineD}"/></clipPath>`);

    /* 뒤쪽 이펙트 */
    if (has('aura') || has('auraSoft')) {
      const op = has('auraSoft') ? 0.32 : lv >= 26 ? 0.7 : lv >= 20 ? 0.58 : 0.45;
      defs.push(rg(id('aura'), [[0, glow, op], [0.55, glow, op * 0.35], [1, glow, 0]]));
      back.push(`<ellipse cx="${CX}" cy="${r1(midY + 6)}" rx="${lv >= 26 ? 78 : 62}" ry="${lv >= 26 ? 112 : 100}" fill="url(#${id('aura')})"/>`);
    }
    const haloY = g.tip + g.len * 0.3;
    if (has('rays')) {
      defs.push(rg(id('ray'), [[0, glow, 0.85], [0.6, glow, 0.25], [1, glow, 0]], CX, haloY, 110, ' gradientUnits="userSpaceOnUse"'));
      let rs = '';
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2 + (R() - 0.5) * 0.2, len = 96 + R() * 18, h = 0.03 + R() * 0.02;
        rs += `M ${CX} ${r1(haloY)} L ${r1(CX + Math.cos(a - h) * len)} ${r1(haloY + Math.sin(a - h) * len)} L ${r1(CX + Math.cos(a + h) * len)} ${r1(haloY + Math.sin(a + h) * len)} Z `;
      }
      back.push(`<path d="${rs}" fill="url(#${id('ray')})" opacity="${mini ? 0.35 : 0.5}"/>`);
    }
    if (has('halo')) {
      const r = 40, hc = lv === 29 ? glow : '#ffe39a';
      defs.push(rg(id('halo'), [[0, hc, 0], [0.7, hc, 0], [0.82, hc, 0.5], [0.9, hc, 0.12], [1, hc, 0]]));
      let ticks = '';
      for (let k = 0; k < 36; k++) { const a = (k / 36) * Math.PI * 2, r0 = r + 3, r2 = r + (k % 3 ? 6 : 11); ticks += `M ${r1(CX + Math.cos(a) * r0)} ${r1(haloY + Math.sin(a) * r0)} L ${r1(CX + Math.cos(a) * r2)} ${r1(haloY + Math.sin(a) * r2)} `; }
      back.push(`<circle cx="${CX}" cy="${r1(haloY)}" r="${r + 16}" fill="url(#${id('halo')})"/>`);
      back.push(`<circle cx="${CX}" cy="${r1(haloY)}" r="${r}" fill="none" stroke="url(#${c.ag})" stroke-width="1.8"/><circle cx="${CX}" cy="${r1(haloY)}" r="${r - 4}" fill="none" stroke="${hc}" stroke-width="0.5" opacity="0.8"/>`);
      if (!mini) back.push(`<path d="${ticks}" stroke="${hc}" stroke-width="0.6" opacity="0.75"/>`);
      [[-90, 4, 6.5], [0, 2.8, 4.4], [180, 2.8, 4.4], [-45, 1.6, 2.6], [-135, 1.6, 2.6], [45, 1.6, 2.6], [135, 1.6, 2.6]].forEach(([deg, w, h]) => {
        const a = (deg * Math.PI) / 180; const x = CX + Math.cos(a) * r, y = haloY + Math.sin(a) * r;
        back.push(rhomb(x, y, w, h, deg + 90, '#fff6cf'), rhomb(x, y, w * 0.45, h * 0.45, deg + 90, hc));
      });
    }
    if (has('clockring')) {
      const r = 38;
      back.push(`<path d="${poly(starPts(CX, haloY, 48, r + 4, r + 1.6))}" fill="none" stroke="url(#${c.ag})" stroke-width="1.4" opacity="0.85"/>`);
      back.push(`<circle cx="${CX}" cy="${r1(haloY)}" r="${r - 2}" fill="${glow}" fill-opacity="0.07" stroke="${glow}" stroke-width="0.6" opacity="0.9"/>`);
      let tk = '';
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2 - Math.PI / 2; const big = k % 3 === 0; tk += `<path d="${poly([[CX + Math.cos(a - 0.03) * (r - 4), haloY + Math.sin(a - 0.03) * (r - 4)], [CX + Math.cos(a) * (r - (big ? 13 : 9)), haloY + Math.sin(a) * (r - (big ? 13 : 9))], [CX + Math.cos(a + 0.03) * (r - 4), haloY + Math.sin(a + 0.03) * (r - 4)]])}" fill="url(#${c.ag})"/>`; }
      back.push(tk);
      back.push(`<path d="M ${CX} ${r1(haloY)} L ${r1(CX + 22)} ${r1(haloY - 18)} M ${CX} ${r1(haloY)} L ${r1(CX - 12)} ${r1(haloY + 24)}" stroke="#f4cb5a" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>`);
    }
    if (has('constellation')) {
      const S = lv === 26 ? [[52, 98, 3.6], [66, 70, 2.4], [58, 44, 3], [80, 24, 2], [128, 18, 3.4], [150, 44, 2.2], [142, 74, 3.8], [158, 102, 2], [148, 128, 2.8]] : [[48, 60, 2.6], [64, 34, 2], [140, 30, 2.4], [160, 64, 2]];
      const lines = S.slice(1).map((p, i) => `M ${S[i][0]} ${S[i][1]} L ${p[0]} ${p[1]}`).join(' ');
      back.push(`<path d="${lines}" stroke="${glow}" stroke-width="0.55" opacity="0.6" fill="none"/>`);
      S.forEach(([x, y, s]) => front.push(sparkle(x, y, s, '#ffffff', 0.95), rhomb(x, y, s * 0.35, s * 0.35, 45, glow)));
    }
    /* 다중 블레이드 (검영) */
    const ghosts = has('ghost3') ? [-26, 26, -13, 13] : has('ghost2') ? [-17, 17] : [];
    if (ghosts.length) {
      defs.push(lg(id('gh'), [[0, '#ffffff', 0.9], [0.5, glow, 0.55], [1, glow, 0.05]]));
      ghosts.forEach((a) => ghost.push(`<g transform="rotate(${a} ${CX} ${g.base})" opacity="${Math.abs(a) > 20 ? 0.32 : 0.5}"><path d="${outlineD}" fill="url(#${id('gh')})" stroke="${glow}" stroke-width="0.6"/><path d="${line(g.C)}" stroke="#fff" stroke-width="0.5" opacity="0.8"/></g>`));
    }

    /* 칼날 */
    let lStops, rStops;
    if (d.fill) {
      const F = FILL[d.fill];
      lStops = F.map((col, i) => [r1(i / (F.length - 1)), col]);
      rStops = F.map((col, i) => [r1(i / (F.length - 1)), mix(col, d.fill === 'aether' ? '#8f9fe0' : '#000000', d.fill === 'aether' ? 0.22 : 0.35)]);
    } else {
      lStops = [[0, mix(bc[0], bc[1], 0.15)], [0.45, bc[0]], [1, bc[1]]];
      rStops = [[0, bc[1]], [0.55, bc[2]], [1, mix(bc[2], bc[3], 0.35)]];
    }
    defs.push(lg(id('bl'), lStops), lg(id('br'), rStops));
    blade.push(`<path d="${outlineD}" fill="${bc[3]}" stroke="${bc[3]}" stroke-width="1.6" stroke-linejoin="round"/>`);
    blade.push(`<path d="${leftD}" fill="url(#${id('bl')})"/>`, `<path d="${rightD}" fill="url(#${id('br')})"/>`);

    const inClip = [];
    if (has('galaxy')) {
      defs.push(rg(id('neb'), [[0, '#c77dff', 0.7], [1, '#c77dff', 0]]), rg(id('neb2'), [[0, '#6fe3ff', 0.6], [1, '#6fe3ff', 0]]));
      inClip.push(`<ellipse cx="${CX - 4}" cy="70" rx="14" ry="30" fill="url(#${id('neb')})"/><ellipse cx="${CX + 5}" cy="112" rx="12" ry="24" fill="url(#${id('neb2')})"/>`);
      for (let k = 0; k < (mini ? 8 : 22); k++) inClip.push(sparkle(CX - 9 + R() * 18, g.tip + 10 + R() * (g.len - 14), 0.5 + R() * 1.3, '#ffffff', 0.6 + R() * 0.4));
    }
    if (d.fill === 'aether') {
      defs.push(lg(id('iri'), [[0, '#9ff0ff', 0], [0.3, '#9ff0ff', 0.5], [0.5, '#ffd6f4', 0.45], [0.7, '#d9c8ff', 0.5], [1, '#d9c8ff', 0]], 0, 0, 1, 1));
      inClip.push(`<rect x="80" y="${g.tip}" width="48" height="${g.len}" fill="url(#${id('iri')})"/>`);
    }
    if (has('grain')) {
      for (let k = -3; k <= 3; k++) {
        const x0 = CX + k * 2.4; const pts = [];
        for (let y = g.base; y >= g.tip; y -= 6) pts.push([x0 + Math.sin(y * 0.09 + k) * 0.9 + (Math.abs(y - 90) < 10 && k === 1 ? 1.8 : 0), y]);
        inClip.push(`<path d="${line(pts)}" stroke="${bc[2]}" stroke-width="${k % 2 ? 0.45 : 0.7}" fill="none" opacity="0.55"/>`);
      }
      inClip.push(`<path d="M ${CX + 1.6} 84 Q ${CX + 4.6} 90 ${CX + 1.6} 96 Q ${CX + 3} 90 ${CX + 1.6} 84 Z" fill="${bc[2]}" opacity="0.45"/>`);
    }
    if (has('hamon')) {
      const H = [], Lh = [];
      for (let i = 0; i <= g.n; i++) { const t = g.T[i]; if (t > 0.93) break; const k = 0.42 + 0.1 * Math.sin(t * 38) + 0.05 * Math.sin(t * 91); H.push([g.L[i][0] + (g.C[i][0] - g.L[i][0]) * k, g.L[i][1]]); Lh.push(g.L[i]); }
      inClip.push(`<path d="M ${pj(Lh)} L ${pj(H.slice().reverse())} Z" fill="${glow}" opacity="0.32"/>`);
      inClip.push(`<path d="${line(H)}" stroke="#f1e4ff" stroke-width="0.6" fill="none" opacity="0.75"/>`);
    }
    if (has('fuller') || has('fuller2')) {
      const a = d.fullerStart || 0.04, b = d.fullerEnd || 0.62;
      const idx = []; for (let i = 0; i <= g.n; i++) if (g.T[i] >= a && g.T[i] <= b) idx.push(i);
      const inlay = has('inlay');
      defs.push(lg(id('fu'), inlay ? [[0, '#8a5f12'], [0.5, '#f4cb5a'], [1, '#fff6cf']] : [[0, mix(bc[2], bc[3], 0.3)], [0.55, bc[2]], [1, bc[1]]], 0, 0, 1, 0));
      const mk = (off, wk) => {
        const Lf = [], Rf = [];
        idx.forEach((i, j) => {
          const fw0 = Math.min(g.C[i][0] - g.L[i][0], g.R[i][0] - g.C[i][0]) * wk;
          const e = Math.min(1, (idx.length - 1 - j) / (idx.length * 0.12), j / 3 + 0.3);
          const fw = fw0 * Math.sqrt(Math.max(0, e)); const cx = g.C[i][0] + off * fw0;
          Lf.push([cx - fw, g.C[i][1]]); Rf.push([cx + fw, g.C[i][1]]);
        });
        return { d: `M ${pj(Lf)} L ${pj(Rf.slice().reverse())} Z`, hl: line(Rf) };
      };
      (has('fuller2') ? [mk(-1.25, 0.28), mk(1.25, 0.28)] : [mk(0, 0.32)]).forEach((f) => {
        blade.push(`<path d="${f.d}" fill="url(#${id('fu')})" stroke="${mix(bc[2], bc[3], 0.5)}" stroke-width="0.35"/>`);
        blade.push(`<path d="${f.hl}" stroke="${inlay ? '#fff6cf' : '#ffffff'}" stroke-width="0.4" fill="none" opacity="0.6"/>`);
      });
      c.ridgeFrom = idx.length ? idx[idx.length - 1] : 0;
    }
    if (inClip.length) blade.push(`<g clip-path="url(#${id('clip')})">${inClip.join('')}</g>`);

    if (g.type === 'crystal') {
      for (let i = 0; i < g.n; i++) {
        blade.push(`<path d="${poly([g.L[i], g.L[i + 1], g.C[i + 1]])}" fill="#ffffff" opacity="${i % 2 ? 0.35 : 0.12}"/>`);
        blade.push(`<path d="${poly([g.R[i], g.R[i + 1], g.C[i]])}" fill="${bc[3]}" opacity="${i % 2 ? 0.08 : 0.22}"/>`);
      }
      blade.push(`<path d="${g.L.map((p, i) => (i < g.n ? `M ${r1(p[0])} ${r1(p[1])} L ${r1(g.C[i + 1][0])} ${r1(g.C[i + 1][1])} ` : '')).join('')}" stroke="#ffffff" stroke-width="0.4" opacity="0.8"/>`);
    }
    if (g.type !== 'wood' && g.type !== 'crystal') {
      const bev = (E, k) => { const In = E.map((p, i) => [p[0] + (g.C[i][0] - p[0]) * k, p[1]]); return `M ${pj(E)} L ${pj(In.slice().reverse())} Z`; };
      blade.push(`<path d="${bev(g.L, 0.2)}" fill="#ffffff" opacity="${d.fill ? 0.22 : 0.32}"/>`);
      if (!g.single) blade.push(`<path d="${bev(g.R, 0.2)}" fill="#ffffff" opacity="0.1"/>`);
    }
    if (has('scratch')) for (let k = 0; k < 5; k++) { const i = 6 + Math.floor(R() * (g.n * 0.6)); const x = g.L[i][0] + (g.R[i][0] - g.L[i][0]) * (0.2 + R() * 0.6); blade.push(`<path d="M ${r1(x)} ${r1(g.L[i][1])} l ${r1(R() * 4 - 2)} ${r1(-2 - R() * 3)}" stroke="${bc[2]}" stroke-width="0.45" opacity="0.6"/>`); }
    if (has('sunmark')) { const i = Math.round(g.n * 0.11); blade.push(`<path d="${poly(starPts(g.C[i][0], g.C[i][1], 8, 5.4, 2.4))}" fill="url(#${c.ag})" stroke="#8a5f12" stroke-width="0.4"/>`, rhomb(g.C[i][0], g.C[i][1], 1.2, 1.6, 0, '#fff6cf')); }
    if (has('moon')) { const i = Math.round(g.n * 0.12); const [x, y] = g.C[i]; blade.push(`<path d="M ${x - 1} ${y - 4.4} A 4.4 4.4 0 1 0 ${x - 1} ${y + 4.4} A 3.4 3.4 0 1 1 ${x - 1} ${y - 4.4} Z" fill="#ffe2b0"${fa}/>`); }
    if (has('filigree')) { const i = Math.round(g.n * 0.06); const [x, y] = g.C[i]; blade.push(`<path d="M ${x} ${y + 3} C ${x - 5} ${y} ${x - 5} ${y - 6} ${x - 1.4} ${y - 6} C ${x + 1} ${y - 6} ${x + 0.6} ${y - 3.4} ${x - 1} ${y - 3.6} M ${x} ${y + 3} C ${x + 5} ${y} ${x + 5} ${y - 6} ${x + 1.4} ${y - 6} C ${x - 1} ${y - 6} ${x - 0.6} ${y - 3.4} ${x + 1} ${y - 3.6} M ${x} ${y - 7} L ${x} ${y - 13}" stroke="#8c9aae" stroke-width="0.55" fill="none"/>`); }
    if (has('vine')) blade.push(`<path d="M ${CX - 5} ${g.base - 2} C ${CX + 9} ${g.base - 14} ${CX - 9} ${g.base - 26} ${CX + 5} ${g.base - 40} C ${CX + 9} ${g.base - 46} ${CX + 2} ${g.base - 52} ${CX - 2} ${g.base - 56}" stroke="#3f7a2a" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M ${CX + 2} ${g.base - 13} q 5 -3 7 -8 q -6 1 -7 8 Z M ${CX - 3} ${g.base - 30} q -5 -2 -8 -7 q 6 0 8 7 Z M ${CX + 5} ${g.base - 44} q 5 -2 6 -7 q -5 1 -6 7 Z" fill="#6fbf4a" stroke="#2f5a1e" stroke-width="0.3"/>`);
    if (has('hole')) { const i = Math.round(g.n * 0.88); const [x, y] = g.C[i]; blade.push(`<path d="${poly([[x, y - 4.4], [x + 3, y], [x, y + 4.4], [x - 3, y]])}" fill="#05000a" stroke="${glow}" stroke-width="0.9"${fa}/>`); }
    if (has('void')) {
      const pts = []; const st = Math.round(g.n * 0.18), en = Math.round(g.n * 0.8);
      for (let i = st, k = 0; i <= en; i += Math.max(1, Math.round(g.n / 16)), k++) { const fw = Math.min(g.C[i][0] - g.L[i][0], g.R[i][0] - g.C[i][0]) * 0.55; pts.push([g.C[i][0] + (k % 2 ? 1 : -1) * fw * (0.4 + R() * 0.6), g.C[i][1]]); }
      const vp = line(pts);
      blade.push(`<path d="${vp}" stroke="${glow}" stroke-width="2.6" fill="none" opacity="0.7"${fa}/><path d="${vp}" stroke="#05000a" stroke-width="1.3" fill="none"/><path d="${vp}" stroke="#ffffff" stroke-width="0.35" fill="none" opacity="0.9"/>`);
    }
    const rf = c.ridgeFrom || 0;
    if (g.type !== 'wood') blade.push(`<path d="${line(g.C.slice(rf))}" stroke="${d.fill === 'galaxy' || d.b === 'abyss' || d.b === 'obsidian' ? glow : mix(bc[0], '#ffffff', 0.5)}" stroke-width="0.6" fill="none" opacity="0.85"/>`);
    if (has('runes')) {
      let rs = ''; const st = g.T.findIndex((t) => t >= 0.14), step = Math.max(1, Math.round(9 / (g.len / g.n)));
      for (let i = st, k = 0; g.T[i] <= 0.64 && i <= g.n; i += step, k++) {
        const fw = Math.min(g.C[i][0] - g.L[i][0], g.R[i][0] - g.C[i][0]); if (fw < 2.2) break;
        const sc = Math.min(3.2, fw * 0.9), x0 = g.C[i][0] - sc / 2, y0 = g.C[i][1] - sc * 0.8;
        RUNES[(k * 7 + lv) % RUNES.length].forEach((s) => { rs += `M ${r1(x0 + s[0] * sc)} ${r1(y0 + s[1] * sc)} L ${r1(x0 + s[2] * sc)} ${r1(y0 + s[3] * sc)} `; });
      }
      blade.push(`<path d="${rs}" stroke="${has('inlay') ? '#fff3c0' : glow}" stroke-width="0.7" stroke-linecap="round" fill="none"${fa}/>`);
    }
    if (!mini) {
      defs.push(lg(id('sheen'), [[0, '#ffffff', 0], [0.4, '#ffffff', 0], [0.48, '#ffffff', 0.6], [0.54, '#ffffff', 0], [0.7, '#ffffff', 0], [0.74, '#ffffff', 0.3], [0.78, '#ffffff', 0], [1, '#ffffff', 0]], 0, 0, 1, 0.55));
      blade.push(`<g clip-path="url(#${id('clip')})"><rect x="60" y="${g.tip}" width="90" height="${g.len}" fill="url(#${id('sheen')})" opacity="${g.type === 'wood' ? 0.25 : 0.55}"/></g>`);
    }
    blade.push(`<path d="${line(g.L)}" stroke="${bc[4]}" stroke-width="0.8" fill="none" opacity="0.9"/>`);
    blade.push(`<path d="${line(g.R)}" stroke="${g.single ? bc[3] : bc[4]}" stroke-width="${g.single ? 0.9 : 0.6}" fill="none" opacity="${g.single ? 0.8 : 0.35}"/>`);
    if (g.great) {
      const y = g.base - 0.11 * g.len, xw = g.w * 0.58;
      [-1, 1].forEach((s) => blade.push(`<path d="${poly([[CX + s * xw, y - 1.5], [CX + s * (g.w + 3.5), y - 0.5], [CX + s * (g.w + 4.2), y + 3], [CX + s * xw, y + 3.5]])}" fill="url(#${c.mg})" stroke="${m[3]}" stroke-width="0.6"/>`));
    }
    if (g.type !== 'wood' && g.type !== 'executioner') front.push(sparkle(tipP[0], tipP[1] + 1, mini ? 3 : 5.5, '#ffffff', 0.95));

    /* 손잡이 · 폼멜 · 코등이 */
    hilt.push(gripSvg(c, gripTop, gripBot, gw, GRIP[d.grip]));
    hilt.push(pommelSvg(c, d.pommel, gripBot));
    hilt.push(guardSvg(c));

    /* 앞쪽 이펙트 */
    if (has('crystals')) {
      defs.push(lg(id('cr'), [[0, '#ffffff'], [0.5, mix('#ffffff', glow, 0.6)], [1, glow]]));
      const CR = [[56, 70, 13, 5, -14], [154, 54, 10, 4, 12], [46, 124, 8, 3.4, 8], [162, 112, 14, 5.4, -10], [76, 22, 6, 2.6, -6], [136, 22, 7.5, 3, 10], [172, 82, 5, 2.2, 0]];
      CR.slice(0, mini ? 4 : 7).forEach(([x, y, h, w, rot]) => {
        const T = [x, y - h], Rt = [x + w, y - h * 0.15], B = [x, y + h * 0.75], Lf = [x - w, y - h * 0.15], M2 = [x + w * 0.15, y - h * 0.1];
        front.push(`<g transform="rotate(${rot} ${x} ${y})"${fa}><path d="${poly([T, Rt, B, Lf])}" fill="url(#${id('cr')})" stroke="#ffffff" stroke-width="0.5"/><path d="${poly([T, M2, Lf])}" fill="#ffffff" opacity="0.75"/><path d="${poly([M2, Rt, B])}" fill="${mix(glow, '#000000', 0.25)}" opacity="0.45"/><path d="M ${Lf[0]} ${Lf[1]} L ${M2[0]} ${M2[1]} L ${Rt[0]} ${Rt[1]} M ${M2[0]} ${M2[1]} L ${B[0]} ${B[1]}" stroke="#ffffff" stroke-width="0.35" opacity="0.8"/></g>`);
      });
    }
    if (has('flames')) {
      defs.push(lg(id('fl'), [[0, '#fff3c4'], [0.35, '#ffb347'], [0.75, glow], [1, mix(glow, '#000000', 0.3), 0]], 0, 1, 0, 0));
      for (let k = 0; k < Math.round(14 * D); k++) {
        const t = 0.08 + R() * 0.78, i = Math.round(t * g.n), s = k % 2 ? 1 : -1, E = s < 0 ? g.L[i] : g.R[i];
        const h = 7 + R() * 14, w = 1.8 + R() * 2.4, lean = s * (3 + R() * 5), x = E[0], y = E[1];
        front.push(`<path d="M ${r1(x - w)} ${r1(y)} Q ${r1(x - w * 1.2)} ${r1(y - h * 0.45)} ${r1(x + lean)} ${r1(y - h)} Q ${r1(x + w * 0.9)} ${r1(y - h * 0.5)} ${r1(x + w)} ${r1(y)} Q ${r1(x)} ${r1(y + w * 0.9)} ${r1(x - w)} ${r1(y)} Z" fill="url(#${id('fl')})" opacity="0.9"/>`);
      }
    }
    if (has('embers')) for (let k = 0; k < Math.round(16 * D); k++) front.push(rhomb(40 + R() * 128, 12 + R() * 150, 0.6 + R() * 1.4, 1 + R() * 1.8, R() * 90, [glow, '#ffd08a', '#ffffff'][k % 3], 0.5 + R() * 0.5));
    if (has('lightning')) {
      const bolt = (x0, y0, x1, y1, seg, jit) => { const p = [[x0, y0]]; for (let i = 1; i < seg; i++) { const t = i / seg; p.push([x0 + (x1 - x0) * t + (R() - 0.5) * jit, y0 + (y1 - y0) * t + (R() - 0.5) * jit * 0.4]); } p.push([x1, y1]); return line(p); };
      const B = [bolt(CX - 1, g.base - 12, CX + 1, g.tip + 18, 10, 10), bolt(CX - 4, 100, 48, 72, 6, 8), bolt(CX + 4, 58, 160, 38, 6, 8)];
      if (!mini) B.push(bolt(CX + 4, 120, 160, 132, 5, 7), bolt(CX - 3, 46, 56, 30, 5, 6));
      B.forEach((b) => front.push(`<path d="${b}" stroke="${glow}" stroke-width="2.6" fill="none" opacity="0.5" stroke-linejoin="round"${fa}/><path d="${b}" stroke="#ffffff" stroke-width="0.8" fill="none" stroke-linejoin="round"/>`));
    }
    if (has('frost')) {
      for (let k = 0; k < Math.round(7 * D); k++) {
        const x = 44 + R() * 120, y = 16 + R() * 130, r = 2 + R() * 4.6; let p = '';
        for (let a = 0; a < 3; a++) { const t = (a * Math.PI) / 3; const dx = Math.cos(t) * r, dy = Math.sin(t) * r; p += `M ${r1(x - dx)} ${r1(y - dy)} L ${r1(x + dx)} ${r1(y + dy)} `; }
        front.push(`<path d="${p}" stroke="#effcff" stroke-width="${r > 4 ? 0.7 : 0.5}" stroke-linecap="round"${fa}/>`);
      }
      [[70, 40, 1.2, 5, 20], [146, 92, 1.4, 6, -25], [60, 118, 1, 4, 35], [152, 30, 0.9, 3.6, -10]].forEach(([x, y, w, h, r]) => front.push(rhomb(x, y, w, h, r, '#dff8ff', 0.85)));
    }
    if (has('wind')) front.push(`<g fill="none" stroke="${glow}" stroke-linecap="round"><path d="M 40 128 C 62 92 146 104 168 58" stroke-width="1.4" opacity="0.6"/><path d="M 52 92 C 72 64 132 74 158 34" stroke-width="0.9" opacity="0.5"/><path d="M 156 136 C 132 118 70 132 50 98" stroke-width="0.7" opacity="0.45"/><path d="M 168 58 q 8 -10 0 -16 q -6 -4 -9 3" stroke-width="1" opacity="0.6"/></g>`);
    if (has('feathers')) for (let k = 0; k < Math.round(6 * D); k++) { const x = 46 + R() * 116, y = 18 + R() * 110, l = 7 + R() * 7, rot = R() * 360; front.push(`<g transform="rotate(${r1(rot)} ${r1(x)} ${r1(y)})" opacity="0.9"><path d="M ${r1(x)} ${r1(y - l / 2)} Q ${r1(x + l * 0.3)} ${r1(y)} ${r1(x)} ${r1(y + l / 2)} Q ${r1(x - l * 0.2)} ${r1(y)} ${r1(x)} ${r1(y - l / 2)} Z" fill="#ffffff" stroke="#c9d6e6" stroke-width="0.3"/><path d="M ${r1(x)} ${r1(y - l / 2)} L ${r1(x)} ${r1(y + l / 2 + 1.4)}" stroke="#9fb0c6" stroke-width="0.3"/></g>`); }
    if (has('motes')) for (let k = 0; k < Math.round(6 * D); k++) { const x = 46 + R() * 116, y = 20 + R() * 120, l = 3 + R() * 3.4; front.push(`<path d="M ${r1(x)} ${r1(y)} q ${r1(l * 0.6)} ${r1(-l * 0.6)} ${r1(l * 1.4)} 0 q ${r1(-l * 0.6)} ${r1(l * 0.6)} ${r1(-l * 1.4)} 0 Z" fill="#a6e07a" opacity="${r1(0.5 + R() * 0.5)}" transform="rotate(${r1(R() * 360)} ${r1(x)} ${r1(y)})"/>`); }
    if (has('shards')) for (let k = 0; k < Math.round(6 * D); k++) { const x = 44 + R() * 120, y = 20 + R() * 120, s = 2 + R() * 4; if (Math.abs(x - CX) < 16) continue; front.push(`<path d="${poly([[x, y - s], [x + s * 0.8, y + s * 0.4], [x - s * 0.5, y + s * 0.7]])}" fill="#0a0612" stroke="${glow}" stroke-width="0.6" transform="rotate(${r1(R() * 360)} ${r1(x)} ${r1(y)})"${fa}/>`); }
    if (has('wings6')) {
      const wfg = id('w6');
      defs.push(lg(wfg, [[0, '#ffffff'], [0.6, '#fff3c4'], [1, '#d8aa4c']]));
      [-1, 1].forEach((s) => {
        [[-28, 56, 78], [0, 64, 96], [26, 48, 114]].forEach(([deg, len, yOff]) => {
          const a = (deg * Math.PI) / 180;
          const x1 = CX + s * Math.cos(a) * len, y1 = yOff + Math.sin(a) * len;
          const xm = CX + s * Math.cos(a - 0.22) * (len * 0.58), ym = yOff + Math.sin(a - 0.22) * (len * 0.58);
          const xm2 = CX + s * Math.cos(a + 0.18) * (len * 0.62), ym2 = yOff + Math.sin(a + 0.18) * (len * 0.62);
          back.push(`<path d="M ${CX + s * 8} ${yOff} Q ${r1(xm)} ${r1(ym)} ${r1(x1)} ${r1(y1)} Q ${r1(xm2)} ${r1(ym2)} ${CX + s * 8} ${yOff + 8} Z" fill="url(#${wfg})" stroke="#b88928" stroke-width="0.55" opacity="0.88"/>`);
        });
      });
    }
    if (has('orbit') || has('orbit2')) {
      const cy = r1(midY + 4);
      back.push(`<ellipse cx="${CX}" cy="${cy}" rx="56" ry="16" fill="none" stroke="${glow}" stroke-width="0.9" stroke-dasharray="4 3" opacity="0.7" transform="rotate(-18 ${CX} ${cy})"/>`);
      if (has('orbit2')) {
        back.push(`<ellipse cx="${CX}" cy="${cy}" rx="64" ry="18" fill="none" stroke="#fff6cf" stroke-width="0.85" opacity="0.75" transform="rotate(22 ${CX} ${cy})"/>`);
      }
    }
    if (has('sats')) {
      const satPts = [[104, 24], [164, 78], [104, 134], [44, 78]];
      const satInner = satPts.map(([sx, sy]) => (
        `${rhomb(sx, sy, 4.2, 7.2, 0, '#fff6cf', 0.95)}${rhomb(sx, sy, 2.2, 4.2, 0, glow, 0.95)}${sparkle(sx, sy - 6, 2.4, '#ffffff', 0.9)}`
      )).join('');
      front.push(`<g class="aether-satellites"${fa}>${satInner}</g>`);
    }
    if (has('sparkles')) for (let k = 0; k < Math.round(10 * D); k++) { const x = 40 + R() * 128, y = 12 + R() * 140; if (Math.abs(x - CX) < 10 && y < g.base) continue; front.push(sparkle(x, y, 1.2 + R() * 3.2, k % 3 ? '#ffffff' : glow, 0.7 + R() * 0.3)); }

    const t = tierOf(lv);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 208 220" width="100%" height="100%" role="img" aria-label="+${lv}강 ${d.n} (${t.name})" class="forge-sword${mini ? ' is-mini' : ''}" data-level="${lv}"><defs>${defs.join('')}</defs><g class="fx-back">${back.join('')}</g><g class="fx-ghost">${ghost.join('')}</g><g class="blade">${blade.join('')}</g><g class="hilt">${hilt.join('')}</g><g class="fx-front">${front.join('')}</g></svg>`;
  }

  root.ForgeUI = Object.assign(root.ForgeUI || {}, { renderSwordSvg, SWORDS, TIERS, tierOf, GEM, MT, _util: { nid, r1, mix, poly, line, lg, rg, sparkle, rhomb, starPts, octPts, rng } });
  root.renderSwordSvg = renderSwordSvg;
}
__forgeSwordModule(typeof window !== 'undefined' ? window : globalThis);

function __forgeExtrasModule(root) {
  'use strict';
  const F = root.ForgeUI;
  const { nid, r1, mix, poly, lg, rg, sparkle, rhomb, starPts } = F._util;

  /* ───────────── 대장간 모루 ───────────── */
  function renderAnvilSvg() {
    const P = nid('anv'), id = (s) => P + s;
    const defs = [
      lg(id('top'), [[0, '#ffffff'], [0.5, '#d7dde3'], [1, '#98a2ad']], 0, 0, 1, 0),
      lg(id('side'), [[0, '#8d96a0'], [0.12, '#6b747e'], [0.6, '#454c55'], [1, '#252a30']]),
      lg(id('waist'), [[0, '#2b3036'], [0.35, '#7d8690'], [0.55, '#5a626b'], [1, '#1f2328']], 0, 0, 1, 0),
      lg(id('horn'), [[0, '#c3cad1'], [0.35, '#7f8892'], [1, '#2a2f35']]),
      lg(id('wood'), [[0, '#6a3f1f'], [0.3, '#9a6234'], [0.6, '#7a4a24'], [1, '#3e2210']], 0, 0, 1, 0),
      lg(id('hot'), [[0, '#fff6c8'], [0.35, '#ffc04d'], [0.75, '#ff6a1f'], [1, '#b2300a']], 0, 0, 1, 0),
      lg(id('rim'), [[0, '#ff8a3d', 0.55], [1, '#ff8a3d', 0]], 0, 0, 1, 0),
      rg(id('glow'), [[0, '#ffb347', 0.75], [0.5, '#ff7a1a', 0.25], [1, '#ff7a1a', 0]]),
      rg(id('shadow'), [[0, '#000000', 0.55], [1, '#000000', 0]]),
      `<filter id="${id('blur')}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
    ];
    const R = F._util.rng(42);
    let sparks = '';
    for (let k = 0; k < 18; k++) {
      const a = -Math.PI * (0.12 + R() * 0.76), len = 14 + R() * 38, x0 = 200, y0 = 66;
      const x1 = x0 + Math.cos(a) * len, y1 = y0 + Math.sin(a) * len;
      sparks += k % 3 ? `<path d="M ${r1(x0 + Math.cos(a) * len * 0.55)} ${r1(y0 + Math.sin(a) * len * 0.55)} L ${r1(x1)} ${r1(y1)}" stroke="${k % 2 ? '#ffd27a' : '#ffffff'}" stroke-width="${r1(0.6 + R() * 0.9)}" stroke-linecap="round"/>` : rhomb(x1, y1, 0.9 + R() * 1.2, 1.4 + R() * 1.6, R() * 90, '#ffe3a0');
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 230" width="100%" height="100%" role="img" aria-label="대장간 모루"><defs>${defs.join('')}</defs>
<ellipse cx="160" cy="216" rx="128" ry="11" fill="url(#${id('shadow')})"/>
<path d="M 90 168 L 230 168 L 238 214 Q 160 224 82 214 Z" fill="url(#${id('wood')})" stroke="#2a160a" stroke-width="1"/>
<path d="M 102 172 Q 100 192 104 212 M 124 171 Q 127 194 122 216 M 150 172 Q 147 196 151 218 M 176 172 Q 180 196 175 218 M 202 171 Q 198 194 203 216 M 222 172 Q 226 192 223 212" stroke="#3a2010" stroke-width="1" fill="none" opacity="0.7"/>
<path d="M 86 190 L 234 190 L 235 198 L 85 198 Z" fill="#3a3f46" stroke="#1b1e22" stroke-width="0.8"/><path d="M 86 191.2 L 234 191.2" stroke="#9aa3ad" stroke-width="0.6"/>
<path d="M 98 148 L 222 148 L 238 166 L 230 174 L 90 174 L 82 166 Z" fill="url(#${id('side')})" stroke="#16191c" stroke-width="1"/>
<path d="M 98 148 L 222 148 L 228 155 L 92 155 Z" fill="url(#${id('top')})" opacity="0.55"/>
<path d="M 138 174 Q 160 160 182 174 Z" fill="#2a1a0e"/>
<path d="M 126 106 L 194 106 Q 186 130 206 150 L 114 150 Q 134 130 126 106 Z" fill="url(#${id('waist')})" stroke="#16191c" stroke-width="1"/>
<path d="M 114 86 L 114 112 Q 72 108 30 96 Q 20 92 28 88 Q 72 84 114 86 Z" fill="url(#${id('horn')})" stroke="#16191c" stroke-width="1"/>
<path d="M 30 89.4 Q 72 85.6 112 87.6" stroke="#eef2f5" stroke-width="1" fill="none" opacity="0.8"/>
<path d="M 114 86 L 114 112 Q 72 108 30 96 Q 20 92 28 88 Q 72 84 114 86 Z" fill="url(#${id('rim')})"/>
<path d="M 104 82 L 126 82 L 126 112 L 104 112 Z" fill="url(#${id('side')})" stroke="#16191c" stroke-width="1"/><path d="M 104 82 L 126 82 L 126 86 L 104 86 Z" fill="#c9d0d7"/>
<path d="M 126 76 L 268 76 L 278 82 L 278 104 L 266 112 L 126 112 Z" fill="url(#${id('side')})" stroke="#16191c" stroke-width="1.1" stroke-linejoin="round"/>
<path d="M 126 76 L 268 76 L 278 82 L 132 82 Z" fill="url(#${id('top')})"/>
<path d="M 132 82.4 L 277 82.4" stroke="#ffffff" stroke-width="0.8" opacity="0.8"/>
<path d="M 246 77.4 L 254 77.4 L 256 80.6 L 248 80.6 Z" fill="#14171a"/><ellipse cx="232" cy="79" rx="2.6" ry="1.3" fill="#14171a"/>
<path d="M 266 112 L 278 104" stroke="#9aa3ad" stroke-width="0.6"/>
<g opacity="0.4" stroke="#c9d0d7" stroke-width="1" fill="none" stroke-linecap="round"><path d="M 188 88 L 212 106 M 212 88 L 188 106"/><path d="M 196 86 L 204 86 L 204 90 L 196 90 Z"/><path d="M 182 97 Q 200 112 218 97"/></g>
<ellipse cx="200" cy="72" rx="40" ry="18" fill="url(#${id('glow')})"/>
<rect x="164" y="69" width="74" height="7" rx="3.4" fill="url(#${id('hot')})" filter="url(#${id('blur')})"/>
<path d="M 168 70.6 L 234 70.6" stroke="#fffbe0" stroke-width="0.8" opacity="0.9"/>
<g filter="url(#${id('blur')})">${sparks}</g>
${sparkle(200, 64, 6, '#ffffff')}
</svg>`;
  }

  /* ───────────── 대장간 아이콘 8종 ───────────── */
  const ICONS = [
    { key: 'bellows', name: '풀무 기운', desc: '강화 성공률 상승' },
    { key: 'point', name: '포인트', desc: '대장간 재화' },
    { key: 'shield', name: '장인의 보호권', desc: '파괴 1회 방지' },
    { key: 'whetstone', name: '장인의 숫돌', desc: '하락 방지' },
    { key: 'shard', name: '검의 파편', desc: '파괴 시 획득' },
    { key: 'hammer', name: '담금질 망치', desc: '확정 강화' },
    { key: 'supply', name: '일일 보급', desc: '매일 1회 수령' },
    { key: 'hall', name: '명예의 전당', desc: '최고 기록 랭킹' },
  ];
  function renderForgeIcon(key) {
    const P = nid('ic'), id = (s) => P + s;
    const defs = [
      lg(id('gold'), [[0, '#fff6cf'], [0.45, '#f4cb5a'], [1, '#a8781f']]),
      lg(id('steel'), [[0, '#ffffff'], [0.5, '#b9c3cd'], [1, '#5e6873']]),
      lg(id('wood'), [[0, '#e0a868'], [1, '#8a5326']]),
      lg(id('fire'), [[0, '#fff3c4'], [0.45, '#ffb347'], [1, '#ff5a1f']], 0, 1, 0, 0),
    ];
    let b = '';
    switch (key) {
      case 'bellows':
        defs.push(lg(id('lea'), [[0, '#a8703f'], [1, '#5a3418']]));
        b = `<path d="M 10 17 C 6 22 6 28 10 33 L 30 27.6 L 30 22.4 Z" fill="url(#${id('lea')})" stroke="#2e1a0a" stroke-width="0.8"/>
<path d="M 13.5 18.6 C 11 22.5 11 27.5 13.5 31.4 M 18 19.9 C 16 23 16 27 18 30.1 M 22.5 21.1 C 21.2 23.3 21.2 26.7 22.5 28.9" stroke="#2e1a0a" stroke-width="0.8" fill="none"/>
<path d="M 6 14 C 12 10.5 22 13.5 31 21.5 L 29.8 23 C 21 16.2 12 14.2 7.4 16.4 Z" fill="url(#${id('wood')})" stroke="#4a2a10" stroke-width="0.7"/>
<path d="M 6 36 C 12 39.5 22 36.5 31 28.5 L 29.8 27 C 21 33.8 12 35.8 7.4 33.6 Z" fill="url(#${id('wood')})" stroke="#4a2a10" stroke-width="0.7"/>
<path d="M 6.5 14.6 L 2.5 12 M 6.5 35.4 L 2.5 38" stroke="#8a5326" stroke-width="2.2" stroke-linecap="round"/>
<path d="M 29.5 22.4 L 37 23.6 L 37 26.4 L 29.5 27.6 Z" fill="url(#${id('steel')})" stroke="#2f363e" stroke-width="0.6"/>
<path d="M 37.5 25 Q 41 20.5 46 18 Q 43.4 22.5 45.6 25 Q 43.4 27.5 46 32 Q 41 29.5 37.5 25 Z" fill="url(#${id('fire')})"/>
<path d="M 38.2 25 Q 41 23.4 43 22 Q 42 24 43 25 Q 42 26 43 28 Q 41 26.6 38.2 25 Z" fill="#fff6d6"/>
<path d="M 38 14.5 q 3 -2.4 5.6 -0.2 t 2 3.4 M 38 35.5 q 3 2.4 5.6 0.2" stroke="#ffc58a" stroke-width="0.9" fill="none" stroke-linecap="round"/>`;
        break;
      case 'point':
        defs.push(rg(id('coin'), [[0, '#fff6cf'], [0.6, '#f4cb5a'], [1, '#b5832a']], 0.35, 0.3, 0.8));
        b = `<ellipse cx="32" cy="33" rx="11" ry="11" fill="#8a5f12"/><ellipse cx="32" cy="31.6" rx="11" ry="11" fill="url(#${id('coin')})" stroke="#6e4a12" stroke-width="0.7"/>
<ellipse cx="20" cy="25.8" rx="15" ry="15" fill="#8a5f12"/><ellipse cx="20" cy="24" rx="15" ry="15" fill="url(#${id('coin')})" stroke="#6e4a12" stroke-width="0.8"/>
<ellipse cx="20" cy="24" rx="11.6" ry="11.6" fill="none" stroke="#a8781f" stroke-width="0.9"/>
<path d="${poly(starPts(20, 24.4, 5, 7.6, 3.2))}" fill="#fff6cf" stroke="#a8781f" stroke-width="0.7" stroke-linejoin="round"/>
<path d="M 10 18 A 12 12 0 0 1 18 11.4" stroke="#ffffff" stroke-width="1.3" fill="none" stroke-linecap="round" opacity="0.85"/>${sparkle(37, 22, 2.6, '#ffffff')}`;
        break;
      case 'shield':
        defs.push(lg(id('bl'), [[0, '#6f9ef0'], [1, '#1d3f8a']], 0, 0, 1, 1));
        b = `<path d="M 24 4.5 L 40 9.5 Q 40.5 29 24 43 Q 7.5 29 8 9.5 Z" fill="url(#${id('bl')})" stroke="url(#${id('gold')})" stroke-width="2.4" stroke-linejoin="round"/>
<path d="M 24 7.6 L 24 39.6 Q 10.6 27.4 10.8 11.4 Z" fill="#ffffff" opacity="0.14"/>
<path d="M 15.6 19 L 31 19 L 29 21.6 L 26 21.6 L 27.2 25.4 L 30 26.6 L 18 26.6 L 20.8 25.4 L 22 21.6 L 18.6 21.6 Q 15.6 21 15.6 19 Z" fill="url(#${id('gold')})" stroke="#6e4a12" stroke-width="0.5"/>
<path d="M 4.5 30 L 43.5 30 L 41 34 L 43.5 38 L 4.5 38 L 7 34 Z" fill="#c7372a" stroke="#5a0f0a" stroke-width="0.7" stroke-linejoin="round"/>
<path d="M 7 31.4 L 41 31.4" stroke="#ffb199" stroke-width="0.7"/>${rhomb(24, 34, 1.6, 1.6, 0, '#fff6cf')}${rhomb(16, 34, 1, 1, 0, '#ffd9cc')}${rhomb(32, 34, 1, 1, 0, '#ffd9cc')}`;
        break;
      case 'whetstone':
        b = `<path d="M 8 20 L 26 12 L 42 18 L 24 27 Z" fill="#c9cdd2" stroke="#4a4f55" stroke-width="0.7" stroke-linejoin="round"/>
<path d="M 8 20 L 24 27 L 24 32 L 8 25.4 Z" fill="#c98a4b"/><path d="M 24 27 L 42 18 L 42 23.2 L 24 32 Z" fill="#8a5426"/>
<path d="M 8 25.4 L 24 32 L 24 38 L 8 31 Z" fill="#7d858f"/><path d="M 24 32 L 42 23.2 L 42 29 L 24 38 Z" fill="#4f565e"/>
<path d="M 8 20 L 24 27 L 42 18 M 24 27 L 24 38 M 8 20 L 8 31 L 24 38 L 42 29 L 42 18" fill="none" stroke="#2b3036" stroke-width="0.7" stroke-linejoin="round"/>
<path d="M 13 18.6 L 30 13.6 M 18 21.6 L 35 15.8" stroke="#ffffff" stroke-width="0.7" opacity="0.7"/>
<path d="M 30 5 Q 33.5 10 33.5 12 A 3.5 3.5 0 0 1 26.5 12 Q 26.5 10 30 5 Z" fill="#7fd0ff" stroke="#2a7ea0" stroke-width="0.5"/>${sparkle(10, 13, 3, '#ffffff')}`;
        break;
      case 'shard':
        defs.push(lg(id('bv'), [[0, '#ffffff'], [1, '#9fb0c4']], 0, 0, 1, 0));
        b = `<g stroke="#2f363e" stroke-width="0.7" stroke-linejoin="round">
<path d="M 9 38 L 17 11 L 25 7 L 21 30 Z" fill="url(#${id('steel')})"/><path d="M 17 11 L 25 7 L 19 33 L 13 36 Z" fill="url(#${id('bv')})" opacity="0.7"/>
<path d="M 25 41 L 31 24 L 38 21 L 35 35 Z" fill="url(#${id('steel')})"/><path d="M 31 24 L 38 21 L 32 37 Z" fill="#ffffff" opacity="0.5"/>
<path d="M 34 13 L 41 7 L 39.5 16 Z" fill="url(#${id('steel')})"/></g>
<path d="M 25 7 L 21 30 M 38 21 L 35 35" stroke="#bde4ff" stroke-width="0.9" opacity="0.9"/>${sparkle(25, 7, 3.4, '#ffffff')}${sparkle(41, 7, 2, '#bde4ff')}`;
        break;
      case 'hammer':
        defs.push(lg(id('face'), [[0, '#ffe08a'], [0.5, '#ff8a2a'], [1, '#c2410c']], 0, 0, 1, 0));
        b = `<g transform="rotate(-38 24 24)">
<rect x="21.6" y="17" width="4.8" height="28" rx="2" fill="url(#${id('wood')})" stroke="#4a2a10" stroke-width="0.7"/>
<path d="M 22.2 38 L 25.8 38 M 22.2 41 L 25.8 41" stroke="#4a2a10" stroke-width="0.6"/>
<path d="M 10 8 L 34 8 L 36 10 L 36 19 L 34 21 L 10 21 Z" fill="url(#${id('steel')})" stroke="#2f363e" stroke-width="0.8" stroke-linejoin="round"/>
<path d="M 10 8 L 34 8 L 36 10 L 12 10 Z" fill="#ffffff" opacity="0.7"/>
<path d="M 34 8 L 39 9.5 L 39 19.5 L 34 21 Z" fill="url(#${id('face')})" stroke="#7a2a08" stroke-width="0.7"/>
<path d="M 10 8 L 6.5 10 L 6.5 19 L 10 21 Z" fill="#7d858f" stroke="#2f363e" stroke-width="0.7"/></g>
<path d="M 38 12 q -2 -3 0 -5 q 2 -2 0 -5 M 43 15 q -2 -3 0 -5" stroke="#cfe6f0" stroke-width="1" fill="none" stroke-linecap="round" opacity="0.8"/>
${rhomb(40, 24, 0.9, 1.6, 30, '#ffd27a')}${rhomb(44, 20, 0.7, 1.2, -20, '#ffffff')}${sparkle(41, 29, 2.2, '#ffe3a0')}`;
        break;
      case 'supply':
        b = `<path d="M 6 18 L 24 11 L 42 18 L 24 25 Z" fill="#d9a066" stroke="#5e3a1a" stroke-width="0.7" stroke-linejoin="round"/>
<path d="M 6 18 L 24 25 L 24 43 L 6 36 Z" fill="#b97a40" stroke="#5e3a1a" stroke-width="0.7"/><path d="M 24 25 L 42 18 L 42 36 L 24 43 Z" fill="#8a5326" stroke="#5e3a1a" stroke-width="0.7"/>
<path d="M 6 24 L 24 31 L 42 24 M 6 30 L 24 37 L 42 30" stroke="#5e3a1a" stroke-width="0.5" fill="none" opacity="0.6"/>
<path d="M 13 14.4 L 31 21.6 L 31 39.6 L 27 41.2 L 27 23.2 L 9.6 15.8 Z" fill="#c7372a" stroke="#5a0f0a" stroke-width="0.5"/>
<path d="M 24 11 C 20 4 13 6 17 10.6 C 19 12.4 22.6 11.8 24 11 C 25.4 11.8 29 12.4 31 10.6 C 35 6 28 4 24 11 Z" fill="#e2553b" stroke="#5a0f0a" stroke-width="0.6"/>
<path d="M 6 18 L 6 21 M 42 18 L 42 21" stroke="url(#${id('gold')})" stroke-width="2"/>${sparkle(40, 8, 3, '#ffe39a')}`;
        break;
      case 'hall':
        b = `<path d="M 15 7 L 33 7 L 33 15 Q 33 26 24 28 Q 15 26 15 15 Z" fill="url(#${id('gold')})" stroke="#6e4a12" stroke-width="0.8"/>
<path d="M 15 10 Q 8 10 9 16 Q 10 21 16 22 M 33 10 Q 40 10 39 16 Q 38 21 32 22" fill="none" stroke="url(#${id('gold')})" stroke-width="2"/>
<path d="M 17.6 9 L 17.6 15 Q 17.8 22 22 25" stroke="#ffffff" stroke-width="1.1" fill="none" opacity="0.7" stroke-linecap="round"/>
<path d="M 22 28 L 26 28 L 26.6 33 L 21.4 33 Z" fill="#b5832a"/><path d="M 16 33 L 32 33 L 33.6 38 L 14.4 38 Z" fill="url(#${id('gold')})" stroke="#6e4a12" stroke-width="0.7"/>
<rect x="12.6" y="38" width="22.8" height="4" rx="1" fill="#5a3a1a" stroke="#2a1a0a" stroke-width="0.6"/>
<path d="${poly(starPts(24, 16, 5, 4.4, 1.9))}" fill="#fff6cf" stroke="#a8781f" stroke-width="0.5"/>
<g fill="#6fae4a" stroke="#2f5a1e" stroke-width="0.4">${[0, 1, 2, 3].map((k) => `<path d="M ${7 - k * 0.4} ${36 - k * 6} q -3 -2.4 -1 -5.6 q 3 2 1 5.6 Z"/><path d="M ${41 + k * 0.4} ${36 - k * 6} q 3 -2.4 1 -5.6 q -3 2 -1 5.6 Z"/>`).join('')}</g>
<path d="M 8 38 Q 3 26 7 13 M 40 38 Q 45 26 41 13" stroke="#2f5a1e" stroke-width="0.7" fill="none"/>`;
        break;
    }
    const meta = ICONS.find((i) => i.key === key);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="100%" height="100%" role="img" aria-label="${meta ? meta.name : key}"><defs>${defs.join('')}</defs>${b}</svg>`;
  }

  /* ───────────── 코너 필리그리 ───────────── */
  function filigreeSvg(cls) {
    const half = `<path d="M 6 6 L 82 6 M 12 12 L 58 12" /><path d="M 14 14 C 32 14 38 26 30 32 C 24 37 16 31 20 25 C 23 21 28 23 27 27" /><path d="M 30 32 C 40 24 52 26 60 18 C 52 31 41 34 30 32 Z" fill="currentColor" stroke="none" opacity="0.85"/><path d="M 60 18 C 66 13 73 15 71 21 C 69.5 25 64 23.6 66 20.6" /><path d="M 40 12 q 4 -4 8 0 t 8 0"/>`;
    return `<svg class="${cls}" viewBox="0 0 90 90" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round">${half}<g transform="matrix(0 1 1 0 0 0)">${half}</g><path d="M 6 6 L 14 14" stroke-width="1.6"/><path d="M 6 0 L 12 6 L 6 12 L 0 6 Z" fill="currentColor" transform="translate(0 0)"/></g></svg>`;
  }
  function waxSealSvg() {
    const P = nid('seal'); const pts = [];
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = 36 + (i % 2 ? 1.8 : -0.6) + Math.sin(i * 2.3) * 1.2; pts.push([40 + Math.cos(a) * r, 40 + Math.sin(a) * r]); }
    return `<svg viewBox="0 0 80 80" aria-hidden="true" class="fg-seal"><defs>${rg(P + 'w', [[0, '#e2553b'], [0.7, '#a3231a'], [1, '#6b0f0a']], 0.38, 0.32, 0.8)}</defs>
<path d="${poly(pts)}" fill="url(#${P}w)" stroke="#5a0a06" stroke-width="0.8"/><circle cx="40" cy="40" r="27" fill="none" stroke="#ff9a85" stroke-width="1" opacity="0.6"/><circle cx="40" cy="40" r="24" fill="none" stroke="#5a0a06" stroke-width="0.8" opacity="0.6"/>
<path d="M 30 50 L 50 30 M 50 50 L 30 30" stroke="#ffd2c4" stroke-width="2.4" stroke-linecap="round" opacity="0.9"/><path d="M 27 33 L 33 27 M 47 27 L 53 33" stroke="#ffd2c4" stroke-width="3" stroke-linecap="round"/>
<text x="40" y="65" text-anchor="middle" font-size="7" fill="#ffd2c4" font-family="serif" letter-spacing="1">鑑定</text></svg>`;
  }

  /* ───────────── 국화 일러스트 ───────────── */
  function renderChrysanthemumSvg() {
    const P = nid('chr'), id = (s) => P + s; const R = F._util.rng(7);
    const defs = [lg(id('pet'), [[0, '#b9b4a8'], [0.45, '#ece8de'], [1, '#ffffff']], 0, 1, 0, 0), lg(id('pet2'), [[0, '#d8d2c2'], [1, '#fffdf6']], 0, 1, 0, 0), lg(id('leaf'), [[0, '#7d9670'], [1, '#3e5538']]), rg(id('ctr'), [[0, '#f3f0c8'], [1, '#b8b47a']])];
    const petal = (L, w) => `M 0 0 C ${r1(w)} ${r1(-L * 0.25)} ${r1(w * 1.1)} ${r1(-L * 0.8)} ${r1(w * 0.3)} ${r1(-L)} Q 0 ${r1(-L * 1.04)} ${r1(-w * 0.3)} ${r1(-L)} C ${r1(-w * 1.1)} ${r1(-L * 0.8)} ${r1(-w)} ${r1(-L * 0.25)} 0 0 Z`;
    const head = (cx, cy, sc) => {
      let s = `<g transform="translate(${cx} ${cy}) scale(${sc} ${r1(sc * 0.84 * 100) / 100})">`;
      [[26, 52, 4.4, 0, 'pet'], [22, 41, 4.1, 7, 'pet'], [18, 30, 3.7, 3, 'pet2'], [14, 19, 3.1, 11, 'pet2'], [10, 9, 2.4, 5, 'pet2']].forEach(([n, L, w, off, gid]) => {
        for (let i = 0; i < n; i++) {
          const a = (i / n) * 360 + off + (R() - 0.5) * 6, l = L * (0.88 + R() * 0.2);
          s += `<path d="${petal(l, w)}" transform="rotate(${r1(a)})" fill="url(#${id(gid)})" stroke="#8f897c" stroke-width="0.35"/>`;
          if (L > 25) s += `<path d="M 0 -3 L 0 ${r1(-l * 0.8)}" transform="rotate(${r1(a)})" stroke="#b5ae9f" stroke-width="0.3" opacity="0.7"/>`;
        }
      });
      return s + `<ellipse cx="0" cy="0" rx="5" ry="4.4" fill="url(#${id('ctr')})"/></g>`;
    };
    const leaf = `M 0 0 C 6 -8 14 -10 18 -6 C 20 -12 28 -14 32 -8 C 36 -12 44 -10 46 -4 C 50 -2 52 2 48 4 C 44 10 36 10 32 6 C 28 12 20 12 18 6 C 12 10 4 8 0 0 Z`;
    const leafG = (tf) => `<g transform="${tf}"><path d="${leaf}" fill="url(#${id('leaf')})" stroke="#2c3d28" stroke-width="0.5"/><path d="M 0 0 Q 24 -1 47 0 M 18 -1 L 18 -5.6 M 32 -1 L 32 -7 M 18 0 L 18 5 M 32 0 L 32 5.4" stroke="#a6b998" stroke-width="0.5" fill="none" opacity="0.8"/></g>`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="100%" height="100%" role="img" aria-label="흰 국화"><defs>${defs.join('')}</defs>
<path d="M 100 110 C 96 150 106 190 98 238" stroke="#4f6b4a" stroke-width="3.2" fill="none" stroke-linecap="round"/><path d="M 100 168 C 116 160 132 150 146 142" stroke="#4f6b4a" stroke-width="2.2" fill="none" stroke-linecap="round"/>
${leafG('translate(99 186) rotate(-28)')}${leafG('translate(99 210) rotate(208) scale(1 -1)')}${leafG('translate(101 150) rotate(196) scale(0.75 -0.75)')}
${head(146, 132, 0.42)}${head(100, 88, 1)}</svg>`;
  }

  /* ───────────── 감정서 · 부고장 카드 ───────────── */
  const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const today = () => { const d = new Date(); return `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`; };

  function renderAppraisalCard(level, opts = {}) {
    const lv = Math.max(0, Math.min(30, level | 0)); const s = F.SWORDS[lv], t = F.tierOf(lv);
    const owner = esc(opts.owner || '이름 없는 장인'), date = esc(opts.date || today());
    const serial = esc(opts.serial || `HD-${String(lv).padStart(2, '0')}-${(lv * 7919 + 1031).toString(36).toUpperCase()}`);
    return `<article class="fg-cert" style="--tier:${t.color}" aria-label="명검 감정서: +${lv}강 ${esc(s.n)}">
${['tl', 'tr', 'bl', 'br'].map((p) => filigreeSvg('fg-cert__corner fg-' + p)).join('')}
<header class="fg-cert__head"><p class="fg-cert__eyebrow">하루를 담다 · 대장간 감정원</p><h3 class="fg-cert__title">명검 감정서</h3><p class="fg-cert__sub">CERTIFICATE OF APPRAISAL</p></header>
<div class="fg-cert__body"><div class="fg-cert__medal">${F.renderSwordSvg(lv)}</div>
<dl class="fg-cert__list"><div><dt>명칭</dt><dd>${esc(s.n)}</dd></div><div><dt>강화</dt><dd class="fg-cert__lv">+${lv}</dd></div><div><dt>등급</dt><dd><span class="fg-chip">${t.name} · ${t.en}</span></dd></div><div><dt>소유 장인</dt><dd>${owner}</dd></div><div><dt>감정일</dt><dd>${date}</dd></div></dl></div>
<p class="fg-cert__note"><strong>감정 의견</strong> ${esc(s.desc)}</p>
<footer class="fg-cert__foot"><div><p class="fg-cert__serial">No. ${serial}</p><p class="fg-cert__sign">대장간 수석 감정사</p></div>${waxSealSvg()}</footer></article>`;
  }

  function renderBrokenSwordSvg(level) {
    const P = nid('brk'); const yb = 84;
    const zig = [[0, yb + 4], [92, yb + 2], [98, yb - 3], [104, yb + 3], [110, yb - 2], [118, yb + 1], [208, yb - 2]];
    return `<svg viewBox="0 0 208 220" width="100%" height="100%" role="img" aria-label="부러진 +${level}강 검"><defs><clipPath id="${P}lo"><path d="${poly([...zig, [208, 220], [0, 220]])}"/></clipPath><clipPath id="${P}up"><path d="${poly([[0, 0], [208, 0], ...zig.slice().reverse()])}"/></clipPath></defs>
<g clip-path="url(#${P}lo)">${F.renderSwordSvg(level)}</g><g transform="translate(14 -8) rotate(13 104 ${yb})"><g clip-path="url(#${P}up)">${F.renderSwordSvg(level)}</g></g>
<path d="M 94 ${yb + 10} L 99 ${yb + 6} L 97 ${yb + 14} Z M 112 ${yb + 8} L 116 ${yb + 5} L 115 ${yb + 11} Z" fill="#cfd4da" stroke="#5e6873" stroke-width="0.4"/></svg>`;
  }

  function renderObituaryCard(level, opts = {}) {
    const lv = Math.max(0, Math.min(30, level | 0)); const s = F.SWORDS[lv];
    const owner = esc(opts.owner || '이름 없는 장인'), date = esc(opts.date || today()); const P = nid('obit');
    return `<article class="fg-obit" aria-label="명검 부고장: +${lv}강 ${esc(s.n)}">
<svg class="fg-obit__tex" aria-hidden="true" preserveAspectRatio="none"><filter id="${P}n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.09 0"/></filter><rect width="100%" height="100%" filter="url(#${P}n)"/></svg>
<svg class="fg-obit__ribbon" viewBox="0 0 40 60" aria-hidden="true"><path d="M 20 30 C 4 14 10 2 20 8 C 30 2 36 14 20 30 L 6 56 L 13 57 L 20 44 L 27 57 L 34 56 Z" fill="#0b0b0b" stroke="#3a3a3a" stroke-width="1"/><path d="M 20 30 C 12 20 14 12 20 14 C 26 12 28 20 20 30" fill="#1c1c1c"/></svg>
<header class="fg-obit__head"><p class="fg-obit__eyebrow">謹弔 · IN MEMORIAM</p><h3 class="fg-obit__title">명검 부고장</h3></header>
<div class="fg-obit__art"><div class="fg-obit__flower">${renderChrysanthemumSvg()}</div><div class="fg-obit__sword">${renderBrokenSwordSvg(lv)}</div></div>
<p class="fg-obit__epitaph">「${esc(s.n)}」 +${lv}강이 강화의 불길 속에서<br/>장렬히 산화하였기에 삼가 부고를 전합니다.</p>
<dl class="fg-obit__list"><div><dt>향년</dt><dd>+${lv}강</dd></div><div><dt>상주</dt><dd>장인 ${owner}</dd></div><div><dt>영면일</dt><dd>${date}</dd></div><div><dt>장지</dt><dd>광장 · 추모의 벽</dd></div></dl>
<p class="fg-obit__closing">삼가 고검(故劍)의 명복을 빕니다</p></article>`;
  }

  const FORGE_CARD_CSS = `
.fg-cert{position:relative;max-width:420px;padding:34px 30px 24px;color:#3a2a14;background:radial-gradient(120% 90% at 50% 40%,#fbf4e2 0%,#f1e3c0 70%,#e2cc9c 100%);border-radius:6px;box-shadow:0 0 0 1px #c9a764,0 0 0 5px #f6ecd2,0 0 0 6px #b48c45,0 18px 40px rgba(0,0,0,.45);font-family:"Noto Sans KR",system-ui,sans-serif}
.fg-cert__corner{position:absolute;width:64px;height:64px;color:#a07a2c}.fg-tl{top:8px;left:8px}.fg-tr{top:8px;right:8px;transform:scaleX(-1)}.fg-bl{bottom:8px;left:8px;transform:scaleY(-1)}.fg-br{bottom:8px;right:8px;transform:scale(-1,-1)}
.fg-cert__head{text-align:center}.fg-cert__eyebrow{margin:0;font-size:11px;letter-spacing:.18em;color:#8a6a2a}.fg-cert__title{margin:6px 0 2px;font-family:"Noto Serif KR",serif;font-size:28px;font-weight:700;letter-spacing:.2em}.fg-cert__sub{margin:0;font-size:10px;letter-spacing:.35em;color:#8a6a2a}
.fg-cert__body{display:flex;gap:16px;align-items:center;margin:18px 0 12px}.fg-cert__medal{flex:0 0 120px;height:128px;border-radius:50% 50% 12px 12px;background:radial-gradient(circle at 50% 40%,#2a2118 0%,#120d08 100%);box-shadow:inset 0 0 0 2px #b48c45,inset 0 0 0 4px #2a2118,inset 0 0 0 5px #8a6a2a;padding:4px}
.fg-cert__list{margin:0;flex:1;display:flex;flex-direction:column;gap:6px;font-size:13px}.fg-cert__list div{display:flex;gap:8px;border-bottom:1px dashed rgba(138,106,42,.35);padding-bottom:4px}.fg-cert__list dt{flex:0 0 64px;color:#8a6a2a}.fg-cert__list dd{margin:0;font-weight:600}.fg-cert__lv{font-family:"Noto Serif KR",serif;font-size:18px;color:#7a1f12}
.fg-chip{display:inline-block;padding:1px 8px;border-radius:999px;font-size:11px;background:#2a2118;color:var(--tier)}
.fg-cert__note{margin:0;font-size:12.5px;line-height:1.7;color:#4b3818}.fg-cert__note strong{color:#7a1f12;margin-right:6px}
.fg-cert__foot{display:flex;justify-content:space-between;align-items:flex-end;margin-top:14px}.fg-cert__serial{margin:0;font-size:11px;font-family:ui-monospace,monospace;color:#8a6a2a}.fg-cert__sign{margin:4px 0 0;padding-top:4px;border-top:1px solid #8a6a2a;font-size:12px;font-family:"Noto Serif KR",serif}.fg-seal{width:70px;height:70px;transform:rotate(-12deg);filter:drop-shadow(0 3px 3px rgba(0,0,0,.35))}
.fg-obit{position:relative;overflow:hidden;max-width:420px;padding:32px 28px 26px;color:#e8e6e1;text-align:center;background:linear-gradient(160deg,#3b3d41 0%,#26282b 45%,#1a1b1d 100%);border-radius:120px 120px 8px 8px;box-shadow:inset 0 0 0 1px #5a5d62,inset 0 0 0 7px #2b2d30,inset 0 0 0 8px #6b6e73,0 18px 40px rgba(0,0,0,.55);font-family:"Noto Sans KR",system-ui,sans-serif}
.fg-obit__tex{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.fg-obit__ribbon{position:absolute;top:18px;right:30px;width:26px;height:40px}
.fg-obit__head{position:relative}.fg-obit__eyebrow{margin:14px 0 0;font-size:11px;letter-spacing:.3em;color:#a9a6a0}.fg-obit__title{margin:6px 0 0;font-family:"Noto Serif KR",serif;font-size:26px;font-weight:600;letter-spacing:.28em;color:#f4f2ee}
.fg-obit__art{position:relative;display:flex;justify-content:center;align-items:flex-end;height:180px;margin:14px 0 10px}.fg-obit__flower{width:130px;height:156px;position:relative;z-index:2;margin-right:-30px}.fg-obit__sword{width:130px;height:150px;filter:grayscale(1) brightness(.85) contrast(1.05);opacity:.85}
.fg-obit__epitaph{position:relative;margin:0 0 14px;font-family:"Noto Serif KR",serif;font-size:14px;line-height:1.8;color:#eceae5}
.fg-obit__list{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:6px 14px;margin:0;padding:12px 0;border-top:1px solid #4a4c50;border-bottom:1px solid #4a4c50;font-size:12.5px;text-align:left}.fg-obit__list div{display:flex;gap:8px}.fg-obit__list dt{color:#8f8c86}.fg-obit__list dd{margin:0;color:#f0eee9}
.fg-obit__closing{position:relative;margin:14px 0 0;font-family:"Noto Serif KR",serif;font-size:13px;letter-spacing:.2em;color:#c9c6bf}`;
  function injectForgeStyles(doc = root.document) {
    if (!doc || doc.getElementById('forge-card-css')) return;
    const st = doc.createElement('style'); st.id = 'forge-card-css'; st.textContent = FORGE_CARD_CSS; doc.head.appendChild(st);
  }

  Object.assign(F, { renderAnvilSvg, renderForgeIcon, ICONS, renderAppraisalCard, renderObituaryCard, renderChrysanthemumSvg, renderBrokenSwordSvg, injectForgeStyles, FORGE_CARD_CSS });
}
__forgeExtrasModule(typeof window !== 'undefined' ? window : globalThis);


(function(global){
  'use strict';
  const $=selector=>document.querySelector(selector),$$=selector=>[...document.querySelectorAll(selector)];
  const esc=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const money=value=>`${Math.max(0,Math.round(Number(value)||0)).toLocaleString('ko-KR')} P`;
  const NAMES=['수련용 목검','무딘 철검','단련된 강철검','기사의 제식 장검','정예병의 브로드소드','바람을 가르는 세이버','붉은 늑대의 이빨검','푸른 숲의 수호검','흑요석 카타나','백은의 기사도검','거인 학살자의 대검','뇌전의 레이피어','빙결의 크리스탈 소드','진홍의 화염 플람베르주','폭풍을 부르는 자','영혼을 베는 에스톡','황혼의 마검','별빛을 머금은 성검','차원의 집행검','명왕의 참마도','태양신의 군주검','용살자의 드래곤 슬레이어','불멸의 엑스칼리버','천상의 발키리 소드','심연의 종언검','시공을 베는 크로노스','은하수의 성좌검','파멸의 라그나로크','천지개벽의 성검','무한의 아포칼립스','창세의 신화검 · 에테르'];
  const SALES=[0,2,5,10,20,35,55,80,115,155,200,260,330,420,520,650,800,1000,1250,1550,2000,2500,3100,3800,4600,5600,6800,8200,10000,12500,16000];
  const SHOP=[['stamina_1','⚡','풀무 기운 +1','하루 5회','120 P'],['whetstone_1','💎','숫돌 1개','성공률 +2%','100 P'],['shield_1','🛡️','보호권 1장','파괴 방어','200 P'],['shield_5','🛡️','보호권 5장','묶음 할인','900 P'],['shield_10','🛡️','보호권 10장','메가 번들','1,700 P'],['sword_10','⚔️','+10강 대검','즉시 장착','300 P'],['sword_15','⚔️','+15강 에스톡','즉시 장착','1,000 P'],['sword_20','☀️','+20강 군주검','즉시 장착','3,000 P'],['shard_stamina','⚡','풀무 기운 +1','파편 교환','파편 5개'],['shard_whetstone','💎','숫돌 1개','파편 교환','파편 10개'],['shard_shield','🛡️','보호권 1장','파편 교환','파편 25개']];
  const GUIDE=[['🔥','하루 대장간에 오신 것을 환영합니다','풀무 기운은 빈 모루에 새 수련용 목검을 꺼낼 때만 1개 사용합니다. 검이 있는 동안 담금질 횟수에는 제한이 없습니다.'],['🎯','풀무질 타이밍','PERFECT는 해당 담금질 성공률 +2%, GOOD은 +1%, NORMAL은 +0%입니다. 판매 가격은 강화 단계의 기본 가격으로 고정됩니다.'],['🛡️','보조 아이템 장착','보호권과 숫돌은 아이콘 슬롯으로 장착합니다. 장착한 아이템은 결과와 무관하게 담금질 1회마다 1개 소모됩니다.'],['💥','유지 또는 파괴','실패해도 단계는 절대 하락하지 않습니다. 보호권이 있으면 파괴 판정도 현재 단계를 지킵니다.'],['🏆','판매와 명예의 전당','검을 판매하거나 명예의 전당에 등록하면 모루가 비어 새 목검을 꺼내야 합니다. 첫 완료 보너스 100 P와 보호권 1장을 드립니다.']];
  const outcomeCopy={success:'담금질 성공',stay:'단계 유지',destroy:'검 파괴',protected_destroy:'보호권 방어'};
  let state=null,initialized=false,busy=false,audioContext=null,guideIndex=0;
  const equipped={shield:false,whetstone:false};

  function tierFor(level){const n=Number(level)||0;return n>=30?30:n>=27?27:n>=24?24:n>=20?20:n>=15?15:n>=10?10:n>=5?5:0}
  function auraFor(level){const n=Number(level)||0;return n>=30?'aura-mythic':n>=27?'aura-apocalypse':n>=24?'aura-gold':n>=20?'aura-purple':n>=15?'aura-blue':n>=10?'aura-steel':'aura-none'}
  function gradeFor(level){const n=Number(level)||0;return n>=30?'신화':n>=27?'전설':n>=24?'다이아몬드':n>=20?'황금':n>=15?'은빛 장인':n>=10?'명검':n>=5?'정예':n>=1?'단련':'수련'}
  function bellowsGrade(needleRect,gaugeRect){const center=(Number(needleRect.left)+Number(needleRect.right))/2,ratio=(center-Number(gaugeRect.left))/Math.max(1,Number(gaugeRect.width));return ratio>=.44&&ratio<=.56?'perfect':ratio>=.28&&ratio<=.72?'good':'normal'}
  function dateTime(value){return value?new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(value)):''}
  function frameAvatar(row){const Frame=global.HaruAvatarFrame,Storage=global.LabStorage,tier=Frame?.safeTier?.(row.avatar_frame_tier)||'none',color=Frame?.safeColor?.(row.avatar_frame_color,tier)||'sage',crown=Frame?.safeCrownColor?.(row.avatar_crown_color)||'',url=row.avatar_path?Storage?.publicUrl?.(row.avatar_path):'',letter=esc(String(row.display_name||'대').slice(0,1));return `<div class="avatar forge-rank-avatar" data-frame-tier="${tier}" data-frame-color="${color}" data-frame-crown-color="${crown}"><span class="avatar-face"><span class="avatar-letter">${letter}</span>${url?`<img class="avatar-photo" src="${esc(url)}" alt="">`:''}</span>${Frame?.art?.(tier,color,crown)||''}</div>`}

  function renderSwordSvg(level,mini=false){
    return global.ForgeUI.renderSwordSvg(level,mini);
  }

  function publicationCard(publication){
    global.ForgeUI?.injectForgeStyles?.();
    const meta=publication?.meta||{},level=Math.max(0,Math.min(30,Number(meta.sword_level)||0)),obituary=['destroy','obituary'].includes(meta.forge_event);
    const custom=meta.custom_name?`“${esc(meta.custom_name)}”`:esc(meta.sword_name||NAMES[level]);
    const owner=publication?.author_name||meta.author_name||'하루 장인';
    const dt=publication?.created_at?new Intl.DateTimeFormat('ko-KR',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(publication.created_at)):'';
    if(obituary&&global.ForgeUI?.renderObituaryCard){
      return `<section class="forge-certificate obituary">${global.ForgeUI.renderObituaryCard(level,{owner,date:dt})}<div class="forge-cert-meta-extra"><strong>${custom}</strong><p>${esc(publication?.body||'수많은 불꽃 속에서 잠들다.')}</p><dl><div><dt>생전 감정가</dt><dd>${money(meta.appraisal)}</dd></div><div><dt>향년</dt><dd>총 ${Number(meta.hammer_count)||0}회 담금질</dd></div></dl></div></section>`;
    }
    if(global.ForgeUI?.renderAppraisalCard){
      return `<section class="forge-certificate showcase">${global.ForgeUI.renderAppraisalCard(level,{owner,date:dt})}<div class="forge-cert-meta-extra"><strong>+${level}강 ${custom}</strong><dl><div><dt>감정가</dt><dd>${money(meta.appraisal)}</dd></div><div><dt>누적 담금질</dt><dd>${Number(meta.hammer_count)||0}회</dd></div></dl></div></section>`;
    }
    return '';
  }

  function primeAudio(){try{audioContext=audioContext||new(global.AudioContext||global.webkitAudioContext)();audioContext.resume?.()}catch{}}
  function sound(kind){if(!state?.sword?.sound_enabled)return;try{primeAudio();const now=audioContext.currentTime,master=audioContext.createGain();master.gain.setValueAtTime(.1,now);master.gain.exponentialRampToValueAtTime(.0001,now+.55);master.connect(audioContext.destination);const notes=kind==='success'?[440,660,880]:kind==='destroy'?[170,105,62]:kind==='shield'?[520,340]:[210,165];notes.forEach((frequency,index)=>{const oscillator=audioContext.createOscillator();oscillator.type=kind==='success'?'sine':'triangle';oscillator.frequency.value=frequency;oscillator.connect(master);oscillator.start(now+index*.07);oscillator.stop(now+index*.07+.2)})}catch{}}
  function vibrate(kind){try{navigator.vibrate?.(kind==='destroy'?[80,45,150,45,180]:kind==='shield'?[45,30,45]:kind==='success'?[30,20,70]:[55])}catch{}}
  function setBusy(value){busy=value;const button=$('#forgeEnhance'),s=state?.sword,hasSword=s?.has_sword!==false;if(button){button.disabled=value||(!hasSword&&Number(s?.stamina)<1)||(hasSword&&Number(s?.sword_level)>=30);button.innerHTML=value?'처리 중…':!hasSword?'🪵 수련용 목검 새로 꺼내기 <small>(⚡ 풀무 1 소모)</small>':Number(s?.sword_level)>=30?'신화검 완성':'🔨 담금질하기'}}
  function setMessage(text,tone=''){const node=$('#forgeResultMessage');if(!node)return;node.textContent=text;node.className=`forge-result-message ${tone}`.trim()}
  function syncSlot(name){const button=name==='shield'?$('#forgeUseShield'):$('#forgeUseWhetstone'),available=Number(state?.sword?.[name==='shield'?'shields':'whetstones'])>0;if(!available)equipped[name]=false;if(!button)return;button.disabled=!available;button.classList.toggle('equipped',equipped[name]);button.setAttribute('aria-pressed',String(equipped[name]))}
  function staminaText(){if(!state?.sword)return;const s=state.sword,copy=$('#forgeStaminaCopy');if(!copy)return;if(Number(s.stamina)>=5){copy.textContent='5/5 · 가득 참';return}const next=new Date(s.stamina_next_at).getTime(),seconds=Math.max(0,Math.ceil((next-Date.now())/1000));copy.textContent=`${s.stamina}/5 · ${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')} 후 +1`}
  function renderLeaderboard(rows=[]){const host=$('#forgeLeaderboard');if(!host)return;host.innerHTML=rows.length?rows.map(row=>`<article class="forge-rank-row rank-${row.rank}"><b class="forge-rank-number">${row.rank}</b>${frameAvatar(row)}<div class="forge-rank-copy"><div><strong>${esc(row.display_name||'대장장이')}</strong>${global.HaruShelterUI?.titleBadge?.(row.active_title)||''}</div><span>⚔️ “${esc(row.custom_name)}” <small>(+${row.sword_level} ${esc(row.sword_name)})</small></span><em>${money(row.appraisal)} · 총 ${Number(row.hammer_count)||0}회</em></div></article>`).join(''):'<div class="empty">첫 명검을 등록해 명예의 전당 주인이 되어보세요.</div>'}
  function renderHistory(rows=[]){const recent=rows.slice(0,20),host=$('#forgeHistory');if(!host)return;host.innerHTML=recent.length?recent.map(row=>{const icon=row.outcome==='success'?'✨':row.outcome==='destroy'?'💥':row.outcome==='protected_destroy'?'🛡️':'➖';return `<article class="forge-list-item"><span>${icon}</span><div class="forge-list-copy"><strong>+${row.level_before} → +${row.level_after} · ${outcomeCopy[row.outcome]||row.outcome}</strong><small>${String(row.bellows_grade||'normal').toUpperCase()} · 성공 ${Number(row.success_rate)}% / 유지 ${Number(row.stay_rate)}% / 파괴 ${Number(row.destroy_rate)}%</small></div><time>${esc(dateTime(row.created_at))}</time></article>`}).join(''):'<div class="empty">아직 담금질 기록이 없습니다.</div>'}
  function graveMarkup(rows=[]){const own=global.LabDB.user()?.id;return rows.length?rows.map(row=>`<article class="forge-list-item forge-grave-item"><span>🪦</span><div class="forge-list-copy"><strong>故 +${row.sword_level} ${esc(row.custom_name||row.sword_name)}</strong><small>${esc(row.author_name)} · 감정가 ${money(row.appraisal)} · 향년 ${Number(row.hammer_count)||0}회</small></div>${row.user_id===own?`<button class="btn ghost small" data-forge-obituary="${row.id}" ${row.publication_id?'disabled':''}>${row.publication_id?'부고 게시됨':'🕯️ 광장에 부고 알리기'}</button>`:''}</article>`).join(''):'<div class="empty">아직 20강 이상의 명검이 잠들지 않았습니다.</div>'}
  function renderGraveyard(rows=[]){const g=$('#forgeGraveyard');if(g)g.innerHTML=graveMarkup(rows)}
  function renderStats(stats={}){const host=$('#forgeStats');if(!host)return;const stage=stats.stage_attempts||{},topStages=Object.entries(stage).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,5),max=Math.max(1,...topStages.map(x=>Number(x[1])));host.innerHTML=`<div class="forge-stat"><span>전체 담금질</span><strong>${Number(stats.total_enhances||0).toLocaleString('ko-KR')}회</strong></div><div class="forge-stat"><span>파괴된 검</span><strong>${Number(stats.total_destructions||0).toLocaleString('ko-KR')}자루</strong></div><div class="forge-stat"><span>서버 최고 단계</span><strong>+${Number(stats.highest_level||0)}강</strong></div><div class="forge-stat"><span>신화검 탄생</span><strong>${Number(stats.mythic_created_count||0).toLocaleString('ko-KR')}자루</strong></div>${topStages.length?`<div class="forge-stage-stats"><b>단계별 시도 Top</b>${topStages.map(([level,count])=>`<span>+${level}강 <i style="width:${Math.min(100,Number(count)/max*100)}%"></i><em>${Number(count).toLocaleString('ko-KR')}회</em></span>`).join('')}</div>`:''}`}
  function shopIconFor(key){const F=global.ForgeUI;if(!F?.renderForgeIcon)return '';if(key.includes('stamina'))return F.renderForgeIcon('bellows');if(key.includes('whetstone'))return F.renderForgeIcon('whetstone');if(key.includes('shield'))return F.renderForgeIcon('shield');if(key.startsWith('sword_')){const lv=Number(key.split('_')[1])||10;return F.renderSwordSvg(lv,true)}return F.renderForgeIcon('point')}
  function shopTiles(items){return `<div class="forge-shop-items">${items.map(([key,icon,title,body,price])=>`<article><span class="forge-shop-art">${shopIconFor(key)||icon}</span><h3>${esc(title)}</h3><p>${esc(body)}</p><button class="btn secondary" type="button" data-forge-buy="${key}">${esc(price)}</button></article>`).join('')}</div>`}
  function renderShop(){const host=$('#forgeShop');if(!host||host.children.length)return;host.innerHTML=`<section class="forge-shop-group point"><h3>💰 포인트 상점</h3>${shopTiles(SHOP.slice(0,8))}</section><section class="forge-shop-group shard"><h3>✨ 파편 교환소</h3>${shopTiles(SHOP.slice(8))}</section>`}
  function render(){if(!state?.sword)return;const s=state.sword,hasSword=s.has_sword!==false,level=Number(s.sword_level)||0,rates=state.rates,appraisal=Number(s.appraisal)||0;$('#forgeGrade').textContent=hasSword?`${gradeFor(level)} 등급`:'빈 모루';$('#forgeLevel').textContent=hasSword?`+${level}강`:'';$('#forgeSwordName').textContent=hasSword?(s.custom_name||s.sword_name||NAMES[level]):'모루가 비어 있습니다';$('#forgeAppraisal').textContent=hasSword?money(appraisal):'—';$('#forgeSwordVisual').innerHTML=hasSword?renderSwordSvg(level):(global.ForgeUI?.renderAnvilSvg?.()||'');$('#forgeSwordVisual').classList.toggle('empty',!hasSword);$('#forgeAura').className=`forge-aura ${hasSword?auraFor(level):'aura-none'}`;$('#forgePoints').textContent=money(s.points);$('#forgeShields').textContent=Number(s.shields||0);$('#forgeWhetstones').textContent=Number(s.whetstones||0);$('#forgeShards').textContent=Number(s.shards||0);$('#forgeStaminaDots').textContent='●'.repeat(Number(s.stamina)||0)+'○'.repeat(5-(Number(s.stamina)||0));staminaText();const itemBonus=equipped.whetstone?2:0;$('#forgeSuccessRate').textContent=!hasSword?'—':level>=30?'완성':`${Number(rates?.success||0)+itemBonus}%`;$('#forgeStayRate').textContent=!hasSword?'—':level>=30?'0%':`${Math.max(0,Number(rates?.stay||0)-itemBonus)}%`;$('#forgeDestroyRate').textContent=!hasSword?'—':level>=30?'0%':`${Number(rates?.destroy||0)}%`;$('#forgeShieldCopy').textContent=`${Number(s.shields||0)}장`;$('#forgeWhetstoneCopy').textContent=`${Number(s.whetstones||0)}개`;syncSlot('shield');syncSlot('whetstone');$('#forgeUseShield').disabled=!hasSword||Number(s.shields||0)<1;$('#forgeUseWhetstone').disabled=!hasSword||Number(s.whetstones||0)<1;$('#forgeSoundToggle').textContent=s.sound_enabled?'🔊':'🔇';$('#forgeSoundToggle').title=s.sound_enabled?'효과음 끄기':'효과음 켜기';$('#forgeDailySupply').disabled=!!s.daily_supply_claimed;$('#forgeDailySupply').textContent=s.daily_supply_claimed?'보급 완료':'🎁 일일 보급';['#forgeHallOpen','#forgeSell','#forgeShowcase'].forEach(selector=>$(selector).disabled=!hasSword||level<1);$('#forgeSellValue').textContent=`(+${money(appraisal)})`;renderLeaderboard(state.leaderboard);renderHistory(state.history);renderGraveyard(state.graveyard);renderStats(state.stats);renderShop();setBusy(false)}
  function resultMessage(result){if(result.outcome==='success')return`✨ 성공! +${result.level_after}강 ${NAMES[result.level_after]}이(가) 탄생했습니다.`;if(result.outcome==='protected_destroy')return'🛡️ 방어 성공! 장인의 보호권이 산산조각나며 검의 파괴를 막아냈습니다!';if(result.outcome==='destroy')return`💥 검이 파괴되었습니다. 위로금 ${money(result.points_gained)}와 파편 ${result.shards_gained}개를 받았습니다.`;return`불꽃이 잦아들었습니다. +${result.level_after}강을 그대로 유지합니다.`}
  function animateResult(result){const card=$('.forge-main-card'),tone=result.outcome==='destroy'?'destroy':result.outcome==='success'?'success':result.outcome==='protected_destroy'?'shield':'fail';card.className=`forge-main-card result-${tone}`;setMessage(resultMessage(result),tone==='destroy'?'destroy':tone==='shield'?'shield':tone==='fail'?'fail':'');sound(tone);vibrate(tone);setTimeout(()=>card.className='forge-main-card',900)}
  async function enhance(grade='normal'){if(busy)return;setBusy(true);try{const response=await global.LabDB.attemptForge({useWhetstone:equipped.whetstone,useShield:equipped.shield,bellowsGrade:grade});state=response;equipped.shield=false;equipped.whetstone=false;render();animateResult(response.result)}catch(error){setMessage(error?.message||'담금질을 완료하지 못했습니다.','fail');setBusy(false)}}
  async function drawSword(){if(busy)return;setBusy(true);try{state=await global.LabDB.drawForgeSword();render();setMessage('🪵 새 수련용 목검을 모루에 올렸습니다.')}catch(error){setMessage(error?.message||'새 목검을 꺼내지 못했습니다.','fail');setBusy(false)}}
  function startEnhance(){if(busy)return;if(state?.sword?.has_sword===false){void drawSword();return}if(Number(state?.sword?.sword_level)>=30)return;primeAudio();if($('#forgeSkipBellows').checked){enhance('normal');return}$('#forgeBellows').classList.remove('hidden');$('#forgeBellowsStop').focus()}
  function closeBellows(){$('#forgeBellows').classList.add('hidden')}
  function stopBellows(){const grade=bellowsGrade($('#forgeGaugeNeedle').getBoundingClientRect(),$('.forge-gauge').getBoundingClientRect());closeBellows();enhance(grade)}
  function toggleSlot(name){if(busy)return;equipped[name]=!equipped[name];syncSlot(name);render()}
  function switchTab(name){$$('[data-forge-tab]').forEach(button=>button.classList.toggle('active',button.dataset.forgeTab===name));$$('[data-forge-pane]').forEach(pane=>pane.classList.toggle('active',pane.dataset.forgePane===name))}
  function openModal(name){const ids={guide:'forgeGuide',hall:'forgeHallModal'};$('#'+ids[name])?.classList.remove('hidden')}
  function closeModal(name){const ids={guide:'forgeGuide',hall:'forgeHallModal'};$('#'+ids[name])?.classList.add('hidden')}
  function renderGuide(){const[icon,title,body]=GUIDE[guideIndex];$('#forgeGuideStep').textContent=`${guideIndex+1} / ${GUIDE.length}`;$('#forgeGuideIcon').textContent=icon;$('#forgeGuideTitle').textContent=title;$('#forgeGuideBody').textContent=body;$('#forgeGuideDots').innerHTML=GUIDE.map((_,index)=>`<i class="${index===guideIndex?'active':''}"></i>`).join('');$('#forgeGuideNext').textContent=guideIndex===GUIDE.length-1?(state?.sword?.tutorial_completed_at?'가이드 닫기':'보너스 받고 시작하기'):'다음'}
  async function nextGuide(){if(guideIndex<GUIDE.length-1){guideIndex++;renderGuide();return}try{if(!state.sword.tutorial_completed_at)state=await global.LabDB.claimForgeTutorial();closeModal('guide');render();setMessage('🎁 웰컴 보너스 100 P와 보호권 1장을 받았습니다.')}catch(error){setMessage(error.message,'fail')}}
  async function buyItem(key){const swordLevel=Number(key.match(/^sword_(\d+)$/)?.[1]||0);if(swordLevel&&!confirm(`현재 검을 +${swordLevel}강 검으로 교체할까요? 기존 검은 사라집니다.`))return;try{state=await global.LabDB.buyForgeItem(key);render();setMessage('상점 교환을 완료했습니다.')}catch(error){setMessage(error.message,'fail')}}
  async function sell(){if(!confirm(`현재 검을 ${money(state.sword.appraisal)}에 판매하고 모루를 비울까요?`))return;try{state=await global.LabDB.sellForgeSword();render();setMessage(`검을 판매해 ${money(state.transaction?.points)}를 받았습니다. 새 목검은 풀무 기운 1개로 꺼낼 수 있습니다.`)}catch(error){setMessage(error.message,'fail')}}
  async function registerHall(event){event.preventDefault();try{state=await global.LabDB.registerForgeHall($('#forgeHallName').value.trim());closeModal('hall');render();setMessage(state.transaction?.best_updated?'새 역대 최고 명검을 등록했습니다!':'명검을 등록했지만 기존 최고 기록은 유지됩니다.')}catch(error){setMessage(error.message,'fail')}}
  async function showcase(){try{await global.LabDB.publishForgeShowcase();setMessage('📢 명검 감정서를 광장 대장간에 발행했습니다.')}catch(error){setMessage(error.message,'fail')}}
  async function obituary(id){try{await global.LabDB.publishForgeObituary(id);state=await global.LabDB.getForgeState();render();setMessage('🕯️ 명검 부고장을 광장 대장간에 발행했습니다.')}catch(error){setMessage(error.message,'fail')}}
  async function claimDaily(){try{state=await global.LabDB.claimForgeDailySupply();render();setMessage('🎁 보호권 1장과 50 P를 받았습니다.')}catch(error){setMessage(error.message,'fail')}}
  async function toggleSound(){try{state=await global.LabDB.updateForgePreferences(state.sword.custom_name||'',false,!state.sword.sound_enabled);render()}catch(error){setMessage(error.message,'fail')}}
  function init(){if(initialized)return;initialized=true;global.ForgeUI?.injectForgeStyles?.();$('#forgeEnhance').addEventListener('click',startEnhance);$('#forgeBellowsStop').addEventListener('click',stopBellows);$('#forgeBellowsCancel').addEventListener('click',closeBellows);$('#forgeUseShield').addEventListener('click',()=>toggleSlot('shield'));$('#forgeUseWhetstone').addEventListener('click',()=>toggleSlot('whetstone'));$('#forgeDailySupply').addEventListener('click',claimDaily);$('#forgeSoundToggle').addEventListener('click',toggleSound);$('#forgeGuideOpen').addEventListener('click',()=>{guideIndex=0;renderGuide();openModal('guide')});$('#forgeHallOpen').addEventListener('click',()=>{$('#forgeHallName').value=state.sword.custom_name||'';openModal('hall')});$('#forgeSell').addEventListener('click',sell);$('#forgeShowcase').addEventListener('click',showcase);$('#forgeHallForm').addEventListener('submit',registerHall);$('#forgeGuideNext').addEventListener('click',nextGuide);$$('[data-forge-close]').forEach(button=>button.addEventListener('click',()=>closeModal(button.dataset.forgeClose)));$$('[data-forge-tab]').forEach(button=>button.addEventListener('click',()=>switchTab(button.dataset.forgeTab)));document.addEventListener('click',event=>{const buy=event.target.closest('[data-forge-buy]');if(buy)buyItem(buy.dataset.forgeBuy);const grave=event.target.closest('[data-forge-obituary]');if(grave)obituary(Number(grave.dataset.forgeObituary))});setInterval(staminaText,1000)}
  async function open(){init();setBusy(true);setMessage('대장간의 불을 지피는 중…');try{state=await global.LabDB.getForgeState();render();setMessage(state.sword.has_sword===false?'모루가 비어 있습니다. 풀무 기운 1개로 새 목검을 꺼내세요.':Number(state.sword.sword_level)>=30?'창세의 신화검이 완성되었습니다.':'망치를 들고 담금질을 시작해 보세요.');if(!state.sword.tutorial_completed_at){guideIndex=0;renderGuide();openModal('guide')}}catch(error){setMessage(error?.message||'대장간을 불러오지 못했습니다.','fail');setBusy(false)}}
  global.HaruForgeUI={NAMES,SALES,SHOP,open,tierFor,auraFor,gradeFor,bellowsGrade,renderSwordSvg,publicationCard,outcomeCopy};
})(typeof window!=='undefined'?window:globalThis);
