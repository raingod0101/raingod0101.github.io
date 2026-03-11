document.addEventListener("DOMContentLoaded", function() {
    // 1. 強力注入 Favicon
    const iconPath = "p4.png";
    const v = new Date().getTime(); // 每次刷新都產生新版本號
    
    // 移除舊的 icon 標籤
    const oldIcons = document.querySelectorAll("link[rel*='icon']");
    oldIcons.forEach(el => el.remove());

    // 建立新的 icon 標籤
    const link = document.createElement('link');
    link.type = 'image/png';
    link.rel = 'shortcut icon'; // 為了相容舊版瀏覽器
    link.href = `${iconPath}?v=${v}`;
    document.getElementsByTagName('head')[0].appendChild(link);

    // 額外增加一個標準 rel="icon"
    const link2 = document.createElement('link');
    link2.type = 'image/png';
    link2.rel = 'icon';
    link2.href = `${iconPath}?v=${v}`;
    document.getElementsByTagName('head')[0].appendChild(link2);

    // 2. 載入 FontAwesome
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 注入選單
    const container = document.getElementById('nav_bar');
    if (container) {
        fetch('menu.html')
            .then(res => res.text())
            .then(data => { container.innerHTML = data; });
    }
});
