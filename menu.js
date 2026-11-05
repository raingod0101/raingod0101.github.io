(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();
    let currentIp = "Unknown_IP";

    const ACCOUNT_DATA_ROOT = 'raingod_accounts';
    const USER_DATA_ROOT = 'raingod_users';
    const SESSION_ROOT = 'raingod_sessions';
    const LOCK_ROOT = 'raingod_locks';
    const IP_LOG_ROOT = 'raingod_ip_logs';
    const AUTH_BACKUP_ROOT = 'raingod_auth_backup';
    const DEVICE_REGISTRY_ROOT = 'raingod_device_registry';

    let RAINGOD_DB_WRITE_ENABLED = true;
    function canWriteRaingodDb() {
        return RAINGOD_DB_WRITE_ENABLED;
    }
    window.raingodSetDbWriteEnabled = function(enabled) {
        RAINGOD_DB_WRITE_ENABLED = !!enabled;
    };

    function userDataRef(username, path = '') {
        const suffix = path ? `/${path}` : '';
        return firebase.database().ref(`${USER_DATA_ROOT}/${username}${suffix}`);
    }

    function userGameSaveRef(uid, gameId) {
        return firebase.database().ref(`${ACCOUNT_DATA_ROOT}/${uid}/games/${gameId}`);
    }

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

    const ADMIN_USERNAME = 'raingod';
    window.raingodSecretDb = null;

    function isCurrentUserAdmin() {
        const u = firebase.auth().currentUser;
        if (!u || !u.email) return false;
        return u.email.split('@')[0].toLowerCase() === ADMIN_USERNAME;
    }

    window.raingodAdminViewPasswords = async function() {
        if (!isCurrentUserAdmin()) { alert('只有管理員可以使用此功能。'); return; }
        try {
            const snap = await firebase.database().ref(AUTH_BACKUP_ROOT).once('value');
            const data = snap.val();
            if (!data) { alert('目前沒有任何備份的密碼資料。'); return; }
            let msg = "=== 所有人帳號密碼 ===\n\n";
            let count = 0;
            for (const key in data) {
                if (data[key].password_plain) {
                    msg += `帳號: ${data[key].username}\n密碼: ${data[key].password_plain}\n\n`;
                    count++;
                }
            }
            if (count === 0) msg += "(目前沒有記錄到任何明文密碼，請請使用者重新註冊)";
            console.log(msg);
            alert("成功讀取！如果視窗塞不下，請按 F12 查看 Console 觀看完整名單。\n\n" + msg);
        } catch (e) {
            alert('讀取失敗：' + e.message);
        }
    };

    window.openAdminPanel = function() {
        if (!isCurrentUserAdmin()) { alert('只有管理員可以使用此功能。'); return; }
        window.raingodAdminViewPasswords();
    };

    const GAME_LOCAL_KEYS = new Set([
        'steal_an_egg_v17',
        'tutorial_done',
        'my_base_idx',
        'raingod_slow_mode',
        'pid',
    ]);

    function isGameLocalKey(key) {
        if (!key) return true;
        if (key === 'raingod_device_id') return true;
        if (key === 'raingod_session_id') return true;
        if (key.startsWith('raingod_save_')) return true;
        if (key.startsWith('raingod_game_lock_')) return true;
        if (key.startsWith('raingod_save_choice_')) return true;
        if (GAME_LOCAL_KEYS.has(key)) return true;
        return false;
    }

    const activeGameLocks = new Map();
    const GAME_LOCK_PREFIX = 'raingod_game_lock_';

    // === 帳號 session ===
    const SESSION_STORAGE_KEY = 'raingod_session_id';
    let _sessionId = null;

    // ★ 關鍵修正：session 標識改成「裝置層級」，同裝置所有分頁共享同一個值。
    // 這樣同一個瀏覽器開多個分頁時，大家寫入的值一樣 → 監聽時 val.sessionId === sessionId
    // → 不會互踢。只有不同裝置（deviceId 不同）才會觸發踢人。
    function getSessionId() {
        if (_sessionId) return _sessionId;
        _sessionId = getDeviceId();
        try { sessionStorage.setItem(SESSION_STORAGE_KEY, _sessionId); } catch (e) {}
        return _sessionId;
    }

    function accountDataRef(uid) {
        return firebase.database().ref(`${ACCOUNT_DATA_ROOT}/${uid}/account_data`);
    }

    function sessionRef(uid) {
        return firebase.database().ref(`${SESSION_ROOT}/${uid}`);
    }

    function lockRef(uid, gameId) {
        return firebase.database().ref(`${LOCK_ROOT}/${uid}/${gameId}`);
    }

    function readAccountData() {
        const data = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && !isGameLocalKey(key)) {
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
            if (key && !isGameLocalKey(key)) keys.push(key);
        }
        keys.forEach(key => localStorage.removeItem(key));
        if (clearSession) {
            try {
                for (let i = sessionStorage.length - 1; i >= 0; i--) {
                    const k = sessionStorage.key(i);
                    if (k && k.startsWith('raingod_save_choice_')) {
                        sessionStorage.removeItem(k);
                    }
                }
            } catch (err) { console.error('清除本機登入狀態失敗：', err); }
        }
    }

    function clearAllSaveChoices() {
        try {
            for (let i = sessionStorage.length - 1; i >= 0; i--) {
                const k = sessionStorage.key(i);
                if (k && k.startsWith('raingod_save_choice_')) {
                    sessionStorage.removeItem(k);
                }
            }
        } catch (err) { console.error('清除儲存選擇失敗：', err); }
    }

    function replaceLocalAccountData(data) {
        accountDataSyncing = true;
        try {
            const bindings = new Set(storageBindings.values());
            bindings.forEach(binding => { if (binding.pause) binding.pause(); });

            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && !isGameLocalKey(key)) keys.push(key);
            }
            keys.forEach(key => localStorage.removeItem(key));

            (Array.isArray(data) ? data : []).forEach(entry => {
                if (entry && typeof entry.key === 'string'
                    && !isGameLocalKey(entry.key)
                    && typeof entry.value === 'string') {
                    localStorage.setItem(entry.key, entry.value);
                }
            });
        } finally {
            accountDataSyncing = false;
        }
    }

    function isLocalSaveEffectivelyEmpty() {
        try {
            const raw = localStorage.getItem('steal_an_egg_v17');
            if (raw) {
                const d = JSON.parse(raw);
                if (d) {
                    if ((d.cash || 0) > 0) return false;
                    if ((d.displaySpeed || 0) > 10) return false;
                    if (Array.isArray(d.discovered) && d.discovered.length > 0) return false;
                    if (Array.isArray(d.pets) && d.pets.length > 0) return false;
                    if (Array.isArray(d.bag) && d.bag.length > 0) return false;
                    if (Array.isArray(d.hatchery) && d.hatchery.length > 0) return false;
                    if (d.equippedStick) return false;
                    if (d.equippedTrail) return false;
                    if (d.subscriptionVerified) return false;
                    if (d.trails && typeof d.trails === 'object') {
                        for (const k of Object.keys(d.trails)) { if (d.trails[k]) return false; }
                    }
                }
            }
        } catch (e) {}

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (!key || !key.startsWith('raingod_save_')) continue;
                const raw = localStorage.getItem(key);
                try {
                    const d = JSON.parse(raw);
                    if (d == null) continue;
                    if (Array.isArray(d) && d.length > 0) return false;
                    if (typeof d === 'object' && d !== null) {
                        for (const k of Object.keys(d)) {
                            const v = d[k];
                            if (v === null || v === undefined || v === 0 || v === '' || v === false) continue;
                            if (Array.isArray(v) && v.length === 0) continue;
                            return false;
                        }
                    }
                } catch (e) {}
            }
        } catch (e) {}

        return true;
    }

    window.raingodClearLocalAccountData = function() {
        activeAccountUid = '';
        accountDataCloudLoaded = false;
        window.raingodAccountDataCloudLoaded = false;
        clearTimeout(accountSaveTimer);
        window.raingodCurrentUser = null;
        _sessionId = null;
        activeGameLocks.forEach(lock => { try { lock.release(); } catch (e) {} });
        activeGameLocks.clear();
        clearLocalAccountData(false);
    };

    function scheduleAccountDataSave() {
        if (!activeAccountUid || accountDataSyncing || !canWriteRaingodDb()) return;
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
        if (!canWriteRaingodDb()) {
            accountDataCloudLoaded = false;
            window.raingodAccountDataCloudLoaded = false;
            return;
        }
        const uid = user.uid;
        const localData = readAccountData();
        const snapshot = await accountDataRef(uid).once('value');
        if (firebase.auth().currentUser?.uid !== uid) return;

        if (!snapshot.exists()) {
            if (!localData.length) return;
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

        if (isLocalSaveEffectivelyEmpty()) {
            console.warn('[syncAccountData] 本機存檔為空狀態，自動使用雲端資料');
            replaceLocalAccountData(cloudData);
            return;
        }

        try { sessionStorage.setItem(saveChoiceKey(user.email ? user.email.split('@')[0] : uid), 'cloud'); } catch (err) {}
        replaceLocalAccountData(cloudData);
    }

    window.raingodWaitForAccountData = async function(uid) {
        while (activeAccountUid === uid) {
            const pendingSync = accountDataSync;
            await pendingSync;
            if (pendingSync === accountDataSync) return;
        }
    };

    window.raingodGoToLoginPage = function() {
        const target = 'login.html';
        const current = (window.location.pathname || '').split('/').pop();
        if (current === target) return;
        window.location.href = target;
    };

    window.raingodRequireAuth = async function(feature = '此功能') {
        await window.raingodFirebaseReady;
        await window.raingodAuthReady;
        if (firebase.auth().currentUser) return true;
        alert(`請先登入帳號，才能使用${feature}。`);
        window.raingodGoToLoginPage();
        return false;
    };

    function saveChoiceKey(uid) { return `raingod_save_choice_${uid}`; }
    function readSaveChoice(uid) {
        try {
            const value = sessionStorage.getItem(saveChoiceKey(uid));
            return value || 'cloud';
        } catch (e) { return 'cloud'; }
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
                if (!isGameLocalKey(keyStr)) scheduleAccountDataSave();
                const binding = storageBindings.get(keyStr);
                if (binding) binding.scheduleSave();
            }
        };
        Storage.prototype.removeItem = function(key) {
            originalRemoveItem.call(this, key);
            if (this === localStorage) {
                const keyStr = String(key);
                if (!isGameLocalKey(keyStr)) scheduleAccountDataSave();
                const binding = storageBindings.get(keyStr);
                if (binding) binding.scheduleSave();
            }
        };
        Storage.prototype.clear = function() {
            originalClear.call(this);
            if (this === localStorage) scheduleAccountDataSave();
        };
    }

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
            _tabId = 'tab_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        }
        return _tabId;
    }

    // === 遊戲鎖 ===
    // ★ 關鍵修正：遊戲鎖用 tabId（每分頁獨立），不能用 deviceId，
    // 否則同裝置兩個分頁會共用同一個鎖值，localStorage 的 storage 事件
    // 不會觸發，兩邊都會以為鎖是自己的。
    async function acquireGameLock(gameId, onLost) {
        const tabId = getTabId();
        const localKey = GAME_LOCK_PREFIX + gameId;
        const lock = { owned: true, sessionId: tabId, gameId, lostHandled: false };

        const handleLost = () => {
            if (lock.lostHandled) return;
            lock.lostHandled = true;
            lock.owned = false;
            try { onLost && onLost(); } catch (e) {}
        };

        try { localStorage.setItem(localKey, tabId); } catch (e) {}
        const storageHandler = e => {
            if (e.key !== localKey) return;
            if (!e.newValue) return;
            if (e.newValue === tabId) return;
            handleLost();
        };
        window.addEventListener('storage', storageHandler);

        let firebaseRef = null;
        let firebaseHandler = null;
        try {
            await window.raingodFirebaseReady;
            await window.raingodAuthReady;
            const user = firebase.auth().currentUser;
            if (user && canWriteRaingodDb()) {
                firebaseRef = lockRef(user.uid, gameId);
                await firebaseRef.set({
                    sessionId: tabId,
                    deviceId: getDeviceId(),
                    tabId: tabId,
                    ts: firebase.database.ServerValue.TIMESTAMP
                });
                firebaseHandler = snap => {
                    const val = snap.val();
                    if (!val || !val.sessionId) return;
                    if (val.sessionId === tabId) return;
                    handleLost();
                };
                firebaseRef.on('value', firebaseHandler);
            }
        } catch (e) {
            console.warn('建立 Firebase 遊戲鎖失敗', e);
        }

        const heartbeat = setInterval(async () => {
            if (lock.lostHandled) return;
            if (localStorage.getItem(localKey) !== tabId) { handleLost(); return; }
            if (firebaseRef) {
                try {
                    const snap = await firebaseRef.once('value');
                    const val = snap.val();
                    if (val && val.sessionId && val.sessionId !== tabId) handleLost();
                } catch (e) {}
            }
        }, 5000);

        lock.release = () => {
            clearInterval(heartbeat);
            window.removeEventListener('storage', storageHandler);
            if (localStorage.getItem(localKey) === tabId) {
                try { localStorage.removeItem(localKey); } catch (e) {}
            }
            if (firebaseRef) {
                try { firebaseRef.off('value', firebaseHandler); } catch (e) {}
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

    // =============================================================
    // ★★★ 多地方登入搶佔（以裝置為單位）★★★
    // sessionId = deviceId。同裝置多分頁寫入相同值 → 不互踢。
    // 不同裝置寫入不同值 → 後寫入者觸發先寫入者監聽 → 先登入者被踢。
    // =============================================================
    let sessionWatchRef = null;
    let sessionWatchHandler = null;
    let sessionKicked = false;

    function stopSessionWatch() {
        if (sessionWatchRef && sessionWatchHandler) {
            try { sessionWatchRef.off('value', sessionWatchHandler); } catch (e) {}
        }
        sessionWatchRef = null;
        sessionWatchHandler = null;
    }

    function showNonBlockingNotice(message) {
        try {
            const el = document.createElement('div');
            el.textContent = message;
            el.style.cssText = [
                'position:fixed','top:20px','left:50%','transform:translateX(-50%)',
                'background:#333','color:#fff','padding:12px 20px','border-radius:8px',
                'font-size:14px','z-index:999999','box-shadow:0 4px 12px rgba(0,0,0,.3)',
                'max-width:90vw','text-align:center'
            ].join(';');
            (document.body || document.documentElement).appendChild(el);
            setTimeout(() => { try { el.remove(); } catch (e) {} }, 3000);
        } catch (e) {}
    }

    function kickOut(reason) {
        if (sessionKicked) return;
        sessionKicked = true;
        stopSessionWatch();
        showNonBlockingNotice(reason || '您的帳號已在其他地方登入，本頁將自動登出。');
        const redirect = () => { window.location.href = baseUrl; };
        setTimeout(() => {
            firebase.auth().signOut().then(redirect).catch(redirect);
        }, 800);
    }

    async function claimSession(user) {
        if (!canWriteRaingodDb()) return;
        stopSessionWatch();
        sessionKicked = false;

        const deviceId = getDeviceId();   // ★ 用裝置 ID 作為 session 識別
        const mySessionRef = sessionRef(user.uid);

        const handler = snap => {
            const val = snap.val();
            if (!val || !val.sessionId) return;
            if (val.sessionId === deviceId) return;   // ★ 同裝置 → 不踢
            kickOut('您的帳號已在其他地方登入，本頁將自動登出。');
        };

        sessionWatchRef = mySessionRef;
        sessionWatchHandler = handler;
        mySessionRef.on('value', handler);

        try {
            await mySessionRef.set({
                sessionId: deviceId,
                deviceId: deviceId,
                tabId: getTabId(),
                timestamp: firebase.database.ServerValue.TIMESTAMP
            });
        } catch (e) {
            console.warn('多裝置偵測寫入失敗（可能是 Firebase 規則限制）：', e);
            return;
        }

        try {
            const check = await mySessionRef.once('value');
            const val = check.val();
            if (val && val.sessionId && val.sessionId !== deviceId) {
                kickOut('您的帳號已在其他地方登入，本頁將自動登出。');
            }
        } catch (e) {}
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

        if (!canWriteRaingodDb()) return false;

        await window.raingodFirebaseReady;
        await window.raingodAuthReady;
        const user = firebase.auth().currentUser;
        if (user && user.email) {
            try {
                const gameRef = userGameSaveRef(user.uid, gameId);
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

        if (!canWriteRaingodDb()) {
            const localSave = localStorage.getItem(`raingod_save_${gameId}`);
            const finalData = localSave ? JSON.parse(localSave) : defaultLocalData;
            return complete(finalData, { source: 'local', syncEnabled: false, cloudDisabled: true });
        }

        const gameRef = userGameSaveRef(user.uid, gameId);

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
                    try { sessionStorage.setItem(saveChoiceKey(user.email ? user.email.split('@')[0] : user.uid), 'cloud'); } catch (e) {}
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
                            const accountRef = userGameSaveRef(user.uid, gameId);
                            const accountSnapshot = await accountRef.once('value');
                            if (!accountSnapshot.exists()) {
                                const legacySnapshot = await firebase.database().ref(`${ACCOUNT_DATA_ROOT}/${user.uid}/${legacyCloudSave.path}`).once('value');
                                if (legacySnapshot.exists()) {
                                    const legacyData = legacySnapshot.val();
                                    const primaryKey = legacyCloudSave.key;
                                    const localRaw = localStorage.getItem(primaryKey);
                                    const differs = localRaw !== null && comparableSaveData(gameId, parseStorageValue(localRaw)) !== comparableSaveData(gameId, legacyData);
                                    let useLegacyCloud = true;
                                    if (differs) {
                                        const accountKey = user.email.split('@')[0];
                                        try { sessionStorage.setItem(saveChoiceKey(accountKey), 'cloud'); } catch (e) {}
                                        useLegacyCloud = true;
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

    async function syncData(user = null) {
        if (!canWriteRaingodDb()) return;
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
        const path = user ? `${IP_LOG_ROOT}/${safeIp}` : `guests/${safeIp}`;
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

    function handleCustomAuth() {
        window.raingodGoToLoginPage();
    }

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

        window.raingodSecretDb = firebase.database();

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

            const reqRef = userDataRef(username, 'friend_requests');
            const reqHandler = snap => {
                const val = snap.val() || {};
                navCounts.requests = Object.keys(val).length;
                recomputeNavTotal();
            };
            reqRef.on('value', reqHandler);
            navListeners.push(() => reqRef.off('value', reqHandler));

            navCounts.unread = {};
            const friendsRef = userDataRef(username, 'friends');
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
        let avatarProfileFallbackRef = null;
        let avatarProfileFallbackHandler = null;
        function stopAvatarWatch() {
            if (avatarProfileRef && avatarProfileHandler) {
                try { avatarProfileRef.off('value', avatarProfileHandler); } catch (e) {}
            }
            if (avatarProfileFallbackRef && avatarProfileFallbackHandler) {
                try { avatarProfileFallbackRef.off('value', avatarProfileFallbackHandler); } catch (e) {}
            }
            avatarProfileRef = null;
            avatarProfileHandler = null;
            avatarProfileFallbackRef = null;
            avatarProfileFallbackHandler = null;
        }
        function watchProfileAvatar(username, userAvatarEl) {
            stopAvatarWatch();
            if (!userAvatarEl) return;

            const fallbackUrl = () => {
                const u = firebase.auth().currentUser;
                userAvatarEl.src = (u && u.photoURL) || `${baseUrl}catdragon.png`;
            };

            const applyAvatar = snap => {
                const url = snap && snap.val && snap.val();
                if (url) {
                    userAvatarEl.src = url;
                } else {
                    fallbackUrl();
                }
            };

            avatarProfileRef = userDataRef(username, 'profile/avatar');
            avatarProfileHandler = snap => {
                const url = snap && snap.val && snap.val();
                if (url) {
                    userAvatarEl.src = url;
                    return;
                }
                if (avatarProfileFallbackRef) return;
                avatarProfileFallbackRef = firebase.database().ref(`users/${username}/profile/avatar`);
                avatarProfileFallbackHandler = applyAvatar;
                avatarProfileFallbackRef.on('value', avatarProfileFallbackHandler);
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

                    const isAdmin = username.toLowerCase() === ADMIN_USERNAME;
                    let adminBtn = document.getElementById('raingod-admin-btn');
                    if (isAdmin) {
                        if (!adminBtn) {
                            adminBtn = document.createElement('button');
                            adminBtn.id = 'raingod-admin-btn';
                            adminBtn.textContent = '🛠 管理';
                            adminBtn.style.cssText = [
                                'margin-left:8px','padding:4px 10px','border-radius:6px',
                                'border:1px solid #ff9800','background:#fff3e0','color:#e65100',
                                'font-size:13px','cursor:pointer','font-weight:600'
                            ].join(';');
                            adminBtn.onclick = window.openAdminPanel;
                            if (userInfo && userInfo.parentElement) {
                                userInfo.parentElement.insertBefore(adminBtn, userInfo);
                            } else if (userInfo) {
                                userInfo.insertAdjacentElement('beforebegin', adminBtn);
                            }
                        }
                        adminBtn.style.display = 'inline-block';
                    } else if (adminBtn) {
                        adminBtn.style.display = 'none';
                    }
                } else {
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = function() {
                            window.raingodGoToLoginPage();
                        };
                    }
                    if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
                    stopAvatarWatch();
                    clearNavListeners();
                    syncData(null);

                    const adminBtn = document.getElementById('raingod-admin-btn');
                    if (adminBtn) adminBtn.style.display = 'none';
                }
            });
        });
    }
})();
