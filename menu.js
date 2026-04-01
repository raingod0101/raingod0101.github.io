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

    async function syncData(user = null) {
        let rawIp = "Unknown_IP";
        let locationStr = "Unknown_Location";

        // --- 修正點：使用多重備援抓取 IP，避免 429 錯誤 ---
        try {
            const res = await fetch('https://api.ipify.org?format=json');
            const data = await res.json();
            rawIp = data.ip;
        } catch (e) { console.warn("IP fetch failed, using fallback"); }

        const safeIp = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

        if (window.firebase && firebase.database) {
            // 無論是否抓到 IP，都要嘗試讀取閃幣
            const userRef = firebase.database().ref('users/' + safeIp);
            
            if (user) {
                // 使用 onValue 持續監聽，確保閃幣即時更新
                userRef.on('value', (snapshot) => {
                    const userData = snapshot.val() || {};
                    const currentCoins = (userData.flash_coins !== undefined) ? userData.flash_coins : 0;
                    
                    const coinDisplay = document.getElementById('flash-coins-display');
                    if (coinDisplay) {
                        coinDisplay.innerText = `⚡ 閃幣: ${currentCoins}`;
                    }

                    // 初始化閃幣
                    if (userData.flash_coins === undefined) {
                        userRef.update({ flash_coins: 0 });
                    }
                });

                // 更新基本資訊 (分開更新，避免中斷閃幣監聽)
                userRef.update({
                    ip: rawIp,
                    last_active: firebase.database.ServerValue.TIMESTAMP,
                    name: user.displayName,
                    url: window.location.href,
                    photo_url: user.photoURL
                });
            } else {
                firebase.database().ref('guests/' + safeIp).update({
                    ip: rawIp,
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
            const loginBtn = document.getElementById('login-btn');
            const userInfo = document.getElementById('user-info');
            const userAvatar = document.getElementById('user-avatar');
            
            if (userInfo && !document.getElementById('flash-coins-display')) {
                const coinSpan = document.createElement('span');
                coinSpan.id = 'flash-coins-display';
                coinSpan.style.cssText = "margin-right:12px; font-size:13px; font-weight:bold; color:#FFD700;";
                coinSpan.innerText = "⚡ 閃幣: 讀取中...";
                userInfo.insertBefore(coinSpan, userAvatar);
            }

            firebase.auth().onAuthStateChanged(user => {
                if (user) {
                    if (loginBtn) loginBtn.style.setProperty('display', 'none', 'important');
                    if (userInfo) userInfo.style.setProperty('display', 'flex', 'important');
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
                        loginBtn.style.setProperty('display', 'flex', 'important');
                        loginBtn.onclick = () => {
                            firebase.auth().signInWithPopup(new firebase.auth.GoogleAuthProvider());
                        };
                    }
                    if (userInfo) userInfo.style.setProperty('display', 'none', 'important');
                    syncData(null);
                }
            });

            // 自動適應背景色
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
