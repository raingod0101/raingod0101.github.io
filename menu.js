document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- 1. 基礎資源注入 (Favicon & FontAwesome) ---
    function injectBase() {
        const link = document.createElement('link');
        link.rel = 'icon'; link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);
        const fa = document.createElement('link');
        fa.rel = 'stylesheet'; fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }
    injectBase();

    // --- 2. 靜默追蹤與資料儲存邏輯 ---
    async function silentTracker(user = null) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const geo = await res.json();
            const trackData = {
                ip: geo.ip || "Unknown",
                location: `${geo.city || ''}, ${geo.country_name || ''}`,
                device: /Android|iPhone|iPad/i.test(navigator.userAgent) ? "Mobile" : "Desktop (" + navigator.platform + ")",
                last_active: Date.now()
            };

            if (user) {
                // 已登入：存到 Firebase users/[UID]
                firebase.database().ref('users/' + user.uid).update(trackData);
            } else {
                // 未登入：存到 LocalStorage 並以 IP 為 key 存入 Firebase (暗地存)
                localStorage.setItem('raingod_guest_data', JSON.stringify(trackData));
                const safeIpKey = trackData.ip.replace(/[\.\$\#\[\]\/]/g, '_');
                firebase.database().ref('guests/' + safeIpKey).update(trackData);
            }
        } catch (e) { console.warn("Tracker Error", e); }
    }

    // --- 3. 注入選單與登入邏輯 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => {
                container.innerHTML = data;
                initAuthUI();
                applyTheme(); // 執行之前的黑白適應邏輯
            });
    }

    function initAuthUI() {
        const navContent = document.querySelector('.nav-content');
        if (!navContent) return;

        // 創建登入區域 (靠右)
        const authArea = document.createElement('div');
        authArea.className = 'auth-area';
        authArea.style.marginLeft = 'auto'; // 關鍵：推向最右邊
        navContent.appendChild(authArea);

        // 監聽 Firebase 登入狀態
        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // 已登入：顯示頭像
                authArea.innerHTML = `
                    <div class="user-profile" style="display: flex; align-items: center; cursor: pointer;">
                        <img src="${user.photoURL}" style="width: 32px; height: 32px; border-radius: 50%; border: 2px solid #00ffcc;">
                    </div>
                `;
                authArea.onclick = () => { if(confirm("確定要登出嗎？")) firebase.auth().signOut(); };
                silentTracker(user);
            } else {
                // 未登入：顯示登入按鈕
                authArea.innerHTML = `
                    <button class="login-btn" style="background: none; border: 1px solid currentColor; color: inherit; padding: 5px 15px; border-radius: 20px; cursor: pointer;">
                        <i class="fa-solid fa-user-circle"></i> 登入
                    </button>
                `;
                authArea.onclick = () => {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    firebase.auth().signInWithPopup(provider);
                };
                silentTracker(null);
            }
        });
    }

    // --- 4. 自動辨識色系 (延續之前邏輯) ---
    function applyTheme() {
        const nav = document.querySelector('.glass-nav');
        if (!nav) return;
        const bodyBg = window.getComputedStyle(document.body).backgroundColor;
        const rgb = bodyBg.match(/\d+/g);
        const isLight = rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 128 : false;
        
        const theme = {
            bg: isLight ? '#ffffff' : '#000000',
            text: isLight ? '#000000' : '#ffffff'
        };

        nav.style.setProperty('background', theme.bg, 'important');
        nav.querySelectorAll('*').forEach(el => {
            el.style.setProperty('color', theme.text, 'important');
            if (['UL', 'LI', 'DIV'].includes(el.tagName)) el.style.setProperty('background', theme.bg, 'important');
        });
    }
});
