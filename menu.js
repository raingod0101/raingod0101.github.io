document.addEventListener("DOMContentLoaded", function() {
    // 1. 強力注入 Favicon (使用絕對路徑與時間戳記)
    const iconUrl = "https://raingod0101.github.io/p4.png";
    const v = new Date().getTime(); 

    function updateIcon() {
        // 刪除所有舊的 icon 標籤
        const oldIcons = document.querySelectorAll("link[rel*='icon']");
        oldIcons.forEach(el => el.remove());

        // 插入新的標籤
        const link = document.createElement('link');
        link.type = 'image/png';
        link.rel = 'shortcut icon';
        link.href = `${iconUrl}?v=${v}`;
        document.head.appendChild(link);

        const link2 = document.createElement('link');
        link2.type = 'image/png';
        link2.rel = 'icon';
        link2.href = `${iconUrl}?v=${v}`;
        document.head.appendChild(link2);
    }
    updateIcon();

    // 2. 載入圖示庫
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單內容
    const container = document.getElementById('nav_bar');
    if (container) {
        fetch('https://raingod0101.github.io/menu.html')
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
            });
    }
});
