/* ============================================================
   RAINGOD | core.js  ── 固定遊戲引擎（不常改）
   ------------------------------------------------------------
   所有資料都從 window.RG_CONTENT 讀取；這個檔案只放邏輯。
   ============================================================ */
(function() {
'use strict';

const C = window.RG_CONTENT;
if (!C) throw new Error('core.js 需要先載入 content.js');

// ─── 資料別名 ─────────────────────────────────────────────────
const EVENT = C.EVENT;
const MAP_RADIUS = C.MAP_RADIUS;
const MAX_ENEMIES = C.MAX_ENEMIES;
const MAX_STAGES = C.MAX_STAGES;
const STAGES = C.STAGES;
const ENEMY_STATS = C.ENEMY_STATS;
const PET_DEFS = C.PET_DEFS;
const PET_POOLS = C.PET_POOLS;
const PET_ROLL_RATES = C.PET_ROLL_RATES;
const PET_WEIGHT_MIN = C.PET_WEIGHT_MIN;
const FARM_SEEDS = C.FARM_SEEDS;
const FARM_PLOT_COUNT = C.FARM_PLOT_COUNT;
const getFarmLandCost = C.getFarmLandCost;
const FARM_SPRINKLER_COST = C.FARM_SPRINKLER_COST;
const FARM_SPRINKLER_SPEED = C.FARM_SPRINKLER_SPEED;
const FARM_SPRINKLER_BOOST_MS = C.FARM_SPRINKLER_BOOST_MS;
const FARM_STOCK_CYCLE_MS = C.FARM_STOCK_CYCLE_MS;
const FARM_DAILY_PLANT_COINS = C.FARM_DAILY_PLANT_COINS;
const FARM_MUTATIONS = C.FARM_MUTATIONS;
const FARM_MUTATION_ROLL = C.FARM_MUTATION_ROLL;
const SKIN_FRAGMENT_COST = C.SKIN_FRAGMENT_COST;
const SKIN_LOTTERY = C.SKIN_LOTTERY;
const MACHINE_PURCHASE_COST = C.MACHINE_PURCHASE_COST;
const MACHINE_UPGRADE_COST = C.MACHINE_UPGRADE_COST;
const MACHINE_CYCLE_MS = C.MACHINE_CYCLE_MS;
const MACHINE_REWARD_PER_LEVEL = C.MACHINE_REWARD_PER_LEVEL;
const ACTIVE_SKILLS = C.ACTIVE_SKILLS;
const GOJO_DOMAIN_COOLDOWN = C.GOJO_DOMAIN_COOLDOWN;
const GOJO_DOMAIN_DURATION = C.GOJO_DOMAIN_DURATION;
const GOJO_DOMAIN_WARN = C.GOJO_DOMAIN_WARN;
const GOJO_DOMAIN_RADIUS = C.GOJO_DOMAIN_RADIUS;
const RUN_ACTIVE_POOL_SIZE = C.RUN_ACTIVE_POOL_SIZE;
const SKIN_LIMITED_SKILLS = C.SKIN_LIMITED_SKILLS;
const PLAYER_SKINS = C.PLAYER_SKINS;
const BALANCE = C.BALANCE;
const FB_ROOT = C.FB_ROOT;

// 單挑縮圈：雙方都依照同一個配對開始時間計算，確保縮圈同步。
function getDuelArenaRadius() {
    if (!OnlineSession || !OnlineSession.matchStartedAt) return MAP_RADIUS;
    const elapsed = Math.max(0, (Date.now() - OnlineSession.matchStartedAt) / 1000);
    const delay = 15;
    const shrinkDuration = 180;
    const endRadius = 480;
    const progress = Math.max(0, Math.min(1, (elapsed - delay) / shrinkDuration));
    return MAP_RADIUS - (MAP_RADIUS - endRadius) * progress;
}

function getEquippedPet() {
    const d = SaveSystem.currentData;
    return (d.pets || []).find(p => p.uid === d.equippedPet) || null;
}

function rollPet() {
    const r = Math.random();
    let pool;
    if (r < PET_ROLL_RATES.god) pool = PET_POOLS.god;
    else if (r < PET_ROLL_RATES.epic) pool = PET_POOLS.epic;
    else if (r < PET_ROLL_RATES.rare) pool = PET_POOLS.rare;
    else pool = PET_POOLS.common;
    const id = pool[Math.floor(Math.random() * pool.length)];
    const rarity = PET_DEFS[id].rarity;
    const minWeight = PET_WEIGHT_MIN[rarity] || 0.5;
    const maxWeight = 5;
    return { id, uid: Date.now().toString(36) + Math.random().toString(36).slice(2, 8), weight: +(minWeight + Math.random() * (maxWeight - minWeight)).toFixed(2) };
}

function shuffleArr(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function pickFromPool(pool, n) {
    return shuffleArr(pool).slice(0, Math.min(n, pool.length));
}
/** 控制技能升級時的彈數成長，避免高星與 EVO 讓彈幕失控。 */
function skillProjCount(star1Design, stars, evo, evoExtra = 0) {
    const base = Math.min(2, star1Design);
    let n = base + Math.floor(Math.max(0, (stars || 1) - 1) * 0.75);
    if (evo && evoExtra > 0) n += 1;
    return Math.max(1, Math.floor(n));
}
function skillLevelDamageMult(stars, evo) {
    const s = stars || 1;
    return (1 + (s - 1) * 0.16) * (evo ? 1.7 : 1);
}
function skillLevelCdBonus(skillId, stars) {
    const bonusPerStar = (skillId === 'kunai') ? 1.5 : 2.5;
    return Math.max(0, ((stars || 1) - 1) * bonusPerStar);
}

const SkinImages = {};
Object.entries(PLAYER_SKINS).forEach(([key, cfg]) => {
    if (cfg.img) {
        const img = new Image();
        img.src = cfg.img;
        SkinImages[key] = img;
    }
});
function drawSkinImageFit(ctx, img, maxW, maxH) {
    const iw = img.naturalWidth || img.width || 1;
    const ih = img.naturalHeight || img.height || 1;
    const scale = Math.min(maxW / iw, maxH / ih);
    const w = iw * scale;
    const h = ih * scale;
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
}

// ─── 存檔系統（帳號 ID 雲端同步）──────────────────────────────────────────────
const SKIN_KEYS = Object.keys(PLAYER_SKINS);
function sanitizePlayerName(name) {
    return String(name || '')
        .replace(/[<>"'`\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12);
}

const SaveSystem = {
    currentData: {
        resources: { gold: 0, plantCoins: 20 },
        talents: { ATK: 0, HP: 0, SPD: 0, REC: 0 },
        unlockedStage: 1,
        playerName: '',
        playerId: '',
        skin: 'default',
        skinsUnlocked: { CD: false, meowl: false, gojo: false, stickman: false },
        skinFragments: { common: 0 },
        joystickSettings: { baseX: 90, baseYOffset: 100, maxRadius: 90 },
        skinLottery: { drawsSinceLastFragment: 0 },
        pets: [],
        equippedPet: '',
        farm: { plots: [{ seed: '', plantedAt: 0 }], inventory: [], seedInventory: [], seedShopPurchases: {}, machine: { level: 0, startedAt: 0, owned: false }, sprinkler: false, sprinklerBoostUntil: 0, sprinklerBoostLastTick: 0, dailyRewardDate: '' },
        _plantCoinStarterGranted: 2,
        _extrasUpdatedAt: 0,
        version: '8.0.0'
    },
    _defaultData: null,
    _ready: false,
    _saveTimer: null,
    _syncing: false,
    _hasDeviceSave: false,
    _accountUid: '',
    _accountSyncEnabled: false,
    _authUnsubscribe: null,

    /** 精簡壓縮（約 100 bytes 級） */
    pack() {
        const d = this.currentData;
        const t = d.talents || {};
        const su = d.skinsUnlocked || {};
        const sf = d.skinFragments || {};
        const j = d.joystickSettings || {};
        const skinIdx = Math.max(0, SKIN_KEYS.indexOf(d.skin || 'default'));
        const unlockBits = (su.CD ? 1 : 0) | (su.meowl ? 2 : 0) | (su.gojo ? 4 : 0) | (su.stickman ? 8 : 0);
        const fragmentCount = Math.max(0, Math.min(999999, Number(sf.common) || 0));
        return {
            n: sanitizePlayerName(d.playerName) || '',
            u: Math.max(1, Math.min(100, d.unlockedStage | 0)),
            g: Math.max(0, Math.min(99999999, (d.resources && d.resources.gold) | 0)),
            a: Math.max(0, t.ATK | 0),
            h: Math.max(0, t.HP | 0),
            s: Math.max(0, Math.min(10, t.SPD | 0)),
            e: Math.max(0, Math.min(10, t.REC | 0)),
            c: skinIdx,
            k: unlockBits,
            f: fragmentCount,
            fv: 1,
            x: Math.max(0, (j.baseX != null ? j.baseX : 90) | 0),
            y: Math.max(0, (j.baseYOffset != null ? j.baseYOffset : 100) | 0),
            z: Math.max(10, (j.maxRadius != null ? j.maxRadius : 90) | 0),
            p: Math.max(0, ((d.skinLottery && d.skinLottery.drawsSinceLastFragment) | 0)),
            pc: Math.max(0, Math.floor((d.resources && d.resources.plantCoins) || 0)),
            pt: (d.pets || []).slice(-500).filter(p => PET_DEFS[p.id]).map(p => ({ id:p.id, uid:String(p.uid || ''), weight:Math.max(0.5, Math.min(5, Number(p.weight) || 0.5)) })),
            pe: String(d.equippedPet || ''),
            farm: d.farm,
            et: d._extrasUpdatedAt || 0,
            sg: Math.max(0, Math.min(2, Number(d._plantCoinStarterGranted) | 0)),
            t: Date.now()
        };
    },
    unpack(pack) {
        if (!pack || typeof pack !== 'object') return;
        const d = this.currentData;
        d.playerName = typeof pack.n === 'string' ? sanitizePlayerName(pack.n) : '';
        if (d.playerName && /^玩家[A-Z0-9]{4}$/.test(d.playerName)) {
            const auto = '玩家' + String(this.currentData.playerId || '').slice(-4).toUpperCase();
            if (d.playerName === auto) d.playerName = '';
        }
        d.unlockedStage = Math.max(1, Math.min(100, pack.u | 0) || 1);
        d.resources = d.resources || { gold: 0 };
        d.resources.gold = Math.max(0, pack.g | 0);
        d.talents = {
            ATK: Math.max(0, pack.a | 0),
            HP: Math.max(0, pack.h | 0),
            SPD: Math.max(0, Math.min(10, pack.s | 0)),
            REC: Math.max(0, Math.min(10, pack.e | 0))
        };
        d.skin = SKIN_KEYS[pack.c | 0] || 'default';
        const bits = pack.k | 0;
        d.skinsUnlocked = { CD: !!(bits & 1), meowl: !!(bits & 2), gojo: !!(bits & 4), stickman: !!(bits & 8) };
        const fp = Math.max(0, Number(pack.f) || 0);
        if (pack.fv === 1) {
            d.skinFragments = { common: Math.floor(fp) };
        } else {
            d.skinFragments = {
                common: (fp % 6) + (Math.floor(fp / 6) % 6) + (Math.floor(fp / 36) % 6)
            };
        }
        d.joystickSettings = {
            baseX: Math.max(0, pack.x != null ? pack.x | 0 : 90),
            baseYOffset: Math.max(0, pack.y != null ? pack.y | 0 : 100),
            maxRadius: Math.max(10, pack.z != null ? pack.z | 0 : 90)
        };
        d.skinLottery = { drawsSinceLastFragment: Math.max(0, pack.p | 0) };
        d.resources.plantCoins = Math.max(0, pack.pc == null ? 0 : pack.pc | 0);
        d.pets = Array.isArray(pack.pt) ? pack.pt.filter(p => p && PET_DEFS[p.id]).map(p => ({ id:p.id, uid:String(p.uid || ''), weight:Math.max(0.5, Math.min(5, Number(p.weight) || 0.5)) })) : [];
        d.equippedPet = typeof pack.pe === 'string' ? pack.pe : '';
        d.farm = pack.farm && typeof pack.farm === 'object' ? pack.farm : d.farm;
        d._extrasUpdatedAt = Math.max(0, pack.et | 0);
        d._plantCoinStarterGranted = Math.max(0, Math.min(2, Number(pack.sg) | 0));
    },
    displayName() {
        const n = sanitizePlayerName(this.currentData.playerName);
        if (n) return n;
        const id = this.currentData.playerId || '';
        return '玩家' + id.slice(-4).toUpperCase();
    },
    ensureDefaults() {
        const d = this.currentData;
        if (typeof d.unlockedStage !== 'number') d.unlockedStage = 1;
        if (typeof d.skin !== 'string') d.skin = 'default';
        if (typeof d.playerName !== 'string') d.playerName = '';
        if (!d.resources) d.resources = { gold: 0, plantCoins: 0 };
        if (typeof d.resources.plantCoins !== 'number') d.resources.plantCoins = 0;
        const starterGrantVersion = Number(d._plantCoinStarterGranted) || 0;
        if (starterGrantVersion < 2) {
            d.resources.plantCoins += starterGrantVersion === 1 ? 10 : 20;
            d._plantCoinStarterGranted = 2;
        }
        if (!d.talents) d.talents = { ATK: 0, HP: 0, SPD: 0, REC: 0 };
        if (!d.skinsUnlocked) d.skinsUnlocked = { CD: false, meowl: false, gojo: false, stickman: false };
        if (typeof d.skinsUnlocked.CD !== 'boolean') d.skinsUnlocked.CD = false;
        if (typeof d.skinsUnlocked.meowl !== 'boolean') d.skinsUnlocked.meowl = false;
        if (typeof d.skinsUnlocked.gojo !== 'boolean') d.skinsUnlocked.gojo = false;
        if (typeof d.skinsUnlocked.stickman !== 'boolean') d.skinsUnlocked.stickman = false;
        if (!d.skinFragments || typeof d.skinFragments !== 'object') d.skinFragments = {};
        if (typeof d.skinFragments.common !== 'number') {
            d.skinFragments.common = ['CD', 'meowl', 'gojo'].reduce((total, key) => total + Math.max(0, Number(d.skinFragments[key]) || 0), 0);
        }
        d.skinFragments.common = Math.max(0, Math.floor(d.skinFragments.common));
        d.skinFragments = { common: d.skinFragments.common };
        if (!d.joystickSettings) d.joystickSettings = { baseX: 90, baseYOffset: 100, maxRadius: 90 };
        if (!d.skinLottery) d.skinLottery = { drawsSinceLastFragment: 0 };
        if (!Array.isArray(d.pets)) d.pets = [];
        d.pets = d.pets.filter(p => p && PET_DEFS[p.id]).map(p => ({...p, uid:String(p.uid || (Date.now().toString(36) + Math.random().toString(36).slice(2,7))), weight:Math.max(0.5, Math.min(5, Number(p.weight) || 0.5))}));
        if (typeof d.equippedPet !== 'string') d.equippedPet = '';
        if (!d.farm || typeof d.farm !== 'object') d.farm = { plots: [], inventory: [], machine: { level:1, startedAt:0 } };
        if (typeof d.farm.sprinkler !== 'boolean') d.farm.sprinkler = false;
        if (!Array.isArray(d.farm.seedInventory)) d.farm.seedInventory = [];
        d.farm.seedInventory = d.farm.seedInventory.filter(id => FARM_SEEDS.some(seed => seed.id === id));
        if (!d.farm.seedShopPurchases || typeof d.farm.seedShopPurchases !== 'object' || Array.isArray(d.farm.seedShopPurchases)) d.farm.seedShopPurchases = {};
        const currentStockBucket = Math.floor(Date.now() / FARM_STOCK_CYCLE_MS);
        const currentPurchases = d.farm.seedShopPurchases[String(currentStockBucket)] || {};
        d.farm.seedShopPurchases = { [String(currentStockBucket)]: currentPurchases };
        FARM_SEEDS.forEach(seed => { currentPurchases[seed.id] = Math.max(0, Math.floor(Number(currentPurchases[seed.id]) || 0)); });
        d.farm.sprinklerBoostUntil = Math.max(0, Number(d.farm.sprinklerBoostUntil) || 0);
        d.farm.sprinklerBoostLastTick = Math.max(0, Number(d.farm.sprinklerBoostLastTick) || 0);
        if (typeof d.farm.dailyRewardDate !== 'string') d.farm.dailyRewardDate = '';
        if (!Array.isArray(d.farm.plots)) d.farm.plots = [];
        if (!d.farm.plots.length) d.farm.plots.push({ seed:'', plantedAt:0 });
        d.farm.plots = d.farm.plots.slice(0, FARM_PLOT_COUNT).map(plot => ({ seed:String(plot.seed || ''), plantedAt:Math.max(0, Number(plot.plantedAt) || 0) }));
        if (!Array.isArray(d.farm.inventory)) d.farm.inventory = [];
        d.farm.inventory = d.farm.inventory.filter(item => item && FARM_SEEDS.some(seed => seed.id === item.seedId)).map(item => ({
            id:String(item.id || ('fruit_' + Math.random().toString(36).slice(2, 10))),
            seedId:String(item.seedId),
            weight:Math.max(0.1, Math.min(9999, Number(item.weight) || 0.1)),
            mutation:FARM_MUTATIONS[item.mutation] ? item.mutation : '',
            harvestedAt:Math.max(0, Number(item.harvestedAt) || 0)
        }));
        if (!d.farm.machine || typeof d.farm.machine !== 'object') d.farm.machine = { level:0, startedAt:0, owned:false };
        if (typeof d.farm.machine.owned !== 'boolean') d.farm.machine.owned = Number(d.farm.machine.level) > 0;
        d.farm.machine.level = d.farm.machine.owned ? Math.max(1, Math.min(100, Number(d.farm.machine.level) || 1)) : 0;
        d.farm.machine.startedAt = Math.max(0, Number(d.farm.machine.startedAt) || 0);
        if (!d._extrasUpdatedAt) d._extrasUpdatedAt = 0;
    },
    async init() {
        if (!this._defaultData) this._defaultData = JSON.parse(JSON.stringify(this.currentData));
        let did = '';
        try { did = localStorage.getItem('RAINGOD_DID') || ''; } catch (e) {}
        if (!did) {
            try {
                const old = localStorage.getItem('RAINGOD_SAVE');
                if (old) {
                    const parsed = JSON.parse(old);
                    if (parsed && parsed.playerId) did = parsed.playerId;
                }
            } catch (e) {}
        }
        if (!did) did = 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
        this.currentData.playerId = did;
        try { localStorage.setItem('RAINGOD_DID', did); } catch (e) {}

        this.ensureDefaults();
        try {
            const old = localStorage.getItem('RAINGOD_SAVE');
            if (old) {
                const parsed = JSON.parse(old);
                if (parsed && typeof parsed === 'object') {
                    this.currentData = { ...this.currentData, ...parsed, playerId: did };
                    this.ensureDefaults();
                    this._hasDeviceSave = true;
                }
            }
        } catch (e) {}
        try {
            const extras = JSON.parse(localStorage.getItem('RAINGOD_ECONOMY') || 'null');
            if (extras && Number(extras.updatedAt) > (this.currentData._extrasUpdatedAt || 0)) {
                this.currentData.resources.plantCoins = Math.max(0, Number(extras.plantCoins) || 0);
                this.currentData.pets = Array.isArray(extras.pets) ? extras.pets.filter(p => p && PET_DEFS[p.id]) : [];
                this.currentData.equippedPet = String(extras.equippedPet || '');
                if (extras.farm && typeof extras.farm === 'object') this.currentData.farm = extras.farm;
                this.currentData._extrasUpdatedAt = Number(extras.updatedAt) || 0;
            }
        } catch (e) {}
        this._ready = true;
        this.ensureDefaults();

        if (typeof window.raingodFirebaseReady !== 'undefined') {
            await window.raingodFirebaseReady;
        }
        if (typeof window.raingodAuthReady !== 'undefined') {
            await window.raingodAuthReady;
        }
        if (typeof window.raingodOnAuthStateChanged === 'function') {
            await new Promise(resolve => {
                let initialState = true;
                this._authUnsubscribe = window.raingodOnAuthStateChanged(user => {
                    if (initialState) {
                        initialState = false;
                        if (user) {
                            this.bindAccount(user).catch(console.error).finally(resolve);
                        } else {
                            this.setAccountStatus('未登入：目前僅同步此裝置');
                            resolve();
                        }
                        return;
                    }
                    if (user) this.bindAccount(user).catch(console.error);
                    else {
                        this._accountUid = '';
                        this._accountSyncEnabled = false;
                        this.setAccountStatus('未登入：目前僅同步此裝置');
                    }
                });
            });
        }
    },
    claimDailyPlantCoins() {
        const d = this.currentData;
        const now = new Date();
        const today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
        if (d.farm.dailyRewardDate === today) return false;
        d.farm.dailyRewardDate = today;
        d.resources.plantCoins += FARM_DAILY_PLANT_COINS;
        this.save();
        return true;
    },
    setAccountStatus(message) {
        const status = document.getElementById('account-save-status');
        if (status) status.textContent = '帳號存檔：' + message;
    },
    async bindAccount(user) {
        if (!user || !user.uid || this._accountUid === user.uid || typeof window.raingodInitGame !== 'function') return;

        this._accountUid = user.uid;
        this._accountSyncEnabled = false;
        this.setAccountStatus('正在讀取帳號進度…');
        let initialAccountData = this.currentData;
        const accountSave = localStorage.getItem('raingod_save_game4');
        if (accountSave !== null) {
            try {
                initialAccountData = JSON.parse(accountSave);
            } catch (err) {
                console.error('帳號遊戲存檔格式無效：', err);
                throw err;
            }
        } else if (window.raingodAccountDataCloudLoaded) {
            const legacyAccountSave = localStorage.getItem('RAINGOD_SAVE');
            if (legacyAccountSave !== null) {
                try {
                    initialAccountData = JSON.parse(legacyAccountSave);
                } catch (err) {
                    console.error('舊版帳號遊戲存檔格式無效：', err);
                    throw err;
                }
            } else {
                initialAccountData = this._defaultData;
            }
        } else if (this._hasDeviceSave) {
            localStorage.setItem('raingod_save_game4', JSON.stringify(this.currentData));
        }

        const result = await new Promise(resolve => {
            window.raingodInitGame('game4', initialAccountData, (data, details) => resolve({ data, details }));
        });
        const accountData = result.data;
        const details = result.details || {};
        if (this._accountUid !== user.uid || !accountData || typeof accountData !== 'object') return;

        if (details.conflict) {
            this.setAccountStatus('保留本機進度；帳號存檔未更動');
            return;
        }

        const devicePlayerId = this.currentData.playerId;
        this.currentData = { ...this.currentData, ...accountData, playerId: devicePlayerId };
        try { localStorage.removeItem('RAINGOD_SAVE'); } catch (e) { console.error('移除已遷移的舊版存檔失敗：', e); }
        this.ensureDefaults();
        this._accountSyncEnabled = details.syncEnabled === true;
        if (details.created) this.setAccountStatus('此帳號首次遊玩，已建立帳號存檔');
        else if (details.error) this.setAccountStatus('載入失敗，已保留本機進度');
        else this.setAccountStatus('帳號進度已載入');
        if (GameEngine.player) GameEngine.renderLobby();
    },
    save() {
        this._hasDeviceSave = true;
        this.ensureDefaults();
        this.currentData._extrasUpdatedAt = Date.now();
        try {
            localStorage.setItem('RAINGOD_ECONOMY', JSON.stringify({
                updatedAt:this.currentData._extrasUpdatedAt,
                plantCoins:this.currentData.resources.plantCoins,
                pets:this.currentData.pets,
                equippedPet:this.currentData.equippedPet,
                farm:this.currentData.farm
            }));
        } catch (e) {}
        clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(() => {
            this.pushCloud(false);
            if (this._accountUid && this._accountSyncEnabled && typeof window.raingodSave === 'function') {
                window.raingodSave('game4', this.currentData);
            }
        }, 450);
    },
    async pushCloud(force) {
        const user = window.raingodCurrentUser;
        if (!user || this._accountUid && this._accountUid !== user.uid) return false;
        if (this._syncing && !force) return false;
        this._syncing = true;
        try {
            const pack = this.pack();
            if (!pack.n) pack.n = this.displayName();
            const res = await fetch(FB_ROOT + '/p/' + encodeURIComponent(user.uid) + '.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pack)
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return true;
        } catch (e) {
            return false;
        } finally {
            this._syncing = false;
        }
    }
};

// ─── 排行榜 ──────────────────────────────────────────────────────────────────
const Leaderboard = {
    cache: [],
    sanitizeName: sanitizePlayerName,
    setStatus(msg) {
        const el = document.getElementById('rank-status');
        if (el) el.textContent = msg || '';
    },
    async upload() {
        if (!window.raingodCurrentUser) {
            this.setStatus('請登入帳號以使用排行榜');
            return false;
        }
        const ok = await SaveSystem.pushCloud(true);
        if (ok) this.setStatus('已自動同步｜' + SaveSystem.displayName() + '｜關卡 ' + (SaveSystem.currentData.unlockedStage || 1));
        else this.setStatus('同步失敗（請確認 Firebase 規則允許讀寫）');
        return ok;
    },
    async fetchList() {
        if (!window.raingodCurrentUser) {
            this.setStatus('請登入帳號以使用排行榜');
            const box = document.getElementById('rank-list');
            if (box) box.textContent = '請登入帳號以查看排行榜';
            return [];
        }
        try {
            this.setStatus('讀取排行榜…');
            const res = await fetch(FB_ROOT + '/p.json');
            if (!res.ok) throw new Error('HTTP ' + res.status);
            const data = await res.json();
            const list = [];
            if (data && typeof data === 'object') {
                Object.keys(data).forEach(id => {
                    const row = data[id];
                    if (!row || typeof row !== 'object') return;
                    const name = sanitizePlayerName(row.n) || ('玩家' + id.slice(-4).toUpperCase());
                    const stage = Math.max(1, parseInt(row.u, 10) || 1);
                    list.push({ id, name, stage, updatedAt: row.t || 0 });
                });
            }
            list.sort((a, b) => b.stage - a.stage || b.updatedAt - a.updatedAt);
            this.cache = list;
            this.render();
            this.setStatus(list.length ? ('已載入 ' + list.length + ' 位（自動上榜）') : '尚無排行資料');
            return list;
        } catch (e) {
            this.setStatus('讀取失敗（請確認 Firebase 規則允許讀取）');
            return [];
        }
    },
    render() {
        const box = document.getElementById('rank-list');
        if (!box) return;
        const myId = SaveSystem._accountUid || SaveSystem.currentData.playerId;
        if (!this.cache.length) {
            box.innerHTML = '<div style="padding:12px;color:#889;text-align:center;">尚無資料</div>';
            return;
        }
        box.innerHTML = '';
        this.cache.slice(0, 50).forEach((row, i) => {
            const div = document.createElement('div');
            div.className = 'rank-row' + (row.id === myId ? ' me' : '');
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1);
            div.innerHTML =
                '<span class="rank-pos">' + medal + '</span>' +
                '<span class="rank-name">' + row.name + (row.id === myId ? '（你）' : '') + '</span>' +
                '<span class="rank-stage">關卡 ' + row.stage + '</span>';
            box.appendChild(div);
        });
    }
};

const OnlineSession = {
    id: '', mode: '', roomId: '', partnerId: '', busy: false, active: false,
    queueTimer: null, heartbeat: null, syncTimer: null, pollTimer: null,
    pendingDamage: 0, pendingWorldDamage: new Map(), worldSeq: 0, seenEvents: new Set(), matchStartedAt: 0, duelEnded: false,
    status(message) {
        const el = document.getElementById('match-status');
        if (el) el.textContent = message;
    },
    async request(path, method, body) {
        const options = { method: method || 'GET' };
        if (body !== undefined) {
            options.headers = { 'Content-Type':'application/json' };
            options.body = JSON.stringify(body);
        }
        const response = await fetch(FB_ROOT + '/' + path + '.json', options);
        const text = response.status === 204 ? '' : await response.text();
        if (!response.ok) throw new Error('Firebase HTTP ' + response.status + (text ? ': ' + text.slice(0, 160) : ''));
        return text ? JSON.parse(text) : null;
    },
    async matchmake() {
        if (this.busy || this.active) return;
        this.busy = true;
        this.mode = 'versus';
        this.id = SaveSystem.currentData.playerId;
        this.status('正在尋找同模式玩家…');
        try {
            await this.request('matchmaking/queue/' + encodeURIComponent(this.id), 'PUT', {
                id:this.id, name:SaveSystem.displayName(), stage:SaveSystem.currentData.unlockedStage || 1,
                mode:this.mode, updatedAt:Date.now()
            });
            this.heartbeat = setInterval(() => this.refreshQueue(), 4000);
            this.queueTimer = setInterval(() => this.pollQueue(), 1200);
            await this.pollQueue();
        } catch (error) {
            this.busy = false;
            this.status('配對連線失敗：' + error.message);
        }
    },
    async refreshQueue() {
        if (!this.busy) return;
        try {
            await this.request('matchmaking/queue/' + encodeURIComponent(this.id), 'PATCH', { updatedAt:Date.now() });
        } catch (error) {
            this.leave();
            this.status('配對連線中斷：' + error.message);
        }
    },
    async pollQueue() {
        if (!this.busy) return;
        try {
            const queue = await this.request('matchmaking/queue', 'GET') || {};
            const own = queue[this.id];
            if (own && own.roomId) {
                const room = await this.request('matchmaking/rooms/' + own.roomId, 'GET');
                if (room) this.enterRoom(own.roomId, room);
                return;
            }
            const now = Date.now();
            const peer = Object.values(queue).find(item => item && item.id !== this.id && item.mode === this.mode && now - (item.updatedAt || 0) < 15000);
            if (!peer) return;
            const ids = [this.id, peer.id].sort();
            const roomId = ids.join('_') + '_' + this.mode;
            if (this.id < peer.id) {
                const stage = this.mode === 'coop' ? Math.max(SaveSystem.currentData.unlockedStage || 1, Number(peer.stage) || 1) : 1;
                const room = {
                    mode:this.mode, stage, status:'playing', createdAt:now,
                    players:{
                        [this.id]:{ id:this.id, name:SaveSystem.displayName() },
                        [peer.id]:{ id:peer.id, name:peer.name || '隊友' }
                    }
                };
                await this.request('matchmaking/rooms/' + roomId, 'PUT', room);
                await this.request('matchmaking/queue/' + encodeURIComponent(this.id), 'PUT', {
                    id:this.id, name:SaveSystem.displayName(), stage:SaveSystem.currentData.unlockedStage || 1,
                    mode:this.mode, roomId, updatedAt:Date.now()
                });
                this.enterRoom(roomId, room);
            } else if (peer.roomId) {
                const room = await this.request('matchmaking/rooms/' + peer.roomId, 'GET');
                if (room) {
                    await this.request('matchmaking/queue/' + encodeURIComponent(this.id), 'PUT', {
                        id:this.id, name:SaveSystem.displayName(), stage:SaveSystem.currentData.unlockedStage || 1,
                        mode:this.mode, roomId:peer.roomId, updatedAt:Date.now()
                    });
                    this.enterRoom(peer.roomId, room);
                }
            }
        } catch (error) {
            this.leave();
            this.status('配對失敗：' + error.message);
        }
    },
    enterRoom(roomId, room) {
        if (!this.busy || this.active) return;
        this.busy = false;
        this.active = true;
        this.roomId = roomId;
        this.mode = room.mode;
        this.matchStartedAt = Number(room.matchStartedAt || room.createdAt) || Date.now();
        this.duelEnded = false;
        this.partnerId = Object.keys(room.players || {}).find(id => id !== this.id) || '';
        clearInterval(this.queueTimer);
        clearInterval(this.heartbeat);
        const other = room.players && room.players[this.partnerId];
        this.status('單挑對戰｜已配對 ' + (other ? other.name : '對手'));
        const matchButton = document.getElementById('match-button');
        const leaveButton = document.getElementById('leave-match-button');
        if (matchButton) matchButton.style.display = 'none';
        if (leaveButton) leaveButton.style.display = '';
        const roster = document.getElementById('match-roster');
        if (roster) roster.textContent = '單挑模式｜雙方血量 5,000。血量不會自動回復，圈圈範圍內會鎖定對手攻擊。';
        GameEngine.startBattle(room.stage || 1, { online:true, onlineMode:this.mode });
        this.syncTimer = setInterval(() => this.syncState(), 180);
        this.pollTimer = setInterval(() => this.pollRoom(), 350);
    },
    async syncState() {
        if (!this.active || !['BATTLE', 'GAMEOVER'].includes(GameEngine.state) || !GameEngine.player) return;
        const player = GameEngine.player;
        try {
            await this.request('matchmaking/rooms/' + this.roomId + '/players/' + encodeURIComponent(this.id) + '/state', 'PUT', {
                x:player.x, y:player.y, hp:player.hp, maxHp:player.maxHp,
                isDead: player.hp <= 0,
                activeSkills: BattleSkills.active.map(a => ({ id:a.id, stars:a.stars, evo:!!a.evo })),
                projectiles: this.mode === 'versus' ? GameEngine.projectiles.filter(p => !p.isDead).slice(-55).map(p => ({
                    x:p.x, y:p.y, vx:p.vx || 0, vy:p.vy || 0, r:p.r || 6, color:p.color || '#64d8ff',
                    shape:p.shape || 'diamond', beamLength:p.beamLength || 0, beamAngle:p.beamAngle || 0,
                    beamWidth:p.beamWidth || 0, explosionRadius:p.explosionRadius || 0,
                    triggerRadius:p.triggerRadius || 0, shockwaveRadius:p.shockwaveRadius || 0,
                    shockwaveMaxRadius:p.shockwaveMaxRadius || 0, shockwaveThickness:p.shockwaveThickness || 0,
                    areaField:!!p.areaField, mine:!!p.mine
                })) : undefined,
                updatedAt:Date.now()
            });
            if (this.mode === 'coop' && this.id < this.partnerId) {
                const snapshot = entity => {
                    if (!entity.netId) entity.netId = 'entity_' + (++this.worldSeq);
                    return JSON.parse(JSON.stringify(entity));
                };
                await this.request('matchmaking/rooms/' + this.roomId + '/world', 'PUT', {
                    timer:GameEngine.timer,
                    enemies:GameEngine.enemies.map(snapshot),
                    bosses:GameEngine.bosses.map(snapshot),
                    updatedAt:Date.now()
                });
            }
            if (this.pendingDamage > 0) {
                const damage = this.pendingDamage;
                this.pendingDamage = 0;
                await this.request('matchmaking/rooms/' + this.roomId + '/events/' + encodeURIComponent(this.partnerId), 'POST', { damage, createdAt:Date.now() });
            }
            if (this.pendingWorldDamage.size) {
                const hits = Array.from(this.pendingWorldDamage.entries());
                this.pendingWorldDamage.clear();
                for (const [netId, damage] of hits) {
                    await this.request('matchmaking/rooms/' + this.roomId + '/worldEvents/' + encodeURIComponent(this.partnerId), 'POST', { netId, damage });
                }
            }
        } catch (error) {
            this.status('隊伍連線中斷。');
        }
    },
    async pollRoom() {
        if (!this.active) return;
        try {
            const room = await this.request('matchmaking/rooms/' + this.roomId, 'GET');
            const remote = room && room.players && room.players[this.partnerId] && room.players[this.partnerId].state;
            if (remote && Date.now() - (remote.updatedAt || 0) < 6000) {
                GameEngine.remotePlayer = Object.assign({ isRemotePlayer:true, isDead:false, r:20 }, remote);
                GameEngine.remoteProjectiles = Array.isArray(remote.projectiles) ? remote.projectiles : [];
                GameEngine.remoteActiveSkills = Array.isArray(remote.activeSkills) ? remote.activeSkills : [];
                if (this.mode === 'versus' && !this.duelEnded && (remote.isDead || Number(remote.hp) <= 0)) {
                    if (GameEngine.player && GameEngine.player.hp > 0 && GameEngine.state === 'BATTLE') GameEngine.finishDuel('win');
                }
            }
            if (this.mode === 'coop') {
                const worldEvents = room && room.worldEvents && room.worldEvents[this.id];
                if (this.id < this.partnerId && worldEvents) {
                    for (const [eventId, event] of Object.entries(worldEvents)) {
                        const entity = [...GameEngine.enemies, ...GameEngine.bosses].find(item => item.netId === event.netId);
                        if (entity) entity.hp = Math.max(0, entity.hp - Math.max(0, Number(event.damage) || 0));
                        this.request('matchmaking/rooms/' + this.roomId + '/worldEvents/' + encodeURIComponent(this.id) + '/' + eventId, 'DELETE').catch(() => {});
                    }
                }
                if (this.id > this.partnerId && room && room.world && Date.now() - (room.world.updatedAt || 0) < 6000) this.applyWorld(room.world);
            }
            const events = room && room.events && room.events[this.id];
            if (events && GameEngine.player) {
                for (const [eventId, event] of Object.entries(events)) {
                    if (this.seenEvents.has(eventId)) continue;
                    this.seenEvents.add(eventId);
                    GameEngine.player.takeDamage(Math.max(0, Number(event.damage) || 0));
                    this.request('matchmaking/rooms/' + this.roomId + '/events/' + encodeURIComponent(this.id) + '/' + eventId, 'DELETE').catch(() => {});
                }
            }
        } catch (error) {
            this.status('隊伍同步失敗，請檢查 Firebase 連線。');
        }
    },
    applyWorld(world) {
        const mergeEntities = (states, current, create) => {
            const existing = new Map(current.map(entity => [entity.netId, entity]));
            return (states || []).filter(state => state && state.hp > 0).map(state => {
                const entity = existing.get(state.netId) || create(state);
                Object.assign(entity, state);
                return entity;
            });
        };
        GameEngine.timer = Number(world.timer) || GameEngine.timer;
        GameEngine.enemies = mergeEntities(world.enemies, GameEngine.enemies, state => new Enemy(state.x, state.y, state.type, GameEngine.currentStage));
        GameEngine.bosses = mergeEntities(world.bosses, GameEngine.bosses, state => new Boss(state.x, state.y, state.maxHp, GameEngine.currentStage, state.timeFactor));
    },
    queueDamage(amount) {
        if (this.active && (this.mode === 'versus' || this.mode === 'coop') && Number.isFinite(amount)) this.pendingDamage += Math.max(0, amount) * (this.mode === 'versus' ? 6 : 1);
    },
    queueWorldDamage(netId, amount) {
        if (!this.active || this.mode !== 'coop' || !GameEngine._onlineGuest || !netId || !Number.isFinite(amount)) return;
        this.pendingWorldDamage.set(netId, (this.pendingWorldDamage.get(netId) || 0) + Math.max(0, amount));
    },
    leave() {
        clearInterval(this.queueTimer);
        clearInterval(this.heartbeat);
        clearInterval(this.syncTimer);
        clearInterval(this.pollTimer);
        if (this.id) this.request('matchmaking/queue/' + encodeURIComponent(this.id), 'DELETE').catch(() => {});
        if (this.active && this.roomId && this.id) this.request('matchmaking/rooms/' + this.roomId + '/players/' + encodeURIComponent(this.id) + '/state', 'DELETE').catch(() => {});
        this.busy = false;
        this.active = false;
        this.pendingDamage = 0;
        this.pendingWorldDamage.clear();
        this.roomId = '';
        this.partnerId = '';
        this.mode = '';
        GameEngine.remotePlayer = null;
        GameEngine.remoteProjectiles = [];
        GameEngine.remoteActiveSkills = [];
        this.matchStartedAt = 0;
        this.duelEnded = false;
        GameEngine.onlineMode = '';
        const matchButton = document.getElementById('match-button');
        const leaveButton = document.getElementById('leave-match-button');
        if (matchButton) matchButton.style.display = '';
        if (leaveButton) leaveButton.style.display = 'none';
        const roster = document.getElementById('match-roster');
        if (roster) roster.textContent = '';
        this.status('已離開隊伍。');
    }
};
window.OnlineSession = OnlineSession;

// ─── 輸入 ─────────────────────────────────────────────────────────────────────
const Input = {
    keys: {},
    mouseX: 0,
    mouseY: 0,
    mouseActive: false,
    joystick: { active:false, id:null, baseX: 90, baseY: 0, x:0, y:0, dx:0, dy:0, maxRadius: 90 },
    init() {
        window.onkeydown = e => {
            const key = e.key.toLowerCase();
            this.keys[key] = true;
            if (e.key === 'Escape') GameEngine.togglePause();
            if (e.key === 'Control') this.keys.control = true;
            this.checkTestCombo();
        };
        window.onkeyup = e => {
            const key = e.key.toLowerCase();
            this.keys[key] = false;
            if (e.key === 'Control') this.keys.control = false;
            this.checkTestCombo();
        };
        window.addEventListener('mousemove', e => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.mouseActive = true;
        });
        window.addEventListener('mouseleave', () => {
            this.mouseActive = false;
        });

        const updateJoystickPos = () => {
            try {
                const s = (SaveSystem && SaveSystem.currentData && SaveSystem.currentData.joystickSettings) || {};
                this.joystick.baseX = typeof s.baseX === 'number' ? s.baseX : 90;
                const yOffset = typeof s.baseYOffset === 'number' ? s.baseYOffset : 100;
                this.joystick.baseY = window.innerHeight - yOffset;
                this.joystick.maxRadius = typeof s.maxRadius === 'number' ? s.maxRadius : 90;
            } catch (e) {
                this.joystick.baseX = 90;
                this.joystick.baseY = window.innerHeight - 100;
                this.joystick.maxRadius = 90;
            }
        };
        window.addEventListener('resize', updateJoystickPos);
        updateJoystickPos();

        const handleTouchStart = (e) => {
            const t = e.changedTouches[0];
            if (!t) return;
            const joyX = this.joystick.baseX, joyY = this.joystick.baseY;
            const dist = Math.hypot(t.clientX - joyX, t.clientY - joyY);
            if (dist > 140) return;
            this.joystick.active = true;
            this.joystick.id = t.identifier;
            this.joystick.baseX = joyX;
            this.joystick.baseY = joyY;
            this.joystick.x = t.clientX;
            this.joystick.y = t.clientY;
            this.joystick.dx = 0;
            this.joystick.dy = 0;
            this.mouseActive = false;
            e.preventDefault();
        };
        const handleTouchMove = (e) => {
            if (!this.joystick.active) return;
            for (const t of e.changedTouches) {
                if (t.identifier !== this.joystick.id) continue;
                this.joystick.x = t.clientX;
                this.joystick.y = t.clientY;
                const vx = t.clientX - this.joystick.baseX;
                const vy = t.clientY - this.joystick.baseY;
                const dist = Math.hypot(vx, vy);
                const max = this.joystick.maxRadius;
                const clamped = Math.min(dist, max);
                const nx = dist ? vx / dist : 0;
                const ny = dist ? vy / dist : 0;
                this.joystick.dx = nx * (clamped / max);
                this.joystick.dy = ny * (clamped / max);
                e.preventDefault();
                break;
            }
        };
        const handleTouchEnd = (e) => {
            if (!this.joystick.active) return;
            for (const t of e.changedTouches) {
                if (t.identifier !== this.joystick.id) continue;
                this.joystick.active = false;
                this.joystick.id = null;
                this.joystick.dx = 0;
                this.joystick.dy = 0;
                break;
            }
        };
        window.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: false });
        window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    },
    checkTestCombo() {
        const combo = ['r', 'a', 'i', 'n', 'control'].every(k => !!this.keys[k]);
        if (combo && !this._testComboActive) {
            this._testComboActive = true;
            GameEngine.toggleTestMode();
        }
        if (!combo) {
            this._testComboActive = false;
        }
    }
};

const RARITY_ORDER = { N:0, R:1, SR:2, SS:3, SSS:4 };
const RARITY_NAME = { N:'普通', R:'稀有', SR:'超稀有', SS:'星輝', SSS:'極稀有' };

// ─── 背景 / 地圖 ─────────────────────────────────────────────────────────────
const Background = {
    ctx: null, stage: 1,
    palettes: [
        { bg:'#00050a', grid:'rgba(0,210,255,0.07)', accent:'#00d2ff', mark:'rgba(0,180,220,0.18)' },
        { bg:'#0a0a1a', grid:'rgba(120,100,255,0.08)', accent:'#7c4dff', mark:'rgba(120,100,255,0.2)' },
        { bg:'#1a0a0a', grid:'rgba(255,80,60,0.08)', accent:'#ff6e40', mark:'rgba(255,100,60,0.18)' },
        { bg:'#0a1a0a', grid:'rgba(80,220,100,0.08)', accent:'#69f0ae', mark:'rgba(80,200,100,0.18)' },
        { bg:'#1a1a0a', grid:'rgba(255,200,60,0.08)', accent:'#ffd54f', mark:'rgba(255,200,60,0.16)' },
        { bg:'#0a0a2a', grid:'rgba(100,160,255,0.08)', accent:'#64b5f6', mark:'rgba(100,160,255,0.18)' },
        { bg:'#2a0a0a', grid:'rgba(255,120,80,0.08)', accent:'#ff8a65', mark:'rgba(255,120,80,0.18)' },
        { bg:'#0a2a0a', grid:'rgba(100,255,160,0.07)', accent:'#69f0ae', mark:'rgba(80,220,140,0.16)' }
    ],
    landmarks: null,
    init(ctx, stage = 1) {
        this.ctx = ctx;
        this.stage = stage;
        this.buildLandmarks(stage);
    },
    buildLandmarks(stage) {
        const seed = stage * 9973;
        const rand = (i) => {
            const x = Math.sin(seed + i * 12.9898) * 43758.5453;
            return x - Math.floor(x);
        };
        const marks = [];
        for (let i = 0; i < 48; i++) {
            const ang = rand(i) * Math.PI * 2;
            const dist = 180 + rand(i + 50) * (MAP_RADIUS - 280);
            const kind = Math.floor(rand(i + 90) * 4);
            marks.push({
                x: Math.cos(ang) * dist,
                y: Math.sin(ang) * dist,
                r: 18 + rand(i + 130) * 42,
                kind,
                rot: rand(i + 170) * Math.PI
            });
        }
        this.landmarks = marks;
    },
    draw() {
        if (!this.ctx) return;
        const pal = this.palettes[(this.stage - 1) % this.palettes.length];
        this.ctx.fillStyle = pal.bg;
        this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    },
    drawWorld(ctx, cam) {
        const pal = this.palettes[(this.stage - 1) % this.palettes.length];
        const tile = 120;
        const viewPad = 80;
        const left = cam.x - ctx.canvas.width / 2 - viewPad;
        const top = cam.y - ctx.canvas.height / 2 - viewPad;
        const right = cam.x + ctx.canvas.width / 2 + viewPad;
        const bottom = cam.y + ctx.canvas.height / 2 + viewPad;
        const x0 = Math.floor(left / tile) * tile;
        const y0 = Math.floor(top / tile) * tile;

        ctx.save();
        const floorGrad = ctx.createRadialGradient(0, 0, MAP_RADIUS * 0.15, 0, 0, MAP_RADIUS);
        floorGrad.addColorStop(0, 'rgba(255,255,255,0.03)');
        floorGrad.addColorStop(0.7, 'rgba(0,0,0,0)');
        floorGrad.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.arc(0, 0, MAP_RADIUS, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = pal.grid;
        ctx.lineWidth = 1;
        for (let x = x0; x <= right; x += tile) {
            ctx.beginPath();
            ctx.moveTo(x, top);
            ctx.lineTo(x, bottom);
            ctx.stroke();
        }
        for (let y = y0; y <= bottom; y += tile) {
            ctx.beginPath();
            ctx.moveTo(left, y);
            ctx.lineTo(right, y);
            ctx.stroke();
        }

        if (this.landmarks) {
            for (const m of this.landmarks) {
                if (m.x < left - 80 || m.x > right + 80 || m.y < top - 80 || m.y > bottom + 80) continue;
                ctx.save();
                ctx.translate(m.x, m.y);
                ctx.rotate(m.rot);
                ctx.fillStyle = pal.mark;
                ctx.strokeStyle = pal.accent;
                ctx.globalAlpha = 0.55;
                ctx.lineWidth = 1.5;
                if (m.kind === 0) {
                    ctx.beginPath();
                    ctx.moveTo(0, -m.r);
                    ctx.lineTo(m.r * 0.85, m.r * 0.6);
                    ctx.lineTo(-m.r * 0.85, m.r * 0.6);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                } else if (m.kind === 1) {
                    ctx.fillRect(-m.r * 0.7, -m.r * 0.7, m.r * 1.4, m.r * 1.4);
                    ctx.strokeRect(-m.r * 0.7, -m.r * 0.7, m.r * 1.4, m.r * 1.4);
                } else if (m.kind === 2) {
                    ctx.beginPath();
                    ctx.arc(0, 0, m.r * 0.7, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    for (let i = 0; i < 6; i++) {
                        const a = Math.PI / 3 * i;
                        const px = Math.cos(a) * m.r * 0.75;
                        const py = Math.sin(a) * m.r * 0.75;
                        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                    }
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                }
                ctx.restore();
            }
        }

        ctx.globalAlpha = 0.35;
        ctx.strokeStyle = pal.accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 140, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 220, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;

        ctx.strokeStyle = pal.accent;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 3;
        ctx.setLineDash([16, 10]);
        ctx.beginPath();
        ctx.arc(0, 0, MAP_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
        ctx.restore();
    }
};

// ─── 經驗球 ───────────────────────────────────────────────────────────────────
class ExpOrb {
    constructor(x, y, value = 10) {
        this.x = x; this.y = y; this.value = value; this.r = 6;
        this.vx = 0; this.vy = 0;
    }
    update(dt, player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const dist = Math.hypot(dx, dy);
        const magnet = player.getMagnetRadius();
        if (dist < magnet) {
            const force = 0.25;
            const nx = dist ? dx / dist : 0;
            const ny = dist ? dy / dist : 0;
            this.vx += nx * force * dt;
            this.vy += ny * force * dt;
            const speed = Math.min(16, Math.hypot(this.vx, this.vy));
            if (speed > 0) {
                this.vx = this.vx / Math.hypot(this.vx, this.vy) * speed;
                this.vy = this.vy / Math.hypot(this.vx, this.vy) * speed;
            }
        }
        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }
    draw(ctx, cam) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const glow = '#00ffcc';
        ctx.fillStyle = glow;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.shadowColor = glow;
        ctx.shadowBlur = 5;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const a = Math.PI/2 * i - Math.PI/4;
            const x = Math.cos(a) * this.r, y = Math.sin(a) * this.r;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
}

// ─── 投射物 ───────────────────────────────────────────────────────────────────
class Projectile {
    constructor(x, y, vx, vy, dmg, color, opts = {}) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.dmg = dmg; this.color = color || '#00d2ff'; this.isDead = false;
        this.homing = opts.homing || false; this.r = opts.r || 5; this.life = opts.life || 400;
        this.bounceLeft = opts.bounce !== undefined ? opts.bounce : 0;
        this.bounceOnHit = opts.bounceOnHit || false;
        this.shape = opts.shape || 'diamond';
        this.skillId = opts.skillId || null;
        this.lockTarget = opts.lockTarget || null;
        this.isPuddle = opts.isPuddle || false;
        this.gravityPull = opts.gravityPull || 0;
        this.returning = false;
        this.burn = opts.burn || false;
        this.burnDmg = opts.burnDmg || 0;
        this.pierceLeft = opts.pierceLeft != null ? opts.pierceLeft : 0;
        this.hostile = !!opts.hostile;
        this.boomerang = opts.boomerang || false;
        this.originX = x; this.originY = y;
        this.maxRange = opts.maxRange || 0;
        this.hitTargets = new Set();
        this.chainLeft = opts.chainLeft || 0;
        this.chainRadius = opts.chainRadius || 0;
        this.orbitRadius = opts.orbitRadius || 0;
        this.orbitAngle = opts.orbitAngle || 0;
        this.orbitSpeed = opts.orbitSpeed || 0;
        this.orbitHitTimers = new Map();
        this.beamLength = opts.beamLength || 0;
        this.beamAngle = opts.beamAngle || 0;
        this.beamWidth = opts.beamWidth || 0;
        this.beamHitTimers = new Map();
        this.explosionRadius = opts.explosionRadius || 0;
        this.areaField = opts.areaField || false;
        this.explosionDelay = opts.explosionDelay || 0;
        this.triggerRadius = opts.triggerRadius || 0;
        this.mine = opts.mine || false;
        this.shockwaveMaxRadius = opts.shockwaveMaxRadius || 0;
        this.shockwaveThickness = opts.shockwaveThickness || 0;
        this.shockwaveRadius = 0;
        this.knockback = opts.knockback || 0;
        this.followPlayer = opts.followPlayer || false;
    }
    update(dt, player, enemies) {
        for (const [target, timer] of this.orbitHitTimers) {
            const nextTimer = timer - dt;
            if (nextTimer <= 0) this.orbitHitTimers.delete(target);
            else this.orbitHitTimers.set(target, nextTimer);
        }
        if (this.followPlayer) {
            this.x = player.x; this.y = player.y;
        }
        if (this.boomerang) {
            const distance = Math.hypot(this.x - this.originX, this.y - this.originY);
            if (distance >= this.maxRange) this.returning = true;
            if (this.returning) {
                const angle = Math.atan2(player.y - this.y, player.x - this.x);
                const speed = Math.max(1, Math.hypot(this.vx, this.vy));
                this.vx = Math.cos(angle) * speed;
                this.vy = Math.sin(angle) * speed;
                if (Math.hypot(player.x - this.x, player.y - this.y) < player.r + this.r) {
                    this.isDead = true;
                    return;
                }
            }
        }
        if (this.orbitRadius > 0) {
            this.orbitAngle += this.orbitSpeed * dt;
            this.x = player.x + Math.cos(this.orbitAngle) * this.orbitRadius;
            this.y = player.y + Math.sin(this.orbitAngle) * this.orbitRadius;
        } else if (this.beamLength > 0) {
            this.x = player.x;
            this.y = player.y;
            let target = null, targetDistance = Infinity;
            for (const e of enemies) {
                if (e.isDead) continue;
                const distance = Math.hypot(e.x - player.x, e.y - player.y);
                if (distance < targetDistance) { target = e; targetDistance = distance; }
            }
            if (target) this.beamAngle = Math.atan2(target.y - player.y, target.x - player.x);
            const dx = Math.cos(this.beamAngle), dy = Math.sin(this.beamAngle);
            for (const e of enemies) {
                if (e.isDead) continue;
                const ex = e.x - player.x, ey = e.y - player.y;
                const along = ex * dx + ey * dy;
                const across = Math.abs(ex * dy - ey * dx);
                if (along < 0 || along > this.beamLength || across > this.beamWidth + e.r) continue;
                const timer = Math.max(0, (this.beamHitTimers.get(e) || 0) - dt);
                if (timer > 0) { this.beamHitTimers.set(e, timer); continue; }
                const damage = e instanceof Boss && e.shield ? this.dmg * 0.5 : this.dmg;
                if (e.isRemotePlayer) OnlineSession.queueDamage(damage);
                else {
                    OnlineSession.queueWorldDamage(e.netId, damage * dt / 60);
                    e.hp -= damage * dt / 60;
                }
                this.beamHitTimers.set(e, 8);
            }
            this.life -= dt;
            if (this.life <= 0) this.isDead = true;
            return;
        } else if (this.shockwaveMaxRadius > 0) {
            this.shockwaveRadius = Math.min(this.shockwaveMaxRadius, this.shockwaveRadius + this.vx * dt);
            this.r = this.shockwaveRadius;
            for (const e of enemies) {
                if (e.isDead || this.hitTargets.has(e) || (this.orbitRadius > 0 && this.orbitHitTimers.has(e))) continue;
                const distance = Math.hypot(e.x - this.originX, e.y - this.originY);
                if (Math.abs(distance - this.shockwaveRadius) > this.shockwaveThickness + e.r) continue;
                this.hitTargets.add(e);
                const damage = e instanceof Boss && e.shield ? this.dmg * 0.5 : this.dmg;
                if (e.isRemotePlayer) OnlineSession.queueDamage(damage);
                else { OnlineSession.queueWorldDamage(e.netId, damage); e.hp -= damage; }
            }
            if (this.shockwaveRadius >= this.shockwaveMaxRadius) this.isDead = true;
            return;
        } else if (this.mine) {
            this.explosionDelay -= dt;
            if (this.explosionDelay <= 0 && enemies.some(e => !e.isDead && Math.hypot(e.x - this.x, e.y - this.y) < this.triggerRadius + e.r)) {
                for (const e of enemies) {
                    if (e.isDead || Math.hypot(e.x - this.x, e.y - this.y) > this.explosionRadius + e.r) continue;
                    const damage = e instanceof Boss && e.shield ? this.dmg * 0.5 : this.dmg;
                    if (e.isRemotePlayer) OnlineSession.queueDamage(damage);
                    else { OnlineSession.queueWorldDamage(e.netId, damage); e.hp -= damage; }
                }
                GameEngine.spawnParticles(this.x, this.y, this.color, 20, 3);
                this.isDead = true;
                return;
            }
            this.life -= dt;
            if (this.life <= 0) this.isDead = true;
            return;
        } else if (this.explosionRadius > 0) {
            this.explosionDelay -= dt;
            if (this.explosionDelay <= 0) {
                for (const e of enemies) {
                    if (e.isDead || Math.hypot(e.x - this.x, e.y - this.y) > this.explosionRadius + e.r) continue;
                    const damage = e instanceof Boss && e.shield ? this.dmg * 0.5 : this.dmg;
                    if (e.isRemotePlayer) OnlineSession.queueDamage(damage);
                    else { OnlineSession.queueWorldDamage(e.netId, damage); e.hp -= damage; }
                    GameEngine.spawnParticles(e.x, e.y, this.color, 8, 2);
                }
                GameEngine.spawnParticles(this.x, this.y, this.color, 24, 3);
                this.isDead = true;
                return;
            }
            this.life -= dt;
            if (this.life <= 0) this.isDead = true;
            return;
        } else if (this.triggerRadius > 0) {
            this.explosionDelay -= dt;
            if (this.explosionDelay <= 0 && enemies.some(e => !e.isDead && Math.hypot(e.x - this.x, e.y - this.y) < this.triggerRadius + e.r)) {
                for (const e of enemies) {
                    if (e.isDead || Math.hypot(e.x - this.x, e.y - this.y) > (this.explosionRadius || this.r) + e.r) continue;
                    const damage = e instanceof Boss && e.shield ? this.dmg * 0.5 : this.dmg;
                    if (e.isRemotePlayer) OnlineSession.queueDamage(damage);
                    else { OnlineSession.queueWorldDamage(e.netId, damage); e.hp -= damage; }
                }
                GameEngine.spawnParticles(this.x, this.y, this.color, 20, 3);
                this.isDead = true;
                return;
            }
            this.life -= dt;
            if (this.life <= 0) this.isDead = true;
            return;
        }
        if (!this.isPuddle) {
            this.x += this.vx * dt; this.y += this.vy * dt;
        }
        this.life--;
        if (this.life <= 0) { this.isDead = true; return; }

        if (this.gravityPull > 0) {
            enemies.forEach(e => {
                const d = Math.hypot(e.x - this.x, e.y - this.y);
                if (d > 0 && d < this.r * 4 && !e.isDead) {
                    const pull = this.gravityPull * dt;
                    e.x += (this.x - e.x) / d * pull;
                    e.y += (this.y - e.y) / d * pull;
                }
            });
        }

        if (this.areaField) {
            for (const e of enemies) {
                if (e.isDead || Math.hypot(e.x - this.x, e.y - this.y) > this.r + e.r) continue;
                const damage = this.dmg * dt / 60 * (e instanceof Boss && e.shield ? 0.5 : 1);
                if (e.isRemotePlayer) OnlineSession.queueDamage(damage);
                else {
                    OnlineSession.queueWorldDamage(e.netId, damage);
                    e.hp -= damage;
                }
            }
            return;
        }

        if (this.hostile && player) {
            if (this.homing) {
                const ang = Math.atan2(player.y - this.y, player.x - this.x);
                const sp = Math.max(Math.hypot(this.vx, this.vy) * 1.1, 18);
                this.vx = Math.cos(ang) * sp;
                this.vy = Math.sin(ang) * sp;
            }
            if (Math.hypot(this.x - player.x, this.y - player.y) < player.r + this.r + 6) {
                player.takeDamage(this.dmg);
                GameEngine.spawnParticles(this.x, this.y, this.color, 14, 2.5);
                GameEngine.shake(6, 0.2);
                this.isDead = true;
            }
            if (Math.abs(this.x - player.x) > 5000 || Math.abs(this.y - player.y) > 5000) this.isDead = true;
            return;
        }
        if (this.homing) {
            let t = this.lockTarget && !this.lockTarget.isDead && !this.hitTargets.has(this.lockTarget) ? this.lockTarget : null;
            if (!t && enemies.length) {
                let best = null, bestD = 1e9;
                for (const e of enemies) {
                    if (e.isDead || this.hitTargets.has(e)) continue;
                    const d = Math.hypot(e.x - this.x, this.y - this.y);
                    if (d < bestD) { bestD = d; best = e; }
                }
                t = best;
            }
            if (t) {
                const ang = Math.atan2(t.y - this.y, t.x - this.x);
                const sp = Math.max(Math.hypot(this.vx, this.vy) * 1.06, 14);
                this.vx = Math.cos(ang) * sp;
                this.vy = Math.sin(ang) * sp;
            }
        }
        if (this.bounceLeft > 0) {
            const dist = Math.hypot(this.x - player.x, this.y - player.y);
            if (dist > MAP_RADIUS) {
                const ang = Math.atan2(this.y - player.y, this.x - player.x);
                this.vx = -Math.cos(ang) * Math.hypot(this.vx, this.vy);
                this.vy = -Math.sin(ang) * Math.hypot(this.vx, this.vy);
                this.bounceLeft--;
            }
        }
        for (const e of enemies) {
            if (e.isDead || this.hitTargets.has(e)) continue;
            if (Math.hypot(this.x - e.x, this.y - e.y) < e.r + this.r) {
                let dmg = this.dmg;
                if (e.isRemotePlayer) {
                    OnlineSession.queueDamage(dmg);
                    this.isDead = true;
                    return;
                }
                if (e instanceof Boss && e.shield) dmg *= 0.5;
                const appliedDamage = this.isPuddle ? dmg * dt / 60 : dmg;
                OnlineSession.queueWorldDamage(e.netId, appliedDamage);
                e.hp -= appliedDamage;

                if (this.knockback > 0) {
                    const ang = Math.atan2(e.y - (player ? player.y : this.y), e.x - (player ? player.x : this.x));
                    const kbMult = (e instanceof Boss ? 0.2 : 1);
                    e.kx += Math.cos(ang) * this.knockback * kbMult;
                    e.ky += Math.sin(ang) * this.knockback * kbMult;
                }

                if (player && player.lifesteal) {
                    player.hp = Math.min(player.maxHp, player.hp + dmg * player.lifesteal);
                }
                GameEngine.spawnParticles(this.x, this.y, this.color, 10, 2);
                if (this.burn) {
                    e.burnTime = 90;
                    e.burnDmg = this.burnDmg || (dmg * 0.18);
                }
                if (e instanceof Boss) GameEngine.shake(4, 0.15);
                else GameEngine.shake(2, 0.08);
                if (this.orbitRadius > 0) {
                    this.orbitHitTimers.set(e, 24);
                    continue;
                }
                if (this.bounceOnHit && this.bounceLeft > 0) {
                    this.hitTargets.add(e);
                    this.bounceLeft--;
                    let next = null, nextDistance = 260;
                    for (const candidate of enemies) {
                        if (candidate.isDead || this.hitTargets.has(candidate)) continue;
                        const distance = Math.hypot(candidate.x - e.x, candidate.y - e.y);
                        if (distance < nextDistance) { next = candidate; nextDistance = distance; }
                    }
                    if (!next) { this.isDead = true; return; }
                    const angle = Math.atan2(next.y - e.y, next.x - e.x);
                    const speed = Math.max(1, Math.hypot(this.vx, this.vy));
                    this.x = e.x;
                    this.y = e.y;
                    this.vx = Math.cos(angle) * speed;
                    this.vy = Math.sin(angle) * speed;
                    return;
                }
                if (this.boomerang) {
                    this.hitTargets.add(e);
                    continue;
                }
                if (this.chainLeft > 0) {
                    this.hitTargets.add(e);
                    this.chainLeft--;
                    let next = null, nextDistance = this.chainRadius;
                    for (const candidate of enemies) {
                        if (candidate.isDead || this.hitTargets.has(candidate)) continue;
                        const distance = Math.hypot(candidate.x - e.x, candidate.y - e.y);
                        if (distance < nextDistance) { next = candidate; nextDistance = distance; }
                    }
                    if (next) {
                        this.x = e.x; this.y = e.y;
                        this.lockTarget = next;
                        this.homing = true;
                    } else this.isDead = true;
                    return;
                }
                if (this.pierceLeft > 0) {
                    this.pierceLeft--;
                } else {
                    this.isDead = true;
                }
                return;
            }
        }
        if (Math.abs(this.x - player.x) > 5000 || Math.abs(this.y - player.y) > 5000) this.isDead = true;
    }
    draw(ctx, cam) {
        ctx.save();
        ctx.translate(this.x, this.y);
        if (this.beamLength > 0) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.beamWidth * 2;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 18;
            ctx.globalAlpha = 0.82;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(this.beamAngle) * this.beamLength, Math.sin(this.beamAngle) * this.beamLength);
            ctx.stroke();
            ctx.restore();
            return;
        }
        if (this.shockwaveMaxRadius > 0) {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = Math.max(4, this.shockwaveThickness);
            ctx.globalAlpha = 0.8;
            ctx.beginPath();
            ctx.arc(0, 0, this.shockwaveRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            return;
        }
        if (this.explosionRadius > 0 || this.triggerRadius > 0 || this.mine || this.areaField) {
            const radius = this.triggerRadius || this.explosionRadius || this.r;
            ctx.strokeStyle = this.color;
            ctx.fillStyle = this.color;
            ctx.globalAlpha = 0.2 + Math.sin(Date.now() / 90) * 0.08;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(-this.r, 0); ctx.lineTo(this.r, 0);
            ctx.moveTo(0, -this.r); ctx.lineTo(0, this.r);
            ctx.stroke();
            ctx.restore();
            return;
        }
        ctx.rotate(Math.atan2(this.vy, this.vx));
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > 0.1) {
            const tailLen = Math.min(40, speed * 2.2);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = Math.max(1, this.r * 0.4);
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(-tailLen, 0);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        const r = this.r;
        if (this.shape === 'blade') {
            ctx.fillStyle = this.color;
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(r * 2, 0);
            ctx.lineTo(-r * 1.2, r * 0.8);
            ctx.lineTo(-r * 0.6, 0);
            ctx.lineTo(-r * 1.2, -r * 0.8);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.shape === 'hex') {
            const grad = ctx.createRadialGradient(0, 0, r*0.2, 0, 0, r*1.1);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.25, this.color);
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = Math.PI/3 * i;
                const x = Math.cos(a) * r, y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        } else if (this.shape === 'lightning') {
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2.5;
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(-r*0.5, r*0.5);
            ctx.lineTo(0, 0);
            ctx.lineTo(-r*0.5, -r*0.5);
            ctx.lineTo(-r, 0);
            ctx.stroke();
            ctx.shadowBlur = 0;
        } else {
            const grad = ctx.createRadialGradient(0, 0, r*0.1, 0, 0, r*1.0);
            grad.addColorStop(0, '#ffffff');
            grad.addColorStop(0.3, this.color);
            grad.addColorStop(1, '#000000');
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'rgba(255,255,255,0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(r, 0);
            ctx.lineTo(0, r);
            ctx.lineTo(-r, 0);
            ctx.lineTo(0, -r);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }
}

// ─── 敵人 ─────────────────────────────────────────────────────────────────────
class Enemy {
    constructor(x, y, type = 'MELEE', stageIndex = 1, timeFactor = 1) {
        this.x = x; this.y = y;
        const s = ENEMY_STATS[type] || ENEMY_STATS.MELEE;
        const stageMul = 1 + (stageIndex - 1) * BALANCE.enemyHpStageStep;
        const timeMul = 1 + (timeFactor * BALANCE.enemyHpTimeStep);
        this.r = s.r;
        this.hp = s.hp * stageMul * timeMul * 1.08 * BALANCE.enemyHpGlobal;
        this.maxHp = this.hp;
        this.speed = s.speed * (1 + (stageIndex - 1) * 0.02);
        this.dmg = s.dmg * stageMul * (1 + timeFactor * 0.25) * (1 + (stageIndex - 1) * 0.03);
        this.expValue = Math.round(s.exp * stageMul * (0.8 + timeFactor * 0.4));
        this.color = s.color;
        this.eyeColor = s.eye;
        this.type = type;
        this.isDead = false;
        this.burnTime = 0;
        this.burnDmg = 0;
        this.frozenTime = 0;
        this.kx = 0;
        this.ky = 0;
    }
    update(dt, player) {
        if (this.frozenTime > 0) {
            this.frozenTime = Math.max(0, this.frozenTime - dt);
            if (this.burnTime > 0) {
                this.burnTime = Math.max(0, this.burnTime - dt);
                this.hp = Math.max(0, this.hp - (this.burnDmg || 0) * dt / 60);
            }
            return;
        }
        if (Math.abs(this.kx) > 0.1 || Math.abs(this.ky) > 0.1) {
            this.x += this.kx * dt;
            this.y += this.ky * dt;
            this.kx *= 0.85;
            this.ky *= 0.85;
        }

        const ang = Math.atan2(player.y - this.y, player.x - this.x);
        this.x += Math.cos(ang) * this.speed * dt;
        this.y += Math.sin(ang) * this.speed * dt;
        if (this.burnTime > 0) {
            this.burnTime = Math.max(0, this.burnTime - dt);
            this.hp = Math.max(0, this.hp - (this.burnDmg || 0) * dt / 60);
        }
        if (Math.hypot(player.x - this.x, player.y - this.y) < player.r + this.r + 8) {
            if (player.isRemotePlayer) OnlineSession.queueDamage(this.dmg * dt);
            else player.takeDamage(this.dmg * dt);
        }
    }
    draw(ctx, cam) {
        const barW = this.r * 2.4, barH = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(this.x - barW/2, this.y - this.r - barH - 6, barW, barH);
        ctx.fillStyle = this.hp > this.maxHp * 0.5 ? '#9ccc65' : this.hp > this.maxHp * 0.25 ? '#ffca28' : '#ef5350';
        ctx.fillRect(this.x - barW/2, this.y - this.r - barH - 6, barW * (this.hp / this.maxHp), barH);
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.fillStyle = this.color;
        if (this.type === 'MELEE') {
            ctx.fillRect(-this.r, -this.r, this.r*2, this.r*2);
        } else if (this.type === 'SHOOTER') {
            ctx.beginPath();
            for (let i = 0; i < 5; i++) {
                const a = (Math.PI*2/5)*i - Math.PI/2;
                const x = Math.cos(a) * this.r;
                const y = Math.sin(a) * this.r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'FAST') {
            ctx.beginPath();
            for (let i = 0; i < 3; i++) {
                const a = (Math.PI*2/3)*i - Math.PI/2;
                const x = Math.cos(a) * this.r;
                const y = Math.sin(a) * this.r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'TANK') {
            ctx.beginPath();
            for (let i = 0; i < 8; i++) {
                const a = (Math.PI*2/8)*i;
                const x = Math.cos(a) * this.r;
                const y = Math.sin(a) * this.r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else if (this.type === 'FLY') {
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = (Math.PI*2/6)*i;
                const x = Math.cos(a) * this.r;
                const y = Math.sin(a) * this.r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const a = (Math.PI*2/10)*i;
                const r = i%2 === 0 ? this.r*1.3 : this.r*0.5;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
}

// ─── BOSS ─────────────────────────────────────────────────────────────────────
class Boss {
    constructor(x, y, hp = 900, index = 1, timeFactor = 1) {
        this.x = x; this.y = y; this.r = 58;
        const stageMul = 1 + (index - 1) * BALANCE.enemyHpStageStep;
        const tf = Math.max(1, timeFactor);
        this.maxHp = hp * stageMul * BALANCE.bossHpMul * tf;
        this.hp = this.maxHp;
        this.speed = (2.2 + (index - 1) * 0.1) * (0.9 + tf * 0.12);
        this.baseDmg = (0.45 + (index - 1) * 0.06) * tf;
        this.kx = 0; this.ky = 0;
        this.isDead = false;
        this.index = index;
        this.timeFactor = tf;
        this.enraged = false;
        this.skillTimer = 0;
        this.shield = true;
        this.shieldTime = 200;
        this.chargeAlpha = 0;
        this.skillName = '';
        this.skillColor = '#ffffff';
        this.burnTime = 0;
        this.burnDmg = 0;
        this.skillTextTimer = 0;
        this.frozenTime = 0;
        this.warningLine = null;
        this.warningTimer = 0;
        this.pendingSkillRoll = null;
        this.lockedAimAng = 0;
        this.dashTimer = 0;
        this.dashAngle = 0;
        this.dashSpeed = 0;
    }
    update(dt, player, projectiles) {
        if (this.frozenTime > 0) {
            this.frozenTime = Math.max(0, this.frozenTime - dt);
            if (this.burnTime > 0) {
                this.burnTime = Math.max(0, this.burnTime - dt);
                this.hp = Math.max(0, this.hp - (this.burnDmg || 0) * dt / 60);
            }
            return;
        }
        if (this.shieldTime > 0) {
            this.shieldTime -= dt;
            if (this.shieldTime <= 0) this.shield = false;
        }
        if (this.burnTime > 0) {
            this.burnTime = Math.max(0, this.burnTime - dt);
            this.hp = Math.max(0, this.hp - (this.burnDmg || 0) * dt / 60);
        }
        if (!this.enraged && this.hp <= this.maxHp * 0.4) {
            this.enraged = true;
            this.speed *= 1.3;
            this.baseDmg *= 1.2;
            this.skillName = '狂暴化！';
            this.skillColor = '#ff5252';
            this.skillTextTimer = 90;
            GameEngine.showAlert('BOSS 進入狂暴！');
            GameEngine.shake(10, 0.35);
        }

        if (this.dashTimer > 0) {
            const dashStep = Math.min(dt, this.dashTimer);
            this.x += Math.cos(this.dashAngle) * this.dashSpeed * dashStep;
            this.y += Math.sin(this.dashAngle) * this.dashSpeed * dashStep;
            this.dashTimer -= dashStep;
            if (Math.hypot(player.x-this.x, player.y-this.y) < player.r + this.r + 8) player.takeDamage((this.baseDmg * 3.5) * dashStep);
            if (this.dashTimer <= 0) { this.skillName='衝刺完成！'; this.skillColor='#ff5252'; this.skillTextTimer=45; }
            return;
        }
        if (this.warningTimer > 0) {
            this.warningTimer -= dt;
            if (this.skillTextTimer > 0) this.skillTextTimer = Math.max(0, this.skillTextTimer - dt);
            if (this.warningTimer <= 0) {
                this._firePendingSkill(player, projectiles);
            }
            return;
        }

        const ang = Math.atan2(player.y - this.y, player.x - this.x);
        const moveSpd = this.speed * (this.enraged ? 1.1 : 1);
        this.x += Math.cos(ang) * moveSpd * dt;
        this.y += Math.sin(ang) * moveSpd * dt;
        if (Math.hypot(player.x - this.x, player.y - this.y) < player.r + this.r)
            player.takeDamage(this.baseDmg * dt * (this.enraged ? 1.25 : 1));
        this.skillTimer += dt;
        let skillInterval = Math.max(22, 45 - (this.index - 1) * 1.5);
        if (this.enraged) skillInterval *= 0.75;
        const chargeStart = Math.max(0, skillInterval - 18);
        const charge = Math.max(0, Math.min(1, (this.skillTimer - chargeStart) / 18));
        if (charge > 0) {
            this.chargeAlpha = charge;
            if (this.skillTextTimer <= 0) {
                this.skillName = 'BOSS 技能即將啟動';
                this.skillColor = '#ffcc00';
                this.skillTextTimer = 24;
            }
        }
        if (this.skillTextTimer > 0) this.skillTextTimer = Math.max(0, this.skillTextTimer - dt);

        if (this.skillTimer > skillInterval) {
            this.skillTimer = 0;
            this.chargeAlpha = 0;
            this.warningTimer = 70;
            this.lockedAimAng = Math.atan2(player.y - this.y, player.x - this.x);
            const aimDist = Math.hypot(player.x - this.x, player.y - this.y);
            this.warningLine = {
                tx: this.x + Math.cos(this.lockedAimAng) * Math.max(aimDist, 280),
                ty: this.y + Math.sin(this.lockedAimAng) * Math.max(aimDist, 280),
                ang: this.lockedAimAng
            };
            this.pendingSkillRoll = Math.random();
            this.skillName = '攻擊預警！';
            this.skillColor = '#ff1744';
            this.skillTextTimer = 70;
            GameEngine.showAlert('注意紅條！BOSS 即將攻擊');
        }
    }
    _firePendingSkill(player, projectiles) {
        const roll = this.pendingSkillRoll != null ? this.pendingSkillRoll : Math.random();
        this.pendingSkillRoll = null;
        this.warningTimer = 0;
        this.warningLine = null;
        const hitDmg = (8 + this.index * 1.4) * this.timeFactor * (this.enraged ? 1.15 : 1);
        const aimAng = this.lockedAimAng || Math.atan2(player.y - this.y, player.x - this.x);
        const bossProj = (vx, vy, dmg, color, extra) => new Projectile(this.x, this.y, vx, vy, dmg, color, Object.assign({
            hostile: true, life: 420, skillId: 'boss_atk'
        }, extra));
        if (roll < 0.24) {
            this.dashAngle = aimAng;
            this.dashSpeed = 19 + this.index * 0.65 + (this.enraged ? 5 : 0);
            this.dashTimer = this.enraged ? 28 : 22;
            this.skillName = '紅線衝刺！'; this.skillColor = '#ff1744'; this.skillTextTimer = 70;
            GameEngine.showAlert('BOSS：紅線衝刺！快往旁邊躲！');
            GameEngine.shake(9, 0.3);
            GameEngine.spawnParticles(this.x, this.y, '#ff1744', 18, 4);
        } else if (roll < 0.48) {
            const count = this.enraged ? 20 : 16;
            for (let i = 0; i < count; i++) {
                const a = Math.PI * 2 * i / count;
                const sp = 10 + this.index * 0.4;
                projectiles.push(bossProj(Math.cos(a) * sp, Math.sin(a) * sp, hitDmg * 0.8, '#ff8a65', { r: 9, shape: 'hex', skillId: 'boss_burst' }));
            }
            const fan = this.enraged ? 7 : 5;
            for (let i = 0; i < fan; i++) {
                const off = aimAng + (i - (fan - 1) / 2) * 0.14;
                const sp = 15 + this.index * 0.45;
                projectiles.push(bossProj(Math.cos(off) * sp, Math.sin(off) * sp, hitDmg * 0.95, '#ff5722', { r: 10, shape: 'lightning', skillId: 'boss_burst_aim' }));
            }
            this.skillName = '放射彈幕！';
            this.skillColor = '#ff8a65';
            this.skillTextTimer = 72;
            GameEngine.showAlert('BOSS：放射彈幕！');
            GameEngine.shake(6, 0.22);
            GameEngine.spawnParticles(this.x, this.y, '#ff8a65', 18, 3);
        } else if (roll < 0.70) {
            const sp = 17 + this.index * 0.5;
            const beams = this.enraged ? 5 : 4;
            for (let i = 0; i < beams; i++) {
                const off = aimAng + (i - (beams - 1) / 2) * 0.09;
                projectiles.push(bossProj(Math.cos(off) * sp, Math.sin(off) * sp, hitDmg * 2.1, '#ffeb3b', { r: 11, shape: 'lightning', skillId: 'boss_laser', life: 480 }));
            }
            this.skillName = '能量狙擊！';
            this.skillColor = '#ffeb3b';
            this.skillTextTimer = 72;
            GameEngine.showAlert('BOSS：能量狙擊！');
            GameEngine.shake(6, 0.22);
            GameEngine.spawnParticles(this.x, this.y, '#ffeb3b', 14, 3);
        } else if (roll < 0.87) {
            const rainCount = this.enraged ? 10 : 7;
            for (let i = 0; i < rainCount; i++) {
                const baseAng = aimAng + (Math.random() - 0.5) * 1.0;
                const sp = 12 + this.index * 0.35;
                projectiles.push(bossProj(Math.cos(baseAng) * sp, Math.sin(baseAng) * sp, hitDmg * 0.9, '#ff7043', {
                    r: 10, shape: 'diamond', skillId: 'boss_fire', life: 500
                }));
            }
            this.skillName = '追蹤火雨！';
            this.skillColor = '#ff7043';
            this.skillTextTimer = 72;
            GameEngine.showAlert('BOSS：追蹤火雨！');
            GameEngine.shake(6, 0.22);
            GameEngine.spawnParticles(this.x, this.y, '#ff7043', 16, 3);
        } else {
            const rings = this.enraged ? 2 : 2;
            const aimDist = Math.max(Math.hypot(player.x - this.x, player.y - this.y), 280);
            const tx = this.x + Math.cos(aimAng) * aimDist;
            const ty = this.y + Math.sin(aimAng) * aimDist;
            for (let w = 0; w < rings; w++) {
                const count = 8 + w * 3;
                const ringR = 50 + w * 40;
                for (let i = 0; i < count; i++) {
                    const a = Math.PI * 2 * i / count;
                    const ox = tx + Math.cos(a) * ringR;
                    const oy = ty + Math.sin(a) * ringR;
                    const sp = 9 + w * 2;
                    projectiles.push(new Projectile(ox, oy, Math.cos(a) * sp, Math.sin(a) * sp, hitDmg * 1.9, '#e040fb', {
                        hostile: true, r: 10, shape: 'hex', skillId: 'boss_ring', life: 400
                    }));
                }
            }
            this.skillName = '壓制光環！';
            this.skillColor = '#e040fb';
            this.skillTextTimer = 72;
            GameEngine.showAlert('BOSS：壓制光環！');
            GameEngine.shake(7, 0.25);
            GameEngine.spawnParticles(tx, ty, '#e040fb', 20, 3);
        }
    }
    draw(ctx, cam) {
        const barW = this.r * 2, barH = 6;
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(this.x - barW/2, this.y - this.r - barH - 10, barW, barH);
        ctx.fillStyle = this.hp > this.maxHp * 0.5 ? '#c5e1a5' : this.hp > this.maxHp * 0.25 ? '#ffe082' : '#ef9a9a';
        ctx.fillRect(this.x - barW/2, this.y - this.r - barH - 10, barW * (this.hp / this.maxHp), barH);
        ctx.save();

        if (this.warningTimer > 0 && this.warningLine) {
            const pulse = 0.55 + Math.sin(Date.now() / 80) * 0.25;
            const ang = this.warningLine.ang != null ? this.warningLine.ang : Math.atan2(this.warningLine.ty - this.y, this.warningLine.tx - this.x);
            const len = Math.hypot(this.warningLine.tx - this.x, this.warningLine.ty - this.y);
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(ang);
            ctx.fillStyle = 'rgba(255, 20, 40,' + (0.22 * pulse) + ')';
            ctx.fillRect(0, -18, len, 36);
            ctx.fillStyle = 'rgba(255, 60, 60,' + (0.45 * pulse) + ')';
            ctx.fillRect(0, -8, len, 16);
            ctx.strokeStyle = 'rgba(255, 0, 0,' + (0.9 * pulse) + ')';
            ctx.lineWidth = 3;
            ctx.setLineDash([14, 8]);
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(len, 0);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
            ctx.strokeStyle = 'rgba(255, 40, 40,' + (0.85 * pulse) + ')';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.warningLine.tx, this.warningLine.ty, 36 + Math.sin(Date.now() / 70) * 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = 'rgba(255, 0, 0, 0.12)';
            ctx.beginPath();
            ctx.arc(this.warningLine.tx, this.warningLine.ty, 36, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.translate(this.x, this.y);
        const phase = (this.index % 4);
        const colors = [
            ['#ffe0b2', '#ff6e40', '#1b0000', '#ffb74d'],
            ['#e1f5fe', '#4fc3f7', '#00101a', '#4fc3f7'],
            ['#f3e5f5', '#ba68c8', '#1a001f', '#ba68c8'],
            ['#c8e6c9', '#81c784', '#00210b', '#81c784']
        ];
        const pal = colors[phase];
        const outerGrad = ctx.createRadialGradient(0, -this.r*0.2, this.r*0.4, 0, 0, this.r*1.5);
        outerGrad.addColorStop(0, pal[0]);
        outerGrad.addColorStop(0.35, pal[1]);
        outerGrad.addColorStop(1, pal[2]);
        ctx.fillStyle = outerGrad;
        ctx.strokeStyle = pal[3];
        ctx.lineWidth = 4;
        ctx.shadowColor = '#ff6d00';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.r * 1.25, this.r * 1.05, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffcc80';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-this.r * 0.9, -this.r * 0.2);
        ctx.lineTo(this.r * 0.9, -this.r * 0.2);
        ctx.moveTo(-this.r * 0.6, 0);
        ctx.lineTo(this.r * 0.6, 0);
        ctx.moveTo(0, -this.r * 0.9);
        ctx.lineTo(0, this.r * 0.9);
        ctx.stroke();
        ctx.fillStyle = '#fff3e0';
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,110,64,0.9)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.r * 1.7, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 6; i++) {
            const ang = (Math.PI * 2 / 6) * i;
            const x = Math.cos(ang) * this.r * 1.7;
            const y = Math.sin(ang) * this.r * 1.7;
            ctx.beginPath();
            ctx.arc(x, y, this.r * 0.14, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.shield) {
            const alpha = Math.max(0, Math.min(1, this.shieldTime / 120));
            ctx.strokeStyle = `rgba(80,220,255,${alpha})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * 2.2, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.chargeAlpha > 0) {
            ctx.strokeStyle = `rgba(255,80,80,${this.chargeAlpha * 0.85})`;
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * 2.8 + Math.sin(Date.now()/120) * 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.strokeStyle = `rgba(255,200,80,${this.chargeAlpha * 0.55})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.r * 3.4 + Math.cos(Date.now()/140) * 4, 0, Math.PI * 2);
            ctx.stroke();
        }
        if (this.skillTextTimer > 0 && this.skillName) {
            ctx.font = '18px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = this.skillColor;
            ctx.strokeStyle = 'rgba(0,0,0,0.7)';
            ctx.lineWidth = 5;
            ctx.strokeText(this.skillName, 0, -this.r - 24);
            ctx.fillText(this.skillName, 0, -this.r - 24);
        }
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ─── 玩家 ─────────────────────────────────────────────────────────────────────
class Player {
    constructor() { this.reset(); }
    reset() {
        this.x = 0; this.y = 0;
        this.hp = 100; this.maxHp = 100; this.xp = 0; this.xpToNext = 100; this.lv = 1;
        this.speed = 4; this.r = 20; this.magnetDist = 160;
        this.walkCycle = 0;
        this.facingAngle = -Math.PI / 2;
        this.isMoving = false;
        this.regenTimer = 0;
        this.equipAtk = 0;
        this.critRate = 0;
        this.petDmg = 0;
        const pet = getEquippedPet();
        const petDef = pet ? PET_DEFS[pet.id] : null;
        this.petDmg = petDef ? (petDef.assist || 0) : 0;
        this.petDamageMult = 1;
        this.petDefense = petDef ? (petDef.defense || 0) + (petDef.shield || 0) : 0;
        this.applyTalents();
        this.skin = SaveSystem.currentData.skin || 'default';
        this.skinAttackTimer = 0;
        this.domainActive = 0;
        this.domainCooldown = 0;
        this.domainWarning = 0;
        this.domainRadius = GOJO_DOMAIN_RADIUS;
    }
    getMagnetRadius() {
        const forcefield = BattleSkills.getActive('forcefield');
        return forcefield ? 160 + forcefield.stars * 36 + (forcefield.evo ? 80 : 0) : this.magnetDist;
    }
    applyTalents() {
        const t = SaveSystem.currentData.talents;
        this.equipAtk = Math.min(t.ATK || 0, 20) * 2;
        this.maxHp += (t.HP || 0) * 22;
        this.hp = this.maxHp;
        const speedLevel = Math.min(t.SPD || 0, 10);
        this.speed += speedLevel * 0.4;
        const recLevel = Math.min(t.REC || 0, 10);
        this.regenPerSec = recLevel * 1.2;
    }
    update(dt, projectiles, enemies) {
        const canMove = !GameEngine.pendingLevelUp && !GameEngine.pendingEvo;
        let dx = 0, dy = 0;
        if (canMove) {
            if (Input.keys['w']) dy -= 1;
            if (Input.keys['s']) dy += 1;
            if (Input.keys['a']) dx -= 1;
            if (Input.keys['d']) dx += 1;
            if (navigator.getGamepads) {
                const gp = navigator.getGamepads()[0];
                if (gp) {
                    const ax = gp.axes[0] || 0;
                    const ay = gp.axes[1] || 0;
                    const deadZone = 0.2;
                    if (Math.abs(ax) > deadZone || Math.abs(ay) > deadZone) {
                        dx += ax;
                        dy += ay;
                    }
                }
            }
            if (Input.joystick && Input.joystick.active) {
                dx += Input.joystick.dx;
                dy += Input.joystick.dy;
            }
            if (!Input.joystick.active && Input.mouseActive && dx === 0 && dy === 0) {
                const cx = window.innerWidth / 2;
                const cy = window.innerHeight / 2;
                const vx = Input.mouseX - cx;
                const vy = Input.mouseY - cy;
                const dist = Math.hypot(vx, vy);
                if (dist > 40) {
                    dx += vx / dist;
                    dy += vy / dist;
                }
            }
        }
        const len = Math.hypot(dx, dy);
        if (len > 0 && canMove) {
            let speedBase = this.speed;
            const sp = speedBase * dt;
            this.x += dx / len * sp;
            this.y += dy / len * sp;
            this.isMoving = true;
            this.facingAngle = Math.atan2(dy, dx);
            this.walkCycle += dt * Math.min(1.8, len) * 0.32;
        } else {
            this.isMoving = false;
            this.walkCycle += dt * 0.035;
        }
        const dist = Math.hypot(this.x, this.y);
        const allowedRadius = GameEngine.onlineMode === 'versus' ? getDuelArenaRadius() : MAP_RADIUS;
        if (dist > allowedRadius) {
            const safeRadius = Math.max(80, allowedRadius - 12);
            this.x *= safeRadius / Math.max(1, dist);
            this.y *= safeRadius / Math.max(1, dist);
        }
        if (!(GameEngine.onlineMode === 'versus')) {
            if (this.regenPerSec) this.hp = Math.min(this.maxHp, this.hp + this.regenPerSec * dt / 60);
            this.regenTimer += dt;
            if (this.regenTimer > 180) {
                this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.012 * (dt / 60));
            }
        }
        const gs = BattleSkills.getActive('gojoDomain');
        if (this.skin === 'gojo' && gs) {
            if (this.domainCooldown > 0) this.domainCooldown = Math.max(0, this.domainCooldown - dt);
            if (this.domainActive > 0) {
                this.domainActive = Math.max(0, this.domainActive - dt);
                this.applyDomainFreeze(enemies, GameEngine.bosses);
            } else if (this.domainWarning > 0) {
                this.domainWarning = Math.max(0, this.domainWarning - dt);
                if (this.domainWarning <= 0) {
                    this.triggerGojoDomain(gs.stars, gs.evo);
                }
            } else if (this.domainCooldown <= 0) {
                this.domainWarning = GOJO_DOMAIN_WARN;
                this.domainRadius = GOJO_DOMAIN_RADIUS + gs.stars * 18 + (gs.evo ? 50 : 0);
                GameEngine.showAlert('領域展開準備中… 3 秒');
            }
        } else if (this.skin && this.skin !== 'default') {
            this.skinAttackTimer += dt;
            if (this.skinAttackTimer >= 40) {
                this.skinAttackTimer = 0;
                this.fireSkinAttack(projectiles, enemies);
            }
        }
    }
    triggerGojoDomain(bonusStars = 0, evo = false) {
        this.domainWarning = 0;
        this.domainActive = GOJO_DOMAIN_DURATION;
        this.domainCooldown = GOJO_DOMAIN_COOLDOWN;
        this.domainRadius = GOJO_DOMAIN_RADIUS + bonusStars * 18 + (evo ? 50 : 0);
        GameEngine.showAlert('領域展開！範圍內時停 5 秒');
        GameEngine.shake(8, 0.3);
        GameEngine.spawnParticles(this.x, this.y, '#7e57c2', 28, 4);
        GameEngine.spawnParticles(this.x, this.y, '#e1bee7', 16, 3);
    }
    applyDomainFreeze(enemies, bosses) {
        const r = this.domainRadius || GOJO_DOMAIN_RADIUS;
        for (const e of enemies) {
            if (e.isDead) continue;
            if (Math.hypot(e.x - this.x, e.y - this.y) <= r) {
                e.frozenTime = Math.max(e.frozenTime || 0, this.domainActive);
            }
        }
        for (const b of bosses || []) {
            if (b.isDead) continue;
            if (Math.hypot(b.x - this.x, b.y - this.y) <= r) {
                b.frozenTime = Math.max(b.frozenTime || 0, this.domainActive);
            }
        }
    }
    fireSkinAttack(projectiles, enemies) {
        if (!projectiles) return;
        const speed = 10;
        if (this.skin === 'CD') {
            for (let i = 0; i < 2; i++) {
                const offsetX = (Math.random() - 0.5) * 260;
                const startX = this.x + offsetX;
                const startY = this.y - 420 - Math.random() * 80;
                const targetY = this.y + 40 + Math.random() * 80;
                const ang = Math.atan2(targetY - startY, this.x - startX + (Math.random() - 0.5) * 60);
                projectiles.push(new Projectile(startX, startY, Math.cos(ang) * speed, Math.sin(ang) * speed, 18, '#4dd0e1', {
                    r: 8, shape:'hex', skillId:'rainGod', life: 260, bounce: 0
                }));
            }
            GameEngine.spawnParticles(this.x, this.y - 60, '#4dd0e1', 10, 2);
            return;
        }
        if (this.skin === 'meowl') {
            const sorted = enemies.filter(e => !e.isDead).sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
            const target = sorted[0] || null;
            const baseAng = target ? Math.atan2(target.y - this.y, target.x - this.x) : Math.random() * Math.PI * 2;
            for (let i = 0; i < 2; i++) {
                const ang = baseAng + (i - 0.5) * 0.35;
                projectiles.push(new Projectile(this.x, this.y, Math.cos(ang) * speed, Math.sin(ang) * speed, 16, '#d500f9', {
                    r: 8, shape:'lightning', life: 260, burn: true, burnDmg: 1.4, homing: true, lockTarget: target || undefined, skillId:'owlStrike'
                }));
            }
            GameEngine.spawnParticles(this.x, this.y, '#ff80ab', 8, 2);
            return;
        }
    }
    drawStickman(ctx) {
        const swing = this.isMoving ? Math.sin(this.walkCycle) * 0.72 : Math.sin(this.walkCycle) * 0.06;
        const bob = this.isMoving ? Math.abs(Math.sin(this.walkCycle * 2)) * 2 : Math.sin(this.walkCycle) * 0.7;
        ctx.save();
        ctx.rotate(this.facingAngle + Math.PI / 2);
        ctx.translate(0, -bob);
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        ctx.beginPath();
        ctx.ellipse(0, 18 + bob, 11, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 9;
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.arc(0, -15, 8, 0, Math.PI * 2);
        ctx.moveTo(0, -6);
        ctx.lineTo(0, 11);
        ctx.moveTo(0, -2);
        ctx.lineTo(Math.sin(swing) * 11, 7 + Math.cos(swing) * 3);
        ctx.moveTo(0, -2);
        ctx.lineTo(-Math.sin(swing) * 11, 7 - Math.cos(swing) * 3);
        ctx.moveTo(0, 11);
        ctx.lineTo(Math.sin(swing) * 10, 26);
        ctx.moveTo(0, 11);
        ctx.lineTo(-Math.sin(swing) * 10, 26);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#f4fbff';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = '#f4fbff';
        ctx.beginPath();
        ctx.arc(0, -15, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    takeDamage(amt) {
        this.hp = Math.max(0, this.hp - amt * Math.max(0.5, 1 - this.petDefense));
        this.regenTimer = 0;
        GameEngine.shake(3, 0.12);
        if (this.hp <= 0) GameEngine.gameOver();
    }
    addXp(value) {
        this.xp += value;
        while (this.xp >= this.xpToNext) {
            this.xp -= this.xpToNext;
            this.lv++;
            this.xpToNext = Math.floor(BALANCE.xpBase + this.lv * BALANCE.xpLinear + Math.pow(this.lv, BALANCE.xpPow) * BALANCE.xpPowMul);
            GameEngine.queueLevelUp();
        }
    }
    draw(ctx, cam) {
        ctx.save();
        ctx.translate(this.x, this.y);
        const forcefield = BattleSkills.getActive('forcefield');
        if (forcefield) {
            const radius = this.getMagnetRadius();
            const pulse = 0.38 + Math.sin(Date.now() / 180) * 0.08;
            ctx.strokeStyle = 'rgba(77,208,225,' + pulse + ')';
            ctx.fillStyle = 'rgba(77,208,225,0.045)';
            ctx.lineWidth = forcefield.evo ? 4 : 2.5;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        if (this.domainWarning > 0) {
            const r = this.domainRadius || GOJO_DOMAIN_RADIUS;
            const prog = 1 - this.domainWarning / GOJO_DOMAIN_WARN;
            const warnR = r * (0.35 + prog * 0.65);
            const alpha = 0.25 + prog * 0.45;
            ctx.strokeStyle = 'rgba(225,190,255,' + alpha + ')';
            ctx.lineWidth = 4;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.arc(0, 0, warnR, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(126,87,194,' + (alpha * 0.35) + ')';
            ctx.beginPath();
            ctx.arc(0, 0, warnR, 0, Math.PI * 2);
            ctx.fill();
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillText('領域展開', 0, -warnR - 12);
        }
        if (this.domainActive > 0) {
            const r = this.domainRadius || GOJO_DOMAIN_RADIUS;
            const pulse = 0.55 + Math.sin(Date.now() / 120) * 0.12;
            ctx.strokeStyle = 'rgba(187,134,252,' + pulse + ')';
            ctx.lineWidth = 3;
            ctx.setLineDash([10, 8]);
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            const grad = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r);
            grad.addColorStop(0, 'rgba(126,87,194,0.18)');
            grad.addColorStop(1, 'rgba(126,87,194,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
        }
        const skinCfg = PLAYER_SKINS[this.skin];
        const skinImg = SkinImages[this.skin];
        if (this.skin === 'stickman') {
            this.drawStickman(ctx);
            ctx.restore();
            return;
        }
        if (skinImg && skinImg.complete) {
            const maxW = (skinCfg && skinCfg.imgMaxW) || 72;
            const maxH = (skinCfg && skinCfg.imgMaxH) || 72;
            drawSkinImageFit(ctx, skinImg, maxW, maxH);
            ctx.restore();
            return;
        }
        ctx.strokeStyle = '#00d2ff';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#00d2ff';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#00d2ff';
        ctx.beginPath();
        ctx.moveTo(0, -22);
        ctx.lineTo(18, 8);
        ctx.lineTo(8, 22);
        ctx.lineTo(-8, 22);
        ctx.lineTo(-18, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();
    }
}

// ─── 局內主動技能 ─────────────────────────────────────────────────────────────
const BattleSkills = {
    active: [], maxActive: Infinity,
    addActive(id) {
        const ex = this.active.find(a => a.id === id);
        if (ex) {
            if (ex.stars < 5) {
                ex.stars++;
                if (GameEngine.onSkillLeveled) GameEngine.onSkillLeveled(id, ex.stars);
            }
            return true;
        }
        this.active.push({ id, stars: 1, evo: false });
        if (GameEngine.onSkillLeveled) GameEngine.onSkillLeveled(id, 1);
        return true;
    },
    getActive(id) { return this.active.find(a => a.id === id); },
    canEvo(activeId) {
        const a = this.getActive(activeId);
        if (!a || a.stars < 5 || a.evo) return null;
        const conf = ACTIVE_SKILLS[activeId];
        return conf ? conf.evoName : null;
    },
    doEvo(activeId) { const a = this.getActive(activeId); if (a) a.evo = true; },
    reset() { this.active = []; }
};

// ─── 武器發射邏輯 ─────────────────────────────────────────────────────────────
function fireWeapon(skillId, player, projectiles, enemies, stats) {
    const a = BattleSkills.getActive(skillId);
    if (!a) return;
    const baseDmg = 30 + a.stars * 12 + (stats.atk || 0) + (player.equipAtk || 0);
    const mult = (skillId === 'kunai' ? 0.8 : 0.95);
    const dmg = baseDmg * skillLevelDamageMult(a.stars, a.evo) * mult;
    const crit = ((player.critRate || 0) + (stats.crit || 0)) > Math.random() ? 2 : 1;
    const finalDmg = dmg * crit * (1 + (stats.burst || 0)) * (GameEngine.skillBuff || 1) * (player.petDamageMult || 1);
    const spd = 10 + (stats.range ? 2 : 0);

    if (skillId === 'kunai') {
        const count = skillProjCount(1, a.stars, a.evo, 2);
        const sorted = [...enemies].filter(e => !e.isDead).sort((a, b) =>
            Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
        for (let i = 0; i < count; i++) {
            const target = sorted[0] || null;
            const ang = target ? Math.atan2(target.y - player.y, target.x - player.x) : (Math.PI * 2 * i / Math.max(count, 1));
            const proj = new Projectile(player.x, player.y, Math.cos(ang)*spd*1.2, Math.sin(ang)*spd*1.2, finalDmg, a.evo ? '#00ffcc' : '#00d2ff', {
                homing: true, r: a.evo ? 8 : 6, shape: 'blade', lockTarget: target || undefined, skillId
            });
            projectiles.push(proj);
        }
        return;
    }
    if (skillId === 'ionCannon') {
        const target = enemies.filter(e => !e.isDead).sort((left, right) =>
            Math.hypot(left.x - player.x, left.y - player.y) - Math.hypot(right.x - player.x, right.y - player.y))[0];
        const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.random() * Math.PI * 2;
        projectiles.push(new Projectile(player.x, player.y, 0, 0, finalDmg * 0.28, '#64ffda', {
            skillId, life: a.evo ? 30 : 20, beamLength: 360 + a.stars * 45 + (a.evo ? 180 : 0),
            beamAngle: angle, beamWidth: 9 + a.stars * 1.5
        }));
        return;
    }
    if (skillId === 'chakram') {
        const count = skillProjCount(1, a.stars, a.evo, 2);
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i / count) + Math.atan2(player.y, player.x);
            projectiles.push(new Projectile(player.x, player.y, Math.cos(angle) * spd * 1.4, Math.sin(angle) * spd * 1.4,
                finalDmg * 0.9, '#ffca28', {
                    skillId, r: a.evo ? 14 : 10, shape: 'blade', life: 180,
                    boomerang: true, maxRange: 230 + a.stars * 36 + (a.evo ? 120 : 0)
                }));
        }
        return;
    }
    if (skillId === 'drillShot') {
        const target = enemies.filter(e => !e.isDead).sort((left, right) =>
            Math.hypot(left.x - player.x, left.y - player.y) - Math.hypot(right.x - player.x, right.y - player.y))[0];
        const count = skillProjCount(1, a.stars, a.evo, 1);
        const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.y, player.x);
        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 0.1;
            const shotAngle = angle + spread;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(shotAngle) * spd * 1.8, Math.sin(shotAngle) * spd * 1.8,
                finalDmg * 1.25, '#80cbc4', {
                    skillId, r: a.evo ? 10 : 7, shape: 'lightning', life: 360,
                    pierceLeft: 2 + Math.floor((a.stars - 1) / 2) + (a.evo ? 1 : 0)
                }));
        }
        return;
    }
    if (skillId === 'ricochet') {
        const target = enemies.filter(e => !e.isDead).sort((left, right) =>
            Math.hypot(left.x - player.x, left.y - player.y) - Math.hypot(right.x - player.x, right.y - player.y))[0];
        const count = skillProjCount(1, a.stars, a.evo, 1);
        for (let i = 0; i < count; i++) {
            const angle = target
                ? Math.atan2(target.y - player.y, target.x - player.x) + (i - (count - 1) / 2) * 0.18
                : Math.random() * Math.PI * 2;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(angle) * spd * 1.25, Math.sin(angle) * spd * 1.25,
                finalDmg * 0.82, '#ce93d8', {
                    skillId, r: a.evo ? 10 : 7, shape: 'hex', life: 420,
                    bounceLeft: 2 + Math.floor((a.stars - 1) / 2) + (a.evo ? 1 : 0), bounceOnHit: true
                }));
        }
        return;
    }
    if (skillId === 'gravityWell') {
        const target = enemies.filter(e => !e.isDead).sort((left, right) =>
            Math.hypot(left.x - player.x, left.y - player.y) - Math.hypot(right.x - player.x, right.y - player.y))[0];
        const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.random() * Math.PI * 2;
        const distance = target ? Math.min(150, Math.hypot(target.x - player.x, target.y - player.y)) : 110;
        const radius = 48 + a.stars * 5 + (a.evo ? 18 : 0);
        projectiles.push(new Projectile(player.x + Math.cos(angle) * distance, player.y + Math.sin(angle) * distance, 0, 0,
            finalDmg * 0.35, '#7e57c2', {
                skillId, r: radius, shape: 'orb', life: a.evo ? 150 : 120,
                isPuddle: true, areaField: true, gravityPull: a.evo ? 1.1 : 0.8
            }));
        return;
    }
    if (skillId === 'minefield') {
        const count = skillProjCount(3, a.stars, a.evo, 3);
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 100 + Math.random() * 180;
            const x = player.x + Math.cos(angle) * distance;
            const y = player.y + Math.sin(angle) * distance;
            projectiles.push(new Projectile(x, y, 0, 0, finalDmg * 1.6, '#b2ff59', {
                skillId, r: 13, shape: 'hex', life: 420, explosionDelay: 45,
                mine: true, triggerRadius: 72 + a.stars * 8, explosionRadius: 76 + a.stars * 10 + (a.evo ? 50 : 0)
            }));
        }
        return;
    }
    if (skillId === 'orbitBlades') {
        const count = skillProjCount(2, a.stars, a.evo, 3);
        for (let i = 0; i < count; i++) {
            projectiles.push(new Projectile(player.x, player.y, 0, 0, finalDmg * 0.75, '#f06292', {
                skillId, r: a.evo ? 13 : 10, shape: 'blade', life: 150 + a.stars * 12,
                orbitRadius: 58 + a.stars * 9 + (a.evo ? 45 : 0),
                orbitAngle: Math.PI * 2 * i / count,
                orbitSpeed: (i % 2 ? -1 : 1) * (0.045 + a.stars * 0.004)
            }));
        }
        return;
    }
    if (skillId === 'stormCaller') {
        const count = skillProjCount(2, a.stars, a.evo, 2);
        const targets = enemies.filter(e => !e.isDead);
        for (let i = 0; i < count; i++) {
            const target = targets.length ? targets[Math.floor(Math.random() * targets.length)] : null;
            const angle = Math.random() * Math.PI * 2;
            const distance = target ? 45 + Math.random() * 50 : 80 + Math.random() * 220;
            const x = target ? target.x + Math.cos(angle) * distance : player.x + Math.cos(angle) * distance;
            const y = target ? target.y + Math.sin(angle) * distance : player.y + Math.sin(angle) * distance;
            projectiles.push(new Projectile(x, y, 0, 0, finalDmg * 2.1, '#ff7043', {
                skillId, r: 8, shape: 'hex', life: 80, isPuddle: true,
                explosionDelay: 34, explosionRadius: 88 + a.stars * 12 + (a.evo ? 60 : 0)
            }));
        }
        return;
    }
    if (skillId === 'shockwave') {
        const maxRadius = 360 + a.stars * 35 + (a.evo ? 220 : 0);
        projectiles.push(new Projectile(player.x, player.y, 8 + a.stars * 1.2, 0, finalDmg * 1.35, '#90caf9', {
            skillId, life: 180, shape: 'orb', shockwaveMaxRadius: maxRadius,
            shockwaveThickness: 20 + a.stars * 3
        }));
        return;
    }
    if (skillId === 'burnBottle') {
        const count = skillProjCount(1, a.stars, a.evo, 1);
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = 80 + Math.random() * 150;
            const tx = player.x + Math.cos(ang) * dist;
            const ty = player.y + Math.sin(ang) * dist;
            projectiles.push(new Projectile(tx, ty, 0, 0, finalDmg * 0.4, '#ff5722', {
                r: a.evo ? 60 : 40, shape: 'orb', skillId, life: 240, isPuddle: true, burn: true, burnDmg: finalDmg * 0.6
            }));
        }
        return;
    }
    if (skillId === 'forcefield') {
        const r = 70 + a.stars * 20 + (a.evo ? 40 : 0);
        projectiles.push(new Projectile(player.x, player.y, 0, 0, finalDmg * 0.6, '#4dd0e1', {
            r: r, shape: 'orb', skillId, life: 30, followPlayer: true, knockback: 25 + a.stars * 5
        }));
        return;
    }
    if (skillId === 'guardian') {
        const count = skillProjCount(2, a.stars, a.evo, 1);
        for (let i = 0; i < count; i++) {
            const ang = (Date.now() / 150) + Math.PI * 2 * i / count;
            projectiles.push(new Projectile(player.x + Math.cos(ang) * 60, player.y + Math.sin(ang) * 60, 0, 0, finalDmg * 0.8, '#81c784', {
                r: a.evo ? 16 : 12, shape: 'hex', skillId, life: 2, followPlayer: true, knockback: 12 + a.stars * 3
            }));
        }
        return;
    }
    if (skillId === 'football') {
        const ang = (Date.now() / 200 + projectiles.length) % (Math.PI * 2);
        projectiles.push(new Projectile(player.x, player.y, Math.cos(ang)*(spd*0.85), Math.sin(ang)*(spd*0.85), finalDmg * 1.15, '#0f8', { bounce: 6, r: a.evo ? 14 : 9, shape: 'hex', skillId }));
        return;
    }
    if (skillId === 'shardStorm') {
        const shards = skillProjCount(3, a.stars, a.evo, 4);
        for (let i = 0; i < shards; i++) {
            const ang = Math.PI * 2 * i / shards + (a.evo ? 0.09 : 0);
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.1, Math.sin(ang) * spd * 1.1, finalDmg * 0.95, '#8d6e63', { r: 7, shape:'hex', skillId, life: 320 }));
        }
        return;
    }
    if (skillId === 'archon') {
        const count = skillProjCount(3, a.stars, a.evo, 3);
        for (let i = 0; i < count; i++) {
            const ang = Math.PI * 2 * i / count + (a.evo ? 0.08 : 0);
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.4, Math.sin(ang) * spd * 1.4, finalDmg * 1.35, '#d1c4e9', { r: 10, shape: 'lightning', skillId, life: 340 }));
        }
        return;
    }
    if (skillId === 'vortex') {
        const parts = skillProjCount(3, a.stars, a.evo, 3);
        for (let i = 0; i < parts; i++) {
            const ang = Math.PI * 2 * i / parts;
            const px = player.x + Math.cos(ang) * (50 + a.stars * 3);
            const py = player.y + Math.sin(ang) * (50 + a.stars * 3);
            projectiles.push(new Projectile(px, py, -Math.sin(ang) * spd * 0.4, Math.cos(ang) * spd * 0.4, finalDmg * 0.9, '#536dfe', { r: 8, shape:'orb', skillId, life: 280 }));
        }
        return;
    }
    if (skillId === 'laserGrid') {
        const target = enemies.sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
        const baseAng = target ? Math.atan2(target.y-player.y,target.x-player.x) : Math.random() * Math.PI*2;
        const beams = skillProjCount(3, a.stars, a.evo, 2);
        for (let i = 0; i < beams; i++) {
            const ang = baseAng + (i - (beams - 1) / 2) * 0.25;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.6, Math.sin(ang) * spd * 1.6, finalDmg * 1.4, '#7c4dff', { r: 6, shape:'lightning', skillId, life: 380 }));
        }
        return;
    }
    if (skillId === 'ripple') {
        const total = skillProjCount(3, a.stars, a.evo, 2);
        const radius = 70 + (a.stars - 1) * 12;
        for (let i = 0; i < total; i++) {
            const ang = Math.PI * 2 * i / total;
            const px = player.x + Math.cos(ang) * radius;
            const py = player.y + Math.sin(ang) * radius;
            projectiles.push(new Projectile(px, py, Math.cos(ang) * spd * 0.9, Math.sin(ang) * spd * 0.9, finalDmg * 0.7, '#64b5f6', { r: 6, shape:'diamond', skillId, life: 260 }));
        }
        return;
    }
    if (skillId === 'spikeMine') {
        const mineCount = skillProjCount(3, a.stars, a.evo, 2);
        for (let i = 0; i < mineCount; i++) {
            const ang = Math.PI * 2 * i / mineCount;
            const px = player.x + Math.cos(ang) * 90;
            const py = player.y + Math.sin(ang) * 90;
            projectiles.push(new Projectile(px, py, 0, 0, finalDmg * 0.95, '#8bc34a', { r: a.evo ? 12 : 8, shape:'hex', skillId, life: 320 }));
        }
        return;
    }
    if (skillId === 'thunderNova') {
        const bolts = skillProjCount(3, a.stars, a.evo, 4);
        for (let i = 0; i < bolts; i++) {
            const ang = Math.PI * 2 * i / bolts;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.2, Math.sin(ang) * spd * 1.2, finalDmg * 0.95, '#ffe082', { r: 7, shape:'lightning', skillId, life: 280 }));
        }
        return;
    }
    if (skillId === 'shieldWall') {
        const wall = skillProjCount(3, a.stars, a.evo, 2);
        for (let i = 0; i < wall; i++) {
            const ang = Math.PI * 2 * i / wall;
            projectiles.push(new Projectile(player.x + Math.cos(ang) * 65, player.y + Math.sin(ang) * 65, Math.cos(ang) * spd * 0.8, Math.sin(ang) * spd * 0.8, finalDmg * 1.05, '#81c784', { r: a.evo ? 12 : 10, shape:'diamond', skillId, life: 380 }));
        }
        return;
    }
    if (skillId === 'novaBlast') {
        projectiles.push(new Projectile(player.x, player.y, Math.cos(Math.random()*Math.PI*2) * spd * 1.3, Math.sin(Math.random()*Math.PI*2) * spd * 1.3, finalDmg * 1.5, '#ffcc80', { r: a.evo ? 14 : 10, shape:'orb', skillId, life: 420 }));
        return;
    }
    if (skillId === 'lightning' || skillId === 'revolver' || skillId === 'destruction') {
        const sorted = [...enemies].filter(e => !e.isDead).sort((a, b) =>
            Math.hypot(a.x - player.x, a.y - player.y) - Math.hypot(b.x - player.x, b.y - player.y));
        const target = sorted[0];
        const ang = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.random() * Math.PI * 2;
        const shape = skillId === 'lightning' ? 'lightning' : 'diamond';
        projectiles.push(new Projectile(player.x, player.y, Math.cos(ang)*spd*1.15, Math.sin(ang)*spd*1.15, finalDmg, skillId === 'lightning' ? '#ff0' : '#f80', { shape, r: 6, skillId }));
        return;
    }
    if (skillId === 'droneA' || skillId === 'droneB') {
        const orbit = (Date.now() / 180 + BattleSkills.active.filter(x=>x.id===skillId).length) % (Math.PI*2);
        const radius = 75 + (a.evo ? 45 : 0);
        const ox = player.x + Math.cos(orbit) * radius, oy = player.y + Math.sin(orbit) * radius;
        const sorted = [...enemies].filter(e => !e.isDead).sort((a, b) =>
            Math.hypot(a.x - ox, a.y - oy) - Math.hypot(b.x - ox, b.y - oy));
        const target = sorted[0];
        const ang = target ? Math.atan2(target.y - oy, target.x - ox) : Math.random() * Math.PI * 2;
        projectiles.push(new Projectile(ox, oy, Math.cos(ang)*spd, Math.sin(ang)*spd, finalDmg, '#0af', { homing: a.evo, shape: 'diamond', lockTarget: target || undefined, skillId }));
        return;
    }
    if (skillId === 'flamethrower') {
        const cone = a.evo ? 140 : 90;
        const baseAng = Math.atan2(player.y, player.x);
        const count = skillProjCount(3, a.stars, a.evo, 4);
        for (let i = 0; i < count; i++) {
            const ang = baseAng - cone*Math.PI/180/2 + (cone*Math.PI/180) * (i/(count-1));
            const sp2 = spd * 0.8 + i*0.4;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang)*sp2, Math.sin(ang)*sp2, finalDmg*0.6, '#ff7043', {
                r: 7, shape:'diamond', skillId, life:260
            }));
        }
        return;
    }
    if (skillId === 'iceRing') {
        const ringCount = skillProjCount(3, a.stars, a.evo, 5);
        const radius = 90 + a.stars*4;
        for (let i = 0; i < ringCount; i++) {
            const ang = (Math.PI*2/ringCount)*i;
            const vx = Math.cos(ang)*(spd*0.4);
            const vy = Math.sin(ang)*(spd*0.4);
            const px = player.x + Math.cos(ang)*radius;
            const py = player.y + Math.sin(ang)*radius;
            projectiles.push(new Projectile(px, py, vx, vy, finalDmg*0.8, '#80deea', {
                r: 6, shape:'hex', skillId, life:420
            }));
        }
        return;
    }
    if (skillId === 'meteor') {
        const dropCount = skillProjCount(2, a.stars, a.evo, 1);
        for (let i = 0; i < dropCount; i++) {
            const target = enemies[Math.floor(Math.random()*enemies.length)] || null;
            const baseX = target ? target.x : player.x + (Math.random()-0.5)*320;
            const baseY = target ? target.y : player.y + (Math.random()-0.5)*320;
            const startX = baseX + (Math.random()-0.5)*80;
            const startY = baseY - 380 - Math.random()*120;
            const ang = Math.atan2(baseY - startY, baseX - startX);
            const sp2 = spd * 0.95;
            projectiles.push(new Projectile(startX, startY, Math.cos(ang)*sp2, Math.sin(ang)*sp2, finalDmg*1.25, '#ffca28', {
                r: 8, shape:'diamond', skillId, life:470
            }));
        }
        return;
    }
    if (skillId === 'ionBeam') {
        const target = enemies.filter(e => !e.isDead)[0] || null;
        const ang = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.random() * Math.PI * 2;
        const sp2 = spd * 1.8;
        projectiles.push(new Projectile(player.x, player.y, Math.cos(ang)*sp2, Math.sin(ang)*sp2, finalDmg * 1.5, '#64ffda', { r: a.evo ? 12 : 8, shape:'lightning', skillId, life:520 }));
        return;
    }
    if (skillId === 'plasmaOrb') {
        const count = skillProjCount(3, a.stars, a.evo, 1);
        for (let i = 0; i < count; i++) {
            const ang = Math.PI * 2 * i / count + (Date.now() / 240);
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 0.9, Math.sin(ang) * spd * 0.9, finalDmg * 0.85, '#80deea', { homing:true, r: a.evo ? 10 : 8, shape:'orb', skillId, life:420 }));
        }
        return;
    }
    if (skillId === 'chainSpark') {
        const bolts = skillProjCount(3, a.stars, a.evo, 3);
        const targets = enemies.filter(e => !e.isDead).sort((left, right) =>
            Math.hypot(left.x - player.x, left.y - player.y) - Math.hypot(right.x - player.x, right.y - player.y));
        for (let i = 0; i < bolts; i++) {
            const target = targets[i % Math.max(1, targets.length)] || null;
            const angle = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.random() * Math.PI * 2;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(angle) * spd * 1.2, Math.sin(angle) * spd * 1.2, finalDmg * 0.85, '#b2ff59', {
                r: 7, shape: 'lightning', skillId, life: 340, homing: !!target,
                lockTarget: target || undefined, chainLeft: a.stars + (a.evo ? 4 : 0),
                chainRadius: 180 + a.stars * 25 + (a.evo ? 100 : 0)
            }));
        }
        return;
    }
    if (skillId === 'voidBomb') {
        const ang = Math.random() * Math.PI * 2;
        projectiles.push(new Projectile(player.x + Math.cos(ang) * 60, player.y + Math.sin(ang) * 60, 0, 0, finalDmg * 1.8, '#7c4dff', { r: a.evo ? 16 : 12, shape:'hex', skillId, life:420 }));
        return;
    }
    if (skillId === 'cdSurge') {
        const bursts = skillProjCount(3, a.stars, a.evo, 2);
        for (let i = 0; i < bursts; i++) {
            const ang = Math.random() * Math.PI * 2;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.5, Math.sin(ang) * spd * 1.5, finalDmg * 0.65, '#00bcd4', {
                r: a.evo ? 10 : 7, shape:'diamond', skillId, life: 220
            }));
        }
        return;
    }
    if (skillId === 'gojoDomain') return;
    if (skillId === 'meowClaw') {
        const claws = skillProjCount(3, a.stars, a.evo, 3);
        for (let i = 0; i < claws; i++) {
            const ang = Math.PI * 2 * i / claws + (a.evo ? Date.now() / 400 : 0);
            projectiles.push(new Projectile(player.x + Math.cos(ang) * 40, player.y + Math.sin(ang) * 40, Math.cos(ang) * spd * 1.25, Math.sin(ang) * spd * 1.25, finalDmg * 0.95, '#f06292', {
                r: a.evo ? 10 : 7, shape:'blade', skillId, life: 260
            }));
        }
        return;
    }
    if (skillId === 'purrWave') {
        const total = skillProjCount(3, a.stars, a.evo, 2);
        const radius = 50 + (a.stars - 1) * 14;
        for (let i = 0; i < total; i++) {
            const ang = Math.PI * 2 * i / total;
            const px = player.x + Math.cos(ang) * radius;
            const py = player.y + Math.sin(ang) * radius;
            projectiles.push(new Projectile(px, py, Math.cos(ang) * spd * 0.6, Math.sin(ang) * spd * 0.6, finalDmg * 0.7, '#ff8a80', {
                r: a.evo ? 10 : 8, shape:'orb', skillId, life: 320
            }));
        }
        return;
    }
    if (skillId === 'bladeDance') {
        const blades = skillProjCount(3, a.stars, a.evo, 4);
        for (let i = 0; i < blades; i++) {
            const ang = Math.PI * 2 * i / blades + (Date.now() / 360);
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.1, Math.sin(ang) * spd * 1.1, finalDmg * 0.8, '#ce93d8', { r: 7, shape:'blade', skillId, life:340 }));
        }
        return;
    }
    if (skillId === 'arcWave') {
        const count = skillProjCount(3, a.stars, a.evo, 3);
        const start = Math.random() * Math.PI * 2;
        for (let i = 0; i < count; i++) {
            const ang = start + ((Math.PI * 0.8) * (i / Math.max(count - 1, 1))) - (Math.PI * 0.4);
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.1, Math.sin(ang) * spd * 1.1, finalDmg * 0.95, '#64b5f6', { r: 6, shape:'diamond', skillId, life:360 }));
        }
        return;
    }
    if (skillId === 'gravityPulse') {
        const orbs = skillProjCount(3, a.stars, a.evo, 3);
        for (let i = 0; i < orbs; i++) {
            const ang = Math.PI * 2 * i / orbs;
            projectiles.push(new Projectile(player.x + Math.cos(ang) * 80, player.y + Math.sin(ang) * 80, 0, 0, finalDmg * 1.05, '#536dfe', { r: a.evo ? 12 : 10, shape:'orb', skillId, life:400 }));
        }
        return;
    }
    if (skillId === 'solarFlare') {
        const bolts = skillProjCount(3, a.stars, a.evo, 5);
        for (let i = 0; i < bolts; i++) {
            const ang = Math.PI * 2 * i / bolts;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.4, Math.sin(ang) * spd * 1.4, finalDmg * 1.1, '#ffd54f', { r: a.evo ? 10 : 8, shape:'orb', skillId, life:380 }));
        }
        return;
    }
    if (skillId === 'thunderField') {
        const nodes = skillProjCount(3, a.stars, a.evo, 3);
        const radius = 120 + a.stars * 8;
        for (let i = 0; i < nodes; i++) {
            const ang = (Math.PI*2/nodes)*i;
            const px = player.x + Math.cos(ang)*radius;
            const py = player.y + Math.sin(ang)*radius;
            projectiles.push(new Projectile(px, py, 0, 0, finalDmg*1.05, '#ffee58', {
                r: 8, shape:'lightning', skillId, life:260
            }));
        }
        return;
    }
    if (skillId === 'whirlwind') {
        const blades = skillProjCount(3, a.stars, a.evo, 4);
        const radius = 70 + a.stars * 5;
        for (let i = 0; i < blades; i++) {
            const ang = (Date.now()/200) + Math.PI*2*i/blades;
            const px = player.x + Math.cos(ang)*radius;
            const py = player.y + Math.sin(ang)*radius;
            const vx = -Math.sin(ang) * (spd*0.5);
            const vy = Math.cos(ang) * (spd*0.5);
            projectiles.push(new Projectile(px, py, vx, vy, finalDmg*0.7, '#b3e5fc', {
                r: 8, shape:'blade', skillId, life:380
            }));
        }
        return;
    }
    if (skillId === 'singularity') {
        const center = { x: player.x, y: player.y };
        const coreLife = a.evo ? 420 : 320;
        projectiles.push(new Projectile(center.x, center.y, 0, 0, finalDmg*1.4, '#ce93d8', {
            r: 18, shape:'hex', skillId, life:coreLife
        }));
        const shards = skillProjCount(3, a.stars, a.evo, 4);
        for (let i = 0; i < shards; i++) {
            const ang = Math.PI*2*i/shards;
            const px = center.x + Math.cos(ang)*180;
            const py = center.y + Math.sin(ang)*180;
            const vx = -Math.cos(ang) * (spd*0.9);
            const vy = -Math.sin(ang) * (spd*0.9);
            projectiles.push(new Projectile(px, py, vx, vy, finalDmg*0.9, '#ab47bc', {
                r: 6, shape:'diamond', skillId, life:coreLife
            }));
        }
        return;
    }
    if (skillId === 'flare') {
        const count = skillProjCount(3, a.stars, a.evo, 5);
        for (let i = 0; i < count; i++) {
            const ang = Math.PI * 2 * i / count;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.1, Math.sin(ang) * spd * 1.1, finalDmg * 0.95, '#ff7043', { r: 7, shape: 'diamond', skillId, life: 260 }));
        }
        return;
    }
    if (skillId === 'pulse') {
        const total = skillProjCount(3, a.stars, a.evo, 2);
        const radius = 40 + (a.stars - 1) * 10;
        for (let i = 0; i < total; i++) {
            const ang = Math.PI * 2 * i / total;
            const px = player.x + Math.cos(ang) * radius;
            const py = player.y + Math.sin(ang) * radius;
            projectiles.push(new Projectile(px, py, Math.cos(ang) * spd * 0.6, Math.sin(ang) * spd * 0.6, finalDmg * 0.95, '#7c4dff', { r: 6, shape: 'hex', skillId, life: 260 }));
        }
        return;
    }
    if (skillId === 'gravity') {
        const orbCount = skillProjCount(3, a.stars, a.evo, 3);
        for (let i = 0; i < orbCount; i++) {
            const ang = Math.PI * 2 * i / orbCount;
            const px = player.x + Math.cos(ang) * 90;
            const py = player.y + Math.sin(ang) * 90;
            projectiles.push(new Projectile(px, py, 0, 0, finalDmg * 1.15, '#536dfe', { r: a.evo ? 14 : 10, shape: 'orb', skillId, life: 340 }));
        }
        return;
    }
    if (skillId === 'brick') {
        const ang = Math.random() * Math.PI * 2;
        projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 0.7, Math.sin(ang) * spd * 0.7, finalDmg * 1.4, '#8d6e63', {
            r: a.evo ? 14 : 11, shape: 'hex', skillId, life: 380
        }));
        return;
    }
    if (skillId === 'baseball') {
        const ang = Math.random() * Math.PI * 2;
        projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.5, Math.sin(ang) * spd * 1.5, finalDmg * 1.2, '#ff8f00', {
            r: a.evo ? 12 : 9, shape: 'diamond', skillId, life: 300
        }));
        return;
    }
    if (skillId === 'lightchaser') {
        const closest = enemies.filter(e => !e.isDead).sort((a,b)=>Math.hypot(a.x-player.x,a.y-player.y)-Math.hypot(b.x-player.x,b.y-player.y))[0];
        const target = closest || null;
        const count = skillProjCount(2, a.stars, a.evo, 1);
        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 0.18;
            const ang = target ? Math.atan2(target.y - player.y, target.x - player.x) + spread : Math.random() * Math.PI * 2;
            projectiles.push(new Projectile(player.x, player.y, Math.cos(ang) * spd * 1.2, Math.sin(ang) * spd * 1.2, finalDmg, '#ffeb3b', {
                r: a.evo ? 10 : 7, shape: 'lightning', life: 320, homing:true, lockTarget: target || undefined, skillId
            }));
        }
        return;
    }
    const ang = Math.random() * Math.PI * 2;
    projectiles.push(new Projectile(player.x, player.y, Math.cos(ang)*spd, Math.sin(ang)*spd, finalDmg, '#00d2ff', { shape: 'diamond', skillId }));
}

