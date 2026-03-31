/**
 * Raingod 核心導覽列與數據同步系統 (Final Version)
 * 包含：自動加載資源、Google 登入/隱藏、頭像點擊登出、完整數據追蹤、遊戲存檔同步
 */
(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();

    // --- 1. 自動掛載依賴資源 (Firebase SDK, FontAwesome) ---
    const resources = [
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js" },
        { type: 'css', url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" }
    ];

    async function loadResources() {
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

    // --- 2. 數據同步核心 (IP, 地點, 裝置名稱, 遊戲存檔) ---
    async function syncData(user = null) {
        try {
            // 獲取 IP 與 地理位置
            const geoRes = await fetch('https://ipapi.co/json/');
            const geo = await geoRes.json();
            const rawIp = geo.ip || "Unknown";
            const safeIp = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');
            
            // 獲取 裝置與系統資訊
            const ua = navigator.userAgent;
            const isMobile = /Android|iPhone|iPad/i.test(ua);
            const deviceName = (isMobile ? "Mobile" : "Desktop") + ` (${navigator.platform})`;

            // 獲取 遊戲存檔 (自動嘗試解析 JSON)
            const localSave = localStorage.getItem('raingod_game_save') || "{}";
            let parsedSave = {};
            try { parsedSave = JSON.parse(localSave); } catch(e) { parsedSave = { raw_text: localSave }; }

            if (window.firebase && firebase.database) {
                const payload = {
                    ip: rawIp,
                    location: `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim(),
                    device_name: deviceName,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    game_data: parsedSave,
                    current_url: window.location.href,
                    user_agent: ua
                };

                const path = user ? `users/${safeIp}` : `guests/${safeIp}`;
                const finalData = user ? { ...payload, uid: user.uid, name: user.displayName, email: user.email } : payload;
                
                firebase.database().ref(path).update(finalData);
            }
        } catch (e) { console.warn("Sync Failed:", e); }
    }

    // --- 3. 初始化導覽列功能 ---
    function initSystem() {
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

        fetch(`${baseUrl}menu.html?v=${v}`).then(r => r.text()).then(html => {
            container.innerHTML = html;

            const loginBtn = document.getElementById('login-btn');
            const userInfo = document.getElementById('user-info');
            const userAvatar = document.getElementById('user-avatar');

            // 登入狀態監聽器
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    // 已登入：隱藏登入鈕，顯示頭像
                    if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
                    if (userInfo) userInfo.style.setProperty('display', 'flex', 'important');
                    if (userAvatar) {
                        userAvatar.src = user.photoURL;
                        userAvatar.title = `使用者：${user.displayName} (點擊登出)`;
                        // 點擊頭像觸發登出確認
                        userAvatar.onclick = () => {
                            if (confirm(`確定要登出帳號「${user.displayName}」嗎？`)) {
                                firebase.auth().signOut().then(() => location.reload());
                            }
                        };
                    }
                    syncData(user);
                } else {
                    // 未登入：顯示登入鈕，隱藏頭像
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = () => {
                            const provider = new firebase.auth.GoogleAuthProvider();
                            firebase.auth().signInWithPopup(provider).catch(e => alert("登入錯誤: " + e.message));
                        };
                    }
                    if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
                    syncData(null);
                }
            });

    // 1. 強力 Favicon 注入
    function updateIcon() {
        const oldIcons = document.querySelectorAll("link[rel*='icon']");
        oldIcons.forEach(el => el.remove());
        const link = document.createElement('link');
        link.type = 'image/png';
        link.rel = 'icon';
        link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);
    }
    updateIcon();
            // --- 4. 自動亮度自適應邏輯 ---
            const nav = container.querySelector('.glass-nav');
            if (nav) {
                const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bodyBg.match(/\d+/g);
                const isLight = rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 128 : false;
                
                const theme = isLight ? { bg: '#ffffff', text: '#000000' } : { bg: '#000000', text: '#ffffff' };
                nav.style.setProperty('background', theme.bg, 'important');
                nav.querySelectorAll('*').forEach(el => {
                    if (!el.classList.contains('login-btn')) el.style.setProperty('color', theme.text, 'important');
                    if (el.classList.contains('dropdown-menu')) el.style.setProperty('background', theme.bg, 'important');
                });
            }
        });
    }
})();
