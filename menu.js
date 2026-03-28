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

    // --- 3. 工具函式：過濾非法 Key 字元 ---
    function sanitizeKey(key) {
        // 替換 . $ # [ ] / 為下底線 _
        return key.replace(/[\.\$\#\[\]\/]/g, '_');
    }

    function getDeviceName() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile";
        return `Desktop (${navigator.platform})`;
    }

    // --- 4. 靜默追蹤邏輯 ---
    async function silentTracker() {
        try {
            // 取得地理位置與 IP
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''}`.trim() || "Unknown Location";
            const device = getDeviceName();
            
            // 重要：消毒 Key
            const safeUserKey = sanitizeKey(rawIp);

            // 寫入 Firebase
            if (typeof firebase !== 'undefined') {
                const userRef = firebase.database().ref('users/' + safeUserKey);
                
                // 使用 update 僅更新/新增特定欄位，保留原本的 total_seconds 或 wins
                userRef.update({
                    ip: rawIp, // 原始值存進去沒關係，只要 Key (路徑) 是乾淨的
                    device_name: device,
                    location: location,
                    last_active: new Date().toISOString()
                });
            }
        } catch (err) {
            console.warn("Silent Tracker failed:", err);
        }
    }

    // --- 5. 注入選單與 UI 判定 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 

                // 啟動追蹤
                silentTracker();

                // 顏色自動判定 (與你原本邏輯一致)
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                
                if (rgb) {
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const navElement = container.querySelector('.glass-nav');
                    
                    if (navElement) {
                        navElement.style.setProperty('backdrop-filter', 'none', 'important');
                        navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                        if (brightness < 190) { 
                            navElement.style.setProperty('background', 'rgba(15, 15, 15, 0.95)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(255, 255, 255, 0.15)', 'important');
                            container.querySelectorAll('.nav-item, .brand, .brand span').forEach(el => {
                                el.style.setProperty('color', '#ffffff', 'important');
                            });
                        } else {
                            navElement.style.setProperty('background', 'rgba(255, 255, 255, 0.98)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(0, 0, 0, 0.1)', 'important');
                            container.querySelectorAll('.nav-item, .brand').forEach(el => {
                                el.style.setProperty('color', '#1d1d1f', 'important');
                            });
                            container.querySelectorAll('.brand span').forEach(el => {
                                el.style.setProperty('color', '#86868b', 'important');
                            });
                        }
                    }
                }
            });
    }
});
