(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();

    // 1. 自動加載所有依賴 (Firebase + CSS)
    const resources = [
        "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js",
        "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js",
        "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js",
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    ];

    async function loadResources() {
        for (const url of resources) {
            await new Promise(resolve => {
                const el = url.endsWith('.css') ? document.createElement('link') : document.createElement('script');
                if(url.endsWith('.css')){ el.rel='stylesheet'; el.href=url; } else { el.src=url; }
                el.onload = resolve;
                document.head.appendChild(el);
            });
        }
        initApp();
    }
    loadResources();

    // 2. 數據存儲邏輯 (IP, 裝置名稱, 地點, 遊戲資料)
    async function trackData(user = null) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const geo = await res.json();
            
            const ip = geo.ip || "Unknown";
            const location = `${geo.city || ''}, ${geo.country_name || ''}`;
            const device = (navigator.userAgent.includes('Mobile') ? "Mobile" : "Desktop") + ` (${navigator.platform})`;
            
            // 讀取所有遊戲資料 (如果是 JSON 字串就解析)
            const gameDataRaw = localStorage.getItem('raingod_game_save') || "{}";
            let gameData = {};
            try { gameData = JSON.parse(gameDataRaw); } catch(e) { gameData = { raw: gameDataRaw }; }

            const safeIp = ip.replace(/[\.\$\#\[\]\/]/g, '_');

            if (window.firebase && firebase.database) {
                const payload = {
                    ip: ip,
                    device_name: device,
                    location: location,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    game_save: gameData,
                    current_url: window.location.href
                };

                const refPath = user ? `users/${safeIp}` : `guests/${safeIp}`;
                const finalData = user ? { ...payload, uid: user.uid, name: user.displayName, email: user.email } : payload;
                
                firebase.database().ref(refPath).update(finalData);
            }
        } catch (e) { console.error("Tracking Error:", e); }
    }

    // 3. 初始化導覽列與登入功能
    function initApp() {
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

        fetch(`${baseUrl}menu.html?v=${v}`).then(r => r.text()).then(data => {
            container.innerHTML = data;

            const loginBtn = document.getElementById('login-btn');
            const userPfp = document.getElementById('user-pfp');

            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    loginBtn.style.display = 'none';
                    userPfp.style.display = 'block';
                    userPfp.src = user.photoURL;
                    userPfp.title = `登出: ${user.displayName}`;
                    userPfp.onclick = () => firebase.auth().signOut();
                    trackData(user);
                } else {
                    loginBtn.style.display = 'block';
                    userPfp.style.display = 'none';
                    loginBtn.onclick = () => {
                        const provider = new firebase.auth.GoogleAuthProvider();
                        firebase.auth().signInWithPopup(provider).catch(err => alert("登入失敗: " + err.message));
                    };
                    trackData(null);
                }
            });

            // 黑白亮度自適應
            const nav = container.querySelector('.glass-nav');
            const rgb = window.getComputedStyle(document.body).backgroundColor.match(/\d+/g);
            const isLight = rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 128 : false;
            
            const theme = isLight ? { bg: '#ffffff', text: '#000000' } : { bg: '#000000', text: '#ffffff' };
            nav.style.setProperty('background', theme.bg, 'important');
            nav.querySelectorAll('*').forEach(el => {
                if (el.id !== 'login-btn') el.style.setProperty('color', theme.text, 'important');
                if (el.classList.contains('dropdown-menu')) el.style.setProperty('background', theme.bg, 'important');
            });
        });
    }
})();
