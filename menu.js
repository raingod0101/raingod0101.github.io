document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- 1. Favicon 注入 ---
    function updateIcon() {
        const oldIcons = document.querySelectorAll("link[rel*='icon']");
        oldIcons.forEach(el => el.remove());
        const link = document.createElement('link');
        link.type = 'image/png';
        link.rel = 'icon';
        link.href = `${baseUrl}p4.png?v=${v}`;
        document.head.appendChild(link);
    }
    updateIcon();

    // --- 2. 載入 FontAwesome ---
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // --- 3. 靜默追蹤與寫入 Firebase ---
    async function silentTracker() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown";
            const ua = navigator.userAgent;
            let device = "Desktop";
            if (/Android|iPhone|iPad/i.test(ua)) device = "Mobile";
            device += ` (${navigator.platform})`;
            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('users/' + safeUserKey).update({
                    ip: rawIp, device_name: device, location: location, last_active: new Date().toISOString()
                });
            }
        } catch (err) { console.warn("Tracker failed:", err); }
    }

    // --- 4. 注入選單 (自動適應背景顏色) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                silentTracker();

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    // 移除毛玻璃
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    // 偵測網頁 Body 的背景顏色
                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    
                    // 計算亮度 (使用 RGB 權重公式)
                    const rgb = bodyBg.match(/\d+/g);
                    let isLightMode = false;
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLightMode = brightness > 128; // 亮度大於 128 視為淺色網站
                    }

                    // 根據網頁色系決定導覽列配色
                    const bgColor = isLightMode ? '#ffffff' : '#000000';
                    const textColor = isLightMode ? '#000000' : '#ffffff';
                    const borderColor = isLightMode ? '#eeeeee' : '#333333';

                    // 強制套用到 nav 及其所有子分支
                    navElement.style.setProperty('background', bgColor, 'important');
                    navElement.style.setProperty('background-color', bgColor, 'important');
                    navElement.style.setProperty('border-bottom', `1px solid ${borderColor}`, 'important');

                    const allElements = navElement.querySelectorAll('*');
                    allElements.forEach(el => {
                        const tagName = el.tagName.toLowerCase();
                        // 針對容器的分支設定背景
                        if (['ul', 'li', 'div', 'nav'].includes(tagName)) {
                            el.style.setProperty('background', bgColor, 'important');
                            el.style.setProperty('background-color', bgColor, 'important');
                        }
                        // 強制文字顏色
                        el.style.setProperty('color', textColor, 'important');
                        // 分支的邊框同步
                        el.style.setProperty('border-color', borderColor, 'important');
                    });
                }
            });
    }
});
