document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- 1. Favicon ---
    function updateIcon() {
        const link = document.createElement('link');
        link.type = 'image/png'; link.rel = 'icon';
        link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);
    }
    updateIcon();

    // --- 2. FontAwesome ---
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // --- 3. 強化版追蹤與數據儲存 (包含 Google 身份) ---
    async function silentTracker(user = null) {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown";
            
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            function writeToFirebase() {
                if (typeof firebase !== 'undefined' && firebase.database) {
                    const dataPayload = {
                        ip: rawIp,
                        device_name: device,
                        location: location,
                        last_active: Date.now()
                    };

                    if (user) {
                        // 如果有登入，存入 users 並記錄身份
                        firebase.database().ref('users/' + safeUserKey).update({
                            ...dataPayload,
                            uid: user.uid,
                            name: user.displayName,
                            email: user.email
                        });
                    } else {
                        // 沒登入，暗地存入 guests，並存在 localStorage
                        localStorage.setItem('raingod_guest_info', JSON.stringify(dataPayload));
                        firebase.database().ref('guests/' + safeIp).update(dataPayload);
                    }
                } else {
                    setTimeout(writeToFirebase, 1000);
                }
            }
            writeToFirebase();
        } catch (err) {
            console.warn("Tracker API failed:", err);
        }
    }

    // --- 4. 登入 UI 邏輯 ---
    function initAuthLogic() {
        const authRoot = document.getElementById('user-auth-root');
        if (!authRoot) return;

        firebase.auth().onAuthStateChanged(user => {
            if (user) {
                // 已登入：顯示頭像，點擊登出
                authRoot.innerHTML = `<img src="${user.photoURL}" class="user-pfp" id="logout-btn" title="登出: ${user.displayName}">`;
                document.getElementById('logout-btn').onclick = () => firebase.auth().signOut();
                silentTracker(user); // 傳入 user 進行存儲
            } else {
                // 未登入：顯示登入按鈕
                authRoot.innerHTML = `<button class="login-btn" id="login-btn"><i class="fa-brands fa-google"></i> 登入</button>`;
                document.getElementById('login-btn').onclick = () => {
                    const provider = new firebase.auth.GoogleAuthProvider();
                    firebase.auth().signInWithPopup(provider).catch(console.error);
                };
                silentTracker(null); // 以訪客身份追蹤
            }
        });
    }

    // --- 5. 注入選單 (自動黑白適應) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                initAuthLogic(); // 啟動登入區域

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let isLightMode = false;
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLightMode = brightness > 128;
                    }

                    const bgColor = isLightMode ? '#ffffff' : '#000000';
                    const textColor = isLightMode ? '#000000' : '#ffffff';
                    const borderColor = isLightMode ? '#eeeeee' : '#333333';

                    navElement.style.setProperty('background', bgColor, 'important');
                    navElement.style.setProperty('background-color', bgColor, 'important');

                    const allSub = navElement.querySelectorAll('*');
                    allSub.forEach(el => {
                        const tag = el.tagName.toLowerCase();
                        if (['ul', 'li', 'div', 'nav', 'span'].includes(tag)) {
                            el.style.setProperty('background', bgColor, 'important');
                            el.style.setProperty('background-color', bgColor, 'important');
                        }
                        // 排除登入按鈕的文字顏色，避免藍色按鈕文字變色
                        if (!el.classList.contains('login-btn')) {
                            el.style.setProperty('color', textColor, 'important');
                        }
                        el.style.setProperty('border-color', borderColor, 'important');
                    });
                }
            });
    }
});
