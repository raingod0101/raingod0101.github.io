
        // ============================================================
        // 雨神大亨 · 帝国征途 v5
        // 修正：載入不卡住 + 真實軍隊對打（緩慢消耗戰）
        // ============================================================
        const cvs = document.getElementById('c'), ctx = cvs.getContext('2d');
        const SAVE_KEY = 'raingod_tycoon_save_v4';
        const SAVE_KEY_GENERIC = 'raingod_save_raingod-tycoon';
        const GAME_ID = 'raingod-tycoon';

        // ---- 核心變數 ----
        let money = 2000, darkMatter = 0, frame = 0;
        let bestWave = 0;
        let minerLevel = 0, capacity = 4, techTier = 1;
        let playerDamageLevel = 0, turretDamageLevel = 0;
        let p = { x: 350, y: 350, r: 18, tx: 350, ty: 350, bag: [], atkRange: 220, cooldown: 0, facing: 0, walkCycle: 0 };
        let bots = [], items = [], floatTexts = [], particles = [], bullets = [];
        let turrets = [], enemies = [];
        let shakeTime = 0;
        let talents = { dmgLv: 0, spdLv: 0, armyLv: 0 };
        let wave = 1;
        let waveTimer = 20 * 60;
        let isWaveActive = false;
        let skillCd = [0, 0, 0];
        let isOverclocked = false, overclockTimer = 0;
        let quest = { type: 'kill', target: 20, current: 0, reward: 1500, desc: '擊殺 20 隻異形蟲' };
        let storageReady = false;

        // 工厂动画状态
        let factoryAnim = {};
        let forgeSparks = [];

        // 世界地圖
        let viewMode = 'base';
        const WORLD_W = 4800, WORLD_H = 3600;
        let camera = { x: WORLD_W/2, y: WORLD_H/2, zoom: 0.55 };
        let commander = { x: 800, y: 1650, facing: 0, walkCycle: 0, marching: false };
        let keys = {};
        let joystick = { active: false, baseX: 0, baseY: 0, knobX: 0, knobY: 0, dx: 0, dy: 0, pointerId: null };
        let tapStart = null;
        let selectedTerritoryId = null;
        let army = { soldiers: 0, tanks: 0 };

        // 軍隊行軍 + 戰鬥狀態
        let armyMarch = {
            active: false,
            progress: 0,
            phase: 'idle', // 'march' | 'fight' | 'done'
            from: null, to: null,
            soldiers: 0, tanks: 0,
            targetId: null,
            enemyHp: 0, enemyHpMax: 0,
            playerHp: 0, playerHpMax: 0,
            tickTimer: 0
        };
        let battleEffects = [];

        // 領地定義
        const TERRITORY_DEFS = [
            { id: 0, name: '雨神基地', x: 600, y: 1500, w: 400, h: 300, garrison: 0, income: 0, type: 'capital' },
            { id: 1, name: '廢棄礦場', x: 1300, y: 900, w: 340, h: 260, garrison: 15, income: 600, type: 'resource' },
            { id: 2, name: '晶片工業區', x: 1800, y: 1500, w: 360, h: 280, garrison: 40, income: 1500, type: 'resource' },
            { id: 3, name: '核能電廠', x: 2300, y: 800, w: 340, h: 280, garrison: 90, income: 3200, type: 'resource' },
            { id: 4, name: '量子實驗室', x: 2700, y: 1600, w: 380, h: 300, garrison: 160, income: 7000, type: 'resource' },
            { id: 5, name: '反物質坑', x: 3200, y: 1000, w: 340, h: 280, garrison: 260, income: 15000, type: 'resource' },
            { id: 6, name: '異星殖民地', x: 3600, y: 1800, w: 400, h: 320, garrison: 420, income: 32000, type: 'military' },
            { id: 7, name: '軌道電梯', x: 4100, y: 900, w: 340, h: 280, garrison: 650, income: 60000, type: 'military' },
            { id: 8, name: '深空要塞', x: 4200, y: 2200, w: 380, h: 320, garrison: 900, income: 120000, type: 'military' },
            { id: 9, name: '暗物質神殿', x: 2400, y: 2600, w: 400, h: 320, garrison: 1300, income: 220000, type: 'military' },
            { id: 10, name: '終極兵器庫', x: 3400, y: 2800, w: 380, h: 300, garrison: 1800, income: 400000, type: 'military' },
            { id: 11, name: '星際首都', x: 4200, y: 3000, w: 420, h: 340, garrison: 2600, income: 800000, type: 'military' },
        ];

        let worldMap = [];
        function initWorldMap() {
            worldMap = TERRITORY_DEFS.map(def => ({
                ...def,
                owner: def.type === 'capital' ? 'player' : (def.garrison >= 200 ? 'enemy' : 'neutral'),
                garrisonCurrent: def.garrison,
                conqueredAt: 0,
            }));
        }
        initWorldMap();

        function isTouchDevice() {
            return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        }

        // ============================================================
        // 存檔 / 讀檔
        // ============================================================
        function saveGame() {
            if (!storageReady) return;
            try {
                const payload = {
                    money, darkMatter, minerLevel, capacity, techTier, playerDamageLevel, turretDamageLevel,
                    player: p, bots, turrets, talents, wave, bestWave, waveTimer,
                    isWaveActive, items, enemies, skillCd, isOverclocked, overclockTimer, quest,
                    army, worldMap, viewMode, commander
                };
                const raw = JSON.stringify(payload);
                localStorage.setItem(SAVE_KEY, raw);
                try { localStorage.setItem(SAVE_KEY_GENERIC, raw); } catch (e) {}
                try {
                    if (typeof window.raingodSave === 'function') {
                        window.raingodSave(GAME_ID, payload).catch(() => {});
                    }
                } catch (e) {}
            } catch (e) {}
        }

        function loadGame(data) {
            if (!data || typeof data !== 'object' || Array.isArray(data)) return;
            const finiteOr = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
            const objectArray = value => Array.isArray(value) ? value.filter(item => item && typeof item === 'object').slice(0, 1000) : [];
            money = Math.max(0, finiteOr(data.money, money));
            darkMatter = Math.max(0, finiteOr(data.darkMatter, darkMatter));
            minerLevel = Math.max(0, Math.floor(finiteOr(data.minerLevel, minerLevel)));
            capacity = Math.max(1, Math.floor(finiteOr(data.capacity, capacity)));
            techTier = Math.min(5, Math.max(1, Math.floor(finiteOr(data.techTier, techTier))));
            playerDamageLevel = Math.max(0, Math.floor(finiteOr(data.playerDamageLevel, playerDamageLevel)));
            turretDamageLevel = Math.max(0, Math.floor(finiteOr(data.turretDamageLevel, turretDamageLevel)));
            if (data.player && typeof data.player === 'object') Object.assign(p, data.player);
            bots = objectArray(data.bots);
            turrets = objectArray(data.turrets);
            if (data.talents && typeof data.talents === 'object') talents = { ...talents, ...data.talents };
            wave = Math.max(1, Math.floor(finiteOr(data.wave, wave)));
            bestWave = Math.max(0, Math.floor(finiteOr(data.bestWave, bestWave)));
            waveTimer = Math.max(0, Math.floor(finiteOr(data.waveTimer, waveTimer)));
            const wasWaveActive = data.isWaveActive === true;
            isWaveActive = false;
            items = objectArray(data.items);
            enemies = wasWaveActive ? [] : objectArray(data.enemies);
            if (wasWaveActive) waveTimer = 0;
            if (Array.isArray(data.skillCd)) {
                for (let i = 0; i < Math.min(3, data.skillCd.length); i++) skillCd[i] = Math.max(0, finiteOr(data.skillCd[i], 0));
            }
            isOverclocked = data.isOverclocked === true;
            overclockTimer = Math.max(0, Math.floor(finiteOr(data.overclockTimer, overclockTimer)));
            if (data.quest && typeof data.quest === 'object') quest = { ...quest, ...data.quest };
            if (data.army && typeof data.army === 'object') {
                army.soldiers = Math.max(0, Math.floor(finiteOr(data.army.soldiers, 0)));
                army.tanks = Math.max(0, Math.floor(finiteOr(data.army.tanks, 0)));
            }
            if (Array.isArray(data.worldMap)) {
                data.worldMap.forEach(saved => {
                    const t = worldMap.find(w => w.id === saved.id);
                    if (t) {
                        if (saved.owner) t.owner = saved.owner;
                        if (Number.isFinite(Number(saved.garrisonCurrent))) t.garrisonCurrent = Math.max(0, Math.floor(Number(saved.garrisonCurrent)));
                    }
                });
            }
            if (data.commander && typeof data.commander === 'object') {
                commander.x = Math.max(20, Math.min(WORLD_W - 20, finiteOr(data.commander.x, commander.x)));
                commander.y = Math.max(20, Math.min(WORLD_H - 20, finiteOr(data.commander.y, commander.y)));
            }
            if (data.viewMode === 'world') viewMode = 'world';
            updateWorldUIVisibility();
        }

        // ============================================================
        // 排行榜
        // ============================================================
        async function openTycoonLeaderboard() {
            if (!await window.raingodRequireAuth('排行榜')) return;
            document.getElementById('tycoon-leaderboard').style.display = 'flex';
            await refreshTycoonLeaderboard();
        }
        function closeTycoonLeaderboard() {
            document.getElementById('tycoon-leaderboard').style.display = 'none';
        }
        async function refreshTycoonLeaderboard() {
            const status = document.getElementById('tycoon-leaderboard-status');
            const list = document.getElementById('tycoon-leaderboard-list');
            if (!await window.raingodRequireAuth('排行榜')) return;
            const uid = window.raingodCurrentUser.uid;
            status.textContent = '排行榜載入中…';
            try {
                const response = await fetch(`${TYCOON_LEADERBOARD_URL}.json`);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                if (window.raingodCurrentUser?.uid !== uid) return;
                const rows = await response.json() || {};
                const entries = Object.entries(rows)
                    .filter(([, row]) => row && Number.isFinite(Number(row.wave)))
                    .sort((a, b) => Number(b[1].wave) - Number(a[1].wave) || Number(b[1].darkMatter || 0) - Number(a[1].darkMatter || 0))
                    .slice(0, 50);
                list.replaceChildren();
                entries.forEach(([entryUid, row], index) => {
                    const item = document.createElement('div');
                    item.className = 'tycoon-leaderboard-row';
                    const name = document.createElement('span');
                    name.textContent = `${index + 1}. ${row.name || '玩家'}${entryUid === uid ? '（你）' : ''}`;
                    const value = document.createElement('strong');
                    value.textContent = `第 ${Math.floor(Number(row.wave))} 波 · ${Math.floor(Number(row.darkMatter) || 0)} 暗物質`;
                    item.append(name, value);
                    list.appendChild(item);
                });
                status.textContent = entries.length ? `已載入 ${entries.length} 位玩家，依最高波數排序。` : '目前還沒有排行榜資料。';
            } catch (error) {
                console.error('載入雨神大亨排行榜失敗：', error);
                status.textContent = '排行榜載入失敗，請稍後重試。';
            }
        }
        async function uploadTycoonLeaderboardScore() {
            const currentUser = window.raingodCurrentUser;
            if (!currentUser) return;
            const uid = currentUser.uid;
            const scoreWave = Math.max(1, bestWave, wave);
            const scoreDarkMatter = Math.floor(darkMatter);
            const entryUrl = `${TYCOON_LEADERBOARD_URL}/${encodeURIComponent(uid)}.json`;
            try {
                const previousResponse = await fetch(entryUrl);
                if (!previousResponse.ok) throw new Error(`HTTP ${previousResponse.status}`);
                const previous = await previousResponse.json();
                if (window.raingodCurrentUser?.uid !== uid) return;
                if (previous && (Number(previous.wave) > scoreWave ||
                    (Number(previous.wave) === scoreWave && Number(previous.darkMatter) >= scoreDarkMatter))) return;
                const response = await fetch(entryUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        name: currentUser.displayName || (currentUser.email ? currentUser.email.split('@')[0] : '雨神玩家'),
                        wave: scoreWave,
                        darkMatter: scoreDarkMatter,
                        updatedAt: Date.now()
                    })
                });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
            } catch (error) {
                console.error('上傳雨神大亨排行榜失敗：', error);
            }
        }

        // ============================================================
        // 初始化（不卡住版本）
        // ============================================================
        function withTimeout(promise, ms, label) {
            return Promise.race([
                promise,
                new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timeout`)), ms))
            ]);
        }

        async function initializeTycoon() {
            // 離線模式先讀 localStorage，讓遊戲立刻可玩
            storageReady = true;
            try {
                const raw = localStorage.getItem(SAVE_KEY_GENERIC) || localStorage.getItem(SAVE_KEY);
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') loadGame(parsed);
                }
            } catch (e) {}
            updateWorldUIVisibility();
            syncUI();

            // Firebase 背景初始化，失敗不影響遊戲
            try {
                if (window.raingodFirebaseReady) await withTimeout(window.raingodFirebaseReady, 5000, 'Firebase');
                if (window.raingodAuthReady) await withTimeout(window.raingodAuthReady, 5000, 'Auth');
                if (typeof window.raingodInitGame === 'function') {
                    try {
                        const accountData = await window.raingodInitGame(GAME_ID, null, () => {});
                        if (accountData && typeof accountData === 'object') loadGame(accountData);
                    } catch (err) {}
                }
                if (typeof window.raingodBindStorage === 'function') {
                    await withTimeout(window.raingodBindStorage('raingod-tycoon', [SAVE_KEY], { [SAVE_KEY]: null }, data => {
                        if (data && data[SAVE_KEY]) loadGame(data[SAVE_KEY]);
                        saveGame();
                        if (window.raingodCurrentUser) uploadTycoonLeaderboardScore();
                    }), 8000, 'BindStorage');
                }
                if (typeof window.raingodOnAuthStateChanged === 'function') {
                    window.raingodOnAuthStateChanged(currentUser => {
                        const button = document.getElementById('tycoon-leaderboard-button');
                        button.textContent = currentUser ? '🏆 排行榜' : '🏆 登入後查看排行榜';
                        if (currentUser) uploadTycoonLeaderboardScore();
                        else {
                            closeTycoonLeaderboard();
                            document.getElementById('tycoon-leaderboard-list').replaceChildren();
                            document.getElementById('tycoon-leaderboard-status').textContent = '請登入帳號後查看。';
                        }
                    });
                }
            } catch (err) {
                console.warn('Firebase 初始化失敗，以離線模式繼續遊戲：', err);
                document.getElementById('tycoon-leaderboard-button').textContent = '🏆 登入後查看排行榜';
            }
        }

        // ============================================================
        // 物品 / 原有基地邏輯
        // ============================================================
        const ITEMS = {
            RAW:     { name: '原礦', val: 10, color: '#ef4444' },
            STEEL:   { name: '鋼鐵', val: 50, color: '#f59e0b' },
            SILICON: { name: '矽晶', val: 80, color: '#0284c7' },
            CHIP:    { name: '晶片', val: 300, color: '#3b82f6' },
            URANIUM: { name: '鈾礦', val: 500, color: '#10b981' },
            BATTERY: { name: '核電池', val: 2500, color: '#22c55e' },
            CORE:    { name: '量子核心', val: 12000, color: '#a855f7' },
            ANTIM:   { name: '反物質', val: 100000, color: '#e11d48' }
        };

        function switchTab(tabId) {
            document.querySelectorAll('.panel > div[id^="tab-"]').forEach(d => d.style.display = 'none');
            document.getElementById(tabId).style.display = 'block';
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            if (event) event.target.classList.add('active');
        }

        function toggleTycoonShop(open = !document.getElementById('ui').classList.contains('shop-open')) {
            const ui = document.getElementById('ui');
            const toggle = document.querySelector('.mobile-shop-toggle');
            ui.classList.toggle('shop-open', open);
            toggle.setAttribute('aria-expanded', String(open));
        }

        function getBuildings() {
            const startX = 80, startY = 100;
            const b = {
                extractor: { x: startX, y: startY, w: 130, h: 85, color: '#ef4444', label: '🔴 採礦塔', type: 'extractor' },
                smelter:   { x: startX, y: startY + 140, w: 130, h: 85, color: '#f59e0b', label: '🟠 鋼鐵廠', type: 'smelter' },
                hub:       { x: cvs.width - 220, y: cvs.height - 180, w: 180, h: 120, color: '#38bdf8', label: '💎 總部基地', type: 'hub' }
            };
            if (techTier >= 2) b.chipFab = { x: startX, y: startY + 280, w: 130, h: 85, color: '#3b82f6', label: '🔵 晶片廠', type: 'chipFab' };
            if (techTier >= 3) b.nukeFab = { x: startX, y: startY + 420, w: 130, h: 85, color: '#22c55e', label: '🟢 鈾能廠', type: 'nukeFab' };
            if (techTier >= 4) b.qFab    = { x: startX, y: startY + 560, w: 130, h: 85, color: '#a855f7', label: '🟣 量子合成', type: 'qFab' };
            if (techTier >= 5) b.antiFab = { x: startX, y: startY + 700, w: 130, h: 85, color: '#e11d48', label: '💎 反物質所', type: 'antiFab' };
            return b;
        }

        const resize = () => { cvs.width = window.innerWidth; cvs.height = window.innerHeight; };
        window.addEventListener('resize', resize); resize();

        // ---- 輸入 ----
        window.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();
            if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
                keys[k] = true;
                if (viewMode === 'world') e.preventDefault();
            }
        });
        window.addEventListener('keyup', e => {
            const k = e.key.toLowerCase();
            if (['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)) {
                keys[k] = false;
            }
        });

        cvs.addEventListener('pointermove', e => {
            if (viewMode === 'base' && e.pointerType === 'touch') { p.tx = e.clientX; p.ty = e.clientY; }
        });
        window.addEventListener('pointermove', e => {
            if (viewMode === 'base') {
                if (e.pointerType !== 'touch') { p.tx = e.clientX; p.ty = e.clientY; }
            } else {
                handleWorldPointerMove(e);
            }
        });
        cvs.addEventListener('pointerdown', e => {
            if (viewMode === 'base') {
                if (e.pointerType === 'touch') { p.tx = e.clientX; p.ty = e.clientY; }
            } else {
                handleWorldPointerDown(e);
            }
        });
        window.addEventListener('pointerup', e => {
            if (viewMode === 'world') handleWorldPointerUp(e);
        });

        function triggerShake(duration = 10) { shakeTime = duration; }
        function spawnFloatText(x, y, text, color='#4ade80') { floatTexts.push({ x, y, text, color, alpha: 1 }); }
        function spawnParticles(x, y, color, count=6) {
            for(let i=0; i<count; i++) {
                particles.push({ x, y, vx: (Math.random()-0.5)*8, vy: (Math.random()-0.5)*8, size: Math.random()*5+2, color, alpha: 1 });
            }
        }

        // ---- 技能 ----
        function useSkill(num) {
            if (skillCd[num-1] > 0) return;
            if (num === 1) {
                isOverclocked = true; overclockTimer = 600; skillCd[0] = 1800;
                spawnFloatText(p.x, p.y, "⚡ 系統極速超頻！", "#f59e0b");
            } else if (num === 2) {
                enemies.forEach(e => { e.hp -= 300 + wave * 60; spawnParticles(e.x, e.y, '#e11d48', 12); });
                triggerShake(25); skillCd[1] = 2400;
                spawnFloatText(cvs.width/2, cvs.height/2, "💥 軌道離子砲全螢幕打擊！", "#e11d48");
            } else if (num === 3) {
                const power = getArmyPower();
                if (power > 0) {
                    enemies.forEach(e => {
                        e.hp -= power * 0.8;
                        spawnParticles(e.x, e.y, '#f59e0b', 10);
                    });
                    triggerShake(15);
                    skillCd[2] = 3600;
                    spawnFloatText(p.x, p.y - 30, `🪖 軍隊衝鋒！戰力 ${Math.floor(power)}`, '#f59e0b');
                    for (let i = 0; i < Math.min(8, army.soldiers + army.tanks); i++) {
                        battleEffects.push({
                            type: 'soldierCharge',
                            x: p.x + (Math.random()-0.5)*100,
                            y: p.y + (Math.random()-0.5)*100,
                            vx: 8 + Math.random()*4,
                            vy: (Math.random()-0.5)*2,
                            life: 60, maxLife: 60
                        });
                    }
                } else {
                    spawnFloatText(p.x, p.y - 30, "❌ 沒有軍隊！請先招募士兵", '#ef4444');
                }
            }
        }

        // ---- 建造 / 升級 ----
        function buildTurret(type) {
            const costs = { gatling: 1000, laser: 5000, mortar: 20000, frost: 50000, blackhole: 200000 };
            let cost = costs[type] * Math.pow(1.3, turrets.filter(t=>t.type===type).length);
            if (money >= cost) {
                money -= cost;
                let tx = 260 + Math.random() * 200;
                let ty = 100 + Math.random() * (cvs.height - 220);
                turrets.push({ x: tx, y: ty, type, cd: 0, range: type==='laser'?350:(type==='blackhole'?280:240), angle: 0 });
                spawnFloatText(tx, ty, `防禦塔建造完成！`, '#38bdf8');
            }
        }
        function triggerNextWave() { if (!isWaveActive) { waveTimer = 0; saveGame(); } }

        function spawnWave() {
            isWaveActive = true;
            bestWave = Math.max(bestWave, wave);
            saveGame();
            uploadTycoonLeaderboardScore();
            let count = 8 + wave * 4;
            let isBossWave = (wave % 5 === 0);
            for (let i = 0; i < count; i++) {
                setTimeout(() => {
                    let type = 'normal';
                    let rand = Math.random();
                    if (rand < 0.25) type = 'runner';
                    else if (rand < 0.45) type = 'tank';
                    else if (rand < 0.6) type = 'bomber';
                    if (isBossWave && i === count - 1) type = 'boss';
                    let hpMap = { normal: 50, runner: 30, tank: 180, bomber: 40, boss: 1800 + wave * 600 };
                    let spdMap = { normal: 1.5, runner: 2.8, tank: 0.8, bomber: 2.0, boss: 0.5 };
                    enemies.push({
                        x: cvs.width + 40,
                        y: 80 + Math.random() * (cvs.height - 160),
                        type,
                        hp: (hpMap[type] + wave * 35),
                        maxHp: (hpMap[type] + wave * 35),
                        speed: spdMap[type],
                        reward: (type === 'boss' ? 3500 : 80) + wave * 30,
                        anim: Math.random() * Math.PI * 2
                    });
                }, i * 400);
            }
        }

        function buyBot() {
            let cost = Math.floor(500 * Math.pow(1.3, bots.length));
            if(money >= cost) { money -= cost; bots.push({ x: 120, y: cvs.height/2, bag: [], speed: 4.5, walkCycle: 0, facing: 0 }); saveGame(); }
        }
        function upgrade(type) {
            if (type === 'miner') {
                let cost = Math.floor(1000 * Math.pow(1.5, minerLevel));
                if (money >= cost) { money -= cost; minerLevel++; saveGame(); }
            } else if (type === 'capacity') {
                let cost = Math.floor(1500 * (capacity / 2));
                if (money >= cost) { money -= cost; capacity += 2; saveGame(); }
            } else if (type === 'playerDamage') {
                let cost = Math.floor(1000 * Math.pow(1.6, playerDamageLevel));
                if (money >= cost) { money -= cost; playerDamageLevel++; saveGame(); }
            } else if (type === 'turretDamage') {
                let cost = Math.floor(1500 * Math.pow(1.6, turretDamageLevel));
                if (money >= cost) { money -= cost; turretDamageLevel++; saveGame(); }
            }
        }
        function buyTalent(type) {
            if (type === 'dmg' && darkMatter >= (talents.dmgLv + 1) * 5) {
                darkMatter -= (talents.dmgLv + 1) * 5; talents.dmgLv++;
            } else if (type === 'speed' && darkMatter >= (talents.spdLv + 1) * 5) {
                darkMatter -= (talents.spdLv + 1) * 5; talents.spdLv++;
            } else if (type === 'army' && darkMatter >= (talents.armyLv + 1) * 5) {
                darkMatter -= (talents.armyLv + 1) * 5; talents.armyLv++;
            }
            saveGame();
        }
        function unlockTier(tier) {
            const costs = { 2: 2500, 3: 25000, 4: 200000, 5: 2000000 };
            if (money >= costs[tier] && techTier === tier - 1) {
                money -= costs[tier]; techTier = tier; saveGame();
            }
        }
        function triggerRebirth() {
            let earnedDM = Math.floor(money / 100000);
            if (earnedDM > 0 || money >= 100000) {
                darkMatter += Math.max(1, earnedDM);
                money = 2000; minerLevel = 0; capacity = 4; techTier = 1;
                playerDamageLevel = 0; turretDamageLevel = 0;
                p.bag = []; bots = []; items = []; turrets = []; enemies = []; wave = 1;
                army.soldiers = 0; army.tanks = 0;
                initWorldMap();
                spawnFloatText(cvs.width/2, cvs.height/2, `🌌 暗物質量子轉生成功！`, '#c084fc');
                triggerShake(30);
                saveGame();
            }
        }

        function updateQuests(type, amount = 1) {
            if (quest.type === type) {
                quest.current += amount;
                if (quest.current >= quest.target) {
                    money += quest.reward;
                    spawnFloatText(cvs.width/2, 100, `🎉 完成任務！獲得 +$${quest.reward}`, '#f59e0b');
                    let targets = [30, 50, 100];
                    let t = targets[Math.floor(Math.random() * targets.length)];
                    quest = { type: 'kill', target: t, current: 0, reward: t * 120, desc: `擊殺 ${t} 隻異形蟲` };
                }
            }
        }

        // ============================================================
        // 軍隊系統
        // ============================================================
        function getArmyPower() {
            const mult = 1 + talents.armyLv * 0.3;
            return Math.floor((army.soldiers * 10 + army.tanks * 100) * mult);
        }

        function recruitSoldier() {
            const cost = Math.floor(800 * Math.pow(1.2, army.soldiers));
            if (money >= cost) {
                money -= cost;
                army.soldiers++;
                spawnFloatText(p.x, p.y - 20, `🪖 招募士兵 (總計 ${army.soldiers})`, '#f59e0b');
                saveGame();
            }
        }

        function recruitTank() {
            const cost = Math.floor(5000 * Math.pow(1.3, army.tanks));
            if (money >= cost) {
                money -= cost;
                army.tanks++;
                spawnFloatText(p.x, p.y - 20, `🚀 生產坦克 (總計 ${army.tanks})`, '#f59e0b');
                saveGame();
            }
        }

        // ============================================================
        // 視圖切換
        // ============================================================
        function updateWorldUIVisibility() {
            const worldUI = document.getElementById('world-ui');
            const baseUI = document.getElementById('ui');
            const viewToggle = document.getElementById('view-toggle');
            const lbBtn = document.getElementById('tycoon-leaderboard-button');
            if (viewMode === 'world') {
                worldUI.classList.add('active');
                baseUI.style.display = 'none';
                viewToggle.style.display = 'none';
                lbBtn.style.display = 'none';
            } else {
                worldUI.classList.remove('active');
                baseUI.style.display = 'block';
                viewToggle.style.display = 'block';
                lbBtn.style.display = 'block';
                closeTerritoryPanel();
            }
        }

        function switchView(mode) {
            viewMode = mode;
            updateWorldUIVisibility();
            if (mode === 'world') {
                const cap = worldMap.find(t => t.type === 'capital');
                if (cap && !armyMarch.active) { commander.x = cap.x + cap.w/2; commander.y = cap.y + cap.h/2; }
                camera.x = commander.x;
                camera.y = commander.y;
                refreshWorldHUD();
            }
            saveGame();
        }

        function centerOnCapital() {
            const cap = worldMap.find(t => t.type === 'capital');
            if (cap) {
                commander.x = cap.x + cap.w/2;
                commander.y = cap.y + cap.h/2;
            }
        }

        function zoomWorld(factor) {
            camera.zoom = Math.max(0.25, Math.min(1.6, camera.zoom * factor));
        }

        function worldToScreen(wx, wy) {
            return {
                x: (wx - camera.x) * camera.zoom + cvs.width/2,
                y: (wy - camera.y) * camera.zoom + cvs.height/2
            };
        }
        function screenToWorld(sx, sy) {
            return {
                x: (sx - cvs.width/2) / camera.zoom + camera.x,
                y: (sy - cvs.height/2) / camera.zoom + camera.y
            };
        }

        function getJoystickCenter() {
            return { x: cvs.width - 100, y: cvs.height - 100 };
        }

        function updateKnob(cx, cy) {
            const dx = cx - joystick.baseX;
            const dy = cy - joystick.baseY;
            const dist = Math.hypot(dx, dy);
            const maxDist = 55;
            const clamped = Math.min(dist, maxDist);
            const angle = Math.atan2(dy, dx);
            joystick.knobX = joystick.baseX + Math.cos(angle) * clamped;
            joystick.knobY = joystick.baseY + Math.sin(angle) * clamped;
            const norm = clamped / maxDist;
            joystick.dx = Math.cos(angle) * norm;
            joystick.dy = Math.sin(angle) * norm;
            if (dist < 5) { joystick.dx = 0; joystick.dy = 0; }
        }

        function handleWorldPointerDown(e) {
            if (e.pointerType === 'touch' && isTouchDevice()) {
                const jc = getJoystickCenter();
                if (Math.hypot(e.clientX - jc.x, e.clientY - jc.y) < 90) {
                    joystick.active = true;
                    joystick.pointerId = e.pointerId;
                    joystick.baseX = jc.x;
                    joystick.baseY = jc.y;
                    updateKnob(e.clientX, e.clientY);
                    return;
                }
            }
            tapStart = { x: e.clientX, y: e.clientY, moved: false };
        }

        function handleWorldPointerMove(e) {
            if (joystick.active && e.pointerId === joystick.pointerId) {
                updateKnob(e.clientX, e.clientY);
                return;
            }
            if (tapStart) {
                if (Math.hypot(e.clientX - tapStart.x, e.clientY - tapStart.y) > 12) tapStart.moved = true;
            }
        }

        function handleWorldPointerUp(e) {
            if (joystick.active && e.pointerId === joystick.pointerId) {
                joystick.active = false;
                joystick.dx = 0; joystick.dy = 0;
                joystick.pointerId = null;
                return;
            }
            if (tapStart && !tapStart.moved && !armyMarch.active) {
                const w = screenToWorld(e.clientX, e.clientY);
                const hit = worldMap.find(t =>
                    w.x >= t.x && w.x <= t.x + t.w && w.y >= t.y && w.y <= t.y + t.h
                );
                if (hit) {
                    selectedTerritoryId = hit.id;
                    showTerritoryPanel(hit);
                } else {
                    closeTerritoryPanel();
                }
            }
            tapStart = null;
        }

        function showTerritoryPanel(t) {
            const panel = document.getElementById('territory-panel');
            panel.classList.add('active');
            document.getElementById('terrName').textContent = `📍 ${t.name}`;
            const ownerText = t.owner === 'player' ? '🟢 已佔領' : (t.owner === 'enemy' ? '🔴 敵軍' : '⚪ 中立');
            document.getElementById('terrOwner').textContent = ownerText;
            document.getElementById('terrGarrison').textContent = t.garrisonCurrent + ' 守軍';
            document.getElementById('terrIncome').textContent = '$' + t.income.toLocaleString() + ' / 波';
            const bar = document.getElementById('terrBar');
            const ratio = t.owner === 'player' ? 100 : Math.min(100, (t.garrisonCurrent / 500) * 100);
            bar.style.width = ratio + '%';
            const attackBtn = document.getElementById('attackBtn');
            const attackCost = document.getElementById('attackCost');
            if (t.owner === 'player') {
                attackBtn.disabled = true;
                attackCost.textContent = '已佔領';
            } else if (t.type === 'capital') {
                attackBtn.disabled = true;
                attackCost.textContent = '無法攻擊';
            } else {
                attackBtn.disabled = false;
                attackCost.textContent = `需要 ${Math.ceil(t.garrisonCurrent * 1.2)} 戰力`;
            }
        }
        function closeTerritoryPanel() {
            document.getElementById('territory-panel').classList.remove('active');
            selectedTerritoryId = null;
        }

        // ============================================================
        // 攻击领地（真实对打：行军 → 交战 → 结束）
        // ============================================================
        function attackSelected() {
            if (selectedTerritoryId === null) return;
            if (armyMarch.active) return;
            const t = worldMap.find(x => x.id === selectedTerritoryId);
            if (!t || t.owner === 'player' || t.type === 'capital') return;
            const power = getArmyPower();
            const required = Math.ceil(t.garrisonCurrent * 1.2);
            if (power < required) {
                alert(`軍隊戰力不足！需要 ${required} 戰力，目前只有 ${power}。\n請先招募更多士兵或坦克。`);
                return;
            }
            // 進入行軍階段
            armyMarch.active = true;
            armyMarch.phase = 'march';
            armyMarch.progress = 0;
            armyMarch.from = { x: commander.x, y: commander.y };
            armyMarch.to = { x: t.x + t.w / 2, y: t.y + t.h / 2 };
            armyMarch.soldiers = army.soldiers;
            armyMarch.tanks = army.tanks;
            armyMarch.targetId = t.id;
            // 血量：士兵 10 HP、坦克 100 HP
            armyMarch.playerHpMax = army.soldiers * 10 + army.tanks * 100;
            armyMarch.playerHp = armyMarch.playerHpMax;
            // 敵方血量：守軍 × 20 HP
            armyMarch.enemyHpMax = t.garrisonCurrent * 20;
            armyMarch.enemyHp = armyMarch.enemyHpMax;
            armyMarch.tickTimer = 0;
            closeTerritoryPanel();

            for (let i = 0; i < Math.min(20, army.soldiers + army.tanks); i++) {
                battleEffects.push({
                    type: 'marchDust',
                    x: commander.x + (Math.random()-0.5)*40,
                    y: commander.y + (Math.random()-0.5)*40,
                    vx: 0, vy: 0,
                    life: 90, maxLife: 90,
                    size: 3 + Math.random()*4
                });
            }
        }

        function finishBattle(win) {
            const t = worldMap.find(x => x.id === armyMarch.targetId);
            if (!t) { armyMarch.active = false; armyMarch.phase = 'idle'; return; }

            if (win) {
                const hpRatio = armyMarch.playerHp / Math.max(1, armyMarch.playerHpMax);
                const keepSoldiers = Math.floor(armyMarch.soldiers * hpRatio);
                const keepTanks = Math.floor(armyMarch.tanks * hpRatio);
                army.soldiers = keepSoldiers;
                army.tanks = keepTanks;
                t.owner = 'player';
                t.garrisonCurrent = 0;
                t.conqueredAt = frame;
                showBattleText(`⚔️ 佔領 ${t.name}！`, '#fbbf24');
                triggerShake(20);

                const cx = cvs.width / 2, cy = cvs.height / 2;
                for (let i = 0; i < 30; i++) {
                    particles.push({
                        x: cx + (Math.random()-0.5)*300,
                        y: cy + (Math.random()-0.5)*200,
                        vx: (Math.random()-0.5)*12,
                        vy: (Math.random()-0.5)*12,
                        size: 3 + Math.random()*6,
                        color: Math.random() > 0.5 ? '#fbbf24' : '#22c55e',
                        alpha: 1
                    });
                }
            } else {
                army.soldiers = 0;
                army.tanks = 0;
                t.garrisonCurrent = Math.max(1, Math.floor(t.garrisonCurrent * 0.3));
                showBattleText(`💀 軍隊潰敗！`, '#ef4444');
                triggerShake(25);
            }
            refreshWorldHUD();
            saveGame();
            setTimeout(() => {
                armyMarch.active = false;
                armyMarch.phase = 'idle';
            }, 1200);
        }

        function showBattleText(text, color) {
            const overlay = document.getElementById('battle-overlay');
            overlay.classList.add('active');
            overlay.innerHTML = '';
            const flash = document.createElement('div');
            flash.className = 'battle-flash';
            overlay.appendChild(flash);
            const txt = document.createElement('div');
            txt.className = 'battle-text';
            txt.textContent = text;
            txt.style.color = color || '#fbbf24';
            overlay.appendChild(txt);
            setTimeout(() => {
                overlay.classList.remove('active');
                overlay.innerHTML = '';
            }, 1300);
        }

        function refreshWorldHUD() {
            const owned = worldMap.filter(t => t.owner === 'player').length;
            const total = worldMap.length;
            document.getElementById('wSoldiers').textContent = army.soldiers;
            document.getElementById('wTanks').textContent = army.tanks;
            document.getElementById('wPower').textContent = getArmyPower();
            document.getElementById('wOwned').textContent = owned;
            document.getElementById('wTotal').textContent = total;

            document.getElementById('territoryCount').textContent = owned;
            document.getElementById('territoryMax').textContent = total;
            document.getElementById('soldierCount').textContent = army.soldiers;
            document.getElementById('tankCount').textContent = army.tanks;
            document.getElementById('soldierCost').textContent = '$' + Math.floor(800 * Math.pow(1.2, army.soldiers)).toLocaleString();
            document.getElementById('tankCost').textContent = '$' + Math.floor(5000 * Math.pow(1.3, army.tanks)).toLocaleString();
            document.getElementById('armyPower').textContent = getArmyPower();
            const ownedNames = worldMap.filter(t => t.owner === 'player' && t.type !== 'capital').map(t => t.name);
            document.getElementById('ownedTerritories').textContent = ownedNames.length ? ownedNames.join('、') : '無';
        }

        // ============================================================
        // 基地更新
        // ============================================================
        function updateBase() {
            const b = getBuildings();
            p.x += (p.tx - p.x) * 0.18; p.y += (p.ty - p.y) * 0.18;

            const moveDx = p.tx - p.x, moveDy = p.ty - p.y;
            if (Math.hypot(moveDx, moveDy) > 3) {
                p.facing = Math.atan2(moveDy, moveDx);
                p.walkCycle += 0.3;
            } else {
                p.walkCycle += 0.06;
            }

            updateFactoryAnim();

            if (!isWaveActive) {
                waveTimer--;
                if (waveTimer <= 0) spawnWave();
            } else {
                if (enemies.length === 0) {
                    isWaveActive = false; wave++; waveTimer = 20 * 60;
                    const territoryIncome = worldMap.filter(t => t.owner === 'player' && t.type !== 'capital')
                        .reduce((s, t) => s + t.income, 0);
                    const baseIncome = 1200 * wave;
                    money += baseIncome + territoryIncome;
                    darkMatter += 1;
                    spawnFloatText(cvs.width/2, cvs.height/2, `🎉 第 ${wave-1} 波完成！+$${(baseIncome+territoryIncome).toLocaleString()}`, '#f59e0b');
                    if (territoryIncome > 0) {
                        spawnFloatText(cvs.width/2, cvs.height/2 + 26, `🛡️ 領地貢獻 +$${territoryIncome.toLocaleString()}`, '#4ade80');
                    }
                    saveGame();
                    uploadTycoonLeaderboardScore();
                }
            }

            const spawnInterval = isOverclocked ? 4 : Math.max(6, 35 - minerLevel * 4);
            if(frame % spawnInterval === 0 && items.length < 50) {
                items.push({ x: b.extractor.x + b.extractor.w + 15, y: b.extractor.y + b.extractor.h/2 + (Math.random()-0.5)*30, type: 'RAW' });
            }

            bots.forEach(bot => {
                let speed = (bot.speed * (1 + talents.spdLv * 0.15)) * (isOverclocked ? 1.8 : 1);
                let target = null;
                if (bot.bag.length === 0) {
                    let it = items[0];
                    target = it ? { x: it.x, y: it.y } : { x: b.extractor.x + b.extractor.w + 15, y: b.extractor.y + b.extractor.h/2 };
                } else {
                    let top = bot.bag[bot.bag.length - 1];
                    if (top.type === 'RAW') target = { x: b.smelter.x + b.smelter.w/2, y: b.smelter.y + b.smelter.h/2 };
                    else if (top.type === 'STEEL' && b.chipFab) target = { x: b.chipFab.x + b.chipFab.w/2, y: b.chipFab.y + b.chipFab.h/2 };
                    else if (top.type === 'CHIP' && b.nukeFab) target = { x: b.nukeFab.x + b.nukeFab.w/2, y: b.nukeFab.y + b.nukeFab.h/2 };
                    else if (top.type === 'BATTERY' && b.qFab) target = { x: b.qFab.x + b.qFab.w/2, y: b.qFab.y + b.qFab.h/2 };
                    else if (top.type === 'CORE' && b.antiFab) target = { x: b.antiFab.x + b.antiFab.w/2, y: b.antiFab.y + b.antiFab.h/2 };
                    else target = { x: b.hub.x + b.hub.w/2, y: b.hub.y + b.hub.h/2 };
                }
                let dx = target.x - bot.x, dy = target.y - bot.y, dist = Math.hypot(dx, dy);
                if(dist > 5) {
                    bot.x += (dx / dist) * speed; bot.y += (dy / dist) * speed;
                    bot.facing = Math.atan2(dy, dx);
                    bot.walkCycle += 0.25;
                } else {
                    bot.walkCycle += 0.05;
                }
                interact(bot, b);
            });

            interact(p, b);

            p.cooldown--;
            let totalDmgMult = (1 + darkMatter * 0.1) * (1 + talents.dmgLv * 0.2);
            if (p.cooldown <= 0 && enemies.length > 0) {
                let target = enemies.find(e => Math.hypot(p.x - e.x, p.y - e.y) < p.atkRange);
                if (target) {
                    bullets.push({ x: p.x, y: p.y, tx: target.x, ty: target.y, dmg: 30 * totalDmgMult * (1 + playerDamageLevel * 0.25), speed: 15, color: '#38bdf8' });
                    p.cooldown = isOverclocked ? 4 : 9;
                }
            }

            turrets.forEach(t => {
                t.cd--;
                if (t.cd <= 0 && enemies.length > 0) {
                    let target = enemies.find(e => Math.hypot(t.x - e.x, t.y - e.y) < t.range);
                    if (target) {
                        if (t.type === 'gatling') {
                            bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, dmg: 18 * totalDmgMult * (1 + turretDamageLevel * 0.2), speed: 16, color: '#f59e0b' });
                            t.cd = isOverclocked ? 3 : 8;
                        } else if (t.type === 'laser') {
                            bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, dmg: 60 * totalDmgMult * (1 + turretDamageLevel * 0.2), speed: 22, color: '#3b82f6' });
                            t.cd = 24;
                        } else if (t.type === 'mortar') {
                            bullets.push({ x: t.x, y: t.y, tx: target.x, ty: target.y, dmg: 140 * totalDmgMult * (1 + turretDamageLevel * 0.2), speed: 11, color: '#a855f7', splash: 90 });
                            t.cd = 48;
                        } else if (t.type === 'frost') {
                            target.speed = Math.max(0.4, target.speed * 0.5);
                            spawnParticles(target.x, target.y, '#0284c7', 4);
                            t.cd = 15;
                        } else if (t.type === 'blackhole') {
                            enemies.forEach(e => {
                                if (Math.hypot(t.x - e.x, t.y - e.y) < t.range) {
                                    e.hp -= 8 * totalDmgMult * (1 + turretDamageLevel * 0.2);
                                    e.x += (t.x - e.x) * 0.05;
                                }
                            });
                            spawnParticles(t.x, t.y, '#c084fc', 3);
                            t.cd = 5;
                        }
                    }
                }
            });

            for (let i = bullets.length - 1; i >= 0; i--) {
                let bul = bullets[i];
                let dx = bul.tx - bul.x, dy = bul.ty - bul.y, dist = Math.hypot(dx, dy);
                if (dist < 12) {
                    if (bul.splash) {
                        enemies.forEach(e => {
                            if (Math.hypot(bul.x - e.x, bul.y - e.y) < bul.splash) {
                                e.hp -= bul.dmg; spawnParticles(e.x, e.y, bul.color, 6);
                            }
                        });
                        triggerShake(10);
                    } else {
                        enemies.forEach(e => {
                            if (Math.hypot(bul.x - e.x, bul.y - e.y) < 25) {
                                e.hp -= bul.dmg; spawnParticles(e.x, e.y, bul.color, 3);
                            }
                        });
                    }
                    bullets.splice(i, 1);
                } else {
                    bul.x += (dx / dist) * bul.speed; bul.y += (dy / dist) * bul.speed;
                }
            }

            for (let i = enemies.length - 1; i >= 0; i--) {
                let e = enemies[i];
                e.x -= e.speed;
                e.anim = (e.anim || 0) + 0.1;
                if (e.hp <= 0) {
                    money += e.reward;
                    updateQuests('kill', 1);
                    spawnFloatText(e.x, e.y, `+$${Math.floor(e.reward)}`, '#4ade80');
                    spawnParticles(e.x, e.y, '#22c55e', 8);
                    enemies.splice(i, 1);
                    continue;
                }
                if (e.x < -40) e.x = cvs.width + 40;
            }

            if (shakeTime > 0) shakeTime--;
            for(let i = floatTexts.length-1; i>=0; i--) { floatTexts[i].y -= 1; floatTexts[i].alpha -= 0.02; if(floatTexts[i].alpha<=0) floatTexts.splice(i,1); }
            for(let i = particles.length-1; i>=0; i--) { particles[i].x += particles[i].vx; particles[i].y += particles[i].vy; particles[i].alpha -= 0.04; if(particles[i].alpha<=0) particles.splice(i,1); }
            for(let i = battleEffects.length-1; i>=0; i--) {
                const ef = battleEffects[i];
                if (ef.type === 'soldierCharge') {
                    ef.x += ef.vx; ef.y += ef.vy; ef.life--;
                    ef.vx *= 0.98;
                } else if (ef.type === 'marchDust') {
                    ef.x += (Math.random()-0.5)*2;
                    ef.y += (Math.random()-0.5)*2;
                    ef.life--;
                }
                if (ef.life <= 0) battleEffects.splice(i, 1);
            }
            for(let i = forgeSparks.length-1; i>=0; i--) {
                const sp = forgeSparks[i];
                sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.3; sp.life--;
                if (sp.life <= 0) forgeSparks.splice(i, 1);
            }
        }

        function updateFactoryAnim() {
            const b = getBuildings();
            const factories = ['smelter', 'chipFab', 'nukeFab', 'qFab', 'antiFab'];
            factories.forEach(key => {
                if (!b[key]) return;
                const f = b[key];
                if (!factoryAnim[key]) factoryAnim[key] = { timer: 0, active: false, progress: 0 };
                const fa = factoryAnim[key];
                fa.timer++;
                if (!fa.active && fa.timer > 60 && Math.random() < 0.02) {
                    fa.active = true;
                    fa.progress = 0;
                    fa.timer = 0;
                }
                if (fa.active) {
                    fa.progress += 0.03;
                    if (Math.random() < 0.4) {
                        forgeSparks.push({
                            x: f.x + f.w/2 + (Math.random()-0.5)*40,
                            y: f.y + f.h/2 + (Math.random()-0.5)*30,
                            vx: (Math.random()-0.5)*3,
                            vy: -2 - Math.random()*3,
                            color: f.color,
                            life: 20 + Math.random()*15,
                            size: 1 + Math.random()*2
                        });
                    }
                    if (fa.progress >= 1) {
                        fa.active = false;
                        fa.progress = 0;
                        for (let i = 0; i < 8; i++) {
                            particles.push({
                                x: f.x + f.w/2, y: f.y + f.h/2,
                                vx: (Math.random()-0.5)*6, vy: (Math.random()-0.5)*6,
                                size: 2 + Math.random()*3, color: f.color, alpha: 1
                            });
                        }
                    }
                }
            });
        }

        // ============================================================
        // 世界地圖更新
        // ============================================================
        function updateWorld() {
            let mvx = 0, mvy = 0;
            if (keys['w'] || keys['arrowup']) mvy -= 1;
            if (keys['s'] || keys['arrowdown']) mvy += 1;
            if (keys['a'] || keys['arrowleft']) mvx -= 1;
            if (keys['d'] || keys['arrowright']) mvx += 1;
            if (joystick.active) {
                mvx += joystick.dx;
                mvy += joystick.dy;
            }
            const len = Math.hypot(mvx, mvy);
            commander.marching = len > 0.05;
            if (len > 0.05 && !armyMarch.active) {
                mvx /= len; mvy /= len;
                const speed = 620;
                const dt = 1 / 60;
                commander.x = Math.max(20, Math.min(WORLD_W - 20, commander.x + mvx * speed * dt));
                commander.y = Math.max(20, Math.min(WORLD_H - 20, commander.y + mvy * speed * dt));
                commander.facing = Math.atan2(mvy, mvx);
                commander.walkCycle += 0.3;
            } else {
                commander.walkCycle += 0.05;
            }

            camera.x += (commander.x - camera.x) * 0.12;
            camera.y += (commander.y - camera.y) * 0.12;

            // 行軍 + 戰鬥
            if (armyMarch.active) {
                if (armyMarch.phase === 'march') {
                    armyMarch.progress += 0.0055;
                    if (armyMarch.progress >= 1) {
                        armyMarch.progress = 1;
                        armyMarch.phase = 'fight';
                        armyMarch.tickTimer = 0;
                        showBattleText('⚔️ 交戰開始！', '#fbbf24');
                    }
                } else if (armyMarch.phase === 'fight') {
                    armyMarch.tickTimer++;
                    if (armyMarch.tickTimer >= 12) {
                        armyMarch.tickTimer = 0;
                        const t = worldMap.find(x => x.id === armyMarch.targetId);
                        if (!t) { armyMarch.active = false; armyMarch.phase = 'idle'; return; }

                        const playerDps = armyMarch.soldiers * 2 + armyMarch.tanks * 8;
                        const enemyDps = t.garrisonCurrent * 1.5;
                        const crit = Math.random() < 0.15 ? 1.8 : 1;
                        const dmgToEnemy = playerDps * crit;
                        const dmgToPlayer = enemyDps * (Math.random() < 0.1 ? 0.3 : 1);

                        armyMarch.enemyHp -= dmgToEnemy;
                        armyMarch.playerHp -= dmgToPlayer;

                        const scr = worldToScreen(t.x + t.w / 2, t.y + t.h / 2);
                        floatTexts.push({
                            x: scr.x + (Math.random() - 0.5) * 60,
                            y: scr.y - 20 - Math.random() * 30,
                            text: `-${Math.floor(dmgToEnemy)}`,
                            color: crit > 1 ? '#fbbf24' : '#22c55e',
                            alpha: 1
                        });
                        floatTexts.push({
                            x: scr.x + (Math.random() - 0.5) * 60,
                            y: scr.y + 20 + Math.random() * 30,
                            text: `-${Math.floor(dmgToPlayer)}`,
                            color: '#ef4444',
                            alpha: 1
                        });

                        for (let i = 0; i < 4; i++) {
                            particles.push({
                                x: scr.x + (Math.random() - 0.5) * 80,
                                y: scr.y + (Math.random() - 0.5) * 80,
                                vx: (Math.random() - 0.5) * 6,
                                vy: (Math.random() - 0.5) * 6,
                                size: 2 + Math.random() * 3,
                                color: Math.random() > 0.5 ? '#fbbf24' : '#ef4444',
                                alpha: 1
                            });
                        }
                        triggerShake(3);

                        if (armyMarch.enemyHp <= 0) {
                            armyMarch.enemyHp = 0;
                            armyMarch.phase = 'done';
                            finishBattle(true);
                        } else if (armyMarch.playerHp <= 0) {
                            armyMarch.playerHp = 0;
                            armyMarch.phase = 'done';
                            finishBattle(false);
                        }
                    }
                }
            }

            if (shakeTime > 0) shakeTime--;
            for(let i = floatTexts.length-1; i>=0; i--) { floatTexts[i].y -= 1; floatTexts[i].alpha -= 0.02; if(floatTexts[i].alpha<=0) floatTexts.splice(i,1); }
            for(let i = particles.length-1; i>=0; i--) { particles[i].x += particles[i].vx; particles[i].y += particles[i].vy; particles[i].alpha -= 0.04; if(particles[i].alpha<=0) particles.splice(i,1); }
            for(let i = battleEffects.length-1; i>=0; i--) {
                const ef = battleEffects[i];
                if (ef.type === 'marchDust') {
                    ef.x += (Math.random()-0.5)*3;
                    ef.y += (Math.random()-0.5)*3;
                    ef.life--;
                }
                if (ef.life <= 0) battleEffects.splice(i, 1);
            }
        }

        // ============================================================
        // UI 同步
        // ============================================================
