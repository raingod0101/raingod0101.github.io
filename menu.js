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

    // --- 2. 載入圖示庫 (FontAwesome) ---
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // --- 3. 核心追蹤邏輯 (a.IP / b.裝置 / c.地點) ---
    async function silentTracker() {
        try {
            // A & C: 透過 API 取得 IP 與 地點 (台北市, 新店區...)
            // 使用 ipapi.co (免費額度足夠一般測試)
            const geoRes = await fetch('https://ipapi.co/json/');
            const geo = await geoRes.json();
            
            const rawIp = geo.ip || "Unknown_IP";
            const location = `${geo.city || ''} ${geo.region || ''}`.trim() || "Unknown Location";

            // B: 判定裝置名稱
            const ua = navigator.userAgent;
            let deviceType = "PC";
            if (/Android|iPhone|iPad/i.test(ua)) deviceType = "Mobile/Tablet";
            const deviceName = `${deviceType} (${navigator.platform})`;

            // 處理 Firebase 無效鍵 (將 . $ # [ ] / 替換為 _)
            const safeKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // 寫入 Firebase
            if (typeof firebase !== 'undefined') {
                const userRef = firebase.database().ref('users/' + safeKey);
                
                // 使用 update 確保不覆蓋原本的 total_seconds 或 wins
                userRef.update({
                    ip: rawIp,            // a. IP
                    device: deviceName,   // b. 裝置名稱
                    location: location,   // c. 裝置地點
                    last_active: new Date().toISOString()
                });
            }
        } catch (err) {
            console.warn("Silent Tracker failed:", err);
        }
    }

    // --- 4. 注入選單 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                
                // 僅執行追蹤，不再干涉 CSS 顏色
                silentTracker();
            });
    }
});
