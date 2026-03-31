document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- 1. Favicon 與 FontAwesome ---
    function initAssets() {
        const link = document.createElement('link');
        link.type = 'image/png'; link.rel = 'icon';
        link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);

        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }
    initAssets();

    // --- 2. 核心儲存功能 (IP, 裝置, 地點, 遊戲資料) ---
    async function syncUserData(user = null) {
        try {
            // 抓取 IP 與 地理位置
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown";
            
            // 抓取 裝置名稱
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            // 抓取 本地遊戲資料 (若有存放在 localStorage 的話)
            const localGameData = localStorage.getItem('raingod_game_save') || "{}";
            
            const safeIpKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            const performUpdate = () => {
                if (typeof firebase !== 'undefined' && firebase.database) {
                    const payload = {
                        ip: rawIp,
                        device_name: device,
                        location: location,
                        last_active: firebase.database.ServerValue.TIMESTAMP,
                        current_page: window.location.href,
                        game_data: JSON.parse(localGameData)
                    };

                    if (user) {
                        // 登入者存放在 users 節點
                        firebase.database().ref('users/' + safeIpKey).update({
                            ...payload,
                            uid: user.uid,
                            name: user.displayName,
                            email: user.email,
                            photo: user.photoURL
                        });
                    } else {
                        // 訪客存放在 guests 節點
                        firebase.database().ref('guests/' + safeIpKey).update(payload);
                    }
                    console.log("Data Synced Successfully.");
                } else {
                    setTimeout(performUpdate, 1000);
                }
            };
            performUpdate();
        } catch (err) {
            console.warn("Sync failed:", err);
        }
    }

    // --- 3. 登入邏輯與按鈕生成 ---
    function setupAuth() {
        const root = document.getElementById('user-auth-root');
        if (!root) return;

        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(user => {
                    if (user) {
                        // 已登入：顯示頭像
                        root.innerHTML = `<img src="${user.photoURL}" style="width:32px;height:32px;border-radius:50%;cursor:pointer;border:1px solid #888;" id="logout-trigger" title="登出 ${user.displayName}">`;
                        document.getElementById('logout-trigger').onclick = () => firebase.auth().signOut();
                        syncUserData(user);
                    } else {
                        // 未登入：顯示藍色登入鈕
                        root.innerHTML = `<button id="login-trigger" style="background:#4285F4;color:white;border:none;padding:7px 15px;border-radius:20px;cursor:pointer;font-size:13px;display:flex;align-items:center;gap:6px;"><i class="fa-brands fa-google"></i> Google 登入</button>`;
                        document.getElementById('login-trigger').onclick = () => {
                            const provider = new firebase.auth.GoogleAuthProvider();
                            firebase.auth().signInWithPopup(provider);
                        };
                        syncUserData(null);
                    }
                });
            } else {
                setTimeout(checkFirebase, 500);
            }
        };
        checkFirebase();
    }

    // --- 4. 注入 HTML 並處理自動黑白變色 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => {
                container.innerHTML = data;
                setupAuth(); // 注入 HTML 後啟動登入功能

                const nav = container.querySelector('.glass-nav');
                if (nav) {
                    // 移除毛玻璃，確保純色
                    nav.style.setProperty('backdrop-filter', 'none', 'important');
                    nav.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    // 偵測背景色決定黑/白方案
                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let isLight = false;
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLight = brightness > 128;
                    }

                    const themeBg = isLight ? '#ffffff' : '#000000';
                    const themeText = isLight ? '#000000' : '#ffffff';
                    const themeBorder = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)';

                    nav.style.setProperty('background', themeBg, 'important');
                    nav.style.setProperty('border-bottom', `1px solid ${themeBorder}`, 'important');

                    // 遞迴處理所有子元素的顏色
                    nav.querySelectorAll('*').forEach(el => {
                        const tag = el.tagName.toLowerCase();
                        if (['ul', 'li', 'div', 'span'].includes(tag)) {
                            el.style.setProperty('background', themeBg, 'important');
                        }
                        // 不要動到 Google 登入鈕的藍色背景
                        if (el.id !== 'login-trigger') {
                            el.style.setProperty('color', themeText, 'important');
                        }
                        if (el.classList.contains('dropdown-menu')) {
                            el.style.setProperty('border', `1px solid ${themeBorder}`, 'important');
                        }
                    });
                }
            });
    }
});
