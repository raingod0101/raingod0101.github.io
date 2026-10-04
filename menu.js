(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();
    let currentIp = "Unknown_IP"; 

    // --- 0. 設定網頁 Icon (Favicon 修正機制) ---
    function setFavicon() {
        const iconUrl = `${baseUrl}catdragon.png`;
        
        // 移除舊有任何相關的 favicon 標籤，避免被原有設定覆蓋
        const existingIcons = document.querySelectorAll("link[rel*='icon']");
        existingIcons.forEach(el => el.remove());

        // 建立全新的 Favicon link
        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.type = 'image/png';
        favicon.href = `${iconUrl}?v=${v}`; // 加快取防刷參數
        
        (document.head || document.documentElement).appendChild(favicon);
    }

    if (document.head) {
        setFavicon();
    } else {
        document.addEventListener('DOMContentLoaded', setFavicon);
    }

    // --- 全域與同步設定 ---
    let markFirebaseReady;
    let markAuthReady;
    window.raingodFirebaseReady = new Promise(resolve => { markFirebaseReady = resolve; });
    window.raingodAuthReady = new Promise(resolve => { markAuthReady = resolve; });
    let markAccountDataReady;
    window.raingodAccountDataReady = new Promise(resolve => { markAccountDataReady = resolve; });
    const storageBindings = new Map();
    let storageSyncInstalled = false;
    let accountDataSync = Promise.resolve();
    let accountDataSyncing = false;
    let accountDataCloudLoaded = false;
    let activeAccountUid = '';
    let accountSaveTimer = null;
    window.raingodAccountDataCloudLoaded = false;

    function accountDataRef(uid) {
        return firebase.database().ref(`users/${uid}/account_data`);
    }

    function readAccountData() {
        const data = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== 'raingod_device_id') {
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
        bindings.forEach(binding => {
            if (binding.pause) binding.pause();
        });
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

    function replaceLocalAccountData(data) {
        accountDataSyncing = true;
        try {
            const bindings = new Set(storageBindings.values());
            bindings.forEach(binding => {
                if (binding.pause) binding.pause();
            });
            clearLocalAccountData(false);
            (Array.isArray(data) ? data : []).forEach(entry => {
                if (entry && typeof entry.key === 'string' && entry.key !== 'raingod_device_id' && typeof entry.value === 'string') {
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
            if (!entry || typeof entry.key !== 'string' || entry.key === 'raingod_device_id' || typeof entry.value !== 'string' || cloudKeys.has(entry.key)) return true;
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
            choice = window.confirm('此帳號已有雲端資料，且與本機資料不同。是否用雲端帳號資料覆蓋本機？按「取消」會保留本機資料並同步至此帳號。此選擇在本次登入期間只詢問一次。') ? 'cloud' : 'local';
            try { sessionStorage.setItem(saveChoiceKey(accountKey), choice); } catch (err) { console.error('保存同步選擇失敗：', err); }
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

    function saveChoiceKey(uid) {
        return `raingod_save_choice_${uid}`;
    }

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
            if (this === localStorage) scheduleAccountDataSave();
            const binding = this === localStorage && storageBindings.get(String(key));
            if (binding) binding.scheduleSave();
        };
        Storage.prototype.removeItem = function(key) {
            originalRemoveItem.call(this, key);
            if (this === localStorage) scheduleAccountDataSave();
            const binding = this === localStorage && storageBindings.get(String(key));
            if (binding) binding.scheduleSave();
        };
        Storage.prototype.clear = function() {
            originalClear.call(this);
            if (this === localStorage) scheduleAccountDataSave();
        };
    }

    // --- 0. 裝置唯一識別碼 (Device ID) 處理 ---
    function getDeviceId() {
        let deviceId = localStorage.getItem('raingod_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem('raingod_device_id', deviceId);
        }
        return deviceId;
    }

    // --- 1. 自動加載資源 ---
    async function loadResources() {
        const resources = [
            { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js" },
            { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js" },
            { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js" },
            { type: 'css', url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" }
        ];

        for (const res of resources) {
            await new Promise((resolve) => {
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

    // --- 2. 全域存檔 API (供各子頁面/遊戲呼叫) ---

    window.raingodOnAuthStateChanged = function(callback) {
        return firebase.auth().onAuthStateChanged(callback);
    };

    // 【儲存存檔】存入 localStorage 並同步上傳至帳號資料庫
    window.raingodSave = async function(gameId, gameData) {
        if (!gameId) {
            console.error("raingodSave 錯誤：必須指定 gameId (例如 'game_a')");
            return false;
        }
        
        // 1. 本地更新
        localStorage.setItem(`raingod_save_${gameId}`, JSON.stringify(gameData));
        
        // 2. 雲端同步
        await window.raingodFirebaseReady;
        await window.raingodAuthReady;
        const user = firebase.auth().currentUser;
        if (user) {
            const username = user.email ? user.email.split('@')[0] : null;
            if (username) {
                try {
                    await firebase.database().ref(`users/${username}/games/${gameId}`).set({
                        data: gameData,
                        updated_at: firebase.database.ServerValue.TIMESTAMP
                    });
                    return true;
                } catch (err) {
                    console.error("帳號存檔失敗：", err);
                }
            }
        }
        return false;
    };

    // 【初始化與讀取】自動判斷是否為「第一次遊玩」以防資料被覆蓋
    window.raingodInitGame = async function(gameId, defaultLocalData, onComplete) {
        if (!gameId) {
            console.error("raingodInitGame 錯誤：必須指定 gameId");
            return null;
        }

        await window.raingodFirebaseReady;
        await window.raingodAuthReady;
        const user = firebase.auth().currentUser;
        if (user) await window.raingodWaitForAccountData(user.uid);
        const complete = (data, details) => {
            if (onComplete) onComplete(data, details);
            return data;
        };

        // 若未登入，直接優先載入 localStorage 本地資料
        if (!user) {
            const localSave = localStorage.getItem(`raingod_save_${gameId}`);
            const finalData = localSave ? JSON.parse(localSave) : defaultLocalData;
            return complete(finalData, { source: 'local', syncEnabled: false });
        }

        if (accountDataCloudLoaded) {
            const accountGameSave = localStorage.getItem(`raingod_save_${gameId}`);
            if (accountGameSave !== null) {
                return complete(JSON.parse(accountGameSave), { source: 'account', syncEnabled: true });
            }
        }

        const username = user.email.split('@')[0];
        const gameRef = firebase.database().ref(`users/${username}/games/${gameId}`);

        return gameRef.once('value').then(async snapshot => {
            if (snapshot.exists()) {
                const cloudData = snapshot.val().data;
                const localSave = localStorage.getItem(`raingod_save_${gameId}`);
                const localData = localSave ? JSON.parse(localSave) : null;
                const localDiffers = localSave !== null && comparableSaveData(gameId, localData) !== comparableSaveData(gameId, cloudData);

                if (localDiffers) {
                    const accountKey = user.email ? user.email.split('@')[0] : user.uid;
                    let choice = readSaveChoice(accountKey);
                    if (!choice) {
                        choice = window.confirm("此帳號已有雲端進度，且與本機不同。是否用帳號雲端進度覆蓋本機的全部遊戲存檔？按「取消」會保留本機進度。此選擇在本次登入期間只詢問一次。") ? 'cloud' : 'local';
                        try { sessionStorage.setItem(saveChoiceKey(accountKey), choice); } catch (e) {}
                    }
                    if (choice === 'local') {
                        return complete(localData, { source: 'local', syncEnabled: false, conflict: true });
                    }
                }

                localStorage.setItem(`raingod_save_${gameId}`, JSON.stringify(cloudData));
                return complete(cloudData, { source: 'cloud', syncEnabled: true });
            } else {
                // 【首次遊玩】帳號下無該遊戲紀錄 -> 將目前的本地資料（或預設值）上傳至雲端建檔
                const localSave = localStorage.getItem(`raingod_save_${gameId}`);
                const initialData = localSave ? JSON.parse(localSave) : defaultLocalData;
                
                await gameRef.set({
                    data: initialData,
                    updated_at: firebase.database.ServerValue.TIMESTAMP
                });
                return complete(initialData, { source: 'local', syncEnabled: true, created: true });
            }
        }).catch(err => {
            console.error("讀取雲端存檔失敗：", err);
            const localSave = localStorage.getItem(`raingod_save_${gameId}`);
            const fallbackData = localSave ? JSON.parse(localSave) : defaultLocalData;
            return complete(fallbackData, { source: 'local', syncEnabled: false, error: err });
        });
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
                                            choice = window.confirm("找到此帳號舊版雲端進度，且與本機不同。是否用舊版雲端進度覆蓋本機？此選擇在本次登入期間只詢問一次。") ? 'cloud' : 'local';
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
                        if (initialState) {
                            initialState = false;
                            resolve();
                        }
                    }
                });
            });
        });
    };

    // --- 3. 數據同步與訪客追蹤 ---
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
                ip: ip,
                device: device,
                location: location,
                last_active: now,
                first_seen: firstSeen,
                total_time_ms: now - firstSeen,
                url: window.location.href
            });
        }).catch(err => console.warn("Database sync restricted:", err));
    }

    // --- 4. 自訂 帳號/密碼 與 限制一機一號 核心邏輯 ---
    function handleCustomAuth() {
        const choice = prompt("請選擇功能：\n1. 登入\n2. 註冊新帳號\n(請輸入數字 1 或 2)");

        if (choice === '1') {
            // === 登入流程 ===
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
            // === 註冊流程（限制一機一號）===
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

    // --- 5. 初始化導覽列與狀態切換 ---
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
                clearLocalAccountData();
            }

            window.raingodCurrentUser = user;
            if (user) {
                activeAccountUid = user.uid;
                accountDataSync = syncAccountData(user).catch(err => {
                    console.error('載入帳號資料失敗：', err);
                });
                await accountDataSync;
            }

            if (!authReadyResolved) {
                authReadyResolved = true;
                markAuthReady(user);
                markAccountDataReady();
            }
        });

        const container = document.getElementById('nav_bar');
        if (!container) return;

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

            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
                    if (userInfo) userInfo.style.setProperty('display', 'flex', 'important');
                    if (userAvatar) {
                        userAvatar.src = user.photoURL || `${baseUrl}catdragon.png`;
                        const displayUsername = user.email ? user.email.split('@')[0] : 'User';
                        userAvatar.title = "帳號：" + displayUsername;
                        userAvatar.onclick = () => {
                            if (confirm(`目前登入帳號：${displayUsername}\n確定要登出嗎？`)) {
                                firebase.auth().signOut().then(() => {
                                    window.raingodClearLocalAccountData();
                                    location.reload();
                                }).catch(err => {
                                    alert("登出失敗：" + err.message);
                                });
                            }
                        };
                    }
                    syncData(user);
                } else {
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = handleCustomAuth;
                    }
                    if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
                    syncData(null);
                }
            });

            // --- 強制黑色主題 ---
            const nav = container.querySelector('.glass-nav');
            if (nav) {
                nav.style.setProperty('background', '#000000', 'important');
                nav.style.setProperty('background-color', '#000000', 'important');
                nav.querySelectorAll('*').forEach(el => {
                    el.style.setProperty('background-color', '#000000', 'important');
                    if (!el.classList.contains('login-btn')) {
                        el.style.setProperty('color', '#ffffff', 'important');
                        el.style.setProperty('border-color', '#333333', 'important');
                    }
                });
                const style = document.createElement('style');
                style.innerHTML = `
                    .glass-nav, .glass-nav *, .dropdown-menu, .nav-menu { 
                        background-color: #000000 !important; 
                        color: #ffffff !important; 
                    }
                    .glass-nav a:hover {
                        background-color: #222222 !important; 
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }
})();
