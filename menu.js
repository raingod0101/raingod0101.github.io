document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";

    // 1. 處理 Google 登入與頭像切換
    function initAuth() {
        const authSection = document.getElementById('auth-section');
        if (!authSection) return;

        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                // 已登入
                authSection.innerHTML = `<img src="${user.photoURL}" class="user-avatar" id="logout-btn" title="點擊登出: ${user.displayName}">`;
                document.getElementById('logout-btn').onclick = () => firebase.auth().signOut();
                await syncUserData(user); 
            } else {
                // 未登入
                authSection.innerHTML = `<button class="login-trigger" id="login-btn"><i class="fa-brands fa-google"></i> 登入</button>`;
                document.getElementById('login-btn').onclick = () => {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    firebase.auth().signInWithPopup(provider);
                };
                await syncUserData(null);
            }
        });
    }

    // 2. 暗地追蹤與儲存 (Firebase + LocalStorage)
    async function syncUserData(user) {
        try {
            const res = await fetch('https://ipapi.co/json/');
            const geo = await res.json();
            const ip = geo.ip || "Unknown";
            const safeIp = ip.replace(/[\.\$\#\[\]\/]/g, '_');
            
            const info = {
                ip: ip,
                location: `${geo.city}, ${geo.country_name}`,
                device: navigator.userAgent.includes('Mobile') ? "Mobile" : "Desktop",
                platform: navigator.platform,
                last_active: Date.now()
            };

            if (user) {
                // 登入者：存入 users 節點
                firebase.database().ref('users/' + safeIp).update({
                    ...info, uid: user.uid, name: user.displayName, email: user.email
                });
            } else {
                // 未登入：存入 LocalStorage 並暗中存入 guests 節點
                localStorage.setItem('raingod_visitor', JSON.stringify(info));
                firebase.database().ref('guests/' + safeIp).update(info);
            }
        } catch (e) { console.error("Tracking Error:", e); }
    }

    // 3. 載入選單與自適應顏色
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html?v=${new Date().getTime()}`)
            .then(res => res.text())
            .then(data => {
                container.innerHTML = data;
                initAuth(); // 啟動登入監聽

                const nav = container.querySelector('.glass-nav');
                if (!nav) return;

                // 偵測背景色
                const rgb = window.getComputedStyle(document.body).backgroundColor.match(/\d+/g);
                const brightness = rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 : 0;
                const isLight = brightness > 128;

                // 設定顏色：純黑(#000)或純白(#FFF)
                const bgColor = isLight ? '#ffffff' : '#000000';
                const textColor = isLight ? '#1d1d1f' : '#ffffff';
                const borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)';

                nav.style.setProperty('background', bgColor, 'important');
                nav.style.setProperty('border-bottom', `1px solid ${borderColor}`, 'important');

                // 強制覆蓋所有子元素
                const els = nav.querySelectorAll('*');
                els.forEach(el => {
                    if (!el.classList.contains('login-trigger')) {
                        el.style.setProperty('color', textColor, 'important');
                    }
                    if (el.classList.contains('dropdown-menu')) {
                        el.style.setProperty('background', bgColor, 'important');
                    }
                });
            });
    }
});
