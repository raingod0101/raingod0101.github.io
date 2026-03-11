document.addEventListener("DOMContentLoaded", function() {
    // 1. 自動設定網頁分頁欄圖示 (Favicon) - 加上版本號避免快取
    const iconPath = "p4.png"; // 如果你的 p4.png 跟 html 在同一個資料夾，把前面的 / 去掉
    const version = new Date().getTime(); // 產生一組隨機數字
    
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
    }
    // 強制在網址後面加上 ?v=123456789，瀏覽器就會以為是新檔案而重新下載
    link.href = `${iconPath}?v=${version}`;

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
