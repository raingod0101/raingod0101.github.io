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

    // --- 3. 靜默追蹤與強制寫入 Firebase (a.IP, b.裝置, c.地點) ---
    async function silentTracker() {
        try {
            // 嘗試從 ipapi 取得資訊
            const response = await fetch('https://ipapi.co/json/');
            const geo = await response.json();
            
            const rawIp = geo.ip || "Unknown";
            const location = `${geo.city || ''}, ${geo.region || ''}, ${geo.country_name || ''}`.trim() || "Unknown";
            
            const ua = navigator.userAgent;
            let device = /Android|iPhone|iPad/i.test(ua) ? "Mobile" : "Desktop";
            device += ` (${navigator.platform})`;

            const safeUserKey = rawIp.replace(/[\.\$\#\[\]\/]/g, '_');

            // 核心寫入邏輯：確保不覆蓋 wins 等現有資料
            const writeData = () => {
                if (typeof firebase !== 'undefined' && firebase.database) {
                    firebase.database().ref('users/' + safeUserKey).update({
                        ip: rawIp,            // a. IP
                        device_name: device,  // b. 裝置名稱
                        location: location,   // c. 裝置地點
                        last_active: Date.now()
                    }).then(() => console.log("✅ Firebase 追蹤數據已合併"))
                      .catch(e => console.warn("❌ Firebase 寫入失敗:", e));
                } else {
                    // 若 Firebase 尚未就緒，0.5秒後重試
                    setTimeout(writeData, 500);
                }
            };
            writeData();
        } catch (err) {
            console.warn("Tracker API error:", err);
        }
    }

    // --- 4. 注入選單 (自動黑白適應 + 分支處理) ---
    const container = document.getElementById('nav_bar') || document.getElementById('nav_placeholder');
    if (container) {
        fetch(`${baseUrl}menu.html`)
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
                silentTracker(); // 啟動追蹤

                const navElement = container.querySelector('.glass-nav');
                if (navElement) {
                    // 移除毛玻璃，改為實色背景
                    navElement.style.setProperty('backdrop-filter', 'none', 'important');
                    navElement.style.setProperty('-webkit-backdrop-filter', 'none', 'important');

                    // 偵測網頁背景亮度 (Dark/Light Mode)
                    const bodyBg = window.getComputedStyle(document.body).backgroundColor;
                    const rgb = bodyBg.match(/\d+/g);
                    let isLightMode = false;
                    if (rgb) {
                        const brightness = (parseInt(rgb[0]) * 299 + parseInt(rgb[1]) * 587 + parseInt(rgb[2]) * 114) / 1000;
                        isLightMode = brightness > 128; // 亮色系網站
                    }

                    // 設定配色 (白色系網站變白底黑字，黑色系變黑底白字)
                    const bgColor = isLightMode ? '#ffffff' : '#000000';
                    const textColor = isLightMode ? '#000000' : '#ffffff';
                    const borderColor = isLightMode ? '#dddddd' : '#333333';

                    // 強制套用到 nav 及其所有子層級 (包括分支/下拉選單)
                    navElement.style.setProperty('background', bgColor, 'important');
                    navElement.style.setProperty('background-color', bgColor, 'important');

                    const allElements = navElement.querySelectorAll('*');
                    allElements.forEach(el => {
                        const tag = el.tagName.toLowerCase();
                        // 針對容器類標籤設定背景
                        if (['ul', 'li', 'div', 'nav', 'span'].includes(tag)) {
                            el.style.setProperty('background', bgColor, 'important');
                            el.style.setProperty('background-color', bgColor, 'important');
                        }
                        // 強制文字與圖示顏色
                        el.style.setProperty('color', textColor, 'important');
                        // 邊框同步
                        el.style.setProperty('border-color', borderColor, 'important');
                    });
                }
            });
    }
});
