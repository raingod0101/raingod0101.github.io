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

    // --- 3. 靜默追蹤與寫入 Firebase (a, b, c) ---
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
                    ip: rawIp,
                    device_name: device,
                    location: location,
                    last_active: new Date().toISOString()
                });
            }
        } catch (err) {
            console.warn("Tracker failed:", err);
        }
    }

    // --- 4. 注入選單 (黑背景 + 白文字) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                
                silentTracker();

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    // 1. 移除毛玻璃效果
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
                    
                    // 2. 背景強制純黑 (#000)
                    navElement.style.setProperty('background', '#000000', 'important');
                    navElement.style.setProperty('background-color', '#000000', 'important');

                    // 3. 強制所有子文字與圖示為純白 (#FFF)
                    const allTexts = navElement.querySelectorAll('*');
                    allTexts.forEach(el => {
                        el.style.setProperty('color', '#ffffff', 'important');
                    });
                }
            });
    }
});
