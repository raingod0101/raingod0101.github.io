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
            // 取得 a.IP 與 c.地點
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown";
            
            // 取得 b.裝置名稱
            const ua = navigator.userAgent;
            let device = "Desktop";
            if (/Android|iPhone|iPad/i.test(ua)) device = "Mobile";
            device += ` (${navigator.platform})`;

            // 處理非法 Key (將 . $ # [ ] / 換成 _)
            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // 執行寫入
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('users/' + safeUserKey).update({
                    ip: rawIp,            // a. IP
                    device_name: device,  // b. 裝置名稱
                    location: location,   // c. 裝置地點
                    last_active: new Date().toISOString()
                });
            }
        } catch (err) {
            console.warn("Tracker failed:", err);
        }
    }

    // --- 4. 注入選單 (修正為純黑色背景) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                
                // 啟動追蹤
                silentTracker();

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    // 1. 移除毛玻璃效果
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
                    
                    // 2. 將背景從灰/透明強制改為純黑色
                    navElement.style.setProperty('background', '#000000', 'important');
                    navElement.style.setProperty('background-color', '#000000', 'important');
                }
            });
    }
});
