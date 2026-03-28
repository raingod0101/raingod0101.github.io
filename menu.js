document.addEventListener("DOMContentLoaded", function() {
    const baseUrl = "https://raingod0101.github.io/";
    const v = new Date().getTime(); 

    // --- 1. Favicon & FontAwesome ---
    const link = document.createElement('link');
    link.rel = 'icon'; link.href = `${baseUrl}p4.png?v=${v}`;
    document.head.appendChild(link);

    const fa = document.createElement('link');
    fa.rel = 'stylesheet'; fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // --- 2. 靜默追蹤函式 (a.IP, b.裝置, c.地點) ---
    async function silentTracker() {
        try {
            // A. 取得 a.IP 與 c.地點
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''} ${geo.region || ''} ${geo.country_name || ''}`.trim();
            
            // B. 取得 b.裝置名稱
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            // C. 消毒 Firebase Key (解決 JSON 無效鍵問題)
            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // D. 寫入 Firebase
            if (typeof firebase !== 'undefined') {
                firebase.database().ref('users/' + safeUserKey).update({
                    ip: rawIp,            
                    device_name: device,  
                    location: location,   
                    last_active: new Date().toISOString()
                });
            }
        } catch (err) {
            console.warn("Tracker status: Blocked");
        }
    }

    // --- 3. 注入選單並強制「純黑」 ---
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
                    // 1. 移除所有透明度與模糊
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');
                    
                    // 2. 強制純黑背景 (#000000)
                    navElement.style.setProperty('background', '#000000', 'important');
                    navElement.style.setProperty('border-bottom', '1px solid #222', 'important');

                    // 3. 強制文字純白
                    container.querySelectorAll('.nav-item, .brand, .brand span, i').forEach(el => {
                        el.style.setProperty('color', '#ffffff', 'important');
                        el.style.setProperty('opacity', '1', 'important');
                    });
                }
            });
    }
});
