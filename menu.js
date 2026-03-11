document.addEventListener("DOMContentLoaded", function() {
    // --- 1. 自動路徑與 Icon 處理 ---
    const iconName = "p4.png";
    // 取得當前網址路徑層級，確保在子資料夾也能找到根目錄的圖片
    const isLocal = window.location.protocol === 'file:';
    const rootPath = isLocal ? "" : "/"; 
    const fullIconPath = rootPath + iconName + "?v=" + new Date().getTime();

    // 建立 Favicon 連結
    function setFavicon(url) {
        let link = document.querySelector("link[rel*='icon']");
        if (!link) {
            link = document.createElement('link');
            document.head.appendChild(link);
        }
        link.type = 'image/png';
        link.rel = 'shortcut icon';
        link.href = url;
        
        // 為了某些瀏覽器，再補一個標準版
        let link2 = document.querySelector("link[rel='icon']");
        if (!link2) {
            link2 = document.createElement('link');
            document.head.appendChild(link2);
        }
        link2.type = 'image/png';
        link2.rel = 'icon';
        link2.href = url;
    }

    setFavicon(fullIconPath);

    // --- 2. 自動載入 FontAwesome ---
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }

    // --- 3. 注入選單 ---
    const container = document.getElementById('nav_bar');
    if (container) {
        fetch(rootPath + 'menu.html')
            .then(res => {
                if (!res.ok) throw new Error();
                return res.text();
            })
            .then(data => { 
                container.innerHTML = data; 
            })
            .catch(() => {
                console.warn("無法取得 menu.html，請檢查路徑或伺服器環境。");
            });
    }
});
