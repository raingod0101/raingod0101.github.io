/**
 * Raingod 核心系統 - 閃幣(Flash Coins) 整合版
 * 功能：Google 登入、頭像點擊確認登出、精確追蹤、遊戲存檔、閃幣顯示
 */
(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();

    // --- 1. 自動掛載依賴資源 ---
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

 // --- 2. 數據同步與閃幣處理 (修正讀取不到的問題) ---
async function syncData(user = null) {
    try {
        const geoRes = await fetch('https://ipapi.co/json/');
        const geo = await geoRes.json();
        const rawIp = geo.ip || "Unknown";
        const safeIp = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');
        
        const ua = navigator.userAgent;
        const deviceName = (ua.includes('Mobile') ? "Mobile" : "Desktop") + ` (${navigator.platform})`;
        const gameSave = localStorage.getItem('raingod_game_save') || "{}";

        if (window.firebase && firebase.database) {
            const userRef = firebase.database().ref('users/' + safeIp);
            
            if (user) {
                // 強制讀取一次資料庫
                userRef.on('value', (snapshot) => {
                    const userData = snapshot.val() || {};
                    // 如果 flash_coins 不存在，預設給 0
                    const currentCoins = (userData.flash_coins !== undefined) ? userData.flash_coins : 0;
                    
                    // 確保 UI 更新
                    const coinDisplay = document.getElementById('flash-coins-display');
                    if (coinDisplay) {
                        coinDisplay.innerText = `⚡ 閃幣: ${currentCoins}`;
                    }

                    // 只有在資料不完整時才執行寫入，避免無限迴圈
                    if (userData.flash_coins === undefined) {
                        userRef.update({ flash_coins: 0 });
                    }
                });

                // 更新其他基本資訊
                userRef.update({
                    ip: rawIp,
                    location: `${geo.city || ''} ${geo.country_name || ''}`.trim(),
                    device_name: deviceName,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    name: user.displayName,
                    email: user.email,
                    url: window.location.href
                });
            } else {
                firebase.database().ref('guests/' + safeIp).update({
                    ip: rawIp,
                    last_active: firebase.database.ServerValue.TIMESTAMP
                });
            }
        }
    } catch (e) { console.warn("閃幣同步失敗:", e); }
}
    // --- 3. 初始化系統 ---
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
            
            // 在頭像前面插入閃幣顯示文字
            if (userInfo && !document.getElementById('flash-coins-display')) {
                const coinSpan = document.createElement('span');
                coinSpan.id = 'flash-coins-display';
                coinSpan.style.cssText = "margin-right:12px; font-size:13px; font-weight:bold; color:#FFD700;";
                coinSpan.innerText = "⚡ 閃幣: --";
                userInfo.insertBefore(coinSpan, userAvatar);
            }

            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
                    if (userInfo) userInfo.style.setProperty('display', 'flex', 'important');
                    if (userAvatar) {
                        userAvatar.src = user.photoURL;
                        userAvatar.onclick = () => {
                            if (confirm(`帳號: ${user.displayName}\n確定要登出嗎？`)) {
                                firebase.auth().signOut().then(() => location.reload());
                            }
                        };
                    }
                    syncData(user);
                } else {
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = () => {
                            const provider = new firebase.auth.GoogleAuthProvider();
                            firebase.auth().signInWithPopup(provider);
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
            // 4. 黑白變色
            const nav = container.querySelector('.glass-nav');
            if (nav) {
                const rgb = window.getComputedStyle(document.body).backgroundColor.match(/\d+/g);
                const isLight = rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 128 : false;
                const theme = isLight ? { bg: '#ffffff', text: '#000000' } : { bg: '#000000', text: '#ffffff' };
                nav.style.setProperty('background', theme.bg, 'important');
                nav.querySelectorAll('*').forEach(el => {
                    if (!el.classList.contains('login-btn') && el.id !== 'flash-coins-display') {
                        el.style.setProperty('color', theme.text, 'important');
                    }
                    if (el.classList.contains('dropdown-menu')) el.style.setProperty('background', theme.bg, 'important');
                });
            }
        });
    }
})();

  
