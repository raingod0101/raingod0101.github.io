(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();
    let currentIp = "Unknown_IP";

    // --- 節慶主題自動切換 ---
    (function applyFestivalTheme() {
        const testTheme = null;
        let theme = '';
        if (testTheme) {
            theme = 'theme-' + testTheme;
        } else {
            const now = new Date();
            const m = now.getMonth() + 1;
            const d = now.getDate();
            const md = m * 100 + d;
            const festivals = [
                { name: 'newyear',    start: 120,  end: 209 },
                { name: 'valentine',  start: 210,  end: 216 },
                { name: 'sakura',     start: 320,  end: 405 },
                { name: 'dragonboat', start: 601,  end: 610 },
                { name: 'midautumn',  start: 915,  end: 1005 },
                { name: 'halloween',  start: 1024, end: 1101 },
                { name: 'shopping',   start: 1110, end: 1112 },
                { name: 'christmas',  start: 1218, end: 1226 },
                { name: 'stpatrick',  start: 315,  end: 318 },
                { name: 'diwali',     start: 1025, end: 1105 },
                { name: 'dayofdead',  start: 1101, end: 1102 },
                { name: 'backtoschool',start: 901, end: 910 },
                { name: 'summer',     start: 701,  end: 715 },
                { name: 'thanksgiving',start: 1120, end: 1130 },
                { name: 'nye',        start: 1231, end: 102 },
                { name: 'lantern',    start: 217,  end: 225 },
                { name: 'earthday',   start: 420,  end: 424 },
                { name: 'graduation', start: 525,  end: 615 }
            ];
            for (const f of festivals) {
                if (f.start > f.end) {
                    if (md >= f.start || md <= f.end) { theme = 'theme-' + f.name; break; }
                } else {
                    if (md >= f.start && md <= f.end) { theme = 'theme-' + f.name; break; }
                }
            }
        }
        if (theme) document.body.classList.add(theme);
    })();

    // --- 網頁 Icon ---
    function setFavicon() {
        const iconUrl = `${baseUrl}catdragon.png`;
        document.querySelectorAll("link[rel*='icon']").forEach(el => el.remove());
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        favicon.href = `${iconUrl}?v=${v}`;
        (document.head || document.documentElement).appendChild(favicon);
    }
    if (document.head) setFavicon();
    else document.addEventListener('DOMContentLoaded', setFavicon);

    // --- 全域 Promise ---
    let markFirebaseReady, markAuthReady, markAccountDataReady;
    window.raingodFirebaseReady = new Promise(r => { markFirebaseReady = r; });
    window.raingodAuthReady = new Promise(r => { markAuthReady = r; });
    window.raingodAccountDataReady = new Promise(r => { markAccountDataReady = r; });

    const storageBindings = new Map();
    let storageSyncInstalled = false;
    let accountDataSync = Promise.resolve();
    let accountDataSyncing = false;
    let accountDataCloudLoaded = false;
    let activeAccountUid = '';
    let accountSaveTimer = null;
    window.raingodAccountDataCloudLoaded = false;

    // === 遊戲鎖（跨分頁 + 跨裝置） ===
    const activeGameLocks = new Map();
    const GAME_LOCK_PREFIX = 'raingod_game_lock_';

    // === 帳號 session（跨分頁 + 跨裝置，後登入者勝） ===
    const SESSION_STORAGE_KEY = 'raingod_session_id';
    let _sessionId = null;

    function getNavType() {
        try {
            const nav = performance.getEntriesByType('navigation')[0];
            return nav ? nav.type : 'navigate';
        } catch (e) { return 'navigate'; }
    }

    // reload → 複用 sessionStorage（刷新不踢自己/別人）
    // 其他（navigate / 複製分頁 / 新 tab / 首次）→ 生成新的（踢掉其他地方）
    function getSessionId() {
        if (_sessionId) return _sessionId;
        if (getNavType() === 'reload') {
            const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
            if (existing) { _sessionId = existing; return _sessionId; }
        }
        _sessionId = 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        try { sessionStorage.setItem(SESSION_STORAGE_KEY, _sessionId); } catch (e) {}
        return _sessionId;
    }

    function accountDataRef(uid) {
        return firebase.database().ref(`users/${uid}/account_data`);
    }

    // 排除裝置 ID 與遊戲存檔（遊戲存檔走 games/{gameId}）
    function readAccountData() {
        const data = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== 'raingod_device_id' && !key.startsWith('raingod_save_')) {
                data.push({ key, value: localStorage.getItem(key) });
            }
        }
        return data.sort((a, b) => a.key.localeCompare(b.key));
    }

    function accountDataSignature(data) {
        return JSON.stringify((Array.isArray(data) ? data : []).slice().sort((a, b) => a.key.localeCompare(b.key)));
    }

    function clearLocalAccountData(clearSession = true) {
        const bindings = new Set(storageBindings.values());
        bindings.forEach(binding => { if (binding.pause) binding.pause(); });
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== 'raingod_device_id') keys.push(key);
        }
        keys.forEach(key => localStorage.removeItem(key));
        if (clearSession) {
            try { sessionStorage.clear(); } catch (err) { console.error('清除本機登入狀態失敗：', err); }
        }
    }

    // 只覆蓋非遊戲存檔（遊戲存檔由 raingodInitGame 自己處理）
    function replaceLocalAccountData(data) {
        accountDataSyncing = true;
        try {
            const bindings = new Set(storageBindings.values());
            bindings.forEach(binding => { if (binding.pause) binding.pause(); });
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key !== 'raingod_device_id' && !key.startsWith('raingod_save_')) keys.push(key);
            }
            keys.forEach(key => localStorage.removeItem(key));
            (Array.isArray(data) ? data : []).forEach(entry => {
                if (entry && typeof entry.key === 'string'
                    && entry.key !== 'raingod_device_id'
                    && !entry.key.startsWith('raingod_save_')
                    && typeof entry.value === 'string') {
                    localStorage.setItem(entry.key, entry.value);
                }
            });
        } finally {
            accountDataSyncing = false;
        }
    }

    window.raingodClearLocalAccountData = function() {
        activeAccountUid = '';
        accountDataCloudLoaded = false;
        window.raingodAccountDataCloudLoaded = false;
        clearTimeout(accountSaveTimer);
        window.raingodCurrentUser = null;
        _sessionId = null;                    // 清 session 快取
        activeGameLocks.forEach(lock => { try { lock.release(); } catch (e) {} });
        activeGameLocks.clear();
        clearLocalAccountData();
    };

    function scheduleAccountDataSave() {
        if (!activeAccountUid || accountDataSyncing) return;
        const uid = activeAccountUid;
        clearTimeout(accountSaveTimer);
        accountSaveTimer = setTimeout(async () => {
            if (activeAccountUid !== uid || !firebase.auth().currentUser || firebase.auth().currentUser.uid !== uid) return;
            try {
                await accountDataRef(uid).set({
                    data: readAccountData(),
                    updated_at: firebase.database.ServerValue.TIMESTAMP
                });
            } catch (err) {
                console.error('帳號資料同步失敗：', err);
            }
        }, 400);
    }

    async function syncAccountData(user) {
        const uid = user.uid;
        const localData = readAccountData();
        const snapshot = await accountDataRef(uid).once('value');
        if (firebase.auth().currentUser?.uid !== uid) return;

        if (!snapshot.exists()) {
            accountDataCloudLoaded = false;
            window.raingodAccountDataCloudLoaded = false;
            await accountDataRef(uid).set({
                data: localData,
                updated_at: firebase.database.ServerValue.TIMESTAMP
            });
            return;
        }

        const cloudData = snapshot.val().data;
        if (!Array.isArray(cloudData)) throw new Error('雲端帳號資料格式無效');
        const cloudKeys = new Set();
        if (cloudData.some(entry => {
            if (!entry || typeof entry.key !== 'string'
                || entry.key === 'raingod_device_id'
                || entry.key.startsWith('raingod_save_')
                || typeof entry.value !== 'string'
                || cloudKeys.has(entry.key)) return true;
            cloudKeys.add(entry.key);
            return false;
        })) throw new Error('雲端帳號資料內容無效');

        accountDataCloudLoaded = true;
        window.raingodAccountDataCloudLoaded = true;

        const localDiffers = accountDataSignature(localData) !== accountDataSignature(cloudData);
        if (!localData.length || !localDiffers) {
            replaceLocalAccountData(cloudData);
            return;
        }

        const accountKey = user.email ? user.email.split('@')[0] : uid;
        let choice = readSaveChoice(accountKey);
        if (!choice) {
            const confirmed = window.confirm(
                '此帳號已有雲端資料，且與本機不同。\n\n按「確定」：用雲端資料覆蓋本機全部資料。\n按「取消」：直接登出此帳號。'
            );
            if (!confirmed) {
                try { await firebase.auth().signOut(); } catch (e) {}
                return;
            }
            choice = 'cloud';
            try { sessionStorage.setItem(saveChoiceKey(accountKey), choice); } catch (err) {}
        }

        if (firebase.auth().currentUser?.uid !== uid) return;
        replaceLocalAccountData(cloudData);
    }

    window.raingodWaitForAccountData = async function(uid) {
        while (activeAccountUid === uid) {
            const pendingSync = accountDataSync;
            await pendingSync;
            if (pendingSync === accountDataSync) return;
        }
    };

    window.raingodRequireAuth = async function(feature = '此功能') {
        await window.raingodFirebaseReady;
        await window.raingodAuthReady;
        if (firebase.auth().currentUser) return true;
        alert(`請先登入帳號，才能使用${feature}。`);
        document.getElementById('login-btn')?.click();
        return false;
    };

    function saveChoiceKey(uid) { return `raingod_save_choice_${uid}`; }
    function readSaveChoice(uid) {
        try { return sessionStorage.getItem(saveChoiceKey(uid)); } catch (e) { return null; }
    }
    function clearSaveChoice(uid) {
        try { sessionStorage.removeItem(saveChoiceKey(uid)); } catch (e) {}
    }

    function comparableSaveData(gameId, data) {
        const value = gameId === 'game4' && data && typeof data === 'object' && !Array.isArray(data)
            ? Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'playerId' && key !== '_extrasUpdatedAt'))
            : data;
        const sortKeys = item => {
            if (Array.isArray(item)) return item.map(sortKeys);
            if (item && typeof item === 'object') {
                return Object.keys(item).sort().reduce((sorted, key) => {
                    sorted[key] = sortKeys(item[key]);
                    return sorted;
                }, {});
            }
            return item;
        };
        return JSON.stringify(sortKeys(value));
    }

    function parseStorageValue(raw) {
        try { return JSON.parse(raw); } catch (e) { return raw; }
    }
    function encodeStorageValue(value) {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }

    function installStorageSync() {
        if (storageSyncInstalled || !window.Storage) return;
        storageSyncInstalled = true;
        const originalSetItem = Storage.prototype.setItem;
        const originalRemoveItem = Storage.prototype.removeItem;
        const originalClear = Storage.prototype.clear;

        Storage.prototype.setItem = function(key, value) {
            originalSetItem.call(this, key, value);
            if (this === localStorage) {
                const keyStr = String(key);
                if (!keyStr.startsWith('raingod_save_') && !keyStr.startsWith('raingod_game_lock_')) {
                    scheduleAccountDataSave();
                }
                const binding = storageBindings.get(keyStr);
                if (binding) binding.scheduleSave();
            }
        };
        Storage.prototype.removeItem = function(key) {
            originalRemoveItem.call(this, key);
            if (this === localStorage) {
                const keyStr = String(key);
                if (!keyStr.startsWith('raingod_save_') && !keyStr.startsWith('raingod_game_lock_')) {
                    scheduleAccountDataSave();
                }
                const binding = storageBindings.get(keyStr);
                if (binding) binding.scheduleSave();
            }
        };
        Storage.prototype.clear = function() {
            originalClear.call(this);
            if (this === localStorage) scheduleAccountDataSave();
        };
    }

    // --- 裝置 / 分頁 ID（僅用於日誌與 game_locks 的輔助欄位）---
    function getDeviceId() {
        let deviceId = localStorage.getItem('raingod_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('raingod_device_id', deviceId);
        }
        return deviceId;
    }

    let _tabId = null;
    function getTabId() {
        if (!_tabId) {
            _tabId = 'tab_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }
        return _tabId;
    }

    // === 遊戲鎖：同裝置用 localStorage、跨裝置用 Firebase ===
    async function acquireGameLock(gameId, onLost) {
        const sessionId = getSessionId();   // 每個頁面唯一
        const localKey = GAME_LOCK_PREFIX + gameId;
        const lock = { owned: true, sessionId, gameId, lostHandled: false };

        const handleLost = () => {
            if (lock.lostHandled) return;
            lock.lostHandled = true;
            lock.owned = false;
            try { onLost && onLost(); } catch (e) {}
        };

        // 1. 本機鎖（同裝置跨分頁）：後開者直接覆蓋
        try { localStorage.setItem(localKey, sessionId); } catch (e) {}
        const storageHandler = e => {
            if (e.key !== localKey) return;
            if (!e.newValue) return;
            if (e.newValue === sessionId) return;
            handleLost();
        };
        window.addEventListener('storage', storageHandler);

        // 2. Firebase 鎖（跨裝置／跨瀏覽器，僅登入時）
        let firebaseRef = null;
        let firebaseHandler = null;
        try {
            await window.raingodFirebaseReady;
            await window.raingodAuthReady;
            const user = firebase.auth().currentUser;
            if (user) {
                firebaseRef = firebase.database().ref(`game_locks/${user.uid}/${gameId}`);
                await firebaseRef.set({
                    sessionId,
                    deviceId: getDeviceId(),
                    tabId: getTabId(),
                    ts: firebase.database.ServerValue.TIMESTAMP
                });
                firebaseHandler = snap => {
                    const val = snap.val();
                    if (!val || !val.sessionId) return;
                    if (val.sessionId === sessionId) return;
                    handleLost();
                };
                firebaseRef.on('value', firebaseHandler);
            }
        } catch (e) {
            console.warn('建立 Firebase 遊戲鎖失敗', e);
        }

        // 3. 心跳：每 5 秒主動校驗
        const heartbeat = setInterval(async () => {
            if (lock.lostHandled) return;
            if (localStorage.getItem(localKey) !== sessionId) { handleLost(); return; }
            if (firebaseRef) {
                try {
                    const snap = await firebaseRef.once('value');
                    const val = snap.val();
                    if (val && val.sessionId && val.sessionId !== sessionId) handleLost();
                } catch (e) {}
            }
        }, 5000);

        lock.release = () => {
            clearInterval(heartbeat);
            window.removeEventListener('storage', storageHandler);
            if (localStorage.getItem(localKey) === sessionId) {
                try { localStorage.removeItem(localKey); } catch (e) {}
            }
            if (firebaseRef) {
                try { firebaseRef.off('value', firebaseHandler); } catch (e) {}
                // 不做遠端 remove，避免非同步誤刪後開者的新鎖
            }
        };

        return lock;
    }

    window.addEventListener('beforeunload', () => {
        activeGameLocks.forEach(lock => { try { lock.release(); } catch (e) {} });
        activeGameLocks.clear();
    });
    window.addEventListener('pagehide', () => {
        activeGameLocks.forEach(lock => { try { lock.release(); } catch (e) {} });
        activeGameLocks.clear();
    });

    // --- 多地方登入搶佔（帳號層級：任一分頁／裝置新登入 → 舊的全部登出）---
    let sessionWatchRef = null;
    let sessionWatchHandler = null;

    function stopSessionWatch() {
        if (sessionWatchRef && sessionWatchHandler) {
            try { sessionWatchRef.off('value', sessionWatchHandler); } catch (e) {}
        }
        if (sessionWatchRef) {
            try { sessionWatchRef.onDisconnect().cancel(); } catch (e) {}
        }
        sessionWatchRef = null;
        sessionWatchHandler = null;
    }

    async function claimSession(user) {
        stopSessionWatch();
        const sessionId = getSessionId();
        const sessionRef = firebase.database().ref(`users_sessions/${user.uid}`);

        const handler = snap => {
            const val = snap.val();
            if (!val || !val.sessionId) return;
            if (val.sessionId === sessionId) return;   // 自己，忽略

            // 別的地方（分頁／裝置）登入了 → 本頁直接登出
            stopSessionWatch();
            alert('您的帳號已在其他地方登入，本頁將自動登出。');
            const redirect = () => { window.location.href = baseUrl; };
            firebase.auth().signOut().then(() => {
                window.raingodClearLocalAccountData();
                redirect();
            }).catch(redirect);
        };

        sessionWatchRef = sessionRef;
        sessionWatchHandler = handler;

        try {
            // 後登入者勝：直接覆蓋（不要用 onDisconnect().remove()，否則關頁會誤刪別人的 session）
            await sessionRef.set({
                sessionId,
                deviceId: getDeviceId(),
                tabId: getTabId(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
            if (firebase.auth().currentUser?.uid !== user.uid) {
                stopSessionWatch();
                return;
            }
            sessionRef.on('value', handler);
        } catch (e) {
            console.warn('多裝置偵測失敗', e);
            stopSessionWatch();
        }
    }

    // --- 自動加載資源 ---
    async function loadResources() {
        const resources = [
            { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js" },
            { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js" },
            { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js" },
            { type: 'css', url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" }
        ];
        for (const res of resources) {
            await new Promise(resolve => {
                let el = res.type === 'js' ? document.createElement('script') : document.createElement('link');
                if (res.type === 'js') el.src = res.url;
                else { el.rel = 'stylesheet'; el.href = res.url; }
                el.onload = resolve;
                document.head.appendChild(el);
            });
        }
        initSystem();
    }
    loadResources();

    // --- 存檔 API ---
    window.raingodOnAuthStateChanged = function(callback) {
        return firebase.auth().onAuthStateChanged(callback);
    };

    window.raingodSave = async function(gameId, gameData) {
        if (!gameId) {
            console.error("raingodSave 錯誤：必須指定 gameId");
            return false;
        }

        const lock = activeGameLocks.get(gameId);
        if (lock) {
            if (localStorage.getItem(GAME_LOCK_PREFIX + gameId) !== lock.sessionId) {
                lock.owned = false;
                console.warn('本機鎖已被搶走，放棄儲存');
                return false;
            }
            if (!lock.owned) {
                console.warn('遊戲鎖已遺失，放棄儲存');
                return false;
            }
        }

        localStorage.setItem(`raingod_save_${gameId}`, JSON.stringify(gameData));

        await window.raingodFirebaseReady;
        await window.raingodAuthReady;
        const user = firebase.auth().currentUser;
        if (user && user.email) {
            const username = user.email.split('@')[0];
            try {
                const gameRef = firebase.database().ref(`users/${username}/games/${gameId}`);
                const snap = await gameRef.once('value');
                const cloudData = snap.val();
                if (cloudData && cloudData.updated_at && cloudData.updated_at > Date.now() - 5000) {
                    console.warn("存檔衝突：雲端版本較新，放棄覆蓋。");
                    return false;
                }
                await gameRef.set({
                    data: gameData,
                    updated_at: firebase.database.ServerValue.TIMESTAMP
                });
                return true;
            } catch (err) {
                console.error("帳號存檔失敗：", err);
            }
        }
        return false;
    };

    window.raingodInitGame = async function(gameId, defaultLocalData, onComplete) {
        if (!gameId) {
            console.error("raingodInitGame 錯誤：必須指定 gameId");
            return null;
        }

        const existingLock = activeGameLocks.get(gameId);
        if (existingLock) { try { existingLock.release(); } catch (e) {} activeGameLocks.delete(gameId); }

        let kicked = false;
        const lock = await acquireGameLock(gameId, () => {
            kicked = true;
            alert('此遊戲已在其他分頁或裝置開啟，本頁將回到主頁。');
            window.location.href = baseUrl;
        });
        activeGameLocks.set(gameId, lock);

        if (kicked || !lock.owned) return null;

        await window.raingodFirebaseReady;
        await window.raingodAuthReady;
        const user = firebase.auth().currentUser;
        if (user) await window.raingodWaitForAccountData(user.uid);

        const complete = (data, details) => {
            if (onComplete) onComplete(data, details);
            return data;
        };

        if (!user) {
            const localSave = localStorage.getItem(`raingod_save_${gameId}`);
            const finalData = localSave ? JSON.parse(localSave) : defaultLocalData;
            return complete(finalData, { source: 'local', syncEnabled: false });
        }

        const username = user.email.split('@')[0];
        const gameRef = firebase.database().ref(`users/${username}/games/${gameId}`);

        try {
            const snapshot = await gameRef.once('value');
            if (firebase.auth().currentUser?.uid !== user.uid) return null;
            if (!lock.owned) return null;

            if (snapshot.exists()) {
                const cloudData = snapshot.val().data;
                const localSave = localStorage.getItem(`raingod_save_${gameId}`);
                const localData = localSave ? JSON.parse(localSave) : null;
                const localDiffers = localSave !== null
                    && comparableSaveData(gameId, localData) !== comparableSaveData(gameId, cloudData);

                if (localDiffers) {
                    const accountKey = user.email ? user.email.split('@')[0] : user.uid;
                    let choice = readSaveChoice(accountKey);
                    if (!choice) {
                        const confirmed = window.confirm(
                            '此帳號已有此遊戲的雲端進度，且與本機不同。\n\n按「確定」：用雲端進度覆蓋本機存檔。\n按「取消」：直接登出此帳號。'
                        );
                        if (!confirmed) {
                            try { await firebase.auth().signOut(); } catch (e) {}
                            return complete(localData, { source: 'local', syncEnabled: false, loggedOut: true });
                        }
                        choice = 'cloud';
                        try { sessionStorage.setItem(saveChoiceKey(accountKey), choice); } catch (e) {}
                    }
                }

                localStorage.setItem(`raingod_save_${gameId}`, JSON.stringify(cloudData));
                return complete(cloudData, { source: 'cloud', syncEnabled: true });
            }

            const localSave = localStorage.getItem(`raingod_save_${gameId}`);
            const initialData = localSave ? JSON.parse(localSave) : defaultLocalData;
            await gameRef.set({
                data: initialData,
                updated_at: firebase.database.ServerValue.TIMESTAMP
            });
            return complete(initialData, { source: 'local', syncEnabled: true, created: true });
        } catch (err) {
            console.error("讀取雲端存檔失敗：", err);
            const localSave = localStorage.getItem(`raingod_save_${gameId}`);
            const fallbackData = localSave ? JSON.parse(localSave) : defaultLocalData;
            return complete(fallbackData, { source: 'local', syncEnabled: false, error: err });
        }
    };

    window.raingodBindStorage = function(gameId, keys, defaults, onLoaded, legacyCloudSave) {
        const storageKeys = Array.from(new Set(keys));
        const readValues = () => storageKeys.reduce((values, key) => {
            const raw = localStorage.getItem(key);
            values[key] = raw === null ? defaults[key] : parseStorageValue(raw);
            return values;
        }, {});
        let activeUserId = '';
        let enabled = false;
        let saveTimer = null;
        const binding = {
            pause() {
                enabled = false;
                clearTimeout(saveTimer);
            },
            scheduleSave() {
                if (!enabled) return;
                clearTimeout(saveTimer);
                saveTimer = setTimeout(() => window.raingodSave(gameId, readValues()), 400);
            }
        };

        storageKeys.forEach(key => storageBindings.set(key, binding));
        installStorageSync();

        return new Promise(resolve => {
            let initialState = true;
            window.raingodFirebaseReady.then(() => {
                window.raingodOnAuthStateChanged(async user => {
                    if (!user) {
                        enabled = false;
                        if (initialState) {
                            initialState = false;
                            if (onLoaded) onLoaded(readValues(), { source: 'local', syncEnabled: false });
                            resolve();
                        }
                        activeUserId = '';
                        return;
                    }
                    if (activeUserId === user.uid) return;
                    activeUserId = user.uid;
                    enabled = false;

                    try {
                        await window.raingodAccountDataReady;
                        await window.raingodWaitForAccountData(user.uid);
                        if (firebase.auth().currentUser?.uid !== user.uid) return;
                        const localData = readValues();
                        const genericKey = `raingod_save_${gameId}`;
                        if (legacyCloudSave && user.email) {
                            const username = user.email.split('@')[0];
                            const accountRef = firebase.database().ref(`users/${username}/games/${gameId}`);
                            const accountSnapshot = await accountRef.once('value');
                            if (!accountSnapshot.exists()) {
                                const legacySnapshot = await firebase.database().ref(`users/${user.uid}/${legacyCloudSave.path}`).once('value');
                                if (legacySnapshot.exists()) {
                                    const legacyData = legacySnapshot.val();
                                    const primaryKey = legacyCloudSave.key;
                                    const localRaw = localStorage.getItem(primaryKey);
                                    const differs = localRaw !== null && comparableSaveData(gameId, parseStorageValue(localRaw)) !== comparableSaveData(gameId, legacyData);
                                    let useLegacyCloud = true;
                                    if (differs) {
                                        const accountKey = user.email.split('@')[0];
                                        let choice = readSaveChoice(accountKey);
                                        if (!choice) {
                                            const confirmed = window.confirm(
                                                '找到此帳號舊版雲端進度，且與本機不同。\n\n按「確定」：用舊版雲端進度覆蓋本機。\n按「取消」：直接登出。'
                                            );
                                            if (!confirmed) {
                                                try { await firebase.auth().signOut(); } catch (e) {}
                                                enabled = false;
                                                if (onLoaded) onLoaded(localData, { source: 'local', syncEnabled: false, loggedOut: true });
                                                if (initialState) { initialState = false; resolve(); }
                                                return;
                                            }
                                            choice = 'cloud';
                                            try { sessionStorage.setItem(saveChoiceKey(accountKey), choice); } catch (e) {}
                                        }
                                        useLegacyCloud = choice === 'cloud';
                                    }
                                    if (useLegacyCloud) {
                                        localData[primaryKey] = legacyData;
                                        Storage.prototype.setItem.call(localStorage, primaryKey, encodeStorageValue(legacyData));
                                    }
                                }
                            }
                        }
                        const hasLegacySave = storageKeys.some(key => localStorage.getItem(key) !== null);
                        if (hasLegacySave) {
                            Storage.prototype.setItem.call(localStorage, genericKey, JSON.stringify(localData));
                        }
                        let details = {};
                        const data = await window.raingodInitGame(gameId, localData, (loaded, metadata) => { details = metadata || {}; });

                        if (details.loggedOut) {
                            enabled = false;
                            if (onLoaded) onLoaded(localData, details);
                            if (initialState) { initialState = false; resolve(); }
                            return;
                        }
                        if (firebase.auth().currentUser?.uid !== user.uid) return;

                        const selected = data && typeof data === 'object' ? data : localData;
                        if (!details.conflict && !details.error) {
                            storageKeys.forEach(key => {
                                const value = Object.prototype.hasOwnProperty.call(selected, key) ? selected[key] : defaults[key];
                                if (value === null || value === undefined) Storage.prototype.removeItem.call(localStorage, key);
                                else Storage.prototype.setItem.call(localStorage, key, encodeStorageValue(value));
                            });
                        }

                        enabled = details.syncEnabled === true;
                        if (onLoaded) onLoaded(details.conflict || details.error ? localData : selected, details);
                    } catch (err) {
                        console.error("帳號存檔載入失敗：", err);
                        if (onLoaded) onLoaded(readValues(), { source: 'local', syncEnabled: false, error: err });
                    } finally {
                        if (initialState) { initialState = false; resolve(); }
                    }
                });
            });
        });
    };

    // --- 數據同步與訪客追蹤 ---
    async function syncData(user = null) {
        let ip = "Unknown";
        let location = "Unknown";
        let device = navigator.userAgent;
        try {
            const res = await fetch('https://ipapi.co/json/');
            const data = await res.json();
            ip = data.ip;
            currentIp = ip;
            location = `${data.city}, ${data.region}, ${data.country_name}`;
        } catch (e) { console.warn("Location fetch failed"); }

        const safeIp = ip.replace(/[\.\$\#\[\]\/]/g, '_');
        const now = Date.now();
        const path = user ? `users_ip_logs/${safeIp}` : `guests/${safeIp}`;
        const ref = firebase.database().ref(path);
        ref.once('value', (snapshot) => {
            const oldData = snapshot.val() || {};
            const firstSeen = oldData.first_seen || now;
            ref.update({
                ip, device, location,
                last_active: now,
                first_seen: firstSeen,
                total_time_ms: now - firstSeen,
                url: window.location.href
            });
        }).catch(err => console.warn("Database sync restricted:", err));
    }

    // --- 自訂帳號登入／註冊 ---
    function handleCustomAuth() {
        const choice = prompt("請選擇功能：\n1. 登入\n2. 註冊新帳號\n(請輸入數字 1 或 2)");
        if (choice === '1') {
            const username = prompt("請輸入您的帳號：");
            if (!username) return;
            const password = prompt("請輸入您的密碼：");
            if (!password) return;
            const email = `${username.trim().toLowerCase()}@raingod.app`;
            clearSaveChoice(email.split('@')[0]);
            firebase.auth().signInWithEmailAndPassword(email, password)
                .then(() => alert("登入成功！"))
                .catch(err => {
                    if (err.code === 'auth/user-not-found') alert("錯誤：該帳號不存在！");
                    else if (err.code === 'auth/wrong-password') alert("錯誤：密碼不正確！");
                    else alert("登入失敗：" + err.message);
                });
        } else if (choice === '2') {
            const deviceId = getDeviceId();
            const deviceRef = firebase.database().ref('registered_devices/' + deviceId);
            deviceRef.once('value').then(snapshot => {
                if (snapshot.exists()) {
                    alert("【註冊限制】這台裝置已經建立過帳號（" + snapshot.val().username + "），每個裝置只能建立一個帳號！");
                    return;
                }
                const username = prompt("請建立新帳號（只能包含英文字母或數字）：");
                if (!username) return;
                const cleanUser = username.trim().toLowerCase();
                if (!/^[a-zA-Z0-9]+$/.test(cleanUser)) {
                    alert("帳號格式不合！請勿使用中文、空白或特殊符號。");
                    return;
                }
                const password = prompt("請設定您的密碼（至少 6 位數）：");
                if (!password || password.length < 6) {
                    alert("密碼長度不足，請輸入至少 6 位數！");
                    return;
                }
                const confirmPassword = prompt("請再次輸入您的密碼以確認：");
                if (confirmPassword === null) return;
                if (password !== confirmPassword) {
                    alert("錯誤：兩次輸入的密碼不一致，請重新註冊！");
                    return;
                }
                const email = `${cleanUser}@raingod.app`;
                firebase.auth().createUserWithEmailAndPassword(email, password)
                    .then(userCredential => {
                        deviceRef.set({
                            username: cleanUser,
                            uid: userCredential.user.uid,
                            created_at: firebase.database.ServerValue.TIMESTAMP
                        });
                        alert("帳號註冊成功，已自動為您登入！");
                    })
                    .catch(err => {
                        if (err.code === 'auth/email-already-in-use') alert("該帳號名稱已經有人使用，請更換其他名稱！");
                        else alert("註冊失敗：" + err.message);
                    });
            }).catch(err => {
                alert("存取 Firebase 資料庫失敗！請確認 Realtime Database 的 Rules 已開啟讀寫權限。\n錯誤資訊：" + err.message);
            });
        }
    }

    // --- 初始化系統 ---
    function initSystem() {
        if (!firebase.apps.length) {
            firebase.initializeApp({
                apiKey: "AIzaSyB6ddhbgcV0aUgezkJVr61XMrJkcFWYzxI",
                authDomain: "project-245615336743.firebaseapp.com",
                databaseURL: "https://project-161757768102958224-default-rtdb.firebaseio.com",
                projectId: "project-245615336743",
                storageBucket: "project-245615336743.firebasestorage.app",
                messagingSenderId: "245615336743",
                appId: "1:245615336743:web:5f1b46b5a74668a2ac5d02",
                measurementId: "G-067PR7PJVE"
            });
        }
        installStorageSync();
        markFirebaseReady();
        let authReadyResolved = false;

        firebase.auth().onAuthStateChanged(async user => {
            const previousUid = activeAccountUid;
            if (previousUid && (!user || previousUid !== user.uid)) {
                activeAccountUid = '';
                accountDataCloudLoaded = false;
                window.raingodAccountDataCloudLoaded = false;
                clearTimeout(accountSaveTimer);
                activeGameLocks.forEach(lock => { try { lock.release(); } catch (e) {} });
                activeGameLocks.clear();
                clearLocalAccountData();
            }

            window.raingodCurrentUser = user;
            if (!user) stopSessionWatch();

            if (user) {
                activeAccountUid = user.uid;

                await claimSession(user);
                if (firebase.auth().currentUser?.uid !== user.uid) {
                    if (!authReadyResolved) {
                        authReadyResolved = true;
                        markAuthReady(user);
                        markAccountDataReady();
                    }
                    return;
                }

                accountDataSync = syncAccountData(user).catch(err => {
                    console.error('載入帳號資料失敗：', err);
                });
                await accountDataSync;

                if (firebase.auth().currentUser?.uid !== user.uid) {
                    if (!authReadyResolved) {
                        authReadyResolved = true;
                        markAuthReady(user);
                        markAccountDataReady();
                    }
                    return;
                }
            }

            if (!authReadyResolved) {
                authReadyResolved = true;
                markAuthReady(user);
                markAccountDataReady();
            }
        });

        const container = document.getElementById('nav_bar');
        if (!container) return;

        // ===== 導覽列 badge 與頭像監聽 =====
        let navBadge = null;
        let navListeners = [];
        const navCounts = { requests: 0, unread: {} };
        let navTotalCount = 0;
        let navCurrentUsername = '';

        function clearNavListeners() {
            navListeners.forEach(fn => { try { fn(); } catch (e) {} });
            navListeners = [];
            navTotalCount = 0;
            navCounts.requests = 0;
            navCounts.unread = {};
            updateNavBadge(0);
        }

        function updateNavBadge(count) {
            navTotalCount = count;
            if (!navBadge) return;
            navBadge.textContent = count > 99 ? '99+' : String(count);
            navBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }

        function recomputeNavTotal() {
            let total = navCounts.requests || 0;
            Object.keys(navCounts.unread || {}).forEach(k => { total += navCounts.unread[k] || 0; });
            updateNavBadge(total);
        }

        function listenNavCounts(username, uid) {
            clearNavListeners();
            navCurrentUsername = username;

            const reqRef = firebase.database().ref(`users/${username}/friend_requests`);
            const reqHandler = snap => {
                const val = snap.val() || {};
                navCounts.requests = Object.keys(val).length;
                recomputeNavTotal();
            };
            reqRef.on('value', reqHandler);
            navListeners.push(() => reqRef.off('value', reqHandler));

            navCounts.unread = {};
            const friendsRef = firebase.database().ref(`users/${username}/friends`);
            const friendsHandler = snap => {
                const friends = snap.val() || {};
                navListeners.filter(x => x.__isUnread).forEach(fn => { try { fn(); } catch (e) {} });
                navListeners = navListeners.filter(x => !x.__isUnread);
                navCounts.unread = {};

                Object.keys(friends).forEach(friendUid => {
                    const cid = [uid, friendUid].sort().join('__');
                    const msgsRef = firebase.database().ref(`private_chats/${cid}/msgs`);
                    const readRef = firebase.database().ref(`private_chats/${cid}/read/${uid}`);
                    const handler = msgSnap => {
                        const msgs = msgSnap.val() || {};
                        readRef.once('value').then(readSnap => {
                            const lastRead = readSnap.val() || 0;
                            let unread = 0;
                            Object.keys(msgs).forEach(id => {
                                const m = msgs[id];
                                if (m.from !== uid && (m.ts || 0) > lastRead) unread++;
                            });
                            navCounts.unread[friendUid] = unread;
                            recomputeNavTotal();
                        }).catch(() => {});
                    };
                    msgsRef.on('value', handler);
                    const offFn = () => msgsRef.off('value', handler);
                    offFn.__isUnread = true;
                    navListeners.push(offFn);
                });
                recomputeNavTotal();
            };
            friendsRef.on('value', friendsHandler);
            navListeners.push(() => friendsRef.off('value', friendsHandler));
        }

        let avatarProfileRef = null;
        let avatarProfileHandler = null;
        function stopAvatarWatch() {
            if (avatarProfileRef && avatarProfileHandler) {
                try { avatarProfileRef.off('value', avatarProfileHandler); } catch (e) {}
            }
            avatarProfileRef = null;
            avatarProfileHandler = null;
        }
        function watchProfileAvatar(username, userAvatarEl) {
            stopAvatarWatch();
            if (!userAvatarEl) return;
            avatarProfileRef = firebase.database().ref(`users/${username}/profile/avatar`);
            avatarProfileHandler = snap => {
                const url = snap.val();
                if (url) userAvatarEl.src = url;
                else {
                    const u = firebase.auth().currentUser;
                    userAvatarEl.src = (u && u.photoURL) || `${baseUrl}catdragon.png`;
                }
            };
            avatarProfileRef.on('value', avatarProfileHandler);
        }

        fetch(`${baseUrl}menu.html?v=${v}`).then(r => r.text()).then(html => {
            container.innerHTML = html;

            const brandA = container.querySelector('.brand');
            if (brandA && !brandA.querySelector('img')) {
                const img = document.createElement('img');
                img.src = `${baseUrl}catdragon.png`;
                img.style.cssText = "height: 24px; width: 24px; object-fit: contain; margin-right: 8px; border-radius: 4px;";
                brandA.prepend(img);
            }

            const loginBtn = document.getElementById('login-btn');
            const userInfo = document.getElementById('user-info');
            const userAvatar = document.getElementById('user-avatar');

            if (userAvatar && userAvatar.parentElement) {
                const wrap = userAvatar.parentElement;
                if (!wrap.querySelector('.nav-avatar-badge')) {
                    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
                    navBadge = document.createElement('span');
                    navBadge.className = 'nav-avatar-badge';
                    navBadge.textContent = '0';
                    navBadge.style.cssText = [
                        'position:absolute','top:-4px','right:-4px',
                        'min-width:17px','height:17px','padding:0 4px','border-radius:9px',
                        'background:#ff3b30','color:#fff','font-size:10px','font-weight:700',
                        'line-height:17px','text-align:center','box-sizing:border-box',
                        'display:none','pointer-events:none','z-index:5','box-shadow:0 0 0 2px #fff'
                    ].join(';');
                    wrap.appendChild(navBadge);
                } else {
                    navBadge = wrap.querySelector('.nav-avatar-badge');
                }
            }

            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
                    if (userInfo) userInfo.style.setProperty('display', 'flex', 'important');

                    const username = user.email ? user.email.split('@')[0] : '';
                    const displayUsername = user.displayName || username || 'User';

                    if (userAvatar) {
                        userAvatar.src = user.photoURL || `${baseUrl}catdragon.png`;
                        userAvatar.title = "個人檔案：" + displayUsername;
                        watchProfileAvatar(username, userAvatar);
                    }
                    listenNavCounts(username, user.uid);
                    syncData(user);
                } else {
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = handleCustomAuth;
                    }
                    if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
                    stopAvatarWatch();
                    clearNavListeners();
                    syncData(null);
                }
            });
        });
    }
})();