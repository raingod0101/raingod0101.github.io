(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();
    let currentIp = "Unknown_IP"; // 用於全域存檔路徑

    const resources = [
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-app-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-auth-compat.js" },
        { type: 'js', url: "https://www.gstatic.com/firebasejs/9.1.3/firebase-database-compat.js" },
        { type: 'css', url: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" }
    ];

    async function loadResources() {
        // --- 修正 1：自動設置網頁分頁圖示 (Favicon) ---
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

    // --- 修正 2：定義全域存檔函式 ---
    window.raingodSave = function(gameData) {
        // 1. 永遠先存本地
        localStorage.setItem('raingod_game_save', JSON.stringify(gameData));
        console.log("Raingod: 本地存檔成功");

        // 2. 檢查是否登入，若有則同步雲端
        const user = firebase.auth().currentUser;
        if (user && currentIp !== "Unknown_IP") {
            const safeIp = currentIp.replace(/[\.\$\#\[\]\/]/g, '_');
            firebase.database().ref('users/' + safeIp).update({
                game_data: gameData,
                last_save: firebase.database.ServerValue.TIMESTAMP
            }).then(() => console.log("Raingod: 雲端同步成功"));
        }
    };

    async function syncData(user = null) {
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            currentIp = data.ip; // 更新到全域變數
        } catch (e) { console.warn("IP fetch failed"); }

        const safeIp = currentIp.replace(/[\.\$\#\[\]\/]/g, '_');

        if (window.firebase && firebase.database) {
            const userRef = firebase.database().ref('users/' + safeIp);

            if (user) {
                userRef.on('value', (snapshot) => {
                    const userData = snapshot.val() || {};
                    // 顯示閃幣
                    const currentCoins = userData.flash_coins || 0;
                    const coinDisplay = document.getElementById('flash-coins-display');
                    if (coinDisplay) coinDisplay.innerText = `⚡ 閃幣: ${currentCoins}`;

                    // 雲端同步到本地 (僅在本地沒資料或雲端更新時)
                    if (userData.game_data) {
                        localStorage.setItem('raingod_game_save', JSON.stringify(userData.game_data));
                    }
                });
                
                userRef.update({
                    ip: currentIp,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    name: user.displayName,
                    photo_url: user.photoURL
                });
            } else {
                firebase.database().ref('guests/' + safeIp).update({
                    ip: currentIp,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    url: window.location.href
                });
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
            
            // 導覽列圖示處理
            const brandA = container.querySelector('.brand');
            if (brandA && !brandA.querySelector('img')) {
                const img = document.createElement('img');
                img.src = `${baseUrl}p4.png`;
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
                            if (confirm(`確定要登出嗎？`)) {
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

            // 亮度自適應
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
                });
            }
        });
    }
})();
