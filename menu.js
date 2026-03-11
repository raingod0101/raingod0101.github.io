document.addEventListener("DOMContentLoaded", function() {
    // 1. 強制設定 Favicon，使用絕對路徑指向你的 GitHub 網域
    const iconUrl = "https://raingod0101.github.io/p4.png";
    const version = new Date().getTime();
    
    // 移除現有的所有 icon 標籤
    const existingIcons = document.querySelectorAll("link[rel*='icon']");
    existingIcons.forEach(el => el.remove());

    // 建立新的 icon 連結
    const link = document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = `${iconUrl}?v=${version}`;
    document.head.appendChild(link);

    // 2. 載入 FontAwesome
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fa = document.createElement('link');
        fa.rel = 'stylesheet';
        fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
        document.head.appendChild(fa);
    }

    // 3. 注入選單 (menu.html 同樣建議放在根目錄)
    const container = document.getElementById('nav_bar');
    if (container) {
        fetch('https://raingod0101.github.io/menu.html')
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
            })
            .catch(err => console.error("選單載入失敗:", err));
    }
});
