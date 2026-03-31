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

    // --- 3. 強化版追蹤器 (確保寫入 IP, Device, Location) ---
    async function silentTracker() {
        try {
            // 獲取 a.IP 與 c.地點
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown";
            
            // 獲取 b.裝置名稱
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // 檢查 Firebase 是否準備好，若還沒好則等 1 秒再試一次
            function writeToFirebase() {
                if (typeof firebase !== 'undefined' && firebase.database) {
                    firebase.database().ref('users/' + safeUserKey).update({
                        ip: rawIp,            // a. 存入 IP
                        device_name: device,  // b. 存入 裝置名稱
                        location: location,   // c. 存入 地點
                        last_active: Date.now() 
                    }).then(() => {
                        console.log("Tracker Success: Data merged.");
                    });
                } else {
                    setTimeout(writeToFirebase, 1000); // 重試
                }
            }
            writeToFirebase();

        } catch (err) {
            console.warn("Tracker API failed:", err);
        }
    }

    // --- 4. 注入選單 (自動黑白適應 & 分支同步) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                silentTracker(); // 啟動追蹤

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    // 偵測背景亮度
                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let isLightMode = false;
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLightMode = brightness > 128;
                    }

                    // 設定黑白方案
                    const bgColor = isLightMode ? '#ffffff' : '#000000';
                    const textColor = isLightMode ? '#000000' : '#ffffff';
                    const borderColor = isLightMode ? '#eeeeee' : '#333333';

                    // 強制套用到所有層級
                    navElement.style.setProperty('background', bgColor, 'important');
                    navElement.style.setProperty('background-color', bgColor, 'important');

                    const allSub = navElement.querySelectorAll('*');
                    allSub.forEach(el => {
                        const tag = el.tagName.toLowerCase();
                        if (['ul', 'li', 'div', 'nav', 'span'].includes(tag)) {
                            el.style.setProperty('background', bgColor, 'important');
                            el.style.setProperty('background-color', bgColor, 'important');
                        }
                        el.style.setProperty('color', textColor, 'important');
                        el.style.setProperty('border-color', borderColor, 'important');
                    });
                }
            });
    }
});
