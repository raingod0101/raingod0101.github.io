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

    // --- 3. 靜默追蹤與寫入 Firebase ---
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

    // --- 4. 注入選單 (深層強制黑背景、白文字) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                
                silentTracker();

                // 抓取整個 nav 以及裡面可能存在的所有列表與容器
                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    // 1. 移除所有毛玻璃效果
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    // 2. 遍歷 nav 內所有元素，強制背景黑、文字白
                    // 這包含子選單 <ul>, <li>, <a>, <div> 等等
                    const allElements = navElement.querySelectorAll('*');
                    
                    // 先處理 nav 本身
                    navElement.style.setProperty('background', '#000000', 'important');
                    navElement.style.setProperty('color', '#ffffff', 'important');

                    allElements.forEach(el => {
                        // 強制背景黑 (針對子選單容器)
                        // 我們只針對可能作為背景的容器 (如 UL, LI, DIV) 設定背景
                        const tagName = el.tagName.toLowerCase();
                        if (['ul', 'li', 'div', 'nav', 'span'].includes(tagName)) {
                            el.style.setProperty('background-color', '#000000', 'important');
                            el.style.setProperty('background', '#000000', 'important');
                        }
                        
                        // 強制文字白 (針對所有元素)
                        el.style.setProperty('color', '#ffffff', 'important');
                        
                        // 處理邊框 (避免出現灰色的線)
                        el.style.setProperty('border-color', '#333333', 'important');
                    });
                }
            });
    }
});
