/* ============================================================
   雨神大戰爭 —— 美術資源檔 raingod-art.js
   包含：角色/敵人名單、SVG 造型繪製、動作特效庫
   ============================================================ */
window.RainGodArt = (function () {
  'use strict';

  /* ---------- 屬性 / 稀有度 ---------- */
  const ATTRS = ['紅', '飛', '聖', '星', '屍', '無'];
  const RARITIES = ['R', 'SR', 'SSR', 'UBER', 'UR', 'EX'];

  const RARITY_SCALE = { R: 1.00, SR: 1.06, SSR: 1.12, UBER: 1.20, UR: 1.28, EX: 1.38 };

  // ★ 冷卻時間（秒）—— 基礎 R 只要 5 秒
  const RARITY_CD = { R: 5, SR: 6, SSR: 8, UBER: 10, UR: 12, EX: 15 };

  const PREFIX_EVO1 = ['強化型', '進階·', '狂暴的', '覺醒·', '極致·', '真力·', '超能·', '霸者·', '滅世·', '天啟·'];
  const PREFIX_EVO2 = ['神超絕·', '超光速·', '萬劫天尊·', '宇宙主宰·', '終極降臨·', '創世神光·', '毀滅之眼·', '無上尊者·', '星穹之主·', '混沌原初·'];

  /* ============================================================
     SVG 造型繪製
     ============================================================ */
  function mkEye(cx, cy, r, color) {
    color = color || '#15151f';
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>` +
      `<circle cx="${(cx - r * 0.34).toFixed(1)}" cy="${(cy - r * 0.34).toFixed(1)}" r="${(r * 0.38).toFixed(1)}" fill="#fff" opacity=".92"/>`;
  }

  /* ---- 獸型 ---- */
  function shapeBeast(a) {
    const { c1, c2, accent } = a;
    return `
    <path d="M20 70 Q5 62 9 45" stroke="${c2}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <rect x="30" y="74" width="9" height="16" rx="4.5" fill="${c2}"/>
    <rect x="56" y="74" width="9" height="16" rx="4.5" fill="${c2}"/>
    <ellipse cx="48" cy="64" rx="25" ry="19" fill="${c1}"/>
    <path d="M40 27 L33 7 L55 20 Z" fill="${c2}"/>
    <path d="M67 21 L76 5 L78 26 Z" fill="${c2}"/>
    <circle cx="55" cy="37" r="20" fill="${c1}"/>
    <ellipse cx="65" cy="44" rx="10" ry="7" fill="${c2}"/>
    <circle cx="65" cy="41" r="3" fill="#2b1a14"/>
    ${mkEye(50, 34, 3.7)}${mkEye(66, 34, 3.7)}
    <circle cx="78" cy="43" r="3.2" fill="${accent}" opacity=".9"/>`;
  }

  /* ---- 水滴／軟體型 ---- */
  function shapeBlob(a) {
    const { c1, c2 } = a;
    return `
    <path d="M50 6 C66 30 84 48 84 62 A34 34 0 0 1 16 62 C16 48 34 30 50 6 Z" fill="${c1}"/>
    <path d="M50 16 C61 34 72 50 72 61 A22 22 0 0 1 28 61 C28 50 39 34 50 16 Z" fill="${c2}" opacity=".42"/>
    <ellipse cx="35" cy="45" rx="5" ry="9" fill="#fff" opacity=".42" transform="rotate(-22 35 45)"/>
    ${mkEye(41, 58, 4.3)}${mkEye(59, 58, 4.3)}
    <path d="M44 70 Q50 76 56 70" stroke="#0b2231" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".55"/>`;
  }

  /* ---- 人型 ---- */
  function shapeHuman(a) {
    const { c1, c2, accent } = a;
    return `
    <rect x="37" y="68" width="11" height="26" rx="5.5" fill="${c2}"/>
    <rect x="52" y="68" width="11" height="26" rx="5.5" fill="${c2}"/>
    <rect x="19" y="40" width="11" height="27" rx="5.5" fill="${c2}"/>
    <rect x="70" y="40" width="11" height="27" rx="5.5" fill="${c2}"/>
    <path d="M50 26 L72 40 L66 72 L34 72 L28 40 Z" fill="${c1}"/>
    <path d="M50 31 L66 42 L60 66 L40 66 L34 42 Z" fill="${accent}" opacity=".33"/>
    <circle cx="50" cy="23" r="16" fill="#f2d2b6"/>
    <path d="M33 21 Q50 1 67 21 Q60 11 50 11 Q40 11 33 21 Z" fill="${c2}"/>
    ${mkEye(44, 23, 3.3)}${mkEye(56, 23, 3.3)}
    <path d="M45 32 Q50 36 55 32" stroke="#c98a7a" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  }

  /* ---- 飛行型 ---- */
  function shapeFlier(a) {
    const { c1, c2, accent } = a;
    return `
    <path d="M34 52 Q4 24 2 62 Q14 60 31 58 Z" fill="${accent}" opacity=".9"/>
    <path d="M66 52 Q96 24 98 62 Q86 60 69 58 Z" fill="${accent}" opacity=".9"/>
    <path d="M34 52 Q12 34 10 58 Z" fill="${c2}" opacity=".55"/>
    <path d="M66 52 Q88 34 90 58 Z" fill="${c2}" opacity=".55"/>
    <path d="M40 79 L44 93 L48 79 Z" fill="${accent}"/>
    <path d="M52 79 L56 93 L60 79 Z" fill="${accent}"/>
    <ellipse cx="50" cy="60" rx="17" ry="21" fill="${c1}"/>
    <circle cx="50" cy="31" r="16" fill="${c1}"/>
    <path d="M50 7 L43 22 L57 22 Z" fill="${c2}"/>
    ${mkEye(44, 29, 3.3)}${mkEye(56, 29, 3.3)}
    <path d="M43 39 L50 49 L57 39 Z" fill="${c2}"/>`;
  }

  /* ---- 幽靈型 ---- */
  function shapeGhost(a) {
    const { c1, c2 } = a;
    return `
    <path d="M50 8 C74 8 84 28 84 50 L84 86 Q74 75 66 86 Q58 97 50 86 Q42 75 34 86 L16 86 L16 50 C16 28 26 8 50 8 Z" fill="${c1}" opacity=".93"/>
    <path d="M50 19 C66 19 74 34 74 50 L74 72 Q66 63 60 72 Q54 81 48 72 Q40 63 32 72 L26 72 L26 50 C26 34 34 19 50 19 Z" fill="${c2}" opacity=".34"/>
    ${mkEye(41, 44, 4.5)}${mkEye(59, 44, 4.5)}
    <ellipse cx="50" cy="62" rx="7" ry="5" fill="#0f0f18" opacity=".65"/>`;
  }

  /* ---- 石像／巨人型 ---- */
  function shapeGolem(a) {
    const { c1, c2, accent } = a;
    return `
    <rect x="24" y="70" width="18" height="26" rx="5" fill="${c2}"/>
    <rect x="58" y="70" width="18" height="26" rx="5" fill="${c2}"/>
    <rect x="3" y="34" width="16" height="43" rx="8" fill="${c2}"/>
    <rect x="81" y="34" width="16" height="43" rx="8" fill="${c2}"/>
    <rect x="22" y="29" width="56" height="48" rx="12" fill="${c1}"/>
    <rect x="34" y="6" width="32" height="27" rx="9" fill="${c1}"/>
    <rect x="39" y="15" width="22" height="9" rx="4" fill="${accent}" opacity=".85"/>
    ${mkEye(43, 18, 3.2, '#101820')}${mkEye(57, 18, 3.2, '#101820')}
    <path d="M35 41 L65 41 M35 54 L65 54" stroke="${accent}" stroke-width="3" opacity=".35" stroke-linecap="round"/>`;
  }

  /* ---- 機械型 ---- */
  function shapeMech(a) {
    const { c1, c2, accent } = a;
    return `
    <rect x="28" y="70" width="15" height="26" rx="4" fill="${c2}"/>
    <rect x="57" y="70" width="15" height="26" rx="4" fill="${c2}"/>
    <rect x="8" y="38" width="14" height="38" rx="7" fill="${c2}"/>
    <rect x="78" y="38" width="14" height="38" rx="7" fill="${c2}"/>
    <rect x="24" y="30" width="52" height="44" rx="10" fill="${c1}"/>
    <rect x="34" y="8" width="32" height="24" rx="7" fill="${c1}"/>
    <rect x="39" y="15" width="22" height="10" rx="5" fill="${accent}"/>
    <circle cx="45" cy="20" r="2.6" fill="#06141a"/>
    <circle cx="55" cy="20" r="2.6" fill="#06141a"/>
    <path d="M50 8 L50 0" stroke="${c2}" stroke-width="3" stroke-linecap="round"/>
    <circle cx="50" cy="0" r="3.4" fill="${accent}"/>
    <rect x="32" y="42" width="36" height="7" rx="3.5" fill="${accent}" opacity=".4"/>`;
  }

  /* ---- 蛇型 ---- */
  function shapeSerpent(a) {
    const { c1, c2, accent } = a;
    return `
    <path d="M16 90 Q48 90 48 64 Q48 38 74 38" stroke="${c1}" stroke-width="18" fill="none" stroke-linecap="round"/>
    <path d="M16 90 Q48 90 48 64 Q48 38 74 38" stroke="${c2}" stroke-width="6" fill="none" stroke-linecap="round" opacity=".5"/>
    <circle cx="76" cy="37" r="17" fill="${c1}"/>
    ${mkEye(70, 33, 3.7)}${mkEye(83, 33, 3.7)}
    <path d="M76 52 L71 63 L81 63 Z" fill="${c2}"/>
    <circle cx="93" cy="43" r="4" fill="${accent}" opacity=".9"/>`;
  }

  const SHAPE_FN = {
    beast: shapeBeast, blob: shapeBlob, human: shapeHuman, flier: shapeFlier,
    ghost: shapeGhost, golem: shapeGolem, mech: shapeMech, serpent: shapeSerpent
  };

  /* ============================================================
     主題美術 / 敵人美術
     ============================================================ */
  const THEME_ART = [
    { shape: 'beast', c1: '#f6b93b', c2: '#e58e26', accent: '#00d4ff', scale: 0.95, skill: '喵喵水刃' },
    { shape: 'blob', c1: '#4fc3f7', c2: '#0288d1', accent: '#b3e5fc', scale: 0.78, skill: '細雨穿刺' },
    { shape: 'beast', c1: '#ffe066', c2: '#f6b93b', accent: '#fffde7', scale: 0.90, skill: '幼雷奔騰' },
    { shape: 'beast', c1: '#ff7043', c2: '#d84315', accent: '#ffd54f', scale: 1.00, skill: '烈焰撕咬' },
    { shape: 'human', c1: '#f5f0e1', c2: '#ffe082', accent: '#fff9c4', scale: 0.95, skill: '聖光洗禮' },
    { shape: 'flier', c1: '#9c6ade', c2: '#673ab7', accent: '#e040fb', scale: 1.05, skill: '虛空吐息' },
    { shape: 'human', c1: '#cfd8dc', c2: '#90a4ae', accent: '#eceff1', scale: 0.90, skill: '枯骨斬擊' },
    { shape: 'mech', c1: '#37474f', c2: '#90a4ae', accent: '#4dd0e1', scale: 0.88, skill: '冰爆滑行' },
    { shape: 'golem', c1: '#78909c', c2: '#546e7a', accent: '#b0bec5', scale: 1.15, skill: '石破天驚' },
    { shape: 'ghost', c1: '#ab47bc', c2: '#6a1b9a', accent: '#ff80ab', scale: 1.10, skill: '觸手絞殺' },
    { shape: 'beast', c1: '#eceff1', c2: '#b0bec5', accent: '#81d4fa', scale: 1.12, skill: '極地重踏' },
    { shape: 'beast', c1: '#ffffff', c2: '#e1bee7', accent: '#f8bbd0', scale: 1.00, skill: '幻夢角擊' },
    { shape: 'human', c1: '#37474f', c2: '#1c262b', accent: '#ff5252', scale: 0.95, skill: '影襲斬' },
    { shape: 'flier', c1: '#ff8a65', c2: '#e64a19', accent: '#ffd54f', scale: 0.95, skill: '浴火雛擊' },
    { shape: 'beast', c1: '#ffb74d', c2: '#ef6c00', accent: '#4dd0e1', scale: 0.95, skill: '狐火幻影' },
    { shape: 'golem', c1: '#a1887f', c2: '#6d4c41', accent: '#ffca28', scale: 1.50, skill: '泰坦震地' },
    { shape: 'flier', c1: '#90caf9', c2: '#1e88e5', accent: '#e3f2fd', scale: 1.00, skill: '暴風俯衝' },
    { shape: 'flier', c1: '#a5d6a7', c2: '#4db6ac', accent: '#e1f5fe', scale: 0.85, skill: '極光閃耀' },
    { shape: 'ghost', c1: '#7e57c2', c2: '#4527a0', accent: '#b39ddb', scale: 1.05, skill: '噬魂魔爪' },
    { shape: 'mech', c1: '#546e7a', c2: '#37474f', accent: '#ffca28', scale: 1.25, skill: '超載重拳' },
    { shape: 'golem', c1: '#bf360c', c2: '#ff5722', accent: '#ffca28', scale: 1.25, skill: '熔岩噴發' },
    { shape: 'ghost', c1: '#f48fb1', c2: '#ec407a', accent: '#b2ebf2', scale: 0.90, skill: '電光觸鬚' },
    { shape: 'beast', c1: '#8d6e63', c2: '#5d4037', accent: '#ffca28', scale: 1.05, skill: '狂野衝撞' },
    { shape: 'serpent', c1: '#66bb6a', c2: '#2e7d32', accent: '#cddc39', scale: 1.20, skill: '毒藤纏繞' },
    { shape: 'golem', c1: '#ffd54f', c2: '#ffa000', accent: '#fff8e1', scale: 1.30, skill: '守護聖裁' },
    { shape: 'ghost', c1: '#4a148c', c2: '#6a1b9a', accent: '#69f0ae', scale: 1.00, skill: '亡靈召喚' },
    { shape: 'mech', c1: '#00bcd4', c2: '#006064', accent: '#18ffff', scale: 1.05, skill: '雷射掃射' },
    { shape: 'blob', c1: '#1e88e5', c2: '#0d47a1', accent: '#84ffff', scale: 1.40, skill: '深淵巨浪' },
    { shape: 'flier', c1: '#42a5f5', c2: '#1565c0', accent: '#fff176', scale: 1.35, skill: '風暴龍息' },
    { shape: 'human', c1: '#26c6da', c2: '#00695c', accent: '#ffd54f', scale: 1.45, skill: '終焉豪雨' }
  ];

  const ENEMY_ART = [
    { shape: 'golem', c1: '#e53935', c2: '#b71c1c', accent: '#ffca28', scale: 1.00 },
    { shape: 'ghost', c1: '#80deea', c2: '#26c6da', accent: '#e0f7fa', scale: 0.95 },
    { shape: 'human', c1: '#fff8e1', c2: '#ffd54f', accent: '#ffffff', scale: 0.95 },
    { shape: 'serpent', c1: '#7cb342', c2: '#33691e', accent: '#d4e157', scale: 1.00 },
    { shape: 'human', c1: '#7cb342', c2: '#558b2f', accent: '#aed581', scale: 0.95 },
    { shape: 'beast', c1: '#9e9e9e', c2: '#616161', accent: '#e0e0e0', scale: 0.90 },
    { shape: 'beast', c1: '#e53935', c2: '#b71c1c', accent: '#ffca28', scale: 1.15 },
    { shape: 'flier', c1: '#6a1b9a', c2: '#4a148c', accent: '#ce93d8', scale: 1.05 },
    { shape: 'mech', c1: '#78909c', c2: '#455a64', accent: '#4dd0e1', scale: 1.05 },
    { shape: 'human', c1: '#eceff1', c2: '#b0bec5', accent: '#ffffff', scale: 0.95 },
    { shape: 'serpent', c1: '#ef5350', c2: '#b71c1c', accent: '#ffab91', scale: 1.05 },
    { shape: 'beast', c1: '#e0f7fa', c2: '#80deea', accent: '#4dd0e1', scale: 1.00 },
    { shape: 'ghost', c1: '#4a148c', c2: '#6a1b9a', accent: '#b39ddb', scale: 1.05 },
    { shape: 'golem', c1: '#fff59d', c2: '#fbc02d', accent: '#ffffff', scale: 1.10 },
    { shape: 'human', c1: '#8d6e63', c2: '#4e342e', accent: '#a1887f', scale: 0.95 },
    { shape: 'flier', c1: '#ff7043', c2: '#bf360c', accent: '#ffd54f', scale: 1.25 },
    { shape: 'flier', c1: '#fff176', c2: '#f9a825', accent: '#fffde7', scale: 1.00 },
    { shape: 'ghost', c1: '#69f0ae', c2: '#00c853', accent: '#b9f6ca', scale: 1.00 },
    { shape: 'flier', c1: '#311b92', c2: '#1a237e', accent: '#7c4dff', scale: 1.15 },
    { shape: 'human', c1: '#37474f', c2: '#263238', accent: '#90a4ae', scale: 1.10 },
    { shape: 'golem', c1: '#6d4c41', c2: '#3e2723', accent: '#ff7043', scale: 1.35 },
    { shape: 'flier', c1: '#4dd0e1', c2: '#00838f', accent: '#e0f7fa', scale: 1.10 },
    { shape: 'mech', c1: '#607d8b', c2: '#37474f', accent: '#ff5252', scale: 1.40 },
    { shape: 'golem', c1: '#b0bec5', c2: '#546e7a', accent: '#80cbc4', scale: 1.20 },
    { shape: 'golem', c1: '#ffd54f', c2: '#f9a825', accent: '#ffffff', scale: 1.45 }
  ];

  const THEMES = [
    { name: '雨神貓', attr: '無' }, { name: '水滴精靈', attr: '星' },
    { name: '雷霆幼獸', attr: '飛' }, { name: '熾焰烈犬', attr: '紅' },
    { name: '聖光幼天使', attr: '聖' }, { name: '虛空幼龍', attr: '星' },
    { name: '骷髏戰士', attr: '屍' }, { name: '機械企鵝', attr: '無' },
    { name: '石像鬼', attr: '飛' }, { name: '深海巨章', attr: '紅' },
    { name: '雪域冰熊', attr: '無' }, { name: '夢幻獨角獸', attr: '聖' },
    { name: '暗影獵手', attr: '屍' }, { name: '鳳凰幼雛', attr: '紅' },
    { name: '幻象狐仙', attr: '星' }, { name: '泰坦巨人', attr: '無' },
    { name: '暴風神鷹', attr: '飛' }, { name: '極光仙子', attr: '聖' },
    { name: '冥界噬魂者', attr: '屍' }, { name: '機械巨魔', attr: '星' },
    { name: '熔岩怪獸', attr: '紅' }, { name: '海芒水母', attr: '星' },
    { name: '狂暴野豬', attr: '無' }, { name: '毒藤巨獸', attr: '飛' },
    { name: '天界守護神', attr: '聖' }, { name: '死靈術士', attr: '屍' },
    { name: '賽博機器人', attr: '星' }, { name: '深淵巨鯨', attr: '紅' },
    { name: '風暴神龍', attr: '飛' }, { name: '終極雨神尊', attr: '無' }
  ];

  const THEME_MOTIONS = [
    'pounce', 'float', 'charge', 'chomp', 'flap', 'stomp', 'crawl', 'march', 'stomp', 'float',
    'stomp', 'pounce', 'charge', 'flap', 'pounce', 'stomp', 'flap', 'float', 'float', 'march',
    'stomp', 'float', 'charge', 'slither', 'march', 'float', 'march', 'float', 'flap', 'stomp'
  ];

  /* ============================================================
     角色 SVG 生成（外部唯一入口）
     ============================================================ */
  function buildCharSVG(art, formIdx, size, side, extraScale) {
    const fn = SHAPE_FN[art.shape] || shapeBeast;
    const inner = fn(art);
    const fs = 1 + formIdx * 0.09;
    const total = size * fs * (extraScale || 1);
    const flip = side === 'enemy' ? 'transform:scaleX(-1);' : '';
    return `<svg viewBox="0 0 100 100" width="${total.toFixed(1)}" height="${total.toFixed(1)}" style="display:block;overflow:visible;${flip}">${inner}</svg>`;
  }

  /* ============================================================
     攻擊特效庫
     ============================================================ */
  const FX_DEF = {
    fire:      { cls: 'fx-fire',      size: 26 },
    lightning: { cls: 'fx-lightning', size: 30 },
    holy:      { cls: 'fx-holy',      size: 28 },
    water:     { cls: 'fx-water',     size: 26 },
    dark:      { cls: 'fx-dark',      size: 28 },
    wave:      { cls: 'fx-wave',      size: 30 }
  };

  function makeProjectile(type) {
    const def = FX_DEF[type] || FX_DEF.fire;
    const el = document.createElement('div');
    el.className = 'battle-projectile ' + def.cls;
    el.style.width = def.size + 'px';
    el.style.height = def.size + 'px';
    el.style.transform = 'translate(-50%,-50%)';
    return el;
  }

  function getAttackType(attr, isArea) {
    const types = { '紅': 'fire', '飛': 'lightning', '聖': 'holy', '星': 'water', '屍': 'dark' };
    if (attr === '無') return isArea ? 'wave' : 'melee';
    return types[attr] || (isArea ? 'wave' : 'melee');
  }

  /* ============================================================
     資料生成：500 神靈 + 120 怪獸
     ============================================================ */
  const CHARS = {};
  const ENEMIES = {};

  function generateGods() {
    for (let i = 1; i <= 500; i++) {
      const id = `god_${i}`;
      const themeIdx = (i - 1) % THEMES.length;
      const theme = THEMES[themeIdx];
      const art = THEME_ART[themeIdx];
      const cycle = Math.floor((i - 1) / THEMES.length);

      const rIdx = i % 12 === 0 ? 5 : (i % 8 === 0 ? 4 : (i % 5 === 0 ? 3 : (i % 3 === 0 ? 2 : (i % 2 === 0 ? 1 : 0))));
      const rarity = RARITIES[rIdx];

      const nameBase = cycle === 0 ? theme.name : `${theme.name} ${i}代`;
      const form1 = nameBase;
      const form2 = `${PREFIX_EVO1[i % PREFIX_EVO1.length]}${nameBase}`;
      const form3 = `${PREFIX_EVO2[i % PREFIX_EVO2.length]}${nameBase}`;
      const skill = art.skill + (cycle > 0 ? `・${'零一二三四五六七八九十'[cycle] || cycle}式` : '');

      const isArea = rIdx >= 2 || i % 2 === 0;
      const baseHp = 180 + rIdx * 280 + i * 12;
      const baseAtk = 35 + rIdx * 75 + i * 4;
      const cost = 60 + rIdx * 150 + Math.floor(i * 2.5);

      CHARS[id] = {
        id, name: form1, rarity, themeIdx,
        formNames: [form1, form2, form3],
        skill,
        targetAttr: theme.attr,
        isArea,
        motion: THEME_MOTIONS[themeIdx],
        hp: Math.floor(baseHp),
        atk: Math.floor(baseAtk),
        cost: Math.min(3000, Math.floor(cost)),
        // ★ 新的冷卻：R=5 / SR=6 / SSR=8 / UBER=10 / UR=12 / EX=15
        cd: RARITY_CD[rarity],
        range: 50 + ((i * 7) % 150),
        spd: parseFloat((1.0 + (i % 4) * 0.3).toFixed(1)),
        sizeK: art.scale * RARITY_SCALE[rarity]
      };
    }
  }

  function generateEnemies() {
    const enemyTypes = [
      { name: '小紅惡魔',   attr: '紅', motion: 'stomp'  },
      { name: '幽靈水母',   attr: '飛', motion: 'float'  },
      { name: '邪教天使',   attr: '聖', motion: 'flap'   },
      { name: '外星毒蛛',   attr: '星', motion: 'crawl'  },
      { name: '腐爛喪屍',   attr: '屍', motion: 'crawl'  },
      { name: '無名野犬',   attr: '無', motion: 'chomp'  },
      { name: '赤焰野豬',   attr: '紅', motion: 'charge' },
      { name: '蝙蝠魔王',   attr: '飛', motion: 'flap'   },
      { name: '機械守衛',   attr: '星', motion: 'march'  },
      { name: '骷髏戰將',   attr: '屍', motion: 'crawl'  },
      { name: '狂暴巨蜥',   attr: '紅', motion: 'crawl'  },
      { name: '極地白狼',   attr: '無', motion: 'chomp'  },
      { name: '虛空魔眼',   attr: '星', motion: 'float'  },
      { name: '天界執刑者', attr: '聖', motion: 'march'  },
      { name: '巫毒偶人',   attr: '屍', motion: 'crawl'  },
      { name: '烈焰巨龍',   attr: '紅', motion: 'flap'   },
      { name: '雷霆夜鶯',   attr: '飛', motion: 'flap'   },
      { name: '星際異形',   attr: '星', motion: 'float'  },
      { name: '墮落大天使', attr: '聖', motion: 'flap'   },
      { name: '不朽屍王',   attr: '屍', motion: 'crawl'  },
      { name: '深淵巨魔',   attr: '紅', motion: 'stomp'  },
      { name: '極光巨鳥',   attr: '飛', motion: 'flap'   },
      { name: '機械霸王龍', attr: '星', motion: 'stomp'  },
      { name: '亡靈騎士',   attr: '屍', motion: 'charge' },
      { name: '聖殿巨神',   attr: '聖', motion: 'stomp'  }
    ];

    for (let i = 1; i <= 120; i++) {
      const id = `enemy_${i}`;
      const ai = (i - 1) % enemyTypes.length;
      const base = enemyTypes[ai];
      const art = ENEMY_ART[ai];
      const mult = 1 + i * 0.3;

      ENEMIES[id] = {
        id, name: `${base.name} Lv.${i}`,
        attr: base.attr, motion: base.motion, artIdx: ai,
        hp: Math.floor(220 * mult),
        atk: Math.floor(30 * mult),
        spd: parseFloat((0.8 + (i % 3) * 0.2).toFixed(1)),
        range: 45 + (i % 3) * 15,
        reward: 40 + i * 15,
        sizeK: art.scale
      };
    }
  }

  generateGods();
  generateEnemies();

  /* ---------- 對外暴露 ---------- */
  return {
    ATTRS, RARITIES, RARITY_SCALE, RARITY_CD,
    PREFIX_EVO1, PREFIX_EVO2,
    SHAPE_FN, THEME_ART, ENEMY_ART, THEMES, THEME_MOTIONS,
    buildCharSVG, FX_DEF, makeProjectile, getAttackType,
    CHARS, ENEMIES
  };
})();
