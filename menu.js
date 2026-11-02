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

    // ★★★ 新增：管理員帳號常數 ★★★
    const ADMIN_USERNAME = 'raingod';

    // ★★★ 新增：secret 資料庫實例（會在 initSystem 內初始化）★★★
    window.raingodSecretDb = null;

    // ★★★ 新增：判斷目前登入者是否為管理員 ★★★
    function isCurrentUserAdmin() {
        const u = firebase.auth().currentUser;
        if (!u || !u.email) return false;
        return u.email.split('@')[0].toLowerCase() === ADMIN_USERNAME;
    }

    // ★★★ 新增：管理員面板 —— 產生臨時密碼 ★★★
    async function openAdminPanel() {
        if (!isCurrentUserAdmin()) {
            alert('只有管理員可以使用此功能。');
            return;
        }
        if (!window.raingodSecretDb) {
            alert('secret 資料庫尚未初始化，請重新整理頁面。');
            return;
        }
        const uname = prompt('請輸入要重設密碼的使用者名稱：');
        if (!uname) return;
        await resetUserPassword(uname.trim().toLowerCase());
    }

    // ★★★ 新增：為指定使用者產生臨時密碼並寫入 secret DB ★★★
    async function resetUserPassword(uname) {
        if (!isCurrentUserAdmin()) { alert('只有管理員可以使用此功能。'); return; }
        if (!/^[a-zA-Z0-9]+$/.test(uname)) { alert('帳號格式不合。'); return; }
        const db = window.raingodSecretDb;
        try {
            const accSnap = await db.ref('accounts/' + uname).once('value');
            const acc = accSnap.val();
            if (!acc || !acc.uid) {
                alert('查無此帳號：' + uname);
                return;
            }

            const tmpPass = Math.random().toString(36).slice(-4)
                          + Math.random().toString(36).slice(-4);

            await db.ref('accounts/' + uname + '/reset').set({
                tmpPass,
                ts: firebase.database.ServerValue.TIMESTAMP,
                by: ADMIN_USERNAME
            });

            alert(
                '已為「' + uname + '」產生臨時密碼：\n\n' +
                '　　' + tmpPass + '\n\n' +
                '請將此密碼告知使用者。\n' +
                '使用者下次登入時會被要求立即修改密碼。'
            );
        } catch (e) {
            console.error('產生臨時密碼失敗：', e);
            alert('產生臨時密碼失敗，請查看 Console。\n' + e.message);
        }
    }

    // ★★★ 新增：使用者登入失敗時，嘗試套用管理員設定的臨時密碼 ★★★
    async function tryApplyTempPassword(username, email) {
        if (!window.raingodSecretDb) return false;
        try {
            const db = window.raingodSecretDb;
            const resetSnap = await db.ref('accounts/' + username + '/reset').once('value');
            const reset = resetSnap.val();
            if (!reset || !reset.tmpPass) return false;

            let cred;
            try {
                cred = await firebase.auth()
                    .signInWithEmailAndPassword(email, reset.tmpPass);
            } catch (e) {
                console.warn('臨時密碼登入失敗：', e);
                return false;
            }

            const newPass = prompt(
                '管理員已為您設定臨時密碼。\n請設定新的密碼（至少 6 位）：'
            );
            if (!newPass || newPass.length < 6) {
                alert('密碼太短，請重新登入再設定。');
                return true;
            }
            const confirm = prompt('請再次輸入新密碼以確認：');
            if (newPass !== confirm) {
                alert('兩次輸入不一致，請重新登入再設定。');
                return true;
            }

            try {
                await cred.user.updatePassword(newPass);
                await db.ref('accounts/' + username + '/reset').remove();
                alert('密碼已更新成功！請使用新密碼登入。');
                await firebase.auth().signOut();
            } catch (e) {
                console.error('更新密碼失敗：', e);
                alert('更新密碼失敗，請聯繫管理員。\n' + e.message);
            }
            return true;
        } catch (e) {
            console.warn('檢查臨時密碼失敗：', e);
            return false;
        }
    }

    // ★★★ 新增：把管理員函式掛到 window，方便 Console 直接呼叫 ★★★
    window.raingodAdminResetPassword = function(uname) {
        if (!uname) { console.warn('用法：raingodAdminResetPassword("使用者名稱")'); return; }
        return resetUserPassword(String(uname).trim().toLowerCase());
    };

    // ★★★ 新增：遊戲本機 key 白名單（這些不進入帳號資料、不被清空）★★★
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
        if (key.startsWith('raingod_save_')) return true;
        if (key.startsWith('raingod_game_lock_')) return true;
        if (key.startsWith('raingod_save_choice_')) return true;
        if (GAME_LOCAL_KEYS.has(key)) return true;
        return false;
    }

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
            try { sessionStorage.clear(); } catch (err) { console.error('清除本機登入狀態失敗：', err); }
        }
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

        const accountKey = user.email ? user.email.split('@')[0] : uid;
        let choice = readSaveChoice(accountKey);
        if (!choice) {
            const confirmed = window.confirm(
                '此帳號已有雲端資料，且與本機不同。\n\n' +
                '按「確定」：用雲端資料覆蓋本機。\n' +
                '按「取消」：保留本機資料並上傳到雲端。'
            );
            if (!confirmed) {
                await accountDataRef(uid).set({
                    data: localData,
                    updated_at: firebase.database.ServerValue.TIMESTAMP
                });
                try { sessionStorage.setItem(saveChoiceKey(accountKey), 'local'); } catch (err) {}
                return;
            }
            choice = 'cloud';
            try { sessionStorage.setItem(saveChoiceKey(accountKey), choice); } catch (err) {}
        }

        if (firebase.auth().currentUser?.uid !== uid) return;

        if (choice === 'cloud') {
            replaceLocalAccountData(cloudData);
        } else {
            await accountDataRef(uid).set({
                data: localData,
                updated_at: firebase.database.ServerValue.TIMESTAMP
            });
        }
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
            _tabId = 'tab_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
        }
        return _tabId;
    }

    // === 遊戲鎖：同裝置用 localStorage、跨裝置用 Firebase ===
    async function acquireGameLock(gameId, onLost) {
        const sessionId = getSessionId();
        const localKey = GAME_LOCK_PREFIX + gameId;
        const lock = { owned: true, sessionId, gameId, lostHandled: false };

        const handleLost = () => {
            if (lock.lostHandled) return;
            lock.lostHandled = true;
            lock.owned = false;
            try { onLost && onLost(); } catch (e) {}
        };

        try { localStorage.setItem(localKey, sessionId); } catch (e) {}
        const storageHandler = e => {
            if (e.key !== localKey) return;
            if (!e.newValue) return;
            if (e.newValue === sessionId) return;
            handleLost();
        };
        window.addEventListener('storage', storageHandler);

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
            if (val.sessionId === sessionId) return;

            stopSessionWatch();
            alert('您的帳號已在其他地方登入，本頁將自動登出。');
            const redirect = () => { window.location.href = baseUrl; };
            firebase.auth().signOut().then(() => {
                redirect();
            }).catch(redirect);
        };

        sessionWatchRef = sessionRef;
        sessionWatchHandler = handler;

        sessionRef.on('value', handler);

        try {
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
                            '此帳號已有此遊戲的雲端進度，且與本機不同。\n\n' +
                            '按「確定」：用雲端進度覆蓋本機存檔。\n' +
                            '按「取消」：保留本機存檔並上傳到雲端。'
                        );
                        if (!confirmed) {
                            await gameRef.set({
                                data: localData,
                                updated_at: firebase.database.ServerValue.TIMESTAMP
                            });
                            return complete(localData, { source: 'local', syncEnabled: true, uploaded: true });
                        }
                        choice = 'cloud';
                        try { sessionStorage.setItem(saveChoiceKey(accountKey), choice); } catch (e) {}
                    }
                    if (choice === 'local') {
                        await gameRef.set({
                            data: localData,
                            updated_at: firebase.database.ServerValue.TIMESTAMP
                        });
                        return complete(localData, { source: 'local', syncEnabled: true, uploaded: true });
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
                                                '找到此帳號舊版雲端進度，且與本機不同。\n\n' +
                                                '按「確定」：用舊版雲端進度覆蓋本機。\n' +
                                                '按「取消」：保留本機進度並上傳到雲端。'
                                            );
                                            if (!confirmed) {
                                                try {
                                                    localData[primaryKey] = localData[primaryKey];
                                                    await accountRef.set({
                                                        data: localData,
                                                        updated_at: firebase.database.ServerValue.TIMESTAMP
                                                    });
                                                } catch (e) {}
                                                enabled = true;
                                                if (onLoaded) onLoaded(localData, { source: 'local', syncEnabled: true, uploaded: true });
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
                .catch(async err => {
                    // ★★★ 新增：登入失敗時，嘗試套用管理員設定的臨時密碼 ★★★
                    if (err.code === 'auth/wrong-password'
                        || err.code === 'auth/invalid-credential'
                        || err.code === 'auth/invalid-login-credentials') {
                        const applied = await tryApplyTempPassword(
                            email.split('@')[0], email
                        );
                        if (applied) return;
                    }
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
                    // ★★★ 修改：註冊成功後寫入 secret DB 的帳號索引 ★★★
                    .then(async userCredential => {
                        deviceRef.set({
                            username: cleanUser,
                            uid: userCredential.user.uid,
                            created_at: firebase.database.ServerValue.TIMESTAMP
                        });

                        try {
                            if (window.raingodSecretDb) {
                                await window.raingodSecretDb.ref('accounts/' + cleanUser).set({
                                    uid: userCredential.user.uid,
                                    username: cleanUser,
                                    created_at: firebase.database.ServerValue.TIMESTAMP
                                });
                            }
                        } catch (e) {
                            console.warn('secret DB 帳號索引寫入失敗（不影響註冊）：', e);
                        }

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

        // ★★★ 新增：初始化 secret 資料庫（同專案第二個 app 實例）★★★
        try {
            if (!firebase.apps.find(a => a.name === 'secret')) {
                firebase.initializeApp({
                    databaseURL: "https://secret-e0976-default-rtdb.firebaseio.com"
                }, "secret");
            }
            window.raingodSecretDb = firebase.app('secret').database();
        } catch (e) {
            console.error('secret 資料庫初始化失敗：', e);
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

                    // ★★★ 新增：管理員按鈕（只有 raingod 帳號看得到）★★★
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
                            adminBtn.onclick = openAdminPanel;
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
                        loginBtn.onclick = handleCustomAuth;
                    }
                    if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
                    stopAvatarWatch();
                    clearNavListeners();
                    syncData(null);

                    // ★★★ 新增：登出時隱藏管理員按鈕 ★★★
                    const adminBtn = document.getElementById('raingod-admin-btn');
                    if (adminBtn) adminBtn.style.display = 'none';
                }
            });
        });
    }
})();
