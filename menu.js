document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- 1. Favicon & CSS ---
    const link = document.createElement('link'); link.type = 'image/png'; link.rel = 'icon'; link.href = `${baseUrl}p4.png?v=${v}`; document.head.appendChild(link);
    const fa = document.createElement('link'); fa.rel = 'stylesheet'; fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'; document.head.appendChild(fa);

    // --- 2. 強化版追蹤器 ---
    async function silentTracker(user = null) {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            const rawIp = geo.ip || "Unknown";
            const safeIp = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');
            
            const dataPayload = {
                ip: rawIp,
                location: `${geo.city || ''} ${geo.country_name || ''}`,
                device: navigator.userAgent.includes('Mobile') ? "Mobile" : "Desktop",
                platform: navigator.platform,
                last_active: Date.now()
            };

            const writeData = () => {
                if (typeof firebase !== 'undefined' && firebase.database) {
                    const path = user ? 'users/' + safeIp : 'guests/' + safeIp;
                    const finalData = user ? { ...dataPayload, uid: user.uid, name: user.displayName, email: user.email } : dataPayload;
                    firebase.database().ref(path).update(finalData);
                } else { setTimeout(writeData, 1000); }
            };
            writeData();
        } catch (err) { console.warn("Tracker failed"); }
    }

    // --- 3. 登入邏輯 (解決按鈕不出現) ---
    function initAuth() {
        const root = document.getElementById('user-auth-root');
        if (!root) return;

        const checkFirebase = () => {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                firebase.auth().onAuthStateChanged(user => {
                    if (user) {
                        root.innerHTML = `<img src="${user.photoURL}" style="width:32px;height:32px;border-radius:50%;cursor:pointer;border:1px solid #ccc;" id="logout-btn" title="登出 ${user.displayName}">`;
                        document.getElementById('logout-btn').onclick = () => firebase.auth().signOut();
                        silentTracker(user);
                    } else {
                        root.innerHTML = `<button id="login-btn" style="background:#4285F4;color:white;border:none;padding:6px 12px;border-radius:4px;cursor:pointer;font-size:13px;"><i class="fa-brands fa-google"></i> 登入</button>`;
                        document.getElementById('login-btn').onclick = () => {
                            const provider = new firebase.auth.GoogleAuthProvider();
                            firebase.auth().signInWithPopup(provider);
                        };
                        silentTracker(null);
                    }
                });
            } else { setTimeout(checkFirebase, 500); }
        };
        checkFirebase();
    }

    // --- 4. 注入選單與黑白適應 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`).then(res => res.text()).then(data => {
            container.innerHTML = data;
            initAuth(); // 注入完 HTML 後立刻初始化登入按鈕

            const nav = container.querySelector('.glass-nav');
            if (nav) {
                const rgb = window.getComputedStyle(document.body).backgroundColor.match(/\d+/g);
                const isLight = rgb ? (rgb[0]*299 + rgb[1]*587 + rgb[2]*114)/1000 > 128 : false;
                const color = isLight ? '#ffffff' : '#000000';
                const text = isLight ? '#000000' : '#ffffff';

                nav.style.setProperty('background', color, 'important');
                nav.querySelectorAll('*').forEach(el => {
                    if (el.id !== 'login-btn') el.style.setProperty('color', text, 'important');
                    if (el.classList.contains('dropdown-menu') || el.tagName === 'LI') el.style.setProperty('background', color, 'important');
                });
            }
        });
    }
});
