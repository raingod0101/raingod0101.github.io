document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    
    // 1. 初始化 Firebase Google 登入 (請確保頁面已引用 Firebase SDK)
    const provider = (typeof firebase !== 'undefined') ? new firebase.auth.GoogleAuthProvider() : null;

    async function handleAuth() {
        const authBtn = document.getElementById('login-btn');
        if (!authBtn) return;

        authBtn.addEventListener('click', () => {
            firebase.auth().signInWithPopup(provider).catch(console.error);
        });

        firebase.auth().onAuthStateChanged(user => {
            const authSection = document.getElementById('auth-section');
            if (user) {
                // 已登入：換成頭像
                authSection.innerHTML = `<img src="${user.photoURL}" class="user-avatar" title="${user.displayName}" id="logout-trigger">`;
                document.getElementById('logout-trigger').onclick = () => firebase.auth().signOut();
                syncData(user); // 同步到 Firebase
            } else {
                // 未登入：顯示按鈕
                authSection.innerHTML = `<button id="login-btn" class="login-trigger"><i class="fa-brands fa-google"></i> 登入</button>`;
                document.getElementById('login-btn').onclick = () => firebase.auth().signInWithPopup(provider);
                syncData(null); // 同步到 LocalStorage
            }
        });
    }

    // 2. 暗地追蹤 IP/裝置 並存儲資料
    async function syncData(user) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const geo = await res.json();
            const rawIp = geo.ip || "Unknown";
            const safeIp = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');
            
            const info = {
                ip: rawIp,
                location: `${geo.city}, ${geo.country_name}`,
                device: navigator.userAgent.includes('Mobile') ? "Mobile" : "Desktop",
                platform: navigator.platform,
                last_active: Date.now()
            };

            if (user && firebase.database) {
                // 已登入：存入雲端 (使用 UID 或 IP)
                firebase.database().ref('users/' + safeIp).update({
                    ...info,
                    uid: user.uid,
                    name: user.displayName,
                    email: user.email
                });
            } else {
                // 未登入：存入 LocalStorage
                localStorage.setItem('raingod_guest_data', JSON.stringify(info));
                // 匿名追蹤仍然寫入 Firebase (如果你想暗地存的話)
                if (firebase.database) {
                    firebase.database().ref('guests/' + safeIp).update(info);
                }
            }
        } catch (e) { console.warn("Sync failed", e); }
    }

    // 3. 載入導覽列與自動顏色適應
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`).then(res => res.text()).then(data => {
            container.innerHTML = data;
            handleAuth(); // 初始化登入邏輯
            
            const nav = container.querySelector('.glass-nav');
            if (!nav) return;

            // 顏色偵測
            const brightness = () => {
                const rgb = window.getComputedStyle(document.body).backgroundColor.match(/\d+/g);
                return rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 : 0;
            };

            const isLight = brightness() > 128;
            const theme = {
                bg: isLight ? '#ffffff' : '#000000',
                text: isLight ? '#1d1d1f' : '#ffffff',
                border: isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
            };

            // 套用顏色
            nav.style.setProperty('background', theme.bg, 'important');
            nav.style.setProperty('border-bottom', `1px solid ${theme.border}`, 'important');
            nav.querySelectorAll('*').forEach(el => {
                if (!el.classList.contains('login-trigger')) {
                    el.style.setProperty('color', theme.text, 'important');
                }
                if (el.classList.contains('dropdown-menu')) {
                    el.style.setProperty('background', theme.bg, 'important');
                }
            });
        });
    }
});
