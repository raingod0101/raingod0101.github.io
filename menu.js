(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();

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

    // --- 混合存檔與閃幣同步核心 ---
    async function syncData(user = null) {
        let rawIp = "Unknown_IP";
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            rawIp = data.ip;
        } catch (e) { console.warn("IP fetch failed"); }

        const safeIp = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

        if (window.firebase && firebase.database) {
            const userRef = firebase.database().ref('users/' + safeIp);

            if (user) {
                // 【已登入模式】
                userRef.on('value', (snapshot) => {
                    const userData = snapshot.val() || {};
                    
                    // 1. 處理閃幣
                    const currentCoins = (userData.flash_coins !== undefined) ? userData.flash_coins : 0;
                    const coinDisplay = document.getElementById('flash-coins-display');
                    if (coinDisplay) coinDisplay.innerText = `⚡ 閃幣: ${currentCoins}`;

                    // 2. 處理遊戲存檔 (雲端同步到本地)
                    if (userData.game_data) {
                        localStorage.setItem('raingod_game_save', JSON.stringify(userData.game_data));
                        console.log("Raingod: 雲端存檔已同步至本地");
                    } else {
                        // 如果雲端沒資料，就把本地目前的資料傳上去
                        const localData = localStorage.getItem('raingod_game_save');
                        if (localData) {
                            userRef.update({ game_data: JSON.parse(localData) });
                        }
                    }

                    // 初始化閃幣
                    if (userData.flash_coins === undefined) userRef.update({ flash_coins: 0 });
                });

                // 更新足跡
                userRef.update({
                    ip: rawIp,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    name: user.displayName,
                    url: window.location.href
                });
            } else {
                // 【訪客模式】僅記錄足跡，存檔保留在本地 localStorage (由遊戲腳本自行控制)
                firebase.database().ref('guests/' + safeIp).update({
                    ip: rawIp,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    url: window.location.href
                });
                console.log("Raingod: 目前為訪客模式，使用 LocalStorage 存檔");
            }
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
            
            // 強制加回 icon (確保 html 內也有)
            const brandA = container.querySelector('.brand');
            if (brandA && !brandA.querySelector('img')) {
                const img = document.createElement('img');
                img.src = "https://raingod0101.github.io/p4.png";
                img.style.cssText = "height: 28px; width: 28px; object-fit: contain; margin-right: 10px; border-radius: 4px;";
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
                    if (loginBtn) loginBtn.style.display = 'none';
                    if (userInfo) userInfo.style.display = 'flex';
                    if (userAvatar) {
                        userAvatar.src = user.photoURL;
                        userAvatar.onclick = () => {
                            if (confirm(`確定要登出嗎？\n登出後將切換回本地存檔。`)) {
                                firebase.auth().signOut().then(() => location.reload());
                            }
                        };
                    }
                    syncData(user);
                } else {
                    if (loginBtn) {
                        loginBtn.style.display = 'flex';
                        loginBtn.onclick = () => firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
                    }
                    if (userInfo) userInfo.style.display = 'none';
                    syncData(null);
                }
            });

            // 背景自適應
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
