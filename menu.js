document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();

    // 1. 自動載入必要資源 (Firebase SDK & FontAwesome)
    const libs = [
        "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js",
        "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js",
        "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js",
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    ];

    async function loadLibs() {
        for (let url of libs) {
            await new Promise(res => {
                const el = url.endsWith('.css') ? document.createElement('link') : document.createElement('script');
                if(url.endsWith('.css')){ el.rel='stylesheet'; el.href=url; } else { el.src=url; }
                el.onload = res;
                document.head.appendChild(el);
            });
        }
        startNavigation();
    }
    loadLibs();

    // 2. 數據同步 (IP, 裝置名稱, 地點, 遊戲資料)
    async function syncData(user = null) {
        try {
            const resp = await fetch('https://ipapi.co/json/');
            const geo = await resp.json();
            const ip = geo.ip || "Unknown";
            const loc = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim();
            const device = (navigator.userAgent.includes('Mobile') ? "Mobile" : "Desktop") + ` (${navigator.platform})`;
            
            // 抓取遊戲資料 (假設存放在 raingod_save)
            const gameData = localStorage.getItem('raingod_save') || "{}";
            const safeIp = ip.replace(/[\.\$\#\[\]\/]/g, '_');

            if (window.firebase && firebase.database) {
                const payload = {
                    ip: ip,
                    device_name: device,
                    location: loc,
                    last_active: Date.now(),
                    game_data: JSON.parse(gameData),
                    url: window.location.href
                };
                const node = user ? `users/${safeIp}` : `guests/${safeIp}`;
                const finalData = user ? { ...payload, uid: user.uid, name: user.displayName, email: user.email } : payload;
                firebase.database().ref(node).update(finalData);
            }
        } catch (e) { console.error("Sync Error:", e); }
    }

    // 3. 導覽列功能啟動
    function startNavigation() {
        const container = document.getElementById('nav_bar');
        if (!container) return;

        // 初始化 Firebase (使用你的專屬配置)
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

        fetch(`${baseUrl}menu.html?v=${v}`).then(r => r.text()).then(html => {
            container.innerHTML = html;

            const loginBtn = document.getElementById('login-btn');
            const userInfo = document.getElementById('user-info');
            const userAvatar = document.getElementById('user-avatar');

            // 登入監聽器
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    loginBtn.style.display = 'none';
                    userInfo.style.display = 'flex';
                    userAvatar.src = user.photoURL;
                    userAvatar.onclick = () => firebase.auth().signOut();
                    syncData(user);
                } else {
                    loginBtn.style.display = 'flex';
                    userInfo.style.display = 'none';
                    loginBtn.onclick = () => {
                        const provider = new firebase.auth.GoogleAuthProvider();
                        firebase.auth().signInWithPopup(provider);
                    };
                    syncData(null);
                }
            });

            // 黑白自適應邏輯
            const nav = container.querySelector('.glass-nav');
            const bodyBg = window.getComputedStyle(document.body).backgroundColor;
            const rgb = bodyBg.match(/\d+/g);
            const isLight = rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 128 : false;
            
            const theme = isLight ? { bg: '#ffffff', text: '#000000' } : { bg: '#000000', text: '#ffffff' };
            nav.style.setProperty('background', theme.bg, 'important');
            nav.querySelectorAll('*').forEach(el => {
                if (!el.classList.contains('login-btn')) el.style.setProperty('color', theme.text, 'important');
                if (el.classList.contains('dropdown-menu')) el.style.setProperty('background', theme.bg, 'important');
            });
        });
    }
});
