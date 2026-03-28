document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- 1. 強力 Favicon 注入 ---
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

    // --- 2. 載入圖示庫 (FontAwesome) ---
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // --- 3. 裝置資訊取得函式 ---
    function getDeviceName() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
        if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) return "Mobile";
        return `Desktop (${navigator.platform})`;
    }

    // --- 4. 追蹤並寫入 Firebase ---
    async function silentTracker() {
        try {
            // 取得地理位置與 IP
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const ip = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''}`.trim() || "Unknown";
            const device = getDeviceName();
            
            // Firebase Key 處理 (將 IP 的 . 換成 _ )
            const userKey = ip.replace(/\./g, '_');

            // 寫入資料 (使用 update 確保不覆蓋掉原本的 wins 或 total_seconds)
            // 這裡假設 firebase 已經在全域初始化
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('users/' + userKey).update({
                    ip: ip,
                    device_name: device,
                    location: location,
                    last_active: new Date().toISOString()
                });
            }
        } catch (err) {
            console.warn("Tracker blocked or failed:", err);
        }
    }

    // --- 5. 注入選單並執行顏色判定 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 

                // 執行追蹤 (在選單載入時順便觸發)
                silentTracker();

                // 偵測目前網頁的背景顏色
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                
                if (rgb) {
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const navElement = container.querySelector('.glass-nav');
                    
                    if (navElement) {
                        navElement.style.setProperty('backdrop-filter', 'none', 'important');
                        navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                        if (brightness < 190) { 
                            // 深色背景：變純深黑
                            navElement.style.setProperty('background', 'rgba(15, 15, 15, 0.95)', 'important');
                            navElement.style.setProperty('border-bottom', '1px solid rgba(255, 255, 255, 0.15)', 'important');
                            
                            container.querySelectorAll('.nav-item, .brand, .brand span').forEach(el => {
                                el.style.setProperty('color', '#ffffff', 'important');
                            });
                        } else {
                            // 純白背景：變純潔白
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
