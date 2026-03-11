document.addEventListener("DOMContentLoaded", function() {
    // 1. 自動設定網頁分頁欄圖示 (Favicon)
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    link.href = '/p4.png'; // 這裡設定你的 icon 路徑

    // 2. 載入 FontAwesome 圖示庫
    const fa = document.createElement('link');
    fa.rel = 'stylesheet';
    fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
    document.head.appendChild(fa);

    // 3. 抓取並注入 menu.html
    const container = document.getElementById('nav_bar');
    if (container) {
        fetch('menu.html')
            .then(res => res.text())
            .then(data => { 
                container.innerHTML = data; 
            });
    }
});
