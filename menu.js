/**
 * Raingod 核心導覽列與數據追蹤系統 (2026 版)
 * 功能：Google 登入、IP/裝置/地點追蹤、遊戲存檔同步、自動黑白適應
 */
(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();

    // --- 1. 自動掛載所有必要的資源 ---
    const resources = [
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js" },
        { type: 'css', url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" }
    ];

    async function loadAllResources() {
        for (const res of resources) {
            await new Promise((resolve) => {
                let el;
                if (res.type === 'js') {
                    el = document.createElement('script');
                    el.src = res.url;
                } else {
                    el = document.createElement('link');
                    el.rel = 'stylesheet';
                    el.href = res.url;
                }
                el.onload = resolve;
                document.head.appendChild(el);
            });
        }
        initRaingodSystem();
    }
    loadAllResources();

    // --- 2. 強化版數據追蹤 (IP, Device, Location, Game Data) ---
    async function syncToFirebase(user = null) {
        try {
            // 抓取 IP 與 地理位置 (使用 ipapi.co)
            const geoRes = await fetch('https://ipapi.co/json/');
            const geo = await geoRes.json();
            
            const rawIp = geo.ip || "0.0.0.0";
            const locationStr = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim();
            
            // 抓取 裝置名稱與平台
            const ua = navigator.userAgent;
            let deviceType = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            const deviceFullName = `${deviceType} (${navigator.platform})`;

            // 抓取 遊戲資料 (從 localStorage 讀取)
            // 建議你的遊戲存檔 Key 統一名稱為 'raingod_game_save'
            const localSave = localStorage.getItem('raingod_game_save') || "{}";
            let parsedSave = {};
            try { parsedSave = JSON.parse(localSave); } catch(e) { parsedSave = { raw: localSave }; }

            // 處理 Firebase 不支援的字元 (IP 中的點換成底線)
            const safeIpKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            if (window.firebase && firebase.database) {
                const timestamp = firebase.database.ServerValue.TIMESTAMP;
                const payload = {
                    ip: rawIp,
                    location: locationStr,
                    device_name: deviceFullName,
                    last_active: timestamp,
                    game_data: parsedSave,
                    current_page: window.location.href,
                    user_agent: ua
                };

                // 路徑分流：登入用戶存 users，訪客存 guests
                if (user) {
                    firebase.database().ref('users/' + safeIpKey).update({
                        ...payload,
                        uid: user.uid,
                        display_name: user.displayName,
                        email: user.email,
                        photo_url: user.photoURL
                    });
                } else {
                    firebase.database().ref('guests/' + safeIpKey).update(payload);
                }
                console.log("Raingod Tracker: Data synced to Firebase.");
            }
        } catch (err) {
            console.warn("Raingod Tracker Error:", err);
        }
    }

    // --- 3. 系統初始化 (Firebase + UI) ---
    function initRaingodSystem() {
        // 初始化 Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp({
                apiKey: "AIzaSyB6ddhbgcV0aUgezkJVr61XMrJkcFWYzxI",
                authDomain: "project-161757768102958224.firebaseapp.com",
                databaseURL: "https://project-161757768102958224-default-rtdb.firebaseio.com",
                projectId: "project-161757768102958224",
                storageBucket: "project-161757768102958224.firebasestorage.app",
                appId: "1:245615336743:web:5f1b46b5a74668a2ac5d02"
            });
        }

        const container = document.getElementById('nav_bar');
        if (!container) return;

        // 載入 HTML 結構
        fetch(`${baseUrl}menu.html?v=${v}`)
            .then(res => res.text())
            .then(html => {
                container.innerHTML = html;

                const loginBtn = document.getElementById('login-btn');
                const userInfo = document.getElementById('user-info');
                const userAvatar = document.getElementById('user-avatar');

                // 處理登入/登出狀態
                firebase.auth().onAuthStateChanged((user) => {
                    if (user) {
                        // 已登入
                        if(loginBtn) loginBtn.style.display = 'none';
                        if(userInfo) userInfo.style.display = 'flex';
                        if(userAvatar) {
                            userAvatar.src = user.photoURL;
                            userAvatar.title = `點擊登出: ${user.displayName}`;
                            userAvatar.onclick = () => firebase.auth().signOut();
                        }
                        syncToFirebase(user);
                    } else {
                        // 未登入 (訪客模式)
                        if(loginBtn) {
                            loginBtn.style.display = 'flex';
                            loginBtn.onclick = () => {
                                const provider = new firebase.auth.GoogleAuthProvider();
                                firebase.auth().signInWithPopup(provider).catch(err => {
                                    alert("登入失敗: " + err.message);
                                });
                            };
                        }
                        if(userInfo) userInfo.style.display = 'none';
                        syncToFirebase(null);
                    }
                });

                // --- 4. 自動黑白方案適應 ---
                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let isLightMode = false;
                    
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLightMode = brightness > 128;
                    }

                    const theme = {
                        bg: isLightMode ? '#ffffff' : '#000000',
                        text: isLightMode ? '#000000' : '#ffffff',
                        border: isLightMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'
                    };

                    navElement.style.setProperty('background', theme.bg, 'important');
                    navElement.style.setProperty('border-bottom', `1px solid ${theme.border}`, 'important');
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');

                    const allItems = navElement.querySelectorAll('*');
                    allItems.forEach(el => {
                        const tag = el.tagName.toLowerCase();
                        if (['ul', 'li', 'div', 'span', 'nav'].includes(tag)) {
                            el.style.setProperty('background', theme.bg, 'important');
                        }
                        // 不要覆蓋 Google 登入按鈕的藍色
                        if (!el.classList.contains('login-btn')) {
                            el.style.setProperty('color', theme.text, 'important');
                        }
                        if (el.classList.contains('dropdown-menu')) {
                            el.style.setProperty('border', `1px solid ${theme.border}`, 'important');
                        }
                    });
                }
            });
    }
})();
