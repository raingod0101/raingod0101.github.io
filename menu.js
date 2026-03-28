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

    // --- 3. 靜默追蹤並寫入 Firebase ---
    async function silentTracker() {
        try {
            // 使用 ipapi.co 獲取 a.IP 與 c.地點
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim() || "Unknown";
            
            // 取得 b.裝置名稱
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            // 將 IP 轉為 Firebase 安全 Key (如 61_223_220_18)
            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // 檢查 Firebase 是否已載入並寫入新欄位
            if (typeof firebase !== 'undefined' && firebase.database) {
                firebase.database().ref('users/' + safeUserKey).update({
                    ip: rawIp,            // a. IP
                    device_name: device,  // b. 裝置名稱
                    location: location,   // c. 裝置地點
                    last_active: Date.now() // 更新活躍時間戳
                });
            }
        } catch (err) {
            console.warn("Tracker failed:", err);
        }
    }

    // --- 4. 注入選單 (自動黑白適應 + 分支處理) ---
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
                    // 移除毛玻璃 (避免在白底下看起來髒髒的)
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    // 1. 偵測網頁背景色 (決定是 Light 還是 Dark Mode)
                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let isLightMode = false;
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLightMode = brightness > 128; // 亮度 > 128 視為淺色背景
                    }

                    // 2. 設定配色方案
                    const bgColor = isLightMode ? '#ffffff' : '#000000';
                    const textColor = isLightMode ? '#000000' : '#ffffff';
                    const borderColor = isLightMode ? '#e0e0e0' : '#333333';

                    // 3. 套用到主導覽列及其所有分支 (子選單)
                    navElement.style.setProperty('background', bgColor, 'important');
                    navElement.style.setProperty('background-color', bgColor, 'important');
                    navElement.style.setProperty('border-bottom', `1px solid ${borderColor}`, 'important');

                    const allSubElements = navElement.querySelectorAll('*');
                    allSubElements.forEach(el => {
                        const tag = el.tagName.toLowerCase();
                        // 確保容器分支也是對應的背景色
                        if (['ul', 'li', 'div', 'nav', 'span'].includes(tag)) {
                            el.style.setProperty('background', bgColor, 'important');
                            el.style.setProperty('background-color', bgColor, 'important');
                        }
                        // 強制文字與圖示顏色
                        el.style.setProperty('color', textColor, 'important');
                        // 統一邊框顏色
                        el.style.setProperty('border-color', borderColor, 'important');
                    });
                }
            });
    }
});