// ─── 寵物實體 ─────────────────────────────────────────────────────────────────
function drawPetCreature(ctx, x, y, pet, facing = 1, attacking = false) {
    const cfg = PET_DEFS[pet.id] || PET_DEFS.sprout;
    const bob = Math.sin(Date.now() / 120 + (pet.uid || '').length) * 2;
    ctx.save(); ctx.translate(x, y + bob); ctx.scale(facing < 0 ? -1 : 1, 1);
    ctx.shadowColor = cfg.color; ctx.shadowBlur = attacking ? 16 : 8;
    const body = cfg.color;
    ctx.fillStyle = body; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 2;
    if (pet.id === 'pebble' || pet.id === 'bulwark') {
        ctx.beginPath(); ctx.ellipse(0, 2, 15, 12, 0, 0, Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-12,-4); ctx.lineTo(-8,-17); ctx.lineTo(0,-8); ctx.lineTo(8,-17); ctx.lineTo(13,-3); ctx.closePath(); ctx.fill(); ctx.stroke();
        for (let i=-1;i<=1;i++) { ctx.beginPath(); ctx.moveTo(i*7,-3); ctx.lineTo(i*7+4,5); ctx.stroke(); }
    } else if (pet.id === 'spark') {
        ctx.beginPath(); ctx.ellipse(0,2,12,10,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8,-4); ctx.lineTo(-15,-15); ctx.lineTo(-2,-10); ctx.lineTo(5,-19); ctx.lineTo(7,-5); ctx.fill(); ctx.stroke();
        ctx.strokeStyle='#fff176'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(10,3); ctx.lineTo(19,-2); ctx.lineTo(13,8); ctx.stroke();
    } else if (pet.id === 'comet') {
        ctx.beginPath(); ctx.ellipse(-1,2,12,9,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-8,-2); ctx.lineTo(-23,-10); ctx.lineTo(-14,1); ctx.lineTo(-24,7); ctx.lineTo(-7,7); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(7,-5); ctx.lineTo(12,-17); ctx.lineTo(16,-5); ctx.fill(); ctx.stroke();
    } else if (pet.id === 'blade') {
        ctx.beginPath(); ctx.ellipse(0,1,13,8,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-3,-3); ctx.lineTo(-16,-15); ctx.lineTo(-10,0); ctx.lineTo(-16,12); ctx.lineTo(-2,5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5,-4); ctx.lineTo(18,-16); ctx.lineTo(13,0); ctx.lineTo(18,10); ctx.lineTo(4,5); ctx.closePath(); ctx.fill(); ctx.stroke();
    } else if (pet.id === 'oracle') {
        ctx.beginPath(); ctx.ellipse(0,2,14,12,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-11,-5); ctx.lineTo(-8,-19); ctx.lineTo(0,-9); ctx.lineTo(8,-19); ctx.lineTo(12,-5); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle='#fff176'; ctx.lineWidth=3; ctx.beginPath(); ctx.arc(0,0,21,0,Math.PI*2); ctx.stroke();
    } else {
        ctx.beginPath(); ctx.ellipse(-1,3,14,9,0,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(9,-5,9,0,Math.PI*2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(3,-10); ctx.lineTo(3,-20); ctx.lineTo(10,-13); ctx.moveTo(12,-13); ctx.lineTo(19,-20); ctx.lineTo(18,-8); ctx.fill(); ctx.stroke();
        ctx.strokeStyle=body; ctx.lineWidth=5; ctx.beginPath(); ctx.moveTo(-12,2); ctx.quadraticCurveTo(-23,-5,-19,-12); ctx.stroke();
        ctx.fillStyle='#fff'; ctx.beginPath(); ctx.arc(12,-7,2.2,0,Math.PI*2); ctx.fill();
    }
    ctx.shadowBlur=0; ctx.fillStyle='#101820'; ctx.beginPath(); ctx.arc(12,-6,2,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle='#101820'; ctx.lineWidth=2; ctx.beginPath(); ctx.moveTo(-7,8); ctx.lineTo(-7,13); ctx.moveTo(5,8); ctx.lineTo(5,13); ctx.stroke();
    if (attacking) { ctx.strokeStyle='#fff'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(16,-1); ctx.lineTo(25,-7); ctx.moveTo(18,3); ctx.lineTo(28,3); ctx.stroke(); }
    ctx.restore();
}
function updatePetDamage(player, enemies, dt) {
    const pet = getEquippedPet();
    if (!pet || !PET_DEFS[pet.id]) { GameEngine.petActor = null; return; }
    let actor = GameEngine.petActor;
    if (!actor || actor.uid !== pet.uid) actor = GameEngine.petActor = { uid:pet.uid, x:player.x+34, y:player.y+25, attackTimer:0, target:null, attacking:false, facing:1 };
    let target = null, bestD = Infinity;
    for (const e of enemies) {
        if (!e || e.isDead || e.hp <= 0) continue;
        const d = Math.hypot(e.x-player.x, e.y-player.y);
        if (d < bestD && d < 650) { bestD=d; target=e; }
    }
    actor.target = target;
    const targetX = target ? target.x : player.x + Math.cos(Date.now()/500)*34;
    const targetY = target ? target.y : player.y + 26 + Math.sin(Date.now()/400)*22;
    const dist = Math.hypot(targetX-actor.x, targetY-actor.y);
    const speed = target ? 7.5 : 5.5;
    if (dist > 1) { actor.x += (targetX-actor.x)/dist*Math.min(dist,speed*dt); actor.y += (targetY-actor.y)/dist*Math.min(dist,speed*dt); }
    actor.facing = targetX >= actor.x ? 1 : -1;
    actor.attacking = !!target && Math.hypot(target.x-actor.x,target.y-actor.y) < 58;
    actor.attackTimer += dt;
    const cfg = PET_DEFS[pet.id];
    if (target && actor.attacking && actor.attackTimer >= 42) {
        actor.attackTimer = 0;
        const weight = Math.max(0.5, Number(pet.weight) || 0.5);
        const rarityMult = BALANCE.petAttackRarityMult[cfg.rarity] || 1;
        const dmg = (BALANCE.petAttackBase + (cfg.assist || 0) * BALANCE.petAttackAssistMul + weight * BALANCE.petAttackWeightMul) * rarityMult;
        if (target.isRemotePlayer) OnlineSession.queueDamage(dmg);
        else { target.hp = Math.max(0, target.hp - dmg); if (target.netId) OnlineSession.queueWorldDamage(target.netId, dmg); }
        GameEngine.hitFx.push({x:target.x,y:target.y,r:13,life:15,maxLife:15,color:cfg.color});
        GameEngine.spawnParticles(target.x,target.y,cfg.color,5,2);
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 遊戲引擎
// ═══════════════════════════════════════════════════════════════════════════════
window.GameEngine = {
    state: 'LOBBY', canvas: null, ctx: null, bgCtx: null,
    player: null, enemies: [], projectiles: [], expOrbs: [], bosses: [],
    remotePlayer: null, remoteProjectiles: [], remoteActiveSkills: [], onlineMode: '',
    hitFx: [],
    particles: [],
    kills: 0, timer: 0, spawnTimer: 0, shootTimers: {}, lastTime: 0,
    pendingLevelUp: false, levelUpQueue: 0, pendingEvo: null, paused: false,
    currentStage: 1,
    swarmCount: 0,
    shakeTime: 0, shakeDuration: 0, shakeMagnitude: 0,
    testMode: false,
    testSettings: { enemyTarget:'monster', selectedStage:1, customGold:0, selectedSkin:'default', selectedActives:[] },
    skillBuff: 1.08,
    _forceBossOnly: false,
    _forceMonsterOnly: false,
    _testModePaused: false,
    runActivePool: [],

    async init() {
        await SaveSystem.init();
        SaveSystem.claimDailyPlantCoins();
        Input.init();
        this.canvas = document.getElementById('main-canvas');
        this.ctx = this.canvas.getContext('2d');
        const bg = document.getElementById('bg-canvas');
        this.bgCtx = bg.getContext('2d');
        this.resize();
        window.onresize = () => this.resize();
        this.player = new Player();
        this.renderLobby();
        this.showSection('stages');
        this.populateTestPanel();
        this._farmUiTimer = setInterval(() => {
            if (this.state === 'LOBBY') this.renderFarm();
        }, 1000);
        Background.init(this.bgCtx, this.currentStage);
        SaveSystem.pushCloud(true);
    },
    resize() {
        this.canvas.width = this.bgCtx.canvas.width = window.innerWidth;
        this.canvas.height = this.bgCtx.canvas.height = window.innerHeight;
        if (this.state === 'BATTLE' && this.player) Background.init(this.bgCtx, this.currentStage);
    },
    startBattle(stageIndex, opts) {
        stageIndex = Math.min(Math.max(1, stageIndex || 1), MAX_STAGES);
        const fromTest = opts && opts.fromTest === true;
        this.onlineMode = opts && opts.online ? opts.onlineMode : '';
        this._onlineGuest = this.onlineMode === 'coop' && OnlineSession.id > OnlineSession.partnerId;
        this.remotePlayer = null;
        this.remoteProjectiles = []; this.remoteActiveSkills = [];
        this.currentStage = stageIndex;
        const stage = STAGES[stageIndex - 1] || STAGES[0];
        document.getElementById('lobby-container').style.display = 'none';
        document.getElementById('battle-hud').style.display = 'block';
        document.getElementById('stage-title').textContent = stage.name;
        BattleSkills.reset();
        this.player = new Player();
        if (this.onlineMode) {
            this.player.maxHp = 5000; this.player.hp = 5000; this.player.speed = 4;
            this.player.equipAtk = 0; this.player.regenPerSec = 0;
            this.player.petDmg = 0; this.player.petDamageMult = 1; this.player.petDefense = 0;
            this.player.skin = 'default';
        }
        this.player.x = 0; this.player.y = 0;
        if (this.onlineMode === 'versus') {
            this.player.x = OnlineSession.id < OnlineSession.partnerId ? -2600 : 2600;
            this.player.y = 0;
        }
        this.enemies = []; this.projectiles = []; this.expOrbs = []; this.bosses = [];
        this.kills = 0; this.timer = 0; this.spawnTimer = 0; this.shootTimers = {};
        this.state = 'BATTLE'; this.pendingLevelUp = false; this.levelUpQueue = 0; this.pendingEvo = null; this.paused = false;
        this._lastBossSpawn = 0; this._bossSpawnedThisStage = false; this._bossWarningSecond = null; this._petTimer = 0; this._stageConfig = stage; this.swarmCount = 0; this._wave2 = false; this._wave4 = false;
        this._forceBossOnly = fromTest && this.testSettings.enemyTarget === 'boss';
        this._forceMonsterOnly = (fromTest && this.testSettings.enemyTarget === 'monster') || this.onlineMode === 'versus';
        this.lastTime = performance.now();
        this.buildRunSkillPools(fromTest);
        BattleSkills.addActive('kunai');
        if (fromTest) {
            this.testSettings.selectedActives.forEach(id => {
                if (id && id !== 'kunai' && this.runActivePool.includes(id)) BattleSkills.addActive(id);
            });
        }
        if (this._forceBossOnly) {
            const ang = Math.random() * Math.PI * 2;
            const bx = this.player.x + Math.cos(ang) * 480;
            const by = this.player.y + Math.sin(ang) * 480;
            const tf = Math.min(1.8, this.timer / 50);
            this.bosses.push(new Boss(bx, by, stage.bossHp || 900, this.currentStage, tf));
            this._bossSpawnedThisStage = true;
            this.showAlert('測試模式：BOSS 直接出現！');
        }
        requestAnimationFrame(t => this.loop(t));
    },
    loop(now) {
        if (this.state !== 'BATTLE') return;
        const dt = Math.min((now - this.lastTime) / 1000 * 60, 5);
        this.lastTime = now;
        if (!this.paused) this.update(dt);
        this.render();
        requestAnimationFrame(t => this.loop(t));
    },
    togglePause() {
        this.paused = !this.paused;
        document.getElementById('pause-panel').classList.toggle('show', this.paused);
    },
    shake(intensity = 6, duration = 0.25) {
        this.shakeMagnitude = Math.max(this.shakeMagnitude || 0, intensity);
        this.shakeDuration = Math.max(this.shakeDuration || 0, duration);
        this.shakeTime = Math.max(this.shakeTime || 0, duration);
    },
    canEarnGoldThisRun() {
        if (this.onlineMode) return true;
        const frontier = SaveSystem.currentData.unlockedStage || 1;
        const minStage = Math.max(1, frontier - 1);
        return this.currentStage >= minStage && this.currentStage <= frontier;
    },
    calcRunGold(kills, timerSec, stageBonus) {
        if (!this.canEarnGoldThisRun()) return 0;
        const reward = Math.max(0, Math.round(kills * BALANCE.goldKillRate + Math.floor(timerSec) * BALANCE.goldTimeRate + (stageBonus || 0)));
        return reward * (this.onlineMode ? BALANCE.goldOnlineMul : 1);
    },
    buildRunSkillPools(fromTest) {
        const skinLimited = SKIN_LIMITED_SKILLS;
        const skin = SaveSystem.currentData.skin || 'default';
        const filterSkin = (id) => {
            const req = skinLimited[id];
            return !req || skin === req;
        };
        const allActive = Object.keys(ACTIVE_SKILLS).filter(filterSkin);
        if (fromTest && this.testSettings.selectedActives.length) {
            const act = new Set(['kunai']);
            this.testSettings.selectedActives.forEach(id => { if (id && filterSkin(id)) act.add(id); });
            this.runActivePool = [...act];
        } else {
            const others = allActive.filter(id => id !== 'kunai');
            const picked = pickFromPool(others, RUN_ACTIVE_POOL_SIZE - 1);
            this.runActivePool = ['kunai', ...picked];
            if (skin === 'gojo' && allActive.includes('gojoDomain') && !this.runActivePool.includes('gojoDomain')) {
                this.runActivePool[this.runActivePool.length - 1] = 'gojoDomain';
            }
            if (skin === 'CD' && allActive.includes('cdSurge') && !this.runActivePool.includes('cdSurge')) {
                this.runActivePool[this.runActivePool.length - 1] = 'cdSurge';
            }
            if (skin === 'meowl') {
                ['meowClaw', 'purrWave'].forEach(sid => {
                    if (allActive.includes(sid) && !this.runActivePool.includes(sid) && this.runActivePool.length > 1) {
                        this.runActivePool[this.runActivePool.length - 1] = sid;
                    }
                });
            }
        }
        const names = this.runActivePool.map(id => ACTIVE_SKILLS[id]?.name || id).join('、');
        this._runPoolSummary = '主動：' + names;
        this.showAlert('本局固定技能池（僅能升級這些）');
    },
    onSkillLeveled(skillId, newStars) {
        const name = ACTIVE_SKILLS[skillId]?.name || skillId;
        const shots = skillProjCount(3, newStars, false, 0);
        this.showAlert(name + ' Lv.' + newStars + '！傷害提升、彈數' + shots + '、冷卻縮短');
        if (this.player) {
            this.spawnParticles(this.player.x, this.player.y, '#00ffcc', 16, 3);
            this.shake(4, 0.15);
        }
    },
    trySpawnBoss() {
        if (this.onlineMode === 'versus' || this._onlineGuest || this._bossSpawnedThisStage || this._forceMonsterOnly || this.bosses.length > 0 || !this.player) return;
        const stage = this._stageConfig || STAGES[0];
        const at = stage.bossAt || 90;
        const secondsLeft = Math.ceil(at - this.timer);
        if (secondsLeft <= 5 && secondsLeft > 0 && secondsLeft !== this._bossWarningSecond) {
            this._bossWarningSecond = secondsLeft;
            this.showAlert('BOSS 將於 ' + secondsLeft + ' 秒後出現！');
        }
        if (this.timer < at) return;
        this._bossSpawnedThisStage = true;
        this._lastBossSpawn = at;
        const ang = Math.random() * Math.PI * 2;
        const bx = this.player.x + Math.cos(ang) * 480;
        const by = this.player.y + Math.sin(ang) * 480;
        const tf = Math.min(1.8, this.timer / 50);
        this.bosses.push(new Boss(bx, by, stage.bossHp || 900, this.currentStage, tf));
        this.showAlert('BOSS 出現！ - ' + (stage.name || ('Stage ' + this.currentStage)));
    },
    checkBossDefeat() {
        for (let i = this.bosses.length - 1; i >= 0; i--) {
            const b = this.bosses[i];
            if (b.hp > 0) continue;
            b.isDead = true;
            this.hitFx.push({ x:b.x, y:b.y, r:24, life:42, maxLife:42, color:'#ffcc80' });
            this.kills += 15;
            this.expOrbs.push(new ExpOrb(b.x, b.y, 120));
            this.bosses.splice(i, 1);
            const d = SaveSystem.currentData;
            if (this.currentStage >= d.unlockedStage && d.unlockedStage < MAX_STAGES) {
                d.unlockedStage = this.currentStage + 1;
                SaveSystem.save();
            }
            this.stageClear();
            return true;
        }
        return false;
    },
    spawnParticles(x, y, color, count = 12, size = 2) {
        for (let i = 0; i < count; i++) {
            const ang = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 2.5;
            this.particles.push({
                x, y,
                vx: Math.cos(ang) * speed,
                vy: Math.sin(ang) * speed,
                life: 0.6 + Math.random() * 0.4,
                maxLife: 0.6 + Math.random() * 0.4,
                color,
                size: size * (0.7 + Math.random() * 0.6)
            });
        }
    },
    update(dt) {
        if (this.shakeTime > 0) this.shakeTime = Math.max(0, this.shakeTime - dt / 60);
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt / 60;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        if (this.pendingLevelUp || this.pendingEvo) {
            if (this.checkBossDefeat()) return;
            return;
        }
        if (this.onlineMode === 'versus' && OnlineSession.matchStartedAt) {
            this.timer = Math.max(0, (Date.now() - OnlineSession.matchStartedAt) / 1000);
        } else {
            this.timer += dt / 60;
        }
        this.trySpawnBoss();
        if (this.checkBossDefeat()) return;

        const allEnemies = [...this.enemies, ...this.bosses];
        if (this.onlineMode === 'versus' && this.remotePlayer && !this.remotePlayer.isDead && this.remotePlayer.hp > 0) {
            const duelRingRadius = 380;
            const opponentDistance = Math.hypot(this.remotePlayer.x - this.player.x, this.remotePlayer.y - this.player.y);
            if (opponentDistance <= duelRingRadius) allEnemies.unshift(this.remotePlayer);
        }
        this.player.update(dt, this.projectiles, allEnemies);

        for (let i = this.expOrbs.length - 1; i >= 0; i--) {
            const o = this.expOrbs[i];
            o.update(dt, this.player);
            const dist = Math.hypot(this.player.x - o.x, this.player.y - o.y);
            if (dist < this.player.getMagnetRadius()) {
                this.player.addXp(o.value);
                this.expOrbs.splice(i, 1);
            }
        }

        const stage = this._stageConfig || STAGES[0];
        this.spawnTimer += dt;
        const baseCd = (stage.spawnCd || 75);
        const spawnMultiplier = this.onlineMode ? 2 : 1;
        const roomFor = (n) => Math.min(n * spawnMultiplier, Math.max(0, MAX_ENEMIES - this.enemies.length));
        if (!this._onlineGuest && !this._forceBossOnly && this.spawnTimer > baseCd && this.enemies.length < MAX_ENEMIES) {
            this.spawnTimer = 0;
            const tFactor = Math.min(1.8, this.timer / 50);
            const waveRoll = Math.random();
            if (this.swarmCount < 4 && waveRoll < 0.18 + tFactor*0.06) {
                this.swarmCount++;
                GameEngine.showAlert('⚠ 怪潮來襲！');
                const pack = roomFor(10 + Math.floor(tFactor*6));
                for (let i = 0; i < pack; i++) {
                    const ang = Math.random() * Math.PI * 2;
                    const dist = 420 + Math.random() * 260;
                    const r = Math.random();
                    let type = 'MELEE';
                    if (r < 0.2) type = 'FAST';
                    else if (r < 0.35) type = 'FLY';
                    this.enemies.push(new Enemy(
                        this.player.x + Math.cos(ang)*dist,
                        this.player.y + Math.sin(ang)*dist,
                        type,
                        this.currentStage,
                        tFactor
                    ));
                }
            } else if (this.enemies.length < MAX_ENEMIES) {
                const ang = Math.random() * Math.PI * 2;
                const dist = 380 + Math.random() * 220;
                const r = Math.random();
                const tFactor2 = Math.min(1.8, this.timer / 50);
                const minute = Math.floor(this.timer / 60);
                let type = 'MELEE';
                const poolIndex = minute % 4;
                if (poolIndex === 0) {
                    if (r < 0.5) type = 'MELEE';
                    else if (r < 0.65) type = 'TANK';
                    else if (r < 0.8) type = 'FAST';
                    else if (r < 0.9) type = 'FLY';
                    else type = 'SHOOTER';
                } else if (poolIndex === 1) {
                    if (r < 0.5) type = 'SHOOTER';
                    else if (r < 0.65) type = 'FAST';
                    else if (r < 0.8) type = 'FLY';
                    else if (r < 0.9) type = 'MELEE';
                    else type = 'TANK';
                } else if (poolIndex === 2) {
                    if (r < 0.5) type = 'TANK';
                    else if (r < 0.65) type = 'MELEE';
                    else if (r < 0.8) type = 'FLY';
                    else if (r < 0.9) type = 'SHOOTER';
                    else type = 'FAST';
                } else {
                    if (r < 0.5) type = 'FLY';
                    else if (r < 0.65) type = 'FAST';
                    else if (r < 0.8) type = 'SHOOTER';
                    else if (r < 0.9) type = 'MELEE';
                    else type = 'TANK';
                }
                if (Math.random() < 0.07 + this.currentStage * 0.01 + tFactor2 * 0.05) type = 'ELITE';
                for (let i = 0; i < spawnMultiplier && this.enemies.length < MAX_ENEMIES; i++) {
                    const offset = i * 30;
                    this.enemies.push(new Enemy(
                        this.player.x + Math.cos(ang)*dist + offset,
                        this.player.y + Math.sin(ang)*dist + offset,
                        type,
                        this.currentStage,
                        tFactor2
                    ));
                }
            }
        }

        if (!this._onlineGuest && this.timer > 120 && this.timer < 125 && !this._wave2) {
            this._wave2 = true;
            GameEngine.showAlert('🚨 瘋狂波次來襲！');
            const pack = roomFor(20 + Math.floor(this.timer / 10));
            for (let i = 0; i < pack; i++) {
                const ang = Math.random() * Math.PI * 2;
                const dist = 420 + Math.random() * 260;
                const r = Math.random();
                let type = 'MELEE';
                if (r < 0.25) type = 'FAST';
                else if (r < 0.5) type = 'FLY';
                else if (r < 0.75) type = 'TANK';
                this.enemies.push(new Enemy(
                    this.player.x + Math.cos(ang)*dist,
                    this.player.y + Math.sin(ang)*dist,
                    type,
                    this.currentStage,
                    Math.min(1.8, this.timer / 50)
                ));
            }
        }
        if (!this._onlineGuest && this.timer > 240 && this.timer < 245 && !this._wave4) {
            this._wave4 = true;
            GameEngine.showAlert('🚨 最終瘋狂波次！');
            const pack = roomFor(30 + Math.floor(this.timer / 10));
            for (let i = 0; i < pack; i++) {
                const ang = Math.random() * Math.PI * 2;
                const dist = 420 + Math.random() * 260;
                const r = Math.random();
                let type = 'ELITE';
                if (r < 0.3) type = 'TANK';
                else if (r < 0.6) type = 'FLY';
                else if (r < 0.9) type = 'SHOOTER';
                this.enemies.push(new Enemy(
                    this.player.x + Math.cos(ang)*dist,
                    this.player.y + Math.sin(ang)*dist,
                    type,
                    this.currentStage,
                    Math.min(1.8, this.timer / 50)
                ));
            }
        }

        const stats = { atk: 0, cdReduct: 0, range: 0, crit: 0, burst: 0, lifesteal: 0 };
        this.player.lifesteal = stats.lifesteal;
        const visibleOpponent = this.onlineMode === 'versus' ? allEnemies.find(enemy => enemy.isRemotePlayer) : null;
        const weaponTargets = visibleOpponent ? [visibleOpponent] : allEnemies;
        for (const a of BattleSkills.active) {
            if (a.id === 'gojoDomain') continue;
            this.shootTimers[a.id] = (this.shootTimers[a.id] || 0) + dt;
            const cd = Math.max(12, (a.evo ? 30 : 36) - stats.cdReduct - skillLevelCdBonus(a.id, a.stars));
            if (this.shootTimers[a.id] >= cd) {
                fireWeapon(a.id, this.player, this.projectiles, weaponTargets, stats);
                this.shootTimers[a.id] = 0;
            }
        }
        updatePetDamage(this.player, allEnemies, dt);

        for (const e of this.enemies) e.update(dt, this.getEnemyTarget(e));
        for (const b of this.bosses) b.update(dt, this.player, this.projectiles);

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            if (e.hp <= 0) {
                e.isDead = true;
                this.hitFx.push({ x:e.x, y:e.y, r:10, life:30, maxLife:30, color:'#ffab91' });
                this.kills++;
                this.player.addXp(e.expValue);
                this.expOrbs.push(new ExpOrb(e.x, e.y, e.expValue));
                this.enemies.splice(i, 1);
            }
        }
        if (this.checkBossDefeat()) return;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(dt, this.player, allEnemies);
            if (p.isDead) this.projectiles.splice(i, 1);
        }
        for (let i = this.hitFx.length - 1; i >= 0; i--) {
            const h = this.hitFx[i];
            h.life--;
            h.r += 0.7;
            if (h.life <= 0) this.hitFx.splice(i, 1);
        }

        document.getElementById('kill-count').textContent = this.kills;
        document.getElementById('timer').textContent = Math.floor(this.timer);
        document.getElementById('player-lv').textContent = this.player.lv;
        document.getElementById('xp-bar-fill').style.width = (this.player.xp / this.player.xpToNext * 100) + '%';
        document.getElementById('hp-bar-fill').style.width = (this.player.hp / this.player.maxHp * 100) + '%';
        document.getElementById('active-count').textContent = BattleSkills.active.length;
        const strip = (this._runPoolSummary ? '[' + this._runPoolSummary + '] ' : '') +
            BattleSkills.active.map(a => ACTIVE_SKILLS[a.id]?.name + ' Lv.' + a.stars + (a.evo ? ' EVO' : '')).join(' | ');
        document.getElementById('skill-strip').textContent = strip || '(本局技能可疊加升級)';
    },
    queueLevelUp() {
        this.levelUpQueue++;
        if (!this.pendingLevelUp) this.processLevelUpQueue();
    },
    processLevelUpQueue() {
        if (this.levelUpQueue <= 0) return;
        this.levelUpQueue--;
        this.showLevelUp();
    },
    trySpawnEvoChest() {
        for (const a of BattleSkills.active) {
            const evoName = BattleSkills.canEvo(a.id);
            if (evoName) { this.pendingEvo = { activeId: a.id, evoName }; return; }
        }
    },
    showLevelUp() {
        this.pendingLevelUp = true;
        const actPool = this.runActivePool || ['kunai'];
        const options = [];
        actPool.forEach(id => {
            const cur = BattleSkills.getActive(id);
            const stars = cur ? cur.stars : 0;
            if (!cur || stars < 5) {
                options.push({ id, isActive: true, weight: cur ? 4 : 2, stars });
            }
        });
        if (!options.length) {
            this.pendingLevelUp = false;
            if (this.levelUpQueue > 0) setTimeout(() => this.processLevelUpQueue(), 100);
            return;
        }
        const choices = [];
        const used = new Set();
        for (let c = 0; c < 3 && options.length > used.size; c++) {
            const avail = options.filter(o => !used.has(o.id));
            if (!avail.length) break;
            const totalW = avail.reduce((s, o) => s + o.weight, 0);
            let roll = Math.random() * totalW;
            let pick = avail[0];
            for (const o of avail) {
                roll -= o.weight;
                if (roll <= 0) { pick = o; break; }
            }
            used.add(pick.id);
            const name = ACTIVE_SKILLS[pick.id].name;
            const nextLv = (pick.stars || 0) + 1;
            let sub = '';
            if (pick.isActive) {
                const curS = pick.stars || 0;
                const dmgPct = Math.round((skillLevelDamageMult(nextLv, false) / skillLevelDamageMult(Math.max(1, curS), false) - 1) * 100);
                const shots = skillProjCount(3, nextLv, false, 0);
                const cdCut = skillLevelCdBonus(nextLv) - skillLevelCdBonus(curS);
                sub = curS ? (' → Lv.' + nextLv + ' 傷害+' + dmgPct + '% 彈數' + shots + ' 冷卻-' + cdCut) : (' (新技能 Lv.1 彈數' + shots + ')');
            }
            choices.push({ id: pick.id, name, isActive: true, sub, description: ACTIVE_SKILLS[pick.id].description });
        }
        const modal = document.getElementById('levelup-modal');
        const box = document.getElementById('levelup-choices');
        box.innerHTML = '<p style="color:rgba(255,255,255,0.8);font-size:0.85rem;margin-bottom:8px;">本局僅能從固定主動技能池升級；主動技能達 Lv.5 後可 EVO。</p>';
        choices.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'choice-btn';
            btn.textContent = c.name + (c.sub || ' (主動)') + (c.description ? ' — ' + c.description : '');
            btn.onclick = () => {
                BattleSkills.addActive(c.id);
                modal.classList.remove('show');
                this.pendingLevelUp = false;
                const evoName = c.isActive ? BattleSkills.canEvo(c.id) : null;
                if (evoName) { this.pendingEvo = { activeId: c.id, evoName }; this.showEvoModal(); }
                else {
                    for (const a of BattleSkills.active) {
                        const ev = BattleSkills.canEvo(a.id);
                        if (ev) { this.pendingEvo = { activeId: a.id, evoName: ev }; this.showEvoModal(); break; }
                    }
                }
                if (this.levelUpQueue > 0) setTimeout(() => this.processLevelUpQueue(), 100);
            };
            box.appendChild(btn);
        });
        modal.classList.add('show');
    },
    showEvoModal() {
        if (!this.pendingEvo) return;
        const { activeId, evoName } = this.pendingEvo;
        const modal = document.getElementById('evo-modal');
        const box = document.getElementById('evo-choices');
        box.innerHTML = '';
        const btn = document.createElement('button');
        btn.className = 'choice-btn evo';
        btn.textContent = '✨ ' + evoName;
        btn.onclick = () => {
            BattleSkills.doEvo(activeId);
            modal.classList.remove('show');
            this.pendingEvo = null;
        };
        box.appendChild(btn);
        modal.classList.add('show');
    },
    render() {
        Background.draw();
        const cam = { x: this.player ? this.player.x : 0, y: this.player ? this.player.y : 0 };
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.player) return;
        this.ctx.save();
        const shake = (this.shakeTime > 0 && this.shakeDuration > 0) ? this.shakeMagnitude * (this.shakeTime / this.shakeDuration) : 0;
        const shakeX = (Math.random() * 2 - 1) * shake;
        const shakeY = (Math.random() * 2 - 1) * shake;
        this.ctx.translate(this.canvas.width/2 - cam.x + shakeX, this.canvas.height/2 - cam.y + shakeY);
        Background.drawWorld(this.ctx, cam);
        this.expOrbs.forEach(o => o.draw(this.ctx, cam));
        this.enemies.forEach(e => e.draw(this.ctx, cam));
        this.bosses.forEach(b => b.draw(this.ctx, cam));
        const equippedPet = getEquippedPet();
        if (this.petActor && equippedPet) drawPetCreature(this.ctx, this.petActor.x, this.petActor.y, equippedPet, this.petActor.facing, this.petActor.attacking);
        this.projectiles.forEach(p => p.draw(this.ctx, cam));
        for (const h of this.hitFx) {
            const t = h.life / h.maxLife;
            const r = h.r;
            this.ctx.save();
            this.ctx.translate(h.x, h.y);
            const grad = this.ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            grad.addColorStop(0, 'rgba(255,255,255,' + (0.6*t) + ')');
            grad.addColorStop(0.3, h.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            this.ctx.fillStyle = grad;
            this.ctx.beginPath();
            this.ctx.arc(0, 0, r, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.restore();
        }
        for (const p of this.particles) {
            const alpha = Math.max(0, Math.min(1, p.life / p.maxLife));
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
            this.ctx.fill();
            this.ctx.restore();
        }
        if (this.onlineMode === 'versus' && this.player) {
            const duelRingRadius = 380;
            const opponentDistance = this.remotePlayer
                ? Math.hypot(this.remotePlayer.x - this.player.x, this.remotePlayer.y - this.player.y)
                : Infinity;
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, duelRingRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = opponentDistance <= duelRingRadius ? 'rgba(255,79,117,0.95)' : 'rgba(0,210,255,0.75)';
            this.ctx.lineWidth = 4;
            this.ctx.setLineDash([14, 10]);
            this.ctx.shadowColor = this.ctx.strokeStyle;
            this.ctx.shadowBlur = 14;
            this.ctx.stroke();
            this.ctx.restore();
        }
        if (this.onlineMode === 'versus' && Array.isArray(this.remoteProjectiles)) {
            for (const p of this.remoteProjectiles) {
                if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) continue;
                this.ctx.save();
                this.ctx.translate(p.x, p.y);
                this.ctx.globalAlpha = 0.78;
                this.ctx.strokeStyle = p.color || '#64d8ff';
                this.ctx.fillStyle = p.color || '#64d8ff';
                this.ctx.shadowColor = p.color || '#64d8ff';
                this.ctx.shadowBlur = 12;
                if (p.beamLength > 0) {
                    this.ctx.lineWidth = Math.max(3, (p.beamWidth || 4) * 2);
                    this.ctx.beginPath(); this.ctx.moveTo(0, 0);
                    this.ctx.lineTo(Math.cos(p.beamAngle || 0) * p.beamLength, Math.sin(p.beamAngle || 0) * p.beamLength); this.ctx.stroke();
                } else if (p.shockwaveMaxRadius > 0) {
                    this.ctx.lineWidth = Math.max(3, p.shockwaveThickness || 4);
                    this.ctx.beginPath(); this.ctx.arc(0, 0, p.shockwaveRadius || p.r || 10, 0, Math.PI * 2); this.ctx.stroke();
                } else if (p.explosionRadius > 0 || p.triggerRadius > 0 || p.areaField || p.mine) {
                    this.ctx.globalAlpha = 0.22; this.ctx.beginPath();
                    this.ctx.arc(0, 0, Math.max(p.explosionRadius || 0, p.triggerRadius || 0, p.r || 8), 0, Math.PI * 2);
                    this.ctx.fill(); this.ctx.globalAlpha = 0.85; this.ctx.stroke();
                } else {
                    this.ctx.beginPath(); this.ctx.arc(0, 0, Math.max(3, Math.min(18, p.r || 6)), 0, Math.PI * 2); this.ctx.fill();
                }
                this.ctx.restore();
            }
        }
        this.player.draw(this.ctx, cam);
        if (this.remotePlayer) {
            const remote = this.remotePlayer;
            this.ctx.save();
            this.ctx.translate(remote.x, remote.y);
            this.ctx.fillStyle = '#ff4f75';
            this.ctx.strokeStyle = '#fff';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(0, -22); this.ctx.lineTo(18, 8); this.ctx.lineTo(0, 22); this.ctx.lineTo(-18, 8);
            this.ctx.closePath(); this.ctx.fill(); this.ctx.stroke();
            this.ctx.fillStyle = '#fff'; this.ctx.font = '12px sans-serif'; this.ctx.textAlign = 'center';
            this.ctx.fillText(this.onlineMode === 'versus' ? '對手' : '隊友', 0, -30);
            if (this.onlineMode === 'versus') {
                const hpRatio = Math.max(0, Math.min(1, (Number(remote.hp) || 0) / Math.max(1, Number(remote.maxHp) || 5000)));
                this.ctx.fillStyle = 'rgba(0,0,0,0.7)'; this.ctx.fillRect(-28, -44, 56, 6);
                this.ctx.fillStyle = hpRatio > 0.35 ? '#55ef8b' : '#ff4f75'; this.ctx.fillRect(-28, -44, 56 * hpRatio, 6);
                const skillNames = (this.remoteActiveSkills || []).slice(0, 3).map(a => ACTIVE_SKILLS[a.id]?.name || a.id).join('、');
                if (skillNames) { this.ctx.fillStyle = '#9feaff'; this.ctx.font = '10px sans-serif'; this.ctx.fillText(skillNames, 0, 36); }
                if (remote.isDead || remote.hp <= 0) { this.ctx.fillStyle = '#ff4f75'; this.ctx.font = 'bold 14px sans-serif'; this.ctx.fillText('已被擊敗', 0, 52); }
            }
            this.ctx.restore();
        }
        if (this.onlineMode === 'versus') {
            const arenaRadius = getDuelArenaRadius();
            const elapsed = Math.max(0, (Date.now() - (OnlineSession.matchStartedAt || Date.now())) / 1000);
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(0, 0, arenaRadius, 0, Math.PI * 2);
            this.ctx.strokeStyle = elapsed > 15 ? 'rgba(255,75,105,0.95)' : 'rgba(70,220,255,0.9)';
            this.ctx.lineWidth = 8;
            this.ctx.setLineDash([24, 14]);
            this.ctx.shadowColor = this.ctx.strokeStyle;
            this.ctx.shadowBlur = 18;
            this.ctx.stroke();
            this.ctx.restore();
        }
        this.ctx.restore();
        if (this.onlineMode === 'versus') this.drawDuelHUD();
        this.drawJoystick();
    },
    drawDuelHUD() {
        const ctx = this.ctx;
        const w = this.canvas.width, h = this.canvas.height;
        const me = this.player, opp = this.remotePlayer;
        if (!me) return;
        const size = Math.max(112, Math.min(164, Math.min(w, h) * 0.24));
        const pad = 16, x = w - size - pad, y = pad + 18;
        const cx = x + size / 2, cy = y + size / 2, r = size * 0.40;
        const arenaRadius = getDuelArenaRadius();
        ctx.save();
        ctx.fillStyle = 'rgba(5,12,28,0.82)';
        ctx.strokeStyle = 'rgba(125,220,255,0.8)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(x, y, size, size, 12); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#eaf7ff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
        ctx.fillText('小地圖', cx, y - 5);
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        ctx.fillStyle = 'rgba(65,100,140,0.18)'; ctx.fillRect(cx-r, cy-r, r*2, r*2);
        ctx.strokeStyle = 'rgba(150,190,220,0.35)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(cx-r, cy); ctx.lineTo(cx+r, cy); ctx.moveTo(cx, cy-r); ctx.lineTo(cx, cy+r); ctx.stroke();
        ctx.strokeStyle = 'rgba(170,190,220,0.55)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,80,110,0.95)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(cx, cy, r * arenaRadius / MAP_RADIUS, 0, Math.PI*2); ctx.stroke();
        const dot = (p, color, radius) => {
            if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return;
            const scale = r / MAP_RADIUS;
            const px = cx + p.x * scale, py = cy + p.y * scale;
            ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 8;
            ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI*2); ctx.fill(); ctx.shadowBlur = 0;
        };
        dot(me, '#55e8ff', 4.5);
        if (opp && !opp.isDead && Number(opp.hp) > 0) dot(opp, '#ff4f75', 4.5);
        ctx.restore();
        if (opp && !opp.isDead && Number(opp.hp) > 0) {
            const dx = opp.x - me.x, dy = opp.y - me.y;
            const sx = w / 2 + dx, sy = h / 2 + dy;
            const margin = 42;
            const offscreen = sx < margin || sx > w-margin || sy < margin || sy > h-margin;
            if (offscreen) {
                const angle = Math.atan2(dy, dx);
                const maxX = w/2 - margin, maxY = h/2 - margin;
                const factor = Math.min(maxX / Math.max(1, Math.abs(dx)), maxY / Math.max(1, Math.abs(dy)));
                const ax = w/2 + dx * factor, ay = h/2 + dy * factor;
                ctx.save(); ctx.translate(Math.max(margin, Math.min(w-margin, ax)), Math.max(margin, Math.min(h-margin, ay))); ctx.rotate(angle);
                ctx.fillStyle = '#ff4f75'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(18,0); ctx.lineTo(-10,-11); ctx.lineTo(-5,0); ctx.lineTo(-10,11); ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.rotate(-angle); ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('對手', 0, 25);
                ctx.restore();
            }
        }
        const elapsed = Math.max(0, (Date.now() - (OnlineSession.matchStartedAt || Date.now())) / 1000);
        ctx.fillStyle = elapsed < 15 ? '#9deaff' : '#ff879e';
        ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'right';
        ctx.fillText(elapsed < 15 ? '安全區即將縮小' : '安全區正在縮小', w - 16, y + size + 18);
        ctx.restore();
    },
    drawJoystick() {
        const j = Input.joystick;
        this.ctx.save();
        const displayX = j.active ? j.baseX : 90;
        const displayY = j.active ? j.baseY : window.innerHeight - 100;
        this.ctx.globalAlpha = 0.2;
        this.ctx.fillStyle = '#00d2ff';
        this.ctx.beginPath();
        this.ctx.arc(displayX, displayY, j.maxRadius, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.globalAlpha = 0.6;
        const ballX = displayX + (j.active ? (j.x - j.baseX) : 0);
        const ballY = displayY + (j.active ? (j.y - j.baseY) : 0);
        this.ctx.beginPath();
        this.ctx.arc(ballX, ballY, 28, 0, Math.PI*2);
        this.ctx.fill();
        this.ctx.restore();
    },
    finishDuel(result) {
        if (OnlineSession.duelEnded) return;
        OnlineSession.duelEnded = true;
        this.state = 'GAMEOVER';
        this.pendingLevelUp = false;
        this.pendingEvo = null;
        this.levelUpQueue = 0;
        const lvModal = document.getElementById('levelup-modal');
        const evoModal = document.getElementById('evo-modal');
        if (lvModal) lvModal.classList.remove('show');
        if (evoModal) evoModal.classList.remove('show');
        document.getElementById('gameover-title').textContent = result === 'win' ? '🎉 你贏了！' : '💥 你輸了！';
        document.getElementById('gameover-reward').textContent = result === 'win' ? '對手已被擊敗，單挑勝利！' : '你的血量歸零，單挑失敗。';
        const btn = document.getElementById('gameover-btn');
        btn.textContent = '返回大廳';
        btn.onclick = () => location.reload();
        document.getElementById('gameover-panel').classList.add('show');
    },
    gameOver() {
        if (this.onlineMode === 'versus') { this.finishDuel('lose'); return; }
        this.state = 'GAMEOVER';
        const gold = this.calcRunGold(this.kills, this.timer, 0);
        if (gold > 0) SaveSystem.currentData.resources.gold += gold;
        SaveSystem.save();
        SaveSystem.pushCloud(true);
        document.getElementById('gameover-title').textContent = '戰鬥失敗';
        document.getElementById('gameover-reward').textContent = gold > 0
            ? ('金幣 +' + gold + '（已自動儲存）')
            : '此關卡無金幣（僅最新未過關關卡與前一關可賺取）';
        const btn = document.getElementById('gameover-btn');
        btn.textContent = '返回大廳';
        btn.onclick = () => location.reload();
        document.getElementById('gameover-panel').classList.add('show');
    },
    stageClear() {
        this.state = 'CLEAR';
        this.pendingLevelUp = false;
        this.pendingEvo = null;
        this.levelUpQueue = 0;
        const lvModal = document.getElementById('levelup-modal');
        const evoModal = document.getElementById('evo-modal');
        if (lvModal) lvModal.classList.remove('show');
        if (evoModal) evoModal.classList.remove('show');
        const gold = this.calcRunGold(this.kills, this.timer, this.currentStage * 15);
        if (gold > 0) SaveSystem.currentData.resources.gold += gold;
        SaveSystem.save();
        SaveSystem.pushCloud(true);
        document.getElementById('gameover-title').textContent = '通關成功！';
        document.getElementById('gameover-reward').textContent = gold > 0
            ? ('獎勵：金幣 +' + gold + '（已自動儲存）')
            : '通關成功！此關卡無金幣（僅最新未過關關卡與前一關可賺取）';
        const btn = document.getElementById('gameover-btn');
        btn.textContent = '返回大廳';
        btn.onclick = () => this.returnToLobby();
        document.getElementById('gameover-panel').classList.add('show');
    },
    returnToLobby() {
        if (OnlineSession.active || OnlineSession.busy) OnlineSession.leave();
        this.state = 'LOBBY';
        document.getElementById('battle-hud').style.display = 'none';
        document.getElementById('lobby-container').style.display = 'flex';
        document.getElementById('gameover-panel').classList.remove('show');
        this.renderLobby();
    },
    getEnemyTarget(enemy) {
        if (!this.remotePlayer) return this.player;
        const localDist = Math.hypot(enemy.x - this.player.x, enemy.y - this.player.y);
        const remoteDist = Math.hypot(enemy.x - this.remotePlayer.x, enemy.y - this.remotePlayer.y);
        return remoteDist < localDist ? this.remotePlayer : this.player;
    },
    showAlert(text) {
        const el = document.getElementById('alert-banner');
        if (!el) return;
        el.textContent = text || '';
        el.style.opacity = '1';
        clearTimeout(this._alertTimer);
        this._alertTimer = setTimeout(() => {
            el.style.opacity = '0';
        }, 1800);
    },
    renderEventBanner() {
        const el = document.getElementById('event-banner');
        if (!el) return;
        if (!EVENT || !EVENT.enabled) { el.style.display = 'none'; return; }
        const now = Date.now();
        const start = EVENT.start ? Date.parse(EVENT.start) : 0;
        const end = EVENT.end ? Date.parse(EVENT.end) : Infinity;
        if (now < start || now > end) { el.style.display = 'none'; return; }
        el.textContent = EVENT.bannerText || EVENT.title || '';
        el.style.display = 'block';
    },
    renderLobby() {
        this.renderEventBanner();
        document.getElementById('lobby-gold').textContent = SaveSystem.currentData.resources.gold;
        const nameInput = document.getElementById('player-name-input');
        if (nameInput && document.activeElement !== nameInput) {
            nameInput.value = SaveSystem.currentData.playerName || '';
        }
        const list = document.getElementById('upgrade-list');
        list.innerHTML = '';
        [
            { id:'ATK', name:'攻擊', cost:100, max:20, gain:'+2 武器傷害／級' },
            { id:'HP', name:'血量', cost:100, gain:'+22 最大生命／級' },
            { id:'SPD', name:'速度', cost:150, max:10, gain:'+0.4 移動速度／級' },
            { id:'REC', name:'恢復', cost:120, max:10, gain:'+1.2 生命／秒／級' }
        ].forEach(t => {
            const lv = SaveSystem.currentData.talents[t.id] || 0;
            const cost = t.cost + lv * 50;
            const maxLevel = t.max || Infinity;
            const isMaxed = lv >= maxLevel;
            const card = document.createElement('div');
            card.className = 'talent-row glass-panel';
            const totalGain = t.id === 'ATK' ? Math.min(lv, 20) * 2 : t.id === 'HP' ? lv * 22 : t.id === 'SPD' ? Math.min(lv, 10) * 0.4 : Math.min(lv, 10) * 1.2;
            const currentEffect = t.id === 'SPD' ? '目前 +' + totalGain.toFixed(1) : t.id === 'REC' ? '目前 +' + totalGain.toFixed(1) + ' 生命／秒' : '目前 +' + totalGain + (t.id === 'HP' ? ' 最大生命' : ' 傷害');
            const label = t.name + ' Lv.' + lv + (isMaxed ? '（已達上限）' : '') +
                '<br><small style="color:#b8c9d2">' + t.gain + '；' + currentEffect + '</small>';
            const btnLabel = isMaxed ? '已滿級' : cost + '💰';
            const btnDisabled = isMaxed || SaveSystem.currentData.resources.gold < cost;
            card.innerHTML = '<span>' + label + '</span><button class="main-btn small" onclick="GameEngine.buyTalent(\'' + t.id + '\',' + cost + ')"' + (btnDisabled ? ' disabled' : '') + '>' + btnLabel + '</button>';
            list.appendChild(card);
        });
        const stageList = document.getElementById('stage-list');
        stageList.innerHTML = '';
        const unlocked = Math.min(SaveSystem.currentData.unlockedStage || 1, MAX_STAGES);
        const goldMin = Math.max(1, unlocked - 1);
        for (let i = 1; i <= MAX_STAGES; i++) {
            const st = STAGES[i - 1];
            const locked = i > unlocked;
            const earnsGold = !locked && i >= goldMin && i <= unlocked;
            const btn = document.createElement('button');
            btn.className = 'main-btn small';
            btn.style.marginRight = '6px';
            btn.style.marginBottom = '6px';
            btn.textContent = st.name + (locked ? ' 🔒' : (earnsGold ? ' 💰' : ''));
            btn.disabled = locked;
            btn.onclick = () => GameEngine.startBattle(i);
            stageList.appendChild(btn);
        }
        this.drawSkinCollection();
        this.renderPets();
        this.renderFarm();
    },
    petRarityRank(rarity) {
        return ({ '普通':0, '稀有':1, '史詩':2, '神寵':3 })[rarity] ?? 0;
    },
    petSellPrice(pet) {
        const cfg = PET_DEFS[pet.id];
        if (!cfg) return 0;
        const weight = Math.max(0.5, Number(pet.weight) || 0.5);
        const rarityMult = BALANCE.petSellRarityMult[cfg.rarity] || 1;
        return Math.max(10, Math.round(BALANCE.petSellBase * (BALANCE.petSellWeightBase + weight * BALANCE.petSellWeightMul) * rarityMult));
    },
    autoSellSetting() {
        const select = document.getElementById('pet-auto-sell-rarity');
        return select ? select.value : 'off';
    },
    drawPets() {
        const d = SaveSystem.currentData;
        const input = document.getElementById('pet-draw-count');
        const requested = Math.max(1, Math.min(100, parseInt(input && input.value, 10) || 1));
        const unit = BALANCE.petDrawCost;
        const count = Math.min(requested, Math.floor(d.resources.gold / unit));
        const message = document.getElementById('pet-lottery-msg');
        if (!count) {
            if (message) message.textContent = '金幣不足，每抽需要 ' + unit + ' 金幣。';
            return;
        }
        d.resources.gold -= count * unit;
        let gods = 0, soldCount = 0, soldGold = 0;
        const prizes = [];
        const enabled = !!(document.getElementById('pet-auto-sell-enabled') || {}).checked;
        const threshold = this.autoSellSetting();
        for (let i = 0; i < count; i++) {
            const pet = rollPet();
            const cfg = PET_DEFS[pet.id];
            prizes.push(cfg.name);
            if (cfg.rarity === '神寵') gods++;
            const shouldAutoSell = enabled && threshold !== 'off' && this.petRarityRank(cfg.rarity) <= this.petRarityRank(threshold);
            if (shouldAutoSell) {
                soldCount++;
                soldGold += this.petSellPrice(pet);
            } else {
                d.pets.push(pet);
            }
        }
        if (soldCount) d.resources.gold += soldGold;
        SaveSystem.save();
        if (message) message.textContent = '抽取 ' + count + ' 隻' + (gods ? '，神寵 ' + gods + ' 隻' : '') + (soldCount ? '；自動出售 ' + soldCount + ' 隻，獲得 ' + soldGold + ' 金幣' : '') + '。' + prizes.slice(0, 5).join('、') + (count > 5 ? '…' : '');
        this.renderLobby();
    },
    sellPetsByRarity() {
        const d = SaveSystem.currentData;
        const threshold = this.autoSellSetting();
        if (threshold === 'off') { this.showAlert('請先選擇要出售的稀有度。'); return; }
        const rank = this.petRarityRank(threshold);
        const kept = [];
        let count = 0, total = 0;
        for (const pet of d.pets) {
            const cfg = PET_DEFS[pet.id];
            if (cfg && pet.uid !== d.equippedPet && this.petRarityRank(cfg.rarity) <= rank) {
                count++;
                total += this.petSellPrice(pet);
            } else kept.push(pet);
        }
        if (!count) { this.showAlert('沒有符合條件且未裝備的寵物可以出售。'); return; }
        d.pets = kept;
        d.resources.gold = (Number(d.resources.gold) || 0) + total;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('已出售 ' + count + ' 隻寵物，獲得 ' + total + ' 金幣！裝備中的寵物會保留。');
    },
    equipPet(uid) {
        const pet = SaveSystem.currentData.pets.find(item => item.uid === uid);
        if (!pet) return;
        SaveSystem.currentData.equippedPet = uid;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('已裝備 ' + PET_DEFS[pet.id].name);
    },
    sellPet(uid) {
        const d = SaveSystem.currentData;
        const index = d.pets.findIndex(item => item.uid === uid);
        if (index < 0) return;
        const pet = d.pets[index];
        if (d.equippedPet === uid) { d.equippedPet = ''; this.petActor = null; }
        const cfg = PET_DEFS[pet.id];
        const weight = Math.max(0.5, Number(pet.weight) || 0.5);
        const price = this.petSellPrice(pet);
        d.pets.splice(index, 1);
        d.resources.gold = (Number(d.resources.gold) || 0) + price;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('已出售 ' + cfg.name + '（' + weight.toFixed(2) + ' kg），獲得 ' + price + ' 金幣！');
    },
    renderPets() {
        const raritySelect = document.getElementById('pet-auto-sell-rarity');
        const autoSellCheck = document.getElementById('pet-auto-sell-enabled');
        try {
            if (raritySelect && localStorage.getItem('petAutoSellRarity')) raritySelect.value = localStorage.getItem('petAutoSellRarity');
            if (autoSellCheck) autoSellCheck.checked = localStorage.getItem('petAutoSellEnabled') === '1';
        } catch (e) {}
        const box = document.getElementById('pet-collection');
        if (!box) return;
        const d = SaveSystem.currentData;
        box.innerHTML = '';
        if (!d.pets.length) {
            box.textContent = '尚無寵物，抽取後會保存在收藏中。';
            return;
        }
        d.pets.slice().reverse().forEach(pet => {
            const config = PET_DEFS[pet.id];
            const equipped = d.equippedPet === pet.uid;
            const card = document.createElement('div');
            card.className = 'feature-item';
            const title = document.createElement('strong');
            title.textContent = config.name + '｜' + config.rarity;
            title.style.color = config.color;
            card.appendChild(title);
            const effect = document.createElement('p');
            const effects = [];
            if (config.damage) effects.push('傷害 +' + Math.round(config.damage * 100) + '%');
            if (config.defense) effects.push('減傷 +' + Math.round(config.defense * 100) + '%');
            if (config.shield) effects.push('護盾 +' + Math.round(config.shield * 100) + '%');
            effects.push('協助攻擊 ' + config.assist + '/秒');
            const weight = Math.max(0.5, Number(pet.weight) || 0.5);
            const sellPrice = this.petSellPrice(pet);
            effects.push('重量 ' + weight.toFixed(2) + ' kg');
            effects.push('出售價 ' + sellPrice + ' 金幣');
            effect.textContent = effects.join('、');
            card.appendChild(effect);
            const button = document.createElement('button');
            button.className = 'main-btn small';
            button.textContent = equipped ? '裝備中' : '裝備';
            button.disabled = equipped;
            button.onclick = () => this.equipPet(pet.uid);
            card.appendChild(button);
            const sellButton = document.createElement('button');
            sellButton.className = 'main-btn small';
            sellButton.style.marginLeft = '6px';
            sellButton.style.background = '#9b3d45';
            sellButton.textContent = '出售 +' + sellPrice + ' 金幣';
            sellButton.disabled = false;
            sellButton.title = equipped ? '出售後會自動解除裝備' : '出售這隻寵物';
            sellButton.onclick = () => this.sellPet(pet.uid);
            card.appendChild(sellButton);
            box.appendChild(card);
        });
    },
    formatDuration(ms) {
        const seconds = Math.max(0, Math.ceil(ms / 1000));
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const rest = seconds % 60;
        return (hours ? hours + '小時 ' : '') + (minutes ? minutes + '分 ' : '') + rest + '秒';
    },
    farmFruitPrice(fruit) {
        const seed = FARM_SEEDS.find(item => item.id === fruit.seedId);
        const mutation = FARM_MUTATIONS[fruit.mutation];
        return Math.floor((seed ? seed.yield : 0) * fruit.weight * (mutation ? mutation.multiplier : 1));
    },
    farmGrowDuration(seed) {
        return seed.growMs;
    },
    updateSprinklerBoostClock() {
        const farm = SaveSystem.currentData.farm;
        const now = Date.now();
        const last = Number(farm.sprinklerBoostLastTick) || now;
        if (!farm.sprinklerBoostLastTick) {
            farm.sprinklerBoostLastTick = now;
            return;
        }
        const boostedStart = Math.max(last, 0);
        const boostedEnd = Math.min(now, Number(farm.sprinklerBoostUntil) || 0);
        const boostedMs = Math.max(0, boostedEnd - boostedStart);
        if (boostedMs > 0) {
            const extraMs = boostedMs * FARM_SPRINKLER_SPEED;
            (farm.plots || []).forEach(plot => {
                if (plot && plot.seed && plot.plantedAt) plot.plantedAt -= extraMs;
            });
        }
        farm.sprinklerBoostLastTick = now;
    },
    getSeedOwnedCount(seedId) {
        return (SaveSystem.currentData.farm.seedInventory || []).filter(id => id === seedId).length;
    },
    getFarmStockBucket() {
        return Math.floor(Date.now() / FARM_STOCK_CYCLE_MS);
    },
    seededFarmRandom(text) {
        let h = 2166136261;
        for (let i = 0; i < text.length; i++) {
            h ^= text.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        h += h << 13;
        h ^= h >>> 7;
        h += h << 3;
        h ^= h >>> 17;
        h += h << 5;
        return ((h >>> 0) % 1000000) / 1000000;
    },
    getFarmSeedStock(seed) {
        const bucket = Math.floor(Date.now() / FARM_STOCK_CYCLE_MS);
        const ordered = FARM_SEEDS.slice().sort((a, b) => a.cost - b.cost);
        const index = ordered.findIndex(item => item.id === seed.id);
        let publicStock;
        if (index === 0) {
            publicStock = 5;
        } else {
            const chance = 0.92 - (index / Math.max(1, ordered.length - 1)) * 0.84;
            const roll = this.seededFarmRandom(bucket + ':' + seed.id + ':availability');
            if (roll >= chance) publicStock = 0;
            else publicStock = 1 + Math.floor(this.seededFarmRandom(bucket + ':' + seed.id + ':quantity') * (index < 5 ? 5 : index < 12 ? 3 : 2));
        }
        const purchases = SaveSystem.currentData.farm.seedShopPurchases || {};
        const bucketPurchases = purchases[String(bucket)] || {};
        const bought = Math.max(0, Number(bucketPurchases[seed.id]) || 0);
        return Math.max(0, publicStock - bought);
    },
    renderFarmSeedShop() {
        const d = SaveSystem.currentData;
        const list = document.getElementById('farm-seed-shop-list');
        const countdown = document.getElementById('farm-seed-stock-countdown');
        if (!list) return;
        if (countdown) {
            const remain = FARM_STOCK_CYCLE_MS - (Date.now() % FARM_STOCK_CYCLE_MS);
            countdown.textContent = '公開庫存下次輪換：' + this.formatDuration(remain) + ' · 最便宜的種子固定有貨';
        }
        list.replaceChildren();
        FARM_SEEDS.slice().sort((a, b) => a.cost - b.cost).forEach(seed => {
            const stock = this.getFarmSeedStock(seed);
            const owned = this.getSeedOwnedCount(seed.id);
            const card = document.createElement('div');
            card.className = 'feature-item';
            const title = document.createElement('strong');
            title.textContent = seed.plant + ' ' + seed.name;
            const detail = document.createElement('p');
            detail.textContent = '價格：' + seed.cost + ' 植物幣 · 成長時間：' + this.formatDuration(seed.growMs) + ' · 收成基礎價：' + seed.yield;
            const stockBadge = document.createElement('span');
            stockBadge.className = 'farm-stock-badge' + (stock <= 0 ? ' out' : '');
            stockBadge.textContent = stock > 0 ? '公開庫存 × ' + stock : '目前缺貨';
            const ownedText = document.createElement('p');
            ownedText.textContent = '背包持有：' + owned + ' 顆';
            const actions = document.createElement('div');
            actions.className = 'farm-seed-actions';
            const buy = document.createElement('button');
            buy.className = 'main-btn small';
            buy.textContent = '購買種子';
            buy.disabled = stock <= 0 || d.resources.plantCoins < seed.cost;
            buy.onclick = () => this.buyFarmSeed(seed.id);
            actions.appendChild(buy);
            card.append(title, detail, stockBadge, ownedText, actions);
            list.appendChild(card);
        });
    },
    renderFarmPlant(scene, seed, progress) {
        scene.className = 'farm-plot-scene';
        scene.setAttribute('aria-label', seed.name + ' 生長中');
        const sun = document.createElement('span');
        sun.className = 'farm-sun';
        sun.textContent = '☀️';
        scene.appendChild(sun);
        const ground = document.createElement('div');
        ground.className = 'farm-ground';
        scene.appendChild(ground);
        const stem = document.createElement('div');
        stem.className = 'farm-stem';
        stem.style.height = (20 + progress * 53) + 'px';
        const head = document.createElement('span');
        head.className = 'farm-plant-head';
        head.style.transform = 'translateX(-50%) scale(' + (0.68 + progress * 0.45) + ')';
        head.textContent = progress < 0.18 ? '🌱' : seed.plant;
        stem.appendChild(head);
        scene.appendChild(stem);
        if (progress >= 0.25) {
            const leftLeaf = document.createElement('span');
            leftLeaf.className = 'farm-leaf left';
            leftLeaf.textContent = '🍃';
            const rightLeaf = document.createElement('span');
            rightLeaf.className = 'farm-leaf right';
            rightLeaf.textContent = '🍃';
            stem.append(leftLeaf, rightLeaf);
        }
        if (progress >= 0.62) {
            ['one', 'two'].forEach(position => {
                const fruit = document.createElement('span');
                fruit.className = 'farm-fruit-sprite ' + position;
                fruit.textContent = seed.fruit;
                stem.appendChild(fruit);
            });
        }
    },
    renderFarmInventory() {
        const d = SaveSystem.currentData;
        const box = document.getElementById('farm-inventory');
        const toolbar = document.getElementById('farm-store-toolbar');
        if (!box || !toolbar) return;
        if (!this._farmSelectedFruitIds) this._farmSelectedFruitIds = new Set();
        const inventory = d.farm.inventory;
        const validIds = new Set(inventory.map(fruit => fruit.id));
        this._farmSelectedFruitIds = new Set([...this._farmSelectedFruitIds].filter(id => validIds.has(id)));
        const selected = inventory.filter(fruit => this._farmSelectedFruitIds.has(fruit.id));
        const selectedPrice = selected.reduce((total, fruit) => total + this.farmFruitPrice(fruit), 0);
        toolbar.replaceChildren();
        const summary = document.createElement('strong');
        summary.textContent = '庫存 ' + inventory.length + ' 顆' + (selected.length ? '｜已選 ' + selected.length + ' 顆，合計 ' + selectedPrice + ' 植物幣' : '');
        toolbar.appendChild(summary);
        const sellSelected = document.createElement('button');
        sellSelected.className = 'main-btn small';
        sellSelected.textContent = '出售勾選果實';
        sellSelected.disabled = !selected.length;
        sellSelected.onclick = () => this.sellFarmFruit([...this._farmSelectedFruitIds]);
        toolbar.appendChild(sellSelected);
        const sellAll = document.createElement('button');
        sellAll.className = 'main-btn small';
        sellAll.textContent = '全部出售';
        sellAll.disabled = !inventory.length;
        sellAll.onclick = () => this.sellFarmFruit(inventory.map(fruit => fruit.id));
        toolbar.appendChild(sellAll);
        box.replaceChildren();
        if (!inventory.length) {
            const empty = document.createElement('p');
            empty.textContent = '還沒有果實；收成後會在這裡看到每顆果實。';
            box.appendChild(empty);
            return;
        }
        inventory.forEach(fruit => {
            const seed = FARM_SEEDS.find(item => item.id === fruit.seedId);
            if (!seed) return;
            const mutation = FARM_MUTATIONS[fruit.mutation];
            const card = document.createElement('div');
            card.className = 'feature-item farm-fruit-card';
            if (fruit.mutation) card.style.borderColor = fruit.mutation === 'rainbow' ? '#d9a6ff' : fruit.mutation === 'gold' ? '#eac34c' : '#c0cbd5';
            const art = document.createElement('div');
            art.className = 'farm-fruit-art' + (fruit.mutation ? ' ' + fruit.mutation : '');
            art.style.fontSize = Math.max(28, Math.min(58, 28 + fruit.weight * 6)) + 'px';
            art.textContent = seed.fruit;
            if (mutation) {
                const badge = document.createElement('span');
                badge.className = 'farm-mutation-badge';
                badge.textContent = mutation.icon;
                art.appendChild(badge);
            }
            card.appendChild(art);
            const info = document.createElement('div');
            info.className = 'farm-fruit-info';
            const title = document.createElement('strong');
            title.textContent = (mutation ? mutation.icon + ' ' + mutation.name + '變異 ' : '') + seed.name.replace('種子', '果');
            if (fruit.mutation === 'rainbow') title.style.color = '#f2b9ff';
            else if (fruit.mutation === 'gold') title.style.color = '#ffd54f';
            else if (fruit.mutation === 'silver') title.style.color = '#d9e2ec';
            info.appendChild(title);
            const detail = document.createElement('p');
            detail.textContent = '重量 ' + fruit.weight.toFixed(2) + ' kg｜' + (mutation ? mutation.multiplier + ' 倍' : '普通') + '｜售價 ' + this.farmFruitPrice(fruit) + ' 植物幣';
            info.appendChild(detail);
            card.appendChild(info);
            const actions = document.createElement('div');
            actions.className = 'farm-fruit-actions';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.checked = this._farmSelectedFruitIds.has(fruit.id);
            checkbox.setAttribute('aria-label', '選擇出售 ' + seed.name + ' ' + fruit.weight.toFixed(2) + ' 公斤');
            checkbox.onchange = () => {
                if (checkbox.checked) this._farmSelectedFruitIds.add(fruit.id);
                else this._farmSelectedFruitIds.delete(fruit.id);
                this.renderFarmInventory();
            };
            actions.appendChild(checkbox);
            const sell = document.createElement('button');
            sell.className = 'main-btn small';
            sell.textContent = '出售';
            sell.onclick = () => this.sellFarmFruit([fruit.id]);
            actions.appendChild(sell);
            card.appendChild(actions);
            box.appendChild(card);
        });
    },
    renderFarm() {
        this.updateSprinklerBoostClock();
        const d = SaveSystem.currentData;
        const coins = document.getElementById('plant-coins');
        const plotsBox = document.getElementById('farm-plots');
        const sprinklerBox = document.getElementById('farm-sprinkler');
        const machineBox = document.getElementById('gold-machine');
        if (coins) coins.textContent = Math.floor(d.resources.plantCoins || 0);
        const dailyStatus = document.getElementById('farm-daily-status');
        const today = new Date();
        const todayKey = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
        if (dailyStatus) dailyStatus.textContent = d.farm.dailyRewardDate === todayKey
            ? '今日登入獎勵已領取 +' + FARM_DAILY_PLANT_COINS + ' 植物幣；明日登入可再領'
            : '每日登入自動領取 +' + FARM_DAILY_PLANT_COINS + ' 植物幣';
        if (sprinklerBox) {
            sprinklerBox.replaceChildren();
            const active = Date.now() < (Number(d.farm.sprinklerBoostUntil) || 0);
            const sprinklerTitle = document.createElement('strong');
            sprinklerTitle.textContent = '💧 限時灑水加速';
            sprinklerBox.appendChild(sprinklerTitle);
            const sprinklerDescription = document.createElement('p');
            sprinklerDescription.textContent = active
                ? '加速中！所有作物成長速度 +50%，剩餘 ' + this.formatDuration(d.farm.sprinklerBoostUntil - Date.now()) + '。再次購買可延長時間。'
                : '每次花費 ' + FARM_SPRINKLER_COST + ' 植物幣，讓所有作物成長速度 +50%，持續 60 秒。可一直購買並累加時間。';
            sprinklerBox.appendChild(sprinklerDescription);
            const buySprinkler = document.createElement('button');
            buySprinkler.className = 'main-btn small';
            buySprinkler.textContent = '購買灑水加速 ' + FARM_SPRINKLER_COST + ' 植物幣（+60 秒）';
            buySprinkler.disabled = d.resources.plantCoins < FARM_SPRINKLER_COST;
            buySprinkler.onclick = () => this.buyFarmSprinkler();
            sprinklerBox.appendChild(buySprinkler);
        }
        if (plotsBox) {
            plotsBox.innerHTML = '';
            d.farm.plots.forEach((plot, index) => {
                const card = document.createElement('div');
                card.className = 'feature-item farm-plot-card';
                const title = document.createElement('strong');
                title.textContent = '田地 ' + (index + 1);
                card.appendChild(title);
                const seed = FARM_SEEDS.find(item => item.id === plot.seed);
                if (seed) {
                    const growMs = this.farmGrowDuration(seed);
                    const elapsed = Date.now() - plot.plantedAt;
                    const progress = Math.max(0, Math.min(100, elapsed / growMs * 100));
                    const ready = elapsed >= growMs;
                    const scene = document.createElement('div');
                    this.renderFarmPlant(scene, seed, progress / 100);
                    card.appendChild(scene);
                    const status = document.createElement('p');
                    status.textContent = ready ? seed.name.replace('種子', '果') + ' 已成熟，可收成' : seed.name + ' 成長中，剩 ' + this.formatDuration(growMs - elapsed);
                    card.appendChild(status);
                    const track = document.createElement('div');
                    track.className = 'progress-track';
                    const fill = document.createElement('span');
                    fill.style.width = progress + '%';
                    track.appendChild(fill);
                    card.appendChild(track);
                    const harvest = document.createElement('button');
                    harvest.className = 'main-btn small';
                    harvest.textContent = '收成';
                    harvest.disabled = !ready;
                    harvest.onclick = () => this.harvestCrop(index);
                    card.appendChild(harvest);
                } else {
                    const scene = document.createElement('div');
                    scene.className = 'farm-plot-scene empty';
                    scene.setAttribute('aria-label', '空土地');
                    const ground = document.createElement('div');
                    ground.className = 'farm-ground';
                    scene.appendChild(ground);
                    card.appendChild(scene);
                    const hint = document.createElement('p');
                    hint.textContent = '選擇種子；越高級收成越多、等待越久。';
                    card.appendChild(hint);
                    const seedSelect = document.createElement('select');
                    seedSelect.setAttribute('aria-label', '選擇田地 ' + (index + 1) + ' 的種子');
                    seedSelect.style.cssText = 'max-width:100%;margin:3px;padding:7px;border-radius:8px;background:#07131b;color:#fff;border:1px solid #467;';
                    seedSelect.innerHTML = '<option value="">選擇背包種子</option>';
                    FARM_SEEDS.slice().sort((a, b) => a.cost - b.cost).forEach(item => {
                        const owned = this.getSeedOwnedCount(item.id);
                        if (owned <= 0) return;
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = item.name + ' · 持有 ' + owned + ' 顆 · ' + this.formatDuration(this.farmGrowDuration(item));
                        seedSelect.appendChild(option);
                    });
                    const plantButton = document.createElement('button');
                    plantButton.className = 'main-btn small';
                    plantButton.textContent = '播種';
                    plantButton.disabled = true;
                    seedSelect.onchange = () => { plantButton.disabled = !seedSelect.value; };
                    plantButton.onclick = () => {
                        if (seedSelect.value) this.plantSeed(index, seedSelect.value);
                    };
                    card.append(seedSelect, plantButton);
                }
                plotsBox.appendChild(card);
            });
            if (d.farm.plots.length < FARM_PLOT_COUNT) {
                const cost = getFarmLandCost(d.farm.plots.length);
                const land = document.createElement('div');
                land.className = 'feature-item farm-plot-card';
                land.innerHTML = '<strong>擴建土地</strong><div class="farm-plot-scene empty"><span style="font-size:42px;z-index:1;">🪧</span><div class="farm-ground"></div></div><p>解鎖第 ' + (d.farm.plots.length + 1) + ' 塊土地</p>';
                const unlock = document.createElement('button');
                unlock.className = 'main-btn small';
                unlock.textContent = '解鎖 ' + cost + ' 植物幣';
                unlock.disabled = d.resources.plantCoins < cost;
                unlock.onclick = () => this.unlockFarmLand();
                land.appendChild(unlock);
                plotsBox.appendChild(land);
            }
        }
        this.renderFarmInventory();
        this.renderFarmSeedShop();
        if (machineBox) {
            const machine = d.farm.machine;
            if (!machine.owned) {
                machineBox.innerHTML = '<strong>金幣製造機</strong><p>購買後可手動開始 12 小時製造，離線也會計時；完成後需登入領取。</p>';
                const buy = document.createElement('button');
                buy.className = 'main-btn small';
                buy.textContent = '購買製造機 ' + MACHINE_PURCHASE_COST + ' 植物幣';
                buy.disabled = d.resources.plantCoins < MACHINE_PURCHASE_COST;
                buy.onclick = () => this.buyMachine();
                machineBox.appendChild(buy);
                return;
            }
            const upgradeCost = machine.level * MACHINE_UPGRADE_COST;
            const reward = MACHINE_REWARD_PER_LEVEL * machine.level;
            const elapsed = machine.startedAt ? Date.now() - machine.startedAt : 0;
            const ready = machine.startedAt > 0 && elapsed >= MACHINE_CYCLE_MS;
            const status = !machine.startedAt ? '尚未開始製造' : ready ? '製造完成，可登入領取' : '製造中，剩 ' + this.formatDuration(MACHINE_CYCLE_MS - elapsed);
            machineBox.innerHTML = '<strong>金幣製造機 Lv.' + machine.level + '</strong><p>' + status + '</p><p>每次手動開始，12 小時後可領取 ' + reward + ' 金幣；離線照常計時。</p>';
            if (machine.startedAt) {
                const progress = Math.max(0, Math.min(100, elapsed / MACHINE_CYCLE_MS * 100));
                machineBox.innerHTML += '<div class="progress-track"><span style="width:' + progress + '%"></span></div>';
            }
            const controls = document.createElement('div');
            const machineButton = document.createElement('button');
            machineButton.className = 'main-btn small';
            machineButton.textContent = ready ? '登入領取 +' + reward + ' 金幣' : machine.startedAt ? '製造中' : '開始製造 12 小時';
            machineButton.disabled = !!machine.startedAt && !ready;
            machineButton.onclick = () => ready ? this.claimMachine() : this.startMachine();
            controls.appendChild(machineButton);
            const upgrade = document.createElement('button');
            upgrade.className = 'main-btn small';
            upgrade.textContent = '升級 ' + upgradeCost + ' 植物幣';
            upgrade.disabled = d.resources.plantCoins < upgradeCost || machine.level >= 100;
            upgrade.onclick = () => this.upgradeMachine();
            controls.appendChild(upgrade);
            machineBox.appendChild(controls);
        }
    },
    unlockFarmLand() {
        const d = SaveSystem.currentData;
        const count = d.farm.plots.length;
        const cost = getFarmLandCost(count);
        if (count >= FARM_PLOT_COUNT || !cost || d.resources.plantCoins < cost) return;
        d.resources.plantCoins -= cost;
        d.farm.plots.push({ seed:'', plantedAt:0 });
        SaveSystem.save();
        this.renderFarm();
    },
    buyFarmSeed(seedId) {
        const d = SaveSystem.currentData;
        const seed = FARM_SEEDS.find(item => item.id === seedId);
        if (!seed) return;
        const stock = this.getFarmSeedStock(seed);
        if (stock <= 0) {
            this.showAlert('這顆種子目前缺貨，等公開庫存輪換吧！');
            return;
        }
        if (d.resources.plantCoins < seed.cost) {
            this.showAlert('植物幣不足');
            return;
        }
        d.resources.plantCoins -= seed.cost;
        d.farm.seedInventory.push(seed.id);
        if (!d.farm.seedShopPurchases || typeof d.farm.seedShopPurchases !== 'object') d.farm.seedShopPurchases = {};
        const bucketKey = String(this.getFarmStockBucket());
        if (!d.farm.seedShopPurchases[bucketKey]) d.farm.seedShopPurchases[bucketKey] = {};
        d.farm.seedShopPurchases[bucketKey][seed.id] = (Number(d.farm.seedShopPurchases[bucketKey][seed.id]) || 0) + 1;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('已購買 ' + seed.name + '，已放進種子背包；你帳號的商店庫存已扣除 1 顆。其他玩家的庫存不受影響。');
    },
    plantSeed(plotIndex, seedId) {
        const d = SaveSystem.currentData;
        const seed = FARM_SEEDS.find(item => item.id === seedId);
        const plot = d.farm.plots[plotIndex];
        const ownedIndex = d.farm.seedInventory.indexOf(seedId);
        if (!seed || !plot || plot.seed || ownedIndex < 0) {
            this.showAlert('請先到種子商店購買種子');
            return;
        }
        d.farm.seedInventory.splice(ownedIndex, 1);
        plot.seed = seed.id;
        plot.plantedAt = Date.now();
        SaveSystem.save();
        this.renderFarm();
    },
    buyFarmSprinkler() {
        const d = SaveSystem.currentData;
        if (d.resources.plantCoins < FARM_SPRINKLER_COST) {
            this.showAlert('植物幣不足');
            return;
        }
        this.updateSprinklerBoostClock();
        const now = Date.now();
        d.resources.plantCoins -= FARM_SPRINKLER_COST;
        d.farm.sprinklerBoostUntil = Math.max(now, Number(d.farm.sprinklerBoostUntil) || 0) + FARM_SPRINKLER_BOOST_MS;
        d.farm.sprinklerBoostLastTick = now;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('灑水加速已延長 60 秒！所有作物成長速度 +50%');
    },
    harvestCrop(plotIndex) {
        const d = SaveSystem.currentData;
        const plot = d.farm.plots[plotIndex];
        const seed = plot && FARM_SEEDS.find(item => item.id === plot.seed);
        if (!seed || Date.now() - plot.plantedAt < this.farmGrowDuration(seed)) return;
        const roll = Math.random();
        const mutation = roll < FARM_MUTATION_ROLL.rainbow ? 'rainbow'
            : roll < FARM_MUTATION_ROLL.gold ? 'gold'
            : roll < FARM_MUTATION_ROLL.silver ? 'silver' : '';
        d.farm.inventory.push({
            id:'fruit_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
            seedId:seed.id,
            weight:Math.round((0.5 + Math.random() * 4.5) * 100) / 100,
            mutation,
            harvestedAt:Date.now()
        });
        d.farm.plots[plotIndex] = { seed:'', plantedAt:0 };
        SaveSystem.save();
        this.renderFarm();
        this.showAlert(mutation ? FARM_MUTATIONS[mutation].icon + ' 收成變異果實！' : '收成完成，果實已送到商店');
    },
    sellFarmFruit(ids) {
        const d = SaveSystem.currentData;
        const selectedIds = new Set(ids);
        const sold = d.farm.inventory.filter(fruit => selectedIds.has(fruit.id));
        if (!sold.length) return;
        const total = sold.reduce((sum, fruit) => sum + this.farmFruitPrice(fruit), 0);
        d.farm.inventory = d.farm.inventory.filter(fruit => !selectedIds.has(fruit.id));
        if (this._farmSelectedFruitIds) sold.forEach(fruit => this._farmSelectedFruitIds.delete(fruit.id));
        d.resources.plantCoins += total;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('售出 ' + sold.length + ' 顆果實，獲得 ' + total + ' 植物幣');
    },
    startMachine() {
        const machine = SaveSystem.currentData.farm.machine;
        if (!machine.owned || machine.startedAt) return;
        machine.startedAt = Date.now();
        SaveSystem.save();
        this.renderFarm();
    },
    claimMachine() {
        const d = SaveSystem.currentData;
        const machine = d.farm.machine;
        if (!machine.owned || !machine.startedAt || Date.now() - machine.startedAt < MACHINE_CYCLE_MS) return;
        const reward = MACHINE_REWARD_PER_LEVEL * machine.level;
        d.resources.gold += reward;
        machine.startedAt = 0;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('領取製造金幣 +' + reward);
    },
    upgradeMachine() {
        const d = SaveSystem.currentData;
        const machine = d.farm.machine;
        const cost = machine.level * MACHINE_UPGRADE_COST;
        if (!machine.owned || machine.level >= 100 || d.resources.plantCoins < cost) return;
        d.resources.plantCoins -= cost;
        machine.level++;
        SaveSystem.save();
        this.renderLobby();
    },
    buyMachine() {
        const d = SaveSystem.currentData;
        const machine = d.farm.machine;
        if (machine.owned || d.resources.plantCoins < MACHINE_PURCHASE_COST) return;
        d.resources.plantCoins -= MACHINE_PURCHASE_COST;
        machine.owned = true;
        machine.level = 1;
        SaveSystem.save();
        this.renderLobby();
        this.showAlert('已購買金幣製造機');
    },
    drawSkinCollection() {
        const container = document.getElementById('skin-collection');
        if (!container) return;
        const d = SaveSystem.currentData;
        const fragments = d.skinFragments.common || 0;
        const fragmentCount = document.getElementById('skin-fragment-count');
        if (fragmentCount) fragmentCount.textContent = '共用造型碎片 ' + fragments + '/' + SKIN_FRAGMENT_COST;
        container.innerHTML = '';
        Object.entries(PLAYER_SKINS).forEach(([id, cfg]) => {
            const unlocked = id === 'default' || !!d.skinsUnlocked[id];
            const active = d.skin === id;
            const card = document.createElement('div');
            card.className = 'skin-card';
            const img = document.createElement('img');
            img.src = cfg.img || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="100"><rect width="120" height="100" fill="#001f2f"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#00d2ff" font-size="14">' + encodeURIComponent(cfg.name) + '</text></svg>';
            img.alt = cfg.name;
            card.appendChild(img);
            const title = document.createElement('div');
            title.textContent = cfg.name + (active ? ' (已選中)' : '');
            title.style.marginTop = '8px';
            title.style.fontSize = '0.95rem';
            title.style.color = active ? '#00ffcc' : '#fff';
            card.appendChild(title);
            const status = document.createElement('div');
            status.className = 'status';
            status.textContent = unlocked ? (id === 'default' ? '預設造型' : '已解鎖') : ('共用碎片 ' + fragments + '/' + SKIN_FRAGMENT_COST);
            card.appendChild(status);
            const btn = document.createElement('button');
            btn.className = 'main-btn small';
            btn.textContent = unlocked ? '選擇' : fragments >= SKIN_FRAGMENT_COST ? '兌換此造型' : '碎片不足';
            btn.disabled = !unlocked && fragments < SKIN_FRAGMENT_COST;
            btn.style.marginTop = '6px';
            btn.onclick = () => unlocked ? this.selectSkin(id) : this.exchangeSkinFragments(id);
            card.appendChild(btn);
            container.appendChild(card);
        });
    },
    exchangeSkinFragments(id) {
        const d = SaveSystem.currentData;
        if (!PLAYER_SKINS[id] || id === 'default' || d.skinsUnlocked[id]) return;
        if (d.skinFragments.common < SKIN_FRAGMENT_COST) {
            this.showAlert('共用造型碎片不足，集滿 ' + SKIN_FRAGMENT_COST + ' 片即可兌換。');
            return;
        }
        d.skinFragments.common -= SKIN_FRAGMENT_COST;
        d.skinsUnlocked[id] = true;
        SaveSystem.save();
        this.drawSkinCollection();
        this.renderLobby();
        this.showAlert('已使用 ' + SKIN_FRAGMENT_COST + ' 片兌換 ' + PLAYER_SKINS[id].name + '，可到造型卡片選擇使用。');
    },
    drawSkin(drawCount = 1) {
        const d = SaveSystem.currentData;
        const count = drawCount === 10 ? 10 : 1;
        const unit = BALANCE.skinDrawCost;
        const cost = count * unit;
        if (d.resources.gold < cost) {
            this.showAlert('金幣不足，無法抽碎片。');
            return;
        }
        const lockedSkins = Object.entries(d.skinsUnlocked).filter(([id, unlocked]) => !unlocked).map(([id]) => id);
        if (!lockedSkins.length) {
            this.showAlert('所有造型已解鎖，無需再抽碎片。');
            return;
        }
        d.resources.gold -= cost;
        const msgEl = document.getElementById('skin-lottery-msg');
        try {
            const ol = document.getElementById('lottery-overlay');
            if (ol) {
                ol.setAttribute('aria-hidden','false');
                ol.innerHTML = '<div class="panel"><h3>抽獎中...</h3><div style="height:120px;"><svg width="80" height="80" viewBox="0 0 24 24" style="margin:12px auto;display:block;"><circle cx="12" cy="12" r="10" stroke="#ffd54f" stroke-width="3" fill="none" stroke-linecap="round"><animate attributeName="stroke-dasharray" values="1 150;100 50;1 150" dur="1.2s" repeatCount="indefinite"/></circle></svg></div></div>';
                ol.classList.add('show');
            }
        } catch (e) {}
        const pity = d.skinLottery = d.skinLottery || { drawsSinceLastFragment: 0 };
        let fragmentsWon = 0;
        for (let i = 0; i < count; i++) {
            const guaranteed = (pity.drawsSinceLastFragment || 0) >= (SKIN_LOTTERY.pityDraws - 1);
            const gotFragment = guaranteed || Math.random() < SKIN_LOTTERY.baseChance;
            if (gotFragment) {
                fragmentsWon++;
                d.skinFragments.common += 1;
                pity.drawsSinceLastFragment = 0;
            } else {
                pity.drawsSinceLastFragment = (pity.drawsSinceLastFragment || 0) + 1;
            }
        }
        const fragmentCount = d.skinFragments.common;
        const pityRemaining = SKIN_LOTTERY.pityDraws - pity.drawsSinceLastFragment;
        const msg = fragmentsWon
            ? (count === 10 ? '十連抽' : '單抽') + '獲得共用造型碎片 ' + fragmentsWon + ' 片，目前 ' + fragmentCount + '/' + SKIN_FRAGMENT_COST + (fragmentCount >= SKIN_FRAGMENT_COST ? '，可自選兌換造型' : '') + '。'
            : (count === 10 ? '十連抽' : '單抽') + '未抽到碎片，下次保底還需 ' + pityRemaining + ' 抽。';
        if (fragmentsWon) {
            this.spawnParticles(window.innerWidth / 2, window.innerHeight / 2 - 80, '#ffd54f', 36 + fragmentsWon * 8, 4);
            this.shake(12, 0.45);
        }
        SaveSystem.save();
        this.drawSkinCollection();
        if (msgEl) msgEl.textContent = msg + (fragmentsWon ? ' 保底還需 ' + pityRemaining + ' 抽。' : '');
        try {
            const ol = document.getElementById('lottery-overlay');
            if (ol) {
                ol.innerHTML = fragmentsWon
                    ? '<div class="panel"><h3>' + (count === 10 ? '十連抽結果' : '抽獎結果') + '</h3><div style="font-size:72px;">🧩</div><div style="color:#fff;margin-top:8px;">獲得共用造型碎片 ' + fragmentsWon + ' 片</div><div style="color:#ffd54f;margin-top:6px;">目前 ' + fragmentCount + '/' + SKIN_FRAGMENT_COST + ' · 保底還需 ' + pityRemaining + ' 抽</div></div>'
                    : '<div class="panel"><h3>' + (count === 10 ? '十連抽結果' : '抽獎結果') + '</h3><div style="color:#ddd;margin-top:6px;">沒有抽到碎片，保底還需 ' + pityRemaining + ' 抽</div></div>';
                setTimeout(() => { ol.classList.remove('show'); ol.setAttribute('aria-hidden','true'); }, fragmentsWon ? 1600 : 1000);
            }
        } catch (e) {}
        this.showAlert(msg);
        this.renderLobby();
    },
    startTestBattle() {
        const targetEl = document.querySelector('input[name="test-target"]:checked');
        const stageSelect = document.getElementById('test-stage-select');
        const goldInput = document.getElementById('test-gold-input');
        const skinSelect = document.getElementById('test-skin-select');
        if (!targetEl || !stageSelect || !goldInput || !skinSelect) return;
        this.testSettings.enemyTarget = targetEl.value;
        this.testSettings.selectedStage = Math.max(1, Math.min(MAX_STAGES, parseInt(stageSelect.value, 10) || 1));
        this.testSettings.customGold = Math.max(0, parseInt(goldInput.value, 10) || 0);
        this.testSettings.selectedSkin = skinSelect.value || 'default';
        this.testSettings.selectedActives = Array.from(document.querySelectorAll('#test-active-list input:checked')).map(input => input.value);
        SaveSystem.currentData.resources.gold = this.testSettings.customGold;
        SaveSystem.currentData.skin = this.testSettings.selectedSkin;
        SaveSystem.save();
        this.closeTestMode();
        this.renderLobby();
        this.startBattle(this.testSettings.selectedStage, { fromTest: true });
    },
    selectSkin(id) {
        if (id !== 'default' && !SaveSystem.currentData.skinsUnlocked[id]) {
            this.showAlert('尚未解鎖 ' + PLAYER_SKINS[id].name + '。');
            return;
        }
        SaveSystem.currentData.skin = id;
        SaveSystem.save();
        if (this.player) this.player.skin = id;
        this.renderLobby();
        this.showAlert('已切換造型：' + PLAYER_SKINS[id].name);
    },
    populateTestPanel() {
        const activeBox = document.getElementById('test-active-list');
        const stageSelect = document.getElementById('test-stage-select');
        if (!activeBox || !stageSelect) return;
        stageSelect.innerHTML = '';
        for (let i = 1; i <= MAX_STAGES; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = STAGES[i - 1].name;
            stageSelect.appendChild(opt);
        }
        activeBox.innerHTML = '';
        Object.entries(ACTIVE_SKILLS).forEach(([id, cfg]) => {
            const label = document.createElement('label');
            label.innerHTML = '<input type="checkbox" value="' + id + '"> ' + cfg.name;
            activeBox.appendChild(label);
        });
        this.refreshTestPanel();
        try {
            const s = SaveSystem.currentData.joystickSettings || { baseX:90, baseYOffset:100, maxRadius:90 };
            const bx = document.getElementById('joy-base-x');
            const by = document.getElementById('joy-base-yoffset');
            const jr = document.getElementById('joy-radius');
            if (bx) bx.value = s.baseX || 90;
            if (by) by.value = s.baseYOffset || 100;
            if (jr) jr.value = s.maxRadius || 90;
        } catch (e) {}
    },
    refreshTestPanel() {
        const settings = this.testSettings;
        const target = document.querySelector('input[name="test-target"][value="' + settings.enemyTarget + '"]');
        if (target) target.checked = true;
        const goldInput = document.getElementById('test-gold-input');
        if (goldInput) goldInput.value = settings.customGold || 0;
        const stageSelect = document.getElementById('test-stage-select');
        const skinSelect = document.getElementById('test-skin-select');
        if (stageSelect) stageSelect.value = settings.selectedStage || 1;
        if (skinSelect) skinSelect.value = settings.selectedSkin || 'default';
        document.querySelectorAll('#test-active-list input').forEach(input => { input.checked = settings.selectedActives.includes(input.value); });
    },
    toggleTestMode() {
        if (this.testMode) this.closeTestMode(); else this.openTestMode();
    },
    openTestMode() {
        this.testMode = true;
        this._testModePaused = this.paused;
        this.paused = true;
        const panel = document.getElementById('test-panel');
        if (panel) panel.classList.add('show');
        this.populateTestPanel();
    },
    closeTestMode() {
        this.testMode = false;
        const panel = document.getElementById('test-panel');
        if (panel) panel.classList.remove('show');
        this.paused = this._testModePaused;
    },
    applyTestSettings() {
        const targetEl = document.querySelector('input[name="test-target"]:checked');
        const stageSelect = document.getElementById('test-stage-select');
        const goldInput = document.getElementById('test-gold-input');
        const skinSelect = document.getElementById('test-skin-select');
        if (!targetEl || !stageSelect || !goldInput || !skinSelect) return;
        this.testSettings.enemyTarget = targetEl.value;
        this.testSettings.selectedStage = Math.max(1, Math.min(MAX_STAGES, parseInt(stageSelect.value, 10) || 1));
        this.testSettings.customGold = Math.max(0, parseInt(goldInput.value, 10) || 0);
        this.testSettings.selectedSkin = skinSelect.value || 'default';
        this.testSettings.selectedActives = Array.from(document.querySelectorAll('#test-active-list input:checked')).map(input => input.value);
        SaveSystem.currentData.resources.gold = this.testSettings.customGold;
        SaveSystem.currentData.skin = this.testSettings.selectedSkin;
        SaveSystem.save();
        if (this.player) this.player.skin = this.testSettings.selectedSkin;
        BattleSkills.reset();
        this.testSettings.selectedActives.forEach(id => BattleSkills.addActive(id));
        this.shootTimers = {};
        this.renderLobby();
        this.showAlert('測試設定已套用');
    },
    saveJoystickSettings() {
        try {
            const bx = Math.max(0, parseInt((document.getElementById('joy-base-x') || {}).value || 90, 10));
            const by = Math.max(0, parseInt((document.getElementById('joy-base-yoffset') || {}).value || 100, 10));
            const jr = Math.max(10, parseInt((document.getElementById('joy-radius') || {}).value || 90, 10));
            SaveSystem.currentData.joystickSettings = { baseX: bx, baseYOffset: by, maxRadius: jr };
            SaveSystem.save();
            if (Input && Input.init) {
                try {
                    const s = SaveSystem.currentData.joystickSettings || {};
                    Input.joystick.baseX = s.baseX || 90;
                    Input.joystick.baseY = window.innerHeight - (s.baseYOffset || 100);
                    Input.joystick.maxRadius = s.maxRadius || 90;
                } catch (e) {}
            }
            this.showAlert('搖桿設定已儲存');
        } catch (e) { this.showAlert('儲存失敗'); }
    },
    fillJoystickQuickSettings() {
        try {
            const s = SaveSystem.currentData.joystickSettings || {};
            document.getElementById('joy-base-x-quick').value = s.baseX != null ? s.baseX : 90;
            document.getElementById('joy-base-yoffset-quick').value = s.baseYOffset != null ? s.baseYOffset : 100;
            document.getElementById('joy-radius-quick').value = s.maxRadius != null ? s.maxRadius : 90;
            this.showAlert('已讀取目前搖桿設定');
        } catch (e) {
            this.showAlert('讀取失敗');
        }
    },
    selectAllTestSkills() {
        this.testSettings.selectedActives = Object.keys(ACTIVE_SKILLS);
        this.refreshTestPanel();
    },
    deselectAllTestSkills() {
        this.testSettings.selectedActives = [];
        this.refreshTestPanel();
    },
    async showSection(section) {
        if (section === 'rank' && !await window.raingodRequireAuth('排行榜')) return;
        const sections = ['talents', 'stages', 'pets', 'farm', 'multiplayer', 'rank'];
        sections.forEach(s => {
            const el = document.getElementById('section-' + s);
            if (el) el.style.display = s === section ? 'block' : 'none';
        });
        if (section === 'rank') {
            const nameInput = document.getElementById('player-name-input');
            if (nameInput) nameInput.value = SaveSystem.currentData.playerName || '';
            this.refreshLeaderboard();
        }
    },
    savePlayerName() {
        const input = document.getElementById('player-name-input');
        const name = sanitizePlayerName(input ? input.value : '');
        if (!name) {
            Leaderboard.setStatus('名稱不可空白（最多 12 字）');
            this.showAlert('請輸入名稱');
            return;
        }
        SaveSystem.currentData.playerName = name;
        SaveSystem.save();
        if (input) input.value = name;
        Leaderboard.upload().then(ok => {
            if (ok) this.refreshLeaderboard();
        });
        this.showAlert('名稱已儲存：' + name);
    },
    refreshLeaderboard() {
        Leaderboard.fetchList();
    },
    buyTalent(id, cost) {
        const d = SaveSystem.currentData;
        const caps = { ATK: 20, SPD: 10, REC: 10 };
        const currentLv = d.talents[id] || 0;
        if (caps[id] && currentLv >= caps[id]) {
            this.showAlert('此屬性已達最大等級');
            return;
        }
        if (d.resources.gold >= cost) {
            d.resources.gold -= cost;
            d.talents[id] = currentLv + 1;
            SaveSystem.save();
            this.renderLobby();
            const gains = { ATK:'武器傷害 +2', HP:'最大生命 +22', SPD:'移動速度 +0.4', REC:'每秒恢復 +1.2 生命' };
            this.showAlert(gains[id] + '（下場戰鬥生效）');
        } else {
            alert('金幣不足');
        }
    },
};

window.onload = () => GameEngine.init();
})();
