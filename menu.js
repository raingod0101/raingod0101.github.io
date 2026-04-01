(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();
    let currentIp = "Unknown_IP"; 

    const resources = [
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js" },
        { type: 'css', url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" }
    ];

    async function loadResources() {
        // --- 自動設置分頁圖示 (Favicon) ---
        let favicon = document.querySelector("link[rel~='icon']");
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = `${baseUrl}p4.png`;

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

    // --- 全域工具 1：儲存遊戲資料 (自動判斷本地/雲端) ---
    window.raingodSave = function(gameData) {
        localStorage.setItem('raingod_game_save', JSON.stringify(gameData));
        const user = firebase.auth().currentUser;
        if (user && currentIp !== "Unknown_IP") {
            const safeIp = currentIp.replace(/[\.\$\#\[\]\/]/g, '_');
            firebase.database().ref('users/' + safeIp).update({
                game_data: gameData,
                last_save: firebase.database.ServerValue.TIMESTAMP
            });
        }
    };

    // --- 全域工具 2：增加閃幣 ---
    window.addFlashCoins = function(amount) {
        const user = firebase.auth().currentUser;
        if (user && currentIp !== "Unknown_IP") {
            const safeIp = currentIp.replace(/[\.\$\#\[\]\/]/g, '_');
            const coinRef = firebase.database().ref('users/' + safeIp + '/flash_coins');
            coinRef.transaction((current) => (current || 0) + amount);
        } else {
            console.warn("未登入，無法獲得閃幣");
        }
    };

    async function syncData(user = null) {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            currentIp = data.ip;
        } catch (e) { console.warn("IP fetch failed"); }

        const safeIp = currentIp.replace(/[\.\$\#\[\]\/]/g, '_');

        if (window.firebase && firebase.database) {
            const userRef = firebase.database().ref('users/' + safeIp);
            if (user) {
                userRef.on('value', (snapshot) => {
                    const userData = snapshot.val() || {};
                    const currentCoins = userData.flash_coins || 0;
                    const coinDisplay = document.getElementById('flash-coins-display');
                    if (coinDisplay) coinDisplay.innerText = `⚡ 閃幣: ${currentCoins}`;
                    
                    // 登入後自動同步雲端存檔到本地
                    if (userData.game_data) {
                        localStorage.setItem('raingod_game_save', JSON.stringify(userData.game_data));
                    }
                });
            }
            // 基礎資訊更新
            const path = user ? `users/${safeIp}` : `guests/${safeIp}`;
            firebase.database().ref(path).update({
                ip: currentIp,
                last_active: firebase.database.ServerValue.TIMESTAMP,
                url: window.location.href
            });
        }
    }

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
            
            // 導覽列內的 Icon
            const brandA = container.querySelector('.brand');
            if (brandA && !brandA.querySelector('img')) {
                const img = document.createElement('img');
                img.src = `${baseUrl}p4.png`;
                img.style.cssText = "height: 24px; width: 24px; object-fit: contain; margin-right: 8px; border-radius: 4px;";
                brandA.prepend(img);
            }

            const loginBtn = document.getElementById('login-btn');
            const userInfo = document.getElementById('user-info');
            const userAvatar = document.getElementById('user-avatar');
            
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
                        userAvatar.onclick = () => { if (confirm(`確定要登出嗎？`)) firebase.auth().signOut().then(() => location.reload()); };
                    }
                    syncData(user);
                } else {
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = () => firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
                    }
                    if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
                    syncData(null);
                }
            });

            // 背景自適應
            const nav = container.querySelector('.glass-nav');
            if (nav) {
                const rgb = window.getComputedStyle(document.body).backgroundColor.match(/\d+/g);
                const isLight = (rgb && (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 128);
                const theme = isLight ? { bg: '#ffffff', text: '#000000' } : { bg: '#000000', text: '#ffffff' };
                nav.style.setProperty('background', theme.bg, 'important');
                nav.querySelectorAll('*').forEach(el => {
                    if (!el.classList.contains('login-btn') && el.id !== 'flash-coins-display') el.style.setProperty('color', theme.text, 'important');
                });
            }
        });
    }
})();
