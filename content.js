/* ============================================================
   RAINGOD | content.js  ── 活動與平衡資料檔（經常更新）
   ------------------------------------------------------------
   這個檔案只放「會調整的內容」，不含遊戲邏輯：
     · 活動橫幅（EVENT）
     · 關卡表、敵人素質、難度曲線
     · 寵物定義、抽寵機率、重量
     · 農場種子、變異、土地、灑水、製造機
     · 主動技能表（名稱 / 超武名 / 說明）
     · 造型定義
     · 經濟與平衡數值（BALANCE）
   修改這裡不會動到遊戲引擎（core.js）。
   ============================================================ */
window.RG_CONTENT = (function () {
'use strict';

/* ── 1. 活動設定（最常改） ─────────────────────────────── */
const EVENT = {
    enabled: true,
    title: 'RAINGOD 週年慶',
    bannerText: '每三十分鐘有玩聖節活動！',
    start: '2024-01-01',
    end: '2030-12-31'
};

/* ── 2. 地圖 / 關卡 ───────────────────────────────────── */
const MAP_RADIUS = 3200;
const MAX_ENEMIES = 35;
const MAX_STAGES = 100;

const STAGES = (function buildStages(n) {
    const arr = [];
    const baseHp = 800;
    for (let i = 1; i <= n; i++) {
        const spawnCd = Math.max(10, 90 - Math.floor((i - 1) * 0.75));
        const bossHp = Math.round(baseHp * Math.pow(1.1, i - 1));
        arr.push({ name: i + '. 關卡', spawnCd: spawnCd, bossHp: bossHp, bossAt: 90 });
    }
    return arr;
})(MAX_STAGES);

/* ── 3. 敵人素質 ──────────────────────────────────────── */
const ENEMY_STATS = {
    MELEE:  { r:22, hp:90,  speed:1.25, dmg:0.5,  exp:10, color:'#4b9b4b', eye:'#fff' },
    SHOOTER:{ r:20, hp:70,  speed:0.70, dmg:0.4,  exp:13, color:'#b95cff', eye:'#ffea00' },
    FAST:   { r:18, hp:65,  speed:2.05, dmg:0.35, exp:9,  color:'#2acbff', eye:'#fff' },
    TANK:   { r:30, hp:230, speed:0.55, dmg:1.3,  exp:26, color:'#6d4c41', eye:'#ffbba0' },
    FLY:    { r:18, hp:80,  speed:1.55, dmg:0.45, exp:14, color:'#f06292', eye:'#fff' },
    ELITE:  { r:30, hp:360, speed:1.35, dmg:1.8,  exp:40, color:'#ff9100', eye:'#fff' }
};

/* ── 4. 寵物定義 ──────────────────────────────────────── */
const PET_DEFS = {
    sprout: { name:'嫩芽貓', rarity:'普通', color:'#78c850', damage:0.05, assist:0.5 },
    pebble: { name:'石甲龜', rarity:'普通', color:'#9e9e9e', defense:0.05, assist:0.5 },
    spark: { name:'電光鼠', rarity:'普通', color:'#fdd835', assist:1.2 },
    mist: { name:'薄霧狐', rarity:'普通', color:'#64b5f6', shield:0.05, assist:0.5 },
    puddle: { name:'水滴蛙', rarity:'普通', color:'#4dd0e1', assist:0.65 },
    ember: { name:'炭火蜥', rarity:'普通', color:'#ff8a65', damage:0.02, assist:0.7 },
    cloud: { name:'棉雲羊', rarity:'普通', color:'#eceff1', defense:0.02, assist:0.55 },
    acorn: { name:'橡果松鼠', rarity:'普通', color:'#bc8b52', assist:0.8 },
    shell: { name:'潮汐寄居蟹', rarity:'普通', color:'#ef9a9a', defense:0.03, assist:0.6 },
    blade: { name:'小刀蜂', rarity:'稀有', color:'#ff7043', damage:0.05, assist:1.5 },
    bulwark: { name:'守護熊', rarity:'稀有', color:'#8d6e63', defense:0.05, shield:0.05, assist:0.8 },
    frost: { name:'霜角兔', rarity:'稀有', color:'#80deea', damage:0.04, assist:1.6 },
    bloom: { name:'花冠鹿', rarity:'稀有', color:'#f48fb1', shield:0.06, assist:1.3 },
    volt: { name:'雷鳴狼', rarity:'稀有', color:'#7986cb', damage:0.07, assist:1.8 },
    shellion: { name:'鐵甲獅', rarity:'稀有', color:'#d4a373', defense:0.08, assist:1.4 },
    comet: { name:'彗星鳥', rarity:'史詩', color:'#ab47bc', damage:0.05, assist:2.2 },
    crystal: { name:'晶角鹿', rarity:'史詩', color:'#4dd0e1', damage:0.08, assist:2.5 },
    phantom: { name:'幻影貂', rarity:'史詩', color:'#9575cd', shield:0.1, assist:2.4 },
    magma: { name:'熔岩龍蜥', rarity:'史詩', color:'#ff5252', damage:0.12, assist:2.8 },
    nebula: { name:'星雲水母', rarity:'史詩', color:'#7e57c2', defense:0.06, shield:0.08, assist:2.6 },
    thunderbird: { name:'雷翼鷹', rarity:'史詩', color:'#ffd54f', damage:0.1, assist:2.7 },
    oracle: { name:'微光神寵', rarity:'神寵', color:'#fff176', damage:1, assist:3 },
    sunlion: { name:'日耀聖獅', rarity:'神寵', color:'#ffca28', damage:0.18, assist:4.2 },
    abyss: { name:'深淵海龍', rarity:'神寵', color:'#26c6da', damage:0.15, defense:0.12, assist:4.5 },
    stardragon: { name:'星辰古龍', rarity:'神寵', color:'#ce93d8', damage:0.22, assist:5 },
    timefox: { name:'時空靈狐', rarity:'神寵', color:'#90caf9', shield:0.15, damage:0.12, assist:4.8 }
};

const PET_POOLS = {
    god: ['oracle','sunlion','abyss','stardragon','timefox'],
    epic: ['comet','crystal','phantom','magma','nebula','thunderbird'],
    rare: ['blade','bulwark','frost','bloom','volt','shellion'],
    common: ['sprout','pebble','spark','mist','puddle','ember','cloud','acorn','shell']
};
/* 抽寵機率門檻：r < god → 神寵；< epic → 史詩；< rare → 稀有；其餘普通 */
const PET_ROLL_RATES = { god: 0.005, epic: 0.10, rare: 0.38 };
/* 各稀有度重量下限（上限固定 5.00 kg） */
const PET_WEIGHT_MIN = { '神寵':2.5, '史詩':1.8, '稀有':1.0, '普通':0.5 };

/* ── 5. 農場 ──────────────────────────────────────────── */
const FARM_SEEDS = [
    { id:'sprout', name:'芽芽種子', cost:10, growMs:60 * 1000, yield:18, plant:'🌱', fruit:'🍓', form:'leaf', color:'#64b85e', fruitColor:'#ed6875', category:'蔬菜' },
    { id:'carrot', name:'甜蘿蔔種子', cost:25, growMs:2 * 60 * 1000, yield:45, plant:'🌿', fruit:'🥕', form:'root', color:'#5baf55', fruitColor:'#f08a43', category:'蔬菜' },
    { id:'berry', name:'星莓種子', cost:45, growMs:5 * 60 * 1000, yield:82, plant:'🌿', fruit:'🫐', form:'bush', color:'#4fa05c', fruitColor:'#5a74d8', category:'水果' },
    { id:'tomato', name:'紅寶番茄種子', cost:90, growMs:10 * 60 * 1000, yield:170, plant:'🌱', fruit:'🍅', form:'bush', color:'#58a853', fruitColor:'#e45445', category:'蔬菜' },
    { id:'moon', name:'月光種子', cost:180, growMs:30 * 60 * 1000, yield:360, plant:'🌾', fruit:'🌙', form:'grain', color:'#80b875', fruitColor:'#f4e69a', category:'奇幻' },
    { id:'blossom', name:'幻光花種子', cost:420, growMs:60 * 60 * 1000, yield:900, plant:'🌷', fruit:'🔮', form:'flower', color:'#4f9c62', fruitColor:'#c787ed', category:'花卉' },
    { id:'crystal', name:'晶核種子', cost:950, growMs:6 * 60 * 60 * 1000, yield:2200, plant:'🪴', fruit:'💎', form:'crystal', color:'#579c91', fruitColor:'#81eff0', category:'奇幻' },
    { id:'dragonfruit', name:'龍焰果種子', cost:3500, growMs:18 * 60 * 60 * 1000, yield:7600, plant:'🌺', fruit:'🐉', form:'cactus', color:'#3f9b66', fruitColor:'#e75a73', category:'奇幻' },
    { id:'worldtree', name:'世界樹種子', cost:12000, growMs:72 * 60 * 60 * 1000, yield:30000, plant:'🌳', fruit:'🌟', form:'tree', color:'#43885d', fruitColor:'#f4d46c', category:'奇幻' },
    { id:'potato', name:'金心馬鈴薯種子', cost:32, growMs:4 * 60 * 1000, yield:55, plant:'🌿', fruit:'🥔', form:'root', color:'#70a84b', fruitColor:'#dfbd79', category:'蔬菜' },
    { id:'corn', name:'琥珀玉米種子', cost:80, growMs:8 * 60 * 1000, yield:150, plant:'🌾', fruit:'🌽', form:'grain', color:'#65a74d', fruitColor:'#f2c750', category:'蔬菜' },
    { id:'sunflower', name:'向陽花種子', cost:150, growMs:12 * 60 * 1000, yield:310, plant:'🌻', fruit:'🌻', form:'flower', color:'#4f9c55', fruitColor:'#f5bf45', category:'花卉' },
    { id:'pumpkin', name:'萬聖南瓜種子', cost:260, growMs:20 * 60 * 1000, yield:540, plant:'🍃', fruit:'🎃', form:'gourd', color:'#55984e', fruitColor:'#f28b37', category:'蔬菜' },
    { id:'pepper', name:'火焰椒種子', cost:330, growMs:25 * 60 * 1000, yield:700, plant:'🌿', fruit:'🌶️', form:'bush', color:'#4f9a52', fruitColor:'#dc4d43', category:'蔬菜' },
    { id:'grape', name:'紫晶葡萄種子', cost:520, growMs:35 * 60 * 1000, yield:1100, plant:'🌿', fruit:'🍇', form:'vine', color:'#4d975b', fruitColor:'#8855c7', category:'水果' },
    { id:'watermelon', name:'清涼西瓜種子', cost:800, growMs:45 * 60 * 1000, yield:1700, plant:'🍃', fruit:'🍉', form:'vine', color:'#4c994f', fruitColor:'#dc5962', category:'水果' },
    { id:'lavender', name:'暮紫薰衣草種子', cost:1000, growMs:55 * 60 * 1000, yield:2300, plant:'🌷', fruit:'💜', form:'flower', color:'#53936b', fruitColor:'#a879d1', category:'花卉' },
    { id:'mushroom', name:'森林蘑菇種子', cost:1500, growMs:90 * 60 * 1000, yield:3600, plant:'🍄', fruit:'🍄', form:'mushroom', color:'#719866', fruitColor:'#dcaa7e', category:'奇幻' },
    { id:'cactus', name:'沙漠仙人掌種子', cost:2200, growMs:2 * 60 * 60 * 1000, yield:5100, plant:'🌵', fruit:'🌵', form:'cactus', color:'#399582', fruitColor:'#ef8c80', category:'奇幻' },
    { id:'coffee', name:'晨霧咖啡種子', cost:4000, growMs:3 * 60 * 60 * 1000, yield:9000, plant:'🌳', fruit:'☕', form:'tree', color:'#4c8351', fruitColor:'#875238', category:'水果' },
    { id:'lotus', name:'月池蓮花種子', cost:5500, growMs:4 * 60 * 60 * 1000, yield:13000, plant:'🪷', fruit:'🪷', form:'flower', color:'#45977a', fruitColor:'#e88bb8', category:'花卉' },
    { id:'starfruit', name:'星芒果樹種子', cost:10000, growMs:8 * 60 * 60 * 1000, yield:25000, plant:'🌳', fruit:'⭐', form:'tree', color:'#4b8d53', fruitColor:'#f3d65c', category:'水果' },
    { id:'aurora', name:'極光鈴蘭種子', cost:18000, growMs:12 * 60 * 60 * 1000, yield:45000, plant:'🪻', fruit:'✨', form:'flower', color:'#4f956a', fruitColor:'#d3b9ff', category:'奇幻' },
    { id:'frost', name:'冰晶薄荷種子', cost:28000, growMs:24 * 60 * 60 * 1000, yield:75000, plant:'❄️', fruit:'🧊', form:'crystal', color:'#4b9ca1', fruitColor:'#a2f2ed', category:'奇幻' },
    { id:'mooncap', name:'月冠菇種子', cost:42000, growMs:36 * 60 * 60 * 1000, yield:110000, plant:'🍄', fruit:'🌙', form:'mushroom', color:'#536d8c', fruitColor:'#c4b7ef', category:'奇幻' },
    { id:'rainbowtree', name:'虹光古樹種子', cost:65000, growMs:48 * 60 * 60 * 1000, yield:170000, plant:'🌳', fruit:'🌈', form:'tree', color:'#4b8a65', fruitColor:'#ef91bf', category:'奇幻' },
    { id:'dragonbloom', name:'龍焰花種子', cost:90000, growMs:60 * 60 * 60 * 1000, yield:240000, plant:'🌺', fruit:'🔥', form:'flower', color:'#477c4b', fruitColor:'#ff8157', category:'奇幻' }
];
const FARM_PLOT_COUNT = 36;
const FARM_LAND_COSTS = [100, 300, 800];
function getFarmLandCost(plotCount) {
    if (plotCount <= FARM_LAND_COSTS.length) return FARM_LAND_COSTS[plotCount - 1];
    return Math.ceil(800 * Math.pow(1.25, plotCount - 2) / 50) * 50;
}
const FARM_SPRINKLER_COST = 100;
const FARM_SPRINKLER_SPEED = 0.5;
const FARM_SPRINKLER_BOOST_MS = 60 * 1000;
const FARM_STOCK_CYCLE_MS = 5 * 60 * 1000;
const FARM_DAILY_PLANT_COINS = 10;
const FARM_MUTATIONS = {
    silver: { name:'銀色', chance:'10%', multiplier:10, icon:'🥈' },
    gold: { name:'黃金', chance:'5%', multiplier:50, icon:'🥇' },
    rainbow: { name:'彩虹', chance:'1%', multiplier:100, icon:'🌈' }
};
/* 收成變異抽取門檻：r<0.01 彩虹、<0.06 黃金、<0.16 銀色 */
const FARM_MUTATION_ROLL = { rainbow: 0.01, gold: 0.06, silver: 0.16 };

/* ── 6. 造型抽獎 / 金幣製造機 ──────────────────────────── */
const SKIN_FRAGMENT_COST = 5;
const SKIN_LOTTERY = { baseChance: 0.01, pityDraws: 20 };
const MACHINE_PURCHASE_COST = 100;
const MACHINE_UPGRADE_COST = 50;
const MACHINE_CYCLE_MS = 12 * 60 * 60 * 1000;
const MACHINE_REWARD_PER_LEVEL = 250;

/* ── 7. 主動技能表 ────────────────────────────────────── */
const ACTIVE_SKILLS = {
    kunai:        { name:'流光飛刃',   evoName:'幻影風刃' },
    football:     { name:'量子球',     evoName:'星巡球' },
    droneA:       { name:'守護機甲',   evoName:'終極守護者' },
    droneB:       { name:'戰鬥陀螺',   evoName:'終極守護者' },
    lightning:    { name:'電磁脈衝',   evoName:'雷霆震爆' },
    guardian:     { name:'能量護盾',   evoName:'鋼鐵法環' },
    forcefield:   { name:'磁力場',     evoName:'壓制地帶' },
    brick:        { name:'重擊方塊',   evoName:'巨磚猛擊' },
    baseball:     { name:'震盪棍',     evoName:'破天槌' },
    revolver:     { name:'旋轉炮',     evoName:'暗影暴擊' },
    lightchaser:  { name:'追光導彈',   evoName:'星光狂襲' },
    destruction:  { name:'終焉震波',   evoName:'黯滅裂痕' },
    flamethrower: { name:'熾焰噴射',   evoName:'地獄噴泉' },
    iceRing:      { name:'寒霜環',     evoName:'凜冬暴旋' },
    meteor:       { name:'隕石衝擊',   evoName:'流星審判' },
    thunderField: { name:'雷域',       evoName:'超導雷獄' },
    whirlwind:    { name:'風暴斬',     evoName:'颶風亂舞' },
    singularity:  { name:'奇點',       evoName:'終焉奇點' },
    flare:        { name:'熾焰爆裂',   evoName:'熾焰終焰' },
    pulse:        { name:'能量脈衝',   evoName:'脈衝爆裂' },
    gravity:      { name:'重力投射',   evoName:'重力崩壞' },
    ionBeam:      { name:'離子光束',   evoName:'極限離子光' },
    plasmaOrb:    { name:'等離子球',   evoName:'核爆等離子' },
    chainSpark:   { name:'鏈式電擊',   evoName:'電弧磁爆' },
    voidBomb:     { name:'虛空炸彈',   evoName:'虛空裂縫' },
    bladeDance:   { name:'刀鋒旋舞',   evoName:'終焰刀陣' },
    arcWave:      { name:'弧形波',     evoName:'裂界弧波' },
    gravityPulse: { name:'重力脈衝',   evoName:'黑洞脈衝' },
    solarFlare:   { name:'日耀爆發',   evoName:'恆星焚爆' },
    burnBottle:   { name:'燃燒瓶',     evoName:'烈焰投擲' },
    cdSurge:      { name:'CD 爆破',    evoName:'音速震擊' },
    meowClaw:     { name:'貓爪亂舞',   evoName:'極影喵爪' },
    purrWave:     { name:'貓咪波動',   evoName:'喵力護盾' },
    gojoDomain:   { name:'領域展開',   evoName:'無限刻印' },
    shardStorm:   { name:'碎晶風暴',   evoName:'無限碎晶' },
    archon:       { name:'雷霆聖裁',   evoName:'天穹審判' },
    vortex:       { name:'旋渦刃輪',   evoName:'時空漩渦' },
    laserGrid:    { name:'雷射矩陣',   evoName:'終極光網' },
    ripple:       { name:'環形脈衝',   evoName:'無盡波紋' },
    spikeMine:    { name:'荊棘地雷',   evoName:'荊棘領域' },
    thunderNova:  { name:'雷鳴新星',   evoName:'萬雷天降' },
    shieldWall:   { name:'守護光刃',   evoName:'聖盾風暴' },
    novaBlast:    { name:'星核爆裂',   evoName:'超新星' },
    ionCannon:    { name:'離子炮台',   evoName:'終極離子炮', description:'鎖定目標持續掃射光束，穿透路徑上的敵人。' },
    chakram:      { name:'回旋刃輪',   evoName:'無盡輪舞', description:'飛出後折返玩家，沿途敵人各受一次傷害。' },
    minefield:    { name:'獵殺雷區',   evoName:'連鎖雷區', description:'在周圍埋下感應地雷，敵人靠近後範圍爆炸。' },
    orbitBlades:  { name:'星環刃衛',   evoName:'星辰風暴', description:'刀刃持續環繞玩家，近身碰撞反覆造成傷害。' },
    stormCaller:  { name:'天降隕星',   evoName:'滅世星雨', description:'在敵群位置標記落點，短暫延遲後重擊一大片區域。' },
    shockwave:    { name:'地裂震波',   evoName:'大地崩裂', description:'從玩家位置向外擴散衝擊環，掃過時傷害敵人。' },
    drillShot:    { name:'穿甲鑽彈',   evoName:'深空鑽擊', description:'發射高速鑽彈，貫穿直線上的多名敵人。' },
    ricochet:     { name:'彈跳晶刃',   evoName:'連鎖晶刃', description:'命中後自動跳向附近尚未受傷的敵人。' },
    gravityWell:  { name:'引力漩渦',   evoName:'潮汐黑洞', description:'在敵群中形成短暫引力場，牽引並持續傷害敵人。' }
};
const GOJO_DOMAIN_COOLDOWN = 30 * 60;
const GOJO_DOMAIN_DURATION = 5 * 60;
const GOJO_DOMAIN_WARN = 3 * 60;
const GOJO_DOMAIN_RADIUS = 320;
const RUN_ACTIVE_POOL_SIZE = 16;
/* 造型專屬技能 → 需要對應造型 */
const SKIN_LIMITED_SKILLS = {
    cdSurge: 'CD', meowClaw: 'meowl', purrWave: 'meowl', gojoDomain: 'gojo'
};

/* ── 8. 造型定義 ──────────────────────────────────────── */
const PLAYER_SKINS = {
    default:{ name:'預設', img:null, description:'基本造型' },
    CD:     { name:'CD',    img:'CD.png',  description:'高速爆破型，附加雙重普攻', imgMaxW:72, imgMaxH:72 },
    meowl:  { name:'meowl', img:'meowl.png', description:'燃燒貓咪型，附加燃燒普攻', imgMaxW:72, imgMaxH:72 },
    gojo:   { name:'五條悟', img:'image-removebg-preview.png', description:'升級取得「領域展開」後：30秒冷卻，範圍內時停5秒', imgMaxW:80, imgMaxH:110 },
    stickman:{ name:'火柴人', img:'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 96"><circle cx="36" cy="17" r="10" fill="#fff" stroke="#00d2ff" stroke-width="3"/><g fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"><path d="M36 29v31M36 38 18 52M36 38l18 14M36 60 21 84M36 60l15 24"/></g><path d="M36 29v31M36 38 18 52M36 38l18 14M36 60 21 84M36 60l15 24" fill="none" stroke="#00d2ff" stroke-width="1.4" stroke-linecap="round"/></svg>'), description:'簡單俐落，移動時會靈活擺動手腳', imgMaxW:58, imgMaxH:78 }
};

/* ── 9. 經濟與平衡數值 ────────────────────────────────── */
const BALANCE = {
    xpBase: 100, xpLinear: 18, xpPow: 1.7, xpPowMul: 8,
    enemyHpGlobal: 2, enemyHpStageStep: 0.28, enemyHpTimeStep: 0.4,
    bossHpMul: 1.4,
    petDrawCost: 100,
    skinDrawCost: 100,
    petAttackBase: 8, petAttackAssistMul: 5, petAttackWeightMul: 2.2,
    petAttackRarityMult: { '神寵':3.4, '史詩':1.9, '稀有':1.35, '普通':1 },
    petSellBase: 30, petSellWeightBase: 0.6, petSellWeightMul: 0.4,
    petSellRarityMult: { '神寵':8, '史詩':3.2, '稀有':1.8, '普通':1 },
    goldKillRate: 1.1, goldTimeRate: 0.85, goldOnlineMul: 2,
    talentCaps: { ATK: 20, HP: null, SPD: 10, REC: 10 }
};

const FB_ROOT = 'https://game-24b43-default-rtdb.firebaseio.com/raingod';

return {
    EVENT,
    MAP_RADIUS, MAX_ENEMIES, MAX_STAGES, STAGES,
    ENEMY_STATS,
    PET_DEFS, PET_POOLS, PET_ROLL_RATES, PET_WEIGHT_MIN,
    FARM_SEEDS, FARM_PLOT_COUNT, FARM_LAND_COSTS, getFarmLandCost,
    FARM_SPRINKLER_COST, FARM_SPRINKLER_SPEED, FARM_SPRINKLER_BOOST_MS,
    FARM_STOCK_CYCLE_MS, FARM_DAILY_PLANT_COINS,
    FARM_MUTATIONS, FARM_MUTATION_ROLL,
    SKIN_FRAGMENT_COST, SKIN_LOTTERY,
    MACHINE_PURCHASE_COST, MACHINE_UPGRADE_COST, MACHINE_CYCLE_MS, MACHINE_REWARD_PER_LEVEL,
    ACTIVE_SKILLS, GOJO_DOMAIN_COOLDOWN, GOJO_DOMAIN_DURATION, GOJO_DOMAIN_WARN, GOJO_DOMAIN_RADIUS,
    RUN_ACTIVE_POOL_SIZE, SKIN_LIMITED_SKILLS,
    PLAYER_SKINS,
    BALANCE,
    FB_ROOT
};
})();
