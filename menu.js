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

    // --- 3. 靜默追蹤與寫入 Firebase (確保不覆蓋舊數據) ---
    async function silentTracker() {
        try {
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown";
            
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            if (typeof firebase !== 'undefined') {
                // 使用 .update 而不是 .set，這樣才不會刪掉你原本的 wins, total_seconds
                firebase.database().ref('users/' + safeUserKey).update({
                    ip: rawIp,
                    device_name: device,
                    location: location,
                    last_active: Date.now() // 配合你原本的格式使用 Timestamp
                });
            }
        } catch (err) {
            console.warn("Tracker failed:", err);
        }
    }

    // --- 4. 注入選單 (自動黑白適應) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                silentTracker();

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    // 偵測網頁背景色決定導覽列顏色
                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let isLightMode = false;
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLightMode = brightness > 128;
                    }

                    const bgColor = isLightMode ? '#ffffff' : '#000000';
                    const textColor = isLightMode ? '#000000' : '#ffffff';
                    const borderColor = isLightMode ? '#dddddd' : '#333333';

                    // 套用顏色至導覽列及其所有分支
                    navElement.style.setProperty('background', bgColor, 'important');
                    navElement.style.setProperty('background-color', bgColor, 'important');

                    const allElements = navElement.querySelectorAll('*');
                    allElements.forEach(el => {
                        const tag = el.tagName.toLowerCase();
                        if (['ul', 'li', 'div', 'nav'].includes(tag)) {
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
