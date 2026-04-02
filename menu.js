(function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime();
    let currentIp = "Unknown_IP"; 

    // --- 1. 自動加載資源 (含 Favicon) ---
    async function loadResources() {
        // 設置分頁圖示
        let favicon = document.querySelector("link[rel~='icon']");
        if (!favicon) {
            favicon = document.createElement('link');
            favicon.rel = 'icon';
            document.head.appendChild(favicon);
        }
        favicon.href = `${baseUrl}p4.png`;

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

    // --- 2. 全域存檔函式 ---
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

    // --- 3. 閃幣同步核心 ---
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
                    if (userData.game_data) localStorage.setItem('raingod_game_save', JSON.stringify(userData.game_data));
                });
            }
            const path = user ? `users/${safeIp}` : `guests/${safeIp}`;
            firebase.database().ref(path).update({
                ip: currentIp,
                last_active: firebase.database.ServerValue.TIMESTAMP,
                url: window.location.href
            });
        }
    }

    // --- 4. 初始化導覽列與狀態切換 ---
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
            
            // 補上品牌 Icon
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
            
            // 建立閃幣顯示區域
            if (userInfo && !document.getElementById('flash-coins-display')) {
                const coinSpan = document.createElement('span');
                coinSpan.id = 'flash-coins-display';
                coinSpan.style.cssText = "margin-right:12px; font-size:13px; font-weight:bold; color:#FFD700;";
                coinSpan.innerText = "⚡ 閃幣: --";
                userInfo.insertBefore(coinSpan, userAvatar);
            }

            // 【核心修復】狀態切換邏輯
            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    // 已登入：隱藏登入鈕 (強制)，顯示用戶資訊
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'none', 'important');
                    }
                    if (userInfo) {
                        userInfo.style.setProperty('display', 'flex', 'important');
                    }
                    if (userAvatar) {
                        userAvatar.src = user.photoURL;
                        userAvatar.onclick = () => {
                            if (confirm(`確定要登出嗎？\n登出後會切換回本地存檔。`)) {
                                firebase.auth().signOut().then(() => location.reload());
                            }
                        };
                    }
                    syncData(user);
                } else {
                    // 未登入：顯示登入鈕，隱藏用戶資訊
                    if (loginBtn) {
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = () => firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
                    }
                    if (userInfo) {
                        userInfo.style.setProperty('display', 'none', 'important');
                    }
                    syncData(null);
                }
            });

           // --- 強制黑色主題 (含導覽列與分支) ---
            const nav = container.querySelector('.glass-nav');
            if (nav) {
                // 1. 強制導覽列背景為黑，文字為白
                nav.style.setProperty('background', '#000000', 'important');
                nav.style.setProperty('background-color', '#000000', 'important');
                
                // 2. 遍歷所有子元素（包含選單分支、連結等）
                nav.querySelectorAll('*').forEach(el => {
                    // 背景設為黑
                    el.style.setProperty('background-color', '#000000', 'important');
                    
                    // 除了登入按鈕與閃幣顯示，其餘文字強制設為白色
                    if (!el.classList.contains('login-btn') && el.id !== 'flash-coins-display') {
                        el.style.setProperty('color', '#ffffff', 'important');
                        el.style.setProperty('border-color', '#333333', 'important'); // 分隔線或邊框改深灰
                    }
                });

                // 3. 額外針對 CSS 可能產生的「下拉選單/分支」類別加強
                const style = document.createElement('style');
                style.innerHTML = `
                    .glass-nav, .glass-nav *, .dropdown-menu, .nav-menu { 
                        background-color: #000000 !important; 
                        color: #ffffff !important; 
                    }
                    .glass-nav a:hover {
                        background-color: #222222 !important; /* 滑過時稍微亮一點點 */
                    }
                `;
                document.head.appendChild(style);
            }
        });
    }
})();
