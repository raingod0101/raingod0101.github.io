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

    // --- 3. 靜默追蹤函式 (a.IP, b.裝置, c.地點) ---
    async function silentTracker() {
        try {
            // A. 取得 IP 與 地點 (c. 地點包含 城市/地區/國家)
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown Location";
            
            // B. 取得 裝置名稱
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            // C. 消毒 Firebase Key (禁止 . $ # [ ] /)
            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // D. 寫入 Firebase
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('users/' + safeUserKey).update({
                    ip: rawIp,            // a. 存入原始 IP
                    device_name: device,  // b. 存入裝置名稱
                    location: location,   // c. 存入詳細地點
                    last_active: new Date().toISOString()
                });
            }
        } catch (err) {
            console.warn("Tracker status: Blocked or Network Error", err);
        }
    }

    // --- 4. 注入選單並強制「純黑」樣式 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                
                // 執行追蹤
                silentTracker();

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    // 徹底移除毛玻璃與透明度
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
                    
                    // 強制純黑背景 (#000000)
                    navElement.style.setProperty('background', '#000000', 'important');
                    navElement.style.setProperty('border-bottom', '1px solid #222', 'important');

                    // 強制所有導覽文字與圖示為純白，避免變灰
                    container.querySelectorAll('.nav-item, .brand, .brand span, i').forEach(el => {
                        el.style.setProperty('color', '#ffffff', 'important');
                        el.style.setProperty('opacity', '1', 'important');
                    });
                }
            });
    }
});
