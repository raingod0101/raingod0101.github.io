document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- A. 基礎設置 (Favicon & FontAwesome) ---
    const link = document.createElement('link');
    link.rel = 'icon'; link.href = `${baseUrl}p4.png?v=${v}`;
    document.head.appendChild(link);

    const fa = document.createElement('link');
    fa.rel = 'stylesheet'; fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // --- B. 核心追蹤邏輯 ---
    async function updateUserData() {
        try {
            // 1. 取得 a.IP 與 c.地點 (使用 ipapi 免費接口)
            const geoRes = await fetch('https://ipapi.co/json/');
            const geo = await geoRes.json();
            
            const userIp = geo.ip || "Unknown_IP";
            const userLoc = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim();

            // 2. 取得 b.裝置名稱
            const userAgent = navigator.userAgent;
            let deviceName = "PC / Desktop";
            if (/Android|iPhone|iPad/i.test(userAgent)) deviceName = "Mobile / Tablet";
            if (navigator.platform) deviceName += ` (${navigator.platform})`;

            // 3. 處理 Firebase Key (不能有 . # $ [ ] /)
            const safeKey = userIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // 4. 執行寫入 (假設 firebase 已經初始化)
            if (typeof firebase !== 'undefined') {
                const dbRef = firebase.database().ref('users/' + safeKey);
                
                // 這裡會把 a, b, c 連同你原本要求的資料一起存進去
                dbRef.update({
                    ip: userIp,             // a. IP
                    device: deviceName,     // b. 裝置名稱
                    location: userLoc,      // c. 裝置地點
                    last_active: new Date().toISOString(),
                    // 如果是第一次建立，預設給 0，如果是更新則不會覆蓋原本的數值
                    total_seconds: firebase.database.ServerValue.increment(0) 
                });
            }
        } catch (e) { console.error("Tracking Error:", e); }
    }

    // --- C. 選單注入與 UI 判定 ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                
                // 執行背景追蹤
                updateUserData();

                // 顏色判定邏輯... (保留你原本的 window.getComputedStyle 部分)
                const bgColor = window.getComputedStyle(document.body).backgroundColor;
                const rgb = bgColor.match(/\d+/g);
                if (rgb) {
                    const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
                    const nav = container.querySelector('.glass-nav');
                    if (nav) {
                        nav.style.setProperty('backdrop-filter', 'none', 'important');
                        if (brightness < 190) {
                            nav.style.setProperty('background', 'rgba(15, 15, 15, 0.95)', 'important');
                            container.querySelectorAll('.nav-item, .brand').forEach(el => el.style.color = '#fff');
                        } else {
                            nav.style.setProperty('background', 'rgba(255, 255, 255, 0.98)', 'important');
                            container.querySelectorAll('.nav-item, .brand').forEach(el => el.style.color = '#1d1d1f');
                        }
                    }
                }
            });
    }
});
